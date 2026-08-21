import { supabase } from '../../lib/supabase';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// --- Global Variables ---
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let clock: THREE.Clock;

// Audio Context
let audioCtx: AudioContext;
let bgmOsc1: OscillatorNode, bgmOsc2: OscillatorNode;
let engineOsc: OscillatorNode, engineGain: GainNode;
let isAudioStarted = false;

// Game State
let gameState = 'garage'; // garage, countdown, racing, finished

// Global var for car model
let loadedCarModel: THREE.Group | null = null;
let loadedMotoModel: THREE.Group | null = null;
const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
gltfLoader.setDRACOLoader(dracoLoader);

let playerWheels: THREE.Mesh[] = [];

gltfLoader.load(import.meta.env.BASE_URL + 'models/ferrari.glb', (gltf) => {
    let model = gltf.scene;
    model.traverse((child: any) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    model.scale.set(1.2, 1.2, 1.2);
    model.position.y = 0;
    model.rotation.y = 0; // point forward
    loadedCarModel = model;
    console.log('Ultra realistic car model loaded!');
});

gltfLoader.load(import.meta.env.BASE_URL + 'models/Motorcycle.glb', (gltf) => {
    let model = gltf.scene;
    model.traverse((child: any) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    model.scale.set(0.015, 0.015, 0.015); // Adjust scale later if needed, 107k model might be large
    model.position.y = 0;
    model.rotation.y = 0;
    loadedMotoModel = model;
    console.log('3D Motorcycle model loaded!');
});

let vehicleType = 'car_1'; // car or moto

// Player Vehicle
let playerVehicleGroup: THREE.Group;
let playerVelocity = new THREE.Vector3(0, 0, 0);
let playerSpeed = 0; // scalar speed
let playerHeading = 0; // rotation around Y axis

// Physics Constants
const GRAVITY = 9.8;
let MAX_SPEED = 50; // m/s
let ACCELERATION = 20; // m/s^2
let BRAKING = 40; // m/s^2
let TURN_SPEED = 1.5; // rad/s
let FRICTION = 0.98; // speed multiplier per frame (simple drag)

// Input State
const keys: { [key: string]: boolean } = {};
let isMobile = false;
let gasPressed = false;
let brakePressed = false;
let leftPressed = false;
let rightPressed = false;


// --- Racing Systems ---
interface Checkpoint {
    x: number;
    z: number;
    radius: number;
}
let checkpoints: Checkpoint[] = [];
let currentLap = 1;
const TOTAL_LAPS = 3;
let nextCheckpointIndex = 0;
let raceTime = 0;

let nitro = 100;
let damage = 0;

interface Opponent {
    group: THREE.Group;
    wheels: THREE.Mesh[];
    speed: number;
    heading: number;
    targetCpIndex: number;
    type: string;
    maxSpeed: number;
    finished: boolean;
    finishOrder: number;
    crashed: boolean;
    crashTimer: number;
}
let opponents: Opponent[] = [];

// --- Crash / Emergency System ---
interface CrashEvent {
    position: THREE.Vector3;
    time: number;
    ambulance: THREE.Group | null;
    towTruck: THREE.Group | null;
    ambulanceArrived: boolean;
    towTruckArrived: boolean;
    yellowFlagActive: boolean;
    cleanup: boolean; // true when leaving
    timer: number; // seconds since event started
}
let crashEvents: CrashEvent[] = [];
let playerCrashed = false;
let playerCrashTimer = 0;


// UI Elements
let uiSpeed: HTMLElement;
let uiGarage: HTMLElement;
let uiHudBottom: HTMLElement;
let uiHud: HTMLElement;


// --- Progression / Economy ---
let money = 0;
let selectedLevel = 1;
let level2Unlocked = false;
let level3Unlocked = false;
let shopCategory: 'car' | 'moto' = 'car';

interface VehicleDef {
    id: string;
    name: string;
    type: 'car' | 'moto';
    price: number;
    maxSpeed: number;
    acceleration: number;
    handling: number; // turn speed multiplier
    image: string;
    hueRotate: number;
}

const VEHICLES: VehicleDef[] = [
    // --- CARS (11) ---
    { id: 'car_1', name: 'Starter Car', type: 'car', price: 0, maxSpeed: 25, acceleration: 8, handling: 1.0, image: import.meta.env.BASE_URL + 'assets/shop_sports_car.jpg', hueRotate: 0 },
    { id: 'car_2', name: 'City Cruiser', type: 'car', price: 500, maxSpeed: 27, acceleration: 11, handling: 1.1, image: import.meta.env.BASE_URL + 'assets/shop_sports_car.jpg', hueRotate: 45 },
    { id: 'car_3', name: 'Offroader', type: 'car', price: 1200, maxSpeed: 26, acceleration: 7, handling: 0.8, image: import.meta.env.BASE_URL + 'assets/shop_suv.jpg', hueRotate: 0 },
    { id: 'car_4', name: 'Street Tuner', type: 'car', price: 2000, maxSpeed: 32, acceleration: 13, handling: 1.2, image: import.meta.env.BASE_URL + 'assets/shop_sports_car.jpg', hueRotate: 120 },
    { id: 'car_5', name: 'Desert Truck', type: 'car', price: 3500, maxSpeed: 31, acceleration: 8, handling: 0.9, image: import.meta.env.BASE_URL + 'assets/shop_suv.jpg', hueRotate: 90 },
    { id: 'car_6', name: 'Muscle Car', type: 'car', price: 5000, maxSpeed: 36, acceleration: 17, handling: 0.9, image: import.meta.env.BASE_URL + 'assets/shop_sports_car.jpg', hueRotate: 200 },
    { id: 'car_7', name: 'V8 Interceptor', type: 'car', price: 7500, maxSpeed: 38, acceleration: 20, handling: 1.0, image: import.meta.env.BASE_URL + 'assets/shop_sports_car.jpg', hueRotate: -50 },
    { id: 'car_8', name: 'Supercar', type: 'car', price: 12000, maxSpeed: 43, acceleration: 23, handling: 1.3, image: import.meta.env.BASE_URL + 'assets/shop_hypercar.jpg', hueRotate: 0 },
    { id: 'car_9', name: 'Neon Hypercar', type: 'car', price: 20000, maxSpeed: 48, acceleration: 27, handling: 1.4, image: import.meta.env.BASE_URL + 'assets/shop_hypercar.jpg', hueRotate: 180 },
    { id: 'car_10', name: 'Stealth Racer', type: 'car', price: 35000, maxSpeed: 52, acceleration: 31, handling: 1.5, image: import.meta.env.BASE_URL + 'assets/shop_hypercar.jpg', hueRotate: 45 },
    { id: 'car_11', name: 'F1 Prototype', type: 'car', price: 50000, maxSpeed: 62, acceleration: 37, handling: 1.8, image: import.meta.env.BASE_URL + 'assets/shop_hypercar.jpg', hueRotate: -90 },

    // --- MOTOS (11) ---
    { id: 'moto_1', name: 'Starter Bike', type: 'moto', price: 0, maxSpeed: 26, acceleration: 12, handling: 1.1, image: import.meta.env.BASE_URL + 'assets/shop_moto.jpg', hueRotate: 0 },
    { id: 'moto_2', name: 'Scooter', type: 'moto', price: 400, maxSpeed: 23, acceleration: 8, handling: 1.2, image: import.meta.env.BASE_URL + 'assets/shop_moto.jpg', hueRotate: 150 },
    { id: 'moto_3', name: 'Classic Chopper', type: 'moto', price: 1000, maxSpeed: 27, acceleration: 11, handling: 0.8, image: import.meta.env.BASE_URL + 'assets/shop_chopper.jpg', hueRotate: 0 },
    { id: 'moto_4', name: 'Dirtbike', type: 'moto', price: 1800, maxSpeed: 30, acceleration: 15, handling: 1.4, image: import.meta.env.BASE_URL + 'assets/shop_moto.jpg', hueRotate: 90 },
    { id: 'moto_5', name: 'Cruiser', type: 'moto', price: 3000, maxSpeed: 32, acceleration: 13, handling: 0.9, image: import.meta.env.BASE_URL + 'assets/shop_chopper.jpg', hueRotate: 60 },
    { id: 'moto_6', name: 'Street Bike', type: 'moto', price: 4500, maxSpeed: 37, acceleration: 18, handling: 1.3, image: import.meta.env.BASE_URL + 'assets/shop_moto.jpg', hueRotate: 210 },
    { id: 'moto_7', name: 'Heavy Chopper', type: 'moto', price: 6500, maxSpeed: 36, acceleration: 16, handling: 0.85, image: import.meta.env.BASE_URL + 'assets/shop_chopper.jpg', hueRotate: -40 },
    { id: 'moto_8', name: 'Superbike', type: 'moto', price: 10000, maxSpeed: 46, acceleration: 25, handling: 1.4, image: import.meta.env.BASE_URL + 'assets/shop_moto.jpg', hueRotate: -90 },
    { id: 'moto_9', name: 'Night Rider', type: 'moto', price: 18000, maxSpeed: 51, acceleration: 27, handling: 1.5, image: import.meta.env.BASE_URL + 'assets/shop_chopper.jpg', hueRotate: 180 },
    { id: 'moto_10', name: 'Hyper Moto', type: 'moto', price: 30000, maxSpeed: 56, acceleration: 33, handling: 1.6, image: import.meta.env.BASE_URL + 'assets/shop_moto.jpg', hueRotate: 45 },
    { id: 'moto_11', name: 'Tron Bike', type: 'moto', price: 50000, maxSpeed: 68, acceleration: 43, handling: 1.7, image: import.meta.env.BASE_URL + 'assets/shop_moto.jpg', hueRotate: 270 }
];

let unlockedVehicles: string[] = ['car_1'];
let vehicleUpgrades: { [id: string]: { speedUpgrades: number } } = {};




async function loadProgress() {
    let loadedFromDB = false;
    if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data, error } = await supabase.from('user_progress').select('*').eq('user_id', session.user.id).single();
            if (data && !error) {
                money = data.money || 0;
                selectedLevel = data.selected_level || 1;
                unlockedVehicles = data.unlocked_vehicles || ['car_1'];
                vehicleUpgrades = data.vehicle_upgrades || {};
                level2Unlocked = data.level2_unlocked || false;
                level3Unlocked = data.level3_unlocked || false;
                loadedFromDB = true;
            }
        }
    }
    
    // 2. If not logged in, always start at 0
    if (!loadedFromDB) {
        money = 0;
        selectedLevel = 1;
        level2Unlocked = false;
        level3Unlocked = false;
        unlockedVehicles = ['car_1'];
        vehicleType = 'car_1';
        vehicleUpgrades = {};
    }
}

async function saveProgress() {
    const payload = {
        money: money,
        selected_level: selectedLevel,
        unlocked_vehicles: unlockedVehicles,
        vehicle_upgrades: vehicleUpgrades,
        level2_unlocked: level2Unlocked,
        level3_unlocked: level3Unlocked
    };
    
    // Always save locally as fallback
    localStorage.setItem('racingSave', JSON.stringify({
        money: money,
        unlockedVehicles: unlockedVehicles,
        vehicleUpgrades: vehicleUpgrades,
        level2Unlocked: level2Unlocked,
        level3Unlocked: level3Unlocked
    }));
    
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        await supabase.from('user_progress').upsert({
            user_id: session.user.id,
            ...payload
        });
    }
}





let rainParticles: THREE.Points;


let checkpointRings: THREE.Mesh[] = [];

function createEnvironment() {
    // Clear old env
    while(scene.children.length > 0){ 
        scene.remove(scene.children[0]); 
    }
    checkpointRings = [];

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(200, 500, 300);
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -500;
    dirLight.shadow.camera.right = 500;
    dirLight.shadow.camera.top = 500;
    dirLight.shadow.camera.bottom = -500;
    scene.add(dirLight);

    if (selectedLevel === 1) {
        scene.background = new THREE.Color(0x87CEEB);
        scene.fog = new THREE.Fog(0x87CEEB, 100, 500);
    } else {
        scene.background = new THREE.Color(0x1a5276); // Darker blue sky for forest
        scene.fog = new THREE.Fog(0x1a5276, 50, 400); // Thicker fog
    }
    
    // Setup realistic environment reflections for cars
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envScene = new THREE.Scene();
    envScene.background = scene.background;
    envScene.add(new THREE.Mesh(new THREE.PlaneGeometry(100,100).rotateX(-Math.PI/2), new THREE.MeshBasicMaterial({color: selectedLevel === 1 ? 0x222222 : 0x2ecc71})));
    scene.environment = pmremGenerator.fromScene(envScene).texture;

    // Ground Plane
    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const groundMat = new THREE.MeshLambertMaterial({ color: selectedLevel === 1 ? 0x333333 : 0x2ecc71 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Track Layout based on Level
    if (selectedLevel === 1) {
        checkpoints = [
            { x: 0, z: 0, radius: 40 },
            { x: 0, z: -400, radius: 40 },
            { x: -400, z: -400, radius: 40 },
            { x: -400, z: -100, radius: 40 },
            { x: -600, z: -100, radius: 40 },
            { x: -600, z: 300, radius: 40 },
            { x: -200, z: 300, radius: 40 },
            { x: -200, z: 500, radius: 40 },
            { x: 300, z: 500, radius: 40 },
            { x: 300, z: 0, radius: 40 }
        ];
    } else if (selectedLevel === 2) {
        // Level 2 (Forest) Track Layout
        checkpoints = [
            { x: 0, z: 0, radius: 45 },
            { x: 0, z: -500, radius: 45 },
            { x: 400, z: -700, radius: 45 },
            { x: 700, z: -400, radius: 45 },
            { x: 500, z: 0, radius: 45 },
            { x: 500, z: 400, radius: 45 },
            { x: 200, z: 600, radius: 45 },
            { x: -300, z: 600, radius: 45 },
            { x: -500, z: 300, radius: 45 },
            { x: -300, z: 0, radius: 45 }
        ];
    } else if (selectedLevel === 3) {
        // Level 3 (Field) Track Layout (Super Long and Fast)
        checkpoints = [
            { x: 0, z: 0, radius: 50 },
            { x: 0, z: -800, radius: 50 },
            { x: -500, z: -1000, radius: 50 },
            { x: -1000, z: -500, radius: 50 },
            { x: -1000, z: 500, radius: 50 },
            { x: -500, z: 1000, radius: 50 },
            { x: 500, z: 1000, radius: 50 },
            { x: 1000, z: 500, radius: 50 },
            { x: 1000, z: -500, radius: 50 },
            { x: 500, z: -800, radius: 50 }
        ];
    }

    // Build visible rings
    const ringGeo = new THREE.TorusGeometry(35, 2, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.6 });
    checkpoints.forEach((cp, i) => {
        let ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(cp.x, 20, cp.z);
        
        let prevCp = checkpoints[i === 0 ? checkpoints.length - 1 : i - 1];
        let nextCp = checkpoints[i === checkpoints.length - 1 ? 0 : i + 1];
        
        let vPrev = new THREE.Vector3(prevCp.x, 0, prevCp.z);
        let vThis = new THREE.Vector3(cp.x, 0, cp.z);
        let vNext = new THREE.Vector3(nextCp.x, 0, nextCp.z);
        
        let dirIn = vThis.clone().sub(vPrev).normalize();
        let dirOut = vNext.clone().sub(vThis).normalize();
        
        let dir = dirIn.clone().add(dirOut).normalize();
        if (dir.lengthSq() < 0.01) dir = dirIn;
        
        ring.lookAt(ring.position.clone().add(dir));
        scene.add(ring);
        checkpointRings.push(ring);
    });

    // Generate Scenery
    if (selectedLevel === 1) {
        const buildingGeo = new THREE.BoxGeometry(40, 1, 40);
        for(let x = -800; x <= 800; x += 60) {
            for(let z = -800; z <= 800; z += 60) {
                let onRoad = false;
                for(let i=0; i<checkpoints.length; i++) {
                    let p1 = checkpoints[i];
                    let p2 = checkpoints[(i+1)%checkpoints.length];
                    let l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.z - p2.z, 2);
                    if (l2 === 0) continue;
                    let t = Math.max(0, Math.min(1, ((x - p1.x) * (p2.x - p1.x) + (z - p1.z) * (p2.z - p1.z)) / l2));
                    let projX = p1.x + t * (p2.x - p1.x);
                    let projZ = p1.z + t * (p2.z - p1.z);
                    let dist = Math.sqrt(Math.pow(x - projX, 2) + Math.pow(z - projZ, 2));
                    if (dist < 45) { // Check slightly wider for buildings
                        onRoad = true;
                        break;
                    }
                }
                if (!onRoad && Math.random() > 0.2) {
                    let height = Math.random() > 0.9 ? 150 + Math.random()*150 : 30 + Math.random()*50;
                    let b = new THREE.Mesh(buildingGeo, new THREE.MeshLambertMaterial({color: 0x555555 + Math.random()*0x333333}));
                    b.scale.y = height;
                    b.position.set(x + (Math.random()*20 - 10), height/2, z + (Math.random()*20 - 10));
                    b.castShadow = true;
                    b.receiveShadow = true;
                    scene.add(b);
                }
            }
        }
    } else if (selectedLevel === 2) {
        const trunkGeo = new THREE.CylinderGeometry(2, 3, 15);
        const trunkMat = new THREE.MeshLambertMaterial({color: 0x5c4033});
        const leavesGeo = new THREE.SphereGeometry(15, 8, 8);
        const leavesMat = new THREE.MeshLambertMaterial({color: 0x228b22});
        
        for(let x = -800; x <= 800; x += 40) {
            for(let z = -800; z <= 800; z += 40) {
                let onRoad = false;
                for(let i=0; i<checkpoints.length; i++) {
                    let p1 = checkpoints[i];
                    let p2 = checkpoints[(i+1)%checkpoints.length];
                    let l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.z - p2.z, 2);
                    if (l2 === 0) continue;
                    let t = Math.max(0, Math.min(1, ((x - p1.x) * (p2.x - p1.x) + (z - p1.z) * (p2.z - p1.z)) / l2));
                    let projX = p1.x + t * (p2.x - p1.x);
                    let projZ = p1.z + t * (p2.z - p1.z);
                    let dist = Math.sqrt(Math.pow(x - projX, 2) + Math.pow(z - projZ, 2));
                    if (dist < 45) { // Track width safe zone
                        onRoad = true;
                        break;
                    }
                }
                // Randomize tree placement
                if (!onRoad && Math.random() > 0.4) {
                    let treeGroup = new THREE.Group();
                    let trunk = new THREE.Mesh(trunkGeo, trunkMat);
                    trunk.position.y = 7.5;
                    trunk.castShadow = true;
                    trunk.receiveShadow = true;
                    let leaves = new THREE.Mesh(leavesGeo, leavesMat);
                    leaves.position.y = 18;
                    leaves.scale.set(1 + Math.random()*0.5, 1 + Math.random()*0.5, 1 + Math.random()*0.5);
                    leaves.castShadow = true;
                    treeGroup.add(trunk);
                    treeGroup.add(leaves);
                    
                    treeGroup.position.set(x + (Math.random()*20 - 10), 0, z + (Math.random()*20 - 10));
                    scene.add(treeGroup);
                }
            }
        }
    }
}

function buildEmergencyVehicle(type: 'ambulance' | 'towtruck'): THREE.Group {
    let group = new THREE.Group();
    
    if (type === 'ambulance') {
        // White box with red cross
        let body = new THREE.Mesh(
            new THREE.BoxGeometry(2.2, 1.5, 4),
            new THREE.MeshLambertMaterial({color: 0xffffff})
        );
        body.position.y = 1.2;
        group.add(body);
        
        // Red cross on top
        let crossH = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 0.1, 0.3),
            new THREE.MeshBasicMaterial({color: 0xff0000})
        );
        crossH.position.y = 2.0;
        group.add(crossH);
        let crossV = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.1, 1.0),
            new THREE.MeshBasicMaterial({color: 0xff0000})
        );
        crossV.position.y = 2.0;
        group.add(crossV);
        
        // Flashing light
        let light = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.3, 0.4),
            new THREE.MeshBasicMaterial({color: 0x0000ff})
        );
        light.position.set(0, 2.1, -1.5);
        light.name = 'flashLight';
        group.add(light);
        
        // Wheels
        let wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12).rotateZ(Math.PI/2);
        let wheelMat = new THREE.MeshLambertMaterial({color: 0x111111});
        [[-1.1, -1.2], [1.1, -1.2], [-1.1, 1.2], [1.1, 1.2]].forEach(pos => {
            let w = new THREE.Mesh(wheelGeo, wheelMat);
            w.position.set(pos[0], 0.4, pos[1]);
            group.add(w);
        });
    } else {
        // Orange/yellow tow truck
        let body = new THREE.Mesh(
            new THREE.BoxGeometry(2.2, 1.2, 5),
            new THREE.MeshLambertMaterial({color: 0xe67e22})
        );
        body.position.y = 1.0;
        group.add(body);
        
        // Cabin
        let cabin = new THREE.Mesh(
            new THREE.BoxGeometry(2.0, 1.0, 1.8),
            new THREE.MeshLambertMaterial({color: 0xd35400})
        );
        cabin.position.set(0, 1.8, -1.2);
        group.add(cabin);
        
        // Crane arm
        let crane = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.2, 3),
            new THREE.MeshLambertMaterial({color: 0x333333})
        );
        crane.position.set(0, 2.0, 1.5);
        crane.rotation.x = -0.3;
        group.add(crane);
        
        // Flashing light
        let light = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.3, 0.4),
            new THREE.MeshBasicMaterial({color: 0xffaa00})
        );
        light.position.set(0, 2.4, -1.5);
        light.name = 'flashLight';
        group.add(light);
        
        // Wheels
        let wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12).rotateZ(Math.PI/2);
        let wheelMat = new THREE.MeshLambertMaterial({color: 0x111111});
        [[-1.1, -1.5], [1.1, -1.5], [-1.1, 1.5], [1.1, 1.5]].forEach(pos => {
            let w = new THREE.Mesh(wheelGeo, wheelMat);
            w.position.set(pos[0], 0.5, pos[1]);
            group.add(w);
        });
    }
    
    return group;
}

function spawnCrashEvent(position: THREE.Vector3) {
    // Don't spawn too many at once
    if (crashEvents.length >= 3) return;
    // Don't spawn too close to existing events
    for (let ev of crashEvents) {
        if (ev.position.distanceTo(position) < 60) return;
    }
    
    let event: CrashEvent = {
        position: position.clone(),
        time: raceTime,
        ambulance: null,
        towTruck: null,
        ambulanceArrived: false,
        towTruckArrived: false,
        yellowFlagActive: true,
        cleanup: false,
        timer: 0
    };
    
    // Spawn ambulance from a distance
    let amb = buildEmergencyVehicle('ambulance');
    let offset1 = new THREE.Vector3(80 + Math.random() * 40, 0, 80 + Math.random() * 40);
    if (Math.random() > 0.5) offset1.x *= -1;
    if (Math.random() > 0.5) offset1.z *= -1;
    amb.position.copy(position).add(offset1);
    scene.add(amb);
    event.ambulance = amb;
    
    // Spawn tow truck from different direction
    let tow = buildEmergencyVehicle('towtruck');
    let offset2 = new THREE.Vector3(-60 - Math.random() * 40, 0, 60 + Math.random() * 40);
    if (Math.random() > 0.5) offset2.x *= -1;
    if (Math.random() > 0.5) offset2.z *= -1;
    tow.position.copy(position).add(offset2);
    scene.add(tow);
    event.towTruck = tow;
    
    crashEvents.push(event);
}

function updateCrashEvents(dt: number) {
    for (let i = crashEvents.length - 1; i >= 0; i--) {
        let ev = crashEvents[i];
        ev.timer += dt;
        
        // Drive ambulance towards crash site
        if (ev.ambulance && !ev.ambulanceArrived) {
            let dir = ev.position.clone().sub(ev.ambulance.position);
            dir.y = 0;
            let dist = dir.length();
            if (dist > 3) {
                dir.normalize().multiplyScalar(25 * dt); // speed
                ev.ambulance.position.add(dir);
                ev.ambulance.rotation.y = Math.atan2(dir.x, dir.z);
            } else {
                ev.ambulanceArrived = true;
            }
        }
        
        // Drive tow truck towards crash site
        if (ev.towTruck && !ev.towTruckArrived) {
            let dir = ev.position.clone().sub(ev.towTruck.position);
            dir.y = 0;
            let dist = dir.length();
            if (dist > 5) {
                dir.normalize().multiplyScalar(20 * dt);
                ev.towTruck.position.add(dir);
                ev.towTruck.rotation.y = Math.atan2(dir.x, dir.z);
            } else {
                ev.towTruckArrived = true;
            }
        }
        
        // Flash lights
        let flashOn = Math.floor(ev.timer * 4) % 2 === 0;
        if (ev.ambulance) {
            let fl = ev.ambulance.getObjectByName('flashLight');
            if (fl) (fl as THREE.Mesh).visible = flashOn;
        }
        if (ev.towTruck) {
            let fl = ev.towTruck.getObjectByName('flashLight');
            if (fl) (fl as THREE.Mesh).visible = !flashOn;
        }
        
        // After both arrive, wait 5 seconds then start cleanup
        if (ev.ambulanceArrived && ev.towTruckArrived && !ev.cleanup && ev.timer > 8) {
            ev.cleanup = true;
            ev.yellowFlagActive = false;
        }
        
        // Cleanup: drive away
        if (ev.cleanup) {
            if (ev.ambulance) {
                ev.ambulance.position.x += 30 * dt;
                ev.ambulance.position.z += 20 * dt;
            }
            if (ev.towTruck) {
                ev.towTruck.position.x -= 30 * dt;
                ev.towTruck.position.z -= 20 * dt;
            }
            
            // Remove after driving away
            if (ev.timer > 15) {
                if (ev.ambulance) scene.remove(ev.ambulance);
                if (ev.towTruck) scene.remove(ev.towTruck);
                crashEvents.splice(i, 1);
            }
        }
    }
}

function isInYellowFlagZone(pos: THREE.Vector3): boolean {
    for (let ev of crashEvents) {
        if (ev.yellowFlagActive && ev.position.distanceTo(pos) < 50) {
            return true;
        }
    }
    return false;
}

function checkCollisions(dt: number) {
    if (gameState !== 'racing') return;
    
    // Player vs AI collision
    for (let ai of opponents) {
        if (ai.crashed || ai.finished) continue;
        let dist = playerVehicleGroup.position.distanceTo(ai.group.position);
        if (dist < 4) {
            // Both take damage
            let impactSpeed = Math.abs(playerSpeed) + ai.speed;
            if (impactSpeed > 15) {
                // Crash!
                damage += 20;
                playerSpeed *= -0.3; // bounce back
                
                // Small chance AI crashes
                if (Math.random() < 0.4) {
                    ai.crashed = true;
                    ai.crashTimer = 0;
                    ai.speed = 0;
                    spawnCrashEvent(ai.group.position);
                }
                
                // Player crash if high damage
                if (damage >= 80 && !playerCrashed) {
                    playerCrashed = true;
                    playerCrashTimer = 0;
                    playerSpeed = 0;
                    spawnCrashEvent(playerVehicleGroup.position);
                }
            } else {
                // Minor bump
                playerSpeed *= 0.5;
                ai.speed *= 0.5;
                damage += 5;
            }
            
            // Push apart
            let pushDir = playerVehicleGroup.position.clone().sub(ai.group.position).normalize();
            playerVehicleGroup.position.add(pushDir.multiplyScalar(0.5));
            ai.group.position.add(pushDir.multiplyScalar(-0.5));
        }
    }
    
    // AI vs AI collision
    for (let i = 0; i < opponents.length; i++) {
        for (let j = i + 1; j < opponents.length; j++) {
            let a = opponents[i], b = opponents[j];
            if (a.crashed || b.crashed || a.finished || b.finished) continue;
            let dist = a.group.position.distanceTo(b.group.position);
            if (dist < 4) {
                let impactSpeed = a.speed + b.speed;
                if (impactSpeed > 20 && Math.random() < 0.3) {
                    // One of them crashes
                    let victim = Math.random() < 0.5 ? a : b;
                    victim.crashed = true;
                    victim.crashTimer = 0;
                    victim.speed = 0;
                    spawnCrashEvent(victim.group.position);
                }
                // Push apart
                let pushDir = a.group.position.clone().sub(b.group.position).normalize();
                a.group.position.add(pushDir.multiplyScalar(0.3));
                b.group.position.add(pushDir.multiplyScalar(-0.3));
                a.speed *= 0.6;
                b.speed *= 0.6;
            }
        }
    }
    
    // Player crash recovery
    if (playerCrashed) {
        playerCrashTimer += dt;
        playerSpeed = 0;
        if (playerCrashTimer > 4) {
            playerCrashed = false;
            playerCrashTimer = 0;
            damage = Math.max(damage - 30, 0);
        }
    }
    
    // AI crash recovery
    opponents.forEach(ai => {
        if (ai.crashed) {
            ai.crashTimer += dt;
            ai.speed = 0;
            if (ai.crashTimer > 6) {
                ai.crashed = false;
                ai.crashTimer = 0;
            }
        }
    });
    
    // Yellow flag: slow down AI near crash zones
    opponents.forEach(ai => {
        if (!ai.crashed && !ai.finished && isInYellowFlagZone(ai.group.position)) {
            if (ai.speed > 15) ai.speed = 15; // Force slow
        }
    });
    
    // Yellow flag: slow down player near crash zones
    if (!playerCrashed && isInYellowFlagZone(playerVehicleGroup.position)) {
        // Show yellow flag indicator (we'll use the existing damage variable)
        if (playerSpeed > 20) playerSpeed *= 0.98; // Gradual slow
    }
}


function createFloatingArrow(color: number = 0xff0000) {
    let group = new THREE.Group();
    group.name = 'floatingArrow';
    
    let mat = new THREE.MeshBasicMaterial({color: color});
    
    // Flat rectangular body
    let body = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.4, 4.0),
        mat
    );
    body.position.z = 1.0; 
    
    // Flat triangular arrowhead (using CylinderGeometry with 3 segments)
    // Points up (+Y), flat against XZ
    let head = new THREE.Mesh(
        new THREE.CylinderGeometry(0, 2.5, 3.5, 3),
        mat
    );
    // Rotate to point forward (-Z) and lay flat
    // Default 3-cylinder has flat side on -Z, point on +Z. Wait, no.
    // Let's just rotate it so it lays flat and points -Z
    head.rotation.x = Math.PI / 2; // Lay flat
    head.rotation.y = Math.PI; // Point -Z (if it was pointing +Z)
    head.rotation.z = Math.PI / 2; // Rotate the triangle to face correct way
    // Actually, simple plane rotated is easier, but let's use Cone for 3D
    
    // Let's rebuild head using a custom shape to be 100% sure it's perfect
    let shape = new THREE.Shape();
    shape.moveTo(-3, 0);   // left
    shape.lineTo(3, 0);    // right
    shape.lineTo(0, -4);   // tip (pointing forward/-Z in 2D)
    shape.lineTo(-3, 0);
    
    let extrudeSettings = { depth: 0.4, bevelEnabled: false };
    let headGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    let headMesh = new THREE.Mesh(headGeo, mat);
    // By default drawn in XY plane.
    // Lay it flat: X stays X, Y becomes -Z.
    headMesh.rotation.x = Math.PI / 2;
    headMesh.position.z = -1.0;
    headMesh.position.y = 0.2; // center it with the body (depth 0.4)
    
    group.add(body);
    group.add(headMesh);
    
    group.position.y = 7; // Float above vehicle
    group.scale.set(1.5, 1.5, 1.5); // Large
    
    let bobGroup = new THREE.Group();
    bobGroup.name = 'floatingArrowBob';
    bobGroup.add(group);
    
    return bobGroup;
}


function buildDetailedVehicle(vDef: any, color: THREE.Color): { group: THREE.Group, wheels: THREE.Mesh[] } {
    let group = new THREE.Group();
    let name = vDef.name.toLowerCase();
    let wheels: THREE.Mesh[] = [];
    
    // ULTRA REALISTIC MATERIALS
    const mat = new THREE.MeshPhysicalMaterial({ 
        color: color, 
        metalness: 0.8, 
        roughness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        envMapIntensity: 2.0
    });
    const tireMat = new THREE.MeshStandardMaterial({
        color: 0x050505,
        metalness: 0.2,
        roughness: 0.8
    }); 
    const rimMat = new THREE.MeshPhysicalMaterial({ 
        color: 0xdddddd, 
        metalness: 1.0, 
        roughness: 0.2,
        clearcoat: 1.0,
        envMapIntensity: 2.0
    });
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.0 });

    if (vDef.type === 'car') {
        if (loadedCarModel) {
            // Use the ULTRA REALISTIC 3D model!
            let realCar = loadedCarModel.clone();
            
            // Try to find the body paint mesh and apply our color
            realCar.traverse((child: any) => {
                if (child.isMesh && child.material) {
                    if (child.name.includes('body') || child.material.name.includes('body') || child.material.name.includes('paint') || child.name === 'Object_10' || child.name.includes('Mesh')) {
                        child.material = child.material.clone();
                        if (child.material.color) {
                            child.material.color.copy(color);
                            child.material.metalness = 0.8;
                            child.material.roughness = 0.2;
                            child.material.clearcoat = 1.0;
                        }
                    }
                    if (child.name.includes('wheel') || child.name.includes('tire')) {
                        wheels.push(child);
                    }
                }
            });
            
            group.add(realCar);
            
            const hl = new THREE.PointLight(0xffffff, 2.0, 50);
            hl.position.set(0, 0.8, -2.5);
            group.add(hl);
            const tl = new THREE.PointLight(0xff0000, 2.0, 10);
            tl.position.set(0, 0.8, 2.5);
            group.add(tl);
            
            if (wheels.length === 0) {
                let dummyWheel = new THREE.Mesh();
                wheels.push(dummyWheel);
            }
        } else {
            // Fallback while loading
            let box = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 4.2), mat);
            box.position.y = 0.5;
            group.add(box);
            let dummyWheel = new THREE.Mesh();
            wheels.push(dummyWheel);
        }
    } else {
        // Motorcycle logic
        if (loadedMotoModel) {
            let realMoto = loadedMotoModel.clone();
            
            realMoto.traverse((child: any) => {
                if (child.isMesh && child.material) {
                    if (child.name.toLowerCase().includes('body') || child.name.toLowerCase().includes('paint') || child.name.includes('Mesh')) {
                        child.material = child.material.clone();
                        if (child.material.color) {
                            child.material.color.copy(color);
                        }
                    }
                    if (child.name.toLowerCase().includes('wheel') || child.name.toLowerCase().includes('tire')) {
                        wheels.push(child);
                    }
                }
            });
            
            // Adjust to align with the game's direction
            // If the model default faces wrong, we might need rotation, but let's assume it faces +Z or -Z.
            // If we need to flip it later we can.
            group.add(realMoto);
            
            const hl = new THREE.PointLight(0xffffff, 2.0, 50);
            hl.position.set(0, 0.8, -1.5);
            group.add(hl);
            
            if (wheels.length === 0) {
                let dummyWheel = new THREE.Mesh();
                wheels.push(dummyWheel);
            }
        } else {
            // Fallback while loading
            let shape = new THREE.Shape();
            shape.moveTo(-1.2, 0.3);
            shape.lineTo(1.2, 0.3); 
            shape.lineTo(1.4, 0.7); // front
            shape.lineTo(0.5, 1.2); // windshield
            shape.lineTo(-0.2, 1.0); // seat
            shape.lineTo(-1.4, 1.2); // tail
            shape.lineTo(-1.2, 0.3);
            
            const extrudeSettings = { depth: 0.6, bevelEnabled: true, bevelSegments: 3, steps: 2, bevelSize: 0.05, bevelThickness: 0.05 };
            const motoGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            motoGeo.center();
            const body = new THREE.Mesh(motoGeo, mat);
            body.rotation.y = Math.PI / 2;
            body.position.y = 0.6;
            group.add(body);

            const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.2, 32).rotateZ(Math.PI/2);
            const rimGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.22, 16).rotateZ(Math.PI/2);
            [[-1.2, 0], [1.2, 0]].forEach(pos => {
                let w = new THREE.Mesh(wheelGeo, tireMat);
                w.position.set(0, 0.45, pos[0]);
                let rim = new THREE.Mesh(rimGeo, rimMat);
                w.add(rim);
                group.add(w);
                wheels.push(w);
            });
            
            const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), lightMat);
            hl.position.set(0, 0.8, -1.4);
            group.add(hl);
        }
    }
    
    let underglow = new THREE.PointLight(color, 2.0, 5.0);
    underglow.position.set(0, 0.2, 0);
    group.add(underglow);
    
    return { group, wheels };
}


function createPlayerVehicle(type: string) {
    if (playerVehicleGroup) scene.remove(playerVehicleGroup);
    
    playerVehicleGroup = new THREE.Group();
    let cp = checkpoints[0];
    let cpNext = checkpoints[1];
    let dx = cpNext.x - cp.x;
    let dz = cpNext.z - cp.z;
    let angle = Math.atan2(dx, dz) + Math.PI;
    playerVehicleGroup.position.set(cp.x, 0, cp.z);
    
    let vDef = VEHICLES.find(v => v.id === vehicleType) || VEHICLES[0];
    
    let color = new THREE.Color(vDef.type === 'car' ? 0x27ae60 : 0xe67e22);
    let hsl = {h:0, s:0, l:0};
    color.getHSL(hsl);
    hsl.h = (hsl.h + (vDef.hueRotate / 360)) % 1.0;
    if (hsl.h < 0) hsl.h += 1.0;
    color.setHSL(hsl.h, hsl.s, hsl.l);

    let buildRes = buildDetailedVehicle(vDef, color);
    playerVehicleGroup.add(buildRes.group);
    playerWheels = buildRes.wheels;
    
    let playerArrow = createFloatingArrow(0xff0000); // Red arrow for player
    playerVehicleGroup.add(playerArrow);
    
    scene.add(playerVehicleGroup);

    playerSpeed = 0;
    playerHeading = angle;
    playerVehicleGroup.rotation.y = playerHeading;
    

}

function selectVehicle(type: string) {
    vehicleType = type;
    createPlayerVehicle(type);
    applyUpgrades();
    updateGarageUI();
}

function spawnOpponents() {
    opponents.forEach(o => scene.remove(o.group));
    opponents = [];
    
    let cp = checkpoints[0];
    let cpNext = checkpoints[1];
    let dx = cpNext.x - cp.x;
    let dz = cpNext.z - cp.z;
    let angle = Math.atan2(dx, dz) + Math.PI;

    let numOpponents = selectedLevel === 1 ? 3 : (selectedLevel === 2 ? 9 : 19);

    for (let i = 0; i < numOpponents; i++) {
        let group = new THREE.Group();
        
        // Staggered grid starting positions
        // Row depends on index. 2 lanes.
        let row = Math.floor((i + 1) / 2); // Player is at row 0, col 0. AI starts at i+1 essentially
        let col = (i + 1) % 2 === 0 ? 1 : -1;
        
        // Offset from center. Z offsets by row, X offsets by lane.
        // Needs to be rotated by track heading so they align with the track start!
        let offsetX = col * 12; // 12 units apart horizontally
        let offsetZ = row * 15; // 15 units apart vertically (behind)
        
        let startPos = new THREE.Vector3(offsetX, 0, offsetZ);
        startPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        
        group.position.set(cp.x + startPos.x, 0, cp.z + startPos.z);
        
        let randomDef = VEHICLES[Math.floor(Math.random() * VEHICLES.length)];
        let color = new THREE.Color().setHSL(Math.random(), 0.8, 0.5);
        
        let buildRes = buildDetailedVehicle(randomDef, color);
        group.add(buildRes.group);
        
        let aiArrow = createFloatingArrow(0x00ff00);
        group.add(aiArrow);
        
        scene.add(group);
        
        opponents.push({
            group: group,
            wheels: buildRes.wheels,
            speed: 0,
            heading: angle,
            targetCpIndex: 1,
            type: randomDef.type,
            maxSpeed: selectedLevel === 1 ? (30 + Math.random() * (randomDef.maxSpeed * 0.6)) : (selectedLevel === 2 ? (40 + Math.random() * (randomDef.maxSpeed * 0.8)) : (50 + Math.random() * (randomDef.maxSpeed * 1.0))),
            finished: false,
            finishOrder: 0,
            acceleration: selectedLevel === 1 ? randomDef.acceleration * 0.8 : (selectedLevel === 2 ? randomDef.acceleration * 1.0 : randomDef.acceleration * 1.2),
            crashed: false,
            crashTimer: 0
        });
    }
}


function initAudio() {
    if (isAudioStarted) return;
    isAudioStarted = true;
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Stressful BGM
    let bgmGain = audioCtx.createGain();
    bgmGain.gain.value = 0.1;
    bgmGain.connect(audioCtx.destination);
    
    bgmOsc1 = audioCtx.createOscillator();
    bgmOsc1.type = 'sawtooth';
    bgmOsc1.frequency.value = 55; // Low bass pulse
    bgmOsc1.connect(bgmGain);
    bgmOsc1.start();
    
    // Modulate the bass for tension
    let lfo = audioCtx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 8; // 8Hz pulsing
    let lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 50;
    lfo.connect(lfoGain);
    lfoGain.connect(bgmOsc1.frequency);
    lfo.start();

    // Engine sound
    engineGain = audioCtx.createGain();
    engineGain.gain.value = 0.05;
    engineGain.connect(audioCtx.destination);
    engineOsc = audioCtx.createOscillator();
    engineOsc.type = 'triangle';
    engineOsc.connect(engineGain);
    engineOsc.start();
}

function updateEngineSound() {
    if (!audioCtx || !engineOsc) return;
    let vDef = VEHICLES.find(v => v.id === vehicleType) || VEHICLES[0];
    
    // Calculate pitch based on speed
    let speedRatio = Math.abs(playerSpeed) / MAX_SPEED;
    let basePitch = vDef.type === 'moto' ? 150 : 80;
    let maxPitch = vDef.type === 'moto' ? 600 : 300;
    
    engineOsc.frequency.setTargetAtTime(basePitch + (maxPitch - basePitch) * speedRatio, audioCtx.currentTime, 0.1);
}


function startRace() {
    initAudio();
    let vDef = VEHICLES.find(v => v.id === vehicleType) || VEHICLES[0];
    MAX_SPEED = getVehicleMaxSpeed(vDef);
    ACCELERATION = vDef.acceleration;
    TURN_SPEED = 1.5 * vDef.handling;
    
    createEnvironment();
    createPlayerVehicle(vehicleType);

    
    uiGarage.style.display = 'none';
    uiHud.style.display = 'block';
    uiHudBottom.style.display = 'flex';
    document.getElementById('minimap')!.style.display = 'block';
    gameState = 'countdown';
    spawnOpponents();
    startCountdown();
}



function startCountdown() {
    let count = 3;
    const cdEl = document.getElementById('countdown')!;
    cdEl.style.display = 'block';
    
    let interval = setInterval(() => {
        cdEl.innerText = count.toString();
        if (count === 0) {
            cdEl.innerText = 'GO!';
            gameState = 'racing';
            setTimeout(() => cdEl.style.display = 'none', 1000);
            clearInterval(interval);
        }
        count--;
    }, 1000);
}

function setupMobileControls() {
    const bindBtn = (id: string, downFlag: string) => {
        const el = document.getElementById(id);
        if (!el) return;
        const down = (e: Event) => { e.preventDefault(); (window as any)[downFlag] = true; };
        const up = (e: Event) => { e.preventDefault(); (window as any)[downFlag] = false; };
        
        el.addEventListener('touchstart', down, { passive: false });
        el.addEventListener('mousedown', down);
        el.addEventListener('touchend', up, { passive: false });
        el.addEventListener('mouseup', up);
        el.addEventListener('mouseleave', up);
    };
    bindBtn('btn-gas', 'gasPressed');
    bindBtn('btn-brake', 'brakePressed');
    bindBtn('btn-left', 'leftPressed');
    bindBtn('btn-right', 'rightPressed');
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


function updateGameLogic(dt: number) {
    if (gameState === 'racing') {
        raceTime += dt;
        
        // Format time
        let m = Math.floor(raceTime / 60);
        let s = Math.floor(raceTime % 60);
        let ms = Math.floor((raceTime * 100) % 100);
        document.getElementById('time-val')!.innerText = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}.${ms < 10 ? '0' : ''}${ms}`;
        
        // Calculate Rankings
        // Count how many AI have already finished - they are all ahead of player
        let finishedAICount = opponents.filter(ai => ai.finished).length;
        
        // Among non-finished racers, rank by checkpoint progress + distance
        let activeRacers: {isPlayer: boolean, cp: number, distSq: number}[] = [];
        activeRacers.push({
            isPlayer: true,
            cp: nextCheckpointIndex,
            distSq: Math.pow(checkpoints[nextCheckpointIndex].x - playerVehicleGroup.position.x, 2) + 
                    Math.pow(checkpoints[nextCheckpointIndex].z - playerVehicleGroup.position.z, 2)
        });
        opponents.forEach(ai => {
            if (!ai.finished) {
                activeRacers.push({
                    isPlayer: false,
                    cp: ai.targetCpIndex,
                    distSq: Math.pow(checkpoints[ai.targetCpIndex].x - ai.group.position.x, 2) + 
                            Math.pow(checkpoints[ai.targetCpIndex].z - ai.group.position.z, 2)
                });
            }
        });
        // Sort: highest CP first, then closest to next CP
        activeRacers.sort((a, b) => {
            if (a.cp !== b.cp) return b.cp - a.cp;
            return a.distSq - b.distSq;
        });
        
        let currentPlayerPosition = finishedAICount + activeRacers.findIndex(r => r.isPlayer) + 1;
        // Make it globally available for the finish block
        (window as any).currentPlayerPosition = currentPlayerPosition;
        document.getElementById('pos-val')!.innerText = `${currentPlayerPosition}/${opponents.length + 1}`;
        document.getElementById('cp-val')!.innerText = `${nextCheckpointIndex === 0 ? 10 : nextCheckpointIndex}/10`;

        // Checkpoints
        let cp = checkpoints[nextCheckpointIndex];
        let dx = playerVehicleGroup.position.x - cp.x;
        let dz = playerVehicleGroup.position.z - cp.z;
        if (Math.sqrt(dx*dx + dz*dz) < cp.radius) {
            nextCheckpointIndex++;
            
            // Race ends when all 10 checkpoints are passed
            if (nextCheckpointIndex >= checkpoints.length) {
                gameState = 'finished';
                
                // Prize based on position: 1st=200€, 2nd=100€, 3rd=50€, 4th=50€
                let pos = (window as any).currentPlayerPosition || 1;
                let prize = 50;
                if (selectedLevel === 1) {
                    if (pos === 1) prize = 200;
                    else if (pos === 2) prize = 100;
                    else prize = 50;
                } else if (selectedLevel === 2) {
                    if (pos === 1) prize = 1000;
                    else if (pos === 2) prize = 500;
                    else if (pos === 3) prize = 300;
                    else if (pos === 4) prize = 250;
                    else if (pos >= 5 && pos <= 10) prize = 200;
                    else prize = 50;
                } else if (selectedLevel === 3) {
                    if (pos === 1) prize = 10000;
                    else if (pos === 2) prize = 5000;
                    else if (pos === 3) prize = 4000;
                    else if (pos === 4) prize = 3000;
                    else if (pos >= 5 && pos <= 9) prize = 2000;
                    else if (pos >= 10 && pos <= 20) prize = 1000;
                    else prize = 500;
                                }
                
                money += prize;
                saveProgress();
                alert(`${pos}. place!\nTime: ${document.getElementById('time-val')!.innerText}\nYou won $${prize}!`);
                location.reload();
            }
            
            // Always update the checkpoint HUD
            let displayCp = nextCheckpointIndex === 0 ? 10 : nextCheckpointIndex;
            document.getElementById('cp-val')!.innerText = `${displayCp}/10`;
        }

        // Nitro regen
        if (!keys['ShiftLeft'] && nitro < 100) {
            nitro += dt * 5;
            if (nitro > 100) nitro = 100;
        }
        document.getElementById('nitro-bar')!.style.width = `${nitro}%`;

        // Update AI
        opponents.forEach(ai => {
            // Skip finished or crashed AI
            if (ai.finished || ai.crashed) {
                ai.speed *= 0.95; // slow to stop
                if (ai.speed < 0.5) ai.speed = 0;
                return;
            }
            
            let targetCp = checkpoints[ai.targetCpIndex];
            let adx = targetCp.x - ai.group.position.x;
            let adz = targetCp.z - ai.group.position.z;
            let dist = Math.sqrt(adx*adx + adz*adz);
            
            if (dist < targetCp.radius) {
                ai.targetCpIndex++;
                // AI finished all 10 checkpoints
                if (ai.targetCpIndex >= checkpoints.length) {
                    ai.finished = true;
                    ai.targetCpIndex = checkpoints.length - 1; // stay on last
                    // Count how many AI already finished
                    ai.finishOrder = opponents.filter(o => o.finished).length;
                    return;
                }
                targetCp = checkpoints[ai.targetCpIndex];
                adx = targetCp.x - ai.group.position.x;
                adz = targetCp.z - ai.group.position.z;
            }

            let targetHeading = Math.atan2(adx, adz) + Math.PI;
            
            // Turn towards target
            let angleDiff = targetHeading - ai.heading;
            // Normalize angle diff to -PI to PI
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            ai.heading += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 1.5 * dt);
            
            ai.speed += (ai.acceleration || 20) * dt;
            if (ai.speed > ai.maxSpeed) ai.speed = ai.maxSpeed;
            
            ai.group.rotation.y = ai.heading;
            const moveDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), ai.heading);
            ai.group.position.add(moveDir.multiplyScalar(ai.speed * dt));

            // Update AI 3D Arrow
            let bobGroup = ai.group.getObjectByName('floatingArrowBob');
            if (bobGroup) {
                let arrow = bobGroup.getObjectByName('floatingArrow');
                if (arrow) {
                    let cpTarget = checkpoints[ai.targetCpIndex];
                    let aadx = cpTarget.x - ai.group.position.x;
                    let aadz = cpTarget.z - ai.group.position.z;
                    let targetAngle = Math.atan2(aadx, aadz) + Math.PI;
                    arrow.rotation.y = targetAngle - ai.heading;
                }
                bobGroup.position.y = Math.sin(Date.now() * 0.005 + ai.group.id) * 1.0;
            }

            // Lean for AI moto
            if (ai.type === 'moto') {
                const body = ai.group.children[0];
                let lean = Math.sign(angleDiff) * -0.5;
                body.rotation.z += (lean - body.rotation.z) * 5 * dt;
            }
        });

        // Update Player 3D Arrow
        let bobGroup = playerVehicleGroup.getObjectByName('floatingArrowBob');
        if (bobGroup && gameState === 'racing') {
            let arrow = bobGroup.getObjectByName('floatingArrow');
            if (arrow) {
                let cpTarget = checkpoints[nextCheckpointIndex];
                let adx = cpTarget.x - playerVehicleGroup.position.x;
                let adz = cpTarget.z - playerVehicleGroup.position.z;
                
                // Angle towards checkpoint
                let targetAngle = Math.atan2(adx, adz) + Math.PI; 
                
                // The playerVehicleGroup is already rotated by playerHeading.
                // We need to rotate the arrow relative to the vehicle so its world rotation is targetAngle.
                arrow.rotation.y = targetAngle - playerHeading;
            }
            // Bob up and down
            bobGroup.position.y = Math.sin(Date.now() * 0.005) * 1.0;
        }
    }
}

function updatePhysics(dt: number) {
    if (gameState !== 'racing') return;

    let isAccelerating = (keys['KeyW'] || keys['w']) || keys['ArrowUp'] || (window as any).gasPressed;
    let isBraking = (keys['KeyS'] || keys['s']) || keys['ArrowDown'] || (window as any).brakePressed;
    let isLeft = (keys['KeyA'] || keys['a']) || keys['ArrowLeft'] || (window as any).leftPressed;
    let isRight = (keys['KeyD'] || keys['d']) || keys['ArrowRight'] || (window as any).rightPressed;

    // Acceleration & Braking
    if (isAccelerating) {
        playerSpeed += ACCELERATION * dt;
    } else if (isBraking) {
        playerSpeed -= BRAKING * dt;
    } else {
        // Natural friction/drag
        playerSpeed *= Math.pow(FRICTION, dt * 60);
    }

    // Reverse speed limit
    if (playerSpeed < -20) playerSpeed = -20;
    // Max forward speed
    if (playerSpeed > MAX_SPEED) playerSpeed = MAX_SPEED;
    
    // Stop completely if very slow and no input
    if (Math.abs(playerSpeed) < 0.5 && !isAccelerating && !isBraking) {
        playerSpeed = 0;
    }


    // Nitro
    if (keys['ShiftLeft'] && nitro > 0) {
        playerSpeed += 30 * dt;
        nitro -= 30 * dt;
    }

    // Steering
    // Cannot steer if not moving
    if (Math.abs(playerSpeed) > 1.0) {
        // Turn speed scales down slightly at very high speeds for stability
        let speedFactor = Math.max(0.3, 1.0 - (playerSpeed / MAX_SPEED) * 0.5);
        let turnAmount = TURN_SPEED * dt * speedFactor;
        
        // Reverse steering logic
        let steerDir = playerSpeed > 0 ? 1 : -1;

        if (isLeft) playerHeading += turnAmount * steerDir;
        if (isRight) playerHeading -= turnAmount * steerDir;
    }

    playerVehicleGroup.rotation.y = playerHeading;

    // Move forward
    const moveDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerHeading);
    playerVehicleGroup.position.add(moveDir.multiplyScalar(playerSpeed * dt));

    // Motorcycle Lean
    if (vehicleType === 'moto') {
        const body = playerVehicleGroup.children[0];
        let targetLean = 0;
        if (isLeft && playerSpeed > 5) targetLean = 0.5; // rad
        if (isRight && playerSpeed > 5) targetLean = -0.5;
        
        // Smoothly interpolate lean
        body.rotation.z += (targetLean - body.rotation.z) * 5 * dt;
    }

    // Update UI
    uiSpeed.innerText = Math.abs(Math.round(playerSpeed * 3.6)).toString(); // m/s to km/h
    
    // Yellow flag warning
    if (isInYellowFlagZone(playerVehicleGroup.position) && !playerCrashed) {
        document.getElementById('speedometer')!.style.color = '#f1c40f';
    } else if (playerCrashed) {
        document.getElementById('speedometer')!.style.color = '#e74c3c';
    } else {
        document.getElementById('speedometer')!.style.color = '';
    }

    
}

function updateCamera() {
    // Basic chase camera
    const offset = new THREE.Vector3(0, 3, 8); // 8 units behind, 3 units up
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerHeading);
    
    const targetCamPos = playerVehicleGroup.position.clone().add(offset);
    camera.position.lerp(targetCamPos, 0.1);
    
    // Look a bit ahead of the car
    const lookTarget = playerVehicleGroup.position.clone().add(new THREE.Vector3(0, 1, 0));
    camera.lookAt(lookTarget);
}



function drawMinimap() {
    if (gameState !== 'racing' && gameState !== 'countdown') return;
    
    let canvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    let ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let W = canvas.width;
    let H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    
    // Find bounds of all checkpoints
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    checkpoints.forEach(cp => {
        if (cp.x < minX) minX = cp.x;
        if (cp.x > maxX) maxX = cp.x;
        if (cp.z < minZ) minZ = cp.z;
        if (cp.z > maxZ) maxZ = cp.z;
    });
    
    let pad = 80; // padding in world units
    minX -= pad; maxX += pad; minZ -= pad; maxZ += pad;
    let rangeX = maxX - minX;
    let rangeZ = maxZ - minZ;
    let scale = Math.min((W - 20) / rangeX, (H - 20) / rangeZ);
    let offX = (W - rangeX * scale) / 2;
    let offZ = (H - rangeZ * scale) / 2;
    
    function toScreen(wx: number, wz: number): [number, number] {
        return [(wx - minX) * scale + offX, (wz - minZ) * scale + offZ];
    }
    
    // Draw track lines
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < checkpoints.length; i++) {
        let [sx, sy] = toScreen(checkpoints[i].x, checkpoints[i].z);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
    }
    // Close the loop back to start
    let [sx0, sy0] = toScreen(checkpoints[0].x, checkpoints[0].z);
    ctx.lineTo(sx0, sy0);
    ctx.stroke();
    
    // Draw checkpoint dots
    checkpoints.forEach((cp, i) => {
        let [sx, sy] = toScreen(cp.x, cp.z);
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#666';
        ctx.fill();
        
        // Number
        ctx.fillStyle = '#888';
        ctx.font = '8px sans-serif';
        ctx.fillText((i + 1).toString(), sx + 4, sy - 2);
    });
    
    // Highlight next checkpoint for player
    if (nextCheckpointIndex < checkpoints.length) {
        let ncp = checkpoints[nextCheckpointIndex];
        let [nx, ny] = toScreen(ncp.x, ncp.z);
        ctx.beginPath();
        ctx.arc(nx, ny, 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // Draw opponents (blue dots)
    opponents.forEach(ai => {
        let [ax, ay] = toScreen(ai.group.position.x, ai.group.position.z);
        ctx.beginPath();
        ctx.arc(ax, ay, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#3498db';
        ctx.fill();
    });
    
    // Draw player (red dot, slightly bigger)
    if (playerVehicleGroup) {
        let [px, py] = toScreen(playerVehicleGroup.position.x, playerVehicleGroup.position.z);
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#e74c3c';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    // Wheel animation
    if (gameState === 'racing') {
        const wheelRotSpeed = (playerSpeed * dt) / 0.4;
        playerWheels.forEach(w => w.rotation.x -= wheelRotSpeed);
        
        opponents.forEach(o => {
            const oppRotSpeed = (o.speed * dt) / 0.4;
            o.wheels.forEach(w => w.rotation.x -= oppRotSpeed);
        });
    }

    updatePhysics(dt);
    checkCollisions(dt);
    updateCrashEvents(dt);
    updateGameLogic(dt);
    updateCamera();

    drawMinimap();
    renderer.render(scene, camera);
}


// Kickoff
init();




function upgradeSpeed(id: string) {
    let cost = 200; // Fixed cost for +10 km/h
    if (!vehicleUpgrades[id]) vehicleUpgrades[id] = { speedUpgrades: 0 };
    
    if (vehicleUpgrades[id].speedUpgrades >= 5) {
        alert('Maximum upgrades reached for this vehicle!');
        return;
    }
    
    if (money < cost) {
        alert('Not enough money! You need $200 to upgrade speed.');
        return;
    }
    
    money -= cost;
    vehicleUpgrades[id].speedUpgrades += 1;
    saveProgress();
    updateGarageUI();
}

// Helper to get max speed
function getVehicleMaxSpeed(vDef: any) {
    let upgrades = vehicleUpgrades[vDef.id] ? vehicleUpgrades[vDef.id].speedUpgrades : 0;
    return vDef.maxSpeed + (upgrades * 5);
}

function buyVehicle(id: string) {
    let vDef = VEHICLES.find(v => v.id === id);
    if (!vDef) return;
    if (unlockedVehicles.includes(id)) return;
    if (money < vDef.price) {
        alert('Not enough money! You need $' + vDef.price);
        return;
    }
    
    money -= vDef.price;
    unlockedVehicles.push(id);
    saveProgress();
    vehicleType = id;
    updateGarageUI();
}

function updateGarageUI() {
    document.getElementById('money-val')!.innerText = money.toString();
    document.getElementById('shop-money-val')!.innerText = money.toString();

    // Update Level Selection UI
    const btnLevel1 = document.getElementById('btn-level-1');
    const btnLevel2 = document.getElementById('btn-level-2');
    const btnLevel3 = document.getElementById('btn-level-3');
    const lblLevel2 = document.getElementById('lbl-level-2');
    const lblLevel3 = document.getElementById('lbl-level-3');
    
    if (btnLevel1 && btnLevel2 && btnLevel3) {
        btnLevel1.style.border = selectedLevel === 1 ? '2px solid white' : '2px solid transparent';
        btnLevel2.style.border = selectedLevel === 2 ? '2px solid white' : '2px solid transparent';
        btnLevel3.style.border = selectedLevel === 3 ? '2px solid white' : '2px solid transparent';
        
        btnLevel1.style.background = '#27ae60';
        btnLevel2.style.background = level2Unlocked ? '#27ae60' : '#7f8c8d';
        btnLevel3.style.background = level3Unlocked ? '#27ae60' : '#7f8c8d';
        

        
        if (lblLevel2) lblLevel2.innerText = level2Unlocked ? '1st Prize: $1000 | 9 Opponents' : 'Unlock: $1000 | 9 Opponents';
        if (lblLevel3) lblLevel3.innerText = level3Unlocked ? '1st Prize: $3000 | 19 Opponents' : 'Unlock: $10,000 | 19 Opponents';
    }

    let selVeh = VEHICLES.find(v => v.id === vehicleType);
    let selEl = document.getElementById('selected-vehicle-name');
    if (selEl && selVeh) selEl.innerText = selVeh.name;

    // Owned Vehicles
    let ownedHtml = '';
    VEHICLES.forEach(v => {
        if (unlockedVehicles.includes(v.id)) {
            let isSelected = (vehicleType === v.id);
            let border = isSelected ? 'border: 3px solid #f1c40f;' : 'border: 3px solid transparent;';
            let selectedLabel = isSelected ? '<div style="color: #f1c40f; font-size: 12px;">SELECTED</div>' : '';
            ownedHtml += `
                <div class="veh-select-btn" data-id="${v.id}" style="background: #34495e; padding: 15px; border-radius: 10px; cursor: pointer; text-align: center; width: 200px; ${border}">
                    <img src="${v.image}" alt="${v.name}" style="width: 100%; border-radius: 5px; margin-bottom: 10px; filter: hue-rotate(${v.hueRotate}deg);">
                    <h3 style="margin: 0 0 5px 0; color: ${v.type==='car'?'#2ecc71':'#e67e22'}; font-size: 16px;">${v.name}</h3>
                    <div style="font-size: 12px; margin-bottom: 5px; color: #bdc3c7;">
                        Spd: ${getVehicleMaxSpeed(v)} (+${(vehicleUpgrades[v.id]?.speedUpgrades || 0)*10}) | Acc: ${v.acceleration}
                    </div>
                    <button class="btn btn-upgrade" data-id="${v.id}" data-locked="${(vehicleUpgrades[v.id]?.speedUpgrades || 0) >= 5}" style="background: ${(vehicleUpgrades[v.id]?.speedUpgrades || 0) >= 5 ? '#95a5a6' : '#3498db'}; width: 100%; font-size: 12px; padding: 5px; margin-bottom: 5px; border-radius: 5px;">${(vehicleUpgrades[v.id]?.speedUpgrades || 0) >= 5 ? 'MAX SPEED' : '+10 Speed ($200)'}</button>
                    ${selectedLabel}
                </div>
            `;
        }
    });
    let ownedEl = document.getElementById('owned-vehicles');
    if (ownedEl) ownedEl.innerHTML = ownedHtml;
    
    // Shop Tabs
    let tabCar = document.getElementById('shop-tab-car');
    let tabMoto = document.getElementById('shop-tab-moto');
    if (tabCar && tabMoto) {
        tabCar.style.background = shopCategory === 'car' ? '#27ae60' : '#34495e';
        tabMoto.style.background = shopCategory === 'moto' ? '#e67e22' : '#34495e';
        
        // Remove old listeners to prevent duplicates (simple way: clone)
        let newCar = tabCar.cloneNode(true);
        tabCar.parentNode?.replaceChild(newCar, tabCar);
        newCar.addEventListener('click', () => { shopCategory = 'car'; updateGarageUI(); });
        
        let newMoto = tabMoto.cloneNode(true);
        tabMoto.parentNode?.replaceChild(newMoto, tabMoto);
        newMoto.addEventListener('click', () => { shopCategory = 'moto'; updateGarageUI(); });
    }

    // Generate Shop Vehicles based on category and Level 3 unlock
    let shopHtml = '';
    // Determine the top 5 expensive ids for cars and motos
    let cars = VEHICLES.filter(v => v.type === 'car').sort((a,b) => a.price - b.price);
    let motos = VEHICLES.filter(v => v.type === 'moto').sort((a,b) => a.price - b.price);
    let topCars = cars.slice(-5).map(v => v.id);
    let topMotos = motos.slice(-5).map(v => v.id);
    
    VEHICLES.forEach(v => {
        if (v.price === 0) return; // Skip starter
        if (v.type !== shopCategory) return; // Only show current category
        
        let isTop5 = topCars.includes(v.id) || topMotos.includes(v.id);
        
        let isLocked = isTop5 && !level3Unlocked;
        let isOwned = unlockedVehicles.includes(v.id);
        let btnText = isLocked ? 'Unlocks at Level 3' : (isOwned ? 'OWNED' : `Buy ($${v.price})`);
        let btnColor = isLocked ? '#e74c3c' : (isOwned ? '#7f8c8d' : (v.type === 'car' ? '#27ae60' : '#e67e22'));
        let opacity = (isOwned || isLocked) ? '0.5' : '1.0';
        let disabledAttr = isLocked ? 'disabled' : '';

        shopHtml += `
            <div style="background: #34495e; padding: 15px; border-radius: 10px; width: 200px; text-align: center; opacity: ${opacity};">
                <img src="${v.image}" alt="${v.name}" style="width: 100%; border-radius: 5px; margin-bottom: 10px; filter: hue-rotate(${v.hueRotate}deg);">
                <h3 style="margin: 0 0 5px 0; color: ${v.type==='car'?'#2ecc71':'#e67e22'}; font-size: 16px;">${v.name}</h3>
                <div style="font-size: 12px; margin-bottom: 10px; color: #bdc3c7;">
                    Spd: ${v.maxSpeed} | Acc: ${v.acceleration}
                </div>
                <button class="btn shop-buy-btn" data-id="${v.id}" data-locked="${isLocked}" ${disabledAttr} style="background: ${btnColor}; width: 100%; font-size: 14px; padding: 10px; margin: 0;">${btnText}</button>
            </div>
        `;
    });
    let shopEl = document.getElementById('shop-vehicles');
    if (shopEl) shopEl.innerHTML = shopHtml;

    // Bind upgrade buttons
    document.querySelectorAll('.btn-upgrade').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if ((e.currentTarget as HTMLElement).getAttribute('data-locked') === 'true') return;
            let id = (e.currentTarget as HTMLElement).getAttribute('data-id');
            if (id) upgradeSpeed(id);
        });
    });

    // Bind owned select buttons
    document.querySelectorAll('.veh-select-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            let id = (e.currentTarget as HTMLElement).getAttribute('data-id');
            if (id) {
                vehicleType = id;
                updateGarageUI();
            }
        });
    });

    // Bind shop buy buttons
    document.querySelectorAll('.shop-buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            let el = e.currentTarget as HTMLElement;
            if (el.getAttribute('data-locked') === 'true') return;
            let id = el.getAttribute('data-id');
            if (id) buyVehicle(id);
        });
    });
}
async function init() {

    // Setup Three.js
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    clock = new THREE.Clock();

    createEnvironment();

    await loadProgress();
    updateGarageUI();


    // Bind UI
    uiGarage = document.getElementById('garage-screen')!;
    uiHud = document.getElementById('hud')!;
    uiHudBottom = document.getElementById('hud-bottom')!;
    uiSpeed = document.getElementById('speed-val')!;
    
    document.getElementById('btn-level-1')?.addEventListener('click', () => {
        selectedLevel = 1;
        updateGarageUI();
    });
    
    document.getElementById('btn-level-2')?.addEventListener('click', () => {
        if (level2Unlocked) {
            selectedLevel = 2;
            updateGarageUI();
        } else {
            if (money >= 1000) {
                money -= 1000;
                level2Unlocked = true;
                selectedLevel = 2;
                saveProgress();
                updateGarageUI();
            } else {
                alert('Not enough money to unlock Level 2! You need $1000.');
            }
        }
    });
    
    document.getElementById('btn-level-3')?.addEventListener('click', () => {
        if (level3Unlocked) {
            selectedLevel = 3;
            updateGarageUI();
        } else {
            if (money >= 10000) {
                money -= 10000;
                level3Unlocked = true;
                selectedLevel = 3;
                saveProgress();
                updateGarageUI();
            } else {
                alert('Not enough money to unlock Level 3! You need $10000.');
            }
        }
    });


    document.getElementById('btn-open-shop')?.addEventListener('click', () => { document.getElementById('shop-screen')!.style.display = 'flex'; });
    document.getElementById('btn-show-owned')?.addEventListener('click', () => { 
        document.getElementById('shop-screen')!.style.display = 'none';
        document.getElementById('owned-screen')!.style.display = 'flex';
        updateGarageUI();
    });
    document.getElementById('btn-close-owned')?.addEventListener('click', () => { 
        document.getElementById('owned-screen')!.style.display = 'none'; 
    });
    document.getElementById('btn-close-shop')?.addEventListener('click', () => { document.getElementById('shop-screen')!.style.display = 'none'; });
    document.getElementById('btn-start-race')?.addEventListener('click', startRace);


    // Input Listeners

    window.addEventListener('keydown', (e) => { keys[e.code] = true; if(e.key) keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; if(e.key) keys[e.key.toLowerCase()] = false; });
    window.addEventListener('resize', onWindowResize);

    // Mobile Detection
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        isMobile = true;
        document.getElementById('mobile-controls')!.style.display = 'flex';
        setupMobileControls();
    }

    createPlayerVehicle('car');
    animate();
}
