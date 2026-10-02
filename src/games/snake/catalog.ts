import { FoodType } from './types';

export const SNAKE_CONFIG = {
    GRID: {
        cols: 24,
        rows: 24,
        defaultTileSize: 25,
    },
    SPEED: {
        initialStepRate: 8, // steps per second
        maxStepRate: 18,
        speedIncrementPerFood: 0.2,
        freezeMultiplier: 0.65,
    },
    SNAKE: {
        initialLength: 4,
        initialX: 12,
        initialY: 12,
        initialDirection: 'RIGHT' as const,
        colors: {
            head: '#2ed573',
            headGlow: '#00ff88',
            bodyStart: '#2ed573',
            bodyEnd: '#10ac84',
            eyeWhite: '#ffffff',
            eyePupil: '#111827',
            tongue: '#ff4757',
        },
    },
    FOOD: {
        apple: {
            type: 'apple' as FoodType,
            points: 10,
            growth: 1,
            color: '#ff4757',
            glowColor: 'rgba(255, 71, 87, 0.7)',
            icon: '🍎',
        },
        star: {
            type: 'star' as FoodType,
            points: 50,
            growth: 2,
            duration: 10, // seconds on screen
            color: '#ffd700',
            glowColor: 'rgba(255, 215, 0, 0.8)',
            icon: '🌟',
        },
        freeze: {
            type: 'freeze' as FoodType,
            points: 20,
            growth: 0,
            duration: 9, // power-up lasts 6s, item stays 9s
            color: '#00d2d3',
            glowColor: 'rgba(0, 210, 211, 0.8)',
            icon: '🫐',
        },
        magnet: {
            type: 'magnet' as FoodType,
            points: 25,
            growth: 0,
            duration: 9,
            color: '#a55eea',
            glowColor: 'rgba(165, 94, 234, 0.8)',
            icon: '🧲',
        },
    },
    SPAWN_CHANCES: {
        starChance: 0.15,
        freezeChance: 0.10,
        magnetChance: 0.10,
    },
    THEME: {
        bg: '#0a0e17',
        gridLine: 'rgba(46, 213, 115, 0.05)',
        border: 'rgba(46, 213, 115, 0.3)',
        borderGlow: 'rgba(46, 213, 115, 0.15)',
    },
};

export interface SnakeColorPreset {
    id: string;
    name: string;
    emoji: string;
    head: string;
    headGlow: string;
    primary: string;
    secondary: string;
    glow: string;
}

export const SNAKE_COLOR_PRESETS: SnakeColorPreset[] = [
    {
        id: 'green',
        name: 'Roheline',
        emoji: '🟢',
        head: '#00e676',
        headGlow: 'rgba(0, 230, 118, 0.85)',
        primary: '#2ed573',
        secondary: '#10ac84',
        glow: 'rgba(46, 213, 115, 0.6)',
    },
    {
        id: 'blue',
        name: 'Sinine',
        emoji: '🔵',
        head: '#00d2d3',
        headGlow: 'rgba(0, 210, 211, 0.85)',
        primary: '#0984e3',
        secondary: '#2e86de',
        glow: 'rgba(9, 132, 227, 0.6)',
    },
    {
        id: 'red',
        name: 'Punane',
        emoji: '🔴',
        head: '#ff4757',
        headGlow: 'rgba(255, 71, 87, 0.85)',
        primary: '#ff6b81',
        secondary: '#c0392b',
        glow: 'rgba(255, 71, 87, 0.6)',
    },
    {
        id: 'purple',
        name: 'Lilla',
        emoji: '🟣',
        head: '#c56cf0',
        headGlow: 'rgba(197, 108, 240, 0.85)',
        primary: '#a55eea',
        secondary: '#8854d0',
        glow: 'rgba(165, 94, 234, 0.6)',
    },
    {
        id: 'yellow',
        name: 'Kollane',
        emoji: '🟡',
        head: '#fffa65',
        headGlow: 'rgba(255, 250, 101, 0.85)',
        primary: '#ffd700',
        secondary: '#f39c12',
        glow: 'rgba(255, 215, 0, 0.6)',
    },
    {
        id: 'cyan',
        name: 'Tsüaan',
        emoji: '💎',
        head: '#18dcff',
        headGlow: 'rgba(24, 220, 255, 0.85)',
        primary: '#00f2fe',
        secondary: '#4facfe',
        glow: 'rgba(0, 242, 254, 0.6)',
    },
    {
        id: 'pink',
        name: 'Roosa',
        emoji: '🌸',
        head: '#ff9ff3',
        headGlow: 'rgba(255, 159, 243, 0.85)',
        primary: '#fd79a8',
        secondary: '#e84393',
        glow: 'rgba(253, 121, 168, 0.6)',
    },
    {
        id: 'orange',
        name: 'Oranž',
        emoji: '🟠',
        head: '#ff9f43',
        headGlow: 'rgba(255, 159, 67, 0.85)',
        primary: '#ff7675',
        secondary: '#d63031',
        glow: 'rgba(255, 118, 117, 0.6)',
    },
];

export function getSnakeColorPreset(id: string): SnakeColorPreset {
    return SNAKE_COLOR_PRESETS.find(p => p.id === id) || SNAKE_COLOR_PRESETS[0];
}

