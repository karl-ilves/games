import { supabase } from '../../../lib/supabase';
import { yardService } from '../../../shared/yardService';
import { VEHICLES } from '../catalog';
import { VehicleDef } from '../types';

export class RacingState {
    public money: number = 0;
    public selectedLevel: number = 1;
    public level2Unlocked: boolean = false;
    public level3Unlocked: boolean = false;
    public vehicleType: string = 'car_1';
    public unlockedVehicles: string[] = ['car_1'];
    public vehicleUpgrades: { [id: string]: { speedUpgrades: number } } = {};
    public shopCategory: 'car' | 'moto' = 'car';

    public getSelectedVehicle(): VehicleDef {
        return VEHICLES.find(v => v.id === this.vehicleType) || VEHICLES[0];
    }

    public getVehicleMaxSpeed(vDef: VehicleDef): number {
        const upgrades = this.vehicleUpgrades[vDef.id] ? this.vehicleUpgrades[vDef.id].speedUpgrades : 0;
        return vDef.maxSpeed + (upgrades * 5);
    }

    public async loadProgress(): Promise<void> {
        let loadedFromDB = false;
        const currentProfRaw = localStorage.getItem('playard_current_user_profile');
        const currentProf = currentProfRaw ? JSON.parse(currentProfRaw) : null;

        if (supabase) {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const targetUserId = session?.user?.id || currentProf?.id;
                if (targetUserId) {
                    const { data, error } = await supabase.from('user_progress').select('*').eq('user_id', targetUserId).single();
                    if (data && !error) {
                        this.money = typeof data.money === 'number' ? data.money : 500;
                        this.selectedLevel = data.selected_level || 1;
                        this.unlockedVehicles = Array.isArray(data.unlocked_vehicles) ? data.unlocked_vehicles : ['car_1'];
                        this.vehicleUpgrades = data.vehicle_upgrades || {};
                        this.level2Unlocked = data.level2_unlocked || false;
                        this.level3Unlocked = data.level3_unlocked || false;
                        loadedFromDB = true;
                    }
                }
            } catch (e) {
                console.warn("Cloud progress load error:", e);
            }
        }

        // 2. Local Fallback & Multi-Key Profile Check
        if (!loadedFromDB) {
            let save = localStorage.getItem('racingSave');
            if (!save && currentProf) {
                save = localStorage.getItem(`playard_racingSave_user_${currentProf.username.toLowerCase()}`)
                    || localStorage.getItem(`playard_racingSave_user_${currentProf.id}`)
                    || localStorage.getItem(`playard_racingSave_user_${currentProf.email?.toLowerCase()}`);
            }

            if (currentProf && save) {
                let data = JSON.parse(save);
                this.money = typeof data.money === 'number' ? data.money : 500;
                if (data.unlockedVehicles && !Array.isArray(data.unlockedVehicles)) {
                    this.unlockedVehicles = ['car_1'];
                    if (data.unlockedVehicles.moto) this.unlockedVehicles.push('moto_1');
                } else if (data.unlockedVehicles) {
                    this.unlockedVehicles = data.unlockedVehicles;
                }
                if (data.vehicleUpgrades) this.vehicleUpgrades = data.vehicleUpgrades;
                if (data.level2Unlocked) this.level2Unlocked = data.level2Unlocked;
                if (data.level3Unlocked) this.level3Unlocked = data.level3Unlocked;
            } else if (currentProf && !save) {
                // First time login! Give them 500
                this.money = 500;
                this.selectedLevel = 1;
                this.level2Unlocked = false;
                this.level3Unlocked = false;
                this.unlockedVehicles = ['car_1'];
                this.vehicleType = 'car_1';
                this.vehicleUpgrades = {};
            } else {
                // Not logged in -> Guest mode (0 money)
                this.money = 0;
                this.selectedLevel = 1;
                this.level2Unlocked = false;
                this.level3Unlocked = false;
                this.unlockedVehicles = ['car_1'];
                this.vehicleType = 'car_1';
                this.vehicleUpgrades = {};
            }
        }

        // Synchronize items unlocked in Yard Shop / Cloud across devices
        const yardInv = yardService.getInventory();
        if (Array.isArray(yardInv)) {
            for (const item of yardInv) {
                if (item.startsWith('car_') || item.startsWith('moto_') || item === 'cyber_hypercar') {
                    if (!this.unlockedVehicles.includes(item)) {
                        this.unlockedVehicles.push(item);
                    }
                }
                if (item === 'level_2_field' || item === 'racing_level_2') {
                    this.level2Unlocked = true;
                }
                if (item === 'level_3_field' || item === 'racing_level_3') {
                    this.level3Unlocked = true;
                }
            }
        }
    }

    public async saveProgress(): Promise<void> {
        const payload = {
            money: this.money,
            selected_level: this.selectedLevel,
            unlocked_vehicles: this.unlockedVehicles,
            vehicle_upgrades: this.vehicleUpgrades,
            level2_unlocked: this.level2Unlocked,
            level3_unlocked: this.level3Unlocked
        };

        const rawData = JSON.stringify({
            money: this.money,
            unlockedVehicles: this.unlockedVehicles,
            vehicleUpgrades: this.vehicleUpgrades,
            level2Unlocked: this.level2Unlocked,
            level3Unlocked: this.level3Unlocked
        });

        localStorage.setItem('racingSave', rawData);

        const currentProfRaw = localStorage.getItem('playard_current_user_profile');
        if (currentProfRaw) {
            try {
                const currentProf = JSON.parse(currentProfRaw);
                if (currentProf.username) localStorage.setItem(`playard_racingSave_user_${currentProf.username.toLowerCase()}`, rawData);
                if (currentProf.id) localStorage.setItem(`playard_racingSave_user_${currentProf.id}`, rawData);
                if (currentProf.email) localStorage.setItem(`playard_racingSave_user_${currentProf.email.toLowerCase()}`, rawData);
            } catch (e) {}
        }

        if (!supabase) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await supabase.from('user_progress').upsert({
                    user_id: session.user.id,
                    ...payload
                });
            }
        } catch (e) {}
    }
}
