import { DEFENDER_SHOP_ITEMS } from '../catalog';
import { DefenderShopItem } from '../types';
import { DefenderState } from '../state/defenderState';
import { yardService } from '../../../shared/yardService';
import { showYardPurchaseConfirm } from '../../../shared/yardPurchaseModal';

export class DefenderShopUI {
    private modalEl: HTMLElement | null = null;
    private state: DefenderState;
    private onUpgradePurchased?: (item: DefenderShopItem) => void;

    constructor(state: DefenderState, onUpgradePurchased?: (item: DefenderShopItem) => void) {
        this.state = state;
        this.onUpgradePurchased = onUpgradePurchased;
        this.initModal();
    }

    private initModal() {
        this.modalEl = document.getElementById('defender-shop-modal');
        if (!this.modalEl) {
            this.modalEl = document.createElement('div');
            this.modalEl.id = 'defender-shop-modal';
            this.modalEl.className = 'modal-overlay';
            document.body.appendChild(this.modalEl);
        }

        const closeBtn = this.modalEl.querySelector('#btn-close-shop');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
    }

    public open() {
        if (!this.modalEl) return;
        this.render();
        this.modalEl.style.display = 'flex';
    }

    public close() {
        if (this.modalEl) {
            this.modalEl.style.display = 'none';
        }
    }

    public isOpen(): boolean {
        return this.modalEl ? this.modalEl.style.display === 'flex' : false;
    }

    public render() {
        if (!this.modalEl) return;

        const currentYards = yardService.getYards();
        const hasInfinite = yardService.hasInfiniteYards();
        const balanceText = hasInfinite ? 'Lõpmatu 👑' : `${currentYards.toLocaleString()} pbx`;

        this.modalEl.innerHTML = `
            <div class="modal-card shop-modal-card" style="max-width: 680px; width: 95%; max-height: 88vh; display: flex; flex-direction: column; padding: 24px; text-align: left; border: 2px solid #00f2fe; box-shadow: 0 0 50px rgba(0, 242, 254, 0.45); background: linear-gradient(155deg, #0c1524, #060b13);">
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 1px solid rgba(0, 242, 254, 0.25); padding-bottom: 14px;">
                    <div>
                        <div class="modal-badge" style="margin-bottom: 6px;">🛍️ PLANEEDI KAITSE ARSENAL</div>
                        <h2 style="font-size: 1.6rem; margin: 0; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                            Defender Pbx Pood
                        </h2>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="background: rgba(0, 242, 254, 0.12); border: 1.5px solid #00f2fe; padding: 6px 14px; border-radius: 12px; font-weight: 900; font-size: 0.9rem; color: #ffd700; display: flex; align-items: center; gap: 6px;">
                            <span>💎</span>
                            <span id="shop-balance-val">${balanceText}</span>
                        </div>
                        <button id="btn-close-shop" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: #ffffff; border-radius: 10px; width: 36px; height: 36px; cursor: pointer; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">✕</button>
                    </div>
                </div>

                <!-- Items List -->
                <div style="overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 12px; padding-right: 4px;">
                    ${DEFENDER_SHOP_ITEMS.map((item) => {
                        const isOwned = this.state.isUpgradeOwned(item.id);
                        return `
                            <div class="shop-item-card ${isOwned ? 'is-owned' : ''}" style="background: ${isOwned ? 'rgba(46, 213, 115, 0.08)' : 'rgba(255, 255, 255, 0.04)'}; border: 1.5px solid ${isOwned ? 'rgba(46, 213, 115, 0.4)' : 'rgba(0, 242, 254, 0.2)'}; border-radius: 14px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 14px; transition: all 0.25s;">
                                <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
                                    <div style="font-size: 2.2rem; width: 54px; height: 54px; border-radius: 12px; background: rgba(0, 242, 254, 0.1); border: 1px solid rgba(0, 242, 254, 0.3); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                        ${item.icon}
                                    </div>
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                            <span style="font-weight: 900; font-size: 1.05rem; color: #ffffff;">${item.name}</span>
                                            ${item.badge ? `<span style="font-size: 0.68rem; font-weight: 900; padding: 2px 7px; border-radius: 6px; background: rgba(0, 242, 254, 0.15); border: 1px solid #00f2fe; color: #00f2fe;">${item.badge}</span>` : ''}
                                        </div>
                                        <div style="font-size: 0.8rem; color: #a4b0be; line-height: 1.35;">
                                            ${item.description}
                                        </div>
                                    </div>
                                </div>

                                <div style="flex-shrink: 0; text-align: right;">
                                    ${isOwned ? `
                                        <div style="background: rgba(46, 213, 115, 0.2); border: 1.5px solid #2ed573; color: #2ed573; font-weight: 900; font-size: 0.85rem; padding: 8px 16px; border-radius: 10px; display: flex; align-items: center; gap: 6px;">
                                            ✓ OMATUD
                                        </div>
                                    ` : `
                                        <button class="btn-buy-pbx" data-buy-item-id="${item.id}" style="background: linear-gradient(135deg, #00f2fe, #0072ff); border: none; color: #050813; font-weight: 900; font-size: 0.88rem; padding: 9px 18px; border-radius: 10px; cursor: pointer; box-shadow: 0 0 15px rgba(0, 242, 254, 0.35); transition: all 0.2s; white-space: nowrap;">
                                            🛍️ Osta (${item.price.toLocaleString()} pbx)
                                        </button>
                                    `}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- Footer hint -->
                <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 0.76rem; color: #8899a6; text-align: center;">
                    💡 Ostetud uuendused jäävad püsivalt aktiivseks kõigil tulevastel 2D Earth Defender missioonidel!
                </div>
            </div>
        `;

        // Wire close button
        const closeBtn = this.modalEl.querySelector('#btn-close-shop');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Wire buy buttons
        const buyBtns = this.modalEl.querySelectorAll('[data-buy-item-id]');
        buyBtns.forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                const target = e.currentTarget as HTMLElement;
                const itemId = target.getAttribute('data-buy-item-id');
                if (itemId) {
                    await this.handleBuy(itemId);
                }
            });
        });
    }

    private async handleBuy(itemId: string) {
        const item = DEFENDER_SHOP_ITEMS.find((it) => it.id === itemId);
        if (!item) return;

        const currentYards = yardService.getYards();
        const hasInfinite = yardService.hasInfiniteYards();

        if (!hasInfinite && currentYards < item.price) {
            alert(`Sul pole piisavalt Playbuxi! Vajad ${item.price.toLocaleString()} pbx (praegu ${currentYards.toLocaleString()} pbx).`);
            return;
        }

        const confirmed = await showYardPurchaseConfirm({
            title: `🛡️ Osta ${item.name}`,
            itemName: item.name,
            yardCost: item.price,
            description: item.description,
            onConfirm: () => {
                const success = yardService.spendYards(item.price, item.id, `Defender Shop: ${item.name}`);
                if (success || hasInfinite) {
                    this.state.unlockUpgrade(item.id);
                    if (this.onUpgradePurchased) this.onUpgradePurchased(item);
                }
            }
        });

        if (confirmed) {
            this.render();
        }
    }
}
