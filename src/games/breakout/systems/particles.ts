import { Particle } from '../types';
import { BREAKOUT_CONFIG } from '../catalog';

export class ParticleSystem {
    public particles: Particle[] = [];

    public emit(x: number, y: number, color: string, count: number = BREAKOUT_CONFIG.PARTICLES.countPerBrick) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 220;
            const size = 3 + Math.random() * 4;
            const life = BREAKOUT_CONFIG.PARTICLES.baseLife * (0.6 + Math.random() * 0.8);

            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size,
                color,
                alpha: 1.0,
                life,
                maxLife: life,
            });
        }
    }

    public update(dt: number) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 120 * dt; // slight gravity for falling shards
            p.alpha = Math.max(0, p.life / p.maxLife);
        }
    }

    public render(ctx: CanvasRenderingContext2D) {
        if (this.particles.length === 0) return;

        ctx.save();
        for (const p of this.particles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
        }
        ctx.restore();
    }

    public clear() {
        this.particles = [];
    }
}
