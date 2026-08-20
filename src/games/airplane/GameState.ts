import * as THREE from 'three';

export class GameState {
    static scene: THREE.Scene;
    static camera: THREE.PerspectiveCamera;
    static renderer: THREE.WebGLRenderer;
    
    // UI state
    static gameState: 'intro' | 'playing' | 'crashed' = 'intro';
    
    // Objects
    static playerMesh: THREE.Group;
    static airplaneSpeed = 0;
    static airplaneAltitude = 0;
    static airplaneHeading = 0;
    
    static fireParticles: THREE.Mesh[] = [];
    static grassFires: THREE.Mesh[] = [];
    static firetrucks: any[] = [];
    static policeCars: any[] = [];
    
    static rescueTarget: any = null;
    
    // Add more shared state here...
}
