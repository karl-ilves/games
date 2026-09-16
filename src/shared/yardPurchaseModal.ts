import { yardService } from './yardService';

export interface YardPurchaseConfirmOptions {
    title?: string;
    itemName?: string;
    yardCost: number;
    description?: string;
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
}

export class YardPurchaseModal {
    private static instance: YardPurchaseModal | null = null;
    private overlayEl: HTMLElement | null = null;
    private timerInterval: any = null;

    public static getInstance(): YardPurchaseModal {
        if (!YardPurchaseModal.instance) {
            YardPurchaseModal.instance = new YardPurchaseModal();
        }
        return YardPurchaseModal.instance;
    }

    public show(options: YardPurchaseConfirmOptions): Promise<boolean> {
        return new Promise((resolve) => {
            this.cleanup();

            const currentYards = yardService.getYards();
            const hasInfinite = yardService.hasInfiniteYards();
            const hasEnough = hasInfinite || currentYards >= options.yardCost;

            if ((window as any).__AUTO_CONFIRM_YARD_PURCHASE__) {
                if (!hasEnough) {
                    resolve(false);
                    return;
                }
                Promise.resolve(options.onConfirm()).then(() => resolve(true));
                return;
            }

            const overlay = document.createElement('div');
            overlay.id = 'yard-purchase-modal-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(4, 7, 14, 0.88);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease;
                font-family: system-ui, -apple-system, sans-serif;
            `;

            overlay.innerHTML = `
                <div class="yard-purchase-card" style="
                    background: linear-gradient(155deg, #162032, #0b111b);
                    border: 2px solid #ffd32a;
                    border-radius: 24px;
                    padding: 30px 34px;
                    max-width: 440px;
                    width: 90%;
                    box-shadow: 0 0 50px rgba(255, 211, 42, 0.35);
                    text-align: center;
                    color: #fff;
                    position: relative;
                ">
                    <div style="font-size: 3.2rem; margin-bottom: 6px; line-height: 1;">💎</div>
                    <h2 id="yard-purchase-title" style="margin: 0 0 8px 0; font-size: 1.85rem; font-weight: 900; color: #ffd32a; letter-spacing: 0.5px;">
                        ${options.title || 'Are you sure?'}
                    </h2>
                    
                    ${options.itemName ? `
                        <div id="yard-purchase-item-name" style="font-size: 1.15rem; font-weight: 800; color: #00f2fe; margin-bottom: 6px;">
                            ${options.itemName}
                        </div>
                    ` : ''}

                    <div id="yard-purchase-cost" style="font-size: 1.25rem; font-weight: 900; color: #ffd32a; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <span>${yardService.renderYardSvg(24)}</span>
                        <span>Price: ${options.yardCost.toLocaleString()} Yards</span>
                    </div>

                    <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 10px 16px; margin-bottom: 18px; font-size: 0.92rem; color: #a4b0be; display: flex; justify-content: space-between; align-items: center;">
                        <span>Your Balance:</span>
                        <strong style="color: ${hasEnough ? '#2ecc71' : '#ff4757'}; font-size: 1rem;">${currentYards.toLocaleString()} Yards</strong>
                    </div>

                    ${!hasEnough ? `
                        <div id="yard-purchase-error" style="background: rgba(255, 46, 99, 0.2); border: 1px solid #ff2e63; border-radius: 12px; padding: 12px 16px; color: #ff6b81; font-weight: 800; font-size: 0.95rem; margin-bottom: 20px;">
                            ⚠️ Not enough Yards!
                        </div>
                    ` : ''}

                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button id="btn-yard-purchase-cancel" style="
                            flex: 1;
                            padding: 12px 18px;
                            border-radius: 14px;
                            background: rgba(255, 255, 255, 0.1);
                            border: 1px solid rgba(255, 255, 255, 0.2);
                            color: #fff;
                            font-weight: 800;
                            font-size: 1rem;
                            cursor: pointer;
                            transition: background 0.15s;
                        ">
                            Cancel
                        </button>
                        <button id="btn-yard-purchase-confirm" ${!hasEnough ? 'disabled' : 'disabled'} style="
                            flex: 1.3;
                            padding: 12px 18px;
                            border-radius: 14px;
                            background: ${hasEnough ? 'linear-gradient(135deg, #2ecc71, #27ae60)' : '#555'};
                            border: none;
                            color: #111;
                            font-weight: 900;
                            font-size: 1.05rem;
                            cursor: ${hasEnough ? 'pointer' : 'not-allowed'};
                            box-shadow: ${hasEnough ? '0 0 20px rgba(46, 204, 113, 0.4)' : 'none'};
                            opacity: ${hasEnough ? '0.6' : '0.4'};
                            transition: all 0.2s;
                        ">
                            ${!hasEnough ? 'Not enough Yards' : 'Buy (5)'}
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            this.overlayEl = overlay;

            const btnCancel = overlay.querySelector('#btn-yard-purchase-cancel') as HTMLButtonElement;
            const btnConfirm = overlay.querySelector('#btn-yard-purchase-confirm') as HTMLButtonElement;

            const close = (confirmed: boolean) => {
                this.cleanup();
                if (confirmed) {
                    Promise.resolve(options.onConfirm()).then(() => resolve(true));
                } else {
                    options.onCancel?.();
                    resolve(false);
                }
            };

            if (btnCancel) {
                btnCancel.onclick = () => close(false);
            }

            if (!hasEnough) {
                return;
            }

            // 5-second countdown on Buy button: 5 -> 4 -> 3 -> 2 -> 1 -> Buy
            let secondsLeft = 5;
            const tickMs = (window as any).__YARD_COUNTDOWN_TICK_MS__ || 1000;

            this.timerInterval = setInterval(() => {
                secondsLeft--;
                if (secondsLeft > 0) {
                    if (btnConfirm) {
                        btnConfirm.textContent = `Buy (${secondsLeft})`;
                    }
                } else {
                    clearInterval(this.timerInterval);
                    this.timerInterval = null;
                    if (btnConfirm) {
                        btnConfirm.disabled = false;
                        btnConfirm.textContent = 'Buy';
                        btnConfirm.style.opacity = '1';
                        btnConfirm.style.cursor = 'pointer';
                        btnConfirm.style.boxShadow = '0 0 25px rgba(46, 204, 113, 0.8)';
                        btnConfirm.onclick = () => close(true);
                    }
                }
            }, tickMs);
        });
    }

    public cleanup() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        if (this.overlayEl && this.overlayEl.parentNode) {
            this.overlayEl.parentNode.removeChild(this.overlayEl);
            this.overlayEl = null;
        }
        const existing = document.getElementById('yard-purchase-modal-overlay');
        if (existing && existing.parentNode) {
            existing.parentNode.removeChild(existing);
        }
    }
}

export function showYardPurchaseConfirm(options: YardPurchaseConfirmOptions): Promise<boolean> {
    return YardPurchaseModal.getInstance().show(options);
}

if (typeof window !== 'undefined') {
    (window as any).showYardPurchaseConfirm = showYardPurchaseConfirm;
}
