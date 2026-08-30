import * as THREE from 'three';
import { getCurrentUserProfile, isPlayardOwner, isTestMode } from '../../auth';
import { yardService, YardData } from '../../shared/yardService';
import { trainAudio } from './audio';

console.log("3D Rongimäng (Train Simulator - 10 Trains Depot & In-Game Currency) Initialized.");

// --- Access Gating Check (Playard Owner Only) ---
function checkOwnerAccess(): boolean {
    const prof = getCurrentUserProfile();
    const isOwner = isPlayardOwner(prof?.email);
    const testMode = isTestMode(prof?.email);

    const vipOverlay = document.getElementById('vip-restricted-overlay');
    if (vipOverlay) {
        if (isOwner || testMode) {
            vipOverlay.style.display = 'none';
            return true;
        } else {
            vipOverlay.style.display = 'flex';
            return false;
        }
    }
    return true;
}

// --- In-Game Currency ("Rongiraha" / 🪙 €) ---
const TRAIN_MONEY_KEY = 'playard_train_money';

function getTrainMoney(): number {
    try {
        const raw = localStorage.getItem(TRAIN_MONEY_KEY);
        if (raw !== null) {
            const val = parseInt(raw, 10);
            if (!isNaN(val)) return val;
        }
    } catch (e) {}
    return 0;
}

function saveTrainMoney(val: number) {
    localStorage.setItem(TRAIN_MONEY_KEY, Math.max(0, Math.round(val)).toString());
}

function addTrainMoney(amount: number): number {
    const current = getTrainMoney();
    const updated = current + Math.max(0, Math.round(amount));
    saveTrainMoney(updated);
    updateHUD();
    return updated;
}

function spendTrainMoney(amount: number): boolean {
    const current = getTrainMoney();
    if (current < amount) return false;
    saveTrainMoney(current - amount);
    updateHUD();
    return true;
}

// --- 10 Trains Catalog & Definitions ---
export interface TrainDef {
    id: string;
    name: string;
    icon: string;
    price: number; // 0 for default, 100 for cheapest purchasable (100€ / 100Y), up to 2000
    maxSpeed: number; // km/h
    acceleration: number; // multiplier
    passengers: number;
    description: string;
    special: string;
    style: 'classic_steam' | 'commuter_emu' | 'heavy_diesel' | 'forest_shunter' | 'bullet_shinkansen' | 'royal_orient' | 'alpine_climber' | 'cyber_bullet' | 'armored_dreadnought' | 'hyperloop_plasma';
    locoColor: number;
    trimColor: number;
    coachColor: number;
}

export const TRAINS_CATALOG: TrainDef[] = [
    {
        id: 'classic_steam',
        name: 'Klassikaline Auruvedur',
        icon: '🚂',
        price: 0, // Tasuta / Default
        maxSpeed: 90,
        acceleration: 1.0,
        passengers: 24,
        description: 'Autentne 19. sajandi auruvedur messingist viimistluse ja suitsukorstnaga.',
        special: 'Autentne auruheli & suitsupahvakud',
        style: 'classic_steam',
        locoColor: 0x1c2430,
        trimColor: 0xf59e0b,
        coachColor: 0xb91c1c
    },
    {
        id: 'commuter_emu',
        name: 'Linnalähirong Express',
        icon: '🚆',
        price: 100, // Kõige odavam ostetav rong (100€ või 100Y)
        maxSpeed: 120,
        acceleration: 1.4,
        passengers: 42,
        description: 'Kaasaegne voolujooneline reisirong kiireks linnalähiliikluseks.',
        special: 'Kiire kiirendus & LED esituled',
        style: 'commuter_emu',
        locoColor: 0xdc2626,
        trimColor: 0xffffff,
        coachColor: 0xe2e8f0
    },
    {
        id: 'heavy_diesel',
        name: 'Raske Diisel Kaubavedur',
        icon: '🚜',
        price: 150,
        maxSpeed: 105,
        acceleration: 1.2,
        passengers: 30,
        description: 'Võimas Ameerika stiilis tööstuslik diiselvedur topeltpasunatega.',
        special: 'Suur veojõud ja kaubaveo võimekus',
        style: 'heavy_diesel',
        locoColor: 0xd97706,
        trimColor: 0x111827,
        coachColor: 0x78350f
    },
    {
        id: 'forest_shunter',
        name: 'Metsa Auru-Tankvedur',
        icon: '🌲',
        price: 250,
        maxSpeed: 95,
        acceleration: 1.3,
        passengers: 28,
        description: 'Kompaktne metsaveo tankvedur, spetsialiseerunud kurvilistele radadele.',
        special: 'Suur stabiilsus mägikurvides',
        style: 'forest_shunter',
        locoColor: 0x166534,
        trimColor: 0xfacc15,
        coachColor: 0x14532d
    },
    {
        id: 'bullet_shinkansen',
        name: 'Super-Kiirrong Shinkansen',
        icon: '⚡',
        price: 400,
        maxSpeed: 180,
        acceleration: 1.9,
        passengers: 55,
        description: 'Jaapani tipptehnoloogiline terava aerodünaamilise ninaga kuulirong.',
        special: 'Aerodünaamiline nina & katuse pantograaf',
        style: 'bullet_shinkansen',
        locoColor: 0xf8fafc,
        trimColor: 0x0284c7,
        coachColor: 0x0369a1
    },
    {
        id: 'royal_orient',
        name: 'Kuldne Kuninglik Express',
        icon: '🌌',
        price: 600,
        maxSpeed: 140,
        acceleration: 1.5,
        passengers: 48,
        description: 'Kuninglik luksusrong safiirsinise kere ja puhta kulla ornamentidega.',
        special: 'Luksuslik interjöör & kuldsed laternad',
        style: 'royal_orient',
        locoColor: 0x1e3a8a,
        trimColor: 0xfbbf24,
        coachColor: 0x172554
    },
    {
        id: 'alpine_climber',
        name: 'Alpi Mägironija',
        icon: '🏔️',
        price: 800,
        maxSpeed: 130,
        acceleration: 1.7,
        passengers: 36,
        description: 'Šveitsi mägiraudtee rong panoraamklaasist vaatevagunitega.',
        special: 'Panoraamvaade & mäeronimise võimekus',
        style: 'alpine_climber',
        locoColor: 0x991b1b,
        trimColor: 0xe2e8f0,
        coachColor: 0x38bdf8
    },
    {
        id: 'cyber_bullet',
        name: 'Cyber-Kiirrong 2099',
        icon: '⚡',
        price: 1000,
        maxSpeed: 220,
        acceleration: 2.3,
        passengers: 60,
        description: 'Tulevikulinna mattmust küberrong neoonsinise põhjavalgustusega.',
        special: 'Neoonvalgustus & küberkiirus',
        style: 'cyber_bullet',
        locoColor: 0x09090b,
        trimColor: 0x00f2fe,
        coachColor: 0x18181b
    },
    {
        id: 'armored_dreadnought',
        name: 'Soomustatud Lahinguvedur',
        icon: '🌋',
        price: 1500,
        maxSpeed: 115,
        acceleration: 1.2,
        passengers: 50,
        description: 'Raskete terasplaatide, kaitserauast sahkade ja topeltkorstnatega kindlus.',
        special: 'Raske soomus & võimas prožektor',
        style: 'armored_dreadnought',
        locoColor: 0x3f3f46,
        trimColor: 0xb91c1c,
        coachColor: 0x27272a
    },
    {
        id: 'hyperloop_plasma',
        name: 'Hyperloop Plasma Rong 3000',
        icon: '🚀',
        price: 2000,
        maxSpeed: 260,
        acceleration: 2.9,
        passengers: 80,
        description: 'Eksperimentaalne plasma-mootoriga monorail rong ulmelise kiirusega.',
        special: 'Lillakas plasmajoa efekt & tippkiirus 260 km/h',
        style: 'hyperloop_plasma',
        locoColor: 0x581c87,
        trimColor: 0xd946ef,
        coachColor: 0x3b0764
    }
];

// --- Unlocked Trains Storage & Active Train ---
const UNLOCKED_TRAINS_KEY = 'playard_unlocked_trains';
const ACTIVE_TRAIN_KEY = 'playard_active_train';

function getUnlockedTrainIds(): string[] {
    try {
        const raw = localStorage.getItem(UNLOCKED_TRAINS_KEY);
        if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list) && list.includes('classic_steam')) return list;
        }
    } catch (e) {}
    return ['classic_steam'];
}

function saveUnlockedTrainIds(list: string[]) {
    localStorage.setItem(UNLOCKED_TRAINS_KEY, JSON.stringify(list));
}

function getActiveTrainDef(): TrainDef {
    const activeId = localStorage.getItem(ACTIVE_TRAIN_KEY) || 'classic_steam';
    return TRAINS_CATALOG.find(t => t.id === activeId) || TRAINS_CATALOG[0];
}

function setActiveTrainId(id: string) {
    localStorage.setItem(ACTIVE_TRAIN_KEY, id);
}

// --- Stations Definition ---
interface Station {
    id: string;
    name: string;
    description: string;
    trackU: number; // position on track [0..1]
    worldPos: THREE.Vector3;
    passengersWaiting: number;
    moneyReward: number; // Rongiraha
    yardReward: number;  // Yardid
}

const STATIONS: Station[] = [
    {
        id: 'central',
        name: 'Kesklinna Peajaam',
        description: 'Suur reisijate peajaam kellatorni ja reisijate perrooniga',
        trackU: 0.04,
        worldPos: new THREE.Vector3(0, 0, 0),
        passengersWaiting: 28,
        moneyReward: 50,
        yardReward: 50
    },
    {
        id: 'forest',
        name: 'Männimetsa Peatus',
        description: 'Metsa vahel asuv puidust reisijate ooteplatvorm',
        trackU: 0.35,
        worldPos: new THREE.Vector3(0, 0, 0),
        passengersWaiting: 20,
        moneyReward: 50,
        yardReward: 50
    },
    {
        id: 'harbor',
        name: 'Jõekalda Sadam',
        description: 'Sadamadepoo jõe ääres kaubakraanade ja konteineritega',
        trackU: 0.62,
        worldPos: new THREE.Vector3(0, 0, 0),
        passengersWaiting: 25,
        moneyReward: 50,
        yardReward: 50
    },
    {
        id: 'mountain',
        name: 'Mäejaam / Lumetipp',
        description: 'Mägine jaam vaatega orule ja avarale maastikule',
        trackU: 0.85,
        worldPos: new THREE.Vector3(0, 0, 0),
        passengersWaiting: 35,
        moneyReward: 50,
        yardReward: 50
    }
];

// --- Track Switch Junctions ---
interface Junction {
    id: string;
    switchU: number;
    description: string;
    activeBranch: 'main' | 'mountain';
}

const JUNCTION: Junction = {
    id: 'junc_1',
    switchU: 0.76,
    description: 'Põhiliin vs Mäering',
    activeBranch: 'main'
};

// --- Game State ---
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;

// Train motion state
let activeTrain: TrainDef = getActiveTrainDef();
let trainU = 0.04; // 0..1 along track spline
let trainSpeed = 0; // km/h
let targetThrottle = 0; // 0..100%
let currentThrottle = 0;
let isBraking = false;
let totalPassengers = activeTrain.passengers;
let currentStationIndex = 1; // start heading to station 1 (Männimetsa)
let isBoarding = false;
let boardingTimer = 0;
let cameraMode = 0; // 0: 3rd person chase, 1: cab interior, 2: cinematic flyby, 3: top-down map
let weatherMode = 0; // 0: day, 1: sunset, 2: night

// 3D Objects & Hierarchy
let mainTrackCurve: THREE.CatmullRomCurve3;
let mountainTrackCurve: THREE.CatmullRomCurve3;
let trainGroup: THREE.Group;
let locomotiveGroup: THREE.Group;
let tenderGroup: THREE.Group;
let carriage1Group: THREE.Group;
let carriage2Group: THREE.Group;
let cargoGroup: THREE.Group;
let wheels: THREE.Mesh[] = [];
let connectingRods: THREE.Mesh[] = [];
let trainHeadlight: THREE.SpotLight;
let trainHeadlightMesh: THREE.Mesh;
let smokeParticles: Array<{ mesh: THREE.Mesh; life: number; maxLife: number; vel: THREE.Vector3 }> = [];

// Environment Lights & Sky
let dirLight: THREE.DirectionalLight;
let hemiLight: THREE.HemisphereLight;
let ambientLight: THREE.AmbientLight;

// --- Initialize Scene & Canvas ---
function initEngine() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.0008);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 5000);
    camera.position.set(0, 15, 35);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    container.appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize);

    // Setup Lighting for 2x expansive landscape
    ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    hemiLight = new THREE.HemisphereLight(0xddeeff, 0x334433, 0.45);
    scene.add(hemiLight);

    dirLight = new THREE.DirectionalLight(0xfffaed, 1.35);
    dirLight.position.set(300, 500, 300);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 1800;
    dirLight.shadow.camera.left = -900;
    dirLight.shadow.camera.right = 900;
    dirLight.shadow.camera.top = 900;
    dirLight.shadow.camera.bottom = -900;
    scene.add(dirLight);

    buildRailwayTracks();
    buildTerrainAndScenery();
    buildStations();
    
    // Build initial train matching active train definition
    rebuildTrainModel(activeTrain);

    setupControls();
    setupHUD();
    renderDepotModal();

    // Check access
    checkOwnerAccess();

    // Yard currency subscription
    yardService.subscribe(updateYardBalance);

    // Render loop
    let lastTime = performance.now();
    function animate(currentTime: number) {
        requestAnimationFrame(animate);
        const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
        lastTime = currentTime;

        updateTrainPhysics(delta);
        updateParticles(delta);
        updateCamera();
        updateHUD();

        renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Train Depot & Store Modal Rendering (Rongiraha + Yardid) ---
function renderDepotModal() {
    const gridContainer = document.getElementById('trains-grid-container');
    const depotYardVal = document.getElementById('depot-yard-val');
    const depotMoneyVal = document.getElementById('depot-money-val');
    if (!gridContainer) return;

    const unlockedIds = getUnlockedTrainIds();
    const currentActiveId = activeTrain.id;
    const currentYards = yardService.getYards();
    const currentMoney = getTrainMoney();

    if (depotYardVal) depotYardVal.innerText = currentYards.toLocaleString();
    if (depotMoneyVal) depotMoneyVal.innerText = currentMoney.toLocaleString();

    gridContainer.innerHTML = '';

    TRAINS_CATALOG.forEach(train => {
        const isUnlocked = unlockedIds.includes(train.id);
        const isActive = train.id === currentActiveId;
        const yardPrice = train.price * 5; // Yardid maksavad 5 korda rohkem kui mänguraha

        const card = document.createElement('div');
        card.className = `train-card ${isActive ? 'active-train' : (!isUnlocked ? 'locked-train' : '')}`;

        let priceBadgeHtml = '';
        if (train.price === 0) {
            priceBadgeHtml = `<span class="train-price-badge badge-free">TASUTA</span>`;
        } else {
            priceBadgeHtml = `<span class="train-price-badge badge-price">🪙 ${train.price} €  või  💎 ${yardPrice} Y</span>`;
        }

        let actionBtnHtml = '';
        if (isActive) {
            actionBtnHtml = `<button class="btn-train-select btn-selected" disabled>✅ VALITUD</button>`;
        } else if (isUnlocked) {
            actionBtnHtml = `<button class="btn-train-select btn-choose" data-train-id="${train.id}">▶️ VALI RONG</button>`;
        } else {
            actionBtnHtml = `
                <div style="display: flex; flex-direction: column; width: 100%; gap: 6px; margin-top: 8px;">
                    <button class="btn-train-select btn-buy-money" data-train-id="${train.id}" data-price="${train.price}">🪙 OSTA (${train.price} €)</button>
                    <button class="btn-train-select btn-buy-yard" data-train-id="${train.id}" data-price="${yardPrice}">💎 OSTA (${yardPrice} Y)</button>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="train-icon">${train.icon}</div>
            <div class="train-title">${train.name}</div>
            ${priceBadgeHtml}
            <div style="width: 100%; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px; margin-bottom: 8px;">
                <div class="train-stat-row">
                    <span>Tippkiirus:</span>
                    <strong>${train.maxSpeed} km/h</strong>
                </div>
                <div class="train-stat-row">
                    <span>Kiirendus:</span>
                    <strong>${train.acceleration}x</strong>
                </div>
                <div class="train-stat-row">
                    <span>Mahutavus:</span>
                    <strong>${train.passengers} reisijat</strong>
                </div>
            </div>
            <div style="font-size: 0.72rem; color: #64748b; line-height: 1.3; min-height: 28px; margin-bottom: 4px;">
                ${train.description}
            </div>
            ${actionBtnHtml}
        `;

        gridContainer.appendChild(card);
    });

    // Attach Click Handlers for Choose
    gridContainer.querySelectorAll('.btn-choose').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLButtonElement;
            const trainId = target.dataset.trainId;
            if (!trainId) return;
            selectTrain(trainId);
        });
    });

    // Attach Click Handlers for Buying with Rongiraha (🪙 €)
    gridContainer.querySelectorAll('.btn-buy-money').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLButtonElement;
            const trainId = target.dataset.trainId;
            const price = parseInt(target.dataset.price || '0', 10);
            if (!trainId) return;
            buyTrainWithMoney(trainId, price);
        });
    });

    // Attach Click Handlers for Buying with Playard Yards (💎 Y - 5x hind)
    gridContainer.querySelectorAll('.btn-buy-yard').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLButtonElement;
            const trainId = target.dataset.trainId;
            const yardPrice = parseInt(target.dataset.price || '0', 10);
            if (!trainId) return;
            buyTrainWithYards(trainId, yardPrice);
        });
    });
}

function showDepotMessage(text: string, isError: boolean = false) {
    const msgEl = document.getElementById('depot-msg');
    if (!msgEl) return;
    msgEl.innerText = text;
    msgEl.style.display = 'block';
    msgEl.style.background = isError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(46, 204, 113, 0.2)';
    msgEl.style.border = isError ? '1px solid #ef4444' : '1px solid #2ecc71';
    msgEl.style.color = isError ? '#f87171' : '#4ade80';

    setTimeout(() => {
        if (msgEl) msgEl.style.display = 'none';
    }, 4000);
}

function buyTrainWithMoney(trainId: string, price: number) {
    const train = TRAINS_CATALOG.find(t => t.id === trainId);
    if (!train) return;

    const success = spendTrainMoney(price);
    if (!success) {
        showDepotMessage(`Sul pole piisavalt Rongiraha! Vajad ${price} € (sul on ${getTrainMoney()} €). Teeni jaamapeatustega +50 €!`, true);
        return;
    }

    const unlocked = getUnlockedTrainIds();
    if (!unlocked.includes(trainId)) {
        unlocked.push(trainId);
        saveUnlockedTrainIds(unlocked);
    }

    trainAudio.playCoinReward();
    showDepotMessage(`🎉 Ostsid edukalt rongi "${train.name}" Rongiraha eest (${price} €)!`, false);
    selectTrain(trainId);
}

function buyTrainWithYards(trainId: string, yardPrice: number) {
    const train = TRAINS_CATALOG.find(t => t.id === trainId);
    if (!train) return;

    const success = yardService.spendYards(yardPrice, train.id, `Rongimäng: Osteti ${train.name}`);
    if (!success) {
        showDepotMessage(`Sul pole piisavalt Yarde! Vajad ${yardPrice} Y (praegu ${yardService.getYards()} Y).`, true);
        return;
    }

    const unlocked = getUnlockedTrainIds();
    if (!unlocked.includes(trainId)) {
        unlocked.push(trainId);
        saveUnlockedTrainIds(unlocked);
    }

    trainAudio.playCoinReward();
    showDepotMessage(`🎉 Ostsid edukalt rongi "${train.name}" Playard Yardide eest (${yardPrice} Y)!`, false);
    selectTrain(trainId);
}

function selectTrain(trainId: string) {
    const train = TRAINS_CATALOG.find(t => t.id === trainId);
    if (!train) return;

    activeTrain = train;
    setActiveTrainId(trainId);
    totalPassengers = train.passengers;

    // Rebuild 3D model
    rebuildTrainModel(activeTrain);

    // Update HUD
    updateHUD();
    renderDepotModal();
}

// --- Build Railway Track Splines & 3D Rails (2x Suurem ja 100% Maa Peal) ---
function buildRailwayTracks() {
    // Kõik punktid rangelt maa tasapinnal (y = 0)
    const mainPoints = [
        new THREE.Vector3(0, 0, 0),          // Kesklinna Peajaam
        new THREE.Vector3(260, 0, 80),
        new THREE.Vector3(560, 0, 260),
        new THREE.Vector3(720, 0, 560),      // Idakaare lai kurv
        new THREE.Vector3(620, 0, 880),      // Männimetsa Peatus
        new THREE.Vector3(380, 0, 1060),     // Jõeületus
        new THREE.Vector3(0, 0, 980),
        new THREE.Vector3(-380, 0, 1020),    // Jõekalda Sadam
        new THREE.Vector3(-680, 0, 800),     // Läänekaare oruring
        new THREE.Vector3(-760, 0, 420),     // Pööre mäeringile
        new THREE.Vector3(-600, 0, 80),      // Mäejaam / Lumetipp
        new THREE.Vector3(-300, 0, -80),     // Põhjasuund tagasi peajaama
    ];

    mainTrackCurve = new THREE.CatmullRomCurve3(mainPoints, true, 'centripetal', 0.2);

    const mountainPoints = [
        new THREE.Vector3(-760, 0, 420),
        new THREE.Vector3(-880, 0, 300),
        new THREE.Vector3(-820, 0, -40),
        new THREE.Vector3(-550, 0, -120),
        new THREE.Vector3(-300, 0, -80),
    ];
    mountainTrackCurve = new THREE.CatmullRomCurve3(mountainPoints, false, 'centripetal', 0.2);

    renderTrackMesh(mainTrackCurve, 1200);
    renderTrackMesh(mountainTrackCurve, 300);
}

function renderTrackMesh(curve: THREE.CatmullRomCurve3, samples: number) {
    const railGauge = 2.4;
    const sleeperSpacing = 3.0;
    const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.9 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x8c97a8, metalness: 0.85, roughness: 0.3 });
    const ballastMat = new THREE.MeshStandardMaterial({ color: 0x4f4a43, roughness: 0.95 });

    const totalLength = curve.getLength();
    const numSleepers = Math.floor(totalLength / sleeperSpacing);

    const sleeperGeo = new THREE.BoxGeometry(3.6, 0.25, 0.7);
    const sleeperInstanced = new THREE.InstancedMesh(sleeperGeo, sleeperMat, numSleepers);
    sleeperInstanced.castShadow = true;
    sleeperInstanced.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < numSleepers; i++) {
        const u = (i / numSleepers);
        const pos = curve.getPointAt(u);
        const tangent = curve.getTangentAt(u).normalize();
        dummy.position.copy(pos);
        dummy.position.y += 0.1;
        dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        dummy.updateMatrix();
        sleeperInstanced.setMatrixAt(i, dummy.matrix);
    }
    sleeperInstanced.instanceMatrix.needsUpdate = true;
    scene.add(sleeperInstanced);

    [-railGauge / 2, railGauge / 2].forEach(offset => {
        const railPoints: THREE.Vector3[] = [];
        for (let i = 0; i <= samples; i++) {
            const u = i / samples;
            const p = curve.getPointAt(u);
            const tangent = curve.getTangentAt(u).normalize();
            const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
            const railPoint = p.clone().add(normal.clone().multiplyScalar(offset));
            railPoint.y += 0.35;
            railPoints.push(railPoint);
        }
        const railCurve = new THREE.CatmullRomCurve3(railPoints, curve.closed);
        const railGeo = new THREE.TubeGeometry(railCurve, samples, 0.12, 6, curve.closed);
        const railMesh = new THREE.Mesh(railGeo, railMat);
        railMesh.castShadow = true;
        railMesh.receiveShadow = true;
        scene.add(railMesh);
    });

    const ballastGeo = new THREE.TubeGeometry(curve, samples, 2.3, 5, curve.closed);
    const ballastMesh = new THREE.Mesh(ballastGeo, ballastMat);
    ballastMesh.scale.set(1, 0.25, 1);
    ballastMesh.receiveShadow = true;
    scene.add(ballastMesh);
}

// --- Build Scenic Terrain, River & Pine Forest (100% Maa Peal) ---
function buildTerrainAndScenery() {
    // 2x Suurem maastik (3600 x 3600), tasapinnaline maapind y = -0.1
    const groundGeo = new THREE.PlaneGeometry(3600, 3600, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x3d7e35,
        roughness: 0.9,
        flatShading: true
    });

    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.1;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // River maa tasapinnal
    const riverGeo = new THREE.PlaneGeometry(160, 2600);
    const riverMat = new THREE.MeshStandardMaterial({
        color: 0x1d70b8,
        roughness: 0.1,
        metalness: 0.6,
        transparent: true,
        opacity: 0.85
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.rotation.z = Math.PI / 12;
    river.position.set(200, -0.05, 1000);
    river.receiveShadow = true;
    scene.add(river);

    // Tasapinnalised piirded jõeületuse kohas (maa tasandil)
    const bridgeGroup = new THREE.Group();
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x9b2226, metalness: 0.7, roughness: 0.4 });
    const trussL = new THREE.Mesh(new THREE.BoxGeometry(180, 1.2, 0.3), trussMat);
    trussL.position.set(380, 0.6, 1063.5);
    const trussR = new THREE.Mesh(new THREE.BoxGeometry(180, 1.2, 0.3), trussMat);
    trussR.position.set(380, 0.6, 1056.5);
    bridgeGroup.add(trussL, trussR);
    scene.add(bridgeGroup);

    buildPineForest();
}

function buildPineForest() {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x543d2b, roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1e4620, roughness: 0.8, flatShading: true });
    const birchFoliageMat = new THREE.MeshStandardMaterial({ color: 0x38b000, roughness: 0.8, flatShading: true });

    const numTrees = 450;
    const treeGroup = new THREE.Group();

    for (let i = 0; i < numTrees; i++) {
        const isBirch = Math.random() > 0.65;
        const tree = new THREE.Group();

        let x = (Math.random() - 0.5) * 2800;
        let z = (Math.random() - 0.5) * 2800;
        
        // Hoia rööbaste vahetust lähedusest puud eemal
        if (Math.abs(x) < 70 && Math.abs(z) < 70) x += 150;

        const scale = 0.8 + Math.random() * 0.9;
        tree.scale.set(scale, scale, scale);
        tree.position.set(x, 0, z);

        const trunkHeight = isBirch ? 6 : 4;
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, trunkHeight, 6);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        tree.add(trunk);

        if (!isBirch) {
            for (let c = 0; c < 3; c++) {
                const cone = new THREE.Mesh(new THREE.ConeGeometry(2.8 - c * 0.6, 3.5, 6), foliageMat);
                cone.position.y = 3 + c * 2.2;
                cone.castShadow = true;
                tree.add(cone);
            }
        } else {
            const sphere = new THREE.Mesh(new THREE.DodecahedronGeometry(3), birchFoliageMat);
            sphere.position.y = trunkHeight + 2;
            sphere.castShadow = true;
            tree.add(sphere);
        }

        treeGroup.add(tree);
    }
    scene.add(treeGroup);
}

// --- Build 4 Detailed Stations ---
function buildStations() {
    STATIONS.forEach(st => {
        st.worldPos = mainTrackCurve.getPointAt(st.trackU);
        const tangent = mainTrackCurve.getTangentAt(st.trackU).normalize();

        const stationGroup = new THREE.Group();
        stationGroup.position.copy(st.worldPos);
        stationGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

        const platformMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
        const platform = new THREE.Mesh(new THREE.BoxGeometry(8, 0.8, 45), platformMat);
        platform.position.set(5.5, 0.4, 0);
        platform.receiveShadow = true;
        platform.castShadow = true;
        stationGroup.add(platform);

        const lineMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 45), lineMat);
        line.position.set(2.2, 0.81, 0);
        stationGroup.add(line);

        const signPostMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
        const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4), signPostMat);
        post1.position.set(6, 2, -10);
        const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4), signPostMat);
        post2.position.set(6, 2, 10);
        stationGroup.add(post1, post2);

        const roofMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.3, roughness: 0.4 });
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(7, 0.4, 25), roofMat);
        canopy.position.set(6, 4.5, 0);
        canopy.castShadow = true;
        stationGroup.add(canopy);

        const lamp = new THREE.PointLight(0xfff3bf, 1.2, 25);
        lamp.position.set(6, 4, 0);
        stationGroup.add(lamp);

        const passengerMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.7 });
        for (let p = 0; p < 6; p++) {
            const person = new THREE.Group();
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 1.4, 6), passengerMat);
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), new THREE.MeshStandardMaterial({ color: 0xffedd5 }));
            head.position.y = 0.95;
            person.add(body, head);
            person.position.set(5 + (Math.random() - 0.5) * 3, 1.5, (p - 2.5) * 5 + (Math.random() - 0.5) * 2);
            stationGroup.add(person);
        }

        scene.add(stationGroup);
    });
}

// --- Dynamic 3D Train Builder for 10 Train Types ---
function rebuildTrainModel(trainDef: TrainDef) {
    if (trainGroup) {
        scene.remove(trainGroup);
    }
    wheels = [];
    connectingRods = [];

    trainGroup = new THREE.Group();

    // 1. Locomotive Engine
    locomotiveGroup = buildLocomotiveEngine(trainDef);
    trainGroup.add(locomotiveGroup);

    // 2. Tender / Power Car
    tenderGroup = buildTenderOrPowerUnit(trainDef);
    trainGroup.add(tenderGroup);

    // 3. Passenger Carriage 1
    carriage1Group = buildPassengerCarriage(trainDef, 1);
    trainGroup.add(carriage1Group);

    // 4. Passenger Carriage 2
    carriage2Group = buildPassengerCarriage(trainDef, 2);
    trainGroup.add(carriage2Group);

    // 5. Cargo / Rear Unit
    cargoGroup = buildRearOrCargoWagon(trainDef);
    trainGroup.add(cargoGroup);

    scene.add(trainGroup);
}

function buildLocomotiveEngine(def: TrainDef): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: def.locoColor, metalness: 0.6, roughness: 0.35 });
    const trimMat = new THREE.MeshStandardMaterial({ color: def.trimColor, metalness: 0.8, roughness: 0.2 });
    const windowMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.8, roughness: 0.1 });

    if (def.style === 'bullet_shinkansen' || def.style === 'cyber_bullet' || def.style === 'hyperloop_plasma') {
        // Futuristic Streamlined Bullet Train Nose
        const noseGeo = new THREE.ConeGeometry(1.6, 6.0, 16);
        const nose = new THREE.Mesh(noseGeo, bodyMat);
        nose.rotation.x = Math.PI / 2;
        nose.position.set(0, 2.0, 4.0);
        nose.scale.set(1.0, 1.0, 0.75);
        group.add(nose);

        const cabBody = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.6, 7.0), bodyMat);
        cabBody.position.set(0, 2.0, -1.0);
        cabBody.castShadow = true;
        group.add(cabBody);

        // Cyber Glow Trim Strip
        const stripMat = new THREE.MeshBasicMaterial({ color: def.trimColor });
        const stripL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 8.5), stripMat);
        stripL.position.set(-1.52, 1.5, 0.5);
        const stripR = stripL.clone();
        stripR.position.set(1.52, 1.5, 0.5);
        group.add(stripL, stripR);

        // Windshield Glass
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.8 });
        const glass = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.8), glassMat);
        glass.position.set(0, 2.8, 3.2);
        glass.rotation.x = -Math.PI / 8;
        group.add(glass);

    } else if (def.style === 'commuter_emu' || def.style === 'alpine_climber') {
        // Modern Commuter / Mountain Railcar
        const cab = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.0, 7.5), bodyMat);
        cab.position.set(0, 2.3, 0);
        cab.castShadow = true;
        group.add(cab);

        const frontNose = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 3.0, 12, 1, false, 0, Math.PI), trimMat);
        frontNose.rotation.z = Math.PI / 2;
        frontNose.position.set(0, 2.3, 3.75);
        group.add(frontNose);

        const winFront = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), windowMat);
        winFront.position.set(0, 2.8, 3.8);
        group.add(winFront);

    } else if (def.style === 'heavy_diesel') {
        // Heavy American Boxy Industrial Diesel
        const hood = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.5, 6.0), bodyMat);
        hood.position.set(0, 2.2, 1.0);
        hood.castShadow = true;

        const cab = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.4, 2.8), bodyMat);
        cab.position.set(0, 2.6, -3.0);
        cab.castShadow = true;
        group.add(hood, cab);

        const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 1.0, 8), trimMat);
        horn.rotation.x = Math.PI / 2;
        horn.position.set(0.6, 4.4, -2.5);
        group.add(horn);

    } else {
        // Classic Steam / Royal Orient / Armored Dreadnought Boiler
        const boilerGeo = new THREE.CylinderGeometry(1.3, 1.3, 6.5, 16);
        const boiler = new THREE.Mesh(boilerGeo, bodyMat);
        boiler.rotation.x = Math.PI / 2;
        boiler.position.set(0, 2.4, 0.5);
        boiler.castShadow = true;
        group.add(boiler);

        [-1.5, 0.5, 2.5].forEach(z => {
            const band = new THREE.Mesh(new THREE.TorusGeometry(1.33, 0.06, 8, 24), trimMat);
            band.position.set(0, 2.4, z);
            group.add(band);
        });

        const cap = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), trimMat);
        cap.rotation.x = -Math.PI / 2;
        cap.position.set(0, 2.4, 3.75);
        group.add(cap);

        const smokestack = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 1.6, 12), bodyMat);
        smokestack.position.set(0, 4.3, 2.8);
        smokestack.castShadow = true;
        group.add(smokestack);

        const cab = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.2, 3.2), bodyMat);
        cab.position.set(0, 3.0, -3.0);
        cab.castShadow = true;
        group.add(cab);
    }

    // Headlight & Spotlight Beam
    const lampHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.4, 0.8, 12), trimMat);
    lampHousing.rotation.x = Math.PI / 2;
    lampHousing.position.set(0, 2.8, 4.6);
    trainHeadlightMesh = new THREE.Mesh(new THREE.CircleGeometry(0.45, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    trainHeadlightMesh.position.set(0, 2.8, 5.01);

    trainHeadlight = new THREE.SpotLight(0xfffaed, 6, 90, Math.PI / 6, 0.4, 1.2);
    trainHeadlight.position.set(0, 2.8, 5.0);
    trainHeadlight.target.position.set(0, 0, 35);
    group.add(lampHousing, trainHeadlightMesh, trainHeadlight, trainHeadlight.target);

    // 6 Drive Wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.3 });
    const wheelGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.3, 16);
    [-2.2, 0.2, 2.4].forEach(z => {
        [-1.3, 1.3].forEach(x => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(x, 0.9, z);
            wheel.castShadow = true;
            group.add(wheel);
            wheels.push(wheel);
        });
    });

    // Connecting Rods
    const rodMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.95 });
    const rodL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 4.8), rodMat);
    rodL.position.set(-1.55, 0.9, 0.1);
    const rodR = rodL.clone();
    rodR.position.set(1.55, 0.9, 0.1);
    group.add(rodL, rodR);
    connectingRods.push(rodL, rodR);

    return group;
}

function buildTenderOrPowerUnit(def: TrainDef): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: def.locoColor, metalness: 0.7, roughness: 0.4 });
    const trimMat = new THREE.MeshStandardMaterial({ color: def.trimColor, roughness: 0.5 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.2, 4.5), bodyMat);
    body.position.y = 2.0;
    body.castShadow = true;
    group.add(body);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.3, 4.6), trimMat);
    roof.position.y = 3.2;
    group.add(roof);

    [-1.3, 1.3].forEach(z => {
        [-1.3, 1.3].forEach(x => {
            const w = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.3, 12), bodyMat);
            w.rotation.z = Math.PI / 2;
            w.position.set(x, 0.7, z);
            group.add(w);
            wheels.push(w);
        });
    });

    return group;
}

function buildPassengerCarriage(def: TrainDef, idx: number): THREE.Group {
    const group = new THREE.Group();
    const coachMat = new THREE.MeshStandardMaterial({ color: def.coachColor, metalness: 0.4, roughness: 0.4 });
    const roofMat = new THREE.MeshStandardMaterial({ color: def.trimColor, roughness: 0.3 });
    const winMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.7 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.8, 7.5), coachMat);
    body.position.y = 2.4;
    body.castShadow = true;
    group.add(body);

    const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 7.6, 16, 1, false, 0, Math.PI), roofMat);
    roof.rotation.z = Math.PI / 2;
    roof.position.set(0, 3.8, 0);
    group.add(roof);

    for (let z = -2.6; z <= 2.6; z += 1.3) {
        [-1.42, 1.42].forEach(x => {
            const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.9), winMat);
            win.position.set(x, 2.7, z);
            win.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
            group.add(win);
        });
    }

    [-2.4, -1.2, 1.2, 2.4].forEach(z => {
        [-1.3, 1.3].forEach(x => {
            const w = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.25, 12), coachMat);
            w.rotation.z = Math.PI / 2;
            w.position.set(x, 0.7, z);
            group.add(w);
            wheels.push(w);
        });
    });

    return group;
}

function buildRearOrCargoWagon(def: TrainDef): THREE.Group {
    const group = new THREE.Group();
    const flatbedMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const logMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });

    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 6.5), flatbedMat);
    bed.position.y = 1.4;
    group.add(bed);

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3 - row; col++) {
            const log = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 6.0, 8), logMat);
            log.rotation.x = Math.PI / 2;
            log.position.set((col - (2 - row) / 2) * 0.85, 2.1 + row * 0.75, 0);
            log.castShadow = true;
            group.add(log);
        }
    }

    [-2.0, 2.0].forEach(z => {
        [-1.3, 1.3].forEach(x => {
            const w = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.25, 12), flatbedMat);
            w.rotation.z = Math.PI / 2;
            w.position.set(x, 0.7, z);
            group.add(w);
            wheels.push(w);
        });
    });

    return group;
}

// --- Steam / Smoke Particle Emitter ---
function emitSmokePuff(isHornBurst: boolean = false) {
    if (!locomotiveGroup) return;

    const isPlasma = activeTrain.style === 'hyperloop_plasma' || activeTrain.style === 'cyber_bullet';
    const smokeGeo = new THREE.DodecahedronGeometry(isHornBurst ? 0.9 : 0.5);
    const smokeMat = new THREE.MeshStandardMaterial({
        color: isPlasma ? 0xd946ef : 0xeeeeee,
        emissive: isPlasma ? 0xd946ef : 0x000000,
        emissiveIntensity: isPlasma ? 0.8 : 0.0,
        transparent: true,
        opacity: isHornBurst ? 0.85 : 0.6,
        roughness: 1.0,
        flatShading: true
    });

    const mesh = new THREE.Mesh(smokeGeo, smokeMat);
    const stackWorld = new THREE.Vector3(0, 4.8, 2.8);
    locomotiveGroup.localToWorld(stackWorld);
    mesh.position.copy(stackWorld);

    const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        2.5 + Math.random() * 2.0 + (isHornBurst ? 3.0 : 0),
        (Math.random() - 0.5) * 1.5
    );

    smokeParticles.push({
        mesh,
        life: 0,
        maxLife: isHornBurst ? 2.5 : 1.8,
        vel
    });
    scene.add(mesh);
}

function updateParticles(delta: number) {
    for (let i = smokeParticles.length - 1; i >= 0; i--) {
        const p = smokeParticles[i];
        p.life += delta;
        p.mesh.position.addScaledVector(p.vel, delta);
        const scale = 1.0 + (p.life / p.maxLife) * 3.5;
        p.mesh.scale.set(scale, scale, scale);
        (p.mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - p.life / p.maxLife);

        if (p.life >= p.maxLife) {
            scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            smokeParticles.splice(i, 1);
        }
    }
}

// --- Train Physics & Track Following ---
let smokeTimer = 0;

function updateTrainPhysics(delta: number) {
    const accelRate = (activeTrain.acceleration || 1.0) * 2.0;
    const maxSpd = activeTrain.maxSpeed || 120;

    if (isBraking) {
        currentThrottle = THREE.MathUtils.lerp(currentThrottle, 0, delta * 3.5);
        trainSpeed = THREE.MathUtils.lerp(trainSpeed, 0, delta * 2.8);
    } else {
        currentThrottle = THREE.MathUtils.lerp(currentThrottle, targetThrottle, delta * accelRate);
        const targetSpeed = (currentThrottle / 100) * maxSpd;
        trainSpeed = THREE.MathUtils.lerp(trainSpeed, targetSpeed, delta * 0.8);
    }

    if (Math.abs(trainSpeed) < 0.05) trainSpeed = 0;

    const speedRatio = trainSpeed / maxSpd;
    const trackLength = mainTrackCurve.getLength();
    const meterPerSec = (trainSpeed * 1000) / 3600;
    const deltaU = (meterPerSec * delta) / trackLength;

    trainU = (trainU + deltaU) % 1.0;
    if (trainU < 0) trainU += 1.0;

    trainAudio.updateChugSpeed(speedRatio);

    smokeTimer += delta;
    const puffInterval = Math.max(0.12, 0.6 - Math.abs(speedRatio) * 0.45);
    if (smokeTimer >= puffInterval && Math.abs(trainSpeed) > 1) {
        smokeTimer = 0;
        emitSmokePuff(false);
    }

    positionTrainUnits();

    const wheelRotDelta = (meterPerSec * delta) / 0.9;
    wheels.forEach(w => w.rotation.x += wheelRotDelta);
    connectingRods.forEach((r) => {
        r.position.y = 0.9 + Math.sin(wheels[0]?.rotation.x || 0) * 0.35;
        r.position.z = 0.1 + Math.cos(wheels[0]?.rotation.x || 0) * 0.35;
    });

    checkStationArrival(delta);
    checkJunctionProximity();
}

function positionTrainUnits() {
    const units = [
        { group: locomotiveGroup, offsetDist: 0 },
        { group: tenderGroup, offsetDist: 6.5 },
        { group: carriage1Group, offsetDist: 14.5 },
        { group: carriage2Group, offsetDist: 23.5 },
        { group: cargoGroup, offsetDist: 32.0 },
    ];

    const totalLen = mainTrackCurve.getLength();

    units.forEach(u => {
        if (!u.group) return;
        const unitU = (trainU - (u.offsetDist / totalLen) + 1.0) % 1.0;
        const pos = mainTrackCurve.getPointAt(unitU);
        const tangent = mainTrackCurve.getTangentAt(unitU).normalize();

        u.group.position.copy(pos);
        u.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    });
}

// --- Station Passenger Pickup & Money/Yard Rewards (+50€ / +50Y Per Stop) ---
function checkStationArrival(delta: number) {
    const targetStation = STATIONS[currentStationIndex];
    if (!targetStation) return;

    const totalLen = mainTrackCurve.getLength();
    const targetU = targetStation.trackU;
    let distU = targetU - trainU;
    if (distU < -0.5) distU += 1.0;
    if (distU > 0.5) distU -= 1.0;

    const distMeters = Math.abs(distU * totalLen);

    const distEl = document.getElementById('target-station-dist');
    if (distEl) distEl.innerText = `(${Math.round(distMeters)}m)`;

    const boardingPanel = document.getElementById('station-boarding-panel');
    const progressBar = document.getElementById('boarding-progress');

    // If within 30 meters and train stopped (< 5 km/h)
    if (distMeters < 30 && trainSpeed < 5.0) {
        if (!isBoarding) {
            isBoarding = true;
            boardingTimer = 0;
            trainAudio.playStationBell();
            if (boardingPanel) {
                boardingPanel.style.display = 'flex';
                const title = document.getElementById('boarding-station-title');
                if (title) title.innerText = `PEATUS: ${targetStation.name.toUpperCase()}`;
            }
        }

        boardingTimer += delta;
        const progressPct = Math.min(100, (boardingTimer / 2.5) * 100);
        if (progressBar) progressBar.style.width = `${progressPct}%`;

        if (boardingTimer >= 2.5) {
            isBoarding = false;
            if (boardingPanel) boardingPanel.style.display = 'none';

            // Give +50€ in-game money and +50 Yards per stop
            const moneyReward = 50;
            const yardReward = 50;
            totalPassengers += targetStation.passengersWaiting;
            
            addTrainMoney(moneyReward);
            yardService.addYards(yardReward, `Rongimäng: ${targetStation.name} reisijatevedu`);
            trainAudio.playCoinReward();

            showStationRewardModal(targetStation, moneyReward, yardReward);

            currentStationIndex = (currentStationIndex + 1) % STATIONS.length;
            const nextSt = STATIONS[currentStationIndex];
            const nameEl = document.getElementById('target-station-name');
            if (nameEl) nameEl.innerText = nextSt.name;
        }
    } else {
        if (isBoarding && distMeters >= 40) {
            isBoarding = false;
            if (boardingPanel) boardingPanel.style.display = 'none';
        }
    }
}

function showStationRewardModal(station: Station, money: number, yards: number) {
    const modal = document.getElementById('modal-station-success');
    const title = document.getElementById('reward-modal-title');
    const desc = document.getElementById('reward-modal-desc');
    const moneyTxt = document.getElementById('reward-money-text');
    const yardsTxt = document.getElementById('reward-yards-text');

    if (title) title.innerText = `🎉 ${station.name.toUpperCase()} EDUKALT LÄBITUD!`;
    if (desc) desc.innerText = `Reisijad (+${station.passengersWaiting} inimest) toimetati kohale. Teeni igal peatusel +50 € Rongiraha ja +50 Yardi!`;
    if (moneyTxt) moneyTxt.innerText = `+${money} € 🪙`;
    if (yardsTxt) yardsTxt.innerText = `+${yards} YARDS 💎`;
    if (modal) modal.style.display = 'flex';
}

// --- Junction Proximity & Switching ---
function checkJunctionProximity() {
    const juncBanner = document.getElementById('junction-banner');
    const distU = Math.abs(trainU - JUNCTION.switchU);

    if (distU < 0.04) {
        if (juncBanner) juncBanner.style.display = 'flex';
    } else {
        if (juncBanner) juncBanner.style.display = 'none';
    }
}

function toggleTrackSwitch() {
    JUNCTION.activeBranch = JUNCTION.activeBranch === 'main' ? 'mountain' : 'main';
    trainAudio.playSwitchTrack();
    const dirText = document.getElementById('junction-dir-text');
    if (dirText) {
        dirText.innerText = JUNCTION.activeBranch === 'main' ? '[PÕHILIIN]' : '[MÄERING]';
        dirText.style.color = JUNCTION.activeBranch === 'main' ? '#00f2fe' : '#ffd32a';
    }
}

// --- Camera Modes ---
function updateCamera() {
    if (!locomotiveGroup) return;

    const locoPos = locomotiveGroup.position;
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(locomotiveGroup.quaternion);

    if (cameraMode === 0) {
        // Mode 0: 3rd Person Follow Chase Camera
        const targetCamPos = locoPos.clone().sub(forward.clone().multiplyScalar(22)).add(new THREE.Vector3(0, 10, 0));
        camera.position.lerp(targetCamPos, 0.08);
        camera.lookAt(locoPos.clone().add(new THREE.Vector3(0, 3, 0)));
    } else if (cameraMode === 1) {
        // Mode 1: Cab Interior View (Driver's Eye looking through windshield)
        const cabEye = locoPos.clone().add(new THREE.Vector3(0, 3.4, -2.8).applyQuaternion(locomotiveGroup.quaternion));
        camera.position.copy(cabEye);
        const lookAhead = cabEye.clone().add(forward.clone().multiplyScalar(30));
        camera.lookAt(lookAhead);
    } else if (cameraMode === 2) {
        // Mode 2: Side Cinematic Flyby Camera
        const sideOffset = new THREE.Vector3(18, 5, 5).applyQuaternion(locomotiveGroup.quaternion);
        camera.position.lerp(locoPos.clone().add(sideOffset), 0.05);
        camera.lookAt(locoPos);
    } else if (cameraMode === 3) {
        // Mode 3: Top-Down Tactical Birds-Eye Map
        camera.position.set(locoPos.x, locoPos.y + 140, locoPos.z);
        camera.lookAt(locoPos);
    }
}

// --- Weather & Time of Day Toggle (Day / Sunset / Night) ---
function toggleWeather() {
    weatherMode = (weatherMode + 1) % 3;
    const btn = document.getElementById('btn-toggle-weather');

    if (weatherMode === 0) {
        scene.background = new THREE.Color(0x87ceeb);
        scene.fog = new THREE.FogExp2(0x87ceeb, 0.002);
        dirLight.color.setHex(0xfffaed);
        dirLight.intensity = 1.3;
        ambientLight.intensity = 0.4;
        trainHeadlight.intensity = 3;
        if (btn) btn.innerText = '☀️ Päev';
    } else if (weatherMode === 1) {
        scene.background = new THREE.Color(0xf97316);
        scene.fog = new THREE.FogExp2(0xea580c, 0.003);
        dirLight.color.setHex(0xffaa5e);
        dirLight.intensity = 1.1;
        ambientLight.intensity = 0.3;
        trainHeadlight.intensity = 6;
        if (btn) btn.innerText = '🌅 Loojang';
    } else if (weatherMode === 2) {
        scene.background = new THREE.Color(0x060b13);
        scene.fog = new THREE.FogExp2(0x060b13, 0.004);
        dirLight.color.setHex(0x38bdf8);
        dirLight.intensity = 0.2;
        ambientLight.intensity = 0.15;
        trainHeadlight.intensity = 12;
        if (btn) btn.innerText = '🌙 Öö';
    }
}

// --- Setup User Controls & Keybinds ---
function setupControls() {
    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') {
            targetThrottle = Math.min(100, targetThrottle + 15);
            isBraking = false;
        } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
            targetThrottle = Math.max(0, targetThrottle - 15);
            if (targetThrottle === 0) {
                isBraking = true;
                trainAudio.playBrakeSqueal();
            }
        } else if (e.code === 'Space') {
            isBraking = true;
            targetThrottle = 0;
            trainAudio.playBrakeSqueal();
        } else if (e.code === 'KeyH') {
            trainAudio.playWhistle();
            emitSmokePuff(true);
        } else if (e.code === 'KeyJ' || e.code === 'KeyT') {
            toggleTrackSwitch();
        } else if (e.code === 'KeyC') {
            cameraMode = (cameraMode + 1) % 4;
            updateCameraBtnText();
        } else if (e.code === 'KeyN') {
            toggleWeather();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            isBraking = false;
        }
    });

    // Depot Modal Open / Close
    const depotModal = document.getElementById('modal-train-depot');
    document.getElementById('btn-open-depot')?.addEventListener('click', () => {
        if (depotModal) {
            depotModal.style.display = 'flex';
            renderDepotModal();
        }
    });
    document.getElementById('btn-close-depot')?.addEventListener('click', () => {
        if (depotModal) depotModal.style.display = 'none';
    });
    document.getElementById('btn-depot-start-driving')?.addEventListener('click', () => {
        if (depotModal) depotModal.style.display = 'none';
        targetThrottle = 40; // Auto-start cruising
        isBraking = false;
    });

    // Button Controls
    document.getElementById('btn-throttle-up')?.addEventListener('click', () => {
        targetThrottle = Math.min(100, targetThrottle + 20);
        isBraking = false;
    });
    document.getElementById('btn-throttle-down')?.addEventListener('click', () => {
        targetThrottle = Math.max(0, targetThrottle - 20);
        if (targetThrottle === 0) {
            isBraking = true;
            trainAudio.playBrakeSqueal();
        }
    });
    document.getElementById('btn-horn')?.addEventListener('click', () => {
        trainAudio.playWhistle();
        emitSmokePuff(true);
    });
    document.getElementById('btn-switch-track')?.addEventListener('click', toggleTrackSwitch);
    document.getElementById('btn-camera-view')?.addEventListener('click', () => {
        cameraMode = (cameraMode + 1) % 4;
        updateCameraBtnText();
    });
    document.getElementById('btn-toggle-weather')?.addEventListener('click', toggleWeather);

    // Mobile Virtual Touch
    document.getElementById('m-btn-throttle-up')?.addEventListener('pointerdown', () => {
        targetThrottle = Math.min(100, targetThrottle + 25);
        isBraking = false;
    });
    document.getElementById('m-btn-throttle-down')?.addEventListener('pointerdown', () => {
        targetThrottle = Math.max(0, targetThrottle - 25);
        if (targetThrottle === 0) isBraking = true;
    });
    document.getElementById('m-btn-horn')?.addEventListener('pointerdown', () => {
        trainAudio.playWhistle();
        emitSmokePuff(true);
    });
    document.getElementById('m-btn-switch')?.addEventListener('pointerdown', toggleTrackSwitch);

    // Continue Next Station Modal Button
    document.getElementById('btn-next-station-continue')?.addEventListener('click', () => {
        const modal = document.getElementById('modal-station-success');
        if (modal) modal.style.display = 'none';
        targetThrottle = 50;
        isBraking = false;
    });

    // Audio Mute Toggle
    const soundBtn = document.getElementById('btn-sound-toggle');
    if (soundBtn) {
        soundBtn.addEventListener('click', () => {
            const muted = trainAudio.toggleMute();
            soundBtn.innerText = muted ? '🔇 Muted' : '🔊 Heli';
        });
    }

    // Help Modal
    const helpModal = document.getElementById('modal-help');
    document.getElementById('btn-open-help')?.addEventListener('click', () => {
        if (helpModal) helpModal.style.display = 'flex';
    });
    document.getElementById('btn-close-help')?.addEventListener('click', () => {
        if (helpModal) helpModal.style.display = 'none';
    });
}

function updateCameraBtnText() {
    const camBtn = document.getElementById('btn-camera-view');
    const modes = ['🎥 Tagaajam (3D)', '🎥 Kabiin (Juht)', '🎥 Kinovaade', '🎥 Pealtvaade'];
    if (camBtn) camBtn.innerText = modes[cameraMode];
}

// --- Setup HUD & Currency Updates ---
function setupHUD() {
    const hudYardIcon = document.getElementById('hud-yard-icon');
    if (hudYardIcon) hudYardIcon.innerHTML = yardService.renderYardSvg(20);

    const initialYard = yardService.getYards();
    updateYardBalance({ yards: initialYard } as any);
}

function updateYardBalance(data: YardData) {
    const yardVal = document.getElementById('train-yard-val');
    const depotYardVal = document.getElementById('depot-yard-val');
    if (yardVal) {
        yardVal.innerText = data.yards.toLocaleString();
    }
    if (depotYardVal) {
        depotYardVal.innerText = data.yards.toLocaleString();
    }
}

function updateHUD() {
    const speedEl = document.getElementById('speed-text');
    if (speedEl) speedEl.innerText = Math.round(trainSpeed).toString();

    const throttleEl = document.getElementById('throttle-text');
    const throttleFill = document.getElementById('throttle-fill');
    if (throttleEl) throttleEl.innerText = `${Math.round(currentThrottle)}%`;
    if (throttleFill) throttleFill.style.width = `${Math.round(currentThrottle)}%`;

    const passEl = document.getElementById('stat-passengers');
    if (passEl) passEl.innerText = totalPassengers.toString();

    const moneyEl = document.getElementById('train-money-val');
    if (moneyEl) moneyEl.innerText = getTrainMoney().toLocaleString();

    const depotMoneyEl = document.getElementById('depot-money-val');
    if (depotMoneyEl) depotMoneyEl.innerText = getTrainMoney().toLocaleString();
}

// Start
window.addEventListener('DOMContentLoaded', () => {
    initEngine();
});
