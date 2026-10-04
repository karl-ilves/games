import * as THREE from 'three';
import { yardService, CreatedGame } from '../../../shared/yardService';
import { AvatarRig } from '../../../shared/avatar/AvatarRig';
import { buildSceneObjectMesh } from '../../../shared/sceneObjectBuilder';
import { PlayInventoryItem } from '../types';
import { playPlaySound } from '../audio';

export class PlayState {
    public playerHealth = 100;
    public playerMaxHealth = 100;
    public playerInventory: PlayInventoryItem[] = [];
    public equippedInventoryIndex = -1;
    public spawnPointPosition = new THREE.Vector3(0, 0, 0);
    public pendingPurchaseObject: { objData: any; group: THREE.Group } | null = null;
    public lastDamageTime = 0;

    public playerSpeedMultiplier = 1.0;
    public playerSpeedBoostEndTime = 0;
    public playDialogTimer: any = null;

    public humanCharacter!: THREE.Group;
    public characterVelocity = new THREE.Vector3();
    public isGrounded = true;
    public characterYaw = 0;
    public keys: { [key: string]: boolean } = {};
    public currentGame: CreatedGame | null = null;
    public sceneObjects: THREE.Group[] = [];
    public playerAvatarRig: AvatarRig | null = null;

    public updatePlayHUD() {
        const pbxVal = document.getElementById('player-pbx-val');
        if (pbxVal) {
            pbxVal.innerText = yardService.getPlaybux().toLocaleString();
        }
        const healthBar = document.getElementById('play-health-bar');
        const healthText = document.getElementById('play-health-text');
        if (healthText) healthText.innerText = `${Math.max(0, Math.round(this.playerHealth))}/${this.playerMaxHealth}`;
        if (healthBar) {
            const pct = Math.max(0, Math.min(100, (this.playerHealth / this.playerMaxHealth) * 100));
            healthBar.style.width = `${pct}%`;
            if (pct > 50) healthBar.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
            else if (pct > 25) healthBar.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
            else healthBar.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
        }

        const invContainer = document.getElementById('play-inventory-hud');
        if (invContainer) {
            const slotKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
            let html = '';
            for (let i = 0; i < 10; i++) {
                const keyLabel = slotKeys[i];
                const item = this.playerInventory[i];
                const isEquipped = (this.equippedInventoryIndex === i) && !!item;
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
                        this.togglePlayInventorySlot(sIdx);
                    }
                });
            });
        }
    }

    public showPlayDialogMessage(title: string, message: string, icon = '💬', autoHideSec = 3.5) {
        const popup = document.getElementById('play-dialog-popup');
        const titleEl = document.getElementById('play-dialog-title');
        const textEl = document.getElementById('play-dialog-text');
        const iconEl = document.getElementById('play-dialog-icon');
        const actionsEl = document.getElementById('play-dialog-actions');
        if (popup && titleEl && textEl) {
            if (iconEl) iconEl.innerText = icon;
            titleEl.innerText = title;
            textEl.innerText = message;
            if (actionsEl && !this.pendingPurchaseObject) {
                actionsEl.style.display = 'none';
            } else if (actionsEl) {
                actionsEl.style.display = 'flex';
            }
            popup.style.display = 'block';
            if (this.playDialogTimer) clearTimeout(this.playDialogTimer);
            if (autoHideSec > 0 && !this.pendingPurchaseObject) {
                this.playDialogTimer = setTimeout(() => {
                    if (popup && !this.pendingPurchaseObject) popup.style.display = 'none';
                }, autoHideSec * 1000);
            }
        }
    }

    public playSuperJump(force = 22) {
        this.characterVelocity.y = force;
        this.isGrounded = false;
        playPlaySound('jump');
        this.showPlayDialogMessage('🚀 Superhüpe!', `Lennutati õhku jõuga ${force}!`, '🚀', 2.5);
    }

    public playSpeedBoost(multiplier = 2.2, durationSec = 4.0) {
        this.playerSpeedMultiplier = multiplier;
        this.playerSpeedBoostEndTime = Date.now() + durationSec * 1000;
        playPlaySound('powerup');
        this.showPlayDialogMessage('⚡ Superkiirus!', `Liikumiskiirus on ${multiplier}x kiirem järgmised ${Math.round(durationSec)}s!`, '⚡', 2.5);
    }

    public damagePlayPlayer(amount: number) {
        const now = Date.now();
        if (now - this.lastDamageTime < 600) return;
        this.lastDamageTime = now;

        this.playerHealth = Math.max(0, this.playerHealth - amount);
        this.updatePlayHUD();
        playPlaySound('hit');

        document.body.style.boxShadow = 'inset 0 0 55px rgba(231,76,60,0.85)';
        setTimeout(() => { document.body.style.boxShadow = 'none'; }, 220);

        if (this.playerHealth <= 0) {
            alert('💀 Said surma! Taassündisid alguspunktis.');
            if (this.humanCharacter) {
                this.humanCharacter.position.copy(this.spawnPointPosition);
            }
            this.characterVelocity.set(0, 0, 0);
            this.playerHealth = this.playerMaxHealth;
            this.updatePlayHUD();
        }
    }

    public togglePlayInventorySlot(slotIndex: number) {
        if (slotIndex < 0 || slotIndex >= 10) return;
        const item = this.playerInventory[slotIndex];
        if (!item) return;

        if (this.equippedInventoryIndex === slotIndex) {
            // Unequip current item
            this.clearHeldPlayItem();
        } else {
            // Equip item in slot
            this.equippedInventoryIndex = slotIndex;
            this.equipPlayItemInHand((item as any).objectRef || item);
        }
        this.updatePlayHUD();
    }

    public clearHeldPlayItem() {
        if (this.playerAvatarRig) {
            const handSocket = this.playerAvatarRig.getHandSocket('right');
            if (handSocket) {
                while (handSocket.children.length > 0) {
                    handSocket.remove(handSocket.children[0]);
                }
            }
        }
        this.equippedInventoryIndex = -1;
        this.updatePlayHUD();
    }

    public equipPlayItemInHand(item: any) {
        if (!this.playerAvatarRig) return;
        const handSocket = this.playerAvatarRig.getHandSocket('right');
        if (!handSocket) return;

        while (handSocket.children.length > 0) {
            handSocket.remove(handSocket.children[0]);
        }

        const heldMesh = buildSceneObjectMesh({
            ...item,
            position: { x: 0, y: 0, z: 0 }
        });
        if (item.gripOffset) {
            heldMesh.position.set(item.gripOffset.position.x, item.gripOffset.position.y, item.gripOffset.position.z);
            heldMesh.rotation.set(item.gripOffset.rotation.x, item.gripOffset.rotation.y, item.gripOffset.rotation.z);
            heldMesh.scale.set(item.gripOffset.scale.x, item.gripOffset.scale.y, item.gripOffset.scale.z);
        } else {
            heldMesh.scale.set(0.25, 0.25, 0.25);
            heldMesh.position.set(0, -0.22, 0.15);
            heldMesh.rotation.set(0.2, 0, 0);
        }
        heldMesh.name = 'PlayHeldCustomItem';
        handSocket.add(heldMesh);

        const itemName = item.name || 'Ese';
        let slotIdx = this.playerInventory.findIndex(i => i.name === itemName);
        if (slotIdx === -1 && this.playerInventory.length < 10) {
            this.playerInventory.push({
                id: 'held_' + Date.now(),
                name: itemName,
                icon: item.icon || '🗡️',
                type: 'holdable',
                objectRef: item
            } as any);
            slotIdx = this.playerInventory.length - 1;
        } else if (slotIdx !== -1 && !(this.playerInventory[slotIdx] as any).objectRef) {
            (this.playerInventory[slotIdx] as any).objectRef = item;
        }

        if (slotIdx !== -1) {
            this.equippedInventoryIndex = slotIdx;
        }
        this.updatePlayHUD();
    }
}

export const playState = new PlayState();
