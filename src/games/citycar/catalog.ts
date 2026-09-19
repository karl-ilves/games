import { CameraMode } from './types';

export const VEHICLE_CONFIG = {
    maxSpeedKmh: 165,
    maxReverseSpeedKmh: 45,
    acceleration: 38,     // m/s^2 equivalent ramp
    brakeDeceleration: 75,
    reverseAccel: 22,
    naturalDeceleration: 12,
    handbrakeDecel: 45,
    maxSteerAngleRad: 0.55,
    steerSpeedRadPerSec: 3.5,
    steerCenteringSpeedRadPerSec: 4.5,
    driftGripFactor: 0.35,
    normalGripFactor: 0.92,
    suspensionStiffness: 12,
    gravity: 28,
    wheelBase: 2.8,
    carWidth: 1.9,
    carLength: 4.4,
    carHeight: 1.35
};

export const CAR_COLORS = [
    { name: 'Cyan Electric', hex: '#00f2fe' },
    { name: 'Ferrari Red', hex: '#ff3838' },
    { name: 'Neon Lime', hex: '#2ecc71' },
    { name: 'Hyper Yellow', hex: '#ffd32a' },
    { name: 'Royal Purple', hex: '#9b59b6' },
    { name: 'Sunset Orange', hex: '#ff793f' },
    { name: 'Stealth Black', hex: '#1e272e' },
    { name: 'Pearl White', hex: '#f5f6fa' }
];

export const CAMERA_CONFIGS: Record<CameraMode, { offset: [number, number, number]; lookAtOffset: [number, number, number]; fov: number; label: string }> = {
    chase: {
        offset: [0, 3.4, -7.2],
        lookAtOffset: [0, 1.2, 4.0],
        fov: 62,
        label: 'Chase Cam'
    },
    close: {
        offset: [0, 2.2, -5.0],
        lookAtOffset: [0, 1.0, 3.0],
        fov: 68,
        label: 'Close Cam'
    },
    hood: {
        offset: [0, 1.25, 0.4],
        lookAtOffset: [0, 1.15, 12.0],
        fov: 75,
        label: 'Hood Cam'
    },
    topdown: {
        offset: [0, 26.0, -0.1],
        lookAtOffset: [0, 0, 0],
        fov: 50,
        label: 'Top-Down'
    }
};

export const WORLD_ZONES = {
    city: {
        minX: -350,
        maxX: -45,
        minZ: -250,
        maxZ: 250,
        name: 'Downtown City',
        icon: '🏙️'
    },
    river: {
        minX: -45,
        maxX: 45,
        minZ: -300,
        maxZ: 300,
        name: 'Grand River',
        icon: '🌊'
    },
    bridges: [
        { name: 'Central Suspension Bridge', x: 0, z: 0, length: 110, width: 14, icon: '🌉' },
        { name: 'North Border Crossing', x: 0, z: 120, length: 100, width: 12, icon: '🚧' },
        { name: 'South Timber Bridge', x: 0, z: -120, length: 100, width: 10, icon: '🪵' }
    ],
    forest: {
        minX: 45,
        maxX: 350,
        minZ: -250,
        maxZ: 250,
        name: 'Pinecone Forest',
        icon: '🌲'
    }
};
