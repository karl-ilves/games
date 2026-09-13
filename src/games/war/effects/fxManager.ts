import * as THREE from 'three';
import { Team, Shockwave, Particle, ExplosiveBarrel, CombatUnit } from '../types';
import { warAudio } from '../audio';

export class FxManager {
    private scene: THREE.Scene;
    public shockwaves: Shockwave[] = [];
    public particles: Particle[] = [];

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public spawnCrashParticle(pos: THREE.Vector3) {
        const isFire = Math.random() < 0.45;
        const pGeo = new THREE.SphereGeometry(isFire ? 0.8 : 1.4, 6, 6);
        const pMat = new THREE.MeshBasicMaterial({
            color: isFire ? (Math.random() < 0.5 ? 0xff4757 : 0xffa502) : 0x1e272e,
            transparent: true,
            opacity: 0.85
        });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 2));
        this.scene.add(pMesh);

        this.particles.push({
            mesh: pMesh,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 6 + 2, (Math.random() - 0.5) * 6),
            life: 0.85,
            maxLife: 0.85,
            sizeStart: isFire ? 0.9 : 1.5,
            sizeEnd: isFire ? 0.2 : 3.0
        });
    }

    public triggerSpreadingExplosion(
        epicenter: THREE.Vector3,
        maxRadius: number,
        baseDamage: number,
        shooterId: string,
        shooterName: string,
        team: Team,
        units: Map<string, CombatUnit>,
        barrels: ExplosiveBarrel[],
        onDamageUnit: (unit: CombatUnit, damage: number, shooterId: string, shooterName: string, team: Team) => void
    ) {
        warAudio.playExplosion();

        // 1. Dynamic Flash Point Light
        const flashLight = new THREE.PointLight(0xffa502, 12, Math.max(30, maxRadius * 2.5));
        flashLight.position.copy(epicenter).add(new THREE.Vector3(0, 3.5, 0));
        this.scene.add(flashLight);
        let flashLife = 0.22;
        const fadeLight = () => {
            flashLife -= 0.04;
            if (flashLife > 0) {
                flashLight.intensity = (flashLife / 0.22) * 12;
                setTimeout(fadeLight, 40);
            } else {
                this.scene.remove(flashLight);
            }
        };
        setTimeout(fadeLight, 40);

        // 2. Ground Charred Crater Decal
        const craterGeo = new THREE.RingGeometry(0.1, Math.min(7.5, maxRadius * 0.42), 24);
        const craterMat = new THREE.MeshBasicMaterial({
            color: 0x090d10,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.75
        });
        const crater = new THREE.Mesh(craterGeo, craterMat);
        crater.position.copy(epicenter);
        crater.position.y = 0.08;
        crater.rotation.x = -Math.PI / 2;
        this.scene.add(crater);
        setTimeout(() => {
            let op = 0.75;
            const fadeCrater = setInterval(() => {
                op -= 0.05;
                if (op <= 0) {
                    clearInterval(fadeCrater);
                    this.scene.remove(crater);
                } else {
                    craterMat.opacity = op;
                }
            }, 500);
        }, 12000);

        // 3. Immediate direct blast damage to all enemy units caught in epicenter radius
        units.forEach(unit => {
            if (!unit.isDead && unit.team !== team) {
                const dx = unit.pos.x - epicenter.x;
                const dz = unit.pos.z - epicenter.z;
                const hDist = Math.sqrt(dx * dx + dz * dz);
                if (hDist <= maxRadius) {
                    const falloff = Math.max(0.4, 1.0 - (hDist / maxRadius));
                    const actualDmg = Math.round(baseDamage * falloff);
                    onDamageUnit(unit, actualDmg, shooterId, shooterName, team);
                }
            }
        });

        // 4. Expanding Blast Shockwaves (Primary High-Velocity Ring + Dust Wavefront)
        const ringGeo = new THREE.RingGeometry(0.2, 1.4, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: team === 'red' ? 0xff4757 : 0xffa502,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95
        });
        const shockwaveMesh = new THREE.Mesh(ringGeo, ringMat);
        shockwaveMesh.position.copy(epicenter);
        shockwaveMesh.position.y = 0.25;
        shockwaveMesh.rotation.x = -Math.PI / 2;
        this.scene.add(shockwaveMesh);

        this.shockwaves.push({
            mesh: shockwaveMesh,
            currentRadius: 1.0,
            maxRadius,
            expansionSpeed: 34.0,
            life: 0.65,
            maxLife: 0.65,
            damage: baseDamage,
            shooterId,
            shooterName,
            team,
            epicenter: epicenter.clone(),
            damagedUnits: new Set()
        });

        // Dust Wavefront Ring
        const dustGeo = new THREE.RingGeometry(0.2, 1.8, 32);
        const dustMat = new THREE.MeshBasicMaterial({
            color: 0x7f8c8d,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.55
        });
        const dustMesh = new THREE.Mesh(dustGeo, dustMat);
        dustMesh.position.copy(epicenter);
        dustMesh.position.y = 0.18;
        dustMesh.rotation.x = -Math.PI / 2;
        this.scene.add(dustMesh);

        this.shockwaves.push({
            mesh: dustMesh,
            currentRadius: 0.8,
            maxRadius: maxRadius * 1.15,
            expansionSpeed: 24.0,
            life: 0.85,
            maxLife: 0.85,
            damage: 0,
            shooterId,
            shooterName,
            team,
            epicenter: epicenter.clone(),
            damagedUnits: new Set()
        });

        // 5. White-Hot Core Fireball Mushroom
        for (let i = 0; i < 14; i++) {
            const size = 1.2 + Math.random() * 1.6;
            const geo = new THREE.IcosahedronGeometry(size, 1);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xfff3a0,
                transparent: true,
                opacity: 0.95
            });
            const pMesh = new THREE.Mesh(geo, mat);
            pMesh.position.copy(epicenter).add(new THREE.Vector3((Math.random() - 0.5) * 1.2, Math.random() * 1.0 + 0.3, (Math.random() - 0.5) * 1.2));
            this.scene.add(pMesh);

            const upwardVel = new THREE.Vector3(
                (Math.random() - 0.5) * 6,
                Math.random() * 9 + 6,
                (Math.random() - 0.5) * 6
            );
            this.particles.push({
                mesh: pMesh,
                velocity: upwardVel,
                life: 0.6 + Math.random() * 0.35,
                maxLife: 0.95,
                sizeStart: size,
                sizeEnd: size * 2.8,
                drag: 1.8,
                startColor: new THREE.Color(0xfff3a0),
                endColor: new THREE.Color(0xd63031),
                rotSpeed: new THREE.Vector3(Math.random() * 4, Math.random() * 4, Math.random() * 4)
            });
        }

        // 6. Fiery Outward Blast Jets
        for (let i = 0; i < 24; i++) {
            const size = 0.5 + Math.random() * 0.9;
            const geo = new THREE.DodecahedronGeometry(size);
            const mat = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.4 ? 0xff4757 : 0xffa502,
                transparent: true,
                opacity: 0.9
            });
            const pMesh = new THREE.Mesh(geo, mat);
            pMesh.position.copy(epicenter);

            const speed = 12 + Math.random() * 26;
            const dir = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.4 + 0.2, (Math.random() - 0.5) * 2).normalize();

            this.scene.add(pMesh);
            this.particles.push({
                mesh: pMesh,
                velocity: dir.multiplyScalar(speed),
                life: 0.6 + Math.random() * 0.4,
                maxLife: 0.6 + Math.random() * 0.4,
                sizeStart: size,
                sizeEnd: 0.1,
                drag: 2.5,
                gravity: 12.0,
                startColor: new THREE.Color(0xffa502),
                endColor: new THREE.Color(0xeb2f06)
            });
        }

        // 7. Dense Black Billowing Smoke Columns
        for (let i = 0; i < 20; i++) {
            const size = 1.0 + Math.random() * 1.5;
            const geo = new THREE.SphereGeometry(size, 7, 7);
            const mat = new THREE.MeshBasicMaterial({
                color: 0x1e272e,
                transparent: true,
                opacity: 0.8
            });
            const pMesh = new THREE.Mesh(geo, mat);
            pMesh.position.copy(epicenter).add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.5 + 0.5, (Math.random() - 0.5) * 2));

            const smokeVel = new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                Math.random() * 6 + 3,
                (Math.random() - 0.5) * 4
            );

            this.scene.add(pMesh);
            this.particles.push({
                mesh: pMesh,
                velocity: smokeVel,
                life: 1.4 + Math.random() * 0.9,
                maxLife: 2.3,
                sizeStart: size,
                sizeEnd: size * 4.5,
                drag: 0.8,
                startColor: new THREE.Color(0x2d3436),
                endColor: new THREE.Color(0x0a0d10)
            });
        }

        // 8. Hot Flying Metal Shrapnel Sparks
        for (let i = 0; i < 18; i++) {
            const sparkGeo = new THREE.BoxGeometry(0.15, 0.15, 0.4);
            const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfffa65 });
            const sparkMesh = new THREE.Mesh(sparkGeo, sparkMat);
            sparkMesh.position.copy(epicenter).add(new THREE.Vector3(0, 0.5, 0));

            const sparkDir = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.8 + 0.5, (Math.random() - 0.5) * 2).normalize();
            const sparkSpeed = 20 + Math.random() * 24;

            this.scene.add(sparkMesh);
            this.particles.push({
                mesh: sparkMesh,
                velocity: sparkDir.multiplyScalar(sparkSpeed),
                life: 0.8 + Math.random() * 0.5,
                maxLife: 1.3,
                sizeStart: 1.0,
                sizeEnd: 0.2,
                gravity: 24.0,
                drag: 0.9,
                rotSpeed: new THREE.Vector3(15, 12, 10),
                startColor: new THREE.Color(0xfffa65),
                endColor: new THREE.Color(0xff4757)
            });
        }

        // 9. Chain Reaction on Barrels
        barrels.forEach(barrel => {
            if (!barrel.isExploded && barrel.pos.distanceTo(epicenter) < maxRadius + 2.0) {
                barrel.isExploded = true;
                this.scene.remove(barrel.mesh);
                setTimeout(() => {
                    this.triggerSpreadingExplosion(barrel.pos, 16.0, 75, shooterId, shooterName, team, units, barrels, onDamageUnit);
                }, 120 + Math.random() * 180);
            }
        });
    }

    public triggerNuclearExplosion(
        epicenter: THREE.Vector3,
        shooterId: string,
        shooterName: string,
        team: Team,
        units: Map<string, CombatUnit>,
        onDamageUnit: (unit: CombatUnit, damage: number, shooterId: string, shooterName: string, team: Team) => void,
        onShakeCamera?: () => void
    ) {
        warAudio.playNuclearBlast();
        const nukeRadius = 120.0;

        // 1. Immediate massive nuclear vaporization for all enemy units in radius
        units.forEach(unit => {
            if (!unit.isDead && unit.team !== team) {
                const dx = unit.pos.x - epicenter.x;
                const dz = unit.pos.z - epicenter.z;
                const hDist = Math.sqrt(dx * dx + dz * dz);
                if (hDist <= nukeRadius) {
                    onDamageUnit(unit, 1000, shooterId, shooterName, team);
                }
            }
        });

        // 2. Blinding Thermonuclear Flash Light
        const flashLight = new THREE.PointLight(0xfff3a0, 40, 320);
        flashLight.position.copy(epicenter).add(new THREE.Vector3(0, 10, 0));
        this.scene.add(flashLight);
        let flashLife = 0.55;
        const fadeLight = () => {
            flashLife -= 0.04;
            if (flashLife > 0) {
                flashLight.intensity = (flashLife / 0.55) * 40;
                setTimeout(fadeLight, 40);
            } else {
                this.scene.remove(flashLight);
            }
        };
        setTimeout(fadeLight, 40);

        // 3. Colossal Scorch Crater
        const craterGeo = new THREE.RingGeometry(0.5, 48.0, 32);
        const craterMat = new THREE.MeshBasicMaterial({
            color: 0x05080a,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
        const crater = new THREE.Mesh(craterGeo, craterMat);
        crater.position.copy(epicenter);
        crater.position.y = 0.09;
        crater.rotation.x = -Math.PI / 2;
        this.scene.add(crater);

        // 4. Massive Dual High-Velocity Blast Shockwaves
        const ringGeo = new THREE.RingGeometry(0.5, 3.5, 48);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xff4757,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95
        });
        const shockMesh = new THREE.Mesh(ringGeo, ringMat);
        shockMesh.position.copy(epicenter);
        shockMesh.position.y = 0.3;
        shockMesh.rotation.x = -Math.PI / 2;
        this.scene.add(shockMesh);

        this.shockwaves.push({
            mesh: shockMesh,
            currentRadius: 2.0,
            maxRadius: nukeRadius,
            expansionSpeed: 52.0,
            life: 2.0,
            maxLife: 2.0,
            damage: 1000,
            shooterId,
            shooterName,
            team,
            epicenter: epicenter.clone(),
            damagedUnits: new Set()
        });

        // Dust Seismic Wavefront
        const dustGeo = new THREE.RingGeometry(0.5, 5.0, 48);
        const dustMat = new THREE.MeshBasicMaterial({
            color: 0x57606f,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.75
        });
        const dustMesh = new THREE.Mesh(dustGeo, dustMat);
        dustMesh.position.copy(epicenter);
        dustMesh.position.y = 0.22;
        dustMesh.rotation.x = -Math.PI / 2;
        this.scene.add(dustMesh);

        this.shockwaves.push({
            mesh: dustMesh,
            currentRadius: 1.5,
            maxRadius: nukeRadius * 1.3,
            expansionSpeed: 38.0,
            life: 2.2,
            maxLife: 2.2,
            damage: 0,
            shooterId,
            shooterName,
            team,
            epicenter: epicenter.clone(),
            damagedUnits: new Set()
        });

        // 5. Towering Nuclear Mushroom Cloud Stem
        for (let y = 2; y <= 55; y += 4) {
            const pGeo = new THREE.SphereGeometry(3.0 + (y * 0.1), 8, 8);
            const pMat = new THREE.MeshBasicMaterial({
                color: y < 20 ? 0xff4757 : 0x2f3542,
                transparent: true,
                opacity: 0.85
            });
            const pMesh = new THREE.Mesh(pGeo, pMat);
            pMesh.position.copy(epicenter).add(new THREE.Vector3((Math.random() - 0.5) * 4, y, (Math.random() - 0.5) * 4));
            this.scene.add(pMesh);

            this.particles.push({
                mesh: pMesh,
                velocity: new THREE.Vector3((Math.random() - 0.5) * 2, 8.0, (Math.random() - 0.5) * 2),
                life: 3.5,
                maxLife: 3.5,
                sizeStart: 3.0,
                sizeEnd: 8.5,
                drag: 0.5,
                startColor: new THREE.Color(y < 20 ? 0xfff3a0 : 0xeb2f06),
                endColor: new THREE.Color(0x0f1416)
            });
        }

        // 6. Huge Boiling Mushroom Cloud Top / Cap
        for (let i = 0; i < 40; i++) {
            const angle = (i / 40) * Math.PI * 2;
            const dist = 6 + Math.random() * 22;
            const capY = 52 + Math.random() * 16;
            const pGeo = new THREE.IcosahedronGeometry(4.5 + Math.random() * 3.5, 1);
            const pMat = new THREE.MeshBasicMaterial({
                color: Math.random() < 0.4 ? 0xff4757 : 0x1e272e,
                transparent: true,
                opacity: 0.9
            });
            const pMesh = new THREE.Mesh(pGeo, pMat);
            pMesh.position.copy(epicenter).add(new THREE.Vector3(Math.cos(angle) * dist, capY, Math.sin(angle) * dist));
            this.scene.add(pMesh);

            const outward = new THREE.Vector3(Math.cos(angle), (Math.random() - 0.3) * 0.5, Math.sin(angle)).normalize();
            this.particles.push({
                mesh: pMesh,
                velocity: outward.multiplyScalar(8 + Math.random() * 12),
                life: 4.5,
                maxLife: 4.5,
                sizeStart: 4.5,
                sizeEnd: 16.0,
                drag: 0.8,
                rotSpeed: new THREE.Vector3(1, 1, 1),
                startColor: new THREE.Color(0xff6b81),
                endColor: new THREE.Color(0x0a0d10)
            });
        }

        // 7. Ground Blast Jet Particles & Radioactive Sparks
        for (let i = 0; i < 45; i++) {
            const sparkGeo = new THREE.BoxGeometry(0.3, 0.3, 0.8);
            const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfffa65 });
            const sparkMesh = new THREE.Mesh(sparkGeo, sparkMat);
            sparkMesh.position.copy(epicenter).add(new THREE.Vector3(0, 1.5, 0));

            const dir = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.6 + 0.4, (Math.random() - 0.5) * 2).normalize();
            this.scene.add(sparkMesh);
            this.particles.push({
                mesh: sparkMesh,
                velocity: dir.multiplyScalar(35 + Math.random() * 30),
                life: 1.8 + Math.random() * 0.8,
                maxLife: 2.6,
                sizeStart: 2.0,
                sizeEnd: 0.3,
                gravity: 28.0,
                drag: 0.6,
                rotSpeed: new THREE.Vector3(20, 20, 20),
                startColor: new THREE.Color(0xfffa65),
                endColor: new THREE.Color(0xff3838)
            });
        }

        if (onShakeCamera) onShakeCamera();
    }

    public updateShockwaves(
        dt: number,
        units: Map<string, CombatUnit>,
        onDamageUnit: (unit: CombatUnit, damage: number, shooterId: string, shooterName: string, team: Team) => void
    ) {
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.life -= dt;
            sw.currentRadius += sw.expansionSpeed * dt;

            const scale = sw.currentRadius;
            sw.mesh.scale.set(scale, scale, scale);
            const fade = Math.max(0, sw.life / sw.maxLife);
            (sw.mesh.material as THREE.MeshBasicMaterial).opacity = fade * 0.9;

            units.forEach(unit => {
                if (!unit.isDead && unit.team !== sw.team && !sw.damagedUnits.has(unit.id)) {
                    const dist = unit.pos.distanceTo(sw.epicenter);
                    if (dist <= sw.currentRadius) {
                        sw.damagedUnits.add(unit.id);
                        const falloff = Math.max(0.3, 1.0 - (dist / sw.maxRadius));
                        const actualDmg = Math.round(sw.damage * falloff);
                        onDamageUnit(unit, actualDmg, sw.shooterId, sw.shooterName, sw.team);
                    }
                }
            });

            if (sw.life <= 0 || sw.currentRadius >= sw.maxRadius) {
                this.scene.remove(sw.mesh);
                this.shockwaves.splice(i, 1);
            }
        }
    }

    public updateParticles(dt: number) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
                continue;
            }

            if (p.gravity) {
                p.velocity.y -= p.gravity * dt;
            }
            if (p.drag) {
                p.velocity.multiplyScalar(Math.max(0, 1 - p.drag * dt));
            }

            p.mesh.position.addScaledVector(p.velocity, dt);

            if (p.rotSpeed) {
                p.mesh.rotation.x += p.rotSpeed.x * dt;
                p.mesh.rotation.y += p.rotSpeed.y * dt;
                p.mesh.rotation.z += p.rotSpeed.z * dt;
            }

            const progress = 1.0 - (p.life / p.maxLife);
            const curSize = THREE.MathUtils.lerp(p.sizeStart, p.sizeEnd, progress);
            p.mesh.scale.set(curSize, curSize, curSize);

            const mat = p.mesh.material as THREE.MeshBasicMaterial;
            if (mat) {
                if (p.startColor && p.endColor) {
                    mat.color.copy(p.startColor).lerp(p.endColor, progress);
                }
                if (p.fadeOpacity !== false) {
                    mat.opacity = Math.max(0, p.life / p.maxLife);
                }
            }
        }
    }
}
