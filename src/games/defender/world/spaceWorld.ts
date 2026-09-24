import { Star } from '../types';

export class SpaceWorld {
    private stars: Star[] = [];
    private earthAngle: number = 0;
    private shieldPulse: number = 0;

    constructor(width: number, height: number) {
        this.initStars(width, height);
    }

    public initStars(width: number, height: number) {
        this.stars = [];
        const count = Math.floor((width * height) / 4500);
        const starColors = ['#ffffff', '#dff9fb', '#f6e58d', '#7ed6df', '#e056fd'];

        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() < 0.8 ? Math.random() * 1.5 + 0.5 : Math.random() * 2.5 + 1.5,
                speed: Math.random() * 0.4 + 0.1,
                alpha: Math.random() * 0.7 + 0.3,
                color: starColors[Math.floor(Math.random() * starColors.length)]
            });
        }
    }

    public resize(width: number, height: number) {
        this.initStars(width, height);
    }

    public update(dt: number, height: number) {
        this.earthAngle += dt * 0.05;
        this.shieldPulse += dt * 3;

        for (const star of this.stars) {
            star.y += star.speed * dt * 60;
            if (star.y > height) {
                star.y = 0;
                star.x = Math.random() * window.innerWidth;
            }
        }
    }

    public render(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        earthHpPct: number,
        earthShieldPct: number
    ) {
        // Deep space gradient
        const spaceGrad = ctx.createLinearGradient(0, 0, 0, height);
        spaceGrad.addColorStop(0, '#040714');
        spaceGrad.addColorStop(0.65, '#071026');
        spaceGrad.addColorStop(1, '#091536');
        ctx.fillStyle = spaceGrad;
        ctx.fillRect(0, 0, width, height);

        // Draw parallax stars
        for (const star of this.stars) {
            ctx.fillStyle = star.color;
            ctx.globalAlpha = star.alpha * (0.8 + 0.2 * Math.sin(star.y * 0.05 + this.shieldPulse));
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;

        // Render Planet Earth at the bottom
        this.renderEarth(ctx, width, height, earthHpPct, earthShieldPct);
    }

    private renderEarth(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        earthHpPct: number,
        shieldPct: number
    ) {
        const earthRadius = Math.max(width * 0.9, 650);
        const earthCenterX = width / 2;
        const earthCenterY = height + earthRadius - 90; // Top ~90px curves into view at bottom

        // Atmosphere glow
        const atmoGrad = ctx.createRadialGradient(
            earthCenterX, earthCenterY, earthRadius - 30,
            earthCenterX, earthCenterY, earthRadius + 60
        );
        atmoGrad.addColorStop(0, 'rgba(0, 210, 255, 0.45)');
        atmoGrad.addColorStop(0.5, 'rgba(0, 168, 255, 0.2)');
        atmoGrad.addColorStop(1, 'rgba(0, 168, 255, 0)');

        ctx.fillStyle = atmoGrad;
        ctx.beginPath();
        ctx.arc(earthCenterX, earthCenterY, earthRadius + 60, 0, Math.PI * 2);
        ctx.fill();

        // Earth surface globe
        ctx.save();
        ctx.beginPath();
        ctx.arc(earthCenterX, earthCenterY, earthRadius, 0, Math.PI * 2);
        ctx.clip();

        // Ocean base
        const oceanGrad = ctx.createLinearGradient(0, height - 120, 0, height);
        oceanGrad.addColorStop(0, '#10375c');
        oceanGrad.addColorStop(1, '#071e3d');
        ctx.fillStyle = oceanGrad;
        ctx.fill();

        // Stylized continent patches curving across the horizon
        ctx.fillStyle = earthHpPct > 0.4 ? '#20bf6b' : '#b71540'; // Green or scorched if low HP
        ctx.globalAlpha = 0.85;

        // Rotating continents simulation
        const shiftX = (this.earthAngle * 100) % 250;
        for (let x = -250; x < width + 250; x += 180) {
            ctx.beginPath();
            ctx.ellipse(x + shiftX, height - 40, 75, 40, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(x + shiftX + 80, height - 65, 55, 25, 0.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Swirling cloud layer
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.22;
        const cloudShift = (this.earthAngle * 140) % 300;
        for (let x = -300; x < width + 300; x += 220) {
            ctx.beginPath();
            ctx.ellipse(x + cloudShift, height - 60, 95, 20, -0.1, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Planetary Shield Arc
        if (shieldPct > 0) {
            const shieldAlpha = 0.25 + 0.15 * Math.sin(this.shieldPulse) + (shieldPct * 0.4);
            ctx.strokeStyle = `rgba(0, 242, 254, ${Math.min(1, shieldAlpha)})`;
            ctx.lineWidth = 4;
            ctx.shadowColor = '#00f2fe';
            ctx.shadowBlur = 15;

            ctx.beginPath();
            ctx.arc(earthCenterX, earthCenterY, earthRadius + 18, Math.PI * 1.25, Math.PI * 1.75);
            ctx.stroke();

            ctx.shadowBlur = 0;
        }
    }
}
