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
