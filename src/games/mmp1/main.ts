import * as THREE from "three";
import { yardService } from "../../shared/yardService";
import { getCurrentUserProfile, isPlayardOwner, isTestMode, canAccessMmp1, calculateAge } from "../../auth";
import { applyMmp1Localization } from "./i18n";
import { InGameEmotesWidget } from "../../shared/avatar/InGameEmotesWidget";

import { Role, GameState, MapId, Character, DroppedGun, CoinItem } from "./types";
import { MmpCrateManager } from "./state/crateManager";
import { buildLobby } from "./world/maps";
import { createUltraRealisticKnife, createUltraRealisticRevolver } from "./models/weaponBuilder";
import { createPartyCharacters } from "./models/partyBuilder";
import { setupLights, spawnMapCoins } from "./world/lightsAndCoins";
import { CombatSystem, hasLineOfSight, getCharacterFromObject } from "./systems/combat";
import { updateAI } from "./systems/ai";
import { updatePlayer } from "./systems/playerController";
import { CrateShopUI } from "./ui/crateShopModal";
import { AdminPanelUI } from "./ui/adminPanel";
import { HudUI } from "./ui/hud";
import { InputController } from "./systems/input";
import { RoundManager } from "./world/roundManager";
import { handleSetAdminRole } from "./systems/roleManager";
import { handleEquipSkin } from "./systems/weaponLoadout";
import { createGameSystems } from "./systems/systemFactories";
import { InvisibilitySystem } from "./systems/invisibilitySystem";
import { SpectatorSystem } from "./systems/spectatorSystem";
import { MmpOnlineNetwork } from "./systems/mmpOnlineNetwork";
import { MmpRosterManager } from "./systems/mmpRosterManager";

(window as any).yardService = yardService;

export class MurderMysteryGame {
    public container: HTMLElement;
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    public clock: THREE.Clock;

    public state: GameState = "lobby";
    public lobbyCountdown: number = 40;
    public roundTimer: number = 180;
    public characters: Character[] = [];
    public playerChar!: Character;
    public droppedGun: DroppedGun | null = null;
    public coins: CoinItem[] = [];

    public mapColliders: THREE.Box3[] = [];
    public mansionGroup: THREE.Group = new THREE.Group();
    public lobbyGroup: THREE.Group = new THREE.Group();

    public keys: { [key: string]: boolean } = {};
    public cameraPitch: number = 0.2;
    public cameraYaw: number = 0;
    public cameraDistance: number = 6.0;
    public isPointerLocked: boolean = false;
    public isSprinting: boolean = false;
    public isTouchDragging: boolean = false;
    public joystickInput = { x: 0, y: 0 };

    public adminForcedRole: Role | null = null;
    public currentMapId: MapId = "hotel2";
    public adminSelectedMap: MapId | "random" = "random";
    public lastHero: Character | null = null;
    public wallMeshes: THREE.Mesh[] = [];
    public hasSheriffWitnessedMurder: boolean = false;

    public emotesWidget: InGameEmotesWidget | null = null;
    public crateManager: MmpCrateManager;
    public combatSystem!: CombatSystem;
    public crateShopUI!: CrateShopUI;
    public adminPanelUI!: AdminPanelUI;
    public hudUI!: HudUI;
    public roundManager!: RoundManager;
    public inputController!: InputController;
    public invisibilitySystem!: InvisibilitySystem;
    public spectatorSystem!: SpectatorSystem;
    public onlineNetwork!: MmpOnlineNetwork;
    public rosterManager!: MmpRosterManager;
    private lastBroadcastTime = 0;
    public muzzleFlashLight: THREE.PointLight | null = null;

    constructor() {
        this.crateManager = new MmpCrateManager();
        this.container = document.getElementById("canvas-container") || document.body;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0810);
        this.scene.fog = new THREE.FogExp2(0x0a0810, 0.015);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.08;
        this.container.appendChild(this.renderer.domElement);
        this.clock = new THREE.Clock();

        this.hudUI = new HudUI({ playerChar: null as any, characters: this.characters, crateManager: this.crateManager });
        this.checkAccessAuthorization();
        const { muzzleFlashLight } = setupLights(this.scene);
        this.muzzleFlashLight = muzzleFlashLight;
        this.lobbyGroup = buildLobby();
        this.scene.add(this.lobbyGroup);

        const party = createPartyCharacters(this.scene, this.crateManager);
        this.playerChar = party.playerChar;
        this.characters = party.characters;
        (this.hudUI as any).ctx.playerChar = this.playerChar;

        const sys = createGameSystems(this);
        this.combatSystem = sys.combatSystem;
        this.crateShopUI = sys.crateShopUI;
        this.adminPanelUI = sys.adminPanelUI;
        this.roundManager = sys.roundManager;
        this.inputController = sys.inputController;
        this.invisibilitySystem = sys.invisibilitySystem;
        this.spectatorSystem = sys.spectatorSystem;
        this.onlineNetwork = sys.onlineNetwork;
        this.rosterManager = sys.rosterManager;

        this.buildMansion();
        this.emotesWidget = new InGameEmotesWidget({ getAvatarRig: () => this.playerChar?.avatarRig, topOffset: 70, leftOffset: 16 });
        this.spawnCoins();
        this.inputController.bindEvents();

        window.addEventListener("resize", () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        window.addEventListener("playard_auth_changed", () => {
            this.checkAccessAuthorization();
            this.hudUI?.updateRoleHud();
            this.crateShopUI?.renderCrateShop();
            this.crateShopUI?.renderInventory();
            this.invisibilitySystem?.updateSlotVisibility();
        });

        this.updateYardDisplay();
        this.animate();
        console.log("MMP1: Murder Mystery 3D initialized successfully.");
    }

    public checkAccessAuthorization() {
        const prof = getCurrentUserProfile(), owner = isPlayardOwner(prof?.email);
        const userAge = prof ? (prof.birthDate ? calculateAge(prof.birthDate) : (prof.age ?? 99)) : 99;
        const denied = document.getElementById("access-denied-overlay");
        if (denied) denied.style.display = (prof && !owner && !prof.isAdmin && userAge < 10) ? "flex" : "none";
        const btnAdmin = document.getElementById("btn-admin-panel");
        if (btnAdmin) btnAdmin.style.display = (owner || isTestMode()) ? "flex" : "none";
        applyMmp1Localization();
    }

    public createUltraRealisticKnife(skinId?: string) { return createUltraRealisticKnife(skinId, this.crateManager?.getInventory()?.equippedKnife); }
    public createUltraRealisticRevolver(isGolden = false, skinId?: string) { return createUltraRealisticRevolver(isGolden, skinId, this.crateManager?.getInventory()?.equippedGun); }
    public buildMap(mapId: MapId) { this.mansionGroup = this.roundManager.buildMap(mapId); }
    public buildMansion() { this.buildMap("hotel2"); }
    public spawnCoins() { spawnMapCoins(this.scene, this.currentMapId, this.coins); }
    public startMapVoting() { this.roundManager.startMapVoting(); }
    public castMapVote(mapId: MapId) { this.roundManager.castMapVote(mapId); }
    public finishMapVoting() { this.startRound(this.roundManager.finishMapVoting()); }
    public startRound(forcedMap?: MapId) { this.mansionGroup = this.roundManager.startRound(forcedMap); }
    public get playerVotedMap(): MapId | null { return this.roundManager?.playerVotedMap ?? null; }
    public set playerVotedMap(v: MapId | null) { if (this.roundManager) this.roundManager.playerVotedMap = v; }
    public get mapVotes(): Record<MapId, number> { return this.roundManager?.mapVotes ?? ({} as any); }
    public set mapVotes(v: Record<MapId, number>) { if (this.roundManager) this.roundManager.mapVotes = v; }
    public get mapVoteCountdown(): number { return this.roundManager?.mapVoteCountdown ?? 0; }
    public set mapVoteCountdown(v: number) { if (this.roundManager) this.roundManager.mapVoteCountdown = v; }

    public closeRoleReveal() {
        const overlay = document.getElementById("role-reveal-overlay");
        if (overlay) overlay.style.display = "none";
        this.state = "in_game";
        const crosshair = document.getElementById("crosshair");
        if (crosshair) crosshair.style.display = "block";
    }

    public updateRoleHud() { this.hudUI.updateRoleHud(); }
    public updateAliveCount() { this.hudUI.updateAliveCount(); }

    public toggleWeapon() {
        if (this.state !== "in_game" || !this.playerChar.isAlive || this.playerChar.role === "innocent") return;
        this.playerChar.hasWeaponEquipped = !this.playerChar.hasWeaponEquipped;
        if (this.playerChar.role === "murderer" && this.playerChar.knifeMesh) {
            this.playerChar.knifeMesh.visible = this.playerChar.hasWeaponEquipped;
        } else if (this.playerChar.role === "sheriff" && this.playerChar.gunMesh) {
            this.playerChar.gunMesh.visible = this.playerChar.hasWeaponEquipped;
        }
        const slotWeapon = document.getElementById("slot-weapon");
        slotWeapon?.classList.toggle("active", this.playerChar.hasWeaponEquipped);
    }

    public getCharacterFromObject(obj: THREE.Object3D | null) { return getCharacterFromObject(obj, this.characters); }
    public hasLineOfSight(from: THREE.Vector3 | { x: number; y: number; z: number }, to: THREE.Vector3 | { x: number; y: number; z: number }) { return hasLineOfSight(from, to, this.wallMeshes); }

    public performAction(screenPos?: { x: number; y: number }) {
        if (this.state !== "in_game" || !this.playerChar.isAlive) return;
        if (!this.playerChar.hasWeaponEquipped && this.playerChar.role !== "innocent") this.toggleWeapon();
        const coords = screenPos ?? { x: 0, y: 0 };
        if (this.playerChar.role === "murderer") {
            this.combatSystem.performMurdererSlash(this.playerChar, coords);
            this.onlineNetwork?.broadcastAction("slash");
        } else if (this.playerChar.role === "sheriff") {
            this.combatSystem.performSheriffShoot(this.playerChar, coords);
            this.onlineNetwork?.broadcastAction("shoot");
        }
    }

    public endRound(winner: "sheriff_win" | "murderer_win" | "time_out", reason: string) {
        this.invisibilitySystem?.reset();
        this.spectatorSystem?.reset();
        this.roundManager.endRound(winner, reason);
    }
    public activateInvisibility() { return this.invisibilitySystem?.activateInvisibility(); }
    public get isPlayerInvisible(): boolean { return !!this.invisibilitySystem?.getIsInvisible(); }
    public triggerUnbox(tier: any) { return this.crateShopUI.triggerUnbox(tier); }
    public renderCrateShop() { this.crateShopUI.renderCrateShop(); }
    public renderInventory() { this.crateShopUI.renderInventory(); }

    public updatePlayer(delta: number = 0.016) {
        updatePlayer(delta, {
            playerChar: this.playerChar, characters: this.characters,
            wallMeshes: this.wallMeshes, mapColliders: this.mapColliders,
            keys: this.keys, joystickInput: this.joystickInput, isSprinting: this.isSprinting,
            cameraYaw: this.cameraYaw, cameraPitch: this.cameraPitch, cameraDistance: this.cameraDistance,
            camera: this.camera, scene: this.scene, state: this.state, coins: this.coins,
            droppedGun: this.droppedGun, emotesWidget: this.emotesWidget,
            interactionPrompt: document.getElementById("interaction-prompt"),
            hudCoinsVal: document.getElementById("hud-coins-val"),
            setCameraYaw: (v) => { this.cameraYaw = v; }, setCameraPitch: (v) => { this.cameraPitch = v; },
            spectatorSystem: this.spectatorSystem
        });
    }

    public updateAI(delta: number = 0.016) {
        updateAI(delta, {
            characters: this.characters, state: this.state,
            mapColliders: this.mapColliders, wallMeshes: this.wallMeshes,
            droppedGun: this.droppedGun, hasSheriffWitnessedMurder: this.hasSheriffWitnessedMurder,
            setHasSheriffWitnessedMurder: (v) => { this.hasSheriffWitnessedMurder = v; },
            addIncidentFeed: (t) => this.addIncidentFeed(t),
            performMurdererSlash: (c) => this.combatSystem.performMurdererSlash(c),
            performSheriffShoot: (c) => this.combatSystem.performSheriffShoot(c),
            pickUpDroppedGun: (c) => this.combatSystem.pickUpDroppedGun(c),
            isPlayerInvisible: this.isPlayerInvisible
        });
    }

    public equipSkin(skinId: string) {
        handleEquipSkin(skinId, this.playerChar, this.crateManager, this.crateShopUI, () => this.updateRoleHud());
    }

    public returnToLobby() {
        this.invisibilitySystem?.reset();
        this.spectatorSystem?.reset();
        this.roundManager.returnToLobby();
    }

    public setAdminRole(role: Role) {
        handleSetAdminRole(role, this.characters, this.playerChar, this.state, this.adminPanelUI, this.hudUI,
            (r) => { this.adminForcedRole = r; }, (msg) => this.addIncidentFeed(msg), () => this.updateRoleHud());
    }

    public addIncidentFeed(text: string) { this.hudUI.addIncidentFeed(text); }

    private updateYardDisplay() {
        const el = document.getElementById("game-yard-val"), icon = document.getElementById("game-yard-icon");
        if (el) el.textContent = yardService.getYards().toLocaleString();
        if (icon) icon.innerHTML = yardService.renderYardSvg(18);
    }

    private animate = () => {
        requestAnimationFrame(this.animate);
        const delta = Math.min(this.clock.getDelta(), 0.1);

        if (this.state === "lobby") {
            this.lobbyCountdown -= delta;
            const lobbySec = document.getElementById("lobby-countdown-sec");
            if (lobbySec) lobbySec.textContent = Math.max(0, Math.ceil(this.lobbyCountdown)) + "s";
            if (this.lobbyCountdown <= 0) this.startMapVoting();
        } else if (this.state === "map_vote") {
            this.roundManager.mapVoteCountdown -= delta;
            const mapTimer = document.getElementById("map-vote-timer");
            if (mapTimer) mapTimer.textContent = Math.max(0, Math.ceil(this.roundManager.mapVoteCountdown)) + "s";
            if (this.roundManager.mapVoteCountdown <= 0) this.finishMapVoting();
        } else if (this.state === "in_game") {
            this.roundTimer -= delta;
            const mins = Math.floor(Math.max(0, this.roundTimer) / 60), secs = Math.floor(Math.max(0, this.roundTimer) % 60);
            const hudTimer = document.getElementById("hud-timer-val");
            if (hudTimer) hudTimer.textContent = mins.toString().padStart(2, "0") + ":" + secs.toString().padStart(2, "0");
            if (this.roundTimer <= 0) this.endRound("time_out", "Aeg sai otsa! Mõrvar ei suutnud kõiki elimineerida!");
        }

        this.coins.forEach(coin => { if (!coin.collected) coin.mesh.rotation.y += delta * 2.5; });
        if (this.droppedGun?.active) this.droppedGun.mesh.rotation.y += delta * 3.0;

        this.updatePlayer(delta);
        this.updateAI(delta);
        this.rosterManager?.update(delta, this.clock.getElapsedTime());
        this.broadcastPlayerState();
        this.renderer.render(this.scene, this.camera);
    };

    private broadcastPlayerState() {
        if (!this.playerChar || !this.onlineNetwork) return;
        const now = performance.now();
        const isMoving = !!(this.keys["KeyW"] || this.keys["KeyS"] || this.keys["KeyA"] || this.keys["KeyD"] ||
            Math.abs(this.joystickInput.x) > 0.1 || Math.abs(this.joystickInput.y) > 0.1);
        if (isMoving && now - this.lastBroadcastTime < 65) return;
        this.lastBroadcastTime = now;
        this.onlineNetwork.broadcastPlayerState({
            id: this.onlineNetwork.getPlayerId(),
            name: this.playerChar.name,
            isOwner: isPlayardOwner(getCurrentUserProfile()?.email),
            x: this.playerChar.position.x,
            y: this.playerChar.position.y,
            z: this.playerChar.position.z,
            rotY: this.playerChar.rotation,
            isMoving,
            isAlive: this.playerChar.isAlive,
            hasWeaponEquipped: this.playerChar.hasWeaponEquipped,
            role: this.playerChar.role,
            coins: this.playerChar.coins
        });
    }
}

function initMmp1() {
    (window as any).THREE = THREE;
    if (!(window as any).mmp1Game) {
        (window as any).mmp1Game = new MurderMysteryGame();
    }
}

if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", initMmp1);
} else {
    initMmp1();
}
