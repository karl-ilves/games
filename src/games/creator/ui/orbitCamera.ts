import * as THREE from 'three';
import { csState,  camera, orbitTarget, orbitRadius, orbitTheta, orbitPhi } from '../state/creatorState';

export function updateOrbitCamera() {
    const x = orbitTarget.x + orbitRadius * Math.sin(orbitPhi) * Math.sin(orbitTheta);
    const y = orbitTarget.y + orbitRadius * Math.cos(orbitPhi);
    const z = orbitTarget.z + orbitRadius * Math.sin(orbitPhi) * Math.cos(orbitTheta);
    camera.position.set(x, y, z);
    camera.lookAt(orbitTarget);
}
