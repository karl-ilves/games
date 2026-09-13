import * as THREE from 'three';
import { VehicleDef } from '../types';
import { EmergencySystem } from './emergencySystem';
import { OpponentsManager } from './opponents';

export class PlayerPhysics {
    public playerVehicleGroup: THREE.Group = new THREE.Group();
    public playerWheels: THREE.Mesh[] = [];
    public playerSpeed: number = 0;
    public playerHeading: number = 0;
    public nitro: number = 100;
    public damage: number = 0;
    public playerCrashed: boolean = false;
    public playerCrashTimer: number = 0;

    // Dynamics tuning
    public maxSpeed: number = 50;
    public acceleration: number = 20;
    public braking: number = 40;
    public turnSpeed: number = 1.5;
    public friction: number = 0.98;

    public updatePhysics(
        dt: number,
        keys: { [key: string]: boolean },
        joystickMoveVector: { x: number; y: number },
        isMoto: boolean,
        emergencySystem: EmergencySystem,
        uiSpeed: HTMLElement
    ): void {
        const isAccelerating =
            keys['KeyW'] || keys['w'] || keys['ArrowUp'] || (window as any).gasPressed || joystickMoveVector.y < -0.15;
        const isBraking =
            keys['KeyS'] || keys['s'] || keys['ArrowDown'] || (window as any).brakePressed || joystickMoveVector.y > 0.2;
        const isLeft =
            keys['KeyA'] || keys['a'] || keys['ArrowLeft'] || (window as any).leftPressed || joystickMoveVector.x < -0.15;
        const isRight =
            keys['KeyD'] || keys['d'] || keys['ArrowRight'] || (window as any).rightPressed || joystickMoveVector.x > 0.15;

        // Acceleration & Braking
        if (isAccelerating) {
            this.playerSpeed += this.acceleration * dt;
        } else if (isBraking) {
            this.playerSpeed -= this.braking * dt;
        } else {
            this.playerSpeed *= Math.pow(this.friction, dt * 60);
        }

        // Reverse speed limit
        if (this.playerSpeed < -20) this.playerSpeed = -20;
        // Max forward speed
        if (this.playerSpeed > this.maxSpeed) this.playerSpeed = this.maxSpeed;

        // Stop completely if very slow and no input
        if (Math.abs(this.playerSpeed) < 0.5 && !isAccelerating && !isBraking) {
            this.playerSpeed = 0;
        }

        // Nitro
        if (keys['ShiftLeft'] && this.nitro > 0) {
            this.playerSpeed += 30 * dt;
            this.nitro -= 30 * dt;
        }

        // Steering
        if (Math.abs(this.playerSpeed) > 1.0) {
            const speedFactor = Math.max(0.3, 1.0 - (this.playerSpeed / this.maxSpeed) * 0.5);
            const turnAmount = this.turnSpeed * dt * speedFactor;
            const steerDir = this.playerSpeed > 0 ? 1 : -1;

            if (isLeft) this.playerHeading += turnAmount * steerDir;
            if (isRight) this.playerHeading -= turnAmount * steerDir;
        }

        this.playerVehicleGroup.rotation.y = this.playerHeading;

        // Move forward
        const moveDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerHeading);
        this.playerVehicleGroup.position.add(moveDir.multiplyScalar(this.playerSpeed * dt));

        // Motorcycle Lean
        if (isMoto) {
            const body = this.playerVehicleGroup.children[0];
            if (body) {
                let targetLean = 0;
                if (isLeft && this.playerSpeed > 5) targetLean = 0.5;
                if (isRight && this.playerSpeed > 5) targetLean = -0.5;
                body.rotation.z += (targetLean - body.rotation.z) * 5 * dt;
            }
        }

        // Update UI
        if (uiSpeed) {
            uiSpeed.innerText = Math.abs(Math.round(this.playerSpeed * 3.6)).toString();
        }

        // Yellow flag warning color
        const speedometerEl = document.getElementById('speedometer');
        if (speedometerEl) {
            if (emergencySystem.isInYellowFlagZone(this.playerVehicleGroup.position) && !this.playerCrashed) {
                speedometerEl.style.color = '#f1c40f';
            } else if (this.playerCrashed) {
                speedometerEl.style.color = '#e74c3c';
            } else {
                speedometerEl.style.color = '';
            }
        }
    }

    public checkCollisions(
        scene: THREE.Scene,
        dt: number,
        opponentsMgr: OpponentsManager,
        emergencySystem: EmergencySystem,
        raceTime: number
    ): void {
        const opponents = opponentsMgr.opponents;

        // Player vs AI collision
        for (const ai of opponents) {
            if (ai.crashed || ai.finished) continue;
            const dist = this.playerVehicleGroup.position.distanceTo(ai.group.position);
            if (dist < 4) {
                const impactSpeed = Math.abs(this.playerSpeed) + ai.speed;
                if (impactSpeed > 15) {
                    this.damage += 20;
                    this.playerSpeed *= -0.3;

                    if (Math.random() < 0.4) {
                        ai.crashed = true;
                        ai.crashTimer = 0;
                        ai.speed = 0;
                        emergencySystem.spawnCrashEvent(scene, ai.group.position, raceTime);
                    }

                    if (this.damage >= 80 && !this.playerCrashed) {
                        this.playerCrashed = true;
                        this.playerCrashTimer = 0;
                        this.playerSpeed = 0;
                        emergencySystem.spawnCrashEvent(scene, this.playerVehicleGroup.position, raceTime);
                    }
                } else {
                    this.playerSpeed *= 0.5;
                    ai.speed *= 0.5;
                    this.damage += 5;
                }

                const pushDir = this.playerVehicleGroup.position.clone().sub(ai.group.position).normalize();
                this.playerVehicleGroup.position.add(pushDir.multiplyScalar(0.5));
                ai.group.position.add(pushDir.multiplyScalar(-0.5));
            }
        }

        // AI vs AI collision
        for (let i = 0; i < opponents.length; i++) {
            for (let j = i + 1; j < opponents.length; j++) {
                const a = opponents[i];
                const b = opponents[j];
                if (a.crashed || b.crashed || a.finished || b.finished) continue;
                const dist = a.group.position.distanceTo(b.group.position);
                if (dist < 4) {
                    const impactSpeed = a.speed + b.speed;
                    if (impactSpeed > 20 && Math.random() < 0.3) {
                        const victim = Math.random() < 0.5 ? a : b;
                        victim.crashed = true;
                        victim.crashTimer = 0;
                        victim.speed = 0;
                        emergencySystem.spawnCrashEvent(scene, victim.group.position, raceTime);
                    }
                    const pushDir = a.group.position.clone().sub(b.group.position).normalize();
                    a.group.position.add(pushDir.multiplyScalar(0.3));
                    b.group.position.add(pushDir.multiplyScalar(-0.3));
                    a.speed *= 0.6;
                    b.speed *= 0.6;
                }
            }
        }

        // Player crash recovery
        if (this.playerCrashed) {
            this.playerCrashTimer += dt;
            this.playerSpeed = 0;
            if (this.playerCrashTimer > 4) {
                this.playerCrashed = false;
                this.playerCrashTimer = 0;
                this.damage = Math.max(this.damage - 30, 0);
            }
        }

        // AI crash recovery
        opponents.forEach(ai => {
            if (ai.crashed) {
                ai.crashTimer += dt;
                ai.speed = 0;
                if (ai.crashTimer > 6) {
                    ai.crashed = false;
                    ai.crashTimer = 0;
                }
            }
        });

        // Yellow flag speed checks
        opponents.forEach(ai => {
            if (!ai.crashed && !ai.finished && emergencySystem.isInYellowFlagZone(ai.group.position)) {
                if (ai.speed > 15) ai.speed = 15;
            }
        });

        if (!this.playerCrashed && emergencySystem.isInYellowFlagZone(this.playerVehicleGroup.position)) {
            if (this.playerSpeed > 20) this.playerSpeed *= 0.98;
        }
    }

    public animateWheels(dt: number): void {
        const wheelRotSpeed = (this.playerSpeed * dt) / 0.4;
        this.playerWheels.forEach(w => (w.rotation.x -= wheelRotSpeed));
    }
}
