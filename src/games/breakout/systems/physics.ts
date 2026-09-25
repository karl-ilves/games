import { Ball, Paddle, Brick, PowerUp } from '../types';
import { BREAKOUT_CONFIG } from '../catalog';

export interface CollisionCallbacks {
    onPaddleHit?: () => void;
    onWallHit?: () => void;
    onBrickHit?: (brick: Brick) => void;
    onGreyBrickHit?: (brick: Brick) => void;
    onBallFall?: (ball: Ball) => void;
    onCatchPowerUp?: (powerUp: PowerUp) => void;
}

export class PhysicsSystem {
    public updatePaddle(
        paddle: Paddle,
        pointerX: number | null,
        moveLeft: boolean,
        moveRight: boolean,
        canvasWidth: number,
        dt: number
    ) {
        if (pointerX !== null) {
            // Smoothly track pointer
            paddle.x += (pointerX - paddle.x) * Math.min(1.0, 20 * dt);
        } else {
            let dir = 0;
            if (moveLeft) dir -= 1;
            if (moveRight) dir += 1;
            paddle.x += dir * paddle.speed * dt;
        }

        // Clamp paddle within canvas boundaries
        const halfW = paddle.width / 2;
        if (paddle.x - halfW < 0) paddle.x = halfW;
        if (paddle.x + halfW > canvasWidth) paddle.x = canvasWidth - halfW;
    }

    public updateBall(
        ball: Ball,
        paddle: Paddle,
        bricks: Brick[],
        canvasWidth: number,
        canvasHeight: number,
        dt: number,
        callbacks: CollisionCallbacks
    ): boolean {
        // Record trail
        ball.trail.push({ x: ball.x, y: ball.y, alpha: 1.0 });
        if (ball.trail.length > 8) ball.trail.shift();
        for (const t of ball.trail) {
            t.alpha *= 0.85;
        }

        // Step ball
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        // 1. Left & Right Wall bounce
        if (ball.x - ball.radius <= 0) {
            ball.x = ball.radius;
            ball.vx = Math.abs(ball.vx);
            callbacks.onWallHit?.();
        } else if (ball.x + ball.radius >= canvasWidth) {
            ball.x = canvasWidth - ball.radius;
            ball.vx = -Math.abs(ball.vx);
            callbacks.onWallHit?.();
        }

        // 2. Top Wall bounce
        if (ball.y - ball.radius <= 0) {
            ball.y = ball.radius;
            ball.vy = Math.abs(ball.vy);
            callbacks.onWallHit?.();
        }

        // 3. Fall Down (Dead ball)
        if (ball.y - ball.radius > canvasHeight) {
            callbacks.onBallFall?.(ball);
            return false; // Ball is dead
        }

        // 4. Paddle collision
        const paddleLeft = paddle.x - paddle.width / 2;
        const paddleRight = paddle.x + paddle.width / 2;
        const paddleTop = paddle.y - paddle.height / 2;
        const paddleBottom = paddle.y + paddle.height / 2;

        if (
            ball.vy > 0 &&
            ball.y + ball.radius >= paddleTop &&
            ball.y - ball.radius <= paddleBottom &&
            ball.x + ball.radius >= paddleLeft &&
            ball.x - ball.radius <= paddleRight
        ) {
            // Ball bounced on paddle '_'!
            ball.y = paddleTop - ball.radius;

            // Compute hit offset [-1, 1] from center of paddle
            const hitOffset = Math.max(-1, Math.min(1, (ball.x - paddle.x) / (paddle.width / 2)));
            const maxBounceAngle = Math.PI * 0.40; // ~72 degrees max deflection
            const bounceAngle = hitOffset * maxBounceAngle;

            // Increase ball speed slightly with each paddle return
            ball.speed = Math.min(BREAKOUT_CONFIG.BALL.maxSpeed, ball.speed + BREAKOUT_CONFIG.BALL.speedIncrement);

            ball.vx = ball.speed * Math.sin(bounceAngle);
            ball.vy = -ball.speed * Math.cos(bounceAngle);

            callbacks.onPaddleHit?.();
        }

        // 5. Bricks Collision (Circle to AABB)
        for (const brick of bricks) {
            if (!brick.intact) continue;

            const nearestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.width));
            const nearestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.height));

            const deltaX = ball.x - nearestX;
            const deltaY = ball.y - nearestY;
            const distSq = deltaX * deltaX + deltaY * deltaY;

            if (distSq <= ball.radius * ball.radius) {
                // Determine bounce direction from relative collision overlap
                const overlapX = ball.radius - Math.abs(deltaX);
                const overlapY = ball.radius - Math.abs(deltaY);

                if (overlapX < overlapY && deltaX !== 0) {
                    ball.vx = -ball.vx;
                } else {
                    ball.vy = -ball.vy;
                }

                if (brick.type === 'grey') {
                    // "hall plok kus se tagasi põrkab aga ei plahvata" -> unbreakable!
                    callbacks.onGreyBrickHit?.(brick);
                } else {
                    // Breakable green or gold brick!
                    brick.intact = false;
                    callbacks.onBrickHit?.(brick);
                }

                break; // One brick collision per physics substep prevents tunneling
            }
        }

        return true; // Ball still active
    }

    public updatePowerUps(
        powerUps: PowerUp[],
        paddle: Paddle,
        canvasHeight: number,
        dt: number,
        callbacks: CollisionCallbacks
    ) {
        const paddleLeft = paddle.x - paddle.width / 2;
        const paddleRight = paddle.x + paddle.width / 2;
        const paddleTop = paddle.y - paddle.height / 2;
        const paddleBottom = paddle.y + paddle.height / 2;

        for (let i = powerUps.length - 1; i >= 0; i--) {
            const p = powerUps[i];
            p.y += p.vy * dt;

            // Check if caught by paddle '_'
            if (
                p.y + p.radius >= paddleTop &&
                p.y - p.radius <= paddleBottom &&
                p.x + p.radius >= paddleLeft &&
                p.x - p.radius <= paddleRight
            ) {
                callbacks.onCatchPowerUp?.(p);
                powerUps.splice(i, 1);
                continue;
            }

            // Fell past screen
            if (p.y - p.radius > canvasHeight) {
                powerUps.splice(i, 1);
            }
        }
    }
}
