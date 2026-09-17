import * as THREE from 'three';
import { CROWN_STAGES } from '../catalog';
import { StageDef, PlatformDef } from '../types';

export interface CheckpointZone {
    stage: number;
    pos: THREE.Vector3;
    box: THREE.Box3;
    padMesh: THREE.Mesh;
}

export interface HazardZone {
    stage: number;
    type: string;
    mesh: THREE.Mesh;
    box: THREE.Box3;
}

export class StageBuilder {
    private scene: THREE.Scene;
    private platforms: THREE.Mesh[] = [];
    private checkpoints: CheckpointZone[] = [];
    private hazards: HazardZone[] = [];
    private movingPlatforms: { mesh: THREE.Mesh; origX: number; origZ: number; axis: string; dist: number; speed: number }[] = [];
    private rotatingBars: THREE.Mesh[] = [];
    private crownMesh: THREE.Group | null = null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public buildWorld() {
        this.buildLighting();
        this.buildStages();
    }

    private buildLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
        this.scene.add(ambientLight);

        const sun = new THREE.DirectionalLight(0xfff5e6, 1.2);
        sun.position.set(40, 100, 50);
        sun.castShadow = true;
        this.scene.add(sun);

        const fillLight = new THREE.DirectionalLight(0x00f2fe, 0.4);
        fillLight.position.set(-40, 40, -50);
        this.scene.add(fillLight);

        // Sky atmosphere
        this.scene.background = new THREE.Color(0x0a101d);
        this.scene.fog = new THREE.FogExp2(0x0a101d, 0.0018);
    }

    private buildStages() {
        CROWN_STAGES.forEach((stageDef: StageDef) => {
            this.buildStage(stageDef);
        });
    }

    private buildStage(stage: StageDef) {
        stage.platforms.forEach((plat: PlatformDef, index: number) => {
            const isCheckpointPad = index === 0;

            let geom: THREE.BufferGeometry;
            if (plat.shape === 'cylinder') {
                geom = new THREE.CylinderGeometry(plat.width / 2, plat.width / 2, plat.height, 24);
            } else {
                geom = new THREE.BoxGeometry(plat.width, plat.height, plat.depth);
            }

            let mat: THREE.Material;
            if (plat.isHazard) {
                mat = new THREE.MeshStandardMaterial({
                    color: plat.color,
                    emissive: plat.color,
                    emissiveIntensity: 0.8,
                    roughness: 0.2
                });
            } else if (isCheckpointPad) {
                mat = new THREE.MeshStandardMaterial({
                    color: plat.color,
                    metalness: 0.3,
                    roughness: 0.3,
                    emissive: plat.color,
                    emissiveIntensity: 0.25
                });
            } else {
                mat = new THREE.MeshStandardMaterial({
                    color: plat.color,
                    metalness: 0.1,
                    roughness: 0.6
                });
            }

            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.set(plat.x, plat.y + plat.height / 2, plat.z);
            mesh.receiveShadow = true;
            mesh.castShadow = true;
            this.scene.add(mesh);

            if (plat.isHazard) {
                const box = new THREE.Box3().setFromObject(mesh);
                this.hazards.push({
                    stage: stage.stageNumber,
                    type: plat.hazardType || 'laser',
                    mesh,
                    box
                });
                if (stage.stageNumber % 2 === 0) {
                    this.rotatingBars.push(mesh);
                }
            } else {
                this.platforms.push(mesh);

                if (isCheckpointPad) {
                    const padBox = new THREE.Box3().setFromObject(mesh);
                    this.checkpoints.push({
                        stage: stage.stageNumber,
                        pos: new THREE.Vector3(plat.x, plat.y + plat.height + 0.1, plat.z),
                        box: padBox,
                        padMesh: mesh
                    });

                    // Stage number banner
                    this.addStageFloatingIndicator(stage.stageNumber, plat.x, plat.y + plat.height + 2.5, plat.z);
                }

                if (plat.isMoving) {
                    this.movingPlatforms.push({
                        mesh,
                        origX: plat.x,
                        origZ: plat.z,
                        axis: plat.moveAxis || 'x',
                        dist: plat.moveDist || 3,
                        speed: plat.moveSpeed || 2
                    });
                }
            }
        });

        // If Stage 50, build the Royal Crown on pedestal
        if (stage.isFinalStage) {
            this.buildRoyalCrown(stage.spawnPos.x, stage.spawnPos.y + 2.5, stage.spawnPos.z + 18);
        }
    }

    private addStageFloatingIndicator(stageNum: number, x: number, y: number, z: number) {
        // Glowing floating indicator ring above checkpoint
        const ringGeom = new THREE.TorusGeometry(1.2, 0.12, 16, 32);
        const ringMat = new THREE.MeshStandardMaterial({
            color: stageNum === 50 ? 0xffd700 : (stageNum % 5 === 0 ? 0x00f2fe : 0x2ecc71),
            emissive: stageNum === 50 ? 0xffd700 : (stageNum % 5 === 0 ? 0x00f2fe : 0x2ecc71),
            emissiveIntensity: 0.9,
            roughness: 0.1
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, y, z);
        this.scene.add(ring);
    }

    private buildRoyalCrown(x: number, y: number, z: number) {
        const crownGroup = new THREE.Group();
        crownGroup.position.set(x, y, z);

        // Gold band
        const bandGeom = new THREE.CylinderGeometry(1.4, 1.4, 0.5, 32);
        const goldMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.95,
            roughness: 0.15,
            emissive: 0xffa502,
            emissiveIntensity: 0.35
        });
        const band = new THREE.Mesh(bandGeom, goldMat);
        crownGroup.add(band);

        // Crown spikes
        const spikesCount = 5;
        for (let i = 0; i < spikesCount; i++) {
            const angle = (i / spikesCount) * Math.PI * 2;
            const spikeGeom = new THREE.ConeGeometry(0.35, 1.2, 8);
            const spike = new THREE.Mesh(spikeGeom, goldMat);
            spike.position.set(Math.sin(angle) * 1.35, 0.8, Math.cos(angle) * 1.35);
            crownGroup.add(spike);

            // Ruby jewel on tip
            const rubyGeom = new THREE.SphereGeometry(0.18, 12, 12);
            const rubyMat = new THREE.MeshStandardMaterial({
                color: i % 2 === 0 ? 0xff4757 : 0x00f2fe,
                emissive: i % 2 === 0 ? 0xff4757 : 0x00f2fe,
                emissiveIntensity: 0.8,
                roughness: 0.1
            });
            const ruby = new THREE.Mesh(rubyGeom, rubyMat);
            ruby.position.set(Math.sin(angle) * 1.35, 1.45, Math.cos(angle) * 1.35);
            crownGroup.add(ruby);
        }

        // Central beacon light
        const light = new THREE.PointLight(0xffd700, 3, 20);
        light.position.set(0, 1.2, 0);
        crownGroup.add(light);

        this.scene.add(crownGroup);
        this.crownMesh = crownGroup;
    }

    public update(delta: number, time: number) {
        // Move floating platforms
        this.movingPlatforms.forEach(mp => {
            const offset = Math.sin(time * mp.speed) * mp.dist;
            if (mp.axis === 'x') {
                mp.mesh.position.x = mp.origX + offset;
            } else if (mp.axis === 'z') {
                mp.mesh.position.z = mp.origZ + offset;
            }
        });

        // Rotate hazardous bars
        this.rotatingBars.forEach(bar => {
            bar.rotation.y += delta * 2;
        });

        // Hover and rotate 24K Royal Crown
        if (this.crownMesh) {
            this.crownMesh.rotation.y += delta * 1.2;
            this.crownMesh.position.y += Math.sin(time * 3) * 0.005;
        }
    }

    public getPlatforms(): THREE.Mesh[] {
        return this.platforms;
    }

    public getCheckpoints(): CheckpointZone[] {
        return this.checkpoints;
    }

    public getHazards(): HazardZone[] {
        return this.hazards;
    }

    public getCrownPosition(): THREE.Vector3 | null {
        return this.crownMesh ? this.crownMesh.position : null;
    }
}
