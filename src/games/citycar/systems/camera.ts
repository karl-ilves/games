import * as THREE from 'three';
import { CameraMode } from '../types';
import { CAMERA_CONFIGS } from '../catalog';

export class CameraFollowSystem {
    private camera: THREE.PerspectiveCamera;
    private currentMode: CameraMode = 'chase';
    private currentPos = new THREE.Vector3();
    private currentLookAt = new THREE.Vector3();

    constructor(camera: THREE.PerspectiveCamera) {
        this.camera = camera;
    }

    public setMode(mode: CameraMode): void {
        this.currentMode = mode;
        const config = CAMERA_CONFIGS[mode];
        if (config) {
            this.camera.fov = config.fov;
            this.camera.updateProjectionMatrix();
        }
    }

    public getMode(): CameraMode {
        return this.currentMode;
    }

    public update(dt: number, carPos: THREE.Vector3, carYaw: number): void {
        const delta = Math.min(dt, 0.1);
        const config = CAMERA_CONFIGS[this.currentMode];

        // Transform camera offset by car yaw rotation
        // In our coordinate setup:
        // When carYaw = 0, forward is +Z, backward is -Z.
        // config.offset is [x, y, z] relative to car.
        const cosY = Math.cos(carYaw);
        const sinY = Math.sin(carYaw);

        const offsetX = config.offset[0] * cosY + config.offset[2] * sinY;
        const offsetY = config.offset[1];
        const offsetZ = -config.offset[0] * sinY + config.offset[2] * cosY;

        const targetCamPos = new THREE.Vector3(
            carPos.x + offsetX,
            carPos.y + offsetY,
            carPos.z + offsetZ
        );

        const lookX = config.lookAtOffset[0] * cosY + config.lookAtOffset[2] * sinY;
        const lookY = config.lookAtOffset[1];
        const lookZ = -config.lookAtOffset[0] * sinY + config.lookAtOffset[2] * cosY;

        const targetLookAt = new THREE.Vector3(
            carPos.x + lookX,
            carPos.y + lookY,
            carPos.z + lookZ
        );

        if (this.currentPos.lengthSq() < 1) {
            this.currentPos.copy(targetCamPos);
            this.currentLookAt.copy(targetLookAt);
        } else {
            // Smooth damp position and lookAt
            const lerpFactor = this.currentMode === 'hood' ? 25 : 8.0;
            this.currentPos.lerp(targetCamPos, delta * lerpFactor);
            this.currentLookAt.lerp(targetLookAt, delta * lerpFactor);
        }

        this.camera.position.copy(this.currentPos);
        this.camera.lookAt(this.currentLookAt);
    }
}
