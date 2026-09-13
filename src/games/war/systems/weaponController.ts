import * as THREE from 'three';
import { ActiveWeapon, CombatUnit } from '../types';
import { WarGameState } from '../state/warState';
import { warAudio } from '../audio';
import { CombatSystem } from './combatSystem';
import { TargetingSystem } from './targetingSystem';
import { WarMultiplayerNetwork } from '../multiplayer';
import { WarHud } from '../ui/warHud';
import { BattlefieldBuilder } from '../world/battlefieldBuilder';

export class WeaponController {
    private state: WarGameState;
    private combat: CombatSystem;
    private targeting: TargetingSystem;
    private battlefield: BattlefieldBuilder;
    private hud: WarHud;
    private network?: WarMultiplayerNetwork;
    private onDamageUnit: (victim: CombatUnit, damage: number, attackerId: string, attackerName: string, attackerTeam: any) => void;
    private onShakeCamera: () => void;

    constructor(
        state: WarGameState,
        combat: CombatSystem,
        targeting: TargetingSystem,
        battlefield: BattlefieldBuilder,
        hud: WarHud,
        network: WarMultiplayerNetwork | undefined,
        onDamageUnit: (victim: CombatUnit, damage: number, attackerId: string, attackerName: string, attackerTeam: any) => void,
        onShakeCamera: () => void
    ) {
        this.state = state;
        this.combat = combat;
        this.targeting = targeting;
        this.battlefield = battlefield;
        this.hud = hud;
        this.network = network;
        this.onDamageUnit = onDamageUnit;
        this.onShakeCamera = onShakeCamera;
    }

    public setNetwork(network: WarMultiplayerNetwork) {
        this.network = network;
    }

    public selectWeapon(type: ActiveWeapon, localUnit: CombatUnit | undefined) {
        if (this.state.localClass === 'plane' && type === 'airstrike') return;
        if (this.state.localClass === 'missile' && (type === 'cannon' || type === 'mg' || type === 'airstrike')) return;
        if ((type === 'missile' || type === 'nuke') && this.state.localClass !== 'missile') {
            this.hud.showToast(this.state.isOwnerLang ? '🔒 Ainult Raketitiim (Roll) saab kasutada rakette ja tuumapomme!' : '🔒 Only Missile Team role can use missiles and nuclear strikes!', '#ff4757');
            return;
        }

        this.state.activeWeapon = type;
        document.querySelectorAll('.weapon-card').forEach(c => c.classList.remove('active'));
        document.getElementById(`weapon-${type}`)?.classList.add('active');

        if (type === 'missile' || type === 'nuke') {
            this.targeting.startSatelliteTargeting(type, localUnit!, this.state.isMatchEnded, (msg, col) => this.hud.showToast(msg, col));
        } else if (this.targeting.isSatelliteTargeting) {
            this.targeting.stopSatelliteTargeting((w) => this.selectWeapon(w, localUnit));
        }

        if (type === 'airstrike') {
            if (!this.targeting.isAirstrikeTargeting) this.targeting.toggleAirstrikeTargeting(localUnit!, this.state.isMatchEnded);
        } else if (this.targeting.isAirstrikeTargeting) {
            this.targeting.toggleAirstrikeTargeting(localUnit!, this.state.isMatchEnded);
        }
        this.hud.updateHUD(localUnit, this.targeting.isAirstrikeTargeting);
    }

    public fireActiveWeapon(localUnit: CombatUnit | undefined, mouseAimTarget: THREE.Vector3, units: Map<string, CombatUnit>, planeGunAlternator: boolean): boolean {
        if (!localUnit || localUnit.isDead || this.state.isMatchEnded) return planeGunAlternator;

        if (this.targeting.isSatelliteTargeting) {
            this.targeting.launchSatelliteStrike(
                mouseAimTarget.clone(),
                this.targeting.satelliteTargetType,
                localUnit,
                this.battlefield.missileSilos,
                units,
                this.battlefield.barrels,
                this.onDamageUnit,
                (msg, col) => this.hud.showToast(msg, col),
                () => this.hud.updateHUD(localUnit, this.targeting.isAirstrikeTargeting),
                this.onShakeCamera
            );
            return planeGunAlternator;
        }

        if (this.state.activeWeapon === 'airstrike' || this.targeting.isAirstrikeTargeting) {
            this.targeting.dropAirstrikeAtTarget(
                mouseAimTarget.clone(),
                localUnit,
                units,
                this.battlefield.barrels,
                this.onDamageUnit,
                () => this.hud.updateHUD(localUnit, this.targeting.isAirstrikeTargeting)
            );
            return planeGunAlternator;
        }

        if (this.state.activeWeapon === 'mg') {
            this.fireMachineGunWeapon(localUnit, mouseAimTarget);
            return planeGunAlternator;
        } else {
            return this.fireCannonWeapon(localUnit, mouseAimTarget, planeGunAlternator);
        }
    }

    public fireCannonWeapon(localUnit: CombatUnit, mouseAimTarget: THREE.Vector3, planeGunAlternator: boolean): boolean {
        if (this.state.primaryReloadTimer > 0 || localUnit.isDead || this.state.isMatchEnded) return planeGunAlternator;
        this.state.primaryReloadTimer = this.state.primaryReloadTime;

        let nextAlternator = planeGunAlternator;
        if (this.state.localClass === 'plane') {
            nextAlternator = !planeGunAlternator;
            const gunOffset = new THREE.Vector3(nextAlternator ? -2.6 : 2.6, -0.25, 2.5).applyEuler(localUnit.root.rotation);
            const muzzlePos = localUnit.pos.clone().add(gunOffset);
            const dir = new THREE.Vector3().subVectors(mouseAimTarget, muzzlePos).normalize();
            this.combat.spawnProjectile(this.state.localPlayerId, localUnit.name, this.state.localTeam, muzzlePos, dir, true, true);
            warAudio.playCannonShot();
        } else if (this.state.localClass === 'tank') {
            const muzzlePos = new THREE.Vector3(0, 0.6, 5.2);
            localUnit.turret!.localToWorld(muzzlePos);
            const dir = new THREE.Vector3().subVectors(mouseAimTarget, muzzlePos).normalize();
            dir.y += 0.03;
            this.combat.spawnProjectile(this.state.localPlayerId, localUnit.name, this.state.localTeam, muzzlePos, dir, true, true);
            warAudio.playCannonShot();
        } else {
            const riflePos = localUnit.pos.clone().add(new THREE.Vector3(0.3, 1.3, 0.7));
            const spread = (Math.random() - 0.5) * 0.04;
            const dir = new THREE.Vector3().subVectors(mouseAimTarget, riflePos).normalize();
            dir.x += spread; dir.z += spread;
            this.combat.spawnProjectile(this.state.localPlayerId, localUnit.name, this.state.localTeam, riflePos, dir, false, false);
            warAudio.playMachineGun();
        }

        this.network?.send({
            type: 'player_fire',
            payload: {
                shooterId: this.state.localPlayerId, shooterName: localUnit.name, team: this.state.localTeam,
                fromX: localUnit.pos.x, fromY: localUnit.pos.y, fromZ: localUnit.pos.z,
                dirX: mouseAimTarget.x, dirY: 0, dirZ: mouseAimTarget.z,
                isExplosive: this.state.localClass === 'tank' || this.state.localClass === 'plane',
                isCannon: this.state.localClass === 'tank' || this.state.localClass === 'plane'
            }
        });
        return nextAlternator;
    }

    public fireMachineGunWeapon(localUnit: CombatUnit, mouseAimTarget: THREE.Vector3) {
        if (localUnit.isDead || this.state.isMatchEnded) return;

        if (this.state.localClass === 'plane') {
            if (this.state.secondaryReloadTimer > 0) return;
            this.state.secondaryReloadTimer = 1.8;
            const bombFrom = localUnit.pos.clone().add(new THREE.Vector3(0, -1.2, 0));
            const forward = new THREE.Vector3(Math.sin(localUnit.rotation), 0, Math.cos(localUnit.rotation));
            const planeSpeed = Math.max(12.0, localUnit.speed || 28.0);
            const bombVel = forward.clone().multiplyScalar(planeSpeed * 0.7);
            bombVel.y = -8.0;
            this.combat.spawnAirBomb(this.state.localPlayerId, localUnit.name, this.state.localTeam, bombFrom, bombVel);
            warAudio.playAirstrike();
            this.hud.updateHUD(localUnit, this.targeting.isAirstrikeTargeting);
        } else if (this.state.localClass === 'tank') {
            if (this.state.secondaryReloadTimer > 0 || this.state.mgAmmo <= 0) return;
            this.state.secondaryReloadTimer = 0.09;
            this.state.mgAmmo--;
            const mgPos = new THREE.Vector3(-0.8, 1.2, 1.8);
            localUnit.turret!.localToWorld(mgPos);
            const spread = (Math.random() - 0.5) * 0.06;
            const dir = new THREE.Vector3().subVectors(mouseAimTarget, mgPos).normalize();
            dir.x += spread; dir.z += spread;
            this.combat.spawnProjectile(this.state.localPlayerId, localUnit.name, this.state.localTeam, mgPos, dir, false, false);
            warAudio.playMachineGun();
            this.hud.updateHUD(localUnit, this.targeting.isAirstrikeTargeting);
        } else {
            if (this.state.secondaryReloadTimer > 0) return;
            this.state.secondaryReloadTimer = 3.5;
            const fromPos = localUnit.pos.clone().add(new THREE.Vector3(0, 1.8, 0));
            this.combat.spawnGrenade(this.state.localPlayerId, localUnit.name, this.state.localTeam, fromPos, mouseAimTarget.clone());
            warAudio.playMachineGun();
            this.hud.updateHUD(localUnit, this.targeting.isAirstrikeTargeting);
        }
    }
}
