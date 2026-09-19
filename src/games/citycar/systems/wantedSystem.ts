import * as THREE from 'three';
import { CrimeStats, WantedLevel } from '../types';

export interface WantedSystemCallbacks {
    onStarAwarded: (newLevel: WantedLevel) => void;
    onWantedLevelChanged: (level: WantedLevel) => void;
}

export class WantedSystem {
    private wantedLevel: WantedLevel = 0;
    private stats: CrimeStats = {
        totalLampHits: 0,
        totalBuildingHits: 0,
        totalWaterDives: 0,
        totalOffroadDrives: 0,
        totalPoliceRamHits: 0,
        star1LampHits: 0,
        star1BuildingHits: 0,
        star1WaterDives: 0,
        star1PoliceRamHits: 0
    };

    private callbacks: WantedSystemCallbacks;
    private lastBuildingHitTime = 0;
    private lastWaterDiveTime = 0;
    private lastPoliceRamTime = 0;
    private lastOffroadTime = 0;

    constructor(callbacks: WantedSystemCallbacks) {
        this.callbacks = callbacks;
    }

    public getWantedLevel(): WantedLevel {
        return this.wantedLevel;
    }

    public getStats(): Readonly<CrimeStats> {
        return this.stats;
    }

    public reportLampCrash(): void {
        this.stats.totalLampHits++;
        if (this.wantedLevel === 0) {
            this.setWantedLevel(1);
        } else if (this.wantedLevel === 1) {
            this.stats.star1LampHits++;
            if (this.stats.star1LampHits >= 5) {
                this.setWantedLevel(2);
            }
        }
    }

    public reportBuildingCollision(): void {
        const now = Date.now();
        // Debounce continuous sliding contact into discrete collision events
        if (now - this.lastBuildingHitTime < 800) return;
        this.lastBuildingHitTime = now;

        this.stats.totalBuildingHits++;
        if (this.wantedLevel === 0) {
            this.setWantedLevel(1);
        } else if (this.wantedLevel === 1) {
            this.stats.star1BuildingHits++;
            if (this.stats.star1BuildingHits >= 5) {
                this.setWantedLevel(2);
            }
        }
    }

    public reportOffroadOrWater(isWater: boolean): void {
        const now = Date.now();
        if (isWater) {
            if (now - this.lastWaterDiveTime < 1500) return;
            this.lastWaterDiveTime = now;
            this.stats.totalWaterDives++;

            if (this.wantedLevel === 0) {
                this.setWantedLevel(1);
            } else if (this.wantedLevel === 1) {
                this.stats.star1WaterDives++;
                // 1 water dive at 1 star triggers 2 stars!
                if (this.stats.star1WaterDives >= 1) {
                    this.setWantedLevel(2);
                }
            }
        } else {
            // Off-road / grass driving
            if (now - this.lastOffroadTime < 3000) return;
            this.lastOffroadTime = now;
            this.stats.totalOffroadDrives++;

            if (this.wantedLevel === 0) {
                this.setWantedLevel(1);
            }
        }
    }

    public reportPoliceCollision(): void {
        const now = Date.now();
        if (now - this.lastPoliceRamTime < 1200) return;
        this.lastPoliceRamTime = now;

        this.stats.totalPoliceRamHits++;
        if (this.wantedLevel === 1) {
            this.stats.star1PoliceRamHits++;
            // 1 police car ram at 1 star triggers 2 stars!
            if (this.stats.star1PoliceRamHits >= 1) {
                this.setWantedLevel(2);
            }
        }
    }

    public setWantedLevel(newLevel: WantedLevel): void {
        if (newLevel === this.wantedLevel) return;
        this.wantedLevel = newLevel;

        this.callbacks.onStarAwarded(this.wantedLevel);
        this.callbacks.onWantedLevelChanged(this.wantedLevel);
    }

    public reset(): void {
        this.wantedLevel = 0;
        this.stats = {
            totalLampHits: 0,
            totalBuildingHits: 0,
            totalWaterDives: 0,
            totalOffroadDrives: 0,
            totalPoliceRamHits: 0,
            star1LampHits: 0,
            star1BuildingHits: 0,
            star1WaterDives: 0,
            star1PoliceRamHits: 0
        };
        this.callbacks.onWantedLevelChanged(0);
    }
}
