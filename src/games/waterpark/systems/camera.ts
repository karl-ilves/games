import * as THREE from 'three';
import { CameraViewMode } from '../types';

export class WaterParkCamera {
    private camera: THREE.PerspectiveCamera;
    private mode: CameraViewMode = 'orbit';
    private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    private radius: number = 60;
    private theta: number = Math.PI / 4;
    private phi: number = Math.PI / 3;

    private isDragging: boolean = false;
    private prevMousePos = { x: 0, y: 0 };

    constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
        this.camera = camera;
        this.updateCameraPosition();
        this.initControls(domElement);
    }

    private initControls(domElement: HTMLElement) {
        domElement.addEventListener('pointerdown', (e) => {
            if (e.button === 0 || e.button === 2) {
                this.isDragging = true;
                this.prevMousePos = { x: e.clientX, y: e.clientY };
            }
        });

        window.addEventListener('pointerup', () => {
            this.isDragging = false;
        });

        window.addEventListener('pointermove', (e) => {
            if (!this.isDragging) return;
            const deltaX = e.clientX - this.prevMousePos.x;
            const deltaY = e.clientY - this.prevMousePos.y;
            this.prevMousePos = { x: e.clientX, y: e.clientY };

            this.theta -= deltaX * 0.006;
            this.phi = Math.max(0.1, Math.min(Math.PI / 2.2, this.phi - deltaY * 0.006));
            this.updateCameraPosition();
        });

        domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.radius = Math.max(15, Math.min(140, this.radius + e.deltaY * 0.08));
            this.updateCameraPosition();
        }, { passive: false });
    }

    public updateCameraPosition() {
        if (this.mode === 'orbit') {
            this.camera.position.x = this.target.x + this.radius * Math.sin(this.phi) * Math.sin(this.theta);
            this.camera.position.y = this.target.y + this.radius * Math.cos(this.phi);
            this.camera.position.z = this.target.z + this.radius * Math.sin(this.phi) * Math.cos(this.theta);
            this.camera.lookAt(this.target);
        } else if (this.mode === 'drone') {
            this.camera.position.set(0, 95, 0.1);
            this.camera.lookAt(0, 0, 0);
        }
    }

    public setMode(mode: CameraViewMode) {
        this.mode = mode;
        if (mode === 'slide_ride') {
            // First person water slide view
            this.camera.position.set(0, 14, 2);
            this.camera.lookAt(0, 0, 10);
        } else {
            this.updateCameraPosition();
        }
    }

    public getMode(): CameraViewMode {
        return this.mode;
    }

    public panTarget(dx: number, dz: number) {
        this.target.x += dx;
        this.target.z += dz;
        this.updateCameraPosition();
    }
}
