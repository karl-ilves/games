import * as THREE from "three";
import { Character, MapId, Role, GameState } from "../types";
import { CombatSystem } from "./combat";
import { CrateShopUI } from "../ui/crateShopModal";
import { AdminPanelUI } from "../ui/adminPanel";
import { RoundManager } from "../world/roundManager";
import { InputController } from "./input";
import { HudUI } from "../ui/hud";
import { MmpCrateManager } from "../state/crateManager";
import { audio } from "../audio";
import { InvisibilitySystem } from "./invisibilitySystem";

export function createGameSystems(game: any): {
    combatSystem: CombatSystem;
    crateShopUI: CrateShopUI;
    adminPanelUI: AdminPanelUI;
    roundManager: RoundManager;
    inputController: InputController;
    invisibilitySystem: InvisibilitySystem;
} {
    const combatSystem = new CombatSystem({
        characters: game.characters,
        playerChar: game.playerChar,
        wallMeshes: game.wallMeshes,
        mapColliders: game.mapColliders,
        scene: game.scene,
        camera: game.camera,
        get muzzleFlashLight() { return game.muzzleFlashLight; },
        get droppedGun() { return game.droppedGun; },
        get currentMapId() { return game.currentMapId; },
        get isPointerLocked() { return game.isPointerLocked; },
        get hasSheriffWitnessedMurder() { return game.hasSheriffWitnessedMurder; },
        get lastHero() { return game.lastHero; },
        gunDroppedBanner: document.getElementById("gun-dropped-banner"),
        interactionPrompt: document.getElementById("interaction-prompt"),
        addIncidentFeed: (t: string) => game.addIncidentFeed(t),
        updateAliveCount: () => game.updateAliveCount(),
        updateRoleHud: () => game.updateRoleHud(),
        endRound: (w: any, r: string) => game.endRound(w, r),
        setDroppedGun: (g: any) => { game.droppedGun = g; },
        setHasSheriffWitnessedMurder: (v: boolean) => { game.hasSheriffWitnessedMurder = v; },
        setLastHero: (h: any) => { game.lastHero = h; },
        isPlayerInvisible: () => game.isPlayerInvisible
    });

    const invisibilitySystem = new InvisibilitySystem({
        playerChar: game.playerChar,
        crateManager: game.crateManager,
        getState: () => game.state,
        addIncidentFeed: (t: string) => game.addIncidentFeed(t)
    });
    invisibilitySystem.init();

    const crateShopUI = new CrateShopUI({
        crateManager: game.crateManager,
        getState: () => game.state,
        get isPointerLocked() { return game.isPointerLocked; },
        equipSkin: (s: string) => game.equipSkin(s),
        onGamePassUnlocked: () => invisibilitySystem.updateSlotVisibility()
    });
    crateShopUI.init();

    const adminPanelUI = new AdminPanelUI({
        getState: () => game.state,
        getPlayerRole: () => game.playerChar.role,
        getAdminForcedRole: () => game.adminForcedRole,
        getAdminSelectedMap: () => game.adminSelectedMap,
        setAdminRole: (r: Role) => game.setAdminRole(r),
        setAdminSelectedMap: (m: any) => { game.adminSelectedMap = m; },
        addMoney: (n: number) => game.crateManager.addMoney(n),
        startRound: () => game.startRound(),
        addIncidentFeed: (t: string) => game.addIncidentFeed(t),
        get isPointerLocked() { return game.isPointerLocked; }
    });
    

    const roundManager = new RoundManager({
        scene: game.scene,
        characters: game.characters,
        playerChar: game.playerChar,
        mapColliders: game.mapColliders,
        wallMeshes: game.wallMeshes,
        get mansionGroup() { return game.mansionGroup; },
        lobbyGroup: game.lobbyGroup,
        crateManager: game.crateManager,
        hudUI: game.hudUI,
        getCurrentMapId: () => game.currentMapId,
        setCurrentMapId: (id: MapId) => { game.currentMapId = id; },
        getState: () => game.state,
        setState: (s: GameState) => { game.state = s; },
        getAdminForcedRole: () => game.adminForcedRole,
        getAdminSelectedMap: () => game.adminSelectedMap,
        getLastHero: () => game.lastHero,
        setLastHero: (c: any) => { game.lastHero = c; },
        getDroppedGun: () => game.droppedGun,
        setDroppedGun: (g: any) => { game.droppedGun = g; },
        setRoundTimer: (t: number) => { game.roundTimer = t; },
        setLobbyCountdown: (t: number) => { game.lobbyCountdown = t; },
        setHasSheriffWitnessedMurder: (v: boolean) => { game.hasSheriffWitnessedMurder = v; },
        spawnCoins: () => game.spawnCoins(),
        addIncidentFeed: (t: string) => game.addIncidentFeed(t),
        updateRoleHud: () => game.updateRoleHud(),
        updateAliveCount: () => game.updateAliveCount(),
        isPointerLocked: () => game.isPointerLocked
    });

    const inputController = new InputController({
        container: game.container,
        get isPointerLocked() { return game.isPointerLocked; },
        setPointerLocked: (l: boolean) => { game.isPointerLocked = l; },
        keys: game.keys,
        setSprinting: (s: boolean) => { game.isSprinting = s; },
        joystickInput: game.joystickInput,
        setCameraYaw: (y: number) => { game.cameraYaw = y; },
        setCameraPitch: (p: number) => { game.cameraPitch = p; },
        getCameraYaw: () => game.cameraYaw,
        getCameraPitch: () => game.cameraPitch,
        getCameraDistance: () => game.cameraDistance,
        setCameraDistance: (d: number) => { game.cameraDistance = d; },
        onAction: (c?: any) => game.performAction(c),
        onToggleWeapon: () => game.toggleWeapon(),
        onPickUpGun: () => {
            if (game.droppedGun?.active && game.playerChar.isAlive && game.playerChar.position.distanceTo(game.droppedGun.position) < 3.5) {
                game.combatSystem.pickUpDroppedGun(game.playerChar);
            }
        },
        onToggleAdminPanel: () => {
            const modal = document.getElementById("admin-role-modal");
            modal?.style.display === "flex" ? game.adminPanelUI.closeAdminPanel() : game.adminPanelUI.openAdminPanel();
        },
        onStartMapVoting: () => game.startMapVoting(),
        onCastMapVote: (m: MapId) => game.castMapVote(m),
        onCloseRoleReveal: () => game.closeRoleReveal(),
        onReturnToLobby: () => game.returnToLobby(),
        isWeaponEquipped: () => !!game.playerChar?.hasWeaponEquipped,
        alignPlayerRotation: () => { if (game.playerChar) game.playerChar.rotation = game.cameraYaw + Math.PI; },
        isTouchDragging: game.isTouchDragging,
        setTouchDragging: (d: boolean) => { game.isTouchDragging = d; },
        toggleSound: () => {
            audio.soundEnabled = !audio.soundEnabled;
            const icon = document.getElementById("sound-icon");
            if (icon) icon.textContent = audio.soundEnabled ? "🔊" : "🔇";
        },
        onActivateInvisibility: () => invisibilitySystem.activateInvisibility()
    });

    return { combatSystem, crateShopUI, adminPanelUI, roundManager, inputController, invisibilitySystem };
}
