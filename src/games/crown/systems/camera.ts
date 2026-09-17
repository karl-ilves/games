import * as THREE from 'three';

export class CameraController {
    public cameraOffset = new THREE.Vector3(0, 3.5, 7.5);
    public cameraRotation = { x: 0.25, y: 0 };
    public isPointerDown = false;
    public lastPointerPos = { x: 0, y: 0 };

    constructor() {
        this.setupPointerListeners();
    }

    private setupPointerListeners() {
        window.addEventListener('pointerdown', (e) => {
            // Ignore UI clicks
            const target = e.target as HTMLElement;
            if (target && (target.closest('.top-hud') || target.closest('#crown-chat-container') || target.closest('#crown-leaderboard-container') || target.closest('#coming-soon-modal') || target.closest('#victory-modal'))) {
                return;
            }
            this.isPointerDown = true;
            this.lastPointerPos = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('pointermove', (e) => {
            if (!this.isPointerDown) return;
            const dx = e.clientX - this.lastPointerPos.x;
            const dy = e.clientY - this.lastPointerPos.y;
            this.cameraRotation.y -= dx * 0.005;
            this.cameraRotation.x = Math.max(-0.4, Math.min(1.2, this.cameraRotation.x + dy * 0.005));
            this.lastPointerPos = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('pointerup', () => {
            this.isPointerDown = false;
        });

        window.addEventListener('wheel', (e) => {
            this.cameraOffset.z = Math.max(3.0, Math.min(18.0, this.cameraOffset.z + e.deltaY * 0.01));
        }, { passive: true });
    }

    public update(camera: THREE.PerspectiveCamera, playerPos: THREE.Vector3) {
        const rotY = this.cameraRotation.y;
        const rotX = this.cameraRotation.x;
        const dist = this.cameraOffset.z;

        // Position camera behind the player looking forward towards +Z
        const cx = playerPos.x - Math.sin(rotY) * Math.cos(rotX) * dist;
        const cy = playerPos.y + this.cameraOffset.y + Math.sin(rotX) * dist;
        const cz = playerPos.z - Math.cos(rotY) * Math.cos(rotX) * dist;

        camera.position.set(cx, cy, cz);
        camera.lookAt(playerPos.x, playerPos.y + 1.2, playerPos.z);
    }
}
