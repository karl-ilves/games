import * as THREE from 'three';
import { AvatarRig } from './AvatarRig';
import { AvatarConfig } from './types';

export class AvatarViewer {
    public container: HTMLElement;
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    public avatarRig: AvatarRig;

    private isDisposed = false;
    private clock = new THREE.Clock();
    private currentEmote: string = 'idle';

    // Orbit controls
    private isDragging = false;
    private previousMousePosition = { x: 0, y: 0 };
    private rotationY = 0;
    private targetRotationY = 0;
    private targetZoom = 3.6;
    private currentZoom = 3.6;

    constructor(container: HTMLElement, config?: AvatarConfig, isMini: boolean = false) {
        this.container = container;
        this.scene = new THREE.Scene();

        const width = container.clientWidth || 300;
        const height = container.clientHeight || 300;

        this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
        this.targetZoom = isMini ? 4.2 : 3.8;
        this.currentZoom = this.targetZoom;
        this.camera.position.set(0, 1.45, this.currentZoom);

        try {
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.container.appendChild(this.renderer.domElement);
        } catch (e) {
            console.warn('WebGL init fallback in AvatarViewer:', e);
            this.renderer = {
                domElement: document.createElement('canvas'),
                setSize: () => {},
                render: () => {},
                dispose: () => {}
            } as any;
        }

        this.setupLights(isMini);

        // Pedestal / Shadow Platform
        const platformGeo = new THREE.CylinderGeometry(1.05, 1.15, 0.08, 32);
        const platformMat = new THREE.MeshStandardMaterial({
            color: 0x1a2332,
            roughness: 0.8,
            metalness: 0.2
        });
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.y = -0.04;
        platform.receiveShadow = true;
        this.scene.add(platform);

        // Blue Neon Base Ring
        const ringGeo = new THREE.RingGeometry(1.06, 1.12, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.001;
        this.scene.add(ring);

        // Avatar Rig
        this.avatarRig = new AvatarRig(config);
        this.scene.add(this.avatarRig.rootGroup);

        this.setupInteractivity();
        this.animate();
    }

    private setupLights(isMini: boolean) {
        // Ambient Light
        const ambient = new THREE.AmbientLight(0xffffff, isMini ? 1.4 : 1.1);
        this.scene.add(ambient);

        // Key Light
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
        keyLight.position.set(3, 5, 4);
        keyLight.castShadow = true;
        this.scene.add(keyLight);

        // Fill Light (Soft Cyan Tint)
        const fillLight = new THREE.DirectionalLight(0x00f2fe, 0.9);
        fillLight.position.set(-3, 3, 2);
        this.scene.add(fillLight);

        // Back Rim Light (Warm Golden/Orange)
        const rimLight = new THREE.DirectionalLight(0xffd32a, 0.8);
        rimLight.position.set(0, 4, -4);
        this.scene.add(rimLight);
    }

    private setupInteractivity() {
        const dom = this.renderer.domElement;
        dom.style.cursor = 'grab';

        dom.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
            dom.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const deltaX = e.clientX - this.previousMousePosition.x;
            this.targetRotationY += deltaX * 0.015;
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            dom.style.cursor = 'grab';
        });

        // Touch support for mobile devices
        dom.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        });

        dom.addEventListener('touchmove', (e) => {
            if (!this.isDragging || e.touches.length !== 1) return;
            const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
            this.targetRotationY += deltaX * 0.02;
            this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        });

        dom.addEventListener('touchend', () => {
            this.isDragging = false;
        });

        // Mouse Wheel Zoom
        dom.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.targetZoom = THREE.MathUtils.clamp(this.targetZoom + e.deltaY * 0.003, 2.2, 5.5);
        }, { passive: false });
    }

    public setEmote(emote: string) {
        this.currentEmote = emote;
    }

    public updateConfig(config: AvatarConfig) {
        this.avatarRig.applyConfig(config);
        if (config.activeEmote) {
            this.currentEmote = config.activeEmote;
        }
    }

    public resize() {
        if (this.isDisposed || !this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width > 0 && height > 0) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        }
    }

    private animate = () => {
        if (this.isDisposed) return;
        requestAnimationFrame(this.animate);

        const elapsedTime = this.clock.getElapsedTime();

        // Smooth rotation damping
        this.rotationY += (this.targetRotationY - this.rotationY) * 0.12;
        this.avatarRig.rootGroup.rotation.y = this.rotationY;

        // Smooth camera zoom damping
        this.currentZoom += (this.targetZoom - this.currentZoom) * 0.1;
        this.camera.position.z = this.currentZoom;

        // Update skeletal animation (breathing, gestures, wave)
        this.avatarRig.updateAnimation(elapsedTime, this.currentEmote);

        this.renderer.render(this.scene, this.camera);
    };

    public dispose() {
        this.isDisposed = true;
        if (this.renderer.domElement && this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        this.renderer.dispose();
    }
}
