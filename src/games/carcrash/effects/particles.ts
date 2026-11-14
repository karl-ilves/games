import * as THREE from 'three';

export interface CrashParticle {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    color: THREE.Color;
    size: number;
    alpha: number;
    life: number;
    maxLife: number;
    type: 'spark' | 'smoke' | 'debris' | 'glass' | 'fire';
}

export class CrashParticleSystem {
    private particles: CrashParticle[] = [];
    private points: THREE.Points;
    private geometry: THREE.BufferGeometry;
    private maxParticles = 1200;
    private posArray: Float32Array;
    private colorArray: Float32Array;

    constructor(scene: THREE.Scene) {
        this.posArray = new Float32Array(this.maxParticles * 3);
        this.colorArray = new Float32Array(this.maxParticles * 3);

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.posArray, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colorArray, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.45,
            vertexColors: true,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending
        });

        this.points = new THREE.Points(this.geometry, mat);
        scene.add(this.points);
    }

    public emitImpactBurst(origin: THREE.Vector3, intensity: number, impactSpeedKmh: number = 50): void {
        const speedScale = Math.min(2.5, Math.max(0.3, impactSpeedKmh / 40.0));
        const count = Math.min(180, Math.floor((15 + intensity * 3.5) * speedScale));

        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) break;

            const rand = Math.random();
            let type: CrashParticle['type'] = 'spark';
            let pColor = new THREE.Color(0xffbb00);
            let size = 0.25;
            let speed = (8 + Math.random() * 14) * speedScale;
            let maxLife = 0.4 + Math.random() * 0.5;

            if (rand < 0.45) {
                // Hot sparks
                type = 'spark';
                pColor = new THREE.Color(Math.random() > 0.5 ? 0xffcc00 : 0xff5500);
                speed = (10 + Math.random() * 18) * speedScale;
                size = 0.22;
                maxLife = 0.3 + Math.random() * 0.4;
            } else if (rand < 0.7) {
                // Metal and plastic debris pieces
                type = 'debris';
                pColor = new THREE.Color(Math.random() > 0.5 ? 0x444444 : 0x888888);
                speed = (6 + Math.random() * 12) * speedScale;
                size = 0.4;
                maxLife = 0.6 + Math.random() * 0.7;
            } else if (rand < 0.85 && impactSpeedKmh >= 35) {
                // Shattered glass shards
                type = 'glass';
                pColor = new THREE.Color(0x99ddff);
                speed = (7 + Math.random() * 14) * speedScale;
                size = 0.28;
                maxLife = 0.5 + Math.random() * 0.5;
            } else {
                // Dark collision smoke
                type = 'smoke';
                pColor = new THREE.Color(0x333333);
                speed = (3 + Math.random() * 5) * speedScale;
                size = 0.65;
                maxLife = 0.8 + Math.random() * 1.0;
            }

            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 1.8 + 0.3,
                (Math.random() - 0.5) * 2
            ).normalize().multiplyScalar(speed);

            this.particles.push({
                position: origin.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.5)),
                velocity: vel,
                color: pColor,
                size,
                alpha: 1.0,
                life: 0,
                maxLife,
                type
            });
        }
    }

    public emitContinuousDamageSmoke(enginePos: THREE.Vector3, damagePct: number): void {
        if (damagePct < 30 || this.particles.length >= this.maxParticles) return;

        // Radiator smoke
        const smokeCount = damagePct > 70 ? 3 : 1;
        for (let i = 0; i < smokeCount; i++) {
            const isFire = damagePct > 65 && Math.random() > 0.4;
            const pColor = isFire
                ? new THREE.Color(Math.random() > 0.5 ? 0xff4500 : 0xffaa00)
                : new THREE.Color(damagePct > 70 ? 0x222222 : 0x777777);

            this.particles.push({
                position: enginePos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.2, (Math.random() - 0.5) * 0.4)),
                velocity: new THREE.Vector3((Math.random() - 0.5) * 0.8, 1.8 + Math.random() * 1.5, (Math.random() - 0.5) * 0.8),
                color: pColor,
                size: isFire ? 0.35 : 0.6,
                alpha: 0.9,
                life: 0,
                maxLife: isFire ? 0.35 : 1.2,
                type: isFire ? 'fire' : 'smoke'
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

            if (p.type === 'spark' || p.type === 'debris' || p.type === 'glass') {
                p.velocity.y -= 26.0 * dt; // Gravity
                if (p.position.y < 0.1) {
                    p.position.y = 0.1;
                    p.velocity.y *= -0.35; // Bounce off ground
                    p.velocity.x *= 0.75;
                    p.velocity.z *= 0.75;
                }
            } else if (p.type === 'fire') {
                p.position.y += 1.8 * dt;
                p.velocity.multiplyScalar(0.92);
            } else {
                p.velocity.multiplyScalar(0.94);
                p.position.y += 1.5 * dt; // Smoke rises
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
