import * as THREE from 'three';

export interface RocketType {
    id: string;
    name: string;
    icon: string;
    desc: string;
    speed: number;
    color: number;
    trailColor: number;
    price: number;
    scoreMultiplier: number;
    blastRadius: number;
    category: 'tactical' | 'incendiary' | 'demolition' | 'plasma' | 'cluster' | 'cosmic' | 'thermobaric' | 'singularity';
}

export interface BuildingConfig {
    id: string;
    name: string;
    pos: THREE.Vector3;
    w: number;
    h: number;
    d: number;
    color: number;
    roofColor: number;
    pts: number;
    hp: number;
}

export interface DestructibleBuilding {
    id: string;
    name: string;
    group: THREE.Group;
    mesh: THREE.Mesh;
    type: 'building';
    basePoints: number;
    position: THREE.Vector3;
    size: { w: number; h: number; d: number };
    color: number;
    active: boolean;
    respawnTimer: number;
    hp: number;
    maxHp: number;
    rubbleMesh?: THREE.Mesh;
    isBurning: boolean;
    fireLight?: THREE.PointLight;
    fireParticles?: THREE.Group;
}

export interface FlyingDebris {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    rotAxis: THREE.Vector3;
    rotSpeed: number;
    isGrounded: boolean;
    age: number;
    maxAge: number;
    isBurning: boolean;
}

export interface InFlightRocket {
    mesh: THREE.Object3D;
    velocity: THREE.Vector3;
    targetPos: THREE.Vector3;
    rocketType: RocketType;
    spawnTime: number;
}
