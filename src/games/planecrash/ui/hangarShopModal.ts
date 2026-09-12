import { AircraftConfig } from '../types';
import { AIRCRAFT_CATALOG, getAircraftById } from '../catalog';
import { planeCrashState } from '../state/planeCrashState';
import { planeAudio } from '../audio';

export class HangarShopModal {
    private modalEl: HTMLElement | null;
    private listContainer: HTMLElement | null;
    private btnClose: HTMLElement | null;
    private btnLaunchOrBuy: HTMLElement | null;
    private coinBalanceEl: HTMLElement | null;

    private previewNameEl: HTMLElement | null;
    private previewClassEl: HTMLElement | null;
    private previewDescEl: HTMLElement | null;
    private previewPlaceholderEl: HTMLElement | null;

    private statSpeedVal: HTMLElement | null;
    private statSpeedBar: HTMLElement | null;
    private statAgilityVal: HTMLElement | null;
    private statAgilityBar: HTMLElement | null;
    private statExplosionVal: HTMLElement | null;
    private statExplosionBar: HTMLElement | null;
    private statMultVal: HTMLElement | null;
    private statMultBar: HTMLElement | null;

    private currentViewingPlane: AircraftConfig;

    public onLaunchFlight?: (plane: AircraftConfig) => void;

    constructor() {
        this.modalEl = document.getElementById('hangar-modal');
        this.listContainer = document.getElementById('hangar-aircraft-list');
        this.btnClose = document.getElementById('btn-close-hangar');
        this.btnLaunchOrBuy = document.getElementById('btn-launch-or-buy');
        this.coinBalanceEl = document.getElementById('hangar-coin-balance');

        this.previewNameEl = document.getElementById('preview-plane-name');
        this.previewClassEl = document.getElementById('preview-plane-class');
        this.previewDescEl = document.getElementById('preview-plane-desc');
        this.previewPlaceholderEl = document.getElementById('preview-placeholder-text');

        this.statSpeedVal = document.getElementById('stat-val-speed');
        this.statSpeedBar = document.getElementById('stat-bar-speed');
        this.statAgilityVal = document.getElementById('stat-val-agility');
        this.statAgilityBar = document.getElementById('stat-bar-agility');
        this.statExplosionVal = document.getElementById('stat-val-explosion');
        this.statExplosionBar = document.getElementById('stat-bar-explosion');
        this.statMultVal = document.getElementById('stat-val-multiplier');
        this.statMultBar = document.getElementById('stat-bar-multiplier');

        const selectedId = planeCrashState.getSelectedPlaneId();
        this.currentViewingPlane = getAircraftById(selectedId);

        this.initEvents();
    }

    private initEvents(): void {
        if (this.btnClose) {
            this.btnClose.addEventListener('click', () => {
                planeAudio.playButtonClick();
                this.hide();
            });
        }

        if (this.btnLaunchOrBuy) {
            this.btnLaunchOrBuy.addEventListener('click', () => {
                this.handleLaunchOrBuy();
            });
        }
    }

    public show(defaultPlaneId?: string): void {
        if (defaultPlaneId) {
            this.currentViewingPlane = getAircraftById(defaultPlaneId);
        } else {
            this.currentViewingPlane = getAircraftById(planeCrashState.getSelectedPlaneId());
        }

        this.renderList();
        this.renderPreview();
        this.updateCoinDisplay();

        if (this.modalEl) {
            this.modalEl.classList.add('active');
        }
    }

    public hide(): void {
        if (this.modalEl) {
            this.modalEl.classList.remove('active');
        }
    }

    public updateCoinDisplay(): void {
        const coins = planeCrashState.getCoins();
        if (this.coinBalanceEl) {
            this.coinBalanceEl.textContent = coins.toLocaleString();
        }
    }

    private renderList(): void {
        if (!this.listContainer) return;
        this.listContainer.innerHTML = '';

        AIRCRAFT_CATALOG.forEach((plane) => {
            const isUnlocked = planeCrashState.isPlaneUnlocked(plane.id);
            const isSelected = planeCrashState.getSelectedPlaneId() === plane.id;
            const isViewing = this.currentViewingPlane.id === plane.id;

            const item = document.createElement('div');
            item.className = `plane-list-item ${isViewing ? 'active' : ''}`;
            item.setAttribute('data-plane-id', plane.id);

            let statusText = '';
            let statusColor = '#ffd32a';

            if (isSelected) {
                statusText = '✓ VALITUD';
                statusColor = '#2ed573';
            } else if (isUnlocked) {
                statusText = 'OMATUD';
                statusColor = '#1e90ff';
            } else {
                statusText = `🔒 ${plane.price.toLocaleString()} 🪙`;
                statusColor = '#ffd32a';
            }

            item.innerHTML = `
                <div class="plane-item-icon">${plane.icon}</div>
                <div class="plane-item-info">
                    <div class="plane-item-name">${plane.name}</div>
                    <div class="plane-item-status" style="color: ${statusColor};">${statusText}</div>
                </div>
            `;

            item.addEventListener('click', () => {
                planeAudio.playButtonClick();
                this.currentViewingPlane = plane;
                this.renderList();
                this.renderPreview();
            });

            this.listContainer?.appendChild(item);
        });
    }

    private renderPreview(): void {
        const plane = this.currentViewingPlane;
        const isUnlocked = planeCrashState.isPlaneUnlocked(plane.id);
        const playerCoins = planeCrashState.getCoins();

        if (this.previewNameEl) this.previewNameEl.textContent = plane.name;
        if (this.previewClassEl) this.previewClassEl.textContent = plane.category;
        if (this.previewDescEl) this.previewDescEl.textContent = plane.description;
        if (this.previewPlaceholderEl) this.previewPlaceholderEl.textContent = plane.icon;

        // Stats bars
        if (this.statSpeedVal) this.statSpeedVal.textContent = `${plane.topSpeedKmh} km/h`;
        if (this.statSpeedBar) this.statSpeedBar.style.width = `${Math.min(100, (plane.topSpeedKmh / 950) * 100)}%`;

        if (this.statAgilityVal) this.statAgilityVal.textContent = `${plane.rollRate.toFixed(1)}x`;
        if (this.statAgilityBar) this.statAgilityBar.style.width = `${Math.min(100, (plane.rollRate / 4.0) * 100)}%`;

        if (this.statExplosionVal) this.statExplosionVal.textContent = `${plane.explosionScale.toFixed(1)}x`;
        if (this.statExplosionBar) this.statExplosionBar.style.width = `${Math.min(100, (plane.explosionScale / 4.0) * 100)}%`;

        if (this.statMultVal) this.statMultVal.textContent = `${plane.coinMultiplier.toFixed(1)}x`;
        if (this.statMultBar) this.statMultBar.style.width = `${Math.min(100, (plane.coinMultiplier / 5.0) * 100)}%`;

        // Action button state
        if (this.btnLaunchOrBuy) {
            if (isUnlocked) {
                this.btnLaunchOrBuy.innerHTML = `<span>🚀 LANSEERI LEND (${plane.name})</span>`;
                this.btnLaunchOrBuy.style.background = 'linear-gradient(135deg, #ff781e, #ff4757)';
                this.btnLaunchOrBuy.style.opacity = '1.0';
                this.btnLaunchOrBuy.removeAttribute('disabled');
            } else {
                if (playerCoins >= plane.price) {
                    this.btnLaunchOrBuy.innerHTML = `<span>🛒 OSTA LENNUKEID (${plane.price.toLocaleString()} 🪙)</span>`;
                    this.btnLaunchOrBuy.style.background = 'linear-gradient(135deg, #2ed573, #10ac84)';
                    this.btnLaunchOrBuy.style.opacity = '1.0';
                    this.btnLaunchOrBuy.removeAttribute('disabled');
                } else {
                    const diff = plane.price - playerCoins;
                    this.btnLaunchOrBuy.innerHTML = `<span>🔒 VAJA VEEL ${diff.toLocaleString()} COINI</span>`;
                    this.btnLaunchOrBuy.style.background = '#485460';
                    this.btnLaunchOrBuy.style.opacity = '0.7';
                    this.btnLaunchOrBuy.setAttribute('disabled', 'true');
                }
            }
        }
    }

    private handleLaunchOrBuy(): void {
        const plane = this.currentViewingPlane;
        const isUnlocked = planeCrashState.isPlaneUnlocked(plane.id);

        if (isUnlocked) {
            planeCrashState.setSelectedPlaneId(plane.id);
            planeAudio.playButtonClick();
            this.hide();
            if (this.onLaunchFlight) {
                this.onLaunchFlight(plane);
            }
        } else {
            // Purchase plane
            const result = planeCrashState.buyPlane(plane.id);
            if (result.success) {
                planeAudio.playCoinChime(1.2);
                this.updateCoinDisplay();
                this.renderList();
                this.renderPreview();
            } else {
                alert(result.message);
            }
        }
    }
}
