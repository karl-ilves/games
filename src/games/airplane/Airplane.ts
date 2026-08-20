import * as THREE from 'three';

export class Airplane {
    mesh: THREE.Group;
    speed: number = 0;
    altitude: number = 0;
    heading: number = 0;
    pitch: number = 0;
    roll: number = 0;
    gearUp: boolean = false;
    isCrashed: boolean = false;
    autopilot: boolean = false;

    constructor() {
        this.mesh = new THREE.Group();
        // Geometry will be built here
    }

    update(dt: number) {
        // Physics update
    }
}
