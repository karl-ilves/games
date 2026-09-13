import * as THREE from 'three';
import { RocketType } from '../types';

export class TargetingSystem {
    public targetRing: THREE.Group;
    public ringPosition = new THREE.Vector3(0, 0.2, 0);
    public ringMaterial: THREE.MeshBasicMaterial;
    public beaconBeam: THREE.Mesh;
    public trauma: number = 0;

    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private raycaster = new THREE.Raycaster();
    private mouseCoords = new THREE.Vector2(0, 0);

    constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, initialRocket: RocketType) {
        this.scene = scene;
        this.camera = camera;
        this.targetRing = new THREE.Group();

        this.ringMaterial = new THREE.MeshBasicMaterial({
            color: initialRocket.color,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });

        const beamGeo = new THREE.CylinderGeometry(0.35, 3.2, 60, 16, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({
            color: initialRocket.color,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        this.beaconBeam = new THREE.Mesh(beamGeo, beamMat);
        this.beaconBeam.position.y = 30;

        this.buildRingMesh();
    }

    private buildRingMesh() {
        const outerRingGeo = new THREE.RingGeometry(4.4, 5.0, 48);
        const outerRing = new THREE.Mesh(outerRingGeo, this.ringMaterial);
        outerRing.rotation.x = -Math.PI / 2;
        this.targetRing.add(outerRing);

        const midRingGeo = new THREE.RingGeometry(2.4, 2.8, 36);
        const midRing = new THREE.Mesh(midRingGeo, this.ringMaterial);
        midRing.rotation.x = -Math.PI / 2;
        this.targetRing.add(midRing);

        const centerDotGeo = new THREE.CircleGeometry(0.85, 24);
        const centerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        const centerDot = new THREE.Mesh(centerDotGeo, centerMat);
        centerDot.rotation.x = -Math.PI / 2;
        this.targetRing.add(centerDot);

        const tickGeo = new THREE.PlaneGeometry(0.38, 2.4);
        const makeTick = (x: number, z: number, rotY: number) => {
            const tick = new THREE.Mesh(tickGeo, this.ringMaterial);
            tick.rotation.x = -Math.PI / 2;
            tick.rotation.z = rotY;
            tick.position.set(x, 0.02, z);
            this.targetRing.add(tick);
        };
        makeTick(0, -5.8, 0);
        makeTick(0, 5.8, 0);
        makeTick(-5.8, 0, Math.PI / 2);
        makeTick(5.8, 0, Math.PI / 2);

        this.targetRing.add(this.beaconBeam);
        this.targetRing.position.copy(this.ringPosition);
        this.scene.add(this.targetRing);
    }

    public updateColor(color: number) {
        this.ringMaterial.color.setHex(color);
        (this.beaconBeam.material as THREE.MeshBasicMaterial).color.setHex(color);
    }

    public handleMouseMove(clientX: number, clientY: number, groundPlane: THREE.Mesh | null) {
        this.mouseCoords.x = (clientX / window.innerWidth) * 2 - 1;
        this.mouseCoords.y = -(clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouseCoords, this.camera);
        if (groundPlane) {
            const intersects = this.raycaster.intersectObjects([groundPlane, ...this.scene.children], true);
            for (const hit of intersects) {
                if (hit.object !== this.beaconBeam && hit.point) {
                    this.ringPosition.x = Math.max(-140, Math.min(140, hit.point.x));
                    this.ringPosition.z = Math.max(-140, Math.min(140, hit.point.z));
                    this.ringPosition.y = Math.max(0.2, hit.point.y + 0.1);
                    break;
                }
            }
        }
    }

    public update(dt: number, keys: { [key: string]: boolean }, mobileMoveVector: { x: number; y: number }, isMobileDevice: boolean) {
        let moveX = 0;
        let moveZ = 0;

        if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

        if (isMobileDevice && (mobileMoveVector.x !== 0 || mobileMoveVector.y !== 0)) {
            moveX = mobileMoveVector.x;
            moveZ = mobileMoveVector.y;
        }

        const ringSpeed = 46.0;
        this.ringPosition.x += moveX * ringSpeed * dt;
        this.ringPosition.z += moveZ * ringSpeed * dt;

        this.ringPosition.x = Math.max(-140, Math.min(140, this.ringPosition.x));
        this.ringPosition.z = Math.max(-140, Math.min(140, this.ringPosition.z));

        this.targetRing.position.copy(this.ringPosition);
        this.targetRing.rotation.y += dt * 1.6;

        // Smooth overhead camera tracking
        const targetCamX = this.ringPosition.x * 0.45;
        const targetCamZ = this.ringPosition.z * 0.45 + 56;
        const targetCamY = 78;

        this.camera.position.x += (targetCamX - this.camera.position.x) * 4 * dt;
        this.camera.position.z += (targetCamZ - this.camera.position.z) * 4 * dt;
        this.camera.position.y += (targetCamY - this.camera.position.y) * 4 * dt;

        // Violent trauma shake
        if (this.trauma > 0) {
            const shake = this.trauma * this.trauma * 5.0;
            this.camera.position.x += (Math.random() - 0.5) * shake;
            this.camera.position.y += (Math.random() - 0.5) * shake;
            this.camera.position.z += (Math.random() - 0.5) * shake;
            this.trauma = Math.max(0, this.trauma - dt * 2.2);
        }

        const lookAtTarget = new THREE.Vector3(this.ringPosition.x * 0.6, 0, this.ringPosition.z * 0.6 - 6);
        this.camera.lookAt(lookAtTarget);
    }
}
