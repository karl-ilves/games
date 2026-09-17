import * as THREE from 'three';
import { yardService } from '../../shared/yardService';
import { getCurrentUserProfile, isPlayardOwner, isTestMode } from '../../auth';
import { avatarService } from '../../shared/avatar/AvatarService';
import { AvatarRig } from '../../shared/avatar/AvatarRig';
import { InGameEmotesWidget } from '../../shared/avatar/InGameEmotesWidget';
import { ObbyAudio } from './audio';
import { CourseData, buildCourse } from './world/stageBuilder';
import { createSkyDecorations } from './world/decorations';
import { CameraController } from './systems/camera';
import { InputManager } from './systems/input';
import { PlayerController } from './systems/playerController';
import { HudManager } from './ui/hud';
import { ShopModalUI } from './ui/shopModal';

(window as any).yardService = yardService;

export class ParkourObbyGame {
    public scene!: THREE.Scene;
    public camera!: THREE.PerspectiveCamera;
    public renderer!: THREE.WebGLRenderer;
    public audio = new ObbyAudio();

    public hud: HudManager = new HudManager();
    public cameraSystem: CameraController = new CameraController();
    public course!: CourseData;
    public player!: PlayerController;
    public input!: InputManager;
    public shop!: ShopModalUI;

    public isOwner: boolean = false;
    public currentStageIndex = 0;
    public currentCheckpointIndex = 0;
    public maxUnlockedStage = 1;
    public deaths = 0;
    public coins = 0;
    public timerStarted = false;
    public startTime = 0;
    public elapsedTime = 0;
    public bestTime = 0;
    public isVictory = false;

    // Customization & Shop states
    public purchasedItems: Set<string> = new Set(['skin_cyan']);
    public equippedHat: string = 'none';
    public equippedTrail: string = 'none';
    public equippedBoots: string = 'none';
    public equippedSkin: string = 'skin_cyan';

    public get playerAvatarRig(): AvatarRig {
        return this.player.playerAvatarRig;
    }

    public get emotesWidget(): InGameEmotesWidget | undefined {
        return this.player.emotesWidget;
    }

    constructor() {
        this.init();
    }

    private async init() {
        console.log("Initializing Parkour Obby 3D Simulator...");

        const userProf = getCurrentUserProfile();
        this.isOwner = isPlayardOwner(userProf?.email);
        const inTest = isTestMode() || (window as any).__PLAYARD_TEST_MODE__;

        const vipOverlay = document.getElementById('vip-restricted-overlay');
        if (vipOverlay) vipOverlay.style.display = 'none';

        if (!inTest && this.hud.checkCooldown()) {
            return;
        }

        yardService.recordPlayedGame({
            id: 'obby',
            title: '🏃‍♂️ 3D Parkour Obby',
            description: this.isOwner ? 'Väljakutsuv 10-tasemeline takistusrada ja parkour.' : 'Challenging 10-stage obstacle course and parkour.',
            url: './games/obby/index.html',
            icon: '🏃‍♂️',
            badgeText: '🏆 10 Stages Obby'
        });

        this.loadSaveData();
        this.setupScene();
        this.course = buildCourse(this.scene);

        this.player = new PlayerController({
            scene: this.scene,
            audio: this.audio,
            hud: this.hud,
            course: this.course,
            isOwner: () => this.isOwner,
            getEquippedHat: () => this.equippedHat,
            getEquippedTrail: () => this.equippedTrail,
            getEquippedBoots: () => this.equippedBoots,
            getEquippedSkin: () => this.equippedSkin,
            getCoins: () => this.coins,
            setCoins: (c) => { this.coins = c; },
            getDeaths: () => this.deaths,
            setDeaths: (d) => { this.deaths = d; },
            getCurrentStageIndex: () => this.currentStageIndex,
            setCurrentStageIndex: (idx) => { this.currentStageIndex = idx; },
            getCurrentCheckpointIndex: () => this.currentCheckpointIndex,
            setCurrentCheckpointIndex: (idx) => { this.currentCheckpointIndex = idx; },
            getMaxUnlockedStage: () => this.maxUnlockedStage,
            setMaxUnlockedStage: (stg) => { this.maxUnlockedStage = stg; },
            getBestTime: () => this.bestTime,
            setBestTime: (t) => { this.bestTime = t; },
            getElapsedTime: () => this.elapsedTime,
            getIsVictory: () => this.isVictory,
            setIsVictory: (v) => { this.isVictory = v; },
            onSaveGameData: () => this.saveGameData(),
            onUpdateHUD: () => this.updateHUD()
        });

        try {
            this.player.emotesWidget = new InGameEmotesWidget({
                getAvatarRig: () => this.player.playerAvatarRig,
                topOffset: 70,
                leftOffset: 16
            });
        } catch (e) {
            console.warn('InGameEmotesWidget init in Obby:', e);
        }

        avatarService.subscribe(cfg => {
            if (this.player?.playerAvatarRig) {
                this.player.playerAvatarRig.applyConfig(cfg);
            }
        });

        this.input = new InputManager({
            onJump: () => this.performJump(),
            onRespawn: () => this.respawnPlayer(),
            onToggleCamera: () => this.toggleCamera(),
            onStartTimer: () => {
                if (!this.timerStarted) {
                    this.timerStarted = true;
                    this.startTime = performance.now();
                }
            },
            onPointerDown: (x, y) => this.cameraSystem.handlePointerDown(x, y),
            onPointerMove: (x, y) => this.cameraSystem.handlePointerMove(x, y),
            onPointerUp: () => this.cameraSystem.handlePointerUp(),
            onWheel: (d) => this.cameraSystem.handleWheel(d)
        });
        this.input.init();

        this.shop = new ShopModalUI({
            isOwner: () => this.isOwner,
            getCoins: () => this.coins,
            setCoins: (c) => { this.coins = c; },
            getPurchasedItems: () => this.purchasedItems,
            getEquippedHat: () => this.equippedHat,
            setEquippedHat: (h) => {
                this.equippedHat = h;
                this.player.updateEquippedHatMesh();
            },
            getEquippedTrail: () => this.equippedTrail,
            setEquippedTrail: (t) => { this.equippedTrail = t; },
            getEquippedBoots: () => this.equippedBoots,
            setEquippedBoots: (b) => { this.equippedBoots = b; },
            getEquippedSkin: () => this.equippedSkin,
            setEquippedSkin: (s) => { this.equippedSkin = s; },
            getMaxUnlockedStage: () => this.maxUnlockedStage,
            getCurrentStageIndex: () => this.currentStageIndex,
            onSelectStage: (idx) => {
                this.currentStageIndex = idx;
                this.currentCheckpointIndex = idx;
                this.respawnPlayer();
            },
            onSaveData: () => this.saveGameData(),
            onUpdateHUD: () => this.updateHUD(),
            audio: this.audio,
            hud: this.hud
        });
        this.shop.init();

        this.setupUI();
        this.hud.applyLocalization(this.isOwner);
        this.updateHUD();

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);

        (window as any).__OBBY_GAME_INSTANCE__ = this;
        (window as any).parkourObby = this;
        console.log("Parkour Obby 3D Ready!");
    }

    private setupScene() {
        const container = document.getElementById('canvas-container');
        if (!container) return;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0c1017);
        this.scene.fog = new THREE.FogExp2(0x0c1017, 0.008);

        this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);

        try {
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            container.appendChild(this.renderer.domElement);
        } catch (e) {
            console.warn("WebGL context unavailable:", e);
        }

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xfff5e6, 0.8);
        dirLight.position.set(40, 80, 50);
        this.scene.add(dirLight);

        createSkyDecorations(this.scene);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    private setupUI() {
        document.getElementById('btn-respawn')?.addEventListener('click', () => this.respawnPlayer());
        document.getElementById('btn-toggle-camera')?.addEventListener('click', () => this.toggleCamera());

        const btnSound = document.getElementById('btn-toggle-sound');
        const soundIcon = document.getElementById('sound-icon');
        btnSound?.addEventListener('click', () => {
            this.audio.soundEnabled = !this.audio.soundEnabled;
            if (soundIcon) soundIcon.textContent = this.audio.soundEnabled ? '🔊' : '🔇';
        });

        yardService.subscribe((data) => {
            const coinVal = document.getElementById('hud-yards-val');
            if (coinVal) coinVal.textContent = (data.playCoins || 0).toLocaleString();
        });

        const initialCoins = yardService.getPlayCoins();
        const coinVal = document.getElementById('hud-yards-val');
        if (coinVal) coinVal.textContent = initialCoins.toLocaleString();

        const obbyYardIcon = document.getElementById('obby-yard-icon');
        if (obbyYardIcon) obbyYardIcon.innerHTML = yardService.renderPlayCoinSvg(20);
    }

    public toggleCamera() {
        this.cameraSystem.toggleCamera(this.player.playerAvatarRig);
    }

    public performJump() {
        this.player.performJump();
    }

    public respawnPlayer() {
        this.player.respawnPlayer();
    }

    public updateHUD() {
        this.hud.updateHUD(this.currentStageIndex, this.deaths, this.coins, this.bestTime, this.isOwner);
    }

    private loadSaveData() {
        try {
            this.coins = parseInt(localStorage.getItem('playard_obby_coins') || '0', 10) || 0;
            this.maxUnlockedStage = Math.max(1, parseInt(localStorage.getItem('playard_obby_max_stage') || '1', 10) || 1);
            this.bestTime = parseFloat(localStorage.getItem('playard_obby_best_time') || '0') || 0;
            const items = JSON.parse(localStorage.getItem('playard_obby_purchases') || '[]');
            if (Array.isArray(items)) items.forEach(id => this.purchasedItems.add(id));
            this.equippedHat = localStorage.getItem('playard_obby_hat') || 'none';
            this.equippedTrail = localStorage.getItem('playard_obby_trail') || 'none';
            this.equippedBoots = localStorage.getItem('playard_obby_boots') || 'none';
            this.equippedSkin = localStorage.getItem('playard_obby_skin') || 'skin_cyan';
        } catch (e) {}
    }

    private saveGameData() {
        try {
            localStorage.setItem('playard_obby_coins', this.coins.toString());
            localStorage.setItem('playard_obby_max_stage', this.maxUnlockedStage.toString());
            localStorage.setItem('playard_obby_purchases', JSON.stringify(Array.from(this.purchasedItems)));
            localStorage.setItem('playard_obby_hat', this.equippedHat);
            localStorage.setItem('playard_obby_trail', this.equippedTrail);
            localStorage.setItem('playard_obby_boots', this.equippedBoots);
            localStorage.setItem('playard_obby_skin', this.equippedSkin);
            if (this.bestTime > 0) localStorage.setItem('playard_obby_best_time', this.bestTime.toString());
        } catch (e) {}
    }

    private animate() {
        requestAnimationFrame(this.animate);
        const dt = 0.016;

        if (this.timerStarted && !this.isVictory) {
            this.elapsedTime = performance.now() - this.startTime;
            const timerVal = document.getElementById('hud-timer-val');
            if (timerVal) timerVal.textContent = this.hud.formatTime(this.elapsedTime);
        }

        this.player.updateDynamicObstacles(dt);
        this.player.update(dt, this.input.keys, this.input.joystickInput, this.cameraSystem.cameraRotation.y);
        this.cameraSystem.update(this.camera, this.player.playerGroup.position);
        this.player.updateEffects(dt);

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ParkourObbyGame());
} else {
    new ParkourObbyGame();
}
