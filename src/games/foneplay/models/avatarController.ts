import * as THREE from 'three';
import { AvatarRig } from '../../../shared/avatar/AvatarRig';
import { avatarService } from '../../../shared/avatar/AvatarService';

export class FonePlayerAvatar {
    public rig: AvatarRig;
    public position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    public characterYaw: number = 0;
    public velocityY: number = 0;
    public isGrounded: boolean = true;
    public isMoving: boolean = false;

    constructor(scene: THREE.Scene) {
        const config = avatarService.getConfig();
        this.rig = new AvatarRig(config);
        this.rig.rootGroup.position.set(0, 0, 0);
        scene.add(this.rig.rootGroup);
    }

    public update(delta: number, moveVector: { x: number; y: number }, jumpTriggered: boolean) {
        // moveVector.y: -1 = up/forward, 1 = down/backward
        // moveVector.x: -1 = left, 1 = right
        const forwardMag = -moveVector.y;
        const turnMag = moveVector.x;

        // Turn character with horizontal input
        if (Math.abs(turnMag) > 0.05) {
            this.characterYaw -= turnMag * 3.2 * delta;
        }

        const moveSpeed = 8.5;
        const hasForwardMove = Math.abs(forwardMag) > 0.05;
        this.isMoving = hasForwardMove || Math.abs(turnMag) > 0.05;

        if (hasForwardMove) {
            const forwardX = Math.sin(this.characterYaw);
            const forwardZ = Math.cos(this.characterYaw);
            this.position.x += forwardX * forwardMag * moveSpeed * delta;
            this.position.z += forwardZ * forwardMag * moveSpeed * delta;
        }

        // Clamp inside arena pad
        const distFromCenter = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
        if (distFromCenter > 22) {
            const ratio = 22 / distFromCenter;
            this.position.x *= ratio;
            this.position.z *= ratio;
        }

        // Jump handling
        if (jumpTriggered && this.isGrounded) {
            this.velocityY = 9.5;
            this.isGrounded = false;
        }

        // Vertical physics
        if (!this.isGrounded) {
            this.velocityY -= 22 * delta;
            this.position.y += this.velocityY * delta;
            if (this.position.y <= 0) {
                this.position.y = 0;
                this.velocityY = 0;
                this.isGrounded = true;
            }
        }

        // Update Three.js transforms
        this.rig.rootGroup.position.copy(this.position);
        this.rig.rootGroup.rotation.y = this.characterYaw;

        // Animate legs and arms
        const time = performance.now() * 0.001;
        let animState: 'idle' | 'walk' | 'run' | 'jump' = 'idle';
        if (!this.isGrounded) {
            animState = 'jump';
        } else if (this.isMoving) {
            animState = 'run';
        }
        this.rig.updateAnimation(time, animState);
    }

    public reset(position: THREE.Vector3 = new THREE.Vector3(0, 0, 0), yaw: number = 0) {
        this.position.copy(position);
        this.characterYaw = yaw;
        this.velocityY = 0;
        this.isGrounded = true;
        this.isMoving = false;
        this.rig.rootGroup.position.copy(this.position);
        this.rig.rootGroup.rotation.y = this.characterYaw;
    }
}
