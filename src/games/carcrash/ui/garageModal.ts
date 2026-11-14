import { VEHICLE_CATALOG } from '../catalog';
import { VehicleConfig } from '../types';

export class GarageModalController {
    private modalEl: HTMLElement | null;
    private gridEl: HTMLElement | null;
    private onSelectCallback: (config: VehicleConfig) => void;
    private currentSelectedId: string;

    constructor(currentId: string, onSelect: (config: VehicleConfig) => void) {
        this.currentSelectedId = currentId;
        this.onSelectCallback = onSelect;
        this.modalEl = document.getElementById('modal-garage');
        this.gridEl = document.getElementById('garage-vehicles-grid');

        const closeBtn = document.getElementById('btn-close-garage');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        const openBtn = document.getElementById('btn-open-garage');
        if (openBtn) {
            openBtn.addEventListener('click', () => this.open());
        }

        this.renderCatalog();
    }

    public open(): void {
        if (this.modalEl) {
            this.renderCatalog();
            this.modalEl.style.display = 'flex';
        }
    }

    public close(): void {
        if (this.modalEl) {
            this.modalEl.style.display = 'none';
        }
    }

    private renderCatalog(): void {
        if (!this.gridEl) return;
        this.gridEl.innerHTML = '';

        for (const car of VEHICLE_CATALOG) {
            const card = document.createElement('div');
            card.className = `selection-card ${car.id === this.currentSelectedId ? 'selected' : ''}`;
            card.innerHTML = `
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 1.8rem;">${car.icon}</span>
                        <span style="background: rgba(255, 71, 87, 0.2); color: #ff6b81; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 6px;">${car.category}</span>
                    </div>
                    <h3 style="margin: 0 0 6px 0; font-size: 1.15rem; color: #ffffff;">${car.name}</h3>
                    <p style="margin: 0 0 12px 0; font-size: 0.8rem; color: #94a3b8; line-height: 1.4;">${car.description}</p>
                </div>
                <div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 0.75rem; color: #cbd5e1; margin-bottom: 12px; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 8px;">
                        <div>Mass: <strong>${car.massKg} kg</strong></div>
                        <div>Võimsus: <strong>${car.enginePower} HP</strong></div>
                        <div>Tippkiirus: <strong>${car.topSpeedKmh} km/h</strong></div>
                        <div>Kere jäikus: <strong>${car.stiffness}</strong></div>
                    </div>
                    <button class="btn-select-vehicle" style="width: 100%; padding: 8px; border-radius: 8px; border: none; font-weight: 800; cursor: pointer; background: ${car.id === this.currentSelectedId ? 'linear-gradient(135deg, #2ecc71, #27ae60)' : 'linear-gradient(135deg, #ff4757, #ff6b81)'}; color: white;">
                        ${car.id === this.currentSelectedId ? '✓ Valitud' : 'Vali see auto'}
                    </button>
                </div>
            `;

            card.addEventListener('click', () => {
                this.currentSelectedId = car.id;
                this.onSelectCallback(car);
                this.close();
            });

            this.gridEl.appendChild(card);
        }
    }
}
