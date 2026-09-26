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

export type GameMode = 'demo' | 'solo' | 'multiplayer';

export interface PlayerSnake {
    id: 'player1' | 'player2';
    name: string;
    body: GridPoint[];
    direction: Direction;
    nextDirection: Direction;
    score: number;
    applesEaten: number;
    growthPending: number;
    isGameOver: boolean;
    color: string;
    headColor: string;
    eyeColor: string;
}

export interface MultiplayerInvite {
    id: string;
    fromUsername: string;
    fromDisplayName: string;
    toUsername: string;
    timestamp: number;
    status: 'pending' | 'accepted' | 'declined';
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
    mode: GameMode;
    player2Score?: number;
    player2Length?: number;
    player2Name?: string;
    player2GameOver?: boolean;
}
