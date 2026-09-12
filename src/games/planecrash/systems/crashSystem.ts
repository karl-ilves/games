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

        // 1. Water / Ground Check (y <= 2)
        if (pos.y <= 2.0) {
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

        console.log(`💥 PLANE CRASH! Hit: ${obstacle.name} at ${Math.round(physics.state.speedKmh)} km/h`);

        // 1. Audio and Explosions
        const explosionScale = physics.config.explosionScale || 1.0;
        planeAudio.playCrashExplosion(explosionScale);
        this.particles.spawnCrashExplosion(this.crashPosition, explosionScale);

        // 2. Break plane into physical flying debris pieces
        this.breakPlaneIntoDebris(physics, plane);

        // 3. Calculate Financial Reward (Base 500 Coins + Stunts + Multipliers)
        const report = planeCrashState.calculateCrashReward(
            physics.state,
            physics.config,
            obstacle.name
        );
        physics.state.lastCrashReport = report;
        planeCrashState.applyCrashReward(report);

        // 4. Notify UI / Orchestrator
        if (this.onCrashTriggered) {
            this.onCrashTriggered(report);
        }
    }

    private breakPlaneIntoDebris(physics: FlightPhysics, plane: BuiltPlaneResult): void {
        this.debrisPieces = [];
        this.isDebrisSimulating = true;

        const baseVel = physics.velocity.clone();
        const root = plane.rootGroup;

        // Hide root and move candidates into world space
        root.visible = false;

        const candidates = plane.debrisCandidates;
        candidates.forEach(part => {
            if (!part) return;

            // Clone geometry to keep independent world mesh
            const worldPos = new THREE.Vector3();
            const worldQuat = new THREE.Quaternion();
            part.getWorldPosition(worldPos);
            part.getWorldQuaternion(worldQuat);

            const debrisMesh = part.clone(true);
            debrisMesh.position.copy(worldPos);
            debrisMesh.quaternion.copy(worldQuat);
            this.environment.scene.add(debrisMesh);

            // Explosive scatter impulse added to forward velocity
            const scatter = new THREE.Vector3(
                (Math.random() - 0.5) * 25,
                Math.random() * 20 + 8,
                (Math.random() - 0.5) * 25
            );
            const debrisVel = baseVel.clone().multiplyScalar(0.7).add(scatter);

            const rotVel = new THREE.Vector3(
                (Math.random() - 0.5) * 12,
                (Math.random() - 0.5) * 12,
                (Math.random() - 0.5) * 12
            );

            this.debrisPieces.push({
                mesh: debrisMesh,
                velocity: debrisVel,
                rotVelocity: rotVel,
                isGrounded: false,
                sparkTimer: 0
            });
        });
    }

    public updateDebris(dt: number): void {
        if (!this.isDebrisSimulating) return;

        for (const debris of this.debrisPieces) {
            if (debris.isGrounded) {
                // Friction while resting on ground
                debris.velocity.multiplyScalar(0.92);
                debris.rotVelocity.multiplyScalar(0.9);
                continue;
            }

            // Gravity
            debris.velocity.y -= 25.0 * dt;
            debris.mesh.position.addScaledVector(debris.velocity, dt);

            // Tumble rotation
            debris.mesh.rotation.x += debris.rotVelocity.x * dt;
            debris.mesh.rotation.y += debris.rotVelocity.y * dt;
            debris.mesh.rotation.z += debris.rotVelocity.z * dt;

            // Ground collision for debris (water/ground level y = 1.0)
            if (debris.mesh.position.y <= 1.5) {
                debris.mesh.position.y = 1.5;
                debris.velocity.y *= -0.35; // Bounce dampening
                debris.velocity.x *= 0.65;
                debris.velocity.z *= 0.65;
                debris.rotVelocity.multiplyScalar(0.5);

                if (Math.abs(debris.velocity.y) < 2.0 && debris.velocity.length() < 5.0) {
                    debris.isGrounded = true;
                }

                // Sparks on ground impact
                debris.sparkTimer += dt;
                if (debris.sparkTimer > 0.08) {
                    debris.sparkTimer = 0;
                    this.particles.spawnTrailPuff(debris.mesh.position, 0.4, 0xff781e);
                }
            }
        }
    }

    public clearDebris(): void {
        for (const debris of this.debrisPieces) {
            this.environment.scene.remove(debris.mesh);
        }
        this.debrisPieces = [];
        this.isDebrisSimulating = false;
    }
}
