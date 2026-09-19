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
        totalPoliceRamHits: 0,
        star1LampHits: 0,
        star1BuildingHits: 0,
        star1WaterDives: 0,
        star1PoliceRamHits: 0,
        star2LampHits: 0,
        star2BuildingHits: 0,
        star2PoliceRamHits: 0,
        star3LampHits: 0,
        star3BuildingHits: 0,
        star3PoliceRamHits: 0
    };

    private callbacks: WantedSystemCallbacks;
    private lastBuildingHitTime = 0;
    private lastWaterDiveTime = 0;
    private lastPoliceRamTime = 0;

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
        } else if (this.wantedLevel === 2) {
            this.stats.star2LampHits++;
            if (this.stats.star2LampHits >= 10) {
                this.setWantedLevel(3);
            }
        } else if (this.wantedLevel === 3) {
            this.stats.star3LampHits++;
            if (this.stats.star3LampHits >= 20) {
                this.setWantedLevel(4);
            }
        }
    }

    public reportBuildingCollision(): void {
        const now = Date.now();
        // Debounce continuous contact
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
        } else if (this.wantedLevel === 2) {
            this.stats.star2BuildingHits++;
            if (this.stats.star2BuildingHits >= 10) {
                this.setWantedLevel(3);
            }
        } else if (this.wantedLevel === 3) {
            this.stats.star3BuildingHits++;
            if (this.stats.star3BuildingHits >= 20) {
                this.setWantedLevel(4);
            }
        }
    }

    public reportOffroadOrWater(isWater: boolean): void {
        // User explicitly stated: "kui sõidan autoteelt välja siis ikka ei tule politseid"
        // Offroad grass/nature driving does NOT summon police.
        if (!isWater) return;

        const now = Date.now();
        if (now - this.lastWaterDiveTime < 1500) return;
        this.lastWaterDiveTime = now;

        this.stats.totalWaterDives++;

        if (this.wantedLevel === 0) {
            this.setWantedLevel(1);
        } else if (this.wantedLevel === 1) {
            this.stats.star1WaterDives++;
            if (this.stats.star1WaterDives >= 1) {
                this.setWantedLevel(2);
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
            if (this.stats.star1PoliceRamHits >= 1) {
                this.setWantedLevel(2);
            }
        } else if (this.wantedLevel === 2) {
            this.stats.star2PoliceRamHits++;
            if (this.stats.star2PoliceRamHits >= 1) {
                this.setWantedLevel(3);
            }
        } else if (this.wantedLevel === 3) {
            this.stats.star3PoliceRamHits++;
            if (this.stats.star3PoliceRamHits >= 1) {
                this.setWantedLevel(4);
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
            totalPoliceRamHits: 0,
            star1LampHits: 0,
            star1BuildingHits: 0,
            star1WaterDives: 0,
            star1PoliceRamHits: 0,
            star2LampHits: 0,
            star2BuildingHits: 0,
            star2PoliceRamHits: 0,
            star3LampHits: 0,
            star3BuildingHits: 0,
            star3PoliceRamHits: 0
        };
        this.callbacks.onWantedLevelChanged(0);
    }
}
