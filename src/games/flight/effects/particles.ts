import * as THREE from 'three';

export interface Particle {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    sizeDelta: number;
}

export class FlightParticleSystem {
    private scene: THREE.Scene;
    private particles: Particle[] = [];
    private smokeMat: THREE.MeshBasicMaterial;
    private fireMat: THREE.MeshBasicMaterial;
    private vaporMat: THREE.MeshBasicMaterial;
    private sphereGeo: THREE.SphereGeometry;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.sphereGeo = new THREE.SphereGeometry(1, 6, 6);
        this.smokeMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.6 });
        this.fireMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.9 });
        this.vaporMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    }

    public spawnTouchdownSmoke(pos: THREE.Vector3): void {
        for (let i = 0; i < 8; i++) {
            const mesh = new THREE.Mesh(this.sphereGeo, this.smokeMat.clone());
            mesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 0.2, (Math.random() - 0.5) * 1.5));
            mesh.scale.setScalar(0.8 + Math.random() * 0.8);
            this.scene.add(mesh);

            this.particles.push({
                mesh,
                velocity: new THREE.Vector3((Math.random() - 0.5) * 4, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 4),
                life: 0,
                maxLife: 0.8,
                sizeDelta: 2.5
            });
        }
    }

    public spawnContrails(leftTip: THREE.Vector3, rightTip: THREE.Vector3): void {
        [leftTip, rightTip].forEach(tip => {
            const mesh = new THREE.Mesh(this.sphereGeo, this.vaporMat);
            mesh.position.copy(tip);
            mesh.scale.setScalar(0.4);
            this.scene.add(mesh);

            this.particles.push({
                mesh,
                velocity: new THREE.Vector3(0, 0, 0),
                life: 0,
                maxLife: 1.2,
                sizeDelta: 1.8
            });
        });
    }

    public spawnAfterburnerExhaust(anchors: THREE.Vector3[]): void {
        anchors.forEach(a => {
            const mesh = new THREE.Mesh(this.sphereGeo, this.fireMat);
            mesh.position.copy(a);
            mesh.scale.setScalar(0.7);
            this.scene.add(mesh);

            this.particles.push({
                mesh,
                velocity: new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, -2),
                life: 0,
                maxLife: 0.25,
                sizeDelta: 1.2
            });
        });
    }

    public spawnEngineFire(pos: THREE.Vector3): void {
        const mesh = new THREE.Mesh(this.sphereGeo, Math.random() > 0.4 ? this.fireMat : this.smokeMat);
        mesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, -1));
        mesh.scale.setScalar(0.9);
        this.scene.add(mesh);

        this.particles.push({
            mesh,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 1.5, 2.0 + Math.random() * 2, (Math.random() - 0.5) * 1.5),
            life: 0,
            maxLife: 1.0,
            sizeDelta: 3.0
        });
    }

    public update(delta: number): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life += delta;
            if (p.life >= p.maxLife) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
                continue;
            }

            p.mesh.position.addScaledVector(p.velocity, delta);
            const scale = p.mesh.scale.x + p.sizeDelta * delta;
            p.mesh.scale.setScalar(scale);

            const mat = p.mesh.material as THREE.MeshBasicMaterial;
            if (mat.opacity !== undefined) {
                mat.opacity = (1.0 - (p.life / p.maxLife)) * 0.6;
            }
        }
    }
}
