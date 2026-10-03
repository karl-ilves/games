import * as THREE from 'three';
import { CreatedGame } from '../../shared/yardService';
import { AvatarRig } from '../../shared/avatar/AvatarRig';

export interface PlayInventoryItem {
    id: string;
    name: string;
    icon: string;
    type: string;
}

export interface PlayGameState {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    clock: THREE.Clock;
    humanCharacter: THREE.Group;
    characterVelocity: THREE.Vector3;
    isGrounded: boolean;
    characterYaw: number;
    keys: { [key: string]: boolean };
    currentGame: CreatedGame | null;
    sceneObjects: THREE.Group[];
    playerAvatarRig: AvatarRig | null;
    playerHealth: number;
    playerMaxHealth: number;
    playerInventory: PlayInventoryItem[];
    spawnPointPosition: THREE.Vector3;
    pendingPurchaseObject: { objData: any; group: THREE.Group } | null;
    lastDamageTime: number;
    playerSpeedMultiplier: number;
    playerSpeedBoostEndTime: number;
    oceanWaterMesh: THREE.Mesh | null;
    activeSeaConfig: any;
}
