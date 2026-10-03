import * as THREE from 'three';
import { CameraViewMode, FlightStateData } from '../types';

export class FlightCameraSystem {
    public camera: THREE.PerspectiveCamera;
    public mode: CameraViewMode = 'chase';

    private currentPos: THREE.Vector3 = new THREE.Vector3();
    private currentTarget: THREE.Vector3 = new THREE.Vector3();
    private baseFov: number = 60;

    constructor(camera: THREE.PerspectiveCamera) {
        this.camera = camera;
        this.baseFov = camera.fov;
    }

    public cycleCamera(): CameraViewMode {
        const modes: CameraViewMode[] = ['chase', 'cockpit', 'wing', 'flyby'];
        const idx = modes.indexOf(this.mode);
        this.mode = modes[(idx + 1) % modes.length];
        return this.mode;
    }

    public update(
        delta: number,
        planePos: THREE.Vector3,
        planeQuat: THREE.Quaternion,
        state: FlightStateData,
        isFighter: boolean
    ): void {
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(planeQuat);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(planeQuat);

        // Dynamic FOV based on speed and afterburner
        let targetFov = this.baseFov + (state.airspeed / 600) * 15;
        if (state.afterburner) targetFov += 10;
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 4.0, delta);
        this.camera.updateProjectionMatrix();

        if (this.mode === 'cockpit') {
            // First-person cockpit view
            const cockpitOffset = forward.clone().multiplyScalar(isFighter ? 1.4 : 1.8)
                .add(up.clone().multiplyScalar(isFighter ? 0.65 : 0.85));

            this.camera.position.copy(planePos).add(cockpitOffset);

            const lookTarget = planePos.clone().add(forward.clone().multiplyScalar(80));
            this.camera.lookAt(lookTarget);

        } else if (this.mode === 'wing') {
            // Wing view
            const wingOffset = right.clone().multiplyScalar(isFighter ? 4.5 : 8.5)
                .add(forward.clone().multiplyScalar(-1.5))
                .add(up.clone().multiplyScalar(0.4));

            this.camera.position.copy(planePos).add(wingOffset);
            const lookTarget = planePos.clone().add(forward.clone().multiplyScalar(30));
            this.camera.lookAt(lookTarget);

        } else if (this.mode === 'flyby') {
            // Flyby cinematic angle
            if (this.currentPos.distanceTo(planePos) > 400 || this.currentPos.lengthSq() === 0) {
                this.currentPos.copy(planePos).add(forward.clone().multiplyScalar(150)).add(new THREE.Vector3(40, 20, 40));
            }
            this.camera.position.copy(this.currentPos);
            this.camera.lookAt(planePos);

        } else {
            // Chase 3D Follow Cam (Default)
            const chaseDist = isFighter ? 18 : 24;
            const chaseHeight = isFighter ? 4.5 : 6.0;

            const desiredPos = planePos.clone()
                .sub(forward.clone().multiplyScalar(chaseDist))
                .add(up.clone().multiplyScalar(chaseHeight));

            const desiredTarget = planePos.clone().add(forward.clone().multiplyScalar(12));

            // Smooth damping
            this.currentPos.lerp(desiredPos, 1.0 - Math.exp(-6.0 * delta));
            this.currentTarget.lerp(desiredTarget, 1.0 - Math.exp(-8.0 * delta));

            this.camera.position.copy(this.currentPos);
            this.camera.lookAt(this.currentTarget);
        }
    }
}
