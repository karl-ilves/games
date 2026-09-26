import * as THREE from 'three';
import { BuildingObject } from './world';

export interface CollapseDustParticle {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    scaleSpeed: number;
    opacity: number;
    maxLife: number;
    age: number;
}

export interface FallingSlab {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    rotVelocity: THREE.Vector3;
    restingY: number;
    isResting: boolean;
}

export interface CollapsedBuilding {
    building: BuildingObject;
    originalPos: THREE.Vector3;
    originalBox: THREE.Box3;
    progress: number;
    stage: 'shudder' | 'falling' | 'collapsed';
    timeInStage: number;
    tiltAxis: THREE.Vector3;
    tiltAngle: number;
    ruinGroup?: THREE.Group;
    smokeTimer: number;
}

export class BuildingCollapseSystem {
    private scene: THREE.Scene;
    private buildings: BuildingObject[];
    private collapsedBuildings: Map<BuildingObject, CollapsedBuilding> = new Map();
    private dustParticles: CollapseDustParticle[] = [];
    private fallingSlabs: FallingSlab[] = [];

    // Shared reusable materials
    private dustMat = new THREE.MeshBasicMaterial({
        color: 0x95a5a6,
        transparent: true,
        opacity: 0.65,
        depthWrite: false
    });

    private concreteSlabMat = new THREE.MeshStandardMaterial({
        color: 0x485460,
        roughness: 0.9,
        metalness: 0.15
    });

    private brickRubbleMat = new THREE.MeshStandardMaterial({
        color: 0x8a3324,
        roughness: 0.85,
        metalness: 0.1
    });

    private rebarMat = new THREE.MeshStandardMaterial({
        color: 0x1e272e,
        roughness: 0.4,
        metalness: 0.85
    });

    private steelBeamMat = new THREE.MeshStandardMaterial({
        color: 0x2f3640,
        roughness: 0.35,
        metalness: 0.8
    });

    private emberMat = new THREE.MeshBasicMaterial({
        color: 0xff6b35
    });

    constructor(scene: THREE.Scene, buildings: BuildingObject[]) {
        this.scene = scene;
        this.buildings = buildings;
    }

    public setBuildings(buildings: BuildingObject[]): void {
        this.buildings = buildings;
    }

    /**
     * Trigger building collapse when rammed into at high speed or jumped into mid-air.
     */
    public collapseBuilding(building: BuildingObject, carYaw = 0): void {
        if (!building || this.collapsedBuildings.has(building)) return;

        // Calculate tilt axis perpendicular to impact direction
        // carYaw: 0 = +Z forward, PI/2 = +X
        const impactDir = new THREE.Vector3(Math.sin(carYaw), 0, Math.cos(carYaw)).normalize();
        const tiltAxis = new THREE.Vector3(-impactDir.z, 0, impactDir.x).normalize();

        const originalPos = building.position.clone();
        const originalBox = building.box.clone();

        building.isCollapsing = true;
        building.isCollapsed = false;
        building.originalBox = originalBox;

        const record: CollapsedBuilding = {
            building,
            originalPos,
            originalBox,
            progress: 0,
            stage: 'shudder',
            timeInStage: 0,
            tiltAxis,
            tiltAngle: (0.05 + Math.random() * 0.05),
            smokeTimer: 0
        };

        this.collapsedBuildings.set(building, record);

        // Spawn initial fracture dust puffs and falling slabs from the impact zone
        this.spawnInitialCollapseDebris(building, impactDir);
    }

    private spawnInitialCollapseDebris(building: BuildingObject, impactDir: THREE.Vector3): void {
        const count = 12;
        const boxGeo = new THREE.BoxGeometry(0.8, 0.4, 0.6);
        const slabGeo = new THREE.BoxGeometry(1.6, 0.25, 1.2);

        for (let i = 0; i < count; i++) {
            const isSlab = i % 2 === 0;
            const geo = isSlab ? slabGeo : boxGeo;
            const mat = i % 3 === 0 ? this.brickRubbleMat : this.concreteSlabMat;
            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = true;

            const rx = building.position.x + (Math.random() - 0.5) * (building.width * 0.85);
            const rz = building.position.z + (Math.random() - 0.5) * (building.depth * 0.85);
            const ry = 4.0 + Math.random() * (building.height * 0.4);

            mesh.position.set(rx, ry, rz);
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            this.scene.add(mesh);

            this.fallingSlabs.push({
                mesh,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 6 + impactDir.x * 3,
                    2.0 + Math.random() * 4,
                    (Math.random() - 0.5) * 6 + impactDir.z * 3
                ),
                rotVelocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 4,
                    (Math.random() - 0.5) * 4,
                    (Math.random() - 0.5) * 4
                ),
                restingY: 0.15 + Math.random() * 0.4,
                isResting: false
            });
        }

        // Billowing dust bursts at base
        this.spawnDustRing(building.position, building.width, building.depth, 16);
    }

    private spawnDustRing(pos: THREE.Vector3, w: number, d: number, count: number): void {
        const dustGeo = new THREE.DodecahedronGeometry(1.2, 1);
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const dist = 0.5 + Math.random() * 0.5;
            const px = pos.x + Math.cos(angle) * (w * 0.5 * dist);
            const pz = pos.z + Math.sin(angle) * (d * 0.5 * dist);
            const py = 0.4 + Math.random() * 1.5;

            const mesh = new THREE.Mesh(dustGeo, this.dustMat.clone());
            mesh.position.set(px, py, pz);
            const s = 1.0 + Math.random() * 1.5;
            mesh.scale.set(s, s, s);
            this.scene.add(mesh);

            const speed = 2.5 + Math.random() * 4;
            this.dustParticles.push({
                mesh,
                velocity: new THREE.Vector3(
                    Math.cos(angle) * speed + (Math.random() - 0.5),
                    1.2 + Math.random() * 2.0,
                    Math.sin(angle) * speed + (Math.random() - 0.5)
                ),
                scaleSpeed: 2.2 + Math.random() * 2.0,
                opacity: 0.65,
                maxLife: 2.5 + Math.random() * 1.2,
                age: 0
            });
        }
    }

    public update(delta: number): void {
        const dt = Math.min(delta, 0.1);

        // 1. Update collapsing buildings
        this.collapsedBuildings.forEach((record, building) => {
            if (record.stage === 'shudder') {
                record.timeInStage += dt;
                // Violently shudder / oscillate position
                const shudderMag = 0.25;
                const ox = Math.sin(record.timeInStage * 60) * shudderMag;
                const oz = Math.cos(record.timeInStage * 55) * shudderMag;
                building.group.position.set(record.originalPos.x + ox, 0, record.originalPos.z + oz);

                if (record.timeInStage >= 0.25) {
                    record.stage = 'falling';
                    record.timeInStage = 0;
                    // Spawn another burst of dust as structural failure takes hold
                    this.spawnDustRing(building.position, building.width, building.depth, 20);
                }
            } else if (record.stage === 'falling') {
                record.timeInStage += dt;
                record.smokeTimer += dt;

                // Duration of collapse ~ 1.8 seconds
                const collapseDuration = 1.8;
                record.progress = Math.min(record.timeInStage / collapseDuration, 1.0);

                // Sinking & compression
                // Scale Y compresses from 1.0 down to ~0.08
                // Position Y sinks down into rubble mound level
                const sinkAmount = record.progress * (building.height * 0.88);
                const scaleY = Math.max(0.08, 1.0 - record.progress * 0.92);

                building.group.position.set(
                    record.originalPos.x + (Math.random() - 0.5) * 0.08,
                    -sinkAmount,
                    record.originalPos.z + (Math.random() - 0.5) * 0.08
                );
                building.group.scale.y = scaleY;

                // Subtle structural tilt
                const currentTilt = record.progress * record.tiltAngle;
                building.group.setRotationFromAxisAngle(record.tiltAxis, currentTilt);

                // Periodic dust eruption while sinking
                if (record.smokeTimer >= 0.22) {
                    record.smokeTimer = 0;
                    this.spawnDustRing(building.position, building.width * 1.1, building.depth * 1.1, 8);
                }

                // If collapse progress finished: form permanent 3D Ruin Mound
                if (record.progress >= 1.0) {
                    record.stage = 'collapsed';
                    building.isCollapsing = false;
                    building.isCollapsed = true;
                    building.group.visible = false;

                    // Create permanent 3D Ruin Mound
                    this.createRuinMound(record);

                    // Final massive impact dust shockwave
                    this.spawnDustRing(building.position, building.width * 1.35, building.depth * 1.35, 28);
                }
            } else if (record.stage === 'collapsed') {
                // Gentle smoldering smoke puff occasionally
                record.smokeTimer += dt;
                if (record.smokeTimer >= 1.8 && this.dustParticles.length < 40) {
                    record.smokeTimer = 0;
                    this.spawnDustRing(building.position, building.width * 0.4, building.depth * 0.4, 3);
                }
            }
        });

        // 2. Update falling slabs and concrete rubble
        for (let i = this.fallingSlabs.length - 1; i >= 0; i--) {
            const slab = this.fallingSlabs[i];
            if (slab.isResting) continue;

            slab.velocity.y -= 18.0 * dt; // gravity
            slab.mesh.position.addScaledVector(slab.velocity, dt);

            slab.mesh.rotation.x += slab.rotVelocity.x * dt;
            slab.mesh.rotation.y += slab.rotVelocity.y * dt;
            slab.mesh.rotation.z += slab.rotVelocity.z * dt;

            // Ground impact bounce
            if (slab.mesh.position.y <= slab.restingY) {
                slab.mesh.position.y = slab.restingY;
                if (Math.abs(slab.velocity.y) > 2.0) {
                    slab.velocity.y = -slab.velocity.y * 0.25;
                    slab.velocity.x *= 0.6;
                    slab.velocity.z *= 0.6;
                } else {
                    slab.velocity.set(0, 0, 0);
                    slab.rotVelocity.set(0, 0, 0);
                    slab.isResting = true;
                }
            }
        }

        // 3. Update dust plume particles
        for (let i = this.dustParticles.length - 1; i >= 0; i--) {
            const p = this.dustParticles[i];
            p.age += dt;
            if (p.age >= p.maxLife) {
                this.scene.remove(p.mesh);
                if (p.mesh.material instanceof THREE.Material) {
                    p.mesh.material.dispose();
                }
                this.dustParticles.splice(i, 1);
                continue;
            }

            p.mesh.position.addScaledVector(p.velocity, dt);
            p.velocity.multiplyScalar(0.96); // drag
            p.velocity.y += 0.8 * dt; // buoyant upward drift

            // Expand
            const s = p.mesh.scale.x + p.scaleSpeed * dt;
            p.mesh.scale.set(s, s, s);

            // Fade out
            const lifeFrac = p.age / p.maxLife;
            const mat = p.mesh.material as THREE.MeshBasicMaterial;
            if (mat) {
                mat.opacity = (1 - lifeFrac) * p.opacity;
            }
        }
    }

    /**
     * Constructs a detailed 3D ruin rubble mound with crushed slabs, angled floor slabs,
     * rebar, sheared steel beams, charred brick heaps and glowing embers.
     */
    private createRuinMound(record: CollapsedBuilding): void {
        const { building } = record;
        const ruinGroup = new THREE.Group();
        ruinGroup.position.copy(building.position);

        const w = building.width;
        const d = building.depth;

        // 1. Base rubble heap (Irregular crushed floor mounds)
        const heapGeo1 = new THREE.BoxGeometry(w * 0.9, 1.4, d * 0.9);
        const heapMesh1 = new THREE.Mesh(heapGeo1, this.concreteSlabMat);
        heapMesh1.position.set(0, 0.7, 0);
        heapMesh1.castShadow = true;
        heapMesh1.receiveShadow = true;
        ruinGroup.add(heapMesh1);

        const heapGeo2 = new THREE.BoxGeometry(w * 0.65, 1.2, d * 0.65);
        const heapMesh2 = new THREE.Mesh(heapGeo2, this.concreteSlabMat);
        heapMesh2.position.set((Math.random() - 0.5) * 2, 1.6, (Math.random() - 0.5) * 2);
        heapMesh2.rotation.y = 0.2;
        heapMesh2.castShadow = true;
        ruinGroup.add(heapMesh2);

        // 2. Angled crushed floor slabs
        const slabGeo = new THREE.BoxGeometry(w * 0.45, 0.4, d * 0.4);
        const angles = [
            { x: -w * 0.22, y: 1.5, z: -d * 0.2, rx: 0.25, rz: -0.2 },
            { x: w * 0.24, y: 1.8, z: d * 0.15, rx: -0.3, rz: 0.25 },
            { x: -w * 0.1, y: 2.1, z: d * 0.22, rx: 0.18, rz: 0.15 },
            { x: w * 0.18, y: 1.4, z: -d * 0.24, rx: -0.2, rz: -0.18 }
        ];
        angles.forEach(pos => {
            const slab = new THREE.Mesh(slabGeo, this.concreteSlabMat);
            slab.position.set(pos.x, pos.y, pos.z);
            slab.rotation.set(pos.rx, Math.random() * 0.5, pos.rz);
            slab.castShadow = true;
            ruinGroup.add(slab);
        });

        // 3. Sheared steel I-beams poking out of rubble
        const beamGeo = new THREE.BoxGeometry(0.35, 5.0, 0.35);
        for (let i = 0; i < 5; i++) {
            const beam = new THREE.Mesh(beamGeo, this.steelBeamMat);
            const bx = (Math.random() - 0.5) * (w * 0.6);
            const bz = (Math.random() - 0.5) * (d * 0.6);
            beam.position.set(bx, 2.2, bz);
            beam.rotation.set(
                (Math.random() - 0.5) * 0.8,
                Math.random() * Math.PI,
                (Math.random() - 0.5) * 0.8
            );
            beam.castShadow = true;
            ruinGroup.add(beam);
        }

        // 4. Exposed bent rebar rods
        const rebarGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.2, 5);
        for (let i = 0; i < 8; i++) {
            const rebar = new THREE.Mesh(rebarGeo, this.rebarMat);
            const rx = (Math.random() - 0.5) * (w * 0.7);
            const rz = (Math.random() - 0.5) * (d * 0.7);
            rebar.position.set(rx, 2.0, rz);
            rebar.rotation.set(
                (Math.random() - 0.5) * 1.2,
                Math.random() * Math.PI,
                (Math.random() - 0.5) * 1.2
            );
            ruinGroup.add(rebar);
        }

        // 5. Scattered brick piles
        const brickGeo = new THREE.BoxGeometry(1.2, 0.5, 1.0);
        for (let i = 0; i < 6; i++) {
            const brick = new THREE.Mesh(brickGeo, this.brickRubbleMat);
            const kx = (Math.random() - 0.5) * (w * 0.8);
            const kz = (Math.random() - 0.5) * (d * 0.8);
            brick.position.set(kx, 1.0 + Math.random() * 0.8, kz);
            brick.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
            ruinGroup.add(brick);
        }

        // 6. Smoldering embers (warm glowing points in wreckage)
        const emberGeo = new THREE.SphereGeometry(0.18, 4, 4);
        for (let i = 0; i < 4; i++) {
            const ember = new THREE.Mesh(emberGeo, this.emberMat);
            ember.position.set(
                (Math.random() - 0.5) * (w * 0.5),
                1.3 + Math.random() * 0.6,
                (Math.random() - 0.5) * (d * 0.5)
            );
            ruinGroup.add(ember);
        }

        this.scene.add(ruinGroup);
        record.ruinGroup = ruinGroup;
        building.ruinGroup = ruinGroup;

        // Dynamically adjust building collision box to match low rubble mound height (y = 2.4m)
        // so cars won't be blocked by a 30m phantom skyscraper in the sky
        const halfW = w / 2;
        const halfD = d / 2;
        building.box.min.set(building.position.x - halfW, 0, building.position.z - halfD);
        building.box.max.set(building.position.x + halfW, 2.4, building.position.z + halfD);
    }

    /**
     * Restore all collapsed and collapsing buildings back to original upright standing state.
     */
    public clear(): void {
        this.collapsedBuildings.forEach((record, building) => {
            // Remove ruin group if spawned
            if (record.ruinGroup) {
                this.scene.remove(record.ruinGroup);
                record.ruinGroup.traverse(child => {
                    if (child instanceof THREE.Mesh) {
                        child.geometry?.dispose();
                    }
                });
                record.ruinGroup = undefined;
            }

            // Restore building mesh transformations
            building.group.position.copy(record.originalPos);
            building.group.rotation.set(0, 0, 0);
            building.group.scale.set(1, 1, 1);
            building.group.visible = true;

            // Restore full collision box
            building.box.copy(record.originalBox);

            building.isCollapsing = false;
            building.isCollapsed = false;
            building.ruinGroup = undefined;
        });

        this.collapsedBuildings.clear();

        // Clear all dust particles
        for (const p of this.dustParticles) {
            this.scene.remove(p.mesh);
            if (p.mesh.material instanceof THREE.Material) {
                p.mesh.material.dispose();
            }
        }
        this.dustParticles = [];

        // Clear all falling slabs
        for (const slab of this.fallingSlabs) {
            this.scene.remove(slab.mesh);
            slab.mesh.geometry?.dispose();
        }
        this.fallingSlabs = [];
    }

    public isBuildingCollapsed(building: BuildingObject): boolean {
        return this.collapsedBuildings.get(building)?.stage === 'collapsed';
    }

    public isBuildingCollapsing(building: BuildingObject): boolean {
        const stage = this.collapsedBuildings.get(building)?.stage;
        return stage === 'shudder' || stage === 'falling';
    }

    public getCollapsedCount(): number {
        let count = 0;
        this.collapsedBuildings.forEach(r => {
            if (r.stage === 'collapsed') count++;
        });
        return count;
    }

    public getCollapsingCount(): number {
        let count = 0;
        this.collapsedBuildings.forEach(r => {
            if (r.stage === 'shudder' || r.stage === 'falling') count++;
        });
        return count;
    }

    public getCollapsedBuildings(): CollapsedBuilding[] {
        return Array.from(this.collapsedBuildings.values());
    }
}
