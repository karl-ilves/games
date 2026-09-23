import * as THREE from 'three';
import { WorldEnvironment } from '../world/world';

interface DebrisPiece {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    rotVelocity: THREE.Vector3;
    isResting: boolean;
}

export class CrashDebrisSystem {
    private scene: THREE.Scene;
    private world: WorldEnvironment;
    private pieces: DebrisPiece[] = [];

    constructor(scene: THREE.Scene, world: WorldEnvironment) {
        this.scene = scene;
        this.world = world;
    }

    /**
     * Spawn exploding 3D debris pieces from the front end of the car
     * User requirement: "su esiotsast lendavat tükid ja pool autost jääb terveks"
     */
    public spawnDebris(origin: THREE.Vector3, forwardDir: THREE.Vector3, bodyColorHex: string): void {
        this.clear();

        const bodyMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(bodyColorHex),
            roughness: 0.35,
            metalness: 0.6
        });
        const darkMat = new THREE.MeshStandardMaterial({
            color: 0x1e272e,
            roughness: 0.8
        });
        const glassMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.85
        });
        const metalMat = new THREE.MeshStandardMaterial({
            color: 0x718093,
            roughness: 0.4,
            metalness: 0.8
        });

        const pieceDefs = [
            // Hood panel fragments
            { geo: new THREE.BoxGeometry(0.7, 0.08, 0.6), mat: bodyMat },
            { geo: new THREE.BoxGeometry(0.65, 0.08, 0.5), mat: bodyMat },
            { geo: new THREE.BoxGeometry(0.45, 0.06, 0.4), mat: bodyMat },
            // Bumper / Grille fragments
            { geo: new THREE.BoxGeometry(0.9, 0.14, 0.22), mat: darkMat },
            { geo: new THREE.BoxGeometry(0.85, 0.12, 0.2), mat: darkMat },
            { geo: new THREE.BoxGeometry(0.4, 0.1, 0.18), mat: darkMat },
            // Headlight glass shards
            { geo: new THREE.BoxGeometry(0.3, 0.12, 0.08), mat: glassMat },
            { geo: new THREE.BoxGeometry(0.28, 0.1, 0.08), mat: glassMat },
            // Engine / radiator metal fragments
            { geo: new THREE.BoxGeometry(0.4, 0.3, 0.25), mat: metalMat },
            { geo: new THREE.BoxGeometry(0.35, 0.25, 0.2), mat: metalMat },
            { geo: new THREE.CylinderGeometry(0.12, 0.12, 0.4, 8), mat: metalMat },
            { geo: new THREE.BoxGeometry(0.3, 0.15, 0.3), mat: darkMat }
        ];

        pieceDefs.forEach((def, i) => {
            const mesh = new THREE.Mesh(def.geo, def.mat);
            mesh.castShadow = true;

            // Offset slightly around the front bumper
            const lateralOffset = (Math.random() - 0.5) * 1.6;
            const heightOffset = 0.3 + Math.random() * 0.6;
            const forwardOffset = (Math.random() - 0.3) * 0.8;

            mesh.position.set(
                origin.x + lateralOffset,
                origin.y + heightOffset,
                origin.z + forwardOffset
            );

            // Explosive dispersal velocity: upward, backward/forward and sideways
            const sideSpike = (Math.random() - 0.5) * 9.0;
            const upSpike = 5.5 + Math.random() * 7.5;
            const fwdSpike = -forwardDir.x * (4.0 + Math.random() * 6.0) + (Math.random() - 0.5) * 4.0;
            const depthSpike = -forwardDir.z * (4.0 + Math.random() * 6.0) + (Math.random() - 0.5) * 4.0;

            const velocity = new THREE.Vector3(fwdSpike + sideSpike, upSpike, depthSpike + sideSpike);
            const rotVelocity = new THREE.Vector3(
                (Math.random() - 0.5) * 14.0,
                (Math.random() - 0.5) * 14.0,
                (Math.random() - 0.5) * 14.0
            );

            this.scene.add(mesh);
            this.pieces.push({
                mesh,
                velocity,
                rotVelocity,
                isResting: false
            });
        });
    }

    public update(dt: number): void {
        const delta = Math.min(dt, 0.1);

        for (const p of this.pieces) {
            if (p.isResting) continue;

            // Gravity
            p.velocity.y -= 19.0 * delta;

            p.mesh.position.addScaledVector(p.velocity, delta);
            p.mesh.rotation.x += p.rotVelocity.x * delta;
            p.mesh.rotation.y += p.rotVelocity.y * delta;
            p.mesh.rotation.z += p.rotVelocity.z * delta;

            const groundY = this.world.getGroundHeight(p.mesh.position.x, p.mesh.position.z);
            const contactY = groundY + 0.08;

            if (p.mesh.position.y <= contactY) {
                p.mesh.position.y = contactY;

                // Bounce or come to rest
                if (p.velocity.y < -1.8) {
                    p.velocity.y = -p.velocity.y * 0.28;
                    p.velocity.x *= 0.55;
                    p.velocity.z *= 0.55;
                    p.rotVelocity.multiplyScalar(0.4);
                } else {
                    p.velocity.set(0, 0, 0);
                    p.rotVelocity.set(0, 0, 0);
                    p.isResting = true;
                }
            }
        }
    }

    public getDebrisCount(): number {
        return this.pieces.length;
    }

    public clear(): void {
        for (const p of this.pieces) {
            this.scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            if (p.mesh.material instanceof THREE.Material) {
                p.mesh.material.dispose();
            }
        }
        this.pieces = [];
    }
}
