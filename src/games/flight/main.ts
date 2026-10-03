import * as THREE from 'three';
import { getCurrentUserProfile, canAccessFlight } from '../../auth';
import { yardService } from '../../shared/yardService';
import { AIRCRAFT_CATALOG, AIRPORTS } from './catalog';
import { flightState } from './state/flightState';
import { buildAircraftMesh } from './models/aircraftBuilder';
import { buildFlightWorld } from './world/flightWorld';
import { FlightPhysicsController } from './systems/flightPhysics';
import { FlightCameraSystem } from './systems/camera';
import { FlightInputController } from './systems/input';
import { FlightAudioSystem } from './audio';
import { FlightParticleSystem } from './effects/particles';
import { FlightHUD } from './ui/hud';
import { FlightModalsController } from './ui/hangarModal';
import { AircraftConfig } from './types';

console.log('[FlightSimulator] ✈️ 3D Flight Simulator initializing...');

// 1. Auth & Playard Access Check
const profile = getCurrentUserProfile();
const isTestMode = typeof window !== 'undefined' && (window as any).__PLAYARD_TEST_MODE__;
const _hasAccess = isTestMode || canAccessFlight(profile, profile?.username);

yardService.recordPlayedGame({
    id: 'flight',
    title: '✈️ 3D Flight Simulator',
    description: 'Fly realistic Cessna, Boeing 747, and F-22 Fighter jets. Master landings and aerial stunt rings!',
    url: './games/flight/index.html',
    icon: '✈️',
    badgeText: '✈️ 3D SIMULATOR',
    badgeColor: '#00f2fe'
});

// 2. Three.js Scene, Camera, and WebGL Renderer
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7dd3fc);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 20000);

// 3. Build 3D World Environment
const world = buildFlightWorld(scene);

// 4. Spawn Active Aircraft
let currentConfig = AIRCRAFT_CATALOG.find(c => c.id === flightState.getSelectedAircraftId()) || AIRCRAFT_CATALOG[0];
let currentMeshBundle = buildAircraftMesh(currentConfig);
scene.add(currentMeshBundle.group);

// Spawn position: Runway 09 of Playard Intl Airport
const spawnPos = new THREE.Vector3(-1050, 1.2, 0);
let physics = new FlightPhysicsController(currentMeshBundle, currentConfig, spawnPos);
const cameraSystem = new FlightCameraSystem(camera);
const inputController = new FlightInputController();
const audio = new FlightAudioSystem(flightState.isAudioEnabled());
const particles = new FlightParticleSystem(scene);
const hud = new FlightHUD();

// 5. Modals & UI Wiring
function switchAircraft(newConfig: AircraftConfig): void {
    scene.remove(currentMeshBundle.group);
    currentConfig = newConfig;
    currentMeshBundle = buildAircraftMesh(newConfig);
    scene.add(currentMeshBundle.group);

    const oldPos = physics.position.clone();
    physics = new FlightPhysicsController(currentMeshBundle, currentConfig, oldPos);
    physics.velocity.set(0, 0, 0);

    const afterburnerRow = document.getElementById('afterburner-row');
    if (afterburnerRow) {
        afterburnerRow.style.display = newConfig.hasAfterburner ? 'flex' : 'none';
    }
}

const modals = new FlightModalsController(
    (cfg) => switchAircraft(cfg),
    (weather) => world.setWeather(weather),
    (emergency) => physics.state.emergency = emergency
);

// Top Bar Action Buttons
const btnCam = document.getElementById('btn-cycle-camera');
const camTag = document.getElementById('cam-name-tag');
if (btnCam) {
    btnCam.addEventListener('click', () => {
        const mode = cameraSystem.cycleCamera();
        if (camTag) camTag.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
    });
}

const btnSound = document.getElementById('btn-toggle-sound');
const soundIcon = document.getElementById('sound-icon');
if (btnSound) {
    btnSound.addEventListener('click', () => {
        const next = !flightState.isAudioEnabled();
        flightState.setAudioEnabled(next);
        audio.setEnabled(next);
        if (soundIcon) soundIcon.textContent = next ? '🔊' : '🔇';
    });
}

// 6. Touchdown and In-Flight Event Handling
let wasOnGround = true;
let previousVy = 0;

function handleTouchdown(sinkRateFpm: number, speedKnots: number): void {
    audio.playTouchdownScreech();
    particles.spawnTouchdownSmoke(physics.position);

    const result = flightState.recordLanding(sinkRateFpm);
    modals.showLandingScorecard(sinkRateFpm, speedKnots, result.isButter, result.rewardCash, result.rewardXP);
}

// Window Resize Listener
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 7. Main Game Loop
const clock = new THREE.Clock();

function animate(): void {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);
    const inputs = inputController.getInputs();

    // Hotkey camera cycle
    if (inputs.toggleCam) {
        const mode = cameraSystem.cycleCamera();
        if (camTag) camTag.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
    }

    // Hotkey anti-ice
    if (inputs.toggleAntiIce) {
        physics.state.antiIce = !physics.state.antiIce;
    }

    // Previous vertical speed before physics step
    previousVy = physics.velocity.y;

    // Update Aerodynamics & Physics
    physics.update(delta, inputs);

    // Detect Touchdown Event (airborne -> on runway)
    if (!wasOnGround && physics.state.isOnGround) {
        const touchdownSinkRate = previousVy * 196.85;
        handleTouchdown(touchdownSinkRate, physics.state.airspeed);
    }
    wasOnGround = physics.state.isOnGround;

    // Camera follow update
    cameraSystem.update(delta, physics.position, physics.quaternion, physics.state, currentConfig.category === 'Fighter');

    // Update World & Scenery
    world.updateWorld(delta, physics.position);

    // Check Stunt Ring Collection
    const hitRing = world.checkRingPass(physics.position);
    if (hitRing) {
        audio.playRingChime();
        flightState.recordRingCollected();
    }

    // Particle Emitters
    if (physics.state.afterburner && currentMeshBundle.exhaustAnchors.length > 0) {
        const worldAnchors = currentMeshBundle.exhaustAnchors.map(a => 
            a.clone().applyQuaternion(physics.quaternion).add(physics.position)
        );
        particles.spawnAfterburnerExhaust(worldAnchors);
    }

    if (physics.state.airspeed > 220 && !physics.state.isOnGround) {
        const leftTip = currentMeshBundle.wingtipAnchors.left.clone().applyQuaternion(physics.quaternion).add(physics.position);
        const rightTip = currentMeshBundle.wingtipAnchors.right.clone().applyQuaternion(physics.quaternion).add(physics.position);
        particles.spawnContrails(leftTip, rightTip);
    }

    if (physics.state.emergency === 'engine_fire') {
        particles.spawnEngineFire(physics.position);
    }
    particles.update(delta);

    // Stall Audio Alarm
    audio.playStallAlarm(physics.state.stalled);

    // Audio Engine Hum & Wind
    audio.update(
        physics.state.throttle,
        physics.state.airspeed,
        currentConfig.engineType === 'jet' || currentConfig.engineType === 'rocket',
        physics.state.afterburner
    );

    // Update HUD Instrument Gauges
    const papiStatus = world.getPapiStatus(physics.position);
    const pilotRank = flightState.getPilotRank();
    hud.update(
        physics.state,
        physics.position,
        world.stuntRings,
        papiStatus,
        flightState.getCash(),
        pilotRank.title
    );

    // Render Scene
    renderer.render(scene, camera);
}

// 8. Test Hooks for Automated Testing
(window as any).__flight_game__ = {
    get physics() { return physics; },
    get world() { return world; },
    get cameraSystem() { return cameraSystem; },
    state: flightState,
    switchAircraft,
    AIRCRAFT_CATALOG,
    AIRPORTS
};

animate();
