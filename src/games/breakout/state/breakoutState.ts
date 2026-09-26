import { yardService } from '../../../shared/yardService';
import { GameStats } from '../types';
import { BREAKOUT_CONFIG } from '../catalog';

export class BreakoutState {
    private score: number = 0;
    private highScore: number = 0;
    private bricksDestroyed: number = 0;
    private totalBricks: number = 0;
    private lives: number = 1; // "kui pall kukkub alla sa sured" -> 1 ball / death on fall
    private activeBalls: number = 1;
    private level: number = 1;
    private maxLevel: number = 2;
    private isLevelComplete: boolean = false;
    private isGameOver: boolean = false;
    private isVictory: boolean = false;
    private lastEarnedPbx: number = 0;

    constructor() {
        this.loadHighScore();
    }

    private loadHighScore() {
        try {
            const saved = localStorage.getItem('playard_breakout_highscore');
            if (saved) this.highScore = parseInt(saved, 10) || 0;
        } catch {
            this.highScore = 0;
        }
    }

    private saveHighScore() {
        try {
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('playard_breakout_highscore', this.highScore.toString());
            }
        } catch {}
    }

    public initLevel(totalBricks: number, resetProgress: boolean = false) {
        if (resetProgress) {
            this.level = 1;
            this.score = 0;
        }
        this.totalBricks = totalBricks;
        this.bricksDestroyed = 0;
        this.lives = 1;
        this.activeBalls = 1;
        this.isGameOver = false;
        this.isLevelComplete = false;
        this.isVictory = false;
        this.lastEarnedPbx = 0;
    }

    public addBalls(count: number = 3) {
        this.activeBalls += count;
    }

    public getActiveBalls(): number {
        return this.activeBalls;
    }

    public getLevel(): number {
        return this.level;
    }

    public setLevel(lvl: number) {
        this.level = lvl;
    }

    public nextLevel(): number {
        this.level = Math.min(this.maxLevel, this.level + 1);
        return this.level;
    }

    public onBallLost(): boolean {
        this.activeBalls = Math.max(0, this.activeBalls - 1);
        if (this.activeBalls <= 0) {
            this.setDeath();
            return true; // Game Over
        }
        return false; // Still alive
    }

    public addScore(points: number): number {
        this.score += points;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }
        return this.score;
    }

    public onBrickDestroyed(points: number): { isComplete: boolean; isVictory: boolean } {
        this.bricksDestroyed++;
        this.addScore(points);
        if (this.bricksDestroyed >= this.totalBricks && this.totalBricks > 0) {
            if (this.level < this.maxLevel) {
                this.isLevelComplete = true;
                this.isVictory = false;
                this.awardReward(0, 'Breakout Level 1 Cleared');
                return { isComplete: true, isVictory: false };
            } else {
                this.setVictory();
                return { isComplete: true, isVictory: true };
            }
        }
        return { isComplete: false, isVictory: false };
    }

    private awardReward(_bonus: number, _note: string) {
        // "seal ei saa PBX" - Breakout does not award PBX
        this.lastEarnedPbx = 0;
    }

    public setDeath(): GameStats {
        this.lives = 0;
        this.isGameOver = true;
        this.saveHighScore();

        // "seal ei saa PBX" - Breakout does not award PBX
        this.lastEarnedPbx = 0;

        return this.getStats();
    }

    public setVictory(): GameStats {
        this.isVictory = true;
        this.isLevelComplete = true;
        this.isGameOver = false;
        this.saveHighScore();

        // "seal ei saa PBX" - Breakout does not award PBX
        this.lastEarnedPbx = 0;

        return this.getStats();
    }

    public getStats(): GameStats {
        return {
            score: this.score,
            highScore: this.highScore,
            bricksDestroyed: this.bricksDestroyed,
            totalBricks: this.totalBricks,
            lives: this.lives,
            activeBalls: this.activeBalls,
            level: this.level,
            maxLevel: this.maxLevel,
            isLevelComplete: this.isLevelComplete,
            isGameOver: this.isGameOver,
            isVictory: this.isVictory,
            playbuxReward: this.lastEarnedPbx,
        };
    }

    public getLastEarnedPbx(): number {
        return this.lastEarnedPbx;
    }

    public getScore(): number {
        return this.score;
    }

    public getBricksDestroyed(): number {
        return this.bricksDestroyed;
    }

    public isCleared(): boolean {
        return (this.isLevelComplete || this.isVictory) && this.totalBricks > 0;
    }

    public isDead(): boolean {
        return this.isGameOver;
    }
}
