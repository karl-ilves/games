import { Asteroid, Laser } from '../types';

export class DefenseDroneSystem {
    public orbitAngle: number = 0;
    public x: number = 0;
    public y: number = 0;
    private fireCooldown: number = 0;
    private nextLaserId: number = 9000;

    public update(
        dt: number,
        playerX: number,
        playerY: number,
        isActive: boolean,
        asteroids: Asteroid[]
    ): Laser[] {
        if (!isActive) return [];

        this.orbitAngle += dt * 3.2;
        const orbitRadius = 52;
        this.x = playerX + Math.cos(this.orbitAngle) * orbitRadius;
        this.y = playerY + Math.sin(this.orbitAngle) * (orbitRadius * 0.45);

        const newLasers: Laser[] = [];
        this.fireCooldown -= dt;

        if (this.fireCooldown <= 0 && asteroids.length > 0) {
            // Find closest asteroid
            let closestAst: Asteroid | null = null;
            let closestDistSq = Infinity;

            for (const ast of asteroids) {
                const dx = ast.x - this.x;
                const dy = ast.y - this.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < closestDistSq && distSq < 550 * 550) {
                    closestDistSq = distSq;
                    closestAst = ast;
                }
            }

            if (closestAst) {
                const dx = closestAst.x - this.x;
                const dy = closestAst.y - this.y;
                const dist = Math.sqrt(closestDistSq) || 1;
                const speed = 750;

                newLasers.push({
                    id: this.nextLaserId++,
                    x: this.x,
                    y: this.y,
                    vx: (dx / dist) * speed,
                    vy: (dy / dist) * speed,
                    radius: 3.5,
                    damage: 2,
                    color: '#2ed573',
                    isOwnerBeam: false,
                    life: 1.2
                });

                this.fireCooldown = 0.85; // shots every 0.85s
            }
        }

        return newLasers;
    }

    public render(ctx: CanvasRenderingContext2D, isActive: boolean) {
        if (!isActive) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Drone energy aura
        const glowGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 16);
        glowGrad.addColorStop(0, 'rgba(46, 213, 115, 0.7)');
        glowGrad.addColorStop(1, 'rgba(46, 213, 115, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();

        // Drone wings
        ctx.fillStyle = '#0984e3';
        ctx.fillRect(-12, -2, 24, 4);

        // Drone core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#2ed573';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }
}
