import * as THREE from 'three';
import { getCurrentUserProfile, canAccessCityCar } from '../../auth';
import { cityCarState } from './state/cityCarState';
import { createCarMesh } from './models/carModel';
import { buildWorld } from './world/world';
import { CarPhysicsController } from './systems/carPhysics';
import { CameraFollowSystem } from './systems/camera';
import { CityCarMultiplayerSystem } from './systems/multiplayer';
import { CityCarInputController } from './systems/input';
import { CityCarAudioSystem } from './audio';
import { CityCarHUD } from './ui/hud';
import { DriverInfo } from './types';

console.log('[CityCar] 3D City & Nature Drive Simulator initializing...');

// 1. Access Control Verification
const profile = getCurrentUserProfile();
const isTestMode = typeof window !== 'undefined' && (window as any).__PLAYARD_TEST_MODE__;
const hasAccess = isTestMode || canAccessCityCar(profile, profile?.username);

// 2. Setup Three.js Scene, Camera, and Renderer
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.2, 1200);
const renderer = new THREE.WebGLRenderer({
    canvas: canvas || undefined,
    antialias: true,
    powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// 3. Build Procedural World (City, River, Bridges, Borders, Forest)
const world = buildWorld(scene);

// 4. Create Player's 3D Car
const driverName = profile?.username || profile?.displayName || cityCarState.getUserName();
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

// 6. UI HUD Setup
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

// 7. Responsive Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 8. Main Animation & Game Loop
const clock = new THREE.Clock();
let elapsedSec = 0;

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    elapsedSec += delta;

    // Update vehicle physics only if authorized
    if (hasAccess) {
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

        // HUD updates
        hud.updateSpeedAndGear(physics.state.speed, physics.state.gear);
        hud.updateZone(physics.state.currentZone);
        hud.updateMinimap(physics.state.position, carYaw, activeDrivers);

        // Odometer
        const distanceStepKm = (physics.state.speed / 3600) * delta;
        cityCarState.addDistanceTraveled(distanceStepKm);
    }

    // World animation (river ripples)
    world.update(elapsedSec);

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
    hud
};

animate();
