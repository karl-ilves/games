import * as THREE from 'three';
import { WantedLevel } from '../types';
import { createPoliceCarMesh, PoliceCarMeshContainer } from '../models/policeCarModel';
import { WorldEnvironment } from '../world/world';
import { MAP_BOUNDS } from './carPhysics';

export interface PoliceCarEntity {
    id: string;
    mesh: PoliceCarMeshContainer;
    position: THREE.Vector3;
    yaw: number;
    speedMps: number;
    steerAngle: number;
    wheelSpin: number;
    flankOffset: THREE.Vector3;
}

export class PoliceChaseSystem {
    private scene: THREE.Scene;
    private world: WorldEnvironment;
    private cruisers: PoliceCarEntity[] = [];
    private currentLevel: WantedLevel = 0;
    private elapsedTime = 0;
    public onPlayerRam?: () => void;

    constructor(scene: THREE.Scene, world: WorldEnvironment) {
        this.scene = scene;
        this.world = world;
    }

    public getCruisers(): PoliceCarEntity[] {
        return this.cruisers;
    }

    public getActiveCount(): number {
        return this.cruisers.length;
    }

    public setWantedLevel(level: WantedLevel, playerPos: THREE.Vector3, playerYaw: number): void {
        this.currentLevel = level;
        const targetCount = level === 1 ? 2 : level >= 2 ? 5 : 0;

        // Despawn excess
        while (this.cruisers.length > targetCount) {
            const removed = this.cruisers.pop();
            if (removed) {
                this.scene.remove(removed.mesh.group);
            }
        }

        // Spawn new cruisers if below target
        const spawnOffsets = [
            { dist: 45, angle: 0.8 },
            { dist: 55, angle: -0.8 },
            { dist: 65, angle: 2.2 },
            { dist: 75, angle: -2.2 },
            { dist: 50, angle: 0.0 }
        ];

        while (this.cruisers.length < targetCount) {
            const idx = this.cruisers.length;
            const offsetDef = spawnOffsets[idx % spawnOffsets.length];
            const spawnAngle = playerYaw + offsetDef.angle;
            let spawnX = playerPos.x + Math.sin(spawnAngle) * offsetDef.dist;
            let spawnZ = playerPos.z + Math.cos(spawnAngle) * offsetDef.dist;

            // Clamp spawn inside map boundaries
            spawnX = THREE.MathUtils.clamp(spawnX, MAP_BOUNDS.minX + 20, MAP_BOUNDS.maxX - 20);
            spawnZ = THREE.MathUtils.clamp(spawnZ, MAP_BOUNDS.minZ + 20, MAP_BOUNDS.maxZ - 20);

            const spawnY = this.world.getGroundHeight(spawnX, spawnZ);
            const mesh = createPoliceCarMesh('cruiser_' + idx + '_' + Date.now());
            const pos = new THREE.Vector3(spawnX, spawnY, spawnZ);

            mesh.group.position.copy(pos);
            mesh.group.rotation.y = spawnAngle + Math.PI; // pointing roughly towards player
            this.scene.add(mesh.group);

            // Flank offsets so police cars attack from multiple angles
            const flankOffsets = [
                new THREE.Vector3(-3.0, 0, 1.0),
                new THREE.Vector3(3.0, 0, 1.0),
                new THREE.Vector3(0.0, 0, -4.0),
                new THREE.Vector3(-4.5, 0, -2.0),
                new THREE.Vector3(4.5, 0, -2.0)
            ];

            this.cruisers.push({
                id: 'cruiser_' + idx,
                mesh,
                position: pos,
                yaw: spawnAngle + Math.PI,
                speedMps: 12 + Math.random() * 5,
                steerAngle: 0,
                wheelSpin: 0,
                flankOffset: flankOffsets[idx % flankOffsets.length]
            });
        }
    }

    public update(
        delta: number,
        playerPos: THREE.Vector3,
        playerYaw: number,
        playerSpeedKmh: number,
        onRamPlayer?: () => void
    ): void {
        this.elapsedTime += delta;

        if (this.cruisers.length === 0) return;

        const playerSpeedMps = playerSpeedKmh / 3.6;
        // Police top speed scales slightly with player to keep pursuit exciting
        const maxPoliceSpeedMps = Math.min(Math.max(16, playerSpeedMps * 1.08), 26); // ~60-95 km/h

        for (const cruiser of this.cruisers) {
            // Target position: player position + flank offset relative to player heading
            const cosP = Math.cos(playerYaw);
            const sinP = Math.sin(playerYaw);
            const targetX = playerPos.x + cruiser.flankOffset.x * cosP + cruiser.flankOffset.z * sinP;
            const targetZ = playerPos.z - cruiser.flankOffset.x * sinP + cruiser.flankOffset.z * cosP;

            // Compute angle towards target
            const dx = targetX - cruiser.position.x;
            const dz = targetZ - cruiser.position.z;
            const distToPlayer = Math.sqrt(dx * dx + dz * dz);

            const desiredYaw = Math.atan2(dx, dz);
            let yawDiff = desiredYaw - cruiser.yaw;
            while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
            while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;

            // Steering AI
            const steerTarget = THREE.MathUtils.clamp(yawDiff * 2.0, -0.65, 0.65);
            cruiser.steerAngle = THREE.MathUtils.damp(cruiser.steerAngle, steerTarget, 6.0, delta);

            // Turn rate proportional to forward speed
            cruiser.yaw += cruiser.steerAngle * Math.min(cruiser.speedMps / 8.0, 1.2) * 2.5 * delta;

            // Throttle / Acceleration AI
            if (distToPlayer > 4.0) {
                cruiser.speedMps = THREE.MathUtils.damp(cruiser.speedMps, maxPoliceSpeedMps, 2.5, delta);
            } else {
                // Close pursuit: maintain pressure
                cruiser.speedMps = THREE.MathUtils.damp(cruiser.speedMps, playerSpeedMps + 2, 3.5, delta);
            }

            // Displacement
            const forwardX = Math.sin(cruiser.yaw) * cruiser.speedMps * delta;
            const forwardZ = Math.cos(cruiser.yaw) * cruiser.speedMps * delta;

            let nextX = cruiser.position.x + forwardX;
            let nextZ = cruiser.position.z + forwardZ;

            // Map bounds clamping
            nextX = THREE.MathUtils.clamp(nextX, MAP_BOUNDS.minX + 5, MAP_BOUNDS.maxX - 5);
            nextZ = THREE.MathUtils.clamp(nextZ, MAP_BOUNDS.minZ + 5, MAP_BOUNDS.maxZ - 5);

            // Collision with buildings & obstacles
            const policeBox = new THREE.Box3(
                new THREE.Vector3(nextX - 1.1, cruiser.position.y, nextZ - 1.1),
                new THREE.Vector3(nextX + 1.1, cruiser.position.y + 2.0, nextZ + 1.1)
            );

            let hitObstacle = false;
            for (const col of this.world.colliders) {
                if (col.intersectsBox(policeBox)) {
                    hitObstacle = true;
                    break;
                }
            }

            if (hitObstacle) {
                // Rebound & steer away
                cruiser.speedMps *= 0.5;
                cruiser.yaw += 0.8;
            } else {
                cruiser.position.x = nextX;
                cruiser.position.z = nextZ;
            }

            // Ground height
            const groundY = this.world.getGroundHeight(cruiser.position.x, cruiser.position.z);
            cruiser.position.y = THREE.MathUtils.damp(cruiser.position.y, Math.max(0.05, groundY), 12, delta);

            // Wheel visuals & Strobe lights
            cruiser.wheelSpin += (cruiser.speedMps / 0.36) * delta;
            cruiser.mesh.updateSteeringAndSpin(cruiser.steerAngle, cruiser.wheelSpin);
            cruiser.mesh.updateStrobes(this.elapsedTime);

            // Update 3D mesh position & rotation
            cruiser.mesh.group.position.copy(cruiser.position);
            cruiser.mesh.group.rotation.set(0, cruiser.yaw, 0);

            // Collision check between police cruiser and player car
            const pDistX = cruiser.position.x - playerPos.x;
            const pDistZ = cruiser.position.z - playerPos.z;
            const pDistSq = pDistX * pDistX + pDistZ * pDistZ;

            if (pDistSq < 5.0) { // ~2.2m distance
                // Ram collision!
                onRamPlayer?.();
                this.onPlayerRam?.();

                // Push cruiser slightly back
                cruiser.speedMps *= 0.6;
            }
        }
    }

    private remoteCruisers: Map<string, PoliceCarEntity[]> = new Map();

    public updateRemoteChases(
        dt: number,
        remoteDrivers: { id: string; targetPos: THREE.Vector3; targetRotY: number; info: { wantedLevel?: WantedLevel; speed: number } }[]
    ): void {
        const activeRemoteIds = new Set<string>();

        remoteDrivers.forEach(driver => {
            const level = driver.info.wantedLevel || 0;
            if (level <= 0) return;
            activeRemoteIds.add(driver.id);

            const targetCount = level === 1 ? 2 : 5;
            let list = this.remoteCruisers.get(driver.id);
            if (!list) {
                list = [];
                this.remoteCruisers.set(driver.id, list);
            }

            while (list.length < targetCount) {
                const idx = list.length;
                const spawnAngle = driver.targetRotY + (idx % 2 === 0 ? 0.8 : -0.8) + idx * 0.5;
                const dist = 30 + idx * 8;
                let sx = driver.targetPos.x + Math.sin(spawnAngle) * dist;
                let sz = driver.targetPos.z + Math.cos(spawnAngle) * dist;
                sx = THREE.MathUtils.clamp(sx, MAP_BOUNDS.minX + 20, MAP_BOUNDS.maxX - 20);
                sz = THREE.MathUtils.clamp(sz, MAP_BOUNDS.minZ + 20, MAP_BOUNDS.maxZ - 20);
                const sy = this.world.getGroundHeight(sx, sz);

                const mesh = createPoliceCarMesh('remote_cruiser_' + driver.id + '_' + idx);
                mesh.group.position.set(sx, sy, sz);
                this.scene.add(mesh.group);

                list.push({
                    id: 'rc_' + driver.id + '_' + idx,
                    mesh,
                    position: new THREE.Vector3(sx, sy, sz),
                    yaw: spawnAngle + Math.PI,
                    speedMps: 14 + idx * 2,
                    steerAngle: 0,
                    wheelSpin: 0,
                    flankOffset: new THREE.Vector3((idx % 2 === 0 ? 3.5 : -3.5), 0, (idx > 1 ? -4 : 1))
                });
            }

            while (list.length > targetCount) {
                const c = list.pop();
                if (c) this.scene.remove(c.mesh.group);
            }

            list.forEach(cruiser => {
                cruiser.mesh.updateStrobes(this.elapsedTime);

                const targetX = driver.targetPos.x + cruiser.flankOffset.x;
                const targetZ = driver.targetPos.z + cruiser.flankOffset.z;
                const dx = targetX - cruiser.position.x;
                const dz = targetZ - cruiser.position.z;
                const dist = Math.hypot(dx, dz);

                const desiredYaw = Math.atan2(dx, dz);
                let diffYaw = desiredYaw - cruiser.yaw;
                while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
                while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
                cruiser.yaw += THREE.MathUtils.clamp(diffYaw, -2.4 * dt, 2.4 * dt);

                const targetSpeed = Math.min(26, 12 + dist * 0.35);
                cruiser.speedMps = THREE.MathUtils.damp(cruiser.speedMps, targetSpeed, 3.0, dt);

                cruiser.position.x += Math.sin(cruiser.yaw) * cruiser.speedMps * dt;
                cruiser.position.z += Math.cos(cruiser.yaw) * cruiser.speedMps * dt;
                cruiser.position.y = this.world.getGroundHeight(cruiser.position.x, cruiser.position.z);

                cruiser.wheelSpin += (cruiser.speedMps / 0.38) * dt;
                cruiser.mesh.updateSteeringAndSpin(0, cruiser.wheelSpin);
                cruiser.mesh.group.position.copy(cruiser.position);
                cruiser.mesh.group.rotation.y = cruiser.yaw;
            });
        });

        this.remoteCruisers.forEach((list, driverId) => {
            if (!activeRemoteIds.has(driverId)) {
                list.forEach(c => this.scene.remove(c.mesh.group));
                this.remoteCruisers.delete(driverId);
            }
        });
    }

    public getClosestDistance(playerPos: THREE.Vector3): number {
        let minD = Infinity;
        for (const c of this.cruisers) {
            const d = c.position.distanceTo(playerPos);
            if (d < minD) minD = d;
        }
        this.remoteCruisers.forEach(list => {
            for (const c of list) {
                const d = c.position.distanceTo(playerPos);
                if (d < minD) minD = d;
            }
        });
        return minD;
    }
}
