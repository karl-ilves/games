import * as THREE from 'three';
import { PlacedObject, GripOffset, CatalogItem } from '../types';
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

// Gizmo
let gizmoGroup: THREE.Group | null = null;
let activeTool: 'mover' | 'puller' | 'rotator' = 'mover';
let activeGizmoAxis: string | null = null;
let isDraggingGizmo = false;
let dragStartPointer = { x: 0, y: 0 };
let dragStartGripPos = { x: 0, y: 0, z: 0 };
let dragStartGripScale = { x: 1, y: 1, z: 1 };
let dragStartGripRot = { x: 0, y: 0, z: 0 };

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
function createIsolatedArm(): { arm: THREE.Group; socket: THREE.Group } {
    const arm = new THREE.Group();
    arm.name = 'EditorPlayerArm';

    // Materials
    const sleeveMat = new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
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
    thumb.position.set(-0.09, -0.90, 0.05);
    thumb.rotation.z = 0.25;
    arm.add(thumb);

    // Fingers detail (stylized block knuckles)
    const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.06, 0.14), skinMat);
    fingers.position.set(0, -1.01, 0.03);
    arm.add(fingers);

    // Hand Socket at (0, -0.85, 0), exactly matching AvatarRig handSocket
    const socket = new THREE.Group();
    socket.name = 'Socket_HandR';
    socket.position.set(0, -0.85, 0);
    arm.add(socket);

    // Position the whole arm so that the hand socket is centered at (0, 0, 0) in the viewport
    arm.position.set(0, 0.85, 0);

    return { arm, socket };
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

    const createArrow = (axis: 'x' | 'y' | 'z', color: number, dir: THREE.Vector3) => {
        const arrow = new THREE.Group();
        arrow.name = 'gizmo_move_' + axis;
        (arrow as any).userData = { tool: 'mover', axis };

        const shaftGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.35, 12);
        const headGeo = new THREE.ConeGeometry(0.035, 0.12, 16);
        const mat = new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.95 });

        const shaft = new THREE.Mesh(shaftGeo, mat);
        shaft.position.y = 0.175;
        (shaft as any).userData = { tool: 'mover', axis };

        const head = new THREE.Mesh(headGeo, mat);
        head.position.y = 0.35 + 0.06;
        (head as any).userData = { tool: 'mover', axis };

        arrow.add(shaft, head);

        if (axis === 'x') {
            arrow.rotation.z = -Math.PI / 2;
        } else if (axis === 'z') {
            arrow.rotation.x = Math.PI / 2;
        }
        moverGroup.add(arrow);
    };

    createArrow('x', 0xef4444, new THREE.Vector3(1, 0, 0)); // Red X
    createArrow('y', 0x22c55e, new THREE.Vector3(0, 1, 0)); // Green Y
    createArrow('z', 0x3b82f6, new THREE.Vector3(0, 0, 1)); // Blue Z

    // 2. Puller handles (Scale boxes for X, Y, Z + Center uniform cube)
    const pullerGroup = new THREE.Group();
    pullerGroup.name = 'GizmoPuller';

    const createScaleHandle = (axis: 'x' | 'y' | 'z' | 'uniform', color: number, pos: THREE.Vector3) => {
        const size = axis === 'uniform' ? 0.055 : 0.045;
        const boxGeo = new THREE.BoxGeometry(size, size, size);
        const mat = new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.95 });
        const mesh = new THREE.Mesh(boxGeo, mat);
        mesh.name = 'gizmo_pull_' + axis;
        mesh.position.copy(pos);
        (mesh as any).userData = { tool: 'puller', axis };
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
            transparent: true,
            opacity: 0.95
        });
        const ringMesh = new THREE.Mesh(ringGeo, mat);
        ringMesh.name = 'gizmo_rot_' + axis;
        (ringMesh as any).userData = { tool: 'rotator', axis };

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
 * Updates which gizmo (mover, puller, or rotator) is visible and resizes rotator rings to match item size.
 */
function updateGizmoToolDisplay() {
    if (!gizmoGroup) return;
    const moverGroup = gizmoGroup.getObjectByName('GizmoMover');
    const pullerGroup = gizmoGroup.getObjectByName('GizmoPuller');
    const rotatorGroup = gizmoGroup.getObjectByName('GizmoRotator');

    if (moverGroup) moverGroup.visible = activeTool === 'mover';
    if (pullerGroup) pullerGroup.visible = activeTool === 'puller';
    if (rotatorGroup) {
        rotatorGroup.visible = activeTool === 'rotator';
        if (rotatorGroup.visible && itemHolder) {
            // Compute item bounding size so rings match item size exactly ("pööraja peab olema sama suur kui se asi ja selle ümber")
            itemHolder.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(itemHolder);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z, 0.15);
            // Default torus has radius 0.38. Scale so ring diameter encloses the item closely:
            const targetRingRadius = (maxDim / 2) * 1.15;
            const ringScale = Math.max(0.3, targetRingRadius / 0.38);
            rotatorGroup.scale.set(ringScale, ringScale, ringScale);
        }
    }

    const btnMover = document.getElementById('btn-hand-tool-mover');
    const btnPuller = document.getElementById('btn-hand-tool-puller');
    const btnRotator = document.getElementById('btn-hand-tool-rotator');

    [btnMover, btnPuller, btnRotator].forEach(btn => {
        if (btn) {
            btn.style.background = 'rgba(255,255,255,0.08)';
            btn.style.color = '#94a3b8';
        }
    });

    if (activeTool === 'mover' && btnMover) {
        btnMover.style.background = 'linear-gradient(135deg, #00f2fe, #3b82f6)';
        btnMover.style.color = '#000';
    } else if (activeTool === 'puller' && btnPuller) {
        btnPuller.style.background = 'linear-gradient(135deg, #00f2fe, #3b82f6)';
        btnPuller.style.color = '#000';
    } else if (activeTool === 'rotator' && btnRotator) {
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
    const armData = createIsolatedArm();
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

    // 9. Gizmo
    gizmoGroup = createEditorGizmos();
    scene.add(gizmoGroup);

    activeTool = 'mover';
    updateGizmoToolDisplay();

    // 10. Attach listeners
    setupEditorEventListeners(canvas, viewport);

    // 11. Start animation loop
    const animate = () => {
        if (!isEditorOpen) return;
        animFrameId = requestAnimationFrame(animate);

        // Update gizmo transform to follow item
        if (gizmoGroup && itemHolder) {
            const worldPos = new THREE.Vector3();
            itemHolder.getWorldPosition(worldPos);
            gizmoGroup.position.copy(worldPos);
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

    // Rotation shortcuts
    document.getElementById('btn-hand-rot-x')?.addEventListener('click', () => {
        if (itemHolder) itemHolder.rotation.x += Math.PI / 4;
    });

    document.getElementById('btn-hand-rot-y')?.addEventListener('click', () => {
        if (itemHolder) itemHolder.rotation.y += Math.PI / 4;
    });

    document.getElementById('btn-hand-rot-z')?.addEventListener('click', () => {
        if (itemHolder) itemHolder.rotation.z += Math.PI / 4;
    });

    document.getElementById('btn-hand-reset-pose')?.addEventListener('click', () => {
        if (itemHolder) {
            itemHolder.position.set(0, -0.22, 0.15);
            itemHolder.rotation.set(0.2, 0, 0);
            itemHolder.scale.set(0.25, 0.25, 0.25);
        }
    });

    // Ready button: saves gripOffset and closes
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
    const onPointerDown = (e: MouseEvent) => {
        if (!camera || !gizmoGroup || !itemHolder) return;

        const rect = canvas.getBoundingClientRect();
        mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouseVec, camera);

        // Check if user clicked a gizmo handle
        const activeSubGroup = activeTool === 'mover'
            ? gizmoGroup.getObjectByName('GizmoMover')
            : (activeTool === 'puller'
                ? gizmoGroup.getObjectByName('GizmoPuller')
                : gizmoGroup.getObjectByName('GizmoRotator'));

        let hitAxis: string | null = null;
        if (activeSubGroup && activeSubGroup.visible) {
            const intersects = raycaster.intersectObjects(activeSubGroup.children, true);
            if (intersects.length > 0) {
                let curr: THREE.Object3D | null = intersects[0].object;
                while (curr && curr !== activeSubGroup) {
                    if ((curr as any).userData?.axis) {
                        hitAxis = (curr as any).userData.axis;
                        break;
                    }
                    curr = curr.parent;
                }
            }
        }

        if (e.button === 0 && hitAxis) {
            // Left click on gizmo handle -> start gizmo dragging
            isDraggingGizmo = true;
            activeGizmoAxis = hitAxis;
            dragStartPointer = { x: e.clientX, y: e.clientY };
            dragStartGripPos = { ...itemHolder.position };
            dragStartGripScale = { ...itemHolder.scale };
            dragStartGripRot = { x: itemHolder.rotation.x, y: itemHolder.rotation.y, z: itemHolder.rotation.z };
            e.preventDefault();
        } else if (e.button === 2 || (e.button === 0 && !hitAxis)) {
            // Orbit camera
            isOrbiting = true;
            orbitStartPointer = { x: e.clientX, y: e.clientY };
            e.preventDefault();
        }
    };

    const onPointerMove = (e: MouseEvent) => {
        if (isDraggingGizmo && itemHolder && activeGizmoAxis) {
            const dx = (e.clientX - dragStartPointer.x) * 0.004;
            const dy = (e.clientY - dragStartPointer.y) * 0.004;

            if (activeTool === 'mover') {
                if (activeGizmoAxis === 'x') {
                    itemHolder.position.x = dragStartGripPos.x + dx;
                } else if (activeGizmoAxis === 'y') {
                    itemHolder.position.y = dragStartGripPos.y - dy;
                } else if (activeGizmoAxis === 'z') {
                    itemHolder.position.z = dragStartGripPos.z + dy;
                }
            } else if (activeTool === 'puller') {
                if (activeGizmoAxis === 'uniform') {
                    const factor = 1 + (dx - dy);
                    const s = Math.max(0.05, Math.min(2.5, dragStartGripScale.x * factor));
                    itemHolder.scale.set(s, s, s);
                } else if (activeGizmoAxis === 'x') {
                    const sx = Math.max(0.05, Math.min(3.0, dragStartGripScale.x + dx));
                    itemHolder.scale.x = sx;
                } else if (activeGizmoAxis === 'y') {
                    const sy = Math.max(0.05, Math.min(3.0, dragStartGripScale.y - dy));
                    itemHolder.scale.y = sy;
                } else if (activeGizmoAxis === 'z') {
                    const sz = Math.max(0.05, Math.min(3.0, dragStartGripScale.z + dy));
                    itemHolder.scale.z = sz;
                }
            } else if (activeTool === 'rotator') {
                // Dragging rotation rings smoothly rotates the item around the selected axis
                if (activeGizmoAxis === 'x') {
                    itemHolder.rotation.x = dragStartGripRot.x - dy * 3.0;
                } else if (activeGizmoAxis === 'y') {
                    itemHolder.rotation.y = dragStartGripRot.y + dx * 3.0;
                } else if (activeGizmoAxis === 'z') {
                    itemHolder.rotation.z = dragStartGripRot.z + (dx - dy) * 2.5;
                }
            }
        } else if (isOrbiting) {
            const dx = (e.clientX - orbitStartPointer.x) * 0.01;
            const dy = (e.clientY - orbitStartPointer.y) * 0.01;
            orbitTheta += dx;
            orbitPhi = Math.max(0.2, Math.min(Math.PI - 0.2, orbitPhi + dy));
            orbitStartPointer = { x: e.clientX, y: e.clientY };
            updateCameraTransform();
        }
    };

    const onPointerUp = () => {
        isDraggingGizmo = false;
        activeGizmoAxis = null;
        isOrbiting = false;
    };

    const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        orbitRadius = Math.max(0.5, Math.min(3.5, orbitRadius + e.deltaY * 0.0015));
        updateCameraTransform();
    };

    const onContextMenu = (e: MouseEvent) => {
        e.preventDefault();
    };

    canvas.onmousedown = onPointerDown;
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    canvas.onwheel = onWheel;
    canvas.oncontextmenu = onContextMenu;
}

/**
 * Closes the Hand Animation Editor and cleans up resources.
 */
export function closeHandAnimationEditor() {
    isEditorOpen = false;
    currentTargetObject = null;

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
}
