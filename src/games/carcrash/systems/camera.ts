import * as THREE from 'three';

export class CrashCameraSystem {
    public camera: THREE.PerspectiveCamera;
    public mode: 'chase' | 'hood' | 'cinematic' | 'orbit' = 'chase';
    private currentPos = new THREE.Vector3();
    private currentLookAt = new THREE.Vector3();
    private orbitYaw = 0;
    private orbitPitch = 0.35;
    private orbitDistance = 9.0;
    private isDragging = false;
    private lastPointerX = 0;
    private lastPointerY = 0;

    constructor(camera: THREE.PerspectiveCamera) {
        this.camera = camera;
        this.setupOrbitControls();
    }

    private setupOrbitControls(): void {
        if (typeof window === 'undefined') return;

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0 && e.clientY > 60) {
                this.isDragging = true;
                this.lastPointerX = e.clientX;
                this.lastPointerY = e.clientY;
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const dx = e.clientX - this.lastPointerX;
            const dy = e.clientY - this.lastPointerY;
            this.lastPointerX = e.clientX;
            this.lastPointerY = e.clientY;

            this.orbitYaw -= dx * 0.006;
            this.orbitPitch = Math.max(0.05, Math.min(1.4, this.orbitPitch + dy * 0.006));
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        window.addEventListener('wheel', (e) => {
            this.orbitDistance = Math.max(4.0, Math.min(25.0, this.orbitDistance + e.deltaY * 0.015));
        }, { passive: true });
    }

    public setMode(mode: 'chase' | 'hood' | 'cinematic' | 'orbit'): void {
        this.mode = mode;
    }

    public cycleMode(): 'chase' | 'hood' | 'cinematic' | 'orbit' {
        const modes: ('chase' | 'hood' | 'cinematic' | 'orbit')[] = ['chase', 'hood', 'cinematic', 'orbit'];
        const next = modes[(modes.indexOf(this.mode) + 1) % modes.length];
        this.mode = next;
        return next;
    }

    public update(dt: number, targetPos: THREE.Vector3, targetRot: THREE.Euler, speedKmh: number): void {
        const forward = new THREE.Vector3(0, 0, 1).applyEuler(targetRot).normalize();

        if (this.mode === 'hood') {
            // Bonnet / Hood Camera
            const hoodOffset = forward.clone().multiplyScalar(1.2).add(new THREE.Vector3(0, 1.1, 0));
            const desiredPos = targetPos.clone().add(hoodOffset);
            const lookTarget = targetPos.clone().add(forward.clone().multiplyScalar(20.0)).add(new THREE.Vector3(0, 0.8, 0));
            this.camera.position.copy(desiredPos);
            this.camera.lookAt(lookTarget);

        } else if (this.mode === 'cinematic') {
            // Low dramatic wide-angle trackside cinematic camera
            const sideDist = 12.0;
            const desiredPos = new THREE.Vector3(
                targetPos.x + Math.sin(targetPos.z * 0.05) * sideDist,
                Math.max(1.5, targetPos.y + 1.2),
                targetPos.z + 14.0
            );
            this.currentPos.lerp(desiredPos, dt * 2.5);
            this.camera.position.copy(this.currentPos);
            this.camera.lookAt(targetPos);

        } else {
            // Dynamic Chase & Orbit Camera
            // Follow behind vehicle with high-speed zoom-out and orbit mouse drag support
            const baseDist = this.orbitDistance + Math.min(6.0, (speedKmh / 200.0) * 5.0);
            const camHeight = Math.sin(this.orbitPitch) * baseDist;
            const groundDist = Math.cos(this.orbitPitch) * baseDist;

            // Combine vehicle yaw with user mouse orbit yaw
            const totalYaw = targetRot.y + Math.PI + this.orbitYaw;

            const desiredPos = new THREE.Vector3(
                targetPos.x + Math.sin(totalYaw) * groundDist,
                targetPos.y + Math.max(1.2, camHeight),
                targetPos.z + Math.cos(totalYaw) * groundDist
            );

            const smoothFactor = Math.min(1.0, dt * 8.0);
            this.currentPos.lerp(desiredPos, smoothFactor);
            this.camera.position.copy(this.currentPos);

            const lookTarget = targetPos.clone().add(new THREE.Vector3(0, 1.2, 0));
            this.currentLookAt.lerp(lookTarget, smoothFactor);
            this.camera.lookAt(this.currentLookAt);
        }
    }
}
