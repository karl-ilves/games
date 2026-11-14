import * as THREE from 'three';
import { enforceDesktopOnly } from '../../shared/mobileControls';
import { initPlayardMenu } from '../../shared/inGameMenu';
import { yardService } from '../../shared/yardService';
import { VEHICLE_CATALOG } from './catalog';
import { carCrashState } from './state/crashState';
import { buildDeformableVehicle } from './models/deformableCar';
import { buildCrashWorld } from './world/crashWorld';
import { CrashPhysicsSystem } from './systems/crashPhysics';
import { CrashCameraSystem } from './systems/camera';
import { CrashInputController } from './systems/input';
import { CarCrashAudioSystem } from './audio';
import { CrashParticleSystem } from './effects/particles';
import { CrashHUD } from './ui/hud';
import { GarageModalController } from './ui/garageModal';
import { VehicleConfig } from './types';

console.log('[CarCrashSimulator] 💥 Ultra Realistlik Car Crash Simulator initializing...');

// Expose catalog globally for tests
(window as any).carCrashCatalog = VEHICLE_CATALOG;

// 1. Mandatory PC-Only Enforcement (Computer Only)
const isBlockedOnMobile = enforceDesktopOnly('Ultra Realistlik Car Crash', 'Ultra Realistic Car Crash');
if (!isBlockedOnMobile) {
    // Record game in Playard Hub
    yardService.recordPlayedGame({
        id: 'carcrash',
        title: '💥 Ultra Realistlik Car Crash',
        description: 'BeamNG-stiilis pehmekere deformatsioon, purustusrullid, hüppemäed ja reaalajas aegluup (Slow-Mo)!',
        url: './games/carcrash/index.html',
        icon: '💥',
        badgeText: '💻 AINULT ARVUTI',
        badgeColor: '#ff4757'
    });
}

// 2. Playard Top-Right "P" Menu Integration
initPlayardMenu({
    gameTitle: '💥 Ultra Realistlik Car Crash',
    getPlayerCount: () => ({
        countStr: '1 / 1 Mängija (Arvuti režiim)',
        players: ['Sina (Mängija)']
    }),
    hubUrl: '../../index.html'
});

// 3. Three.js Scene, Camera, and WebGL Renderer
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a101d);
scene.fog = new THREE.FogExp2(0x0a101d, 0.0018);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 3000);

// 4. Build 3D Arena World & Obstacles
const world = buildCrashWorld(scene);

// 5. Spawn Initial Deformable Car
let activeConfig: VehicleConfig = VEHICLE_CATALOG.find(v => v.id === carCrashState.getState().selectedVehicleId) || VEHICLE_CATALOG[0];
let activeVehicle = buildDeformableVehicle(activeConfig);
scene.add(activeVehicle.root);

// Spawn position facing the concrete barrier
const spawnPos = new THREE.Vector3(0, 0.6, -20);
const physics = new CrashPhysicsSystem(activeVehicle, spawnPos);
const cameraSystem = new CrashCameraSystem(camera);
const inputController = new CrashInputController();
const audio = new CarCrashAudioSystem(true);
const particles = new CrashParticleSystem(scene);
const hud = new CrashHUD();

// 6. UI Garage Modal Controller
new GarageModalController(activeConfig.id, (newConfig) => {
    activeConfig = newConfig;
    carCrashState.setVehicle(newConfig.id);
    scene.remove(activeVehicle.root);
    activeVehicle = buildDeformableVehicle(newConfig);
    scene.add(activeVehicle.root);
    physics.setVehicle(activeVehicle);
    physics.respawn(spawnPos);
    audio.playRepairChime();
});

// Wire HUD UI Buttons
document.getElementById('btn-respawn-car')?.addEventListener('click', () => {
    physics.respawn(spawnPos);
    carCrashState.resetDamage();
    audio.playRepairChime();
});

document.getElementById('btn-toggle-slowmo')?.addEventListener('click', () => {
    carCrashState.toggleSlowMo();
    hud.update(carCrashState.getState(), activeConfig.name);
});

document.getElementById('btn-toggle-cam')?.addEventListener('click', () => {
    cameraSystem.cycleMode();
});

// Window resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 7. Main Animation & Physics Loop (< 300 lines orchestrator)
let lastTime = performance.now();

function animate(currentTime: number): void {
    requestAnimationFrame(animate);

    const rawDelta = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    const state = carCrashState.getState();
    const effectiveDelta = rawDelta * state.slowMoScale;

    // Handle Quick Inputs
    const inputs = inputController.getInputs();

    if (inputs.respawnRequested) {
        physics.respawn(spawnPos);
        carCrashState.resetDamage();
        audio.playRepairChime();
    }
    if (inputs.slowMoToggled) {
        carCrashState.toggleSlowMo();
    }
    if (inputs.cameraToggled) {
        cameraSystem.cycleMode();
    }

    // Dynamic obstacle animations
    world.updateObstacles(effectiveDelta);

    // Physics update with collision detection
    physics.update(
        effectiveDelta,
        inputs,
        world.obstacles,
        (impactG, contactPt, impactSpeedKmh) => {
            // Impact Event Callback
            const worldContact = activeVehicle.root.localToWorld(contactPt.clone());
            particles.emitImpactBurst(worldContact, impactG, impactSpeedKmh);
            audio.playMetalCrunch(Math.min(1.0, Math.max(0.2, impactSpeedKmh / 50.0)));

            // Calculate current damaged state
            let totalDisp = 0;
            let deformedNodes = 0;
            for (const v of activeVehicle.deformableVertices) {
                const len = v.displacement.length();
                if (len > 0.05) deformedNodes++;
                totalDisp += len;
            }
            const dmgPct = Math.min(100, Math.round((totalDisp / (activeVehicle.deformableVertices.length * 0.18)) * 100));
            carCrashState.updateDamage(dmgPct, deformedNodes);
        }
    );

    // Radiator smoke/fire when car is damaged
    const engineWorldPos = activeVehicle.root.localToWorld(new THREE.Vector3(0, activeConfig.dimensions.height * 0.4, activeConfig.dimensions.length * 0.38));
    particles.emitContinuousDamageSmoke(engineWorldPos, carCrashState.getState().damagePercent);

    // SpaceX Thruster plumes
    if (physics.isThrusterFiring) {
        const bottomPos = activeVehicle.root.localToWorld(new THREE.Vector3(0, 0.1, 0));
        const downDir = new THREE.Vector3(0, -1, 0).applyEuler(physics.rotation);
        particles.emitThrusterJet(bottomPos, downDir, false);
    }
    if (physics.isBoostFiring) {
        const rearPos = activeVehicle.root.localToWorld(new THREE.Vector3(0, activeConfig.dimensions.height * 0.38, -activeConfig.dimensions.length * 0.52));
        const rearDir = new THREE.Vector3(0, 0, -1).applyEuler(physics.rotation);
        particles.emitThrusterJet(rearPos, rearDir, true);
    }

    // Audio & Telemetry
    audio.updateEngine(physics.speedKmh, inputs.forward);
    if (inputs.handbrake && physics.speedKmh > 20) {
        audio.playSkidSound();
    }

    let gear = 'N';
    if (inputs.forward > 0) gear = physics.speedKmh > 80 ? '4' : (physics.speedKmh > 50 ? '3' : (physics.speedKmh > 25 ? '2' : '1'));
    else if (inputs.forward < 0) gear = 'R';

    carCrashState.updateTelemetry(physics.speedKmh, gear, physics.lastAccelerationG);

    // Particles & Camera
    particles.update(effectiveDelta);
    cameraSystem.update(rawDelta, physics.position, physics.rotation, physics.speedKmh);

    // HUD Update
    hud.update(carCrashState.getState(), activeConfig.name);

    // Render 3D Scene
    renderer.render(scene, camera);
}

requestAnimationFrame(animate);
