import { RocketType } from '../types';
import { ROCKET_CATALOG } from '../catalog';
import { RocketAudio } from '../audio';
import { HudManager } from './hud';
import { yardService } from '../../../shared/yardService';
import { showYardPurchaseConfirm } from '../../../shared/yardPurchaseModal';

export interface YardPointsPack {
    id: string;
    name: string;
    points: number;
    yardCost: number;
    icon: string;
    badge?: string;
    description: string;
}

export const YARD_POINTS_PACKS: YardPointsPack[] = [
    {
        id: 'yard_pack_100',
        name: '100 Punkti Pakk',
        points: 100,
        yardCost: 500,
        icon: '🪙',
        description: 'Vaheta 500 Yardi 100 Rocketi punkti vastu'
    },
    {
        id: 'yard_pack_200',
        name: '200 Punkti Pakk',
        points: 200,
        yardCost: 1000,
        icon: '💰',
        badge: 'POPULAARNE',
        description: 'Vaheta 1,000 Yardi 200 Rocketi punkti vastu'
    },
    {
        id: 'yard_pack_1000',
        name: '1,000 Punkti Suurpakk',
        points: 1000,
        yardCost: 5000,
        icon: '💎',
        badge: 'PARIM VÄÄRTUS',
        description: 'Vaheta 5,000 Yardi 1,000 Rocketi punkti vastu'
    }
];

export interface ShopContext {
    audio: RocketAudio;
    hud: HudManager;
    getEquippedRocket: () => RocketType;
    setEquippedRocket: (r: RocketType) => void;
    getUnlockedRockets: () => Set<string>;
    getTotalPointsBank: () => number;
    setTotalPointsBank: (pts: number) => void;
    onProgressSave: () => void;
    onYardBalanceChanged?: () => void;
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

    public renderYardExchangePacks() {
        const grid = document.getElementById('yard-points-packs-grid');
        const yardsDisplay = document.getElementById('shop-current-yards-display');
        const exchangeBox = document.getElementById('shop-yard-exchange');

        if (yardsDisplay) {
            try {
                yardsDisplay.textContent = `Sinu Jardid: ${yardService.getYards().toLocaleString()} Y`;
            } catch (e) {
                yardsDisplay.textContent = 'Sinu Jardid: 0 Y';
            }
        }

        if (exchangeBox) {
            if (this.activeCategory === 'yards') {
                exchangeBox.style.borderColor = '#ffd32a';
                exchangeBox.style.boxShadow = '0 0 25px rgba(255, 211, 42, 0.4)';
            } else {
                exchangeBox.style.borderColor = 'rgba(0, 242, 254, 0.4)';
                exchangeBox.style.boxShadow = 'none';
            }
        }

        if (!grid) return;
        grid.innerHTML = '';

        YARD_POINTS_PACKS.forEach(pack => {
            const card = document.createElement('div');
            card.className = 'yard-pack-card';
            card.id = `yard-pack-card-${pack.id}`;
            card.style.cssText = `
                background: rgba(10, 16, 28, 0.85);
                border: 1.5px solid rgba(0, 242, 254, 0.35);
                border-radius: 12px;
                padding: 12px 14px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                gap: 8px;
                position: relative;
                box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            `;

            card.innerHTML = `
                ${pack.badge ? `<div style="position: absolute; top: -8px; right: 10px; background: #ffd32a; color: #111; font-weight: 900; font-size: 0.65rem; padding: 2px 7px; border-radius: 6px; box-shadow: 0 0 8px rgba(255, 211, 42, 0.6);">${pack.badge}</div>` : ''}
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 1.8rem; line-height: 1;">${pack.icon}</span>
                    <div>
                        <div style="font-weight: 900; color: #fff; font-size: 0.95rem;">${pack.name}</div>
                        <div style="font-size: 0.75rem; color: #94a3b8; line-height: 1.2;">${pack.description}</div>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                    <span style="font-size: 1.25rem; font-weight: 900; color: #ffd32a; letter-spacing: 0.5px;">+${pack.points.toLocaleString()} PTS</span>
                    <button type="button" class="btn-buy-yard-pack" id="btn-buy-yard-${pack.id}" style="
                        background: linear-gradient(135deg, #00f2fe 0%, #0072ff 100%);
                        border: none;
                        color: #040810;
                        font-weight: 900;
                        padding: 7px 14px;
                        border-radius: 8px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 5px;
                        font-size: 0.85rem;
                        box-shadow: 0 2px 10px rgba(0, 242, 254, 0.35);
                    ">
                        <span>💎</span>
                        <span>${pack.yardCost.toLocaleString()} Y</span>
                    </button>
                </div>
            `;

            const btnBuy = card.querySelector(`#btn-buy-yard-${pack.id}`) as HTMLButtonElement;
            if (btnBuy) {
                btnBuy.addEventListener('click', () => {
                    this.buyYardPointsPack(pack);
                });
            }

            grid.appendChild(card);
        });
    }

    public buyYardPointsPack(pack: YardPointsPack) {
        showYardPurchaseConfirm({
            title: 'Osta Punkte Yardide Eest',
            itemName: `${pack.icon} ${pack.name} (+${pack.points.toLocaleString()} PTS)`,
            yardCost: pack.yardCost,
            description: `Kas soovid vahetada ${pack.yardCost.toLocaleString()} Yardi ${pack.points.toLocaleString()} Rocket punkti vastu?`,
            onConfirm: () => {
                const success = yardService.spendYards(
                    pack.yardCost,
                    pack.id,
                    `Rocket Playard: ${pack.name} (+${pack.points} PTS)`
                );
                if (success) {
                    const currentBank = this.ctx.getTotalPointsBank();
                    this.ctx.setTotalPointsBank(currentBank + pack.points);
                    this.ctx.onProgressSave();
                    this.ctx.audio.playPurchase();
                    this.ctx.hud.showImpactToast(`+${pack.points} PTS OSTETUD! 💎`);
                    this.renderShopCatalog();
                    this.ctx.onYardBalanceChanged?.();
                } else {
                    this.ctx.hud.showImpactToast('POLE PIISAVALT JARDE!');
                }
            }
        });
    }

    public renderShopCatalog() {
        const list = document.getElementById('rocket-catalog-list');
        const pointsDisp = document.getElementById('shop-points-display');
        const countBadge = document.getElementById('shop-count-badge');

        const totalPointsBank = this.ctx.getTotalPointsBank();
        if (pointsDisp) pointsDisp.textContent = `${totalPointsBank.toLocaleString()} PTS`;
        if (countBadge) countBadge.textContent = `${ROCKET_CATALOG.length} unikaalset raketti`;

        // Render Yard points exchange packs
        this.renderYardExchangePacks();

        if (!list) return;
        list.innerHTML = '';

        if (this.activeCategory === 'yards') {
            const banner = document.createElement('div');
            banner.style.cssText = `
                grid-column: 1 / -1;
                text-align: center;
                padding: 30px 20px;
                background: linear-gradient(135deg, rgba(0, 242, 254, 0.1) 0%, rgba(255, 211, 42, 0.08) 100%);
                border: 2px dashed rgba(0, 242, 254, 0.5);
                border-radius: 16px;
            `;
            banner.innerHTML = `
                <div style="font-size: 2.8rem; margin-bottom: 8px;">💎 ➔ ⭐</div>
                <h3 style="color: #00f2fe; margin-bottom: 8px; font-size: 1.3rem;">Yardide vahetus punktideks</h3>
                <p style="color: #cbd5e1; font-size: 0.95rem; max-width: 500px; margin: 0 auto; line-height: 1.5;">
                    Vali ülalolevast paneelist sobiv pakett: <strong>500 Y (100 PTS)</strong>, <strong>1,000 Y (200 PTS)</strong> või <strong>5,000 Y (1,000 PTS)</strong>.
                    Punkte saad kasutada kõigi 54 unikaalse raketi ostmiseks!
                </p>
            `;
            list.appendChild(banner);
            return;
        }

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
