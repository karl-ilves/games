import * as THREE from 'three';
import { Team, CombatUnit, Projectile, WorldObstacle, ExplosiveBarrel } from '../types';
import { warAudio } from '../audio';
import { FxManager } from '../effects/fxManager';
import { WarMultiplayerNetwork } from '../multiplayer';

export class CombatSystem {
    private scene: THREE.Scene;
    private fx: FxManager;
    private network?: WarMultiplayerNetwork;
    public projectiles: Projectile[] = [];

    constructor(scene: THREE.Scene, fx: FxManager, network?: WarMultiplayerNetwork) {
        this.scene = scene;
        this.fx = fx;
        this.network = network;
    }

    public setNetwork(network: WarMultiplayerNetwork) {
        this.network = network;
    }

    public spawnProjectile(
        shooterId: string,
        shooterName: string,
        team: Team,
        from: THREE.Vector3,
        dir: THREE.Vector3,
        isExplosive: boolean,
        isCannon: boolean
    ) {
        const geo = isCannon
            ? new THREE.CylinderGeometry(0.22, 0.22, 1.3, 8)
            : isExplosive
            ? new THREE.SphereGeometry(0.28, 8, 8)
            : new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6);

        const color = team === 'red' ? 0xff4757 : 0x00f2fe;
        const mat = new THREE.MeshBasicMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(from);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

        this.scene.add(mesh);
        this.projectiles.push({
            id: 'proj_' + Math.random(),
            shooterId,
            shooterName,
            team,
            mesh,
            velocity: dir.clone().multiplyScalar(isCannon ? 110 : isExplosive ? 45 : 160),
            damage: isCannon ? 65 : isExplosive ? 50 : 14,
            explosionRadius: isCannon ? 15.0 : isExplosive ? 12.0 : 0,
            life: isCannon ? 3.0 : isExplosive ? 2.5 : 1.5,
            isExplosive,
            isCannon
        });
    }

    public spawnGrenade(
        shooterId: string,
        shooterName: string,
        team: Team,
        from: THREE.Vector3,
        targetPos: THREE.Vector3
    ) {
        const dx = targetPos.x - from.x;
        const dz = targetPos.z - from.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const flightTime = Math.max(0.45, Math.min(1.8, dist / 26.0));
        const g = 26.0;

        const vx = dx / flightTime;
        const vz = dz / flightTime;
        const vy = (targetPos.y - from.y + 0.5 * g * flightTime * flightTime) / flightTime;

        const grenadeGeo = new THREE.SphereGeometry(0.3, 10, 10);
        const grenadeMat = new THREE.MeshStandardMaterial({
            color: team === 'red' ? 0x8b0000 : 0x2d572c,
            roughness: 0.6,
            metalness: 0.4
        });
        const mesh = new THREE.Mesh(grenadeGeo, grenadeMat);
        mesh.position.copy(from);
        mesh.castShadow = true;

        this.scene.add(mesh);
        this.projectiles.push({
            id: 'grenade_' + Math.random(),
            shooterId,
            shooterName,
            team,
            mesh,
            velocity: new THREE.Vector3(vx, vy, vz),
            damage: 65,
            explosionRadius: 14.0,
            life: flightTime + 0.05,
            isExplosive: true,
            isCannon: false,
            isGrenade: true,
            gravity: g,
            tumbleSpeed: new THREE.Vector3(8 + Math.random() * 6, 6 + Math.random() * 4, 10 + Math.random() * 6),
            targetPos: targetPos.clone()
        });

        this.network?.send({
            type: 'grenade_throw',
            payload: {
                shooterId,
                shooterName,
                team,
                fromX: from.x,
                fromY: from.y,
                fromZ: from.z,
                targetX: targetPos.x,
                targetY: targetPos.y,
                targetZ: targetPos.z
            }
        });
    }

    public spawnAirBomb(
        shooterId: string,
        shooterName: string,
        team: Team,
        from: THREE.Vector3,
        velocity: THREE.Vector3
    ) {
        const bombGeo = new THREE.CylinderGeometry(0.32, 0.45, 1.8, 12);
        const bombMat = new THREE.MeshStandardMaterial({
            color: team === 'red' ? 0x991b1b : 0x1e3a8a,
            roughness: 0.35,
            metalness: 0.75
        });
        const mesh = new THREE.Mesh(bombGeo, bombMat);
        mesh.rotation.x = Math.PI / 2;
        mesh.position.copy(from);
        mesh.castShadow = true;

        this.scene.add(mesh);
        this.projectiles.push({
            id: 'airbomb_' + Math.random(),
            shooterId,
            shooterName,
            team,
            mesh,
            velocity: velocity.clone(),
            damage: 100,
            explosionRadius: 18.0,
            life: 3.5,
            isExplosive: true,
            isCannon: false,
            isGrenade: true,
            gravity: 28.0,
            tumbleSpeed: new THREE.Vector3(1.8, 0.3, 0),
            targetPos: from.clone()
        });

        this.network?.send({
            type: 'airstrike_drop',
            payload: {
                shooterId,
                shooterName,
                team,
                targetX: from.x,
                targetZ: from.z
            }
        });
    }

    public checkObstacleProjectileHit(pos: THREE.Vector3, obstacles: WorldObstacle[]): boolean {
        for (const obs of obstacles) {
            if (pos.y > obs.height) continue;
            if (obs.type === 'box' && obs.minX !== undefined && obs.maxX !== undefined && obs.minZ !== undefined && obs.maxZ !== undefined) {
                if (pos.x >= obs.minX && pos.x <= obs.maxX && pos.z >= obs.minZ && pos.z <= obs.maxZ) {
                    return true;
                }
            } else if (obs.type === 'circle' && obs.centerX !== undefined && obs.centerZ !== undefined && obs.radius !== undefined) {
                const dx = pos.x - obs.centerX;
                const dz = pos.z - obs.centerZ;
                if (dx * dx + dz * dz <= obs.radius * obs.radius) {
                    return true;
                }
            }
        }
        return false;
    }

    public updateProjectiles(
        dt: number,
        units: Map<string, CombatUnit>,
        obstacles: WorldObstacle[],
        barrels: ExplosiveBarrel[],
        onDamageUnit: (victim: CombatUnit, damage: number, attackerId: string, attackerName: string, attackerTeam: Team) => void
    ) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.life -= dt;

            if (p.isGrenade && p.gravity) {
                p.velocity.y -= p.gravity * dt;
                if (p.tumbleSpeed) {
                    p.mesh.rotation.x += p.tumbleSpeed.x * dt;
                    p.mesh.rotation.y += p.tumbleSpeed.y * dt;
                    p.mesh.rotation.z += p.tumbleSpeed.z * dt;
                }
            }

            p.mesh.position.addScaledVector(p.velocity, dt);

            // Ground hit
            const groundHit = p.isGrenade ? p.mesh.position.y <= 0.3 : p.mesh.position.y <= 0.1;
            if (p.life <= 0 || groundHit) {
                if (p.isExplosive) {
                    this.fx.triggerSpreadingExplosion(p.mesh.position, p.explosionRadius, p.damage, p.shooterId, p.shooterName, p.team, units, barrels, onDamageUnit);
                    warAudio.playExplosion();
                }
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
                continue;
            }

            // Obstacle hit
            if (this.checkObstacleProjectileHit(p.mesh.position, obstacles)) {
                if (p.isExplosive) {
                    this.fx.triggerSpreadingExplosion(p.mesh.position, p.explosionRadius, p.damage, p.shooterId, p.shooterName, p.team, units, barrels, onDamageUnit);
                    warAudio.playExplosion();
                } else {
                    this.fx.spawnCrashParticle(p.mesh.position);
                    warAudio.playHit();
                }
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
                continue;
            }

            // Direct Unit Impact Detection
            for (const [id, unit] of units) {
                if (unit.isDead || unit.team === p.team || id === p.shooterId) continue;

                const hitboxRadius = unit.unitClass === 'plane' ? 4.5 : (unit.unitClass === 'tank' ? 3.0 : 1.2);
                if (p.mesh.position.distanceTo(unit.pos) < hitboxRadius) {
                    if (p.isExplosive) {
                        this.fx.triggerSpreadingExplosion(p.mesh.position, p.explosionRadius, p.damage, p.shooterId, p.shooterName, p.team, units, barrels, onDamageUnit);
                        warAudio.playExplosion();
                    } else {
                        onDamageUnit(unit, p.damage, p.shooterId, p.shooterName, p.team);
                    }
                    this.scene.remove(p.mesh);
                    this.projectiles.splice(i, 1);
                    break;
                }
            }
        }
    }

    public updateCrashingUnits(
        dt: number,
        units: Map<string, CombatUnit>,
        barrels: ExplosiveBarrel[],
        onDamageUnit: (victim: CombatUnit, damage: number, attackerId: string, attackerName: string, attackerTeam: Team) => void,
        onShowRespawnOverlay: (seconds: number) => void
    ) {
        units.forEach(unit => {
            if (unit.isCrashing && unit.crashVelocity && unit.crashRotationSpeed) {
                unit.crashVelocity.y -= 22.0 * dt;
                unit.pos.addScaledVector(unit.crashVelocity, dt);
                unit.root.position.copy(unit.pos);
                unit.root.rotation.x += unit.crashRotationSpeed.x * dt;
                unit.root.rotation.y += unit.crashRotationSpeed.y * dt;
                unit.root.rotation.z += unit.crashRotationSpeed.z * dt;
                this.fx.spawnCrashParticle(unit.pos.clone());

                if (unit.pos.y <= 0.5) {
                    unit.pos.y = 0;
                    unit.isCrashing = false;
                    unit.isDead = true;
                    unit.root.visible = false;
                    this.fx.triggerSpreadingExplosion(
                        unit.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), 18.0, 50, unit.id, unit.name, unit.team,
                        units, barrels, onDamageUnit
                    );
                    warAudio.playCannonShot();
                    unit.respawnTimer = 5.0;
                    if (unit.isLocalPlayer) onShowRespawnOverlay(5);
                }
            }
        });
    }
}

