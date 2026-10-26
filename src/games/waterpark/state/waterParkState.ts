import { PlacedStructure, ParkStats, ParkTheme } from '../types';
import { PARK_ATTRACTIONS_CATALOG, DEFAULT_TICKET_PRICE } from '../catalog';

const STORAGE_KEY = 'playard_waterpark_state_v1';

export class WaterParkStateManager {
    private cash: number = 1500; // Starting budget
    private structures: PlacedStructure[] = [];
    private reputation: number = 50;
    private cleanliness: number = 95;
    private ticketPrice: number = DEFAULT_TICKET_PRICE;
    private wavePoolActive: boolean = false;
    private parkTheme: ParkTheme = 'tropical';
    private parkName: string = 'Playard Aqua Resort';
    private totalGuestsVisited: number = 0;
    private isAudioMuted: boolean = false;

    constructor() {
        this.loadState();
        if (this.structures.length === 0) {
            // Starter layout
            this.structures = [
                {
                    instanceId: 'starter_kiddie',
                    attractionId: 'kiddie_pool',
                    x: -12,
                    y: 0,
                    z: -10,
                    rotationY: 0,
                    builtAt: Date.now()
                },
                {
                    instanceId: 'starter_slide',
                    attractionId: 'speed_slide',
                    x: 12,
                    y: 0,
                    z: -12,
                    rotationY: Math.PI / 4,
                    builtAt: Date.now()
                },
                {
                    instanceId: 'starter_shack',
                    attractionId: 'icecream_shack',
                    x: -8,
                    y: 0,
                    z: 14,
                    rotationY: 0,
                    builtAt: Date.now()
                },
                {
                    instanceId: 'starter_palm',
                    attractionId: 'palm_grove',
                    x: 10,
                    y: 0,
                    z: 14,
                    rotationY: 0,
                    builtAt: Date.now()
                }
            ];
            this.saveState();
        }
    }

    private loadState(): void {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                if (typeof data.cash === 'number') this.cash = data.cash;
                if (Array.isArray(data.structures)) this.structures = data.structures;
                if (typeof data.reputation === 'number') this.reputation = data.reputation;
                if (typeof data.cleanliness === 'number') this.cleanliness = data.cleanliness;
                if (typeof data.ticketPrice === 'number') this.ticketPrice = data.ticketPrice;
                if (typeof data.wavePoolActive === 'boolean') this.wavePoolActive = data.wavePoolActive;
                if (data.parkName) this.parkName = data.parkName;
                if (data.parkTheme) this.parkTheme = data.parkTheme;
                if (typeof data.isAudioMuted === 'boolean') this.isAudioMuted = data.isAudioMuted;
            }
        } catch (e) {
            console.warn('[WaterParkState] Failed to load state:', e);
        }
    }

    public saveState(): void {
        try {
            const data = {
                cash: this.cash,
                structures: this.structures,
                reputation: this.reputation,
                cleanliness: this.cleanliness,
                ticketPrice: this.ticketPrice,
                wavePoolActive: this.wavePoolActive,
                parkName: this.parkName,
                parkTheme: this.parkTheme,
                isAudioMuted: this.isAudioMuted
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('[WaterParkState] Failed to save state:', e);
        }
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

    public buildStructure(attractionId: string, x: number, z: number, rotationY: number = 0): PlacedStructure | null {
        const def = PARK_ATTRACTIONS_CATALOG.find(a => a.id === attractionId);
        if (!def) return null;
        if (!this.spendCash(def.cost)) return null;

        const newStruct: PlacedStructure = {
            instanceId: 'struct_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            attractionId,
            x,
            y: 0,
            z,
            rotationY,
            builtAt: Date.now()
        };

        this.structures.push(newStruct);
        this.reputation = Math.min(100, this.reputation + def.ratingBonus * 0.4);
        this.saveState();
        return newStruct;
    }

    public demolishStructure(instanceId: string): boolean {
        const index = this.structures.findIndex(s => s.instanceId === instanceId);
        if (index === -1) return false;

        const struct = this.structures[index];
        const def = PARK_ATTRACTIONS_CATALOG.find(a => a.id === struct.attractionId);
        if (def) {
            // Refund 50%
            this.cash += Math.floor(def.cost * 0.5);
            this.reputation = Math.max(10, this.reputation - def.ratingBonus * 0.3);
        }

        this.structures.splice(index, 1);
        this.saveState();
        return true;
    }

    public getReputation(): number {
        return Math.round(this.reputation);
    }

    public getCleanliness(): number {
        return Math.round(this.cleanliness);
    }

    public cleanPark(): void {
        this.cleanliness = 100;
        this.saveState();
    }

    public degradeCleanliness(amount: number = 0.5): void {
        this.cleanliness = Math.max(20, this.cleanliness - amount);
    }

    public getTicketPrice(): number {
        return this.ticketPrice;
    }

    public setTicketPrice(price: number): void {
        this.ticketPrice = Math.max(5, Math.min(100, Math.floor(price)));
        this.saveState();
    }

    public isWavePoolActive(): boolean {
        return this.wavePoolActive;
    }

    public toggleWavePool(): boolean {
        this.wavePoolActive = !this.wavePoolActive;
        this.saveState();
        return this.wavePoolActive;
    }

    public getParkName(): string {
        return this.parkName;
    }

    public setParkName(name: string): void {
        this.parkName = name.trim() || 'Playard Aqua Resort';
        this.saveState();
    }

    public getTheme(): ParkTheme {
        return this.parkTheme;
    }

    public setTheme(theme: ParkTheme): void {
        this.parkTheme = theme;
        this.saveState();
    }

    public isMuted(): boolean {
        return this.isAudioMuted;
    }

    public setMuted(muted: boolean): void {
        this.isAudioMuted = muted;
        this.saveState();
    }

    public calculateCapacity(): number {
        let cap = 20; // Base capacity
        for (const s of this.structures) {
            const def = PARK_ATTRACTIONS_CATALOG.find(a => a.id === s.attractionId);
            if (def) {
                if (def.category === 'pools') cap += 25;
                else if (def.category === 'slides') cap += 15;
                else if (def.category === 'attractions') cap += 12;
                else if (def.category === 'amenities') cap += 8;
            }
        }
        return cap;
    }

    public calculateTotalIncomePerMin(): number {
        let total = 0;
        for (const s of this.structures) {
            const def = PARK_ATTRACTIONS_CATALOG.find(a => a.id === s.attractionId);
            if (def) total += def.incomePerMin;
        }
        return total;
    }

    public reset(): void {
        localStorage.removeItem(STORAGE_KEY);
        this.cash = 1500;
        this.structures = [];
        this.reputation = 50;
        this.cleanliness = 95;
        this.ticketPrice = DEFAULT_TICKET_PRICE;
        this.wavePoolActive = false;
        this.parkTheme = 'tropical';
    }
}

export const waterParkState = new WaterParkStateManager();
