import { Asteroid, AsteroidCategory, Laser, PowerUp, PowerUpType } from '../types';
import { ASTEROID_CATALOG, POWERUP_CONFIGS } from '../catalog';

export class AsteroidManager {
    public asteroids: Asteroid[] = [];
    public powerUps: PowerUp[] = [];

    private nextAsteroidId: number = 1;
    private nextPowerUpId: number = 1;
    private spawnTimer: number = 0;
    private spawnInterval: number = 1.8;

    constructor() {}

    public reset() {
        this.asteroids = [];
        this.powerUps = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1.8;
    }

    public update(
        dt: number,
        width: number,
        height: number,
        currentWave: number,
        onEarthImpact: (asteroid: Asteroid) => void,
        onLaserHit: (asteroid: Asteroid, laser: Laser) => void
    ) {
        // Adjust spawn rate based on wave
        this.spawnInterval = Math.max(0.65, 2.0 - currentWave * 0.15);

        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnRandomAsteroid(width, currentWave);
        }

        // Earth boundary Y (above bottom Earth curve)
        const earthBoundaryY = height - 70;

        // Update Asteroids
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const ast = this.asteroids[i];
            ast.x += ast.vx * dt;
            ast.y += ast.vy * dt;
            ast.angle += ast.vAngle * dt;

            // Check if asteroid impacted Earth
            if (ast.y + ast.radius >= earthBoundaryY) {
                onEarthImpact(ast);
                this.asteroids.splice(i, 1);
                continue;
            }

            // Remove if somehow wandered off screen sides
            if (ast.x < -ast.radius * 2 || ast.x > width + ast.radius * 2) {
                this.asteroids.splice(i, 1);
            }
        }

        // Update Powerups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const p = this.powerUps[i];
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0 || p.y > height) {
                this.powerUps.splice(i, 1);
            }
        }
    }

    public spawnRandomAsteroid(width: number, wave: number) {
        let category: AsteroidCategory = 'small';
        const rand = Math.random();

        if (wave >= 3 && rand < 0.12) {
            category = 'fire';
        } else if (rand < 0.08) {
            category = 'gold';
        } else if (wave >= 2 && rand < 0.38) {
            category = 'large';
        } else if (rand < 0.70) {
            category = 'medium';
        } else {
            category = 'small';
        }

        // Rare boss comet every 5th wave
        if (wave % 5 === 0 && Math.random() < 0.25 && !this.asteroids.some(a => a.config.type === 'boss')) {
            category = 'boss';
        }

        const config = ASTEROID_CATALOG[category];
        const x = Math.random() * (width - config.radius * 2) + config.radius;
        const y = -config.radius - 10;

        // Slight drift towards screen center / Earth
        const targetX = width / 2 + (Math.random() * 200 - 100);
        const dx = targetX - x;
        const angleToCenter = Math.atan2(width * 0.8, dx);
        const speed = config.speed * 60 * (1 + (wave - 1) * 0.06);

        const vx = (dx / (width * 0.8)) * (speed * 0.4);
        const vy = Math.max(speed * 0.7, 45);

        this.asteroids.push({
            id: this.nextAsteroidId++,
            x,
            y,
            vx,
            vy,
            radius: config.radius,
            angle: Math.random() * Math.PI * 2,
            vAngle: (Math.random() - 0.5) * 1.5,
            hp: config.hp,
            maxHp: config.hp,
            config,
            vertices: this.generateAsteroidShape(config.radius, config.vertexCount)
        });
    }

    public splitAsteroid(ast: Asteroid): Asteroid[] {
        const fragments: Asteroid[] = [];
        let nextType: AsteroidCategory | null = null;

        if (ast.config.type === 'boss') nextType = 'large';
        else if (ast.config.type === 'large') nextType = 'medium';
        else if (ast.config.type === 'medium') nextType = 'small';

        if (nextType) {
            const childConfig = ASTEROID_CATALOG[nextType];
            for (let i = 0; i < 2; i++) {
                const spreadAngle = (i === 0 ? -1 : 1) * (0.4 + Math.random() * 0.3);
                const speed = childConfig.speed * 65;
                fragments.push({
                    id: this.nextAsteroidId++,
                    x: ast.x + (i === 0 ? -15 : 15),
                    y: ast.y,
                    vx: ast.vx + Math.sin(spreadAngle) * speed * 0.8,
                    vy: Math.abs(ast.vy) * 0.9 + 20,
                    radius: childConfig.radius,
                    angle: Math.random() * Math.PI * 2,
                    vAngle: (Math.random() - 0.5) * 2.5,
                    hp: childConfig.hp,
                    maxHp: childConfig.hp,
                    config: childConfig,
                    vertices: this.generateAsteroidShape(childConfig.radius, childConfig.vertexCount)
                });
            }
        }

        // Maybe spawn power-up
        if (Math.random() < 0.22 || ast.config.type === 'gold' || ast.config.type === 'boss') {
            this.spawnPowerUp(ast.x, ast.y, ast.config.type === 'gold' ? 'coins' : undefined);
        }

        return fragments;
    }

    private spawnPowerUp(x: number, y: number, forceType?: PowerUpType) {
        let type: PowerUpType = forceType || 'triple_shot';
        if (!forceType) {
            const rand = Math.random() * 100;
            let sum = 0;
            for (const cfg of POWERUP_CONFIGS) {
                sum += cfg.dropWeight;
                if (rand <= sum) {
                    type = cfg.type;
                    break;
                }
            }
        }

        const config = POWERUP_CONFIGS.find(c => c.type === type) || POWERUP_CONFIGS[0];
        this.powerUps.push({
            id: this.nextPowerUpId++,
            x,
            y,
            vy: 65,
            type,
            icon: config.icon,
            radius: 16,
            alpha: 1.0,
            life: 9.0
        });
    }

    private generateAsteroidShape(radius: number, vertexCount: number): { x: number; y: number }[] {
        const verts: { x: number; y: number }[] = [];
        for (let i = 0; i < vertexCount; i++) {
            const angle = (i / vertexCount) * Math.PI * 2;
            const variance = 0.75 + Math.random() * 0.5; // jagged craggy surface
            verts.push({
                x: Math.cos(angle) * radius * variance,
                y: Math.sin(angle) * radius * variance
            });
        }
        return verts;
    }

    public render(ctx: CanvasRenderingContext2D) {
        // Render Asteroids
        for (const ast of this.asteroids) {
            ctx.save();
            ctx.translate(ast.x, ast.y);
            ctx.rotate(ast.angle);

            // Fiery Meteor Tail
            if (ast.config.type === 'fire') {
                ctx.fillStyle = 'rgba(255, 71, 87, 0.4)';
                ctx.beginPath();
                ctx.arc(0, -ast.radius * 0.8, ast.radius * 1.2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Asteroid Body
            ctx.fillStyle = ast.config.color;
            ctx.strokeStyle = ast.config.glowColor;
            ctx.lineWidth = 2.5;

            ctx.beginPath();
            for (let i = 0; i < ast.vertices.length; i++) {
                const v = ast.vertices[i];
                if (i === 0) ctx.moveTo(v.x, v.y);
                else ctx.lineTo(v.x, v.y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Craters / surface details
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.beginPath();
            ctx.arc(ast.radius * 0.25, -ast.radius * 0.2, ast.radius * 0.22, 0, Math.PI * 2);
            ctx.fill();

            // Health bar for large or boss asteroids
            if (ast.maxHp > 2) {
                const barW = ast.radius * 1.6;
                const hpPct = Math.max(0, ast.hp / ast.maxHp);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(-barW / 2, -ast.radius - 12, barW, 4);
                ctx.fillStyle = ast.config.type === 'boss' ? '#a55eea' : '#2ed573';
                ctx.fillRect(-barW / 2, -ast.radius - 12, barW * hpPct, 4);
            }

            ctx.restore();
        }

        // Render Powerups
        for (const p of this.powerUps) {
            ctx.save();
            ctx.translate(p.x, p.y);

            // Glowing aura
            ctx.fillStyle = 'rgba(0, 242, 254, 0.25)';
            ctx.beginPath();
            ctx.arc(0, 0, p.radius + 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#101c2d';
            ctx.strokeStyle = '#00f2fe';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.icon, 0, 0);

            ctx.restore();
        }
    }
}
