import { Ball, Paddle, Brick, PowerUp } from '../types';
import { BREAKOUT_CONFIG } from '../catalog';

export class BreakoutRenderer {
    public static renderBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, width, height);

        // Subtle background grid
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.03)';
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }

    public static renderBricks(ctx: CanvasRenderingContext2D, bricks: Brick[]) {
        for (const brick of bricks) {
            if (!brick.intact) continue;

            ctx.save();
            ctx.fillStyle = brick.color;
            ctx.shadowColor = brick.glowColor;
            ctx.shadowBlur = brick.type === 'grey' ? 4 : 10;
            ctx.beginPath();
            ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 4);
            ctx.fill();

            if (brick.type === 'grey') {
                // Metallic steel border & corner rivets
                ctx.strokeStyle = '#8395a7';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = '#c8d6e5';
                const rSize = 3;
                ctx.fillRect(brick.x + 3, brick.y + 3, rSize, rSize);
                ctx.fillRect(brick.x + brick.width - 6, brick.y + 3, rSize, rSize);
                ctx.fillRect(brick.x + 3, brick.y + brick.height - 6, rSize, rSize);
                ctx.fillRect(brick.x + brick.width - 6, brick.y + brick.height - 6, rSize, rSize);
            } else if (brick.type === 'gold') {
                // Golden bright shimmer & border
                ctx.strokeStyle = '#fff176';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fillRect(brick.x + 2, brick.y + 2, brick.width - 4, 3);
            } else {
                // Green inner gloss highlight
                ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                ctx.fillRect(brick.x + 2, brick.y + 2, brick.width - 4, 3);
            }
            ctx.restore();
        }
    }

    public static renderPowerUps(ctx: CanvasRenderingContext2D, powerUps: PowerUp[]) {
        for (const p of powerUps) {
            ctx.save();
            // Outer golden glow circle
            ctx.shadowColor = BREAKOUT_CONFIG.POWER_UP.glowColor;
            ctx.shadowBlur = 12;
            ctx.fillStyle = BREAKOUT_CONFIG.POWER_UP.bgColor;
            ctx.strokeStyle = BREAKOUT_CONFIG.POWER_UP.borderColor;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 3 mini white balls inside the circle ("3 palli pilt ringikujuline")
            ctx.fillStyle = BREAKOUT_CONFIG.POWER_UP.ballIconColor;
            ctx.shadowBlur = 4;
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
            ctx.restore();
        }
    }

    public static renderBalls(ctx: CanvasRenderingContext2D, balls: Ball[]) {
        for (const ball of balls) {
            // Trail
            for (const t of ball.trail) {
                ctx.save();
                ctx.fillStyle = `rgba(0, 242, 254, ${t.alpha * 0.4})`;
                ctx.beginPath();
                ctx.arc(t.x, t.y, ball.radius * 0.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Ball
            ctx.save();
            ctx.fillStyle = BREAKOUT_CONFIG.BALL.color;
            ctx.shadowColor = BREAKOUT_CONFIG.BALL.glowColor;
            ctx.shadowBlur = 12;
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
        ctx.shadowBlur = 16;
        const paddleX = paddle.x - paddle.width / 2;
        const paddleY = paddle.y - paddle.height / 2;
        ctx.beginPath();
        ctx.roundRect(paddleX, paddleY, paddle.width, paddle.height, BREAKOUT_CONFIG.PADDLE.borderRadius);
        ctx.fill();

        // Distinct '_' marker line in the center of paddle
        ctx.fillStyle = '#00f2fe';
        ctx.fillRect(paddleX + 10, paddleY + 4, paddle.width - 20, 3);
        ctx.restore();
    }
}
