import { GameStats } from '../types';

export class SnakeHud {
    private scoreEl: HTMLElement | null;
    private highScoreEl: HTMLElement | null;
    private lengthEl: HTMLElement | null;
    private levelEl: HTMLElement | null;
    private powerUpEl: HTMLElement | null;
    private soundBtn: HTMLButtonElement | null;
    private pauseBtn: HTMLButtonElement | null;

    private gameOverModal: HTMLElement | null;
    private pauseModal: HTMLElement | null;
    private finalScoreEl: HTMLElement | null;
    private finalLengthEl: HTMLElement | null;
    private finalApplesEl: HTMLElement | null;
    private newHighScoreBadge: HTMLElement | null;

    private onRestart: () => void;
    private onTogglePause: () => void;
    private onToggleSound: () => void;

    constructor(
        onRestart: () => void,
        onTogglePause: () => void,
        onToggleSound: () => void
    ) {
        this.onRestart = onRestart;
        this.onTogglePause = onTogglePause;
        this.onToggleSound = onToggleSound;

        this.scoreEl = document.getElementById('hud-score');
        this.highScoreEl = document.getElementById('hud-highscore');
        this.lengthEl = document.getElementById('hud-length');
        this.levelEl = document.getElementById('hud-level');
        this.powerUpEl = document.getElementById('hud-powerup');
        this.soundBtn = document.getElementById('btn-toggle-sound') as HTMLButtonElement;
        this.pauseBtn = document.getElementById('btn-pause') as HTMLButtonElement;

        this.gameOverModal = document.getElementById('game-over-modal');
        this.pauseModal = document.getElementById('pause-modal');
        this.finalScoreEl = document.getElementById('final-score-val');
        this.finalLengthEl = document.getElementById('final-length-val');
        this.finalApplesEl = document.getElementById('final-apples-val');
        this.newHighScoreBadge = document.getElementById('new-highscore-badge');

        this.bindEvents();
    }

    private bindEvents() {
        const restartBtn = document.getElementById('btn-restart-game');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.onRestart());
        }

        const resumeBtn = document.getElementById('btn-pause-resume');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => this.onTogglePause());
        }

        if (this.pauseBtn) {
            this.pauseBtn.addEventListener('click', () => this.onTogglePause());
        }

        if (this.soundBtn) {
            this.soundBtn.addEventListener('click', () => {
                this.onToggleSound();
            });
        }
    }

    public updateStats(stats: GameStats) {
        if (this.scoreEl) this.scoreEl.innerText = `SKOOR: ${stats.score}`;
        if (this.highScoreEl) this.highScoreEl.innerText = `REKORD: ${stats.highScore}`;
        if (this.lengthEl) this.lengthEl.innerText = `PIKKUS: ${stats.length}`;
        if (this.levelEl) this.levelEl.innerText = `TASE ${stats.level}`;

        if (this.powerUpEl) {
            if (stats.activePowerUp) {
                this.powerUpEl.style.display = 'inline-flex';
                if (stats.activePowerUp === 'freeze') {
                    this.powerUpEl.innerText = `🫐 AEGLUSTUS: ${stats.powerUpTimeRemaining}s`;
                    this.powerUpEl.style.borderColor = '#00d2d3';
                    this.powerUpEl.style.color = '#00d2d3';
                } else if (stats.activePowerUp === 'magnet') {
                    this.powerUpEl.innerText = `🧲 MAGNET: ${stats.powerUpTimeRemaining}s`;
                    this.powerUpEl.style.borderColor = '#a55eea';
                    this.powerUpEl.style.color = '#a55eea';
                }
            } else {
                this.powerUpEl.style.display = 'none';
            }
        }
    }

    public updateSoundButton(enabled: boolean) {
        if (this.soundBtn) {
            this.soundBtn.innerText = enabled ? '🔊 Heli: SEES' : '🔇 Heli: VÄLJAS';
            this.soundBtn.style.color = enabled ? '#2ed573' : '#a4b0be';
        }
    }

    public showGameOver(stats: GameStats) {
        if (this.finalScoreEl) this.finalScoreEl.innerText = String(stats.score);
        if (this.finalLengthEl) this.finalLengthEl.innerText = String(stats.length);
        if (this.finalApplesEl) this.finalApplesEl.innerText = String(stats.applesEaten);

        if (this.newHighScoreBadge) {
            const isRecord = stats.score > 0 && stats.score >= stats.highScore;
            this.newHighScoreBadge.style.display = isRecord ? 'inline-block' : 'none';
        }

        if (this.gameOverModal) {
            this.gameOverModal.style.display = 'flex';
        }
    }

    public isGameOverVisible(): boolean {
        return this.gameOverModal !== null && this.gameOverModal.style.display === 'flex';
    }

    public hideGameOver() {
        if (this.gameOverModal) {
            this.gameOverModal.style.display = 'none';
        }
    }

    public setPauseVisible(visible: boolean) {
        if (this.pauseModal) {
            this.pauseModal.style.display = visible ? 'flex' : 'none';
        }
        if (this.pauseBtn) {
            this.pauseBtn.innerText = visible ? '▶️ Jätka' : '⏸️ Paus';
        }
    }

    public hideModals() {
        this.hideGameOver();
        this.setPauseVisible(false);
    }
}
