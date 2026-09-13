import * as THREE from 'three';
import { enforceDesktopOnly } from '../../shared/mobileControls';
import { warAudio } from './audio';
import { Team, ActiveWeapon, CombatUnit } from './types';
import { WarGameState } from './state/warState';
import { createWarScene } from './world/sceneSetup';
import { BattlefieldBuilder } from './world/battlefieldBuilder';
import { UnitBuilder } from './models/unitBuilder';
import { FxManager } from './effects/fxManager';
import { CombatSystem } from './systems/combatSystem';
import { TargetingSystem } from './systems/targetingSystem';
import { AIController } from './systems/aiController';
import { PlayerController } from './systems/playerController';
import { WeaponController } from './systems/weaponController';
import { MatchSystem } from './systems/matchSystem';
import { UnitDeployment } from './systems/unitDeployment';
import { NetworkHandler } from './systems/networkHandler';
import { WarHud } from './ui/warHud';
import { DeployModal } from './ui/deployModal';

export class WarGameEngine {
    private container: HTMLElement;
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;

    public state: WarGameState;
    private battlefield!: BattlefieldBuilder;
    private unitBuilder!: UnitBuilder;
    private fx!: FxManager;
    private combat!: CombatSystem;
    private targeting!: TargetingSystem;
    private ai!: AIController;
    private deployment!: UnitDeployment;
    private playerController!: PlayerController;
    private weaponController!: WeaponController;
    private matchSystem!: MatchSystem;
    private networkHandler!: NetworkHandler;
    private hud!: WarHud;
    private deployModal!: DeployModal;

    private localUnit!: CombatUnit;
    private units: Map<string, CombatUnit> = new Map();
    private lastDeathPos: THREE.Vector3 | null = null;
    private clock = new THREE.Clock();

    public get warMoney(): number { return this.state.warMoney; }
    public set warMoney(val: number) { this.state.warMoney = val; }
    public get isPlaneUnlocked(): boolean { return this.state.isPlaneUnlocked; }
    public set isPlaneUnlocked(val: boolean) { this.state.isPlaneUnlocked = val; }
    public get isMissileUnlocked(): boolean { return this.state.isMissileUnlocked; }
    public set isMissileUnlocked(val: boolean) { this.state.isMissileUnlocked = val; }
    public get nukeTimer(): number { return this.state.nukeTimer; }
    public set nukeTimer(val: number) { this.state.nukeTimer = val; }

    constructor() {
        this.container = document.getElementById('canvas-container') || document.body;
        this.state = new WarGameState();
        this.hud = new WarHud(this.state);
        this.init();
    }

    private async init() {
        if (enforceDesktopOnly('3D War Simulator (10v10)', '3D War Simulator (10v10 Battle)')) return;
        await this.state.init();
        this.hud.applyWarLocalization(1);

        const sc = createWarScene(this.container);
        this.scene = sc.scene;
        this.camera = sc.camera;
        this.renderer = sc.renderer;

        this.battlefield = new BattlefieldBuilder(this.scene);
        this.battlefield.buildBattlefield();
        this.unitBuilder = new UnitBuilder(this.scene);
        this.fx = new FxManager(this.scene);
        this.combat = new CombatSystem(this.scene, this.fx);
        this.targeting = new TargetingSystem(this.scene, this.state, this.fx);
        this.ai = new AIController(this.scene, this.unitBuilder);
        this.matchSystem = new MatchSystem(this.scene, this.state, this.unitBuilder);
        this.deployment = new UnitDeployment(this.scene, this.state, this.unitBuilder, this.battlefield, this.hud, this.targeting);
        this.networkHandler = new NetworkHandler(this.state, this.unitBuilder, this.combat, this.matchSystem, this.fx, this.hud);

        this.weaponController = new WeaponController(
            this.state, this.combat, this.targeting, this.battlefield, this.hud, undefined,
            (v, dmg, aid, aname, atm) => this.damageUnit(v, dmg, aid, aname, atm),
            () => { this.camera.position.y += 6.0; this.camera.position.x += 4.0; }
        );

        this.playerController = new PlayerController(
            this.camera, this.state, this.fx, this.targeting, this.ai, this.battlefield.obstacles,
            {
                onFireActiveWeapon: () => {
                    this.playerController.planeGunAlternator = this.weaponController.fireActiveWeapon(
                        this.localUnit, this.playerController.mouseAimTarget, this.units, this.playerController.planeGunAlternator
                    );
                },
                onSelectWeapon: (t) => this.selectWeapon(t),
                onDamageUnit: (v, dmg, aid, aname, atm) => this.damageUnit(v, dmg, aid, aname, atm),
                onShowToast: (msg, col) => this.showToast(msg, col)
            }
        );

        this.hud.initRadar((wx, wz) => {
            if (this.targeting.isSatelliteTargeting) {
                this.targeting.satelliteCamCenter.x = THREE.MathUtils.clamp(wx, -260, 260);
                this.targeting.satelliteCamCenter.z = THREE.MathUtils.clamp(wz, -380, 380);
            }
        });

        this.deployModal = new DeployModal(this.state, {
            onConfirm: () => {
                this.deployLocalUnit();
                if (!this.ai.isRosterSpawned) this.ai.spawnBattleRoster(this.state.localTeam, this.units);
                this.updateTeamBadge();
                this.networkHandler.network?.updateIdentity(this.state.localTeam, this.state.localClass);
                this.startMatchCountdown();
            },
            showToast: (m, c) => this.showToast(m, c),
            updateHUD: () => this.updateHUD()
        });

        this.setupUI();
        this.networkHandler.init(
            this.units, this.battlefield.barrels,
            (u, dmg, sid, sn, tm) => this.damageUnit(u, dmg, sid, sn, tm),
            () => this.updateHUD()
        );
        if (this.networkHandler.network) {
            this.combat.setNetwork(this.networkHandler.network);
            this.targeting.setNetwork(this.networkHandler.network);
            this.matchSystem.setNetwork(this.networkHandler.network);
            this.weaponController.setNetwork(this.networkHandler.network);
        }

        this.deployLocalUnit();
        this.ai.spawnBattleRoster(this.state.localTeam, this.units);
        this.updateTeamBadge();

        window.addEventListener('beforeunload', () => this.state.saveUserDataToDb());
        (window as any).warGameEngine = this;

        this.clock.start();
        this.animate();
    }

    public deployLocalUnit() {
        this.localUnit = this.deployment.deployLocalUnit(this.localUnit, this.units, (w) => this.selectWeapon(w));
        this.updateHUD();
    }

    public updateHUD() {
        this.hud.updateHUD(this.localUnit, this.targeting.isAirstrikeTargeting);
        this.deployModal?.updateRoleBadgesUI();
    }

    public updateTeamBadge() {
        this.hud.updateTeamBadge((w) => this.selectWeapon(w));
    }

    public showToast(msg: string, color = '#2ecc71') {
        this.hud.showToast(msg, color);
    }

    private setupUI() {
        document.getElementById('btn-sound-toggle')?.addEventListener('click', () => {
            const muted = warAudio.toggleMute();
            const soundBtn = document.getElementById('btn-sound-toggle');
            if (soundBtn) {
                soundBtn.innerText = muted ? '🔇 Sound' : '🔊 Sound';
                soundBtn.style.color = muted ? '#e74c3c' : '#ffffff';
            }
        });
        document.getElementById('btn-open-help')?.addEventListener('click', () => { const m = document.getElementById('modal-help'); if (m) m.style.display = 'flex'; });
        document.getElementById('btn-close-help')?.addEventListener('click', () => { const m = document.getElementById('modal-help'); if (m) m.style.display = 'none'; });

        document.getElementById('weapon-cannon')?.addEventListener('click', () => this.selectWeapon('cannon'));
        document.getElementById('weapon-mg')?.addEventListener('click', () => this.selectWeapon('mg'));
        document.getElementById('weapon-airstrike')?.addEventListener('click', () => this.selectWeapon('airstrike'));
        document.getElementById('weapon-missile')?.addEventListener('click', () => this.selectWeapon('missile'));
        document.getElementById('weapon-nuke')?.addEventListener('click', () => this.selectWeapon('nuke'));
        document.getElementById('btn-restart-match')?.addEventListener('click', () => {
            const matchModal = document.getElementById('match-end-modal');
            if (matchModal) matchModal.style.display = 'none';
            this.state.isMatchEnded = false;
            this.state.redScore = 0;
            this.state.blueScore = 0;
            this.startMatchCountdown();
        });
    }

    public selectWeapon(type: ActiveWeapon) {
        this.weaponController.selectWeapon(type, this.localUnit);
    }

    public damageUnit(victim: CombatUnit, damage: number, attackerId: string, attackerName: string, attackerTeam: Team) {
        if (victim.isDead || this.state.isMatchEnded) return;
        victim.hp = Math.max(0, victim.hp - damage);
        warAudio.playHit();
        this.unitBuilder.updateNameTag(victim.nameTagCanvas, victim.name, victim.team, victim.hp, victim.maxHp);
        (victim.nameTagSprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;

        if (victim.isLocalPlayer) {
            this.camera.position.x += (Math.random() - 0.5) * 1.5;
            this.camera.position.y += (Math.random() - 0.5) * 1.5;
            this.updateHUD();
        }

        if (victim.hp <= 0) {
            if (victim.isLocalPlayer) this.lastDeathPos = victim.pos.clone();
            if (victim.unitClass === 'plane' && !victim.isCrashing) {
                victim.isCrashing = true;
                victim.isDead = false;
                const forwardSpeed = Math.max(16.0, victim.speed || 24.0);
                victim.crashVelocity = new THREE.Vector3(Math.sin(victim.rotation) * forwardSpeed, -7.0, Math.cos(victim.rotation) * forwardSpeed);
                victim.crashRotationSpeed = new THREE.Vector3(2.8, (Math.random() - 0.5) * 3.5, 6.5);
                this.matchSystem.handleKill(attackerId, attackerName, attackerTeam, victim.id, victim.name, victim.team, this.units, () => this.updateHUD());
                warAudio.playCannonShot();
            } else if (!victim.isCrashing) {
                victim.isDead = true;
                victim.root.visible = false;
                this.fx.triggerSpreadingExplosion(
                    victim.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), 12.0, 30, attackerId, attackerName, attackerTeam,
                    this.units, this.battlefield.barrels, (u, dmg, sid, sn, tm) => this.damageUnit(u, dmg, sid, sn, tm)
                );
                this.matchSystem.handleKill(attackerId, attackerName, attackerTeam, victim.id, victim.name, victim.team, this.units, () => this.updateHUD());
            }
        }
    }

    public respawnUnit(unit: CombatUnit) {
        if (unit.isLocalPlayer) this.lastDeathPos = null;
        this.deployment.respawnUnit(unit, (msg, col) => this.showToast(msg, col));
    }

    public startMatchCountdown() {
        this.matchSystem.startMatchCountdown(() => this.resetAllUnitsToBase());
    }

    public resetAllUnitsToBase() {
        if (this.localUnit) {
            const spawn = this.deployment.getRandomBaseSpawn(this.state.localTeam, this.state.localClass);
            this.localUnit.pos.copy(spawn.pos);
            this.localUnit.rotation = spawn.rot;
            this.localUnit.speed = 0;
            this.localUnit.hp = this.localUnit.maxHp;
            this.localUnit.isDead = false;
            this.localUnit.respawnTimer = 0;
            this.localUnit.root.position.copy(spawn.pos);
            this.localUnit.root.rotation.set(0, spawn.rot, 0);
            this.localUnit.root.visible = true;
            this.unitBuilder.updateNameTag(this.localUnit.nameTagCanvas, this.localUnit.name, this.localUnit.team, this.localUnit.hp, this.localUnit.maxHp);
            (this.localUnit.nameTagSprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
        }

        this.units.forEach((unit, id) => {
            if (id === this.state.localPlayerId) return;
            const sp = this.ai.initialBotSpawnMap.get(id);
            if (sp) { unit.pos.copy(sp.pos); unit.rotation = sp.rot; }
            unit.speed = 0; unit.hp = unit.maxHp; unit.isDead = false; unit.respawnTimer = 0;
            unit.root.position.copy(unit.pos); unit.root.rotation.set(0, unit.rotation, 0); unit.root.visible = true;
            this.unitBuilder.updateNameTag(unit.nameTagCanvas, unit.name, unit.team, unit.hp, unit.maxHp);
            (unit.nameTagSprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
        });

        for (const p of this.combat.projectiles) this.scene.remove(p.mesh);
        this.combat.projectiles = [];
        for (const sw of this.fx.shockwaves) this.scene.remove(sw.mesh);
        this.fx.shockwaves = [];
        for (const pt of this.fx.particles) this.scene.remove(pt.mesh);
        this.fx.particles = [];
        this.updateHUD();
    }

    private animate = () => {
        requestAnimationFrame(this.animate);
        const dt = Math.min(this.clock.getDelta(), 0.1);

        if (!this.state.isMatchEnded) {
            this.combat.updateCrashingUnits(
                dt, this.units, this.battlefield.barrels,
                (u, dmg, sid, sn, tm) => this.damageUnit(u, dmg, sid, sn, tm),
                (s) => this.matchSystem.showRespawnOverlay(s)
            );
            this.playerController.updatePlayer(dt, this.localUnit, this.matchSystem.isCountdownActive, (u) => this.respawnUnit(u));
            this.ai.updateBots(
                dt, this.matchSystem.isCountdownActive, this.units, this.battlefield.obstacles,
                (u) => this.respawnUnit(u),
                (id, name, team, from, dir, isExpl, isCan) => this.combat.spawnProjectile(id, name, team, from, dir, isExpl, isCan)
            );
            this.combat.updateProjectiles(
                dt, this.units, this.battlefield.obstacles, this.battlefield.barrels,
                (victim, dmg, aid, aname, atm) => this.damageUnit(victim, dmg, aid, aname, atm)
            );
            this.fx.updateShockwaves(
                dt, this.units,
                (victim, dmg, aid, aname, atm) => this.damageUnit(victim, dmg, aid, aname, atm)
            );
            this.fx.updateParticles(dt);
            this.playerController.updateCamera(this.localUnit, this.lastDeathPos);
            this.hud.renderRadar(dt, this.localUnit, this.units);
            this.networkHandler.broadcastState(this.localUnit);
            this.playerController.checkOutOfBounds(dt, this.localUnit, this.matchSystem.isCountdownActive);
        }

        this.renderer.render(this.scene, this.camera);
    };
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new WarGameEngine());
} else {
    new WarGameEngine();
}
