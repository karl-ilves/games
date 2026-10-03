import * as THREE from 'three';
import { yardService, CreatedGame } from '../../shared/yardService';
import { getCurrentUserProfile } from '../../auth';
import { avatarService } from '../../shared/avatar/AvatarService';
import { AvatarRig } from '../../shared/avatar/AvatarRig';
import { PlayardMobileControls, isMobileOrTabletDevice } from '../../shared/mobileControls';
import { translateDOM, t } from '../../shared/i18n_dict';
import { isPlayardOwner } from '../../auth';
import { buildSceneObjectMesh } from '../../shared/sceneObjectBuilder';

console.log("Community Game Player Loading...");

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let clock: THREE.Clock;

let humanCharacter: THREE.Group;
let characterVelocity = new THREE.Vector3();
let isGrounded = true;
let characterYaw = 0;

const keys: { [key: string]: boolean } = {};
let currentGame: CreatedGame | null = null;
let sceneObjects: THREE.Group[] = [];

// Get URL Params
const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('id');
const isReviewMode = urlParams.get('mode') === 'review';

// --- Create Ultra Grass ---
function createUltraGrass() {
    const groundGeo = new THREE.PlaneGeometry(300, 300, 64, 64);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x1b4d24,
        roughness: 0.85,
        metalness: 0.1
    });
    const grassPlane = new THREE.Mesh(groundGeo, groundMat);
    grassPlane.rotation.x = -Math.PI / 2;
    grassPlane.receiveShadow = true;
    scene.add(grassPlane);

    // Blades
    const bladeCount = 12000;
    const bladeGeo = new THREE.ConeGeometry(0.12, 1.2, 4);
    bladeGeo.translate(0, 0.6, 0);

    const bladeMat = new THREE.MeshStandardMaterial({
        color: 0x38ef7d,
        roughness: 0.6
    });

    const grassBlades = new THREE.InstancedMesh(bladeGeo, bladeMat, bladeCount);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < bladeCount; i++) {
        const x = (Math.random() - 0.5) * 160;
        const z = (Math.random() - 0.5) * 160;
        const scaleY = 0.6 + Math.random() * 0.8;
        const rotY = Math.random() * Math.PI * 2;
        const rotX = (Math.random() - 0.5) * 0.3;

        dummy.position.set(x, 0, z);
        dummy.scale.set(0.8, scaleY, 0.8);
        dummy.rotation.set(rotX, rotY, 0);
        dummy.updateMatrix();

        grassBlades.setMatrixAt(i, dummy.matrix);
    }

    grassBlades.instanceMatrix.needsUpdate = true;
    grassBlades.receiveShadow = true;
    scene.add(grassBlades);
}

let oceanWaterMesh: THREE.Mesh | null = null;
let activeSeaConfig: any = null;

function createUltraOcean(seaConfig: any) {
    activeSeaConfig = seaConfig;
    
    // Background color for ocean
    scene.background = new THREE.Color(0x74b9ff);
    scene.fog = new THREE.FogExp2(0x74b9ff, 0.005);

    // 1. Animated Sparkling Ocean Water Plane
    const geo = new THREE.PlaneGeometry(380, 380, 72, 72);
    const mat = new THREE.MeshStandardMaterial({
        color: seaConfig.waterColor || 0x0984e3,
        roughness: 0.1,
        metalness: 0.25,
        transparent: true,
        opacity: 0.88,
        flatShading: true
    });
    oceanWaterMesh = new THREE.Mesh(geo, mat);
    oceanWaterMesh.rotation.x = -Math.PI / 2;
    oceanWaterMesh.position.set(0, seaConfig.waterLevel || 0, 0);
    oceanWaterMesh.userData.basePos = new Float32Array(geo.attributes.position.array);
    oceanWaterMesh.receiveShadow = true;
    scene.add(oceanWaterMesh);

    // 2. Sandy Ocean Seabed Floor
    const floorGeo = new THREE.PlaneGeometry(420, 420, 16, 16);
    const oceanSeabedMesh = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x1b2838, roughness: 0.95 }));
    oceanSeabedMesh.rotation.x = -Math.PI / 2;
    oceanSeabedMesh.position.set(0, -11.5, 0);
    scene.add(oceanSeabedMesh);
}

// --- Playard Standard 3D Avatar Character ---
let playerAvatarRig: AvatarRig | null = null;

function createUltraHuman() {
    playerAvatarRig = new AvatarRig(avatarService.getConfig());
    humanCharacter = playerAvatarRig.rootGroup;
    humanCharacter.name = 'Play_Player_AvatarRig';
    humanCharacter.position.set(0, 0, 0);
    scene.add(humanCharacter);

    avatarService.subscribe(cfg => {
        if (playerAvatarRig) {
            playerAvatarRig.applyConfig(cfg);
        }
    });
}

let playerHealth = 100;
let playerMaxHealth = 100;
let playerInventory: Array<{ id: string; name: string; icon: string; type: string }> = [];
let spawnPointPosition = new THREE.Vector3(0, 0, 0);
let pendingPurchaseObject: { objData: any; group: THREE.Group } | null = null;
let lastDamageTime = 0;

let playerSpeedMultiplier = 1.0;
let playerSpeedBoostEndTime = 0;
let playDialogTimer: any = null;
let playAudioCtx: AudioContext | null = null;

export function playPlaySound(type: string) {
    try {
        if (!playAudioCtx) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) playAudioCtx = new AudioContextClass();
        }
        if (!playAudioCtx) return;
        if (playAudioCtx.state === 'suspended') playAudioCtx.resume();
        const now = playAudioCtx.currentTime;
        const osc = playAudioCtx.createOscillator();
        const gain = playAudioCtx.createGain();
        osc.connect(gain);
        gain.connect(playAudioCtx.destination);

        if (type === 'jump') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(620, now + 0.18);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            osc.start(now);
            osc.stop(now + 0.22);
        } else if (type === 'powerup' || type === 'heal') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.28);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (type === 'hit') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.2);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            osc.start(now);
            osc.stop(now + 0.22);
        } else if (type === 'coin') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(987, now);
            osc.frequency.setValueAtTime(1318, now + 0.08);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'victory') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523, now);
            osc.frequency.setValueAtTime(659, now + 0.1);
            osc.frequency.setValueAtTime(783, now + 0.2);
            osc.frequency.setValueAtTime(1046, now + 0.3);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        } else if (type === 'teleport') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.25);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        }
    } catch (e) {}
}

export function showPlayDialogMessage(title: string, message: string, icon = '💬', autoHideSec = 3.5) {
    const popup = document.getElementById('play-dialog-popup');
    const titleEl = document.getElementById('play-dialog-title');
    const textEl = document.getElementById('play-dialog-text');
    const iconEl = document.getElementById('play-dialog-icon');
    const actionsEl = document.getElementById('play-dialog-actions');
    if (popup && titleEl && textEl) {
        if (iconEl) iconEl.innerText = icon;
        titleEl.innerText = title;
        textEl.innerText = message;
        if (actionsEl && !pendingPurchaseObject) {
            actionsEl.style.display = 'none';
        } else if (actionsEl) {
            actionsEl.style.display = 'flex';
        }
        popup.style.display = 'block';
        if (playDialogTimer) clearTimeout(playDialogTimer);
        if (autoHideSec > 0 && !pendingPurchaseObject) {
            playDialogTimer = setTimeout(() => {
                if (popup && !pendingPurchaseObject) popup.style.display = 'none';
            }, autoHideSec * 1000);
        }
    }
}

export function playSuperJump(force = 22) {
    characterVelocity.y = force;
    isGrounded = false;
    playPlaySound('jump');
    showPlayDialogMessage('🚀 Superhüpe!', `Lennutati õhku jõuga ${force}!`, '🚀', 2.5);
}

export function playSpeedBoost(multiplier = 2.2, durationSec = 4.0) {
    playerSpeedMultiplier = multiplier;
    playerSpeedBoostEndTime = Date.now() + durationSec * 1000;
    playPlaySound('powerup');
    showPlayDialogMessage('⚡ Superkiirus!', `Liikumiskiirus on ${multiplier}x kiirem järgmised ${Math.round(durationSec)}s!`, '⚡', 2.5);
}

export function isPlayerTouchingOrOnTop(playerPos: THREE.Vector3, mesh: THREE.Object3D): boolean {
    if (!mesh) return false;
    const box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty()) return false;

    const playerRadius = 0.5;
    const feetY = playerPos.y;
    const headY = playerPos.y + 1.8;

    if (playerPos.x < box.min.x - playerRadius || playerPos.x > box.max.x + playerRadius ||
        playerPos.z < box.min.z - playerRadius || playerPos.z > box.max.z + playerRadius) {
        return false;
    }

    const minY = box.min.y - 0.25;
    const maxY = box.max.y + 0.45;

    return feetY <= maxY && headY >= minY;
}

function executePlayScriptAction(act: any, group: THREE.Group, playerPos: THREE.Vector3) {
    if (!act || !act.type) return;
    switch (act.type) {
        case 'jump_boost': {
            const force = act.jumpForce ?? 22;
            playSuperJump(force);
            break;
        }
        case 'speed_boost': {
            const mult = act.speedMultiplier ?? 2.2;
            const dur = act.duration ?? 4.0;
            playSpeedBoost(mult, dur);
            break;
        }
        case 'damage': {
            const amt = act.amount ?? 25;
            damagePlayPlayer(amt);
            playPlaySound('hit');
            break;
        }
        case 'heal': {
            const amt = act.amount ?? 30;
            playerHealth = Math.min(playerMaxHealth, playerHealth + amt);
            updatePlayHUD();
            playPlaySound('heal');
            showPlayDialogMessage('💖 Tervenemine!', `Ravisid elusid +${amt} HP!`, '💖', 2.5);
            break;
        }
        case 'give_coins': {
            const amt = act.amount ?? 10;
            yardService.addPlayCoins(amt);
            playPlaySound('coin');
            showPlayDialogMessage('🪙 Mündid!', `Said juurde +${amt} münti!`, '🪙', 2.5);
            break;
        }
        case 'give_yards': {
            const amt = act.amount ?? 5;
            yardService.addYards(amt);
            playPlaySound('victory');
            updatePlayHUD();
            showPlayDialogMessage('💎 Playbux!', `Said juurde +${amt} Playbuxi!`, '💎', 2.5);
            break;
        }
        case 'teleport': {
            const tgt = act.teleportTarget ?? { x: spawnPointPosition.x, y: spawnPointPosition.y, z: spawnPointPosition.z };
            humanCharacter.position.set(tgt.x, tgt.y, tgt.z);
            characterVelocity.set(0, 0, 0);
            playPlaySound('teleport');
            showPlayDialogMessage('🌀 Teleport', `Teleporditi asukohta (${tgt.x.toFixed(1)}, ${tgt.y.toFixed(1)}, ${tgt.z.toFixed(1)})`, '🌀', 2.5);
            break;
        }
        case 'dialog': {
            if (act.message) {
                showPlayDialogMessage(group.userData.name || 'Dialoog', act.message, '💬', 4.0);
            }
            break;
        }
        case 'play_sound': {
            playPlaySound(act.soundName || 'powerup');
            break;
        }
        case 'custom_js': {
            if (act.customCode) {
                executePlayCustomJs(act.customCode, group, playerPos);
            }
            break;
        }
    }
}

function executePlayCustomJs(code: string, group: THREE.Group, playerPos: THREE.Vector3) {
    try {
        const api = {
            player: {
                damage: (amt = 10) => damagePlayPlayer(amt),
                heal: (amt = 10) => {
                    playerHealth = Math.min(playerMaxHealth, playerHealth + amt);
                    updatePlayHUD();
                },
                setSpeed: (mult = 2.0, durationSec = 4.0) => playSpeedBoost(mult, durationSec),
                jump: (force = 20) => playSuperJump(force),
                teleport: (x = 0, y = 0, z = 0) => {
                    playerPos.set(x, y, z);
                    characterVelocity.set(0, 0, 0);
                },
                giveCoins: (amt = 10) => yardService.addPlayCoins(amt),
                giveYards: (amt = 5) => {
                    yardService.addYards(amt);
                    updatePlayHUD();
                },
                getPosition: () => ({ x: playerPos.x, y: playerPos.y, z: playerPos.z })
            },
            sound: {
                play: (name: string) => playPlaySound(name)
            },
            hud: {
                showMessage: (text: string, title = 'Teade') => showPlayDialogMessage(title, text, '💬', 3.5)
            }
        };
        const fn = new Function('api', code);
        fn(api);
    } catch (err: any) {
        console.warn('Sandbox script execution error in play mode:', err);
    }
}

function updatePlayHUD() {
    const pbxVal = document.getElementById('player-pbx-val');
    if (pbxVal) {
        pbxVal.innerText = yardService.getPlaybux().toLocaleString();
    }
    const healthBar = document.getElementById('play-health-bar');
    const healthText = document.getElementById('play-health-text');
    if (healthText) healthText.innerText = `${Math.max(0, Math.round(playerHealth))}/${playerMaxHealth}`;
    if (healthBar) {
        const pct = Math.max(0, Math.min(100, (playerHealth / playerMaxHealth) * 100));
        healthBar.style.width = `${pct}%`;
        if (pct > 50) healthBar.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
        else if (pct > 25) healthBar.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
        else healthBar.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
    }

    const invContainer = document.getElementById('play-inventory-hud');
    if (invContainer) {
        invContainer.innerHTML = playerInventory.map(item => `
            <div style="background: rgba(15,23,42,0.92); border: 1.5px solid #00f2fe; border-radius: 8px; padding: 4px 10px; font-size: 0.85rem; font-weight: bold; color: #fff; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                <span>${item.icon || '🗡️'}</span> <span>${item.name}</span>
            </div>
        `).join('');
    }
}

export function damagePlayPlayer(amount: number) {
    const now = Date.now();
    if (now - lastDamageTime < 600) return;
    lastDamageTime = now;

    playerHealth = Math.max(0, playerHealth - amount);
    updatePlayHUD();
    playPlaySound('hit');

    document.body.style.boxShadow = 'inset 0 0 55px rgba(231,76,60,0.85)';
    setTimeout(() => { document.body.style.boxShadow = 'none'; }, 220);

    if (playerHealth <= 0) {
        alert('💀 Said surma! Taassündisid alguspunktis.');
        humanCharacter.position.copy(spawnPointPosition);
        characterVelocity.set(0, 0, 0);
        playerHealth = playerMaxHealth;
        updatePlayHUD();
    }
}

export function equipPlayItemInHand(item: any) {
    if (!playerAvatarRig) return;
    const handSocket = playerAvatarRig.getHandSocket('right');
    if (!handSocket) return;

    while (handSocket.children.length > 0) {
        handSocket.remove(handSocket.children[0]);
    }

    const heldMesh = buildSceneObjectMesh({
        ...item,
        position: { x: 0, y: 0, z: 0 }
    });
    heldMesh.scale.set(0.25, 0.25, 0.25);
    heldMesh.position.set(0, -0.22, 0.15);
    heldMesh.rotation.set(0.2, 0, 0);
    heldMesh.name = 'PlayHeldCustomItem';
    handSocket.add(heldMesh);

    const itemName = item.name || 'Ese';
    if (!playerInventory.some(i => i.name === itemName)) {
        playerInventory.push({
            id: 'held_' + Date.now(),
            name: itemName,
            icon: item.icon || '🗡️',
            type: 'holdable'
        });
        updatePlayHUD();
    }
}

function promptPurchase(objData: any, group: THREE.Group) {
    pendingPurchaseObject = { objData, group };
    const popup = document.getElementById('play-dialog-popup');
    const title = document.getElementById('play-dialog-title');
    const text = document.getElementById('play-dialog-text');
    const icon = document.getElementById('play-dialog-icon');
    const actions = document.getElementById('play-dialog-actions');
    if (popup && title && text) {
        if (icon) icon.innerText = objData.icon || '💎';
        title.innerText = `Osta: ${objData.name}`;
        text.innerText = `Kas soovid osta eseme "${objData.name}" hinnaga ${objData.pbxPrice} Playbuxi?\n(Müügitulu läheb loojale: ${currentGame?.creatorUsername || 'mängu looja'})`;
        if (actions) actions.style.display = 'flex';
        popup.style.display = 'block';
    }
}

function setupPurchaseDialog() {
    const confirmBtn = document.getElementById('btn-play-buy-confirm');
    const cancelBtn = document.getElementById('btn-play-buy-cancel');
    const popup = document.getElementById('play-dialog-popup');

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            if (!pendingPurchaseObject) return;
            const { objData, group } = pendingPurchaseObject;
            const price = objData.pbxPrice || 0;
            const balance = yardService.getPlaybux();

            if (balance >= price) {
                yardService.spendPlaybux(price, objData.id || 'item', `Ostetud ese: ${objData.name}`);
                if (currentGame && currentGame.creatorUsername) {
                    yardService.creditCreatorRevenue(currentGame.creatorUsername, price, objData.name, currentGame.title);
                }
                equipPlayItemInHand(objData);
                group.visible = false;
                group.userData.isCollected = true;
                if (popup) popup.style.display = 'none';
                updatePlayHUD();
                playPlaySound('victory');
                alert(`💎 Ostsid eseme "${objData.name}" hinnaga ${price} PBX! Müügitulu laekus loojale (${currentGame?.creatorUsername}).`);
            } else {
                alert(`❌ Sul pole piisavalt Playbuxe! Sul on ${balance} PBX, aga vaja on ${price} PBX.`);
            }
            pendingPurchaseObject = null;
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (popup) popup.style.display = 'none';
            pendingPurchaseObject = null;
        });
    }
}

// --- Build Scene from Game Data ---
function buildSceneFromData(sceneData: any) {
    if (!sceneData || !Array.isArray(sceneData.objects)) return;

    if (typeof sceneData.playerMaxHealth === 'number') {
        playerMaxHealth = sceneData.playerMaxHealth;
        playerHealth = playerMaxHealth;
    }

    sceneData.objects.forEach((obj: any) => {
        const group = buildSceneObjectMesh(obj);
        group.userData = { ...group.userData, ...obj };

        // Position at spawn point
        if (obj.isSpawnPoint || obj.category === 'spawn' || (obj.catalogId && obj.catalogId.startsWith('spawn_'))) {
            spawnPointPosition.set(obj.position?.x || 0, (obj.position?.y || 0) + 0.1, obj.position?.z || 0);
            humanCharacter.position.copy(spawnPointPosition);
            if (obj.rotation?.y) {
                characterYaw = obj.rotation.y;
                humanCharacter.rotation.y = obj.rotation.y;
            }
        }

        // Equip starter holdable item in hand
        if ((obj.isHoldable || obj.customModelData?.isHoldable) && (obj.inHandAtStart || obj.customModelData?.inHandAtStart)) {
            equipPlayItemInHand(obj);
            group.visible = false;
            group.userData.isCollected = true;
        }

        // Passable objects allow player to walk right through
        const name = (obj.name || '').toLowerCase();
        const isCollectible = obj.gameItemType === 'coin' || obj.gameItemType === 'key' || obj.gameItemType === 'potion' || /(coin|münt|potion|key|võti)/i.test(name) || obj.isHoldable;
        group.userData.isPassable = (obj.isPassable === true) || isCollectible || obj.isSpawnPoint;
        sceneObjects.push(group);

        scene.add(group);
    });

    updatePlayHUD();
}

// --- Load Game & Initialize ---
async function initPlayer() {
    const prof = getCurrentUserProfile();
    const isEstonian = isPlayardOwner(prof?.email);
    (window as any).playardCurrentLang = isEstonian ? 'et' : 'en';

    // Override alert/confirm/prompt
    const _originalAlert = window.alert;
    const _originalConfirm = window.confirm;
    const _originalPrompt = window.prompt;
    window.alert = function(msg?: any) { return _originalAlert.call(window, msg ? t(msg) : msg); };
    window.confirm = function(msg?: string) { return _originalConfirm.call(window, msg ? t(msg) : msg); };
    window.prompt = function(msg?: string, def?: string) { return _originalPrompt.call(window, msg ? t(msg) : msg, def ? t(def) : def); };

    if (!isEstonian) {
        translateDOM(document.body);
    }

    const container = document.getElementById('canvas-container')!;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    dirLight.position.set(40, 80, 40);
    dirLight.castShadow = true;
    scene.add(dirLight);

    createUltraHuman();

    // Fetch Game Data
    const titleDisp = document.getElementById('game-title-display');
    const authorDisp = document.getElementById('game-author-display');
    const reviewBadge = document.getElementById('review-badge');
    const reviewToolbar = document.getElementById('admin-review-toolbar');

    if (isReviewMode) {
        if (reviewBadge) reviewBadge.style.display = 'block';
        if (reviewToolbar) reviewToolbar.style.display = 'flex';
    }

    if (gameId) {
        currentGame = await yardService.getGameById(gameId);

        if (currentGame) {
            if (titleDisp) titleDisp.innerText = currentGame.title;
            if (authorDisp) authorDisp.innerHTML = `By: <strong style="color: #ffd32a;">${currentGame.creatorUsername}</strong> | Category: ${currentGame.category}`;
            
            if (currentGame.sceneData?.mapType === 'sea' && currentGame.sceneData.seaConfig) {
                createUltraOcean(currentGame.sceneData.seaConfig);
            } else {
                createUltraGrass();
            }
            
            buildSceneFromData(currentGame.sceneData);

            (window as any).playGameInstance = {
                get scene() { return scene; },
                get sceneObjects() { return sceneObjects; },
                get currentGame() { return currentGame; },
                get humanCharacter() { return humanCharacter; },
                get characterYaw() { return characterYaw; },
                set characterYaw(val: number) { characterYaw = val; },
                get playerHealth() { return playerHealth; },
                get playerMaxHealth() { return playerMaxHealth; },
                get playerInventory() { return playerInventory; },
                get characterVelocity() { return characterVelocity; },
                get playerSpeedMultiplier() { return playerSpeedMultiplier; },
                get isSpeedBoosted() { return Date.now() < playerSpeedBoostEndTime; },
                equipPlayItemInHand,
                damagePlayPlayer,
                updatePlayHUD,
                playSuperJump,
                playSpeedBoost
            };

            setupPurchaseDialog();
            updatePlayHUD();

            yardService.recordPlayedGame({
                id: 'game_' + currentGame.id,
                title: `🎮 ${currentGame.title}`,
                description: currentGame.description || `Created by ${currentGame.creatorUsername}.`,
                url: `./games/play/index.html?id=${currentGame.id}`,
                icon: '🎮',
                badgeText: currentGame.category || 'Community Game',
                badgeColor: '#00f2fe'
            });
        } else {
            if (titleDisp) titleDisp.innerText = 'Game Not Found';
            createUltraGrass();
        }
    } else {
        createUltraGrass();
        if (titleDisp) titleDisp.innerText = 'Demo Community World';
        yardService.recordPlayedGame({
            id: 'play',
            title: '🎮 Play Community Games',
            description: 'Play games created and published by other players.',
            url: './games/play/index.html',
            icon: '🎮',
            badgeText: 'Community Play',
            badgeColor: '#00f2fe'
        });
    }

    // Setup Admin Review Buttons
    if (isReviewMode && gameId) {
        document.getElementById('btn-review-approve')?.addEventListener('click', async () => {
            await yardService.updateGameStatus(gameId, 'approved');
            alert('✅ Game Approved! It is now live on the Playard Hub.');
            window.location.href = '../../index.html';
        });

        document.getElementById('btn-review-reject')?.addEventListener('click', async () => {
            const reason = prompt('Optional rejection reason:', '') || '';
            await yardService.updateGameStatus(gameId, 'rejected', reason);
            alert('❌ Game Rejected.');
            window.location.href = '../../index.html';
        });

        document.getElementById('btn-review-changes')?.addEventListener('click', async () => {
            const feedback = prompt('What changes should the creator make?', 'Please improve world layout.');
            if (feedback) {
                await yardService.updateGameStatus(gameId, 'changes_requested', feedback);
                alert('⚠️ Feedback sent to creator.');
                window.location.href = '../../index.html';
            }
        });
    }

    // Controls & On-Screen Buttons
    window.addEventListener('keydown', e => { keys[e.code] = true; });
    window.addEventListener('keyup', e => { keys[e.code] = false; });
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Mouse Drag View Rotation (same as Creator Studio)
    let isMouseDown = false;
    let mousePos = { x: 0, y: 0 };
    window.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        mousePos = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => {
        isMouseDown = false;
    });
    window.addEventListener('mousemove', (e) => {
        if (isMouseDown) {
            const dx = e.clientX - mousePos.x;
            characterYaw -= dx * 0.006;
            mousePos = { x: e.clientX, y: e.clientY };
        }
    });

    // Touch Drag View Rotation for mobile/tablets
    let touchStartPos = { x: 0, y: 0 };
    let isTouching = false;
    window.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isTouching = true;
            touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }, { passive: true });
    window.addEventListener('touchend', () => {
        isTouching = false;
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
        if (isTouching && e.touches.length === 1) {
            const dx = e.touches[0].clientX - touchStartPos.x;
            characterYaw -= dx * 0.006;
            touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }, { passive: true });

    // On-Screen Touch D-Pad Binding
    const bindTouchBtn = (id: string, code: string) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            keys[code] = true;
        });
        const release = () => { keys[code] = false; };
        el.addEventListener('pointerup', release);
        el.addEventListener('pointercancel', release);
        el.addEventListener('pointerleave', release);
    };
    bindTouchBtn('touch-btn-up', 'KeyW');
    bindTouchBtn('touch-btn-down', 'KeyS');
    bindTouchBtn('touch-btn-left', 'KeyA');
    bindTouchBtn('touch-btn-right', 'KeyD');
    bindTouchBtn('touch-btn-jump', 'Space');

    const oldControls = document.getElementById('play-screen-controls');
    if (isMobileOrTabletDevice()) {
        if (oldControls) oldControls.style.display = 'none';

        const mobileControls = new PlayardMobileControls({
            showJump: true,
            jumpLabel: 'Jump',
            onMove: (vector) => {
                keys['KeyW'] = vector.y < -0.15;
                keys['KeyS'] = vector.y > 0.15;
                keys['KeyA'] = vector.x < -0.15;
                keys['KeyD'] = vector.x > 0.15;
            },
            onJump: () => {
                keys['Space'] = true;
            },
            onJumpEnd: () => {
                keys['Space'] = false;
            }
        });
        mobileControls.init();
    } else {
        if (oldControls) oldControls.style.display = 'none';
    }

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);
    const time = performance.now() * 0.001;

    if (oceanWaterMesh && activeSeaConfig) {
        const pArr = oceanWaterMesh.geometry.attributes.position.array as Float32Array;
        const bArr = oceanWaterMesh.userData.basePos as Float32Array;
        const wSpeed = activeSeaConfig.waveSpeed || 2.0;
        const wHeight = activeSeaConfig.waveHeight || 0.22;
        
        for (let i = 0; i < pArr.length; i += 3) {
            const bx = bArr[i];
            const by = bArr[i + 1];
            pArr[i + 2] = Math.sin(bx * 0.5 + time * wSpeed) * wHeight + Math.cos(by * 0.4 + time * wSpeed * 0.8) * wHeight;
        }
        oceanWaterMesh.geometry.attributes.position.needsUpdate = true;
    }

    const baseMoveSpeed = 9;
    const currentMoveSpeed = (Date.now() < playerSpeedBoostEndTime) ? (baseMoveSpeed * playerSpeedMultiplier) : baseMoveSpeed;
    const turnSpeed = 2.4;

    // View turning via A/D or ArrowLeft/ArrowRight (same as Creator Studio)
    if (keys['KeyA'] || keys['ArrowLeft']) {
        characterYaw += turnSpeed * delta;
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
        characterYaw -= turnSpeed * delta;
    }

    // Only W and S move the player! (W = forward in view direction, S = backward)
    let moveMagnitude = 0;
    if (keys['KeyW'] || keys['ArrowUp']) moveMagnitude += 1;
    if (keys['KeyS'] || keys['ArrowDown']) moveMagnitude -= 1;

    const forwardX = Math.sin(characterYaw);
    const forwardZ = Math.cos(characterYaw);

    const hasHoriMove = moveMagnitude !== 0;
    if (hasHoriMove) {
        humanCharacter.position.x += forwardX * moveMagnitude * currentMoveSpeed * delta;
        humanCharacter.position.z += forwardZ * moveMagnitude * currentMoveSpeed * delta;

        if (playerAvatarRig) {
            playerAvatarRig.updateAnimation(performance.now() * 0.001, 'run');
        }
    } else {
        if (playerAvatarRig) {
            if (!isGrounded) {
                playerAvatarRig.updateAnimation(performance.now() * 0.001, 'jump');
            } else {
                playerAvatarRig.updateAnimation(performance.now() * 0.001, 'idle');
            }
        }
    }
    humanCharacter.rotation.y = THREE.MathUtils.lerp(humanCharacter.rotation.y, characterYaw, 0.25);

    if (keys['Space'] && isGrounded) {
        characterVelocity.y = 9;
        isGrounded = false;
        playPlaySound('jump');
    }

    if (!isGrounded) {
        characterVelocity.y -= 22 * delta;
        humanCharacter.position.y += characterVelocity.y * delta;
        if (humanCharacter.position.y <= 0) {
            humanCharacter.position.y = 0;
            characterVelocity.y = 0;
            isGrounded = true;
        }
    }

    // Placed Solid Objects Collision & Passable Handling
    const pPos = humanCharacter.position;
    const halfW = 0.35;
    const playerHeight = 1.8;
    let supportedOnSurface = (pPos.y <= 0.001);

    for (let i = 0; i < sceneObjects.length; i++) {
        const group = sceneObjects[i];
        if (group.userData.isPassable) continue;
        const dx = group.position.x - pPos.x;
        const dz = group.position.z - pPos.z;
        if (dx * dx + dz * dz > 400) continue;

        const pMeshBox = new THREE.Box3().setFromObject(group);
        if (pMeshBox.isEmpty()) continue;

        const playerBox = new THREE.Box3(
            new THREE.Vector3(pPos.x - halfW, pPos.y, pPos.z - halfW),
            new THREE.Vector3(pPos.x + halfW, pPos.y + playerHeight, pPos.z + halfW)
        );

        const isHorizontallyOver = (
            pPos.x >= pMeshBox.min.x - 0.15 &&
            pPos.x <= pMeshBox.max.x + 0.15 &&
            pPos.z >= pMeshBox.min.z - 0.15 &&
            pPos.z <= pMeshBox.max.z + 0.15
        );

        if (isHorizontallyOver && Math.abs(pPos.y - pMeshBox.max.y) < 0.15 && characterVelocity.y <= 0) {
            pPos.y = pMeshBox.max.y;
            characterVelocity.y = 0;
            supportedOnSurface = true;
        }

        if (playerBox.intersectsBox(pMeshBox)) {
            const isAbovePlatform = (pPos.y - (characterVelocity.y * delta) >= pMeshBox.max.y - 0.4) || (pPos.y >= pMeshBox.max.y - 0.25);
            const canStepUp = (pMeshBox.max.y - pPos.y <= 0.6) && (pMeshBox.max.y >= pPos.y - 0.05);

            if ((isAbovePlatform && characterVelocity.y <= 0) || canStepUp) {
                pPos.y = pMeshBox.max.y;
                characterVelocity.y = 0;
                supportedOnSurface = true;
            } else {
                const overlapX = Math.min(playerBox.max.x, pMeshBox.max.x) - Math.max(playerBox.min.x, pMeshBox.min.x);
                const overlapZ = Math.min(playerBox.max.z, pMeshBox.max.z) - Math.max(playerBox.min.z, pMeshBox.min.z);

                if (overlapX > 0.001 && overlapZ > 0.001) {
                    const pCenterX = (playerBox.min.x + playerBox.max.x) * 0.5;
                    const pCenterZ = (playerBox.min.z + playerBox.max.z) * 0.5;
                    const bCenterX = (pMeshBox.min.x + pMeshBox.max.x) * 0.5;
                    const bCenterZ = (pMeshBox.min.z + pMeshBox.max.z) * 0.5;

                    if (overlapX < overlapZ) {
                        if (pCenterX < bCenterX) {
                            pPos.x -= (overlapX + 0.005);
                        } else {
                            pPos.x += (overlapX + 0.005);
                        }
                    } else {
                        if (pCenterZ < bCenterZ) {
                            pPos.z -= (overlapZ + 0.005);
                        } else {
                            pPos.z += (overlapZ + 0.005);
                        }
                    }
                }
            }
        }
    }

    if (supportedOnSurface) {
        isGrounded = true;
    } else if (pPos.y > 0.05 && isGrounded) {
        isGrounded = false;
    }

    // Check gameplay objects: damage, superjump, speed boost, scripts, triggers, pickups, goals, checkpoints
    for (let i = 0; i < sceneObjects.length; i++) {
        const group = sceneObjects[i];
        const u = group.userData;
        if (!u || !group.visible) continue;

        const dx = group.position.x - pPos.x;
        const dz = group.position.z - pPos.z;
        const distSq = dx * dx + dz * dz;
        const isTouching = distSq < 36.0 && isPlayerTouchingOrOnTop(pPos, group);
        const isCloseProximity = distSq < 5.0;

        // 1. Damage check (weapons/hazards/lava/script damage/preset damage)
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
                damagePlayPlayer(dmg);
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
                playSuperJump(force);
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
                playSpeedBoost(mult, dur);
            }
        }

        // 4. Object Custom Scripts (Actions array or custom JS)
        if (u.script && u.script.enabled !== false && (isTouching || distSq < 3.5)) {
            const now = Date.now();
            const cd = (u.script.cooldown ?? 1.0) * 1000;
            if (now - (u._lastScriptTrigger || 0) >= cd) {
                u._lastScriptTrigger = now;
                if (Array.isArray(u.script.actions)) {
                    for (const act of u.script.actions) {
                        executePlayScriptAction(act, group, pPos);
                    }
                }
                if (u.script.customJsCode && u.script.customJsCode.trim()) {
                    executePlayCustomJs(u.script.customJsCode, group, pPos);
                }
            }
        }

        // 5. Trigger Dialogue / Text Messages
        if (u.trigger && u.trigger.message && (isTouching || isCloseProximity)) {
            const now = Date.now();
            if (now - (u._lastDialogTrigger || 0) > 4000) {
                u._lastDialogTrigger = now;
                showPlayDialogMessage(u.trigger.title || u.name || 'Info', u.trigger.message, '💬', 4.0);
            }
        }

        // 6. Checkpoints
        if ((u.gameItemType === 'checkpoint' || /(checkpoint|kontrollpunkt)/i.test(u.name || '')) && (isTouching || distSq < 3.5)) {
            if (spawnPointPosition.distanceTo(group.position) > 2.0) {
                spawnPointPosition.set(group.position.x, group.position.y + 0.1, group.position.z);
                playPlaySound('coin');
                showPlayDialogMessage('🚩 Kontrollpunkt!', 'Uus taassünnipaik salvestatud!', '🚩', 2.5);
            }
        }

        // 7. Victory Goal / Finish
        if ((u.gameItemType === 'goal' || u.trigger?.type === 'goal_win' || /(goal|finish|finiš|võit)/i.test(u.name || '')) && (isTouching || distSq < 3.0)) {
            const now = Date.now();
            if (now - (u._lastGoalTrigger || 0) > 5000) {
                u._lastGoalTrigger = now;
                playPlaySound('victory');
                showPlayDialogMessage('🏆 PALJU ÕNNE! VÕIT!', 'Läbisid edukalt mängu finišijoone!', '🏆', 8.0);
            }
        }

        // 8. Holdable items (free pickup or PBX purchase)
        if (u.isHoldable && !u.isCollected && (isTouching || distSq < 6.0)) {
            if (u.costsPbx && (u.pbxPrice ?? 0) > 0) {
                if ((keys['KeyE'] || distSq < 2.5) && !pendingPurchaseObject) {
                    if (keys['KeyE']) keys['KeyE'] = false;
                    promptPurchase(u, group);
                }
            } else {
                if (keys['KeyE'] || distSq < 2.5) {
                    if (keys['KeyE']) keys['KeyE'] = false;
                    equipPlayItemInHand(u);
                    group.visible = false;
                    u.isCollected = true;
                    playPlaySound('coin');
                }
            }
        }
    }

    // Smooth Camera follow
    const targetCamPos = new THREE.Vector3(
        humanCharacter.position.x - Math.sin(characterYaw) * 7,
        humanCharacter.position.y + 4,
        humanCharacter.position.z - Math.cos(characterYaw) * 7
    );
    camera.position.lerp(targetCamPos, 0.1);
    camera.lookAt(humanCharacter.position.x, humanCharacter.position.y + 1.6, humanCharacter.position.z);

    renderer.render(scene, camera);
}

initPlayer();
