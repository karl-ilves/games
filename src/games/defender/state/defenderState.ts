import { GameStats, PowerUpType } from '../types';

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

    // Powerup states
    private tripleShotTimer: number = 0;
    private speedBoostTimer: number = 0;
    private empCharge: number = 50; // starts at 50%

    constructor() {
        this.loadHighScore();
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
        if (val) {
            // Playard Owner benefits: +20% starting shield
            this.earthMaxShield = 120;
            this.earthShield = 120;
        }
    }

    public getIsOwner(): boolean {
        return this.isOwner;
    }

    public addScore(points: number): number {
        const multiplied = points * this.combo;
        this.score += multiplied;
        this.asteroidsDestroyed++;
        this.comboTimer = 3.5; // combo reset in 3.5s
        this.combo = Math.min(this.combo + 1, 8);
        this.empCharge = Math.min(100, this.empCharge + 4);

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

        // Slow shield auto-repair (0.5 SP / sec)
        if (this.earthShield < this.earthMaxShield && this.earthHp > 0) {
            this.earthShield = Math.min(this.earthMaxShield, this.earthShield + 0.5 * dt);
        }
    }

    public applyEarthDamage(dmg: number): { shieldDmg: number; hpDmg: number; isDestroyed: boolean } {
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

        if (this.earthHp <= 0) {
            this.isGameOver = true;
            this.saveHighScore();
        }

        // Impact resets combo
        this.combo = 1;
        this.comboTimer = 0;

        return { shieldDmg, hpDmg, isDestroyed: this.earthHp <= 0 };
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
            empChargePct: Math.round(this.empCharge)
        };
    }

    public getIsGameOver(): boolean {
        return this.isGameOver;
    }

    public resetGame() {
        this.score = 0;
        this.asteroidsDestroyed = 0;
        this.wave = 1;
        this.earthHp = this.earthMaxHp;
        this.earthShield = this.earthMaxShield;
        this.combo = 1;
        this.comboTimer = 0;
        this.tripleShotTimer = 0;
        this.speedBoostTimer = 0;
        this.empCharge = 50;
        this.isGameOver = false;
    }
}
