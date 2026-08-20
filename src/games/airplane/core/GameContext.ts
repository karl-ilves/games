import * as THREE from 'three';

export interface GameContext {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    planeGroup: THREE.Group;
    gameState: string;
    antiIceSystem: boolean;
    iceAmount: number;
    setIceAmount: (val: number) => void;
    setAntiIceSystem: (val: boolean) => void;
}
