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
            invContainer.innerHTML = this.playerInventory.map(item => `
                <div style="background: rgba(15,23,42,0.92); border: 1.5px solid #00f2fe; border-radius: 8px; padding: 4px 10px; font-size: 0.85rem; font-weight: bold; color: #fff; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                    <span>${item.icon || '🗡️'}</span> <span>${item.name}</span>
                </div>
            `).join('');
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
        heldMesh.scale.set(0.25, 0.25, 0.25);
        heldMesh.position.set(0, -0.22, 0.15);
        heldMesh.rotation.set(0.2, 0, 0);
        heldMesh.name = 'PlayHeldCustomItem';
        handSocket.add(heldMesh);

        const itemName = item.name || 'Ese';
        if (!this.playerInventory.some(i => i.name === itemName)) {
            this.playerInventory.push({
                id: 'held_' + Date.now(),
                name: itemName,
                icon: item.icon || '🗡️',
                type: 'holdable'
            });
            this.updatePlayHUD();
        }
    }
}

export const playState = new PlayState();
