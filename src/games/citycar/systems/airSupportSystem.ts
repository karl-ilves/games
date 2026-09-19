import * as THREE from 'three';
import { WantedLevel } from '../types';
import {
    createPoliceHelicopterMesh,
    createBomberPlaneMesh,
    createBombMesh,
    HelicopterMeshContainer,
    BomberPlaneMeshContainer
} from '../models/airVehicleModels';
import { WorldEnvironment } from '../world/world';

export interface ActiveBomb {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    targetPos: THREE.Vector3;
}

export class AirSupportSystem {
    private scene: THREE.Scene;
    private world: WorldEnvironment;
    private helicopters: { mesh: HelicopterMeshContainer; offset: THREE.Vector3 }[] = [];
    private plane: { mesh: BomberPlaneMeshContainer; speed: number; direction: number } | null = null;
    private bombs: ActiveBomb[] = [];
    private bombTimer = 0; // Drops bomb every 10 seconds
    private active = false;

    public onBombHitPlayer?: () => void;
    public onExplosionSound?: () => void;

    constructor(scene: THREE.Scene, world: WorldEnvironment) {
        this.scene = scene;
        this.world = world;
    }

    public getHelicopterCount(): number {
        return this.helicopters.length;
    }

    public hasPlane(): boolean {
        return !!this.plane;
    }

    public setWantedLevel(level: WantedLevel, playerPos: THREE.Vector3): void {
        if (level >= 3) {
            this.active = true;
            this.spawnHelicopters(playerPos);
            this.spawnBomberPlane(playerPos);
        } else {
            this.despawnAll();
        }
    }

    private spawnHelicopters(playerPos: THREE.Vector3): void {
        if (this.helicopters.length > 0) return;

        const heliOffsets = [
            new THREE.Vector3(-15, 24, -12),
            new THREE.Vector3(15, 27, 14)
        ];

        heliOffsets.forEach((offset, idx) => {
            const heli = createPoliceHelicopterMesh('air_heli_' + idx);
            heli.group.position.set(playerPos.x + offset.x, offset.y, playerPos.z + offset.z);
            this.scene.add(heli.group);
            this.helicopters.push({ mesh: heli, offset });
        });
    }

    private spawnBomberPlane(playerPos: THREE.Vector3): void {
        if (this.plane) return;

        const planeMesh = createBomberPlaneMesh('bomber_strike');
        planeMesh.group.position.set(playerPos.x - 180, 46, playerPos.z);
        planeMesh.group.rotation.y = Math.PI / 2; // flying East
        this.scene.add(planeMesh.group);

        this.plane = {
            mesh: planeMesh,
            speed: 38, // fast aerial sweep
            direction: 1 // 1 = East, -1 = West
        };
        this.bombTimer = 3.0; // First bomb drops shortly after spawn
    }

    public despawnAll(): void {
        this.active = false;
        this.helicopters.forEach(h => this.scene.remove(h.mesh.group));
        this.helicopters = [];

        if (this.plane) {
            this.scene.remove(this.plane.mesh.group);
            this.plane = null;
        }

        this.bombs.forEach(b => this.scene.remove(b.mesh));
        this.bombs = [];
        this.bombTimer = 0;
    }

    public update(delta: number, playerPos: THREE.Vector3): void {
        if (!this.active) return;

        // 1. Update Helicopters
        this.helicopters.forEach(h => {
            h.mesh.update(delta);

            // Follow player with smooth damping
            const targetX = playerPos.x + h.offset.x;
            const targetY = h.offset.y;
            const targetZ = playerPos.z + h.offset.z;

            h.mesh.group.position.x = THREE.MathUtils.damp(h.mesh.group.position.x, targetX, 2.5, delta);
            h.mesh.group.position.y = THREE.MathUtils.damp(h.mesh.group.position.y, targetY, 2.0, delta);
            h.mesh.group.position.z = THREE.MathUtils.damp(h.mesh.group.position.z, targetZ, 2.5, delta);

            // Face player
            const dx = playerPos.x - h.mesh.group.position.x;
            const dz = playerPos.z - h.mesh.group.position.z;
            const angle = Math.atan2(dx, dz);
            h.mesh.group.rotation.y = THREE.MathUtils.damp(h.mesh.group.rotation.y, angle, 3.5, delta);

            // Point spotlight at player
            h.mesh.searchLightTarget.position.copy(playerPos);
        });

        // 2. Update Bomber Plane
        if (this.plane) {
            this.plane.mesh.update(delta);

            // Fly back and forth across sky
            this.plane.mesh.group.position.x += this.plane.direction * this.plane.speed * delta;
            // Match player's Z coordinate slowly
            this.plane.mesh.group.position.z = THREE.MathUtils.damp(this.plane.mesh.group.position.z, playerPos.z, 0.8, delta);

            // Turn around when reaching outer perimeter
            if (this.plane.mesh.group.position.x > 340 && this.plane.direction > 0) {
                this.plane.direction = -1;
                this.plane.mesh.group.rotation.y = -Math.PI / 2;
            } else if (this.plane.mesh.group.position.x < -340 && this.plane.direction < 0) {
                this.plane.direction = 1;
                this.plane.mesh.group.rotation.y = Math.PI / 2;
            }

            // User requirement: "kukkutab pommi ja 10 hiljem tuleb järgmine pomm"
            // Drop a bomb every 10 seconds
            this.bombTimer += delta;
            if (this.bombTimer >= 10.0) {
                this.bombTimer = 0;
                this.dropBomb(playerPos);
            }
        }

        // 3. Update Active Falling Bombs
        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const bomb = this.bombs[i];
            bomb.velocity.y -= 16.0 * delta; // Gravity
            bomb.mesh.position.addScaledVector(bomb.velocity, delta);

            // Rotate bomb nose down
            bomb.mesh.rotation.x = Math.atan2(bomb.velocity.y, Math.sqrt(bomb.velocity.x * bomb.velocity.x + bomb.velocity.z * bomb.velocity.z));

            const groundY = this.world.getGroundHeight(bomb.mesh.position.x, bomb.mesh.position.z);

            // Check hit against player car
            const distToPlayer = bomb.mesh.position.distanceTo(playerPos);
            if (distToPlayer < 3.6) {
                // Direct bomb hit on player car!
                this.onExplosionSound?.();
                this.onBombHitPlayer?.();
                this.createExplosionEffect(bomb.mesh.position);
                this.scene.remove(bomb.mesh);
                this.bombs.splice(i, 1);
                continue;
            }

            // Check hit against ground
            if (bomb.mesh.position.y <= groundY + 0.3) {
                // Explodes harmlessly on ground
                this.onExplosionSound?.();
                this.createExplosionEffect(bomb.mesh.position);
                this.scene.remove(bomb.mesh);
                this.bombs.splice(i, 1);
            }
        }
    }

    private dropBomb(playerPos: THREE.Vector3): void {
        if (!this.plane) return;

        const bombMesh = createBombMesh();
        const planePos = this.plane.mesh.group.position;
        bombMesh.position.set(planePos.x, planePos.y - 1.5, planePos.z);
        this.scene.add(bombMesh);

        // Calculate trajectory vector toward player's current ground position
        const timeToFall = 2.4; // approx seconds to hit ground from 45m
        const vx = (playerPos.x - planePos.x) / timeToFall;
        const vz = (playerPos.z - planePos.z) / timeToFall;

        this.bombs.push({
            mesh: bombMesh,
            velocity: new THREE.Vector3(vx, -4.0, vz),
            targetPos: playerPos.clone()
        });
    }

    private createExplosionEffect(pos: THREE.Vector3): void {
        const flash = new THREE.PointLight(0xff793f, 5, 25, 2);
        flash.position.copy(pos);
        flash.position.y += 1.0;
        this.scene.add(flash);

        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(2.4, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xff4757, transparent: true, opacity: 0.85 })
        );
        sphere.position.copy(pos);
        this.scene.add(sphere);

        let t = 0;
        const anim = () => {
            t += 0.05;
            sphere.scale.multiplyScalar(1.08);
            flash.intensity = Math.max(0, 5 * (1 - t));
            (sphere.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 * (1 - t));

            if (t < 1) {
                requestAnimationFrame(anim);
            } else {
                this.scene.remove(flash);
                this.scene.remove(sphere);
            }
        };
        anim();
    }

    private remoteAirUnits: Map<string, { helis: HelicopterMeshContainer[]; plane: BomberPlaneMeshContainer | null }> = new Map();

    public updateRemoteAirSupport(
        dt: number,
        remoteDrivers: { id: string; targetPos: THREE.Vector3; info: { wantedLevel?: WantedLevel } }[]
    ): void {
        const activeIds = new Set<string>();

        remoteDrivers.forEach(driver => {
            const level = driver.info.wantedLevel || 0;
            if (level < 3) return;
            activeIds.add(driver.id);

            let unit = this.remoteAirUnits.get(driver.id);
            if (!unit) {
                const helis: HelicopterMeshContainer[] = [];
                [-14, 14].forEach((ox, idx) => {
                    const h = createPoliceHelicopterMesh('remote_heli_' + driver.id + '_' + idx);
                    h.group.position.set(driver.targetPos.x + ox, 25, driver.targetPos.z + (idx === 0 ? -10 : 10));
                    this.scene.add(h.group);
                    helis.push(h);
                });

                const plane = createBomberPlaneMesh('remote_bomber_' + driver.id);
                plane.group.position.set(driver.targetPos.x - 80, 44, driver.targetPos.z);
                this.scene.add(plane.group);

                unit = { helis, plane };
                this.remoteAirUnits.set(driver.id, unit);
            }

            // Animate remote helis
            unit.helis.forEach((heli, idx) => {
                heli.updateRotors(dt);
                const ox = idx === 0 ? -14 : 14;
                const oz = idx === 0 ? -10 : 10;
                heli.group.position.lerp(new THREE.Vector3(driver.targetPos.x + ox, 25, driver.targetPos.z + oz), dt * 3.0);
                const toTarget = new THREE.Vector3().subVectors(driver.targetPos, heli.group.position);
                heli.group.rotation.y = Math.atan2(toTarget.x, toTarget.z);
            });

            // Animate remote plane
            if (unit.plane) {
                unit.plane.group.position.x += 35 * dt;
                if (unit.plane.group.position.x > driver.targetPos.x + 160) {
                    unit.plane.group.position.x = driver.targetPos.x - 160;
                    unit.plane.group.position.z = driver.targetPos.z;
                }
            }
        });

        this.remoteAirUnits.forEach((unit, id) => {
            if (!activeIds.has(id)) {
                unit.helis.forEach(h => this.scene.remove(h.group));
                if (unit.plane) this.scene.remove(unit.plane.group);
                this.remoteAirUnits.delete(id);
            }
        });
    }
}
