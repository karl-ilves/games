import * as THREE from 'three';

export type AircraftId =
    | 'cessna172'
    | 'piper_cub'
    | 'pitts_special'
    | 'learjet45'
    | 'spitfire'
    | 'boeing737'
    | 'f16_falcon'
    | 'concorde'
    | 'an225_mriya'
    | 'b2_spirit'
    | 'space_shuttle';

export type AircraftCategory = 'TRAINER' | 'BUSH' | 'AEROBATIC' | 'BUSINESS' | 'WARBIRD' | 'AIRLINER' | 'SUPERSONIC' | 'CARGO' | 'STEALTH' | 'HYPERSONIC';

export interface AircraftConfig {
    id: AircraftId;
    name: string;
    icon: string;
    category: AircraftCategory;
    description: string;
    price: number; // in Coins (0 for cessna172)
    topSpeedKmh: number;
    acceleration: number;
    pitchRate: number;
    rollRate: number;
    yawRate: number;
    mass: number;
    liftCoefficient: number;
    explosionScale: number;
    coinMultiplier: number;
    colorPrimary: number;
    colorSecondary: number;
    colorAccent: number;
    meshType: 'cessna' | 'piper' | 'biplane' | 'bizjet' | 'warbird' | 'airliner' | 'fighter' | 'supersonic' | 'heavy_cargo' | 'stealth_wing' | 'shuttle';
    debrisPieceCount: number;
}

export interface FlightState {
    speedKmh: number;
    altitude: number;
    throttle: number; // 0..1
    isStalling: boolean;
    isCrashed: boolean;
    isAirborne: boolean;
    spin360Accumulator: number;
    spin360Count: number;
    loopAccumulator: number;
    loopCount: number;
    highestAltitudeReached: number;
    highestSpeedReached: number;
    stuntCloseCalls: number;
    lastCrashReport: CrashBreakdown | null;
    leftWingBroken: boolean;
    rightWingBroken: boolean;
    tailBroken: boolean;
    gearDown: boolean;
    isLanded: boolean;
    isFuselageSplit: boolean;
    landingBonusAwarded: boolean;
}

export interface CrashBreakdown {
    baseCoins: number; // Guaranteed 500
    spinsCoins: number;
    spinsCount: number;
    loopsCoins: number;
    loopsCount: number;
    speedCoins: number;
    impactSpeedKmh: number;
    altitudeCoins: number;
    maxAltitude: number;
    targetCoins: number;
    targetDescription?: string;
    totalCoins: number;
    planeName: string;
    multiplier: number;
}

export type CameraMode = 'chase' | 'cockpit' | 'cinematic_crash';

export interface DebrisPiece {
    mesh: THREE.Object3D;
    velocity: THREE.Vector3;
    rotVelocity: THREE.Vector3;
    isGrounded: boolean;
    sparkTimer: number;
}
