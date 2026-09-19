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
import { CityCarHUD } from './ui/hud';
import { DriverInfo } from './types';

console.log('[CityCar] 3D City & Nature Drive Simulator initializing...');

// 1. Auth & Access Verification
const profile = getCurrentUserProfile();
const isTestMode = typeof window !== 'undefined' && (window as any).__PLAYARD_TEST_MODE__;
const hasAccess = isTestMode || canAccessCityCar(profile, profile?.username);

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

let isArrested = false;

function triggerArrest(): void {
    if (isArrested) return;
    isArrested = true;
    audioSystem.playExplosion();
    physics.state.velocity.set(0, 0, 0);
    physics.state.speed = 0;
    hud.showArrestedModal(() => {
        resetGameAfterArrest();
    });
}

function resetGameAfterArrest(): void {
    isArrested = false;
    hud.hideArrestedModal();
    wantedSystem.reset();
    policeSystem.setWantedLevel(0, physics.state.position, 0);
    airSupportSystem.despawnAll();
    tankSystem.despawnAll();
    physics.resetCar();
}

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
        policeSystem.setWantedLevel(level, physics.state.position, carMesh.group.rotation.y);
        airSupportSystem.setWantedLevel(level, physics.state.position);
        tankSystem.setWantedLevel(level, physics.state.position);
    }
});

// Crime triggers
physics.onLampHit = () => {
    audioSystem.playLampHit();
    wantedSystem.reportLampCrash();
};
physics.onBuildingHit = () => {
    wantedSystem.reportBuildingCollision();
};
physics.onWaterDive = () => {
    wantedSystem.reportOffroadOrWater(true);
};
physics.onOffroadDrive = () => {
    // User requested: "kui sõidan autoteelt välja siis ikka ei tule politseid"
    // Driving off-road does NOT trigger wanted stars.
};

// Arrest triggers
policeSystem.onPlayerRam = () => {
    wantedSystem.reportPoliceCollision();
    triggerArrest();
};

airSupportSystem.onBombHitPlayer = () => {
    triggerArrest();
};
airSupportSystem.onExplosionSound = () => {
    audioSystem.playExplosion();
};

tankSystem.onRocketHitPlayer = () => {
    triggerArrest();
};
tankSystem.onExplosionSound = () => {
    audioSystem.playExplosion();
};
tankSystem.onRocketLaunchSound = () => {
    audioSystem.playRocketLaunch();
};

// 7. UI HUD Setup
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
    () => {
        physics.resetCar();
    },
    (active) => {
        input.triggerHorn(active);
        audioSystem.playHorn(active);
    },
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
        if (!isArrested) {
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
                physics.state.currentZone
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
        } else {
            // Still update aerial/tank visuals during freeze if needed
            airSupportSystem.update(delta, physics.state.position);
            tankSystem.update(delta, physics.state.position);
        }
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
    physics,
    world,
    multiplayer,
    state: cityCarState,
    hud,
    wantedSystem,
    policeSystem,
    airSupportSystem,
    tankSystem,
    triggerArrest,
    resetGameAfterArrest
};

animate();
