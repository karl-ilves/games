import * as THREE from 'three';
import { Team, UnitClass, CombatUnit } from '../types';
import { WarGameState } from '../state/warState';
import { UnitBuilder } from '../models/unitBuilder';
import { BattlefieldBuilder } from '../world/battlefieldBuilder';
import { WarHud } from '../ui/warHud';
import { TargetingSystem } from './targetingSystem';

export class UnitDeployment {
    private scene: THREE.Scene;
    private state: WarGameState;
    private unitBuilder: UnitBuilder;
    private battlefield: BattlefieldBuilder;
    private hud: WarHud;
    private targeting: TargetingSystem;

    constructor(
        scene: THREE.Scene,
        state: WarGameState,
        unitBuilder: UnitBuilder,
        battlefield: BattlefieldBuilder,
        hud: WarHud,
        targeting: TargetingSystem
    ) {
        this.scene = scene;
        this.state = state;
        this.unitBuilder = unitBuilder;
        this.battlefield = battlefield;
        this.hud = hud;
        this.targeting = targeting;
    }

    public getRandomBaseSpawn(team: Team, unitClass: UnitClass): { pos: THREE.Vector3; rot: number } {
        const isRed = team === 'red';
        const isMissileTeam = team === 'missile' || unitClass === 'missile';
        const rot = isRed ? Math.PI : (isMissileTeam ? Math.PI / 2 : 0);

        if (isMissileTeam) {
            const siloPos = this.battlefield.missileSilos.get('missile') || new THREE.Vector3(75, 0, 0);
            return { pos: new THREE.Vector3(siloPos.x + 4, unitClass === 'plane' ? 14.0 : 0, siloPos.z + 10), rot };
        }
        if (unitClass === 'plane') {
            const planeLanes = [-65, -35, 0, 35, 65];
            const laneX = planeLanes[Math.floor(Math.random() * planeLanes.length)] + (Math.random() - 0.5) * 8;
            const baseZ = isRed ? 275 + Math.random() * 10 : -275 - Math.random() * 10;
            return { pos: new THREE.Vector3(laneX, 14.0, baseZ), rot };
        } else if (unitClass === 'missile') {
            const siloPos = this.battlefield.missileSilos.get(team);
            return { pos: siloPos ? new THREE.Vector3(siloPos.x + (isRed ? 4 : -4), 0, siloPos.z + (isRed ? -8 : 8)) : new THREE.Vector3(isRed ? 45 : -45, 0, isRed ? 255 : -255), rot };
        } else if (unitClass === 'tank') {
            const tankSlots = [-85, -50, -20, 20, 50, 85];
            const slotX = tankSlots[Math.floor(Math.random() * tankSlots.length)] + (Math.random() - 0.5) * 6;
            const baseZ = isRed ? 262 + Math.random() * 12 : -262 - Math.random() * 12;
            return { pos: new THREE.Vector3(slotX, 0, baseZ), rot };
        } else {
            const soldierSlots = [-105, -75, -45, -15, 15, 45, 75, 105];
            const slotX = soldierSlots[Math.floor(Math.random() * soldierSlots.length)] + (Math.random() - 0.5) * 8;
            const baseZ = isRed ? 245 + Math.random() * 15 : -245 - Math.random() * 15;
            return { pos: new THREE.Vector3(slotX, 0, baseZ), rot };
        }
    }

    public deployLocalUnit(existingLocalUnit: CombatUnit | undefined, units: Map<string, CombatUnit>, onSelectWeapon: (w: any) => void): CombatUnit {
        if (existingLocalUnit) {
            this.scene.remove(existingLocalUnit.root);
            units.delete(this.state.localPlayerId);
        }

        const spawn = this.getRandomBaseSpawn(this.state.localTeam, this.state.localClass);
        let newUnit: CombatUnit;

        if (this.state.localClass === 'plane') {
            newUnit = this.unitBuilder.createPlane(this.state.localPlayerId, this.state.localUsername, this.state.localTeam, true, false, spawn.pos, spawn.rot);
            this.state.primaryReloadTime = 0.15;
        } else if (this.state.localClass === 'tank') {
            newUnit = this.unitBuilder.createTank(this.state.localPlayerId, this.state.localUsername, this.state.localTeam, true, false, spawn.pos, spawn.rot);
            this.state.primaryReloadTime = 1.2;
        } else if (this.state.localClass === 'missile') {
            newUnit = this.unitBuilder.createSoldier(this.state.localPlayerId, this.state.localUsername, this.state.localTeam, true, false, spawn.pos, spawn.rot);
            newUnit.hp = 100;
            newUnit.maxHp = 100;
            this.state.primaryReloadTime = 0.2;
            this.state.activeWeapon = 'missile';
            setTimeout(() => onSelectWeapon('missile'), 100);
        } else {
            newUnit = this.unitBuilder.createSoldier(this.state.localPlayerId, this.state.localUsername, this.state.localTeam, true, false, spawn.pos, spawn.rot);
            this.state.primaryReloadTime = 0.12;
        }

        units.set(this.state.localPlayerId, newUnit);
        this.hud.updateHUD(newUnit, this.targeting.isAirstrikeTargeting);
        return newUnit;
    }

    public respawnUnit(unit: CombatUnit, onShowToast: (msg: string, col: string) => void) {
        unit.isDead = false;
        unit.isCrashing = false;
        unit.hp = unit.maxHp;
        unit.root.visible = true;

        const spawn = this.getRandomBaseSpawn(unit.team, unit.unitClass);
        unit.pos.copy(spawn.pos);
        unit.root.position.copy(unit.pos);
        unit.rotation = spawn.rot;
        unit.root.rotation.set(0, spawn.rot, 0);

        this.unitBuilder.updateNameTag(unit.nameTagCanvas, unit.name, unit.team, unit.hp, unit.maxHp);
        (unit.nameTagSprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
        this.hud.updateHUD(unit, this.targeting.isAirstrikeTargeting);

        if (unit.isLocalPlayer && this.state.localClass === 'missile') {
            this.state.activeWeapon = 'missile';
            this.targeting.startSatelliteTargeting('missile', unit, this.state.isMatchEnded, onShowToast);
        }
    }
}
