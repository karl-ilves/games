import * as THREE from 'three';

interface Particle {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    scaleDelta: number;
    colorFade: boolean;
}

export class ParticleSystem {
    private scene: THREE.Scene;
    private particles: Particle[] = [];
    private flashLight: THREE.PointLight;

    constructor(scene: THREE.Scene) {
        this.scene = scene;

        this.flashLight = new THREE.PointLight(0xff781e, 0, 150);
        this.scene.add(this.flashLight);
    }

    /**
     * Triggers a massive procedural crash explosion with fireballs, flying sparks, and rising smoke.
     */
    public spawnCrashExplosion(position: THREE.Vector3, scale: number = 1.0): void {
        const fireColors = [0xff4757, 0xff781e, 0xffa502, 0xffffff, 0x2f3542];
        const count = Math.floor(35 * scale);

        // Flash Light
        this.flashLight.position.copy(position);
        this.flashLight.intensity = 15 * scale;
        this.flashLight.distance = 250 * scale;

        for (let i = 0; i < count; i++) {
            const isSpark = Math.random() < 0.35;
            const geom = isSpark
                ? new THREE.SphereGeometry(0.35 * scale, 6, 6)
                : new THREE.DodecahedronGeometry((1.5 + Math.random() * 2.5) * scale);

            const mat = new THREE.MeshBasicMaterial({
                color: fireColors[Math.floor(Math.random() * fireColors.length)],
                transparent: true,
                opacity: 0.95
            });

            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.copy(position);
            mesh.position.x += (Math.random() - 0.5) * 4;
            mesh.position.y += (Math.random() - 0.5) * 4;
            mesh.position.z += (Math.random() - 0.5) * 4;

            const speed = (isSpark ? 40 : 25) * (0.5 + Math.random() * 1.0) * scale;
            const dir = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 1.5 + 0.3,
                (Math.random() - 0.5) * 2
            ).normalize();

            this.scene.add(mesh);
            this.particles.push({
                mesh,
                velocity: dir.multiplyScalar(speed),
                life: 0,
                maxLife: isSpark ? 1.5 : 2.5 + Math.random() * 1.5,
                scaleDelta: isSpark ? -0.4 : 0.8,
                colorFade: true
            });
        }
    }

    /**
     * Spawns smoke trail puff behind engines or wingtips.
     */
    public spawnTrailPuff(position: THREE.Vector3, radius: number = 0.8, colorHex: number = 0xdfe4ea): void {
        const geom = new THREE.DodecahedronGeometry(radius, 0);
        const mat = new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.4
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.copy(position);
        this.scene.add(mesh);

        this.particles.push({
            mesh,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.5, (Math.random() - 0.5) * 2),
            life: 0,
            maxLife: 0.8,
            scaleDelta: 1.2,
            colorFade: true
        });
    }

    public update(dt: number): void {
        if (this.flashLight.intensity > 0) {
            this.flashLight.intensity = Math.max(0, this.flashLight.intensity - dt * 25);
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life += dt;

            // Gravity & Drag on particles
            p.velocity.y -= 9.8 * dt * 0.4;
            p.velocity.multiplyScalar(0.97);
            p.mesh.position.addScaledVector(p.velocity, dt);

            // Expansion & Fade
            const progress = p.life / p.maxLife;
            p.mesh.scale.addScalar(p.scaleDelta * dt);

            const mat = p.mesh.material as THREE.MeshBasicMaterial;
            if (mat && mat.transparent) {
                mat.opacity = Math.max(0, 1.0 - progress);
            }

            if (p.life >= p.maxLife) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                (p.mesh.material as THREE.Material).dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    public clear(): void {
        for (const p of this.particles) {
            this.scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            (p.mesh.material as THREE.Material).dispose();
        }
        this.particles = [];
        this.flashLight.intensity = 0;
    }
}
