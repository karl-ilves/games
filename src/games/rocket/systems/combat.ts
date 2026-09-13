import * as THREE from 'three';
import { RocketType, DestructibleBuilding, FlyingDebris, InFlightRocket } from '../types';
import { RocketAudio } from '../audio';
import { HudManager } from '../ui/hud';
import { TargetingSystem } from './targetRing';
import { igniteBuilding, spawnBuildingRubble } from '../world/buildings';

export interface CombatContext {
    scene: THREE.Scene;
    audio: RocketAudio;
    hud: HudManager;
    targeting: TargetingSystem;
    getTargets: () => DestructibleBuilding[];
    onScoreAwarded: (pts: number) => void;
    onTargetHit: () => void;
}

export class CombatSystem {
    private ctx: CombatContext;

    public activeRockets: InFlightRocket[] = [];
    public activeDebris: FlyingDebris[] = [];
    public particlePuffGroup: THREE.Group;
    public debrisGroup: THREE.Group;
    public fireGroup: THREE.Group;

    constructor(ctx: CombatContext) {
        this.ctx = ctx;

        this.particlePuffGroup = new THREE.Group();
        this.debrisGroup = new THREE.Group();
        this.fireGroup = new THREE.Group();

        this.ctx.scene.add(this.particlePuffGroup);
        this.ctx.scene.add(this.debrisGroup);
        this.ctx.scene.add(this.fireGroup);
    }

    public createSmokePuff(pos: THREE.Vector3, color: number) {
        const puff = new THREE.Mesh(
            new THREE.SphereGeometry(0.5 + Math.random() * 0.35, 8, 8),
            new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.85
            })
        );
        puff.position.copy(pos);
        this.particlePuffGroup.add(puff);

        let age = 0;
        const interval = setInterval(() => {
            age += 0.04;
            puff.scale.multiplyScalar(1.12);
            (puff.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 - age * 2.5);

            if (age >= 0.34) {
                clearInterval(interval);
                this.particlePuffGroup.remove(puff);
                puff.geometry.dispose();
                (puff.material as THREE.Material).dispose();
            }
        }, 30);
    }

    public fireRocket(targetPoint: THREE.Vector3, equippedRocket: RocketType): boolean {
        this.ctx.audio.playWhoosh();

        const startPoint = new THREE.Vector3(
            targetPoint.x - 15 + (Math.random() - 0.5) * 8,
            targetPoint.y + 85,
            targetPoint.z + 34 + (Math.random() - 0.5) * 8
        );

        const toTarget = targetPoint.clone().sub(startPoint);
        const dir = toTarget.clone().normalize();

        const rocketGroup = new THREE.Group();
        rocketGroup.position.copy(startPoint);

        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.44, 2.5, 16);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: equippedRocket.color,
            metalness: 0.75,
            roughness: 0.25
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.x = Math.PI / 2;
        rocketGroup.add(body);

        const noseGeo = new THREE.ConeGeometry(0.38, 1.1, 16);
        const noseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.z = 1.6;
        nose.rotation.x = Math.PI / 2;
        rocketGroup.add(nose);

        const finGeo = new THREE.BoxGeometry(1.5, 0.08, 0.75);
        const finMat = new THREE.MeshBasicMaterial({ color: equippedRocket.trailColor });
        const fin1 = new THREE.Mesh(finGeo, finMat);
        fin1.position.z = -0.75;
        rocketGroup.add(fin1);

        const fin2 = fin1.clone();
        fin2.rotation.z = Math.PI / 2;
        rocketGroup.add(fin2);

        const thrusterLight = new THREE.PointLight(equippedRocket.trailColor, 4.5, 20);
        thrusterLight.position.z = -1.5;
        rocketGroup.add(thrusterLight);

        rocketGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        this.ctx.scene.add(rocketGroup);

        this.activeRockets.push({
            mesh: rocketGroup,
            velocity: dir.multiplyScalar(equippedRocket.speed),
            targetPos: targetPoint.clone(),
            rocketType: equippedRocket,
            spawnTime: performance.now()
        });

        this.ctx.targeting.trauma = Math.max(this.ctx.targeting.trauma, 0.18);
        return true;
    }

    public updateRockets(dt: number) {
        for (let i = this.activeRockets.length - 1; i >= 0; i--) {
            const rocket = this.activeRockets[i];
            const oldPos = rocket.mesh.position.clone();
            const step = rocket.velocity.clone().multiplyScalar(dt);
            const newPos = oldPos.clone().add(step);

            this.createSmokePuff(oldPos, rocket.rocketType.trailColor);

            if (newPos.y <= rocket.targetPos.y || oldPos.distanceTo(rocket.targetPos) < step.length()) {
                this.triggerExplosion(rocket.targetPos, rocket.rocketType);
                this.ctx.scene.remove(rocket.mesh);
                this.activeRockets.splice(i, 1);
                continue;
            }

            if (performance.now() - rocket.spawnTime > 5000) {
                this.ctx.scene.remove(rocket.mesh);
                this.activeRockets.splice(i, 1);
                continue;
            }

            rocket.mesh.position.copy(newPos);
        }
    }

    public triggerExplosion(impactPos: THREE.Vector3, rocketType: RocketType, hitTarget?: DestructibleBuilding, hitDistFromCenter: number = 0) {
        this.ctx.audio.playUltraRealisticBoom();

        // 1. Dynamic Flash Point Light
        const flashLight = new THREE.PointLight(0xffffff, 28.0, 180);
        flashLight.position.copy(impactPos).add(new THREE.Vector3(0, 8, 0));
        this.ctx.scene.add(flashLight);

        // 2. Nuclear Mushroom Cloud System
        const nukeGroup = new THREE.Group();

        // A. Rising Stem Column
        const stemSpheres: { mesh: THREE.Mesh; velY: number; initialScale: number; expansionRate: number }[] = [];
        const stemCount = 18;
        for (let i = 0; i < stemCount; i++) {
            const size = 1.6 + Math.random() * 1.5;
            const geo = new THREE.SphereGeometry(size, 14, 14);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.96
            });
            const mesh = new THREE.Mesh(geo, mat);
            const rad = Math.random() * 2.2;
            const ang = Math.random() * Math.PI * 2;
            mesh.position.set(
                impactPos.x + Math.cos(ang) * rad,
                impactPos.y + 0.5 + i * 1.6,
                impactPos.z + Math.sin(ang) * rad
            );
            nukeGroup.add(mesh);
            stemSpheres.push({
                mesh,
                velY: 18.0 + (stemCount - i) * 1.5,
                initialScale: size,
                expansionRate: 1.8 + Math.random() * 1.6
            });
        }

        // B. Mushroom Cap Head
        const capSpheres: { mesh: THREE.Mesh; vel: THREE.Vector3; initialScale: number }[] = [];
        const capCount = 26;
        for (let i = 0; i < capCount; i++) {
            const size = 2.4 + Math.random() * 2.2;
            const geo = new THREE.SphereGeometry(size, 16, 16);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.98
            });
            const mesh = new THREE.Mesh(geo, mat);
            const ang = (i / capCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
            const dist = 1.8 + Math.random() * 3.5;
            mesh.position.set(
                impactPos.x + Math.cos(ang) * dist,
                impactPos.y + 22 + (Math.random() - 0.5) * 4.0,
                impactPos.z + Math.sin(ang) * dist
            );
            nukeGroup.add(mesh);

            const rollOutSpeed = 12.0 + Math.random() * 10.0;
            capSpheres.push({
                mesh,
                vel: new THREE.Vector3(
                    Math.cos(ang) * rollOutSpeed,
                    4.5 + Math.random() * 6.5,
                    Math.sin(ang) * rollOutSpeed
                ),
                initialScale: size
            });
        }

        // C. Base Blast Fireball
        const baseFireballGeo = new THREE.SphereGeometry(3.5, 20, 20);
        const baseFireballMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.95
        });
        const baseFireball = new THREE.Mesh(baseFireballGeo, baseFireballMat);
        baseFireball.position.copy(impactPos).setY(impactPos.y + 1.5);
        nukeGroup.add(baseFireball);

        this.ctx.scene.add(nukeGroup);

        // 3. Double Supersonic Ground Shockwave & Wilson Condensation Ring
        const shockRingGeo = new THREE.RingGeometry(1.5, 4.2, 64);
        const shockRingMat = new THREE.MeshBasicMaterial({
            color: 0xffe699,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide
        });
        const shockRing = new THREE.Mesh(shockRingGeo, shockRingMat);
        shockRing.rotation.x = -Math.PI / 2;
        shockRing.position.copy(impactPos).setY(0.22);
        this.ctx.scene.add(shockRing);

        const vaporRingGeo = new THREE.RingGeometry(3.0, 5.5, 64);
        const vaporRingMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
        });
        const vaporRing = new THREE.Mesh(vaporRingGeo, vaporRingMat);
        vaporRing.rotation.x = -Math.PI / 2;
        vaporRing.position.copy(impactPos).setY(2.2);
        this.ctx.scene.add(vaporRing);

        // Ground Nuclear Scorch Crater Ring
        const scorchGeo = new THREE.CircleGeometry(rocketType.blastRadius * 1.6, 32);
        const scorchMat = new THREE.MeshBasicMaterial({
            color: 0x0a0c10,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const scorchMesh = new THREE.Mesh(scorchGeo, scorchMat);
        scorchMesh.rotation.x = -Math.PI / 2;
        scorchMesh.position.copy(impactPos).setY(0.08);
        this.ctx.scene.add(scorchMesh);

        // 4. Burning Shrapnel & Molten Sparks
        const sparkCount = 120;
        const sparkGeo = new THREE.BufferGeometry();
        const sparkPos = new Float32Array(sparkCount * 3);
        const sparkVels: THREE.Vector3[] = [];

        for (let i = 0; i < sparkCount; i++) {
            sparkPos[i * 3] = impactPos.x;
            sparkPos[i * 3 + 1] = impactPos.y + 1.5;
            sparkPos[i * 3 + 2] = impactPos.z;

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.45;
            const speed = 28 + Math.random() * 45;
            sparkVels.push(new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta) * speed,
                Math.cos(phi) * speed + 14,
                Math.sin(phi) * Math.sin(theta) * speed
            ));
        }
        sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
        const sparkMat = new THREE.PointsMaterial({
            color: 0xffa502,
            size: 1.8,
            transparent: true,
            opacity: 1.0
        });
        const sparkSystem = new THREE.Points(sparkGeo, sparkMat);
        this.ctx.scene.add(sparkSystem);

        let animElapsed = 0;
        const explosionAnim = setInterval(() => {
            animElapsed += 0.03;
            flashLight.intensity = Math.max(0, 28.0 * (1.0 - animElapsed * 2.8));

            const ringScale = 1.0 + animElapsed * (rocketType.blastRadius * 4.5);
            shockRing.scale.set(ringScale, ringScale, 1);
            shockRingMat.opacity = Math.max(0, 0.95 - animElapsed * 1.4);

            const vaporScale = 1.0 + animElapsed * (rocketType.blastRadius * 5.8);
            vaporRing.scale.set(vaporScale, vaporScale, 1);
            vaporRingMat.opacity = Math.max(0, 0.85 - animElapsed * 1.7);

            const baseScale = 1.0 + animElapsed * 4.2;
            baseFireball.scale.set(baseScale, baseScale * 0.85, baseScale);
            if (animElapsed < 0.15) {
                (baseFireball.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
            } else if (animElapsed < 0.45) {
                (baseFireball.material as THREE.MeshBasicMaterial).color.setHex(0xff5500);
            } else {
                (baseFireball.material as THREE.MeshBasicMaterial).color.setHex(0x221815);
            }
            (baseFireball.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.95 - animElapsed * 0.7);

            stemSpheres.forEach(st => {
                st.mesh.position.y += st.velY * 0.03;
                st.velY *= 0.96;
                const exp = st.initialScale * (1.0 + animElapsed * st.expansionRate);
                st.mesh.scale.set(exp, exp * 1.25, exp);

                const m = st.mesh.material as THREE.MeshBasicMaterial;
                if (animElapsed < 0.18) {
                    m.color.setHex(0xffffff);
                } else if (animElapsed < 0.45) {
                    m.color.setHex(0xff6b1a);
                } else if (animElapsed < 0.85) {
                    m.color.setHex(0x5a180a);
                } else {
                    m.color.setHex(0x1a1a20);
                }
                m.opacity = Math.max(0, 0.96 - animElapsed * 0.65);
            });

            capSpheres.forEach(cp => {
                cp.mesh.position.addScaledVector(cp.vel, 0.03);
                cp.vel.x *= 0.97;
                cp.vel.z *= 0.97;
                cp.vel.y *= 0.98;

                const exp = cp.initialScale * (1.0 + animElapsed * 4.8);
                cp.mesh.scale.set(exp * 1.3, exp * 0.8, exp * 1.3);

                const m = cp.mesh.material as THREE.MeshBasicMaterial;
                if (animElapsed < 0.15) {
                    m.color.setHex(0xffffff);
                } else if (animElapsed < 0.38) {
                    m.color.setHex(0xff4d00);
                } else if (animElapsed < 0.75) {
                    m.color.setHex(0x6a1a0d);
                } else {
                    m.color.setHex(0x16161b);
                }
                m.opacity = Math.max(0, 0.98 - animElapsed * 0.6);
            });

            const sArr = sparkGeo.attributes.position.array as Float32Array;
            for (let i = 0; i < sparkCount; i++) {
                sArr[i * 3] += sparkVels[i].x * 0.03;
                sArr[i * 3 + 1] += sparkVels[i].y * 0.03;
                sArr[i * 3 + 2] += sparkVels[i].z * 0.03;
                sparkVels[i].y -= 42 * 0.03;
            }
            sparkGeo.attributes.position.needsUpdate = true;
            sparkMat.opacity = Math.max(0, 1.0 - animElapsed * 1.1);

            if (animElapsed >= 1.6) {
                clearInterval(explosionAnim);
                this.ctx.scene.remove(flashLight);
                this.ctx.scene.remove(nukeGroup);
                this.ctx.scene.remove(shockRing);
                this.ctx.scene.remove(vaporRing);
                this.ctx.scene.remove(sparkSystem);
                flashLight.dispose();
                shockRingGeo.dispose();
                shockRingMat.dispose();
                vaporRingGeo.dispose();
                vaporRingMat.dispose();
                sparkGeo.dispose();
                sparkMat.dispose();
                baseFireballGeo.dispose();
                baseFireballMat.dispose();

                setTimeout(() => {
                    this.ctx.scene.remove(scorchMesh);
                    scorchGeo.dispose();
                    scorchMat.dispose();
                }, 12000);
            }
        }, 30);

        // 5. Heavy Camera Trauma Screen Shake
        this.ctx.targeting.trauma = Math.min(1.0, this.ctx.targeting.trauma + 1.0);
        this.ctx.hud.triggerViewportShake();

        // 6. Check Building Damage, Ignite Flames & Shatter into Flying Chunks
        let buildingsDemolished = 0;
        let anyBuildingHit = false;

        const targets = this.ctx.getTargets();
        for (const building of targets) {
            if (!building.active) continue;

            const bPosGround = building.position.clone().setY(0);
            const blastGround = impactPos.clone().setY(0);
            const dist = bPosGround.distanceTo(blastGround);

            if (dist <= rocketType.blastRadius + building.size.w / 2 || building === hitTarget) {
                building.hp--;
                anyBuildingHit = true;

                igniteBuilding(building);

                if (building.hp <= 0) {
                    buildingsDemolished++;
                    building.active = false;
                    building.respawnTimer = 7.0;
                    this.ctx.onTargetHit();
                    this.ctx.audio.playHitChime();

                    let earned = building.basePoints;
                    let label = 'BOOM! BUILDING DEMOLISHED! 🏢💥';
                    if (dist < 4.0 || hitDistFromCenter < 2.5) {
                        earned = Math.round(earned * 1.5);
                        label = 'BOOM! DIRECT SHATTER! 🎯🏙️';
                    }

                    earned = Math.round(earned * rocketType.scoreMultiplier);
                    this.ctx.onScoreAwarded(earned);

                    this.ctx.hud.showImpactToast(`${label} +${earned} PTS`);

                    building.group.visible = false;
                    spawnBuildingRubble(this.ctx.scene, building, (pos, col) => this.createSmokePuff(pos, col));
                    this.spawnFlyingBuildingDebris(building, impactPos);
                } else {
                    const hitPoints = Math.round(building.basePoints * 0.5 * rocketType.scoreMultiplier);
                    this.ctx.onScoreAwarded(hitPoints);
                    this.ctx.hud.showImpactToast(`BOOM! BUILDING ON FIRE! 🔥🏢 +${hitPoints} PTS`);
                }
            }
        }

        if (buildingsDemolished === 0 && !anyBuildingHit) {
            this.ctx.hud.showImpactToast('BOOM! 💥');
        }
    }

    public spawnFlyingBuildingDebris(building: DestructibleBuilding, blastOrigin: THREE.Vector3) {
        const chunkCount = 65;
        const colors = [building.color, 0x475569, 0x334155, 0x94a3b8, 0x1e293b, 0x0f172a, 0xff5500];

        for (let i = 0; i < chunkCount; i++) {
            const cw = 0.9 + Math.random() * 2.4;
            const ch = 0.7 + Math.random() * 2.0;
            const cd = 0.9 + Math.random() * 2.4;

            const geo = new THREE.BoxGeometry(cw, ch, cd);
            const mat = new THREE.MeshStandardMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                roughness: 0.85,
                metalness: 0.3
            });
            const chunk = new THREE.Mesh(geo, mat);
            chunk.castShadow = true;
            chunk.receiveShadow = true;

            const spawnX = building.position.x + (Math.random() - 0.5) * building.size.w;
            const spawnY = Math.random() * building.size.h + 0.8;
            const spawnZ = building.position.z + (Math.random() - 0.5) * building.size.d;
            chunk.position.set(spawnX, spawnY, spawnZ);

            const dirX = spawnX - blastOrigin.x;
            const dirZ = spawnZ - blastOrigin.z;
            const horizDist = Math.hypot(dirX, dirZ) || 1;

            const speed = 16 + Math.random() * 34;
            const vel = new THREE.Vector3(
                (dirX / horizDist) * speed + (Math.random() - 0.5) * 12,
                16 + Math.random() * 32,
                (dirZ / horizDist) * speed + (Math.random() - 0.5) * 12
            );

            this.debrisGroup.add(chunk);

            this.activeDebris.push({
                mesh: chunk,
                velocity: vel,
                rotAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
                rotSpeed: (Math.random() - 0.5) * 18,
                isGrounded: false,
                age: 0,
                maxAge: 9.0 + Math.random() * 4.0,
                isBurning: Math.random() > 0.4
            });
        }
    }

    public updateDebris(dt: number) {
        for (let i = this.activeDebris.length - 1; i >= 0; i--) {
            const deb = this.activeDebris[i];
            deb.age += dt;

            if (!deb.isGrounded) {
                deb.velocity.y -= 36 * dt;
                deb.mesh.position.addScaledVector(deb.velocity, dt);
                deb.mesh.rotateOnAxis(deb.rotAxis, deb.rotSpeed * dt);

                if (deb.isBurning && Math.random() < 0.15) {
                    this.createSmokePuff(deb.mesh.position, 0x1f242d);
                }

                if (deb.mesh.position.y <= 0.45) {
                    deb.mesh.position.y = 0.45;
                    if (Math.abs(deb.velocity.y) > 3.0) {
                        deb.velocity.y = -deb.velocity.y * 0.38;
                        deb.velocity.x *= 0.65;
                        deb.velocity.z *= 0.65;
                        deb.rotSpeed *= 0.65;
                    } else {
                        deb.velocity.set(0, 0, 0);
                        deb.isGrounded = true;
                    }
                }
            }

            if (deb.age >= deb.maxAge) {
                this.debrisGroup.remove(deb.mesh);
                deb.mesh.geometry.dispose();
                (deb.mesh.material as THREE.Material).dispose();
                this.activeDebris.splice(i, 1);
            }
        }
    }

    public reset() {
        for (const deb of this.activeDebris) {
            this.debrisGroup.remove(deb.mesh);
            deb.mesh.geometry.dispose();
            (deb.mesh.material as THREE.Material).dispose();
        }
        this.activeDebris = [];

        for (const rock of this.activeRockets) {
            this.ctx.scene.remove(rock.mesh);
        }
        this.activeRockets = [];
    }
}
