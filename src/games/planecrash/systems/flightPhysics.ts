import * as THREE from 'three';
import { AircraftConfig, FlightState } from '../types';

export interface FlightControlInputs {
    pitch: number;    // -1 (nose down / W) to 1 (nose up / S)
    roll: number;     // -1 (roll left / A) to 1 (roll right / D)
    yaw: number;      // -1 (rudder left / Q) to 1 (rudder right / E)
    throttleDelta: number; // +1 / -1
}

export class FlightPhysics {
    public config: AircraftConfig;
    public state: FlightState;
    public position: THREE.Vector3 = new THREE.Vector3();
    public velocity: THREE.Vector3 = new THREE.Vector3();
    public rotation: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
    public quaternion: THREE.Quaternion = new THREE.Quaternion();

    // Cumulative stunt tracking
    private prevRoll: number = 0;
    private prevPitch: number = 0;
    private cumulativeRoll: number = 0;
    private cumulativePitch: number = 0;

    public onStunt?: (type: 'spin' | 'loop' | 'dive' | 'close_call', text: string, bonus: number) => void;

    constructor(config: AircraftConfig) {
        this.config = config;
        this.state = this.createInitialState();
    }

    private createInitialState(): FlightState {
        return {
            speedKmh: 180,
            altitude: 120,
            throttle: 0.7,
            isStalling: false,
            isCrashed: false,
            isAirborne: true,
            spin360Accumulator: 0,
            spin360Count: 0,
            loopAccumulator: 0,
            loopCount: 0,
            highestAltitudeReached: 120,
            highestSpeedReached: 180,
            stuntCloseCalls: 0,
            lastCrashReport: null,
            leftWingBroken: false,
            rightWingBroken: false,
            tailBroken: false,
            gearDown: true,
            isLanded: false,
            isFuselageSplit: false,
            landingBonusAwarded: false
        };
    }

    public toggleGear(): boolean {
        this.state.gearDown = !this.state.gearDown;
        return this.state.gearDown;
    }

    public reset(startPos: THREE.Vector3, startYaw: number = 0, initialSpeedKmh: number = 200): void {
        this.position.copy(startPos);
        this.rotation.set(0, startYaw, 0);
        this.quaternion.setFromEuler(this.rotation);

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
        const speedMps = initialSpeedKmh / 3.6;
        this.velocity.copy(forward).multiplyScalar(speedMps);

        this.state = this.createInitialState();
        this.state.speedKmh = initialSpeedKmh;
        this.state.altitude = startPos.y;
        this.prevRoll = 0;
        this.prevPitch = 0;
        this.cumulativeRoll = 0;
        this.cumulativePitch = 0;
    }

    public update(dt: number, inputs: FlightControlInputs): void {
        if (this.state.isCrashed) return;

        // 1. Throttle management
        if (inputs.throttleDelta !== 0) {
            this.state.throttle = THREE.MathUtils.clamp(
                this.state.throttle + inputs.throttleDelta * dt * 0.6,
                0.1,
                1.0
            );
        }

        // 2. Flight Orientation & Aerodynamic Inputs
        const currentSpeedMps = this.velocity.length();
        const currentSpeedKmh = currentSpeedMps * 3.6;
        this.state.speedKmh = currentSpeedKmh;
        this.state.altitude = Math.max(0, this.position.y);

        if (this.state.altitude > this.state.highestAltitudeReached) {
            this.state.highestAltitudeReached = this.state.altitude;
        }
        if (this.state.speedKmh > this.state.highestSpeedReached) {
            this.state.highestSpeedReached = this.state.speedKmh;
        }

        // Control effectiveness increases with airspeed
        const controlAuthority = THREE.MathUtils.clamp(currentSpeedKmh / (this.config.topSpeedKmh * 0.4), 0.3, 1.2);

        let pitchDelta = inputs.pitch * this.config.pitchRate * controlAuthority * dt;
        let rollDelta = -inputs.roll * this.config.rollRate * controlAuthority * dt;
        let yawDelta = -inputs.yaw * this.config.yawRate * controlAuthority * dt;

        // Asymmetric aerodynamics & death spin when parts are ripped off:
        if (this.state.leftWingBroken) {
            rollDelta -= 6.5 * dt; // Violent death roll to the left
            pitchDelta -= 2.0 * dt; // Uncontrolled nose drop
            yawDelta -= 3.5 * dt;  // Yaw drag towards broken side
        }
        if (this.state.rightWingBroken) {
            rollDelta += 6.5 * dt; // Violent death roll to the right
            pitchDelta -= 2.0 * dt;
            yawDelta += 3.5 * dt;
        }
        if (this.state.tailBroken) {
            pitchDelta -= 4.0 * dt; // Loss of elevator authority causes violent dive
            yawDelta += 5.2 * dt;   // Loss of vertical stabilizer causes flat spin
        }

        // Apply local rotation deltas
        const deltaQuat = new THREE.Quaternion();
        const eulerDelta = new THREE.Euler(pitchDelta, yawDelta, rollDelta, 'YXZ');
        deltaQuat.setFromEuler(eulerDelta);
        this.quaternion.multiply(deltaQuat);
        this.quaternion.normalize();

        // 3. Direction Vectors
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion);

        // 4. Aerodynamic Forces (Thrust, Lift, Drag, Gravity)
        if (this.state.isLanded) {
            // Aircraft has touched down smoothly on wheels:
            // Zero out vertical velocity, level pitch/roll, and apply wheel braking + friction
            this.velocity.y = 0;
            this.state.throttle = THREE.MathUtils.clamp(this.state.throttle - dt * 0.5, 0, 1);

            // Ground friction & braking deceleration: smooth stop
            const brakingPower = 18.0; // m/s^2
            const currentSpeed = this.velocity.length();
            if (currentSpeed > 0.05) {
                const newSpeed = Math.max(0, currentSpeed - brakingPower * dt);
                this.velocity.normalize().multiplyScalar(newSpeed);
            } else {
                this.velocity.set(0, 0, 0);
            }

            // Level out airplane on its landing gear
            const currentEuler = new THREE.Euler().setFromQuaternion(this.quaternion, 'YXZ');
            currentEuler.x = THREE.MathUtils.lerp(currentEuler.x, 0, dt * 6.0); // Level pitch
            currentEuler.z = THREE.MathUtils.lerp(currentEuler.z, 0, dt * 6.0); // Level roll
            this.quaternion.setFromEuler(currentEuler);
        } else {
            const maxThrust = (this.config.acceleration * this.config.mass * 0.4);
            const thrustForce = forward.clone().multiplyScalar(this.state.throttle * maxThrust);

            // Drag: proportional to speed squared
            const dragFactor = (this.config.mass * 0.0035) / Math.max(1, this.config.liftCoefficient);
            const dragForce = this.velocity.clone().normalize().multiplyScalar(-0.5 * dragFactor * currentSpeedMps * currentSpeedMps);

            // Lift: perpendicular to wings (along local up vector)
            const liftForceMagnitude = this.config.liftCoefficient * (this.config.mass * 9.8) * Math.min(2.0, (currentSpeedMps / 50));
            const liftForce = up.clone().multiplyScalar(liftForceMagnitude);

            // Gravity
            const gravityForce = new THREE.Vector3(0, -9.8 * this.config.mass, 0);

            // Net Acceleration
            const totalForce = new THREE.Vector3()
                .add(thrustForce)
                .add(dragForce)
                .add(liftForce)
                .add(gravityForce);

            const acceleration = totalForce.divideScalar(this.config.mass);
            this.velocity.addScaledVector(acceleration, dt);

            // Velocity alignment: streamline airplane velocity towards heading
            const alignmentFactor = THREE.MathUtils.clamp(dt * 4.0, 0, 0.85);
            this.velocity.lerp(forward.clone().multiplyScalar(this.velocity.length()), alignmentFactor);

            // Cap speed to top speed + dive allowance
            const maxMps = (this.config.topSpeedKmh * 1.3) / 3.6;
            if (this.velocity.length() > maxMps) {
                this.velocity.setLength(maxMps);
            }
        }

        // 5. Update Position
        this.position.addScaledVector(this.velocity, dt);

        // 6. Stunt Tracker: 360° Rolls & Loops
        this.trackStunts(rollDelta, pitchDelta);
    }

    private trackStunts(rollDelta: number, pitchDelta: number): void {
        // Track roll delta for 360° spin
        this.cumulativeRoll += Math.abs(rollDelta);
        if (this.cumulativeRoll >= Math.PI * 2) {
            this.state.spin360Count += 1;
            this.cumulativeRoll -= Math.PI * 2;
            if (this.onStunt) {
                this.onStunt('spin', `🌀 360° SPINN #${this.state.spin360Count}! (+150 🪙)`, 150);
            }
        }

        // Track pitch delta for 360° vertical loop
        this.cumulativePitch += Math.abs(pitchDelta);
        if (this.cumulativePitch >= Math.PI * 2) {
            this.state.loopCount += 1;
            this.cumulativePitch -= Math.PI * 2;
            if (this.onStunt) {
                this.onStunt('loop', `🔁 VERTIKAALNE LUUP #${this.state.loopCount}! (+200 🪙)`, 200);
            }
        }
    }
}
