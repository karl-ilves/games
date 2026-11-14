import * as THREE from 'three';

export class FoneCameraSystem {
    private camera: THREE.PerspectiveCamera;

    constructor(camera: THREE.PerspectiveCamera) {
        this.camera = camera;
    }

    public update(targetPos: THREE.Vector3, characterYaw: number) {
        // Exact 3rd Person Smooth Camera Follow from Creator Studio:
        // camera.position: targetPos.x - Math.sin(characterYaw) * 7, targetPos.y + 4, targetPos.z - Math.cos(characterYaw) * 7
        // lerp: 0.1
        // lookAt: targetPos.x, targetPos.y + 1.6, targetPos.z
        const targetCamPos = new THREE.Vector3(
            targetPos.x - Math.sin(characterYaw) * 7,
            targetPos.y + 4,
            targetPos.z - Math.cos(characterYaw) * 7
        );
        this.camera.position.lerp(targetCamPos, 0.1);
        this.camera.lookAt(targetPos.x, targetPos.y + 1.6, targetPos.z);
    }
}
