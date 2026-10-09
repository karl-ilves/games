import * as THREE from 'three';
import { buildSceneObjectMesh } from '../../../shared/sceneObjectBuilder';
import { PlayState } from '../state/playState';

export function buildSceneFromData(sceneData: any, state: PlayState, scene: THREE.Scene) {
    if (!sceneData || !Array.isArray(sceneData.objects)) return;

    if (typeof sceneData.playerMaxHealth === 'number') {
        state.playerMaxHealth = sceneData.playerMaxHealth;
        state.playerHealth = state.playerMaxHealth;
    }

    sceneData.objects.forEach((obj: any) => {
        const group = buildSceneObjectMesh(obj);
        group.userData = { ...group.userData, ...obj };

        // Position at spawn point
        if (obj.isSpawnPoint || obj.category === 'spawn' || (obj.catalogId && obj.catalogId.startsWith('spawn_'))) {
            state.spawnPointPosition.set(obj.position?.x || 0, (obj.position?.y || 0) + 0.1, obj.position?.z || 0);
            if (state.humanCharacter) {
                state.humanCharacter.position.copy(state.spawnPointPosition);
            }
            if (obj.rotation?.y) {
                state.characterYaw = obj.rotation.y;
                if (state.humanCharacter) {
                    state.humanCharacter.rotation.y = obj.rotation.y;
                }
            }
        }

        // Equip starter holdable item in hand
        if ((obj.isHoldable || obj.customModelData?.isHoldable) && (obj.inHandAtStart || obj.customModelData?.inHandAtStart)) {
            state.equipPlayItemInHand(obj);
            group.visible = false;
            group.userData.isCollected = true;
        }

        // Passable objects allow player to walk right through
        const name = (obj.name || '').toLowerCase();
        const isCollectible = obj.gameItemType === 'coin' || obj.gameItemType === 'key' || obj.gameItemType === 'potion' || /(coin|münt|potion|key|võti)/i.test(name) || obj.isHoldable;
        group.userData.isPassable = (obj.isPassable === true) || isCollectible || obj.isSpawnPoint;
        state.sceneObjects.push(group);

        scene.add(group);
    });

    // Render 2D Screen Elements if present
    if (Array.isArray(sceneData.screenElements) && sceneData.screenElements.length > 0) {
        renderPlayScreenElements(sceneData.screenElements, state);
    }

    state.updatePlayHUD();
}

function renderPlayScreenElements(elements: any[], state: PlayState) {
    const container = document.getElementById('screen-gui-container');
    if (!container) return;
    container.innerHTML = '';

    elements.forEach(elem => {
        if (elem.visible === false) return;

        const elDiv = document.createElement('div');
        elDiv.id = `gui-${elem.id}`;
        elDiv.className = 'screen-gui-element';
        elDiv.style.position = 'absolute';
        elDiv.style.left = `${elem.position?.x ?? 20}px`;
        elDiv.style.top = `${elem.position?.y ?? 20}px`;
        elDiv.style.width = `${elem.size?.width ?? 120}px`;
        elDiv.style.height = `${elem.size?.height ?? 50}px`;
        elDiv.style.borderRadius = `${elem.borderRadius ?? 10}px`;
        elDiv.style.boxSizing = 'border-box';
        elDiv.style.pointerEvents = 'auto';
        elDiv.style.userSelect = 'none';
        elDiv.style.display = 'flex';
        elDiv.style.flexDirection = 'column';
        elDiv.style.alignItems = 'center';
        elDiv.style.justifyContent = 'center';
        elDiv.style.overflow = 'hidden';
        elDiv.style.border = '1px solid rgba(255, 255, 255, 0.15)';
        elDiv.style.boxShadow = '0 8px 24px rgba(0,0,0,0.45)';
        elDiv.style.cursor = elem.type.includes('button') ? 'pointer' : 'default';

        if (elem.backgroundColor) {
            elDiv.style.background = elem.backgroundColor;
        }

        if (elem.type === 'text_button' || elem.type === 'button') {
            const btnSpan = document.createElement('span');
            btnSpan.style.color = elem.textColor || '#fff';
            btnSpan.style.fontWeight = '800';
            btnSpan.style.fontSize = `${elem.fontSize || 15}px`;
            btnSpan.style.padding = '4px 10px';
            btnSpan.style.textAlign = 'center';
            btnSpan.textContent = elem.text || 'TextButton';
            elDiv.appendChild(btnSpan);
        } else if (elem.type === 'frame_button') {
            elDiv.style.border = '2px solid rgba(245, 158, 11, 0.7)';
            elDiv.style.boxShadow = '0 6px 18px rgba(0,0,0,0.4)';
            if (elem.text) {
                const btnSpan = document.createElement('span');
                btnSpan.style.color = elem.textColor || '#fff';
                btnSpan.style.fontWeight = '700';
                btnSpan.style.fontSize = `${elem.fontSize || 14}px`;
                btnSpan.style.padding = '4px 8px';
                btnSpan.style.textAlign = 'center';
                btnSpan.textContent = elem.text;
                elDiv.appendChild(btnSpan);
            }
        } else if (elem.type === 'frame') {
            elDiv.style.border = '1px solid rgba(255, 255, 255, 0.15)';
            if (elem.text) {
                const txt = document.createElement('div');
                txt.style.padding = '6px';
                txt.style.color = elem.textColor || '#cbd5e1';
                txt.style.fontSize = `${elem.fontSize || 13}px`;
                txt.textContent = elem.text;
                elDiv.appendChild(txt);
            }
        } else if (elem.type === 'text_frame' || elem.type === 'screen') {
            const titleBar = document.createElement('div');
            titleBar.style.width = '100%';
            titleBar.style.padding = '6px 10px';
            titleBar.style.background = 'rgba(255,255,255,0.06)';
            titleBar.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            titleBar.style.fontWeight = '800';
            titleBar.style.fontSize = '0.8rem';
            titleBar.style.color = '#a78bfa';
            titleBar.innerHTML = `<span>📄 ${elem.name || 'TextFrame'}</span>`;

            const content = document.createElement('div');
            content.style.flex = '1';
            content.style.width = '100%';
            content.style.padding = '8px 12px';
            content.style.color = elem.textColor || '#cbd5e1';
            content.style.fontSize = `${elem.fontSize || 13}px`;
            content.style.overflowY = 'auto';
            content.style.lineHeight = '1.4';
            content.textContent = elem.text || '';

            elDiv.appendChild(titleBar);
            elDiv.appendChild(content);
        } else if (elem.type === 'image_button') {
            if (elem.imageUrl) {
                const img = document.createElement('img');
                img.src = elem.imageUrl;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.pointerEvents = 'none';
                elDiv.appendChild(img);
            }
            if (elem.text) {
                const badge = document.createElement('div');
                badge.style.position = 'absolute';
                badge.style.bottom = '2px';
                badge.style.left = '0';
                badge.style.right = '0';
                badge.style.background = 'rgba(0,0,0,0.6)';
                badge.style.color = '#fff';
                badge.style.fontSize = '10px';
                badge.style.fontWeight = 'bold';
                badge.style.textAlign = 'center';
                badge.textContent = elem.text;
                elDiv.appendChild(badge);
            }
        } else if (elem.type === 'image_screen') {
            if (elem.imageUrl) {
                const img = document.createElement('img');
                img.src = elem.imageUrl;
                img.style.width = '100%';
                img.style.height = elem.text ? 'calc(100% - 24px)' : '100%';
                img.style.objectFit = 'cover';
                img.style.pointerEvents = 'none';
                elDiv.appendChild(img);
            }
            if (elem.text) {
                const caption = document.createElement('div');
                caption.style.width = '100%';
                caption.style.height = '24px';
                caption.style.lineHeight = '24px';
                caption.style.background = 'rgba(0,0,0,0.7)';
                caption.style.color = elem.textColor || '#fff';
                caption.style.fontSize = '12px';
                caption.style.fontWeight = 'bold';
                caption.style.textAlign = 'center';
                caption.textContent = elem.text;
                elDiv.appendChild(caption);
            }
        }

        const isClickable = elem.type === 'text_button' || elem.type === 'frame_button' || elem.type === 'button' || elem.type === 'image_button';
        if (isClickable) {
            elDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                elDiv.style.transform = 'scale(0.95)';
                setTimeout(() => { elDiv.style.transform = 'scale(1)'; }, 100);

                if (elem.action && elem.action.type !== 'none') {
                    if (elem.action.type === 'heal') {
                        const amt = Number(elem.action.value) || 25;
                        state.playerHealth = Math.min(state.playerMaxHealth, state.playerHealth + amt);
                        state.updatePlayHUD();
                    } else if (elem.action.type === 'speed_boost') {
                        state.playerSpeedMultiplier = 1.6;
                        state.playerSpeedBoostEndTime = performance.now() + 5000;
                    }
                }
            });
        }

        container.appendChild(elDiv);
    });
}
