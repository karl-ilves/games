export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface GridPoint {
    x: number;
    y: number;
}

export type FoodType = 'apple' | 'star' | 'freeze' | 'magnet';

export interface FoodItem {
    id: number;
    x: number;
    y: number;
    type: FoodType;
    points: number;
    growth: number;
    duration?: number; // for temporary items in seconds
    timer?: number; // remaining lifetime
    pulsePhase?: number;
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    alpha: number;
    life: number;
    maxLife: number;
}

export interface GameStats {
    score: number;
    highScore: number;
    applesEaten: number;
    length: number;
    speed: number;
    level: number;
    isGameOver: boolean;
    isPaused: boolean;
    activePowerUp: FoodType | null;
    powerUpTimeRemaining: number;
}
