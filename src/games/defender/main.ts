import { getCurrentUserProfile, canAccessDefender, isTestMode } from '../../auth';
import { yardService } from '../../shared/yardService';
import { Asteroid, Laser } from './types';
import { DefenderState } from './state/defenderState';
import { SpaceWorld } from './world/spaceWorld';
import { PlayerController } from './systems/playerController';
import { AsteroidManager } from './systems/asteroidManager';
import { EffectsManager } from './systems/effects';
import { DefenderAudio } from './audio';
import { DefenderHud } from './ui/hud';

export class EarthDefenderGame {
    public canvas!: HTMLCanvasElement;
    public ctx!: CanvasRenderingContext2D;

    public state: DefenderState;
    public world!: SpaceWorld;
    public player!: PlayerController;
    public asteroidMgr: AsteroidManager;
    public effectsMgr: EffectsManager;
    public audio: DefenderAudio;
    public hud: DefenderHud;

    public lasers: Laser[] = [];
    private lastTime: number = 0;
    private isRunning: boolean = false;
    private hasAccess: boolean = false;

    constructor() {
        this.state = new DefenderState();
        this.asteroidMgr = new AsteroidManager();
        this.effectsMgr = new EffectsManager();
        this.audio = new DefenderAudio();
        this.hud = new DefenderHud();

        this.init();
    }

    private init() {
        console.log("🛡️ Initializing 2D Earth Defender (Maa Kaitsja)...");
        const profile = getCurrentUserProfile();
        const ownerAccess = canAccessDefender(profile, profile?.username);

        this.hasAccess = ownerAccess;
        this.state.setIsOwner(ownerAccess);

        if (!this.hasAccess) {
            console.warn("⛔ Access denied: 2D Earth Defender is exclusively for Playard Owner!");
            this.hud.showOwnerLockModal();
            return;
        }

        this.canvas = document.getElementById('defender-canvas') as HTMLCanvasElement;
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d')!;

        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());

        this.world = new SpaceWorld(this.canvas.width, this.canvas.height);
        this.player = new PlayerController(this.canvas.width / 2, this.canvas.height - 160, ownerAccess);

        this.setupInputs();
        this.setupButtons();

        // Track game activity for user
        yardService.recordPlayedGame({
            id: 'defender',
            title: '🛡️ 2D Earth Defender',
            description: '2D Space planetary defense mission for Playard Owner.',
            url: './games/defender/index.html',
            icon: '🛡️'
        });

        this.hud.showToast(ownerAccess ? "👑 Tere tulemast, Playard Owner! Maa vajab sinu kaitset!" : "🛡️ Kaitsesüsteemid aktiivsed!", "#ffd700");

        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    private handleResize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.world) this.world.resize(this.canvas.width, this.canvas.height);
    }

    private setupInputs() {
        let leftKey = false;
        let rightKey = false;
        let spaceKey = false;

        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') leftKey = true;
            if (e.code === 'KeyD' || e.code === 'ArrowRight') rightKey = true;
            if (e.code === 'Space') { spaceKey = true; e.preventDefault(); }
            if (e.code === 'KeyE') this.triggerEmp();
            this.player.setInputs(leftKey, rightKey, spaceKey);
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') leftKey = false;
            if (e.code === 'KeyD' || e.code === 'ArrowRight') rightKey = false;
            if (e.code === 'Space') spaceKey = false;
            this.player.setInputs(leftKey, rightKey, spaceKey);
        });

        // Pointer / Mouse Follow & Click
        window.addEventListener('mousemove', (e) => {
            if (e.clientY < this.canvas.height - 70) this.player.setPositionDirect(e.clientX);
        });
        window.addEventListener('mousedown', (e) => {
            if (e.clientY < this.canvas.height - 90 && !(e.target as HTMLElement).closest('.top-hud')) {
                this.player.setInputs(leftKey, rightKey, true);
            }
        });
        window.addEventListener('mouseup', () => this.player.setInputs(leftKey, rightKey, spaceKey));

        // Mobile touch buttons
        const leftBtn = document.getElementById('btn-touch-left');
        const rightBtn = document.getElementById('btn-touch-right');
        const fireBtn = document.getElementById('btn-touch-fire');
        const empBtn = document.getElementById('btn-touch-emp');

        const bindTouch = (el: HTMLElement | null, startVal: boolean, isFire: boolean) => {
            if (!el) return;
            el.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (isFire) spaceKey = true; else if (startVal) leftKey = true; else rightKey = true;
                this.player.setInputs(leftKey, rightKey, spaceKey);
            });
            el.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (isFire) spaceKey = false; else if (startVal) leftKey = false; else rightKey = false;
                this.player.setInputs(leftKey, rightKey, spaceKey);
            });
        };

        bindTouch(leftBtn, true, false);
        bindTouch(rightBtn, false, false);
        bindTouch(fireBtn, false, true);
        if (empBtn) empBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.triggerEmp(); });
    }

    private setupButtons() {
        const soundBtn = document.getElementById('btn-toggle-sound');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                const enabled = this.audio.toggleSound();
                this.hud.updateSoundButton(enabled);
            });
        }

        const restartBtn = document.getElementById('btn-restart-game');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.restartGame());
        }
    }

    public triggerEmp() {
        if (!this.state.canFireEmp()) {
            this.hud.showToast(`⚡ EMP laeb: ${this.state.getStats().empChargePct}%`, '#a55eea');
            return;
        }

        this.state.consumeEmp();
        this.audio.playEmpBlast();
        this.effectsMgr.addShockwave(this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) * 0.9, '#a55eea');
        this.effectsMgr.triggerScreenShake(0.5, 12);
        this.hud.showToast("💥 ORBITAALNE EMP VALLANDATUD!", "#a55eea");

        // Destroy all asteroids on screen
        for (const ast of [...this.asteroidMgr.asteroids]) {
            this.destroyAsteroid(ast, true);
        }
        this.asteroidMgr.asteroids = [];
    }

    private destroyAsteroid(ast: Asteroid, isEmp: boolean = false) {
        this.audio.playExplosion(ast.radius > 35);
        this.effectsMgr.addExplosion(ast.x, ast.y, ast.config.color, Math.floor(ast.radius * 0.8));
        this.effectsMgr.addShockwave(ast.x, ast.y, ast.radius * 2.2, ast.config.glowColor);

        const earned = this.state.addScore(ast.config.points);
        this.effectsMgr.addFloatingText(ast.x, ast.y, `+${earned}`, ast.config.type === 'gold' ? '#ffd32a' : '#00f2fe');

        if (!isEmp) {
            const children = this.asteroidMgr.splitAsteroid(ast);
            this.asteroidMgr.asteroids.push(...children);
        }
    }

    private restartGame() {
        this.state.resetGame();
        this.asteroidMgr.reset();
        this.effectsMgr.reset();
        this.lasers = [];
        this.hud.hideGameOver();
        this.hud.showToast("🚀 Uus missioon algas! Kaitse Maad!", "#00f2fe");
    }

    private gameLoop(time: number) {
        if (!this.isRunning) return;

        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    private update(dt: number) {
        if (this.state.getIsGameOver()) return;

        this.state.update(dt);
        this.world.update(dt, this.canvas.height);

        // Player & laser update
        const newLasers = this.player.update(dt, this.canvas.width, this.canvas.height, this.state.hasSpeedBoost());
        if (newLasers.length > 0) {
            this.lasers.push(...newLasers);
            this.audio.playLaser(this.state.getIsOwner());
        }

        // Update lasers movement & lifespan
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const l = this.lasers[i];
            l.x += l.vx * dt;
            l.y += l.vy * dt;
            l.life -= dt;
            if (l.y < -20 || l.life <= 0) {
                this.lasers.splice(i, 1);
            }
        }

        // Update Asteroids & check Earth impacts
        this.asteroidMgr.update(
            dt,
            this.canvas.width,
            this.canvas.height,
            this.state.getStats().wave,
            (ast) => {
                // Earth Impact
                const res = this.state.applyEarthDamage(ast.config.damageToEarth);
                this.audio.playEarthImpact();
                this.effectsMgr.triggerScreenShake(0.4, 10);
                this.effectsMgr.addExplosion(ast.x, this.canvas.height - 70, '#ff4757', 25, 220);
                this.effectsMgr.addShockwave(ast.x, this.canvas.height - 70, 110, '#ff4757');
                this.effectsMgr.addFloatingText(ast.x, this.canvas.height - 100, `-${ast.config.damageToEarth} HP`, '#ff4757');

                if (res.isDestroyed) {
                    this.hud.showGameOver(this.state.getStats());
                }
            },
            () => {}
        );

        // Laser - Asteroid Collisions
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            for (let j = this.asteroidMgr.asteroids.length - 1; j >= 0; j--) {
                const ast = this.asteroidMgr.asteroids[j];
                const dx = laser.x - ast.x;
                const dy = laser.y - ast.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < (laser.radius + ast.radius) * (laser.radius + ast.radius)) {
                    ast.hp -= laser.damage;
                    this.effectsMgr.addExplosion(laser.x, laser.y, laser.color, 6, 90);
                    this.lasers.splice(i, 1);

                    if (ast.hp <= 0) {
                        this.destroyAsteroid(ast);
                        this.asteroidMgr.asteroids.splice(j, 1);
                    }
                    break;
                }
            }
        }

        // Player - PowerUp Collisions
        for (let i = this.asteroidMgr.powerUps.length - 1; i >= 0; i--) {
            const p = this.asteroidMgr.powerUps[i];
            const dx = this.player.x - p.x;
            const dy = this.player.y - p.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < (this.player.radius + p.radius + 10) * (this.player.radius + p.radius + 10)) {
                this.state.activatePowerUp(p.type);
                this.audio.playPowerUp();
                this.effectsMgr.addShockwave(p.x, p.y, 45, '#2ed573');
                this.effectsMgr.addFloatingText(p.x, p.y, `+${p.type.toUpperCase()}`, '#2ed573');
                this.asteroidMgr.powerUps.splice(i, 1);
            }
        }

        // Wave progression check (every 25 asteroids destroyed)
        const stats = this.state.getStats();
        if (stats.asteroidsDestroyed >= stats.wave * 20) {
            this.state.advanceWave();
            this.audio.playPowerUp();
            this.hud.showToast(`🎉 LAINE ${stats.wave + 1} ALGAS! KILP TAASTATUD!`, '#00f2fe');
        }

        this.effectsMgr.update(dt);
        this.hud.updateStats(this.state.getStats());
    }

    private render() {
        this.ctx.save();

        // Screen Shake
        if (this.effectsMgr.screenShakeTime > 0) {
            const shake = (Math.random() - 0.5) * this.effectsMgr.screenShakeIntensity;
            this.ctx.translate(shake, shake);
        }

        const stats = this.state.getStats();
        const hpPct = stats.earthHp / stats.earthMaxHp;
        const shieldPct = stats.earthShield / stats.earthMaxShield;

        this.world.render(this.ctx, this.canvas.width, this.canvas.height, hpPct, shieldPct);
        this.effectsMgr.renderLasers(this.ctx, this.lasers);
        this.asteroidMgr.render(this.ctx);
        this.player.render(this.ctx);
        this.effectsMgr.renderEffects(this.ctx);

        this.ctx.restore();
    }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
    (window as any).defenderGame = new EarthDefenderGame();
});
