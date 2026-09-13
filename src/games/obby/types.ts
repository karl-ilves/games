import * as THREE from 'three';

export interface StageInfo {
    id: number;
    nameEt: string;
    nameEn: string;
    color: number;
    spawnPos: THREE.Vector3;
}

export interface DisappearingPlatform {
    mesh: THREE.Mesh;
    initialY: number;
    state: 'idle' | 'triggered' | 'fallen' | 'respawning';
    timer: number;
}

export interface MovingPlatform {
    mesh: THREE.Mesh;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    speed: number;
    phase: number;
    delta: THREE.Vector3;
}

export interface RotatingHazard {
    mesh: THREE.Object3D;
    speed: number;
    type: 'spinner' | 'hammer';
    pos: THREE.Vector3;
    radius?: number;
    hammerHead?: THREE.Mesh;
}

export interface CheckpointPad {
    index: number;
    mesh: THREE.Mesh;
    ringMesh: THREE.Mesh;
    flagMesh: THREE.Mesh;
    pos: THREE.Vector3;
    activated: boolean;
}

export interface CoinPickup {
    mesh: THREE.Mesh;
    pos: THREE.Vector3;
    collected: boolean;
    value: number;
}

export interface ShopItem {
    id: string;
    name: string;
    price: number;
}
