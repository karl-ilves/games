import { yardService } from '../../shared/yardService';
import { Ball, Paddle, Brick, PowerUp } from './types';
import { BREAKOUT_CONFIG } from './catalog';
import { BreakoutAudio } from './audio';
import { BreakoutState } from './state/breakoutState';
import { ParticleSystem } from './systems/particles';
import { InputManager } from './systems/input';
import { PhysicsSystem } from './systems/physics';
import { BreakoutHud } from './ui/hud';
import { createBreakoutLevel } from './world/levelGenerator';
import { BreakoutRenderer } from './world/renderer';

export class BreakoutGame {
    public canvas!: HTMLCanvasElement;
    public ctx!: CanvasRenderingContext2D;

    public state: BreakoutState;
    public audio: BreakoutAudio;
    public particles: ParticleSystem;
    public input!: InputManager;
    public physics: PhysicsSystem;
    public hud!: BreakoutHud;

    public paddle!: Paddle;
    public balls: Ball[] = [];
    public bricks: Brick[] = [];
    public powerUps: PowerUp[] = [];
    public currentMapSignature: string = '';
    public currentPatternName: string = '';

    private lastTime: number = 0;
    private isRunning: boolean = false;

    constructor() {
        this.state = new BreakoutState();
        this.audio = new BreakoutAudio();
        this.particles = new ParticleSystem();
        this.physics = new PhysicsSystem();

        this.init();
    }

    private init() {
        this.canvas = document.getElementById('breakout-canvas') as HTMLCanvasElement;
        if (!this.canvas) return;

        const context = this.canvas.getContext('2d');
        if (!context) return;
        this.ctx = context;

        yardService.recordPlayedGame({
            id: 'breakout',
            title: '🟢 2D Breakout (Klotsipurustaja)',
            description: 'Liiguta alust _, põrgata palli tagasi ja purusta kõik rohelised ruudud!',
            url: './games/breakout/index.html',
            icon: '🟢',
            badgeText: '🟢 2D Retro Arcade',
            badgeColor: '#2ed573'
        });

        this.input = new InputManager(this.canvas);
        this.hud = new BreakoutHud(
            () => this.restart(true),
            () => this.advanceToNextLevel(),
            () => this.audio.toggleSound()
        );

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.restart(true);

        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    public resize() {
        if (!this.canvas) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = this.canvas.parentElement?.getBoundingClientRect() || { width: 800, height: 600 };
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);

        if (this.paddle) {
            this.paddle.y = (this.canvas.height / dpr) - 50;
        }
    }

    private get logicalWidth(): number {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        return this.canvas.width / dpr;
    }

    private get logicalHeight(): number {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        return this.canvas.height / dpr;
    }

    public restart(resetProgress: boolean = true) {
        const width = this.logicalWidth || 800;
        const height = this.logicalHeight || 600;

        // Paddle '_'
        this.paddle = {
            x: width / 2,
            y: height - 50,
            width: BREAKOUT_CONFIG.PADDLE.width,
            height: BREAKOUT_CONFIG.PADDLE.height,
            speed: BREAKOUT_CONFIG.PADDLE.speed,
            targetX: width / 2,
        };

        // Starting ball
        const initialAngle = (Math.random() - 0.5) * 0.7;
        const speed = BREAKOUT_CONFIG.BALL.initialSpeed;
        this.balls = [{
            x: width / 2,
            y: height - 120,
            radius: BREAKOUT_CONFIG.BALL.radius,
            speed: speed,
            vx: speed * Math.sin(initialAngle),
            vy: -speed * Math.cos(initialAngle),
            trail: [],
        }];

        this.powerUps = [];

        // Generate procedural level (different on every play again) with grey border blocks
        const currentLevel = resetProgress ? 1 : this.state.getLevel();
        if (resetProgress) {
            this.state.setLevel(1);
        }

        this.bricks = createBreakoutLevel({
            level: currentLevel,
            canvasWidth: width,
            canvasHeight: height,
        });
        this.currentMapSignature = (this.bricks as any).__signature || '';
        this.currentPatternName = (this.bricks as any).__pattern || '';

        // Count only breakable bricks (exclude grey obstacle and border blocks)
        const breakableCount = this.bricks.filter(b => b.type !== 'grey').length;
        this.state.initLevel(breakableCount, resetProgress);
        this.particles.clear();
        this.hud.updateStats(this.state.getStats());
        this.hud.hideModals();
    }

    public advanceToNextLevel() {
        this.state.nextLevel();
        this.restart(false);
    }

    public spawnExtraBalls(count: number = 3) {
        const speed = BREAKOUT_CONFIG.BALL.initialSpeed;
        const angles = [-0.55, 0, 0.55]; // Radiate outward
        for (let i = 0; i < count; i++) {
            const angle = angles[i % angles.length] + (Math.random() - 0.5) * 0.15;
            this.balls.push({
                x: this.paddle.x,
                y: this.paddle.y - 20,
                radius: BREAKOUT_CONFIG.BALL.radius,
                speed: speed,
                vx: speed * Math.sin(angle),
                vy: -speed * Math.cos(angle),
                trail: [],
            });
        }
        this.state.addBalls(count);
        this.particles.emit(this.paddle.x, this.paddle.y - 10, '#ffd700', 20);
    }

    private loop(timestamp: number) {
        if (!this.isRunning) return;

        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.loop(t));
    }

    public update(dt: number) {
        if (this.state.isDead() || this.state.isCleared()) {
            this.particles.update(dt);
            return;
        }

        const width = this.logicalWidth;
        const height = this.logicalHeight;

        // Update Paddle
        this.physics.updatePaddle(
            this.paddle,
            this.input.pointerX,
            this.input.moveLeft,
            this.input.moveRight,
            width,
            dt
        );

        // Update Falling Power-Ups
        this.physics.updatePowerUps(
            this.powerUps,
            this.paddle,
            height,
            dt,
            {
                onCatchPowerUp: (powerUp) => {
                    if (powerUp.type === 'multiball_3') {
                        this.audio.playPowerUpCatch();
                        this.spawnExtraBalls(3);
                    }
                }
            }
        );

        // Update All Active Balls
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const ball = this.balls[i];
            const isAlive = this.physics.updateBall(
                ball,
                this.paddle,
                this.bricks,
                width,
                height,
                dt,
                {
                    onPaddleHit: () => {
                        this.audio.playPaddleBounce();
                    },
                    onWallHit: () => {
                        this.audio.playWallBounce();
                    },
                    onGreyBrickHit: (brick) => {
                        // Metallic sound & spark on unbreakable grey block (including border blocks)
                        this.audio.playMetalClang();
                        this.particles.emit(brick.x + brick.width / 2, brick.y + brick.height / 2, '#c8d6e5', 5);
                    },
                    onBrickHit: (brick) => {
                        this.particles.emit(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color);

                        // If gold brick, drop the circular 3-ball icon!
                        if (brick.type === 'gold') {
                            this.audio.playPowerUpSpawn();
                            this.powerUps.push({
                                id: Date.now() + Math.random(),
                                x: brick.x + brick.width / 2,
                                y: brick.y + brick.height / 2,
                                radius: BREAKOUT_CONFIG.POWER_UP.radius,
                                vy: BREAKOUT_CONFIG.POWER_UP.fallSpeed,
                                type: 'multiball_3',
                            });
                        }

                        const result = this.state.onBrickDestroyed(brick.points);
                        this.hud.updateStats(this.state.getStats());
                        this.audio.playBrickBreak(1.0 + (this.state.getBricksDestroyed() % 10) * 0.08);

                        if (result.isComplete) {
                            this.audio.playVictory();
                            if (result.isVictory) {
                                this.hud.showVictory(this.state.getStats());
                            } else {
                                this.hud.showLevelCleared(this.state.getStats());
                            }
                        }
                    },
                    onBallFall: () => {
                        // Ball fell below paddle
                        this.balls.splice(i, 1);
                        const isGameOver = this.state.onBallLost();
                        if (isGameOver) {
                            this.audio.playDeath();
                            const stats = this.state.getStats();
                            this.hud.updateStats(stats);
                            this.hud.showGameOver(stats);
                        }
                    }
                }
            );

            if (!isAlive && this.balls.includes(ball)) {
                const idx = this.balls.indexOf(ball);
                if (idx !== -1) this.balls.splice(idx, 1);
            }
        }

        // Update particles
        this.particles.update(dt);
    }

    public render() {
        const width = this.logicalWidth;
        const height = this.logicalHeight;

        BreakoutRenderer.renderBackground(this.ctx, width, height);
        BreakoutRenderer.renderBricks(this.ctx, this.bricks);
        BreakoutRenderer.renderPowerUps(this.ctx, this.powerUps);
        BreakoutRenderer.renderBalls(this.ctx, this.balls);
        BreakoutRenderer.renderPaddle(this.ctx, this.paddle);
        this.particles.render(this.ctx);
    }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
    const game = new BreakoutGame();
    (window as unknown as { breakoutGame: BreakoutGame }).breakoutGame = game;
});
