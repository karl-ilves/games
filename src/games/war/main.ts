import * as THREE from 'three';
import { supabase } from '../../lib/supabase';
import { getCurrentUserProfile, isUserAdminEmail, isPlayardOwner } from '../../auth';
import { yardService } from '../../shared/yardService';
import { warAudio } from './audio';
import { WarMultiplayerNetwork, MultiplayerEvent } from './multiplayer';

// --- Types & Interfaces ---
type Team = 'red' | 'blue' | 'missile';
type UnitClass = 'tank' | 'soldier' | 'plane' | 'missile';
type ActiveWeapon = 'cannon' | 'mg' | 'airstrike' | 'missile' | 'nuke';

interface CombatUnit {
    id: string;
    name: string;
    team: Team;
    unitClass: UnitClass;
    isLocalPlayer: boolean;
    isBot: boolean;
    hp: number;
    maxHp: number;
    pos: THREE.Vector3;
    rotation: number;
    turretAngle?: number;
    speed: number;
    root: THREE.Group;
    turret?: THREE.Group;
    barrel?: THREE.Mesh;
    leftLeg?: THREE.Mesh;
    rightLeg?: THREE.Mesh;
    nameTagSprite: THREE.Sprite;
    nameTagCanvas: HTMLCanvasElement;
    reloadTimer: number;
    secondaryReloadTimer?: number;
    respawnTimer: number;
    isDead: boolean;
    isCrashing?: boolean;
    crashVelocity?: THREE.Vector3;
    crashRotationSpeed?: THREE.Vector3;
    walkCycle?: number;
    bankAngle?: number;
}

interface Projectile {
    id: string;
    shooterId: string;
    shooterName: string;
    team: Team;
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    damage: number;
    explosionRadius: number;
    life: number;
    isExplosive: boolean;
    isCannon: boolean;
    isGrenade?: boolean;
    gravity?: number;
    tumbleSpeed?: THREE.Vector3;
    targetPos?: THREE.Vector3;
}

interface Shockwave {
    mesh: THREE.Mesh;
    currentRadius: number;
    maxRadius: number;
    expansionSpeed: number;
    life: number;
    maxLife: number;
    damage: number;
    shooterId: string;
    shooterName: string;
    team: Team;
    epicenter: THREE.Vector3;
    damagedUnits: Set<string>;
}

interface Particle {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    sizeStart: number;
    sizeEnd: number;
    gravity?: number;
    drag?: number;
    rotSpeed?: THREE.Vector3;
    startColor?: THREE.Color;
    endColor?: THREE.Color;
    fadeOpacity?: boolean;
}

interface ExplosiveBarrel {
    mesh: THREE.Mesh;
    pos: THREE.Vector3;
    hp: number;
    isExploded: boolean;
}

interface WorldObstacle {
    type: 'box' | 'circle';
    minX?: number;
    maxX?: number;
    minZ?: number;
    maxZ?: number;
    centerX?: number;
    centerZ?: number;
    radius?: number;
    height: number;
}

class WarGameEngine {
    private container: HTMLElement;
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;

    // Local Player Identity & Class
    private localPlayerId = 'p_' + Math.random().toString(36).substring(2, 9);
    private localUsername = 'Commander';
    private localTeam: Team = 'blue';
    private localClass: UnitClass = 'tank';
    private localUnit!: CombatUnit;
    private activeWeapon: ActiveWeapon = 'cannon';
    private mgAmmo = 500;
    private primaryReloadTime = 1.2;
    private primaryReloadTimer = 0;
    private secondaryReloadTimer = 0;
    private airstrikeCooldown = 0;
    private missileCooldown = 0;
    private nukeTimer = 60.0;
    private isSatelliteTargeting = false;
    private satelliteTargetType: 'missile' | 'nuke' = 'missile';
    private satelliteReticleMesh!: THREE.Group;
    private satelliteCamCenter = new THREE.Vector3(0, 0, 0);
    private missileSilos: Map<Team, THREE.Vector3> = new Map();
    private myKills = 0;
    private warMoney = parseInt(localStorage.getItem('playard_war_game_money') || '0', 10);
    private isPlaneUnlocked = false;
    private isMissileUnlocked = false;
    private matchMoneyEarned = 0;

    // Team Scores (Target: 100 Kills)
    private redScore = 0;
    private blueScore = 0;
    private readonly targetScore = 100;
    private isMatchEnded = false;

    // Units (2v2 or PvP up to 10 players)
    private units: Map<string, CombatUnit> = new Map();
    private barrels: ExplosiveBarrel[] = [];
    private projectiles: Projectile[] = [];
    private shockwaves: Shockwave[] = [];
    private particles: Particle[] = [];
    private obstacles: WorldObstacle[] = [];

    // Realtime Multiplayer Network
    private network?: WarMultiplayerNetwork;
    private connectedHumanCount = 1;
    private lastBroadcastTime = 0;

    // Controls
    private keys: Record<string, boolean> = {};
    private mouseScreenPos = new THREE.Vector2();
    private raycaster = new THREE.Raycaster();
    private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    private mouseAimTarget = new THREE.Vector3();

    // Radar Minimap
    private radarCanvas!: HTMLCanvasElement;
    private radarCtx!: CanvasRenderingContext2D | null;

    // Match Start / Restart 3-2-1 Countdown
    private isCountdownActive = false;
    private countdownTimer: any = null;
    private initialBotSpawnMap: Map<string, { pos: THREE.Vector3; rot: number }> = new Map();

    // Out of Bounds Return or Die System
    private isOutOfBounds = false;
    private outOfBoundsTimer = 5.0;

    // Death Explosion Camera Tracking
    private lastDeathPos: THREE.Vector3 | null = null;

    private clock = new THREE.Clock();

    constructor() {
        this.container = document.getElementById('canvas-container') || document.body;
        this.init();
    }

    private async init() {
        this.checkAuthorization();
        this.setupLocalIdentity();
        await this.loadUserDataFromDb();
        try {
            this.setupScene();
            this.buildBattlefield();
        } catch (e) {
            console.error('Error during setupScene/buildBattlefield:', e);
        }
        this.setupDeployModal();
        this.setupUI();
        this.setupInputListeners();
        this.initMultiplayer();

        window.addEventListener('beforeunload', () => this.saveUserDataToDb());

        (window as any).warGameEngine = this;

        this.clock.start();
        this.animate();
    }

    private async loadUserDataFromDb() {
        const prof = getCurrentUserProfile();
        const userId = prof?.id || this.localPlayerId;
        const storageKey = `playard_war_data_${userId}`;

        let hasLocalData = false;
        const localData = localStorage.getItem(storageKey)
                       || (prof?.id ? localStorage.getItem(`playard_war_data_${prof.id}`) : null)
                       || (prof?.username ? localStorage.getItem(`playard_war_data_${prof.username.toLowerCase()}`) : null)
                       || localStorage.getItem('playard_war_game_money');

        if (localData) {
            try {
                if (localData.startsWith('{')) {
                    const parsed = JSON.parse(localData);
                    if (parsed.money !== undefined) {
                        this.warMoney = parsed.money;
                        hasLocalData = true;
                    }
                    if (parsed.isPlaneUnlocked !== undefined) this.isPlaneUnlocked = !!parsed.isPlaneUnlocked;
                    if (parsed.isMissileUnlocked !== undefined) this.isMissileUnlocked = !!parsed.isMissileUnlocked;
                } else {
                    const num = parseInt(localData, 10);
                    if (!isNaN(num)) {
                        this.warMoney = num;
                        hasLocalData = true;
                    }
                }
            } catch (e) {}
        }

        // Also check user profile if available
        if (!hasLocalData && prof) {
            if (typeof prof.war_money === 'number') {
                this.warMoney = prof.war_money;
                hasLocalData = true;
            } else if (typeof prof.warmäng === 'number') {
                this.warMoney = prof.warmäng;
                hasLocalData = true;
            }
        }

        // Cloud Database persistence in Supabase
        const isTestEnv = (window as any).__PLAYARD_TEST_MODE__;
        if (supabase && prof && prof.id && !isTestEnv) {
            try {
                // 1. Primary: load from war_game_stats
                const { data, error } = await supabase
                    .from('war_game_stats')
                    .select('money, is_plane_unlocked, is_missile_unlocked, kills, matches_won')
                    .eq('user_id', prof.id)
                    .single();

                if (data && !error) {
                    if (typeof data.money === 'number') {
                        this.warMoney = data.money;
                        hasLocalData = true;
                    }
                    if (data.is_plane_unlocked !== undefined) this.isPlaneUnlocked = !!data.is_plane_unlocked;
                    if (data.is_missile_unlocked !== undefined) this.isMissileUnlocked = !!data.is_missile_unlocked;
                    if (typeof data.kills === 'number') this.myKills = Math.max(this.myKills, data.kills);
                } else {
                    // 2. Secondary fallback: load from user_progress vehicle_upgrades.war_data
                    const { data: progData } = await supabase
                        .from('user_progress')
                        .select('vehicle_upgrades')
                        .eq('user_id', prof.id)
                        .single();

                    const warBackup = progData?.vehicle_upgrades?.war_data;
                    if (warBackup && typeof warBackup.money === 'number') {
                        this.warMoney = warBackup.money;
                        if (warBackup.isPlaneUnlocked !== undefined) this.isPlaneUnlocked = !!warBackup.isPlaneUnlocked;
                        if (warBackup.isMissileUnlocked !== undefined) this.isMissileUnlocked = !!warBackup.isMissileUnlocked;
                        if (typeof warBackup.kills === 'number') this.myKills = Math.max(this.myKills, warBackup.kills);
                        hasLocalData = true;
                    }
                }
            } catch (e) {
                console.warn('War DB load note:', e);
            }
        }

        // Initial balance rules:
        // Playard Owner gets 200,000 € ONLY on the very first start (when no prior saved war data exists)
        // Others start with 0 €
        if (isPlayardOwner(prof?.email)) {
            const hasOwnerInit = localStorage.getItem(`playard_war_initialized_${userId}`) === 'true';
            if (!hasLocalData && !hasOwnerInit && this.warMoney === 0) {
                this.warMoney = 200000;
                localStorage.setItem(`playard_war_initialized_${userId}`, 'true');
                this.saveUserDataToDb();
            }
        } else if (!hasLocalData) {
            this.warMoney = 0;
            this.saveUserDataToDb();
        }

        this.updateHUD();
    }

    private async saveUserDataToDb() {
        const prof = getCurrentUserProfile();
        const userId = prof?.id || this.localPlayerId;
        const storageKey = `playard_war_data_${userId}`;

        const dataToSave = {
            user_id: userId,
            username: this.localUsername,
            money: this.warMoney,
            isPlaneUnlocked: this.isPlaneUnlocked,
            isMissileUnlocked: this.isMissileUnlocked,
            kills: this.myKills,
            updated_at: new Date().toISOString()
        };

        // 1. Local storage persistence (all relevant user keys)
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        localStorage.setItem('playard_war_game_money', this.warMoney.toString());
        if (prof?.id) localStorage.setItem(`playard_war_data_${prof.id}`, JSON.stringify(dataToSave));
        if (prof?.username) localStorage.setItem(`playard_war_data_${prof.username.toLowerCase()}`, JSON.stringify(dataToSave));
        if (prof?.email) localStorage.setItem(`playard_war_data_${prof.email.toLowerCase()}`, JSON.stringify(dataToSave));

        // Update profile in local storage
        if (prof) {
            prof.warmäng = this.warMoney;
            prof.war_money = this.warMoney;
            try {
                const profilesRaw = localStorage.getItem('playard_user_profiles');
                if (profilesRaw) {
                    const profiles = JSON.parse(profilesRaw);
                    const idx = profiles.findIndex((p: any) => p.id === prof.id || p.username?.toLowerCase() === prof.username?.toLowerCase());
                    if (idx >= 0) {
                        profiles[idx].warmäng = this.warMoney;
                        profiles[idx].war_money = this.warMoney;
                        localStorage.setItem('playard_user_profiles', JSON.stringify(profiles));
                    }
                }
                localStorage.setItem('playard_current_user_profile', JSON.stringify(prof));
            } catch (e) {}
        }

        // 2. Cloud Database persistence in Supabase
        if (supabase && prof && prof.id && !isTestEnv) {
            // A. Primary table: war_game_stats
            try {
                const { error: warErr } = await supabase
                    .from('war_game_stats')
                    .upsert({
                        user_id: prof.id,
                        username: prof.username || this.localUsername,
                        money: this.warMoney,
                        is_plane_unlocked: this.isPlaneUnlocked,
                        is_missile_unlocked: this.isMissileUnlocked,
                        kills: this.myKills,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });
                if (warErr) {
                    console.warn('War Game DB save note (war_game_stats):', warErr);
                }
            } catch (e) {
                console.warn('War Game DB save error:', e);
            }

            // B. Secondary backup: user_progress vehicle_upgrades.war_data
            try {
                const { data: progData } = await supabase
                    .from('user_progress')
                    .select('vehicle_upgrades')
                    .eq('user_id', prof.id)
                    .single();

                const existingUpgrades = (progData && progData.vehicle_upgrades && typeof progData.vehicle_upgrades === 'object')
                    ? progData.vehicle_upgrades
                    : {};

                await supabase.from('user_progress').upsert({
                    user_id: prof.id,
                    vehicle_upgrades: {
                        ...existingUpgrades,
                        war_data: {
                            money: this.warMoney,
                            isPlaneUnlocked: this.isPlaneUnlocked,
                            isMissileUnlocked: this.isMissileUnlocked,
                            kills: this.myKills,
                            updated_at: new Date().toISOString()
                        }
                    }
                });
            } catch (e) {
                console.warn('War Game DB backup save note (user_progress):', e);
            }

            // C. yardService inventory synchronization
            try {
                if (this.isPlaneUnlocked && !yardService.hasItem('war_plane')) yardService.addItem('war_plane');
                if (this.isMissileUnlocked && !yardService.hasItem('war_missile')) yardService.addItem('war_missile');
            } catch (e) {}
        }
    }

    private isOwnerLang = false;

    private checkAuthorization() {
        // War Game is now open to all players!
        const vipOverlay = document.getElementById('vip-restricted-overlay');
        if (vipOverlay) {
            vipOverlay.style.display = 'none';
        }
    }

    private setupLocalIdentity() {
        const prof = getCurrentUserProfile();
        this.isOwnerLang = isPlayardOwner(prof?.email);
        if (prof) {
            this.localUsername = prof.displayName || prof.username || (this.isOwnerLang ? 'Komandör' : 'Commander');
            if (prof.id) this.localPlayerId = prof.id;
        } else {
            this.localUsername = this.isOwnerLang ? 'Komandör' : 'Commander';
        }
        this.applyWarLocalization();
    }

    private applyWarLocalization() {
        const isEt = this.isOwnerLang;
        document.title = isEt ? 'Playard Games - War Game (10v10 Lahing)' : 'Playard Games - 3D War Simulator (10v10 Battle)';

        const serverEl = document.getElementById('server-players-count');
        if (serverEl) {
            serverEl.innerText = isEt
                ? `${Math.min(20, this.connectedHumanCount)} / 20 Mängijat (10v10 Lahing)`
                : `${Math.min(20, this.connectedHumanCount)} / 20 Players (10v10 Battle)`;
        }

        const btnLoadout = document.getElementById('btn-open-loadout');
        if (btnLoadout) btnLoadout.innerText = isEt ? '⚔️ Vali Tiim / Roll' : '⚔️ Choose Team / Role';

        const btnSound = document.getElementById('btn-sound-toggle');
        if (btnSound) btnSound.innerText = isEt ? (warAudio.getMuted() ? '🔇 Vaigistatud' : '🔊 Heli') : (warAudio.getMuted() ? '🔇 Muted' : '🔊 Sound');

        const btnHelp = document.getElementById('btn-open-help');
        if (btnHelp) btnHelp.innerText = isEt ? '❓ Abi' : '❓ Help';

        const ammoCannon = document.getElementById('ammo-cannon');
        if (ammoCannon) ammoCannon.innerText = isEt ? '∞ Mürsud' : '∞ Shells';

        const reloadLabel = document.getElementById('unit-reload-label');
        if (reloadLabel) reloadLabel.innerText = isEt ? '⏳ LAADIMINE' : '⏳ RELOAD';

        // Deploy Modal
        const deployTitle = document.getElementById('deploy-modal-title');
        if (deployTitle) deployTitle.textContent = isEt ? '⚔️ VALI TIIM JA LAHINGUROLL' : '⚔️ SELECT TEAM & COMBAT CLASS';

        const deployDesc = document.getElementById('deploy-modal-desc');
        if (deployDesc) deployDesc.textContent = isEt
            ? 'Vali oma meeskond ja kas soovid juhtida rasket lahingutanki või liikuvat jalaväelast!'
            : 'Choose your team and whether to command a heavy battle tank or a nimble frontline soldier!';

        const deployMoneyLabel = document.getElementById('deploy-money-label');
        if (deployMoneyLabel) deployMoneyLabel.textContent = isEt ? '💰 SINU MÄNGURAHA:' : '💰 YOUR BALANCE:';

        const step1 = document.getElementById('deploy-step-1-label');
        if (step1) step1.textContent = isEt ? '1. Vali Tiim:' : '1. Select Team:';

        const blueName = document.querySelector('#btn-select-blue .team-select-title');
        if (blueName) blueName.textContent = isEt ? 'SININE TIIM' : 'BLUE TEAM';
        const blueDesc = document.querySelector('#btn-select-blue .team-select-desc');
        if (blueDesc) blueDesc.textContent = isEt ? 'Lõuna baas (South Base)' : 'South Base';

        const redName = document.querySelector('#btn-select-red .team-select-title');
        if (redName) redName.textContent = isEt ? 'PUNANE TIIM' : 'RED TEAM';
        const redDesc = document.querySelector('#btn-select-red .team-select-desc');
        if (redDesc) redDesc.textContent = isEt ? 'Põhja baas (North Base)' : 'North Base';

        const missileTeamName = document.querySelector('#btn-select-missile-team .team-select-title');
        if (missileTeamName) missileTeamName.textContent = isEt ? 'RAKETITIIM' : 'MISSILE TEAM';
        const missileTeamDesc = document.querySelector('#btn-select-missile-team .team-select-desc');
        if (missileTeamDesc) missileTeamDesc.textContent = isEt ? 'Raketibaasi juhtimiskeskus' : 'Command Silo Base';

        const step2 = document.getElementById('deploy-step-2-label');
        if (step2) step2.textContent = isEt ? '2. Vali Roll / Üksus:' : '2. Select Class / Unit:';

        const tankTitle = document.querySelector('#btn-select-tank .class-select-title');
        if (tankTitle) tankTitle.textContent = isEt ? 'LAHINGTANK' : 'BATTLE TANK';
        const tankDesc = document.querySelector('#btn-select-tank .class-select-desc');
        if (tankDesc) tankDesc.textContent = isEt ? '100 HP · Raske Kahur · Suur Plahvatusjõud' : '100 HP · Heavy Cannon · Massive Blast Radius';

        const humanTitle = document.querySelector('#btn-select-human .class-select-title');
        if (humanTitle) humanTitle.textContent = isEt ? 'INIMENE / SÕDUR' : 'INFANTRY SOLDIER';
        const humanDesc = document.querySelector('#btn-select-human .class-select-desc');
        if (humanDesc) humanDesc.textContent = isEt ? '50 HP · Kiire Liikumine · Automaat & Granaat' : '50 HP · High Mobility · Assault Rifle & Grenade';

        const planeTitle = document.querySelector('#btn-select-plane .class-select-title');
        if (planeTitle) planeTitle.textContent = isEt ? 'LAHINGULENNUK' : 'FIGHTER JET';
        const planeDesc = document.querySelector('#btn-select-plane .class-select-desc');
        if (planeDesc) planeDesc.textContent = isEt ? '150 HP · Lennukipommid' : '150 HP · Air Bombs';

        const missileTitle = document.querySelector('#btn-select-missile .class-select-title');
        if (missileTitle) missileTitle.textContent = isEt ? 'RAKETITIIM' : 'MISSILE TEAM';
        const missileDesc = document.querySelector('#btn-select-missile .class-select-desc');
        if (missileDesc) missileDesc.textContent = isEt ? '10s Raketid & 60s Nuke' : '10s Missiles & 60s Nuke';

        const btnConfirm = document.getElementById('btn-confirm-deploy');
        if (btnConfirm) btnConfirm.textContent = isEt ? '🚀 SUUNDU LAHINGUVÄLJALE (DEPLOY)' : '🚀 PLAY / DEPLOY TO BATTLEFIELD';

        // Respawn Overlay
        const respawnTitle = document.getElementById('respawn-title');
        if (respawnTitle) respawnTitle.textContent = isEt ? '💥 ÜKSUS HÄVITATUD!' : '💥 UNIT DESTROYED!';
        const respawnDesc = document.getElementById('respawn-desc');
        if (respawnDesc) respawnDesc.textContent = isEt ? 'Taassünd baasis uue soomusega:' : 'Respawning at base with fresh armor in:';

        // Help Modal
        const helpTitle = document.getElementById('help-modal-title');
        if (helpTitle) helpTitle.textContent = isEt ? '🎮 War Game - Juhised & Reeglid' : '🎮 War Game - Controls & Rules';

        const helpContent = document.getElementById('help-modal-content');
        if (helpContent) {
            helpContent.innerHTML = isEt ? `
                <div><strong style="color: #00f2fe;">W / A / S / D:</strong> Liikumine (Tank, Sõdur, Lennuk või Raketijuht)</div>
                <div><strong style="color: #ffd32a;">Hiir:</strong> Torni või relva sihtimine (360 kraadi)</div>
                <div><strong style="color: #ffd32a;">Klahv 1 / 2 / 3 / 4 / 5:</strong> Relva vahetamine (1: Kahur, 2: MG/Pommid, 3: Airstrike, 4: Rakett (10s), 5: Tuumapomm (60s))</div>
                <div><strong style="color: #ff4757;">Vasak hiireklõps / Tühik:</strong> Tulistab valitud aktiivset relva!</div>
                <div><strong style="color: #2ed573;">🚀 Raketirünnak (10s vahega):</strong> Satelliidisihtimisega täppislöök 10-sekundilise vahega!</div>
                <div><strong style="color: #ff4757;">☢️ Tuumapomm (60s loendus):</strong> 4 korda suurema hävitava plahvatusraadiusega tuumarünnak!</div>
                <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 6px 0;">
                <div><strong style="color: #ffd32a;">✈️ Lahingulennuk (50,000 €):</strong> Ava võimas ülehelikiirusega lennuk 50,000 € mänguraha eest!</div>
                <div><strong style="color: #ffd32a;">💥 Leviv Plahvatus:</strong> Plahvatused tekitavad leviva lööklaine, mis kahjustab kõiki objekte levialas!</div>
                <div><strong style="color: #00f2fe;">👥 Mängijate loogika:</strong> Mängus on eepiline 10v10 lahing (kokku 20 võitlejat: 10 Sinist vs 10 Punast). Kui oled üksi serveris, on Sinu tiimis 9 AI-d ja vastasel 10 AI-d!</div>
            ` : `
                <div><strong style="color: #00f2fe;">W / A / S / D:</strong> Movement (Tank, Soldier, Fighter Jet, or Missile Commander)</div>
                <div><strong style="color: #ffd32a;">Mouse:</strong> Turret & weapon aiming (360 degrees)</div>
                <div><strong style="color: #ffd32a;">Keys 1-5:</strong> Switch weapon (1: Cannon, 2: MG/Air Bombs, 3: Airstrike, 4: Missile (10s), 5: Nuke (60s))</div>
                <div><strong style="color: #ff4757;">Left Click / Space:</strong> Fire selected active weapon!</div>
                <div><strong style="color: #2ed573;">🚀 Missile Strike (10s Cooldown):</strong> Tactical satellite strike with 10s cooldown!</div>
                <div><strong style="color: #ff4757;">☢️ Nuclear Strike (60s Timer):</strong> Cataclysmic nuclear strike with 4x blast radius!</div>
                <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 6px 0;">
                <div><strong style="color: #ffd32a;">✈️ Fighter Jet (50,000 €):</strong> Unlock supersonic combat jet with 50,000 € War Cash!</div>
                <div><strong style="color: #ffd32a;">💥 Spreading Blast:</strong> Explosions unleash expanding shockwaves damaging everything in radius!</div>
                <div><strong style="color: #00f2fe;">👥 10v10 Combat Roster:</strong> Massive 10v10 warfare (20 total units: 10 Blue vs 10 Red). When alone in server, 19 named AI combatants deploy automatically!</div>
            `;
        }

        // Match end restart btn & labels
        const btnRestart = document.getElementById('btn-restart-match');
        if (btnRestart) btnRestart.innerText = isEt ? '🔄 Uus Lahing' : '🔄 New Battle';
        const finalKillsLabel = document.getElementById('final-kills-label');
        if (finalKillsLabel) finalKillsLabel.innerText = isEt ? 'Sinu Tapmised:' : 'Your Kills:';
        const finalMoneyLabel = document.getElementById('final-money-label');
        if (finalMoneyLabel) finalMoneyLabel.innerText = isEt ? 'Teenitud Mänguraha:' : 'War Cash Earned:';
    }

    private setupDeployModal() {
        const deployModal = document.getElementById('modal-deploy-selection');
        const btnBlue = document.getElementById('btn-select-blue');
        const btnRed = document.getElementById('btn-select-red');
        const btnTank = document.getElementById('btn-select-tank');
        const btnHuman = document.getElementById('btn-select-human');
        const btnPlane = document.getElementById('btn-select-plane');
        const btnMissile = document.getElementById('btn-select-missile');
        const planeBadge = document.getElementById('plane-lock-badge');
        const missileBadge = document.getElementById('missile-lock-badge');
        const btnConfirm = document.getElementById('btn-confirm-deploy');

        let chosenTeam: Team = 'blue';
        let chosenClass: UnitClass = 'tank';

        const syncMoney = () => {
            const prof = getCurrentUserProfile();
            const userId = prof?.id || this.localPlayerId;
            const storageKey = `playard_war_data_${userId}`;
            const localData = localStorage.getItem(storageKey);
            if (localData) {
                try {
                    const parsed = JSON.parse(localData);
                    if (parsed.money !== undefined) this.warMoney = parsed.money;
                    if (parsed.isPlaneUnlocked !== undefined) this.isPlaneUnlocked = !!parsed.isPlaneUnlocked;
                    if (parsed.isMissileUnlocked !== undefined) this.isMissileUnlocked = !!parsed.isMissileUnlocked;
                } catch (e) {}
            }
            this.updateHUD();
        };
        syncMoney();

        const updateRoleBadgesUI = () => {
            if (planeBadge) {
                if (this.isPlaneUnlocked) {
                    planeBadge.style.background = 'rgba(46, 213, 115, 0.2)';
                    planeBadge.style.borderColor = '#2ecc71';
                    planeBadge.style.color = '#2ecc71';
                    planeBadge.innerText = this.isOwnerLang ? '✨ AVATUD' : '✨ UNLOCKED';
                } else {
                    planeBadge.style.background = 'rgba(255, 71, 87, 0.2)';
                    planeBadge.style.borderColor = '#ff4757';
                    planeBadge.style.color = '#ff6b81';
                    planeBadge.innerText = '🔒 50,000 €';
                }
            }

            if (missileBadge) {
                if (this.isMissileUnlocked) {
                    missileBadge.style.background = 'rgba(46, 213, 115, 0.2)';
                    missileBadge.style.borderColor = '#2ecc71';
                    missileBadge.style.color = '#2ecc71';
                    missileBadge.innerText = this.isOwnerLang ? '✨ AVATUD' : '✨ UNLOCKED';
                } else {
                    missileBadge.style.background = 'rgba(255, 71, 87, 0.2)';
                    missileBadge.style.borderColor = '#ff4757';
                    missileBadge.style.color = '#ff6b81';
                    missileBadge.innerText = '🔒 100,000 €';
                }
            }
        };
        updateRoleBadgesUI();

        btnBlue?.addEventListener('click', () => {
            chosenTeam = 'blue';
            btnBlue.className = 'select-box selected-blue';
            btnRed!.className = 'select-box';
        });

        btnRed?.addEventListener('click', () => {
            chosenTeam = 'red';
            btnRed.className = 'select-box selected-red';
            btnBlue!.className = 'select-box';
        });

        btnTank?.addEventListener('click', () => {
            chosenClass = 'tank';
            btnTank.className = 'select-box selected-class';
            btnHuman!.className = 'select-box';
            if (btnPlane) btnPlane.className = 'select-box';
            if (btnMissile) btnMissile.className = 'select-box';
        });

        btnHuman?.addEventListener('click', () => {
            chosenClass = 'soldier';
            btnHuman.className = 'select-box selected-class';
            btnTank!.className = 'select-box';
            if (btnPlane) btnPlane.className = 'select-box';
            if (btnMissile) btnMissile.className = 'select-box';
        });

        btnPlane?.addEventListener('click', () => {
            if (!this.isPlaneUnlocked) {
                if (this.warMoney < 50000) {
                    const warnMsg = this.isOwnerLang
                        ? `🔒 Vajad 50,000 € lahingulennuki ostmiseks! Sul on: ${this.warMoney.toLocaleString()} €`
                        : `🔒 Requires 50,000 € War Cash to purchase Fighter Jet! Current: ${this.warMoney.toLocaleString()} €`;
                    this.showToast(warnMsg, '#ff4757');
                    return;
                }
                // Deduct 50,000 €
                this.warMoney -= 50000;
                this.isPlaneUnlocked = true;
                this.saveUserDataToDb();
                this.updateHUD();
                updateRoleBadgesUI();
                const buyMsg = this.isOwnerLang
                    ? '✈️ Lahingulennuk edukalt ostetud! (-50,000 €)'
                    : '✈️ Fighter Jet successfully purchased! (-50,000 €)';
                this.showToast(buyMsg, '#2ecc71');
            }

            chosenClass = 'plane';
            btnPlane.className = 'select-box selected-class';
            btnTank!.className = 'select-box';
            btnHuman!.className = 'select-box';
            if (btnMissile) btnMissile.className = 'select-box';
        });

        btnMissile?.addEventListener('click', () => {
            if (!this.isMissileUnlocked) {
                if (this.warMoney < 100000) {
                    const warnMsg = this.isOwnerLang
                        ? `🔒 Vajad 100,000 € Raketitiimi ostmiseks! Sul on: ${this.warMoney.toLocaleString()} €`
                        : `🔒 Requires 100,000 € War Cash to purchase Missile Team! Current: ${this.warMoney.toLocaleString()} €`;
                    this.showToast(warnMsg, '#ff4757');
                    return;
                }
                // Deduct 100,000 €
                this.warMoney -= 100000;
                this.isMissileUnlocked = true;
                this.saveUserDataToDb();
                this.updateHUD();
                updateRoleBadgesUI();
                const buyMsg = this.isOwnerLang
                    ? '🚀 Raketitiim edukalt ostetud! (-100,000 €)'
                    : '🚀 Missile Team successfully purchased! (-100,000 €)';
                this.showToast(buyMsg, '#2ecc71');
            }

            chosenClass = 'missile';
            btnMissile.className = 'select-box selected-class';
            btnTank!.className = 'select-box';
            btnHuman!.className = 'select-box';
            if (btnPlane) btnPlane.className = 'select-box';
        });

        btnConfirm?.addEventListener('click', () => {
            this.localTeam = chosenTeam || 'blue';
            this.localClass = chosenClass;
            if (deployModal) deployModal.style.display = 'none';
            this.deployLocalUnit();
            if (!this.isRosterSpawned) this.spawnBattleRoster();
            this.updateTeamBadge();
            this.network?.updateIdentity(this.localTeam, this.localClass);
            this.startMatchCountdown();
            const classLabel = this.localClass === 'plane'
                ? (this.isOwnerLang ? 'LENNUK' : 'PLANE')
                : (this.localClass === 'missile'
                    ? (this.isOwnerLang ? 'RAKETITIIM' : 'MISSILE TEAM')
                    : (this.localClass === 'tank' ? 'TANK' : (this.isOwnerLang ? 'SÕDUR' : 'SOLDIER')));
            const teamTitle = this.localTeam === 'red' ? (this.isOwnerLang ? 'PUNANE TIIM' : 'RED TEAM') : (this.isOwnerLang ? 'SININE TIIM' : 'BLUE TEAM');
            const enteringMsg = this.isOwnerLang
                ? `🚀 Sisened lahingusse: War Server #1 (${teamTitle} · ${classLabel})`
                : `🚀 Entering battle: War Server #1 (${teamTitle} · ${classLabel})`;
            this.showToast(enteringMsg, this.localTeam === 'red' ? '#ff4757' : '#00f2fe');
        });

        // Open loadout change button in navbar
        document.getElementById('btn-open-loadout')?.addEventListener('click', () => {
            updateRoleBadgesUI();
            chosenTeam = this.localTeam;
            chosenClass = this.localClass;
            if (btnBlue && btnRed) {
                btnBlue.className = chosenTeam === 'blue' ? 'select-box selected-blue' : 'select-box';
                btnRed.className = chosenTeam === 'red' ? 'select-box selected-red' : 'select-box';
            }
            if (btnTank && btnHuman && btnPlane && btnMissile) {
                btnTank.className = chosenClass === 'tank' ? 'select-box selected-class' : 'select-box';
                btnHuman.className = chosenClass === 'soldier' ? 'select-box selected-class' : 'select-box';
                btnPlane.className = chosenClass === 'plane' ? 'select-box selected-class' : 'select-box';
                btnMissile.className = chosenClass === 'missile' ? 'select-box selected-class' : 'select-box';
            }
            if (deployModal) deployModal.style.display = 'flex';
        });

        // Default initial spawn
        this.deployLocalUnit();
        this.spawnBattleRoster();
        this.updateTeamBadge();
    }

    private showToast(message: string, color = '#2ecc71') {
        const toast = document.createElement('div');
        toast.className = 'playard-toast';
        toast.innerText = message;
        toast.style.cssText = `
            position: fixed;
            top: 24px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(13, 17, 23, 0.94);
            border: 1.5px solid ${color};
            color: #ffffff;
            padding: 12px 24px;
            border-radius: 12px;
            font-size: 0.95rem;
            font-weight: 700;
            z-index: 9999;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            transition: all 0.3s ease;
            pointer-events: none;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-10px)';
            setTimeout(() => toast.remove(), 350);
        }, 3200);
    }

    private updateTeamBadge() {
        const badge = document.getElementById('player-team-badge');
        const nameEl = document.getElementById('player-team-name');
        const hpLabel = document.getElementById('unit-hp-label');
        const weapon1Name = document.getElementById('weapon-name-1');
        const weapon1Icon = document.getElementById('weapon-icon-1');
        const weapon2Name = document.getElementById('weapon-name-2');
        const weapon2Icon = document.getElementById('weapon-icon-2');

        const roleIcon = this.localClass === 'plane'
            ? (this.isOwnerLang ? '✈️ LAHINGULENNUK' : '✈️ FIGHTER JET')
            : this.localClass === 'missile'
                ? (this.isOwnerLang ? '🚀 RAKETIJUHT' : '🚀 MISSILE COMMANDER')
                : this.localClass === 'tank'
                    ? '🏎️ TANK'
                    : (this.isOwnerLang ? '🏃 INIMENE (SÕDUR)' : '🏃 SOLDIER');

        const youAreLabel = this.isOwnerLang ? 'OLED:' : 'YOU ARE:';
        const youAreSpan = badge?.querySelector('span');
        if (youAreSpan) youAreSpan.innerText = youAreLabel;

        if (badge && nameEl) {
            const teamLabel = this.localTeam === 'red' ? '🔴 RED TEAM' : '🔵 BLUE TEAM';
            if (this.localTeam === 'red') {
                badge.className = 'team-red';
                badge.style.borderColor = '#e74c3c';
            } else {
                badge.className = 'team-blue';
                badge.style.borderColor = '#3498db';
            }

            if (this.localClass === 'missile') {
                const missileRole = this.isOwnerLang ? '🚀 RAKETITIIM' : '🚀 MISSILE TEAM';
                nameEl.innerText = `${teamLabel} · ${missileRole} · ${this.localUsername}`;
            } else {
                nameEl.innerText = `${teamLabel} · ${roleIcon} · ${this.localUsername}`;
            }
        }

        if (hpLabel) {
            hpLabel.innerText = this.localClass === 'plane'
                ? (this.isOwnerLang ? '🛡️ LENNUKI SOOMUS (HP)' : '🛡️ JET ARMOR (HP)')
                : this.localClass === 'tank'
                    ? (this.isOwnerLang ? '🛡️ SOOMUS (HP)' : '🛡️ ARMOR (HP)')
                    : (this.isOwnerLang ? '❤️ ELUD (HP)' : '❤️ HEALTH (HP)');
        }
        if (weapon1Name && weapon1Icon) {
            weapon1Name.innerText = this.localClass === 'plane'
                ? (this.isOwnerLang ? 'VULCAN KAHUR' : 'VULCAN CANNON')
                : this.localClass === 'missile'
                    ? (this.isOwnerLang ? 'RAKETT (10s)' : 'MISSILE (10s)')
                    : this.localClass === 'tank'
                        ? (this.isOwnerLang ? 'KAHUR' : 'CANNON')
                        : (this.isOwnerLang ? 'AUTOMAAT' : 'RIFLE');
            weapon1Icon.innerText = this.localClass === 'plane' ? '🚀' : this.localClass === 'missile' ? '🚀' : this.localClass === 'tank' ? '🚀' : '🔫';
        }
        if (weapon2Name && weapon2Icon) {
            weapon2Name.innerText = this.localClass === 'plane'
                ? (this.isOwnerLang ? 'LENNUKIPOMMID' : 'AIR BOMBS')
                : this.localClass === 'missile'
                    ? (this.isOwnerLang ? 'TUUMAPOMM (60s)' : 'NUKE (60s)')
                    : this.localClass === 'tank'
                        ? 'MG-42'
                        : (this.isOwnerLang ? 'GRANAAT' : 'GRENADE');
            weapon2Icon.innerText = this.localClass === 'plane' ? '💣' : this.localClass === 'missile' ? '☢️' : this.localClass === 'tank' ? '🔫' : '💣';
        }

        const cannonCard = document.getElementById('weapon-cannon');
        const mgCard = document.getElementById('weapon-mg');
        const airstrikeCard = document.getElementById('weapon-airstrike');
        const missileCard = document.getElementById('weapon-missile');
        const nukeCard = document.getElementById('weapon-nuke');

        if (this.localClass === 'missile') {
            if (cannonCard) cannonCard.style.display = 'none';
            if (mgCard) mgCard.style.display = 'none';
            if (airstrikeCard) airstrikeCard.style.display = 'none';
            if (missileCard) missileCard.style.display = 'flex';
            if (nukeCard) nukeCard.style.display = 'flex';
            if (this.activeWeapon !== 'missile' && this.activeWeapon !== 'nuke') {
                this.selectWeapon('missile');
            }
        } else {
            if (cannonCard) cannonCard.style.display = 'flex';
            if (mgCard) mgCard.style.display = 'flex';
            if (airstrikeCard) airstrikeCard.style.display = this.localClass === 'plane' ? 'none' : 'flex';
            if (missileCard) missileCard.style.display = 'none';
            if (nukeCard) nukeCard.style.display = 'none';
            if (this.activeWeapon === 'missile' || this.activeWeapon === 'nuke') {
                this.selectWeapon('cannon');
            }
        }
    }

    // --- Scene Setup ---
    private setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x090e17);
        this.scene.fog = new THREE.FogExp2(0x090e17, 0.007);

        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 1000);
        this.camera.position.set(0, 16, -26);

        try {
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.container.appendChild(this.renderer.domElement);
        } catch (e) {
            console.warn('WebGLRenderer initialization failed, using fallback dummy renderer:', e);
            const canvas = document.createElement('canvas');
            this.container.appendChild(canvas);
            this.renderer = {
                domElement: canvas,
                setSize: () => {},
                setPixelRatio: () => {},
                render: () => {},
                shadowMap: { enabled: false, type: 0 }
            } as any;
        }

        const ambientLight = new THREE.AmbientLight(0xdce7f0, 0.75);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xfffaed, 1.25);
        sunLight.position.set(70, 140, 90);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        this.scene.add(sunLight);

        this.radarCanvas = document.getElementById('radar-canvas') as HTMLCanvasElement;
        if (this.radarCanvas) {
            this.radarCtx = this.radarCanvas.getContext('2d');
            this.radarCanvas.style.cursor = 'pointer';
            this.radarCanvas.addEventListener('pointerdown', (e) => {
                const rect = this.radarCanvas.getBoundingClientRect();
                const clickX = (e.clientX - rect.left) / rect.width;
                const clickY = (e.clientY - rect.top) / rect.height;
                const nx = (clickX - 0.5) / 0.425;
                const ny = (clickY - 0.5) / 0.425;
                const worldX = nx * 380;
                const worldZ = ny * 380;
                if (this.isSatelliteTargeting) {
                    this.satelliteCamCenter.x = THREE.MathUtils.clamp(worldX, -260, 260);
                    this.satelliteCamCenter.z = THREE.MathUtils.clamp(worldZ, -380, 380);
                }
            });
        }
    }

    // --- Battlefield Map & Explosive Barrels (2x Larger Battle Area: 1680x1680) ---
    private buildBattlefield() {
        const groundGeo = new THREE.PlaneGeometry(1680, 1680, 80, 80);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x1f271c, roughness: 0.9, metalness: 0.1 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const grid = new THREE.GridHelper(1600, 80, 0x3d4a36, 0x171d15);
        grid.position.y = 0.05;
        this.scene.add(grid);

        this.createBaseStation(new THREE.Vector3(0, 0, 270), 'red');
        this.createBaseStation(new THREE.Vector3(0, 0, -270), 'blue');

        // Team Missile Silo Command Houses (10s Raketid & 60s Tuumapomm)
        this.createMissileSilo(new THREE.Vector3(45, 0, 270), 'red');
        this.createMissileSilo(new THREE.Vector3(-45, 0, -270), 'blue');
        this.createMissileSilo(new THREE.Vector3(75, 0, 0), 'missile');

        // Central & Strategic Fortresses
        this.createMilitaryFort(new THREE.Vector3(0, 0, 0));
        this.createMilitaryFort(new THREE.Vector3(130, 0, 90));
        this.createMilitaryFort(new THREE.Vector3(-130, 0, -90));
        this.createMilitaryFort(new THREE.Vector3(-130, 0, 90));
        this.createMilitaryFort(new THREE.Vector3(130, 0, -90));
        this.createMilitaryFort(new THREE.Vector3(0, 0, 135));
        this.createMilitaryFort(new THREE.Vector3(0, 0, -135));

        // Military town houses & barracks across battle sectors
        this.createMilitaryHouse(new THREE.Vector3(70, 0, 45), 14, 12);
        this.createMilitaryHouse(new THREE.Vector3(-70, 0, -45), 14, 12);
        this.createMilitaryHouse(new THREE.Vector3(70, 0, -45), 14, 12);
        this.createMilitaryHouse(new THREE.Vector3(-70, 0, 45), 14, 12);
        this.createMilitaryHouse(new THREE.Vector3(200, 0, 180), 16, 14);
        this.createMilitaryHouse(new THREE.Vector3(-200, 0, -180), 16, 14);
        this.createMilitaryHouse(new THREE.Vector3(200, 0, -180), 16, 14);
        this.createMilitaryHouse(new THREE.Vector3(-200, 0, 180), 16, 14);

        // Anti-tank barricades
        for (let i = 0; i < 40; i++) {
            const angle = (i / 40) * Math.PI * 2;
            const dist = 60 + (i % 5) * 45;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            if (Math.abs(z) > 240) continue;
            this.createBarricade(new THREE.Vector3(x, 0, z));
        }

        // Explosive Red Barrels (Chain Reaction)
        for (let i = 0; i < 32; i++) {
            const angle = (i / 32) * Math.PI * 2;
            const dist = 45 + (i % 6) * 35;
            const pos = new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
            this.createExplosiveBarrel(pos);
        }

        // Visible Battlefield Boundaries & Laser Perimeter (2x Larger: 800m x 1220m)
        this.createVisibleBoundaries();
    }

    private createVisibleBoundaries() {
        const boundGroup = new THREE.Group();

        const wallMat = new THREE.MeshBasicMaterial({
            color: 0xff3838,
            wireframe: true,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide
        });

        const glowRailMat = new THREE.MeshBasicMaterial({
            color: 0xff2222
        });

        // 1. Four Holographic Laser Perimeter Walls (2x Area: X=±400, Z=±610, Height 50m)
        // North Wall (Z = 610)
        const wallNorth = new THREE.Mesh(new THREE.PlaneGeometry(800, 50, 30, 4), wallMat);
        wallNorth.position.set(0, 25, 610);
        boundGroup.add(wallNorth);

        // South Wall (Z = -610)
        const wallSouth = new THREE.Mesh(new THREE.PlaneGeometry(800, 50, 30, 4), wallMat);
        wallSouth.position.set(0, 25, -610);
        boundGroup.add(wallSouth);

        // East Wall (X = 400)
        const wallEast = new THREE.Mesh(new THREE.PlaneGeometry(1220, 50, 40, 4), wallMat);
        wallEast.position.set(400, 25, 0);
        wallEast.rotation.y = Math.PI / 2;
        boundGroup.add(wallEast);

        // West Wall (X = -400)
        const wallWest = new THREE.Mesh(new THREE.PlaneGeometry(1220, 50, 40, 4), wallMat);
        wallWest.position.set(-400, 25, 0);
        wallWest.rotation.y = Math.PI / 2;
        boundGroup.add(wallWest);

        // 2. Glowing Laser Rails on Top & Bottom
        const addRail = (w: number, h: number, d: number, x: number, y: number, z: number) => {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glowRailMat);
            rail.position.set(x, y, z);
            boundGroup.add(rail);
        };

        // Top rails (Y = 50)
        addRail(800, 0.8, 0.8, 0, 50, 610);
        addRail(800, 0.8, 0.8, 0, 50, -610);
        addRail(0.8, 0.8, 1220, 400, 50, 0);
        addRail(0.8, 0.8, 1220, -400, 50, 0);

        // Bottom ground rails (Y = 0.2)
        addRail(800, 0.5, 0.5, 0, 0.25, 610);
        addRail(800, 0.5, 0.5, 0, 0.25, -610);
        addRail(0.5, 0.5, 1220, 400, 0.25, 0);
        addRail(0.5, 0.5, 1220, -400, 0.25, 0);

        // 3. Perimeter Warning Beacons & Pylons (Every 40m along 2x border)
        const pylonGeo = new THREE.CylinderGeometry(0.6, 0.9, 14, 8);
        const pylonMat = new THREE.MeshStandardMaterial({ color: 0x222f3e, metalness: 0.8, roughness: 0.3 });
        const beaconGeo = new THREE.SphereGeometry(0.8, 8, 8);
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff3838 });

        const createPylon = (x: number, z: number) => {
            const p = new THREE.Mesh(pylonGeo, pylonMat);
            p.position.set(x, 7, z);
            p.castShadow = true;
            boundGroup.add(p);

            const b = new THREE.Mesh(beaconGeo, beaconMat);
            b.position.set(x, 14.5, z);
            boundGroup.add(b);

            // Vertical laser pillar reaching sky
            const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 40, 4), beaconMat);
            beam.position.set(x, 34, z);
            boundGroup.add(beam);
        };

        // Along North/South borders (X in [-400..400])
        for (let x = -400; x <= 400; x += 50) {
            createPylon(x, 610);
            createPylon(x, -610);
        }
        // Along East/West borders (Z in [-550..550])
        for (let z = -550; z <= 550; z += 50) {
            createPylon(400, z);
            createPylon(-400, z);
        }

        this.scene.add(boundGroup);
    }

    private createBaseStation(pos: THREE.Vector3, team: Team) {
        const group = new THREE.Group();
        group.position.copy(pos);

        const color = team === 'red' ? 0xe74c3c : 0x3498db;
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.8 });
        const padMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.4 });

        const pad = new THREE.Mesh(new THREE.BoxGeometry(80, 0.8, 50), padMat);
        pad.position.y = 0.4;
        pad.receiveShadow = true;
        group.add(pad);

        const towerX = team === 'red' ? 28 : -28;
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.5, 16, 8), baseMat);
        tower.position.set(towerX, 8, 0);
        tower.castShadow = true;
        group.add(tower);

        this.scene.add(group);

        // Register Tower Collider
        this.obstacles.push({
            type: 'circle',
            centerX: pos.x + towerX,
            centerZ: pos.z,
            radius: 3.8,
            height: 16
        });
    }

    private createMissileSilo(pos: THREE.Vector3, team: Team) {
        const group = new THREE.Group();
        group.position.copy(pos);

        const isRed = team === 'red';
        const isMissile = team === 'missile';
        const trimColor = isRed ? 0xe74c3c : (isMissile ? 0x2ed573 : 0x00f2fe);
        const siloMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
        const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, metalness: 0.6 });
        const buildingMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });

        // 1. Silo Command HQ House (16 x 6 x 14)
        const hq = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 14), buildingMat);
        hq.position.set(0, 3, 0);
        hq.castShadow = true;
        hq.receiveShadow = true;
        group.add(hq);

        // Radar Dish on Silo HQ
        const dish = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 0.4, 0.6, 16), trimMat);
        dish.position.set(0, 7.2, 0);
        dish.rotation.x = Math.PI / 6;
        dish.castShadow = true;
        group.add(dish);

        // 2. Vertical Ballistic Missile Silo Hatch & Erect Missile
        const siloHatch = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 2.0, 16), siloMat);
        siloHatch.position.set(isRed ? -12 : 12, 1.0, 0);
        siloHatch.castShadow = true;
        group.add(siloHatch);

        // Vertical Rocket on launch pad
        const missileBody = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 9.0, 12), new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.8 }));
        missileBody.position.set(isRed ? -12 : 12, 6.0, 0);
        missileBody.castShadow = true;
        group.add(missileBody);

        const missileNose = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.5, 12), trimMat);
        missileNose.position.set(isRed ? -12 : 12, 11.5, 0);
        missileNose.castShadow = true;
        group.add(missileNose);

        this.scene.add(group);
        this.missileSilos.set(team, pos.clone().add(new THREE.Vector3(isRed ? -12 : 12, 10, 0)));

        // Register Solid Building Collider
        this.obstacles.push({
            type: 'box',
            minX: pos.x - 10,
            maxX: pos.x + 10,
            minZ: pos.z - 9,
            maxZ: pos.z + 9,
            height: 9.0
        });
    }

    private createMilitaryFort(pos: THREE.Vector3) {
        const group = new THREE.Group();
        group.position.copy(pos);

        const bunkerMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });

        // Main Fort Structure (20 x 7 x 20)
        const bunker = new THREE.Mesh(new THREE.BoxGeometry(20, 7, 20), bunkerMat);
        bunker.position.y = 3.5;
        bunker.castShadow = true;
        bunker.receiveShadow = true;
        group.add(bunker);

        // Roof Parapet / Upper Bastion
        const parapet = new THREE.Mesh(new THREE.BoxGeometry(20.4, 1.2, 20.4), roofMat);
        parapet.position.y = 7.4;
        parapet.castShadow = true;
        group.add(parapet);

        // Reinforced Blast Doors on sides
        const door = new THREE.Mesh(new THREE.BoxGeometry(4.0, 4.5, 0.6), metalMat);
        door.position.set(0, 2.25, 10.1);
        group.add(door);

        const doorBack = new THREE.Mesh(new THREE.BoxGeometry(4.0, 4.5, 0.6), metalMat);
        doorBack.position.set(0, 2.25, -10.1);
        group.add(doorBack);

        this.scene.add(group);

        // Register Solid Fort Collider Box
        this.obstacles.push({
            type: 'box',
            minX: pos.x - 10.5,
            maxX: pos.x + 10.5,
            minZ: pos.z - 10.5,
            maxZ: pos.z + 10.5,
            height: 8.5
        });
    }

    private createMilitaryHouse(pos: THREE.Vector3, sizeX = 14, sizeZ = 12) {
        const group = new THREE.Group();
        group.position.copy(pos);

        const wallMat = new THREE.MeshStandardMaterial({ color: 0x57606f, roughness: 0.9 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x2f3542, roughness: 0.6 });

        // Main Walls
        const height = 5.5;
        const house = new THREE.Mesh(new THREE.BoxGeometry(sizeX, height, sizeZ), wallMat);
        house.position.y = height / 2;
        house.castShadow = true;
        house.receiveShadow = true;
        group.add(house);

        // Peaked Roof
        const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(sizeX, sizeZ) * 0.55, 3.0, 4), roofMat);
        roof.position.y = height + 1.5;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        group.add(roof);

        this.scene.add(group);

        // Register House Collider Box
        this.obstacles.push({
            type: 'box',
            minX: pos.x - sizeX / 2 - 0.5,
            maxX: pos.x + sizeX / 2 + 0.5,
            minZ: pos.z - sizeZ / 2 - 0.5,
            maxZ: pos.z + sizeZ / 2 + 0.5,
            height: height + 3.0
        });
    }

    private createBarricade(pos: THREE.Vector3) {
        const group = new THREE.Group();
        group.position.copy(pos);
        const mat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });
        const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 3.8), mat);
        b1.rotation.x = Math.PI / 4;
        group.add(b1);
        const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 3.8), mat);
        b2.rotation.z = Math.PI / 4;
        group.add(b2);
        group.position.y = 1.1;
        this.scene.add(group);

        // Register Barricade Collider
        this.obstacles.push({
            type: 'circle',
            centerX: pos.x,
            centerZ: pos.z,
            radius: 2.0,
            height: 2.4
        });
    }

    private createExplosiveBarrel(pos: THREE.Vector3) {
        const geo = new THREE.CylinderGeometry(0.7, 0.7, 1.8, 12);
        const mat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.4, metalness: 0.6 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.position.y = 0.9;
        mesh.castShadow = true;
        this.scene.add(mesh);

        this.barrels.push({
            mesh,
            pos: pos.clone(),
            hp: 20,
            isExploded: false
        });
    }

    // --- Base Spawn Positioning ---
    private getRandomBaseSpawn(team: Team, unitClass: UnitClass): { pos: THREE.Vector3; rot: number } {
        const isRed = team === 'red';
        const isMissileTeam = team === 'missile' || unitClass === 'missile';
        const rot = isRed ? Math.PI : (isMissileTeam ? Math.PI / 2 : 0);

        if (isMissileTeam) {
            const siloPos = this.missileSilos.get('missile') || new THREE.Vector3(75, 0, 0);
            return {
                pos: new THREE.Vector3(siloPos.x + 4, unitClass === 'plane' ? 14.0 : 0, siloPos.z + 10),
                rot
            };
        }

        if (unitClass === 'plane') {
            // Airstrips / flight lanes spread across runway
            const planeLanes = [-65, -35, 0, 35, 65];
            const laneX = planeLanes[Math.floor(Math.random() * planeLanes.length)] + (Math.random() - 0.5) * 8;
            const baseZ = isRed ? 275 + Math.random() * 10 : -275 - Math.random() * 10;
            return {
                pos: new THREE.Vector3(laneX, 14.0, baseZ),
                rot
            };
        } else if (unitClass === 'missile') {
            // Missile silo control station spawn
            const siloPos = this.missileSilos.get(team);
            if (siloPos) {
                return {
                    pos: new THREE.Vector3(siloPos.x + (isRed ? 4 : -4), 0, siloPos.z + (isRed ? -8 : 8)),
                    rot
                };
            }
            return {
                pos: new THREE.Vector3(isRed ? 45 : -45, 0, isRed ? 255 : -255),
                rot
            };
        } else if (unitClass === 'tank') {
            // Tank vehicle staging positions across base
            const tankSlots = [-85, -50, -20, 20, 50, 85];
            const slotX = tankSlots[Math.floor(Math.random() * tankSlots.length)] + (Math.random() - 0.5) * 6;
            const baseZ = isRed ? 262 + Math.random() * 12 : -262 - Math.random() * 12;
            return {
                pos: new THREE.Vector3(slotX, 0, baseZ),
                rot
            };
        } else {
            // Infantry trench line and bunker positions
            const soldierSlots = [-105, -75, -45, -15, 15, 45, 75, 105];
            const slotX = soldierSlots[Math.floor(Math.random() * soldierSlots.length)] + (Math.random() - 0.5) * 8;
            const baseZ = isRed ? 245 + Math.random() * 15 : -245 - Math.random() * 15;
            return {
                pos: new THREE.Vector3(slotX, 0, baseZ),
                rot
            };
        }
    }

    // --- Unit Deployment & Roster (10v10 Battle) ---
    private deployLocalUnit() {
        if (this.localUnit) {
            this.scene.remove(this.localUnit.root);
            this.units.delete(this.localPlayerId);
        }

        const spawn = this.getRandomBaseSpawn(this.localTeam, this.localClass);

        if (this.localClass === 'plane') {
            this.localUnit = this.createPlane(this.localPlayerId, this.localUsername, this.localTeam, true, false, spawn.pos, spawn.rot);
            this.primaryReloadTime = 0.15; // Rapid twin autocannon
        } else if (this.localClass === 'tank') {
            this.localUnit = this.createTank(this.localPlayerId, this.localUsername, this.localTeam, true, false, spawn.pos, spawn.rot);
            this.primaryReloadTime = 1.2;
        } else if (this.localClass === 'missile') {
            this.localUnit = this.createSoldier(this.localPlayerId, this.localUsername, this.localTeam, true, false, spawn.pos, spawn.rot);
            this.localUnit.hp = 100;
            this.localUnit.maxHp = 100;
            this.primaryReloadTime = 0.2;
            this.activeWeapon = 'missile';
            setTimeout(() => this.selectWeapon('missile'), 100);
        } else {
            this.localUnit = this.createSoldier(this.localPlayerId, this.localUsername, this.localTeam, true, false, spawn.pos, spawn.rot);
            this.primaryReloadTime = 0.12; // Fast rifle fire
        }

        this.units.set(this.localPlayerId, this.localUnit);
        this.updateHUD();
    }

    private isRosterSpawned = false;

    private spawnBattleRoster() {
        if (this.isRosterSpawned) return;
        this.isRosterSpawned = true;

        // 10 Unique AI Blue Units (3 Tanks + 7 Soldiers across 2x battlefield)
        const blueRoster = [
            { name: 'Kpt. Miller', class: 'tank' as UnitClass, x: -70, z: -260 },
            { name: 'Tank Titan', class: 'tank' as UnitClass, x: 0, z: -275 },
            { name: 'Tank Ironclad', class: 'tank' as UnitClass, x: 70, z: -260 },
            { name: 'Srs. Kask', class: 'soldier' as UnitClass, x: -90, z: -250 },
            { name: 'Kpr. Hunt', class: 'soldier' as UnitClass, x: -40, z: -250 },
            { name: 'Ream. Tamm', class: 'soldier' as UnitClass, x: -20, z: -245 },
            { name: 'Kpr. Ilves', class: 'soldier' as UnitClass, x: 20, z: -245 },
            { name: 'Sõdur Karu', class: 'soldier' as UnitClass, x: 40, z: -250 },
            { name: 'Srs. Sepp', class: 'soldier' as UnitClass, x: 90, z: -250 },
            { name: 'Ream. Kuusk', class: 'soldier' as UnitClass, x: 0, z: -240 }
        ];

        // 10 Unique AI Red Units (3 Tanks + 7 Soldiers across 2x battlefield)
        const redRoster = [
            { name: 'Tank Viper', class: 'tank' as UnitClass, x: -70, z: 260 },
            { name: 'Tank Goliath', class: 'tank' as UnitClass, x: 0, z: 275 },
            { name: 'Tank Panzer', class: 'tank' as UnitClass, x: 70, z: 260 },
            { name: 'Sõdur Fox', class: 'soldier' as UnitClass, x: -90, z: 250 },
            { name: 'Snaiper Hawk', class: 'soldier' as UnitClass, x: -40, z: 250 },
            { name: 'Kpt. Wolf', class: 'soldier' as UnitClass, x: -20, z: 245 },
            { name: 'Srs. Shadow', class: 'soldier' as UnitClass, x: 20, z: 245 },
            { name: 'Kpr. Blaze', class: 'soldier' as UnitClass, x: 40, z: 250 },
            { name: 'Ream. Storm', class: 'soldier' as UnitClass, x: 90, z: 250 },
            { name: 'Sõdur Ghost', class: 'soldier' as UnitClass, x: 0, z: 240 }
        ];

        // Spawn Blue Team (If local is Blue, spawn 9 Blue AI; otherwise spawn 10 Blue AI)
        const blueBotsToSpawn = this.localTeam === 'blue' ? blueRoster.slice(0, 9) : blueRoster;
        blueBotsToSpawn.forEach((entry, idx) => {
            const id = `ai_blue_${idx + 1}`;
            const pos = new THREE.Vector3(entry.x, 0, entry.z);
            this.initialBotSpawnMap.set(id, { pos: pos.clone(), rot: 0 });
            const u = entry.class === 'tank'
                ? this.createTank(id, entry.name, 'blue', false, true, pos, 0)
                : this.createSoldier(id, entry.name, 'blue', false, true, pos, 0);
            this.units.set(id, u);
        });

        // Spawn Red Team (If local is Red, spawn 9 Red AI; otherwise spawn 10 Red AI)
        const redBotsToSpawn = this.localTeam === 'red' ? redRoster.slice(0, 9) : redRoster;
        redBotsToSpawn.forEach((entry, idx) => {
            const id = `ai_red_${idx + 1}`;
            const pos = new THREE.Vector3(entry.x, 0, entry.z);
            this.initialBotSpawnMap.set(id, { pos: pos.clone(), rot: Math.PI });
            const u = entry.class === 'tank'
                ? this.createTank(id, entry.name, 'red', false, true, pos, Math.PI)
                : this.createSoldier(id, entry.name, 'red', false, true, pos, Math.PI);
            this.units.set(id, u);
        });
    }

    public resetAllUnitsToBase() {
        // 1. Reset local player to a distinct base position
        if (this.localUnit) {
            const spawn = this.getRandomBaseSpawn(this.localTeam, this.localClass);
            this.localUnit.pos.copy(spawn.pos);
            this.localUnit.rotation = spawn.rot;
            this.localUnit.speed = 0;
            this.localUnit.bankAngle = 0;
            this.localUnit.hp = this.localUnit.maxHp;
            this.localUnit.isDead = false;
            this.localUnit.respawnTimer = 0;
            this.localUnit.root.position.copy(this.localUnit.pos);
            this.localUnit.root.rotation.set(0, spawn.rot, 0);
            this.localUnit.root.visible = true;
            this.updateNameTag(this.localUnit.nameTagCanvas, this.localUnit.name, this.localUnit.team, this.localUnit.hp, this.localUnit.maxHp);
            (this.localUnit.nameTagSprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
        }

        // 2. Reset all bots to their distinct spread-out base positions
        this.units.forEach((unit, id) => {
            if (unit.isLocalPlayer) return;
            const initSpawn = this.initialBotSpawnMap.get(id);
            if (initSpawn) {
                const offsetX = (Math.random() - 0.5) * 6;
                const offsetZ = (Math.random() - 0.5) * 6;
                unit.pos.set(initSpawn.pos.x + offsetX, initSpawn.pos.y || 0, initSpawn.pos.z + offsetZ);
                unit.rotation = initSpawn.rot;
            } else {
                const sp = this.getRandomBaseSpawn(unit.team, unit.unitClass);
                unit.pos.copy(sp.pos);
                unit.rotation = sp.rot;
            }
            unit.speed = 0;
            unit.hp = unit.maxHp;
            unit.isDead = false;
            unit.respawnTimer = 0;
            unit.root.position.copy(unit.pos);
            unit.root.rotation.set(0, unit.rotation, 0);
            unit.root.visible = true;
            this.updateNameTag(unit.nameTagCanvas, unit.name, unit.team, unit.hp, unit.maxHp);
            (unit.nameTagSprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
        });

        // 3. Clear existing projectiles, shockwaves & particles
        for (const p of this.projectiles) this.scene.remove(p.mesh);
        this.projectiles = [];

        for (const sw of this.shockwaves) this.scene.remove(sw.mesh);
        this.shockwaves = [];

        for (const pt of this.particles) this.scene.remove(pt.mesh);
        this.particles = [];

        this.updateHUD();
    }

    public startMatchCountdown() {
        if (this.countdownTimer) {
            clearTimeout(this.countdownTimer);
            this.countdownTimer = null;
        }

        this.resetAllUnitsToBase();
        this.isCountdownActive = true;

        const overlay = document.getElementById('match-countdown-overlay');
        const numEl = document.getElementById('countdown-number');
        const subEl = document.getElementById('countdown-subtitle');

        if (!overlay || !numEl || !subEl) {
            this.isCountdownActive = false;
            return;
        }

        overlay.style.display = 'flex';

        const setStep = (text: string, color: string, scale: number, subText: string, isGo: boolean = false) => {
            numEl.innerText = text;
            numEl.style.color = color;
            numEl.style.transform = `scale(${scale})`;
            subEl.innerText = subText;
            setTimeout(() => {
                numEl.style.transform = 'scale(1)';
            }, 50);
            warAudio.playCountdownBeep(isGo);
        };

        const prepText = this.isOwnerLang ? 'VALMISTU LAHINGUKS' : 'PREPARE FOR BATTLE';
        const goText = this.isOwnerLang ? 'LAHINUGUSSE!' : 'ENGAGE!';

        // Step 3
        setStep('3', '#ffd32a', 1.8, prepText, false);

        // Step 2 (after 1s)
        this.countdownTimer = setTimeout(() => {
            setStep('2', '#ffd32a', 1.8, prepText, false);

            // Step 1 (after 2s)
            this.countdownTimer = setTimeout(() => {
                setStep('1', '#ff9f1a', 1.8, prepText, false);

                // Step 0: GO / LAHINGUSSE! (after 3s)
                this.countdownTimer = setTimeout(() => {
                    setStep(goText, '#2ecc71', 2.2, '', true);

                    // End Countdown after 0.85s
                    this.countdownTimer = setTimeout(() => {
                        overlay.style.display = 'none';
                        this.isCountdownActive = false;
                        this.countdownTimer = null;
                    }, 850);
                }, 1000);
            }, 1000);
        }, 1000);
    }

    // --- Unit Creators (Tank & Soldier) ---
    private createTank(id: string, name: string, team: Team, isLocal: boolean, isBot: boolean, pos: THREE.Vector3, rot: number): CombatUnit {
        const root = new THREE.Group();
        root.position.copy(pos);
        root.rotation.y = rot;

        const isRed = team === 'red';
        const hullColor = isRed ? 0x991b1b : 0x1d4ed8;
        const accentColor = isRed ? 0xff4757 : 0x00f2fe;

        const hullMat = new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.65, metalness: 0.35 });
        const hull = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.5, 6.6), hullMat);
        hull.position.y = 1.3;
        hull.castShadow = true;
        root.add(hull);

        const treadMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
        const lt = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 7.2), treadMat);
        lt.position.set(-2.5, 0.7, 0);
        root.add(lt);

        const rt = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 7.2), treadMat);
        rt.position.set(2.5, 0.7, 0);
        root.add(rt);

        const turret = new THREE.Group();
        turret.position.set(0, 2.2, 0);

        const turretDome = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.2, 3.8), hullMat);
        turretDome.position.set(0, 0.6, -0.4);
        turret.add(turretDome);

        const badgeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.2, 16), new THREE.MeshStandardMaterial({ color: accentColor, metalness: 0.8 }));
        badgeMesh.position.set(0.6, 1.25, -0.5);
        turret.add(badgeMesh);

        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.8, roughness: 0.2 });
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 5.0, 16), barrelMat);
        barrel.rotation.x = -Math.PI / 2;
        barrel.position.set(0, 0.6, 2.8);
        turret.add(barrel);

        root.add(turret);

        const nameCanvas = document.createElement('canvas');
        nameCanvas.width = 256;
        nameCanvas.height = 64;
        const nameTexture = new THREE.CanvasTexture(nameCanvas);
        const nameMat = new THREE.SpriteMaterial({ map: nameTexture, depthTest: false });
        const nameTagSprite = new THREE.Sprite(nameMat);
        nameTagSprite.scale.set(6.0, 1.5, 1);
        nameTagSprite.position.set(0, 4.8, 0);
        root.add(nameTagSprite);

        this.updateNameTag(nameCanvas, name, team, 100, 100);
        nameTexture.needsUpdate = true;

        this.scene.add(root);

        return {
            id, name, team, unitClass: 'tank', isLocalPlayer: isLocal, isBot,
            hp: 100, maxHp: 100, pos: pos.clone(), rotation: rot, turretAngle: 0,
            speed: 0, root, turret, barrel, nameTagSprite, nameTagCanvas: nameCanvas,
            reloadTimer: Math.random() * 2, respawnTimer: 0, isDead: false
        };
    }

    private createSoldier(id: string, name: string, team: Team, isLocal: boolean, isBot: boolean, pos: THREE.Vector3, rot: number): CombatUnit {
        const root = new THREE.Group();
        root.position.copy(pos);
        root.rotation.y = rot;

        const isRed = team === 'red';
        const suitColor = isRed ? 0x7f1d1d : 0x1e3a8a;
        const gearColor = isRed ? 0xef4444 : 0x38bdf8;

        const torsoMat = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.8 });
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.5), torsoMat);
        torso.position.y = 1.35;
        torso.castShadow = true;
        root.add(torso);

        const vestMat = new THREE.MeshStandardMaterial({ color: gearColor, roughness: 0.6 });
        const vest = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.7, 0.55), vestMat);
        vest.position.y = 1.4;
        root.add(vest);

        const headMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69 });
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), headMat);
        head.position.y = 2.15;
        root.add(head);

        const helmetMat = new THREE.MeshStandardMaterial({ color: gearColor });
        const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), helmetMat);
        helmet.position.y = 2.25;
        root.add(helmet);

        const legMat = new THREE.MeshStandardMaterial({ color: 0x1f2937 });
        const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), legMat);
        leftLeg.position.set(-0.25, 0.45, 0);
        root.add(leftLeg);

        const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), legMat);
        rightLeg.position.set(0.25, 0.45, 0);
        root.add(rightLeg);

        const rifleMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8 });
        const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 1.4), rifleMat);
        rifle.position.set(0.3, 1.3, 0.7);
        rifle.rotation.x = Math.PI / 10;
        root.add(rifle);

        const nameCanvas = document.createElement('canvas');
        nameCanvas.width = 256;
        nameCanvas.height = 64;
        const nameTexture = new THREE.CanvasTexture(nameCanvas);
        const nameMat = new THREE.SpriteMaterial({ map: nameTexture, depthTest: false });
        const nameTagSprite = new THREE.Sprite(nameMat);
        nameTagSprite.scale.set(4.8, 1.2, 1);
        nameTagSprite.position.set(0, 3.4, 0);
        root.add(nameTagSprite);

        this.updateNameTag(nameCanvas, name, team, 50, 50);
        nameTexture.needsUpdate = true;

        this.scene.add(root);

        return {
            id, name, team, unitClass: 'soldier', isLocalPlayer: isLocal, isBot,
            hp: 50, maxHp: 50, pos: pos.clone(), rotation: rot, speed: 0,
            root, leftLeg, rightLeg, nameTagSprite, nameTagCanvas: nameCanvas,
            reloadTimer: Math.random() * 1.5, secondaryReloadTimer: 0, respawnTimer: 0,
            isDead: false, walkCycle: Math.random() * Math.PI * 2
        };
    }

    private createPlane(id: string, name: string, team: Team, isLocal: boolean, isBot: boolean, pos: THREE.Vector3, rot: number): CombatUnit {
        const root = new THREE.Group();
        const spawnPos = pos.clone();
        spawnPos.y = 14.0; // Fly elevated above the battlefield
        root.position.copy(spawnPos);
        root.rotation.y = rot;

        const isRed = team === 'red';
        const bodyColor = isRed ? 0x991b1b : 0x1e3a8a;
        const accentColor = isRed ? 0xff4757 : 0x00f2fe;

        const fuselageMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.4, metalness: 0.6 });

        // 1. Sleek Jet Fuselage
        const fuselage = new THREE.Mesh(new THREE.ConeGeometry(1.4, 9.0, 16), fuselageMat);
        fuselage.rotation.x = Math.PI / 2;
        fuselage.castShadow = true;
        root.add(fuselage);

        // Cockpit Canopy (Tinted reflective glass)
        const canopyMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.75 });
        const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 12), canopyMat);
        canopy.scale.set(0.9, 0.7, 2.2);
        canopy.position.set(0, 0.7, 0.6);
        root.add(canopy);

        // 2. Swept Delta Main Wings
        const wingMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.5, metalness: 0.5 });
        const wings = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.22, 3.8), wingMat);
        wings.position.set(0, 0, -0.6);
        wings.castShadow = true;
        root.add(wings);

        // Wing accents
        const wingAccentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.3, metalness: 0.7 });
        const leftWingTip = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 3.0), wingAccentMat);
        leftWingTip.position.set(-5.3, 0, -0.6);
        root.add(leftWingTip);

        const rightWingTip = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 3.0), wingAccentMat);
        rightWingTip.position.set(5.3, 0, -0.6);
        root.add(rightWingTip);

        // Twin Autocannons under wings
        const gunMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.2 });
        const leftGun = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 12), gunMat);
        leftGun.rotation.x = -Math.PI / 2;
        leftGun.position.set(-2.6, -0.25, 1.0);
        root.add(leftGun);

        const rightGun = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 12), gunMat);
        rightGun.rotation.x = -Math.PI / 2;
        rightGun.position.set(2.6, -0.25, 1.0);
        root.add(rightGun);

        // 3. Twin Tail Stabilizer Fins
        const finMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.4, metalness: 0.6 });
        const leftFin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.8, 2.0), finMat);
        leftFin.position.set(-1.1, 1.0, -3.2);
        leftFin.rotation.z = -0.22; // Canted outward
        root.add(leftFin);

        const rightFin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.8, 2.0), finMat);
        rightFin.position.set(1.1, 1.0, -3.2);
        rightFin.rotation.z = 0.22; // Canted outward
        root.add(rightFin);

        // 4. Dual Afterburner Jet Exhausts
        const exhaustMat = new THREE.MeshBasicMaterial({ color: isRed ? 0xff4757 : 0x00f2fe });
        const leftExhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.8, 12), exhaustMat);
        leftExhaust.rotation.x = Math.PI / 2;
        leftExhaust.position.set(-0.65, 0, -4.2);
        root.add(leftExhaust);

        const rightExhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.8, 12), exhaustMat);
        rightExhaust.rotation.x = Math.PI / 2;
        rightExhaust.position.set(0.65, 0, -4.2);
        root.add(rightExhaust);

        // Name tag sprite
        const nameCanvas = document.createElement('canvas');
        nameCanvas.width = 256;
        nameCanvas.height = 64;
        const nameTexture = new THREE.CanvasTexture(nameCanvas);
        const nameMat = new THREE.SpriteMaterial({ map: nameTexture, depthTest: false });
        const nameTagSprite = new THREE.Sprite(nameMat);
        nameTagSprite.scale.set(6.0, 1.5, 1);
        nameTagSprite.position.set(0, 3.8, 0);
        root.add(nameTagSprite);

        this.updateNameTag(nameCanvas, name, team, 150, 150);
        nameTexture.needsUpdate = true;

        this.scene.add(root);

        return {
            id, name, team, unitClass: 'plane', isLocalPlayer: isLocal, isBot,
            hp: 150, maxHp: 150, pos: spawnPos.clone(), rotation: rot, speed: 28,
            root, nameTagSprite, nameTagCanvas: nameCanvas,
            reloadTimer: Math.random() * 1.5, secondaryReloadTimer: 0, respawnTimer: 0,
            isDead: false, bankAngle: 0
        };
    }

    private updateNameTag(canvas: HTMLCanvasElement, name: string, team: Team, hp: number, maxHp: number) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
        ctx.beginPath();
        ctx.roundRect(8, 4, 240, 56, 10);
        ctx.fill();

        ctx.lineWidth = 3;
        ctx.strokeStyle = team === 'red' ? '#ff4757' : '#00f2fe';
        ctx.stroke();

        ctx.font = 'bold 20px "Segoe UI", sans-serif';
        ctx.fillStyle = team === 'red' ? '#ff6b81' : '#70a1ff';
        ctx.textAlign = 'center';
        ctx.fillText(name.length > 20 ? name.substring(0, 20) + '..' : name, 128, 30);

        const barW = 210;
        const barH = 8;
        const barX = 23;
        const barY = 40;

        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(barX, barY, barW, barH);

        const pct = Math.max(0, hp / maxHp);
        ctx.fillStyle = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#ffd32a' : '#ff4757';
        ctx.fillRect(barX, barY, barW * pct, barH);
    }

    // --- Multiplayer Network Setup ---
    private initMultiplayer() {
        this.network = new WarMultiplayerNetwork(
            this.localPlayerId,
            this.localUsername,
            this.localTeam,
            this.localClass,
            (event: MultiplayerEvent) => {
                if (event.type === 'player_state') {
                    this.onRemotePlayerState(event.payload);
                } else if (event.type === 'player_fire') {
                    this.onRemotePlayerFire(event.payload);
                } else if (event.type === 'grenade_throw') {
                    this.onRemoteGrenade(event.payload);
                } else if (event.type === 'airstrike_drop') {
                    this.onRemoteAirstrike(event.payload);
                } else if (event.type === 'unit_killed') {
                    this.onRemoteKill(event.payload);
                } else if (event.type === 'player_join') {
                    const msg = this.isOwnerLang
                        ? `👥 ${event.payload.name || 'Uus mängija'} liitus serveriga!`
                        : `👥 ${event.payload.name || 'New player'} joined the server!`;
                    this.showToast(msg, event.payload.team === 'red' ? '#ff4757' : '#00f2fe');
                } else if (event.type === 'player_leave') {
                    const unit = this.units.get(event.payload.id);
                    if (unit) {
                        const msg = this.isOwnerLang
                            ? `🚪 ${unit.name} lahkus serverist`
                            : `🚪 ${unit.name} left the server`;
                        this.showToast(msg, '#a4b0be');
                        this.scene.remove(unit.root);
                        this.units.delete(event.payload.id);
                    }
                }
            },
            (statusText: string, onlineCount: number) => {
                this.connectedHumanCount = onlineCount;
                const serverEl = document.getElementById('server-players-count');
                if (serverEl) {
                    serverEl.innerText = this.isOwnerLang
                        ? `${Math.min(20, this.connectedHumanCount)} / 20 Mängijat (10v10 Lahing)`
                        : `${Math.min(20, this.connectedHumanCount)} / 20 Players (10v10 Battle)`;
                }
            }
        );
    }

    private onRemotePlayerState(payload: any) {
        if (!payload || payload.id === this.localPlayerId) return;

        let remote = this.units.get(payload.id);
        if (!remote) {
            if (payload.unitClass === 'plane') {
                remote = this.createPlane(payload.id, payload.name, payload.team, false, false, new THREE.Vector3(payload.x, 0, payload.z), payload.rot);
            } else if (payload.unitClass === 'tank') {
                remote = this.createTank(payload.id, payload.name, payload.team, false, false, new THREE.Vector3(payload.x, 0, payload.z), payload.rot);
            } else {
                remote = this.createSoldier(payload.id, payload.name, payload.team, false, false, new THREE.Vector3(payload.x, 0, payload.z), payload.rot);
            }
            this.units.set(payload.id, remote);
        }

        const targetY = payload.unitClass === 'plane' ? 14.0 : (payload.y || 0);
        remote.pos.set(payload.x, targetY, payload.z);
        remote.root.position.copy(remote.pos);
        remote.root.rotation.y = payload.rot;
        if (remote.turret && payload.turretRot !== undefined) remote.turret.rotation.y = payload.turretRot;
        remote.hp = payload.hp;
        this.updateNameTag(remote.nameTagCanvas, remote.name, remote.team, remote.hp, remote.maxHp);
        (remote.nameTagSprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
    }

    private onRemotePlayerFire(payload: any) {
        if (!payload || payload.shooterId === this.localPlayerId) return;
        const from = new THREE.Vector3(payload.fromX, payload.fromY, payload.fromZ);
        const dir = new THREE.Vector3(payload.dirX, payload.dirY, payload.dirZ);
        this.spawnProjectile(payload.shooterId, payload.shooterName, payload.team, from, dir, payload.isExplosive, payload.isCannon);
    }

    private onRemoteKill(payload: any) {
        if (!payload) return;
        this.addKillFeedEntry(payload.killerName, payload.killerTeam, payload.victimName, payload.victimTeam);
        if (payload.killerTeam === 'red') this.redScore = Math.max(this.redScore, payload.redScore);
        else this.blueScore = Math.max(this.blueScore, payload.blueScore);
        this.updateHUD();
    }

    private onRemoteAirstrike(payload: any) {
        if (!payload || payload.shooterId === this.localPlayerId) return;
        const targetPos = new THREE.Vector3(payload.targetX, 0, payload.targetZ);
        warAudio.playAirstrike();
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const spreadX = (Math.random() - 0.5) * 8.0;
                const spreadZ = (Math.random() - 0.5) * 8.0;
                const impactPos = targetPos.clone().add(new THREE.Vector3(spreadX, 0, spreadZ));
                this.triggerSpreadingExplosion(impactPos, 16.0, 85, payload.shooterId, payload.shooterName, payload.team);
            }, 600 + i * 260);
        }
    }

    private onRemoteGrenade(payload: any) {
        if (!payload || payload.shooterId === this.localPlayerId) return;
        const from = new THREE.Vector3(payload.fromX, payload.fromY, payload.fromZ);
        const target = new THREE.Vector3(payload.targetX, payload.targetY, payload.targetZ);
        this.spawnGrenade(payload.shooterId, payload.shooterName, payload.team, from, target);
    }

    private broadcastState() {
        if (!this.network || this.localUnit.isDead) return;

        const now = performance.now();
        if (now - this.lastBroadcastTime < 50) return;
        this.lastBroadcastTime = now;

        this.network.send({
            type: 'player_state',
            payload: {
                id: this.localPlayerId,
                name: this.localUsername,
                team: this.localTeam,
                unitClass: this.localClass,
                x: this.localUnit.pos.x,
                z: this.localUnit.pos.z,
                rot: this.localUnit.rotation,
                turretRot: this.localUnit.turretAngle || 0,
                hp: this.localUnit.hp
            }
        });
    }

    // --- Input & Controls ---
    private isMouseDown = false;

    private setupInputListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Digit1') {
                if (this.localClass === 'missile') this.selectWeapon('missile');
                else this.selectWeapon('cannon');
            }
            if (e.code === 'Digit2') {
                if (this.localClass === 'missile') this.selectWeapon('nuke');
                else this.selectWeapon('mg');
            }
            if (e.code === 'Digit3' || e.code === 'KeyF') {
                if (this.localClass !== 'plane' && this.localClass !== 'missile') this.selectWeapon('airstrike');
            }
            if (e.code === 'Digit4' || e.code === 'KeyR') this.selectWeapon('missile');
            if (e.code === 'Digit5' || e.code === 'KeyN') this.selectWeapon('nuke');
            if (e.code === 'Escape' && this.isSatelliteTargeting) {
                if (this.localClass !== 'missile') this.stopSatelliteTargeting();
            }
            if (e.code === 'Space' || e.code === 'KeyE') this.fireActiveWeapon();
        });

        window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

        window.addEventListener('mousemove', (e) => {
            this.mouseScreenPos.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouseScreenPos.y = -(e.clientY / window.innerHeight) * 2 + 1;

            const crosshair = document.getElementById('crosshair');
            if (crosshair) {
                crosshair.style.left = `${e.clientX}px`;
                crosshair.style.top = `${e.clientY}px`;
            }
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.isMouseDown = true;
                this.fireActiveWeapon();
            } else if (e.button === 2) {
                // Secondary action: alternate fire or toggle missile/nuke in Raketitiim
                if (this.localClass === 'missile') {
                    this.selectWeapon(this.activeWeapon === 'missile' ? 'nuke' : 'missile');
                } else if (this.isSatelliteTargeting) {
                    this.stopSatelliteTargeting();
                } else if (this.activeWeapon === 'cannon') {
                    this.selectWeapon('mg');
                } else {
                    this.selectWeapon('cannon');
                }
            }
        });

        window.addEventListener('mouseup', () => { this.isMouseDown = false; });

        window.addEventListener('contextmenu', (e) => e.preventDefault());

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Touch
        const bindTouch = (id: string, code: string) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys[code] = true; });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); this.keys[code] = false; });
        };
        bindTouch('m-btn-up', 'KeyW');
        bindTouch('m-btn-down', 'KeyS');
        bindTouch('m-btn-left', 'KeyA');
        bindTouch('m-btn-right', 'KeyD');

        document.getElementById('m-btn-fire')?.addEventListener('touchstart', (e) => { e.preventDefault(); this.fireActiveWeapon(); });
        document.getElementById('m-btn-mg')?.addEventListener('touchstart', (e) => { e.preventDefault(); this.selectWeapon('mg'); this.fireActiveWeapon(); });
    }

    private setupUI() {
        const soundBtn = document.getElementById('btn-sound-toggle');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                const muted = warAudio.toggleMute();
                soundBtn.innerText = muted ? '🔇 Sound' : '🔊 Sound';
                soundBtn.style.color = muted ? '#e74c3c' : '#ffffff';
            });
        }

        const helpModal = document.getElementById('modal-help');
        document.getElementById('btn-open-help')?.addEventListener('click', () => { if (helpModal) helpModal.style.display = 'flex'; });
        document.getElementById('btn-close-help')?.addEventListener('click', () => { if (helpModal) helpModal.style.display = 'none'; });

        document.getElementById('weapon-cannon')?.addEventListener('click', () => this.selectWeapon('cannon'));
        document.getElementById('weapon-mg')?.addEventListener('click', () => this.selectWeapon('mg'));
        document.getElementById('weapon-airstrike')?.addEventListener('click', () => this.selectWeapon('airstrike'));
        document.getElementById('weapon-missile')?.addEventListener('click', () => this.selectWeapon('missile'));
        document.getElementById('weapon-nuke')?.addEventListener('click', () => this.selectWeapon('nuke'));

        document.getElementById('btn-restart-match')?.addEventListener('click', () => {
            const matchModal = document.getElementById('match-end-modal');
            if (matchModal) matchModal.style.display = 'none';
            this.isMatchEnded = false;
            this.redScore = 0;
            this.blueScore = 0;
            this.startMatchCountdown();
        });
    }

    private selectWeapon(type: ActiveWeapon) {
        if (this.localClass === 'plane' && type === 'airstrike') {
            return;
        }

        if (this.localClass === 'missile' && (type === 'cannon' || type === 'mg' || type === 'airstrike')) {
            return; // Raketitiim is strictly the missile commander and cannot use ground soldier weapons
        }

        if ((type === 'missile' || type === 'nuke') && this.localClass !== 'missile') {
            const warnMsg = this.isOwnerLang
                ? '🔒 Ainult Raketitiim (Roll) saab kasutada rakette ja tuumapomme!'
                : '🔒 Only Missile Team role can use missiles and nuclear strikes!';
            this.showToast(warnMsg, '#ff4757');
            return;
        }

        this.activeWeapon = type;
        document.querySelectorAll('.weapon-card').forEach(c => c.classList.remove('active'));
        document.getElementById(`weapon-${type}`)?.classList.add('active');

        if (type === 'missile' || type === 'nuke') {
            this.startSatelliteTargeting(type);
        } else {
            if (this.isSatelliteTargeting) {
                this.stopSatelliteTargeting();
            }
        }

        if (type === 'airstrike') {
            if (!this.isAirstrikeTargeting) this.toggleAirstrikeTargeting();
        } else {
            if (this.isAirstrikeTargeting) {
                this.isAirstrikeTargeting = false;
                if (this.airstrikeReticleMesh) this.airstrikeReticleMesh.visible = false;
                const cdEl = document.getElementById('cooldown-airstrike');
                if (cdEl) {
                    cdEl.innerText = this.airstrikeCooldown > 0 ? `${Math.ceil(this.airstrikeCooldown)}s` : 'VALMIS';
                    cdEl.style.color = '#ff6b81';
                }
            }
        }
        this.updateHUD();
    }

    // --- Active Weapon Firing Routing ---
    private fireActiveWeapon() {
        if (this.localUnit.isDead || this.isMatchEnded) return;

        if (this.isSatelliteTargeting) {
            this.launchSatelliteStrike(this.mouseAimTarget.clone(), this.satelliteTargetType);
            return;
        }

        if (this.activeWeapon === 'airstrike' || this.isAirstrikeTargeting) {
            this.triggerAirstrike();
            return;
        }

        if (this.activeWeapon === 'mg') {
            this.fireMachineGunWeapon();
        } else {
            this.fireCannonWeapon();
        }
    }

    private planeGunAlternator = false;

    private fireCannonWeapon() {
        if (this.primaryReloadTimer > 0 || this.localUnit.isDead || this.isMatchEnded) return;
        this.primaryReloadTimer = this.primaryReloadTime;

        if (this.localClass === 'plane') {
            // Fighter Jet Twin Vulcan Autocannon
            this.planeGunAlternator = !this.planeGunAlternator;
            const gunOffset = new THREE.Vector3(this.planeGunAlternator ? -2.6 : 2.6, -0.25, 2.5);
            gunOffset.applyEuler(this.localUnit.root.rotation);
            const muzzlePos = this.localUnit.pos.clone().add(gunOffset);

            const dir = new THREE.Vector3().subVectors(this.mouseAimTarget, muzzlePos).normalize();
            this.spawnProjectile(this.localPlayerId, this.localUnit.name, this.localTeam, muzzlePos, dir, true, true);
            warAudio.playCannonShot();
        } else if (this.localClass === 'tank') {
            // Tank Cannon (Huge Shell with Spreading Explosion)
            const muzzlePos = new THREE.Vector3(0, 0.6, 5.2);
            this.localUnit.turret!.localToWorld(muzzlePos);

            const dir = new THREE.Vector3().subVectors(this.mouseAimTarget, muzzlePos).normalize();
            dir.y += 0.03;

            this.spawnProjectile(this.localPlayerId, this.localUnit.name, this.localTeam, muzzlePos, dir, true, true);
            warAudio.playCannonShot();
        } else {
            // Soldier Assault Rifle
            const riflePos = this.localUnit.pos.clone().add(new THREE.Vector3(0.3, 1.3, 0.7));
            const spread = (Math.random() - 0.5) * 0.04;
            const dir = new THREE.Vector3().subVectors(this.mouseAimTarget, riflePos).normalize();
            dir.x += spread;
            dir.z += spread;

            this.spawnProjectile(this.localPlayerId, this.localUnit.name, this.localTeam, riflePos, dir, false, false);
            warAudio.playMachineGun();
        }

        this.network?.send({
            type: 'player_fire',
            payload: {
                shooterId: this.localPlayerId,
                shooterName: this.localUnit.name,
                team: this.localTeam,
                fromX: this.localUnit.pos.x, fromY: this.localUnit.pos.y, fromZ: this.localUnit.pos.z,
                dirX: this.mouseAimTarget.x, dirY: 0, dirZ: this.mouseAimTarget.z,
                isExplosive: this.localClass === 'tank' || this.localClass === 'plane',
                isCannon: this.localClass === 'tank' || this.localClass === 'plane'
            }
        });
    }

    private fireMachineGunWeapon() {
        if (this.localUnit.isDead || this.isMatchEnded) return;

        if (this.localClass === 'plane') {
            // Fighter Jet Heavy Air-to-Ground Bomb Drop directly beneath the airplane
            if (this.secondaryReloadTimer > 0) return;
            this.secondaryReloadTimer = 1.8;

            const bombFrom = this.localUnit.pos.clone().add(new THREE.Vector3(0, -1.2, 0));
            const forward = new THREE.Vector3(Math.sin(this.localUnit.rotation), 0, Math.cos(this.localUnit.rotation));
            const planeSpeed = Math.max(12.0, this.localUnit.speed || 28.0);
            const bombVel = forward.clone().multiplyScalar(planeSpeed * 0.7);
            bombVel.y = -8.0; // drops straight down under the plane

            this.spawnAirBomb(this.localPlayerId, this.localUnit.name, this.localTeam, bombFrom, bombVel);
            warAudio.playAirstrike();
            this.updateHUD();
        } else if (this.localClass === 'tank') {
            // Rapid Tank MG-42 (0.09s interval)
            if (this.secondaryReloadTimer > 0) return;
            this.secondaryReloadTimer = 0.09;

            if (this.mgAmmo <= 0) return;
            this.mgAmmo--;

            const mgPos = new THREE.Vector3(-0.8, 1.2, 1.8);
            this.localUnit.turret!.localToWorld(mgPos);
            const spread = (Math.random() - 0.5) * 0.06;
            const dir = new THREE.Vector3().subVectors(this.mouseAimTarget, mgPos).normalize();
            dir.x += spread;
            dir.z += spread;

            this.spawnProjectile(this.localPlayerId, this.localUnit.name, this.localTeam, mgPos, dir, false, false);
            warAudio.playMachineGun();
            this.updateHUD();
        } else {
            // Soldier Hand Grenade (Realistic Ballistic Arc to Target)
            if (this.secondaryReloadTimer > 0) return;
            this.secondaryReloadTimer = 3.5;

            const fromPos = this.localUnit.pos.clone().add(new THREE.Vector3(0, 1.8, 0));
            this.spawnGrenade(this.localPlayerId, this.localUnit.name, this.localTeam, fromPos, this.mouseAimTarget.clone());
            warAudio.playMachineGun();
            this.updateHUD();
        }
    }

    private spawnAirBomb(
        shooterId: string, shooterName: string, team: Team,
        from: THREE.Vector3, velocity: THREE.Vector3
    ) {
        const bombGeo = new THREE.CylinderGeometry(0.32, 0.45, 1.8, 12);
        const bombMat = new THREE.MeshStandardMaterial({
            color: team === 'red' ? 0x991b1b : 0x1e3a8a,
            roughness: 0.35,
            metalness: 0.75
        });
        const mesh = new THREE.Mesh(bombGeo, bombMat);
        mesh.rotation.x = Math.PI / 2;
        mesh.position.copy(from);
        mesh.castShadow = true;

        this.scene.add(mesh);
        this.projectiles.push({
            id: 'airbomb_' + Math.random(),
            shooterId,
            shooterName,
            team,
            mesh,
            velocity: velocity.clone(),
            damage: 100,
            explosionRadius: 18.0,
            life: 3.5,
            isExplosive: true,
            isCannon: false,
            isGrenade: true,
            gravity: 28.0,
            tumbleSpeed: new THREE.Vector3(1.8, 0.3, 0),
            targetPos: from.clone()
        });

        this.network?.send({
            type: 'airstrike_drop',
            payload: {
                shooterId,
                shooterName,
                team,
                targetX: from.x,
                targetZ: from.z
            }
        });
    }

    private spawnGrenade(
        shooterId: string, shooterName: string, team: Team,
        from: THREE.Vector3, targetPos: THREE.Vector3
    ) {
        const dx = targetPos.x - from.x;
        const dz = targetPos.z - from.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const flightTime = Math.max(0.45, Math.min(1.8, dist / 26.0));
        const g = 26.0;

        const vx = dx / flightTime;
        const vz = dz / flightTime;
        const vy = (targetPos.y - from.y + 0.5 * g * flightTime * flightTime) / flightTime;

        const grenadeGeo = new THREE.SphereGeometry(0.3, 10, 10);
        const grenadeMat = new THREE.MeshStandardMaterial({
            color: team === 'red' ? 0x8b0000 : 0x2d572c,
            roughness: 0.6,
            metalness: 0.4
        });
        const mesh = new THREE.Mesh(grenadeGeo, grenadeMat);
        mesh.position.copy(from);
        mesh.castShadow = true;

        this.scene.add(mesh);
        this.projectiles.push({
            id: 'grenade_' + Math.random(),
            shooterId,
            shooterName,
            team,
            mesh,
            velocity: new THREE.Vector3(vx, vy, vz),
            damage: 65,
            explosionRadius: 14.0,
            life: flightTime + 0.05,
            isExplosive: true,
            isCannon: false,
            isGrenade: true,
            gravity: g,
            tumbleSpeed: new THREE.Vector3(8 + Math.random() * 6, 6 + Math.random() * 4, 10 + Math.random() * 6),
            targetPos: targetPos.clone()
        });

        this.network?.send({
            type: 'grenade_throw',
            payload: {
                shooterId,
                shooterName,
                team,
                fromX: from.x, fromY: from.y, fromZ: from.z,
                targetX: targetPos.x, targetY: targetPos.y, targetZ: targetPos.z
            }
        });
    }

    private spawnProjectile(
        shooterId: string, shooterName: string, team: Team,
        from: THREE.Vector3, dir: THREE.Vector3,
        isExplosive: boolean, isCannon: boolean
    ) {
        const geo = isCannon
            ? new THREE.CylinderGeometry(0.22, 0.22, 1.3, 8)
            : isExplosive
            ? new THREE.SphereGeometry(0.28, 8, 8)
            : new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6);

        const color = team === 'red' ? 0xff4757 : 0x00f2fe;
        const mat = new THREE.MeshBasicMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(from);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

        this.scene.add(mesh);
        this.projectiles.push({
            id: 'proj_' + Math.random(),
            shooterId,
            shooterName,
            team,
            mesh,
            velocity: dir.clone().multiplyScalar(isCannon ? 110 : isExplosive ? 45 : 160),
            damage: isCannon ? 65 : isExplosive ? 50 : 14,
            explosionRadius: isCannon ? 15.0 : isExplosive ? 12.0 : 0,
            life: isCannon ? 3.0 : isExplosive ? 2.5 : 1.5,
            isExplosive,
            isCannon
        });
    }

    // --- Expanding Shockwave & Spreading Explosions ---
    private triggerSpreadingExplosion(epicenter: THREE.Vector3, maxRadius: number, baseDamage: number, shooterId: string, shooterName: string, team: Team) {
        warAudio.playExplosion();

        // 1. Dynamic Flash Point Light (Illuminates battlefield surroundings)
        const flashLight = new THREE.PointLight(0xffa502, 12, Math.max(30, maxRadius * 2.5));
        flashLight.position.copy(epicenter).add(new THREE.Vector3(0, 3.5, 0));
        this.scene.add(flashLight);
        let flashLife = 0.22;
        const fadeLight = () => {
            flashLife -= 0.04;
            if (flashLife > 0) {
                flashLight.intensity = (flashLife / 0.22) * 12;
                setTimeout(fadeLight, 40);
            } else {
                this.scene.remove(flashLight);
            }
        };
        setTimeout(fadeLight, 40);

        // 2. Ground Charred Crater Decal
        const craterGeo = new THREE.RingGeometry(0.1, Math.min(7.5, maxRadius * 0.42), 24);
        const craterMat = new THREE.MeshBasicMaterial({
            color: 0x090d10,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.75
        });
        const crater = new THREE.Mesh(craterGeo, craterMat);
        crater.position.copy(epicenter);
        crater.position.y = 0.08;
        crater.rotation.x = -Math.PI / 2;
        this.scene.add(crater);
        setTimeout(() => {
            let op = 0.75;
            const fadeCrater = setInterval(() => {
                op -= 0.05;
                if (op <= 0) {
                    clearInterval(fadeCrater);
                    this.scene.remove(crater);
                } else {
                    craterMat.opacity = op;
                }
            }, 500);
        }, 12000);

        // 3. Immediate direct blast damage to all enemy units caught in epicenter radius
        this.units.forEach(unit => {
            if (!unit.isDead && unit.team !== team) {
                const dx = unit.pos.x - epicenter.x;
                const dz = unit.pos.z - epicenter.z;
                const hDist = Math.sqrt(dx * dx + dz * dz);
                if (hDist <= maxRadius) {
                    const falloff = Math.max(0.4, 1.0 - (hDist / maxRadius));
                    const actualDmg = Math.round(baseDamage * falloff);
                    this.damageUnit(unit, actualDmg, shooterId, shooterName, team);
                }
            }
        });

        // 4. Expanding Blast Shockwaves (Primary High-Velocity Ring + Dust Wavefront)
        const ringGeo = new THREE.RingGeometry(0.2, 1.4, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: team === 'red' ? 0xff4757 : 0xffa502,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95
        });
        const shockwaveMesh = new THREE.Mesh(ringGeo, ringMat);
        shockwaveMesh.position.copy(epicenter);
        shockwaveMesh.position.y = 0.25;
        shockwaveMesh.rotation.x = -Math.PI / 2;
        this.scene.add(shockwaveMesh);

        this.shockwaves.push({
            mesh: shockwaveMesh,
            currentRadius: 1.0,
            maxRadius,
            expansionSpeed: 34.0,
            life: 0.65,
            maxLife: 0.65,
            damage: baseDamage,
            shooterId,
            shooterName,
            team,
            epicenter: epicenter.clone(),
            damagedUnits: new Set()
        });

        // Dust Wavefront Ring
        const dustGeo = new THREE.RingGeometry(0.2, 1.8, 32);
        const dustMat = new THREE.MeshBasicMaterial({
            color: 0x7f8c8d,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.55
        });
        const dustMesh = new THREE.Mesh(dustGeo, dustMat);
        dustMesh.position.copy(epicenter);
        dustMesh.position.y = 0.18;
        dustMesh.rotation.x = -Math.PI / 2;
        this.scene.add(dustMesh);

        this.shockwaves.push({
            mesh: dustMesh,
            currentRadius: 0.8,
            maxRadius: maxRadius * 1.15,
            expansionSpeed: 24.0,
            life: 0.85,
            maxLife: 0.85,
            damage: 0,
            shooterId,
            shooterName,
            team,
            epicenter: epicenter.clone(),
            damagedUnits: new Set()
        });

        // 4. White-Hot Core Fireball Mushroom
        for (let i = 0; i < 14; i++) {
            const size = 1.2 + Math.random() * 1.6;
            const geo = new THREE.IcosahedronGeometry(size, 1);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xfff3a0,
                transparent: true,
                opacity: 0.95
            });
            const pMesh = new THREE.Mesh(geo, mat);
            pMesh.position.copy(epicenter).add(new THREE.Vector3((Math.random() - 0.5) * 1.2, Math.random() * 1.0 + 0.3, (Math.random() - 0.5) * 1.2));
            this.scene.add(pMesh);

            const upwardVel = new THREE.Vector3(
                (Math.random() - 0.5) * 6,
                Math.random() * 9 + 6,
                (Math.random() - 0.5) * 6
            );
            this.particles.push({
                mesh: pMesh,
                velocity: upwardVel,
                life: 0.6 + Math.random() * 0.35,
                maxLife: 0.95,
                sizeStart: size,
                sizeEnd: size * 2.8,
                drag: 1.8,
                startColor: new THREE.Color(0xfff3a0),
                endColor: new THREE.Color(0xd63031),
                rotSpeed: new THREE.Vector3(Math.random() * 4, Math.random() * 4, Math.random() * 4)
            });
        }

        // 5. Fiery Outward Blast Jets
        for (let i = 0; i < 24; i++) {
            const size = 0.5 + Math.random() * 0.9;
            const geo = new THREE.DodecahedronGeometry(size);
            const mat = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.4 ? 0xff4757 : 0xffa502,
                transparent: true,
                opacity: 0.9
            });
            const pMesh = new THREE.Mesh(geo, mat);
            pMesh.position.copy(epicenter);

            const speed = 12 + Math.random() * 26;
            const dir = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.4 + 0.2, (Math.random() - 0.5) * 2).normalize();

            this.scene.add(pMesh);
            this.particles.push({
                mesh: pMesh,
                velocity: dir.multiplyScalar(speed),
                life: 0.6 + Math.random() * 0.4,
                maxLife: 0.6 + Math.random() * 0.4,
                sizeStart: size,
                sizeEnd: 0.1,
                drag: 2.5,
                gravity: 12.0,
                startColor: new THREE.Color(0xffa502),
                endColor: new THREE.Color(0xeb2f06)
            });
        }

        // 6. Dense Black Billowing Smoke Columns
        for (let i = 0; i < 20; i++) {
            const size = 1.0 + Math.random() * 1.5;
            const geo = new THREE.SphereGeometry(size, 7, 7);
            const mat = new THREE.MeshBasicMaterial({
                color: 0x1e272e,
                transparent: true,
                opacity: 0.8
            });
            const pMesh = new THREE.Mesh(geo, mat);
            pMesh.position.copy(epicenter).add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.5 + 0.5, (Math.random() - 0.5) * 2));

            const smokeVel = new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                Math.random() * 6 + 3,
                (Math.random() - 0.5) * 4
            );

            this.scene.add(pMesh);
            this.particles.push({
                mesh: pMesh,
                velocity: smokeVel,
                life: 1.4 + Math.random() * 0.9,
                maxLife: 2.3,
                sizeStart: size,
                sizeEnd: size * 4.5,
                drag: 0.8,
                startColor: new THREE.Color(0x2d3436),
                endColor: new THREE.Color(0x0a0d10)
            });
        }

        // 7. Hot Flying Metal Shrapnel Sparks
        for (let i = 0; i < 18; i++) {
            const sparkGeo = new THREE.BoxGeometry(0.15, 0.15, 0.4);
            const sparkMat = new THREE.MeshBasicMaterial({
                color: 0xfffa65
            });
            const sparkMesh = new THREE.Mesh(sparkGeo, sparkMat);
            sparkMesh.position.copy(epicenter).add(new THREE.Vector3(0, 0.5, 0));

            const sparkDir = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.8 + 0.5, (Math.random() - 0.5) * 2).normalize();
            const sparkSpeed = 20 + Math.random() * 24;

            this.scene.add(sparkMesh);
            this.particles.push({
                mesh: sparkMesh,
                velocity: sparkDir.multiplyScalar(sparkSpeed),
                life: 0.8 + Math.random() * 0.5,
                maxLife: 1.3,
                sizeStart: 1.0,
                sizeEnd: 0.2,
                gravity: 24.0,
                drag: 0.9,
                rotSpeed: new THREE.Vector3(15, 12, 10),
                startColor: new THREE.Color(0xfffa65),
                endColor: new THREE.Color(0xff4757)
            });
        }

        // 8. Chain Reaction on Barrels
        this.barrels.forEach(barrel => {
            if (!barrel.isExploded && barrel.pos.distanceTo(epicenter) < maxRadius + 2.0) {
                barrel.isExploded = true;
                this.scene.remove(barrel.mesh);
                setTimeout(() => {
                    this.triggerSpreadingExplosion(barrel.pos, 16.0, 75, shooterId, shooterName, team);
                }, 120 + Math.random() * 180);
            }
        });
    }

    // --- Airstrike Targeting Marker & Drop ---
    private isAirstrikeTargeting = false;
    private airstrikeReticleMesh!: THREE.Group;

    private setupAirstrikeReticle() {
        this.airstrikeReticleMesh = new THREE.Group();

        // Pulsing red targeting ring
        const ringGeo = new THREE.RingGeometry(4.0, 4.4, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3838, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        this.airstrikeReticleMesh.add(ring);

        // Cross lines
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xff4d4d });
        const l1 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 10), lineMat);
        l1.rotation.x = -Math.PI / 2;
        this.airstrikeReticleMesh.add(l1);

        const l2 = new THREE.Mesh(new THREE.PlaneGeometry(10, 0.3), lineMat);
        l2.rotation.x = -Math.PI / 2;
        this.airstrikeReticleMesh.add(l2);

        this.airstrikeReticleMesh.position.y = 0.2;
        this.airstrikeReticleMesh.visible = false;
        this.scene.add(this.airstrikeReticleMesh);
    }

    private toggleAirstrikeTargeting() {
        if (this.airstrikeCooldown > 0 || this.localUnit.isDead || this.isMatchEnded) return;

        this.isAirstrikeTargeting = !this.isAirstrikeTargeting;
        if (!this.airstrikeReticleMesh) this.setupAirstrikeReticle();
        this.airstrikeReticleMesh.visible = this.isAirstrikeTargeting;

        const cdEl = document.getElementById('cooldown-airstrike');
        if (cdEl) {
            cdEl.innerText = this.isAirstrikeTargeting ? '📍 SIHI & KLÕPSA' : 'VALMIS';
            cdEl.style.color = this.isAirstrikeTargeting ? '#ffd32a' : '#ff6b81';
        }
    }

    private dropAirstrikeAtTarget(targetPos: THREE.Vector3) {
        this.isAirstrikeTargeting = false;
        if (this.airstrikeReticleMesh) this.airstrikeReticleMesh.visible = false;
        this.airstrikeCooldown = 25;

        warAudio.playAirstrike();

        // Spawn red smoke beacon grenade at the spot
        const beaconGeo = new THREE.SphereGeometry(0.4, 8, 8);
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.copy(targetPos);
        beacon.position.y = 0.4;
        this.scene.add(beacon);

        // Broadcast to multiplayer room
        this.network?.send({
            type: 'airstrike_drop',
            payload: {
                shooterId: this.localPlayerId,
                shooterName: this.localUsername,
                team: this.localTeam,
                targetX: targetPos.x,
                targetZ: targetPos.z
            }
        });

        // Drop a cluster of heavy explosive shells right on that target spot
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const spreadX = (Math.random() - 0.5) * 8.0;
                const spreadZ = (Math.random() - 0.5) * 8.0;
                const impactPos = targetPos.clone().add(new THREE.Vector3(spreadX, 0, spreadZ));

                // Massive expanding shockwave & explosion
                this.triggerSpreadingExplosion(impactPos, 16.0, 85, this.localPlayerId, this.localUsername, this.localTeam);
            }, 600 + i * 260);
        }

        setTimeout(() => this.scene.remove(beacon), 3500);
        this.updateHUD();
    }

    private triggerAirstrike() {
        if (this.isAirstrikeTargeting) {
            this.dropAirstrikeAtTarget(this.mouseAimTarget.clone());
        } else {
            this.toggleAirstrikeTargeting();
        }
    }

    // --- Satellite Targeting & Missile / Nuke Strikes ---
    private setupSatelliteReticle() {
        this.satelliteReticleMesh = new THREE.Group();

        // 1. Dynamic Outer Blast Radius Ring
        const ringGeo = new THREE.RingGeometry(22.5, 24.0, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.name = 'blastRing';
        ring.rotation.x = -Math.PI / 2;
        this.satelliteReticleMesh.add(ring);

        // 2. Holographic Crosshair Lines
        const lineMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.9 });
        const l1 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 25), lineMat);
        l1.rotation.x = -Math.PI / 2;
        this.satelliteReticleMesh.add(l1);

        const l2 = new THREE.Mesh(new THREE.PlaneGeometry(25, 0.4), lineMat);
        l2.rotation.x = -Math.PI / 2;
        this.satelliteReticleMesh.add(l2);

        // 3. Center Target Dot
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffd32a }));
        dot.position.y = 0.4;
        this.satelliteReticleMesh.add(dot);

        this.satelliteReticleMesh.position.y = 0.2;
        this.satelliteReticleMesh.visible = false;
        this.scene.add(this.satelliteReticleMesh);
    }

    private startSatelliteTargeting(type: 'missile' | 'nuke') {
        if (this.localUnit.isDead || this.isMatchEnded) return;

        if (type === 'missile' && this.missileCooldown > 0) {
            this.showToast(this.isOwnerLang ? `Rakett laeb veel: ${Math.ceil(this.missileCooldown)}s!` : `Missile reload: ${Math.ceil(this.missileCooldown)}s!`, '#ffd32a');
            return;
        }

        if (type === 'nuke' && this.nukeTimer > 0) {
            this.showToast(this.isOwnerLang ? `Tuumapomm laeb veel: ${Math.ceil(this.nukeTimer)}s!` : `Nuclear strike charging: ${Math.ceil(this.nukeTimer)}s!`, '#ffd32a');
            return;
        }

        this.isSatelliteTargeting = true;
        this.satelliteTargetType = type;
        this.satelliteCamCenter.copy(this.localUnit ? this.localUnit.pos : new THREE.Vector3(0, 0, 0));
        if (!this.satelliteReticleMesh) this.setupSatelliteReticle();
        this.satelliteReticleMesh.visible = true;

        const isNuke = type === 'nuke';
        const ring = this.satelliteReticleMesh.getObjectByName('blastRing') as THREE.Mesh;
        if (ring) {
            const rad = isNuke ? 88.0 : 24.0;
            ring.geometry.dispose();
            ring.geometry = new THREE.RingGeometry(rad - 1.5, rad, 64);
            (ring.material as THREE.MeshBasicMaterial).color.setHex(isNuke ? 0xff4757 : 0x2ed573);
        }

        const hud = document.getElementById('satellite-targeting-hud');
        if (hud) hud.style.display = 'flex';

        const iconEl = document.getElementById('sat-mode-icon');
        const titleEl = document.getElementById('sat-mode-title');
        const descEl = document.getElementById('sat-mode-desc');
        const promptEl = document.getElementById('sat-bottom-prompt');

        if (isNuke) {
            if (iconEl) iconEl.innerText = '☢️';
            if (titleEl) {
                titleEl.innerText = this.isOwnerLang ? '☢️ TUUMAPOMMI SATELLIIDISIHTIMINE (4x PLAHVATUS)' : '☢️ NUCLEAR STRIKE TARGETING (4x BLAST)';
                titleEl.style.color = '#ff4757';
            }
            if (descEl) descEl.innerText = this.isOwnerLang ? 'Vali kaardilt sihtmärk ja klõpsa TUUMARÜNNAK! (ESC - tühista)' : 'Select target coordinates on battlefield and click to launch! (ESC cancel)';
            if (promptEl) promptEl.innerText = this.isOwnerLang ? '☢️ KLÕPSA MAASTIKUL, ET SAATA TUUMAPOMM!' : '☢️ CLICK ON TERRAIN TO LAUNCH NUKE!';
        } else {
            if (iconEl) iconEl.innerText = '🚀';
            if (titleEl) {
                titleEl.innerText = this.isOwnerLang ? '🚀 RAKETIRÜNNAKU SATELLIIDISIHTIMINE (10s VAHEGA)' : '🚀 MISSILE STRIKE TARGETING (10s COOLDOWN)';
                titleEl.style.color = '#2ed573';
            }
            if (descEl) descEl.innerText = this.isOwnerLang ? '10 sek vahega raketirünnak! Liiguta pildiga hiirt ja klõpsa sihtmärgile!' : '10s cooldown missile strike! Move targeting camera and click to fire!';
            if (promptEl) promptEl.innerText = this.isOwnerLang ? '🚀 KLÕPSA MAASTIKUL, ET SAATA RAKETT (10s VAHEGA)!' : '🚀 CLICK ON TERRAIN TO FIRE MISSILE (10s COOLDOWN)!';
        }
    }

    private stopSatelliteTargeting() {
        this.isSatelliteTargeting = false;
        if (this.satelliteReticleMesh) this.satelliteReticleMesh.visible = false;
        const hud = document.getElementById('satellite-targeting-hud');
        if (hud) hud.style.display = 'none';
        if (this.localClass !== 'missile') {
            this.selectWeapon('cannon');
        }
    }

    private launchSatelliteStrike(targetPos: THREE.Vector3, type: 'missile' | 'nuke') {
        const isNuke = type === 'nuke';

        if (!isNuke && this.missileCooldown > 0) {
            const cdMsg = this.isOwnerLang ? `⏳ Rakett laeb veel: ${Math.ceil(this.missileCooldown)}s!` : `⏳ Missile reloading: ${Math.ceil(this.missileCooldown)}s!`;
            this.showToast(cdMsg, '#ffd32a');
            return;
        }

        if (isNuke && this.nukeTimer > 0) {
            const cdMsg = this.isOwnerLang ? `⏳ Tuumapomm laeb veel: ${Math.ceil(this.nukeTimer)}s!` : `⏳ Nuclear strike charging: ${Math.ceil(this.nukeTimer)}s!`;
            this.showToast(cdMsg, '#ffd32a');
            return;
        }

        if (this.localClass !== 'missile') {
            this.stopSatelliteTargeting();
        }

        const siloOrigin = this.missileSilos.get(this.localTeam) || this.localUnit.pos.clone().add(new THREE.Vector3(0, 10, 0));

        if (!isNuke) {
            // Tactical Missile Strike (10s cooldown, free)
            this.missileCooldown = 10.0;
            this.updateHUD();

            warAudio.playMissileLaunch();
            const launchMsg = this.isOwnerLang ? '🚀 Rakett välja saadetud (10s vahega)!' : '🚀 Missile launched (10s cooldown)!';
            this.showToast(launchMsg, '#2ed573');

            // Ballistic Rocket Trajectory Projectile
            const rocketGeo = new THREE.CylinderGeometry(0.4, 0.4, 3.5, 8);
            const rocketMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.8 });
            const rocketMesh = new THREE.Mesh(rocketGeo, rocketMat);
            rocketMesh.position.copy(siloOrigin);
            this.scene.add(rocketMesh);

            const flightTime = 1.35;
            const startPos = siloOrigin.clone();
            const endPos = targetPos.clone();
            let elapsed = 0;

            const rocketAnim = (dt: number) => {
                elapsed += dt;
                const t = Math.min(1.0, elapsed / flightTime);

                const curX = THREE.MathUtils.lerp(startPos.x, endPos.x, t);
                const curZ = THREE.MathUtils.lerp(startPos.z, endPos.z, t);
                const arcHeight = Math.sin(t * Math.PI) * 75;
                const curY = THREE.MathUtils.lerp(startPos.y, 0, t) + arcHeight;

                rocketMesh.position.set(curX, curY, curZ);

                // Spawn heavy rocket exhaust flame
                if (Math.random() < 0.8) {
                    this.spawnCrashParticle(rocketMesh.position.clone());
                }

                if (t >= 1.0) {
                    this.scene.remove(rocketMesh);
                    this.triggerSpreadingExplosion(endPos, 35.0, 300, this.localPlayerId, this.localUnit.name, this.localTeam);
                } else {
                    requestAnimationFrame(() => rocketAnim(0.016));
                }
            };
            rocketAnim(0.016);
        } else {
            // ☢️ Nuclear Strike (4x Plahvatus)
            this.nukeTimer = 60.0;
            this.updateHUD();

            warAudio.playNuclearSiren();

            // Display global warning banner for 5.5s
            const banner = document.getElementById('nuke-warning-banner');
            const bannerText = document.getElementById('nuke-warning-text');
            if (banner && bannerText) {
                bannerText.innerText = this.isOwnerLang ? '🚨 HOIATUS: TUUMARÜNNAK TULEKUL!' : '🚨 ALERT: NUCLEAR STRIKE INBOUND!';
                banner.style.display = 'flex';
                setTimeout(() => { banner.style.display = 'none'; }, 5500);
            }

            // Massive ICBM Missile Flight
            const icbmGeo = new THREE.CylinderGeometry(1.0, 1.0, 8.0, 12);
            const icbmMat = new THREE.MeshStandardMaterial({ color: 0x2f3542, metalness: 0.9 });
            const icbmMesh = new THREE.Mesh(icbmGeo, icbmMat);
            icbmMesh.position.copy(siloOrigin);
            this.scene.add(icbmMesh);

            const flightTime = 2.4;
            const startPos = siloOrigin.clone();
            const endPos = targetPos.clone();
            let elapsed = 0;

            const icbmAnim = (dt: number) => {
                elapsed += dt;
                const t = Math.min(1.0, elapsed / flightTime);

                const curX = THREE.MathUtils.lerp(startPos.x, endPos.x, t);
                const curZ = THREE.MathUtils.lerp(startPos.z, endPos.z, t);
                const arcHeight = Math.sin(t * Math.PI) * 110;
                const curY = THREE.MathUtils.lerp(startPos.y, 0, t) + arcHeight;

                icbmMesh.position.set(curX, curY, curZ);

                // Massive rocket exhaust jet
                for (let i = 0; i < 2; i++) {
                    this.spawnCrashParticle(icbmMesh.position.clone());
                }

                if (t >= 1.0) {
                    this.scene.remove(icbmMesh);
                    this.triggerNuclearExplosion(endPos, this.localPlayerId, this.localUnit.name, this.localTeam);
                } else {
                    requestAnimationFrame(() => icbmAnim(0.016));
                }
            };
            icbmAnim(0.016);
        }
    }

    private triggerNuclearExplosion(epicenter: THREE.Vector3, shooterId: string, shooterName: string, team: Team) {
        warAudio.playNuclearBlast();

        const nukeRadius = 120.0; // 4x massive blast radius

        // 1. Immediate massive nuclear vaporization for all enemy units in radius
        this.units.forEach(unit => {
            if (!unit.isDead && unit.team !== team) {
                const dx = unit.pos.x - epicenter.x;
                const dz = unit.pos.z - epicenter.z;
                const hDist = Math.sqrt(dx * dx + dz * dz);
                if (hDist <= nukeRadius) {
                    this.damageUnit(unit, 1000, shooterId, shooterName, team);
                }
            }
        });

        // 2. Blinding Thermonuclear Flash Light
        const flashLight = new THREE.PointLight(0xfff3a0, 40, 320);
        flashLight.position.copy(epicenter).add(new THREE.Vector3(0, 10, 0));
        this.scene.add(flashLight);
        let flashLife = 0.55;
        const fadeLight = () => {
            flashLife -= 0.04;
            if (flashLife > 0) {
                flashLight.intensity = (flashLife / 0.55) * 40;
                setTimeout(fadeLight, 40);
            } else {
                this.scene.remove(flashLight);
            }
        };
        setTimeout(fadeLight, 40);

        // 3. Colossal Scorch Crater
        const craterGeo = new THREE.RingGeometry(0.5, 48.0, 32);
        const craterMat = new THREE.MeshBasicMaterial({
            color: 0x05080a,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
        const crater = new THREE.Mesh(craterGeo, craterMat);
        crater.position.copy(epicenter);
        crater.position.y = 0.09;
        crater.rotation.x = -Math.PI / 2;
        this.scene.add(crater);

        // 4. Massive Dual High-Velocity Blast Shockwaves
        const ringGeo = new THREE.RingGeometry(0.5, 3.5, 48);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xff4757,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95
        });
        const shockMesh = new THREE.Mesh(ringGeo, ringMat);
        shockMesh.position.copy(epicenter);
        shockMesh.position.y = 0.3;
        shockMesh.rotation.x = -Math.PI / 2;
        this.scene.add(shockMesh);

        this.shockwaves.push({
            mesh: shockMesh,
            currentRadius: 2.0,
            maxRadius: nukeRadius,
            expansionSpeed: 52.0,
            life: 2.0,
            maxLife: 2.0,
            damage: 1000,
            shooterId,
            shooterName,
            team,
            epicenter: epicenter.clone(),
            damagedUnits: new Set()
        });

        // Dust Seismic Wavefront
        const dustGeo = new THREE.RingGeometry(0.5, 5.0, 48);
        const dustMat = new THREE.MeshBasicMaterial({
            color: 0x57606f,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.75
        });
        const dustMesh = new THREE.Mesh(dustGeo, dustMat);
        dustMesh.position.copy(epicenter);
        dustMesh.position.y = 0.22;
        dustMesh.rotation.x = -Math.PI / 2;
        this.scene.add(dustMesh);

        this.shockwaves.push({
            mesh: dustMesh,
            currentRadius: 1.5,
            maxRadius: nukeRadius * 1.3,
            expansionSpeed: 38.0,
            life: 2.2,
            maxLife: 2.2,
            damage: 0,
            shooterId,
            shooterName,
            team,
            epicenter: epicenter.clone(),
            damagedUnits: new Set()
        });

        // 4. Towering Nuclear Mushroom Cloud Stem
        for (let y = 2; y <= 55; y += 4) {
            const pGeo = new THREE.SphereGeometry(3.0 + (y * 0.1), 8, 8);
            const pMat = new THREE.MeshBasicMaterial({
                color: y < 20 ? 0xff4757 : 0x2f3542,
                transparent: true,
                opacity: 0.85
            });
            const pMesh = new THREE.Mesh(pGeo, pMat);
            pMesh.position.copy(epicenter).add(new THREE.Vector3((Math.random() - 0.5) * 4, y, (Math.random() - 0.5) * 4));
            this.scene.add(pMesh);

            this.particles.push({
                mesh: pMesh,
                velocity: new THREE.Vector3((Math.random() - 0.5) * 2, 8.0, (Math.random() - 0.5) * 2),
                life: 3.5,
                maxLife: 3.5,
                sizeStart: 3.0,
                sizeEnd: 8.5,
                drag: 0.5,
                startColor: new THREE.Color(y < 20 ? 0xfff3a0 : 0xeb2f06),
                endColor: new THREE.Color(0x0f1416)
            });
        }

        // 5. Huge Boiling Mushroom Cloud Top / Cap (Mushroom Head at Y=50..70)
        for (let i = 0; i < 40; i++) {
            const angle = (i / 40) * Math.PI * 2;
            const dist = 6 + Math.random() * 22;
            const capY = 52 + Math.random() * 16;
            const pGeo = new THREE.IcosahedronGeometry(4.5 + Math.random() * 3.5, 1);
            const pMat = new THREE.MeshBasicMaterial({
                color: Math.random() < 0.4 ? 0xff4757 : 0x1e272e,
                transparent: true,
                opacity: 0.9
            });
            const pMesh = new THREE.Mesh(pGeo, pMat);
            pMesh.position.copy(epicenter).add(new THREE.Vector3(Math.cos(angle) * dist, capY, Math.sin(angle) * dist));
            this.scene.add(pMesh);

            const outward = new THREE.Vector3(Math.cos(angle), (Math.random() - 0.3) * 0.5, Math.sin(angle)).normalize();
            this.particles.push({
                mesh: pMesh,
                velocity: outward.multiplyScalar(8 + Math.random() * 12),
                life: 4.5,
                maxLife: 4.5,
                sizeStart: 4.5,
                sizeEnd: 16.0,
                drag: 0.8,
                rotSpeed: new THREE.Vector3(1, 1, 1),
                startColor: new THREE.Color(0xff6b81),
                endColor: new THREE.Color(0x0a0d10)
            });
        }

        // 6. Ground Blast Jet Particles & Glowing Radioactive Sparks
        for (let i = 0; i < 45; i++) {
            const sparkGeo = new THREE.BoxGeometry(0.3, 0.3, 0.8);
            const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfffa65 });
            const sparkMesh = new THREE.Mesh(sparkGeo, sparkMat);
            sparkMesh.position.copy(epicenter).add(new THREE.Vector3(0, 1.5, 0));

            const dir = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.6 + 0.4, (Math.random() - 0.5) * 2).normalize();
            this.scene.add(sparkMesh);
            this.particles.push({
                mesh: sparkMesh,
                velocity: dir.multiplyScalar(35 + Math.random() * 30),
                life: 1.8 + Math.random() * 0.8,
                maxLife: 2.6,
                sizeStart: 2.0,
                sizeEnd: 0.3,
                gravity: 28.0,
                drag: 0.6,
                rotSpeed: new THREE.Vector3(20, 20, 20),
                startColor: new THREE.Color(0xfffa65),
                endColor: new THREE.Color(0xff3838)
            });
        }

        // Camera Shake
        this.camera.position.y += 6.0;
        this.camera.position.x += 4.0;
    }

    // --- Damage & Elimination ---
    private damageUnit(victim: CombatUnit, damage: number, attackerId: string, attackerName: string, attackerTeam: Team) {
        if (victim.isDead || this.isMatchEnded) return;
        victim.hp = Math.max(0, victim.hp - damage);
        warAudio.playHit();

        this.updateNameTag(victim.nameTagCanvas, victim.name, victim.team, victim.hp, victim.maxHp);
        (victim.nameTagSprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;

        if (victim.isLocalPlayer) {
            this.camera.position.x += (Math.random() - 0.5) * 1.5;
            this.camera.position.y += (Math.random() - 0.5) * 1.5;
            this.updateHUD();
        }

        if (victim.hp <= 0) {
            if (victim.isLocalPlayer) {
                this.lastDeathPos = victim.pos.clone();
            }

            if (victim.unitClass === 'plane' && !victim.isCrashing) {
                // Trigger airplane dramatic crash sequence
                victim.isCrashing = true;
                victim.isDead = false;
                const forwardSpeed = Math.max(16.0, victim.speed || 24.0);
                victim.crashVelocity = new THREE.Vector3(
                    Math.sin(victim.rotation) * forwardSpeed,
                    -7.0,
                    Math.cos(victim.rotation) * forwardSpeed
                );
                victim.crashRotationSpeed = new THREE.Vector3(2.8, (Math.random() - 0.5) * 3.5, 6.5);
                this.handleKill(attackerId, attackerName, attackerTeam, victim.id, victim.name, victim.team);
                warAudio.playCannonShot();
            } else if (!victim.isCrashing) {
                victim.isDead = true;
                victim.root.visible = false;
                this.triggerSpreadingExplosion(victim.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), 12.0, 30, attackerId, attackerName, attackerTeam);
                this.handleKill(attackerId, attackerName, attackerTeam, victim.id, victim.name, victim.team);
            }
        }
    }

    private handleKill(killerId: string, killerName: string, killerTeam: Team, victimId: string, victimName: string, victimTeam: Team) {
        if (killerTeam === 'red') this.redScore++;
        else this.blueScore++;

        this.addKillFeedEntry(killerName, killerTeam, victimName, victimTeam);

        this.network?.send({
            type: 'unit_killed',
            payload: {
                killerId, killerName, killerTeam,
                victimId, victimName, victimTeam,
                redScore: this.redScore,
                blueScore: this.blueScore
            }
        });

        if (killerId === this.localPlayerId) {
            this.myKills++;
            this.addWarMoney(150);
        }

        this.updateHUD();

        if (this.redScore >= this.targetScore || this.blueScore >= this.targetScore) {
            this.endMatch(this.redScore >= this.targetScore ? 'red' : 'blue');
            return;
        }

        const victim = this.units.get(victimId);
        if (victim && !victim.isCrashing) {
            victim.respawnTimer = 5.0;
            if (victim.isLocalPlayer) this.showRespawnOverlay(5);
        }
    }

    private addWarMoney(amount: number) {
        this.warMoney += amount;
        this.matchMoneyEarned += amount;
        this.saveUserDataToDb();
        this.updateHUD();
    }

    private addKillFeedEntry(killerName: string, killerTeam: Team, victimName: string, victimTeam: Team) {
        const feed = document.getElementById('kill-feed');
        if (!feed) return;
        const entry = document.createElement('div');
        entry.className = 'kill-entry';
        const kColor = killerTeam === 'red' ? '#ff6b81' : '#70a1ff';
        const vColor = victimTeam === 'red' ? '#ff6b81' : '#70a1ff';
        entry.innerHTML = `<span style="color: ${kColor};">${killerName}</span> 💥 <span style="color: ${vColor};">${victimName}</span>`;
        feed.appendChild(entry);
        setTimeout(() => entry.remove(), 5000);
    }

    private showRespawnOverlay(sec: number) {
        const overlay = document.getElementById('respawn-overlay');
        const countEl = document.getElementById('respawn-countdown');
        if (!overlay || !countEl) return;
        overlay.style.display = 'flex';
        let left = sec;
        countEl.innerText = left.toString();

        const timer = setInterval(() => {
            left--;
            if (left > 0) countEl.innerText = left.toString();
            else { clearInterval(timer); overlay.style.display = 'none'; }
        }, 1000);
    }

    private respawnUnit(unit: CombatUnit) {
        unit.isDead = false;
        unit.isCrashing = false;
        unit.hp = unit.maxHp;
        unit.root.visible = true;

        if (unit.isLocalPlayer) {
            this.lastDeathPos = null;
        }

        const spawn = this.getRandomBaseSpawn(unit.team, unit.unitClass);
        unit.pos.copy(spawn.pos);
        unit.root.position.copy(unit.pos);
        unit.rotation = spawn.rot;
        unit.root.rotation.set(0, spawn.rot, 0);

        this.updateNameTag(unit.nameTagCanvas, unit.name, unit.team, unit.hp, unit.maxHp);
        (unit.nameTagSprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
        this.updateHUD();

        if (unit.isLocalPlayer && this.localClass === 'missile') {
            this.activeWeapon = 'missile';
            this.startSatelliteTargeting('missile');
        }
    }

    private endMatch(winningTeam: Team) {
        this.isMatchEnded = true;
        const isWin = winningTeam === this.localTeam;

        if (isWin) {
            warAudio.playVictory();
            this.addWarMoney(1000);
        } else {
            this.saveUserDataToDb();
        }

        const modal = document.getElementById('match-end-modal');
        const icon = document.getElementById('match-end-icon');
        const title = document.getElementById('match-end-title');
        const desc = document.getElementById('match-end-desc');
        const finalKills = document.getElementById('final-kills-val');
        const finalMoney = document.getElementById('final-money-val');

        if (modal && title && desc && finalKills && finalMoney) {
            modal.style.display = 'flex';
            if (isWin) {
                if (icon) icon.innerText = '🏆';
                title.innerText = this.isOwnerLang ? 'VÕIT!' : 'VICTORY!';
                title.style.color = '#ffd32a';
                desc.innerText = this.isOwnerLang
                    ? `Sinu ${this.localTeam.toUpperCase()} tiim saavutas 100 tapmist ja kindlustas lahinguvälja võidu!`
                    : `Your ${this.localTeam.toUpperCase()} team reached 100 kills and secured battlefield victory!`;
            } else {
                if (icon) icon.innerText = '⚔️';
                title.innerText = this.isOwnerLang ? 'KAOTUS!' : 'DEFEAT!';
                title.style.color = '#ff4757';
                desc.innerText = this.isOwnerLang
                    ? `Vastaste ${winningTeam.toUpperCase()} tiim jõudis 100 tapmiseni esimesena.`
                    : `Enemy ${winningTeam.toUpperCase()} team reached 100 kills first.`;
            }
            finalKills.innerText = this.myKills.toString();
            finalMoney.innerText = `+${this.matchMoneyEarned.toLocaleString()} €`;
        }
    }

    // --- Update HUD & Radar ---
    private updateHUD() {
        const redScoreEl = document.getElementById('team-red-score');
        const blueScoreEl = document.getElementById('team-blue-score');
        const hpText = document.getElementById('hp-text');
        const hpBar = document.getElementById('hp-bar');
        const reloadText = document.getElementById('reload-text');
        const reloadBar = document.getElementById('reload-bar');
        const statKills = document.getElementById('stat-kills');
        const statMoney = document.getElementById('stat-money');
        const ammoMg = document.getElementById('ammo-mg');
        const cdAirstrike = document.getElementById('cooldown-airstrike');

        if (redScoreEl) redScoreEl.innerText = this.redScore.toString();
        if (blueScoreEl) blueScoreEl.innerText = this.blueScore.toString();

        if (hpText && hpBar && this.localUnit) {
            hpText.innerText = `${Math.round(this.localUnit.hp)} / ${this.localUnit.maxHp}`;
            const pct = Math.max(0, (this.localUnit.hp / this.localUnit.maxHp) * 100);
            hpBar.style.width = `${pct}%`;
        }

        if (reloadText && reloadBar) {
            if (this.activeWeapon === 'cannon') {
                if (this.primaryReloadTimer > 0) {
                    reloadText.innerText = `${this.primaryReloadTimer.toFixed(1)}s`;
                    const pct = ((this.primaryReloadTime - this.primaryReloadTimer) / this.primaryReloadTime) * 100;
                    reloadBar.style.width = `${pct}%`;
                } else {
                    reloadText.innerText = this.isOwnerLang ? 'VALMIS' : 'READY';
                    reloadBar.style.width = '100%';
                }
            } else if (this.activeWeapon === 'mg') {
                if (this.localClass === 'soldier') {
                    if (this.secondaryReloadTimer > 0) {
                        reloadText.innerText = `${this.secondaryReloadTimer.toFixed(1)}s`;
                        const pct = ((3.5 - this.secondaryReloadTimer) / 3.5) * 100;
                        reloadBar.style.width = `${pct}%`;
                    } else {
                        reloadText.innerText = this.isOwnerLang ? 'GRANAAT VALMIS' : 'GRENADE READY';
                        reloadBar.style.width = '100%';
                    }
                } else {
                    reloadText.innerText = this.mgAmmo > 0 ? `${this.mgAmmo} RDS` : (this.isOwnerLang ? 'TÜHI' : 'EMPTY');
                    reloadBar.style.width = `${Math.max(0, (this.mgAmmo / 500) * 100)}%`;
                }
            } else if (this.activeWeapon === 'airstrike') {
                if (this.airstrikeCooldown > 0) {
                    reloadText.innerText = `${Math.ceil(this.airstrikeCooldown)}s`;
                    const pct = ((25.0 - this.airstrikeCooldown) / 25.0) * 100;
                    reloadBar.style.width = `${pct}%`;
                } else {
                    reloadText.innerText = this.isAirstrikeTargeting
                        ? (this.isOwnerLang ? '📍 SIHI & KLÕPSA' : '📍 TARGET & CLICK')
                        : (this.isOwnerLang ? 'VALMIS' : 'READY');
                    reloadBar.style.width = '100%';
                }
            } else if (this.activeWeapon === 'missile') {
                reloadText.innerText = this.missileCooldown > 0 ? `🚀 ${Math.ceil(this.missileCooldown)}s` : (this.isOwnerLang ? '🚀 RAKETT VALMIS' : '🚀 MISSILE READY');
                reloadBar.style.width = this.missileCooldown > 0 ? `${((10.0 - this.missileCooldown) / 10.0) * 100}%` : '100%';
            } else if (this.activeWeapon === 'nuke') {
                reloadText.innerText = this.nukeTimer > 0 ? `☢️ ${Math.ceil(this.nukeTimer)}s` : (this.isOwnerLang ? '☢️ VALMIS' : '☢️ READY');
                reloadBar.style.width = this.nukeTimer > 0 ? `${((60.0 - this.nukeTimer) / 60.0) * 100}%` : '100%';
            }
        }

        if (statKills) statKills.innerText = this.myKills.toString();
        if (statMoney) statMoney.innerText = this.warMoney.toLocaleString();
        const deployMoneyVal = document.getElementById('deploy-money-val');
        if (deployMoneyVal) deployMoneyVal.innerText = `${this.warMoney.toLocaleString()} €`;
        if (ammoMg) {
            ammoMg.innerText = this.localClass === 'tank'
                ? `${this.mgAmmo} rds`
                : (this.isOwnerLang ? '💣 Granaat' : '💣 Grenade');
        }
        if (cdAirstrike) {
            cdAirstrike.innerText = this.airstrikeCooldown > 0
                ? `${Math.ceil(this.airstrikeCooldown)}s`
                : (this.isOwnerLang ? 'VALMIS' : 'READY');
        }
        const cdMissileEl = document.getElementById('cooldown-missile') || document.getElementById('cost-missile');
        if (cdMissileEl) {
            cdMissileEl.innerText = this.missileCooldown > 0
                ? `${Math.ceil(this.missileCooldown)}s`
                : (this.isOwnerLang ? 'VALMIS' : 'READY');
            cdMissileEl.style.color = this.missileCooldown > 0 ? '#ffd32a' : '#2ed573';
        }
        const timerNukeEl = document.getElementById('timer-nuke');
        if (timerNukeEl) {
            timerNukeEl.innerText = this.nukeTimer > 0
                ? `${Math.ceil(this.nukeTimer)}s`
                : (this.isOwnerLang ? 'VALMIS' : 'READY');
            timerNukeEl.style.color = this.nukeTimer > 0 ? '#ffd32a' : '#2ed573';
        }
    }

    private radarSweepAngle = 0;

    private renderRadar(dt: number) {
        if (!this.radarCtx || !this.radarCanvas || !this.localUnit) return;
        const ctx = this.radarCtx;
        const w = this.radarCanvas.width;
        const h = this.radarCanvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const r = w / 2 - 6;

        ctx.clearRect(0, 0, w, h);

        // Circular clipping
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();

        // Dark tactical radar background
        ctx.fillStyle = 'rgba(7, 12, 20, 0.95)';
        ctx.fillRect(0, 0, w, h);

        // Tactical Range Rings
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.33, 0, Math.PI * 2);
        ctx.arc(cx, cy, r * 0.66, 0, Math.PI * 2);
        ctx.arc(cx, cy, r * 0.98, 0, Math.PI * 2);
        ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
        ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
        ctx.stroke();

        // Center frontline marker
        ctx.strokeStyle = 'rgba(255, 211, 42, 0.35)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cx - r, cy);
        ctx.lineTo(cx + r, cy);
        ctx.stroke();
        ctx.setLineDash([]);

        const mapMax = 380; // Maps -380..+380 world units to radar

        // Base zones
        const blueBaseY = cy + (-270 / mapMax) * (r * 0.85);
        const redBaseY = cy + (270 / mapMax) * (r * 0.85);

        ctx.fillStyle = 'rgba(0, 242, 254, 0.3)';
        ctx.beginPath();
        ctx.arc(cx, blueBaseY, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 71, 87, 0.3)';
        ctx.beginPath();
        ctx.arc(cx, redBaseY, 8, 0, Math.PI * 2);
        ctx.fill();

        // Missile Silos markers on radar
        const blueSiloX = cx + (-45 / mapMax) * (r * 0.85);
        const blueSiloY = cy + (-270 / mapMax) * (r * 0.85);
        ctx.fillStyle = '#00f2fe';
        ctx.fillRect(blueSiloX - 3, blueSiloY - 3, 6, 6);

        const redSiloX = cx + (45 / mapMax) * (r * 0.85);
        const redSiloY = cy + (270 / mapMax) * (r * 0.85);
        ctx.fillStyle = '#ff4757';
        ctx.fillRect(redSiloX - 3, redSiloY - 3, 6, 6);

        // Rotating radar sweep line
        const prevAngle = this.radarSweepAngle;
        this.radarSweepAngle = (this.radarSweepAngle + 2.5 * dt) % (Math.PI * 2);
        const currAngle = this.radarSweepAngle;
        const sweepX = cx + Math.cos(this.radarSweepAngle) * r;
        const sweepY = cy + Math.sin(this.radarSweepAngle) * r;
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(sweepX, sweepY);
        ctx.stroke();

        // If satellite targeting is active, render current satellite camera targeting box
        if (this.isSatelliteTargeting) {
            const camRx = cx + (this.satelliteCamCenter.x / mapMax) * (r * 0.85);
            const camRy = cy + (this.satelliteCamCenter.z / mapMax) * (r * 0.85);
            ctx.strokeStyle = '#2ed573';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(camRx - 7, camRy - 7, 14, 14);
            ctx.fillStyle = 'rgba(46, 213, 115, 0.25)';
            ctx.fillRect(camRx - 7, camRy - 7, 14, 14);
            ctx.beginPath();
            ctx.moveTo(camRx - 10, camRy); ctx.lineTo(camRx + 10, camRy);
            ctx.moveTo(camRx, camRy - 10); ctx.lineTo(camRx, camRy + 10);
            ctx.stroke();
        }

        // Render all 20 units across battlefield
        this.units.forEach(unit => {
            if (unit.isDead) return;
            const rx = cx + (unit.pos.x / mapMax) * (r * 0.85);
            const ry = cy + (unit.pos.z / mapMax) * (r * 0.85);
            const distFromCenter = Math.hypot(rx - cx, ry - cy);

            if (unit.isLocalPlayer) {
                if (this.localClass === 'missile') {
                    // Raketitiim commands remotely via satellite - no ground player dot
                    return;
                }
                // Proximity danger warning pulse ring
                if (this.radarPulseAlpha > 0) {
                    this.radarPulseAlpha = Math.max(0, this.radarPulseAlpha - dt * 2.2);
                    ctx.strokeStyle = `rgba(255, 71, 87, ${this.radarPulseAlpha})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(rx, ry, 16 * (1 - this.radarPulseAlpha * 0.4), 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Local player: golden icon with direction arrow
                ctx.fillStyle = '#ffd32a';
                ctx.beginPath();
                ctx.arc(rx, ry, 5.5, 0, Math.PI * 2);
                ctx.fill();

                const dirX = Math.sin(unit.rotation);
                const dirZ = Math.cos(unit.rotation);
                ctx.strokeStyle = '#ffd32a';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(rx, ry);
                ctx.lineTo(rx + dirX * 9, ry + dirZ * 9);
                ctx.stroke();
            } else {
                const isEnemy = unit.team !== this.localTeam;

                // Check if radar line just swept over this unit inside the radar line
                if (isEnemy && distFromCenter <= r) {
                    const unitAngle = (Math.atan2(ry - cy, rx - cx) + Math.PI * 2) % (Math.PI * 2);
                    let isSwept = false;
                    if (currAngle >= prevAngle) {
                        isSwept = unitAngle >= prevAngle && unitAngle < currAngle;
                    } else {
                        isSwept = unitAngle >= prevAngle || unitAngle < currAngle;
                    }

                    if (isSwept && !this.localUnit.isDead && !this.isMatchEnded) {
                        // Enemy is swept by the radar line -> Authentic Sonar PING!
                        warAudio.playRadarBeep(0.35);
                        unit.radarFlash = 1.0;
                    }
                }

                // Fade out radar flash
                if (unit.radarFlash && unit.radarFlash > 0) {
                    unit.radarFlash = Math.max(0, unit.radarFlash - dt * 2.0);
                }

                const baseColor = isEnemy ? '#ff4757' : '#00f2fe';
                ctx.fillStyle = baseColor;
                ctx.beginPath();
                const dotSize = unit.unitClass === 'tank' ? 4.2 : 2.6;
                ctx.arc(rx, ry, dotSize, 0, Math.PI * 2);
                ctx.fill();

                // Flash glow ring when line swept over enemy
                if (isEnemy && unit.radarFlash && unit.radarFlash > 0) {
                    ctx.strokeStyle = `rgba(255, 71, 87, ${unit.radarFlash})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(rx, ry, dotSize + 6 * (1 - unit.radarFlash), 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        });

        ctx.restore();

        // Radar border glow
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    // --- Main Game Loop ---
    private animate = () => {
        requestAnimationFrame(this.animate);
        const dt = Math.min(this.clock.getDelta(), 0.1);

        if (!this.isMatchEnded) {
            this.updateCrashingUnits(dt);
            this.updatePlayer(dt);
            this.updateBots(dt);
            this.updateProjectiles(dt);
            this.updateShockwaves(dt);
            this.updateParticles(dt);
            this.updateCamera();
            this.renderRadar(dt);
            this.broadcastState();
            this.checkOutOfBounds(dt);
        }

        this.renderer.render(this.scene, this.camera);
    };

    private checkOutOfBounds(dt: number) {
        if (!this.localUnit || this.localUnit.isDead || this.localUnit.isCrashing || this.isCountdownActive) {
            const overlay = document.getElementById('out-of-bounds-overlay');
            if (overlay) overlay.style.display = 'none';
            this.isOutOfBounds = false;
            this.outOfBoundsTimer = 5.0;
            return;
        }

        const bx = Math.abs(this.localUnit.pos.x);
        const bz = Math.abs(this.localUnit.pos.z);
        const isOutside = bx > 400 || bz > 610;

        const overlay = document.getElementById('out-of-bounds-overlay');
        const titleEl = document.getElementById('out-of-bounds-title');
        const timerEl = document.getElementById('out-of-bounds-timer');

        if (isOutside) {
            this.isOutOfBounds = true;
            this.outOfBoundsTimer = Math.max(0, this.outOfBoundsTimer - dt);

            if (overlay) overlay.style.display = 'flex';
            if (titleEl) {
                titleEl.innerText = this.isOwnerLang
                    ? '⚠️ MINE TAGASI VÕI SURED!'
                    : '⚠️ RETURN TO BATTLEFIELD OR DIE!';
            }
            if (timerEl) {
                timerEl.innerText = `${this.outOfBoundsTimer.toFixed(1)}s`;
            }

            if (this.outOfBoundsTimer <= 0) {
                this.outOfBoundsTimer = 5.0;
                if (overlay) overlay.style.display = 'none';
                this.damageUnit(this.localUnit, 9999, 'boundary', 'Battlefield Boundary', this.localTeam === 'red' ? 'blue' : 'red');
                const killMsg = this.isOwnerLang ? '💀 Lahkusid lahingualalt ja hukkusid!' : '💀 Eliminated for leaving battlefield!';
                this.showToast(killMsg, '#ff4757');
            }
        } else {
            this.isOutOfBounds = false;
            this.outOfBoundsTimer = 5.0;
            if (overlay) overlay.style.display = 'none';
        }
    }

    private spawnCrashParticle(pos: THREE.Vector3) {
        const isFire = Math.random() < 0.45;
        const pGeo = new THREE.SphereGeometry(isFire ? 0.8 : 1.4, 6, 6);
        const pMat = new THREE.MeshBasicMaterial({
            color: isFire ? (Math.random() < 0.5 ? 0xff4757 : 0xffa502) : 0x1e272e,
            transparent: true,
            opacity: 0.85
        });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 2));
        this.scene.add(pMesh);

        this.particles.push({
            mesh: pMesh,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 6 + 2, (Math.random() - 0.5) * 6),
            life: 0.85,
            maxLife: 0.85,
            sizeStart: isFire ? 0.9 : 1.5,
            sizeEnd: isFire ? 0.2 : 3.0
        });
    }

    private updateCrashingUnits(dt: number) {
        this.units.forEach(unit => {
            if (unit.isCrashing && unit.crashVelocity && unit.crashRotationSpeed) {
                // Downward gravity acceleration
                unit.crashVelocity.y -= 22.0 * dt;
                unit.pos.addScaledVector(unit.crashVelocity, dt);
                unit.root.position.copy(unit.pos);

                unit.root.rotation.x += unit.crashRotationSpeed.x * dt;
                unit.root.rotation.y += unit.crashRotationSpeed.y * dt;
                unit.root.rotation.z += unit.crashRotationSpeed.z * dt;

                // Spawn continuous heavy smoke and crash flames
                this.spawnCrashParticle(unit.pos.clone());

                // Ground impact
                if (unit.pos.y <= 0.5) {
                    unit.pos.y = 0;
                    unit.isCrashing = false;
                    unit.isDead = true;
                    unit.root.visible = false;

                    // Fiery impact explosion
                    this.triggerSpreadingExplosion(unit.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), 18.0, 50, unit.id, unit.name, unit.team);
                    warAudio.playCannonShot();

                    unit.respawnTimer = 5.0;
                    if (unit.isLocalPlayer) this.showRespawnOverlay(5);
                }
            }
        });
    }

    private updatePlayer(dt: number) {
        if (this.isCountdownActive) {
            this.localUnit.speed = 0;
            return;
        }

        if (this.localUnit.isDead || this.localUnit.isCrashing) {
            if (this.localUnit.isDead && this.localUnit.respawnTimer > 0) {
                this.localUnit.respawnTimer -= dt;
                if (this.localUnit.respawnTimer <= 0) this.respawnUnit(this.localUnit);
            }
            return;
        }

        const isPlane = this.localClass === 'plane';
        const isTank = this.localClass === 'tank';

        if (isPlane) {
            const turnRate = 2.4;
            const maxSpeed = 36.0;
            const minSpeed = 18.0;
            const accel = 35.0;

            let steering = 0;
            if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
                this.localUnit.rotation += turnRate * dt;
                steering = 1;
            }
            if (this.keys['KeyD'] || this.keys['ArrowRight']) {
                this.localUnit.rotation -= turnRate * dt;
                steering = -1;
            }

            if (this.keys['KeyW'] || this.keys['ArrowUp']) {
                this.localUnit.speed = Math.min(maxSpeed, this.localUnit.speed + accel * dt);
            } else if (this.keys['KeyS'] || this.keys['ArrowDown']) {
                this.localUnit.speed = Math.max(minSpeed, this.localUnit.speed - accel * dt);
            } else {
                this.localUnit.speed = THREE.MathUtils.lerp(this.localUnit.speed, 28.0, dt * 2.0);
            }

            // Smooth Banking (Roll)
            const targetBank = steering * 0.55;
            this.localUnit.bankAngle = THREE.MathUtils.lerp(this.localUnit.bankAngle || 0, targetBank, dt * 7.0);

            const forward = new THREE.Vector3(Math.sin(this.localUnit.rotation), 0, Math.cos(this.localUnit.rotation));
            this.localUnit.pos.addScaledVector(forward, this.localUnit.speed * dt);
            this.localUnit.pos.y = 14.0;

            this.localUnit.pos.x = Math.max(-780, Math.min(780, this.localUnit.pos.x));
            this.localUnit.pos.z = Math.max(-780, Math.min(780, this.localUnit.pos.z));

            this.localUnit.root.position.copy(this.localUnit.pos);
            this.localUnit.root.rotation.set(0, this.localUnit.rotation, this.localUnit.bankAngle || 0, 'YXZ');

            // Spawn jet exhaust afterburner trails
            if (Math.random() < 0.75) {
                const exhaustLeft = new THREE.Vector3(-0.65, 0, -4.2).applyEuler(this.localUnit.root.rotation).add(this.localUnit.pos);
                const exhaustRight = new THREE.Vector3(0.65, 0, -4.2).applyEuler(this.localUnit.root.rotation).add(this.localUnit.pos);
                for (const exPos of [exhaustLeft, exhaustRight]) {
                    const pMesh = new THREE.Mesh(
                        new THREE.SphereGeometry(0.35, 6, 6),
                        new THREE.MeshBasicMaterial({ color: this.localTeam === 'red' ? 0xff4757 : 0x00f2fe, transparent: true, opacity: 0.85 })
                    );
                    pMesh.position.copy(exPos);
                    this.scene.add(pMesh);
                    this.particles.push({
                        mesh: pMesh,
                        velocity: forward.clone().negate().multiplyScalar(12.0),
                        life: 0.35,
                        maxLife: 0.35,
                        sizeStart: 0.35,
                        sizeEnd: 0.05
                    });
                }
            }
        } else {
            const isTank = this.localClass === 'tank';
            const turnRate = isTank ? 2.2 : 4.0;
            const maxSpeed = isTank ? 16.0 : 19.0;
            const accel = isTank ? 35.0 : 50.0;
            const drag = 14.0;

            if (this.isSatelliteTargeting) {
                // Smooth WASD / Arrow key panning for satellite camera
                const panSpeed = 110.0;
                if (this.keys['KeyW'] || this.keys['ArrowUp']) this.satelliteCamCenter.z -= panSpeed * dt;
                if (this.keys['KeyS'] || this.keys['ArrowDown']) this.satelliteCamCenter.z += panSpeed * dt;
                if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.satelliteCamCenter.x -= panSpeed * dt;
                if (this.keys['KeyD'] || this.keys['ArrowRight']) this.satelliteCamCenter.x += panSpeed * dt;
                this.satelliteCamCenter.x = THREE.MathUtils.clamp(this.satelliteCamCenter.x, -240, 240);
                this.satelliteCamCenter.z = THREE.MathUtils.clamp(this.satelliteCamCenter.z, -360, 360);
            } else {
                if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.localUnit.rotation += turnRate * dt;
                if (this.keys['KeyD'] || this.keys['ArrowRight']) this.localUnit.rotation -= turnRate * dt;

                if (this.keys['KeyW'] || this.keys['ArrowUp']) {
                    this.localUnit.speed = Math.min(maxSpeed, this.localUnit.speed + accel * dt);
                } else if (this.keys['KeyS'] || this.keys['ArrowDown']) {
                    this.localUnit.speed = Math.max(-maxSpeed * 0.6, this.localUnit.speed - accel * dt);
                } else {
                    if (this.localUnit.speed > 0) this.localUnit.speed = Math.max(0, this.localUnit.speed - drag * dt);
                    else if (this.localUnit.speed < 0) this.localUnit.speed = Math.min(0, this.localUnit.speed + drag * dt);
                }
            }

            const forward = new THREE.Vector3(Math.sin(this.localUnit.rotation), 0, Math.cos(this.localUnit.rotation));
            this.localUnit.pos.addScaledVector(forward, this.localUnit.speed * dt);

            // Block player from passing through buildings, houses, forts & barricades
            this.resolveObstacleCollisions(this.localUnit.pos, isTank ? 3.2 : 1.4);

            this.localUnit.pos.x = Math.max(-780, Math.min(780, this.localUnit.pos.x));
            this.localUnit.pos.z = Math.max(-780, Math.min(780, this.localUnit.pos.z));

            this.localUnit.root.position.copy(this.localUnit.pos);
            this.localUnit.root.rotation.y = this.localUnit.rotation;

            // Soldier leg walking anim
            if (!isTank && this.localUnit.leftLeg && this.localUnit.rightLeg) {
                if (Math.abs(this.localUnit.speed) > 1) {
                    this.localUnit.walkCycle = (this.localUnit.walkCycle || 0) + 14 * dt;
                    this.localUnit.leftLeg.rotation.x = Math.sin(this.localUnit.walkCycle) * 0.6;
                    this.localUnit.rightLeg.rotation.x = -Math.sin(this.localUnit.walkCycle) * 0.6;
                } else {
                    this.localUnit.leftLeg.rotation.x = 0;
                    this.localUnit.rightLeg.rotation.x = 0;
                }
            }
        }

        // Turret / Weapon Aiming
        this.raycaster.setFromCamera(this.mouseScreenPos, this.camera);
        const intersect = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.groundPlane, intersect)) {
            this.mouseAimTarget.copy(intersect);

            if (this.airstrikeReticleMesh && this.isAirstrikeTargeting) {
                this.airstrikeReticleMesh.position.copy(intersect);
                this.airstrikeReticleMesh.position.y = 0.2;
                this.airstrikeReticleMesh.rotation.y += 1.8 * dt;
            }

            if (this.satelliteReticleMesh && this.isSatelliteTargeting) {
                this.satelliteReticleMesh.position.copy(intersect);
                this.satelliteReticleMesh.position.y = 0.2;
                this.satelliteReticleMesh.rotation.y += 1.2 * dt;
                const coordsEl = document.getElementById('sat-coords-text');
                if (coordsEl) {
                    coordsEl.innerText = `COORD: X: ${intersect.x.toFixed(1)} | Z: ${intersect.z.toFixed(1)}`;
                }
            }

            if (this.localUnit.turret) {
                const localAim = this.localUnit.root.worldToLocal(intersect.clone());
                const targetAngle = Math.atan2(localAim.x, localAim.z);
                let diff = targetAngle - (this.localUnit.turretAngle || 0);
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.localUnit.turretAngle = (this.localUnit.turretAngle || 0) + diff * Math.min(1.0, 14.0 * dt);
                this.localUnit.turret.rotation.y = this.localUnit.turretAngle;
            }
        }

        if (this.primaryReloadTimer > 0) this.primaryReloadTimer = Math.max(0, this.primaryReloadTimer - dt);
        if (this.secondaryReloadTimer > 0) this.secondaryReloadTimer = Math.max(0, this.secondaryReloadTimer - dt);
        if (this.airstrikeCooldown > 0) this.airstrikeCooldown = Math.max(0, this.airstrikeCooldown - dt);
        if (this.missileCooldown > 0) {
            this.missileCooldown = Math.max(0, this.missileCooldown - dt);
            const cdMissileEl = document.getElementById('cooldown-missile') || document.getElementById('cost-missile');
            if (cdMissileEl) {
                cdMissileEl.innerText = this.missileCooldown > 0
                    ? `${Math.ceil(this.missileCooldown)}s`
                    : (this.isOwnerLang ? 'VALMIS' : 'READY');
                cdMissileEl.style.color = this.missileCooldown > 0 ? '#ffd32a' : '#2ed573';
            }
        }
        if (this.nukeTimer > 0) {
            this.nukeTimer = Math.max(0, this.nukeTimer - dt);
            const timerNukeEl = document.getElementById('timer-nuke');
            if (timerNukeEl) {
                timerNukeEl.innerText = this.nukeTimer > 0
                    ? `${Math.ceil(this.nukeTimer)}s`
                    : (this.isOwnerLang ? 'VALMIS' : 'READY');
                timerNukeEl.style.color = this.nukeTimer > 0 ? '#ffd32a' : '#2ed573';
            }
        }

        // Continuous Auto-Fire for MG / Vulcan when holding mouse or Space
        if ((this.isMouseDown || this.keys['Space']) && !this.localUnit.isDead && !this.isMatchEnded) {
            if (this.activeWeapon === 'mg' && this.localClass === 'tank' && this.secondaryReloadTimer <= 0) {
                this.fireMachineGunWeapon();
            } else if (this.activeWeapon === 'cannon' && (this.localClass === 'soldier' || this.localClass === 'plane') && this.primaryReloadTimer <= 0) {
                this.fireCannonWeapon();
            }
        }
    }

    private updateBots(dt: number) {
        if (this.isCountdownActive) return;

        this.units.forEach(unit => {
            if (unit.isLocalPlayer || !unit.isBot) return;

            if (unit.isDead) {
                if (unit.respawnTimer > 0) {
                    unit.respawnTimer -= dt;
                    if (unit.respawnTimer <= 0) this.respawnUnit(unit);
                }
                return;
            }

            // Find closest enemy
            let closestEnemy: CombatUnit | null = null;
            let minDist = 9999;
            this.units.forEach(other => {
                if (!other.isDead && other.team !== unit.team) {
                    const dist = unit.pos.distanceTo(other.pos);
                    if (dist < minDist) {
                        minDist = dist;
                        closestEnemy = other;
                    }
                }
            });

            const isTank = unit.unitClass === 'tank';
            const maxSpeed = isTank ? 11.0 : 13.0;

            if (closestEnemy) {
                const targetPos = (closestEnemy as CombatUnit).pos;
                const dx = targetPos.x - unit.pos.x;
                const dz = targetPos.z - unit.pos.z;
                const desiredAngle = Math.atan2(dx, dz);

                let diff = desiredAngle - unit.rotation;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                unit.rotation += diff * Math.min(1.0, 3.5 * dt);

                let sepX = 0;
                let sepZ = 0;
                this.units.forEach(other => {
                    if (other.id !== unit.id && !other.isDead) {
                        const d = unit.pos.distanceTo(other.pos);
                        if (d < 18.0 && d > 0.001) {
                            const push = (18.0 - d) / 18.0;
                            sepX += ((unit.pos.x - other.pos.x) / d) * push * 16.0;
                            sepZ += ((unit.pos.z - other.pos.z) / d) * push * 16.0;
                        }
                    }
                });

                let moveSpeed = 0;
                if (minDist > 30) moveSpeed = maxSpeed;
                else if (minDist < 16) moveSpeed = -maxSpeed * 0.4;
                else moveSpeed = maxSpeed * 0.35;

                const forward = new THREE.Vector3(Math.sin(unit.rotation), 0, Math.cos(unit.rotation));
                unit.pos.addScaledVector(forward, moveSpeed * dt);
                unit.pos.x += sepX * dt;
                unit.pos.z += sepZ * dt;

                // Resolve bot building obstacle collisions
                this.resolveObstacleCollisions(unit.pos, isTank ? 3.2 : 1.4);

                unit.pos.x = Math.max(-780, Math.min(780, unit.pos.x));
                unit.pos.z = Math.max(-780, Math.min(780, unit.pos.z));

                unit.root.position.copy(unit.pos);
                unit.root.rotation.y = unit.rotation;

                // Soldier leg walking anim
                if (!isTank && unit.leftLeg && unit.rightLeg) {
                    if (Math.abs(moveSpeed) > 1) {
                        unit.walkCycle = (unit.walkCycle || 0) + 12 * dt;
                        unit.leftLeg.rotation.x = Math.sin(unit.walkCycle) * 0.5;
                        unit.rightLeg.rotation.x = -Math.sin(unit.walkCycle) * 0.5;
                    } else {
                        unit.leftLeg.rotation.x = 0;
                        unit.rightLeg.rotation.x = 0;
                    }
                }

                // Aim Turret at enemy
                if (unit.turret) {
                    const localAim = unit.root.worldToLocal(targetPos.clone());
                    const aimAngle = Math.atan2(localAim.x, localAim.z);
                    unit.turret.rotation.y = aimAngle;
                }

                // AI Attack
                unit.reloadTimer -= dt;
                if (unit.reloadTimer <= 0 && minDist < 160) {
                    unit.reloadTimer = isTank ? 2.6 + Math.random() * 1.5 : 1.2 + Math.random() * 1.0;
                    const fromPos = unit.pos.clone().add(new THREE.Vector3(0, isTank ? 2.5 : 1.4, 0));
                    const spread = (Math.random() - 0.5) * 0.12;
                    const dir = new THREE.Vector3().subVectors(targetPos, fromPos).normalize();
                    dir.x += spread;
                    dir.z += spread;
                    this.spawnProjectile(unit.id, unit.name, unit.team, fromPos, dir, isTank, isTank);
                }
            }
        });
    }

    private resolveObstacleCollisions(pos: THREE.Vector3, unitRadius: number) {
        for (const obs of this.obstacles) {
            if (obs.height < pos.y) continue;

            if (obs.type === 'box' && obs.minX !== undefined && obs.maxX !== undefined && obs.minZ !== undefined && obs.maxZ !== undefined) {
                const closestX = Math.max(obs.minX, Math.min(obs.maxX, pos.x));
                const closestZ = Math.max(obs.minZ, Math.min(obs.maxZ, pos.z));

                const dx = pos.x - closestX;
                const dz = pos.z - closestZ;
                const distSq = dx * dx + dz * dz;

                if (distSq < unitRadius * unitRadius) {
                    const dist = Math.sqrt(distSq);
                    if (dist > 0.0001) {
                        const overlap = unitRadius - dist;
                        pos.x += (dx / dist) * overlap;
                        pos.z += (dz / dist) * overlap;
                    } else {
                        // Inside box - push out along shortest axis
                        const dLeft = Math.abs(pos.x - obs.minX);
                        const dRight = Math.abs(pos.x - obs.maxX);
                        const dTop = Math.abs(pos.z - obs.minZ);
                        const dBottom = Math.abs(pos.z - obs.maxZ);
                        const minD = Math.min(dLeft, dRight, dTop, dBottom);
                        if (minD === dLeft) pos.x = obs.minX - unitRadius;
                        else if (minD === dRight) pos.x = obs.maxX + unitRadius;
                        else if (minD === dTop) pos.z = obs.minZ - unitRadius;
                        else pos.z = obs.maxZ + unitRadius;
                    }
                }
            } else if (obs.type === 'circle' && obs.centerX !== undefined && obs.centerZ !== undefined && obs.radius !== undefined) {
                const dx = pos.x - obs.centerX;
                const dz = pos.z - obs.centerZ;
                const minDist = obs.radius + unitRadius;
                const distSq = dx * dx + dz * dz;

                if (distSq < minDist * minDist) {
                    const dist = Math.sqrt(distSq);
                    if (dist > 0.0001) {
                        const overlap = minDist - dist;
                        pos.x += (dx / dist) * overlap;
                        pos.z += (dz / dist) * overlap;
                    } else {
                        pos.x += minDist;
                    }
                }
            }
        }
    }

    private checkObstacleProjectileHit(pos: THREE.Vector3): boolean {
        for (const obs of this.obstacles) {
            if (pos.y > obs.height) continue;
            if (obs.type === 'box' && obs.minX !== undefined && obs.maxX !== undefined && obs.minZ !== undefined && obs.maxZ !== undefined) {
                if (pos.x >= obs.minX && pos.x <= obs.maxX && pos.z >= obs.minZ && pos.z <= obs.maxZ) {
                    return true;
                }
            } else if (obs.type === 'circle' && obs.centerX !== undefined && obs.centerZ !== undefined && obs.radius !== undefined) {
                const dx = pos.x - obs.centerX;
                const dz = pos.z - obs.centerZ;
                if (dx * dx + dz * dz <= obs.radius * obs.radius) {
                    return true;
                }
            }
        }
        return false;
    }

    private updateProjectiles(dt: number) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.life -= dt;

            if (p.isGrenade && p.gravity) {
                p.velocity.y -= p.gravity * dt;
                if (p.tumbleSpeed) {
                    p.mesh.rotation.x += p.tumbleSpeed.x * dt;
                    p.mesh.rotation.y += p.tumbleSpeed.y * dt;
                    p.mesh.rotation.z += p.tumbleSpeed.z * dt;
                }
            }

            p.mesh.position.addScaledVector(p.velocity, dt);

            // Ground hit
            const groundHit = p.isGrenade ? p.mesh.position.y <= 0.3 : p.mesh.position.y <= 0.1;
            if (p.life <= 0 || groundHit) {
                if (p.isExplosive) {
                    this.triggerSpreadingExplosion(p.mesh.position, p.explosionRadius, p.damage, p.shooterId, p.shooterName, p.team);
                    warAudio.playExplosion();
                }
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
                continue;
            }

            // Building / House Obstacle Impact Detection
            if (this.checkObstacleProjectileHit(p.mesh.position)) {
                if (p.isExplosive) {
                    this.triggerSpreadingExplosion(p.mesh.position, p.explosionRadius, p.damage, p.shooterId, p.shooterName, p.team);
                    warAudio.playExplosion();
                } else {
                    this.spawnCrashParticle(p.mesh.position);
                    warAudio.playHit();
                }
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
                continue;
            }

            // Direct Unit Impact Detection
            for (const [id, unit] of this.units) {
                if (unit.isDead || unit.team === p.team || id === p.shooterId) continue;

                const hitboxRadius = unit.unitClass === 'plane' ? 4.5 : (unit.unitClass === 'tank' ? 3.0 : 1.2);
                if (p.mesh.position.distanceTo(unit.pos) < hitboxRadius) {
                    if (p.isExplosive) {
                        this.triggerSpreadingExplosion(p.mesh.position, p.explosionRadius, p.damage, p.shooterId, p.shooterName, p.team);
                        warAudio.playExplosion();
                    } else {
                        this.damageUnit(unit, p.damage, p.shooterId, p.shooterName, p.team);
                    }
                    this.scene.remove(p.mesh);
                    this.projectiles.splice(i, 1);
                    break;
                }
            }
        }
    }

    private updateShockwaves(dt: number) {
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.life -= dt;
            sw.currentRadius += sw.expansionSpeed * dt;

            // Update Shockwave visual mesh scale & fade
            const scale = sw.currentRadius;
            sw.mesh.scale.set(scale, scale, scale);
            const fade = Math.max(0, sw.life / sw.maxLife);
            (sw.mesh.material as THREE.MeshBasicMaterial).opacity = fade * 0.9;

            // Damage units caught in the expanding blast wave
            this.units.forEach(unit => {
                if (!unit.isDead && unit.team !== sw.team && !sw.damagedUnits.has(unit.id)) {
                    const dist = unit.pos.distanceTo(sw.epicenter);
                    if (dist <= sw.currentRadius) {
                        sw.damagedUnits.add(unit.id);
                        // Damage falls off slightly with distance
                        const falloff = Math.max(0.3, 1.0 - (dist / sw.maxRadius));
                        const actualDmg = Math.round(sw.damage * falloff);
                        this.damageUnit(unit, actualDmg, sw.shooterId, sw.shooterName, sw.team);
                    }
                }
            });

            if (sw.life <= 0 || sw.currentRadius >= sw.maxRadius) {
                this.scene.remove(sw.mesh);
                this.shockwaves.splice(i, 1);
            }
        }
    }

    private updateParticles(dt: number) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
                continue;
            }

            if (p.gravity) {
                p.velocity.y -= p.gravity * dt;
            }
            if (p.drag) {
                p.velocity.multiplyScalar(Math.max(0, 1 - p.drag * dt));
            }

            p.mesh.position.addScaledVector(p.velocity, dt);

            if (p.rotSpeed) {
                p.mesh.rotation.x += p.rotSpeed.x * dt;
                p.mesh.rotation.y += p.rotSpeed.y * dt;
                p.mesh.rotation.z += p.rotSpeed.z * dt;
            }

            const progress = 1.0 - (p.life / p.maxLife);
            const curSize = THREE.MathUtils.lerp(p.sizeStart, p.sizeEnd, progress);
            p.mesh.scale.set(curSize, curSize, curSize);

            const mat = p.mesh.material as THREE.MeshBasicMaterial;
            if (mat) {
                if (p.startColor && p.endColor) {
                    mat.color.copy(p.startColor).lerp(p.endColor, progress);
                }
                if (p.fadeOpacity !== false) {
                    mat.opacity = Math.max(0, p.life / p.maxLife);
                }
            }
        }
    }

    private updateCamera() {
        if (!this.localUnit) return;

        // Tactical Satellite & Drone Overhead Targeting Camera View
        if (this.isSatelliteTargeting) {
            const targetCam = new THREE.Vector3(this.satelliteCamCenter.x, 90, this.satelliteCamCenter.z + 10);
            this.camera.position.lerp(targetCam, 0.2);
            this.camera.lookAt(new THREE.Vector3(this.satelliteCamCenter.x, 0, this.satelliteCamCenter.z));
            return;
        }

        // If local player died, elevate and pullback camera to clearly view the explosion and carnage
        if (this.localUnit.isDead && this.lastDeathPos) {
            const deathCamTarget = this.lastDeathPos.clone().add(new THREE.Vector3(0, 16.0, -22.0));
            this.camera.position.lerp(deathCamTarget, 0.08);
            this.camera.lookAt(this.lastDeathPos.clone().add(new THREE.Vector3(0, 1.5, 0)));
            return;
        }

        const isPlane = this.localClass === 'plane';
        const isTank = this.localClass === 'tank';
        const dist = isPlane ? 32 : (isTank ? 22 : 12);
        const height = isPlane ? 14 : (isTank ? 12 : 6.5);

        const offset = new THREE.Vector3(
            -Math.sin(this.localUnit.rotation) * dist,
            height,
            -Math.cos(this.localUnit.rotation) * dist
        );
        const targetCam = this.localUnit.pos.clone().add(offset);
        this.camera.position.lerp(targetCam, isPlane ? 0.18 : 0.14);
        this.camera.lookAt(this.localUnit.pos.clone().add(new THREE.Vector3(0, isPlane ? -2.0 : (isTank ? 2.5 : 1.6), 0)));
    }
}

// Initialise
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new WarGameEngine());
} else {
    new WarGameEngine();
}
