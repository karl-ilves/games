import type { CatalogItem, DragPlaneType } from '../types';
import { playGameSound } from '../audio';
import { getCurrentUserProfile } from '../../../auth';
let wbActiveDragPlane: DragPlaneType | null = null;
const behSelect = typeof document !== 'undefined' ? (document.getElementById('workbench-select-behavior') as HTMLSelectElement | null) : null;
import * as THREE from 'three';
import { WorkbenchPart, WorkbenchState, CustomShapeType, DragPlaneType } from '../types';
import { scene, placedObjects } from '../state/creatorState';
import { saveUndoSnapshot } from '../systems/undoRedo';
import { createCustomModel3DMesh } from '../models/objectModels';
import { spawnObjectIntoScene, renderCatalogUI } from '../ui/creatorUI';
import { yardService } from '../../../shared/yardService';
import { CATALOG_DATABASE } from '../catalog/creatorCatalog';

export function getShapeIcon(shape: CustomShapeType): string {
    switch (shape) {
        case 'wedge': return '🔺';
        case 'cylinder': return '🔵';
        case 'pyramid': return '⛺';
        case 'dome': return '🟢';
        case 'sphere': return '🔮';
        case 'cone': return '🍦';
        case 'torus': return '🍩';
        case 'capsule': return '💊';
        case 'diamond': return '💎';
        case 'hexagon': return '🛑';
        case 'star': return '⭐';
        case 'heart': return '❤️';
        case 'stairs': return '🪜';
        case 'pipe': return '🛢️';
        case 'box':
        default: return '🟦';
    }
}

export const currentWorkbenchState: WorkbenchState = {
    shapeType: 'box',
    width: 3.0,
    height: 2.0,
    depth: 3.0,
    topElevation: 2.0,
    color: '#00f2fe',
    behavior: 'solid',
    itemType: 'item',
    inHandAtStart: false,
    costsPbx: false,
    pbxPrice: 50,
    parts: [
        {
            id: 'part_1',
            shapeType: 'box',
            width: 3.0,
            height: 2.0,
            depth: 3.0,
            topElevation: 2.0,
            color: '#00f2fe',
            position: { x: 0, y: 0, z: 0 },
            rotationY: 0
        }
    ],
    selectedPartIndex: 0
};

export function getActiveWorkbenchPart(): WorkbenchPart {
    if (!currentWorkbenchState.parts || currentWorkbenchState.parts.length === 0) {
        currentWorkbenchState.parts = [{
            id: 'part_' + Date.now(),
            shapeType: currentWorkbenchState.shapeType,
            width: currentWorkbenchState.width,
            height: currentWorkbenchState.height,
            depth: currentWorkbenchState.depth,
            topElevation: currentWorkbenchState.topElevation,
            color: currentWorkbenchState.color,
            position: { x: 0, y: 0, z: 0 },
            rotationY: 0
        }];
        currentWorkbenchState.selectedPartIndex = 0;
    }
    if (currentWorkbenchState.selectedPartIndex < 0 || currentWorkbenchState.selectedPartIndex >= currentWorkbenchState.parts.length) {
        currentWorkbenchState.selectedPartIndex = 0;
    }
    return currentWorkbenchState.parts[currentWorkbenchState.selectedPartIndex];
}

export function syncActivePartFromState() {
    const part = getActiveWorkbenchPart();
    part.shapeType = currentWorkbenchState.shapeType;
    part.width = currentWorkbenchState.width;
    part.height = currentWorkbenchState.height;
    part.depth = currentWorkbenchState.depth;
    part.topElevation = currentWorkbenchState.topElevation;
    part.color = currentWorkbenchState.color;
}

export function syncStateFromActivePart() {
    const part = getActiveWorkbenchPart();
    currentWorkbenchState.shapeType = part.shapeType;
    currentWorkbenchState.width = part.width;
    currentWorkbenchState.height = part.height;
    currentWorkbenchState.depth = part.depth;
    currentWorkbenchState.topElevation = part.topElevation;
    currentWorkbenchState.color = part.color;
}

export let wbScene: THREE.Scene | null = null;

let wbCamera: THREE.PerspectiveCamera | null = null;

let wbRenderer: THREE.WebGLRenderer | null = null;

let wbCurrentMeshGroup: THREE.Group | null = null;

let wbPedestalMesh: THREE.Mesh | null = null;

let wbGridHelper: THREE.GridHelper | null = null;

let wbAnimFrameId: number | null = null;

let wbOrbitRadius = 9;

let wbOrbitTheta = Math.PI / 4;

let wbOrbitPhi = Math.PI / 3;

let wbIsRightMouseDown = false;

let wbMousePos = { x: 0, y: 0 };

let wbDragStartMouse = { x: 0, y: 0 };

let wbDragInitialState = {
    height: 2.0,
    width: 3.0,
    depth: 3.0,
    topElevation: 2.0
};

let wbHoveredPlane: DragPlaneType | null = null;

let wbFaceHighlightMesh: THREE.Mesh | null = null;

export let wbToolMode: 'stretch' | 'move' = 'stretch';

let wbIsDraggingMove = false;

let wbDragInitialPosition = { x: 0, y: 0, z: 0 };

let wbDragStartGround = new THREE.Vector3();

export function setWorkbenchToolMode(mode: 'stretch' | 'move') {
    wbToolMode = mode;
    const btnScale = document.getElementById('btn-wb-mode-scale');
    const btnMove = document.getElementById('btn-wb-mode-move');
    const panelScale = document.getElementById('wb-left-scale-panel');
    const panelMove = document.getElementById('wb-left-move-panel');
    const hintText = document.getElementById('workbench-bottom-hint');

    if (mode === 'move') {
        if (btnMove) {
            btnMove.style.background = 'rgba(0,242,254,0.18)';
            btnMove.style.borderColor = '#00f2fe';
            btnMove.style.color = '#00f2fe';
            btnMove.classList.add('active');
        }
        if (btnScale) {
            btnScale.style.background = '#1e293b';
            btnScale.style.borderColor = '#475569';
            btnScale.style.color = '#cbd5e1';
            btnScale.classList.remove('active');
        }
        if (panelMove) panelMove.style.display = 'block';
        if (panelScale) panelScale.style.display = 'none';
        if (hintText) {
            hintText.innerHTML = `<span>✋ <strong style="color: #00f2fe;">Kliki kujundil ja lohista:</strong> liigutab kujundit alusel!</span>
                <span style="color: #475569;">|</span>
                <span>🖱️ <strong style="color: #ffd32a;">Paremklõps + liigutus:</strong> pöörab kaamerat</span>
                <span style="color: #475569;">|</span>
                <span>🔍 <strong style="color: #2ecc71;">Rullik:</strong> suumib</span>`;
        }
    } else {
        if (btnScale) {
            btnScale.style.background = 'rgba(0,242,254,0.18)';
            btnScale.style.borderColor = '#00f2fe';
            btnScale.style.color = '#00f2fe';
            btnScale.classList.add('active');
        }
        if (btnMove) {
            btnMove.style.background = '#1e293b';
            btnMove.style.borderColor = '#475569';
            btnMove.style.color = '#cbd5e1';
            btnMove.classList.remove('active');
        }
        if (panelScale) panelScale.style.display = 'block';
        if (panelMove) panelMove.style.display = 'none';
        if (hintText) {
            hintText.innerHTML = `<span>✋ <strong style="color: #00f2fe;">Kliki pinnale ja lohista:</strong> venitab/teeb pikemaks otse kaasa!</span>
                <span style="color: #475569;">|</span>
                <span>🖱️ <strong style="color: #ffd32a;">Paremklõps + liigutus:</strong> pöörab kaamerat</span>
                <span style="color: #475569;">|</span>
                <span>🔍 <strong style="color: #2ecc71;">Rullik:</strong> suumib</span>`;
        }
    }
}

export function initWorkbench3D() {
    const container = document.getElementById('workbench-canvas-container');
    if (!container || wbRenderer) return;

    wbScene = new THREE.Scene();
    wbScene.background = new THREE.Color(0x0a0f1d);
    wbScene.fog = new THREE.FogExp2(0x0a0f1d, 0.015);

    const rect = container.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || (window.innerHeight - 60);

    wbCamera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);

    try {
        wbRenderer = new THREE.WebGLRenderer({ antialias: true });
        wbRenderer.setSize(w, h);
        wbRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        wbRenderer.shadowMap.enabled = true;
        container.appendChild(wbRenderer.domElement);
    } catch (e) {
        console.warn('Workbench WebGL error:', e);
        return;
    }

    // Lights
    const ambLight = new THREE.AmbientLight(0xffffff, 0.85);
    wbScene.add(ambLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight1.position.set(10, 20, 15);
    dirLight1.castShadow = true;
    wbScene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00f2fe, 0.8);
    dirLight2.position.set(-10, -10, -10);
    wbScene.add(dirLight2);

    // Workbench Pedestal Plate (Large plate with glowing grid boundary)
    const pedGeo = new THREE.CylinderGeometry(8, 8.4, 0.4, 48);
    const pedMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.6,
        roughness: 0.3
    });
    wbPedestalMesh = new THREE.Mesh(pedGeo, pedMat);
    wbPedestalMesh.position.y = -0.2;
    wbPedestalMesh.receiveShadow = true;
    wbScene.add(wbPedestalMesh);

    // Glowing Cyan Grid on Workbench
    wbGridHelper = new THREE.GridHelper(14, 14, 0x00f2fe, 0x334155);
    wbGridHelper.position.y = 0.01;
    wbScene.add(wbGridHelper);

    // Face Highlight Ring/Plane
    const hGeo = new THREE.PlaneGeometry(1, 1);
    const hMat = new THREE.MeshBasicMaterial({
        color: 0xffd32a,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    wbFaceHighlightMesh = new THREE.Mesh(hGeo, hMat);
    wbFaceHighlightMesh.visible = false;
    wbScene.add(wbFaceHighlightMesh);

    // Camera controls for Workbench
    updateWorkbenchCamera();

    const dom = wbRenderer.domElement;

    // Helper: Detect which face and which part was clicked/hovered
    function detectFaceAtPoint(clientX: number, clientY: number): { plane: DragPlaneType; normal: THREE.Vector3; point: THREE.Vector3; partIndex: number } | null {
        if (!wbCamera || !wbCurrentMeshGroup) return null;
        const rect = dom.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -((clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, wbCamera);

        const meshes: THREE.Mesh[] = [];
        wbCurrentMeshGroup.traverse(child => {
            if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
        });

        const intersects = raycaster.intersectObjects(meshes, false);
        if (intersects.length === 0) return null;

        const hit = intersects[0];
        if (!hit.face) return null;

        // Find which part was hit
        let targetPartIndex = 0;
        let pObj: THREE.Object3D | null = hit.object;
        while (pObj && pObj !== wbCurrentMeshGroup && pObj !== wbScene) {
            if (pObj.userData && typeof pObj.userData.partIndex === 'number') {
                targetPartIndex = pObj.userData.partIndex;
                break;
            }
            pObj = pObj.parent;
        }

        const targetPart = currentWorkbenchState.parts[targetPartIndex] || getActiveWorkbenchPart();

        const normal = hit.face.normal.clone();
        normal.transformDirection(hit.object.matrixWorld);

        // Determine face type by world normal
        let plane: DragPlaneType = 'top';
        if (targetPart.shapeType === 'wedge' && (normal.y > 0.3 || normal.z < -0.3)) {
            plane = 'slope';
        } else if (normal.y > 0.5) {
            plane = 'top';
        } else if (normal.y < -0.5) {
            plane = 'bottom';
        } else if (Math.abs(normal.x) > Math.abs(normal.z)) {
            plane = normal.x > 0 ? 'right' : 'left';
        } else {
            plane = normal.z > 0 ? 'front' : 'back';
        }

        return { plane, normal, point: hit.point, partIndex: targetPartIndex };
    }

    dom.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            // Left click: test if clicking directly on object face to drag or move it
            const faceHit = detectFaceAtPoint(e.clientX, e.clientY);
            if (faceHit) {
                currentWorkbenchState.selectedPartIndex = faceHit.partIndex;
                syncStateFromActivePart();
                const activePart = getActiveWorkbenchPart();

                if (wbToolMode === 'move') {
                    wbIsDraggingMove = true;
                    wbDragInitialPosition = { ...activePart.position };
                    wbDragStartMouse = { x: e.clientX, y: e.clientY };

                    const rect = dom.getBoundingClientRect();
                    const mouse = new THREE.Vector2(
                        ((e.clientX - rect.left) / rect.width) * 2 - 1,
                        -((e.clientY - rect.top) / rect.height) * 2 + 1
                    );
                    const raycaster = new THREE.Raycaster();
                    raycaster.setFromCamera(mouse, wbCamera!);
                    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -activePart.position.y);
                    const intersectPt = new THREE.Vector3();
                    if (raycaster.ray.intersectPlane(groundPlane, intersectPt)) {
                        wbDragStartGround.copy(intersectPt);
                    } else {
                        wbDragStartGround.copy(faceHit.point);
                    }
                    dom.style.cursor = 'move';
                    renderWorkbenchPartsList();
                    return;
                } else {
                    // 'stretch' mode
                    wbActiveDragPlane = faceHit.plane;
                    wbDragStartMouse = { x: e.clientX, y: e.clientY };
                    wbDragInitialState = {
                        height: activePart.height,
                        width: activePart.width,
                        depth: activePart.depth,
                        topElevation: activePart.topElevation
                    };
                    dom.style.cursor = 'ns-resize';
                    renderWorkbenchPartsList();
                    return;
                }
            } else {
                // Clicking outside object on background orbits the camera
                wbIsRightMouseDown = true;
                wbMousePos = { x: e.clientX, y: e.clientY };
            }
        } else if (e.button === 2) {
            // Right click always orbits camera
            wbIsRightMouseDown = true;
            wbMousePos = { x: e.clientX, y: e.clientY };
        }
    });

    window.addEventListener('mousemove', (e) => {
        // 1. Direct Move Dragging
        if (wbIsDraggingMove && wbCamera) {
            const activePart = getActiveWorkbenchPart();
            const rect = dom.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, wbCamera);
            const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -wbDragInitialPosition.y);
            const currentPt = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(groundPlane, currentPt)) {
                const dx = currentPt.x - wbDragStartGround.x;
                const dz = currentPt.z - wbDragStartGround.z;
                // Snap to 0.25m grid
                const newX = Math.round((wbDragInitialPosition.x + dx) * 4) / 4;
                const newZ = Math.round((wbDragInitialPosition.z + dz) * 4) / 4;
                activePart.position.x = parseFloat((Math.max(-7, Math.min(7, newX))).toFixed(2));
                activePart.position.z = parseFloat((Math.max(-7, Math.min(7, newZ))).toFixed(2));
                rebuildWorkbenchModel();
                syncWorkbenchUI();
            }
            return;
        }

        // 2. Direct Face Dragging (Stretch / Lengthen)
        if (wbActiveDragPlane) {
            const dy = wbDragStartMouse.y - e.clientY; // positive = dragged up
            const dx = e.clientX - wbDragStartMouse.x;
            const sensitivity = 0.025;
            const activePart = getActiveWorkbenchPart();

            if (wbActiveDragPlane === 'top') {
                const newH = Math.max(0.4, Math.min(12, wbDragInitialState.height + dy * sensitivity));
                activePart.height = parseFloat(newH.toFixed(2));
                if (activePart.shapeType === 'wedge') {
                    activePart.topElevation = activePart.height;
                }
                currentWorkbenchState.height = activePart.height;
                currentWorkbenchState.topElevation = activePart.topElevation;
            } else if (wbActiveDragPlane === 'slope') {
                const newElev = Math.max(0.2, Math.min(12, wbDragInitialState.topElevation + dy * sensitivity));
                activePart.topElevation = parseFloat(newElev.toFixed(2));
                activePart.height = Math.max(activePart.height, activePart.topElevation);
                currentWorkbenchState.topElevation = activePart.topElevation;
                currentWorkbenchState.height = activePart.height;
            } else if (wbActiveDragPlane === 'right' || wbActiveDragPlane === 'left') {
                const change = (wbActiveDragPlane === 'right' ? dx : -dx) * sensitivity;
                const newW = Math.max(0.5, Math.min(14, wbDragInitialState.width + change));
                activePart.width = parseFloat(newW.toFixed(2));
                currentWorkbenchState.width = activePart.width;
            } else if (wbActiveDragPlane === 'front' || wbActiveDragPlane === 'back') {
                const change = (wbActiveDragPlane === 'front' ? dy : -dy) * sensitivity;
                const newD = Math.max(0.5, Math.min(14, wbDragInitialState.depth + change));
                activePart.depth = parseFloat(newD.toFixed(2));
                currentWorkbenchState.depth = activePart.depth;
            }

            syncWorkbenchUI();
            return;
        }

        // 3. Camera Orbit
        if (wbIsRightMouseDown) {
            const dx = e.clientX - wbMousePos.x;
            const dy = e.clientY - wbMousePos.y;
            wbMousePos = { x: e.clientX, y: e.clientY };

            wbOrbitTheta -= dx * 0.008;
            wbOrbitPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, wbOrbitPhi - dy * 0.008));
            updateWorkbenchCamera();
            return;
        }

        // 4. Hover indication over faces
        const hit = detectFaceAtPoint(e.clientX, e.clientY);
        if (hit) {
            wbHoveredPlane = hit.plane;
            dom.style.cursor = wbToolMode === 'move' ? 'move' : 'grab';
        } else {
            wbHoveredPlane = null;
            dom.style.cursor = 'default';
        }
    });

    window.addEventListener('mouseup', () => {
        wbIsRightMouseDown = false;
        if (wbIsDraggingMove) {
            wbIsDraggingMove = false;
            dom.style.cursor = 'default';
        }
        if (wbActiveDragPlane) {
            wbActiveDragPlane = null;
            dom.style.cursor = 'default';
        }
    });

    dom.addEventListener('wheel', (e) => {
        wbOrbitRadius = Math.max(3, Math.min(25, wbOrbitRadius + e.deltaY * 0.015));
        updateWorkbenchCamera();
    });

    dom.addEventListener('contextmenu', e => e.preventDefault());

    // Window resize
    window.addEventListener('resize', () => {
        if (!wbRenderer || !wbCamera || !container) return;
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        wbCamera.aspect = cw / ch;
        wbCamera.updateProjectionMatrix();
        wbRenderer.setSize(cw, ch);
    });

    rebuildWorkbenchModel();
    animateWorkbench();
}

function updateWorkbenchCamera() {
    if (!wbCamera) return;
    const x = wbOrbitRadius * Math.sin(wbOrbitPhi) * Math.sin(wbOrbitTheta);
    const y = wbOrbitRadius * Math.cos(wbOrbitPhi) + 1.0;
    const z = wbOrbitRadius * Math.sin(wbOrbitPhi) * Math.cos(wbOrbitTheta);

    wbCamera.position.set(x, y, z);
    wbCamera.lookAt(0, 1.2, 0);
}

function renderWorkbenchPartsList() {
    const listEl = document.getElementById('workbench-parts-list');
    const countEl = document.getElementById('workbench-parts-count');
    if (!listEl) return;

    if (countEl) {
        countEl.innerText = `${currentWorkbenchState.parts.length} tk`;
    }

    listEl.innerHTML = '';
    currentWorkbenchState.parts.forEach((p, idx) => {
        const chip = document.createElement('button');
        const isActive = idx === currentWorkbenchState.selectedPartIndex;
        chip.style.padding = '5px 10px';
        chip.style.borderRadius = '6px';
        chip.style.border = isActive ? '1.5px solid #ffd32a' : '1px solid #475569';
        chip.style.background = isActive ? 'linear-gradient(135deg, rgba(255,211,42,0.25), rgba(30,41,59,0.9))' : '#1e293b';
        chip.style.color = isActive ? '#ffd32a' : '#cbd5e1';
        chip.style.fontSize = '0.75rem';
        chip.style.fontWeight = 'bold';
        chip.style.cursor = 'pointer';
        chip.style.whiteSpace = 'nowrap';
        chip.style.display = 'flex';
        chip.style.alignItems = 'center';
        chip.style.gap = '4px';

        const icon = getShapeIcon(p.shapeType);

        chip.innerHTML = `<span>${icon}</span> <span>Kuju #${idx + 1}</span>`;
        chip.addEventListener('click', () => {
            currentWorkbenchState.selectedPartIndex = idx;
            syncStateFromActivePart();
            syncWorkbenchUI();
        });
        listEl.appendChild(chip);
    });
}

export function rebuildWorkbenchModel() {
    if (!wbScene) return;
    if (wbCurrentMeshGroup) {
        wbScene.remove(wbCurrentMeshGroup);
        wbCurrentMeshGroup.traverse((c) => {
            if ((c as THREE.Mesh).isMesh) {
                (c as THREE.Mesh).geometry?.dispose();
            }
        });
        wbCurrentMeshGroup = null;
    }

    syncActivePartFromState();

    const modelData = {
        shapeType: currentWorkbenchState.shapeType,
        width: currentWorkbenchState.width,
        height: currentWorkbenchState.height,
        depth: currentWorkbenchState.depth,
        topElevation: currentWorkbenchState.topElevation,
        isHazard: currentWorkbenchState.behavior === 'hazard',
        isHeal: currentWorkbenchState.behavior === 'heal',
        isBoost: currentWorkbenchState.behavior === 'boost',
        parts: currentWorkbenchState.parts
    };

    wbCurrentMeshGroup = createCustomModel3DMesh(modelData, currentWorkbenchState.color);
    wbScene.add(wbCurrentMeshGroup);
}

function animateWorkbench() {
    wbAnimFrameId = requestAnimationFrame(animateWorkbench);
    if (!wbScene || !wbCamera || !wbRenderer) return;

    // Ese seisab kindlalt paigal ruudustikul ja ei pöörle automaatselt, et pindu oleks mugav haarata ja liigutada
    wbRenderer.render(wbScene, wbCamera);
}

export function openWorkbenchModal() {
    const modal = document.getElementById('custom-item-workbench-modal');
    if (!modal) return;
    modal.style.display = 'flex';

    if (!wbRenderer) {
        initWorkbench3D();
    } else {
        syncWorkbenchUI();
    }
}

export function closeWorkbenchModal() {
    const modal = document.getElementById('custom-item-workbench-modal');
    if (modal) modal.style.display = 'none';
}

function syncWorkbenchUI() {
    const activePart = getActiveWorkbenchPart();
    const hVal = document.getElementById('workbench-val-height');
    const wVal = document.getElementById('workbench-val-width');
    const dVal = document.getElementById('workbench-val-depth');
    const elVal = document.getElementById('workbench-val-elevation');
    const hSlider = document.getElementById('workbench-slider-height') as HTMLInputElement | null;
    const wSlider = document.getElementById('workbench-slider-width') as HTMLInputElement | null;
    const dSlider = document.getElementById('workbench-slider-depth') as HTMLInputElement | null;
    const wedgeBox = document.getElementById('workbench-wedge-controls');
    const colorInp = document.getElementById('workbench-color-input') as HTMLInputElement | null;

    if (hVal) hVal.innerText = `${activePart.height.toFixed(1)}m`;
    if (wVal) wVal.innerText = `${activePart.width.toFixed(1)}m`;
    if (dVal) dVal.innerText = `${activePart.depth.toFixed(1)}m`;
    if (elVal) elVal.innerText = `${activePart.topElevation.toFixed(1)}m`;

    const leftDVal = document.getElementById('wb-left-val-depth');
    const leftWVal = document.getElementById('wb-left-val-width');
    const leftHVal = document.getElementById('wb-left-val-height');
    if (leftDVal) leftDVal.innerText = `${activePart.depth.toFixed(1)}m`;
    if (leftWVal) leftWVal.innerText = `${activePart.width.toFixed(1)}m`;
    if (leftHVal) leftHVal.innerText = `${activePart.height.toFixed(1)}m`;

    if (hSlider) hSlider.value = activePart.height.toString();
    if (wSlider) wSlider.value = activePart.width.toString();
    if (dSlider) dSlider.value = activePart.depth.toString();
    if (colorInp) colorInp.value = activePart.color;

    if (wedgeBox) {
        wedgeBox.style.display = activePart.shapeType === 'wedge' ? 'block' : 'none';
    }

    document.querySelectorAll('.workbench-shape-btn').forEach(btn => {
        const s = (btn as HTMLElement).getAttribute('data-shape');
        if (s === activePart.shapeType) {
            (btn as HTMLElement).style.borderColor = '#00f2fe';
            (btn as HTMLElement).style.background = '#1e293b';
        } else {
            (btn as HTMLElement).style.borderColor = '#475569';
            (btn as HTMLElement).style.background = '#0f172a';
        }
    });

    // Sync Item Type ('item' vs 'static') and options
    const isItem = currentWorkbenchState.itemType === 'item';
    const btnTypeItem = document.getElementById('btn-wb-type-item');
    const btnTypeStatic = document.getElementById('btn-wb-type-static');
    const checkInHand = document.getElementById('wb-checkbox-in-hand') as HTMLInputElement | null;
    const checkCostsPbx = document.getElementById('wb-checkbox-costs-pbx') as HTMLInputElement | null;
    const inputPbxPrice = document.getElementById('wb-input-pbx-price') as HTMLInputElement | null;
    const labelInHand = document.getElementById('wb-label-in-hand');
    const labelCostsPbx = document.getElementById('wb-label-costs-pbx');
    const pbxPriceBox = document.getElementById('wb-pbx-price-box');
    const staticInfo = document.getElementById('wb-static-info-text');

    if (btnTypeItem) {
        btnTypeItem.style.background = isItem ? 'linear-gradient(135deg, #00f2fe, #3b82f6)' : 'transparent';
        btnTypeItem.style.color = isItem ? '#000' : '#94a3b8';
        btnTypeItem.style.boxShadow = isItem ? '0 2px 10px rgba(0,242,254,0.4)' : 'none';
        btnTypeItem.classList.toggle('active', isItem);
    }
    if (btnTypeStatic) {
        btnTypeStatic.style.background = !isItem ? 'linear-gradient(135deg, #ffd32a, #ff9f1a)' : 'transparent';
        btnTypeStatic.style.color = !isItem ? '#000' : '#94a3b8';
        btnTypeStatic.style.boxShadow = !isItem ? '0 2px 10px rgba(255,211,42,0.4)' : 'none';
        btnTypeStatic.classList.toggle('active', !isItem);
    }

    if (labelInHand) labelInHand.style.display = isItem ? 'flex' : 'none';
    if (labelCostsPbx) labelCostsPbx.style.display = isItem ? 'flex' : 'none';
    if (staticInfo) staticInfo.style.display = !isItem ? 'block' : 'none';

    if (checkInHand) checkInHand.checked = !!currentWorkbenchState.inHandAtStart;
    if (checkCostsPbx) checkCostsPbx.checked = !!currentWorkbenchState.costsPbx;
    if (inputPbxPrice) inputPbxPrice.value = String(currentWorkbenchState.pbxPrice ?? 50);

    if (pbxPriceBox) {
        pbxPriceBox.style.display = (isItem && currentWorkbenchState.costsPbx) ? 'flex' : 'none';
    }

    renderWorkbenchPartsList();
    rebuildWorkbenchModel();
}

function getWorkbenchItemPayload(nameOverride?: string) {
    const nameInput = document.getElementById('workbench-item-name') as HTMLInputElement | null;
    const name = nameOverride || nameInput?.value.trim() || 'Minu 3D Ese';
    const mainPart = currentWorkbenchState.parts[0] || getActiveWorkbenchPart();
    const isHoldable = currentWorkbenchState.itemType === 'item';
    const inHandAtStart = isHoldable && !!currentWorkbenchState.inHandAtStart;
    const costsPbx = isHoldable && !!currentWorkbenchState.costsPbx;
    const pbxPrice = costsPbx ? Math.max(0, currentWorkbenchState.pbxPrice ?? 50) : 0;

    let icon = isHoldable ? '🗡️' : getShapeIcon(mainPart.shapeType);

    if (currentWorkbenchState.parts.length > 1 && !isHoldable) icon = '🧩';
    if (currentWorkbenchState.behavior === 'hazard') icon = '🔥';
    else if (currentWorkbenchState.behavior === 'heal') icon = '💖';
    else if (currentWorkbenchState.behavior === 'boost') icon = '⚡';

    return {
        name,
        icon,
        category: 'custom' as const,
        shapeType: mainPart.shapeType,
        color: mainPart.color,
        isHoldable,
        inHandAtStart,
        costsPbx,
        pbxPrice,
        modelData: {
            width: mainPart.width,
            height: mainPart.height,
            depth: mainPart.depth,
            topElevation: mainPart.topElevation,
            isHazard: currentWorkbenchState.behavior === 'hazard',
            isHeal: currentWorkbenchState.behavior === 'heal',
            isBoost: currentWorkbenchState.behavior === 'boost',
            isHoldable,
            inHandAtStart,
            costsPbx,
            pbxPrice,
            parts: currentWorkbenchState.parts.map(p => ({
                id: p.id,
                shapeType: p.shapeType,
                width: p.width,
                height: p.height,
                depth: p.depth,
                topElevation: p.topElevation,
                color: p.color,
                position: { ...p.position },
                rotationY: p.rotationY
            }))
        }
    };
}

export function placeWorkbenchItemIntoScene() {
    const payload = getWorkbenchItemPayload();
    const catItem: CatalogItem = {
        id: 'custom_' + Date.now(),
        name: payload.name,
        category: 'custom',
        icon: payload.icon,
        color: payload.color,
        geometryType: payload.shapeType,
        baseScale: 1.0,
        isHoldable: payload.isHoldable,
        inHandAtStart: payload.inHandAtStart,
        costsPbx: payload.costsPbx,
        pbxPrice: payload.pbxPrice,
        customModelData: payload.modelData
    };

    spawnObjectIntoScene(catItem);
    closeWorkbenchModal();
    playGameSound('victory');
}

export function saveWorkbenchItemToLibrary(publish = false) {
    const profile = getCurrentUserProfile();
    const payload = getWorkbenchItemPayload();

    const saved = yardService.savePlayerCreatedItem(profile?.username ?? null, {
        ...payload,
        isPublished: publish
    });

    if (publish) {
        yardService.publishPlayerCreatedItem(saved);
        alert(`🌐 Ese "${saved.name}" on avaldatud! Kõik mängijad näevad seda nüüd kategooria "⭐ Players Created" all!`);
    } else {
        alert(`💾 Ese "${saved.name}" salvestati edukalt! Leiad selle nüüd "⭐ Players Created" nimekirjast.`);
    }

    renderCatalogUI('custom');
    // Also place in scene for user convenience
    placeWorkbenchItemIntoScene();
}

export function setupWorkbenchEvents() {
    document.getElementById('btn-create-custom-item')?.addEventListener('click', () => {
        openWorkbenchModal();
    });

    document.getElementById('btn-close-workbench')?.addEventListener('click', () => {
        closeWorkbenchModal();
    });

    // 🗡️/🧱 Item Type Selector: Ese vs Asi mida ei saa kätte võtta
    document.getElementById('btn-wb-type-item')?.addEventListener('click', () => {
        currentWorkbenchState.itemType = 'item';
        syncWorkbenchUI();
    });

    document.getElementById('btn-wb-type-static')?.addEventListener('click', () => {
        currentWorkbenchState.itemType = 'static';
        syncWorkbenchUI();
    });

    // ✋ Kas on alguses käes
    document.getElementById('wb-checkbox-in-hand')?.addEventListener('change', (e) => {
        currentWorkbenchState.inHandAtStart = (e.target as HTMLInputElement).checked;
        syncWorkbenchUI();
    });

    // 💎 Kas maksab PBX
    document.getElementById('wb-checkbox-costs-pbx')?.addEventListener('change', (e) => {
        currentWorkbenchState.costsPbx = (e.target as HTMLInputElement).checked;
        syncWorkbenchUI();
    });

    // 💎 Kui palju PBX maksab
    document.getElementById('wb-input-pbx-price')?.addEventListener('input', (e) => {
        const val = parseInt((e.target as HTMLInputElement).value, 10);
        currentWorkbenchState.pbxPrice = isNaN(val) ? 0 : Math.max(0, val);
    });

    // ➕ Add another shape part
    document.getElementById('btn-wb-add-part')?.addEventListener('click', () => {
        const count = currentWorkbenchState.parts.length;
        const currentActive = getActiveWorkbenchPart();
        const newPart: WorkbenchPart = {
            id: 'part_' + (count + 1) + '_' + Date.now(),
            shapeType: 'box',
            width: 2.0,
            height: 1.5,
            depth: 2.0,
            topElevation: 1.5,
            color: '#ffd32a', // vibrant golden yellow for new attached part
            position: {
                x: currentActive.position.x,
                y: currentActive.position.y + currentActive.height, // stack nicely on top of previous
                z: currentActive.position.z
            },
            rotationY: 0
        };
        currentWorkbenchState.parts.push(newPart);
        currentWorkbenchState.selectedPartIndex = currentWorkbenchState.parts.length - 1;
        syncStateFromActivePart();
        syncWorkbenchUI();
    });

    // 🗑️ Delete active shape part (keep at least 1)
    document.getElementById('btn-wb-delete-part')?.addEventListener('click', () => {
        if (currentWorkbenchState.parts.length <= 1) {
            alert('Esemel peab olema vähemalt 1 kujund!');
            return;
        }
        currentWorkbenchState.parts.splice(currentWorkbenchState.selectedPartIndex, 1);
        currentWorkbenchState.selectedPartIndex = Math.max(0, currentWorkbenchState.selectedPartIndex - 1);
        syncStateFromActivePart();
        syncWorkbenchUI();
    });

    // Left Panel Tool Mode Buttons: Tee Pikemaks vs Liiguta Kuju
    document.getElementById('btn-wb-mode-scale')?.addEventListener('click', () => {
        setWorkbenchToolMode('stretch');
    });
    document.getElementById('btn-wb-mode-move')?.addEventListener('click', () => {
        setWorkbenchToolMode('move');
    });

    // Left Panel Scale / Stretch Buttons (Tee pikemaks, laiemaks, kõrgemaks)
    document.getElementById('btn-wb-left-longer')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.depth = Math.min(14, parseFloat((part.depth + 0.5).toFixed(2)));
        currentWorkbenchState.depth = part.depth;
        syncWorkbenchUI();
    });
    document.getElementById('btn-wb-left-shorter')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.depth = Math.max(0.5, parseFloat((part.depth - 0.5).toFixed(2)));
        currentWorkbenchState.depth = part.depth;
        syncWorkbenchUI();
    });
    document.getElementById('btn-wb-left-wider')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.width = Math.min(14, parseFloat((part.width + 0.5).toFixed(2)));
        currentWorkbenchState.width = part.width;
        syncWorkbenchUI();
    });
    document.getElementById('btn-wb-left-narrower')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.width = Math.max(0.5, parseFloat((part.width - 0.5).toFixed(2)));
        currentWorkbenchState.width = part.width;
        syncWorkbenchUI();
    });
    document.getElementById('btn-wb-left-higher')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.height = Math.min(12, parseFloat((part.height + 0.5).toFixed(2)));
        if (part.shapeType === 'wedge') part.topElevation = part.height;
        currentWorkbenchState.height = part.height;
        currentWorkbenchState.topElevation = part.topElevation;
        syncWorkbenchUI();
    });
    document.getElementById('btn-wb-left-lower')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.height = Math.max(0.4, parseFloat((part.height - 0.5).toFixed(2)));
        if (part.shapeType === 'wedge') part.topElevation = Math.min(part.topElevation, part.height);
        currentWorkbenchState.height = part.height;
        currentWorkbenchState.topElevation = part.topElevation;
        syncWorkbenchUI();
    });

    // Left Panel Move & Position Buttons
    document.getElementById('btn-wb-left-pos-up')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.position.y = parseFloat((part.position.y + 0.5).toFixed(2));
        rebuildWorkbenchModel();
        syncWorkbenchUI();
    });
    document.getElementById('btn-wb-left-pos-down')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.position.y = Math.max(0, parseFloat((part.position.y - 0.5).toFixed(2)));
        rebuildWorkbenchModel();
        syncWorkbenchUI();
    });
    document.getElementById('btn-wb-left-pos-left')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.position.x = parseFloat((part.position.x - 0.5).toFixed(2));
        rebuildWorkbenchModel();
        syncWorkbenchUI();
    });
    document.getElementById('btn-wb-left-pos-right')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.position.x = parseFloat((part.position.x + 0.5).toFixed(2));
        rebuildWorkbenchModel();
        syncWorkbenchUI();
    });
    document.getElementById('btn-wb-left-pos-fwd')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.position.z = parseFloat((part.position.z + 0.5).toFixed(2));
        rebuildWorkbenchModel();
        syncWorkbenchUI();
    });
    document.getElementById('btn-wb-left-pos-back')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.position.z = parseFloat((part.position.z - 0.5).toFixed(2));
        rebuildWorkbenchModel();
        syncWorkbenchUI();
    });
    document.getElementById('btn-wb-left-rot-y')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.rotationY = (part.rotationY || 0) + Math.PI / 4;
        rebuildWorkbenchModel();
        syncWorkbenchUI();
    });
    document.getElementById('btn-wb-pos-up')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.position.y = parseFloat((part.position.y + 0.5).toFixed(2));
        rebuildWorkbenchModel();
    });
    document.getElementById('btn-wb-pos-down')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.position.y = Math.max(0, parseFloat((part.position.y - 0.5).toFixed(2)));
        rebuildWorkbenchModel();
    });
    document.getElementById('btn-wb-pos-left')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.position.x = parseFloat((part.position.x - 0.5).toFixed(2));
        rebuildWorkbenchModel();
    });
    document.getElementById('btn-wb-pos-right')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.position.x = parseFloat((part.position.x + 0.5).toFixed(2));
        rebuildWorkbenchModel();
    });
    document.getElementById('btn-wb-pos-fwd')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.position.z = parseFloat((part.position.z + 0.5).toFixed(2));
        rebuildWorkbenchModel();
    });
    document.getElementById('btn-wb-pos-back')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.position.z = parseFloat((part.position.z - 0.5).toFixed(2));
        rebuildWorkbenchModel();
    });
    document.getElementById('btn-wb-rot-y')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.rotationY = (part.rotationY || 0) + Math.PI / 4;
        rebuildWorkbenchModel();
    });

    // Shape selection for active part
    document.querySelectorAll('.workbench-shape-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const shape = (e.currentTarget as HTMLElement).getAttribute('data-shape') as any;
            if (shape) {
                currentWorkbenchState.shapeType = shape;
                const part = getActiveWorkbenchPart();
                part.shapeType = shape;
                syncWorkbenchUI();
            }
        });
    });

    // Color & Behavior
    const colorInp = document.getElementById('workbench-color-input') as HTMLInputElement | null;
    if (colorInp) {
        colorInp.addEventListener('input', () => {
            currentWorkbenchState.color = colorInp.value;
            const part = getActiveWorkbenchPart();
            part.color = colorInp.value;
            rebuildWorkbenchModel();
        });
    }


    // Height / Elevation Push-Pull Buttons and Sliders
    document.getElementById('btn-wb-height-up')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.height = Math.min(12, part.height + 0.5);
        if (part.shapeType === 'wedge') {
            part.topElevation = part.height;
        }
        currentWorkbenchState.height = part.height;
        currentWorkbenchState.topElevation = part.topElevation;
        syncWorkbenchUI();
    });

    document.getElementById('btn-wb-height-down')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.height = Math.max(0.4, part.height - 0.5);
        if (part.shapeType === 'wedge') {
            part.topElevation = Math.min(part.topElevation, part.height);
        }
        currentWorkbenchState.height = part.height;
        currentWorkbenchState.topElevation = part.topElevation;
        syncWorkbenchUI();
    });

    document.getElementById('workbench-slider-height')?.addEventListener('input', (e) => {
        const part = getActiveWorkbenchPart();
        part.height = parseFloat((e.target as HTMLInputElement).value) || 2;
        if (part.shapeType === 'wedge') {
            part.topElevation = part.height;
        }
        currentWorkbenchState.height = part.height;
        currentWorkbenchState.topElevation = part.topElevation;
        syncWorkbenchUI();
    });

    // Width & Depth
    document.getElementById('workbench-slider-width')?.addEventListener('input', (e) => {
        const part = getActiveWorkbenchPart();
        part.width = parseFloat((e.target as HTMLInputElement).value) || 3;
        currentWorkbenchState.width = part.width;
        syncWorkbenchUI();
    });

    document.getElementById('workbench-slider-depth')?.addEventListener('input', (e) => {
        const part = getActiveWorkbenchPart();
        part.depth = parseFloat((e.target as HTMLInputElement).value) || 3;
        currentWorkbenchState.depth = part.depth;
        syncWorkbenchUI();
    });

    // Wedge Ramp elevation
    document.getElementById('btn-wb-elev-up')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.topElevation = Math.min(12, part.topElevation + 0.5);
        currentWorkbenchState.topElevation = part.topElevation;
        syncWorkbenchUI();
    });

    document.getElementById('btn-wb-elev-down')?.addEventListener('click', () => {
        const part = getActiveWorkbenchPart();
        part.topElevation = Math.max(0.2, part.topElevation - 0.5);
        currentWorkbenchState.topElevation = part.topElevation;
        syncWorkbenchUI();
    });

    // Reset
    document.getElementById('btn-wb-reset')?.addEventListener('click', () => {
        currentWorkbenchState.parts = [
            {
                id: 'part_1',
                shapeType: 'box',
                width: 3.0,
                height: 2.0,
                depth: 3.0,
                topElevation: 2.0,
                color: '#00f2fe',
                position: { x: 0, y: 0, z: 0 },
                rotationY: 0
            }
        ];
        currentWorkbenchState.selectedPartIndex = 0;
        syncStateFromActivePart();
        if (colorInp) colorInp.value = '#00f2fe';
        if (behSelect) behSelect.value = 'solid';
        syncWorkbenchUI();
    });

    // Actions
    document.getElementById('btn-workbench-place')?.addEventListener('click', () => {
        placeWorkbenchItemIntoScene();
    });

    document.getElementById('btn-workbench-save')?.addEventListener('click', () => {
        saveWorkbenchItemToLibrary(false);
    });

    document.getElementById('btn-workbench-publish')?.addEventListener('click', () => {
        saveWorkbenchItemToLibrary(true);
    });
}
export { wbCurrentMeshGroup as wbPreviewMesh };
