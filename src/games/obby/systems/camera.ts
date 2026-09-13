import * as THREE from 'three';
import { AvatarRig } from '../../../shared/avatar/AvatarRig';

export class CameraController {
    public isFirstPerson = false;
    public cameraOffset = new THREE.Vector3(0, 3.5, 7.5);
    public cameraRotation = { x: 0.25, y: 0 };
    public isPointerDown = false;
    public lastPointerPos = { x: 0, y: 0 };

    public toggleCamera(playerAvatarRig?: AvatarRig) {
        this.isFirstPerson = !this.isFirstPerson;
        const camLabel = document.getElementById('hud-cam-label');
        if (camLabel) camLabel.textContent = this.isFirstPerson ? '1st Person' : '3rd Person';
        if (playerAvatarRig) {
            playerAvatarRig.rootGroup.visible = !this.isFirstPerson;
        }
    }

    public handlePointerDown(x: number, y: number) {
        this.isPointerDown = true;
        this.lastPointerPos = { x, y };
    }

    public handlePointerMove(x: number, y: number) {
        if (!this.isPointerDown) return;
        const dx = x - this.lastPointerPos.x;
        const dy = y - this.lastPointerPos.y;
        this.cameraRotation.y -= dx * 0.005;
        this.cameraRotation.x = Math.max(-0.4, Math.min(1.2, this.cameraRotation.x + dy * 0.005));
        this.lastPointerPos = { x, y };
    }

    public handlePointerUp() {
        this.isPointerDown = false;
    }

    public handleWheel(deltaY: number) {
        this.cameraOffset.z = Math.max(3.0, Math.min(16.0, this.cameraOffset.z + deltaY * 0.01));
    }

    public update(camera: THREE.PerspectiveCamera, playerPos: THREE.Vector3) {
        if (this.isFirstPerson) {
            camera.position.set(playerPos.x, playerPos.y + 1.8, playerPos.z);
            const lookTarget = new THREE.Vector3(
                playerPos.x + Math.sin(this.cameraRotation.y) * 10,
                playerPos.y + 1.8 - Math.tan(this.cameraRotation.x) * 10,
                playerPos.z - Math.cos(this.cameraRotation.y) * 10
            );
            camera.lookAt(lookTarget);
        } else {
            const rotY = this.cameraRotation.y;
            const rotX = this.cameraRotation.x;
            const dist = this.cameraOffset.z;

            const cx = playerPos.x + Math.sin(rotY) * Math.cos(rotX) * dist;
            const cy = playerPos.y + this.cameraOffset.y + Math.sin(rotX) * dist;
            const cz = playerPos.z + Math.cos(rotY) * Math.cos(rotX) * dist;

            camera.position.set(cx, cy, cz);
            camera.lookAt(playerPos.x, playerPos.y + 1.2, playerPos.z);
        }
    }
}
