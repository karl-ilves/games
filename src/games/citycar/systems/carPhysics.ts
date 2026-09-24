import * as THREE from 'three';
import { CarInputState, CarPhysicsState, Gear, WorldZone } from '../types';
import { VEHICLE_CONFIG } from '../catalog';
import { CarMeshContainer } from '../models/carModel';
import { WorldEnvironment } from '../world/world';

export const MAP_BOUNDS = {
    minX: -360,
    maxX: 360,
    minZ: -270,
    maxZ: 270
};

export class CarPhysicsController {
    public state: CarPhysicsState;
    public onLampHit?: () => void;
    public onTreeHit?: () => void;
    public onBuildingHit?: () => void;
    public onWaterDive?: () => void;
    public onOffroadDrive?: () => void;
    public onCrashDeath?: (info: { reason: string; speedKmh: number; isMidAir?: boolean }) => void;
    public onGroundCrashImpact?: () => void;
    private meshContainer: CarMeshContainer;
    private world: WorldEnvironment;

    private isDead = false;
    private launchedFromRamp = false;
    private fallingAfterCrash = false;
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

        if (this.isDead) {
            this.forwardSpeedMps = 0;
            this.state.speed = 0;
            this.state.velocity.set(0, 0, 0);

            if (this.fallingAfterCrash) {
                const groundY = this.world.getGroundHeight(this.state.position.x, this.state.position.z);
                if (this.state.position.y > groundY + 0.05) {
                    this.verticalVelocity -= VEHICLE_CONFIG.gravity * delta;
                    this.state.position.y += this.verticalVelocity * delta;
                    // Tumble slightly in mid-air as car plunges down
                    this.meshContainer.group.rotation.x += 1.6 * delta;
                    this.meshContainer.group.rotation.z += 1.2 * delta;
                    if (this.state.position.y <= groundY) {
                        this.state.position.y = groundY;
                        this.verticalVelocity = 0;
                        this.fallingAfterCrash = false;
                        this.meshContainer.group.rotation.x = 0;
                        this.meshContainer.group.rotation.z = 0;
                        this.onGroundCrashImpact?.();
                    }
                } else {
                    this.state.position.y = groundY;
                    this.verticalVelocity = 0;
                    this.fallingAfterCrash = false;
                    this.meshContainer.group.rotation.x = 0;
                    this.meshContainer.group.rotation.z = 0;
                    this.onGroundCrashImpact?.();
                }
                this.meshContainer.group.position.copy(this.state.position);
            }
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
                // Forward braking (softer deceleration during drift to carry momentum smoothly)
                const isDriftBraking = Math.abs(this.currentSteerAngle) > 0.06 && this.forwardSpeedMps > 2.8;
                const brakeDecel = isDriftBraking ? VEHICLE_CONFIG.brakeDeceleration * 0.45 : VEHICLE_CONFIG.brakeDeceleration;
                this.forwardSpeedMps -= input.brake * brakeDecel * delta;
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

        // Drift check:
        // User requirement: "ja kui sa pidurdas ja põõrad sa saad triftida ja jälg jääb ma peal eja jälg kaob ära 1 min pärast"
        const isBrakingWhileTurning = (input.brake > 0.15 || input.handbrake) && Math.abs(this.currentSteerAngle) > 0.06 && Math.abs(this.forwardSpeedMps) > 2.8;

        if (isBrakingWhileTurning) {
            this.state.isDrifting = true;
        } else if (input.handbrake && Math.abs(this.forwardSpeedMps) > 3.0 && Math.abs(this.currentSteerAngle) > 0.05) {
            this.state.isDrifting = true;
        } else {
            this.state.isDrifting = false;
        }

        // 3. Angular turn (Yaw)
        // Turning rate is proportional to forward velocity
        const speedRatio = Math.min(Math.abs(this.forwardSpeedMps) / (maxForwardSpeedMps * 0.4), 1.0);
        const directionSign = this.forwardSpeedMps >= 0 ? 1 : -1;
        const driftMultiplier = this.state.isDrifting ? 2.1 : 1.0;
        this.yaw += this.currentSteerAngle * speedRatio * directionSign * 2.2 * driftMultiplier * delta;

        // 4. Position displacement
        const forwardDir = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
        const moveVector = forwardDir.clone().multiplyScalar(this.forwardSpeedMps * delta);

        if (this.state.isDrifting) {
            // Lateral slide momentum during drift
            const slideSign = this.currentSteerAngle >= 0 ? 1 : -1;
            const lateralDir = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
            moveVector.addScaledVector(lateralDir, slideSign * Math.abs(this.forwardSpeedMps) * 0.32 * delta);
        }

        const nextX = this.state.position.x + moveVector.x;
        const nextZ = this.state.position.z + moveVector.z;

        // Collision detection with street lamps (knock down / topple over)
        if (this.world.streetLamps) {
            for (const lamp of this.world.streetLamps) {
                if (!lamp.isFalling && !lamp.isFallen) {
                    const dx = nextX - lamp.basePos.x;
                    const dz = nextZ - lamp.basePos.z;
                    const distSq = dx * dx + dz * dz;
                    if (distSq < 4.2) { // hit radius ~2.0m
                        lamp.isFalling = true;
                        let hitX = Math.sin(this.yaw);
                        let hitZ = Math.cos(this.yaw);
                        if (Math.abs(this.forwardSpeedMps) < 1.0) {
                            hitX = dx;
                            hitZ = dz;
                        }
                        const hitDir = new THREE.Vector3(hitX, 0, hitZ).normalize();
                        lamp.fallAxis.set(-hitDir.z, 0, hitDir.x).normalize();

                        // Resistance from knocking down the post
                        this.forwardSpeedMps *= 0.75;
                        this.onLampHit?.();
                    }
                }
            }
        }

        // Collision detection with trees (breaks into 2 pieces: stump + toppling crown)
        // User: "puud lähevvad ka tänavapostide alla" -> counts under lamp hits!
        if (this.world.trees) {
            for (const tree of this.world.trees) {
                if (!tree.isFalling && !tree.isFallen) {
                    const dx = nextX - tree.basePos.x;
                    const dz = nextZ - tree.basePos.z;
                    const distSq = dx * dx + dz * dz;
                    if (distSq < 4.8) { // hit radius ~2.2m
                        tree.isFalling = true;
                        let hitX = Math.sin(this.yaw);
                        let hitZ = Math.cos(this.yaw);
                        if (Math.abs(this.forwardSpeedMps) < 1.0) {
                            hitX = dx;
                            hitZ = dz;
                        }
                        const hitDir = new THREE.Vector3(hitX, 0, hitZ).normalize();
                        tree.fallAxis.set(-hitDir.z, 0, hitDir.x).normalize();

                        // Resistance from snapping trunk
                        this.forwardSpeedMps *= 0.75;
                        this.onTreeHit?.();
                        this.onLampHit?.();
                    }
                }
            }
        }

        // Collision detection with buildings and perimeter walls
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

        // Ramp side collision check (User: "kui ma sõidan rambile küljepealt jääb auto seisma ja aga kui ma lähen õigest kohast siis lendan")
        const rampInteraction = this.world.checkRampInteraction(
            this.state.position.x,
            this.state.position.y,
            this.state.position.z,
            nextX,
            nextZ
        );

        let clampedX = nextX;
        let clampedZ = nextZ;

        let rampSideHit = false;
        if (rampInteraction.isSideHit) {
            // Hit the solid side barrier of the ramp -> Stop / bounce car slightly!
            // IMPORTANT: User requested: "kui rambi pihta sõidan siis politseid ei tule"
            // Do NOT call this.onBuildingHit?.() to prevent summoning police or gaining wanted stars!
            rampSideHit = true;
            this.forwardSpeedMps = -this.forwardSpeedMps * 0.25;
            clampedX = this.state.position.x;
            clampedZ = this.state.position.z;
        }

        // Strict map boundary clamping (User: "mapist välja sõita ei saa")
        let hitBoundary = false;
        if (clampedX < MAP_BOUNDS.minX) {
            clampedX = MAP_BOUNDS.minX;
            hitBoundary = true;
        } else if (clampedX > MAP_BOUNDS.maxX) {
            clampedX = MAP_BOUNDS.maxX;
            hitBoundary = true;
        }

        if (clampedZ < MAP_BOUNDS.minZ) {
            clampedZ = MAP_BOUNDS.minZ;
            hitBoundary = true;
        } else if (clampedZ > MAP_BOUNDS.maxZ) {
            clampedZ = MAP_BOUNDS.maxZ;
            hitBoundary = true;
        }

        if (hitBoundary) {
            // Rebound slightly from boundary fence and clamp position
            this.forwardSpeedMps = -this.forwardSpeedMps * 0.3;
            this.state.position.x = clampedX;
            this.state.position.z = clampedZ;
        } else if (rampSideHit) {
            // Hit ramp side wall: stopped/bounced without alerting police!
            this.state.position.x = clampedX;
            this.state.position.z = clampedZ;
        } else if (collided) {
            // Rebound bounce / stop against building or fence obstacle
            const impactSpeed = this.forwardSpeedMps;
            this.forwardSpeedMps = -this.forwardSpeedMps * 0.35;
            this.onBuildingHit?.();

            if (!this.isDead && (Math.abs(impactSpeed) > 1.2 || !this.state.isGrounded || this.launchedFromRamp)) {
                const currentGroundY = this.world.getGroundHeight(this.state.position.x, this.state.position.z);
                const isMidAir = !this.state.isGrounded || this.state.position.y > currentGroundY + 0.4 || this.launchedFromRamp;

                this.isDead = true;
                this.forwardSpeedMps = 0;
                this.state.speed = 0;
                this.state.velocity.set(0, 0, 0);

                if (isMidAir) {
                    this.fallingAfterCrash = true;
                    this.verticalVelocity = Math.min(this.verticalVelocity, -2.5);
                    // Rebound car slightly back from the building wall so it falls cleanly in air
                    this.state.position.x -= Math.sin(this.yaw) * 0.5;
                    this.state.position.z -= Math.cos(this.yaw) * 0.5;
                } else {
                    this.fallingAfterCrash = false;
                    this.verticalVelocity = 0;
                }

                this.onCrashDeath?.({
                    reason: isMidAir
                        ? 'Hüppasid rambilt ja lendasid õhus suure hooga vastu maja! Terve auto purunes täielikult!'
                        : 'Sõitsid suurel kiirusel hoone seina sisse ja auto esiosa purunes!',
                    speedKmh: Math.round(Math.abs(impactSpeed) * 3.6),
                    isMidAir
                });
            }
        } else {
            this.state.position.x = clampedX;
            this.state.position.z = clampedZ;

            // Check off-road driving in city grass
            if (this.state.currentZone === 'city' && Math.abs(this.forwardSpeedMps) > 4.0) {
                // If far from all roads
                const distZ = Math.min(Math.abs(this.state.position.z), Math.abs(this.state.position.z - 120), Math.abs(this.state.position.z + 120));
                const distX = Math.min(Math.abs(this.state.position.x - (-80)), Math.abs(this.state.position.x - (-160)), Math.abs(this.state.position.x - (-240)));
                if (distZ > 10.0 && distX > 10.0) {
                    this.onOffroadDrive?.();
                }
            }
        }

        // Safeguard against falling into void / deep river
        if (this.state.position.y < -3.5) {
            this.resetCar();
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
                this.launchedFromRamp = false;
            } else {
                this.state.isGrounded = false;
            }
        } else {
            // When driving onto a ramp or slope, capture climb speed for launch momentum
            const climbSpeed = (groundY - this.state.position.y) / Math.max(delta, 0.001);
            if (climbSpeed > 0.6) {
                this.verticalVelocity = Math.min(climbSpeed * 0.9, 16.0);
            } else {
                this.verticalVelocity = 0;
            }
            // User: "aga kui ma lähen õigest kohast siis lendan" -> Launch with huge upward momentum at ramp peak!
            if (rampInteraction.isLaunching && Math.abs(this.forwardSpeedMps) > 2.5) {
                const launchKick = Math.abs(this.forwardSpeedMps) * 0.55 + 7.5;
                this.verticalVelocity = Math.max(this.verticalVelocity, launchKick);
                this.launchedFromRamp = true;
            } else {
                this.launchedFromRamp = false;
            }
            this.state.position.y = groundY;
            this.state.isGrounded = true;
        }

        // River water slow down if car plunged into water without bridge
        if (this.state.position.y < -0.2 && Math.abs(this.state.position.x) < 40) {
            this.forwardSpeedMps *= 0.88; // water resistance drag
            this.onWaterDive?.();
        }

        // 6. Wheel Visual Updates
        this.wheelSpin += (this.forwardSpeedMps / 0.38) * delta;
        this.meshContainer.updateSteeringAndSpin(this.currentSteerAngle, this.wheelSpin);

        // 7. Update Car Group Position and Rotation
        this.meshContainer.group.position.copy(this.state.position);
        this.meshContainer.group.rotation.set(0, this.yaw, 0);

        // Body roll / tilt during hard turns or speed & pitch tilt in mid-air
        const rollTilt = -this.currentSteerAngle * (this.forwardSpeedMps / maxForwardSpeedMps) * 0.08;
        const pitchTilt = !this.state.isGrounded ? THREE.MathUtils.clamp(-this.verticalVelocity * 0.025, -0.3, 0.3) : 0;
        this.meshContainer.bodyMesh.rotation.z = rollTilt;
        this.meshContainer.bodyMesh.rotation.x = pitchTilt;

        // 8. Update State metrics
        const speedKmh = Math.round(Math.abs(this.forwardSpeedMps) * 3.6);
        this.state.speed = speedKmh;

        let gear: Gear = 'P';
        if (this.forwardSpeedMps > 0.5) gear = 'D';
        else if (this.forwardSpeedMps < -0.5) gear = 'R';
        this.state.gear = gear;

        this.state.currentZone = this.world.getZoneAt(this.state.position.x, this.state.position.z);
    }

    public isCarDead(): boolean {
        return this.isDead;
    }

    public isFallingAfterCrash(): boolean {
        return this.fallingAfterCrash;
    }

    public setFallingAfterCrash(falling: boolean): void {
        this.fallingAfterCrash = falling;
        if (falling) {
            this.isDead = true;
            this.forwardSpeedMps = 0;
            this.state.speed = 0;
            this.state.velocity.set(0, 0, 0);
            this.verticalVelocity = Math.min(this.verticalVelocity, -1.0);
        }
    }

    public hasLaunchedFromRamp(): boolean {
        return this.launchedFromRamp;
    }

    public setLaunchedFromRamp(launched: boolean): void {
        this.launchedFromRamp = launched;
    }

    public killCar(reason = 'Sõitsid suurel kiirusel hoone seina sisse ja auto esiosa purunes!', isMidAir?: boolean): void {
        if (this.isDead) return;
        this.isDead = true;
        const currentGroundY = this.world.getGroundHeight(this.state.position.x, this.state.position.z);
        const midAir = isMidAir !== undefined ? isMidAir : (!this.state.isGrounded || this.state.position.y > currentGroundY + 0.4 || this.launchedFromRamp);
        const spd = Math.max(15, Math.round(Math.abs(this.forwardSpeedMps) * 3.6));
        this.forwardSpeedMps = 0;
        this.state.speed = 0;
        this.state.velocity.set(0, 0, 0);
        if (midAir) {
            this.fallingAfterCrash = true;
            this.verticalVelocity = Math.min(this.verticalVelocity, -2.5);
            this.state.position.x -= Math.sin(this.yaw) * 0.5;
            this.state.position.z -= Math.cos(this.yaw) * 0.5;
        } else {
            this.fallingAfterCrash = false;
            this.verticalVelocity = 0;
        }
        this.onCrashDeath?.({
            reason,
            speedKmh: spd,
            isMidAir: midAir
        });
    }

    public resetCar(): void {
        this.isDead = false;
        this.fallingAfterCrash = false;
        this.launchedFromRamp = false;
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

    public getRearWheelWorldPositions(): { left: THREE.Vector3; right: THREE.Vector3 } {
        const cosY = Math.cos(this.yaw);
        const sinY = Math.sin(this.yaw);
        const px = this.state.position.x;
        const pz = this.state.position.z;

        // Rear left wheel: local (-0.95, -1.35)
        const left = new THREE.Vector3(
            px + (-0.95) * cosY + (-1.35) * sinY,
            this.state.position.y,
            pz - (-0.95) * sinY + (-1.35) * cosY
        );

        // Rear right wheel: local (0.95, -1.35)
        const right = new THREE.Vector3(
            px + 0.95 * cosY + (-1.35) * sinY,
            this.state.position.y,
            pz - 0.95 * sinY + (-1.35) * cosY
        );

        return { left, right };
    }
}
