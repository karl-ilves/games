import * as THREE from 'three';

export type GameState = 'intro_station' | 'intro_riding' | 'intro_first_stop' | 'intro_departing' | 'player_free' | 'inspecting' | 'keypad' | 'dragged_death' | 'golden_shop' | 'dead' | 'start_screen';
export type DirectionBranch = 'right' | 'left' | 'undecided';

export interface AnomalyEvent {
    id: string;
    carIndex: number;
    triggered: boolean;
    active: boolean;
    timer: number;
}

export interface AIPassenger {
    group: THREE.Group;
    head: THREE.Object3D;
    body: THREE.Object3D;
    isSitting: boolean;
    seatPos: THREE.Vector3;
    animType: 'phone' | 'look_window' | 'reading' | 'uncanny_stare' | 'chat';
    baseRotY: number;
    targetRotY: number;
    isCreepy: boolean;
    phoneMesh?: THREE.Mesh;
    headphones?: boolean;
    thumbLeft?: THREE.Mesh;
    thumbRight?: THREE.Mesh;
}

export interface CarriageData {
    index: number;
    branch: DirectionBranch;
    theme: 'normal' | 'flicker' | 'dark' | 'abandoned' | 'neon' | 'lounge' | 'archive' | 'anomaly' | 'golden_shop';
    group: THREE.Group;
    lights: THREE.PointLight[];
    lightMeshes: THREE.Mesh[];
    passengers: AIPassenger[];
    doorFront: THREE.Group;
    doorBack: THREE.Group;
    mapMesh?: THREE.Mesh | THREE.Group;
    puzzleSolved: boolean;
    puzzleCode?: string;
    hasKeypad?: boolean;
    inspectableItem?: THREE.Group;
    inspectableText?: { titleEt: string; descEt: string; titleEn: string; descEn: string };
}

export interface ShopItem {
    id: string;
    icon: string;
    nameEt: string;
    nameEn: string;
    descEt: string;
    descEn: string;
    price: number;
}

export interface ClueItem {
    id: string;
    nameEt: string;
    nameEn: string;
    descEt: string;
    descEn: string;
    secretEt: string;
    secretEn: string;
    type: 'document' | 'photo' | 'cassette' | 'disk' | 'newspaper' | 'blueprint' | 'keycard';
    discoveredInCarriage: number;
    hintEt: string;
    hintEn: string;
    unlocked: boolean;
}
