import * as THREE from 'three';
import { AvatarRig } from '../../../shared/avatar/AvatarRig';
import { avatarService } from '../../../shared/avatar/AvatarService';

export class PlayerAvatarSystem {
    public rig: AvatarRig;
    public position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    public rotationY: number = 0;
    private velocity: THREE.Vector3 = new THREE.Vector3();
    private isMoving: boolean = false;
    private keys: Record<string, boolean> = {};

    constructor(scene: THREE.Scene) {
        // Load player's own avatar config from AvatarService
        const config = avatarService.getConfig();

        this.rig = new AvatarRig(config);
        this.rig.rootGroup.position.set(0, 0, 0);
        scene.add(this.rig.rootGroup);

        this.initInput();
    }

    private initInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            this.keys[e.code] = false;
        });
    }

    public update(delta: number, cameraAngleY: number) {
        // WASD / Arrow movement relative to camera
        const forward = (this.keys['w'] || this.keys['arrowup'] ? 1 : 0) - (this.keys['s'] || this.keys['arrowdown'] ? 1 : 0);
        const strafe = (this.keys['d'] || this.keys['arrowright'] ? 1 : 0) - (this.keys['a'] || this.keys['arrowleft'] ? 1 : 0);

        const moveDir = new THREE.Vector3(strafe, 0, -forward);
        this.isMoving = moveDir.lengthSq() > 0;

        if (this.isMoving) {
            moveDir.normalize();
            // Rotate move direction by camera's azimuthal angle
            moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngleY);

            const speed = 7.0;
            this.position.x += moveDir.x * speed * delta;
            this.position.z += moveDir.z * speed * delta;

            // Clamping inside water park grounds
            this.position.x = Math.max(-55, Math.min(55, this.position.x));
            this.position.z = Math.max(-55, Math.min(55, this.position.z));

            // Smoothly rotate avatar towards movement direction
            const targetRot = Math.atan2(moveDir.x, moveDir.z);
            let diff = targetRot - this.rotationY;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.rotationY += diff * 12 * delta;
        }

        this.rig.rootGroup.position.copy(this.position);
        this.rig.rootGroup.rotation.y = this.rotationY;

        // Animate legs and arms using AvatarRig
        const time = performance.now() * 0.001;
        const animState = this.isMoving ? 'walk' : 'idle';
        this.rig.updateAnimation(time, animState);
    }
}
