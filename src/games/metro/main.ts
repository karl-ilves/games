import * as THREE from 'three';
import { getCurrentUserProfile, isPlayardOwner, isTestMode } from '../../auth';
import { yardService } from '../../shared/yardService';
import { metroAudio } from './audio';

// --- Types & Interfaces ---
type GameState = 'intro_station' | 'intro_riding' | 'intro_first_stop' | 'intro_departing' | 'player_free' | 'inspecting' | 'keypad';
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
    head: THREE.Mesh;
    body: THREE.Mesh;
    isSitting: boolean;
    seatPos: THREE.Vector3;
    animType: 'phone' | 'look_window' | 'reading' | 'uncanny_stare' | 'chat';
    baseRotY: number;
    targetRotY: number;
    isCreepy: boolean;
}

interface CarriageData {
    index: number;
    branch: DirectionBranch;
    theme: 'normal' | 'flicker' | 'dark' | 'abandoned' | 'neon' | 'lounge' | 'archive' | 'anomaly';
    group: THREE.Group;
    lights: THREE.PointLight[];
    lightMeshes: THREE.Mesh[];
    passengers: AIPassenger[];
    doorFront: THREE.Group;
    doorBack: THREE.Group;
    mapMesh?: THREE.Mesh;
    puzzleSolved: boolean;
    puzzleCode?: string;
    hasKeypad?: boolean;
    inspectableItem?: THREE.Group;
    inspectableText?: { titleEt: string; descEt: string; titleEn: string; descEn: string };
}

export class LastMetroGame {
    private container: HTMLElement;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private clock: THREE.Clock;

    // Player State
    private isOwner: boolean = false;
    private lang: 'et' | 'en' = 'et';
    private state: GameState = 'intro_station';
    private currentCarIndex: number = 0; // 0 = start car, 1-10 = story, 11+ = infinite
    private branchDirection: DirectionBranch = 'undecided';
    private totalCarriagesExplored: number = 0;
    private cluesFound: number = 0;

    // FPS Controls
    private playerPos: THREE.Vector3 = new THREE.Vector3(0, 1.6, 0);
    private playerVel: THREE.Vector3 = new THREE.Vector3();
    private cameraEuler: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
    private moveKeys: { [key: string]: boolean } = {};
    private isPointerLocked: boolean = false;
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
    private shadowHandsAnimTimer: number = 0;
    private deathDragSide: number = 1;
    private deathTimer: number = 0;

    constructor() {
        const cont = document.getElementById('canvas-container');
        if (!cont) throw new Error("Canvas container not found!");
        this.container = cont;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x06080c);
        this.scene.fog = new THREE.FogExp2(0x06080c, 0.045);

        this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 150);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

        // 6. Start Loop
        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.renderer.setAnimationLoop(this.animate.bind(this));

        // Start Intro State
        this.startIntroSequence();
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

        // Stand up button for mobile
        const standBtn = document.getElementById('btn-stand-up');
        if (standBtn) {
            standBtn.addEventListener('click', () => this.standUp());
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
            });
        }

        // Lore modal close
        const loreClose = document.getElementById('btn-lore-close');
        if (loreClose) {
            loreClose.addEventListener('click', () => {
                const modal = document.getElementById('lore-modal');
                if (modal) modal.style.display = 'none';
                this.state = 'player_free';
            });
        }

        // Death retry button
        const deathRetry = document.getElementById('btn-death-retry');
        if (deathRetry) {
            deathRetry.addEventListener('click', () => this.respawnFromDeath());
        }
    }

    private updateLanguageUI() {
        const isEt = this.lang === 'et';
        const titleEl = document.getElementById('hud-game-title');
        if (titleEl) titleEl.innerText = isEt ? '🚇 VIIMANE METROO' : '🚇 LAST METRO';

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
        const platMat = new THREE.MeshStandardMaterial({ color: 0x3a424e, roughness: 0.8 });
        const platGeo = new THREE.BoxGeometry(10, 0.8, 55);
        const platform = new THREE.Mesh(platGeo, platMat);
        platform.position.set(4.5, -0.4, 0);
        platform.receiveShadow = true;
        this.stationPlatformGroup.add(platform);

        // Yellow safety edge line
        const edgeMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.4 });
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 55), edgeMat);
        edge.position.set(0.65, 0.01, 0);
        this.stationPlatformGroup.add(edge);

        // Station wall & advertising posters
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x222731, roughness: 0.9 });
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 55), wallMat);
        wall.position.set(9.5, 2.6, 0);
        this.stationPlatformGroup.add(wall);

        // Steel Rails & Ties on Track Bed
        const railMat = new THREE.MeshStandardMaterial({ color: 0xa4b0be, metalness: 0.9, roughness: 0.2 });
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
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x4b6584, roughness: 0.5 });
        for (let z = -20; z <= 20; z += 10) {
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.6), pillarMat);
            pillar.position.set(3.5, 2.1, z);
            this.stationPlatformGroup.add(pillar);
        }

        // Platform ceiling lights
        for (let z = -18; z <= 18; z += 9) {
            const pLight = new THREE.PointLight(0xfff1cf, 0.9, 14);
            pLight.position.set(4, 4, z);
            this.stationPlatformGroup.add(pLight);
        }

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
        const tunnelMat = new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.95, side: THREE.BackSide });
        const tunnelGeo = new THREE.CylinderGeometry(5.5, 5.5, 120, 24, 1, true);
        const tunnelMesh = new THREE.Mesh(tunnelGeo, tunnelMat);
        tunnelMesh.rotation.x = Math.PI / 2;
        tunnelMesh.position.set(0, 1.5, 0);
        this.tunnelGroup.add(tunnelMesh);

        // Periodic tunnel emergency lights
        for (let z = -50; z <= 50; z += 12) {
            const lampMat = new THREE.MeshBasicMaterial({ color: 0xffa502 });
            const lampMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), lampMat);
            lampMesh.position.set(-4.5, 2.5, z);
            this.tunnelGroup.add(lampMesh);
        }

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

        // Windows (Pure pitch-black void out of windows - "aknast pole midagi näha")
        const blackGlassMat = new THREE.MeshBasicMaterial({ color: 0x010204 });
        [-carWidth / 2, carWidth / 2].forEach(x => {
            for (let z = -7; z <= 7; z += 4.5) {
                if (Math.abs(z) < 2) continue; // skip door entry
                const windowPane = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 2.5), blackGlassMat);
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
            color: 0x99ccdd,
            transparent: true,
            opacity: 0.35,
            roughness: 0.1,
            metalness: 0.2
        });
        [-1.25, 1.25].forEach(px => {
            [-1.8, 1.8].forEach(pz => {
                const partitionFrame = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.3, 0.7), poleMat);
                partitionFrame.position.set(px, 0.85, pz);
                carGroup.add(partitionFrame);

                const partitionGlass = new THREE.Mesh(new THREE.BoxGeometry(0.015, 1.1, 0.6), partitionGlassMat);
                partitionGlass.position.set(px, 0.85, pz);
                carGroup.add(partitionGlass);
            });
        });

        // 6. Dual Row Passenger Bucket Seats with Padded Cushions and Dividers
        const seatBaseColor = theme === 'lounge' ? 0x6c5ce7 : theme === 'abandoned' ? 0x2d3436 : 0x0984e3;
        const seatBaseMat = new THREE.MeshStandardMaterial({ color: seatBaseColor, roughness: 0.65 });
        const cushionMat = new THREE.MeshStandardMaterial({ color: 0x1e3799, roughness: 0.8 });

        [-1.3, 1.3].forEach(x => {
            for (let z = -7.5; z <= 7.5; z += 2.8) {
                const seatBench = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 1.8), seatBaseMat);
                seatBench.position.set(x, 0.35, z);
                carGroup.add(seatBench);

                const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 1.7), cushionMat);
                seatCushion.position.set(x, 0.47, z);
                carGroup.add(seatCushion);

                const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.75, 1.8), seatBaseMat);
                seatBack.position.set(x > 0 ? x + 0.3 : x - 0.3, 0.75, z);
                carGroup.add(seatBack);
            }
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
            pLight.castShadow = true;
            pLight.shadow.bias = -0.001;
            carGroup.add(pLight);
            lights.push(pLight);
        }

        // 9. Interactive Metro Route Map on Interior Wall
        let mapMesh: THREE.Mesh | undefined;
        const mapCanvas = document.createElement('canvas');
        mapCanvas.width = 512;
        mapCanvas.height = 128;
        const ctx = mapCanvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#1e272e';
            ctx.fillRect(0, 0, 512, 128);
            ctx.strokeStyle = '#00f2fe';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(30, 64);
            ctx.lineTo(480, 64);
            ctx.stroke();

            // Station dots
            const stations = ['CENTRAL', 'PARK', 'RIVER', 'NORTH', 'TERMINUS'];
            stations.forEach((st, idx) => {
                const x = 50 + idx * 95;
                ctx.fillStyle = '#ffd32a';
                ctx.beginPath();
                ctx.arc(x, 64, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 16px monospace';
                ctx.fillText(st, x - 25, 40);
            });
        }
        const mapTexture = new THREE.CanvasTexture(mapCanvas);
        const mapMat = new THREE.MeshStandardMaterial({ map: mapTexture, roughness: 0.4 });
        mapMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 2.4), mapMat);
        mapMesh.position.set(1.65, 1.8, 0);
        mapMesh.rotation.y = -Math.PI / 2;
        carGroup.add(mapMesh);

        // 10. End Gangway Doors (Front = +Z / Right Branch, Back = -Z / Left Branch)
        const doorFront = this.buildGangwayDoor(carWidth, carHeight, 1, index, branch, theme);
        doorFront.position.set(0, 0, carLength / 2);
        carGroup.add(doorFront);

        const doorBack = this.buildGangwayDoor(carWidth, carHeight, -1, index, branch, theme);
        doorBack.position.set(0, 0, -carLength / 2);
        carGroup.add(doorBack);

        // 11. Puzzle / Special Item setup for Carriage 6, 11+
        let inspectableItem: THREE.Group | undefined;
        let inspectableText: any;
        if (index === 6) {
            inspectableItem = this.createInspectableNote();
            inspectableItem.position.set(-1.1, 0.62, 2.5);
            carGroup.add(inspectableItem);
            inspectableText = {
                titleEt: '📜 Vana Metroopilet ja Märkmik (1987)',
                descEt: '„Rong nr 404 väljus viimast korda 14. oktoobril 1987. Peatusi ei registreeritud enam kunagi. Süsteem lukustus igaveseks ringiks...”',
                titleEn: '📜 Vintage Subway Pass & Notebook (1987)',
                descEn: '“Train No. 404 departed for the final time on October 14, 1987. No station arrivals were ever recorded again. The track sealed into an infinite loop...”'
            };
        } else if (index >= 11 && index % 2 === 1) {
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
            puzzleSolved: index < 11,
            puzzleCode: index >= 11 ? '1987' : undefined,
            hasKeypad: index >= 11 && index % 2 === 1,
            inspectableItem,
            inspectableText
        };
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
        else if (carIndex >= 11) count = Math.random() < 0.3 ? 1 : 0;

        const seatPositions = [
            new THREE.Vector3(-1.1, 0.5, -6),
            new THREE.Vector3(1.1, 0.5, -4),
            new THREE.Vector3(-1.1, 0.5, -1),
            new THREE.Vector3(1.1, 0.5, 2),
            new THREE.Vector3(-1.1, 0.5, 5),
            new THREE.Vector3(1.1, 0.5, 7)
        ];

        const skinPalette = [0xf5cd79, 0xf7d794, 0xdfe6e9, 0xd1a374, 0x805533];
        const outfitStyles = [
            { top: 0x2c3e50, pants: 0x1e272e, coat: true, hair: 0x2d3436, hairType: 'short' },
            { top: 0xe74c3c, pants: 0x2d3436, coat: false, hair: 0x8b4513, hairType: 'hoodie' },
            { top: 0x16a085, pants: 0x34495e, coat: true, hair: 0x111111, hairType: 'ponytail' },
            { top: 0x8e44ad, pants: 0x1b1464, coat: false, hair: 0xd63031, hairType: 'long' },
            { top: 0xd35400, pants: 0x2f3640, coat: true, hair: 0x2d3436, hairType: 'beanie' },
            { top: 0x27ae60, pants: 0x2c2c54, coat: false, hair: 0x636e72, hairType: 'headphones' }
        ];

        for (let i = 0; i < count; i++) {
            const seatPos = seatPositions[i % seatPositions.length];
            const style = outfitStyles[i % outfitStyles.length];
            const skinColor = skinPalette[i % skinPalette.length];

            const pGroup = new THREE.Group();
            pGroup.position.copy(seatPos);

            const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.55 });
            const clothingTopMat = new THREE.MeshStandardMaterial({ color: style.top, roughness: 0.75 });
            const clothingPantsMat = new THREE.MeshStandardMaterial({ color: style.pants, roughness: 0.8 });
            const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.4 });
            const hairMat = new THREE.MeshStandardMaterial({ color: style.hair, roughness: 0.8 });

            // 1. Torso & Jacket
            const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.52, 0.28), clothingTopMat);
            torso.position.set(0, 0.32, 0);
            pGroup.add(torso);

            if (style.coat) {
                const collar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.3), clothingTopMat);
                collar.position.set(0, 0.56, 0);
                pGroup.add(collar);
            }

            // 2. Head, Neck & Hair / Accessories
            const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 8), skinMat);
            neck.position.set(0, 0.62, 0);
            pGroup.add(neck);

            const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), skinMat);
            head.position.set(0, 0.78, 0);
            pGroup.add(head);

            // Nose
            const nose = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.05), skinMat);
            nose.position.set(0, 0.77, 0.15);
            head.add(nose);

            // Hair Styles
            if (style.hairType === 'short') {
                const hair = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.32), hairMat);
                hair.position.set(0, 0.88, -0.02);
                pGroup.add(hair);
            } else if (style.hairType === 'long') {
                const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.32), hairMat);
                hairTop.position.set(0, 0.88, -0.02);
                pGroup.add(hairTop);
                const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.35, 0.12), hairMat);
                hairBack.position.set(0, 0.7, -0.14);
                pGroup.add(hairBack);
            } else if (style.hairType === 'ponytail') {
                const hair = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), hairMat);
                hair.position.set(0, 0.8, -0.04);
                pGroup.add(hair);
                const pony = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.28, 6), hairMat);
                pony.rotation.x = Math.PI / 4;
                pony.position.set(0, 0.75, -0.2);
                pGroup.add(pony);
            } else if (style.hairType === 'beanie') {
                const beanieMat = new THREE.MeshStandardMaterial({ color: 0x34495e, roughness: 0.9 });
                const beanie = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 14), beanieMat);
                beanie.position.set(0, 0.84, 0);
                pGroup.add(beanie);
            } else if (style.hairType === 'headphones') {
                const hpMat = new THREE.MeshStandardMaterial({ color: 0xd63031, metalness: 0.6, roughness: 0.3 });
                const band = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 6, 16, Math.PI), hpMat);
                band.rotation.z = Math.PI / 2;
                band.position.set(0, 0.8, 0);
                pGroup.add(band);
                [-0.16, 0.16].forEach(hx => {
                    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8), hpMat);
                    cup.rotation.z = Math.PI / 2;
                    cup.position.set(hx, 0.78, 0);
                    pGroup.add(cup);
                });
            }

            // 3. Seated Legs & Shoes
            // Thighs (extending forward along local Z)
            [-0.11, 0.11].forEach(lx => {
                const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.38), clothingPantsMat);
                thigh.position.set(lx, 0.08, 0.16);
                pGroup.add(thigh);

                // Calves (extending downward along local Y)
                const calf = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.38, 0.13), clothingPantsMat);
                calf.position.set(lx, -0.15, 0.32);
                pGroup.add(calf);

                // Shoes / Sneakers
                const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.22), shoeMat);
                shoe.position.set(lx, -0.34, 0.36);
                pGroup.add(shoe);
            });

            // 4. Arms & Props (Smartphones, Newspapers, Books)
            // Left & Right Upper Arms
            [-0.22, 0.22].forEach(ax => {
                const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.32, 6), clothingTopMat);
                arm.position.set(ax, 0.32, 0.05);
                pGroup.add(arm);
            });

            // Interactive Prop
            if (i % 2 === 0) {
                // Smartphone with subtle glowing screen
                const phoneMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3 });
                const phone = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.015, 0.18), phoneMat);
                phone.rotation.x = -Math.PI / 6;
                phone.position.set(0, 0.32, 0.26);
                pGroup.add(phone);

                // Hands holding phone
                [-0.08, 0.08].forEach(hx => {
                    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.038, 6, 6), skinMat);
                    hand.position.set(hx, 0.3, 0.25);
                    pGroup.add(hand);
                });

                // Subtle blue screen light illuminating face
                const screenLight = new THREE.PointLight(0x00d2d3, 0.45, 1.2);
                screenLight.position.set(0, 0.42, 0.26);
                pGroup.add(screenLight);
            } else {
                // Metro Newspaper
                const paperMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.9 });
                const paper = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.01), paperMat);
                paper.rotation.x = -Math.PI / 4;
                paper.position.set(0, 0.35, 0.24);
                pGroup.add(paper);

                [-0.12, 0.12].forEach(hx => {
                    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.038, 6, 6), skinMat);
                    hand.position.set(hx, 0.32, 0.22);
                    pGroup.add(hand);
                });
            }

            const baseRotY = seatPos.x > 0 ? -Math.PI / 2 : Math.PI / 2;
            pGroup.rotation.y = baseRotY;

            const isCreepy = carIndex === 2 && i === 1; // Special uncanny staring passenger
            passengers.push({
                group: pGroup,
                head,
                body: torso,
                isSitting: true,
                seatPos,
                animType: isCreepy ? 'uncanny_stare' : i % 2 === 0 ? 'phone' : 'look_window',
                baseRotY,
                targetRotY: baseRotY,
                isCreepy
            });

            carGroup.add(pGroup);
        }
    }

    private createInspectableNote(): THREE.Group {
        const itemGroup = new THREE.Group();
        const noteMat = new THREE.MeshStandardMaterial({ color: 0xf6e58d, roughness: 0.8 });
        const note = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.02, 0.35), noteMat);
        itemGroup.add(note);

        // Pulsing glow indicator
        const glow = new THREE.PointLight(0xffd32a, 0.6, 2.5);
        glow.position.set(0, 0.3, 0);
        itemGroup.add(glow);

        return itemGroup;
    }

    private createKeypadProp(): THREE.Group {
        const keypadGroup = new THREE.Group();
        const boxMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, metalness: 0.8 });
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.4, 0.08), boxMat);
        keypadGroup.add(box);

        const screenMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
        const screen = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.09), screenMat);
        screen.position.set(0, 0.1, 0);
        keypadGroup.add(screen);

        return keypadGroup;
    }

    // --- Story & Anomaly Transitions ---

    public loadCarriage(index: number, branch: DirectionBranch) {
        console.log(`🚇 Loading Carriage ${index} (Branch: ${branch})`);
        this.currentCarIndex = index;
        this.totalCarriagesExplored++;
        if (branch !== 'undecided') this.branchDirection = branch;

        // Remove previous carriage
        if (this.currentCarriage) {
            this.scene.remove(this.currentCarriage.group);
        }

        // Clean up previous anomalies (shadow hands, stalkers, modals)
        this.shadowHandsGroups.forEach(h => this.scene.remove(h));
        this.shadowHandsGroups = [];
        this.shadowHandsActive = false;
        if (this.stalkerMesh) {
            this.scene.remove(this.stalkerMesh);
            this.stalkerMesh = null;
            this.stalkerActive = false;
        }
        const deathModal = document.getElementById('death-modal');
        if (deathModal) deathModal.style.display = 'none';

        // Determine Theme based on story progression or infinite randomness
        let theme: CarriageData['theme'] = 'normal';
        if (index === 4) theme = 'flicker';
        else if (index === 7 || index === 9) theme = 'dark';
        else if (index === 10) theme = 'dark';
        else if (index >= 11) {
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

        // Trigger story events per carriage index
        this.triggerCarriageStoryEvent(index);
    }

    private triggerCarriageStoryEvent(index: number) {
        // Ramping eerie drone
        metroAudio.setEerinessLevel(Math.min(1.0, index * 0.1));

        switch (index) {
            case 1:
                // Carriage 1: Whispering anomaly
                setTimeout(() => {
                    metroAudio.playWhisper(4.0);
                    setTimeout(() => {
                        this.showThought('Kas ma kujutasin seda ette?', 'Did I imagine that?');
                    }, 4200);
                }, 3000);
                break;

            case 2:
                // Carriage 2: Uncanny Passenger staring
                this.showThought('See reisija ees... ta käitub imelikult.', 'That passenger ahead... they are behaving strangely.');
                break;

            case 3:
                // Carriage 3: Glitching Map
                this.showThought('Metrookaart seinal... mis jaam see on?', 'The subway map on the wall... what station is that?');
                break;

            case 4:
                // Carriage 4: Flickering Lights
                this.startLightFlickerAnomaly();
                break;

            case 5:
                // Carriage 5: Window void anomaly
                this.showThought('Aknast välja vaadates... see ei ole linn.', 'Looking out the window... that is not the city.');
                break;

            case 6:
                // Carriage 6: Secret Clue Investigation
                this.showThought('Istmel on midagi. Ma peaksin seda uurima.', 'There is something on the seat. I should inspect it.');
                break;

            case 7:
                // Carriage 7: Backway sealed
                this.showThought('Tagasiteed enam ei ole. Ma pean edasi liikuma.', 'There is no way back. I must keep moving forward.');
                break;

            case 8:
                // Carriage 8: Exterior door burst
                this.startDoorGlitchAnomaly();
                break;

            case 9:
                // Carriage 9: Ghost Stalker & Void Shadow Hands Event
                this.spawnStalkerEntity();
                this.showThought('Seal ees seisab keegi... ta lihtsalt jälgib mind.', 'Someone is standing ahead... they are just watching me.');
                break;

            case 10:
                // Carriage 10: Major Glitch & Jump Scare
                this.startCarriage10JumpScare();
                break;

            default:
                if (index >= 11) {
                    this.showThought(
                        `Vagun ${index}. Metroo ei lõpegi...`,
                        `Carriage ${index}. The metro is endless...`
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
            'Uksed kadusid ära... Tühjusest sirutub välja must varjukäsi! Ära mine selle lähedalegi!',
            'The doors vanished into the void... A black shadow hand is reaching in! Do not go near it!'
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
        if (modal && title && desc) {
            title.innerText = this.lang === 'et' ? 'SA SURID' : 'YOU DIED';
            desc.innerText = this.lang === 'et'
                ? 'Must varjukäsi haaras sinust ja tõmbas su kihutavast rongist tühjusesse...'
                : 'The dark shadow hand grabbed you and dragged you from the speeding train into the void...';
            modal.style.display = 'flex';
        }
    }

    public respawnFromDeath() {
        const modal = document.getElementById('death-modal');
        if (modal) modal.style.display = 'none';

        // Replay full cinematic intro sequence from the beginning (kui panen retry siis peab ka intro tulema)
        this.replayIntro();
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

        // Camera starts outside on station platform looking down the track at incoming tunnel
        this.playerPos.set(3.8, 1.6, -3.5);
        this.cameraEuler.set(0, -Math.PI / 1.55, 0);

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

    public standUp() {
        this.state = 'player_free';
        this.playerPos.y = 1.6;
        this.playerPos.x = 0; // step into aisle
        const standBtn = document.getElementById('btn-stand-up');
        if (standBtn) standBtn.style.display = 'none';
        metroAudio.playFootstep();

        // Only show direction choice thought in the very first carriage (Carriage 0)
        if (this.currentCarIndex === 0) {
            this.cameraEuler.y = Math.PI; // Look forward down the aisle towards +Z
            this.showThought(
                'Vali suund: kas minna ettepoole (PAREM) või tahapoole (VASAK)?',
                'Choose a direction: head forward (RIGHT) or backward (LEFT)?'
            );
        }
    }

    // --- Input Handling & Player Movement ---

    private setupInputs() {
        window.addEventListener('keydown', (e) => {
            this.moveKeys[e.code] = true;

            // Stand up from initial seat if stand button is visible
            const standBtn = document.getElementById('btn-stand-up');
            if (standBtn && standBtn.style.display !== 'none' && (e.code === 'KeyW' || e.code === 'KeyE' || e.code === 'Space' || e.code.startsWith('Arrow'))) {
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
        });

        window.addEventListener('keyup', (e) => {
            this.moveKeys[e.code] = false;
        });

        // Mouse click & drag / Pointer Lock for Camera Look
        const handleStartLook = (clientX: number, clientY: number) => {
            metroAudio.enableAudio();
            this.isMouseDown = true;
            this.lastMouseX = clientX;
            this.lastMouseY = clientY;
            if (this.state === 'player_free') {
                this.checkInteractions();
            }
        };

        const handleMoveLook = (clientX: number, clientY: number, movementX?: number, movementY?: number) => {
            if (this.state !== 'player_free') return;

            if (this.isPointerLocked && movementX !== undefined && movementY !== undefined) {
                const sensitivity = 0.0024;
                this.cameraEuler.y -= movementX * sensitivity;
                this.cameraEuler.x -= movementY * sensitivity;
                this.cameraEuler.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.cameraEuler.x));
            } else if (this.isMouseDown) {
                const dx = clientX - this.lastMouseX;
                const dy = clientY - this.lastMouseY;
                this.lastMouseX = clientX;
                this.lastMouseY = clientY;

                const sensitivity = 0.0038;
                this.cameraEuler.y -= dx * sensitivity;
                this.cameraEuler.x -= dy * sensitivity;
                this.cameraEuler.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.cameraEuler.x));
            }
        };

        const handleEndLook = () => {
            this.isMouseDown = false;
        };

        window.addEventListener('mousedown', (e) => {
            if ((e.target as HTMLElement)?.closest('button, a, input, .modal-box')) return;
            handleStartLook(e.clientX, e.clientY);
            if (this.state === 'player_free' && !this.isPointerLocked) {
                this.renderer.domElement.requestPointerLock?.();
            }
        });

        window.addEventListener('mousemove', (e) => {
            handleMoveLook(e.clientX, e.clientY, e.movementX, e.movementY);
        });

        window.addEventListener('mouseup', () => handleEndLook());

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
        });

        // Touch controls on mobile/tablets
        window.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                if ((e.target as HTMLElement)?.closest('button, a, input, .modal-box')) return;
                metroAudio.enableAudio();
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
                this.isMouseDown = true;
                this.lastMouseX = e.touches[0].clientX;
                this.lastMouseY = e.touches[0].clientY;
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0 && this.state === 'player_free') {
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

    private toggleFlashlight() {
        this.flashlightOn = !this.flashlightOn;
        if (this.flashlight) {
            this.flashlight.intensity = this.flashlightOn ? 2.5 : 0;
        }
        metroAudio.playFlashlightClick();
    }

    public checkInteractions() {
        if (!this.currentCarriage || this.state !== 'player_free') return;

        // 1. Inspectable Note / Clue
        if (this.currentCarriage.inspectableItem) {
            const dist = this.playerPos.distanceTo(this.currentCarriage.inspectableItem.position);
            if (dist < 4.5) {
                if (this.currentCarriage.hasKeypad) {
                    this.openKeypadModal();
                } else {
                    this.openLoreModal();
                }
                return;
            }
        }

        // 2. Door Interactions (End Gangways)
        const now = performance.now();
        if (this.branchDirection === 'right') {
            if (this.playerPos.z > 8.0) {
                // Front Door -> Forward
                this.loadCarriage(this.currentCarIndex + 1, 'right');
            } else if (this.playerPos.z < -7.5) {
                // Back Door -> LOCKED (Previous Carriage)
                this.playerPos.z = -7.4;
                if (now - this.lastLockedDoorSoundTime > 1000) {
                    this.lastLockedDoorSoundTime = now;
                    metroAudio.playDoorLocked();
                    this.showThought(
                        'Uks on lukus. Tagasi eelmisesse vagunisse ei saa minna. Edasi liikumine on ainus võimalus.',
                        'The door is locked. You cannot return to the previous carriage. Moving forward is the only way.'
                    );
                }
            }
        } else if (this.branchDirection === 'left') {
            if (this.playerPos.z < -8.0) {
                // Back Door -> Forward on left branch
                this.loadCarriage(this.currentCarIndex + 1, 'left');
            } else if (this.playerPos.z > 7.5) {
                // Front Door -> LOCKED (Previous Carriage)
                this.playerPos.z = 7.4;
                if (now - this.lastLockedDoorSoundTime > 1000) {
                    this.lastLockedDoorSoundTime = now;
                    metroAudio.playDoorLocked();
                    this.showThought(
                        'Uks on lukus. Tagasi eelmisesse vagunisse ei saa minna. Edasi liikumine on ainus võimalus.',
                        'The door is locked. You cannot return to the previous carriage. Moving forward is the only way.'
                    );
                }
            }
        } else {
            // Undecided (Carriage 0)
            if (this.playerPos.z > 8.0) {
                this.loadCarriage(1, 'right');
            } else if (this.playerPos.z < -8.0) {
                this.loadCarriage(1, 'left');
            }
        }
    }

    public openLoreModal() {
        this.state = 'inspecting';
        metroAudio.playItemInspect();
        this.cluesFound++;

        const modal = document.getElementById('lore-modal');
        const title = document.getElementById('lore-title');
        const desc = document.getElementById('lore-desc');
        if (modal && title && desc && this.currentCarriage?.inspectableText) {
            title.innerText = this.lang === 'et' ? this.currentCarriage.inspectableText.titleEt : this.currentCarriage.inspectableText.titleEn;
            desc.innerText = this.lang === 'et' ? this.currentCarriage.inspectableText.descEt : this.currentCarriage.inspectableText.descEn;
            modal.style.display = 'flex';
        }
    }

    public openKeypadModal() {
        this.state = 'keypad';
        metroAudio.playKeypadBeep(false);

        const modal = document.getElementById('keypad-modal');
        const codeDisplay = document.getElementById('keypad-display');
        if (modal && codeDisplay) {
            codeDisplay.innerText = '____';
            modal.style.display = 'flex';
        }
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
                this.showThought('Kood õige! Uks avanes.', 'Code correct! The door unlocked.');
            } else {
                metroAudio.playKeypadBeep(false);
                input.value = '';
                this.showThought('Vale kood. Proovi uuesti.', 'Wrong code. Try again.');
            }
        }
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
            this.cameraEuler.y = THREE.MathUtils.lerp(this.cameraEuler.y, -Math.PI / 2, delta * 2.0);
        }

        // Side sliding doors animation
        const openOffset = this.introSideDoorsOpen ? 0.95 : 0;
        this.sideDoorMeshes.forEach(door => {
            const targetZ = door.baseZ + door.dir * openOffset;
            door.mesh.position.z = THREE.MathUtils.lerp(door.mesh.position.z, targetZ, delta * 6);
        });

        // 1. Move passing tunnel for sense of forward subway speed
        if (this.trainSpeed > 0) {
            this.tunnelOffsetZ += this.trainSpeed * delta;
            this.tunnelGroup.position.z = (this.tunnelOffsetZ % 12);
        }

        // 2. Realistic Passenger Breathing & Staring Logic
        if (this.currentCarriage) {
            const time = performance.now() * 0.0015;
            this.currentCarriage.passengers.forEach((p, pIdx) => {
                // Subtle breathing chest expansion & head tilt
                const breath = Math.sin(time * 2.0 + pIdx * 1.5) * 0.012;
                p.body.position.y = 0.32 + breath;

                if (p.isCreepy) {
                    const distToPlayer = this.playerPos.distanceTo(p.group.position);
                    if (distToPlayer < 4.0) {
                        // Turn head directly to stare at player
                        const angle = Math.atan2(this.playerPos.x - p.group.position.x, this.playerPos.z - p.group.position.z);
                        p.head.rotation.y = angle - p.group.rotation.y;
                    } else {
                        p.head.rotation.y = 0;
                    }
                } else if (p.animType === 'phone') {
                    p.head.rotation.x = 0.22 + Math.sin(time * 1.2 + pIdx) * 0.04;
                } else if (p.animType === 'look_window') {
                    p.head.rotation.y = Math.sin(time * 0.8 + pIdx) * 0.15;
                }
            });
        }

        // 3. Ghost Stalker Creeping Logic in Carriage 9
        if (this.stalkerActive && this.stalkerMesh) {
            const toStalker = new THREE.Vector3().subVectors(this.stalkerMesh.position, this.playerPos).normalize();
            const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.cameraEuler);
            const dot = forward.dot(toStalker);

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

        // 3b. Ultra-Realistic Shadow Hand Reaching & Instant Sensitive Death Collision
        if (this.shadowHandsActive && this.state === 'player_free') {
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

        // 4. Keyboard Camera Turning (Arrows & Q/E)
        if (this.state === 'player_free') {
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

        // 5. Player Physics & Movement (when player_free)
        if (this.state === 'player_free' && this.playerPos.y >= 1.4) {
            const speed = 3.6;
            const moveDir = new THREE.Vector3();

            if (this.moveKeys['KeyW']) moveDir.z -= 1;
            if (this.moveKeys['KeyS']) moveDir.z += 1;
            if (this.moveKeys['KeyA']) moveDir.x -= 1;
            if (this.moveKeys['KeyD']) moveDir.x += 1;

            if (moveDir.lengthSq() > 0) {
                moveDir.normalize();
                moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraEuler.y);

                this.playerPos.x += moveDir.x * speed * delta;
                this.playerPos.z += moveDir.z * speed * delta;

                // Train carriage boundary collision
                this.playerPos.x = Math.max(-1.4, Math.min(1.4, this.playerPos.x));

                // Head bob & footsteps
                this.headBobTimer += delta * 12;
                this.stepTimer += delta;
                if (this.stepTimer > 0.48) {
                    this.stepTimer = 0;
                    metroAudio.playFootstep();
                }
            }

            // Door Navigation & Locked Back Door Collision
            const now = performance.now();
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

        // 6. Update Camera
        const headBobOffset = Math.sin(this.headBobTimer) * 0.04;
        this.camera.position.set(
            this.playerPos.x,
            this.playerPos.y + (this.state === 'player_free' ? headBobOffset : 0),
            this.playerPos.z
        );
        this.camera.quaternion.setFromEuler(this.cameraEuler);

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
    (window as any).__lastMetro = new LastMetroGame();
});
