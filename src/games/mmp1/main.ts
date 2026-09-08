import * as THREE from 'three';
import { yardService } from '../../shared/yardService';
import { getCurrentUserProfile, isPlayardOwner, isTestMode, canAccessMmp1 } from '../../auth';
import { avatarService } from '../../shared/avatar/AvatarService';
import { AvatarRig } from '../../shared/avatar/AvatarRig';
import { InGameEmotesWidget } from '../../shared/avatar/InGameEmotesWidget';
import { getItemById } from '../../shared/avatar/catalog';
import { isMobileOrTabletDevice } from '../../shared/mobileControls';

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

    public playCrateTick() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
    }

    public playCrateOpen() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const chord = [392, 493.88, 587.33, 783.99, 987.77];
        chord.forEach((freq, idx) => {
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.22, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.45);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.45);
        });
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

    public playVoteSound() {
        if (!this.soundEnabled) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(880, now + 0.08); // A5
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
    }
}

const audio = new MmpAudio();

// --- Types & Interfaces ---
export type Role = 'murderer' | 'sheriff' | 'innocent';
export type GameState = 'lobby' | 'map_vote' | 'role_reveal' | 'in_game' | 'round_end';
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
    avatarRig?: AvatarRig;
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

// --- MMP1 Crate & Weapon Skin System ---
export type CrateTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'cosmic' | 'secret' | 'og';

export interface WeaponSkinDef {
    id: string;
    name: string;
    type: 'knife' | 'gun';
    tier: CrateTier;
    tierName: string;
    tierColor: string;
    bladeColor?: number;
    edgeColor?: number;
    handleColor?: number;
    metalColor?: number;
    gripColor?: number;
    starColor?: number;
    emissive?: number;
}

export interface CrateDef {
    id: CrateTier;
    name: string;
    icon: string;
    price: number;
    color: string;
    tierName: string;
    defaultStock: number;
    maxStock: number;
    restockIntervalSec: number;
    knifeSkinId: string;
    gunSkinId: string;
}

export const CRATE_CATALOG: Record<CrateTier, CrateDef> = {
    common: {
        id: 'common',
        name: 'Common Crate',
        icon: '📦',
        price: 50,
        color: '#a4b0be',
        tierName: 'Tavaline (Common)',
        defaultStock: 8,
        maxStock: 12,
        restockIntervalSec: 60,
        knifeSkinId: 'knife_common',
        gunSkinId: 'gun_common'
    },
    uncommon: {
        id: 'uncommon',
        name: 'Uncommon Crate',
        icon: '🟩',
        price: 100,
        color: '#2ed573',
        tierName: 'Ebatavaline (Uncommon)',
        defaultStock: 6,
        maxStock: 10,
        restockIntervalSec: 90,
        knifeSkinId: 'knife_uncommon',
        gunSkinId: 'gun_uncommon'
    },
    rare: {
        id: 'rare',
        name: 'Rare Crate',
        icon: '🔷',
        price: 200,
        color: '#1e90ff',
        tierName: 'Haruldane (Rare)',
        defaultStock: 4,
        maxStock: 8,
        restockIntervalSec: 120,
        knifeSkinId: 'knife_rare',
        gunSkinId: 'gun_rare'
    },
    epic: {
        id: 'epic',
        name: 'Epic Crate',
        icon: '🔮',
        price: 400,
        color: '#9b59b6',
        tierName: 'Eepiline (Epic)',
        defaultStock: 3,
        maxStock: 6,
        restockIntervalSec: 180,
        knifeSkinId: 'knife_epic',
        gunSkinId: 'gun_epic'
    },
    legendary: {
        id: 'legendary',
        name: 'Legendary Crate',
        icon: '👑',
        price: 800,
        color: '#ffa502',
        tierName: 'Legendaarne (Legendary)',
        defaultStock: 2,
        maxStock: 4,
        restockIntervalSec: 240,
        knifeSkinId: 'knife_legendary',
        gunSkinId: 'gun_legendary'
    },
    cosmic: {
        id: 'cosmic',
        name: 'Cosmic Crate',
        icon: '🌌',
        price: 1500,
        color: '#ff4757',
        tierName: 'Kosmiline (Cosmic)',
        defaultStock: 2,
        maxStock: 3,
        restockIntervalSec: 300,
        knifeSkinId: 'knife_cosmic',
        gunSkinId: 'gun_cosmic'
    },
    secret: {
        id: 'secret',
        name: 'Secret Crate',
        icon: '👁️',
        price: 3000,
        color: '#00d2d3',
        tierName: 'Salajane (Secret)',
        defaultStock: 1,
        maxStock: 2,
        restockIntervalSec: 420,
        knifeSkinId: 'knife_secret',
        gunSkinId: 'gun_secret'
    },
    og: {
        id: 'og',
        name: 'OG Crate',
        icon: '🕹️',
        price: 5000,
        color: '#ffd32a',
        tierName: 'Klassikaline (OG)',
        defaultStock: 1,
        maxStock: 2,
        restockIntervalSec: 600,
        knifeSkinId: 'knife_og',
        gunSkinId: 'gun_og'
    }
};

export const WEAPON_SKIN_CATALOG: Record<string, WeaponSkinDef> = {
    knife_default: {
        id: 'knife_default',
        name: 'Standard Nuga',
        type: 'knife',
        tier: 'common',
        tierName: 'Standard',
        tierColor: '#bbb',
        bladeColor: 0xe8ecf2,
        handleColor: 0x181a1d
    },
    gun_default: {
        id: 'gun_default',
        name: 'Standard Peacemaker',
        type: 'gun',
        tier: 'common',
        tierName: 'Standard',
        tierColor: '#bbb',
        metalColor: 0x24282e,
        gripColor: 0x4a2c17,
        starColor: 0xffd700
    },
    knife_common: {
        id: 'knife_common',
        name: 'Raudne Tera',
        type: 'knife',
        tier: 'common',
        tierName: 'Common',
        tierColor: '#a4b0be',
        bladeColor: 0x8395a7,
        handleColor: 0x2f3542
    },
    gun_common: {
        id: 'gun_common',
        name: 'Roostes Revolver',
        type: 'gun',
        tier: 'common',
        tierName: 'Common',
        tierColor: '#a4b0be',
        metalColor: 0x574b40,
        gripColor: 0x3d3025,
        starColor: 0xb8860b
    },
    knife_uncommon: {
        id: 'knife_uncommon',
        name: 'Taktikaline Camo Nuga',
        type: 'knife',
        tier: 'uncommon',
        tierName: 'Uncommon',
        tierColor: '#2ed573',
        bladeColor: 0x2ed573,
        handleColor: 0x1e3725
    },
    gun_uncommon: {
        id: 'gun_uncommon',
        name: 'Nikeldatud Python',
        type: 'gun',
        tier: 'uncommon',
        tierName: 'Uncommon',
        tierColor: '#2ed573',
        metalColor: 0xdfe4ea,
        gripColor: 0x747d8c,
        starColor: 0x2ed573
    },
    knife_rare: {
        id: 'knife_rare',
        name: 'Karmiinpunane Ämblikunuga',
        type: 'knife',
        tier: 'rare',
        tierName: 'Rare',
        tierColor: '#1e90ff',
        bladeColor: 0xd63031,
        handleColor: 0x1e272e,
        emissive: 0x440000
    },
    gun_rare: {
        id: 'gun_rare',
        name: 'Siniteras Peacemaker',
        type: 'gun',
        tier: 'rare',
        tierName: 'Rare',
        tierColor: '#1e90ff',
        metalColor: 0x0984e3,
        gripColor: 0x2c3e50,
        starColor: 0x74b9ff,
        emissive: 0x001133
    },
    knife_epic: {
        id: 'knife_epic',
        name: 'Küberneoon Tera',
        type: 'knife',
        tier: 'epic',
        tierName: 'Epic',
        tierColor: '#9b59b6',
        bladeColor: 0x00cec9,
        handleColor: 0x6c5ce7,
        emissive: 0x00f2fe
    },
    gun_epic: {
        id: 'gun_epic',
        name: 'Damaskuse Python',
        type: 'gun',
        tier: 'epic',
        tierName: 'Epic',
        tierColor: '#9b59b6',
        metalColor: 0x8e44ad,
        gripColor: 0x2c2c54,
        starColor: 0xe056fd,
        emissive: 0x2b0938
    },
    knife_legendary: {
        id: 'knife_legendary',
        name: 'Draakoni Tulekatana',
        type: 'knife',
        tier: 'legendary',
        tierName: 'Legendary',
        tierColor: '#ffa502',
        bladeColor: 0xff4757,
        handleColor: 0xffa502,
        emissive: 0xff3838
    },
    gun_legendary: {
        id: 'gun_legendary',
        name: 'Kuldne Šerifi Revolver',
        type: 'gun',
        tier: 'legendary',
        tierName: 'Legendary',
        tierColor: '#ffa502',
        metalColor: 0xffd700,
        gripColor: 0xffffff,
        starColor: 0xffea00,
        emissive: 0x554400
    },
    knife_cosmic: {
        id: 'knife_cosmic',
        name: 'Galaktika Tühjuse Tera',
        type: 'knife',
        tier: 'cosmic',
        tierName: 'Cosmic',
        tierColor: '#ff4757',
        bladeColor: 0x371b58,
        handleColor: 0x4c3575,
        emissive: 0x9b59b6
    },
    gun_cosmic: {
        id: 'gun_cosmic',
        name: 'Kosmiline Pulsar',
        type: 'gun',
        tier: 'cosmic',
        tierName: 'Cosmic',
        tierColor: '#ff4757',
        metalColor: 0x1f0036,
        gripColor: 0xdfbbf7,
        starColor: 0xff007f,
        emissive: 0x550055
    },
    knife_secret: {
        id: 'knife_secret',
        name: 'Spektraalne Vari',
        type: 'knife',
        tier: 'secret',
        tierName: 'Secret',
        tierColor: '#00d2d3',
        bladeColor: 0x01a3a4,
        handleColor: 0x10ac84,
        emissive: 0x00f2fe
    },
    gun_secret: {
        id: 'gun_secret',
        name: 'Vaimu Fantoom',
        type: 'gun',
        tier: 'secret',
        tierName: 'Secret',
        tierColor: '#00d2d3',
        metalColor: 0x0abde3,
        gripColor: 0x222f3e,
        starColor: 0x00d2d3,
        emissive: 0x005577
    },
    knife_og: {
        id: 'knife_og',
        name: '8-Bit Pixel Mõõk',
        type: 'knife',
        tier: 'og',
        tierName: 'OG',
        tierColor: '#ffd32a',
        bladeColor: 0xfffa65,
        handleColor: 0xff9f1a,
        emissive: 0xffd32a
    },
    gun_og: {
        id: 'gun_og',
        name: 'Klassikaline Retro Blaster',
        type: 'gun',
        tier: 'og',
        tierName: 'OG',
        tierColor: '#ffd32a',
        metalColor: 0xff3838,
        gripColor: 0xff9f43,
        starColor: 0xfffa65,
        emissive: 0x664400
    }
};

export function getCrateArtworkSvg(tier: CrateTier): string {
    switch (tier) {
        case 'common':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="crate-c-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#95a5a6"/>
                        <stop offset="50%" stop-color="#7f8c8d"/>
                        <stop offset="100%" stop-color="#535c68"/>
                    </linearGradient>
                    <linearGradient id="metal-brace" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#bdc3c7"/>
                        <stop offset="100%" stop-color="#2c3e50"/>
                    </linearGradient>
                </defs>
                <rect x="12" y="18" width="76" height="52" rx="6" fill="url(#crate-c-grad)" stroke="#34495e" stroke-width="3"/>
                <rect x="18" y="24" width="64" height="40" rx="3" fill="#636e72" stroke="#2d3436" stroke-width="1.5"/>
                <line x1="18" y1="24" x2="82" y2="64" stroke="url(#metal-brace)" stroke-width="4"/>
                <line x1="82" y1="24" x2="18" y2="64" stroke="url(#metal-brace)" stroke-width="4"/>
                <rect x="10" y="14" width="80" height="10" rx="3" fill="#7f8c8d" stroke="#2c3e50" stroke-width="2"/>
                <circle cx="22" cy="28" r="2" fill="#d2d7d9"/>
                <circle cx="78" cy="28" r="2" fill="#d2d7d9"/>
                <circle cx="22" cy="60" r="2" fill="#d2d7d9"/>
                <circle cx="78" cy="60" r="2" fill="#d2d7d9"/>
                <rect x="44" y="38" width="12" height="14" rx="2" fill="#f1c40f" stroke="#b7950b" stroke-width="1.5"/>
                <path d="M47 38 V32 A3 3 0 0 1 53 32 V38" fill="none" stroke="#d5dbdb" stroke-width="2"/>
                <circle cx="50" cy="44" r="1.5" fill="#333"/>
            </svg>`;

        case 'uncommon':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="crate-uc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#2ecc71"/>
                        <stop offset="60%" stop-color="#27ae60"/>
                        <stop offset="100%" stop-color="#145a32"/>
                    </linearGradient>
                </defs>
                <rect x="12" y="16" width="76" height="54" rx="6" fill="url(#crate-uc-grad)" stroke="#196f3d" stroke-width="3"/>
                <rect x="10" y="12" width="80" height="12" rx="3" fill="#229954" stroke="#145a32" stroke-width="2"/>
                <polygon points="40,32 50,44 60,32 56,32 50,39 44,32" fill="#2ed573"/>
                <polygon points="40,44 50,56 60,44 56,44 50,51 44,44" fill="#2ed573"/>
                <rect x="14" y="24" width="8" height="40" rx="2" fill="#1e272c" stroke="#111" stroke-width="1.5"/>
                <rect x="78" y="24" width="8" height="40" rx="2" fill="#1e272c" stroke="#111" stroke-width="1.5"/>
                <line x1="42" y1="62" x2="58" y2="62" stroke="#111" stroke-width="3" stroke-linecap="round"/>
            </svg>`;

        case 'rare':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="crate-r-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#0984e3"/>
                        <stop offset="50%" stop-color="#0056b3"/>
                        <stop offset="100%" stop-color="#002d62"/>
                    </linearGradient>
                    <filter id="rare-crate-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                    </filter>
                </defs>
                <rect x="12" y="16" width="76" height="54" rx="8" fill="url(#crate-r-grad)" stroke="#00d2d3" stroke-width="2.5"/>
                <rect x="10" y="12" width="80" height="12" rx="4" fill="#0c2461" stroke="#00cec9" stroke-width="2"/>
                <path d="M22 34 H36 L44 42 H56 L64 34 H78" fill="none" stroke="#00f2fe" stroke-width="2" filter="url(#rare-crate-glow)"/>
                <path d="M22 56 H36 L44 48 H56 L64 56 H78" fill="none" stroke="#00f2fe" stroke-width="2" filter="url(#rare-crate-glow)"/>
                <circle cx="50" cy="45" r="10" fill="#04122c" stroke="#00d2d3" stroke-width="2"/>
                <circle cx="50" cy="45" r="6" fill="#00f2fe" filter="url(#rare-crate-glow)"/>
                <circle cx="50" cy="45" r="3" fill="#ffffff"/>
            </svg>`;

        case 'epic':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="crate-ep-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#9b59b6"/>
                        <stop offset="50%" stop-color="#6c5ce7"/>
                        <stop offset="100%" stop-color="#341f97"/>
                    </linearGradient>
                    <filter id="epic-crate-glow">
                        <feGaussianBlur stdDeviation="2.5" result="blur"/>
                        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                    </filter>
                </defs>
                <path d="M12 24 Q50 14 88 24 L84 68 Q50 72 16 68 Z" fill="url(#crate-ep-grad)" stroke="#fdcb6e" stroke-width="2.5"/>
                <path d="M10 20 Q50 10 90 20 L88 30 Q50 20 12 30 Z" fill="#4834d4" stroke="#fdcb6e" stroke-width="2"/>
                <path d="M24 38 L32 46 L24 54 M76 38 L68 46 L76 54" stroke="#e056fd" stroke-width="2" stroke-linecap="round" fill="none" filter="url(#epic-crate-glow)"/>
                <polygon points="50,34 59,45 50,56 41,45" fill="#e056fd" stroke="#fff" stroke-width="1.5" filter="url(#epic-crate-glow)"/>
                <polygon points="50,38 55,45 50,52 45,45" fill="#f8a5c2"/>
                <circle cx="50" cy="45" r="2" fill="#fff"/>
            </svg>`;

        case 'legendary':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="crate-leg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#f6b93b"/>
                        <stop offset="35%" stop-color="#e58e26"/>
                        <stop offset="70%" stop-color="#ffd32a"/>
                        <stop offset="100%" stop-color="#b71540"/>
                    </linearGradient>
                    <filter id="leg-crate-glow">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                    </filter>
                </defs>
                <rect x="12" y="18" width="76" height="52" rx="8" fill="url(#crate-leg-grad)" stroke="#ffd700" stroke-width="3"/>
                <rect x="10" y="14" width="80" height="12" rx="4" fill="#fad390" stroke="#f6b93b" stroke-width="2"/>
                <rect x="24" y="14" width="8" height="56" rx="2" fill="#ffd700" stroke="#b7791f" stroke-width="1.5"/>
                <rect x="68" y="14" width="8" height="56" rx="2" fill="#ffd700" stroke="#b7791f" stroke-width="1.5"/>
                <polygon points="42,36 45,30 50,33 55,30 58,36 50,38" fill="#ffd700" stroke="#b7791f" stroke-width="1"/>
                <polygon points="50,38 58,47 50,56 42,47" fill="#e74c3c" stroke="#ffd700" stroke-width="2" filter="url(#leg-crate-glow)"/>
                <polygon points="50,42 55,47 50,52 45,47" fill="#ff7675"/>
                <circle cx="50" cy="47" r="2.5" fill="#fff"/>
            </svg>`;

        case 'cosmic':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <radialGradient id="crate-cosmic-pod" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stop-color="#ff4757"/>
                        <stop offset="40%" stop-color="#6c5ce7"/>
                        <stop offset="85%" stop-color="#1e0c3b"/>
                        <stop offset="100%" stop-color="#090117"/>
                    </radialGradient>
                    <filter id="cosmic-crate-glow">
                        <feGaussianBlur stdDeviation="3.5" result="blur"/>
                        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                    </filter>
                </defs>
                <rect x="12" y="16" width="76" height="54" rx="14" fill="url(#crate-cosmic-pod)" stroke="#ff4757" stroke-width="2.5"/>
                <ellipse cx="50" cy="43" rx="42" ry="14" fill="none" stroke="#ff4757" stroke-width="2.5" transform="rotate(-15 50 43)" stroke-dasharray="8 4" filter="url(#cosmic-crate-glow)"/>
                <circle cx="28" cy="30" r="1.5" fill="#fff"/>
                <circle cx="70" cy="28" r="1.2" fill="#ffeaa7"/>
                <circle cx="32" cy="58" r="1.2" fill="#ffeaa7"/>
                <circle cx="72" cy="56" r="1.5" fill="#fff"/>
                <circle cx="50" cy="43" r="11" fill="#000" stroke="#a29bfe" stroke-width="2"/>
                <circle cx="50" cy="43" r="6" fill="#ff4757" filter="url(#cosmic-crate-glow)"/>
                <circle cx="50" cy="43" r="2" fill="#fff"/>
            </svg>`;

        case 'secret':
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="crate-sec-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#0a192f"/>
                        <stop offset="50%" stop-color="#071220"/>
                        <stop offset="100%" stop-color="#02070d"/>
                    </linearGradient>
                    <filter id="secret-crate-glow">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                    </filter>
                </defs>
                <rect x="14" y="16" width="72" height="54" rx="4" fill="url(#crate-sec-grad)" stroke="#00d2d3" stroke-width="2.5"/>
                <line x1="14" y1="32" x2="86" y2="32" stroke="#00d2d3" stroke-width="1" opacity="0.4"/>
                <line x1="14" y1="52" x2="86" y2="52" stroke="#00d2d3" stroke-width="1" opacity="0.4"/>
                <line x1="34" y1="16" x2="34" y2="70" stroke="#00d2d3" stroke-width="1" opacity="0.4"/>
                <line x1="66" y1="16" x2="66" y2="70" stroke="#00d2d3" stroke-width="1" opacity="0.4"/>
                <path d="M30 43 Q50 25 70 43 Q50 61 30 43 Z" fill="none" stroke="#00d2d3" stroke-width="2.5" filter="url(#secret-crate-glow)"/>
                <circle cx="50" cy="43" r="7" fill="#00d2d3" filter="url(#secret-crate-glow)"/>
                <circle cx="50" cy="43" r="3.5" fill="#02070d"/>
                <circle cx="51.5" cy="41.5" r="1.2" fill="#ffffff"/>
            </svg>`;

        case 'og':
        default:
            return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="crate-og-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#fffa65"/>
                        <stop offset="40%" stop-color="#ffd32a"/>
                        <stop offset="100%" stop-color="#ff9f1a"/>
                    </linearGradient>
                </defs>
                <rect x="12" y="16" width="76" height="54" fill="url(#crate-og-grad)" stroke="#222" stroke-width="4"/>
                <rect x="16" y="20" width="68" height="46" fill="none" stroke="#fff" stroke-width="2"/>
                <rect x="12" y="16" width="8" height="8" fill="#ff3838"/>
                <rect x="80" y="16" width="8" height="8" fill="#ff3838"/>
                <rect x="12" y="62" width="8" height="8" fill="#ff3838"/>
                <rect x="80" y="62" width="8" height="8" fill="#ff3838"/>
                <rect x="47" y="32" width="6" height="22" fill="#222"/>
                <rect x="39" y="40" width="22" height="6" fill="#222"/>
                <rect x="42" y="35" width="16" height="16" fill="#ff3838"/>
                <rect x="46" y="39" width="8" height="8" fill="#ffffff"/>
                <line x1="16" y1="28" x2="84" y2="28" stroke="rgba(0,0,0,0.18)" stroke-width="2"/>
                <line x1="16" y1="48" x2="84" y2="48" stroke="rgba(0,0,0,0.18)" stroke-width="2"/>
            </svg>`;
    }
}

export function getWeaponArtworkSvg(skin: WeaponSkinDef): string {
    if (skin.type === 'knife') {
        switch (skin.id) {
            case 'knife_default':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 62 L42 42 L52 46 L30 66 Z" fill="#181a1d" stroke="#333" stroke-width="1.5"/>
                    <rect x="42" y="38" width="5" height="16" rx="2" fill="#d4af37" transform="rotate(-45 44 46)"/>
                    <path d="M46 42 L78 20 Q86 16 92 18 C86 28 80 34 50 48 Z" fill="#e8ecf2" stroke="#718093" stroke-width="1.5"/>
                    <line x1="50" y1="41" x2="74" y2="25" stroke="#fff" stroke-width="1.5"/>
                </svg>`;
            case 'knife_common':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 64 L38 44 L46 48 L26 68 Z" fill="#2f3542" stroke="#1e272e" stroke-width="2"/>
                    <circle cx="28" cy="54" r="1.5" fill="#a4b0be"/>
                    <rect x="38" y="40" width="4" height="14" fill="#747d8c" transform="rotate(-45 40 47)"/>
                    <path d="M42 44 L74 24 L82 24 L90 28 C80 36 72 44 48 50 Z" fill="#8395a7" stroke="#57606f" stroke-width="1.5"/>
                    <polygon points="56,33 58,35 60,31 62,33 64,29" fill="#57606f"/>
                </svg>`;
            case 'knife_uncommon':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 64 L38 44 L48 48 L26 68 Z" fill="#1e3725" stroke="#0e1f13" stroke-width="2"/>
                    <rect x="38" y="40" width="5" height="14" fill="#2ed573" transform="rotate(-45 40 47)"/>
                    <path d="M44 44 L78 22 Q88 18 92 20 C82 32 74 42 48 50 Z" fill="#2ed573" stroke="#1e3725" stroke-width="1.5"/>
                    <path d="M52 40 Q58 35 62 40 Q58 44 52 40 Z" fill="#1e3725"/>
                    <path d="M68 28 Q74 24 78 30 Q72 34 68 28 Z" fill="#145a32"/>
                </svg>`;
            case 'knife_rare':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="rare-b-glow"><feGaussianBlur stdDeviation="2.5"/><feComposite in="SourceGraphic" operator="over"/></filter>
                    </defs>
                    <circle cx="20" cy="62" r="8" fill="none" stroke="#d63031" stroke-width="3.5"/>
                    <path d="M25 58 L45 46 L50 52 L29 64 Z" fill="#1e272e" stroke="#2d3436" stroke-width="2"/>
                    <path d="M46 48 Q70 42 86 28 C74 44 62 62 44 54 Z" fill="#d63031" stroke="#ff7675" stroke-width="1.5" filter="url(#rare-b-glow)"/>
                    <line x1="52" y1="47" x2="62" y2="40" stroke="#ff7675" stroke-width="1"/>
                    <line x1="60" y1="46" x2="70" y2="36" stroke="#ff7675" stroke-width="1"/>
                </svg>`;
            case 'knife_epic':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="epic-b-glow"><feGaussianBlur stdDeviation="3"/><feComposite in="SourceGraphic" operator="over"/></filter>
                    </defs>
                    <path d="M16 66 L36 46 L42 50 L22 70 Z" fill="#6c5ce7" stroke="#341f97" stroke-width="2"/>
                    <rect x="36" y="42" width="6" height="14" fill="#a29bfe" transform="rotate(-45 39 49)"/>
                    <path d="M42 46 L82 16 Q88 12 94 14 C84 26 74 38 46 52 Z" fill="#00cec9" stroke="#00f2fe" stroke-width="2" filter="url(#epic-b-glow)"/>
                    <line x1="44" y1="45" x2="88" y2="16" stroke="#ffffff" stroke-width="1.5"/>
                </svg>`;
            case 'knife_legendary':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="leg-b-glow"><feGaussianBlur stdDeviation="3.5"/><feComposite in="SourceGraphic" operator="over"/></filter>
                    </defs>
                    <path d="M14 68 L34 48 L40 52 L20 72 Z" fill="#ffa502" stroke="#cc8e35" stroke-width="2"/>
                    <circle cx="38" cy="48" r="6" fill="#ffd700" stroke="#b7791f" stroke-width="1.5"/>
                    <path d="M40 46 Q64 28 88 12 C82 26 70 42 44 52 Z" fill="#ff4757" stroke="#ffd32a" stroke-width="2" filter="url(#leg-b-glow)"/>
                    <path d="M50 38 Q60 30 72 20 Q64 30 54 38 Z" fill="#ffd32a" filter="url(#leg-b-glow)"/>
                    <line x1="42" y1="45" x2="84" y2="14" stroke="#ffffff" stroke-width="1.5"/>
                </svg>`;
            case 'knife_cosmic':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="cosmic-b-glow"><feGaussianBlur stdDeviation="4"/><feComposite in="SourceGraphic" operator="over"/></filter>
                    </defs>
                    <path d="M16 66 L36 46 L42 50 L22 70 Z" fill="#4c3575" stroke="#241442" stroke-width="2"/>
                    <path d="M40 48 Q65 30 84 14 Q92 20 86 32 C72 50 56 56 42 52 Z" fill="#371b58" stroke="#ff4757" stroke-width="2.5" filter="url(#cosmic-b-glow)"/>
                    <circle cx="62" cy="34" r="1.5" fill="#ffffff"/>
                    <circle cx="74" cy="24" r="1.2" fill="#ffeaa7"/>
                    <line x1="44" y1="46" x2="80" y2="20" stroke="#e056fd" stroke-width="2" filter="url(#cosmic-b-glow)"/>
                </svg>`;
            case 'knife_secret':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="secret-b-glow"><feGaussianBlur stdDeviation="3.5"/><feComposite in="SourceGraphic" operator="over"/></filter>
                    </defs>
                    <path d="M18 64 L36 46 L42 50 L24 68 Z" fill="#10ac84" stroke="#053e2e" stroke-width="2"/>
                    <path d="M40 46 L76 16 Q86 10 92 14 C82 28 72 40 44 52 Z" fill="#01a3a4" stroke="#00d2d3" stroke-width="2" opacity="0.9" filter="url(#secret-b-glow)"/>
                    <path d="M46 44 L80 18" stroke="#ffffff" stroke-width="2" opacity="0.8"/>
                    <circle cx="56" cy="36" r="2" fill="#00f2fe" filter="url(#secret-b-glow)"/>
                </svg>`;
            case 'knife_og':
            default:
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <rect x="20" y="60" width="8" height="8" fill="#ff9f1a"/>
                    <rect x="26" y="54" width="8" height="8" fill="#ff9f1a"/>
                    <rect x="24" y="44" width="8" height="8" fill="#222"/>
                    <rect x="30" y="50" width="8" height="8" fill="#222"/>
                    <rect x="36" y="56" width="8" height="8" fill="#222"/>
                    <rect x="38" y="40" width="10" height="10" fill="#ffd32a" stroke="#222" stroke-width="2"/>
                    <rect x="46" y="32" width="10" height="10" fill="#ffd32a" stroke="#222" stroke-width="2"/>
                    <rect x="54" y="24" width="10" height="10" fill="#ffd32a" stroke="#222" stroke-width="2"/>
                    <rect x="62" y="16" width="10" height="10" fill="#ffd32a" stroke="#222" stroke-width="2"/>
                    <polygon points="70,16 78,16 78,24" fill="#fff" stroke="#222" stroke-width="2"/>
                </svg>`;
        }
    } else {
        // Revolver / Gun Skins
        switch (skin.id) {
            case 'gun_default':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#4a2c17" stroke="#2b180a" stroke-width="2"/>
                    <rect x="28" y="36" width="22" height="18" rx="2" fill="#34495e" stroke="#2c3e50" stroke-width="2"/>
                    <rect x="42" y="32" width="16" height="18" rx="3" fill="#2c3e50" stroke="#1a252f" stroke-width="2"/>
                    <circle cx="48" cy="38" r="1.8" fill="#111"/>
                    <circle cx="48" cy="44" r="1.8" fill="#111"/>
                    <rect x="58" y="34" width="34" height="8" rx="2" fill="#34495e" stroke="#2c3e50" stroke-width="2"/>
                    <polygon points="90,34 94,34 92,31" fill="#2c3e50"/>
                    <path d="M38 54 Q44 60 48 54" fill="none" stroke="#2c3e50" stroke-width="2"/>
                </svg>`;
            case 'gun_common':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#3d3025" stroke="#1f1812" stroke-width="2"/>
                    <rect x="28" y="36" width="22" height="18" rx="2" fill="#574b40" stroke="#3d342c" stroke-width="2"/>
                    <rect x="42" y="32" width="16" height="18" rx="3" fill="#846d5a" stroke="#3d342c" stroke-width="2"/>
                    <rect x="58" y="34" width="32" height="8" rx="2" fill="#574b40" stroke="#3d342c" stroke-width="2"/>
                    <circle cx="34" cy="42" r="2" fill="#b8860b"/>
                </svg>`;
            case 'gun_uncommon':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#2ed573" stroke="#145a32" stroke-width="2"/>
                    <rect x="28" y="36" width="22" height="18" rx="2" fill="#dfe4ea" stroke="#a4b0be" stroke-width="2"/>
                    <rect x="42" y="32" width="16" height="18" rx="3" fill="#ced6e0" stroke="#747d8c" stroke-width="2"/>
                    <rect x="58" y="34" width="34" height="8" rx="2" fill="#dfe4ea" stroke="#a4b0be" stroke-width="2"/>
                    <line x1="62" y1="32" x2="88" y2="32" stroke="#747d8c" stroke-width="2"/>
                </svg>`;
            case 'gun_rare':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="rare-g-glow"><feGaussianBlur stdDeviation="2"/><feComposite in="SourceGraphic" operator="over"/></filter>
                    </defs>
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#2c3e50" stroke="#1e272e" stroke-width="2"/>
                    <rect x="28" y="36" width="22" height="18" rx="2" fill="#0984e3" stroke="#06528d" stroke-width="2"/>
                    <rect x="42" y="32" width="16" height="18" rx="3" fill="#74b9ff" stroke="#0984e3" stroke-width="2"/>
                    <rect x="58" y="34" width="34" height="8" rx="2" fill="#0984e3" stroke="#06528d" stroke-width="2"/>
                    <rect x="64" y="44" width="14" height="4" fill="#00cec9" filter="url(#rare-g-glow)"/>
                </svg>`;
            case 'gun_epic':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="epic-g-glow"><feGaussianBlur stdDeviation="2.5"/><feComposite in="SourceGraphic" operator="over"/></filter>
                    </defs>
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#2c2c54" stroke="#131326" stroke-width="2"/>
                    <rect x="28" y="36" width="22" height="18" rx="2" fill="#8e44ad" stroke="#5b2c6f" stroke-width="2"/>
                    <rect x="42" y="32" width="16" height="18" rx="3" fill="#be2edd" stroke="#8e44ad" stroke-width="2"/>
                    <rect x="58" y="34" width="34" height="8" rx="2" fill="#8e44ad" stroke="#5b2c6f" stroke-width="2"/>
                    <path d="M60 36 Q68 40 76 36 Q84 40 92 36" fill="none" stroke="#e056fd" stroke-width="1.5" filter="url(#epic-g-glow)"/>
                </svg>`;
            case 'gun_legendary':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="leg-g-glow"><feGaussianBlur stdDeviation="3"/><feComposite in="SourceGraphic" operator="over"/></filter>
                    </defs>
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#ffffff" stroke="#dcdde1" stroke-width="2"/>
                    <polygon points="28,56 30,52 32,56 27,53 33,53" fill="#ffd700"/>
                    <rect x="28" y="36" width="22" height="18" rx="2" fill="#ffd700" stroke="#b7791f" stroke-width="2" filter="url(#leg-g-glow)"/>
                    <rect x="42" y="32" width="16" height="18" rx="3" fill="#fffa65" stroke="#d4af37" stroke-width="2"/>
                    <rect x="58" y="34" width="34" height="8" rx="2" fill="#ffd700" stroke="#b7791f" stroke-width="2" filter="url(#leg-g-glow)"/>
                    <polygon points="90,34 94,34 92,31" fill="#ffd700"/>
                </svg>`;
            case 'gun_cosmic':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="cosmic-g-glow"><feGaussianBlur stdDeviation="3.5"/><feComposite in="SourceGraphic" operator="over"/></filter>
                    </defs>
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#dfbbf7" stroke="#371b58" stroke-width="2"/>
                    <rect x="28" y="36" width="24" height="18" rx="4" fill="#1f0036" stroke="#ff4757" stroke-width="2"/>
                    <circle cx="48" cy="42" r="8" fill="#ff007f" filter="url(#cosmic-g-glow)"/>
                    <rect x="54" y="35" width="36" height="8" rx="3" fill="#371b58" stroke="#ff007f" stroke-width="2"/>
                    <line x1="60" y1="33" x2="60" y2="45" stroke="#ff4757" stroke-width="2.5"/>
                    <line x1="68" y1="33" x2="68" y2="45" stroke="#ff4757" stroke-width="2.5"/>
                    <line x1="76" y1="33" x2="76" y2="45" stroke="#ff4757" stroke-width="2.5"/>
                </svg>`;
            case 'gun_secret':
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <filter id="secret-g-glow"><feGaussianBlur stdDeviation="3"/><feComposite in="SourceGraphic" operator="over"/></filter>
                    </defs>
                    <path d="M22 46 Q18 64 26 70 Q34 70 34 56 Z" fill="#222f3e" stroke="#0abde3" stroke-width="2"/>
                    <rect x="28" y="36" width="22" height="18" rx="2" fill="#0abde3" stroke="#00d2d3" stroke-width="2" filter="url(#secret-g-glow)"/>
                    <circle cx="48" cy="42" r="5" fill="#00f2fe" filter="url(#secret-g-glow)"/>
                    <rect x="56" y="35" width="34" height="8" rx="2" fill="#0abde3" stroke="#00d2d3" stroke-width="2"/>
                </svg>`;
            case 'gun_og':
            default:
                return `<svg viewBox="0 0 100 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <rect x="22" y="48" width="8" height="16" fill="#ff9f43" stroke="#222" stroke-width="2"/>
                    <rect x="30" y="38" width="18" height="16" fill="#ff3838" stroke="#222" stroke-width="2"/>
                    <rect x="44" y="36" width="10" height="12" fill="#ffd32a" stroke="#222" stroke-width="2"/>
                    <rect x="54" y="38" width="30" height="8" fill="#ff3838" stroke="#222" stroke-width="2"/>
                    <rect x="84" y="36" width="6" height="12" fill="#ffd32a" stroke="#222" stroke-width="2"/>
                </svg>`;
        }
    }
}

export interface CrateStockData {
    stock: number;
    nextRestock: number; // timestamp ms
}

export interface InventoryData {
    crates: Record<string, number>;
    skins: string[];
    equippedKnife: string;
    equippedGun: string;
}

export class MmpCrateManager {
    private moneyKey = 'mmp1_money';
    private stocksKey = 'mmp1_crate_stocks_v2';
    private inventoryKey = 'mmp1_inventory_v2';

    constructor() {
        this.getStocks();
        this.initMoney();
    }

    public getMoney(): number {
        const stored = localStorage.getItem(this.moneyKey);
        if (stored === null || isNaN(Number(stored))) {
            localStorage.setItem(this.moneyKey, '100');
            return 100;
        }
        return Math.max(0, parseInt(stored, 10));
    }

    public setMoney(amount: number) {
        localStorage.setItem(this.moneyKey, Math.max(0, Math.floor(amount)).toString());
        this.updateMoneyUI();
    }

    public addMoney(amount: number) {
        this.setMoney(this.getMoney() + amount);
    }

    public spendMoney(amount: number): boolean {
        const current = this.getMoney();
        if (current >= amount) {
            this.setMoney(current - amount);
            return true;
        }
        return false;
    }

    public updateMoneyUI() {
        const money = this.getMoney();
        const hudMoney = document.getElementById('hud-money-val');
        if (hudMoney) hudMoney.textContent = money.toString();
        const shopMoney = document.getElementById('shop-modal-money-val');
        if (shopMoney) shopMoney.textContent = money.toString();
    }

    public initMoney() {
        this.updateMoneyUI();
    }

    public getStocks(): Record<string, CrateStockData> {
        let data: Record<string, CrateStockData> = {};
        try {
            const raw = localStorage.getItem(this.stocksKey);
            if (raw) data = JSON.parse(raw);
        } catch (e) {}

        const now = Date.now();
        let changed = false;

        for (const [tier, crate] of Object.entries(CRATE_CATALOG)) {
            if (!data[tier] || typeof data[tier].stock !== 'number') {
                data[tier] = {
                    stock: crate.defaultStock,
                    nextRestock: now + crate.restockIntervalSec * 1000
                };
                changed = true;
            } else {
                // If restock time passed, restock 1 item up to maxStock
                while (now >= data[tier].nextRestock) {
                    if (data[tier].stock < crate.maxStock) {
                        data[tier].stock = Math.min(crate.maxStock, data[tier].stock + 1);
                    }
                    data[tier].nextRestock += crate.restockIntervalSec * 1000;
                    changed = true;
                }
            }
        }

        if (changed) {
            localStorage.setItem(this.stocksKey, JSON.stringify(data));
        }
        return data;
    }

    public saveStocks(data: Record<string, CrateStockData>) {
        localStorage.setItem(this.stocksKey, JSON.stringify(data));
    }

    public buyCrate(tier: CrateTier, isLobby: boolean = true): { success: boolean; message: string } {
        if (!isLobby) {
            return { success: false, message: 'Kaste saab osta ainult ooteruumis (lobis) enne mängu algust!' };
        }
        const crate = CRATE_CATALOG[tier];
        if (!crate) return { success: false, message: 'Tundmatu kast!' };

        const stocks = this.getStocks();
        if (!stocks[tier] || stocks[tier].stock <= 0) {
            return { success: false, message: 'See kast on hetkel laost otsas! Oota uut laovaru.' };
        }

        if (this.getMoney() < crate.price) {
            return { success: false, message: `Sul pole piisavalt raha! Vajad ${crate.price} €.` };
        }

        this.spendMoney(crate.price);
        stocks[tier].stock--;
        this.saveStocks(stocks);

        this.awardCrate(tier, 1);
        return { success: true, message: `Ostsid kasti: ${crate.name}!` };
    }

    public awardCrate(tier: CrateTier, count: number = 1) {
        const inv = this.getInventory();
        inv.crates[tier] = (inv.crates[tier] || 0) + count;
        this.saveInventory(inv);
    }

    public getInventory(): InventoryData {
        let inv: InventoryData = {
            crates: {},
            skins: ['knife_default', 'gun_default'],
            equippedKnife: 'knife_default',
            equippedGun: 'gun_default'
        };
        try {
            const raw = localStorage.getItem(this.inventoryKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                inv = { ...inv, ...parsed };
            }
        } catch (e) {}
        if (!inv.skins.includes('knife_default')) inv.skins.push('knife_default');
        if (!inv.skins.includes('gun_default')) inv.skins.push('gun_default');
        return inv;
    }

    public saveInventory(inv: InventoryData) {
        localStorage.setItem(this.inventoryKey, JSON.stringify(inv));
    }

    public openCrate(tier: CrateTier): WeaponSkinDef | null {
        const inv = this.getInventory();
        if (!inv.crates[tier] || inv.crates[tier] <= 0) return null;

        inv.crates[tier]--;
        const crate = CRATE_CATALOG[tier];
        // 50% knife skin, 50% gun skin
        const skinId = Math.random() < 0.5 ? crate.knifeSkinId : crate.gunSkinId;
        const skin = WEAPON_SKIN_CATALOG[skinId] || WEAPON_SKIN_CATALOG[crate.knifeSkinId];

        if (!inv.skins.includes(skin.id)) {
            inv.skins.push(skin.id);
        }
        this.saveInventory(inv);
        return skin;
    }

    public equipSkin(skinId: string): boolean {
        const skin = WEAPON_SKIN_CATALOG[skinId];
        if (!skin) return false;
        const inv = this.getInventory();
        if (!inv.skins.includes(skinId)) return false;

        if (skin.type === 'knife') {
            inv.equippedKnife = skinId;
        } else {
            inv.equippedGun = skinId;
        }
        this.saveInventory(inv);
        return true;
    }
}

// --- Main Game Class ---
export class MurderMysteryGame {
    private container: HTMLElement;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private clock: THREE.Clock;

    public state: GameState = 'lobby';
    private lobbyCountdown: number = 40;
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
    private joystickInput = { x: 0, y: 0 };

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
    private mapVoteOverlay: HTMLElement | null = null;
    private mapVoteTimerEl: HTMLElement | null = null;
    private mapVoteCountdown: number = 5;
    private playerVotedMap: MapId | null = null;
    private mapVotes: Record<MapId, number> = { hotel2: 0, milbase: 0, office: 0, vacation: 0, yatchy: 0 };
    public emotesWidget: InGameEmotesWidget | null = null;
    public crateManager: MmpCrateManager;

    constructor() {
        this.crateManager = new MmpCrateManager();
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
        this.emotesWidget = new InGameEmotesWidget({
            getAvatarRig: () => this.playerChar?.avatarRig,
            topOffset: 70,
            leftOffset: 16
        });
        this.spawnCoins();
        this.bindEvents();
        this.initCrateShop();
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
        this.mapVoteOverlay = document.getElementById('map-vote-overlay');
        this.mapVoteTimerEl = document.getElementById('map-vote-timer');

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

        // Center Hologram Decorative Floor Ring (Flush with floor so players and bots walk freely)
        const pedGeo = new THREE.CylinderGeometry(3.5, 3.8, 0.08, 32);
        const pedMat = new THREE.MeshStandardMaterial({ color: 0xff2e63, emissive: 0x330011, roughness: 0.2 });
        const pedestal = new THREE.Mesh(pedGeo, pedMat);
        pedestal.position.set(0, 0.04, 0);
        pedestal.receiveShadow = true;
        this.lobbyGroup.add(pedestal);

        // Floating Logo / Knife Icon above center platform
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

    // --- Create Ultra-Realistic Weapons with Unique Archetype Shapes ---
    private createUltraRealisticKnife(skinId?: string): THREE.Group {
        const group = new THREE.Group();
        const activeSkinId = skinId || this.crateManager?.getInventory()?.equippedKnife || 'knife_default';
        const skin = WEAPON_SKIN_CATALOG[activeSkinId] || WEAPON_SKIN_CATALOG['knife_default'];

        const bladeColor = skin.bladeColor ?? 0xe8ecf2;
        const handleColor = skin.handleColor ?? 0x181a1d;
        const emissiveColor = skin.emissive ?? 0x000000;

        const bladeMat = new THREE.MeshStandardMaterial({
            color: bladeColor,
            metalness: 0.96,
            roughness: 0.15,
            emissive: emissiveColor,
            emissiveIntensity: emissiveColor ? 0.75 : 0
        });
        const handleMat = new THREE.MeshStandardMaterial({
            color: handleColor,
            roughness: 0.65,
            metalness: 0.25,
            emissive: emissiveColor ? Math.floor(emissiveColor / 6) : 0
        });
        const metalAccMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.95, roughness: 0.2 });
        const goldAccMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.2 });

        if (activeSkinId === 'knife_rare') {
            // --- 1. KARAMBIT (Curved Talon Blade with Finger Ring) ---
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.024, 8, 24), metalAccMat);
            ring.position.set(0, -0.62, 0);
            ring.rotation.x = Math.PI / 2;
            group.add(ring);

            const grip1 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.35, 12), handleMat);
            grip1.position.set(0, -0.42, 0);
            group.add(grip1);

            const grip2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.32, 12), handleMat);
            grip2.position.set(0, -0.15, 0.04);
            grip2.rotation.x = -Math.PI / 12;
            group.add(grip2);

            for (let i = 0; i < 3; i++) {
                const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 6, 16), metalAccMat);
                ridge.position.set(0, -0.45 + i * 0.12, 0.02);
                ridge.rotation.x = Math.PI / 2;
                group.add(ridge);
            }

            const bladeBase = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.45, 0.18), bladeMat);
            bladeBase.position.set(0, 0.18, 0.08);
            bladeBase.rotation.x = -Math.PI / 8;
            group.add(bladeBase);

            const bladeMid = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.42, 0.15), bladeMat);
            bladeMid.position.set(0, 0.48, 0.22);
            bladeMid.rotation.x = -Math.PI / 4;
            group.add(bladeMid);

            const bladeCurvedTip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.35, 4), bladeMat);
            bladeCurvedTip.position.set(0, 0.68, 0.38);
            bladeCurvedTip.rotation.x = -Math.PI / 2.5;
            bladeCurvedTip.rotation.y = Math.PI / 4;
            group.add(bladeCurvedTip);

            const webSpine = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.35, 0.03), new THREE.MeshBasicMaterial({ color: 0xff4757 }));
            webSpine.position.set(0, 0.28, 0.02);
            group.add(webSpine);

        } else if (activeSkinId === 'knife_legendary') {
            // --- 2. DRAGON KATANA (Long curved Katana with Tsuba Guard) ---
            const tsuka = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.65, 12), handleMat);
            tsuka.position.set(0, -0.32, 0);
            group.add(tsuka);

            for (let i = 0; i < 4; i++) {
                const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.04, 0.065), goldAccMat);
                wrap.position.set(0, -0.48 + i * 0.11, 0);
                wrap.rotation.y = Math.PI / 4;
                group.add(wrap);
            }

            const kashira = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, 0.08, 12), goldAccMat);
            kashira.position.set(0, -0.66, 0);
            group.add(kashira);

            const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 20), goldAccMat);
            tsuba.position.set(0, 0.02, 0);
            group.add(tsuba);

            const habaki = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.1), goldAccMat);
            habaki.position.set(0, 0.06, 0.01);
            group.add(habaki);

            const katanaBlade = new THREE.Mesh(new THREE.BoxGeometry(0.028, 1.4, 0.11), bladeMat);
            katanaBlade.position.set(0, 0.76, 0.03);
            katanaBlade.rotation.x = -0.04;
            group.add(katanaBlade);

            const kissaki = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 4), bladeMat);
            kissaki.position.set(0, 1.5, 0.06);
            kissaki.rotation.x = -0.15;
            kissaki.rotation.y = Math.PI / 4;
            group.add(kissaki);

            const hamon = new THREE.Mesh(new THREE.BoxGeometry(0.032, 1.3, 0.02), new THREE.MeshBasicMaterial({ color: 0xffd32a }));
            hamon.position.set(0, 0.76, 0.08);
            group.add(hamon);

        } else if (activeSkinId === 'knife_cosmic') {
            // --- 3. VOID CRESCENT SCYTHE ---
            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 12), handleMat);
            shaft.position.set(0, -0.25, 0);
            group.add(shaft);

            for (let i = 0; i < 3; i++) {
                const band = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.012, 6, 14), metalAccMat);
                band.position.set(0, -0.5 + i * 0.25, 0);
                band.rotation.x = Math.PI / 2;
                group.add(band);
            }

            const orbMat = new THREE.MeshStandardMaterial({ color: 0xff007f, emissive: 0xff007f, emissiveIntensity: 0.8 });
            const orb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 14), orbMat);
            orb.position.set(0, 0.22, 0);
            group.add(orb);

            const scytheBase = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.4), bladeMat);
            scytheBase.position.set(0, 0.26, 0.24);
            scytheBase.rotation.x = Math.PI / 3;
            group.add(scytheBase);

            const scytheCurved = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.35, 0.22), bladeMat);
            scytheCurved.position.set(0, 0.16, 0.48);
            scytheCurved.rotation.x = Math.PI / 1.6;
            group.add(scytheCurved);

            const scytheTip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4, 4), bladeMat);
            scytheTip.position.set(0, -0.05, 0.65);
            scytheTip.rotation.x = Math.PI / 1.1;
            scytheTip.rotation.y = Math.PI / 4;
            group.add(scytheTip);

            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 6), orbMat);
            spike.position.set(0, 0.34, 0);
            group.add(spike);

        } else if (activeSkinId === 'knife_og') {
            // --- 4. 8-BIT PIXEL BROADSWORD ---
            const pixelMat = new THREE.MeshStandardMaterial({ color: bladeColor, roughness: 0.2, metalness: 0.1, emissive: emissiveColor });
            const pixelGoldMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, roughness: 0.3 });
            const pixelHandleMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });

            for (let i = 0; i < 4; i++) {
                const hBlock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), pixelHandleMat);
                hBlock.position.set(0, -0.55 + i * 0.08, 0);
                group.add(hBlock);
            }

            for (let i = -2; i <= 2; i++) {
                const gBlock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), pixelGoldMat);
                gBlock.position.set(i * 0.08, -0.22, 0);
                group.add(gBlock);
            }

            for (let y = 0; y < 6; y++) {
                const bBlock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.04), pixelMat);
                bBlock.position.set(0, -0.08 + y * 0.15, 0);
                group.add(bBlock);
            }
            const tipBlock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.04), pixelGoldMat);
            tipBlock.position.set(0, 0.88, 0);
            group.add(tipBlock);

        } else if (activeSkinId === 'knife_secret') {
            // --- 5. SPECTRAL SHADOW KRIS (Wavy Dagger) ---
            const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.55, 10), handleMat);
            hilt.position.set(0, -0.28, 0);
            group.add(hilt);

            const guardS = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.32), metalAccMat);
            guardS.position.set(0, 0.02, 0);
            group.add(guardS);

            for (let i = 0; i < 5; i++) {
                const wave = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.14), bladeMat);
                const offsetZ = (i % 2 === 0 ? 0.04 : -0.04);
                const rotX = (i % 2 === 0 ? 0.2 : -0.2);
                wave.position.set(0, 0.14 + i * 0.18, offsetZ);
                wave.rotation.x = rotX;
                group.add(wave);
            }

            const krisTip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 4), bladeMat);
            krisTip.position.set(0, 1.08, 0);
            krisTip.rotation.y = Math.PI / 4;
            group.add(krisTip);

            for (let i = 0; i < 3; i++) {
                const aura = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
                aura.position.set(0, 0.2 + i * 0.3, 0.08 * (i % 2 === 0 ? 1 : -1));
                group.add(aura);
            }

        } else {
            // --- 6. DEFAULT / COMMON / UNCOMMON / EPIC COMBAT BOWIE ---
            const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.65, 12), handleMat);
            handle.scale.set(0.65, 1.0, 1.2);
            handle.position.set(0, -0.32, 0);
            group.add(handle);

            const grooveMat = new THREE.MeshStandardMaterial({ color: 0x0f1012, roughness: 0.85 });
            for (let i = 0; i < 3; i++) {
                const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.015, 8, 16), grooveMat);
                ring.position.set(0, -0.18 - i * 0.12, 0);
                ring.rotation.x = Math.PI / 2;
                group.add(ring);
            }

            for (let i = 0; i < 3; i++) {
                const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 8), goldAccMat);
                pin.position.set(0, -0.18 - i * 0.12, 0);
                pin.rotation.z = Math.PI / 2;
                group.add(pin);
            }

            const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.12, 10), metalAccMat);
            pommel.position.set(0, -0.68, 0);
            group.add(pommel);

            const pommelTip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 8), metalAccMat);
            pommelTip.position.set(0, -0.76, 0);
            pommelTip.rotation.x = Math.PI;
            group.add(pommelTip);

            const guard = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.38), metalAccMat);
            guard.position.set(0, 0.06, 0);
            group.add(guard);

            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.92, 0.2), bladeMat);
            blade.position.set(0, 0.54, 0.02);
            group.add(blade);

            const edge = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.9, 4), bladeMat);
            edge.position.set(0, 0.54, 0.12);
            edge.scale.set(1.0, 1.0, 3.8);
            group.add(edge);

            const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 4), bladeMat);
            tip.position.set(0, 1.1, 0.02);
            tip.rotation.y = Math.PI / 4;
            group.add(tip);

            const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.03), metalAccMat);
            fuller.position.set(0, 0.52, 0);
            group.add(fuller);

            for (let i = 0; i < 4; i++) {
                const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.04, 3), bladeMat);
                tooth.position.set(0, 0.2 + i * 0.06, -0.09);
                tooth.rotation.z = Math.PI / 2;
                group.add(tooth);
            }
        }

        group.scale.set(1.15, 1.15, 1.15);
        return group;
    }

    private createUltraRealisticRevolver(isGolden = false, skinId?: string): THREE.Group {
        const group = new THREE.Group();
        const activeSkinId = skinId || this.crateManager?.getInventory()?.equippedGun || 'gun_default';
        const skin = WEAPON_SKIN_CATALOG[activeSkinId] || WEAPON_SKIN_CATALOG['gun_default'];

        const metalColor = isGolden ? 0xffd700 : (skin.metalColor ?? 0x24282e);
        const gripColor = isGolden ? 0x2b1810 : (skin.gripColor ?? 0x4a2c17);
        const starColor = isGolden ? 0xffea00 : (skin.starColor ?? 0xffd700);
        const emissiveColor = isGolden ? 0x443300 : (skin.emissive ?? 0x05080c);

        const metalMat = new THREE.MeshStandardMaterial({
            color: metalColor,
            metalness: isGolden ? 0.98 : 0.94,
            roughness: isGolden ? 0.14 : 0.22,
            emissive: emissiveColor,
            emissiveIntensity: (isGolden || emissiveColor !== 0x05080c) ? 0.6 : 0.05
        });

        const polishedSteel = new THREE.MeshStandardMaterial({
            color: isGolden ? 0xffea70 : 0xd8dde3,
            metalness: 0.98,
            roughness: 0.12
        });

        const gripWoodMat = new THREE.MeshStandardMaterial({
            color: gripColor,
            roughness: 0.45,
            metalness: 0.1
        });

        if (activeSkinId === 'gun_cosmic') {
            // --- 1. COSMIC PULSAR RAYGUN (Futuristic Raygun with Plasma Chamber & Rings) ---
            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.24), gripWoodMat);
            grip.position.set(0, -0.22, -0.1);
            grip.rotation.x = -Math.PI / 6;
            group.add(grip);

            const sciFrame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.46), metalMat);
            sciFrame.position.set(0, 0.12, 0.05);
            group.add(sciFrame);

            const plasmaCoreMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
            const plasmaCore = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), plasmaCoreMat);
            plasmaCore.position.set(0, 0.12, 0.05);
            group.add(plasmaCore);

            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.85, 16), metalMat);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 0.18, 0.65);
            group.add(barrel);

            const ringMat = new THREE.MeshStandardMaterial({ color: 0x9b59b6, emissive: 0x9b59b6, emissiveIntensity: 0.8 });
            for (let i = 0; i < 3; i++) {
                const accRing = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 16), ringMat);
                accRing.position.set(0, 0.18, 0.45 + i * 0.18);
                group.add(accRing);
            }

            const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.14, 14), metalMat);
            muzzle.rotation.x = Math.PI / 2;
            muzzle.position.set(0, 0.18, 1.08);
            group.add(muzzle);

            const muzzleGlow = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), plasmaCoreMat);
            muzzleGlow.position.set(0, 0.18, 1.15);
            group.add(muzzleGlow);

            const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 14, Math.PI), metalMat);
            triggerGuard.position.set(0, -0.05, 0.08);
            triggerGuard.rotation.y = Math.PI / 2;
            triggerGuard.rotation.x = Math.PI;
            group.add(triggerGuard);

            const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.03), polishedSteel);
            trigger.position.set(0, -0.04, 0.08);
            group.add(trigger);

        } else if (activeSkinId === 'gun_secret') {
            // --- 2. GHOST PHANTOM SUPPRESSED PISTOL (Stealth Pistol with Silencer & Reflex Sight) ---
            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.54, 0.22), gripWoodMat);
            grip.position.set(0, -0.22, -0.08);
            grip.rotation.x = -Math.PI / 8;
            group.add(grip);

            const frame = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.52), metalMat);
            frame.position.set(0, 0.06, 0.08);
            group.add(frame);

            const slide = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.18, 0.65), metalMat);
            slide.position.set(0, 0.22, 0.14);
            group.add(slide);

            const suppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.55, 16), metalMat);
            suppressor.rotation.x = Math.PI / 2;
            suppressor.position.set(0, 0.22, 0.72);
            group.add(suppressor);

            const suppressorCap = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.04, 16), polishedSteel);
            suppressorCap.rotation.x = Math.PI / 2;
            suppressorCap.position.set(0, 0.22, 1.0);
            group.add(suppressorCap);

            const sightHood = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.18), metalMat);
            sightHood.position.set(0, 0.36, 0.02);
            group.add(sightHood);

            const reticleDot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
            reticleDot.position.set(0, 0.36, 0.02);
            group.add(reticleDot);

            const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 14, Math.PI), metalMat);
            triggerGuard.position.set(0, -0.05, 0.12);
            triggerGuard.rotation.y = Math.PI / 2;
            triggerGuard.rotation.x = Math.PI;
            group.add(triggerGuard);

            const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.03), polishedSteel);
            trigger.position.set(0, -0.04, 0.12);
            group.add(trigger);

        } else if (activeSkinId === 'gun_og') {
            // --- 3. 8-BIT RETRO ARCADE BLASTER ---
            const pixelMat = new THREE.MeshStandardMaterial({ color: metalColor, roughness: 0.3, metalness: 0.1 });
            const pixelGoldMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, roughness: 0.2 });
            const pixelGripMat = new THREE.MeshStandardMaterial({ color: 0xff9f43, roughness: 0.4 });

            for (let i = 0; i < 4; i++) {
                const gBlock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), pixelGripMat);
                gBlock.position.set(0, -0.42 + i * 0.11, -0.15 + i * 0.04);
                group.add(gBlock);
            }

            for (let x = 0; x < 3; x++) {
                const bBlock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.14), pixelMat);
                bBlock.position.set(0, 0.1, -0.05 + x * 0.14);
                group.add(bBlock);
            }

            for (let b = 0; b < 3; b++) {
                const barBlock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.15), pixelMat);
                barBlock.position.set(0, 0.14, 0.42 + b * 0.15);
                group.add(barBlock);

                const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.04), pixelGoldMat);
                fin.position.set(0, 0.23, 0.42 + b * 0.15);
                group.add(fin);
            }

            const pMuzzle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.08), pixelGoldMat);
            pMuzzle.position.set(0, 0.14, 0.88);
            group.add(pMuzzle);

        } else {
            // --- 4. STANDARD, GOLDEN, DAMASCUS & HEAVY REVOLVERS ---
            const isLongBarrel = activeSkinId === 'gun_legendary';
            const hasLaser = activeSkinId === 'gun_rare';
            const barrelLen = isLongBarrel ? 1.05 : 0.75;
            const barrelZ = isLongBarrel ? 0.76 : 0.62;

            // Frame
            const frame = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 0.52), metalMat);
            frame.position.set(0, 0.1, 0.05);
            group.add(frame);

            // Top Strap
            const topStrap = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.62), metalMat);
            topStrap.position.set(0, 0.27, 0.1);
            group.add(topStrap);

            // Cylinder
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

            // Barrel
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, barrelLen, 14), metalMat);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 0.19, barrelZ);
            group.add(barrel);

            // Muzzle Bore
            const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 12), new THREE.MeshBasicMaterial({ color: 0x050505 }));
            bore.rotation.x = Math.PI / 2;
            bore.position.set(0, 0.19, barrelZ + barrelLen / 2 + 0.02);
            group.add(bore);

            // Lug
            const lug = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, barrelLen * 0.9), metalMat);
            lug.position.set(0, 0.09, barrelZ);
            group.add(lug);

            // Front Sight
            const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.12), polishedSteel);
            frontSight.position.set(0, 0.29, barrelZ + barrelLen / 2 - 0.05);
            group.add(frontSight);

            // Hammer
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

            // Grip
            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, 0.28), gripWoodMat);
            grip.position.set(0, -0.24, -0.12);
            grip.rotation.x = -Math.PI / 8;
            group.add(grip);

            if (hasLaser) {
                const laserBox = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.35), metalMat);
                laserBox.position.set(0, -0.02, 0.5);
                group.add(laserBox);

                const laserLens = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00cec9 }));
                laserLens.position.set(0, -0.02, 0.68);
                group.add(laserLens);
            }

            // Sheriff Star Badge
            const starMat = new THREE.MeshStandardMaterial({ color: starColor, metalness: 0.98, roughness: 0.15 });
            const starL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 5), starMat);
            starL.rotation.z = Math.PI / 2;
            starL.position.set(-0.08, -0.2, -0.1);
            group.add(starL);

            const starR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 5), starMat);
            starR.rotation.z = Math.PI / 2;
            starR.position.set(0.08, -0.2, -0.1);
            group.add(starR);
        }

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
        avatarRig?: AvatarRig;
    } {
        if (isPlayer) {
            const avatarRig = new AvatarRig(avatarService.getConfig());
            avatarRig.rootGroup.name = 'MMP1_Player_AvatarRig';

            // Attach ultra-realistic knife and gun to right arm bone / hand
            const knifeGroup = this.createUltraRealisticKnife();
            knifeGroup.position.set(0.08, -0.65, 0.22);
            knifeGroup.rotation.x = Math.PI / 3;
            knifeGroup.rotation.y = -Math.PI / 8;
            knifeGroup.visible = false;
            avatarRig.bones.rightArm.add(knifeGroup);

            const gunGroup = this.createUltraRealisticRevolver(false);
            gunGroup.position.set(0.06, -0.62, 0.26);
            gunGroup.rotation.x = 0;
            gunGroup.visible = false;
            avatarRig.bones.rightArm.add(gunGroup);

            // Add player name tag above head
            const canvas = document.createElement('canvas');
            canvas.width = 300;
            canvas.height = 75;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = 'rgba(30, 20, 10, 0.88)';
                ctx.beginPath();
                ctx.roundRect(8, 8, 284, 59, 14);
                ctx.fill();
                ctx.strokeStyle = '#ffd32a';
                ctx.lineWidth = 3;
                ctx.stroke();

                ctx.fillStyle = '#ffd32a';
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
            avatarRig.rootGroup.add(sprite);

            avatarService.subscribe(cfg => {
                avatarRig.applyConfig(cfg);
            });

            let bodyMesh: THREE.Mesh = new THREE.Mesh();
            let headMesh: THREE.Mesh = new THREE.Mesh();
            avatarRig.bones.torso.traverse(c => {
                if (!bodyMesh.geometry && (c as THREE.Mesh).isMesh) bodyMesh = c as THREE.Mesh;
            });
            avatarRig.bones.head.traverse(c => {
                if (!headMesh.geometry && (c as THREE.Mesh).isMesh) headMesh = c as THREE.Mesh;
            });

            return {
                group: avatarRig.rootGroup,
                knife: knifeGroup,
                gun: gunGroup,
                body: bodyMesh,
                head: headMesh,
                leftLeg: avatarRig.bones.leftLeg,
                rightLeg: avatarRig.bones.rightLeg,
                leftArm: avatarRig.bones.leftArm,
                rightArm: avatarRig.bones.rightArm,
                avatarRig
            };
        }

        const group = new THREE.Group();

        // 1. Natural Human Skin Tones (Uses customized AvatarConfig for player!)
        const avatarCfg = isPlayer ? avatarService.getConfig() : null;
        const skinPalette = [0xf5d0b5, 0xf0c8a6, 0xdfb190, 0xd49a6a, 0xb87333, 0x8d5524, 0xecd0b9, 0xc68652];
        const skinColor = (isPlayer && avatarCfg?.skinColor) ? avatarCfg.skinColor : skinPalette[Math.abs(colorHex) % skinPalette.length];
        const skinMat = new THREE.MeshStandardMaterial({
            color: skinColor,
            roughness: 0.55,
            metalness: 0.04
        });

        // 2. Stylish Tailored Suit / Detective Clothing Materials
        const jacketColor = (isPlayer && avatarCfg?.topId) 
            ? (getItemById(avatarCfg.topId)?.defaultColor || colorHex) 
            : colorHex;
        const jacketMat = new THREE.MeshStandardMaterial({
            color: jacketColor,
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
        const pantsColor = (isPlayer && avatarCfg?.pantsId)
            ? (getItemById(avatarCfg.pantsId)?.defaultColor || 0x22262a)
            : 0x22262a;
        const pantsMat = new THREE.MeshStandardMaterial({
            color: pantsColor,
            roughness: 0.7
        });
        const tieMat = new THREE.MeshStandardMaterial({
            color: isPlayer ? 0x990022 : (colorHex === 0xe74c3c ? 0x0f2042 : 0x8b0000),
            roughness: 0.35
        });
        const shoeColor = (isPlayer && avatarCfg?.shoesId)
            ? (getItemById(avatarCfg.shoesId)?.defaultColor || 0x141210)
            : 0x141210;
        const shoeMat = new THREE.MeshStandardMaterial({
            color: shoeColor,
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

        // 3D Equipped Face Accessory for Player (Ultra-Realistic Sunglasses, Visor, Mask, Monocle, Goggles, etc.)
        if (isPlayer && avatarCfg?.faceId) {
            const fId = avatarCfg.faceId;
            if (fId === 'face_cool_shades' || fId.includes('shades') || fId.includes('sunglasses') || fId.includes('retro_round') || fId.includes('matrix')) {
                // Ultra-Realistic Aviator Sunglasses on Player Head
                const frameMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.96, roughness: 0.12 });
                const lensMat = new THREE.MeshStandardMaterial({ color: 0x07111c, metalness: 0.35, roughness: 0.03, transparent: true, opacity: 0.84 });
                const browBar = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.44, 12), frameMat);
                browBar.rotation.z = Math.PI * 0.5;
                browBar.position.set(0, 3.24, 0.47);
                group.add(browBar);
                [-1, 1].forEach(side => {
                    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.01, 8, 24), frameMat);
                    rim.scale.set(1.08, 1.25, 0.5);
                    rim.position.set(side * 0.18, 3.16, 0.47);
                    group.add(rim);
                    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.01, 20), lensMat);
                    lens.rotation.x = Math.PI * 0.5;
                    lens.scale.set(1.06, 0.5, 1.22);
                    lens.position.set(side * 0.18, 3.16, 0.47);
                    group.add(lens);
                    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.5, 8), frameMat);
                    arm.rotation.x = Math.PI * 0.5;
                    arm.position.set(side * 0.32, 3.18, 0.22);
                    group.add(arm);
                });
            } else if (fId === 'face_cyborg_visor') {
                const visor = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.16), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
                visor.position.set(0, 3.16, 0.46);
                group.add(visor);
            } else if (fId === 'face_ninja_mask') {
                const mask = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.32, 0.22), new THREE.MeshStandardMaterial({ color: 0x111111 }));
                mask.position.set(0, 2.95, 0.42);
                group.add(mask);
            } else if (fId === 'face_gold_monocle') {
                const monocle = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 8, 16), new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95 }));
                monocle.position.set(0.18, 3.16, 0.46);
                group.add(monocle);
            } else if (fId === 'face_steampunk_goggles') {
                [-1, 1].forEach(side => {
                    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9 }));
                    cup.rotation.x = Math.PI * 0.5;
                    cup.position.set(side * 0.18, 3.16, 0.48);
                    group.add(cup);
                });
            }
        }

        // --- HAIR & CROWN & ACCESSORIES ---
        const hairPalette = [0x1a1a1a, 0x3d2719, 0x5c4033, 0x8b5a2b, 0x2a1e17];
        const hairColor = (isPlayer && avatarCfg?.hairColor) ? avatarCfg.hairColor : (isPlayer ? 0x221812 : hairPalette[Math.abs(colorHex) % hairPalette.length]);
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
            // Masterpiece 3D Royal Crown (or custom equipped hat)
            const hatId = avatarCfg?.hatId || 'hat_royal_crown';
            if (hatId === 'hat_royal_crown') {
                const crownGold = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.98, roughness: 0.12 });
                const crownBand = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.15, 24, 1, true), crownGold);
                crownBand.position.set(0, 3.56, 0);
                group.add(crownBand);

                const velvetCap = new THREE.Mesh(new THREE.SphereGeometry(0.44, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: 0x800020, roughness: 0.85 }));
                velvetCap.position.set(0, 3.55, 0);
                group.add(velvetCap);

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
            } else if (hatId === 'hat_viking_helm') {
                const helmMat = new THREE.MeshStandardMaterial({ color: 0x747d8c, roughness: 0.5 });
                const helm = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), helmMat);
                helm.position.set(0, 3.42, 0);
                group.add(helm);
                [-1, 1].forEach(side => {
                    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 8), new THREE.MeshStandardMaterial({ color: 0xefefef }));
                    horn.position.set(side * 0.44, 3.62, 0);
                    horn.rotation.z = -side * 0.6;
                    group.add(horn);
                });
            } else if (hatId === 'hat_cap_snapback') {
                const capMat = new THREE.MeshStandardMaterial({ color: 0x2ed573, roughness: 0.6 });
                const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.47, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), capMat);
                capDome.position.set(0, 3.42, 0);
                group.add(capDome);
                const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 16, 1, false, 0, Math.PI), capMat);
                brim.position.set(0, 3.42, 0.22);
                group.add(brim);
            }

            // Back Accessory for player (Wings, Katanas, Jetpack)
            if (avatarCfg?.backId) {
                const backId = avatarCfg.backId;
                if (backId.includes('wings')) {
                    const wingColor = backId.includes('golden') ? 0xffd700 : (backId.includes('demon') ? 0x9b59b6 : 0x00f2fe);
                    const wingMat = new THREE.MeshBasicMaterial({ color: wingColor });
                    [-1, 1].forEach(side => {
                        const wing = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.55, 0.04), wingMat);
                        wing.position.set(side * 0.8, 2.3, -0.42);
                        wing.rotation.z = side * 0.35;
                        group.add(wing);
                    });
                } else if (backId === 'back_ninja_katana') {
                    [-0.35, 0.35].forEach(rot => {
                        const scabbard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.08), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 }));
                        scabbard.rotation.z = rot;
                        scabbard.position.set(0, 2.3, -0.42);
                        group.add(scabbard);
                    });
                }
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
            rotation: Math.PI,
            knifeMesh: pModel.knife,
            gunMesh: pModel.gun,
            bodyMesh: pModel.body,
            headMesh: pModel.head,
            leftLeg: pModel.leftLeg,
            rightLeg: pModel.rightLeg,
            leftArm: pModel.leftArm,
            rightArm: pModel.rightArm,
            avatarRig: pModel.avatarRig,
            aiTimer: 0,
            coins: 0
        };
        this.playerChar.mesh.userData.character = this.playerChar;
        this.playerChar.mesh.traverse(c => { c.userData.character = this.playerChar; });
        this.playerChar.mesh.position.copy(this.playerChar.position);
        this.playerChar.mesh.rotation.y = this.playerChar.rotation;
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

    // --- Map Voting Phase (Starts when round countdown finishes or force start) ---
    public startMapVoting() {
        // If admin locked a specific map (not random), we can skip voting or pre-select it
        this.state = 'map_vote';
        this.mapVoteCountdown = 5;
        this.playerVotedMap = null;
        this.mapVotes = { hotel2: 0, milbase: 0, office: 0, vacation: 0, yatchy: 0 };

        // Hide lobby banner
        if (this.lobbyBanner) this.lobbyBanner.style.display = 'none';

        // Bots cast random votes
        const mapKeys: MapId[] = ['hotel2', 'milbase', 'office', 'vacation', 'yatchy'];
        const botCount = this.characters.filter(c => !c.isPlayer).length;
        for (let i = 0; i < botCount; i++) {
            const botPick = mapKeys[Math.floor(Math.random() * mapKeys.length)];
            this.mapVotes[botPick]++;
        }

        this.updateMapVoteUI();

        // Show Map Voting Overlay
        if (this.mapVoteOverlay) {
            this.mapVoteOverlay.style.display = 'flex';
        }
        audio.playVoteSound();
        this.addIncidentFeed(`🗺️ Kaardi hääletus algas! Vali kaart järgmiseks vooruks!`);
    }

    public castMapVote(mapId: MapId) {
        if (this.state !== 'map_vote') return;
        if (this.playerVotedMap) {
            this.mapVotes[this.playerVotedMap] = Math.max(0, this.mapVotes[this.playerVotedMap] - 1);
        }
        this.playerVotedMap = mapId;
        this.mapVotes[mapId]++;
        audio.playVoteSound();
        this.updateMapVoteUI();
        this.addIncidentFeed(`🗳️ Hääletasid kaardi poolt: ${MAP_CATALOG[mapId]?.name || mapId}`);
    }

    public updateMapVoteUI() {
        const mapKeys: MapId[] = ['hotel2', 'milbase', 'office', 'vacation', 'yatchy'];
        mapKeys.forEach(m => {
            const badge = document.getElementById(`badge-vote-${m}`);
            if (badge) badge.textContent = this.mapVotes[m].toString();
            const btn = document.querySelector(`.map-vote-btn[data-map="${m}"]`);
            if (btn) {
                if (this.playerVotedMap === m) {
                    btn.classList.add('selected-vote');
                } else {
                    btn.classList.remove('selected-vote');
                }
            }
        });
    }

    public finishMapVoting() {
        if (this.mapVoteOverlay) this.mapVoteOverlay.style.display = 'none';

        // Determine winning map:
        // If admin selected a specific map (not random), admin overrides; otherwise top voted map
        let winningMap: MapId = 'hotel2';
        if (this.adminSelectedMap && this.adminSelectedMap !== 'random') {
            winningMap = this.adminSelectedMap;
        } else {
            const mapKeys: MapId[] = ['hotel2', 'milbase', 'office', 'vacation', 'yatchy'];
            let maxVotes = -1;
            let candidates: MapId[] = [];
            mapKeys.forEach(m => {
                const v = this.mapVotes[m] || 0;
                if (v > maxVotes) {
                    maxVotes = v;
                    candidates = [m];
                } else if (v === maxVotes) {
                    candidates.push(m);
                }
            });
            winningMap = candidates[Math.floor(Math.random() * candidates.length)] || 'hotel2';
        }

        const mapConfig = MAP_CATALOG[winningMap];
        this.addIncidentFeed(`🏆 Kaardi valik lõppes! Valiti: ${mapConfig.icon} ${mapConfig.name}!`);

        this.startRound(winningMap);
    }

    // --- Start Round: Assign Roles & Teleport into Map ---
    public startRound(forcedMap?: MapId) {
        this.state = 'role_reveal';
        this.lastHero = null;
        this.hasSheriffWitnessedMurder = false;
        if (this.lobbyBanner) this.lobbyBanner.style.display = 'none';
        if (this.mapVoteOverlay) this.mapVoteOverlay.style.display = 'none';

        // Select Map
        const mapKeys: MapId[] = ['hotel2', 'milbase', 'office', 'vacation', 'yatchy'];
        let chosenMap: MapId = forcedMap || (this.adminSelectedMap && this.adminSelectedMap !== 'random' ? this.adminSelectedMap : mapKeys[Math.floor(Math.random() * mapKeys.length)]);

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
        this.addIncidentFeed(`🏛️ Mängijad teleportiti kaardile: ${mapConfig.icon} ${mapConfig.name}!`);
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
            raycaster.camera = this.camera;
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

        let rewardMoney = 0;
        let wonLegendaryCrate = false;
        let rewardYards = 20;

        if (winner === 'sheriff_win') {
            if (endTitle) {
                // If the hero was an innocent who grabbed the gun vs original detective
                const isDetectiveHero = (hero && hero.role === 'sheriff' && hero.id !== 'innocent');
                endTitle.textContent = isDetectiveHero ? 'DETECTIVE WINS 🔫' : 'INNOCENTS WIN 🏆';
                endTitle.style.color = '#00f2fe';
            }
            if (trophy) trophy.textContent = '🔫';

            // User requirement:
            // "ja kui oled süütu ja sheriff tapab murdereri ära siis sa saad 50 € ja kui oled sheriff ja tabad murdereri ära saad 100"
            if (this.playerChar.role === 'sheriff') {
                rewardMoney = 100;
                rewardYards = 100;
            } else if (this.playerChar.role === 'innocent') {
                rewardMoney = 50;
                rewardYards = 60;
            } else {
                rewardMoney = 0;
                rewardYards = 10;
            }
            if (this.lastHero === this.playerChar) {
                rewardMoney = Math.max(rewardMoney, 100);
                rewardYards = 150;
            }
        } else if (winner === 'murderer_win') {
            if (endTitle) {
                endTitle.textContent = 'MURDERER WINS 🔪';
                endTitle.style.color = '#ff2e63';
            }
            if (trophy) trophy.textContent = '🩸';

            // User requirement:
            // "kui kaotad murderer tapab kõik ära kui olen süüto ja sheriff ei saa midagi"
            // "ja kui oled murderer ja tabad kõik ära siis teenid 200€ ja 1 legentari crate"
            if (this.playerChar.role === 'murderer') {
                rewardMoney = 200;
                wonLegendaryCrate = true;
                rewardYards = 150;
                this.crateManager.awardCrate('legendary', 1);
            } else {
                rewardMoney = 0;
                rewardYards = 0;
            }
        } else {
            // time_out: Innocents survived
            if (endTitle) {
                endTitle.textContent = 'INNOCENTS WIN 🏆';
                endTitle.style.color = '#2ecc71';
            }
            if (trophy) trophy.textContent = '🏆';

            if (this.playerChar.role === 'innocent' || this.playerChar.role === 'sheriff') {
                rewardMoney = 50;
                rewardYards = 80;
            } else {
                rewardMoney = 0;
                rewardYards = 0;
            }
        }

        // Add bonus for collected coins in-round (+ 5 € per coin)
        rewardMoney += (this.playerChar.coins || 0) * 5;
        rewardYards += (this.playerChar.coins || 0) * 5;

        // Apply money to player's balance
        this.crateManager.addMoney(rewardMoney);

        const endRewardMoney = document.getElementById('end-reward-money');
        if (endRewardMoney) endRewardMoney.textContent = rewardMoney.toString();

        const endRewardCrateBox = document.getElementById('end-reward-crate-box');
        if (endRewardCrateBox) {
            endRewardCrateBox.style.display = wonLegendaryCrate ? 'block' : 'none';
        }

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

    // --- Crate Shop & Weapon Skins ---
    private crateShopModal: HTMLElement | null = null;
    private unboxingModal: HTMLElement | null = null;
    private crateTimerInterval: any = null;

    public initCrateShop() {
        this.crateShopModal = document.getElementById('crate-shop-modal');
        this.unboxingModal = document.getElementById('crate-unboxing-overlay');

        const btnCrateShop = document.getElementById('btn-crate-shop');
        if (btnCrateShop) {
            btnCrateShop.onclick = () => this.openCrateShop();
        }

        const btnClose = document.getElementById('btn-close-crate-shop');
        if (btnClose) {
            btnClose.onclick = () => this.closeCrateShop();
        }

        const btnTabShop = document.getElementById('btn-tab-shop');
        const btnTabInv = document.getElementById('btn-tab-inventory');
        if (btnTabShop && btnTabInv) {
            btnTabShop.onclick = () => this.switchCrateShopTab('shop');
            btnTabInv.onclick = () => this.switchCrateShopTab('inventory');
        }

        const btnUnboxClose = document.getElementById('btn-unboxing-close');
        if (btnUnboxClose) {
            btnUnboxClose.onclick = () => {
                if (this.unboxingModal) this.unboxingModal.style.display = 'none';
                this.renderInventory();
            };
        }

        if (this.crateTimerInterval) clearInterval(this.crateTimerInterval);
        this.crateTimerInterval = setInterval(() => {
            this.updateCrateShopTimers();
        }, 1000);

        this.renderCrateShop();
        this.renderInventory();
    }

    public openCrateShop() {
        if (this.isPointerLocked) {
            document.exitPointerLock?.();
        }
        if (this.roundEndOverlay) {
            this.roundEndOverlay.style.display = 'none';
        }
        if (this.crateShopModal) {
            this.crateShopModal.style.display = 'flex';
        }
        this.crateManager.updateMoneyUI();
        if (this.state !== 'lobby') {
            this.switchCrateShopTab('inventory');
        }
        this.renderCrateShop();
        this.renderInventory();
    }

    public closeCrateShop() {
        if (this.crateShopModal) {
            this.crateShopModal.style.display = 'none';
        }
    }

    public switchCrateShopTab(tab: 'shop' | 'inventory') {
        const btnTabShop = document.getElementById('btn-tab-shop');
        const btnTabInv = document.getElementById('btn-tab-inventory');
        const shopView = document.getElementById('tab-shop-view');
        const invView = document.getElementById('tab-inventory-view');

        if (tab === 'shop') {
            btnTabShop?.classList.add('active');
            btnTabInv?.classList.remove('active');
            if (shopView) shopView.style.display = 'block';
            if (invView) invView.style.display = 'none';
            this.renderCrateShop();
        } else {
            btnTabInv?.classList.add('active');
            btnTabShop?.classList.remove('active');
            if (invView) invView.style.display = 'block';
            if (shopView) shopView.style.display = 'none';
            this.renderInventory();
        }
    }

    public renderCrateShop() {
        const grid = document.getElementById('shop-crates-grid');
        if (!grid) return;

        const stocks = this.crateManager.getStocks();
        const money = this.crateManager.getMoney();
        const now = Date.now();
        const isLobby = this.state === 'lobby';

        grid.innerHTML = '';

        if (!isLobby) {
            const warningBanner = document.createElement('div');
            warningBanner.id = 'shop-in-game-notice';
            warningBanner.style.cssText = 'grid-column: 1 / -1; background: rgba(255, 46, 99, 0.15); border: 2px solid #ff2e63; border-radius: 12px; padding: 12px 20px; text-align: center; color: #ff6b81; font-weight: 700; margin-bottom: 10px; font-size: 0.95rem;';
            warningBanner.innerHTML = '🔒 KASTIDE OSTMINE ON LUKUSTATUD! Kaste saab osta ainult ooteruumis (lobis) enne mängu algust.';
            grid.appendChild(warningBanner);
        }

        (Object.keys(CRATE_CATALOG) as CrateTier[]).forEach(tier => {
            const crate = CRATE_CATALOG[tier];
            const stockData = stocks[tier] || { stock: crate.defaultStock, nextRestock: now + crate.restockIntervalSec * 1000 };
            const isOutOfStock = stockData.stock <= 0;
            const canAfford = money >= crate.price;

            const remainingSec = Math.max(0, Math.ceil((stockData.nextRestock - now) / 1000));
            const mm = Math.floor(remainingSec / 60).toString().padStart(2, '0');
            const ss = (remainingSec % 60).toString().padStart(2, '0');

            const card = document.createElement('div');
            card.className = 'crate-item-card';
            card.id = `crate-card-${tier}`;
            card.style.borderColor = crate.color;

            const canBuy = isLobby && !isOutOfStock && canAfford;
            let buyButtonText = `OSTA ${crate.price} €`;
            if (!isLobby) {
                buyButtonText = 'AINULT LOBIS 🔒';
            } else if (isOutOfStock) {
                buyButtonText = 'LÄBI MÜÜDUD';
            }

            card.innerHTML = `
                <div class="crate-art-box" style="width: 100px; height: 80px; margin: 0 auto 6px auto; display: flex; align-items: center; justify-content: center;">
                    ${getCrateArtworkSvg(tier)}
                </div>
                <h3 style="margin: 2px 0 6px 0; font-size: 1.05rem; color: ${crate.color};">${crate.name}</h3>
                <div class="crate-stock-badge ${isOutOfStock ? 'out-of-stock' : ''}" id="stock-badge-${tier}">
                    📦 Laos: <b id="stock-val-${tier}">${stockData.stock}</b> tk
                </div>
                <div class="crate-restock-timer" id="restock-timer-${tier}">
                    ⏱️ Uus laovaru: <b id="restock-val-${tier}">${mm}:${ss}</b>
                </div>
                <div style="font-size: 1.15rem; font-weight: 900; color: #ffd32a; margin-bottom: 10px;">
                    ${crate.price} €
                </div>
                <button class="btn-buy-crate" id="btn-buy-${tier}" ${!canBuy ? 'disabled' : ''}>
                    ${buyButtonText}
                </button>
            `;

            const btnBuy = card.querySelector(`#btn-buy-${tier}`) as HTMLButtonElement;
            if (btnBuy) {
                btnBuy.onclick = () => {
                    if (this.state !== 'lobby') {
                        alert('Kaste saab osta ainult ooteruumis (lobis) enne mängu algust!');
                        return;
                    }
                    const res = this.crateManager.buyCrate(tier, true);
                    if (res.success) {
                        audio.playCrateTick();
                        this.renderCrateShop();
                        this.renderInventory();
                    } else {
                        alert(res.message);
                    }
                };
            }

            grid.appendChild(card);
        });
    }

    public updateCrateShopTimers() {
        const stocks = this.crateManager.getStocks();
        const money = this.crateManager.getMoney();
        const now = Date.now();
        const isLobby = this.state === 'lobby';

        const btnCrateShop = document.getElementById('btn-crate-shop');
        if (btnCrateShop) {
            if (!isLobby) {
                btnCrateShop.classList.add('in-game-disabled');
                btnCrateShop.title = 'Kastide ostmine on avatud ainult lobis!';
            } else {
                btnCrateShop.classList.remove('in-game-disabled');
                btnCrateShop.title = 'Ava kastide pood ja varustus';
            }
        }

        (Object.keys(CRATE_CATALOG) as CrateTier[]).forEach(tier => {
            const crate = CRATE_CATALOG[tier];
            const stockData = stocks[tier];
            if (!stockData) return;

            const stockEl = document.getElementById(`stock-val-${tier}`);
            if (stockEl) stockEl.textContent = stockData.stock.toString();

            const badgeEl = document.getElementById(`stock-badge-${tier}`);
            if (badgeEl) {
                if (stockData.stock <= 0) {
                    badgeEl.classList.add('out-of-stock');
                } else {
                    badgeEl.classList.remove('out-of-stock');
                }
            }

            const remainingSec = Math.max(0, Math.ceil((stockData.nextRestock - now) / 1000));
            const mm = Math.floor(remainingSec / 60).toString().padStart(2, '0');
            const ss = (remainingSec % 60).toString().padStart(2, '0');

            const restockEl = document.getElementById(`restock-val-${tier}`);
            if (restockEl) restockEl.textContent = `${mm}:${ss}`;

            const btnBuy = document.getElementById(`btn-buy-${tier}`) as HTMLButtonElement;
            if (btnBuy) {
                const isOutOfStock = stockData.stock <= 0;
                const canAfford = money >= crate.price;
                const canBuy = isLobby && !isOutOfStock && canAfford;
                btnBuy.disabled = !canBuy;
                if (!isLobby) {
                    btnBuy.textContent = 'AINULT LOBIS 🔒';
                } else if (isOutOfStock) {
                    btnBuy.textContent = 'LÄBI MÜÜDUD';
                } else {
                    btnBuy.textContent = `OSTA ${crate.price} €`;
                }
            }
        });
    }

    public renderInventory() {
        const inv = this.crateManager.getInventory();

        // 1. Owned Crates
        const cratesGrid = document.getElementById('inventory-crates-grid');
        if (cratesGrid) {
            cratesGrid.innerHTML = '';
            const ownedTiers = (Object.keys(inv.crates) as CrateTier[]).filter(t => (inv.crates[t] || 0) > 0);
            if (ownedTiers.length === 0) {
                cratesGrid.innerHTML = '<div style="color: #888; font-size: 0.9rem; grid-column: 1 / -1;">Sul ei ole avamata kaste. Osta poest või võida voorus!</div>';
            } else {
                ownedTiers.forEach(tier => {
                    const count = inv.crates[tier];
                    const crate = CRATE_CATALOG[tier];
                    const card = document.createElement('div');
                    card.className = 'inventory-item-card';
                    card.id = `owned-crate-${tier}`;
                    card.style.borderColor = crate.color;
                    card.innerHTML = `
                        <div class="crate-art-box" style="width: 80px; height: 65px; margin: 0 auto 6px auto; display: flex; align-items: center; justify-content: center;">
                            ${getCrateArtworkSvg(tier)}
                        </div>
                        <strong style="color: ${crate.color}; font-size: 0.95rem;">${crate.name}</strong>
                        <div style="font-size: 0.85rem; color: #ffd32a; margin: 4px 0 10px 0;">Omad: <b id="owned-count-${tier}">${count}</b> tk</div>
                        <button class="btn-play-again" id="btn-open-${tier}" style="padding: 6px 16px; font-size: 0.85rem; margin: 0; background: linear-gradient(135deg, ${crate.color}, #555);">
                            AVA KAST 🎁
                        </button>
                    `;
                    const btnOpen = card.querySelector(`#btn-open-${tier}`) as HTMLButtonElement;
                    if (btnOpen) {
                        btnOpen.onclick = () => this.triggerUnbox(tier);
                    }
                    cratesGrid.appendChild(card);
                });
            }
        }

        // 2. Knives
        const knivesGrid = document.getElementById('inventory-knives-grid');
        if (knivesGrid) {
            knivesGrid.innerHTML = '';
            const knifeSkins = inv.skins.filter(s => WEAPON_SKIN_CATALOG[s]?.type === 'knife');
            knifeSkins.forEach(skinId => {
                const skin = WEAPON_SKIN_CATALOG[skinId];
                const isEquipped = inv.equippedKnife === skinId;
                const card = document.createElement('div');
                card.className = `inventory-item-card ${isEquipped ? 'equipped' : ''}`;
                card.style.borderColor = skin.tierColor;
                card.innerHTML = `
                    <div class="weapon-art-box" style="width: 80px; height: 65px; margin: 0 auto 4px auto; display: flex; align-items: center; justify-content: center;">
                        ${getWeaponArtworkSvg(skin)}
                    </div>
                    <strong style="color: ${skin.tierColor}; font-size: 0.92rem;">${skin.name}</strong>
                    <div style="font-size: 0.75rem; color: #aaa; margin: 2px 0 10px 0;">${skin.tierName}</div>
                    <button class="btn-hud-action" id="btn-equip-${skinId}" style="width: 100%; justify-content: center; font-size: 0.8rem; background: ${isEquipped ? 'rgba(46, 204, 113, 0.25)' : 'rgba(255, 255, 255, 0.1)'}; border-color: ${isEquipped ? '#2ecc71' : '#666'};">
                        ${isEquipped ? 'VARUSTATUD ✅' : 'VARUSTA ⚔️'}
                    </button>
                `;
                const btnEquip = card.querySelector(`#btn-equip-${skinId}`) as HTMLButtonElement;
                if (btnEquip && !isEquipped) {
                    btnEquip.onclick = () => this.equipSkin(skinId);
                }
                knivesGrid.appendChild(card);
            });
        }

        // 3. Guns
        const gunsGrid = document.getElementById('inventory-guns-grid');
        if (gunsGrid) {
            gunsGrid.innerHTML = '';
            const gunSkins = inv.skins.filter(s => WEAPON_SKIN_CATALOG[s]?.type === 'gun');
            gunSkins.forEach(skinId => {
                const skin = WEAPON_SKIN_CATALOG[skinId];
                const isEquipped = inv.equippedGun === skinId;
                const card = document.createElement('div');
                card.className = `inventory-item-card ${isEquipped ? 'equipped' : ''}`;
                card.style.borderColor = skin.tierColor;
                card.innerHTML = `
                    <div class="weapon-art-box" style="width: 80px; height: 65px; margin: 0 auto 4px auto; display: flex; align-items: center; justify-content: center;">
                        ${getWeaponArtworkSvg(skin)}
                    </div>
                    <strong style="color: ${skin.tierColor}; font-size: 0.92rem;">${skin.name}</strong>
                    <div style="font-size: 0.75rem; color: #aaa; margin: 2px 0 10px 0;">${skin.tierName}</div>
                    <button class="btn-hud-action" id="btn-equip-${skinId}" style="width: 100%; justify-content: center; font-size: 0.8rem; background: ${isEquipped ? 'rgba(46, 204, 113, 0.25)' : 'rgba(255, 255, 255, 0.1)'}; border-color: ${isEquipped ? '#2ecc71' : '#666'};">
                        ${isEquipped ? 'VARUSTATUD ✅' : 'VARUSTA ⚔️'}
                    </button>
                `;
                const btnEquip = card.querySelector(`#btn-equip-${skinId}`) as HTMLButtonElement;
                if (btnEquip && !isEquipped) {
                    btnEquip.onclick = () => this.equipSkin(skinId);
                }
                gunsGrid.appendChild(card);
            });
        }
    }

    public triggerUnbox(tier: CrateTier): WeaponSkinDef | null {
        if (!this.unboxingModal) return null;

        const crate = CRATE_CATALOG[tier];
        if (!crate) return null;

        const wonSkin = this.crateManager.openCrate(tier);
        if (!wonSkin) {
            return null;
        }

        const titleEl = document.getElementById('unboxing-status-title');
        const subtitleEl = document.getElementById('unboxing-status-subtitle');
        const viewportEl = document.getElementById('roulette-viewport');
        const trackEl = document.getElementById('roulette-track');
        const resultBox = document.getElementById('unboxing-result-box');
        const btnEquip = document.getElementById('btn-unboxing-equip') as HTMLButtonElement;
        const btnClose = document.getElementById('btn-unboxing-close') as HTMLButtonElement;

        if (titleEl) titleEl.textContent = `${crate.name.toUpperCase()} AVAMINE...`;
        if (subtitleEl) subtitleEl.textContent = 'Rulett pöörleb — vaata, kuhu fookusjoon seisma jääb!';
        if (resultBox) resultBox.style.display = 'none';
        if (btnEquip) btnEquip.style.display = 'none';
        if (btnClose) btnClose.style.display = 'none';

        this.unboxingModal.style.display = 'flex';

        // Populate roulette track with 40 cards
        if (trackEl) {
            trackEl.innerHTML = '';
            trackEl.style.transition = 'none';
            trackEl.style.transform = 'translateX(0px)';

            const allSkins = Object.values(WEAPON_SKIN_CATALOG);
            const WINNER_INDEX = 32;

            for (let i = 0; i < 40; i++) {
                const skin = (i === WINNER_INDEX) ? wonSkin : allSkins[Math.floor(Math.random() * allSkins.length)];
                const card = document.createElement('div');
                card.className = 'roulette-item-card';
                card.id = `roulette-card-${i}`;
                card.style.setProperty('--card-color', skin.tierColor);
                card.style.borderColor = skin.tierColor;
                card.innerHTML = `
                    <div class="roulette-item-svg">
                        ${getWeaponArtworkSvg(skin)}
                    </div>
                    <div class="roulette-item-name" style="color: ${skin.tierColor};">${skin.name}</div>
                    <div class="roulette-item-tier" style="background: ${skin.tierColor}; color: #111;">${skin.tierName}</div>
                `;
                trackEl.appendChild(card);
            }

            // Center of card 32 = 10 (padding) + 32 * 152 + 70 (half of 140) = 4944px
            const viewportWidth = viewportEl?.clientWidth || 780;
            const cardCenterPos = 10 + WINNER_INDEX * 152 + 70;
            const jitter = (Math.random() - 0.5) * 40;
            const targetX = -(cardCenterPos - viewportWidth / 2 + jitter);

            // Trigger animation after next browser frame
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    trackEl.style.transition = 'transform 5.2s cubic-bezier(0.12, 0.85, 0.14, 1)';
                    trackEl.style.transform = `translateX(${targetX}px)`;

                    // Audio ticks synchronized with visual deceleration
                    let lastCardIndex = -1;
                    const startTime = performance.now();
                    const duration = 5200;

                    const tickLoop = (now: number) => {
                        const elapsed = now - startTime;
                        if (elapsed < duration) {
                            try {
                                const computed = window.getComputedStyle(trackEl);
                                const matrix = new DOMMatrixReadOnly(computed.transform);
                                const currentX = matrix.m41;
                                const centerPos = (viewportWidth / 2) - currentX;
                                const currentCardIndex = Math.floor((centerPos - 10) / 152);
                                if (currentCardIndex !== lastCardIndex && currentCardIndex >= 0 && currentCardIndex < 40) {
                                    lastCardIndex = currentCardIndex;
                                    audio.playCrateTick();
                                }
                            } catch (e) {}
                            requestAnimationFrame(tickLoop);
                        }
                    };
                    requestAnimationFrame(tickLoop);
                });
            });

            // Reveal winner when stopped
            setTimeout(() => {
                audio.playCrateOpen();

                const winnerCard = document.getElementById(`roulette-card-${WINNER_INDEX}`);
                if (winnerCard) {
                    winnerCard.classList.add('winner-pulse');
                }

                if (titleEl) titleEl.textContent = 'PALJU ÕNNE! SAID UUE RELVA!';
                if (subtitleEl) subtitleEl.textContent = `${crate.name} avatud!`;

                const typeEl = document.getElementById('unboxing-item-type');
                if (typeEl) typeEl.textContent = wonSkin.type === 'knife' ? '🔪 UUS NOANAHK' : '🔫 UUS REVOLVRINAHK';

                const nameEl = document.getElementById('unboxing-item-name');
                if (nameEl) {
                    nameEl.textContent = wonSkin.name;
                    nameEl.style.color = wonSkin.tierColor;
                }

                const rarityEl = document.getElementById('unboxing-item-rarity');
                if (rarityEl) {
                    rarityEl.textContent = wonSkin.tierName.toUpperCase();
                    rarityEl.style.background = wonSkin.tierColor;
                    rarityEl.style.color = '#111';
                }

                let winnerArtEl = document.getElementById('unboxing-result-art');
                if (!winnerArtEl && resultBox) {
                    winnerArtEl = document.createElement('div');
                    winnerArtEl.id = 'unboxing-result-art';
                    winnerArtEl.style.width = '120px';
                    winnerArtEl.style.height = '90px';
                    winnerArtEl.style.margin = '0 auto 8px auto';
                    winnerArtEl.style.display = 'flex';
                    winnerArtEl.style.alignItems = 'center';
                    winnerArtEl.style.justifyContent = 'center';
                    resultBox.insertBefore(winnerArtEl, resultBox.firstChild);
                }
                if (winnerArtEl) {
                    winnerArtEl.innerHTML = getWeaponArtworkSvg(wonSkin);
                }

                if (resultBox) resultBox.style.display = 'block';

                if (btnEquip) {
                    btnEquip.style.display = 'inline-block';
                    btnEquip.onclick = () => {
                        this.equipSkin(wonSkin.id);
                        if (this.unboxingModal) this.unboxingModal.style.display = 'none';
                        this.renderInventory();
                    };
                }

                if (btnClose) {
                    btnClose.style.display = 'inline-block';
                    btnClose.onclick = () => {
                        if (this.unboxingModal) this.unboxingModal.style.display = 'none';
                        this.renderInventory();
                    };
                }

                this.renderInventory();
            }, 5300);
        }

        return wonSkin;
    }

    public equipSkin(skinId: string) {
        const skin = WEAPON_SKIN_CATALOG[skinId];
        if (!skin) return;

        this.crateManager.equipSkin(skinId);

        if (this.playerChar && this.playerChar.avatarRig && this.playerChar.avatarRig.bones.rightArm) {
            if (skin.type === 'knife') {
                const wasVis = this.playerChar.knifeMesh ? this.playerChar.knifeMesh.visible : false;
                if (this.playerChar.knifeMesh) {
                    this.playerChar.avatarRig.bones.rightArm.remove(this.playerChar.knifeMesh);
                }
                const newKnife = this.createUltraRealisticKnife(skinId);
                newKnife.position.set(0.08, -0.65, 0.22);
                newKnife.rotation.x = Math.PI / 3;
                newKnife.rotation.y = -Math.PI / 8;
                newKnife.visible = wasVis;
                this.playerChar.knifeMesh = newKnife;
                this.playerChar.avatarRig.bones.rightArm.add(newKnife);
            } else {
                const wasVis = this.playerChar.gunMesh ? this.playerChar.gunMesh.visible : false;
                if (this.playerChar.gunMesh) {
                    this.playerChar.avatarRig.bones.rightArm.remove(this.playerChar.gunMesh);
                }
                const newGun = this.createUltraRealisticRevolver(false, skinId);
                newGun.position.set(0.06, -0.62, 0.26);
                newGun.rotation.x = 0;
                newGun.visible = wasVis;
                this.playerChar.gunMesh = newGun;
                this.playerChar.avatarRig.bones.rightArm.add(newGun);
            }
        }

        this.renderInventory();
    }

    public returnToLobby() {
        if (this.roundEndOverlay) this.roundEndOverlay.style.display = 'none';
        this.state = 'lobby';
        this.lobbyCountdown = 40;

        if (this.lobbyBanner) this.lobbyBanner.style.display = 'flex';
        if (this.hudAliveBadge) this.hudAliveBadge.style.display = 'none';
        if (this.hudCoinsBadge) this.hudCoinsBadge.style.display = 'none';

        // Teleport player and characters back to lobby in front of each other
        this.playerChar.position.set(0, 0, 150);
        this.playerChar.rotation = Math.PI;
        this.playerChar.mesh.position.copy(this.playerChar.position);
        this.playerChar.mesh.rotation.y = this.playerChar.rotation;

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

        // Reset inputs on blur or visibility change to avoid stuck keys
        window.addEventListener('blur', () => {
            this.keys = {};
            this.isSprinting = false;
            this.isDraggingMouse = false;
            this.joystickInput = { x: 0, y: 0 };
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.keys = {};
                this.isSprinting = false;
                this.isDraggingMouse = false;
                this.joystickInput = { x: 0, y: 0 };
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
                if (this.playerChar.hasWeaponEquipped || this.cameraDistance <= 1.2) {
                    this.playerChar.rotation = this.cameraYaw + Math.PI;
                }
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
                if (this.playerChar.hasWeaponEquipped || this.cameraDistance <= 1.2) {
                    this.playerChar.rotation = this.cameraYaw + Math.PI;
                }
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
                if (this.playerChar.hasWeaponEquipped || this.cameraDistance <= 1.2) {
                    this.playerChar.rotation = this.cameraYaw + Math.PI;
                }
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
            this.startMapVoting();
        });

        // Map Voting Buttons in Map Vote Overlay
        document.querySelectorAll('.map-vote-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const mapVal = target.getAttribute('data-map') as MapId;
                if (mapVal) {
                    this.castMapVote(mapVal);
                }
            });
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

        // Mobile touch joystick
        const joystickZone = document.getElementById('touch-joystick-zone');
        const joystickKnob = document.getElementById('touch-joystick-knob');
        if (joystickZone && joystickKnob) {
            let touchId: number | null = null;
            let center = { x: 0, y: 0 };

            joystickZone.addEventListener('touchstart', (e: TouchEvent) => {
                const t = e.changedTouches[0];
                touchId = t.identifier;
                const rect = joystickZone.getBoundingClientRect();
                center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            }, { passive: false });

            joystickZone.addEventListener('touchmove', (e: TouchEvent) => {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const t = e.changedTouches[i];
                    if (t.identifier === touchId) {
                        const dx = t.clientX - center.x;
                        const dy = t.clientY - center.y;
                        const maxDist = 42;
                        const dist = Math.min(maxDist, Math.hypot(dx, dy));
                        const angle = Math.atan2(dy, dx);
                        const kx = Math.cos(angle) * dist;
                        const ky = Math.sin(angle) * dist;
                        joystickKnob.style.transform = `translate(${kx}px, ${ky}px)`;
                        this.joystickInput.x = kx / maxDist;
                        this.joystickInput.y = ky / maxDist;
                    }
                }
            }, { passive: false });

            const resetJoystick = () => {
                touchId = null;
                joystickKnob.style.transform = 'translate(0px, 0px)';
                this.joystickInput = { x: 0, y: 0 };
            };
            joystickZone.addEventListener('touchend', resetJoystick);
            joystickZone.addEventListener('touchcancel', resetJoystick);
        }

        // Mobile touch action buttons
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

        // Detect touch device to show mobile controls layer
        if (isMobileOrTabletDevice()) {
            const mobileLayer = document.getElementById('mobile-controls-layer');
            if (mobileLayer) mobileLayer.style.display = 'block';
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

        // 1. Keyboard Camera View Look (I/J/K/L or Arrow keys when not moving)
        const lookSpeed = 3.0;
        if (this.keys['KeyJ']) {
            this.cameraYaw += lookSpeed * delta;
            if (this.playerChar.hasWeaponEquipped || this.cameraDistance <= 1.2) {
                this.playerChar.rotation = this.cameraYaw + Math.PI;
            }
        }
        if (this.keys['KeyL']) {
            this.cameraYaw -= lookSpeed * delta;
            if (this.playerChar.hasWeaponEquipped || this.cameraDistance <= 1.2) {
                this.playerChar.rotation = this.cameraYaw + Math.PI;
            }
        }
        if (this.keys['KeyI']) {
            this.cameraPitch = Math.min(Math.PI / 3, this.cameraPitch + 2.2 * delta);
        }
        if (this.keys['KeyK']) {
            this.cameraPitch = Math.max(-Math.PI / 4, this.cameraPitch - 2.2 * delta);
        }

        // 2. Player Movement (WASD + Arrow Keys + Touch Joystick)
        let inputX = 0;
        let inputZ = 0;

        if (this.keys['KeyW'] || this.keys['ArrowUp']) inputZ -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) inputZ += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) inputX -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) inputX += 1;

        // Virtual Touch Joystick input
        if (Math.abs(this.joystickInput.x) > 0.05 || Math.abs(this.joystickInput.y) > 0.05) {
            inputX = this.joystickInput.x;
            inputZ = this.joystickInput.y;
        }

        const moveDir = new THREE.Vector3(inputX, 0, inputZ);

        if (moveDir.lengthSq() > 0.001) {
            if (moveDir.lengthSq() > 1) {
                moveDir.normalize();
            }
            moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);

            // Orient the character to face the direction of travel!
            // When moving along moveDir, the facing angle in world space is Math.atan2(moveDir.x, moveDir.z)
            this.playerChar.rotation = Math.atan2(moveDir.x, moveDir.z);

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
            if (this.emotesWidget && this.emotesWidget.getActiveEmote() !== 'idle') {
                this.emotesWidget.stopEmoteQuietly();
            }
            if (this.playerChar.avatarRig) {
                const now = performance.now() * 0.001;
                this.playerChar.avatarRig.updateAnimation(now, 'run');
                if (this.playerChar.hasWeaponEquipped && this.playerChar.rightArm) {
                    this.playerChar.rightArm.rotation.x = -0.35;
                }
            } else {
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
            }
        } else {
            // If stationary and weapon equipped or in 1st person, face the aiming reticle / camera direction
            if (this.playerChar.hasWeaponEquipped || this.cameraDistance <= 1.2) {
                this.playerChar.rotation = this.cameraYaw + Math.PI;
            }
            this.playerChar.mesh.rotation.y = this.playerChar.rotation;

            // Player stationary idle or playing selected in-game emote
            if (this.playerChar.avatarRig) {
                const now = performance.now() * 0.001;
                const activeEmote = this.emotesWidget ? this.emotesWidget.getActiveEmote() : (avatarService.getConfig()?.activeEmote || 'idle');
                this.playerChar.avatarRig.updateAnimation(now, activeEmote);
                if (this.playerChar.hasWeaponEquipped && this.playerChar.rightArm) {
                    this.playerChar.rightArm.rotation.x = -0.35;
                }
            } else {
                const idle = Math.sin(Date.now() * 0.0025) * 0.03;
                if (this.playerChar.leftLeg) this.playerChar.leftLeg.rotation.x = 0;
                if (this.playerChar.rightLeg) this.playerChar.rightLeg.rotation.x = 0;
                if (this.playerChar.leftArm) this.playerChar.leftArm.rotation.x = idle;
                if (this.playerChar.rightArm && !this.playerChar.hasWeaponEquipped) this.playerChar.rightArm.rotation.x = -idle;
            }
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
                this.startMapVoting();
            }
        } else if (this.state === 'map_vote') {
            this.mapVoteCountdown -= delta;
            if (this.mapVoteTimerEl) {
                this.mapVoteTimerEl.textContent = `${Math.max(0, Math.ceil(this.mapVoteCountdown))}s`;
            }
            if (this.mapVoteCountdown <= 0) {
                this.finishMapVoting();
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
