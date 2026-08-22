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
    portalTargetId?: string;
    portalTargetTitle?: string;
    trigger?: {
        type: 'touch' | 'proximity' | 'portal';
        message?: string;
        title?: string;
        radius?: number;
        targetWorldId?: string;
        targetWorldTitle?: string;
    };
}

let placedObjects: PlacedObject[] = [];
let selectedObject: PlacedObject | null = null;
let isTeleporting = false;

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

    // Populate Portal Target dropdown with user's saved games
    const portalSelect = document.getElementById('obj-portal-target') as HTMLSelectElement | null;
    const portalTargetInfo = document.getElementById('portal-target-info');
    if (portalSelect) {
        const profile = getCurrentUserProfile();
        const savedGames = yardService.getUserSavedGames(profile?.username ?? null);

        portalSelect.innerHTML = `<option value="">-- Select Target World --</option>` +
            savedGames.map((g: any) => `<option value="${g.id}">🎮 ${g.title}</option>`).join('');

        const currentTargetId = placed.portalTargetId || placed.trigger?.targetWorldId || '';
        portalSelect.value = currentTargetId;

        if (portalTargetInfo) {
            if (currentTargetId) {
                const targetGame = savedGames.find((g: any) => g.id === currentTargetId);
                portalTargetInfo.style.display = 'block';
                portalTargetInfo.innerText = `👉 Viib maailma: "${targetGame?.title || currentTargetId}"`;
            } else {
                portalTargetInfo.style.display = 'none';
            }
        }
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

    const vehicleHud = document.getElementById('vehicle-hud');
    const vehicleHudName = document.getElementById('vehicle-hud-name');
    if (vehicleHud) vehicleHud.style.display = 'block';
    if (vehicleHudName) vehicleHudName.innerText = `🏎️ ${vehicle.name}`;
}

export function exitVehicle() {
    if (!currentVehicle) return;
    const exitPos = currentVehicle.mesh.position.clone().add(new THREE.Vector3(2.2, 0, 0));
    humanCharacter.position.copy(exitPos);
    humanCharacter.visible = true;
    currentVehicle = null;
    vehicleSpeed = 0;

    const vehicleHud = document.getElementById('vehicle-hud');
    if (vehicleHud) vehicleHud.style.display = 'none';
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
        // If user is typing in input fields, ignore creator hotkeys
        const activeTag = (document.activeElement?.tagName || '').toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
            return;
        }

        keys[e.code] = true;

        if (isPlayTestMode) {
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

    const portalSelect = document.getElementById('obj-portal-target') as HTMLSelectElement | null;
    const portalTargetInfo = document.getElementById('portal-target-info');
    if (portalSelect) {
        portalSelect.addEventListener('change', () => {
            if (selectedObject) {
                const targetId = portalSelect.value;
                const profile = getCurrentUserProfile();
                const savedGames = yardService.getUserSavedGames(profile?.username ?? null);
                const targetGame = savedGames.find((g: any) => g.id === targetId);

                if (targetId && targetGame) {
                    selectedObject.portalTargetId = targetId;
                    selectedObject.portalTargetTitle = targetGame.title;
                    selectedObject.trigger = {
                        type: 'portal',
                        targetWorldId: targetId,
                        targetWorldTitle: targetGame.title,
                        message: `🌀 Teleporteerumine maailma "${targetGame.title}"...`,
                        title: '🌀 Dimensiooni Portaal',
                        radius: 3.8
                    };
                    if (portalTargetInfo) {
                        portalTargetInfo.style.display = 'block';
                        portalTargetInfo.innerText = `👉 Viib maailma: "${targetGame.title}"`;
                    }
                } else {
                    delete selectedObject.portalTargetId;
                    delete selectedObject.portalTargetTitle;
                    if (selectedObject.trigger?.type === 'portal') {
                        delete selectedObject.trigger;
                    }
                    if (portalTargetInfo) {
                        portalTargetInfo.style.display = 'none';
                    }
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
export function setupAiAssistantEvents() {
    const aiModal = document.getElementById('ai-assistant-modal');
    const toggleBtn = document.getElementById('btn-toggle-ai');
    const closeBtn = document.getElementById('btn-close-ai');
    const submitBtn = document.getElementById('btn-ai-submit');
    const inputField = document.getElementById('ai-prompt-input') as HTMLInputElement | null;
    const quickBtns = document.querySelectorAll('.ai-quick-btn');

    if (toggleBtn && aiModal) {
        toggleBtn.addEventListener('click', () => {
            const isShown = aiModal.style.display === 'flex';
            aiModal.style.display = isShown ? 'none' : 'flex';
            if (!isShown && inputField) {
                inputField.focus();
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

    quickBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const promptText = (e.currentTarget as HTMLElement).getAttribute('data-prompt') || '';
            if (promptText) {
                if (aiModal) aiModal.style.display = 'flex';
                executeAiBuild(promptText);
            }
        });
    });
}

export function executeAiBuild(promptText: string) {
    const chatLog = document.getElementById('ai-chat-log');
    const titleInput = document.getElementById('game-title-input') as HTMLInputElement | null;
    const catSelect = document.getElementById('game-category-select') as HTMLSelectElement | null;
    const descInput = document.getElementById('game-desc-input') as HTMLInputElement | null;

    // Append User message to chat
    if (chatLog) {
        const userMsg = document.createElement('div');
        userMsg.style.cssText = 'background: rgba(168, 85, 247, 0.2); border-radius: 8px; padding: 8px 12px; color: #fff; align-self: flex-end; max-width: 85%; font-weight: 600;';
        userMsg.innerText = `👤 ${promptText}`;
        chatLog.appendChild(userMsg);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    const p = promptText.toLowerCase();
    let generatedObjectsCount = 0;
    let aiResponse = '';

    // 0. SCRIPTING / LOGIC / TRIGGERS (e.g. "kui ma kõnnin puu seest läbi tuleb ette tekst...")
    const isScriptingPrompt = (
        (p.includes('läbi') || p.includes('labi') || p.includes('kõnnin') || p.includes('konnin') || p.includes('puudut') || p.includes('astun') || p.includes('touch') || p.includes('walk') || p.includes('trigger') || p.includes('seest')) &&
        (p.includes('tekst') || p.includes('kiri') || p.includes('teade') || p.includes('dialog') || p.includes('message') || p.includes('sõnum') || p.includes('sonum') || p.includes('ütle') || p.includes('utle') || p.includes('kekst'))
    ) || p.includes('program') || p.includes('kui ma panen') || p.includes('kui ma lähen') || p.includes('kui ma lahen');

    if (isScriptingPrompt) {
        // Extract message from quotes or prompt
        let msg = '';
        const quoteMatch = promptText.match(/["'„”«»](.*?)["'„”«»]/);
        if (quoteMatch && quoteMatch[1]) {
            msg = quoteMatch[1].trim();
        } else {
            const textMatch = promptText.match(/(?:tekst|kiri|teade|sõnum|sonum|message|dialog|ütleb|utleb|kekst)\s+(.+)$/i);
            if (textMatch && textMatch[1]) {
                msg = textMatch[1].replace(/^[.,:!\s]+/, '').trim();
            }
        }
        if (!msg) {
            msg = '🌲 Leidsid iidse puu saladuse! Oled edukalt mängu läbinud!';
        }

        // Determine object target: tree or selected object or new object
        let targetName = '🌲 Iidne Puu';
        let targetObj = placedObjects.find(obj => obj.name.toLowerCase().includes('tree') || obj.name.toLowerCase().includes('puu') || obj.category === 'nature');

        if (!targetObj) {
            // Create a tree in front of the player
            const natureItems = CATALOG_DATABASE.filter(c => c.category === 'nature' || c.name.toLowerCase().includes('tree') || c.name.toLowerCase().includes('wood'));
            const treeItem = natureItems[0] || CATALOG_DATABASE[0];
            const mesh = createObjectMesh(treeItem);
            mesh.position.set(0, 0, -4.5);
            mesh.scale.setScalar(treeItem.baseScale * 1.5);
            scene.add(mesh);

            targetObj = {
                id: 'placed_ai_tree_' + Date.now(),
                mesh,
                catalogId: treeItem.id,
                name: '🌲 Suur Võlupuu',
                category: 'nature',
                position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z },
                color: treeItem.color,
                trigger: {
                    type: 'touch',
                    message: msg,
                    title: '🌲 Suur Võlupuu',
                    radius: 5.0
                }
            };
            placedObjects.push(targetObj);
            generatedObjectsCount++;
        } else {
            targetObj.trigger = {
                type: 'touch',
                message: msg,
                title: targetObj.name,
                radius: 5.0
            };
            targetName = targetObj.name;
        }

        selectObject(targetObj);
        aiResponse = `🤖 <strong>Game logic programmed!</strong><br>Added a trigger to <strong>${targetName}</strong>.<br>👉 When a player walks near it, this text will appear:<br><em style="color: #ffd32a; font-size: 1.05rem;">"${msg}"</em><br><br>💡 Click <strong>▶️ Play Test Mode</strong> above and walk near it to test!`;

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

        aiResponse = `🏃 I created a 9-stage parkour course with rising platforms! Test it now using arrows and spacebar (Jump)!`;

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

        aiResponse = `🌲 Planted ${generatedObjectsCount} trees, stumps, and rocks! The natural forest world is ready.`;

    // 3. AUTOTEED & SÕIDETAVAD AUTOD (ROADS & DRIVABLE CARS)
    } else if (p.includes('autotee') || p.includes('autoteed') || (p.includes('tee') && !p.includes('teade')) || (p.includes('road') && !p.includes('broad')) || p.includes('sõit') || p.includes('soit') || p.includes('drive')) {
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
                name: `🛣️ Autotee Lõik #${i + 1}`,
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
            name: '🏎️ Sõidetav Supercar',
            category: 'vehicles',
            position: { x: meshCar1.position.x, y: meshCar1.position.y, z: meshCar1.position.z },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#e74c3c'
        });
        generatedObjectsCount++;

        aiResponse = `🏎️ <strong>I created an asphalt road and a drivable Supercar!</strong><br>Click <strong>▶️ Play Test Mode</strong> above and approach the car <strong>[F]</strong> to start driving!`;

    // 4. SMART CONTEXTUAL ADDITIONS & OBJECT DECORATOR (Lisa asjadele ise asju juurde)
    } else if (p.includes('juurde') || p.includes('kaunista') || p.includes('detail') || p.includes('lisa autole') || p.includes('lisa puule') || p.includes('lisa majale')) {
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
                name: '🛣️ Asfalttee',
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
                    name: '💡 Tänavalamp',
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
                name: '⛽ Kütusetankur',
                category: 'city',
                position: { x: meshFuel.position.x, y: 0, z: meshFuel.position.z },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 },
                color: '#f39c12'
            });
            generatedObjectsCount++;

            aiResponse = `🚗 <strong>Added details to the car!</strong><br>During construction, I added an asphalt road, 2 street lights, and a fuel pump!`;

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

            aiResponse = `🌲 <strong>Added details to the tree and nature!</strong><br>I placed mossy rocks, boulders, and blooming flower bushes around the tree!`;

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

            aiResponse = `✨ <strong>Added items and details to the object!</strong><br>I placed 4 fitting decorations and elements nearby.`;
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

        aiResponse = `🛸 I created a futuristic space base with alien crystals and structures!`;

    // 6. DEFAULT / GENERAL SMART GENERATION
    } else {
        const matches = CATALOG_DATABASE.filter(c => p.includes(c.name.toLowerCase()) || p.includes(c.category));
        const pool = matches.length > 0 ? matches : CATALOG_DATABASE;

        for (let i = 0; i < 6; i++) {
            const item = pool[Math.floor(Math.random() * pool.length)];
            const mesh = createObjectMesh(item);
            mesh.position.set((Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 20);
            mesh.scale.setScalar(item.baseScale);
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

        aiResponse = `✨ I analyzed your request and added ${generatedObjectsCount} fitting 3D objects to the scene!`;
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

    if (isPlayTestMode) {
        if (currentVehicle) {
            // --- Drivable Car Physics & Controls ---
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

            // Check nearby Drivable Vehicles
            nearbyVehicle = null;
            for (const p of placedObjects) {
                if (p.category === 'vehicles' || p.name.toLowerCase().includes('car') || p.name.toLowerCase().includes('truck') || p.name.toLowerCase().includes('buggy')) {
                    const dist = humanCharacter.position.distanceTo(new THREE.Vector3(p.position.x, humanCharacter.position.y, p.position.z));
                    if (dist < 4.2) {
                        nearbyVehicle = p;
                        break;
                    }
                }
            }

            const enterPrompt = document.getElementById('enter-vehicle-prompt');
            if (enterPrompt) {
                enterPrompt.style.display = nearbyVehicle ? 'block' : 'none';
            }
        }

        // Check General Triggers & Dialogue (e.g. Walking through tree / proximity)
        let activeTrigger: PlacedObject | null = null;
        for (const p of placedObjects) {
            if (p.trigger && p.trigger.message) {
                const dist = humanCharacter.position.distanceTo(new THREE.Vector3(p.position.x, humanCharacter.position.y, p.position.z));
                const rad = p.trigger.radius || 4.2;
                if (dist <= rad) {
                    activeTrigger = p;
                    break;
                }
            }
        }

        const dialogPopup = document.getElementById('game-dialog-popup');
        const dialogTitle = document.getElementById('game-dialog-title');
        const dialogText = document.getElementById('game-dialog-text');
        const dialogIcon = document.getElementById('game-dialog-icon');

        if (activeTrigger && dialogPopup && dialogTitle && dialogText && dialogIcon) {
            const isTree = activeTrigger.name.toLowerCase().includes('tree') || activeTrigger.name.toLowerCase().includes('puu') || activeTrigger.category === 'nature';
            dialogIcon.innerText = isTree ? '🌲' : (activeTrigger.category === 'gameplay' ? '💎' : '💬');
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
