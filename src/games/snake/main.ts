import { yardService } from '../../shared/yardService';
import { SNAKE_CONFIG } from './catalog';
import { SnakeAudio } from './audio';
import { SnakeState } from './state/snakeState';
import { ParticleSystem } from './systems/particles';
import { InputManager } from './systems/input';
import { SnakeHud } from './ui/hud';
import { SnakeRenderer } from './world/renderer';
import { Direction } from './types';

export class SnakeGame {
    public canvas!: HTMLCanvasElement;
    public ctx!: CanvasRenderingContext2D;

    public state: SnakeState;
    public audio: SnakeAudio;
    public particles: ParticleSystem;
    public input!: InputManager;
    public hud!: SnakeHud;

    public tileSize: number = SNAKE_CONFIG.GRID.defaultTileSize;
    public playAreaWidth: number = 600;
    public playAreaHeight: number = 600;
    public offsetX: number = 0;
    public offsetY: number = 0;

    private lastTime: number = 0;
    private stepTimer: number = 0;
    private isRunning: boolean = false;
    private shakeDuration: number = 0;
    private shakeIntensity: number = 0;

    constructor() {
        this.state = new SnakeState();
        this.audio = new SnakeAudio();
        this.particles = new ParticleSystem();

        this.init();
    }

    private init() {
        this.canvas = document.getElementById('snake-canvas') as HTMLCanvasElement;
        if (!this.canvas) return;

        const context = this.canvas.getContext('2d');
        if (!context) return;
        this.ctx = context;

        yardService.recordPlayedGame({
            id: 'snake',
            title: '🐍 Ussimäng (Snake 2D Arcade)',
            description: 'Klassikaline ja kaasahaarav neoon-ussimäng! Korja õunu, püüa boonuseid ja väldi seinu.',
            url: './games/snake/index.html',
            icon: '🐍',
            badgeText: '🐍 2D Neon Arcade',
            badgeColor: '#2ed573',
        });

        this.input = new InputManager(
            this.canvas,
            (dir: Direction) => this.handleDirectionInput(dir),
            () => this.togglePause()
        );

        this.hud = new SnakeHud(
            () => this.restart(),
            () => this.togglePause(),
            () => {
                const enabled = this.audio.toggleSound();
                this.hud.updateSoundButton(enabled);
            }
        );
        this.hud.updateSoundButton(this.audio.getSoundEnabled());

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.restart();

        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    public handleDirectionInput(dir: Direction) {
        const changed = this.state.setDirection(dir);
        if (changed) {
            this.audio.playTurn();
        }
    }

    public togglePause() {
        const isPaused = this.state.togglePause();
        this.hud.setPauseVisible(isPaused);
    }

    public restart() {
        this.state.reset();
        this.particles.clear();
        this.shakeDuration = 0;
        this.stepTimer = 0;
        this.hud.hideModals();
        this.hud.updateStats(this.state.getStats());
    }

    public resize() {
        if (!this.canvas) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const parent = this.canvas.parentElement || document.body;
        const rect = parent.getBoundingClientRect();

        const logicalW = rect.width;
        const logicalH = rect.height;

        this.canvas.width = logicalW * dpr;
        this.canvas.height = logicalH * dpr;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);

        // Keep grid centered and square inside viewport (leaving room for top HUD)
        const topPadding = 70;
        const bottomPadding = window.innerWidth <= 768 ? 160 : 30; // room for mobile D-pad
        const availableW = logicalW - 20;
        const availableH = logicalH - topPadding - bottomPadding;

        const maxSide = Math.max(260, Math.min(availableW, availableH, 650));
        this.tileSize = Math.floor(maxSide / this.state.cols);
        this.playAreaWidth = this.tileSize * this.state.cols;
        this.playAreaHeight = this.tileSize * this.state.rows;

        this.offsetX = Math.floor((logicalW - this.playAreaWidth) / 2);
        this.offsetY = Math.floor(topPadding + (availableH - this.playAreaHeight) / 2);
    }

    private triggerScreenShake(duration: number = 0.25, intensity: number = 10) {
        this.shakeDuration = duration;
        this.shakeIntensity = intensity;
    }

    private loop(timestamp: number) {
        if (!this.isRunning) return;

        if (this.lastTime === 0) {
            this.lastTime = timestamp;
        }
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        this.update(dt, timestamp / 1000);
        this.render(timestamp / 1000);

        requestAnimationFrame((t) => this.loop(t));
    }

    public update(dt: number, timeSeconds: number) {
        this.particles.update(dt);

        if (this.shakeDuration > 0) {
            this.shakeDuration -= dt;
        }

        const stats = this.state.getStats();
        if (stats.isGameOver) {
            this.hud.showGameOver(stats);
            return;
        }
        if (stats.isPaused) return;

        this.state.updatePowerUps(dt);
        this.hud.updateStats(this.state.getStats());

        // Step accumulator based on steps per second
        const speed = this.state.getEffectiveSpeed();
        const stepInterval = 1 / speed;
        this.stepTimer += dt;

        while (this.stepTimer >= stepInterval) {
            this.stepTimer -= stepInterval;
            const res = this.state.step();

            if (res.ateFood) {
                const fx = this.offsetX + res.ateFood.x * this.tileSize + this.tileSize / 2;
                const fy = this.offsetY + res.ateFood.y * this.tileSize + this.tileSize / 2;

                const color = SNAKE_CONFIG.FOOD[res.ateFood.type].color;
                this.particles.emit(fx, fy, color, 14, 150);

                if (res.ateFood.type === 'apple') {
                    this.audio.playEatApple();
                } else if (res.ateFood.type === 'star') {
                    this.audio.playEatBonus();
                } else {
                    this.audio.playPowerUp();
                }

                if (res.isNewHighScore) {
                    this.audio.playHighScore();
                }

                this.hud.updateStats(this.state.getStats());
            }

            if ((res as any).wrapped) {
                this.audio.playWrapPortal();
                if (this.state.body.length > 0) {
                    const h = this.state.body[0];
                    const hx = this.offsetX + h.x * this.tileSize + this.tileSize / 2;
                    const hy = this.offsetY + h.y * this.tileSize + this.tileSize / 2;
                    this.particles.emit(hx, hy, '#00e676', 8, 90);
                }
            }

            if (res.isGameOver) {
                this.triggerGameOver();
                break;
            }
        }
    }

    public triggerGameOver() {
        this.audio.playCrash();
        this.triggerScreenShake(0.35, 12);

        if (this.state.body.length > 0) {
            const h = this.state.body[0];
            const hx = this.offsetX + h.x * this.tileSize + this.tileSize / 2;
            const hy = this.offsetY + h.y * this.tileSize + this.tileSize / 2;
            this.particles.emit(hx, hy, '#ff4757', 25, 200);
        }

        const finalStats = this.state.getStats();
        this.hud.updateStats(finalStats);
        this.hud.showGameOver(finalStats);
    }

    public render(timeSeconds: number) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = this.canvas.width / dpr;
        const height = this.canvas.height / dpr;

        this.ctx.save();

        // Screen shake
        if (this.shakeDuration > 0) {
            const sx = (Math.random() - 0.5) * this.shakeIntensity;
            const sy = (Math.random() - 0.5) * this.shakeIntensity;
            this.ctx.translate(sx, sy);
        }

        SnakeRenderer.renderBackground(
            this.ctx,
            width,
            height,
            this.offsetX,
            this.offsetY,
            this.playAreaWidth,
            this.playAreaHeight,
            this.state.cols,
            this.state.rows,
            this.tileSize
        );

        SnakeRenderer.renderFood(
            this.ctx,
            this.state.foodItems,
            this.offsetX,
            this.offsetY,
            this.tileSize,
            timeSeconds
        );

        SnakeRenderer.renderSnake(
            this.ctx,
            this.state.body,
            this.state.direction,
            this.state.getStats().activePowerUp,
            this.offsetX,
            this.offsetY,
            this.tileSize,
            timeSeconds
        );

        this.particles.render(this.ctx);

        this.ctx.restore();
    }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
    const game = new SnakeGame();
    (window as unknown as { snakeGame: SnakeGame }).snakeGame = game;
});
