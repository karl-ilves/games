import * as THREE from 'three';
import { Team, UnitClass, CombatUnit, WorldObstacle } from '../types';
import { BLUE_ROSTER, RED_ROSTER } from '../catalog';
import { UnitBuilder } from '../models/unitBuilder';

export class AIController {
    private scene: THREE.Scene;
    private unitBuilder: UnitBuilder;
    public initialBotSpawnMap: Map<string, { pos: THREE.Vector3; rot: number }> = new Map();
    public isRosterSpawned = false;

    constructor(scene: THREE.Scene, unitBuilder: UnitBuilder) {
        this.scene = scene;
        this.unitBuilder = unitBuilder;
    }

    public spawnBattleRoster(localTeam: Team, units: Map<string, CombatUnit>) {
        if (this.isRosterSpawned) return;
        this.isRosterSpawned = true;

        const blueBotsToSpawn = localTeam === 'blue' ? BLUE_ROSTER.slice(0, 9) : BLUE_ROSTER;
        blueBotsToSpawn.forEach((entry, idx) => {
            const id = `ai_blue_${idx + 1}`;
            const pos = new THREE.Vector3(entry.x, 0, entry.z);
            this.initialBotSpawnMap.set(id, { pos: pos.clone(), rot: 0 });
            const u = entry.class === 'tank'
                ? this.unitBuilder.createTank(id, entry.name, 'blue', false, true, pos, 0)
                : this.unitBuilder.createSoldier(id, entry.name, 'blue', false, true, pos, 0);
            units.set(id, u);
        });

        const redBotsToSpawn = localTeam === 'red' ? RED_ROSTER.slice(0, 9) : RED_ROSTER;
        redBotsToSpawn.forEach((entry, idx) => {
            const id = `ai_red_${idx + 1}`;
            const pos = new THREE.Vector3(entry.x, 0, entry.z);
            this.initialBotSpawnMap.set(id, { pos: pos.clone(), rot: Math.PI });
            const u = entry.class === 'tank'
                ? this.unitBuilder.createTank(id, entry.name, 'red', false, true, pos, Math.PI)
                : this.unitBuilder.createSoldier(id, entry.name, 'red', false, true, pos, Math.PI);
            units.set(id, u);
        });
    }

    public updateBots(
        dt: number,
        isCountdownActive: boolean,
        units: Map<string, CombatUnit>,
        obstacles: WorldObstacle[],
        onRespawnUnit: (unit: CombatUnit) => void,
        onSpawnProjectile: (id: string, name: string, team: Team, from: THREE.Vector3, dir: THREE.Vector3, isExplosive: boolean, isCannon: boolean) => void
    ) {
        if (isCountdownActive) return;

        units.forEach(unit => {
            if (unit.isLocalPlayer || !unit.isBot) return;

            if (unit.isDead) {
                if (unit.respawnTimer > 0) {
                    unit.respawnTimer -= dt;
                    if (unit.respawnTimer <= 0) onRespawnUnit(unit);
                }
                return;
            }

            let closestEnemy: CombatUnit | null = null;
            let minDist = 9999;
            units.forEach(other => {
                if (!other.isDead && other.team !== unit.team) {
                    const dist = unit.pos.distanceTo(other.pos);
                    if (dist < minDist) {
                        minDist = dist;
                        closestEnemy = other;
                    }
                }
            });

            const isTank = unit.unitClass === 'tank';
            const maxSpeed = isTank ? 11.0 : 13.0;

            if (closestEnemy) {
                const targetPos = (closestEnemy as CombatUnit).pos;
                const dx = targetPos.x - unit.pos.x;
                const dz = targetPos.z - unit.pos.z;
                const desiredAngle = Math.atan2(dx, dz);

                let diff = desiredAngle - unit.rotation;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                unit.rotation += diff * Math.min(1.0, 3.5 * dt);

                let sepX = 0;
                let sepZ = 0;
                units.forEach(other => {
                    if (other.id !== unit.id && !other.isDead) {
                        const d = unit.pos.distanceTo(other.pos);
                        if (d < 18.0 && d > 0.001) {
                            const push = (18.0 - d) / 18.0;
                            sepX += ((unit.pos.x - other.pos.x) / d) * push * 16.0;
                            sepZ += ((unit.pos.z - other.pos.z) / d) * push * 16.0;
                        }
                    }
                });

                let moveSpeed = 0;
                if (minDist > 30) moveSpeed = maxSpeed;
                else if (minDist < 16) moveSpeed = -maxSpeed * 0.4;
                else moveSpeed = maxSpeed * 0.35;

                const forward = new THREE.Vector3(Math.sin(unit.rotation), 0, Math.cos(unit.rotation));
                unit.pos.addScaledVector(forward, moveSpeed * dt);
                unit.pos.x += sepX * dt;
                unit.pos.z += sepZ * dt;

                this.resolveObstacleCollisions(unit.pos, isTank ? 3.2 : 1.4, obstacles);

                unit.pos.x = Math.max(-780, Math.min(780, unit.pos.x));
                unit.pos.z = Math.max(-780, Math.min(780, unit.pos.z));

                unit.root.position.copy(unit.pos);
                unit.root.rotation.y = unit.rotation;

                if (!isTank && unit.leftLeg && unit.rightLeg) {
                    if (Math.abs(moveSpeed) > 1) {
                        unit.walkCycle = (unit.walkCycle || 0) + 12 * dt;
                        unit.leftLeg.rotation.x = Math.sin(unit.walkCycle) * 0.5;
                        unit.rightLeg.rotation.x = -Math.sin(unit.walkCycle) * 0.5;
                    } else {
                        unit.leftLeg.rotation.x = 0;
                        unit.rightLeg.rotation.x = 0;
                    }
                }

                if (unit.turret) {
                    const localAim = unit.root.worldToLocal(targetPos.clone());
                    const aimAngle = Math.atan2(localAim.x, localAim.z);
                    unit.turret.rotation.y = aimAngle;
                }

                unit.reloadTimer -= dt;
                if (unit.reloadTimer <= 0 && minDist < 160) {
                    unit.reloadTimer = isTank ? 2.6 + Math.random() * 1.5 : 1.2 + Math.random() * 1.0;
                    const fromPos = unit.pos.clone().add(new THREE.Vector3(0, isTank ? 2.5 : 1.4, 0));
                    const spread = (Math.random() - 0.5) * 0.12;
                    const dir = new THREE.Vector3().subVectors(targetPos, fromPos).normalize();
                    dir.x += spread;
                    dir.z += spread;
                    onSpawnProjectile(unit.id, unit.name, unit.team, fromPos, dir, isTank, isTank);
                }
            }
        });
    }

    public resolveObstacleCollisions(pos: THREE.Vector3, unitRadius: number, obstacles: WorldObstacle[]) {
        for (const obs of obstacles) {
            if (obs.height < pos.y) continue;

            if (obs.type === 'box' && obs.minX !== undefined && obs.maxX !== undefined && obs.minZ !== undefined && obs.maxZ !== undefined) {
                const closestX = Math.max(obs.minX, Math.min(obs.maxX, pos.x));
                const closestZ = Math.max(obs.minZ, Math.min(obs.maxZ, pos.z));

                const dx = pos.x - closestX;
                const dz = pos.z - closestZ;
                const distSq = dx * dx + dz * dz;

                if (distSq < unitRadius * unitRadius) {
                    const dist = Math.sqrt(distSq);
                    if (dist > 0.0001) {
                        const overlap = unitRadius - dist;
                        pos.x += (dx / dist) * overlap;
                        pos.z += (dz / dist) * overlap;
                    } else {
                        const dLeft = Math.abs(pos.x - obs.minX);
                        const dRight = Math.abs(pos.x - obs.maxX);
                        const dTop = Math.abs(pos.z - obs.minZ);
                        const dBottom = Math.abs(pos.z - obs.maxZ);
                        const minD = Math.min(dLeft, dRight, dTop, dBottom);
                        if (minD === dLeft) pos.x = obs.minX - unitRadius;
                        else if (minD === dRight) pos.x = obs.maxX + unitRadius;
                        else if (minD === dTop) pos.z = obs.minZ - unitRadius;
                        else pos.z = obs.maxZ + unitRadius;
                    }
                }
            } else if (obs.type === 'circle' && obs.centerX !== undefined && obs.centerZ !== undefined && obs.radius !== undefined) {
                const dx = pos.x - obs.centerX;
                const dz = pos.z - obs.centerZ;
                const minDist = obs.radius + unitRadius;
                const distSq = dx * dx + dz * dz;

                if (distSq < minDist * minDist) {
                    const dist = Math.sqrt(distSq);
                    if (dist > 0.0001) {
                        const overlap = minDist - dist;
                        pos.x += (dx / dist) * overlap;
                        pos.z += (dz / dist) * overlap;
                    } else {
                        pos.x += minDist;
                    }
                }
            }
        }
    }
}
