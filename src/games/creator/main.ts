import * as THREE from 'three';
import { getCurrentUserProfile, isPlayardOwner } from '../../auth';
import { translateDOM, t } from '../../shared/i18n_dict';

// Types
export type {
    ObjectScriptAction,
    ObjectScript,
    PlacedObject,
    SeaConfig,
    SceneSnapshot,
    PlayTestSnapshot,
    CatalogItem,
    StudioToolMode,
    PullEdgeAxis,
    WorkbenchPart,
    WorkbenchState,
    DragPlaneType,
    AiSchoolRule,
    PlayardAiContextMemory
} from './types';

// State bindings
import {
    scene, setScene,
    camera, setCamera,
    renderer, setRenderer,
    clock,
    isCombatSystemEnabled,
    isMoneySystemEnabled,
    isYardsSystemEnabled,
    playerSpeedMultiplier,
    playerSpeedBoostEndTime,
    currentGameMaxPlayers,
    currentGameMinAge,
    currentGameAgeRating,
    dirLight, setDirLight,
    hemiLight, setHemiLight
} from './state/creatorState';

// Re-export state variables for tests and external consumers
export {
    isCombatSystemEnabled,
    isMoneySystemEnabled,
    isYardsSystemEnabled,
    playerSpeedMultiplier,
    playerSpeedBoostEndTime,
    currentGameMaxPlayers,
    currentGameMinAge,
    currentGameAgeRating
};

// Subsystem Modules
import { generate10000ObjectCatalog, getStudioTestPlaybux, updateStudioTestPlaybuxDisplay } from './catalog/creatorCatalog';
export { getStudioTestPlaybux, updateStudioTestPlaybuxDisplay };

import { isAirplaneObject, isBoatObject, createUltraRealisticGrass, createUltraRealisticHuman, createAirplane3DMesh, createSpeedboat3DMesh, createWedgeGeometry, createSinglePartMesh, createCustomModel3DMesh } from './models/objectModels';
export { isAirplaneObject, isBoatObject, createAirplane3DMesh, createSpeedboat3DMesh, createWedgeGeometry, createSinglePartMesh, createCustomModel3DMesh };

import { removeSea, setMapEnvironment, getMapEnvironment, updateMapEnvironmentUI, isPositionInWater, createWholeMapOcean, createPartMapOcean, createIslandOcean, setDayNightMode } from './world/environment';
export { removeSea, setMapEnvironment, getMapEnvironment, updateMapEnvironmentUI, isPositionInWater, createWholeMapOcean, createPartMapOcean, createIslandOcean, setDayNightMode };

import { getStudioToolMode, getPullActiveAxis, setPullActiveAxis, setStudioToolMode, updatePullGizmo, updateMoveGizmo, updateRotateGizmo, showFloatingPullIndicator, hideFloatingPullIndicator, pullSelectedObject, spawnBlockObject, moveSelectedObject, rotateSelectedObject } from './systems/gizmos';
export { getStudioToolMode, getPullActiveAxis, setPullActiveAxis, setStudioToolMode, updatePullGizmo, updateMoveGizmo, updateRotateGizmo, showFloatingPullIndicator, hideFloatingPullIndicator, pullSelectedObject, spawnBlockObject, moveSelectedObject, rotateSelectedObject };

import { enterVehicle, exitVehicle, updateGameplayHUD, equipCustomItemInHand, clearHeldItemFromHand, damagePlayer, healPlayer, isPlayerTouchingOrOnTop, collectCoin, collectKey, playerAttack, triggerVictory, triggerGameOver, respawnPlayerAtCheckpoint, openInGameShop, buyShopItem, openDimensionTravelModal } from './systems/physics';
export { enterVehicle, exitVehicle, updateGameplayHUD, equipCustomItemInHand, clearHeldItemFromHand, damagePlayer, healPlayer, isPlayerTouchingOrOnTop, collectCoin, collectKey, playerAttack, triggerVictory, triggerGameOver, respawnPlayerAtCheckpoint, openInGameShop, buyShopItem, openDimensionTravelModal };

import { playGameSound, playScriptSound, showDialogMessage, executeScriptCustomCode, executeSingleScriptAction, executeObjectScript, applyScriptPreset, renderScriptActionParams, openScriptModal, closeScriptModal, switchScriptTab, saveScriptFromModal, setupScriptingEvents, updateScriptInspectorDisplay } from './systems/scriptRunner';
export { playGameSound, playScriptSound, showDialogMessage, executeScriptCustomCode, executeSingleScriptAction, executeObjectScript, applyScriptPreset, renderScriptActionParams, openScriptModal, closeScriptModal, switchScriptTab, saveScriptFromModal, setupScriptingEvents, updateScriptInspectorDisplay };

import { saveUndoSnapshot, restoreSceneSnapshot, performUndo, performRedo } from './systems/undoRedo';
export { saveUndoSnapshot, restoreSceneSnapshot, performUndo, performRedo };

import { getShapeIcon, getActiveWorkbenchPart, syncActivePartFromState, syncStateFromActivePart, setWorkbenchToolMode, initWorkbench3D, openWorkbenchModal, closeWorkbenchModal, rebuildWorkbenchModel, placeWorkbenchItemIntoScene, saveWorkbenchItemToLibrary } from './workbench/customItemWorkbench';
export { getShapeIcon, getActiveWorkbenchPart, syncActivePartFromState, syncStateFromActivePart, setWorkbenchToolMode, initWorkbench3D, openWorkbenchModal, closeWorkbenchModal, placeWorkbenchItemIntoScene, saveWorkbenchItemToLibrary };

import { updateAiAssistantLocalization, updateAiTierDisplay, setupAiAssistantEvents, loadAiSchoolMemory, saveAiSchoolMemory, updateAiSchoolUiStats, aiContextMemory, executeAiBuild } from './ai/aiBuildEngine';
export { updateAiAssistantLocalization, updateAiTierDisplay, setupAiAssistantEvents, loadAiSchoolMemory, saveAiSchoolMemory, updateAiSchoolUiStats, aiContextMemory, executeAiBuild };

import { serializeCurrentScene, autoSaveDraft, saveCurrentGame, captureSceneSnapshot, processImageFile, setPublishModalThumbnail, clearPublishModalThumbnail, setCheatersConfirmed, openPublishModal, closePublishModal, confirmAndPublishGame, publishCurrentGame, loadSceneFromData, deleteSelectedObject, setObjectPassable, renderCatalogUI, setupStudioEvents, setupCatalogEvents, setupInspectorEvents, startNewEmptyGame, renderMySavedGamesModal, restoreDraftOrFeedbackGame } from './ui/creatorUI';
export { serializeCurrentScene, autoSaveDraft, saveCurrentGame, captureSceneSnapshot, processImageFile, setPublishModalThumbnail, clearPublishModalThumbnail, setCheatersConfirmed, openPublishModal, closePublishModal, confirmAndPublishGame, publishCurrentGame, loadSceneFromData, deleteSelectedObject, setObjectPassable, startNewEmptyGame, renderMySavedGamesModal };

import { setupWorkspaceEvents, renderWorkspaceTree, reparentObject, renameObject, duplicateObjectWithChildren, deleteObjectWithChildren, getDescendantIds, toggleWorkspacePanel } from './ui/workspaceExplorer';
export { setupWorkspaceEvents, renderWorkspaceTree, reparentObject, renameObject, duplicateObjectWithChildren, deleteObjectWithChildren, getDescendantIds, toggleWorkspacePanel };

import { updateOrbitCamera } from './ui/orbitCamera';
import { animate } from './systems/studioLoop';
import { setupCreatorGlobals } from './systems/creatorGlobals';

console.log("3D Game Creator Studio Loading...");

async function initStudio() {
    const prof = getCurrentUserProfile();
    const isEstonian = isPlayardOwner(prof?.email);
    (window as any).playardCurrentLang = isEstonian ? 'et' : 'en';
    
    // Override alert/confirm/prompt to automatically translate messages
    const _originalAlert = window.alert;
    const _originalConfirm = window.confirm;
    const _originalPrompt = window.prompt;
    
    window.alert = function(msg?: any) {
        return _originalAlert.call(window, msg ? t(msg) : msg);
    };
    window.confirm = function(msg?: string) {
        return _originalConfirm.call(window, msg ? t(msg) : msg);
    };
    window.prompt = function(msg?: string, defaultText?: string) {
        return _originalPrompt.call(window, msg ? t(msg) : msg, defaultText ? t(defaultText) : defaultText);
    };

    if (!isEstonian) {
        translateDOM(document.body);
    }

    const container = document.getElementById('canvas-container')!;

    setScene(new THREE.Scene());
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

    setCamera(new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000));
    try {
        setRenderer(new THREE.WebGLRenderer({ antialias: true }));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);
    } catch (e) {
        console.warn('WebGLRenderer failed in Creator Studio, fallback:', e);
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);
        setRenderer({
            domElement: canvas,
            setSize: () => {},
            setPixelRatio: () => {},
            render: () => {},
            shadowMap: { enabled: false, type: 0 }
        } as any);
    }

    // Lighting
    setHemiLight(new THREE.HemisphereLight(0xffffff, 0x444444, 0.7));
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    setDirLight(new THREE.DirectionalLight(0xfffaed, 1.2));
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

    // Attach globals to window.creatorStudio for tests and UI
    setupCreatorGlobals();

    // Generate 10,000 Objects in Catalog
    generate10000ObjectCatalog();
    renderCatalogUI();
    updateStudioTestPlaybuxDisplay();

    // Restore Draft or Admin Feedback Game
    await restoreDraftOrFeedbackGame();

    // Event Listeners
    setupStudioEvents();
    setupCatalogEvents();
    setupInspectorEvents();
    setupWorkspaceEvents();
    setupAiAssistantEvents();

    window.addEventListener('resize', onWindowResize);

    // Initial Camera
    updateOrbitCamera();

    // Start Loop
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

initStudio();
