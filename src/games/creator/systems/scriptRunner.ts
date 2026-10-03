import { collectCoin } from '../systems/physics';
import { getCurrentUserProfile } from '../../../auth';
import { yardService } from '../../../shared/yardService';
import { checkpointPosition } from '../state/creatorState';
import { autoSaveDraft } from '../ui/creatorUI';
import { setupWorkbenchEvents } from '../workbench/customItemWorkbench';
import { playGameSound, playScriptSound } from '../audio';
export { playGameSound, playScriptSound };
import { csState } from "../state/creatorState";
import * as THREE from 'three';
import { ObjectScript, ObjectScriptAction, PlacedObject } from '../types';
import {
    scene,
    camera,
    humanCharacter,
    playerCoins,
    setPlayerCoins,
    playerSpeedMultiplier,
    setPlayerSpeedMultiplier,
    playerSpeedBoostEndTime,
    setPlayerSpeedBoostEndTime,
    isGrounded,
    setIsGrounded,
    characterVelocity,
    placedObjects,
    selectedObject,
    audioCtx,
    setAudioCtx,
    dialogHideTimer,
    setDialogHideTimer
} from '../state/creatorState';
import { damagePlayer, healPlayer, updateGameplayHUD } from './physics';
import { saveUndoSnapshot } from './undoRedo';

let currentVehicle: PlacedObject | null = null;

let vehicleSpeed = 0;

export function updateScriptInspectorDisplay(placed: PlacedObject | null) {
    const badge = document.getElementById('script-status-badge');
    const select = document.getElementById('script-preset-select') as HTMLSelectElement | null;
    const summary = document.getElementById('script-active-summary');

    if (!placed || !placed.script) {
        if (badge) {
            badge.innerText = 'Pole skripti';
            badge.style.background = 'rgba(255,255,255,0.08)';
            badge.style.color = '#94a3b8';
        }
        if (select) {
            select.value = 'none';
        }
        if (summary) {
            summary.style.display = 'none';
            summary.innerText = '';
        }
        return;
    }

    const scr = placed.script;
    const isAct = scr.enabled !== false;
    if (badge) {
        if (isAct) {
            badge.innerText = `Aktiivne (${scr.trigger})`;
            badge.style.background = 'rgba(46, 204, 113, 0.25)';
            badge.style.color = '#2ecc71';
        } else {
            badge.innerText = 'Keelatud';
            badge.style.background = 'rgba(231, 76, 60, 0.25)';
            badge.style.color = '#e74c3c';
        }
    }

    if (select) {
        if (scr.preset) {
            select.value = scr.preset;
        } else if (scr.actions && scr.actions[0]) {
            select.value = scr.actions[0].type;
        } else if (scr.customJsCode) {
            select.value = 'custom_js';
        }
    }

    if (summary) {
        summary.style.display = 'block';
        const actName = scr.actions && scr.actions[0] ? scr.actions[0].type : (scr.customJsCode ? 'custom_js' : 'pole tegevust');
        summary.innerHTML = `<strong>${scr.trigger}</strong> ➔ <span>${actName}</span> (cooldown ${scr.cooldown ?? 1.5}s)`;
    }
}

export function showDialogMessage(title: string, message: string, icon = '📜') {
    const dialogPopup = document.getElementById('game-dialog-popup');
    const dialogTitle = document.getElementById('game-dialog-title');
    const dialogText = document.getElementById('game-dialog-text');
    const dialogIcon = document.getElementById('game-dialog-icon');
    if (dialogPopup && dialogTitle && dialogText) {
        if (dialogIcon) dialogIcon.innerText = icon;
        dialogTitle.innerText = title;
        dialogText.innerText = `"${message}"`;
        dialogPopup.style.display = 'block';
        if (dialogHideTimer) clearTimeout(dialogHideTimer);
        csState.dialogHideTimer = setTimeout(() => {
            if (dialogPopup) dialogPopup.style.display = 'none';
        }, 3500);
    }
}

export function executeScriptCustomCode(obj: PlacedObject, code: string, playerPos: THREE.Vector3) {
    try {
        const api = {
            player: {
                damage: (amt = 10) => damagePlayer(amt),
                heal: (amt = 10) => healPlayer(amt),
                setSpeed: (mult = 2.0, durationSec = 4.0) => {
                    csState.playerSpeedMultiplier = mult;
                    csState.playerSpeedBoostEndTime = Date.now() + durationSec * 1000;
                },
                jump: (force = 18) => {
                    characterVelocity.y = force;
                    csState.isGrounded = false;
                },
                teleport: (x = 0, y = 0, z = 0) => {
                    playerPos.set(x, y, z);
                    characterVelocity.set(0, 0, 0);
                },
                giveCoins: (amt = 10) => {
                    collectCoin(amt);
                },
                giveYards: (amt = 5) => {
                    const prof = getCurrentUserProfile();
                    yardService.awardYards(amt, prof?.username ?? null);
                    playScriptSound('victory');
                },
                getPosition: () => ({ x: playerPos.x, y: playerPos.y, z: playerPos.z })
            },
            sound: {
                play: (name: string) => playScriptSound(name)
            },
            hud: {
                showMessage: (text: string, title = 'Teade') => showDialogMessage(title, text)
            },
            object: {
                setColor: (hex: string) => {
                    obj.color = hex;
                    obj.mesh.traverse((child) => {
                        if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material) {
                            const mat = (child as THREE.Mesh).material;
                            if (Array.isArray(mat)) mat.forEach(m => (m as any).color?.set(hex));
                            else (mat as any).color?.set(hex);
                        }
                    });
                },
                rotate: (x = 0, y = 0, z = 0) => {
                    obj.mesh.rotation.x += x;
                    obj.mesh.rotation.y += y;
                    obj.mesh.rotation.z += z;
                },
                move: (dx = 0, dy = 0, dz = 0) => {
                    obj.mesh.position.x += dx;
                    obj.mesh.position.y += dy;
                    obj.mesh.position.z += dz;
                },
                getPosition: () => ({ x: obj.mesh.position.x, y: obj.mesh.position.y, z: obj.mesh.position.z })
            }
        };

        const fn = new Function('api', code);
        fn(api);
    } catch (err: any) {
        console.warn('Script execution error:', err);
        showDialogMessage('⚠️ Skripti Viga', err?.message || String(err), '⚠️');
    }
}

export function executeSingleScriptAction(obj: PlacedObject, act: ObjectScriptAction, playerPos: THREE.Vector3) {
    switch (act.type) {
        case 'dialog':
            if (act.message) {
                showDialogMessage(obj.name || 'NPC Dialoog', act.message, '💬');
            }
            break;
        case 'speed_boost': {
            const mult = act.speedMultiplier ?? 2.0;
            const dur = (act.duration ?? 4.0) * 1000;
            csState.playerSpeedMultiplier = mult;
            csState.playerSpeedBoostEndTime = Date.now() + dur;
            playScriptSound('powerup');
            showDialogMessage('⚡ Kiirendus!', `Liikumiskiirus on ${mult}x kiirem järgmised ${Math.round(dur / 1000)}s!`, '⚡');
            break;
        }
        case 'jump_boost': {
            const force = act.jumpForce ?? 18;
            characterVelocity.y = force;
            csState.isGrounded = false;
            playScriptSound('jump');
            showDialogMessage('🚀 Superhüpe!', `Lennutati õhku jõuga ${force}!`, '🚀');
            break;
        }
        case 'give_coins': {
            const amt = act.amount ?? 10;
            collectCoin(amt);
            playScriptSound('coin');
            showDialogMessage('🪙 Mündid!', `Said juurde +${amt} münti!`, '🪙');
            break;
        }
        case 'give_yards': {
            const amt = act.amount ?? 5;
            const prof = getCurrentUserProfile();
            yardService.awardYards(amt, prof?.username ?? null);
            playScriptSound('victory');
            showDialogMessage('💎 Playard Yardid!', `Teenisid juurde +${amt} Yardi!`, '💎');
            break;
        }
        case 'damage': {
            const amt = act.amount ?? 25;
            damagePlayer(amt);
            playScriptSound('hit');
            break;
        }
        case 'heal': {
            const amt = act.amount ?? 30;
            healPlayer(amt);
            playScriptSound('powerup');
            break;
        }
        case 'teleport': {
            const tgt = act.teleportTarget ?? { x: checkpointPosition.x, y: checkpointPosition.y, z: checkpointPosition.z };
            playerPos.set(tgt.x, tgt.y, tgt.z);
            characterVelocity.set(0, 0, 0);
            playScriptSound('teleport');
            showDialogMessage('🌀 Teleport', `Teleporditi asukohta (${tgt.x.toFixed(1)}, ${tgt.y.toFixed(1)}, ${tgt.z.toFixed(1)})`, '🌀');
            break;
        }
        case 'change_color': {
            const color = act.colorHex || '#ff0055';
            obj.color = color;
            obj.mesh.traverse((child) => {
                if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material) {
                    const mat = (child as THREE.Mesh).material;
                    if (Array.isArray(mat)) {
                        mat.forEach(m => (m as any).color?.set(color));
                    } else {
                        (mat as any).color?.set(color);
                    }
                }
            });
            break;
        }
        case 'animate_motion': {
            const mType = act.motionType || 'rotate';
            obj.movement = {
                type: mType as any,
                speed: 2.5,
                distance: 5,
                origin: { x: obj.mesh.position.x, y: obj.mesh.position.y, z: obj.mesh.position.z },
                rotationSpeed: 2
            };
            break;
        }
        case 'play_sound': {
            playScriptSound(act.soundName || 'powerup');
            break;
        }
        case 'custom_js': {
            if (act.customCode) {
                executeScriptCustomCode(obj, act.customCode, playerPos);
            }
            break;
        }
    }
}

export function executeObjectScript(obj: PlacedObject, playerPos: THREE.Vector3, triggerType: 'onPlayerTouch' | 'onInteract' | 'onTimer' | 'onStart', force = false) {
    if (!obj.script) return;
    if (obj.script.enabled === false && !force) return;
    if (obj.script.trigger !== triggerType && !force) return;

    const now = Date.now();
    const cooldownMs = (obj.script.cooldown ?? 1.0) * 1000;
    if (!force && obj.script.lastTriggered && (now - obj.script.lastTriggered < cooldownMs)) {
        return;
    }
    obj.script.lastTriggered = now;

    if (Array.isArray(obj.script.actions)) {
        for (const act of obj.script.actions) {
            executeSingleScriptAction(obj, act, playerPos);
        }
    }

    if (obj.script.customJsCode && obj.script.customJsCode.trim()) {
        executeScriptCustomCode(obj, obj.script.customJsCode, playerPos);
    }
}

export function applyScriptPreset(obj: PlacedObject, preset: string) {
    if (!obj) return;
    if (preset === 'none') {
        delete obj.script;
        updateScriptInspectorDisplay(obj);
        autoSaveDraft();
        return;
    }

    let script: ObjectScript;
    switch (preset) {
        case 'speed_boost':
            script = {
                preset: 'speed_boost',
                trigger: 'onPlayerTouch',
                cooldown: 2.0,
                enabled: true,
                actions: [{ type: 'speed_boost', speedMultiplier: 2.2, duration: 4.0 }]
            };
            break;
        case 'jump_boost':
            script = {
                preset: 'jump_boost',
                trigger: 'onPlayerTouch',
                cooldown: 1.0,
                enabled: true,
                actions: [{ type: 'jump_boost', jumpForce: 20 }]
            };
            break;
        case 'give_coins':
            script = {
                preset: 'give_coins',
                trigger: 'onPlayerTouch',
                cooldown: 3.0,
                enabled: true,
                actions: [{ type: 'give_coins', amount: 10 }, { type: 'play_sound', soundName: 'coin' }]
            };
            break;
        case 'give_yards':
            script = {
                preset: 'give_yards',
                trigger: 'onPlayerTouch',
                cooldown: 10.0,
                enabled: true,
                actions: [{ type: 'give_yards', amount: 5 }, { type: 'play_sound', soundName: 'victory' }]
            };
            break;
        case 'damage':
            script = {
                preset: 'damage',
                trigger: 'onPlayerTouch',
                cooldown: 1.0,
                enabled: true,
                actions: [{ type: 'damage', amount: 25 }]
            };
            break;
        case 'heal':
            script = {
                preset: 'heal',
                trigger: 'onPlayerTouch',
                cooldown: 5.0,
                enabled: true,
                actions: [{ type: 'heal', amount: 35 }]
            };
            break;
        case 'dialog':
            script = {
                preset: 'dialog',
                trigger: 'onInteract',
                cooldown: 1.0,
                enabled: true,
                actions: [{ type: 'dialog', message: `Tere! Mina olen ${obj.name}. Tere tulemast minu loodud 3D maailma!` }]
            };
            break;
        case 'teleport':
            script = {
                preset: 'teleport',
                trigger: 'onPlayerTouch',
                cooldown: 2.0,
                enabled: true,
                actions: [{ type: 'teleport', teleportTarget: { x: 0, y: 0, z: 0 } }]
            };
            break;
        case 'rotate':
            script = {
                preset: 'rotate',
                trigger: 'onStart',
                cooldown: 0,
                enabled: true,
                actions: [{ type: 'animate_motion', motionType: 'rotate' }]
            };
            break;
        case 'elevator':
            script = {
                preset: 'elevator',
                trigger: 'onStart',
                cooldown: 0,
                enabled: true,
                actions: [{ type: 'animate_motion', motionType: 'elevator' }]
            };
            break;
        case 'play_sound':
            script = {
                preset: 'play_sound',
                trigger: 'onPlayerTouch',
                cooldown: 1.0,
                enabled: true,
                actions: [{ type: 'play_sound', soundName: 'powerup' }]
            };
            break;
        case 'custom_js': {
            const sampleCode = `api.player.setSpeed(2.5, 4);\napi.sound.play('powerup');\napi.hud.showMessage('Kiirendus aktiveeritud!', 'Boost');`;
            script = {
                preset: 'custom_js',
                trigger: 'onPlayerTouch',
                cooldown: 2.0,
                enabled: true,
                actions: [{ type: 'custom_js', customCode: sampleCode }],
                customJsCode: sampleCode
            };
            break;
        }
        default:
            return;
    }

    obj.script = script;
    updateScriptInspectorDisplay(obj);
    autoSaveDraft();
}

export function renderScriptActionParams(actionType: string, currentAction?: ObjectScriptAction) {
    const container = document.getElementById('script-action-params-container');
    if (!container) return;

    let html = '';
    switch (actionType) {
        case 'speed_boost': {
            const mult = currentAction?.speedMultiplier ?? 2.0;
            const dur = currentAction?.duration ?? 4.0;
            html = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <label style="font-size: 0.78rem; color: #00f2fe; display: block; margin-bottom: 4px; font-weight: bold;">⚡ Kiiruse kordaja (Speed Multiplier):</label>
                        <input type="number" id="script-param-speed-mult" value="${mult}" min="1.2" max="5.0" step="0.2" style="width: 100%; box-sizing: border-box; padding: 6px 8px; background: #0f172a; border: 1px solid #3b82f6; border-radius: 6px; color: #fff; font-size: 0.85rem;">
                    </div>
                    <div>
                        <label style="font-size: 0.78rem; color: #00f2fe; display: block; margin-bottom: 4px; font-weight: bold;">⏱️ Kestus (sekundites):</label>
                        <input type="number" id="script-param-duration" value="${dur}" min="1" max="60" step="1" style="width: 100%; box-sizing: border-box; padding: 6px 8px; background: #0f172a; border: 1px solid #3b82f6; border-radius: 6px; color: #fff; font-size: 0.85rem;">
                    </div>
                </div>
            `;
            break;
        }
        case 'jump_boost': {
            const force = currentAction?.jumpForce ?? 18;
            html = `
                <div>
                    <label style="font-size: 0.78rem; color: #ffd32a; display: block; margin-bottom: 4px; font-weight: bold;">🚀 Hüppe kõrgus / jõud (Jump Force):</label>
                    <input type="number" id="script-param-jump-force" value="${force}" min="10" max="50" step="2" style="width: 100%; box-sizing: border-box; padding: 6px 8px; background: #0f172a; border: 1px solid #ffd32a; border-radius: 6px; color: #fff; font-size: 0.85rem;">
                    <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 4px;">Tavaline hüpe on ~9. Superhüpe 18–25 lennutab mängija kõrgele platvormile!</div>
                </div>
            `;
            break;
        }
        case 'give_coins': {
            const amt = currentAction?.amount ?? 10;
            html = `
                <div>
                    <label style="font-size: 0.78rem; color: #ffd32a; display: block; margin-bottom: 4px; font-weight: bold;">🪙 Antavate müntide kogus (Coins):</label>
                    <input type="number" id="script-param-coins" value="${amt}" min="1" max="1000" step="1" style="width: 100%; box-sizing: border-box; padding: 6px 8px; background: #0f172a; border: 1px solid #ffd32a; border-radius: 6px; color: #fff; font-size: 0.85rem;">
                </div>
            `;
            break;
        }
        case 'give_yards': {
            const amt = currentAction?.amount ?? 5;
            html = `
                <div>
                    <label style="font-size: 0.78rem; color: #38ef7d; display: block; margin-bottom: 4px; font-weight: bold;">💎 Antavate Yardide kogus (Playard Yards):</label>
                    <input type="number" id="script-param-yards" value="${amt}" min="1" max="100" step="1" style="width: 100%; box-sizing: border-box; padding: 6px 8px; background: #0f172a; border: 1px solid #38ef7d; border-radius: 6px; color: #fff; font-size: 0.85rem;">
                </div>
            `;
            break;
        }
        case 'dialog': {
            const msg = currentAction?.message ?? 'Tere tulemast minu maailma! Seiklus algab siit!';
            html = `
                <div>
                    <label style="font-size: 0.78rem; color: #00f2fe; display: block; margin-bottom: 4px; font-weight: bold;">💬 Kuvav sõnum / dialoog:</label>
                    <textarea id="script-param-dialog-msg" style="width: 100%; height: 60px; box-sizing: border-box; padding: 6px 8px; background: #0f172a; border: 1px solid #00f2fe; border-radius: 6px; color: #fff; font-size: 0.85rem; resize: vertical;">${msg}</textarea>
                </div>
            `;
            break;
        }
        case 'damage': {
            const amt = currentAction?.amount ?? 25;
            html = `
                <div>
                    <label style="font-size: 0.78rem; color: #e74c3c; display: block; margin-bottom: 4px; font-weight: bold;">🩸 Kahju suurus (Damage HP):</label>
                    <input type="number" id="script-param-damage" value="${amt}" min="1" max="100" step="5" style="width: 100%; box-sizing: border-box; padding: 6px 8px; background: #0f172a; border: 1px solid #e74c3c; border-radius: 6px; color: #fff; font-size: 0.85rem;">
                </div>
            `;
            break;
        }
        case 'heal': {
            const amt = currentAction?.amount ?? 30;
            html = `
                <div>
                    <label style="font-size: 0.78rem; color: #2ecc71; display: block; margin-bottom: 4px; font-weight: bold;">❤️ Ravimise suurus (Heal HP):</label>
                    <input type="number" id="script-param-heal" value="${amt}" min="1" max="100" step="5" style="width: 100%; box-sizing: border-box; padding: 6px 8px; background: #0f172a; border: 1px solid #2ecc71; border-radius: 6px; color: #fff; font-size: 0.85rem;">
                </div>
            `;
            break;
        }
        case 'teleport': {
            const tgt = currentAction?.teleportTarget ?? { x: 0, y: 0, z: 0 };
            html = `
                <div>
                    <label style="font-size: 0.78rem; color: #c084fc; display: block; margin-bottom: 6px; font-weight: bold;">🌀 Telepordi sihtpunkt (X, Y, Z):</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                        <input type="number" id="script-param-teleport-x" value="${tgt.x}" step="1" placeholder="X" style="box-sizing: border-box; padding: 6px 8px; background: #0f172a; border: 1px solid #a855f7; border-radius: 6px; color: #fff; font-size: 0.85rem; text-align: center;">
                        <input type="number" id="script-param-teleport-y" value="${tgt.y}" step="1" placeholder="Y" style="box-sizing: border-box; padding: 6px 8px; background: #0f172a; border: 1px solid #a855f7; border-radius: 6px; color: #fff; font-size: 0.85rem; text-align: center;">
                        <input type="number" id="script-param-teleport-z" value="${tgt.z}" step="1" placeholder="Z" style="box-sizing: border-box; padding: 6px 8px; background: #0f172a; border: 1px solid #a855f7; border-radius: 6px; color: #fff; font-size: 0.85rem; text-align: center;">
                    </div>
                    <button type="button" id="btn-script-set-current-pos" style="padding: 4px 10px; font-size: 0.75rem; background: rgba(168,85,247,0.2); border: 1px solid #a855f7; border-radius: 6px; color: #c084fc; cursor: pointer;">📍 Kasuta mängija praegust asukohta</button>
                </div>
            `;
            break;
        }
        case 'change_color': {
            const col = currentAction?.colorHex ?? '#ff0055';
            html = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <label style="font-size: 0.78rem; color: #00f2fe; font-weight: bold;">🎨 Vali uus värv:</label>
                    <input type="color" id="script-param-color" value="${col}" style="border: none; width: 40px; height: 32px; border-radius: 6px; cursor: pointer; background: transparent;">
                </div>
            `;
            break;
        }
        case 'animate_motion': {
            const mType = currentAction?.motionType ?? 'rotate';
            html = `
                <div>
                    <label style="font-size: 0.78rem; color: #00f2fe; display: block; margin-bottom: 4px; font-weight: bold;">🔄 Liikumise tüüp:</label>
                    <select id="script-param-motion-type" style="width: 100%; box-sizing: border-box; padding: 6px 8px; background: #0f172a; border: 1px solid #00f2fe; border-radius: 6px; color: #fff; font-size: 0.85rem;">
                        <option value="rotate" ${mType === 'rotate' ? 'selected' : ''}>🔄 Pidev pöörlemine (Rotate)</option>
                        <option value="elevator" ${mType === 'elevator' ? 'selected' : ''}>↕️ Lift üles-alla (Elevator)</option>
                        <option value="patrol" ${mType === 'patrol' ? 'selected' : ''}>↔️ Edasi-tagasi patrull (Patrol)</option>
                        <option value="bounce" ${mType === 'bounce' ? 'selected' : ''}>🦘 Hüppamine / põrkumine (Bounce)</option>
                    </select>
                </div>
            `;
            break;
        }
        case 'play_sound': {
            const sName = currentAction?.soundName ?? 'powerup';
            html = `
                <div>
                    <label style="font-size: 0.78rem; color: #ffd32a; display: block; margin-bottom: 4px; font-weight: bold;">🔊 Heliefekt (SFX):</label>
                    <select id="script-param-sound-name" style="width: 100%; box-sizing: border-box; padding: 6px 8px; background: #0f172a; border: 1px solid #ffd32a; border-radius: 6px; color: #fff; font-size: 0.85rem;">
                        <option value="powerup" ${sName === 'powerup' ? 'selected' : ''}>⚡ Powerup / Boost</option>
                        <option value="coin" ${sName === 'coin' ? 'selected' : ''}>🪙 Münt (Coin)</option>
                        <option value="jump" ${sName === 'jump' ? 'selected' : ''}>🚀 Hüpe (Jump)</option>
                        <option value="teleport" ${sName === 'teleport' ? 'selected' : ''}>🌀 Teleport</option>
                        <option value="hit" ${sName === 'hit' ? 'selected' : ''}>🩸 Löök / Vigastus (Hit)</option>
                        <option value="victory" ${sName === 'victory' ? 'selected' : ''}>🏆 Võit / Finiš (Victory)</option>
                    </select>
                </div>
            `;
            break;
        }
        default:
            html = `<div style="font-size: 0.8rem; color: #94a3b8;">Spetsiaalseid parameetreid pole vaja.</div>`;
    }

    container.innerHTML = html;

    const btnSetPos = document.getElementById('btn-script-set-current-pos');
    if (btnSetPos) {
        btnSetPos.addEventListener('click', () => {
            const xIn = document.getElementById('script-param-teleport-x') as HTMLInputElement | null;
            const yIn = document.getElementById('script-param-teleport-y') as HTMLInputElement | null;
            const zIn = document.getElementById('script-param-teleport-z') as HTMLInputElement | null;
            if (xIn && humanCharacter) xIn.value = humanCharacter.position.x.toFixed(1);
            if (yIn && humanCharacter) yIn.value = humanCharacter.position.y.toFixed(1);
            if (zIn && humanCharacter) zIn.value = humanCharacter.position.z.toFixed(1);
        });
    }
}

export function openScriptModal() {
    if (!selectedObject) return;
    const modal = document.getElementById('script-editor-modal');
    if (!modal) return;

    const titleEl = document.getElementById('script-modal-obj-name');
    if (titleEl) {
        titleEl.innerText = `Objekt: ${selectedObject.name} (#${selectedObject.id.slice(-6)})`;
    }

    const enableCheckbox = document.getElementById('script-modal-enable') as HTMLInputElement | null;
    if (enableCheckbox) {
        enableCheckbox.checked = selectedObject.script ? (selectedObject.script.enabled !== false) : true;
    }

    const triggerSelect = document.getElementById('script-form-trigger') as HTMLSelectElement | null;
    const cooldownInput = document.getElementById('script-cooldown') as HTMLInputElement | null;
    const timerIntervalRow = document.getElementById('script-timer-interval-row');
    const timerIntervalInput = document.getElementById('script-timer-interval') as HTMLInputElement | null;
    const actionSelect = document.getElementById('script-form-action') as HTMLSelectElement | null;
    const codeEditor = document.getElementById('script-code-editor') as HTMLTextAreaElement | null;

    const scr = selectedObject.script;
    if (scr) {
        if (triggerSelect) triggerSelect.value = scr.trigger || 'onPlayerTouch';
        if (cooldownInput) cooldownInput.value = (scr.cooldown ?? 1.5).toString();
        if (timerIntervalInput) timerIntervalInput.value = (scr.timerInterval ?? 3).toString();
        if (timerIntervalRow) timerIntervalRow.style.display = scr.trigger === 'onTimer' ? 'block' : 'none';

        const firstAction = scr.actions && scr.actions[0];
        if (actionSelect && firstAction) {
            actionSelect.value = firstAction.type;
        }
        renderScriptActionParams(actionSelect?.value || 'speed_boost', firstAction);

        if (codeEditor) {
            codeEditor.value = scr.customJsCode || '';
        }
    } else {
        if (triggerSelect) triggerSelect.value = 'onPlayerTouch';
        if (cooldownInput) cooldownInput.value = '1.5';
        if (timerIntervalInput) timerIntervalInput.value = '3';
        if (timerIntervalRow) timerIntervalRow.style.display = 'none';
        if (actionSelect) actionSelect.value = 'speed_boost';
        renderScriptActionParams('speed_boost');
        if (codeEditor) {
            codeEditor.value = `api.player.setSpeed(2.2, 4);\napi.sound.play('powerup');\napi.hud.showMessage('Superkiirus aktiveeritud!', 'Boost');`;
        }
    }

    switchScriptTab('visual');
    modal.style.display = 'flex';
}

export function closeScriptModal() {
    const modal = document.getElementById('script-editor-modal');
    if (modal) modal.style.display = 'none';
}

export function switchScriptTab(tab: 'visual' | 'code') {
    const visualBtn = document.getElementById('script-tab-visual');
    const codeBtn = document.getElementById('script-tab-code');
    const visualSec = document.getElementById('script-visual-section');
    const codeSec = document.getElementById('script-code-section');

    if (tab === 'visual') {
        if (visualBtn) {
            visualBtn.classList.add('active');
            visualBtn.style.background = 'rgba(0,242,254,0.15)';
            visualBtn.style.color = '#00f2fe';
            visualBtn.style.borderColor = '#00f2fe';
        }
        if (codeBtn) {
            codeBtn.classList.remove('active');
            codeBtn.style.background = 'transparent';
            codeBtn.style.color = '#9ca3af';
            codeBtn.style.borderColor = 'transparent';
        }
        if (visualSec) visualSec.style.display = 'block';
        if (codeSec) codeSec.style.display = 'none';
    } else {
        if (codeBtn) {
            codeBtn.classList.add('active');
            codeBtn.style.background = 'rgba(0,242,254,0.15)';
            codeBtn.style.color = '#00f2fe';
            codeBtn.style.borderColor = '#00f2fe';
        }
        if (visualBtn) {
            visualBtn.classList.remove('active');
            visualBtn.style.background = 'transparent';
            visualBtn.style.color = '#9ca3af';
            visualBtn.style.borderColor = 'transparent';
        }
        if (visualSec) visualSec.style.display = 'none';
        if (codeSec) codeSec.style.display = 'flex';
    }
}

export function saveScriptFromModal() {
    if (!selectedObject) return;
    const isEnabled = (document.getElementById('script-modal-enable') as HTMLInputElement)?.checked ?? true;
    const isCodeTabActive = document.getElementById('script-code-section')?.style.display === 'flex';
    const codeEditor = document.getElementById('script-code-editor') as HTMLTextAreaElement | null;
    const triggerSelect = document.getElementById('script-form-trigger') as HTMLSelectElement | null;
    const cooldownInput = document.getElementById('script-cooldown') as HTMLInputElement | null;
    const timerIntervalInput = document.getElementById('script-timer-interval') as HTMLInputElement | null;
    const actionSelect = document.getElementById('script-form-action') as HTMLSelectElement | null;

    const trigger = (triggerSelect?.value || 'onPlayerTouch') as any;
    const cooldown = parseFloat(cooldownInput?.value || '1.5');
    const timerInterval = parseFloat(timerIntervalInput?.value || '3');

    let actions: ObjectScriptAction[] = [];
    const customJsCode = codeEditor?.value || '';

    if (isCodeTabActive && customJsCode.trim()) {
        actions.push({
            type: 'custom_js',
            customCode: customJsCode
        });
    } else {
        const actType = actionSelect?.value || 'speed_boost';
        const act: ObjectScriptAction = { type: actType as any };

        if (actType === 'speed_boost') {
            act.speedMultiplier = parseFloat((document.getElementById('script-param-speed-mult') as HTMLInputElement)?.value || '2.0');
            act.duration = parseFloat((document.getElementById('script-param-duration') as HTMLInputElement)?.value || '4.0');
        } else if (actType === 'jump_boost') {
            act.jumpForce = parseFloat((document.getElementById('script-param-jump-force') as HTMLInputElement)?.value || '18');
        } else if (actType === 'give_coins') {
            act.amount = parseInt((document.getElementById('script-param-coins') as HTMLInputElement)?.value || '10', 10);
        } else if (actType === 'give_yards') {
            act.amount = parseInt((document.getElementById('script-param-yards') as HTMLInputElement)?.value || '5', 10);
        } else if (actType === 'dialog') {
            act.message = (document.getElementById('script-param-dialog-msg') as HTMLTextAreaElement)?.value || 'Tere tulemast!';
        } else if (actType === 'damage') {
            act.amount = parseInt((document.getElementById('script-param-damage') as HTMLInputElement)?.value || '25', 10);
        } else if (actType === 'heal') {
            act.amount = parseInt((document.getElementById('script-param-heal') as HTMLInputElement)?.value || '30', 10);
        } else if (actType === 'teleport') {
            act.teleportTarget = {
                x: parseFloat((document.getElementById('script-param-teleport-x') as HTMLInputElement)?.value || '0'),
                y: parseFloat((document.getElementById('script-param-teleport-y') as HTMLInputElement)?.value || '0'),
                z: parseFloat((document.getElementById('script-param-teleport-z') as HTMLInputElement)?.value || '0')
            };
        } else if (actType === 'change_color') {
            act.colorHex = (document.getElementById('script-param-color') as HTMLInputElement)?.value || '#ff0055';
        } else if (actType === 'animate_motion') {
            act.motionType = ((document.getElementById('script-param-motion-type') as HTMLSelectElement)?.value || 'rotate') as any;
        } else if (actType === 'play_sound') {
            act.soundName = ((document.getElementById('script-param-sound-name') as HTMLSelectElement)?.value || 'powerup') as any;
        }

        actions.push(act);
    }

    selectedObject.script = {
        trigger,
        cooldown,
        timerInterval,
        enabled: isEnabled,
        actions,
        customJsCode: customJsCode.trim() ? customJsCode : undefined
    };

    updateScriptInspectorDisplay(selectedObject);
    closeScriptModal();
    autoSaveDraft();
}

export function setupScriptingEvents() {
    document.getElementById('btn-open-script-editor')?.addEventListener('click', () => {
        openScriptModal();
    });

    document.getElementById('script-preset-select')?.addEventListener('change', (e) => {
        if (selectedObject) {
            const preset = (e.target as HTMLSelectElement).value;
            applyScriptPreset(selectedObject, preset);
        }
    });

    document.getElementById('btn-close-script-modal')?.addEventListener('click', () => {
        closeScriptModal();
    });

    document.getElementById('script-tab-visual')?.addEventListener('click', () => {
        switchScriptTab('visual');
    });
    document.getElementById('script-tab-code')?.addEventListener('click', () => {
        switchScriptTab('code');
    });

    document.getElementById('script-form-trigger')?.addEventListener('change', (e) => {
        const val = (e.target as HTMLSelectElement).value;
        const timerRow = document.getElementById('script-timer-interval-row');
        if (timerRow) {
            timerRow.style.display = val === 'onTimer' ? 'block' : 'none';
        }
    });

    document.getElementById('script-form-action')?.addEventListener('change', (e) => {
        const val = (e.target as HTMLSelectElement).value;
        renderScriptActionParams(val);
    });

    document.querySelectorAll('.btn-script-snippet').forEach((btn) => {
        btn.addEventListener('click', () => {
            const snippet = (btn as HTMLElement).getAttribute('data-code') || '';
            const editor = document.getElementById('script-code-editor') as HTMLTextAreaElement | null;
            if (editor) {
                const startPos = editor.selectionStart;
                const endPos = editor.selectionEnd;
                editor.value = editor.value.substring(0, startPos) + snippet + '\n' + editor.value.substring(endPos);
                editor.focus();
                editor.selectionStart = editor.selectionEnd = startPos + snippet.length + 1;
            }
        });
    });

    document.getElementById('btn-save-script')?.addEventListener('click', () => {
        saveScriptFromModal();
    });

    document.getElementById('btn-test-script')?.addEventListener('click', () => {
        if (!selectedObject) return;
        const isCodeTabActive = document.getElementById('script-code-section')?.style.display === 'flex';
        const playerPos = humanCharacter?.position || new THREE.Vector3(0, 0, 0);

        if (isCodeTabActive) {
            const codeEditor = document.getElementById('script-code-editor') as HTMLTextAreaElement | null;
            const code = codeEditor?.value || '';
            if (code.trim()) {
                executeScriptCustomCode(selectedObject, code, playerPos);
            }
        } else {
            const actionSelect = document.getElementById('script-form-action') as HTMLSelectElement | null;
            const actType = actionSelect?.value || 'speed_boost';
            const act: ObjectScriptAction = { type: actType as any };

            if (actType === 'speed_boost') {
                act.speedMultiplier = parseFloat((document.getElementById('script-param-speed-mult') as HTMLInputElement)?.value || '2.0');
                act.duration = parseFloat((document.getElementById('script-param-duration') as HTMLInputElement)?.value || '4.0');
            } else if (actType === 'jump_boost') {
                act.jumpForce = parseFloat((document.getElementById('script-param-jump-force') as HTMLInputElement)?.value || '18');
            } else if (actType === 'give_coins') {
                act.amount = parseInt((document.getElementById('script-param-coins') as HTMLInputElement)?.value || '10', 10);
            } else if (actType === 'give_yards') {
                act.amount = parseInt((document.getElementById('script-param-yards') as HTMLInputElement)?.value || '5', 10);
            } else if (actType === 'dialog') {
                act.message = (document.getElementById('script-param-dialog-msg') as HTMLTextAreaElement)?.value || 'Test-dialoog!';
            } else if (actType === 'damage') {
                act.amount = parseInt((document.getElementById('script-param-damage') as HTMLInputElement)?.value || '25', 10);
            } else if (actType === 'heal') {
                act.amount = parseInt((document.getElementById('script-param-heal') as HTMLInputElement)?.value || '30', 10);
            } else if (actType === 'teleport') {
                act.teleportTarget = {
                    x: parseFloat((document.getElementById('script-param-teleport-x') as HTMLInputElement)?.value || '0'),
                    y: parseFloat((document.getElementById('script-param-teleport-y') as HTMLInputElement)?.value || '0'),
                    z: parseFloat((document.getElementById('script-param-teleport-z') as HTMLInputElement)?.value || '0')
                };
            } else if (actType === 'change_color') {
                act.colorHex = (document.getElementById('script-param-color') as HTMLInputElement)?.value || '#ff0055';
            } else if (actType === 'animate_motion') {
                act.motionType = ((document.getElementById('script-param-motion-type') as HTMLSelectElement)?.value || 'rotate') as any;
            } else if (actType === 'play_sound') {
                act.soundName = ((document.getElementById('script-param-sound-name') as HTMLSelectElement)?.value || 'powerup') as any;
            }

            executeSingleScriptAction(selectedObject, act, playerPos);
        }
    });

    document.getElementById('btn-delete-script')?.addEventListener('click', () => {
        if (selectedObject) {
            delete selectedObject.script;
            updateScriptInspectorDisplay(selectedObject);
            closeScriptModal();
            autoSaveDraft();
        }
    });

    setupWorkbenchEvents();
}