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

    public update(
        delta: number,
        keys: { forward: boolean; backward: boolean; left: boolean; right: boolean; jump: boolean }
    ) {
        // EXACT Creator Studio Play Test movement logic:
        // Turn view with A / D or ArrowLeft / ArrowRight
        const turnSpeed = 2.8;
        if (keys.left) {
            this.characterYaw += turnSpeed * delta;
        }
        if (keys.right) {
            this.characterYaw -= turnSpeed * delta;
        }

        // Only W and S move the player! (W = forward in view direction, S = backward)
        let moveMagnitude = 0;
        if (keys.forward) moveMagnitude += 1;
        if (keys.backward) moveMagnitude -= 1;

        const forwardX = Math.sin(this.characterYaw);
        const forwardZ = Math.cos(this.characterYaw);
        const moveSpeed = 9.0;

        const hasHoriMove = moveMagnitude !== 0;
        this.isMoving = hasHoriMove || keys.left || keys.right;

        if (hasHoriMove) {
            this.position.x += forwardX * moveMagnitude * moveSpeed * delta;
            this.position.z += forwardZ * moveMagnitude * moveSpeed * delta;
        }

        // Clamp inside arena
        const distFromCenter = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
        if (distFromCenter > 22) {
            const ratio = 22 / distFromCenter;
            this.position.x *= ratio;
            this.position.z *= ratio;
        }

        // Jump & Gravity on Land (Exact Creator Studio physics: jump velocity = 9, gravity = 22)
        if (keys.jump && this.isGrounded) {
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

        // Smooth rotation to characterYaw (exact factor 0.25 from Creator Studio)
        this.rig.rootGroup.position.copy(this.position);
        this.rig.rootGroup.rotation.y = THREE.MathUtils.lerp(this.rig.rootGroup.rotation.y, this.characterYaw, 0.25);

        // Animate legs and arms matching Creator Studio play test
        const time = performance.now() * 0.001;
        let animState: 'idle' | 'walk' | 'run' | 'jump' = 'idle';
        if (!this.isGrounded) {
            animState = 'jump';
        } else if (hasHoriMove) {
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
