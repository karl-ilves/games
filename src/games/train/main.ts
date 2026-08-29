import * as THREE from 'three';
import { getCurrentUserProfile, isPlayardOwner, isTestMode } from '../../auth';
import { yardService, YardData } from '../../shared/yardService';
import { trainAudio } from './audio';

console.log("3D Rongimäng (Train Simulator) Initialized.");

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

// --- Stations Definition ---
interface Station {
    id: string;
    name: string;
    description: string;
    trackU: number; // position on track [0..1]
    worldPos: THREE.Vector3;
    passengersWaiting: number;
    yardReward: number;
}

const STATIONS: Station[] = [
    {
        id: 'central',
        name: 'Kesklinna Peajaam',
        description: 'Suur reisijate peajaam kellatorni ja reisijate perrooniga',
        trackU: 0.05,
        worldPos: new THREE.Vector3(0, 0, 0),
        passengersWaiting: 28,
        yardReward: 40
    },
    {
        id: 'forest',
        name: 'Männimetsa Peatus',
        description: 'Metsa vahel asuv puidust reisijate ooteplatvorm',
        trackU: 0.32,
        worldPos: new THREE.Vector3(0, 0, 0),
        passengersWaiting: 16,
        yardReward: 45
    },
    {
        id: 'harbor',
        name: 'Jõekalda Sadam',
        description: 'Sadamadepoo jõe ääres kaubakraanade ja konteineritega',
        trackU: 0.58,
        worldPos: new THREE.Vector3(0, 0, 0),
        passengersWaiting: 22,
        yardReward: 50
    },
    {
        id: 'mountain',
        name: 'Mäejaam / Lumetipp',
        description: 'Mägine jaam vaatega orule ja tunnelitele',
        trackU: 0.82,
        worldPos: new THREE.Vector3(0, 0, 0),
        passengersWaiting: 30,
        yardReward: 60
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
    switchU: 0.72,
    description: 'Põhiliin vs Mäering',
    activeBranch: 'main'
};

// --- Game State ---
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;

// Train motion state
let trainU = 0.05; // 0..1 along track spline
let trainSpeed = 0; // km/h
let targetThrottle = 0; // 0..100%
let currentThrottle = 0;
let isBraking = false;
let totalPassengers = 24;
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
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.002);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 3000);
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

    // Setup Lighting
    ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    hemiLight = new THREE.HemisphereLight(0xddeeff, 0x334433, 0.4);
    scene.add(hemiLight);

    dirLight = new THREE.DirectionalLight(0xfffaed, 1.3);
    dirLight.position.set(120, 200, 100);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 600;
    dirLight.shadow.camera.left = -250;
    dirLight.shadow.camera.right = 250;
    dirLight.shadow.camera.top = 250;
    dirLight.shadow.camera.bottom = -250;
    scene.add(dirLight);

    buildRailwayTracks();
    buildTerrainAndScenery();
    buildStations();
    buildTrain();
    setupControls();
    setupHUD();

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

// --- Build Railway Track Splines & 3D Rails ---
function buildRailwayTracks() {
    // 1. Main Scenic Circuit Track (Curves through plains, over river, through forests)
    const mainPoints = [
        new THREE.Vector3(0, 0, 0),        // Central Station
        new THREE.Vector3(120, 0, 40),
        new THREE.Vector3(260, 4, 120),
        new THREE.Vector3(340, 8, 260),
        new THREE.Vector3(300, 6, 420),    // Forest Station area
        new THREE.Vector3(180, 2, 500),
        new THREE.Vector3(0, 0, 460),      // River bridge crossing
        new THREE.Vector3(-180, 2, 480),   // Harbor Station area
        new THREE.Vector3(-320, 8, 380),
        new THREE.Vector3(-360, 16, 200),  // Mountain approach
        new THREE.Vector3(-280, 22, 40),   // Mountain Station area
        new THREE.Vector3(-140, 10, -40),  // Tunnel exit into valley
    ];

    mainTrackCurve = new THREE.CatmullRomCurve3(mainPoints, true, 'centripetal', 0.2);

    // Mountain Branch Loop (alternative route on track switch)
    const mountainPoints = [
        new THREE.Vector3(-360, 16, 200),
        new THREE.Vector3(-420, 28, 140),
        new THREE.Vector3(-380, 36, -20),  // High peak viaduct
        new THREE.Vector3(-260, 26, -50),
        new THREE.Vector3(-140, 10, -40),
    ];
    mountainTrackCurve = new THREE.CatmullRomCurve3(mountainPoints, false, 'centripetal', 0.2);

    // Render 3D Rail Track Geometry along Main Curve
    renderTrackMesh(mainTrackCurve, 600);
    renderTrackMesh(mountainTrackCurve, 150);
}

function renderTrackMesh(curve: THREE.CatmullRomCurve3, samples: number) {
    const railGauge = 2.4; // width between 2 rails
    const sleeperSpacing = 3.0; // meters between ties
    const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.9 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x8c97a8, metalness: 0.85, roughness: 0.3 });
    const ballastMat = new THREE.MeshStandardMaterial({ color: 0x4f4a43, roughness: 0.95 });

    const totalLength = curve.getLength();
    const numSleepers = Math.floor(totalLength / sleeperSpacing);

    // 1. Wooden Sleepers (Ties)
    const sleeperGeo = new THREE.BoxGeometry(3.6, 0.25, 0.7);
    const sleeperInstanced = new THREE.InstancedMesh(sleeperGeo, sleeperMat, numSleepers);
    sleeperInstanced.castShadow = true;
    sleeperInstanced.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < numSleepers; i++) {
        const u = (i / numSleepers);
        const pos = curve.getPointAt(u);
        const tangent = curve.getTangentAt(u).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

        dummy.position.copy(pos);
        dummy.position.y += 0.1;
        dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        dummy.updateMatrix();
        sleeperInstanced.setMatrixAt(i, dummy.matrix);
    }
    sleeperInstanced.instanceMatrix.needsUpdate = true;
    scene.add(sleeperInstanced);

    // 2. Twin Steel Rails (Left & Right)
    [-railGauge / 2, railGauge / 2].forEach(offset => {
        const railPoints: THREE.Vector3[] = [];
        for (let i = 0; i <= samples; i++) {
            const u = i / samples;
            const p = curve.getPointAt(u);
            const tangent = curve.getTangentAt(u).normalize();
            const up = new THREE.Vector3(0, 1, 0);
            const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
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

    // 3. Ballast Gravel Base (Gravel bed under tracks)
    const ballastGeo = new THREE.TubeGeometry(curve, samples, 2.3, 5, curve.closed);
    const ballastMesh = new THREE.Mesh(ballastGeo, ballastMat);
    ballastMesh.scale.set(1, 0.25, 1);
    ballastMesh.receiveShadow = true;
    scene.add(ballastMesh);
}

// --- Build Scenic Terrain, River, Trees, Rocks, Bridges & Tunnels ---
function buildTerrainAndScenery() {
    // 1. Terrain Ground
    const groundGeo = new THREE.PlaneGeometry(1600, 1600, 64, 64);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x3d7e35,
        roughness: 0.9,
        flatShading: true
    });

    // Add subtle procedural terrain waves
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        // Mountains to the North-West
        if (x < -150 && y < 100) {
            const dist = Math.sqrt((x + 300) ** 2 + (y - 50) ** 2);
            posAttr.setZ(i, Math.max(0, 45 - dist * 0.15 + Math.sin(x * 0.03) * 6));
        } else {
            posAttr.setZ(i, Math.sin(x * 0.015) * 3 + Math.cos(y * 0.015) * 3);
        }
    }
    groundGeo.computeVertexNormals();

    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.3;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // 2. Scenic Blue River
    const riverGeo = new THREE.PlaneGeometry(140, 1200);
    const riverMat = new THREE.MeshStandardMaterial({
        color: 0x1d70b8,
        roughness: 0.1,
        metalness: 0.6,
        transparent: true,
        opacity: 0.85
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.rotation.z = Math.PI / 10;
    river.position.set(0, -0.2, 450);
    river.receiveShadow = true;
    scene.add(river);

    // 3. Railway Bridge across river
    const bridgeGroup = new THREE.Group();
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x6e757d, roughness: 0.8 });
    for (let x = -40; x <= 40; x += 20) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 12, 8), pillarMat);
        pillar.position.set(x, -5, 460);
        pillar.castShadow = true;
        bridgeGroup.add(pillar);
    }
    // Truss structure on sides of bridge
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x9b2226, metalness: 0.7, roughness: 0.4 });
    const trussL = new THREE.Mesh(new THREE.BoxGeometry(90, 4, 0.4), trussMat);
    trussL.position.set(0, 2.5, 462.5);
    const trussR = new THREE.Mesh(new THREE.BoxGeometry(90, 4, 0.4), trussMat);
    trussR.position.set(0, 2.5, 457.5);
    bridgeGroup.add(trussL, trussR);
    scene.add(bridgeGroup);

    // 4. Mountain Tunnel
    const tunnelGroup = new THREE.Group();
    const tunnelArchMat = new THREE.MeshStandardMaterial({ color: 0x343a40, roughness: 0.95 });
    const tunnelArch = new THREE.Mesh(new THREE.TorusGeometry(8, 2.5, 8, 16, Math.PI), tunnelArchMat);
    tunnelArch.position.set(-140, 10, -40);
    tunnelArch.rotation.y = Math.PI / 3;
    tunnelGroup.add(tunnelArch);
    scene.add(tunnelGroup);

    // 5. Procedural Forests (Pine & Birch Trees)
    buildPineForest();
}

function buildPineForest() {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x543d2b, roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1e4620, roughness: 0.8, flatShading: true });
    const birchFoliageMat = new THREE.MeshStandardMaterial({ color: 0x38b000, roughness: 0.8, flatShading: true });

    const numTrees = 280;
    const treeGroup = new THREE.Group();

    for (let i = 0; i < numTrees; i++) {
        const isBirch = Math.random() > 0.65;
        const tree = new THREE.Group();

        // Random location (keep away from center 0,0)
        let x = (Math.random() - 0.5) * 1100;
        let z = (Math.random() - 0.5) * 1100;
        if (Math.abs(x) < 50 && Math.abs(z) < 50) x += 80;

        const scale = 0.8 + Math.random() * 0.8;
        tree.scale.set(scale, scale, scale);
        tree.position.set(x, 0, z);

        // Trunk
        const trunkHeight = isBirch ? 6 : 4;
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, trunkHeight, 6);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        tree.add(trunk);

        // Foliage Cones
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

// --- Build 4 Detailed Stations with Platforms & Passengers ---
function buildStations() {
    STATIONS.forEach(st => {
        st.worldPos = mainTrackCurve.getPointAt(st.trackU);
        const tangent = mainTrackCurve.getTangentAt(st.trackU).normalize();
        const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

        const stationGroup = new THREE.Group();
        stationGroup.position.copy(st.worldPos);
        stationGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

        // Platform (raised concrete slab alongside tracks)
        const platformMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
        const platform = new THREE.Mesh(new THREE.BoxGeometry(8, 0.8, 45), platformMat);
        platform.position.set(5.5, 0.4, 0);
        platform.receiveShadow = true;
        platform.castShadow = true;
        stationGroup.add(platform);

        // Platform yellow stopping safety line
        const lineMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 45), lineMat);
        line.position.set(2.2, 0.81, 0);
        stationGroup.add(line);

        // Station Signboard with Station Name
        const signPostMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
        const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4), signPostMat);
        post1.position.set(6, 2, -10);
        const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4), signPostMat);
        post2.position.set(6, 2, 10);
        stationGroup.add(post1, post2);

        // Station Building / Canopy
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.3, roughness: 0.4 });
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(7, 0.4, 25), roofMat);
        canopy.position.set(6, 4.5, 0);
        canopy.castShadow = true;
        stationGroup.add(canopy);

        // Station Lamps with warm glowing lights
        const lamp = new THREE.PointLight(0xfff3bf, 1.2, 25);
        lamp.position.set(6, 4, 0);
        stationGroup.add(lamp);

        // 3D Animated Passengers on Platform waiting
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

        // Railway Signal (Red/Green glowing lamp)
        const signalGroup = new THREE.Group();
        signalGroup.position.set(-3.5, 0, 24);
        const signalPole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 5), signPostMat);
        signalPole.position.y = 2.5;
        const signalBox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.6), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        signalBox.position.y = 4.2;
        const signalGreen = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
        signalGreen.position.set(0, 4.4, -0.3);
        signalGroup.add(signalPole, signalBox, signalGreen);
        stationGroup.add(signalGroup);

        scene.add(stationGroup);
    });
}

// --- Build Complete 3D Steam Locomotive & Wagons Train ---
function buildTrain() {
    trainGroup = new THREE.Group();

    // 1. Locomotive Engine
    locomotiveGroup = new THREE.Group();
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1c2430, metalness: 0.75, roughness: 0.35 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
    const redTrimMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5 });
    const windowMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.6, roughness: 0.1 });

    // Boiler Main Cylinder
    const boilerGeo = new THREE.CylinderGeometry(1.3, 1.3, 6.5, 16);
    const boiler = new THREE.Mesh(boilerGeo, ironMat);
    boiler.rotation.x = Math.PI / 2;
    boiler.position.set(0, 2.4, 0.5);
    boiler.castShadow = true;
    locomotiveGroup.add(boiler);

    // Brass bands around boiler
    [-1.5, 0.5, 2.5].forEach(z => {
        const band = new THREE.Mesh(new THREE.TorusGeometry(1.33, 0.06, 8, 24), brassMat);
        band.position.set(0, 2.4, z);
        locomotiveGroup.add(band);
    });

    // Boiler Front Cap
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), brassMat);
    cap.rotation.x = -Math.PI / 2;
    cap.position.set(0, 2.4, 3.75);
    locomotiveGroup.add(cap);

    // Cowcatcher (Front Plow)
    const cowcatcher = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.6, 4), redTrimMat);
    cowcatcher.rotation.x = Math.PI / 2;
    cowcatcher.rotation.y = Math.PI / 4;
    cowcatcher.position.set(0, 0.8, 4.8);
    locomotiveGroup.add(cowcatcher);

    // Smokestack (Chimney with steam exhaust point)
    const smokestack = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 1.6, 12), ironMat);
    smokestack.position.set(0, 4.3, 2.8);
    smokestack.castShadow = true;
    locomotiveGroup.add(smokestack);

    const smokestackCrown = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.08, 8, 16), brassMat);
    smokestackCrown.rotation.x = Math.PI / 2;
    smokestackCrown.position.set(0, 5.1, 2.8);
    locomotiveGroup.add(smokestackCrown);

    // Steam Dome & Brass Whistle
    const steamDome = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), brassMat);
    steamDome.position.set(0, 3.8, 0.8);
    const whistle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8), brassMat);
    whistle.position.set(0.4, 4.0, -0.2);
    locomotiveGroup.add(steamDome, whistle);

    // Driver's Cabin (Cab)
    const cab = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.2, 3.2), ironMat);
    cab.position.set(0, 3.0, -3.0);
    cab.castShadow = true;
    locomotiveGroup.add(cab);

    // Cab Roof Curved
    const cabRoof = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 3.4, 12, 1, false, 0, Math.PI), redTrimMat);
    cabRoof.rotation.z = Math.PI / 2;
    cabRoof.position.set(0, 4.6, -3.0);
    locomotiveGroup.add(cabRoof);

    // Cab Windows (Glowing yellow interior)
    const winL = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), windowMat);
    winL.position.set(-1.52, 3.4, -3.0);
    winL.rotation.y = -Math.PI / 2;
    const winR = winL.clone();
    winR.position.set(1.52, 3.4, -3.0);
    winR.rotation.y = Math.PI / 2;
    const winF = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), windowMat);
    winF.position.set(0.7, 3.4, -1.38);
    locomotiveGroup.add(winL, winR, winF);

    // Bright Headlight & SpotLight Beam
    const lampHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.4, 0.8, 12), brassMat);
    lampHousing.rotation.x = Math.PI / 2;
    lampHousing.position.set(0, 3.6, 4.1);
    trainHeadlightMesh = new THREE.Mesh(new THREE.CircleGeometry(0.45, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    trainHeadlightMesh.position.set(0, 3.6, 4.51);

    trainHeadlight = new THREE.SpotLight(0xfffaed, 5, 80, Math.PI / 6, 0.4, 1.2);
    trainHeadlight.position.set(0, 3.6, 4.5);
    trainHeadlight.target.position.set(0, 0, 35);
    locomotiveGroup.add(lampHousing, trainHeadlightMesh, trainHeadlight, trainHeadlight.target);

    // Rotating Drive Wheels (6 Wheels on Locomotive)
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.3 });
    const wheelGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.3, 16);
    [-2.2, 0.2, 2.4].forEach(z => {
        [-1.3, 1.3].forEach(x => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(x, 0.9, z);
            wheel.castShadow = true;
            locomotiveGroup.add(wheel);
            wheels.push(wheel);
        });
    });

    // Connecting Rods
    const rodMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.95 });
    const rodL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 4.8), rodMat);
    rodL.position.set(-1.55, 0.9, 0.1);
    const rodR = rodL.clone();
    rodR.position.set(1.55, 0.9, 0.1);
    locomotiveGroup.add(rodL, rodR);
    connectingRods.push(rodL, rodR);

    trainGroup.add(locomotiveGroup);

    // 2. Coal Tender Wagon
    tenderGroup = buildTenderWagon();
    trainGroup.add(tenderGroup);

    // 3. Passenger Carriage 1 (Red Express)
    carriage1Group = buildPassengerCarriage(0xb91c1c);
    trainGroup.add(carriage1Group);

    // 4. Passenger Carriage 2 (Blue Express)
    carriage2Group = buildPassengerCarriage(0x1d4ed8);
    trainGroup.add(carriage2Group);

    // 5. Cargo Wagon (Wood Timber)
    cargoGroup = buildCargoWagon();
    trainGroup.add(cargoGroup);

    scene.add(trainGroup);
}

function buildTenderWagon(): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.4 });
    const coalMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.95 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.2, 4.5), bodyMat);
    body.position.y = 2.0;
    body.castShadow = true;
    group.add(body);

    const coal = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2), coalMat);
    coal.position.set(0, 3.2, 0);
    coal.scale.set(1.1, 0.6, 1.8);
    group.add(coal);

    // 4 Wheels
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

function buildPassengerCarriage(colorHex: number): THREE.Group {
    const group = new THREE.Group();
    const coachMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.3, roughness: 0.5 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
    const winMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.7 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.8, 7.5), coachMat);
    body.position.y = 2.4;
    body.castShadow = true;
    group.add(body);

    const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 7.6, 16, 1, false, 0, Math.PI), roofMat);
    roof.rotation.z = Math.PI / 2;
    roof.position.set(0, 3.8, 0);
    group.add(roof);

    // Rows of Windows
    for (let z = -2.6; z <= 2.6; z += 1.3) {
        [-1.42, 1.42].forEach(x => {
            const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.9), winMat);
            win.position.set(x, 2.7, z);
            win.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
            group.add(win);
        });
    }

    // 4 Bogie Wheels
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

function buildCargoWagon(): THREE.Group {
    const group = new THREE.Group();
    const flatbedMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const logMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });

    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 6.5), flatbedMat);
    bed.position.y = 1.4;
    group.add(bed);

    // Stacks of Timber Logs
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

    const smokeGeo = new THREE.DodecahedronGeometry(isHornBurst ? 0.9 : 0.5);
    const smokeMat = new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
        transparent: true,
        opacity: isHornBurst ? 0.85 : 0.6,
        roughness: 1.0,
        flatShading: true
    });

    const mesh = new THREE.Mesh(smokeGeo, smokeMat);
    // Position at smokestack exit
    const stackWorld = new THREE.Vector3(0, 5.2, 2.8);
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
    // 1. Throttle & Acceleration
    if (isBraking) {
        currentThrottle = THREE.MathUtils.lerp(currentThrottle, 0, delta * 3.5);
        trainSpeed = THREE.MathUtils.lerp(trainSpeed, 0, delta * 2.8);
    } else {
        currentThrottle = THREE.MathUtils.lerp(currentThrottle, targetThrottle, delta * 2.0);
        const targetSpeed = currentThrottle * 1.2; // 0..120 km/h
        trainSpeed = THREE.MathUtils.lerp(trainSpeed, targetSpeed, delta * 0.8);
    }

    if (Math.abs(trainSpeed) < 0.05) trainSpeed = 0;

    // 2. Advance train on curve spline
    const speedRatio = trainSpeed / 120;
    const trackLength = mainTrackCurve.getLength();
    const meterPerSec = (trainSpeed * 1000) / 3600;
    const deltaU = (meterPerSec * delta) / trackLength;

    trainU = (trainU + deltaU) % 1.0;
    if (trainU < 0) trainU += 1.0;

    // 3. Audio Chug update
    trainAudio.updateChugSpeed(speedRatio);

    // 4. Emit continuous smoke puffs based on speed
    smokeTimer += delta;
    const puffInterval = Math.max(0.12, 0.6 - Math.abs(speedRatio) * 0.45);
    if (smokeTimer >= puffInterval && Math.abs(trainSpeed) > 1) {
        smokeTimer = 0;
        emitSmokePuff(false);
    }

    // 5. Position & Articulate Train Units along Track
    positionTrainUnits();

    // 6. Rotate Wheels & Connecting Rods
    const wheelRotDelta = (meterPerSec * delta) / 0.9;
    wheels.forEach(w => w.rotation.x += wheelRotDelta);
    connectingRods.forEach((r, idx) => {
        r.position.y = 0.9 + Math.sin(wheels[0]?.rotation.x || 0) * 0.35;
        r.position.z = 0.1 + Math.cos(wheels[0]?.rotation.x || 0) * 0.35;
    });

    // 7. Station Arrival & Boarding Check
    checkStationArrival(delta);

    // 8. Junction Switch Detection
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
        const unitU = (trainU - (u.offsetDist / totalLen) + 1.0) % 1.0;
        const pos = mainTrackCurve.getPointAt(unitU);
        const tangent = mainTrackCurve.getTangentAt(unitU).normalize();

        u.group.position.copy(pos);
        u.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    });
}

// --- Station Passenger Pickup & Yard Reward Logic ---
function checkStationArrival(delta: number) {
    const targetStation = STATIONS[currentStationIndex];
    if (!targetStation) return;

    const totalLen = mainTrackCurve.getLength();
    const targetU = targetStation.trackU;
    let distU = targetU - trainU;
    if (distU < -0.5) distU += 1.0;
    if (distU > 0.5) distU -= 1.0;

    const distMeters = Math.abs(distU * totalLen);

    // Update Top HUD Target Distance
    const distEl = document.getElementById('target-station-dist');
    if (distEl) distEl.innerText = `(${Math.round(distMeters)}m)`;

    const boardingPanel = document.getElementById('station-boarding-panel');
    const progressBar = document.getElementById('boarding-progress');

    // If within 15 meters and train stopped (< 3 km/h)
    if (distMeters < 18 && trainSpeed < 3.0) {
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
            // Station Boarding Complete!
            isBoarding = false;
            if (boardingPanel) boardingPanel.style.display = 'none';

            // Add passengers & give Yards
            totalPassengers += targetStation.passengersWaiting;
            const reward = targetStation.yardReward;
            yardService.addYards(reward, `Rongimäng: ${targetStation.name} reisijatevedu`);
            trainAudio.playCoinReward();

            // Show Success Modal
            showStationRewardModal(targetStation, reward);

            // Advance to next station
            currentStationIndex = (currentStationIndex + 1) % STATIONS.length;
            const nextSt = STATIONS[currentStationIndex];
            const nameEl = document.getElementById('target-station-name');
            if (nameEl) nameEl.innerText = nextSt.name;
        }
    } else {
        if (isBoarding && distMeters >= 25) {
            isBoarding = false;
            if (boardingPanel) boardingPanel.style.display = 'none';
        }
    }
}

function showStationRewardModal(station: Station, yards: number) {
    const modal = document.getElementById('modal-station-success');
    const title = document.getElementById('reward-modal-title');
    const desc = document.getElementById('reward-modal-desc');
    const yardsTxt = document.getElementById('reward-yards-text');

    if (title) title.innerText = `🎉 ${station.name.toUpperCase()} EDUKALT LÄBITUD!`;
    if (desc) desc.innerText = `Reisijad (+${station.passengersWaiting} inimest) toimetati turvaliselt kohale.`;
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
        // Day
        scene.background = new THREE.Color(0x87ceeb);
        scene.fog = new THREE.FogExp2(0x87ceeb, 0.002);
        dirLight.color.setHex(0xfffaed);
        dirLight.intensity = 1.3;
        ambientLight.intensity = 0.4;
        trainHeadlight.intensity = 3;
        if (btn) btn.innerText = '☀️ Päev';
    } else if (weatherMode === 1) {
        // Sunset
        scene.background = new THREE.Color(0xf97316);
        scene.fog = new THREE.FogExp2(0xea580c, 0.003);
        dirLight.color.setHex(0xffaa5e);
        dirLight.intensity = 1.1;
        ambientLight.intensity = 0.3;
        trainHeadlight.intensity = 6;
        if (btn) btn.innerText = '🌅 Loojang';
    } else if (weatherMode === 2) {
        // Night
        scene.background = new THREE.Color(0x060b13);
        scene.fog = new THREE.FogExp2(0x060b13, 0.004);
        dirLight.color.setHex(0x38bdf8);
        dirLight.intensity = 0.2;
        ambientLight.intensity = 0.15;
        trainHeadlight.intensity = 12; // Bright beam shining through dark
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
        targetThrottle = 50; // Resume cruising
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

// --- Setup HUD & Yard Updates ---
function setupHUD() {
    const hudYardIcon = document.getElementById('hud-yard-icon');
    if (hudYardIcon) hudYardIcon.innerHTML = yardService.renderYardSvg(20);

    const initialYard = yardService.getYards();
    updateYardBalance({ yards: initialYard } as any);
}

function updateYardBalance(data: YardData) {
    const yardVal = document.getElementById('train-yard-val');
    if (yardVal) {
        yardVal.innerText = data.yards.toLocaleString();
    }
}

function updateHUD() {
    // Speedometer
    const speedEl = document.getElementById('speed-text');
    if (speedEl) speedEl.innerText = Math.round(trainSpeed).toString();

    // Throttle bar
    const throttleEl = document.getElementById('throttle-text');
    const throttleFill = document.getElementById('throttle-fill');
    if (throttleEl) throttleEl.innerText = `${Math.round(currentThrottle)}%`;
    if (throttleFill) throttleFill.style.width = `${Math.round(currentThrottle)}%`;

    // Passenger count
    const passEl = document.getElementById('stat-passengers');
    if (passEl) passEl.innerText = totalPassengers.toString();
}

// Start
window.addEventListener('DOMContentLoaded', () => {
    initEngine();
});
