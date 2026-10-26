import * as THREE from 'three';
import { AvatarRig } from '../../../shared/avatar/AvatarRig';
import { avatarService } from '../../../shared/avatar/AvatarService';

export class PlayerAvatarSystem {
    public rig: AvatarRig;
    public position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    public characterYaw: number = 0;
    public velocityY: number = 0;
    public isGrounded: boolean = true;
    public isMoving: boolean = false;
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

    public update(delta: number) {
        // Creator Studio exact movement & turning controls:
        // Turn view with A / D or ArrowLeft / ArrowRight
        const turnSpeed = 2.8;
        if (this.keys['KeyA'] || this.keys['ArrowLeft'] || this.keys['a']) {
            this.characterYaw += turnSpeed * delta;
        }
        if (this.keys['KeyD'] || this.keys['ArrowRight'] || this.keys['d']) {
            this.characterYaw -= turnSpeed * delta;
        }

        // Only W and S move the player! (W = forward in view direction, S = backward)
        let moveMagnitude = 0;
        if (this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['w']) moveMagnitude += 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown'] || this.keys['s']) moveMagnitude -= 1;

        const forwardX = Math.sin(this.characterYaw);
        const forwardZ = Math.cos(this.characterYaw);

        const moveSpeed = 9.0;
        const hasHoriMove = moveMagnitude !== 0;
        this.isMoving = hasHoriMove;

        if (hasHoriMove) {
            this.position.x += forwardX * moveMagnitude * moveSpeed * delta;
            this.position.z += forwardZ * moveMagnitude * moveSpeed * delta;

            // Clamping inside water park grounds
            this.position.x = Math.max(-55, Math.min(55, this.position.x));
            this.position.z = Math.max(-55, Math.min(55, this.position.z));
        }

        // Jump & Gravity (Creator Studio physics)
        if ((this.keys['Space'] || this.keys[' ']) && this.isGrounded) {
            this.velocityY = 9.0;
            this.isGrounded = false;
        }

        if (!this.isGrounded) {
            this.velocityY -= 22 * delta;
            this.position.y += this.velocityY * delta;
            if (this.position.y <= 0) {
                this.position.y = 0;
                this.velocityY = 0;
                this.isGrounded = true;
            }
        }

        // Smooth rotation to characterYaw
        this.rig.rootGroup.position.copy(this.position);
        this.rig.rootGroup.rotation.y = THREE.MathUtils.lerp(this.rig.rootGroup.rotation.y, this.characterYaw, 0.25);

        // Animate legs and arms using AvatarRig
        const time = performance.now() * 0.001;
        let animState: 'idle' | 'walk' | 'run' | 'jump' = 'idle';
        if (!this.isGrounded) {
            animState = 'jump';
        } else if (hasHoriMove) {
            animState = 'run';
        }
        this.rig.updateAnimation(time, animState);
    }
}
