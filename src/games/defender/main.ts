import { getCurrentUserProfile, isPlayardOwner, isOwnerUser } from '../../auth';
import { yardService } from '../../shared/yardService';
import { Asteroid, Laser } from './types';
import { DefenderState } from './state/defenderState';
import { SpaceWorld } from './world/spaceWorld';
import { PlayerController } from './systems/playerController';
import { AsteroidManager } from './systems/asteroidManager';
import { EffectsManager } from './systems/effects';
import { DefenseDroneSystem } from './systems/defenseDrone';
import { DefenderAudio } from './audio';
import { DefenderHud } from './ui/hud';
import { DefenderShopUI } from './ui/shop';
import { DefenderLeaderboardUI } from './ui/leaderboard';

export class EarthDefenderGame {
    public canvas!: HTMLCanvasElement;
    public ctx!: CanvasRenderingContext2D;

    public state: DefenderState;
    public world!: SpaceWorld;
    public player!: PlayerController;
    public asteroidMgr: AsteroidManager;
    public effectsMgr: EffectsManager;
    public droneSystem: DefenseDroneSystem;
    public audio: DefenderAudio;
    public hud: DefenderHud;
    public shopUI: DefenderShopUI;
    public leaderboardUI: DefenderLeaderboardUI;

    public lasers: Laser[] = [];
    private lastTime: number = 0;
    private isRunning: boolean = false;
    private hasAccess: boolean = false;

    constructor() {
        this.state = new DefenderState();
        this.asteroidMgr = new AsteroidManager();
        this.effectsMgr = new EffectsManager();
        this.droneSystem = new DefenseDroneSystem();
        this.audio = new DefenderAudio();
        this.hud = new DefenderHud();
        this.shopUI = new DefenderShopUI(this.state, (item) => {
            if (this.player) this.player.setHyperBlaster(this.state.hasHyperBlaster());
            this.hud.showToast(`🎉 Upgrade "${item.name}" equipped!`, '#2ed573');
        });
        this.leaderboardUI = new DefenderLeaderboardUI(this.state);

        this.init();
    }

    private init() {
        console.log("🛡️ Initializing 2D Earth Defender...");
        const profile = getCurrentUserProfile();
        const ownerAccess = !!(isOwnerUser(profile) || (profile?.email && isPlayardOwner(profile.email)) || (profile?.username && isOwnerUser(profile.username)));

        this.hasAccess = true;
        this.state.setIsOwner(ownerAccess);

        this.canvas = document.getElementById('defender-canvas') as HTMLCanvasElement;
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d')!;

        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());

        this.world = new SpaceWorld(this.canvas.width, this.canvas.height);
        this.player = new PlayerController(this.canvas.width / 2, this.canvas.height - 160, ownerAccess);
        this.player.setHyperBlaster(this.state.hasHyperBlaster());

        this.setupInputs();
        this.setupButtons();

        // Track game activity for user
        yardService.recordPlayedGame({
            id: 'defender',
            title: '🛡️ 2D Earth Defender',
            description: '2D Space planetary defense mission against incoming asteroids.',
            url: './games/defender/index.html',
            icon: '🛡️'
        });

        this.hud.showToast(ownerAccess ? "👑 Welcome, Playard Owner! Earth needs your defense!" : "🛡️ Welcome, Space Defender! Earth needs your defense!", "#ffd700");

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
        document.getElementById('btn-toggle-sound')?.addEventListener('click', () => {
            this.hud.updateSoundButton(this.audio.toggleSound());
        });
        document.getElementById('btn-restart-game')?.addEventListener('click', () => this.restartGame());

        const openShop = () => this.shopUI.open();
        document.getElementById('btn-hud-shop')?.addEventListener('click', openShop);
        document.getElementById('btn-gameover-shop')?.addEventListener('click', openShop);

        const openLb = () => this.leaderboardUI.open();
        document.getElementById('btn-hud-leaderboard')?.addEventListener('click', openLb);
        document.getElementById('btn-gameover-leaderboard')?.addEventListener('click', openLb);
    }

    public triggerEmp() {
        if (!this.state.canFireEmp()) {
            this.hud.showToast(`⚡ EMP Charging: ${this.state.getStats().empChargePct}%`, '#a55eea');
            return;
        }

        this.state.consumeEmp();
        this.audio.playEmpBlast();
        this.effectsMgr.addShockwave(this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) * 0.9, '#a55eea');
        this.effectsMgr.triggerScreenShake(0.5, 12);
        this.hud.showToast("💥 ORBITAL EMP NOVA DETONATED!", "#a55eea");

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
        this.hud.showToast("🚀 New mission started! Defend Earth!", "#00f2fe");
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
        const newLasers = this.player.update(dt, this.canvas.width, this.canvas.height, this.state.hasSpeedBoost(), this.state.hasTripleShot());
        if (newLasers.length > 0) {
            this.lasers.push(...newLasers);
            this.audio.playLaser(this.state.getIsOwner());
        }

        // Autonomous escort drone update
        if (this.state.hasDefenseDrone()) {
            const droneLasers = this.droneSystem.update(dt, this.player.x, this.player.y, true, this.asteroidMgr.asteroids);
            if (droneLasers.length > 0) this.lasers.push(...droneLasers);
        }

        // Update lasers
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const l = this.lasers[i];
            l.x += l.vx * dt;
            l.y += l.vy * dt;
            l.life -= dt;
            if (l.y < -20 || l.life <= 0) this.lasers.splice(i, 1);
        }

        // Update Asteroids & check Earth impacts
        this.asteroidMgr.update(dt, this.canvas.width, this.canvas.height, this.state.getStats().wave, (ast) => {
            const res = this.state.applyEarthDamage(ast.config.damageToEarth);
            this.audio.playEarthImpact();
            this.effectsMgr.triggerScreenShake(0.4, 10);
            this.effectsMgr.addExplosion(ast.x, this.canvas.height - 70, '#ff4757', 25, 220);
            this.effectsMgr.addShockwave(ast.x, this.canvas.height - 70, 110, '#ff4757');
            this.effectsMgr.addFloatingText(ast.x, this.canvas.height - 100, `-${ast.config.damageToEarth} HP`, '#ff4757');

            if (res.isDestroyed) {
                const finalStats = this.state.getStats();
                this.hud.showGameOver(finalStats);
                this.leaderboardUI.recordRunScore(finalStats.score, finalStats.wave, finalStats.asteroidsDestroyed);
            }
        }, () => {});

        // Laser - Asteroid Collisions
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            for (let j = this.asteroidMgr.asteroids.length - 1; j >= 0; j--) {
                const ast = this.asteroidMgr.asteroids[j];
                const dx = laser.x - ast.x;
                const dy = laser.y - ast.y;
                if (dx * dx + dy * dy < (laser.radius + ast.radius) ** 2) {
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
            if (dx * dx + dy * dy < (this.player.radius + p.radius + 10) ** 2) {
                this.state.activatePowerUp(p.type);
                this.audio.playPowerUp();
                this.effectsMgr.addShockwave(p.x, p.y, 45, '#2ed573');
                this.effectsMgr.addFloatingText(p.x, p.y, `+${p.type.toUpperCase()}`, '#2ed573');
                this.asteroidMgr.powerUps.splice(i, 1);
            }
        }

        // Wave progression check
        const stats = this.state.getStats();
        if (stats.asteroidsDestroyed >= stats.wave * 20) {
            this.state.advanceWave();
            this.audio.playPowerUp();
            this.hud.showToast(`🎉 WAVE ${stats.wave + 1} STARTED! SHIELD RESTORED!`, '#00f2fe');
        }

        this.effectsMgr.update(dt);
        this.hud.updateStats(this.state.getStats());
    }

    private render() {
        this.ctx.save();
        if (this.effectsMgr.screenShakeTime > 0) {
            const shake = (Math.random() - 0.5) * this.effectsMgr.screenShakeIntensity;
            this.ctx.translate(shake, shake);
        }

        const stats = this.state.getStats();
        this.world.render(this.ctx, this.canvas.width, this.canvas.height, stats.earthHp / stats.earthMaxHp, stats.earthShield / stats.earthMaxShield);
        this.effectsMgr.renderLasers(this.ctx, this.lasers);
        this.asteroidMgr.render(this.ctx);
        this.player.render(this.ctx);
        this.droneSystem.render(this.ctx, this.state.hasDefenseDrone());
        this.effectsMgr.renderEffects(this.ctx);
        this.ctx.restore();
    }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
    (window as any).defenderGame = new EarthDefenderGame();
});
