import * as THREE from 'three';

export class ThirdPersonFollowCamera {
    private camera: THREE.PerspectiveCamera;
    public angleY: number = 0;
    public angleX: number = 0.35;
    private distance: number = 9.0;
    private isDragging: boolean = false;
    private prevMouse = { x: 0, y: 0 };

    constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
        this.camera = camera;
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

            this.angleY -= dx * 0.005;
            this.angleX = Math.max(0.05, Math.min(Math.PI / 2.3, this.angleX + dy * 0.005));
        });

        domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.distance = Math.max(3.0, Math.min(30.0, this.distance + e.deltaY * 0.02));
        }, { passive: false });
    }

    public update(targetPos: THREE.Vector3) {
        // Position camera behind target based on angles
        const offsetX = Math.sin(this.angleY) * Math.cos(this.angleX) * this.distance;
        const offsetY = Math.sin(this.angleX) * this.distance;
        const offsetZ = Math.cos(this.angleY) * Math.cos(this.angleX) * this.distance;

        this.camera.position.set(
            targetPos.x + offsetX,
            targetPos.y + offsetY + 1.6,
            targetPos.z + offsetZ
        );

        this.camera.lookAt(targetPos.x, targetPos.y + 1.5, targetPos.z);
    }
}
