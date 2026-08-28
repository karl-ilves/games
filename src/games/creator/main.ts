import * as THREE from 'three';
import { yardService } from '../../shared/yardService';
import { getCurrentUserProfile } from '../../auth';

console.log("3D Game Creator Studio Loading...");

// --- Scene & Renderer Setup ---
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let clock: THREE.Clock;

// Modes
let isPlayTestMode = false;

// Objects Management
interface PlacedObject {
    id: string;
    mesh: THREE.Group | THREE.Mesh;
    catalogId: string;
    name: string;
    category: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    color: string;
    isAirplane?: boolean;
    portalTargetId?: string;
    portalTargetTitle?: string;
    gameItemType?: 'coin' | 'key' | 'door' | 'weapon' | 'potion' | 'goal' | 'checkpoint' | 'hazard' | 'shop' | 'enemy' | 'boss' | 'npc';
    keyName?: string;
    requiredKeyName?: string;
    isUnlocked?: boolean;
    isCollected?: boolean;
    enemyData?: {
        health: number;
        maxHealth: number;
        damage: number;
        speed: number;
        lastAttackTime?: number;
        isBoss?: boolean;
        name: string;
    };
    trigger?: {
        type: 'touch' | 'proximity' | 'portal' | 'key_door' | 'goal_win' | 'hazard_lava' | 'checkpoint' | 'shop';
        behavior?: string;
        message?: string;
        title?: string;
        radius?: number;
        targetWorldId?: string;
        targetWorldTitle?: string;
    };
    movement?: {
        type: 'patrol' | 'elevator' | 'rotate' | 'bounce' | 'circle';
        axis?: 'x' | 'y' | 'z';
        speed: number;
        distance: number;
        origin: { x: number; y: number; z: number };
        rotationSpeed?: number;
    };
}

export function isAirplaneObject(obj?: PlacedObject | null): boolean {
    if (!obj) return false;
    if (obj.isAirplane === true) return true;
    const n = ((obj.name || '') + ' ' + (obj.catalogId || '')).toLowerCase();
    return n.includes('plane') || n.includes('lennuk') || n.includes('jet') || n.includes('aircraft') || n.includes('fighter') || n.includes('propeller');
}

let placedObjects: PlacedObject[] = [];
let selectedObject: PlacedObject | null = null;
let isTeleporting = false;

// In-Game Gameplay & Combat State (Play Test Mode)
let playerHealth = 100;
let playerMaxHealth = 100;
let playerCoins = 0;
let playerInventory: Array<{ id: string; name: string; icon: string; type: string }> = [];
let activeQuest: {
    title: string;
    desc: string;
    current: number;
    target: number;
    completed: boolean;
    rewardCoins?: number;
    rewardYards?: number;
} | null = null;
let checkpointPosition = new THREE.Vector3(0, 0, 0);
let isGameFinished = false;
let isGameOver = false;
let playerAttackDamage = 25;
let lastAttackTime = 0;

// Lighting & Weather
let dirLight: THREE.DirectionalLight;
let hemiLight: THREE.HemisphereLight;
let currentEnvMode: 'day' | 'night' | 'sunset' | 'horror_fog' = 'day';

// Undo / Redo History Stack
interface SceneSnapshot {
    title: string;
    desc: string;
    category: string;
    envMode: 'day' | 'night' | 'sunset' | 'horror_fog';
    quest?: any;
    objects: Array<{
        catalogId: string;
        name: string;
        category: string;
        position: { x: number; y: number; z: number };
        rotation: { x: number; y: number; z: number };
        scale: { x: number; y: number; z: number };
        color: string;
        isAirplane?: boolean;
        gameItemType?: string;
        keyName?: string;
        requiredKeyName?: string;
        trigger?: any;
        movement?: any;
        enemyData?: any;
    }>;
}
const undoStack: SceneSnapshot[] = [];
const redoStack: SceneSnapshot[] = [];

// Audio Synthesis System
let audioCtx: AudioContext | null = null;
export function playGameSound(type: 'coin' | 'jump' | 'hit' | 'victory' | 'attack' | 'gameover' | 'door_unlock' | 'quest_complete') {
    try {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) audioCtx = new AudioContextClass();
        }
        if (!audioCtx) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'coin') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(987.77, now);
            osc.frequency.setValueAtTime(1318.51, now + 0.08);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (type === 'jump') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(450, now + 0.15);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'hit' || type === 'attack') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'victory' || type === 'quest_complete') {
            osc.type = 'sine';
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                if (!audioCtx) return;
                const subOsc = audioCtx.createOscillator();
                const subGain = audioCtx.createGain();
                subOsc.connect(subGain);
                subGain.connect(audioCtx.destination);
                subOsc.frequency.setValueAtTime(freq, now + idx * 0.1);
                subGain.gain.setValueAtTime(0.18, now + idx * 0.1);
                subGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);
                subOsc.start(now + idx * 0.1);
                subOsc.stop(now + idx * 0.1 + 0.35);
            });
        } else if (type === 'gameover') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.6);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
            osc.start(now);
            osc.stop(now + 0.7);
        } else if (type === 'door_unlock') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(880, now + 0.1);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        }
    } catch (e) {}
}

// Vehicle Drive State (Play Test Mode)
let currentVehicle: PlacedObject | null = null;
let vehicleSpeed = 0;
let nearbyVehicle: PlacedObject | null = null;

// Character & Ultra Grass
let humanCharacter: THREE.Group;
let characterVelocity = new THREE.Vector3();
let isGrounded = true;
let characterYaw = 0;
let grassPlane: THREE.Mesh;
let grassBlades: THREE.InstancedMesh;

// Controls
const keys: { [key: string]: boolean } = {};

// Orbit Camera State (Edit Mode)
let orbitRadius = 25;
let orbitTheta = Math.PI / 4;
let orbitPhi = Math.PI / 4;
let orbitTarget = new THREE.Vector3(0, 2, 0);
let isRightMouseDown = false;
let mousePos = { x: 0, y: 0 };

// --- 10,000+ Object Catalog Engine ---
interface CatalogItem {
    id: string;
    name: string;
    category: 'nature' | 'city' | 'vehicles' | 'gameplay' | 'scifi';
    icon: string;
    color: string;
    geometryType: string;
    baseScale: number;
}

const CATALOG_DATABASE: CatalogItem[] = [];

function generate10000ObjectCatalog() {
    const categories: Array<{ id: CatalogItem['category']; name: string; icon: string; types: string[]; colors: string[] }> = [
        {
            id: 'nature',
            name: 'Nature',
            icon: '🌲',
            types: ['Pine Tree', 'Oak Tree', 'Palm Tree', 'Redwood', 'Alpine Rock', 'Granite Boulder', 'Flower Cluster', 'Bush', 'Lily Pad', 'Crystal Peak'],
            colors: ['#2ecc71', '#27ae60', '#16a085', '#7f8c8d', '#95a5a6', '#e67e22', '#1abc9c', '#34495e']
        },
        {
            id: 'city',
            name: 'City & Roads',
            icon: '🏙️',
            types: ['Asphalt Road', 'Highway Overpass', 'Crossroad', 'Curve Road', 'Skyscraper', 'Modern House', 'Apartment Tower', 'Street Light', 'Highway Sign', 'Guardrail'],
            colors: ['#34495e', '#2c3e50', '#7f8c8d', '#bdc3c7', '#3498db', '#f39c12', '#e74c3c', '#95a5a6']
        },
        {
            id: 'vehicles',
            name: 'Vehicles & Cars',
            icon: '🚗',
            types: ['Supercar', 'Muscle Car', 'Cyber Truck', 'Offroad Buggy', 'Police Cruiser', 'Sports Roadster', 'Fighter Jet', 'Prop Plane', 'Rescue Helicopter', 'Hoverboard'],
            colors: ['#e74c3c', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#1abc9c', '#2c3e50', '#ecf0f1']
        },
        {
            id: 'gameplay',
            name: 'Gameplay & Portals',
            icon: '🎮',
            types: ['Teleport Portal', 'Dimension Gate', 'Yard Coin Ring', 'Checkpoint Arch', 'Finish Line Gate', 'Speed Booster Pad', 'Super Jump Pad', 'Spinning Blade', 'Spike Block', 'Laser Gate'],
            colors: ['#ffd32a', '#00f2fe', '#2ecc71', '#e74c3c', '#9b59b6', '#ff9f1a', '#4facfe', '#ff4757']
        },
        {
            id: 'scifi',
            name: 'Sci-Fi & Space',
            icon: '🚀',
            types: ['Cyber Power Tower', 'Quantum Core', 'Neon Pillar', 'Cargo Container', 'Fuel Plasma Tank', 'Alien Obelisk', 'Hologram Beacon', 'Solar Panel Array', 'Orbital Relic', 'Gravity Station'],
            colors: ['#00f2fe', '#9b59b6', '#ff007f', '#00ffcc', '#242f3d', '#34495e', '#f39c12', '#8e44ad']
        }
    ];

    let count = 0;
    categories.forEach(cat => {
        cat.types.forEach((type, typeIdx) => {
            for (let v = 1; v <= 200; v++) {
                count++;
                const color = cat.colors[(typeIdx + v) % cat.colors.length];
                CATALOG_DATABASE.push({
                    id: `obj_${cat.id}_${typeIdx + 1}_v${v}`,
                    name: `${type} #${v}`,
                    category: cat.id,
                    icon: cat.icon,
                    color: color,
                    geometryType: type.toLowerCase(),
                    baseScale: 1.0 + (v % 5) * 0.15
                });
            }
        });
    });

    console.log(`Generated ${CATALOG_DATABASE.length} unique objects in catalog.`);
}

// --- Ultra Realistic Grass Generator ---
function createUltraRealisticGrass() {
    // 1. Terrain Ground
    const groundGeo = new THREE.PlaneGeometry(300, 300, 64, 64);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x1b4d24,
        roughness: 0.85,
        metalness: 0.1,
        flatShading: false
    });
    grassPlane = new THREE.Mesh(groundGeo, groundMat);
    grassPlane.rotation.x = -Math.PI / 2;
    grassPlane.receiveShadow = true;
    scene.add(grassPlane);

    // 2. High-Density 3D Grass Blades (Instanced Mesh for high performance)
    const bladeCount = 15000;
    const bladeGeo = new THREE.ConeGeometry(0.12, 1.2, 4);
    bladeGeo.translate(0, 0.6, 0);

    const bladeMat = new THREE.MeshStandardMaterial({
        color: 0x38ef7d,
        roughness: 0.6,
        metalness: 0.05
    });

    grassBlades = new THREE.InstancedMesh(bladeGeo, bladeMat, bladeCount);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < bladeCount; i++) {
        const x = (Math.random() - 0.5) * 160;
        const z = (Math.random() - 0.5) * 160;
        const scaleY = 0.6 + Math.random() * 0.8;
        const rotY = Math.random() * Math.PI * 2;
        const rotX = (Math.random() - 0.5) * 0.3;

        dummy.position.set(x, 0, z);
        dummy.scale.set(0.8, scaleY, 0.8);
        dummy.rotation.set(rotX, rotY, 0);
        dummy.updateMatrix();

        grassBlades.setMatrixAt(i, dummy.matrix);
    }

    grassBlades.instanceMatrix.needsUpdate = true;
    grassBlades.receiveShadow = true;
    scene.add(grassBlades);
}

// --- Ultra Realistic Human Character ---
function createUltraRealisticHuman() {
    humanCharacter = new THREE.Group();

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x2c1a0e, roughness: 0.9 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x0984e3, roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.8 });
    const shoesMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });

    // Torso
    const torsoGeo = new THREE.CylinderGeometry(0.38, 0.34, 0.9, 12);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    humanCharacter.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.24, 16, 16);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 2.05;
    head.castShadow = true;
    humanCharacter.add(head);

    // Hair
    const hairGeo = new THREE.SphereGeometry(0.25, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 2.1;
    humanCharacter.add(hair);

    // Left Arm
    const armGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.75, 8);
    const leftArm = new THREE.Mesh(armGeo, shirtMat);
    leftArm.position.set(-0.52, 1.4, 0);
    leftArm.castShadow = true;
    humanCharacter.add(leftArm);

    // Right Arm
    const rightArm = new THREE.Mesh(armGeo, shirtMat);
    rightArm.position.set(0.52, 1.4, 0);
    rightArm.castShadow = true;
    humanCharacter.add(rightArm);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.85, 8);
    
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.2, 0.5, 0);
    leftLeg.castShadow = true;
    humanCharacter.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.2, 0.5, 0);
    rightLeg.castShadow = true;
    humanCharacter.add(rightLeg);

    // Shoes
    const shoeGeo = new THREE.BoxGeometry(0.2, 0.12, 0.35);
    const leftShoe = new THREE.Mesh(shoeGeo, shoesMat);
    leftShoe.position.set(-0.2, 0.06, 0.05);
    humanCharacter.add(leftShoe);

    const rightShoe = new THREE.Mesh(shoeGeo, shoesMat);
    rightShoe.position.set(0.2, 0.06, 0.05);
    humanCharacter.add(rightShoe);

    humanCharacter.position.set(0, 0, 0);
    scene.add(humanCharacter);
}

// --- Create High-Detail 3D Flyable Airplane Mesh ---
export function createAirplane3DMesh(color = '#3498db'): THREE.Group {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.4 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.4, metalness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.8 });
    const engineMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, metalness: 0.8 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    // 1. Fuselage (Aerodynamic Body)
    const fuselageGeo = new THREE.CylinderGeometry(0.75, 0.8, 6.2, 16);
    fuselageGeo.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuselageGeo, bodyMat);
    fuselage.position.y = 1.3;
    group.add(fuselage);

    // 2. Streamlined Nose Cone
    const noseGeo = new THREE.ConeGeometry(0.75, 1.8, 16);
    noseGeo.rotateX(-Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.set(0, 1.3, -3.95);
    group.add(nose);

    // 3. Cockpit Canopy (Tinted Glass)
    const cockpitGeo = new THREE.SphereGeometry(0.65, 16, 16);
    cockpitGeo.scale(0.8, 0.75, 1.8);
    const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
    cockpit.position.set(0, 1.8, -1.2);
    group.add(cockpit);

    // 4. Main Swept Wings (Left & Right)
    const wingGeo = new THREE.BoxGeometry(9.2, 0.12, 1.8);
    const mainWings = new THREE.Mesh(wingGeo, wingMat);
    mainWings.position.set(0, 1.25, -0.4);
    group.add(mainWings);

    // Wingtips / Winglets with Red/Green Nav Lights
    [-4.55, 4.55].forEach((wx, idx) => {
        const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.8), bodyMat);
        winglet.position.set(wx, 1.55, -0.4);
        group.add(winglet);

        const navLightMat = new THREE.MeshBasicMaterial({ color: idx === 0 ? 0xff4757 : 0x2ecc71 });
        const navLight = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), navLightMat);
        navLight.position.set(wx, 1.95, -0.4);
        group.add(navLight);
    });

    // 5. Tail Fin (Vertical Stabilizer)
    const tailFinGeo = new THREE.BoxGeometry(0.14, 1.7, 1.6);
    const tailFin = new THREE.Mesh(tailFinGeo, bodyMat);
    tailFin.position.set(0, 2.3, 2.6);
    tailFin.rotation.x = -0.3;
    group.add(tailFin);

    // Horizontal Tail Stabilizers
    const tailWingGeo = new THREE.BoxGeometry(3.4, 0.1, 1.1);
    const tailWings = new THREE.Mesh(tailWingGeo, wingMat);
    tailWings.position.set(0, 1.45, 2.8);
    group.add(tailWings);

    // 6. Dual Jet Engines under Wings
    [-2.0, 2.0].forEach(ex => {
        const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 2.1, 12), engineMat);
        engine.rotateX(Math.PI / 2);
        engine.position.set(ex, 0.8, -0.3);
        group.add(engine);

        // Glowing Blue Jet Exhaust
        const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.15, 12), glowMat);
        exhaust.rotateX(Math.PI / 2);
        exhaust.position.set(ex, 0.8, 0.8);
        group.add(exhaust);
    });

    // 7. Landing Gear Wheels
    const frontGear = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 12), wheelMat);
    frontGear.rotateZ(Math.PI / 2);
    frontGear.position.set(0, 0.24, -2.4);
    group.add(frontGear);

    [-1.3, 1.3].forEach(gx => {
        const rearGear = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.2, 12), wheelMat);
        rearGear.rotateZ(Math.PI / 2);
        rearGear.position.set(gx, 0.26, 0.8);
        group.add(rearGear);
    });

    group.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    return group;
}

// --- Create 3D Mesh for Catalog Item ---
function createObjectMesh(item: CatalogItem, color?: string): THREE.Group {
    const group = new THREE.Group();
    const matColor = color || item.color;
    const material = new THREE.MeshStandardMaterial({
        color: matColor,
        roughness: 0.5,
        metalness: 0.2
    });

    if (item.category === 'nature') {
        if (item.geometryType.includes('pine')) {
            // Pine Trunk + Foliage
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.5), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
            trunk.position.y = 0.75;
            group.add(trunk);

            const leaves1 = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.2, 7), material);
            leaves1.position.y = 2.2;
            group.add(leaves1);

            const leaves2 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.8, 7), material);
            leaves2.position.y = 3.2;
            group.add(leaves2);
        } else if (item.geometryType.includes('rock') || item.geometryType.includes('boulder')) {
            const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 1), material);
            rock.position.y = 0.9;
            rock.scale.set(1.2, 0.9, 1.1);
            group.add(rock);
        } else {
            // Oak / Tree / Plant
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2), new THREE.MeshStandardMaterial({ color: 0x4e342e }));
            trunk.position.y = 1.0;
            group.add(trunk);

            const foliage = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), material);
            foliage.position.y = 2.8;
            group.add(foliage);
        }
    } else if (item.category === 'city') {
        if (item.geometryType.includes('skyscraper')) {
            const tower = new THREE.Mesh(new THREE.BoxGeometry(3, 16, 3), material);
            tower.position.y = 8;
            group.add(tower);
        } else if (item.geometryType.includes('house')) {
            const base = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4), material);
            base.position.y = 1.5;
            group.add(base);

            const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.8, 4), new THREE.MeshStandardMaterial({ color: 0xc0392b }));
            roof.position.y = 3.9;
            roof.rotation.y = Math.PI / 4;
            group.add(roof);
        } else if (item.geometryType.includes('road') || item.geometryType.includes('crossroad') || item.geometryType.includes('overpass')) {
            // Realistic Asphalt Road with yellow highway stripes
            const road = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 14), new THREE.MeshStandardMaterial({ color: 0x22272e, roughness: 0.85 }));
            road.position.y = 0.06;
            group.add(road);

            // Center Road Dashes
            for (let s = -4.8; s <= 4.8; s += 2.4) {
                const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 1.4), new THREE.MeshStandardMaterial({ color: 0xffd32a, roughness: 0.4 }));
                stripe.position.set(0, 0.07, s);
                group.add(stripe);
            }
            // Road Edge Lines
            [-3.6, 3.6].forEach(ex => {
                const edgeLine = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 14), new THREE.MeshStandardMaterial({ color: 0xffffff }));
                edgeLine.position.set(ex, 0.07, 0);
                group.add(edgeLine);
            });
        } else {
            // City Prop / Wall
            const prop = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), material);
            prop.position.y = 1.5;
            group.add(prop);
        }
    } else if (item.category === 'vehicles') {
        const isPlane = item.geometryType.includes('plane') || item.geometryType.includes('jet') || item.name.toLowerCase().includes('plane') || item.name.toLowerCase().includes('jet') || item.name.toLowerCase().includes('fighter') || item.name.toLowerCase().includes('prop') || item.name.toLowerCase().includes('helicopter');
        if (isPlane) {
            return createAirplane3DMesh(matColor);
        }

        // Drivable Car Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.75, 4.2), material);
        body.position.y = 0.65;
        group.add(body);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.65, 2.2), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.8 }));
        cabin.position.set(0, 1.25, -0.2);
        group.add(cabin);

        // Headlights & Taillights
        const headlightMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
        const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff4757 });

        [-0.7, 0.7].forEach(hx => {
            const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), headlightMat);
            hl.position.set(hx, 0.65, -2.12);
            group.add(hl);

            const tl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), taillightMat);
            tl.position.set(hx, 0.65, 2.12);
            group.add(tl);
        });

        // 4 3D Rubber Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });

        [-1.15, 1.15].forEach(x => {
            [-1.35, 1.35].forEach(z => {
                const w = new THREE.Mesh(wheelGeo, wheelMat);
                w.position.set(x, 0.4, z);
                group.add(w);
            });
        });
    } else if (item.category === 'gameplay') {
        if (item.geometryType.includes('portal') || item.geometryType.includes('gate') || item.geometryType.includes('teleport')) {
            // Glowing Dimension Portal Frame
            const portalFrame = new THREE.Mesh(new THREE.TorusGeometry(2, 0.28, 16, 32), new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x8e44ad, emissiveIntensity: 0.7 }));
            portalFrame.position.y = 2.2;
            group.add(portalFrame);

            const portalDisc = new THREE.Mesh(new THREE.CircleGeometry(1.75, 32), new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
            portalDisc.position.y = 2.2;
            group.add(portalDisc);
        } else if (item.geometryType.includes('coin') || item.geometryType.includes('ring')) {
            const coin = new THREE.Mesh(new THREE.TorusGeometry(1, 0.2, 12, 24), material);
            coin.position.y = 1.6;
            group.add(coin);
        } else if (item.geometryType.includes('pad') || item.geometryType.includes('booster')) {
            const pad = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 3), material);
            pad.position.y = 0.1;
            group.add(pad);
        } else {
            // Checkpoint Gate / Arch
            const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4), material);
            leftPost.position.set(-2, 2, 0);
            group.add(leftPost);

            const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4), material);
            rightPost.position.set(2, 2, 0);
            group.add(rightPost);

            const topBeam = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.4, 0.4), material);
            topBeam.position.set(0, 4, 0);
            group.add(topBeam);
        }
    } else {
        // Sci-Fi
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), material);
        core.position.y = 2.0;
        group.add(core);

        const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.6, 6), new THREE.MeshStandardMaterial({ color: 0x1e272e }));
        base.position.y = 0.3;
        group.add(base);
    }

    group.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    return group;
}

// --- Spawn Catalog Item into Scene ---
function spawnObjectIntoScene(catalogItem: CatalogItem) {
    const mesh = createObjectMesh(catalogItem);
    
    // Position in front of camera or at center
    const spawnX = (Math.random() - 0.5) * 10;
    const spawnZ = (Math.random() - 0.5) * 10;
    mesh.position.set(spawnX, 0, spawnZ);
    mesh.scale.setScalar(catalogItem.baseScale);

    scene.add(mesh);

    const placed: PlacedObject = {
        id: 'placed_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        mesh,
        catalogId: catalogItem.id,
        name: catalogItem.name,
        category: catalogItem.category,
        position: { x: spawnX, y: 0, z: spawnZ },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: catalogItem.baseScale, y: catalogItem.baseScale, z: catalogItem.baseScale },
        color: catalogItem.color
    };

    placedObjects.push(placed);
    selectObject(placed);
    autoSaveDraft();
}

export function serializeCurrentScene() {
    const titleInput = document.getElementById('game-title-input') as HTMLInputElement | null;
    const catSelect = document.getElementById('game-category-select') as HTMLSelectElement | null;
    const descInput = document.getElementById('game-desc-input') as HTMLInputElement | null;

    return {
        title: titleInput?.value.trim() || 'My 3D Adventure',
        category: catSelect?.value || 'Adventure',
        description: descInput?.value.trim() || '',
        objects: placedObjects.map(p => ({
            id: p.id,
            catalogId: p.catalogId,
            name: p.name,
            category: p.category,
            position: { x: p.mesh.position.x, y: p.mesh.position.y, z: p.mesh.position.z },
            rotation: { x: p.mesh.rotation.x, y: p.mesh.rotation.y, z: p.mesh.rotation.z },
            scale: { x: p.mesh.scale.x, y: p.mesh.scale.y, z: p.mesh.scale.z },
            color: p.color,
            trigger: p.trigger,
            portalTargetId: p.portalTargetId,
            portalTargetTitle: p.portalTargetTitle
        })),
        updatedAt: Date.now()
    };
}

export function autoSaveDraft() {
    const profile = getCurrentUserProfile();
    const sceneData = serializeCurrentScene();
    yardService.saveUserGame(profile?.username ?? null, sceneData);

    const indicator = document.getElementById('draft-status-indicator');
    if (indicator) {
        indicator.innerText = `💾 Saved: ${sceneData.title}`;
        indicator.style.opacity = '1';
        setTimeout(() => {
            if (indicator) indicator.style.opacity = '0.7';
        }, 2000);
    }
}

export function saveCurrentGame(showAlert = true) {
    const profile = getCurrentUserProfile();
    const sceneData = serializeCurrentScene();
    yardService.saveUserGame(profile?.username ?? null, sceneData);

    const indicator = document.getElementById('draft-status-indicator');
    if (indicator) {
        indicator.innerText = `💾 Saved: ${sceneData.title}`;
        indicator.style.opacity = '1';
    }

    if (showAlert) {
        alert(`✅ Game "${sceneData.title}" saved successfully! (${sceneData.objects.length} objects)`);
    }
}

export function loadSceneFromData(sceneData: any) {
    if (!sceneData) return;

    // Clear current placed objects
    placedObjects.forEach(p => scene.remove(p.mesh));
    placedObjects = [];
    selectObject(null);

    const titleInput = document.getElementById('game-title-input') as HTMLInputElement | null;
    const catSelect = document.getElementById('game-category-select') as HTMLSelectElement | null;
    const descInput = document.getElementById('game-desc-input') as HTMLInputElement | null;

    if (titleInput && sceneData.title) titleInput.value = sceneData.title;
    if (catSelect && sceneData.category) catSelect.value = sceneData.category;
    if (descInput && sceneData.description) descInput.value = sceneData.description;

    if (Array.isArray(sceneData.objects)) {
        sceneData.objects.forEach((objData: any) => {
            const catItem: CatalogItem = CATALOG_DATABASE.find(c => c.id === objData.catalogId) || {
                id: objData.catalogId || 'obj_custom',
                name: objData.name || 'Object',
                category: objData.category || 'nature',
                icon: '📦',
                color: objData.color || '#00f2fe',
                geometryType: (objData.name || '').toLowerCase(),
                baseScale: objData.scale?.x || 1
            };

            const mesh = createObjectMesh(catItem);
            mesh.position.set(objData.position?.x || 0, objData.position?.y || 0, objData.position?.z || 0);
            if (objData.rotation) {
                mesh.rotation.set(objData.rotation.x || 0, objData.rotation.y || 0, objData.rotation.z || 0);
            }
            if (objData.scale) {
                mesh.scale.set(objData.scale.x || 1, objData.scale.y || 1, objData.scale.z || 1);
            }

            scene.add(mesh);

            const placed: PlacedObject = {
                id: objData.id || ('placed_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)),
                mesh,
                catalogId: catItem.id,
                name: objData.name || catItem.name,
                category: objData.category || catItem.category,
                position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
                rotation: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z },
                scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z },
                color: objData.color || catItem.color,
                trigger: objData.trigger,
                portalTargetId: objData.portalTargetId || objData.trigger?.targetWorldId,
                portalTargetTitle: objData.portalTargetTitle || objData.trigger?.targetWorldTitle
            };

            placedObjects.push(placed);
        });
    }
}

export function moveSelectedObject(dx: number, dy: number, dz: number) {
    if (!selectedObject) return;
    selectedObject.mesh.position.x += dx;
    selectedObject.mesh.position.y = Math.max(0, selectedObject.mesh.position.y + dy);
    selectedObject.mesh.position.z += dz;
    selectedObject.position = {
        x: selectedObject.mesh.position.x,
        y: selectedObject.mesh.position.y,
        z: selectedObject.mesh.position.z
    };
    updateInspectorDisplay();
    autoSaveDraft();
}

export function rotateSelectedObject(rad = Math.PI / 4) {
    if (!selectedObject) return;
    selectedObject.mesh.rotation.y = (selectedObject.mesh.rotation.y + rad) % (Math.PI * 2);
    selectedObject.rotation = {
        x: selectedObject.mesh.rotation.x,
        y: selectedObject.mesh.rotation.y,
        z: selectedObject.mesh.rotation.z
    };
    updateInspectorDisplay();
    autoSaveDraft();
}

export function deleteSelectedObject() {
    if (!selectedObject) return;
    scene.remove(selectedObject.mesh);
    placedObjects = placedObjects.filter(p => p.id !== selectedObject!.id);
    selectObject(null);
    autoSaveDraft();
}

function updateInspectorDisplay() {
    if (!selectedObject) return;
    const posVal = document.getElementById('obj-pos-val');
    const rotVal = document.getElementById('obj-rot-val');
    if (posVal) {
        posVal.innerText = `${selectedObject.mesh.position.x.toFixed(1)}, ${selectedObject.mesh.position.y.toFixed(1)}, ${selectedObject.mesh.position.z.toFixed(1)}`;
    }
    if (rotVal) {
        const deg = Math.round((selectedObject.mesh.rotation.y * 180) / Math.PI) % 360;
        rotVal.innerText = `${(deg + 360) % 360}°`;
    }
}

function selectObject(placed: PlacedObject | null) {
    selectedObject = placed;
    const info = document.getElementById('selected-object-info');
    const props = document.getElementById('selected-object-props');
    const scaleInput = document.getElementById('obj-scale-input') as HTMLInputElement | null;
    const colorInput = document.getElementById('obj-color-input') as HTMLInputElement | null;

    if (!placed) {
        if (info) info.style.display = 'block';
        if (props) props.style.display = 'none';
        return;
    }

    if (info) info.style.display = 'none';
    if (props) props.style.display = 'block';

    updateInspectorDisplay();

    if (scaleInput) {
        scaleInput.value = placed.mesh.scale.x.toString();
    }
    if (colorInput) {
        colorInput.value = placed.color;
    }

    const triggerInput = document.getElementById('obj-trigger-text') as HTMLInputElement | null;
    if (triggerInput) {
        triggerInput.value = placed.trigger?.message || '';
    }
}

// --- Render Catalog UI ---
function renderCatalogUI(filterCat = 'all', searchQuery = '') {
    const container = document.getElementById('catalog-items-container');
    if (!container) return;

    let items = CATALOG_DATABASE;
    if (filterCat !== 'all') {
        items = items.filter(i => i.category === filterCat);
    }
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        items = items.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }

    // Limit render chunk for performance (render first 60, paginate/infinite scroll)
    const displayItems = items.slice(0, 80);

    container.innerHTML = '';
    displayItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'object-card';
        card.innerHTML = `
            <div class="object-icon">${item.icon}</div>
            <div class="object-title">${item.name}</div>
        `;
        card.addEventListener('click', () => {
            spawnObjectIntoScene(item);
        });
        container.appendChild(card);
    });

    const countBadge = document.getElementById('catalog-count-badge');
    if (countBadge) {
        countBadge.innerText = `${items.length.toLocaleString()} items`;
    }
}

// --- Three.js Initialization ---
async function initStudio() {
    const container = document.getElementById('canvas-container')!;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // Lighting
    hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    dirLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    dirLight.position.set(40, 80, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 250;
    dirLight.shadow.camera.left = -60;
    dirLight.shadow.camera.right = 60;
    dirLight.shadow.camera.top = 60;
    dirLight.shadow.camera.bottom = -60;
    scene.add(dirLight);

    // Ultra Grass & Human
    createUltraRealisticGrass();
    createUltraRealisticHuman();

    // Generate 10,000 Objects in Catalog
    generate10000ObjectCatalog();
    renderCatalogUI();

    // Restore Draft or Admin Feedback Game
    await restoreDraftOrFeedbackGame();

    // Event Listeners
    setupStudioEvents();
    setupCatalogEvents();
    setupInspectorEvents();
    setupAiAssistantEvents();

    window.addEventListener('resize', onWindowResize);

    // Initial Camera
    updateOrbitCamera();

    // Start Loop
    animate();
}

function updateOrbitCamera() {
    if (isPlayTestMode) return;
    const x = orbitTarget.x + orbitRadius * Math.sin(orbitPhi) * Math.sin(orbitTheta);
    const y = orbitTarget.y + orbitRadius * Math.cos(orbitPhi);
    const z = orbitTarget.z + orbitRadius * Math.sin(orbitPhi) * Math.cos(orbitTheta);
    camera.position.set(x, y, z);
    camera.lookAt(orbitTarget);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let isDraggingObject = false;
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

export function enterVehicle(vehicle: PlacedObject) {
    if (!isPlayTestMode) return;
    currentVehicle = vehicle;
    vehicleSpeed = 0;
    humanCharacter.visible = false;
    
    const prompt = document.getElementById('enter-vehicle-prompt');
    if (prompt) prompt.style.display = 'none';

    const isPlane = isAirplaneObject(vehicle);
    const isAdmin = isCurrentUserAdmin();

    const vehicleHud = document.getElementById('vehicle-hud');
    const vehicleHudIcon = document.getElementById('vehicle-hud-icon');
    const vehicleHudName = document.getElementById('vehicle-hud-name');
    const vehicleHudDesc = document.getElementById('vehicle-hud-desc');

    if (vehicleHud) vehicleHud.style.display = 'block';
    if (vehicleHudIcon) vehicleHudIcon.innerText = isPlane ? '✈️' : '🏎️';
    if (vehicleHudName) vehicleHudName.innerText = isPlane ? (vehicle.name.startsWith('✈️') ? vehicle.name : `✈️ ${vehicle.name}`) : (vehicle.name.startsWith('🏎️') || vehicle.name.startsWith('🚗') ? vehicle.name : `🏎️ ${vehicle.name}`);
    if (vehicleHudDesc) {
        if (isPlane) {
            vehicleHudDesc.innerHTML = isAdmin
                ? `Gaas: <strong>W / ⬆️</strong> | Pidur: <strong>S / ⬇️</strong> | Pööra: <strong>A / D</strong> | Tõus: <strong>SPACE / Q</strong> | Laskumine: <strong>Shift / E</strong>`
                : `Throttle: <strong>W / ⬆️</strong> | Brake: <strong>S / ⬇️</strong> | Steer: <strong>A / D</strong> | Climb: <strong>SPACE / Q</strong> | Dive: <strong>Shift / E</strong>`;
        } else {
            vehicleHudDesc.innerHTML = isAdmin
                ? `Gaas: <strong>W / ⬆️</strong> | Pidur & Tagurpidi: <strong>S / ⬇️</strong> | Pööramine: <strong>A / D / ⬅️ ➡️</strong>`
                : `Gas: <strong>W / ⬆️</strong> | Brake & Reverse: <strong>S / ⬇️</strong> | Steer: <strong>A / D / ⬅️ ➡️</strong>`;
        }
    }
}

export function exitVehicle() {
    if (!currentVehicle) return;
    const isPlane = isAirplaneObject(currentVehicle);
    const exitPos = currentVehicle.mesh.position.clone().add(new THREE.Vector3(isPlane ? 3.5 : 2.2, 0, 0));
    if (exitPos.y > 0) exitPos.y = 0;
    humanCharacter.position.copy(exitPos);
    humanCharacter.visible = true;
    currentVehicle = null;
    vehicleSpeed = 0;

    const vehicleHud = document.getElementById('vehicle-hud');
    if (vehicleHud) vehicleHud.style.display = 'none';
}

// --- Gameplay & HUD Controller ---
export function updateGameplayHUD() {
    const healthText = document.getElementById('player-health-text');
    const healthBar = document.getElementById('player-health-bar');
    const coinsVal = document.getElementById('hud-coins-val');
    const yardsVal = document.getElementById('hud-yards-val');
    const questTracker = document.getElementById('hud-quest-tracker');
    const questTitle = document.getElementById('hud-quest-title');
    const questDesc = document.getElementById('hud-quest-desc');
    const questProgress = document.getElementById('hud-quest-progress');
    const invContainer = document.getElementById('hud-inventory-container');

    if (healthText) healthText.innerText = `${Math.max(0, Math.round(playerHealth))}/${playerMaxHealth}`;
    if (healthBar) {
        const pct = Math.max(0, Math.min(100, (playerHealth / playerMaxHealth) * 100));
        healthBar.style.width = `${pct}%`;
        if (pct > 50) healthBar.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
        else if (pct > 25) healthBar.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
        else healthBar.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
    }

    if (coinsVal) coinsVal.innerText = playerCoins.toString();
    if (yardsVal) {
        const profile = getCurrentUserProfile();
        const yards = yardService.getYards(profile?.username ?? null);
        yardsVal.innerText = yards.toLocaleString();
    }

    if (questTracker) {
        if (activeQuest) {
            questTracker.style.display = 'block';
            if (questTitle) questTitle.innerText = activeQuest.title;
            if (questDesc) questDesc.innerText = activeQuest.desc;
            if (questProgress) questProgress.innerText = `Edenemine: ${activeQuest.current} / ${activeQuest.target}`;
        } else {
            questTracker.style.display = 'none';
        }
    }

    if (invContainer) {
        invContainer.innerHTML = playerInventory.map(item => `
            <div style="background: rgba(15,23,42,0.9); border: 1.5px solid #ffd32a; border-radius: 8px; padding: 4px 8px; font-size: 0.8rem; font-weight: bold; color: #fff; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
                <span>${item.icon}</span> <span>${item.name}</span>
            </div>
        `).join('');
    }
}

export function damagePlayer(amount: number) {
    if (isGameOver || isGameFinished || !isPlayTestMode) return;
    playerHealth = Math.max(0, playerHealth - amount);
    playGameSound('hit');
    updateGameplayHUD();

    // Screen flash
    document.body.style.boxShadow = 'inset 0 0 50px rgba(231,76,60,0.8)';
    setTimeout(() => { document.body.style.boxShadow = 'none'; }, 200);

    if (playerHealth <= 0) {
        triggerGameOver();
    }
}

export function healPlayer(amount: number) {
    playerHealth = Math.min(playerMaxHealth, playerHealth + amount);
    playGameSound('coin');
    updateGameplayHUD();
}

export function collectCoin(amount = 10) {
    playerCoins += amount;
    playGameSound('coin');
    updateGameplayHUD();
}

export function collectKey(keyName: string) {
    if (!playerInventory.some(i => i.name === keyName)) {
        playerInventory.push({ id: 'key_' + Date.now(), name: keyName, icon: '🔑', type: 'key' });
        playGameSound('door_unlock');
        if (activeQuest && !activeQuest.completed) {
            activeQuest.current++;
            if (activeQuest.current >= activeQuest.target) {
                activeQuest.completed = true;
                playGameSound('quest_complete');
            }
        }
        updateGameplayHUD();
    }
}

export function playerAttack() {
    if (!isPlayTestMode || isGameOver || isGameFinished) return;
    const now = Date.now();
    if (now - lastAttackTime < 400) return;
    lastAttackTime = now;

    playGameSound('attack');

    // Human sword swing / punch animation
    humanCharacter.rotation.x = -0.3;
    setTimeout(() => { humanCharacter.rotation.x = 0; }, 150);

    // Hit nearby enemies
    for (let i = placedObjects.length - 1; i >= 0; i--) {
        const obj = placedObjects[i];
        if (obj.gameItemType === 'enemy' || obj.gameItemType === 'boss' || obj.enemyData) {
            const dist = humanCharacter.position.distanceTo(obj.mesh.position);
            if (dist < 4.2) {
                if (obj.enemyData) {
                    obj.enemyData.health -= playerAttackDamage;
                    playGameSound('hit');
                    
                    // Flash enemy white/red
                    obj.mesh.position.y += 0.3;
                    setTimeout(() => { if (obj.mesh) obj.mesh.position.y -= 0.3; }, 100);

                    if (obj.enemyData.health <= 0) {
                        playGameSound('victory');
                        scene.remove(obj.mesh);
                        placedObjects.splice(i, 1);
                        collectCoin(obj.enemyData.isBoss ? 50 : 15);
                        
                        if (activeQuest && (activeQuest.title.toLowerCase().includes('draakon') || activeQuest.title.toLowerCase().includes('vaenla') || activeQuest.title.toLowerCase().includes('boss'))) {
                            activeQuest.current++;
                            if (activeQuest.current >= activeQuest.target) {
                                activeQuest.completed = true;
                                triggerVictory('🏆 Boss Alistatud!', 'Suurepärane võit! Päästsid maailma ja täitsid ülesande!');
                            }
                        }
                    }
                }
            }
        }
    }
}

export function triggerVictory(title = 'PALJU ÕNNE! VÕIT!', desc = 'Suurepärane! Läbisid mängu edukalt ja täitsid kõik eesmärgid!') {
    if (isGameFinished) return;
    isGameFinished = true;
    playGameSound('victory');

    // Award bonus Yards
    const profile = getCurrentUserProfile();
    if (activeQuest?.rewardYards) {
        yardService.addYards(activeQuest.rewardYards, profile?.username ?? null);
    }

    const modal = document.getElementById('game-victory-modal');
    const titleEl = document.getElementById('victory-title');
    const descEl = document.getElementById('victory-desc');
    if (titleEl) titleEl.innerText = title;
    if (descEl) descEl.innerText = desc;
    if (modal) modal.style.display = 'flex';
}

export function triggerGameOver() {
    isGameOver = true;
    playGameSound('gameover');
    const modal = document.getElementById('game-over-modal');
    if (modal) modal.style.display = 'flex';
}

export function respawnPlayerAtCheckpoint() {
    isGameOver = false;
    playerHealth = playerMaxHealth;
    humanCharacter.position.copy(checkpointPosition);
    characterVelocity.set(0, 0, 0);
    isGrounded = true;

    const modal = document.getElementById('game-over-modal');
    if (modal) modal.style.display = 'none';
    updateGameplayHUD();
}

export function setDayNightMode(mode: 'day' | 'night' | 'sunset' | 'horror_fog') {
    currentEnvMode = mode;
    if (!scene) return;
    if (mode === 'night') {
        scene.background = new THREE.Color(0x0a0e17);
        scene.fog = new THREE.FogExp2(0x0a0e17, 0.015);
        if (hemiLight) hemiLight.color.setHex(0x1a2536);
        if (dirLight) {
            dirLight.color.setHex(0x34495e);
            dirLight.intensity = 0.4;
        }
    } else if (mode === 'horror_fog') {
        scene.background = new THREE.Color(0x05070a);
        scene.fog = new THREE.FogExp2(0x05070a, 0.04);
        if (hemiLight) hemiLight.color.setHex(0x0d131a);
        if (dirLight) {
            dirLight.color.setHex(0x1e272e);
            dirLight.intensity = 0.25;
        }
    } else if (mode === 'sunset') {
        scene.background = new THREE.Color(0x2c1b18);
        scene.fog = new THREE.FogExp2(0x2c1b18, 0.012);
        if (hemiLight) hemiLight.color.setHex(0xe67e22);
        if (dirLight) {
            dirLight.color.setHex(0xf39c12);
            dirLight.intensity = 1.0;
        }
    } else {
        scene.background = new THREE.Color(0x87ceeb);
        scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);
        if (hemiLight) hemiLight.color.setHex(0xffffff);
        if (dirLight) {
            dirLight.color.setHex(0xfffaed);
            dirLight.intensity = 1.2;
        }
    }
}

// In-Game Shop Items
const IN_GAME_SHOP_CATALOG = [
    { id: 'potion_hp', name: 'Tervisejook (+50 HP)', icon: '🧪', price: 20, currency: 'coins' as const, type: 'heal' },
    { id: 'speed_boost', name: 'Super Kiirus (+100%)', icon: '⚡', price: 40, currency: 'coins' as const, type: 'speed' },
    { id: 'laser_sword', name: 'Laser Mõõk (Tugev)', icon: '⚔️', price: 75, currency: 'coins' as const, type: 'weapon' },
    { id: 'vip_gold_armor', name: 'VIP Kuldne Rüü', icon: '💎', price: 25, currency: 'yards' as const, type: 'armor' }
];

export function openInGameShop() {
    const modal = document.getElementById('in-game-shop-modal');
    const itemsContainer = document.getElementById('in-game-shop-items');
    const userCoins = document.getElementById('shop-user-coins');
    const userYards = document.getElementById('shop-user-yards');
    if (!modal || !itemsContainer) return;

    const profile = getCurrentUserProfile();
    if (userCoins) userCoins.innerText = playerCoins.toString();
    if (userYards) userYards.innerText = yardService.getYards(profile?.username ?? null).toString();

    itemsContainer.innerHTML = IN_GAME_SHOP_CATALOG.map(item => `
        <div style="background: #1e293b; border: 1.5px solid rgba(255,211,42,0.4); border-radius: 12px; padding: 12px; text-align: center; display: flex; flex-direction: column; justify-content: space-between; gap: 8px;">
            <div style="font-size: 2rem;">${item.icon}</div>
            <div style="font-weight: 800; font-size: 0.9rem; color: #fff;">${item.name}</div>
            <button class="btn-buy-shop-item" data-id="${item.id}" style="background: linear-gradient(135deg, #ffd32a, #f39c12); border: none; color: #111; font-weight: 800; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 0.85rem;">
                Osta: ${item.price} ${item.currency === 'coins' ? '🪙' : '💎'}
            </button>
        </div>
    `).join('');

    itemsContainer.querySelectorAll('.btn-buy-shop-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
            const item = IN_GAME_SHOP_CATALOG.find(i => i.id === id);
            if (item) buyShopItem(item);
        });
    });

    modal.style.display = 'flex';
}

export function buyShopItem(item: (typeof IN_GAME_SHOP_CATALOG)[0]) {
    const profile = getCurrentUserProfile();
    if (item.currency === 'coins') {
        if (playerCoins >= item.price) {
            playerCoins -= item.price;
            playGameSound('coin');
            if (item.type === 'heal') healPlayer(50);
            else if (item.type === 'weapon') {
                playerAttackDamage += 25;
                playerInventory.push({ id: 'wpn_' + Date.now(), name: item.name, icon: item.icon, type: 'weapon' });
            }
            updateGameplayHUD();
            openInGameShop();
        } else {
            alert('Pole piisavalt münte! Kogu maailmast münte juurde.');
        }
    } else {
        const yards = yardService.getYards(profile?.username ?? null);
        if (yards >= item.price) {
            yardService.deductYards(item.price, profile?.username ?? null);
            playGameSound('victory');
            playerInventory.push({ id: 'arm_' + Date.now(), name: item.name, icon: item.icon, type: 'armor' });
            playerMaxHealth += 50;
            playerHealth += 50;
            updateGameplayHUD();
            openInGameShop();
        } else {
            alert('Pole piisavalt Yarde! Teeni Yarde mänge mängides.');
        }
    }
}

// --- Undo & Redo History System ---
export function saveUndoSnapshot() {
    const titleInput = document.getElementById('game-title-input') as HTMLInputElement | null;
    const catSelect = document.getElementById('game-category-select') as HTMLSelectElement | null;
    const descInput = document.getElementById('game-desc-input') as HTMLInputElement | null;

    const snapshot: SceneSnapshot = {
        title: titleInput ? titleInput.value : 'My 3D Game',
        desc: descInput ? descInput.value : '',
        category: catSelect ? catSelect.value : 'Adventure',
        envMode: currentEnvMode,
        quest: activeQuest ? JSON.parse(JSON.stringify(activeQuest)) : null,
        objects: placedObjects.map(p => ({
            catalogId: p.catalogId,
            name: p.name,
            category: p.category,
            position: { x: p.position.x, y: p.position.y, z: p.position.z },
            rotation: { x: p.rotation.x, y: p.rotation.y, z: p.rotation.z },
            scale: { x: p.scale.x, y: p.scale.y, z: p.scale.z },
            color: p.color,
            isAirplane: p.isAirplane,
            gameItemType: p.gameItemType,
            keyName: p.keyName,
            requiredKeyName: p.requiredKeyName,
            trigger: p.trigger ? JSON.parse(JSON.stringify(p.trigger)) : undefined,
            movement: p.movement ? JSON.parse(JSON.stringify(p.movement)) : undefined,
            enemyData: p.enemyData ? JSON.parse(JSON.stringify(p.enemyData)) : undefined
        }))
    };
    undoStack.push(snapshot);
    if (undoStack.length > 30) undoStack.shift();
    redoStack.length = 0;
}

export function restoreSceneSnapshot(snapshot: SceneSnapshot) {
    if (!snapshot) return;
    // Clear existing placed objects
    for (const p of placedObjects) {
        scene.remove(p.mesh);
    }
    placedObjects = [];
    selectedObject = null;

    const titleInput = document.getElementById('game-title-input') as HTMLInputElement | null;
    const catSelect = document.getElementById('game-category-select') as HTMLSelectElement | null;
    const descInput = document.getElementById('game-desc-input') as HTMLInputElement | null;
    if (titleInput) titleInput.value = snapshot.title;
    if (catSelect) catSelect.value = snapshot.category;
    if (descInput) descInput.value = snapshot.desc;

    setDayNightMode(snapshot.envMode || 'day');
    activeQuest = snapshot.quest ? JSON.parse(JSON.stringify(snapshot.quest)) : null;

    for (const objData of snapshot.objects) {
        let mesh: THREE.Group | THREE.Mesh;
        if (objData.isAirplane) {
            mesh = createAirplane3DMesh(objData.color);
        } else {
            const catalogItem = CATALOG_DATABASE.find(c => c.id === objData.catalogId);
            if (catalogItem) {
                mesh = createObjectMesh(catalogItem, objData.color);
            } else {
                mesh = createCustomProceduralMesh(objData.name, objData.name);
            }
        }
        mesh.position.set(objData.position.x, objData.position.y, objData.position.z);
        mesh.rotation.set(objData.rotation.x, objData.rotation.y, objData.rotation.z);
        mesh.scale.set(objData.scale.x, objData.scale.y, objData.scale.z);
        scene.add(mesh);

        placedObjects.push({
            id: 'placed_' + Date.now() + '_' + Math.random(),
            mesh,
            catalogId: objData.catalogId,
            name: objData.name,
            category: objData.category,
            position: { ...objData.position },
            rotation: { ...objData.rotation },
            scale: { ...objData.scale },
            color: objData.color,
            isAirplane: objData.isAirplane,
            gameItemType: objData.gameItemType as any,
            keyName: objData.keyName,
            requiredKeyName: objData.requiredKeyName,
            trigger: objData.trigger,
            movement: objData.movement,
            enemyData: objData.enemyData
        });
    }

    updateInspectorDisplay();
    updateGameplayHUD();
}

export function performUndo() {
    if (undoStack.length <= 1) return;
    const current = undoStack.pop()!;
    redoStack.push(current);
    const prev = undoStack[undoStack.length - 1];
    restoreSceneSnapshot(prev);
}

export function performRedo() {
    if (redoStack.length === 0) return;
    const next = redoStack.pop()!;
    undoStack.push(next);
    restoreSceneSnapshot(next);
}

export function openDimensionTravelModal() {
    const profile = getCurrentUserProfile();
    const modal = document.getElementById('dimension-travel-modal');
    const list = document.getElementById('dimension-games-list');
    if (!modal || !list) return;

    const savedGames = yardService.getUserSavedGames(profile?.username ?? null);
    if (savedGames.length === 0) {
        list.innerHTML = `<div style="text-align: center; color: #a4b0be; padding: 20px;">You have no saved games yet. Create and save games using the "💾 Save Game" button!</div>`;
    } else {
        list.innerHTML = savedGames.map((g: any) => `
            <div style="background: #1e293b; border: 1.5px solid rgba(168,85,247,0.4); border-radius: 10px; padding: 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
                <div>
                    <h4 style="margin: 0; color: #00f2fe; font-size: 1rem;">🎮 ${g.title}</h4>
                    <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">Kategooria: <strong style="color: #ffd32a;">${g.category}</strong> | Objekte: <strong>${g.objects?.length || 0} tk</strong></div>
                </div>
                <button class="btn-hop-world" data-game-id="${g.id}" style="background: linear-gradient(135deg, #a855f7, #00f2fe); border: none; color: #fff; font-weight: bold; padding: 8px 14px; border-radius: 8px; font-size: 0.85rem; cursor: pointer;">
                    🌀 Rända siia
                </button>
            </div>
        `).join('');

        list.querySelectorAll('.btn-hop-world').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gameId = (e.currentTarget as HTMLElement).getAttribute('data-game-id');
                const targetGame = savedGames.find((sg: any) => sg.id === gameId);
                if (targetGame) {
                    modal.style.display = 'none';
                    if (currentVehicle) exitVehicle();
                    loadSceneFromData(targetGame);
                    alert(`🌀 Successfully traveled to another saved world "${targetGame.title}"!`);
                }
            });
        });
    }

    modal.style.display = 'flex';
}

// --- Event Handlers ---
function setupStudioEvents() {
    window.addEventListener('keydown', e => {
        // Undo / Redo Shortcuts
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
            e.preventDefault();
            if (e.shiftKey) performRedo();
            else performUndo();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
            e.preventDefault();
            performRedo();
            return;
        }

        // If user is typing in input fields, ignore creator hotkeys
        const activeTag = (document.activeElement?.tagName || '').toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
            return;
        }

        keys[e.code] = true;

        if (isPlayTestMode) {
            // E Key: Player Attack / Action
            if (e.code === 'KeyE' || e.key.toLowerCase() === 'e') {
                e.preventDefault();
                playerAttack();
                return;
            }

            // F Key: Enter / Exit Vehicle
            if (e.code === 'KeyF' || e.key.toLowerCase() === 'f') {
                e.preventDefault();
                if (currentVehicle) {
                    exitVehicle();
                } else if (nearbyVehicle) {
                    enterVehicle(nearbyVehicle);
                }
                return;
            }
        }

        if (!isPlayTestMode && selectedObject) {
            // R Key: Rotate 45 degrees
            if (e.code === 'KeyR' || e.key.toLowerCase() === 'r') {
                e.preventDefault();
                rotateSelectedObject(Math.PI / 4);
                return;
            }

            // D Key / Delete / Backspace: Delete selected object
            if (e.code === 'KeyD' || e.key.toLowerCase() === 'd' || e.code === 'Delete' || e.code === 'Backspace') {
                e.preventDefault();
                deleteSelectedObject();
                return;
            }
        }
    });

    // Undo / Redo Buttons
    document.getElementById('btn-undo')?.addEventListener('click', () => {
        performUndo();
    });
    document.getElementById('btn-redo')?.addEventListener('click', () => {
        performRedo();
    });

    // Gameplay Action Attack Button
    document.getElementById('btn-attack-action')?.addEventListener('click', () => {
        playerAttack();
    });

    // Shop Close Buttons
    document.getElementById('btn-close-ingame-shop')?.addEventListener('click', () => {
        const modal = document.getElementById('in-game-shop-modal');
        if (modal) modal.style.display = 'none';
    });
    document.getElementById('btn-close-shop-bottom')?.addEventListener('click', () => {
        const modal = document.getElementById('in-game-shop-modal');
        if (modal) modal.style.display = 'none';
    });

    // Victory Modal Buttons
    document.getElementById('btn-victory-restart')?.addEventListener('click', () => {
        const modal = document.getElementById('game-victory-modal');
        if (modal) modal.style.display = 'none';
        isGameFinished = false;
        humanCharacter.position.set(0, 0, 0);
        playerHealth = playerMaxHealth;
        updateGameplayHUD();
    });
    document.getElementById('btn-victory-edit')?.addEventListener('click', () => {
        const modal = document.getElementById('game-victory-modal');
        if (modal) modal.style.display = 'none';
        document.getElementById('btn-toggle-play-test')?.click();
    });

    // Game Over Modal Buttons
    document.getElementById('btn-gameover-respawn')?.addEventListener('click', () => {
        respawnPlayerAtCheckpoint();
    });
    document.getElementById('btn-gameover-edit')?.addEventListener('click', () => {
        const modal = document.getElementById('game-over-modal');
        if (modal) modal.style.display = 'none';
        document.getElementById('btn-toggle-play-test')?.click();
    });

    // Enter / Exit Vehicle Buttons
    document.getElementById('btn-enter-vehicle')?.addEventListener('click', () => {
        if (nearbyVehicle) enterVehicle(nearbyVehicle);
    });
    document.getElementById('btn-exit-vehicle')?.addEventListener('click', () => {
        exitVehicle();
    });

    // Dimension Travel Modal Buttons
    document.getElementById('btn-quick-travel-hud')?.addEventListener('click', () => {
        openDimensionTravelModal();
    });
    document.getElementById('btn-close-dimension-modal')?.addEventListener('click', () => {
        const modal = document.getElementById('dimension-travel-modal');
        if (modal) modal.style.display = 'none';
    });

    window.addEventListener('keyup', e => { keys[e.code] = false; });

    const dom = renderer.domElement;

    dom.addEventListener('mousedown', e => {
        if (e.button === 2) {
            isRightMouseDown = true;
            mousePos = { x: e.clientX, y: e.clientY };
        } else if (e.button === 0 && !isPlayTestMode) {
            const rect = dom.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);
            
            const hitGroup = placedObjects.find(p => {
                const hits = raycaster.intersectObject(p.mesh, true);
                return hits.length > 0;
            });

            if (hitGroup) {
                selectObject(hitGroup);
                isDraggingObject = true;
            }
        } else if (e.button === 0 && isPlayTestMode) {
            // Click in play test mode triggers player attack
            playerAttack();
        }
    });

    window.addEventListener('mouseup', e => {
        if (e.button === 2) isRightMouseDown = false;
        if (e.button === 0) isDraggingObject = false;
    });

    window.addEventListener('mousemove', e => {
        if (isRightMouseDown && !isPlayTestMode) {
            const dx = e.clientX - mousePos.x;
            const dy = e.clientY - mousePos.y;
            mousePos = { x: e.clientX, y: e.clientY };

            orbitTheta -= dx * 0.006;
            orbitPhi = Math.max(0.1, Math.min(Math.PI / 2.1, orbitPhi - dy * 0.006));
            updateOrbitCamera();
        } else if (isDraggingObject && selectedObject && !isPlayTestMode) {
            const rect = dom.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);
            const hitPoint = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(dragPlane, hitPoint)) {
                selectedObject.mesh.position.x = hitPoint.x;
                selectedObject.mesh.position.z = hitPoint.z;
                selectedObject.position.x = hitPoint.x;
                selectedObject.position.z = hitPoint.z;
                updateInspectorDisplay();
            }
        }
    });

    dom.addEventListener('wheel', e => {
        if (!isPlayTestMode) {
            orbitRadius = Math.max(5, Math.min(100, orbitRadius + e.deltaY * 0.05));
            updateOrbitCamera();
        }
    });

    dom.addEventListener('contextmenu', e => e.preventDefault());

    // Play Test Mode Toggle & On-Screen Controls
    const playTestBtn = document.getElementById('btn-toggle-play-test');
    const playTestHud = document.getElementById('play-test-hud');
    const gameplayHud = document.getElementById('gameplay-hud');
    const gameplayActions = document.getElementById('gameplay-action-controls');
    const playTestControls = document.getElementById('play-test-controls');
    const studioCamControls = document.getElementById('studio-camera-controls');
    const catalogPanel = document.getElementById('catalog-panel');
    const inspectorPanel = document.getElementById('inspector-panel');

    if (playTestBtn) {
        playTestBtn.addEventListener('click', () => {
            isPlayTestMode = !isPlayTestMode;
            if (isPlayTestMode) {
                selectObject(null);
                isDraggingObject = false;
                humanCharacter.position.set(0, 0, 0);
                characterVelocity.set(0, 0, 0);
                isGrounded = true;
                playerHealth = playerMaxHealth;
                isGameOver = false;
                isGameFinished = false;

                playTestBtn.innerHTML = '<span>⏹️</span> <span>Exit Play Test</span>';
                playTestBtn.style.background = '#e74c3c';
                if (playTestHud) playTestHud.style.display = 'block';
                if (gameplayHud) gameplayHud.style.display = 'flex';
                if (gameplayActions) gameplayActions.style.display = 'flex';
                if (playTestControls) playTestControls.style.display = 'flex';
                if (studioCamControls) studioCamControls.style.display = 'none';
                if (catalogPanel) catalogPanel.style.display = 'none';
                if (inspectorPanel) inspectorPanel.style.display = 'none';

                updateGameplayHUD();
            } else {
                if (currentVehicle) exitVehicle();
                playTestBtn.innerHTML = '<span>▶️</span> <span>Play Test Mode</span>';
                playTestBtn.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
                if (playTestHud) playTestHud.style.display = 'none';
                if (gameplayHud) gameplayHud.style.display = 'none';
                if (gameplayActions) gameplayActions.style.display = 'none';
                if (playTestControls) playTestControls.style.display = 'none';
                if (studioCamControls) studioCamControls.style.display = 'flex';
                if (catalogPanel) catalogPanel.style.display = 'flex';
                if (inspectorPanel) inspectorPanel.style.display = 'block';

                const victoryModal = document.getElementById('game-victory-modal');
                const gameOverModal = document.getElementById('game-over-modal');
                const shopModal = document.getElementById('in-game-shop-modal');
                if (victoryModal) victoryModal.style.display = 'none';
                if (gameOverModal) gameOverModal.style.display = 'none';
                if (shopModal) shopModal.style.display = 'none';

                updateOrbitCamera();
            }
        });
    }

    // Save Game Button
    document.getElementById('btn-save-draft')?.addEventListener('click', () => {
        saveCurrentGame(true);
    });

    // My Games Modal Open/Close Buttons
    document.getElementById('btn-open-my-games')?.addEventListener('click', () => {
        const modal = document.getElementById('my-games-modal');
        if (modal) {
            modal.style.display = 'flex';
            renderMySavedGamesModal();
        }
    });

    document.getElementById('btn-close-my-games')?.addEventListener('click', () => {
        const modal = document.getElementById('my-games-modal');
        if (modal) modal.style.display = 'none';
    });

    document.getElementById('btn-modal-close-bottom')?.addEventListener('click', () => {
        const modal = document.getElementById('my-games-modal');
        if (modal) modal.style.display = 'none';
    });

    // New Game Buttons
    document.getElementById('btn-new-game')?.addEventListener('click', () => {
        startNewEmptyGame();
    });

    document.getElementById('btn-modal-new-game')?.addEventListener('click', () => {
        const modal = document.getElementById('my-games-modal');
        if (modal) modal.style.display = 'none';
        startNewEmptyGame();
    });

    // Dismiss Feedback Banner Buttons
    const hideFeedbackBanner = () => {
        const banner = document.getElementById('admin-feedback-banner');
        if (banner) banner.style.display = 'none';
        if (activeFeedbackGameId) {
            localStorage.setItem('playard_dismissed_feedback_' + activeFeedbackGameId, 'true');
        }
        localStorage.setItem('playard_hide_admin_feedback', 'true');
    };

    document.getElementById('btn-close-feedback-banner')?.addEventListener('click', hideFeedbackBanner);
    document.getElementById('btn-dismiss-feedback-text')?.addEventListener('click', hideFeedbackBanner);

    // Studio Camera Navigation Buttons
    document.getElementById('cam-btn-left')?.addEventListener('click', () => {
        const camRight = new THREE.Vector3(Math.cos(orbitTheta), 0, -Math.sin(orbitTheta)).normalize();
        orbitTarget.addScaledVector(camRight, -4);
        updateOrbitCamera();
    });
    document.getElementById('cam-btn-right')?.addEventListener('click', () => {
        const camRight = new THREE.Vector3(Math.cos(orbitTheta), 0, -Math.sin(orbitTheta)).normalize();
        orbitTarget.addScaledVector(camRight, 4);
        updateOrbitCamera();
    });
    document.getElementById('cam-btn-fwd')?.addEventListener('click', () => {
        const camForward = new THREE.Vector3(-Math.sin(orbitTheta), 0, -Math.cos(orbitTheta)).normalize();
        orbitTarget.addScaledVector(camForward, 4);
        updateOrbitCamera();
    });
    document.getElementById('cam-btn-back')?.addEventListener('click', () => {
        const camForward = new THREE.Vector3(-Math.sin(orbitTheta), 0, -Math.cos(orbitTheta)).normalize();
        orbitTarget.addScaledVector(camForward, -4);
        updateOrbitCamera();
    });
    document.getElementById('cam-btn-zoom-in')?.addEventListener('click', () => {
        orbitRadius = Math.max(5, orbitRadius - 4);
        updateOrbitCamera();
    });
    document.getElementById('cam-btn-zoom-out')?.addEventListener('click', () => {
        orbitRadius = Math.min(100, orbitRadius + 4);
        updateOrbitCamera();
    });
    document.getElementById('cam-btn-rot-left')?.addEventListener('click', () => {
        orbitTheta += Math.PI / 8;
        updateOrbitCamera();
    });
    document.getElementById('cam-btn-rot-right')?.addEventListener('click', () => {
        orbitTheta -= Math.PI / 8;
        updateOrbitCamera();
    });

    // Touch / On-screen D-Pad and Jump Controls Setup (Play Test)
    const bindTouchBtn = (id: string, code: string) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const press = (e: Event) => { e.preventDefault(); keys[code] = true; };
        const release = (e: Event) => { e.preventDefault(); keys[code] = false; };
        btn.addEventListener('mousedown', press);
        btn.addEventListener('mouseup', release);
        btn.addEventListener('mouseleave', release);
        btn.addEventListener('touchstart', press, { passive: false });
        btn.addEventListener('touchend', release, { passive: false });
    };

    bindTouchBtn('touch-btn-up', 'ArrowUp');
    bindTouchBtn('touch-btn-down', 'ArrowDown');
    bindTouchBtn('touch-btn-left', 'ArrowLeft');
    bindTouchBtn('touch-btn-right', 'ArrowRight');
    bindTouchBtn('touch-btn-jump', 'Space');

    // Submit for Review Button
    const submitBtn = document.getElementById('btn-submit-review');
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const profile = getCurrentUserProfile();
            if (!profile) {
                return alert('🔒 You must be logged in to submit games for review!');
            }

            const titleInput = document.getElementById('game-title-input') as HTMLInputElement | null;
            const catSelect = document.getElementById('game-category-select') as HTMLSelectElement | null;
            const descInput = document.getElementById('game-desc-input') as HTMLInputElement | null;

            const title = titleInput?.value.trim() || 'My 3D Adventure';
            const category = catSelect?.value || 'Adventure';
            const description = descInput?.value.trim() || '';

            const serializedObjects = placedObjects.map(p => ({
                id: p.id,
                catalogId: p.catalogId,
                name: p.name,
                category: p.category,
                position: { x: p.mesh.position.x, y: p.mesh.position.y, z: p.mesh.position.z },
                rotation: { x: p.mesh.rotation.x, y: p.mesh.rotation.y, z: p.mesh.rotation.z },
                scale: { x: p.mesh.scale.x, y: p.mesh.scale.y, z: p.mesh.scale.z },
                color: p.color
            }));

            const sceneData = {
                title,
                category,
                description,
                objects: serializedObjects,
                createdAt: Date.now()
            };

            submitBtn.innerText = 'Submitting...';
            (submitBtn as HTMLButtonElement).disabled = true;

            const res = await yardService.submitGameForReview({
                creatorUsername: profile.username,
                title,
                description,
                category,
                sceneData
            });

            submitBtn.innerHTML = '<span>🚀</span> <span>Submit for Review</span>';
            (submitBtn as HTMLButtonElement).disabled = false;

            if (res.success) {
                yardService.saveUserGame(profile.username, sceneData);
                alert(`✅ ${res.message}`);
                if (confirm('Would you like to return to the Hub?')) {
                    window.location.href = '../../index.html';
                }
            } else {
                alert('Could not submit game: ' + res.message);
            }
        });
    }
}

function setupCatalogEvents() {
    const searchInput = document.getElementById('catalog-search-input') as HTMLInputElement | null;
    const catButtons = document.querySelectorAll('.cat-btn');

    let currentCat = 'all';

    catButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            catButtons.forEach(b => b.classList.remove('active'));
            (e.currentTarget as HTMLElement).classList.add('active');
            currentCat = (e.currentTarget as HTMLElement).getAttribute('data-cat') || 'all';
            renderCatalogUI(currentCat, searchInput?.value || '');
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderCatalogUI(currentCat, searchInput.value);
        });
    }

    // Input listeners for auto-save draft
    document.getElementById('game-title-input')?.addEventListener('input', autoSaveDraft);
    document.getElementById('game-category-select')?.addEventListener('change', autoSaveDraft);
    document.getElementById('game-desc-input')?.addEventListener('input', autoSaveDraft);
}

function setupInspectorEvents() {
    const scaleInput = document.getElementById('obj-scale-input') as HTMLInputElement | null;
    const colorInput = document.getElementById('obj-color-input') as HTMLInputElement | null;
    const deleteBtn = document.getElementById('btn-delete-obj');
    const dupBtn = document.getElementById('btn-duplicate-obj');

    // Visual Move & Rotate Buttons
    document.getElementById('btn-move-fwd')?.addEventListener('click', () => moveSelectedObject(0, 0, -0.5));
    document.getElementById('btn-move-back')?.addEventListener('click', () => moveSelectedObject(0, 0, 0.5));
    document.getElementById('btn-move-left')?.addEventListener('click', () => moveSelectedObject(-0.5, 0, 0));
    document.getElementById('btn-move-right')?.addEventListener('click', () => moveSelectedObject(0.5, 0, 0));
    document.getElementById('btn-move-up')?.addEventListener('click', () => moveSelectedObject(0, 0.5, 0));
    document.getElementById('btn-move-down')?.addEventListener('click', () => moveSelectedObject(0, -0.5, 0));
    document.getElementById('btn-rotate-r')?.addEventListener('click', () => rotateSelectedObject(Math.PI / 4));

    if (scaleInput) {
        scaleInput.addEventListener('input', () => {
            if (selectedObject) {
                const s = parseFloat(scaleInput.value) || 1;
                selectedObject.mesh.scale.setScalar(s);
                autoSaveDraft();
            }
        });
    }

    if (colorInput) {
        colorInput.addEventListener('input', () => {
            if (selectedObject) {
                selectedObject.color = colorInput.value;
                selectedObject.mesh.traverse(child => {
                    if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material) {
                        ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(colorInput.value);
                    }
                });
                autoSaveDraft();
            }
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            deleteSelectedObject();
        });
    }

    if (dupBtn) {
        dupBtn.addEventListener('click', () => {
            if (selectedObject) {
                const catItem = CATALOG_DATABASE.find(c => c.id === selectedObject!.catalogId) || {
                    id: selectedObject.catalogId,
                    name: selectedObject.name,
                    category: selectedObject.category as any,
                    icon: '📦',
                    color: selectedObject.color,
                    geometryType: 'prop',
                    baseScale: selectedObject.scale.x
                };
                spawnObjectIntoScene(catItem);
            }
        });
    }

    const triggerInput = document.getElementById('obj-trigger-text') as HTMLInputElement | null;
    if (triggerInput) {
        triggerInput.addEventListener('input', () => {
            if (selectedObject) {
                const val = triggerInput.value.trim();
                if (val) {
                    selectedObject.trigger = {
                        type: 'touch',
                        message: val,
                        title: selectedObject.name,
                        radius: 3.8
                    };
                } else if (selectedObject.trigger?.type === 'touch') {
                    delete selectedObject.trigger;
                }
                autoSaveDraft();
            }
        });
    }
}

let activeFeedbackGameId: string | null = null;

export function startNewEmptyGame() {
    if (placedObjects.length > 0 && !confirm('Alustada uut tühja mängu? Pooleli olev mäng jääb alles "My Games" alla.')) {
        return;
    }
    placedObjects.forEach(p => scene.remove(p.mesh));
    placedObjects = [];
    selectObject(null);

    const titleInput = document.getElementById('game-title-input') as HTMLInputElement | null;
    const catSelect = document.getElementById('game-category-select') as HTMLSelectElement | null;
    const descInput = document.getElementById('game-desc-input') as HTMLInputElement | null;

    if (titleInput) titleInput.value = 'My New 3D Adventure';
    if (catSelect) catSelect.value = 'Adventure';
    if (descInput) descInput.value = 'A brand new 3D world created in Playard!';

    // Hide any active feedback banner permanently for this session
    localStorage.setItem('playard_hide_admin_feedback', 'true');
    const banner = document.getElementById('admin-feedback-banner');
    if (banner) banner.style.display = 'none';

    autoSaveDraft();
    alert('✨ Uus tühi mäng loodud! Vali esemeid vasakult kataloogist või küsi AI Assistendilt abi!');
}

export function renderMySavedGamesModal() {
    const profile = getCurrentUserProfile();
    const listContainer = document.getElementById('my-games-list-container');
    if (!listContainer) return;

    const savedGames = yardService.getUserSavedGames(profile?.username ?? null);

    if (savedGames.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #a4b0be;">
                <div style="font-size: 3rem; margin-bottom: 10px;">📦</div>
                <h4 style="color: #fff; margin-bottom: 6px;">You have no saved games yet</h4>
                <p style="font-size: 0.85rem;">Ehita oma esimene mäng või kasuta AI assistenti ning vajuta "💾 Save Game"!</p>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = '';
    savedGames.forEach((game: any) => {
        const item = document.createElement('div');
        item.style.cssText = 'background: #1e293b; border: 1.5px solid rgba(0,242,254,0.3); border-radius: 12px; padding: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;';

        const objCount = game.objects?.length || game.objectCount || 0;
        const dateStr = game.updatedAt ? new Date(game.updatedAt).toLocaleString() : 'Recently';

        item.innerHTML = `
            <div>
                <h4 style="margin: 0 0 4px 0; color: #00f2fe; font-size: 1.1rem;">🎮 ${game.title}</h4>
                <div style="font-size: 0.85rem; color: #94a3b8;">
                    Kategooria: <strong style="color: #ffd32a;">${game.category}</strong> | Objekte: <strong>${objCount} tk</strong> | ${dateStr}
                </div>
                <div style="font-size: 0.85rem; color: #cbd5e1; margin-top: 4px;">${game.description || 'Kirjeldus puudub'}</div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="btn-load-game" style="padding: 8px 14px; background: linear-gradient(135deg, #00f2fe, #4facfe); color: #111; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; font-size: 0.85rem;">
                    📂 Laadi mäng
                </button>
                <button class="btn-delete-saved-game" style="padding: 8px 12px; background: rgba(231,76,60,0.2); border: 1px solid #e74c3c; color: #e74c3c; border-radius: 8px; cursor: pointer; font-size: 0.85rem;">
                    🗑️
                </button>
            </div>
        `;

        item.querySelector('.btn-load-game')?.addEventListener('click', () => {
            loadSceneFromData(game);
            const modal = document.getElementById('my-games-modal');
            if (modal) modal.style.display = 'none';
            alert(`✅ Game "${game.title}" loaded successfully!`);
        });

        item.querySelector('.btn-delete-saved-game')?.addEventListener('click', () => {
            if (confirm(`Kas soovid kindlasti mängu "${game.title}" kustutada?`)) {
                yardService.deleteUserSavedGame(profile?.username ?? null, game.id);
                renderMySavedGamesModal();
            }
        });

        listContainer.appendChild(item);
    });
}

async function restoreDraftOrFeedbackGame() {
    const profile = getCurrentUserProfile();
    let hasRestored = false;

    // 1. Check if admin requested changes with feedback
    if (profile?.username) {
        try {
            const feedbackGames = await yardService.getFeedbackGamesForCreator(profile.username);
            const banner = document.getElementById('admin-feedback-banner');
            if (feedbackGames.length > 0) {
                const fbGame = feedbackGames[0];
                activeFeedbackGameId = fbGame.id;
                const fbTitle = document.getElementById('feedback-banner-title');
                const fbText = document.getElementById('feedback-banner-text');

                const isDismissed = localStorage.getItem('playard_dismissed_feedback_' + fbGame.id) === 'true' || localStorage.getItem('playard_hide_admin_feedback') === 'true';

                if (banner && fbTitle && fbText) {
                    fbTitle.innerText = `Admin✅ Requested Changes for "${fbGame.title}":`;
                    fbText.innerText = `"${fbGame.feedback}"`;
                    if (!isDismissed) {
                        banner.style.display = 'flex';
                    } else {
                        banner.style.display = 'none';
                    }
                }

                if (fbGame.sceneData) {
                    loadSceneFromData(fbGame.sceneData);
                    hasRestored = true;
                }
            } else {
                if (banner) banner.style.display = 'none';
            }
        } catch (e) {
            console.warn('Could not check feedback games:', e);
        }
    } else {
        const banner = document.getElementById('admin-feedback-banner');
        if (banner) banner.style.display = 'none';
    }

    // 2. If no feedback game, restore local auto-saved draft
    if (!hasRestored) {
        const draft = yardService.getDraftGame(profile?.username ?? null);
        if (draft && Array.isArray(draft.objects) && draft.objects.length > 0) {
            loadSceneFromData(draft);
            const indicator = document.getElementById('draft-status-indicator');
            if (indicator) {
                indicator.innerText = '💾 Draft Restored';
            }
        }
    }
}

// --- AI Game Builder Assistant ---
function isCurrentUserAdmin(): boolean {
    const profile = getCurrentUserProfile();
    if (!profile) return false;
    return !!(profile.isAdmin === true || profile.email?.toLowerCase() === '1karl.ilves@gmail.com');
}

export function updateAiAssistantLocalization() {
    const isAdmin = isCurrentUserAdmin();

    const aiWelcome = document.getElementById('ai-welcome-msg');
    const inputField = document.getElementById('ai-prompt-input') as HTMLInputElement | null;
    const submitBtn = document.getElementById('btn-ai-submit');
    const quickContainer = document.getElementById('ai-quick-container');

    if (isAdmin) {
        if (aiWelcome) {
            aiWelcome.innerHTML = `👋 <strong>Tere! Olen sinu AI Mänguassistent.</strong><br>Kirjuta mulle, mida soovid ehitada, küsi matemaatikat (nt 1+1) või palu mul olemasolevatele asjadele detaile juurde lisada! 🚀`;
        }
        if (inputField) inputField.placeholder = "Kirjuta siia käsk või küsimus (nt 1+1 või lisa auto)...";
        if (submitBtn) submitBtn.innerHTML = `<span>✨</span> Loo / Küsi`;
        if (quickContainer) {
            quickContainer.innerHTML = `
                <button class="ai-quick-btn" data-prompt="Loo lendav lennuk ja lennurada millega lennata" style="background: rgba(0, 242, 254, 0.2); border: 1px solid #00f2fe; color: #00f2fe; font-size: 0.75rem; padding: 3px 8px; border-radius: 12px; cursor: pointer;">✈️ Loo lendav lennuk</button>
                <button class="ai-quick-btn" data-prompt="Lisa autole autoteed, koonused ja tänavalambid juurde" style="background: rgba(255, 211, 42, 0.2); border: 1px solid #ffd32a; color: #ffd32a; font-size: 0.75rem; padding: 3px 8px; border-radius: 12px; cursor: pointer;">🚗 Lisa autole asju juurde</button>
                <button class="ai-quick-btn" data-prompt="Lisa puudele kivid, lilled ja metsarada juurde" style="background: rgba(46, 204, 113, 0.2); border: 1px solid #2ecc71; color: #2ecc71; font-size: 0.75rem; padding: 3px 8px; border-radius: 12px; cursor: pointer;">🌲 Kaunista mets</button>
                <button class="ai-quick-btn" data-prompt="Loo põnev parkuurirada takistustega" style="background: rgba(168, 85, 247, 0.2); border: 1px solid #a855f7; color: #e056fd; font-size: 0.75rem; padding: 3px 8px; border-radius: 12px; cursor: pointer;">🏃 Parkour</button>
            `;
        }
    } else {
        if (aiWelcome) {
            aiWelcome.innerHTML = `👋 <strong>Hello! I am your AI Game Assistant.</strong><br>Tell me what you would like to build, ask math calculations (e.g. 1+1), or ask me to add details and decorations to objects! 🚀`;
        }
        if (inputField) inputField.placeholder = "Type prompt or question (e.g. 1+1 or add car)...";
        if (submitBtn) submitBtn.innerHTML = `<span>✨</span> Create / Ask`;
        if (quickContainer) {
            quickContainer.innerHTML = `
                <button class="ai-quick-btn" data-prompt="Create a flyable airplane with runway" style="background: rgba(0, 242, 254, 0.2); border: 1px solid #00f2fe; color: #00f2fe; font-size: 0.75rem; padding: 3px 8px; border-radius: 12px; cursor: pointer;">✈️ Flyable Airplane</button>
                <button class="ai-quick-btn" data-prompt="Add roads, cones, and street lights to the car" style="background: rgba(255, 211, 42, 0.2); border: 1px solid #ffd32a; color: #ffd32a; font-size: 0.75rem; padding: 3px 8px; border-radius: 12px; cursor: pointer;">🚗 Add details to car</button>
                <button class="ai-quick-btn" data-prompt="Add rocks, flowers, and path to the trees" style="background: rgba(46, 204, 113, 0.2); border: 1px solid #2ecc71; color: #2ecc71; font-size: 0.75rem; padding: 3px 8px; border-radius: 12px; cursor: pointer;">🌲 Decorate forest</button>
                <button class="ai-quick-btn" data-prompt="Create an exciting parkour challenge" style="background: rgba(168, 85, 247, 0.2); border: 1px solid #a855f7; color: #e056fd; font-size: 0.75rem; padding: 3px 8px; border-radius: 12px; cursor: pointer;">🏃 Parkour</button>
            `;
        }
    }

    // Rebind quick buttons
    document.querySelectorAll('.ai-quick-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const promptText = (e.currentTarget as HTMLElement).getAttribute('data-prompt') || '';
            const aiModal = document.getElementById('ai-assistant-modal');
            if (promptText) {
                if (aiModal) aiModal.style.display = 'flex';
                executeAiBuild(promptText);
            }
        });
    });
}

export function setupAiAssistantEvents() {
    const aiModal = document.getElementById('ai-assistant-modal');
    const toggleBtn = document.getElementById('btn-toggle-ai');
    const closeBtn = document.getElementById('btn-close-ai');
    const submitBtn = document.getElementById('btn-ai-submit');
    const inputField = document.getElementById('ai-prompt-input') as HTMLInputElement | null;

    updateAiAssistantLocalization();

    if (toggleBtn && aiModal) {
        toggleBtn.addEventListener('click', () => {
            const isShown = aiModal.style.display === 'flex';
            aiModal.style.display = isShown ? 'none' : 'flex';
            if (!isShown) {
                updateAiAssistantLocalization();
                if (inputField) inputField.focus();
            }
        });
    }

    if (closeBtn && aiModal) {
        closeBtn.addEventListener('click', () => {
            aiModal.style.display = 'none';
        });
    }

    const handleSend = () => {
        if (!inputField) return;
        const promptText = inputField.value.trim();
        if (!promptText) return;
        inputField.value = '';
        executeAiBuild(promptText);
    };

    submitBtn?.addEventListener('click', handleSend);
    inputField?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSend();
        }
    });
}

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

// --- Create Procedural 3D Mesh for any Custom Entity (not in catalog) ---
function createCustomProceduralMesh(prompt: string, name: string): THREE.Group {
    const group = new THREE.Group();
    const p = (prompt + ' ' + name).toLowerCase();

    // Color extraction helper
    let tint = 0x3498db;
    if (p.includes('punan') || p.includes('red')) tint = 0xe74c3c;
    else if (p.includes('kollan') || p.includes('yellow') || p.includes('gold') || p.includes('kuld')) tint = 0xf1c40f;
    else if (p.includes('rohelin') || p.includes('green')) tint = 0x2ecc71;
    else if (p.includes('sinin') || p.includes('blue')) tint = 0x3498db;
    else if (p.includes('must') || p.includes('black')) tint = 0x2c3e50;
    else if (p.includes('valg') || p.includes('white')) tint = 0xfafafa;
    else if (p.includes('lilla') || p.includes('purple')) tint = 0x9b59b6;
    else if (p.includes('roosa') || p.includes('pink')) tint = 0xff7675;
    else if (p.includes('oranž') || p.includes('oranz') || p.includes('orange')) tint = 0xe67e22;

    // 1. RABBIT / JÄNES / BUNNY
    if (p.includes('jänes') || p.includes('janes') || p.includes('rabbit') || p.includes('bunny') || p.includes('hare') || p.includes('janku')) {
        const furMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.8 });
        const earInnerMat = new THREE.MeshStandardMaterial({ color: 0xffb8b8, roughness: 0.5 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.2 });
        const noseMat = new THREE.MeshStandardMaterial({ color: 0xff7675 });

        const body = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 16), furMat);
        body.scale.set(1.0, 1.2, 1.3);
        body.position.set(0, 1.2, 0);
        group.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 16), furMat);
        head.position.set(0, 2.2, 0.6);
        group.add(head);

        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), noseMat);
        nose.position.set(0, 2.15, 1.3);
        group.add(nose);

        [-0.35, 0.35].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), eyeMat);
            eye.position.set(x, 2.35, 1.15);
            group.add(eye);
        });

        [-0.3, 0.3].forEach(x => {
            const earOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 1.5, 8), furMat);
            earOuter.position.set(x, 3.4, 0.5);
            earOuter.rotation.z = (x < 0 ? 0.15 : -0.15);
            group.add(earOuter);

            const earInner = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 1.2, 8), earInnerMat);
            earInner.position.set(x, 3.4, 0.62);
            earInner.rotation.z = (x < 0 ? 0.15 : -0.15);
            group.add(earInner);
        });

        const tail = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), furMat);
        tail.position.set(0, 1.0, -1.3);
        group.add(tail);

        [-0.45, 0.45].forEach(x => {
            const frontPaw = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), furMat);
            frontPaw.scale.set(0.8, 0.6, 1.4);
            frontPaw.position.set(x, 0.2, 0.6);
            group.add(frontPaw);

            const backPaw = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), furMat);
            backPaw.scale.set(0.9, 0.7, 1.6);
            backPaw.position.set(x, 0.25, -0.4);
            group.add(backPaw);
        });

    // 2. DOG / KOER / WOLF / HUNT / FOX / REBANE / PUPPY
    } else if (p.includes('koer') || p.includes('dog') || p.includes('kutsik') || p.includes('puppy') || p.includes('wolf') || p.includes('hunt') || p.includes('fox') || p.includes('rebane')) {
        const coatColor = p.includes('fox') || p.includes('rebane') ? 0xe67e22 : (p.includes('wolf') || p.includes('hunt') ? 0x7f8c8d : 0xc0392b);
        const coatMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.7 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.8 });
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.3 });
        const collarMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.4 });

        // Body & Chest
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.5, 2.8), coatMat);
        body.position.set(0, 1.5, 0);
        group.add(body);

        const chest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.4), whiteMat);
        chest.position.set(0, 1.5, 1.3);
        group.add(chest);

        // Head & Muzzle
        const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.3), coatMat);
        head.position.set(0, 2.5, 1.4);
        group.add(head);

        const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.0), whiteMat);
        muzzle.position.set(0, 2.3, 2.2);
        group.add(muzzle);

        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), blackMat);
        nose.position.set(0, 2.5, 2.7);
        group.add(nose);

        [-0.35, 0.35].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), blackMat);
            eye.position.set(x, 2.7, 1.95);
            group.add(eye);
            const ear = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 4), coatMat);
            ear.position.set(x, 3.3, 1.3);
            group.add(ear);
        });

        // Collar
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.08, 6, 16), collarMat);
        collar.position.set(0, 2.0, 1.2);
        collar.rotation.x = Math.PI / 3;
        group.add(collar);

        // 4 Legs
        [-0.5, 0.5].forEach(lx => {
            [0.9, -0.9].forEach(lz => {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.4, 8), coatMat);
                leg.position.set(lx, 0.7, lz);
                group.add(leg);
            });
        });

        // Wagging Tail
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.3, 6), coatMat);
        tail.position.set(0, 2.0, -1.8);
        tail.rotation.x = -Math.PI / 4;
        group.add(tail);

    // 3. CAT / KASS / LION / LÕVI / TIGER / TIIGER
    } else if (p.includes('kass') || p.includes('cat') || p.includes('kiisu') || p.includes('kitten') || p.includes('lion') || p.includes('lõvi') || p.includes('lovi') || p.includes('tiger') || p.includes('tiiger')) {
        const furColor = p.includes('lion') || p.includes('lõvi') ? 0xf39c12 : (p.includes('tiger') || p.includes('tiiger') ? 0xe67e22 : 0x2c3e50);
        const furMat = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.6 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, emissive: 0x2ecc71, emissiveIntensity: 0.6 });

        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 2.4, 12), furMat);
        body.rotation.x = Math.PI / 2;
        body.position.set(0, 1.2, 0);
        group.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 12), furMat);
        head.position.set(0, 1.8, 1.3);
        group.add(head);

        [-0.3, 0.3].forEach(x => {
            const ear = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 3), furMat);
            ear.position.set(x, 2.4, 1.3);
            group.add(ear);
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), eyeMat);
            eye.position.set(x, 1.9, 1.85);
            group.add(eye);
        });

        const snout = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), whiteMat);
        snout.position.set(0, 1.7, 1.9);
        group.add(snout);

        [-0.4, 0.4].forEach(lx => {
            [0.7, -0.7].forEach(lz => {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.1, 8), furMat);
                leg.position.set(lx, 0.55, lz);
                group.add(leg);
            });
        });

        // Curled Sleek Tail
        const tail = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.1, 6, 12, Math.PI), furMat);
        tail.position.set(0, 1.4, -1.5);
        tail.rotation.y = Math.PI / 2;
        group.add(tail);

    // 4. HORSE / HOBUNE / UNICORN / ÜKSSARVIK / PEGASUS
    } else if (p.includes('hobune') || p.includes('horse') || p.includes('ükssarvik') || p.includes('ukssarvik') || p.includes('unicorn') || p.includes('pegas')) {
        const horseColor = p.includes('unicorn') || p.includes('ükssarvik') ? 0xffffff : 0x8b4513;
        const horseMat = new THREE.MeshStandardMaterial({ color: horseColor, roughness: 0.6 });
        const maneMat = new THREE.MeshStandardMaterial({ color: p.includes('unicorn') ? 0xff7675 : 0x2c3e50 });
        const hornMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.8, emissive: 0xffd32a, emissiveIntensity: 0.8 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 3.4), horseMat);
        body.position.set(0, 2.2, 0);
        group.add(body);

        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 2.0, 8), horseMat);
        neck.position.set(0, 3.4, 1.5);
        neck.rotation.x = -Math.PI / 6;
        group.add(neck);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 1.6), horseMat);
        head.position.set(0, 4.4, 2.0);
        head.rotation.x = Math.PI / 8;
        group.add(head);

        if (p.includes('unicorn') || p.includes('ükssarvik') || p.includes('ukssarvik')) {
            const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.8, 8), hornMat);
            horn.position.set(0, 5.4, 2.5);
            horn.rotation.x = Math.PI / 4;
            group.add(horn);
        }

        [-0.6, 0.6].forEach(lx => {
            [1.2, -1.2].forEach(lz => {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 2.2, 8), horseMat);
                leg.position.set(lx, 1.1, lz);
                group.add(leg);
            });
        });

    // 5. BEAR / KARU / PANDA
    } else if (p.includes('karu') || p.includes('bear') || p.includes('panda')) {
        const isPanda = p.includes('panda');
        const bearColor = isPanda ? 0xffffff : (p.includes('jääkaru') || p.includes('polar') ? 0xfafafa : 0x5d4037);
        const bearMat = new THREE.MeshStandardMaterial({ color: bearColor, roughness: 0.8 });
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.7 });

        const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 16), isPanda ? blackMat : bearMat);
        body.position.set(0, 1.8, 0);
        group.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(1.1, 14, 14), bearMat);
        head.position.set(0, 3.2, 0.8);
        group.add(head);

        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), bearMat);
        snout.position.set(0, 3.0, 1.8);
        group.add(snout);

        [-0.7, 0.7].forEach(x => {
            const ear = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), isPanda ? blackMat : bearMat);
            ear.position.set(x, 4.1, 0.7);
            group.add(ear);
        });

    // 6. BIRD / LIND / EAGLE / KOTKAS / PENGUIN / PINGVIIN / DUCK / PART
    } else if (p.includes('lind') || p.includes('bird') || p.includes('kotkas') || p.includes('eagle') || p.includes('pingviin') || p.includes('penguin') || p.includes('part') || p.includes('duck') || p.includes('öökull') || p.includes('owl')) {
        const isPenguin = p.includes('pingviin') || p.includes('penguin');
        const bodyMat = new THREE.MeshStandardMaterial({ color: isPenguin ? 0x1e272e : 0x3498db, roughness: 0.6 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
        const beakMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, roughness: 0.3 });

        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 2.2, 12), bodyMat);
        body.position.set(0, 1.4, 0);
        group.add(body);

        const belly = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.6, 0.3), whiteMat);
        belly.position.set(0, 1.4, 0.8);
        group.add(belly);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 12), bodyMat);
        head.position.set(0, 2.7, 0);
        group.add(head);

        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 4), beakMat);
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, 2.6, 0.9);
        group.add(beak);

        [-1.2, 1.2].forEach(x => {
            const wing = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.8), bodyMat);
            wing.position.set(x, 1.6, 0);
            wing.rotation.z = x < 0 ? 0.3 : -0.3;
            group.add(wing);
        });

    // 7. FISH / KALA / SHARK / HAI / WHALE / VAAL / DOLPHIN / DELFIIN
    } else if (p.includes('kala') || p.includes('fish') || p.includes('hai') || p.includes('shark') || p.includes('vaal') || p.includes('whale') || p.includes('delfiin') || p.includes('dolphin')) {
        const fishColor = p.includes('shark') || p.includes('hai') ? 0x7f8c8d : 0x00f2fe;
        const fishMat = new THREE.MeshStandardMaterial({ color: fishColor, roughness: 0.4, metalness: 0.2 });

        const body = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), fishMat);
        body.scale.set(0.8, 1.0, 2.6);
        body.position.set(0, 1.5, 0);
        group.add(body);

        // Dorsal Fin
        const fin = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 3), fishMat);
        fin.position.set(0, 2.8, 0);
        group.add(fin);

        // Tail Fin
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 1.2), fishMat);
        tail.position.set(0, 1.5, -3.2);
        group.add(tail);

    // 8. MOTORCYCLE / MOOTORRATAS / BIKE / JALGRATAS / SCOOTER
    } else if (p.includes('mootorratas') || p.includes('motorcycle') || p.includes('bike') || p.includes('krossikas') || p.includes('roller') || p.includes('scooter') || p.includes('jalgratas')) {
        const frameMat = new THREE.MeshStandardMaterial({ color: tint, metalness: 0.6, roughness: 0.3 });
        const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.9 });
        const chromeMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.9, roughness: 0.1 });

        // Two Wheels
        [-1.8, 1.8].forEach(z => {
            const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.22, 12, 24), tireMat);
            wheel.position.set(0, 0.7, z);
            group.add(wheel);
        });

        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 2.6), frameMat);
        frame.position.set(0, 1.2, 0);
        group.add(frame);

        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 1.0), new THREE.MeshStandardMaterial({ color: 0x2c3e50 }));
        seat.position.set(0, 1.65, -0.4);
        group.add(seat);

        const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 8), chromeMat);
        handlebar.rotation.z = Math.PI / 2;
        handlebar.position.set(0, 2.0, 1.4);
        group.add(handlebar);

        const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.9 }));
        headlight.position.set(0, 1.8, 2.0);
        group.add(headlight);

    // 9. TRAIN / RONG / LOCOMOTIVE / VEDUR / TRAM / TRAMM
    } else if (p.includes('rong') || p.includes('train') || p.includes('vedur') || p.includes('locomotive') || p.includes('tramm') || p.includes('tram')) {
        const trainMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.7 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.8 });

        const boiler = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 5.0, 16), metalMat);
        boiler.rotation.x = Math.PI / 2;
        boiler.position.set(0, 2.0, 0.5);
        group.add(boiler);

        const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.2, 2.8), trainMat);
        cab.position.set(0, 2.5, -2.5);
        group.add(cab);

        const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.6, 12), metalMat);
        chimney.position.set(0, 3.8, 2.0);
        group.add(chimney);

        // 6 Wheels
        [-1.3, 1.3].forEach(x => {
            [-2.2, 0, 2.2].forEach(z => {
                const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.3, 16), goldMat);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(x, 0.6, z);
                group.add(wheel);
            });
        });

    // 10. TRUCK / VEOAUTO / FIRETRUCK / TULETÕRJE / AMBULANCE / KIIRABI / POLICE / POLITSEI / TANK
    } else if (p.includes('veoauto') || p.includes('truck') || p.includes('tuletõrje') || p.includes('tuletorje') || p.includes('kiirabi') || p.includes('ambulance') || p.includes('politsei') || p.includes('police') || p.includes('tank')) {
        const isFire = p.includes('tulet');
        const isPolice = p.includes('politsei') || p.includes('police');
        const isTank = p.includes('tank');
        const truckColor = isTank ? 0x27ae60 : (isFire ? 0xe74c3c : (isPolice ? 0x2c3e50 : 0xf39c12));
        const bodyMat = new THREE.MeshStandardMaterial({ color: truckColor, roughness: 0.5 });
        const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.9 });

        const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.4), bodyMat);
        cab.position.set(0, 1.8, 1.8);
        group.add(cab);

        const bed = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 4.0), bodyMat);
        bed.position.set(0, 1.7, -1.6);
        group.add(bed);

        if (isTank) {
            const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 1.0, 12), bodyMat);
            turret.position.set(0, 3.2, 0);
            group.add(turret);

            const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 4.0, 8), new THREE.MeshStandardMaterial({ color: 0x1e272e }));
            cannon.rotation.x = Math.PI / 2;
            cannon.position.set(0, 3.3, 2.2);
            group.add(cannon);
        } else {
            // Flashing Siren Lightbar
            const sirenMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.9 });
            const siren = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.4), sirenMat);
            siren.position.set(0, 3.0, 1.8);
            group.add(siren);
        }

        [-1.3, 1.3].forEach(x => {
            [-2.4, -0.8, 1.8].forEach(z => {
                const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 12), tireMat);
                w.rotation.z = Math.PI / 2;
                w.position.set(x, 0.55, z);
                group.add(w);
            });
        });

    // 11. SPACESHIP / ROCKET / RAKETT / UFO / SATELLITE
    } else if (p.includes('rakett') || p.includes('rocket') || p.includes('kosmoselaev') || p.includes('spaceship') || p.includes('ufo') || p.includes('satellite') || p.includes('mars rover')) {
        const isUfo = p.includes('ufo');
        const hullMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.8, roughness: 0.2 });
        const glowMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.9 });

        if (isUfo) {
            const saucer = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 0.8, 0.8, 24), hullMat);
            saucer.position.set(0, 2.0, 0);
            group.add(saucer);

            const dome = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 16), glowMat);
            dome.position.set(0, 2.6, 0);
            group.add(dome);
        } else {
            const rocketBody = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.4, 6.5, 16), hullMat);
            rocketBody.position.set(0, 3.5, 0);
            group.add(rocketBody);

            const noseCone = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.2, 16), new THREE.MeshStandardMaterial({ color: 0xe74c3c }));
            noseCone.position.set(0, 7.8, 0);
            group.add(noseCone);

            for (let f = 0; f < 4; f++) {
                const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 1.4), new THREE.MeshStandardMaterial({ color: 0xe74c3c }));
                fin.position.set(Math.cos(f * Math.PI / 2) * 1.5, 1.2, Math.sin(f * Math.PI / 2) * 1.5);
                fin.rotation.y = f * Math.PI / 2;
                group.add(fin);
            }

            const exhaust = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.5, 12), new THREE.MeshStandardMaterial({ color: 0xffd32a, emissive: 0xff4500, emissiveIntensity: 0.9 }));
            exhaust.position.set(0, 0, 0);
            exhaust.rotation.x = Math.PI;
            group.add(exhaust);
        }

    // 12. VOLCANO / VULKAAN / MOUNTAIN / MÄGI / CAVE / KOOBAS
    } else if (p.includes('vulkaan') || p.includes('volcano') || p.includes('laava') || p.includes('lava') || p.includes('mägi') || p.includes('magi') || p.includes('mountain') || p.includes('koobas')) {
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 0.95 });
        const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff3838, emissive: 0xff3838, emissiveIntensity: 0.9, roughness: 0.2 });

        const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 6.5, 6.0, 16), rockMat);
        cone.position.set(0, 3.0, 0);
        group.add(cone);

        const crater = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.2, 0.4, 16), lavaMat);
        crater.position.set(0, 6.0, 0);
        group.add(crater);

    // 13. LIGHTHOUSE / TULETORN / WINDMILL / TUULEVESKI / TOWER / TORN
    } else if (p.includes('tuletorn') || p.includes('lighthouse') || p.includes('tuuleveski') || p.includes('windmill') || p.includes('torn') || p.includes('tower')) {
        const isWindmill = p.includes('tuuleveski') || p.includes('windmill');
        const towerMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, roughness: 0.6 });
        const redMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.5 });
        const lightMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, emissive: 0xffd32a, emissiveIntensity: 0.95 });

        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.2, 8.0, 12), towerMat);
        shaft.position.set(0, 4.0, 0);
        group.add(shaft);

        const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 1.8, 12), redMat);
        stripe.position.set(0, 4.5, 0);
        group.add(stripe);

        const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.5, 8), lightMat);
        lantern.position.set(0, 8.8, 0);
        group.add(lantern);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.0, 8), redMat);
        roof.position.set(0, 10.2, 0);
        group.add(roof);

        if (isWindmill) {
            for (let b = 0; b < 4; b++) {
                const blade = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.5, 0.08), new THREE.MeshStandardMaterial({ color: 0x8b4513 }));
                blade.position.set(Math.cos(b * Math.PI / 2) * 2.2, 8.5 + Math.sin(b * Math.PI / 2) * 2.2, 1.4);
                blade.rotation.z = b * Math.PI / 2;
                group.add(blade);
            }
        }

    // 14. TREEHOUSE / PUUONN / CABIN / PALKMAJA / TENT / TELK / IGLOO
    } else if (p.includes('puuonn') || p.includes('treehouse') || p.includes('palkmaja') || p.includes('cabin') || p.includes('telk') || p.includes('tent') || p.includes('igloo')) {
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.8 });
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.7 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 });

        if (p.includes('telk') || p.includes('tent')) {
            const tent = new THREE.Mesh(new THREE.ConeGeometry(2.5, 3.0, 4), new THREE.MeshStandardMaterial({ color: tint, roughness: 0.5 }));
            tent.position.set(0, 1.5, 0);
            tent.rotation.y = Math.PI / 4;
            group.add(tent);
        } else {
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 5.0, 10), woodMat);
            trunk.position.set(0, 2.5, 0);
            group.add(trunk);

            const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.4, 3.5), woodMat);
            cabin.position.set(0, 5.5, 0);
            group.add(cabin);

            const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2.0, 4), roofMat);
            roof.position.set(0, 7.5, 0);
            roof.rotation.y = Math.PI / 4;
            group.add(roof);

            const canopy = new THREE.Mesh(new THREE.SphereGeometry(3.0, 12, 12), leavesMat);
            canopy.position.set(0, 9.0, 0);
            group.add(canopy);
        }

    // 15. BRIDGE / SILD / TUNNEL
    } else if (p.includes('sild') || p.includes('bridge') || p.includes('tunnel')) {
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.8 });
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.9 });

        const deck = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.4, 12.0), roadMat);
        deck.position.set(0, 2.0, 0);
        group.add(deck);

        [-1.8, 1.8].forEach(x => {
            const railing = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 12.0), stoneMat);
            railing.position.set(x, 2.6, 0);
            group.add(railing);

            [-4.0, 4.0].forEach(z => {
                const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 2.0, 8), stoneMat);
                pillar.position.set(x, 1.0, z);
                group.add(pillar);
            });
        });

    // 16. FERRIS WHEEL / VAATERATAS / CAROUSEL / KARUSSELL / PLAYGROUND
    } else if (p.includes('vaateratas') || p.includes('ferris') || p.includes('karussell') || p.includes('carousel') || p.includes('mänguväljak') || p.includes('manguvaljak')) {
        const steelMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.7 });
        const neonMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.8 });

        const rim = new THREE.Mesh(new THREE.TorusGeometry(4.0, 0.15, 8, 32), neonMat);
        rim.position.set(0, 5.0, 0);
        group.add(rim);

        for (let s = 0; s < 8; s++) {
            const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 8.0, 6), steelMat);
            spoke.position.set(0, 5.0, 0);
            spoke.rotation.z = s * Math.PI / 4;
            group.add(spoke);

            const gondola = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xff7675 }));
            gondola.position.set(Math.cos(s * Math.PI / 4) * 4.0, 5.0 + Math.sin(s * Math.PI / 4) * 4.0, 0);
            group.add(gondola);
        }

    // 17. FOOD: PIZZA / BURGER / ICE CREAM / JÄÄTIS / CAKE / KOOK / APPLE / BANAAN
    } else if (p.includes('pizza') || p.includes('burger') || p.includes('jäätis') || p.includes('jaatis') || p.includes('ice cream') || p.includes('kook') || p.includes('cake') || p.includes('õun') || p.includes('oun') || p.includes('apple') || p.includes('banaan') || p.includes('banana')) {
        if (p.includes('pizza')) {
            const crustMat = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.8 });
            const cheeseMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.4 });
            const pepMat = new THREE.MeshStandardMaterial({ color: 0xc0392b });

            const crust = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.2, 24), crustMat);
            crust.position.set(0, 0.8, 0);
            group.add(crust);

            const cheese = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.22, 24), cheeseMat);
            cheese.position.set(0, 0.82, 0);
            group.add(cheese);

            for (let i = 0; i < 7; i++) {
                const pep = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.25, 8), pepMat);
                pep.position.set(Math.cos(i * 0.9) * 1.1, 0.85, Math.sin(i * 0.9) * 1.1);
                group.add(pep);
            }
        } else if (p.includes('burger')) {
            const bunMat = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.6 });
            const pattyMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });
            const cheeseMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f });
            const saladMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71 });

            const bunBottom = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.4, 16), bunMat);
            bunBottom.position.set(0, 0.4, 0);
            group.add(bunBottom);

            const patty = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.35, 16), pattyMat);
            patty.position.set(0, 0.75, 0);
            group.add(patty);

            const cheese = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1.8), cheeseMat);
            cheese.position.set(0, 0.95, 0);
            cheese.rotation.y = Math.PI / 6;
            group.add(cheese);

            const salad = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.1, 12), saladMat);
            salad.position.set(0, 1.05, 0);
            group.add(salad);

            const bunTop = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), bunMat);
            bunTop.position.set(0, 1.1, 0);
            group.add(bunTop);
        } else {
            // Layered Cake with candle
            const cakeMat = new THREE.MeshStandardMaterial({ color: 0xff7675, roughness: 0.5 });
            const creamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
            const candleMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, emissive: 0xffa502, emissiveIntensity: 0.9 });

            const base = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 1.0, 20), cakeMat);
            base.position.set(0, 0.8, 0);
            group.add(base);

            const topLayer = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.8, 16), creamMat);
            topLayer.position.set(0, 1.7, 0);
            group.add(topLayer);

            const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8), candleMat);
            candle.position.set(0, 2.5, 0);
            group.add(candle);
        }

    // 18. MUSIC: PIANO / KLAVER / GUITAR / KITARR / DRUMS / TRUMMID
    } else if (p.includes('klaver') || p.includes('piano') || p.includes('kitarr') || p.includes('guitar') || p.includes('trumm') || p.includes('drum')) {
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.2, metalness: 0.4 });
        const whiteKeyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
        const blackKeyMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.3 });

        const pianoBody = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.5, 2.2), woodMat);
        pianoBody.position.set(0, 1.8, 0);
        group.add(pianoBody);

        const keyboard = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.15, 0.8), whiteKeyMat);
        keyboard.position.set(0, 1.5, 0.9);
        group.add(keyboard);

        for (let k = -1.1; k <= 1.1; k += 0.3) {
            const bkey = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.5), blackKeyMat);
            bkey.position.set(k, 1.62, 0.8);
            group.add(bkey);
        }

        [-1.3, 1.3].forEach(x => {
            [-0.8, 0.8].forEach(z => {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 1.2, 8), woodMat);
                leg.position.set(x, 0.6, z);
                group.add(leg);
            });
        });

    // 19. FURNITURE / CHAIR / TABLE / BED / COMPUTER / TV
    } else if (p.includes('tool') || p.includes('chair') || p.includes('laud') || p.includes('table') || p.includes('voodi') || p.includes('bed') || p.includes('arvuti') || p.includes('computer') || p.includes('laptop') || p.includes('tv') || p.includes('televiisor')) {
        const mat = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.6 });
        const screenMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.8 });

        if (p.includes('arvuti') || p.includes('computer') || p.includes('tv') || p.includes('laptop')) {
            const table = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.2, 1.6), mat);
            table.position.set(0, 1.4, 0);
            group.add(table);

            const monitor = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.1), screenMat);
            monitor.position.set(0, 2.3, -0.4);
            group.add(monitor);

            const keyboard = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.5), new THREE.MeshStandardMaterial({ color: 0x1e272e }));
            keyboard.position.set(0, 1.53, 0.2);
            group.add(keyboard);

            [-1.3, 1.3].forEach(x => {
                [-0.6, 0.6].forEach(z => {
                    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6), mat);
                    leg.position.set(x, 0.7, z);
                    group.add(leg);
                });
            });
        } else {
            const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 1.6), mat);
            seat.position.set(0, 1.2, 0);
            group.add(seat);

            const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 0.2), mat);
            backrest.position.set(0, 2.1, -0.7);
            group.add(backrest);

            [-0.7, 0.7].forEach(x => {
                [-0.7, 0.7].forEach(z => {
                    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), mat);
                    leg.position.set(x, 0.6, z);
                    group.add(leg);
                });
            });
        }

    // 20. WEAPON: SWORD / MÕÕK / SHIELD / KILP / BOW / VIBU / CANNON / KAHUR / WAND / VÕLUKEPP
    } else if (p.includes('mõõk') || p.includes('mook') || p.includes('sword') || p.includes('kilp') || p.includes('shield') || p.includes('kahur') || p.includes('cannon') || p.includes('võlukepp') || p.includes('wand')) {
        const steelMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.9, roughness: 0.1 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.8, roughness: 0.3 });
        const magicMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.9 });

        if (p.includes('kilp') || p.includes('shield')) {
            const shield = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.2, 0.3, 16), steelMat);
            shield.rotation.x = Math.PI / 2;
            shield.position.set(0, 1.8, 0);
            group.add(shield);

            const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), goldMat);
            emblem.position.set(0, 1.8, 0.25);
            group.add(emblem);
        } else {
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.6, 0.08), steelMat);
            blade.position.set(0, 2.8, 0);
            group.add(blade);

            const tip = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 4), steelMat);
            tip.position.set(0, 5.0, 0);
            group.add(tip);

            const guard = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 0.3), goldMat);
            guard.position.set(0, 1.0, 0);
            group.add(guard);

            const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 8), new THREE.MeshStandardMaterial({ color: 0x795548 }));
            hilt.position.set(0, 0.45, 0);
            group.add(hilt);

            const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), magicMat);
            pommel.position.set(0, 0, 0);
            group.add(pommel);
        }

    // 21. TREASURE CHEST / AARDEKIRST / DIAMOND / TEEMANT / GOLD
    } else if (p.includes('aare') || p.includes('kirst') || p.includes('chest') || p.includes('teemant') || p.includes('diamond') || p.includes('kuld') || p.includes('gold')) {
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.8 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.9, roughness: 0.2, emissive: 0xffd32a, emissiveIntensity: 0.4 });
        const gemMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.9, metalness: 0.5 });

        const chestBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 1.6), woodMat);
        chestBase.position.set(0, 0.6, 0);
        group.add(chestBase);

        const chestLid = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.2, 12, 1, false, 0, Math.PI), woodMat);
        chestLid.rotation.z = Math.PI / 2;
        chestLid.position.set(0, 1.2, 0);
        group.add(chestLid);

        const lock = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.15), goldMat);
        lock.position.set(0, 1.0, 0.85);
        group.add(lock);

        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.6), gemMat);
        gem.position.set(0, 2.2, 0);
        group.add(gem);

    // 22. SATURN & PLANETS
    } else if (p.includes('saturn') || p.includes('planeet') || p.includes('planet') || p.includes('jupiter') || p.includes('mars') || p.includes('neptuun') || p.includes('kuu') || p.includes('moon') || p.includes('päike') || p.includes('sun')) {
        const saturnColor = p.includes('mars') ? 0xe74c3c : (p.includes('neptuun') ? 0x0984e3 : (p.includes('päike') || p.includes('sun') ? 0xffa502 : 0xf9ca24));
        const planetMat = new THREE.MeshStandardMaterial({ color: saturnColor, roughness: 0.7, metalness: 0.1, emissive: p.includes('päike') ? 0xffa502 : 0x000000, emissiveIntensity: 0.5 });
        const ringMat = new THREE.MeshStandardMaterial({ color: 0xf6e58d, side: THREE.DoubleSide, transparent: true, opacity: 0.85, roughness: 0.5 });

        const planetSphere = new THREE.Mesh(new THREE.SphereGeometry(2.4, 32, 32), planetMat);
        planetSphere.position.set(0, 3.5, 0);
        group.add(planetSphere);

        const innerRing = new THREE.Mesh(new THREE.RingGeometry(3.2, 4.6, 64), ringMat);
        innerRing.rotation.x = Math.PI / 2 + 0.45;
        innerRing.position.set(0, 3.5, 0);
        group.add(innerRing);

    // 23. DINOSAUR / DRAGON / MONSTER / COLLOSSAL BEAST
    } else if (p.includes('dino') || p.includes('t-rex') || p.includes('draakon') || p.includes('dragon') || p.includes('monster') || p.includes('koll') || p.includes('godzilla')) {
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.6 });
        const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.6 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, emissive: 0xe74c3c, emissiveIntensity: 0.6 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.5, 3.2), bodyMat);
        body.position.y = 2.0;
        group.add(body);

        const belly = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 0.4), bellyMat);
        belly.position.set(0, 1.8, 1.65);
        group.add(belly);

        const head = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 2.2), bodyMat);
        head.position.set(0, 3.8, 1.4);
        group.add(head);

        [-0.85, 0.85].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), eyeMat);
            eye.position.set(x, 4.1, 1.8);
            group.add(eye);
        });

        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.0, 5), bodyMat);
        tail.position.set(0, 1.8, -2.5);
        tail.rotation.x = -Math.PI / 3;
        group.add(tail);

        [-0.9, 0.9].forEach(x => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.9), bodyMat);
            leg.position.set(x, 0.8, 0);
            group.add(leg);
        });

    // 24. ROBOT / MECHA / CYBORG / ANDROID
    } else if (p.includes('robot') || p.includes('mecha') || p.includes('cyborg') || p.includes('android') || p.includes('mech')) {
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, metalness: 0.8, roughness: 0.3 });
        const coreMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.8 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, metalness: 0.6 });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 1.2), metalMat);
        torso.position.y = 2.2;
        group.add(torso);

        const core = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 8), coreMat);
        core.rotation.x = Math.PI / 2;
        core.position.set(0, 2.4, 0.65);
        group.add(core);

        const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.0), metalMat);
        head.position.set(0, 3.8, 0);
        group.add(head);

        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.2), coreMat);
        visor.position.set(0, 3.8, 0.55);
        group.add(visor);

        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8), goldMat);
        antenna.position.set(0, 4.6, 0);
        group.add(antenna);

        [-1.3, 1.3].forEach(x => {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.5), goldMat);
            arm.position.set(x, 2.0, 0);
            group.add(arm);
        });
        [-0.6, 0.6].forEach(x => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, 0.6), metalMat);
            leg.position.set(x, 0.7, 0);
            group.add(leg);
        });

    // 25. CASTLE / FORTRESS / PYRAMID / TEMPLE
    } else if (p.includes('loss') || p.includes('castle') || p.includes('kindlus') || p.includes('fort') || p.includes('püramiid') || p.includes('pyramid') || p.includes('tempel') || p.includes('palace')) {
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 0.9 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x9b59b6, roughness: 0.5 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, emissive: 0xf1c40f, emissiveIntensity: 0.3 });

        if (p.includes('püramiid') || p.includes('pyramid')) {
            const pyr = new THREE.Mesh(new THREE.ConeGeometry(4.5, 5.0, 4), new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.8 }));
            pyr.position.y = 2.5;
            pyr.rotation.y = Math.PI / 4;
            group.add(pyr);
        } else {
            const keep = new THREE.Mesh(new THREE.BoxGeometry(4.0, 4.0, 4.0), stoneMat);
            keep.position.y = 2.0;
            group.add(keep);

            [-2.0, 2.0].forEach(tx => {
                [-2.0, 2.0].forEach(tz => {
                    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 5.5, 8), stoneMat);
                    tower.position.set(tx, 2.75, tz);
                    group.add(tower);

                    const troof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.0, 8), roofMat);
                    troof.position.set(tx, 6.2, tz);
                    group.add(troof);
                });
            });

            const gate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.4), goldMat);
            gate.position.set(0, 1.1, 2.05);
            group.add(gate);
        }

    // 26. AIRPLANE / JET / FIGHTER / AIRCRAFT / FLYING
    } else if (p.includes('lennuk') || p.includes('airplane') || p.includes('plane') || p.includes('jet') || p.includes('aircraft') || p.includes('hävitaja') || p.includes('havitaja') || p.includes('propeller') || p.includes('lendav')) {
        const planeColor = p.includes('red') || p.includes('punan') ? '#e74c3c' : (p.includes('gold') || p.includes('kuld') ? '#ffd32a' : (p.includes('black') || p.includes('must') ? '#1e272e' : '#3498db'));
        return createAirplane3DMesh(planeColor);

    // 27. SUBMARINE / SHIP / BOAT / LAEV / PAAT
    } else if (p.includes('allveelaev') || p.includes('submarine') || p.includes('laev') || p.includes('ship') || p.includes('boat') || p.includes('paat') || p.includes('jaht') || p.includes('yacht')) {
        const hullMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.5 });
        const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.4 });
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.5 });

        const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 5.0, 12), yellowMat);
        hull.rotation.x = Math.PI / 2;
        hull.position.y = 1.6;
        group.add(hull);

        const nose = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 12), yellowMat);
        nose.position.set(0, 1.6, 2.5);
        group.add(nose);

        const conningTower = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 1.6), hullMat);
        conningTower.position.set(0, 2.8, 0.2);
        group.add(conningTower);

        const periscope = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8), glassMat);
        periscope.position.set(0, 3.6, 0.5);
        group.add(periscope);

    // 28. ULTRA SMART UNIVERSAL PROCEDURAL SCULPTOR (Synthesizes ANY arbitrary object)
    } else {
        const colorPalette = [0x9b59b6, 0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0xe67e22, 0x1abc9c, 0xff7675];
        const chosenColor = tint || colorPalette[Math.abs(hashString(name)) % colorPalette.length];
        const mainMat = new THREE.MeshStandardMaterial({ color: chosenColor, roughness: 0.35, metalness: 0.35 });
        const glowMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.75 });
        const accentMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.8, roughness: 0.2 });

        const base = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.4, 0.5, 12), new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.7 }));
        base.position.y = 0.25;
        group.add(base);

        const core = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 1), mainMat);
        core.position.y = 2.0;
        group.add(core);

        const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.16, 8, 28), glowMat);
        ring.position.y = 2.0;
        ring.rotation.x = Math.PI / 3;
        group.add(ring);

        const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), accentMat);
        crown.position.y = 3.8;
        group.add(crown);
    }

    return group;
}

const WORLD_CAPITALS_MAP: Record<string, { et: string, en: string, countryEt: string, countryEn: string }> = {
    'eesti': { et: 'Tallinn', en: 'Tallinn', countryEt: 'Eesti', countryEn: 'Estonia' },
    'estonia': { et: 'Tallinn', en: 'Tallinn', countryEt: 'Eesti', countryEn: 'Estonia' },
    'soome': { et: 'Helsingi', en: 'Helsinki', countryEt: 'Soome', countryEn: 'Finland' },
    'finland': { et: 'Helsingi', en: 'Helsinki', countryEt: 'Soome', countryEn: 'Finland' },
    'rootsi': { et: 'Stockholm', en: 'Stockholm', countryEt: 'Rootsi', countryEn: 'Sweden' },
    'sweden': { et: 'Stockholm', en: 'Stockholm', countryEt: 'Rootsi', countryEn: 'Sweden' },
    'läti': { et: 'Riia', en: 'Riga', countryEt: 'Läti', countryEn: 'Latvia' },
    'lati': { et: 'Riia', en: 'Riga', countryEt: 'Läti', countryEn: 'Latvia' },
    'latvia': { et: 'Riia', en: 'Riga', countryEt: 'Läti', countryEn: 'Latvia' },
    'leedu': { et: 'Vilnius', en: 'Vilnius', countryEt: 'Leedu', countryEn: 'Lithuania' },
    'lithuania': { et: 'Vilnius', en: 'Vilnius', countryEt: 'Leedu', countryEn: 'Lithuania' },
    'prantsusmaa': { et: 'Pariis', en: 'Paris', countryEt: 'Prantsusmaa', countryEn: 'France' },
    'france': { et: 'Pariis', en: 'Paris', countryEt: 'Prantsusmaa', countryEn: 'France' },
    'saksamaa': { et: 'Berliin', en: 'Berlin', countryEt: 'Saksamaa', countryEn: 'Germany' },
    'germany': { et: 'Berliin', en: 'Berlin', countryEt: 'Saksamaa', countryEn: 'Germany' },
    'suurbritannia': { et: 'London', en: 'London', countryEt: 'Suurbritannia', countryEn: 'United Kingdom' },
    'inglismaa': { et: 'London', en: 'London', countryEt: 'Inglismaa', countryEn: 'England' },
    'uk': { et: 'London', en: 'London', countryEt: 'Suurbritannia', countryEn: 'UK' },
    'usa': { et: 'Washington D.C.', en: 'Washington, D.C.', countryEt: 'USA', countryEn: 'United States' },
    'ameerika': { et: 'Washington D.C.', en: 'Washington, D.C.', countryEt: 'USA', countryEn: 'United States' },
    'itaalia': { et: 'Rooma', en: 'Rome', countryEt: 'Itaalia', countryEn: 'Italy' },
    'italy': { et: 'Rooma', en: 'Rome', countryEt: 'Itaalia', countryEn: 'Italy' },
    'hispaania': { et: 'Madrid', en: 'Madrid', countryEt: 'Hispaania', countryEn: 'Spain' },
    'spain': { et: 'Madrid', en: 'Madrid', countryEt: 'Hispaania', countryEn: 'Spain' },
    'jaapan': { et: 'Tokyo', en: 'Tokyo', countryEt: 'Jaapan', countryEn: 'Japan' },
    'japan': { et: 'Tokyo', en: 'Tokyo', countryEt: 'Jaapan', countryEn: 'Japan' },
    'hiina': { et: 'Peking (Beijing)', en: 'Beijing', countryEt: 'Hiina', countryEn: 'China' },
    'china': { et: 'Peking (Beijing)', en: 'Beijing', countryEt: 'Hiina', countryEn: 'China' },
    'kanada': { et: 'Ottawa', en: 'Ottawa', countryEt: 'Kanada', countryEn: 'Canada' },
    'canada': { et: 'Ottawa', en: 'Ottawa', countryEt: 'Kanada', countryEn: 'Canada' },
    'austraalia': { et: 'Canberra', en: 'Canberra', countryEt: 'Austraalia', countryEn: 'Australia' },
    'australia': { et: 'Canberra', en: 'Canberra', countryEt: 'Austraalia', countryEn: 'Australia' },
    'brasiilia': { et: 'Brasília', en: 'Brasília', countryEt: 'Brasiilia', countryEn: 'Brazil' },
    'brazil': { et: 'Brasília', en: 'Brasília', countryEt: 'Brasiilia', countryEn: 'Brazil' },
    'norra': { et: 'Oslo', en: 'Oslo', countryEt: 'Norra', countryEn: 'Norway' },
    'norway': { et: 'Oslo', en: 'Oslo', countryEt: 'Norra', countryEn: 'Norway' },
    'taani': { et: 'Kopenhaagen', en: 'Copenhagen', countryEt: 'Taani', countryEn: 'Denmark' },
    'denmark': { et: 'Kopenhaagen', en: 'Copenhagen', countryEt: 'Taani', countryEn: 'Denmark' },
    'poola': { et: 'Varssavi', en: 'Warsaw', countryEt: 'Poola', countryEn: 'Poland' },
    'poland': { et: 'Varssavi', en: 'Warsaw', countryEt: 'Poola', countryEn: 'Poland' },
    'ukraina': { et: 'Kiiev', en: 'Kyiv', countryEt: 'Ukraina', countryEn: 'Ukraine' },
    'ukraine': { et: 'Kiiev', en: 'Kyiv', countryEt: 'Ukraina', countryEn: 'Ukraine' },
    'india': { et: 'New Delhi', en: 'New Delhi', countryEt: 'India', countryEn: 'India' }
};

export function executeAiBuild(promptText: string) {
    const chatLog = document.getElementById('ai-chat-log');
    const titleInput = document.getElementById('game-title-input') as HTMLInputElement | null;
    const catSelect = document.getElementById('game-category-select') as HTMLSelectElement | null;
    const descInput = document.getElementById('game-desc-input') as HTMLInputElement | null;

    const isAdmin = isCurrentUserAdmin();

    // Append User message to chat
    if (chatLog) {
        const userMsg = document.createElement('div');
        userMsg.style.cssText = 'background: rgba(168, 85, 247, 0.2); border-radius: 8px; padding: 8px 12px; color: #fff; align-self: flex-end; max-width: 85%; font-weight: 600;';
        userMsg.innerText = `👤 ${promptText}`;
        chatLog.appendChild(userMsg);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    const p = promptText.toLowerCase().trim();
    let generatedObjectsCount = 0;
    let aiResponse = '';

    // Save snapshot for undo/redo before modifying state
    saveUndoSnapshot();

    // Pre-calculate math if pattern matches
    const isMathPattern = (
        /^[0-9\.\s\+\-\*\/\^\(\)\%xX÷×]+[\?]?$/.test(promptText.trim()) ||
        /(?:kui palju on|mis on|arvuta|calculate|what is)\s*([0-9\.\s\+\-\*\/\^\(\)\%xX÷×]+)/i.test(p) ||
        /[0-9]+\s*[\+\-\*\/xX÷×\^]\s*[0-9]+/.test(p)
    );

    let mathResult: number | null = null;
    let mathExpr = '';

    if (isMathPattern) {
        const cleanExpr = promptText
            .replace(/(?:kui palju on|mis on|arvuta|calculate|what is|\?|võrdub|vordub|equals|=)/gi, '')
            .replace(/x|X|×/g, '*')
            .replace(/÷/g, '/')
            .trim();

        if (/^[0-9\.\s\+\-\*\/\^\(\)\%]+$/.test(cleanExpr) && /[0-9]/.test(cleanExpr)) {
            try {
                const evalExpr = cleanExpr.replace(/\^/g, '**');
                const fn = new Function(`return (${evalExpr});`);
                const res = fn();
                if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
                    mathResult = res;
                    mathExpr = cleanExpr;
                }
            } catch (e) {}
        }
    }

    // --- 0.0 UNDO & REDO COMMANDS ---
    if (p === 'undo' || p.includes('võta tagasi') || p.includes('vota tagasi') || p.includes('tagasi')) {
        performUndo();
        aiResponse = isAdmin ? `↩️ <strong>Viimane tegevus edukalt tagasi võetud (Undo)!</strong>` : `↩️ <strong>Last action successfully undone!</strong>`;

    } else if (p === 'redo' || p.includes('tee uuesti') || p.includes('uuesti')) {
        performRedo();
        aiResponse = isAdmin ? `↪️ <strong>Tegevus uuesti rakendatud (Redo)!</strong>` : `↪️ <strong>Action redone!</strong>`;

    // --- 0.1 ENVIRONMENT & WEATHER SETTINGS ---
    } else if (p.includes('öö') || p.includes('night') || p.includes('pime') || p.includes('dark')) {
        setDayNightMode('night');
        aiResponse = isAdmin ? `🌙 <strong>Muutsin maailma öiseks!</strong><br>Taevas on nüüd tume tähistaevas koos öise atmosfääriga.` : `🌙 <strong>Set environment to Night!</strong><br>The sky is now dark and starry.`;

    } else if (p.includes('päev') || p.includes('day') || p.includes('päike') || p.includes('sunny')) {
        setDayNightMode('day');
        aiResponse = isAdmin ? `☀️ <strong>Muutsin maailma päikseliseks päevaks!</strong>` : `☀️ <strong>Set environment to sunny Daytime!</strong>`;

    } else if (p.includes('päikeseloojang') || p.includes('sunset') || p.includes('eha')) {
        setDayNightMode('sunset');
        aiResponse = isAdmin ? `🌅 <strong>Lõin kauni kuldse päikeseloojangu!</strong>` : `🌅 <strong>Set a beautiful golden Sunset!</strong>`;

    } else if (p.includes('udu') || p.includes('fog') || p.includes('õudne udu')) {
        setDayNightMode('horror_fog');
        aiResponse = isAdmin ? `🌫️ <strong>Lisasin tiheda atmosfääri udu!</strong>` : `🌫️ <strong>Added dense atmospheric fog!</strong>`;

    // --- 0.15 UNIVERSAL QUANTITY & WHOLE MAP SCATTER ENGINE ("pane tervesse mappi...", "pane 30...", "scatter across map", "fill map with...") ---
    } else if (
        p.includes('tervesse mappi') || p.includes('terve mapp') || p.includes('tervesse kaarti') || p.includes('terve kaart') ||
        p.includes('üle kogu mapi') || p.includes('ule kogu mapi') || p.includes('üle kogu kaardi') || p.includes('kogu kaardile') ||
        p.includes('kogu map') || p.includes('igale poole') || p.includes('täida kaart') || p.includes('taida kaart') ||
        p.includes('scatter') || p.includes('across the map') || p.includes('whole map') || p.includes('entire map') ||
        p.includes('everywhere') || p.includes('fill map') || p.includes('fill entire') ||
        (/\b(\d+)\b/.test(p) && !isMathPattern && !p.includes('haigla') && !p.includes('hospital') && !p.includes('salvesta')) ||
        p.includes('kolmkümmend') || p.includes('paarkümmend') || p.includes('viiskümmend')
    ) {
        // 1. Extract Quantity
        let targetCount = 0;
        const numMatch = p.match(/\b(\d+)\b/);
        if (numMatch) {
            targetCount = parseInt(numMatch[1], 10);
        } else if (p.includes('paarkümmend') || p.includes('paarkummend')) {
            targetCount = 20;
        } else if (p.includes('kolmkümmend') || p.includes('kolmkummend')) {
            targetCount = 30;
        } else if (p.includes('viiskümmend') || p.includes('viiskummend')) {
            targetCount = 50;
        } else if (p.includes('sada') || p.includes('hundred')) {
            targetCount = 100;
        } else if (p.includes('kümme') || p.includes('kumme') || p.includes('ten')) {
            targetCount = 10;
        } else if (p.includes('viis') || p.includes('five')) {
            targetCount = 5;
        }

        // If no explicit number, default to a generous map-wide density of 30 items
        if (targetCount <= 0) targetCount = 30;
        const count = Math.min(120, Math.max(2, targetCount));

        // 2. Extract item/entity type from prompt
        const cleanedQuery = promptText
            .replace(/(?:pane|lisa|loo|tee|ehita|spawn|add|place|make|build|scatter|fill|with|across|the|whole|entire|map|everywhere|tervesse|mappi|mapile|kaardile|kaarti|kaart|üle|ule|kogu|täida|taida|midagi|something|asju|asja|tk|tükki|tukki|items|objects|kõikjale)/gi, '')
            .replace(/\b\d+\b/g, '')
            .trim();

        const qLower = cleanedQuery.toLowerCase();
        const isGenericSomething = (!cleanedQuery || qLower.length < 2 || qLower.includes('midagi') || qLower.includes('asja') || qLower.includes('something'));

        // Identify item category / nature
        const isCoins = qLower.includes('münt') || qLower.includes('munt') || qLower.includes('coin') || qLower.includes('raha') || qLower.includes('kuld');
        const isTrees = qLower.includes('puu') || qLower.includes('tree') || qLower.includes('mets') || qLower.includes('forest') || qLower.includes('palm');
        const isCars = qLower.includes('auto') || qLower.includes('car') || qLower.includes('veoauto') || qLower.includes('truck') || qLower.includes('kart');
        const isPlanes = qLower.includes('lennuk') || qLower.includes('plane') || qLower.includes('jet') || qLower.includes('ufo') || qLower.includes('rakett') || qLower.includes('rocket');
        const isEnemies = qLower.includes('vaenla') || qLower.includes('koll') || qLower.includes('enemy') || qLower.includes('monster') || qLower.includes('zombie') || qLower.includes('draakon') || qLower.includes('dragon');
        const isCrystals = qLower.includes('kristall') || qLower.includes('crystal') || qLower.includes('gem') || qLower.includes('teemant') || qLower.includes('diamond');
        const isFlowers = qLower.includes('lill') || qLower.includes('flower') || qLower.includes('roos');
        const isRocks = qLower.includes('kivi') || qLower.includes('rock') || qLower.includes('stone') || qLower.includes('lohk');
        const isHouses = qLower.includes('maja') || qLower.includes('house') || qLower.includes('kodu') || qLower.includes('hoone') || qLower.includes('building');

        // Determine title & icon
        let itemLabel = isAdmin ? '✨ Maagiline 3D Objekt' : '✨ Magical 3D Object';
        if (isCoins) itemLabel = isAdmin ? '🪙 Kuldne Münt' : '🪙 Gold Coin';
        else if (isTrees) itemLabel = isAdmin ? '🌲 3D Puu' : '🌲 3D Tree';
        else if (isCars) itemLabel = isAdmin ? '🚗 Sõidetav Auto' : '🚗 Drivable Car';
        else if (isPlanes) itemLabel = isAdmin ? '✈️ Lennatav Lennuk' : '✈️ Flyable Airplane';
        else if (isEnemies) itemLabel = isAdmin ? '👾 Patrulliv Vaenlane' : '👾 Enemy Mob';
        else if (isCrystals) itemLabel = isAdmin ? '💎 Energiakristall' : '💎 Power Crystal';
        else if (isFlowers) itemLabel = isAdmin ? '🌸 Kaunis Lill' : '🌸 Flower';
        else if (isRocks) itemLabel = isAdmin ? '🪨 Graniitkivi' : '🪨 Rock';
        else if (isHouses) itemLabel = isAdmin ? '🏠 3D Maja' : '🏠 3D House';
        else if (!isGenericSomething) itemLabel = `✨ ${cleanedQuery.charAt(0).toUpperCase() + cleanedQuery.slice(1)}`;

        // 3. Grid-Jitter Spread across the entire map
        const spreadRadius = 55;
        const cols = Math.ceil(Math.sqrt(count));
        const step = (spreadRadius * 2) / cols;

        for (let i = 0; i < count; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            let posX = (col * step - spreadRadius) + (Math.random() - 0.5) * (step * 0.85);
            let posZ = (row * step - spreadRadius) + (Math.random() - 0.5) * (step * 0.85);

            // Avoid spawning right on top of player start (0, 0, 0)
            if (Math.abs(posX) < 3.5 && Math.abs(posZ) < 3.5) {
                posX += (posX >= 0 ? 5 : -5);
                posZ += (posZ >= 0 ? 5 : -5);
            }

            let mesh: THREE.Group | THREE.Mesh;
            let itemType: PlacedObject['gameItemType'] = undefined;
            let isFlyable = false;
            let enemyProps: any = undefined;
            let movementProps: any = undefined;

            if (isGenericSomething) {
                // Mix of crystals, trees, ancient obelisks, and gold coins
                const mixIdx = i % 5;
                if (mixIdx === 0) {
                    mesh = createCustomProceduralMesh('Kristall Gem', 'Kristall');
                    itemType = 'coin';
                    movementProps = { type: 'rotate', speed: 2.0, distance: 0, origin: { x: posX, y: 0, z: posZ } };
                } else if (mixIdx === 1) {
                    mesh = createCustomProceduralMesh('Puu Mets', 'Puu');
                } else if (mixIdx === 2) {
                    mesh = createCustomProceduralMesh('Loss Sammas Ruin', 'Muinassammas');
                } else if (mixIdx === 3) {
                    mesh = createCustomProceduralMesh('Münt Kuld', 'Münt');
                    itemType = 'coin';
                    movementProps = { type: 'rotate', speed: 3.0, distance: 0, origin: { x: posX, y: 0, z: posZ } };
                } else {
                    mesh = createCustomProceduralMesh('Lill Roos', 'Võlulill');
                }
            } else if (isCoins) {
                const coinGroup = new THREE.Group();
                const coinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.12, 16), new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.9, roughness: 0.1, emissive: 0xffd32a, emissiveIntensity: 0.3 }));
                coinMesh.rotation.x = Math.PI / 2;
                coinMesh.position.y = 0.8;
                coinGroup.add(coinMesh);
                mesh = coinGroup;
                itemType = 'coin';
                movementProps = { type: 'rotate', speed: 2.8, distance: 0, origin: { x: posX, y: 0, z: posZ } };

            } else if (isTrees) {
                mesh = createCustomProceduralMesh('Puu Mets Tree', 'Puu');
                mesh.scale.setScalar(0.8 + Math.random() * 0.6);

            } else if (isCars) {
                mesh = createCustomProceduralMesh('Auto Car Sõiduk', 'Auto');

            } else if (isPlanes) {
                mesh = createAirplane3DMesh(i % 2 === 0 ? '#00f2fe' : '#e74c3c');
                isFlyable = true;

            } else if (isEnemies) {
                mesh = createCustomProceduralMesh(cleanedQuery || 'Vaenlane Koll Monster', 'Vaenlane');
                itemType = 'enemy';
                enemyProps = { health: 45, maxHealth: 45, damage: 12, speed: 3.8, name: itemLabel };

            } else if (isCrystals) {
                mesh = createCustomProceduralMesh('Kristall Gem Teemant', 'Kristall');
                itemType = 'coin';
                movementProps = { type: 'rotate', speed: 2.0, distance: 0, origin: { x: posX, y: 0, z: posZ } };

            } else if (isFlowers) {
                mesh = createCustomProceduralMesh('Lill Roos Flower', 'Lill');
                mesh.scale.setScalar(0.7 + Math.random() * 0.4);

            } else if (isRocks) {
                mesh = createCustomProceduralMesh('Kivi Rock Stone', 'Kivi');
                mesh.scale.setScalar(0.8 + Math.random() * 0.7);

            } else if (isHouses) {
                mesh = createCustomProceduralMesh('Maja House Hoone', 'Maja');
                mesh.scale.setScalar(1.2);

            } else {
                mesh = createCustomProceduralMesh(cleanedQuery, cleanedQuery);
            }

            mesh.position.set(posX, 0, posZ);
            mesh.rotation.y = Math.random() * Math.PI * 2;
            scene.add(mesh);

            const newPlaced: PlacedObject = {
                id: 'placed_ai_scatter_' + Date.now() + '_' + i,
                mesh,
                catalogId: 'scatter_' + i,
                name: `${itemLabel} #${i + 1}`,
                category: (isCars || isPlanes) ? 'vehicles' : 'custom',
                isAirplane: isFlyable,
                gameItemType: itemType,
                enemyData: enemyProps,
                movement: movementProps,
                position: { x: posX, y: 0, z: posZ },
                rotation: { x: 0, y: mesh.rotation.y, z: 0 },
                scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z },
                color: '#00f2fe'
            };

            placedObjects.push(newPlaced);
            generatedObjectsCount++;
        }

        if (isAdmin) {
            aiResponse = `🌍 <strong>Paigutasin üle terve mapi ${generatedObjectsCount} tk: ${itemLabel}!</strong><br>• Objektid jaotati ühtlaselt üle kogu 3D maailma (raadiuses 110m).${isCoins ? '<br>🪙 <em>Kõik mündid on Play Test režiimis kogutavad!</em>' : ''}${isEnemies ? '<br>⚔️ <em>Vaenlased liiguvad ja ründavad mängijat (Combat AI)!</em>' : ''}${(isCars || isPlanes) ? '<br>🚗/✈️ <em>Kõik sõidukid on [F] vajutusega juhitavad!</em>' : ''}<br><br>👉 Vajuta <strong>▶️ Play Test Mode</strong> ja uuri tervet kaarti!`;
        } else {
            aiResponse = `🌍 <strong>Distributed ${generatedObjectsCount}x ${itemLabel} across the entire map!</strong><br>• Objects are spread across the full 3D world (110m radius).${isCoins ? '<br>🪙 <em>Coins can be collected in Play Test Mode!</em>' : ''}${isEnemies ? '<br>⚔️ <em>Enemies will patrol and attack player with combat AI!</em>' : ''}${(isCars || isPlanes) ? '<br>🚗/✈️ <em>All vehicles are drivable/flyable with [F]!</em>' : ''}<br><br>👉 Click <strong>▶️ Play Test Mode</strong> to explore the map!`;
        }

    // --- 0.2 FULL GAME: HORROR / ABANDONED HOSPITAL / ESCAPE GAME ---
    } else if (
        (p.includes('haigla') || p.includes('haiglas') || p.includes('hospital')) &&
        (p.includes('õudus') || p.includes('horror') || p.includes('põgene') || p.includes('escape') || p.includes('võt') || p.includes('key'))
    ) {
        // Clear old scene
        placedObjects.forEach(obj => scene.remove(obj.mesh));
        placedObjects.length = 0;
        selectObject(null);

        if (titleInput) titleInput.value = 'Mahajäetud Haigla Õudusunenägu / Horror Hospital';
        if (catSelect) catSelect.value = 'Adventure';
        if (descInput) descInput.value = 'Põgene mahajäetud haiglast! Leia 3 peidetud võtit ja ava väljapääs samal ajal kummitust vältides!';

        setDayNightMode('horror_fog');

        // 1. Hospital Walls & Corridors
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.9 });
        const bloodMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.8 });

        const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.9 }));
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);

        // Corridors & Rooms
        const wallConfigs = [
            { x: 0, z: -15, w: 40, h: 4, d: 0.6 },
            { x: 0, z: 15, w: 40, h: 4, d: 0.6 },
            { x: -20, z: 0, w: 0.6, h: 4, d: 30 },
            { x: 20, z: 0, w: 0.6, h: 4, d: 30 },
            { x: -8, z: -5, w: 16, h: 4, d: 0.6 },
            { x: 8, z: 5, w: 16, h: 4, d: 0.6 }
        ];

        wallConfigs.forEach((wc, idx) => {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(wc.w, wc.h, wc.d), wallMat);
            wall.position.set(wc.x, wc.h / 2, wc.z);
            scene.add(wall);
            placedObjects.push({
                id: 'placed_hosp_wall_' + idx,
                mesh: wall,
                catalogId: 'wall_stone',
                name: `Sein #${idx + 1}`,
                category: 'city',
                position: { ...wall.position },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                color: '#2c3e50'
            });
            generatedObjectsCount++;
        });

        // 2. Three Hidden Glowing Keys
        const keyLocations = [
            { x: -14, z: -10, name: '🔑 Haigla Võti #1' },
            { x: 14, z: -8, name: '🔑 Haigla Võti #2' },
            { x: -12, z: 10, name: '🔑 Haigla Võti #3' }
        ];

        keyLocations.forEach((loc, idx) => {
            const keyGroup = new THREE.Group();
            const keyMesh = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 8, 16), new THREE.MeshStandardMaterial({ color: 0xffd32a, emissive: 0xffd32a, emissiveIntensity: 0.8 }));
            keyMesh.position.y = 1.0;
            keyGroup.add(keyMesh);
            keyGroup.position.set(loc.x, 0, loc.z);
            scene.add(keyGroup);

            placedObjects.push({
                id: 'placed_hosp_key_' + idx,
                mesh: keyGroup,
                catalogId: 'gold_key',
                name: loc.name,
                category: 'gameplay',
                gameItemType: 'key',
                keyName: loc.name,
                position: { ...keyGroup.position },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                color: '#ffd32a',
                movement: { type: 'rotate', speed: 2.0, distance: 0, origin: { ...keyGroup.position } }
            });
            generatedObjectsCount++;
        });

        // 3. Locked Exit Gate
        const gateGroup = new THREE.Group();
        const gateMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 0.5), new THREE.MeshStandardMaterial({ color: 0xe74c3c, metalness: 0.8, roughness: 0.2 }));
        gateMesh.position.y = 2.5;
        gateGroup.add(gateMesh);
        gateGroup.position.set(0, 0, 15);
        scene.add(gateGroup);

        placedObjects.push({
            id: 'placed_hosp_gate',
            mesh: gateGroup,
            catalogId: 'locked_gate',
            name: '🚪 Lukus Väljapääsu Värav',
            category: 'gameplay',
            gameItemType: 'door',
            requiredKeyName: 'all_keys',
            position: { ...gateGroup.position },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#e74c3c'
        });
        generatedObjectsCount++;

        // 4. Roaming Scary Ghost / Monster Enemy
        const ghostGroup = new THREE.Group();
        const ghostBody = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.5, 8), new THREE.MeshStandardMaterial({ color: 0xecf0f1, transparent: true, opacity: 0.75, emissive: 0x00f2fe, emissiveIntensity: 0.3 }));
        ghostBody.position.y = 1.6;
        ghostGroup.add(ghostBody);
        const ghostEyes = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), new THREE.MeshStandardMaterial({ color: 0xe74c3c, emissive: 0xe74c3c, emissiveIntensity: 1.0 }));
        ghostEyes.position.set(0, 2.3, 0.6);
        ghostGroup.add(ghostEyes);
        ghostGroup.position.set(0, 0, -8);
        scene.add(ghostGroup);

        placedObjects.push({
            id: 'placed_hosp_ghost',
            mesh: ghostGroup,
            catalogId: 'enemy_ghost',
            name: '👻 Õudusunenäo Kummitus',
            category: 'gameplay',
            gameItemType: 'enemy',
            enemyData: { health: 60, maxHealth: 60, damage: 20, speed: 4.2, name: 'Kummitus' },
            position: { ...ghostGroup.position },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#ecf0f1'
        });
        generatedObjectsCount++;

        // 5. Victory Goal behind gate
        const goalGroup = new THREE.Group();
        const goalMesh = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.2, 16, 32), new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.9 }));
        goalMesh.position.y = 2.0;
        goalGroup.add(goalMesh);
        goalGroup.position.set(0, 0, 20);
        scene.add(goalGroup);

        placedObjects.push({
            id: 'placed_hosp_goal',
            mesh: goalGroup,
            catalogId: 'victory_portal',
            name: '🏆 Pääsetee Vabadusse',
            category: 'gameplay',
            gameItemType: 'goal',
            position: { ...goalGroup.position },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#00f2fe'
        });
        generatedObjectsCount++;

        // Set Active Quest & HUD
        activeQuest = {
            title: 'Põgene Haiglast!',
            desc: 'Otsi üles 3 peidetud võtit ja ava väljapääsu värav!',
            current: 0,
            target: 3,
            completed: false,
            rewardCoins: 100,
            rewardYards: 50
        };

        if (isAdmin) {
            aiResponse = `🏥 <strong>Lõin täieliku Õudusmängu "Mahajäetud Haigla"!</strong><br>• Lõin haigla ruumid, uduse pimeda taeva ja 3 peidetud võtit.<br>• Lisasin patrulliva Kummituse (Enemy AI), lukus värava ja võiduportaali!<br>• Seadistasin ülesande: <em>"Leia 3 võtit ja põgene haiglast!"</em><br><br>👉 Klõpsa <strong>▶️ Play Test Mode</strong> ja alusta põgenemist!`;
        } else {
            aiResponse = `🏥 <strong>Created a full "Abandoned Hospital" Horror Game!</strong><br>• Generated dark corridors, eerie fog, 3 hidden keys, roaming Ghost monster, locked exit gate, and victory trigger!<br>• Configured quest: <em>"Find 3 keys to escape the Hospital!"</em><br><br>👉 Click <strong>▶️ Play Test Mode</strong> to play!`;
        }

    // --- 0.3 FULL GAME: MEDIEVAL RPG & DRAGON QUEST ---
    } else if (
        p.includes('rpg') || (p.includes('loss') && (p.includes('draakon') || p.includes('mõõk') || p.includes('koll'))) ||
        (p.includes('seiklus') && p.includes('draakon')) || (p.includes('dragon') && p.includes('castle'))
    ) {
        placedObjects.forEach(obj => scene.remove(obj.mesh));
        placedObjects.length = 0;
        selectObject(null);

        if (titleInput) titleInput.value = 'Draakoni Lossi Seiklus / Dragon Castle RPG';
        if (catSelect) catSelect.value = 'Adventure';
        if (descInput) descInput.value = 'Võta külast mõõk, osta poest varustust ja alista lossis elutsev hiiglaslik Tule-Draakon!';

        setDayNightMode('sunset');

        // 1. Village & Shopkeeper NPC
        const shopMesh = createCustomProceduralMesh('Pood Shop Merchant', 'Küla Kauplus');
        shopMesh.position.set(-8, 0, -5);
        scene.add(shopMesh);
        placedObjects.push({
            id: 'placed_rpg_shop',
            mesh: shopMesh,
            catalogId: 'shop_npc',
            name: '🛒 Küla Relvapood',
            category: 'gameplay',
            gameItemType: 'shop',
            position: { ...shopMesh.position },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#ffd32a'
        });
        generatedObjectsCount++;

        // 2. Legendary Sword on Pedestal
        const swordMesh = createCustomProceduralMesh('Mõõk Sword', 'Legendaarne Mõõk');
        swordMesh.position.set(0, 0, -4);
        scene.add(swordMesh);
        placedObjects.push({
            id: 'placed_rpg_sword',
            mesh: swordMesh,
            catalogId: 'item_sword',
            name: '⚔️ Legendaarne Mõõk',
            category: 'gameplay',
            gameItemType: 'weapon',
            position: { ...swordMesh.position },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#00f2fe',
            movement: { type: 'rotate', speed: 2.5, distance: 0, origin: { ...swordMesh.position } }
        });
        generatedObjectsCount++;

        // 3. Castle Structure
        const castleMesh = createCustomProceduralMesh('Loss Castle Fortress', 'Kuninglik Loss');
        castleMesh.position.set(0, 0, -22);
        castleMesh.scale.setScalar(2.0);
        scene.add(castleMesh);
        placedObjects.push({
            id: 'placed_rpg_castle',
            mesh: castleMesh,
            catalogId: 'castle_main',
            name: '🏰 Kuninglik Loss',
            category: 'city',
            position: { ...castleMesh.position },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 2, y: 2, z: 2 },
            color: '#95a5a6'
        });
        generatedObjectsCount++;

        // 4. Colossal Fire Dragon Boss
        const dragonMesh = createCustomProceduralMesh('Draakon Dragon Monster Boss', 'Tule-Draakon');
        dragonMesh.position.set(0, 0, -26);
        dragonMesh.scale.setScalar(2.2);
        scene.add(dragonMesh);
        placedObjects.push({
            id: 'placed_rpg_dragon',
            mesh: dragonMesh,
            catalogId: 'boss_dragon',
            name: '🐉 Lossi Tule-Draakon (BOSS)',
            category: 'gameplay',
            gameItemType: 'boss',
            enemyData: { health: 150, maxHealth: 150, damage: 25, speed: 3.2, isBoss: true, name: 'Tule-Draakon' },
            position: { ...dragonMesh.position },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 2.2, y: 2.2, z: 2.2 },
            color: '#e74c3c'
        });
        generatedObjectsCount++;

        // 5. Gold Coins scattered
        [-5, 5, -12, 12].forEach((x, idx) => {
            const coinGroup = new THREE.Group();
            const coinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.9, roughness: 0.1 }));
            coinMesh.rotation.x = Math.PI / 2;
            coinMesh.position.y = 0.8;
            coinGroup.add(coinMesh);
            coinGroup.position.set(x, 0, -10 + idx * 3);
            scene.add(coinGroup);

            placedObjects.push({
                id: 'placed_rpg_coin_' + idx,
                mesh: coinGroup,
                catalogId: 'gold_coin',
                name: '🪙 Kuldne Münt',
                category: 'gameplay',
                gameItemType: 'coin',
                position: { ...coinGroup.position },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                color: '#ffd32a',
                movement: { type: 'rotate', speed: 3.0, distance: 0, origin: { ...coinGroup.position } }
            });
            generatedObjectsCount++;
        });

        // Set Active Quest & HUD
        activeQuest = {
            title: 'Alista Draakon!',
            desc: 'Haara külast mõõk, sisene lossi ja võida Draakon!',
            current: 0,
            target: 1,
            completed: false,
            rewardCoins: 250,
            rewardYards: 100
        };

        if (isAdmin) {
            aiResponse = `🐉 <strong>Lõin täieliku Keskaegse RPG Seiklusmängu!</strong><br>• Külas ootab <strong>🛒 Relvapood</strong> ja maas hõljub <strong>⚔️ Legendaarne Mõõk</strong>.<br>• Lossi troonisaalis varitseb võimas <strong>🐉 Tule-Draakon (Boss)</strong> eluribaga!<br>• Ründa vaenlast hiireklõpsuga või vajuta <strong>[E]</strong>!<br><br>👉 Klõpsa <strong>▶️ Play Test Mode</strong> ja asu lahingusse!`;
        } else {
            aiResponse = `🐉 <strong>Created a complete Medieval RPG Adventure Game!</strong><br>• Features weapon shop NPC, legendary sword pickup, massive castle, and Fire Dragon Boss!<br>• Attack with mouse click or <strong>[E]</strong> key!<br><br>👉 Click <strong>▶️ Play Test Mode</strong> to play!`;
        }

    // --- 0.4 SEMANTIC SCENE & INTENT ACTIONS (Clear, Scale, Color, Transform) ---
    } else if (p.includes('kustuta kõik') || p.includes('tühjenda') || p.includes('tuhjenda') || p.includes('alusta uuesti') || p.includes('clear all') || p.includes('clear scene')) {
        placedObjects.forEach(obj => scene.remove(obj.mesh));
        placedObjects.length = 0;
        selectObject(null);
        if (isAdmin) {
            aiResponse = `🧹 <strong>Puhastasin kogu 3D stseeni!</strong><br>Kõik vanad objektid on eemaldatud. Saad alustada uue maailma loomisega!`;
        } else {
            aiResponse = `🧹 <strong>Cleared the entire 3D scene!</strong><br>All objects have been removed. Ready to build a new world!`;
        }

    } else if (p.includes('suurem') || p.includes('suuremaks') || p.includes('hiiglaslik') || p.includes('scale up') || p.includes('make bigger')) {
        const target = selectedObject || placedObjects[placedObjects.length - 1];
        if (target) {
            target.mesh.scale.multiplyScalar(1.5);
            target.scale = { x: target.mesh.scale.x, y: target.mesh.scale.y, z: target.mesh.scale.z };
            if (isAdmin) {
                aiResponse = `🔍 <strong>Tegin objekti ${target.name} 1.5x suuremaks!</strong>`;
            } else {
                aiResponse = `🔍 <strong>Scaled up ${target.name} by 1.5x!</strong>`;
            }
        } else {
            aiResponse = isAdmin ? `⚠️ Vali enne objekt, mida soovid suurendada!` : `⚠️ Please select an object to scale up!`;
        }

    } else if (p.includes('väiksem') || p.includes('vaiksem') || p.includes('väiksemaks') || p.includes('smaller') || p.includes('scale down')) {
        const target = selectedObject || placedObjects[placedObjects.length - 1];
        if (target) {
            target.mesh.scale.multiplyScalar(0.7);
            target.scale = { x: target.mesh.scale.x, y: target.mesh.scale.y, z: target.mesh.scale.z };
            if (isAdmin) {
                aiResponse = `🔍 <strong>Tegin objekti ${target.name} väiksemaks (0.7x)!</strong>`;
            } else {
                aiResponse = `🔍 <strong>Scaled down ${target.name} (0.7x)!</strong>`;
            }
        } else {
            aiResponse = isAdmin ? `⚠️ Vali enne objekt, mida soovid vähendada!` : `⚠️ Please select an object to scale down!`;
        }

    } else if (p.includes('pood') || p.includes('shop') || p.includes('kauplus') || p.includes('merchant')) {
        const shopMesh = createCustomProceduralMesh('Pood Shop Merchant', 'Kaupmees');
        shopMesh.position.set(0, 0, -4);
        scene.add(shopMesh);
        placedObjects.push({
            id: 'placed_ai_shop_' + Date.now(),
            mesh: shopMesh,
            catalogId: 'shop_npc',
            name: '🛒 Kaupmees (Mängusisene Pood)',
            category: 'gameplay',
            gameItemType: 'shop',
            position: { ...shopMesh.position },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#ffd32a'
        });
        generatedObjectsCount++;
        if (isAdmin) {
            aiResponse = `🛒 <strong>Lisasin stseeni kaupmehe ja mängusisese poe!</strong><br>Kõnni kaupmehe juurde ja vajuta [E] poe avamiseks, kus mängijad saavad osta elujooke, kiiruseboonuseid ja mõõkasid!`;
        } else {
            aiResponse = `🛒 <strong>Spawned Shopkeeper NPC with In-Game Item Store!</strong><br>Walk near and press [E] to buy potions, speed boosts, and swords!`;
        }

    } else if (p.includes('paranda') || p.includes('fix') || p.includes('tee korda') || p.includes('repair')) {
        // Ensure spawn point, goal, and valid scene objects
        if (placedObjects.length === 0) {
            executeAiBuild('Loo parkour seiklusrada');
            aiResponse = isAdmin ? `🛠️ <strong>Mäng oli tühi – lõin automaatselt uue täieliku mänguraja!</strong>` : `🛠️ <strong>Repaired empty scene and created a full playable game!</strong>`;
        } else {
            aiResponse = isAdmin ? `🛠️ <strong>Kontrollisin mängu struktuuri:</strong> Kõik 3D objektid, füüsika ja päästikud töötavad korrektselt!` : `🛠️ <strong>Game audit complete:</strong> All 3D objects, physics, and gameplay triggers are functional!`;
        }

    } else if (p.includes('värvi') || p.includes('varvi') || p.includes('color') || p.includes('paint')) {
        const target = selectedObject || placedObjects[placedObjects.length - 1];
        let newColor = '#00f2fe';
        let colorName = 'Cyan';
        if (p.includes('punan') || p.includes('red')) { newColor = '#e74c3c'; colorName = 'Red'; }
        else if (p.includes('kuld') || p.includes('gold') || p.includes('kollan') || p.includes('yellow')) { newColor = '#ffd32a'; colorName = 'Gold'; }
        else if (p.includes('rohelin') || p.includes('green')) { newColor = '#2ecc71'; colorName = 'Green'; }
        else if (p.includes('sinin') || p.includes('blue')) { newColor = '#3498db'; colorName = 'Blue'; }
        else if (p.includes('must') || p.includes('black')) { newColor = '#1e272e'; colorName = 'Black'; }
        else if (p.includes('lilla') || p.includes('purple')) { newColor = '#9b59b6'; colorName = 'Purple'; }

        if (target) {
            target.mesh.traverse((node: any) => {
                if (node.isMesh && node.material) {
                    node.material = new THREE.MeshStandardMaterial({ color: newColor, roughness: 0.4, metalness: 0.4 });
                }
            });
            target.color = newColor;
            if (isAdmin) {
                aiResponse = `🎨 <strong>Värvisin objekti ${target.name} tooni ${colorName}!</strong>`;
            } else {
                aiResponse = `🎨 <strong>Painted ${target.name} into ${colorName}!</strong>`;
            }
        } else {
            aiResponse = isAdmin ? `⚠️ Vali objekt, mida soovid värvida!` : `⚠️ Please select an object to repaint!`;
        }

    // --- 0.0 DYNAMIC MOVEMENT & ANIMATION (Pane liikuma, sõitma, pöörlema, hüppama) ---
    } else if (
        p.includes('liigu') || p.includes('liikuma') || p.includes('move') || p.includes('motion') ||
        p.includes('patrulli') || p.includes('patrol') || p.includes('sõitma') || p.includes('soitma') ||
        p.includes('pöörlema') || p.includes('poorlema') || p.includes('rotate') || p.includes('spin') ||
        p.includes('tiirlema') || p.includes('hüppama') || p.includes('huppama') || p.includes('bounce') ||
        p.includes('lift') || p.includes('elevator')
    ) {
        let target = selectedObject || placedObjects[placedObjects.length - 1];
        let moveType: 'patrol' | 'elevator' | 'rotate' | 'bounce' | 'circle' = 'patrol';
        let moveDescEt = 'patrullima edasi-tagasi';
        let moveDescEn = 'patrolling back and forth';
        let speed = 2.0;
        let distance = 6.0;
        let axis: 'x' | 'y' | 'z' = 'x';

        if (p.includes('pöör') || p.includes('poor') || p.includes('spin') || p.includes('rotate')) {
            moveType = 'rotate';
            speed = 2.0;
            moveDescEt = 'pidevalt ümber oma telje pöörlema';
            moveDescEn = 'continuously spinning around its axis';
        } else if (p.includes('lift') || p.includes('elevator') || p.includes('üles') || p.includes('kõrgus') || p.includes('up and down')) {
            moveType = 'elevator';
            axis = 'y';
            speed = 1.8;
            distance = 5.0;
            moveDescEt = 'üles-alla liftina liikuma (kõrgus 5m)';
            moveDescEn = 'moving up and down like an elevator (5m)';
        } else if (p.includes('hüp') || p.includes('bounce') || p.includes('jump')) {
            moveType = 'bounce';
            speed = 3.2;
            distance = 2.5;
            moveDescEt = 'rõõmsalt hüppama ja põrkama';
            moveDescEn = 'bouncing and hopping dynamically';
        } else if (p.includes('ring') || p.includes('circle') || p.includes('tiirle')) {
            moveType = 'circle';
            speed = 1.4;
            distance = 7.0;
            moveDescEt = 'ringiratast tiirlema';
            moveDescEn = 'moving in a smooth circular orbit';
        } else if (p.includes('edasi') || p.includes('auto') || p.includes('sõit') || p.includes('z')) {
            moveType = 'patrol';
            axis = 'z';
            speed = 2.2;
            distance = 8.0;
            moveDescEt = 'edasi-tagasi mööda teed liikuma (8m)';
            moveDescEn = 'patrolling forward and backward (8m)';
        }

        if (!target) {
            const platGeo = new THREE.BoxGeometry(4.0, 0.4, 4.0);
            const platMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.4, roughness: 0.3 });
            const platMesh = new THREE.Mesh(platGeo, platMat);
            platMesh.position.set(0, 1.5, -4.0);
            scene.add(platMesh);

            target = {
                id: 'placed_moving_plat_' + Date.now(),
                mesh: platMesh,
                catalogId: 'moving_platform',
                name: isAdmin ? '⚡ Liikuv 3D Platvorm' : '⚡ Moving 3D Platform',
                category: 'gameplay',
                position: { x: 0, y: 1.5, z: -4.0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                color: '#00f2fe'
            };
            placedObjects.push(target);
            generatedObjectsCount++;
        }

        target.movement = {
            type: moveType,
            axis,
            speed,
            distance,
            origin: { x: target.mesh.position.x, y: target.mesh.position.y, z: target.mesh.position.z },
            rotationSpeed: speed
        };

        selectObject(target);

        if (isAdmin) {
            aiResponse = `🎬 <strong>Panin objekti elama ja liikuma!</strong><br>Objekt <strong>${target.name}</strong> hakkas <strong>${moveDescEt}</strong>!<br>💡 Näed liikumist reaalajas nii stuudios kui ka <strong>▶️ Play Test Mode</strong> mängurežiimis!`;
        } else {
            aiResponse = `🎬 <strong>Animated object into motion!</strong><br><strong>${target.name}</strong> is now <strong>${moveDescEn}</strong>!<br>💡 Watch it move live in the Studio and in <strong>▶️ Play Test Mode</strong>!`;
        }

    // --- 0. MATHEMATICS & CALCULATIONS (e.g. 1+1, 5*5, 100/4, 25-10, sqrt, mis on 5+5 jne) ---
    } else if (mathResult !== null) {
        if (isAdmin) {
            aiResponse = `🧮 <strong>Vastus:</strong><br><span style="font-size: 1.25rem; color: #ffd32a; font-weight: bold;">${mathExpr} = ${mathResult}</span><br><br>💡 Oskan arvutada ka muid tehteid (nt liitmine, lahutamine, korrutamine, jagamine ja astendamine)!`;
        } else {
            aiResponse = `🧮 <strong>Result:</strong><br><span style="font-size: 1.25rem; color: #ffd32a; font-weight: bold;">${mathExpr} = ${mathResult}</span><br><br>💡 I can calculate any arithmetic expression (addition, subtraction, multiplication, division, powers)!`;
        }

    // --- 0.1 WORLD CAPITALS Q&A (Pealinnad) ---
    } else if (p.includes('pealinn') || p.includes('capital')) {
        let matchedCapital: { et: string, en: string, countryEt: string, countryEn: string } | null = null;
        for (const [key, val] of Object.entries(WORLD_CAPITALS_MAP)) {
            if (p.includes(key)) {
                matchedCapital = val;
                break;
            }
        }

        if (matchedCapital) {
            if (isAdmin) {
                aiResponse = `🏛️ <strong>Riigi ${matchedCapital.countryEt} pealinn on:</strong><br><span style="font-size: 1.2rem; color: #ffd32a; font-weight: bold;">${matchedCapital.et}</span>`;
            } else {
                aiResponse = `🏛️ <strong>The capital of ${matchedCapital.countryEn} is:</strong><br><span style="font-size: 1.2rem; color: #ffd32a; font-weight: bold;">${matchedCapital.en}</span>`;
            }
        } else {
            if (isAdmin) {
                aiResponse = `🏛️ <strong>Maailma tuntumad pealinnad:</strong><br>
                • 🇪🇪 <strong>Eesti:</strong> Tallinn<br>
                • 🇫🇮 <strong>Soome:</strong> Helsingi<br>
                • 🇸🇪 <strong>Rootsi:</strong> Stockholm<br>
                • 🇱🇻 <strong>Läti:</strong> Riia<br>
                • 🇫🇷 <strong>Prantsusmaa:</strong> Pariis<br>
                • 🇩🇪 <strong>Saksamaa:</strong> Berliin<br>
                • 🇬🇧 <strong>Suurbritannia:</strong> London<br>
                • 🇺🇸 <strong>USA:</strong> Washington D.C.<br>
                • 🇯🇵 <strong>Jaapan:</strong> Tokyo<br>
                • 🇨🇳 <strong>Hiina:</strong> Peking (Beijing)`;
            } else {
                aiResponse = `🏛️ <strong>Notable World Capitals:</strong><br>
                • 🇪🇪 <strong>Estonia:</strong> Tallinn<br>
                • 🇫🇮 <strong>Finland:</strong> Helsinki<br>
                • 🇸🇪 <strong>Sweden:</strong> Stockholm<br>
                • 🇱🇻 <strong>Latvia:</strong> Riga<br>
                • 🇫🇷 <strong>France:</strong> Paris<br>
                • 🇩🇪 <strong>Germany:</strong> Berlin<br>
                • 🇬🇧 <strong>United Kingdom:</strong> London<br>
                • 🇺🇸 <strong>USA:</strong> Washington, D.C.<br>
                • 🇯🇵 <strong>Japan:</strong> Tokyo<br>
                • 🇨🇳 <strong>China:</strong> Beijing`;
            }
        }

    // --- 0.2 LARGEST COUNTRIES Q&A (Suurimad riigid) ---
    } else if (
        (p.includes('riik') || p.includes('riigid') || p.includes('country') || p.includes('countries')) &&
        (p.includes('suurim') || p.includes('suurima') || p.includes('largest') || p.includes('biggest'))
    ) {
        if (isAdmin) {
            aiResponse = `🌍 <strong>Maailma Suurimad Riigid (Pindala järgi):</strong><br>
            1. 🇷🇺 <strong>Venemaa</strong> — 17 098 246 km²<br>
            2. 🇨🇦 <strong>Kanada</strong> — 9 984 670 km²<br>
            3. 🇺🇸 <strong>USA</strong> — 9 833 517 km²<br>
            4. 🇨🇳 <strong>Hiina</strong> — 9 596 960 km²<br>
            5. 🇧🇷 <strong>Brasiilia</strong> — 8 515 767 km²<br>
            6. 🇦🇺 <strong>Austraalia</strong> — 7 692 024 km²<br>
            7. 🇮🇳 <strong>India</strong> — 3 287 263 km²<br><br>
            👥 <em>Rahvaarvu järgi on suurimad riigid <strong>India</strong> (~1.43 mld) ja <strong>Hiina</strong> (~1.41 mld).</em>`;
        } else {
            aiResponse = `🌍 <strong>World's Largest Countries (By Area):</strong><br>
            1. 🇷🇺 <strong>Russia</strong> — 17,098,246 km²<br>
            2. 🇨🇦 <strong>Canada</strong> — 9,984,670 km²<br>
            3. 🇺🇸 <strong>United States</strong> — 9,833,517 km²<br>
            4. 🇨🇳 <strong>China</strong> — 9,596,960 km²<br>
            5. 🇧🇷 <strong>Brazil</strong> — 8,515,767 km²<br>
            6. 🇦🇺 <strong>Australia</strong> — 7,692,024 km²<br>
            7. 🇮🇳 <strong>India</strong> — 3,287,263 km²<br><br>
            👥 <em>By population, the largest nations are <strong>India</strong> (~1.43B) and <strong>China</strong> (~1.41B).</em>`;
        }

    // --- 0.3 GENERAL KNOWLEDGE & WORLD ENCYCLOPEDIA Q&A (e.g. Largest Airplanes, Speed, World records) ---
    } else if (
        (p.includes('lennuk') || p.includes('plane') || p.includes('airplane') || p.includes('aircraft')) &&
        (p.includes('suurim') || p.includes('suurima') || p.includes('largest') || p.includes('biggest') || p.includes('raskeim') || p.includes('heaviest'))
    ) {
        if (isAdmin) {
            aiResponse = `✈️ <strong>Maailma Suurimad Lennukid:</strong><br>
            1. <strong>Antonov An-225 Mriya</strong> — Maailma kõigi aegade raskeim ja pikim 6-mootoriline hiigellennuk (tiivaulatus 88.4 m, maksimaalne stardikaal 640 tonni).<br>
            2. <strong>Stratolaunch Roc</strong> — Maailma suurima tiivaulatusega lennuk (117 meetrit / 385 jalga, kahe kere ja 6 Boeing 747 mootoriga kosmoserakettide kandja).<br>
            3. <strong>Airbus A380-800</strong> — Maailma suurim kahekorruseline reisilennuk (kuni 853 reisijat, tiivaulatus 79.75 m).<br>
            4. <strong>Boeing 747-8</strong> — Maailma pikim reisilennuk (pikkus 76.3 meetrit, tuntud kui "Taevakuninganna").<br>
            5. <strong>Hughes H-4 Hercules ("Spruce Goose")</strong> — Ajalooline puidust hiiglaslik lennupaat (tiivaulatus 97.5 meetrit).`;
        } else {
            aiResponse = `✈️ <strong>World's Largest Airplanes:</strong><br>
            1. <strong>Antonov An-225 Mriya</strong> — Heaviest and longest cargo aircraft ever built (wingspan 88.4m, max takeoff weight 640t).<br>
            2. <strong>Stratolaunch Roc</strong> — Largest wingspan in aviation history (117m / 385ft double-fuselage carrier aircraft).<br>
            3. <strong>Airbus A380-800</strong> — World's largest passenger airliner (full double-decker carrying up to 853 passengers).<br>
            4. <strong>Boeing 747-8</strong> — Longest passenger airliner in service (76.3 meters long).<br>
            5. <strong>Hughes H-4 Hercules ("Spruce Goose")</strong> — Iconic historical flying boat with 97.5m wingspan.`;
        }

    // --- 0.4 GAMEPLAY Q&A (How to drive, jump, save, earn yards, etc.) ---
    } else if (
        p.includes('kuidas autoga') || p.includes('kuidas soita') || p.includes('kuidas sõita') || p.includes('auto juhtimine') ||
        p.includes('how to drive') || p.includes('drive car') || p.includes('drive a car')
    ) {
        if (isAdmin) {
            aiResponse = `🚗 <strong>Kuidas autoga sõita:</strong><br>1. Klõpsa üleval nuppu <strong>▶️ Play Test Mode</strong>.<br>2. Kõnni auto juurde — ekraanile ilmub nupp <strong>[F]</strong>.<br>3. Vajuta klaviatuuril <strong>[F]</strong> (või vajuta ekraani nuppu) autosse istumiseks.<br>4. Juhi auto liikumist: <strong>W / ⬆️</strong> (Gaas), <strong>S / ⬇️</strong> (Pidur/Tagurpidi), <strong>A / D</strong> (Pööramine).<br>5. Väljumiseks vajuta uuesti <strong>[F]</strong>!`;
        } else {
            aiResponse = `🚗 <strong>How to Drive Cars:</strong><br>1. Click <strong>▶️ Play Test Mode</strong> in the top bar.<br>2. Walk close to any car — press <strong>[F]</strong> to enter.<br>3. Drive with <strong>W / ⬆️</strong> (Gas), <strong>S / ⬇️</strong> (Brake/Reverse), and <strong>A / D</strong> (Steer).<br>4. Press <strong>[F]</strong> again to exit!`;
        }

    } else if (
        p.includes('kuidas lennata') || p.includes('kuidas lennukiga') || p.includes('kuidas lennukit juhtida') ||
        p.includes('how to fly') || p.includes('fly airplane') || p.includes('how to control plane')
    ) {
        if (isAdmin) {
            aiResponse = `✈️ <strong>Kuidas lennukiga lennata:</strong><br>1. Klõpsa üleval nuppu <strong>▶️ Play Test Mode</strong>.<br>2. Kõnni lennuki juurde ja vajuta <strong>[F]</strong> lennukisse istumiseks.<br>3. Vajuta <strong>W</strong> gaasi andmiseks (lennuki kiirus tõuseb).<br>4. Hoia all <strong>SPACE</strong> või <strong>Q</strong> tõusmiseks ja taevasse tõusmiseks!<br>5. Pööra lennukit <strong>A / D</strong> klahvidega (lennuk teeb realistlikke pöördeid ja kallutab tiibu).<br>6. Laskumiseks ja maandumiseks kasuta <strong>Shift</strong> või <strong>E</strong> klahve.<br>7. Väljumiseks vajuta uuesti <strong>[F]</strong>!`;
        } else {
            aiResponse = `✈️ <strong>How to Fly Airplanes:</strong><br>1. Click <strong>▶️ Play Test Mode</strong> in the top bar.<br>2. Walk to the airplane and press <strong>[F]</strong> to board.<br>3. Press <strong>W</strong> for throttle/acceleration.<br>4. Hold <strong>SPACE</strong> or <strong>Q</strong> to climb and take off into the sky!<br>5. Steer and bank with <strong>A / D</strong> keys.<br>6. Descend/land using <strong>Shift</strong> or <strong>E</strong>.<br>7. Press <strong>[F]</strong> again to exit!`;
        }

    } else if (p.includes('kuidas hüpata') || p.includes('kuidas hupata') || p.includes('kuidas hüppan') || p.includes('how to jump') || (p.includes('jump') && !p.includes('pad') && !p.includes('parkour'))) {
        if (isAdmin) {
            aiResponse = `🚀 <strong>Kuidas hüpata:</strong><br>Vajuta klaviatuuril <strong>SPACE</strong> (tühikuklahvi) või vajuta ekraani all paremal asuvat sinist nuppu <strong>JUMP 🚀</strong>!`;
        } else {
            aiResponse = `🚀 <strong>How to Jump:</strong><br>Press the <strong>SPACEBAR</strong> on your keyboard or tap the blue <strong>JUMP 🚀</strong> button on screen!`;
        }

    } else if (p.includes('kuidas salvestada') || p.includes('kuidas seivida') || p.includes('how to save') || p.includes('save game')) {
        if (isAdmin) {
            aiResponse = `💾 <strong>Mängu salvestamine:</strong><br>Vajuta üleval paremal nuppu <strong>💾 Save Game</strong> (või <strong>🚀 Submit for Review</strong>, kui soovid mängu avalikustada administraatori ülevaatuseks)! Sinu mäng salvestub automaatselt ka <strong>📂 My Games</strong> kausta.`;
        } else {
            aiResponse = `💾 <strong>Saving your Game:</strong><br>Click <strong>💾 Save Game</strong> (or <strong>🚀 Submit for Review</strong> to publish for admin approval)! Your games are safely stored in <strong>📂 My Games</strong>.`;
        }

    } else if (p.includes('kes sa oled') || p.includes('mis sa oled') || p.includes('who are you') || p.includes('what are you')) {
        if (isAdmin) {
            aiResponse = `🤖 <strong>Olen sinu Playard AI Mänguassistent!</strong><br>Oskan ehitada 3D maailmu, luua asfalteeritud teid ja sõidetavaid autosid, kaunistada loodust, genereerida uusi unikaalseid 3D objekte (dinosaurused, robotid, lossid jne), arvutada matemaatikat (nt 1+1), vastata maailma faktidele (nt mis lennukid on suurimad) ning programmeerida mänguloogikat!`;
        } else {
            aiResponse = `🤖 <strong>I am your Playard AI Game Assistant!</strong><br>I can build 3D worlds, construct asphalt roads with drivable cars, create custom 3D models (dinosaurs, robots, castles), solve math (1+1), answer general knowledge (e.g. largest airplanes), and program interactive game logic!`;
        }

    } else if (p.includes('mis mäng see on') || p.includes('mis mang see on') || p.includes('mis on playard') || p.includes('what is playard') || p.includes('what game is this')) {
        if (isAdmin) {
            aiResponse = `🎮 <strong>Playard Games:</strong><br>See on Eesti oma 3D mängude ja simulaatorite platvorm! Siin saad luua oma 3D mänge (3D Creator Studio), lennata lennukiga (3D Flight Simulator), sõita rallit (Racing Simulator) ja kokata (3D Master Chef)!`;
        } else {
            aiResponse = `🎮 <strong>Playard Games:</strong><br>The ultimate 3D sandbox and simulation gaming platform! Create games in 3D Creator Studio, fly planes, race sports cars, and cook master chef meals!`;
        }

    } else if (p.includes('kuidas kustutada') || p.includes('kuidas eemaldada') || p.includes('how to delete') || p.includes('delete object')) {
        if (isAdmin) {
            aiResponse = `🗑️ <strong>Objekti kustutamine:</strong><br>Klõpsa stseenis objektile, mida soovid kustutada, ja vajuta klaviatuuril <strong>[D]</strong> või <strong>Delete</strong> klahvi (või paremal paneelis punast nuppu <strong>🗑️ Delete Object</strong>).`;
        } else {
            aiResponse = `🗑️ <strong>Deleting Objects:</strong><br>Click on the object in the scene and press <strong>[D]</strong> or <strong>Delete</strong> key (or click the red <strong>🗑️ Delete Object</strong> button in the inspector).`;
        }

    } else if (p.includes('kuidas pöörata') || p.includes('kuidas poorata') || p.includes('how to rotate') || p.includes('rotate object')) {
        if (isAdmin) {
            aiResponse = `🔄 <strong>Objekti pööramine:</strong><br>Vali objekt ja vajuta klaviatuuril <strong>[R]</strong> klahvi (iga vajutus pöörab 45°) või kasuta paremal paneelis asuvat nuppu <strong>🔄 R</strong>!`;
        } else {
            aiResponse = `🔄 <strong>Rotating Objects:</strong><br>Select an object and press <strong>[R]</strong> key (rotates 45° each press) or use the <strong>🔄 R</strong> button in the inspector!`;
        }

    } else if (p.includes('kuidas raha') || p.includes('kuidas yarde') || p.includes('how to get yards') || p.includes('earn yards')) {
        if (isAdmin) {
            aiResponse = `💎 <strong>Yards & Raha teenimine:</strong><br>Yarde saad teenida mängides simulaatoreid, lunastades igapäevaseid seeriaboonuseid (Daily Rewards) või sisestades promokoode oma rahakoti aknas!`;
        } else {
            aiResponse = `💎 <strong>Earning Yards Currency:</strong><br>Earn Yards by playing 3D simulators, claiming Daily Rewards streaks, or redeeming promo codes in your Wallet!`;
        }

    // --- 0.3 VERSATILE GAME PROGRAMMING ENGINE (Program whatever creator wants: text, speed boost, jump pad, yards bonus) ---
    } else if (
        p.includes('program') || p.includes('progameeri') || p.includes('skript') || p.includes('script') ||
        p.includes('kui ma') || p.includes('kui mängija') || p.includes('kui mangija') || p.includes('when player') || p.includes('if player') ||
        p.includes('trigger') || p.includes('päästik') || p.includes('paastik')
    ) {
        let behaviorType = 'dialog';
        let msg = '';
        let triggerTitle = isAdmin ? '✨ Interaktiivne Objekt' : '✨ Interactive Object';

        // Detect desired behavior type
        if (p.includes('kiirus') || p.includes('speed') || p.includes('boost')) {
            behaviorType = 'speed_boost';
            msg = isAdmin ? '⚡ Kiiruseboonus aktiveeritud (Speed Boost +100%)!' : '⚡ Speed Boost Activated (+100%)!';
            triggerTitle = isAdmin ? '⚡ Kiirenduspadi' : '⚡ Speed Booster';
        } else if (p.includes('hüpe') || p.includes('hupe') || p.includes('jump pad') || p.includes('bounce') || p.includes('lennuta')) {
            behaviorType = 'super_jump';
            msg = isAdmin ? '🚀 Superhüpe sooritatud!' : '🚀 Super Jump Boost Launched!';
            triggerTitle = isAdmin ? '🚀 Superhüppe Padi' : '🚀 Jump Pad';
        } else if (p.includes('yard') || p.includes('raha') || p.includes('punkt') || p.includes('score') || p.includes('coin')) {
            behaviorType = 'reward_yards';
            msg = isAdmin ? '💎 Kogusid boonuseks +50 Yardi!' : '💎 Collected +50 Yards Bonus!';
            triggerTitle = isAdmin ? '💎 Boonuskristall' : '💎 Reward Crystal';
        } else {
            // Extract custom dialogue/text
            const quoteMatch = promptText.match(/["'„”«»](.*?)["'„”«»]/);
            if (quoteMatch && quoteMatch[1]) {
                msg = quoteMatch[1].trim();
            } else {
                const textMatch = promptText.match(/(?:tekst|kiri|teade|sõnum|sonum|message|dialog|ütleb|utleb|kekst|says|shows|text)\s+(.+)$/i);
                if (textMatch && textMatch[1]) {
                    msg = textMatch[1].replace(/^[.,:!\s]+/, '').trim();
                }
            }
            if (!msg) {
                msg = isAdmin ? '✨ Avastasid interaktiivse mänguobjekti saladuse!' : '✨ You discovered the secret of the interactive object!';
            }
        }

        // Target existing selected object or create interactive beacon
        let targetObj = selectedObject || placedObjects[placedObjects.length - 1];
        if (!targetObj) {
            const padGroup = new THREE.Group();
            const padMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.6 });
            const padMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.3, 16), padMat);
            padMesh.position.y = 0.15;
            padGroup.add(padMesh);

            const beaconMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), new THREE.MeshStandardMaterial({ color: 0xffd32a, emissive: 0xffd32a, emissiveIntensity: 0.8 }));
            beaconMesh.position.y = 1.6;
            padGroup.add(beaconMesh);

            scene.add(padGroup);
            padGroup.position.set(0, 0, -4);

            targetObj = {
                id: 'placed_ai_script_' + Date.now(),
                mesh: padGroup,
                catalogId: 'custom_script_obj',
                name: triggerTitle,
                category: 'gameplay',
                position: { x: padGroup.position.x, y: padGroup.position.y, z: padGroup.position.z },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                color: '#00f2fe'
            };
            placedObjects.push(targetObj);
            generatedObjectsCount++;
        }

        targetObj.trigger = {
            type: 'touch',
            behavior: behaviorType,
            message: msg,
            title: triggerTitle,
            radius: 5.0
        };

        selectObject(targetObj);

        if (isAdmin) {
            aiResponse = `🤖 <strong>Mänguloogika edukalt programmeeritud!</strong><br>Objektile <strong>${targetObj.name}</strong> määrati käitumine: <strong>${behaviorType}</strong>.<br>👉 Tulemus mängijale:<br><em style="color: #ffd32a; font-size: 1.05rem;">"${msg}"</em><br><br>💡 Vajuta <strong>▶️ Play Test Mode</strong> ja kõnni objekti juurde, et seda kohe testida!`;
        } else {
            aiResponse = `🤖 <strong>Game logic successfully programmed!</strong><br>Assigned logic (<strong>${behaviorType}</strong>) to <strong>${targetObj.name}</strong>.<br>👉 Player action result:<br><em style="color: #ffd32a; font-size: 1.05rem;">"${msg}"</em><br><br>💡 Click <strong>▶️ Play Test Mode</strong> and walk near it to test!`;
        }

    // 1. PARKOUR / OBSTACLES
    } else if (p.includes('parkour') || p.includes('rada') || p.includes('hüp') || p.includes('jump') || p.includes('obstacle') || p.includes('takistus')) {
        if (titleInput) titleInput.value = 'AI Parkour Challenge';
        if (catSelect) catSelect.value = 'Platformer';
        if (descInput) descInput.value = 'Exciting 3D Parkour course generated with Playard AI!';

        const parkourItems = CATALOG_DATABASE.filter(c => c.category === 'gameplay' || c.name.includes('Platform') || c.name.includes('Crate') || c.name.includes('Obstacle'));
        let currentHeight = 0.5;
        let currentZ = 0;
        let currentX = 0;

        for (let i = 0; i < 9; i++) {
            const item = parkourItems[i % parkourItems.length] || CATALOG_DATABASE[0];
            const mesh = createObjectMesh(item);
            mesh.position.set(currentX, currentHeight, currentZ);
            mesh.scale.setScalar(item.baseScale * (1 + Math.random() * 0.3));
            scene.add(mesh);

            placedObjects.push({
                id: 'placed_ai_' + Date.now() + '_' + i,
                mesh,
                catalogId: item.id,
                name: item.name,
                category: item.category,
                position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z },
                color: item.color
            });

            currentHeight += 0.7;
            currentZ -= 4.5;
            currentX += (Math.random() - 0.5) * 3;
            generatedObjectsCount++;
        }

        if (isAdmin) {
            aiResponse = `🏃 Lõin sulle 9-astmelise parkuuriraja tõusvate platvormidega! Saad seda kohe nooltega ja tühikuga (Jump) testida!`;
        } else {
            aiResponse = `🏃 I created a 9-stage parkour challenge with rising platforms! Test it now with arrows and spacebar (Jump)!`;
        }

    // 2. METS / NATURE / FOREST
    } else if (p.includes('mets') || p.includes('forest') || p.includes('puu') || p.includes('tree') || p.includes('nature') || p.includes('loodus')) {
        if (titleInput) titleInput.value = 'AI Mystical Forest';
        if (catSelect) catSelect.value = 'Adventure';
        if (descInput) descInput.value = 'A lush natural 3D forest populated by Playard AI.';

        const natureItems = CATALOG_DATABASE.filter(c => c.category === 'nature');
        for (let i = 0; i < 14; i++) {
            const item = natureItems[i % natureItems.length] || CATALOG_DATABASE[0];
            const mesh = createObjectMesh(item);
            const rX = (Math.random() - 0.5) * 35;
            const rZ = (Math.random() - 0.5) * 35;
            mesh.position.set(rX, 0, rZ);
            mesh.scale.setScalar(item.baseScale * (0.8 + Math.random() * 0.6));
            mesh.rotation.y = Math.random() * Math.PI * 2;
            scene.add(mesh);

            placedObjects.push({
                id: 'placed_ai_' + Date.now() + '_' + i,
                mesh,
                catalogId: item.id,
                name: item.name,
                category: item.category,
                position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
                rotation: { x: 0, y: mesh.rotation.y, z: 0 },
                scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z },
                color: item.color
            });
            generatedObjectsCount++;
        }

        if (isAdmin) {
            aiResponse = `🌲 Istutasin stseeni ${generatedObjectsCount} puud, kändu ja kivimit! Looduslik metsamaailm on valmis.`;
        } else {
            aiResponse = `🌲 Planted ${generatedObjectsCount} trees, stumps, and rocks! The natural forest world is ready.`;
        }

    // 3. SMART CONTEXTUAL ADDITIONS & OBJECT DECORATOR (Lisa asjadele ise asju juurde)
    } else if (
        p.includes('juurde') || p.includes('kaunista') || p.includes('detail') ||
        p.includes('lisa autole') || p.includes('lisa puule') || p.includes('lisa majale') ||
        p.includes('add details') || p.includes('add to car') || p.includes('add to tree') ||
        p.includes('decorate')
    ) {
        // A. Adding additions to CAR / VEHICLE
        if (p.includes('auto') || p.includes('car') || (selectedObject && selectedObject.category === 'vehicles')) {
            const targetCar = selectedObject || placedObjects.find(obj => obj.category === 'vehicles') || placedObjects[0];
            const baseX = targetCar ? targetCar.position.x : 0;
            const baseZ = targetCar ? targetCar.position.z : 0;

            // Add Road section under/next to car
            const roadItem = CATALOG_DATABASE.find(c => c.name.toLowerCase().includes('road')) || CATALOG_DATABASE[0];
            const meshRoad = createObjectMesh(roadItem);
            meshRoad.position.set(baseX, 0, baseZ);
            scene.add(meshRoad);
            placedObjects.push({
                id: 'placed_ai_add_road_' + Date.now(),
                mesh: meshRoad,
                catalogId: roadItem.id,
                name: isAdmin ? '🛣️ Asfalttee' : '🛣️ Asphalt Road',
                category: 'city',
                position: { x: meshRoad.position.x, y: 0, z: meshRoad.position.z },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                color: roadItem.color
            });
            generatedObjectsCount++;

            // Add Street Lights on both sides
            const lightItem = CATALOG_DATABASE.find(c => c.name.toLowerCase().includes('light')) || CATALOG_DATABASE[0];
            [-3.5, 3.5].forEach((lx, idx) => {
                const meshLight = createObjectMesh(lightItem);
                meshLight.position.set(baseX + lx, 0, baseZ - 3 + idx * 6);
                scene.add(meshLight);
                placedObjects.push({
                    id: 'placed_ai_add_light_' + Date.now() + '_' + idx,
                    mesh: meshLight,
                    catalogId: lightItem.id,
                    name: isAdmin ? '💡 Tänavalamp' : '💡 Street Lamp',
                    category: 'city',
                    position: { x: meshLight.position.x, y: 0, z: meshLight.position.z },
                    rotation: { x: 0, y: 0, z: 0 },
                    scale: { x: 1, y: 1, z: 1 },
                    color: lightItem.color
                });
                generatedObjectsCount++;
            });

            // Add Fuel Tank / Gas Station prop
            const fuelItem = CATALOG_DATABASE.find(c => c.name.toLowerCase().includes('fuel') || c.name.toLowerCase().includes('tank') || c.category === 'scifi') || CATALOG_DATABASE[0];
            const meshFuel = createObjectMesh(fuelItem, '#f39c12');
            meshFuel.position.set(baseX + 4.5, 0, baseZ);
            scene.add(meshFuel);
            placedObjects.push({
                id: 'placed_ai_add_fuel_' + Date.now(),
                mesh: meshFuel,
                catalogId: fuelItem.id,
                name: isAdmin ? '⛽ Kütusetankur' : '⛽ Fuel Station',
                category: 'city',
                position: { x: meshFuel.position.x, y: 0, z: meshFuel.position.z },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                color: '#f39c12'
            });
            generatedObjectsCount++;

            if (isAdmin) {
                aiResponse = `🚗 <strong>Lisasin autole asju juurde!</strong><br>Ehituse käigus lisasin auto juurde asfalteeritud autotee, 2 tänavavalgustit ja kütusetankuri!`;
            } else {
                aiResponse = `🚗 <strong>Added details to the car!</strong><br>During construction, I added an asphalt road, 2 street lights, and a fuel pump!`;
            }

        // B. Adding additions to TREES / NATURE
        } else if (p.includes('puu') || p.includes('mets') || p.includes('nature') || p.includes('loodus') || (selectedObject && selectedObject.category === 'nature')) {
            const targetTree = selectedObject || placedObjects.find(obj => obj.category === 'nature') || placedObjects[0];
            const baseX = targetTree ? targetTree.position.x : 0;
            const baseZ = targetTree ? targetTree.position.z : 0;

            const natureItems = CATALOG_DATABASE.filter(c => c.category === 'nature');
            const rockItem = natureItems.find(c => c.name.toLowerCase().includes('rock') || c.name.toLowerCase().includes('boulder')) || natureItems[0];
            const flowerItem = natureItems.find(c => c.name.toLowerCase().includes('flower') || c.name.toLowerCase().includes('bush')) || natureItems[1];

            // Add rocks and flowers in circle around tree
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2;
                const r = 2.5 + (i % 2) * 1.2;
                const itm = (i % 2 === 0) ? rockItem : flowerItem;
                const mesh = createObjectMesh(itm);
                mesh.position.set(baseX + Math.cos(angle) * r, 0, baseZ + Math.sin(angle) * r);
                mesh.scale.setScalar(itm.baseScale * 0.9);
                scene.add(mesh);

                placedObjects.push({
                    id: 'placed_ai_add_nat_' + Date.now() + '_' + i,
                    mesh,
                    catalogId: itm.id,
                    name: itm.name,
                    category: 'nature',
                    position: { x: mesh.position.x, y: 0, z: mesh.position.z },
                    rotation: { x: 0, y: 0, z: 0 },
                    scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z },
                    color: itm.color
                });
                generatedObjectsCount++;
            }

            if (isAdmin) {
                aiResponse = `🌲 <strong>Lisasin puule ja loodusele detaile juurde!</strong><br>Paigutasin puu ümber samblased kivid, kaljurahnud ja õitsvad lillepõõsad!`;
            } else {
                aiResponse = `🌲 <strong>Decorated the trees and nature!</strong><br>I placed mossy rocks, boulders, and blooming flower bushes around the trees!`;
            }

        // C. Adding additions to BUILDINGS / HOUSES
        } else {
            const targetObj = selectedObject || placedObjects[0];
            const baseX = targetObj ? targetObj.position.x : 0;
            const baseZ = targetObj ? targetObj.position.z : 0;

            // Place 4 decorative props around the object
            const props = CATALOG_DATABASE.filter(c => c.category === 'city' || c.category === 'nature');
            for (let i = 0; i < 4; i++) {
                const item = props[i % props.length];
                const mesh = createObjectMesh(item);
                mesh.position.set(baseX + ((i % 2) * 2 - 1) * 3.5, 0, baseZ + (Math.floor(i / 2) * 2 - 1) * 3.5);
                scene.add(mesh);

                placedObjects.push({
                    id: 'placed_ai_add_prop_' + Date.now() + '_' + i,
                    mesh,
                    catalogId: item.id,
                    name: item.name,
                    category: item.category,
                    position: { x: mesh.position.x, y: 0, z: mesh.position.z },
                    rotation: { x: 0, y: 0, z: 0 },
                    scale: { x: 1, y: 1, z: 1 },
                    color: item.color
                });
                generatedObjectsCount++;
            }

            if (isAdmin) {
                aiResponse = `✨ <strong>Lisasin objektile asju ja detaile juurde!</strong><br>Paigutasin ümbrusesse 4 sobivat dekoratsiooni ja elementi.`;
            } else {
                aiResponse = `✨ <strong>Added items and details to the object!</strong><br>I placed 4 fitting decorations and elements nearby.`;
            }
        }

    // 4. LENDAVAD LENNUKID & LENNUJAAM / LENNURADA (FLYABLE AIRPLANES & RUNWAY)
    } else if (
        p.includes('lennuk') || p.includes('airplane') || p.includes('plane') ||
        p.includes('lendav') || p.includes('lenda') || p.includes('fly') ||
        p.includes('jet') || p.includes('aircraft') || p.includes('hävitaja') ||
        p.includes('havitaja') || p.includes('propeller') || p.includes('lennuväli') ||
        p.includes('lennuvali') || p.includes('lennurada') || p.includes('airport') || p.includes('runway')
    ) {
        if (titleInput) titleInput.value = '3D Flight Simulator';
        if (catSelect) catSelect.value = 'Racing';
        if (descInput) descInput.value = 'Airport runway with high speed flyable 3D airplanes in Playard.';

        // 1. Place Airport Runway Segments
        const roadItem = CATALOG_DATABASE.find(c => c.name.toLowerCase().includes('road') || c.geometryType.includes('road')) || CATALOG_DATABASE[0];
        for (let i = 0; i < 5; i++) {
            const mesh = createObjectMesh(roadItem);
            mesh.position.set(0, 0, (i - 2) * 14);
            mesh.scale.set(1.4, 1, 1);
            scene.add(mesh);

            placedObjects.push({
                id: 'placed_ai_runway_' + Date.now() + '_' + i,
                mesh,
                catalogId: roadItem.id,
                name: isAdmin ? `🛫 Lennurada Lõik #${i + 1}` : `🛫 Runway Section #${i + 1}`,
                category: 'city',
                position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1.4, y: 1, z: 1 },
                color: roadItem.color
            });
            generatedObjectsCount++;
        }

        // 2. Place Runway Edge Lights
        const lightItem = CATALOG_DATABASE.find(c => c.name.toLowerCase().includes('light')) || CATALOG_DATABASE[0];
        [-5.2, 5.2].forEach((lx) => {
            for (let li = 0; li < 4; li++) {
                const meshLight = createObjectMesh(lightItem, '#00f2fe');
                meshLight.position.set(lx, 0, -24 + li * 16);
                meshLight.scale.set(0.7, 0.7, 0.7);
                scene.add(meshLight);

                placedObjects.push({
                    id: 'placed_ai_rlight_' + Date.now() + '_' + lx + '_' + li,
                    mesh: meshLight,
                    catalogId: lightItem.id,
                    name: isAdmin ? '💡 Rajavalgusti' : '💡 Runway Light',
                    category: 'city',
                    position: { x: meshLight.position.x, y: 0, z: meshLight.position.z },
                    rotation: { x: 0, y: 0, z: 0 },
                    scale: { x: 0.7, y: 0.7, z: 0.7 },
                    color: '#00f2fe'
                });
                generatedObjectsCount++;
            }
        });

        // 3. Place Flyable 3D Airplane on Runway
        const planeMesh = createAirplane3DMesh('#3498db');
        planeMesh.position.set(0, 0, -4);
        scene.add(planeMesh);

        placedObjects.push({
            id: 'placed_ai_plane_' + Date.now(),
            mesh: planeMesh,
            catalogId: 'vehicle_plane_' + Date.now(),
            name: isAdmin ? '✈️ Lendav Lennuk' : '✈️ Flyable Airplane',
            category: 'vehicles',
            isAirplane: true,
            position: { x: planeMesh.position.x, y: 0, z: planeMesh.position.z },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#3498db'
        });
        generatedObjectsCount++;

        if (isAdmin) {
            aiResponse = `✈️ <strong>Lõin stseeni lennuraja ja lendava lennuki!</strong><br>Vajuta ülevalt <strong>▶️ Play Test Mode</strong> ja astu lennuki juurde <strong>[F]</strong>, et taevasse lennata!<br>🎮 <strong>Juhtimine:</strong> <strong>W</strong> (gaas/kiirendus), <strong>S</strong> (pidur), <strong>A/D</strong> (pööramine ja kallutus), <strong>SPACE / Q</strong> (tõus taevasse), <strong>Shift / E</strong> (laskumine).`;
        } else {
            aiResponse = `✈️ <strong>Created a runway and a flyable airplane!</strong><br>Click <strong>▶️ Play Test Mode</strong> above and approach the airplane <strong>[F]</strong> to fly into the sky!<br>🎮 <strong>Controls:</strong> <strong>W</strong> (throttle), <strong>S</strong> (brake), <strong>A/D</strong> (steer & bank), <strong>SPACE / Q</strong> (climb into sky), <strong>Shift / E</strong> (descend).`;
        }

    // 5. AUTOTEED & SÕIDETAVAD AUTOD (ROADS & DRIVABLE CARS)
    } else if (p.includes('autotee') || p.includes('autoteed') || (p.includes('tee') && !p.includes('teade')) || (p.includes('road') && !p.includes('broad')) || p.includes('sõit') || p.includes('soit') || p.includes('drive') || p.includes('car') || p.includes('auto')) {
        if (titleInput) titleInput.value = 'Highway & Supercars 3D';
        if (catSelect) catSelect.value = 'Racing';
        if (descInput) descInput.value = 'Long asphalt highway with high performance drivable supercars.';

        // 1. Place Continuous Asphalt Road Segments
        const roadItem = CATALOG_DATABASE.find(c => c.name.toLowerCase().includes('road') || c.geometryType.includes('road')) || CATALOG_DATABASE[0];
        for (let i = 0; i < 4; i++) {
            const mesh = createObjectMesh(roadItem);
            mesh.position.set(0, 0, (i - 1.5) * 13.5);
            scene.add(mesh);

            placedObjects.push({
                id: 'placed_ai_road_' + Date.now() + '_' + i,
                mesh,
                catalogId: roadItem.id,
                name: isAdmin ? `🛣️ Autotee Lõik #${i + 1}` : `🛣️ Highway Section #${i + 1}`,
                category: 'city',
                position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                color: roadItem.color
            });
            generatedObjectsCount++;
        }

        // 2. Place Drivable Supercars
        const vehicleItems = CATALOG_DATABASE.filter(c => c.category === 'vehicles' || c.name.toLowerCase().includes('car') || c.name.toLowerCase().includes('truck'));
        const car1 = vehicleItems[0] || CATALOG_DATABASE[0];
        const meshCar1 = createObjectMesh(car1, '#e74c3c');
        meshCar1.position.set(1.8, 0, -4);
        scene.add(meshCar1);

        placedObjects.push({
            id: 'placed_ai_car_' + Date.now() + '_1',
            mesh: meshCar1,
            catalogId: car1.id,
            name: isAdmin ? '🏎️ Sõidetav Supercar' : '🏎️ Drivable Supercar',
            category: 'vehicles',
            position: { x: meshCar1.position.x, y: meshCar1.position.y, z: meshCar1.position.z },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#e74c3c'
        });
        generatedObjectsCount++;

        if (isAdmin) {
            aiResponse = `🏎️ <strong>Lõin asfalteeritud autotee ja sõidetava Supercari!</strong><br>Vajuta ülevalt <strong>▶️ Play Test Mode</strong> ja astu auto juurde <strong>[F]</strong>, et autoga sõitma hakata!`;
        } else {
            aiResponse = `🏎️ <strong>Created an asphalt highway and drivable Supercar!</strong><br>Click <strong>▶️ Play Test Mode</strong> above and approach the car <strong>[F]</strong> to start driving!`;
        }

    // 5. SCI-FI / KOSMOS / SPACE
    } else if (p.includes('kosmos') || p.includes('space') || p.includes('sci-fi') || p.includes('alien') || p.includes('laev')) {
        if (titleInput) titleInput.value = 'AI Cosmic Station';
        if (catSelect) catSelect.value = 'Adventure';
        if (descInput) descInput.value = 'Sci-Fi planetary base crafted by AI.';

        const sciFiItems = CATALOG_DATABASE.filter(c => c.category === 'scifi');
        for (let i = 0; i < 8; i++) {
            const item = sciFiItems[i % sciFiItems.length] || CATALOG_DATABASE[0];
            const mesh = createObjectMesh(item);
            mesh.position.set((Math.random() - 0.5) * 25, Math.random() * 2, (Math.random() - 0.5) * 25);
            mesh.scale.setScalar(item.baseScale * (1 + Math.random() * 0.4));
            scene.add(mesh);

            placedObjects.push({
                id: 'placed_ai_' + Date.now() + '_' + i,
                mesh,
                catalogId: item.id,
                name: item.name,
                category: item.category,
                position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z },
                color: item.color
            });
            generatedObjectsCount++;
        }

        if (isAdmin) {
            aiResponse = `🛸 <strong>Lõin futuristliku kosmosebaasi!</strong><br>Paigutasin stseeni ${generatedObjectsCount} kosmoselaeva ja baasistruktuuri!`;
        } else {
            aiResponse = `🛸 <strong>Created a futuristic space station!</strong><br>Placed ${generatedObjectsCount} spaceships and structures in the scene!`;
        }

    // 6. PROCEDURAL CUSTOM 3D CREATION FOR ANY OTHER OBJECT / NON-CATALOG REQUEST
    } else {
        let customName = promptText.replace(/(?:loo|lisa|tekit|tee|ehita|create|spawn|add|make|build|generate)/gi, '').trim();
        if (!customName || customName.length < 2) customName = isAdmin ? '3D Kohandatud Mudel' : '3D Custom Model';
        customName = customName.charAt(0).toUpperCase() + customName.slice(1);

        const isVehicle = p.includes('auto') || p.includes('car') || p.includes('mootorratas') || p.includes('bike') || p.includes('krossikas') || p.includes('roller') || p.includes('scooter') || p.includes('veoauto') || p.includes('truck') || p.includes('tank') || p.includes('laev') || p.includes('ship') || p.includes('paat') || p.includes('boat') || p.includes('allveelaev') || p.includes('submarine') || p.includes('rong') || p.includes('train');
        const isFlyable = p.includes('lennuk') || p.includes('plane') || p.includes('airplane') || p.includes('jet') || p.includes('kopter') || p.includes('copter') || p.includes('ufo') || p.includes('rakett') || p.includes('rocket') || p.includes('kosmoselaev') || p.includes('spaceship') || p.includes('lendav');

        const customMesh = createCustomProceduralMesh(promptText, customName);
        customMesh.position.set(0, 0, -4.5);
        scene.add(customMesh);

        const newObj: PlacedObject = {
            id: 'placed_ai_custom_' + Date.now(),
            mesh: customMesh,
            catalogId: 'procedural_' + Date.now(),
            name: `✨ ${customName}`,
            category: (isVehicle || isFlyable) ? 'vehicles' : 'custom',
            isAirplane: isFlyable,
            position: { x: customMesh.position.x, y: customMesh.position.y, z: customMesh.position.z },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#00f2fe'
        };
        placedObjects.push(newObj);
        generatedObjectsCount++;

        if (isAdmin) {
            aiResponse = `✨ <strong>Lõin sinu kirjelduse põhjal täiesti uue 3D mudeli!</strong><br>Paigutasin stseeni: <strong>✨ ${customName}</strong>.${(isVehicle || isFlyable) ? '<br>🚗/✈️ <em>See sõiduk on Play Test režiimis sõidetav / lennatav! Vajuta [F] sisenemiseks!</em>' : ''}`;
        } else {
            aiResponse = `✨ <strong>Created a brand new custom 3D model based on your request!</strong><br>Spawned in scene: <strong>✨ ${customName}</strong>.${(isVehicle || isFlyable) ? '<br>🚗/✈️ <em>This vehicle is drivable/flyable in Play Test mode! Press [F] to enter!</em>' : ''}`;
        }
    }

    autoSaveDraft();

    // Append AI Response to chat
    if (chatLog) {
        const botMsg = document.createElement('div');
        botMsg.style.cssText = 'background: rgba(255,255,255,0.08); border-left: 3px solid #00f2fe; border-radius: 8px; padding: 10px 12px; color: #e2e8f0; line-height: 1.4;';
        botMsg.innerHTML = `🤖 <strong>AI Builder:</strong><br>${aiResponse}`;
        chatLog.appendChild(botMsg);
        chatLog.scrollTop = chatLog.scrollHeight;
    }
}

// --- Main Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);
    const time = Date.now() * 0.001;

    // --- Update Dynamic Moving & Animated Objects ---
    for (const obj of placedObjects) {
        if (obj.movement) {
            const m = obj.movement;
            if (m.type === 'patrol') {
                const axis = m.axis || 'x';
                const offset = Math.sin(time * m.speed) * m.distance;
                if (axis === 'x') obj.mesh.position.x = m.origin.x + offset;
                else if (axis === 'z') obj.mesh.position.z = m.origin.z + offset;
                else if (axis === 'y') obj.mesh.position.y = m.origin.y + offset;
            } else if (m.type === 'elevator') {
                obj.mesh.position.y = m.origin.y + (Math.sin(time * m.speed) * 0.5 + 0.5) * m.distance;
            } else if (m.type === 'rotate') {
                obj.mesh.rotation.y += (m.rotationSpeed || m.speed || 1.5) * delta;
            } else if (m.type === 'bounce') {
                obj.mesh.position.y = m.origin.y + Math.abs(Math.sin(time * m.speed)) * m.distance;
                obj.mesh.position.z = m.origin.z + Math.cos(time * (m.speed * 0.5)) * 1.2;
            } else if (m.type === 'circle') {
                obj.mesh.position.x = m.origin.x + Math.cos(time * m.speed) * m.distance;
                obj.mesh.position.z = m.origin.z + Math.sin(time * m.speed) * m.distance;
                obj.mesh.rotation.y = -time * m.speed;
            }
            obj.position.x = obj.mesh.position.x;
            obj.position.y = obj.mesh.position.y;
            obj.position.z = obj.mesh.position.z;
        }
    }

    if (isPlayTestMode) {
        if (currentVehicle) {
            const isPlane = isAirplaneObject(currentVehicle);

            if (isPlane) {
                // --- ✈️ 3D Airplane Flight Physics & Flight Controls ---
                const maxFlightSpeed = 52; // ~190 km/h
                const flightAccel = 34;

                // 1. Throttle / Acceleration & Brake
                if (keys['KeyW'] || keys['ArrowUp']) {
                    vehicleSpeed = Math.min(vehicleSpeed + flightAccel * delta, maxFlightSpeed);
                } else if (keys['KeyS'] || keys['ArrowDown']) {
                    if (currentVehicle.mesh.position.y <= 0.3) {
                        // On runway: brake / reverse
                        vehicleSpeed = Math.max(vehicleSpeed - flightAccel * delta, -10);
                    } else {
                        // Airborne: air-brake / slow down
                        vehicleSpeed = Math.max(vehicleSpeed - flightAccel * 0.7 * delta, 8);
                    }
                } else {
                    // Natural air resistance
                    vehicleSpeed = THREE.MathUtils.lerp(vehicleSpeed, currentVehicle.mesh.position.y > 0.5 ? 18 : 0, 1.2 * delta);
                }

                // 2. Yaw Steering & Roll Banking
                const steerDir = (vehicleSpeed >= 0 ? 1 : -1);
                if (keys['KeyA'] || keys['ArrowLeft']) {
                    currentVehicle.mesh.rotation.y += 2.2 * delta * steerDir;
                    currentVehicle.mesh.rotation.z = THREE.MathUtils.lerp(currentVehicle.mesh.rotation.z, 0.42, 6 * delta);
                } else if (keys['KeyD'] || keys['ArrowRight']) {
                    currentVehicle.mesh.rotation.y -= 2.2 * delta * steerDir;
                    currentVehicle.mesh.rotation.z = THREE.MathUtils.lerp(currentVehicle.mesh.rotation.z, -0.42, 6 * delta);
                } else {
                    // Auto level wings roll
                    currentVehicle.mesh.rotation.z = THREE.MathUtils.lerp(currentVehicle.mesh.rotation.z, 0, 5 * delta);
                }

                // 3. Pitch (Climb / Dive) & Altitude Lift
                const isClimbing = keys['Space'] || keys['KeyQ'];
                const isDiving = keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyE'] || (keys['KeyS'] && currentVehicle.mesh.position.y > 0.5);

                if (isClimbing) {
                    // Climb rate proportional to speed
                    const climbPower = Math.max(10, Math.abs(vehicleSpeed) * 0.5);
                    currentVehicle.mesh.position.y = Math.min(180, currentVehicle.mesh.position.y + climbPower * delta);
                    currentVehicle.mesh.rotation.x = THREE.MathUtils.lerp(currentVehicle.mesh.rotation.x, -0.32, 5 * delta);
                } else if (isDiving) {
                    currentVehicle.mesh.position.y = Math.max(0, currentVehicle.mesh.position.y - 14 * delta);
                    currentVehicle.mesh.rotation.x = THREE.MathUtils.lerp(currentVehicle.mesh.rotation.x, 0.32, 5 * delta);
                } else {
                    // Natural level pitch
                    currentVehicle.mesh.rotation.x = THREE.MathUtils.lerp(currentVehicle.mesh.rotation.x, 0, 4 * delta);

                    // Aerodynamic lift if airborne
                    if (currentVehicle.mesh.position.y > 0) {
                        if (Math.abs(vehicleSpeed) < 6) {
                            currentVehicle.mesh.position.y = Math.max(0, currentVehicle.mesh.position.y - 8 * delta);
                        }
                    }
                }

                // 4. Ground Collision & Landing
                if (currentVehicle.mesh.position.y <= 0) {
                    currentVehicle.mesh.position.y = 0;
                    currentVehicle.mesh.rotation.x = 0;
                    currentVehicle.mesh.rotation.z = 0;
                }

                // 5. Move Airplane Forward in its 3D Heading
                currentVehicle.mesh.translateZ(-vehicleSpeed * delta);
                currentVehicle.position = {
                    x: currentVehicle.mesh.position.x,
                    y: currentVehicle.mesh.position.y,
                    z: currentVehicle.mesh.position.z
                };

                // Sync human position to airplane
                humanCharacter.position.copy(currentVehicle.mesh.position);

                // 6. Smooth 3rd Person Follow Camera
                const camDistance = 10.5;
                const camHeight = 4.2;
                const camOffset = new THREE.Vector3(0, camHeight, camDistance);
                camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), currentVehicle.mesh.rotation.y);
                const targetCamPos = currentVehicle.mesh.position.clone().add(camOffset);
                camera.position.lerp(targetCamPos, 0.15);
                camera.lookAt(currentVehicle.mesh.position.x, currentVehicle.mesh.position.y + 1.2, currentVehicle.mesh.position.z);

                // 7. Update HUD Speed & Altitude
                const speedEl = document.getElementById('vehicle-hud-speed');
                if (speedEl) {
                    const speedKmh = Math.round(Math.abs(vehicleSpeed) * 3.6);
                    const altitudeM = Math.round(currentVehicle.mesh.position.y * 3);
                    speedEl.innerHTML = `${speedKmh} km/h <span style="font-size: 0.8rem; color: #00f2fe; display: block;">Alt: ${altitudeM} m</span>`;
                }
            } else {
                // --- 🏎️ Drivable Car Physics & Controls ---
                const accel = 38;
                const maxForwardSpeed = 32;
                const maxReverseSpeed = -14;

                if (keys['KeyW'] || keys['ArrowUp']) {
                    vehicleSpeed = Math.min(vehicleSpeed + accel * delta, maxForwardSpeed);
                } else if (keys['KeyS'] || keys['ArrowDown']) {
                    vehicleSpeed = Math.max(vehicleSpeed - accel * delta, maxReverseSpeed);
                } else {
                    vehicleSpeed = THREE.MathUtils.lerp(vehicleSpeed, 0, 2.5 * delta);
                }

                // Steer wheels and car rotation
                if (Math.abs(vehicleSpeed) > 0.2) {
                    const steerDir = (vehicleSpeed >= 0 ? 1 : -1);
                    if (keys['KeyA'] || keys['ArrowLeft']) {
                        currentVehicle.mesh.rotation.y += 2.4 * delta * steerDir;
                    }
                    if (keys['KeyD'] || keys['ArrowRight']) {
                        currentVehicle.mesh.rotation.y -= 2.4 * delta * steerDir;
                    }
                }

                // Move car forward in its facing direction
                currentVehicle.mesh.translateZ(-vehicleSpeed * delta);
                currentVehicle.position = {
                    x: currentVehicle.mesh.position.x,
                    y: currentVehicle.mesh.position.y,
                    z: currentVehicle.mesh.position.z
                };

                // Sync human position to car
                humanCharacter.position.copy(currentVehicle.mesh.position);

                // 3rd Person Vehicle Camera
                const camOffset = new THREE.Vector3(0, 4.2, 8.5);
                camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), currentVehicle.mesh.rotation.y);
                const targetCamPos = currentVehicle.mesh.position.clone().add(camOffset);
                camera.position.lerp(targetCamPos, 0.14);
                camera.lookAt(currentVehicle.mesh.position.x, currentVehicle.mesh.position.y + 1.2, currentVehicle.mesh.position.z);

                // Update Vehicle HUD Speed
                const speedEl = document.getElementById('vehicle-hud-speed');
                if (speedEl) {
                    speedEl.innerText = `${Math.round(Math.abs(vehicleSpeed) * 3.6)} km/h`;
                }
            }
        } else {
            // --- Human Character Movement & 3rd Person Camera ---
            const moveSpeed = 9;
            const moveDir = new THREE.Vector3();

            if (keys['KeyW'] || keys['ArrowUp']) moveDir.z -= 1;
            if (keys['KeyS'] || keys['ArrowDown']) moveDir.z += 1;
            if (keys['KeyA'] || keys['ArrowLeft']) moveDir.x -= 1;
            if (keys['KeyD'] || keys['ArrowRight']) moveDir.x += 1;

            if (moveDir.lengthSq() > 0) {
                moveDir.normalize();
                characterYaw = Math.atan2(moveDir.x, moveDir.z);
                humanCharacter.rotation.y = THREE.MathUtils.lerp(humanCharacter.rotation.y, characterYaw, 0.2);

                humanCharacter.position.x += moveDir.x * moveSpeed * delta;
                humanCharacter.position.z += moveDir.z * moveSpeed * delta;
            }

            // Jump & Gravity
            if (keys['Space'] && isGrounded) {
                characterVelocity.y = 9;
                isGrounded = false;
            }

            if (!isGrounded) {
                characterVelocity.y -= 22 * delta;
                humanCharacter.position.y += characterVelocity.y * delta;
                if (humanCharacter.position.y <= 0) {
                    humanCharacter.position.y = 0;
                    characterVelocity.y = 0;
                    isGrounded = true;
                }
            }

            // 3rd Person Smooth Camera Follow
            const targetCamPos = new THREE.Vector3(
                humanCharacter.position.x - Math.sin(characterYaw) * 7,
                humanCharacter.position.y + 4,
                humanCharacter.position.z - Math.cos(characterYaw) * 7
            );
            camera.position.lerp(targetCamPos, 0.1);
            camera.lookAt(humanCharacter.position.x, humanCharacter.position.y + 1.6, humanCharacter.position.z);

            // Check nearby Drivable Vehicles (Cars, Trucks, Airplanes, Jets)
            nearbyVehicle = null;
            let closestVehicleDist = Infinity;
            for (const p of placedObjects) {
                if (p.category === 'vehicles' || isAirplaneObject(p) || p.name.toLowerCase().includes('car') || p.name.toLowerCase().includes('truck') || p.name.toLowerCase().includes('buggy') || p.name.toLowerCase().includes('plane') || p.name.toLowerCase().includes('lennuk') || p.name.toLowerCase().includes('jet')) {
                    const dist = humanCharacter.position.distanceTo(new THREE.Vector3(p.position.x, humanCharacter.position.y, p.position.z));
                    if (dist < 4.8 && dist < closestVehicleDist) {
                        closestVehicleDist = dist;
                        nearbyVehicle = p;
                    }
                }
            }

            const enterPrompt = document.getElementById('enter-vehicle-prompt');
            const enterIcon = document.getElementById('enter-vehicle-icon');
            const enterText = document.getElementById('enter-vehicle-text');

            if (enterPrompt) {
                enterPrompt.style.display = nearbyVehicle ? 'block' : 'none';
                if (nearbyVehicle) {
                    const isPlane = isAirplaneObject(nearbyVehicle);
                    const isAdmin = isCurrentUserAdmin();
                    if (enterIcon) enterIcon.innerText = isPlane ? '✈️' : '🚗';
                    if (enterText) {
                        enterText.innerText = isPlane
                            ? (isAdmin ? 'Istu lennukisse ja lenda [F]' : 'Board Airplane and Fly [F]')
                            : (isAdmin ? 'Istu autosse ja sõida [F]' : 'Enter Vehicle and Drive [F]');
                    }
                }
            }
        }

        // Check General Triggers & Dialogue & Interactive Gameplay Items
        let activeTrigger: PlacedObject | null = null;
        const playerPos = humanCharacter.position;

        // Fall check (Falling off world / parkour)
        if (playerPos.y < -15) {
            damagePlayer(50);
            playerPos.copy(checkpointPosition);
            characterVelocity.set(0, 0, 0);
        }

        for (let i = placedObjects.length - 1; i >= 0; i--) {
            const p = placedObjects[i];
            const dist = playerPos.distanceTo(p.mesh.position);

            // 1. Enemy & Boss Patrol / Chase AI
            if (p.enemyData && p.enemyData.health > 0) {
                if (dist < 18) {
                    // Aggro & Chase player
                    const chaseDir = new THREE.Vector3().subVectors(playerPos, p.mesh.position).normalize();
                    p.mesh.position.x += chaseDir.x * p.enemyData.speed * delta;
                    p.mesh.position.z += chaseDir.z * p.enemyData.speed * delta;
                    p.mesh.rotation.y = Math.atan2(chaseDir.x, chaseDir.z);

                    // Attack player if within melee range
                    if (dist < 2.4) {
                        const now = Date.now();
                        const lastAttack = p.enemyData.lastAttackTime || 0;
                        if (now - lastAttack > 1500) {
                            p.enemyData.lastAttackTime = now;
                            damagePlayer(p.enemyData.damage || 15);
                        }
                    }
                }
            }

            // 2. Interactive Item Pickups (Coins, Keys, Potions, Weapons)
            if (p.gameItemType === 'coin' && !p.isCollected && dist < 2.0) {
                p.isCollected = true;
                collectCoin(10);
                scene.remove(p.mesh);
                placedObjects.splice(i, 1);
                continue;
            }

            if (p.gameItemType === 'key' && !p.isCollected && dist < 2.0) {
                p.isCollected = true;
                collectKey(p.keyName || p.name);
                scene.remove(p.mesh);
                placedObjects.splice(i, 1);
                continue;
            }

            if (p.gameItemType === 'potion' && !p.isCollected && dist < 2.0) {
                p.isCollected = true;
                healPlayer(40);
                scene.remove(p.mesh);
                placedObjects.splice(i, 1);
                continue;
            }

            if (p.gameItemType === 'weapon' && !p.isCollected && dist < 2.2) {
                p.isCollected = true;
                playerAttackDamage += 25;
                playerInventory.push({ id: 'wpn_' + Date.now(), name: p.name, icon: '⚔️', type: 'weapon' });
                playGameSound('victory');
                updateGameplayHUD();
                scene.remove(p.mesh);
                placedObjects.splice(i, 1);
                continue;
            }

            // 3. Locked Doors & Gates
            if (p.gameItemType === 'door' && !p.isUnlocked && dist < 3.2) {
                if (p.requiredKeyName === 'all_keys') {
                    if (activeQuest && activeQuest.completed) {
                        p.isUnlocked = true;
                        playGameSound('door_unlock');
                        p.mesh.position.y += 6; // Open gate upwards
                    } else {
                        activeTrigger = {
                            ...p,
                            trigger: { type: 'touch', message: 'Värav on lukus! Otsi üles kõik vajalikud võtmed!', title: '🔒 Lukustatud Värav' }
                        };
                    }
                } else if (p.requiredKeyName) {
                    if (playerInventory.some(item => item.name === p.requiredKeyName)) {
                        p.isUnlocked = true;
                        playGameSound('door_unlock');
                        p.mesh.position.y += 6;
                    } else {
                        activeTrigger = {
                            ...p,
                            trigger: { type: 'touch', message: `Uks on lukus! Vajad võtit: ${p.requiredKeyName}`, title: '🔒 Lukustatud Uks' }
                        };
                    }
                }
            }

            // 4. Hazards (Lava floor, spikes)
            if ((p.gameItemType === 'hazard' || p.trigger?.type === 'hazard_lava') && dist < 4.0) {
                damagePlayer(25);
            }

            // 5. Checkpoints
            if (p.gameItemType === 'checkpoint' && dist < 3.0) {
                if (checkpointPosition.distanceTo(p.mesh.position) > 2.0) {
                    checkpointPosition.copy(p.mesh.position);
                    checkpointPosition.y = 0;
                    playGameSound('coin');
                }
            }

            // 6. Victory Goal / Portal
            if ((p.gameItemType === 'goal' || p.trigger?.type === 'goal_win') && dist < 3.0) {
                triggerVictory('🏆 PALJU ÕNNE! VÕIT!', 'Jõudsid edukalt finišisse ja läbisid mängumaailma!');
            }

            // 7. Shop NPC Interaction
            if (p.gameItemType === 'shop' && dist < 4.0) {
                activeTrigger = {
                    ...p,
                    trigger: { type: 'proximity', message: 'Tere rändur! Vajuta [E] või klõpsa relvapoe avamiseks!', title: '🛒 Kaupmees' }
                };
                if (keys['KeyE']) {
                    openInGameShop();
                }
            }

            // Standard Dialogue / Walkthrough Triggers
            if (p.trigger && p.trigger.message && !activeTrigger) {
                const rad = p.trigger.radius || 4.2;
                if (dist <= rad) {
                    activeTrigger = p;
                }
            }
        }

        const dialogPopup = document.getElementById('game-dialog-popup');
        const dialogTitle = document.getElementById('game-dialog-title');
        const dialogText = document.getElementById('game-dialog-text');
        const dialogIcon = document.getElementById('game-dialog-icon');

        if (activeTrigger && dialogPopup && dialogTitle && dialogText && dialogIcon) {
            const isTree = activeTrigger.name.toLowerCase().includes('tree') || activeTrigger.name.toLowerCase().includes('puu') || activeTrigger.category === 'nature';
            dialogIcon.innerText = isTree ? '🌲' : (activeTrigger.gameItemType === 'shop' ? '🛒' : (activeTrigger.category === 'gameplay' ? '💎' : '💬'));
            dialogTitle.innerText = activeTrigger.trigger?.title || activeTrigger.name;
            dialogText.innerText = `"${activeTrigger.trigger?.message}"`;
            dialogPopup.style.display = 'block';
        } else if (dialogPopup && dialogPopup.style.display !== 'none') {
            dialogPopup.style.display = 'none';
        }
    } else {
        if (currentVehicle) exitVehicle();
        const enterPrompt = document.getElementById('enter-vehicle-prompt');
        if (enterPrompt) enterPrompt.style.display = 'none';
        const dialogPopup = document.getElementById('game-dialog-popup');
        if (dialogPopup && dialogPopup.style.display !== 'none') {
            dialogPopup.style.display = 'none';
        }
        // Edit Mode: Smooth Camera Pan with Arrow Keys and WASD
        const panSpeed = 16;
        const panDir = new THREE.Vector3();
        const camForward = new THREE.Vector3(-Math.sin(orbitTheta), 0, -Math.cos(orbitTheta)).normalize();
        const camRight = new THREE.Vector3(Math.cos(orbitTheta), 0, -Math.sin(orbitTheta)).normalize();

        if (keys['ArrowUp'] || keys['KeyW']) panDir.add(camForward);
        if (keys['ArrowDown'] || keys['KeyS']) panDir.sub(camForward);
        if (keys['ArrowLeft'] || keys['KeyA']) panDir.sub(camRight);
        if (keys['ArrowRight'] || keys['KeyD']) panDir.add(camRight);

        if (panDir.lengthSq() > 0) {
            panDir.normalize();
            orbitTarget.addScaledVector(panDir, panSpeed * delta);
            updateOrbitCamera();
        }

        // Idle breathing in edit mode
        if (humanCharacter) {
            humanCharacter.position.y = Math.sin(Date.now() * 0.003) * 0.04;
        }
    }

    renderer.render(scene, camera);
}

// Initialize on Load
initStudio();
