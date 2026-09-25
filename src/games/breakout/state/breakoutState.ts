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

    public initLevel(totalBricks: number) {
        this.totalBricks = totalBricks;
        this.bricksDestroyed = 0;
        this.score = 0;
        this.lives = 1;
        this.activeBalls = 1;
        this.isGameOver = false;
        this.isVictory = false;
        this.lastEarnedPbx = 0;
    }

    public addBalls(count: number = 3) {
        this.activeBalls += count;
    }

    public getActiveBalls(): number {
        return this.activeBalls;
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

    public onBrickDestroyed(points: number): boolean {
        this.bricksDestroyed++;
        this.addScore(points);
        if (this.bricksDestroyed >= this.totalBricks && this.totalBricks > 0) {
            this.setVictory();
            return true;
        }
        return false;
    }

    public setDeath(): GameStats {
        this.lives = 0;
        this.isGameOver = true;
        this.saveHighScore();

        // Calculate Playbux reward based on destroyed bricks
        const reward = Math.max(5, this.bricksDestroyed * BREAKOUT_CONFIG.PBX_REWARD.perBrick);
        this.lastEarnedPbx = reward;
        try {
            if (yardService && typeof yardService.addPlaybux === 'function') {
                yardService.addPlaybux(reward, 'Breakout Game Over Reward');
            }
        } catch (e) {
            console.warn('Failed to reward Playbux:', e);
        }

        return this.getStats();
    }

    public setVictory(): GameStats {
        this.isVictory = true;
        this.isGameOver = false;
        this.saveHighScore();

        const reward = Math.max(50, this.bricksDestroyed * BREAKOUT_CONFIG.PBX_REWARD.perBrick + BREAKOUT_CONFIG.PBX_REWARD.clearBonus);
        this.lastEarnedPbx = reward;
        try {
            if (yardService && typeof yardService.addPlaybux === 'function') {
                yardService.addPlaybux(reward, 'Breakout Stage Cleared');
            }
        } catch (e) {
            console.warn('Failed to reward Playbux:', e);
        }

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
        return this.bricksDestroyed >= this.totalBricks && this.totalBricks > 0;
    }

    public isDead(): boolean {
        return this.isGameOver;
    }
}
