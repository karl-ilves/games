import { avatarService } from '../shared/avatar/AvatarService';
import { AvatarViewer } from '../shared/avatar/AvatarViewer';
import { AVATAR_CATALOG, getItemById, getItemsByCategory } from '../shared/avatar/catalog';
import { AvatarItem, AvatarCategory, AvatarConfig } from '../shared/avatar/types';
import { yardService } from '../shared/yardService';

export class AvatarShopEditorModal {
    private modalEl: HTMLElement;
    private viewer: AvatarViewer | null = null;
    private currentCategory: AvatarCategory = 'hats';
    private previewConfig: AvatarConfig;

    constructor() {
        this.previewConfig = avatarService.getConfig();
        this.modalEl = this.createModalStructure();
        document.body.appendChild(this.modalEl);
        this.setupEvents();
    }

    private createModalStructure(): HTMLElement {
        const modal = document.createElement('div');
        modal.id = 'modal-avatar-shop-editor';
        modal.className = 'avatar-shop-modal-overlay';
        modal.style.display = 'none';

        modal.innerHTML = `
            <div class="avatar-shop-card">
                <!-- Header -->
                <div class="avatar-shop-header">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 1.8rem;">🛍️</span>
                        <div>
                            <h2 style="margin: 0; font-size: 1.5rem; background: linear-gradient(135deg, #00f2fe, #4facfe); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                                3D Avatar Shop & Editor
                            </h2>
                            <p style="margin: 2px 0 0 0; font-size: 0.82rem; color: #8899a6;">
                                Kohanda oma 3D avatari, proovi ja osta eksklusiivseid esemeid Playard Yardide eest!
                            </p>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div class="avatar-modal-yard-pill">
                            <span id="modal-yard-icon"></span>
                            <strong id="modal-shop-yard-val">0</strong> YARDS
                        </div>
                        <button class="avatar-modal-close-btn" id="btn-close-avatar-shop">&times;</button>
                    </div>
                </div>

                <!-- Main Body -->
                <div class="avatar-shop-body">
                    <!-- Left: 3D Viewport & Emotes / Controls -->
                    <div class="avatar-preview-column">
                        <div class="avatar-3d-viewport" id="avatar-editor-viewport-slot">
                            <!-- Overlay helper prompt -->
                            <div class="avatar-viewport-hint">
                                🔄 Lohista hiirega / sõrmega 360° pööramiseks · Kerimisratas suumib
                            </div>
                        </div>

                        <!-- Emotes Bar -->
                        <div class="avatar-emotes-bar">
                            <span style="font-size: 0.78rem; font-weight: 700; color: #8899a6; text-transform: uppercase;">Poos / Emote:</span>
                            <div class="avatar-emote-buttons">
                                <button class="btn-emote active" data-emote="idle">🧍 Seisa</button>
                                <button class="btn-emote" data-emote="wave">👋 Lehvita</button>
                                <button class="btn-emote" data-emote="dance">🕺 Tantsi</button>
                                <button class="btn-emote" data-emote="jump">🦘 Hüpe</button>
                            </div>
                        </div>

                        <!-- Save & Reset Actions -->
                        <div class="avatar-save-actions">
                            <button class="btn-avatar-reset" id="btn-avatar-reset-preview">🔄 Taasta algne</button>
                            <button class="btn-avatar-save" id="btn-avatar-save-config">💾 Salvesta Avatar</button>
                        </div>
                    </div>

                    <!-- Right: Catalog & Inventory Tabs -->
                    <div class="avatar-catalog-column">
                        <!-- Category Tabs -->
                        <div class="avatar-category-nav" id="avatar-category-tabs">
                            <button class="cat-btn active" data-category="hats">👑 Mütsid</button>
                            <button class="cat-btn" data-category="hair">💇 Juuksed</button>
                            <button class="cat-btn" data-category="skin">🎨 Nahk</button>
                            <button class="cat-btn" data-category="face">🕶️ Nägu</button>
                            <button class="cat-btn" data-category="tops">👕 Riided</button>
                            <button class="cat-btn" data-category="pants">👖 Püksid</button>
                            <button class="cat-btn" data-category="shoes">👟 Jalanõud</button>
                            <button class="cat-btn" data-category="back">🎒 Seljakotid</button>
                            <button class="cat-btn" data-category="emotes">✨ Emotes</button>
                        </div>

                        <!-- Status Notification -->
                        <div id="avatar-shop-toast" class="avatar-shop-toast" style="display: none;"></div>

                        <!-- Items Grid -->
                        <div class="avatar-items-grid" id="avatar-items-container"></div>
                    </div>
                </div>
            </div>
        `;

        return modal;
    }

    private setupEvents() {
        // Yard Icon
        const iconSlot = this.modalEl.querySelector('#modal-yard-icon');
        if (iconSlot) iconSlot.innerHTML = yardService.renderYardSvg(16);

        // Close button
        const closeBtn = this.modalEl.querySelector('#btn-close-avatar-shop');
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());

        this.modalEl.addEventListener('click', (e) => {
            if (e.target === this.modalEl) this.close();
        });

        // Category Buttons
        const catButtons = this.modalEl.querySelectorAll('.cat-btn');
        catButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                catButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategory = btn.getAttribute('data-category') as AvatarCategory;
                this.renderCatalogItems();
            });
        });

        // Emote Buttons
        const emoteButtons = this.modalEl.querySelectorAll('.btn-emote');
        emoteButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                emoteButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const emote = btn.getAttribute('data-emote') || 'idle';
                this.previewConfig.activeEmote = emote as any;
                if (this.viewer) {
                    this.viewer.setEmote(emote);
                }
            });
        });

        // Reset
        const resetBtn = this.modalEl.querySelector('#btn-avatar-reset-preview');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.previewConfig = avatarService.getConfig();
                if (this.viewer) this.viewer.updateConfig(this.previewConfig);
                this.renderCatalogItems();
                this.showToast('Esialgne välimus taastatud!', '#00f2fe');
            });
        }

        // Save
        const saveBtn = this.modalEl.querySelector('#btn-avatar-save-config');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                await avatarService.saveAvatar(this.previewConfig);
                this.showToast('✅ Avatar edukalt salvestatud ja sünkroonitud!', '#2ecc71');
                this.renderCatalogItems();
            });
        }
    }

    public open() {
        this.previewConfig = avatarService.getConfig();
        this.modalEl.style.display = 'flex';
        this.updateYardBalance();

        // Initialize 3D Viewer if not already created
        const viewportSlot = this.modalEl.querySelector('#avatar-editor-viewport-slot') as HTMLElement;
        if (viewportSlot && !this.viewer) {
            this.viewer = new AvatarViewer(viewportSlot, this.previewConfig, false);
        } else if (this.viewer) {
            this.viewer.updateConfig(this.previewConfig);
            this.viewer.resize();
        }

        this.renderCatalogItems();
    }

    public close() {
        this.modalEl.style.display = 'none';
    }

    private updateYardBalance() {
        const yardEl = this.modalEl.querySelector('#modal-shop-yard-val');
        if (yardEl) yardEl.textContent = yardService.getYards().toLocaleString();
    }

    private showToast(msg: string, color: string) {
        const toast = this.modalEl.querySelector('#avatar-shop-toast') as HTMLElement;
        if (!toast) return;
        toast.textContent = msg;
        toast.style.borderColor = color;
        toast.style.color = color;
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3500);
    }

    private isItemEquipped(item: AvatarItem): boolean {
        switch (item.category) {
            case 'skin': return this.previewConfig.skinColor === item.defaultColor;
            case 'hair': return this.previewConfig.hairId === item.id;
            case 'face': return this.previewConfig.faceId === item.id;
            case 'tops': return this.previewConfig.topId === item.id;
            case 'pants': return this.previewConfig.pantsId === item.id;
            case 'shoes': return this.previewConfig.shoesId === item.id;
            case 'hats': return this.previewConfig.hatId === item.id;
            case 'back': return this.previewConfig.backId === item.id;
            case 'emotes': return this.previewConfig.activeEmote === (item.id === 'emote_dance_spin' ? 'dance' : 'wave');
        }
        return false;
    }

    private renderCatalogItems() {
        const container = this.modalEl.querySelector('#avatar-items-container');
        if (!container) return;

        const items = getItemsByCategory(this.currentCategory);
        const userYards = yardService.getYards();

        container.innerHTML = items.map(item => {
            const owned = avatarService.hasItem(item.id);
            const equipped = this.isItemEquipped(item);
            const canAfford = userYards >= item.price;

            const rarityColors: Record<string, string> = {
                Common: '#a4b0be',
                Uncommon: '#2ecc71',
                Rare: '#3498db',
                Epic: '#9b59b6',
                Legendary: '#f1c40f',
                Mythic: '#ff4757'
            };
            const rarityColor = rarityColors[item.rarity] || '#00f2fe';

            let actionBtn = '';
            if (equipped) {
                actionBtn = `<button class="btn-item-action equipped" disabled>✨ Varustatud</button>`;
            } else if (owned) {
                actionBtn = `<button class="btn-item-action equip" data-equip-id="${item.id}">👕 Pane selga</button>`;
            } else {
                actionBtn = `<button class="btn-item-action buy" data-buy-id="${item.id}">🛍️ Osta ${item.price} Y</button>`;
            }

            return `
                <div class="avatar-item-card ${equipped ? 'is-equipped' : ''}" data-item-id="${item.id}">
                    <div class="item-card-top">
                        <span class="rarity-badge" style="border-color: ${rarityColor}; color: ${rarityColor};">
                            ${item.rarity}
                        </span>
                        <span class="price-tag">
                            ${item.price === 0 ? 'Tasuta' : `${item.price} Y`}
                        </span>
                    </div>

                    <div class="item-preview-visual">
                        <div class="item-icon-symbol">${this.getItemIcon(item)}</div>
                    </div>

                    <div class="item-title">${item.name}</div>
                    <div class="item-desc">${item.description}</div>

                    <div class="item-actions-row">
                        <button class="btn-item-preview" data-preview-id="${item.id}">👁️ Proovi</button>
                        ${actionBtn}
                    </div>
                </div>
            `;
        }).join('');

        // Event Listeners for Cards
        container.querySelectorAll('[data-preview-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-preview-id');
                if (id) this.previewItem(id);
            });
        });

        container.querySelectorAll('[data-equip-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-equip-id');
                const item = getItemById(id || '');
                if (item) {
                    avatarService.equipItem(item);
                    this.previewConfig = avatarService.getConfig();
                    if (this.viewer) this.viewer.updateConfig(this.previewConfig);
                    this.renderCatalogItems();
                    this.showToast(`✨ ${item.name} varustatud!`, '#2ecc71');
                }
            });
        });

        container.querySelectorAll('[data-buy-id]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-buy-id');
                if (!id) return;
                const res = await avatarService.buyItem(id);
                this.updateYardBalance();
                if (res.success) {
                    this.previewConfig = avatarService.getConfig();
                    if (this.viewer) this.viewer.updateConfig(this.previewConfig);
                    this.renderCatalogItems();
                    this.showToast(res.message, '#2ecc71');
                } else {
                    this.showToast(res.message, '#ff4757');
                }
            });
        });
    }

    private previewItem(itemId: string) {
        const item = getItemById(itemId);
        if (!item) return;

        switch (item.category) {
            case 'skin': if (item.defaultColor) this.previewConfig.skinColor = item.defaultColor; break;
            case 'hair':
                this.previewConfig.hairId = item.id;
                if (item.defaultColor) this.previewConfig.hairColor = item.defaultColor;
                break;
            case 'face': this.previewConfig.faceId = item.id; break;
            case 'tops': this.previewConfig.topId = item.id; break;
            case 'pants': this.previewConfig.pantsId = item.id; break;
            case 'shoes': this.previewConfig.shoesId = item.id; break;
            case 'hats': this.previewConfig.hatId = item.id; break;
            case 'back': this.previewConfig.backId = item.id; break;
            case 'emotes':
                const emote = item.id === 'emote_dance_spin' ? 'dance' : 'wave';
                this.previewConfig.activeEmote = emote;
                if (this.viewer) this.viewer.setEmote(emote);
                break;
        }

        if (this.viewer) this.viewer.updateConfig(this.previewConfig);
        this.renderCatalogItems();
    }

    private getItemIcon(item: AvatarItem): string {
        switch (item.category) {
            case 'hats': return item.id.includes('crown') ? '👑' : (item.id.includes('viking') ? '🪓' : '🧢');
            case 'hair': return '💇';
            case 'skin': return '🎨';
            case 'face': return item.id.includes('visor') ? '🤖' : (item.id.includes('shades') ? '🕶️' : '😃');
            case 'tops': return item.id.includes('tuxedo') ? '🤵' : (item.id.includes('armor') ? '🛡️' : '👕');
            case 'pants': return '👖';
            case 'shoes': return item.id.includes('hover') ? '🚀' : '👟';
            case 'back': return item.id.includes('wings') ? '🪽' : '⚔️';
            case 'emotes': return item.id.includes('dance') ? '🕺' : '👋';
            default: return '✨';
        }
    }
}
