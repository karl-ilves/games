import * as THREE from 'three';

export type Team = 'red' | 'blue' | 'missile';
export type UnitClass = 'tank' | 'soldier' | 'plane' | 'missile';
export type ActiveWeapon = 'cannon' | 'mg' | 'airstrike' | 'missile' | 'nuke';

export interface CombatUnit {
    id: string;
    name: string;
    team: Team;
    unitClass: UnitClass;
    isLocalPlayer: boolean;
    isBot: boolean;
    hp: number;
    maxHp: number;
    pos: THREE.Vector3;
    rotation: number;
    turretAngle?: number;
    speed: number;
    root: THREE.Group;
    turret?: THREE.Group;
    barrel?: THREE.Mesh;
    leftLeg?: THREE.Mesh;
    rightLeg?: THREE.Mesh;
    nameTagSprite: THREE.Sprite;
    nameTagCanvas: HTMLCanvasElement;
    reloadTimer: number;
    secondaryReloadTimer?: number;
    respawnTimer: number;
    isDead: boolean;
    isCrashing?: boolean;
    crashVelocity?: THREE.Vector3;
    crashRotationSpeed?: THREE.Vector3;
    walkCycle?: number;
    bankAngle?: number;
}

export interface Projectile {
    id: string;
    shooterId: string;
    shooterName: string;
    team: Team;
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    damage: number;
    explosionRadius: number;
    life: number;
    isExplosive: boolean;
    isCannon: boolean;
    isGrenade?: boolean;
    gravity?: number;
    tumbleSpeed?: THREE.Vector3;
    targetPos?: THREE.Vector3;
}

export interface Shockwave {
    mesh: THREE.Mesh;
    currentRadius: number;
    maxRadius: number;
    expansionSpeed: number;
    life: number;
    maxLife: number;
    damage: number;
    shooterId: string;
    shooterName: string;
    team: Team;
    epicenter: THREE.Vector3;
    damagedUnits: Set<string>;
}

export interface Particle {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    sizeStart: number;
    sizeEnd: number;
    gravity?: number;
    drag?: number;
    rotSpeed?: THREE.Vector3;
    startColor?: THREE.Color;
    endColor?: THREE.Color;
    fadeOpacity?: boolean;
}

export interface ExplosiveBarrel {
    mesh: THREE.Mesh;
    pos: THREE.Vector3;
    hp: number;
    isExploded: boolean;
}

export interface WorldObstacle {
    type: 'box' | 'circle';
    minX?: number;
    maxX?: number;
    minZ?: number;
    maxZ?: number;
    centerX?: number;
    centerZ?: number;
    radius?: number;
    height: number;
}
