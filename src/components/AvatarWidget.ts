import { avatarService } from '../shared/avatar/AvatarService';
import { AvatarViewer } from '../shared/avatar/AvatarViewer';
import { getCurrentUserProfile, isPlayardOwner, isOwnerUser, formatOwnerNametag } from '../auth';
import { yardService } from '../shared/yardService';

export class AvatarWidget {
    private container: HTMLElement;
    private viewer: AvatarViewer | null = null;
    private onClickOpenShop: () => void;

    constructor(containerId: string, onClickOpenShop: () => void) {
        const el = document.getElementById(containerId);
        if (!el) {
            throw new Error(`AvatarWidget container #${containerId} not found`);
        }
        this.container = el;
        this.onClickOpenShop = onClickOpenShop;
        this.render();
    }

    private render() {
        this.container.innerHTML = `
            <div id="playard-avatar-widget-box" class="avatar-widget-card" title="Click here to open the 3D Avatar Shop & Editor!">
                <div class="avatar-canvas-wrapper" id="avatar-mini-canvas-slot"></div>
                <div class="avatar-info-panel">
                    <div class="avatar-user-row">
                        <span class="avatar-username" id="widget-avatar-username">@Player</span>
                        <span class="avatar-badge-tag" id="widget-avatar-role">Lv.1</span>
                    </div>
                    <div class="avatar-stats-row">
                        <span class="avatar-yard-pill">
                            <span id="widget-yard-icon"></span>
                            <strong id="widget-yard-val">0</strong> PLAYBUX
                        </span>
                        <button class="btn-open-avatar-shop" id="btn-widget-open-owner-panel" style="display: none; background: linear-gradient(135deg, #ff416c, #ff4b2b); border: 1px solid #ffd32a; color: #fff; font-weight: 800;">
                            👑 Owner Paneel
                        </button>
                        <button class="btn-open-avatar-shop" id="btn-widget-open-shop">
                            🛍️ Avatar Shop
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Yard Icon
        const iconSlot = this.container.querySelector('#widget-yard-icon');
        if (iconSlot) {
            iconSlot.innerHTML = yardService.renderYardSvg(14);
        }

        // Initialize 3D Viewer inside canvas slot
        const canvasSlot = this.container.querySelector('#avatar-mini-canvas-slot') as HTMLElement;
        if (canvasSlot) {
            this.viewer = new AvatarViewer(canvasSlot, avatarService.getConfig(), true);
        }

        this.updateProfileUI();

        // Subscribe to avatar changes
        avatarService.subscribe(config => {
            if (this.viewer) {
                this.viewer.updateConfig(config);
            }
        });

        // Subscribe to Yard wallet changes
        yardService.subscribe(data => {
            const yardVal = this.container.querySelector('#widget-yard-val');
            if (yardVal) {
                yardVal.textContent = data.yards.toLocaleString();
            }
        });

        // Owner panel button inside widget
        const ownerBtn = this.container.querySelector('#btn-widget-open-owner-panel') as HTMLButtonElement | null;
        if (ownerBtn) {
            ownerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const mainOwnerBtn = document.getElementById('btn-open-owner-panel');
                if (mainOwnerBtn) {
                    mainOwnerBtn.click();
                } else {
                    const modalOwner = document.getElementById('modal-owner-panel');
                    if (modalOwner) modalOwner.style.display = 'flex';
                }
            });
        }

        // Click on widget opens shop
        const widgetBox = this.container.querySelector('#playard-avatar-widget-box');
        if (widgetBox) {
            widgetBox.addEventListener('click', (e) => {
                this.onClickOpenShop();
            });
        }
    }

    public updateProfileUI() {
        const prof = getCurrentUserProfile();
        const userEl = this.container.querySelector('#widget-avatar-username');
        const roleEl = this.container.querySelector('#widget-avatar-role');
        const yardVal = this.container.querySelector('#widget-yard-val');
        const ownerBtn = this.container.querySelector('#btn-widget-open-owner-panel') as HTMLElement | null;
        const isOwner = isPlayardOwner(prof?.email) || isOwnerUser(prof) || (!!prof?.isAdmin && (prof?.email || '').trim().toLowerCase() !== 'grx@trenet.ee');

        if (userEl) {
            const rawName = prof ? (prof.displayName || `@${prof.username}`) : 'Guest Player';
            userEl.textContent = isOwner ? formatOwnerNametag(rawName, true) : rawName;
        }
        if (roleEl) {
            roleEl.textContent = isOwner ? '👑 PLAYARD OWNER ✔' : (prof?.isAdmin ? '⭐ ADMIN' : '⭐ Lv.1');
        }
        if (yardVal) {
            yardVal.textContent = yardService.getYards().toLocaleString();
        }
        if (ownerBtn) {
            ownerBtn.style.display = isOwner ? 'inline-flex' : 'none';
        }
    }
}
