import * as THREE from 'three';
import { CarInputState, CarPhysicsState, Gear, WorldZone } from '../types';
import { VEHICLE_CONFIG } from '../catalog';
import { CarMeshContainer } from '../models/carModel';
import { WorldEnvironment } from '../world/world';

export class CarPhysicsController {
    public state: CarPhysicsState;
    private meshContainer: CarMeshContainer;
    private world: WorldEnvironment;

    private forwardSpeedMps = 0;
    private yaw = Math.PI / 2; // facing East towards the bridge initially
    private verticalVelocity = 0;
    private wheelSpin = 0;
    private currentSteerAngle = 0;

    constructor(
        meshContainer: CarMeshContainer,
        world: WorldEnvironment,
        initialPos = new THREE.Vector3(-100, 0, 0)
    ) {
        this.meshContainer = meshContainer;
        this.world = world;

        this.state = {
            position: initialPos.clone(),
            rotation: new THREE.Euler(0, this.yaw, 0),
            velocity: new THREE.Vector3(),
            speed: 0,
            steeringAngle: 0,
            wheelRotation: 0,
            gear: 'P',
            isDrifting: false,
            isGrounded: true,
            currentZone: 'city'
        };

        this.meshContainer.group.position.copy(this.state.position);
        this.meshContainer.group.rotation.y = this.yaw;
    }

    public update(dt: number, input: CarInputState): void {
        // Clamp delta time to avoid large physics steps
        const delta = Math.min(dt, 0.1);

        if (input.reset) {
            this.resetCar();
            return;
        }

        // 1. Steering computation
        const targetSteer = -input.steer * VEHICLE_CONFIG.maxSteerAngleRad;
        if (Math.abs(targetSteer) > 0.01) {
            this.currentSteerAngle = THREE.MathUtils.damp(
                this.currentSteerAngle,
                targetSteer,
                VEHICLE_CONFIG.steerSpeedRadPerSec,
                delta
            );
        } else {
            this.currentSteerAngle = THREE.MathUtils.damp(
                this.currentSteerAngle,
                0,
                VEHICLE_CONFIG.steerCenteringSpeedRadPerSec,
                delta
            );
        }

        // 2. Throttle & Braking
        const isBraking = input.brake > 0.1 || input.handbrake;
        this.meshContainer.setBraking(isBraking);

        const maxForwardSpeedMps = VEHICLE_CONFIG.maxSpeedKmh / 3.6;
        const maxReverseSpeedMps = VEHICLE_CONFIG.maxReverseSpeedKmh / 3.6;

        if (input.throttle > 0.1) {
            if (this.forwardSpeedMps < -0.5) {
                // Was reversing, now applying forward brakes
                this.forwardSpeedMps += VEHICLE_CONFIG.brakeDeceleration * delta;
            } else {
                this.forwardSpeedMps += input.throttle * VEHICLE_CONFIG.acceleration * delta;
                if (this.forwardSpeedMps > maxForwardSpeedMps) {
                    this.forwardSpeedMps = maxForwardSpeedMps;
                }
            }
        } else if (input.brake > 0.1) {
            if (this.forwardSpeedMps > 0.5) {
                // Forward braking
                this.forwardSpeedMps -= input.brake * VEHICLE_CONFIG.brakeDeceleration * delta;
                if (this.forwardSpeedMps < 0) this.forwardSpeedMps = 0;
            } else {
                // Reverse acceleration
                this.forwardSpeedMps -= input.brake * VEHICLE_CONFIG.reverseAccel * delta;
                if (this.forwardSpeedMps < -maxReverseSpeedMps) {
                    this.forwardSpeedMps = -maxReverseSpeedMps;
                }
            }
        } else {
            // Natural drag / friction
            if (this.forwardSpeedMps > 0) {
                this.forwardSpeedMps -= VEHICLE_CONFIG.naturalDeceleration * delta;
                if (this.forwardSpeedMps < 0) this.forwardSpeedMps = 0;
            } else if (this.forwardSpeedMps < 0) {
                this.forwardSpeedMps += VEHICLE_CONFIG.naturalDeceleration * delta;
                if (this.forwardSpeedMps > 0) this.forwardSpeedMps = 0;
            }
        }

        // Handbrake drift
        if (input.handbrake) {
            this.forwardSpeedMps = THREE.MathUtils.damp(this.forwardSpeedMps, 0, 4.0, delta);
            this.state.isDrifting = Math.abs(this.forwardSpeedMps) > 5 && Math.abs(this.currentSteerAngle) > 0.1;
        } else {
            this.state.isDrifting = false;
        }

        // 3. Angular turn (Yaw)
        // Turning rate is proportional to forward velocity
        const speedRatio = Math.min(Math.abs(this.forwardSpeedMps) / (maxForwardSpeedMps * 0.4), 1.0);
        const directionSign = this.forwardSpeedMps >= 0 ? 1 : -1;
        const driftMultiplier = this.state.isDrifting ? 1.6 : 1.0;
        this.yaw += this.currentSteerAngle * speedRatio * directionSign * 2.2 * driftMultiplier * delta;

        // 4. Position displacement
        const forwardDir = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
        const moveVector = forwardDir.clone().multiplyScalar(this.forwardSpeedMps * delta);

        const nextX = this.state.position.x + moveVector.x;
        const nextZ = this.state.position.z + moveVector.z;

        // Collision detection with buildings and tree trunks
        const carBox = new THREE.Box3(
            new THREE.Vector3(nextX - 1.2, this.state.position.y, nextZ - 1.2),
            new THREE.Vector3(nextX + 1.2, this.state.position.y + 2.0, nextZ + 1.2)
        );

        let collided = false;
        for (const col of this.world.colliders) {
            if (col.intersectsBox(carBox)) {
                collided = true;
                break;
            }
        }

        if (collided) {
            // Rebound bounce
            this.forwardSpeedMps = -this.forwardSpeedMps * 0.35;
        } else {
            this.state.position.x = nextX;
            this.state.position.z = nextZ;
        }

        // 5. Vertical Height & Gravity / Grounding
        const groundY = this.world.getGroundHeight(this.state.position.x, this.state.position.z);
        if (this.state.position.y > groundY + 0.05) {
            this.verticalVelocity -= VEHICLE_CONFIG.gravity * delta;
            this.state.position.y += this.verticalVelocity * delta;
            if (this.state.position.y <= groundY) {
                this.state.position.y = groundY;
                this.verticalVelocity = 0;
                this.state.isGrounded = true;
            } else {
                this.state.isGrounded = false;
            }
        } else {
            // Smoothly climb slope or snap to ground
            this.state.position.y = THREE.MathUtils.damp(this.state.position.y, groundY, 15, delta);
            this.verticalVelocity = 0;
            this.state.isGrounded = true;
        }

        // River water slow down if car plunged into water without bridge
        if (this.state.position.y < -0.2 && Math.abs(this.state.position.x) < 40) {
            this.forwardSpeedMps *= 0.88; // water resistance drag
        }

        // 6. Wheel Visual Updates
        this.wheelSpin += (this.forwardSpeedMps / 0.38) * delta;
        this.meshContainer.updateSteeringAndSpin(this.currentSteerAngle, this.wheelSpin);

        // 7. Update Car Group Position and Rotation
        this.meshContainer.group.position.copy(this.state.position);
        this.meshContainer.group.rotation.set(0, this.yaw, 0);

        // Body roll / tilt during hard turns or speed
        const rollTilt = -this.currentSteerAngle * (this.forwardSpeedMps / maxForwardSpeedMps) * 0.08;
        this.meshContainer.bodyMesh.rotation.z = rollTilt;

        // 8. Update State metrics
        const speedKmh = Math.round(Math.abs(this.forwardSpeedMps) * 3.6);
        this.state.speed = speedKmh;

        let gear: Gear = 'P';
        if (this.forwardSpeedMps > 0.5) gear = 'D';
        else if (this.forwardSpeedMps < -0.5) gear = 'R';
        this.state.gear = gear;

        this.state.currentZone = this.world.getZoneAt(this.state.position.x, this.state.position.z);
    }

    public resetCar(): void {
        this.forwardSpeedMps = 0;
        this.verticalVelocity = 0;
        this.currentSteerAngle = 0;
        // Spawn near the bridge entrance in the city
        this.state.position.set(-60, 0.1, 0);
        this.yaw = Math.PI / 2; // Point toward bridge / forest
        this.meshContainer.group.position.copy(this.state.position);
        this.meshContainer.group.rotation.set(0, this.yaw, 0);
        this.meshContainer.bodyMesh.rotation.set(0, 0, 0);
    }
}
