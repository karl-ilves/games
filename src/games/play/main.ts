import * as THREE from 'three';
import { yardService } from '../../shared/yardService';
import { getCurrentUserProfile, isPlayardOwner } from '../../auth';
import { avatarService } from '../../shared/avatar/AvatarService';
import { AvatarRig } from '../../shared/avatar/AvatarRig';
import { translateDOM, t } from '../../shared/i18n_dict';

import { playState } from './state/playState';
import { playPlaySound } from './audio';
import { createUltraGrass, createUltraOcean, updateOceanAnimation } from './world/environment';
import { buildSceneFromData } from './world/sceneLoader';
import { resolvePlayerCollisions, isPlayerTouchingOrOnTop } from './systems/collision';
import { checkGameplayTriggers } from './systems/scriptRunner';
import { promptPurchase, setupPurchaseDialog } from './ui/purchaseDialog';
import { setupInputListeners } from './systems/input';
import { setupAdminReview } from './ui/adminReview';

// Re-exports for backwards compatibility and test suites
export {
    playPlaySound,
    isPlayerTouchingOrOnTop
};
export const showPlayDialogMessage = (title: string, message: string, icon = '💬', autoHideSec = 3.5) => playState.showPlayDialogMessage(title, message, icon, autoHideSec);
export const playSuperJump = (force = 22) => playState.playSuperJump(force);
export const playSpeedBoost = (multiplier = 2.2, durationSec = 4.0) => playState.playSpeedBoost(multiplier, durationSec);
export const damagePlayPlayer = (amount: number) => playState.damagePlayPlayer(amount);
export const equipPlayItemInHand = (item: any) => playState.equipPlayItemInHand(item);

console.log("Community Game Player Loading...");

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let clock: THREE.Clock;
let oceanWaterMesh: THREE.Mesh | null = null;
let activeSeaConfig: any = null;

const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('id');
const isReviewMode = urlParams.get('mode') === 'review';

function createUltraHuman() {
    playState.playerAvatarRig = new AvatarRig(avatarService.getConfig());
    playState.humanCharacter = playState.playerAvatarRig.rootGroup;
    playState.humanCharacter.name = 'Play_Player_AvatarRig';
    playState.humanCharacter.position.set(0, 0, 0);
    scene.add(playState.humanCharacter);

    avatarService.subscribe(cfg => {
        if (playState.playerAvatarRig) {
            playState.playerAvatarRig.applyConfig(cfg);
        }
    });
}

async function initPlayer() {
    const prof = getCurrentUserProfile();
    const isEstonian = isPlayardOwner(prof?.email);
    (window as any).playardCurrentLang = isEstonian ? 'et' : 'en';

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

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    dirLight.position.set(40, 80, 40);
    dirLight.castShadow = true;
    scene.add(dirLight);

    createUltraHuman();

    const titleDisp = document.getElementById('game-title-display');
    const authorDisp = document.getElementById('game-author-display');
    const reviewBadge = document.getElementById('review-badge');
    const reviewToolbar = document.getElementById('admin-review-toolbar');

    if (isReviewMode) {
        if (reviewBadge) reviewBadge.style.display = 'block';
        if (reviewToolbar) reviewToolbar.style.display = 'flex';
    }

    if (gameId) {
        playState.currentGame = await yardService.getGameById(gameId);

        if (playState.currentGame) {
            if (titleDisp) titleDisp.innerText = playState.currentGame.title;
            if (authorDisp) authorDisp.innerHTML = `By: <strong style="color: #ffd32a;">${playState.currentGame.creatorUsername}</strong> | Category: ${playState.currentGame.category}`;
            
            if (playState.currentGame.sceneData?.mapType === 'sea' && playState.currentGame.sceneData.seaConfig) {
                const seaRes = createUltraOcean(scene, playState.currentGame.sceneData.seaConfig);
                oceanWaterMesh = seaRes.oceanWaterMesh;
                activeSeaConfig = seaRes.activeSeaConfig;
            } else {
                createUltraGrass(scene);
            }
            
            buildSceneFromData(playState.currentGame.sceneData, playState, scene);

            setupPurchaseDialog(playState);
            playState.updatePlayHUD();

            yardService.recordPlayedGame({
                id: 'game_' + playState.currentGame.id,
                title: `🎮 ${playState.currentGame.title}`,
                description: playState.currentGame.description || `Created by ${playState.currentGame.creatorUsername}.`,
                url: `./games/play/index.html?id=${playState.currentGame.id}`,
                icon: '🎮',
                badgeText: playState.currentGame.category || 'Community Game',
                badgeColor: '#00f2fe'
            });
        } else {
            if (titleDisp) titleDisp.innerText = 'Game Not Found';
            createUltraGrass(scene);
        }
    } else {
        createUltraGrass(scene);
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

    // Expose global instance for tests and interaction
    (window as any).playGameInstance = {
        get scene() { return scene; },
        get sceneObjects() { return playState.sceneObjects; },
        get currentGame() { return playState.currentGame; },
        get humanCharacter() { return playState.humanCharacter; },
        get characterYaw() { return playState.characterYaw; },
        set characterYaw(val: number) { playState.characterYaw = val; },
        get playerHealth() { return playState.playerHealth; },
        get playerMaxHealth() { return playState.playerMaxHealth; },
        get playerInventory() { return playState.playerInventory; },
        get characterVelocity() { return playState.characterVelocity; },
        get playerSpeedMultiplier() { return playState.playerSpeedMultiplier; },
        get isSpeedBoosted() { return Date.now() < playState.playerSpeedBoostEndTime; },
        equipPlayItemInHand: (item: any) => playState.equipPlayItemInHand(item),
        damagePlayPlayer: (amt: number) => playState.damagePlayPlayer(amt),
        updatePlayHUD: () => playState.updatePlayHUD(),
        playSuperJump: (force?: number) => playState.playSuperJump(force),
        playSpeedBoost: (m?: number, d?: number) => playState.playSpeedBoost(m, d)
    };

    if (isReviewMode && gameId) {
        setupAdminReview(gameId);
    }

    setupInputListeners(playState, camera, renderer);
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);
    const time = performance.now() * 0.001;

    updateOceanAnimation(oceanWaterMesh, activeSeaConfig, time);

    const baseMoveSpeed = 9;
    const currentMoveSpeed = (Date.now() < playState.playerSpeedBoostEndTime) ? (baseMoveSpeed * playState.playerSpeedMultiplier) : baseMoveSpeed;
    const turnSpeed = 2.4;

    if (playState.keys['KeyA'] || playState.keys['ArrowLeft']) {
        playState.characterYaw += turnSpeed * delta;
    }
    if (playState.keys['KeyD'] || playState.keys['ArrowRight']) {
        playState.characterYaw -= turnSpeed * delta;
    }

    let moveMagnitude = 0;
    if (playState.keys['KeyW'] || playState.keys['ArrowUp']) moveMagnitude += 1;
    if (playState.keys['KeyS'] || playState.keys['ArrowDown']) moveMagnitude -= 1;

    const forwardX = Math.sin(playState.characterYaw);
    const forwardZ = Math.cos(playState.characterYaw);

    const hasHoriMove = moveMagnitude !== 0;
    if (hasHoriMove) {
        playState.humanCharacter.position.x += forwardX * moveMagnitude * currentMoveSpeed * delta;
        playState.humanCharacter.position.z += forwardZ * moveMagnitude * currentMoveSpeed * delta;

        if (playState.playerAvatarRig) {
            playState.playerAvatarRig.updateAnimation(performance.now() * 0.001, 'run');
        }
    } else {
        if (playState.playerAvatarRig) {
            if (!playState.isGrounded) {
                playState.playerAvatarRig.updateAnimation(performance.now() * 0.001, 'jump');
            } else {
                playState.playerAvatarRig.updateAnimation(performance.now() * 0.001, 'idle');
            }
        }
    }
    playState.humanCharacter.rotation.y = THREE.MathUtils.lerp(playState.humanCharacter.rotation.y, playState.characterYaw, 0.25);

    if (playState.keys['Space'] && playState.isGrounded) {
        playState.characterVelocity.y = 9;
        playState.isGrounded = false;
        playPlaySound('jump');
    }

    if (!playState.isGrounded) {
        playState.characterVelocity.y -= 22 * delta;
        playState.humanCharacter.position.y += playState.characterVelocity.y * delta;
        if (playState.humanCharacter.position.y <= 0) {
            playState.humanCharacter.position.y = 0;
            playState.characterVelocity.y = 0;
            playState.isGrounded = true;
        }
    }

    resolvePlayerCollisions(playState, delta);
    checkGameplayTriggers(playState, (objData, group) => promptPurchase(objData, group, playState));

    const targetCamPos = new THREE.Vector3(
        playState.humanCharacter.position.x - Math.sin(playState.characterYaw) * 7,
        playState.humanCharacter.position.y + 4,
        playState.humanCharacter.position.z - Math.cos(playState.characterYaw) * 7
    );
    camera.position.lerp(targetCamPos, 0.1);
    camera.lookAt(playState.humanCharacter.position.x, playState.humanCharacter.position.y + 1.6, playState.humanCharacter.position.z);

    renderer.render(scene, camera);
}

initPlayer();
