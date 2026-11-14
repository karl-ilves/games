import * as THREE from 'three';

export interface CrashParticle {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    color: THREE.Color;
    size: number;
    alpha: number;
    life: number;
    maxLife: number;
    type: 'spark' | 'smoke' | 'debris';
}

export class CrashParticleSystem {
    private particles: CrashParticle[] = [];
    private points: THREE.Points;
    private geometry: THREE.BufferGeometry;
    private maxParticles = 600;
    private posArray: Float32Array;
    private colorArray: Float32Array;

    constructor(scene: THREE.Scene) {
        this.posArray = new Float32Array(this.maxParticles * 3);
        this.colorArray = new Float32Array(this.maxParticles * 3);

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.posArray, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colorArray, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.35,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });

        this.points = new THREE.Points(this.geometry, mat);
        scene.add(this.points);
    }

    public emitImpactBurst(origin: THREE.Vector3, intensity: number): void {
        const count = Math.min(80, Math.floor(20 + intensity * 2.5));
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) break;

            const isSpark = Math.random() > 0.3;
            const speed = (isSpark ? 12 : 5) * (0.5 + Math.random() * intensity * 0.1);
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 1.5 + 0.2,
                (Math.random() - 0.5) * 2
            ).normalize().multiplyScalar(speed);

            this.particles.push({
                position: origin.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.6)),
                velocity: vel,
                color: isSpark ? new THREE.Color(0xffd700) : new THREE.Color(0x718093),
                size: isSpark ? 0.2 : 0.5,
                alpha: 1.0,
                life: 0,
                maxLife: isSpark ? 0.4 + Math.random() * 0.4 : 1.0 + Math.random() * 0.8,
                type: isSpark ? 'spark' : 'smoke'
            });
        }
    }

    public update(dt: number): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life += dt;
            if (p.life >= p.maxLife) {
                this.particles.splice(i, 1);
                continue;
            }

            p.position.addScaledVector(p.velocity, dt);
            if (p.type === 'spark') {
                p.velocity.y -= 25.0 * dt; // Gravity on sparks
            } else {
                p.velocity.multiplyScalar(0.94);
                p.position.y += 1.2 * dt; // Smoke rises
            }
        }

        const count = Math.min(this.particles.length, this.maxParticles);
        for (let i = 0; i < count; i++) {
            const p = this.particles[i];
            this.posArray[i * 3] = p.position.x;
            this.posArray[i * 3 + 1] = p.position.y;
            this.posArray[i * 3 + 2] = p.position.z;

            const fade = 1 - (p.life / p.maxLife);
            this.colorArray[i * 3] = p.color.r * fade;
            this.colorArray[i * 3 + 1] = p.color.g * fade;
            this.colorArray[i * 3 + 2] = p.color.b * fade;
        }

        // Hide inactive points
        for (let i = count; i < this.maxParticles; i++) {
            this.posArray[i * 3 + 1] = -9999;
        }

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
    }
}
