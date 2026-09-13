import { CrateTier, WeaponSkinDef } from '../types';
import { CRATE_CATALOG, WEAPON_SKIN_CATALOG } from '../catalog';
import { getCrateArtworkSvg, getWeaponArtworkSvg } from './svgArtwork';
import { audio } from '../audio';
import { MmpCrateManager } from '../state/crateManager';

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
        if (btnTabShop && btnTabInv) {
            btnTabShop.onclick = () => this.switchCrateShopTab('shop');
            btnTabInv.onclick = () => this.switchCrateShopTab('inventory');
        }

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

        this.renderCrateShop();
        this.renderInventory();
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
        this.ctx.crateManager.updateMoneyUI();
        if (this.ctx.getState() !== 'lobby') {
            this.switchCrateShopTab('inventory');
        }
        this.renderCrateShop();
        this.renderInventory();
    }

    public closeCrateShop() {
        if (this.crateShopModal) {
            this.crateShopModal.style.display = 'none';
        }
    }

    public switchCrateShopTab(tab: 'shop' | 'inventory') {
        const btnTabShop = document.getElementById('btn-tab-shop');
        const btnTabInv = document.getElementById('btn-tab-inventory');
        const shopView = document.getElementById('tab-shop-view');
        const invView = document.getElementById('tab-inventory-view');

        if (tab === 'shop') {
            btnTabShop?.classList.add('active');
            btnTabInv?.classList.remove('active');
            if (shopView) shopView.style.display = 'block';
            if (invView) invView.style.display = 'none';
            this.renderCrateShop();
        } else {
            btnTabInv?.classList.add('active');
            btnTabShop?.classList.remove('active');
            if (invView) invView.style.display = 'block';
            if (shopView) shopView.style.display = 'none';
            this.renderInventory();
        }
    }

    public renderCrateShop() {
        const grid = document.getElementById('shop-crates-grid');
        if (!grid) return;

        const stocks = this.ctx.crateManager.getStocks();
        const money = this.ctx.crateManager.getMoney();
        const now = Date.now();
        const isLobby = this.ctx.getState() === 'lobby';

        grid.innerHTML = '';

        if (!isLobby) {
            const warningBanner = document.createElement('div');
            warningBanner.id = 'shop-in-game-notice';
            warningBanner.style.cssText = 'grid-column: 1 / -1; background: rgba(255, 46, 99, 0.15); border: 2px solid #ff2e63; border-radius: 12px; padding: 12px 20px; text-align: center; color: #ff6b81; font-weight: 700; margin-bottom: 10px; font-size: 0.95rem;';
            warningBanner.innerHTML = '🔒 KASTIDE OSTMINE ON LUKUSTATUD! Kaste saab osta ainult ooteruumis (lobis) enne mängu algust.';
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
            let buyButtonText = `OSTA ${crate.price} €`;
            if (!isLobby) {
                buyButtonText = 'AINULT LOBIS 🔒';
            } else if (isOutOfStock) {
                buyButtonText = 'LÄBI MÜÜDUD';
            }

            const isSetCrate = !!crate.isSetCrate;
            if (isSetCrate) {
                card.classList.add('set-crate-card');
                card.style.background = 'linear-gradient(145deg, rgba(35, 20, 45, 0.95), rgba(20, 15, 30, 0.95))';
                card.style.boxShadow = `0 0 20px ${crate.color}33`;
            }

            const setBadgeHtml = isSetCrate 
                ? `<div style="background: linear-gradient(90deg, #ffd700, #ff9f1a); color: #111; font-weight: 900; font-size: 0.72rem; padding: 2px 8px; border-radius: 10px; margin-bottom: 6px; display: inline-block; letter-spacing: 0.5px;">👑 TÄISKOMPLEKT: NUGA + PÜSTOL</div>`
                : '';

            card.innerHTML = `
                <div class="crate-art-box" style="width: 100px; height: 80px; margin: 0 auto 6px auto; display: flex; align-items: center; justify-content: center;">
                    ${getCrateArtworkSvg(tier)}
                </div>
                ${setBadgeHtml}
                <h3 style="margin: 2px 0 6px 0; font-size: 1.05rem; color: ${crate.color};">${crate.name}</h3>
                <div class="crate-stock-badge ${isOutOfStock ? 'out-of-stock' : ''}" id="stock-badge-${tier}">
                    📦 Laos: <b id="stock-val-${tier}">${stockData.stock}</b> tk
                </div>
                <div class="crate-restock-timer" id="restock-timer-${tier}">
                    ⏱️ Uus laovaru: <b id="restock-val-${tier}">${mm}:${ss}</b>
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
                        alert('Kaste saab osta ainult ooteruumis (lobis) enne mängu algust!');
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
        const stocks = this.ctx.crateManager.getStocks();
        const money = this.ctx.crateManager.getMoney();
        const now = Date.now();
        const isLobby = this.ctx.getState() === 'lobby';

        const btnCrateShop = document.getElementById('btn-crate-shop');
        if (btnCrateShop) {
            if (!isLobby) {
                btnCrateShop.classList.add('in-game-disabled');
                btnCrateShop.title = 'Kastide ostmine on avatud ainult lobis!';
            } else {
                btnCrateShop.classList.remove('in-game-disabled');
                btnCrateShop.title = 'Ava kastide pood ja varustus';
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
                    btnBuy.textContent = 'AINULT LOBIS 🔒';
                } else if (isOutOfStock) {
                    btnBuy.textContent = 'LÄBI MÜÜDUD';
                } else {
                    btnBuy.textContent = `OSTA ${crate.price} €`;
                }
            }
        });
    }

    public renderInventory() {
        const inv = this.ctx.crateManager.getInventory();

        // 1. Owned Crates
        const cratesGrid = document.getElementById('inventory-crates-grid');
        if (cratesGrid) {
            cratesGrid.innerHTML = '';
            const ownedTiers = (Object.keys(inv.crates) as CrateTier[]).filter(t => (inv.crates[t] || 0) > 0);
            if (ownedTiers.length === 0) {
                cratesGrid.innerHTML = '<div style="color: #888; font-size: 0.9rem; grid-column: 1 / -1;">Sul ei ole avamata kaste. Osta poest või võida voorus!</div>';
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
                        <div style="font-size: 0.85rem; color: #ffd32a; margin: 4px 0 10px 0;">Omad: <b id="owned-count-${tier}">${count}</b> tk</div>
                        <button class="btn-play-again" id="btn-open-${tier}" style="padding: 6px 16px; font-size: 0.85rem; margin: 0; background: linear-gradient(135deg, ${crate.color}, #555);">
                            AVA KAST 🎁
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
                const card = document.createElement('div');
                card.className = `inventory-item-card ${isEquipped ? 'equipped' : ''}`;
                card.style.borderColor = skin.tierColor;
                card.innerHTML = `
                    <div class="weapon-art-box" style="width: 80px; height: 65px; margin: 0 auto 4px auto; display: flex; align-items: center; justify-content: center;">
                        ${getWeaponArtworkSvg(skin)}
                    </div>
                    <strong style="color: ${skin.tierColor}; font-size: 0.92rem;">${skin.name}</strong>
                    <div style="font-size: 0.75rem; color: #aaa; margin: 2px 0 10px 0;">${skin.tierName}</div>
                    <button class="btn-hud-action" id="btn-equip-${skinId}" style="width: 100%; justify-content: center; font-size: 0.8rem; background: ${isEquipped ? 'rgba(46, 204, 113, 0.25)' : 'rgba(255, 255, 255, 0.1)'}; border-color: ${isEquipped ? '#2ecc71' : '#666'};">
                        ${isEquipped ? 'VARUSTATUD ✅' : 'VARUSTA ⚔️'}
                    </button>
                `;
                const btnEquip = card.querySelector(`#btn-equip-${skinId}`) as HTMLButtonElement;
                if (btnEquip && !isEquipped) {
                    btnEquip.onclick = () => this.ctx.equipSkin(skinId);
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
                const card = document.createElement('div');
                card.className = `inventory-item-card ${isEquipped ? 'equipped' : ''}`;
                card.style.borderColor = skin.tierColor;
                card.innerHTML = `
                    <div class="weapon-art-box" style="width: 80px; height: 65px; margin: 0 auto 4px auto; display: flex; align-items: center; justify-content: center;">
                        ${getWeaponArtworkSvg(skin)}
                    </div>
                    <strong style="color: ${skin.tierColor}; font-size: 0.92rem;">${skin.name}</strong>
                    <div style="font-size: 0.75rem; color: #aaa; margin: 2px 0 10px 0;">${skin.tierName}</div>
                    <button class="btn-hud-action" id="btn-equip-${skinId}" style="width: 100%; justify-content: center; font-size: 0.8rem; background: ${isEquipped ? 'rgba(46, 204, 113, 0.25)' : 'rgba(255, 255, 255, 0.1)'}; border-color: ${isEquipped ? '#2ecc71' : '#666'};">
                        ${isEquipped ? 'VARUSTATUD ✅' : 'VARUSTA ⚔️'}
                    </button>
                `;
                const btnEquip = card.querySelector(`#btn-equip-${skinId}`) as HTMLButtonElement;
                if (btnEquip && !isEquipped) {
                    btnEquip.onclick = () => this.ctx.equipSkin(skinId);
                }
                gunsGrid.appendChild(card);
            });
        }
    }

    public triggerUnbox(tier: CrateTier): (WeaponSkinDef & { isDuplicate?: boolean; refundAmount?: number }) | null {
        if (!this.unboxingModal) return null;

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

        if (titleEl) titleEl.textContent = `${crate.name.toUpperCase()} AVAMINE...`;
        if (subtitleEl) subtitleEl.textContent = 'Rulett pöörleb — vaata, kuhu fookusjoon seisma jääb!';
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
            const WINNER_INDEX = 32;

            for (let i = 0; i < 40; i++) {
                const skin = (i === WINNER_INDEX) ? wonSkin : allSkins[Math.floor(Math.random() * allSkins.length)];
                const card = document.createElement('div');
                card.className = 'roulette-item-card';
                card.id = `roulette-card-${i}`;
                card.style.setProperty('--card-color', skin.tierColor);
                card.style.borderColor = skin.tierColor;
                card.innerHTML = `
                    <div class="roulette-item-svg">
                        ${getWeaponArtworkSvg(skin)}
                    </div>
                    <div class="roulette-item-name" style="color: ${skin.tierColor};">${skin.name}</div>
                    <div class="roulette-item-tier" style="background: ${skin.tierColor}; color: #111;">${skin.tierName}</div>
                `;
                trackEl.appendChild(card);
            }

            // Center of card 32 = 10 (padding) + 32 * 152 + 70 (half of 140) = 4944px
            const viewportWidth = viewportEl?.clientWidth || 780;
            const cardCenterPos = 10 + WINNER_INDEX * 152 + 70;
            const jitter = (Math.random() - 0.5) * 40;
            const targetX = -(cardCenterPos - viewportWidth / 2 + jitter);

            // Trigger animation after next browser frame
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    trackEl.style.transition = 'transform 5.2s cubic-bezier(0.12, 0.85, 0.14, 1)';
                    trackEl.style.transform = `translateX(${targetX}px)`;

                    // Audio ticks synchronized with visual deceleration
                    let lastCardIndex = -1;
                    const startTime = performance.now();
                    const duration = 5200;

                    const tickLoop = (now: number) => {
                        const elapsed = now - startTime;
                        if (elapsed < duration) {
                            try {
                                const computed = window.getComputedStyle(trackEl);
                                const matrix = new DOMMatrixReadOnly(computed.transform);
                                const currentX = matrix.m41;
                                const centerPos = (viewportWidth / 2) - currentX;
                                const currentCardIndex = Math.floor((centerPos - 10) / 152);
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
                    if (titleEl) titleEl.textContent = '🎉 PALJU ÕNNE! SAID TÄISKOMPLEKTI! 🎁';
                    if (subtitleEl) subtitleEl.textContent = `${crate.name}: Saadud nii nuga kui ka revolver!`;
                } else if (wonSkin.isDuplicate) {
                    if (titleEl) titleEl.textContent = 'DUPLIKAAT! SAID POOLE RAHAST TAGASI! 💰';
                    if (subtitleEl) subtitleEl.textContent = `Sul on see relv juba olemas! Tagastati pool kasti hinnast: +${wonSkin.refundAmount} €!`;
                } else {
                    if (titleEl) titleEl.textContent = 'PALJU ÕNNE! SAID UUE RELVA!';
                    if (subtitleEl) subtitleEl.textContent = `${crate.name} avatud!`;
                }

                const typeEl = document.getElementById('unboxing-item-type');
                if (typeEl) {
                    if (isSet) {
                        typeEl.textContent = `👑 TÄISKOMPLEKT (NUGA + PÜSTOL)`;
                        typeEl.style.color = '#ffd700';
                    } else if (wonSkin.isDuplicate) {
                        typeEl.textContent = `♻️ DUPLIKAAT (+${wonSkin.refundAmount} €)`;
                        typeEl.style.color = '#ffd32a';
                    } else {
                        typeEl.textContent = wonSkin.type === 'knife' ? '🔪 UUS NOANAHK' : '🔫 UUS REVOLVRINAHK';
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
                        rarityEl.textContent = 'TÄISKOMPLEKT (SET BUNDLE)';
                    } else {
                        rarityEl.textContent = wonSkin.isDuplicate 
                            ? `${wonSkin.tierName.toUpperCase()} (DUPLIKAAT: +${wonSkin.refundAmount} €)`
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
                    btnEquip.textContent = isSet ? 'VARUSTA KOMPLEKT 👑' : 'VARUSTA KOHE ⚔️';
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
