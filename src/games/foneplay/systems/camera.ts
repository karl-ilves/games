import * as THREE from 'three';

export class FoneCameraSystem {
    private camera: THREE.PerspectiveCamera;
    public cameraPitch: number = 0.38;
    private distance: number = 7.5;

    constructor(camera: THREE.PerspectiveCamera) {
        this.camera = camera;
    }

    public update(targetPos: THREE.Vector3, characterYaw: number) {
        const offsetX = -Math.sin(characterYaw) * Math.cos(this.cameraPitch) * this.distance;
        const offsetY = Math.sin(this.cameraPitch) * this.distance + 2.2;
        const offsetZ = -Math.cos(characterYaw) * Math.cos(this.cameraPitch) * this.distance;

        const targetCamPos = new THREE.Vector3(
            targetPos.x + offsetX,
            targetPos.y + offsetY,
            targetPos.z + offsetZ
        );

        this.camera.position.lerp(targetCamPos, 0.12);
        this.camera.lookAt(targetPos.x, targetPos.y + 1.2, targetPos.z);
    }
}
