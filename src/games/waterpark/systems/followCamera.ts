import * as THREE from 'three';

export class ThirdPersonFollowCamera {
    private camera: THREE.PerspectiveCamera;
    public cameraPitch: number = 0.35;
    private distance: number = 8.5;
    private isDragging: boolean = false;
    private prevMouse = { x: 0, y: 0 };
    private onRotateYaw?: (deltaYaw: number) => void;

    constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, onRotateYaw?: (deltaYaw: number) => void) {
        this.camera = camera;
        this.onRotateYaw = onRotateYaw;
        this.initControls(domElement);
    }

    private initControls(domElement: HTMLElement) {
        domElement.addEventListener('pointerdown', (e) => {
            // Drag on right-click or left-click
            if (e.button === 0 || e.button === 2) {
                this.isDragging = true;
                this.prevMouse = { x: e.clientX, y: e.clientY };
            }
        });

        window.addEventListener('pointerup', () => {
            this.isDragging = false;
        });

        window.addEventListener('pointermove', (e) => {
            if (!this.isDragging) return;
            const dx = e.clientX - this.prevMouse.x;
            const dy = e.clientY - this.prevMouse.y;
            this.prevMouse = { x: e.clientX, y: e.clientY };

            // Rotate characterYaw with mouse dx like Creator Studio
            if (this.onRotateYaw) {
                this.onRotateYaw(dx * 0.006);
            }
            this.cameraPitch = Math.max(0.05, Math.min(Math.PI / 2.3, this.cameraPitch + dy * 0.005));
        });

        domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.distance = Math.max(3.0, Math.min(25.0, this.distance + e.deltaY * 0.02));
        }, { passive: false });
    }

    public update(targetPos: THREE.Vector3, characterYaw: number) {
        // Position camera behind target based on characterYaw and pitch
        // Creator studio style 3rd person follow
        const offsetX = -Math.sin(characterYaw) * Math.cos(this.cameraPitch) * this.distance;
        const offsetY = Math.sin(this.cameraPitch) * this.distance + 2.0;
        const offsetZ = -Math.cos(characterYaw) * Math.cos(this.cameraPitch) * this.distance;

        const targetCamPos = new THREE.Vector3(
            targetPos.x + offsetX,
            targetPos.y + offsetY,
            targetPos.z + offsetZ
        );

        this.camera.position.lerp(targetCamPos, 0.15);
        this.camera.lookAt(targetPos.x, targetPos.y + 1.5, targetPos.z);
    }
}
