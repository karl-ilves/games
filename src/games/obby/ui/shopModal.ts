import { STAGES, getHats, getTrails, getBoots, SKINS } from '../catalog';
import { ObbyAudio } from '../audio';
import { HudManager } from './hud';

export interface ShopModalContext {
    isOwner: () => boolean;
    getCoins: () => number;
    setCoins: (c: number) => void;
    getPurchasedItems: () => Set<string>;
    getEquippedHat: () => string;
    setEquippedHat: (h: string) => void;
    getEquippedTrail: () => string;
    setEquippedTrail: (t: string) => void;
    getEquippedBoots: () => string;
    setEquippedBoots: (b: string) => void;
    getEquippedSkin: () => string;
    setEquippedSkin: (s: string) => void;
    getMaxUnlockedStage: () => number;
    getCurrentStageIndex: () => number;
    onSelectStage: (idx: number) => void;
    onSaveData: () => void;
    onUpdateHUD: () => void;
    audio: ObbyAudio;
    hud: HudManager;
}

export class ShopModalUI {
    private ctx: ShopModalContext;

    constructor(ctx: ShopModalContext) {
        this.ctx = ctx;
    }

    public init() {
        // Shop Modal
        const modalShop = document.getElementById('modal-shop');
        document.getElementById('btn-open-shop')?.addEventListener('click', () => {
            this.renderShop();
            if (modalShop) modalShop.style.display = 'flex';
        });
        document.getElementById('btn-close-shop')?.addEventListener('click', () => {
            if (modalShop) modalShop.style.display = 'none';
        });

        // Stages Modal
        const modalStages = document.getElementById('modal-stages');
        document.getElementById('btn-open-stages')?.addEventListener('click', () => {
            this.renderStagesSelector();
            if (modalStages) modalStages.style.display = 'flex';
        });
        document.getElementById('btn-close-stages')?.addEventListener('click', () => {
            if (modalStages) modalStages.style.display = 'none';
        });

        // Help Modal
        const modalHelp = document.getElementById('modal-help');
        document.getElementById('btn-open-help')?.addEventListener('click', () => {
            if (modalHelp) modalHelp.style.display = 'flex';
        });
        document.getElementById('btn-close-help')?.addEventListener('click', () => {
            if (modalHelp) modalHelp.style.display = 'none';
        });

        // Victory Modal To Hub button
        document.getElementById('btn-victory-hub')?.addEventListener('click', () => {
            window.location.href = '../../index.html';
        });
    }

    public renderShop() {
        const isOwner = this.ctx.isOwner();
        const hatsContainer = document.getElementById('shop-hats-grid');
        const trailsContainer = document.getElementById('shop-trails-grid');
        const bootsContainer = document.getElementById('shop-boots-grid');
        const skinsContainer = document.getElementById('shop-skins-grid');

        const HATS = getHats(isOwner);
        const TRAILS = getTrails(isOwner);
        const BOOTS = getBoots(isOwner);

        const renderCategory = (items: any[], container: HTMLElement | null, type: 'hat' | 'trail' | 'boots' | 'skin') => {
            if (!container) return;
            container.innerHTML = '';
            const purchasedItems = this.ctx.getPurchasedItems();

            items.forEach(item => {
                const card = document.createElement('div');
                const isPurchased = purchasedItems.has(item.id) || item.price === 0;
                let isEquipped = false;
                if (type === 'hat') isEquipped = this.ctx.getEquippedHat() === item.id;
                if (type === 'trail') isEquipped = this.ctx.getEquippedTrail() === item.id;
                if (type === 'boots') isEquipped = this.ctx.getEquippedBoots() === item.id;
                if (type === 'skin') isEquipped = this.ctx.getEquippedSkin() === item.id;

                card.className = `shop-item-card ${isEquipped ? 'equipped' : ''}`;
                card.innerHTML = `
                    <div style="font-weight: 800; font-size: 0.95rem; color: #ffffff;">${item.name}</div>
                    <div style="color: #ffd32a; font-weight: 900; font-size: 0.85rem;">🪙 ${item.price} ${isOwner ? 'MÜNTI' : 'COINS'}</div>
                    <button class="btn-buy ${isEquipped ? 'equipped-btn' : (isPurchased ? 'equip-btn' : '')}">
                        ${isEquipped ? (isOwner ? 'KASUTUSES' : 'EQUIPPED') : (isPurchased ? (isOwner ? 'KASUTA' : 'EQUIP') : (isOwner ? 'OSTA' : 'BUY'))}
                    </button>
                `;

                const btn = card.querySelector('button');
                btn?.addEventListener('click', () => {
                    if (isEquipped) {
                        // Unequip
                        if (type === 'hat') this.ctx.setEquippedHat('none');
                        if (type === 'trail') this.ctx.setEquippedTrail('none');
                        if (type === 'boots') this.ctx.setEquippedBoots('none');
                    } else if (isPurchased) {
                        // Equip
                        if (type === 'hat') this.ctx.setEquippedHat(item.id);
                        if (type === 'trail') this.ctx.setEquippedTrail(item.id);
                        if (type === 'boots') this.ctx.setEquippedBoots(item.id);
                        if (type === 'skin') this.ctx.setEquippedSkin(item.id);
                    } else {
                        // Buy
                        const currentCoins = this.ctx.getCoins();
                        if (currentCoins >= item.price) {
                            this.ctx.setCoins(currentCoins - item.price);
                            purchasedItems.add(item.id);
                            if (type === 'hat') this.ctx.setEquippedHat(item.id);
                            if (type === 'trail') this.ctx.setEquippedTrail(item.id);
                            if (type === 'boots') this.ctx.setEquippedBoots(item.id);
                            if (type === 'skin') this.ctx.setEquippedSkin(item.id);
                            this.ctx.audio.playCoin();
                            this.ctx.hud.showToast(isOwner ? `Ostetud: ${item.name}!` : `Purchased: ${item.name}!`);
                        } else {
                            this.ctx.hud.showToast(isOwner ? 'Sul ei ole piisavalt Obby münte!' : 'Not enough Obby coins!');
                        }
                    }
                    this.ctx.onSaveData();
                    this.ctx.onUpdateHUD();
                    this.renderShop();
                });

                container.appendChild(card);
            });
        };

        renderCategory(HATS, hatsContainer, 'hat');
        renderCategory(TRAILS, trailsContainer, 'trail');
        renderCategory(BOOTS, bootsContainer, 'boots');
        renderCategory(SKINS, skinsContainer, 'skin');
    }

    public renderStagesSelector() {
        const grid = document.getElementById('stages-selector-grid');
        if (!grid) return;
        grid.innerHTML = '';
        const isOwner = this.ctx.isOwner();
        const maxStage = this.ctx.getMaxUnlockedStage();
        const currentStage = this.ctx.getCurrentStageIndex();

        STAGES.forEach((stg, idx) => {
            const btn = document.createElement('button');
            const unlocked = idx < maxStage;
            const isCurrent = idx === currentStage;
            btn.className = `stage-select-btn ${isCurrent ? 'active' : ''}`;
            btn.disabled = !unlocked;
            btn.innerHTML = `
                <div style="font-size: 1.2rem;">${unlocked ? '🚩' : '🔒'}</div>
                <div style="font-size: 0.85rem;">Stage ${stg.id}</div>
                <div style="font-size: 0.72rem; color: #a4b0be;">${isOwner ? stg.nameEt : stg.nameEn}</div>
            `;
            if (unlocked) {
                btn.addEventListener('click', () => {
                    this.ctx.onSelectStage(idx);
                    document.getElementById('modal-stages')!.style.display = 'none';
                });
            }
            grid.appendChild(btn);
        });
    }
}
