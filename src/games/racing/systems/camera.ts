import * as THREE from 'three';

export class CameraController {
    public camera: THREE.PerspectiveCamera;

    constructor() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    }

    public updateCamera(playerPos: THREE.Vector3, playerHeading: number): void {
        const offset = new THREE.Vector3(0, 3, 8);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerHeading);

        const targetCamPos = playerPos.clone().add(offset);
        this.camera.position.lerp(targetCamPos, 0.1);

        const lookTarget = playerPos.clone().add(new THREE.Vector3(0, 1, 0));
        this.camera.lookAt(lookTarget);
    }

    public onWindowResize(renderer: THREE.WebGLRenderer): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
