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
}

let placedObjects: PlacedObject[] = [];
let selectedObject: PlacedObject | null = null;

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

// --- 5000+ Object Catalog Engine ---
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

function generate5000ObjectCatalog() {
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
            name: 'City',
            icon: '🏙️',
            types: ['Skyscraper', 'Modern House', 'Apartment Tower', 'Asphalt Road', 'Intersection', 'Overpass Bridge', 'Street Light', 'Highway Sign', 'Guardrail', 'Brick Wall'],
            colors: ['#34495e', '#2c3e50', '#7f8c8d', '#bdc3c7', '#3498db', '#f39c12', '#e74c3c', '#95a5a6']
        },
        {
            id: 'vehicles',
            name: 'Vehicles',
            icon: '🚗',
            types: ['Supercar', 'Muscle Car', 'Cyber Truck', 'Offroad Buggy', 'Fighter Jet', 'Prop Plane', 'Rescue Helicopter', 'Speedboat', 'Hoverboard', 'Spaceship'],
            colors: ['#e74c3c', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#1abc9c', '#2c3e50', '#ecf0f1']
        },
        {
            id: 'gameplay',
            name: 'Gameplay',
            icon: '🎮',
            types: ['Yard Coin Ring', 'Checkpoint Arch', 'Finish Line Gate', 'Speed Booster Pad', 'Super Jump Pad', 'Spinning Blade', 'Spike Block', 'Laser Gate', 'Teleport Portal', 'Target Bullseye'],
            colors: ['#ffd32a', '#00f2fe', '#2ecc71', '#e74c3c', '#9b59b6', '#ff9f1a', '#4facfe', '#ff4757']
        },
        {
            id: 'scifi',
            name: 'Sci-Fi',
            icon: '🚀',
            types: ['Cyber Power Tower', 'Quantum Core', 'Neon Pillar', 'Cargo Container', 'Fuel Plasma Tank', 'Alien Obelisk', 'Hologram Beacon', 'Solar Panel Array', 'Orbital Relic', 'Gravity Station'],
            colors: ['#00f2fe', '#9b59b6', '#ff007f', '#00ffcc', '#242f3d', '#34495e', '#f39c12', '#8e44ad']
        }
    ];

    let count = 0;
    categories.forEach(cat => {
        cat.types.forEach((type, typeIdx) => {
            for (let v = 1; v <= 100; v++) {
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
        } else {
            // Road / Prop
            const road = new THREE.Mesh(new THREE.BoxGeometry(5, 0.15, 5), material);
            road.position.y = 0.08;
            group.add(road);
        }
    } else if (item.category === 'vehicles') {
        // Car / Jet / Vehicle Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 4), material);
        body.position.y = 0.6;
        group.add(body);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 2), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        cabin.position.set(0, 1.2, -0.2);
        group.add(cabin);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

        [-1, 1].forEach(x => {
            [-1.3, 1.3].forEach(z => {
                const w = new THREE.Mesh(wheelGeo, wheelMat);
                w.position.set(x * 1.05, 0.35, z);
                group.add(w);
            });
        });
    } else if (item.category === 'gameplay') {
        if (item.geometryType.includes('coin') || item.geometryType.includes('ring')) {
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
function initStudio() {
    const container = document.getElementById('canvas-container')!;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.2);
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

    // Generate 5000 Objects in Catalog
    generate5000ObjectCatalog();
    renderCatalogUI();

    // Event Listeners
    setupStudioEvents();
    setupCatalogEvents();
    setupInspectorEvents();

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

// --- Event Handlers ---
function setupStudioEvents() {
    window.addEventListener('keydown', e => {
        keys[e.code] = true;

        if (!isPlayTestMode && selectedObject) {
            // R Key: Rotate 45 degrees
            if (e.code === 'KeyR' || e.key.toLowerCase() === 'r') {
                e.preventDefault();
                rotateSelectedObject(Math.PI / 4);
                return;
            }
        }
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
                playTestBtn.innerHTML = '<span>⏹️</span> <span>Exit Play Test</span>';
                playTestBtn.style.background = '#e74c3c';
                if (playTestHud) playTestHud.style.display = 'block';
                if (playTestControls) playTestControls.style.display = 'flex';
                if (studioCamControls) studioCamControls.style.display = 'none';
                if (catalogPanel) catalogPanel.style.display = 'none';
                if (inspectorPanel) inspectorPanel.style.display = 'none';
            } else {
                playTestBtn.innerHTML = '<span>▶️</span> <span>Play Test Mode</span>';
                playTestBtn.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
                if (playTestHud) playTestHud.style.display = 'none';
                if (playTestControls) playTestControls.style.display = 'none';
                if (studioCamControls) studioCamControls.style.display = 'flex';
                if (catalogPanel) catalogPanel.style.display = 'flex';
                if (inspectorPanel) inspectorPanel.style.display = 'block';
                updateOrbitCamera();
            }
        });
    }

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
            }
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (selectedObject) {
                scene.remove(selectedObject.mesh);
                placedObjects = placedObjects.filter(p => p.id !== selectedObject!.id);
                selectObject(null);
            }
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
}

// --- Main Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    if (isPlayTestMode) {
        // Human Character Movement & 3rd Person Camera
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
    } else {
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
