import * as THREE from 'three';
import { yardService } from '../../shared/yardService';
import { getCurrentUserProfile, isPlayardOwner, isTestMode } from '../../auth';

(window as any).yardService = yardService;

// --- Sound Synthesizer via Web Audio API ---
class MmpAudio {
    private ctx: AudioContext | null = null;
    public soundEnabled: boolean = true;
    private heartbeatOsc: OscillatorNode | null = null;
    private heartbeatGain: GainNode | null = null;
    private heartbeatTimer: any = null;

    private init() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) this.ctx = new AudioContextClass();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    public playGunshot() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        // 1. Noise burst for gun crack
        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3500, now);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.2);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);

        // 2. Low boom body
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
        oscGain.gain.setValueAtTime(0.7, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    public playKnifeSlash() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
    }

    public playStabImpact() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    public playCoin() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    public playPickupGun() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);
            gain.gain.setValueAtTime(0.35, now + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.06 + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.2);
        });
    }

    public playRoleReveal(role: 'murderer' | 'sheriff' | 'innocent') {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        if (role === 'murderer') {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, now);
            osc.frequency.exponentialRampToValueAtTime(65, now + 0.6);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.6);
        } else if (role === 'sheriff') {
            [440, 554.37, 659.25].forEach((f, i) => {
                if (!this.ctx) return;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, now + i * 0.1);
                gain.gain.setValueAtTime(0.3, now + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + i * 0.1);
                osc.stop(now + i * 0.1 + 0.3);
            });
        } else {
            [392, 523.25].forEach((f, i) => {
                if (!this.ctx) return;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(f, now + i * 0.12);
                gain.gain.setValueAtTime(0.25, now + i * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.25);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + i * 0.12);
                osc.stop(now + i * 0.12 + 0.25);
            });
        }
    }

    public playVictory() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const chords = [523.25, 659.25, 783.99, 1046.5];
        chords.forEach((freq, idx) => {
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.1);
            gain.gain.setValueAtTime(0.3, now + idx * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.5);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.1);
            osc.stop(now + idx * 0.1 + 0.5);
        });
    }

    public playIntermissionBeep() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    public setHeartbeatRate(distance: number) {
        if (!this.soundEnabled || distance > 22 || distance <= 0) {
            if (this.heartbeatTimer) {
                clearInterval(this.heartbeatTimer);
                this.heartbeatTimer = null;
            }
            return;
        }
        const interval = Math.max(250, Math.min(1000, distance * 50));
        if (!this.heartbeatTimer) {
            this.heartbeatTimer = setInterval(() => {
                this.triggerHeartbeat();
            }, interval);
        }
    }

    private triggerHeartbeat() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(70, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    }
}

const audio = new MmpAudio();

// --- Types & Interfaces ---
type Role = 'murderer' | 'sheriff' | 'innocent';
type GameState = 'lobby' | 'role_reveal' | 'in_game' | 'round_end';

interface Character {
    id: string;
    name: string;
    isPlayer: boolean;
    role: Role;
    isAlive: boolean;
    hasWeaponEquipped: boolean;
    mesh: THREE.Group;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    rotation: number;
    knifeMesh?: THREE.Mesh;
    gunMesh?: THREE.Group;
    bodyMesh?: THREE.Mesh;
    headMesh?: THREE.Mesh;
    aiTarget?: THREE.Vector3;
    aiTimer: number;
    coins: number;
}

interface DroppedGun {
    mesh: THREE.Group;
    position: THREE.Vector3;
    active: boolean;
}

interface CoinItem {
    mesh: THREE.Group;
    position: THREE.Vector3;
    collected: boolean;
}

// --- Main Game Class ---
export class MurderMysteryGame {
    private container: HTMLElement;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private clock: THREE.Clock;

    public state: GameState = 'lobby';
    private lobbyCountdown: number = 15;
    private roundTimer: number = 180; // 3 min
    private characters: Character[] = [];
    public playerChar!: Character;
    private droppedGun: DroppedGun | null = null;
    private coins: CoinItem[] = [];

    // Map models & colliders
    private mapColliders: THREE.Box3[] = [];
    private mansionGroup: THREE.Group = new THREE.Group();
    private lobbyGroup: THREE.Group = new THREE.Group();

    // Controls state
    private keys: { [key: string]: boolean } = {};
    private mouseX: number = 0;
    private mouseY: number = 0;
    private cameraPitch: number = 0.2;
    private cameraYaw: number = 0;
    private isPointerLocked: boolean = false;
    private isSprinting: boolean = false;

    // UI Cache
    private hudTimerVal: HTMLElement | null = null;
    private hudRoleBadge: HTMLElement | null = null;
    private hudRoleIcon: HTMLElement | null = null;
    private hudRoleText: HTMLElement | null = null;
    private hudAliveBadge: HTMLElement | null = null;
    private hudAliveCount: HTMLElement | null = null;
    private hudCoinsBadge: HTMLElement | null = null;
    private hudCoinsVal: HTMLElement | null = null;
    private gameYardVal: HTMLElement | null = null;
    private lobbyBanner: HTMLElement | null = null;
    private lobbyCountdownSec: HTMLElement | null = null;
    private gunDroppedBanner: HTMLElement | null = null;
    private incidentFeed: HTMLElement | null = null;
    private interactionPrompt: HTMLElement | null = null;
    private roleRevealOverlay: HTMLElement | null = null;
    private roundEndOverlay: HTMLElement | null = null;
    private slotWeapon: HTMLElement | null = null;
    private slotWeaponIcon: HTMLElement | null = null;
    private slotWeaponName: HTMLElement | null = null;

    constructor() {
        this.container = document.getElementById('canvas-container') || document.body;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0810);
        this.scene.fog = new THREE.FogExp2(0x0a0810, 0.025);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();

        this.cacheDomElements();
        this.checkAccessAuthorization();
        this.initLights();
        this.buildLobby();
        this.buildMansion();
        this.initCharacters();
        this.spawnCoins();
        this.bindEvents();
        this.updateYardDisplay();

        // Start render loop
        this.animate();
        console.log("MMP1: Murder Mystery 3D initialized successfully.");
    }

    private cacheDomElements() {
        this.hudTimerVal = document.getElementById('hud-timer-val');
        this.hudRoleBadge = document.getElementById('hud-role-badge');
        this.hudRoleIcon = document.getElementById('hud-role-icon');
        this.hudRoleText = document.getElementById('hud-role-text');
        this.hudAliveBadge = document.getElementById('hud-alive-badge');
        this.hudAliveCount = document.getElementById('hud-alive-count');
        this.hudCoinsBadge = document.getElementById('hud-coins-badge');
        this.hudCoinsVal = document.getElementById('hud-coins-val');
        this.gameYardVal = document.getElementById('game-yard-val');
        this.lobbyBanner = document.getElementById('lobby-banner');
        this.lobbyCountdownSec = document.getElementById('lobby-countdown-sec');
        this.gunDroppedBanner = document.getElementById('gun-dropped-banner');
        this.incidentFeed = document.getElementById('incident-feed');
        this.interactionPrompt = document.getElementById('interaction-prompt');
        this.roleRevealOverlay = document.getElementById('role-reveal-overlay');
        this.roundEndOverlay = document.getElementById('round-end-overlay');
        this.slotWeapon = document.getElementById('slot-weapon');
        this.slotWeaponIcon = document.getElementById('slot-weapon-icon');
        this.slotWeaponName = document.getElementById('slot-weapon-name');

        const gameYardIcon = document.getElementById('game-yard-icon');
        if (gameYardIcon) gameYardIcon.innerHTML = yardService.renderYardSvg(18);
    }

    private checkAccessAuthorization() {
        const prof = getCurrentUserProfile();
        const email = prof?.email;
        const owner = isPlayardOwner(email);
        const testMode = isTestMode();

        if (!owner && !testMode) {
            const denied = document.getElementById('access-denied-overlay');
            if (denied) denied.style.display = 'flex';
        }
    }

    private updateYardDisplay() {
        const yards = yardService.getYards();
        if (this.gameYardVal) this.gameYardVal.textContent = yards.toLocaleString();
    }

    // --- Lighting Setup ---
    private initLights() {
        const ambientLight = new THREE.AmbientLight(0xfff0f5, 0.45);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffeedd, 0.7);
        dirLight.position.set(20, 40, 20);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        this.scene.add(dirLight);
    }

    // --- 3D Waiting Lobby Builder ---
    private buildLobby() {
        this.lobbyGroup = new THREE.Group();
        this.lobbyGroup.position.set(0, 0, 150); // Lobby offset far from mansion

        // Lobby Floor
        const floorGeo = new THREE.BoxGeometry(40, 1, 40);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x1f1a29, roughness: 0.3, metalness: 0.2 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.lobbyGroup.add(floor);

        // Lobby Glass & Walls
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x2e243d, roughness: 0.5 });
        const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x00f2fe, transmission: 0.8, opacity: 0.6, transparent: true, roughness: 0.1 });

        // Outer walls
        const wallN = new THREE.Mesh(new THREE.BoxGeometry(40, 10, 1), wallMat);
        wallN.position.set(0, 5, -20);
        this.lobbyGroup.add(wallN);

        const wallS = new THREE.Mesh(new THREE.BoxGeometry(40, 10, 1), wallMat);
        wallS.position.set(0, 5, 20);
        this.lobbyGroup.add(wallS);

        const wallW = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 40), glassMat);
        wallW.position.set(-20, 5, 0);
        this.lobbyGroup.add(wallW);

        const wallE = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 40), glassMat);
        wallE.position.set(20, 5, 0);
        this.lobbyGroup.add(wallE);

        // Center Hologram Pillar / Pedestal
        const pedGeo = new THREE.CylinderGeometry(3, 3.5, 1, 16);
        const pedMat = new THREE.MeshStandardMaterial({ color: 0xff2e63, emissive: 0x330011, roughness: 0.2 });
        const pedestal = new THREE.Mesh(pedGeo, pedMat);
        pedestal.position.set(0, 0.5, 0);
        this.lobbyGroup.add(pedestal);

        // Floating Logo / Knife Icon above pedestal
        const holoGeo = new THREE.OctahedronGeometry(1.2, 0);
        const holoMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, emissive: 0xff9f1a, wireframe: true });
        const holo = new THREE.Mesh(holoGeo, holoMat);
        holo.position.set(0, 3.5, 0);
        this.lobbyGroup.add(holo);

        // Lobby Point Lights
        const lobbyLight = new THREE.PointLight(0xff2e63, 1.5, 30);
        lobbyLight.position.set(0, 7, 0);
        this.lobbyGroup.add(lobbyLight);

        this.scene.add(this.lobbyGroup);
    }

    // --- Mystery Mansion 3D Builder ---
    private buildMansion() {
        this.mansionGroup = new THREE.Group();
        this.mansionGroup.position.set(0, 0, 0);

        // 1. Mansion Main Floor (Wood Parquet)
        const floorGeo = new THREE.BoxGeometry(90, 1, 90);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.4, metalness: 0.1 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.mansionGroup.add(floor);

        // 2. Outer Mansion Walls
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x241d24, roughness: 0.7 });
        const createWall = (w: number, h: number, d: number, x: number, y: number, z: number) => {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
            wall.position.set(x, y, z);
            wall.castShadow = true;
            wall.receiveShadow = true;
            this.mansionGroup.add(wall);

            // Add bounding box collider
            const box = new THREE.Box3().setFromObject(wall);
            this.mapColliders.push(box);
        };

        // Outer Perimeter
        createWall(90, 12, 2, 0, 6, -45);
        createWall(90, 12, 2, 0, 6, 45);
        createWall(2, 12, 90, -45, 6, 0);
        createWall(2, 12, 90, 45, 6, 0);

        // Interior Rooms: Foyer, Library, Dining Hall, Kitchen, Secret Study
        // Room 1: Library (North-West)
        createWall(35, 12, 2, -25, 6, -15);
        createWall(2, 12, 30, -10, 6, -30);

        // Room 2: Dining Hall (North-East)
        createWall(35, 12, 2, 25, 6, -15);
        createWall(2, 12, 30, 10, 6, -30);

        // Room 3: Master Bedroom (South-West)
        createWall(35, 12, 2, -25, 6, 15);
        createWall(2, 12, 30, -10, 6, 30);

        // Room 4: Kitchen (South-East)
        createWall(35, 12, 2, 25, 6, 15);
        createWall(2, 12, 30, 10, 6, 30);

        // Grand Pillars in Center Foyer
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x5a4a5e, roughness: 0.5 });
        const pillarGeo = new THREE.CylinderGeometry(1.2, 1.2, 12, 12);
        [
            [-12, -8], [12, -8], [-12, 8], [12, 8]
        ].forEach(([px, pz]) => {
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(px, 6, pz);
            pillar.castShadow = true;
            this.mansionGroup.add(pillar);
            this.mapColliders.push(new THREE.Box3().setFromObject(pillar));
        });

        // Banquet Table in Dining Hall
        const tableGeo = new THREE.BoxGeometry(16, 1.8, 6);
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.4 });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.set(26, 0.9, -28);
        table.castShadow = true;
        this.mansionGroup.add(table);
        this.mapColliders.push(new THREE.Box3().setFromObject(table));

        // Bookshelves in Library
        const bookGeo = new THREE.BoxGeometry(22, 9, 3);
        const bookMat = new THREE.MeshStandardMaterial({ color: 0x422416, roughness: 0.6 });
        const bookshelf = new THREE.Mesh(bookGeo, bookMat);
        bookshelf.position.set(-26, 4.5, -42);
        bookshelf.castShadow = true;
        this.mansionGroup.add(bookshelf);
        this.mapColliders.push(new THREE.Box3().setFromObject(bookshelf));

        // Warm Mansion Chandeliers & Flickering Candle Lights
        const chandelierLight1 = new THREE.PointLight(0xffaa44, 1.6, 35);
        chandelierLight1.position.set(0, 9, 0);
        this.mansionGroup.add(chandelierLight1);

        const libLight = new THREE.PointLight(0x00f2fe, 1.2, 28);
        libLight.position.set(-25, 7, -28);
        this.mansionGroup.add(libLight);

        const diningLight = new THREE.PointLight(0xff5533, 1.3, 28);
        diningLight.position.set(25, 7, -28);
        this.mansionGroup.add(diningLight);

        this.scene.add(this.mansionGroup);
    }

    // --- Create 3D Character Model ---
    private createCharacterMesh(name: string, colorHex: number): { group: THREE.Group; knife: THREE.Mesh; gun: THREE.Group; body: THREE.Mesh; head: THREE.Mesh } {
        const group = new THREE.Group();

        // 1. Torso
        const bodyGeo = new THREE.BoxGeometry(1.2, 1.6, 0.8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.6;
        body.castShadow = true;
        group.add(body);

        // 2. Head & Eyes
        const headGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffdfba, roughness: 0.5 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 2.8;
        head.castShadow = true;
        group.add(head);

        // Eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.1), eyeMat);
        eyeL.position.set(-0.22, 2.85, 0.45);
        group.add(eyeL);
        const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.1), eyeMat);
        eyeR.position.set(0.22, 2.85, 0.45);
        group.add(eyeR);

        // Hair / Hat
        const hatMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const hat = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.35, 1.0), hatMat);
        hat.position.y = 3.3;
        group.add(hat);

        // 3. Legs
        const legMat = new THREE.MeshStandardMaterial({ color: 0x202028 });
        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.1, 0.5), legMat);
        legL.position.set(-0.35, 0.55, 0);
        legL.castShadow = true;
        group.add(legL);

        const legR = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.1, 0.5), legMat);
        legR.position.set(0.35, 0.55, 0);
        legR.castShadow = true;
        group.add(legR);

        // 4. Arms
        const armMat = new THREE.MeshStandardMaterial({ color: colorHex });
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.3, 0.4), armMat);
        armL.position.set(-0.85, 1.6, 0);
        armL.castShadow = true;
        group.add(armL);

        const armR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.3, 0.4), armMat);
        armR.position.set(0.85, 1.6, 0);
        armR.castShadow = true;
        group.add(armR);

        // 5. Knife (Attached to right hand, initially hidden)
        const knifeGeo = new THREE.BoxGeometry(0.12, 0.8, 0.2);
        const knifeMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, metalness: 0.9, roughness: 0.1 });
        const knife = new THREE.Mesh(knifeGeo, knifeMat);
        knife.position.set(0.85, 1.2, 0.5);
        knife.rotation.x = Math.PI / 4;
        knife.visible = false;
        group.add(knife);

        // 6. Revolver / Gun (Attached to right hand, initially hidden)
        const gunGroup = new THREE.Group();
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.6), new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.8, roughness: 0.2 }));
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.2), new THREE.MeshStandardMaterial({ color: 0x5a3d28 }));
        barrel.position.set(0, 0.1, 0.2);
        grip.position.set(0, -0.1, 0);
        gunGroup.add(barrel);
        gunGroup.add(grip);
        gunGroup.position.set(0.85, 1.4, 0.4);
        gunGroup.visible = false;
        group.add(gunGroup);

        // Name tag canvas sprite
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.roundRect(10, 10, 236, 44, 10);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(name, 128, 40);
        }
        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.y = 4.2;
        sprite.scale.set(3, 0.8, 1);
        group.add(sprite);

        return { group, knife, gun: gunGroup, body, head };
    }

    // --- Initialize 8 Characters (Player + 7 AI) ---
    private initCharacters() {
        const botNames = ['Alex', 'Sam', 'Jordan', 'Charlie', 'Taylor', 'Morgan', 'Riley'];
        const colors = [0x3498db, 0xe67e22, 0x9b59b6, 0x1abc9c, 0xf39c12, 0x34495e, 0xd35400];

        // 1. Player
        const pModel = this.createCharacterMesh('Karl (You)', 0x2ecc71);
        this.playerChar = {
            id: 'player',
            name: 'Karl',
            isPlayer: true,
            role: 'innocent',
            isAlive: true,
            hasWeaponEquipped: false,
            mesh: pModel.group,
            position: new THREE.Vector3(0, 0, 150),
            velocity: new THREE.Vector3(),
            rotation: 0,
            knifeMesh: pModel.knife,
            gunMesh: pModel.gun,
            bodyMesh: pModel.body,
            headMesh: pModel.head,
            aiTimer: 0,
            coins: 0
        };
        this.playerChar.mesh.position.copy(this.playerChar.position);
        this.scene.add(this.playerChar.mesh);
        this.characters.push(this.playerChar);

        // 2. Bots
        botNames.forEach((name, i) => {
            const botModel = this.createCharacterMesh(name, colors[i % colors.length]);
            const spawnPos = new THREE.Vector3(
                (Math.random() - 0.5) * 25,
                0,
                150 + (Math.random() - 0.5) * 25
            );
            const bot: Character = {
                id: `bot_${i}`,
                name: name,
                isPlayer: false,
                role: 'innocent',
                isAlive: true,
                hasWeaponEquipped: false,
                mesh: botModel.group,
                position: spawnPos,
                velocity: new THREE.Vector3(),
                rotation: Math.random() * Math.PI * 2,
                knifeMesh: botModel.knife,
                gunMesh: botModel.gun,
                bodyMesh: botModel.body,
                headMesh: botModel.head,
                aiTimer: 0,
                coins: 0
            };
            bot.mesh.position.copy(bot.position);
            this.scene.add(bot.mesh);
            this.characters.push(bot);
        });
    }

    // --- Gold Coins Spawning in Mansion ---
    private spawnCoins() {
        // Clear existing
        this.coins.forEach(c => this.scene.remove(c.mesh));
        this.coins = [];

        const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 12);
        const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.8, roughness: 0.2, emissive: 0x443300 });

        const positions = [
            [0, 1, 0], [-25, 1, -25], [25, 1, -25], [-25, 1, 25], [25, 1, 25],
            [-15, 1, 0], [15, 1, 0], [0, 1, -30], [0, 1, 30], [-35, 1, -15],
            [35, 1, 15], [20, 1, -35], [-20, 1, 35]
        ];

        positions.forEach(([x, y, z]) => {
            const coinMesh = new THREE.Mesh(coinGeo, coinMat);
            coinMesh.position.set(x, y, z);
            coinMesh.rotation.x = Math.PI / 2;
            const coinGroup = new THREE.Group();
            coinGroup.add(coinMesh);
            coinGroup.position.set(x, y, z);
            this.scene.add(coinGroup);

            this.coins.push({
                mesh: coinGroup,
                position: new THREE.Vector3(x, y, z),
                collected: false
            });
        });
    }

    // --- Start Round: Assign Roles & Teleport into Mansion ---
    public startRound() {
        this.state = 'role_reveal';
        if (this.lobbyBanner) this.lobbyBanner.style.display = 'none';

        // Assign Roles: 1 Murderer, 1 Sheriff, 6 Innocents
        const shuffled = [...this.characters].sort(() => Math.random() - 0.5);
        const murderer = shuffled[0];
        const sheriff = shuffled[1];

        this.characters.forEach(c => {
            c.role = 'innocent';
            c.isAlive = true;
            c.hasWeaponEquipped = false;
            c.mesh.visible = true;
            if (c.knifeMesh) c.knifeMesh.visible = false;
            if (c.gunMesh) c.gunMesh.visible = false;
        });

        murderer.role = 'murderer';
        sheriff.role = 'sheriff';

        // Teleport characters to scattered mansion spots
        const mansionSpawns = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(-25, 0, -25),
            new THREE.Vector3(25, 0, -25),
            new THREE.Vector3(-25, 0, 25),
            new THREE.Vector3(25, 0, 25),
            new THREE.Vector3(-15, 0, 0),
            new THREE.Vector3(15, 0, 0),
            new THREE.Vector3(0, 0, -20)
        ];

        this.characters.forEach((c, i) => {
            c.position.copy(mansionSpawns[i % mansionSpawns.length]);
            c.mesh.position.copy(c.position);
        });

        // Respawn coins
        this.spawnCoins();

        // Dropped gun reset
        if (this.droppedGun) {
            this.scene.remove(this.droppedGun.mesh);
            this.droppedGun = null;
        }
        if (this.gunDroppedBanner) this.gunDroppedBanner.style.display = 'none';

        // Show Role Reveal Splash Modal
        this.showRoleRevealModal(this.playerChar.role);
        audio.playRoleReveal(this.playerChar.role);

        // Update HUD
        this.updateRoleHud();
        if (this.hudAliveBadge) this.hudAliveBadge.style.display = 'flex';
        if (this.hudCoinsBadge) this.hudCoinsBadge.style.display = 'flex';
        this.updateAliveCount();

        this.roundTimer = 180;
        this.addIncidentFeed(`🏛️ Mängijad teleportiti mõisasse!`);
    }

    private showRoleRevealModal(role: Role) {
        if (!this.roleRevealOverlay) return;
        const iconEl = document.getElementById('role-reveal-icon');
        const titleEl = document.getElementById('role-reveal-title');
        const descEl = document.getElementById('role-reveal-desc');
        const boxEl = document.getElementById('role-card-box');

        if (role === 'murderer') {
            if (iconEl) iconEl.textContent = '🔪';
            if (titleEl) {
                titleEl.textContent = 'MÕRVAR';
                titleEl.className = 'role-title role-murderer';
            }
            if (descEl) descEl.textContent = 'Tapa salaja kõik süütud ja väldi šerifi kuule! Võidu korral saad +150 Jardi!';
            if (boxEl) boxEl.style.borderColor = '#ff2e63';
        } else if (role === 'sheriff') {
            if (iconEl) iconEl.textContent = '🔫';
            if (titleEl) {
                titleEl.textContent = 'ŠERIF';
                titleEl.className = 'role-title role-sheriff';
            }
            if (descEl) descEl.textContent = 'Otsi üles mõrvar ja lase ta maha! Kui eksid ja tabad süütut, kaotad relva!';
            if (boxEl) boxEl.style.borderColor = '#00f2fe';
        } else {
            if (iconEl) iconEl.textContent = '🛡️';
            if (titleEl) {
                titleEl.textContent = 'SÜÜTU';
                titleEl.className = 'role-title role-innocent';
            }
            if (descEl) descEl.textContent = 'Jää ellu! Kogu münte ja kui šerif langeb, otsi üles mahakukkunud relv!';
            if (boxEl) boxEl.style.borderColor = '#2ecc71';
        }

        this.roleRevealOverlay.style.display = 'flex';
    }

    public closeRoleReveal() {
        if (this.roleRevealOverlay) this.roleRevealOverlay.style.display = 'none';
        this.state = 'in_game';
        const crosshair = document.getElementById('crosshair');
        if (crosshair) crosshair.style.display = 'block';
    }

    private updateRoleHud() {
        if (!this.hudRoleBadge || !this.hudRoleIcon || !this.hudRoleText) return;
        if (this.playerChar.role === 'murderer') {
            this.hudRoleIcon.textContent = '🔪';
            this.hudRoleText.textContent = 'MÕRVAR';
            this.hudRoleBadge.style.borderColor = '#ff2e63';
            this.hudRoleBadge.style.color = '#ff2e63';
            if (this.slotWeaponIcon) this.slotWeaponIcon.textContent = '🔪';
            if (this.slotWeaponName) this.slotWeaponName.textContent = 'Nuga';
        } else if (this.playerChar.role === 'sheriff') {
            this.hudRoleIcon.textContent = '🔫';
            this.hudRoleText.textContent = 'ŠERIF';
            this.hudRoleBadge.style.borderColor = '#00f2fe';
            this.hudRoleBadge.style.color = '#00f2fe';
            if (this.slotWeaponIcon) this.slotWeaponIcon.textContent = '🔫';
            if (this.slotWeaponName) this.slotWeaponName.textContent = 'Revolver';
        } else {
            this.hudRoleIcon.textContent = '🛡️';
            this.hudRoleText.textContent = 'SÜÜTU';
            this.hudRoleBadge.style.borderColor = '#2ecc71';
            this.hudRoleBadge.style.color = '#2ecc71';
            if (this.slotWeaponIcon) this.slotWeaponIcon.textContent = '✊';
            if (this.slotWeaponName) this.slotWeaponName.textContent = 'Käed';
        }
    }

    private updateAliveCount() {
        const alive = this.characters.filter(c => c.isAlive).length;
        if (this.hudAliveCount) this.hudAliveCount.textContent = `${alive}/${this.characters.length}`;
    }

    // --- Weapon Toggle & Attack Action ---
    public toggleWeapon() {
        if (this.state !== 'in_game' || !this.playerChar.isAlive) return;
        if (this.playerChar.role === 'innocent') return;

        this.playerChar.hasWeaponEquipped = !this.playerChar.hasWeaponEquipped;
        if (this.playerChar.role === 'murderer' && this.playerChar.knifeMesh) {
            this.playerChar.knifeMesh.visible = this.playerChar.hasWeaponEquipped;
        } else if (this.playerChar.role === 'sheriff' && this.playerChar.gunMesh) {
            this.playerChar.gunMesh.visible = this.playerChar.hasWeaponEquipped;
        }

        if (this.slotWeapon) {
            if (this.playerChar.hasWeaponEquipped) {
                this.slotWeapon.classList.add('active');
            } else {
                this.slotWeapon.classList.remove('active');
            }
        }
    }

    public performAction() {
        if (this.state !== 'in_game' || !this.playerChar.isAlive) return;

        // Auto-equip weapon if not equipped
        if (!this.playerChar.hasWeaponEquipped && this.playerChar.role !== 'innocent') {
            this.toggleWeapon();
        }

        if (this.playerChar.role === 'murderer') {
            this.performMurdererSlash(this.playerChar);
        } else if (this.playerChar.role === 'sheriff') {
            this.performSheriffShoot(this.playerChar);
        }
    }

    private performMurdererSlash(attacker: Character) {
        audio.playKnifeSlash();
        
        // Find closest victim in front of attacker
        const attackRange = 3.8;
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), attacker.rotation);

        for (const target of this.characters) {
            if (target === attacker || !target.isAlive) continue;
            const dist = attacker.position.distanceTo(target.position);
            if (dist < attackRange) {
                const toTarget = target.position.clone().sub(attacker.position).normalize();
                const dot = forward.dot(toTarget);
                if (dot > 0.2) {
                    this.eliminateCharacter(target, attacker, 'knife');
                    break;
                }
            }
        }
    }

    private performSheriffShoot(shooter: Character) {
        audio.playGunshot();

        // Raycast bullet from player
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), shooter.rotation);
        const raycaster = new THREE.Raycaster(shooter.position.clone().add(new THREE.Vector3(0, 1.8, 0)), forward, 0.5, 60);

        const meshes = this.characters.filter(c => c !== shooter && c.isAlive).map(c => c.mesh);
        const hits = raycaster.intersectObjects(meshes, true);

        if (hits.length > 0) {
            let hitTarget: Character | undefined;
            for (const c of this.characters) {
                if (c.mesh === hits[0].object.parent || c.mesh === hits[0].object.parent?.parent || c.mesh === hits[0].object) {
                    hitTarget = c;
                    break;
                }
            }

            if (hitTarget) {
                if (hitTarget.role === 'murderer') {
                    // Sheriff shot murderer -> VICTORY!
                    this.eliminateCharacter(hitTarget, shooter, 'gun');
                    this.endRound('sheriff_win', `${shooter.name} laskis mõrvari maha!`);
                } else {
                    // Sheriff made a mistake and shot an innocent -> Sheriff falls and drops gun!
                    this.eliminateCharacter(hitTarget, shooter, 'gun_mistake');
                    this.eliminateCharacter(shooter, null, 'sheriff_guilt');
                    this.spawnDroppedGun(shooter.position.clone());
                    this.addIncidentFeed(`⚠️ ${shooter.name} eksis ja lasi süütu! Šerif langes!`);
                }
            }
        }
    }

    // --- Eliminate Character ---
    private eliminateCharacter(target: Character, killer: Character | null, cause: string) {
        target.isAlive = false;
        target.mesh.visible = false;
        audio.playStabImpact();

        if (target.isPlayer) {
            this.addIncidentFeed(`💀 Said surma! (${cause === 'knife' ? 'Mõrvar tabas sind' : 'Kuulitaba'})`);
        } else if (killer) {
            this.addIncidentFeed(`🔪 ${killer.name} elimineeris mängija ${target.name}!`);
        }

        // If target was sheriff, drop the gun!
        if (target.role === 'sheriff') {
            this.spawnDroppedGun(target.position.clone());
        }

        this.updateAliveCount();
        this.checkWinConditions();
    }

    // --- Dropped Gun Mechanics ---
    private spawnDroppedGun(pos: THREE.Vector3) {
        if (this.droppedGun) {
            this.scene.remove(this.droppedGun.mesh);
        }

        const gunGroup = new THREE.Group();
        
        // Shiny golden gun mesh
        const gunGeo = new THREE.BoxGeometry(0.3, 0.4, 1.2);
        const gunMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.9, roughness: 0.1, emissive: 0x665500 });
        const gun = new THREE.Mesh(gunGeo, gunMat);
        gun.position.y = 0.5;
        gunGroup.add(gun);

        // Golden vertical light beam
        const beamGeo = new THREE.CylinderGeometry(0.3, 0.8, 15, 16);
        const beamMat = new THREE.MeshBasicMaterial({ color: 0xffd32a, transparent: true, opacity: 0.4 });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.y = 7.5;
        gunGroup.add(beam);

        // Golden point light
        const light = new THREE.PointLight(0xffd32a, 2, 10);
        light.position.y = 1;
        gunGroup.add(light);

        gunGroup.position.copy(pos);
        this.scene.add(gunGroup);

        this.droppedGun = {
            mesh: gunGroup,
            position: pos.clone(),
            active: true
        };

        if (this.gunDroppedBanner) this.gunDroppedBanner.style.display = 'flex';
        this.addIncidentFeed(`⭐ Šerifi kuldne relv on maas! Süütud saavad selle võtta!`);
    }

    public pickUpDroppedGun(char: Character) {
        if (!this.droppedGun || !this.droppedGun.active || !char.isAlive) return;
        
        this.droppedGun.active = false;
        this.scene.remove(this.droppedGun.mesh);
        this.droppedGun = null;

        char.role = 'sheriff';
        char.hasWeaponEquipped = true;
        if (char.gunMesh) char.gunMesh.visible = true;

        audio.playPickupGun();

        if (char.isPlayer) {
            this.updateRoleHud();
            this.addIncidentFeed(`⭐ Korjasid maast šerifi relva! Oled nüüd Kangelane!`);
        } else {
            this.addIncidentFeed(`⭐ ${char.name} korjas maast šerifi relva!`);
        }

        if (this.gunDroppedBanner) this.gunDroppedBanner.style.display = 'none';
        if (this.interactionPrompt) this.interactionPrompt.style.display = 'none';
    }

    // --- Win Conditions Check ---
    private checkWinConditions() {
        if (this.state !== 'in_game') return;

        const murderer = this.characters.find(c => c.role === 'murderer');
        const innocents = this.characters.filter(c => c.role !== 'murderer');
        const aliveInnocents = innocents.filter(c => c.isAlive);

        if (murderer && !murderer.isAlive) {
            this.endRound('sheriff_win', 'Mõrvar on elimineeritud! Süütud võitsid!');
        } else if (aliveInnocents.length === 0) {
            this.endRound('murderer_win', 'Mõrvar elimineeris kõik mängijad!');
        }
    }

    // --- End Round Modal & Rewards ---
    public endRound(winner: 'sheriff_win' | 'murderer_win' | 'time_out', reason: string) {
        this.state = 'round_end';
        audio.playVictory();

        const crosshair = document.getElementById('crosshair');
        if (crosshair) crosshair.style.display = 'none';

        const endTitle = document.getElementById('end-title');
        const endReason = document.getElementById('end-reason');
        const endMurderer = document.getElementById('end-murderer-name');
        const endHero = document.getElementById('end-hero-name');
        const endReward = document.getElementById('end-reward-yards');
        const trophy = document.getElementById('end-trophy-icon');

        const murderer = this.characters.find(c => c.role === 'murderer');
        const sheriff = this.characters.find(c => c.role === 'sheriff');

        if (endMurderer && murderer) endMurderer.textContent = murderer.name;
        if (endHero && sheriff) endHero.textContent = sheriff.name;
        if (endReason) endReason.textContent = reason;

        let rewardYards = 20; // base reward
        if (winner === 'sheriff_win') {
            if (endTitle) {
                endTitle.textContent = 'SÜÜTUD VÕITSID! 🏆';
                endTitle.style.color = '#00f2fe';
            }
            if (trophy) trophy.textContent = '🛡️';
            rewardYards = (this.playerChar.role !== 'murderer' && this.playerChar.isAlive) ? 100 : 40;
        } else if (winner === 'murderer_win') {
            if (endTitle) {
                endTitle.textContent = 'MÕRVAR VÕITIS! 🔪';
                endTitle.style.color = '#ff2e63';
            }
            if (trophy) trophy.textContent = '🩸';
            rewardYards = (this.playerChar.role === 'murderer') ? 150 : 20;
        } else {
            if (endTitle) {
                endTitle.textContent = 'AEG LÕPPES - SÜÜTUD VÕITSID! ⏱️';
                endTitle.style.color = '#2ecc71';
            }
            if (trophy) trophy.textContent = '🏆';
            rewardYards = 80;
        }

        // Add bonus for collected coins
        rewardYards += this.playerChar.coins * 5;
        if (endReward) endReward.textContent = rewardYards.toString();

        // Award Yards to Playard Owner
        yardService.addYards(rewardYards, `MMP1 Murder Mystery Match Reward`);
        this.updateYardDisplay();

        // Record game played into Playard Recently Played
        yardService.recordPlayedGame({
            id: 'mmp1',
            title: '🔪 MMP1 (Murder Mystery)',
            description: '3D Murder Mystery arena with Murderer, Sheriff, and Innocent roles.',
            url: './games/mmp1/index.html',
            icon: '🔪',
            badgeText: 'Murder Mystery'
        });

        if (this.roundEndOverlay) this.roundEndOverlay.style.display = 'flex';
    }

    public returnToLobby() {
        if (this.roundEndOverlay) this.roundEndOverlay.style.display = 'none';
        this.state = 'lobby';
        this.lobbyCountdown = 12;

        if (this.lobbyBanner) this.lobbyBanner.style.display = 'flex';
        if (this.hudAliveBadge) this.hudAliveBadge.style.display = 'none';
        if (this.hudCoinsBadge) this.hudCoinsBadge.style.display = 'none';

        // Teleport characters back to lobby
        this.characters.forEach((c, i) => {
            c.role = 'innocent';
            c.isAlive = true;
            c.hasWeaponEquipped = false;
            c.mesh.visible = true;
            if (c.knifeMesh) c.knifeMesh.visible = false;
            if (c.gunMesh) c.gunMesh.visible = false;
            c.position.set((Math.random() - 0.5) * 20, 0, 150 + (Math.random() - 0.5) * 20);
            c.mesh.position.copy(c.position);
        });

        this.playerChar.coins = 0;
        if (this.hudCoinsVal) this.hudCoinsVal.textContent = '0';

        if (this.hudRoleIcon) this.hudRoleIcon.textContent = '⏳';
        if (this.hudRoleText) this.hudRoleText.textContent = 'LOBBY';
        if (this.hudRoleBadge) {
            this.hudRoleBadge.style.borderColor = '#ffd32a';
            this.hudRoleBadge.style.color = '#ffd32a';
        }
    }

    private addIncidentFeed(text: string) {
        if (!this.incidentFeed) return;
        const item = document.createElement('div');
        item.className = 'incident-item';
        item.textContent = text;
        this.incidentFeed.prepend(item);
        setTimeout(() => {
            item.remove();
        }, 6000);
    }

    // --- Input & Event Listeners ---
    private bindEvents() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (e.code === 'KeyE') {
                // Interact / Pick up gun
                if (this.droppedGun && this.droppedGun.active && this.playerChar.isAlive) {
                    if (this.playerChar.position.distanceTo(this.droppedGun.position) < 3.5) {
                        this.pickUpDroppedGun(this.playerChar);
                    }
                }
            } else if (e.code === 'Digit1' || e.code === 'KeyQ') {
                this.toggleWeapon();
            } else if (e.code === 'Space') {
                this.performAction();
            } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                this.isSprinting = true;
            }
        });

        window.addEventListener('keyup', e => {
            this.keys[e.code] = false;
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                this.isSprinting = false;
            }
        });

        // Mouse Controls & Pointer Lock
        this.container.addEventListener('click', () => {
            if (this.state === 'in_game' && this.playerChar.isAlive) {
                if (!this.isPointerLocked) {
                    this.container.requestPointerLock?.();
                } else {
                    this.performAction();
                }
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.container;
        });

        window.addEventListener('mousemove', e => {
            if (this.isPointerLocked) {
                const sens = 0.0025;
                this.cameraYaw -= e.movementX * sens;
                this.cameraPitch -= e.movementY * sens;
                this.cameraPitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 3, this.cameraPitch));
                this.playerChar.rotation = this.cameraYaw;
            }
        });

        // UI Buttons
        document.getElementById('btn-force-start')?.addEventListener('click', () => {
            this.startRound();
        });
        document.getElementById('btn-role-reveal-close')?.addEventListener('click', () => {
            this.closeRoleReveal();
        });
        document.getElementById('btn-next-round')?.addEventListener('click', () => {
            this.returnToLobby();
        });
        document.getElementById('slot-weapon')?.addEventListener('click', () => {
            this.toggleWeapon();
        });
        document.getElementById('btn-sound-toggle')?.addEventListener('click', () => {
            audio.soundEnabled = !audio.soundEnabled;
            const soundIcon = document.getElementById('sound-icon');
            if (soundIcon) soundIcon.textContent = audio.soundEnabled ? '🔊' : '🔇';
        });

        // Mobile touch buttons
        const btnMobileAction = document.getElementById('btn-mobile-action');
        if (btnMobileAction) {
            btnMobileAction.addEventListener('touchstart', e => {
                e.preventDefault();
                this.performAction();
            });
        }
        const btnMobileInteract = document.getElementById('btn-mobile-interact');
        if (btnMobileInteract) {
            btnMobileInteract.addEventListener('touchstart', e => {
                e.preventDefault();
                if (this.droppedGun && this.droppedGun.active && this.playerChar.isAlive) {
                    if (this.playerChar.position.distanceTo(this.droppedGun.position) < 3.5) {
                        this.pickUpDroppedGun(this.playerChar);
                    }
                }
            });
        }
    }

    // --- Character & AI Updates ---
    private updateAI(delta: number) {
        const murderer = this.characters.find(c => c.role === 'murderer' && c.isAlive);

        this.characters.forEach(c => {
            if (c.isPlayer || !c.isAlive) return;

            c.aiTimer -= delta;
            if (c.aiTimer <= 0) {
                c.aiTimer = 1.5 + Math.random() * 2;
                
                if (this.state === 'lobby') {
                    // Wander around lobby
                    c.aiTarget = new THREE.Vector3(
                        (Math.random() - 0.5) * 30,
                        0,
                        150 + (Math.random() - 0.5) * 30
                    );
                } else if (this.state === 'in_game') {
                    if (c.role === 'murderer') {
                        // Murderer AI: Seek closest innocent and equip knife when close
                        const victims = this.characters.filter(v => v !== c && v.isAlive);
                        if (victims.length > 0) {
                            victims.sort((a, b) => c.position.distanceTo(a.position) - c.position.distanceTo(b.position));
                            c.aiTarget = victims[0].position.clone();
                            c.hasWeaponEquipped = c.position.distanceTo(victims[0].position) < 12;
                            if (c.knifeMesh) c.knifeMesh.visible = c.hasWeaponEquipped;
                        }
                    } else if (c.role === 'sheriff') {
                        // Sheriff AI: Patrol and look for murderer
                        if (murderer && murderer.hasWeaponEquipped && c.position.distanceTo(murderer.position) < 25) {
                            c.aiTarget = murderer.position.clone();
                            c.hasWeaponEquipped = true;
                            if (c.gunMesh) c.gunMesh.visible = true;
                        } else {
                            c.aiTarget = new THREE.Vector3((Math.random() - 0.5) * 60, 0, (Math.random() - 0.5) * 60);
                        }
                    } else {
                        // Innocent AI: Seek dropped gun if active, or flee from murderer, or collect coins
                        if (this.droppedGun && this.droppedGun.active && Math.random() < 0.6) {
                            c.aiTarget = this.droppedGun.position.clone();
                        } else if (murderer && murderer.hasWeaponEquipped && c.position.distanceTo(murderer.position) < 14) {
                            // Flee opposite direction
                            const away = c.position.clone().sub(murderer.position).normalize().multiplyScalar(20);
                            c.aiTarget = c.position.clone().add(away);
                        } else {
                            c.aiTarget = new THREE.Vector3((Math.random() - 0.5) * 60, 0, (Math.random() - 0.5) * 60);
                        }
                    }
                }
            }

            // Move towards AI target
            if (c.aiTarget) {
                const dir = c.aiTarget.clone().sub(c.position);
                dir.y = 0;
                const dist = dir.length();
                if (dist > 0.5) {
                    dir.normalize();
                    const speed = (c.role === 'murderer') ? 8.5 : 6.0;
                    c.position.addScaledVector(dir, speed * delta);
                    c.rotation = Math.atan2(-dir.x, -dir.z);
                    c.mesh.position.copy(c.position);
                    c.mesh.rotation.y = c.rotation;
                }

                // AI combat triggers
                if (this.state === 'in_game') {
                    if (c.role === 'murderer' && dist < 3.2) {
                        this.performMurdererSlash(c);
                    } else if (c.role === 'sheriff' && murderer && c.position.distanceTo(murderer.position) < 18) {
                        this.performSheriffShoot(c);
                    }
                }

                // AI pick up dropped gun
                if (this.droppedGun && this.droppedGun.active && c.role === 'innocent') {
                    if (c.position.distanceTo(this.droppedGun.position) < 2.5) {
                        this.pickUpDroppedGun(c);
                    }
                }
            }
        });
    }

    // --- Player Movement & Physics ---
    private updatePlayer(delta: number) {
        if (!this.playerChar.isAlive) return;

        const moveDir = new THREE.Vector3();
        if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.z -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.z += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.x -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.x += 1;

        if (moveDir.lengthSq() > 0) {
            moveDir.normalize();
            moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);

            const speed = this.isSprinting ? 12 : 7;
            const nextPos = this.playerChar.position.clone().addScaledVector(moveDir, speed * delta);

            // Bounding collision checks against walls in mansion
            if (this.state === 'in_game') {
                const playerBox = new THREE.Box3().setFromCenterAndSize(nextPos.clone().add(new THREE.Vector3(0, 1.5, 0)), new THREE.Vector3(1.2, 3, 1.2));
                let collides = false;
                for (const wallBox of this.mapColliders) {
                    if (wallBox.intersectsBox(playerBox)) {
                        collides = true;
                        break;
                    }
                }
                if (!collides) {
                    this.playerChar.position.copy(nextPos);
                }
            } else {
                // Lobby bounds
                nextPos.x = Math.max(-18, Math.min(18, nextPos.x));
                nextPos.z = Math.max(132, Math.min(168, nextPos.z));
                this.playerChar.position.copy(nextPos);
            }

            this.playerChar.mesh.position.copy(this.playerChar.position);
            this.playerChar.mesh.rotation.y = this.playerChar.rotation;
        }

        // Check dropped gun proximity prompt
        if (this.droppedGun && this.droppedGun.active && this.playerChar.role === 'innocent') {
            const distToGun = this.playerChar.position.distanceTo(this.droppedGun.position);
            if (distToGun < 3.5) {
                if (this.interactionPrompt) {
                    this.interactionPrompt.style.display = 'block';
                }
            } else if (this.interactionPrompt) {
                this.interactionPrompt.style.display = 'none';
            }
        } else if (this.interactionPrompt) {
            this.interactionPrompt.style.display = 'none';
        }

        // Check Coin Pickups
        if (this.state === 'in_game') {
            this.coins.forEach(coin => {
                if (!coin.collected && this.playerChar.position.distanceTo(coin.position) < 2.0) {
                    coin.collected = true;
                    this.scene.remove(coin.mesh);
                    this.playerChar.coins++;
                    audio.playCoin();
                    if (this.hudCoinsVal) this.hudCoinsVal.textContent = this.playerChar.coins.toString();
                }
            });

            // Heartbeat sound calculation (distance to murderer)
            const murderer = this.characters.find(c => c.role === 'murderer' && c.isAlive);
            if (murderer && !this.playerChar.isPlayer && this.playerChar.role !== 'murderer') {
                const dist = this.playerChar.position.distanceTo(murderer.position);
                audio.setHeartbeatRate(dist);
            } else {
                audio.setHeartbeatRate(0);
            }
        }

        // Update Camera Position (Smooth 3rd Person Follow)
        const camOffset = new THREE.Vector3(0, 2.5, 6.5);
        camOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.cameraPitch);
        camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);

        this.camera.position.copy(this.playerChar.position).add(camOffset);
        this.camera.lookAt(this.playerChar.position.clone().add(new THREE.Vector3(0, 1.8, 0)));
    }

    // --- Main Game Loop ---
    private animate = () => {
        requestAnimationFrame(this.animate);

        const delta = Math.min(this.clock.getDelta(), 0.1);

        // State Machine Timers
        if (this.state === 'lobby') {
            this.lobbyCountdown -= delta;
            if (this.lobbyCountdownSec) {
                this.lobbyCountdownSec.textContent = `${Math.max(0, Math.ceil(this.lobbyCountdown))}s`;
            }
            if (this.lobbyCountdown <= 0) {
                this.startRound();
            }
        } else if (this.state === 'in_game') {
            this.roundTimer -= delta;
            const mins = Math.floor(Math.max(0, this.roundTimer) / 60);
            const secs = Math.floor(Math.max(0, this.roundTimer) % 60);
            if (this.hudTimerVal) {
                this.hudTimerVal.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            if (this.roundTimer <= 0) {
                this.endRound('time_out', 'Aeg sai otsa! Mõrvar ei suutnud kõiki elimineerida!');
            }
        }

        // Animate Coins
        this.coins.forEach(coin => {
            if (!coin.collected) {
                coin.mesh.rotation.y += delta * 2.5;
            }
        });

        // Animate Dropped Gun Beacon
        if (this.droppedGun && this.droppedGun.active) {
            this.droppedGun.mesh.rotation.y += delta * 3.0;
        }

        this.updatePlayer(delta);
        this.updateAI(delta);

        this.renderer.render(this.scene, this.camera);
    };
}

// Instantiate game upon load
function initMmp1() {
    if (!(window as any).mmp1Game) {
        (window as any).mmp1Game = new MurderMysteryGame();
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initMmp1);
} else {
    initMmp1();
}
