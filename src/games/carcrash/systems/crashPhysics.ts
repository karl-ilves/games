import * as THREE from 'three';
import { DeformableVehicleBundle } from '../models/deformableCar';
import { CrashObstacle } from '../types';

export class CrashPhysicsSystem {
    public vehicle: DeformableVehicleBundle;
    public position: THREE.Vector3;
    public velocity: THREE.Vector3;
    public rotation: THREE.Euler;
    public angularVelocity: THREE.Vector3;
    public steerAngle = 0;
    public wheelSpin = 0;
    public speedKmh = 0;
    public isBraking = false;
    public isHandbraking = false;
    public lastAccelerationG = 0;

    private forward = new THREE.Vector3(0, 0, 1);
    private carBox = new THREE.Box3();
    private carBoxHelper = new THREE.Vector3();

    constructor(vehicle: DeformableVehicleBundle, spawnPos = new THREE.Vector3(0, 0.5, 0)) {
        this.vehicle = vehicle;
        this.position = spawnPos.clone();
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        this.angularVelocity = new THREE.Vector3(0, 0, 0);
        this.vehicle.root.position.copy(this.position);
    }

    public setVehicle(vehicle: DeformableVehicleBundle): void {
        this.vehicle = vehicle;
        this.vehicle.root.position.copy(this.position);
        this.vehicle.root.rotation.copy(this.rotation);
    }

    public respawn(spawnPos = new THREE.Vector3(0, 0.5, 0)): void {
        this.position.copy(spawnPos);
        this.velocity.set(0, 0, 0);
        this.angularVelocity.set(0, 0, 0);
        this.rotation.set(0, 0, 0);
        this.steerAngle = 0;
        this.wheelSpin = 0;
        this.speedKmh = 0;
        this.vehicle.resetToFactory();
        this.vehicle.root.position.copy(this.position);
        this.vehicle.root.rotation.copy(this.rotation);
    }

    public isThrusterFiring = false;
    public isBoostFiring = false;
    public isAirborne = false;

    public update(
        dt: number,
        inputs: {
            forward: number;
            steer: number;
            brake: boolean;
            handbrake: boolean;
            jumpThruster?: boolean;
            boost?: boolean;
            pitch?: number;
            yaw?: number;
        },
        obstacles: CrashObstacle[],
        onImpact?: (impactG: number, contactPt: THREE.Vector3, impactSpeedKmh: number) => void
    ): void {
        const config = this.vehicle.config;
        const groundY = config.dimensions.height * 0.35;
        this.isAirborne = this.position.y > groundY + 0.15;

        // 1. Calculate heading orientation
        this.forward.set(0, 0, 1).applyEuler(this.rotation).normalize();
        const right = new THREE.Vector3(1, 0, 0).applyEuler(this.rotation).normalize();
        const up = new THREE.Vector3(0, 1, 0).applyEuler(this.rotation).normalize();

        // 2. Drive & Steering inputs (Ground mode)
        const targetSteer = inputs.steer * 0.55;
        this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, targetSteer, dt * config.steerSpeed * 4.0);

        this.vehicle.wheels.fl.rotation.y = this.steerAngle;
        this.vehicle.wheels.fr.rotation.y = this.steerAngle;

        // Acceleration force (rapid launch off the line up to 100 km/h)
        const maxSpeedMs = (config.topSpeedKmh * 1000) / 3600;
        const currentSpeedForward = this.velocity.dot(this.forward);

        if (!this.isAirborne) {
            // Ground drive
            if (inputs.forward !== 0) {
                const speedRatio = Math.min(1.0, Math.max(0, currentSpeedForward / maxSpeedMs));
                const torqueMultiplier = THREE.MathUtils.lerp(3.2, 1.4, speedRatio);
                const driveForce = inputs.forward * (config.enginePower * 30.0) * torqueMultiplier;
                if (inputs.forward > 0 && currentSpeedForward < maxSpeedMs) {
                    this.velocity.addScaledVector(this.forward, (driveForce / config.massKg) * dt);
                } else if (inputs.forward < 0 && currentSpeedForward > -18.0) {
                    this.velocity.addScaledVector(this.forward, (driveForce / config.massKg) * 0.9 * dt);
                }
            }

            // Steering rotation on ground
            if (Math.abs(currentSpeedForward) > 0.2) {
                const turnRate = (this.steerAngle * currentSpeedForward) / (config.dimensions.length * 0.8);
                this.angularVelocity.y = turnRate;
            } else {
                this.angularVelocity.y *= 0.8;
            }

            // Ground stabilization
            this.rotation.x *= 0.92;
            this.rotation.z *= 0.92;
        } else {
            // AIRBORNE FLIGHT CONTROLS:
            // "w nina vaiub alla, s nina ülesse, d paremale, a vasakule"
            const pitchInput = inputs.pitch || 0;
            const yawInput = inputs.yaw || 0;

            if (pitchInput !== 0) {
                this.rotation.x += pitchInput * 2.8 * dt; // W: nina alla (-), S: nina üles (+)
            }
            if (yawInput !== 0) {
                this.rotation.y += yawInput * 2.8 * dt; // A: vasakule (+), D: paremale (-)
                this.rotation.z += yawInput * 1.5 * dt; // Banking
            } else {
                this.rotation.z *= Math.pow(0.96, dt * 60);
            }
        }

        // 3. SPACEX THRUSTERS & ROCKET BOOST:
        // "tühikuga õhku, sift on boost"
        this.isThrusterFiring = !!inputs.jumpThruster;
        this.isBoostFiring = !!inputs.boost;

        if (inputs.jumpThruster) {
            if (!this.isAirborne) {
                // Lift-off launch impulse
                this.velocity.y = Math.max(this.velocity.y, 15.0);
            } else {
                // Sustained vertical thruster climb & hover
                this.velocity.y += 32.0 * dt;
            }
        }

        if (inputs.boost) {
            // Rocket boost forward in car heading direction
            this.velocity.addScaledVector(this.forward, 65.0 * dt);
        }

        // Braking & Rolling Friction
        this.isBraking = inputs.brake;
        this.isHandbraking = inputs.handbrake;

        if (inputs.brake && !this.isAirborne) {
            const brakeFriction = config.brakeForce * 2.5;
            this.velocity.x *= Math.max(0, 1 - brakeFriction * dt);
            this.velocity.z *= Math.max(0, 1 - brakeFriction * dt);
        } else if (inputs.handbrake && !this.isAirborne) {
            // Drift slip: reduce lateral grip
            this.velocity.x *= Math.max(0, 1 - 0.8 * dt);
            this.velocity.z *= Math.max(0, 1 - 0.8 * dt);
            this.angularVelocity.y += inputs.steer * 3.8 * dt;
        } else if (!this.isAirborne) {
            // Rolling air resistance & ground drag
            this.velocity.multiplyScalar(Math.pow(0.992, dt * 60));
        }

        // Lateral Tire Grip on ground
        if (!this.isAirborne) {
            const lateralVelocity = this.velocity.dot(right);
            const gripFactor = inputs.handbrake ? 0.45 : 0.94;
            this.velocity.addScaledVector(right, -lateralVelocity * gripFactor * Math.min(1.0, dt * 15.0));
        }

        // Apply angular velocity to rotation
        this.rotation.y += this.angularVelocity.y * dt;

        // Gravity & Ground Plane (Y = 0)
        this.velocity.y -= 25.0 * dt; // Gravity
        this.position.addScaledVector(this.velocity, dt);

        if (this.position.y < groundY) {
            this.position.y = groundY;
            if (this.velocity.y < -2.0) {
                // Ground bump impact
                const vertG = Math.abs(this.velocity.y) * 0.4;
                if (vertG > 3.0 && onImpact) {
                    onImpact(vertG, new THREE.Vector3(0, -0.2, 0), vertG * 6.0);
                }
            }
            this.velocity.y = 0;
        }

        // Wheel spin animation
        this.wheelSpin += (currentSpeedForward / 0.35) * dt;
        this.vehicle.wheels.fl.rotation.x = this.wheelSpin;
        this.vehicle.wheels.fr.rotation.x = this.wheelSpin;
        this.vehicle.wheels.rl.rotation.x = this.wheelSpin;
        this.vehicle.wheels.rr.rotation.x = this.wheelSpin;

        // Update Vehicle Object3D transform
        this.vehicle.root.position.copy(this.position);
        this.vehicle.root.rotation.copy(this.rotation);

        // Speed in KM/H (strictly governed up to 100 km/h)
        const currentSpeedMs = this.velocity.length();
        const maxAllowedMs = (100.0 * 1000.0) / 3600.0; // 27.77 m/s = 100 km/h
        if (currentSpeedMs > maxAllowedMs) {
            this.velocity.multiplyScalar(maxAllowedMs / currentSpeedMs);
        }
        this.speedKmh = Math.min(100, Math.round(this.velocity.length() * 3.6));

        // 3. COLLISION DETECTION & SOFT-BODY DEFORMATION WITH OBSTACLES
        this.carBox.setFromObject(this.vehicle.root);

        for (const obs of obstacles) {
            if (this.carBox.intersectsBox(obs.boundingBox)) {
                // Find contact point between car and obstacle
                const carCenter = this.position.clone();
                const obsCenter = obs.position.clone();
                const contactDir = carCenter.clone().sub(obsCenter);
                contactDir.y = 0;
                contactDir.normalize();

                const preImpactSpeed = this.velocity.length();
                const impactSpeedKmh = preImpactSpeed * 3.6;

                if (preImpactSpeed > 1.2) {
                    // Calculate Impact Force & G-Force strictly proportional to speed
                    const impactG = (preImpactSpeed * preImpactSpeed) / 14.0;
                    this.lastAccelerationG = impactG;

                    // Convert contact point to vehicle local space
                    const localContactPt = new THREE.Vector3(0, 0.4, 0);
                    const headingDot = this.velocity.clone().normalize().dot(this.forward);
                    if (headingDot > 0.35) {
                        localContactPt.z = config.dimensions.length * 0.45; // Front crash
                    } else if (headingDot < -0.35) {
                        localContactPt.z = -config.dimensions.length * 0.45; // Rear crash
                    } else {
                        localContactPt.x = (contactDir.dot(right) > 0 ? 1 : -1) * config.dimensions.width * 0.45; // T-Bone Side crash
                    }

                    // Push vector opposes incoming velocity with speed scaling
                    const speedMultiplier = Math.min(2.5, Math.max(0.2, impactSpeedKmh / 40.0));
                    const deformPush = this.velocity.clone().negate().multiplyScalar(0.45 * speedMultiplier);

                    // Apply soft-body vertex lattice displacement scaled by speed
                    this.vehicle.applyImpactDeformation(localContactPt, deformPush, config.stiffness, impactSpeedKmh);

                    // Rebound physics impulse (metal crunch absorbs energy, high speed = deeper stop)
                    const restitution = impactSpeedKmh > 60 ? 0.12 : 0.28;
                    this.velocity.reflect(contactDir).multiplyScalar(restitution);
                    this.position.addScaledVector(contactDir, 0.35); // unstick

                    // Add spin torque from off-center hits
                    this.angularVelocity.y += (Math.random() - 0.5) * (impactSpeedKmh / 10.0);

                    if (onImpact) {
                        onImpact(impactG, localContactPt, impactSpeedKmh);
                    }
                }
            }
        }
    }
}
