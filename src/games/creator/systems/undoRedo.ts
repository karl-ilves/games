import { activeSeaConfig } from '../state/creatorState';
import { createAirplane3DMesh, isBoatObject, createSpeedboat3DMesh } from '../models/objectModels';
import { CATALOG_DATABASE } from '../catalog/creatorCatalog';
import { createCustomProceduralMesh } from '../models/proceduralEntities';
import { csState } from "../state/creatorState";
import * as THREE from 'three';
import { SceneSnapshot, PlayTestSnapshot, PlacedObject } from '../types';
import {
    scene,
    placedObjects,
    setPlacedObjects,
    selectedObject,
    setSelectedObject,
    activeQuest,
    setActiveQuest,
    currentEnvMode,
    setCurrentEnvMode,
    undoStack,
    redoStack,
    playTestWorldSnapshots
} from '../state/creatorState';
import { createObjectMesh } from '../models/objectModels';
import {
    createWholeMapOcean,
    createIslandOcean,
    createPartMapOcean,
    removeSea,
    setDayNightMode
} from '../world/environment';
import { updateGameplayHUD } from './physics';
import { updateInspectorDisplay, updateMapEnvironmentUI } from '../ui/creatorUI';

export function saveUndoSnapshot() {
    const titleInput = document.getElementById('game-title-input') as HTMLInputElement | null;
    const catSelect = document.getElementById('game-category-select') as HTMLSelectElement | null;
    const descInput = document.getElementById('game-desc-input') as HTMLInputElement | null;

    const snapshot: SceneSnapshot = {
        title: titleInput ? titleInput.value : 'My 3D Game',
        desc: descInput ? descInput.value : '',
        category: catSelect ? catSelect.value : 'Adventure',
        envMode: currentEnvMode,
        mapType: activeSeaConfig ? 'sea' : 'land',
        seaConfig: activeSeaConfig ? JSON.parse(JSON.stringify(activeSeaConfig)) : null,
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
            isBoat: p.isBoat,
            gameItemType: p.gameItemType,
            keyName: p.keyName,
            requiredKeyName: p.requiredKeyName,
            trigger: p.trigger ? JSON.parse(JSON.stringify(p.trigger)) : undefined,
            script: p.script ? JSON.parse(JSON.stringify(p.script)) : undefined,
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

    // Restore Sea & Ocean environment
    if (snapshot.seaConfig || snapshot.mapType === 'sea') {
        if (snapshot.seaConfig?.type === 'whole' || snapshot.mapType === 'sea') {
            createWholeMapOcean(false);
        } else if (snapshot.seaConfig?.type === 'island') {
            createIslandOcean(false);
        } else if (snapshot.seaConfig?.type === 'part') {
            createPartMapOcean(snapshot.seaConfig.boundary?.axis || 'z', snapshot.seaConfig.boundary?.side || 'negative', false);
        } else {
            createWholeMapOcean(false);
        }
    } else {
        removeSea();
    }
    updateMapEnvironmentUI();

    // Clear existing placed objects
    for (const p of placedObjects) {
        scene.remove(p.mesh);
    }
    csState.placedObjects = [];
    csState.selectedObject = null;

    const titleInput = document.getElementById('game-title-input') as HTMLInputElement | null;
    const catSelect = document.getElementById('game-category-select') as HTMLSelectElement | null;
    const descInput = document.getElementById('game-desc-input') as HTMLInputElement | null;
    if (titleInput) titleInput.value = snapshot.title;
    if (catSelect) catSelect.value = snapshot.category;
    if (descInput) descInput.value = snapshot.desc;

    setDayNightMode(snapshot.envMode || 'day');
    csState.activeQuest = snapshot.quest ? JSON.parse(JSON.stringify(snapshot.quest)) : null;

    for (const objData of snapshot.objects) {
        let mesh: THREE.Group | THREE.Mesh;
        if (objData.isAirplane) {
            mesh = createAirplane3DMesh(objData.color);
        } else if (objData.isBoat || isBoatObject(objData as any)) {
            mesh = createSpeedboat3DMesh(objData.color);
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
            isBoat: objData.isBoat,
            gameItemType: objData.gameItemType as any,
            keyName: objData.keyName,
            requiredKeyName: objData.requiredKeyName,
            trigger: objData.trigger,
            script: objData.script ? JSON.parse(JSON.stringify(objData.script)) : undefined,
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