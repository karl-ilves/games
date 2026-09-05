import { avatarService } from '../shared/avatar/AvatarService';
import { AvatarViewer } from '../shared/avatar/AvatarViewer';
import { getCurrentUserProfile } from '../auth';
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
            <div id="playard-avatar-widget-box" class="avatar-widget-card" title="Klõpsa siia, et avada 3D Avatar Shop & Editor!">
                <div class="avatar-canvas-wrapper" id="avatar-mini-canvas-slot"></div>
                <div class="avatar-info-panel">
                    <div class="avatar-user-row">
                        <span class="avatar-username" id="widget-avatar-username">@Player</span>
                        <span class="avatar-badge-tag" id="widget-avatar-role">Lv.1</span>
                    </div>
                    <div class="avatar-stats-row">
                        <span class="avatar-yard-pill">
                            <span id="widget-yard-icon"></span>
                            <strong id="widget-yard-val">0</strong> YARDS
                        </span>
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

        if (userEl) {
            userEl.textContent = prof ? (prof.displayName || `@${prof.username}`) : 'Guest Player';
        }
        if (roleEl) {
            roleEl.textContent = prof?.isAdmin ? '⭐ OWNER' : '⭐ Lv.1';
        }
        if (yardVal) {
            yardVal.textContent = yardService.getYards().toLocaleString();
        }
    }
}
