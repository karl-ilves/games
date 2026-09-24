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
     * Spawn exploding 3D debris pieces from the car
     * Standard crash: 12 pieces from front end ("su esiotsast lendavat tükid ja pool autost jääb terveks")
     * Mid-air ramp jump crash: 30 pieces from entire car ("palju tükke lendavad ja terve auto läheb katki")
     */
    public spawnDebris(origin: THREE.Vector3, forwardDir: THREE.Vector3, bodyColorHex: string, isMassive: boolean = false): void {
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
        const wheelMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.8
        });

        const pieceDefs: { geo: THREE.BufferGeometry; mat: THREE.Material }[] = [
            // Hood & front panel fragments
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

        // Additional debris for entire-car mid-air catastrophe (User: "palju tükke lendavad")
        if (isMassive) {
            // 4 detached flying wheels
            for (let w = 0; w < 4; w++) {
                pieceDefs.push({ geo: new THREE.CylinderGeometry(0.38, 0.38, 0.26, 12), mat: wheelMat });
            }
            // Doors, trunk, roof fragments
            pieceDefs.push(
                { geo: new THREE.BoxGeometry(1.2, 0.5, 0.08), mat: bodyMat }, // Left door
                { geo: new THREE.BoxGeometry(1.2, 0.5, 0.08), mat: bodyMat }, // Right door
                { geo: new THREE.BoxGeometry(1.0, 0.08, 0.9), mat: bodyMat }, // Roof panel
                { geo: new THREE.BoxGeometry(1.4, 0.1, 0.7), mat: bodyMat },  // Trunk lid
                // Rear bumper & spoiler
                { geo: new THREE.BoxGeometry(1.7, 0.06, 0.35), mat: darkMat }, // Spoiler wing
                { geo: new THREE.BoxGeometry(1.6, 0.16, 0.25), mat: darkMat }, // Rear bumper
                { geo: new THREE.BoxGeometry(0.4, 0.15, 0.15), mat: darkMat },
                // Additional window glass shards
                { geo: new THREE.BoxGeometry(0.5, 0.3, 0.04), mat: glassMat },
                { geo: new THREE.BoxGeometry(0.45, 0.25, 0.04), mat: glassMat },
                // Mechanical & engine wreckage
                { geo: new THREE.BoxGeometry(0.5, 0.4, 0.4), mat: metalMat }, // Heavy engine block
                { geo: new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8), mat: metalMat }, // Exhaust pipe
                { geo: new THREE.BoxGeometry(0.35, 0.25, 0.25), mat: metalMat }, // Transmission
                { geo: new THREE.BoxGeometry(0.6, 0.15, 0.4), mat: darkMat },
                { geo: new THREE.BoxGeometry(0.5, 0.15, 0.35), mat: darkMat }
            );
        }

        pieceDefs.forEach((def, i) => {
            const mesh = new THREE.Mesh(def.geo, def.mat);
            mesh.castShadow = true;

            // Offset across car volume
            const lateralOffset = (Math.random() - 0.5) * (isMassive ? 2.6 : 1.6);
            const heightOffset = 0.3 + Math.random() * (isMassive ? 1.2 : 0.6);
            const forwardOffset = (Math.random() - 0.5) * (isMassive ? 3.0 : 0.8);

            mesh.position.set(
                origin.x + lateralOffset,
                origin.y + heightOffset,
                origin.z + forwardOffset
            );

            // Explosive dispersal velocity: upward, backward/forward and sideways
            const speedMultiplier = isMassive ? 1.5 : 1.0;
            const sideSpike = (Math.random() - 0.5) * (9.0 * speedMultiplier);
            const upSpike = (5.5 + Math.random() * 7.5) * speedMultiplier;
            const fwdSpike = -forwardDir.x * (4.0 + Math.random() * 6.0) * speedMultiplier + (Math.random() - 0.5) * 5.0;
            const depthSpike = -forwardDir.z * (4.0 + Math.random() * 6.0) * speedMultiplier + (Math.random() - 0.5) * 5.0;

            const velocity = new THREE.Vector3(fwdSpike + sideSpike, upSpike, depthSpike + sideSpike);
            const rotVelocity = new THREE.Vector3(
                (Math.random() - 0.5) * 16.0,
                (Math.random() - 0.5) * 16.0,
                (Math.random() - 0.5) * 16.0
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

    /**
     * Spawn remaining car debris when the falling half-car slams into the ground
     * User requirement: "pool kukkub alla ja puruneb maa puututamisest"
     */
    public spawnGroundImpactDebris(origin: THREE.Vector3, forwardDir: THREE.Vector3, bodyColorHex: string): void {
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
        const wheelMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.8
        });

        const groundPieces: { geo: THREE.BufferGeometry; mat: THREE.Material }[] = [
            // 4 detached wheels flying out on hard ground impact
            { geo: new THREE.CylinderGeometry(0.38, 0.38, 0.26, 12), mat: wheelMat },
            { geo: new THREE.CylinderGeometry(0.38, 0.38, 0.26, 12), mat: wheelMat },
            { geo: new THREE.CylinderGeometry(0.38, 0.38, 0.26, 12), mat: wheelMat },
            { geo: new THREE.CylinderGeometry(0.38, 0.38, 0.26, 12), mat: wheelMat },
            // Remaining body panels (doors, trunk, roof)
            { geo: new THREE.BoxGeometry(1.2, 0.5, 0.08), mat: bodyMat },
            { geo: new THREE.BoxGeometry(1.2, 0.5, 0.08), mat: bodyMat },
            { geo: new THREE.BoxGeometry(1.0, 0.08, 0.9), mat: bodyMat },
            { geo: new THREE.BoxGeometry(1.4, 0.1, 0.7), mat: bodyMat },
            // Rear bumper and spoiler
            { geo: new THREE.BoxGeometry(1.7, 0.06, 0.35), mat: darkMat },
            { geo: new THREE.BoxGeometry(1.6, 0.16, 0.25), mat: darkMat },
            { geo: new THREE.BoxGeometry(0.4, 0.15, 0.15), mat: darkMat },
            // Shards and mechanical debris
            { geo: new THREE.BoxGeometry(0.5, 0.3, 0.04), mat: glassMat },
            { geo: new THREE.BoxGeometry(0.45, 0.25, 0.04), mat: glassMat },
            { geo: new THREE.BoxGeometry(0.5, 0.4, 0.4), mat: metalMat },
            { geo: new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8), mat: metalMat },
            { geo: new THREE.BoxGeometry(0.35, 0.25, 0.25), mat: metalMat },
            { geo: new THREE.BoxGeometry(0.6, 0.15, 0.4), mat: darkMat },
            { geo: new THREE.BoxGeometry(0.5, 0.15, 0.35), mat: darkMat }
        ];

        groundPieces.forEach((def) => {
            const mesh = new THREE.Mesh(def.geo, def.mat);
            mesh.castShadow = true;

            const lateralOffset = (Math.random() - 0.5) * 2.2;
            const heightOffset = 0.2 + Math.random() * 0.8;
            const forwardOffset = (Math.random() - 0.5) * 2.5;

            mesh.position.set(
                origin.x + lateralOffset,
                origin.y + heightOffset,
                origin.z + forwardOffset
            );

            // Ground impact violent scatter velocity: bounce up and burst outwards
            const sideSpike = (Math.random() - 0.5) * 15.0;
            const upSpike = 5.0 + Math.random() * 9.0;
            const fwdSpike = -forwardDir.x * (3.0 + Math.random() * 6.0) + (Math.random() - 0.5) * 8.0;
            const depthSpike = -forwardDir.z * (3.0 + Math.random() * 6.0) + (Math.random() - 0.5) * 8.0;

            const velocity = new THREE.Vector3(fwdSpike + sideSpike, upSpike, depthSpike + sideSpike);
            const rotVelocity = new THREE.Vector3(
                (Math.random() - 0.5) * 18.0,
                (Math.random() - 0.5) * 18.0,
                (Math.random() - 0.5) * 18.0
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
