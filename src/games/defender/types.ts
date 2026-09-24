export type AsteroidCategory = 'small' | 'medium' | 'large' | 'fire' | 'gold' | 'boss';

export interface AsteroidConfig {
    type: AsteroidCategory;
    name: string;
    radius: number;
    hp: number;
    speed: number;
    points: number;
    color: string;
    glowColor: string;
    damageToEarth: number;
    vertexCount: number;
    canSplit: boolean;
}

export interface Asteroid {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    angle: number;
    vAngle: number;
    hp: number;
    maxHp: number;
    config: AsteroidConfig;
    vertices: { x: number; y: number }[];
    trailColor?: string;
}

export interface Laser {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    damage: number;
    color: string;
    isOwnerBeam: boolean;
    life: number;
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
    alpha: number;
    decay: number;
    shrink: boolean;
}

export interface FloatingText {
    x: number;
    y: number;
    text: string;
    color: string;
    alpha: number;
    vy: number;
    life: number;
}

export type PowerUpType = 'triple_shot' | 'shield_restore' | 'emp_nuke' | 'speed_boost' | 'coins';

export interface PowerUp {
    id: number;
    x: number;
    y: number;
    vy: number;
    type: PowerUpType;
    icon: string;
    radius: number;
    alpha: number;
    life: number;
}

export interface Star {
    x: number;
    y: number;
    radius: number;
    speed: number;
    alpha: number;
    color: string;
}

export interface GameStats {
    score: number;
    highScore: number;
    asteroidsDestroyed: number;
    wave: number;
    earthHp: number;
    earthMaxHp: number;
    earthShield: number;
    earthMaxShield: number;
    combo: number;
    empCharged: boolean;
    empChargePct: number;
    earnedPbx?: number;
}

export interface DefenderShopItem {
    id: string;
    name: string;
    description: string;
    price: number;
    icon: string;
    badge?: string;
    tag: string;
}

export interface LeaderboardEntry {
    id: string;
    name: string;
    score: number;
    wave: number;
    asteroidsDestroyed: number;
    isOwner?: boolean;
    isCurrentPlayer?: boolean;
    avatarIcon?: string;
}
