import * as THREE from 'three';
import { CarInputState, CarPhysicsState, Gear, WorldZone } from '../types';
import { VEHICLE_CONFIG } from '../catalog';
import { CarMeshContainer } from '../models/carModel';
import { WorldEnvironment, BuildingObject } from '../world/world';

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
    private isDrifting = false;
    private driftAngle = 0;
    private driftLateralVelocity = 0;
    private driftCooldown = 0;
    public isDrivingThroughBuilding = false;
    public penetratingBuilding?: BuildingObject;
    public driveThroughDistance = 0;

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

        // Drift check & powerslide continuity:
        // User requirement: "ja kui sa pidurdas ja põõrad sa saad triftida ja jälg jääb ma peal eja jälg kaob ära 1 min pärast"
        const initiatesDrift = (input.brake > 0.15 || input.handbrake) && Math.abs(this.currentSteerAngle) > 0.05 && this.forwardSpeedMps > 2.8;

        if (initiatesDrift) {
            this.isDrifting = true;
            this.driftCooldown = 0.55; // grace period allowing throttle powerslide through the turn
        } else if (this.isDrifting) {
            this.driftCooldown -= delta;
            const isSteering = Math.abs(input.steer) > 0.04 || Math.abs(this.currentSteerAngle) > 0.04;
            // Maintain drift while speed is held and driver steers or countersteers
            if (this.forwardSpeedMps > 2.2 && (isSteering || this.driftCooldown > 0)) {
                this.isDrifting = true;
            } else {
                this.isDrifting = false;
                this.driftCooldown = 0;
            }
        } else {
            this.isDrifting = false;
            this.driftCooldown = 0;
        }
        this.state.isDrifting = this.isDrifting;

        if (input.throttle > 0.1) {
            if (this.forwardSpeedMps < -0.5) {
                // Was reversing, now applying forward brakes
                this.forwardSpeedMps += VEHICLE_CONFIG.brakeDeceleration * delta;
            } else {
                // Accelerate forward (powerslide through drift)
                const accelFactor = this.isDrifting ? 0.9 : 1.0;
                this.forwardSpeedMps += input.throttle * VEHICLE_CONFIG.acceleration * accelFactor * delta;
                if (this.forwardSpeedMps > maxForwardSpeedMps) {
                    this.forwardSpeedMps = maxForwardSpeedMps;
                }
            }
        } else if (input.brake > 0.1) {
            if (this.forwardSpeedMps > 0.5) {
                // Forward braking (use driftBrakeDecel during drift so momentum smoothly carries into slide)
                const brakeRate = this.isDrifting ? VEHICLE_CONFIG.driftBrakeDecel : VEHICLE_CONFIG.brakeDeceleration;
                this.forwardSpeedMps -= input.brake * brakeRate * delta;
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
            const decelRate = this.isDrifting ? 6.0 : VEHICLE_CONFIG.naturalDeceleration;
            if (this.forwardSpeedMps > 0) {
                this.forwardSpeedMps -= decelRate * delta;
                if (this.forwardSpeedMps < 0) this.forwardSpeedMps = 0;
            } else if (this.forwardSpeedMps < 0) {
                this.forwardSpeedMps += decelRate * delta;
                if (this.forwardSpeedMps > 0) this.forwardSpeedMps = 0;
            }
        }

        // 3. Angular turn (Yaw)
        const speedRatio = Math.min(Math.abs(this.forwardSpeedMps) / (maxForwardSpeedMps * 0.35), 1.0);
        const directionSign = this.forwardSpeedMps >= 0 ? 1 : -1;
        const turnRate = this.isDrifting ? 3.0 : 2.2;
        this.yaw += this.currentSteerAngle * speedRatio * directionSign * turnRate * delta;

        // Visual slip angle: body tilts into/with drift oversteer
        const targetDriftAngle = this.isDrifting ? (this.currentSteerAngle * 0.72) : 0;
        this.driftAngle = THREE.MathUtils.damp(this.driftAngle, targetDriftAngle, 7.2, delta);

        // 4. Position displacement & lateral slide momentum
        const forwardDir = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
        const moveVector = forwardDir.clone().multiplyScalar(this.forwardSpeedMps * delta);

        // Outward centrifugal lateral velocity
        const outwardSign = this.currentSteerAngle >= 0 ? 1 : -1;
        const targetLatVel = this.isDrifting ? outwardSign * Math.abs(this.forwardSpeedMps) * 0.42 : 0;
        this.driftLateralVelocity = THREE.MathUtils.damp(this.driftLateralVelocity, targetLatVel, 5.0, delta);

        if (Math.abs(this.driftLateralVelocity) > 0.01) {
            const lateralDir = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
            moveVector.addScaledVector(lateralDir, this.driftLateralVelocity * delta);
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
        let hitBuilding: BuildingObject | undefined;

        // Check if car is currently driving through a building
        if (this.isDrivingThroughBuilding && this.penetratingBuilding) {
            const stillInside = this.penetratingBuilding.box.intersectsBox(carBox);
            if (stillInside) {
                // Continue driving through the building interior with cutaway view active!
                this.driveThroughDistance += Math.abs(this.forwardSpeedMps) * delta;
                this.world.setBuildingCutaway(this.penetratingBuilding, true);
                this.forwardSpeedMps *= Math.pow(0.96, delta * 60);
            } else {
                // Car has officially penetrated through and exited the building!
                const exitedBuilding = this.penetratingBuilding;
                this.isDrivingThroughBuilding = false;
                this.penetratingBuilding = undefined;

                // Punch exit breach hole at the exit wall
                this.world.createBuildingBreach(this.state.position, this.yaw, exitedBuilding);
                // Restore building facade opacity
                this.world.setBuildingCutaway(exitedBuilding, false);
                // Now the building crumbles and collapses behind the exiting car! ("ja siis maja laguneb")
                this.world.collapseBuilding(exitedBuilding, this.yaw);
            }
        } else if (this.world.buildings) {
            for (const b of this.world.buildings) {
                if (b.box.intersectsBox(carBox)) {
                    if (this.world.isBuildingCollapsed(b)) {
                        continue;
                    }

                    const speedKmh = Math.abs(this.forwardSpeedMps) * 3.6;
                    const canDriveThrough = speedKmh >= 10.0 || !this.state.isGrounded || this.launchedFromRamp;

                    if (canDriveThrough) {
                        // Smashes into and begins driving THROUGH the building!
                        this.isDrivingThroughBuilding = true;
                        this.penetratingBuilding = b;
                        this.driveThroughDistance = 0;

                        // Punch entry breach hole in building wall
                        this.world.createBuildingBreach(this.state.position, this.yaw, b);
                        // Make building facade transparent cutaway so player SEES the car driving through!
                        this.world.setBuildingCutaway(b, true);
                        this.onBuildingHit?.();
                        this.meshContainer.setFrontWrecked(true);
                        this.forwardSpeedMps *= 0.84;
                    } else {
                        collided = true;
                        hitBuilding = b;
                        break;
                    }
                }
            }
        }

        if (!collided && !this.isDrivingThroughBuilding) {
            for (const col of this.world.colliders) {
                if (this.penetratingBuilding && col === this.penetratingBuilding.box) {
                    continue;
                }
                if (col.intersectsBox(carBox)) {
                    const matchingBuilding = this.world.buildings?.find(b => b.box === col);
                    if (matchingBuilding) {
                        if (this.world.isBuildingCollapsed(matchingBuilding)) {
                            continue;
                        }
                        const speedKmh = Math.abs(this.forwardSpeedMps) * 3.6;
                        if (speedKmh >= 10.0 || !this.state.isGrounded || this.launchedFromRamp) {
                            this.isDrivingThroughBuilding = true;
                            this.penetratingBuilding = matchingBuilding;
                            this.driveThroughDistance = 0;
                            this.world.createBuildingBreach(this.state.position, this.yaw, matchingBuilding);
                            this.world.setBuildingCutaway(matchingBuilding, true);
                            this.onBuildingHit?.();
                            this.meshContainer.setFrontWrecked(true);
                            this.forwardSpeedMps *= 0.84;
                            continue;
                        }
                    }
                    collided = true;
                    break;
                }
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

            // Punch car-sized hole in building at exact impact point and height (even in mid-air!)
            if (hitBuilding || Math.abs(impactSpeed) > 0.8 || !this.state.isGrounded || this.launchedFromRamp) {
                this.world.createBuildingBreach(this.state.position, this.yaw, hitBuilding);
            }

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
        this.meshContainer.group.rotation.set(0, this.yaw + this.driftAngle, 0);
        this.state.rotation.set(0, this.yaw + this.driftAngle, 0);

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
        if (this.penetratingBuilding) {
            this.world.setBuildingCutaway(this.penetratingBuilding, false);
        }
        this.isDrivingThroughBuilding = false;
        this.penetratingBuilding = undefined;
        this.driveThroughDistance = 0;
        this.isDead = false;
        this.fallingAfterCrash = false;
        this.launchedFromRamp = false;
        this.forwardSpeedMps = 0;
        this.verticalVelocity = 0;
        this.currentSteerAngle = 0;
        this.isDrifting = false;
        this.driftAngle = 0;
        this.driftLateralVelocity = 0;
        this.driftCooldown = 0;
        this.state.isDrifting = false;
        // Spawn near the bridge entrance in the city
        this.state.position.set(-60, 0.1, 0);
        this.yaw = Math.PI / 2; // Point toward bridge / forest
        this.meshContainer.group.position.copy(this.state.position);
        this.meshContainer.group.rotation.set(0, this.yaw, 0);
        this.meshContainer.bodyMesh.rotation.set(0, 0, 0);
    }

    public getRearWheelWorldPositions(): { left: THREE.Vector3; right: THREE.Vector3 } {
        const visualYaw = this.yaw + this.driftAngle;
        const cosY = Math.cos(visualYaw);
        const sinY = Math.sin(visualYaw);
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

    public getDriftAngle(): number {
        return this.driftAngle;
    }

    public getIsDrifting(): boolean {
        return this.isDrifting;
    }
}
