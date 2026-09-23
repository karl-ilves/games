import * as THREE from 'three';
import { CameraMode } from '../types';
import { CAMERA_CONFIGS } from '../catalog';

export class CameraFollowSystem {
    private camera: THREE.PerspectiveCamera;
    private currentMode: CameraMode = 'chase';
    private currentPos = new THREE.Vector3();
    private currentLookAt = new THREE.Vector3();
    private isCrashZooming = false;
    private crashZoomElapsed = 0;
    private crashDuration = 5.0;
    private crashCarPos = new THREE.Vector3();
    private crashCarYaw = 0;

    public onCrashZoomComplete?: () => void;

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

    /**
     * User requirement: "su vaade suumib välja 5 sek ja siis tuleb tekst You die ja põhjendus ja all on nupp jälle reset"
     */
    public triggerCrashZoom(carPos: THREE.Vector3, carYaw: number, duration = 5.0): void {
        this.isCrashZooming = true;
        this.crashZoomElapsed = 0;
        this.crashDuration = duration;
        this.crashCarPos.copy(carPos);
        this.crashCarYaw = carYaw;
    }

    public resetCrashZoom(): void {
        this.isCrashZooming = false;
        this.crashZoomElapsed = 0;
        const config = CAMERA_CONFIGS[this.currentMode];
        if (config) {
            this.camera.fov = config.fov;
            this.camera.updateProjectionMatrix();
        }
    }

    public isCrashZoomActive(): boolean {
        return this.isCrashZooming;
    }

    public getCrashZoomElapsed(): number {
        return this.crashZoomElapsed;
    }

    public update(dt: number, carPos: THREE.Vector3, carYaw: number): void {
        const delta = this.isCrashZooming ? dt : Math.min(dt, 0.1);

        // Crash zoom-out state: smooth 5-second cinematic pull-out
        if (this.isCrashZooming) {
            const wasBelow = this.crashZoomElapsed < this.crashDuration;
            this.crashZoomElapsed += delta;
            const progress = Math.min(this.crashZoomElapsed / this.crashDuration, 1.0);

            // Smooth cubic ease out
            const easeT = 1.0 - Math.pow(1.0 - progress, 3);

            const sinY = Math.sin(this.crashCarYaw);
            const cosY = Math.cos(this.crashCarYaw);

            const startY = 3.2;
            const targetY = 18.0;
            const startZ = -7.5;
            const targetZ = -26.0;

            const curOffsetY = THREE.MathUtils.lerp(startY, targetY, easeT);
            const curOffsetZ = THREE.MathUtils.lerp(startZ, targetZ, easeT);

            const camX = this.crashCarPos.x + curOffsetZ * sinY;
            const camY = this.crashCarPos.y + curOffsetY;
            const camZ = this.crashCarPos.z + curOffsetZ * cosY;

            this.camera.position.set(camX, camY, camZ);
            this.camera.lookAt(this.crashCarPos.x, this.crashCarPos.y + 0.6, this.crashCarPos.z);

            if (wasBelow && this.crashZoomElapsed >= this.crashDuration) {
                this.onCrashZoomComplete?.();
            }
            return;
        }

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
