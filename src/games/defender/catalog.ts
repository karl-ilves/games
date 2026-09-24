import { AsteroidCategory, AsteroidConfig, PowerUpType } from './types';

export const ASTEROID_CATALOG: Record<AsteroidCategory, AsteroidConfig> = {
    small: {
        type: 'small',
        name: 'Väike Asteroid',
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
        name: 'Keskmine Asteroid',
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
        name: 'Massiivne Asteroid',
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
        name: 'Leegitsev Meteoor',
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
        name: 'Kuldne Asteroid',
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
        name: 'Planeeditapja Komeet',
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
    { type: 'triple_shot', icon: '⚡', label: 'Kolmiklaser', color: '#00f2fe', dropWeight: 30 },
    { type: 'shield_restore', icon: '🛡️', label: 'Kilbi Laadimine', color: '#2ed573', dropWeight: 35 },
    { type: 'emp_nuke', icon: '💣', label: 'Orbitaalne EMP', color: '#a55eea', dropWeight: 15 },
    { type: 'speed_boost', icon: '⏩', label: 'Hüperkiirendus', color: '#ffa502', dropWeight: 20 }
];

export const DEFENDER_SHOP_ITEMS: import('./types').DefenderShopItem[] = [
    {
        id: 'defender_hyper_blaster',
        name: 'Hüper-Plasma Blaster',
        description: 'Võimsam kahjustus (+50% laserikahju) ja 35% kiirem laskekiirus. Asteroidid purunevad silmapilkselt!',
        price: 500,
        icon: '⚡',
        badge: 'TULEJÕUD',
        tag: 'blaster'
    },
    {
        id: 'defender_titanium_shield',
        name: 'Titaanist Planeedikilp',
        description: 'Tugevdab Maa planetaarset kilpi (+50 Max SP) ja taastab kilbi energiat 2x kiiremini!',
        price: 1000,
        icon: '🛡️',
        badge: 'PLANETARIAN',
        tag: 'shield'
    },
    {
        id: 'defender_mega_emp',
        name: 'Mega EMP Tuumalaeng',
        description: 'Alustad igat missiooni 100% valmis EMP pommiga ning EMP laeb lahingus 50% kiiremalt!',
        price: 1500,
        icon: '💣',
        badge: 'TAKTIKALINE',
        tag: 'emp'
    },
    {
        id: 'defender_defense_drone',
        name: 'Orbitaalne Satelliit-Droon',
        description: 'Autonoomne lahingdroon tiirleb laeva kõrval ja tulistab automaatselt lähenevaid asteroide!',
        price: 2500,
        icon: '🛸',
        badge: 'DROON',
        tag: 'drone'
    },
    {
        id: 'defender_golden_magnet',
        name: 'Kuldne Komeetide Magnet (2X Pbx)',
        description: 'Kahekordistab skooripunktid (2x Score) ja teenid igalt missioonilt 2X rohkem Pbx valuutat!',
        price: 3500,
        icon: '🪙',
        badge: '2X PBX BOOSTER',
        tag: 'booster'
    }
];

export const KNOWN_REAL_PLAYERS: import('./types').LeaderboardEntry[] = [
    { id: 'usr_karl', name: 'Karl Ilves', username: 'karl.ilves', score: 24500, wave: 18, asteroidsDestroyed: 112, isOwner: true, isRealPlayer: true, avatarIcon: '👑' },
    { id: 'usr_taavi2', name: 'Taavi', username: 'taavi2', score: 18200, wave: 14, asteroidsDestroyed: 89, isOwner: false, isRealPlayer: true, avatarIcon: '👤' },
    { id: 'usr_banana', name: 'MinionBanana0_0', username: 'minionbanana0_0', score: 14800, wave: 11, asteroidsDestroyed: 74, isOwner: false, isRealPlayer: true, avatarIcon: '🍌' },
    { id: 'usr_grx', name: 'GRX', username: 'grx', score: 11200, wave: 8, asteroidsDestroyed: 58, isOwner: false, isRealPlayer: true, avatarIcon: '⚡' }
];

export const DEFAULT_LEADERBOARD: import('./types').LeaderboardEntry[] = KNOWN_REAL_PLAYERS;
