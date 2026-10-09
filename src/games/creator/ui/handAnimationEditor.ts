import * as THREE from 'three';
import { PlacedObject, GripOffset, CatalogItem, HoldableRole, WeaponConfig } from '../types';
import { autoSaveDraft } from './creatorUI';
import { isPlayTestMode } from '../state/creatorState';
import { equipCustomItemInHand } from '../systems/physics';
import { createCustomModel3DMesh, createObjectMesh } from '../models/objectModels';
import { CATALOG_DATABASE } from '../catalog/creatorCatalog';

let isEditorOpen = false;
let currentTargetObject: PlacedObject | null = null;
let animFrameId: number | null = null;

// Three.js instances for the hand animation editor
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;

let armGroup: THREE.Group | null = null;
let handSocket: THREE.Group | null = null;
let itemHolder: THREE.Group | null = null;
let clonedItemMesh: THREE.Object3D | null = null;

// Weapon Role & Subsystems (Sword: second hand + reach line; Gun: bullet cylinder + green muzzle dot)
let currentRole: HoldableRole = 'item';
let currentDamage: number = 35;
let isBulletMode: boolean = false;
let activeEditTarget: 'item' | 'second_hand' | 'bullet' = 'item';

let leftArmGroup: THREE.Group | null = null;
let leftHandSocket: THREE.Group | null = null;
let reachLineMesh: THREE.Line | null = null;
let reachDistance: number = 1.8;

let muzzleMarkerGroup: THREE.Group | null = null;
let bulletHolder: THREE.Group | null = null;
let bulletMesh: THREE.Mesh | null = null;
let bulletOffset = { x: 0, y: 0, z: 0.35 };
let bulletRotation = { x: 0, y: 0, z: 0 };
let bulletScale = { x: 1, y: 1, z: 1 };

// Gizmo
let gizmoGroup: THREE.Group | null = null;
let activeTool: 'mover' | 'puller' | 'rotator' = 'mover';
let activeGizmoAxis: string | null = null;
let isDraggingGizmo = false;
let dragStartPointer = { x: 0, y: 0 };
let dragStartGripPos = { x: 0, y: 0, z: 0 };
let dragStartGripScale = { x: 1, y: 1, z: 1 };
let dragStartGripRot = { x: 0, y: 0, z: 0 };
let dragStartSecondHandPos = { x: 0, y: 0, z: 0 };
let dragStartBulletPos = { x: 0, y: 0, z: 0 };
let dragStartBulletScale = { x: 1, y: 1, z: 1 };
let dragStartBulletRot = { x: 0, y: 0, z: 0 };

// Orbit controls
let isOrbiting = false;
let orbitStartPointer = { x: 0, y: 0 };
let orbitTheta = Math.PI / 4;
let orbitPhi = Math.PI / 3;
let orbitRadius = 1.4;
const orbitTarget = new THREE.Vector3(0, 0, 0);

// Raycasting
const raycaster = new THREE.Raycaster();
const mouseVec = new THREE.Vector2();

/**
 * Builds the player arm visual representation (shoulder, bicep, elbow, forearm, hand)
 * matching the Playard avatar aesthetic.
 */
/**
 * Builds the player arm visual representation (shoulder, bicep, elbow, forearm, hand)
 * matching the Playard avatar aesthetic.
 */
function createIsolatedArm(side: 'right' | 'left' = 'right'): { arm: THREE.Group; socket: THREE.Group } {
    const arm = new THREE.Group();
    arm.name = side === 'right' ? 'EditorPlayerArm' : 'EditorPlayerArmLeft';

    // Materials
    const sleeveMat = new THREE.MeshStandardMaterial({
        color: side === 'right' ? 0x3b82f6 : 0x8b5cf6,
        roughness: 0.55,
        metalness: 0.1
    });
    const skinMat = new THREE.MeshStandardMaterial({
        color: 0xf5cd79,
        roughness: 0.45,
        metalness: 0.05
    });

    // Shoulder
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), sleeveMat);
    shoulder.position.set(0, 0, 0);
    arm.add(shoulder);

    // Bicep (upper arm)
    const bicep = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.45, 16), sleeveMat);
    bicep.position.set(0, -0.25, 0);
    arm.add(bicep);

    // Forearm
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.10, 0.42, 16), skinMat);
    forearm.position.set(0, -0.65, 0);
    arm.add(forearm);

    // Hand palm
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.16), skinMat);
    hand.position.set(0, -0.92, 0.02);
    arm.add(hand);

    // Thumb detail
    const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.09), skinMat);
    thumb.position.set(side === 'right' ? -0.09 : 0.09, -0.90, 0.05);
    thumb.rotation.z = side === 'right' ? 0.25 : -0.25;
    arm.add(thumb);

    // Fingers detail (stylized block knuckles)
    const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.06, 0.14), skinMat);
    fingers.position.set(0, -1.01, 0.03);
    arm.add(fingers);

    // Hand Socket at (0, -0.85, 0), exactly matching AvatarRig handSocket
    const socket = new THREE.Group();
    socket.name = side === 'right' ? 'Socket_HandR' : 'Socket_HandL';
    socket.position.set(0, -0.85, 0);
    arm.add(socket);

    if (side === 'right') {
        arm.position.set(0, 0.85, 0);
    } else {
        arm.position.set(-0.55, 0.85, 0.15);
    }

    return { arm, socket };
}

/**
 * Creates dynamic 3D line connecting the main hand/sword and the second hand.
 */
function createReachLine(): THREE.Line {
    const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-0.55, 0, 0.15)
    ]);
    const mat = new THREE.LineBasicMaterial({
        color: 0xa855f7,
        linewidth: 3,
        transparent: true,
        opacity: 0.85
    });
    const line = new THREE.Line(geo, mat);
    line.name = 'SwordReachLine';
    return line;
}

/**
 * Updates the reach line geometry and the HUD distance indicator.
 */
function updateReachLine() {
    if (!reachLineMesh || !handSocket || !leftHandSocket) return;
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    handSocket.getWorldPosition(p1);
    leftHandSocket.getWorldPosition(p2);

    const posAttr = reachLineMesh.geometry.attributes.position as THREE.BufferAttribute;
    posAttr.setXYZ(0, p1.x, p1.y, p1.z);
    posAttr.setXYZ(1, p2.x, p2.y, p2.z);
    posAttr.needsUpdate = true;

    const d = p1.distanceTo(p2);
    reachDistance = Math.max(1.0, Math.round(d * 3.5 * 10) / 10);
    const reachValEl = document.getElementById('hand-sword-reach-val');
    if (reachValEl) {
        reachValEl.textContent = reachDistance.toFixed(1);
    }
}

/**
 * Creates green muzzle point marker ("roheline junn") + directional arrow and the bullet cylinder.
 */
function createBulletAndMuzzle(): { muzzleGroup: THREE.Group; bulletHolder: THREE.Group; bulletMesh: THREE.Mesh } {
    const muzzleGroup = new THREE.Group();
    muzzleGroup.name = 'MuzzleMarkerGroup';

    // 1. "Roheline junn" (Green glowing sphere)
    const sphereGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
        color: 0x2ecc71,
        emissive: 0x27ae60,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.3
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.name = 'MuzzleGreenDot';
    muzzleGroup.add(sphere);

    // 2. Nool (Direction arrow pointing forward from muzzle)
    const arrowDir = new THREE.Vector3(0, 0, 1);
    const arrowOrigin = new THREE.Vector3(0, 0, 0);
    const arrowHelper = new THREE.ArrowHelper(arrowDir, arrowOrigin, 0.35, 0x00f2fe, 0.1, 0.05);
    arrowHelper.name = 'MuzzleArrowHelper';
    muzzleGroup.add(arrowHelper);

    // 3. Bullet Holder & Cylinder Mesh
    const bHolder = new THREE.Group();
    bHolder.name = 'BulletHolder';

    const cylGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.25, 16);
    // Align cylinder along Z forward axis
    cylGeo.rotateX(Math.PI / 2);

    const cylMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.6,
        metalness: 0.8,
        roughness: 0.25
    });
    const bMesh = new THREE.Mesh(cylGeo, cylMat);
    bMesh.name = 'BulletCylinderMesh';
    bMesh.castShadow = true;
    bHolder.add(bMesh);

    return { muzzleGroup, bulletHolder: bHolder, bulletMesh: bMesh };
}

/**
 * Creates 3D Gizmos for Mover and Puller
 */
function createEditorGizmos(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'EditorGizmoGroup';

    // 1. Mover handles (Arrows for X, Y, Z)
    const moverGroup = new THREE.Group();
    moverGroup.name = 'GizmoMover';

    const createArrow = (axis: 'x' | 'y' | 'z', color: number) => {
        const arrow = new THREE.Group();
        arrow.name = 'gizmo_move_' + axis;
        (arrow as any).userData = { tool: 'mover', axis };

        const shaftGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.35, 12);
        const headGeo = new THREE.ConeGeometry(0.045, 0.12, 16);
        const mat = new THREE.MeshBasicMaterial({
            color,
            depthTest: false,
            depthWrite: false,
            transparent: true,
            opacity: 0.95
        });

        const shaft = new THREE.Mesh(shaftGeo, mat);
        shaft.position.y = 0.175;
        shaft.renderOrder = 3000;
        (shaft as any).userData = { tool: 'mover', axis };

        const head = new THREE.Mesh(headGeo, mat);
        head.position.y = 0.35 + 0.06;
        head.renderOrder = 3000;
        (head as any).userData = { tool: 'mover', axis };

        // Invisible thick cylinder for reliable click/touch hit detection (transparent opacity 0 for raycaster)
        const pickGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.52, 12);
        const pickMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
        const pickMesh = new THREE.Mesh(pickGeo, pickMat);
        pickMesh.position.y = 0.26;
        (pickMesh as any).userData = { tool: 'mover', axis };

        arrow.add(shaft, head, pickMesh);

        if (axis === 'x') {
            arrow.rotation.z = -Math.PI / 2;
        } else if (axis === 'z') {
            arrow.rotation.x = Math.PI / 2;
        }
        moverGroup.add(arrow);
    };

    createArrow('x', 0xef4444); // Red X
    createArrow('y', 0x22c55e); // Green Y
    createArrow('z', 0x3b82f6); // Blue Z

    // 2. Puller handles (Scale boxes for X, Y, Z + Center uniform cube)
    const pullerGroup = new THREE.Group();
    pullerGroup.name = 'GizmoPuller';

    const createScaleHandle = (axis: 'x' | 'y' | 'z' | 'uniform', color: number, pos: THREE.Vector3) => {
        const size = axis === 'uniform' ? 0.065 : 0.055;
        const boxGeo = new THREE.BoxGeometry(size, size, size);
        const mat = new THREE.MeshBasicMaterial({
            color,
            depthTest: false,
            depthWrite: false,
            transparent: true,
            opacity: 0.95
        });
        const mesh = new THREE.Mesh(boxGeo, mat);
        mesh.renderOrder = 3000;
        mesh.name = 'gizmo_pull_' + axis;
        mesh.position.copy(pos);
        (mesh as any).userData = { tool: 'puller', axis };

        // Thick pick area
        const pickGeo = new THREE.BoxGeometry(size * 2.2, size * 2.2, size * 2.2);
        const pickMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
        const pickMesh = new THREE.Mesh(pickGeo, pickMat);
        (pickMesh as any).userData = { tool: 'puller', axis };
        mesh.add(pickMesh);

        pullerGroup.add(mesh);
    };

    createScaleHandle('x', 0xef4444, new THREE.Vector3(0.35, 0, 0));
    createScaleHandle('x', 0xef4444, new THREE.Vector3(-0.35, 0, 0));
    createScaleHandle('y', 0x22c55e, new THREE.Vector3(0, 0.35, 0));
    createScaleHandle('y', 0x22c55e, new THREE.Vector3(0, -0.35, 0));
    createScaleHandle('z', 0x3b82f6, new THREE.Vector3(0, 0, 0.35));
    createScaleHandle('z', 0x3b82f6, new THREE.Vector3(0, 0, -0.35));
    createScaleHandle('uniform', 0xf1c40f, new THREE.Vector3(0, 0, 0)); // Gold uniform center

    // 3. Rotator handles (3 distinct rings around the object: Red X, Green Y, Blue Z)
    const rotatorGroup = new THREE.Group();
    rotatorGroup.name = 'GizmoRotator';

    const createRotationRing = (axis: 'x' | 'y' | 'z', color: number) => {
        const ringGeo = new THREE.TorusGeometry(0.38, 0.016, 16, 64);
        const mat = new THREE.MeshBasicMaterial({
            color,
            depthTest: false,
            depthWrite: false,
            transparent: true,
            opacity: 0.95
        });
        const ringMesh = new THREE.Mesh(ringGeo, mat);
        ringMesh.renderOrder = 3000;
        ringMesh.name = 'gizmo_rot_' + axis;
        (ringMesh as any).userData = { tool: 'rotator', axis };

        // Thicker torus for easy clicking
        const pickGeo = new THREE.TorusGeometry(0.38, 0.07, 8, 36);
        const pickMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
        const pickMesh = new THREE.Mesh(pickGeo, pickMat);
        (pickMesh as any).userData = { tool: 'rotator', axis };
        ringMesh.add(pickMesh);

        if (axis === 'x') {
            ringMesh.rotation.y = Math.PI / 2; // Lies on YZ plane, rotates around X
        } else if (axis === 'y') {
            ringMesh.rotation.x = Math.PI / 2; // Lies on XZ plane, rotates around Y
        }
        // axis === 'z' lies on XY plane, rotates around Z

        rotatorGroup.add(ringMesh);
    };

    createRotationRing('x', 0xef4444); // Red X ring
    createRotationRing('y', 0x22c55e); // Green Y ring
    createRotationRing('z', 0x3b82f6); // Blue Z ring

    group.add(moverGroup);
    group.add(pullerGroup);
    group.add(rotatorGroup);

    return group;
}

/**
 * Updates UI controls for the active role (Item vs Sword vs Gun), damage, reach, and bullet mode.
 */
function updateRoleUI() {
    const btnItem = document.getElementById('btn-hand-role-item');
    const btnSword = document.getElementById('btn-hand-role-sword');
    const btnGun = document.getElementById('btn-hand-role-gun');
    const damageWrap = document.getElementById('hand-damage-wrap');
    const swordReachWrap = document.getElementById('hand-sword-reach-indicator');
    const swordTargetWrap = document.getElementById('hand-sword-target-wrap');
    const btnBullet = document.getElementById('btn-hand-configure-bullet');
    const bulletBadge = document.getElementById('hand-bullet-mode-badge');
    const bulletBtnLabel = document.getElementById('hand-bullet-btn-label');
    const damageInput = document.getElementById('hand-damage-input') as HTMLInputElement | null;

    [btnItem, btnSword, btnGun].forEach(b => {
        if (b) {
            b.style.background = 'rgba(255,255,255,0.08)';
            b.style.color = '#94a3b8';
            b.style.borderColor = 'rgba(255,255,255,0.15)';
        }
    });

    if (currentRole === 'item' && btnItem) {
        btnItem.style.background = 'linear-gradient(135deg, #00f2fe, #3b82f6)';
        btnItem.style.color = '#000';
    } else if (currentRole === 'sword' && btnSword) {
        btnSword.style.background = 'linear-gradient(135deg, #a855f7, #6366f1)';
        btnSword.style.color = '#fff';
    } else if (currentRole === 'gun' && btnGun) {
        btnGun.style.background = 'linear-gradient(135deg, #f59e0b, #ef4444)';
        btnGun.style.color = '#fff';
    }

    if (damageWrap) damageWrap.style.display = (currentRole === 'sword' || currentRole === 'gun') ? 'flex' : 'none';
    if (damageInput) damageInput.value = currentDamage.toString();

    if (swordReachWrap) swordReachWrap.style.display = currentRole === 'sword' ? 'flex' : 'none';
    if (swordTargetWrap) swordTargetWrap.style.display = currentRole === 'sword' ? 'flex' : 'none';

    if (btnBullet) {
        btnBullet.style.display = currentRole === 'gun' ? 'flex' : 'none';
        if (bulletBtnLabel) {
            bulletBtnLabel.textContent = isBulletMode ? '🔫 Säti püssi' : '🎯 Sea kuul';
        }
    }
    if (bulletBadge) {
        bulletBadge.style.display = (currentRole === 'gun' && isBulletMode) ? 'inline-block' : 'none';
    }

    const btnTargetSword = document.getElementById('btn-hand-target-sword');
    const btnTargetHand2 = document.getElementById('btn-hand-target-hand2');
    if (btnTargetSword && btnTargetHand2) {
        if (activeEditTarget === 'second_hand') {
            btnTargetHand2.style.background = 'linear-gradient(135deg, #a855f7, #6366f1)';
            btnTargetHand2.style.color = '#fff';
            btnTargetSword.style.background = 'rgba(255,255,255,0.08)';
            btnTargetSword.style.color = '#94a3b8';
        } else {
            btnTargetSword.style.background = 'linear-gradient(135deg, #a855f7, #6366f1)';
            btnTargetSword.style.color = '#fff';
            btnTargetHand2.style.background = 'rgba(255,255,255,0.08)';
            btnTargetHand2.style.color = '#94a3b8';
        }
    }
}

function switchRole(role: HoldableRole) {
    currentRole = role;
    isBulletMode = false;
    activeEditTarget = 'item';

    if (leftArmGroup) leftArmGroup.visible = (role === 'sword');
    if (reachLineMesh) reachLineMesh.visible = (role === 'sword');
    if (muzzleMarkerGroup) muzzleMarkerGroup.visible = (role === 'gun');
    if (bulletHolder) bulletHolder.visible = (role === 'gun');

    if (role === 'sword') {
        updateReachLine();
    }

    updateRoleUI();
    updateGizmoToolDisplay();
}

function switchSwordTarget(target: 'item' | 'second_hand') {
    activeEditTarget = target;
    if (target === 'second_hand') {
        activeTool = 'mover'; // second hand can ONLY be moved!
    }
    updateRoleUI();
    updateGizmoToolDisplay();
}

function toggleBulletMode() {
    isBulletMode = !isBulletMode;
    if (isBulletMode) {
        activeEditTarget = 'bullet';
    } else {
        activeEditTarget = 'item';
    }
    updateRoleUI();
    updateGizmoToolDisplay();
}

/**
 * Updates which gizmo (mover, puller, or rotator) is visible and resizes gizmos to match target size.
 */
function updateGizmoToolDisplay() {
    if (!gizmoGroup) return;
    const moverGroup = gizmoGroup.getObjectByName('GizmoMover');
    const pullerGroup = gizmoGroup.getObjectByName('GizmoPuller');
    const rotatorGroup = gizmoGroup.getObjectByName('GizmoRotator');

    const btnMover = document.getElementById('btn-hand-tool-mover');
    const btnPuller = document.getElementById('btn-hand-tool-puller');
    const btnRotator = document.getElementById('btn-hand-tool-rotator');

    // If second hand is active: ONLY mover is allowed ("mida saad ainult liikutada")
    if (activeEditTarget === 'second_hand') {
        activeTool = 'mover';
        if (btnPuller) {
            btnPuller.style.opacity = '0.35';
            btnPuller.style.pointerEvents = 'none';
        }
        if (btnRotator) {
            btnRotator.style.opacity = '0.35';
            btnRotator.style.pointerEvents = 'none';
        }
    } else {
        if (btnPuller) {
            btnPuller.style.opacity = '1';
            btnPuller.style.pointerEvents = 'auto';
        }
        if (btnRotator) {
            btnRotator.style.opacity = '1';
            btnRotator.style.pointerEvents = 'auto';
        }
    }

    // Determine which object we are currently editing
    let targetMesh: THREE.Object3D | null = itemHolder;
    if (activeEditTarget === 'second_hand') targetMesh = leftArmGroup;
    else if (activeEditTarget === 'bullet') targetMesh = bulletHolder;

    let maxDim = 0.35;
    if (targetMesh) {
        targetMesh.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(targetMesh);
        if (!box.isEmpty()) {
            const size = new THREE.Vector3();
            box.getSize(size);
            maxDim = Math.max(size.x, size.y, size.z, 0.15);
        }
    }

    if (moverGroup) {
        moverGroup.visible = activeTool === 'mover';
        if (moverGroup.visible) {
            const moverScale = Math.max(0.7, (maxDim / 2) * 1.6 / 0.35);
            moverGroup.scale.set(moverScale, moverScale, moverScale);
        }
    }
    if (pullerGroup) {
        pullerGroup.visible = activeTool === 'puller' && activeEditTarget !== 'second_hand';
        if (pullerGroup.visible) {
            const pullerScale = Math.max(0.7, (maxDim / 2) * 1.5 / 0.35);
            pullerGroup.scale.set(pullerScale, pullerScale, pullerScale);
        }
    }
    if (rotatorGroup) {
        rotatorGroup.visible = activeTool === 'rotator' && activeEditTarget !== 'second_hand';
        if (rotatorGroup.visible) {
            const targetRingRadius = (maxDim / 2) * 1.15;
            const ringScale = Math.max(0.3, targetRingRadius / 0.38);
            rotatorGroup.scale.set(ringScale, ringScale, ringScale);
        }
    }

    [btnMover, btnPuller, btnRotator].forEach(btn => {
        if (btn) {
            btn.style.background = 'rgba(255,255,255,0.08)';
            btn.style.color = '#94a3b8';
        }
    });

    if (activeTool === 'mover' && btnMover) {
        btnMover.style.background = 'linear-gradient(135deg, #00f2fe, #3b82f6)';
        btnMover.style.color = '#000';
    } else if (activeTool === 'puller' && btnPuller && activeEditTarget !== 'second_hand') {
        btnPuller.style.background = 'linear-gradient(135deg, #00f2fe, #3b82f6)';
        btnPuller.style.color = '#000';
    } else if (activeTool === 'rotator' && btnRotator && activeEditTarget !== 'second_hand') {
        btnRotator.style.background = 'linear-gradient(135deg, #00f2fe, #3b82f6)';
        btnRotator.style.color = '#000';
    }
}

/**
 * Positions camera on spherical orbit around target.
 */
function updateCameraTransform() {
    if (!camera) return;
    const x = orbitTarget.x + orbitRadius * Math.sin(orbitPhi) * Math.sin(orbitTheta);
    const y = orbitTarget.y + orbitRadius * Math.cos(orbitPhi);
    const z = orbitTarget.z + orbitRadius * Math.sin(orbitPhi) * Math.cos(orbitTheta);
    camera.position.set(x, y, z);
    camera.lookAt(orbitTarget);
}

/**
 * Creates or clones the item mesh to be displayed in the editor.
 */
function buildItemMeshForEditor(obj: PlacedObject): THREE.Object3D {
    let mesh: THREE.Object3D;
    if (obj.mesh) {
        const cloned = obj.mesh.clone(true);
        // Reset base local coordinates
        cloned.position.set(0, 0, 0);
        cloned.rotation.set(0, 0, 0);
        cloned.scale.set(1, 1, 1);
        mesh = cloned;
    } else if (obj.customModelData) {
        mesh = createCustomModel3DMesh(obj.customModelData, obj.color || '#00f2fe');
    } else {
        const catItem: CatalogItem = CATALOG_DATABASE.find(c => c.id === obj.catalogId) || {
            id: obj.catalogId || 'custom_item',
            name: obj.name,
            category: 'custom' as any,
            icon: '🗡️',
            color: obj.color || '#00f2fe',
            geometryType: 'box',
            baseScale: 1.0
        };
        mesh = createObjectMesh(catItem, obj.color || '#00f2fe');
    }

    // Ensure the mesh is geometrically centered inside itemHolder so rotating spins in-place
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    if (!box.isEmpty()) {
        const center = new THREE.Vector3();
        box.getCenter(center);
        mesh.position.sub(center);
    }
    return mesh;
}

/**
 * Initializes the Hand Animation Editor modal and its 3D preview.
 */
export function openHandAnimationEditor(obj: PlacedObject) {
    currentTargetObject = obj;
    isEditorOpen = true;

    const modal = document.getElementById('hand-animation-modal');
    const canvas = document.getElementById('hand-anim-canvas') as HTMLCanvasElement;
    const viewport = document.getElementById('hand-anim-viewport');
    const badge = document.getElementById('hand-anim-item-badge');

    if (!modal || !canvas || !viewport) {
        console.error('Hand animation editor modal elements missing!');
        return;
    }

    if (badge) {
        badge.textContent = obj.name || 'Ese';
    }

    modal.style.display = 'flex';

    const width = viewport.clientWidth || 800;
    const height = viewport.clientHeight || 550;

    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);

    // 2. Camera
    camera = new THREE.PerspectiveCamera(40, width / height, 0.05, 50);
    orbitTheta = 0.55;
    orbitPhi = 1.25;
    orbitRadius = 1.35;
    updateCameraTransform();

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    // 4. Lights
    const ambLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight1.position.set(3, 5, 4);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa855f7, 0.8);
    dirLight2.position.set(-3, -2, -2);
    scene.add(dirLight2);

    // Subtle grid/pedestal in background
    const grid = new THREE.GridHelper(2, 10, 0x3b82f6, 0x1e293b);
    grid.position.y = -0.6;
    scene.add(grid);

    // 5. Arm & Hand
    const armData = createIsolatedArm('right');
    armGroup = armData.arm;
    handSocket = armData.socket;
    scene.add(armGroup);

    // 6. Item Holder inside Hand Socket
    itemHolder = new THREE.Group();
    itemHolder.name = 'EditorItemHolder';
    handSocket.add(itemHolder);

    // 7. Cloned Item Mesh
    clonedItemMesh = buildItemMeshForEditor(obj);
    itemHolder.add(clonedItemMesh);

    // 8. Apply existing or default grip offset
    const existingGrip = obj.gripOffset || {
        position: { x: 0, y: -0.22, z: 0.15 },
        rotation: { x: 0.2, y: 0, z: 0 },
        scale: { x: 0.25, y: 0.25, z: 0.25 }
    };
    itemHolder.position.set(existingGrip.position.x, existingGrip.position.y, existingGrip.position.z);
    itemHolder.rotation.set(existingGrip.rotation.x, existingGrip.rotation.y, existingGrip.rotation.z);
    itemHolder.scale.set(existingGrip.scale.x, existingGrip.scale.y, existingGrip.scale.z);

    // 9. Second Hand (Left arm) & Reach Line for Swords
    const leftArmData = createIsolatedArm('left');
    leftArmGroup = leftArmData.arm;
    leftHandSocket = leftArmData.socket;
    if (obj.weaponConfig?.secondHandPosition) {
        leftArmGroup.position.set(
            obj.weaponConfig.secondHandPosition.x,
            obj.weaponConfig.secondHandPosition.y,
            obj.weaponConfig.secondHandPosition.z
        );
    } else {
        leftArmGroup.position.set(-0.55, 0.85, 0.15);
    }
    scene.add(leftArmGroup);

    reachLineMesh = createReachLine();
    scene.add(reachLineMesh);

    // 10. Muzzle Marker ("roheline junn" + nool) & Bullet Cylinder for Guns
    const bulletData = createBulletAndMuzzle();
    muzzleMarkerGroup = bulletData.muzzleGroup;
    bulletHolder = bulletData.bulletHolder;
    bulletMesh = bulletData.bulletMesh;

    if (obj.weaponConfig?.bulletOffset) {
        bulletHolder.position.set(
            obj.weaponConfig.bulletOffset.x,
            obj.weaponConfig.bulletOffset.y,
            obj.weaponConfig.bulletOffset.z
        );
        muzzleMarkerGroup.position.set(
            obj.weaponConfig.bulletOffset.x,
            obj.weaponConfig.bulletOffset.y,
            obj.weaponConfig.bulletOffset.z
        );
    } else {
        bulletHolder.position.set(0, 0, 0.45);
        muzzleMarkerGroup.position.set(0, 0, 0.45);
    }

    if (obj.weaponConfig?.bulletRotation) {
        bulletHolder.rotation.set(
            obj.weaponConfig.bulletRotation.x,
            obj.weaponConfig.bulletRotation.y,
            obj.weaponConfig.bulletRotation.z
        );
    }

    if (obj.weaponConfig?.bulletScale) {
        bulletHolder.scale.set(
            obj.weaponConfig.bulletScale.x,
            obj.weaponConfig.bulletScale.y,
            obj.weaponConfig.bulletScale.z
        );
    }

    itemHolder.add(muzzleMarkerGroup);
    itemHolder.add(bulletHolder);

    // 11. Load weapon role and damage
    currentRole = obj.holdableRole || obj.weaponConfig?.role || 'item';
    currentDamage = obj.weaponConfig?.damage ?? obj.damageAmount ?? 35;
    isBulletMode = false;
    activeEditTarget = 'item';

    // 12. Gizmo
    gizmoGroup = createEditorGizmos();
    scene.add(gizmoGroup);

    activeTool = 'mover';
    switchRole(currentRole);

    // 13. Attach listeners
    setupEditorEventListeners(canvas, viewport);

    // 14. Start animation loop
    const animate = () => {
        if (!isEditorOpen) return;
        animFrameId = requestAnimationFrame(animate);

        // Update gizmo transform to follow the active editing target
        let targetMesh: THREE.Object3D | null = itemHolder;
        if (activeEditTarget === 'second_hand') targetMesh = leftArmGroup;
        else if (activeEditTarget === 'bullet') targetMesh = bulletHolder;

        if (gizmoGroup && targetMesh) {
            const worldPos = new THREE.Vector3();
            targetMesh.getWorldPosition(worldPos);
            gizmoGroup.position.copy(worldPos);
        }

        if (currentRole === 'sword') {
            updateReachLine();
        }

        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    };
    animate();
}

/**
 * Event listeners for tools, rotation buttons, ready/cancel buttons, and viewport controls.
 */
function setupEditorEventListeners(canvas: HTMLCanvasElement, viewport: HTMLElement) {
    // Tool buttons
    const btnMover = document.getElementById('btn-hand-tool-mover');
    const btnPuller = document.getElementById('btn-hand-tool-puller');
    const btnRotator = document.getElementById('btn-hand-tool-rotator');

    btnMover?.addEventListener('click', () => {
        activeTool = 'mover';
        updateGizmoToolDisplay();
    });

    btnPuller?.addEventListener('click', () => {
        activeTool = 'puller';
        updateGizmoToolDisplay();
    });

    btnRotator?.addEventListener('click', () => {
        activeTool = 'rotator';
        updateGizmoToolDisplay();
    });

    // Role buttons (Asi vs Mõõk vs Püss)
    document.getElementById('btn-hand-role-item')?.addEventListener('click', () => switchRole('item'));
    document.getElementById('btn-hand-role-sword')?.addEventListener('click', () => switchRole('sword'));
    document.getElementById('btn-hand-role-gun')?.addEventListener('click', () => switchRole('gun'));

    // Damage input
    const dmgInput = document.getElementById('hand-damage-input') as HTMLInputElement | null;
    dmgInput?.addEventListener('input', () => {
        const val = parseInt(dmgInput.value, 10);
        if (!isNaN(val)) currentDamage = Math.max(1, Math.min(999, val));
    });

    // Sword target switchers (Mõõk vs Teine käsi)
    document.getElementById('btn-hand-target-sword')?.addEventListener('click', () => switchSwordTarget('item'));
    document.getElementById('btn-hand-target-hand2')?.addEventListener('click', () => switchSwordTarget('second_hand'));

    // Gun bullet mode button ("Sea kuul")
    document.getElementById('btn-hand-configure-bullet')?.addEventListener('click', () => toggleBulletMode());

    // Rotation shortcuts (applies to active edit target)
    document.getElementById('btn-hand-rot-x')?.addEventListener('click', () => {
        let t: THREE.Object3D | null = itemHolder;
        if (activeEditTarget === 'bullet') t = bulletHolder;
        if (t && activeEditTarget !== 'second_hand') t.rotation.x += Math.PI / 4;
    });

    document.getElementById('btn-hand-rot-y')?.addEventListener('click', () => {
        let t: THREE.Object3D | null = itemHolder;
        if (activeEditTarget === 'bullet') t = bulletHolder;
        if (t && activeEditTarget !== 'second_hand') t.rotation.y += Math.PI / 4;
    });

    document.getElementById('btn-hand-rot-z')?.addEventListener('click', () => {
        let t: THREE.Object3D | null = itemHolder;
        if (activeEditTarget === 'bullet') t = bulletHolder;
        if (t && activeEditTarget !== 'second_hand') t.rotation.z += Math.PI / 4;
    });

    document.getElementById('btn-hand-reset-pose')?.addEventListener('click', () => {
        if (activeEditTarget === 'second_hand' && leftArmGroup) {
            leftArmGroup.position.set(-0.55, 0.85, 0.15);
            updateReachLine();
        } else if (activeEditTarget === 'bullet' && bulletHolder) {
            bulletHolder.position.set(0, 0, 0.45);
            bulletHolder.rotation.set(0, 0, 0);
            bulletHolder.scale.set(1, 1, 1);
        } else if (itemHolder) {
            itemHolder.position.set(0, -0.22, 0.15);
            itemHolder.rotation.set(0.2, 0, 0);
            itemHolder.scale.set(0.25, 0.25, 0.25);
        }
    });

    // Ready button: saves gripOffset, holdableRole, and weaponConfig and closes
    const btnReady = document.getElementById('btn-hand-anim-ready');
    if (btnReady) {
        btnReady.onclick = () => {
            if (currentTargetObject && itemHolder) {
                const grip: GripOffset = {
                    position: {
                        x: Math.round(itemHolder.position.x * 1000) / 1000,
                        y: Math.round(itemHolder.position.y * 1000) / 1000,
                        z: Math.round(itemHolder.position.z * 1000) / 1000
                    },
                    rotation: {
                        x: Math.round(itemHolder.rotation.x * 1000) / 1000,
                        y: Math.round(itemHolder.rotation.y * 1000) / 1000,
                        z: Math.round(itemHolder.rotation.z * 1000) / 1000
                    },
                    scale: {
                        x: Math.round(itemHolder.scale.x * 1000) / 1000,
                        y: Math.round(itemHolder.scale.y * 1000) / 1000,
                        z: Math.round(itemHolder.scale.z * 1000) / 1000
                    }
                };

                currentTargetObject.gripOffset = grip;
                currentTargetObject.holdableRole = currentRole;
                currentTargetObject.dealsDamage = (currentRole === 'sword' || currentRole === 'gun');
                currentTargetObject.damageAmount = currentDamage;

                const wConfig: WeaponConfig = {
                    role: currentRole,
                    damage: currentDamage
                };

                if (currentRole === 'sword' && leftArmGroup) {
                    wConfig.reachDistance = reachDistance;
                    wConfig.secondHandPosition = {
                        x: Math.round(leftArmGroup.position.x * 1000) / 1000,
                        y: Math.round(leftArmGroup.position.y * 1000) / 1000,
                        z: Math.round(leftArmGroup.position.z * 1000) / 1000
                    };
                } else if (currentRole === 'gun' && bulletHolder) {
                    wConfig.bulletOffset = {
                        x: Math.round(bulletHolder.position.x * 1000) / 1000,
                        y: Math.round(bulletHolder.position.y * 1000) / 1000,
                        z: Math.round(bulletHolder.position.z * 1000) / 1000
                    };
                    wConfig.bulletRotation = {
                        x: Math.round(bulletHolder.rotation.x * 1000) / 1000,
                        y: Math.round(bulletHolder.rotation.y * 1000) / 1000,
                        z: Math.round(bulletHolder.rotation.z * 1000) / 1000
                    };
                    wConfig.bulletScale = {
                        x: Math.round(bulletHolder.scale.x * 1000) / 1000,
                        y: Math.round(bulletHolder.scale.y * 1000) / 1000,
                        z: Math.round(bulletHolder.scale.z * 1000) / 1000
                    };
                    wConfig.muzzleOffset = {
                        x: Math.round(bulletHolder.position.x * 1000) / 1000,
                        y: Math.round(bulletHolder.position.y * 1000) / 1000,
                        z: Math.round(bulletHolder.position.z * 1000) / 1000
                    };
                }

                currentTargetObject.weaponConfig = wConfig;
                autoSaveDraft();

                // If currently playing, update in-hand item directly
                if (isPlayTestMode && currentTargetObject.isHoldable) {
                    equipCustomItemInHand(currentTargetObject);
                }
            }
            closeHandAnimationEditor();
        };
    }

    // Cancel / Close buttons
    const btnCancel = document.getElementById('btn-hand-anim-cancel');
    const btnClose = document.getElementById('btn-close-hand-anim');
    if (btnCancel) btnCancel.onclick = closeHandAnimationEditor;
    if (btnClose) btnClose.onclick = closeHandAnimationEditor;

    // Viewport Pointer Interaction (Gizmo drag + Camera Orbit)
    let worldUnitsPerPixel = 0.002;
    const dragPlane = new THREE.Plane();
    const dragStartHit = new THREE.Vector3();
    const dragCurrHit = new THREE.Vector3();
    const dragAxisWorld = new THREE.Vector3(1, 0, 0);
    const dragStartWorldPos = new THREE.Vector3();
    let hasDragPlaneStart = false;

    const setRayFromEvent = (e: PointerEvent | MouseEvent) => {
        if (!camera) return;
        const r = canvas.getBoundingClientRect();
        mouseVec.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        mouseVec.y = -((e.clientY - r.top) / r.height) * 2 + 1;
        raycaster.setFromCamera(mouseVec, camera);
    };

    const pickGizmoAxis = (): string | null => {
        if (!gizmoGroup) return null;
        const sub = activeTool === 'mover'
            ? gizmoGroup.getObjectByName('GizmoMover')
            : (activeTool === 'puller'
                ? gizmoGroup.getObjectByName('GizmoPuller')
                : gizmoGroup.getObjectByName('GizmoRotator'));
        if (!sub || !sub.visible) return null;
        const hits = raycaster.intersectObjects(sub.children, true);
        for (const h of hits) {
            let curr: THREE.Object3D | null = h.object;
            while (curr && curr !== sub) {
                if ((curr as any).userData?.axis) return (curr as any).userData.axis;
                curr = curr.parent;
            }
        }
        return null;
    };

    const getActiveTargetMesh = (): THREE.Object3D | null => {
        if (activeEditTarget === 'second_hand') return leftArmGroup;
        if (activeEditTarget === 'bullet') return bulletHolder;
        return itemHolder;
    };

    const onPointerDown = (e: PointerEvent | MouseEvent) => {
        const activeTarget = getActiveTargetMesh();
        if (!camera || !gizmoGroup || !activeTarget) return;

        const rect = canvas.getBoundingClientRect();
        setRayFromEvent(e);

        // Check if user clicked a gizmo handle
        const hitAxis = pickGizmoAxis();

        if (e.button === 0 && hitAxis) {
            // Left click on gizmo handle -> start gizmo dragging
            isDraggingGizmo = true;
            activeGizmoAxis = hitAxis;
            dragStartPointer = { x: e.clientX, y: e.clientY };
            dragStartGripPos = { ...activeTarget.position };
            dragStartGripScale = { ...activeTarget.scale };
            dragStartGripRot = { x: activeTarget.rotation.x, y: activeTarget.rotation.y, z: activeTarget.rotation.z };

            // Ray-plane dragging: build a plane through the target that contains the
            // drag axis and faces the camera as much as possible -> exact 1:1 tracking.
            const originWorld = new THREE.Vector3();
            activeTarget.getWorldPosition(originWorld);
            dragStartWorldPos.copy(originWorld);

            dragAxisWorld.set(0, 1, 0);
            if (hitAxis === 'x') dragAxisWorld.set(1, 0, 0);
            else if (hitAxis === 'z') dragAxisWorld.set(0, 0, 1);

            const camDir = new THREE.Vector3();
            camera.getWorldDirection(camDir);
            const planeNormal = new THREE.Vector3()
                .crossVectors(dragAxisWorld, camDir)
                .cross(dragAxisWorld);
            if (planeNormal.lengthSq() < 1e-6) {
                planeNormal.copy(camDir).negate();
            }
            planeNormal.normalize();
            dragPlane.setFromNormalAndCoplanarPoint(planeNormal, originWorld);

            hasDragPlaneStart = !!raycaster.ray.intersectPlane(dragPlane, dragStartHit);

            // Fallback scale for puller (pixels -> world units at this depth)
            const dist = camera.position.distanceTo(originWorld);
            const vFov = (camera.fov * Math.PI) / 180;
            const visibleHeight = 2 * Math.tan(vFov / 2) * dist;
            worldUnitsPerPixel = visibleHeight / (rect.height || 550);
            canvas.style.cursor = 'grabbing';

            try {
                (canvas as any).setPointerCapture?.((e as any).pointerId);
            } catch (_) {}
            e.preventDefault();
        } else if (e.button === 2 || (e.button === 0 && !hitAxis)) {
            // Orbit camera
            isOrbiting = true;
            orbitStartPointer = { x: e.clientX, y: e.clientY };
            try {
                (canvas as any).setPointerCapture?.((e as any).pointerId);
            } catch (_) {}
            e.preventDefault();
        }
    };

    const onPointerMove = (e: PointerEvent | MouseEvent) => {
        const activeTarget = getActiveTargetMesh();
        if (isDraggingGizmo && activeTarget && activeGizmoAxis) {
            const rawDx = e.clientX - dragStartPointer.x;
            const rawDy = e.clientY - dragStartPointer.y;

            // Exact 1:1 world distance along the axis from ray-plane intersection
            let axisDist = 0;
            setRayFromEvent(e);
            if (hasDragPlaneStart && raycaster.ray.intersectPlane(dragPlane, dragCurrHit)) {
                axisDist = dragCurrHit.clone().sub(dragStartHit).dot(dragAxisWorld);
            }
            const worldDelta = axisDist;

            if (activeTool === 'mover') {
                // Move along the world axis, then convert into parent local space
                const targetWorld = dragStartWorldPos.clone().addScaledVector(dragAxisWorld, axisDist);
                const parent = activeTarget.parent;
                if (parent) {
                    parent.updateMatrixWorld(true);
                    parent.worldToLocal(targetWorld);
                }
                activeTarget.position.copy(targetWorld);
                if (activeEditTarget === 'second_hand') {
                    updateReachLine();
                }
            } else if (activeTool === 'puller' && activeEditTarget !== 'second_hand') {
                if (activeGizmoAxis === 'uniform') {
                    const factor = 1 + (rawDx - rawDy) * 0.004;
                    const s = Math.max(0.05, Math.min(2.5, dragStartGripScale.x * factor));
                    activeTarget.scale.set(s, s, s);
                } else if (activeGizmoAxis === 'x') {
                    const sx = Math.max(0.05, Math.min(3.0, dragStartGripScale.x + worldDelta));
                    activeTarget.scale.x = sx;
                } else if (activeGizmoAxis === 'y') {
                    const sy = Math.max(0.05, Math.min(3.0, dragStartGripScale.y + worldDelta));
                    activeTarget.scale.y = sy;
                } else if (activeGizmoAxis === 'z') {
                    const sz = Math.max(0.05, Math.min(3.0, dragStartGripScale.z + worldDelta));
                    activeTarget.scale.z = sz;
                }
            } else if (activeTool === 'rotator' && activeEditTarget !== 'second_hand') {
                // Dragging rotation rings smoothly rotates the item around the selected axis
                if (activeGizmoAxis === 'x') {
                    activeTarget.rotation.x = dragStartGripRot.x - rawDy * 0.012;
                } else if (activeGizmoAxis === 'y') {
                    activeTarget.rotation.y = dragStartGripRot.y + rawDx * 0.012;
                } else if (activeGizmoAxis === 'z') {
                    activeTarget.rotation.z = dragStartGripRot.z + (rawDx - rawDy) * 0.01;
                }
            }
        } else if (isOrbiting) {
            const dx = (e.clientX - orbitStartPointer.x) * 0.01;
            const dy = (e.clientY - orbitStartPointer.y) * 0.01;
            orbitTheta += dx;
            orbitPhi = Math.max(0.2, Math.min(Math.PI - 0.2, orbitPhi + dy));
            orbitStartPointer = { x: e.clientX, y: e.clientY };
            updateCameraTransform();
        } else if (camera) {
            setRayFromEvent(e);
            canvas.style.cursor = pickGizmoAxis() ? 'grab' : 'default';
        }
    };

    const onPointerUp = (e?: PointerEvent | MouseEvent) => {
        isDraggingGizmo = false;
        activeGizmoAxis = null;
        isOrbiting = false;
        hasDragPlaneStart = false;
        canvas.style.cursor = 'default';
        if (e && (canvas as any).releasePointerCapture) {
            try {
                (canvas as any).releasePointerCapture((e as any).pointerId);
            } catch (_) {}
        }
    };

    const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        orbitRadius = Math.max(0.5, Math.min(3.5, orbitRadius + e.deltaY * 0.0015));
        updateCameraTransform();
    };

    const onContextMenu = (e: MouseEvent) => {
        e.preventDefault();
    };

    // Use pointer events for smooth mouse, touch and pen tracking
    detachViewportListeners?.();
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);
    detachViewportListeners = () => {
        canvas.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('wheel', onWheel);
        canvas.removeEventListener('contextmenu', onContextMenu);
        canvas.style.cursor = 'default';
    };
}

let detachViewportListeners: (() => void) | null = null;

/**
 * Closes the Hand Animation Editor and cleans up resources.
 */
export function closeHandAnimationEditor() {
    isEditorOpen = false;
    currentTargetObject = null;
    isDraggingGizmo = false;
    isOrbiting = false;
    detachViewportListeners?.();
    detachViewportListeners = null;

    if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
    }

    const modal = document.getElementById('hand-animation-modal');
    if (modal) modal.style.display = 'none';

    if (scene) {
        while (scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }
    }

    armGroup = null;
    handSocket = null;
    itemHolder = null;
    clonedItemMesh = null;
    gizmoGroup = null;
    leftArmGroup = null;
    leftHandSocket = null;
    reachLineMesh = null;
    muzzleMarkerGroup = null;
    bulletHolder = null;
    bulletMesh = null;
}
