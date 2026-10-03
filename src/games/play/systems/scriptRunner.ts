import * as THREE from 'three';
import { yardService } from '../../../shared/yardService';
import { PlayState } from '../state/playState';
import { playPlaySound } from '../audio';
import { isPlayerTouchingOrOnTop } from './collision';

export function executePlayScriptAction(act: any, group: THREE.Group, playerPos: THREE.Vector3, state: PlayState) {
    if (!act || !act.type) return;
    switch (act.type) {
        case 'jump_boost': {
            const force = act.jumpForce ?? 22;
            state.playSuperJump(force);
            break;
        }
        case 'speed_boost': {
            const mult = act.speedMultiplier ?? 2.2;
            const dur = act.duration ?? 4.0;
            state.playSpeedBoost(mult, dur);
            break;
        }
        case 'damage': {
            const amt = act.amount ?? 25;
            state.damagePlayPlayer(amt);
            playPlaySound('hit');
            break;
        }
        case 'heal': {
            const amt = act.amount ?? 30;
            state.playerHealth = Math.min(state.playerMaxHealth, state.playerHealth + amt);
            state.updatePlayHUD();
            playPlaySound('heal');
            state.showPlayDialogMessage('💖 Tervenemine!', `Ravisid elusid +${amt} HP!`, '💖', 2.5);
            break;
        }
        case 'give_coins': {
            const amt = act.amount ?? 10;
            yardService.addPlayCoins(amt);
            playPlaySound('coin');
            state.showPlayDialogMessage('🪙 Mündid!', `Said juurde +${amt} münti!`, '🪙', 2.5);
            break;
        }
        case 'give_yards': {
            const amt = act.amount ?? 5;
            yardService.addYards(amt);
            playPlaySound('victory');
            state.updatePlayHUD();
            state.showPlayDialogMessage('💎 Playbux!', `Said juurde +${amt} Playbuxi!`, '💎', 2.5);
            break;
        }
        case 'teleport': {
            const tgt = act.teleportTarget ?? { x: state.spawnPointPosition.x, y: state.spawnPointPosition.y, z: state.spawnPointPosition.z };
            if (state.humanCharacter) {
                state.humanCharacter.position.set(tgt.x, tgt.y, tgt.z);
            }
            state.characterVelocity.set(0, 0, 0);
            playPlaySound('teleport');
            state.showPlayDialogMessage('🌀 Teleport', `Teleporditi asukohta (${tgt.x.toFixed(1)}, ${tgt.y.toFixed(1)}, ${tgt.z.toFixed(1)})`, '🌀', 2.5);
            break;
        }
        case 'dialog': {
            if (act.message) {
                state.showPlayDialogMessage(group.userData.name || 'Dialoog', act.message, '💬', 4.0);
            }
            break;
        }
        case 'play_sound': {
            playPlaySound(act.soundName || 'powerup');
            break;
        }
        case 'custom_js': {
            if (act.customCode) {
                executePlayCustomJs(act.customCode, group, playerPos, state);
            }
            break;
        }
    }
}

export function executePlayCustomJs(code: string, group: THREE.Group, playerPos: THREE.Vector3, state: PlayState) {
    try {
        const api = {
            player: {
                damage: (amt = 10) => state.damagePlayPlayer(amt),
                heal: (amt = 10) => {
                    state.playerHealth = Math.min(state.playerMaxHealth, state.playerHealth + amt);
                    state.updatePlayHUD();
                },
                setSpeed: (mult = 2.0, durationSec = 4.0) => state.playSpeedBoost(mult, durationSec),
                jump: (force = 20) => state.playSuperJump(force),
                teleport: (x = 0, y = 0, z = 0) => {
                    playerPos.set(x, y, z);
                    state.characterVelocity.set(0, 0, 0);
                },
                giveCoins: (amt = 10) => yardService.addPlayCoins(amt),
                giveYards: (amt = 5) => {
                    yardService.addYards(amt);
                    state.updatePlayHUD();
                },
                getPosition: () => ({ x: playerPos.x, y: playerPos.y, z: playerPos.z })
            },
            sound: {
                play: (name: string) => playPlaySound(name)
            },
            hud: {
                showMessage: (text: string, title = 'Teade') => state.showPlayDialogMessage(title, text, '💬', 3.5)
            }
        };
        const fn = new Function('api', code);
        fn(api);
    } catch (err: any) {
        console.warn('Sandbox script execution error in play mode:', err);
    }
}

export function checkGameplayTriggers(state: PlayState, promptPurchase: (objData: any, group: THREE.Group) => void) {
    if (!state.humanCharacter) return;
    const pPos = state.humanCharacter.position;

    for (let i = 0; i < state.sceneObjects.length; i++) {
        const group = state.sceneObjects[i];
        const u = group.userData;
        if (!u || !group.visible) continue;

        const dx = group.position.x - pPos.x;
        const dz = group.position.z - pPos.z;
        const distSq = dx * dx + dz * dz;
        const isTouching = distSq < 36.0 && isPlayerTouchingOrOnTop(pPos, group);
        const isCloseProximity = distSq < 5.0;

        // 1. Damage check
        const isHazard = Boolean(
            u.dealsDamage ||
            u.gameItemType === 'hazard' ||
            u.trigger?.type === 'hazard_lava' ||
            u.trigger?.behavior === 'damage' ||
            u.script?.preset === 'damage' ||
            u.customModelData?.behavior === 'hazard' ||
            /(lava|spike|hazard|pahalane|enemy)/i.test(u.name || '')
        );

        if (isHazard && (isTouching || distSq < 3.8)) {
            const dmg = u.damageAmount ?? u.customModelData?.damageAmount ?? 25;
            if (dmg > 0) {
                state.damagePlayPlayer(dmg);
            }
        }

        // 2. Superhüpe (Super Jump / Jump Boost)
        const isSuperJump = Boolean(
            u.trigger?.behavior === 'super_jump' ||
            u.script?.preset === 'jump_boost' ||
            u.behavior === 'super_jump' ||
            u.customModelData?.behavior === 'boost' ||
            /(superhüpe|super jump|jump pad|vedru|trampliin)/i.test(u.name || '') ||
            /(superhüpe|super jump|jump pad|vedru|trampliin)/i.test(u.catalogId || '')
        );

        if (isSuperJump && (isTouching || distSq < 3.2)) {
            const now = Date.now();
            if (now - (u._lastJumpTrigger || 0) > 500) {
                u._lastJumpTrigger = now;
                const force = u.jumpForce ?? u.trigger?.jumpForce ?? u.script?.actions?.[0]?.jumpForce ?? 22;
                state.playSuperJump(force);
            }
        }

        // 3. Speed Boost
        const isSpeedBoost = Boolean(
            u.trigger?.behavior === 'speed_boost' ||
            u.script?.preset === 'speed_boost' ||
            /(kiirendus|speed boost|turbo)/i.test(u.name || '')
        );

        if (isSpeedBoost && (isTouching || distSq < 3.2)) {
            const now = Date.now();
            if (now - (u._lastSpeedTrigger || 0) > 1500) {
                u._lastSpeedTrigger = now;
                const mult = u.trigger?.speedMultiplier ?? u.script?.actions?.[0]?.speedMultiplier ?? 2.2;
                const dur = u.trigger?.duration ?? u.script?.actions?.[0]?.duration ?? 4.0;
                state.playSpeedBoost(mult, dur);
            }
        }

        // 4. Object Custom Scripts
        if (u.script && u.script.enabled !== false && (isTouching || distSq < 3.5)) {
            const now = Date.now();
            const cd = (u.script.cooldown ?? 1.0) * 1000;
            if (now - (u._lastScriptTrigger || 0) >= cd) {
                u._lastScriptTrigger = now;
                if (Array.isArray(u.script.actions)) {
                    for (const act of u.script.actions) {
                        executePlayScriptAction(act, group, pPos, state);
                    }
                }
                if (u.script.customJsCode && u.script.customJsCode.trim()) {
                    executePlayCustomJs(u.script.customJsCode, group, pPos, state);
                }
            }
        }

        // 5. Trigger Dialogue
        if (u.trigger && u.trigger.message && (isTouching || isCloseProximity)) {
            const now = Date.now();
            if (now - (u._lastDialogTrigger || 0) > 4000) {
                u._lastDialogTrigger = now;
                state.showPlayDialogMessage(u.trigger.title || u.name || 'Info', u.trigger.message, '💬', 4.0);
            }
        }

        // 6. Checkpoints
        if ((u.gameItemType === 'checkpoint' || /(checkpoint|kontrollpunkt)/i.test(u.name || '')) && (isTouching || distSq < 3.5)) {
            if (state.spawnPointPosition.distanceTo(group.position) > 2.0) {
                state.spawnPointPosition.set(group.position.x, group.position.y + 0.1, group.position.z);
                playPlaySound('coin');
                state.showPlayDialogMessage('🚩 Kontrollpunkt!', 'Uus taassünnipaik salvestatud!', '🚩', 2.5);
            }
        }

        // 7. Victory Goal
        if ((u.gameItemType === 'goal' || u.trigger?.type === 'goal_win' || /(goal|finish|finiš|võit)/i.test(u.name || '')) && (isTouching || distSq < 3.0)) {
            const now = Date.now();
            if (now - (u._lastGoalTrigger || 0) > 5000) {
                u._lastGoalTrigger = now;
                playPlaySound('victory');
                state.showPlayDialogMessage('🏆 PALJU ÕNNE! VÕIT!', 'Läbisid edukalt mängu finišijoone!', '🏆', 8.0);
            }
        }

        // 8. Holdable items
        if (u.isHoldable && !u.isCollected && (isTouching || distSq < 6.0)) {
            if (u.costsPbx && (u.pbxPrice ?? 0) > 0) {
                if ((state.keys['KeyE'] || distSq < 2.5) && !state.pendingPurchaseObject) {
                    if (state.keys['KeyE']) state.keys['KeyE'] = false;
                    promptPurchase(u, group);
                }
            } else {
                if (state.keys['KeyE'] || distSq < 2.5) {
                    if (state.keys['KeyE']) state.keys['KeyE'] = false;
                    state.equipPlayItemInHand(u);
                    group.visible = false;
                    u.isCollected = true;
                    playPlaySound('coin');
                }
            }
        }
    }
}
