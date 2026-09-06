import * as THREE from 'three';
import { yardService } from '../../shared/yardService';
import { getCurrentUserProfile, isPlayardOwner, isTestMode } from '../../auth';
import { isMobileOrTabletDevice } from '../../shared/mobileControls';

// Sound Synthesizer via Web Audio API
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
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.28);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
    }

    public playBoom() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Low boom rumble
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.45);

        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);

        // Arcade burst noise
        const bufferSize = this.ctx.sampleRate * 0.25;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.05));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.25);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.5, now);
        nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.ctx.destination);
        noise.start(now);
    }

    public playHitChime() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.08); // A5

        gain.gain.setValueAtTime(0.35, now);
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
            gain.gain.setValueAtTime(0.4, now);
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
        gain.gain.setValueAtTime(0.2, now);
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
        desc: 'Klassikaline kiire arkaad-rakett tasakaalustatud kiirusega.',
        speed: 75,
        color: 0xff4757,
        trailColor: 0xffa502,
        price: 0,
        scoreMultiplier: 1.0,
        blastRadius: 4.5
    },
    {
        id: 'neon_turbo',
        name: 'Neon Turbo',
        icon: '⚡',
        desc: 'Elektri-tsüaani laenguga ülikiire rakett +25% punktiboonusega.',
        speed: 105,
        color: 0x00f2fe,
        trailColor: 0x4facfe,
        price: 500,
        scoreMultiplier: 1.25,
        blastRadius: 5.5
    },
    {
        id: 'rainbow_comet',
        name: 'Rainbow Comet',
        icon: '🌈',
        desc: 'Vikerkaare sädemetega komeetrakett suure plahvatuse ja +50% boonusega.',
        speed: 125,
        color: 0xff6b81,
        trailColor: 0x2ed573,
        price: 1200,
        scoreMultiplier: 1.5,
        blastRadius: 6.5
    },
    {
        id: 'quantum_starfire',
        name: 'Quantum Starfire',
        icon: '🌟',
        desc: 'Kuldne supernoova rakett hüperkiirusega ja 2.0x topeltpunktidega!',
        speed: 155,
        color: 0xffd32a,
        trailColor: 0xff9f1a,
        price: 2500,
        scoreMultiplier: 2.0,
        blastRadius: 8.0
    }
];

// Target Definition
interface ArenaTarget {
    id: string;
    mesh: THREE.Object3D;
    type: 'bullseye' | 'drone' | 'balloon';
    basePoints: number;
    position: THREE.Vector3;
    active: boolean;
    respawnTimer: number;
    patrolAxis?: 'x' | 'z' | 'y';
    patrolRange?: number;
    patrolSpeed?: number;
    initialPos?: THREE.Vector3;
}

// Active in-flight projectile
interface InFlightRocket {
    mesh: THREE.Object3D;
    velocity: THREE.Vector3;
    rocketType: RocketType;
    spawnTime: number;
    particles: THREE.Vector3[];
}

export class RocketGame {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private audio: RocketAudio;

    // Player State
    private player: THREE.Group;
    private playerVelocity = new THREE.Vector3();
    private isGrounded = false;
    private cameraYaw = 0;
    private cameraPitch = 0.15;
    private isMouseDown = false;
    private prevMouseX = 0;
    private prevMouseY = 0;

    // Movement keys
    private keys: { [key: string]: boolean } = {};
    private mobileMoveVector = { x: 0, y: 0 };
    private isMobileDevice = false;

    // Game Objects & Colliders
    private colliders: THREE.Box3[] = [];
    private targets: ArenaTarget[] = [];
    private activeRockets: InFlightRocket[] = [];
    private particlePuffGroup: THREE.Group;
    private bouncePads: THREE.Mesh[] = [];

    // Scoring, Upgrades & Round
    private currentScore = 0;
    private totalPointsBank = 0;
    private shotsFired = 0;
    private targetsHit = 0;
    private roundDuration = 75; // seconds
    private roundRemaining = 75;
    private roundActive = true;
    private roundTimerInterval: any = null;

    private equippedRocket: RocketType = ROCKET_CATALOG[0];
    private unlockedRockets: Set<string> = new Set(['red_dart']);

    // Screen Shake
    private shakeIntensity = 0;

    constructor() {
        this.audio = new RocketAudio();
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0e1a);
        this.scene.fog = new THREE.FogExp2(0x0a0e1a, 0.007);

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const container = document.getElementById('canvas-container');
        if (container) {
            container.appendChild(this.renderer.domElement);
        }

        this.player = new THREE.Group();
        this.particlePuffGroup = new THREE.Group();
        this.scene.add(this.particlePuffGroup);

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

        // 2. Setup Lighting & Arena Environment
        this.setupLighting();
        this.buildArena();
        this.createPlayer();
        this.setupTargets();

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
            description: '3D arcade rakettide laskmise ja sihtmärkide tabamise areenimäng.',
            url: './games/rocket/index.html',
            icon: '🚀',
            badgeText: '👑 OWNER EXCLUSIVE'
        });

        return true;
    }

    private setupLighting() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xfff0e6, 1.2);
        dirLight.position.set(60, 100, 40);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 10;
        dirLight.shadow.camera.far = 300;
        dirLight.shadow.camera.left = -120;
        dirLight.shadow.camera.right = 120;
        dirLight.shadow.camera.top = 120;
        dirLight.shadow.camera.bottom = -120;
        this.scene.add(dirLight);

        // Colorful glowing accent point lights
        const accentCyan = new THREE.PointLight(0x00f2fe, 2.5, 90);
        accentCyan.position.set(-40, 25, -30);
        this.scene.add(accentCyan);

        const accentPink = new THREE.PointLight(0xff2e63, 2.5, 90);
        accentPink.position.set(40, 25, 30);
        this.scene.add(accentPink);
    }

    private buildArena() {
        // 1. Large Textured Ground with Arcade Grid lines
        const groundSize = 300;
        const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize, 60, 60);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x111625,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Grid helper on floor for neon aesthetic
        const gridHelper = new THREE.GridHelper(groundSize, 60, 0x00f2fe, 0x1f293d);
        gridHelper.position.y = 0.05;
        this.scene.add(gridHelper);

        // Arena boundary walls
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x161d31,
            roughness: 0.5,
            metalness: 0.4
        });
        const wallHeight = 22;
        const half = groundSize / 2;

        const makeWall = (w: number, d: number, x: number, z: number) => {
            const geo = new THREE.BoxGeometry(w, wallHeight, d);
            const m = new THREE.Mesh(geo, wallMat);
            m.position.set(x, wallHeight / 2, z);
            m.receiveShadow = true;
            m.castShadow = true;
            this.scene.add(m);
            this.colliders.push(new THREE.Box3().setFromObject(m));
        };
        makeWall(groundSize, 4, 0, -half);
        makeWall(groundSize, 4, 0, half);
        makeWall(4, groundSize, -half, 0);
        makeWall(4, groundSize, half, 0);

        // 2. Buildings, Towers, Platforms, Bridges, Tunnels
        const buildingMat1 = new THREE.MeshStandardMaterial({ color: 0x1e2746, roughness: 0.6 });
        const buildingMat2 = new THREE.MeshStandardMaterial({ color: 0x27193b, roughness: 0.6 });
        const neonTrimMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
        const yellowTrimMat = new THREE.MeshBasicMaterial({ color: 0xffd32a });

        const createBuilding = (x: number, z: number, w: number, h: number, d: number, mat: THREE.Material) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            mesh.position.set(x, h / 2, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            this.colliders.push(new THREE.Box3().setFromObject(mesh));

            // Neon glowing roof edge
            const roofEdge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.6, d + 0.4), neonTrimMat);
            roofEdge.position.set(x, h + 0.3, z);
            this.scene.add(roofEdge);

            return mesh;
        };

        // Cluster of structures
        // North-West High Tower & Mid Tower
        createBuilding(-50, -50, 24, 28, 24, buildingMat1);
        createBuilding(-25, -65, 18, 16, 18, buildingMat2);

        // South-East Complex
        createBuilding(50, 45, 26, 24, 26, buildingMat1);
        createBuilding(65, 15, 18, 14, 20, buildingMat2);

        // Central Arena Platform Tower
        createBuilding(0, 0, 20, 10, 20, buildingMat1);

        // Elevated Suspension Bridge connecting NW Tower to Central Platform
        const bridgeGeo = new THREE.BoxGeometry(10, 1.2, 45);
        const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5 });
        const bridge1 = new THREE.Mesh(bridgeGeo, bridgeMat);
        bridge1.position.set(-25, 12, -25);
        bridge1.rotation.y = Math.PI / 4;
        bridge1.castShadow = true;
        bridge1.receiveShadow = true;
        this.scene.add(bridge1);
        this.colliders.push(new THREE.Box3().setFromObject(bridge1));

        // Stepped / Floating Parkour Platforms
        const platGeo = new THREE.BoxGeometry(10, 1.5, 10);
        const platMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 });
        
        const makePlatform = (x: number, y: number, z: number) => {
            const p = new THREE.Mesh(platGeo, platMat);
            p.position.set(x, y, z);
            p.castShadow = true;
            p.receiveShadow = true;
            this.scene.add(p);
            this.colliders.push(new THREE.Box3().setFromObject(p));

            const glowBorder = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.3, 10.2), yellowTrimMat);
            glowBorder.position.set(x, y + 0.8, z);
            this.scene.add(glowBorder);
        };

        makePlatform(25, 8, -20);
        makePlatform(38, 14, -35);
        makePlatform(52, 20, -50);
        makePlatform(-20, 7, 35);
        makePlatform(-40, 13, 45);

        // Tunnel / Archway Hiding Spot
        const archPillarGeo = new THREE.BoxGeometry(4, 12, 4);
        const archRoofGeo = new THREE.BoxGeometry(22, 2.5, 30);
        const archRoof = new THREE.Mesh(archRoofGeo, buildingMat2);
        archRoof.position.set(0, 12, 55);
        archRoof.castShadow = true;
        archRoof.receiveShadow = true;
        this.scene.add(archRoof);
        this.colliders.push(new THREE.Box3().setFromObject(archRoof));

        const p1 = new THREE.Mesh(archPillarGeo, buildingMat1);
        p1.position.set(-9, 6, 45);
        this.scene.add(p1);
        this.colliders.push(new THREE.Box3().setFromObject(p1));

        const p2 = new THREE.Mesh(archPillarGeo, buildingMat1);
        p2.position.set(-9, 6, 65);
        this.scene.add(p2);
        this.colliders.push(new THREE.Box3().setFromObject(p2));

        const p3 = new THREE.Mesh(archPillarGeo, buildingMat1);
        p3.position.set(9, 6, 45);
        this.scene.add(p3);
        this.colliders.push(new THREE.Box3().setFromObject(p3));

        const p4 = new THREE.Mesh(archPillarGeo, buildingMat1);
        p4.position.set(9, 6, 65);
        this.scene.add(p4);
        this.colliders.push(new THREE.Box3().setFromObject(p4));

        // Jump Pads (Launch player high into the air)
        const padGeo = new THREE.CylinderGeometry(3.5, 4, 0.6, 24);
        const padMat = new THREE.MeshStandardMaterial({
            color: 0x00f2fe,
            emissive: 0x00a8ff,
            emissiveIntensity: 0.8
        });

        const makeJumpPad = (x: number, z: number) => {
            const pad = new THREE.Mesh(padGeo, padMat);
            pad.position.set(x, 0.3, z);
            this.scene.add(pad);
            this.bouncePads.push(pad);
        };
        makeJumpPad(-10, -15);
        makeJumpPad(15, 20);
        makeJumpPad(-35, 10);
    }

    private createPlayer() {
        // Stylized Arcade Character
        const bodyGeo = new THREE.CylinderGeometry(0.65, 0.65, 1.8, 16);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, roughness: 0.4, metalness: 0.3 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.9;
        body.castShadow = true;
        this.player.add(body);

        // Jetpack / Rocket Backpack on player's back
        const packGeo = new THREE.BoxGeometry(0.7, 1.0, 0.5);
        const packMat = new THREE.MeshStandardMaterial({ color: 0xff4757, metalness: 0.7 });
        const pack = new THREE.Mesh(packGeo, packMat);
        pack.position.set(0, 1.1, -0.45);
        this.player.add(pack);

        // Head / Visor
        const headGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 2.1;
        this.player.add(head);

        const visorGeo = new THREE.BoxGeometry(0.55, 0.25, 0.35);
        const visorMat = new THREE.MeshBasicMaterial({ color: 0xffd32a });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 2.1, 0.35);
        this.player.add(visor);

        this.player.position.set(0, 0, 25);
        this.scene.add(this.player);
    }

    private setupTargets() {
        // 1. Concentric Bullseye Targets on Walls and Towers
        const makeBullseyeTarget = (id: string, pos: THREE.Vector3, rotY: number) => {
            const group = new THREE.Group();
            group.position.copy(pos);
            group.rotation.y = rotY;

            // Outer ring (white/blue)
            const outer = new THREE.Mesh(
                new THREE.CylinderGeometry(3.2, 3.2, 0.3, 32),
                new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
            );
            outer.rotation.x = Math.PI / 2;
            group.add(outer);

            // Mid ring (red)
            const mid = new THREE.Mesh(
                new THREE.CylinderGeometry(2.1, 2.1, 0.35, 32),
                new THREE.MeshStandardMaterial({ color: 0xff4757, roughness: 0.3 })
            );
            mid.rotation.x = Math.PI / 2;
            group.add(mid);

            // Center Bullseye (yellow/gold)
            const center = new THREE.Mesh(
                new THREE.CylinderGeometry(1.0, 1.0, 0.4, 32),
                new THREE.MeshStandardMaterial({ color: 0xffd32a, emissive: 0xffa502, emissiveIntensity: 0.5 })
            );
            center.rotation.x = Math.PI / 2;
            group.add(center);

            this.scene.add(group);
            this.targets.push({
                id,
                mesh: group,
                type: 'bullseye',
                basePoints: 250,
                position: pos.clone(),
                active: true,
                respawnTimer: 0
            });
        };

        // Mount bullseyes across the arena
        makeBullseyeTarget('target_nw_wall', new THREE.Vector3(-50, 16, -37.8), 0);
        makeBullseyeTarget('target_se_tower', new THREE.Vector3(50, 14, 31.8), Math.PI);
        makeBullseyeTarget('target_mid_platform', new THREE.Vector3(0, 7, -10.2), 0);
        makeBullseyeTarget('target_north_boundary', new THREE.Vector3(20, 12, -147), 0);
        makeBullseyeTarget('target_west_boundary', new THREE.Vector3(-147, 12, 10), Math.PI / 2);
        makeBullseyeTarget('target_tunnel_arch', new THREE.Vector3(0, 8, 40), Math.PI);

        // 2. Moving Drone Patrol Targets
        const makeDroneTarget = (id: string, startPos: THREE.Vector3, axis: 'x' | 'z', range: number, speed: number) => {
            const drone = new THREE.Group();
            drone.position.copy(startPos);

            const core = new THREE.Mesh(
                new THREE.SphereGeometry(1.4, 16, 16),
                new THREE.MeshStandardMaterial({ color: 0x9b59b6, emissive: 0x8e44ad, emissiveIntensity: 0.6 })
            );
            drone.add(core);

            // Rotor arms
            const arm1 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 0.5), new THREE.MeshStandardMaterial({ color: 0x34495e }));
            const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 4.2), new THREE.MeshStandardMaterial({ color: 0x34495e }));
            drone.add(arm1);
            drone.add(arm2);

            // Rotor lights
            const rotorGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
            rotorGlow.position.set(2.0, 0.3, 0);
            drone.add(rotorGlow);

            const rotorGlow2 = rotorGlow.clone();
            rotorGlow2.position.set(-2.0, 0.3, 0);
            drone.add(rotorGlow2);

            this.scene.add(drone);
            this.targets.push({
                id,
                mesh: drone,
                type: 'drone',
                basePoints: 300,
                position: startPos.clone(),
                active: true,
                respawnTimer: 0,
                patrolAxis: axis,
                patrolRange: range,
                patrolSpeed: speed,
                initialPos: startPos.clone()
            });
        };

        makeDroneTarget('drone_patrol_1', new THREE.Vector3(-20, 16, 0), 'x', 30, 1.8);
        makeDroneTarget('drone_patrol_2', new THREE.Vector3(30, 22, -20), 'z', 40, 2.4);
        makeDroneTarget('drone_patrol_3', new THREE.Vector3(-60, 24, 40), 'z', 25, 1.6);

        // 3. Floating Bonus Star / Balloon Target
        const makeStarBalloon = (id: string, pos: THREE.Vector3) => {
            const group = new THREE.Group();
            group.position.copy(pos);

            const balloon = new THREE.Mesh(
                new THREE.IcosahedronGeometry(2.0, 1),
                new THREE.MeshStandardMaterial({ color: 0xffd32a, emissive: 0xff9f1a, emissiveIntensity: 0.7, roughness: 0.2 })
            );
            group.add(balloon);

            const halo = new THREE.Mesh(
                new THREE.TorusGeometry(3.0, 0.15, 12, 32),
                new THREE.MeshBasicMaterial({ color: 0x00f2fe })
            );
            halo.rotation.x = Math.PI / 2;
            group.add(halo);

            this.scene.add(group);
            this.targets.push({
                id,
                mesh: group,
                type: 'balloon',
                basePoints: 500,
                position: pos.clone(),
                active: true,
                respawnTimer: 0,
                patrolAxis: 'y',
                patrolRange: 4,
                patrolSpeed: 1.2,
                initialPos: pos.clone()
            });
        };

        makeStarBalloon('star_balloon_center', new THREE.Vector3(0, 28, 0));
        makeStarBalloon('star_balloon_nw', new THREE.Vector3(-50, 36, -50));
        makeStarBalloon('star_balloon_se', new THREE.Vector3(50, 34, 45));
    }

    private setupKeyboardControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            // Space to Jump
            if (e.code === 'Space') {
                e.preventDefault();
                this.tryJump();
            }

            // F or Left click to Fire
            if (e.code === 'KeyF') {
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

        // Pointer Lock & mouse drag look
        viewport.addEventListener('mousedown', (e: MouseEvent) => {
            // Ignore clicks on HUD buttons or modals
            if ((e.target as HTMLElement).closest('.top-hud, .desktop-fire-btn, .game-modal-backdrop')) return;

            this.isMouseDown = true;
            this.prevMouseX = e.clientX;
            this.prevMouseY = e.clientY;

            // Left click triggers firing rocket
            if (e.button === 0) {
                this.fireRocket();
            }
        });

        window.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });

        window.addEventListener('mousemove', (e: MouseEvent) => {
            if (document.pointerLockElement === viewport || this.isMouseDown) {
                const dx = (document.pointerLockElement === viewport) ? e.movementX : (e.clientX - this.prevMouseX);
                const dy = (document.pointerLockElement === viewport) ? e.movementY : (e.clientY - this.prevMouseY);

                this.cameraYaw -= dx * 0.0032;
                this.cameraPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.cameraPitch - dy * 0.0032));

                this.prevMouseX = e.clientX;
                this.prevMouseY = e.clientY;
            }
        });

        // Click to request pointer lock on PC
        viewport.addEventListener('dblclick', () => {
            if (!this.isMobileDevice && viewport.requestPointerLock) {
                viewport.requestPointerLock();
            }
        });
    }

    private setupButtons() {
        // Desktop FIRE Button
        const fireBtn = document.getElementById('btn-fire');
        if (fireBtn) {
            fireBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.fireRocket();
            });
        }

        // Shop Buttons
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

        // Sound toggle
        const soundBtn = document.getElementById('btn-toggle-sound');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                this.audio.soundEnabled = !this.audio.soundEnabled;
                soundBtn.textContent = this.audio.soundEnabled ? '🔊' : '🔇';
            });
        }

        // Hide PC controls bar on mobile
        const pcBar = document.getElementById('pc-controls-bar');
        if (this.isMobileDevice && pcBar) {
            pcBar.style.display = 'none';
        }
    }

    private setupMobileControls() {
        // In mobile mode: Left movable virtual joystick, Right dedicated FIRE button, Right JUMP button.
        // PC-l mobiilinuppe ei kuvata!
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
        zone.style.background = 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, rgba(15, 23, 42, 0.55) 100%)';
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
        knob.innerHTML = '<span style="font-size: 18px; color: white; display: flex; align-items: center; justify-content: center; height: 100%;">🕹️</span>';

        zone.appendChild(knob);
        layer.appendChild(zone);

        // 2. Right Action Cluster (FIRE Button + JUMP Button)
        const actionZone = document.createElement('div');
        actionZone.style.position = 'absolute';
        actionZone.style.bottom = '35px';
        actionZone.style.right = '35px';
        actionZone.style.display = 'flex';
        actionZone.style.flexDirection = 'column-reverse';
        actionZone.style.gap = '16px';
        actionZone.style.alignItems = 'center';
        actionZone.style.pointerEvents = 'auto';

        // Jump Button
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
            this.tryJump();
        }, { passive: false });

        // Mobile Fire Button
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

    private tryJump() {
        if (this.isGrounded) {
            this.playerVelocity.y = 14;
            this.isGrounded = false;
        }
    }

    public fireRocket(): boolean {
        if (!this.roundActive) return false;

        this.shotsFired++;
        this.audio.playWhoosh();

        // Calculate fire origin (just above player chest)
        const spawnPos = this.player.position.clone();
        spawnPos.y += 1.6;

        // Aim direction from camera forward
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);

        // Stylized Arcade Rocket 3D Model
        const rocketGroup = new THREE.Group();
        rocketGroup.position.copy(spawnPos);

        // Rocket body
        const bodyGeo = new THREE.CylinderGeometry(0.2, 0.28, 1.4, 16);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: this.equippedRocket.color,
            metalness: 0.6,
            roughness: 0.3
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.x = Math.PI / 2;
        rocketGroup.add(body);

        // Nose cone
        const noseGeo = new THREE.ConeGeometry(0.22, 0.6, 16);
        const noseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.z = 0.9;
        nose.rotation.x = Math.PI / 2;
        rocketGroup.add(nose);

        // Glowing Fins
        const finGeo = new THREE.BoxGeometry(0.8, 0.05, 0.4);
        const finMat = new THREE.MeshBasicMaterial({ color: this.equippedRocket.trailColor });
        const fin1 = new THREE.Mesh(finGeo, finMat);
        fin1.position.z = -0.4;
        rocketGroup.add(fin1);

        const fin2 = fin1.clone();
        fin2.rotation.z = Math.PI / 2;
        rocketGroup.add(fin2);

        // Thruster glow point light
        const thrusterLight = new THREE.PointLight(this.equippedRocket.trailColor, 3, 10);
        thrusterLight.position.z = -0.8;
        rocketGroup.add(thrusterLight);

        // Align rocket orientation with forward vector
        rocketGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward);

        this.scene.add(rocketGroup);

        this.activeRockets.push({
            mesh: rocketGroup,
            velocity: forward.clone().multiplyScalar(this.equippedRocket.speed),
            rocketType: this.equippedRocket,
            spawnTime: performance.now(),
            particles: []
        });

        // Shake camera slightly on launch
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.08);

        return true;
    }

    private triggerExplosion(impactPos: THREE.Vector3, rocketType: RocketType, hitTarget?: ArenaTarget, hitDistFromCenter: number = 0) {
        this.audio.playBoom();

        // 1. Expanding Cartoon Blast Sphere
        const blastGeo = new THREE.SphereGeometry(1.0, 16, 16);
        const blastMat = new THREE.MeshBasicMaterial({
            color: rocketType.color,
            transparent: true,
            opacity: 0.9
        });
        const blastMesh = new THREE.Mesh(blastGeo, blastMat);
        blastMesh.position.copy(impactPos);
        this.scene.add(blastMesh);

        // 2. Flying Spark Burst Particles
        const particleCount = 28;
        const particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities: THREE.Vector3[] = [];

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = impactPos.x;
            positions[i * 3 + 1] = impactPos.y;
            positions[i * 3 + 2] = impactPos.z;

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = 12 + Math.random() * 20;
            velocities.push(new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta) * speed,
                Math.cos(phi) * speed,
                Math.sin(phi) * Math.sin(theta) * speed
            ));
        }

        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const pMat = new THREE.PointsMaterial({
            color: rocketType.trailColor,
            size: 0.65,
            transparent: true,
            opacity: 1.0
        });
        const pSystem = new THREE.Points(particleGeo, pMat);
        this.scene.add(pSystem);

        // Animate blast expansion and spark decay
        let elapsed = 0;
        const blastAnimInterval = setInterval(() => {
            elapsed += 0.03;
            const scale = 1.0 + elapsed * (rocketType.blastRadius * 2.2);
            blastMesh.scale.set(scale, scale, scale);
            blastMat.opacity = Math.max(0, 0.9 - elapsed * 2.2);

            const posArr = particleGeo.attributes.position.array as Float32Array;
            for (let i = 0; i < particleCount; i++) {
                posArr[i * 3] += velocities[i].x * 0.03;
                posArr[i * 3 + 1] += velocities[i].y * 0.03;
                posArr[i * 3 + 2] += velocities[i].z * 0.03;
                velocities[i].y -= 9.8 * 0.03; // gravity
            }
            particleGeo.attributes.position.needsUpdate = true;
            pMat.opacity = Math.max(0, 1.0 - elapsed * 2.0);

            if (elapsed >= 0.45) {
                clearInterval(blastAnimInterval);
                this.scene.remove(blastMesh);
                this.scene.remove(pSystem);
                blastGeo.dispose();
                blastMat.dispose();
                particleGeo.dispose();
                pMat.dispose();
            }
        }, 30);

        // 3. Screen Shake & BOOM Toast
        this.shakeIntensity = 0.35;
        this.triggerViewportShake();

        if (hitTarget) {
            this.targetsHit++;
            this.audio.playHitChime();

            // Calculate points with accuracy bonus
            let earned = hitTarget.basePoints;
            let label = 'BOOM! 💥';

            if (hitTarget.type === 'bullseye') {
                if (hitDistFromCenter < 1.2) {
                    earned = Math.round(earned * 1.5);
                    label = 'BULLSEYE! 🎯';
                } else if (hitDistFromCenter < 2.2) {
                    earned = Math.round(earned * 1.0);
                    label = 'GREAT SHOT! 🎯';
                } else {
                    earned = Math.round(earned * 0.6);
                    label = 'OUTER HIT! 💥';
                }
            } else if (hitTarget.type === 'drone') {
                label = 'DRONE DOWN! ⚡';
            } else if (hitTarget.type === 'balloon') {
                label = 'SUPER STAR! ⭐';
            }

            // Apply equipped rocket multiplier
            earned = Math.round(earned * rocketType.scoreMultiplier);
            this.currentScore += earned;
            this.totalPointsBank += earned;
            this.saveProgress();

            this.showImpactToast(`${label} +${earned} PTS`);
            this.updateHUD();

            // Temporarily hide hit target and set respawn timer
            hitTarget.active = false;
            hitTarget.mesh.visible = false;
            hitTarget.respawnTimer = 4.0; // Respawns after 4 seconds
        } else {
            this.showImpactToast('BOOM! 💥');
        }
    }

    private triggerViewportShake() {
        const wrapper = document.getElementById('game-viewport-wrapper');
        if (wrapper) {
            wrapper.classList.remove('screen-shake');
            void wrapper.offsetWidth; // trigger reflow
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
        }, 1200);
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

        // Calculate accuracy
        const acc = this.shotsFired > 0 ? Math.round((this.targetsHit / this.shotsFired) * 100) : 0;

        // Reward Yards
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
        this.player.position.set(0, 0, 25);
        this.playerVelocity.set(0, 0, 0);

        // Respawn all targets
        this.targets.forEach(t => {
            t.active = true;
            t.mesh.visible = true;
            t.respawnTimer = 0;
        });

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
                <div class="rocket-item-stats">Kiirus: ${rocket.speed} m/s · Boonus: ${rocket.scoreMultiplier}x</div>
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
            this.saveProgress();
            this.updateHUD();
            this.renderShopCatalog();
            this.audio.playPurchase();
        } else if (this.totalPointsBank >= rocket.price) {
            this.totalPointsBank -= rocket.price;
            this.unlockedRockets.add(rocket.id);
            this.equippedRocket = rocket;
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
                    if (found) this.equippedRocket = found;
                }
            }
        } catch (e) {}
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private updatePlayerMovement(dt: number) {
        // Horizontal movement direction from camera forward/right
        const forward = new THREE.Vector3(Math.sin(this.cameraYaw), 0, Math.cos(this.cameraYaw));
        const right = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));

        let moveX = 0;
        let moveZ = 0;

        if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

        // Mobile virtual joystick input
        if (this.isMobileDevice && (this.mobileMoveVector.x !== 0 || this.mobileMoveVector.y !== 0)) {
            moveX = this.mobileMoveVector.x;
            moveZ = this.mobileMoveVector.y;
        }

        const moveDir = new THREE.Vector3();
        moveDir.addScaledVector(forward, -moveZ);
        moveDir.addScaledVector(right, moveX);
        if (moveDir.lengthSq() > 0.001) moveDir.normalize();

        const moveSpeed = 16.0;
        this.playerVelocity.x = moveDir.x * moveSpeed;
        this.playerVelocity.z = moveDir.z * moveSpeed;

        // Gravity
        this.playerVelocity.y -= 32 * dt;

        // Proposed position
        const nextPos = this.player.position.clone();
        nextPos.x += this.playerVelocity.x * dt;
        nextPos.z += this.playerVelocity.z * dt;
        nextPos.y += this.playerVelocity.y * dt;

        // Arena boundary clamping
        nextPos.x = Math.max(-145, Math.min(145, nextPos.x));
        nextPos.z = Math.max(-145, Math.min(145, nextPos.z));

        // Ground check
        if (nextPos.y <= 0) {
            nextPos.y = 0;
            this.playerVelocity.y = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        // Platform & Building Box Collisions
        const playerRadius = 0.7;
        const playerHeight = 2.4;
        const playerBox = new THREE.Box3(
            new THREE.Vector3(nextPos.x - playerRadius, nextPos.y, nextPos.z - playerRadius),
            new THREE.Vector3(nextPos.x + playerRadius, nextPos.y + playerHeight, nextPos.z + playerRadius)
        );

        for (const col of this.colliders) {
            if (playerBox.intersectsBox(col)) {
                // Check if standing on top
                if (this.player.position.y >= col.max.y - 0.4 && this.playerVelocity.y <= 0) {
                    nextPos.y = col.max.y;
                    this.playerVelocity.y = 0;
                    this.isGrounded = true;
                } else {
                    // Push out horizontally
                    nextPos.x = this.player.position.x;
                    nextPos.z = this.player.position.z;
                }
            }
        }

        // Bounce Pad trigger
        for (const pad of this.bouncePads) {
            const d = Math.hypot(nextPos.x - pad.position.x, nextPos.z - pad.position.z);
            if (d < 3.8 && nextPos.y <= 0.6) {
                this.playerVelocity.y = 28; // High launch!
                this.isGrounded = false;
                this.audio.playWhoosh();
                this.showImpactToast('BOUNCE LAUNCH! 🚀');
                break;
            }
        }

        this.player.position.copy(nextPos);

        // Turn character body to face moving direction
        if (moveDir.lengthSq() > 0.01) {
            this.player.rotation.y = Math.atan2(moveDir.x, moveDir.z);
        }

        // Position Camera (Third-person follow view)
        const cameraDist = 5.2;
        const cameraHeight = 2.4;
        const camOffset = new THREE.Vector3(
            -Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * cameraDist,
            Math.sin(this.cameraPitch) * cameraDist + cameraHeight,
            -Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * cameraDist
        );

        // Apply screen shake jitter
        if (this.shakeIntensity > 0) {
            camOffset.x += (Math.random() - 0.5) * this.shakeIntensity;
            camOffset.y += (Math.random() - 0.5) * this.shakeIntensity;
            camOffset.z += (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 1.8);
        }

        this.camera.position.copy(this.player.position).add(camOffset);
        const lookTarget = this.player.position.clone().add(new THREE.Vector3(0, 1.8, 0));
        this.camera.lookAt(lookTarget);
    }

    private updateRockets(dt: number) {
        const raycaster = new THREE.Raycaster();

        for (let i = this.activeRockets.length - 1; i >= 0; i--) {
            const rocket = this.activeRockets[i];
            const oldPos = rocket.mesh.position.clone();
            const step = rocket.velocity.clone().multiplyScalar(dt);
            const newPos = oldPos.clone().add(step);

            // Spawn smoke particle puff behind rocket
            this.createSmokePuff(oldPos, rocket.rocketType.trailColor);

            // Raycast check between old and new position
            const moveVec = newPos.clone().sub(oldPos);
            const dist = moveVec.length();
            if (dist > 0.001) {
                raycaster.set(oldPos, moveVec.clone().normalize());
                raycaster.far = dist;

                // 1. Check target collisions
                let hitTarget: ArenaTarget | undefined;
                let hitDist = 0;
                let hitPoint: THREE.Vector3 | null = null;

                for (const target of this.targets) {
                    if (!target.active) continue;
                    const intersects = raycaster.intersectObject(target.mesh, true);
                    if (intersects.length > 0) {
                        hitTarget = target;
                        hitPoint = intersects[0].point;
                        hitDist = hitPoint.distanceTo(target.position);
                        break;
                    }
                }

                if (hitTarget && hitPoint) {
                    this.triggerExplosion(hitPoint, rocket.rocketType, hitTarget, hitDist);
                    this.scene.remove(rocket.mesh);
                    this.activeRockets.splice(i, 1);
                    continue;
                }

                // 2. Check arena terrain / collider collisions
                let hitObstacle = false;
                for (const col of this.colliders) {
                    const ray = new THREE.Ray(oldPos, moveVec.clone().normalize());
                    const intPt = new THREE.Vector3();
                    if (ray.intersectBox(col, intPt)) {
                        if (oldPos.distanceTo(intPt) <= dist) {
                            this.triggerExplosion(intPt, rocket.rocketType);
                            this.scene.remove(rocket.mesh);
                            this.activeRockets.splice(i, 1);
                            hitObstacle = true;
                            break;
                        }
                    }
                }
                if (hitObstacle) continue;

                // Ground hit
                if (newPos.y <= 0) {
                    newPos.y = 0;
                    this.triggerExplosion(newPos, rocket.rocketType);
                    this.scene.remove(rocket.mesh);
                    this.activeRockets.splice(i, 1);
                    continue;
                }
            }

            // Expiration after 5 seconds
            if (performance.now() - rocket.spawnTime > 5000) {
                this.scene.remove(rocket.mesh);
                this.activeRockets.splice(i, 1);
                continue;
            }

            rocket.mesh.position.copy(newPos);
        }
    }

    private createSmokePuff(pos: THREE.Vector3, color: number) {
        const puff = new THREE.Mesh(
            new THREE.SphereGeometry(0.35 + Math.random() * 0.25, 8, 8),
            new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.75
            })
        );
        puff.position.copy(pos);
        this.particlePuffGroup.add(puff);

        let age = 0;
        const interval = setInterval(() => {
            age += 0.04;
            puff.scale.multiplyScalar(1.08);
            (puff.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.75 - age * 2.2);

            if (age >= 0.35) {
                clearInterval(interval);
                this.particlePuffGroup.remove(puff);
                puff.geometry.dispose();
                (puff.material as THREE.Material).dispose();
            }
        }, 30);
    }

    private updateTargets(dt: number, time: number) {
        for (const target of this.targets) {
            // Respawn countdown
            if (!target.active) {
                target.respawnTimer -= dt;
                if (target.respawnTimer <= 0) {
                    target.active = true;
                    target.mesh.visible = true;
                }
                continue;
            }

            // Target animations
            if (target.type === 'drone' && target.initialPos && target.patrolAxis && target.patrolRange && target.patrolSpeed) {
                const offset = Math.sin(time * target.patrolSpeed) * target.patrolRange;
                if (target.patrolAxis === 'x') target.mesh.position.x = target.initialPos.x + offset;
                if (target.patrolAxis === 'z') target.mesh.position.z = target.initialPos.z + offset;
                target.mesh.rotation.y += 0.03;
            } else if (target.type === 'balloon' && target.initialPos && target.patrolRange && target.patrolSpeed) {
                const offset = Math.sin(time * target.patrolSpeed) * target.patrolRange;
                target.mesh.position.y = target.initialPos.y + offset;
                target.mesh.rotation.y += 0.02;
                target.mesh.rotation.z = Math.sin(time * 2) * 0.1;
            } else if (target.type === 'bullseye') {
                target.mesh.rotation.z += 0.005;
            }
        }
    }

    private lastTime = 0;
    private animate(timestamp: number) {
        requestAnimationFrame((t) => this.animate(t));

        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        const time = timestamp / 1000;

        this.updatePlayerMovement(dt);
        this.updateRockets(dt);
        this.updateTargets(dt, time);

        this.renderer.render(this.scene, this.camera);
    }
}

// Global initialization
window.addEventListener('DOMContentLoaded', () => {
    const game = new RocketGame();
    (window as any).rocketGame = game;
    game.init();
});
