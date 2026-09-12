import * as THREE from 'three';

interface Particle {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    scaleDelta: number;
    colorFade: boolean;
    isSmoke?: boolean;
}

interface Shockwave {
    mesh: THREE.Mesh;
    growthRate: number;
    life: number;
    maxLife: number;
}

export class ParticleSystem {
    private scene: THREE.Scene;
    private particles: Particle[] = [];
    private shockwaves: Shockwave[] = [];
    private flashLight: THREE.PointLight;
    private scorchDecals: THREE.Mesh[] = [];

    constructor(scene: THREE.Scene) {
        this.scene = scene;

        this.flashLight = new THREE.PointLight(0xff9f43, 0, 250);
        this.scene.add(this.flashLight);
    }

    /**
     * Ultra-realistic multi-phase crash explosion:
     * - Blinding white-hot flash
     * - Expanding spherical shockwave ring
     * - Multi-layered rolling fireballs (white/yellow/orange/crimson)
     * - Swarm of high-velocity burning sparks/shrapnel
     * - Dense rising smoke column
     * - Ground scorch mark decal
     */
    public spawnCrashExplosion(position: THREE.Vector3, scale: number = 1.0, isWater: boolean = false): void {
        // 1. Point Light Flash
        this.flashLight.position.copy(position);
        this.flashLight.intensity = (isWater ? 18 : 28) * scale;
        this.flashLight.distance = 350 * scale;

        // 2. Shockwave Ring along the surface
        const ringGeom = new THREE.RingGeometry(1, 4, 32);
        ringGeom.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
            color: isWater ? 0x00d2d3 : 0xffa502,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        const shockwaveMesh = new THREE.Mesh(ringGeom, ringMat);
        shockwaveMesh.position.copy(position);
        shockwaveMesh.position.y = Math.max(1.8, position.y);
        this.scene.add(shockwaveMesh);

        this.shockwaves.push({
            mesh: shockwaveMesh,
            growthRate: 140 * scale,
            life: 0,
            maxLife: 0.9
        });

        // 3. Ground Scorch Mark (if on land)
        if (!isWater && position.y < 30) {
            const scorchGeom = new THREE.CircleGeometry(12 * scale, 24);
            scorchGeom.rotateX(-Math.PI / 2);
            const scorchMat = new THREE.MeshBasicMaterial({
                color: 0x111111,
                transparent: true,
                opacity: 0.85,
                depthWrite: false
            });
            const scorch = new THREE.Mesh(scorchGeom, scorchMat);
            scorch.position.set(position.x, 1.6, position.z);
            this.scene.add(scorch);
            this.scorchDecals.push(scorch);
        }

        // 4. Fireballs, Shrapnel & Water Geyser Plumes
        if (isWater) {
            // Massive vertical water splash & foam geysers
            const waterColors = [0xffffff, 0xc8d6e5, 0x00cec9, 0x81ecec];
            const splashCount = Math.floor(60 * scale);
            for (let i = 0; i < splashCount; i++) {
                const geom = new THREE.SphereGeometry((1.2 + Math.random() * 2.0) * scale, 6, 6);
                const mat = new THREE.MeshBasicMaterial({
                    color: waterColors[Math.floor(Math.random() * waterColors.length)],
                    transparent: true,
                    opacity: 0.85
                });
                const mesh = new THREE.Mesh(geom, mat);
                mesh.position.copy(position);

                const upVel = 45 + Math.random() * 55;
                const spread = (Math.random() - 0.5) * 35;
                const vel = new THREE.Vector3(spread, upVel, spread);

                this.scene.add(mesh);
                this.particles.push({
                    mesh,
                    velocity: vel,
                    life: 0,
                    maxLife: 2.2 + Math.random() * 1.0,
                    scaleDelta: 0.5,
                    colorFade: true
                });
            }
        } else {
            // Land impact: Fireballs, dark rolling smoke, sparks
            const fireColors = [0xffffff, 0xfff200, 0xffa502, 0xff4757, 0xee5253, 0x2f3542];
            const count = Math.floor(65 * scale);

            for (let i = 0; i < count; i++) {
                const isSpark = Math.random() < 0.4;
                const isSmoke = !isSpark && Math.random() < 0.45;

                const geom = isSpark
                    ? new THREE.SphereGeometry(0.4 * scale, 6, 6)
                    : new THREE.DodecahedronGeometry((2.0 + Math.random() * 3.5) * scale);

                let color = fireColors[Math.floor(Math.random() * fireColors.length)];
                if (isSmoke) color = 0x1e272e;
                else if (isSpark) color = Math.random() < 0.5 ? 0xfff200 : 0xff781e;

                const mat = new THREE.MeshBasicMaterial({
                    color,
                    transparent: true,
                    opacity: isSmoke ? 0.75 : 0.95
                });

                const mesh = new THREE.Mesh(geom, mat);
                mesh.position.copy(position);
                mesh.position.x += (Math.random() - 0.5) * 6;
                mesh.position.y += (Math.random() - 0.5) * 6;
                mesh.position.z += (Math.random() - 0.5) * 6;

                const speed = (isSpark ? 65 : 32) * (0.6 + Math.random() * 1.2) * scale;
                const dir = new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    Math.random() * 1.8 + (isSmoke ? 1.0 : 0.2),
                    (Math.random() - 0.5) * 2
                ).normalize();

                this.scene.add(mesh);
                this.particles.push({
                    mesh,
                    velocity: dir.multiplyScalar(speed),
                    life: 0,
                    maxLife: isSpark ? 2.0 : (isSmoke ? 3.8 : 2.6),
                    scaleDelta: isSpark ? -0.3 : (isSmoke ? 2.0 : 1.2),
                    colorFade: true,
                    isSmoke
                });
            }
        }
    }

    /**
     * Emits realistic burning smoke and sparks behind a fast tumbling debris piece.
     */
    public spawnDebrisTrail(position: THREE.Vector3, isGrounded: boolean): void {
        const isSpark = Math.random() < (isGrounded ? 0.7 : 0.35);
        const geom = isSpark
            ? new THREE.SphereGeometry(0.3, 4, 4)
            : new THREE.DodecahedronGeometry(1.1);

        const mat = new THREE.MeshBasicMaterial({
            color: isSpark ? 0xff9f43 : 0x2f3542,
            transparent: true,
            opacity: isSpark ? 0.9 : 0.5
        });

        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.copy(position);
        this.scene.add(mesh);

        const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            isSpark ? Math.random() * 6 + 2 : Math.random() * 3 + 1,
            (Math.random() - 0.5) * 4
        );

        this.particles.push({
            mesh,
            velocity: vel,
            life: 0,
            maxLife: isSpark ? 0.6 : 1.6,
            scaleDelta: isSpark ? -0.2 : 0.9,
            colorFade: true
        });
    }

    /**
     * Spawns smoke trail puff behind engines or wingtips during normal flight.
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
        // Light flash decay
        if (this.flashLight.intensity > 0) {
            this.flashLight.intensity = Math.max(0, this.flashLight.intensity - dt * 35);
        }

        // Shockwaves expansion & fade
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.life += dt;
            const progress = sw.life / sw.maxLife;

            sw.mesh.scale.addScalar(sw.growthRate * dt);
            const mat = sw.mesh.material as THREE.MeshBasicMaterial;
            if (mat) {
                mat.opacity = Math.max(0, (1.0 - progress) * 0.9);
            }

            if (sw.life >= sw.maxLife) {
                this.scene.remove(sw.mesh);
                sw.mesh.geometry.dispose();
                (sw.mesh.material as THREE.Material).dispose();
                this.shockwaves.splice(i, 1);
            }
        }

        // Particles physics & life
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life += dt;

            // Smoke rises, sparks fall
            if (p.isSmoke) {
                p.velocity.y += 4.5 * dt; // Thermal buoyancy
                p.velocity.x += (Math.random() - 0.5) * 2 * dt;
                p.velocity.z += (Math.random() - 0.5) * 2 * dt;
            } else {
                p.velocity.y -= 16.0 * dt; // Gravity on fire/sparks
            }

            p.velocity.multiplyScalar(0.96); // Drag
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

        for (const sw of this.shockwaves) {
            this.scene.remove(sw.mesh);
            sw.mesh.geometry.dispose();
            (sw.mesh.material as THREE.Material).dispose();
        }
        this.shockwaves = [];

        for (const s of this.scorchDecals) {
            this.scene.remove(s);
            s.geometry.dispose();
            (s.material as THREE.Material).dispose();
        }
        this.scorchDecals = [];

        this.flashLight.intensity = 0;
    }
}
