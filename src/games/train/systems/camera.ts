import * as THREE from 'three';
import { CameraMode } from '../types';

export function updateCamera(
    camera: THREE.PerspectiveCamera,
    locomotiveGroup: THREE.Group | null,
    cameraMode: CameraMode
) {
    if (!locomotiveGroup || !camera) return;

    const locoPos = locomotiveGroup.position;
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(locomotiveGroup.quaternion);

    if (cameraMode === 0) {
        // Mode 0: 3rd Person Follow Chase Camera
        const targetCamPos = locoPos.clone().sub(forward.clone().multiplyScalar(22)).add(new THREE.Vector3(0, 10, 0));
        camera.position.lerp(targetCamPos, 0.08);
        camera.lookAt(locoPos.clone().add(new THREE.Vector3(0, 3, 0)));
    } else if (cameraMode === 1) {
        // Mode 1: Cab Interior View (Driver's Eye looking through windshield)
        const cabEye = locoPos.clone().add(new THREE.Vector3(0, 3.4, -2.8).applyQuaternion(locomotiveGroup.quaternion));
        camera.position.copy(cabEye);
        const lookAhead = cabEye.clone().add(forward.clone().multiplyScalar(30));
        camera.lookAt(lookAhead);
    } else if (cameraMode === 2) {
        // Mode 2: Side Cinematic Flyby Camera
        const sideOffset = new THREE.Vector3(18, 5, 5).applyQuaternion(locomotiveGroup.quaternion);
        camera.position.lerp(locoPos.clone().add(sideOffset), 0.05);
        camera.lookAt(locoPos);
    } else if (cameraMode === 3) {
        // Mode 3: Top-Down Tactical Birds-Eye Map
        camera.position.set(locoPos.x, locoPos.y + 140, locoPos.z);
        camera.lookAt(locoPos);
    }
}
