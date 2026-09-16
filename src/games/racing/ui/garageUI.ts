import { yardService } from '../../../shared/yardService';
import { showYardPurchaseConfirm } from '../../../shared/yardPurchaseModal';
import { VEHICLES } from '../catalog';
import { RacingState } from '../state/racingState';

export class GarageUI {
    private state: RacingState;
    private onVehicleSelected: (id: string) => void;

    constructor(state: RacingState, onVehicleSelected: (id: string) => void) {
        this.state = state;
        this.onVehicleSelected = onVehicleSelected;
    }

    public updateGarageUI(): void {
        const moneyVal = document.getElementById('money-val');
        if (moneyVal) moneyVal.innerText = this.state.money.toLocaleString();
        const shopMoneyVal = document.getElementById('shop-money-val');
        if (shopMoneyVal) shopMoneyVal.innerText = this.state.money.toLocaleString();

        const racingGarageYardIcon = document.getElementById('racing-garage-yard-icon');
        if (racingGarageYardIcon) racingGarageYardIcon.innerHTML = yardService.renderYardSvg(20);
        const racingYardVal = document.getElementById('racing-yard-val');
        if (racingYardVal) racingYardVal.innerText = yardService.getYards().toLocaleString();

        // Update Level Selection UI
        const btnLevel1 = document.getElementById('btn-level-1');
        const btnLevel2 = document.getElementById('btn-level-2');
        const btnLevel3 = document.getElementById('btn-level-3');
        const lblLevel2 = document.getElementById('lbl-level-2');
        const lblLevel3 = document.getElementById('lbl-level-3');
        const unlockBtnsLvl2 = document.getElementById('unlock-btns-lvl2');
        const unlockBtnsLvl3 = document.getElementById('unlock-btns-lvl3');

        if (btnLevel1 && btnLevel2 && btnLevel3) {
            btnLevel1.style.border = this.state.selectedLevel === 1 ? '2px solid white' : '2px solid transparent';
            btnLevel2.style.border = this.state.selectedLevel === 2 ? '2px solid white' : '2px solid transparent';
            btnLevel3.style.border = this.state.selectedLevel === 3 ? '2px solid white' : '2px solid transparent';

            btnLevel1.style.background = '#27ae60';
            btnLevel2.style.background = this.state.level2Unlocked ? '#27ae60' : '#4b6584';
            btnLevel3.style.background = this.state.level3Unlocked ? '#27ae60' : '#4b6584';

            if (lblLevel2) lblLevel2.innerText = this.state.level2Unlocked ? '1st Prize: $1,000 | 9 Opponents' : 'Locked';
            if (lblLevel3) lblLevel3.innerText = this.state.level3Unlocked ? '1st Prize: $3,000 | 19 Opponents' : 'Locked';

            if (unlockBtnsLvl2) unlockBtnsLvl2.style.display = this.state.level2Unlocked ? 'none' : 'flex';
            if (unlockBtnsLvl3) unlockBtnsLvl3.style.display = this.state.level3Unlocked ? 'none' : 'flex';
        }

        const selVeh = VEHICLES.find(v => v.id === this.state.vehicleType);
        const selEl = document.getElementById('selected-vehicle-name');
        if (selEl && selVeh) selEl.innerText = selVeh.name;

        // Owned Vehicles
        let ownedHtml = '';
        VEHICLES.forEach(v => {
            if (this.state.unlockedVehicles.includes(v.id)) {
                const isSelected = this.state.vehicleType === v.id;
                const border = isSelected ? 'border: 3px solid #f1c40f;' : 'border: 3px solid transparent;';
                const selectedLabel = isSelected
                    ? '<div style="color: #f1c40f; font-size: 12px; font-weight: bold;">SELECTED</div>'
                    : '';
                ownedHtml += `
                    <div class="veh-select-btn" data-id="${v.id}" style="background: #34495e; padding: 15px; border-radius: 10px; cursor: pointer; text-align: center; width: 200px; ${border}">
                        <img src="${v.image}" alt="${v.name}" style="width: 100%; border-radius: 5px; margin-bottom: 10px; filter: hue-rotate(${v.hueRotate}deg);">
                        <h3 style="margin: 0 0 5px 0; color: ${v.type === 'car' ? '#2ecc71' : '#e67e22'}; font-size: 16px;">${v.name}</h3>
                        <div style="font-size: 12px; margin-bottom: 5px; color: #bdc3c7;">
                            Spd: ${this.state.getVehicleMaxSpeed(v)} (+${(this.state.vehicleUpgrades[v.id]?.speedUpgrades || 0) * 10}) | Acc: ${v.acceleration}
                        </div>
                        <button class="btn btn-upgrade" data-id="${v.id}" data-locked="${(this.state.vehicleUpgrades[v.id]?.speedUpgrades || 0) >= 5}" style="background: ${(this.state.vehicleUpgrades[v.id]?.speedUpgrades || 0) >= 5 ? '#95a5a6' : '#3498db'}; width: 100%; font-size: 12px; padding: 5px; margin-bottom: 5px; border-radius: 5px;">${(this.state.vehicleUpgrades[v.id]?.speedUpgrades || 0) >= 5 ? 'MAX SPEED' : '+10 Speed ($200)'}</button>
                        ${selectedLabel}
                    </div>
                `;
            }
        });
        const ownedEl = document.getElementById('owned-vehicles');
        if (ownedEl) ownedEl.innerHTML = ownedHtml;

        // Shop Tabs
        const tabCar = document.getElementById('shop-tab-car');
        const tabMoto = document.getElementById('shop-tab-moto');
        if (tabCar && tabMoto) {
            tabCar.style.background = this.state.shopCategory === 'car' ? '#27ae60' : '#34495e';
            tabMoto.style.background = this.state.shopCategory === 'moto' ? '#e67e22' : '#34495e';

            const newCar = tabCar.cloneNode(true);
            tabCar.parentNode?.replaceChild(newCar, tabCar);
            newCar.addEventListener('click', () => {
                this.state.shopCategory = 'car';
                this.updateGarageUI();
            });

            const newMoto = tabMoto.cloneNode(true);
            tabMoto.parentNode?.replaceChild(newMoto, tabMoto);
            newMoto.addEventListener('click', () => {
                this.state.shopCategory = 'moto';
                this.updateGarageUI();
            });
        }

        // Generate Shop Vehicles based on category and Level 3 unlock
        let shopHtml = '';
        const cars = VEHICLES.filter(v => v.type === 'car').sort((a, b) => a.price - b.price);
        const motos = VEHICLES.filter(v => v.type === 'moto').sort((a, b) => a.price - b.price);
        const topCars = cars.slice(-5).map(v => v.id);
        const topMotos = motos.slice(-5).map(v => v.id);

        VEHICLES.forEach(v => {
            if (v.price === 0 && v.yardPrice === 0) return; // Skip starter
            if (v.type !== this.state.shopCategory) return;

            const isTop5 = topCars.includes(v.id) || topMotos.includes(v.id);
            const isLocked = isTop5 && !this.state.level3Unlocked;
            const isOwned = this.state.unlockedVehicles.includes(v.id);
            const opacity = isOwned || isLocked ? '0.55' : '1.0';

            let buttonsHtml = '';
            if (isOwned) {
                buttonsHtml = `<button class="btn" disabled style="background: #7f8c8d; width: 100%; font-size: 13px; padding: 8px; margin: 0;">OWNED</button>`;
            } else if (isLocked) {
                buttonsHtml = `<button class="btn" disabled style="background: #e74c3c; width: 100%; font-size: 12px; padding: 8px; margin: 0;">Unlocks at Level 3</button>`;
            } else {
                buttonsHtml = `
                    <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                        <button class="btn shop-buy-cash-btn" data-id="${v.id}" style="background: #27ae60; flex: 1; min-width: 90px; font-size: 12px; padding: 8px 4px; margin: 0;">$${v.price.toLocaleString()}</button>
                        <button class="btn shop-buy-yard-btn" data-id="${v.id}" style="background: #00f2fe; color: #111; flex: 1; min-width: 90px; font-size: 12px; padding: 8px 4px; margin: 0; font-weight: 800;">💎 ${v.yardPrice} Y</button>
                    </div>
                `;
            }

            shopHtml += `
                <div style="background: #34495e; padding: 15px; border-radius: 10px; width: 220px; text-align: center; opacity: ${opacity}; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <img src="${v.image}" alt="${v.name}" style="width: 100%; border-radius: 5px; margin-bottom: 8px; filter: hue-rotate(${v.hueRotate}deg);">
                        <h3 style="margin: 0 0 5px 0; color: ${v.type === 'car' ? '#2ecc71' : '#e67e22'}; font-size: 15px;">${v.name}</h3>
                        <div style="font-size: 12px; margin-bottom: 10px; color: #bdc3c7;">
                            Spd: ${v.maxSpeed} | Acc: ${v.acceleration}
                        </div>
                    </div>
                    ${buttonsHtml}
                </div>
            `;
        });
        const shopEl = document.getElementById('shop-vehicles');
        if (shopEl) shopEl.innerHTML = shopHtml;

        // Bind upgrade buttons
        document.querySelectorAll('.btn-upgrade').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                if ((e.currentTarget as HTMLElement).getAttribute('data-locked') === 'true') return;
                const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
                if (id) this.upgradeSpeed(id);
            });
        });

        // Bind owned select buttons
        document.querySelectorAll('.veh-select-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
                if (id) {
                    this.state.vehicleType = id;
                    this.onVehicleSelected(id);
                    this.updateGarageUI();
                }
            });
        });

        // Bind shop buy with cash buttons
        document.querySelectorAll('.shop-buy-cash-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
                if (id) this.buyVehicleWithCash(id);
            });
        });

        // Bind shop buy with yards buttons
        document.querySelectorAll('.shop-buy-yard-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
                if (id) this.buyVehicleWithYards(id);
            });
        });
    }

    public upgradeSpeed(id: string): void {
        const cost = 200;
        if (!this.state.vehicleUpgrades[id]) this.state.vehicleUpgrades[id] = { speedUpgrades: 0 };

        if (this.state.vehicleUpgrades[id].speedUpgrades >= 5) {
            alert('Maximum upgrades reached for this vehicle!');
            return;
        }

        if (this.state.money < cost) {
            alert('Not enough money! You need $200 to upgrade speed.');
            return;
        }

        this.state.money -= cost;
        this.state.vehicleUpgrades[id].speedUpgrades += 1;
        this.state.saveProgress();
        this.updateGarageUI();
    }

    public buyVehicleWithCash(id: string): void {
        const vDef = VEHICLES.find(v => v.id === id);
        if (!vDef || this.state.unlockedVehicles.includes(id)) return;
        if (this.state.money < vDef.price) {
            alert('Not enough cash! You need $' + vDef.price.toLocaleString());
            return;
        }

        this.state.money -= vDef.price;
        this.state.unlockedVehicles.push(id);
        this.state.saveProgress();
        this.state.vehicleType = id;
        this.onVehicleSelected(id);
        this.updateGarageUI();
        alert(`🎉 Purchased ${vDef.name} for $${vDef.price.toLocaleString()}!`);
    }

    public buyVehicleWithYards(id: string): void {
        const vDef = VEHICLES.find(v => v.id === id);
        if (!vDef || this.state.unlockedVehicles.includes(id)) return;

        showYardPurchaseConfirm({
            itemName: vDef.name,
            yardCost: vDef.yardPrice,
            onConfirm: () => {
                if (yardService.spendYards(vDef.yardPrice, vDef.id, vDef.name)) {
                    this.state.unlockedVehicles.push(id);
                    this.state.saveProgress();
                    this.state.vehicleType = id;
                    this.onVehicleSelected(id);
                    this.updateGarageUI();
                    alert(`💎 Unlocked ${vDef.name} for ${vDef.yardPrice} Yards!`);
                }
            }
        });
    }

    public unlockLevel(level: number, method: 'cash' | 'yards'): void {
        if (level === 2) {
            if (this.state.level2Unlocked) return;
            if (method === 'cash') {
                if (this.state.money < 10000) return alert('Not enough cash! Level 2 costs $10,000.');
                this.state.money -= 10000;
                this.state.level2Unlocked = true;
                this.state.selectedLevel = 2;
                this.state.saveProgress();
                this.updateGarageUI();
                alert(`🌲 Level 2: Forest Track unlocked with $10,000 cash!`);
            } else {
                showYardPurchaseConfirm({
                    itemName: 'Level 2: Forest Track',
                    yardCost: 50,
                    onConfirm: () => {
                        if (!yardService.spendYards(50, 'level_2_forest', 'Level 2: Forest Track')) return;
                        this.state.level2Unlocked = true;
                        this.state.selectedLevel = 2;
                        this.state.saveProgress();
                        this.updateGarageUI();
                        alert(`🌲 Level 2: Forest Track unlocked with 50 Yards!`);
                    }
                });
            }
        } else if (level === 3) {
            if (this.state.level3Unlocked) return;
            if (method === 'cash') {
                if (this.state.money < 100000) return alert('Not enough cash! Level 3 costs $100,000.');
                this.state.money -= 100000;
                this.state.level3Unlocked = true;
                this.state.selectedLevel = 3;
                this.state.saveProgress();
                this.updateGarageUI();
                alert(`🌾 Level 3: Field Track unlocked with $100,000 cash!`);
            } else {
                showYardPurchaseConfirm({
                    itemName: 'Level 3: Field Track',
                    yardCost: 200,
                    onConfirm: () => {
                        if (!yardService.spendYards(200, 'level_3_field', 'Level 3: Field Track')) return;
                        this.state.level3Unlocked = true;
                        this.state.selectedLevel = 3;
                        this.state.saveProgress();
                        this.updateGarageUI();
                        alert(`🌾 Level 3: Field Track unlocked with 200 Yards!`);
                    }
                });
            }
        }
    }

    public bindGarageEvents(onStartRace: () => void): void {
        document.getElementById('btn-level-1')?.addEventListener('click', () => {
            this.state.selectedLevel = 1;
            this.updateGarageUI();
        });

        document.getElementById('btn-level-2')?.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).tagName === 'BUTTON') return;
            if (this.state.level2Unlocked) {
                this.state.selectedLevel = 2;
                this.updateGarageUI();
            }
        });

        document.getElementById('btn-unlock-lvl2-cash')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.unlockLevel(2, 'cash');
        });

        document.getElementById('btn-unlock-lvl2-yards')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.unlockLevel(2, 'yards');
        });

        document.getElementById('btn-level-3')?.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).tagName === 'BUTTON') return;
            if (this.state.level3Unlocked) {
                this.state.selectedLevel = 3;
                this.updateGarageUI();
            }
        });

        document.getElementById('btn-unlock-lvl3-cash')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.unlockLevel(3, 'cash');
        });

        document.getElementById('btn-unlock-lvl3-yards')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.unlockLevel(3, 'yards');
        });

        document.getElementById('btn-open-shop')?.addEventListener('click', () => {
            document.getElementById('shop-screen')!.style.display = 'flex';
        });
        document.getElementById('btn-show-owned')?.addEventListener('click', () => {
            document.getElementById('shop-screen')!.style.display = 'none';
            document.getElementById('owned-screen')!.style.display = 'flex';
            this.updateGarageUI();
        });
        document.getElementById('btn-close-owned')?.addEventListener('click', () => {
            document.getElementById('owned-screen')!.style.display = 'none';
        });
        document.getElementById('btn-close-shop')?.addEventListener('click', () => {
            document.getElementById('shop-screen')!.style.display = 'none';
        });
        document.getElementById('btn-start-race')?.addEventListener('click', onStartRace);
    }
}
