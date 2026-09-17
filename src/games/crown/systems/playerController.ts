import * as THREE from 'three';
import { AvatarRig } from '../../../shared/avatar/AvatarRig';
import { avatarService } from '../../../shared/avatar/AvatarService';
import { GameState } from '../state/gameState';
import { StageBuilder } from '../world/stageBuilder';

export interface PlayerControllerOptions {
    scene: THREE.Scene;
    gameState: GameState;
    stageBuilder: StageBuilder;
    onStageChanged?: (stage: number) => void;
    onVictory?: () => void;
}

export class PlayerController {
    private scene: THREE.Scene;
    private gameState: GameState;
    private stageBuilder: StageBuilder;
    private onStageChanged?: (stage: number) => void;
    private onVictory?: () => void;

    public playerGroup: THREE.Group;
    public avatarRig: AvatarRig | null = null;
    public velocity = new THREE.Vector3();
    public isGrounded = false;
    private jumpsRemaining = 2;
    private jumpForce = 15.0;
    private moveSpeed = 11.5;
    private sprintMultiplier = 1.45;

    private keys: { [key: string]: boolean } = {};

    constructor(options: PlayerControllerOptions) {
        this.scene = options.scene;
        this.gameState = options.gameState;
        this.stageBuilder = options.stageBuilder;
        this.onStageChanged = options.onStageChanged;
        this.onVictory = options.onVictory;

        this.playerGroup = new THREE.Group();
        this.playerGroup.name = 'Crown_PlayerGroup';
        this.scene.add(this.playerGroup);

        this.initCharacter();
        this.initInputListeners();
        this.respawn(false);
    }

    private initCharacter() {
        try {
            const config = avatarService.getConfig();
            this.avatarRig = new AvatarRig(config);
            this.avatarRig.rootGroup.name = 'Crown_Player_AvatarRig';
            this.playerGroup.add(this.avatarRig.rootGroup);

            avatarService.subscribe((newCfg) => {
                if (this.avatarRig) {
                    this.avatarRig.applyConfig(newCfg);
                }
            });
        } catch (e) {
            console.warn('Fallback basic mesh used for crown player:', e);
            // Fallback capsule mesh
            const geo = new THREE.CapsuleGeometry(0.5, 1.2, 8, 16);
            const mat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.y = 1.1;
            this.playerGroup.add(mesh);
        }
    }

    private initInputListeners() {
        window.addEventListener('keydown', (e) => {
            // If typing in chat input, do not capture WASD or Space
            const target = e.target as HTMLElement;
            if (target && target.tagName === 'INPUT') return;

            this.keys[e.code] = true;

            if (e.code === 'Space') {
                this.performJump();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    public performJump() {
        if (this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
            this.jumpsRemaining = 1;
        } else if (this.jumpsRemaining > 0) {
            this.velocity.y = this.jumpForce * 1.05;
            this.jumpsRemaining = 0;
            this.createJumpParticle();
        }
    }

    private createJumpParticle() {
        try {
            const ringGeo = new THREE.RingGeometry(0.3, 1.2, 20);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.copy(this.playerGroup.position);
            ring.position.y += 0.2;
            this.scene.add(ring);

            let opacity = 0.8;
            const fade = () => {
                opacity -= 0.05;
                if (opacity <= 0) {
                    this.scene.remove(ring);
                    ringGeo.dispose();
                    ringMat.dispose();
                } else {
                    ringMat.opacity = opacity;
                    ring.scale.multiplyScalar(1.05);
                    requestAnimationFrame(fade);
                }
            };
            fade();
        } catch (e) {}
    }

    public respawn(resetVelocity: boolean = true) {
        const spawn = this.gameState.getRespawnPos();
        this.playerGroup.position.set(spawn.x, spawn.y + 0.5, spawn.z);
        this.playerGroup.rotation.y = 0; // Face forward along the track
        if (resetVelocity) {
            this.velocity.set(0, 0, 0);
        }
        this.isGrounded = false;
        this.jumpsRemaining = 2;
    }

    public getPosition(): THREE.Vector3 {
        return this.playerGroup.position;
    }

    public update(dt: number, cameraYaw: number) {
        // Horizontal Movement Input
        let inputX = 0;
        let inputZ = 0;

        if (this.keys['KeyW'] || this.keys['ArrowUp']) inputZ -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) inputZ += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) inputX -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) inputX += 1;

        // Camera looks forward towards +Z
        const forward = new THREE.Vector3(Math.sin(cameraYaw), 0, Math.cos(cameraYaw));
        const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));

        const moveDir = new THREE.Vector3();
        moveDir.addScaledVector(forward, -inputZ);
        moveDir.addScaledVector(right, inputX);

        let speed = this.moveSpeed;
        if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) speed *= this.sprintMultiplier;

        if (moveDir.lengthSq() > 0.001) {
            moveDir.normalize();
            this.velocity.x = moveDir.x * speed;
            this.velocity.z = moveDir.z * speed;
            const targetRotY = Math.atan2(moveDir.x, moveDir.z);
            this.playerGroup.rotation.y = targetRotY;
        } else {
            this.velocity.x *= 0.55;
            this.velocity.z *= 0.55;
        }

        // Gravity
        this.velocity.y -= 34.0 * dt;

        // Apply position delta
        this.playerGroup.position.x += this.velocity.x * dt;
        this.playerGroup.position.y += this.velocity.y * dt;
        this.playerGroup.position.z += this.velocity.z * dt;

        // Collision detection Box
        const pPos = this.playerGroup.position;
        const playerMin = new THREE.Vector3(pPos.x - 0.45, pPos.y, pPos.z - 0.45);
        const playerMax = new THREE.Vector3(pPos.x + 0.45, pPos.y + 2.0, pPos.z + 0.45);
        const playerBox = new THREE.Box3(playerMin, playerMax);

        this.isGrounded = false;

        // Check platforms collision
        const platforms = this.stageBuilder.getPlatforms();
        for (let i = 0; i < platforms.length; i++) {
            const platMesh = platforms[i];
            const pMeshBox = new THREE.Box3().setFromObject(platMesh);

            if (playerBox.intersectsBox(pMeshBox)) {
                // Check if landing on top
                if (pPos.y - (this.velocity.y * dt) >= pMeshBox.max.y - 0.45 && this.velocity.y <= 0) {
                    pPos.y = pMeshBox.max.y;
                    this.velocity.y = 0;
                    this.isGrounded = true;
                    this.jumpsRemaining = 2;
                }
            }
        }

        // Check hazard collisions
        const hazards = this.stageBuilder.getHazards();
        for (let i = 0; i < hazards.length; i++) {
            const haz = hazards[i];
            const hazBox = new THREE.Box3().setFromObject(haz.mesh);
            if (playerBox.intersectsBox(hazBox)) {
                this.respawn(true);
                return;
            }
        }

        // Check checkpoints
        const checkpoints = this.stageBuilder.getCheckpoints();
        for (let i = 0; i < checkpoints.length; i++) {
            const cp = checkpoints[i];
            if (pPos.distanceTo(cp.pos) < 3.2) {
                if (cp.stage > this.gameState.getStage()) {
                    const advanced = this.gameState.setStage(cp.stage, { x: cp.pos.x, y: cp.pos.y, z: cp.pos.z });
                    if (advanced) {
                        // Change pad color to highlight activation
                        try {
                            const mat = (cp.padMesh.material as THREE.MeshStandardMaterial);
                            if (mat) {
                                mat.color.setHex(0x00f2fe);
                                mat.emissive.setHex(0x00f2fe);
                                mat.emissiveIntensity = 0.8;
                            }
                        } catch (e) {}

                        if (this.onStageChanged) {
                            this.onStageChanged(cp.stage);
                        }
                    }
                }
            }
        }

        // Void fall
        if (pPos.y < -22) {
            this.respawn(true);
            return;
        }

        // Victory Crown proximity check
        const crownPos = this.stageBuilder.getCrownPosition();
        if (crownPos && pPos.distanceTo(crownPos) < 4.0 && !this.gameState.isGameWon()) {
            this.gameState.handleVictory();
            if (this.onVictory) {
                this.onVictory();
            }
        }

        // Avatar animations
        if (this.avatarRig) {
            const now = performance.now() * 0.001;
            if (!this.isGrounded) {
                this.avatarRig.updateAnimation(now, 'jump');
            } else if (moveDir.lengthSq() > 0.001) {
                const isSprint = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
                this.avatarRig.updateAnimation(now, isSprint ? 'run' : 'walk');
            } else {
                this.avatarRig.updateAnimation(now, 'idle');
            }
        }
    }
}
