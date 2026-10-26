import { waterParkState } from '../state/waterParkState';
import { BuildCategory } from '../types';
import { PARK_ATTRACTIONS_CATALOG } from '../catalog';

export class WaterParkHUD {
    private onSelectAttractionCallback: (id: string) => void;
    private onToggleWaveCallback: () => void;
    private onDemolishCallback: () => void;
    private currentCategory: BuildCategory = 'pools';

    constructor(
        onSelectAttraction: (id: string) => void,
        onToggleWave: () => void,
        onDemolish: () => void
    ) {
        this.onSelectAttractionCallback = onSelectAttraction;
        this.onToggleWaveCallback = onToggleWave;
        this.onDemolishCallback = onDemolish;

        this.initEventListeners();
        this.renderCatalog();
    }

    private initEventListeners() {
        // Tab buttons
        const tabs = document.querySelectorAll('.build-cat-tab');
        tabs.forEach((tab) => {
            tab.addEventListener('click', (e) => {
                tabs.forEach((t) => t.classList.remove('active'));
                const btn = e.currentTarget as HTMLElement;
                btn.classList.add('active');
                this.currentCategory = btn.dataset.category as BuildCategory;
                this.renderCatalog();
            });
        });

        // Wave pool button
        const btnWave = document.getElementById('btn-toggle-wavepool');
        if (btnWave) {
            btnWave.addEventListener('click', () => {
                this.onToggleWaveCallback();
                this.updateStats();
            });
        }

        // Clean park button
        const btnClean = document.getElementById('btn-clean-park');
        if (btnClean) {
            btnClean.addEventListener('click', () => {
                waterParkState.cleanPark();
                this.updateStats();
            });
        }

        // Open build drawer button
        const btnBuildMenu = document.getElementById('btn-open-build');
        const buildDrawer = document.getElementById('build-drawer');
        if (btnBuildMenu && buildDrawer) {
            btnBuildMenu.addEventListener('click', () => {
                const isOpen = buildDrawer.style.display === 'flex';
                buildDrawer.style.display = isOpen ? 'none' : 'flex';
            });
        }

        const btnCloseDrawer = document.getElementById('btn-close-drawer');
        if (btnCloseDrawer && buildDrawer) {
            btnCloseDrawer.addEventListener('click', () => {
                buildDrawer.style.display = 'none';
            });
        }
    }

    public renderCatalog() {
        const grid = document.getElementById('build-items-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const items = PARK_ATTRACTIONS_CATALOG.filter((a) => a.category === this.currentCategory);
        const cash = waterParkState.getCash();

        items.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'build-item-card';
            const canAfford = cash >= item.cost;

            card.innerHTML = `
                <div class="card-icon">${item.icon}</div>
                <div class="card-info">
                    <div class="card-title">${item.name}</div>
                    <div class="card-desc">${item.description}</div>
                    <div class="card-stats">
                        <span class="card-price">🪙 ${item.cost} €</span>
                        <span class="card-income">+${item.incomePerMin} €/min</span>
                        <span class="card-rating">⭐ +${item.ratingBonus}</span>
                    </div>
                </div>
                <button class="btn-build-item ${canAfford ? '' : 'disabled'}" data-id="${item.id}">
                    ${canAfford ? 'Ehita' : 'Puudu raha'}
                </button>
            `;

            const btn = card.querySelector('.btn-build-item');
            if (btn && canAfford) {
                btn.addEventListener('click', () => {
                    this.onSelectAttractionCallback(item.id);
                    // Close drawer on selection for easy placing
                    const buildDrawer = document.getElementById('build-drawer');
                    if (buildDrawer) buildDrawer.style.display = 'none';
                });
            }

            grid.appendChild(card);
        });
    }

    public updateStats(visitorsCount: number = 0) {
        const cashVal = document.getElementById('hud-cash-val');
        if (cashVal) cashVal.textContent = waterParkState.getCash().toLocaleString();

        const repVal = document.getElementById('hud-rep-val');
        if (repVal) repVal.textContent = waterParkState.getReputation().toString() + '%';

        const cleanVal = document.getElementById('hud-clean-val');
        if (cleanVal) cleanVal.textContent = waterParkState.getCleanliness().toString() + '%';

        const guestsVal = document.getElementById('hud-guests-val');
        if (guestsVal) {
            const cap = waterParkState.calculateCapacity();
            guestsVal.textContent = `${visitorsCount} / ${cap}`;
        }

        const waveBtn = document.getElementById('btn-toggle-wavepool');
        if (waveBtn) {
            const isWave = waterParkState.isWavePoolActive();
            waveBtn.textContent = isWave ? '🌊 Mega Lained: SEES' : '🌊 Mega Lained: VÄLJAS';
            waveBtn.style.borderColor = isWave ? '#00f2fe' : 'rgba(255,255,255,0.2)';
            waveBtn.style.color = isWave ? '#00f2fe' : '#ffffff';
        }
    }
}
