export const BREAKOUT_CONFIG = {
    PADDLE: {
        width: 120,
        height: 14,
        speed: 750,
        color: '#ffffff',
        glowColor: 'rgba(0, 242, 254, 0.8)',
        borderRadius: 7,
    },
    BALL: {
        radius: 8,
        initialSpeed: 420,
        maxSpeed: 700,
        speedIncrement: 10,
        color: '#ffffff',
        glowColor: 'rgba(255, 255, 255, 0.9)',
    },
    GRID_LEVEL_1: {
        rows: 7,
        cols: 12,
        padding: 6,
        topOffset: 85,
        sidePadding: 42,
        brickHeight: 22,
    },
    GRID_LEVEL_2: {
        rows: 9,
        cols: 14,
        padding: 5,
        topOffset: 80,
        sidePadding: 40,
        brickHeight: 20,
    },
    BORDER: {
        height: 18,
        color: '#576574',
        glowColor: 'rgba(131, 149, 167, 0.7)',
        borderColor: '#c8d6e5',
    },
    GRID: {
        rows: 7,
        cols: 12,
        padding: 6,
        topOffset: 85,
        sidePadding: 42,
        brickHeight: 22,
        // Shades of vibrant arcade green for the green squares/bricks
        greenColors: [
            { main: '#2ed573', glow: 'rgba(46, 213, 115, 0.7)', points: 50 },
            { main: '#00e676', glow: 'rgba(0, 230, 118, 0.7)', points: 40 },
            { main: '#10ac84', glow: 'rgba(16, 172, 132, 0.7)', points: 30 },
            { main: '#26de81', glow: 'rgba(38, 222, 129, 0.7)', points: 20 },
            { main: '#05c46b', glow: 'rgba(5, 196, 107, 0.7)', points: 10 },
            { main: '#2ed573', glow: 'rgba(46, 213, 115, 0.7)', points: 50 },
            { main: '#00e676', glow: 'rgba(0, 230, 118, 0.7)', points: 40 },
            { main: '#10ac84', glow: 'rgba(16, 172, 132, 0.7)', points: 30 },
            { main: '#26de81', glow: 'rgba(38, 222, 129, 0.7)', points: 20 },
        ],
        // Golden bricks that drop the circular 3-ball powerup
        goldBrick: {
            color: '#ffd700',
            glowColor: 'rgba(255, 215, 0, 0.9)',
            borderColor: '#fff176',
            points: 100,
        },
        // Unbreakable metallic grey bricks that ball bounces off without exploding
        greyBrick: {
            color: '#576574',
            glowColor: 'rgba(131, 149, 167, 0.6)',
            borderColor: '#c8d6e5',
            points: 0,
        },
    },
    POWER_UP: {
        radius: 16,
        fallSpeed: 190,
        glowColor: 'rgba(255, 215, 0, 0.85)',
        bgColor: '#1e272e',
        borderColor: '#ffd700',
        ballIconColor: '#ffffff',
    },
    PARTICLES: {
        countPerBrick: 16,
        baseLife: 0.6,
    },
    PBX_REWARD: {
        perBrick: 0,
        clearBonus: 0,
        level2Bonus: 0,
    }
};
