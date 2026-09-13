import { RocketType } from '../types';
import { ROCKET_CATALOG } from '../catalog';
import { RocketAudio } from '../audio';
import { HudManager } from './hud';

export interface ShopContext {
    audio: RocketAudio;
    hud: HudManager;
    getEquippedRocket: () => RocketType;
    setEquippedRocket: (r: RocketType) => void;
    getUnlockedRockets: () => Set<string>;
    getTotalPointsBank: () => number;
    setTotalPointsBank: (pts: number) => void;
    onProgressSave: () => void;
}

export class RocketShopUI {
    private ctx: ShopContext;
    public activeCategory: string = 'all';

    constructor(ctx: ShopContext) {
        this.ctx = ctx;
    }

    public init() {
        this.setupShopFilterTabs();
    }

    public setupShopFilterTabs() {
        const filterBar = document.getElementById('shop-filter-bar');
        if (!filterBar) return;

        filterBar.querySelectorAll('.filter-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                filterBar.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeCategory = btn.getAttribute('data-cat') || 'all';
                this.renderShopCatalog();
            });
        });
    }

    public toggleShop(show: boolean) {
        this.ctx.hud.toggleModal('rocket-shop-modal', show);
        if (show) {
            this.renderShopCatalog();
        }
    }

    public renderShopCatalog() {
        const list = document.getElementById('rocket-catalog-list');
        const pointsDisp = document.getElementById('shop-points-display');
        const countBadge = document.getElementById('shop-count-badge');

        const totalPointsBank = this.ctx.getTotalPointsBank();
        if (pointsDisp) pointsDisp.textContent = `${totalPointsBank} PTS`;
        if (countBadge) countBadge.textContent = `${ROCKET_CATALOG.length} unikaalset raketti`;
        if (!list) return;

        list.innerHTML = '';

        const filtered = ROCKET_CATALOG.filter(r => {
            if (this.activeCategory === 'all') return true;
            return r.category === this.activeCategory;
        });

        const equippedRocket = this.ctx.getEquippedRocket();
        const unlockedRockets = this.ctx.getUnlockedRockets();

        filtered.forEach(rocket => {
            const isEquipped = equippedRocket.id === rocket.id;
            const isUnlocked = unlockedRockets.has(rocket.id);

            const card = document.createElement('div');
            card.className = `rocket-item-card ${isEquipped ? 'equipped' : ''}`;

            card.innerHTML = `
                <div class="rocket-item-title">
                    <span>${rocket.icon}</span>
                    <span>${rocket.name}</span>
                </div>
                <div class="rocket-item-desc">${rocket.desc}</div>
                <div class="rocket-item-stats">Kiirus: ${rocket.speed} m/s · Raadius: ${rocket.blastRadius}m · ${rocket.scoreMultiplier}x punktid</div>
                <button type="button" class="rocket-action-btn ${isEquipped ? 'btn-equipped' : (isUnlocked ? 'btn-equip' : 'btn-buy')}" data-id="${rocket.id}">
                    ${isEquipped ? '✓ KASUTUSES' : (isUnlocked ? 'KASUTA' : `OSTA (${rocket.price} PTS)`)}
                </button>
            `;

            const btn = card.querySelector('button');
            if (btn) {
                btn.addEventListener('click', () => {
                    this.handleRocketAction(rocket);
                });
            }

            list.appendChild(card);
        });
    }

    private handleRocketAction(rocket: RocketType) {
        const unlockedRockets = this.ctx.getUnlockedRockets();
        let totalPoints = this.ctx.getTotalPointsBank();

        if (unlockedRockets.has(rocket.id)) {
            this.ctx.setEquippedRocket(rocket);
            this.ctx.onProgressSave();
            this.renderShopCatalog();
            this.ctx.audio.playPurchase();
        } else if (totalPoints >= rocket.price) {
            totalPoints -= rocket.price;
            this.ctx.setTotalPointsBank(totalPoints);
            unlockedRockets.add(rocket.id);
            this.ctx.setEquippedRocket(rocket);
            this.ctx.onProgressSave();
            this.renderShopCatalog();
            this.ctx.audio.playPurchase();
            this.ctx.hud.showImpactToast(`AVATUD: ${rocket.name}! 🚀`);
        } else {
            this.ctx.hud.showImpactToast('POLE PIISAVALT PUNKTE!');
        }
    }
}
