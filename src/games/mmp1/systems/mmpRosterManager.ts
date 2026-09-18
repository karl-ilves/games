import * as THREE from 'three';
import { Character, Role } from '../types';
import { MmpCrateManager } from '../state/crateManager';
import { createCharacterMesh } from '../models/characterBuilder';
import { MMP_BOT_PRESETS, createBotCharacter } from '../models/partyBuilder';
import { MmpPlayerState, MmpActionEvent } from './mmpOnlineNetwork';

export interface RosterContext {
    scene: THREE.Scene;
    characters: Character[];
    playerChar: Character;
    crateManager: MmpCrateManager;
    getState: () => string;
    addIncidentFeed: (msg: string) => void;
    updateAliveCount: () => void;
    combatSystem?: any;
}

export class MmpRosterManager {
    private ctx: RosterContext;
    private remotePlayers: Map<string, Character> = new Map();
    private bots: Character[] = [];
    public readonly maxTotalPlayers: number = 10;
    public readonly baseMatchSize: number = 5;

    constructor(ctx: RosterContext) {
        this.ctx = ctx;
        // Populate existing bots from characters
        this.bots = this.ctx.characters.filter(c => !c.isPlayer && !c.isRemotePlayer);
    }

    public getRemotePlayerCount(): number {
        return this.remotePlayers.size;
    }

    public getRemotePlayerIds(): string[] {
        return Array.from(this.remotePlayers.keys());
    }

    public getTotalPlayerCount(): number {
        return 1 + this.remotePlayers.size;
    }

    public getBotCount(): number {
        return this.bots.length;
    }

    public handleRemotePlayerState(state: MmpPlayerState) {
        if (!state || !state.id) return;

        let char = this.remotePlayers.get(state.id);
        if (!char) {
            // Check if we reached the maximum capacity of 10 players
            if (this.getTotalPlayerCount() >= this.maxTotalPlayers) {
                return;
            }

            char = this.createRemotePlayer(state);
            this.remotePlayers.set(state.id, char);
            this.ctx.characters.push(char);

            // Rebalance bot count: "alguses on 4 ai ja 1 mängja aga kui tuleb juurde siis on 3 ai ja 2 mängjat kuni 10 mängjani"
            this.rebalanceBots();
            this.ctx.addIncidentFeed(`👤 ${state.name || 'Mängija'} liitus mänguga! (${this.getTotalPlayerCount()} mängijat, ${this.bots.length} AI)`);
            this.ctx.updateAliveCount();
        }

        // Update state
        char.targetPos = new THREE.Vector3(state.x, state.y, state.z);
        char.targetRotY = state.rotY || 0;
        char.isWalking = !!state.isMoving;
        char.lastSeenTime = performance.now();
        char.isAlive = state.isAlive;
        char.hasWeaponEquipped = state.hasWeaponEquipped;
        char.coins = state.coins || 0;

        if (state.role) {
            char.role = state.role;
        }

        if (char.knifeMesh) {
            char.knifeMesh.visible = (char.role === 'murderer' && char.hasWeaponEquipped && char.isAlive);
        }
        if (char.gunMesh) {
            char.gunMesh.visible = (char.role === 'sheriff' && char.hasWeaponEquipped && char.isAlive);
        }

        // Fast distance snap (> 4.5m)
        if (char.position.distanceTo(char.targetPos) > 4.5) {
            char.position.copy(char.targetPos);
            char.mesh.position.copy(char.position);
        }
    }

    public handleRemotePlayerLeave(playerId: string) {
        const char = this.remotePlayers.get(playerId);
        if (char) {
            this.ctx.scene.remove(char.mesh);
            this.remotePlayers.delete(playerId);
            const idx = this.ctx.characters.indexOf(char);
            if (idx !== -1) {
                this.ctx.characters.splice(idx, 1);
            }

            // Restore AI bots if total human players decreased
            this.rebalanceBots();
            this.ctx.addIncidentFeed(`🚪 ${char.name} lahkus mängust. (${this.getTotalPlayerCount()} mängijat, ${this.bots.length} AI)`);
            this.ctx.updateAliveCount();
        }
    }

    public handleRemotePlayerAction(evt: MmpActionEvent) {
        if (!evt || !evt.id) return;
        const char = this.remotePlayers.get(evt.id);
        if (!char || !char.isAlive) return;

        if (evt.action === 'slash') {
            if (char.knifeMesh) {
                char.knifeMesh.visible = true;
                char.hasWeaponEquipped = true;
            }
        } else if (evt.action === 'shoot') {
            if (char.gunMesh) {
                char.gunMesh.visible = true;
                char.hasWeaponEquipped = true;
            }
        }
    }

    /**
     * Balances AI bots count so that:
     * - If 1 player: 4 AI bots (total 5)
     * - If 2 players: 3 AI bots (total 5)
     * - If 3 players: 2 AI bots (total 5)
     * - If 4 players: 1 AI bot (total 5)
     * - If 5 players: 0 AI bots (total 5)
     * - If 6 to 10 players: 0 AI bots (total 6 to 10)
     */
    public rebalanceBots() {
        const humanCount = Math.min(this.maxTotalPlayers, this.getTotalPlayerCount());
        const targetBotCount = Math.max(0, this.baseMatchSize - humanCount);

        // If we have more bots than target, remove excess bots
        while (this.bots.length > targetBotCount) {
            const removedBot = this.bots.pop();
            if (removedBot) {
                this.ctx.scene.remove(removedBot.mesh);
                const idx = this.ctx.characters.indexOf(removedBot);
                if (idx !== -1) {
                    this.ctx.characters.splice(idx, 1);
                }
            }
        }

        // If we have fewer bots than target, add bots
        while (this.bots.length < targetBotCount) {
            const nextIndex = this.bots.length;
            const newBot = createBotCharacter(nextIndex, this.ctx.scene, this.ctx.crateManager, targetBotCount);
            this.bots.push(newBot);
            this.ctx.characters.push(newBot);
        }
    }

    private createRemotePlayer(state: MmpPlayerState): Character {
        const pModel = createCharacterMesh(
            `${state.name || 'Player'} ${state.isOwner ? '👑' : '👤'}`,
            0x3498db,
            true,
            this.ctx.crateManager
        );

        const spawnPos = new THREE.Vector3(state.x || 0, state.y || 0, state.z || 150);
        const char: Character = {
            id: 'remote_' + state.id,
            name: state.name || 'Player',
            isPlayer: false,
            isRemotePlayer: true,
            remotePlayerId: state.id,
            role: state.role || 'innocent',
            isAlive: state.isAlive ?? true,
            hasWeaponEquipped: !!state.hasWeaponEquipped,
            mesh: pModel.group,
            position: spawnPos,
            velocity: new THREE.Vector3(),
            rotation: state.rotY || 0,
            knifeMesh: pModel.knife,
            gunMesh: pModel.gun,
            bodyMesh: pModel.body,
            headMesh: pModel.head,
            leftLeg: pModel.leftLeg,
            rightLeg: pModel.rightLeg,
            leftArm: pModel.leftArm,
            rightArm: pModel.rightArm,
            avatarRig: pModel.avatarRig,
            aiTimer: 0,
            coins: state.coins || 0,
            targetPos: spawnPos.clone(),
            targetRotY: state.rotY || 0,
            lastSeenTime: performance.now()
        };

        char.mesh.userData.character = char;
        char.mesh.traverse(c => {
            c.userData.character = char;
            (c as any).frustumCulled = false;
        });

        char.mesh.position.copy(char.position);
        char.mesh.rotation.y = char.rotation;
        this.ctx.scene.add(char.mesh);

        return char;
    }

    public update(delta: number, elapsedTime: number) {
        const now = performance.now();
        const staleTimeout = 120000; // 2 minutes
        const toRemove: string[] = [];

        this.remotePlayers.forEach((char, id) => {
            if (char.lastSeenTime && (now - char.lastSeenTime > staleTimeout)) {
                toRemove.push(id);
                return;
            }

            // Interpolate position
            if (char.targetPos) {
                const dist = char.position.distanceTo(char.targetPos);
                if (dist > 4.5) {
                    char.position.copy(char.targetPos);
                } else {
                    char.position.lerp(char.targetPos, Math.min(1.0, delta * 14.0));
                }
                char.mesh.position.copy(char.position);
            }

            // Interpolate rotation
            if (char.targetRotY !== undefined) {
                let diff = char.targetRotY - char.rotation;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                char.rotation += diff * Math.min(1.0, delta * 14.0);
                char.mesh.rotation.y = char.rotation;
            }

            // Animate avatar rig
            if (char.avatarRig) {
                const action = char.isWalking ? 'walk' : 'idle';
                char.avatarRig.updateAnimation(elapsedTime, action);
            }
        });

        toRemove.forEach(id => this.handleRemotePlayerLeave(id));
    }
}
