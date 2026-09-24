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
