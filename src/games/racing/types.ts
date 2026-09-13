import * as THREE from 'three';

export interface VehicleDef {
    id: string;
    name: string;
    type: 'car' | 'moto';
    price: number;
    yardPrice: number;
    maxSpeed: number;
    acceleration: number;
    handling: number; // turn speed multiplier
    image: string;
    hueRotate: number;
}

export interface Checkpoint {
    x: number;
    z: number;
    radius: number;
}

export interface Opponent {
    group: THREE.Group;
    wheels: THREE.Mesh[];
    speed: number;
    heading: number;
    targetCpIndex: number;
    type: string;
    maxSpeed: number;
    finished: boolean;
    finishOrder: number;
    acceleration: number;
    crashed: boolean;
    crashTimer: number;
}

export interface CrashEvent {
    position: THREE.Vector3;
    time: number;
    ambulance: THREE.Group | null;
    towTruck: THREE.Group | null;
    ambulanceArrived: boolean;
    towTruckArrived: boolean;
    yellowFlagActive: boolean;
    cleanup: boolean;
    timer: number;
}

export type GameState = 'garage' | 'countdown' | 'racing' | 'finished';
