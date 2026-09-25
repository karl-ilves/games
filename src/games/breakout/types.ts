export interface Ball {
    x: number;
    y: number;
    radius: number;
    vx: number;
    vy: number;
    speed: number;
    trail: { x: number; y: number; alpha: number }[];
}

export interface Paddle {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    targetX: number;
}

export interface Brick {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    glowColor: string;
    points: number;
    intact: boolean;
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
    bricksDestroyed: number;
    totalBricks: number;
    lives: number;
    isGameOver: boolean;
    isVictory: boolean;
    playbuxReward: number;
}
