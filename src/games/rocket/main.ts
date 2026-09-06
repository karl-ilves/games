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
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.32);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.32);
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
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);

        gain.gain.setValueAtTime(0.75, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);

        // Arcade burst noise
        const bufferSize = this.ctx.sampleRate * 0.28;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.05));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(180, now + 0.28);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.55, now);
        nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

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
        speed: 85,
        color: 0xff4757,
        trailColor: 0xffa502,
        price: 0,
        scoreMultiplier: 1.0,
        blastRadius: 5.5
    },
    {
        id: 'neon_turbo',
        name: 'Neon Turbo',
        icon: '⚡',
        desc: 'Elektri-tsüaani laenguga ülikiire rakett +25% punktiboonusega.',
        speed: 115,
        color: 0x00f2fe,
        trailColor: 0x4facfe,
        price: 500,
        scoreMultiplier: 1.25,
        blastRadius: 6.5
    },
    {
        id: 'rainbow_comet',
        name: 'Rainbow Comet',
        icon: '🌈',
        desc: 'Vikerkaare sädemetega komeetrakett suure plahvatuse ja +50% boonusega.',
        speed: 135,
        color: 0xff6b81,
        trailColor: 0x2ed573,
        price: 1200,
        scoreMultiplier: 1.5,
        blastRadius: 7.5
    },
    {
        id: 'quantum_starfire',
        name: 'Quantum Starfire',
        icon: '🌟',
        desc: 'Kuldne supernoova rakett hüperkiirusega ja 2.0x topeltpunktidega!',
        speed: 165,
        color: 0xffd32a,
        trailColor: 0xff9f1a,
        price: 2500,
        scoreMultiplier: 2.0,
        blastRadius: 9.0
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

// Active in-flight projectile targeting a ground ring position
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

    // Colliders, Targets & Projectiles
    private colliders: THREE.Box3[] = [];
    public targets: ArenaTarget[] = [];
    public activeRockets: InFlightRocket[] = [];
    private particlePuffGroup: THREE.Group;

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

    // Screen Shake
    private shakeIntensity = 0;

    constructor() {
        this.audio = new RocketAudio();
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0f1c);
        this.scene.fog = new THREE.FogExp2(0x0a0f1c, 0.005);

        // High Aerial Camera (Top-down arcade tactical perspective)
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
        this.camera.position.set(0, 68, 52);
        this.camera.lookAt(0, 0, -4);

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
        this.scene.add(this.particlePuffGroup);

        // Targeting Ring materials
        this.ringMaterial = new THREE.MeshBasicMaterial({
            color: this.equippedRocket.color,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
        });

        const beaconMat = new THREE.MeshBasicMaterial({
            color: this.equippedRocket.color,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide
        });
        const beamGeo = new THREE.CylinderGeometry(0.3, 2.5, 45, 16, 1, true);
        this.beaconBeam = new THREE.Mesh(beamGeo, beaconMat);
        this.beaconBeam.position.y = 22.5;

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
        this.createTargetRing();
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
            description: 'Vaade õhust ja ring, kuhu raketti saab lasta! 3D arkaad sihtmärkide tabamismäng.',
            url: './games/rocket/index.html',
            icon: '🚀',
            badgeText: '👑 OWNER EXCLUSIVE'
        });

        return true;
    }

    private setupLighting() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xfff0e6, 1.3);
        dirLight.position.set(50, 120, 60);
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

        // Neon ambient accent lights
        const accentCyan = new THREE.PointLight(0x00f2fe, 3.0, 120);
        accentCyan.position.set(-35, 30, -25);
        this.scene.add(accentCyan);

        const accentPink = new THREE.PointLight(0xff2e63, 3.0, 120);
        accentPink.position.set(35, 30, 25);
        this.scene.add(accentPink);
    }

    private buildArena() {
        // Large Open Arena with Colorful Grid
        const groundSize = 280;
        const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x111625,
            roughness: 0.85,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.groundPlaneMesh = ground;

        // Grid helper on floor for clean aerial top-down visibility
        const gridHelper = new THREE.GridHelper(groundSize, 56, 0x00f2fe, 0x1e293b);
        gridHelper.position.y = 0.05;
        this.scene.add(gridHelper);

        // Arena boundary walls
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x161d31, roughness: 0.6 });
        const wallHeight = 16;
        const half = groundSize / 2;

        const makeWall = (w: number, d: number, x: number, z: number) => {
            const geo = new THREE.BoxGeometry(w, wallHeight, d);
            const m = new THREE.Mesh(geo, wallMat);
            m.position.set(x, wallHeight / 2, z);
            m.receiveShadow = true;
            this.scene.add(m);
            this.colliders.push(new THREE.Box3().setFromObject(m));
        };
        makeWall(groundSize, 4, 0, -half);
        makeWall(groundSize, 4, 0, half);
        makeWall(4, groundSize, -half, 0);
        makeWall(4, groundSize, half, 0);

        // Buildings, Platforms, Bridges, Tunnels
        const bMat1 = new THREE.MeshStandardMaterial({ color: 0x1e2746, roughness: 0.6 });
        const bMat2 = new THREE.MeshStandardMaterial({ color: 0x27193b, roughness: 0.6 });
        const neonTrim = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
        const yellowTrim = new THREE.MeshBasicMaterial({ color: 0xffd32a });

        const createBuilding = (x: number, z: number, w: number, h: number, d: number, mat: THREE.Material) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            mesh.position.set(x, h / 2, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            this.colliders.push(new THREE.Box3().setFromObject(mesh));

            // Neon roof trim
            const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4), neonTrim);
            roof.position.set(x, h + 0.25, z);
            this.scene.add(roof);

            return mesh;
        };

        // Arena structures
        createBuilding(-45, -45, 22, 18, 22, bMat1);
        createBuilding(-20, -55, 16, 12, 16, bMat2);
        createBuilding(45, 40, 24, 16, 24, bMat1);
        createBuilding(55, 10, 16, 10, 18, bMat2);
        createBuilding(0, 0, 22, 8, 22, bMat1);

        // Bridges connecting roofs
        const bridgeGeo = new THREE.BoxGeometry(8, 1, 40);
        const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5 });
        const bridge1 = new THREE.Mesh(bridgeGeo, bridgeMat);
        bridge1.position.set(-22, 10, -22);
        bridge1.rotation.y = Math.PI / 4;
        bridge1.castShadow = true;
        bridge1.receiveShadow = true;
        this.scene.add(bridge1);
        this.colliders.push(new THREE.Box3().setFromObject(bridge1));

        // Floating Platforms
        const platGeo = new THREE.BoxGeometry(12, 1.2, 12);
        const platMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
        const makePlatform = (x: number, y: number, z: number) => {
            const p = new THREE.Mesh(platGeo, platMat);
            p.position.set(x, y, z);
            p.castShadow = true;
            p.receiveShadow = true;
            this.scene.add(p);
            this.colliders.push(new THREE.Box3().setFromObject(p));

            const trim = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.3, 12.2), yellowTrim);
            trim.position.set(x, y + 0.65, z);
            this.scene.add(trim);
        };

        makePlatform(25, 6, -20);
        makePlatform(38, 11, -35);
        makePlatform(-20, 6, 30);
        makePlatform(-40, 10, 42);

        // Archway Tunnel
        const archRoof = new THREE.Mesh(new THREE.BoxGeometry(22, 2, 28), bMat2);
        archRoof.position.set(0, 9, 45);
        this.scene.add(archRoof);
        this.colliders.push(new THREE.Box3().setFromObject(archRoof));
    }

    private createTargetRing() {
        // The Targeting Ring on the ground where the rocket will hit
        // Outer Ring
        const outerRingGeo = new THREE.RingGeometry(3.6, 4.2, 48);
        const outerRing = new THREE.Mesh(outerRingGeo, this.ringMaterial);
        outerRing.rotation.x = -Math.PI / 2;
        this.targetRing.add(outerRing);

        // Middle dashed ring
        const midRingGeo = new THREE.RingGeometry(2.0, 2.3, 36);
        const midRing = new THREE.Mesh(midRingGeo, this.ringMaterial);
        midRing.rotation.x = -Math.PI / 2;
        this.targetRing.add(midRing);

        // Center Bullseye Dot
        const centerDotGeo = new THREE.CircleGeometry(0.7, 24);
        const centerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        const centerDot = new THREE.Mesh(centerDotGeo, centerMat);
        centerDot.rotation.x = -Math.PI / 2;
        this.targetRing.add(centerDot);

        // 4 Reticle Ticks (North, South, East, West)
        const tickGeo = new THREE.PlaneGeometry(0.3, 2.0);
        const makeTick = (x: number, z: number, rotY: number) => {
            const tick = new THREE.Mesh(tickGeo, this.ringMaterial);
            tick.rotation.x = -Math.PI / 2;
            tick.rotation.z = rotY;
            tick.position.set(x, 0.01, z);
            this.targetRing.add(tick);
        };
        makeTick(0, -4.8, 0);
        makeTick(0, 4.8, 0);
        makeTick(-4.8, 0, Math.PI / 2);
        makeTick(4.8, 0, Math.PI / 2);

        // Vertical glowing target beam
        this.targetRing.add(this.beaconBeam);

        this.targetRing.position.copy(this.ringPosition);
        this.scene.add(this.targetRing);
    }

    private setupTargets() {
        // 1. Concentric Bullseye Targets on Surfaces
        const makeBullseyeTarget = (id: string, pos: THREE.Vector3, rotX: number, rotY: number) => {
            const group = new THREE.Group();
            group.position.copy(pos);
            group.rotation.x = rotX;
            group.rotation.y = rotY;

            // Outer ring
            const outer = new THREE.Mesh(
                new THREE.CylinderGeometry(3.5, 3.5, 0.3, 32),
                new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
            );
            group.add(outer);

            // Mid ring
            const mid = new THREE.Mesh(
                new THREE.CylinderGeometry(2.3, 2.3, 0.35, 32),
                new THREE.MeshStandardMaterial({ color: 0xff4757, roughness: 0.3 })
            );
            group.add(mid);

            // Center Bullseye
            const center = new THREE.Mesh(
                new THREE.CylinderGeometry(1.0, 1.0, 0.4, 32),
                new THREE.MeshStandardMaterial({ color: 0xffd32a, emissive: 0xffa502, emissiveIntensity: 0.7 })
            );
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

        // Flat ground and rooftop targets for aerial view
        makeBullseyeTarget('target_roof_nw', new THREE.Vector3(-45, 18.2, -45), 0, 0);
        makeBullseyeTarget('target_roof_se', new THREE.Vector3(45, 16.2, 40), 0, 0);
        makeBullseyeTarget('target_roof_mid', new THREE.Vector3(0, 8.2, 0), 0, 0);
        makeBullseyeTarget('target_ground_east', new THREE.Vector3(50, 0.2, -25), 0, 0);
        makeBullseyeTarget('target_ground_west', new THREE.Vector3(-55, 0.2, 20), 0, 0);
        makeBullseyeTarget('target_ground_north', new THREE.Vector3(15, 0.2, -60), 0, 0);

        // 2. Moving Drone Patrol Targets
        const makeDroneTarget = (id: string, startPos: THREE.Vector3, axis: 'x' | 'z', range: number, speed: number) => {
            const drone = new THREE.Group();
            drone.position.copy(startPos);

            const core = new THREE.Mesh(
                new THREE.SphereGeometry(1.5, 16, 16),
                new THREE.MeshStandardMaterial({ color: 0x9b59b6, emissive: 0x8e44ad, emissiveIntensity: 0.6 })
            );
            drone.add(core);

            const arm1 = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.2, 0.5), new THREE.MeshStandardMaterial({ color: 0x34495e }));
            const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 4.4), new THREE.MeshStandardMaterial({ color: 0x34495e }));
            drone.add(arm1);
            drone.add(arm2);

            const rotor1 = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 16), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
            rotor1.position.set(2.2, 0.3, 0);
            drone.add(rotor1);

            const rotor2 = rotor1.clone();
            rotor2.position.set(-2.2, 0.3, 0);
            drone.add(rotor2);

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

        makeDroneTarget('drone_patrol_1', new THREE.Vector3(-25, 12, 0), 'x', 35, 1.8);
        makeDroneTarget('drone_patrol_2', new THREE.Vector3(25, 15, -20), 'z', 45, 2.2);
        makeDroneTarget('drone_patrol_3', new THREE.Vector3(-45, 16, 35), 'z', 30, 1.6);

        // 3. Floating Bonus Star / Balloon Targets
        const makeStarBalloon = (id: string, pos: THREE.Vector3) => {
            const group = new THREE.Group();
            group.position.copy(pos);

            const star = new THREE.Mesh(
                new THREE.IcosahedronGeometry(2.2, 1),
                new THREE.MeshStandardMaterial({ color: 0xffd32a, emissive: 0xff9f1a, emissiveIntensity: 0.8, roughness: 0.2 })
            );
            group.add(star);

            const halo = new THREE.Mesh(
                new THREE.TorusGeometry(3.2, 0.18, 12, 32),
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
                patrolRange: 3.5,
                patrolSpeed: 1.4,
                initialPos: pos.clone()
            });
        };

        makeStarBalloon('star_balloon_center', new THREE.Vector3(0, 16, -15));
        makeStarBalloon('star_balloon_nw', new THREE.Vector3(-45, 22, -25));
        makeStarBalloon('star_balloon_se', new THREE.Vector3(40, 20, 20));
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

        // PC Mouse Move -> Raycast to position the Targeting Ring on the 3D arena surface
        window.addEventListener('mousemove', (e: MouseEvent) => {
            if (this.isMobileDevice) return;

            this.mouseCoords.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouseCoords.y = -(e.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouseCoords, this.camera);
            if (this.groundPlaneMesh) {
                const intersects = this.raycaster.intersectObjects([this.groundPlaneMesh, ...this.scene.children], true);
                for (const hit of intersects) {
                    if (hit.object !== this.beaconBeam && hit.point) {
                        this.ringPosition.x = Math.max(-130, Math.min(130, hit.point.x));
                        this.ringPosition.z = Math.max(-130, Math.min(130, hit.point.z));
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
        // Mobile / Tablet:
        // Left: 1 movable joystick (moves the targeting ring across the arena)
        // Right: FIRE button (fires rocket at the ring)
        // Right: JUMP button (quick boost/centering)
        // PC: mobile buttons are NOT displayed!
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

        // JUMP / BOOST button
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
            // Quick ring boost towards center
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

        // Rocket launches from high overhead towards the Targeting Ring
        const targetPoint = this.ringPosition.clone();
        const startPoint = new THREE.Vector3(
            targetPoint.x - 12 + (Math.random() - 0.5) * 8,
            targetPoint.y + 75,
            targetPoint.z + 30 + (Math.random() - 0.5) * 8
        );

        const toTarget = targetPoint.clone().sub(startPoint);
        const dir = toTarget.clone().normalize();

        // Stylized Arcade Rocket 3D Model
        const rocketGroup = new THREE.Group();
        rocketGroup.position.copy(startPoint);

        const bodyGeo = new THREE.CylinderGeometry(0.25, 0.35, 2.0, 16);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: this.equippedRocket.color,
            metalness: 0.6,
            roughness: 0.3
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.x = Math.PI / 2;
        rocketGroup.add(body);

        const noseGeo = new THREE.ConeGeometry(0.3, 0.8, 16);
        const noseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.z = 1.3;
        nose.rotation.x = Math.PI / 2;
        rocketGroup.add(nose);

        // Glowing Fins
        const finGeo = new THREE.BoxGeometry(1.2, 0.06, 0.6);
        const finMat = new THREE.MeshBasicMaterial({ color: this.equippedRocket.trailColor });
        const fin1 = new THREE.Mesh(finGeo, finMat);
        fin1.position.z = -0.6;
        rocketGroup.add(fin1);

        const fin2 = fin1.clone();
        fin2.rotation.z = Math.PI / 2;
        rocketGroup.add(fin2);

        // Thruster glow
        const thrusterLight = new THREE.PointLight(this.equippedRocket.trailColor, 3.5, 15);
        thrusterLight.position.z = -1.2;
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

        // Slight screen vibration on firing
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.1);

        return true;
    }

    public triggerExplosion(impactPos: THREE.Vector3, rocketType: RocketType, hitTarget?: ArenaTarget, hitDistFromCenter: number = 0) {
        this.audio.playBoom();

        // 1. Expanding Cartoon Blast Sphere
        const blastGeo = new THREE.SphereGeometry(1.0, 16, 16);
        const blastMat = new THREE.MeshBasicMaterial({
            color: rocketType.color,
            transparent: true,
            opacity: 0.95
        });
        const blastMesh = new THREE.Mesh(blastGeo, blastMat);
        blastMesh.position.copy(impactPos);
        this.scene.add(blastMesh);

        // 2. Flying Spark Burst Particles
        const particleCount = 32;
        const particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities: THREE.Vector3[] = [];

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = impactPos.x;
            positions[i * 3 + 1] = impactPos.y;
            positions[i * 3 + 2] = impactPos.z;

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = 14 + Math.random() * 24;
            velocities.push(new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta) * speed,
                Math.cos(phi) * speed,
                Math.sin(phi) * Math.sin(theta) * speed
            ));
        }

        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const pMat = new THREE.PointsMaterial({
            color: rocketType.trailColor,
            size: 0.8,
            transparent: true,
            opacity: 1.0
        });
        const pSystem = new THREE.Points(particleGeo, pMat);
        this.scene.add(pSystem);

        let elapsed = 0;
        const blastAnimInterval = setInterval(() => {
            elapsed += 0.03;
            const scale = 1.0 + elapsed * (rocketType.blastRadius * 2.4);
            blastMesh.scale.set(scale, scale, scale);
            blastMat.opacity = Math.max(0, 0.95 - elapsed * 2.2);

            const posArr = particleGeo.attributes.position.array as Float32Array;
            for (let i = 0; i < particleCount; i++) {
                posArr[i * 3] += velocities[i].x * 0.03;
                posArr[i * 3 + 1] += velocities[i].y * 0.03;
                posArr[i * 3 + 2] += velocities[i].z * 0.03;
                velocities[i].y -= 9.8 * 0.03;
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
        this.shakeIntensity = 0.45;
        this.triggerViewportShake();

        // 4. Hit Detection for all targets inside Blast Radius of impact
        let targetsHitInBlast = 0;
        for (const target of this.targets) {
            if (!target.active) continue;
            const dist = target.position.distanceTo(impactPos);
            if (dist <= rocketType.blastRadius || target === hitTarget) {
                targetsHitInBlast++;
                this.targetsHit++;
                this.audio.playHitChime();

                let earned = target.basePoints;
                let label = 'BOOM! 💥';

                if (dist < 1.6 || hitDistFromCenter < 1.6) {
                    earned = Math.round(earned * 1.5);
                    label = 'BULLSEYE! 🎯';
                } else if (dist < 3.2) {
                    earned = Math.round(earned * 1.0);
                    label = 'GREAT HIT! 🎯';
                } else {
                    earned = Math.round(earned * 0.7);
                    label = 'SPLASH HIT! 💥';
                }

                if (target.type === 'drone') label = 'DRONE DOWN! ⚡';
                if (target.type === 'balloon') label = 'STAR BURST! ⭐';

                earned = Math.round(earned * rocketType.scoreMultiplier);
                this.currentScore += earned;
                this.totalPointsBank += earned;
                this.saveProgress();

                this.showImpactToast(`${label} +${earned} PTS`);
                this.updateHUD();

                target.active = false;
                target.mesh.visible = false;
                target.respawnTimer = 4.0;
            }
        }

        if (targetsHitInBlast === 0) {
            this.showImpactToast('BOOM! 💥');
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
                <div class="rocket-item-stats">Kiirus: ${rocket.speed} m/s · Raadius: ${rocket.blastRadius}m · Boonus: ${rocket.scoreMultiplier}x</div>
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
        // Move target ring with keyboard or joystick
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

        const ringSpeed = 42.0;
        this.ringPosition.x += moveX * ringSpeed * dt;
        this.ringPosition.z += moveZ * ringSpeed * dt;

        this.ringPosition.x = Math.max(-130, Math.min(130, this.ringPosition.x));
        this.ringPosition.z = Math.max(-130, Math.min(130, this.ringPosition.z));

        // Pulsating and rotating target ring
        this.targetRing.position.copy(this.ringPosition);
        this.targetRing.rotation.y += dt * 1.5;

        // Smooth camera follow tracking the ring from high overhead
        const targetCamX = this.ringPosition.x * 0.45;
        const targetCamZ = this.ringPosition.z * 0.45 + 52;
        const targetCamY = 68;

        this.camera.position.x += (targetCamX - this.camera.position.x) * 4 * dt;
        this.camera.position.z += (targetCamZ - this.camera.position.z) * 4 * dt;
        this.camera.position.y += (targetCamY - this.camera.position.y) * 4 * dt;

        // Apply screen shake
        if (this.shakeIntensity > 0) {
            this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity * 3;
            this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * 3;
            this.camera.position.z += (Math.random() - 0.5) * this.shakeIntensity * 3;
            this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.0);
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

            // Spawn smoke particles
            this.createSmokePuff(oldPos, rocket.rocketType.trailColor);

            // Check if rocket reached or passed the target ground ring plane
            if (newPos.y <= rocket.targetPos.y || oldPos.distanceTo(rocket.targetPos) < step.length()) {
                this.triggerExplosion(rocket.targetPos, rocket.rocketType);
                this.scene.remove(rocket.mesh);
                this.activeRockets.splice(i, 1);
                continue;
            }

            // Expiration
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
            new THREE.SphereGeometry(0.4 + Math.random() * 0.3, 8, 8),
            new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.8
            })
        );
        puff.position.copy(pos);
        this.particlePuffGroup.add(puff);

        let age = 0;
        const interval = setInterval(() => {
            age += 0.04;
            puff.scale.multiplyScalar(1.1);
            (puff.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 - age * 2.5);

            if (age >= 0.32) {
                clearInterval(interval);
                this.particlePuffGroup.remove(puff);
                puff.geometry.dispose();
                (puff.material as THREE.Material).dispose();
            }
        }, 30);
    }

    private updateTargets(dt: number, time: number) {
        for (const target of this.targets) {
            if (!target.active) {
                target.respawnTimer -= dt;
                if (target.respawnTimer <= 0) {
                    target.active = true;
                    target.mesh.visible = true;
                }
                continue;
            }

            if (target.type === 'drone' && target.initialPos && target.patrolAxis && target.patrolRange && target.patrolSpeed) {
                const offset = Math.sin(time * target.patrolSpeed) * target.patrolRange;
                if (target.patrolAxis === 'x') target.mesh.position.x = target.initialPos.x + offset;
                if (target.patrolAxis === 'z') target.mesh.position.z = target.initialPos.z + offset;
                target.mesh.rotation.y += 0.04;
            } else if (target.type === 'balloon' && target.initialPos && target.patrolRange && target.patrolSpeed) {
                const offset = Math.sin(time * target.patrolSpeed) * target.patrolRange;
                target.mesh.position.y = target.initialPos.y + offset;
                target.mesh.rotation.y += 0.02;
                target.mesh.rotation.z = Math.sin(time * 2) * 0.1;
            } else if (target.type === 'bullseye') {
                target.mesh.rotation.y += 0.008;
            }
        }
    }

    private lastTime = 0;
    private animate(timestamp: number) {
        requestAnimationFrame((t) => this.animate(t));

        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;
        const time = timestamp / 1000;

        this.updateTargetRing(dt);
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
