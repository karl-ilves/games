import { avatarService, EMOTE_ID_TO_ACTION } from '../shared/avatar/AvatarService';
import { AvatarViewer } from '../shared/avatar/AvatarViewer';
import { AVATAR_CATALOG, getItemById, getItemsByCategory } from '../shared/avatar/catalog';
import { AvatarItem, AvatarCategory, AvatarConfig } from '../shared/avatar/types';
import { getItemThumbnailUrl } from '../shared/avatar/thumbnailGenerator';
import { yardService } from '../shared/yardService';
import { getPresetOutfits, getOutfitById } from '../shared/avatar/outfits';

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
                                Customize your 3D avatar, preview and purchase exclusive items with Playard Yards!
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
                                🔄 Drag with mouse / touch to rotate 360° · Scroll to zoom
                            </div>
                        </div>

                        <!-- Emotes & Animation Bar -->
                        <div class="avatar-emotes-bar">
                            <span style="font-size: 0.78rem; font-weight: 700; color: #8899a6; text-transform: uppercase;">Test Locomotion & Emotes:</span>
                            <div class="avatar-emote-buttons" style="display: flex; flex-wrap: wrap; gap: 5px; max-height: 95px; overflow-y: auto; padding: 2px;">
                                <button class="btn-emote active" data-emote="idle">🧍 Idle</button>
                                <button class="btn-emote" data-emote="walk">🚶 Walk</button>
                                <button class="btn-emote" data-emote="run">🏃 Run</button>
                                <button class="btn-emote" data-emote="jump">🦘 Jump</button>
                                <button class="btn-emote" data-emote="wave">👋 Wave</button>
                                <button class="btn-emote" data-emote="dance">🕺 Dance</button>
                                <button class="btn-emote" data-emote="salute">🪖 Salute</button>
                                <button class="btn-emote" data-emote="backflip">🤸 Backflip</button>
                                <button class="btn-emote" data-emote="breakdance">🌪️ Breakdance</button>
                                <button class="btn-emote" data-emote="laugh">😂 Laugh</button>
                                <button class="btn-emote" data-emote="flex">💪 Flex</button>
                                <button class="btn-emote" data-emote="levitate">🧘 Levitate</button>
                                <button class="btn-emote" data-emote="zombie">🧟 Zombie</button>
                                <button class="btn-emote" data-emote="guitar">🎸 Guitar</button>
                                <button class="btn-emote" data-emote="dab">🙅‍♂️ Dab</button>
                                <button class="btn-emote" data-emote="moonwalk">🕺 Moonwalk</button>
                                <button class="btn-emote" data-emote="robot_dance">🤖 Robot</button>
                                <button class="btn-emote" data-emote="kungfu">🥋 Kung Fu</button>
                                <button class="btn-emote" data-emote="headspin">🤸‍♂️ Headspin</button>
                                <button class="btn-emote" data-emote="ground_slam">💥 Superhero</button>
                            </div>
                        </div>

                        <!-- Save & Reset Actions -->
                        <div class="avatar-save-actions">
                            <button class="btn-avatar-reset" id="btn-avatar-reset-preview">🔄 Reset to Current</button>
                            <button class="btn-avatar-save" id="btn-avatar-save-config">💾 Save Avatar</button>
                        </div>
                    </div>

                    <!-- Right: Catalog & Inventory Tabs -->
                    <div class="avatar-catalog-column">
                        <!-- Category Tabs -->
                        <div class="avatar-category-nav" id="avatar-category-tabs">
                            <button class="cat-btn" data-category="outfits" id="tab-outfits" style="background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(0, 242, 254, 0.2)); border-color: #ffd700; color: #ffd700; font-weight: 800;">✨ Outfits</button>
                            <button class="cat-btn active" data-category="hats">👑 Hats</button>
                            <button class="cat-btn" data-category="hair">💇 Hair</button>
                            <button class="cat-btn" data-category="skin">🎨 Skin</button>
                            <button class="cat-btn" data-category="face">🕶️ Face</button>
                            <button class="cat-btn" data-category="tops">👕 Tops</button>
                            <button class="cat-btn" data-category="pants">👖 Pants</button>
                            <button class="cat-btn" data-category="shoes">👟 Shoes</button>
                            <button class="cat-btn" data-category="back">🎒 Back</button>
                            <button class="cat-btn" data-category="animations">🏃 Movement</button>
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

        // Emote / Animation Buttons
        const emoteButtons = this.modalEl.querySelectorAll('.btn-emote');
        emoteButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const emote = btn.getAttribute('data-emote') || 'idle';
                const isFreeAction = ['idle', 'walk', 'run', 'jump'].includes(emote);
                emoteButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.previewConfig.activeEmote = emote as any;
                if (this.viewer) {
                    this.viewer.setEmote(emote);
                }
                if (!isFreeAction && !avatarService.isEmoteOwned(emote)) {
                    this.showToast(`👀 Testing "${emote}" in 3D preview! (🔒 Buy in catalog to keep in games)`, '#00f2fe');
                } else {
                    this.showToast(`✨ Playing "${emote}"!`, '#2ecc71');
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
                this.showToast('Avatar reset to current configuration!', '#00f2fe');
            });
        }

        // Save
        const saveBtn = this.modalEl.querySelector('#btn-avatar-save-config');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const toSave = { ...this.previewConfig };
                if (toSave.activeEmote && !['idle', 'walk', 'run', 'jump'].includes(toSave.activeEmote) && !avatarService.isEmoteOwned(toSave.activeEmote)) {
                    toSave.activeEmote = 'idle';
                }
                await avatarService.saveAvatar(toSave);
                this.showToast('✅ Avatar successfully saved and synced!', '#2ecc71');
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
        // Can ONLY be equipped if user owns it or if it's free/default!
        const isOwned = avatarService.hasItem(item.id) || item.price === 0 || !!item.isDefault;
        if (!isOwned) return false;

        const emoteMap: Record<string, string> = {
            emote_wave: 'wave',
            emote_dance_spin: 'dance',
            emote_salute_military: 'salute',
            emote_backflip: 'backflip',
            emote_breakdance: 'breakdance',
            emote_laugh_triumph: 'laugh',
            emote_flex_muscles: 'flex',
            emote_levitate_zen: 'levitate',
            emote_zombie_groan: 'zombie',
            emote_guitar_solo: 'guitar'
        };

        switch (item.category) {
            case 'skin': return this.previewConfig.skinColor === item.defaultColor;
            case 'hair': return this.previewConfig.hairId === item.id;
            case 'face': return this.previewConfig.faceId === item.id;
            case 'tops': return this.previewConfig.topId === item.id;
            case 'pants': return this.previewConfig.pantsId === item.id;
            case 'shoes': return this.previewConfig.shoesId === item.id;
            case 'hats': return this.previewConfig.hatId === item.id;
            case 'back': return this.previewConfig.backId === item.id;
            case 'animations': return this.previewConfig.movementStyle === item.id;
            case 'emotes': {
                const targetAction = emoteMap[item.id] || (item.id.includes('dance') ? 'dance' : 'wave');
                return this.previewConfig.activeEmote === targetAction;
            }
        }
        return false;
    }

    private renderCatalogItems() {
        const container = this.modalEl.querySelector('#avatar-items-container');
        if (!container) return;

        if (this.currentCategory === 'outfits') {
            const outfits = getPresetOutfits();
            container.innerHTML = outfits.map(outfit => {
                const rarityColors: Record<string, string> = {
                    Common: '#a4b0be',
                    Uncommon: '#2ecc71',
                    Rare: '#3498db',
                    Epic: '#9b59b6',
                    Legendary: '#f1c40f',
                    Mythic: '#ff4757'
                };
                const rarityColor = rarityColors[outfit.rarity] || '#00f2fe';
                const details = avatarService.getOutfitPriceDetails(outfit);

                let priceBadge = '';
                let actionBtn = '';

                if (details.isFullyOwned) {
                    priceBadge = `<span class="price-tag" style="background: rgba(46, 204, 113, 0.2); color: #2ecc71; border: 1px solid rgba(46, 204, 113, 0.4);">OWNED</span>`;
                    actionBtn = `<button class="btn-item-action equip" data-equip-outfit-id="${outfit.id}" style="background: linear-gradient(135deg, #2ecc71, #1abc9c); color: #070a10; font-weight: 900;">✨ Equip Outfit</button>`;
                } else {
                    const priceLabel = details.unownedPrice < details.totalPrice
                        ? `${details.unownedPrice.toLocaleString()} Y <span style="font-size: 0.68rem; color: #8899a6; text-decoration: line-through;">${details.totalPrice.toLocaleString()} Y</span>`
                        : `${details.totalPrice.toLocaleString()} Y`;

                    priceBadge = `<span class="price-tag" style="background: rgba(255, 215, 0, 0.15); color: #ffd700; border: 1px solid rgba(255, 215, 0, 0.4); font-weight: 800;">${priceLabel}</span>`;
                    actionBtn = `<button class="btn-item-action buy" data-buy-outfit-id="${outfit.id}" data-equip-outfit-id="${outfit.id}" style="background: linear-gradient(135deg, #ffd700, #ff9f43); color: #070a10; font-weight: 900;">🛍️ Buy Set (${details.unownedPrice.toLocaleString()} Y)</button>`;
                }

                return `
                    <div class="avatar-item-card avatar-outfit-card" data-outfit-id="${outfit.id}" style="border-color: rgba(255, 215, 0, 0.35); background: linear-gradient(180deg, rgba(26, 35, 50, 0.95), rgba(13, 17, 23, 0.98));">
                        <div class="item-card-top">
                            <span class="rarity-badge" style="border-color: ${rarityColor}; color: ${rarityColor}; font-weight: 900;">
                                ${outfit.tag}
                            </span>
                            ${priceBadge}
                        </div>

                        <div class="item-preview-visual" style="display: flex; align-items: center; justify-content: center; background: radial-gradient(circle, rgba(0, 242, 254, 0.12) 0%, rgba(13, 17, 23, 0.9) 70%); min-height: 110px;">
                            <span style="font-size: 3.8rem; filter: drop-shadow(0 4px 12px rgba(0, 242, 254, 0.4));">${outfit.badgeEmoji}</span>
                        </div>

                        <div class="item-title" style="font-size: 1.05rem; font-weight: 900; color: #fff; margin-top: 6px;">${outfit.name}</div>
                        <div class="item-desc" style="font-size: 0.8rem; line-height: 1.4; color: #a4b0be; margin-bottom: 4px; min-height: 38px;">${outfit.description}</div>
                        <div style="font-size: 0.72rem; color: #00f2fe; margin-bottom: 10px; font-weight: 700;">📦 Bundle contains ${details.totalItemsCount} pieces (Sum: ${details.totalPrice.toLocaleString()} Y)</div>

                        <div class="item-actions-row">
                            <button class="btn-item-preview" data-preview-outfit-id="${outfit.id}">👁️ Try On</button>
                            ${actionBtn}
                        </div>
                    </div>
                `;
            }).join('');

            container.querySelectorAll('[data-preview-outfit-id]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-preview-outfit-id');
                    const outfit = getOutfitById(id || '');
                    if (outfit) {
                        this.previewConfig = { ...this.previewConfig, ...outfit.config };
                        if (this.viewer) this.viewer.updateConfig(this.previewConfig);
                        this.showToast(`👀 Previewing outfit: ${outfit.name}`, '#00f2fe');
                    }
                });
            });

            container.querySelectorAll('[data-equip-outfit-id]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-equip-outfit-id');
                    const outfit = getOutfitById(id || '');
                    if (outfit) {
                        const res = await avatarService.buyOutfit(outfit);
                        this.updateYardBalance();
                        if (res.success) {
                            this.previewConfig = avatarService.getConfig();
                            if (this.viewer) this.viewer.updateConfig(this.previewConfig);
                            this.renderCatalogItems();
                            this.showToast(res.message, '#2ecc71');
                        } else {
                            this.showToast(res.message, '#ff4757');
                        }
                    }
                });
            });

            this.updateEmoteButtonStates();
            return;
        }

        const items = getItemsByCategory(this.currentCategory);
        const userYards = yardService.getYards();

        container.innerHTML = items.map(item => {
            const owned = avatarService.hasItem(item.id) || item.price === 0 || !!item.isDefault;
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
                actionBtn = `<button class="btn-item-action equipped" disabled>✨ Equipped</button>`;
            } else if (owned) {
                actionBtn = `<button class="btn-item-action equip" data-equip-id="${item.id}">👕 Equip</button>`;
            } else {
                actionBtn = `<button class="btn-item-action buy" data-buy-id="${item.id}">🛍️ Buy ${item.price} Y</button>`;
            }

            return `
                <div class="avatar-item-card ${equipped ? 'is-equipped' : ''}" data-item-id="${item.id}">
                    <div class="item-card-top">
                        <span class="rarity-badge" style="border-color: ${rarityColor}; color: ${rarityColor};">
                            ${item.rarity}
                        </span>
                        <span class="price-tag">
                            ${item.price === 0 ? 'Free' : `${item.price} Y`}
                        </span>
                    </div>

                    <div class="item-preview-visual">
                        <img class="item-real-thumbnail" src="${getItemThumbnailUrl(item)}" alt="${item.name}" loading="lazy" />
                    </div>

                    <div class="item-title">${item.name}</div>
                    <div class="item-desc">${item.description}</div>

                    <div class="item-actions-row">
                        <button class="btn-item-preview" data-preview-id="${item.id}">👁️ Try On</button>
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
                    this.showToast(`✨ ${item.name} equipped!`, '#2ecc71');
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

        this.updateEmoteButtonStates();
    }

    private updateEmoteButtonStates() {
        if (!this.modalEl) return;
        const emoteButtons = this.modalEl.querySelectorAll('.btn-emote');
        emoteButtons.forEach(btn => {
            const emote = btn.getAttribute('data-emote') || 'idle';
            const isFreeAction = ['idle', 'walk', 'run', 'jump'].includes(emote);
            const owned = isFreeAction || avatarService.isEmoteOwned(emote);
            btn.classList.toggle('is-locked', !owned);
            btn.classList.toggle('active', this.previewConfig.activeEmote === emote);
            if (!owned) {
                btn.setAttribute('title', '👀 Click to test in 3D preview! (🔒 Buy in catalog to keep in games)');
            } else {
                btn.setAttribute('title', '✨ Owned! Click to test.');
            }
        });
    }

    private previewItem(itemId: string) {
        const item = getItemById(itemId);
        if (!item) return;

        switch (item.category) {
            case 'skin': 
                if (item.defaultColor) this.previewConfig.skinColor = item.defaultColor; 
                this.previewConfig.activeEmote = 'idle' as any;
                if (this.viewer) this.viewer.setEmote('idle');
                break;
            case 'hair': 
                this.previewConfig.hairId = item.id; 
                if (item.defaultColor) this.previewConfig.hairColor = item.defaultColor; 
                this.previewConfig.activeEmote = 'idle' as any;
                if (this.viewer) this.viewer.setEmote('idle');
                break;
            case 'face': 
                this.previewConfig.faceId = item.id; 
                this.previewConfig.activeEmote = 'idle' as any;
                if (this.viewer) this.viewer.setEmote('idle');
                break;
            case 'tops': 
                this.previewConfig.topId = item.id; 
                this.previewConfig.activeEmote = 'idle' as any;
                if (this.viewer) this.viewer.setEmote('idle');
                break;
            case 'pants': 
                this.previewConfig.pantsId = item.id; 
                this.previewConfig.activeEmote = 'idle' as any;
                if (this.viewer) this.viewer.setEmote('idle');
                break;
            case 'shoes': 
                this.previewConfig.shoesId = item.id; 
                this.previewConfig.activeEmote = 'idle' as any;
                if (this.viewer) this.viewer.setEmote('idle');
                break;
            case 'hats': 
                this.previewConfig.hatId = item.id; 
                this.previewConfig.activeEmote = 'idle' as any;
                if (this.viewer) this.viewer.setEmote('idle');
                break;
            case 'back': 
                this.previewConfig.backId = item.id; 
                this.previewConfig.activeEmote = 'idle' as any;
                if (this.viewer) this.viewer.setEmote('idle');
                break;
            case 'animations':
                this.previewConfig.movementStyle = item.id;
                this.showToast(`👀 Previewing movement style "${item.name}". Click Walk, Run, or Jump to test!`, '#00f2fe');
                break;
            case 'emotes': {
                const emote = EMOTE_ID_TO_ACTION[item.id] || (item.id.includes('dance') ? 'dance' : 'wave');
                this.previewConfig.activeEmote = emote as any;
                if (this.viewer) this.viewer.setEmote(emote);
                if (avatarService.isEmoteOwned(item.id)) {
                    this.showToast(`✨ Testing owned emote "${item.name}"!`, '#2ecc71');
                } else {
                    this.showToast(`👀 Testing emote "${item.name}" in 3D preview! Buy for ${item.price} Y to keep it.`, '#00f2fe');
                }
                break;
            }
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
            case 'animations': return '🏃';
            case 'emotes': return item.id.includes('dance') ? '🕺' : '👋';
            default: return '✨';
        }
    }
}
