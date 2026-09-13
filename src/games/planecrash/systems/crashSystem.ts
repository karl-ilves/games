import * as THREE from 'three';
import { CrashBreakdown, DebrisPiece } from '../types';
import { FlightPhysics } from './flightPhysics';
import { WorldEnvironment, CrashObstacle } from '../world/environment';
import { BuiltPlaneResult } from '../models/planeBuilder';
import { ParticleSystem } from '../effects/particles';
import { planeAudio } from '../audio';
import { planeCrashState } from '../state/planeCrashState';

export class CrashSystem {
    private environment: WorldEnvironment;
    private particles: ParticleSystem;
    public debrisPieces: DebrisPiece[] = [];
    public isDebrisSimulating: boolean = false;
    public crashPosition: THREE.Vector3 = new THREE.Vector3();
    public timeScale: number = 1.0;
    private trailTimer: number = 0;

    public onCrashTriggered?: (report: CrashBreakdown) => void;
    public onDamageTriggered?: (text: string) => void;

    constructor(environment: WorldEnvironment, particles: ParticleSystem) {
        this.environment = environment;
        this.particles = particles;
    }

    /**
     * Checks if the aircraft collided with any terrain, structure, or water level.
     * Supports localized dismemberment:
     * - Left wing strike rips off left wing -> violent death roll
     * - Right wing strike rips off right wing -> violent death roll
     * - Tail strike rips off tail fin/stabilizer -> loss of pitch/yaw control
     * - Main fuselage/nose strike -> full catastrophic explosion
     */
    public checkCollisions(physics: FlightPhysics, plane: BuiltPlaneResult): boolean {
        if (physics.state.isCrashed) return false;

        const pos = physics.position;
        const quat = physics.quaternion;

        // 0. Over-the-Mountains Explosion Check:
        // Attempting to fly over or cross the perimeter mountain barrier triggers an instant explosion!
        const distFromCenter = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        if (distFromCenter >= 2200) {
            const boundaryObstacle: CrashObstacle = {
                name: 'Mäestiku piiritsoon (Üle mägede lendamine)',
                type: 'mountain',
                bonusMultiplier: 2.0,
                bounds: new THREE.Box3()
            };
            if (this.onDamageTriggered) {
                this.onDamageTriggered('💥 Üritasid lennata üle mägede! Lennuk plahvatas!');
            }
            this.executeCrash(physics, plane, boundaryObstacle);
            return true;
        }

        // 1. Check Left Wing Strike
        if (!physics.state.leftWingBroken && plane.wingLeft.visible) {
            const leftWingTip = new THREE.Vector3(-plane.wingSpan / 2, 0.5, -0.2)
                .applyQuaternion(quat)
                .add(pos);

            const terrainL = this.environment.getTerrainAt(leftWingTip.x, leftWingTip.z);
            const hitObstacle = this.getObstacleAtPoint(leftWingTip);
            if (leftWingTip.y <= terrainL.height + 0.4 || hitObstacle) {
                if (hitObstacle && (hitObstacle.type === 'tower' || hitObstacle.name.includes('Lennujuhtimistorn'))) {
                    this.environment.damageControlTower(physics.config.mass, physics.state.speedKmh, physics.velocity, leftWingTip.y);
                }
                this.breakOffLeftWing(physics, plane, leftWingTip);
            }
        }

        // 2. Check Right Wing Strike
        if (!physics.state.rightWingBroken && plane.wingRight.visible) {
            const rightWingTip = new THREE.Vector3(plane.wingSpan / 2, 0.5, -0.2)
                .applyQuaternion(quat)
                .add(pos);

            const terrainR = this.environment.getTerrainAt(rightWingTip.x, rightWingTip.z);
            const hitObstacle = this.getObstacleAtPoint(rightWingTip);
            if (rightWingTip.y <= terrainR.height + 0.4 || hitObstacle) {
                if (hitObstacle && (hitObstacle.type === 'tower' || hitObstacle.name.includes('Lennujuhtimistorn'))) {
                    this.environment.damageControlTower(physics.config.mass, physics.state.speedKmh, physics.velocity, rightWingTip.y);
                }
                this.breakOffRightWing(physics, plane, rightWingTip);
            }
        }

        // 3. Check Tail Strike
        if (!physics.state.tailBroken && plane.tailFin.visible) {
            const tailTip = new THREE.Vector3(0, plane.tailY, plane.tailZ)
                .applyQuaternion(quat)
                .add(pos);

            const terrainT = this.environment.getTerrainAt(tailTip.x, tailTip.z);
            const hitObstacle = this.getObstacleAtPoint(tailTip);
            if (tailTip.y <= terrainT.height + 0.4 || hitObstacle) {
                if (hitObstacle && (hitObstacle.type === 'tower' || hitObstacle.name.includes('Lennujuhtimistorn'))) {
                    this.environment.damageControlTower(physics.config.mass, physics.state.speedKmh, physics.velocity, tailTip.y);
                }
                this.breakOffTail(physics, plane, tailTip);
            }
        }

        // 4. Check Full Fuselage / Nose Strike (Plane can NEVER sink into the ground!)
        const noseTip = new THREE.Vector3(0, 0, -3.5).applyQuaternion(quat).add(pos);
        const tailBottom = new THREE.Vector3(0, -0.5, plane.tailZ * 0.8).applyQuaternion(quat).add(pos);
        const bellyPoint = new THREE.Vector3(0, -0.8, 0).applyQuaternion(quat).add(pos);

        const terrainCenter = this.environment.getTerrainAt(pos.x, pos.z);
        const terrainNose = this.environment.getTerrainAt(noseTip.x, noseTip.z);
        const terrainBelly = this.environment.getTerrainAt(bellyPoint.x, bellyPoint.z);

        // Immediate catastrophic crash if fuselage, nose, or belly touches the terrain surface!
        if (
            pos.y <= terrainCenter.height + 1.2 ||
            noseTip.y <= terrainNose.height + 0.8 ||
            bellyPoint.y <= terrainBelly.height + 0.4 ||
            tailBottom.y <= terrainCenter.height + 0.4 ||
            pos.y <= 1.8
        ) {
            const obstacle: CrashObstacle = {
                name: terrainCenter.name,
                type: terrainCenter.type,
                bonusMultiplier: terrainCenter.type === 'ground' ? 1.1 : 1.0,
                bounds: new THREE.Box3()
            };
            this.executeCrash(physics, plane, obstacle);
            return true;
        }

        // Check obstacles against fuselage sphere (radius 2.2)
        const fuseSphere = new THREE.Sphere(pos, 2.2);
        const noseSphere = new THREE.Sphere(noseTip, 1.6);
        for (const obs of this.environment.obstacles) {
            if (obs.bounds.intersectsSphere(fuseSphere) || obs.bounds.intersectsSphere(noseSphere)) {
                // If hitting the airport control tower, collapse and slice it at exact contact height!
                if (obs.type === 'tower' || obs.name.includes('Lennujuhtimistorn') || obs.name.includes('lennutorn')) {
                    const hitCutHeight = Math.max(pos.y, noseTip.y);
                    this.environment.damageControlTower(physics.config.mass, physics.state.speedKmh, physics.velocity, hitCutHeight);
                }
                this.executeCrash(physics, plane, obs);
                return true;
            }
        }

        return false;
    }

    private getObstacleAtPoint(point: THREE.Vector3): CrashObstacle | null {
        for (const obs of this.environment.obstacles) {
            if (obs.bounds.containsPoint(point)) {
                return obs;
            }
        }
        return null;
    }

    private isPointInObstacle(point: THREE.Vector3): boolean {
        for (const obs of this.environment.obstacles) {
            if (obs.bounds.containsPoint(point)) {
                return true;
            }
        }
        return false;
    }

    public breakOffLeftWing(physics: FlightPhysics, plane: BuiltPlaneResult, contactPoint: THREE.Vector3): void {
        if (physics.state.leftWingBroken) return;
        physics.state.leftWingBroken = true;

        console.log("💥 LEFT WING STRUCK! Left wing severed from fuselage!");

        // Detach wing and spawn as active tumbling debris
        this.detachPartAsDebris(plane.wingLeft, physics, new THREE.Vector3(-18, 10, 4));

        // Visual sparks and metal crunch sound
        this.particles.spawnCrashExplosion(contactPoint, 0.45, contactPoint.y <= 2.2);
        planeAudio.playCrashExplosion(0.45);

        if (this.onDamageTriggered) {
            this.onDamageTriggered('💥 VASAK TIIB REBITUD ÄRA! LENNUK KUKKUB ALLA!');
        }
    }

    public breakOffRightWing(physics: FlightPhysics, plane: BuiltPlaneResult, contactPoint: THREE.Vector3): void {
        if (physics.state.rightWingBroken) return;
        physics.state.rightWingBroken = true;

        console.log("💥 RIGHT WING STRUCK! Right wing severed from fuselage!");

        this.detachPartAsDebris(plane.wingRight, physics, new THREE.Vector3(18, 10, 4));

        this.particles.spawnCrashExplosion(contactPoint, 0.45, contactPoint.y <= 2.2);
        planeAudio.playCrashExplosion(0.45);

        if (this.onDamageTriggered) {
            this.onDamageTriggered('💥 PAREM TIIB REBITUD ÄRA! LENNUK KUKKUB ALLA!');
        }
    }

    public breakOffTail(physics: FlightPhysics, plane: BuiltPlaneResult, contactPoint: THREE.Vector3): void {
        if (physics.state.tailBroken) return;
        physics.state.tailBroken = true;

        console.log("💥 TAIL STRUCK! Tail assembly ripped off!");

        this.detachPartAsDebris(plane.tailFin, physics, new THREE.Vector3(0, 14, 16));
        this.detachPartAsDebris(plane.tailHorizontal, physics, new THREE.Vector3(0, 12, 18));

        this.particles.spawnCrashExplosion(contactPoint, 0.5, contactPoint.y <= 2.2);
        planeAudio.playCrashExplosion(0.5);

        if (this.onDamageTriggered) {
            this.onDamageTriggered('💥 SABA REBITUD ÄRA (TAIL STRIKE)! JUHITAVUS KADUNUD!');
        }
    }

    private detachPartAsDebris(part: THREE.Object3D, physics: FlightPhysics, impulseOffset: THREE.Vector3): void {
        if (!part) return;

        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        part.getWorldPosition(worldPos);
        part.getWorldQuaternion(worldQuat);

        part.visible = false;

        const debrisMesh = part.clone(true);
        debrisMesh.visible = true;
        debrisMesh.position.copy(worldPos);
        debrisMesh.quaternion.copy(worldQuat);
        this.environment.scene.add(debrisMesh);

        const baseVel = physics.velocity.clone();
        const impulse = impulseOffset.clone().applyQuaternion(physics.quaternion);
        const vel = baseVel.clone().multiplyScalar(0.7).add(impulse);

        const rotVel = new THREE.Vector3(
            (Math.random() - 0.5) * 16,
            (Math.random() - 0.5) * 16,
            (Math.random() - 0.5) * 16
        );

        this.debrisPieces.push({
            mesh: debrisMesh,
            velocity: vel,
            rotVelocity: rotVel,
            isGrounded: false,
            sparkTimer: 0
        });
        this.isDebrisSimulating = true;
    }

    public executeCrash(physics: FlightPhysics, plane: BuiltPlaneResult, obstacle: CrashObstacle): void {
        if (physics.state.isCrashed) return;
        physics.state.isCrashed = true;

        const terrain = this.environment.getTerrainAt(physics.position.x, physics.position.z);
        if (physics.position.y < terrain.height + 0.8) {
            physics.position.y = terrain.height + 0.8;
        }
        this.crashPosition.copy(physics.position);

        const isWater = obstacle.type === 'water';
        console.log(`💥 ULTRA-REALISTIC CRASH! Hit: ${obstacle.name} at ${Math.round(physics.state.speedKmh)} km/h (isWater=${isWater})`);

        // 1. Initiate Bullet-Time Slow-Motion for cinematic breakup
        this.timeScale = 0.22;

        // 2. Audio & Multi-stage Fireball / Water Plume
        const explosionScale = physics.config.explosionScale || 1.0;
        planeAudio.playCrashExplosion(explosionScale);
        this.particles.spawnCrashExplosion(this.crashPosition, explosionScale, isWater);

        // 3. Shatter aircraft into dozens of physics debris pieces & twisted shrapnel
        this.breakPlaneIntoUltraDebris(physics, plane);

        // 4. Calculate Financial Reward (Base 500 Coins + Stunts + Multipliers)
        const report = planeCrashState.calculateCrashReward(
            physics.state,
            physics.config,
            obstacle.name
        );
        physics.state.lastCrashReport = report;
        planeCrashState.applyCrashReward(report);

        // 5. Notify UI / Orchestrator
        if (this.onCrashTriggered) {
            this.onCrashTriggered(report);
        }
    }

    /**
     * Shatters the aircraft into 30+ separate high-velocity tumbling debris fragments:
     * - Major components (wings, fuselage chunks, elevators, rudder, engines, gear)
     * - Scorched twisted metal plating
     * - High-speed flying shrapnel shards with fire trails
     */
    private breakPlaneIntoUltraDebris(physics: FlightPhysics, plane: BuiltPlaneResult): void {
        this.isDebrisSimulating = true;

        const baseVel = physics.velocity.clone();
        const root = plane.rootGroup;
        root.visible = false;

        // Charred scorched material for crash fragments
        const charredMat = new THREE.MeshStandardMaterial({
            color: 0x1e1e1e,
            roughness: 0.9,
            metalness: 0.1
        });

        const glowingMetalMat = new THREE.MeshStandardMaterial({
            color: 0x2c3e50,
            emissive: 0xd63031,
            emissiveIntensity: 0.4,
            roughness: 0.8
        });

        // 1. Extract remaining attached meshes
        const collectMeshes = (obj: THREE.Object3D) => {
            if ((obj as THREE.Mesh).isMesh && obj.visible) {
                const worldPos = new THREE.Vector3();
                const worldQuat = new THREE.Quaternion();
                obj.getWorldPosition(worldPos);
                obj.getWorldQuaternion(worldQuat);

                const debrisMesh = (obj as THREE.Mesh).clone();
                debrisMesh.position.copy(worldPos);
                debrisMesh.quaternion.copy(worldQuat);

                // Scorch materials
                if (Math.random() < 0.6) {
                    debrisMesh.material = Math.random() < 0.5 ? charredMat : glowingMetalMat;
                }

                this.environment.scene.add(debrisMesh);

                const scatterSpeed = 15 + Math.random() * 35;
                const scatterDir = new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    Math.random() * 1.5 + 0.5,
                    (Math.random() - 0.5) * 2
                ).normalize();

                const vel = baseVel.clone().multiplyScalar(0.65).addScaledVector(scatterDir, scatterSpeed);
                const rotVel = new THREE.Vector3(
                    (Math.random() - 0.5) * 18,
                    (Math.random() - 0.5) * 18,
                    (Math.random() - 0.5) * 18
                );

                this.debrisPieces.push({
                    mesh: debrisMesh,
                    velocity: vel,
                    rotVelocity: rotVel,
                    isGrounded: false,
                    sparkTimer: 0
                });
            }
            for (const child of obj.children) {
                if (child.visible) collectMeshes(child);
            }
        };

        plane.debrisCandidates.forEach(cand => {
            if (cand && cand.visible) collectMeshes(cand);
        });

        // 2. Generate 25+ extra jagged shrapnel pieces and twisted metal shards
        const shardCount = 28;
        for (let i = 0; i < shardCount; i++) {
            const shardGeom = new THREE.ConeGeometry(0.4 + Math.random() * 0.8, 1.2 + Math.random() * 2.2, 4);
            shardGeom.rotateZ(Math.random() * Math.PI);
            const shardMat = Math.random() < 0.4 ? charredMat : glowingMetalMat;
            const shardMesh = new THREE.Mesh(shardGeom, shardMat);

            const spawnOffset = new THREE.Vector3(
                (Math.random() - 0.5) * 6,
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 8
            );
            shardMesh.position.copy(this.crashPosition).add(spawnOffset);

            this.environment.scene.add(shardMesh);

            const scatterDir = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 1.8 + 0.3,
                (Math.random() - 0.5) * 2
            ).normalize();

            const shrapnelSpeed = 25 + Math.random() * 60;
            const vel = baseVel.clone().multiplyScalar(0.7).addScaledVector(scatterDir, shrapnelSpeed);

            const rotVel = new THREE.Vector3(
                (Math.random() - 0.5) * 25,
                (Math.random() - 0.5) * 25,
                (Math.random() - 0.5) * 25
            );

            this.debrisPieces.push({
                mesh: shardMesh,
                velocity: vel,
                rotVelocity: rotVel,
                isGrounded: false,
                sparkTimer: 0
            });
        }
    }

    public updateDebris(dt: number): void {
        if (!this.isDebrisSimulating) return;

        if (this.timeScale < 1.0) {
            this.timeScale = Math.min(1.0, this.timeScale + dt * 0.5);
        }
        const effectiveDt = dt * this.timeScale;

        this.trailTimer += effectiveDt;
        const shouldSpawnTrail = this.trailTimer > 0.05;
        if (shouldSpawnTrail) this.trailTimer = 0;

        for (const debris of this.debrisPieces) {
            if (debris.isGrounded) {
                debris.velocity.multiplyScalar(0.88);
                debris.rotVelocity.multiplyScalar(0.85);
                continue;
            }

            debris.velocity.y -= 26.0 * effectiveDt;
            debris.velocity.multiplyScalar(0.985);
            debris.mesh.position.addScaledVector(debris.velocity, effectiveDt);

            debris.mesh.rotation.x += debris.rotVelocity.x * effectiveDt;
            debris.mesh.rotation.y += debris.rotVelocity.y * effectiveDt;
            debris.mesh.rotation.z += debris.rotVelocity.z * effectiveDt;

            if (shouldSpawnTrail && Math.random() < 0.45) {
                this.particles.spawnDebrisTrail(debris.mesh.position, false);
            }

            const groundElev = this.environment.getTerrainAt(debris.mesh.position.x, debris.mesh.position.z).height;
            const bounceY = groundElev + 0.35;

            if (debris.mesh.position.y <= bounceY) {
                debris.mesh.position.y = bounceY;

                if (Math.abs(debris.velocity.y) > 4.0) {
                    this.particles.spawnDebrisTrail(debris.mesh.position, true);
                }

                debris.velocity.y *= -0.32;
                debris.velocity.x *= 0.62;
                debris.velocity.z *= 0.62;
                debris.rotVelocity.multiplyScalar(0.5);

                if (Math.abs(debris.velocity.y) < 1.5 && debris.velocity.length() < 4.0) {
                    debris.isGrounded = true;
                }
            }
        }
    }

    public clearDebris(): void {
        for (const debris of this.debrisPieces) {
            this.environment.scene.remove(debris.mesh);
            if ((debris.mesh as THREE.Mesh).geometry) {
                (debris.mesh as THREE.Mesh).geometry.dispose();
            }
        }
        this.debrisPieces = [];
        this.isDebrisSimulating = false;
        this.timeScale = 1.0;
    }
}
