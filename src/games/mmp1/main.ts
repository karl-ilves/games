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

    // Controls & Camera state
    private keys: { [key: string]: boolean } = {};
    private cameraPitch: number = 0.2;
    private cameraYaw: number = 0;
    private cameraDistance: number = 6.0;
    private isPointerLocked: boolean = false;
    private isSprinting: boolean = false;
    private isDraggingMouse: boolean = false;
    private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };
    private touchStartPos: { x: number; y: number } = { x: 0, y: 0 };
    private isTouchDragging: boolean = false;

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
    private adminModal: HTMLElement | null = null;
    private btnAdminPanel: HTMLElement | null = null;

    public adminForcedRole: Role | null = null;
    private lastHero: Character | null = null;
    public wallMeshes: THREE.Mesh[] = [];
    public hasSheriffWitnessedMurder: boolean = false;

    constructor() {
        this.container = document.getElementById('canvas-container') || document.body;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0810);
        this.scene.fog = new THREE.FogExp2(0x0a0810, 0.015);

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
        this.adminModal = document.getElementById('admin-role-modal');
        this.btnAdminPanel = document.getElementById('btn-admin-panel');

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

        if (this.btnAdminPanel) {
            this.btnAdminPanel.style.display = (owner || testMode) ? 'flex' : 'none';
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

    // --- Unified Grand Chamber 3D Builder (One big room with visible room zones & locked exits) ---
    private buildMansion() {
        this.mansionGroup = new THREE.Group();
        this.mansionGroup.position.set(0, 0, 0);
        this.mapColliders = [];
        this.wallMeshes = [];

        const createWall = (w: number, h: number, d: number, x: number, y: number, z: number, color = 0x241d24, hasCollider = true) => {
            const wallMat = new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
            const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
            wall.position.set(x, y, z);
            wall.castShadow = true;
            wall.receiveShadow = true;
            this.mansionGroup.add(wall);
            this.wallMeshes.push(wall);

            if (hasCollider) {
                const box = new THREE.Box3().setFromObject(wall);
                this.mapColliders.push(box);
            }
            return wall;
        };

        // 1. One Grand Shared Floor (90x90 units) - Polished Wood & Marble
        const floorGeo = new THREE.BoxGeometry(92, 1, 92);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.35, metalness: 0.1 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.mansionGroup.add(floor);

        // Center Red Velvet Carpet across the whole room
        const carpetGeo = new THREE.BoxGeometry(12, 0.08, 65);
        const carpetMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.8 });
        const carpet = new THREE.Mesh(carpetGeo, carpetMat);
        carpet.position.set(0, 0.05, 0);
        carpet.receiveShadow = true;
        this.mansionGroup.add(carpet);

        // 2. Impassable Locked Outer Perimeter Walls (90x90, Height 14) - "Sealt lahkuda ei saa"
        createWall(92, 14, 2, 0, 7, -46, 0x1a1520);
        createWall(92, 14, 2, 0, 7, 46, 0x1a1520);
        createWall(2, 14, 92, -46, 7, 0, 0x1a1520);
        createWall(2, 14, 92, 46, 7, 0, 0x1a1520);

        // Locked Massive Iron Exit Gates on North & South Walls
        const ironGateMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.2 });
        const lockMat = new THREE.MeshStandardMaterial({ color: 0xff2e63, emissive: 0x550011 });

        [[-46, 1], [46, -1]].forEach(([gz, dir]) => {
            const gate = new THREE.Mesh(new THREE.BoxGeometry(14, 10, 1.2), ironGateMat);
            gate.position.set(0, 5, gz + dir * 0.4);
            gate.castShadow = true;
            this.mansionGroup.add(gate);
            this.wallMeshes.push(gate);
            this.mapColliders.push(new THREE.Box3().setFromObject(gate));

            // Glowing Lock
            const lock = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 12), lockMat);
            lock.position.set(0, 5, gz + dir * 1.2);
            lock.rotation.x = Math.PI / 2;
            this.mansionGroup.add(lock);
        });

        // 3. Central Marble Columns (Tall open pillars with clear sightlines between all players)
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x4d3e52, roughness: 0.3 });
        const pillarGeo = new THREE.CylinderGeometry(1.2, 1.4, 14, 16);
        [
            [-18, -18], [18, -18], [-18, 18], [18, 18],
            [-18, 0], [18, 0], [0, -18], [0, 18]
        ].forEach(([px, pz]) => {
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(px, 7, pz);
            pillar.castShadow = true;
            this.mansionGroup.add(pillar);
            this.wallMeshes.push(pillar);
            this.mapColliders.push(new THREE.Box3().setFromObject(pillar));
        });

        // 4. DISTINCT OPEN ROOM ZONES (Low visual partitions so everyone sees each other)

        // --- Zone 1: Raamatukogu / Library Zone (North-West) ---
        // Low decorative half-walls with wide arch openings
        createWall(18, 3.5, 1, -34, 1.75, -22, 0x3d271d);
        createWall(1, 3.5, 18, -22, 1.75, -34, 0x3d271d);

        // Bookshelves & Reading Furniture
        const bookMat = new THREE.MeshStandardMaterial({ color: 0x4a2a16, roughness: 0.6 });
        const bs1 = new THREE.Mesh(new THREE.BoxGeometry(16, 7, 2), bookMat);
        bs1.position.set(-34, 3.5, -43);
        bs1.castShadow = true;
        this.mansionGroup.add(bs1);
        this.wallMeshes.push(bs1);
        this.mapColliders.push(new THREE.Box3().setFromObject(bs1));

        const libDesk = new THREE.Mesh(new THREE.BoxGeometry(7, 1.6, 3.5), new THREE.MeshStandardMaterial({ color: 0x5a3d28 }));
        libDesk.position.set(-34, 0.8, -32);
        this.mansionGroup.add(libDesk);
        this.wallMeshes.push(libDesk);
        this.mapColliders.push(new THREE.Box3().setFromObject(libDesk));

        // --- Zone 2: Söögisaal & Kamin / Dining & Fireplace Zone (North-East) ---
        createWall(18, 3.5, 1, 34, 1.75, -22, 0x3d271d);
        createWall(1, 3.5, 18, 22, 1.75, -34, 0x3d271d);

        // Long banquet dining table in open view
        const diningTable = new THREE.Mesh(new THREE.BoxGeometry(16, 1.8, 4.5), new THREE.MeshStandardMaterial({ color: 0x5c3a21 }));
        diningTable.position.set(34, 0.9, -33);
        diningTable.castShadow = true;
        this.mansionGroup.add(diningTable);
        this.wallMeshes.push(diningTable);
        this.mapColliders.push(new THREE.Box3().setFromObject(diningTable));

        // Stone Fireplace with warm fire glow
        const fireplace = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 2.5), new THREE.MeshStandardMaterial({ color: 0x2d2d2d }));
        fireplace.position.set(34, 3, -44);
        this.mansionGroup.add(fireplace);
        this.wallMeshes.push(fireplace);
        this.mapColliders.push(new THREE.Box3().setFromObject(fireplace));

        const fireLight = new THREE.PointLight(0xff6622, 2.2, 22);
        fireLight.position.set(34, 2.5, -42);
        this.mansionGroup.add(fireLight);

        // --- Zone 3: Relvakamber / Armory Zone (North Center) ---
        const armorMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, metalness: 0.9, roughness: 0.2 });
        [-8, 8].forEach(ax => {
            const armor = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 3.2, 8), armorMat);
            armor.position.set(ax, 1.6, -38);
            armor.castShadow = true;
            this.mansionGroup.add(armor);
            this.wallMeshes.push(armor);
            this.mapColliders.push(new THREE.Box3().setFromObject(armor));
        });

        // --- Zone 4: Magamistoa Tsoon / Master Bedroom Zone (South-West) ---
        createWall(18, 3.5, 1, -34, 1.75, 22, 0x3d271d);
        createWall(1, 3.5, 18, -22, 1.75, 34, 0x3d271d);

        // Open Canopy Bed
        const bed = new THREE.Mesh(new THREE.BoxGeometry(8, 2.2, 6.5), new THREE.MeshStandardMaterial({ color: 0x8e1b32 }));
        bed.position.set(-34, 1.1, 34);
        this.mansionGroup.add(bed);
        this.wallMeshes.push(bed);
        this.mapColliders.push(new THREE.Box3().setFromObject(bed));

        // Open Wardrobe Closets
        const wardrobe = new THREE.Mesh(new THREE.BoxGeometry(5, 6, 2.5), new THREE.MeshStandardMaterial({ color: 0x3d271d }));
        wardrobe.position.set(-42, 3, 30);
        this.mansionGroup.add(wardrobe);
        this.wallMeshes.push(wardrobe);
        this.mapColliders.push(new THREE.Box3().setFromObject(wardrobe));

        // --- Zone 5: Köögi Tsoon / Kitchen Zone (South-East) ---
        createWall(18, 3.5, 1, 34, 1.75, 22, 0x3d271d);
        createWall(1, 3.5, 18, 22, 1.75, 34, 0x3d271d);

        // Kitchen Island
        const kitchenIsland = new THREE.Mesh(new THREE.BoxGeometry(10, 1.9, 4), new THREE.MeshStandardMaterial({ color: 0xdcdde1, roughness: 0.2 }));
        kitchenIsland.position.set(34, 0.95, 33);
        this.mansionGroup.add(kitchenIsland);
        this.wallMeshes.push(kitchenIsland);
        this.mapColliders.push(new THREE.Box3().setFromObject(kitchenIsland));

        // --- Zone 6: Salongi & Veinivaatide Tsoon (South Center) ---
        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x5a3d28 });
        [[-6, 38], [6, 38], [-4, 42], [4, 42]].forEach(([bx, bz]) => {
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.5, 12), barrelMat);
            barrel.position.set(bx, 1.25, bz);
            barrel.castShadow = true;
            this.mansionGroup.add(barrel);
            this.wallMeshes.push(barrel);
            this.mapColliders.push(new THREE.Box3().setFromObject(barrel));
        });

        // 5. Illumination - Bright chandeliers so everyone can see everyone clearly
        const centerChandelier = new THREE.PointLight(0xffeedd, 2.8, 60);
        centerChandelier.position.set(0, 10, 0);
        this.mansionGroup.add(centerChandelier);

        const libGlow = new THREE.PointLight(0x00f2fe, 1.8, 30);
        libGlow.position.set(-34, 7, -34);
        this.mansionGroup.add(libGlow);

        const bedGlow = new THREE.PointLight(0xff7799, 1.8, 30);
        bedGlow.position.set(-34, 7, 34);
        this.mansionGroup.add(bedGlow);

        const kitchenGlow = new THREE.PointLight(0xffaa44, 1.8, 30);
        kitchenGlow.position.set(34, 7, 34);
        this.mansionGroup.add(kitchenGlow);

        this.scene.add(this.mansionGroup);
    }

    // --- Create 3D Character Model ---
    private createCharacterMesh(name: string, colorHex: number, isPlayer: boolean = false): { group: THREE.Group; knife: THREE.Mesh; gun: THREE.Group; body: THREE.Mesh; head: THREE.Mesh } {
        const group = new THREE.Group();

        // 1. Torso
        const bodyGeo = new THREE.BoxGeometry(1.3, 1.7, 0.9);
        const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.35, metalness: 0.1 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.65;
        body.castShadow = true;
        group.add(body);

        // 2. Head & Eyes
        const headGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffdfba, roughness: 0.4 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 2.95;
        head.castShadow = true;
        group.add(head);

        // Eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.1), eyeMat);
        eyeL.position.set(-0.25, 3.0, 0.52);
        group.add(eyeL);
        const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.1), eyeMat);
        eyeR.position.set(0.25, 3.0, 0.52);
        group.add(eyeR);

        // Hair / Hat / Crown for player
        const hatMat = new THREE.MeshStandardMaterial({ color: isPlayer ? 0xffd32a : 0x222222, roughness: 0.3 });
        const hat = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.4, 1.15), hatMat);
        hat.position.y = 3.55;
        group.add(hat);

        // 3. Legs
        const legMat = new THREE.MeshStandardMaterial({ color: 0x1e1e24, roughness: 0.6 });
        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.15, 0.55), legMat);
        legL.position.set(-0.38, 0.58, 0);
        legL.castShadow = true;
        group.add(legL);

        const legR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.15, 0.55), legMat);
        legR.position.set(0.38, 0.58, 0);
        legR.castShadow = true;
        group.add(legR);

        // 4. Arms
        const armMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 });
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 0.45), armMat);
        armL.position.set(-0.95, 1.65, 0);
        armL.castShadow = true;
        group.add(armL);

        const armR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 0.45), armMat);
        armR.position.set(0.95, 1.65, 0);
        armR.castShadow = true;
        group.add(armR);

        // 5. Knife (Attached to right hand, initially hidden)
        const knifeGeo = new THREE.BoxGeometry(0.14, 0.9, 0.25);
        const knifeMat = new THREE.MeshStandardMaterial({ color: 0xff2e63, metalness: 0.9, roughness: 0.1, emissive: 0x440011 });
        const knife = new THREE.Mesh(knifeGeo, knifeMat);
        knife.position.set(0.95, 1.2, 0.55);
        knife.rotation.x = Math.PI / 4;
        knife.visible = false;
        group.add(knife);

        // 6. Revolver / Gun (Attached to right hand, initially hidden)
        const gunGroup = new THREE.Group();
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.7), new THREE.MeshStandardMaterial({ color: 0x00f2fe, metalness: 0.8, roughness: 0.2, emissive: 0x003344 }));
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.25), new THREE.MeshStandardMaterial({ color: 0x5a3d28 }));
        barrel.position.set(0, 0.1, 0.25);
        grip.position.set(0, -0.1, 0);
        gunGroup.add(barrel);
        gunGroup.add(grip);
        gunGroup.position.set(0.95, 1.45, 0.45);
        gunGroup.visible = false;
        group.add(gunGroup);

        // Large, sharp, prominent Name Tag Canvas Billboard (depthTest = false so always crystal clear)
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 75;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = isPlayer ? 'rgba(30, 20, 10, 0.88)' : 'rgba(15, 10, 25, 0.88)';
            ctx.beginPath();
            ctx.roundRect(8, 8, 284, 59, 14);
            ctx.fill();
            ctx.strokeStyle = isPlayer ? '#ffd32a' : '#00f2fe';
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.fillStyle = isPlayer ? '#ffd32a' : '#ffffff';
            ctx.font = 'bold 26px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(name, 150, 38);
        }
        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ 
            map: tex, 
            depthTest: false, 
            depthWrite: false, 
            transparent: true 
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.renderOrder = 999;
        sprite.position.y = 4.4;
        sprite.scale.set(3.8, 0.95, 1);
        group.add(sprite);

        return { group, knife, gun: gunGroup, body, head };
    }

    // --- Initialize 8 Characters (Player + 7 AI in clear view in Lobby) ---
    private initCharacters() {
        const botNames = ['Alex', 'Sam', 'Jordan', 'Charlie', 'Taylor', 'Morgan', 'Riley'];
        const colors = [0x3498db, 0xe67e22, 0x9b59b6, 0x1abc9c, 0xf39c12, 0xe74c3c, 0x00cec9];

        // 1. Player (Spawned at center 0, 0, 150)
        const pModel = this.createCharacterMesh('Karl (Sina) 👑', 0x2ecc71, true);
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

        // 2. Bots (Arranged in a clear arc in front of the player so you immediately see them!)
        botNames.forEach((name, i) => {
            const botModel = this.createCharacterMesh(`${name} 👤`, colors[i % colors.length], false);
            // Semicircle arc in front of player (facing player at 0, 0, 150)
            const angle = -Math.PI * 0.7 + (i / (botNames.length - 1)) * (Math.PI * 1.4);
            const radius = 7.0 + (i % 2) * 1.2;
            const spawnPos = new THREE.Vector3(
                Math.sin(angle) * radius,
                0,
                150 - Math.cos(angle) * radius
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
                rotation: Math.atan2(-spawnPos.x, 150 - spawnPos.z), // face center
                knifeMesh: botModel.knife,
                gunMesh: botModel.gun,
                bodyMesh: botModel.body,
                headMesh: botModel.head,
                aiTimer: 0,
                coins: 0
            };
            bot.mesh.position.copy(bot.position);
            bot.mesh.rotation.y = bot.rotation;
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
            // Center Grand Hall & Carpet
            [0, 1, 0], [0, 1, -12], [0, 1, 12], [-10, 1, 0], [10, 1, 0],
            // Zone 1: Raamatukogu / Library (NW)
            [-34, 1, -34], [-34, 1, -25], [-25, 1, -34],
            // Zone 2: Söögisaal / Dining (NE)
            [34, 1, -34], [34, 1, -25], [25, 1, -34],
            // Zone 3: Relvakamber / Armory (N)
            [0, 1, -36], [-8, 1, -36], [8, 1, -36],
            // Zone 4: Magamistuba / Bedroom (SW)
            [-34, 1, 34], [-34, 1, 25], [-25, 1, 34],
            // Zone 5: Köök / Kitchen (SE)
            [34, 1, 34], [34, 1, 25], [25, 1, 34],
            // Zone 6: Salong / Dungeon (S)
            [0, 1, 36], [-6, 1, 36], [6, 1, 36]
        ];

        positions.forEach(([x, y, z]) => {
            const coinMesh = new THREE.Mesh(coinGeo, coinMat);
            coinMesh.position.set(0, 0, 0);
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
        this.lastHero = null;
        this.hasSheriffWitnessedMurder = false;
        if (this.lobbyBanner) this.lobbyBanner.style.display = 'none';

        // Reset state for all characters
        this.characters.forEach(c => {
            c.role = 'innocent';
            c.isAlive = true;
            c.hasWeaponEquipped = false;
            c.mesh.visible = true;
            if (c.knifeMesh) c.knifeMesh.visible = false;
            if (c.gunMesh) c.gunMesh.visible = false;
        });

        // Assign Roles: If Admin forced role, honor it; otherwise random
        if (this.adminForcedRole) {
            this.playerChar.role = this.adminForcedRole;
            const livingBots = this.characters.filter(c => !c.isPlayer).sort(() => Math.random() - 0.5);
            if (this.adminForcedRole === 'murderer') {
                livingBots[0].role = 'sheriff';
            } else if (this.adminForcedRole === 'sheriff') {
                livingBots[0].role = 'murderer';
            } else {
                livingBots[0].role = 'murderer';
                livingBots[1].role = 'sheriff';
            }
        } else {
            const shuffled = [...this.characters].sort(() => Math.random() - 0.5);
            shuffled[0].role = 'murderer';
            shuffled[1].role = 'sheriff';
        }

        // Teleport characters to central Grand Hall in clear view of each other
        // Player in center, bots in a circle around center (radius 7m) on red carpet
        this.characters.forEach((c, i) => {
            if (c.isPlayer) {
                c.position.set(0, 0, 0);
            } else {
                const angle = (i / (this.characters.length - 1)) * Math.PI * 2;
                const r = 7.5;
                c.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
            }
            c.mesh.position.copy(c.position);
            c.rotation = Math.atan2(-c.position.x, -c.position.z);
            c.mesh.rotation.y = c.rotation;
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
        this.addIncidentFeed(`🏛️ Mängijad teleportiti mõisasse! Kõik näevad üksteist!`);
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

    // --- Line of Sight check: Cannot see or shoot through walls ---
    public hasLineOfSight(from: THREE.Vector3 | { x: number; y: number; z: number }, to: THREE.Vector3 | { x: number; y: number; z: number }): boolean {
        const origin = new THREE.Vector3(from.x, from.y + 1.8, from.z);
        const target = new THREE.Vector3(to.x, to.y + 1.8, to.z);
        const dir = target.clone().sub(origin);
        const dist = dir.length();
        if (dist < 0.2) return true;
        dir.normalize();

        const raycaster = new THREE.Raycaster(origin, dir, 0.2, dist);
        const hits = raycaster.intersectObjects(this.wallMeshes, false);
        if (hits.length > 0 && hits[0].distance < dist - 0.4) {
            return false; // Obstructed by wall!
        }
        return true;
    }

    private performSheriffShoot(shooter: Character) {
        audio.playGunshot();

        // Raycast bullet from player / AI
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), shooter.rotation);
        const rayOrigin = shooter.position.clone().add(new THREE.Vector3(0, 1.8, 0));
        const raycaster = new THREE.Raycaster(rayOrigin, forward, 0.5, 75);
        if (this.camera && shooter.isPlayer) raycaster.camera = this.camera;

        const charMeshes = this.characters.filter(c => c !== shooter && c.isAlive && c.mesh).map(c => c.mesh);
        // Include wall meshes so bullets CANNOT pass or hit through walls!
        const allShootables = [...charMeshes, ...this.wallMeshes];
        if (allShootables.length === 0) return;
        const hits = raycaster.intersectObjects(allShootables, true);

        if (hits.length > 0 && hits[0]?.object) {
            const hitObj = hits[0].object;
            // Check if bullet struck a wall/barrier first
            const hitWall = this.wallMeshes.some(w => w === hitObj || w === hitObj.parent);
            if (hitWall) {
                // Bullet hit a solid wall - cannot penetrate or hit through walls!
                return;
            }

            let hitTarget: Character | undefined;
            for (const c of this.characters) {
                if (c.mesh && (c.mesh === hitObj.parent || c.mesh === hitObj.parent?.parent || c.mesh === hitObj)) {
                    hitTarget = c;
                    break;
                }
            }

            if (hitTarget) {
                if (hitTarget.role === 'murderer') {
                    // Sheriff shot murderer -> VICTORY for Sheriff & Innocents!
                    this.lastHero = shooter;
                    this.eliminateCharacter(hitTarget, shooter, 'gun');
                    this.endRound('sheriff_win', `${shooter.name} laskis mõrvari maha! Süütud ja šerif võitsid!`);
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

        // When murderer kills someone with a knife, check if any sheriff witnessed it!
        if (killer && killer.role === 'murderer') {
            const sheriff = this.characters.find(c => c.role === 'sheriff' && c.isAlive);
            if (sheriff) {
                const dist = sheriff.position.distanceTo(target.position);
                const seesMurder = this.hasLineOfSight(sheriff.position, target.position) || this.hasLineOfSight(sheriff.position, killer.position);
                if (seesMurder && dist < 36) {
                    this.hasSheriffWitnessedMurder = true;
                    this.addIncidentFeed(`👁️ Šerif nägi mõrva pealt! Mõrvar on paljastatud!`);
                }
            }
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
        const gunMesh = new THREE.Mesh(gunGeo, gunMat);
        gunMesh.position.set(0, 0.6, 0);
        gunGroup.add(gunMesh);

        // Light pillar beacon above dropped gun
        const beaconGeo = new THREE.CylinderGeometry(0.15, 0.15, 12, 12);
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffd32a, transparent: true, opacity: 0.5 });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.set(0, 6, 0);
        gunGroup.add(beacon);

        const pointLight = new THREE.PointLight(0xffd32a, 2.0, 15);
        pointLight.position.set(0, 2, 0);
        gunGroup.add(pointLight);

        gunGroup.position.copy(pos);
        this.scene.add(gunGroup);

        this.droppedGun = {
            mesh: gunGroup,
            position: pos.clone(),
            active: true
        };

        if (this.gunDroppedBanner) this.gunDroppedBanner.style.display = 'flex';
        this.addIncidentFeed(`⚠️ Relv on maas! Süütud saavad selle [E] klahviga üles korjata!`);
    }

    public pickUpDroppedGun(char: Character) {
        if (!this.droppedGun || !this.droppedGun.active) return;

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
        const innocentsAndSheriff = this.characters.filter(c => c.role !== 'murderer');
        const aliveInnocentsAndSheriff = innocentsAndSheriff.filter(c => c.isAlive);

        if (murderer && !murderer.isAlive) {
            // Sheriff shot Murderer -> Sheriff and Innocents win!
            const hero = this.lastHero || this.characters.find(c => c.role === 'sheriff' && c.isAlive) || this.playerChar;
            const heroName = hero ? hero.name : 'Šerif';
            this.endRound('sheriff_win', `${heroName} laskis mõrvari maha! Süütud ja šerif võitsid!`);
        } else if (aliveInnocentsAndSheriff.length === 0) {
            // Murderer eliminated all innocents and sheriff -> Murderer wins!
            this.endRound('murderer_win', 'Mõrvar kõrvaldas kõik süütud ja šerifi! Mõrvar võitis!');
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
        const hero = this.lastHero || this.characters.find(c => c.role === 'sheriff');

        if (endMurderer && murderer) endMurderer.textContent = murderer.name;
        if (endHero && hero) endHero.textContent = hero.name;
        if (endReason) endReason.textContent = reason;

        let rewardYards = 20; // base reward
        if (winner === 'sheriff_win') {
            if (endTitle) {
                endTitle.textContent = 'SÜÜTUD JA ŠERIF VÕITSID! 🏆';
                endTitle.style.color = '#00f2fe';
            }
            if (trophy) trophy.textContent = '🛡️';
            rewardYards = (this.playerChar.role !== 'murderer' && this.playerChar.isAlive) ? 100 : 40;
            if (this.lastHero === this.playerChar) rewardYards = 150;
        } else if (winner === 'murderer_win') {
            if (endTitle) {
                endTitle.textContent = 'MÕRVAR VÕITIS! 🔪';
                endTitle.style.color = '#ff2e63';
            }
            if (trophy) trophy.textContent = '🩸';
            rewardYards = (this.playerChar.role === 'murderer') ? 150 : 20;
        } else {
            if (endTitle) {
                endTitle.textContent = 'AEG LÕPPES - SÜÜTUD JA ŠERIF VÕITSID! ⏱️';
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

        // Teleport player and characters back to lobby in front of each other
        this.playerChar.position.set(0, 0, 150);
        this.playerChar.mesh.position.copy(this.playerChar.position);

        const botNames = ['Alex', 'Sam', 'Jordan', 'Charlie', 'Taylor', 'Morgan', 'Riley'];
        this.characters.forEach((c, i) => {
            c.role = 'innocent';
            c.isAlive = true;
            c.hasWeaponEquipped = false;
            c.mesh.visible = true;
            if (c.knifeMesh) c.knifeMesh.visible = false;
            if (c.gunMesh) c.gunMesh.visible = false;
            if (!c.isPlayer) {
                const angle = -Math.PI * 0.7 + ((i - 1) / (botNames.length - 1)) * (Math.PI * 1.4);
                const radius = 7.0 + (i % 2) * 1.2;
                c.position.set(Math.sin(angle) * radius, 0, 150 - Math.cos(angle) * radius);
                c.mesh.position.copy(c.position);
                c.rotation = Math.atan2(-c.position.x, 150 - c.position.z);
                c.mesh.rotation.y = c.rotation;
            }
        });

        this.playerChar.coins = 0;
        if (this.hudCoinsVal) this.hudCoinsVal.textContent = '0';
        this.hasSheriffWitnessedMurder = false;

        if (this.hudRoleIcon) this.hudRoleIcon.textContent = '⏳';
        if (this.hudRoleText) this.hudRoleText.textContent = 'LOBBY';
        if (this.hudRoleBadge) {
            this.hudRoleBadge.style.borderColor = '#ffd32a';
            this.hudRoleBadge.style.color = '#ffd32a';
        }
    }

    public openAdminPanel() {
        if (!this.adminModal) return;
        if (this.isPointerLocked) {
            document.exitPointerLock?.();
        }
        this.adminModal.style.display = 'flex';
        this.updateAdminModalActiveState();
    }

    public closeAdminPanel() {
        if (this.adminModal) this.adminModal.style.display = 'none';
    }

    public updateAdminModalActiveState() {
        const current = (this.state === 'in_game') ? this.playerChar.role : (this.adminForcedRole || 'innocent');
        ['murderer', 'sheriff', 'innocent'].forEach(r => {
            const btn = document.getElementById(`btn-admin-role-${r}`);
            if (btn) {
                if (r === current) {
                    btn.classList.add('active-role');
                } else {
                    btn.classList.remove('active-role');
                }
            }
        });
    }

    public setAdminRole(role: Role) {
        this.adminForcedRole = role;
        this.updateAdminModalActiveState();

        const roleNames: Record<Role, string> = {
            'murderer': 'MÕRVAR 🔪',
            'sheriff': 'ŠERIF 🔫',
            'innocent': 'SÜÜTU 🛡️'
        };

        if (this.state === 'lobby') {
            this.addIncidentFeed(`👑 Admin valis oma rolliks: ${roleNames[role]}`);
        } else if (this.state === 'in_game' && this.playerChar.isAlive) {
            const oldRole = this.playerChar.role;
            this.playerChar.role = role;
            this.playerChar.hasWeaponEquipped = false;
            if (this.playerChar.knifeMesh) this.playerChar.knifeMesh.visible = false;
            if (this.playerChar.gunMesh) this.playerChar.gunMesh.visible = false;

            if (role === 'murderer') {
                this.characters.forEach(c => {
                    if (!c.isPlayer && c.role === 'murderer') {
                        c.role = 'innocent';
                        c.hasWeaponEquipped = false;
                        if (c.knifeMesh) c.knifeMesh.visible = false;
                    }
                });
                const hasSheriff = this.characters.some(c => !c.isPlayer && c.isAlive && c.role === 'sheriff');
                if (!hasSheriff) {
                    const livingBot = this.characters.find(c => !c.isPlayer && c.isAlive);
                    if (livingBot) livingBot.role = 'sheriff';
                }
            } else if (role === 'sheriff') {
                this.characters.forEach(c => {
                    if (!c.isPlayer && c.role === 'sheriff') {
                        c.role = 'innocent';
                        c.hasWeaponEquipped = false;
                        if (c.gunMesh) c.gunMesh.visible = false;
                    }
                });
                const hasMurderer = this.characters.some(c => !c.isPlayer && c.isAlive && c.role === 'murderer');
                if (!hasMurderer) {
                    const livingBot = this.characters.find(c => !c.isPlayer && c.isAlive);
                    if (livingBot) livingBot.role = 'murderer';
                }
            } else if (role === 'innocent') {
                if (oldRole === 'murderer') {
                    const livingBot = this.characters.find(c => !c.isPlayer && c.isAlive && c.role === 'innocent');
                    if (livingBot) livingBot.role = 'murderer';
                }
                if (oldRole === 'sheriff') {
                    const livingBot = this.characters.find(c => !c.isPlayer && c.isAlive && c.role === 'innocent');
                    if (livingBot) livingBot.role = 'sheriff';
                }
            }

            this.updateRoleHud();
            audio.playRoleReveal(role);
            this.addIncidentFeed(`👑 Sinu roll on nüüd: ${roleNames[role]}!`);
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
            } else if (e.code === 'KeyP') {
                // Toggle Playard Admin Panel
                if (this.adminModal && this.adminModal.style.display === 'flex') {
                    this.closeAdminPanel();
                } else {
                    this.openAdminPanel();
                }
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

        // Mouse Controls: Click-Drag to look around, or Click for Pointer Lock / Action
        this.container.addEventListener('mousedown', (e: MouseEvent) => {
            this.isDraggingMouse = true;
            this.lastMousePos = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mouseup', () => {
            this.isDraggingMouse = false;
        });

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

        window.addEventListener('mousemove', (e: MouseEvent) => {
            if (this.isPointerLocked) {
                const sens = 0.0025;
                this.cameraYaw -= e.movementX * sens;
                this.cameraPitch -= e.movementY * sens;
                this.cameraPitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 3, this.cameraPitch));
                this.playerChar.rotation = this.cameraYaw;
            } else if (this.isDraggingMouse) {
                const dx = e.clientX - this.lastMousePos.x;
                const dy = e.clientY - this.lastMousePos.y;
                this.lastMousePos = { x: e.clientX, y: e.clientY };
                const sens = 0.004;
                this.cameraYaw -= dx * sens;
                this.cameraPitch -= dy * sens;
                this.cameraPitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 3, this.cameraPitch));
                this.playerChar.rotation = this.cameraYaw;
            }
        });

        // Mouse Wheel Zoom (First person to 3rd person)
        this.container.addEventListener('wheel', (e: WheelEvent) => {
            e.preventDefault();
            this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance + e.deltaY * 0.006, 0.5, 14.0);
        }, { passive: false });

        // Touch Drag for Mobile / Tablet View Rotation
        this.container.addEventListener('touchstart', (e: TouchEvent) => {
            if (e.touches.length === 1) {
                this.isTouchDragging = true;
                this.touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        }, { passive: true });

        this.container.addEventListener('touchmove', (e: TouchEvent) => {
            if (this.isTouchDragging && e.touches.length === 1) {
                const dx = e.touches[0].clientX - this.touchStartPos.x;
                const dy = e.touches[0].clientY - this.touchStartPos.y;
                this.touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                const sens = 0.005;
                this.cameraYaw -= dx * sens;
                this.cameraPitch -= dy * sens;
                this.cameraPitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 3, this.cameraPitch));
                this.playerChar.rotation = this.cameraYaw;
            }
        }, { passive: true });

        this.container.addEventListener('touchend', () => {
            this.isTouchDragging = false;
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

        // Admin Panel Button Listeners
        document.getElementById('btn-admin-panel')?.addEventListener('click', () => {
            this.openAdminPanel();
        });
        document.getElementById('btn-admin-close')?.addEventListener('click', () => {
            this.closeAdminPanel();
        });
        document.getElementById('btn-admin-role-murderer')?.addEventListener('click', () => {
            this.setAdminRole('murderer');
        });
        document.getElementById('btn-admin-role-sheriff')?.addEventListener('click', () => {
            this.setAdminRole('sheriff');
        });
        document.getElementById('btn-admin-role-innocent')?.addEventListener('click', () => {
            this.setAdminRole('innocent');
        });
        document.getElementById('btn-admin-force-start')?.addEventListener('click', () => {
            this.closeAdminPanel();
            this.startRound();
        });
        document.getElementById('btn-admin-add-yards')?.addEventListener('click', () => {
            yardService.addYards(500, 'Admin bonus');
            this.updateYardDisplay();
            this.addIncidentFeed('💰 Admin lisas +500 Jardi!');
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
                        // Sheriff AI: CANNOT shoot murderer right away at round start!
                        // Only pursues/shoots if sheriff has witnessed murder AND has direct line of sight!
                        if (murderer && murderer.isAlive) {
                            const canSee = this.hasLineOfSight(c.position, murderer.position);
                            const dist = c.position.distanceTo(murderer.position);

                            // Witnessing: if murderer has knife drawn right in front of sheriff without walls blocking
                            if (canSee && dist < 24 && murderer.hasWeaponEquipped) {
                                if (!this.hasSheriffWitnessedMurder) {
                                    this.hasSheriffWitnessedMurder = true;
                                    this.addIncidentFeed(`👁️ Šerif nägi mõrvarit noaga! Tuli avatud!`);
                                }
                            }

                            if (this.hasSheriffWitnessedMurder) {
                                if (canSee) {
                                    // Clear sightline (not through walls) - pursue and ready revolver!
                                    c.aiTarget = murderer.position.clone();
                                    c.hasWeaponEquipped = true;
                                    if (c.gunMesh) c.gunMesh.visible = true;
                                } else {
                                    // Blocked by wall: cannot see through wall, move towards last position without weapon drawn
                                    c.aiTarget = murderer.position.clone();
                                    c.hasWeaponEquipped = false;
                                    if (c.gunMesh) c.gunMesh.visible = false;
                                }
                            } else {
                                // Has NOT witnessed murder yet: does not know who murderer is, patrols casually like innocent!
                                c.hasWeaponEquipped = false;
                                if (c.gunMesh) c.gunMesh.visible = false;
                                c.aiTarget = new THREE.Vector3((Math.random() - 0.5) * 75, 0, (Math.random() - 0.5) * 75);
                            }
                        } else {
                            c.hasWeaponEquipped = false;
                            if (c.gunMesh) c.gunMesh.visible = false;
                            c.aiTarget = new THREE.Vector3((Math.random() - 0.5) * 75, 0, (Math.random() - 0.5) * 75);
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
                            c.aiTarget = new THREE.Vector3((Math.random() - 0.5) * 80, 0, (Math.random() - 0.5) * 80);
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
                    } else if (c.role === 'sheriff' && murderer && murderer.isAlive) {
                        // AI Sheriff can ONLY shoot if:
                        // 1. Sheriff has witnessed the murder
                        // 2. In range (< 20)
                        // 3. Has direct line of sight (CANNOT shoot through walls!)
                        if (this.hasSheriffWitnessedMurder) {
                            const distToMurderer = c.position.distanceTo(murderer.position);
                            const hasClearLOS = this.hasLineOfSight(c.position, murderer.position);
                            if (hasClearLOS && distToMurderer < 20) {
                                this.performSheriffShoot(c);
                            }
                        }
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

    // --- Player Movement, Camera View Look & Physics ---
    private updatePlayer(delta: number) {
        if (!this.playerChar.isAlive) return;

        // 1. Keyboard Camera View Look (Arrow keys or I/J/K/L)
        const lookSpeed = 3.0;
        if (this.keys['ArrowLeft'] || this.keys['KeyJ']) {
            this.cameraYaw += lookSpeed * delta;
            this.playerChar.rotation = this.cameraYaw;
        }
        if (this.keys['ArrowRight'] || this.keys['KeyL']) {
            this.cameraYaw -= lookSpeed * delta;
            this.playerChar.rotation = this.cameraYaw;
        }
        if (this.keys['ArrowUp'] || this.keys['KeyI']) {
            this.cameraPitch = Math.min(Math.PI / 3, this.cameraPitch + 2.2 * delta);
        }
        if (this.keys['ArrowDown'] || this.keys['KeyK']) {
            this.cameraPitch = Math.max(-Math.PI / 4, this.cameraPitch - 2.2 * delta);
        }

        // 2. Keyboard Movement (WASD)
        const moveDir = new THREE.Vector3();
        if (this.keys['KeyW']) moveDir.z -= 1;
        if (this.keys['KeyS']) moveDir.z += 1;
        if (this.keys['KeyA']) moveDir.x -= 1;
        if (this.keys['KeyD']) moveDir.x += 1;

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

        // Update Camera Position & Orbit (Supports Zoom from 1st person to 3rd person)
        const camOffset = new THREE.Vector3(0, this.cameraDistance < 1.0 ? 2.8 : 2.5, this.cameraDistance);
        camOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.cameraPitch);
        camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);

        this.camera.position.copy(this.playerChar.position).add(camOffset);
        this.camera.lookAt(this.playerChar.position.clone().add(new THREE.Vector3(0, 1.8, 0)));

        // Hide player mesh in true first person view
        if (this.playerChar.mesh) {
            this.playerChar.mesh.visible = this.cameraDistance > 1.2;
        }
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
