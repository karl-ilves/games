import * as THREE from 'three';
import { getCurrentUserProfile, isPlayardOwner, isTestMode } from '../../auth';
import { yardService } from '../../shared/yardService';
import { metroAudio } from './audio';

// --- Types & Interfaces ---
type GameState = 'intro_station' | 'intro_riding' | 'intro_first_stop' | 'intro_departing' | 'player_free' | 'inspecting' | 'keypad' | 'dragged_death' | 'golden_shop';
type DirectionBranch = 'right' | 'left' | 'undecided';

interface AnomalyEvent {
    id: string;
    carIndex: number;
    triggered: boolean;
    active: boolean;
    timer: number;
}

interface AIPassenger {
    group: THREE.Group;
    head: THREE.Object3D;
    body: THREE.Object3D;
    isSitting: boolean;
    seatPos: THREE.Vector3;
    animType: 'phone' | 'look_window' | 'reading' | 'uncanny_stare' | 'chat';
    baseRotY: number;
    targetRotY: number;
    isCreepy: boolean;
    phoneMesh?: THREE.Mesh;
    headphones?: boolean;
    thumbLeft?: THREE.Mesh;
    thumbRight?: THREE.Mesh;
}

interface CarriageData {
    index: number;
    branch: DirectionBranch;
    theme: 'normal' | 'flicker' | 'dark' | 'abandoned' | 'neon' | 'lounge' | 'archive' | 'anomaly' | 'golden_shop';
    group: THREE.Group;
    lights: THREE.PointLight[];
    lightMeshes: THREE.Mesh[];
    passengers: AIPassenger[];
    doorFront: THREE.Group;
    doorBack: THREE.Group;
    mapMesh?: THREE.Mesh | THREE.Group;
    puzzleSolved: boolean;
    puzzleCode?: string;
    hasKeypad?: boolean;
    inspectableItem?: THREE.Group;
    inspectableText?: { titleEt: string; descEt: string; titleEn: string; descEn: string };
}

export interface ShopItem {
    id: string;
    icon: string;
    nameEt: string;
    nameEn: string;
    descEt: string;
    descEn: string;
    price: number;
}

export const GOLDEN_SHOP_ITEMS: ShopItem[] = [
    {
        id: 'night_vision',
        icon: '👓',
        nameEt: 'ÖÖPRILLID',
        nameEn: 'NIGHT VISION GOGGLES',
        descEt: 'Aitavad pimedates vagunites paremini näha ja toovad nähtavale salajased detailid.',
        descEn: 'Helps see clearly in dark carriages and reveals hidden clues.',
        price: 120
    },
    {
        id: 'speed_boost',
        icon: '👟',
        nameEt: 'KIIRUSEBOONUS',
        nameEn: 'SPEED BOOST',
        descEt: 'Muudab mängija liikumise +50% kiiremaks, et ohtlikes olukordades kiiresti edasi liikuda.',
        descEn: 'Increases player movement speed by +50%.',
        price: 150
    },
    {
        id: 'clue_detector',
        icon: '🔍',
        nameEt: 'VIHJEANDUR',
        nameEn: 'CLUE DETECTOR',
        descEt: 'Hakkab piiksuma ja märku andma, kui oled läheduses peidetud vihjetele või saladustele.',
        descEn: 'Beeps and pulses when near hidden clues or lore objects.',
        price: 225
    },
    {
        id: 'secret_pass',
        icon: '🎟️',
        nameEt: 'SALAPILET',
        nameEn: 'SECRET PASS',
        descEt: 'Salapärane pilet, mis võib avada erilisi uksi ja salajasi kohti.',
        descEn: 'A mysterious subway pass for special locked chambers.',
        price: 300
    },
    {
        id: 'radio',
        icon: '📻',
        nameEt: 'RAADIO',
        nameEn: 'SUBWAY RADIO',
        descEt: 'Mängib rahulikku muusikat ning võib püüda kinni kummalisi teateid ja sosinaid.',
        descEn: 'Plays vintage tunes and picks up rare whispers and broadcasts.',
        price: 175
    }
];

// Module-level reusable scratch vectors for 60+ FPS zero-allocation performance
const _scratchV1 = new THREE.Vector3();
const _scratchV2 = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

export class LastMetroGame {
    private container: HTMLElement;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private clock: THREE.Clock;

    // Player State
    private isOwner: boolean = false;
    private lang: 'et' | 'en' = 'et';
    public state: GameState = 'intro_station';
    public currentCarIndex: number = 0; // 0 = start car, 1-100 = story & checkpoints, 101+ = infinite
    private branchDirection: DirectionBranch = 'undecided';
    private totalCarriagesExplored: number = 0;
    private cluesFound: number = 0;

    // Coins Economy & Inventory (Roblox Style)
    public coins: number = 0;
    public collectibleCoins: { mesh: THREE.Mesh; value: number; collected: boolean }[] = [];
    public inventory: { [itemKey: string]: boolean } = {};
    public equippedItem: string | null = null;
    public heldItemMesh: THREE.Group | null = null;

    // Active Equipment Effects
    public nightVisionActive: boolean = false;
    public speedBoostActive: boolean = false;
    public clueDetectorActive: boolean = false;
    public radioActive: boolean = false;
    public radarPingTimer: number = 0;

    // Puzzle & Progression Flags
    public hasUnlockedCarriage28WithClue: boolean = false;
    public hasUnlockedCarriage64WithKey: boolean = false;
    public hasUnlockedCarriage78WithHint: boolean = false;

    // Dynamic Special Props & Timers
    public reverseTunnelTimer: number = 0;
    public soundCutoutTimer: number = 0;
    public parallelTrainMesh: THREE.Group | null = null;
    public parallelTrainActive: boolean = false;
    public goldenShopKeeperMesh: THREE.Group | null = null;

    // FPS Controls
    private playerPos: THREE.Vector3 = new THREE.Vector3(0, 1.6, 0);
    private playerVel: THREE.Vector3 = new THREE.Vector3();
    private cameraEuler: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
    private moveKeys: { [key: string]: boolean } = {};
    private isPointerLocked: boolean = false;
    public aimedInteractable: 'inspectable' | 'keypad' | 'shop' | 'seat' | 'stand' | null = null;
    private stepTimer: number = 0;
    private headBobTimer: number = 0;
    private flashlightOn: boolean = false;
    private flashlight: THREE.SpotLight | null = null;

    // Carriages & World
    private currentCarriage: CarriageData | null = null;
    private tunnelGroup: THREE.Group = new THREE.Group();
    private stationPlatformGroup: THREE.Group = new THREE.Group();
    private tunnelOffsetZ: number = 0;
    private trainSpeed: number = 0;
    private targetTrainSpeed: number = 60;

    // Cutscene & Timers
    private cutsceneTimer: number = 0;
    private ambientWhisperCooldown: number = 10;
    private currentThoughtTimeout: any = null;

    // Special Anomaly References
    private stalkerMesh: THREE.Group | null = null;
    private stalkerActive: boolean = false;
    private stalkerDistZ: number = 16;
    private stalkerLookAwayTimer: number = 0;

    private windowSurrealSky: THREE.Mesh | null = null;
    private jumpScareMesh: THREE.Group | null = null;
    private jumpScareActive: boolean = false;

    // Mobile & Desktop Look Controls
    private isMouseDown: boolean = false;
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;
    private touchStartX: number = 0;
    private touchStartY: number = 0;
    private lastLockedDoorSoundTime: number = 0;

    // Intro Cutscene Timers & Animation State
    private introSideDoorsOpen: boolean = false;
    private sideDoorMeshes: { mesh: THREE.Mesh; baseZ: number; dir: number }[] = [];
    private introTimeouts: any[] = [];
    private introCameraTarget: THREE.Vector3 = new THREE.Vector3(3.8, 1.6, -3.5);
    private introLookTarget: THREE.Vector3 = new THREE.Vector3(0, 1.2, -25);

    // Shadow Hands Void Anomaly State (Carriage 9 & Beyond)
    public shadowHandsActive: boolean = false;
    public shadowHandsGroups: THREE.Group[] = [];
    public shadowHandsTimer: number = 0;
    private shadowHandsAnimTimer: number = 0;
    private deathDragSide: number = 1;
    private deathTimer: number = 0;

    // Seating State (Sit on any seat bench)
    public isSitting: boolean = false;

    // Carriage 20 Shadow Creature (Must Olend) Rush Event State
    public shadowRushActive: boolean = false;
    public shadowEntityMesh: THREE.Group | null = null;
    public shadowRushSpeed: number = 0;
    public shadowRushCountdown: number = 0;
    public carriage20EventTriggered: boolean = false;

    constructor() {
        const cont = document.getElementById('canvas-container');
        if (!cont) throw new Error("Canvas container not found!");
        this.container = cont;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x06080c);
        this.scene.fog = new THREE.FogExp2(0x06080c, 0.04);

        this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 120);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
        this.renderer.shadowMap.enabled = false;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        this.container.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();

        this.init();
    }

    private async init() {
        console.log("🚇 Initializing LAST METRO 3D Mystery...");

        // 1. VIP / Playard Owner Verification
        const userProf = getCurrentUserProfile();
        this.isOwner = isPlayardOwner(userProf?.email);

        const vipOverlay = document.getElementById('vip-restricted-overlay');
        if (!this.isOwner && vipOverlay) {
            vipOverlay.style.display = 'flex';
            return;
        }

        // Language determination: Estonian for Owner by default, English otherwise
        this.lang = this.isOwner ? 'et' : 'en';
        this.updateLanguageUI();

        // Record to Recently Played
        yardService.recordPlayedGame({
            id: 'metro',
            title: this.lang === 'et' ? '🚇 Last Metro' : '🚇 Last Metro',
            description: this.lang === 'et' ? '3D atmosfääriline seiklus- ja müsteeriumimäng lõputus metroorongis.' : '3D atmospheric mystery adventure on an endless subway train.',
            url: './games/metro/index.html',
            icon: '🚇',
            badgeText: '👑 OWNER EXCLUSIVE'
        });

        // 2. Setup Lighting & Flashlight
        this.setupLighting();

        // 3. Build Metro Station & Passing Tunnel
        this.buildStationPlatform();
        this.buildTunnel();

        // 4. Build Initial Carriage (Carriage 0)
        this.loadCarriage(0, 'undecided');

        // 5. Input Listeners
        this.setupInputs();
        this.setupUI();
        this.updateCursorState();

        // 6. Start Loop
        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.renderer.setAnimationLoop(this.animate.bind(this));

        // User requirement: "kui sa hubis vajutad selle mängu pealle siis sinna mängu ilmud vajuta üks kõik kuhu et mängu alustada ja kui ta vajutab siis tuleb intro"
        this.state = 'start_screen';
    }

    public startGameFromOverlay() {
        const startOverlay = document.getElementById('start-game-overlay');
        if (startOverlay) {
            startOverlay.style.opacity = '0';
            setTimeout(() => {
                startOverlay.style.display = 'none';
            }, 500);
        }
        metroAudio.enableAudio();
        this.startIntroSequence();
        this.updateCursorState();
    }

    private setupLighting() {
        const ambient = new THREE.AmbientLight(0x222633, 0.7);
        this.scene.add(ambient);

        // Flashlight attached to camera
        this.flashlight = new THREE.SpotLight(0xffffff, 0, 22, Math.PI / 5, 0.4, 1.2);
        this.flashlight.position.set(0, 0, 0);
        this.flashlight.castShadow = true;
        this.camera.add(this.flashlight);
        this.camera.add(this.flashlight.target);
        this.flashlight.target.position.set(0, 0, -5);
        this.scene.add(this.camera);
    }

    private setupUI() {
        // Start screen click anywhere to begin listener
        const startOverlay = document.getElementById('start-game-overlay');
        if (startOverlay) {
            startOverlay.addEventListener('click', () => this.startGameFromOverlay());
        }

        // Flashlight toggle button
        const flashBtn = document.getElementById('btn-toggle-flashlight');
        if (flashBtn) {
            flashBtn.addEventListener('click', () => this.toggleFlashlight());
        }

        // Skip intro button
        const skipBtn = document.getElementById('btn-skip-intro');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => this.skipIntro());
        }

        // Replay intro button
        const replayBtn = document.getElementById('btn-replay-intro');
        if (replayBtn) {
            replayBtn.addEventListener('click', () => this.replayIntro());
        }

        // Stand up button for mobile & sitting
        const standBtn = document.getElementById('btn-stand-up');
        if (standBtn) {
            standBtn.addEventListener('click', () => this.standUp());
        }

        // Sit / Stand HUD button
        const sitToggleBtn = document.getElementById('btn-toggle-sit');
        if (sitToggleBtn) {
            sitToggleBtn.addEventListener('click', () => this.toggleSit());
        }

        // Audio mute toggle
        const audioBtn = document.getElementById('btn-toggle-audio');
        if (audioBtn) {
            audioBtn.addEventListener('click', () => {
                const muted = metroAudio.toggleMute();
                audioBtn.innerText = muted ? '🔇' : '🔊';
            });
        }

        // Language button
        const langBtn = document.getElementById('btn-toggle-lang');
        if (langBtn) {
            langBtn.addEventListener('click', () => {
                this.lang = this.lang === 'et' ? 'en' : 'et';
                this.updateLanguageUI();
            });
        }

        // Keypad submit
        const keypadSubmit = document.getElementById('btn-keypad-submit');
        if (keypadSubmit) {
            keypadSubmit.addEventListener('click', () => this.submitKeypad());
        }

        const keypadClose = document.getElementById('btn-keypad-close');
        if (keypadClose) {
            keypadClose.addEventListener('click', () => {
                const modal = document.getElementById('keypad-modal');
                if (modal) modal.style.display = 'none';
                this.state = 'player_free';
                this.updateCursorState();
            });
        }

        // Lore modal close
        const loreClose = document.getElementById('btn-lore-close');
        if (loreClose) {
            loreClose.addEventListener('click', () => {
                const modal = document.getElementById('lore-modal');
                if (modal) modal.style.display = 'none';
                this.state = 'player_free';
                this.updateCursorState();
            });
        }

        // Death retry button
        const deathRetry = document.getElementById('btn-death-retry');
        if (deathRetry) {
            deathRetry.addEventListener('click', () => this.respawnFromDeath());
        }

        // Golden Shop modal close button
        const shopClose = document.getElementById('btn-shop-close');
        if (shopClose) {
            shopClose.addEventListener('click', () => {
                const modal = document.getElementById('golden-shop-modal');
                if (modal) modal.style.display = 'none';
                this.state = 'player_free';
                this.updateCursorState();
            });
        }

        // Playard Owner Panel UI Wireup
        const ownerPanelBtn = document.getElementById('btn-owner-panel');
        if (ownerPanelBtn) {
            if (this.isOwner) {
                ownerPanelBtn.style.display = 'flex';
                ownerPanelBtn.addEventListener('click', () => this.openOwnerTeleportModal());
            } else {
                ownerPanelBtn.style.display = 'none';
            }
        }

        const ownerTpSubmit = document.getElementById('btn-owner-teleport-submit');
        if (ownerTpSubmit) {
            ownerTpSubmit.addEventListener('click', () => {
                const input = document.getElementById('owner-teleport-input') as HTMLInputElement;
                const carNum = parseInt(input?.value, 10);
                this.teleportToCarriage(carNum);
            });
        }

        const ownerTpInput = document.getElementById('owner-teleport-input') as HTMLInputElement;
        if (ownerTpInput) {
            ownerTpInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const carNum = parseInt(ownerTpInput.value, 10);
                    this.teleportToCarriage(carNum);
                }
            });
        }

        const ownerTpClose = document.getElementById('btn-owner-teleport-close');
        if (ownerTpClose) {
            ownerTpClose.addEventListener('click', () => this.closeOwnerTeleportModal());
        }

        document.querySelectorAll('.btn-quick-tp').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = (e.currentTarget as HTMLElement).getAttribute('data-car');
                if (target !== null) {
                    this.teleportToCarriage(parseInt(target, 10));
                }
            });
        });

        // Restore saved coins and inventory from checkpoint
        try {
            const savedCoins = localStorage.getItem('last_metro_coins');
            if (savedCoins) this.coins = parseInt(savedCoins, 10) || 0;
            const savedInv = localStorage.getItem('last_metro_inventory');
            if (savedInv) this.inventory = { ...this.inventory, ...JSON.parse(savedInv) };
            this.updateCoinsUI();
            this.updateHotbarUI();
        } catch (e) {}
    }

    private updateLanguageUI() {
        const isEt = this.lang === 'et';
        const titleEl = document.getElementById('hud-game-title');
        if (titleEl) titleEl.innerText = isEt ? '🚇 VIIMANE METROO' : '🚇 LAST METRO';

        const startTitle = document.getElementById('start-game-title');
        const startSub = document.getElementById('start-game-sub');
        const startPrompt = document.getElementById('start-game-prompt-text');
        if (startTitle) startTitle.innerText = isEt ? 'VIIMANE METROO' : 'LAST METRO';
        if (startSub) startSub.innerText = isEt ? 'LAST METRO · 3D MÜSTEERIUM' : 'LAST METRO · 3D MYSTERY ADVENTURE';
        if (startPrompt) startPrompt.innerText = isEt ? '👆 Vajuta ükskõik kuhu, et mängu alustada' : '👆 Click anywhere to start the game';

        const carLabel = document.getElementById('hud-car-label');
        if (carLabel) {
            if (this.currentCarIndex === 0) {
                carLabel.innerText = isEt ? 'ESIALGNE VAGUN' : 'INITIAL CAR';
            } else {
                carLabel.innerText = isEt ? `VAGUN ${this.currentCarIndex}` : `CARRIAGE ${this.currentCarIndex}`;
            }
        }

        const branchLabel = document.getElementById('hud-branch-label');
        if (branchLabel) {
            if (this.branchDirection === 'right') branchLabel.innerText = isEt ? '➡️ PAREM RADA' : '➡️ RIGHT TRACK';
            else if (this.branchDirection === 'left') branchLabel.innerText = isEt ? '⬅️ VASAK RADA' : '⬅️ LEFT TRACK';
            else branchLabel.innerText = isEt ? '❓ SUUND VALIMATA' : '❓ NO DIRECTION';
        }
    }

    public showThought(textEt: string, textEn: string, durationMs: number = 4000) {
        const text = this.lang === 'et' ? textEt : textEn;
        const thoughtBox = document.getElementById('thought-bubble');
        const thoughtText = document.getElementById('thought-text');
        if (thoughtBox && thoughtText) {
            thoughtText.innerText = `„${text}”`;
            thoughtBox.style.display = 'flex';
            thoughtBox.classList.add('fade-in');

            if (this.currentThoughtTimeout) clearTimeout(this.currentThoughtTimeout);
            this.currentThoughtTimeout = setTimeout(() => {
                thoughtBox.style.display = 'none';
            }, durationMs);
        }
    }
    private buildStationPlatform() {
        this.stationPlatformGroup = new THREE.Group();

        // Platform floor
        const platMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.7 });
        const platGeo = new THREE.BoxGeometry(10, 0.8, 55);
        const platform = new THREE.Mesh(platGeo, platMat);
        platform.position.set(4.5, -0.4, 0);
        platform.receiveShadow = true;
        this.stationPlatformGroup.add(platform);

        // Yellow safety edge line
        const edgeMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.3, emissive: 0xf1c40f, emissiveIntensity: 0.2 });
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 55), edgeMat);
        edge.position.set(0.65, 0.01, 0);
        this.stationPlatformGroup.add(edge);

        // Station wall & advertising posters
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.8 });
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 55), wallMat);
        wall.position.set(9.5, 2.6, 0);
        this.stationPlatformGroup.add(wall);

        // Steel Rails & Ties on Track Bed
        const railMat = new THREE.MeshStandardMaterial({ color: 0xa4b0be, metalness: 0.95, roughness: 0.15 });
        const tieMat = new THREE.MeshStandardMaterial({ color: 0x2f3542, roughness: 0.9 });
        [-0.7, 0.7].forEach(rx => {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 60), railMat);
            rail.position.set(rx, -0.45, 0);
            this.stationPlatformGroup.add(rail);
        });
        for (let tz = -30; tz <= 30; tz += 1.2) {
            const tie = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.25), tieMat);
            tie.position.set(0, -0.52, tz);
            this.stationPlatformGroup.add(tie);
        }

        // Platform Pillars
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x718096, roughness: 0.4 });
        for (let z = -20; z <= 20; z += 10) {
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.6), pillarMat);
            pillar.position.set(3.5, 2.1, z);
            this.stationPlatformGroup.add(pillar);
        }

        // Bright Platform Ceiling & Overhead Lights (Optimized for 60+ FPS)
        const platformAmbient = new THREE.PointLight(0xfff8ee, 2.4, 40);
        platformAmbient.position.set(4.5, 4.0, 0);
        this.stationPlatformGroup.add(platformAmbient);

        for (let z = -22; z <= 22; z += 7.5) {
            // Bright fluorescent lamp strip fixture (glowing MeshBasicMaterial)
            const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const lampFixture = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 2.2), lampMat);
            lampFixture.position.set(3.5, 4.5, z);
            this.stationPlatformGroup.add(lampFixture);
        }

        // Two key point lights covering the platform ends smoothly
        [-12, 12].forEach(pz => {
            const pLight = new THREE.PointLight(0xfffaed, 1.8, 24);
            pLight.position.set(3.5, 4.2, pz);
            this.stationPlatformGroup.add(pLight);
        });

        // Digital Destination Board
        const boardCanvas = document.createElement('canvas');
        boardCanvas.width = 512;
        boardCanvas.height = 128;
        const bCtx = boardCanvas.getContext('2d');
        if (bCtx) {
            bCtx.fillStyle = '#0a0d14';
            bCtx.fillRect(0, 0, 512, 128);
            bCtx.strokeStyle = '#ffd32a';
            bCtx.lineWidth = 4;
            bCtx.strokeRect(4, 4, 504, 120);
            bCtx.fillStyle = '#ffd32a';
            bCtx.font = 'bold 26px monospace';
            bCtx.textAlign = 'center';
            bCtx.fillText('🚇 VIIMANE METROO', 256, 45);
            bCtx.fillStyle = '#00f2fe';
            bCtx.font = 'bold 22px monospace';
            bCtx.fillText('23:45 · SAABUB KOHE', 256, 90);
        }
        const boardTex = new THREE.CanvasTexture(boardCanvas);
        const boardMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.6, 2.2),
            new THREE.MeshBasicMaterial({ map: boardTex })
        );
        boardMesh.position.set(3.5, 3.2, 0);
        this.stationPlatformGroup.add(boardMesh);

        this.scene.add(this.stationPlatformGroup);
    }

    private buildTunnel() {
        this.tunnelGroup = new THREE.Group();

        // Long tunnel tube segments
        const tunnelMat = new THREE.MeshStandardMaterial({ color: 0x111620, roughness: 0.95, side: THREE.BackSide });
        const tunnelGeo = new THREE.CylinderGeometry(5.5, 5.5, 120, 24, 1, true);
        const tunnelMesh = new THREE.Mesh(tunnelGeo, tunnelMat);
        tunnelMesh.rotation.x = Math.PI / 2;
        tunnelMesh.position.set(0, 1.5, 0);
        this.tunnelGroup.add(tunnelMesh);

        // Vivid Passing Subway Tunnel Lights (Ultra-Fast GPU-efficient Glowing Meshes)
        for (let z = -56; z <= 56; z += 6) {
            // Wall fluorescent strip lamps (both left and right sides)
            [-4.8, 4.8].forEach((lx, sIdx) => {
                const isWarm = (Math.abs(z) + sIdx) % 3 === 0;
                const lampMat = new THREE.MeshBasicMaterial({
                    color: isWarm ? 0xffbe76 : 0x70a1ff
                });
                const lampMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 1.8), lampMat);
                lampMesh.position.set(lx, 1.8, z);
                this.tunnelGroup.add(lampMesh);
            });

            // Ceiling overhead light strips
            const ceilLamp = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.1, 1.2),
                new THREE.MeshBasicMaterial({ color: 0xffffff })
            );
            ceilLamp.position.set(0, 4.2, z);
            this.tunnelGroup.add(ceilLamp);

            // Signal track lights (Red / Green / Amber dots)
            if (z % 18 === 0) {
                const sigColor = z % 36 === 0 ? 0x2ed573 : 0xff4757;
                const sigMat = new THREE.MeshBasicMaterial({ color: sigColor });
                const signalMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), sigMat);
                signalMesh.position.set(-3.2, 0.4, z);
                this.tunnelGroup.add(signalMesh);
            }
        }

        // Single ambient tunnel light for smooth mood lighting
        const tunnelAmbient = new THREE.PointLight(0x40739e, 0.6, 60);
        tunnelAmbient.position.set(0, 2.5, 0);
        this.tunnelGroup.add(tunnelAmbient);

        // Surreal exterior backdrop mesh (for Vagun 5 window anomaly)
        const skyGeo = new THREE.SphereGeometry(60, 32, 32);
        const skyMat = new THREE.MeshBasicMaterial({
            color: 0x8e44ad,
            side: THREE.BackSide,
            wireframe: true,
            transparent: true,
            opacity: 0
        });
        this.windowSurrealSky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(this.windowSurrealSky);

        this.scene.add(this.tunnelGroup);
    }

    // --- High Fidelity Carriage Construction ---

    private createCarriageGeometry(index: number, branch: DirectionBranch, theme: CarriageData['theme']): CarriageData {
        const carGroup = new THREE.Group();
        const lights: THREE.PointLight[] = [];
        const lightMeshes: THREE.Mesh[] = [];
        const passengers: AIPassenger[] = [];

        const carLength = 20;
        const carWidth = 3.4;
        const carHeight = 3.0;

        // 1. Floor: Rubberized subway floor + Safety yellow tactile boundary stripe along aisle
        const floorMat = new THREE.MeshStandardMaterial({
            color: theme === 'abandoned' ? 0x222629 : 0x3d4852,
            roughness: 0.75,
            metalness: 0.15
        });
        const floor = new THREE.Mesh(new THREE.BoxGeometry(carWidth, 0.2, carLength), floorMat);
        floor.position.set(0, 0, 0);
        floor.receiveShadow = true;
        carGroup.add(floor);

        // Tactile safety yellow boundary stripes along the aisle
        const yellowStripeMat = new THREE.MeshStandardMaterial({
            color: 0xf1c40f,
            roughness: 0.55,
            metalness: 0.1
        });
        [-0.85, 0.85].forEach(sx => {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.202, carLength), yellowStripeMat);
            stripe.position.set(sx, 0.001, 0);
            carGroup.add(stripe);
        });

        // Stainless steel threshold floor plates at door entries (z = 0)
        const thresholdMat = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.25,
            metalness: 0.9
        });
        [-carWidth / 2 + 0.15, carWidth / 2 - 0.15].forEach(tx => {
            const threshold = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.203, 2.3), thresholdMat);
            threshold.position.set(tx, 0.002, 0);
            carGroup.add(threshold);
        });

        // 2. Ceiling: Ribbed architectural subway ceiling with recessed lighting channels
        const ceilingMat = new THREE.MeshStandardMaterial({
            color: theme === 'lounge' ? 0x242830 : 0xe8ecf1,
            roughness: 0.45,
            metalness: 0.15
        });
        const ceiling = new THREE.Mesh(new THREE.BoxGeometry(carWidth, 0.15, carLength), ceilingMat);
        ceiling.position.set(0, carHeight, 0);
        carGroup.add(ceiling);

        // Air conditioning vents and emergency speakers in ceiling
        const ventMat = new THREE.MeshStandardMaterial({ color: 0x333a42, roughness: 0.8 });
        for (let vz = -8; vz <= 8; vz += 3.2) {
            const vent = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.35), ventMat);
            vent.position.set(0, carHeight - 0.08, vz);
            carGroup.add(vent);
        }

        // 3. Side Walls with Window Cutouts & Platform Sliding Doors
        const wallColor = theme === 'abandoned' ? 0x3d3d3d : theme === 'neon' ? 0x1e272e : 0xf1f2f6;
        const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.7 });

        this.sideDoorMeshes = [];

        // Build left and right walls with central door entryways at z = 0
        [-carWidth / 2, carWidth / 2].forEach(x => {
            const wallFront = new THREE.Mesh(new THREE.BoxGeometry(0.15, carHeight, 8.8), wallMat);
            wallFront.position.set(x, carHeight / 2, 5.6);
            carGroup.add(wallFront);

            const wallBack = new THREE.Mesh(new THREE.BoxGeometry(0.15, carHeight, 8.8), wallMat);
            wallBack.position.set(x, carHeight / 2, -5.6);
            carGroup.add(wallBack);

            const wallTop = new THREE.Mesh(new THREE.BoxGeometry(0.15, carHeight - 2.2, 2.4), wallMat);
            wallTop.position.set(x, 2.2 + (carHeight - 2.2) / 2, 0);
            carGroup.add(wallTop);

            // Pneumatic Sliding Doors in each doorway
            const doorLeafMat = new THREE.MeshStandardMaterial({
                color: theme === 'abandoned' ? 0x7f1d1d : 0x10ac84,
                metalness: 0.6,
                roughness: 0.35
            });
            const doorGlassMat = new THREE.MeshBasicMaterial({ color: 0x010204 });

            const leftLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.15, 1.15), doorLeafMat);
            const leftWin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.45), doorGlassMat);
            leftWin.position.set(0, 0.25, 0);
            leftLeaf.add(leftWin);
            leftLeaf.position.set(x, 1.1, -0.55);
            carGroup.add(leftLeaf);
            this.sideDoorMeshes.push({ mesh: leftLeaf, baseZ: -0.55, dir: -1 });

            const rightLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.15, 1.15), doorLeafMat);
            const rightWin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.45), doorGlassMat);
            rightWin.position.set(0, 0.25, 0);
            rightLeaf.add(rightWin);
            rightLeaf.position.set(x, 1.1, 0.55);
            carGroup.add(rightLeaf);
            this.sideDoorMeshes.push({ mesh: rightLeaf, baseZ: 0.55, dir: 1 });
        });

        // Windows (Subway Tinted Glass - passing tunnel lights clearly visible outside!)
        const windowGlassMat = new THREE.MeshPhysicalMaterial({
            color: 0x1a2634,
            transparent: true,
            opacity: 0.35,
            roughness: 0.1,
            metalness: 0.25
        });
        [-carWidth / 2, carWidth / 2].forEach(x => {
            for (let z = -7; z <= 7; z += 4.5) {
                if (Math.abs(z) < 2) continue; // skip door entry
                const windowPane = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 2.5), windowGlassMat);
                windowPane.position.set(x, 1.6, z);
                carGroup.add(windowPane);
            }
        });

        // 4. Stainless Steel Grab Rails & Overhead Hanging Grab Loops (Straps)
        const poleMat = new THREE.MeshStandardMaterial({ color: 0xededed, metalness: 0.95, roughness: 0.15 });
        const strapMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, roughness: 0.6 });
        [-0.9, 0.9].forEach(x => {
            for (let z = -8; z <= 8; z += 4) {
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, carHeight, 12), poleMat);
                pole.position.set(x, carHeight / 2, z);
                carGroup.add(pole);
            }

            // Overhead long rail
            const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, carLength - 2, 12), poleMat);
            rail.rotation.x = Math.PI / 2;
            rail.position.set(x, 2.3, 0);
            carGroup.add(rail);

            // Overhead hanging grab straps with handles
            for (let sz = -7.5; sz <= 7.5; sz += 1.5) {
                if (Math.abs(sz) < 1.4) continue; // clear above doorway
                const strapBand = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.02), ventMat);
                strapBand.position.set(x, 2.18, sz);
                carGroup.add(strapBand);

                const strapRing = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 8, 16), strapMat);
                strapRing.rotation.y = Math.PI / 2;
                strapRing.position.set(x, 2.04, sz);
                carGroup.add(strapRing);
            }
        });

        // 5. Glass Windscreen Partitions at ends of seat rows
        const partitionGlassMat = new THREE.MeshStandardMaterial({
            color: 0xddf0ff,
            transparent: true,
            opacity: 0.35,
            roughness: 0.05,
            metalness: 0.1
        });
        [-1.25, 1.25].forEach(px => {
            [-1.8, 1.8].forEach(pz => {
                // Sleek transparent safety glass
                const partitionGlass = new THREE.Mesh(new THREE.BoxGeometry(0.012, 1.1, 0.62), partitionGlassMat);
                partitionGlass.position.set(px, 0.85, pz);
                carGroup.add(partitionGlass);

                // Sleek vertical chrome edge pole on aisle side
                const edgeX = px > 0 ? px - 0.31 : px + 0.31;
                const edgePole = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.2, 12), poleMat);
                edgePole.position.set(edgeX, 0.85, pz);
                carGroup.add(edgePole);

                // Top and bottom mounting rails
                const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.64), poleMat);
                topRail.position.set(px, 1.4, pz);
                carGroup.add(topRail);

                const bottomRail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.64), poleMat);
                bottomRail.position.set(px, 0.32, pz);
                carGroup.add(bottomRail);
            });
        });

        // 6. Dual Long Ergonomic Passenger Subway Benches with Sculpted Cushions & Dividers
        const seatBaseColor = theme === 'lounge' ? 0x6c5ce7 : theme === 'abandoned' ? 0x2d3436 : 0x0984e3;
        const seatBaseMat = new THREE.MeshStandardMaterial({ color: seatBaseColor, roughness: 0.65 });
        const cushionColor = theme === 'lounge' ? 0x574b90 : theme === 'abandoned' ? 0x1e272e : 0x1e3799;
        const cushionMat = new THREE.MeshStandardMaterial({ color: cushionColor, roughness: 0.75 });
        const dividerMat = new THREE.MeshStandardMaterial({ color: 0x718093, metalness: 0.8, roughness: 0.2 });

        [-1.28, 1.28].forEach(x => {
            // Rear Bench (z = -4.9, length 6.0m) and Front Bench (z = 4.9, length 6.0m)
            [-4.9, 4.9].forEach(centerZ => {
                // Bench Base Structure
                const seatBench = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.44, 6.0), seatBaseMat);
                seatBench.position.set(x, 0.22, centerZ);
                carGroup.add(seatBench);

                // Continuous Plush Cushion Surface (top surface at y = 0.48)
                const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.08, 5.96), cushionMat);
                seatCushion.position.set(x, 0.46, centerZ);
                carGroup.add(seatCushion);

                // Backrest against the subway wall
                const backX = x > 0 ? 1.58 : -1.58;
                const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.72, 5.96), cushionMat);
                seatBack.position.set(backX, 0.8, centerZ);
                carGroup.add(seatBack);

                // Individual Seat Divider Bars / Armrests along the bench
                for (let dz = -2.4; dz <= 2.4; dz += 1.2) {
                    const divider = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.58, 8), dividerMat);
                    divider.rotation.z = x > 0 ? -Math.PI / 8 : Math.PI / 8;
                    divider.position.set(x, 0.62, centerZ + dz);
                    carGroup.add(divider);
                }
            });
        });

        // 7. Cove Transit Posters & Warning Signs Above Windows
        const adPalette = [0x0984e3, 0x00b894, 0xe17055, 0x6c5ce7, 0xfdcb6e];
        [-carWidth / 2 + 0.08, carWidth / 2 - 0.08].forEach((ax, sideIdx) => {
            for (let az = -6.5; az <= 6.5; az += 2.8) {
                if (Math.abs(az) < 1.6) continue;
                const adColor = adPalette[Math.abs(Math.floor(az * 3 + sideIdx)) % adPalette.length];
                const adMat = new THREE.MeshStandardMaterial({ color: adColor, roughness: 0.4 });
                const adMesh = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.85), adMat);
                adMesh.position.set(ax, 2.45, az);
                carGroup.add(adMesh);
            }
        });

        // 8. Fluorescent Ceiling Tube Lights
        for (let z = -6.5; z <= 6.5; z += 4.5) {
            const lightCoverMat = new THREE.MeshBasicMaterial({ color: theme === 'dark' ? 0xff4757 : 0xffffff });
            const lightCover = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 1.8), lightCoverMat);
            lightCover.position.set(0, carHeight - 0.05, z);
            carGroup.add(lightCover);
            lightMeshes.push(lightCover);

            const pLight = new THREE.PointLight(
                theme === 'dark' ? 0xff4757 : theme === 'neon' ? 0x00f2fe : 0xffeedd,
                theme === 'dark' ? 0.3 : 0.85,
                10
            );
            pLight.position.set(0, carHeight - 0.3, z);
            carGroup.add(pLight);
            lights.push(pLight);
        }

        // 9. Interactive Dynamic Metro Route Map & Status Displays on Interior Walls
        const isEt = this.lang === 'et';
        const routeDisplayRight = this.buildMetroRouteDisplay(index, isEt);
        routeDisplayRight.position.set(1.64, 1.82, 0);
        routeDisplayRight.rotation.y = -Math.PI / 2;
        carGroup.add(routeDisplayRight);

        const routeDisplayLeft = this.buildMetroRouteDisplay(index, isEt);
        routeDisplayLeft.position.set(-1.64, 1.82, 0);
        routeDisplayLeft.rotation.y = Math.PI / 2;
        carGroup.add(routeDisplayLeft);

        let mapMesh: THREE.Group = routeDisplayRight;

        // 10. End Gangway Doors (Front = +Z / Right Branch, Back = -Z / Left Branch)
        const doorFront = this.buildGangwayDoor(carWidth, carHeight, 1, index, branch, theme);
        doorFront.position.set(0, 0, carLength / 2);
        carGroup.add(doorFront);

        const doorBack = this.buildGangwayDoor(carWidth, carHeight, -1, index, branch, theme);
        doorBack.position.set(0, 0, -carLength / 2);
        carGroup.add(doorBack);

        // 11. Golden Shop (Vagun 100 Checkpoint) Construction & Setup
        let inspectableItem: THREE.Group | undefined;
        let inspectableText: any;

        if (index === 100 || theme === 'golden_shop') {
            // Golden Shop Luxury Counter & Pedestals
            const counterMat = new THREE.MeshStandardMaterial({ color: 0x4a2810, roughness: 0.3, metalness: 0.2 });
            const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.95, roughness: 0.15 });

            // Long Sales Counter
            const counter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 0.9), counterMat);
            counter.position.set(0, 0.48, 1.5);
            carGroup.add(counter);

            const counterTop = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 1.0), goldTrimMat);
            counterTop.position.set(0, 0.98, 1.5);
            carGroup.add(counterTop);

            // Glowing 3D Neon Sign: ✨ GOLDEN SHOP ✨
            const signCanvas = document.createElement('canvas');
            signCanvas.width = 512;
            signCanvas.height = 128;
            const sCtx = signCanvas.getContext('2d');
            if (sCtx) {
                sCtx.fillStyle = '#0a0d14';
                sCtx.fillRect(0, 0, 512, 128);
                sCtx.strokeStyle = '#ffd32a';
                sCtx.lineWidth = 6;
                sCtx.strokeRect(6, 6, 500, 116);
                sCtx.fillStyle = '#ffd32a';
                sCtx.font = 'bold 36px sans-serif';
                sCtx.textAlign = 'center';
                sCtx.fillText('✨ GOLDEN SHOP ✨', 256, 58);
                sCtx.fillStyle = '#ffffff';
                sCtx.font = 'bold 20px sans-serif';
                sCtx.fillText('VAGUN 100 CHECKPOINT', 256, 96);
            }
            const signTex = new THREE.CanvasTexture(signCanvas);
            const signMesh = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.7, 0.05), new THREE.MeshBasicMaterial({ map: signTex }));
            signMesh.position.set(0, 2.5, 1.5);
            carGroup.add(signMesh);

            // 5 Item display pedestals on counter
            const itemPedestals = [
                { id: 'night_vision', x: -0.9, icon: '👓', name: 'NV Goggles' },
                { id: 'speed_boost', x: -0.45, icon: '👟', name: 'Speed' },
                { id: 'clue_detector', x: 0.0, icon: '🔍', name: 'Detector' },
                { id: 'secret_pass', x: 0.45, icon: '🎟️', name: 'Secret Pass' },
                { id: 'radio', x: 0.9, icon: '📻', name: 'Radio' }
            ];

            itemPedestals.forEach(p => {
                const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.12, 16), goldTrimMat);
                ped.position.set(p.x, 1.05, 1.5);
                carGroup.add(ped);

                const itemMesh = this.createHeldItemModel(p.id);
                itemMesh.position.set(p.x, 1.2, 1.5);
                itemMesh.rotation.set(0, Math.PI, 0);
                carGroup.add(itemMesh);
            });

            // Friendly AI Shopkeeper NPC behind counter
            const shopkeeper = new THREE.Group();
            const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5cd79, roughness: 0.5 });
            const uniformMat = new THREE.MeshStandardMaterial({ color: 0x1b1464, roughness: 0.6 });
            const goldBadgeMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.9 });

            // Torso
            const sTorso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.65, 0.28), uniformMat);
            sTorso.position.set(0, 1.3, 0);
            shopkeeper.add(sTorso);

            // Golden Epaulets & Badge
            const badge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.02), goldBadgeMat);
            badge.position.set(-0.1, 1.45, 0.15);
            shopkeeper.add(badge);

            // Head & Golden Cap
            const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), skinMat);
            sHead.position.set(0, 1.75, 0);
            shopkeeper.add(sHead);

            const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16), uniformMat);
            cap.position.set(0, 1.86, 0);
            shopkeeper.add(cap);

            const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.12), goldBadgeMat);
            visor.position.set(0, 1.83, 0.14);
            shopkeeper.add(visor);

            shopkeeper.position.set(0, 0, 2.3);
            carGroup.add(shopkeeper);
            this.goldenShopKeeperMesh = shopkeeper;

            // Interactive Shop Prompt Mesh on Counter
            inspectableItem = this.createInspectableNote();
            inspectableItem.position.set(0, 1.05, 1.1);
            carGroup.add(inspectableItem);
            inspectableText = {
                titleEt: '🛒 KULDNE POOD (VAGUN 100)',
                descEt: 'Astu leti juurde ja vali endale vajalikud esemed (Ööprillid, Kiirus, Vihjeandur, Salapilet, Raadio).',
                titleEn: '🛒 GOLDEN SHOP (CARRIAGE 100)',
                descEn: 'Step up to the counter and purchase equipment with your collected Metro Coins.'
            };
        } else if (index === 6 || index === 14 || index === 25 || index === 28 || index === 32 || index === 39 || index === 42 || index === 50 || index === 55 || index === 70 || index === 78 || index === 80 || index === 87) {
            // Story Inspectable Props
            inspectableItem = this.createInspectableNote();
            inspectableItem.position.set(index % 2 === 0 ? -1.1 : 1.1, 0.62, (index % 5) * 1.5 - 2.0);
            carGroup.add(inspectableItem);

            const storyClues: { [key: number]: { titleEt: string; descEt: string; titleEn: string; descEn: string } } = {
                6: {
                    titleEt: '📜 Vana Metroopilet ja Märkmik (1987)',
                    descEt: '„Rong nr 404 väljus viimast korda 14. oktoobril 1987. Peatusi ei registreeritud enam kunagi. Süsteem lukustus igaveseks ringiks...”',
                    titleEn: '📜 Vintage Subway Pass & Notebook (1987)',
                    descEn: '“Train No. 404 departed for the final time on October 14, 1987. No station arrivals were ever recorded again. The track sealed into an infinite loop...”'
                },
                14: {
                    titleEt: '🎫 Salapärane Metroopilet',
                    descEt: 'Vana reljeefne pilet: „Rong 100 · Ühesuunapilet Tundmatusse”.',
                    titleEn: '🎫 Mysterious Subway Ticket',
                    descEn: 'An embossed ticket: „Train 100 · One-way ticket into the Unknown”.'
                },
                26: {
                    titleEt: '🎫 Vana Metroopilet 1987',
                    descEt: 'Kuupäev: 14.10.1987. Märge: „Projekt Viimane Metroo — Peatusi ei ole.”',
                    titleEn: '🎫 Old Ticket 1987',
                    descEn: 'Date: 14.10.1987. Note: „Project Last Metro — No scheduled stops.”'
                },
                28: {
                    titleEt: '🧩 Peidetud Koodisedel (Vagun 28)',
                    descEt: 'Sedel istme all: „Uksekood: 1987”. Uks on nüüd avatud!',
                    titleEn: '🧩 Hidden Code Slip (Carriage 28)',
                    descEn: 'Note under the seat: „Door code: 1987”. Bulkhead door is now unlocked!'
                },
                32: {
                    titleEt: '🗺️ Märgistatud Metrookaart',
                    descEt: 'Kaardil on punane ring: „Vagun 50 peidab tõde. Jätka liikumist.”',
                    titleEn: '🗺️ Marked Transit Map',
                    descEn: 'A red circle notes: „Carriage 50 holds the truth. Keep moving forward.”'
                },
                39: {
                    titleEt: '📋 Hooldusraamatu Väljavõte',
                    descEt: '„Tunnel 7C ei jõua kunagi pinnale. Rong sõidab suletud ajatsüklis.”',
                    titleEn: '📋 Maintenance Log Excerpt',
                    descEn: '„Tunnel 7C never surfaces. The train operates in a closed temporal loop.”'
                },
                42: {
                    titleEt: '🎒 Mahajäetud Seljakott',
                    descEt: 'Koti sees on märkmik: „Vagunis 50 saabub esimene suur vastus.”',
                    titleEn: '🎒 Abandoned Backpack',
                    descEn: 'Inside is a diary: „In Carriage 50, the first great answer awaits.”'
                },
                50: {
                    titleEt: '⭐ Projekti „Igavene Metroo” Dokument (1987)',
                    descEt: '„Rong 100 loodi 1987. aastal ruumi ja aja anomaalia testimiseks. Väljapääs asub Vagun 100 taga. Jätka liikumist!”',
                    titleEn: '⭐ Project „Eternal Metro” Document (1987)',
                    descEn: '„Train 100 was designed in 1987 to test temporal displacement. The gateway lies beyond Carriage 100. Keep going!”'
                },
                55: {
                    titleEt: '🎫 Kuldne Pilet #100',
                    descEt: '„Pilet Vagunisse 100 — Kuldne Checkpoint ja Pood”.',
                    titleEn: '🎫 Golden Ticket #100',
                    descEn: '„Ticket to Carriage 100 — Golden Checkpoint & Shop”.'
                },
                70: {
                    titleEt: '⭐ Kadunud Reisija Päevik',
                    descEt: '„Olen jõudnud vagunisse 70. Vagun 100 on checkpoint ja oaas. Ära anna alla!”',
                    titleEn: '⭐ Lost Passenger\'s Journal',
                    descEn: '„I have reached Carriage 70. Carriage 100 is a checkpoint and safe haven. Do not give up!”'
                },
                78: {
                    titleEt: '🧩 Uksehoova Juhend (Vagun 78)',
                    descEt: '„Tõmba kuldset hooba paremal. Teekond jätkub.” Uks on avatud!',
                    titleEn: '🧩 Bulkhead Lever Guide (Carriage 78)',
                    descEn: '„Pull the golden lever on the right. The journey continues.” Door unlocked!'
                },
                80: {
                    titleEt: '⭐ Suur Metroo Peakaart',
                    descEt: '„Vagun 80 läbitud. Vagun 100 (Kuldne Pood) asub vaid 20 vaguni kaugusel!”',
                    titleEn: '⭐ Grand Master Transit Map',
                    descEn: '„Carriage 80 reached. Carriage 100 (Golden Shop) is just 20 carriages ahead!”'
                },
                87: {
                    titleEt: '💳 Kuldne Konduktori Kaart',
                    descEt: '„Vagun 100 on avatud kõigile ränduritele. Pood võtab vastu Metro Coine.”',
                    titleEn: '💳 Golden Conductor Keycard',
                    descEn: '„Carriage 100 is open to all explorers. The Shop accepts Metro Coins.”'
                }
            };
            inspectableText = storyClues[index] || {
                titleEt: `📜 Dokument Vagunis ${index}`,
                descEt: 'Metroo saladused süvenevad iga vaguniga.',
                titleEn: `📜 Document in Carriage ${index}`,
                descEn: 'The mysteries of the subway deepen with every carriage.'
            };
        } else if (index >= 11 && index % 5 === 1) {
            // Procedural Keypad Puzzle
            const code = `${Math.floor(1000 + Math.random() * 9000)}`;
            inspectableItem = this.createKeypadProp();
            inspectableItem.position.set(1.6, 1.4, 8.8);
            carGroup.add(inspectableItem);
            inspectableText = {
                titleEt: `🔐 Elektrooniline Uksekood: ${code}`,
                descEt: 'Vajuta nuppudele ja sisesta 4-kohaline kood ukse avamiseks.',
                titleEn: `🔐 Electronic Door Code: ${code}`,
                descEn: 'Enter the 4-digit code to unlock the carriage bulkhead door.'
            };
        }

        // 12. Scatter Collectible Rotating Golden Coins throughout the carriage
        this.spawnCollectibleCoins(carGroup, index === 100 ? 8 : 3);

        // 13. Populate Realistic 3D AI Passengers
        this.populatePassengers(carGroup, index, theme, passengers);

        return {
            group: carGroup,
            index,
            branch,
            theme,
            lights,
            lightMeshes,
            passengers,
            doorFront,
            doorBack,
            mapMesh,
            puzzleSolved: index < 11 || (index === 28 && this.hasUnlockedCarriage28WithClue) || (index === 64 && (this.hasUnlockedCarriage64WithKey || !!this.inventory['key'])) || (index === 78 && this.hasUnlockedCarriage78WithHint),
            puzzleCode: index >= 11 ? '1987' : undefined,
            hasKeypad: index >= 11 && index % 5 === 1,
            inspectableItem,
            inspectableText
        };
    }

    private buildMetroRouteDisplay(index: number, isEt: boolean): THREE.Group {
        const group = new THREE.Group();

        // 1. High-resolution canvas for crystal clear LCD/LED route display
        const mapCanvas = document.createElement('canvas');
        mapCanvas.width = 1024;
        mapCanvas.height = 256;
        const ctx = mapCanvas.getContext('2d');
        if (ctx) {
            // Dark sleek subway display background
            ctx.fillStyle = '#0a0e17';
            ctx.fillRect(0, 0, 1024, 256);

            // Subtle bezel border and grid
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 4;
            ctx.strokeRect(4, 4, 1016, 248);

            // Header banner
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(8, 8, 1008, 48);

            // Header line & title
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'left';
            const lineTitle = isEt
                ? '🚇 METROOLIIN M1 · SÜGAVTUNNEL'
                : '🚇 METRO LINE M1 · DEEP TUNNEL';
            ctx.fillText(lineTitle, 24, 40);

            // Carriage indicator badge on top right
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'right';
            const carStatus = isEt
                ? `📍 ASUKOHT: VAGUN ${index}`
                : `📍 CURRENT: CARRIAGE ${index}`;
            ctx.fillText(carStatus, 1000, 40);

            // Route track line
            const lineY = 145;
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 14;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(60, lineY);
            ctx.lineTo(964, lineY);
            ctx.stroke();

            // Active / Completed track line portion
            const progressRatio = Math.min(1.0, Math.max(0, index / 100));
            const progressX = 60 + progressRatio * (964 - 60);

            ctx.strokeStyle = '#10b981'; // Vibrant glowing green for traversed path
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(60, lineY);
            ctx.lineTo(progressX, lineY);
            ctx.stroke();

            // Story Anomaly custom states
            if (index === 22) {
                // Glitching shifting map
                const glitchSymbols = ['[ ??! ]', '[ #&% ]', '[ 404 ]', '[ ERR ]', '[ ☠️ ]'];
                glitchSymbols.forEach((sym, sIdx) => {
                    const x = 90 + sIdx * 210;
                    ctx.fillStyle = '#ef4444';
                    ctx.font = 'bold 24px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(sym, x, lineY - 30);
                    ctx.beginPath();
                    ctx.arc(x, lineY, 12, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.fillStyle = '#f87171';
                ctx.font = 'bold 18px monospace';
                ctx.fillText(isEt ? '⚠️ ANOMAALIA: KAART MUUTUB PIDEVALT!' : '⚠️ ANOMALY: MAP CONSTANTLY SHIFTING!', 512, 225);
            } else if (index === 53) {
                // All stations disappeared
                ctx.fillStyle = '#64748b';
                ctx.font = 'italic bold 22px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(isEt ? '⚠️ KÕIK PEATUSED ON KAARDILT KADUNUD — TÜHI JOON' : '⚠️ ALL STATIONS DISAPPEARED FROM MAP', 512, 100);
                ctx.fillText(isEt ? 'Rong sõidab tundmatusse suunda...' : 'Train speeding into unknown...', 512, 210);
            } else if (index === 94) {
                // Alien / mystery glyphs
                const glyphs = ['⍾ KESK', '⍝ SÜGAV', '⍲ TSOON', '⍿ VÄRAV', '⎔ KULD 100'];
                glyphs.forEach((gl, gIdx) => {
                    const x = 90 + gIdx * 210;
                    ctx.fillStyle = '#c084fc';
                    ctx.font = 'bold 22px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(gl, x, lineY - 30);
                    ctx.beginPath();
                    ctx.arc(x, lineY, 12, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.fillStyle = '#e879f9';
                ctx.font = 'bold 18px monospace';
                ctx.fillText('⚡ ⍾ ⍝ ⍲ ⍿ ⎔ · ANOMAALIA TASE: MAXIMAALNE · ⎔ ⍿ ⍲ ⍝ ⍾', 512, 225);
            } else {
                // Standard Realistic Subway Line Key Milestones (0 -> 20 -> 50 -> 80 -> 100)
                const milestones = [
                    { num: 0, labelEt: 'KESKJAAM', labelEn: 'CENTRAL', sub: '23:45' },
                    { num: 20, labelEt: 'VAGUN 20', labelEn: 'CARRIAGE 20', sub: 'Vari / Shadow' },
                    { num: 50, labelEt: 'VAGUN 50', labelEn: 'CARRIAGE 50', sub: 'Tõde / Truth' },
                    { num: 80, labelEt: 'VAGUN 80', labelEn: 'CARRIAGE 80', sub: 'Peakaart' },
                    { num: 100, labelEt: 'KULDNE TERMINAL 100 ⭐', labelEn: 'GOLDEN TERMINAL 100 ⭐', sub: 'Checkpoint & Pood' }
                ];

                milestones.forEach((m, mIdx) => {
                    const x = 90 + mIdx * 210;
                    const isPassed = index >= m.num;
                    const isCurrent = (mIdx === 0 && index === 0) || (index >= m.num && (mIdx === milestones.length - 1 || index < milestones[mIdx + 1].num));

                    // Station Dot
                    ctx.beginPath();
                    ctx.arc(x, lineY, isCurrent ? 14 : 10, 0, Math.PI * 2);
                    if (m.num === 100) {
                        ctx.fillStyle = isPassed ? '#f59e0b' : '#78350f';
                    } else {
                        ctx.fillStyle = isPassed ? '#10b981' : '#334155';
                    }
                    ctx.fill();

                    if (isCurrent) {
                        ctx.strokeStyle = '#f59e0b';
                        ctx.lineWidth = 4;
                        ctx.beginPath();
                        ctx.arc(x, lineY, 18, 0, Math.PI * 2);
                        ctx.stroke();
                    }

                    // Station Name
                    ctx.fillStyle = isCurrent ? '#fef08a' : (isPassed ? '#ffffff' : '#94a3b8');
                    ctx.font = isCurrent ? 'bold 18px "Segoe UI", Arial, sans-serif' : 'bold 16px "Segoe UI", Arial, sans-serif';
                    ctx.textAlign = 'center';
                    const mainLbl = isEt ? m.labelEt : m.labelEn;
                    ctx.fillText(mainLbl, x, lineY - 26);

                    // Subtitle / Milestone description
                    ctx.fillStyle = isCurrent ? '#fbbf24' : (isPassed ? '#6ee7b7' : '#64748b');
                    ctx.font = '13px "Segoe UI", Arial, sans-serif';
                    ctx.fillText(m.sub, x, lineY + 36);
                });

                // Footer Status Message
                ctx.fillStyle = '#94a3b8';
                ctx.font = '14px "Segoe UI", Arial, sans-serif';
                ctx.textAlign = 'center';
                if (index < 100) {
                    const remaining = 100 - index;
                    ctx.fillText(
                        isEt
                            ? `Järgmise suure checkpointini (Vagun 100): veel ${remaining} vagunit`
                            : `Distance to next major checkpoint (Carriage 100): ${remaining} carriages remaining`,
                        512,
                        228
                    );
                } else if (index === 100) {
                    ctx.fillStyle = '#fbbf24';
                    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
                    ctx.fillText(
                        isEt ? '🌟 Oled jõudnud KULDSE TERMINALINI (Vagun 100)! Pood ja Checkpoint on avatud.' : '🌟 REACHED GOLDEN TERMINAL (Carriage 100)! Shop & Checkpoint active.',
                        512,
                        228
                    );
                } else {
                    ctx.fillStyle = '#a855f7';
                    ctx.fillText(
                        isEt ? `Lõputu metroo tsoon: Vagun ${index} (Edasijõudnud sügavus)` : `Endless subway zone: Carriage ${index} (Advanced depth)`,
                        512,
                        228
                    );
                }
            }
        }

        const mapTexture = new THREE.CanvasTexture(mapCanvas);
        const mapMat = new THREE.MeshStandardMaterial({
            map: mapTexture,
            roughness: 0.3,
            metalness: 0.1,
            emissive: new THREE.Color(0x0a101f),
            emissiveIntensity: 0.2
        });

        // Sleek frame backing
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x181e29, metalness: 0.8, roughness: 0.2 });
        const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.64, 0.04), frameMat);
        group.add(frameMesh);

        // Display panel face
        const displayMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.6), mapMat);
        displayMesh.position.z = 0.022;
        group.add(displayMesh);

        return group;
    }

    private buildGangwayDoor(carWidth: number, carHeight: number, dir: number, carIndex: number, branch: DirectionBranch, theme: CarriageData['theme']): THREE.Group {
        const doorGroup = new THREE.Group();

        // End Bulkhead Wall with centered door archway
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.6 });
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry((carWidth - 1.4) / 2, carHeight, 0.25), wallMat);
        leftWall.position.set(-(carWidth + 1.4) / 4, carHeight / 2, 0);
        doorGroup.add(leftWall);

        const rightWall = new THREE.Mesh(new THREE.BoxGeometry((carWidth - 1.4) / 2, carHeight, 0.25), wallMat);
        rightWall.position.set((carWidth + 1.4) / 4, carHeight / 2, 0);
        doorGroup.add(rightWall);

        const topWall = new THREE.Mesh(new THREE.BoxGeometry(1.4, carHeight - 2.2, 0.25), wallMat);
        topWall.position.set(0, 2.2 + (carHeight - 2.2) / 2, 0);
        doorGroup.add(topWall);

        // Gangway Glass Door Frame
        const frameMat = new THREE.MeshStandardMaterial({
            color: theme === 'abandoned' ? 0x7f1d1d : 0x1e272e,
            metalness: 0.7,
            roughness: 0.3
        });
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.15, 0.08), frameMat);
        frame.position.set(0, 1.1, 0);
        doorGroup.add(frame);

        // Glass Window in Gangway Door
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x111e2e,
            transparent: true,
            opacity: 0.6,
            roughness: 0.1
        });
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.25, 0.09), glassMat);
        glass.position.set(0, 1.35, 0);
        doorGroup.add(glass);

        // Metallic Handle
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.9, roughness: 0.2 });
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3), handleMat);
        handle.position.set(0.48, 1.05, 0.08);
        doorGroup.add(handle);

        // Status Indicator above door
        const isForwardDoor = (branch === 'right' && dir > 0) || (branch === 'left' && dir < 0) || (branch === 'undecided');
        const isLockedBackDoor = !isForwardDoor && carIndex >= 1;

        const indColor = isLockedBackDoor ? 0xff4757 : 0x2ed573;
        const indMat = new THREE.MeshBasicMaterial({ color: indColor });
        const ind = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.06), indMat);
        ind.position.set(0, 2.25, dir * 0.14);
        doorGroup.add(ind);

        // --- Creepy Red-Faced Entity in Every Locked Back Gangway Door ---
        if (isLockedBackDoor) {
            const redFaceGroup = new THREE.Group();

            // Dark Silhouette Body
            const bodyMat = new THREE.MeshStandardMaterial({
                color: 0x050608,
                roughness: 0.9,
                metalness: 0.1
            });
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.2, 0.35), bodyMat);
            body.position.set(0, 0.9, 0);
            redFaceGroup.add(body);

            // Glowing Crimson Red Face (Punane Nägu)
            const faceMat = new THREE.MeshStandardMaterial({
                color: 0xff1744,
                emissive: 0xd50000,
                emissiveIntensity: 0.85,
                roughness: 0.25
            });
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), faceMat);
            head.position.set(0, 1.46, 0);
            redFaceGroup.add(head);

            // Piercing Glowing Eyes
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            [-0.055, 0.055].forEach(ex => {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), eyeMat);
                eye.position.set(ex, 1.48, -dir * 0.16);
                redFaceGroup.add(eye);
            });

            // Glowing Crimson Point Light to make the red face clearly visible
            const redGlow = new THREE.PointLight(0xff1744, 2.2, 3.8);
            redGlow.position.set(0, 1.48, -dir * 0.22);
            redFaceGroup.add(redGlow);

            // Position right behind the glass window of the locked door
            redFaceGroup.position.set(0, 0, dir * 0.55);
            doorGroup.add(redFaceGroup);
        }

        return doorGroup;
    }

    private populatePassengers(carGroup: THREE.Group, carIndex: number, theme: CarriageData['theme'], passengers: AIPassenger[]) {
        let count = 0;
        if (carIndex === 0) count = 6;
        else if (carIndex === 1) count = 4;
        else if (carIndex === 2) count = 3;
        else if (carIndex <= 8) count = Math.max(1, 4 - Math.floor(carIndex / 2));
        else if (carIndex >= 11) count = Math.random() < 0.35 ? 1 : 0;

        const seatPositions = [
            new THREE.Vector3(-1.22, 0.48, -6.2),
            new THREE.Vector3( 1.22, 0.48, -4.8),
            new THREE.Vector3(-1.22, 0.48, -3.2),
            new THREE.Vector3( 1.22, 0.48,  3.2),
            new THREE.Vector3(-1.22, 0.48,  4.8),
            new THREE.Vector3( 1.22, 0.48,  6.2)
        ];

        // Realistic skin tones
        const skinPalette = [0xf5cd79, 0xf7d794, 0xdfe6e9, 0xd1a374, 0x805533, 0xfad390, 0xaa7a53];
        // Eye iris colors
        const eyeColors = [0x2980b9, 0x833400, 0x27ae60, 0x3d271d, 0x16a085, 0x2c3e50];

        // Detailed Passenger Character Archetypes
        const archetypes = [
            {
                name: 'Business Commuter',
                top: 0x2c3e50, pants: 0x1e272e, inner: 0xffffff, tie: 0xc0392b,
                hair: 0x1e272e, hairType: 'side_part', coatStyle: 'suit', shoe: 0x111111,
                prop: 'newspaper', glasses: false, headphones: false
            },
            {
                name: 'Music Student',
                top: 0xe74c3c, pants: 0x2c3e50, inner: 0x2d3436,
                hair: 0x8b4513, hairType: 'fade', coatStyle: 'hoodie', shoe: 0xffffff,
                prop: 'phone', glasses: false, headphones: true
            },
            {
                name: 'Winter Commuter',
                top: 0x16a085, pants: 0x2f3640, inner: 0xdfe6e9,
                hair: 0xd63031, hairType: 'long', coatStyle: 'puffer', shoe: 0x636e72,
                prop: 'coffee', glasses: true, headphones: false
            },
            {
                name: 'Casual Traveler',
                top: 0xd35400, pants: 0x1b1464, inner: 0xffffff,
                hair: 0x2d3436, hairType: 'beanie', coatStyle: 'puffer', shoe: 0xffffff,
                prop: 'phone', glasses: false, headphones: false
            },
            {
                name: 'Office Worker',
                top: 0x8e44ad, pants: 0x34495e, inner: 0xf5f6fa,
                hair: 0x111111, hairType: 'ponytail', coatStyle: 'trench', shoe: 0x2d3436,
                prop: 'phone', glasses: false, headphones: false
            },
            {
                name: 'Urban Explorer',
                top: 0x27ae60, pants: 0x2c2c54, inner: 0x1e272e,
                hair: 0x57606f, hairType: 'fade', coatStyle: 'hoodie', shoe: 0xffffff,
                prop: 'newspaper', glasses: false, headphones: false
            }
        ];

        for (let i = 0; i < count; i++) {
            const seatPos = seatPositions[i % seatPositions.length];
            const arch = archetypes[i % archetypes.length];
            const skinColor = skinPalette[i % skinPalette.length];
            const irisColor = eyeColors[i % eyeColors.length];

            const pGroup = new THREE.Group();
            pGroup.position.copy(seatPos);

            // Realistic PBR materials
            const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6, metalness: 0.05 });
            const clothingTopMat = new THREE.MeshStandardMaterial({ color: arch.top, roughness: 0.7 });
            const clothingPantsMat = new THREE.MeshStandardMaterial({ color: arch.pants, roughness: 0.8 });
            const innerMat = new THREE.MeshStandardMaterial({ color: arch.inner, roughness: 0.85 });
            const hairMat = new THREE.MeshStandardMaterial({ color: arch.hair, roughness: 0.85 });
            const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.2 });
            const irisMat = new THREE.MeshStandardMaterial({ color: irisColor, roughness: 0.3 });
            const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
            const lipMat = new THREE.MeshStandardMaterial({ color: 0xd68172, roughness: 0.6 });
            const shoeSoleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
            const shoeUpperMat = new THREE.MeshStandardMaterial({ color: arch.shoe, roughness: 0.6 });

            // --- 1. Realistic Head & Face Anatomy ---
            const pHead = new THREE.Group();
            pHead.position.set(0, 0.78, 0);

            // Cranium & Jaw Structure
            const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 14), skinMat);
            cranium.scale.set(1.0, 1.15, 1.05);
            pHead.add(cranium);

            const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.11, 0.14), skinMat);
            jaw.position.set(0, -0.06, 0.03);
            pHead.add(jaw);

            // Neck with collar contour
            const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.072, 0.13, 10), skinMat);
            neck.position.set(0, -0.15, 0);
            pHead.add(neck);

            // 3D Realistic Eyes (Sclera + Iris + Pupil + Eyelids)
            [-0.048, 0.048].forEach(ex => {
                // Sclera (eyeball white)
                const eyeball = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), eyeWhiteMat);
                eyeball.position.set(ex, 0.02, 0.12);
                pHead.add(eyeball);

                // Colored Iris
                const iris = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), irisMat);
                iris.position.set(ex, 0.02, 0.135);
                pHead.add(iris);

                // Dark Pupil
                const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 6), pupilMat);
                pupil.position.set(ex, 0.02, 0.144);
                pHead.add(pupil);

                // Upper Eyelid crease
                const eyelid = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.008, 0.02), skinMat);
                eyelid.position.set(ex, 0.04, 0.132);
                pHead.add(eyelid);

                // Eyebrow matching hair color
                const eyebrow = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.012, 0.015), hairMat);
                eyebrow.rotation.z = (ex > 0 ? -1 : 1) * 0.08;
                eyebrow.position.set(ex, 0.058, 0.135);
                pHead.add(eyebrow);
            });

            // 3D Nose Bridge and Nostrils
            const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.055, 0.045), skinMat);
            noseBridge.rotation.x = -Math.PI / 16;
            noseBridge.position.set(0, -0.015, 0.148);
            pHead.add(noseBridge);

            // 3D Expressive Lips
            const lips = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.016, 0.022), lipMat);
            lips.position.set(0, -0.072, 0.13);
            pHead.add(lips);

            // 3D Realistic Ears
            [-0.142, 0.142].forEach(earX => {
                const ear = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.065, 0.04), skinMat);
                ear.position.set(earX, 0.01, -0.01);
                pHead.add(ear);
            });

            // --- 2. Realistic Hairstyles & Headwear ---
            if (arch.hairType === 'fade' || arch.hairType === 'short') {
                // Layered Textured Short Hair
                const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.152, 14, 12), hairMat);
                hairTop.position.set(0, 0.06, -0.01);
                hairTop.scale.set(1.02, 1.08, 1.05);
                pHead.add(hairTop);

                const bangs = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.045, 0.06), hairMat);
                bangs.position.set(0, 0.095, 0.115);
                pHead.add(bangs);
            } else if (arch.hairType === 'long') {
                // Long Cascading Wavy Hair
                const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.155, 14, 12), hairMat);
                hairTop.position.set(0, 0.05, -0.01);
                hairTop.scale.set(1.04, 1.1, 1.06);
                pHead.add(hairTop);

                // Front shoulder-draping strands
                [-0.12, 0.12].forEach(sx => {
                    const strand = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.42, 0.08), hairMat);
                    strand.position.set(sx, -0.16, 0.04);
                    pHead.add(strand);
                });

                // Back voluminous flowing hair
                const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.46, 0.12), hairMat);
                hairBack.position.set(0, -0.18, -0.13);
                pHead.add(hairBack);
            } else if (arch.hairType === 'ponytail') {
                // High Ponytail with Scrunchie
                const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.152, 14, 12), hairMat);
                hairCap.position.set(0, 0.05, -0.02);
                pHead.add(hairCap);

                const scrunchie = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.014, 8, 12), new THREE.MeshStandardMaterial({ color: 0xf39c12 }));
                scrunchie.position.set(0, 0.08, -0.15);
                scrunchie.rotation.x = Math.PI / 4;
                pHead.add(scrunchie);

                const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.02, 0.32, 8), hairMat);
                tail.rotation.x = Math.PI / 3.5;
                tail.position.set(0, -0.05, -0.22);
                pHead.add(tail);
            } else if (arch.hairType === 'beanie') {
                // Ribbed Knit Winter Beanie with Folded Brim
                const beanieMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.9 });
                const beanieCrown = new THREE.Mesh(new THREE.SphereGeometry(0.162, 14, 14), beanieMat);
                beanieCrown.position.set(0, 0.07, -0.01);
                beanieCrown.scale.set(1.05, 1.15, 1.05);
                pHead.add(beanieCrown);

                const beanieBrim = new THREE.Mesh(new THREE.TorusGeometry(0.148, 0.028, 8, 16), beanieMat);
                beanieBrim.rotation.x = Math.PI / 2;
                beanieBrim.position.set(0, 0.02, 0);
                pHead.add(beanieBrim);
            } else if (arch.hairType === 'side_part') {
                // Business Combed Side-Part
                const hairPart = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.08, 0.28), hairMat);
                hairPart.position.set(0, 0.11, -0.01);
                pHead.add(hairPart);

                const sideburns = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.18), hairMat);
                sideburns.position.set(0, 0.02, -0.04);
                pHead.add(sideburns);
            }

            // High-End Studio Headphones with Glowing Audio LED
            if (arch.headphones) {
                const hpFrameMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 });
                const hpPadMat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.7 });
                const hpLedMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3 });

                // Symmetrical headband arch over top of head from ear to ear
                const band = new THREE.Mesh(new THREE.TorusGeometry(0.162, 0.016, 8, 24, Math.PI), hpFrameMat);
                band.position.set(0, 0.01, -0.01);
                pHead.add(band);

                [-0.16, 0.16].forEach(hx => {
                    const earpad = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.035, 12), hpPadMat);
                    earpad.rotation.z = Math.PI / 2;
                    earpad.position.set(hx, 0.01, -0.01);
                    pHead.add(earpad);

                    const led = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.038, 8), hpLedMat);
                    led.rotation.z = Math.PI / 2;
                    led.position.set(hx > 0 ? hx + 0.002 : hx - 0.002, 0.01, -0.01);
                    pHead.add(led);
                });
            }

            // Reading Glasses
            if (arch.glasses) {
                const frameMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 });
                const lensMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, transparent: true, opacity: 0.4, roughness: 0.1 });
                [-0.048, 0.048].forEach(gx => {
                    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.004, 6, 12), frameMat);
                    rim.position.set(gx, 0.02, 0.14);
                    pHead.add(rim);

                    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.022, 10), lensMat);
                    lens.position.set(gx, 0.02, 0.14);
                    pHead.add(lens);
                });
                const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.004, 0.004), frameMat);
                bridge.position.set(0, 0.02, 0.14);
                pHead.add(bridge);
            }

            pGroup.add(pHead);

            // --- 3. Layered Outfits & Torso ---
            const pBody = new THREE.Group();
            pBody.position.set(0, 0.32, 0);

            // Inner Shirt / Collar / Tie
            const innerChest = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.48, 0.25), innerMat);
            innerChest.position.set(0, 0, 0.02);
            pBody.add(innerChest);

            if (arch.coatStyle === 'suit') {
                // Business Suit Blazer with Lapels and Tie
                const suitLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.28), clothingTopMat);
                suitLeft.position.set(-0.14, 0, 0);
                pBody.add(suitLeft);

                const suitRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.28), clothingTopMat);
                suitRight.position.set(0.14, 0, 0);
                pBody.add(suitRight);

                const suitBack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.52, 0.1), clothingTopMat);
                suitBack.position.set(0, 0, -0.09);
                pBody.add(suitBack);

                if (arch.tie) {
                    const tieMat = new THREE.MeshStandardMaterial({ color: arch.tie, roughness: 0.5 });
                    const tieMesh = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.32, 0.015), tieMat);
                    tieMesh.position.set(0, 0.06, 0.146);
                    pBody.add(tieMesh);
                }
            } else if (arch.coatStyle === 'puffer') {
                // Segmented Winter Puffer Jacket with Horizontal Baffles
                for (let b = 0; b < 3; b++) {
                    const baffle = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.31), clothingTopMat);
                    baffle.position.set(0, -0.15 + b * 0.16, 0);
                    pBody.add(baffle);
                }
                const collar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.29), clothingTopMat);
                collar.position.set(0, 0.25, 0);
                pBody.add(collar);

                // Zipper Line
                const zipMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, metalness: 0.8, roughness: 0.3 });
                const zipper = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.48, 0.012), zipMat);
                zipper.position.set(0, 0, 0.158);
                pBody.add(zipper);
            } else if (arch.coatStyle === 'hoodie') {
                // Relaxed Streetwear Hoodie with Kangaroo Pocket
                const hoodieTorso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.52, 0.3), clothingTopMat);
                hoodieTorso.position.set(0, 0, 0);
                pBody.add(hoodieTorso);

                const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.04), clothingTopMat);
                pocket.position.set(0, -0.12, 0.16);
                pBody.add(pocket);

                // Drawstrings
                const cordMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
                [-0.05, 0.05].forEach(cx => {
                    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 6), cordMat);
                    cord.position.set(cx, 0.12, 0.155);
                    pBody.add(cord);
                });
            } else {
                // Classic Trench Coat
                const trenchTorso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.54, 0.29), clothingTopMat);
                trenchTorso.position.set(0, 0, 0);
                pBody.add(trenchTorso);

                const lapelLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.03), clothingTopMat);
                lapelLeft.rotation.z = -0.2;
                lapelLeft.position.set(-0.08, 0.1, 0.15);
                pBody.add(lapelLeft);

                const lapelRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.03), clothingTopMat);
                lapelRight.rotation.z = 0.2;
                lapelRight.position.set(0.08, 0.1, 0.15);
                pBody.add(lapelRight);
            }

            pGroup.add(pBody);

            // --- 4. Articulated Arms & Detailed Sculpted Hands ---
            let leftThumbMesh: THREE.Mesh | undefined;
            let rightThumbMesh: THREE.Mesh | undefined;
            let phoneMesh: THREE.Mesh | undefined;

            [-0.23, 0.23].forEach((ax, armIdx) => {
                const armGroup = new THREE.Group();
                armGroup.position.set(ax, 0.44, 0.02);

                // Upper arm
                const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.046, 0.24, 8), clothingTopMat);
                upperArm.rotation.x = 0.35;
                upperArm.position.set(0, -0.1, 0.04);
                armGroup.add(upperArm);

                // Sleeve Cuff
                const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.04, 8), clothingTopMat);
                cuff.rotation.x = 0.85;
                cuff.position.set(0, -0.2, 0.12);
                armGroup.add(cuff);

                // Forearm extending towards lap / prop
                const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.22, 8), skinMat);
                forearm.rotation.x = 0.95;
                forearm.position.set(0, -0.23, 0.17);
                armGroup.add(forearm);

                // Detailed Sculpted Hand with Separate Thumb & Fingers
                const palm = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.028, 0.075), skinMat);
                palm.position.set(0, -0.26, 0.26);
                armGroup.add(palm);

                const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.018, 0.045), skinMat);
                thumb.rotation.y = (ax > 0 ? -1 : 1) * 0.4;
                thumb.position.set(ax > 0 ? -0.035 : 0.035, -0.25, 0.27);
                armGroup.add(thumb);

                if (armIdx === 0) leftThumbMesh = thumb;
                else rightThumbMesh = thumb;

                pGroup.add(armGroup);
            });

            // --- 5. Seated Legs & Detailed 3D Sneakers ---
            [-0.11, 0.11].forEach(lx => {
                // Thighs (resting horizontally forward on seat cushion)
                const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.14, 0.38), clothingPantsMat);
                thigh.position.set(lx, 0.08, 0.16);
                pGroup.add(thigh);

                // Calves (extending downward to train floor)
                const calf = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.38, 0.13), clothingPantsMat);
                calf.position.set(lx, -0.15, 0.32);
                pGroup.add(calf);

                // Realistic 2-Tone Modern Sneaker / Shoe
                const shoeGroup = new THREE.Group();
                shoeGroup.position.set(lx, -0.34, 0.36);

                // Midsole & Rubber Outsole
                const sole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.24), shoeSoleMat);
                sole.position.set(0, 0, 0.01);
                shoeGroup.add(sole);

                // Upper Body
                const upper = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.22), shoeUpperMat);
                upper.position.set(0, 0.05, 0);
                shoeGroup.add(upper);

                // White Rubber Toe Cap
                const toeCap = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.05, 0.06), shoeSoleMat);
                toeCap.position.set(0, 0.04, 0.09);
                shoeGroup.add(toeCap);

                // Shoelaces Ridge
                const laces = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.1), shoeSoleMat);
                laces.position.set(0, 0.086, 0.02);
                laces.rotation.x = -Math.PI / 8;
                shoeGroup.add(laces);

                pGroup.add(shoeGroup);
            });

            // --- 6. Realistic Interactive Props (Smartphone, Newspaper, Coffee, Backpack) ---
            if (arch.prop === 'phone') {
                // Sleek OLED Smartphone with Glowing UI
                const phoneBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, metalness: 0.9, roughness: 0.1 });
                const phoneScreenMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3 });

                phoneMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.012, 0.2), phoneBodyMat);
                phoneMesh.rotation.x = -Math.PI / 5.5;
                phoneMesh.position.set(0, 0.24, 0.31);
                pGroup.add(phoneMesh);

                const screen = new THREE.Mesh(new THREE.BoxGeometry(0.098, 0.004, 0.18), phoneScreenMat);
                screen.position.set(0, 0.007, 0);
                phoneMesh.add(screen);
            } else if (arch.prop === 'newspaper') {
                // Broadsheet Metro Newspaper with Printed Layout
                const paperMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.9 });
                const inkMat = new THREE.MeshBasicMaterial({ color: 0x2f3640 });

                const paper = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.01), paperMat);
                paper.rotation.x = -Math.PI / 3.8;
                paper.position.set(0, 0.26, 0.32);
                pGroup.add(paper);

                // Headline Bar & Image Frame
                const headline = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.035, 0.002), inkMat);
                headline.position.set(0, 0.08, 0.006);
                paper.add(headline);

                const articleCol1 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.002), inkMat);
                articleCol1.position.set(-0.08, -0.02, 0.006);
                paper.add(articleCol1);

                const articleCol2 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.002), inkMat);
                articleCol2.position.set(0.08, -0.02, 0.006);
                paper.add(articleCol2);
            } else if (arch.prop === 'coffee') {
                // Paper Coffee Cup with Heat Cardboard Sleeve & Sip Lid
                const cupMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
                const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x833400, roughness: 0.9 });
                const lidMat = new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.3 });

                const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.11, 10), cupMat);
                cup.position.set(0.06, 0.26, 0.3);
                pGroup.add(cup);

                const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.05, 10), sleeveMat);
                sleeve.position.set(0, 0, 0);
                cup.add(sleeve);

                const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.015, 10), lidMat);
                lid.position.set(0, 0.058, 0);
                cup.add(lid);
            }

            // Floor / Seat Commuter Backpack
            if (i % 2 === 1) {
                const packMat = new THREE.MeshStandardMaterial({ color: arch.top, roughness: 0.8 });
                const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.16), packMat);
                backpack.position.set(seatPos.x > 0 ? -0.28 : 0.28, -0.22, 0.1);
                pGroup.add(backpack);

                const frontPocket = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.05), packMat);
                frontPocket.position.set(0, -0.05, 0.1);
                backpack.add(frontPocket);
            }

            const baseRotY = seatPos.x > 0 ? -Math.PI / 2 : Math.PI / 2;
            pGroup.rotation.y = baseRotY;

            const isCreepy = carIndex === 2 && i === 1; // Special uncanny staring passenger
            passengers.push({
                group: pGroup,
                head: pHead,
                body: pBody,
                isSitting: true,
                seatPos,
                animType: isCreepy ? 'uncanny_stare' : arch.prop === 'phone' ? 'phone' : 'look_window',
                baseRotY,
                targetRotY: baseRotY,
                isCreepy,
                phoneMesh,
                headphones: arch.headphones,
                thumbLeft: leftThumbMesh,
                thumbRight: rightThumbMesh
            });

            carGroup.add(pGroup);
        }
    }

    // --- Coins, Roblox-Style Hotbar & Equipment Models ---

    public addCoins(amount: number) {
        this.coins += amount;
        this.updateCoinsUI();
        try {
            localStorage.setItem('last_metro_coins', String(this.coins));
        } catch (e) {}
    }

    public spendCoins(amount: number): boolean {
        if (this.coins < amount) return false;
        this.coins -= amount;
        this.updateCoinsUI();
        try {
            localStorage.setItem('last_metro_coins', String(this.coins));
        } catch (e) {}
        return true;
    }

    public updateCoinsUI() {
        const isEt = this.lang === 'et';
        const coinsLabel = document.getElementById('hud-coins-label');
        if (coinsLabel) {
            coinsLabel.innerText = isEt ? `${this.coins} COINI` : `${this.coins} COINS`;
        }
        const shopBal = document.getElementById('shop-coin-balance');
        if (shopBal) {
            shopBal.innerText = isEt ? `🪙 ${this.coins} COINI` : `🪙 ${this.coins} COINS`;
        }
    }

    public unlockItem(itemKey: string) {
        if (this.inventory[itemKey]) return;
        this.inventory[itemKey] = true;
        this.updateHotbarUI();
        metroAudio.playItemEquip();

        const isEt = this.lang === 'et';
        if (itemKey === 'key') {
            this.showThought('Sain VÕTME! 🗝️ (Klõpsa ekraani all olevale võtmele, et see kätte võtta nagu Robloxsis)', 'Acquired KEY! 🗝️ (Click the hotbar slot below to equip it like in Roblox)');
        }
        try {
            localStorage.setItem('last_metro_inventory', JSON.stringify(this.inventory));
        } catch (e) {}
    }

    public toggleEquipItem(itemKey: string) {
        if (this.equippedItem === itemKey) {
            // Unequip item ("nagu robloxsis")
            this.equippedItem = null;
            if (this.heldItemMesh) {
                this.camera.remove(this.heldItemMesh);
                this.heldItemMesh = null;
            }
            if (itemKey === 'night_vision') {
                this.nightVisionActive = false;
                const nvOverlay = document.getElementById('night-vision-overlay');
                if (nvOverlay) nvOverlay.style.display = 'none';
            } else if (itemKey === 'radio') {
                this.radioActive = false;
                metroAudio.stopRadioAudio();
            } else if (itemKey === 'speed_boost') {
                this.speedBoostActive = false;
            } else if (itemKey === 'clue_detector') {
                this.clueDetectorActive = false;
            }
            metroAudio.playItemEquip();
            this.updateHotbarUI();
        } else {
            // Equip new item
            this.equippedItem = itemKey;
            metroAudio.playItemEquip();

            if (this.heldItemMesh) {
                this.camera.remove(this.heldItemMesh);
                this.heldItemMesh = null;
            }

            // Create 3D held model on camera view
            this.heldItemMesh = this.createHeldItemModel(itemKey);
            if (this.heldItemMesh) {
                this.heldItemMesh.position.set(0.26, -0.22, -0.45);
                this.camera.add(this.heldItemMesh);
            }

            if (itemKey === 'night_vision') {
                this.nightVisionActive = true;
                const nvOverlay = document.getElementById('night-vision-overlay');
                if (nvOverlay) nvOverlay.style.display = 'block';
            } else if (itemKey === 'radio') {
                this.radioActive = true;
                metroAudio.playRadioAudio();
            } else if (itemKey === 'speed_boost') {
                this.speedBoostActive = true;
            } else if (itemKey === 'clue_detector') {
                this.clueDetectorActive = true;
            }
            this.updateHotbarUI();
        }
    }

    public updateHotbarUI() {
        const hotbar = document.getElementById('inventory-hotbar');
        if (!hotbar) return;
        hotbar.innerHTML = '';

        const itemDefs: { key: string; icon: string; nameEt: string; nameEn: string; slot: number }[] = [
            { key: 'key', icon: '🗝️', nameEt: 'Võti', nameEn: 'Key', slot: 1 },
            { key: 'night_vision', icon: '👓', nameEt: 'Ööprillid', nameEn: 'NV Goggles', slot: 2 },
            { key: 'speed_boost', icon: '👟', nameEt: 'Kiirus', nameEn: 'Speed', slot: 3 },
            { key: 'clue_detector', icon: '🔍', nameEt: 'Vihjeandur', nameEn: 'Detector', slot: 4 },
            { key: 'secret_pass', icon: '🎟️', nameEt: 'Salapilet', nameEn: 'Secret Pass', slot: 5 },
            { key: 'radio', icon: '📻', nameEt: 'Raadio', nameEn: 'Radio', slot: 6 }
        ];

        itemDefs.forEach(def => {
            if (this.inventory[def.key]) {
                const slotDiv = document.createElement('div');
                slotDiv.className = `hotbar-slot ${this.equippedItem === def.key ? 'equipped' : ''}`;
                slotDiv.id = `slot-${def.key}`;
                slotDiv.innerHTML = `
                    <span class="slot-num">${def.slot}</span>
                    <span class="slot-icon">${def.icon}</span>
                    <span class="slot-name">${this.lang === 'et' ? def.nameEt : def.nameEn}</span>
                `;
                slotDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleEquipItem(def.key);
                });
                hotbar.appendChild(slotDiv);
            }
        });
    }

    private createHeldItemModel(itemKey: string): THREE.Group {
        const group = new THREE.Group();

        if (itemKey === 'key') {
            // Golden Skeleton Key
            const goldMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.95, roughness: 0.15 });
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 8, 16), goldMat);
            ring.position.set(0, 0, 0);
            group.add(ring);

            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 8), goldMat);
            shaft.rotation.x = Math.PI / 2;
            shaft.position.set(0, 0, -0.07);
            group.add(shaft);

            const bit1 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.024, 0.015), goldMat);
            bit1.position.set(0, -0.015, -0.12);
            group.add(bit1);

            const bit2 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.018, 0.012), goldMat);
            bit2.position.set(0, -0.012, -0.135);
            group.add(bit2);
        } else if (itemKey === 'radio') {
            // Vintage Portable Subway Radio
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 0.6 });
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.04), bodyMat);
            group.add(body);

            const dialMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
            const dial = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.005), dialMat);
            dial.position.set(0, 0.03, 0.021);
            group.add(dial);

            const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.14, 6), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9 }));
            antenna.position.set(0.03, 0.12, 0);
            group.add(antenna);
        } else if (itemKey === 'secret_pass') {
            // Golden Secret Pass
            const passMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.85, roughness: 0.25 });
            const pass = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.004), passMat);
            group.add(pass);
        } else if (itemKey === 'clue_detector') {
            // Radar Clue Detector
            const casingMat = new THREE.MeshStandardMaterial({ color: 0x2f3542, metalness: 0.7, roughness: 0.3 });
            const casing = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.03), casingMat);
            group.add(casing);

            const ledMat = new THREE.MeshBasicMaterial({ color: 0x2ed573 });
            const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), ledMat);
            led.position.set(0, 0.04, 0.016);
            group.add(led);
        } else if (itemKey === 'night_vision') {
            // Goggles
            const gMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.5 });
            const lensMat = new THREE.MeshBasicMaterial({ color: 0x2ed573 });
            [-0.03, 0.03].forEach(gx => {
                const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8), gMat);
                tube.rotation.x = Math.PI / 2;
                tube.position.set(gx, 0, 0);
                group.add(tube);

                const lens = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), lensMat);
                lens.position.set(gx, 0, -0.031);
                group.add(lens);
            });
        }

        group.rotation.set(0.1, -0.2, 0.05);
        return group;
    }

    private spawnCollectibleCoins(carGroup: THREE.Group, count: number = 3) {
        const coinMat = new THREE.MeshStandardMaterial({
            color: 0xffd32a,
            metalness: 0.95,
            roughness: 0.12,
            emissive: 0xffd32a,
            emissiveIntensity: 0.35
        });
        const coinGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.025, 16);

        const possiblePositions = [
            new THREE.Vector3(-0.9, 0.55, -4.5),
            new THREE.Vector3(0.9, 0.55, -2.0),
            new THREE.Vector3(0, 0.15, 0.5),
            new THREE.Vector3(-0.9, 0.55, 3.5),
            new THREE.Vector3(0.9, 0.55, 6.0),
            new THREE.Vector3(0, 0.15, -6.5)
        ];

        for (let i = 0; i < count; i++) {
            const pos = possiblePositions[(i + this.currentCarIndex) % possiblePositions.length];
            const coinMesh = new THREE.Mesh(coinGeo, coinMat);
            coinMesh.rotation.x = Math.PI / 2;
            coinMesh.position.copy(pos);
            carGroup.add(coinMesh);

            this.collectibleCoins.push({
                mesh: coinMesh,
                value: 2,
                collected: false
            });
        }
    }

    public openGoldenShopModal() {
        const modal = document.getElementById('golden-shop-modal');
        if (!modal) return;
        this.updateCoinsUI();

        const grid = document.getElementById('shop-items-grid');
        if (grid) {
            grid.innerHTML = '';
            GOLDEN_SHOP_ITEMS.forEach(item => {
                const isOwned = this.inventory[item.id];
                const canAfford = this.coins >= item.price;
                const card = document.createElement('div');
                card.className = 'shop-item-card';
                card.innerHTML = `
                    <div class="shop-item-header">
                        <span style="font-size: 1.6rem;">${item.icon}</span>
                        <div>
                            <div class="shop-item-title">${this.lang === 'et' ? item.nameEt : item.nameEn}</div>
                            <div class="shop-item-price">🪙 ${item.price} COINI</div>
                        </div>
                    </div>
                    <div class="shop-item-desc">${this.lang === 'et' ? item.descEt : item.descEn}</div>
                    <div class="shop-item-footer">
                        <span style="font-size: 0.75rem; color: #a4b0be;">${isOwned ? '✅ OMATUD' : 'Saadaval'}</span>
                        <button class="btn-shop-buy" id="btn-buy-${item.id}" ${isOwned ? 'disabled' : canAfford ? '' : 'disabled'}>
                            ${isOwned ? '✅ OMAD' : '🛒 OSTA / BUY'}
                        </button>
                    </div>
                `;

                const buyBtn = card.querySelector(`#btn-buy-${item.id}`);
                if (buyBtn && !isOwned) {
                    buyBtn.addEventListener('click', () => {
                        this.buyShopItem(item.id);
                    });
                }
                grid.appendChild(card);
            });
        }

        modal.style.display = 'flex';
        this.state = 'golden_shop';
        this.updateCursorState();
    }

    public buyShopItem(itemId: string) {
        const item = GOLDEN_SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return;

        if (this.spendCoins(item.price)) {
            this.unlockItem(item.id);
            metroAudio.playShopPurchase();
            this.openGoldenShopModal(); // Refresh view
            this.showThought(
                `Ostsid eseme: ${this.lang === 'et' ? item.nameEt : item.nameEn}!`,
                `Purchased item: ${item.nameEn}!`
            );
        } else {
            this.showThought('Sul ei ole piisavalt coine!', 'You do not have enough coins!');
        }
    }

    public triggerReverseTunnel(duration: number = 5.0) {
        this.reverseTunnelTimer = duration;
    }

    public triggerSoundCutout(duration: number = 4.0) {
        this.soundCutoutTimer = duration;
        metroAudio.setVolume(0);
        setTimeout(() => {
            metroAudio.setVolume(0.7);
        }, duration * 1000);
    }

    private createInspectableNote(): THREE.Group {
        const noteGroup = new THREE.Group();

        // Leather notebook cover
        const bookCoverMat = new THREE.MeshStandardMaterial({ color: 0x4a2810, roughness: 0.8 });
        const bookCover = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.26), bookCoverMat);
        noteGroup.add(bookCover);

        // Yellowed paper pages
        const paperMat = new THREE.MeshStandardMaterial({ color: 0xfae5bf, roughness: 0.9 });
        const paper = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.045, 0.24), paperMat);
        paper.position.y = 0.01;
        noteGroup.add(paper);

        // Interactive subtle pulse beacon
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), beaconMat);
        beacon.position.set(0, 0.1, 0);
        noteGroup.add(beacon);

        return noteGroup;
    }

    private createKeypadProp(): THREE.Group {
        const keypadGroup = new THREE.Group();

        // Metal mounting plate
        const plateMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.8, roughness: 0.3 });
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.08), plateMat);
        keypadGroup.add(plate);

        // Digital backlit LCD screen
        const screenMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
        const screen = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.09), screenMat);
        screen.position.set(0, 0.1, 0);
        keypadGroup.add(screen);

        return keypadGroup;
    }

    // --- Story & Anomaly Transitions ---

    // --- Story & Anomaly Transitions ---

    public loadCarriage(index: number, branch: DirectionBranch) {
        console.log(`🚇 Loading Carriage ${index} (Branch: ${branch})`);
        const prevIndex = this.currentCarIndex;
        this.currentCarIndex = index;
        this.totalCarriagesExplored++;
        if (branch !== 'undecided') this.branchDirection = branch;

        // Coins are now earned only from 3D pickups, not automatic door crossing

        // Stop or start Golden Shop calming music on transition
        if (prevIndex === 100 && index !== 100) {
            metroAudio.stopShopMusic();
        } else if (index === 100) {
            metroAudio.playShopMusic();
            try {
                localStorage.setItem('last_metro_checkpoint', JSON.stringify({
                    carriage: 100,
                    coins: this.coins,
                    inventory: this.inventory
                }));
            } catch (e) {}
        }

        // Cleanly dispose and remove previous carriage to free GPU memory
        if (this.currentCarriage) {
            this.scene.remove(this.currentCarriage.group);
            this.currentCarriage.group.traverse((child: any) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
                    else child.material.dispose();
                }
            });
        }

        // Clean up previous anomalies (shadow hands, stalkers, shadow entity, modals)
        this.shadowHandsGroups.forEach(h => this.scene.remove(h));
        this.shadowHandsGroups = [];
        this.shadowHandsActive = false;
        if (this.stalkerMesh) {
            this.scene.remove(this.stalkerMesh);
            this.stalkerMesh = null;
            this.stalkerActive = false;
        }
        if (this.shadowEntityMesh) {
            this.scene.remove(this.shadowEntityMesh);
            this.shadowEntityMesh = null;
            this.shadowRushActive = false;
        }
        this.shadowRushCountdown = 0;
        this.isSitting = false;
        const standBtn = document.getElementById('btn-stand-up');
        if (standBtn) standBtn.style.display = 'none';
        const sitIcon = document.getElementById('btn-toggle-sit-icon');
        const sitText = document.getElementById('btn-toggle-sit-text');
        if (sitIcon) sitIcon.textContent = '🪑';
        if (sitText) sitText.textContent = this.lang === 'et' ? 'Istu' : 'Sit';

        const deathModal = document.getElementById('death-modal');
        if (deathModal) deathModal.style.display = 'none';

        // Determine Theme based on story progression or infinite randomness
        let theme: CarriageData['theme'] = 'normal';
        const shadowRushCarriages = [20, 25, 32, 48, 50, 57, 63, 70, 75, 82, 90, 97];
        if (shadowRushCarriages.includes(index) || index === 4 || index === 15 || index === 35 || index === 49 || index === 60 || index === 96) theme = 'flicker';
        else if (index === 7 || index === 9 || index === 10 || index === 38 || index === 54 || index === 77) theme = 'dark';
        else if (index === 23) theme = 'neon';
        else if (index === 100) theme = 'golden_shop';
        else if (index >= 101) {
            const themes: CarriageData['theme'][] = ['normal', 'flicker', 'dark', 'abandoned', 'neon', 'lounge', 'archive'];
            theme = themes[Math.floor(Math.random() * themes.length)];
        }

        this.currentCarriage = this.createCarriageGeometry(index, this.branchDirection, theme);
        this.scene.add(this.currentCarriage.group);

        // Position player at entrance door and set free movement facing forward down the aisle
        this.state = 'player_free';
        this.playerPos.set(0, 1.6, branch === 'left' ? 7.5 : -7.5);
        this.cameraEuler.y = branch === 'left' ? 0 : Math.PI;

        // Play heavy door latch audio
        metroAudio.playDoorLatch();

        // Update UI
        this.updateLanguageUI();
        this.updateCoinsUI();
        this.updateHotbarUI();

        // User requirement: "uks 26 hakkb tulema kõrge kõlaga klaveri pala et oleka väga hirmulav kuni vagun 31"
        if (index >= 26 && index <= 31) {
            metroAudio.startEerieHighPianoTrack();
        } else {
            metroAudio.stopEerieHighPianoTrack();
        }

        // Trigger story events per carriage index
        this.triggerCarriageStoryEvent(index);
    }

    private triggerCarriageStoryEvent(index: number) {
        // Ramping eerie drone (resets to peaceful 0 at checkpoint 100)
        metroAudio.setEerinessLevel(index === 100 ? 0.0 : Math.min(1.0, index * 0.03));

        switch (index) {
            case 1:
                setTimeout(() => {
                    metroAudio.playWhisper(4.0);
                    setTimeout(() => {
                        this.showThought('Kas ma kujutasin seda ette?', 'Did I imagine that?');
                    }, 4200);
                }, 3000);
                break;
            case 2:
                this.showThought('See reisija ees... ta käitub imelikult.', 'That passenger ahead... they are behaving strangely.');
                break;
            case 3:
                this.showThought('Metrookaart seinal... mis jaam see on?', 'The subway map on the wall... what station is that?');
                break;
            case 4:
                this.startLightFlickerAnomaly();
                break;
            case 5:
                this.showThought('Aknast välja vaadates... see ei ole linn.', 'Looking out the window... that is not the city.');
                break;
            case 6:
                this.showThought('Istmel on midagi. Ma peaksin seda uurima.', 'There is something on the seat. I should inspect it.');
                break;
            case 7:
                this.showThought('Tagasiteed enam ei ole. Ma pean edasi liikuma.', 'There is no way back. I must keep moving forward.');
                break;
            case 8:
                this.startDoorGlitchAnomaly();
                break;
            case 9:
                this.spawnStalkerEntity();
                this.showThought('Seal ees seisab keegi... ta lihtsalt jälgib mind.', 'Someone is standing ahead... they are just watching me.');
                break;
            case 10:
                this.startCarriage10JumpScare();
                break;

            // --- Vagunid 11–20 ---
            case 11:
                this.showThought('Kõik tundub täiesti normaalne, aga kõik AI-reisijad vaatavad korraga akna poole. 👀', 'Everything seems normal, but all AI passengers are staring out the window simultaneously. 👀');
                if (this.currentCarriage) {
                    this.currentCarriage.passengers.forEach(p => p.animType = 'look_window');
                }
                break;
            case 12:
                this.showThought('Metroo ekraan näitab peatust, mida metrookaardil ei eksisteeri.', 'The subway display shows a phantom station that does not exist on the map.');
                break;
            case 13:
                this.showThought('Vagun on peaaegu tühi ja kuskilt kostab vaikne muusika. 🎵', 'The carriage is nearly empty and faint music echoes from somewhere. 🎵');
                metroAudio.playRadioAudio();
                setTimeout(() => metroAudio.stopRadioAudio(), 7000);
                break;
            case 14:
                this.showThought('Üks AI-reisija annab sulle salapärase pileti. 🎫', 'An AI passenger reaches out and hands you a mysterious ticket. 🎫');
                break;
            case 15:
                this.showThought('Tuled kustuvad korraks ja tagasi tulles on reisijad teistes kohtades.', 'Lights extinguish for a second, and passengers are in different seats upon return.');
                this.startLightFlickerAnomaly();
                this.triggerShadowHandsEvent();
                break;
            case 16:
                this.showThought('Akna taga liigub linn ja tunnel tagurpidi!', 'Outside the window, the city and tunnel are moving backwards!');
                this.triggerReverseTunnel(6.0);
                break;
            case 17:
                this.showThought('Leiad seinalt kummalise noole, mis näitab edasi. ➡️', 'Found a strange arrow on the wall pointing forward. ➡️');
                break;
            case 18:
                this.showThought('Vagunis on kell, mis liigub liiga kiiresti. 🕒', 'The clock in the carriage is spinning unnaturally fast. 🕒');
                break;
            case 19:
                this.showThought('Kõik telefonid AI-reisijate käes hakkavad korraga helisema! 📱', 'All phones in the passengers\' hands start ringing simultaneously! 📱');
                metroAudio.playPhoneRingingAll();
                break;
            case 20:
                this.startShadowRushCarriageEvent(20);
                break;

            // --- Vagunid 21–30 ---
            case 21:
                this.showThought('Üks reisija küsib: „Kas sina tead, kus me oleme?” 🤔', 'A passenger asks: „Do you know where we are?” 🤔');
                this.triggerShadowHandsEvent();
                break;
            case 22:
                this.showThought('Vagunis olev metrookaart muutub iga kord, kui sellele otsa vaatad.', 'The subway map shifts every time you look at it.');
                break;
            case 23:
                this.showThought('Akendest on näha täiesti tundmatu, helendavate kristallidega tunnel.', 'An unfamiliar tunnel filled with glowing crystals is visible outside.');
                break;
            case 24:
                this.showThought('Tuled hakkavad liikuma nagu valguslaine läbi vaguni. 💡', 'Lights ripple like a wave of illumination through the carriage. 💡');
                break;
            case 25:
                this.showThought('Leiad vana metroopileti, millel on kummaline kuupäev (14.10.1987).', 'Found an old subway ticket with a strange date (14.10.1987).');
                this.startShadowRushCarriageEvent(25);
                break;
            case 26:
                this.showThought('Vagunis on ainult üks reisija, kuid järgmises vagunis teda enam ei ole.', 'Only one passenger is here, but in the next carriage they are gone.');
                break;
            case 27:
                this.showThought('Kõlaritest tuleb katkine, ragisev metrooteade.', 'A broken, crackling announcement comes over the speakers.');
                break;
            case 28:
                this.showThought('Üks uks ei avane, enne kui mängija leiab vagunist vihje. 🧩 (Uuri sedelit istme all)', 'The door will not open until you find the clue in the carriage. 🧩 (Inspect note under seat)');
                break;
            case 29:
                this.showThought('Akna peegelduses on hetkeks näha midagi, mida vagunis tegelikult ei ole.', 'In the window reflection, something appears that is not in the carriage.');
                break;
            case 30:
                this.showThought('Mängija jõuab väga pika vagunini, mis tundub tavalisest palju suurem. 🚇', 'You reach a massive extended carriage that feels much larger than usual. 🚇');
                this.triggerShadowHandsEvent();
                break;

            // --- Vagunid 31–40 ---
            case 31:
                this.showThought('Vagunis on kõik istmed vales suunas risti vahekäiguga.', 'All seats in the carriage are turned perpendicular in the wrong direction.');
                break;
            case 32:
                this.showThought('Mängija leiab väikese kaardi, kus on märgitud vagun number 50. 🗺️', 'You find a small pocket map with Carriage number 50 circled. 🗺️');
                this.startShadowRushCarriageEvent(32);
                this.triggerShadowHandsEvent();
                break;
            case 33:
                this.showThought('Metroo hakkab korraks sõitma väga aeglaselt... ja kiirendab siis uuesti.', 'The subway slows down to a crawl... then accelerates again.');
                break;
            case 34:
                this.showThought('Kõik AI-reisijad on kadunud ja vagun on täiesti tühi.', 'All AI passengers have vanished and the carriage is completely empty.');
                break;
            case 35:
                this.showThought('Tuled vilguvad ja üks reisija ilmub korraks vaguni teise otsa.', 'Lights flicker and a mysterious figure appears briefly at the far end.');
                this.startLightFlickerAnomaly();
                break;
            case 36:
                this.showThought('Vagunis on vana ekraan, mis näitab mängija läbitud vagunite numbreid: 36.', 'An old CRT screen displays the count of explored carriages: 36.');
                break;
            case 37:
                this.showThought('Kõlaritest kostab mängija jaoks tundmatu salapärane teade.', 'An unknown, mysterious chime announcement plays from the speakers.');
                break;
            case 38:
                this.showThought('Uks avaneb ja järgmine vagun tundub esialgu täiesti pime. (Kasuta taskulampi või ööprille!)', 'Door opens and the carriage is pitch black. (Use flashlight or night vision!)');
                break;
            case 39:
                this.showThought('Mängija leiab uue vihje metroo salajase ehituse kohta.', 'You find a new classified document about the subway\'s secret construction.');
                break;
            case 40:
                this.showThought('Kõik muutub korraks täiesti normaalseks, nagu mängu alguses.', 'Everything turns completely calm and normal for a moment, just like the beginning.');
                this.triggerShadowHandsEvent();
                break;

            // --- Vagunid 41–50 ---
            case 41:
                this.showThought('Vagunis on jälle palju reisijaid, kuid keegi ei räägi ega liiguta.', 'Many passengers sit here again, but nobody speaks or moves.');
                break;
            case 42:
                this.showThought('Üks reisija jätab maha salapärase koti, mille sees on vihje. 🎒', 'A passenger left behind a mysterious bag containing a clue. 🎒');
                break;
            case 43:
                this.showThought('Metroo kaart näitab, et rong on jõudnud oma viimasesse peatusesse — kuid rong sõidab edasi!', 'The subway map shows the final stop has arrived — yet the train speeds on!');
                break;
            case 44:
                this.showThought('Akna taga on korraks näha sama jaama, kust mäng algas kell 23:45!', 'Outside the window, the exact central station from 23:45 flashes past!');
                break;
            case 45:
                this.showThought('Mängija leiab ukse, millel on number 0. Kas me alustasime uuesti?', 'Found a bulkhead plaque with number 0. Have we restarted?');
                break;
            case 46:
                this.showThought('Vagunis on mitu kella ja kõik näitavad täiesti erinevat aega. 🕰️', 'There are several clocks in the carriage and each shows a different time. 🕰️');
                break;
            case 47:
                this.showThought('Kõlaritest kostab sosin, mis ütleb ainult ühe sõna: „Edasi…” 🔈', 'A whisper resonates over the intercom saying just one word: „Forward...” 🔈');
                metroAudio.playWhisper(3.0);
                break;
            case 48:
                this.showThought('Vagunis on sein, millel on kriipsud nagu keegi oleks lugenud läbitud vaguneid.', 'Tally marks are scratched on the wall as if counting passing carriages.');
                this.startShadowRushCarriageEvent(48);
                break;
            case 49:
                this.showThought('Tuled vilguvad ja mängija näeb korraks sama läbipaistvat jälitajat vaguni lõpus.', 'Lights flicker and the translucent shadow stalker glimpses at the far end.');
                this.startLightFlickerAnomaly();
                break;
            case 50:
                this.showThought('⭐ SUUR ERILINE VAGUN 50! Leidsid suure vihje selle kohta, miks metroo lõputult sõidab!', '⭐ MAJOR CARRIAGE 50! Found the classified blueprint revealing why the subway runs forever!');
                this.startShadowRushCarriageEvent(50);
                break;

            // --- Vagunid 51–60 ---
            case 51:
                this.showThought('Vagun on täiesti tühi, kuid kõlaritest kostab tavaline metrooteade.', 'Carriage is completely empty, yet a routine transit announcement plays.');
                break;
            case 52:
                this.showThought('Üks AI-reisija küsib: „Mitmendas vagunis sa oled?” 👀', 'An AI passenger asks: „What carriage are you in?” 👀');
                break;
            case 53:
                this.showThought('Metrookaardil on kõik peatused kadunud — jäänud on tühi joon.', 'All stations on the transit map have disappeared — leaving a blank line.');
                this.triggerShadowHandsEvent();
                break;
            case 54:
                this.showThought('Akna taga on väga pikk must tunnel, mille lõppu ei ole näha.', 'Outside is a vast dark tunnel with no visible end.');
                break;
            case 55:
                this.showThought('Mängija leiab vana kuldse pileti, millel on number 100. 🎫', 'Found an antique golden ticket stamped with number 100. 🎫');
                break;
            case 56:
                this.showThought('Kõik vaguni istmed on teises suunas kui tavaliselt.', 'All seats are positioned in reverse against the train motion.');
                break;
            case 57:
                this.showThought('Üks reisija seisab ukse juures ja kaob, kui mängija lähemale jõuab!', 'A passenger stands by the door and vanishes as you approach!');
                this.startShadowRushCarriageEvent(57);
                break;
            case 58:
                this.showThought('Metroo ekraan näitab korraks punaselt: „ÄRA PÖÖRDU TAGASI.” 🚫', 'Subway display flashes crimson: „DO NOT TURN BACK.” 🚫');
                break;
            case 59:
                this.showThought('Vagun on täiesti normaalne ja midagi kummalist ei juhtu.', 'Carriage is peaceful and normal with nothing strange occurring.');
                break;
            case 60:
                this.showThought('Tuled lähevad hetkeks välja ning tagasi tulles on vagun täiesti tühi.', 'Lights turn off for a moment, and returning, the carriage is completely empty.');
                this.startLightFlickerAnomaly();
                this.triggerShadowHandsEvent();
                break;

            // --- Vagunid 61–70 ---
            case 61:
                this.showThought('Mängija kuuleb oma samme, kuid tundub, nagu kostaks veel üks sammude heli. 👣', 'You hear your own footsteps, but an extra pair of steps seems to echo behind you. 👣');
                break;
            case 62:
                this.showThought('Akna peegelduses on näha tundmatu tume kuju.', 'A dark unfamiliar figure is seen in the window reflection.');
                break;
            case 63:
                this.showThought('🗝️ AI-reisija annab sulle VÕTME! Klõpsa ekraani all olevale võtmeikoonile, et see kätte võtta nagu Robloxsis!', '🗝️ AI passenger hands you a KEY! Click the key icon on the hotbar below to equip it like in Roblox!');
                this.unlockItem('key');
                this.startShadowRushCarriageEvent(63);
                break;
            case 64:
                this.showThought('Järgmise vaguni uks on lukus ja võti aitab selle avada! (Võta võti kätte)', 'The next carriage door is locked! Equip the key from hotbar to open it!');
                break;
            case 65:
                this.showThought('Vagunis on vana metrookaamera monitor, mis näitab mängija eelmist vagunit 64.', 'An old CCTV monitor on the wall shows a security feed of Carriage 64.');
                break;
            case 66:
                this.showThought('Mängija näeb ekraanilt, et keegi liigub tema selja taga, kuid vagun on tühi!', 'On screen, someone is walking right behind you, yet the carriage is empty!');
                break;
            case 67:
                this.showThought('Metroo heli muutub korraks täiesti vaikseks.', 'The subway audio goes into complete silence for a few seconds.');
                this.triggerSoundCutout(3.5);
                break;
            case 68:
                this.showThought('Kõik tuled muutuvad hetkeks väga nõrgaks ja siis taastuvad.', 'All lights dim to a faint glow and then restore.');
                break;
            case 69:
                this.showThought('Leiad seinalt kirjutatud sõnumi: „Sa ei ole esimene.”', 'Found a scratched message on the bulkhead: „You are not the first.”');
                break;
            case 70:
                this.showThought('⭐ SUUR VIHJE-VAGUN 70! Leidsid märkmiku, mis räägib inimesest, kes oli kunagi samas metroos.', '⭐ MAJOR CLUE CARRIAGE 70! Found the journal of an explorer who was trapped in this subway.');
                this.startShadowRushCarriageEvent(70);
                this.triggerShadowHandsEvent();
                break;

            // --- Vagunid 71–80 ---
            case 71:
                this.showThought('Vagun tundub täiesti normaalne, kuid kellad ei liigu.', 'Carriage feels normal, but all clocks have frozen.');
                break;
            case 72:
                this.showThought('Üks AI-reisija istub ja joonistab metrood, millel on lõpmatult vaguneid. ✏️', 'An AI passenger sits sketching an infinite subway train into a notebook. ✏️');
                break;
            case 73:
                this.showThought('Metroo ekraan näitab: „JÄRGMINE PEATUS: ???”', 'The subway display shows: „NEXT STOP: ???”');
                break;
            case 74:
                this.showThought('Akna taga on korraks näha mahajäetud 1980ndate metroojaama.', 'An abandoned 1980s station platform flashes past outside the window.');
                break;
            case 75:
                this.showThought('Vagunis olevad tuled hakkavad järjest ükshaaval kustuma.', 'Lights in the carriage begin turning off one by one in sequence.');
                this.startShadowRushCarriageEvent(75);
                break;
            case 76:
                this.showThought('Kõik istmed on tühjad, kuid õhus kajab selgelt reisijate juttu.', 'Seats are empty, yet distant crowd conversations echo clearly.');
                break;
            case 77:
                this.showThought('Üks uks avaneb, kuid selle taga ei ole järgmine vagun — ainult tundmatu pime ruum.', 'Door opens into a dark observation chamber instead of a normal carriage.');
                break;
            case 78:
                this.showThought('Mängija peab leidma vihje, et õige ukse kaudu edasi minna. 🧩', 'You must inspect the clue on the bulkhead to unlock the right path. 🧩');
                break;
            case 79:
                this.showThought('Õige ukse leidmisel on järgmine vagun meeldivalt rahulik ja tavaline.', 'Having solved the door puzzle, this carriage is calm, clean and normal.');
                break;
            case 80:
                this.showThought('⭐ VAGUN 80! Leidsid suure metrookaardi, millel on sinu asukoht: VAGUN 80. (Kuldne Pood läheneb!)', '⭐ CARRIAGE 80! Found the master transit map showing: Currently at Carriage 80. (Golden Shop approaches!)');
                break;

            // --- Vagunid 81–90 ---
            case 81:
                this.showThought('Mängija leiab taas ühe vana pileti, kuid sellel on tema enda vaguninumber: 81.', 'Found an old ticket printed with your exact carriage number: 81.');
                break;
            case 82:
                this.showThought('Kõlaritest tuleb teade, mis tundub olevat mõeldud just sinule: „Reisija... oled peagi kohal.”', 'An announcement speaks directly to you: „Passenger... you are nearly there.”');
                this.startShadowRushCarriageEvent(82);
                break;
            case 83:
                this.showThought('AI-reisijad vaatavad korraga kõik ühes suunas minu poole.', 'All AI passengers turn their heads in unison towards you.');
                break;
            case 84:
                this.showThought('Mängija kuuleb kaugelt metrooukse avanemise kaja.', 'You hear the pneumatic hiss of a distant subway door opening.');
                break;
            case 85:
                this.showThought('Vagunis on üks vana LED-ekraan, mis näitab numbreid 1–100.', 'An old LED board displays numbers 1 to 100.');
                break;
            case 86:
                this.showThought('Number 86 on ekraanil eraldi ereda kullaga märgitud!', 'Number 86 is highlighted in bright gold on the display!');
                break;
            case 87:
                this.showThought('Mängija leiab konduktori kuldse kaardi, mis aitab Vagun 100 poodi avada. 💳', 'Found the conductor\'s golden card for the Carriage 100 shop. 💳');
                break;
            case 88:
                this.showThought('Akna taga liigub metroo kõrval korraks teine täpselt samasugune rong! 🚇', 'Outside the right window, an identical parallel subway train speeds alongside! 🚇');
                this.triggerShadowHandsEvent();
                break;
            case 89:
                this.showThought('Teises rongis olevad reisijad vaatavad aknast otse sinu poole.', 'Passengers in the parallel train are staring through the glass right at you.');
                break;
            case 90:
                this.showThought('⭐ Mõlemad rongid lähevad eri suundades ja teine rong kaob tunnelisse.', '⭐ The trains diverge and the parallel train disappears into the dark tunnel.');
                this.startShadowRushCarriageEvent(90);
                this.triggerShadowHandsEvent();
                break;

            // --- Vagunid 91–100 ---
            case 91:
                this.showThought('Mängija jõuab vagunisse, mis näeb välja täpselt nagu mängu alguse vagun 0.', 'You arrive at a carriage that looks identical to the very starting carriage 0.');
                break;
            case 92:
                this.showThought('Seal istub üks AI-reisija, keda mängija nägi mängu alguses jaamas.', 'The very same AI passenger from the station intro sits right there.');
                break;
            case 93:
                this.showThought('Reisija ütleb salapäraselt: „Sa oled juba väga kaugel.”', 'The passenger speaks mysteriously: „You have come very far.”');
                break;
            case 94:
                this.showThought('Metrookaardil ei ole enam ühtegi normaalset peatust — ainult kummalised märgid.', 'All normal stations are gone from the map — replaced by glowing glyphs.');
                break;
            case 95:
                this.showThought('Mängija leiab ukse numbriga 100.', 'You find a heavy door embossed with number 100.');
                break;
            case 96:
                this.showThought('Enne seda ust hakkavad tuled aeglaselt ja soojalt vilkuma.', 'Before the door, lights begin to pulse slowly with a warm golden hue.');
                break;
            case 97:
                this.showThought('Metrooheli muutub järjest vaiksemaks ja rahulikumaks.', 'The subway running sound softens into a calm, gentle hum.');
                this.startShadowRushCarriageEvent(97);
                break;
            case 98:
                this.showThought('Kõlaritest kostab vana pühalik metrooteade: „Saabume Vagunisse 100.”', 'A solemn announcement chimes: „Arriving at Carriage 100 — The Golden Terminal.”');
                this.triggerShadowHandsEvent();
                break;
            case 99:
                this.showThought('Uks avaneb ja ees särab helge, soe ja kuldne valgus!', 'The door slides open revealing radiant, warm golden light ahead!');
                break;
            case 100:
                this.showThought(
                    '🌟 SUUR CHECKPOINT-VAGUN 100 — KULDNE POOD! Checkpoint salvestatud. Astu leti juurde ja osta varustust!',
                    '🌟 GRAND CHECKPOINT CARRIAGE 100 — GOLDEN SHOP! Progress saved. Step up to the counter and purchase gear!'
                );
                this.openGoldenShopModal();
                break;

            default:
                if (index >= 101) {
                    this.showThought(
                        `Vagun ${index}. Teekond jätkub lõputusse metroosse... (Kogutud: 🪙 ${this.coins} Coini)`,
                        `Carriage ${index}. The journey continues into the endless subway... (Total: 🪙 ${this.coins} Coins)`
                    );
                }
                break;
        }
    }

    // --- Anomaly Mechanics ---

    private startLightFlickerAnomaly() {
        if (!this.currentCarriage) return;
        let count = 0;
        const interval = setInterval(() => {
            if (!this.currentCarriage) { clearInterval(interval); return; }
            count++;
            const isOn = count % 2 === 0;
            this.currentCarriage.lights.forEach(l => l.intensity = isOn ? 0.9 : 0.05);
            this.currentCarriage.lightMeshes.forEach(m => (m.material as THREE.MeshBasicMaterial).color.setHex(isOn ? 0xffffff : 0x222222));
            metroAudio.playFlickerBuzz();

            if (count > 12) {
                clearInterval(interval);
                this.currentCarriage.lights.forEach(l => l.intensity = 0.85);
                this.currentCarriage.lightMeshes.forEach(m => (m.material as THREE.MeshBasicMaterial).color.setHex(0xffffff));
            }
        }, 180);
    }

    public isShadowEventActive(): boolean {
        return this.shadowRushActive || this.shadowRushCountdown > 0 || this.shadowEntityMesh !== null;
    }

    public startShadowRushCarriageEvent(index: number = this.currentCarIndex) {
        this.carriage20EventTriggered = true;
        this.shadowRushActive = false;
        this.shadowRushCountdown = 5.0;

        // 1. Violent light flickering with emergency dim red/white pulses
        this.startLightFlickerAnomaly();

        // 2. Train screeching brakes audio (rongi pidurduse hääl)
        metroAudio.playTrainBrakesScreech(5.0);

        // 3. Eerie creepy escalating sound for 5 seconds (imelik hääl kestab 5 sek)
        metroAudio.playCreepyDrone5s();

        // 4. Train speed rapidly decelerates with heavy vibrations
        this.trainSpeed = 20;

        // 5. Urgent warning thought / HUD notification
        this.showThought(
            `⚠️ RONG PIDURDAB! (Vagun ${index}) Kuskilt kostub hirmus kisa... ISTU KIIRESTI TOOLILE! (Vajuta [E] või klõpsa istmele)`,
            `⚠️ TRAIN BRAKING! (Carriage ${index}) A terrifying shriek echoes... SIT DOWN QUICKLY! (Press [E] or click a seat)`,
            5000
        );

        // After 5 seconds: Spawn the Shadow Creature (Must Olend) and dash through the carriage!
        const triggerCar = this.currentCarIndex;
        setTimeout(() => {
            if (this.currentCarIndex === triggerCar && this.state !== 'game_over' && this.state !== 'dead') {
                this.spawnAndRushShadowCreature();
            }
        }, 5000);
    }

    public startCarriage20ShadowRushEvent() {
        this.startShadowRushCarriageEvent(20);
    }

    public spawnAndRushShadowCreature() {
        if (this.shadowEntityMesh) {
            this.scene.remove(this.shadowEntityMesh);
            this.shadowEntityMesh = null;
        }

        const group = new THREE.Group();
        group.name = 'shadow_creature_entity';

        const shadowMat = new THREE.MeshStandardMaterial({
            color: 0x050505,
            roughness: 0.9,
            metalness: 0.1,
            emissive: 0x1a0000,
            emissiveIntensity: 0.8
        });

        const smokeMat = new THREE.MeshBasicMaterial({
            color: 0x020202,
            transparent: true,
            opacity: 0.85
        });

        const eyeGlowMat = new THREE.MeshBasicMaterial({
            color: 0xff0000
        });

        // 1. Dark Smoky Torso & Shadow Mass
        const mainBody = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), shadowMat);
        mainBody.scale.set(1.1, 1.6, 1.4);
        mainBody.position.set(0, 1.4, 0);
        group.add(mainBody);

        // Surrounding Shadow Smoke Volumes
        for (let i = 0; i < 8; i++) {
            const smokeBall = new THREE.Mesh(new THREE.SphereGeometry(0.35 + Math.random() * 0.25, 8, 8), smokeMat);
            smokeBall.position.set((Math.random() - 0.5) * 0.8, 1.2 + (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 1.2);
            group.add(smokeBall);
        }

        // 2. Piercing Glowing Crimson Eyes
        [-0.18, 0.18].forEach(ex => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), eyeGlowMat);
            eye.position.set(ex, 1.65, 0.45);
            group.add(eye);

            const eyeTrail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.35), eyeGlowMat);
            eyeTrail.position.set(ex, 1.65, 0.2);
            group.add(eyeTrail);
        });

        // 3. Shadow Claws / Tendrils reaching outward
        [-0.55, 0.55].forEach(cx => {
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 1.2, 8), shadowMat);
            arm.rotation.z = cx > 0 ? -Math.PI / 3 : Math.PI / 3;
            arm.rotation.x = Math.PI / 4;
            arm.position.set(cx, 1.3, 0.3);
            group.add(arm);

            // Claws
            [-0.06, 0, 0.06].forEach(fingerZ => {
                const claw = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.3, 6), shadowMat);
                claw.rotation.x = Math.PI / 2;
                claw.position.set(cx > 0 ? cx + 0.5 : cx - 0.5, 0.9, 0.7 + fingerZ);
                group.add(claw);
            });
        });

        // Rush slower through the carriage so the player can see the horrifying shadowy entity approaching
        const startZ = this.playerPos.z < 0 ? 9.5 : -9.5;
        this.shadowRushSpeed = startZ > 0 ? -7.0 : 7.0;

        group.position.set(0, 0, startZ);
        group.rotation.y = this.shadowRushSpeed < 0 ? Math.PI : 0;

        this.shadowEntityMesh = group;
        this.scene.add(this.shadowEntityMesh);
        this.shadowRushActive = true;

        // Play terrifying monster roar, dark wind storm AND horrifying horror song / music
        metroAudio.playShadowRushScreech();
        metroAudio.playHorrorShadowSong();

        this.showThought(
            '😱 MUST OLEND LIIGUB AEGLASELT MÖÖDA VAGUNIT! ISTU TOOLIL, ET ELLU JÄÄDA!',
            '😱 SHADOW CREATURE IS CREEPING DOWN THE AISLE! STAY SEATED TO SURVIVE!',
            3500
        );
    }

    private startDoorGlitchAnomaly() {
        setTimeout(() => {
            metroAudio.playDoorSlide(true);
            metroAudio.playWhisper(3.0);
            this.showThought('Uks avanes iseenesest! Mis väljas liigub?!', 'The door opened on its own! What is moving out there?!');
            setTimeout(() => {
                metroAudio.playDoorSlide(false);
            }, 3000);
        }, 2500);
    }

    private spawnStalkerEntity() {
        if (this.stalkerMesh) this.scene.remove(this.stalkerMesh);

        const stalker = new THREE.Group();
        const stalkerMat = new THREE.MeshPhysicalMaterial({
            color: 0x00f2fe,
            transparent: true,
            opacity: 0.55,
            roughness: 0.1,
            transmission: 0.6
        });

        // Slender shadowy figure
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.8), stalkerMat);
        body.position.set(0, 0.9, 0);
        stalker.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), stalkerMat);
        head.position.set(0, 1.9, 0);
        stalker.add(head);

        // Glowing white eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        [-0.05, 0.05].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), eyeMat);
            eye.position.set(x, 1.92, -0.15);
            stalker.add(eye);
        });

        stalker.position.set(0, 0, 8.5);
        this.scene.add(stalker);
        this.stalkerMesh = stalker;
        this.stalkerActive = true;
        this.stalkerDistZ = 8.5;
    }

    // --- Ultra-Realistic Shadow Hand Void Emergence (Mustad Käed) ---

    public createShadowHandMesh(side: number, zOffset: number = 0): THREE.Group {
        const handGroup = new THREE.Group();

        const armSkinMat = new THREE.MeshStandardMaterial({
            color: 0x030406,
            roughness: 0.85,
            metalness: 0.35
        });
        const jointMat = new THREE.MeshStandardMaterial({
            color: 0x08090d,
            roughness: 0.7,
            metalness: 0.5
        });
        const clawMat = new THREE.MeshStandardMaterial({
            color: 0x14041b,
            roughness: 0.25,
            metalness: 0.75
        });
        const veinMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });

        // 1. Shoulder Socket & Upper Arm
        const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), jointMat);
        shoulder.position.set(0, 0, 0);
        handGroup.add(shoulder);

        const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.75, 10), armSkinMat);
        upperArm.rotation.z = side > 0 ? -Math.PI / 2.8 : Math.PI / 2.8;
        upperArm.position.set(-side * 0.35, 0.05, 0);
        handGroup.add(upperArm);

        // 2. Elbow Joint
        const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 10), jointMat);
        elbow.position.set(-side * 0.7, 0.1, 0);
        handGroup.add(elbow);

        // 3. Forearm (reaching inward towards center of aisle)
        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.095, 0.85, 10), armSkinMat);
        forearm.rotation.z = side > 0 ? -Math.PI / 2.3 : Math.PI / 2.3;
        forearm.position.set(-side * 1.1, 0.12, 0);
        handGroup.add(forearm);

        // Pulsating vein ridges on forearm
        [-0.03, 0.03].forEach(vOffset => {
            const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 6), veinMat);
            vein.rotation.z = side > 0 ? -Math.PI / 2.3 : Math.PI / 2.3;
            vein.position.set(-side * 1.1, 0.12 + vOffset, vOffset);
            handGroup.add(vein);
        });

        // 4. Wrist & Anatomical Palm
        const wrist = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), jointMat);
        wrist.position.set(-side * 1.5, 0.14, 0);
        handGroup.add(wrist);

        const palm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.28), armSkinMat);
        palm.position.set(-side * 1.62, 0.14, 0);
        handGroup.add(palm);

        // 5. Five Articulated Fingers (Thumb, Index, Middle, Ring, Pinky)
        const fingerOffsets = [
            { z: -0.11, len: 0.26, scale: 0.9, isThumb: true },
            { z: -0.06, len: 0.38, scale: 1.0, isThumb: false },
            { z: -0.00, len: 0.44, scale: 1.1, isThumb: false },
            { z: 0.06, len: 0.38, scale: 1.0, isThumb: false },
            { z: 0.11, len: 0.28, scale: 0.85, isThumb: false }
        ];

        fingerOffsets.forEach((f) => {
            const fingerGroup = new THREE.Group();
            fingerGroup.name = 'finger';

            // Proximal Phalanx
            const pPhalanx = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * f.scale, 0.024 * f.scale, f.len * 0.5, 6), armSkinMat);
            pPhalanx.rotation.z = side > 0 ? -Math.PI / 3 : Math.PI / 3;
            pPhalanx.position.set(-side * (f.len * 0.2), 0, 0);
            fingerGroup.add(pPhalanx);

            // Knuckle Joint
            const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.022 * f.scale, 6, 6), jointMat);
            knuckle.position.set(-side * (f.len * 0.45), 0, 0);
            fingerGroup.add(knuckle);

            // Distal Phalanx & Curved Razor Claw
            const dPhalanx = new THREE.Mesh(new THREE.CylinderGeometry(0.012 * f.scale, 0.018 * f.scale, f.len * 0.45, 6), armSkinMat);
            dPhalanx.rotation.z = side > 0 ? -Math.PI / 2.4 : Math.PI / 2.4;
            dPhalanx.position.set(-side * (f.len * 0.65), -0.02, 0);
            fingerGroup.add(dPhalanx);

            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.025 * f.scale, 0.22 * f.scale, 6), clawMat);
            claw.rotation.z = side > 0 ? -Math.PI / 1.8 : Math.PI / 1.8;
            claw.position.set(-side * (f.len * 0.9), -0.05, 0);
            fingerGroup.add(claw);

            // Glowing claw tip
            const tipGlow = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), veinMat);
            tipGlow.position.set(-side * (f.len * 1.0), -0.06, 0);
            fingerGroup.add(tipGlow);

            fingerGroup.position.set(-side * 1.68, 0.14, f.z);
            handGroup.add(fingerGroup);
        });

        // 6. Eerie Red/Purple Volumetric Point Light from Palm
        const palmLight = new THREE.PointLight(0xff1744, 2.5, 4.5);
        palmLight.position.set(-side * 1.55, 0.2, 0);
        handGroup.add(palmLight);

        // Position hand right inside the doorway at x = side * 1.68, y = 1.35, z = zOffset
        handGroup.position.set(side * 1.68, 1.35, zOffset);
        return handGroup;
    }

    public triggerShadowHandsEvent() {
        if (this.shadowHandsActive) return;
        this.shadowHandsActive = true;
        this.shadowHandsTimer = 10.0; // Stays active for exactly 10s then disappears (kui käsi tuleb on se 10 sek siis läheb ära)

        // Doors vanish completely (uksi pole näha!)
        this.sideDoorMeshes.forEach(d => d.mesh.visible = false);

        // Play scary audio
        metroAudio.playDoorSlide(true);
        metroAudio.playShadowGrab();

        // Flickering red lights in carriage
        if (this.currentCarriage) {
            this.currentCarriage.lights.forEach(l => {
                l.color.setHex(0xff1744);
                l.intensity = 1.4;
            });
        }

        // Exactly 1 hand from 1 side only (ainult 1 pool tuleb käsi)
        const activeSide = 1; // Reaching from right doorway
        const hand = this.createShadowHandMesh(activeSide, 0);
        this.scene.add(hand);
        this.shadowHandsGroups.push(hand);

        this.showThought(
            'Uksed kadusid ära... Tühjusest sirutub välja must varjukäsi! Pea 10 sekundit vastu ja ära puuduta seda!',
            'The doors vanished into the void... A black shadow hand is reaching in! Survive for 10 seconds and do not touch it!'
        );
    }

    public dismissShadowHands() {
        if (!this.shadowHandsActive) return;
        this.shadowHandsActive = false;

        // Remove shadow hand meshes from scene
        this.shadowHandsGroups.forEach(hand => this.scene.remove(hand));
        this.shadowHandsGroups = [];

        // Restore sliding side doors
        this.sideDoorMeshes.forEach(d => d.mesh.visible = true);

        // Restore carriage lighting back to normal
        if (this.currentCarriage) {
            this.currentCarriage.lights.forEach(l => {
                l.color.setHex(this.currentCarriage!.theme === 'dark' ? 0xff4757 : 0xffffff);
                l.intensity = 0.85;
            });
        }

        // Play door closing sound & victory thought
        metroAudio.playDoorSlide(false);
        this.showThought(
            'Must varjukäsi tõmbus tagasi tühjusesse ja uksed taastusid... Oht on möödas!',
            'The shadow hand retreated back into the void and the doors restored... The danger has passed!'
        );
    }

    public triggerDraggedDeath(side: number) {
        if (this.state === 'dragged_death' || this.state === 'dead') return;
        this.state = 'dragged_death';
        this.deathDragSide = side;
        this.deathTimer = 0;

        // Horror Audio
        metroAudio.playShadowGrab();
        metroAudio.playDeathScream();

        // Red flash
        const flashOverlay = document.getElementById('scare-flash-overlay');
        if (flashOverlay) {
            flashOverlay.style.display = 'block';
            flashOverlay.style.opacity = '0.9';
            setTimeout(() => {
                flashOverlay.style.opacity = '0';
                setTimeout(() => flashOverlay.style.display = 'none', 600);
            }, 300);
        }

        this.showThought('Mind tõmmatakse rongist välja...!', 'I am being dragged out of the train...!');
    }

    public openDeathModal() {
        this.state = 'dead';
        const modal = document.getElementById('death-modal');
        const title = document.getElementById('death-title');
        const desc = document.getElementById('death-desc');
        const flashOverlay = document.getElementById('scare-flash-overlay');
        if (flashOverlay) flashOverlay.style.display = 'none';

        if (modal && title && desc) {
            title.innerText = this.lang === 'et' ? 'SA SURID' : 'YOU DIED';
            desc.innerText = this.lang === 'et'
                ? 'Must varjukäsi haaras sinust ja tõmbas su kihutavast rongist tühjusesse...'
                : 'The dark shadow hand grabbed you and dragged you from the speeding train into the void...';
            modal.style.display = 'flex';
        }
        this.updateCursorState();
    }

    public respawnFromDeath() {
        const modal = document.getElementById('death-modal');
        if (modal) modal.style.display = 'none';

        // Replay full cinematic intro sequence from the beginning (kui panen retry siis peab ka intro tulema)
        this.replayIntro();
        this.updateCursorState();
    }

    private startCarriage10JumpScare() {
        setTimeout(() => {
            // Cut lights
            if (this.currentCarriage) {
                this.currentCarriage.lights.forEach(l => l.intensity = 0);
                this.currentCarriage.lightMeshes.forEach(m => (m.material as THREE.MeshBasicMaterial).color.setHex(0x111111));
            }

            // Spawn horror glitch creature right in front of camera
            const scareGroup = new THREE.Group();
            const horrorMat = new THREE.MeshBasicMaterial({ color: 0xff4757, wireframe: true });
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), horrorMat);
            head.position.set(0, 1.6, -1.2);
            scareGroup.add(head);
            this.camera.add(scareGroup);
            this.jumpScareMesh = scareGroup;
            this.jumpScareActive = true;

            // Screamer stinger audio
            metroAudio.playJumpScareStinger();

            // Flash effect on screen
            const flashOverlay = document.getElementById('scare-flash-overlay');
            if (flashOverlay) {
                flashOverlay.style.display = 'block';
                flashOverlay.style.opacity = '1';
                setTimeout(() => {
                    flashOverlay.style.opacity = '0';
                    setTimeout(() => flashOverlay.style.display = 'none', 500);
                }, 200);
            }

            // Clean up jumpscare after 1.5 seconds and restore normal lights
            setTimeout(() => {
                if (this.jumpScareMesh) {
                    this.camera.remove(this.jumpScareMesh);
                    this.jumpScareMesh = null;
                }
                this.jumpScareActive = false;
                if (this.currentCarriage) {
                    this.currentCarriage.lights.forEach(l => l.intensity = 0.85);
                    this.currentCarriage.lightMeshes.forEach(m => (m.material as THREE.MeshBasicMaterial).color.setHex(0xffffff));
                }
                this.showThought('Mis see oli...? Rong sõidab ikka edasi.', 'What on earth was that...? The train keeps moving forward.');
            }, 1400);
        }, 3500);
    }

    // --- Intro Sequence Flow ---

    public startIntroSequence() {
        // Clear previous intro timeouts
        this.introTimeouts.forEach(t => clearTimeout(t));
        this.introTimeouts = [];

        // Reset all coins, inventory items, buffs & progress when returning to the beginning
        this.coins = 0;
        this.inventory = {};
        this.equippedItem = null;
        if (this.heldItemMesh) {
            this.camera.remove(this.heldItemMesh);
            this.heldItemMesh = null;
        }
        this.updateHotbarUI();
        this.updateCoinsUI();

        const nvOverlay = document.getElementById('night-vision-overlay');
        if (nvOverlay) nvOverlay.style.display = 'none';
        this.nightVisionActive = false;
        this.speedBoostActive = false;
        this.clueDetectorActive = false;

        this.hasUnlockedCarriage28WithClue = false;
        this.hasUnlockedCarriage64WithKey = false;
        this.hasUnlockedCarriage78WithHint = false;
        this.cluesFound = 0;

        try {
            localStorage.removeItem('last_metro_save');
        } catch (e) {}

        this.currentCarIndex = 0;
        this.loadCarriage(0, 'undecided');
        this.state = 'intro_station';
        this.cutsceneTimer = 0;
        this.trainSpeed = 0;
        this.introSideDoorsOpen = false;

        // Position train deep in dark tunnel initially
        if (this.currentCarriage) {
            this.currentCarriage.group.position.set(0, 0, -65);
        }
        // Position platform at track level
        this.stationPlatformGroup.position.set(0, 0, 0);

        // Camera starts outside on station platform looking across the bright station towards approaching train track
        this.playerPos.set(2.8, 1.6, -1.0);
        this.cameraEuler.set(0, -Math.PI / 2.1, 0);

        // Show cinematic letterbox and intro location badge
        const cTop = document.getElementById('cinema-top');
        const cBottom = document.getElementById('cinema-bottom');
        const locCard = document.getElementById('intro-location-card');
        const skipBtn = document.getElementById('btn-skip-intro');
        const standBtn = document.getElementById('btn-stand-up');

        if (cTop) cTop.classList.remove('cinematic-hidden');
        if (cBottom) cBottom.classList.remove('cinematic-hidden');
        if (locCard) {
            locCard.style.display = 'block';
            locCard.style.opacity = '1';
        }
        if (skipBtn) skipBtn.style.display = 'block';
        if (standBtn) standBtn.style.display = 'none';

        this.showThought(
            'Ootan viimast metrood. Kell on hilja ja jaam on peaaegu tühi.',
            'Waiting for the last metro. It is late and the station is nearly empty.',
            4000
        );

        // t = 1.2s: Distant subway train approaches with announcement chime
        this.introTimeouts.push(setTimeout(() => {
            metroAudio.playAnnouncementChime();
        }, 1200));

        // t = 4.2s: Train arrives and stops at platform! Doors chime and slide open
        this.introTimeouts.push(setTimeout(() => {
            if (this.currentCarriage) this.currentCarriage.group.position.z = 0;
            metroAudio.playDoorChime();
            setTimeout(() => {
                metroAudio.playDoorSlide(true);
                this.introSideDoorsOpen = true;
                this.state = 'intro_boarding';
                this.showThought(
                    'Metroorong saabus. Astun rongi ja otsin vaba istme.',
                    'The subway train arrived. I step aboard and look for a free seat.',
                    3500
                );
            }, 600);
        }, 4200));

        // t = 7.5s: Player walks into train and sits down on seat
        this.introTimeouts.push(setTimeout(() => {
            this.state = 'intro_riding';
            metroAudio.playFootstep();
            this.playerPos.set(1.1, 0.95, -1);
            this.cameraEuler.set(0, -Math.PI / 2, 0);

            // Hide location badge
            if (locCard) locCard.style.opacity = '0';
        }, 7500));

        // t = 9.8s: Side doors close and train departs into dark tunnel
        this.introTimeouts.push(setTimeout(() => {
            metroAudio.playDoorChime();
            setTimeout(() => {
                metroAudio.playDoorSlide(false);
                this.introSideDoorsOpen = false;
                this.trainSpeed = 50;
                metroAudio.setSpeedAudio(0.85);
                this.stationPlatformGroup.position.set(0, -50, 0);

                this.showThought(
                    'Uksed sulgusid. Esimene peatus peaks varsti saabuma.',
                    'Doors closed. The first stop should arrive shortly.',
                    4500
                );
            }, 800);
        }, 9800));

        // t = 15.5s: Arrive at First Stop (Keskjaam / Central Station)
        this.introTimeouts.push(setTimeout(() => {
            this.arriveAtFirstStop();
        }, 15500));
    }

    public skipIntro() {
        this.introTimeouts.forEach(t => clearTimeout(t));
        this.introTimeouts = [];

        if (this.currentCarriage) {
            this.currentCarriage.group.position.set(0, 0, 0);
        }
        this.stationPlatformGroup.position.set(0, -50, 0);
        this.introSideDoorsOpen = false;
        this.trainSpeed = 60;
        metroAudio.setSpeedAudio(0.9);

        const cTop = document.getElementById('cinema-top');
        const cBottom = document.getElementById('cinema-bottom');
        const locCard = document.getElementById('intro-location-card');
        const skipBtn = document.getElementById('btn-skip-intro');

        if (cTop) cTop.classList.add('cinematic-hidden');
        if (cBottom) cBottom.classList.add('cinematic-hidden');
        if (locCard) locCard.style.display = 'none';
        if (skipBtn) skipBtn.style.display = 'none';

        this.standUp();
    }

    public replayIntro() {
        this.startIntroSequence();
    }

    private sitInTrain() {
        this.state = 'intro_riding';
        this.trainSpeed = 50;
        metroAudio.setSpeedAudio(0.8);

        // Sit on seat at (1.1, 0.9, -1)
        this.playerPos.set(1.1, 0.95, -1);
        this.cameraEuler.set(0, -Math.PI / 2, 0);

        // Hide station platform, move through tunnel
        this.stationPlatformGroup.position.set(0, -50, 0);

        this.showThought(
            'Istusin maha. Esimene peatus peaks varsti saabuma.',
            'I sat down. The first stop should arrive shortly.'
        );

        setTimeout(() => {
            this.arriveAtFirstStop();
        }, 5500);
    }

    private arriveAtFirstStop() {
        this.state = 'intro_first_stop';
        this.trainSpeed = 0;
        metroAudio.setSpeedAudio(0);

        // Show station platform outside right windows
        this.stationPlatformGroup.position.set(0, 0, 0);

        metroAudio.playAnnouncementChime();
        metroAudio.playDoorChime();
        setTimeout(() => {
            metroAudio.playDoorSlide(true);
            this.introSideDoorsOpen = true;
        }, 500);

        this.showThought(
            'Esimene peatus: Keskjaam. Mõned reisijad lähevad maha, uued tulevad peale.',
            'First stop: Central Station. Some passengers get off, new ones board.'
        );

        // Passenger shuffle animation & doors close
        this.introTimeouts.push(setTimeout(() => {
            metroAudio.playDoorChime();
            setTimeout(() => {
                metroAudio.playDoorSlide(false);
                this.introSideDoorsOpen = false;

                setTimeout(() => {
                    this.departFirstStop();
                }, 1500);
            }, 800);
        }, 4000));
    }

    private departFirstStop() {
        this.state = 'intro_departing';
        this.trainSpeed = 55;
        metroAudio.setSpeedAudio(0.85);
        this.stationPlatformGroup.position.set(0, -50, 0);

        const cTop = document.getElementById('cinema-top');
        const cBottom = document.getElementById('cinema-bottom');
        const skipBtn = document.getElementById('btn-skip-intro');
        if (cTop) cTop.classList.add('cinematic-hidden');
        if (cBottom) cBottom.classList.add('cinematic-hidden');
        if (skipBtn) skipBtn.style.display = 'none';

        // Unlock player movement!
        this.introTimeouts.push(setTimeout(() => {
this.state = 'player_free';
            const standBtn = document.getElementById('btn-stand-up');
            if (standBtn) standBtn.style.display = 'flex';

            this.showThought(
                'Rong hakkas uuesti sõitma. Nüüd saan püsti tõusta ja rongi uurida.',
                'The train started moving again. I can now stand up and explore the train.'
            );
        }, 1200));
    }

    public sitDown() {
        if (this.state !== 'player_free' && this.state !== 'intro_riding') return;
        this.isSitting = true;
        const sideX = this.playerPos.x >= 0 ? 1.22 : -1.22;
        this.playerPos.x = sideX;
        this.playerPos.y = 0.95;
        metroAudio.playSitDown();

        const sitIcon = document.getElementById('btn-toggle-sit-icon');
        const sitText = document.getElementById('btn-toggle-sit-text');
        if (sitIcon) sitIcon.textContent = '🧍‍♂️';
        if (sitText) sitText.textContent = this.lang === 'et' ? 'Tõuse' : 'Stand';

        const standBtn = document.getElementById('btn-stand-up');
        if (standBtn) {
            standBtn.style.display = 'flex';
            standBtn.innerHTML = `<span>🧍‍♂️</span><span>${this.lang === 'et' ? 'Tõuse Püsti / Stand Up (W / E / Tap)' : 'Stand Up (W / E / Tap)'}</span>`;
        }

        this.showThought(
            'Istusin toolile. (Vajuta W, E või puuduta nuppu püstitõusmiseks)',
            'Sat down on the seat. (Press W, E or tap button to stand up)',
            2500
        );
    }

    public standUp() {
        this.isSitting = false;
        if (this.state === 'player_free' || this.state === 'intro_first_stop' || this.state === 'intro_riding' || this.state === 'intro_departing') {
            this.state = 'player_free';
            this.playerPos.y = 1.6;
            this.playerPos.x = 0; // step into aisle
            const standBtn = document.getElementById('btn-stand-up');
            if (standBtn) standBtn.style.display = 'none';

            const sitIcon = document.getElementById('btn-toggle-sit-icon');
            const sitText = document.getElementById('btn-toggle-sit-text');
            if (sitIcon) sitIcon.textContent = '🪑';
            if (sitText) sitText.textContent = this.lang === 'et' ? 'Istu' : 'Sit';

            metroAudio.playStandUp();
        }

        // Only show direction choice thought in the very first carriage (Carriage 0)
        if (this.currentCarIndex === 0) {
            this.cameraEuler.y = Math.PI; // Look forward down the aisle towards +Z
            this.showThought(
                'Vali suund: kas minna ettepoole (PAREM) või tahapoole (VASAK)?',
                'Choose a direction: head forward (RIGHT) or backward (LEFT)?'
            );
        }
    }

    public toggleSit() {
        if (this.isSitting) {
            this.standUp();
        } else {
            this.sitDown();
        }
    }

    // --- Input Handling & Player Movement ---

    private setupInputs() {
        window.addEventListener('keydown', (e) => {
            this.moveKeys[e.code] = true;

            // Stand up from seat if sitting and any movement/action key is pressed
            if (this.isSitting && (e.code === 'KeyW' || e.code === 'KeyS' || e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'Space' || e.code.startsWith('Arrow'))) {
                this.standUp();
            }

            // Flashlight toggle (KeyF)
            if (e.code === 'KeyF') {
                this.toggleFlashlight();
            }

            // Interact (KeyE)
            if (e.code === 'KeyE') {
                this.checkInteractions();
            }

            // Hotbar quick slot keys (1-6)
            if (e.code === 'Digit1' && this.inventory['key']) this.toggleEquipItem('key');
            if (e.code === 'Digit2' && this.inventory['night_vision']) this.toggleEquipItem('night_vision');
            if (e.code === 'Digit3' && this.inventory['speed_boost']) this.toggleEquipItem('speed_boost');
            if (e.code === 'Digit4' && this.inventory['clue_detector']) this.toggleEquipItem('clue_detector');
            if (e.code === 'Digit5' && this.inventory['secret_pass']) this.toggleEquipItem('secret_pass');
            if (e.code === 'Digit6' && this.inventory['radio']) this.toggleEquipItem('radio');

            // Playard Owner Teleport Modal shortcut (F2)
            if (e.code === 'F2' && this.isOwner) {
                const modal = document.getElementById('owner-teleport-modal');
                if (modal && modal.style.display === 'flex') {
                    this.closeOwnerTeleportModal();
                } else {
                    this.openOwnerTeleportModal();
                }
            }

            // Escape to close modals
            if (e.code === 'Escape') {
                this.closeOwnerTeleportModal();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.moveKeys[e.code] = false;
        });

        // Mouse Look / Pointer Lock for Camera (Active immediately from start without needing to press anything)
        const canRotateHead = () => {
            return this.state === 'player_free' || this.state.startsWith('intro_') || this.isSitting;
        };

        let hasInitializedMouse = false;

        const handleStartLook = (clientX: number, clientY: number) => {
            metroAudio.enableAudio();
            this.isMouseDown = true;
            this.lastMouseX = clientX;
            this.lastMouseY = clientY;
            hasInitializedMouse = true;
            if (this.state === 'player_free' && this.aimedInteractable) {
                this.checkInteractions();
            }
        };

        const handleMoveLook = (clientX: number, clientY: number, movementX?: number, movementY?: number) => {
            if (!canRotateHead()) return;

            // User requirement: "Sihikutäpiga vaatamine peab juba alguses olema isegi kui ma midagi ei vajuta"
            // Immediate camera rotation upon mouse movement, whether pointer locked, hovering, or dragging
            if (this.isPointerLocked && movementX !== undefined && movementY !== undefined) {
                const sensitivity = 0.0024;
                this.cameraEuler.y -= movementX * sensitivity;
                this.cameraEuler.x -= movementY * sensitivity;
                this.cameraEuler.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.cameraEuler.x));
            } else {
                if (!hasInitializedMouse) {
                    this.lastMouseX = clientX;
                    this.lastMouseY = clientY;
                    hasInitializedMouse = true;
                    return;
                }

                const dx = (movementX !== undefined && movementX !== 0) ? movementX : (clientX - this.lastMouseX);
                const dy = (movementY !== undefined && movementY !== 0) ? movementY : (clientY - this.lastMouseY);
                this.lastMouseX = clientX;
                this.lastMouseY = clientY;

                const sensitivity = 0.0028;
                this.cameraEuler.y -= dx * sensitivity;
                this.cameraEuler.x -= dy * sensitivity;
                this.cameraEuler.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.cameraEuler.x));
            }
        };

        const handleEndLook = () => {
            this.isMouseDown = false;
        };

        window.addEventListener('mousedown', (e) => {
            if ((e.target as HTMLElement)?.closest('button, a, input, .modal-box, .hotbar-slot')) return;
            handleStartLook(e.clientX, e.clientY);
            this.updateCursorState();
        });

        window.addEventListener('mousemove', (e) => {
            handleMoveLook(e.clientX, e.clientY, e.movementX, e.movementY);
        });

        window.addEventListener('mouseup', () => handleEndLook());

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
            if (this.isPointerLocked) {
                document.body.classList.add('metro-in-game');
                document.body.classList.remove('metro-cursor-visible');
            }
        });

        // Touch controls on mobile/tablets
        window.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                if ((e.target as HTMLElement)?.closest('button, a, input, .modal-box, .hotbar-slot')) return;
                metroAudio.enableAudio();
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
                this.isMouseDown = true;
                this.lastMouseX = e.touches[0].clientX;
                this.lastMouseY = e.touches[0].clientY;
                hasInitializedMouse = true;
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0 && canRotateHead()) {
                const dx = e.touches[0].clientX - this.touchStartX;
                const dy = e.touches[0].clientY - this.touchStartY;
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;

                const sensitivity = 0.0045;
                this.cameraEuler.y -= dx * sensitivity;
                this.cameraEuler.x -= dy * sensitivity;
                this.cameraEuler.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.cameraEuler.x));
            }
        }, { passive: true });

        window.addEventListener('touchend', () => handleEndLook());
    }

    // --- Cursor & Pointer Lock State Management ---
    public updateCursorState() {
        const isShopOpen = document.getElementById('golden-shop-modal')?.style.display === 'flex';
        const isDeathOpen = document.getElementById('death-modal')?.style.display === 'flex';
        const isLoreOpen = document.getElementById('lore-modal')?.style.display === 'flex';
        const isKeypadOpen = document.getElementById('keypad-modal')?.style.display === 'flex';
        const isOwnerOpen = document.getElementById('owner-teleport-modal')?.style.display === 'flex';
        const startOverlay = document.getElementById('start-game-overlay');
        const isStartOpen = !!startOverlay && startOverlay.style.display !== 'none' && startOverlay.style.opacity !== '0';

        const isAnyModalOpen = isShopOpen || isDeathOpen || isLoreOpen || isKeypadOpen || isOwnerOpen || isStartOpen;

        if (isAnyModalOpen) {
            document.body.classList.remove('metro-in-game');
            document.body.classList.add('metro-cursor-visible');
            if (document.pointerLockElement) {
                try { document.exitPointerLock?.(); } catch (_) {}
            }
        } else {
            document.body.classList.add('metro-in-game');
            document.body.classList.remove('metro-cursor-visible');
            if (!this.isPointerLocked && (this.state === 'player_free' || this.state.startsWith('intro_') || this.isSitting)) {
                try {
                    const p = this.renderer.domElement.requestPointerLock?.();
                    if (p && typeof (p as any).catch === 'function') {
                        (p as any).catch(() => {});
                    }
                } catch (_) {}
            }
        }
    }

    // --- Center Reticle / Dot Interaction Raycast Detection ---
    public updateReticleAim() {
        const crosshair = document.getElementById('hud-crosshair');
        const prompt = document.getElementById('crosshair-prompt');
        const promptText = document.getElementById('crosshair-prompt-text');

        if (this.state !== 'player_free' && !this.isSitting) {
            this.aimedInteractable = null;
            if (crosshair) crosshair.classList.remove('active');
            if (prompt) prompt.style.display = 'none';
            return;
        }

        const isEt = this.lang === 'et';

        if (this.isSitting) {
            this.aimedInteractable = 'stand';
            if (crosshair) crosshair.classList.add('active');
            if (prompt && promptText) {
                promptText.innerText = isEt ? 'Tõuse püsti / Stand Up' : 'Stand Up';
                prompt.style.display = 'block';
            }
            return;
        }

        // Camera forward direction vector
        const camDir = new THREE.Vector3(0, 0, -1).applyEuler(this.cameraEuler);
        const playerHeadPos = new THREE.Vector3(this.playerPos.x, this.playerPos.y, this.playerPos.z);
        let foundAim: 'inspectable' | 'keypad' | 'shop' | 'seat' | null = null;
        let text = '';

        // 1. Inspectable Note / Ticket / Clue / Keypad
        if (this.currentCarriage?.inspectableItem) {
            const itemPos = this.currentCarriage.inspectableItem.position;
            const toItem = itemPos.clone().sub(playerHeadPos);
            const dist = toItem.length();
            if (dist < 5.5) {
                const toItemDir = toItem.clone().normalize();
                const dot3D = camDir.dot(toItemDir);
                const camDir2D = new THREE.Vector2(camDir.x, camDir.z).normalize();
                const toItem2D = new THREE.Vector2(toItem.x, toItem.z).normalize();
                const dot2D = camDir2D.dot(toItem2D);

                if (dot3D > 0.55 || dot2D > 0.70) {
                    if (this.currentCarriage.hasKeypad) {
                        foundAim = 'keypad';
                        text = isEt ? 'Sisesta kood (Keypad)' : 'Enter Code (Keypad)';
                    } else {
                        foundAim = 'inspectable';
                        const clue = this.currentCarriage.inspectableText;
                        const title = isEt ? clue?.titleEt || 'Uuri piletit / vihjet' : clue?.titleEn || 'Inspect Note / Ticket';
                        text = title;
                    }
                }
            }
        }

        // 2. Golden Shop Counter in Carriage 100
        if (!foundAim && this.currentCarIndex === 100) {
            const counterPos = new THREE.Vector3(0, 1.0, 1.5);
            const toCounter = counterPos.clone().sub(playerHeadPos);
            const dist = toCounter.length();
            if (dist < 4.5) {
                const toCounterDir = toCounter.clone().normalize();
                const dot = camDir.dot(toCounterDir);
                if (dot > 0.70) {
                    foundAim = 'shop';
                    text = isEt ? 'Ava Kuldne Pood (Golden Shop)' : 'Open Golden Shop';
                }
            }
        }

        // 3. Seats / Benches (Only aim at empty seat cushions, not occupied by passengers)
        if (!foundAim && !this.isSitting) {
            const leftSeatPos = new THREE.Vector3(-1.1, 0.55, this.playerPos.z);
            const rightSeatPos = new THREE.Vector3(1.1, 0.55, this.playerPos.z);
            const toLeft = leftSeatPos.clone().sub(playerHeadPos);
            const toRight = rightSeatPos.clone().sub(playerHeadPos);
            const dotL = camDir.dot(toLeft.clone().normalize());
            const dotR = camDir.dot(toRight.clone().normalize());

            const isPassengerNearLeft = this.currentCarriage?.passengers?.some(p => Math.abs(p.seatPos.x - (-1.1)) < 0.4 && Math.abs(p.seatPos.z - this.playerPos.z) < 0.85);
            const isPassengerNearRight = this.currentCarriage?.passengers?.some(p => Math.abs(p.seatPos.x - 1.1) < 0.4 && Math.abs(p.seatPos.z - this.playerPos.z) < 0.85);

            if ((dotL > 0.70 && toLeft.length() < 3.2 && !isPassengerNearLeft) || (dotR > 0.70 && toRight.length() < 3.2 && !isPassengerNearRight)) {
                foundAim = 'seat';
                text = isEt ? 'Istu toolile' : 'Sit Down';
            }
        }

        this.aimedInteractable = foundAim;

        if (foundAim) {
            if (crosshair) crosshair.classList.add('active');
            if (prompt && promptText) {
                promptText.innerText = text;
                prompt.style.display = 'block';
            }
        } else {
            if (crosshair) crosshair.classList.remove('active');
            if (prompt) prompt.style.display = 'none';
        }
    }

    private toggleFlashlight() {
        this.flashlightOn = !this.flashlightOn;
        if (this.flashlight) {
            this.flashlight.intensity = this.flashlightOn ? 2.5 : 0;
        }
        metroAudio.playFlashlightClick();
    }

    public checkInteractions() {
        if (!this.currentCarriage || (this.state !== 'player_free' && !this.isSitting)) return;

        // User requirement: "se pilet või asjad tulevad sulle ette siis kui sse täpp mis on su ees on selle peal ja vajutad e"
        if (this.isSitting) {
            this.standUp();
            return;
        }

        if (this.aimedInteractable === 'inspectable') {
            if (this.currentCarIndex === 28) this.hasUnlockedCarriage28WithClue = true;
            if (this.currentCarIndex === 78) this.hasUnlockedCarriage78WithHint = true;
            this.openLoreModal();
            return;
        }

        if (this.aimedInteractable === 'keypad') {
            this.openKeypadModal();
            return;
        }

        if (this.aimedInteractable === 'shop') {
            this.openGoldenShopModal();
            return;
        }

        if (this.aimedInteractable === 'seat') {
            this.sitDown();
            return;
        }
    }

    public openLoreModal() {
        if (!this.currentCarriage || !this.currentCarriage.inspectableText) return;
        this.state = 'inspecting';
        this.cluesFound++;

        const isEt = this.lang === 'et';
        const modal = document.getElementById('lore-modal');
        const title = document.getElementById('lore-title');
        const desc = document.getElementById('lore-desc');
        if (modal && title && desc) {
            title.innerText = isEt ? this.currentCarriage.inspectableText.titleEt : this.currentCarriage.inspectableText.titleEn;
            desc.innerText = isEt ? this.currentCarriage.inspectableText.descEt : this.currentCarriage.inspectableText.descEn;
            modal.style.display = 'flex';
        }
        metroAudio.playItemInspect();
        this.updateCursorState();
    }

    private openKeypadModal() {
        this.state = 'keypad';
        const modal = document.getElementById('keypad-modal');
        const codeDisplay = document.getElementById('keypad-input');
        if (modal && codeDisplay) {
            (codeDisplay as HTMLInputElement).value = '';
            modal.style.display = 'flex';
        }
        this.updateCursorState();
    }

    private submitKeypad() {
        const input = document.getElementById('keypad-input') as HTMLInputElement;
        const modal = document.getElementById('keypad-modal');
        if (input && modal && this.currentCarriage) {
            if (input.value === '1987' || input.value === this.currentCarriage.puzzleCode) {
                metroAudio.playKeypadBeep(true);
                this.currentCarriage.puzzleSolved = true;
                modal.style.display = 'none';
                this.state = 'player_free';
                this.updateCursorState();
                this.showThought('Kood õige! Uks avanes.', 'Code correct! The door unlocked.');
            } else {
                metroAudio.playKeypadBeep(false);
                input.value = '';
                this.showThought('Vale kood. Proovi uuesti.', 'Wrong code. Try again.');
            }
        }
    }

    public openOwnerTeleportModal() {
        if (!this.isOwner) return;
        const modal = document.getElementById('owner-teleport-modal');
        const errEl = document.getElementById('owner-teleport-error');
        const input = document.getElementById('owner-teleport-input') as HTMLInputElement;
        if (errEl) errEl.style.display = 'none';
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 60);
        }
        if (modal) modal.style.display = 'flex';
        this.state = 'inspecting';
        this.updateCursorState();
    }

    public closeOwnerTeleportModal() {
        const modal = document.getElementById('owner-teleport-modal');
        if (modal) modal.style.display = 'none';
        if (this.state === 'inspecting') {
            this.state = 'player_free';
        }
        this.updateCursorState();
    }

    public teleportToCarriage(carNum: number): boolean {
        if (!this.isOwner) return false;

        // User requirement: "kui panen liiga suure siis tuleb tekst sellist vagunit ei ole"
        if (isNaN(carNum) || carNum < 0 || carNum > 100) {
            const errEl = document.getElementById('owner-teleport-error');
            if (errEl) {
                errEl.innerText = this.lang === 'et' ? '❌ Sellist vagunit ei ole' : '❌ No such carriage exists';
                errEl.style.display = 'block';
            }
            metroAudio.playError();
            this.showThought(
                'Sellist vagunit ei ole.',
                'No such carriage exists.'
            );
            return false;
        }

        // If in intro, skip to active gameplay
        if (this.state === 'intro_station' || this.state === 'intro_boarding' || this.state === 'intro_inside') {
            this.skipIntro();
        }

        // Teleport to requested carriage
        this.loadCarriage(carNum, 'right');
        this.playerPos.set(0, 1.6, -6.5);
        this.cameraEuler.y = 0;
        this.state = 'player_free';
        metroAudio.playTeleport();

        this.closeOwnerTeleportModal();
        this.showThought(
            `⚡ Teleporditud vagunisse ${carNum}!`,
            `⚡ Teleported to carriage ${carNum}!`
        );
        return true;
    }

    // --- Animation & Physics Loop ---

    private animate() {
        const delta = Math.min(this.clock.getDelta(), 0.1);

        // 0. Intro Cinematic Animations
        if (this.state === 'intro_station' && this.currentCarriage) {
            // Train pulls smoothly into station from z = -65 to 0
            this.currentCarriage.group.position.z = THREE.MathUtils.lerp(this.currentCarriage.group.position.z, 0, delta * 1.5);
        } else if (this.state === 'intro_boarding') {
            // Camera walks smoothly from platform (3.8, 1.6, -3.5) through doors (1.7, 1.6, 0) into aisle (0, 1.6, 0)
            this.playerPos.x = THREE.MathUtils.lerp(this.playerPos.x, 0, delta * 2.2);
            this.playerPos.z = THREE.MathUtils.lerp(this.playerPos.z, 0, delta * 2.2);
            if (!this.isMouseDown && !this.moveKeys['ArrowLeft'] && !this.moveKeys['ArrowRight'] && !this.moveKeys['KeyQ']) {
                this.cameraEuler.y = THREE.MathUtils.lerp(this.cameraEuler.y, -Math.PI / 2, delta * 2.0);
            }
        }

        // Side sliding doors animation
        const openOffset = this.introSideDoorsOpen ? 0.95 : 0;
        this.sideDoorMeshes.forEach(door => {
            const targetZ = door.baseZ + door.dir * openOffset;
            door.mesh.position.z = THREE.MathUtils.lerp(door.mesh.position.z, targetZ, delta * 6);
        });

        // 1. Move passing tunnel for sense of forward subway speed or reverse anomaly
        if (this.reverseTunnelTimer > 0) {
            this.reverseTunnelTimer -= delta;
            this.tunnelOffsetZ -= (this.trainSpeed * 2.0) * delta;
            this.tunnelGroup.position.z = (this.tunnelOffsetZ % 12);
        } else if (this.trainSpeed > 0) {
            this.tunnelOffsetZ += this.trainSpeed * delta;
            this.tunnelGroup.position.z = (this.tunnelOffsetZ % 12);
        }

        // 2. Realistic Passenger Breathing, Awareness & Lifelike Animation Logic
        if (this.currentCarriage) {
            const time = performance.now() * 0.0015;
            this.currentCarriage.passengers.forEach((p, pIdx) => {
                // Subtle rhythmic chest breathing expansion
                const breath = Math.sin(time * 2.2 + pIdx * 1.6) * 0.008;
                p.body.position.y = 0.32 + breath;
                p.body.scale.set(1.0 + breath * 0.8, 1.0 + breath * 1.2, 1.0 + breath * 0.8);

                const distToPlayer = this.playerPos.distanceTo(p.group.position);

                if (p.isCreepy || this.currentCarIndex === 83 || this.currentCarIndex === 71) {
                    if (distToPlayer < 6.5) {
                        // Creepy staring anomaly: head locks unblinkingly onto player
                        const angle = Math.atan2(this.playerPos.x - p.group.position.x, this.playerPos.z - p.group.position.z);
                        p.head.rotation.y = THREE.MathUtils.lerp(p.head.rotation.y, angle - p.group.rotation.y, delta * 5);
                    } else {
                        p.head.rotation.y = THREE.MathUtils.lerp(p.head.rotation.y, 0, delta * 3);
                    }
                } else if (distToPlayer < 3.2 && this.playerPos.z > p.group.position.z - 2.5 && this.playerPos.z < p.group.position.z + 2.5) {
                    // Natural commuter glance as player walks down the aisle
                    const targetAngle = Math.atan2(this.playerPos.x - p.group.position.x, this.playerPos.z - p.group.position.z) - p.group.rotation.y;
                    const clampedAngle = THREE.MathUtils.clamp(targetAngle, -0.65, 0.65);
                    p.head.rotation.y = THREE.MathUtils.lerp(p.head.rotation.y, clampedAngle, delta * 3.5);
                    p.head.rotation.x = THREE.MathUtils.lerp(p.head.rotation.x, 0.05, delta * 3.5);
                } else if (p.animType === 'phone') {
                    // Looking at phone with subtle screen glow and thumb scrolling
                    p.head.rotation.x = THREE.MathUtils.lerp(p.head.rotation.x, 0.28 + Math.sin(time * 1.5 + pIdx) * 0.03, delta * 4);
                    p.head.rotation.y = THREE.MathUtils.lerp(p.head.rotation.y, (p.seatPos.x > 0 ? -1 : 1) * 0.06, delta * 4);
                    if (p.thumbRight) {
                        p.thumbRight.position.z = 0.27 + Math.sin(time * 5.0 + pIdx) * 0.005;
                    }
                } else if (p.animType === 'look_window') {
                    // Gazing out the subway window watching passing tunnel lights
                    const windowAngle = (p.seatPos.x > 0 ? 1 : -1) * (0.82 + Math.sin(time * 0.8 + pIdx) * 0.05);
                    p.head.rotation.y = THREE.MathUtils.lerp(p.head.rotation.y, windowAngle, delta * 3);
                    p.head.rotation.x = THREE.MathUtils.lerp(p.head.rotation.x, -0.04, delta * 3);
                }

                // Headphone wearer subtle rhythm head nod
                if (p.headphones) {
                    p.head.rotation.x += Math.sin(time * 4.2 + pIdx) * 0.025;
                }
            });
        }

        // 2b. Collectible Coins Rotation & Proximity Collection Loop
        for (let i = this.collectibleCoins.length - 1; i >= 0; i--) {
            const coin = this.collectibleCoins[i];
            if (!coin.collected) {
                coin.mesh.rotation.z += delta * 3.5;
                const dist = this.playerPos.distanceTo(coin.mesh.position);
                if (dist < 1.35) {
                    coin.collected = true;
                    this.addCoins(coin.value);
                    metroAudio.playCoinPickup();
                    this.currentCarriage?.group.remove(coin.mesh);
                    this.collectibleCoins.splice(i, 1);
                    this.showThought(`+${coin.value} 🪙 Metro Coin!`, `+${coin.value} 🪙 Metro Coin!`, 1500);
                }
            }
        }

        // 2c. Clue Detector (Vihjeandur) Radar Proximity Ping
        if (this.clueDetectorActive || this.equippedItem === 'clue_detector') {
            if (this.currentCarriage?.inspectableItem) {
                const dist = this.playerPos.distanceTo(this.currentCarriage.inspectableItem.position);
                if (dist < 6.0) {
                    this.radarPingTimer -= delta;
                    const pingInterval = Math.max(0.25, dist * 0.28);
                    if (this.radarPingTimer <= 0) {
                        this.radarPingTimer = pingInterval;
                        metroAudio.playRadarPing();
                    }
                }
            }
        }

        // 3. Ghost Stalker Creeping Logic in Carriage 9
        if (this.stalkerActive && this.stalkerMesh) {
            _scratchV1.subVectors(this.stalkerMesh.position, this.playerPos).normalize();
            _scratchV2.set(0, 0, -1).applyEuler(this.cameraEuler);
            const dot = _scratchV2.dot(_scratchV1);

            if (dot < 0.2) {
                // Looking away -> Stalker creeps closer!
                this.stalkerDistZ -= 2.6 * delta;
                this.stalkerMesh.position.z = this.stalkerDistZ;
                metroAudio.playHeartbeat();
            }

            // When stalker gets close or player advances -> Stalker dissolves & triggers Void Shadow Hands!
            if (this.playerPos.z > 3.0 || this.stalkerDistZ < this.playerPos.z + 2.0) {
                this.scene.remove(this.stalkerMesh);
                this.stalkerActive = false;
                this.stalkerMesh = null;
                this.triggerShadowHandsEvent();
            }
        }

        // 3b. Ultra-Realistic Shadow Hand Reaching & 10s Timer Dismissal
        if (this.shadowHandsActive && this.state === 'player_free') {
            this.shadowHandsTimer -= delta;
            if (this.shadowHandsTimer <= 0) {
                this.dismissShadowHands();
            } else {
                this.shadowHandsAnimTimer += delta * 4.5;
                this.shadowHandsGroups.forEach((hand) => {
                    const wave = Math.sin(this.shadowHandsAnimTimer);
                    hand.position.y = 1.35 + wave * 0.14;
                    hand.rotation.x = Math.sin(this.shadowHandsAnimTimer * 0.7) * 0.22;
                    hand.rotation.y = Math.cos(this.shadowHandsAnimTimer * 0.5) * 0.28;

                    // Animate articulated fingers flexing and grasping
                    hand.children.forEach(child => {
                        if (child.name === 'finger') {
                            child.rotation.z = Math.sin(this.shadowHandsAnimTimer * 2.0) * 0.28;
                            child.rotation.x = Math.cos(this.shadowHandsAnimTimer * 1.6) * 0.18;
                        }
                    });

                    // Reach inwards toward center aisle
                    const side = hand.position.x > 0 ? 1 : -1;
                    hand.position.x = (side * 1.68) - (side * (0.65 + wave * 0.35));

                    // Ultra-sensitive collision check: even slight contact or entering reach zone triggers instant death
                    const handWorldPos = hand.position;
                    const distToHand = this.playerPos.distanceTo(handWorldPos);
                    const nearDoorWay = (side > 0 ? this.playerPos.x > 0.25 : this.playerPos.x < -0.25) && Math.abs(this.playerPos.z - handWorldPos.z) < 2.0;

                    if (distToHand < 1.75 || nearDoorWay) {
                        this.triggerDraggedDeath(side);
                    }
                });
            }
        }

        // 3c. Dragged Out Death Cutscene Animation
        if (this.state === 'dragged_death') {
            this.deathTimer += delta;
            // Drag violently sideways out through the open door into the dark rushing tunnel
            const targetX = this.deathDragSide * 4.5;
            this.playerPos.x = THREE.MathUtils.lerp(this.playerPos.x, targetX, delta * 5.0);
            this.playerPos.y = THREE.MathUtils.lerp(this.playerPos.y, 0.4, delta * 2.5);

            // Camera violent spin and tilt
            this.cameraEuler.z += delta * (this.deathDragSide * 5.0);
            this.cameraEuler.x += delta * 2.8;

            if (this.deathTimer > 1.6) {
                this.openDeathModal();
            }
        }

        if (this.shadowRushCountdown > 0) {
            this.shadowRushCountdown = Math.max(0, this.shadowRushCountdown - delta);
        }

        // 3d. Carriage 20 Shadow Creature (Must Olend) Rush Logic & Seating Survival Check
        if (this.shadowRushActive && this.shadowEntityMesh) {
            this.shadowEntityMesh.position.z += this.shadowRushSpeed * delta;

            // Violent camera vibration / shake when creature rushes closer
            const distToPlayerZ = Math.abs(this.shadowEntityMesh.position.z - this.playerPos.z);
            if (distToPlayerZ < 7.0) {
                const shakeIntensity = (1.0 - distToPlayerZ / 7.0) * 0.09;
                this.camera.position.x += (Math.random() - 0.5) * shakeIntensity;
                this.camera.position.y += (Math.random() - 0.5) * shakeIntensity;
            }

            // Creature strikes player zone!
            if (distToPlayerZ < 2.0 && this.state !== 'game_over' && this.state !== 'dragged_death') {
                if (!this.isSitting) {
                    // Player was STANDING -> Instant Death!
                    this.state = 'game_over';
                    metroAudio.playJumpScareStinger();
                    const deathModal = document.getElementById('death-modal');
                    const dTitle = document.getElementById('death-title');
                    const dReason = document.getElementById('death-reason');
                    if (dTitle) dTitle.textContent = this.lang === 'et' ? 'SA SURID' : 'YOU DIED';
                    if (dReason) {
                        dReason.textContent = this.lang === 'et'
                            ? 'Must vari pühkis su minema! Sa seisid püsti — sa oleksid pidanud toolile istuma!'
                            : 'The shadow entity swept you away! You were standing — you should have sat on a seat!';
                    }
                    if (deathModal) deathModal.style.display = 'flex';
                }
            }

            // Creature finished dashing out of the carriage into darkness
            if (Math.abs(this.shadowEntityMesh.position.z) > 10.5) {
                this.shadowRushActive = false;
                this.scene.remove(this.shadowEntityMesh);
                this.shadowEntityMesh = null;
                this.trainSpeed = 60;

                if (this.state !== 'game_over') {
                    this.showThought(
                        'See läks napilt... Istumine päästis mu elu! Must vari kadus pimedusse ja uksed avanesid. Võid nüüd püsti tõusta.',
                        'That was close... Sitting down saved my life! The shadow vanished into darkness and doors unlocked. You can stand up now.',
                        4500
                    );
                }
            }
        }

        // 4. Keyboard Camera Turning (Arrows & Q/E)
        if (this.state === 'player_free' || this.state.startsWith('intro_') || this.isSitting) {
            const rotSpeed = 1.9;
            if (this.moveKeys['ArrowLeft'] || this.moveKeys['KeyQ']) {
                this.cameraEuler.y += rotSpeed * delta;
            }
            if (this.moveKeys['ArrowRight']) {
                this.cameraEuler.y -= rotSpeed * delta;
            }
            if (this.moveKeys['ArrowUp']) {
                this.cameraEuler.x += rotSpeed * 0.75 * delta;
            }
            if (this.moveKeys['ArrowDown']) {
                this.cameraEuler.x -= rotSpeed * 0.75 * delta;
            }
            this.cameraEuler.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.cameraEuler.x));
        }

        // 5. Player Physics & Movement (when player_free and not sitting)
        if (this.state === 'player_free' && this.playerPos.y >= 1.4 && !this.isSitting) {
            const baseSpeed = (this.speedBoostActive || this.equippedItem === 'speed_boost') ? 5.4 : 3.6;
            _moveDir.set(0, 0, 0);

            if (this.moveKeys['KeyW']) _moveDir.z -= 1;
            if (this.moveKeys['KeyS']) _moveDir.z += 1;
            if (this.moveKeys['KeyA']) _moveDir.x -= 1;
            if (this.moveKeys['KeyD']) _moveDir.x += 1;

            if (_moveDir.lengthSq() > 0) {
                _moveDir.normalize();
                _moveDir.applyAxisAngle(_upAxis, this.cameraEuler.y);

                this.playerPos.x += _moveDir.x * baseSpeed * delta;
                this.playerPos.z += _moveDir.z * baseSpeed * delta;

                // Train carriage boundary collision
                this.playerPos.x = Math.max(-1.4, Math.min(1.4, this.playerPos.x));

                // Head bob & footsteps
                this.headBobTimer += delta * (baseSpeed > 4 ? 16 : 12);
                this.stepTimer += delta;
                if (this.stepTimer > (baseSpeed > 4 ? 0.32 : 0.48)) {
                    this.stepTimer = 0;
                    metroAudio.playFootstep();
                }
            }

            // Door Navigation & Locked Door Checks
            const now = performance.now();

            // Shadow Event Trap Check (Vagun 20, 25, 32, 48, 50, 57, 63, 70, 75, 82, 90, 97)
            // User requirement: "kui tuleb se koll 20 uks ja 25 jne tuleb siis ei saa nii kaua minna teise vagunisse ehk oled kinni kuni se laul läbi saab"
            if (this.isShadowEventActive() && Math.abs(this.playerPos.z) > 7.5) {
                this.playerPos.z = this.playerPos.z > 0 ? 7.4 : -7.4;
                if (now - this.lastLockedDoorSoundTime > 1200) {
                    this.lastLockedDoorSoundTime = now;
                    metroAudio.playDoorLocked();
                    this.showThought(
                        '⚠️ Uksed on anomaalia ajal lukus! Oled vagunis kinni, kuni must vari ja laul on möödas! ISTU TOOLILE!',
                        '⚠️ Doors are locked during the anomaly! You are trapped until the shadow creature and song subside! SIT DOWN!'
                    );
                }
                return;
            }

            // Carriage 64 Key Unlock Door Check
            if (this.currentCarIndex === 64 && Math.abs(this.playerPos.z) > 8.0) {
                if (this.equippedItem === 'key' || this.inventory['key']) {
                    if (!this.hasUnlockedCarriage64WithKey) {
                        this.hasUnlockedCarriage64WithKey = true;
                        metroAudio.playDoorLatch();
                        this.showThought('🗝️ Võti keeras luku lahti! Uks avanes.', '🗝️ Key unlocked the bulkhead door!');
                    }
                } else if (!this.hasUnlockedCarriage64WithKey) {
                    this.playerPos.z = this.playerPos.z > 0 ? 7.6 : -7.6;
                    if (now - this.lastLockedDoorSoundTime > 1200) {
                        this.lastLockedDoorSoundTime = now;
                        metroAudio.playDoorLocked();
                        this.showThought('Uks on lukus! Vajad võtit (Vagun 63), et see avada.', 'Door is locked! You need the key (Carriage 63) to open it.');
                    }
                    return;
                }
            }

            if (this.branchDirection === 'right') {
                // Front Door (+Z) -> Open Next Carriage
                if (this.playerPos.z > 8.8) {
                    this.loadCarriage(this.currentCarIndex + 1, 'right');
                }
                // Back Door (-Z) -> LOCKED Previous Carriage
                else if (this.playerPos.z < -7.8) {
                    this.playerPos.z = -7.6; // bounce back
                    if (now - this.lastLockedDoorSoundTime > 1200) {
                        this.lastLockedDoorSoundTime = now;
                        metroAudio.playDoorLocked();
                        this.showThought(
                            'Uks on lukus. Tagasi eelmisesse vagunisse ei saa minna. Edasi liikumine on ainus võimalus.',
                            'The door is locked. You cannot return to the previous carriage. Moving forward is the only way.'
                        );
                    }
                }
            } else if (this.branchDirection === 'left') {
                // Back Door (-Z) -> Open Next Carriage
                if (this.playerPos.z < -8.8) {
                    this.loadCarriage(this.currentCarIndex + 1, 'left');
                }
                // Front Door (+Z) -> LOCKED Previous Carriage
                else if (this.playerPos.z > 7.8) {
                    this.playerPos.z = 7.6; // bounce back
                    if (now - this.lastLockedDoorSoundTime > 1200) {
                        this.lastLockedDoorSoundTime = now;
                        metroAudio.playDoorLocked();
                        this.showThought(
                            'Uks on lukus. Tagasi eelmisesse vagunisse ei saa minna. Edasi liikumine on ainus võimalus.',
                            'The door is locked. You cannot return to the previous carriage. Moving forward is the only way.'
                        );
                    }
                }
            } else {
                // Undecided (Carriage 0 initial choice)
                if (this.playerPos.z > 8.8) {
                    this.loadCarriage(1, 'right');
                } else if (this.playerPos.z < -8.8) {
                    this.loadCarriage(1, 'left');
                }
            }

            this.playerPos.z = Math.max(-9.2, Math.min(9.2, this.playerPos.z));
        }

        // 6. Update Camera & Held Item Sway
        const headBobOffset = Math.sin(this.headBobTimer) * 0.04;
        this.camera.position.set(
            this.playerPos.x,
            this.playerPos.y + (this.state === 'player_free' ? headBobOffset : 0),
            this.playerPos.z
        );
        this.camera.quaternion.setFromEuler(this.cameraEuler);

        // Update Center Reticle Raycast Aim
        this.updateReticleAim();

        // Render Frame
        this.renderer.render(this.scene, this.camera);
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Instantiate and expose globally for Playard tests
window.addEventListener('DOMContentLoaded', () => {
    (window as any).__metroAudio = metroAudio;
    (window as any).__lastMetro = new LastMetroGame();
});
