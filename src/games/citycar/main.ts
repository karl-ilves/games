import * as THREE from 'three';
import { getCurrentUserProfile, canAccessCityCar, isPlayardOwner, isOwnerUser, formatOwnerNametag } from '../../auth';
import { cityCarState } from './state/cityCarState';
import { createCarMesh } from './models/carModel';
import { buildWorld } from './world/world';
import { CarPhysicsController } from './systems/carPhysics';
import { CameraFollowSystem } from './systems/camera';
import { CityCarMultiplayerSystem } from './systems/multiplayer';
import { CityCarInputController } from './systems/input';
import { CityCarAudioSystem } from './audio';
import { PoliceChaseSystem } from './systems/policeSystem';
import { AirSupportSystem } from './systems/airSupportSystem';
import { TankSystem } from './systems/tankSystem';
import { WantedSystem } from './systems/wantedSystem';
import { SkidMarksSystem } from './effects/skidMarksSystem';
import { CrashDebrisSystem } from './effects/crashDebrisSystem';
import { FireSystem } from './effects/fireSystem';
import { CityCarHUD } from './ui/hud';
import { DriverInfo } from './types';
import { yardService } from '../../shared/yardService';

console.log('[CityCar] 3D City & Nature Drive Simulator initializing...');

// 1. Auth & Access Verification & History Recording
const profile = getCurrentUserProfile();
const isTestMode = typeof window !== 'undefined' && (window as any).__PLAYARD_TEST_MODE__;
const hasAccess = isTestMode || canAccessCityCar(profile, profile?.username);

yardService.recordPlayedGame({
    id: 'citycar',
    title: '🚗 3D City & Nature Drive',
    description: 'Free-drive through skyscrapers, cross bridges, and explore the forest and river in real-time multiplayer!',
    url: './games/citycar/index.html',
    icon: '🚗',
    badgeText: '🏙️🌲 3D City Drive',
    badgeColor: '#00f2fe'
});

// 2. Three.js Scene, Camera & Renderer
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 800);

// 3. Build Modular 3D World (City, River, Bridges, Forest)
const world = buildWorld(scene);

// 4. Local Player Car Mesh
const isOwner = isPlayardOwner(profile?.email) || isOwnerUser(profile);
const rawDriverName = profile?.displayName || profile?.username || cityCarState.getUserName();
const driverName = isOwner ? formatOwnerNametag(rawDriverName, true) : rawDriverName;
cityCarState.setUserName(driverName);

const carMesh = createCarMesh({
    driverName,
    bodyColor: cityCarState.getCarColor(),
    secondaryColor: '#111620',
    isOpponent: false
});
scene.add(carMesh.group);

// 5. Initialize Controllers & Subsystems
const physics = new CarPhysicsController(carMesh, world, new THREE.Vector3(-60, 0.1, 0));
const cameraSystem = new CameraFollowSystem(camera);
const audioSystem = new CityCarAudioSystem(cityCarState.isAudioEnabled());
const policeSystem = new PoliceChaseSystem(scene, world);
const airSupportSystem = new AirSupportSystem(scene, world);
const tankSystem = new TankSystem(scene, world);
const skidMarksSystem = new SkidMarksSystem(scene);
const crashDebrisSystem = new CrashDebrisSystem(scene, world);
const fireSystem = new FireSystem(scene);

let isArrested = false;
let isDead = false;

function resetGame(): void {
    isDead = false;
    isArrested = false;
    hud.hideDeathModal();
    hud.hideArrestedModal();
    carMesh.setEntireCarWrecked(false);
    carMesh.setFrontWrecked(false);
    crashDebrisSystem.clear();
    fireSystem.extinguish();
    cameraSystem.resetCrashZoom();
    skidMarksSystem.clear();
    wantedSystem.reset();
    policeSystem.setWantedLevel(0, physics.state.position, 0);
    airSupportSystem.despawnAll();
    tankSystem.despawnAll();
    hud.updateWantedLevel(0);
    physics.resetCar();
}

function triggerArrest(): void {
    if (isArrested || isDead) return;
    isArrested = true;
    audioSystem.playExplosion();
    physics.state.velocity.set(0, 0, 0);
    physics.state.speed = 0;
    hud.showArrestedModal(() => resetGame());
}

function triggerCrashDeath(info: { reason: string; speedKmh: number; isMidAir?: boolean }): void {
    if (isDead || isArrested) return;
    isDead = true;
    audioSystem.playExplosion();
    const isMidAir = !!info.isMidAir;
    if (isMidAir) {
        physics.setFallingAfterCrash(true);
        carMesh.setEntireCarWrecked(true);
    } else {
        carMesh.setFrontWrecked(true);
    }
    const yaw = carMesh.group.rotation.y;
    const forwardDir = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    crashDebrisSystem.spawnDebris(physics.state.position, forwardDir, cityCarState.getCarColor(), isMidAir);
    fireSystem.triggerFireball(physics.state.position, isMidAir ? 2.0 : 1.0);
    fireSystem.startCarFire(carMesh.group);
    cameraSystem.triggerCrashZoom(physics.state.position, yaw, 5.0);
}

cameraSystem.onCrashZoomComplete = () => {
    const desc = carMesh.isEntireCarWrecked()
        ? 'You jumped from the ramp and crashed into a building in mid-air! Your entire car was destroyed!'
        : 'You crashed into a building at high speed and your car was destroyed!';
    hud.showDeathModal('YOU DIED!', desc, () => resetGame());
};

physics.onCrashDeath = triggerCrashDeath;

let activeDrivers: DriverInfo[] = [];
const multiplayer = new CityCarMultiplayerSystem(
    cityCarState.getUserId(),
    driverName,
    cityCarState.getCarColor(),
    scene,
    (drivers) => {
        activeDrivers = drivers;
        hud.updateDriversRoster(drivers);
    }
);

// 6. Wanted Level & Military Response Setup
const wantedSystem = new WantedSystem({
    onStarAwarded: (newLevel) => {
        audioSystem.playStarAwarded();
        hud.triggerStarAwardAnimation(newLevel);
    },
    onWantedLevelChanged: (level) => {
        hud.updateWantedLevel(level);
        policeSystem.setWantedLevel(level, physics.state.position, carMesh.group.rotation.y);
        airSupportSystem.setWantedLevel(level, physics.state.position);
        tankSystem.setWantedLevel(level, physics.state.position);
    }
});

// Crime & Arrest triggers
physics.onLampHit = () => { audioSystem.playLampHit(); wantedSystem.reportLampCrash(); };
physics.onBuildingHit = () => wantedSystem.reportBuildingCollision();
physics.onWaterDive = () => wantedSystem.reportOffroadOrWater(true);
policeSystem.onPlayerRam = () => { wantedSystem.reportPoliceCollision(); triggerArrest(); };
airSupportSystem.onBombHitPlayer = () => triggerArrest();
airSupportSystem.onExplosionSound = () => audioSystem.playExplosion();
tankSystem.onRocketHitPlayer = () => triggerArrest();
tankSystem.onExplosionSound = () => audioSystem.playExplosion();
tankSystem.onRocketLaunchSound = () => audioSystem.playRocketLaunch();

// 7. UI HUD & Input Setup
const hud = new CityCarHUD(
    (newColor) => {
        cityCarState.setCarColor(newColor);
        carMesh.setBodyColor(newColor);
        multiplayer.setLocalColor(newColor);
    },
    () => {
        const nextMode = cityCarState.cycleCameraMode();
        cameraSystem.setMode(nextMode);
        hud.updateCameraLabel(nextMode);
    },
    () => resetGame(),
    (active) => { input.triggerHorn(active); audioSystem.playHorn(active); },
    () => {
        const enabled = cityCarState.toggleAudio();
        audioSystem.setEnabled(enabled);
        hud.updateAudioIcon(enabled);
    }
);

const input = new CityCarInputController(
    () => {
        const nextMode = cityCarState.cycleCameraMode();
        cameraSystem.setMode(nextMode);
        hud.updateCameraLabel(nextMode);
    },
    () => {
        const enabled = cityCarState.toggleAudio();
        audioSystem.setEnabled(enabled);
        hud.updateAudioIcon(enabled);
    }
);

if (!hasAccess) {
    hud.showAccessRestrictedModal();
}

// 8. Responsive Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 9. Main Animation & Game Loop
const clock = new THREE.Clock();
let elapsedSec = 0;

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    elapsedSec += delta;

    if (hasAccess) {
        if (!isArrested && !isDead) {
            if (input.state.reset) resetGame();
            physics.update(delta, input.state);
            input.postPhysicsUpdate();

            // Audio
            audioSystem.updateEngine(physics.state.speed, input.state.throttle);
            if (input.state.horn) {
                audioSystem.playHorn(true);
            }

            // Camera follow
            const carYaw = carMesh.group.rotation.y;
            cameraSystem.update(delta, physics.state.position, carYaw);

            // Network sync
            multiplayer.sendLocalState(
                physics.state.position.x,
                physics.state.position.y,
                physics.state.position.z,
                carYaw,
                physics.state.speed,
                physics.state.wheelRotation,
                physics.state.steeringAngle,
                physics.state.currentZone,
                wantedSystem.getWantedLevel()
            );

            // Police cruisers
            policeSystem.update(
                delta,
                physics.state.position,
                carYaw,
                physics.state.speed,
                () => {
                    wantedSystem.reportPoliceCollision();
                    triggerArrest();
                }
            );

            // Military Air Support (Helicopters & Bomber Plane)
            airSupportSystem.update(delta, physics.state.position);

            // Military Tanks
            tankSystem.update(delta, physics.state.position);

            // Remote multiplayer chases (see police, helis, planes & tanks pursuing other drivers)
            const remotes = multiplayer.getRemoteDrivers();
            policeSystem.updateRemoteChases(delta, remotes);
            airSupportSystem.updateRemoteAirSupport(delta, remotes);
            tankSystem.updateRemoteTanks(delta, remotes);

            // Audio for sirens and helicopter blades
            const hasActivePolice = policeSystem.getActiveCount() > 0;
            const distToPolice = policeSystem.getClosestDistance(physics.state.position);
            const sirenVol = hasActivePolice ? Math.max(0.04, Math.min(0.18, 1.0 - distToPolice / 120)) : 0;
            audioSystem.updatePoliceSiren(hasActivePolice, sirenVol);
            audioSystem.updateHeliAudio(airSupportSystem.getHelicopterCount() > 0);

            // HUD updates
            hud.updateSpeedAndGear(physics.state.speed, physics.state.gear);
            hud.updateZone(physics.state.currentZone);
            hud.updateMinimap(physics.state.position, carYaw, activeDrivers);

            // Odometer
            const distanceStepKm = (physics.state.speed / 3600) * delta;
            cityCarState.addDistanceTraveled(distanceStepKm);

            // Drift tire tracks (User: "ja kui sa pidurdas ja põõrad sa saad triftida ja jälg jääb ma peal eja jälg kaob ära 1 min pärast")
            if (physics.state.isDrifting && physics.state.isGrounded) {
                const wheels = physics.getRearWheelWorldPositions();
                const groundY = world.getGroundHeight(physics.state.position.x, physics.state.position.z);
                skidMarksSystem.recordDrift(wheels.left, wheels.right, elapsedSec, groundY);
            } else {
                skidMarksSystem.endDrift();
            }
            skidMarksSystem.update(elapsedSec);
        } else if (isDead) {
            // Crash death: cinematic 5-second zoom-out
            cameraSystem.update(delta, physics.state.position, carMesh.group.rotation.y);
            airSupportSystem.update(delta, physics.state.position);
            tankSystem.update(delta, physics.state.position);
        } else {
            // Arrested
            airSupportSystem.update(delta, physics.state.position);
            tankSystem.update(delta, physics.state.position);
        }
        crashDebrisSystem.update(delta);
        fireSystem.update(delta);
    }

    // World animation (river ripples & falling street lamps)
    world.update(elapsedSec, delta);

    // Remote multiplayer car interpolation
    multiplayer.update(delta);

    // Render 3D scene
    renderer.render(scene, camera);
}

// Expose state and controller for automated verification
(window as any).__CITY_CAR_DEBUG__ = {
    physics, carMesh, cameraSystem, crashDebrisSystem, fireSystem, world, multiplayer,
    state: cityCarState, hud, wantedSystem, policeSystem, airSupportSystem, tankSystem,
    skidMarksSystem, triggerArrest, resetGame, resetGameAfterArrest: resetGame,
    triggerCrashDeath, resetGameAfterDeath: resetGame
};

animate();
