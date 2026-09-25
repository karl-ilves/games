import { yardService } from '../../shared/yardService';
import { Ball, Paddle, Brick } from './types';
import { BREAKOUT_CONFIG } from './catalog';
import { BreakoutAudio } from './audio';
import { BreakoutState } from './state/breakoutState';
import { ParticleSystem } from './systems/particles';
import { InputManager } from './systems/input';
import { PhysicsSystem } from './systems/physics';
import { BreakoutHud } from './ui/hud';

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
    public ball!: Ball;
    public bricks: Brick[] = [];

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
            () => this.restart(),
            () => this.audio.toggleSound()
        );

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.restart();

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

    public restart() {
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

        // Ball
        const initialAngle = (Math.random() - 0.5) * 0.8; // launch slightly angled upward
        const speed = BREAKOUT_CONFIG.BALL.initialSpeed;
        this.ball = {
            x: width / 2,
            y: height - 120,
            radius: BREAKOUT_CONFIG.BALL.radius,
            speed: speed,
            vx: speed * Math.sin(initialAngle),
            vy: -speed * Math.cos(initialAngle),
            trail: [],
        };

        // Create Green Bricks
        this.createBricks(width);
        this.state.initLevel(this.bricks.length);
        this.particles.clear();
        this.hud.updateStats(this.state.getStats());
        this.hud.hideModals();
    }

    public createBricks(canvasWidth: number) {
        this.bricks = [];
        const { rows, cols, padding, topOffset, sidePadding, brickHeight, greenColors } = BREAKOUT_CONFIG.GRID;
        const totalPadding = (cols - 1) * padding + sidePadding * 2;
        const brickWidth = Math.max(20, (canvasWidth - totalPadding) / cols);

        let id = 0;
        for (let r = 0; r < rows; r++) {
            const colorScheme = greenColors[r % greenColors.length];
            const y = topOffset + r * (brickHeight + padding);

            for (let c = 0; c < cols; c++) {
                const x = sidePadding + c * (brickWidth + padding);
                this.bricks.push({
                    id: id++,
                    x,
                    y,
                    width: brickWidth,
                    height: brickHeight,
                    color: colorScheme.main,
                    glowColor: colorScheme.glow,
                    points: colorScheme.points,
                    intact: true,
                });
            }
        }
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

        // Update Ball & Collisions
        this.physics.updateBall(
            this.ball,
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
                onBrickHit: (brick) => {
                    this.particles.emit(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color);
                    const isWin = this.state.onBrickDestroyed(brick.points);
                    this.hud.updateStats(this.state.getStats());
                    this.audio.playBrickBreak(1.0 + (this.state.getBricksDestroyed() % 10) * 0.08);

                    if (isWin) {
                        this.audio.playVictory();
                        this.hud.showVictory(this.state.getStats());
                    }
                },
                onBallFall: () => {
                    // Ball fell down! "kui pall kukkub alla sa sured"
                    this.audio.playDeath();
                    const stats = this.state.setDeath();
                    this.hud.updateStats(stats);
                    this.hud.showGameOver(stats);
                }
            }
        );

        // Update particles
        this.particles.update(dt);
    }

    public render() {
        const width = this.logicalWidth;
        const height = this.logicalHeight;

        // Clear canvas
        this.ctx.fillStyle = '#0a0e17';
        this.ctx.fillRect(0, 0, width, height);

        // Background subtle grid lines
        this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.03)';
        this.ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }

        // Render Green Bricks (Squares)
        for (const brick of this.bricks) {
            if (!brick.intact) continue;

            this.ctx.save();
            this.ctx.fillStyle = brick.color;
            this.ctx.shadowColor = brick.glowColor;
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 4);
            this.ctx.fill();

            // Inner gloss highlight
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            this.ctx.fillRect(brick.x + 2, brick.y + 2, brick.width - 4, 3);
            this.ctx.restore();
        }

        // Render Ball Trail
        for (const t of this.ball.trail) {
            this.ctx.save();
            this.ctx.fillStyle = `rgba(0, 242, 254, ${t.alpha * 0.4})`;
            this.ctx.beginPath();
            this.ctx.arc(t.x, t.y, this.ball.radius * 0.8, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }

        // Render Ball
        this.ctx.save();
        this.ctx.fillStyle = BREAKOUT_CONFIG.BALL.color;
        this.ctx.shadowColor = BREAKOUT_CONFIG.BALL.glowColor;
        this.ctx.shadowBlur = 12;
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();

        // Render Paddle '_'
        this.ctx.save();
        this.ctx.fillStyle = BREAKOUT_CONFIG.PADDLE.color;
        this.ctx.shadowColor = BREAKOUT_CONFIG.PADDLE.glowColor;
        this.ctx.shadowBlur = 16;
        const paddleX = this.paddle.x - this.paddle.width / 2;
        const paddleY = this.paddle.y - this.paddle.height / 2;
        this.ctx.beginPath();
        this.ctx.roundRect(paddleX, paddleY, this.paddle.width, this.paddle.height, BREAKOUT_CONFIG.PADDLE.borderRadius);
        this.ctx.fill();

        // Distinct '_' marker line in the center of paddle
        this.ctx.fillStyle = '#00f2fe';
        this.ctx.fillRect(paddleX + 10, paddleY + 4, this.paddle.width - 20, 3);
        this.ctx.restore();

        // Render Particles
        this.particles.render(this.ctx);
    }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
    const game = new BreakoutGame();
    (window as unknown as { breakoutGame: BreakoutGame }).breakoutGame = game;
});
