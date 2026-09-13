import * as THREE from 'three';
import { AvatarRig } from '../../shared/avatar/AvatarRig';

export type Role = 'murderer' | 'sheriff' | 'innocent';
export type GameState = 'lobby' | 'map_vote' | 'role_reveal' | 'in_game' | 'round_end';
export type MapId = 'hotel2' | 'milbase' | 'office' | 'vacation' | 'yatchy';

export interface MapConfig {
    id: MapId;
    name: string;
    icon: string;
    description: string;
    spawnPoints: [number, number, number][];
    coinSpawns: [number, number, number][];
}

export interface Character {
    id: string;
    name: string;
    isPlayer: boolean;
    role: Role;
    isAlive: boolean;
    hasWeaponEquipped: boolean;
    mesh: THREE.Group;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    rotation: number;
    knifeMesh?: THREE.Group | THREE.Mesh;
    gunMesh?: THREE.Group;
    bodyMesh?: THREE.Mesh;
    headMesh?: THREE.Mesh;
    leftLeg?: THREE.Group;
    rightLeg?: THREE.Group;
    leftArm?: THREE.Group;
    rightArm?: THREE.Group;
    avatarRig?: AvatarRig;
    aiTarget?: THREE.Vector3;
    aiTimer: number;
    coins: number;
    walkAnimTimer?: number;
}

export interface DroppedGun {
    mesh: THREE.Group;
    position: THREE.Vector3;
    active: boolean;
}

export interface CoinItem {
    mesh: THREE.Group;
    position: THREE.Vector3;
    collected: boolean;
}

export type CrateTier = 
    | 'common' 
    | 'uncommon' 
    | 'rare' 
    | 'epic' 
    | 'legendary' 
    | 'cosmic' 
    | 'secret' 
    | 'og'
    | 'frostbite'
    | 'inferno'
    | 'cyberpunk'
    | 'vampire'
    | 'set_golden'
    | 'set_hellfire'
    | 'set_cyberghost'
    | 'set_voidgalaxy';

export interface WeaponSkinDef {
    id: string;
    name: string;
    tier: CrateTier;
    type: 'knife' | 'gun';
    description: string;
    color: number;
    bladeColor?: number;
    handleColor?: number;
    emissive?: number;
    metalness?: number;
    roughness?: number;
    lore?: string;
    svgColor?: string;
}

export interface CrateDef {
    id: CrateTier;
    name: string;
    price: number;
    color: string;
    badge: string;
    initialStock: number;
    restockIntervalSec: number;
    knifeSkinId: string;
    gunSkinId: string;
    isSetCrate?: boolean;
    setKnifeSkinId?: string;
    setGunSkinId?: string;
}

export interface InventoryData {
    money: number;
    crates: Record<string, number>;
    skins: string[];
    equippedKnife: string;
    equippedGun: string;
}

export interface CrateStockData {
    stock: number;
    nextRestockTime: number;
}
