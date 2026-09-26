import { Particle } from '../types';

export class ParticleSystem {
    public particles: Particle[] = [];

    public emit(x: number, y: number, color: string, count: number = 12, speed: number = 140) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = (Math.random() * 0.7 + 0.3) * speed;
            const life = Math.random() * 0.4 + 0.3;

            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                size: Math.random() * 4 + 2,
                color,
                alpha: 1,
                life,
                maxLife: life,
            });
        }
    }

    public update(dt: number) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            p.alpha = Math.max(0, p.life / p.maxLife);

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    public render(ctx: CanvasRenderingContext2D) {
        if (this.particles.length === 0) return;

        ctx.save();
        for (const p of this.particles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    public clear() {
        this.particles = [];
    }
}
