import * as THREE from 'three';
import { AvatarRig } from '../../../shared/avatar/AvatarRig';
import { avatarService } from '../../../shared/avatar/AvatarService';
import { yardService } from '../../../shared/yardService';
import { InGameEmotesWidget } from '../../../shared/avatar/InGameEmotesWidget';
import { STAGES } from '../catalog';
import { CourseData } from '../world/stageBuilder';
import { ObbyAudio } from '../audio';
import { HudManager } from '../ui/hud';

export interface PlayerContext {
    scene: THREE.Scene;
    audio: ObbyAudio;
    hud: HudManager;
    course: CourseData;
    isOwner: () => boolean;
    getEquippedHat: () => string;
    getEquippedTrail: () => string;
    getEquippedBoots: () => string;
    getEquippedSkin: () => string;
    getCoins: () => number;
    setCoins: (c: number) => void;
    getDeaths: () => number;
    setDeaths: (d: number) => void;
    getCurrentStageIndex: () => number;
    setCurrentStageIndex: (idx: number) => void;
    getCurrentCheckpointIndex: () => number;
    setCurrentCheckpointIndex: (idx: number) => void;
    getMaxUnlockedStage: () => number;
    setMaxUnlockedStage: (stg: number) => void;
    getBestTime: () => number;
    setBestTime: (t: number) => void;
    getElapsedTime: () => number;
    getIsVictory: () => boolean;
    setIsVictory: (v: boolean) => void;
    onSaveGameData: () => void;
    onUpdateHUD: () => void;
}

export class PlayerController {
    private ctx: PlayerContext;

    public playerAvatarRig!: AvatarRig;
    public emotesWidget?: InGameEmotesWidget;
    public playerGroup!: THREE.Group;

    // Movement & Kinematics
    public velocity = new THREE.Vector3();
    public isGrounded = false;
    private currentMovingPlatform: any = null;
    private jumpForce = 14.5;
    private jumpsRemaining = 2;
    private doubleJumpRings: { mesh: THREE.Mesh; timer: number }[] = [];
    private moveSpeed = 11.0;
    private sprintMultiplier = 1.45;

    // Trail
    private playerTrailPoints: THREE.Vector3[] = [];
    private playerTrailMesh!: THREE.Line;

    // Dummy meshes
    public playerBodyMesh!: THREE.Mesh;
    public playerHeadMesh!: THREE.Mesh;
    public playerLeftLeg!: THREE.Mesh;
    public playerRightLeg!: THREE.Mesh;
    public playerLeftArm!: THREE.Mesh;
    public playerRightArm!: THREE.Mesh;
    public playerHatGroup!: THREE.Group;

    constructor(ctx: PlayerContext) {
        this.ctx = ctx;
        this.buildPlayerCharacter();
    }

    private buildPlayerCharacter() {
        this.playerGroup = new THREE.Group();

        // 1. Build & Attach Full Playard 3D AvatarRig
        this.playerAvatarRig = new AvatarRig(avatarService.getConfig());
        this.playerAvatarRig.rootGroup.name = 'Obby_Player_AvatarRig';
        this.playerGroup.add(this.playerAvatarRig.rootGroup);

        // 2. Legacy Dummy Mesh Anchors (invisible, for backwards compatibility)
        const dummyMat = new THREE.MeshBasicMaterial({ visible: false, transparent: true, opacity: 0 });
        const dummyGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        this.playerBodyMesh = new THREE.Mesh(dummyGeo, dummyMat);
        this.playerBodyMesh.visible = false;
        this.playerGroup.add(this.playerBodyMesh);

        this.playerHeadMesh = new THREE.Mesh(dummyGeo, dummyMat);
        this.playerHeadMesh.visible = false;
        this.playerGroup.add(this.playerHeadMesh);

        this.playerLeftArm = new THREE.Mesh(dummyGeo, dummyMat);
        this.playerLeftArm.visible = false;
        this.playerGroup.add(this.playerLeftArm);

        this.playerRightArm = new THREE.Mesh(dummyGeo, dummyMat);
        this.playerRightArm.visible = false;
        this.playerGroup.add(this.playerRightArm);

        this.playerLeftLeg = new THREE.Mesh(dummyGeo, dummyMat);
        this.playerLeftLeg.visible = false;
        this.playerGroup.add(this.playerLeftLeg);

        this.playerRightLeg = new THREE.Mesh(dummyGeo, dummyMat);
        this.playerRightLeg.visible = false;
        this.playerGroup.add(this.playerRightLeg);

        this.playerHatGroup = new THREE.Group();
        this.playerHatGroup.visible = false;
        this.playerGroup.add(this.playerHatGroup);

        this.playerGroup.position.copy(STAGES[0].spawnPos);
        this.ctx.scene.add(this.playerGroup);

        // Particle Trail
        const maxPoints = 25;
        const trailPositions = new Float32Array(maxPoints * 3);
        const trailGeo = new THREE.BufferGeometry();
        trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        const trailMat = new THREE.LineBasicMaterial({ color: 0x00f2fe, linewidth: 3, transparent: true, opacity: 0.8 });
        this.playerTrailMesh = new THREE.Line(trailGeo, trailMat);
        this.ctx.scene.add(this.playerTrailMesh);
    }

    public updateEquippedHatMesh() {
        while (this.playerHatGroup.children.length > 0) {
            this.playerHatGroup.remove(this.playerHatGroup.children[0]);
        }

        const avatarCfg = avatarService.getConfig();
        const effectiveHat = this.ctx.getEquippedHat() !== 'none' ? this.ctx.getEquippedHat() : (avatarCfg?.hatId || 'none');

        if (effectiveHat === 'hat_crown' || effectiveHat === 'hat_royal_crown') {
            const crownGeo = new THREE.CylinderGeometry(0.35, 0.28, 0.25, 8);
            const crownMat = new THREE.MeshLambertMaterial({ color: 0xffd32a });
            const crown = new THREE.Mesh(crownGeo, crownMat);
            this.playerHatGroup.add(crown);
        } else if (effectiveHat === 'hat_viking' || effectiveHat === 'hat_viking_helm') {
            const helmGeo = new THREE.SphereGeometry(0.34, 12, 12);
            const helmMat = new THREE.MeshLambertMaterial({ color: 0x747d8c });
            const helm = new THREE.Mesh(helmGeo, helmMat);
            const hornGeo = new THREE.ConeGeometry(0.08, 0.35, 8);
            const hornMat = new THREE.MeshLambertMaterial({ color: 0xfff200 });
            const hornL = new THREE.Mesh(hornGeo, hornMat);
            hornL.position.set(-0.35, 0.15, 0);
            hornL.rotation.z = Math.PI / 4;
            const hornR = new THREE.Mesh(hornGeo, hornMat);
            hornR.position.set(0.35, 0.15, 0);
            hornR.rotation.z = -Math.PI / 4;
            helm.add(hornL, hornR);
            this.playerHatGroup.add(helm);
        } else if (effectiveHat === 'hat_halo') {
            const haloGeo = new THREE.TorusGeometry(0.36, 0.05, 8, 24);
            const haloMat = new THREE.MeshBasicMaterial({ color: 0xfff200 });
            const halo = new THREE.Mesh(haloGeo, haloMat);
            halo.rotation.x = Math.PI / 2;
            halo.position.y = 0.15;
            this.playerHatGroup.add(halo);
        } else if (effectiveHat === 'hat_tophat') {
            const baseGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.05, 16);
            const topGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.45, 16);
            const topMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
            const tophat = new THREE.Mesh(baseGeo, topMat);
            const cylinder = new THREE.Mesh(topGeo, topMat);
            cylinder.position.y = 0.23;
            tophat.add(cylinder);
            this.playerHatGroup.add(tophat);
        }
    }

    public performJump() {
        let effectiveJumpForce = this.jumpForce;
        if (this.ctx.getEquippedBoots() === 'boots_moon') effectiveJumpForce *= 1.38;

        if (this.isGrounded) {
            this.velocity.y = effectiveJumpForce;
            this.isGrounded = false;
            this.jumpsRemaining = 1;
            this.ctx.audio.playJump();
        } else if (this.jumpsRemaining > 0) {
            this.velocity.y = effectiveJumpForce * 1.08;
            this.jumpsRemaining = 0;
            this.ctx.audio.playDoubleJump();
            this.spawnDoubleJumpRing();
        }
    }

    private spawnDoubleJumpRing() {
        try {
            const ringGeo = new THREE.RingGeometry(0.2, 1.3, 24);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.copy(this.playerGroup.position);
            ring.position.y += 0.2;
            this.ctx.scene.add(ring);
            this.doubleJumpRings.push({ mesh: ring, timer: 0.35 });
        } catch (e) {}
    }

    public respawnPlayer() {
        this.ctx.setDeaths(this.ctx.getDeaths() + 1);
        this.velocity.set(0, 0, 0);
        this.jumpsRemaining = 2;
        this.isGrounded = false;
        const checkpointIdx = this.ctx.getCurrentCheckpointIndex();
        const spawn = STAGES[checkpointIdx].spawnPos;
        this.playerGroup.position.copy(spawn);
        this.playerTrailPoints = [];
        this.ctx.audio.playLava();
        this.ctx.onUpdateHUD();
    }

    public triggerVictory() {
        this.ctx.setIsVictory(true);
        this.ctx.audio.playVictory();

        yardService.addPlayCoins(100, 'Parkour Obby Grand Victory 10/10');

        const cooldownExpiry = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem('playard_obby_cooldown_until', cooldownExpiry.toString());

        const best = this.ctx.getBestTime();
        const elapsed = this.ctx.getElapsedTime();
        if (best === 0 || elapsed < best) {
            this.ctx.setBestTime(elapsed);
            this.ctx.onSaveGameData();
        }

        const vicModal = document.getElementById('modal-victory');
        const vicTime = document.getElementById('victory-time-val');
        const vicDeaths = document.getElementById('victory-deaths-val');
        if (vicTime) vicTime.textContent = this.ctx.hud.formatTime(elapsed);
        if (vicDeaths) vicDeaths.textContent = this.ctx.getDeaths().toString();
        if (vicModal) vicModal.style.display = 'flex';
    }

    public update(dt: number, keys: { [key: string]: boolean }, joystickInput: { x: number; y: number }, camYaw: number) {
        // Horizontal Movement Input
        let inputX = 0;
        let inputZ = 0;

        if (keys['KeyW'] || keys['ArrowUp']) inputZ -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) inputZ += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) inputX -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) inputX += 1;

        if (Math.abs(joystickInput.x) > 0.05 || Math.abs(joystickInput.y) > 0.05) {
            inputX = joystickInput.x;
            inputZ = joystickInput.y;
        }

        const forward = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
        const right = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));

        const moveDir = new THREE.Vector3();
        moveDir.addScaledVector(forward, -inputZ);
        moveDir.addScaledVector(right, inputX);

        let speed = this.moveSpeed;
        if (keys['ShiftLeft'] || keys['ShiftRight']) speed *= this.sprintMultiplier;
        if (this.ctx.getEquippedBoots() === 'boots_speed') speed *= 1.3;

        if (moveDir.lengthSq() > 0.001) {
            moveDir.normalize();
            this.velocity.x = moveDir.x * speed;
            this.velocity.z = moveDir.z * speed;
            const targetRotY = Math.atan2(moveDir.x, moveDir.z);
            this.playerGroup.rotation.y = targetRotY;
        } else {
            this.velocity.x *= 0.6;
            this.velocity.z *= 0.6;
        }

        // Animate Playard 3D AvatarRig
        if (this.playerAvatarRig) {
            const now = performance.now() * 0.001;
            if (!this.isGrounded) {
                this.playerAvatarRig.updateAnimation(now, 'jump');
            } else if (moveDir.lengthSq() > 0.001) {
                const isSprint = keys['ShiftLeft'] || keys['ShiftRight'];
                this.playerAvatarRig.updateAnimation(now, isSprint ? 'run' : 'walk');
            } else {
                const activeEmote = this.emotesWidget?.getActiveEmote() || 'idle';
                this.playerAvatarRig.updateAnimation(now, activeEmote);
            }
        }

        if (keys['Space'] && this.isGrounded) {
            this.performJump();
        }

        this.velocity.y -= 34.0 * dt;

        if (this.currentMovingPlatform && this.isGrounded) {
            this.playerGroup.position.add(this.currentMovingPlatform.delta);
        }

        this.playerGroup.position.x += this.velocity.x * dt;
        this.playerGroup.position.y += this.velocity.y * dt;
        this.playerGroup.position.z += this.velocity.z * dt;

        // Bounding box collision
        const pPos = this.playerGroup.position;
        const playerMin = new THREE.Vector3(pPos.x - 0.4, pPos.y, pPos.z - 0.4);
        const playerMax = new THREE.Vector3(pPos.x + 0.4, pPos.y + 2.0, pPos.z + 0.4);
        const pBox = new THREE.Box3(playerMin, playerMax);

        this.isGrounded = false;
        this.currentMovingPlatform = null;

        const course = this.ctx.course;

        // Platforms Collision
        for (let i = 0; i < course.platforms.length; i++) {
            const mesh = course.platformMeshes[i];
            if (!mesh.visible) continue;
            const b = new THREE.Box3().setFromObject(mesh);
            if (pBox.intersectsBox(b)) {
                if (pPos.y - (this.velocity.y * dt) >= b.max.y - 0.3 && this.velocity.y <= 0) {
                    pPos.y = b.max.y;
                    this.velocity.y = 0;
                    this.isGrounded = true;
                    this.jumpsRemaining = 2;

                    const dis = course.disappearingPlatforms.find(dp => dp.mesh === mesh);
                    if (dis && dis.state === 'idle') {
                        dis.state = 'triggered';
                        dis.timer = 0.75;
                    }

                    const mov = course.movingPlatforms.find(mp => mp.mesh === mesh);
                    if (mov) this.currentMovingPlatform = mov;
                }
            }
        }

        // Bounce pads
        course.bouncePads.forEach(bp => {
            if (pBox.intersectsBox(bp.box)) {
                this.velocity.y = 26.0;
                this.isGrounded = false;
                this.jumpsRemaining = 2;
                this.ctx.audio.playBounce();
                this.ctx.hud.showToast(this.ctx.isOwner() ? '🚀 SUPER HÜPE!' : '🚀 SUPER BOUNCE!');
            }
        });

        // Lava Hazards
        course.hazards.forEach(hz => {
            if (pBox.intersectsBox(hz.box)) {
                this.respawnPlayer();
            }
        });

        // Rotating Hazards & Hammers
        for (const h of course.rotatingHazards) {
            if (h.type === 'spinner') {
                const barY = h.pos.y;
                const playerMinY = pPos.y;
                const playerMaxY = pPos.y + 1.9;
                if (playerMaxY < barY - 0.25 || playerMinY > barY + 0.25) {
                    continue;
                }
                const rotY = h.mesh.rotation.y;
                const rad = h.radius || 3.5;
                const dirX = Math.cos(rotY);
                const dirZ = -Math.sin(rotY);
                const px = pPos.x - h.pos.x;
                const pz = pPos.z - h.pos.z;
                const proj = px * dirX + pz * dirZ;
                const clampedT = Math.max(-rad, Math.min(rad, proj));
                const closestX = clampedT * dirX;
                const closestZ = clampedT * dirZ;
                const distSq = (px - closestX) * (px - closestX) + (pz - closestZ) * (pz - closestZ);
                const hitDist = 0.38 + 0.2;
                if (distSq < hitDist * hitDist) {
                    this.respawnPlayer();
                    break;
                }
            } else if (h.type === 'hammer' && h.hammerHead) {
                const hBox = new THREE.Box3().setFromObject(h.hammerHead);
                if (pBox.intersectsBox(hBox)) {
                    this.respawnPlayer();
                    break;
                }
            }
        }

        // Coins
        course.coinsList.forEach(c => {
            if (!c.collected && pPos.distanceTo(c.mesh.position) < 1.8) {
                c.collected = true;
                c.mesh.visible = false;
                this.ctx.setCoins(this.ctx.getCoins() + c.value);
                this.ctx.audio.playCoin();
                this.ctx.hud.showToast(this.ctx.isOwner() ? `+${c.value} 🪙 MÜNTI!` : `+${c.value} 🪙 COINS!`);
                this.ctx.onUpdateHUD();
                this.ctx.onSaveGameData();
            }
        });

        // Checkpoints
        course.checkpoints.forEach((cp, idx) => {
            if (pPos.distanceTo(cp.pos) < 2.5) {
                if (!cp.activated) {
                    cp.activated = true;
                    (cp.ringMesh.material as THREE.MeshBasicMaterial).color.setHex(0x2ed573);
                    (cp.flagMesh.material as THREE.MeshLambertMaterial).color.setHex(0x2ed573);
                    this.ctx.setCurrentCheckpointIndex(idx);
                    this.ctx.setCurrentStageIndex(idx);
                    this.ctx.setMaxUnlockedStage(Math.max(this.ctx.getMaxUnlockedStage(), idx + 1));

                    yardService.addPlayCoins(5, `Parkour Obby Stage ${idx + 1} Checkpoint`);
                    this.ctx.audio.playCheckpoint();
                    this.ctx.onSaveGameData();
                    this.ctx.onUpdateHUD();
                    this.ctx.hud.showCheckpointBanner(idx, this.ctx.isOwner());
                }
            }
        });

        // Stage 10 Victory Check
        if (!this.ctx.getIsVictory() && pPos.z <= -465 && pPos.y >= 9.0) {
            this.triggerVictory();
        }

        // Void Fall
        if (pPos.y < -18) {
            this.respawnPlayer();
        }
    }

    public updateDynamicObstacles(dt: number) {
        const course = this.ctx.course;

        course.disappearingPlatforms.forEach(p => {
            if (p.state === 'triggered') {
                p.timer -= dt;
                p.mesh.position.y = p.initialY + (Math.sin(p.timer * 40) * 0.08);
                if (p.timer <= 0) {
                    p.state = 'fallen';
                    p.mesh.visible = false;
                    p.mesh.position.y = -999;
                    p.timer = 2.8;
                }
            } else if (p.state === 'fallen') {
                p.timer -= dt;
                if (p.timer <= 0) {
                    p.state = 'idle';
                    p.mesh.visible = true;
                    p.mesh.position.y = p.initialY;
                }
            }
        });

        course.movingPlatforms.forEach(p => {
            p.phase += dt * p.speed;
            const t = (Math.sin(p.phase) + 1) / 2;
            const oldPos = p.mesh.position.clone();
            p.mesh.position.lerpVectors(p.startPos, p.endPos, t);
            p.delta.subVectors(p.mesh.position, oldPos);
        });

        course.rotatingHazards.forEach(h => {
            if (h.type === 'hammer') {
                h.mesh.rotation.z = Math.sin(performance.now() * 0.002 * Math.abs(h.speed)) * 1.15;
            } else {
                h.mesh.rotation.y += h.speed * dt;
            }
        });

        course.coinsList.forEach(c => {
            if (!c.collected) {
                c.mesh.rotation.z += 2.5 * dt;
                c.mesh.position.y = c.pos.y + Math.sin(performance.now() * 0.004 + c.pos.z) * 0.15;
            }
        });

        course.checkpoints.forEach(cp => {
            cp.ringMesh.rotation.z += 1.2 * dt;
        });
    }

    public updateEffects(dt: number) {
        for (let i = this.doubleJumpRings.length - 1; i >= 0; i--) {
            const r = this.doubleJumpRings[i];
            r.timer -= dt;
            r.mesh.scale.addScalar(dt * 7.5);
            (r.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, r.timer / 0.35);
            if (r.timer <= 0) {
                this.ctx.scene.remove(r.mesh);
                this.doubleJumpRings.splice(i, 1);
            }
        }

        const trail = this.ctx.getEquippedTrail();
        if (trail !== 'none') {
            this.playerTrailPoints.unshift(this.playerGroup.position.clone().add(new THREE.Vector3(0, 0.5, 0)));
            if (this.playerTrailPoints.length > 25) this.playerTrailPoints.pop();

            const posAttr = this.playerTrailMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
            for (let i = 0; i < this.playerTrailPoints.length; i++) {
                posAttr.setXYZ(i, this.playerTrailPoints[i].x, this.playerTrailPoints[i].y, this.playerTrailPoints[i].z);
            }
            posAttr.needsUpdate = true;
            this.playerTrailMesh.visible = true;

            if (trail === 'trail_rainbow') {
                const hue = (performance.now() * 0.001) % 1;
                (this.playerTrailMesh.material as THREE.LineBasicMaterial).color.setHSL(hue, 1, 0.5);
            } else if (trail === 'trail_fire') {
                (this.playerTrailMesh.material as THREE.LineBasicMaterial).color.setHex(0xff4757);
            } else if (trail === 'trail_sparks') {
                (this.playerTrailMesh.material as THREE.LineBasicMaterial).color.setHex(0xffd32a);
            }
        } else {
            this.playerTrailMesh.visible = false;
        }
    }
}
