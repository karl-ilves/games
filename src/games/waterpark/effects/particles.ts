import * as THREE from 'three';

export class SplashParticles {
    private scene: THREE.Scene;
    private particleGroup: THREE.Group;
    private particles: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = [];

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.particleGroup = new THREE.Group();
        this.scene.add(this.particleGroup);
    }

    public createSplash(x: number, y: number, z: number, count: number = 18) {
        const pGeo = new THREE.SphereGeometry(0.12, 6, 6);
        const pMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.85 });

        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(pGeo, pMat);
            mesh.position.set(x, y, z);
            this.particleGroup.add(mesh);

            const angle = Math.random() * Math.PI * 2;
            const speed = 2.0 + Math.random() * 4.0;
            const vel = new THREE.Vector3(
                Math.cos(angle) * speed,
                3.5 + Math.random() * 4.5,
                Math.sin(angle) * speed
            );

            this.particles.push({ mesh, vel, life: 1.0 });
        }
    }

    public update(delta: number) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= delta * 1.5;
            p.vel.y -= 9.8 * delta; // Gravity

            p.mesh.position.x += p.vel.x * delta;
            p.mesh.position.y += p.vel.y * delta;
            p.mesh.position.z += p.vel.z * delta;

            if (p.life <= 0 || p.mesh.position.y < 0.2) {
                this.particleGroup.remove(p.mesh);
                this.particles.splice(i, 1);
            }
        }
    }
}
