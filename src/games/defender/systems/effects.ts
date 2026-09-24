import { FloatingText, Laser, Particle } from '../types';

export class EffectsManager {
    public particles: Particle[] = [];
    public floatingTexts: FloatingText[] = [];
    public shockwaves: { x: number; y: number; radius: number; maxRadius: number; color: string; alpha: number }[] = [];

    public screenShakeTime: number = 0;
    public screenShakeIntensity: number = 0;

    constructor() {}

    public reset() {
        this.particles = [];
        this.floatingTexts = [];
        this.shockwaves = [];
        this.screenShakeTime = 0;
        this.screenShakeIntensity = 0;
    }

    public triggerScreenShake(duration: number = 0.35, intensity: number = 8) {
        this.screenShakeTime = duration;
        this.screenShakeIntensity = intensity;
    }

    public addExplosion(x: number, y: number, color: string = '#ffd32a', count: number = 18, speed: number = 160) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = (0.3 + Math.random() * 0.7) * speed;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                radius: Math.random() * 3 + 2,
                color,
                alpha: 1.0,
                decay: Math.random() * 1.5 + 1.2,
                shrink: true
            });
        }
    }

    public addShockwave(x: number, y: number, maxRadius: number = 80, color: string = '#00f2fe') {
        this.shockwaves.push({
            x,
            y,
            radius: 5,
            maxRadius,
            color,
            alpha: 1.0
        });
    }

    public addFloatingText(x: number, y: number, text: string, color: string = '#ffd700') {
        this.floatingTexts.push({
            x,
            y,
            text,
            color,
            alpha: 1.0,
            vy: -40,
            life: 1.2
        });
    }

    public update(dt: number) {
        // Screen shake
        if (this.screenShakeTime > 0) {
            this.screenShakeTime -= dt;
            if (this.screenShakeTime <= 0) {
                this.screenShakeIntensity = 0;
            }
        }

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.alpha -= p.decay * dt;
            if (p.shrink) {
                p.radius = Math.max(0.2, p.radius - dt * 2);
            }
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const s = this.shockwaves[i];
            s.radius += (s.maxRadius - s.radius) * Math.min(1, dt * 10);
            s.alpha -= dt * 1.8;
            if (s.alpha <= 0) {
                this.shockwaves.splice(i, 1);
            }
        }

        // Floating text
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy * dt;
            ft.alpha -= dt / ft.life;
            if (ft.alpha <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    public renderLasers(ctx: CanvasRenderingContext2D, lasers: Laser[]) {
        for (const laser of lasers) {
            ctx.save();
            ctx.fillStyle = laser.color;
            ctx.shadowColor = laser.color;
            ctx.shadowBlur = laser.isOwnerBeam ? 16 : 8;

            ctx.beginPath();
            ctx.ellipse(laser.x, laser.y, laser.radius, laser.radius * 2.8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Core beam highlight
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(laser.x, laser.y, laser.radius * 0.45, laser.radius * 2.2, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    public renderEffects(ctx: CanvasRenderingContext2D) {
        // Shockwaves
        for (const s of this.shockwaves) {
            ctx.save();
            ctx.strokeStyle = s.color;
            ctx.globalAlpha = Math.max(0, s.alpha);
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Particles
        for (const p of this.particles) {
            ctx.save();
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Floating texts
        for (const ft of this.floatingTexts) {
            ctx.save();
            ctx.fillStyle = ft.color;
            ctx.globalAlpha = Math.max(0, ft.alpha);
            ctx.font = 'bold 15px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }
}
