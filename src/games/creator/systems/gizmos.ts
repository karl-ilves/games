import { autoSaveDraft, selectObject } from '../ui/creatorUI';
import { isPlayTestMode, orbitTarget } from '../state/creatorState';
import { csState } from "../state/creatorState";
import * as THREE from 'three';
import { StudioToolMode, PullEdgeAxis, PlacedObject } from '../types';
import {
    scene,
    camera,
    renderer,
    selectedObject,
    setSelectedObject,
    placedObjects,
    studioToolMode,
    setStudioToolModeState,
    moveGizmoGroup,
    setMoveGizmoGroup,
    moveGizmoHandles,
    isMovingWithGizmo,
    setIsMovingWithGizmo,
    moveActiveAxis,
    setMoveActiveAxis,
    moveStartObjectPos,
    moveStartMousePos,
    moveScreenDir,
    worldUnitsPerPixel,
    setWorldUnitsPerPixel,
    pullActiveAxis,
    setPullActiveAxisState,
    pullActiveSign,
    setPullActiveSign,
    isPullingObject,
    setIsPullingObject,
    pullStartPos,
    pullStartScaleVector,
    pullStartPositionVector,
    pullStartBoxMin,
    pullStartBoxMax,
    pullStartLocalMin,
    pullStartLocalMax,
    pullHandleScreenDir,
    hideIndicatorTimeout,
    setHideIndicatorTimeout,
    pullGizmoGroup,
    setPullGizmoGroup,
    pullGizmoBoxHelper,
    setPullGizmoBoxHelper,
    pullGizmoHandles,
    rotateGizmoGroup,
    setRotateGizmoGroup,
    rotateGizmoHandles,
    isRotatingWithGizmo,
    setIsRotatingWithGizmo,
    rotateActiveAxis,
    setRotateActiveAxis,
    rotateStartObjectRot,
    rotateStartMousePos
} from '../state/creatorState';
import { saveUndoSnapshot } from './undoRedo';
import { updateInspectorDisplay } from '../ui/creatorUI';

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
    if (studioToolMode === 'puller') updatePullGizmo();
    if (studioToolMode === 'mover') updateMoveGizmo();
    if (studioToolMode === 'rotator') updateRotateGizmo();
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
    if (studioToolMode === 'puller') updatePullGizmo();
    if (studioToolMode === 'mover') updateMoveGizmo();
    if (studioToolMode === 'rotator') updateRotateGizmo();
    autoSaveDraft();
}

export function recordPullStartState(obj: PlacedObject) {
    csState.pullStartScaleVector = {
        x: obj.mesh.scale.x || 1,
        y: obj.mesh.scale.y || 1,
        z: obj.mesh.scale.z || 1
    };
    csState.pullStartPositionVector = {
        x: obj.mesh.position.x,
        y: obj.mesh.position.y,
        z: obj.mesh.position.z
    };
    obj.mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj.mesh);
    csState.pullStartBoxMin = { x: box.min.x, y: box.min.y, z: box.min.z };
    csState.pullStartBoxMax = { x: box.max.x, y: box.max.y, z: box.max.z };
    csState.pullStartLocalMin = {
        x: (box.min.x - pullStartPositionVector.x) / pullStartScaleVector.x,
        y: (box.min.y - pullStartPositionVector.y) / pullStartScaleVector.y,
        z: (box.min.z - pullStartPositionVector.z) / pullStartScaleVector.z
    };
    csState.pullStartLocalMax = {
        x: (box.max.x - pullStartPositionVector.x) / pullStartScaleVector.x,
        y: (box.max.y - pullStartPositionVector.y) / pullStartScaleVector.y,
        z: (box.max.z - pullStartPositionVector.z) / pullStartScaleVector.z
    };
}

export function getStudioToolMode(): StudioToolMode {
    return studioToolMode;
}

export function getPullActiveAxis(): PullEdgeAxis {
    return pullActiveAxis;
}

export function setPullActiveAxis(axis: PullEdgeAxis) {
    csState.pullActiveAxis = axis;
    const axes: PullEdgeAxis[] = ['all', 'x', 'y', 'z'];
    axes.forEach(a => {
        const btn = document.getElementById('btn-pull-axis-' + a);
        if (btn) {
            if (a === axis) {
                btn.classList.add('active');
                if (a === 'all') {
                    btn.style.background = '#00f2fe';
                    btn.style.color = '#000';
                } else if (a === 'x') {
                    btn.style.background = '#ff4757';
                    btn.style.color = '#fff';
                } else if (a === 'y') {
                    btn.style.background = '#2ecc71';
                    btn.style.color = '#000';
                } else if (a === 'z') {
                    btn.style.background = '#ffd32a';
                    btn.style.color = '#000';
                }
            } else {
                btn.classList.remove('active');
                btn.style.background = 'transparent';
                btn.style.color = '#94a3b8';
            }
        }
    });

    const axisLabel = document.getElementById('puller-axis-label');
    if (axisLabel) {
        const labelMap: Record<PullEdgeAxis, string> = {
            all: 'Kõik',
            x: 'Laius (X)',
            y: 'Kõrgus (Y)',
            z: 'Pikkus (Z)'
        };
        axisLabel.innerText = labelMap[axis] || 'Kõik';
    }

    updatePullGizmo();
}

export function setStudioToolMode(mode: StudioToolMode) {
    csState.studioToolMode = mode;
    const btnMouse = document.getElementById('btn-tool-mouse');
    const btnMover = document.getElementById('btn-tool-mover');
    const btnPuller = document.getElementById('btn-tool-puller');
    const btnRotator = document.getElementById('btn-tool-rotator');
    const pullerSubpanel = document.getElementById('puller-controls-subpanel');
    const canvasDom = renderer?.domElement;

    [btnMouse, btnMover, btnPuller, btnRotator].forEach(btn => {
        if (btn) {
            btn.classList.remove('active');
            btn.style.background = 'transparent';
            btn.style.color = '#94a3b8';
        }
    });

    if (mode === 'mouse') {
        if (btnMouse) {
            btnMouse.classList.add('active');
            btnMouse.style.background = 'linear-gradient(135deg, #00f2fe, #3b82f6)';
            btnMouse.style.color = '#000';
        }
        if (pullerSubpanel) pullerSubpanel.style.display = 'none';
        if (canvasDom) canvasDom.style.cursor = 'default';
        if (pullGizmoGroup) pullGizmoGroup.visible = false;
        if (moveGizmoGroup) moveGizmoGroup.visible = false;
        if (rotateGizmoGroup) rotateGizmoGroup.visible = false;
    } else if (mode === 'mover') {
        if (btnMover) {
            btnMover.classList.add('active');
            btnMover.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
            btnMover.style.color = '#fff';
        }
        if (pullerSubpanel) pullerSubpanel.style.display = 'none';
        if (canvasDom) canvasDom.style.cursor = 'move';
        if (pullGizmoGroup) pullGizmoGroup.visible = false;
        if (rotateGizmoGroup) rotateGizmoGroup.visible = false;
        updateMoveGizmo();
    } else if (mode === 'rotator') {
        if (btnRotator) {
            btnRotator.classList.add('active');
            btnRotator.style.background = 'linear-gradient(135deg, #a855f7, #6366f1)';
            btnRotator.style.color = '#fff';
        }
        if (pullerSubpanel) pullerSubpanel.style.display = 'none';
        if (canvasDom) canvasDom.style.cursor = 'grab';
        if (pullGizmoGroup) pullGizmoGroup.visible = false;
        if (moveGizmoGroup) moveGizmoGroup.visible = false;
        updateRotateGizmo();
    } else {
        if (btnPuller) {
            btnPuller.classList.add('active');
            btnPuller.style.background = 'linear-gradient(135deg, #ffd32a, #ff9f1a)';
            btnPuller.style.color = '#000';
        }
        if (pullerSubpanel) pullerSubpanel.style.display = 'flex';
        if (canvasDom) canvasDom.style.cursor = 'nwse-resize';
        if (moveGizmoGroup) moveGizmoGroup.visible = false;
        if (rotateGizmoGroup) rotateGizmoGroup.visible = false;
        updatePullGizmo();
    }
}

function initRotateGizmo() {
    if (rotateGizmoGroup) return;
    csState.rotateGizmoGroup = new THREE.Group();
    rotateGizmoGroup.name = 'rotateGizmoGroup';
    scene.add(rotateGizmoGroup);

    const createRing = (axis: 'x' | 'y' | 'z', color: number) => {
        // Torus radius 1.0 (will scale to match object size exactly)
        const ringGeo = new THREE.TorusGeometry(1.0, 0.04, 16, 64);
        const mat = new THREE.MeshBasicMaterial({
            color,
            depthTest: false,
            depthWrite: false,
            transparent: true,
            opacity: 0.95
        });
        const ringMesh = new THREE.Mesh(ringGeo, mat);
        ringMesh.renderOrder = 2000;
        ringMesh.userData = { isRotateGizmoHandle: true, axis };

        // Larger invisible torus for easy raycasting/clicking
        const hitGeo = new THREE.TorusGeometry(1.0, 0.18, 8, 32);
        const hitMat = new THREE.MeshBasicMaterial({ visible: false, transparent: true, opacity: 0 });
        const hitMesh = new THREE.Mesh(hitGeo, hitMat);
        hitMesh.userData = { isRotateGizmoHandle: true, axis };
        ringMesh.add(hitMesh);

        if (axis === 'x') {
            ringMesh.rotation.y = Math.PI / 2; // Normal along X
        } else if (axis === 'y') {
            ringMesh.rotation.x = Math.PI / 2; // Normal along Y
        }
        // axis === 'z' is in XY plane (normal along Z)

        rotateGizmoGroup!.add(ringMesh);
        rotateGizmoHandles.push(ringMesh, hitMesh);
    };

    createRing('x', 0xef4444); // Red X
    createRing('y', 0x22c55e); // Green Y
    createRing('z', 0x3b82f6); // Blue Z
}

export function updateRotateGizmo() {
    if (!rotateGizmoGroup) initRotateGizmo();
    if (!rotateGizmoGroup) return;

    if (studioToolMode !== 'rotator' || !selectedObject || isPlayTestMode) {
        rotateGizmoGroup.visible = false;
        return;
    }

    rotateGizmoGroup.visible = true;
    selectedObject.mesh.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(selectedObject.mesh);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    if (!box.isEmpty()) {
        box.getCenter(center);
        box.getSize(size);
    } else {
        center.copy(selectedObject.mesh.position);
        size.set(2, 2, 2);
    }

    // Centered exactly on the object
    rotateGizmoGroup.position.copy(center);

    // "põõraj peab olema sama suur kui se asi ja selle ümber"
    // Radius matches the bounding dimension of the object closely:
    const maxDim = Math.max(size.x, size.y, size.z, 0.5);
    const ringRadius = (maxDim / 2) * 1.15;
    rotateGizmoGroup.scale.set(ringRadius, ringRadius, ringRadius);
}

function initPullGizmo() {
    if (pullGizmoGroup) return;
    csState.pullGizmoGroup = new THREE.Group();
    pullGizmoGroup.name = 'pullGizmoGroup';
    scene.add(pullGizmoGroup);

    // Unit box geometry so handle.scale controls physical dimensions in meters
    const handleGeo = new THREE.BoxGeometry(1, 1, 1);
    const edgeGeo = new THREE.EdgesGeometry(handleGeo);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthTest: false });

    const createHandle = (axis: 'x' | 'y' | 'z', sign: 1 | -1, color: number, name: string) => {
        const mat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.88,
            depthTest: false
        });
        const mesh = new THREE.Mesh(handleGeo, mat);
        mesh.userData = { isPullGizmoHandle: true, axis, sign, baseColor: color, handleName: name };
        mesh.renderOrder = 1000;

        const line = new THREE.LineSegments(edgeGeo, edgeMat);
        line.renderOrder = 1001;
        mesh.add(line);

        pullGizmoGroup!.add(mesh);
        pullGizmoHandles.push(mesh);
        return mesh;
    };

    createHandle('x', 1, 0xff4757, 'Laius (X+)');
    createHandle('x', -1, 0xff4757, 'Laius (X-)');
    createHandle('y', 1, 0x2ecc71, 'Kõrgus (Y+)');
    createHandle('y', -1, 0x2ecc71, 'Kõrgus (Y-)');
    createHandle('z', 1, 0x00f2fe, 'Pikkus (Z+)');
    createHandle('z', -1, 0x00f2fe, 'Pikkus (Z-)');
}

export function updatePullGizmo() {
    if (!pullGizmoGroup) initPullGizmo();
    if (!pullGizmoGroup) return;

    if (studioToolMode !== 'puller' || !selectedObject || isPlayTestMode) {
        pullGizmoGroup.visible = false;
        return;
    }

    pullGizmoGroup.visible = true;

    // Crucial: sync world matrix before computing bounding box so handles always follow in real-time
    selectedObject.mesh.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(selectedObject.mesh);
    if (box.isEmpty()) {
        pullGizmoGroup.visible = false;
        return;
    }

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    if (!pullGizmoBoxHelper) {
        csState.pullGizmoBoxHelper = new THREE.Box3Helper(box, new THREE.Color(0x00f2fe));
        (pullGizmoBoxHelper.material as THREE.LineBasicMaterial).depthTest = false;
        (pullGizmoBoxHelper.material as THREE.LineBasicMaterial).transparent = true;
        (pullGizmoBoxHelper.material as THREE.LineBasicMaterial).opacity = 0.7;
        pullGizmoBoxHelper.renderOrder = 998;
        pullGizmoGroup.add(pullGizmoBoxHelper);
    } else {
        pullGizmoBoxHelper.box.copy(box);
    }

    // Handles scale along with the block ("ruudud tulevad ploki suurusega kaasa")
    pullGizmoHandles.forEach(h => {
        const { axis, sign } = h.userData;
        const isCurrentActive = pullActiveAxis === axis || pullActiveAxis === 'all';
        const activeMultiplier = isCurrentActive ? 1.15 : 1.0;

        let dimX = 1.8;
        let dimY = 1.8;
        let dimZ = 1.8;

        if (axis === 'x') {
            // Face X (normal ±X): span along Y and Z
            dimY = Math.max(1.8, Math.min(size.y * 0.75, size.y * 0.45)) * activeMultiplier;
            dimZ = Math.max(1.8, Math.min(size.z * 0.75, size.z * 0.45)) * activeMultiplier;
            dimX = Math.max(0.6, Math.min(2.5, Math.min(dimY, dimZ) * 0.28));
            h.scale.set(dimX, dimY, dimZ);

            const pos = center.clone();
            pos.x += sign * (size.x / 2 + dimX / 2);
            h.position.copy(pos);
        } else if (axis === 'y') {
            // Face Y (normal ±Y): span along X and Z
            dimX = Math.max(1.8, Math.min(size.x * 0.75, size.x * 0.45)) * activeMultiplier;
            dimZ = Math.max(1.8, Math.min(size.z * 0.75, size.z * 0.45)) * activeMultiplier;
            dimY = Math.max(0.6, Math.min(2.5, Math.min(dimX, dimZ) * 0.28));
            h.scale.set(dimX, dimY, dimZ);

            const pos = center.clone();
            pos.y += sign * (size.y / 2 + dimY / 2);
            h.position.copy(pos);
        } else if (axis === 'z') {
            // Face Z (normal ±Z): span along X and Y
            dimX = Math.max(1.8, Math.min(size.x * 0.75, size.x * 0.45)) * activeMultiplier;
            dimY = Math.max(1.8, Math.min(size.y * 0.75, size.y * 0.45)) * activeMultiplier;
            dimZ = Math.max(0.6, Math.min(2.5, Math.min(dimX, dimY) * 0.28));
            h.scale.set(dimX, dimY, dimZ);

            const pos = center.clone();
            pos.z += sign * (size.z / 2 + dimZ / 2);
            h.position.copy(pos);
        }

        const mat = h.material as THREE.MeshBasicMaterial;
        mat.opacity = isCurrentActive ? 0.95 : 0.65;
    });
}

function initMoveGizmo() {
    if (moveGizmoGroup) return;
    csState.moveGizmoGroup = new THREE.Group();
    moveGizmoGroup.name = 'moveGizmoGroup';
    moveGizmoGroup.visible = false;
    scene.add(moveGizmoGroup);

    const shaftLen = 3.6;
    const shaftRad = 0.12;
    const coneLen = 1.2;
    const coneRad = 0.42;
    const pickRad = 0.65;

    const createAxisArrow = (axis: 'x' | 'y' | 'z', color: number, name: string) => {
        const axisGroup = new THREE.Group();
        axisGroup.name = `moveGizmoAxis_${axis}`;
        axisGroup.userData = { isMoveGizmoHandle: true, axis, name };

        const mat = new THREE.MeshBasicMaterial({
            color,
            depthTest: false,
            depthWrite: false,
            transparent: true,
            opacity: 0.95
        });

        // Shaft (cylinder along Y by default)
        const shaftGeo = new THREE.CylinderGeometry(shaftRad, shaftRad, shaftLen, 12);
        const shaftMesh = new THREE.Mesh(shaftGeo, mat);
        shaftMesh.position.y = shaftLen / 2;
        shaftMesh.renderOrder = 2000;
        shaftMesh.userData = { isMoveGizmoHandle: true, axis };
        axisGroup.add(shaftMesh);

        // Arrow head (cone pointing along Y)
        const coneGeo = new THREE.ConeGeometry(coneRad, coneLen, 16);
        const coneMesh = new THREE.Mesh(coneGeo, mat);
        coneMesh.position.y = shaftLen + coneLen / 2;
        coneMesh.renderOrder = 2001;
        coneMesh.userData = { isMoveGizmoHandle: true, axis };
        axisGroup.add(coneMesh);

        // Large pick cylinder for easy clicking
        const pickGeo = new THREE.CylinderGeometry(pickRad, pickRad, shaftLen + coneLen + 0.4, 8);
        const pickMat = new THREE.MeshBasicMaterial({ visible: false, transparent: true, opacity: 0 });
        const pickMesh = new THREE.Mesh(pickGeo, pickMat);
        pickMesh.position.y = (shaftLen + coneLen) / 2;
        pickMesh.userData = { isMoveGizmoHandle: true, axis };
        axisGroup.add(pickMesh);

        // Rotate to match axis direction
        if (axis === 'x') {
            axisGroup.rotation.z = -Math.PI / 2; // +Y becomes +X
        } else if (axis === 'z') {
            axisGroup.rotation.x = Math.PI / 2;  // +Y becomes +Z
        }

        moveGizmoGroup!.add(axisGroup);
        moveGizmoHandles.push(shaftMesh, coneMesh, pickMesh);
        return axisGroup;
    };

    createAxisArrow('x', 0xff4757, 'Move X (Punane)');
    createAxisArrow('y', 0x2ecc71, 'Move Y (Roheline)');
    createAxisArrow('z', 0x00f2fe, 'Move Z (Sinine)');
}

export function updateMoveGizmo() {
    if (!moveGizmoGroup) initMoveGizmo();
    if (!moveGizmoGroup) return;

    if (studioToolMode !== 'mover' || !selectedObject || isPlayTestMode) {
        moveGizmoGroup.visible = false;
        return;
    }

    moveGizmoGroup.visible = true;
    selectedObject.mesh.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(selectedObject.mesh);
    const center = new THREE.Vector3();
    if (!box.isEmpty()) {
        box.getCenter(center);
    } else {
        center.copy(selectedObject.mesh.position);
    }

    moveGizmoGroup.position.copy(center);

    const dist = camera.position.distanceTo(center);
    const scale = Math.max(0.5, dist * 0.08);
    moveGizmoGroup.scale.set(scale, scale, scale);
}

// ---- 1:1 ray-plane dragging for the Mover arrows ----
const moveDragPlane = new THREE.Plane();
const moveDragStartHit = new THREE.Vector3();
const moveDragHit = new THREE.Vector3();
const moveDragAxis = new THREE.Vector3(1, 0, 0);
const moveDragStartWorld = new THREE.Vector3();
let moveDragValid = false;
const moveDragRaycaster = new THREE.Raycaster();

/** Builds a world ray from a client (screen) position using the studio camera. */
export function studioRayFromClient(clientX: number, clientY: number): THREE.Ray {
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
    );
    moveDragRaycaster.setFromCamera(ndc, camera);
    return moveDragRaycaster.ray;
}

/**
 * Starts a Mover drag along a world axis. The drag plane contains the axis and
 * faces the camera as much as possible, so cursor motion maps 1:1 to world motion.
 */
export function beginMoveGizmoDrag(axis: 'x' | 'y' | 'z', obj: PlacedObject, ray: THREE.Ray) {
    obj.mesh.updateMatrixWorld(true);
    obj.mesh.getWorldPosition(moveDragStartWorld);
    moveDragAxis.set(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);

    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    const normal = new THREE.Vector3().crossVectors(moveDragAxis, camDir).cross(moveDragAxis);
    if (normal.lengthSq() < 1e-6) normal.copy(camDir).negate();
    normal.normalize();
    moveDragPlane.setFromNormalAndCoplanarPoint(normal, moveDragStartWorld);
    const hit = ray.intersectPlane(moveDragPlane, moveDragStartHit);
    moveDragValid = !!hit;
}

/** Returns the new LOCAL position (in the object's parent space) for the current ray, or null. */
export function computeMoveGizmoDragPosition(obj: PlacedObject, ray: THREE.Ray): THREE.Vector3 | null {
    if (!moveDragValid) return null;
    if (!ray.intersectPlane(moveDragPlane, moveDragHit)) return null;
    const dist = moveDragHit.clone().sub(moveDragStartHit).dot(moveDragAxis);
    const targetWorld = moveDragStartWorld.clone().addScaledVector(moveDragAxis, dist);
    targetWorld.y = Math.max(0, targetWorld.y);
    const parent = obj.mesh.parent;
    if (parent && parent !== scene) {
        parent.updateMatrixWorld(true);
        parent.worldToLocal(targetWorld);
    }
    return targetWorld;
}

export function endMoveGizmoDrag() {
    moveDragValid = false;
}

export function showFloatingPullIndicator(
    clientX: number,
    clientY: number,
    scaleVal: number | { x: number; y: number; z: number },
    axis: PullEdgeAxis = pullActiveAxis
) {
    const indicator = document.getElementById('puller-floating-indicator');
    const valSize = document.getElementById('puller-val-size');
    const axisLabel = document.getElementById('puller-axis-label');
    if (indicator && valSize) {
        let sx: number, sy: number, sz: number;
        if (typeof scaleVal === 'number') {
            sx = scaleVal;
            sy = scaleVal;
            sz = scaleVal;
        } else {
            sx = scaleVal.x || 1;
            sy = scaleVal.y || 1;
            sz = scaleVal.z || 1;
        }
        const w = (2 * sx).toFixed(1);
        const h = (2 * sy).toFixed(1);
        const d = (2 * sz).toFixed(1);

        valSize.innerText = `${w}m x ${h}m x ${d}m (X:${sx.toFixed(1)}, Y:${sy.toFixed(1)}, Z:${sz.toFixed(1)})`;
        if (axisLabel) {
            const labelMap: Record<PullEdgeAxis, string> = {
                all: 'Kõik',
                x: 'Laius (X)',
                y: 'Kõrgus (Y)',
                z: 'Pikkus (Z)'
            };
            axisLabel.innerText = labelMap[axis] || 'Kõik';
        }
        indicator.style.left = clientX + 'px';
        indicator.style.top = (clientY - 25) + 'px';
        indicator.style.display = 'block';
    }
}

export function hideFloatingPullIndicator(delayMs = 0) {
    if (hideIndicatorTimeout) clearTimeout(hideIndicatorTimeout);
    if (delayMs <= 0) {
        const indicator = document.getElementById('puller-floating-indicator');
        if (indicator) indicator.style.display = 'none';
    } else {
        csState.hideIndicatorTimeout = setTimeout(() => {
            const indicator = document.getElementById('puller-floating-indicator');
            if (indicator && !isPullingObject) indicator.style.display = 'none';
        }, delayMs);
    }
}

export function pullSelectedObject(deltaScale: number, axis?: PullEdgeAxis) {
    if (!selectedObject) {
        if (placedObjects.length > 0) {
            selectObject(placedObjects[placedObjects.length - 1]);
        } else {
            spawnBlockObject();
            return;
        }
    }
    if (!selectedObject) return;

    const targetAxis = axis || pullActiveAxis;
    if (targetAxis === 'all') {
        const curX = selectedObject.mesh.scale.x || 1;
        const curY = selectedObject.mesh.scale.y || 1;
        const curZ = selectedObject.mesh.scale.z || 1;
        const newX = Math.max(0.1, Number((curX + deltaScale).toFixed(2)));
        const newY = Math.max(0.1, Number((curY + deltaScale).toFixed(2)));
        const newZ = Math.max(0.1, Number((curZ + deltaScale).toFixed(2)));
        selectedObject.mesh.scale.set(newX, newY, newZ);
        selectedObject.scale.x = newX;
        selectedObject.scale.y = newY;
        selectedObject.scale.z = newZ;
    } else if (targetAxis === 'x') {
        selectedObject.mesh.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(selectedObject.mesh);
        const curX = selectedObject.mesh.scale.x || 1;
        const curPosX = selectedObject.mesh.position.x;
        const localMinX = (box.min.x - curPosX) / curX;
        const localMaxX = (box.max.x - curPosX) / curX;
        const sign = pullActiveSign || 1;

        const newX = Math.max(0.1, Number((curX + deltaScale).toFixed(2)));
        selectedObject.mesh.scale.x = newX;
        selectedObject.scale.x = newX;

        const newPosX = sign > 0 ? (box.min.x - localMinX * newX) : (box.max.x - localMaxX * newX);
        selectedObject.mesh.position.x = newPosX;
        selectedObject.position.x = newPosX;
    } else if (targetAxis === 'y') {
        selectedObject.mesh.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(selectedObject.mesh);
        const curY = selectedObject.mesh.scale.y || 1;
        const curPosY = selectedObject.mesh.position.y;
        const localMinY = (box.min.y - curPosY) / curY;
        const localMaxY = (box.max.y - curPosY) / curY;
        const sign = pullActiveSign || 1;

        const newY = Math.max(0.1, Number((curY + deltaScale).toFixed(2)));
        selectedObject.mesh.scale.y = newY;
        selectedObject.scale.y = newY;

        const newPosY = sign > 0 ? (box.min.y - localMinY * newY) : (box.max.y - localMaxY * newY);
        selectedObject.mesh.position.y = newPosY;
        selectedObject.position.y = newPosY;
    } else if (targetAxis === 'z') {
        selectedObject.mesh.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(selectedObject.mesh);
        const curZ = selectedObject.mesh.scale.z || 1;
        const curPosZ = selectedObject.mesh.position.z;
        const localMinZ = (box.min.z - curPosZ) / curZ;
        const localMaxZ = (box.max.z - curPosZ) / curZ;
        const sign = pullActiveSign || 1;

        const newZ = Math.max(0.1, Number((curZ + deltaScale).toFixed(2)));
        selectedObject.mesh.scale.z = newZ;
        selectedObject.scale.z = newZ;

        const newPosZ = sign > 0 ? (box.min.z - localMinZ * newZ) : (box.max.z - localMaxZ * newZ);
        selectedObject.mesh.position.z = newPosZ;
        selectedObject.position.z = newPosZ;
    }

    updateInspectorDisplay();
    updatePullGizmo();

    const rect = renderer?.domElement?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    showFloatingPullIndicator(cx, cy, selectedObject.mesh.scale, targetAxis);
    hideFloatingPullIndicator(1500);
}

export function spawnBlockObject(color: string = '#00cec9', name: string = 'Part'): PlacedObject {
    const group = new THREE.Group();
    const boxMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.35,
        metalness: 0.15
    });
    const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), boxMat);
    boxMesh.position.y = 1;
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    group.add(boxMesh);

    // Stylish edge highlight
    const wireMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
    const wireGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(2, 2, 2));
    const wireLine = new THREE.LineSegments(wireGeo, wireMat);
    wireLine.position.y = 1;
    group.add(wireLine);

    const spawnX = orbitTarget.x + (Math.random() - 0.5) * 4;
    const spawnZ = orbitTarget.z + (Math.random() - 0.5) * 4;
    group.position.set(spawnX, 0, spawnZ);

    scene.add(group);

    const placed: PlacedObject = {
        id: 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        mesh: group,
        catalogId: 'block_cube',
        name: name,
        category: 'custom',
        position: { x: spawnX, y: 0, z: spawnZ },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        color: color,
        isPassable: false
    };

    placedObjects.push(placed);
    selectObject(placed);
    setStudioToolMode('puller');
    autoSaveDraft();
    return placed;
}
export { moveGizmoGroup, pullGizmoGroup, rotateGizmoGroup, isMovingWithGizmo, isRotatingWithGizmo, moveActiveAxis, rotateActiveAxis, moveStartObjectPos, moveStartMousePos, rotateStartObjectRot, rotateStartMousePos, moveScreenDir, worldUnitsPerPixel, pullActiveSign, isPullingObject, pullStartPos, pullHandleScreenDir, studioToolMode, pullActiveAxis, pullGizmoBoxHelper, pullGizmoHandles, moveGizmoHandles, rotateGizmoHandles } from '../state/creatorState';
