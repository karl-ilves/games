import * as THREE from 'three';
import { getCurrentUserProfile, isPlayardOwner, isTestMode } from '../../../auth';
import { yardService } from '../../../shared/yardService';
import { metroAudio } from '../audio';
import { PlayardMobileControls, isMobileOrTabletDevice } from '../../../shared/mobileControls';
import { GameState, DirectionBranch, AnomalyEvent, AIPassenger, CarriageData, ShopItem, ClueItem } from '../types';
import { GOLDEN_SHOP_ITEMS, CLUES_DATABASE } from '../catalog';

const _scratchV1 = new THREE.Vector3();
const _scratchV2 = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

export class MetroBase {
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
    public aimedInteractable: 'inspectable' | 'keypad' | 'shop' | 'seat' | 'stand' | 'switch' | null = null;
    public aimedSwitchIndex: number = -1;
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

    // Player Health System (User requirement: "rida mis näitab su elusi vasakul üleval nurgas viimane metroo teksti all")
    public playerHp: number = 100;
    public maxPlayerHp: number = 100;

    // Glowing Eyes Anomaly State (Carriages 26 - 30)
    public shadowEyesGroup: THREE.Group | null = null;

    // Shadow Villains State (Carriage 31 - "ilmub pahalased")
    public shadowVillains: { group: THREE.Group; hp: number; maxHp: number; attackCooldown: number; bodyMesh: THREE.Mesh }[] = [];
    public isSwordSwinging: boolean = false;
    private swordSwingTimer: number = 0;

    // Ajapahalane (Time Villain) State — rare event when player stays too long in a carriage
    public timeVillainActive: boolean = false;
    public timeVillainCountdown: number = 0;
    public carriageStayTimer: number = 0;
    public timeVillainGroup: THREE.Group | null = null;
    private timeVillainFlickerInterval: any = null;
    private timeVillainShakeOffset: THREE.Vector3 = new THREE.Vector3();
    private timeVillainTriggeredThisCarriage: boolean = false;

    // ── Politsei Jälituse Sündmus (Vagunid 150–160) ─────────────────────────
    public policeChaseActive: boolean = false;
    public policeOfficers: THREE.Group[] = [];
    public policeChaseTriggered: boolean = false;
    public policeChaseAnimLocked: boolean = false; // mängija liikumine blokeeritud
    public policeRemovedByGrip: number = 0; // mitu politseinikku on Grip eemaldanud
    public policeChaseRunActive: boolean = false; // mängija jookseb animatsioon
    public carriage150IntroPlayed: boolean = false;

    // ── Vihjed & Seljakott (Clue Collectible System) ────────────────────────
    public collectedClues: ClueItem[] = [];
    public currentInspectedClue: ClueItem | null = null;
    public activeClueMesh: THREE.Group | null = null;

    // ── Vagun 200 Kuulja Boss & Switches ────────────────────────────────────
    public kuuljaBossGroup: THREE.Group | null = null;
    public kuuljaHearingAlert: boolean = false;
    public kuuljaSwitchesActivated: number = 0;
    public kuuljaSwitches: { mesh: THREE.Group; activated: boolean }[] = [];
    public kuuljaSpeed: number = 0;
    public kuuljaTargetPos: THREE.Vector3 = new THREE.Vector3();
    public stationStairsGroup: THREE.Group | null = null;
    public carriage200CutsceneTimers: any[] = [];
    public carriage10ScareTimers: any[] = [];
    public station200SwitchesDone: boolean = false;
    public station200Departing: boolean = false;

    // ── Vagun 200 Final Boss & Green Health Pickups ─────────────────────────
    public carriage200Boss: {
        group: THREE.Group;
        bodyMesh: THREE.Mesh;
        hp: number;
        maxHp: number;
        attackCooldown: number;
        isDead: boolean;
        healthCanvas: HTMLCanvasElement;
        healthTex: THREE.CanvasTexture;
        healthSprite: THREE.Sprite;
        initialZ: number;
        moveSpeed: number;
    } | null = null;
    public carriage200HealthPickups: {
        mesh: THREE.Group;
        pos: THREE.Vector3;
        collected: boolean;
        light: THREE.PointLight;
        pulseOffset: number;
    }[] = [];
    public carriage200ExitArrows: THREE.Group[] = [];
    public lastMaxHealthWarningTime: number = 0;

    // ── Vagunid 201–250 Kanalisatsioon (Sewers) ────────────────────────────
    public sewerWaterSubmerged: boolean = false;
    public sewerSubmergeTimer: number = 0;
    public isCrouching: boolean = false;
    public carriage201IntroPlayed: boolean = false;
    public carriage250DoorOpened: boolean = false;

    // ── Vagun 300 Finale ───────────────────────────────────────────────────
    public carriage300ExitTriggered: boolean = false;



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

        // 1. User Profile & Playard Owner Verification
        const userProf = getCurrentUserProfile();
        this.isOwner = isPlayardOwner(userProf?.email);

        // Last Metro is now open and accessible to all players!
        const vipOverlay = document.getElementById('vip-restricted-overlay');
        if (vipOverlay) {
            vipOverlay.style.display = 'none';
        }

        // Language determination: Estonian for Owner, English for everyone else ("kõik inglisekeelseks väljaarvatud Playard owner")
        this.lang = this.isOwner ? 'et' : 'en';
        this.updateLanguageUI();

        // Record to Recently Played
        yardService.recordPlayedGame({
            id: 'metro',
            title: this.lang === 'et' ? '🚇 Last Metro' : '🚇 Last Metro',
            description: this.lang === 'et' ? '3D atmosfääriline seiklus- ja müsteeriumimäng lõputus metroorongis.' : '3D atmospheric mystery adventure on an endless subway train.',
            url: './games/metro/index.html',
            icon: '🚇',
            badgeText: '🚇 3D MYSTERY'
        });

        // 2. Setup Lighting & Flashlight
        this.setupLighting();

        // 3. Build Metro Station & Passing Tunnel
        this.buildStationPlatform();
        this.buildTunnel();

        // 4. Build Initial Carriage (Carriage 0)
        this.loadCarriage(0, 'undecided');

        // Player starts with Sword in inventory & Full Health (User requirement)
        this.inventory['sword'] = true;
        this.playerHp = 100;
        this.updateHealthUI();
        this.updateHotbarUI();

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

        // Crouch / Sneak toggle button
        const crouchToggleBtn = document.getElementById('btn-toggle-crouch');
        if (crouchToggleBtn) {
            crouchToggleBtn.addEventListener('click', () => this.toggleCrouch());
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

        // Backpack / Clues Folder button
        const backpackBtn = document.getElementById('btn-backpack-folder');
        if (backpackBtn) {
            backpackBtn.addEventListener('click', () => this.toggleCluesFolderModal());
        }

        const cluesFolderClose = document.getElementById('btn-clues-folder-close');
        if (cluesFolderClose) {
            cluesFolderClose.addEventListener('click', () => this.closeCluesFolderModal());
        }

        // Pack Clue Button & Card click
        const packClueBtn = document.getElementById('btn-pack-clue');
        if (packClueBtn) {
            packClueBtn.addEventListener('click', () => this.packCurrentInspectedClue());
        }

        const clueCardContainer = document.getElementById('clue-card-container');
        if (clueCardContainer) {
            clueCardContainer.addEventListener('click', () => this.packCurrentInspectedClue());
        }

        const clueInspectModal = document.getElementById('clue-inspect-modal');
        if (clueInspectModal) {
            clueInspectModal.addEventListener('click', (e) => {
                if (e.target === clueInspectModal) {
                    this.packCurrentInspectedClue();
                }
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

    public updateLanguageUI() {
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

        const coinsLabel = document.getElementById('hud-coins-label');
        if (coinsLabel) {
            coinsLabel.innerText = isEt ? `${this.coins} COINI` : `${this.coins} COINS`;
        }

        const crosshairPrompt = document.getElementById('crosshair-prompt-text');
        if (crosshairPrompt) {
            crosshairPrompt.innerText = isEt ? 'Uuri' : 'Inspect';
        }

        const locTitle = document.getElementById('intro-loc-title');
        if (locTitle) {
            locTitle.innerText = isEt ? '📍 Kesklinna Metroojaam · 23:45' : '📍 Downtown Subway Station · 23:45';
        }
        const locSub = document.getElementById('intro-loc-sub');
        if (locSub) {
            locSub.innerText = isEt ? 'Viimane rong saabub peagi...' : 'The last train arrives shortly...';
        }

        const skipBtn = document.getElementById('btn-skip-intro');
        if (skipBtn) {
            skipBtn.innerText = isEt ? '⏭️ Jäta Intro Vahele' : '⏭️ Skip Intro';
        }

        const crouchText = document.getElementById('btn-toggle-crouch-text');
        if (crouchText) {
            crouchText.innerText = this.isCrouching
                ? (isEt ? 'Püsti [C]' : 'Stand [C]')
                : (isEt ? 'Kükita [C]' : 'Crouch [C]');
        }

        const sitText = document.getElementById('btn-toggle-sit-text');
        if (sitText) {
            sitText.innerText = this.isSitting ? (isEt ? 'Tõuse' : 'Stand') : (isEt ? 'Istu' : 'Sit');
        }

        const standBtn = document.getElementById('btn-stand-up');
        if (standBtn) {
            standBtn.innerHTML = isEt ? '<span>🧍‍♂️</span> <span>Tõuse püsti</span>' : '<span>🧍‍♂️</span> <span>Stand up</span>';
        }

        const bpBtnText = document.getElementById('backpack-btn-text');
        if (bpBtnText) {
            bpBtnText.innerText = isEt ? `Kaust (${this.collectedClues.length})` : `Folder (${this.collectedClues.length})`;
        }

        const ownerBtnText = document.getElementById('owner-panel-btn-text');
        if (ownerBtnText) {
            ownerBtnText.innerText = isEt ? 'Owner Paneel' : 'Owner Panel';
        }

        const deathTitle = document.getElementById('death-title');
        if (deathTitle) deathTitle.innerText = isEt ? 'SA SURID' : 'YOU DIED';
        const deathDesc = document.getElementById('death-desc');
        if (deathDesc) {
            deathDesc.innerText = isEt
                ? 'Must varjukäsi haaras sinust ja tõmbas su kihutavast rongist tühjusesse...'
                : 'The dark shadow hand grabbed you and dragged you from the speeding train into the void...';
        }
        const deathRetryBtn = document.getElementById('btn-death-retry');
        if (deathRetryBtn) deathRetryBtn.innerText = isEt ? '🔄 Proovi uuesti (Intro algusest)' : '🔄 Try Again (From Intro)';

        const victoryModal = document.getElementById('victory-300-modal');
        if (victoryModal) {
            const h1 = victoryModal.querySelector('h1');
            const p = victoryModal.querySelector('p');
            const rewardDiv = victoryModal.querySelector('div div:first-child');
            const rewardSub = victoryModal.querySelector('div div:last-child');
            const hubLink = victoryModal.querySelector('a.btn-modal-close');
            if (h1) h1.innerText = isEt ? 'SA PÄÄSESID VÄLJA!' : 'YOU ESCAPED!';
            if (p) p.innerText = isEt
                ? 'Alistasid Vaguni 200 lõpupahalase ja pääsesid viimasest vagunist päris maailma päikesevalguse kätte. Lõputu metroo on seljatatud!'
                : 'You defeated the Carriage 200 Final Boss and escaped the final carriage into the sunlight of the real world. The endless subway is overcome!';
            if (rewardDiv) rewardDiv.innerText = isEt ? '💰 SUUR AUTASU: +1000 Y (Yards)!' : '💰 GRAND REWARD: +1000 Y (Yards)!';
            if (rewardSub) rewardSub.innerText = isEt ? 'Sinu Yardsi saldo on uuendatud.' : 'Your Yards balance has been updated.';
            if (hubLink) hubLink.innerText = isEt ? '🏠 Tagasi Playard Hubi' : '🏠 Back to Playard Hub';
        }

        const shopModal = document.getElementById('golden-shop-modal');
        if (shopModal) {
            const shopSub = shopModal.querySelector('p');
            if (shopSub) shopSub.innerText = isEt ? 'Vagun 100 Checkpoint · Turvaline Oaas Lõputus Metroos' : 'Carriage 100 Checkpoint · Safe Oasis in the Endless Subway';
            const closeBtn = document.getElementById('btn-shop-close');
            if (closeBtn) closeBtn.innerText = isEt ? '🚪 Jätka Sõitu (Vagun 101)' : '🚪 Continue Journey (Carriage 101)';
        }

        this.updateHotbarUI();
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

            // Hotbar quick slot keys (1-9)
            if (e.code === 'Digit1') this.toggleEquipItem('sword');
            if (e.code === 'Digit2') this.toggleFlashlight();
            if (e.code === 'Digit3') this.toggleCluesFolderModal();
            if (e.code === 'Digit4' && this.inventory['key']) this.toggleEquipItem('key');
            if (e.code === 'Digit5' && this.inventory['night_vision']) this.toggleEquipItem('night_vision');
            if (e.code === 'Digit6' && this.inventory['speed_boost']) this.toggleEquipItem('speed_boost');
            if (e.code === 'Digit7' && this.inventory['clue_detector']) this.toggleEquipItem('clue_detector');
            if (e.code === 'Digit8' && this.inventory['secret_pass']) this.toggleEquipItem('secret_pass');
            if (e.code === 'Digit9' && this.inventory['radio']) this.toggleEquipItem('radio');

            // Backpack / Clues Folder shortcut (KeyB or KeyJ)
            if (e.code === 'KeyB' || e.code === 'KeyJ') {
                this.toggleCluesFolderModal();
            }

            // Crouch / Sneak / Submerge in water toggle (KeyC)
            if (e.code === 'KeyC') {
                this.toggleCrouch();
            }

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
                this.closeCluesFolderModal();
                const clueModal = document.getElementById('clue-inspect-modal');
                if (clueModal && clueModal.style.display === 'flex') {
                    this.packCurrentInspectedClue();
                }
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

            // Attack with sword if equipped
            if (this.state === 'player_free' && this.equippedItem === 'sword') {
                this.attackWithSword();
                return;
            }

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
                if ((e.target as HTMLElement)?.closest('button, a, input, .modal-box, .hotbar-slot, .playard-mobile-layer, .playard-joystick-zone, .playard-jump-btn, .playard-extra-btn')) return;
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
                if ((e.target as HTMLElement)?.closest('.playard-joystick-zone, .playard-jump-btn, .playard-extra-btn')) return;
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

        // Playard Universal Mobile & Tablet Controls
        if (isMobileOrTabletDevice()) {
            const mobileControls = new PlayardMobileControls({
                showJump: true,
                jumpLabel: 'Jump / Stand',
                onMove: (vector) => {
                    if (this.isSitting && (Math.abs(vector.x) > 0.2 || Math.abs(vector.y) > 0.2)) {
                        this.standUp();
                    }
                    this.moveKeys['KeyW'] = vector.y < -0.15;
                    this.moveKeys['KeyS'] = vector.y > 0.15;
                    this.moveKeys['KeyA'] = vector.x < -0.15;
                    this.moveKeys['KeyD'] = vector.x > 0.15;
                },
                onJump: () => {
                    if (this.isSitting) {
                        this.standUp();
                    } else if (this.aimedInteractable) {
                        this.checkInteractions();
                    }
                },
                extraButtons: [
                    {
                        id: 'metro-mobile-interact-btn',
                        label: 'Interact',
                        icon: '👉',
                        onPress: () => {
                            this.checkInteractions();
                        }
                    },
                    {
                        id: 'metro-mobile-flash-btn',
                        label: 'Flashlight',
                        icon: '🔦',
                        onPress: () => {
                            this.toggleFlashlight();
                        }
                    }
                ]
            });
            mobileControls.init();
        }
    }
}
