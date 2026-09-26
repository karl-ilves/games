import * as THREE from 'three';
import { BuildingObject } from './world';

export interface FallingRubble {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    rotVelocity: THREE.Vector3;
    isResting: boolean;
}

export interface BuildingSmoke {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    opacity: number;
    maxLife: number;
    age: number;
}

export interface BuildingBreach {
    id: string;
    group: THREE.Group;
    building: BuildingObject;
    position: THREE.Vector3;
    height: number;
    normal: THREE.Vector3;
    width: number;
    depth: number;
    isAirborne: boolean;
    createdAt: number;
}

export class BuildingBreachSystem {
    private scene: THREE.Scene;
    private buildings: BuildingObject[];
    private breaches: BuildingBreach[] = [];
    private fallingRubble: FallingRubble[] = [];
    private smokeParticles: BuildingSmoke[] = [];
    private nextId = 1;

    // Shared materials for performance
    private charredMat = new THREE.MeshStandardMaterial({
        color: 0x08090b,
        roughness: 0.95,
        metalness: 0.1
    });

    private concreteMat = new THREE.MeshStandardMaterial({
        color: 0x485460,
        roughness: 0.9,
        metalness: 0.2
    });

    private brickMat = new THREE.MeshStandardMaterial({
        color: 0x933924,
        roughness: 0.85,
        metalness: 0.15
    });

    private rebarMat = new THREE.MeshStandardMaterial({
        color: 0x22272e,
        metalness: 0.85,
        roughness: 0.4
    });

    private glassShardMat = new THREE.MeshBasicMaterial({
        color: 0xc7ecee,
        transparent: true,
        opacity: 0.75
    });

    private sootDecalMat = new THREE.MeshBasicMaterial({
        color: 0x060709,
        transparent: true,
        opacity: 0.85,
        depthWrite: false
    });

    private crackLineMat = new THREE.MeshBasicMaterial({
        color: 0x111317,
        transparent: true,
        opacity: 0.9,
        depthWrite: false
    });

    constructor(scene: THREE.Scene, buildings: BuildingObject[]) {
        this.scene = scene;
        this.buildings = buildings;
    }

    public setBuildings(buildings: BuildingObject[]): void {
        this.buildings = buildings;
    }

    /**
     * Create a car-sized breach hole in a building at the exact impact position and altitude.
     * Works both at ground level (e.g. driving straight in) and high in the air (e.g. jumping off a ramp).
     */
    public createBreach(impactPos: THREE.Vector3, carYaw: number, targetBuilding?: BuildingObject): BuildingBreach | null {
        // 1. Find building if not passed directly
        let building = targetBuilding;
        if (!building) {
            let closestDist = Infinity;
            for (const b of this.buildings) {
                const dist = b.box.distanceToPoint(impactPos);
                if (dist < closestDist) {
                    closestDist = dist;
                    building = b;
                }
            }
            if (!building || closestDist > 6.0) {
                return null;
            }
        }

        const bPos = building.position;
        const hw = building.width / 2;
        const hd = building.depth / 2;
        const bh = building.height;

        // 2. Identify which of the 4 outer building wall faces was impacted
        const distPosZ = Math.abs(impactPos.z - (bPos.z + hd));
        const distNegZ = Math.abs(impactPos.z - (bPos.z - hd));
        const distPosX = Math.abs(impactPos.x - (bPos.x + hw));
        const distNegX = Math.abs(impactPos.x - (bPos.x - hw));

        const minDist = Math.min(distPosZ, distNegZ, distPosX, distNegX);

        let normal = new THREE.Vector3(0, 0, 1);
        let rotY = 0;
        let holeX = impactPos.x;
        let holeY = impactPos.y;
        let holeZ = impactPos.z;

        if (distPosZ === minDist) {
            // Impacted +Z facade (facing +Z)
            normal.set(0, 0, 1);
            rotY = 0;
            holeX = THREE.MathUtils.clamp(impactPos.x, bPos.x - hw + 2.0, bPos.x + hw - 2.0);
            holeY = THREE.MathUtils.clamp(impactPos.y, 1.25, bh - 1.6);
            holeZ = bPos.z + hd;
        } else if (distNegZ === minDist) {
            // Impacted -Z facade (facing -Z)
            normal.set(0, 0, -1);
            rotY = Math.PI;
            holeX = THREE.MathUtils.clamp(impactPos.x, bPos.x - hw + 2.0, bPos.x + hw - 2.0);
            holeY = THREE.MathUtils.clamp(impactPos.y, 1.25, bh - 1.6);
            holeZ = bPos.z - hd;
        } else if (distPosX === minDist) {
            // Impacted +X facade (facing +X)
            normal.set(1, 0, 0);
            rotY = Math.PI / 2;
            holeX = bPos.x + hw;
            holeY = THREE.MathUtils.clamp(impactPos.y, 1.25, bh - 1.6);
            holeZ = THREE.MathUtils.clamp(impactPos.z, bPos.z - hd + 2.0, bPos.z + hd - 2.0);
        } else {
            // Impacted -X facade (facing -X)
            normal.set(-1, 0, 0);
            rotY = -Math.PI / 2;
            holeX = bPos.x - hw;
            holeY = THREE.MathUtils.clamp(impactPos.y, 1.25, bh - 1.6);
            holeZ = THREE.MathUtils.clamp(impactPos.z, bPos.z - hd + 2.0, bPos.z + hd - 2.0);
        }

        const breachPos = new THREE.Vector3(holeX, holeY, holeZ);

        // Prevent duplicate overlapping hole creation at the same spot within 2.5m
        for (const existing of this.breaches) {
            if (existing.building === building && existing.position.distanceTo(breachPos) < 2.2) {
                return existing;
            }
        }

        const isAirborne = holeY > 2.5;

        // 3. Build 3D Car-Sized Hole Group with Full Car Length Depth
        // Dimensions matching car: width ~2.6m, height ~2.0m, depth ~4.8m into the building (exact car length depth!)
        const breachWidth = 2.6;
        const breachHeight = 2.0;
        const breachDepth = 4.8; // User requirement: "seina peab tulema auto sügavusega auk" (car length depth!)

        const group = new THREE.Group();
        group.name = `BuildingBreach_${this.nextId++}`;
        group.position.copy(breachPos);
        group.rotation.y = rotY;

        // A. Charred Void Interior (Hollow chamber punching 4.8m into the building)
        // Back wall of the hole (full car depth inside)
        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(breachWidth, breachHeight), this.charredMat);
        backWall.position.set(0, 0, -breachDepth);
        group.add(backWall);

        // Ceiling of the hole
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(breachWidth, breachDepth), this.charredMat);
        ceiling.position.set(0, breachHeight / 2, -breachDepth / 2);
        ceiling.rotation.x = Math.PI / 2;
        group.add(ceiling);

        // Floor of the hole
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(breachWidth, breachDepth), this.charredMat);
        floor.position.set(0, -breachHeight / 2, -breachDepth / 2);
        floor.rotation.x = -Math.PI / 2;
        group.add(floor);

        // Left inner wall
        const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(breachDepth, breachHeight), this.charredMat);
        leftWall.position.set(-breachWidth / 2, 0, -breachDepth / 2);
        leftWall.rotation.y = Math.PI / 2;
        group.add(leftWall);

        // Right inner wall
        const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(breachDepth, breachHeight), this.charredMat);
        rightWall.position.set(breachWidth / 2, 0, -breachDepth / 2);
        rightWall.rotation.y = -Math.PI / 2;
        group.add(rightWall);

        // B. Dark Facade Opening Decal (at z = +0.02)
        // Dark void aperture plane so hole is clearly punched through outer facade
        const aperture = new THREE.Mesh(new THREE.PlaneGeometry(breachWidth * 0.94, breachHeight * 0.92), this.charredMat);
        aperture.position.set(0, 0, 0.02);
        group.add(aperture);

        // C. Jagged Concrete Teeth & Broken Brick Perimeter (3D Broken Wall Silhouette)
        // Places 16 irregular fractured chunks around the perimeter
        const chunkGeo1 = new THREE.BoxGeometry(0.38, 0.28, 0.35);
        const chunkGeo2 = new THREE.BoxGeometry(0.32, 0.24, 0.3);
        const chunkGeo3 = new THREE.BoxGeometry(0.24, 0.2, 0.28);

        // Top edge jagged chunks
        for (let i = 0; i < 5; i++) {
            const cx = -1.0 + i * 0.5 + (Math.sin(i * 3) * 0.08);
            const cy = breachHeight / 2 + (i % 2 === 0 ? -0.08 : 0.06);
            const mesh = new THREE.Mesh(i % 2 === 0 ? chunkGeo1 : chunkGeo2, i % 3 === 0 ? this.brickMat : this.concreteMat);
            mesh.position.set(cx, cy, 0.05 + (i % 3) * 0.04);
            mesh.rotation.set((i % 2) * 0.2, (i % 3) * 0.3, (i % 2 - 0.5) * 0.3);
            group.add(mesh);
        }

        // Bottom edge jagged chunks (broken floor lip)
        for (let i = 0; i < 5; i++) {
            const cx = -1.0 + i * 0.5 + (Math.cos(i * 2) * 0.08);
            const cy = -breachHeight / 2 + (i % 2 === 0 ? 0.08 : -0.05);
            const mesh = new THREE.Mesh(i % 2 === 0 ? chunkGeo2 : chunkGeo1, i % 3 === 1 ? this.brickMat : this.concreteMat);
            mesh.position.set(cx, cy, 0.06 + (i % 2) * 0.05);
            mesh.rotation.set((i % 2) * -0.2, (i % 3) * -0.25, (i % 2 - 0.5) * 0.2);
            group.add(mesh);
        }

        // Left and Right edge jagged chunks
        for (let i = 0; i < 3; i++) {
            const cy = -0.5 + i * 0.5;
            // Left
            const leftMesh = new THREE.Mesh(chunkGeo3, this.concreteMat);
            leftMesh.position.set(-breachWidth / 2 + (i % 2 === 0 ? 0.08 : -0.04), cy, 0.05);
            leftMesh.rotation.z = 0.35 * (i - 1);
            group.add(leftMesh);
            // Right
            const rightMesh = new THREE.Mesh(chunkGeo3, this.concreteMat);
            rightMesh.position.set(breachWidth / 2 + (i % 2 === 0 ? -0.08 : 0.04), cy, 0.05);
            rightMesh.rotation.z = -0.35 * (i - 1);
            group.add(rightMesh);
        }

        // D. Bent Twisted Steel Rebar Rods & Sheared Girders
        const rebarGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.75, 8);
        const rebar1 = new THREE.Mesh(rebarGeo, this.rebarMat);
        rebar1.position.set(-0.95, 0.75, 0.08);
        rebar1.rotation.set(0.3, 0.2, -0.7);
        group.add(rebar1);

        const rebar2 = new THREE.Mesh(rebarGeo, this.rebarMat);
        rebar2.position.set(0.95, 0.7, 0.09);
        rebar2.rotation.set(-0.25, -0.3, 0.8);
        group.add(rebar2);

        const rebar3 = new THREE.Mesh(rebarGeo, this.rebarMat);
        rebar3.position.set(-0.9, -0.65, 0.07);
        rebar3.rotation.set(0.4, -0.2, 0.6);
        group.add(rebar3);

        const rebar4 = new THREE.Mesh(rebarGeo, this.rebarMat);
        rebar4.position.set(0.88, -0.7, 0.08);
        rebar4.rotation.set(-0.35, 0.3, -0.65);
        group.add(rebar4);

        // Bent ceiling steel I-beams running along the deep 4.8m cavity
        const girder1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 1.4), this.rebarMat);
        girder1.position.set(0.2, breachHeight / 2 - 0.15, -1.0);
        girder1.rotation.set(0.15, 0.4, -0.2);
        group.add(girder1);

        const girder2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 1.6), this.rebarMat);
        girder2.position.set(-0.25, breachHeight / 2 - 0.16, -2.8);
        girder2.rotation.set(-0.18, -0.35, 0.15);
        group.add(girder2);

        // Sheared metal pipes running along the deep ceiling
        const pipeGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.6, 8);
        const ceilingPipe = new THREE.Mesh(pipeGeo, this.rebarMat);
        ceilingPipe.position.set(0.65, breachHeight / 2 - 0.18, -2.2);
        ceilingPipe.rotation.x = Math.PI / 2 + 0.1;
        group.add(ceilingPipe);

        // Interior structural column smashed at the back of the 4.8m cavity
        const pillarGeo = new THREE.BoxGeometry(0.55, breachHeight, 0.55);
        const pillarMesh = new THREE.Mesh(pillarGeo, this.concreteMat);
        pillarMesh.position.set(0.2, 0, -breachDepth + 0.35);
        pillarMesh.rotation.y = 0.25;
        group.add(pillarMesh);

        // Bent rebar protruding from the smashed column
        const columnRebar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), this.rebarMat);
        columnRebar.position.set(0.4, 0.2, -breachDepth + 0.6);
        columnRebar.rotation.set(0.6, 0.3, -0.8);
        group.add(columnRebar);

        // E. Shattered Glass Shards around the Breach
        const glassGeo = new THREE.BufferGeometry();
        const glassVertices = new Float32Array([
            0, 0, 0,
            0.28, 0.35, 0.02,
            0.4, -0.15, 0.01
        ]);
        glassGeo.setAttribute('position', new THREE.BufferAttribute(glassVertices, 3));
        glassGeo.computeVertexNormals();

        for (let g = 0; g < 6; g++) {
            const shard = new THREE.Mesh(glassGeo, this.glassShardMat);
            const angle = (g / 6) * Math.PI * 2;
            shard.position.set(
                Math.cos(angle) * (breachWidth / 2 - 0.15),
                Math.sin(angle) * (breachHeight / 2 - 0.1),
                0.035
            );
            shard.rotation.z = angle + Math.PI / 4;
            group.add(shard);
        }

        // F. Charred Blast Soot Decal & Spiderweb Wall Cracks on Facade (at z = +0.015)
        const sootDecal = new THREE.Mesh(new THREE.PlaneGeometry(breachWidth * 1.5, breachHeight * 1.55), this.sootDecalMat);
        sootDecal.position.set(0, 0, 0.012);
        group.add(sootDecal);

        // Wall fracture lines radiating outward
        const crackGeo = new THREE.BoxGeometry(0.04, 0.8, 0.01);
        const crackAngles = [0.4, 1.1, 2.2, 2.8, 3.6, 4.2, 5.1, 5.8];
        crackAngles.forEach((ang) => {
            const crack = new THREE.Mesh(crackGeo, this.crackLineMat);
            crack.position.set(
                Math.cos(ang) * (breachWidth / 2 + 0.35),
                Math.sin(ang) * (breachHeight / 2 + 0.3),
                0.015
            );
            crack.rotation.z = ang;
            group.add(crack);
        });

        // G. Interior Broken Concrete Rubble inside cavity (scattered along the full car-length depth)
        const rubbleMat = this.concreteMat;
        for (let r = 0; r < 8; r++) {
            const rubbleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.28), (r % 2 === 0) ? rubbleMat : this.brickMat);
            const rz = -0.7 - r * 0.52; // depths from -0.7m to -4.3m
            rubbleMesh.position.set(((r % 3) - 1) * 0.55, -breachHeight / 2 + 0.1, rz);
            rubbleMesh.rotation.set(r * 0.4, r * 0.6, r * 0.2);
            group.add(rubbleMesh);
        }

        // Deep interior warm warning light / spark mesh at the end of the 4.8m tunnel
        const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffaa33 });
        const sparkLight = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), sparkMat);
        sparkLight.position.set(0.5, breachHeight / 2 - 0.35, -breachDepth + 0.8);
        group.add(sparkLight);

        this.scene.add(group);

        const breach: BuildingBreach = {
            id: group.name,
            group,
            building,
            position: breachPos.clone(),
            height: holeY,
            normal: normal.clone(),
            width: breachWidth,
            depth: breachDepth,
            isAirborne,
            createdAt: performance.now()
        };

        this.breaches.push(breach);

        // 4. Dynamic Masonry Rubble Shower (Shower of falling concrete blocks & bricks)
        // Especially dramatic when high in the air ("ka isegi õhus") as pieces cascade down to the street!
        this.spawnFallingRubbleShower(breachPos, normal, isAirborne);

        // 5. Spawn rising smoke wisps from the hole
        this.spawnHoleSmoke(breachPos, normal);

        return breach;
    }

    /**
     * Spawns 25-30 physics-simulated falling masonry chunks from the hole.
     */
    private spawnFallingRubbleShower(origin: THREE.Vector3, normal: THREE.Vector3, isAirborne: boolean): void {
        const count = isAirborne ? 30 : 20;
        const tangent = new THREE.Vector3(-normal.z, 0, normal.x);

        for (let i = 0; i < count; i++) {
            const isBrick = i % 3 === 0;
            const geo = isBrick
                ? new THREE.BoxGeometry(0.24, 0.14, 0.18)
                : new THREE.BoxGeometry(0.32, 0.22, 0.26);
            const mat = isBrick ? this.brickMat : this.concreteMat;
            const mesh = new THREE.Mesh(geo, mat);

            // Spawn near hole opening with slight spread
            const spreadX = (Math.random() - 0.5) * 1.8;
            const spreadY = (Math.random() - 0.5) * 1.4;
            const spawnPos = origin.clone()
                .add(normal.clone().multiplyScalar(0.25))
                .add(tangent.clone().multiplyScalar(spreadX))
                .add(new THREE.Vector3(0, spreadY, 0));

            mesh.position.copy(spawnPos);
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            mesh.castShadow = true;
            this.scene.add(mesh);

            // Explosive outward & downward velocity
            const outwardSpeed = 2.0 + Math.random() * 4.5;
            const sideSpeed = (Math.random() - 0.5) * 3.5;
            const upSpeed = (Math.random() - 0.15) * 3.2;

            const velocity = normal.clone().multiplyScalar(outwardSpeed)
                .add(tangent.clone().multiplyScalar(sideSpeed))
                .add(new THREE.Vector3(0, upSpeed, 0));

            const rotVelocity = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            );

            this.fallingRubble.push({
                mesh,
                velocity,
                rotVelocity,
                isResting: false
            });
        }
    }

    /**
     * Spawns smoke wisps drifting from the breached cavity
     */
    private spawnHoleSmoke(origin: THREE.Vector3, normal: THREE.Vector3): void {
        const smokeGeo = new THREE.SphereGeometry(0.4, 6, 6);
        const smokeMat = new THREE.MeshBasicMaterial({
            color: 0x22272e,
            transparent: true,
            opacity: 0.65,
            depthWrite: false
        });

        for (let i = 0; i < 6; i++) {
            const mesh = new THREE.Mesh(smokeGeo, smokeMat.clone());
            mesh.position.copy(origin).add(normal.clone().multiplyScalar(0.3 + i * 0.15));
            mesh.scale.setScalar(0.8 + Math.random() * 0.6);
            this.scene.add(mesh);

            const velocity = normal.clone().multiplyScalar(0.6 + Math.random() * 0.8)
                .add(new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    0.8 + Math.random() * 1.2,
                    (Math.random() - 0.5) * 0.5
                ));

            this.smokeParticles.push({
                mesh,
                velocity,
                opacity: 0.65,
                maxLife: 3.5 + Math.random() * 2.0,
                age: 0
            });
        }
    }

    /**
     * Animate falling rubble pieces and smoke every frame
     */
    public update(delta: number): void {
        const gravity = -14.0;
        const groundHeight = 0.05;

        // 1. Update Falling Rubble
        for (const r of this.fallingRubble) {
            if (r.isResting) continue;

            r.velocity.y += gravity * delta;
            r.mesh.position.x += r.velocity.x * delta;
            r.mesh.position.y += r.velocity.y * delta;
            r.mesh.position.z += r.velocity.z * delta;

            r.mesh.rotation.x += r.rotVelocity.x * delta;
            r.mesh.rotation.y += r.rotVelocity.y * delta;
            r.mesh.rotation.z += r.rotVelocity.z * delta;

            // Bounce on street or ground
            if (r.mesh.position.y <= groundHeight) {
                r.mesh.position.y = groundHeight;
                r.velocity.y = -r.velocity.y * 0.28;
                r.velocity.x *= 0.6;
                r.velocity.z *= 0.6;
                r.rotVelocity.multiplyScalar(0.6);

                if (Math.abs(r.velocity.y) < 0.2 && Math.hypot(r.velocity.x, r.velocity.z) < 0.2) {
                    r.isResting = true;
                    r.velocity.set(0, 0, 0);
                    r.rotVelocity.set(0, 0, 0);
                }
            }
        }

        // 2. Update Smoke Particles
        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            const s = this.smokeParticles[i];
            s.age += delta;
            if (s.age >= s.maxLife) {
                this.scene.remove(s.mesh);
                s.mesh.geometry.dispose();
                (s.mesh.material as THREE.Material).dispose();
                this.smokeParticles.splice(i, 1);
                continue;
            }

            s.mesh.position.addScaledVector(s.velocity, delta);
            s.mesh.scale.multiplyScalar(1.0 + delta * 0.4);
            const progress = s.age / s.maxLife;
            const currentMat = s.mesh.material as THREE.MeshBasicMaterial;
            if (currentMat) {
                currentMat.opacity = s.opacity * (1.0 - progress);
            }
        }
    }

    /**
     * Clear all building breach holes, rubble, and smoke upon reset.
     */
    public clear(): void {
        // Remove breach meshes
        for (const breach of this.breaches) {
            this.scene.remove(breach.group);
            breach.group.traverse((obj) => {
                if ((obj as THREE.Mesh).isMesh) {
                    const m = obj as THREE.Mesh;
                    m.geometry?.dispose();
                }
            });
        }
        this.breaches = [];

        // Remove falling rubble
        for (const r of this.fallingRubble) {
            this.scene.remove(r.mesh);
            r.mesh.geometry?.dispose();
        }
        this.fallingRubble = [];

        // Remove smoke
        for (const s of this.smokeParticles) {
            this.scene.remove(s.mesh);
            s.mesh.geometry?.dispose();
            (s.mesh.material as THREE.Material)?.dispose();
        }
        this.smokeParticles = [];
    }

    public getBreaches(): BuildingBreach[] {
        return this.breaches;
    }

    public getRubbleCount(): number {
        return this.fallingRubble.length;
    }
}
