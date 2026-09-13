import * as THREE from 'three';
import { Checkpoint } from '../types';
import { LEVEL_CHECKPOINTS } from '../catalog';

export class RacingEnvironment {
    public checkpoints: Checkpoint[] = [];
    public checkpointRings: THREE.Mesh[] = [];

    public createEnvironment(scene: THREE.Scene, renderer: THREE.WebGLRenderer, selectedLevel: number): void {
        // Clear old env
        while (scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }
        this.checkpointRings = [];

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(200, 500, 300);
        dirLight.castShadow = true;
        dirLight.shadow.camera.left = -500;
        dirLight.shadow.camera.right = 500;
        dirLight.shadow.camera.top = 500;
        dirLight.shadow.camera.bottom = -500;
        scene.add(dirLight);

        if (selectedLevel === 1) {
            scene.background = new THREE.Color(0x87CEEB);
            scene.fog = new THREE.Fog(0x87CEEB, 100, 500);
        } else {
            scene.background = new THREE.Color(0x1a5276);
            scene.fog = new THREE.Fog(0x1a5276, 50, 400);
        }

        // Setup realistic environment reflections for cars
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const envScene = new THREE.Scene();
        envScene.background = scene.background;
        envScene.add(
            new THREE.Mesh(
                new THREE.PlaneGeometry(100, 100).rotateX(-Math.PI / 2),
                new THREE.MeshBasicMaterial({ color: selectedLevel === 1 ? 0x222222 : 0x2ecc71 })
            )
        );
        scene.environment = pmremGenerator.fromScene(envScene).texture;

        // Ground Plane
        const groundGeo = new THREE.PlaneGeometry(2000, 2000);
        const groundMat = new THREE.MeshLambertMaterial({ color: selectedLevel === 1 ? 0x333333 : 0x2ecc71 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        // Track Layout based on Level
        this.checkpoints = LEVEL_CHECKPOINTS[selectedLevel] || LEVEL_CHECKPOINTS[1];

        // Build visible rings
        const ringGeo = new THREE.TorusGeometry(35, 2, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.6 });
        this.checkpoints.forEach((cp, i) => {
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.set(cp.x, 20, cp.z);

            const prevCp = this.checkpoints[i === 0 ? this.checkpoints.length - 1 : i - 1];
            const nextCp = this.checkpoints[i === this.checkpoints.length - 1 ? 0 : i + 1];

            const vPrev = new THREE.Vector3(prevCp.x, 0, prevCp.z);
            const vThis = new THREE.Vector3(cp.x, 0, cp.z);
            const vNext = new THREE.Vector3(nextCp.x, 0, nextCp.z);

            const dirIn = vThis.clone().sub(vPrev).normalize();
            const dirOut = vNext.clone().sub(vThis).normalize();

            let dir = dirIn.clone().add(dirOut).normalize();
            if (dir.lengthSq() < 0.01) dir = dirIn;

            ring.lookAt(ring.position.clone().add(dir));
            scene.add(ring);
            this.checkpointRings.push(ring);
        });

        // Generate Scenery
        if (selectedLevel === 1) {
            const buildingGeo = new THREE.BoxGeometry(40, 1, 40);
            for (let x = -800; x <= 800; x += 60) {
                for (let z = -800; z <= 800; z += 60) {
                    let onRoad = false;
                    for (let i = 0; i < this.checkpoints.length; i++) {
                        const p1 = this.checkpoints[i];
                        const p2 = this.checkpoints[(i + 1) % this.checkpoints.length];
                        const l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.z - p2.z, 2);
                        if (l2 === 0) continue;
                        const t = Math.max(0, Math.min(1, ((x - p1.x) * (p2.x - p1.x) + (z - p1.z) * (p2.z - p1.z)) / l2));
                        const projX = p1.x + t * (p2.x - p1.x);
                        const projZ = p1.z + t * (p2.z - p1.z);
                        const dist = Math.sqrt(Math.pow(x - projX, 2) + Math.pow(z - projZ, 2));
                        if (dist < 45) {
                            onRoad = true;
                            break;
                        }
                    }
                    if (!onRoad && Math.random() > 0.2) {
                        const height = Math.random() > 0.9 ? 150 + Math.random() * 150 : 30 + Math.random() * 50;
                        const b = new THREE.Mesh(buildingGeo, new THREE.MeshLambertMaterial({ color: 0x555555 + Math.random() * 0x333333 }));
                        b.scale.y = height;
                        b.position.set(x + (Math.random() * 20 - 10), height / 2, z + (Math.random() * 20 - 10));
                        b.castShadow = true;
                        b.receiveShadow = true;
                        scene.add(b);
                    }
                }
            }
        } else if (selectedLevel === 2) {
            const trunkGeo = new THREE.CylinderGeometry(2, 3, 15);
            const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
            const leavesGeo = new THREE.SphereGeometry(15, 8, 8);
            const leavesMat = new THREE.MeshLambertMaterial({ color: 0x228b22 });

            for (let x = -800; x <= 800; x += 40) {
                for (let z = -800; z <= 800; z += 40) {
                    let onRoad = false;
                    for (let i = 0; i < this.checkpoints.length; i++) {
                        const p1 = this.checkpoints[i];
                        const p2 = this.checkpoints[(i + 1) % this.checkpoints.length];
                        const l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.z - p2.z, 2);
                        if (l2 === 0) continue;
                        const t = Math.max(0, Math.min(1, ((x - p1.x) * (p2.x - p1.x) + (z - p1.z) * (p2.z - p1.z)) / l2));
                        const projX = p1.x + t * (p2.x - p1.x);
                        const projZ = p1.z + t * (p2.z - p1.z);
                        const dist = Math.sqrt(Math.pow(x - projX, 2) + Math.pow(z - projZ, 2));
                        if (dist < 45) {
                            onRoad = true;
                            break;
                        }
                    }
                    if (!onRoad && Math.random() > 0.4) {
                        const treeGroup = new THREE.Group();
                        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
                        trunk.position.y = 7.5;
                        trunk.castShadow = true;
                        trunk.receiveShadow = true;
                        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
                        leaves.position.y = 18;
                        leaves.scale.set(1 + Math.random() * 0.5, 1 + Math.random() * 0.5, 1 + Math.random() * 0.5);
                        leaves.castShadow = true;
                        treeGroup.add(trunk);
                        treeGroup.add(leaves);

                        treeGroup.position.set(x + (Math.random() * 20 - 10), 0, z + (Math.random() * 20 - 10));
                        scene.add(treeGroup);
                    }
                }
            }
        }
    }
}
