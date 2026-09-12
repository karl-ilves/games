import * as THREE from 'three';

export interface TrainDef {
    id: string;
    category: 'train' | 'metro';
    name: string;
    nameEn: string;
    icon: string;
    price: number; // In-Game Train Money (0€ for default)
    maxSpeed: number; // km/h
    acceleration: number; // multiplier
    passengers: number;
    description: string;
    descriptionEn: string;
    special: string;
    specialEn: string;
    style: 'classic_steam' | 'heavy_diesel' | 'forest_shunter' | 'bullet_shinkansen' | 'royal_orient' | 'alpine_climber' | 'cyber_bullet' | 'armored_dreadnought' | 'hyperloop_plasma' | 'metro_standard' | 'commuter_emu' | 'metro_tokyo' | 'metro_london' | 'metro_paris' | 'metro_futuristic';
    locoColor: number;
    trimColor: number;
    coachColor: number;
}

export interface Station {
    id: string;
    name: string;
    nameEn: string;
    description: string;
    descriptionEn: string;
    trackU: number; // position on track [0..1]
    worldPos: THREE.Vector3;
    passengersWaiting: number;
    moneyReward: number; // Rongiraha (+50 € jaama kohta)
}

export interface JunctionState {
    activeBranch: 'main' | 'mountain';
    inJunctionZone: boolean;
    junctionStartU: number;
    junctionEndU: number;
    switchU: number;
}

export interface SmokeParticle {
    mesh: THREE.Mesh;
    life: number;
    maxLife: number;
    vel: THREE.Vector3;
}

export type CameraMode = 0 | 1 | 2 | 3; // 0: Chase 3D, 1: Driver Cab, 2: Cinematic Trackside, 3: Top-Down Map
export type WeatherMode = 0 | 1 | 2; // 0: Day, 1: Sunset, 2: Night
