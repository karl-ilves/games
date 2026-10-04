import { createAirplane3DMesh, createSpeedboat3DMesh } from '../models/objectModels';
import { performRedo, performUndo } from '../systems/undoRedo';
import { playerAttack, enterVehicle, respawnPlayerAtCheckpoint, openDimensionTravelModal, equipCustomItemInHand, clearHeldItemFromHand, toggleInventorySlot } from '../systems/physics';
import { nearbyVehicle, moveGizmoHandles, pullGizmoHandles, pullActiveAxis, pullStartScaleVector, pullStartBoxMin, pullStartLocalMin, pullStartBoxMax, pullStartLocalMax, checkpointPosition } from '../state/creatorState';
import { showFloatingPullIndicator, hideFloatingPullIndicator, spawnBlockObject } from '../systems/gizmos';
import { PlayardMobileControls, isMobileOrTabletDevice } from '../../../shared/mobileControls';
import { PlayardImageGenerationEngine } from '../../../shared/imageGenerationEngine';
import { setupScriptingEvents } from '../systems/scriptRunner';
import { csState } from "../state/creatorState";
import {
    renderWorkspaceTree,
    duplicateObjectWithChildren,
    deleteObjectWithChildren,
    getDescendantIds
} from './workspaceExplorer';
import { openHandAnimationEditor } from './handAnimationEditor';
import * as THREE from 'three';
import { PlacedObject, CatalogItem, SceneSnapshot, SeaConfig } from '../types';
import {
    scene,
    camera,
    renderer,
    clock,
    placedObjects,
    setPlacedObjects,
    selectedObject,
    setSelectedObject,
    isPlayTestMode,
    setPlayTestMode,
    studioToolMode,
    setStudioToolModeState,
    keys,
    isRightMouseDown,
    setIsRightMouseDown,
    isLeftMouseDown,
    setIsLeftMouseDown,
    mousePos,
    orbitRadius,
    setOrbitRadius,
    orbitTheta,
    setOrbitTheta,
    orbitPhi,
    setOrbitPhi,
    orbitTarget,
    playerHealth,
    setPlayerHealth,
    playerMaxHealth,
    setPlayerMaxHealth,
    isHealthVisible,
    setIsHealthVisible,
    playerCoins,
    setPlayerCoins,
    isCoinsVisible,
    setIsCoinsVisible,
    playerAsma,
    setPlayerAsma,
    playerMaxAsma,
    setPlayerMaxAsma,
    isAsmaVisible,
    setIsAsmaVisible,
    currentGameMaxPlayers,
    setCurrentGameMaxPlayers,
    currentGameMinAge,
    setCurrentGameMinAge,
    currentGameAgeRating,
    setCurrentGameAgeRating,
    currentVehicle,
    setCurrentVehicle,
    vehicleSpeed,
    setVehicleSpeed,
    humanCharacter,
    characterYaw,
    setCharacterYaw,
    isGrounded,
    setIsGrounded,
    isGameOver,
    setIsGameOver,
    isGameFinished,
    setIsGameFinished,
    playTestWorldSnapshots,
    setPlayTestWorldSnapshots,
    currentPublishThumbnail,
    setCurrentPublishThumbnail,
    isCheatersConfirmed,
    setIsCheatersConfirmed,
    activeFeedbackGameId,
    setActiveFeedbackGameId,
    isDraggingObject,
    setIsDraggingObject,
    dragPlane,
    characterVelocity,
    playerInventory,
    setPlayerInventory,
    equippedInventoryIndex,
    setEquippedInventoryIndex
} from '../state/creatorState';
import { createObjectMesh, createCustomModel3DMesh, isAirplaneObject, isBoatObject } from '../models/objectModels';
import { CATALOG_DATABASE, renderCatalogUI } from '../catalog/creatorCatalog';
import {
    createWholeMapOcean,
    createIslandOcean,
    createPartMapOcean,
    removeSea,
    setMapEnvironment,
    getMapEnvironment,
    updateMapEnvironmentUI,
    activeSeaConfig
} from '../world/environment';
import { saveUndoSnapshot } from '../systems/undoRedo';
import {
    updateMoveGizmo,
    updatePullGizmo,
    getStudioToolMode,
    setStudioToolMode,
    moveGizmoGroup,
    pullGizmoGroup,
    pullSelectedObject,
    moveSelectedObject,
    rotateSelectedObject,
    isMovingWithGizmo,
    setIsMovingWithGizmo,
    moveActiveAxis,
    setMoveActiveAxis,
    moveStartObjectPos,
    moveStartMousePos,
    moveScreenDir,
    worldUnitsPerPixel,
    pullActiveSign,
    setPullActiveSign,
    isPullingObject,
    setIsPullingObject,
    pullStartPos,
    pullHandleScreenDir,
    recordPullStartState,
    setPullActiveAxis
} from '../systems/gizmos';
import { updateGameplayHUD, exitVehicle } from '../systems/physics';
import { executeObjectScript, openScriptModal, updateScriptInspectorDisplay } from '../systems/scriptRunner';
import { openWorkbenchModal } from '../workbench/customItemWorkbench';
import { yardService } from '../../../shared/yardService';
import { getCurrentUserProfile, isPlayardOwner } from '../../../auth';
import { t } from '../../../shared/i18n_dict';
import { updateOrbitCamera } from './orbitCamera';

export function spawnObjectIntoScene(itemOrId: CatalogItem | string) {
    let catalogItem: CatalogItem;
    if (typeof itemOrId === 'string') {
        const found = CATALOG_DATABASE.find(c => c.id === itemOrId || c.geometryType === itemOrId || c.name.toLowerCase().includes(itemOrId.toLowerCase()));
        catalogItem = found || {
            id: itemOrId,
            name: itemOrId,
            category: 'nature',
            icon: '📦',
            color: '#00f2fe',
            geometryType: itemOrId.toLowerCase(),
            baseScale: 1
        };
    } else {
        catalogItem = itemOrId;
    }

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

    const lowerName = (catalogItem.name + ' ' + catalogItem.geometryType + ' ' + catalogItem.id).toLowerCase();
    const isSpawnItem = catalogItem.category === 'spawn' || lowerName.includes('spawn');
    if (isSpawnItem) {
        placed.isSpawnPoint = true;
        if (mesh.userData.isInvisibleSpawn || lowerName.includes('invisible') || lowerName.includes('nähtamatu') || lowerName.includes('beacon') || lowerName.includes('ring')) {
            placed.isInvisibleSpawn = true;
            mesh.userData.isInvisibleSpawn = true;
        }
        if (lowerName.includes('seabed') || lowerName.includes('deep') || lowerName.includes('süvavee')) {
            mesh.position.y = -9.5;
            placed.position.y = -9.5;
        }
    }

    if (lowerName.includes('lava') || lowerName.includes('hazard')) {
        placed.gameItemType = 'hazard';
        placed.script = {
            preset: 'damage',
            trigger: 'onPlayerTouch',
            cooldown: 0.8,
            enabled: true,
            actions: [{ type: 'damage', amount: 25 }]
        };
    } else if (lowerName.includes('spike') || lowerName.includes('blade') || lowerName.includes('laser')) {
        placed.gameItemType = 'hazard';
        placed.script = {
            preset: 'damage',
            trigger: 'onPlayerTouch',
            cooldown: 0.8,
            enabled: true,
            actions: [{ type: 'damage', amount: 20 }]
        };
    } else if (lowerName.includes('medkit') || lowerName.includes('heart') || lowerName.includes('heal') || lowerName.includes('potion')) {
        placed.gameItemType = 'potion';
        placed.script = {
            preset: 'heal',
            trigger: 'onPlayerTouch',
            cooldown: 2.0,
            enabled: true,
            actions: [{ type: 'heal', amount: 35 }]
        };
    } else if (lowerName.includes('speed') || lowerName.includes('booster')) {
        placed.script = {
            preset: 'speed_boost',
            trigger: 'onPlayerTouch',
            cooldown: 2.0,
            enabled: true,
            actions: [{ type: 'speed_boost', speedMultiplier: 2.2, duration: 4.0 }]
        };
    } else if (lowerName.includes('jump')) {
        placed.script = {
            preset: 'jump_boost',
            trigger: 'onPlayerTouch',
            cooldown: 1.0,
            enabled: true,
            actions: [{ type: 'jump_boost', jumpForce: 20 }]
        };
    } else if (lowerName.includes('coin') || lowerName.includes('ring')) {
        placed.gameItemType = 'coin';
        placed.script = {
            preset: 'give_coins',
            trigger: 'onPlayerTouch',
            cooldown: 3.0,
            enabled: true,
            actions: [{ type: 'give_coins', amount: 10 }, { type: 'play_sound', soundName: 'coin' }]
        };
    } else if (lowerName.includes('portal') || lowerName.includes('teleport')) {
        placed.script = {
            preset: 'teleport',
            trigger: 'onPlayerTouch',
            cooldown: 2.0,
            enabled: true,
            actions: [{ type: 'teleport', teleportTarget: { x: 0, y: 0, z: 0 } }]
        };
    } else if (lowerName.includes('finish') || lowerName.includes('goal')) {
        placed.gameItemType = 'goal';
    } else if (lowerName.includes('checkpoint')) {
        placed.gameItemType = 'checkpoint';
    }

    if (catalogItem.customModelData) {
        placed.customModelData = JSON.parse(JSON.stringify(catalogItem.customModelData));
        if (catalogItem.customModelData.isHazard) {
            placed.gameItemType = 'hazard';
            placed.script = {
                preset: 'damage',
                trigger: 'onPlayerTouch',
                cooldown: 0.8,
                enabled: true,
                actions: [{ type: 'damage', amount: 25 }]
            };
        } else if (catalogItem.customModelData.isHeal) {
            placed.gameItemType = 'potion';
            placed.script = {
                preset: 'heal',
                trigger: 'onPlayerTouch',
                cooldown: 2.0,
                enabled: true,
                actions: [{ type: 'heal', amount: 35 }]
            };
        } else if (catalogItem.customModelData.isBoost) {
            placed.script = {
                preset: 'jump_boost',
                trigger: 'onPlayerTouch',
                cooldown: 1.0,
                enabled: true,
                actions: [{ type: 'jump_boost', jumpForce: 22 }]
            };
        }
    }

    if (catalogItem.isHoldable !== undefined || catalogItem.customModelData?.isHoldable !== undefined) {
        placed.isHoldable = catalogItem.isHoldable ?? catalogItem.customModelData?.isHoldable;
        placed.inHandAtStart = catalogItem.inHandAtStart ?? catalogItem.customModelData?.inHandAtStart;
        placed.costsPbx = catalogItem.costsPbx ?? catalogItem.customModelData?.costsPbx;
        placed.pbxPrice = catalogItem.pbxPrice ?? catalogItem.customModelData?.pbxPrice ?? 0;
    }

    if (catalogItem.dealsDamage !== undefined || catalogItem.customModelData?.dealsDamage !== undefined) {
        placed.dealsDamage = catalogItem.dealsDamage ?? catalogItem.customModelData?.dealsDamage;
        placed.damageAmount = catalogItem.damageAmount ?? catalogItem.customModelData?.damageAmount ?? 25;
    }

    placedObjects.push(placed);
    selectObject(placed);
    autoSaveDraft();
    return placed;
}

export function serializeCurrentScene() {
    const titleInput = document.getElementById('game-title-input') as HTMLInputElement | null;
    const catSelect = document.getElementById('game-category-select') as HTMLSelectElement | null;
    const descInput = document.getElementById('game-desc-input') as HTMLInputElement | null;

    const healthInput = document.getElementById('game-player-health-input') as HTMLInputElement | null;
    const healthVisSelect = document.getElementById('game-health-visible-select') as HTMLSelectElement | null;
    const coinsInput = document.getElementById('game-coins-input') as HTMLInputElement | null;
    const coinsVisSelect = document.getElementById('game-coins-visible-select') as HTMLSelectElement | null;
    const asmaInput = document.getElementById('game-asma-input') as HTMLInputElement | null;
    const asmaVisSelect = document.getElementById('game-asma-visible-select') as HTMLSelectElement | null;
    const maxHp = healthInput ? (parseInt(healthInput.value, 10) || 100) : playerMaxHealth;

    const publishPlayersSelect = document.getElementById('publish-max-players') as HTMLSelectElement | null;
    const publishAgeSelect = document.getElementById('publish-age-rating') as HTMLSelectElement | null;
    if (publishPlayersSelect && publishPlayersSelect.value) {
        csState.currentGameMaxPlayers = parseInt(publishPlayersSelect.value, 10) || currentGameMaxPlayers;
    }
    if (publishAgeSelect && publishAgeSelect.value !== undefined) {
        csState.currentGameMinAge = parseInt(publishAgeSelect.value, 10) || 0;
        csState.currentGameAgeRating = currentGameMinAge > 0 ? `${currentGameMinAge}+` : '0+';
    }

    return {
        title: titleInput?.value.trim() || 'My 3D Adventure',
        category: catSelect?.value || 'Adventure',
        description: descInput?.value.trim() || '',
        maxPlayers: currentGameMaxPlayers,
        minAge: currentGameMinAge,
        ageRating: currentGameAgeRating,
        playerMaxHealth: maxHp,
        isHealthVisible: healthVisSelect ? (healthVisSelect.value === 'visible') : isHealthVisible,
        playerCoins: coinsInput ? (parseInt(coinsInput.value, 10) || 0) : playerCoins,
        isCoinsVisible: coinsVisSelect ? (coinsVisSelect.value === 'visible') : isCoinsVisible,
        playerMaxAsma: asmaInput ? (parseInt(asmaInput.value, 10) || 100) : playerMaxAsma,
        isAsmaVisible: asmaVisSelect ? (asmaVisSelect.value === 'visible') : isAsmaVisible,
        mapType: activeSeaConfig ? 'sea' : 'land',
        seaConfig: activeSeaConfig ? JSON.parse(JSON.stringify(activeSeaConfig)) : null,
        objects: placedObjects.map(p => {
            const pos = p.movement?.origin
                ? { x: p.movement.origin.x, y: p.movement.origin.y, z: p.movement.origin.z }
                : { x: p.mesh.position.x, y: p.mesh.position.y, z: p.mesh.position.z };
            return {
                id: p.id,
                parentId: p.parentId || null,
                catalogId: p.catalogId,
                name: p.name,
                category: p.category,
                position: pos,
                rotation: { x: p.mesh.rotation.x, y: p.mesh.rotation.y, z: p.mesh.rotation.z },
                scale: { x: p.mesh.scale.x, y: p.mesh.scale.y, z: p.mesh.scale.z },
                color: p.color,
                isPassable: p.isPassable,
                isAirplane: p.isAirplane,
                isBoat: p.isBoat,
                gameItemType: p.gameItemType,
                keyName: p.keyName,
                requiredKeyName: p.requiredKeyName,
                enemyData: p.enemyData ? JSON.parse(JSON.stringify(p.enemyData)) : undefined,
                trigger: p.trigger,
                script: p.script ? JSON.parse(JSON.stringify(p.script)) : undefined,
                movement: p.movement ? JSON.parse(JSON.stringify(p.movement)) : undefined,
                customModelData: p.customModelData ? JSON.parse(JSON.stringify(p.customModelData)) : undefined,
                isHoldable: p.isHoldable,
                inHandAtStart: p.inHandAtStart,
                costsPbx: p.costsPbx,
                pbxPrice: p.pbxPrice,
                dealsDamage: p.dealsDamage,
                damageAmount: p.damageAmount,
                portalTargetId: p.portalTargetId,
                portalTargetTitle: p.portalTargetTitle
            };
        }),
        updatedAt: Date.now()
    };
}

export function autoSaveDraft() {
    if (isPlayTestMode) return;
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

export function captureSceneSnapshot(): string | null {
    try {
        if (renderer && scene && camera && typeof renderer.render === 'function') {
            renderer.render(scene, camera);
            if (renderer.domElement && typeof renderer.domElement.toDataURL === 'function') {
                return renderer.domElement.toDataURL('image/jpeg', 0.85);
            }
        }
    } catch (e) {
        console.warn('Could not capture scene snapshot:', e);
    }
    return null;
}

export function processImageFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const rawDataUrl = e.target?.result as string;
            if (!rawDataUrl) {
                return reject(new Error('Failed to read image file'));
            }
            const img = new Image();
            img.onload = () => {
                const maxDim = 800;
                let w = img.width;
                let h = img.height;
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', 0.85));
                } else {
                    resolve(rawDataUrl);
                }
            };
            img.onerror = () => resolve(rawDataUrl);
            img.src = rawDataUrl;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export function setPublishModalThumbnail(dataUrl: string) {
    csState.currentPublishThumbnail = dataUrl;
    const emptyState = document.getElementById('publish-image-empty-state');
    const previewContainer = document.getElementById('publish-image-preview-container');
    const previewImg = document.getElementById('publish-image-preview') as HTMLImageElement | null;
    if (emptyState) emptyState.style.display = 'none';
    if (previewContainer) previewContainer.style.display = 'block';
    if (previewImg) previewImg.src = dataUrl;
}

export function clearPublishModalThumbnail() {
    csState.currentPublishThumbnail = null;
    const emptyState = document.getElementById('publish-image-empty-state');
    const previewContainer = document.getElementById('publish-image-preview-container');
    const previewImg = document.getElementById('publish-image-preview') as HTMLImageElement | null;
    const fileInput = document.getElementById('publish-game-image-input') as HTMLInputElement | null;
    if (emptyState) emptyState.style.display = 'flex';
    if (previewContainer) previewContainer.style.display = 'none';
    if (previewImg) previewImg.src = '';
    if (fileInput) fileInput.value = '';
}

export function setCheatersConfirmed(confirmed: boolean) {
    csState.isCheatersConfirmed = confirmed;
    const badgeEl = document.getElementById('cheaters-status-badge');
    const warnEl = document.getElementById('cheaters-tap-ok-warning');
    const panelEl = document.getElementById('cheaters-config-panel');
    const sectionEl = document.getElementById('publish-cheaters-section');

    if (warnEl) warnEl.style.display = 'none';

    if (confirmed) {
        if (badgeEl) {
            badgeEl.textContent = '✅ Confirmed (OK)';
            badgeEl.style.background = 'rgba(16, 185, 129, 0.15)';
            badgeEl.style.color = '#34d399';
            badgeEl.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        }
        if (sectionEl) {
            sectionEl.style.borderColor = '#10b981';
            sectionEl.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.25)';
        }
    } else {
        if (badgeEl) {
            badgeEl.textContent = '⚠️ Needs Confirmation';
            badgeEl.style.background = 'rgba(239, 68, 68, 0.15)';
            badgeEl.style.color = '#f87171';
            badgeEl.style.borderColor = 'rgba(239, 68, 68, 0.4)';
        }
        if (sectionEl) {
            sectionEl.style.borderColor = '#a855f7';
            sectionEl.style.boxShadow = 'none';
        }
    }
}

export function openPublishModal() {
    const modal = document.getElementById('publish-game-modal');
    if (!modal) return;

    const sceneData = serializeCurrentScene();
    const titleInput = document.getElementById('publish-game-title') as HTMLInputElement | null;
    const descInput = document.getElementById('publish-game-desc') as HTMLTextAreaElement | null;
    const playersSelect = document.getElementById('publish-max-players') as HTMLSelectElement | null;
    const ageSelect = document.getElementById('publish-age-rating') as HTMLSelectElement | null;

    if (titleInput) {
        titleInput.value = sceneData.title || 'My 3D Adventure';
    }
    if (descInput) {
        descInput.value = sceneData.description || '';
    }
    if (playersSelect) {
        playersSelect.value = String(sceneData.maxPlayers || currentGameMaxPlayers || 8);
    }
    if (ageSelect) {
        ageSelect.value = String(sceneData.minAge ?? currentGameMinAge ?? 0);
    }

    if (sceneData.thumbnail) {
        setPublishModalThumbnail(sceneData.thumbnail);
    } else {
        const snap = captureSceneSnapshot();
        if (snap) {
            setPublishModalThumbnail(snap);
        } else {
            clearPublishModalThumbnail();
        }
    }

    // Check/reset Cheaters security state
    if (sceneData.cheatersPolicy?.confirmed) {
        setCheatersConfirmed(true);
    } else {
        setCheatersConfirmed(false);
    }
    if (sceneData.cheatersPolicy) {
        if (sceneData.cheatersPolicy.moneyInterval) {
            const intEl = document.getElementById('cheat-money-interval') as HTMLSelectElement | null;
            if (intEl) intEl.value = sceneData.cheatersPolicy.moneyInterval;
        }
        if (sceneData.cheatersPolicy.moneyMaxAmount !== undefined) {
            const maxEl = document.getElementById('cheat-money-max-amount') as HTMLInputElement | null;
            if (maxEl) maxEl.value = String(sceneData.cheatersPolicy.moneyMaxAmount);
        }
        if (sceneData.cheatersPolicy.detectMoney !== undefined) {
            const moneyChk = document.getElementById('cheat-detect-money') as HTMLInputElement | null;
            if (moneyChk) moneyChk.checked = !!sceneData.cheatersPolicy.detectMoney;
            const optionsEl = document.getElementById('cheat-money-options');
            if (optionsEl) optionsEl.style.display = sceneData.cheatersPolicy.detectMoney ? 'grid' : 'none';
        }
    }
    const warnEl = document.getElementById('cheaters-tap-ok-warning');
    if (warnEl) warnEl.style.display = 'none';
    const panelEl = document.getElementById('cheaters-config-panel');
    if (panelEl) panelEl.style.display = 'none';

    modal.style.display = 'flex';
}

export function closePublishModal() {
    const modal = document.getElementById('publish-game-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

export async function confirmAndPublishGame() {
    // If user hasn't confirmed Cheaters security, show "Tap OK" and display the section
    if (!isCheatersConfirmed) {
        const warnEl = document.getElementById('cheaters-tap-ok-warning');
        const panelEl = document.getElementById('cheaters-config-panel');
        const sectionEl = document.getElementById('publish-cheaters-section');
        if (warnEl) warnEl.style.display = 'flex';
        if (panelEl) panelEl.style.display = 'flex';
        if (sectionEl) {
            sectionEl.style.borderColor = '#ef4444';
            sectionEl.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.45)';
            sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return false;
    }

    const titleInput = document.getElementById('publish-game-title') as HTMLInputElement | null;
    const descInput = document.getElementById('publish-game-desc') as HTMLTextAreaElement | null;
    const playersSelect = document.getElementById('publish-max-players') as HTMLSelectElement | null;
    const ageSelect = document.getElementById('publish-age-rating') as HTMLSelectElement | null;

    const gameTitle = titleInput?.value.trim() || 'My 3D Adventure';
    const gameDesc = descInput?.value.trim() || '';
    const maxPlayers = playersSelect ? (parseInt(playersSelect.value, 10) || 8) : currentGameMaxPlayers;
    const minAge = ageSelect ? (parseInt(ageSelect.value, 10) || 0) : currentGameMinAge;
    const ageRating = minAge > 0 ? `${minAge}+` : '0+';

    csState.currentGameMaxPlayers = maxPlayers;
    csState.currentGameMinAge = minAge;
    csState.currentGameAgeRating = ageRating;

    const moneyInterval = (document.getElementById('cheat-money-interval') as HTMLSelectElement)?.value || '5m';
    const moneyMaxAmount = parseInt((document.getElementById('cheat-money-max-amount') as HTMLInputElement)?.value || '1000', 10);

    const cheatersPolicy = {
        detectFly: (document.getElementById('cheat-detect-fly') as HTMLInputElement)?.checked ?? true,
        detectTeleport: (document.getElementById('cheat-detect-teleport') as HTMLInputElement)?.checked ?? true,
        detectMoney: (document.getElementById('cheat-detect-money') as HTMLInputElement)?.checked ?? true,
        moneyInterval,
        moneyMaxAmount,
        detectAutoClick: (document.getElementById('cheat-detect-autoclick') as HTMLInputElement)?.checked ?? true,
        detectGodmode: (document.getElementById('cheat-detect-godmode') as HTMLInputElement)?.checked ?? true,
        action: (document.getElementById('cheat-ban-action') as HTMLSelectElement)?.value || 'ban_perm',
        sensitivity: (document.getElementById('cheat-sensitivity') as HTMLSelectElement)?.value || 'high',
        confirmed: true,
        confirmedAt: Date.now()
    };

    const sceneTitleInput = document.getElementById('game-title-input') as HTMLInputElement | null;
    if (sceneTitleInput) sceneTitleInput.value = gameTitle;
    const sceneDescInput = document.getElementById('game-desc-input') as HTMLInputElement | null;
    if (sceneDescInput) sceneDescInput.value = gameDesc;

    closePublishModal();

    return await publishCurrentGame({
        title: gameTitle,
        description: gameDesc,
        maxPlayers,
        minAge,
        ageRating,
        thumbnail: currentPublishThumbnail || undefined,
        cheatersPolicy
    });
}

export async function publishCurrentGame(options?: {
    title?: string;
    description?: string;
    maxPlayers?: number;
    minAge?: number;
    ageRating?: string;
    thumbnail?: string;
    cheatersPolicy?: any;
}) {
    // Confirmation prompt ("are you shure")
    const isConfirmed = confirm('Are you sure you want to publish this game?');
    if (!isConfirmed) {
        return false;
    }

    const profile = getCurrentUserProfile();
    const username = profile?.username || 'GuestCreator';

    const sceneData = serializeCurrentScene();
    const title = options?.title || sceneData.title || 'My 3D Adventure';
    const category = sceneData.category || 'Adventure';
    const description = options?.description !== undefined ? options.description : (sceneData.description || '');
    const maxPlayers = options?.maxPlayers !== undefined ? options.maxPlayers : (sceneData.maxPlayers || currentGameMaxPlayers || 8);
    const minAge = options?.minAge !== undefined ? options.minAge : (sceneData.minAge ?? currentGameMinAge ?? 0);
    const ageRating = options?.ageRating !== undefined ? options.ageRating : (sceneData.ageRating || (minAge > 0 ? `${minAge}+` : '0+'));
    const thumbnail = options?.thumbnail !== undefined ? options.thumbnail : (currentPublishThumbnail || sceneData.thumbnail || '');
    const cheatersPolicy = options?.cheatersPolicy !== undefined ? options.cheatersPolicy : sceneData.cheatersPolicy;

    sceneData.title = title;
    sceneData.description = description;
    sceneData.maxPlayers = maxPlayers;
    sceneData.minAge = minAge;
    sceneData.ageRating = ageRating;
    if (thumbnail) {
        sceneData.thumbnail = thumbnail;
    }
    if (cheatersPolicy) {
        sceneData.cheatersPolicy = cheatersPolicy;
    }

    const submitBtn = document.getElementById('btn-submit-review');
    const confirmPublishBtn = document.getElementById('btn-confirm-publish');
    if (submitBtn) {
        submitBtn.innerText = 'Publishing...';
        (submitBtn as HTMLButtonElement).disabled = true;
    }
    if (confirmPublishBtn) {
        confirmPublishBtn.innerText = 'Publishing...';
        (confirmPublishBtn as HTMLButtonElement).disabled = true;
    }

    const res = await yardService.submitGameForReview({
        creatorUsername: username,
        title,
        description,
        category,
        thumbnail: thumbnail || sceneData.thumbnail,
        sceneData,
        status: 'approved',
        maxPlayers,
        minAge,
        ageRating,
        cheatersPolicy: cheatersPolicy || sceneData.cheatersPolicy
    });

    if (submitBtn) {
        submitBtn.innerHTML = '<span>🚀</span> <span>Publish a game</span>';
        (submitBtn as HTMLButtonElement).disabled = false;
    }
    if (confirmPublishBtn) {
        confirmPublishBtn.innerHTML = '<span>Publish Game</span>';
        (confirmPublishBtn as HTMLButtonElement).disabled = false;
    }

    if (res.success) {
        sceneData.thumbnail = thumbnail || sceneData.thumbnail;
        yardService.saveUserGame(username, sceneData);
        autoSaveDraft();

        // Finish a game notification and option to play now or stay in Studio
        const playNow = confirm(`🎉 Finish a game!\n\n"${title}" has been published and is now live and public for everyone to play!\n\nPress OK to play your game now, or Cancel to stay in Creator Studio.`);
        if (playNow) {
            window.location.href = `../play/index.html?id=${res.gameId}`;
        }
        return true;
    } else {
        alert('Could not publish game: ' + res.message);
        return false;
    }
}

export function loadSceneFromData(sceneData: any) {
    if (!sceneData) return;

    // Restore Sea & Ocean environment if present
    if (sceneData.seaConfig || sceneData.mapType === 'sea') {
        if (sceneData.seaConfig?.type === 'whole' || sceneData.mapType === 'sea') {
            createWholeMapOcean(false);
        } else if (sceneData.seaConfig?.type === 'island') {
            createIslandOcean(false);
        } else if (sceneData.seaConfig?.type === 'part') {
            createPartMapOcean(sceneData.seaConfig.boundary?.axis || 'z', sceneData.seaConfig.boundary?.side || 'negative', false);
        } else {
            createWholeMapOcean(false);
        }
    } else {
        removeSea();
    }
    updateMapEnvironmentUI();

    // Clear current placed objects
    placedObjects.forEach(p => scene.remove(p.mesh));
    csState.placedObjects = [];
    selectObject(null);

    const titleInput = document.getElementById('game-title-input') as HTMLInputElement | null;
    const catSelect = document.getElementById('game-category-select') as HTMLSelectElement | null;
    const descInput = document.getElementById('game-desc-input') as HTMLInputElement | null;

    if (titleInput && sceneData.title) titleInput.value = sceneData.title;
    if (catSelect && sceneData.category) catSelect.value = sceneData.category;
    if (descInput && sceneData.description) descInput.value = sceneData.description;

    if (sceneData.maxPlayers !== undefined) {
        csState.currentGameMaxPlayers = Number(sceneData.maxPlayers) || 8;
    } else {
        csState.currentGameMaxPlayers = 8;
    }
    if (sceneData.minAge !== undefined) {
        csState.currentGameMinAge = Number(sceneData.minAge) || 0;
    } else {
        csState.currentGameMinAge = 0;
    }
    if (sceneData.ageRating !== undefined) {
        csState.currentGameAgeRating = String(sceneData.ageRating);
    } else {
        csState.currentGameAgeRating = currentGameMinAge > 0 ? `${currentGameMinAge}+` : '0+';
    }

    const healthInput = document.getElementById('game-player-health-input') as HTMLInputElement | null;
    const healthVisSelect = document.getElementById('game-health-visible-select') as HTMLSelectElement | null;
    const coinsInput = document.getElementById('game-coins-input') as HTMLInputElement | null;
    const coinsVisSelect = document.getElementById('game-coins-visible-select') as HTMLSelectElement | null;
    const asmaInput = document.getElementById('game-asma-input') as HTMLInputElement | null;
    const asmaVisSelect = document.getElementById('game-asma-visible-select') as HTMLSelectElement | null;

    if (sceneData.playerMaxHealth) {
        csState.playerMaxHealth = Number(sceneData.playerMaxHealth) || 100;
        csState.playerHealth = playerMaxHealth;
        if (healthInput) healthInput.value = playerMaxHealth.toString();
    }
    if (sceneData.isHealthVisible !== undefined) {
        csState.isHealthVisible = !!sceneData.isHealthVisible;
        if (healthVisSelect) healthVisSelect.value = isHealthVisible ? 'visible' : 'unvisible';
    }
    if (sceneData.playerCoins !== undefined || sceneData.playerInitialCoins !== undefined) {
        csState.playerCoins = Number(sceneData.playerCoins ?? sceneData.playerInitialCoins) || 0;
        if (coinsInput) coinsInput.value = playerCoins.toString();
    }
    if (sceneData.isCoinsVisible !== undefined) {
        csState.isCoinsVisible = !!sceneData.isCoinsVisible;
        if (coinsVisSelect) coinsVisSelect.value = isCoinsVisible ? 'visible' : 'unvisible';
    }
    if (sceneData.playerMaxAsma !== undefined) {
        csState.playerMaxAsma = Number(sceneData.playerMaxAsma) || 100;
        csState.playerAsma = playerMaxAsma;
        if (asmaInput) asmaInput.value = playerMaxAsma.toString();
    }
    if (sceneData.isAsmaVisible !== undefined) {
        csState.isAsmaVisible = !!sceneData.isAsmaVisible;
        if (asmaVisSelect) asmaVisSelect.value = isAsmaVisible ? 'visible' : 'unvisible';
    }
    updateGameplayHUD();

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

            let mesh: THREE.Group | THREE.Mesh;
            if (objData.customModelData) {
                mesh = createCustomModel3DMesh(objData.customModelData, objData.color);
            } else if (objData.isAirplane) {
                mesh = createAirplane3DMesh(objData.color);
            } else if (objData.isBoat || isBoatObject(objData)) {
                mesh = createSpeedboat3DMesh(objData.color);
            } else {
                mesh = createObjectMesh(catItem, objData.color);
            }

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
                isSpawnPoint: objData.isSpawnPoint,
                isInvisibleSpawn: objData.isInvisibleSpawn,
                isAirplane: objData.isAirplane,
                isBoat: objData.isBoat,
                position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
                rotation: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z },
                scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z },
                color: objData.color || catItem.color,
                isPassable: objData.isPassable,
                gameItemType: objData.gameItemType,
                keyName: objData.keyName,
                requiredKeyName: objData.requiredKeyName,
                enemyData: objData.enemyData,
                trigger: objData.trigger,
                script: objData.script ? JSON.parse(JSON.stringify(objData.script)) : undefined,
                customModelData: objData.customModelData ? JSON.parse(JSON.stringify(objData.customModelData)) : undefined,
                isHoldable: objData.isHoldable,
                inHandAtStart: objData.inHandAtStart,
                costsPbx: objData.costsPbx,
                pbxPrice: objData.pbxPrice,
                dealsDamage: objData.dealsDamage,
                damageAmount: objData.damageAmount,
                portalTargetId: objData.portalTargetId || objData.trigger?.targetWorldId,
                portalTargetTitle: objData.portalTargetTitle || objData.trigger?.targetWorldTitle,
                movement: objData.movement ? JSON.parse(JSON.stringify(objData.movement)) : undefined,
                parentId: objData.parentId || null
            };

            if (placed.movement) {
                placed.movement.origin = { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z };
            }

            placedObjects.push(placed);
        });

        // Re-attach children to their parents in the Three.js scene graph
        placedObjects.forEach(obj => {
            if (obj.parentId) {
                const parentObj = placedObjects.find(p => p.id === obj.parentId);
                if (parentObj?.mesh) {
                    parentObj.mesh.attach(obj.mesh);
                }
            }
        });
        renderWorkspaceTree();
    }
}

export function deleteSelectedObject() {
    if (!selectedObject) return;
    deleteObjectWithChildren(selectedObject);
}

export function updateInspectorDisplay() {
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
    const scaleInput = document.getElementById('obj-scale-input') as HTMLInputElement | null;
    const scaleXInput = document.getElementById('obj-scale-x-input') as HTMLInputElement | null;
    const scaleYInput = document.getElementById('obj-scale-y-input') as HTMLInputElement | null;
    const scaleZInput = document.getElementById('obj-scale-z-input') as HTMLInputElement | null;

    if (scaleInput && document.activeElement !== scaleInput) {
        scaleInput.value = selectedObject.mesh.scale.x.toFixed(2);
    }
    if (scaleXInput && document.activeElement !== scaleXInput) {
        scaleXInput.value = selectedObject.mesh.scale.x.toFixed(2);
    }
    if (scaleYInput && document.activeElement !== scaleYInput) {
        scaleYInput.value = selectedObject.mesh.scale.y.toFixed(2);
    }
    if (scaleZInput && document.activeElement !== scaleZInput) {
        scaleZInput.value = selectedObject.mesh.scale.z.toFixed(2);
    }
}

export function selectObject(placed: PlacedObject | null) {
    csState.selectedObject = placed;
    const info = document.getElementById('selected-object-info');
    const props = document.getElementById('selected-object-props');
    const scaleInput = document.getElementById('obj-scale-input') as HTMLInputElement | null;
    const scaleXInput = document.getElementById('obj-scale-x-input') as HTMLInputElement | null;
    const scaleYInput = document.getElementById('obj-scale-y-input') as HTMLInputElement | null;
    const scaleZInput = document.getElementById('obj-scale-z-input') as HTMLInputElement | null;
    const colorInput = document.getElementById('obj-color-input') as HTMLInputElement | null;

    if (!placed) {
        if (info) info.style.display = 'block';
        if (props) props.style.display = 'none';
        updateScriptInspectorDisplay(null);
        if (pullGizmoGroup) pullGizmoGroup.visible = false;
        if (moveGizmoGroup) moveGizmoGroup.visible = false;
        renderWorkspaceTree();
        return;
    }

    if (info) info.style.display = 'none';
    if (props) props.style.display = 'block';

    const nameInp = document.getElementById('obj-name-input') as HTMLInputElement | null;
    if (nameInp) {
        nameInp.value = placed.name || 'Part';
    }

    const parentSelect = document.getElementById('obj-parent-select') as HTMLSelectElement | null;
    if (parentSelect) {
        const descendantIds = getDescendantIds(placed.id);
        let html = '<option value="none">🌐 Workspace (Juurtase)</option>';
        placedObjects.forEach(other => {
            if (other.id !== placed.id && !descendantIds.has(other.id)) {
                const isSelected = other.id === placed.parentId ? 'selected' : '';
                html += `<option value="${other.id}" ${isSelected}>${other.name || 'Part'}</option>`;
            }
        });
        parentSelect.innerHTML = html;
    }

    updateInspectorDisplay();
    updateScriptInspectorDisplay(placed);

    if (scaleInput) {
        scaleInput.value = placed.mesh.scale.x.toString();
    }
    if (scaleXInput) {
        scaleXInput.value = placed.mesh.scale.x.toString();
    }
    if (scaleYInput) {
        scaleYInput.value = placed.mesh.scale.y.toString();
    }
    if (scaleZInput) {
        scaleZInput.value = placed.mesh.scale.z.toString();
    }
    if (colorInput) {
        colorInput.value = placed.color;
    }

    const triggerInput = document.getElementById('obj-trigger-text') as HTMLInputElement | null;
    if (triggerInput) {
        triggerInput.value = placed.trigger?.message || '';
    }

    const passableSelect = document.getElementById('obj-passable-select') as HTMLSelectElement | null;
    if (passableSelect) {
        passableSelect.value = placed.isPassable ? 'passable' : 'solid';
    }

    // Sync Holdable and Weapon Settings
    const holdableCheck = document.getElementById('obj-is-holdable-check') as HTMLInputElement | null;
    const holdableSubprops = document.getElementById('obj-holdable-subprops');
    const inHandSelect = document.getElementById('obj-in-hand-select') as HTMLSelectElement | null;
    const pickupTypeSelect = document.getElementById('obj-pickup-type-select') as HTMLSelectElement | null;
    const pbxPriceRow = document.getElementById('obj-pbx-price-row');
    const pbxPriceInput = document.getElementById('obj-pbx-price-input') as HTMLInputElement | null;
    const damageCheck = document.getElementById('obj-deals-damage-check') as HTMLInputElement | null;
    const damageRow = document.getElementById('obj-damage-amount-row');
    const damageInput = document.getElementById('obj-damage-amount-input') as HTMLInputElement | null;

    const isHoldable = !!(placed.isHoldable || placed.customModelData?.isHoldable);
    if (holdableCheck) holdableCheck.checked = isHoldable;
    if (holdableSubprops) holdableSubprops.style.display = isHoldable ? 'flex' : 'none';

    if (inHandSelect) {
        inHandSelect.value = (placed.inHandAtStart || placed.customModelData?.inHandAtStart) ? 'true' : 'false';
    }
    const costsPbx = !!(placed.costsPbx || placed.customModelData?.costsPbx);
    if (pickupTypeSelect) {
        pickupTypeSelect.value = costsPbx ? 'pbx' : 'free';
    }
    if (pbxPriceRow) {
        pbxPriceRow.style.display = costsPbx ? 'flex' : 'none';
    }
    if (pbxPriceInput) {
        pbxPriceInput.value = (placed.pbxPrice ?? placed.customModelData?.pbxPrice ?? 25).toString();
    }
    const dealsDmg = !!(placed.dealsDamage || placed.customModelData?.dealsDamage);
    if (damageCheck) damageCheck.checked = dealsDmg;
    if (damageRow) damageRow.style.display = dealsDmg ? 'flex' : 'none';
    if (damageInput) {
        damageInput.value = (placed.damageAmount ?? placed.customModelData?.damageAmount ?? 25).toString();
    }

    if (studioToolMode === 'puller') {
        updatePullGizmo();
    } else if (pullGizmoGroup) {
        pullGizmoGroup.visible = false;
    }

    if (studioToolMode === 'mover') {
        updateMoveGizmo();
    } else if (moveGizmoGroup) {
        moveGizmoGroup.visible = false;
    }
    renderWorkspaceTree();
}

export function setObjectPassable(obj: PlacedObject, isPassable: boolean) {
    obj.isPassable = isPassable;
    if (selectedObject === obj) {
        const passableSelect = document.getElementById('obj-passable-select') as HTMLSelectElement | null;
        if (passableSelect) {
            passableSelect.value = isPassable ? 'passable' : 'solid';
        }
    }
    autoSaveDraft();
}

export function renderCatalogUI(filterCat = 'spawn', searchQuery = '') {
    const profile = getCurrentUserProfile();
    const myCustomItems = yardService.getPlayerCreatedItems(profile?.username ?? null);
    const communityCustomItems = yardService.getPublishedCommunityItems();

    // Deduplicate custom items by id
    const customMap = new Map<string, any>();
    [...myCustomItems, ...communityCustomItems].forEach(ci => {
        customMap.set(ci.id, {
            id: ci.id,
            name: ci.name,
            category: 'custom' as const,
            icon: ci.icon || '🎨',
            color: ci.color || '#00f2fe',
            geometryType: ci.shapeType,
            baseScale: 1.0,
            customModelData: ci.modelData,
            creatorUsername: ci.creatorUsername
        });
    });
    const combinedCustomCatalogItems: CatalogItem[] = Array.from(customMap.values());

    let items = filterCat === 'custom' ? combinedCustomCatalogItems : (filterCat === 'all' ? [...combinedCustomCatalogItems, ...CATALOG_DATABASE] : CATALOG_DATABASE);
    if (filterCat !== 'all' && filterCat !== 'custom') {
        items = items.filter(i => i.category === filterCat);
    }
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pool = filterCat === 'custom' ? combinedCustomCatalogItems : [...combinedCustomCatalogItems, ...CATALOG_DATABASE];
        items = pool.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || (i.creatorUsername && i.creatorUsername.toLowerCase().includes(q)));
    }

    // Limit render chunk for performance (render first 80, paginate/infinite scroll)
    const displayItems = items.slice(0, 80);

    const container = document.getElementById('catalog-items-container');
    if (!container) return;

    container.innerHTML = '';
    displayItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'object-card';
        if (item.category === 'custom') {
            card.style.borderColor = 'rgba(255, 211, 42, 0.5)';
            card.style.background = 'linear-gradient(135deg, rgba(20,27,36,0.9), rgba(30,41,59,0.9))';
        }
        card.innerHTML = `
            <div class="object-icon">${item.icon}</div>
            <div class="object-title">${item.name}</div>
            ${item.creatorUsername ? `<div style="font-size: 0.68rem; color: #ffd32a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">👤 ${item.creatorUsername}</div>` : ''}
        `;
        card.addEventListener('click', () => {
            spawnObjectIntoScene(item);
        });
        container.appendChild(card);
    });

    const countBadge = document.getElementById('catalog-count-badge');
    if (countBadge) {
        if (!searchQuery.trim()) {
            countBadge.innerText = `${items.length.toLocaleString()} items (10,000 library)`;
        } else {
            countBadge.innerText = `${items.length.toLocaleString()} items`;
        }
    }
}

export function setupStudioEvents() {
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
            // Space Key: Player Jump (prevent default so browser doesn't trigger focused buttons like Play Test toggle)
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                keys['Space'] = true;
                // If any button had focus, blur it immediately so Space never triggers click
                if (document.activeElement && (document.activeElement as HTMLElement).blur) {
                    (document.activeElement as HTMLElement).blur();
                }
                return;
            }

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

            // Number Keys 1, 2, 3, 4, 5, 6, 7, 8, 9, 0: Toggle Roblox Hotbar Inventory Slots
            const numKeys: { [key: string]: number } = {
                'Digit1': 0, 'Numpad1': 0, '1': 0,
                'Digit2': 1, 'Numpad2': 1, '2': 1,
                'Digit3': 2, 'Numpad3': 2, '3': 2,
                'Digit4': 3, 'Numpad4': 3, '4': 3,
                'Digit5': 4, 'Numpad5': 4, '5': 4,
                'Digit6': 5, 'Numpad6': 5, '6': 5,
                'Digit7': 6, 'Numpad7': 6, '7': 6,
                'Digit8': 7, 'Numpad8': 7, '8': 7,
                'Digit9': 8, 'Numpad9': 8, '9': 8,
                'Digit0': 9, 'Numpad0': 9, '0': 9
            };
            const mappedSlot = numKeys[e.code] !== undefined ? numKeys[e.code] : numKeys[e.key];
            if (mappedSlot !== undefined) {
                e.preventDefault();
                toggleInventorySlot(mappedSlot);
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

            // Delete / Backspace: Delete selected object
            if (e.code === 'Delete' || e.code === 'Backspace') {
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
        csState.isGameFinished = false;
        humanCharacter.position.set(0, 0, 0);
        csState.playerHealth = playerMaxHealth;
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

    window.addEventListener('keyup', e => {
        keys[e.code] = false;
        if (e.code === 'Space' || e.key === ' ') {
            keys['Space'] = false;
            if (isPlayTestMode) {
                e.preventDefault();
            }
        }
    });

    const dom = renderer.domElement;

    dom.addEventListener('mousedown', e => {
        if (e.button === 2) {
            csState.isRightMouseDown = true;
            csState.mousePos = { x: e.clientX, y: e.clientY };
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

            if (studioToolMode === 'mover') {
                // 1. Check if any move gizmo arrow was clicked
                const gizmoHits = (moveGizmoGroup?.visible && moveGizmoHandles.length > 0)
                    ? raycaster.intersectObjects(moveGizmoHandles, true)
                    : [];
                if (gizmoHits.length > 0 && selectedObject) {
                    let hitMesh: THREE.Object3D | null = gizmoHits[0].object;
                    let axis = hitMesh?.userData?.axis;
                    while (hitMesh && !axis && hitMesh.parent) {
                        hitMesh = hitMesh.parent;
                        axis = hitMesh?.userData?.axis;
                    }

                    if (axis) {
                        csState.isMovingWithGizmo = true;
                        csState.moveActiveAxis = axis;
                        csState.moveStartMousePos = { x: e.clientX, y: e.clientY };
                        moveStartObjectPos.copy(selectedObject.mesh.position);

                        selectedObject.mesh.updateMatrixWorld(true);
                        const box = new THREE.Box3().setFromObject(selectedObject.mesh);
                        const center = new THREE.Vector3();
                        if (!box.isEmpty()) box.getCenter(center);
                        else center.copy(selectedObject.mesh.position);

                        const centerProj = center.clone().project(camera);
                        const axisUnit = new THREE.Vector3(
                            axis === 'x' ? 1 : 0,
                            axis === 'y' ? 1 : 0,
                            axis === 'z' ? 1 : 0
                        );
                        const tipWorld = center.clone().add(axisUnit);
                        const tipProj = tipWorld.project(camera);

                        let sDx = (tipProj.x - centerProj.x) * (window.innerWidth / 2);
                        let sDy = -(tipProj.y - centerProj.y) * (window.innerHeight / 2);
                        const sLen = Math.hypot(sDx, sDy);

                        if (sLen > 0.001) {
                            csState.moveScreenDir = { x: sDx / sLen, y: sDy / sLen };
                        } else {
                            csState.moveScreenDir = { x: 1, y: 0 };
                        }

                        const dist = camera.position.distanceTo(center);
                        const vFov = (camera.fov * Math.PI) / 180;
                        const visibleHeight = 2 * Math.tan(vFov / 2) * dist;
                        csState.worldUnitsPerPixel = visibleHeight / window.innerHeight;

                        dom.style.cursor = 'grabbing';
                        return;
                    }
                }

                // 2. Direct object click in Mover mode strictly selects, NEVER drags
                if (hitGroup) {
                    selectObject(hitGroup);
                }
            } else if (studioToolMode === 'puller') {
                // 1. First check if any gizmo handle was clicked
                const gizmoHits = (pullGizmoGroup?.visible && pullGizmoHandles.length > 0)
                    ? raycaster.intersectObjects(pullGizmoHandles, false)
                    : [];
                if (gizmoHits.length > 0 && selectedObject) {
                    const handleMesh = gizmoHits[0].object as THREE.Mesh;
                    const { axis, sign } = handleMesh.userData;
                    csState.pullActiveAxis = axis;
                    csState.pullActiveSign = sign || 1;
                    setPullActiveAxis(pullActiveAxis);
                    csState.isPullingObject = true;
                    csState.pullStartPos = { x: e.clientX, y: e.clientY };
                    recordPullStartState(selectedObject);

                    // Compute outward screen direction from object center to handle
                    selectedObject.mesh.updateMatrixWorld(true);
                    const box = new THREE.Box3().setFromObject(selectedObject.mesh);
                    const center = new THREE.Vector3();
                    box.getCenter(center);
                    const cProj = center.clone().project(camera);
                    const hProj = handleMesh.position.clone().project(camera);
                    let sDx = hProj.x - cProj.x;
                    let sDy = -(hProj.y - cProj.y); // invert Y for screen pixels
                    const sLen = Math.hypot(sDx, sDy);
                    if (sLen > 0.01) {
                        csState.pullHandleScreenDir = { x: sDx / sLen, y: sDy / sLen };
                    } else {
                        csState.pullHandleScreenDir = { x: pullActiveSign || 1, y: 0 };
                    }

                    showFloatingPullIndicator(e.clientX, e.clientY, selectedObject.mesh.scale, pullActiveAxis);
                    return;
                }

                // 2. Check if clicked directly on an object mesh and detect face normal
                let hitPlaced: PlacedObject | null = null;
                let hitNormal: THREE.Vector3 | null = null;
                for (const p of placedObjects) {
                    const hits = raycaster.intersectObject(p.mesh, true);
                    if (hits.length > 0) {
                        hitPlaced = p;
                        if (hits[0].face) {
                            hitNormal = hits[0].face.normal.clone().transformDirection(hits[0].object.matrixWorld).normalize();
                        }
                        break;
                    }
                }

                if (hitPlaced) {
                    selectObject(hitPlaced);
                    if (hitNormal) {
                        if (Math.abs(hitNormal.y) > 0.6) {
                            csState.pullActiveAxis = 'y';
                            csState.pullActiveSign = Math.sign(hitNormal.y) || 1;
                        } else if (Math.abs(hitNormal.x) > Math.abs(hitNormal.z)) {
                            csState.pullActiveAxis = 'x';
                            csState.pullActiveSign = Math.sign(hitNormal.x) || 1;
                        } else {
                            csState.pullActiveAxis = 'z';
                            csState.pullActiveSign = Math.sign(hitNormal.z) || 1;
                        }
                        setPullActiveAxis(pullActiveAxis);
                    }
                    csState.isPullingObject = true;
                    csState.pullStartPos = { x: e.clientX, y: e.clientY };
                    recordPullStartState(hitPlaced);

                    const box = new THREE.Box3().setFromObject(hitPlaced.mesh);
                    const center = new THREE.Vector3();
                    box.getCenter(center);
                    const cProj = center.clone().project(camera);
                    const hProj = (hitNormal ? center.clone().add(hitNormal) : center).project(camera);
                    let sDx = hProj.x - cProj.x;
                    let sDy = -(hProj.y - cProj.y);
                    const sLen = Math.hypot(sDx, sDy);
                    if (sLen > 0.01) {
                        csState.pullHandleScreenDir = { x: sDx / sLen, y: sDy / sLen };
                    } else {
                        csState.pullHandleScreenDir = { x: pullActiveSign || 1, y: 0 };
                    }

                    showFloatingPullIndicator(e.clientX, e.clientY, hitPlaced.mesh.scale, pullActiveAxis);
                } else if (selectedObject) {
                    csState.isPullingObject = true;
                    csState.pullStartPos = { x: e.clientX, y: e.clientY };
                    recordPullStartState(selectedObject);
                    csState.pullHandleScreenDir = { x: 1, y: -1 };
                    showFloatingPullIndicator(e.clientX, e.clientY, selectedObject.mesh.scale, pullActiveAxis);
                }
            } else {
                // Mouse mode: clicking an object strictly selects it, NEVER drags
                if (hitGroup) {
                    selectObject(hitGroup);
                }
            }
        } else if (e.button === 0 && isPlayTestMode) {
            csState.isLeftMouseDown = true;
            csState.mousePos = { x: e.clientX, y: e.clientY };
            // Click in play test mode triggers player attack
            playerAttack();
        }
    });

    window.addEventListener('mouseup', e => {
        if (e.button === 2) csState.isRightMouseDown = false;
        if (e.button === 0) {
            csState.isLeftMouseDown = false;
            if (isMovingWithGizmo) {
                csState.isMovingWithGizmo = false;
                csState.moveActiveAxis = null;
                dom.style.cursor = studioToolMode === 'mover' ? 'move' : 'default';
                autoSaveDraft();
            }
            if (isPullingObject) {
                csState.isPullingObject = false;
                hideFloatingPullIndicator(1000);
                autoSaveDraft();
            }
            csState.isDraggingObject = false;
        }
    });

    window.addEventListener('mousemove', e => {
        if (isRightMouseDown || (isLeftMouseDown && isPlayTestMode)) {
            const dx = e.clientX - mousePos.x;
            const dy = e.clientY - mousePos.y;
            csState.mousePos = { x: e.clientX, y: e.clientY };

            if (!isPlayTestMode) {
                if (isRightMouseDown) {
                    csState.orbitTheta -= dx * 0.006;
                    csState.orbitPhi = Math.max(0.1, Math.min(Math.PI / 2.1, orbitPhi - dy * 0.006));
                    updateOrbitCamera();
                }
            } else {
                csState.characterYaw -= dx * 0.006;
            }
        } else if (isPullingObject && selectedObject && !isPlayTestMode) {
            const mouseDx = e.clientX - pullStartPos.x;
            const mouseDy = e.clientY - pullStartPos.y;
            // Outward screen drag projection: pulling mouse outward expands the edge
            const outwardDrag = (mouseDx * pullHandleScreenDir.x + mouseDy * pullHandleScreenDir.y) * 0.035;
            // Fallback directional drag
            const rawDelta = (pullActiveAxis === 'y' ? (pullStartPos.y - e.clientY) * (pullActiveSign || 1) :
                              pullActiveAxis === 'x' ? (e.clientX - pullStartPos.x) * (pullActiveSign || 1) :
                              ((e.clientX - pullStartPos.x) - (e.clientY - pullStartPos.y)) * 0.7 * (pullActiveSign || 1)) * 0.025;
            const delta = Math.abs(outwardDrag) > Math.abs(rawDelta) ? outwardDrag : rawDelta;

            if (pullActiveAxis === 'x') {
                const newX = Math.max(0.1, Number((pullStartScaleVector.x + delta).toFixed(2)));
                selectedObject.mesh.scale.x = newX;
                selectedObject.scale.x = newX;

                // ONE-SIDED EXPANSION: Keep opposite side pinned in 3D world space
                if (pullActiveSign > 0) {
                    const newPosX = pullStartBoxMin.x - pullStartLocalMin.x * newX;
                    selectedObject.mesh.position.x = newPosX;
                    selectedObject.position.x = newPosX;
                } else {
                    const newPosX = pullStartBoxMax.x - pullStartLocalMax.x * newX;
                    selectedObject.mesh.position.x = newPosX;
                    selectedObject.position.x = newPosX;
                }
            } else if (pullActiveAxis === 'y') {
                const newY = Math.max(0.1, Number((pullStartScaleVector.y + delta).toFixed(2)));
                selectedObject.mesh.scale.y = newY;
                selectedObject.scale.y = newY;

                // ONE-SIDED EXPANSION: Keep opposite side pinned in 3D world space
                if (pullActiveSign > 0) {
                    const newPosY = pullStartBoxMin.y - pullStartLocalMin.y * newY;
                    selectedObject.mesh.position.y = newPosY;
                    selectedObject.position.y = newPosY;
                } else {
                    const newPosY = pullStartBoxMax.y - pullStartLocalMax.y * newY;
                    selectedObject.mesh.position.y = newPosY;
                    selectedObject.position.y = newPosY;
                }
            } else if (pullActiveAxis === 'z') {
                const newZ = Math.max(0.1, Number((pullStartScaleVector.z + delta).toFixed(2)));
                selectedObject.mesh.scale.z = newZ;
                selectedObject.scale.z = newZ;

                // ONE-SIDED EXPANSION: Keep opposite side pinned in 3D world space
                if (pullActiveSign > 0) {
                    const newPosZ = pullStartBoxMin.z - pullStartLocalMin.z * newZ;
                    selectedObject.mesh.position.z = newPosZ;
                    selectedObject.position.z = newPosZ;
                } else {
                    const newPosZ = pullStartBoxMax.z - pullStartLocalMax.z * newZ;
                    selectedObject.mesh.position.z = newPosZ;
                    selectedObject.position.z = newPosZ;
                }
            } else {
                const diag = ((mouseDx - mouseDy) * 0.707) * 0.025;
                const newX = Math.max(0.1, Number((pullStartScaleVector.x + diag).toFixed(2)));
                const newY = Math.max(0.1, Number((pullStartScaleVector.y + diag).toFixed(2)));
                const newZ = Math.max(0.1, Number((pullStartScaleVector.z + diag).toFixed(2)));
                selectedObject.mesh.scale.set(newX, newY, newZ);
                selectedObject.scale.x = newX;
                selectedObject.scale.y = newY;
                selectedObject.scale.z = newZ;
            }

            updateInspectorDisplay();
            updatePullGizmo();
            showFloatingPullIndicator(e.clientX, e.clientY, selectedObject.mesh.scale, pullActiveAxis);
        } else if (isMovingWithGizmo && selectedObject && moveActiveAxis && !isPlayTestMode) {
            const mouseDx = e.clientX - moveStartMousePos.x;
            const mouseDy = e.clientY - moveStartMousePos.y;
            const pixelDrag = mouseDx * moveScreenDir.x + mouseDy * moveScreenDir.y;
            const worldDelta = pixelDrag * worldUnitsPerPixel;

            if (moveActiveAxis === 'x') {
                const newX = Number((moveStartObjectPos.x + worldDelta).toFixed(2));
                selectedObject.mesh.position.x = newX;
                selectedObject.position.x = newX;
                if (selectedObject.movement) selectedObject.movement.origin.x = newX;
            } else if (moveActiveAxis === 'y') {
                const newY = Math.max(0, Number((moveStartObjectPos.y + worldDelta).toFixed(2)));
                selectedObject.mesh.position.y = newY;
                selectedObject.position.y = newY;
                if (selectedObject.movement) selectedObject.movement.origin.y = newY;
            } else if (moveActiveAxis === 'z') {
                const newZ = Number((moveStartObjectPos.z + worldDelta).toFixed(2));
                selectedObject.mesh.position.z = newZ;
                selectedObject.position.z = newZ;
                if (selectedObject.movement) selectedObject.movement.origin.z = newZ;
            }

            updateInspectorDisplay();
            updateMoveGizmo();
        }

        if (!isRightMouseDown && !isMovingWithGizmo && !isPullingObject && !isPlayTestMode) {
            if (studioToolMode === 'mover' && moveGizmoGroup?.visible && moveGizmoHandles.length > 0) {
                const rect = dom.getBoundingClientRect();
                const mouse = new THREE.Vector2(
                    ((e.clientX - rect.left) / rect.width) * 2 - 1,
                    -((e.clientY - rect.top) / rect.height) * 2 + 1
                );
                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera(mouse, camera);
                const hits = raycaster.intersectObjects(moveGizmoHandles, true);
                if (hits.length > 0) {
                    dom.style.cursor = 'grab';
                } else {
                    dom.style.cursor = 'move';
                }
            }
        }
    });

    dom.addEventListener('wheel', e => {
        if (!isPlayTestMode) {
            csState.orbitRadius = Math.max(5, Math.min(100, orbitRadius + e.deltaY * 0.05));
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

    let playTestMobileControls: PlayardMobileControls | null = null;

    if (playTestBtn) {
        playTestBtn.addEventListener('click', () => {
            csState.isPlayTestMode = !isPlayTestMode;
            if (isPlayTestMode) {
                // 📸 Snapshot all placed objects before play test starts so everything restores on exit
                csState.playTestWorldSnapshots = placedObjects.map(o => {
                    const homePos = o.movement?.origin
                        ? { x: o.movement.origin.x, y: o.movement.origin.y, z: o.movement.origin.z }
                        : { x: o.position.x, y: o.position.y, z: o.position.z };

                    return {
                        id: o.id,
                        position: homePos,
                        rotation: { x: o.rotation.x, y: o.rotation.y, z: o.rotation.z },
                        scale: { x: o.scale.x, y: o.scale.y, z: o.scale.z },
                        visible: o.mesh.visible,
                        isCollected: o.isCollected,
                        isUnlocked: o.isUnlocked,
                        isHeld: o.isHeld,
                        enemyHealth: o.enemyData?.health,
                        movement: o.movement ? JSON.parse(JSON.stringify(o.movement)) : undefined
                    };
                });

                if (currentVehicle) exitVehicle();
                csState.currentVehicle = null;
                playTestBtn.blur();
                if (document.activeElement && (document.activeElement as HTMLElement).blur) {
                    (document.activeElement as HTMLElement).blur();
                }
                selectObject(null);
                csState.isDraggingObject = false;
                csState.isMovingWithGizmo = false;

                // Position player at placed spawn point if available
                const spawnPoints = placedObjects.filter(o => o.isSpawnPoint || o.category === 'spawn' || o.catalogId?.startsWith('spawn_'));
                if (spawnPoints.length > 0) {
                    const activeSpawn = (selectedObject && spawnPoints.includes(selectedObject)) ? selectedObject : spawnPoints[0];
                    humanCharacter.position.set(activeSpawn.position.x, activeSpawn.position.y + 0.1, activeSpawn.position.z);
                    humanCharacter.rotation.y = activeSpawn.rotation.y;
                    csState.characterYaw = activeSpawn.rotation.y;
                } else {
                    humanCharacter.position.set(0, 0, 0);
                    csState.characterYaw = humanCharacter.rotation.y || 0;
                }
                checkpointPosition.copy(humanCharacter.position);

                // Hide invisible spawn objects in play test mode
                placedObjects.forEach(o => {
                    const lowerN = (o.name + ' ' + (o.catalogId || '')).toLowerCase();
                    if (o.isInvisibleSpawn || o.mesh.userData.isInvisibleSpawn || lowerN.includes('invisible') || lowerN.includes('nähtamatu') || lowerN.includes('beacon') || lowerN.includes('ring')) {
                        o.mesh.visible = false;
                    }
                });

                characterVelocity.set(0, 0, 0);
                csState.isGrounded = true;
                csState.playerHealth = playerMaxHealth;
                csState.playerAsma = playerMaxAsma;

                const coinsInput = document.getElementById('game-coins-input') as HTMLInputElement | null;
                if (coinsInput) {
                    csState.playerCoins = parseInt(coinsInput.value, 10) || 0;
                }
                const healthVisSelect = document.getElementById('game-health-visible-select') as HTMLSelectElement | null;
                if (healthVisSelect) {
                    csState.isHealthVisible = healthVisSelect.value === 'visible';
                }
                const coinsVisSelect = document.getElementById('game-coins-visible-select') as HTMLSelectElement | null;
                if (coinsVisSelect) {
                    csState.isCoinsVisible = coinsVisSelect.value === 'visible';
                }
                const asmaVisSelect = document.getElementById('game-asma-visible-select') as HTMLSelectElement | null;
                if (asmaVisSelect) {
                    csState.isAsmaVisible = asmaVisSelect.value === 'visible';
                }

                csState.isGameOver = false;
                csState.isGameFinished = false;

                playTestBtn.innerHTML = '<span>Exit Play Test</span>';
                playTestBtn.style.background = '#e74c3c';
                if (playTestHud) playTestHud.style.display = 'block';
                if (gameplayHud) gameplayHud.style.display = 'flex';
                if (gameplayActions) gameplayActions.style.display = 'flex';
                const robloxHotbar = document.getElementById('roblox-hotbar-container');
                if (robloxHotbar) robloxHotbar.style.display = 'block';
                if (studioCamControls) studioCamControls.style.display = 'none';
                if (catalogPanel) catalogPanel.style.display = 'none';
                if (inspectorPanel) inspectorPanel.style.display = 'none';
                const toolSelector = document.getElementById('studio-tool-mode-selector');
                if (toolSelector) toolSelector.style.display = 'none';
                hideFloatingPullIndicator(0);

                // Initialize playerInventory with holdable starter items
                setPlayerInventory([]);
                setEquippedInventoryIndex(-1);
                const starterHoldables = placedObjects.filter(o => (o.isHoldable || o.customModelData?.isHoldable) && (o.inHandAtStart || o.customModelData?.inHandAtStart));
                starterHoldables.forEach(starter => {
                    if (playerInventory.length < 10 && !playerInventory.some(i => i.name === starter.name)) {
                        playerInventory.push({
                            id: 'starter_' + starter.id,
                            name: starter.name,
                            icon: ('icon' in starter && (starter as any).icon) ? (starter as any).icon : '🗡️',
                            type: 'holdable',
                            objectRef: starter
                        });
                        starter.mesh.visible = false;
                        starter.isHeld = true;
                    }
                });

                if (starterHoldables.length > 0) {
                    equipCustomItemInHand(starterHoldables[0]);
                } else {
                    updateGameplayHUD();
                }

                if (isMobileOrTabletDevice()) {
                    if (playTestControls) playTestControls.style.display = 'none';
                    if (!playTestMobileControls) {
                        playTestMobileControls = new PlayardMobileControls({
                            showJump: true,
                            jumpLabel: 'Jump',
                            onMove: (vector) => {
                                keys['KeyW'] = vector.y < -0.15;
                                keys['KeyS'] = vector.y > 0.15;
                                keys['KeyA'] = vector.x < -0.15;
                                keys['KeyD'] = vector.x > 0.15;
                            },
                            onJump: () => {
                                keys['Space'] = true;
                            },
                            onJumpEnd: () => {
                                keys['Space'] = false;
                            },
                            extraButtons: [
                                {
                                    id: 'creator-mobile-dive-btn',
                                    label: 'Dive 10m',
                                    icon: '🤿',
                                    onPress: () => {
                                        keys['ShiftLeft'] = true;
                                    },
                                    onRelease: () => {
                                        keys['ShiftLeft'] = false;
                                    }
                                },
                                {
                                    id: 'creator-mobile-action-btn',
                                    label: 'Action [E]',
                                    icon: '⚔️',
                                    onPress: () => {
                                        playerAttack();
                                    }
                                },
                                {
                                    id: 'creator-mobile-vehicle-btn',
                                    label: 'Vehicle [F]',
                                    icon: '🚗',
                                    onPress: () => {
                                        if (currentVehicle) {
                                            exitVehicle();
                                        } else {
                                            const nearby = placedObjects.find(o => {
                                                const d = humanCharacter.position.distanceTo(new THREE.Vector3(o.position.x, o.position.y, o.position.z));
                                                return d < 4.5 && (o.category === 'vehicles' || isAirplaneObject(o));
                                            });
                                            if (nearby) enterVehicle(nearby);
                                        }
                                    }
                                }
                            ]
                        });
                        playTestMobileControls.init();
                    } else {
                        playTestMobileControls.setVisible(true);
                    }
                } else {
                    if (playTestControls) playTestControls.style.display = 'flex';
                }

                updateGameplayHUD();
            } else {
                if (currentVehicle) exitVehicle();
                csState.currentVehicle = null;
                csState.vehicleSpeed = 0;

                // 🔄 RESTORE ALL OBJECTS BACK TO THEIR ORIGINAL EDITOR POSITIONS & STATES
                if (playTestWorldSnapshots && playTestWorldSnapshots.length > 0) {
                    const snapMap = new Map(playTestWorldSnapshots.map(s => [s.id, s]));

                    // 1. Remove dynamically spawned runtime objects
                    for (let i = placedObjects.length - 1; i >= 0; i--) {
                        const obj = placedObjects[i];
                        if (!snapMap.has(obj.id)) {
                            scene.remove(obj.mesh);
                            placedObjects.splice(i, 1);
                        }
                    }

                    // 2. Restore all original objects to their exact snapshot transform & properties
                    for (const snap of playTestWorldSnapshots) {
                        const obj = placedObjects.find(o => o.id === snap.id);
                        if (!obj) continue;

                        obj.mesh.position.set(snap.position.x, snap.position.y, snap.position.z);
                        obj.mesh.rotation.set(snap.rotation.x, snap.rotation.y, snap.rotation.z);
                        obj.mesh.scale.set(snap.scale.x, snap.scale.y, snap.scale.z);

                        obj.position = { x: snap.position.x, y: snap.position.y, z: snap.position.z };
                        obj.rotation = { x: snap.rotation.x, y: snap.rotation.y, z: snap.rotation.z };
                        obj.scale = { x: snap.scale.x, y: snap.scale.y, z: snap.scale.z };

                        obj.mesh.visible = snap.visible;
                        if (snap.isCollected !== undefined) obj.isCollected = snap.isCollected;
                        if (snap.isUnlocked !== undefined) obj.isUnlocked = snap.isUnlocked;
                        if (snap.isHeld !== undefined) obj.isHeld = snap.isHeld;
                        if (obj.enemyData && snap.enemyHealth !== undefined) {
                            obj.enemyData.health = snap.enemyHealth;
                        }
                        if (snap.movement) {
                            obj.movement = JSON.parse(JSON.stringify(snap.movement));
                            obj.movement.origin = { ...snap.position };
                            obj.mesh.position.set(snap.position.x, snap.position.y, snap.position.z);
                            obj.position = { ...snap.position };
                        }

                        if (!scene.children.includes(obj.mesh)) {
                            scene.add(obj.mesh);
                        }
                    }
                    csState.playTestWorldSnapshots = [];
                }

                // Reset player position back to initial spawn point or origin
                const spawnPoints = placedObjects.filter(o => o.isSpawnPoint || o.category === 'spawn' || o.catalogId?.startsWith('spawn_'));
                if (spawnPoints.length > 0) {
                    humanCharacter.position.set(spawnPoints[0].position.x, spawnPoints[0].position.y + 0.1, spawnPoints[0].position.z);
                    humanCharacter.rotation.y = spawnPoints[0].rotation.y || 0;
                } else {
                    humanCharacter.position.set(0, 0, 0);
                    humanCharacter.rotation.y = 0;
                }
                characterVelocity.set(0, 0, 0);
                humanCharacter.visible = true;
                csState.isGrounded = true;
                csState.isGameOver = false;
                csState.isGameFinished = false;

                if (playTestMobileControls) {
                    playTestMobileControls.setVisible(false);
                }
                clearHeldItemFromHand();
                // Restore held objects and invisible spawn objects visibility in editor
                placedObjects.forEach(o => {
                    if (o.isHeld) {
                        o.isHeld = false;
                        o.mesh.visible = true;
                    }
                });
                placedObjects.forEach(o => {
                    const lowerN = (o.name + ' ' + (o.catalogId || '')).toLowerCase();
                    if (o.isInvisibleSpawn || o.mesh.userData.isInvisibleSpawn || lowerN.includes('invisible') || lowerN.includes('nähtamatu') || lowerN.includes('beacon') || lowerN.includes('ring')) {
                        o.mesh.visible = true;
                    }
                });

                playTestBtn.innerHTML = '<span>Play Test Mode</span>';
                playTestBtn.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
                if (playTestHud) playTestHud.style.display = 'none';
                if (gameplayHud) gameplayHud.style.display = 'none';
                if (gameplayActions) gameplayActions.style.display = 'none';
                const robloxHotbar = document.getElementById('roblox-hotbar-container');
                if (robloxHotbar) robloxHotbar.style.display = 'none';
                setPlayerInventory([]);
                setEquippedInventoryIndex(-1);
                if (playTestControls) playTestControls.style.display = 'none';
                if (studioCamControls) studioCamControls.style.display = 'flex';
                if (catalogPanel) catalogPanel.style.display = 'flex';
                if (inspectorPanel) inspectorPanel.style.display = 'block';
                const toolSelector = document.getElementById('studio-tool-mode-selector');
                if (toolSelector) toolSelector.style.display = 'flex';

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

    // Auto-save on page exit, window unload, tab close, or navigation
    window.addEventListener('beforeunload', () => {
        autoSaveDraft();
    });
    window.addEventListener('pagehide', () => {
        autoSaveDraft();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            autoSaveDraft();
        }
    });

    // When clicking logo / back button to Hub, auto-save before navigating
    document.querySelector('a.btn-back')?.addEventListener('click', () => {
        autoSaveDraft();
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
        startNewEmptyGame('land');
    });

    document.getElementById('btn-modal-new-sea-game')?.addEventListener('click', () => {
        const modal = document.getElementById('my-games-modal');
        if (modal) modal.style.display = 'none';
        startNewEmptyGame('sea');
    });

    // Map Environment Toggle (Maa vs Meri)
    document.getElementById('btn-env-land')?.addEventListener('click', () => {
        setMapEnvironment('land');
    });

    document.getElementById('btn-env-sea')?.addEventListener('click', () => {
        setMapEnvironment('sea');
    });

    // Top "Add Block" Button
    document.getElementById('btn-add-block')?.addEventListener('click', () => {
        spawnBlockObject();
    });

    // Tool Mode Selector (Hiir vs Liigutaja vs Tõmbaja)
    document.getElementById('btn-tool-mouse')?.addEventListener('click', () => {
        setStudioToolMode('mouse');
    });

    document.getElementById('btn-tool-mover')?.addEventListener('click', () => {
        setStudioToolMode('mover');
    });

    document.getElementById('btn-tool-puller')?.addEventListener('click', () => {
        setStudioToolMode('puller');
    });

    // Edge Axis Selectors (Kõik, Laius X, Kõrgus Y, Pikkus Z)
    document.getElementById('btn-pull-axis-all')?.addEventListener('click', () => {
        setPullActiveAxis('all');
    });
    document.getElementById('btn-pull-axis-x')?.addEventListener('click', () => {
        setPullActiveAxis('x');
    });
    document.getElementById('btn-pull-axis-y')?.addEventListener('click', () => {
        setPullActiveAxis('y');
    });
    document.getElementById('btn-pull-axis-z')?.addEventListener('click', () => {
        setPullActiveAxis('z');
    });

    // Puller Quick Resize Buttons (+ Suuremaks / - Väiksemaks)
    document.getElementById('btn-pull-bigger')?.addEventListener('click', () => {
        pullSelectedObject(0.5);
    });

    document.getElementById('btn-pull-smaller')?.addEventListener('click', () => {
        pullSelectedObject(-0.5);
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
        csState.orbitRadius = Math.max(5, orbitRadius - 4);
        updateOrbitCamera();
    });
    document.getElementById('cam-btn-zoom-out')?.addEventListener('click', () => {
        csState.orbitRadius = Math.min(100, orbitRadius + 4);
        updateOrbitCamera();
    });
    document.getElementById('cam-btn-rot-left')?.addEventListener('click', () => {
        csState.orbitTheta += Math.PI / 8;
        updateOrbitCamera();
    });
    document.getElementById('cam-btn-rot-right')?.addEventListener('click', () => {
        csState.orbitTheta -= Math.PI / 8;
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
    bindTouchBtn('touch-btn-dive', 'ShiftLeft');

    // Publish a Game Button & Publish Modal Listeners
    const submitBtn = document.getElementById('btn-submit-review');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            openPublishModal();
        });
    }

    document.getElementById('btn-close-publish-x')?.addEventListener('click', () => {
        closePublishModal();
    });

    document.getElementById('btn-cancel-publish')?.addEventListener('click', () => {
        closePublishModal();
    });

    document.getElementById('btn-confirm-publish')?.addEventListener('click', async () => {
        await confirmAndPublishGame();
    });

    const publishModal = document.getElementById('publish-game-modal');
    if (publishModal) {
        publishModal.addEventListener('click', (e) => {
            if (e.target === publishModal) {
                closePublishModal();
            }
        });
    }

    // Publish Modal: Cheaters & Anti-Cheat Settings
    document.getElementById('btn-open-cheaters-settings')?.addEventListener('click', () => {
        const panel = document.getElementById('cheaters-config-panel');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
        }
    });

    document.getElementById('btn-cheaters-ok')?.addEventListener('click', () => {
        setCheatersConfirmed(true);
        const panel = document.getElementById('cheaters-config-panel');
        if (panel) panel.style.display = 'none';
    });

    document.getElementById('cheat-detect-money')?.addEventListener('change', (e) => {
        const isChecked = (e.target as HTMLInputElement).checked;
        const options = document.getElementById('cheat-money-options');
        if (options) {
            options.style.display = isChecked ? 'grid' : 'none';
        }
    });

    // Publish Modal: Game Cover Image Drag-and-Drop & Upload Listeners
    const dropzone = document.getElementById('publish-image-dropzone');
    const imageInput = document.getElementById('publish-game-image-input') as HTMLInputElement | null;

    if (dropzone && imageInput) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.style.borderColor = '#00f2fe';
                dropzone.style.backgroundColor = 'rgba(0, 242, 254, 0.15)';
                dropzone.style.boxShadow = '0 0 20px rgba(0, 242, 254, 0.4)';
            });
        });

        ['dragleave', 'dragend'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.style.borderColor = 'rgba(0, 242, 254, 0.4)';
                dropzone.style.backgroundColor = 'rgba(11, 17, 26, 0.75)';
                dropzone.style.boxShadow = 'none';
            });
        });

        dropzone.addEventListener('drop', async (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.style.borderColor = 'rgba(0, 242, 254, 0.4)';
            dropzone.style.backgroundColor = 'rgba(11, 17, 26, 0.75)';
            dropzone.style.boxShadow = 'none';

            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    try {
                        const dataUrl = await processImageFile(file);
                        setPublishModalThumbnail(dataUrl);
                    } catch (err) {
                        console.error('Error reading dropped image file:', err);
                    }
                } else {
                    alert('Palun lohista ainult pildifaile (PNG, JPG, WEBP, GIF)!');
                }
            }
        });

        dropzone.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (!target.closest('#btn-remove-publish-image') && !target.closest('#btn-change-publish-image')) {
                imageInput.click();
            }
        });

        imageInput.addEventListener('change', async () => {
            if (imageInput.files && imageInput.files.length > 0) {
                const file = imageInput.files[0];
                try {
                    const dataUrl = await processImageFile(file);
                    setPublishModalThumbnail(dataUrl);
                } catch (err) {
                    console.error('Error processing selected image:', err);
                }
            }
        });

        // Paste support from clipboard
        dropzone.addEventListener('paste', async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        const file = items[i].getAsFile();
                        if (file) {
                            const dataUrl = await processImageFile(file);
                            setPublishModalThumbnail(dataUrl);
                            break;
                        }
                    }
                }
            }
        });

        document.getElementById('btn-change-publish-image')?.addEventListener('click', (e) => {
            e.stopPropagation();
            imageInput.click();
        });

        document.getElementById('btn-remove-publish-image')?.addEventListener('click', (e) => {
            e.stopPropagation();
            clearPublishModalThumbnail();
        });

        document.getElementById('btn-browse-publish-image')?.addEventListener('click', () => {
            imageInput.click();
        });

        document.getElementById('btn-snapshot-publish-image')?.addEventListener('click', () => {
            const snap = captureSceneSnapshot();
            if (snap) {
                setPublishModalThumbnail(snap);
            } else {
                alert('Ei saanud hetktõmmist teha. Veendu, et 3D vaade on aktiivne.');
            }
        });

        document.getElementById('btn-ai-publish-image')?.addEventListener('click', async () => {
            const titleInput = document.getElementById('publish-game-title') as HTMLInputElement | null;
            const descInput = document.getElementById('publish-game-desc') as HTMLTextAreaElement | null;
            const gameTitle = titleInput?.value.trim() || 'Playard Adventure';
            const gameDesc = descInput?.value.trim() || '';
            const prompt = `${gameTitle}. ${gameDesc}`.trim();

            const aiBtn = document.getElementById('btn-ai-publish-image') as HTMLButtonElement | null;
            const oldHtml = aiBtn ? aiBtn.innerHTML : '';
            if (aiBtn) {
                aiBtn.innerHTML = '<span>⏳</span> <span>Genereerin...</span>';
                aiBtn.disabled = true;
            }

            try {
                const res = await PlayardImageGenerationEngine.generateImage(prompt || 'Mängu kaanepilt', {
                    style: 'fantasy',
                    category: 'concept',
                    width: 512,
                    height: 320
                });
                if (res && res.dataUrl) {
                    setPublishModalThumbnail(res.dataUrl);
                }
            } catch (err) {
                console.error('AI cover generation failed:', err);
            } finally {
                if (aiBtn) {
                    aiBtn.innerHTML = oldHtml;
                    aiBtn.disabled = false;
                }
            }
        });

        // Click-to-enlarge fullsize zoom lightbox for Publish Game cover
        const previewImg = document.getElementById('publish-image-preview') as HTMLImageElement | null;
        const zoomModal = document.getElementById('publish-image-zoom-modal');
        const zoomImg = document.getElementById('publish-image-zoom-img') as HTMLImageElement | null;
        const closeZoomBtn = document.getElementById('btn-close-publish-zoom');

        if (previewImg && zoomModal && zoomImg) {
            previewImg.style.cursor = 'zoom-in';
            previewImg.title = 'Klõpsa suurelt vaatamiseks (Zoom in)';
            previewImg.addEventListener('click', () => {
                if (previewImg.src) {
                    zoomImg.src = previewImg.src;
                    zoomModal.style.display = 'flex';
                }
            });
            closeZoomBtn?.addEventListener('click', () => {
                zoomModal.style.display = 'none';
            });
            zoomModal.addEventListener('click', (e) => {
                if (e.target === zoomModal) {
                    zoomModal.style.display = 'none';
                }
            });
        }
    }
}

export function setupCatalogEvents() {
    const searchInput = document.getElementById('catalog-search-input') as HTMLInputElement | null;
    const catButtons = document.querySelectorAll('.cat-btn');

    let currentCat = document.querySelector('.cat-btn.active')?.getAttribute('data-cat') || 'spawn';

    catButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            catButtons.forEach(b => b.classList.remove('active'));
            (e.currentTarget as HTMLElement).classList.add('active');
            currentCat = (e.currentTarget as HTMLElement).getAttribute('data-cat') || 'spawn';
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

    const hpInput = document.getElementById('game-player-health-input') as HTMLInputElement | null;
    if (hpInput) {
        hpInput.addEventListener('input', () => {
            const val = parseInt(hpInput.value, 10);
            if (!isNaN(val) && val > 0) {
                csState.playerMaxHealth = val;
                csState.playerHealth = val;
                updateGameplayHUD();
                autoSaveDraft();
            }
        });
    }

    const healthVisSelect = document.getElementById('game-health-visible-select') as HTMLSelectElement | null;
    if (healthVisSelect) {
        healthVisSelect.addEventListener('change', () => {
            csState.isHealthVisible = healthVisSelect.value === 'visible';
            updateGameplayHUD();
            autoSaveDraft();
        });
    }

    const coinsInput = document.getElementById('game-coins-input') as HTMLInputElement | null;
    if (coinsInput) {
        coinsInput.addEventListener('input', () => {
            const val = parseInt(coinsInput.value, 10);
            if (!isNaN(val) && val >= 0) {
                csState.playerCoins = val;
                updateGameplayHUD();
                autoSaveDraft();
            }
        });
    }

    const coinsVisSelect = document.getElementById('game-coins-visible-select') as HTMLSelectElement | null;
    if (coinsVisSelect) {
        coinsVisSelect.addEventListener('change', () => {
            csState.isCoinsVisible = coinsVisSelect.value === 'visible';
            updateGameplayHUD();
            autoSaveDraft();
        });
    }

    const asmaInput = document.getElementById('game-asma-input') as HTMLInputElement | null;
    if (asmaInput) {
        asmaInput.addEventListener('input', () => {
            const val = parseInt(asmaInput.value, 10);
            if (!isNaN(val) && val > 0) {
                csState.playerMaxAsma = val;
                csState.playerAsma = val;
                updateGameplayHUD();
                autoSaveDraft();
            }
        });
    }

    const asmaVisSelect = document.getElementById('game-asma-visible-select') as HTMLSelectElement | null;
    if (asmaVisSelect) {
        asmaVisSelect.addEventListener('change', () => {
            csState.isAsmaVisible = asmaVisSelect.value === 'visible';
            updateGameplayHUD();
            autoSaveDraft();
        });
    }
}

export function setupInspectorEvents() {
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
                selectedObject.mesh.scale.set(s, s, s);
                selectedObject.scale.x = s;
                selectedObject.scale.y = s;
                selectedObject.scale.z = s;
                updatePullGizmo();
                if (studioToolMode === 'mover') updateMoveGizmo();
                updateInspectorDisplay();
                autoSaveDraft();
            }
        });
    }

    const scaleXInput = document.getElementById('obj-scale-x-input') as HTMLInputElement | null;
    const scaleYInput = document.getElementById('obj-scale-y-input') as HTMLInputElement | null;
    const scaleZInput = document.getElementById('obj-scale-z-input') as HTMLInputElement | null;

    const bindAxisInput = (axis: 'x' | 'y' | 'z', inputEl: HTMLInputElement | null) => {
        if (!inputEl) return;
        inputEl.addEventListener('input', () => {
            if (selectedObject) {
                const s = parseFloat(inputEl.value) || 1;
                selectedObject.mesh.scale[axis] = s;
                selectedObject.scale[axis] = s;
                updatePullGizmo();
                if (studioToolMode === 'mover') updateMoveGizmo();
                autoSaveDraft();
            }
        });
    };

    bindAxisInput('x', scaleXInput);
    bindAxisInput('y', scaleYInput);
    bindAxisInput('z', scaleZInput);

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

    const passableSelect = document.getElementById('obj-passable-select') as HTMLSelectElement | null;
    if (passableSelect) {
        passableSelect.addEventListener('change', () => {
            if (selectedObject) {
                selectedObject.isPassable = passableSelect.value === 'passable';
                autoSaveDraft();
            }
        });
    }

    // Inspector listeners for holdable items and damage
    const holdableCheck = document.getElementById('obj-is-holdable-check') as HTMLInputElement | null;
    const holdableSubprops = document.getElementById('obj-holdable-subprops');
    const inHandSelect = document.getElementById('obj-in-hand-select') as HTMLSelectElement | null;
    const pickupTypeSelect = document.getElementById('obj-pickup-type-select') as HTMLSelectElement | null;
    const pbxPriceRow = document.getElementById('obj-pbx-price-row');
    const pbxPriceInput = document.getElementById('obj-pbx-price-input') as HTMLInputElement | null;
    const damageCheck = document.getElementById('obj-deals-damage-check') as HTMLInputElement | null;
    const damageRow = document.getElementById('obj-damage-amount-row');
    const damageInput = document.getElementById('obj-damage-amount-input') as HTMLInputElement | null;

    if (holdableCheck) {
        holdableCheck.addEventListener('change', () => {
            if (selectedObject) {
                selectedObject.isHoldable = holdableCheck.checked;
                if (holdableSubprops) {
                    holdableSubprops.style.display = holdableCheck.checked ? 'flex' : 'none';
                }
                autoSaveDraft();
            }
        });
    }

    if (inHandSelect) {
        inHandSelect.addEventListener('change', () => {
            if (selectedObject) {
                selectedObject.inHandAtStart = inHandSelect.value === 'true';
                autoSaveDraft();
            }
        });
    }

    if (pickupTypeSelect) {
        pickupTypeSelect.addEventListener('change', () => {
            if (selectedObject) {
                const costs = pickupTypeSelect.value === 'pbx';
                selectedObject.costsPbx = costs;
                if (pbxPriceRow) pbxPriceRow.style.display = costs ? 'flex' : 'none';
                autoSaveDraft();
            }
        });
    }

    if (pbxPriceInput) {
        pbxPriceInput.addEventListener('input', () => {
            if (selectedObject) {
                selectedObject.pbxPrice = Math.max(1, parseInt(pbxPriceInput.value, 10) || 25);
                autoSaveDraft();
            }
        });
    }

    if (damageCheck) {
        damageCheck.addEventListener('change', () => {
            if (selectedObject) {
                selectedObject.dealsDamage = damageCheck.checked;
                if (damageRow) damageRow.style.display = damageCheck.checked ? 'flex' : 'none';
                autoSaveDraft();
            }
        });
    }

    if (damageInput) {
        damageInput.addEventListener('input', () => {
            if (selectedObject) {
                selectedObject.damageAmount = Math.max(1, parseInt(damageInput.value, 10) || 25);
                autoSaveDraft();
            }
        });
    }

    const btnSetupHandAnim = document.getElementById('btn-setup-hand-animation');
    if (btnSetupHandAnim) {
        btnSetupHandAnim.addEventListener('click', () => {
            if (selectedObject) {
                openHandAnimationEditor(selectedObject);
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
                duplicateObjectWithChildren(selectedObject);
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

    setupScriptingEvents();
}

export function startNewEmptyGame(initialEnv: 'land' | 'sea' = 'land') {
    if (placedObjects.length > 0 && !confirm('Alustada uut tühja mängu? Pooleli olev mäng jääb alles "My Games" alla.')) {
        return;
    }
    placedObjects.forEach(p => scene.remove(p.mesh));
    csState.placedObjects = [];
    selectObject(null);
    renderWorkspaceTree();
    removeSea();

    if (initialEnv === 'sea') {
        createWholeMapOcean(true);
    } else {
        removeSea();
    }
    updateMapEnvironmentUI();

    const titleInput = document.getElementById('game-title-input') as HTMLInputElement | null;
    const catSelect = document.getElementById('game-category-select') as HTMLSelectElement | null;
    const descInput = document.getElementById('game-desc-input') as HTMLInputElement | null;

    if (titleInput) titleInput.value = initialEnv === 'sea' ? 'My Ocean Adventure' : 'My New 3D Adventure';
    if (catSelect) catSelect.value = 'Adventure';
    if (descInput) descInput.value = initialEnv === 'sea' ? 'A vast 3D ocean world created in Playard!' : 'A brand new 3D world created in Playard!';

    const healthInput = document.getElementById('game-player-health-input') as HTMLInputElement | null;
    const healthVisSelect = document.getElementById('game-health-visible-select') as HTMLSelectElement | null;
    const coinsInput = document.getElementById('game-coins-input') as HTMLInputElement | null;
    const coinsVisSelect = document.getElementById('game-coins-visible-select') as HTMLSelectElement | null;
    const asmaInput = document.getElementById('game-asma-input') as HTMLInputElement | null;
    const asmaVisSelect = document.getElementById('game-asma-visible-select') as HTMLSelectElement | null;

    csState.playerMaxHealth = 100;
    csState.playerHealth = 100;
    csState.isHealthVisible = true;
    csState.playerCoins = 0;
    csState.isCoinsVisible = true;
    csState.playerMaxAsma = 100;
    csState.playerAsma = 100;
    csState.isAsmaVisible = true;
    csState.currentGameMaxPlayers = 8;
    csState.currentGameMinAge = 0;
    csState.currentGameAgeRating = '0+';

    if (healthInput) healthInput.value = '100';
    if (healthVisSelect) healthVisSelect.value = 'visible';
    if (coinsInput) coinsInput.value = '0';
    if (coinsVisSelect) coinsVisSelect.value = 'visible';
    if (asmaInput) asmaInput.value = '100';
    if (asmaVisSelect) asmaVisSelect.value = 'visible';

    updateGameplayHUD();

    // Hide any active feedback banner permanently for this session
    localStorage.setItem('playard_hide_admin_feedback', 'true');
    const banner = document.getElementById('admin-feedback-banner');
    if (banner) banner.style.display = 'none';

    autoSaveDraft();
    alert(initialEnv === 'sea'
        ? '🌊 Uus tühi meremäng loodud! Uju, ehita ja juhi kiirpaate suurel ookeanil!'
        : '✨ Uus tühi mäng loodud! Vali esemeid vasakult kataloogist või küsi AI Assistendilt abi!');
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

        item.querySelector('.btn-delete-saved-game')?.addEventListener('click', async () => {
            if (confirm(`Kas soovid kindlasti mängu "${game.title}" kustutada?`)) {
                await yardService.deleteCreatedGame(game.id);
                yardService.deleteUserSavedGame(profile?.username ?? null, game.id);
                renderMySavedGamesModal();
                alert(`✅ Mäng "${game.title}" on edukalt kustutatud!`);
            }
        });

        listContainer.appendChild(item);
    });
}

export async function restoreDraftOrFeedbackGame() {
    const profile = getCurrentUserProfile();
    let hasRestored = false;

    // 1. Check if admin requested changes with feedback
    if (profile?.username) {
        try {
            const feedbackGames = await yardService.getFeedbackGamesForCreator(profile.username);
            const banner = document.getElementById('admin-feedback-banner');
            if (feedbackGames.length > 0) {
                const fbGame = feedbackGames[0];
                csState.activeFeedbackGameId = fbGame.id;
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
        const urlParams = new URLSearchParams(window.location.search);
        const draft = yardService.getDraftGame(profile?.username ?? null);

        if (urlParams.get('env') === 'sea' || urlParams.get('map') === 'sea') {
            createWholeMapOcean(true);
        } else if (draft && (Array.isArray(draft.objects) || draft.mapType || draft.seaConfig || draft.title)) {
            loadSceneFromData(draft);
            const indicator = document.getElementById('draft-status-indicator');
            if (indicator) {
                indicator.innerText = '💾 Draft Restored';
            }
        }
    }
    updateMapEnvironmentUI();
}
export { updateMapEnvironmentUI } from '../world/environment';
