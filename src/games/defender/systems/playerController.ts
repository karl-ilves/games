import { Laser } from '../types';

export class PlayerController {
    public x: number = 0;
    public y: number = 0;
    public vx: number = 0;
    public speed: number = 420;
    public radius: number = 22;
    public tilt: number = 0;

    private moveLeft: boolean = false;
    private moveRight: boolean = false;
    private isFiring: boolean = false;
    private fireCooldown: number = 0;
    private baseFireRate: number = 0.16; // seconds between shots
    private isOwner: boolean = false;
    private hasHyperBlaster: boolean = false;

    private nextLaserId: number = 1;
    private thrusterFlicker: number = 0;

    constructor(initialX: number, initialY: number, isOwner: boolean = false) {
        this.x = initialX;
        this.y = initialY;
        this.isOwner = isOwner;
    }

    public setIsOwner(val: boolean) {
        this.isOwner = val;
    }

    public setHyperBlaster(val: boolean) {
        this.hasHyperBlaster = val;
    }

    public setInputs(left: boolean, right: boolean, firing: boolean) {
        this.moveLeft = left;
        this.moveRight = right;
        this.isFiring = firing;
    }

    public setPositionDirect(x: number, y?: number) {
        this.x = x;
        if (y !== undefined) this.y = y;
    }

    public update(dt: number, width: number, height: number, hasSpeedBoost: boolean, tripleShotActive: boolean = false): Laser[] {
        const spawnedLasers: Laser[] = [];
        const currentSpeed = hasSpeedBoost ? this.speed * 1.4 : this.speed;

        // Smooth horizontal acceleration
        let targetVx = 0;
        if (this.moveLeft) targetVx -= currentSpeed;
        if (this.moveRight) targetVx += currentSpeed;

        this.vx += (targetVx - this.vx) * Math.min(1, dt * 14);
        this.x += this.vx * dt;

        // Target tilt angle when banking
        const targetTilt = (this.vx / currentSpeed) * 0.35;
        this.tilt += (targetTilt - this.tilt) * Math.min(1, dt * 12);

        // Keep inside screen bounds
        const margin = this.radius + 10;
        if (this.x < margin) {
            this.x = margin;
            this.vx = 0;
        } else if (this.x > width - margin) {
            this.x = width - margin;
            this.vx = 0;
        }

        // Keep ship in lower-middle space region above Earth atmosphere
        const targetY = height - 160;
        this.y += (targetY - this.y) * Math.min(1, dt * 10);

        this.thrusterFlicker += dt * 30;

        // Weapon cooldown & firing
        if (this.fireCooldown > 0) {
            this.fireCooldown -= dt;
        }

        if (this.isFiring && this.fireCooldown <= 0) {
            spawnedLasers.push(...this.createLasers(tripleShotActive));
            const baseCooldown = this.isOwner ? this.baseFireRate * 0.85 : this.baseFireRate;
            this.fireCooldown = this.hasHyperBlaster ? baseCooldown * 0.65 : baseCooldown;
        }

        return spawnedLasers;
    }

    public forceFire(tripleShot: boolean): Laser[] {
        return this.createLasers(tripleShot);
    }

    public createLasers(tripleShot: boolean): Laser[] {
        const lasers: Laser[] = [];
        const laserColor = this.isOwner ? '#ffd700' : (this.hasHyperBlaster ? '#00f2fe' : '#48dbfb');
        const laserSpeed = this.hasHyperBlaster ? 920 : 820;
        const extraDmg = this.hasHyperBlaster ? 1 : 0;

        if (tripleShot) {
            // Center dual + left & right angles
            lasers.push({
                id: this.nextLaserId++,
                x: this.x - 12,
                y: this.y - 20,
                vx: -90,
                vy: -laserSpeed,
                radius: 4,
                damage: (this.isOwner ? 2 : 1) + extraDmg,
                color: laserColor,
                isOwnerBeam: this.isOwner,
                life: 1.5
            });
            lasers.push({
                id: this.nextLaserId++,
                x: this.x,
                y: this.y - 26,
                vx: 0,
                vy: -laserSpeed,
                radius: 5,
                damage: (this.isOwner ? 3 : 2) + extraDmg,
                color: '#ffffff',
                isOwnerBeam: this.isOwner,
                life: 1.5
            });
            lasers.push({
                id: this.nextLaserId++,
                x: this.x + 12,
                y: this.y - 20,
                vx: 90,
                vy: -laserSpeed,
                radius: 4,
                damage: (this.isOwner ? 2 : 1) + extraDmg,
                color: laserColor,
                isOwnerBeam: this.isOwner,
                life: 1.5
            });
        } else {
            // Twin blasters
            lasers.push({
                id: this.nextLaserId++,
                x: this.x - 10,
                y: this.y - 18,
                vx: 0,
                vy: -laserSpeed,
                radius: this.hasHyperBlaster ? 5 : 4,
                damage: (this.isOwner ? 2 : 1) + extraDmg,
                color: laserColor,
                isOwnerBeam: this.isOwner,
                life: 1.5
            });
            lasers.push({
                id: this.nextLaserId++,
                x: this.x + 10,
                y: this.y - 18,
                vx: 0,
                vy: -laserSpeed,
                radius: this.hasHyperBlaster ? 5 : 4,
                damage: (this.isOwner ? 2 : 1) + extraDmg,
                color: laserColor,
                isOwnerBeam: this.isOwner,
                life: 1.5
            });
        }

        return lasers;
    }

    public render(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.tilt);

        // Ion Thruster Flame
        const flameLength = 16 + 8 * Math.sin(this.thrusterFlicker);
        const flameGrad = ctx.createLinearGradient(0, 16, 0, 16 + flameLength);
        flameGrad.addColorStop(0, '#ffffff');
        flameGrad.addColorStop(0.3, this.isOwner ? '#ffd700' : '#00f2fe');
        flameGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(-6, 16);
        ctx.lineTo(6, 16);
        ctx.lineTo(0, 16 + flameLength);
        ctx.closePath();
        ctx.fill();

        // Spaceship Hull Geometry (2D Sci-Fi Fighter)
        ctx.fillStyle = this.isOwner ? '#1a1824' : '#1e272e';
        ctx.strokeStyle = this.isOwner ? '#ffd700' : '#00f2fe';
        ctx.lineWidth = 2.5;

        // Main Body
        ctx.beginPath();
        ctx.moveTo(0, -26); // Nose
        ctx.lineTo(12, 10);
        ctx.lineTo(18, 16);
        ctx.lineTo(8, 16);
        ctx.lineTo(0, 12);
        ctx.lineTo(-8, 16);
        ctx.lineTo(-18, 16);
        ctx.lineTo(-12, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Wings with Cannons
        ctx.fillStyle = this.isOwner ? '#ffd700' : '#487eb0';
        ctx.beginPath();
        // Left Wing
        ctx.moveTo(-10, 4);
        ctx.lineTo(-24, 14);
        ctx.lineTo(-24, 6);
        ctx.lineTo(-12, -4);
        ctx.closePath();
        ctx.fill();

        // Right Wing
        ctx.beginPath();
        ctx.moveTo(10, 4);
        ctx.lineTo(24, 14);
        ctx.lineTo(24, 6);
        ctx.lineTo(12, -4);
        ctx.closePath();
        ctx.fill();

        // Blaster Barrels
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-23, -2, 3, 10);
        ctx.fillRect(20, -2, 3, 10);

        // Cockpit Glass
        const cockpitGrad = ctx.createLinearGradient(0, -16, 0, 2);
        cockpitGrad.addColorStop(0, '#ffffff');
        cockpitGrad.addColorStop(1, this.isOwner ? '#ff9f43' : '#00d2d3');
        ctx.fillStyle = cockpitGrad;
        ctx.beginPath();
        ctx.ellipse(0, -4, 4, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Playard Owner Golden Crown Insignia on ship
        if (this.isOwner) {
            ctx.fillStyle = '#ffd700';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('👑', 0, -18);
        }

        ctx.restore();
    }
}
