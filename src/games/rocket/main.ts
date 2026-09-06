import * as THREE from 'three';
import { yardService } from '../../shared/yardService';
import { getCurrentUserProfile, isPlayardOwner, isTestMode } from '../../auth';
import { isMobileOrTabletDevice } from '../../shared/mobileControls';

// Ultra-Realistic Explosion Audio Synthesizer via Web Audio API
class RocketAudio {
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

    public playWhoosh() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    }

    public playUltraRealisticBoom() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // 1. Heavy Supersonic Shockwave Crack (Pressure Wave)
        const snapLen = this.ctx.sampleRate * 0.15;
        const snapBuf = this.ctx.createBuffer(1, snapLen, this.ctx.sampleRate);
        const snapData = snapBuf.getChannelData(0);
        for (let i = 0; i < snapLen; i++) {
            snapData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.02));
        }
        const snapSrc = this.ctx.createBufferSource();
        snapSrc.buffer = snapBuf;

        const snapFilter = this.ctx.createBiquadFilter();
        snapFilter.type = 'highpass';
        snapFilter.frequency.setValueAtTime(800, now);
        snapFilter.frequency.exponentialRampToValueAtTime(120, now + 0.15);

        const snapGain = this.ctx.createGain();
        snapGain.gain.setValueAtTime(0.9, now);
        snapGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        snapSrc.connect(snapFilter);
        snapFilter.connect(snapGain);
        snapGain.connect(this.ctx.destination);
        snapSrc.start(now);

        // 2. Subterranean Sub-Bass Blast (Chest-Punching Rumble 25Hz - 55Hz)
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(95, now);
        subOsc.frequency.exponentialRampToValueAtTime(22, now + 0.85);

        subGain.gain.setValueAtTime(1.0, now);
        subGain.gain.exponentialRampToValueAtTime(0.005, now + 0.85);

        subOsc.connect(subGain);
        subGain.connect(this.ctx.destination);
        subOsc.start(now);
        subOsc.stop(now + 0.85);

        // 3. Rolling Roaring Fireball Inferno (Low-Mid Noise Plume)
        const roarLen = this.ctx.sampleRate * 1.4;
        const roarBuf = this.ctx.createBuffer(1, roarLen, this.ctx.sampleRate);
        const roarData = roarBuf.getChannelData(0);
        for (let i = 0; i < roarLen; i++) {
            roarData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.45));
        }
        const roarSrc = this.ctx.createBufferSource();
        roarSrc.buffer = roarBuf;

        const roarFilter = this.ctx.createBiquadFilter();
        roarFilter.type = 'lowpass';
        roarFilter.frequency.setValueAtTime(1400, now);
        roarFilter.frequency.exponentialRampToValueAtTime(80, now + 1.2);

        const roarGain = this.ctx.createGain();
        roarGain.gain.setValueAtTime(0.85, now);
        roarGain.gain.exponentialRampToValueAtTime(0.005, now + 1.2);

        roarSrc.connect(roarFilter);
        roarFilter.connect(roarGain);
        roarGain.connect(this.ctx.destination);
        roarSrc.start(now);

        // 4. Secondary Concrete Debris & Clatter Rumble
        setTimeout(() => {
            if (!this.ctx || !this.soundEnabled) return;
            const debrisNow = this.ctx.currentTime;
            const clatterOsc = this.ctx.createOscillator();
            const clatterGain = this.ctx.createGain();
            clatterOsc.type = 'triangle';
            clatterOsc.frequency.setValueAtTime(80, debrisNow);
            clatterOsc.frequency.exponentialRampToValueAtTime(35, debrisNow + 0.6);

            clatterGain.gain.setValueAtTime(0.4, debrisNow);
            clatterGain.gain.exponentialRampToValueAtTime(0.01, debrisNow + 0.6);

            clatterOsc.connect(clatterGain);
            clatterGain.connect(this.ctx.destination);
            clatterOsc.start(debrisNow);
            clatterOsc.stop(debrisNow + 0.6);
        }, 180);
    }

    public playBoom() {
        this.playUltraRealisticBoom();
    }

    public playHitChime() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(1046.50, now + 0.08); // C6

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    }

    public playFanfare() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const now = this.ctx!.currentTime + idx * 0.12;
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(now);
            osc.stop(now + 0.3);
        });
    }

    public playPurchase() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }
}

// Rocket Type Definitions
interface RocketType {
    id: string;
    name: string;
    icon: string;
    desc: string;
    speed: number;
    color: number;
    trailColor: number;
    price: number;
    scoreMultiplier: number;
    blastRadius: number;
}

const ROCKET_CATALOG: RocketType[] = [
    {
        id: 'red_dart',
        name: 'Red Dart',
        icon: '🔴',
        desc: 'Klassikaline kiire arkaad-rakett tugeva kineetilise laenguga.',
        speed: 90,
        color: 0xff4757,
        trailColor: 0xffa502,
        price: 0,
        scoreMultiplier: 1.0,
        blastRadius: 8.5
    },
    {
        id: 'neon_turbo',
        name: 'Neon Turbo',
        icon: '⚡',
        desc: 'Elektri-tsüaani hüperkiire rakett suurema plahvatusraadiusega ja +25% punktidega.',
        speed: 120,
        color: 0x00f2fe,
        trailColor: 0x4facfe,
        price: 500,
        scoreMultiplier: 1.25,
        blastRadius: 11.0
    },
    {
        id: 'rainbow_comet',
        name: 'Rainbow Comet',
        icon: '🌈',
        desc: 'Võimas plahvatusega komeetrakett purustava lööklaine ja +50% boonusega.',
        speed: 140,
        color: 0xff6b81,
        trailColor: 0x2ed573,
        price: 1200,
        scoreMultiplier: 1.5,
        blastRadius: 14.0
    },
    {
        id: 'quantum_starfire',
        name: 'Quantum Starfire',
        icon: '🌟',
        desc: 'Ülim supernoova rakett, mis pühib terved hooned ja annab 2.0x topeltpunktid!',
        speed: 175,
        color: 0xffd32a,
        trailColor: 0xff9f1a,
        price: 2500,
        scoreMultiplier: 2.0,
        blastRadius: 18.0
    }
];

// Destructible Building Interface
interface DestructibleBuilding {
    id: string;
    name: string;
    group: THREE.Group;
    mesh: THREE.Object3D;
    type: 'building';
    basePoints: number;
    position: THREE.Vector3;
    size: { w: number; h: number; d: number };
    color: number;
    active: boolean;
    respawnTimer: number;
    hp: number;
    maxHp: number;
    rubbleMesh?: THREE.Mesh;
}

// Active Flying Debris Piece (Flying building chunks)
interface FlyingDebris {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    rotAxis: THREE.Vector3;
    rotSpeed: number;
    isGrounded: boolean;
    age: number;
    maxAge: number;
}

// Active In-Flight Rocket
interface InFlightRocket {
    mesh: THREE.Object3D;
    velocity: THREE.Vector3;
    targetPos: THREE.Vector3;
    rocketType: RocketType;
    spawnTime: number;
}

export class RocketGame {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private audio: RocketAudio;

    // Aerial View & Targeting Ring
    private targetRing: THREE.Group;
    private ringPosition = new THREE.Vector3(0, 0.2, 0);
    private ringMaterial: THREE.MeshBasicMaterial;
    private beaconBeam: THREE.Mesh;
    private groundPlaneMesh: THREE.Mesh | null = null;

    // Movement & Controls
    private keys: { [key: string]: boolean } = {};
    private mobileMoveVector = { x: 0, y: 0 };
    private isMobileDevice = false;
    private raycaster = new THREE.Raycaster();
    private mouseCoords = new THREE.Vector2(0, 0);

    // Destructible Buildings, Debris & Rockets
    public targets: DestructibleBuilding[] = [];
    private activeDebris: FlyingDebris[] = [];
    public activeRockets: InFlightRocket[] = [];
    private particlePuffGroup: THREE.Group;
    private debrisGroup: THREE.Group;

    // Scoring, Upgrades & Round
    public currentScore = 0;
    private totalPointsBank = 0;
    public shotsFired = 0;
    public targetsHit = 0;
    private roundDuration = 75; // seconds
    private roundRemaining = 75;
    private roundActive = true;
    private roundTimerInterval: any = null;

    public equippedRocket: RocketType = ROCKET_CATALOG[0];
    private unlockedRockets: Set<string> = new Set(['red_dart']);

    // Screen Shake Trauma
    private trauma = 0;

    constructor() {
        this.audio = new RocketAudio();
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0c111e);
        this.scene.fog = new THREE.FogExp2(0x0c111e, 0.004);

        // Aerial Camera Surveying the City / Arena
        this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 1, 1200);
        this.camera.position.set(0, 75, 55);
        this.camera.lookAt(0, 0, -5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const container = document.getElementById('canvas-container');
        if (container) {
            container.appendChild(this.renderer.domElement);
        }

        this.targetRing = new THREE.Group();
        this.particlePuffGroup = new THREE.Group();
        this.debrisGroup = new THREE.Group();
        this.scene.add(this.particlePuffGroup);
        this.scene.add(this.debrisGroup);

        this.ringMaterial = new THREE.MeshBasicMaterial({
            color: this.equippedRocket.color,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });

        const beamGeo = new THREE.CylinderGeometry(0.3, 3.0, 55, 16, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({
            color: this.equippedRocket.color,
            transparent: true,
            opacity: 0.18,
            side: THREE.DoubleSide
        });
        this.beaconBeam = new THREE.Mesh(beamGeo, beamMat);
        this.beaconBeam.position.y = 27.5;

        this.isMobileDevice = isMobileOrTabletDevice();
    }

    public init(): boolean {
        // 1. VIP Verification for Playard Owner
        const userProf = getCurrentUserProfile();
        const isOwner = isPlayardOwner(userProf?.email);
        const vipOverlay = document.getElementById('vip-restricted-overlay');

        if (!isOwner && !isTestMode() && !(window as any).__PLAYARD_TEST_MODE__) {
            if (vipOverlay) vipOverlay.style.display = 'flex';
            return false;
        }
        if (vipOverlay) vipOverlay.style.display = 'none';

        // Load saved state
        this.loadProgress();

        // 2. Setup Lighting, Ground & Destructible Buildings
        this.setupLighting();
        this.buildCityGround();
        this.createTargetRing();
        this.setupDestructibleBuildings();

        // 3. Setup Controls
        this.setupKeyboardControls();
        this.setupMouseAiming();
        this.setupButtons();
        if (this.isMobileDevice) {
            this.setupMobileControls();
        }

        // 4. Update HUD
        this.updateHUD();
        this.renderShopCatalog();
        this.startRoundTimer();

        // 5. Start Render Loop
        window.addEventListener('resize', () => this.onWindowResize());
        this.animate(0);

        // Record to recently played
        yardService.recordPlayedGame({
            id: 'rocket',
            title: '🚀 Rocket Playard',
            description: 'Vaade õhust: purusta raketiga maju, naudi realistlikke plahvatusi ja lendavaid hoonetükke!',
            url: './games/rocket/index.html',
            icon: '🚀',
            badgeText: '👑 OWNER EXCLUSIVE'
        });

        return true;
    }

    private setupLighting() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.75);
        this.scene.add(ambient);

        const sunLight = new THREE.DirectionalLight(0xfff3e0, 1.4);
        sunLight.position.set(60, 140, 70);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 10;
        sunLight.shadow.camera.far = 350;
        sunLight.shadow.camera.left = -140;
        sunLight.shadow.camera.right = 140;
        sunLight.shadow.camera.top = 140;
        sunLight.shadow.camera.bottom = -140;
        this.scene.add(sunLight);

        // Vibrant neon city lights
        const point1 = new THREE.PointLight(0x00f2fe, 3.5, 130);
        point1.position.set(-45, 35, -30);
        this.scene.add(point1);

        const point2 = new THREE.PointLight(0xff4757, 3.5, 130);
        point2.position.set(45, 35, 30);
        this.scene.add(point2);
    }

    private buildCityGround() {
        const groundSize = 320;
        const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x131929,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.groundPlaneMesh = ground;

        // City streets & neon grid pattern
        const gridHelper = new THREE.GridHelper(groundSize, 64, 0x00f2fe, 0x1c2438);
        gridHelper.position.y = 0.05;
        this.scene.add(gridHelper);

        // Boundary walls
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x161d31, roughness: 0.5 });
        const wallHeight = 16;
        const half = groundSize / 2;

        const makeWall = (w: number, d: number, x: number, z: number) => {
            const geo = new THREE.BoxGeometry(w, wallHeight, d);
            const m = new THREE.Mesh(geo, wallMat);
            m.position.set(x, wallHeight / 2, z);
            m.receiveShadow = true;
            this.scene.add(m);
        };
        makeWall(groundSize, 4, 0, -half);
        makeWall(groundSize, 4, 0, half);
        makeWall(4, groundSize, -half, 0);
        makeWall(4, groundSize, half, 0);
    }

    private createTargetRing() {
        // Outer Target Ring
        const outerRingGeo = new THREE.RingGeometry(4.2, 4.8, 48);
        const outerRing = new THREE.Mesh(outerRingGeo, this.ringMaterial);
        outerRing.rotation.x = -Math.PI / 2;
        this.targetRing.add(outerRing);

        // Mid Ring
        const midRingGeo = new THREE.RingGeometry(2.3, 2.7, 36);
        const midRing = new THREE.Mesh(midRingGeo, this.ringMaterial);
        midRing.rotation.x = -Math.PI / 2;
        this.targetRing.add(midRing);

        // Bullseye Center
        const centerDotGeo = new THREE.CircleGeometry(0.8, 24);
        const centerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        const centerDot = new THREE.Mesh(centerDotGeo, centerMat);
        centerDot.rotation.x = -Math.PI / 2;
        this.targetRing.add(centerDot);

        // 4 Target Crosshair Ticks
        const tickGeo = new THREE.PlaneGeometry(0.35, 2.2);
        const makeTick = (x: number, z: number, rotY: number) => {
            const tick = new THREE.Mesh(tickGeo, this.ringMaterial);
            tick.rotation.x = -Math.PI / 2;
            tick.rotation.z = rotY;
            tick.position.set(x, 0.02, z);
            this.targetRing.add(tick);
        };
        makeTick(0, -5.5, 0);
        makeTick(0, 5.5, 0);
        makeTick(-5.5, 0, Math.PI / 2);
        makeTick(5.5, 0, Math.PI / 2);

        // Vertical laser light beam
        this.targetRing.add(this.beaconBeam);
        this.targetRing.position.copy(this.ringPosition);
        this.scene.add(this.targetRing);
    }

    private setupDestructibleBuildings() {
        // Define varied destructible city buildings
        const buildingConfigs = [
            { id: 'b_central_tower', name: '🏢 Sky Office Tower', pos: new THREE.Vector3(0, 0, 0), w: 22, h: 28, d: 22, color: 0x1e2a4a, roofColor: 0x00f2fe, pts: 600, hp: 1 },
            { id: 'b_north_corp', name: '🏙️ North Corporate HQ', pos: new THREE.Vector3(-45, 0, -45), w: 20, h: 24, d: 20, color: 0x241d38, roofColor: 0xff4757, pts: 500, hp: 1 },
            { id: 'b_east_complex', name: '🏬 Commercial Center', pos: new THREE.Vector3(50, 0, -35), w: 24, h: 18, d: 22, color: 0x1a2e3b, roofColor: 0xffd32a, pts: 450, hp: 1 },
            { id: 'b_south_hotel', name: '🏨 Grand Hotel Plaza', pos: new THREE.Vector3(45, 0, 45), w: 22, h: 22, d: 24, color: 0x2e1b27, roofColor: 0x2ed573, pts: 500, hp: 1 },
            { id: 'b_west_factory', name: '🏭 Industrial Powerplant', pos: new THREE.Vector3(-50, 0, 35), w: 26, h: 15, d: 24, color: 0x2b261b, roofColor: 0xff9f1a, pts: 400, hp: 1 },
            { id: 'b_suburb_villa_1', name: '🏡 Urban Villa Alpha', pos: new THREE.Vector3(-25, 0, 60), w: 16, h: 12, d: 16, color: 0x1d2938, roofColor: 0x00f2fe, pts: 350, hp: 1 },
            { id: 'b_suburb_villa_2', name: '🏘️ City Apartments', pos: new THREE.Vector3(25, 0, 60), w: 18, h: 14, d: 16, color: 0x301c2c, roofColor: 0xff4757, pts: 350, hp: 1 },
            { id: 'b_warehouse_north', name: '📦 Logistics Terminal', pos: new THREE.Vector3(15, 0, -65), w: 24, h: 12, d: 18, color: 0x192d35, roofColor: 0xffd32a, pts: 350, hp: 1 },
            { id: 'b_bank_tower', name: '🏦 National Vault Tower', pos: new THREE.Vector3(-25, 0, -25), w: 18, h: 20, d: 18, color: 0x251c33, roofColor: 0x9b59b6, pts: 450, hp: 1 },
            { id: 'b_tech_lab', name: '🔬 Quantum Tech Lab', pos: new THREE.Vector3(25, 0, -10), w: 18, h: 16, d: 20, color: 0x152c38, roofColor: 0x00f2fe, pts: 400, hp: 1 }
        ];

        buildingConfigs.forEach(cfg => {
            const group = new THREE.Group();
            group.position.set(cfg.pos.x, 0, cfg.pos.z);

            // Detailed Building Structure with Windows and Neon Accents
            const bodyGeo = new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d);
            const bodyMat = new THREE.MeshStandardMaterial({
                color: cfg.color,
                roughness: 0.65,
                metalness: 0.35
            });
            const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
            bodyMesh.position.y = cfg.h / 2;
            bodyMesh.castShadow = true;
            bodyMesh.receiveShadow = true;
            group.add(bodyMesh);

            // Glowing Window Rows
            const windowCols = Math.floor(cfg.w / 4);
            const windowRows = Math.floor(cfg.h / 4);
            const winMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });

            for (let r = 1; r < windowRows; r++) {
                for (let c = 0; c < windowCols; c++) {
                    const winMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.8), winMat);
                    const wx = -cfg.w / 2 + 2.5 + c * 4;
                    const wy = r * 4;
                    winMesh.position.set(wx, wy, cfg.d / 2 + 0.05);
                    group.add(winMesh);

                    const winBack = winMesh.clone();
                    winBack.position.set(wx, wy, -cfg.d / 2 - 0.05);
                    winBack.rotation.y = Math.PI;
                    group.add(winBack);
                }
            }

            // Glowing Rooftop Trim
            const roofGeo = new THREE.BoxGeometry(cfg.w + 0.5, 0.8, cfg.d + 0.5);
            const roofMat = new THREE.MeshBasicMaterial({ color: cfg.roofColor });
            const roofMesh = new THREE.Mesh(roofGeo, roofMat);
            roofMesh.position.y = cfg.h + 0.4;
            group.add(roofMesh);

            // Roof Antenna / HVAC
            const antennaGeo = new THREE.CylinderGeometry(0.2, 0.4, 6, 8);
            const antennaMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
            const antenna = new THREE.Mesh(antennaGeo, antennaMat);
            antenna.position.set(0, cfg.h + 3.4, 0);
            group.add(antenna);

            this.scene.add(group);

            this.targets.push({
                id: cfg.id,
                name: cfg.name,
                group,
                mesh: bodyMesh,
                type: 'building',
                basePoints: cfg.pts,
                position: cfg.pos.clone().setY(cfg.h / 2),
                size: { w: cfg.w, h: cfg.h, d: cfg.d },
                color: cfg.color,
                active: true,
                respawnTimer: 0,
                hp: cfg.hp,
                maxHp: cfg.hp
            });
        });
    }

    private setupKeyboardControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            // Space or F or Enter to Fire
            if (e.code === 'Space' || e.code === 'KeyF' || e.code === 'Enter') {
                e.preventDefault();
                this.fireRocket();
            }

            // E to open Rocket Shop
            if (e.code === 'KeyE') {
                this.toggleShop(true);
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    private setupMouseAiming() {
        const viewport = document.getElementById('game-viewport-wrapper') || document.body;

        // PC Mouse Move -> Raycast to position the Targeting Ring on the city surface
        window.addEventListener('mousemove', (e: MouseEvent) => {
            if (this.isMobileDevice) return;

            this.mouseCoords.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouseCoords.y = -(e.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouseCoords, this.camera);
            if (this.groundPlaneMesh) {
                const intersects = this.raycaster.intersectObjects([this.groundPlaneMesh, ...this.scene.children], true);
                for (const hit of intersects) {
                    if (hit.object !== this.beaconBeam && hit.point) {
                        this.ringPosition.x = Math.max(-135, Math.min(135, hit.point.x));
                        this.ringPosition.z = Math.max(-135, Math.min(135, hit.point.z));
                        this.ringPosition.y = Math.max(0.2, hit.point.y + 0.1);
                        break;
                    }
                }
            }
        });

        // Click to Fire Rocket at the Targeting Ring
        viewport.addEventListener('mousedown', (e: MouseEvent) => {
            if ((e.target as HTMLElement).closest('.top-hud, .desktop-fire-btn, .game-modal-backdrop')) return;
            if (e.button === 0) {
                this.fireRocket();
            }
        });
    }

    private setupButtons() {
        const fireBtn = document.getElementById('btn-fire');
        if (fireBtn) {
            fireBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.fireRocket();
            });
        }

        const openShopBtn = document.getElementById('btn-open-shop');
        if (openShopBtn) openShopBtn.addEventListener('click', () => this.toggleShop(true));

        const closeShopBtn = document.getElementById('btn-close-shop');
        if (closeShopBtn) closeShopBtn.addEventListener('click', () => this.toggleShop(false));

        const winnerShopBtn = document.getElementById('btn-winner-shop');
        if (winnerShopBtn) {
            winnerShopBtn.addEventListener('click', () => {
                this.toggleModal('round-end-modal', false);
                this.toggleShop(true);
            });
        }

        const playAgainBtn = document.getElementById('btn-play-again');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                this.toggleModal('round-end-modal', false);
                this.resetRound();
            });
        }

        const soundBtn = document.getElementById('btn-toggle-sound');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                this.audio.soundEnabled = !this.audio.soundEnabled;
                soundBtn.textContent = this.audio.soundEnabled ? '🔊' : '🔇';
            });
        }

        const pcBar = document.getElementById('pc-controls-bar');
        if (this.isMobileDevice && pcBar) {
            pcBar.style.display = 'none';
        }
    }

    private setupMobileControls() {
        const existingLayer = document.getElementById('playard-universal-mobile-controls');
        if (existingLayer) existingLayer.remove();

        const layer = document.createElement('div');
        layer.id = 'playard-universal-mobile-controls';
        layer.style.position = 'fixed';
        layer.style.top = '0';
        layer.style.left = '0';
        layer.style.width = '100vw';
        layer.style.height = '100vh';
        layer.style.pointerEvents = 'none';
        layer.style.zIndex = '9999';
        layer.style.userSelect = 'none';
        layer.style.touchAction = 'none';

        // 1. Draggable Virtual Joystick Zone (Bottom Left)
        const zone = document.createElement('div');
        zone.id = 'playard-mobile-joystick-zone';
        zone.style.position = 'absolute';
        zone.style.bottom = '35px';
        zone.style.left = '35px';
        zone.style.width = '130px';
        zone.style.height = '130px';
        zone.style.borderRadius = '50%';
        zone.style.background = 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)';
        zone.style.border = '2.5px solid rgba(255, 255, 255, 0.35)';
        zone.style.backdropFilter = 'blur(8px)';
        zone.style.pointerEvents = 'auto';
        zone.style.display = 'flex';
        zone.style.alignItems = 'center';
        zone.style.justifyContent = 'center';

        const knob = document.createElement('div');
        knob.id = 'playard-mobile-joystick-knob';
        knob.style.width = '56px';
        knob.style.height = '56px';
        knob.style.borderRadius = '50%';
        knob.style.background = 'linear-gradient(135deg, #00f2fe 0%, #0072ff 100%)';
        knob.style.border = '2px solid #ffffff';
        knob.style.boxShadow = '0 0 15px rgba(0, 242, 254, 0.8)';
        knob.style.pointerEvents = 'none';
        knob.innerHTML = '<span style="font-size: 18px; color: white; display: flex; align-items: center; justify-content: center; height: 100%;">🎯</span>';

        zone.appendChild(knob);
        layer.appendChild(zone);

        // 2. Right Action Zone (FIRE Button + JUMP Button)
        const actionZone = document.createElement('div');
        actionZone.style.position = 'absolute';
        actionZone.style.bottom = '35px';
        actionZone.style.right = '35px';
        actionZone.style.display = 'flex';
        actionZone.style.flexDirection = 'column-reverse';
        actionZone.style.gap = '16px';
        actionZone.style.alignItems = 'center';
        actionZone.style.pointerEvents = 'auto';

        // JUMP button
        const jumpBtn = document.createElement('button');
        jumpBtn.type = 'button';
        jumpBtn.id = 'playard-mobile-jump-btn';
        jumpBtn.style.width = '78px';
        jumpBtn.style.height = '78px';
        jumpBtn.style.borderRadius = '50%';
        jumpBtn.style.background = 'linear-gradient(135deg, #00f2fe 0%, #0072ff 100%)';
        jumpBtn.style.border = '2.5px solid #ffffff';
        jumpBtn.style.color = '#ffffff';
        jumpBtn.style.display = 'flex';
        jumpBtn.style.flexDirection = 'column';
        jumpBtn.style.alignItems = 'center';
        jumpBtn.style.justifyContent = 'center';
        jumpBtn.style.boxShadow = '0 0 20px rgba(0, 242, 254, 0.7)';
        jumpBtn.style.cursor = 'pointer';
        jumpBtn.style.pointerEvents = 'auto';
        jumpBtn.innerHTML = '<span style="font-size: 24px;">🦘</span><span style="font-size: 10px; font-weight: 900; letter-spacing: 0.5px;">JUMP</span>';

        jumpBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.ringPosition.set(0, 0.2, 0);
            this.showImpactToast('CENTER LOCK! 🎯');
        }, { passive: false });

        // Mobile FIRE button
        const mobileFireBtn = document.createElement('button');
        mobileFireBtn.type = 'button';
        mobileFireBtn.id = 'playard-mobile-fire-btn';
        mobileFireBtn.style.width = '88px';
        mobileFireBtn.style.height = '88px';
        mobileFireBtn.style.borderRadius = '50%';
        mobileFireBtn.style.background = 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)';
        mobileFireBtn.style.border = '3px solid #ffffff';
        mobileFireBtn.style.color = '#ffffff';
        mobileFireBtn.style.display = 'flex';
        mobileFireBtn.style.flexDirection = 'column';
        mobileFireBtn.style.alignItems = 'center';
        mobileFireBtn.style.justifyContent = 'center';
        mobileFireBtn.style.boxShadow = '0 0 25px rgba(255, 65, 108, 0.85)';
        mobileFireBtn.style.cursor = 'pointer';
        mobileFireBtn.style.pointerEvents = 'auto';
        mobileFireBtn.innerHTML = '<span style="font-size: 28px;">🚀</span><span style="font-size: 11px; font-weight: 900; letter-spacing: 1px;">FIRE</span>';

        mobileFireBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.fireRocket();
        }, { passive: false });

        actionZone.appendChild(jumpBtn);
        actionZone.appendChild(mobileFireBtn);
        layer.appendChild(actionZone);
        document.body.appendChild(layer);

        // Joystick touch events
        let touchId: number | null = null;
        let centerX = 0;
        let centerY = 0;

        const onTouchStart = (e: TouchEvent) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                const rect = zone.getBoundingClientRect();
                centerX = rect.left + rect.width / 2;
                centerY = rect.top + rect.height / 2;
                touchId = t.identifier;
                updateJoystick(t.clientX, t.clientY);
                break;
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (touchId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === touchId) {
                    updateJoystick(t.clientX, t.clientY);
                    break;
                }
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (touchId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === touchId) {
                    touchId = null;
                    this.mobileMoveVector = { x: 0, y: 0 };
                    knob.style.transform = 'translate(0px, 0px)';
                    break;
                }
            }
        };

        const updateJoystick = (clientX: number, clientY: number) => {
            const dx = clientX - centerX;
            const dy = clientY - centerY;
            const dist = Math.hypot(dx, dy);
            const maxRadius = 45;
            const angle = Math.atan2(dy, dx);
            const clampedDist = Math.min(dist, maxRadius);

            const kx = Math.cos(angle) * clampedDist;
            const ky = Math.sin(angle) * clampedDist;
            knob.style.transform = `translate(${kx}px, ${ky}px)`;

            this.mobileMoveVector = {
                x: kx / maxRadius,
                y: ky / maxRadius
            };
        };

        zone.addEventListener('touchstart', onTouchStart, { passive: false });
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd, { passive: false });
        window.addEventListener('touchcancel', onTouchEnd, { passive: false });
    }

    public fireRocket(): boolean {
        if (!this.roundActive) return false;

        this.shotsFired++;
        this.audio.playWhoosh();

        // Launch rocket from high sky towards targeting ring position
        const targetPoint = this.ringPosition.clone();
        const startPoint = new THREE.Vector3(
            targetPoint.x - 14 + (Math.random() - 0.5) * 8,
            targetPoint.y + 80,
            targetPoint.z + 32 + (Math.random() - 0.5) * 8
        );

        const toTarget = targetPoint.clone().sub(startPoint);
        const dir = toTarget.clone().normalize();

        const rocketGroup = new THREE.Group();
        rocketGroup.position.copy(startPoint);

        const bodyGeo = new THREE.CylinderGeometry(0.28, 0.42, 2.4, 16);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: this.equippedRocket.color,
            metalness: 0.7,
            roughness: 0.3
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.x = Math.PI / 2;
        rocketGroup.add(body);

        const noseGeo = new THREE.ConeGeometry(0.35, 1.0, 16);
        const noseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.z = 1.5;
        nose.rotation.x = Math.PI / 2;
        rocketGroup.add(nose);

        const finGeo = new THREE.BoxGeometry(1.4, 0.08, 0.7);
        const finMat = new THREE.MeshBasicMaterial({ color: this.equippedRocket.trailColor });
        const fin1 = new THREE.Mesh(finGeo, finMat);
        fin1.position.z = -0.7;
        rocketGroup.add(fin1);

        const fin2 = fin1.clone();
        fin2.rotation.z = Math.PI / 2;
        rocketGroup.add(fin2);

        const thrusterLight = new THREE.PointLight(this.equippedRocket.trailColor, 4.0, 18);
        thrusterLight.position.z = -1.4;
        rocketGroup.add(thrusterLight);

        rocketGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        this.scene.add(rocketGroup);

        this.activeRockets.push({
            mesh: rocketGroup,
            velocity: dir.multiplyScalar(this.equippedRocket.speed),
            targetPos: targetPoint,
            rocketType: this.equippedRocket,
            spawnTime: performance.now()
        });

        this.trauma = Math.max(this.trauma, 0.15);
        return true;
    }

    // ULTRA ULTRA ULTRA REALISTIC EXPLOSION & DEBRIS SYSTEM
    public triggerExplosion(impactPos: THREE.Vector3, rocketType: RocketType, hitTarget?: DestructibleBuilding, hitDistFromCenter: number = 0) {
        this.audio.playUltraRealisticBoom();

        // 1. Blinding Incandescent Flash Point Light
        const flashLight = new THREE.PointLight(0xfffae0, 14.0, 90);
        flashLight.position.copy(impactPos).add(new THREE.Vector3(0, 3, 0));
        this.scene.add(flashLight);

        // 2. Multi-Stage Billowing Fireball (Expanding Core & Pyroclastic Fire Clouds)
        const fireballCount = 10;
        const fireballSpheres: { mesh: THREE.Mesh; vel: THREE.Vector3; initialScale: number }[] = [];
        const fireballGroup = new THREE.Group();

        for (let i = 0; i < fireballCount; i++) {
            const size = 1.2 + Math.random() * 1.5;
            const geo = new THREE.SphereGeometry(size, 16, 16);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.98
            });
            const mesh = new THREE.Mesh(geo, mat);
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 3.5,
                Math.random() * 2.5,
                (Math.random() - 0.5) * 3.5
            );
            mesh.position.copy(impactPos).add(offset);
            fireballGroup.add(mesh);

            fireballSpheres.push({
                mesh,
                vel: new THREE.Vector3(
                    (Math.random() - 0.5) * 7.0,
                    4.0 + Math.random() * 10.0, // Rising heat convection
                    (Math.random() - 0.5) * 7.0
                ),
                initialScale: size
            });
        }
        this.scene.add(fireballGroup);

        // 3. Ground Shockwave Ring
        const shockRingGeo = new THREE.RingGeometry(1.0, 2.5, 48);
        const shockRingMat = new THREE.MeshBasicMaterial({
            color: 0xffe6a3,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
        });
        const shockRing = new THREE.Mesh(shockRingGeo, shockRingMat);
        shockRing.rotation.x = -Math.PI / 2;
        shockRing.position.copy(impactPos).setY(0.15);
        this.scene.add(shockRing);

        // 4. Molten Flying Spark Shower
        const sparkCount = 70;
        const sparkGeo = new THREE.BufferGeometry();
        const sparkPos = new Float32Array(sparkCount * 3);
        const sparkVels: THREE.Vector3[] = [];

        for (let i = 0; i < sparkCount; i++) {
            sparkPos[i * 3] = impactPos.x;
            sparkPos[i * 3 + 1] = impactPos.y + 1;
            sparkPos[i * 3 + 2] = impactPos.z;

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.45; // Upward hemisphere
            const speed = 20 + Math.random() * 32;
            sparkVels.push(new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta) * speed,
                Math.cos(phi) * speed + 8,
                Math.sin(phi) * Math.sin(theta) * speed
            ));
        }
        sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
        const sparkMat = new THREE.PointsMaterial({
            color: 0xffa502,
            size: 1.2,
            transparent: true,
            opacity: 1.0
        });
        const sparkSystem = new THREE.Points(sparkGeo, sparkMat);
        this.scene.add(sparkSystem);

        // Animate Fireball, Shockwave, and Sparks
        let animElapsed = 0;
        const explosionAnim = setInterval(() => {
            animElapsed += 0.03;
            flashLight.intensity = Math.max(0, 14.0 * (1.0 - animElapsed * 4.0));

            // Shockwave expansion
            const ringScale = 1.0 + animElapsed * (rocketType.blastRadius * 2.8);
            shockRing.scale.set(ringScale, ringScale, 1);
            shockRingMat.opacity = Math.max(0, 0.85 - animElapsed * 2.2);

            // Fireball evolution (White -> Fiery Orange -> Smokey Crimson -> Charcoal Smoke)
            fireballSpheres.forEach(fb => {
                fb.mesh.position.addScaledVector(fb.vel, 0.03);
                fb.vel.y += 0.8 * 0.03; // buoyant upward plume
                const expansion = fb.initialScale * (1.0 + animElapsed * 4.2);
                fb.mesh.scale.set(expansion, expansion, expansion);

                const m = fb.mesh.material as THREE.MeshBasicMaterial;
                if (animElapsed < 0.12) {
                    m.color.setHex(0xffffff);
                } else if (animElapsed < 0.35) {
                    m.color.setHex(0xff6b00);
                } else if (animElapsed < 0.7) {
                    m.color.setHex(0x5a1b0b);
                } else {
                    m.color.setHex(0x1a1a20);
                }
                m.opacity = Math.max(0, 0.98 - animElapsed * 1.1);
            });

            // Spark physics
            const sArr = sparkGeo.attributes.position.array as Float32Array;
            for (let i = 0; i < sparkCount; i++) {
                sArr[i * 3] += sparkVels[i].x * 0.03;
                sArr[i * 3 + 1] += sparkVels[i].y * 0.03;
                sArr[i * 3 + 2] += sparkVels[i].z * 0.03;
                sparkVels[i].y -= 38 * 0.03; // gravity
            }
            sparkGeo.attributes.position.needsUpdate = true;
            sparkMat.opacity = Math.max(0, 1.0 - animElapsed * 1.5);

            if (animElapsed >= 0.95) {
                clearInterval(explosionAnim);
                this.scene.remove(flashLight);
                this.scene.remove(fireballGroup);
                this.scene.remove(shockRing);
                this.scene.remove(sparkSystem);
                flashLight.dispose();
                shockRingGeo.dispose();
                shockRingMat.dispose();
                sparkGeo.dispose();
                sparkMat.dispose();
            }
        }, 30);

        // 5. Heavy Camera Trauma Screen Shake
        this.trauma = Math.min(1.0, this.trauma + 0.85);
        this.triggerViewportShake();

        // 6. Check Destructible Building Destruction & Spawn Flying Building Chunks!
        let buildingsDemolished = 0;
        for (const building of this.targets) {
            if (!building.active) continue;

            const bPosGround = building.position.clone().setY(0);
            const blastGround = impactPos.clone().setY(0);
            const dist = bPosGround.distanceTo(blastGround);

            // Hit if within blast radius or targeted directly
            if (dist <= rocketType.blastRadius + building.size.w / 2 || building === hitTarget) {
                buildingsDemolished++;
                building.hp--;

                if (building.hp <= 0) {
                    building.active = false;
                    building.respawnTimer = 6.0;
                    this.targetsHit++;
                    this.audio.playHitChime();

                    // Calculate score
                    let earned = building.basePoints;
                    let label = 'BUILDING DESTROYED! 💥';
                    if (dist < 3.5 || hitDistFromCenter < 2.0) {
                        earned = Math.round(earned * 1.5);
                        label = 'DIRECT DEMOLITION! 🎯🏙️';
                    }

                    earned = Math.round(earned * rocketType.scoreMultiplier);
                    this.currentScore += earned;
                    this.totalPointsBank += earned;
                    this.saveProgress();

                    this.showImpactToast(`${label} +${earned} PTS`);
                    this.updateHUD();

                    // Hide intact building and spawn smoking rubble foundation
                    building.group.visible = false;
                    this.spawnBuildingRubble(building);

                    // FLYING BUILDING CHUNKS / FRAGMENTS! (Maja tükid lendavad)
                    this.spawnFlyingBuildingDebris(building, impactPos);
                }
            }
        }

        if (buildingsDemolished === 0) {
            this.showImpactToast('ULTRA BOOM! 💥');
        }
    }

    // Spawn 35-50 physical tumbling 3D debris fragments flying across the sky
    private spawnFlyingBuildingDebris(building: DestructibleBuilding, blastOrigin: THREE.Vector3) {
        const chunkCount = 42;
        const colors = [building.color, 0x475569, 0x334155, 0x94a3b8, 0x64748b, 0x1e293b];

        for (let i = 0; i < chunkCount; i++) {
            // Random chunk dimensions (slabs, concrete pillars, bricks)
            const cw = 0.8 + Math.random() * 2.2;
            const ch = 0.6 + Math.random() * 1.8;
            const cd = 0.8 + Math.random() * 2.2;

            const geo = new THREE.BoxGeometry(cw, ch, cd);
            const mat = new THREE.MeshStandardMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                roughness: 0.8,
                metalness: 0.25
            });
            const chunk = new THREE.Mesh(geo, mat);
            chunk.castShadow = true;
            chunk.receiveShadow = true;

            // Spawn distributed through original building volume
            const spawnX = building.position.x + (Math.random() - 0.5) * building.size.w;
            const spawnY = Math.random() * building.size.h + 0.5;
            const spawnZ = building.position.z + (Math.random() - 0.5) * building.size.d;
            chunk.position.set(spawnX, spawnY, spawnZ);

            // Explosive impulse velocity outward from blast center
            const dirX = spawnX - blastOrigin.x;
            const dirZ = spawnZ - blastOrigin.z;
            const horizDist = Math.hypot(dirX, dirZ) || 1;

            const speed = 12 + Math.random() * 26;
            const vel = new THREE.Vector3(
                (dirX / horizDist) * speed + (Math.random() - 0.5) * 8,
                14 + Math.random() * 28, // High ballistic launch
                (dirZ / horizDist) * speed + (Math.random() - 0.5) * 8
            );

            this.debrisGroup.add(chunk);

            this.activeDebris.push({
                mesh: chunk,
                velocity: vel,
                rotAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
                rotSpeed: (Math.random() - 0.5) * 14,
                isGrounded: false,
                age: 0,
                maxAge: 8.0 + Math.random() * 4.0
            });
        }
    }

    private spawnBuildingRubble(building: DestructibleBuilding) {
        // Scorched foundation crater with smoke plume
        const rubbleGeo = new THREE.BoxGeometry(building.size.w * 0.9, 1.2, building.size.d * 0.9);
        const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x111622, roughness: 0.95 });
        const rubble = new THREE.Mesh(rubbleGeo, rubbleMat);
        rubble.position.set(building.position.x, 0.6, building.position.z);
        this.scene.add(rubble);
        building.rubbleMesh = rubble;

        // Create smoking debris puff over destroyed foundation
        for (let p = 0; p < 6; p++) {
            setTimeout(() => {
                if (!building.active) {
                    const smokePos = building.position.clone().setY(2.0);
                    smokePos.x += (Math.random() - 0.5) * (building.size.w * 0.7);
                    smokePos.z += (Math.random() - 0.5) * (building.size.d * 0.7);
                    this.createSmokePuff(smokePos, 0x1e293b);
                }
            }, p * 300);
        }
    }

    private triggerViewportShake() {
        const wrapper = document.getElementById('game-viewport-wrapper');
        if (wrapper) {
            wrapper.classList.remove('screen-shake');
            void wrapper.offsetWidth;
            wrapper.classList.add('screen-shake');
        }
    }

    private showImpactToast(text: string) {
        const container = document.getElementById('impact-toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'boom-toast';
        toast.textContent = text;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 1300);
    }

    private startRoundTimer() {
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

        this.toggleModal('round-end-modal', true);
    }

    private resetRound() {
        this.currentScore = 0;
        this.shotsFired = 0;
        this.targetsHit = 0;
        this.ringPosition.set(0, 0.2, 0);

        // Respawn all destructible buildings
        this.targets.forEach(b => {
            b.active = true;
            b.hp = b.maxHp;
            b.group.visible = true;
            b.respawnTimer = 0;
            if (b.rubbleMesh) {
                this.scene.remove(b.rubbleMesh);
                b.rubbleMesh.geometry.dispose();
                (b.rubbleMesh.material as THREE.Material).dispose();
                b.rubbleMesh = undefined;
            }
        });

        // Clear remaining debris
        for (const deb of this.activeDebris) {
            this.debrisGroup.remove(deb.mesh);
            deb.mesh.geometry.dispose();
            (deb.mesh.material as THREE.Material).dispose();
        }
        this.activeDebris = [];

        this.updateHUD();
        this.startRoundTimer();
    }

    private toggleModal(id: string, show: boolean) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.display = show ? 'flex' : 'none';
        }
    }

    private toggleShop(show: boolean) {
        this.toggleModal('rocket-shop-modal', show);
        if (show) {
            this.renderShopCatalog();
        }
    }

    private renderShopCatalog() {
        const list = document.getElementById('rocket-catalog-list');
        const pointsDisp = document.getElementById('shop-points-display');
        if (pointsDisp) pointsDisp.textContent = `${this.totalPointsBank} PTS`;
        if (!list) return;

        list.innerHTML = '';
        ROCKET_CATALOG.forEach(rocket => {
            const isEquipped = this.equippedRocket.id === rocket.id;
            const isUnlocked = this.unlockedRockets.has(rocket.id);

            const card = document.createElement('div');
            card.className = `rocket-item-card ${isEquipped ? 'equipped' : ''}`;

            card.innerHTML = `
                <div class="rocket-item-title">
                    <span>${rocket.icon}</span>
                    <span>${rocket.name}</span>
                </div>
                <div class="rocket-item-desc">${rocket.desc}</div>
                <div class="rocket-item-stats">Kiirus: ${rocket.speed} m/s · Purustusraadius: ${rocket.blastRadius}m · Boonus: ${rocket.scoreMultiplier}x</div>
                <button type="button" class="rocket-action-btn ${isEquipped ? 'btn-equipped' : (isUnlocked ? 'btn-equip' : 'btn-buy')}" data-id="${rocket.id}">
                    ${isEquipped ? '✓ KASUTUSES' : (isUnlocked ? 'KASUTA' : `OSTA (${rocket.price} PTS)`)}
                </button>
            `;

            const btn = card.querySelector('button');
            if (btn) {
                btn.addEventListener('click', () => {
                    this.handleRocketAction(rocket);
                });
            }

            list.appendChild(card);
        });
    }

    private handleRocketAction(rocket: RocketType) {
        if (this.unlockedRockets.has(rocket.id)) {
            this.equippedRocket = rocket;
            this.ringMaterial.color.setHex(rocket.color);
            this.saveProgress();
            this.updateHUD();
            this.renderShopCatalog();
            this.audio.playPurchase();
        } else if (this.totalPointsBank >= rocket.price) {
            this.totalPointsBank -= rocket.price;
            this.unlockedRockets.add(rocket.id);
            this.equippedRocket = rocket;
            this.ringMaterial.color.setHex(rocket.color);
            this.saveProgress();
            this.updateHUD();
            this.renderShopCatalog();
            this.audio.playPurchase();
            this.showImpactToast(`AVATUD: ${rocket.name}! 🚀`);
        } else {
            this.showImpactToast('POLE PIISAVALT PUNKTE!');
        }
    }

    private updateHUD() {
        const timerText = document.getElementById('hud-timer-text');
        if (timerText) {
            const m = Math.floor(this.roundRemaining / 60);
            const s = this.roundRemaining % 60;
            timerText.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }

        const scoreText = document.getElementById('hud-score-text');
        if (scoreText) scoreText.textContent = `${this.currentScore} PTS`;

        const rocketName = document.getElementById('hud-rocket-name');
        if (rocketName) rocketName.textContent = this.equippedRocket.name;

        const rocketIcon = document.getElementById('hud-rocket-icon');
        if (rocketIcon) rocketIcon.textContent = this.equippedRocket.icon;

        const yardText = document.getElementById('hud-yard-text');
        if (yardText) {
            try {
                yardText.textContent = `${yardService.getYards()} Y`;
            } catch (e) {
                yardText.textContent = '0 Y';
            }
        }
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
                        this.ringMaterial.color.setHex(found.color);
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

    private updateTargetRing(dt: number) {
        let moveX = 0;
        let moveZ = 0;

        if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

        if (this.isMobileDevice && (this.mobileMoveVector.x !== 0 || this.mobileMoveVector.y !== 0)) {
            moveX = this.mobileMoveVector.x;
            moveZ = this.mobileMoveVector.y;
        }

        const ringSpeed = 44.0;
        this.ringPosition.x += moveX * ringSpeed * dt;
        this.ringPosition.z += moveZ * ringSpeed * dt;

        this.ringPosition.x = Math.max(-135, Math.min(135, this.ringPosition.x));
        this.ringPosition.z = Math.max(-135, Math.min(135, this.ringPosition.z));

        this.targetRing.position.copy(this.ringPosition);
        this.targetRing.rotation.y += dt * 1.6;

        // Smooth overhead camera tracking
        const targetCamX = this.ringPosition.x * 0.45;
        const targetCamZ = this.ringPosition.z * 0.45 + 55;
        const targetCamY = 75;

        this.camera.position.x += (targetCamX - this.camera.position.x) * 4 * dt;
        this.camera.position.z += (targetCamZ - this.camera.position.z) * 4 * dt;
        this.camera.position.y += (targetCamY - this.camera.position.y) * 4 * dt;

        // Heavy realistic trauma shake
        if (this.trauma > 0) {
            const shake = this.trauma * this.trauma * 4.5;
            this.camera.position.x += (Math.random() - 0.5) * shake;
            this.camera.position.y += (Math.random() - 0.5) * shake;
            this.camera.position.z += (Math.random() - 0.5) * shake;
            this.trauma = Math.max(0, this.trauma - dt * 2.2);
        }

        const lookAtTarget = new THREE.Vector3(this.ringPosition.x * 0.6, 0, this.ringPosition.z * 0.6 - 6);
        this.camera.lookAt(lookAtTarget);
    }

    private updateRockets(dt: number) {
        for (let i = this.activeRockets.length - 1; i >= 0; i--) {
            const rocket = this.activeRockets[i];
            const oldPos = rocket.mesh.position.clone();
            const step = rocket.velocity.clone().multiplyScalar(dt);
            const newPos = oldPos.clone().add(step);

            this.createSmokePuff(oldPos, rocket.rocketType.trailColor);

            // Detonate when reaching or passing target ring ground level
            if (newPos.y <= rocket.targetPos.y || oldPos.distanceTo(rocket.targetPos) < step.length()) {
                this.triggerExplosion(rocket.targetPos, rocket.rocketType);
                this.scene.remove(rocket.mesh);
                this.activeRockets.splice(i, 1);
                continue;
            }

            if (performance.now() - rocket.spawnTime > 5000) {
                this.scene.remove(rocket.mesh);
                this.activeRockets.splice(i, 1);
                continue;
            }

            rocket.mesh.position.copy(newPos);
        }
    }

    // Update physical flying building fragments
    private updateDebris(dt: number) {
        for (let i = this.activeDebris.length - 1; i >= 0; i--) {
            const deb = this.activeDebris[i];
            deb.age += dt;

            if (!deb.isGrounded) {
                deb.velocity.y -= 34 * dt; // Gravity
                deb.mesh.position.addScaledVector(deb.velocity, dt);

                // Rotate tumbling chunk
                deb.mesh.rotateOnAxis(deb.rotAxis, deb.rotSpeed * dt);

                // Ground collision and bounce
                if (deb.mesh.position.y <= 0.4) {
                    deb.mesh.position.y = 0.4;
                    if (Math.abs(deb.velocity.y) > 3.0) {
                        deb.velocity.y = -deb.velocity.y * 0.35; // bounce
                        deb.velocity.x *= 0.65;
                        deb.velocity.z *= 0.65;
                        deb.rotSpeed *= 0.65;
                    } else {
                        deb.velocity.set(0, 0, 0);
                        deb.isGrounded = true;
                    }
                }
            }

            // Slowly fade out old debris
            if (deb.age >= deb.maxAge) {
                this.debrisGroup.remove(deb.mesh);
                deb.mesh.geometry.dispose();
                (deb.mesh.material as THREE.Material).dispose();
                this.activeDebris.splice(i, 1);
            }
        }
    }

    private createSmokePuff(pos: THREE.Vector3, color: number) {
        const puff = new THREE.Mesh(
            new THREE.SphereGeometry(0.45 + Math.random() * 0.35, 8, 8),
            new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.85
            })
        );
        puff.position.copy(pos);
        this.particlePuffGroup.add(puff);

        let age = 0;
        const interval = setInterval(() => {
            age += 0.04;
            puff.scale.multiplyScalar(1.12);
            (puff.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 - age * 2.6);

            if (age >= 0.32) {
                clearInterval(interval);
                this.particlePuffGroup.remove(puff);
                puff.geometry.dispose();
                (puff.material as THREE.Material).dispose();
            }
        }, 30);
    }

    private updateBuildings(dt: number) {
        for (const building of this.targets) {
            if (!building.active) {
                building.respawnTimer -= dt;
                if (building.respawnTimer <= 0) {
                    building.active = true;
                    building.hp = building.maxHp;
                    building.group.visible = true;
                    if (building.rubbleMesh) {
                        this.scene.remove(building.rubbleMesh);
                        building.rubbleMesh.geometry.dispose();
                        (building.rubbleMesh.material as THREE.Material).dispose();
                        building.rubbleMesh = undefined;
                    }
                }
            }
        }
    }

    private lastTime = 0;
    private animate(timestamp: number) {
        requestAnimationFrame((t) => this.animate(t));

        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        this.updateTargetRing(dt);
        this.updateRockets(dt);
        this.updateDebris(dt);
        this.updateBuildings(dt);

        this.renderer.render(this.scene, this.camera);
    }
}

// Global initialization
window.addEventListener('DOMContentLoaded', () => {
    const game = new RocketGame();
    (window as any).rocketGame = game;
    game.init();
});
