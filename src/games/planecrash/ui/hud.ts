import { FlightState } from '../types';
import { planeCrashState } from '../state/planeCrashState';
import { planeAudio } from '../audio';

export class FlightHUD {
    private speedEl: HTMLElement | null;
    private altEl: HTMLElement | null;
    private throttleEl: HTMLElement | null;
    private spinsEl: HTMLElement | null;
    private coinBalanceEl: HTMLElement | null;
    private cameraModeEl: HTMLElement | null;
    private toastContainer: HTMLElement | null;

    public onOpenHangar?: () => void;
    public onToggleCamera?: () => void;
    public onQuickRespawn?: () => void;
    public onResetMap?: () => void;

    constructor() {
        this.speedEl = document.getElementById('gauge-speed');
        this.altEl = document.getElementById('gauge-alt');
        this.throttleEl = document.getElementById('gauge-throttle');
        this.spinsEl = document.getElementById('gauge-spins');
        this.coinBalanceEl = document.getElementById('hud-coin-balance');
        this.cameraModeEl = document.getElementById('camera-mode-text');
        this.toastContainer = document.getElementById('trick-toast-container');

        this.initButtons();
        this.updateCoins();
    }

    private initButtons(): void {
        const btnHangar = document.getElementById('btn-open-hangar');
        if (btnHangar) {
            btnHangar.addEventListener('click', () => {
                planeAudio.playButtonClick();
                if (this.onOpenHangar) this.onOpenHangar();
            });
        }

        const btnCamera = document.getElementById('btn-toggle-camera');
        if (btnCamera) {
            btnCamera.addEventListener('click', () => {
                planeAudio.playButtonClick();
                if (this.onToggleCamera) this.onToggleCamera();
            });
        }

        const btnResetMap = document.getElementById('btn-reset-map');
        if (btnResetMap) {
            btnResetMap.addEventListener('click', () => {
                planeAudio.playButtonClick();
                if (this.onResetMap) this.onResetMap();
            });
        }

        const btnRespawn = document.getElementById('btn-quick-respawn');
        if (btnRespawn) {
            btnRespawn.addEventListener('click', () => {
                planeAudio.playButtonClick();
                if (this.onQuickRespawn) this.onQuickRespawn();
            });
        }
    }

    public updateTelemetry(flightState: FlightState): void {
        if (this.speedEl) {
            this.speedEl.textContent = Math.round(flightState.speedKmh).toString();
        }
        if (this.altEl) {
            this.altEl.textContent = Math.max(0, Math.round(flightState.altitude)).toString();
        }
        if (this.throttleEl) {
            this.throttleEl.textContent = Math.round(flightState.throttle * 100).toString();
        }
        if (this.spinsEl) {
            this.spinsEl.textContent = flightState.spin360Count.toString();
        }
    }

    public updateCoins(): void {
        const coins = planeCrashState.getCoins();
        if (this.coinBalanceEl) {
            this.coinBalanceEl.textContent = coins.toLocaleString();
        }
    }

    public setCameraModeText(mode: string): void {
        if (this.cameraModeEl) {
            this.cameraModeEl.textContent = mode.toUpperCase();
        }
    }

    public showStuntToast(message: string): void {
        if (!this.toastContainer) return;
        const toast = document.createElement('div');
        toast.className = 'trick-toast';
        toast.textContent = message;
        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 2200);
    }
}
