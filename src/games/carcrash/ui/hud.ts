import { CarCrashState } from '../types';

export class CrashHUD {
    private speedEl: HTMLElement | null;
    private gearEl: HTMLElement | null;
    private damageTextEl: HTMLElement | null;
    private damageBarFill: HTMLElement | null;
    private gForceEl: HTMLElement | null;
    private deformNodesEl: HTMLElement | null;
    private carNameEl: HTMLElement | null;
    private slowMoBanner: HTMLElement | null;
    private slowMoBtn: HTMLElement | null;

    constructor() {
        this.speedEl = document.getElementById('speed-value');
        this.gearEl = document.getElementById('gear-value');
        this.damageTextEl = document.getElementById('damage-percent-text');
        this.damageBarFill = document.getElementById('damage-bar-fill');
        this.gForceEl = document.getElementById('g-force-text');
        this.deformNodesEl = document.getElementById('deform-nodes-text');
        this.carNameEl = document.getElementById('hud-car-name');
        this.slowMoBanner = document.getElementById('slowmo-banner');
        this.slowMoBtn = document.getElementById('btn-toggle-slowmo');
    }

    public update(state: CarCrashState, carName: string): void {
        if (this.speedEl) this.speedEl.textContent = state.speedKmh.toString();
        if (this.gearEl) this.gearEl.textContent = state.gear;
        if (this.carNameEl) this.carNameEl.textContent = carName;

        if (this.damageTextEl) {
            let label = 'Terve';
            let color = '#2ecc71';
            if (state.damagePercent >= 100) {
                label = '💥 PLAHVATANUD & HÄVITATUD! VAJUTA "R"';
                color = '#ff4757';
            } else if (state.damagePercent > 70) {
                label = 'Põleb / Kriitiline';
                color = '#e74c3c';
            } else if (state.damagePercent > 35) {
                label = 'Raskelt vigastatud';
                color = '#e67e22';
            } else if (state.damagePercent > 10) {
                label = 'Mõlkis';
                color = '#f1c40f';
            }
            this.damageTextEl.textContent = `${state.damagePercent}% (${label})`;
            this.damageTextEl.style.color = color;
        }

        if (this.damageBarFill) {
            this.damageBarFill.style.width = `${state.damagePercent}%`;
        }

        if (this.gForceEl) {
            this.gForceEl.textContent = `${state.gForce} G`;
        }

        if (this.deformNodesEl) {
            this.deformNodesEl.textContent = `${state.deformedNodesCount} / 48`;
        }

        if (this.slowMoBanner) {
            this.slowMoBanner.style.display = state.isSlowMo ? 'block' : 'none';
        }

        if (this.slowMoBtn) {
            if (state.isSlowMo) {
                this.slowMoBtn.classList.add('active');
            } else {
                this.slowMoBtn.classList.remove('active');
            }
        }
    }
}
