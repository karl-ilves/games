import { PlacedStructure } from '../types';
import { PARK_ATTRACTIONS_CATALOG } from '../catalog';

const STORAGE_KEY = 'playard_waterpark_state_v2';

export class WaterParkStateManager {
    private cash: number = 2000;
    private structures: PlacedStructure[] = [];

    constructor() {
        this.loadState();
        // User requested: "alguses pole midagi" (at start there is nothing)
    }

    private loadState(): void {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                if (typeof data.cash === 'number') this.cash = data.cash;
                if (Array.isArray(data.structures)) this.structures = data.structures;
            }
        } catch (e) {
            console.warn('[WaterParkState] Failed to load state:', e);
        }
    }

    public saveState(): void {
        try {
            const data = {
                cash: this.cash,
                structures: this.structures
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}
    }

    public getCash(): number {
        return this.cash;
    }

    public addCash(amount: number): number {
        if (amount > 0) {
            this.cash += Math.floor(amount);
            this.saveState();
        }
        return this.cash;
    }

    public spendCash(amount: number): boolean {
        if (amount <= this.cash) {
            this.cash -= Math.floor(amount);
            this.saveState();
            return true;
        }
        return false;
    }

    public getStructures(): PlacedStructure[] {
        return [...this.structures];
    }

    public addStructure(struct: PlacedStructure): void {
        this.structures.push(struct);
        this.saveState();
    }

    public removeStructure(instanceId: string): boolean {
        const idx = this.structures.findIndex(s => s.instanceId === instanceId);
        if (idx !== -1) {
            this.structures.splice(idx, 1);
            this.saveState();
            return true;
        }
        return false;
    }

    public reset(): void {
        localStorage.removeItem(STORAGE_KEY);
        this.cash = 2000;
        this.structures = [];
    }
}

export const waterParkState = new WaterParkStateManager();
