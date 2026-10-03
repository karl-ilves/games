import { PILOT_RANKS } from '../catalog';

export interface PersistentFlightProfile {
    cash: number;
    xp: number;
    selectedAircraftId: string;
    unlockedAircraft: string[];
    butterLandings: number;
    totalLandings: number;
    ringsCollected: number;
    audioEnabled: boolean;
}

const STORAGE_KEY = 'playard_flight_state_v1';

class FlightStateManager {
    private profile: PersistentFlightProfile;

    constructor() {
        this.profile = this.loadState();
    }

    private getDefaultProfile(): PersistentFlightProfile {
        return {
            cash: 500,
            xp: 0,
            selectedAircraftId: 'cessna172',
            unlockedAircraft: ['cessna172'],
            butterLandings: 0,
            totalLandings: 0,
            ringsCollected: 0,
            audioEnabled: true
        };
    }

    private loadState(): PersistentFlightProfile {
        if (typeof window === 'undefined' || !window.localStorage) {
            return this.getDefaultProfile();
        }
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return { ...this.getDefaultProfile(), ...parsed };
            }
        } catch (e) {
            console.warn('[FlightState] Could not load state from localStorage:', e);
        }
        return this.getDefaultProfile();
    }

    private saveState(): void {
        if (typeof window === 'undefined' || !window.localStorage) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
        } catch (e) {
            console.warn('[FlightState] Could not save state to localStorage:', e);
        }
    }

    public getCash(): number {
        return this.profile.cash;
    }

    public addCash(amount: number): number {
        if (amount > 0) {
            this.profile.cash += Math.floor(amount);
            this.saveState();
        }
        return this.profile.cash;
    }

    public spendCash(amount: number): boolean {
        if (amount <= this.profile.cash) {
            this.profile.cash -= Math.floor(amount);
            this.saveState();
            return true;
        }
        return false;
    }

    public getXP(): number {
        return this.profile.xp;
    }

    public addXP(amount: number): void {
        if (amount > 0) {
            this.profile.xp += Math.floor(amount);
            this.saveState();
        }
    }

    public getPilotRank(): { title: string; icon: string } {
        const xp = this.profile.xp;
        let currentRank = PILOT_RANKS[0];
        for (const rank of PILOT_RANKS) {
            if (xp >= rank.minXP) {
                currentRank = rank;
            }
        }
        return { title: currentRank.title, icon: currentRank.icon };
    }

    public getSelectedAircraftId(): string {
        return this.profile.selectedAircraftId;
    }

    public setSelectedAircraftId(id: string): void {
        this.profile.selectedAircraftId = id;
        if (!this.profile.unlockedAircraft.includes(id)) {
            this.profile.unlockedAircraft.push(id);
        }
        this.saveState();
    }

    public isAircraftUnlocked(id: string): boolean {
        return this.profile.unlockedAircraft.includes(id);
    }

    public unlockAircraft(id: string, price: number): boolean {
        if (this.isAircraftUnlocked(id)) return true;
        if (this.spendCash(price)) {
            this.profile.unlockedAircraft.push(id);
            this.saveState();
            return true;
        }
        return false;
    }

    public recordLanding(sinkRateFpm: number): { isButter: boolean; rewardCash: number; rewardXP: number } {
        this.profile.totalLandings++;
        const absSink = Math.abs(sinkRateFpm);
        const isButter = absSink < 180;
        let rewardCash = 50;
        let rewardXP = 20;

        if (isButter) {
            this.profile.butterLandings++;
            rewardCash = 150;
            rewardXP = 60;
        } else if (absSink < 450) {
            rewardCash = 90;
            rewardXP = 35;
        }

        this.addCash(rewardCash);
        this.addXP(rewardXP);
        this.saveState();

        return { isButter, rewardCash, rewardXP };
    }

    public recordRingCollected(): { rewardCash: number; totalRings: number } {
        this.profile.ringsCollected++;
        const reward = 25;
        this.addCash(reward);
        this.addXP(10);
        this.saveState();
        return { rewardCash: reward, totalRings: this.profile.ringsCollected };
    }

    public isAudioEnabled(): boolean {
        return this.profile.audioEnabled;
    }

    public setAudioEnabled(enabled: boolean): void {
        this.profile.audioEnabled = enabled;
        this.saveState();
    }

    public reset(): void {
        this.profile = this.getDefaultProfile();
        this.saveState();
    }
}

export const flightState = new FlightStateManager();
