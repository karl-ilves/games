import { Ball, Paddle, Brick, PowerUp } from '../types';
import { BREAKOUT_CONFIG } from '../catalog';

export class BreakoutRenderer {
    private static bgCanvas: HTMLCanvasElement | null = null;
    private static bgWidth = 0;
    private static bgHeight = 0;

    public static renderBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
        // Cache static background grid onto an offscreen canvas to avoid rebuilding stroke paths every frame
        if (!this.bgCanvas || this.bgWidth !== width || this.bgHeight !== height) {
            this.bgCanvas = document.createElement('canvas');
            this.bgCanvas.width = width;
            this.bgCanvas.height = height;
            this.bgWidth = width;
            this.bgHeight = height;

            const bgCtx = this.bgCanvas.getContext('2d');
            if (bgCtx) {
                bgCtx.fillStyle = '#0a0e17';
                bgCtx.fillRect(0, 0, width, height);

                // Subtle retro arcade background grid
                bgCtx.strokeStyle = 'rgba(0, 242, 254, 0.035)';
                bgCtx.lineWidth = 1;
                bgCtx.beginPath();
                const gridSize = 40;
                for (let x = 0; x <= width; x += gridSize) {
                    bgCtx.moveTo(x, 0);
                    bgCtx.lineTo(x, height);
                }
                for (let y = 0; y <= height; y += gridSize) {
                    bgCtx.moveTo(0, y);
                    bgCtx.lineTo(width, y);
                }
                bgCtx.stroke();
            }
        }

        ctx.drawImage(this.bgCanvas, 0, 0);
    }

    public static renderBricks(ctx: CanvasRenderingContext2D, bricks: Brick[]) {
        // Batch rendering without expensive shadowBlur for smooth 60-120 FPS
        for (const brick of bricks) {
            if (!brick.intact) continue;

            // Base brick body
            ctx.fillStyle = brick.color;
            ctx.beginPath();
            ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 4);
            ctx.fill();

            if (brick.type === 'grey') {
                // Metallic steel border & corner rivets
                ctx.strokeStyle = '#8395a7';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.fillStyle = '#c8d6e5';
                const rSize = 2.5;
                ctx.fillRect(brick.x + 3, brick.y + 3, rSize, rSize);
                ctx.fillRect(brick.x + brick.width - 5.5, brick.y + 3, rSize, rSize);
                ctx.fillRect(brick.x + 3, brick.y + brick.height - 5.5, rSize, rSize);
                ctx.fillRect(brick.x + brick.width - 5.5, brick.y + brick.height - 5.5, rSize, rSize);
            } else if (brick.type === 'gold') {
                // Golden bright shimmer & glowing border
                ctx.strokeStyle = '#fff176';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Top gloss highlight
                ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                ctx.fillRect(brick.x + 2, brick.y + 2, brick.width - 4, 3);
            } else {
                // Green inner gloss highlight & crisp neon rim
                ctx.strokeStyle = brick.glowColor;
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                ctx.fillRect(brick.x + 2, brick.y + 2, brick.width - 4, 3);
            }
        }
    }

    public static renderPowerUps(ctx: CanvasRenderingContext2D, powerUps: PowerUp[]) {
        for (const p of powerUps) {
            // Outer golden circle
            ctx.fillStyle = BREAKOUT_CONFIG.POWER_UP.bgColor;
            ctx.strokeStyle = BREAKOUT_CONFIG.POWER_UP.borderColor;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 3 mini white balls inside the circle ("3 palli pilt ringikujuline")
            ctx.fillStyle = BREAKOUT_CONFIG.POWER_UP.ballIconColor;
            const bRad = 3.2;
            // Top ball
            ctx.beginPath();
            ctx.arc(p.x, p.y - 4.5, bRad, 0, Math.PI * 2);
            ctx.fill();
            // Bottom-left ball
            ctx.beginPath();
            ctx.arc(p.x - 5, p.y + 4, bRad, 0, Math.PI * 2);
            ctx.fill();
            // Bottom-right ball
            ctx.beginPath();
            ctx.arc(p.x + 5, p.y + 4, bRad, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    public static renderBalls(ctx: CanvasRenderingContext2D, balls: Ball[]) {
        for (const ball of balls) {
            // Trail
            for (const t of ball.trail) {
                ctx.fillStyle = `rgba(0, 242, 254, ${t.alpha * 0.4})`;
                ctx.beginPath();
                ctx.arc(t.x, t.y, ball.radius * 0.8, 0, Math.PI * 2);
                ctx.fill();
            }

            // Ball with arcade glow
            ctx.save();
            ctx.fillStyle = BREAKOUT_CONFIG.BALL.color;
            ctx.shadowColor = BREAKOUT_CONFIG.BALL.glowColor;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    public static renderPaddle(ctx: CanvasRenderingContext2D, paddle: Paddle) {
        ctx.save();
        ctx.fillStyle = BREAKOUT_CONFIG.PADDLE.color;
        ctx.shadowColor = BREAKOUT_CONFIG.PADDLE.glowColor;
        ctx.shadowBlur = 12;
        const paddleX = paddle.x - paddle.width / 2;
        const paddleY = paddle.y - paddle.height / 2;
        ctx.beginPath();
        ctx.roundRect(paddleX, paddleY, paddle.width, paddle.height, BREAKOUT_CONFIG.PADDLE.borderRadius);
        ctx.fill();
        ctx.restore();

        // Distinct '_' marker line in the center of paddle
        ctx.fillStyle = '#00f2fe';
        ctx.fillRect(paddleX + 10, paddleY + 4, paddle.width - 20, 3);
    }
}
