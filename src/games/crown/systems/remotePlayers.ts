import * as THREE from 'three';
import { AvatarRig } from '../../../shared/avatar/AvatarRig';
import { RemotePlayerState } from '../types';

export interface RemotePlayerEntity {
    id: string;
    name: string;
    isOwner: boolean;
    group: THREE.Group;
    avatarRig: AvatarRig | null;
    nameTagSprite: THREE.Sprite;
    nameTagCanvas: HTMLCanvasElement;
    targetPos: THREE.Vector3;
    targetRotY: number;
    currentAction: 'idle' | 'walk' | 'run' | 'jump';
    currentStage: number;
    currentPercentage: number;
    lastUpdateTime: number;
}

export class RemotePlayersManager {
    private scene: THREE.Scene;
    private remotePlayers: Map<string, RemotePlayerEntity> = new Map();

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public updatePlayerState(state: RemotePlayerState) {
        if (!state || !state.id) return;

        // If player is deep in void fall (< -10), ignore packet so they don't get dragged underground
        if (state.y !== undefined && state.y < -10) {
            return;
        }

        let entity = this.remotePlayers.get(state.id);
        if (!entity) {
            entity = this.createRemotePlayer(state);
            this.remotePlayers.set(state.id, entity);
        }

        entity.targetPos.set(state.x, state.y, state.z);
        entity.targetRotY = state.rotY || 0;
        entity.currentAction = state.action || 'idle';
        entity.lastUpdateTime = performance.now();

        // If distance is large (e.g. respawn, checkpoint teleport), immediately snap instead of slow lerp
        if (entity.group.position.distanceTo(entity.targetPos) > 4.5) {
            entity.group.position.copy(entity.targetPos);
        }

        if (entity.currentStage !== state.stage || entity.currentPercentage !== state.percentage || entity.name !== state.name) {
            entity.name = state.name;
            entity.currentStage = state.stage;
            entity.currentPercentage = state.percentage;
            this.updateNameTag(entity);
        }
    }

    public removePlayer(playerId: string) {
        const entity = this.remotePlayers.get(playerId);
        if (entity) {
            this.scene.remove(entity.group);
            this.remotePlayers.delete(playerId);
        }
    }

    public update(dt: number, elapsedTime: number) {
        const now = performance.now();
        // Stale timeout 2 minutes (never delete stationary players who are reading or typing in chat)
        const staleTimeout = 120000;

        const toRemove: string[] = [];

        this.remotePlayers.forEach((entity, id) => {
            if (now - entity.lastUpdateTime > staleTimeout) {
                toRemove.push(id);
                return;
            }

            // Smooth position interpolation or snap if large jump
            const dist = entity.group.position.distanceTo(entity.targetPos);
            if (dist > 4.5) {
                entity.group.position.copy(entity.targetPos);
            } else {
                const lerpFactor = Math.min(1.0, dt * 14.0);
                entity.group.position.lerp(entity.targetPos, lerpFactor);
            }

            // Smooth rotation interpolation
            let diff = entity.targetRotY - entity.group.rotation.y;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            entity.group.rotation.y += diff * Math.min(1.0, dt * 14.0);

            // Animate 3D avatar rig (walking, jumping, idle, running)
            if (entity.avatarRig) {
                entity.avatarRig.updateAnimation(elapsedTime, entity.currentAction);
            }
        });

        toRemove.forEach((id) => this.removePlayer(id));
    }

    private createRemotePlayer(state: RemotePlayerState): RemotePlayerEntity {
        const group = new THREE.Group();
        group.name = `Crown_RemotePlayer_${state.id}`;
        group.position.set(state.x, state.y, state.z);
        group.rotation.y = state.rotY || 0;

        let avatarRig: AvatarRig | null = null;
        try {
            avatarRig = new AvatarRig(state.avatarConfig);
            avatarRig.rootGroup.name = `AvatarRig_${state.id}`;
            group.add(avatarRig.rootGroup);
        } catch (e) {
            console.warn('Fallback mesh for remote player:', e);
            const geo = new THREE.CapsuleGeometry(0.45, 1.2, 8, 16);
            const mat = new THREE.MeshStandardMaterial({
                color: state.isOwner ? 0xffd700 : 0x00f2fe,
                metalness: 0.6,
                roughness: 0.3
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.y = 1.1;
            group.add(mesh);
        }

        // Overhead billboard name tag sprite
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 96;
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.y = 2.9;
        sprite.scale.set(3.4, 1.02, 1);
        sprite.frustumCulled = false;
        group.add(sprite);

        // Crucial: Disable frustum culling on all child meshes so camera angles never hide parts/avatar
        group.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
                obj.frustumCulled = false;
            }
        });

        this.scene.add(group);

        const entity: RemotePlayerEntity = {
            id: state.id,
            name: state.name || 'Player',
            isOwner: !!state.isOwner,
            group,
            avatarRig,
            nameTagSprite: sprite,
            nameTagCanvas: canvas,
            targetPos: new THREE.Vector3(state.x, state.y, state.z),
            targetRotY: state.rotY || 0,
            currentAction: state.action || 'idle',
            currentStage: state.stage || 1,
            currentPercentage: state.percentage || 2,
            lastUpdateTime: performance.now()
        };

        this.updateNameTag(entity);
        return entity;
    }

    private updateNameTag(entity: RemotePlayerEntity) {
        const canvas = entity.nameTagCanvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Dark background pill
        ctx.fillStyle = 'rgba(10, 15, 25, 0.78)';
        ctx.beginPath();
        ctx.roundRect(8, 6, 304, 84, 16);
        ctx.fill();

        // Border glow
        ctx.lineWidth = 3;
        ctx.strokeStyle = entity.isOwner ? '#ffd700' : 'rgba(0, 242, 254, 0.85)';
        ctx.stroke();

        // Player Name
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = entity.isOwner ? '#ffd700' : '#00f2fe';
        const prefix = entity.isOwner ? '👑 ' : '🏃 ';
        ctx.fillText(`${prefix}${entity.name}`, 160, 38);

        // Stage & Progress Pill
        ctx.font = 'bold 18px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`Stage ${entity.currentStage} / 50 (${entity.currentPercentage}%)`, 160, 68);

        (entity.nameTagSprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
    }

    public getRemotePlayersCount(): number {
        return this.remotePlayers.size;
    }

    public getRemotePlayer(id: string): RemotePlayerEntity | undefined {
        return this.remotePlayers.get(id);
    }

    public getRemotePlayers(): RemotePlayerEntity[] {
        return Array.from(this.remotePlayers.values());
    }

    public clear() {
        this.remotePlayers.forEach((entity) => {
            this.scene.remove(entity.group);
        });
        this.remotePlayers.clear();
    }
}
