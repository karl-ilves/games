import * as THREE from 'three';
import { yardService } from '../../shared/yardService';
import { RocketType, DestructibleBuilding, InFlightRocket } from './types';
import { ROCKET_CATALOG, BUILDING_CONFIGS } from './catalog';
import { RocketAudio } from './audio';
import { setupLighting, buildCityGround } from './world/environment';
import { setupDestructibleBuildings, resetBuildings, updateBuildings } from './world/buildings';
import { TargetingSystem } from './systems/targetRing';
import { CombatSystem } from './systems/combat';
import { InputManager } from './systems/input';
import { HudManager } from './ui/hud';
import { RocketShopUI } from './ui/shop';

export class RocketGame {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    public audio: RocketAudio;

    public hud: HudManager;
    public targeting: TargetingSystem;
    public combat: CombatSystem;
    public shopUI: RocketShopUI;
    public input: InputManager;

    public groundPlaneMesh: THREE.Mesh | null = null;
    public targets: DestructibleBuilding[] = [];

    // Scoring, Upgrades & Round State
    public currentScore = 0;
    public totalPointsBank = 0;
    public shotsFired = 0;
    public targetsHit = 0;
    public roundDuration = 75;
    public roundRemaining = 75;
    public roundActive = true;
    private roundTimerInterval: any = null;

    public equippedRocket: RocketType = ROCKET_CATALOG[0];
    public unlockedRockets: Set<string> = new Set(['red_dart']);

    public get activeRockets(): InFlightRocket[] {
        return this.combat.activeRockets;
    }

    constructor() {
        this.audio = new RocketAudio();
        this.hud = new HudManager();

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0c111e);
        this.scene.fog = new THREE.FogExp2(0x0c111e, 0.0035);

        this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 1, 1400);
        this.camera.position.set(0, 78, 56);
        this.camera.lookAt(0, 0, -6);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const container = document.getElementById('canvas-container');
        if (container) {
            container.appendChild(this.renderer.domElement);
        }

        this.targeting = new TargetingSystem(this.scene, this.camera, this.equippedRocket);

        this.combat = new CombatSystem({
            scene: this.scene,
            audio: this.audio,
            hud: this.hud,
            targeting: this.targeting,
            getTargets: () => this.targets,
            onScoreAwarded: (pts) => {
                this.currentScore += pts;
                this.totalPointsBank += pts;
                this.saveProgress();
                this.updateHUD();
            },
            onTargetHit: () => {
                this.targetsHit++;
            }
        });

        this.shopUI = new RocketShopUI({
            audio: this.audio,
            hud: this.hud,
            getEquippedRocket: () => this.equippedRocket,
            setEquippedRocket: (r) => {
                this.equippedRocket = r;
                this.targeting.updateColor(r.color);
                this.updateHUD();
            },
            getUnlockedRockets: () => this.unlockedRockets,
            getTotalPointsBank: () => this.totalPointsBank,
            setTotalPointsBank: (pts) => {
                this.totalPointsBank = pts;
            },
            onProgressSave: () => this.saveProgress(),
            onYardBalanceChanged: () => this.updateHUD()
        });

        this.input = new InputManager({
            onFireRocket: () => this.fireRocket(),
            onToggleShop: (show) => this.toggleShop(show),
            onPlayAgain: () => {
                this.hud.toggleModal('round-end-modal', false);
                this.resetRound();
            },
            onToggleSound: () => {
                this.audio.soundEnabled = !this.audio.soundEnabled;
            },
            onCenterLock: () => {
                this.targeting.ringPosition.set(0, 0.2, 0);
                this.hud.showImpactToast('CENTER LOCK! 🎯');
            },
            onMouseMove: (cx, cy) => {
                this.targeting.handleMouseMove(cx, cy, this.groundPlaneMesh);
            },
            isSoundEnabled: () => this.audio.soundEnabled
        });
    }

    public init(): boolean {
        const vipOverlay = document.getElementById('vip-restricted-overlay');
        if (vipOverlay) vipOverlay.style.display = 'none';

        this.loadProgress();

        setupLighting(this.scene);
        this.groundPlaneMesh = buildCityGround(this.scene);
        this.targets = setupDestructibleBuildings(this.scene, BUILDING_CONFIGS);

        this.input.init();
        this.shopUI.init();

        this.updateHUD();
        this.renderShopCatalog();
        this.startRoundTimer();

        window.addEventListener('resize', () => this.onWindowResize());
        this.animate(0);

        yardService.recordPlayedGame({
            id: 'rocket',
            title: '🚀 Rocket Playard',
            description: 'Vaade õhust: 54 unikaalset raketti, põlevad ja tükkideks lendavad majad ning ultra-realistlikud plahvatused!',
            url: './games/rocket/index.html',
            icon: '🚀',
            badgeText: '🚀 3D ARCADE'
        });

        return true;
    }

    public fireRocket(): boolean {
        if (!this.roundActive) return false;
        this.shotsFired++;
        return this.combat.fireRocket(this.targeting.ringPosition, this.equippedRocket);
    }

    public triggerExplosion(impactPos: THREE.Vector3, rocketType: RocketType, hitTarget?: DestructibleBuilding, hitDistFromCenter: number = 0) {
        this.combat.triggerExplosion(impactPos, rocketType, hitTarget, hitDistFromCenter);
    }

    public toggleShop(show: boolean) {
        this.shopUI.toggleShop(show);
    }

    public renderShopCatalog() {
        this.shopUI.renderShopCatalog();
    }

    public updateHUD() {
        this.hud.updateHUD(this.roundRemaining, this.currentScore, this.equippedRocket);
    }

    public startRoundTimer() {
        if (this.roundTimerInterval) clearInterval(this.roundTimerInterval);
        this.roundRemaining = this.roundDuration;
        this.roundActive = true;

        this.roundTimerInterval = setInterval(() => {
            if (!this.roundActive) return;
            this.roundRemaining--;
            this.updateHUD();

            if (this.roundRemaining <= 0) {
                this.endRound();
            }
        }, 1000);
    }

    public endRound() {
        this.roundActive = false;
        clearInterval(this.roundTimerInterval);
        this.audio.playFanfare();

        const acc = this.shotsFired > 0 ? Math.round((this.targetsHit / this.shotsFired) * 100) : 0;
        const yardsReward = Math.max(10, Math.min(100, Math.floor(this.currentScore / 80)));
        try {
            yardService.awardYards(yardsReward);
        } catch (e) {}

        const scoreDisp = document.getElementById('winner-score-display');
        if (scoreDisp) scoreDisp.textContent = `${this.currentScore} PTS`;

        const hitDisp = document.getElementById('winner-targets-hit');
        if (hitDisp) hitDisp.textContent = `${this.targetsHit}`;

        const shotDisp = document.getElementById('winner-shots-fired');
        if (shotDisp) shotDisp.textContent = `${this.shotsFired}`;

        const accDisp = document.getElementById('winner-accuracy');
        if (accDisp) accDisp.textContent = `${acc}%`;

        const rewardDisp = document.getElementById('winner-yards-reward');
        if (rewardDisp) rewardDisp.textContent = `+${yardsReward} Y`;

        this.hud.toggleModal('round-end-modal', true);
    }

    public resetRound() {
        this.currentScore = 0;
        this.shotsFired = 0;
        this.targetsHit = 0;
        this.targeting.ringPosition.set(0, 0.2, 0);

        resetBuildings(this.targets, this.scene);
        this.combat.reset();

        this.updateHUD();
        this.startRoundTimer();
    }

    private saveProgress() {
        try {
            const data = {
                bank: this.totalPointsBank,
                unlocked: Array.from(this.unlockedRockets),
                equipped: this.equippedRocket.id
            };
            localStorage.setItem('playard_rocket_save', JSON.stringify(data));
        } catch (e) {}
    }

    private loadProgress() {
        try {
            const raw = localStorage.getItem('playard_rocket_save');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (typeof parsed.bank === 'number') this.totalPointsBank = parsed.bank;
                if (Array.isArray(parsed.unlocked)) {
                    parsed.unlocked.forEach((id: string) => this.unlockedRockets.add(id));
                }
                if (parsed.equipped) {
                    const found = ROCKET_CATALOG.find(r => r.id === parsed.equipped);
                    if (found) {
                        this.equippedRocket = found;
                        this.targeting.updateColor(found.color);
                    }
                }
            }
        } catch (e) {}
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private lastTime = 0;
    private animate(timestamp: number) {
        requestAnimationFrame((t) => this.animate(t));

        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;
        const time = timestamp / 1000;

        this.targeting.update(dt, this.input.keys, this.input.mobileMoveVector, this.input.isMobileDevice);
        this.combat.updateRockets(dt);
        this.combat.updateDebris(dt);
        updateBuildings(dt, time, this.targets, this.scene, (pos, col) => this.combat.createSmokePuff(pos, col));

        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const game = new RocketGame();
    (window as any).rocketGame = game;
    game.init();
});
