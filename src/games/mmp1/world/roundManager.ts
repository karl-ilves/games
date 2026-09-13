import * as THREE from 'three';
import { Role, GameState, MapId, Character } from '../types';
import { MAP_CATALOG } from '../catalog';
import { audio } from '../audio';
import { MapBuilder } from './maps';
import { yardService } from '../../../shared/yardService';
import { MmpCrateManager } from '../state/crateManager';
import { HudUI } from '../ui/hud';

export interface RoundContext {
    scene: THREE.Scene;
    characters: Character[];
    playerChar: Character;
    mapColliders: THREE.Box3[];
    wallMeshes: THREE.Mesh[];
    mansionGroup: THREE.Group;
    lobbyGroup: THREE.Group;
    crateManager: MmpCrateManager;
    hudUI: HudUI;
    getCurrentMapId: () => MapId;
    setCurrentMapId: (id: MapId) => void;
    getState: () => GameState;
    setState: (s: GameState) => void;
    getAdminForcedRole: () => Role | null;
    getAdminSelectedMap: () => MapId | "random";
    getLastHero: () => Character | null;
    setLastHero: (c: Character | null) => void;
    getDroppedGun: () => any;
    setDroppedGun: (g: any) => void;
    setRoundTimer: (t: number) => void;
    setLobbyCountdown: (t: number) => void;
    setHasSheriffWitnessedMurder: (v: boolean) => void;
    spawnCoins: () => void;
    addIncidentFeed: (text: string) => void;
    updateRoleHud: () => void;
    updateAliveCount: () => void;
    isPointerLocked: () => boolean;
}

export class RoundManager {
    private ctx: RoundContext;
    public playerVotedMap: MapId | null = null;
    public mapVotes: Record<MapId, number> = { hotel2: 0, milbase: 0, office: 0, vacation: 0, yatchy: 0 };
    public mapVoteCountdown: number = 5;

    constructor(ctx: RoundContext) {
        this.ctx = ctx;
    }

    public buildMap(mapId: MapId) {
        this.ctx.setCurrentMapId(mapId);
        const config = MAP_CATALOG[mapId];

        if (this.ctx.mansionGroup) {
            this.ctx.scene.remove(this.ctx.mansionGroup);
        }
        const newMansionGroup = new THREE.Group();
        newMansionGroup.position.set(0, 0, 0);
        this.ctx.mapColliders.length = 0;
        this.ctx.wallMeshes.length = 0;

        const hudMapText = document.getElementById("hud-map-text");
        const endMapName = document.getElementById("end-map-name");
        if (hudMapText) hudMapText.textContent = config.icon + " " + config.name;
        if (endMapName) endMapName.textContent = config.icon + " " + config.name;

        const builder = new MapBuilder({
            mansionGroup: newMansionGroup,
            mapColliders: this.ctx.mapColliders,
            wallMeshes: this.ctx.wallMeshes
        });

        switch (mapId) {
            case "hotel2": builder.buildHotel2Map(); break;
            case "milbase": builder.buildMilBaseMap(); break;
            case "office": builder.buildOfficeMap(); break;
            case "vacation": builder.buildVacationMap(); break;
            case "yatchy": builder.buildYatchyMap(); break;
            default: builder.buildHotel2Map(); break;
        }

        this.ctx.scene.add(newMansionGroup);
        return newMansionGroup;
    }

    public startMapVoting() {
        this.ctx.setState("map_vote");
        this.mapVoteCountdown = 5;
        this.playerVotedMap = null;
        this.mapVotes = { hotel2: 0, milbase: 0, office: 0, vacation: 0, yatchy: 0 };

        const lobbyBanner = document.getElementById("lobby-banner");
        if (lobbyBanner) lobbyBanner.style.display = "none";

        const mapKeys: MapId[] = ["hotel2", "milbase", "office", "vacation", "yatchy"];
        const botCount = this.ctx.characters.filter(c => !c.isPlayer).length;
        for (let i = 0; i < botCount; i++) {
            const botPick = mapKeys[Math.floor(Math.random() * mapKeys.length)];
            this.mapVotes[botPick]++;
        }

        this.updateMapVoteUI();
        const mapVoteOverlay = document.getElementById("map-vote-overlay");
        if (mapVoteOverlay) mapVoteOverlay.style.display = "flex";
        audio.playVoteSound();
        this.ctx.addIncidentFeed("🗺️ Kaardi hääletus algas! Vali kaart järgmiseks vooruks!");
    }

    public castMapVote(mapId: MapId) {
        if (this.ctx.getState() !== "map_vote") return;
        if (this.playerVotedMap) {
            this.mapVotes[this.playerVotedMap] = Math.max(0, this.mapVotes[this.playerVotedMap] - 1);
        }
        this.playerVotedMap = mapId;
        this.mapVotes[mapId]++;
        audio.playVoteSound();
        this.updateMapVoteUI();
        this.ctx.addIncidentFeed("🗳️ Hääletasid kaardi poolt: " + (MAP_CATALOG[mapId]?.name || mapId));
    }

    public updateMapVoteUI() {
        const mapKeys: MapId[] = ["hotel2", "milbase", "office", "vacation", "yatchy"];
        mapKeys.forEach(m => {
            const badge = document.getElementById("badge-vote-" + m);
            if (badge) badge.textContent = this.mapVotes[m].toString();
            const btn = document.querySelector(`.map-vote-btn[data-map="${m}"]`);
            if (btn) {
                if (this.playerVotedMap === m) btn.classList.add("selected-vote");
                else btn.classList.remove("selected-vote");
            }
        });
    }

    public finishMapVoting(): MapId {
        const mapVoteOverlay = document.getElementById("map-vote-overlay");
        if (mapVoteOverlay) mapVoteOverlay.style.display = "none";

        let winningMap: MapId = "hotel2";
        const adminMap = this.ctx.getAdminSelectedMap();
        if (adminMap && adminMap !== "random") {
            winningMap = adminMap;
        } else {
            const mapKeys: MapId[] = ["hotel2", "milbase", "office", "vacation", "yatchy"];
            let maxVotes = -1;
            let candidates: MapId[] = [];
            mapKeys.forEach(m => {
                const v = this.mapVotes[m] || 0;
                if (v > maxVotes) {
                    maxVotes = v;
                    candidates = [m];
                } else if (v === maxVotes) {
                    candidates.push(m);
                }
            });
            winningMap = candidates[Math.floor(Math.random() * candidates.length)] || "hotel2";
        }

        const mapConfig = MAP_CATALOG[winningMap];
        this.ctx.addIncidentFeed("🏆 Kaardi valik lõppes! Valiti: " + mapConfig.icon + " " + mapConfig.name + "!");
        return winningMap;
    }

    public startRound(forcedMap?: MapId) {
        this.ctx.setState("role_reveal");
        this.ctx.setLastHero(null);
        this.ctx.setHasSheriffWitnessedMurder(false);
        const lobbyBanner = document.getElementById("lobby-banner");
        const mapVoteOverlay = document.getElementById("map-vote-overlay");
        if (lobbyBanner) lobbyBanner.style.display = "none";
        if (mapVoteOverlay) mapVoteOverlay.style.display = "none";

        const mapKeys: MapId[] = ["hotel2", "milbase", "office", "vacation", "yatchy"];
        const adminMap = this.ctx.getAdminSelectedMap();
        let chosenMap: MapId = forcedMap || (adminMap && adminMap !== "random" ? adminMap : mapKeys[Math.floor(Math.random() * mapKeys.length)]);

        const newMansionGroup = this.buildMap(chosenMap);

        if (this.ctx.lobbyGroup) this.ctx.lobbyGroup.visible = false;
        if (newMansionGroup) newMansionGroup.visible = true;

        this.ctx.characters.forEach(c => {
            c.role = "innocent";
            c.isAlive = true;
            c.hasWeaponEquipped = false;
            c.mesh.visible = true;
            if (c.knifeMesh) c.knifeMesh.visible = false;
            if (c.gunMesh) c.gunMesh.visible = false;
            c.aiTarget = undefined;
            c.aiTimer = 2 + Math.random() * 2;
        });

        const adminRole = this.ctx.getAdminForcedRole();
        if (adminRole) {
            this.ctx.playerChar.role = adminRole;
            const livingBots = this.ctx.characters.filter(c => !c.isPlayer).sort(() => Math.random() - 0.5);
            if (adminRole === "murderer") {
                livingBots[0].role = "sheriff";
            } else if (adminRole === "sheriff") {
                livingBots[0].role = "murderer";
            } else {
                livingBots[0].role = "murderer";
                livingBots[1].role = "sheriff";
            }
        } else {
            const shuffled = [...this.ctx.characters].sort(() => Math.random() - 0.5);
            shuffled[0].role = "murderer";
            shuffled[1].role = "sheriff";
        }

        const mapConfig = MAP_CATALOG[chosenMap];
        const spawns = mapConfig.spawnPoints;
        const playerSize = new THREE.Vector3(1.2, 3, 1.2);
        this.ctx.characters.forEach((c, i) => {
            const pt = spawns[i % spawns.length];
            c.position.set(pt[0], pt[1], pt[2]);

            let spawnBox = new THREE.Box3().setFromCenterAndSize(c.position.clone().add(new THREE.Vector3(0, 1.5, 0)), playerSize);
            if (this.ctx.mapColliders.some(w => w.intersectsBox(spawnBox))) {
                const offsets = [
                    [0, 2], [0, -2], [2, 0], [-2, 0],
                    [2, 2], [-2, 2], [2, -2], [-2, -2],
                    [0, 4], [0, -4], [4, 0], [-4, 0],
                    [0, 6], [0, -6], [6, 0], [-6, 0]
                ];
                for (const [dx, dz] of offsets) {
                    const testPos = c.position.clone().add(new THREE.Vector3(dx, 0, dz));
                    const testBox = new THREE.Box3().setFromCenterAndSize(testPos.clone().add(new THREE.Vector3(0, 1.5, 0)), playerSize);
                    if (!this.ctx.mapColliders.some(w => w.intersectsBox(testBox))) {
                        c.position.copy(testPos);
                        break;
                    }
                }
            }

            c.mesh.position.copy(c.position);
            c.rotation = Math.atan2(-c.position.x, -c.position.z);
            c.mesh.rotation.y = c.rotation;
        });

        this.ctx.spawnCoins();

        const dropped = this.ctx.getDroppedGun();
        if (dropped) {
            this.ctx.scene.remove(dropped.mesh);
            this.ctx.setDroppedGun(null);
        }
        const gunDroppedBanner = document.getElementById("gun-dropped-banner");
        if (gunDroppedBanner) gunDroppedBanner.style.display = "none";

        this.ctx.hudUI.showRoleRevealModal(this.ctx.playerChar.role);
        audio.playRoleReveal(this.ctx.playerChar.role);

        this.ctx.updateRoleHud();
        const hudAliveBadge = document.getElementById("hud-alive-badge");
        const hudCoinsBadge = document.getElementById("hud-coins-badge");
        if (hudAliveBadge) hudAliveBadge.style.display = "flex";
        if (hudCoinsBadge) hudCoinsBadge.style.display = "flex";
        this.ctx.updateAliveCount();

        this.ctx.setRoundTimer(180);
        this.ctx.addIncidentFeed("🏛️ Mängijad teleportiti kaardile: " + mapConfig.icon + " " + mapConfig.name + "!");
        return newMansionGroup;
    }

    public endRound(winner: "sheriff_win" | "murderer_win" | "time_out", reason: string) {
        this.ctx.setState("round_end");
        if (this.ctx.isPointerLocked()) document.exitPointerLock?.();
        audio.playVictory();

        const crosshair = document.getElementById("crosshair");
        if (crosshair) crosshair.style.display = "none";

        const endTitle = document.getElementById("end-title");
        const endReason = document.getElementById("end-reason");
        const endMurderer = document.getElementById("end-murderer-name");
        const endHero = document.getElementById("end-hero-name");
        const endReward = document.getElementById("end-reward-yards");
        const trophy = document.getElementById("end-trophy-icon");

        const murderer = this.ctx.characters.find(c => c.role === "murderer");
        const hero = this.ctx.getLastHero() || this.ctx.characters.find(c => c.role === "sheriff");

        if (endMurderer && murderer) endMurderer.textContent = murderer.name;
        if (endHero && hero) endHero.textContent = hero.name;
        if (endReason) endReason.textContent = reason;

        const curMap = MAP_CATALOG[this.ctx.getCurrentMapId()] || MAP_CATALOG["hotel2"];
        const endMapName = document.getElementById("end-map-name");
        if (endMapName) endMapName.textContent = curMap.icon + " " + curMap.name;

        let rewardMoney = 0;
        let wonLegendaryCrate = false;

        if (winner === "sheriff_win") {
            if (endTitle) {
                const isDetectiveHero = (hero && hero.role === "sheriff" && hero.id !== "innocent");
                endTitle.textContent = isDetectiveHero ? "DETECTIVE WINS 🔫" : "INNOCENTS WIN 🏆";
                endTitle.style.color = "#00f2fe";
            }
            if (trophy) trophy.textContent = "🔫";

            if (this.ctx.playerChar.role === "sheriff") rewardMoney = 100;
            else if (this.ctx.playerChar.role === "innocent") rewardMoney = 50;
            if (this.ctx.getLastHero() === this.ctx.playerChar) rewardMoney = Math.max(rewardMoney, 100);
        } else if (winner === "murderer_win") {
            if (endTitle) {
                endTitle.textContent = "MURDERER WINS 🔪";
                endTitle.style.color = "#ff2e63";
            }
            if (trophy) trophy.textContent = "🩸";

            if (this.ctx.playerChar.role === "murderer") {
                rewardMoney = 200;
                wonLegendaryCrate = true;
                this.ctx.crateManager.awardCrate("legendary", 1);
            }
        } else {
            if (endTitle) {
                endTitle.textContent = "INNOCENTS WIN 🏆";
                endTitle.style.color = "#2ecc71";
            }
            if (trophy) trophy.textContent = "🏆";
            if (this.ctx.playerChar.role === "innocent" || this.ctx.playerChar.role === "sheriff") rewardMoney = 50;
        }

        rewardMoney += (this.ctx.playerChar.coins || 0) * 5;
        this.ctx.crateManager.addMoney(rewardMoney);

        const endRewardMoney = document.getElementById("end-reward-money");
        if (endRewardMoney) endRewardMoney.textContent = rewardMoney.toString();

        const endRewardCrateBox = document.getElementById("end-reward-crate-box");
        if (endRewardCrateBox) endRewardCrateBox.style.display = wonLegendaryCrate ? "block" : "none";
        if (endReward) endReward.textContent = "0";

        yardService.recordPlayedGame({
            id: "mmp1",
            title: "🔪 MMP1 (Murder Mystery)",
            description: "3D Murder Mystery arena with Murderer, Sheriff, and Innocent roles.",
            url: "./games/mmp1/index.html",
            icon: "🔪",
            badgeText: "Murder Mystery"
        });

        const roundEndOverlay = document.getElementById("round-end-overlay");
        if (roundEndOverlay) roundEndOverlay.style.display = "flex";
    }

    public returnToLobby() {
        const roundEndOverlay = document.getElementById("round-end-overlay");
        if (roundEndOverlay) roundEndOverlay.style.display = "none";
        this.ctx.setState("lobby");
        this.ctx.setLobbyCountdown(40);

        const lobbyBanner = document.getElementById("lobby-banner");
        const hudAliveBadge = document.getElementById("hud-alive-badge");
        const hudCoinsBadge = document.getElementById("hud-coins-badge");
        if (lobbyBanner) lobbyBanner.style.display = "flex";
        if (hudAliveBadge) hudAliveBadge.style.display = "none";
        if (hudCoinsBadge) hudCoinsBadge.style.display = "none";

        if (this.ctx.lobbyGroup) this.ctx.lobbyGroup.visible = true;
        if (this.ctx.mansionGroup) this.ctx.mansionGroup.visible = false;

        this.ctx.playerChar.position.set(0, 0, 150);
        this.ctx.playerChar.rotation = Math.PI;
        this.ctx.playerChar.mesh.position.copy(this.ctx.playerChar.position);
        this.ctx.playerChar.mesh.rotation.y = this.ctx.playerChar.rotation;

        const botNames = ["Alex", "Sam", "Jordan", "Charlie", "Taylor", "Morgan", "Riley"];
        this.ctx.characters.forEach((c, i) => {
            c.role = "innocent";
            c.isAlive = true;
            c.hasWeaponEquipped = false;
            c.mesh.visible = true;
            if (c.knifeMesh) c.knifeMesh.visible = false;
            if (c.gunMesh) c.gunMesh.visible = false;
            c.aiTarget = undefined;
            c.aiTimer = 1.5 + Math.random() * 2;
            if (!c.isPlayer) {
                const angle = -Math.PI * 0.7 + ((i - 1) / (botNames.length - 1)) * (Math.PI * 1.4);
                const radius = 7.0 + (i % 2) * 1.2;
                c.position.set(Math.sin(angle) * radius, 0, 150 - Math.cos(angle) * radius);
                c.mesh.position.copy(c.position);
                c.rotation = Math.atan2(-c.position.x, 150 - c.position.z);
                c.mesh.rotation.y = c.rotation;
            }
        });

        this.ctx.playerChar.coins = 0;
        const hudCoinsVal = document.getElementById("hud-coins-val");
        if (hudCoinsVal) hudCoinsVal.textContent = "0";
        this.ctx.setHasSheriffWitnessedMurder(false);

        const hudRoleIcon = document.getElementById("hud-role-icon");
        const hudRoleText = document.getElementById("hud-role-text");
        const hudRoleBadge = document.getElementById("hud-role-badge");
        if (hudRoleIcon) hudRoleIcon.textContent = "⏳";
        if (hudRoleText) hudRoleText.textContent = "LOBBY";
        if (hudRoleBadge) {
            hudRoleBadge.style.borderColor = "#ffd32a";
            hudRoleBadge.style.color = "#ffd32a";
        }
        this.ctx.updateRoleHud();
    }
}
