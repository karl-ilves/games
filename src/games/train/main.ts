import * as THREE from 'three';
import { enforceDesktopOnly } from '../../shared/mobileControls';
import { trainAudio } from './audio';
import { emitSmokePuff, updateParticles } from './effects/particles';
import {
    checkIsOwner,
    checkOwnerAccess,
    getStationName,
    getT,
    getTrainDesc,
    getTrainName,
    I18N,
    isOwner,
    t,
    updateLocalization
} from './i18n';
import { TRAINS_CATALOG } from './catalog';
import { buildTrainModel, BuiltTrain } from './models/trainBuilder';
import {
    getActiveDepotCategory,
    getActiveTrainDef,
    setActiveDepotCategory,
    setActiveTrainId
} from './state/trainState';
import { updateCamera } from './systems/camera';
import { setupInputControls } from './systems/input';
import {
    checkStationArrival,
    PhysicsState,
    toggleTrackSwitch,
    updateTrainPhysics
} from './systems/physics';
import {
    createMainTrackCurve,
    createMountainTrackCurve,
    getActiveStations,
    TRAIN_STATIONS
} from './tracks/trackData';
import { CameraMode, TrainDef, WeatherMode } from './types';
import { renderDepotModal } from './ui/depotModal';
import {
    applyTrainLocalization,
    setupHUD,
    updateCameraBtnText,
    updateHUD
} from './ui/hud';
import {
    applyWeatherMode,
    applyWorldEnvironment,
    buildRailwayTracks,
    buildTerrainAndScenery,
    buildUndergroundSubwayWorld
} from './world/environment';

// Re-export public API for compatibility
export {
    checkIsOwner,
    I18N,
    isOwner,
    t,
    updateLocalization,
    getStationName,
    getTrainName,
    getTrainDesc,
    getT,
    TRAINS_CATALOG,
    getActiveStations
};
export type { TrainDef };

console.log("3D Train Simulator / Rongimäng Initialized (Modular Architecture).");

// Engine state
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let clock = new THREE.Clock();

let dirLight: THREE.DirectionalLight;
let ambientLight: THREE.AmbientLight;
let hemiLight: THREE.HemisphereLight;

let mainTrackCurve: THREE.CatmullRomCurve3;
let mountainTrackCurve: THREE.CatmullRomCurve3;

let aboveGroundGroup: THREE.Group;
let undergroundSubwayGroup: THREE.Group;
let currentTrainRig: BuiltTrain | null = null;

let activeTrain: TrainDef = getActiveTrainDef();
let cameraMode: CameraMode = 0;
let weatherMode: WeatherMode = 0;

const physicsState: PhysicsState = {
    trainU: 0.04,
    currentThrottle: 0,
    targetThrottle: 0,
    trainSpeed: 0,
    isBraking: false,
    currentStationIndex: 1, // Target is Männimetsa
    isBoarding: false,
    boardingTimer: 0,
    totalPassengers: 24,
    smokeTimer: 0
};

function initEngine() {
    if (!checkOwnerAccess()) return;
    if (enforceDesktopOnly('3D Rongimäng (Rongid & Metrood)', '3D Train Simulator (Trains & Metros)')) {
        return;
    }
    updateLocalization();

    activeTrain = getActiveTrainDef();
    if (activeTrain.category) {
        setActiveDepotCategory(activeTrain.category);
    }
    physicsState.totalPassengers = activeTrain.passengers;

    const container = document.getElementById('canvas-container') || document.getElementById('game-container') || document.body;
    if (!container) return;

    // 1. Scene & Camera Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.0012);

    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 3500);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    container.appendChild(renderer.domElement);

    // 2. Lighting
    setupLighting();

    // 3. Track Splines & Scenery
    mainTrackCurve = createMainTrackCurve();
    mountainTrackCurve = createMountainTrackCurve();

    buildRailwayTracks(scene, mainTrackCurve, mountainTrackCurve);
    aboveGroundGroup = buildTerrainAndScenery(mainTrackCurve);
    scene.add(aboveGroundGroup);

    undergroundSubwayGroup = buildUndergroundSubwayWorld(mainTrackCurve);
    scene.add(undergroundSubwayGroup);

    // 4. Vehicle & Environment
    spawnTrain(activeTrain);
    syncEnvironment();

    // 5. User Input & HUD
    setupInput();
    setupHUD(activeTrain, cameraMode, weatherMode, physicsState.currentStationIndex);
    renderDepotModal(onSelectTrain);

    window.addEventListener('resize', onWindowResize);
    trainAudio.init();

    animate();
}

function setupLighting() {
    ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    hemiLight = new THREE.HemisphereLight(0xffffff, 0x3d7e35, 0.5);
    scene.add(hemiLight);

    dirLight = new THREE.DirectionalLight(0xfff3d6, 1.4);
    dirLight.position.set(250, 450, 200);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 1500;
    dirLight.shadow.camera.left = -450;
    dirLight.shadow.camera.right = 450;
    dirLight.shadow.camera.top = 450;
    dirLight.shadow.camera.bottom = -450;
    scene.add(dirLight);
}

function spawnTrain(def: TrainDef) {
    if (currentTrainRig) {
        scene.remove(currentTrainRig.trainGroup);
    }
    currentTrainRig = buildTrainModel(def);
    scene.add(currentTrainRig.trainGroup);
}

function syncEnvironment() {
    const stations = getActiveStations(activeTrain);
    const targetStation = stations[physicsState.currentStationIndex % stations.length];

    applyWorldEnvironment({
        scene,
        dirLight,
        ambientLight,
        hemiLight,
        trainHeadlight: currentTrainRig?.trainHeadlight,
        aboveGroundGroup,
        undergroundSubwayGroup,
        activeTrain,
        weatherMode,
        targetStation
    });
}

function onSelectTrain(chosenTrain: TrainDef) {
    activeTrain = chosenTrain;
    setActiveTrainId(chosenTrain.id);
    physicsState.totalPassengers = chosenTrain.passengers;

    spawnTrain(activeTrain);
    syncEnvironment();
    updateHUD(physicsState.trainSpeed, physicsState.currentThrottle, physicsState.totalPassengers);
    renderDepotModal(onSelectTrain);
}

function setupInput() {
    const depotModal = document.getElementById('modal-train-depot');

    setupInputControls({
        onThrottleUp: (step = 20) => {
            physicsState.targetThrottle = Math.min(100, physicsState.targetThrottle + step);
            physicsState.isBraking = false;
        },
        onThrottleDown: (step = 20) => {
            physicsState.targetThrottle = Math.max(0, physicsState.targetThrottle - step);
            if (physicsState.targetThrottle === 0) {
                physicsState.isBraking = true;
                trainAudio.playBrakeSqueal();
            }
        },
        onBrake: (braking: boolean) => {
            physicsState.isBraking = braking;
            if (braking) physicsState.targetThrottle = 0;
        },
        onHorn: () => {
            trainAudio.playWhistle();
            if (currentTrainRig) {
                emitSmokePuff(scene, currentTrainRig.locomotiveGroup, activeTrain, true);
            }
        },
        onSwitchTrack: () => toggleTrackSwitch(),
        onToggleCamera: () => {
            cameraMode = ((cameraMode + 1) % 4) as CameraMode;
            updateCameraBtnText(cameraMode);
        },
        onToggleWeather: () => {
            weatherMode = ((weatherMode + 1) % 3) as WeatherMode;
            syncEnvironment();
        },
        onOpenDepot: () => {
            if (depotModal) {
                depotModal.style.display = 'flex';
                renderDepotModal(onSelectTrain);
            }
        },
        onCloseDepot: () => {
            if (depotModal) depotModal.style.display = 'none';
        },
        onStartDriving: () => {
            if (depotModal) depotModal.style.display = 'none';
            physicsState.targetThrottle = 40;
            physicsState.isBraking = false;
        },
        onCategorySwitch: (cat: 'train' | 'metro') => {
            setActiveDepotCategory(cat);
            renderDepotModal(onSelectTrain);
        }
    });

    document.getElementById('btn-next-station-continue')?.addEventListener('click', () => {
        const modal = document.getElementById('modal-station-success');
        if (modal) modal.style.display = 'none';
        physicsState.targetThrottle = 50;
        physicsState.isBraking = false;
    });
}

function animate() {
    const delta = Math.min(clock.getDelta(), 0.1);

    if (currentTrainRig) {
        updateTrainPhysics(
            physicsState,
            activeTrain,
            currentTrainRig,
            mainTrackCurve,
            scene,
            delta
        );
        updateCamera(camera, currentTrainRig.locomotiveGroup, cameraMode);
    }

    updateParticles(scene, delta);
    updateHUD(physicsState.trainSpeed, physicsState.currentThrottle, physicsState.totalPassengers);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initEngine());
} else {
    initEngine();
}
