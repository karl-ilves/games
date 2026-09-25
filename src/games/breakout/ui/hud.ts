import { GameStats } from '../types';

export class BreakoutHud {
    private scoreEl: HTMLElement | null;
    private highScoreEl: HTMLElement | null;
    private bricksEl: HTMLElement | null;
    private gameOverModal: HTMLElement | null;
    private victoryModal: HTMLElement | null;
    private finalScoreEl: HTMLElement | null;
    private finalBricksEl: HTMLElement | null;
    private rewardPbxEl: HTMLElement | null;
    private soundBtn: HTMLElement | null;

    constructor(
        private onRestart: () => void,
        private onToggleSound: () => boolean
    ) {
        this.scoreEl = document.getElementById('hud-score');
        this.highScoreEl = document.getElementById('hud-highscore');
        this.bricksEl = document.getElementById('hud-bricks');
        this.gameOverModal = document.getElementById('game-over-modal');
        this.victoryModal = document.getElementById('victory-modal');
        this.finalScoreEl = document.getElementById('final-score-val');
        this.finalBricksEl = document.getElementById('final-bricks-val');
        this.rewardPbxEl = document.getElementById('reward-pbx-val');
        this.soundBtn = document.getElementById('btn-toggle-sound');

        this.bindEvents();
    }

    private bindEvents() {
        const restartBtn = document.getElementById('btn-restart-game');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.hideModals();
                this.onRestart();
            });
        }

        const victoryRestartBtn = document.getElementById('btn-victory-restart');
        if (victoryRestartBtn) {
            victoryRestartBtn.addEventListener('click', () => {
                this.hideModals();
                this.onRestart();
            });
        }

        if (this.soundBtn) {
            this.soundBtn.addEventListener('click', () => {
                const enabled = this.onToggleSound();
                if (this.soundBtn) {
                    this.soundBtn.textContent = enabled ? '🔊 Heli: SEES' : '🔇 Heli: VÄLJAS';
                }
            });
        }
    }

    public updateStats(stats: GameStats) {
        if (this.scoreEl) {
            this.scoreEl.textContent = `SKOOR: ${stats.score}`;
        }
        if (this.highScoreEl) {
            this.highScoreEl.textContent = `REKORD: ${stats.highScore}`;
        }
        if (this.bricksEl) {
            const remaining = Math.max(0, stats.totalBricks - stats.bricksDestroyed);
            this.bricksEl.textContent = `ROHELISED RUUDUD: ${remaining}`;
        }
    }

    public showGameOver(stats: GameStats) {
        if (this.finalScoreEl) this.finalScoreEl.textContent = stats.score.toString();
        if (this.finalBricksEl) this.finalBricksEl.textContent = stats.bricksDestroyed.toString();
        if (this.rewardPbxEl) this.rewardPbxEl.textContent = `+${stats.playbuxReward}`;

        if (this.gameOverModal) {
            this.gameOverModal.style.display = 'flex';
        }
    }

    public showVictory(stats: GameStats) {
        const victoryScore = document.getElementById('victory-score-val');
        const victoryReward = document.getElementById('victory-reward-val');
        if (victoryScore) victoryScore.textContent = stats.score.toString();
        if (victoryReward) victoryReward.textContent = `+${stats.playbuxReward}`;

        if (this.victoryModal) {
            this.victoryModal.style.display = 'flex';
        }
    }

    public hideModals() {
        if (this.gameOverModal) this.gameOverModal.style.display = 'none';
        if (this.victoryModal) this.victoryModal.style.display = 'none';
    }
}
