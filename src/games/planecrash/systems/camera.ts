import * as THREE from 'three';
import { CameraMode } from '../types';
import { FlightPhysics } from './flightPhysics';

export class FlightCamera {
    public camera: THREE.PerspectiveCamera;
    public mode: CameraMode = 'chase';
    private currentTargetPos: THREE.Vector3 = new THREE.Vector3();
    private currentCamPos: THREE.Vector3 = new THREE.Vector3();
    private crashFocusPoint: THREE.Vector3 = new THREE.Vector3();
    private crashOrbitAngle: number = 0;

    constructor(fov: number = 65, aspect: number = 16 / 9) {
        this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.5, 10000);
    }

    public toggleMode(): CameraMode {
        if (this.mode === 'chase') this.mode = 'cockpit';
        else if (this.mode === 'cockpit') this.mode = 'chase';
        return this.mode;
    }

    public setCrashMode(crashPosition: THREE.Vector3): void {
        this.mode = 'cinematic_crash';
        this.crashFocusPoint.copy(crashPosition);
        this.crashOrbitAngle = 0;
    }

    public update(dt: number, physics: FlightPhysics): void {
        const planePos = physics.position;
        const planeQuat = physics.quaternion;

        if (this.mode === 'cockpit') {
            // Forward from cockpit
            const offset = new THREE.Vector3(0, 0.8, 0.4).applyQuaternion(planeQuat);
            this.camera.position.copy(planePos).add(offset);

            const lookTarget = new THREE.Vector3(0, 0.8, -20).applyQuaternion(planeQuat).add(planePos);
            this.camera.lookAt(lookTarget);
            this.camera.up.set(0, 1, 0).applyQuaternion(planeQuat);
        } else if (this.mode === 'chase') {
            // Chase camera: sits behind and slightly above plane
            const speedFactor = Math.min(1.5, physics.state.speedKmh / 300);
            const distBehind = 14.0 + speedFactor * 4.0;
            const heightAbove = 4.5 + speedFactor * 1.5;

            const idealOffset = new THREE.Vector3(0, heightAbove, distBehind).applyQuaternion(planeQuat);
            const idealPos = planePos.clone().add(idealOffset);

            // Smooth damping
            const t = THREE.MathUtils.clamp(dt * 6.0, 0, 1);
            this.currentCamPos.lerp(idealPos, t);
            this.camera.position.copy(this.currentCamPos);

            // Look slightly ahead of plane
            const lookAhead = new THREE.Vector3(0, 1.0, -10).applyQuaternion(planeQuat).add(planePos);
            this.currentTargetPos.lerp(lookAhead, t * 1.5);
            this.camera.lookAt(this.currentTargetPos);

            // Smooth up vector banking
            const targetUp = new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat);
            this.camera.up.lerp(targetUp, THREE.MathUtils.clamp(dt * 4.0, 0, 1));
        } else if (this.mode === 'cinematic_crash') {
            // Dramatic orbit around crash wreckage
            this.crashOrbitAngle += dt * 0.45;
            const orbitRadius = 35.0;
            const orbitHeight = 16.0;

            const camX = this.crashFocusPoint.x + Math.sin(this.crashOrbitAngle) * orbitRadius;
            const camZ = this.crashFocusPoint.z + Math.cos(this.crashOrbitAngle) * orbitRadius;
            const camY = this.crashFocusPoint.y + orbitHeight;

            this.camera.position.lerp(new THREE.Vector3(camX, camY, camZ), THREE.MathUtils.clamp(dt * 3.0, 0, 1));
            this.camera.lookAt(this.crashFocusPoint);
            this.camera.up.set(0, 1, 0);
        }
    }
}
