import { CrateTier, WeaponSkinDef, MoneyPackDef } from '../types';
import { CRATE_CATALOG, WEAPON_SKIN_CATALOG, MONEY_PACKS } from '../catalog';
import { getCrateArtworkSvg, getWeaponArtworkSvg } from './svgArtwork';
import { audio } from '../audio';
import { MmpCrateManager } from '../state/crateManager';
import { getLanguage, I18N } from '../i18n';
import { yardService } from '../../../shared/yardService';
import { showYardPurchaseConfirm } from '../../../shared/yardPurchaseModal';

export interface CrateShopContext {
    crateManager: MmpCrateManager;
    getState: () => string;
    isPointerLocked: boolean;
    equipSkin: (skinId: string) => void;
}

export class CrateShopUI {
    private ctx: CrateShopContext;
    private crateShopModal: HTMLElement | null = null;
    private unboxingModal: HTMLElement | null = null;
    private crateTimerInterval: any = null;

    constructor(ctx: CrateShopContext) {
        this.ctx = ctx;
    }

    public init() {
        this.crateShopModal = document.getElementById('crate-shop-modal');
        this.unboxingModal = document.getElementById('crate-unboxing-overlay');

        const btnCrateShop = document.getElementById('btn-crate-shop');
        if (btnCrateShop) {
            btnCrateShop.onclick = () => this.openCrateShop();
        }

        const btnClose = document.getElementById('btn-close-crate-shop');
        if (btnClose) {
            btnClose.onclick = () => this.closeCrateShop();
        }

        const btnTabShop = document.getElementById('btn-tab-shop');
        const btnTabInv = document.getElementById('btn-tab-inventory');
        const btnTabExchange = document.getElementById('btn-tab-exchange');
        if (btnTabShop) btnTabShop.onclick = () => this.switchCrateShopTab('shop');
        if (btnTabInv) btnTabInv.onclick = () => this.switchCrateShopTab('inventory');
        if (btnTabExchange) btnTabExchange.onclick = () => this.switchCrateShopTab('exchange');

        const btnAddMoney = document.getElementById('btn-shop-add-money');
        if (btnAddMoney) {
            btnAddMoney.onclick = () => {
                this.openCrateShop();
                this.switchCrateShopTab('exchange');
            };
        }

        const hudMoneyBadge = document.getElementById('hud-money-badge');
        if (hudMoneyBadge) {
            hudMoneyBadge.style.cursor = 'pointer';
            hudMoneyBadge.onclick = () => {
                this.openCrateShop();
                this.switchCrateShopTab('exchange');
            };
        }

        yardService.subscribe(() => {
            this.updateYardUI();
        });

        const btnUnboxClose = document.getElementById('btn-unboxing-close');
        if (btnUnboxClose) {
            btnUnboxClose.onclick = () => {
                if (this.unboxingModal) this.unboxingModal.style.display = 'none';
                this.renderInventory();
            };
        }

        if (this.crateShopModal) {
            this.crateShopModal.addEventListener('wheel', (e: WheelEvent) => {
                e.stopPropagation();
            }, { passive: true });
        }
        if (this.unboxingModal) {
            this.unboxingModal.addEventListener('wheel', (e: WheelEvent) => {
                e.stopPropagation();
            }, { passive: true });
        }

        if (this.crateTimerInterval) clearInterval(this.crateTimerInterval);
        this.crateTimerInterval = setInterval(() => {
            this.updateCrateShopTimers();
        }, 1000);

        this.updateYardUI();
        this.renderCrateShop();
        this.renderInventory();
    }

    public updateYardUI() {
        const yards = yardService.getYards();
        const shopYardVal = document.getElementById('shop-modal-yard-val');
        if (shopYardVal) shopYardVal.textContent = yards.toLocaleString();

        const shopYardIcon = document.getElementById('shop-modal-yard-icon');
        if (shopYardIcon && !shopYardIcon.hasChildNodes()) {
            shopYardIcon.innerHTML = yardService.renderYardSvg(16);
        }

        const gameYardVal = document.getElementById('game-yard-val');
        if (gameYardVal) gameYardVal.textContent = yards.toLocaleString();

        const gameYardIcon = document.getElementById('game-yard-icon');
        if (gameYardIcon && !gameYardIcon.hasChildNodes()) {
            gameYardIcon.innerHTML = yardService.renderYardSvg(16);
        }
    }

    public openCrateShop() {
        if (this.ctx.isPointerLocked) {
            document.exitPointerLock?.();
        }
        const roundEndOverlay = document.getElementById('round-end-overlay');
        if (roundEndOverlay) {
            roundEndOverlay.style.display = 'none';
        }
        if (this.crateShopModal) {
            this.crateShopModal.style.display = 'flex';
        }
        this.updateYardUI();
        this.ctx.crateManager.updateMoneyUI();
        if (this.ctx.getState() !== 'lobby') {
            const currentActive = document.querySelector('.crate-tab-btn.active')?.id;
            if (currentActive === 'btn-tab-shop') {
                this.switchCrateShopTab('inventory');
            }
        }
        this.renderCrateShop();
        this.renderInventory();
        this.renderMoneyExchange();
    }

    public closeCrateShop() {
        if (this.crateShopModal) {
            this.crateShopModal.style.display = 'none';
        }
    }

    public switchCrateShopTab(tab: 'shop' | 'inventory' | 'exchange') {
        const btnTabShop = document.getElementById('btn-tab-shop');
        const btnTabInv = document.getElementById('btn-tab-inventory');
        const btnTabExchange = document.getElementById('btn-tab-exchange');
        const shopView = document.getElementById('tab-shop-view');
        const invView = document.getElementById('tab-inventory-view');
        const exchangeView = document.getElementById('tab-exchange-view');

        btnTabShop?.classList.toggle('active', tab === 'shop');
        btnTabInv?.classList.toggle('active', tab === 'inventory');
        btnTabExchange?.classList.toggle('active', tab === 'exchange');

        if (shopView) shopView.style.display = tab === 'shop' ? 'block' : 'none';
        if (invView) invView.style.display = tab === 'inventory' ? 'block' : 'none';
        if (exchangeView) exchangeView.style.display = tab === 'exchange' ? 'block' : 'none';

        if (tab === 'shop') {
            this.renderCrateShop();
        } else if (tab === 'inventory') {
            this.renderInventory();
        } else if (tab === 'exchange') {
            this.renderMoneyExchange();
        }
    }

    public renderCrateShop() {
        const grid = document.getElementById('shop-crates-grid');
        if (!grid) return;

        const lang = getLanguage();
        const texts = I18N[lang];
        const stocks = this.ctx.crateManager.getStocks();
        const money = this.ctx.crateManager.getMoney();
        const now = Date.now();
        const isLobby = this.ctx.getState() === 'lobby';

        grid.innerHTML = '';

        if (!isLobby) {
            const warningBanner = document.createElement('div');
            warningBanner.id = 'shop-in-game-notice';
            warningBanner.style.cssText = 'grid-column: 1 / -1; background: rgba(255, 46, 99, 0.15); border: 2px solid #ff2e63; border-radius: 12px; padding: 12px 20px; text-align: center; color: #ff6b81; font-weight: 700; margin-bottom: 10px; font-size: 0.95rem;';
            warningBanner.innerHTML = texts.crateShop.inGameNotice;
            grid.appendChild(warningBanner);
        }

        (Object.keys(CRATE_CATALOG) as CrateTier[]).forEach(tier => {
            const crate = CRATE_CATALOG[tier];
            const stockData = stocks[tier] || { stock: crate.initialStock, nextRestock: now + crate.restockIntervalSec * 1000 };
            const isOutOfStock = stockData.stock <= 0;
            const canAfford = money >= crate.price;

            const remainingSec = Math.max(0, Math.ceil((stockData.nextRestock - now) / 1000));
            const mm = Math.floor(remainingSec / 60).toString().padStart(2, '0');
            const ss = (remainingSec % 60).toString().padStart(2, '0');

            const card = document.createElement('div');
            card.className = 'crate-item-card';
            card.id = `crate-card-${tier}`;
            card.style.borderColor = crate.color;

            const canBuy = isLobby && !isOutOfStock && canAfford;
            let buyButtonText = texts.crateShop.buyBtn(crate.price);
            if (!isLobby) {
                buyButtonText = texts.crateShop.buyBtnLobbyOnly;
            } else if (isOutOfStock) {
                buyButtonText = texts.crateShop.buyBtnSoldOut;
            }

            const isSetCrate = !!crate.isSetCrate;
            if (isSetCrate) {
                card.classList.add('set-crate-card');
                card.style.background = 'linear-gradient(145deg, rgba(35, 20, 45, 0.95), rgba(20, 15, 30, 0.95))';
                card.style.boxShadow = `0 0 20px ${crate.color}33`;
            }

            const setBadgeHtml = isSetCrate 
                ? `<div style="background: linear-gradient(90deg, #ffd700, #ff9f1a); color: #111; font-weight: 900; font-size: 0.72rem; padding: 2px 8px; border-radius: 10px; margin-bottom: 6px; display: inline-block; letter-spacing: 0.5px;">${texts.crateShop.setBundleBadge}</div>`
                : '';

            card.innerHTML = `
                <div class="crate-art-box" style="width: 100px; height: 80px; margin: 0 auto 6px auto; display: flex; align-items: center; justify-content: center;">
                    ${getCrateArtworkSvg(tier)}
                </div>
                ${setBadgeHtml}
                <h3 style="margin: 2px 0 6px 0; font-size: 1.05rem; color: ${crate.color};">${crate.name}</h3>
                <div class="crate-stock-badge ${isOutOfStock ? 'out-of-stock' : ''}" id="stock-badge-${tier}">
                    ${texts.crateShop.stockLabel} <b id="stock-val-${tier}">${stockData.stock}</b> ${texts.crateShop.pcs}
                </div>
                <div class="crate-restock-timer" id="restock-timer-${tier}">
                    ${texts.crateShop.restockTimer} <b id="restock-val-${tier}">${mm}:${ss}</b>
                </div>
                <div style="font-size: 1.15rem; font-weight: 900; color: #ffd32a; margin-bottom: 10px;">
                    ${crate.price} €
                </div>
                <button class="btn-buy-crate ${isSetCrate ? 'btn-buy-set' : ''}" id="btn-buy-${tier}" ${!canBuy ? 'disabled' : ''}>
                    ${buyButtonText}
                </button>
            `;

            const btnBuy = card.querySelector(`#btn-buy-${tier}`) as HTMLButtonElement;
            if (btnBuy) {
                btnBuy.onclick = () => {
                    if (this.ctx.getState() !== 'lobby') {
                        alert(texts.crateShop.inGameNoticeAlert);
                        return;
                    }
                    const res = this.ctx.crateManager.buyCrate(tier, true);
                    if (res.success) {
                        audio.playCrateTick();
                        this.renderCrateShop();
                        this.renderInventory();
                    } else {
                        alert(res.message);
                    }
                };
            }

            grid.appendChild(card);
        });
    }

    public updateCrateShopTimers() {
        const lang = getLanguage();
        const texts = I18N[lang];
        const stocks = this.ctx.crateManager.getStocks();
        const money = this.ctx.crateManager.getMoney();
        const now = Date.now();
        const isLobby = this.ctx.getState() === 'lobby';

        const btnCrateShop = document.getElementById('btn-crate-shop');
        if (btnCrateShop) {
            if (!isLobby) {
                btnCrateShop.classList.add('in-game-disabled');
                btnCrateShop.title = texts.crateShop.inGameNoticeAlert;
            } else {
                btnCrateShop.classList.remove('in-game-disabled');
                btnCrateShop.title = texts.hud.crates;
            }
        }

        (Object.keys(CRATE_CATALOG) as CrateTier[]).forEach(tier => {
            const crate = CRATE_CATALOG[tier];
            const stockData = stocks[tier];
            if (!stockData) return;

            const stockEl = document.getElementById(`stock-val-${tier}`);
            if (stockEl && stockData && typeof stockData.stock === 'number') {
                stockEl.textContent = stockData.stock.toString();
            }

            const badgeEl = document.getElementById(`stock-badge-${tier}`);
            if (badgeEl) {
                if (stockData.stock <= 0) {
                    badgeEl.classList.add('out-of-stock');
                } else {
                    badgeEl.classList.remove('out-of-stock');
                }
            }

            const remainingSec = Math.max(0, Math.ceil((stockData.nextRestock - now) / 1000));
            const mm = Math.floor(remainingSec / 60).toString().padStart(2, '0');
            const ss = (remainingSec % 60).toString().padStart(2, '0');

            const restockEl = document.getElementById(`restock-val-${tier}`);
            if (restockEl) restockEl.textContent = `${mm}:${ss}`;

            const btnBuy = document.getElementById(`btn-buy-${tier}`) as HTMLButtonElement;
            if (btnBuy) {
                const isOutOfStock = stockData.stock <= 0;
                const canAfford = money >= crate.price;
                const canBuy = isLobby && !isOutOfStock && canAfford;
                btnBuy.disabled = !canBuy;
                if (!isLobby) {
                    btnBuy.textContent = texts.crateShop.buyBtnLobbyOnly;
                } else if (isOutOfStock) {
                    btnBuy.textContent = texts.crateShop.buyBtnSoldOut;
                } else {
                    btnBuy.textContent = texts.crateShop.buyBtn(crate.price);
                }
            }
        });
    }

    public renderInventory() {
        const lang = getLanguage();
        const texts = I18N[lang];
        const inv = this.ctx.crateManager.getInventory();

        // 1. Owned Crates
        const cratesGrid = document.getElementById('inventory-crates-grid');
        if (cratesGrid) {
            cratesGrid.innerHTML = '';
            const ownedTiers = (Object.keys(inv.crates) as CrateTier[]).filter(t => (inv.crates[t] || 0) > 0);
            if (ownedTiers.length === 0) {
                cratesGrid.innerHTML = `<div style="color: #888; font-size: 0.9rem; grid-column: 1 / -1;">${texts.crateShop.emptyCratesText}</div>`;
            } else {
                ownedTiers.forEach(tier => {
                    const count = inv.crates[tier];
                    const crate = CRATE_CATALOG[tier];
                    const card = document.createElement('div');
                    card.className = 'inventory-item-card';
                    card.id = `owned-crate-${tier}`;
                    card.style.borderColor = crate.color;
                    card.innerHTML = `
                        <div class="crate-art-box" style="width: 80px; height: 65px; margin: 0 auto 6px auto; display: flex; align-items: center; justify-content: center;">
                            ${getCrateArtworkSvg(tier)}
                        </div>
                        <strong style="color: ${crate.color}; font-size: 0.95rem;">${crate.name}</strong>
                        <div style="font-size: 0.85rem; color: #ffd32a; margin: 4px 0 10px 0;">${texts.crateShop.ownedCount(count)}</div>
                        <button class="btn-play-again" id="btn-open-${tier}" style="padding: 6px 16px; font-size: 0.85rem; margin: 0; background: linear-gradient(135deg, ${crate.color}, #555);">
                            ${texts.crateShop.openCrateBtn}
                        </button>
                    `;
                    const btnOpen = card.querySelector(`#btn-open-${tier}`) as HTMLButtonElement;
                    if (btnOpen) {
                        btnOpen.onclick = () => this.triggerUnbox(tier);
                    }
                    cratesGrid.appendChild(card);
                });
            }
        }

        // 2. Knives
        const knivesGrid = document.getElementById('inventory-knives-grid');
        if (knivesGrid) {
            knivesGrid.innerHTML = '';
            const knifeSkins = inv.skins.filter(s => WEAPON_SKIN_CATALOG[s]?.type === 'knife');
            knifeSkins.forEach(skinId => {
                const skin = WEAPON_SKIN_CATALOG[skinId];
                const isEquipped = inv.equippedKnife === skinId;
                const refund = this.ctx.crateManager.getSkinRefundAmount(skinId);
                const isDefault = skinId === 'knife_default';
                const card = document.createElement('div');
                card.className = `inventory-item-card ${isEquipped ? 'equipped' : ''}`;
                card.style.borderColor = skin.tierColor;
                card.innerHTML = `
                    <div class="weapon-art-box" style="width: 80px; height: 65px; margin: 0 auto 4px auto; display: flex; align-items: center; justify-content: center;">
                        ${getWeaponArtworkSvg(skin)}
                    </div>
                    <strong style="color: ${skin.tierColor}; font-size: 0.92rem;">${skin.name}</strong>
                    <div style="font-size: 0.75rem; color: #aaa; margin: 2px 0 8px 0;">${skin.tierName}</div>
                    <div style="display: flex; gap: 6px; width: 100%;">
                        <button class="btn-hud-action" id="btn-equip-${skinId}" style="flex: 1; justify-content: center; font-size: 0.8rem; background: ${isEquipped ? 'rgba(46, 204, 113, 0.25)' : 'rgba(255, 255, 255, 0.1)'}; border-color: ${isEquipped ? '#2ecc71' : '#666'};">
                            ${isEquipped ? texts.crateShop.equipped : texts.crateShop.equip}
                        </button>
                        ${!isDefault ? `
                            <button class="btn-delete-skin" id="btn-delete-${skinId}" title="Delete skin (+${refund} €)" style="background: rgba(255, 71, 87, 0.2); border: 1px solid #ff4757; color: #ff6b81; border-radius: 8px; padding: 4px 8px; font-size: 0.75rem; font-weight: 800; cursor: pointer; white-space: nowrap;">
                                🗑️ +${refund}€
                            </button>
                        ` : ''}
                    </div>
                `;
                const btnEquip = card.querySelector(`#btn-equip-${skinId}`) as HTMLButtonElement;
                if (btnEquip && !isEquipped) {
                    btnEquip.onclick = () => this.ctx.equipSkin(skinId);
                }
                const btnDelete = card.querySelector(`#btn-delete-${skinId}`) as HTMLButtonElement;
                if (btnDelete) {
                    btnDelete.onclick = () => {
                        const res = this.ctx.crateManager.deleteSkin(skinId);
                        if (res.success) {
                            audio.playCrateTick();
                            this.renderInventory();
                            this.updateYardUI();
                            this.ctx.crateManager.updateMoneyUI();
                        }
                    };
                }
                knivesGrid.appendChild(card);
            });
        }

        // 3. Guns
        const gunsGrid = document.getElementById('inventory-guns-grid');
        if (gunsGrid) {
            gunsGrid.innerHTML = '';
            const gunSkins = inv.skins.filter(s => WEAPON_SKIN_CATALOG[s]?.type === 'gun');
            gunSkins.forEach(skinId => {
                const skin = WEAPON_SKIN_CATALOG[skinId];
                const isEquipped = inv.equippedGun === skinId;
                const refund = this.ctx.crateManager.getSkinRefundAmount(skinId);
                const isDefault = skinId === 'gun_default';
                const card = document.createElement('div');
                card.className = `inventory-item-card ${isEquipped ? 'equipped' : ''}`;
                card.style.borderColor = skin.tierColor;
                card.innerHTML = `
                    <div class="weapon-art-box" style="width: 80px; height: 65px; margin: 0 auto 4px auto; display: flex; align-items: center; justify-content: center;">
                        ${getWeaponArtworkSvg(skin)}
                    </div>
                    <strong style="color: ${skin.tierColor}; font-size: 0.92rem;">${skin.name}</strong>
                    <div style="font-size: 0.75rem; color: #aaa; margin: 2px 0 8px 0;">${skin.tierName}</div>
                    <div style="display: flex; gap: 6px; width: 100%;">
                        <button class="btn-hud-action" id="btn-equip-${skinId}" style="flex: 1; justify-content: center; font-size: 0.8rem; background: ${isEquipped ? 'rgba(46, 204, 113, 0.25)' : 'rgba(255, 255, 255, 0.1)'}; border-color: ${isEquipped ? '#2ecc71' : '#666'};">
                            ${isEquipped ? texts.crateShop.equipped : texts.crateShop.equip}
                        </button>
                        ${!isDefault ? `
                            <button class="btn-delete-skin" id="btn-delete-${skinId}" title="Delete skin (+${refund} €)" style="background: rgba(255, 71, 87, 0.2); border: 1px solid #ff4757; color: #ff6b81; border-radius: 8px; padding: 4px 8px; font-size: 0.75rem; font-weight: 800; cursor: pointer; white-space: nowrap;">
                                🗑️ +${refund}€
                            </button>
                        ` : ''}
                    </div>
                `;
                const btnEquip = card.querySelector(`#btn-equip-${skinId}`) as HTMLButtonElement;
                if (btnEquip && !isEquipped) {
                    btnEquip.onclick = () => this.ctx.equipSkin(skinId);
                }
                const btnDelete = card.querySelector(`#btn-delete-${skinId}`) as HTMLButtonElement;
                if (btnDelete) {
                    btnDelete.onclick = () => {
                        const res = this.ctx.crateManager.deleteSkin(skinId);
                        if (res.success) {
                            audio.playCrateTick();
                            this.renderInventory();
                            this.updateYardUI();
                            this.ctx.crateManager.updateMoneyUI();
                        }
                    };
                }
                gunsGrid.appendChild(card);
            });
        }
    }

    public renderMoneyExchange() {
        const grid = document.getElementById('money-packs-grid');
        if (!grid) return;

        const lang = getLanguage();
        const texts = I18N[lang];
        const yards = yardService.getYards();
        const hasInfinite = yardService.hasInfiniteYards();

        grid.innerHTML = '';

        MONEY_PACKS.forEach(pack => {
            const card = document.createElement('div');
            card.className = `money-pack-card ${pack.isPopular ? 'popular' : ''} ${pack.isBestValue ? 'best-value' : ''}`;
            card.id = `money-pack-card-${pack.id}`;

            const canAfford = hasInfinite || yards >= pack.yardCost;

            const packTitle = texts.moneyExchange[`${pack.nameKey}Title` as keyof typeof texts.moneyExchange] as string || `+${pack.moneyAmount} €`;
            const packDesc = texts.moneyExchange[`${pack.nameKey}Desc` as keyof typeof texts.moneyExchange] as string || `+${pack.moneyAmount} €`;

            let badgeHtml = '';
            if (pack.isPopular) {
                badgeHtml = `<div class="money-pack-badge" style="background: #3498db; color: #fff;">${texts.moneyExchange.popularBadge}</div>`;
            } else if (pack.isBestValue) {
                badgeHtml = `<div class="money-pack-badge" style="background: #ffd32a; color: #111;">${texts.moneyExchange.bestValueBadge}</div>`;
            }

            card.innerHTML = `
                ${badgeHtml}
                <div style="font-size: 2.4rem; margin-bottom: 6px;">${pack.badge}</div>
                <div style="font-size: 1.15rem; font-weight: 900; color: #fff; margin-bottom: 4px;">${packTitle}</div>
                <div style="font-size: 0.85rem; color: #aaa; margin-bottom: 12px;">${packDesc}</div>
                <div style="font-size: 1.6rem; font-weight: 900; color: #2ecc71; margin-bottom: 8px;">+${pack.moneyAmount.toLocaleString()} €</div>
                <button class="btn-buy-pack" id="btn-buy-pack-${pack.id}">
                    <span>${yardService.renderYardSvg(16)}</span>
                    <span>${texts.moneyExchange.buyBtn(pack.yardCost)}</span>
                </button>
            `;

            const btnBuy = card.querySelector(`#btn-buy-pack-${pack.id}`) as HTMLButtonElement;
            if (btnBuy) {
                btnBuy.onclick = () => this.buyMoneyPack(pack);
            }

            grid.appendChild(card);
        });
    }

    public buyMoneyPack(pack: MoneyPackDef) {
        const lang = getLanguage();
        const texts = I18N[lang];
        const toastEl = document.getElementById('exchange-toast');

        showYardPurchaseConfirm({
            itemName: `${pack.name} (+${pack.moneyAmount.toLocaleString()} €)`,
            yardCost: pack.yardCost,
            onConfirm: () => {
                const success = yardService.spendYards(pack.yardCost, undefined, `MMP1 Money Pack: +${pack.moneyAmount} €`);
                if (success) {
                    this.ctx.crateManager.addMoney(pack.moneyAmount);
                    audio.playCrateTick();
                    this.updateYardUI();
                    this.renderMoneyExchange();

                    if (toastEl) {
                        toastEl.textContent = texts.moneyExchange.successToast(pack.moneyAmount, pack.yardCost);
                        toastEl.style.display = 'block';
                        toastEl.style.background = 'rgba(46, 204, 113, 0.2)';
                        toastEl.style.border = '1px solid #2ecc71';
                        toastEl.style.color = '#2ecc71';
                        setTimeout(() => {
                            if (toastEl) toastEl.style.display = 'none';
                        }, 4000);
                    }
                } else {
                    if (toastEl) {
                        toastEl.textContent = texts.moneyExchange.notEnoughYards(pack.yardCost, yardService.getYards());
                        toastEl.style.display = 'block';
                        toastEl.style.background = 'rgba(255, 46, 99, 0.2)';
                        toastEl.style.border = '1px solid #ff2e63';
                        toastEl.style.color = '#ff2e63';
                        setTimeout(() => {
                            if (toastEl) toastEl.style.display = 'none';
                        }, 4000);
                    }
                }
            }
        });
    }

    public triggerUnbox(tier: CrateTier): (WeaponSkinDef & { isDuplicate?: boolean; refundAmount?: number }) | null {
        if (!this.unboxingModal) return null;

        const lang = getLanguage();
        const texts = I18N[lang];
        const crate = CRATE_CATALOG[tier];
        if (!crate) return null;

        const wonSkin = this.ctx.crateManager.openCrate(tier);
        if (!wonSkin) {
            return null;
        }

        const titleEl = document.getElementById('unboxing-status-title');
        const subtitleEl = document.getElementById('unboxing-status-subtitle');
        const viewportEl = document.getElementById('roulette-viewport');
        const trackEl = document.getElementById('roulette-track');
        const resultBox = document.getElementById('unboxing-result-box');
        const btnEquip = document.getElementById('btn-unboxing-equip') as HTMLButtonElement;
        const btnClose = document.getElementById('btn-unboxing-close') as HTMLButtonElement;

        if (titleEl) titleEl.textContent = `${crate.name.toUpperCase()} ${texts.crateShop.unboxingTitle}`;
        if (subtitleEl) subtitleEl.textContent = texts.crateShop.unboxingSubtitle;
        if (resultBox) resultBox.style.display = 'none';
        if (btnEquip) btnEquip.style.display = 'none';
        if (btnClose) btnClose.style.display = 'none';

        this.unboxingModal.style.display = 'flex';

        // Populate roulette track with 40 cards
        if (trackEl) {
            trackEl.innerHTML = '';
            trackEl.style.transition = 'none';
            trackEl.style.transform = 'translateX(0px)';

            const allSkins = Object.values(WEAPON_SKIN_CATALOG);
            const WINNER_INDEX = 32; // 0-indexed: 33rd item will be winner

            for (let i = 0; i < 40; i++) {
                let skin: WeaponSkinDef;
                if (i === WINNER_INDEX) {
                    skin = wonSkin;
                } else {
                    skin = allSkins[Math.floor(Math.random() * allSkins.length)] || wonSkin;
                }

                const itemCard = document.createElement('div');
                itemCard.className = 'roulette-item-card';
                itemCard.id = `roulette-card-${i}`;
                itemCard.style.setProperty('--card-color', skin.tierColor);
                itemCard.style.borderColor = skin.tierColor;
                itemCard.innerHTML = `
                    <div class="roulette-item-svg">
                        ${getWeaponArtworkSvg(skin)}
                    </div>
                    <div class="roulette-item-name" style="color: ${skin.tierColor};">
                        ${skin.name}
                    </div>
                    <div class="roulette-item-tier" style="background: ${skin.tierColor}; color: #111;">
                        ${skin.tierName}
                    </div>
                `;
                trackEl.appendChild(itemCard);
            }

            // Force reflow
            void trackEl.offsetWidth;

            // Card width is 140 + gap 12 = 152px
            const CARD_WIDTH = 152;
            const viewportWidth = viewportEl ? viewportEl.offsetWidth : 780;
            // Center of winner card
            const targetX = -1 * (WINNER_INDEX * CARD_WIDTH + (140 / 2) - (viewportWidth / 2) + (Math.random() * 40 - 20));

            // Start animation after a tick
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (!trackEl) return;
                    trackEl.style.transition = 'transform 5s cubic-bezier(0.12, 0.8, 0.18, 1)';
                    trackEl.style.transform = `translateX(${targetX}px)`;

                    // Audio ticks during spin
                    let lastCardIndex = 0;
                    const startTime = Date.now();
                    const duration = 5000;
                    const tickLoop = () => {
                        const elapsed = Date.now() - startTime;
                        if (elapsed < duration) {
                            try {
                                const transform = window.getComputedStyle(trackEl).transform;
                                const matrix = new DOMMatrixReadOnly(transform);
                                const currentX = matrix.m41;
                                const currentCardIndex = Math.floor(Math.abs(currentX) / CARD_WIDTH);
                                if (currentCardIndex !== lastCardIndex && currentCardIndex >= 0 && currentCardIndex < 40) {
                                    lastCardIndex = currentCardIndex;
                                    audio.playCrateTick();
                                }
                            } catch (e) {}
                            requestAnimationFrame(tickLoop);
                        }
                    };
                    requestAnimationFrame(tickLoop);
                });
            });

            // Reveal winner when stopped
            setTimeout(() => {
                audio.playCrateOpen();

                const winnerCard = document.getElementById(`roulette-card-${WINNER_INDEX}`);
                if (winnerCard) {
                    winnerCard.classList.add('winner-pulse');
                }

                const isSet = (wonSkin as any).isSetAward;
                const setKnife = (wonSkin as any).setKnifeSkin as WeaponSkinDef | undefined;
                const setGun = (wonSkin as any).setGunSkin as WeaponSkinDef | undefined;

                if (isSet) {
                    if (titleEl) titleEl.textContent = texts.crateShop.congratsSet;
                    if (subtitleEl) subtitleEl.textContent = texts.crateShop.congratsSetSub(crate.name);
                } else if (wonSkin.isDuplicate) {
                    if (titleEl) titleEl.textContent = texts.crateShop.congratsDuplicate;
                    if (subtitleEl) subtitleEl.textContent = texts.crateShop.congratsDuplicateSub(wonSkin.refundAmount || 0);
                } else {
                    if (titleEl) titleEl.textContent = texts.crateShop.congratsWeapon;
                    if (subtitleEl) subtitleEl.textContent = texts.crateShop.congratsWeaponSub(crate.name);
                }

                const typeEl = document.getElementById('unboxing-item-type');
                if (typeEl) {
                    if (isSet) {
                        typeEl.textContent = texts.crateShop.itemTypeSet;
                        typeEl.style.color = '#ffd700';
                    } else if (wonSkin.isDuplicate) {
                        typeEl.textContent = texts.crateShop.itemTypeDuplicate(wonSkin.refundAmount || 0);
                        typeEl.style.color = '#ffd32a';
                    } else {
                        typeEl.textContent = wonSkin.type === 'knife' ? texts.crateShop.itemTypeKnife : texts.crateShop.itemTypeGun;
                        typeEl.style.color = '#ffd32a';
                    }
                }

                const nameEl = document.getElementById('unboxing-item-name');
                if (nameEl) {
                    if (isSet && setKnife && setGun) {
                        nameEl.textContent = `${setKnife.name} & ${setGun.name}`;
                    } else {
                        nameEl.textContent = wonSkin.name;
                    }
                    nameEl.style.color = wonSkin.tierColor;
                }

                const rarityEl = document.getElementById('unboxing-item-rarity');
                if (rarityEl) {
                    if (isSet) {
                        rarityEl.textContent = 'SET BUNDLE';
                    } else {
                        rarityEl.textContent = wonSkin.isDuplicate 
                            ? `${wonSkin.tierName.toUpperCase()} (${texts.crateShop.itemTypeDuplicate(wonSkin.refundAmount || 0)})`
                            : wonSkin.tierName.toUpperCase();
                    }
                    rarityEl.style.background = wonSkin.tierColor;
                    rarityEl.style.color = '#111';
                }

                let winnerArtEl = document.getElementById('unboxing-result-art');
                if (!winnerArtEl && resultBox) {
                    winnerArtEl = document.createElement('div');
                    winnerArtEl.id = 'unboxing-result-art';
                    winnerArtEl.style.width = '120px';
                    winnerArtEl.style.height = '90px';
                    winnerArtEl.style.margin = '0 auto 8px auto';
                    winnerArtEl.style.display = 'flex';
                    winnerArtEl.style.alignItems = 'center';
                    winnerArtEl.style.justifyContent = 'center';
                    resultBox.insertBefore(winnerArtEl, resultBox.firstChild);
                }
                if (winnerArtEl) {
                    if (isSet && setKnife && setGun) {
                        winnerArtEl.innerHTML = `<div style="display: flex; gap: 8px; align-items: center; justify-content: center; width: 100%;">
                            <div style="width: 70px; height: 60px;">${getWeaponArtworkSvg(setKnife)}</div>
                            <div style="width: 70px; height: 60px;">${getWeaponArtworkSvg(setGun)}</div>
                        </div>`;
                    } else {
                        winnerArtEl.innerHTML = getWeaponArtworkSvg(wonSkin);
                    }
                }

                if (resultBox) resultBox.style.display = 'block';

                if (btnEquip) {
                    btnEquip.style.display = 'inline-block';
                    btnEquip.textContent = isSet ? texts.crateShop.equipSetBtn : texts.crateShop.equipNowBtn;
                    btnEquip.onclick = () => {
                        if (isSet && setKnife && setGun) {
                            this.ctx.equipSkin(setKnife.id);
                            this.ctx.equipSkin(setGun.id);
                        } else {
                            this.ctx.equipSkin(wonSkin.id);
                        }
                        if (this.unboxingModal) this.unboxingModal.style.display = 'none';
                        this.renderInventory();
                    };
                }

                if (btnClose) {
                    btnClose.style.display = 'inline-block';
                    btnClose.textContent = texts.crateShop.closeBtn;
                    btnClose.onclick = () => {
                        if (this.unboxingModal) this.unboxingModal.style.display = 'none';
                        this.renderInventory();
                    };
                }

                this.renderInventory();
            }, 5300);
        }

        return wonSkin;
    }
}
