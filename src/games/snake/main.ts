import { yardService } from '../../shared/yardService';
import { SNAKE_CONFIG } from './catalog';
import { SnakeAudio } from './audio';
import { SnakeState } from './state/snakeState';
import { ParticleSystem } from './systems/particles';
import { InputManager } from './systems/input';
import { SnakeHud } from './ui/hud';
import { SnakeRenderer } from './world/renderer';
import { StartScreenUI } from './ui/startScreen';
import { FriendsModalUI } from './ui/friendsModal';
import { DemoAiSystem } from './systems/demoAi';
import { SnakeMultiplayerSystem } from './systems/multiplayer';
import { Direction } from './types';

export class SnakeGame {
    public canvas!: HTMLCanvasElement;
    public ctx!: CanvasRenderingContext2D;
    public state = new SnakeState();
    public audio = new SnakeAudio();
    public particles = new ParticleSystem();
    public input!: InputManager;
    public hud!: SnakeHud;
    public startScreen!: StartScreenUI;
    public friendsModal!: FriendsModalUI;
    public demoAi!: DemoAiSystem;
    public multiplayer!: SnakeMultiplayerSystem;

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
        this.init();
    }

    private init() {
        this.canvas = document.getElementById('snake-canvas') as HTMLCanvasElement;
        const ctx = this.canvas?.getContext('2d');
        if (!this.canvas || !ctx) return;
        this.ctx = ctx;

        yardService.recordPlayedGame({
            id: 'snake',
            title: '🐍 Ussimäng (Snake 2D Arcade)',
            description: 'Klassikaline ja kaasahaarav neoon-ussimäng! Korja õunu, püüa boonuseid ja väldi seinu.',
            url: './games/snake/index.html',
            icon: '🐍',
            badgeText: '🐍 2D Neon Arcade',
            badgeColor: '#2ed573',
        });

        this.demoAi = new DemoAiSystem(this.state.cols, this.state.rows);
        this.multiplayer = new SnakeMultiplayerSystem();
        this.input = new InputManager(
            this.canvas,
            (d) => this.handleDirectionInput(d),
            () => this.togglePause(),
            (d) => this.handleDirection2Input(d)
        );

        this.hud = new SnakeHud(
            () => this.restartCurrentMode(),
            () => this.togglePause(),
            () => this.hud.updateSoundButton(this.audio.toggleSound())
        );
        this.hud.updateSoundButton(this.audio.getSoundEnabled());

        this.startScreen = new StartScreenUI({
            onPlaySolo: () => this.startSoloGame(),
            onPlayWithFriends: () => this.friendsModal.openFriendsModal(),
        });

        this.friendsModal = new FriendsModalUI({
            onSendInvite: (user) => this.multiplayer.sendInvite(user),
            onAcceptInvite: (inv) => {
                this.multiplayer.respondToInvite(inv, true);
                this.startMultiplayerGame(inv.fromDisplayName || inv.fromUsername);
            },
            onDeclineInvite: (inv) => this.multiplayer.respondToInvite(inv, false),
            onStartLocal2Player: () => this.startLocal2PlayerGame(),
        });

        this.multiplayer.onInviteReceived((inv) => this.friendsModal.showInviteConfirmation(inv));
        this.multiplayer.onInviteResponse((accepted, friend) => {
            if (accepted) {
                this.friendsModal.closeFriendsModal();
                this.startMultiplayerGame(friend);
            } else {
                this.friendsModal.setStatus(`@${friend} lükkas kutse tagasi.`);
            }
        });
        this.multiplayer.onRemoteMove((dir, body, score) => {
            if (this.state.mode === 'multiplayer') {
                this.state.direction2 = dir;
                this.state.body2 = body;
                this.state.score2 = score;
                this.hud.updateStats(this.state.getStats());
            }
        });

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.state.reset('demo');
        this.hud.hideModals();
        this.hud.updateStats(this.state.getStats());

        this.isRunning = true;
        requestAnimationFrame((t) => this.loop(t));
    }

    public startSoloGame() {
        this.startScreen.hide();
        this.input.isTwoPlayerMode = false;
        this.resetGameMode('solo');
    }

    public startLocal2PlayerGame() {
        this.startScreen.hide();
        this.input.isTwoPlayerMode = true;
        this.resetGameMode('multiplayer');
    }

    public startMultiplayerGame(_opponentName: string) {
        this.startScreen.hide();
        this.input.isTwoPlayerMode = false;
        this.resetGameMode('multiplayer');
    }

    private resetGameMode(mode: 'solo' | 'multiplayer' | 'demo') {
        this.state.reset(mode);
        this.particles.clear();
        this.stepTimer = 0;
        this.hud.hideModals();
        this.hud.updateStats(this.state.getStats());
    }

    public restartCurrentMode() {
        this.resetGameMode(this.state.mode === 'demo' ? 'solo' : this.state.mode);
        this.shakeDuration = 0;
    }

    public restart() {
        this.restartCurrentMode();
    }

    public handleDirectionInput(dir: Direction) {
        if (this.state.mode === 'demo') {
            this.startSoloGame();
            return;
        }
        if (this.state.setDirection(dir)) this.audio.playTurn();
    }

    public handleDirection2Input(dir: Direction) {
        if (this.state.mode === 'multiplayer' && this.state.setDirection2(dir)) {
            this.audio.playTurn();
        }
    }

    public togglePause() {
        if (this.state.mode === 'demo') return;
        this.hud.setPauseVisible(this.state.togglePause());
    }

    public resize() {
        if (!this.canvas) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const parent = this.canvas.parentElement || document.body;
        const rect = parent.getBoundingClientRect();

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);

        const topPadding = 70;
        const bottomPadding = window.innerWidth <= 768 ? 160 : 30;
        const availableW = rect.width - 20;
        const availableH = rect.height - topPadding - bottomPadding;
        const maxSide = Math.max(260, Math.min(availableW, availableH, 650));

        this.tileSize = Math.floor(maxSide / this.state.cols);
        this.playAreaWidth = this.tileSize * this.state.cols;
        this.playAreaHeight = this.tileSize * this.state.rows;
        this.offsetX = Math.floor((rect.width - this.playAreaWidth) / 2);
        this.offsetY = Math.floor(topPadding + (availableH - this.playAreaHeight) / 2);
    }

    private loop(timestamp: number) {
        if (!this.isRunning) return;
        if (this.lastTime === 0) this.lastTime = timestamp;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        this.update(dt, timestamp / 1000);
        this.render(timestamp / 1000);
        requestAnimationFrame((t) => this.loop(t));
    }

    public update(dt: number, _time: number) {
        this.particles.update(dt);
        if (this.shakeDuration > 0) this.shakeDuration -= dt;

        const stats = this.state.getStats();
        if (stats.isGameOver) {
            if (this.state.mode === 'demo') this.state.reset('demo');
            else this.hud.showGameOver(stats);
            return;
        }
        if (stats.isPaused) return;

        this.state.updatePowerUps(dt);
        this.hud.updateStats(this.state.getStats());

        const stepInterval = 1 / this.state.getEffectiveSpeed();
        this.stepTimer += dt;

        while (this.stepTimer >= stepInterval) {
            this.stepTimer -= stepInterval;
            if (this.state.mode === 'demo') {
                const nextDir = this.demoAi.getNextDirection(
                    this.state.body, this.state.direction, this.state.foodItems
                );
                this.state.setDirection(nextDir);
            }

            const res = this.state.step();
            if (res.ateFood) {
                const fx = this.offsetX + res.ateFood.x * this.tileSize + this.tileSize / 2;
                const fy = this.offsetY + res.ateFood.y * this.tileSize + this.tileSize / 2;
                this.particles.emit(fx, fy, SNAKE_CONFIG.FOOD[res.ateFood.type].color, 14, 150);

                if (this.state.mode !== 'demo') {
                    if (res.ateFood.type === 'apple') this.audio.playEatApple();
                    else if (res.ateFood.type === 'star') this.audio.playEatBonus();
                    else this.audio.playPowerUp();
                    if (res.isNewHighScore) this.audio.playHighScore();
                }
                this.hud.updateStats(this.state.getStats());
            }

            if ((res as any).wrapped && this.state.mode !== 'demo') {
                this.audio.playWrapPortal();
            }

            if (res.isGameOver) {
                if (this.state.mode === 'demo') this.state.reset('demo');
                else this.triggerGameOver();
                break;
            }

            if (this.state.mode === 'multiplayer' && !this.input.isTwoPlayerMode) {
                this.multiplayer.broadcastMove(this.state.direction, this.state.body, this.state.score);
            }
        }
    }

    public triggerGameOver() {
        this.audio.playCrash();
        this.shakeDuration = 0.35;
        this.shakeIntensity = 12;

        if (this.state.body.length > 0) {
            const h = this.state.body[0];
            this.particles.emit(
                this.offsetX + h.x * this.tileSize + this.tileSize / 2,
                this.offsetY + h.y * this.tileSize + this.tileSize / 2,
                '#ff4757', 25, 200
            );
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
        if (this.shakeDuration > 0) {
            this.ctx.translate(
                (Math.random() - 0.5) * this.shakeIntensity,
                (Math.random() - 0.5) * this.shakeIntensity
            );
        }

        SnakeRenderer.renderBackground(
            this.ctx, width, height, this.offsetX, this.offsetY,
            this.playAreaWidth, this.playAreaHeight,
            this.state.cols, this.state.rows, this.tileSize
        );
        SnakeRenderer.renderFood(this.ctx, this.state.foodItems, this.offsetX, this.offsetY, this.tileSize, timeSeconds);
        SnakeRenderer.renderSnake(
            this.ctx, this.state.body, this.state.direction,
            this.state.getStats().activePowerUp, this.offsetX, this.offsetY, this.tileSize, timeSeconds
        );

        if (this.state.body2 && this.state.body2.length > 0) {
            SnakeRenderer.renderSnake(
                this.ctx, this.state.body2, this.state.direction2, null,
                this.offsetX, this.offsetY, this.tileSize, timeSeconds,
                { body: '#00d2d3', head: '#00f2fe', eye: '#ffffff', pupil: '#0984e3' }
            );
        }

        this.particles.render(this.ctx);
        if (this.state.mode === 'demo') {
            SnakeRenderer.renderDemoWatermark(this.ctx, this.offsetX, this.offsetY, this.playAreaWidth, timeSeconds);
        }
        this.ctx.restore();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const game = new SnakeGame();
    (window as unknown as { snakeGame: SnakeGame }).snakeGame = game;
});
