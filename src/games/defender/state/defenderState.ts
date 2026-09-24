import { GameStats, PowerUpType } from '../types';
import { yardService } from '../../../shared/yardService';

export class DefenderState {
    private score: number = 0;
    private highScore: number = 0;
    private asteroidsDestroyed: number = 0;
    private wave: number = 1;

    private earthHp: number = 100;
    private earthMaxHp: number = 100;
    private earthShield: number = 100;
    private earthMaxShield: number = 100;

    private combo: number = 1;
    private comboTimer: number = 0;
    private isGameOver: boolean = false;
    private isOwner: boolean = false;
    private lastEarnedPbx: number = 0;

    private ownedUpgrades: Set<string> = new Set();

    // Powerup states
    private tripleShotTimer: number = 0;
    private speedBoostTimer: number = 0;
    private empCharge: number = 50; // starts at 50%

    constructor() {
        this.loadHighScore();
        this.loadUpgrades();
        this.applyPassiveUpgrades();
    }

    private loadUpgrades() {
        try {
            const raw = localStorage.getItem('playard_defender_upgrades');
            if (raw) {
                const list = JSON.parse(raw);
                if (Array.isArray(list)) {
                    this.ownedUpgrades = new Set(list);
                }
            }
        } catch {
            this.ownedUpgrades = new Set();
        }
    }

    private saveUpgrades() {
        try {
            localStorage.setItem('playard_defender_upgrades', JSON.stringify(Array.from(this.ownedUpgrades)));
        } catch {}
    }

    public isUpgradeOwned(id: string): boolean {
        return this.ownedUpgrades.has(id);
    }

    public unlockUpgrade(id: string): boolean {
        this.ownedUpgrades.add(id);
        this.saveUpgrades();
        this.applyPassiveUpgrades();
        return true;
    }

    public hasHyperBlaster(): boolean {
        return this.isUpgradeOwned('defender_hyper_blaster');
    }

    public hasTitaniumShield(): boolean {
        return this.isUpgradeOwned('defender_titanium_shield');
    }

    public hasMegaEmp(): boolean {
        return this.isUpgradeOwned('defender_mega_emp');
    }

    public hasDefenseDrone(): boolean {
        return this.isUpgradeOwned('defender_defense_drone');
    }

    public hasGoldenMagnet(): boolean {
        return this.isUpgradeOwned('defender_golden_magnet');
    }

    private applyPassiveUpgrades() {
        let baseShield = this.isOwner ? 120 : 100;
        if (this.hasTitaniumShield()) {
            baseShield += 50;
        }
        this.earthMaxShield = baseShield;
        if (this.earthShield > this.earthMaxShield || this.earthShield === 100 || this.earthShield === 120) {
            this.earthShield = this.earthMaxShield;
        }
        if (this.hasMegaEmp() && this.empCharge < 100) {
            this.empCharge = 100;
        }
    }

    private loadHighScore() {
        try {
            const saved = localStorage.getItem('playard_defender_highscore');
            if (saved) this.highScore = parseInt(saved, 10) || 0;
        } catch {
            this.highScore = 0;
        }
    }

    private saveHighScore() {
        try {
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('playard_defender_highscore', this.highScore.toString());
            }
        } catch {
            // Ignore storage errors
        }
    }

    public setIsOwner(val: boolean) {
        this.isOwner = val;
        this.applyPassiveUpgrades();
    }

    public getIsOwner(): boolean {
        return this.isOwner;
    }

    public addScore(points: number): number {
        const bonusMult = this.hasGoldenMagnet() ? 2 : 1;
        const multiplied = points * this.combo * bonusMult;
        this.score += multiplied;
        this.asteroidsDestroyed++;
        this.comboTimer = 3.5; // combo reset in 3.5s
        this.combo = Math.min(this.combo + 1, 8);
        const empChargeStep = this.hasMegaEmp() ? 6 : 4;
        this.empCharge = Math.min(100, this.empCharge + empChargeStep);

        if (this.score > this.highScore) {
            this.saveHighScore();
        }
        return multiplied;
    }

    public update(dt: number) {
        if (this.isGameOver) return;

        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.combo = 1;
            }
        }

        if (this.tripleShotTimer > 0) {
            this.tripleShotTimer -= dt;
        }

        if (this.speedBoostTimer > 0) {
            this.speedBoostTimer -= dt;
        }

        // Shield auto-repair (0.5 SP / sec, or 1.2 SP / sec with Titanium shield)
        const repairRate = this.hasTitaniumShield() ? 1.2 : 0.5;
        if (this.earthShield < this.earthMaxShield && this.earthHp > 0) {
            this.earthShield = Math.min(this.earthMaxShield, this.earthShield + repairRate * dt);
        }
    }

    public calculateMissionReward(): number {
        let pbx = 50; // Base mission reward
        pbx += this.asteroidsDestroyed * 2;
        pbx += Math.floor(this.score / 60);
        pbx += (this.wave - 1) * 25;
        if (this.hasGoldenMagnet()) {
            pbx *= 2;
        }
        return Math.max(25, Math.round(pbx));
    }

    public applyEarthDamage(dmg: number): { shieldDmg: number; hpDmg: number; isDestroyed: boolean; earnedPbx?: number } {
        let remainingDmg = dmg;
        let shieldDmg = 0;
        let hpDmg = 0;

        if (this.earthShield > 0) {
            if (this.earthShield >= remainingDmg) {
                this.earthShield -= remainingDmg;
                shieldDmg = remainingDmg;
                remainingDmg = 0;
            } else {
                shieldDmg = this.earthShield;
                remainingDmg -= this.earthShield;
                this.earthShield = 0;
            }
        }

        if (remainingDmg > 0) {
            this.earthHp = Math.max(0, this.earthHp - remainingDmg);
            hpDmg = remainingDmg;
        }

        if (this.earthHp <= 0 && !this.isGameOver) {
            this.isGameOver = true;
            this.saveHighScore();
            // Award money (Pbx) to the player upon mission failed!
            this.lastEarnedPbx = this.calculateMissionReward();
            try {
                yardService.addYards(this.lastEarnedPbx, '2D Earth Defender Mission Reward');
            } catch (err) {
                console.warn('Could not award Pbx:', err);
            }
        }

        // Impact resets combo
        this.combo = 1;
        this.comboTimer = 0;

        return { shieldDmg, hpDmg, isDestroyed: this.earthHp <= 0, earnedPbx: this.lastEarnedPbx };
    }

    public activatePowerUp(type: PowerUpType) {
        switch (type) {
            case 'triple_shot':
                this.tripleShotTimer = 10; // 10 seconds of triple laser
                break;
            case 'shield_restore':
                this.earthShield = Math.min(this.earthMaxShield, this.earthShield + 40);
                this.earthHp = Math.min(this.earthMaxHp, this.earthHp + 15);
                break;
            case 'emp_nuke':
                this.empCharge = 100;
                break;
            case 'speed_boost':
                this.speedBoostTimer = 12;
                break;
            case 'coins':
                this.addScore(300);
                break;
        }
    }

    public canFireEmp(): boolean {
        return this.empCharge >= 100;
    }

    public consumeEmp(): boolean {
        if (this.empCharge >= 100) {
            this.empCharge = 0;
            return true;
        }
        return false;
    }

    public hasTripleShot(): boolean {
        return this.tripleShotTimer > 0;
    }

    public hasSpeedBoost(): boolean {
        return this.speedBoostTimer > 0;
    }

    public advanceWave() {
        this.wave++;
        // Small shield repair on wave clear
        this.earthShield = Math.min(this.earthMaxShield, this.earthShield + 30);
    }

    public getLastEarnedPbx(): number {
        return this.lastEarnedPbx;
    }

    public getStats(): GameStats {
        return {
            score: this.score,
            highScore: this.highScore,
            asteroidsDestroyed: this.asteroidsDestroyed,
            wave: this.wave,
            earthHp: Math.round(this.earthHp),
            earthMaxHp: this.earthMaxHp,
            earthShield: Math.round(this.earthShield),
            earthMaxShield: this.earthMaxShield,
            combo: this.combo,
            empCharged: this.empCharge >= 100,
            empChargePct: Math.round(this.empCharge),
            earnedPbx: this.lastEarnedPbx
        };
    }

    public getIsGameOver(): boolean {
        return this.isGameOver;
    }

    public resetGame() {
        this.score = 0;
        this.asteroidsDestroyed = 0;
        this.wave = 1;
        this.lastEarnedPbx = 0;
        this.applyPassiveUpgrades();
        this.earthHp = this.earthMaxHp;
        this.earthShield = this.earthMaxShield;
        this.combo = 1;
        this.comboTimer = 0;
        this.tripleShotTimer = 0;
        this.speedBoostTimer = 0;
        this.empCharge = this.hasMegaEmp() ? 100 : 50;
        this.isGameOver = false;
    }
}
