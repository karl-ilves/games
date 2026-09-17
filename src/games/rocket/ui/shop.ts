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
        description: 'Vaheta 500 Playbuxi 100 Rocketi punkti vastu'
    },
    {
        id: 'yard_pack_200',
        name: '200 Punkti Pakk',
        points: 200,
        yardCost: 1000,
        icon: '💰',
        badge: 'POPULAARNE',
        description: 'Vaheta 1,000 Playbuxi 200 Rocketi punkti vastu'
    },
    {
        id: 'yard_pack_1000',
        name: '1,000 Punkti Suurpakk',
        points: 1000,
        yardCost: 5000,
        icon: '💎',
        badge: 'PARIM VÄÄRTUS',
        description: 'Vaheta 5,000 Playbuxi 1,000 Rocketi punkti vastu'
    }
];

export interface YardGamePass {
    id: string;
    name: string;
    description: string;
    yardCost: number;
    icon: string;
    badge: string;
}

export const YARD_GAME_PASSES: YardGamePass[] = [
    {
        id: 'pass_2x_score',
        name: '2X Score Booster',
        description: 'Kõik tabamused ja hävitustööd annavad mängus 2x rohkem punkte!',
        yardCost: 1500,
        icon: '⚡',
        badge: 'GAME PASS'
    },
    {
        id: 'pass_nuke_access',
        name: 'Nuclear Arsenal Pass',
        description: 'Kohene ligipääs kõigile tuuma- ja termobaarilistele rakettidele!',
        yardCost: 2500,
        icon: '☢️',
        badge: 'VIP PASS'
    },
    {
        id: 'pass_all_rockets',
        name: 'All 54 Rockets Mega Unlock',
        description: 'Avab koheselt kõik 54 unikaalset mängusisest raketti arsenalis!',
        yardCost: 5000,
        icon: '👑',
        badge: 'MEGA PASS'
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
    has2xScorePass?: () => boolean;
    set2xScorePass?: (has: boolean) => void;
}

export class RocketShopUI {
    private ctx: ShopContext;
    public activeTab: 'shop' | 'rockets' = 'shop';
    public activeCategory: string = 'all';

    constructor(ctx: ShopContext) {
        this.ctx = ctx;
    }

    public init() {
        this.setupTabs();
        this.setupShopFilterTabs();
    }

    public setupTabs() {
        const tabShop = document.getElementById('modal-tab-shop');
        const tabRockets = document.getElementById('modal-tab-rockets');
        const btnGoToYardShop = document.getElementById('btn-go-to-yard-shop');

        tabShop?.addEventListener('click', () => this.switchTab('shop'));
        tabRockets?.addEventListener('click', () => this.switchTab('rockets'));
        btnGoToYardShop?.addEventListener('click', () => this.switchTab('shop'));
    }

    public switchTab(tab: 'shop' | 'rockets') {
        this.activeTab = tab;
        const tabShop = document.getElementById('modal-tab-shop');
        const tabRockets = document.getElementById('modal-tab-rockets');
        const viewShop = document.getElementById('view-yard-shop');
        const viewRockets = document.getElementById('view-rockets-catalog');

        tabShop?.classList.toggle('active', tab === 'shop');
        tabRockets?.classList.toggle('active', tab === 'rockets');

        if (viewShop) viewShop.style.display = tab === 'shop' ? 'flex' : 'none';
        if (viewRockets) viewRockets.style.display = tab === 'rockets' ? 'flex' : 'none';

        if (tab === 'shop') {
            this.renderYardShop();
        } else {
            if (this.activeCategory === 'yards') {
                this.activeCategory = 'all';
                const filterBar = document.getElementById('shop-filter-bar');
                if (filterBar) {
                    filterBar.querySelectorAll('.filter-tab-btn').forEach(b => {
                        b.classList.toggle('active', (b.getAttribute('data-cat') || 'all') === 'all');
                    });
                }
            }
            this.renderRocketsCatalog();
        }
    }

    public setupShopFilterTabs() {
        const filterBar = document.getElementById('shop-filter-bar');
        if (!filterBar) return;

        filterBar.querySelectorAll('.filter-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const cat = btn.getAttribute('data-cat') || 'all';
                this.activeCategory = cat;
                filterBar.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (cat === 'yards') {
                    this.switchTab('shop');
                    return;
                }
                this.renderRocketsCatalog();
            });
        });
    }

    public toggleShop(show: boolean, tab: 'shop' | 'rockets' = 'shop') {
        this.ctx.hud.toggleModal('rocket-shop-modal', show);
        if (show) {
            this.switchTab(tab);
            this.renderYardShop();
            this.renderRocketsCatalog();
        }
    }

    // --- YARD SHOP (AINULT ASJAD MIDA SAAB OSTA YARDIDE EEST) ---
    public renderYardShop() {
        const yardsDisplay = document.getElementById('shop-current-yards-display');
        if (yardsDisplay) {
            try {
                yardsDisplay.textContent = `${yardService.getYards().toLocaleString()} PBX`;
            } catch (e) {
                yardsDisplay.textContent = '0 PBX';
            }
        }

        this.renderYardExchangePacks();
        this.renderYardGamePasses();
    }

    public renderYardExchangePacks() {
        const grid = document.getElementById('yard-points-packs-grid');
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
                        <span>${pack.yardCost.toLocaleString()} PBX</span>
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

    public renderYardGamePasses() {
        const grid = document.getElementById('yard-gamepasses-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const has2x = this.ctx.has2xScorePass?.() || false;
        const unlocked = this.ctx.getUnlockedRockets();
        const hasAllRockets = ROCKET_CATALOG.every(r => unlocked.has(r.id));
        const hasNukes = ROCKET_CATALOG.filter(r => r.category === 'singularity' || r.category === 'thermobaric').every(r => unlocked.has(r.id));

        YARD_GAME_PASSES.forEach(pass => {
            let isOwned = false;
            if (pass.id === 'pass_2x_score') isOwned = has2x;
            else if (pass.id === 'pass_nuke_access') isOwned = hasNukes;
            else if (pass.id === 'pass_all_rockets') isOwned = hasAllRockets;

            const card = document.createElement('div');
            card.className = 'yard-pack-card';
            card.id = `yard-pass-card-${pass.id}`;
            card.style.cssText = `
                background: rgba(14, 20, 34, 0.9);
                border: 1.5px solid ${isOwned ? '#2ecc71' : 'rgba(255, 211, 42, 0.4)'};
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
                <div style="position: absolute; top: -8px; right: 10px; background: ${isOwned ? '#2ecc71' : '#ffd32a'}; color: #111; font-weight: 900; font-size: 0.65rem; padding: 2px 7px; border-radius: 6px;">
                    ${isOwned ? '✓ OMATUD' : pass.badge}
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 1.8rem; line-height: 1;">${pass.icon}</span>
                    <div>
                        <div style="font-weight: 900; color: #fff; font-size: 0.95rem;">${pass.name}</div>
                        <div style="font-size: 0.75rem; color: #94a3b8; line-height: 1.2;">${pass.description}</div>
                    </div>
                </div>
                <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 4px;">
                    <button type="button" class="btn-buy-yard-pass" id="btn-buy-pass-${pass.id}" ${isOwned ? 'disabled' : ''} style="
                        background: ${isOwned ? 'rgba(46, 204, 113, 0.25)' : 'linear-gradient(135deg, #ffd32a 0%, #ff9f1a 100%)'};
                        border: ${isOwned ? '1px solid #2ecc71' : 'none'};
                        color: ${isOwned ? '#2ecc71' : '#111'};
                        font-weight: 900;
                        padding: 7px 14px;
                        border-radius: 8px;
                        cursor: ${isOwned ? 'default' : 'pointer'};
                        display: flex;
                        align-items: center;
                        gap: 5px;
                        font-size: 0.85rem;
                        box-shadow: ${isOwned ? 'none' : '0 2px 10px rgba(255, 211, 42, 0.4)'};
                    ">
                        <span>💎</span>
                        <span>${isOwned ? '✓ OMATUD' : `${pass.yardCost.toLocaleString()} PBX`}</span>
                    </button>
                </div>
            `;

            const btnBuy = card.querySelector(`#btn-buy-pass-${pass.id}`) as HTMLButtonElement;
            if (btnBuy && !isOwned) {
                btnBuy.addEventListener('click', () => {
                    this.buyYardGamePass(pass);
                });
            }

            grid.appendChild(card);
        });
    }

    public buyYardPointsPack(pack: YardPointsPack) {
        showYardPurchaseConfirm({
            title: 'Osta Punkte Playbuxi Eest',
            itemName: `${pack.icon} ${pack.name} (+${pack.points.toLocaleString()} PTS)`,
            yardCost: pack.yardCost,
            description: `Kas soovid vahetada ${pack.yardCost.toLocaleString()} Playbuxi ${pack.points.toLocaleString()} Rocket punkti vastu?`,
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
                    this.renderYardShop();
                    this.renderRocketsCatalog();
                    this.ctx.onYardBalanceChanged?.();
                } else {
                    this.ctx.hud.showImpactToast('POLE PIISAVALT PLAYBUXI!');
                }
            }
        });
    }

    public buyYardGamePass(pass: YardGamePass) {
        showYardPurchaseConfirm({
            title: 'Osta Mängupass Playbuxi Eest',
            itemName: `${pass.icon} ${pass.name}`,
            yardCost: pass.yardCost,
            description: `Kas soovid osta "${pass.name}" ${pass.yardCost.toLocaleString()} Playbuxi eest?`,
            onConfirm: () => {
                const success = yardService.spendYards(
                    pass.yardCost,
                    pass.id,
                    `Rocket Playard Game Pass: ${pass.name}`
                );
                if (success) {
                    if (pass.id === 'pass_2x_score') {
                        this.ctx.set2xScorePass?.(true);
                    } else if (pass.id === 'pass_nuke_access') {
                        ROCKET_CATALOG.filter(r => r.category === 'singularity' || r.category === 'thermobaric')
                            .forEach(r => this.ctx.getUnlockedRockets().add(r.id));
                    } else if (pass.id === 'pass_all_rockets') {
                        ROCKET_CATALOG.forEach(r => this.ctx.getUnlockedRockets().add(r.id));
                    }
                    this.ctx.onProgressSave();
                    this.ctx.audio.playPurchase();
                    this.ctx.hud.showImpactToast(`AVATUD: ${pass.name}! 💎⚡`);
                    this.renderYardShop();
                    this.renderRocketsCatalog();
                    this.ctx.onYardBalanceChanged?.();
                } else {
                    this.ctx.hud.showImpactToast('POLE PIISAVALT JARDE!');
                }
            }
        });
    }

    // --- ROCKETS CATALOG (54 TYYPI - AVAMINE PUNKTIDE EEST) ---
    public renderRocketsCatalog() {
        const list = document.getElementById('rocket-catalog-list');
        const pointsDisp = document.getElementById('shop-points-display');
        const totalPointsBank = this.ctx.getTotalPointsBank();

        if (pointsDisp) pointsDisp.textContent = `${totalPointsBank.toLocaleString()} PTS`;
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
                    ${isEquipped ? '✓ KASUTUSES' : (isUnlocked ? 'KASUTA' : `AVA (${rocket.price} PTS)`)}
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

    public renderShopCatalog() {
        this.renderYardShop();
        this.renderRocketsCatalog();
    }

    private handleRocketAction(rocket: RocketType) {
        const unlockedRockets = this.ctx.getUnlockedRockets();
        let totalPoints = this.ctx.getTotalPointsBank();

        if (unlockedRockets.has(rocket.id)) {
            this.ctx.setEquippedRocket(rocket);
            this.ctx.onProgressSave();
            this.renderRocketsCatalog();
            this.ctx.audio.playPurchase();
        } else if (totalPoints >= rocket.price) {
            totalPoints -= rocket.price;
            this.ctx.setTotalPointsBank(totalPoints);
            unlockedRockets.add(rocket.id);
            this.ctx.setEquippedRocket(rocket);
            this.ctx.onProgressSave();
            this.renderRocketsCatalog();
            this.ctx.audio.playPurchase();
            this.ctx.hud.showImpactToast(`AVATUD: ${rocket.name}! 🚀`);
        } else {
            this.ctx.hud.showImpactToast('POLE PIISAVALT PUNKTE! Osta punkte Shopist 💎');
        }
    }
}
