import * as THREE from 'three';
import { Character, CoinItem, DroppedGun } from '../types';
import { InGameEmotesWidget } from '../../../shared/avatar/InGameEmotesWidget';
import { avatarService } from '../../../shared/avatar/AvatarService';
import { audio } from '../audio';
import { getCharacterFromObject, hasLineOfSight } from './combat';

export interface PlayerControllerContext {
    playerChar: Character;
    characters: Character[];
    wallMeshes: THREE.Mesh[];
    mapColliders: THREE.Box3[];
    keys: { [key: string]: boolean };
    joystickInput: { x: number; y: number };
    isSprinting: boolean;
    cameraYaw: number;
    cameraPitch: number;
    cameraDistance: number;
    camera: THREE.PerspectiveCamera;
    scene: THREE.Scene;
    state: string;
    coins: CoinItem[];
    droppedGun: DroppedGun | null;
    emotesWidget: InGameEmotesWidget | null;
    interactionPrompt: HTMLElement | null;
    hudCoinsVal: HTMLElement | null;
    setCameraYaw: (v: number) => void;
    setCameraPitch: (v: number) => void;
}

export function updatePlayer(delta: number, ctx: PlayerControllerContext) {
    if (!ctx.playerChar.isAlive) return;

    // 1. Keyboard Camera View Look (I/J/K/L)
    const lookSpeed = 3.0;
    if (ctx.keys['KeyJ']) {
        ctx.setCameraYaw(ctx.cameraYaw + lookSpeed * delta);
        if (ctx.playerChar.hasWeaponEquipped || ctx.cameraDistance <= 1.2) {
            ctx.playerChar.rotation = ctx.cameraYaw + Math.PI;
        }
    }
    if (ctx.keys['KeyL']) {
        ctx.setCameraYaw(ctx.cameraYaw - lookSpeed * delta);
        if (ctx.playerChar.hasWeaponEquipped || ctx.cameraDistance <= 1.2) {
            ctx.playerChar.rotation = ctx.cameraYaw + Math.PI;
        }
    }
    if (ctx.keys['KeyI']) {
        ctx.setCameraPitch(Math.min(Math.PI / 3, ctx.cameraPitch + 2.2 * delta));
    }
    if (ctx.keys['KeyK']) {
        ctx.setCameraPitch(Math.max(-Math.PI / 4, ctx.cameraPitch - 2.2 * delta));
    }

    // 2. Player Movement (WASD + Arrow Keys + Touch Joystick)
    let inputX = 0;
    let inputZ = 0;

    if (ctx.keys['KeyW'] || ctx.keys['ArrowUp']) inputZ -= 1;
    if (ctx.keys['KeyS'] || ctx.keys['ArrowDown']) inputZ += 1;
    if (ctx.keys['KeyA'] || ctx.keys['ArrowLeft']) inputX -= 1;
    if (ctx.keys['KeyD'] || ctx.keys['ArrowRight']) inputX += 1;

    if (Math.abs(ctx.joystickInput.x) > 0.05 || Math.abs(ctx.joystickInput.y) > 0.05) {
        inputX = ctx.joystickInput.x;
        inputZ = ctx.joystickInput.y;
    }

    const moveDir = new THREE.Vector3(inputX, 0, inputZ);

    if (moveDir.lengthSq() > 0.001) {
        if (moveDir.lengthSq() > 1) {
            moveDir.normalize();
        }
        moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), ctx.cameraYaw);

        ctx.playerChar.rotation = Math.atan2(moveDir.x, moveDir.z);

        const speed = ctx.isSprinting ? 12 : 7;
        const nextPos = ctx.playerChar.position.clone().addScaledVector(moveDir, speed * delta);

        const isPlayerOnMap = ctx.state === 'in_game' || ctx.state === 'role_reveal' || ctx.state === 'map_vote';
        if (isPlayerOnMap) {
            const playerSize = new THREE.Vector3(1.2, 3, 1.2);

            const currentBox = new THREE.Box3().setFromCenterAndSize(ctx.playerChar.position.clone().add(new THREE.Vector3(0, 1.5, 0)), playerSize);
            for (const wallBox of ctx.mapColliders) {
                if (wallBox.intersectsBox(currentBox)) {
                    const overlapX1 = currentBox.max.x - wallBox.min.x;
                    const overlapX2 = wallBox.max.x - currentBox.min.x;
                    const overlapZ1 = currentBox.max.z - wallBox.min.z;
                    const overlapZ2 = wallBox.max.z - currentBox.min.z;
                    const minOverlapX = overlapX1 < overlapX2 ? -overlapX1 : overlapX2;
                    const minOverlapZ = overlapZ1 < overlapZ2 ? -overlapZ1 : overlapZ2;
                    if (Math.abs(minOverlapX) < Math.abs(minOverlapZ)) {
                        ctx.playerChar.position.x += minOverlapX * 1.05;
                    } else {
                        ctx.playerChar.position.z += minOverlapZ * 1.05;
                    }
                }
            }

            const targetBox = new THREE.Box3().setFromCenterAndSize(nextPos.clone().add(new THREE.Vector3(0, 1.5, 0)), playerSize);
            let collidesCombined = false;
            for (const wallBox of ctx.mapColliders) {
                if (wallBox.intersectsBox(targetBox)) {
                    collidesCombined = true;
                    break;
                }
            }

            if (!collidesCombined) {
                ctx.playerChar.position.copy(nextPos);
            } else {
                const tryPosX = ctx.playerChar.position.clone();
                tryPosX.x += moveDir.x * speed * delta;
                const boxX = new THREE.Box3().setFromCenterAndSize(tryPosX.clone().add(new THREE.Vector3(0, 1.5, 0)), playerSize);
                let collidesX = false;
                for (const wallBox of ctx.mapColliders) {
                    if (wallBox.intersectsBox(boxX)) {
                        collidesX = true;
                        break;
                    }
                }
                if (!collidesX) {
                    ctx.playerChar.position.x = tryPosX.x;
                }

                const tryPosZ = ctx.playerChar.position.clone();
                tryPosZ.z += moveDir.z * speed * delta;
                const boxZ = new THREE.Box3().setFromCenterAndSize(tryPosZ.clone().add(new THREE.Vector3(0, 1.5, 0)), playerSize);
                let collidesZ = false;
                for (const wallBox of ctx.mapColliders) {
                    if (wallBox.intersectsBox(boxZ)) {
                        collidesZ = true;
                        break;
                    }
                }
                if (!collidesZ) {
                    ctx.playerChar.position.z = tryPosZ.z;
                }
            }

            ctx.playerChar.position.x = Math.max(-44, Math.min(44, ctx.playerChar.position.x));
            ctx.playerChar.position.z = Math.max(-44, Math.min(44, ctx.playerChar.position.z));
        } else {
            nextPos.x = Math.max(-18, Math.min(18, nextPos.x));
            nextPos.z = Math.max(132, Math.min(168, nextPos.z));
            ctx.playerChar.position.copy(nextPos);
        }

        ctx.playerChar.mesh.position.copy(ctx.playerChar.position);
        ctx.playerChar.mesh.rotation.y = ctx.playerChar.rotation;

        if (ctx.emotesWidget && ctx.emotesWidget.getActiveEmote() !== 'idle') {
            ctx.emotesWidget.stopEmoteQuietly();
        }
        if (ctx.playerChar.avatarRig) {
            const now = performance.now() * 0.001;
            ctx.playerChar.avatarRig.updateAnimation(now, 'run');
            if (ctx.playerChar.hasWeaponEquipped && ctx.playerChar.rightArm) {
                ctx.playerChar.rightArm.rotation.x = -0.35;
            }
        } else {
            ctx.playerChar.walkAnimTimer = (ctx.playerChar.walkAnimTimer || 0) + delta * 11;
            if (ctx.playerChar.leftLeg && ctx.playerChar.rightLeg) {
                ctx.playerChar.leftLeg.rotation.x = Math.sin(ctx.playerChar.walkAnimTimer) * 0.45;
                ctx.playerChar.rightLeg.rotation.x = -Math.sin(ctx.playerChar.walkAnimTimer) * 0.45;
            }
            if (ctx.playerChar.leftArm && ctx.playerChar.rightArm) {
                ctx.playerChar.leftArm.rotation.x = -Math.sin(ctx.playerChar.walkAnimTimer) * 0.4;
                if (!ctx.playerChar.hasWeaponEquipped) {
                    ctx.playerChar.rightArm.rotation.x = Math.sin(ctx.playerChar.walkAnimTimer) * 0.4;
                } else {
                    ctx.playerChar.rightArm.rotation.x = -0.35;
                }
            }
        }
    } else {
        if (ctx.playerChar.hasWeaponEquipped || ctx.cameraDistance <= 1.2) {
            ctx.playerChar.rotation = ctx.cameraYaw + Math.PI;
        }
        ctx.playerChar.mesh.rotation.y = ctx.playerChar.rotation;

        if (ctx.playerChar.avatarRig) {
            const now = performance.now() * 0.001;
            const activeEmote = ctx.emotesWidget ? ctx.emotesWidget.getActiveEmote() : (avatarService.getConfig()?.activeEmote || 'idle');
            ctx.playerChar.avatarRig.updateAnimation(now, activeEmote);
            if (ctx.playerChar.hasWeaponEquipped && ctx.playerChar.rightArm) {
                ctx.playerChar.rightArm.rotation.x = -0.35;
            }
        } else {
            const idle = Math.sin(Date.now() * 0.0025) * 0.03;
            if (ctx.playerChar.leftLeg) ctx.playerChar.leftLeg.rotation.x = 0;
            if (ctx.playerChar.rightLeg) ctx.playerChar.rightLeg.rotation.x = 0;
            if (ctx.playerChar.leftArm) ctx.playerChar.leftArm.rotation.x = idle;
            if (ctx.playerChar.rightArm && !ctx.playerChar.hasWeaponEquipped) ctx.playerChar.rightArm.rotation.x = -idle;
        }
    }

    if (ctx.droppedGun && ctx.droppedGun.active && ctx.playerChar.role === 'innocent') {
        const distToGun = ctx.playerChar.position.distanceTo(ctx.droppedGun.position);
        if (distToGun < 3.5) {
            if (ctx.interactionPrompt) {
                ctx.interactionPrompt.style.display = 'block';
            }
        } else if (ctx.interactionPrompt) {
            ctx.interactionPrompt.style.display = 'none';
        }
    } else if (ctx.interactionPrompt) {
        ctx.interactionPrompt.style.display = 'none';
    }

    if (ctx.state === 'in_game') {
        ctx.coins.forEach(coin => {
            if (!coin.collected && ctx.playerChar.position.distanceTo(coin.position) < 2.0) {
                coin.collected = true;
                ctx.scene.remove(coin.mesh);
                ctx.playerChar.coins++;
                audio.playCoin();
                if (ctx.hudCoinsVal) ctx.hudCoinsVal.textContent = ctx.playerChar.coins.toString();
            }
        });

        const murderer = ctx.characters.find(c => c.role === 'murderer' && c.isAlive);
        if (murderer && !ctx.playerChar.isPlayer && ctx.playerChar.role !== 'murderer') {
            const dist = ctx.playerChar.position.distanceTo(murderer.position);
            audio.setHeartbeatRate(dist);
        } else {
            audio.setHeartbeatRate(0);
        }
    }

    const camOffset = new THREE.Vector3(0, ctx.cameraDistance < 1.0 ? 2.8 : 2.5, ctx.cameraDistance);
    camOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), ctx.cameraPitch);
    camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), ctx.cameraYaw);

    ctx.camera.position.copy(ctx.playerChar.position).add(camOffset);
    ctx.camera.lookAt(ctx.playerChar.position.clone().add(new THREE.Vector3(0, 1.8, 0)));

    if (ctx.playerChar.mesh) {
        ctx.playerChar.mesh.visible = ctx.cameraDistance > 1.2;
    }

    if (ctx.state === 'in_game' && ctx.playerChar.isAlive && ctx.playerChar.role === 'murderer') {
        const crosshair = document.getElementById('crosshair');
        if (crosshair) {
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(0, 0), ctx.camera);
            const targets = ctx.characters.filter(c => c !== ctx.playerChar && c.isAlive && c.mesh).map(c => c.mesh);
            const hits = raycaster.intersectObjects([...targets, ...ctx.wallMeshes], true);
            let inMeleeRange = false;
            if (hits.length > 0) {
                const hitTarget = getCharacterFromObject(hits[0].object, ctx.characters);
                if (hitTarget && hitTarget.isAlive && ctx.playerChar.position.distanceTo(hitTarget.position) <= 4.2 && hasLineOfSight(ctx.playerChar.position, hitTarget.position, ctx.wallMeshes)) {
                    inMeleeRange = true;
                }
            }
            if (inMeleeRange) {
                crosshair.classList.add('target-in-range');
            } else {
                crosshair.classList.remove('target-in-range');
            }
        }
    }
}
