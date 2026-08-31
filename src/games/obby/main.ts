import * as THREE from 'three';
import { yardService } from '../../shared/yardService';
import { getCurrentUserProfile, isPlayardOwner, isTestMode } from '../../auth';

(window as any).yardService = yardService;

// --- Sound Synthesizer via Web Audio API ---
class ObbyAudio {
    private ctx: AudioContext | null = null;
    public soundEnabled: boolean = true;

    private init() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) this.ctx = new AudioContextClass();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    public playJump() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(520, this.ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    public playBounce() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    public playCheckpoint() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.08);
            gain.gain.setValueAtTime(0.25, this.ctx.currentTime + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + i * 0.08 + 0.25);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + i * 0.08);
            osc.stop(this.ctx.currentTime + i * 0.08 + 0.25);
        });
    }

    public playCoin() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, this.ctx.currentTime);
        osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    public playLava() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.35);
    }

    public playVictory() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const chords = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        chords.forEach((f, idx) => {
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(f, this.ctx.currentTime + idx * 0.1);
            gain.gain.setValueAtTime(0.15, this.ctx.currentTime + idx * 0.1);
            gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.1 + 0.6);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + idx * 0.1);
            osc.stop(this.ctx.currentTime + idx * 0.1 + 0.6);
        });
    }
}

// --- Obby Game Stage Definitions ---
interface StageInfo {
    id: number;
    nameEt: string;
    nameEn: string;
    color: number;
    spawnPos: THREE.Vector3;
}

const STAGES: StageInfo[] = [
    { id: 1, nameEt: 'Algaja Hüpped', nameEn: 'Beginner Steps', color: 0x00f2fe, spawnPos: new THREE.Vector3(0, 2, 0) },
    { id: 2, nameEt: 'Kaduvad Klotsid', nameEn: 'Disappearing Tiles', color: 0xffa502, spawnPos: new THREE.Vector3(0, 2, -45) },
    { id: 3, nameEt: 'Liikuvad Platvormid', nameEn: 'Moving Platforms', color: 0x2ed573, spawnPos: new THREE.Vector3(0, 2, -90) },
    { id: 4, nameEt: 'Punane Laavarada', nameEn: 'Lava Leap', color: 0xff4757, spawnPos: new THREE.Vector3(0, 2, -135) },
    { id: 5, nameEt: 'Super Batuudid', nameEn: 'Super Bounce Pads', color: 0x1e90ff, spawnPos: new THREE.Vector3(0, 2, -180) },
    { id: 6, nameEt: 'Pöörlevad Talad', nameEn: 'Spinning Sweepers', color: 0x9b59b6, spawnPos: new THREE.Vector3(0, 2, -230) },
    { id: 7, nameEt: 'Kitsas Tasakaalutala', nameEn: 'Sky Balance Beams', color: 0x1abc9c, spawnPos: new THREE.Vector3(0, 2, -280) },
    { id: 8, nameEt: 'Libe Jääpalee', nameEn: 'Slippery Ice Palace', color: 0x70a1ff, spawnPos: new THREE.Vector3(0, 2, -330) },
    { id: 9, nameEt: 'Veerevad Hiidvasarad', nameEn: 'Swinging Hammers', color: 0xe67e22, spawnPos: new THREE.Vector3(0, 2, -380) },
    { id: 10, nameEt: 'Taevane Tsitadell', nameEn: 'Celestial Citadel', color: 0xffd32a, spawnPos: new THREE.Vector3(0, 2, -430) }
];

interface DisappearingPlatform {
    mesh: THREE.Mesh;
    initialY: number;
    state: 'idle' | 'triggered' | 'fallen' | 'respawning';
    timer: number;
}

interface MovingPlatform {
    mesh: THREE.Mesh;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    speed: number;
    phase: number;
    delta: THREE.Vector3;
}

interface RotatingHazard {
    mesh: THREE.Object3D;
    speed: number;
}

interface CheckpointPad {
    index: number;
    mesh: THREE.Mesh;
    ringMesh: THREE.Mesh;
    flagMesh: THREE.Mesh;
    pos: THREE.Vector3;
    activated: boolean;
}

interface CoinPickup {
    mesh: THREE.Mesh;
    pos: THREE.Vector3;
    collected: boolean;
    value: number;
}

// --- Main Obby Game Class ---
export class ParkourObbyGame {
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private audio = new ObbyAudio();

    // Player Object & Mesh Parts
    private playerGroup!: THREE.Group;
    private playerBodyMesh!: THREE.Mesh;
    private playerHeadMesh!: THREE.Mesh;
    private playerLeftLeg!: THREE.Mesh;
    private playerRightLeg!: THREE.Mesh;
    private playerLeftArm!: THREE.Mesh;
    private playerRightArm!: THREE.Mesh;
    private playerHatGroup!: THREE.Group;
    private playerTrailPoints: THREE.Vector3[] = [];
    private playerTrailMesh!: THREE.Line;

    // Movement & Physics
    private velocity = new THREE.Vector3();
    private isGrounded = false;
    private currentMovingPlatform: MovingPlatform | null = null;
    private lastPlatformDelta = new THREE.Vector3();
    private jumpForce = 14.5;
    private moveSpeed = 11.0;
    private sprintMultiplier = 1.45;
    private currentStageIndex = 0;
    private currentCheckpointIndex = 0;
    private maxUnlockedStage = 1;
    private deaths = 0;
    private coins = 0;
    private timerStarted = false;
    private startTime = 0;
    private elapsedTime = 0;
    private bestTime = 0;
    private isFirstPerson = false;
    private isVictory = false;

    // Camera Controls
    private cameraOffset = new THREE.Vector3(0, 3.5, 7.5);
    private cameraRotation = { x: 0.25, y: 0 };
    private isPointerDown = false;
    private lastPointerPos = { x: 0, y: 0 };

    // Input States
    private keys: { [key: string]: boolean } = {};
    private joystickInput = { x: 0, y: 0 };

    // Dynamic Objects
    private platforms: THREE.Box3[] = [];
    private platformMeshes: THREE.Mesh[] = [];
    private bouncePads: { box: THREE.Box3; pos: THREE.Vector3 }[] = [];
    private hazards: { box: THREE.Box3; type: 'lava' | 'laser' }[] = [];
    private disappearingPlatforms: DisappearingPlatform[] = [];
    private movingPlatforms: MovingPlatform[] = [];
    private rotatingHazards: RotatingHazard[] = [];
    private checkpoints: CheckpointPad[] = [];
    private coinsList: CoinPickup[] = [];
    private particles: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = [];

    // Customization & Shop
    private purchasedItems: Set<string> = new Set(['skin_cyan']);
    private equippedHat: string = 'none';
    private equippedTrail: string = 'none';
    private equippedBoots: string = 'none';
    private equippedSkin: string = 'skin_cyan';

    // Localization
    private isOwner: boolean = false;

    constructor() {
        this.init();
    }

    private async init() {
        console.log("Initializing Parkour Obby 3D Simulator...");
        
        // 1. Role / Playard Owner Verification
        const userProf = getCurrentUserProfile();
        this.isOwner = isPlayardOwner(userProf?.email);
        const inTest = isTestMode() || (window as any).__PLAYARD_TEST_MODE__;

        // If not owner and not test mode, show VIP Restricted overlay
        const vipOverlay = document.getElementById('vip-restricted-overlay');
        if (!this.isOwner && !inTest && vipOverlay) {
            vipOverlay.style.display = 'flex';
            return;
        }

        // Record played game to Playard recently played list
        yardService.recordPlayedGame({
            id: 'obby',
            title: this.isOwner ? '🏃‍♂️ 3D Parkour Obby' : '🏃‍♂️ 3D Parkour Obby',
            description: this.isOwner ? 'Väljakutsuv 10-tasemeline takistusrada ja parkour.' : 'Challenging 10-stage obstacle course and parkour.',
            url: './games/obby/index.html',
            icon: '🏃‍♂️',
            badgeText: '🏆 10 Stages Obby'
        });

        // Load saved progress & coins
        this.loadSaveData();

        // 2. Setup Three.js Scene, Camera, Renderer
        this.setupScene();

        // 3. Build Player Character & Trail
        this.buildPlayerCharacter();

        // 4. Build 10 Obby Stages & Hazards
        this.buildCourse();

        // 5. Setup Input Handlers (Keyboard, Mouse, Touch)
        this.setupInputs();

        // 6. Setup UI Event Listeners & Modals
        this.setupUI();

        // 7. Update HUD initial state
        this.updateHUD();

        // 8. Start Animation Loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);

        // Notify ready
        (window as any).__OBBY_GAME_INSTANCE__ = this;
        console.log("Parkour Obby 3D Ready!");
    }

    private loadSaveData() {
        try {
            const savedCoins = localStorage.getItem('playard_obby_coins');
            if (savedCoins) this.coins = parseInt(savedCoins, 10) || 0;

            const savedStage = localStorage.getItem('playard_obby_max_stage');
            if (savedStage) this.maxUnlockedStage = Math.max(1, parseInt(savedStage, 10) || 1);

            const savedBest = localStorage.getItem('playard_obby_best_time');
            if (savedBest) this.bestTime = parseFloat(savedBest) || 0;

            const savedItems = localStorage.getItem('playard_obby_purchases');
            if (savedItems) {
                const arr = JSON.parse(savedItems);
                if (Array.isArray(arr)) arr.forEach(id => this.purchasedItems.add(id));
            }

            const savedHat = localStorage.getItem('playard_obby_hat');
            if (savedHat) this.equippedHat = savedHat;

            const savedTrail = localStorage.getItem('playard_obby_trail');
            if (savedTrail) this.equippedTrail = savedTrail;

            const savedBoots = localStorage.getItem('playard_obby_boots');
            if (savedBoots) this.equippedBoots = savedBoots;

            const savedSkin = localStorage.getItem('playard_obby_skin');
            if (savedSkin) this.equippedSkin = savedSkin;
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
            if (this.bestTime > 0) {
                localStorage.setItem('playard_obby_best_time', this.bestTime.toString());
            }
        } catch (e) {}
    }

    // --- Scene & Lighting Setup ---
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
            console.warn("WebGL context unavailable in headless mode:", e);
        }

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xfff5e6, 0.8);
        dirLight.position.set(40, 80, 50);
        this.scene.add(dirLight);

        // Decorative background clouds / islands
        this.createSkyDecorations();

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    private createSkyDecorations() {
        const cloudGeo = new THREE.DodecahedronGeometry(8, 1);
        const cloudMat = new THREE.MeshLambertMaterial({ color: 0x223046, transparent: true, opacity: 0.45 });
        for (let i = 0; i < 35; i++) {
            const cloud = new THREE.Mesh(cloudGeo, cloudMat);
            cloud.position.set(
                (Math.random() - 0.5) * 350,
                -30 + Math.random() * 40,
                -Math.random() * 500
            );
            cloud.scale.set(1.5 + Math.random() * 2, 0.8 + Math.random() * 0.8, 1.5 + Math.random() * 2);
            this.scene.add(cloud);
        }
    }

    // --- Player 3D Character ---
    private buildPlayerCharacter() {
        this.playerGroup = new THREE.Group();

        const skinColor = this.getSkinHex();

        // Body / Torso
        const bodyGeo = new THREE.BoxGeometry(0.8, 1.0, 0.5);
        const bodyMat = new THREE.MeshLambertMaterial({ color: skinColor });
        this.playerBodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        this.playerBodyMesh.position.y = 1.0;
        this.playerGroup.add(this.playerBodyMesh);

        // Head
        const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xffdbac });
        this.playerHeadMesh = new THREE.Mesh(headGeo, headMat);
        this.playerHeadMesh.position.y = 1.8;
        this.playerGroup.add(this.playerHeadMesh);

        // Visor / Eyes
        const visorGeo = new THREE.BoxGeometry(0.44, 0.18, 0.1);
        const visorMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 1.85, -0.28);
        this.playerGroup.add(visor);

        // Left & Right Arms
        const armGeo = new THREE.BoxGeometry(0.24, 0.8, 0.24);
        const armMat = new THREE.MeshLambertMaterial({ color: skinColor });
        this.playerLeftArm = new THREE.Mesh(armGeo, armMat);
        this.playerLeftArm.position.set(-0.55, 1.0, 0);
        this.playerGroup.add(this.playerLeftArm);

        this.playerRightArm = new THREE.Mesh(armGeo, armMat);
        this.playerRightArm.position.set(0.55, 1.0, 0);
        this.playerGroup.add(this.playerRightArm);

        // Left & Right Legs
        const legGeo = new THREE.BoxGeometry(0.28, 0.8, 0.28);
        const legMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
        this.playerLeftLeg = new THREE.Mesh(legGeo, legMat);
        this.playerLeftLeg.position.set(-0.25, 0.35, 0);
        this.playerGroup.add(this.playerLeftLeg);

        this.playerRightLeg = new THREE.Mesh(legGeo, legMat);
        this.playerRightLeg.position.set(0.25, 0.35, 0);
        this.playerGroup.add(this.playerRightLeg);

        // Hat Attachment Anchor
        this.playerHatGroup = new THREE.Group();
        this.playerHatGroup.position.set(0, 2.15, 0);
        this.playerGroup.add(this.playerHatGroup);
        this.updateEquippedHatMesh();

        // Spawn position
        this.playerGroup.position.copy(STAGES[0].spawnPos);
        this.scene.add(this.playerGroup);

        // Particle Trail
        const maxPoints = 25;
        const trailPositions = new Float32Array(maxPoints * 3);
        const trailGeo = new THREE.BufferGeometry();
        trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        const trailMat = new THREE.LineBasicMaterial({ color: 0x00f2fe, linewidth: 3, transparent: true, opacity: 0.8 });
        this.playerTrailMesh = new THREE.Line(trailGeo, trailMat);
        this.scene.add(this.playerTrailMesh);
    }

    private getSkinHex(): number {
        switch (this.equippedSkin) {
            case 'skin_ruby': return 0xff4757;
            case 'skin_emerald': return 0x2ed573;
            case 'skin_gold': return 0xffd32a;
            case 'skin_purple': return 0x9b59b6;
            case 'skin_cyan':
            default: return 0x00f2fe;
        }
    }

    private updateEquippedHatMesh() {
        while (this.playerHatGroup.children.length > 0) {
            this.playerHatGroup.remove(this.playerHatGroup.children[0]);
        }

        if (this.equippedHat === 'hat_crown') {
            const crownGeo = new THREE.CylinderGeometry(0.35, 0.28, 0.25, 8);
            const crownMat = new THREE.MeshLambertMaterial({ color: 0xffd32a });
            const crown = new THREE.Mesh(crownGeo, crownMat);
            this.playerHatGroup.add(crown);
        } else if (this.equippedHat === 'hat_viking') {
            const helmGeo = new THREE.SphereGeometry(0.34, 12, 12);
            const helmMat = new THREE.MeshLambertMaterial({ color: 0x747d8c });
            const helm = new THREE.Mesh(helmGeo, helmMat);
            const hornGeo = new THREE.ConeGeometry(0.08, 0.35, 8);
            const hornMat = new THREE.MeshLambertMaterial({ color: 0xfff200 });
            const hornL = new THREE.Mesh(hornGeo, hornMat);
            hornL.position.set(-0.35, 0.15, 0);
            hornL.rotation.z = Math.PI / 4;
            const hornR = new THREE.Mesh(hornGeo, hornMat);
            hornR.position.set(0.35, 0.15, 0);
            hornR.rotation.z = -Math.PI / 4;
            helm.add(hornL, hornR);
            this.playerHatGroup.add(helm);
        } else if (this.equippedHat === 'hat_halo') {
            const haloGeo = new THREE.TorusGeometry(0.36, 0.05, 8, 24);
            const haloMat = new THREE.MeshBasicMaterial({ color: 0xfff200 });
            const halo = new THREE.Mesh(haloGeo, haloMat);
            halo.rotation.x = Math.PI / 2;
            halo.position.y = 0.15;
            this.playerHatGroup.add(halo);
        } else if (this.equippedHat === 'hat_tophat') {
            const baseGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.05, 16);
            const topGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.45, 16);
            const topMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
            const tophat = new THREE.Mesh(baseGeo, topMat);
            const cylinder = new THREE.Mesh(topGeo, topMat);
            cylinder.position.y = 0.23;
            tophat.add(cylinder);
            this.playerHatGroup.add(tophat);
        }
    }

    // --- Build Obstacle Course & 10 Stages ---
    private buildCourse() {
        // Build Checkpoint Pads for all 10 stages
        STAGES.forEach((stage, idx) => {
            this.createCheckpointPad(stage.spawnPos, idx);
        });

        // Stage 1: Algaja Hüpped / Stepping Stones
        this.createPlatform(new THREE.Vector3(0, 0, 0), new THREE.Vector3(8, 1, 8), 0x00f2fe);
        this.createPlatform(new THREE.Vector3(0, 0, -10), new THREE.Vector3(3.5, 1, 3.5), 0x4facfe);
        this.createPlatform(new THREE.Vector3(3, 0.5, -18), new THREE.Vector3(3, 1, 3), 0x00f2fe);
        this.createPlatform(new THREE.Vector3(-3, 1.0, -26), new THREE.Vector3(3, 1, 3), 0x4facfe);
        this.createPlatform(new THREE.Vector3(0, 1.5, -34), new THREE.Vector3(4, 1, 4), 0x00f2fe);
        this.createCoin(new THREE.Vector3(3, 2.5, -18), 10);
        this.createCoin(new THREE.Vector3(-3, 3.0, -26), 10);

        // Stage 2: Kaduvad Klotsid / Disappearing Tiles
        this.createPlatform(new THREE.Vector3(0, 0, -45), new THREE.Vector3(7, 1, 7), 0xffa502);
        for (let i = 0; i < 6; i++) {
            const posX = (i % 2 === 0 ? -2.2 : 2.2);
            const posZ = -54 - i * 5.2;
            const posY = 0 + i * 0.2;
            this.createDisappearingPlatform(new THREE.Vector3(posX, posY, posZ), new THREE.Vector3(3.2, 0.6, 3.2), 0xff6348);
            if (i === 2 || i === 4) this.createCoin(new THREE.Vector3(posX, posY + 1.8, posZ), 10);
        }

        // Stage 3: Liikuvad Platvormid / Moving Platforms
        this.createPlatform(new THREE.Vector3(0, 0, -90), new THREE.Vector3(7, 1, 7), 0x2ed573);
        this.createMovingPlatform(new THREE.Vector3(-4, 0, -100), new THREE.Vector3(4, 0, -100), new THREE.Vector3(4, 0.8, 4), 2.2, 0x10ac84);
        this.createMovingPlatform(new THREE.Vector3(0, -0.5, -112), new THREE.Vector3(0, 3.5, -112), new THREE.Vector3(4, 0.8, 4), 1.8, 0x2ed573);
        this.createMovingPlatform(new THREE.Vector3(4, 1.0, -124), new THREE.Vector3(-4, 1.0, -124), new THREE.Vector3(4, 0.8, 4), 2.5, 0x10ac84);
        this.createCoin(new THREE.Vector3(0, 5.0, -112), 25);

        // Stage 4: Punane Laavarada / Lava Leap
        this.createPlatform(new THREE.Vector3(0, 0, -135), new THREE.Vector3(7, 1, 7), 0xff4757);
        // Floor Lava hazard zone
        this.createHazard(new THREE.Vector3(0, -1.0, -155), new THREE.Vector3(20, 0.6, 36), 'lava');
        this.createPlatform(new THREE.Vector3(-2.5, 0.3, -145), new THREE.Vector3(2.5, 0.8, 2.5), 0x2f3542);
        this.createPlatform(new THREE.Vector3(2.5, 0.6, -153), new THREE.Vector3(2.5, 0.8, 2.5), 0x2f3542);
        this.createPlatform(new THREE.Vector3(-2.5, 0.9, -161), new THREE.Vector3(2.5, 0.8, 2.5), 0x2f3542);
        this.createPlatform(new THREE.Vector3(2.5, 1.2, -169), new THREE.Vector3(2.5, 0.8, 2.5), 0x2f3542);
        this.createCoin(new THREE.Vector3(0, 2.8, -157), 25);

        // Stage 5: Super Batuudid / Bounce Pads
        this.createPlatform(new THREE.Vector3(0, 0, -180), new THREE.Vector3(7, 1, 7), 0x1e90ff);
        this.createBouncePad(new THREE.Vector3(0, 0.5, -188), new THREE.Vector3(3.5, 0.4, 3.5));
        this.createPlatform(new THREE.Vector3(0, 8.5, -200), new THREE.Vector3(5, 1, 5), 0x3742fa);
        this.createBouncePad(new THREE.Vector3(0, 9.0, -208), new THREE.Vector3(3.5, 0.4, 3.5));
        this.createPlatform(new THREE.Vector3(0, 16.5, -220), new THREE.Vector3(5, 1, 5), 0x3742fa);
        this.createCoin(new THREE.Vector3(0, 12.0, -204), 25);

        // Stage 6: Pöörlevad Talad / Spinning Sweepers
        this.createPlatform(new THREE.Vector3(0, 0, -230), new THREE.Vector3(8, 1, 8), 0x9b59b6);
        this.createPlatform(new THREE.Vector3(0, 0, -245), new THREE.Vector3(7, 1, 7), 0x8e44ad);
        this.createRotatingHazard(new THREE.Vector3(0, 1.0, -245), 7.0, 1.8);
        this.createPlatform(new THREE.Vector3(0, 0.5, -260), new THREE.Vector3(7, 1, 7), 0x8e44ad);
        this.createRotatingHazard(new THREE.Vector3(0, 1.5, -260), 7.0, -2.5);
        this.createCoin(new THREE.Vector3(0, 2.8, -245), 15);

        // Stage 7: Kitsas Tasakaalutala / Sky Balance Beams
        this.createPlatform(new THREE.Vector3(0, 0, -280), new THREE.Vector3(7, 1, 7), 0x1abc9c);
        this.createPlatform(new THREE.Vector3(0, 0, -290), new THREE.Vector3(0.8, 0.8, 12), 0x16a085);
        this.createPlatform(new THREE.Vector3(2.5, 0.3, -302), new THREE.Vector3(5.5, 0.8, 0.8), 0x16a085);
        this.createPlatform(new THREE.Vector3(5.0, 0.6, -314), new THREE.Vector3(0.8, 0.8, 12), 0x16a085);
        this.createPlatform(new THREE.Vector3(2.5, 0.9, -323), new THREE.Vector3(5.5, 0.8, 0.8), 0x16a085);
        this.createCoin(new THREE.Vector3(5.0, 2.2, -314), 25);

        // Stage 8: Libe Jääpalee / Slippery Ice Palace
        this.createPlatform(new THREE.Vector3(0, 0, -330), new THREE.Vector3(7, 1, 7), 0x70a1ff);
        this.createPlatform(new THREE.Vector3(0, -0.5, -342), new THREE.Vector3(4, 0.6, 14), 0xa4b0be);
        this.createPlatform(new THREE.Vector3(-3.5, -1.0, -356), new THREE.Vector3(4, 0.6, 12), 0xa4b0be);
        this.createPlatform(new THREE.Vector3(0, -1.5, -368), new THREE.Vector3(4, 0.6, 12), 0xa4b0be);
        this.createCoin(new THREE.Vector3(-3.5, 0.8, -356), 25);

        // Stage 9: Veerevad Hiidvasarad / Swinging Hammers
        this.createPlatform(new THREE.Vector3(0, 0, -380), new THREE.Vector3(7, 1, 7), 0xe67e22);
        this.createPlatform(new THREE.Vector3(0, 0, -394), new THREE.Vector3(4, 0.8, 20), 0xd35400);
        this.createSwingingHammer(new THREE.Vector3(0, 5, -390), 2.2);
        this.createSwingingHammer(new THREE.Vector3(0, 5, -398), -2.5);
        this.createPlatform(new THREE.Vector3(0, 0.5, -412), new THREE.Vector3(4, 0.8, 14), 0xd35400);
        this.createSwingingHammer(new THREE.Vector3(0, 5, -410), 2.8);
        this.createCoin(new THREE.Vector3(0, 2.5, -394), 25);

        // Stage 10: Finaal - Taevane Tsitadell / Celestial Citadel
        this.createPlatform(new THREE.Vector3(0, 0, -430), new THREE.Vector3(12, 1.2, 12), 0xffd32a);
        
        // Ascending Golden Steps
        for (let s = 0; s < 7; s++) {
            const stepPos = new THREE.Vector3(0, 1.0 + s * 1.2, -440 - s * 4.5);
            this.createPlatform(stepPos, new THREE.Vector3(6 - s * 0.4, 0.8, 3.5), 0xf5cd79);
        }

        // Final Floating Golden Citadel Podium
        const finalPodiumPos = new THREE.Vector3(0, 10.5, -475);
        this.createPlatform(finalPodiumPos, new THREE.Vector3(16, 2.0, 16), 0xffd32a);
        this.createGiantTrophy(new THREE.Vector3(0, 12.0, -475));
    }

    private createPlatform(pos: THREE.Vector3, size: THREE.Vector3, colorHex: number) {
        const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
        const mat = new THREE.MeshLambertMaterial({ color: colorHex });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        this.scene.add(mesh);

        const box = new THREE.Box3().setFromObject(mesh);
        this.platforms.push(box);
        this.platformMeshes.push(mesh);
        return mesh;
    }

    private createDisappearingPlatform(pos: THREE.Vector3, size: THREE.Vector3, colorHex: number) {
        const mesh = this.createPlatform(pos, size, colorHex);
        this.disappearingPlatforms.push({
            mesh,
            initialY: pos.y,
            state: 'idle',
            timer: 0
        });
    }

    private createMovingPlatform(startPos: THREE.Vector3, endPos: THREE.Vector3, size: THREE.Vector3, speed: number, colorHex: number) {
        const mesh = this.createPlatform(startPos.clone(), size, colorHex);
        this.movingPlatforms.push({
            mesh,
            startPos,
            endPos,
            speed,
            phase: Math.random() * Math.PI,
            delta: new THREE.Vector3()
        });
    }

    private createBouncePad(pos: THREE.Vector3, size: THREE.Vector3) {
        const mesh = this.createPlatform(pos, size, 0x2ed573);
        const indicatorGeo = new THREE.BoxGeometry(size.x * 0.7, 0.05, size.z * 0.7);
        const indicatorMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
        const ind = new THREE.Mesh(indicatorGeo, indicatorMat);
        ind.position.y = size.y / 2 + 0.03;
        mesh.add(ind);

        const box = new THREE.Box3().setFromObject(mesh);
        this.bouncePads.push({ box, pos: pos.clone() });
    }

    private createRotatingHazard(pos: THREE.Vector3, radius: number, speed: number) {
        const group = new THREE.Group();
        group.position.copy(pos);

        const hubGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.6, 16);
        const hubMat = new THREE.MeshLambertMaterial({ color: 0xff4757 });
        const hub = new THREE.Mesh(hubGeo, hubMat);
        group.add(hub);

        const barGeo = new THREE.BoxGeometry(radius * 2, 0.4, 0.4);
        const barMat = new THREE.MeshBasicMaterial({ color: 0xff4757 });
        const bar = new THREE.Mesh(barGeo, barMat);
        group.add(bar);

        this.scene.add(group);
        this.rotatingHazards.push({ mesh: group, speed });
    }

    private createSwingingHammer(pos: THREE.Vector3, speed: number) {
        const group = new THREE.Group();
        group.position.copy(pos);

        const pivotGeo = new THREE.SphereGeometry(0.5, 12, 12);
        const pivotMat = new THREE.MeshLambertMaterial({ color: 0x747d8c });
        const pivot = new THREE.Mesh(pivotGeo, pivotMat);
        group.add(pivot);

        const armGeo = new THREE.CylinderGeometry(0.12, 0.12, 5.5, 8);
        const armMat = new THREE.MeshLambertMaterial({ color: 0x2f3542 });
        const arm = new THREE.Mesh(armGeo, armMat);
        arm.position.y = -2.75;
        group.add(arm);

        const headGeo = new THREE.BoxGeometry(2.4, 1.4, 1.4);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xff4757 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = -5.5;
        group.add(head);

        this.scene.add(group);
        this.rotatingHazards.push({ mesh: group, speed });
    }

    private createHazard(pos: THREE.Vector3, size: THREE.Vector3, type: 'lava' | 'laser') {
        const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
        const mat = new THREE.MeshBasicMaterial({ color: type === 'lava' ? 0xff4757 : 0xff3838 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        this.scene.add(mesh);

        const box = new THREE.Box3().setFromObject(mesh);
        this.hazards.push({ box, type });
    }

    private createCheckpointPad(pos: THREE.Vector3, index: number) {
        const baseGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.25, 24);
        const baseMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.set(pos.x, pos.y - 0.9, pos.z);
        this.scene.add(base);

        const ringGeo = new THREE.TorusGeometry(1.6, 0.08, 12, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: index === 0 ? 0x2ed573 : 0xff4757 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.15;
        base.add(ring);

        // Flag pole & banner
        const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8);
        const poleMat = new THREE.MeshLambertMaterial({ color: 0xd2dae2 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(-1.4, 1.3, 0);
        base.add(pole);

        const flagGeo = new THREE.BoxGeometry(0.8, 0.5, 0.04);
        const flagMat = new THREE.MeshLambertMaterial({ color: index === 0 ? 0x2ed573 : 0xff4757 });
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set(0.4, 0.8, 0);
        pole.add(flag);

        this.checkpoints.push({
            index,
            mesh: base,
            ringMesh: ring,
            flagMesh: flag,
            pos: pos.clone(),
            activated: index === 0
        });
    }

    private createCoin(pos: THREE.Vector3, value: number) {
        const geo = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 16);
        const mat = new THREE.MeshLambertMaterial({ color: 0xffd32a });
        const coin = new THREE.Mesh(geo, mat);
        coin.position.copy(pos);
        coin.rotation.x = Math.PI / 2;
        this.scene.add(coin);
        this.coinsList.push({ mesh: coin, pos: pos.clone(), collected: false, value });
    }

    private createGiantTrophy(pos: THREE.Vector3) {
        const group = new THREE.Group();
        group.position.copy(pos);

        const baseGeo = new THREE.CylinderGeometry(1.6, 2.0, 0.8, 16);
        const baseMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
        const base = new THREE.Mesh(baseGeo, baseMat);
        group.add(base);

        const cupGeo = new THREE.CylinderGeometry(1.4, 0.6, 2.2, 16);
        const goldMat = new THREE.MeshLambertMaterial({ color: 0xffd32a });
        const cup = new THREE.Mesh(cupGeo, goldMat);
        cup.position.y = 1.8;
        group.add(cup);

        const starGeo = new THREE.OctahedronGeometry(0.8, 0);
        const star = new THREE.Mesh(starGeo, goldMat);
        star.position.y = 3.6;
        group.add(star);

        this.scene.add(group);
    }

    // --- Inputs & Controls ---
    private setupInputs() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'KeyR') this.respawnPlayer();
            if (e.code === 'KeyV') this.toggleCamera();
            if (!this.timerStarted && (e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD' || e.code === 'Space')) {
                this.timerStarted = true;
                this.startTime = performance.now();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Mouse Orbit Controls
        window.addEventListener('mousedown', (e) => {
            if ((e.target as HTMLElement).tagName === 'CANVAS') {
                this.isPointerDown = true;
                this.lastPointerPos = { x: e.clientX, y: e.clientY };
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isPointerDown) {
                const dx = e.clientX - this.lastPointerPos.x;
                const dy = e.clientY - this.lastPointerPos.y;
                this.cameraRotation.y -= dx * 0.005;
                this.cameraRotation.x = Math.max(-0.4, Math.min(1.2, this.cameraRotation.x + dy * 0.005));
                this.lastPointerPos = { x: e.clientX, y: e.clientY };
            }
        });

        window.addEventListener('mouseup', () => { this.isPointerDown = false; });

        window.addEventListener('wheel', (e) => {
            this.cameraOffset.z = Math.max(3.0, Math.min(16.0, this.cameraOffset.z + e.deltaY * 0.01));
        });

        // Mobile Touch Joystick
        const joystickZone = document.getElementById('touch-joystick-zone');
        const joystickKnob = document.getElementById('touch-joystick-knob');
        if (joystickZone && joystickKnob) {
            let touchId: number | null = null;
            let center = { x: 0, y: 0 };

            joystickZone.addEventListener('touchstart', (e) => {
                const t = e.changedTouches[0];
                touchId = t.identifier;
                const rect = joystickZone.getBoundingClientRect();
                center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                if (!this.timerStarted) { this.timerStarted = true; this.startTime = performance.now(); }
            }, { passive: false });

            joystickZone.addEventListener('touchmove', (e) => {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const t = e.changedTouches[i];
                    if (t.identifier === touchId) {
                        const dx = t.clientX - center.x;
                        const dy = t.clientY - center.y;
                        const dist = Math.min(45, Math.hypot(dx, dy));
                        const angle = Math.atan2(dy, dx);
                        const kx = Math.cos(angle) * dist;
                        const ky = Math.sin(angle) * dist;
                        joystickKnob.style.transform = `translate(${kx}px, ${ky}px)`;
                        this.joystickInput.x = kx / 45;
                        this.joystickInput.y = ky / 45;
                    }
                }
            }, { passive: false });

            const resetJoystick = () => {
                touchId = null;
                joystickKnob.style.transform = `translate(0px, 0px)`;
                this.joystickInput = { x: 0, y: 0 };
            };
            joystickZone.addEventListener('touchend', resetJoystick);
            joystickZone.addEventListener('touchcancel', resetJoystick);
        }

        // Mobile Jump & Action Touch Buttons
        const touchJump = document.getElementById('btn-touch-jump');
        if (touchJump) {
            touchJump.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys['Space'] = true;
                if (!this.timerStarted) { this.timerStarted = true; this.startTime = performance.now(); }
            });
            touchJump.addEventListener('touchend', () => { this.keys['Space'] = false; });
        }

        const touchRespawn = document.getElementById('btn-touch-respawn');
        if (touchRespawn) {
            touchRespawn.addEventListener('click', () => this.respawnPlayer());
        }

        // Detect touch device to show mobile controls
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            const mobileLayer = document.getElementById('mobile-controls-layer');
            if (mobileLayer) mobileLayer.style.display = 'block';
        }
    }

    // --- UI & Modals ---
    private setupUI() {
        // Respawn Button
        document.getElementById('btn-respawn')?.addEventListener('click', () => this.respawnPlayer());

        // Camera Toggle Button
        document.getElementById('btn-toggle-camera')?.addEventListener('click', () => this.toggleCamera());

        // Sound Toggle
        const btnSound = document.getElementById('btn-toggle-sound');
        const soundIcon = document.getElementById('sound-icon');
        btnSound?.addEventListener('click', () => {
            this.audio.soundEnabled = !this.audio.soundEnabled;
            if (soundIcon) soundIcon.textContent = this.audio.soundEnabled ? '🔊' : '🔇';
        });

        // Shop Modal
        const modalShop = document.getElementById('modal-shop');
        document.getElementById('btn-open-shop')?.addEventListener('click', () => {
            this.renderShop();
            if (modalShop) modalShop.style.display = 'flex';
        });
        document.getElementById('btn-close-shop')?.addEventListener('click', () => {
            if (modalShop) modalShop.style.display = 'none';
        });

        // Stages Modal
        const modalStages = document.getElementById('modal-stages');
        document.getElementById('btn-open-stages')?.addEventListener('click', () => {
            this.renderStagesSelector();
            if (modalStages) modalStages.style.display = 'flex';
        });
        document.getElementById('btn-close-stages')?.addEventListener('click', () => {
            if (modalStages) modalStages.style.display = 'none';
        });

        // Help Modal
        const modalHelp = document.getElementById('modal-help');
        document.getElementById('btn-open-help')?.addEventListener('click', () => {
            if (modalHelp) modalHelp.style.display = 'flex';
        });
        document.getElementById('btn-close-help')?.addEventListener('click', () => {
            if (modalHelp) modalHelp.style.display = 'none';
        });

        // Victory Replay Button
        document.getElementById('btn-victory-replay')?.addEventListener('click', () => {
            const modalVic = document.getElementById('modal-victory');
            if (modalVic) modalVic.style.display = 'none';
            this.isVictory = false;
            this.currentStageIndex = 0;
            this.currentCheckpointIndex = 0;
            this.timerStarted = false;
            this.elapsedTime = 0;
            this.respawnPlayer();
        });

        // Yard Wallet subscription
        yardService.subscribe((data) => {
            const yardVal = document.getElementById('hud-yards-val');
            if (yardVal) yardVal.textContent = data.yards.toLocaleString();
        });

        const initialYards = yardService.getYards();
        const yardVal = document.getElementById('hud-yards-val');
        if (yardVal) yardVal.textContent = initialYards.toLocaleString();

        const obbyYardIcon = document.getElementById('obby-yard-icon');
        if (obbyYardIcon) obbyYardIcon.innerHTML = yardService.renderYardSvg(20);
    }

    private toggleCamera() {
        this.isFirstPerson = !this.isFirstPerson;
        const camLabel = document.getElementById('hud-cam-label');
        if (camLabel) camLabel.textContent = this.isFirstPerson ? '1st Person' : '3rd Person';
        this.playerBodyMesh.visible = !this.isFirstPerson;
        this.playerHeadMesh.visible = !this.isFirstPerson;
        this.playerLeftArm.visible = !this.isFirstPerson;
        this.playerRightArm.visible = !this.isFirstPerson;
        this.playerLeftLeg.visible = !this.isFirstPerson;
        this.playerRightLeg.visible = !this.isFirstPerson;
        this.playerHatGroup.visible = !this.isFirstPerson;
    }

    private showToast(msg: string) {
        const toast = document.createElement('div');
        toast.className = 'toast-notify';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    }

    // --- Shop System ---
    private renderShop() {
        const hatsContainer = document.getElementById('shop-hats-grid');
        const trailsContainer = document.getElementById('shop-trails-grid');
        const bootsContainer = document.getElementById('shop-boots-grid');
        const skinsContainer = document.getElementById('shop-skins-grid');

        const HATS = [
            { id: 'hat_crown', name: this.isOwner ? '👑 Kuldne Kroon' : '👑 Golden Crown', price: 50 },
            { id: 'hat_viking', name: this.isOwner ? '🪖 Viikingikiiver' : '🪖 Viking Helmet', price: 80 },
            { id: 'hat_halo', name: this.isOwner ? '😇 Helendav Aupaiste' : '😇 Glowing Halo', price: 120 },
            { id: 'hat_tophat', name: this.isOwner ? '🎩 Härrasmehe Silinder' : '🎩 Top Hat', price: 60 }
        ];

        const TRAILS = [
            { id: 'trail_rainbow', name: this.isOwner ? '🌈 Vikerkaare Rada' : '🌈 Rainbow Trail', price: 100 },
            { id: 'trail_fire', name: this.isOwner ? '🔥 Leegirada' : '🔥 Flame Trail', price: 150 },
            { id: 'trail_sparks', name: this.isOwner ? '⚡ Sädemete Rada' : '⚡ Lightning Sparks', price: 200 }
        ];

        const BOOTS = [
            { id: 'boots_speed', name: this.isOwner ? '👟 Kiirustossud (+25% Speed)' : '👟 Speed Runners (+25%)', price: 100 },
            { id: 'boots_moon', name: this.isOwner ? '🦘 Kuusaapad (+40% Jump)' : '🦘 Moon Boots (+40%)', price: 150 }
        ];

        const SKINS = [
            { id: 'skin_cyan', name: 'Neon Cyan', price: 0 },
            { id: 'skin_ruby', name: 'Ruby Red', price: 60 },
            { id: 'skin_emerald', name: 'Emerald Green', price: 60 },
            { id: 'skin_gold', name: 'Golden Sun', price: 120 },
            { id: 'skin_purple', name: 'Cyber Purple', price: 80 }
        ];

        const renderCategory = (items: any[], container: HTMLElement | null, type: 'hat' | 'trail' | 'boots' | 'skin') => {
            if (!container) return;
            container.innerHTML = '';
            items.forEach(item => {
                const card = document.createElement('div');
                const isPurchased = this.purchasedItems.has(item.id) || item.price === 0;
                let isEquipped = false;
                if (type === 'hat') isEquipped = this.equippedHat === item.id;
                if (type === 'trail') isEquipped = this.equippedTrail === item.id;
                if (type === 'boots') isEquipped = this.equippedBoots === item.id;
                if (type === 'skin') isEquipped = this.equippedSkin === item.id;

                card.className = `shop-item-card ${isEquipped ? 'equipped' : ''}`;
                card.innerHTML = `
                    <div style="font-weight: 800; font-size: 0.95rem; color: #ffffff;">${item.name}</div>
                    <div style="color: #ffd32a; font-weight: 900; font-size: 0.85rem;">🪙 ${item.price} MÜNTI</div>
                    <button class="btn-buy ${isEquipped ? 'equipped-btn' : (isPurchased ? 'equip-btn' : '')}">
                        ${isEquipped ? (this.isOwner ? 'KASUTUSES' : 'EQUIPPED') : (isPurchased ? (this.isOwner ? 'KASUTA' : 'EQUIP') : (this.isOwner ? 'OSTA' : 'BUY'))}
                    </button>
                `;

                const btn = card.querySelector('button');
                btn?.addEventListener('click', () => {
                    if (isEquipped) {
                        // Unequip
                        if (type === 'hat') this.equippedHat = 'none';
                        if (type === 'trail') this.equippedTrail = 'none';
                        if (type === 'boots') this.equippedBoots = 'none';
                    } else if (isPurchased) {
                        // Equip
                        if (type === 'hat') this.equippedHat = item.id;
                        if (type === 'trail') this.equippedTrail = item.id;
                        if (type === 'boots') this.equippedBoots = item.id;
                        if (type === 'skin') {
                            this.equippedSkin = item.id;
                            const hex = this.getSkinHex();
                            (this.playerBodyMesh.material as THREE.MeshLambertMaterial).color.setHex(hex);
                            (this.playerLeftArm.material as THREE.MeshLambertMaterial).color.setHex(hex);
                            (this.playerRightArm.material as THREE.MeshLambertMaterial).color.setHex(hex);
                        }
                    } else {
                        // Buy
                        if (this.coins >= item.price) {
                            this.coins -= item.price;
                            this.purchasedItems.add(item.id);
                            if (type === 'hat') this.equippedHat = item.id;
                            if (type === 'trail') this.equippedTrail = item.id;
                            if (type === 'boots') this.equippedBoots = item.id;
                            if (type === 'skin') this.equippedSkin = item.id;
                            this.audio.playCoin();
                            this.showToast(this.isOwner ? `Ostetud: ${item.name}!` : `Purchased: ${item.name}!`);
                        } else {
                            this.showToast(this.isOwner ? 'Sul ei ole piisavalt Obby münte!' : 'Not enough Obby coins!');
                        }
                    }
                    this.updateEquippedHatMesh();
                    this.saveGameData();
                    this.updateHUD();
                    this.renderShop();
                });

                container.appendChild(card);
            });
        };

        renderCategory(HATS, hatsContainer, 'hat');
        renderCategory(TRAILS, trailsContainer, 'trail');
        renderCategory(BOOTS, bootsContainer, 'boots');
        renderCategory(SKINS, skinsContainer, 'skin');
    }

    private renderStagesSelector() {
        const grid = document.getElementById('stages-selector-grid');
        if (!grid) return;
        grid.innerHTML = '';
        STAGES.forEach((stg, idx) => {
            const btn = document.createElement('button');
            const unlocked = idx < this.maxUnlockedStage;
            const isCurrent = idx === this.currentStageIndex;
            btn.className = `stage-select-btn ${isCurrent ? 'active' : ''}`;
            btn.disabled = !unlocked;
            btn.innerHTML = `
                <div style="font-size: 1.2rem;">${unlocked ? '🚩' : '🔒'}</div>
                <div style="font-size: 0.85rem;">Stage ${stg.id}</div>
                <div style="font-size: 0.72rem; color: #a4b0be;">${this.isOwner ? stg.nameEt : stg.nameEn}</div>
            `;
            if (unlocked) {
                btn.addEventListener('click', () => {
                    this.currentStageIndex = idx;
                    this.currentCheckpointIndex = idx;
                    this.respawnPlayer();
                    document.getElementById('modal-stages')!.style.display = 'none';
                });
            }
            grid.appendChild(btn);
        });
    }

    // --- Gameplay Loops & Updates ---
    public respawnPlayer() {
        this.deaths++;
        this.velocity.set(0, 0, 0);
        const spawn = STAGES[this.currentCheckpointIndex].spawnPos;
        this.playerGroup.position.copy(spawn);
        this.playerTrailPoints = [];
        this.audio.playLava();
        this.updateHUD();
    }

    private updateHUD() {
        const stageVal = document.getElementById('hud-stage-val');
        if (stageVal) stageVal.textContent = (this.currentStageIndex + 1).toString();

        const stageName = document.getElementById('hud-stage-name');
        if (stageName) {
            const stg = STAGES[this.currentStageIndex];
            stageName.textContent = `(${this.isOwner ? stg.nameEt : stg.nameEn})`;
        }

        const deathsVal = document.getElementById('hud-deaths-val');
        if (deathsVal) deathsVal.textContent = this.deaths.toString();

        const coinsVal = document.getElementById('hud-coins-val');
        if (coinsVal) coinsVal.textContent = this.coins.toString();

        const progressPercent = document.getElementById('hud-progress-percent');
        const progressFill = document.getElementById('stage-progress-fill');
        const pct = Math.round(((this.currentStageIndex + 1) / STAGES.length) * 100);
        if (progressPercent) progressPercent.textContent = `${pct}%`;
        if (progressFill) progressFill.style.width = `${pct}%`;

        const bestVal = document.getElementById('hud-best-time-val');
        if (bestVal) {
            bestVal.textContent = this.bestTime > 0 ? this.formatTime(this.bestTime) : '--:--.--';
        }
    }

    private formatTime(ms: number): string {
        const totalSec = Math.floor(ms / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        const hundredths = Math.floor((ms % 1000) / 10);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
    }

    private animate() {
        requestAnimationFrame(this.animate);
        const dt = 0.016;

        // 1. Update Timer
        if (this.timerStarted && !this.isVictory) {
            this.elapsedTime = performance.now() - this.startTime;
            const timerVal = document.getElementById('hud-timer-val');
            if (timerVal) timerVal.textContent = this.formatTime(this.elapsedTime);
        }

        // 2. Dynamic Obstacle Animations
        this.updateDynamicObstacles(dt);

        // 3. Player Movement & Physics
        this.updatePlayerPhysics(dt);

        // 4. Update Camera View
        this.updateCamera();

        // 5. Update Trail & Particles
        this.updateEffects(dt);

        // Render scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    private updateDynamicObstacles(dt: number) {
        // Disappearing platforms
        this.disappearingPlatforms.forEach(p => {
            if (p.state === 'triggered') {
                p.timer -= dt;
                // Blink
                p.mesh.position.y = p.initialY + (Math.sin(p.timer * 40) * 0.08);
                if (p.timer <= 0) {
                    p.state = 'fallen';
                    p.mesh.visible = false;
                    p.mesh.position.y = -999;
                    p.timer = 2.8; // Respawn delay
                }
            } else if (p.state === 'fallen') {
                p.timer -= dt;
                if (p.timer <= 0) {
                    p.state = 'idle';
                    p.mesh.visible = true;
                    p.mesh.position.y = p.initialY;
                }
            }
        });

        // Moving platforms
        this.movingPlatforms.forEach(p => {
            p.phase += dt * p.speed;
            const t = (Math.sin(p.phase) + 1) / 2;
            const oldPos = p.mesh.position.clone();
            p.mesh.position.lerpVectors(p.startPos, p.endPos, t);
            p.delta.subVectors(p.mesh.position, oldPos);
        });

        // Rotating hazards
        this.rotatingHazards.forEach(h => {
            h.mesh.rotation.y += h.speed * dt;
        });

        // Rotating Coins
        this.coinsList.forEach(c => {
            if (!c.collected) {
                c.mesh.rotation.z += 2.5 * dt;
                c.mesh.position.y = c.pos.y + Math.sin(performance.now() * 0.004 + c.pos.z) * 0.15;
            }
        });

        // Rotating Checkpoint Rings
        this.checkpoints.forEach(cp => {
            cp.ringMesh.rotation.z += 1.2 * dt;
        });
    }

    private updatePlayerPhysics(dt: number) {
        // Horizontal Movement Input
        let inputX = 0;
        let inputZ = 0;

        if (this.keys['KeyW'] || this.keys['ArrowUp']) inputZ -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) inputZ += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) inputX -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) inputX += 1;

        if (this.joystickInput.x !== 0 || this.joystickInput.y !== 0) {
            inputX = this.joystickInput.x;
            inputZ = this.joystickInput.y;
        }

        const inputLen = Math.hypot(inputX, inputZ);
        if (inputLen > 1) { inputX /= inputLen; inputZ /= inputLen; }

        let currentSpeed = this.moveSpeed;
        if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) currentSpeed *= this.sprintMultiplier;
        if (this.equippedBoots === 'boots_speed') currentSpeed *= 1.25;

        // Camera aligned movement vector
        const camForward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotation.y);
        const camRight = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotation.y);

        const moveDir = new THREE.Vector3()
            .addScaledVector(camRight, inputX)
            .addScaledVector(camForward, -inputZ);

        if (moveDir.lengthSq() > 0.001) {
            moveDir.normalize();
            this.velocity.x = moveDir.x * currentSpeed;
            this.velocity.z = moveDir.z * currentSpeed;
            
            // Rotate player body towards moving direction
            const targetRotY = Math.atan2(moveDir.x, moveDir.z);
            this.playerGroup.rotation.y = targetRotY;

            // Running Limb Animation
            const walkCycle = performance.now() * 0.015;
            this.playerLeftLeg.rotation.x = Math.sin(walkCycle) * 0.6;
            this.playerRightLeg.rotation.x = -Math.sin(walkCycle) * 0.6;
            this.playerLeftArm.rotation.x = -Math.sin(walkCycle) * 0.6;
            this.playerRightArm.rotation.x = Math.sin(walkCycle) * 0.6;
        } else {
            this.velocity.x *= 0.6;
            this.velocity.z *= 0.6;
            this.playerLeftLeg.rotation.x = 0;
            this.playerRightLeg.rotation.x = 0;
            this.playerLeftArm.rotation.x = 0;
            this.playerRightArm.rotation.x = 0;
        }

        // Jump Handling
        let effectiveJumpForce = this.jumpForce;
        if (this.equippedBoots === 'boots_moon') effectiveJumpForce *= 1.38;

        if (this.keys['Space'] && this.isGrounded) {
            this.velocity.y = effectiveJumpForce;
            this.isGrounded = false;
            this.audio.playJump();
        }

        // Gravity
        this.velocity.y -= 34.0 * dt;

        // Apply Platform translation delta if standing on a moving platform
        if (this.currentMovingPlatform && this.isGrounded) {
            this.playerGroup.position.add(this.currentMovingPlatform.delta);
        }

        // Apply Player Velocity
        this.playerGroup.position.x += this.velocity.x * dt;
        this.playerGroup.position.y += this.velocity.y * dt;
        this.playerGroup.position.z += this.velocity.z * dt;

        // Bounding Box Collision
        const pPos = this.playerGroup.position;
        const playerMin = new THREE.Vector3(pPos.x - 0.4, pPos.y, pPos.z - 0.4);
        const playerMax = new THREE.Vector3(pPos.x + 0.4, pPos.y + 2.0, pPos.z + 0.4);
        const pBox = new THREE.Box3(playerMin, playerMax);

        this.isGrounded = false;
        this.currentMovingPlatform = null;

        // Check Platforms Collision
        for (let i = 0; i < this.platforms.length; i++) {
            const mesh = this.platformMeshes[i];
            if (!mesh.visible) continue;
            const b = new THREE.Box3().setFromObject(mesh);
            if (pBox.intersectsBox(b)) {
                // Landing on top of platform
                if (pPos.y - (this.velocity.y * dt) >= b.max.y - 0.3 && this.velocity.y <= 0) {
                    pPos.y = b.max.y;
                    this.velocity.y = 0;
                    this.isGrounded = true;

                    // Trigger Disappearing Platform if stepped on
                    const dis = this.disappearingPlatforms.find(dp => dp.mesh === mesh);
                    if (dis && dis.state === 'idle') {
                        dis.state = 'triggered';
                        dis.timer = 0.75;
                    }

                    // Attach to Moving Platform
                    const mov = this.movingPlatforms.find(mp => mp.mesh === mesh);
                    if (mov) this.currentMovingPlatform = mov;
                }
            }
        }

        // Check Bounce Pads
        this.bouncePads.forEach(bp => {
            if (pBox.intersectsBox(bp.box)) {
                this.velocity.y = 26.0;
                this.isGrounded = false;
                this.audio.playBounce();
                this.showToast(this.isOwner ? '🚀 SUPER HÜPE!' : '🚀 SUPER BOUNCE!');
            }
        });

        // Check Hazards / Lava
        this.hazards.forEach(hz => {
            if (pBox.intersectsBox(hz.box)) {
                this.respawnPlayer();
            }
        });

        // Check Rotating Hazard Collisions
        this.rotatingHazards.forEach(h => {
            const hBox = new THREE.Box3().setFromObject(h.mesh);
            if (pBox.intersectsBox(hBox)) {
                this.respawnPlayer();
            }
        });

        // Check Coins Collection
        this.coinsList.forEach(c => {
            if (!c.collected && pPos.distanceTo(c.mesh.position) < 1.8) {
                c.collected = true;
                c.mesh.visible = false;
                this.coins += c.value;
                this.audio.playCoin();
                this.showToast(`+${c.value} 🪙 MÜNTI!`);
                this.updateHUD();
                this.saveGameData();
            }
        });

        // Check Checkpoints Activation
        this.checkpoints.forEach((cp, idx) => {
            if (pPos.distanceTo(cp.pos) < 2.5) {
                if (!cp.activated) {
                    cp.activated = true;
                    (cp.ringMesh.material as THREE.MeshBasicMaterial).color.setHex(0x2ed573);
                    (cp.flagMesh.material as THREE.MeshLambertMaterial).color.setHex(0x2ed573);
                    this.currentCheckpointIndex = idx;
                    this.currentStageIndex = idx;
                    this.maxUnlockedStage = Math.max(this.maxUnlockedStage, idx + 1);

                    // Reward Yards for checkpoint
                    yardService.addYards(5, `Parkour Obby Stage ${idx + 1} Checkpoint`);
                    this.audio.playCheckpoint();
                    this.saveGameData();
                    this.updateHUD();

                    // Show Banner
                    const banner = document.getElementById('checkpoint-banner');
                    const bannerText = document.getElementById('checkpoint-banner-text');
                    if (banner && bannerText) {
                        bannerText.textContent = this.isOwner ? `KONTROLLPUNKT ${idx + 1}/10! (+5 YARDS)` : `CHECKPOINT ${idx + 1}/10! (+5 YARDS)`;
                        banner.classList.add('show');
                        setTimeout(() => banner.classList.remove('show'), 2200);
                    }
                }
            }
        });

        // Check Stage 10 Final Finish / Victory
        if (!this.isVictory && pPos.z <= -465 && pPos.y >= 9.0) {
            this.triggerVictory();
        }

        // Void Fall
        if (pPos.y < -18) {
            this.respawnPlayer();
        }
    }

    private triggerVictory() {
        this.isVictory = true;
        this.audio.playVictory();

        // Award +100 Yards
        yardService.addYards(100, 'Parkour Obby Grand Victory 10/10');

        // Check Personal Best Time
        if (this.bestTime === 0 || this.elapsedTime < this.bestTime) {
            this.bestTime = this.elapsedTime;
            this.saveGameData();
        }

        // Show Victory Modal
        const vicModal = document.getElementById('modal-victory');
        const vicTime = document.getElementById('victory-time-val');
        const vicDeaths = document.getElementById('victory-deaths-val');
        if (vicTime) vicTime.textContent = this.formatTime(this.elapsedTime);
        if (vicDeaths) vicDeaths.textContent = this.deaths.toString();
        if (vicModal) vicModal.style.display = 'flex';
    }

    private updateCamera() {
        const pPos = this.playerGroup.position;
        if (this.isFirstPerson) {
            this.camera.position.set(pPos.x, pPos.y + 1.8, pPos.z);
            const lookTarget = new THREE.Vector3(
                pPos.x + Math.sin(this.cameraRotation.y) * 10,
                pPos.y + 1.8 - Math.tan(this.cameraRotation.x) * 10,
                pPos.z - Math.cos(this.cameraRotation.y) * 10
            );
            this.camera.lookAt(lookTarget);
        } else {
            const rotY = this.cameraRotation.y;
            const rotX = this.cameraRotation.x;
            const dist = this.cameraOffset.z;

            const cx = pPos.x + Math.sin(rotY) * Math.cos(rotX) * dist;
            const cy = pPos.y + this.cameraOffset.y + Math.sin(rotX) * dist;
            const cz = pPos.z + Math.cos(rotY) * Math.cos(rotX) * dist;

            this.camera.position.set(cx, cy, cz);
            this.camera.lookAt(pPos.x, pPos.y + 1.2, pPos.z);
        }
    }

    private updateEffects(dt: number) {
        // Trail updating
        if (this.equippedTrail !== 'none') {
            this.playerTrailPoints.unshift(this.playerGroup.position.clone().add(new THREE.Vector3(0, 0.5, 0)));
            if (this.playerTrailPoints.length > 25) this.playerTrailPoints.pop();

            const posAttr = this.playerTrailMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
            for (let i = 0; i < this.playerTrailPoints.length; i++) {
                posAttr.setXYZ(i, this.playerTrailPoints[i].x, this.playerTrailPoints[i].y, this.playerTrailPoints[i].z);
            }
            posAttr.needsUpdate = true;
            this.playerTrailMesh.visible = true;

            // Trail color
            if (this.equippedTrail === 'trail_rainbow') {
                const hue = (performance.now() * 0.001) % 1;
                (this.playerTrailMesh.material as THREE.LineBasicMaterial).color.setHSL(hue, 1, 0.5);
            } else if (this.equippedTrail === 'trail_fire') {
                (this.playerTrailMesh.material as THREE.LineBasicMaterial).color.setHex(0xff4757);
            } else if (this.equippedTrail === 'trail_sparks') {
                (this.playerTrailMesh.material as THREE.LineBasicMaterial).color.setHex(0xffd32a);
            }
        } else {
            this.playerTrailMesh.visible = false;
        }
    }
}

// Instantiate on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ParkourObbyGame());
} else {
    new ParkourObbyGame();
}
