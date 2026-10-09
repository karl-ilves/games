import { isPlayTestMode, playerAvatarRig, characterVelocity } from '../state/creatorState';
import { isCurrentUserAdmin } from '../ai/aiBuildEngine';
import { getCurrentUserProfile } from '../../../auth';
import { isPositionInWater } from '../world/environment';
import { createCustomModel3DMesh, createObjectMesh } from '../models/objectModels';
import { loadSceneFromData } from '../ui/creatorUI';
import { csState } from "../state/creatorState";
import * as THREE from 'three';
import { PlacedObject, CatalogItem } from '../types';
import {
    scene,
    camera,
    humanCharacter,
    currentVehicle,
    setCurrentVehicle,
    vehicleSpeed,
    setVehicleSpeed,
    nearbyVehicle,
    playerHealth,
    setPlayerHealth,
    playerMaxHealth,
    playerCoins,
    setPlayerCoins,
    playerAsma,
    setPlayerAsma,
    playerMaxAsma,
    isHealthVisible,
    isCoinsVisible,
    isAsmaVisible,
    playerInventory,
    equippedInventoryIndex,
    setEquippedInventoryIndex,
    activeQuest,
    checkpointPosition,
    isGameOver,
    setIsGameOver,
    isGameFinished,
    setIsGameFinished,
    lastAttackTime,
    setLastAttackTime,
    playerAttackDamage,
    playerSpeedMultiplier,
    playerSpeedBoostEndTime,
    isCombatSystemEnabled,
    isMoneySystemEnabled,
    isYardsSystemEnabled,
    placedObjects,
    keys,
    isDraggingObject,
    setIsDraggingObject,
    dragPlane,
    lastPlayerDamageTime,
    setLastPlayerDamageTime
} from '../state/creatorState';
import { isAirplaneObject, isBoatObject } from '../models/objectModels';
import { playGameSound } from './scriptRunner';
import { t } from '../../../shared/i18n_dict';
import { yardService } from '../../../shared/yardService';
import { IN_GAME_SHOP_CATALOG } from '../catalog/creatorCatalog';

export function enterVehicle(vehicle: PlacedObject) {
    if (!isPlayTestMode) return;
    csState.currentVehicle = vehicle;
    csState.vehicleSpeed = 0;
    humanCharacter.visible = false;
    
    const prompt = document.getElementById('enter-vehicle-prompt');
    if (prompt) prompt.style.display = 'none';

    const isPlane = isAirplaneObject(vehicle);
    const isBoat = isBoatObject(vehicle);
    const isAdmin = isCurrentUserAdmin();

    const vehicleHud = document.getElementById('vehicle-hud');
    const vehicleHudIcon = document.getElementById('vehicle-hud-icon');
    const vehicleHudName = document.getElementById('vehicle-hud-name');
    const vehicleHudDesc = document.getElementById('vehicle-hud-desc');

    if (vehicleHud) vehicleHud.style.display = 'block';
    if (vehicleHudIcon) vehicleHudIcon.innerText = isPlane ? '✈️' : (isBoat ? '🛥️' : '🏎️');
    if (vehicleHudName) {
        if (isPlane) {
            vehicleHudName.innerText = vehicle.name.startsWith('✈️') ? vehicle.name : `✈️ ${vehicle.name}`;
        } else if (isBoat) {
            vehicleHudName.innerText = (vehicle.name.startsWith('🛥️') || vehicle.name.startsWith('🚤')) ? vehicle.name : `🛥️ ${vehicle.name}`;
        } else {
            vehicleHudName.innerText = (vehicle.name.startsWith('🏎️') || vehicle.name.startsWith('🚗')) ? vehicle.name : `🏎️ ${vehicle.name}`;
        }
    }
    if (vehicleHudDesc) {
        if (isPlane) {
            vehicleHudDesc.innerHTML = isAdmin
                ? `Gaas: <strong>W / ⬆️</strong> | Pidur: <strong>S / ⬇️</strong> | Pööra: <strong>A / D</strong> | Tõus: <strong>SPACE / Q</strong> | Laskumine: <strong>Shift / E</strong>`
                : `Throttle: <strong>W / ⬆️</strong> | Brake: <strong>S / ⬇️</strong> | Steer: <strong>A / D</strong> | Climb: <strong>SPACE / Q</strong> | Dive: <strong>Shift / E</strong>`;
        } else if (isBoat) {
            vehicleHudDesc.innerHTML = isAdmin
                ? `Mootor / Gaas: <strong>W / ⬆️</strong> | Tagurpidi: <strong>S / ⬇️</strong> | Roolimine merel: <strong>A / D / ⬅️ ➡️</strong>`
                : `Throttle: <strong>W / ⬆️</strong> | Reverse: <strong>S / ⬇️</strong> | Steer on Water: <strong>A / D / ⬅️ ➡️</strong>`;
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
    const isBoat = isBoatObject(currentVehicle);
    const exitPos = currentVehicle.mesh.position.clone().add(new THREE.Vector3(isPlane ? 3.5 : 2.2, isBoat ? 0.3 : 0, 0));
    if (!isBoat && exitPos.y > 0) exitPos.y = 0;
    humanCharacter.position.copy(exitPos);
    humanCharacter.visible = true;
    csState.currentVehicle = null;
    csState.vehicleSpeed = 0;

    const vehicleHud = document.getElementById('vehicle-hud');
    if (vehicleHud) vehicleHud.style.display = 'none';
}

export function updateGameplayHUD() {
    const healthContainer = document.getElementById('hud-health-container');
    const gameplayActions = document.getElementById('gameplay-action-controls');
    const coinsContainer = document.getElementById('hud-coins-container');
    const asmaContainer = document.getElementById('hud-asma-container');
    const yardsContainer = document.getElementById('hud-yards-container');
    const healthText = document.getElementById('player-health-text');
    const healthBar = document.getElementById('player-health-bar');
    const asmaText = document.getElementById('player-asma-text');
    const asmaBar = document.getElementById('player-asma-bar');
    const asmaIcon = document.getElementById('hud-asma-icon');
    const coinsVal = document.getElementById('hud-coins-val');
    const yardsVal = document.getElementById('hud-yards-val');
    const questTracker = document.getElementById('hud-quest-tracker');
    const questTitle = document.getElementById('hud-quest-title');
    const questDesc = document.getElementById('hud-quest-desc');
    const questProgress = document.getElementById('hud-quest-progress');
    const invContainer = document.getElementById('hud-inventory-container');

    const hasCombat = isCombatSystemEnabled || placedObjects.some(o => o.gameItemType === 'enemy' || o.catalogId?.includes('enemy') || o.enemyData != null);

    if (healthContainer) {
        healthContainer.style.display = (isPlayTestMode && isHealthVisible) ? 'flex' : 'none';
    }
    if (gameplayActions) {
        gameplayActions.style.display = (hasCombat && isPlayTestMode) ? 'flex' : 'none';
    }
    if (coinsContainer) {
        coinsContainer.style.display = (isPlayTestMode && isCoinsVisible) ? 'flex' : 'none';
    }
    if (asmaContainer) {
        asmaContainer.style.display = (isPlayTestMode && isAsmaVisible) ? 'flex' : 'none';
    }
    if (yardsContainer) {
        const hasYards = isYardsSystemEnabled || (activeQuest && activeQuest.rewardYards) || placedObjects.some(o => o.gameItemType === 'shop');
        yardsContainer.style.display = (hasYards && isPlayTestMode) ? 'flex' : 'none';
    }

    if (healthText) healthText.innerText = `${Math.max(0, Math.round(playerHealth))}/${playerMaxHealth}`;
    if (healthBar) {
        const pct = Math.max(0, Math.min(100, (playerHealth / playerMaxHealth) * 100));
        healthBar.style.width = `${pct}%`;
        if (pct > 50) healthBar.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
        else if (pct > 25) healthBar.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
        else healthBar.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
    }

    if (asmaText) asmaText.innerText = `${Math.max(0, Math.round(playerAsma))}/${playerMaxAsma}`;
    if (asmaBar) {
        const asmaPct = Math.max(0, Math.min(100, (playerAsma / playerMaxAsma) * 100));
        asmaBar.style.width = `${asmaPct}%`;
        if (asmaPct > 50) asmaBar.style.background = 'linear-gradient(90deg, #00cec9, #0984e3)';
        else if (asmaPct > 25) asmaBar.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
        else asmaBar.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
    }
    if (asmaIcon) {
        asmaIcon.innerText = playerAsma <= 20 ? '😮‍💨' : '🫁';
    }

    if (coinsVal) coinsVal.innerText = playerCoins.toString();
    if (yardsVal) {
        const profile = getCurrentUserProfile();
        const yards = yardService.getYards(profile?.username ?? null);
        yardsVal.innerText = yards.toLocaleString();
    }

    if (questTracker) {
        if (activeQuest && !activeQuest.completed && isPlayTestMode) {
            questTracker.style.display = 'block';
            if (questTitle) questTitle.innerText = activeQuest.title;
            if (questDesc) questDesc.innerText = activeQuest.desc;
            if (questProgress) questProgress.innerText = `[${activeQuest.current}/${activeQuest.target}]`;
        } else {
            questTracker.style.display = 'none';
        }
    }

    const depthContainer = document.getElementById('hud-depth-container');
    const depthVal = document.getElementById('hud-depth-val');
    const inWater = isPositionInWater(humanCharacter.position.x, humanCharacter.position.z);
    if (depthContainer && depthVal) {
        if (inWater && isPlayTestMode) {
            depthContainer.style.display = 'flex';
            const depthM = Math.max(0, -humanCharacter.position.y);
            if (depthM < 0.4) {
                depthVal.innerText = 'Veepinnal';
            } else {
                depthVal.innerText = `${depthM.toFixed(1)} m / 10.0 m`;
            }
        } else {
            depthContainer.style.display = 'none';
        }
    }

    if (invContainer) {
        const slotKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
        let html = '';
        for (let i = 0; i < 10; i++) {
            const keyLabel = slotKeys[i];
            const item = playerInventory[i];
            const isEquipped = (equippedInventoryIndex === i) && !!item;
            const slotStyle = isEquipped
                ? 'background: rgba(35, 55, 45, 0.9); border: 2px solid #ffffff; box-shadow: 0 0 14px rgba(255, 255, 255, 0.75), inset 0 0 8px rgba(255, 255, 255, 0.25); transform: translateY(-2px); cursor: pointer;'
                : (item
                    ? 'background: rgba(22, 28, 38, 0.82); border: 1.5px solid rgba(255, 255, 255, 0.22); cursor: pointer;'
                    : 'background: rgba(20, 26, 32, 0.55); border: 1px solid rgba(255, 255, 255, 0.1); cursor: default;');

            html += `
                <div class="roblox-hotbar-slot" data-slot="${i}" style="position: relative; width: 56px; height: 56px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; user-select: none; transition: all 0.15s ease; ${slotStyle}">
                    <span style="position: absolute; top: 3px; left: 5px; font-size: 0.72rem; font-weight: 800; color: ${isEquipped ? '#00f2fe' : 'rgba(255,255,255,0.75)'}; text-shadow: 0 1px 2px rgba(0,0,0,0.8); pointer-events: none;">${keyLabel}</span>
                    ${item ? `
                        <span style="font-size: 1.5rem; pointer-events: none; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${item.icon || '🗡️'}</span>
                        <span style="position: absolute; bottom: 2px; font-size: 0.58rem; font-weight: 700; color: #fff; max-width: 50px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; pointer-events: none; text-shadow: 0 1px 2px #000;">${item.name}</span>
                    ` : ''}
                </div>
            `;
        }
        invContainer.innerHTML = html;

        const slotEls = invContainer.querySelectorAll('.roblox-hotbar-slot');
        slotEls.forEach(el => {
            el.addEventListener('click', () => {
                const sIdx = parseInt((el as HTMLElement).dataset.slot || '-1', 10);
                if (sIdx >= 0) {
                    toggleInventorySlot(sIdx);
                }
            });
        });
    }
}

export function toggleInventorySlot(slotIndex: number) {
    if (slotIndex < 0 || slotIndex >= 10) return;
    const item = playerInventory[slotIndex];
    if (!item) return;

    if (equippedInventoryIndex === slotIndex) {
        // Unequip current item
        clearHeldItemFromHand();
    } else {
        // Equip item in slot
        setEquippedInventoryIndex(slotIndex);
        equipCustomItemInHand(item.objectRef || item);
    }
    updateGameplayHUD();
}

export function equipCustomItemInHand(item: PlacedObject | CatalogItem) {
    if (!playerAvatarRig) return;
    const handSocket = playerAvatarRig.getHandSocket('right');
    if (!handSocket) return;

    // Clear any previous held item mesh
    while (handSocket.children.length > 0) {
        handSocket.remove(handSocket.children[0]);
    }

    const itemName = item.name;
    const itemColor = item.color || '#00f2fe';
    let heldMesh: THREE.Group | THREE.Mesh;

    if ('mesh' in item && item.mesh) {
        heldMesh = item.mesh.clone(true);
        heldMesh.position.set(0, 0, 0);
        heldMesh.rotation.set(0, 0, 0);
        heldMesh.scale.set(1, 1, 1);
    } else if (item.customModelData) {
        heldMesh = createCustomModel3DMesh(item.customModelData, itemColor);
    } else {
        const catItem: CatalogItem = 'geometryType' in item ? (item as CatalogItem) : {
            id: item.catalogId || item.id,
            name: item.name,
            category: 'custom',
            icon: '🗡️',
            color: itemColor,
            geometryType: 'box',
            baseScale: 1.0
        };
        heldMesh = createObjectMesh(catItem, itemColor);
    }

    // Force visibility on cloned meshes in case the world source mesh was hidden
    heldMesh.visible = true;
    heldMesh.traverse((child: any) => {
        child.visible = true;
    });

    // Center mesh geometry so grip offset / rotation revolves around its true center (matching hand animation editor)
    heldMesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(heldMesh);
    if (!box.isEmpty()) {
        const center = new THREE.Vector3();
        box.getCenter(center);
        heldMesh.position.sub(center);
    }

    const holder = new THREE.Group();
    holder.name = 'PlayerHeldCustomItem';
    holder.add(heldMesh);

    if (item.gripOffset) {
        holder.position.set(item.gripOffset.position.x, item.gripOffset.position.y, item.gripOffset.position.z);
        holder.rotation.set(item.gripOffset.rotation.x, item.gripOffset.rotation.y, item.gripOffset.rotation.z);
        holder.scale.set(item.gripOffset.scale.x, item.gripOffset.scale.y, item.gripOffset.scale.z);
    } else {
        // Default scale and grip position in right hand
        holder.scale.set(0.25, 0.25, 0.25);
        holder.position.set(0, -0.22, 0.15);
        holder.rotation.set(0.2, 0, 0);
    }
    handSocket.add(holder);

    // Add to playerInventory if not already present
    let slotIdx = playerInventory.findIndex(i => i.name === itemName);
    if (slotIdx === -1 && playerInventory.length < 10) {
        playerInventory.push({
            id: 'held_' + Date.now(),
            name: itemName,
            icon: ('icon' in item && (item as any).icon) ? (item as any).icon : '🗡️',
            type: 'holdable',
            objectRef: item
        });
        slotIdx = playerInventory.length - 1;
    } else if (slotIdx !== -1 && !playerInventory[slotIdx].objectRef) {
        playerInventory[slotIdx].objectRef = item;
    }

    if (slotIdx !== -1) {
        setEquippedInventoryIndex(slotIdx);
    }

    // Update player attack damage if weapon has custom damage or config
    if ('weaponConfig' in item && item.weaponConfig?.damage) {
        csState.playerAttackDamage = item.weaponConfig.damage;
    } else if ('damageAmount' in item && item.damageAmount) {
        csState.playerAttackDamage = item.damageAmount;
    }

    updateGameplayHUD();
}

export function clearHeldItemFromHand() {
    if (playerAvatarRig) {
        const handSocket = playerAvatarRig.getHandSocket('right');
        if (handSocket) {
            while (handSocket.children.length > 0) {
                handSocket.remove(handSocket.children[0]);
            }
        }
    }
    setEquippedInventoryIndex(-1);
    updateGameplayHUD();
}

export function damagePlayer(amount: number, force = false) {
    if (isGameOver || isGameFinished || !isPlayTestMode) return;
    const now = Date.now();
    if (!force && now - lastPlayerDamageTime < 600) return;
    csState.lastPlayerDamageTime = now;

    csState.playerHealth = Math.max(0, playerHealth - amount);
    playGameSound('hit');
    updateGameplayHUD();

    // Red screen damage flash
    document.body.style.boxShadow = 'inset 0 0 55px rgba(231,76,60,0.85)';
    setTimeout(() => { document.body.style.boxShadow = 'none'; }, 220);

    if (playerHealth <= 0) {
        triggerGameOver();
    }
}

export function healPlayer(amount: number) {
    csState.playerHealth = Math.min(playerMaxHealth, playerHealth + amount);
    playGameSound('coin');
    updateGameplayHUD();

    // Green screen heal flash
    document.body.style.boxShadow = 'inset 0 0 45px rgba(46,204,113,0.7)';
    setTimeout(() => { document.body.style.boxShadow = 'none'; }, 200);
}

export function isPlayerTouchingOrOnTop(playerPos: THREE.Vector3, p: PlacedObject): boolean {
    if (!p.mesh) return false;
    const box = new THREE.Box3().setFromObject(p.mesh);
    if (box.isEmpty()) return false;

    // Player cylinder approximation: radius 0.45m, feet at playerPos.y, head at playerPos.y + 1.8m
    const playerRadius = 0.45;
    const feetY = playerPos.y;
    const headY = playerPos.y + 1.8;

    // 1. Horizontal check (XZ) with player radius margin
    const minX = box.min.x - playerRadius;
    const maxX = box.max.x + playerRadius;
    const minZ = box.min.z - playerRadius;
    const maxZ = box.max.z + playerRadius;

    if (playerPos.x < minX || playerPos.x > maxX || playerPos.z < minZ || playerPos.z > maxZ) {
        return false;
    }

    // 2. Vertical check (Y): player must be touching, standing on top, or passing through
    // Allow landing on top (feet near box.max.y) or standing inside/contacting the box
    const minY = box.min.y - 0.25;
    const maxY = box.max.y + 0.45;

    return feetY <= maxY && headY >= minY;
}

export function collectCoin(amount = 10) {
    csState.playerCoins += amount;
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
    csState.lastAttackTime = now;

    playGameSound('attack');

    // Human sword swing / punch animation
    humanCharacter.rotation.x = -0.3;
    setTimeout(() => { humanCharacter.rotation.x = 0; }, 150);

    const equippedItem = equippedInventoryIndex >= 0 ? playerInventory[equippedInventoryIndex] : null;
    const holdableObj = equippedItem?.objectRef as PlacedObject | undefined;
    const role = holdableObj?.holdableRole || holdableObj?.weaponConfig?.role || 'item';
    const effectiveDamage = holdableObj?.weaponConfig?.damage || holdableObj?.damageAmount || playerAttackDamage;
    const reach = (role === 'sword' && holdableObj?.weaponConfig?.reachDistance)
        ? Math.max(3.0, holdableObj.weaponConfig.reachDistance)
        : (role === 'gun' ? 30.0 : 4.2);

    // If gun: shoot visual bullet projectile forward
    if (role === 'gun') {
        const bulletGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 12);
        bulletGeo.rotateX(Math.PI / 2);
        const bulletMat = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            emissive: 0xd97706,
            emissiveIntensity: 0.8,
            metalness: 0.8
        });
        const bulletMesh = new THREE.Mesh(bulletGeo, bulletMat);
        const shootOrigin = humanCharacter.position.clone().add(new THREE.Vector3(0, 1.2, 0));
        bulletMesh.position.copy(shootOrigin);
        bulletMesh.rotation.copy(humanCharacter.rotation);
        scene.add(bulletMesh);

        const shootDir = new THREE.Vector3(0, 0, 1).applyEuler(humanCharacter.rotation).normalize();
        let traveled = 0;
        const speed = 1.0;
        const bulletInterval = setInterval(() => {
            bulletMesh.position.addScaledVector(shootDir, speed);
            traveled += speed;
            if (traveled >= 25 || !isPlayTestMode) {
                clearInterval(bulletInterval);
                scene.remove(bulletMesh);
            }
        }, 16);
    }

    // Hit nearby enemies
    for (let i = placedObjects.length - 1; i >= 0; i--) {
        const obj = placedObjects[i];
        if (obj.gameItemType === 'enemy' || obj.gameItemType === 'boss' || obj.enemyData) {
            const dist = humanCharacter.position.distanceTo(obj.mesh.position);
            if (dist < reach) {
                if (obj.enemyData) {
                    obj.enemyData.health -= effectiveDamage;
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
    csState.isGameFinished = true;
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
    csState.isGameOver = true;
    playGameSound('gameover');
    const modal = document.getElementById('game-over-modal');
    if (modal) modal.style.display = 'flex';
}

export function respawnPlayerAtCheckpoint() {
    csState.isGameOver = false;
    csState.playerHealth = playerMaxHealth;
    humanCharacter.position.copy(checkpointPosition);
    characterVelocity.set(0, 0, 0);
    csState.isGrounded = true;

    const modal = document.getElementById('game-over-modal');
    if (modal) modal.style.display = 'none';
    updateGameplayHUD();
}

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
            csState.playerCoins -= item.price;
            playGameSound('coin');
            if (item.type === 'heal') healPlayer(50);
            else if (item.type === 'weapon') {
                csState.playerAttackDamage += 25;
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
            csState.playerMaxHealth += 50;
            csState.playerHealth += 50;
            updateGameplayHUD();
            openInGameShop();
        } else {
            alert('Pole piisavalt Yarde! Teeni Yarde mänge mängides.');
        }
    }
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