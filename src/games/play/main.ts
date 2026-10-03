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
    if (popup && title && text) {
        if (icon) icon.innerText = objData.icon || '💎';
        title.innerText = `Osta: ${objData.name}`;
        text.innerText = `Kas soovid osta eseme "${objData.name}" hinnaga ${objData.pbxPrice} Playbuxi?\n(Müügitulu läheb loojale: ${currentGame?.creatorUsername || 'mängu looja'})`;
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
                equipPlayItemInHand,
                damagePlayPlayer,
                updatePlayHUD
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

    const moveSpeed = 9;
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
        humanCharacter.position.x += forwardX * moveMagnitude * moveSpeed * delta;
        humanCharacter.position.z += forwardZ * moveMagnitude * moveSpeed * delta;

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

    // Check damage items, holdable pickups and purchases
    for (let i = 0; i < sceneObjects.length; i++) {
        const group = sceneObjects[i];
        const u = group.userData;
        if (!u || !group.visible) continue;

        const dx = group.position.x - pPos.x;
        const dz = group.position.z - pPos.z;
        const distSq = dx * dx + dz * dz;

        // 1. Damage check (weapons/hazards)
        if (u.dealsDamage && (u.damageAmount ?? 0) > 0 && distSq < 4.0) {
            damagePlayPlayer(u.damageAmount ?? 25);
        }

        // 2. Holdable items (free pickup or PBX purchase)
        if (u.isHoldable && !u.isCollected && distSq < 6.0) {
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
