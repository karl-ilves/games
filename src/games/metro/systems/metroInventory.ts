import * as THREE from 'three';
import { MetroEntities } from '../models/metroEntities';
import { metroAudio } from '../audio';

export class MetroInventory extends MetroEntities {
    public addCoins(amount: number) {
        this.coins += amount;
        this.updateCoinsUI();
        try {
            localStorage.setItem('last_metro_coins', String(this.coins));
        } catch (e) {}
    }

    public spendCoins(amount: number): boolean {
        if (this.coins < amount) return false;
        this.coins -= amount;
        this.updateCoinsUI();
        try {
            localStorage.setItem('last_metro_coins', String(this.coins));
        } catch (e) {}
        return true;
    }

    public updateCoinsUI() {
        const isEt = this.lang === 'et';
        const coinsLabel = document.getElementById('hud-coins-label');
        if (coinsLabel) {
            coinsLabel.innerText = isEt ? `${this.coins} COINI` : `${this.coins} COINS`;
        }
        const shopBal = document.getElementById('shop-coin-balance');
        if (shopBal) {
            shopBal.innerText = isEt ? `🪙 ${this.coins} COINI` : `🪙 ${this.coins} COINS`;
        }
    }

    public unlockItem(itemKey: string) {
        if (this.inventory[itemKey]) return;
        this.inventory[itemKey] = true;
        this.updateHotbarUI();
        metroAudio.playItemEquip();

        const isEt = this.lang === 'et';
        if (itemKey === 'key') {
            this.showThought('Sain VÕTME! 🗝️ (Klõpsa ekraani all olevale võtmele, et see kätte võtta nagu Robloxsis)', 'Acquired KEY! 🗝️ (Click the hotbar slot below to equip it like in Roblox)');
        }
        try {
            localStorage.setItem('last_metro_inventory', JSON.stringify(this.inventory));
        } catch (e) {}
    }

    public toggleEquipItem(itemKey: string) {
        if (this.equippedItem === itemKey) {
            // Unequip item ("nagu robloxsis")
            this.equippedItem = null;
            if (this.heldItemMesh) {
                this.camera.remove(this.heldItemMesh);
                this.heldItemMesh = null;
            }
            if (itemKey === 'night_vision') {
                this.nightVisionActive = false;
                const nvOverlay = document.getElementById('night-vision-overlay');
                if (nvOverlay) nvOverlay.style.display = 'none';
            } else if (itemKey === 'radio') {
                this.radioActive = false;
                metroAudio.stopRadioAudio();
            } else if (itemKey === 'speed_boost') {
                this.speedBoostActive = false;
            } else if (itemKey === 'clue_detector') {
                this.clueDetectorActive = false;
            }
            metroAudio.playItemEquip();
            this.updateHotbarUI();
        } else {
            // Equip new item
            this.equippedItem = itemKey;
            metroAudio.playItemEquip();

            if (this.heldItemMesh) {
                this.camera.remove(this.heldItemMesh);
                this.heldItemMesh = null;
            }

            // Create 3D held model on camera view
            this.heldItemMesh = this.createHeldItemModel(itemKey);
            if (this.heldItemMesh) {
                this.heldItemMesh.position.set(0.26, -0.22, -0.45);
                this.camera.add(this.heldItemMesh);
            }

            if (itemKey === 'night_vision') {
                this.nightVisionActive = true;
                const nvOverlay = document.getElementById('night-vision-overlay');
                if (nvOverlay) nvOverlay.style.display = 'block';
            } else if (itemKey === 'radio') {
                this.radioActive = true;
                metroAudio.playRadioAudio();
            } else if (itemKey === 'speed_boost') {
                this.speedBoostActive = true;
            } else if (itemKey === 'clue_detector') {
                this.clueDetectorActive = true;
            }
            this.updateHotbarUI();
        }
    }

    public updateHotbarUI() {
        const hotbar = document.getElementById('inventory-hotbar');
        if (!hotbar) return;
        hotbar.innerHTML = '';

        const isEt = this.lang === 'et';
        let currentSlot = 1;

        // Slot 1: Sword (⚔️ Mõõk)
        if (this.inventory['sword']) {
            const slotNum = currentSlot++;
            const slotDiv = document.createElement('div');
            slotDiv.className = `hotbar-slot ${this.equippedItem === 'sword' ? 'equipped' : ''}`;
            slotDiv.id = 'slot-sword';
            slotDiv.innerHTML = `
                <span class="slot-num">${slotNum}</span>
                <span class="slot-icon">⚔️</span>
                <span class="slot-name">${isEt ? 'Mõõk' : 'Sword'}</span>
            `;
            slotDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleEquipItem('sword');
            });
            hotbar.appendChild(slotDiv);
        }

        // Slot 2: Tuli / Taskulamp (🔦 Tuli / Flashlight) - User requirement: "kaust ja tuli peab olema seal"
        {
            const slotNum = currentSlot++;
            const slotDiv = document.createElement('div');
            slotDiv.className = `hotbar-slot ${this.flashlightOn ? 'equipped' : ''}`;
            slotDiv.id = 'slot-flashlight';
            slotDiv.innerHTML = `
                <span class="slot-num">${slotNum}</span>
                <span class="slot-icon">🔦</span>
                <span class="slot-name">${isEt ? 'Tuli' : 'Light'}</span>
            `;
            slotDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFlashlight();
            });
            hotbar.appendChild(slotDiv);
        }

        // Slot 3: Kaust / Seljakott (📁 Kaust / Folder) - User requirement: "kaust ja tuli peab olema seal"
        {
            const slotNum = currentSlot++;
            const isFolderOpen = document.getElementById('clues-folder-modal')?.style.display === 'flex';
            const slotDiv = document.createElement('div');
            slotDiv.className = `hotbar-slot ${isFolderOpen ? 'equipped' : ''}`;
            slotDiv.id = 'slot-clues_folder';
            slotDiv.innerHTML = `
                <span class="slot-num">${slotNum}</span>
                <span class="slot-icon">📁</span>
                <span class="slot-name">${isEt ? 'Kaust' : 'Folder'}</span>
            `;
            slotDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCluesFolderModal();
            });
            hotbar.appendChild(slotDiv);
        }

        // Slot 4: Admin / Owner Paneel (👑 Admin) - User requirement: "admini paneel läheb kausta kõrvale"
        if (this.isOwner) {
            const slotNum = currentSlot++;
            const isOwnerOpen = document.getElementById('owner-teleport-modal')?.style.display === 'flex';
            const slotDiv = document.createElement('div');
            slotDiv.className = `hotbar-slot ${isOwnerOpen ? 'equipped' : ''}`;
            slotDiv.id = 'slot-owner_panel';
            slotDiv.style.borderColor = 'rgba(255, 211, 42, 0.6)';
            slotDiv.innerHTML = `
                <span class="slot-num">${slotNum}</span>
                <span class="slot-icon">👑</span>
                <span class="slot-name">${isEt ? 'Admin' : 'Owner'}</span>
            `;
            slotDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                const modal = document.getElementById('owner-teleport-modal');
                if (modal && modal.style.display === 'flex') {
                    this.closeOwnerTeleportModal();
                } else {
                    this.openOwnerTeleportModal();
                }
            });
            hotbar.appendChild(slotDiv);
        }

        // Unlockable / Purchasable items in hotbar
        const itemDefs: { key: string; icon: string; nameEt: string; nameEn: string }[] = [
            { key: 'key', icon: '🗝️', nameEt: 'Võti', nameEn: 'Key' },
            { key: 'night_vision', icon: '👓', nameEt: 'Ööprillid', nameEn: 'NV Goggles' },
            { key: 'speed_boost', icon: '👟', nameEt: 'Kiirus', nameEn: 'Speed' },
            { key: 'clue_detector', icon: '🔍', nameEt: 'Vihjeandur', nameEn: 'Detector' },
            { key: 'secret_pass', icon: '🎟️', nameEt: 'Salapilet', nameEn: 'Secret Pass' },
            { key: 'radio', icon: '📻', nameEt: 'Raadio', nameEn: 'Radio' }
        ];

        itemDefs.forEach(def => {
            if (this.inventory[def.key]) {
                const slotNum = currentSlot++;
                const slotDiv = document.createElement('div');
                slotDiv.className = `hotbar-slot ${this.equippedItem === def.key ? 'equipped' : ''}`;
                slotDiv.id = `slot-${def.key}`;
                slotDiv.innerHTML = `
                    <span class="slot-num">${slotNum}</span>
                    <span class="slot-icon">${def.icon}</span>
                    <span class="slot-name">${isEt ? def.nameEt : def.nameEn}</span>
                `;
                slotDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleEquipItem(def.key);
                });
                hotbar.appendChild(slotDiv);
            }
        });
    }
}
