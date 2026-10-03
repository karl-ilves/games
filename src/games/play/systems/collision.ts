import * as THREE from 'three';
import { PlayState } from '../state/playState';

export function isPlayerTouchingOrOnTop(playerPos: THREE.Vector3, mesh: THREE.Object3D): boolean {
    if (!mesh) return false;
    const box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty()) return false;

    const playerRadius = 0.5;
    const feetY = playerPos.y;
    const headY = playerPos.y + 1.8;

    if (playerPos.x < box.min.x - playerRadius || playerPos.x > box.max.x + playerRadius ||
        playerPos.z < box.min.z - playerRadius || playerPos.z > box.max.z + playerRadius) {
        return false;
    }

    const minY = box.min.y - 0.25;
    const maxY = box.max.y + 0.45;

    return feetY <= maxY && headY >= minY;
}

export function resolvePlayerCollisions(state: PlayState, delta: number) {
    if (!state.humanCharacter) return;
    const pPos = state.humanCharacter.position;
    const halfW = 0.35;
    const playerHeight = 1.8;
    let supportedOnSurface = (pPos.y <= 0.001);

    for (let i = 0; i < state.sceneObjects.length; i++) {
        const group = state.sceneObjects[i];
        if (group.userData.isPassable) continue;
        const dx = group.position.x - pPos.x;
        const dz = group.position.z - pPos.z;
        if (dx * dx + dz * dz > 400) continue;

        const pMeshBox = new THREE.Box3().setFromObject(group);
        if (pMeshBox.isEmpty()) continue;

        const playerBox = new THREE.Box3(
            new THREE.Vector3(pPos.x - halfW, pPos.y, pPos.z - halfW),
            new THREE.Vector3(pPos.x + halfW, pPos.y + playerHeight, pPos.z + halfW)
        );

        const isHorizontallyOver = (
            pPos.x >= pMeshBox.min.x - 0.15 &&
            pPos.x <= pMeshBox.max.x + 0.15 &&
            pPos.z >= pMeshBox.min.z - 0.15 &&
            pPos.z <= pMeshBox.max.z + 0.15
        );

        if (isHorizontallyOver && Math.abs(pPos.y - pMeshBox.max.y) < 0.15 && state.characterVelocity.y <= 0) {
            pPos.y = pMeshBox.max.y;
            state.characterVelocity.y = 0;
            supportedOnSurface = true;
        }

        if (playerBox.intersectsBox(pMeshBox)) {
            const isAbovePlatform = (pPos.y - (state.characterVelocity.y * delta) >= pMeshBox.max.y - 0.4) || (pPos.y >= pMeshBox.max.y - 0.25);
            const canStepUp = (pMeshBox.max.y - pPos.y <= 0.6) && (pMeshBox.max.y >= pPos.y - 0.05);

            if ((isAbovePlatform && state.characterVelocity.y <= 0) || canStepUp) {
                pPos.y = pMeshBox.max.y;
                state.characterVelocity.y = 0;
                supportedOnSurface = true;
            } else {
                const overlapX = Math.min(playerBox.max.x, pMeshBox.max.x) - Math.max(playerBox.min.x, pMeshBox.min.x);
                const overlapZ = Math.min(playerBox.max.z, pMeshBox.max.z) - Math.max(playerBox.min.z, pMeshBox.min.z);

                if (overlapX > 0.001 && overlapZ > 0.001) {
                    const pCenterX = (playerBox.min.x + playerBox.max.x) * 0.5;
                    const pCenterZ = (playerBox.min.z + playerBox.max.z) * 0.5;
                    const bCenterX = (pMeshBox.min.x + pMeshBox.max.x) * 0.5;
                    const bCenterZ = (pMeshBox.min.z + pMeshBox.max.z) * 0.5;

                    if (overlapX < overlapZ) {
                        if (pCenterX < bCenterX) {
                            pPos.x -= (overlapX + 0.005);
                        } else {
                            pPos.x += (overlapX + 0.005);
                        }
                    } else {
                        if (pCenterZ < bCenterZ) {
                            pPos.z -= (overlapZ + 0.005);
                        } else {
                            pPos.z += (overlapZ + 0.005);
                        }
                    }
                }
            }
        }
    }

    if (supportedOnSurface) {
        state.isGrounded = true;
    } else if (pPos.y > 0.05 && state.isGrounded) {
        state.isGrounded = false;
    }
}
