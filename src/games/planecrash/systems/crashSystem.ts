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

    constructor(environment: WorldEnvironment, particles: ParticleSystem) {
        this.environment = environment;
        this.particles = particles;
    }

    /**
     * Checks if the aircraft collided with any terrain, structure, or water level.
     */
    public checkCollisions(physics: FlightPhysics, plane: BuiltPlaneResult): boolean {
        if (physics.state.isCrashed) return false;

        const pos = physics.position;
        const planeSphere = new THREE.Sphere(pos, 3.5);

        // 1. Water / Ground Check (y <= 2.2)
        if (pos.y <= 2.2) {
            const obstacle = this.environment.obstacles.find(o => o.type === 'water') || {
                name: 'Ookean / Vesi',
                type: 'water',
                bonusMultiplier: 1.0,
                bounds: new THREE.Box3()
            };
            this.executeCrash(physics, plane, obstacle as CrashObstacle);
            return true;
        }

        // 2. Obstacles check (Mountains, Skyscrapers, Bridge, Towers)
        for (const obs of this.environment.obstacles) {
            if (obs.bounds.intersectsSphere(planeSphere)) {
                this.executeCrash(physics, plane, obs);
                return true;
            }
        }

        return false;
    }

    public executeCrash(physics: FlightPhysics, plane: BuiltPlaneResult, obstacle: CrashObstacle): void {
        if (physics.state.isCrashed) return;
        physics.state.isCrashed = true;
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
        this.debrisPieces = [];
        this.isDebrisSimulating = true;

        const baseVel = physics.velocity.clone();
        const root = plane.rootGroup;
        root.visible = false;

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(physics.quaternion);

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

        // 1. Extract major sub-components with independent physics
        const collectMeshes = (obj: THREE.Object3D) => {
            if ((obj as THREE.Mesh).isMesh) {
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

                // Violent radial explosive velocity added to forward velocity
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
                collectMeshes(child);
            }
        };

        plane.debrisCandidates.forEach(cand => {
            if (cand) collectMeshes(cand);
        });

        // 2. Generate 25+ extra jagged shrapnel pieces and twisted metal shards
        const shardCount = 28;
        for (let i = 0; i < shardCount; i++) {
            // Procedural jagged triangular shard geometry
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

            // Shrapnel shoots out at extreme velocities
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

        // Accelerate time back to 1.0 gradually
        if (this.timeScale < 1.0) {
            this.timeScale = Math.min(1.0, this.timeScale + dt * 0.5);
        }
        const effectiveDt = dt * this.timeScale;

        this.trailTimer += effectiveDt;
        const shouldSpawnTrail = this.trailTimer > 0.05;
        if (shouldSpawnTrail) this.trailTimer = 0;

        for (const debris of this.debrisPieces) {
            if (debris.isGrounded) {
                // High ground friction
                debris.velocity.multiplyScalar(0.88);
                debris.rotVelocity.multiplyScalar(0.85);
                continue;
            }

            // Gravity & Air Drag
            debris.velocity.y -= 26.0 * effectiveDt;
            debris.velocity.multiplyScalar(0.985);
            debris.mesh.position.addScaledVector(debris.velocity, effectiveDt);

            // Violent Tumbling
            debris.mesh.rotation.x += debris.rotVelocity.x * effectiveDt;
            debris.mesh.rotation.y += debris.rotVelocity.y * effectiveDt;
            debris.mesh.rotation.z += debris.rotVelocity.z * effectiveDt;

            // Emit burning smoke and spark trails behind flying debris
            if (shouldSpawnTrail && Math.random() < 0.45) {
                this.particles.spawnDebrisTrail(debris.mesh.position, false);
            }

            // Surface collision (ground / water at y = 1.5)
            if (debris.mesh.position.y <= 1.5) {
                debris.mesh.position.y = 1.5;

                // Violent ground impacts throw sparks & dust
                if (Math.abs(debris.velocity.y) > 4.0) {
                    this.particles.spawnDebrisTrail(debris.mesh.position, true);
                }

                debris.velocity.y *= -0.32; // Inelastic rebound
                debris.velocity.x *= 0.62;  // Skid friction
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
