import * as THREE from 'three';

interface FireParticle {
    mesh: THREE.Mesh;
    baseScale: number;
    speedY: number;
    driftX: number;
    driftZ: number;
    lifetime: number;
    maxLifetime: number;
    isSmoke: boolean;
    initialOffsetY: number;
}

export class FireSystem {
    private scene: THREE.Scene;
    private fireballGroup: THREE.Group;
    private fireballCore: THREE.Mesh;
    private fireballOuter: THREE.Mesh;
    private fireballLight: THREE.PointLight;
    private fireballActive = false;
    private fireballElapsed = 0;
    private fireballScaleMultiplier = 1.0;
    private readonly fireballDuration = 1.0;

    private carFireGroup: THREE.Group;
    private carFireLight: THREE.PointLight;
    private particles: FireParticle[] = [];
    private isBurning = false;
    private targetCarGroup: THREE.Group | null = null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;

        // 1. Fireball blast setup
        this.fireballGroup = new THREE.Group();
        this.fireballGroup.visible = false;

        const coreGeo = new THREE.SphereGeometry(0.7, 16, 16);
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1.0,
            depthWrite: false
        });
        this.fireballCore = new THREE.Mesh(coreGeo, coreMat);

        const outerGeo = new THREE.SphereGeometry(1.2, 16, 16);
        const outerMat = new THREE.MeshBasicMaterial({
            color: 0xff4500,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        this.fireballOuter = new THREE.Mesh(outerGeo, outerMat);

        this.fireballLight = new THREE.PointLight(0xff6600, 4.0, 18);
        this.fireballGroup.add(this.fireballCore, this.fireballOuter, this.fireballLight);
        this.scene.add(this.fireballGroup);

        // 2. Car persistent fire and smoke setup
        this.carFireGroup = new THREE.Group();
        this.carFireGroup.visible = false;

        this.carFireLight = new THREE.PointLight(0xff4500, 2.8, 14);
        this.carFireLight.position.set(0, 0.8, 0.2);
        this.carFireGroup.add(this.carFireLight);

        this.initCarFireParticles();
        this.scene.add(this.carFireGroup);
    }

    private initCarFireParticles(): void {
        const flameColors = [0xffea00, 0xff7700, 0xff3300, 0xff1100, 0xffa500];
        const smokeColors = [0x222222, 0x333333, 0x1a1a1a];

        // 14 fiery flame particles
        for (let i = 0; i < 14; i++) {
            const size = 0.25 + Math.random() * 0.3;
            const geo = new THREE.DodecahedronGeometry(size, 0);
            const color = flameColors[Math.floor(Math.random() * flameColors.length)];
            const mat = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.85,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                (Math.random() - 0.5) * 0.9,
                0.3 + Math.random() * 0.4,
                0.1 + (Math.random() - 0.5) * 0.5
            );
            this.carFireGroup.add(mesh);

            this.particles.push({
                mesh,
                baseScale: size,
                speedY: 1.2 + Math.random() * 1.6,
                driftX: (Math.random() - 0.5) * 0.6,
                driftZ: (Math.random() - 0.5) * 0.6,
                lifetime: Math.random() * 0.8,
                maxLifetime: 0.7 + Math.random() * 0.6,
                isSmoke: false,
                initialOffsetY: mesh.position.y
            });
        }

        // 10 billowing smoke particles
        for (let i = 0; i < 10; i++) {
            const size = 0.35 + Math.random() * 0.4;
            const geo = new THREE.DodecahedronGeometry(size, 0);
            const color = smokeColors[Math.floor(Math.random() * smokeColors.length)];
            const mat = new THREE.MeshStandardMaterial({
                color,
                transparent: true,
                opacity: 0.6,
                roughness: 1.0,
                metalness: 0.0,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                (Math.random() - 0.5) * 0.8,
                0.8 + Math.random() * 0.5,
                0.1 + (Math.random() - 0.5) * 0.5
            );
            this.carFireGroup.add(mesh);

            this.particles.push({
                mesh,
                baseScale: size,
                speedY: 0.9 + Math.random() * 1.2,
                driftX: (Math.random() - 0.5) * 0.5,
                driftZ: (Math.random() - 0.5) * 0.5,
                lifetime: Math.random() * 1.5,
                maxLifetime: 1.2 + Math.random() * 0.8,
                isSmoke: true,
                initialOffsetY: mesh.position.y
            });
        }
    }

    /**
     * Trigger fireball explosion blast
     * @param position Explosion location
     * @param scaleMultiplier Size multiplier (e.g. 2.0x for mid-air jump crash into building)
     */
    public triggerFireball(position: THREE.Vector3, scaleMultiplier: number = 1.0): void {
        this.fireballScaleMultiplier = scaleMultiplier;
        this.fireballGroup.position.copy(position);
        this.fireballGroup.position.y += 0.6;
        this.fireballGroup.visible = true;
        this.fireballActive = true;
        this.fireballElapsed = 0;

        const baseCore = 0.6 * scaleMultiplier;
        const baseOuter = 0.8 * scaleMultiplier;
        this.fireballCore.scale.set(baseCore, baseCore, baseCore);
        this.fireballOuter.scale.set(baseOuter, baseOuter, baseOuter);
        (this.fireballCore.material as THREE.MeshBasicMaterial).opacity = 1.0;
        (this.fireballOuter.material as THREE.MeshBasicMaterial).opacity = 0.95;
        this.fireballLight.intensity = 5.0 * scaleMultiplier;
        this.fireballLight.distance = 18 * scaleMultiplier;
    }

    public startCarFire(carGroup: THREE.Group): void {
        this.targetCarGroup = carGroup;
        this.isBurning = true;
        this.carFireGroup.visible = true;
        this.updateCarFirePosition();
    }

    private updateCarFirePosition(): void {
        if (!this.targetCarGroup) return;
        this.carFireGroup.position.copy(this.targetCarGroup.position);
        this.carFireGroup.rotation.y = this.targetCarGroup.rotation.y;
    }

    public update(delta: number): void {
        const dt = Math.min(delta, 0.1);

        // 1. Update expanding fireball blast
        if (this.fireballActive) {
            this.fireballElapsed += dt;
            const progress = this.fireballElapsed / this.fireballDuration;

            if (progress >= 1.0) {
                this.fireballActive = false;
                this.fireballGroup.visible = false;
            } else {
                // Expanding scale with ease out, multiplied by scaleMultiplier (e.g. 2x)
                const scale = (0.6 + Math.sin(progress * Math.PI * 0.5) * 2.4) * this.fireballScaleMultiplier;
                this.fireballCore.scale.set(scale * 0.6, scale * 0.6, scale * 0.6);
                this.fireballOuter.scale.set(scale, scale, scale);

                // Fade out
                const fade = 1.0 - progress;
                (this.fireballCore.material as THREE.MeshBasicMaterial).opacity = Math.max(0, fade * 1.0);
                (this.fireballOuter.material as THREE.MeshBasicMaterial).opacity = Math.max(0, fade * 0.9);
                this.fireballLight.intensity = Math.max(0, fade * 5.0 * this.fireballScaleMultiplier);
            }
        }

        // 2. Update persistent car fire & billowing smoke
        if (this.isBurning) {
            this.updateCarFirePosition();

            // Flickering firelight
            const flicker = Math.sin(Date.now() * 0.02) * 0.5 + Math.random() * 0.4;
            this.carFireLight.intensity = 2.4 + flicker;

            for (const p of this.particles) {
                p.lifetime += dt;
                const lifeRatio = p.lifetime / p.maxLifetime;

                if (lifeRatio >= 1.0) {
                    // Respawn at bottom
                    p.lifetime = 0;
                    p.mesh.position.y = p.initialOffsetY;
                    p.mesh.position.x = (Math.random() - 0.5) * 0.8;
                    p.mesh.position.z = 0.1 + (Math.random() - 0.5) * 0.5;
                } else {
                    // Rise and drift
                    p.mesh.position.y += p.speedY * dt;
                    p.mesh.position.x += p.driftX * dt;
                    p.mesh.position.z += p.driftZ * dt;

                    if (!p.isSmoke) {
                        // Flames shrink as they rise
                        const scale = p.baseScale * (1.0 - lifeRatio * 0.7);
                        p.mesh.scale.set(scale, scale * 1.3, scale);
                        (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1.0 - lifeRatio * 0.6);
                    } else {
                        // Smoke expands as it billows upward
                        const scale = p.baseScale * (1.0 + lifeRatio * 1.5);
                        p.mesh.scale.set(scale, scale, scale);
                        (p.mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.6 * (1.0 - lifeRatio));
                    }
                }
            }
        }
    }

    public extinguish(): void {
        this.isBurning = false;
        this.targetCarGroup = null;
        this.carFireGroup.visible = false;
        this.fireballActive = false;
        this.fireballGroup.visible = false;
        this.fireballScaleMultiplier = 1.0;

        // Reset particle positions
        for (const p of this.particles) {
            p.lifetime = 0;
            p.mesh.position.y = p.initialOffsetY;
            p.mesh.scale.set(p.baseScale, p.baseScale, p.baseScale);
        }
    }

    public clear(): void {
        this.extinguish();
    }

    public isCarBurning(): boolean {
        return this.isBurning;
    }

    public hasActiveFireball(): boolean {
        return this.fireballActive;
    }

    public getActiveFlameCount(): number {
        return this.isBurning ? this.particles.length : 0;
    }

    public getFireballScale(): number {
        return this.fireballScaleMultiplier;
    }
}
