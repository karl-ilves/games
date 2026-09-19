import * as THREE from 'three';
import { WantedLevel } from '../types';
import { createTankMesh, createRocketMesh, TankMeshContainer } from '../models/tankModel';
import { WorldEnvironment } from '../world/world';
import { MAP_BOUNDS } from './carPhysics';

export interface TankEntity {
    id: string;
    mesh: TankMeshContainer;
    position: THREE.Vector3;
    yaw: number;
    speedMps: number;
    targetOffset: THREE.Vector3;
    fireCooldown: number; // fires every 10 seconds
}

export interface ActiveRocket {
    mesh: THREE.Group;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    targetPos: THREE.Vector3;
    distanceTraveled: number;
    lifetime: number;
}

export class TankSystem {
    private scene: THREE.Scene;
    private world: WorldEnvironment;
    private tanks: TankEntity[] = [];
    private rockets: ActiveRocket[] = [];
    private active = false;

    public onRocketHitPlayer?: () => void;
    public onExplosionSound?: () => void;
    public onRocketLaunchSound?: () => void;

    constructor(scene: THREE.Scene, world: WorldEnvironment) {
        this.scene = scene;
        this.world = world;
    }

    public getActiveTankCount(): number {
        return this.tanks.length;
    }

    public getTanks(): TankEntity[] {
        return this.tanks;
    }

    public getActiveRockets(): ActiveRocket[] {
        return this.rockets;
    }

    public setWantedLevel(level: WantedLevel, playerPos: THREE.Vector3): void {
        if (level >= 4) {
            this.active = true;
            this.spawnTanks(playerPos);
        } else {
            this.despawnAll();
        }
    }

    private spawnTanks(playerPos: THREE.Vector3): void {
        if (this.tanks.length >= 5) return;

        // 5 tank positions surrounding player closely in full clear view (22-26m)
        const spawnConfigs = [
            { angle: 0.35, dist: 24, offsetX: 8, offsetZ: 18 },    // Front right in headlights view
            { angle: -0.35, dist: 24, offsetX: -8, offsetZ: 18 },  // Front left in headlights view
            { angle: 1.45, dist: 22, offsetX: 18, offsetZ: 2 },    // Right flank
            { angle: -1.45, dist: 22, offsetX: -18, offsetZ: 2 },  // Left flank
            { angle: Math.PI, dist: 20, offsetX: 0, offsetZ: -20 } // Rear pursuit
        ];

        while (this.tanks.length < 5) {
            const idx = this.tanks.length;
            const cfg = spawnConfigs[idx];
            let x = playerPos.x + Math.sin(cfg.angle) * cfg.dist;
            let z = playerPos.z + Math.cos(cfg.angle) * cfg.dist;

            x = THREE.MathUtils.clamp(x, MAP_BOUNDS.minX + 20, MAP_BOUNDS.maxX - 20);
            z = THREE.MathUtils.clamp(z, MAP_BOUNDS.minZ + 20, MAP_BOUNDS.maxZ - 20);
            const y = this.world.getGroundHeight(x, z);

            const tankMesh = createTankMesh('tank_' + idx + '_' + Date.now());
            tankMesh.group.position.set(x, y, z);
            this.scene.add(tankMesh.group);

            this.tanks.push({
                id: 'tank_' + idx,
                mesh: tankMesh,
                position: new THREE.Vector3(x, y, z),
                yaw: cfg.angle + Math.PI,
                speedMps: 0,
                targetOffset: new THREE.Vector3(cfg.offsetX, 0, cfg.offsetZ),
                // Stagger initial shots slightly around 3-10s so all 5 don't fire at exact same millisecond
                fireCooldown: 2.0 + idx * 1.8
            });
        }
    }

    public update(dt: number, playerPos: THREE.Vector3): void {
        if (!this.active && this.rockets.length === 0) return;

        // Update Tanks
        this.tanks.forEach(tank => {
            // Pulse flashing red beacon on tank turret
            if (tank.mesh.beaconMat) {
                const isFlash = Math.sin(performance.now() * 0.008) > 0;
                tank.mesh.beaconMat.emissiveIntensity = isFlash ? 3.0 : 0.3;
            }

            // Move tank towards desired standoff distance from player
            const targetX = playerPos.x + tank.targetOffset.x;
            const targetZ = playerPos.z + tank.targetOffset.z;
            const dx = targetX - tank.position.x;
            const dz = targetZ - tank.position.z;
            const dist = Math.hypot(dx, dz);

            const desiredYaw = Math.atan2(dx, dz);
            // Smoothly rotate tank hull towards movement target
            let diffYaw = desiredYaw - tank.yaw;
            while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
            while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
            tank.yaw += THREE.MathUtils.clamp(diffYaw, -1.8 * dt, 1.8 * dt);

            // Speed: fast enough to keep up with player car
            if (dist > 3.5) {
                const targetSpeed = Math.min(22.0, 10.0 + dist * 0.5);
                tank.speedMps = THREE.MathUtils.damp(tank.speedMps, targetSpeed, 3.0, dt);
            } else {
                tank.speedMps = THREE.MathUtils.damp(tank.speedMps, 0, 4.0, dt);
            }

            tank.position.x += Math.sin(tank.yaw) * tank.speedMps * dt;
            tank.position.z += Math.cos(tank.yaw) * tank.speedMps * dt;

            // Map clamp - fixed bug with MAP_BOUNDS object
            tank.position.x = THREE.MathUtils.clamp(tank.position.x, MAP_BOUNDS.minX + 8, MAP_BOUNDS.maxX - 8);
            tank.position.z = THREE.MathUtils.clamp(tank.position.z, MAP_BOUNDS.minZ + 8, MAP_BOUNDS.maxZ - 8);

            const groundY = this.world.getGroundHeight(tank.position.x, tank.position.z);
            tank.position.y = THREE.MathUtils.damp(tank.position.y, groundY, 8.0, dt);

            tank.mesh.group.position.copy(tank.position);
            tank.mesh.group.rotation.y = tank.yaw;

            // Aim turret at player
            const toPlayerX = playerPos.x - tank.position.x;
            const toPlayerZ = playerPos.z - tank.position.z;
            const aimAngleWorld = Math.atan2(toPlayerX, toPlayerZ);
            const aimAngleLocal = aimAngleWorld - tank.yaw;
            tank.mesh.updateTurretAim(aimAngleLocal);

            // Firing rocket logic (every 10 seconds)
            tank.fireCooldown -= dt;
            if (tank.fireCooldown <= 0) {
                tank.fireCooldown = 10.0; // Reset to 10 seconds
                this.fireRocket(tank, playerPos);
            }
        });

        // Update active rockets
        for (let i = this.rockets.length - 1; i >= 0; i--) {
            const rocket = this.rockets[i];
            rocket.lifetime += dt;

            // Move rocket
            rocket.position.addScaledVector(rocket.velocity, dt);
            rocket.distanceTraveled += rocket.velocity.length() * dt;
            rocket.mesh.position.copy(rocket.position);

            // Face direction of travel
            const forward = rocket.velocity.clone().normalize();
            rocket.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward);

            // Check hit on player
            const distToPlayer = rocket.position.distanceTo(playerPos);
            if (distToPlayer < 2.8) {
                this.explodeRocket(i, true);
                if (this.onRocketHitPlayer) {
                    this.onRocketHitPlayer();
                }
                continue;
            }

            // Check ground hit or max life (missed rocket)
            const groundY = this.world.getGroundHeight(rocket.position.x, rocket.position.z);
            if (rocket.position.y <= groundY + 0.3 || rocket.lifetime > 5.0) {
                // Harmless miss on the ground
                this.explodeRocket(i, false);
            }
        }
    }

    private fireRocket(tank: TankEntity, playerPos: THREE.Vector3): void {
        const rocketMesh = createRocketMesh();

        // Spawn at tank turret muzzle
        const spawnPos = tank.position.clone().add(new THREE.Vector3(0, 1.8, 0));
        rocketMesh.position.copy(spawnPos);
        this.scene.add(rocketMesh);

        // Calculate velocity vector aimed directly at player position
        const target = playerPos.clone().add(new THREE.Vector3(0, 0.6, 0));
        const dir = new THREE.Vector3().subVectors(target, spawnPos).normalize();
        const speed = 42; // fast rocket m/s

        this.rockets.push({
            mesh: rocketMesh,
            position: spawnPos,
            velocity: dir.multiplyScalar(speed),
            targetPos: target,
            distanceTraveled: 0,
            lifetime: 0
        });

        if (this.onRocketLaunchSound) {
            this.onRocketLaunchSound();
        }
    }

    private explodeRocket(index: number, isHitPlayer: boolean): void {
        const rocket = this.rockets[index];
        if (!rocket) return;

        this.scene.remove(rocket.mesh);
        this.rockets.splice(index, 1);

        if (this.onExplosionSound) {
            this.onExplosionSound();
        }

        // Particle effect at explosion point
        this.spawnExplosionEffect(rocket.position, isHitPlayer);
    }

    private spawnExplosionEffect(pos: THREE.Vector3, isBig: boolean): void {
        const count = isBig ? 18 : 10;
        const geo = new THREE.SphereGeometry(isBig ? 0.35 : 0.22, 5, 5);
        const mat = new THREE.MeshBasicMaterial({ color: isBig ? 0xff4757 : 0xffa502 });

        for (let i = 0; i < count; i++) {
            const p = new THREE.Mesh(geo, mat);
            p.position.copy(pos);
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * (isBig ? 16 : 9),
                Math.random() * (isBig ? 14 : 8) + 2,
                (Math.random() - 0.5) * (isBig ? 16 : 9)
            );
            this.scene.add(p);

            const startTime = performance.now();
            const anim = () => {
                const elapsed = (performance.now() - startTime) / 1000;
                p.position.addScaledVector(vel, 0.016);
                vel.y -= 14 * 0.016; // gravity
                p.scale.multiplyScalar(0.95);
                if (elapsed < 0.65) {
                    requestAnimationFrame(anim);
                } else {
                    this.scene.remove(p);
                    geo.dispose();
                    mat.dispose();
                }
            };
            requestAnimationFrame(anim);
        }
    }

    public despawnAll(): void {
        this.active = false;
        this.tanks.forEach(tank => {
            this.scene.remove(tank.mesh.group);
        });
        this.tanks = [];

        this.rockets.forEach(rocket => {
            this.scene.remove(rocket.mesh);
        });
        this.rockets = [];
    }

    private remoteTanks: Map<string, TankEntity[]> = new Map();

    public updateRemoteTanks(
        dt: number,
        remoteDrivers: { id: string; targetPos: THREE.Vector3; targetRotY: number; info: { wantedLevel?: WantedLevel } }[]
    ): void {
        const activeIds = new Set<string>();

        remoteDrivers.forEach(driver => {
            const level = driver.info.wantedLevel || 0;
            if (level < 4) return;
            activeIds.add(driver.id);

            let list = this.remoteTanks.get(driver.id);
            if (!list) {
                list = [];
                for (let i = 0; i < 3; i++) {
                    const ang = driver.targetRotY + (i === 0 ? 0.4 : i === 1 ? -0.4 : Math.PI);
                    const dist = 22;
                    let tx = driver.targetPos.x + Math.sin(ang) * dist;
                    let tz = driver.targetPos.z + Math.cos(ang) * dist;
                    tx = THREE.MathUtils.clamp(tx, MAP_BOUNDS.minX + 15, MAP_BOUNDS.maxX - 15);
                    tz = THREE.MathUtils.clamp(tz, MAP_BOUNDS.minZ + 15, MAP_BOUNDS.maxZ - 15);
                    const ty = this.world.getGroundHeight(tx, tz);

                    const mesh = createTankMesh('remote_tank_' + driver.id + '_' + i);
                    mesh.group.position.set(tx, ty, tz);
                    this.scene.add(mesh.group);

                    list.push({
                        id: 'rt_' + driver.id + '_' + i,
                        mesh,
                        position: new THREE.Vector3(tx, ty, tz),
                        yaw: ang + Math.PI,
                        speedMps: 0,
                        targetOffset: new THREE.Vector3((i === 0 ? 8 : i === 1 ? -8 : 0), 0, (i === 2 ? -18 : 16)),
                        fireCooldown: 4.0 + i * 2.0
                    });
                }
                this.remoteTanks.set(driver.id, list);
            }

            list.forEach(tank => {
                if (tank.mesh.beaconMat) {
                    tank.mesh.beaconMat.emissiveIntensity = Math.sin(performance.now() * 0.008) > 0 ? 3.0 : 0.3;
                }

                const targetX = driver.targetPos.x + tank.targetOffset.x;
                const targetZ = driver.targetPos.z + tank.targetOffset.z;
                const dx = targetX - tank.position.x;
                const dz = targetZ - tank.position.z;
                const dist = Math.hypot(dx, dz);

                const desiredYaw = Math.atan2(dx, dz);
                let diffYaw = desiredYaw - tank.yaw;
                while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
                while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
                tank.yaw += THREE.MathUtils.clamp(diffYaw, -1.8 * dt, 1.8 * dt);

                if (dist > 3.5) {
                    const targetSpeed = Math.min(22.0, 10.0 + dist * 0.5);
                    tank.speedMps = THREE.MathUtils.damp(tank.speedMps, targetSpeed, 3.0, dt);
                } else {
                    tank.speedMps = THREE.MathUtils.damp(tank.speedMps, 0, 4.0, dt);
                }

                tank.position.x += Math.sin(tank.yaw) * tank.speedMps * dt;
                tank.position.z += Math.cos(tank.yaw) * tank.speedMps * dt;
                tank.position.x = THREE.MathUtils.clamp(tank.position.x, MAP_BOUNDS.minX + 8, MAP_BOUNDS.maxX - 8);
                tank.position.z = THREE.MathUtils.clamp(tank.position.z, MAP_BOUNDS.minZ + 8, MAP_BOUNDS.maxZ - 8);

                tank.position.y = this.world.getGroundHeight(tank.position.x, tank.position.z);
                tank.mesh.group.position.copy(tank.position);
                tank.mesh.group.rotation.y = tank.yaw;

                const toDriverX = driver.targetPos.x - tank.position.x;
                const toDriverZ = driver.targetPos.z - tank.position.z;
                tank.mesh.updateTurretAim(Math.atan2(toDriverX, toDriverZ) - tank.yaw);
            });
        });

        this.remoteTanks.forEach((list, id) => {
            if (!activeIds.has(id)) {
                list.forEach(t => this.scene.remove(t.mesh.group));
                this.remoteTanks.delete(id);
            }
        });
    }
}
