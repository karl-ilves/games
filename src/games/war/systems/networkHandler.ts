import * as THREE from 'three';
import { WarMultiplayerNetwork, MultiplayerEvent } from '../multiplayer';
import { CombatUnit, Team } from '../types';
import { WarGameState } from '../state/warState';
import { UnitBuilder } from '../models/unitBuilder';
import { CombatSystem } from './combatSystem';
import { MatchSystem } from './matchSystem';
import { FxManager } from '../effects/fxManager';
import { WarHud } from '../ui/warHud';
import { warAudio } from '../audio';
import { ExplosiveBarrel } from '../types';

export class NetworkHandler {
    private state: WarGameState;
    private unitBuilder: UnitBuilder;
    private combat: CombatSystem;
    private matchSystem: MatchSystem;
    private fx: FxManager;
    private hud: WarHud;
    private lastBroadcastTime = 0;
    public network?: WarMultiplayerNetwork;
    public connectedHumanCount = 1;

    constructor(
        state: WarGameState,
        unitBuilder: UnitBuilder,
        combat: CombatSystem,
        matchSystem: MatchSystem,
        fx: FxManager,
        hud: WarHud
    ) {
        this.state = state;
        this.unitBuilder = unitBuilder;
        this.combat = combat;
        this.matchSystem = matchSystem;
        this.fx = fx;
        this.hud = hud;
    }

    public init(
        units: Map<string, CombatUnit>,
        barrels: ExplosiveBarrel[],
        onDamageUnit: (u: CombatUnit, dmg: number, sid: string, sn: string, tm: Team) => void,
        onUpdateHUD: () => void
    ) {
        this.network = new WarMultiplayerNetwork(
            this.state.localPlayerId, this.state.localUsername, this.state.localTeam, this.state.localClass,
            (event: MultiplayerEvent) => {
                if (event.type === 'player_state') this.onRemotePlayerState(event.payload, units);
                else if (event.type === 'player_fire') {
                    const from = new THREE.Vector3(event.payload.fromX, event.payload.fromY, event.payload.fromZ);
                    const dir = new THREE.Vector3(event.payload.dirX, event.payload.dirY, event.payload.dirZ);
                    this.combat.spawnProjectile(event.payload.shooterId, event.payload.shooterName, event.payload.team, from, dir, event.payload.isExplosive, event.payload.isCannon);
                } else if (event.type === 'grenade_throw') {
                    const from = new THREE.Vector3(event.payload.fromX, event.payload.fromY, event.payload.fromZ);
                    const target = new THREE.Vector3(event.payload.targetX, event.payload.targetY, event.payload.targetZ);
                    this.combat.spawnGrenade(event.payload.shooterId, event.payload.shooterName, event.payload.team, from, target);
                } else if (event.type === 'airstrike_drop') {
                    const targetPos = new THREE.Vector3(event.payload.targetX, 0, event.payload.targetZ);
                    warAudio.playAirstrike();
                    for (let i = 0; i < 5; i++) {
                        setTimeout(() => {
                            const spreadX = (Math.random() - 0.5) * 8.0;
                            const spreadZ = (Math.random() - 0.5) * 8.0;
                            const impactPos = targetPos.clone().add(new THREE.Vector3(spreadX, 0, spreadZ));
                            this.fx.triggerSpreadingExplosion(
                                impactPos, 16.0, 85, event.payload.shooterId, event.payload.shooterName, event.payload.team,
                                units, barrels, onDamageUnit
                            );
                        }, 600 + i * 260);
                    }
                } else if (event.type === 'unit_killed') {
                    this.matchSystem.addKillFeedEntry(event.payload.killerName, event.payload.killerTeam, event.payload.victimName, event.payload.victimTeam);
                    if (event.payload.killerTeam === 'red') this.state.redScore = Math.max(this.state.redScore, event.payload.redScore);
                    else this.state.blueScore = Math.max(this.state.blueScore, event.payload.blueScore);
                    onUpdateHUD();
                } else if (event.type === 'player_join') {
                    this.hud.showToast(this.state.isOwnerLang ? `👥 ${event.payload.name || 'Uus mängija'} liitus serveriga!` : `👥 ${event.payload.name || 'New player'} joined!`, event.payload.team === 'red' ? '#ff4757' : '#00f2fe');
                } else if (event.type === 'player_leave') {
                    const unit = units.get(event.payload.id);
                    if (unit) {
                        this.hud.showToast(this.state.isOwnerLang ? `🚪 ${unit.name} lahkus serverist` : `🚪 ${unit.name} left the server`, '#a4b0be');
                        unit.root.parent?.remove(unit.root);
                        units.delete(event.payload.id);
                    }
                }
            },
            (statusText: string, onlineCount: number) => {
                this.connectedHumanCount = onlineCount;
                const serverEl = document.getElementById('server-players-count');
                if (serverEl) {
                    serverEl.innerText = this.state.isOwnerLang
                        ? `${Math.min(20, this.connectedHumanCount)} / 20 Mängijat (10v10 Lahing)`
                        : `${Math.min(20, this.connectedHumanCount)} / 20 Players (10v10 Battle)`;
                }
            }
        );
    }

    private onRemotePlayerState(payload: any, units: Map<string, CombatUnit>) {
        if (!payload || payload.id === this.state.localPlayerId) return;
        let remote = units.get(payload.id);
        if (!remote) {
            if (payload.unitClass === 'plane') remote = this.unitBuilder.createPlane(payload.id, payload.name, payload.team, false, false, new THREE.Vector3(payload.x, 0, payload.z), payload.rot);
            else if (payload.unitClass === 'tank') remote = this.unitBuilder.createTank(payload.id, payload.name, payload.team, false, false, new THREE.Vector3(payload.x, 0, payload.z), payload.rot);
            else remote = this.unitBuilder.createSoldier(payload.id, payload.name, payload.team, false, false, new THREE.Vector3(payload.x, 0, payload.z), payload.rot);
            units.set(payload.id, remote);
        }

        const targetY = payload.unitClass === 'plane' ? 14.0 : (payload.y || 0);
        remote.pos.set(payload.x, targetY, payload.z);
        remote.root.position.copy(remote.pos);
        remote.root.rotation.y = payload.rot;
        if (remote.turret && payload.turretRot !== undefined) remote.turret.rotation.y = payload.turretRot;
        remote.hp = payload.hp;
        this.unitBuilder.updateNameTag(remote.nameTagCanvas, remote.name, remote.team, remote.hp, remote.maxHp);
        (remote.nameTagSprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
    }

    public broadcastState(localUnit: CombatUnit | undefined) {
        if (!this.network || !localUnit || localUnit.isDead) return;
        const now = performance.now();
        if (now - this.lastBroadcastTime < 50) return;
        this.lastBroadcastTime = now;

        this.network.send({
            type: 'player_state',
            payload: {
                id: this.state.localPlayerId, name: this.state.localUsername, team: this.state.localTeam, unitClass: this.state.localClass,
                x: localUnit.pos.x, z: localUnit.pos.z, rot: localUnit.rotation, turretRot: localUnit.turretAngle || 0, hp: localUnit.hp
            }
        });
    }
}
