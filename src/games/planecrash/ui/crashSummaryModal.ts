import { CrashBreakdown } from '../types';
import { planeAudio } from '../audio';

export class CrashSummaryModal {
    private modalEl: HTMLElement | null;
    private causeTextEl: HTMLElement | null;
    private baseValEl: HTMLElement | null;
    private spinsRowEl: HTMLElement | null;
    private spinsValEl: HTMLElement | null;
    private loopsRowEl: HTMLElement | null;
    private loopsValEl: HTMLElement | null;
    private speedValEl: HTMLElement | null;
    private altValEl: HTMLElement | null;
    private targetRowEl: HTMLElement | null;
    private targetValEl: HTMLElement | null;
    private totalValEl: HTMLElement | null;

    private btnRetry: HTMLElement | null;
    private btnHangar: HTMLElement | null;

    public onRetryClicked?: () => void;
    public onHangarClicked?: () => void;

    constructor() {
        this.modalEl = document.getElementById('crash-modal');
        this.causeTextEl = document.getElementById('crash-cause-text');
        this.baseValEl = document.getElementById('breakdown-base');
        this.spinsRowEl = document.getElementById('row-spins-bonus');
        this.spinsValEl = document.getElementById('breakdown-spins');
        this.loopsRowEl = document.getElementById('row-loops-bonus');
        this.loopsValEl = document.getElementById('breakdown-loops');
        this.speedValEl = document.getElementById('breakdown-speed');
        this.altValEl = document.getElementById('breakdown-altitude');
        this.targetRowEl = document.getElementById('row-target-bonus');
        this.targetValEl = document.getElementById('breakdown-target');
        this.totalValEl = document.getElementById('breakdown-total');

        this.btnRetry = document.getElementById('btn-crash-retry');
        this.btnHangar = document.getElementById('btn-crash-hangar');

        this.initButtons();
    }

    private initButtons(): void {
        if (this.btnRetry) {
            this.btnRetry.addEventListener('click', () => {
                planeAudio.playButtonClick();
                this.hide();
                if (this.onRetryClicked) this.onRetryClicked();
            });
        }

        if (this.btnHangar) {
            this.btnHangar.addEventListener('click', () => {
                planeAudio.playButtonClick();
                this.hide();
                if (this.onHangarClicked) this.onHangarClicked();
            });
        }
    }

    public show(report: CrashBreakdown): void {
        if (this.causeTextEl) {
            this.causeTextEl.textContent = report.targetDescription
                ? `Kokkupõrge: ${report.targetDescription} (${report.impactSpeedKmh} km/h)`
                : `Kokkupõrge suurel kiirusel (${report.impactSpeedKmh} km/h)`;
        }

        // Base 500 coins guaranteed
        if (this.baseValEl) {
            this.baseValEl.textContent = `+${report.baseCoins} 🪙`;
        }

        // 360 Spins
        if (this.spinsValEl && this.spinsRowEl) {
            this.spinsValEl.textContent = `+${report.spinsCoins} 🪙 (${report.spinsCount}x 360°)`;
            this.spinsRowEl.style.display = report.spinsCoins > 0 ? 'flex' : 'none';
        }

        // Loops
        if (this.loopsValEl && this.loopsRowEl) {
            this.loopsValEl.textContent = `+${report.loopsCoins} 🪙 (${report.loopsCount}x)`;
            this.loopsRowEl.style.display = report.loopsCoins > 0 ? 'flex' : 'none';
        }

        // Speed bonus
        if (this.speedValEl) {
            this.speedValEl.textContent = `+${report.speedCoins} 🪙 (${report.impactSpeedKmh} km/h)`;
        }

        // Altitude dive
        if (this.altValEl) {
            this.altValEl.textContent = `+${report.altitudeCoins} 🪙 (Tipp: ${report.maxAltitude} m)`;
        }

        // Target bonus
        if (this.targetValEl && this.targetRowEl) {
            this.targetValEl.textContent = `+${report.targetCoins} 🪙`;
            this.targetRowEl.style.display = report.targetCoins > 0 ? 'flex' : 'none';
        }

        // Total Coins with sound
        if (this.totalValEl) {
            this.totalValEl.textContent = `+${report.totalCoins.toLocaleString()} 🪙`;
        }

        setTimeout(() => {
            planeAudio.playCoinChime(1.0);
        }, 300);

        if (this.modalEl) {
            this.modalEl.classList.add('active');
        }
    }

    public hide(): void {
        if (this.modalEl) {
            this.modalEl.classList.remove('active');
        }
    }
}
