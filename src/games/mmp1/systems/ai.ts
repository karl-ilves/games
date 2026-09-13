import * as THREE from 'three';
import { Character } from '../types';
import { hasLineOfSight } from './combat';

export interface AIContext {
    characters: Character[];
    state: string;
    mapColliders: THREE.Box3[];
    wallMeshes: THREE.Mesh[];
    droppedGun: { active: boolean; position: THREE.Vector3 } | null;
    hasSheriffWitnessedMurder: boolean;
    setHasSheriffWitnessedMurder: (v: boolean) => void;
    addIncidentFeed: (text: string) => void;
    performMurdererSlash: (c: Character) => void;
    performSheriffShoot: (c: Character) => void;
    pickUpDroppedGun: (c: Character) => void;
}

export function updateAI(delta: number, ctx: AIContext) {
    const murderer = ctx.characters.find(c => c.role === 'murderer' && c.isAlive);

    ctx.characters.forEach(c => {
        if (c.isPlayer || !c.isAlive) return;

        if (ctx.state === 'role_reveal' || ctx.state === 'map_vote') {
            c.aiTarget = undefined;
            return;
        }

        c.aiTimer -= delta;
        if (c.aiTimer <= 0) {
            c.aiTimer = 1.5 + Math.random() * 2;
            
            if (ctx.state === 'lobby') {
                c.aiTarget = new THREE.Vector3(
                    (Math.random() - 0.5) * 30,
                    0,
                    150 + (Math.random() - 0.5) * 30
                );
            } else if (ctx.state === 'in_game') {
                if (c.role === 'murderer') {
                    const victims = ctx.characters.filter(v => v !== c && v.isAlive);
                    if (victims.length > 0) {
                        victims.sort((a, b) => c.position.distanceTo(a.position) - c.position.distanceTo(b.position));
                        c.aiTarget = victims[0].position.clone();
                        c.hasWeaponEquipped = c.position.distanceTo(victims[0].position) < 12;
                        if (c.knifeMesh) c.knifeMesh.visible = c.hasWeaponEquipped;
                    }
                } else if (c.role === 'sheriff') {
                    if (murderer && murderer.isAlive) {
                        const canSee = hasLineOfSight(c.position, murderer.position, ctx.wallMeshes);
                        const dist = c.position.distanceTo(murderer.position);

                        if (canSee && dist < 24 && murderer.hasWeaponEquipped) {
                            if (!ctx.hasSheriffWitnessedMurder) {
                                ctx.setHasSheriffWitnessedMurder(true);
                                ctx.addIncidentFeed('👁️ Šerif nägi mõrvarit noaga! Tuli avatud!');
                            }
                        }

                        if (ctx.hasSheriffWitnessedMurder) {
                            if (canSee) {
                                c.aiTarget = murderer.position.clone();
                                c.hasWeaponEquipped = true;
                                if (c.gunMesh) c.gunMesh.visible = true;
                            } else {
                                c.aiTarget = murderer.position.clone();
                                c.hasWeaponEquipped = false;
                                if (c.gunMesh) c.gunMesh.visible = false;
                            }
                        } else {
                            c.hasWeaponEquipped = false;
                            if (c.gunMesh) c.gunMesh.visible = false;
                            c.aiTarget = new THREE.Vector3((Math.random() - 0.5) * 75, 0, (Math.random() - 0.5) * 75);
                            c.aiTarget.x = Math.max(-42, Math.min(42, c.aiTarget.x));
                            c.aiTarget.z = Math.max(-42, Math.min(42, c.aiTarget.z));
                        }
                    } else {
                        c.hasWeaponEquipped = false;
                        if (c.gunMesh) c.gunMesh.visible = false;
                        c.aiTarget = new THREE.Vector3((Math.random() - 0.5) * 75, 0, (Math.random() - 0.5) * 75);
                        c.aiTarget.x = Math.max(-42, Math.min(42, c.aiTarget.x));
                        c.aiTarget.z = Math.max(-42, Math.min(42, c.aiTarget.z));
                    }
                } else {
                    if (ctx.droppedGun && ctx.droppedGun.active && Math.random() < 0.6) {
                        c.aiTarget = ctx.droppedGun.position.clone();
                    } else if (murderer && murderer.hasWeaponEquipped && c.position.distanceTo(murderer.position) < 14) {
                        const away = c.position.clone().sub(murderer.position).normalize().multiplyScalar(20);
                        c.aiTarget = c.position.clone().add(away);
                        c.aiTarget.x = Math.max(-42, Math.min(42, c.aiTarget.x));
                        c.aiTarget.z = Math.max(-42, Math.min(42, c.aiTarget.z));
                    } else {
                        c.aiTarget = new THREE.Vector3((Math.random() - 0.5) * 80, 0, (Math.random() - 0.5) * 80);
                        c.aiTarget.x = Math.max(-42, Math.min(42, c.aiTarget.x));
                        c.aiTarget.z = Math.max(-42, Math.min(42, c.aiTarget.z));
                    }
                }
            }
        }

        if (c.aiTarget) {
            const dir = c.aiTarget.clone().sub(c.position);
            dir.y = 0;
            const dist = dir.length();
            if (dist > 0.5) {
                dir.normalize();
                const speed = (c.role === 'murderer') ? 8.5 : 6.0;
                const moveStep = dir.clone().multiplyScalar(speed * delta);
                const botSize = new THREE.Vector3(1.2, 3, 1.2);

                if (ctx.state === 'in_game') {
                    const currentBox = new THREE.Box3().setFromCenterAndSize(c.position.clone().add(new THREE.Vector3(0, 1.5, 0)), botSize);
                    for (const wallBox of ctx.mapColliders) {
                        if (wallBox.intersectsBox(currentBox)) {
                            const overlapX1 = currentBox.max.x - wallBox.min.x;
                            const overlapX2 = wallBox.max.x - currentBox.min.x;
                            const overlapZ1 = currentBox.max.z - wallBox.min.z;
                            const overlapZ2 = wallBox.max.z - currentBox.min.z;
                            const minOverlapX = overlapX1 < overlapX2 ? -overlapX1 : overlapX2;
                            const minOverlapZ = overlapZ1 < overlapZ2 ? -overlapZ1 : overlapZ2;
                            if (Math.abs(minOverlapX) < Math.abs(minOverlapZ)) {
                                c.position.x += minOverlapX * 1.05;
                            } else {
                                c.position.z += minOverlapZ * 1.05;
                            }
                        }
                    }

                    const tryPosXZ = c.position.clone().add(moveStep);
                    const boxXZ = new THREE.Box3().setFromCenterAndSize(tryPosXZ.clone().add(new THREE.Vector3(0, 1.5, 0)), botSize);
                    let collidesXZ = false;
                    for (const wallBox of ctx.mapColliders) {
                        if (wallBox.intersectsBox(boxXZ)) {
                            collidesXZ = true;
                            break;
                        }
                    }

                    if (!collidesXZ) {
                        c.position.copy(tryPosXZ);
                    } else {
                        let moved = false;
                        const tryPosX = c.position.clone();
                        tryPosX.x += moveStep.x;
                        const boxX = new THREE.Box3().setFromCenterAndSize(tryPosX.clone().add(new THREE.Vector3(0, 1.5, 0)), botSize);
                        let collidesX = false;
                        for (const wallBox of ctx.mapColliders) {
                            if (wallBox.intersectsBox(boxX)) {
                                collidesX = true;
                                break;
                            }
                        }
                        if (!collidesX) {
                            c.position.x = tryPosX.x;
                            moved = true;
                        }

                        const tryPosZ = c.position.clone();
                        tryPosZ.z += moveStep.z;
                        const boxZ = new THREE.Box3().setFromCenterAndSize(tryPosZ.clone().add(new THREE.Vector3(0, 1.5, 0)), botSize);
                        let collidesZ = false;
                        for (const wallBox of ctx.mapColliders) {
                            if (wallBox.intersectsBox(boxZ)) {
                                collidesZ = true;
                                break;
                            }
                        }
                        if (!collidesZ) {
                            c.position.z = tryPosZ.z;
                            moved = true;
                        }

                        if (!moved) {
                            c.aiTimer = 0.1;
                            const bounce = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() > 0.5 ? 1 : -1) * Math.PI * 0.5).multiplyScalar(15);
                            c.aiTarget = c.position.clone().add(bounce);
                            c.aiTarget.x = Math.max(-44, Math.min(44, c.aiTarget.x));
                            c.aiTarget.z = Math.max(-44, Math.min(44, c.aiTarget.z));
                        }
                    }

                    c.position.x = Math.max(-44, Math.min(44, c.position.x));
                    c.position.z = Math.max(-44, Math.min(44, c.position.z));
                } else {
                    const nextPos = c.position.clone().add(moveStep);
                    nextPos.x = Math.max(-18, Math.min(18, nextPos.x));
                    nextPos.z = Math.max(132, Math.min(168, nextPos.z));
                    c.position.copy(nextPos);
                }

                c.rotation = Math.atan2(dir.x, dir.z);
                c.mesh.position.copy(c.position);
                c.mesh.rotation.y = c.rotation;

                c.walkAnimTimer = (c.walkAnimTimer || 0) + delta * 9;
                if (c.leftLeg && c.rightLeg) {
                    c.leftLeg.rotation.x = Math.sin(c.walkAnimTimer) * 0.45;
                    c.rightLeg.rotation.x = -Math.sin(c.walkAnimTimer) * 0.45;
                }
                if (c.leftArm && c.rightArm) {
                    c.leftArm.rotation.x = -Math.sin(c.walkAnimTimer) * 0.38;
                    if (!c.hasWeaponEquipped) {
                        c.rightArm.rotation.x = Math.sin(c.walkAnimTimer) * 0.38;
                    } else {
                        c.rightArm.rotation.x = -0.35;
                    }
                }
            } else {
                const idle = Math.sin(Date.now() * 0.0025 + (c.walkAnimTimer || 0)) * 0.03;
                if (c.leftLeg) c.leftLeg.rotation.x = 0;
                if (c.rightLeg) c.rightLeg.rotation.x = 0;
                if (c.leftArm) c.leftArm.rotation.x = idle;
                if (c.rightArm && !c.hasWeaponEquipped) c.rightArm.rotation.x = -idle;
            }

            if (ctx.state === 'in_game') {
                if (c.role === 'murderer' && dist < 3.2) {
                    ctx.performMurdererSlash(c);
                } else if (c.role === 'sheriff' && murderer && murderer.isAlive) {
                    if (ctx.hasSheriffWitnessedMurder) {
                        const distToMurderer = c.position.distanceTo(murderer.position);
                        const hasClearLOS = hasLineOfSight(c.position, murderer.position, ctx.wallMeshes);
                        if (hasClearLOS && distToMurderer < 20) {
                            ctx.performSheriffShoot(c);
                        }
                    }
                }
            }

            if (ctx.droppedGun && ctx.droppedGun.active && c.role === 'innocent') {
                if (c.position.distanceTo(ctx.droppedGun.position) < 2.5) {
                    ctx.pickUpDroppedGun(c);
                }
            }
        }
    });
}
