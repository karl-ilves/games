import * as THREE from 'three';
import { yardService } from '../../shared/yardService';
import { getCurrentUserProfile, isPlayardOwner, isTestMode, canAccessMmp1 } from '../../auth';

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
export type Role = 'murderer' | 'sheriff' | 'innocent';
export type GameState = 'lobby' | 'role_reveal' | 'in_game' | 'round_end';
export type MapId = 'hotel2' | 'milbase' | 'office' | 'vacation' | 'yatchy';

export interface MapConfig {
    id: MapId;
    name: string;
    icon: string;
    description: string;
    spawnPoints: [number, number, number][];
    coinSpawns: [number, number, number][];
}

export const MAP_CATALOG: Record<MapId, MapConfig> = {
    hotel2: {
        id: 'hotel2',
        name: 'HOTEL 2',
        icon: '🏨',
        description: 'Luksuslik kahekorruseline hotell fuajee, tubade, koridoride ja rõdudega.',
        spawnPoints: [
            [0, 0, 0], [-10, 0, -8], [10, 0, -8], [-12, 0, 10], [12, 0, 10],
            [-22, 0, -2], [22, 0, -2], [0, 0, -18]
        ],
        coinSpawns: [
            [0, 1, 0], [-8, 1, -12], [8, 1, -12], [-14, 1, 8], [14, 1, 8],
            [-24, 1, -18], [24, 1, -18], [-24, 1, 18], [24, 1, 18],
            [0, 1, 20], [-16, 1, 0], [16, 1, 0], [0, 1, -26]
        ]
    },
    milbase: {
        id: 'milbase',
        name: 'MIL BASE',
        icon: '🪖',
        description: 'Militaarbaas kasarmute, radaripunkri, varustuse angaari ja siseõuega.',
        spawnPoints: [
            [0, 0, 0], [-14, 0, -10], [14, 0, -10], [-14, 0, 12], [14, 0, 12],
            [-24, 0, 0], [24, 0, 0], [0, 0, -22]
        ],
        coinSpawns: [
            [0, 1, 0], [-12, 1, -14], [12, 1, -14], [-16, 1, 12], [16, 1, 12],
            [-26, 1, -20], [26, 1, -20], [-26, 1, 20], [26, 1, 20],
            [0, 1, 22], [-20, 1, 0], [20, 1, 0], [0, 1, -28]
        ]
    },
    office: {
        id: 'office',
        name: 'OFFICE',
        icon: '🏢',
        description: 'Suur büroohoone boksikontorite, koosolekuruumi, serveriruumi ja puhkealaga.',
        spawnPoints: [
            [0, 0, 0], [-12, 0, -10], [12, 0, -10], [-12, 0, 12], [12, 0, 12],
            [-22, 0, 0], [22, 0, 0], [0, 0, -18]
        ],
        coinSpawns: [
            [0, 1, 0], [-10, 1, -10], [10, 1, -10], [-14, 1, 14], [14, 1, 14],
            [-25, 1, -18], [25, 1, -18], [-25, 1, 18], [25, 1, 18],
            [0, 1, 22], [-18, 1, 0], [18, 1, 0], [0, 1, -24]
        ]
    },
    vacation: {
        id: 'vacation',
        name: 'VACATION',
        icon: '🌴',
        description: 'Rannakuurort kuldse liiva, palmide, bangalote, tiki-baari ja vaateplatvormiga.',
        spawnPoints: [
            [0, 0, 0], [-14, 0, -8], [14, 0, -8], [-12, 0, 14], [12, 0, 14],
            [-22, 0, 0], [22, 0, 0], [0, 0, -20]
        ],
        coinSpawns: [
            [0, 1, 0], [-12, 1, -12], [12, 1, -12], [-16, 1, 12], [16, 1, 12],
            [-24, 1, -18], [24, 1, -18], [-24, 1, 18], [24, 1, 18],
            [0, 1, 20], [-18, 1, 0], [18, 1, 0], [0, 1, -26]
        ]
    },
    yatchy: {
        id: 'yatchy',
        name: 'YATCHY',
        icon: '🛥️',
        description: 'Mitmetasandiline luksusjaht salongi, kajutite, kaptenisilla ja mullivanniga.',
        spawnPoints: [
            [0, 0, 0], [-8, 0, -12], [8, 0, -12], [-8, 0, 14], [8, 0, 14],
            [-14, 0, 0], [14, 0, 0], [0, 0, -22]
        ],
        coinSpawns: [
            [0, 1, 0], [-8, 1, -10], [8, 1, -10], [-8, 1, 12], [8, 1, 12],
            [-16, 1, -20], [16, 1, -20], [-16, 1, 20], [16, 1, 20],
            [0, 1, 22], [-12, 1, 0], [12, 1, 0], [0, 1, -28]
        ]
    }
};

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
    knifeMesh?: THREE.Group | THREE.Mesh;
    gunMesh?: THREE.Group;
    bodyMesh?: THREE.Mesh;
    headMesh?: THREE.Mesh;
    leftLeg?: THREE.Group;
    rightLeg?: THREE.Group;
    leftArm?: THREE.Group;
    rightArm?: THREE.Group;
    aiTarget?: THREE.Vector3;
    aiTimer: number;
    coins: number;
    walkAnimTimer?: number;
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
    public currentMapId: MapId = 'hotel2';
    public adminSelectedMap: MapId | 'random' = 'random';
    private lastHero: Character | null = null;
    public wallMeshes: THREE.Mesh[] = [];
    public hasSheriffWitnessedMurder: boolean = false;
    private hudMapBadge: HTMLElement | null = null;
    private hudMapText: HTMLElement | null = null;
    private endMapName: HTMLElement | null = null;

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
        this.hudMapBadge = document.getElementById('hud-map-badge');
        this.hudMapText = document.getElementById('hud-map-text');
        this.endMapName = document.getElementById('end-map-name');

        const gameYardIcon = document.getElementById('game-yard-icon');
        if (gameYardIcon) gameYardIcon.innerHTML = yardService.renderYardSvg(18);
    }

    private checkAccessAuthorization() {
        const prof = getCurrentUserProfile();
        const email = prof?.email;
        const authorized = canAccessMmp1(prof);
        const owner = isPlayardOwner(email);
        const testMode = isTestMode();

        if (!authorized && !testMode) {
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

    // --- Modular 3D Map Architecture (5 Distinct MM Maps) ---
    public buildMap(mapId: MapId) {
        this.currentMapId = mapId;
        const config = MAP_CATALOG[mapId];

        // Clean up old map
        if (this.mansionGroup) {
            this.scene.remove(this.mansionGroup);
        }
        this.mansionGroup = new THREE.Group();
        this.mansionGroup.position.set(0, 0, 0);
        this.mapColliders = [];
        this.wallMeshes = [];

        // Update HUD Badge
        if (this.hudMapText) {
            this.hudMapText.textContent = `${config.icon} ${config.name}`;
        }
        if (this.endMapName) {
            this.endMapName.textContent = `${config.icon} ${config.name}`;
        }

        switch (mapId) {
            case 'hotel2':
                this.buildHotel2Map();
                break;
            case 'milbase':
                this.buildMilBaseMap();
                break;
            case 'office':
                this.buildOfficeMap();
                break;
            case 'vacation':
                this.buildVacationMap();
                break;
            case 'yatchy':
                this.buildYatchyMap();
                break;
            default:
                this.buildHotel2Map();
                break;
        }

        this.scene.add(this.mansionGroup);
    }

    // Helper to create walls with collisions and raycasting tracking
    private createMapWall(w: number, h: number, d: number, x: number, y: number, z: number, color = 0x241d24, hasCollider = true): THREE.Mesh {
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
    }

    // 1. HOTEL 2: Multi-floor grand hotel with lobby, reception, rooms, and mezzanine
    private buildHotel2Map() {
        // Floor: Polished hotel marble & dark oak
        const floorGeo = new THREE.BoxGeometry(92, 1, 92);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.35, metalness: 0.1 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.mansionGroup.add(floor);

        // Center Red Velvet Carpet across grand lobby
        const carpetGeo = new THREE.BoxGeometry(12, 0.08, 65);
        const carpetMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.8 });
        const carpet = new THREE.Mesh(carpetGeo, carpetMat);
        carpet.position.set(0, 0.05, 0);
        carpet.receiveShadow = true;
        this.mansionGroup.add(carpet);

        // Perimeter Walls
        this.createMapWall(92, 14, 2, 0, 7, -46, 0x1f1924);
        this.createMapWall(92, 14, 2, 0, 7, 46, 0x1f1924);
        this.createMapWall(2, 14, 92, -46, 7, 0, 0x1f1924);
        this.createMapWall(2, 14, 92, 46, 7, 0, 0x1f1924);

        // Hotel Reception Desk (North Center)
        const desk = new THREE.Mesh(new THREE.BoxGeometry(18, 2.2, 4), new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.3 }));
        desk.position.set(0, 1.1, -36);
        desk.castShadow = true;
        this.mansionGroup.add(desk);
        this.wallMeshes.push(desk);
        this.mapColliders.push(new THREE.Box3().setFromObject(desk));

        // Hotel Key Rack / Back Wall
        this.createMapWall(22, 6, 1.5, 0, 3, -42, 0x2b1c11);

        // Hotel Grand Pillars
        const pillarGeo = new THREE.CylinderGeometry(1.2, 1.4, 14, 16);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x4d3e52, roughness: 0.3 });
        [[-18, -18], [18, -18], [-18, 18], [18, 18], [-18, 0], [18, 0], [0, -18], [0, 18]].forEach(([px, pz]) => {
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(px, 7, pz);
            pillar.castShadow = true;
            this.mansionGroup.add(pillar);
            this.wallMeshes.push(pillar);
            this.mapColliders.push(new THREE.Box3().setFromObject(pillar));
        });

        // Hotel Suite 101 (North-West)
        this.createMapWall(18, 4, 1, -34, 2, -22, 0x443322);
        this.createMapWall(1, 4, 18, -22, 2, -34, 0x443322);
        const bed1 = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 6), new THREE.MeshStandardMaterial({ color: 0x8e1b32 }));
        bed1.position.set(-34, 1, -34);
        this.mansionGroup.add(bed1);
        this.wallMeshes.push(bed1);
        this.mapColliders.push(new THREE.Box3().setFromObject(bed1));

        // Hotel Restaurant & Dining (North-East)
        this.createMapWall(18, 4, 1, 34, 2, -22, 0x443322);
        this.createMapWall(1, 4, 18, 22, 2, -34, 0x443322);
        const diningTable = new THREE.Mesh(new THREE.BoxGeometry(16, 1.8, 4.5), new THREE.MeshStandardMaterial({ color: 0x5c3a21 }));
        diningTable.position.set(34, 0.9, -33);
        this.mansionGroup.add(diningTable);
        this.wallMeshes.push(diningTable);
        this.mapColliders.push(new THREE.Box3().setFromObject(diningTable));

        // Hotel Suite 102 (South-West)
        this.createMapWall(18, 4, 1, -34, 2, 22, 0x443322);
        this.createMapWall(1, 4, 18, -22, 2, 34, 0x443322);
        const bed2 = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 6), new THREE.MeshStandardMaterial({ color: 0x27ae60 }));
        bed2.position.set(-34, 1, 34);
        this.mansionGroup.add(bed2);
        this.wallMeshes.push(bed2);
        this.mapColliders.push(new THREE.Box3().setFromObject(bed2));

        // Hotel Lounge & Bar (South-East)
        this.createMapWall(18, 4, 1, 34, 2, 22, 0x443322);
        this.createMapWall(1, 4, 18, 22, 2, 34, 0x443322);
        const barCounter = new THREE.Mesh(new THREE.BoxGeometry(12, 2.2, 3), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.3 }));
        barCounter.position.set(34, 1.1, 33);
        this.mansionGroup.add(barCounter);
        this.wallMeshes.push(barCounter);
        this.mapColliders.push(new THREE.Box3().setFromObject(barCounter));

        // Hotel Mezzanine Balcony Walkway (2nd Floor visual structure)
        const balconyGeo = new THREE.BoxGeometry(70, 0.8, 6);
        const balconyMat = new THREE.MeshStandardMaterial({ color: 0x2e1f14, roughness: 0.5 });
        const balcony = new THREE.Mesh(balconyGeo, balconyMat);
        balcony.position.set(0, 6.5, -20);
        this.mansionGroup.add(balcony);

        // Lighting: Warm luxury hotel chandelier
        const chandelier = new THREE.PointLight(0xffeedd, 2.8, 65);
        chandelier.position.set(0, 11, 0);
        this.mansionGroup.add(chandelier);

        const warmLight = new THREE.PointLight(0xff9944, 1.6, 35);
        warmLight.position.set(0, 5, -34);
        this.mansionGroup.add(warmLight);
    }

    // 2. MIL BASE: Military fortified base with hangar, barracks, radar bunker, crates
    private buildMilBaseMap() {
        // Floor: Concrete military asphalt
        const floorGeo = new THREE.BoxGeometry(92, 1, 92);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x2c3539, roughness: 0.85 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.mansionGroup.add(floor);

        // Perimeter Heavy Blast Walls (Camouflage olive/slate)
        this.createMapWall(92, 14, 2.5, 0, 7, -46, 0x1e272c);
        this.createMapWall(92, 14, 2.5, 0, 7, 46, 0x1e272c);
        this.createMapWall(2.5, 14, 92, -46, 7, 0, 0x1e272c);
        this.createMapWall(2.5, 14, 92, 46, 7, 0, 0x1e272c);

        // Central Helicopter Landing Helipad Ring
        const padGeo = new THREE.CylinderGeometry(10, 10, 0.1, 32);
        const padMat = new THREE.MeshStandardMaterial({ color: 0x3d4b52, roughness: 0.7 });
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.set(0, 0.05, 0);
        this.mansionGroup.add(pad);

        // North-West: Supply Hangar
        this.createMapWall(22, 6, 1.5, -30, 3, -22, 0x3b444b);
        this.createMapWall(1.5, 6, 22, -19, 3, -33, 0x3b444b);
        // Military Ammo Crates
        const crateMat = new THREE.MeshStandardMaterial({ color: 0x4b5320, roughness: 0.6 });
        [[-32, -32], [-35, -32], [-32, -35], [-35, -35]].forEach(([cx, cz]) => {
            const crate = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), crateMat);
            crate.position.set(cx, 1.2, cz);
            this.mansionGroup.add(crate);
            this.wallMeshes.push(crate);
            this.mapColliders.push(new THREE.Box3().setFromObject(crate));
        });

        // North-East: Command / Radar Bunker
        this.createMapWall(22, 6, 1.5, 30, 3, -22, 0x2f353b);
        this.createMapWall(1.5, 6, 22, 19, 3, -33, 0x2f353b);
        const radarConsole = new THREE.Mesh(new THREE.BoxGeometry(10, 2, 3), new THREE.MeshStandardMaterial({ color: 0x111e1e }));
        radarConsole.position.set(30, 1, -33);
        this.mansionGroup.add(radarConsole);
        this.wallMeshes.push(radarConsole);
        this.mapColliders.push(new THREE.Box3().setFromObject(radarConsole));

        // South-West: Soldiers' Barracks (Bunk Beds)
        this.createMapWall(22, 6, 1.5, -30, 3, 22, 0x3b444b);
        this.createMapWall(1.5, 6, 22, -19, 3, 33, 0x3b444b);
        const bunkMat = new THREE.MeshStandardMaterial({ color: 0x2d382e });
        [-34, -28].forEach(bx => {
            const bunk = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 7), bunkMat);
            bunk.position.set(bx, 1.5, 34);
            this.mansionGroup.add(bunk);
            this.wallMeshes.push(bunk);
            this.mapColliders.push(new THREE.Box3().setFromObject(bunk));
        });

        // South-East: Armory & Weapons Depot
        this.createMapWall(22, 6, 1.5, 30, 3, 22, 0x2f353b);
        this.createMapWall(1.5, 6, 22, 19, 3, 33, 0x2f353b);
        const weaponRack = new THREE.Mesh(new THREE.BoxGeometry(12, 3.5, 2), new THREE.MeshStandardMaterial({ color: 0x15181a, metalness: 0.8 }));
        weaponRack.position.set(30, 1.75, 34);
        this.mansionGroup.add(weaponRack);
        this.wallMeshes.push(weaponRack);
        this.mapColliders.push(new THREE.Box3().setFromObject(weaponRack));

        // Military Sandbag Fortifications around center
        const sandbagMat = new THREE.MeshStandardMaterial({ color: 0x827b60, roughness: 0.9 });
        [[-8, 8], [8, 8], [-8, -8], [8, -8]].forEach(([sx, sz]) => {
            const bag = new THREE.Mesh(new THREE.BoxGeometry(6, 1.4, 1.6), sandbagMat);
            bag.position.set(sx, 0.7, sz);
            this.mansionGroup.add(bag);
            this.wallMeshes.push(bag);
            this.mapColliders.push(new THREE.Box3().setFromObject(bag));
        });

        // Harsh Tactical Floodlights
        const tacticalLight = new THREE.PointLight(0xaaccff, 2.6, 65);
        tacticalLight.position.set(0, 12, 0);
        this.mansionGroup.add(tacticalLight);

        const radarGlow = new THREE.PointLight(0x00ff88, 1.8, 25);
        radarGlow.position.set(30, 4, -33);
        this.mansionGroup.add(radarGlow);
    }

    // 3. OFFICE: Modern corporate office building with cubicles, boardroom, server room
    private buildOfficeMap() {
        // Floor: Commercial grey carpet tiles
        const floorGeo = new THREE.BoxGeometry(92, 1, 92);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x34495e, roughness: 0.7 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.mansionGroup.add(floor);

        // Modern White Drywall Outer Perimeter
        this.createMapWall(92, 14, 2, 0, 7, -46, 0x2c3e50);
        this.createMapWall(92, 14, 2, 0, 7, 46, 0x2c3e50);
        this.createMapWall(2, 14, 92, -46, 7, 0, 0x2c3e50);
        this.createMapWall(2, 14, 92, 46, 7, 0, 0x2c3e50);

        // Center Executive Cubicle Clusters (Partitions with desks)
        const cubicleMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.5 });
        const deskMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, roughness: 0.3 });
        const monitorMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5 });

        [[-8, -6], [8, -6], [-8, 6], [8, 6]].forEach(([cx, cz]) => {
            // Partition
            const part = new THREE.Mesh(new THREE.BoxGeometry(8, 2.8, 0.4), cubicleMat);
            part.position.set(cx, 1.4, cz);
            this.mansionGroup.add(part);
            this.wallMeshes.push(part);
            this.mapColliders.push(new THREE.Box3().setFromObject(part));

            // Desk
            const desk = new THREE.Mesh(new THREE.BoxGeometry(6, 1.4, 2.5), deskMat);
            desk.position.set(cx, 0.7, cz + (cz < 0 ? -1.5 : 1.5));
            this.mansionGroup.add(desk);
            this.wallMeshes.push(desk);
            this.mapColliders.push(new THREE.Box3().setFromObject(desk));

            // Computer monitor
            const mon = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 0.2), monitorMat);
            mon.position.set(cx, 1.8, cz + (cz < 0 ? -1.5 : 1.5));
            this.mansionGroup.add(mon);
        });

        // North-West: Executive Boardroom
        this.createMapWall(22, 5, 1.2, -30, 2.5, -20, 0x1a252f);
        this.createMapWall(1.2, 5, 22, -19, 2.5, -31, 0x1a252f);
        const boardTable = new THREE.Mesh(new THREE.BoxGeometry(14, 1.6, 5), new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.2 }));
        boardTable.position.set(-31, 0.8, -31);
        this.mansionGroup.add(boardTable);
        this.wallMeshes.push(boardTable);
        this.mapColliders.push(new THREE.Box3().setFromObject(boardTable));

        // North-East: High-Tech Server Room (Glowing server racks)
        this.createMapWall(22, 5, 1.2, 30, 2.5, -20, 0x1a252f);
        this.createMapWall(1.2, 5, 22, 19, 2.5, -31, 0x1a252f);
        const serverMat = new THREE.MeshStandardMaterial({ color: 0x111820, metalness: 0.8 });
        [26, 31, 36].forEach(sx => {
            const rack = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4.5, 10), serverMat);
            rack.position.set(sx, 2.25, -32);
            this.mansionGroup.add(rack);
            this.wallMeshes.push(rack);
            this.mapColliders.push(new THREE.Box3().setFromObject(rack));
        });
        const serverLight = new THREE.PointLight(0x00d2d3, 2.2, 22);
        serverLight.position.set(31, 3, -31);
        this.mansionGroup.add(serverLight);

        // South-West: Breakroom & Coffee Bar
        this.createMapWall(22, 5, 1.2, -30, 2.5, 20, 0x1a252f);
        this.createMapWall(1.2, 5, 22, -19, 2.5, 31, 0x1a252f);
        const snackBar = new THREE.Mesh(new THREE.BoxGeometry(10, 1.8, 3), new THREE.MeshStandardMaterial({ color: 0xecf0f1 }));
        snackBar.position.set(-30, 0.9, 31);
        this.mansionGroup.add(snackBar);
        this.wallMeshes.push(snackBar);
        this.mapColliders.push(new THREE.Box3().setFromObject(snackBar));

        // South-East: CEO Corner Office
        this.createMapWall(22, 5, 1.2, 30, 2.5, 20, 0x1a252f);
        this.createMapWall(1.2, 5, 22, 19, 2.5, 31, 0x1a252f);
        const ceoDesk = new THREE.Mesh(new THREE.BoxGeometry(8, 1.6, 4), new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.1 }));
        ceoDesk.position.set(30, 0.8, 31);
        this.mansionGroup.add(ceoDesk);
        this.wallMeshes.push(ceoDesk);
        this.mapColliders.push(new THREE.Box3().setFromObject(ceoDesk));

        // Office Overhead Fluorescent Lights
        const officeCeilingLight = new THREE.PointLight(0xf5f6fa, 2.7, 65);
        officeCeilingLight.position.set(0, 11, 0);
        this.mansionGroup.add(officeCeilingLight);
    }

    // 4. VACATION: Tropical island resort with golden sand, palm trees, bungalows, tiki-bar
    private buildVacationMap() {
        // Floor: Golden sand beach
        const floorGeo = new THREE.BoxGeometry(92, 1, 92);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0xe5c07b, roughness: 0.9 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.mansionGroup.add(floor);

        // Ocean Water Border Strip (North edge)
        const waterGeo = new THREE.BoxGeometry(92, 0.8, 12);
        const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x0abde3, transmission: 0.7, opacity: 0.85, transparent: true, roughness: 0.1 });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.position.set(0, -0.2, -40);
        this.mansionGroup.add(water);

        // Resort Cliffside Perimeter Walls (Sandstone texture)
        this.createMapWall(92, 14, 2, 0, 7, -46, 0x574b90);
        this.createMapWall(92, 14, 2, 0, 7, 46, 0x8a795d);
        this.createMapWall(2, 14, 92, -46, 7, 0, 0x8a795d);
        this.createMapWall(2, 14, 92, 46, 7, 0, 0x8a795d);

        // Palm Trees (Trunk + Palm Canopy)
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6e4726, roughness: 0.8 });
        const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x2ed573, roughness: 0.5 });
        [
            [-12, -8], [12, -8], [-12, 12], [12, 12],
            [-28, -2], [28, -2], [0, 18], [0, -22]
        ].forEach(([tx, tz]) => {
            // Trunk
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 7, 8), trunkMat);
            trunk.position.set(tx, 3.5, tz);
            trunk.castShadow = true;
            this.mansionGroup.add(trunk);
            this.wallMeshes.push(trunk);
            this.mapColliders.push(new THREE.Box3().setFromObject(trunk));

            // Canopy
            const leaves = new THREE.Mesh(new THREE.ConeGeometry(3.5, 2.5, 8), palmLeafMat);
            leaves.position.set(tx, 7.5, tz);
            this.mansionGroup.add(leaves);
        });

        // Beach Bungalow 1 (North-West)
        this.createMapWall(18, 4.5, 1.2, -32, 2.25, -20, 0xa0522d);
        this.createMapWall(1.2, 4.5, 18, -21, 2.25, -31, 0xa0522d);
        const roof1 = new THREE.Mesh(new THREE.BoxGeometry(20, 1.2, 20), new THREE.MeshStandardMaterial({ color: 0xd4a373 }));
        roof1.position.set(-32, 5, -31);
        this.mansionGroup.add(roof1);

        // Beach Bungalow 2 (South-West)
        this.createMapWall(18, 4.5, 1.2, -32, 2.25, 20, 0xa0522d);
        this.createMapWall(1.2, 4.5, 18, -21, 2.25, 31, 0xa0522d);
        const roof2 = new THREE.Mesh(new THREE.BoxGeometry(20, 1.2, 20), new THREE.MeshStandardMaterial({ color: 0xd4a373 }));
        roof2.position.set(-32, 5, 31);
        this.mansionGroup.add(roof2);

        // Central Tiki Bar & Coconut Cocktails (East)
        this.createMapWall(18, 3.5, 1.2, 30, 1.75, 10, 0x8b5a2b);
        this.createMapWall(1.2, 3.5, 18, 21, 1.75, 21, 0x8b5a2b);
        const tikiCounter = new THREE.Mesh(new THREE.BoxGeometry(10, 2, 4), new THREE.MeshStandardMaterial({ color: 0xcd853f }));
        tikiCounter.position.set(30, 1, 21);
        this.mansionGroup.add(tikiCounter);
        this.wallMeshes.push(tikiCounter);
        this.mapColliders.push(new THREE.Box3().setFromObject(tikiCounter));

        // Sun Loungers & Umbrellas
        const umbrellaMat = new THREE.MeshStandardMaterial({ color: 0xff4757 });
        [[-4, -14], [4, -14], [-4, 4], [4, 4]].forEach(([ux, uz]) => {
            const lounger = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 3.8), new THREE.MeshStandardMaterial({ color: 0xffffff }));
            lounger.position.set(ux, 0.25, uz);
            this.mansionGroup.add(lounger);
            this.wallMeshes.push(lounger);
            this.mapColliders.push(new THREE.Box3().setFromObject(lounger));

            const umbPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.5, 8), trunkMat);
            umbPole.position.set(ux + 1.2, 1.75, uz);
            this.mansionGroup.add(umbPole);
            const umbTop = new THREE.Mesh(new THREE.ConeGeometry(1.8, 0.8, 8), umbrellaMat);
            umbTop.position.set(ux + 1.2, 3.6, uz);
            this.mansionGroup.add(umbTop);
        });

        // Warm Tropical Sunlight & Lanterns
        const sunLight = new THREE.PointLight(0xfff3a0, 2.9, 70);
        sunLight.position.set(0, 14, 0);
        this.mansionGroup.add(sunLight);

        const tikiLantern = new THREE.PointLight(0xff6b6b, 1.9, 30);
        tikiLantern.position.set(30, 4, 21);
        this.mansionGroup.add(tikiLantern);
    }

    // 5. YATCHY: Luxury multi-deck superyacht with bridge, dining salon, cabins, and jacuzzi
    private buildYatchyMap() {
        // Floor: Polished teak yacht decking
        const floorGeo = new THREE.BoxGeometry(92, 1, 92);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.4 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.mansionGroup.add(floor);

        // Ocean Sea Water all around the mega-yacht hull
        const oceanGeo = new THREE.BoxGeometry(140, 0.5, 140);
        const oceanMat = new THREE.MeshStandardMaterial({ color: 0x004e92, roughness: 0.2, metalness: 0.3 });
        const ocean = new THREE.Mesh(oceanGeo, oceanMat);
        ocean.position.y = -1.0;
        this.mansionGroup.add(ocean);

        // Sleek White Yacht Hull & Stainless Steel Guard Rails
        this.createMapWall(92, 14, 2, 0, 7, -46, 0xecf0f1);
        this.createMapWall(92, 14, 2, 0, 7, 46, 0xecf0f1);
        this.createMapWall(2, 14, 92, -46, 7, 0, 0xecf0f1);
        this.createMapWall(2, 14, 92, 46, 7, 0, 0xecf0f1);

        // Captain's Bridge (North Wheelhouse with radar and helm)
        this.createMapWall(26, 5, 1.5, 0, 2.5, -30, 0x2c3e50);
        const helmConsole = new THREE.Mesh(new THREE.BoxGeometry(12, 1.8, 3), new THREE.MeshStandardMaterial({ color: 0x1e272e, metalness: 0.6 }));
        helmConsole.position.set(0, 0.9, -36);
        this.mansionGroup.add(helmConsole);
        this.wallMeshes.push(helmConsole);
        this.mapColliders.push(new THREE.Box3().setFromObject(helmConsole));

        // Central VIP Jacuzzi Pool
        const poolBorder = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.8, 24), new THREE.MeshStandardMaterial({ color: 0xdcdde1, roughness: 0.2 }));
        poolBorder.position.set(0, 0.4, 0);
        this.mansionGroup.add(poolBorder);
        this.wallMeshes.push(poolBorder);
        this.mapColliders.push(new THREE.Box3().setFromObject(poolBorder));

        const poolWater = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.82, 24), new THREE.MeshStandardMaterial({ color: 0x00d2d3, roughness: 0.1, transparent: true, opacity: 0.7 }));
        poolWater.position.set(0, 0.42, 0);
        this.mansionGroup.add(poolWater);

        // VIP Suite Cabin A (West)
        this.createMapWall(16, 4.5, 1.2, -28, 2.25, -12, 0x34495e);
        this.createMapWall(1.2, 4.5, 16, -20, 2.25, -20, 0x34495e);
        const yachtBed1 = new THREE.Mesh(new THREE.BoxGeometry(6, 1.8, 7), new THREE.MeshStandardMaterial({ color: 0x2980b9 }));
        yachtBed1.position.set(-30, 0.9, -20);
        this.mansionGroup.add(yachtBed1);
        this.wallMeshes.push(yachtBed1);
        this.mapColliders.push(new THREE.Box3().setFromObject(yachtBed1));

        // VIP Suite Cabin B (East)
        this.createMapWall(16, 4.5, 1.2, 28, 2.25, -12, 0x34495e);
        this.createMapWall(1.2, 4.5, 16, 20, 2.25, -20, 0x34495e);
        const yachtBed2 = new THREE.Mesh(new THREE.BoxGeometry(6, 1.8, 7), new THREE.MeshStandardMaterial({ color: 0x8e44ad }));
        yachtBed2.position.set(30, 0.9, -20);
        this.mansionGroup.add(yachtBed2);
        this.wallMeshes.push(yachtBed2);
        this.mapColliders.push(new THREE.Box3().setFromObject(yachtBed2));

        // Aft Dining Salon (South Deck)
        this.createMapWall(30, 4.5, 1.2, 0, 2.25, 24, 0x2c3e50);
        const yachtTable = new THREE.Mesh(new THREE.BoxGeometry(16, 1.6, 5), new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.15 }));
        yachtTable.position.set(0, 0.8, 34);
        this.mansionGroup.add(yachtTable);
        this.wallMeshes.push(yachtTable);
        this.mapColliders.push(new THREE.Box3().setFromObject(yachtTable));

        // Yacht Deck Illumination
        const yachtLight = new THREE.PointLight(0xe0f7fa, 2.7, 65);
        yachtLight.position.set(0, 11, 0);
        this.mansionGroup.add(yachtLight);

        const jacuzziLight = new THREE.PointLight(0x00f2fe, 1.9, 18);
        jacuzziLight.position.set(0, 2.5, 0);
        this.mansionGroup.add(jacuzziLight);
    }

    // Backward-compatibility wrapper for existing test suites
    public buildMansion() {
        this.buildMap('hotel2');
    }

    // --- Create Ultra-Realistic Weapons ---
    private createUltraRealisticKnife(): THREE.Group {
        const group = new THREE.Group();

        // 1. Ergonomic Tactical Handle
        const handleMat = new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.65, metalness: 0.25 });
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.65, 12), handleMat);
        handle.scale.set(0.65, 1.0, 1.2);
        handle.position.set(0, -0.32, 0);
        group.add(handle);

        // Tactical Grip Finger Grooves
        const grooveMat = new THREE.MeshStandardMaterial({ color: 0x0f1012, roughness: 0.85 });
        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.015, 8, 16), grooveMat);
            ring.position.set(0, -0.18 - i * 0.12, 0);
            ring.rotation.x = Math.PI / 2;
            group.add(ring);
        }

        // Brass Rivet Pins
        const pinMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.95, roughness: 0.2 });
        for (let i = 0; i < 3; i++) {
            const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 8), pinMat);
            pin.position.set(0, -0.18 - i * 0.12, 0);
            pin.rotation.z = Math.PI / 2;
            group.add(pin);
        }

        // Solid Steel Pommel Skull-Crusher
        const pommelMat = new THREE.MeshStandardMaterial({ color: 0x3a3e42, metalness: 0.95, roughness: 0.25 });
        const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.12, 10), pommelMat);
        pommel.position.set(0, -0.68, 0);
        group.add(pommel);
        const pommelTip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 8), pommelMat);
        pommelTip.position.set(0, -0.76, 0);
        pommelTip.rotation.x = Math.PI;
        group.add(pommelTip);

        // Guard / Quillon
        const guardMat = new THREE.MeshStandardMaterial({ color: 0x4a4f55, metalness: 0.95, roughness: 0.2 });
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.38), guardMat);
        guard.position.set(0, 0.06, 0);
        group.add(guard);

        // High Carbon Steel Bowie Blade
        const bladeMat = new THREE.MeshStandardMaterial({
            color: 0xe8ecf2,
            metalness: 0.98,
            roughness: 0.12
        });
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.92, 0.2), bladeMat);
        blade.position.set(0, 0.54, 0.02);
        group.add(blade);

        // Razor Sharp Beveled Cutting Edge
        const edgeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.99, roughness: 0.04 });
        const edge = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.9, 4), edgeMat);
        edge.position.set(0, 0.54, 0.12);
        edge.scale.set(1.0, 1.0, 3.8);
        group.add(edge);

        // Clip-point Bowie Tip
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 4), bladeMat);
        tip.position.set(0, 1.1, 0.02);
        tip.rotation.y = Math.PI / 4;
        group.add(tip);

        // Blood Fuller (Groove)
        const fullerMat = new THREE.MeshStandardMaterial({ color: 0x25282c, roughness: 0.7, metalness: 0.7 });
        const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.03), fullerMat);
        fuller.position.set(0, 0.52, 0);
        group.add(fuller);

        // Serrated Spine
        for (let i = 0; i < 4; i++) {
            const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.04, 3), bladeMat);
            tooth.position.set(0, 0.2 + i * 0.06, -0.09);
            tooth.rotation.z = Math.PI / 2;
            group.add(tooth);
        }

        group.scale.set(1.15, 1.15, 1.15);
        return group;
    }

    private createUltraRealisticRevolver(isGolden = false): THREE.Group {
        const group = new THREE.Group();

        const metalMat = new THREE.MeshStandardMaterial({
            color: isGolden ? 0xffd700 : 0x24282e,
            metalness: isGolden ? 0.98 : 0.94,
            roughness: isGolden ? 0.14 : 0.22,
            emissive: isGolden ? 0x443300 : 0x05080c
        });

        const polishedSteel = new THREE.MeshStandardMaterial({
            color: isGolden ? 0xffea70 : 0xd8dde3,
            metalness: 0.98,
            roughness: 0.12
        });

        const gripWoodMat = new THREE.MeshStandardMaterial({
            color: isGolden ? 0x2b1810 : 0x4a2c17,
            roughness: 0.45,
            metalness: 0.1
        });

        // Frame
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 0.52), metalMat);
        frame.position.set(0, 0.1, 0.05);
        group.add(frame);

        // Top Strap Sight Notch
        const topStrap = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.62), metalMat);
        topStrap.position.set(0, 0.27, 0.1);
        group.add(topStrap);

        // 6-Shot Cylinder
        const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.32, 16), metalMat);
        cylinder.rotation.x = Math.PI / 2;
        cylinder.position.set(0, 0.1, 0.05);
        group.add(cylinder);

        // Cylinder Flutes
        const fluteMat = new THREE.MeshStandardMaterial({
            color: isGolden ? 0xb8860b : 0x16181b,
            metalness: 0.9,
            roughness: 0.4
        });
        for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2;
            const flute = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 8), fluteMat);
            flute.rotation.x = Math.PI / 2;
            flute.position.set(Math.cos(ang) * 0.12, 0.1 + Math.sin(ang) * 0.12, 0.05);
            group.add(flute);
        }

        // Cartridge rims
        const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.95, roughness: 0.2 });
        for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2;
            const primer = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8), brassMat);
            primer.rotation.x = Math.PI / 2;
            primer.position.set(Math.cos(ang) * 0.08, 0.1 + Math.sin(ang) * 0.08, -0.11);
            group.add(primer);
        }

        // Ventilated Barrel
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.75, 14), metalMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.19, 0.62);
        group.add(barrel);

        // Muzzle Bore
        const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 12), new THREE.MeshBasicMaterial({ color: 0x050505 }));
        bore.rotation.x = Math.PI / 2;
        bore.position.set(0, 0.19, 1.0);
        group.add(bore);

        // Under-barrel Lug
        const lug = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.68), metalMat);
        lug.position.set(0, 0.09, 0.58);
        group.add(lug);

        // Front Sight Blade
        const sightMat = new THREE.MeshStandardMaterial({ color: isGolden ? 0xffffff : 0xff3838, roughness: 0.3 });
        const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.12), sightMat);
        frontSight.position.set(0, 0.29, 0.94);
        group.add(frontSight);

        // Cocked Hammer
        const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.1), polishedSteel);
        hammer.position.set(0, 0.24, -0.22);
        hammer.rotation.x = -Math.PI / 4;
        group.add(hammer);

        // Trigger Guard & Trigger
        const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 16, Math.PI), metalMat);
        triggerGuard.position.set(0, -0.06, 0.08);
        triggerGuard.rotation.y = Math.PI / 2;
        triggerGuard.rotation.x = Math.PI;
        group.add(triggerGuard);

        const trigger = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 8), polishedSteel);
        trigger.position.set(0, -0.05, 0.08);
        trigger.rotation.x = -Math.PI / 6;
        group.add(trigger);

        // Walnut Grip
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, 0.28), gripWoodMat);
        grip.position.set(0, -0.24, -0.12);
        grip.rotation.x = -Math.PI / 8;
        group.add(grip);

        // Sheriff Star Badge Medallion
        const starMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.98, roughness: 0.15 });
        const starL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 5), starMat);
        starL.rotation.z = Math.PI / 2;
        starL.position.set(-0.08, -0.2, -0.1);
        group.add(starL);

        const starR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 5), starMat);
        starR.rotation.z = Math.PI / 2;
        starR.position.set(0.08, -0.2, -0.1);
        group.add(starR);

        group.scale.set(1.15, 1.15, 1.15);
        return group;
    }

    // --- Create 3D Ultra-Realistic Human Character Model ---
    private createCharacterMesh(name: string, colorHex: number, isPlayer: boolean = false): {
        group: THREE.Group;
        knife: THREE.Group;
        gun: THREE.Group;
        body: THREE.Mesh;
        head: THREE.Mesh;
        leftLeg: THREE.Group;
        rightLeg: THREE.Group;
        leftArm: THREE.Group;
        rightArm: THREE.Group;
    } {
        const group = new THREE.Group();

        // 1. Natural Human Skin Tones
        const skinPalette = [0xf5d0b5, 0xf0c8a6, 0xdfb190, 0xd49a6a, 0xb87333, 0x8d5524, 0xecd0b9, 0xc68652];
        const skinColor = isPlayer ? 0xf5d0b5 : skinPalette[Math.abs(colorHex) % skinPalette.length];
        const skinMat = new THREE.MeshStandardMaterial({
            color: skinColor,
            roughness: 0.55,
            metalness: 0.04
        });

        // 2. Stylish Tailored Suit / Detective Clothing Materials
        const jacketMat = new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: 0.62,
            metalness: 0.12
        });
        const lapelMat = new THREE.MeshStandardMaterial({
            color: 0x181b20,
            roughness: 0.55,
            metalness: 0.18
        });
        const shirtMat = new THREE.MeshStandardMaterial({
            color: 0xf8f9fa,
            roughness: 0.75
        });
        const pantsMat = new THREE.MeshStandardMaterial({
            color: 0x22262a,
            roughness: 0.7
        });
        const tieMat = new THREE.MeshStandardMaterial({
            color: isPlayer ? 0x990022 : (colorHex === 0xe74c3c ? 0x0f2042 : 0x8b0000),
            roughness: 0.35
        });
        const shoeMat = new THREE.MeshStandardMaterial({
            color: 0x141210,
            roughness: 0.25,
            metalness: 0.2
        });
        const goldBtnMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            metalness: 0.95,
            roughness: 0.2
        });

        // --- LEGS with Hip Pivots ---
        const legLGroup = new THREE.Group();
        legLGroup.position.set(-0.32, 1.35, 0);

        const thighL = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.17, 0.72, 14), pantsMat);
        thighL.position.set(0, -0.36, 0);
        thighL.castShadow = true;
        legLGroup.add(thighL);

        const calfL = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.65, 14), pantsMat);
        calfL.position.set(0, -0.92, 0);
        calfL.castShadow = true;
        legLGroup.add(calfL);

        // Oxford Dress Shoe Left
        const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.52), shoeMat);
        shoeL.position.set(0, -1.28, 0.08);
        shoeL.castShadow = true;
        legLGroup.add(shoeL);
        const shoeSoleL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.56), new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.9 }));
        shoeSoleL.position.set(0, -1.35, 0.08);
        legLGroup.add(shoeSoleL);
        group.add(legLGroup);

        const legRGroup = new THREE.Group();
        legRGroup.position.set(0.32, 1.35, 0);

        const thighR = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.17, 0.72, 14), pantsMat);
        thighR.position.set(0, -0.36, 0);
        thighR.castShadow = true;
        legRGroup.add(thighR);

        const calfR = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.65, 14), pantsMat);
        calfR.position.set(0, -0.92, 0);
        calfR.castShadow = true;
        legRGroup.add(calfR);

        // Oxford Dress Shoe Right
        const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.52), shoeMat);
        shoeR.position.set(0, -1.28, 0.08);
        shoeR.castShadow = true;
        legRGroup.add(shoeR);
        const shoeSoleR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.56), new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.9 }));
        shoeSoleR.position.set(0, -1.35, 0.08);
        legRGroup.add(shoeSoleR);
        group.add(legRGroup);

        // --- TORSO (Waist, Chest, Jacket, Collar, Tie) ---
        // Leather Belt & Metallic Buckle
        const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.14, 16), new THREE.MeshStandardMaterial({ color: 0x1f1915, roughness: 0.6 }));
        belt.position.set(0, 1.42, 0);
        group.add(belt);

        const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.08), goldBtnMat);
        buckle.position.set(0, 1.42, 0.54);
        group.add(buckle);

        // Abdomen
        const abdomen = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.56, 0.45, 16), jacketMat);
        abdomen.position.set(0, 1.68, 0);
        abdomen.scale.set(1.0, 1.0, 0.78);
        group.add(abdomen);

        // Main Torso / Upper Chest (bodyMesh)
        const bodyGeo = new THREE.CylinderGeometry(0.66, 0.54, 0.85, 16);
        const body = new THREE.Mesh(bodyGeo, jacketMat);
        body.position.set(0, 2.25, 0);
        body.scale.set(1.0, 1.0, 0.76);
        body.castShadow = true;
        group.add(body);

        // Inner White Shirt & Lapel V-opening
        const innerShirt = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.65, 0.06), shirtMat);
        innerShirt.position.set(0, 2.32, 0.38);
        group.add(innerShirt);

        // Silk Tie
        const tie = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.46, 0.05), tieMat);
        tie.position.set(0, 2.22, 0.42);
        group.add(tie);

        // Lapels Left & Right
        const lapelL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.58, 0.06), lapelMat);
        lapelL.position.set(-0.20, 2.34, 0.40);
        lapelL.rotation.z = -0.15;
        group.add(lapelL);

        const lapelR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.58, 0.06), lapelMat);
        lapelR.position.set(0.20, 2.34, 0.40);
        lapelR.rotation.z = 0.15;
        group.add(lapelR);

        // 3 Gold Buttons down front
        for (let i = 0; i < 3; i++) {
            const btn = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), goldBtnMat);
            btn.position.set(0, 1.62 + i * 0.22, 0.44);
            group.add(btn);
        }

        // --- NECK & HEAD ---
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.23, 0.42, 16), skinMat);
        neck.position.set(0, 2.74, 0);
        group.add(neck);

        // Cranium / Head (headMesh)
        const headGeo = new THREE.SphereGeometry(0.44, 24, 24);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.set(0, 3.12, 0);
        head.scale.set(0.92, 1.08, 0.98);
        head.castShadow = true;
        group.add(head);

        // Jaw & Chin
        const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.32, 0.42), skinMat);
        jaw.position.set(0, 2.92, 0.12);
        group.add(jaw);

        // Ears Left & Right
        const earGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.16, 10);
        const earL = new THREE.Mesh(earGeo, skinMat);
        earL.position.set(-0.43, 3.12, 0);
        earL.rotation.z = 0.15;
        group.add(earL);

        const earR = new THREE.Mesh(earGeo, skinMat);
        earR.position.set(0.43, 3.12, 0);
        earR.rotation.z = -0.15;
        group.add(earR);

        // 3D Sculpted Nose
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 4), skinMat);
        nose.position.set(0, 3.08, 0.46);
        nose.rotation.x = Math.PI / 2;
        group.add(nose);

        // Lips
        const lipMat = new THREE.MeshStandardMaterial({ color: 0xc87d7d, roughness: 0.55 });
        const lips = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.06), lipMat);
        lips.position.set(0, 2.92, 0.43);
        group.add(lips);

        // Eyes & Eyebrows
        const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf6f8fa });
        const irisColors = [0x634e34, 0x2e8b57, 0x3d2314, 0x1f3c88];
        const irisColor = isPlayer ? 0x2a52be : irisColors[Math.abs(colorHex) % irisColors.length];
        const irisMat = new THREE.MeshStandardMaterial({
            color: irisColor,
            roughness: 0.2
        });
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
        const browMat = new THREE.MeshStandardMaterial({ color: 0x221a14, roughness: 0.9 });

        // Left Eye
        const eyeWhiteL = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), eyeWhiteMat);
        eyeWhiteL.position.set(-0.18, 3.16, 0.38);
        group.add(eyeWhiteL);
        const irisL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12), irisMat);
        irisL.rotation.x = Math.PI / 2;
        irisL.position.set(-0.18, 3.16, 0.44);
        group.add(irisL);
        const pupilL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.025, 8), pupilMat);
        pupilL.rotation.x = Math.PI / 2;
        pupilL.position.set(-0.18, 3.16, 0.45);
        group.add(pupilL);
        const browL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.06), browMat);
        browL.position.set(-0.18, 3.25, 0.42);
        browL.rotation.z = 0.08;
        group.add(browL);

        // Right Eye
        const eyeWhiteR = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), eyeWhiteMat);
        eyeWhiteR.position.set(0.18, 3.16, 0.38);
        group.add(eyeWhiteR);
        const irisR = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12), irisMat);
        irisR.rotation.x = Math.PI / 2;
        irisR.position.set(0.18, 3.16, 0.44);
        group.add(irisR);
        const pupilR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.025, 8), pupilMat);
        pupilR.rotation.x = Math.PI / 2;
        pupilR.position.set(0.18, 3.16, 0.45);
        group.add(pupilR);
        const browR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.06), browMat);
        browR.position.set(0.18, 3.25, 0.42);
        browR.rotation.z = -0.08;
        group.add(browR);

        // --- HAIR & CROWN ---
        const hairPalette = [0x1a1a1a, 0x3d2719, 0x5c4033, 0x8b5a2b, 0x2a1e17];
        const hairColor = isPlayer ? 0x221812 : hairPalette[Math.abs(colorHex) % hairPalette.length];
        const hairMat = new THREE.MeshStandardMaterial({
            color: hairColor,
            roughness: 0.85
        });
        const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
        hairTop.position.set(0, 3.24, -0.02);
        hairTop.scale.set(0.96, 1.05, 1.02);
        group.add(hairTop);

        const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.55, 0.28), hairMat);
        hairBack.position.set(0, 3.08, -0.32);
        group.add(hairBack);

        if (isPlayer) {
            // Masterpiece 3D Royal Crown for Player
            const crownGold = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.98, roughness: 0.12 });
            const crownBand = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.15, 24, 1, true), crownGold);
            crownBand.position.set(0, 3.56, 0);
            group.add(crownBand);

            // Velvet Inner Crown Cap
            const velvetCap = new THREE.Mesh(new THREE.SphereGeometry(0.44, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: 0x800020, roughness: 0.85 }));
            velvetCap.position.set(0, 3.55, 0);
            group.add(velvetCap);

            // 8 Crown Peaks with Jewels
            const rubyMat = new THREE.MeshStandardMaterial({ color: 0xff1133, roughness: 0.1, metalness: 0.9 });
            const saphMat = new THREE.MeshStandardMaterial({ color: 0x1166ff, roughness: 0.1, metalness: 0.9 });
            for (let i = 0; i < 8; i++) {
                const ang = (i / 8) * Math.PI * 2;
                const peak = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 4), crownGold);
                peak.position.set(Math.sin(ang) * 0.46, 3.72, Math.cos(ang) * 0.46);
                group.add(peak);

                const gem = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), i % 2 === 0 ? rubyMat : saphMat);
                gem.position.set(Math.sin(ang) * 0.47, 3.56, Math.cos(ang) * 0.47);
                group.add(gem);
            }
        }

        // --- ARMS (Shoulder Pivots) ---
        const armLGroup = new THREE.Group();
        armLGroup.position.set(-0.84, 2.55, 0);

        const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), jacketMat);
        armLGroup.add(shoulderL);
        const bicepL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.65, 14), jacketMat);
        bicepL.position.set(0, -0.38, 0);
        bicepL.castShadow = true;
        armLGroup.add(bicepL);
        const forearmL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.62, 14), jacketMat);
        forearmL.position.set(0, -0.85, 0);
        forearmL.castShadow = true;
        armLGroup.add(forearmL);
        // Shirt Cuff
        const cuffL = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 12), shirtMat);
        cuffL.position.set(0, -1.14, 0);
        armLGroup.add(cuffL);
        // Sculpted Hand
        const handL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.20), skinMat);
        handL.position.set(0, -1.26, 0.04);
        armLGroup.add(handL);
        group.add(armLGroup);

        const armRGroup = new THREE.Group();
        armRGroup.position.set(0.84, 2.55, 0);

        const shoulderR = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), jacketMat);
        armRGroup.add(shoulderR);
        const bicepR = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.65, 14), jacketMat);
        bicepR.position.set(0, -0.38, 0);
        bicepR.castShadow = true;
        armRGroup.add(bicepR);
        const forearmR = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.62, 14), jacketMat);
        forearmR.position.set(0, -0.85, 0);
        forearmR.castShadow = true;
        armRGroup.add(forearmR);
        // Shirt Cuff
        const cuffR = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 12), shirtMat);
        cuffR.position.set(0, -1.14, 0);
        armRGroup.add(cuffR);
        // Sculpted Hand
        const handR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.20), skinMat);
        handR.position.set(0, -1.26, 0.04);
        armRGroup.add(handR);

        // --- ULTRA-REALISTIC WEAPONS (Held in Right Hand) ---
        const knifeGroup = this.createUltraRealisticKnife();
        knifeGroup.position.set(0.1, -1.28, 0.22);
        knifeGroup.rotation.x = Math.PI / 3;
        knifeGroup.rotation.y = -Math.PI / 8;
        knifeGroup.visible = false;
        armRGroup.add(knifeGroup);

        const gunGroup = this.createUltraRealisticRevolver(false);
        gunGroup.position.set(0.08, -1.22, 0.26);
        gunGroup.rotation.x = 0;
        gunGroup.visible = false;
        armRGroup.add(gunGroup);

        group.add(armRGroup);

        // Large, sharp, prominent Name Tag Canvas Billboard
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

        return {
            group,
            knife: knifeGroup,
            gun: gunGroup,
            body,
            head,
            leftLeg: legLGroup,
            rightLeg: legRGroup,
            leftArm: armLGroup,
            rightArm: armRGroup
        };
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
            leftLeg: pModel.leftLeg,
            rightLeg: pModel.rightLeg,
            leftArm: pModel.leftArm,
            rightArm: pModel.rightArm,
            aiTimer: 0,
            coins: 0
        };
        this.playerChar.mesh.userData.character = this.playerChar;
        this.playerChar.mesh.traverse(c => { c.userData.character = this.playerChar; });
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
                leftLeg: botModel.leftLeg,
                rightLeg: botModel.rightLeg,
                leftArm: botModel.leftArm,
                rightArm: botModel.rightArm,
                aiTimer: 0,
                coins: 0
            };
            bot.mesh.userData.character = bot;
            bot.mesh.traverse(c => { c.userData.character = bot; });
            bot.mesh.position.copy(bot.position);
            bot.mesh.rotation.y = bot.rotation;
            this.scene.add(bot.mesh);
            this.characters.push(bot);
        });
    }

    // --- Gold Coins Spawning in Selected Map ---
    private spawnCoins() {
        // Clear existing
        this.coins.forEach(c => this.scene.remove(c.mesh));
        this.coins = [];

        const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 12);
        const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.8, roughness: 0.2, emissive: 0x443300 });

        const config = MAP_CATALOG[this.currentMapId] || MAP_CATALOG['hotel2'];
        const positions = config.coinSpawns;

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

    // --- Start Round: Assign Roles & Teleport into Map ---
    public startRound() {
        this.state = 'role_reveal';
        this.lastHero = null;
        this.hasSheriffWitnessedMurder = false;
        if (this.lobbyBanner) this.lobbyBanner.style.display = 'none';

        // Select Map: If admin forced map, use it; otherwise pick randomly among the 5 maps
        const mapKeys: MapId[] = ['hotel2', 'milbase', 'office', 'vacation', 'yatchy'];
        let chosenMap: MapId = 'hotel2';
        if (this.adminSelectedMap && this.adminSelectedMap !== 'random') {
            chosenMap = this.adminSelectedMap;
        } else {
            chosenMap = mapKeys[Math.floor(Math.random() * mapKeys.length)];
        }

        // Build the selected 3D map
        this.buildMap(chosenMap);

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

        // Teleport characters to the map's designated spawn points
        const mapConfig = MAP_CATALOG[chosenMap];
        const spawns = mapConfig.spawnPoints;
        this.characters.forEach((c, i) => {
            const pt = spawns[i % spawns.length];
            c.position.set(pt[0], pt[1], pt[2]);
            c.mesh.position.copy(c.position);
            c.rotation = Math.atan2(-c.position.x, -c.position.z);
            c.mesh.rotation.y = c.rotation;
        });

        // Respawn coins for current map
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

    public getCharacterFromObject(obj: THREE.Object3D | null): Character | null {
        let curr: THREE.Object3D | null = obj;
        while (curr) {
            if (curr.userData && curr.userData.character) {
                return curr.userData.character as Character;
            }
            for (const c of this.characters) {
                if (c.mesh === curr) return c;
            }
            curr = curr.parent;
        }
        return null;
    }

    public performAction(screenPos?: { x: number; y: number }) {
        if (this.state !== 'in_game' || !this.playerChar.isAlive) return;

        // Auto-equip weapon if not equipped
        if (!this.playerChar.hasWeaponEquipped && this.playerChar.role !== 'innocent') {
            this.toggleWeapon();
        }

        const coords = screenPos ?? { x: 0, y: 0 };

        if (this.playerChar.role === 'murderer') {
            this.performMurdererSlash(this.playerChar, coords);
        } else if (this.playerChar.role === 'sheriff') {
            this.performSheriffShoot(this.playerChar, coords);
        }
    }

    public performMurdererSlash(attacker: Character, screenPos?: { x: number; y: number }) {
        audio.playKnifeSlash();
        
        // 1. If AI attacker: attacks if within melee distance and unobstructed
        if (!attacker.isPlayer) {
            const attackRange = 3.2;
            for (const target of this.characters) {
                if (target === attacker || !target.isAlive) continue;
                const dist = attacker.position.distanceTo(target.position);
                if (dist < attackRange && this.hasLineOfSight(attacker.position, target.position)) {
                    this.eliminateCharacter(target, attacker, 'knife');
                    break;
                }
            }
            return;
        }

        // 2. If Player attacker: ONLY eliminates when clicked directly on a living player in close proximity ("läheduses")!
        const coords = screenPos ?? { x: 0, y: 0 };
        this.camera.updateMatrixWorld(true);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(coords.x, coords.y), this.camera);

        const targetMeshes: THREE.Object3D[] = [];
        for (const c of this.characters) {
            if (c !== attacker && c.isAlive && c.mesh) {
                targetMeshes.push(c.mesh);
            }
        }
        if (targetMeshes.length === 0) return;
        targetMeshes.forEach(m => m.updateMatrixWorld(true));

        // Check intersections with target meshes and walls (walls block clicks)
        const allShootables = [...targetMeshes, ...this.wallMeshes];
        const hits = raycaster.intersectObjects(allShootables, true);
        if (hits.length === 0) return;

        const firstHit = hits[0];
        // If a wall was struck first, knife attack cannot pass through wall
        let isWall = false;
        let curr: THREE.Object3D | null = firstHit.object;
        while (curr) {
            if (this.wallMeshes.includes(curr as THREE.Mesh)) {
                isWall = true;
                break;
            }
            curr = curr.parent;
        }
        if (isWall) return;

        const hitTarget = this.getCharacterFromObject(firstHit.object);
        if (!hitTarget || hitTarget === attacker || !hitTarget.isAlive) {
            return;
        }

        // Proximity check: Must be in close range ("läheduses")
        const dist = attacker.position.distanceTo(hitTarget.position);
        const maxMeleeDist = 4.2;
        if (dist > maxMeleeDist) {
            return;
        }

        // Line of sight check
        if (!this.hasLineOfSight(attacker.position, hitTarget.position)) {
            return;
        }

        // Target clicked directly in close proximity -> eliminate!
        this.eliminateCharacter(hitTarget, attacker, 'knife');
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

    public performSheriffShoot(shooter: Character, screenPos?: { x: number; y: number }) {
        audio.playGunshot();

        const charMeshes = this.characters.filter(c => c !== shooter && c.isAlive && c.mesh).map(c => c.mesh);
        // Include wall meshes so bullets CANNOT pass or hit through walls!
        const allShootables = [...charMeshes, ...this.wallMeshes];
        if (allShootables.length === 0) return;

        let raycaster: THREE.Raycaster;
        if (shooter.isPlayer) {
            const coords = screenPos ?? { x: 0, y: 0 };
            this.camera.updateMatrixWorld(true);
            raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(coords.x, coords.y), this.camera);
            raycaster.far = 100;
        } else {
            const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), shooter.rotation);
            const rayOrigin = shooter.position.clone().add(new THREE.Vector3(0, 1.8, 0));
            raycaster = new THREE.Raycaster(rayOrigin, forward, 0.5, 75);
        }

        const hits = raycaster.intersectObjects(allShootables, true);

        if (hits.length > 0 && hits[0]?.object) {
            const hitObj = hits[0].object;
            // Check if bullet struck a wall/barrier first
            let isWall = false;
            let curr: THREE.Object3D | null = hitObj;
            while (curr) {
                if (this.wallMeshes.includes(curr as THREE.Mesh)) {
                    isWall = true;
                    break;
                }
                curr = curr.parent;
            }
            if (isWall) {
                // Bullet hit a solid wall - cannot penetrate or hit through walls!
                return;
            }

            const hitTarget = this.getCharacterFromObject(hitObj);

            if (hitTarget && hitTarget !== shooter && hitTarget.isAlive) {
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
                    this.addIncidentFeed(`⚠️ Šerif eksis ja lasi süütu! Šerif langes!`);
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
        } else if (cause === 'knife' || (killer && killer.role === 'murderer')) {
            // Murderer kills someone -> DO NOT show murderer's name in top right feed!
            this.addIncidentFeed(`💀 Mängija ${target.name} elimineeriti!`);
        } else if (cause === 'gun') {
            this.addIncidentFeed(`⭐ Šerif tabas märki! ${target.name} langes!`);
        } else {
            this.addIncidentFeed(`💀 Mängija ${target.name} langes!`);
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
        
        // Shiny golden ultra-realistic magnum revolver
        const goldenRevolver = this.createUltraRealisticRevolver(true);
        goldenRevolver.position.set(0, 0.75, 0);
        goldenRevolver.rotation.x = Math.PI / 8;
        goldenRevolver.scale.set(1.4, 1.4, 1.4);
        gunGroup.add(goldenRevolver);

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

        const curMap = MAP_CATALOG[this.currentMapId] || MAP_CATALOG['hotel2'];
        if (this.endMapName) {
            this.endMapName.textContent = `${curMap.icon} ${curMap.name}`;
        }

        let rewardYards = 20; // base reward
        if (winner === 'sheriff_win') {
            if (endTitle) {
                // If the hero was an innocent who grabbed the gun vs original detective
                const isDetectiveHero = (hero && hero.role === 'sheriff' && hero.id !== 'innocent');
                endTitle.textContent = isDetectiveHero ? 'DETECTIVE WINS 🔫' : 'INNOCENTS WIN 🏆';
                endTitle.style.color = '#00f2fe';
            }
            if (trophy) trophy.textContent = '🔫';
            rewardYards = (this.playerChar.role !== 'murderer' && this.playerChar.isAlive) ? 100 : 40;
            if (this.lastHero === this.playerChar) rewardYards = 150;
        } else if (winner === 'murderer_win') {
            if (endTitle) {
                endTitle.textContent = 'MURDERER WINS 🔪';
                endTitle.style.color = '#ff2e63';
            }
            if (trophy) trophy.textContent = '🩸';
            rewardYards = (this.playerChar.role === 'murderer') ? 150 : 20;
        } else {
            if (endTitle) {
                endTitle.textContent = 'INNOCENTS WIN 🏆';
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
        // Highlight active role
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

        // Highlight active map
        const activeMap = this.adminSelectedMap || 'random';
        document.querySelectorAll('.admin-map-btn').forEach(b => {
            const m = b.getAttribute('data-map');
            const el = b as HTMLElement;
            if (m === activeMap) {
                el.classList.add('active');
                el.style.borderColor = '#ffd32a';
                el.style.color = '#ffd32a';
            } else {
                el.classList.remove('active');
                el.style.borderColor = '';
                el.style.color = '';
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
        let mouseDownPos = { x: 0, y: 0 };
        let hasMovedMouseSignificantly = false;

        this.container.addEventListener('mousedown', (e: MouseEvent) => {
            this.isDraggingMouse = true;
            this.lastMousePos = { x: e.clientX, y: e.clientY };
            mouseDownPos = { x: e.clientX, y: e.clientY };
            hasMovedMouseSignificantly = false;
        });

        window.addEventListener('mouseup', () => {
            this.isDraggingMouse = false;
        });

        this.container.addEventListener('click', (e: MouseEvent) => {
            if (this.state === 'in_game' && this.playerChar.isAlive) {
                // If user dragged to rotate camera view, don't trigger attack action
                if (hasMovedMouseSignificantly) return;

                let coords = { x: 0, y: 0 };
                if (this.isPointerLocked) {
                    coords = { x: 0, y: 0 };
                } else {
                    const rect = this.container.getBoundingClientRect();
                    coords = {
                        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
                        y: -((e.clientY - rect.top) / rect.height) * 2 + 1
                    };
                    this.container.requestPointerLock?.();
                }
                this.performAction(coords);
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
                if (Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y) > 6) {
                    hasMovedMouseSignificantly = true;
                }
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

        // Touch Drag for Mobile / Tablet View Rotation & Tap to Attack
        let touchStartCoord = { x: 0, y: 0 };
        let touchMoved = false;

        this.container.addEventListener('touchstart', (e: TouchEvent) => {
            if (e.touches.length === 1) {
                this.isTouchDragging = true;
                this.touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                touchStartCoord = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                touchMoved = false;
            }
        }, { passive: true });

        this.container.addEventListener('touchmove', (e: TouchEvent) => {
            if (this.isTouchDragging && e.touches.length === 1) {
                const dx = e.touches[0].clientX - this.touchStartPos.x;
                const dy = e.touches[0].clientY - this.touchStartPos.y;
                if (Math.hypot(e.touches[0].clientX - touchStartCoord.x, e.touches[0].clientY - touchStartCoord.y) > 8) {
                    touchMoved = true;
                }
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
            if (!touchMoved && this.state === 'in_game' && this.playerChar.isAlive) {
                const rect = this.container.getBoundingClientRect();
                const coords = {
                    x: ((touchStartCoord.x - rect.left) / rect.width) * 2 - 1,
                    y: -((touchStartCoord.y - rect.top) / rect.height) * 2 + 1
                };
                this.performAction(coords);
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

        // Map Selection Buttons in Admin Panel
        document.querySelectorAll('.admin-map-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const mapVal = target.getAttribute('data-map') as (MapId | 'random');
                if (mapVal) {
                    this.adminSelectedMap = mapVal;
                    document.querySelectorAll('.admin-map-btn').forEach(b => {
                        b.classList.remove('active');
                        (b as HTMLElement).style.borderColor = '';
                        (b as HTMLElement).style.color = '';
                    });
                    target.classList.add('active');
                    target.style.borderColor = '#ffd32a';
                    target.style.color = '#ffd32a';
                    
                    const label = target.textContent?.trim() || mapVal;
                    this.addIncidentFeed(`🗺️ Admin valis järgmiseks kaardiks: ${label}`);
                }
            });
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

                    // Realistic human walking gait
                    c.walkAnimTimer = (c.walkAnimTimer || 0) + delta * 9;
                    if (c.leftLeg && c.rightLeg) {
                        c.leftLeg.rotation.x = Math.sin(c.walkAnimTimer) * 0.45;
                        c.rightLeg.rotation.x = -Math.sin(c.walkAnimTimer) * 0.45;
                    }
                    if (c.leftArm && c.rightArm) {
                        c.leftArm.rotation.x = -Math.sin(c.walkAnimTimer) * 0.38;
                        if (!c.hasWeaponEquipped) {
                            c.rightArm.rotation.x = Math.sin(c.walkAnimTimer) * 0.38;
                        } else {
                            c.rightArm.rotation.x = -0.35;
                        }
                    }
                } else {
                    const idle = Math.sin(Date.now() * 0.0025 + (c.walkAnimTimer || 0)) * 0.03;
                    if (c.leftLeg) c.leftLeg.rotation.x = 0;
                    if (c.rightLeg) c.rightLeg.rotation.x = 0;
                    if (c.leftArm) c.leftArm.rotation.x = idle;
                    if (c.rightArm && !c.hasWeaponEquipped) c.rightArm.rotation.x = -idle;
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

            // Realistic player walking animation
            this.playerChar.walkAnimTimer = (this.playerChar.walkAnimTimer || 0) + delta * 11;
            if (this.playerChar.leftLeg && this.playerChar.rightLeg) {
                this.playerChar.leftLeg.rotation.x = Math.sin(this.playerChar.walkAnimTimer) * 0.45;
                this.playerChar.rightLeg.rotation.x = -Math.sin(this.playerChar.walkAnimTimer) * 0.45;
            }
            if (this.playerChar.leftArm && this.playerChar.rightArm) {
                this.playerChar.leftArm.rotation.x = -Math.sin(this.playerChar.walkAnimTimer) * 0.4;
                if (!this.playerChar.hasWeaponEquipped) {
                    this.playerChar.rightArm.rotation.x = Math.sin(this.playerChar.walkAnimTimer) * 0.4;
                } else {
                    this.playerChar.rightArm.rotation.x = -0.35;
                }
            }
        } else {
            // Player stationary idle breathing
            const idle = Math.sin(Date.now() * 0.0025) * 0.03;
            if (this.playerChar.leftLeg) this.playerChar.leftLeg.rotation.x = 0;
            if (this.playerChar.rightLeg) this.playerChar.rightLeg.rotation.x = 0;
            if (this.playerChar.leftArm) this.playerChar.leftArm.rotation.x = idle;
            if (this.playerChar.rightArm && !this.playerChar.hasWeaponEquipped) this.playerChar.rightArm.rotation.x = -idle;
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

        // Dynamic crosshair visual feedback when murderer aims at a victim within melee range
        if (this.state === 'in_game' && this.playerChar.isAlive && this.playerChar.role === 'murderer') {
            const crosshair = document.getElementById('crosshair');
            if (crosshair) {
                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
                const targets = this.characters.filter(c => c !== this.playerChar && c.isAlive && c.mesh).map(c => c.mesh);
                const hits = raycaster.intersectObjects([...targets, ...this.wallMeshes], true);
                let inMeleeRange = false;
                if (hits.length > 0) {
                    const hitTarget = this.getCharacterFromObject(hits[0].object);
                    if (hitTarget && hitTarget.isAlive && this.playerChar.position.distanceTo(hitTarget.position) <= 4.2 && this.hasLineOfSight(this.playerChar.position, hitTarget.position)) {
                        inMeleeRange = true;
                    }
                }
                if (inMeleeRange) {
                    crosshair.classList.add('target-in-range');
                } else {
                    crosshair.classList.remove('target-in-range');
                }
            }
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
    (window as any).THREE = THREE;
    if (!(window as any).mmp1Game) {
        (window as any).mmp1Game = new MurderMysteryGame();
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initMmp1);
} else {
    initMmp1();
}
