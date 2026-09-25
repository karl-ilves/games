import { AsteroidCategory, AsteroidConfig, PowerUpType } from './types';

export const ASTEROID_CATALOG: Record<AsteroidCategory, AsteroidConfig> = {
    small: {
        type: 'small',
        name: 'Small Asteroid',
        radius: 18,
        hp: 1,
        speed: 2.2,
        points: 50,
        color: '#8395a7',
        glowColor: '#576574',
        damageToEarth: 8,
        vertexCount: 8,
        canSplit: false
    },
    medium: {
        type: 'medium',
        name: 'Medium Asteroid',
        radius: 32,
        hp: 3,
        speed: 1.6,
        points: 120,
        color: '#718093',
        glowColor: '#487eb0',
        damageToEarth: 18,
        vertexCount: 10,
        canSplit: true
    },
    large: {
        type: 'large',
        name: 'Massive Asteroid',
        radius: 52,
        hp: 6,
        speed: 1.1,
        points: 250,
        color: '#4b6584',
        glowColor: '#273c75',
        damageToEarth: 35,
        vertexCount: 12,
        canSplit: true
    },
    fire: {
        type: 'fire',
        name: 'Flaming Meteor',
        radius: 26,
        hp: 2,
        speed: 2.8,
        points: 180,
        color: '#ff4757',
        glowColor: '#ff6b81',
        damageToEarth: 22,
        vertexCount: 9,
        canSplit: false
    },
    gold: {
        type: 'gold',
        name: 'Golden Asteroid',
        radius: 24,
        hp: 2,
        speed: 2.0,
        points: 500,
        color: '#ffd32a',
        glowColor: '#ffa801',
        damageToEarth: 10,
        vertexCount: 9,
        canSplit: false
    },
    boss: {
        type: 'boss',
        name: 'Planet-Killer Comet',
        radius: 80,
        hp: 20,
        speed: 0.7,
        points: 1500,
        color: '#9c88ff',
        glowColor: '#8c7ae6',
        damageToEarth: 60,
        vertexCount: 16,
        canSplit: true
    }
};

export interface PowerUpConfig {
    type: PowerUpType;
    icon: string;
    label: string;
    color: string;
    dropWeight: number;
}

export const POWERUP_CONFIGS: PowerUpConfig[] = [
    { type: 'triple_shot', icon: '⚡', label: 'Triple Laser', color: '#00f2fe', dropWeight: 30 },
    { type: 'shield_restore', icon: '🛡️', label: 'Shield Recharger', color: '#2ed573', dropWeight: 35 },
    { type: 'emp_nuke', icon: '💣', label: 'Orbital EMP Nova', color: '#a55eea', dropWeight: 15 },
    { type: 'speed_boost', icon: '⏩', label: 'Hyper Boost', color: '#ffa502', dropWeight: 20 }
];

export const DEFENDER_SHOP_ITEMS: import('./types').DefenderShopItem[] = [
    {
        id: 'defender_hyper_blaster',
        name: 'Hyper-Plasma Blaster',
        description: 'Superior firepower (+50% laser damage) and 35% faster firing rate. Asteroids shatter instantly!',
        price: 500,
        icon: '⚡',
        badge: 'FIREPOWER',
        tag: 'blaster'
    },
    {
        id: 'defender_titanium_shield',
        name: 'Titanium Planetary Shield',
        description: 'Reinforces Earth\'s planetary shield (+50 Max SP) and regenerates shield energy twice as fast!',
        price: 1000,
        icon: '🛡️',
        badge: 'PLANETARY',
        tag: 'shield'
    },
    {
        id: 'defender_mega_emp',
        name: 'Mega EMP Nova Core',
        description: 'Start every mission with 100% EMP charged and ready. EMP recharges 50% faster in combat!',
        price: 1500,
        icon: '💣',
        badge: 'TACTICAL',
        tag: 'emp'
    },
    {
        id: 'defender_defense_drone',
        name: 'Orbital Satellite Drone',
        description: 'Autonomous combat drone orbits your starship and automatically fires lasers at incoming asteroids!',
        price: 2500,
        icon: '🛸',
        badge: 'DRONE',
        tag: 'drone'
    }
];

export const KNOWN_REAL_PLAYERS: import('./types').LeaderboardEntry[] = [
    { id: 'usr_karl', name: 'Karl Ilves', username: 'karl.ilves', score: 24500, wave: 18, asteroidsDestroyed: 112, isOwner: true, isRealPlayer: true, avatarIcon: '👑' },
    { id: 'usr_taavi2', name: 'Taavi', username: 'taavi2', score: 18200, wave: 14, asteroidsDestroyed: 89, isOwner: false, isRealPlayer: true, avatarIcon: '👤' },
    { id: 'usr_banana', name: 'MinionBanana0_0', username: 'minionbanana0_0', score: 14800, wave: 11, asteroidsDestroyed: 74, isOwner: false, isRealPlayer: true, avatarIcon: '🍌' },
    { id: 'usr_grx', name: 'GRX', username: 'grx', score: 11200, wave: 8, asteroidsDestroyed: 58, isOwner: false, isRealPlayer: true, avatarIcon: '⚡' }
];

export const DEFAULT_LEADERBOARD: import('./types').LeaderboardEntry[] = KNOWN_REAL_PLAYERS;
