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
    GRID: {
        rows: 5,
        cols: 10,
        padding: 8,
        topOffset: 80,
        sidePadding: 40,
        brickHeight: 28,
        // Shades of vibrant arcade green for the green squares/bricks
        greenColors: [
            { main: '#2ed573', glow: 'rgba(46, 213, 115, 0.7)', points: 50 },
            { main: '#00e676', glow: 'rgba(0, 230, 118, 0.7)', points: 40 },
            { main: '#10ac84', glow: 'rgba(16, 172, 132, 0.7)', points: 30 },
            { main: '#26de81', glow: 'rgba(38, 222, 129, 0.7)', points: 20 },
            { main: '#05c46b', glow: 'rgba(5, 196, 107, 0.7)', points: 10 },
        ],
    },
    PARTICLES: {
        countPerBrick: 16,
        baseLife: 0.6,
    },
    PBX_REWARD: {
        perBrick: 1,
        clearBonus: 50,
    }
};
