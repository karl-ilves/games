import * as THREE from 'three';
import { AircraftConfig, AircraftMeshBundle, FlightStateData } from '../types';

export class FlightPhysicsController {
    public state: FlightStateData;
    public config: AircraftConfig;
    public meshBundle: AircraftMeshBundle;

    public position: THREE.Vector3;
    public velocity: THREE.Vector3;
    public rotationEuler: THREE.Euler;
    public quaternion: THREE.Quaternion;

    private groundLevel: number = 1.0;
    private minGearY: number = 1.2;

    constructor(meshBundle: AircraftMeshBundle, config: AircraftConfig, spawnPos: THREE.Vector3) {
        this.meshBundle = meshBundle;
        this.config = config;

        this.position = spawnPos.clone();
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotationEuler = new THREE.Euler(0, -Math.PI / 2, 0, 'YXZ'); // Heading 090 (East along runway)
        this.quaternion = new THREE.Quaternion().setFromEuler(this.rotationEuler);

        this.minGearY = config.category === 'Commercial' ? 2.0 : (config.category === 'Fighter' ? 1.4 : 1.1);

        this.state = {
            throttle: 0,
            airspeed: 0,
            groundSpeed: 0,
            altitude: 10,
            verticalSpeed: 0,
            heading: 90,
            pitch: 0,
            roll: 0,
            gearDown: true,
            gearTransition: 1.0,
            flaps: 0,
            brakes: true,
            airbrakes: false,
            afterburner: false,
            autopilot: false,
            targetAltitude: 2500,
            targetHeading: 90,
            stalled: false,
            gForce: 1.0,
            fuelPercent: 100,
            antiIce: true,
            emergency: 'none',
            isCrashed: false,
            isOnGround: true
        };

        this.updateMeshTransforms();
    }

    public update(
        delta: number,
        inputs: {
            pitch: number; // -1 (nose down) to +1 (nose up)
            roll: number;  // -1 (bank left) to +1 (bank right)
            yaw: number;   // -1 (left) to +1 (right)
            throttleDelta: number;
            toggleGear?: boolean;
            toggleFlaps?: boolean;
            toggleBrakes?: boolean;
            toggleAP?: boolean;
        }
    ): void {
        if (this.state.isCrashed) return;

        // 1. Throttle & Afterburner
        if (inputs.throttleDelta !== 0) {
            this.state.throttle = THREE.MathUtils.clamp(this.state.throttle + inputs.throttleDelta * delta * 0.45, 0, 1.0);
            if (this.state.throttle > 0.05) {
                this.state.brakes = false;
            }
        }

        // Out of fuel emergency
        if (this.state.emergency === 'fuel_empty') {
            this.state.throttle = 0;
            this.state.fuelPercent = 0;
        }

        // Afterburner logic for fighters
        this.state.afterburner = !!this.config.hasAfterburner && this.state.throttle > 0.95;

        // 2. Landing Gear & Flap Toggles
        if (inputs.toggleGear) {
            if (this.state.emergency !== 'gear_fail') {
                this.state.gearDown = !this.state.gearDown;
            }
        }
        if (inputs.toggleFlaps) {
            this.state.flaps = (this.state.flaps + 1) % 3;
        }
        if (inputs.toggleBrakes) {
            this.state.brakes = !this.state.brakes;
        }
        if (inputs.toggleAP) {
            this.state.autopilot = !this.state.autopilot;
            if (this.state.autopilot) {
                this.state.targetAltitude = Math.max(1000, Math.round(this.state.altitude / 500) * 500);
                this.state.targetHeading = Math.round(this.state.heading);
            }
        }

        // Smooth Gear Transition
        const targetGearTrans = this.state.gearDown ? 1.0 : 0.0;
        this.state.gearTransition = THREE.MathUtils.damp(this.state.gearTransition, targetGearTrans, 3.5, delta);

        // 3. Current Orientation Vectors
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion);

        // 4. Airspeed & Aerodynamics
        const currentSpeedMs = this.velocity.length();
        const currentSpeedKnots = currentSpeedMs * 1.94384;
        this.state.airspeed = currentSpeedKnots;

        // Thrust Force
        let maxThrustAccel = (this.config.maxSpeedKnots / 3.6) * 0.45;
        if (this.state.afterburner) maxThrustAccel *= 1.6;
        if (this.state.emergency === 'engine_fire') maxThrustAccel *= 0.35;

        const thrustForce = forward.clone().multiplyScalar(this.state.throttle * maxThrustAccel);

        // Dynamic Drag (Parasitic + Gear + Flaps + Brakes)
        let dragCoeff = 0.00045;
        if (this.state.gearTransition > 0.1) dragCoeff += 0.00025 * this.state.gearTransition;
        if (this.state.flaps > 0) dragCoeff += 0.0002 * this.state.flaps;
        if (this.state.brakes && this.state.isOnGround) dragCoeff += 0.004;

        const dragForce = this.velocity.clone().multiplyScalar(-dragCoeff * currentSpeedMs * currentSpeedMs);

        // Lift Force: proportional to airspeed squared and angle of attack
        const stallSpeed = this.config.stallSpeedKnots;
        const speedRatio = THREE.MathUtils.clamp(currentSpeedKnots / Math.max(1, stallSpeed), 0, 3.0);
        
        // Stall detection
        this.state.stalled = !this.state.isOnGround && currentSpeedKnots < stallSpeed && this.state.altitude > 20;

        let liftMagnitude = 9.81 * Math.min(1.8, Math.pow(speedRatio, 1.4));
        if (this.state.flaps === 1) liftMagnitude *= 1.2;
        if (this.state.flaps === 2) liftMagnitude *= 1.35;
        if (this.state.stalled) liftMagnitude *= 0.35;

        const liftForce = up.clone().multiplyScalar(liftMagnitude);
        const gravityForce = new THREE.Vector3(0, -9.81, 0);

        // 5. Autopilot Inputs (Overrides pitch & roll when engaged)
        let activePitchInput = inputs.pitch;
        let activeRollInput = inputs.roll;
        let activeYawInput = inputs.yaw;

        if (this.state.autopilot && !this.state.isOnGround) {
            // Altitude hold
            const altErr = this.state.targetAltitude - this.state.altitude;
            const targetPitch = THREE.MathUtils.clamp(altErr * 0.02, -15, 15);
            activePitchInput = (targetPitch - this.state.pitch) * 0.12;

            // Wings leveling (roll -> 0)
            activeRollInput = -this.state.roll * 0.08;

            // Autopilot throttle adjustment for cruise speed
            const speedErr = this.config.cruiseSpeedKnots - currentSpeedKnots;
            this.state.throttle = THREE.MathUtils.clamp(this.state.throttle + speedErr * 0.002 * delta, 0.4, 0.95);
        }

        // Turbulence emergency
        if (this.state.emergency === 'turbulence' && !this.state.isOnGround) {
            activeRollInput += (Math.random() - 0.5) * 0.6;
            activePitchInput += (Math.random() - 0.5) * 0.4;
        }

        // Wing damage emergency (rolls to left)
        if (this.state.emergency === 'wing_damage' && !this.state.isOnGround) {
            activeRollInput -= 0.35;
        }

        // 6. Angular Controls Scaling (Higher airspeed = more responsive control surfaces)
        const controlAuthority = this.state.isOnGround 
            ? Math.min(1.0, currentSpeedKnots / 30) 
            : THREE.MathUtils.clamp(currentSpeedKnots / (stallSpeed * 0.8), 0.25, 1.4);

        const pitchRate = THREE.MathUtils.degToRad(this.config.pitchRateDegSec) * controlAuthority * delta;
        const rollRate = THREE.MathUtils.degToRad(this.config.rollRateDegSec) * controlAuthority * delta;
        const yawRate = THREE.MathUtils.degToRad(this.config.yawRateDegSec) * controlAuthority * delta;

        // Apply control surface rotations
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(right, activePitchInput * pitchRate);
        const rollQuat = new THREE.Quaternion().setFromAxisAngle(forward, -activeRollInput * rollRate);
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(up, -activeYawInput * yawRate);

        this.quaternion.multiply(pitchQuat);
        this.quaternion.multiply(rollQuat);
        this.quaternion.multiply(yawQuat);

        // Ground steer nosewheel
        if (this.state.isOnGround && Math.abs(inputs.yaw) > 0.05) {
            const steerAngle = -inputs.yaw * 0.6 * delta;
            const groundSteerQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), steerAngle);
            this.quaternion.multiply(groundSteerQuat);
        }

        // 7. Integrate Linear Physics
        const totalAccel = new THREE.Vector3()
            .add(thrustForce)
            .add(dragForce)
            .add(liftForce)
            .add(gravityForce);

        this.velocity.addScaledVector(totalAccel, delta);

        // Ground constraint & Touchdown
        const minAlt = this.groundLevel + this.minGearY * this.state.gearTransition;
        if (this.position.y <= minAlt) {
            this.position.y = minAlt;
            this.state.isOnGround = true;

            // Touchdown evaluation
            const vspeedFpm = this.velocity.y * 196.85;
            if (this.velocity.y < -0.1) {
                this.velocity.y = 0;
            }

            // Normal ground friction
            this.velocity.x *= 0.98;
            this.velocity.z *= 0.98;

            if (this.state.brakes) {
                this.velocity.multiplyScalar(0.92);
            }

            // Level out roll and pitch gently when resting on runway
            const curEuler = new THREE.Euler().setFromQuaternion(this.quaternion, 'YXZ');
            curEuler.z = THREE.MathUtils.damp(curEuler.z, 0, 4.0, delta);
            curEuler.x = THREE.MathUtils.damp(curEuler.x, 0, 4.0, delta);
            this.quaternion.setFromEuler(curEuler);

        } else {
            this.state.isOnGround = false;
        }

        // Apply Velocity to Position
        this.position.addScaledVector(this.velocity, delta);

        // 8. Update Readout Data for Instruments
        this.rotationEuler.setFromQuaternion(this.quaternion, 'YXZ');
        this.state.pitch = THREE.MathUtils.radToDeg(this.rotationEuler.x);
        this.state.roll = THREE.MathUtils.radToDeg(this.rotationEuler.z);

        let headingDeg = (360 - THREE.MathUtils.radToDeg(this.rotationEuler.y)) % 360;
        if (headingDeg < 0) headingDeg += 360;
        this.state.heading = headingDeg;

        this.state.altitude = Math.max(0, Math.round(this.position.y * 3.28084)); // meters to feet
        this.state.verticalSpeed = Math.round(this.velocity.y * 196.85); // m/s to ft/min
        this.state.groundSpeed = Math.round(new THREE.Vector2(this.velocity.x, this.velocity.z).length() * 1.94384);

        // Update Three.js Meshes & Animations
        this.updateMeshTransforms();
        this.animateSubcomponents(delta);
    }

    private updateMeshTransforms(): void {
        this.meshBundle.group.position.copy(this.position);
        this.meshBundle.group.quaternion.copy(this.quaternion);
    }

    private animateSubcomponents(delta: number): void {
        // Propellers spin proportional to throttle + airspeed
        const propSpeed = (15 + this.state.throttle * 75) * delta;
        this.meshBundle.propellers.forEach(p => {
            p.rotation.z += propSpeed;
        });

        // Retractable gear animation
        const gearY = THREE.MathUtils.lerp(this.meshBundle.gearUpY, this.meshBundle.gearDownY, this.state.gearTransition);
        this.meshBundle.landingGears.forEach(g => {
            g.position.y = gearY;
            g.visible = this.state.gearTransition > 0.05;
        });
    }

    public resetPlane(spawnPos: THREE.Vector3, headingDeg: number = 90): void {
        this.position.copy(spawnPos);
        this.velocity.set(0, 0, 0);
        this.rotationEuler.set(0, -THREE.MathUtils.degToRad(headingDeg), 0, 'YXZ');
        this.quaternion.setFromEuler(this.rotationEuler);

        this.state.throttle = 0;
        this.state.airspeed = 0;
        this.state.gearDown = true;
        this.state.gearTransition = 1.0;
        this.state.flaps = 0;
        this.state.brakes = true;
        this.state.autopilot = false;
        this.state.stalled = false;
        this.state.isCrashed = false;
        this.state.isOnGround = true;

        this.updateMeshTransforms();
    }
}
