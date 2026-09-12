import { AircraftConfig, CrashBreakdown, FlightState } from '../types';
import { getAircraftById } from '../catalog';

const STORAGE_KEY_COINS = 'planecrash_coins';
const STORAGE_KEY_UNLOCKED = 'planecrash_unlocked_planes';
const STORAGE_KEY_SELECTED = 'planecrash_selected_plane';
const STORAGE_KEY_STATS = 'planecrash_stats';

export interface PlaneCrashStats {
    totalCrashes: number;
    totalCoinsEarned: number;
    totalSpins: number;
    totalLoops: number;
    topSpeedRecord: number;
    maxCoinsInSingleCrash: number;
}

export class PlaneCrashState {
    private coins: number = 0;
    private unlockedPlanes: Set<string> = new Set(['cessna172']);
    private selectedPlaneId: string = 'cessna172';
    private stats: PlaneCrashStats = {
        totalCrashes: 0,
        totalCoinsEarned: 0,
        totalSpins: 0,
        totalLoops: 0,
        topSpeedRecord: 0,
        maxCoinsInSingleCrash: 0
    };

    constructor() {
        this.load();
    }

    public load(): void {
        try {
            if (typeof localStorage !== 'undefined') {
                const rawCoins = localStorage.getItem(STORAGE_KEY_COINS);
                if (rawCoins !== null) {
                    const parsed = parseInt(rawCoins, 10);
                    if (!isNaN(parsed) && parsed >= 0) this.coins = parsed;
                }

                const rawUnlocked = localStorage.getItem(STORAGE_KEY_UNLOCKED);
                if (rawUnlocked) {
                    const parsed = JSON.parse(rawUnlocked);
                    if (Array.isArray(parsed)) {
                        this.unlockedPlanes = new Set(parsed);
                        this.unlockedPlanes.add('cessna172');
                    }
                }

                const rawSelected = localStorage.getItem(STORAGE_KEY_SELECTED);
                if (rawSelected) {
                    this.selectedPlaneId = rawSelected;
                }

                const rawStats = localStorage.getItem(STORAGE_KEY_STATS);
                if (rawStats) {
                    this.stats = { ...this.stats, ...JSON.parse(rawStats) };
                }
            }
        } catch (e) {
            console.warn('[PlaneCrashState] Failed loading storage:', e);
        }
    }

    public save(): void {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(STORAGE_KEY_COINS, this.coins.toString());
                localStorage.setItem(STORAGE_KEY_UNLOCKED, JSON.stringify(Array.from(this.unlockedPlanes)));
                localStorage.setItem(STORAGE_KEY_SELECTED, this.selectedPlaneId);
                localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(this.stats));
            }
        } catch (e) {
            console.warn('[PlaneCrashState] Failed saving storage:', e);
        }
    }

    public getCoins(): number {
        return this.coins;
    }

    public addCoins(amount: number): number {
        if (amount <= 0) return this.coins;
        this.coins += Math.round(amount);
        this.stats.totalCoinsEarned += Math.round(amount);
        this.save();
        return this.coins;
    }

    public spendCoins(amount: number): boolean {
        if (amount <= 0) return true;
        if (this.coins < amount) return false;
        this.coins -= Math.round(amount);
        this.save();
        return true;
    }

    public getUnlockedPlanes(): string[] {
        return Array.from(this.unlockedPlanes);
    }

    public isPlaneUnlocked(id: string): boolean {
        if (id === 'cessna172') return true;
        return this.unlockedPlanes.has(id);
    }

    public unlockPlane(id: string): boolean {
        this.unlockedPlanes.add(id);
        this.save();
        return true;
    }

    public buyPlane(id: string): { success: boolean; message: string } {
        if (this.isPlaneUnlocked(id)) {
            this.setSelectedPlaneId(id);
            return { success: true, message: 'Lennuk on juba ostetud!' };
        }

        const config = getAircraftById(id);
        if (this.coins < config.price) {
            const missing = config.price - this.coins;
            return { success: false, message: `Sul puudub veel ${missing} münti!` };
        }

        this.spendCoins(config.price);
        this.unlockPlane(id);
        this.setSelectedPlaneId(id);
        return { success: true, message: `Ostsid edukalt: ${config.name}!` };
    }

    public getSelectedPlaneId(): string {
        return this.selectedPlaneId;
    }

    public setSelectedPlaneId(id: string): void {
        if (this.isPlaneUnlocked(id)) {
            this.selectedPlaneId = id;
            this.save();
        }
    }

    public getStats(): PlaneCrashStats {
        return { ...this.stats };
    }

    /**
     * Calculates crash reward breakdown.
     * Guaranteed Base Crash: 500 Coins!
     * Additional bonuses:
     * - 360° spin bonus (+150 coins per completed spin)
     * - Loop bonus (+200 coins per vertical loop)
     * - Speed bonus (up to +400 coins based on speed at impact)
     * - Altitude dive bonus (up to +250 coins based on drop)
     * - Target/obstacle destruction bonus (+100 - +500 coins)
     * - Aircraft multiplier
     */
    public calculateCrashReward(
        flightState: FlightState,
        plane: AircraftConfig,
        targetDesc?: string
    ): CrashBreakdown {
        const baseCoins = 500; // ALATI KINDLASTI 500 COINI

        // Spins calculation: 150 coins per completed 360 degree spin
        const spinsCount = Math.max(0, flightState.spin360Count);
        const spinsCoins = spinsCount * 150;

        // Vertical Loops: 200 coins per vertical loop
        const loopsCount = Math.max(0, flightState.loopCount);
        const loopsCoins = loopsCount * 200;

        // Speed bonus: up to 400 coins depending on impact velocity
        const impactSpeed = Math.round(flightState.speedKmh);
        const speedCoins = Math.min(600, Math.round((impactSpeed / 100) * 80));

        // Altitude dive bonus: higher the dive, bigger the reward
        const maxAlt = Math.round(flightState.highestAltitudeReached);
        const altitudeCoins = Math.min(400, Math.round(maxAlt * 0.5));

        // Target hit bonus (skyscraper, bridge, cliff, control tower)
        let targetCoins = 0;
        if (targetDesc) {
            if (targetDesc.toLowerCase().includes('pilvelõhkuja') || targetDesc.toLowerCase().includes('skyscraper')) {
                targetCoins = 350;
            } else if (targetDesc.toLowerCase().includes('sild') || targetDesc.toLowerCase().includes('bridge')) {
                targetCoins = 300;
            } else if (targetDesc.toLowerCase().includes('torn') || targetDesc.toLowerCase().includes('tower')) {
                targetCoins = 400;
            } else if (targetDesc.toLowerCase().includes('sihtmärk') || targetDesc.toLowerCase().includes('target')) {
                targetCoins = 500;
            } else {
                targetCoins = 150;
            }
        }

        const rawSum = baseCoins + spinsCoins + loopsCoins + speedCoins + altitudeCoins + targetCoins;
        const multiplier = plane.coinMultiplier || 1.0;
        const totalCoins = Math.round(rawSum * multiplier);

        return {
            baseCoins,
            spinsCoins: Math.round(spinsCoins * multiplier),
            spinsCount,
            loopsCoins: Math.round(loopsCoins * multiplier),
            loopsCount,
            speedCoins: Math.round(speedCoins * multiplier),
            impactSpeedKmh: impactSpeed,
            altitudeCoins: Math.round(altitudeCoins * multiplier),
            maxAltitude: maxAlt,
            targetCoins: Math.round(targetCoins * multiplier),
            targetDescription: targetDesc,
            totalCoins,
            planeName: plane.name,
            multiplier
        };
    }

    public applyCrashReward(report: CrashBreakdown): void {
        this.addCoins(report.totalCoins);
        this.stats.totalCrashes += 1;
        this.stats.totalSpins += report.spinsCount;
        this.stats.totalLoops += report.loopsCount;
        this.stats.topSpeedRecord = Math.max(this.stats.topSpeedRecord, report.impactSpeedKmh);
        this.stats.maxCoinsInSingleCrash = Math.max(this.stats.maxCoinsInSingleCrash, report.totalCoins);
        this.save();
    }
}

export const planeCrashState = new PlaneCrashState();
