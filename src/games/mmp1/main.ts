import * as THREE from "three";
import { yardService } from "../../shared/yardService";
import { getCurrentUserProfile, isPlayardOwner, isTestMode, canAccessMmp1 } from "../../auth";
import { InGameEmotesWidget } from "../../shared/avatar/InGameEmotesWidget";

import { Role, GameState, MapId, Character, DroppedGun, CoinItem } from "./types";
import { MAP_CATALOG, WEAPON_SKIN_CATALOG } from "./catalog";
import { audio } from "./audio";
import { MmpCrateManager } from "./state/crateManager";
import { buildLobby } from "./world/maps";
import { createUltraRealisticKnife, createUltraRealisticRevolver } from "./models/weaponBuilder";
import { createPartyCharacters } from "./models/partyBuilder";
import { CombatSystem, hasLineOfSight, getCharacterFromObject } from "./systems/combat";
import { updateAI } from "./systems/ai";
import { updatePlayer } from "./systems/playerController";
import { CrateShopUI } from "./ui/crateShopModal";
import { AdminPanelUI } from "./ui/adminPanel";
import { HudUI } from "./ui/hud";
import { InputController } from "./systems/input";
import { RoundManager } from "./world/roundManager";

(window as any).yardService = yardService;

export class MurderMysteryGame {
    private container: HTMLElement;
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    private clock: THREE.Clock;

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

        this.hudUI = new HudUI({
            playerChar: null as any,
            characters: this.characters,
            crateManager: this.crateManager
        });

        this.checkAccessAuthorization();
        this.initLights();
        this.lobbyGroup = buildLobby();
        this.scene.add(this.lobbyGroup);

        const party = createPartyCharacters(this.scene, this.crateManager);
        this.playerChar = party.playerChar;
        this.characters = party.characters;
        (this.hudUI as any).ctx.playerChar = this.playerChar;

        this.combatSystem = new CombatSystem({
            characters: this.characters,
            playerChar: this.playerChar,
            wallMeshes: this.wallMeshes,
            mapColliders: this.mapColliders,
            scene: this.scene,
            camera: this.camera,
            muzzleFlashLight: this.muzzleFlashLight,
            droppedGun: this.droppedGun,
            currentMapId: this.currentMapId,
            isPointerLocked: this.isPointerLocked,
            hasSheriffWitnessedMurder: this.hasSheriffWitnessedMurder,
            lastHero: this.lastHero,
            gunDroppedBanner: document.getElementById("gun-dropped-banner"),
            interactionPrompt: document.getElementById("interaction-prompt"),
            addIncidentFeed: (text) => this.addIncidentFeed(text),
            updateAliveCount: () => this.updateAliveCount(),
            updateRoleHud: () => this.updateRoleHud(),
            endRound: (w, r) => this.endRound(w, r),
            setDroppedGun: (g) => { this.droppedGun = g; },
            setHasSheriffWitnessedMurder: (v) => { this.hasSheriffWitnessedMurder = v; },
            setLastHero: (h) => { this.lastHero = h; }
        });

        this.crateShopUI = new CrateShopUI({
            crateManager: this.crateManager,
            getState: () => this.state,
            isPointerLocked: this.isPointerLocked,
            equipSkin: (s) => this.equipSkin(s)
        });
        this.crateShopUI.init();

        this.adminPanelUI = new AdminPanelUI({
            getState: () => this.state,
            getPlayerRole: () => this.playerChar.role,
            getAdminForcedRole: () => this.adminForcedRole,
            getAdminSelectedMap: () => this.adminSelectedMap,
            setAdminRole: (r) => this.setAdminRole(r),
            setAdminSelectedMap: (m) => { this.adminSelectedMap = m; },
            startRoundWithMap: (m) => this.startRound(m)
        });
        this.adminPanelUI.init();

        this.roundManager = new RoundManager({
            scene: this.scene,
            characters: this.characters,
            playerChar: this.playerChar,
            mapColliders: this.mapColliders,
            wallMeshes: this.wallMeshes,
            mansionGroup: this.mansionGroup,
            lobbyGroup: this.lobbyGroup,
            crateManager: this.crateManager,
            hudUI: this.hudUI,
            getCurrentMapId: () => this.currentMapId,
            setCurrentMapId: (id) => { this.currentMapId = id; },
            getState: () => this.state,
            setState: (s) => { this.state = s; },
            getAdminForcedRole: () => this.adminForcedRole,
            getAdminSelectedMap: () => this.adminSelectedMap,
            getLastHero: () => this.lastHero,
            setLastHero: (c) => { this.lastHero = c; },
            getDroppedGun: () => this.droppedGun,
            setDroppedGun: (g) => { this.droppedGun = g; },
            setRoundTimer: (t) => { this.roundTimer = t; },
            setLobbyCountdown: (t) => { this.lobbyCountdown = t; },
            setHasSheriffWitnessedMurder: (v) => { this.hasSheriffWitnessedMurder = v; },
            spawnCoins: () => this.spawnCoins(),
            addIncidentFeed: (t) => this.addIncidentFeed(t),
            updateRoleHud: () => this.updateRoleHud(),
            updateAliveCount: () => this.updateAliveCount(),
            isPointerLocked: () => this.isPointerLocked
        });

        this.inputController = new InputController({
            container: this.container,
            isPointerLocked: this.isPointerLocked,
            setPointerLocked: (l) => { this.isPointerLocked = l; },
            keys: this.keys,
            setSprinting: (s) => { this.isSprinting = s; },
            joystickInput: this.joystickInput,
            setCameraYaw: (y) => { this.cameraYaw = y; },
            setCameraPitch: (p) => { this.cameraPitch = p; },
            getCameraYaw: () => this.cameraYaw,
            getCameraPitch: () => this.cameraPitch,
            getCameraDistance: () => this.cameraDistance,
            setCameraDistance: (d) => { this.cameraDistance = d; },
            onAction: (coords) => this.performAction(coords),
            onToggleWeapon: () => this.toggleWeapon(),
            onPickUpGun: () => {
                if (this.droppedGun && this.droppedGun.active && this.playerChar.isAlive) {
                    if (this.playerChar.position.distanceTo(this.droppedGun.position) < 3.5) {
                        this.combatSystem.pickUpDroppedGun(this.playerChar);
                    }
                }
            },
            onToggleAdminPanel: () => {
                const modal = document.getElementById("admin-role-modal");
                if (modal && modal.style.display === "flex") {
                    this.adminPanelUI.closeAdminPanel();
                } else {
                    this.adminPanelUI.openAdminPanel();
                }
            },
            onStartMapVoting: () => this.startMapVoting(),
            onCastMapVote: (m) => this.castMapVote(m),
            onCloseRoleReveal: () => this.closeRoleReveal(),
            onReturnToLobby: () => this.returnToLobby(),
            isWeaponEquipped: () => !!this.playerChar?.hasWeaponEquipped,
            alignPlayerRotation: () => {
                if (this.playerChar) this.playerChar.rotation = this.cameraYaw + Math.PI;
            },
            isTouchDragging: this.isTouchDragging,
            setTouchDragging: (d) => { this.isTouchDragging = d; },
            toggleSound: () => {
                audio.soundEnabled = !audio.soundEnabled;
                const soundIcon = document.getElementById("sound-icon");
                if (soundIcon) soundIcon.textContent = audio.soundEnabled ? "🔊" : "🔇";
            }
        });

        this.buildMansion();
        this.emotesWidget = new InGameEmotesWidget({
            getAvatarRig: () => this.playerChar?.avatarRig,
            topOffset: 70,
            leftOffset: 16
        });
        this.spawnCoins();
        this.inputController.bindEvents();

        window.addEventListener("resize", () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this.updateYardDisplay();
        this.animate();
        console.log("MMP1: Murder Mystery 3D initialized successfully.");
    }

    public checkAccessAuthorization() {
        const prof = getCurrentUserProfile();
        const email = prof?.email;
        const authorized = canAccessMmp1(prof);
        const owner = isPlayardOwner(email);
        const testMode = isTestMode();

        if (!authorized && !testMode) {
            const denied = document.getElementById("access-denied-overlay");
            if (denied) denied.style.display = "flex";
        }

        const btnAdmin = document.getElementById("btn-admin-panel");
        if (btnAdmin) {
            btnAdmin.style.display = (owner || testMode) ? "flex" : "none";
        }
    }

    private initLights() {
        const ambientLight = new THREE.AmbientLight(0xfff5ea, 0.55);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffeedd, 0.8);
        dirLight.position.set(25, 45, 20);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.bias = -0.0005;
        this.scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0x7090b0, 0.35);
        fillLight.position.set(-20, 25, -20);
        this.scene.add(fillLight);

        this.muzzleFlashLight = new THREE.PointLight(0xffaa22, 0, 25);
        this.scene.add(this.muzzleFlashLight);
    }

    public createUltraRealisticKnife(skinId?: string): THREE.Group {
        return createUltraRealisticKnife(skinId, this.crateManager?.getInventory()?.equippedKnife);
    }

    public createUltraRealisticRevolver(isGolden = false, skinId?: string): THREE.Group {
        return createUltraRealisticRevolver(isGolden, skinId, this.crateManager?.getInventory()?.equippedGun);
    }

    public buildMap(mapId: MapId) {
        this.mansionGroup = this.roundManager.buildMap(mapId);
    }

    public buildMansion() {
        this.buildMap("hotel2");
    }

    public spawnCoins() {
        this.coins.forEach(c => this.scene.remove(c.mesh));
        this.coins.length = 0;

        const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 12);
        const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.8, roughness: 0.2, emissive: 0x443300 });

        const config = MAP_CATALOG[this.currentMapId] || MAP_CATALOG["hotel2"];
        const positions = config.coinSpawns;

        positions.forEach(([x, y, z]) => {
            const coinMesh = new THREE.Mesh(coinGeo, coinMat);
            coinMesh.position.set(0, 0, 0);
            coinMesh.rotation.x = Math.PI / 2;
            const coinGroup = new THREE.Group();
            coinGroup.add(coinMesh);
            coinGroup.position.set(x, y, z);
            this.scene.add(coinGroup);

            this.coins.push({
                mesh: coinGroup,
                position: new THREE.Vector3(x, y, z),
                collected: false
            });
        });
    }

    public startMapVoting() {
        this.roundManager.startMapVoting();
    }

    public castMapVote(mapId: MapId) {
        this.roundManager.castMapVote(mapId);
    }

    public finishMapVoting() {
        const winning = this.roundManager.finishMapVoting();
        this.startRound(winning);
    }

    public startRound(forcedMap?: MapId) {
        this.mansionGroup = this.roundManager.startRound(forcedMap);
    }

    public closeRoleReveal() {
        const roleRevealOverlay = document.getElementById("role-reveal-overlay");
        if (roleRevealOverlay) roleRevealOverlay.style.display = "none";
        this.state = "in_game";
        const crosshair = document.getElementById("crosshair");
        if (crosshair) crosshair.style.display = "block";
    }

    public updateRoleHud() {
        this.hudUI.updateRoleHud();
    }

    public updateAliveCount() {
        this.hudUI.updateAliveCount();
    }

    public toggleWeapon() {
        if (this.state !== "in_game" || !this.playerChar.isAlive) return;
        if (this.playerChar.role === "innocent") return;

        this.playerChar.hasWeaponEquipped = !this.playerChar.hasWeaponEquipped;
        if (this.playerChar.role === "murderer" && this.playerChar.knifeMesh) {
            this.playerChar.knifeMesh.visible = this.playerChar.hasWeaponEquipped;
        } else if (this.playerChar.role === "sheriff" && this.playerChar.gunMesh) {
            this.playerChar.gunMesh.visible = this.playerChar.hasWeaponEquipped;
        }

        const slotWeapon = document.getElementById("slot-weapon");
        if (slotWeapon) {
            if (this.playerChar.hasWeaponEquipped) slotWeapon.classList.add("active");
            else slotWeapon.classList.remove("active");
        }
    }

    public getCharacterFromObject(obj: THREE.Object3D | null): Character | null {
        return getCharacterFromObject(obj, this.characters);
    }

    public hasLineOfSight(from: THREE.Vector3 | { x: number; y: number; z: number }, to: THREE.Vector3 | { x: number; y: number; z: number }): boolean {
        return hasLineOfSight(from, to, this.wallMeshes);
    }

    public performAction(screenPos?: { x: number; y: number }) {
        if (this.state !== "in_game" || !this.playerChar.isAlive) return;
        if (!this.playerChar.hasWeaponEquipped && this.playerChar.role !== "innocent") {
            this.toggleWeapon();
        }
        const coords = screenPos ?? { x: 0, y: 0 };
        if (this.playerChar.role === "murderer") {
            this.combatSystem.performMurdererSlash(this.playerChar, coords);
        } else if (this.playerChar.role === "sheriff") {
            this.combatSystem.performSheriffShoot(this.playerChar, coords);
        }
    }

    public endRound(winner: "sheriff_win" | "murderer_win" | "time_out", reason: string) {
        this.roundManager.endRound(winner, reason);
    }

    public triggerUnbox(tier: any) {
        return this.crateShopUI.triggerUnbox(tier);
    }

    public renderCrateShop() {
        this.crateShopUI.renderCrateShop();
    }

    public renderInventory() {
        this.crateShopUI.renderInventory();
    }

    public updatePlayer(delta: number = 0.016) {
        updatePlayer(delta, {
            playerChar: this.playerChar,
            characters: this.characters,
            wallMeshes: this.wallMeshes,
            mapColliders: this.mapColliders,
            keys: this.keys,
            joystickInput: this.joystickInput,
            isSprinting: this.isSprinting,
            cameraYaw: this.cameraYaw,
            cameraPitch: this.cameraPitch,
            cameraDistance: this.cameraDistance,
            camera: this.camera,
            scene: this.scene,
            state: this.state,
            coins: this.coins,
            droppedGun: this.droppedGun,
            emotesWidget: this.emotesWidget,
            interactionPrompt: document.getElementById("interaction-prompt"),
            hudCoinsVal: document.getElementById("hud-coins-val"),
            setCameraYaw: (v) => { this.cameraYaw = v; },
            setCameraPitch: (v) => { this.cameraPitch = v; }
        });
    }

    public updateAI(delta: number = 0.016) {
        updateAI(delta, {
            characters: this.characters,
            state: this.state,
            mapColliders: this.mapColliders,
            wallMeshes: this.wallMeshes,
            droppedGun: this.droppedGun,
            hasSheriffWitnessedMurder: this.hasSheriffWitnessedMurder,
            setHasSheriffWitnessedMurder: (v) => { this.hasSheriffWitnessedMurder = v; },
            addIncidentFeed: (t) => this.addIncidentFeed(t),
            performMurdererSlash: (c) => this.combatSystem.performMurdererSlash(c),
            performSheriffShoot: (c) => this.combatSystem.performSheriffShoot(c),
            pickUpDroppedGun: (c) => this.combatSystem.pickUpDroppedGun(c)
        });
    }

    public equipSkin(skinId: string) {
        const skin = WEAPON_SKIN_CATALOG[skinId];
        if (!skin) return;

        this.crateManager.equipSkin(skinId);

        if (this.playerChar && this.playerChar.avatarRig && this.playerChar.avatarRig.bones.rightArm) {
            if (skin.type === "knife") {
                const wasVis = this.playerChar.knifeMesh ? this.playerChar.knifeMesh.visible : false;
                if (this.playerChar.knifeMesh) {
                    this.playerChar.avatarRig.bones.rightArm.remove(this.playerChar.knifeMesh);
                }
                const newKnife = this.createUltraRealisticKnife(skinId);
                newKnife.position.set(0.04, -0.92, 0.08);
                newKnife.rotation.set(-Math.PI * 0.45, 0, -Math.PI / 16);
                newKnife.visible = wasVis;
                this.playerChar.knifeMesh = newKnife;
                this.playerChar.avatarRig.bones.rightArm.add(newKnife);
            } else {
                const wasVis = this.playerChar.gunMesh ? this.playerChar.gunMesh.visible : false;
                if (this.playerChar.gunMesh) {
                    this.playerChar.avatarRig.bones.rightArm.remove(this.playerChar.gunMesh);
                }
                const newGun = this.createUltraRealisticRevolver(false, skinId);
                newGun.position.set(0.02, -0.82, 0.12);
                newGun.rotation.set(0, 0, 0);
                newGun.visible = wasVis;
                this.playerChar.gunMesh = newGun;
                this.playerChar.avatarRig.bones.rightArm.add(newGun);
            }
        }

        this.updateRoleHud();
        this.crateShopUI.renderInventory();
    }

    public returnToLobby() {
        this.roundManager.returnToLobby();
    }

    public setAdminRole(role: Role) {
        this.adminForcedRole = role;
        this.adminPanelUI.updateAdminModalActiveState();

        const roleNames: Record<Role, string> = {
            murderer: "MÕRVAR 🔪",
            sheriff: "ŠERIF 🔫",
            innocent: "SÜÜTU 🛡️"
        };

        if (this.state === "lobby") {
            this.addIncidentFeed("👑 Admin valis oma rolliks: " + roleNames[role]);
        } else if (this.state === "in_game" && this.playerChar.isAlive) {
            const oldRole = this.playerChar.role;
            this.playerChar.role = role;
            this.playerChar.hasWeaponEquipped = false;
            if (this.playerChar.knifeMesh) this.playerChar.knifeMesh.visible = false;
            if (this.playerChar.gunMesh) this.playerChar.gunMesh.visible = false;

            if (role === "murderer") {
                this.characters.forEach(c => {
                    if (!c.isPlayer && c.role === "murderer") {
                        c.role = "innocent";
                        c.hasWeaponEquipped = false;
                        if (c.knifeMesh) c.knifeMesh.visible = false;
                    }
                });
                if (!this.characters.some(c => !c.isPlayer && c.isAlive && c.role === "sheriff")) {
                    const livingBot = this.characters.find(c => !c.isPlayer && c.isAlive);
                    if (livingBot) livingBot.role = "sheriff";
                }
            } else if (role === "sheriff") {
                this.characters.forEach(c => {
                    if (!c.isPlayer && c.role === "sheriff") {
                        c.role = "innocent";
                        c.hasWeaponEquipped = false;
                        if (c.gunMesh) c.gunMesh.visible = false;
                    }
                });
                if (!this.characters.some(c => !c.isPlayer && c.isAlive && c.role === "murderer")) {
                    const livingBot = this.characters.find(c => !c.isPlayer && c.isAlive);
                    if (livingBot) livingBot.role = "murderer";
                }
            } else if (role === "innocent") {
                if (oldRole === "murderer") {
                    const livingBot = this.characters.find(c => !c.isPlayer && c.isAlive && c.role === "innocent");
                    if (livingBot) livingBot.role = "murderer";
                }
                if (oldRole === "sheriff") {
                    const livingBot = this.characters.find(c => !c.isPlayer && c.isAlive && c.role === "innocent");
                    if (livingBot) livingBot.role = "sheriff";
                }
            }

            this.updateRoleHud();
            audio.playRoleReveal(role);
            this.addIncidentFeed("👑 Sinu roll on nüüd: " + roleNames[role] + "!");
        }
    }

    public addIncidentFeed(text: string) {
        this.hudUI.addIncidentFeed(text);
    }

    private updateYardDisplay() {
        const yards = yardService.getYards();
        const el = document.getElementById("game-yard-val");
        if (el) el.textContent = yards.toLocaleString();
        const icon = document.getElementById("game-yard-icon");
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
            const mins = Math.floor(Math.max(0, this.roundTimer) / 60);
            const secs = Math.floor(Math.max(0, this.roundTimer) % 60);
            const hudTimer = document.getElementById("hud-timer-val");
            if (hudTimer) hudTimer.textContent = mins.toString().padStart(2, "0") + ":" + secs.toString().padStart(2, "0");
            if (this.roundTimer <= 0) this.endRound("time_out", "Aeg sai otsa! Mõrvar ei suutnud kõiki elimineerida!");
        }

        this.coins.forEach(coin => {
            if (!coin.collected) coin.mesh.rotation.y += delta * 2.5;
        });

        if (this.droppedGun && this.droppedGun.active) {
            this.droppedGun.mesh.rotation.y += delta * 3.0;
        }

        this.updatePlayer(delta);
        this.updateAI(delta);

        this.renderer.render(this.scene, this.camera);
    };
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
