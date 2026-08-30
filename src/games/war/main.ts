import * as THREE from 'three';
import { supabase } from '../../lib/supabase';
import { getCurrentUserProfile, isUserAdminEmail } from '../../auth';
import { yardService } from '../../shared/yardService';
import { warAudio } from './audio';
import { WarMultiplayerNetwork, MultiplayerEvent } from './multiplayer';

// --- Types & Interfaces ---
type Team = 'red' | 'blue';
type UnitClass = 'tank' | 'soldier';

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
    walkCycle?: number;
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
}

interface ExplosiveBarrel {
    mesh: THREE.Mesh;
    pos: THREE.Vector3;
    hp: number;
    isExploded: boolean;
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
    private mgAmmo = 500;
    private primaryReloadTime = 1.2;
    private primaryReloadTimer = 0;
    private secondaryReloadTimer = 0;
    private airstrikeCooldown = 0;
    private myKills = 0;
    private warMoney = parseInt(localStorage.getItem('playard_war_game_money') || '0', 10);
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

    private clock = new THREE.Clock();

    constructor() {
        this.container = document.getElementById('canvas-container') || document.body;
        this.init();
    }

    private async init() {
        this.checkAuthorization();
        this.setupLocalIdentity();
        await this.loadUserDataFromDb();
        this.setupScene();
        this.buildBattlefield();
        this.setupDeployModal();
        this.setupUI();
        this.setupInputListeners();
        this.initMultiplayer();

        window.addEventListener('beforeunload', () => this.saveUserDataToDb());

        this.clock.start();
        this.animate();
    }

    private async loadUserDataFromDb() {
        const prof = getCurrentUserProfile();
        const userId = prof?.id || this.localPlayerId;
        const storageKey = `playard_war_data_${userId}`;

        const localData = localStorage.getItem(storageKey) || localStorage.getItem('playard_war_game_money');
        if (localData) {
            try {
                if (localData.startsWith('{')) {
                    const parsed = JSON.parse(localData);
                    if (parsed.money !== undefined) this.warMoney = parsed.money;
                } else {
                    const num = parseInt(localData, 10);
                    if (!isNaN(num)) this.warMoney = num;
                }
            } catch (e) {}
        }

        if (supabase && prof && prof.id) {
            try {
                const { data } = await supabase
                    .from('war_game_stats')
                    .select('money, kills, matches_won')
                    .eq('user_id', prof.id)
                    .single();

                if (data && data.money !== undefined) {
                    this.warMoney = Math.max(this.warMoney, data.money);
                }
            } catch (e) {
                console.warn('War DB load note:', e);
            }
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
            kills: this.myKills,
            updated_at: new Date().toISOString()
        };

        // 1. Local storage persistence
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        localStorage.setItem('playard_war_game_money', this.warMoney.toString());

        // 2. Cloud Database persistence in Supabase
        if (supabase && prof && prof.id) {
            try {
                await supabase
                    .from('war_game_stats')
                    .upsert({
                        user_id: prof.id,
                        username: prof.username || this.localUsername,
                        money: this.warMoney,
                        kills: this.myKills,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });
            } catch (e) {
                console.warn('War Game DB save note:', e);
            }
        }
    }

    private checkAuthorization() {
        const prof = getCurrentUserProfile();
        const email = prof?.email;
        const isAuthorized = isUserAdminEmail(email) || (typeof window !== 'undefined' && (window as any).__PLAYARD_TEST_MODE__);

        const vipOverlay = document.getElementById('vip-restricted-overlay');
        if (!isAuthorized && vipOverlay) {
            vipOverlay.style.display = 'flex';
        } else if (vipOverlay) {
            vipOverlay.style.display = 'none';
        }
    }

    private setupLocalIdentity() {
        const prof = getCurrentUserProfile();
        if (prof) {
            this.localUsername = prof.displayName || prof.username || 'Commander';
            if (prof.id) this.localPlayerId = prof.id;
        }
    }

    private setupDeployModal() {
        const deployModal = document.getElementById('modal-deploy-selection');
        const btnBlue = document.getElementById('btn-select-blue');
        const btnRed = document.getElementById('btn-select-red');
        const btnTank = document.getElementById('btn-select-tank');
        const btnHuman = document.getElementById('btn-select-human');
        const btnConfirm = document.getElementById('btn-confirm-deploy');

        let chosenTeam: Team = 'blue';
        let chosenClass: UnitClass = 'tank';

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
        });

        btnHuman?.addEventListener('click', () => {
            chosenClass = 'soldier';
            btnHuman.className = 'select-box selected-class';
            btnTank!.className = 'select-box';
        });

        btnConfirm?.addEventListener('click', () => {
            this.localTeam = chosenTeam;
            this.localClass = chosenClass;
            if (deployModal) deployModal.style.display = 'none';
            this.deployLocalUnit();
            this.spawnBattleRoster();
            this.updateTeamBadge();
            this.network?.updateIdentity(this.localTeam, this.localClass);
            this.showToast(`🚀 Sisened lahingusse: War Server #1 (${this.localTeam.toUpperCase()} ${this.localClass === 'tank' ? 'TANK' : 'SÕDUR'})`, this.localTeam === 'red' ? '#ff4757' : '#00f2fe');
        });

        // Open loadout change button in navbar
        document.getElementById('btn-open-loadout')?.addEventListener('click', () => {
            if (deployModal) deployModal.style.display = 'flex';
        });

        // Default initial spawn
        this.deployLocalUnit();
        this.spawnBattleRoster();
        this.updateTeamBadge();
    }

    private showToast(message: string, color = '#2ecc71') {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.top = '70px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = 'rgba(10, 15, 25, 0.9)';
        toast.style.border = `1.5px solid ${color}`;
        toast.style.color = '#ffffff';
        toast.style.padding = '10px 22px';
        toast.style.borderRadius = '30px';
        toast.style.fontWeight = 'bold';
        toast.style.fontSize = '0.92rem';
        toast.style.zIndex = '3000';
        toast.style.boxShadow = `0 4px 20px ${color}44`;
        toast.style.backdropFilter = 'blur(8px)';
        toast.style.transition = 'all 0.3s ease';
        toast.innerText = message;
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

        const roleIcon = this.localClass === 'tank' ? '🏎️ TANK' : '🏃 INIMENE (SÕDUR)';
        if (badge && nameEl) {
            if (this.localTeam === 'red') {
                badge.className = 'team-red';
                badge.style.borderColor = '#e74c3c';
                nameEl.innerText = `🔴 RED TEAM · ${roleIcon} · ${this.localUsername}`;
            } else {
                badge.className = 'team-blue';
                badge.style.borderColor = '#3498db';
                nameEl.innerText = `🔵 BLUE TEAM · ${roleIcon} · ${this.localUsername}`;
            }
        }

        if (hpLabel) hpLabel.innerText = this.localClass === 'tank' ? '🛡️ SOOMUS (HP)' : '❤️ ELUD (HP)';
        if (weapon1Name && weapon1Icon) {
            weapon1Name.innerText = this.localClass === 'tank' ? 'KAHUR' : 'AUTOMAAT';
            weapon1Icon.innerText = this.localClass === 'tank' ? '🚀' : '🔫';
        }
        if (weapon2Name && weapon2Icon) {
            weapon2Name.innerText = this.localClass === 'tank' ? 'MG-42' : 'GRANAAT';
            weapon2Icon.innerText = this.localClass === 'tank' ? '🔫' : '💣';
        }
    }

    // --- Scene Setup ---
    private setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x090e17);
        this.scene.fog = new THREE.FogExp2(0x090e17, 0.007);

        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 1000);
        this.camera.position.set(0, 16, -26);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xdce7f0, 0.75);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xfffaed, 1.25);
        sunLight.position.set(70, 140, 90);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        this.scene.add(sunLight);

        this.radarCanvas = document.getElementById('radar-canvas') as HTMLCanvasElement;
        if (this.radarCanvas) this.radarCtx = this.radarCanvas.getContext('2d');
    }

    // --- Battlefield Map & Explosive Barrels (2x Larger Map: 840x840) ---
    private buildBattlefield() {
        const groundGeo = new THREE.PlaneGeometry(840, 840, 60, 60);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x1f271c, roughness: 0.9, metalness: 0.1 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const grid = new THREE.GridHelper(800, 40, 0x3d4a36, 0x171d15);
        grid.position.y = 0.05;
        this.scene.add(grid);

        this.createBaseStation(new THREE.Vector3(0, 0, 270), 'red');
        this.createBaseStation(new THREE.Vector3(0, 0, -270), 'blue');

        this.createMilitaryFort(new THREE.Vector3(0, 0, 0));
        this.createMilitaryFort(new THREE.Vector3(130, 0, 90));
        this.createMilitaryFort(new THREE.Vector3(-130, 0, -90));
        this.createMilitaryFort(new THREE.Vector3(-130, 0, 90));
        this.createMilitaryFort(new THREE.Vector3(130, 0, -90));
        this.createMilitaryFort(new THREE.Vector3(0, 0, 135));
        this.createMilitaryFort(new THREE.Vector3(0, 0, -135));

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

        const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.5, 16, 8), baseMat);
        tower.position.set(team === 'red' ? 28 : -28, 8, 0);
        tower.castShadow = true;
        group.add(tower);

        this.scene.add(group);
    }

    private createMilitaryFort(pos: THREE.Vector3) {
        const group = new THREE.Group();
        group.position.copy(pos);
        const bunkerMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
        const bunker = new THREE.Mesh(new THREE.BoxGeometry(20, 7, 20), bunkerMat);
        bunker.position.y = 3.5;
        bunker.castShadow = true;
        bunker.receiveShadow = true;
        group.add(bunker);
        this.scene.add(group);
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

    // --- Unit Deployment & Roster (10v10 Battle) ---
    private deployLocalUnit() {
        if (this.localUnit) {
            this.scene.remove(this.localUnit.root);
            this.units.delete(this.localPlayerId);
        }

        const spawnZ = this.localTeam === 'red' ? 260 : -260;
        const rot = this.localTeam === 'red' ? Math.PI : 0;
        const pos = new THREE.Vector3(0, 0, spawnZ);

        if (this.localClass === 'tank') {
            this.localUnit = this.createTank(this.localPlayerId, this.localUsername, this.localTeam, true, false, pos, rot);
            this.primaryReloadTime = 1.2;
        } else {
            this.localUnit = this.createSoldier(this.localPlayerId, this.localUsername, this.localTeam, true, false, pos, rot);
            this.primaryReloadTime = 0.12; // Fast rifle fire
        }

        this.units.set(this.localPlayerId, this.localUnit);
        this.updateHUD();
    }

    private spawnBattleRoster() {
        // Clear all previous AI units
        this.units.forEach((u, id) => {
            if (u.isBot) {
                this.scene.remove(u.root);
                this.units.delete(id);
            }
        });

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
            const u = entry.class === 'tank'
                ? this.createTank(id, entry.name, 'red', false, true, pos, Math.PI)
                : this.createSoldier(id, entry.name, 'red', false, true, pos, Math.PI);
            this.units.set(id, u);
        });
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
                    this.showToast(`👥 ${event.payload.name || 'Uus mängija'} liitus serveriga!`, event.payload.team === 'red' ? '#ff4757' : '#00f2fe');
                    this.spawnBattleRoster();
                } else if (event.type === 'player_leave') {
                    const unit = this.units.get(event.payload.id);
                    if (unit) {
                        this.showToast(`🚪 ${unit.name} lahkus serverist`, '#a4b0be');
                        this.scene.remove(unit.root);
                        this.units.delete(event.payload.id);
                    }
                    this.spawnBattleRoster();
                }
            },
            (statusText: string, onlineCount: number) => {
                this.connectedHumanCount = onlineCount;
                const serverEl = document.getElementById('server-players-count');
                if (serverEl) {
                    serverEl.innerText = `${Math.min(20, this.connectedHumanCount)} / 20 Mängijat (10v10 Lahing)`;
                }
                this.spawnBattleRoster();
            }
        );
    }

    private onRemotePlayerState(payload: any) {
        if (!payload || payload.id === this.localPlayerId) return;

        let remote = this.units.get(payload.id);
        if (!remote) {
            remote = payload.unitClass === 'tank'
                ? this.createTank(payload.id, payload.name, payload.team, false, false, new THREE.Vector3(payload.x, 0, payload.z), payload.rot)
                : this.createSoldier(payload.id, payload.name, payload.team, false, false, new THREE.Vector3(payload.x, 0, payload.z), payload.rot);
            this.units.set(payload.id, remote);
        }

        remote.pos.set(payload.x, 0, payload.z);
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
    private activeWeapon: 'cannon' | 'mg' | 'airstrike' = 'cannon';
    private isMouseDown = false;

    private setupInputListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Digit1') this.selectWeapon('cannon');
            if (e.code === 'Digit2') this.selectWeapon('mg');
            if (e.code === 'Digit3' || e.code === 'KeyF') this.selectWeapon('airstrike');
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
                // Secondary action: alternate fire
                if (this.activeWeapon === 'cannon') this.selectWeapon('mg');
                else this.selectWeapon('cannon');
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

        document.getElementById('btn-restart-match')?.addEventListener('click', () => {
            const matchModal = document.getElementById('match-end-modal');
            if (matchModal) matchModal.style.display = 'none';
            this.isMatchEnded = false;
            this.redScore = 0;
            this.blueScore = 0;
            this.updateHUD();
        });
    }

    private selectWeapon(type: 'cannon' | 'mg' | 'airstrike') {
        this.activeWeapon = type;
        document.querySelectorAll('.weapon-card').forEach(c => c.classList.remove('active'));
        document.getElementById(`weapon-${type}`)?.classList.add('active');

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

    private fireCannonWeapon() {
        if (this.primaryReloadTimer > 0 || this.localUnit.isDead || this.isMatchEnded) return;
        this.primaryReloadTimer = this.primaryReloadTime;

        if (this.localClass === 'tank') {
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
                fromX: this.localUnit.pos.x, fromY: 1.5, fromZ: this.localUnit.pos.z,
                dirX: this.mouseAimTarget.x, dirY: 0, dirZ: this.mouseAimTarget.z,
                isExplosive: this.localClass === 'tank',
                isCannon: this.localClass === 'tank'
            }
        });
    }

    private fireMachineGunWeapon() {
        if (this.localUnit.isDead || this.isMatchEnded) return;

        if (this.localClass === 'tank') {
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

        // 1. Spreading Shockwave Visual Ring
        const ringGeo = new THREE.RingGeometry(0.2, 1.2, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: team === 'red' ? 0xff4757 : 0xffa502,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
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
            expansionSpeed: 28.0, // expands fast outwards
            life: 0.6,
            maxLife: 0.6,
            damage: baseDamage,
            shooterId,
            shooterName,
            team,
            epicenter: epicenter.clone(),
            damagedUnits: new Set()
        });

        // 2. Fire Burst Particles
        for (let i = 0; i < 28; i++) {
            const size = 0.4 + Math.random() * 0.9;
            const geo = new THREE.DodecahedronGeometry(size);
            const mat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.35 ? 0xff4757 : 0xffa502, transparent: true, opacity: 0.95 });
            const pMesh = new THREE.Mesh(geo, mat);
            pMesh.position.copy(epicenter);

            const speed = 8 + Math.random() * 26;
            const dir = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.8 + 0.2, (Math.random() - 0.5) * 2).normalize();

            this.scene.add(pMesh);
            this.particles.push({
                mesh: pMesh,
                velocity: dir.multiplyScalar(speed),
                life: 0.7 + Math.random() * 0.5,
                maxLife: 0.7 + Math.random() * 0.5,
                sizeStart: size,
                sizeEnd: 0.1
            });
        }

        // 3. Chain Reaction on Barrels
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
            victim.isDead = true;
            victim.root.visible = false;
            this.triggerSpreadingExplosion(victim.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), 12.0, 30, attackerId, attackerName, attackerTeam);
            this.handleKill(attackerId, attackerName, attackerTeam, victim.id, victim.name, victim.team);
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
        if (victim) {
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
        unit.hp = unit.maxHp;
        unit.root.visible = true;

        const spawnX = (Math.random() - 0.5) * 120;
        const spawnZ = unit.team === 'red' ? 260 + Math.random() * 15 : -260 - Math.random() * 15;
        unit.pos.set(spawnX, 0, spawnZ);
        unit.root.position.copy(unit.pos);
        unit.rotation = unit.team === 'red' ? Math.PI : 0;
        unit.root.rotation.y = unit.rotation;

        this.updateNameTag(unit.nameTagCanvas, unit.name, unit.team, unit.hp, unit.maxHp);
        (unit.nameTagSprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
        this.updateHUD();
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
                title.innerText = 'VÕIT!';
                title.style.color = '#ffd32a';
                desc.innerText = `Sinu ${this.localTeam.toUpperCase()} tiim saavutas 100 tapmist ja kindlustas lahinguvälja võidu!`;
            } else {
                if (icon) icon.innerText = '⚔️';
                title.innerText = 'KAOTUS!';
                title.style.color = '#ff4757';
                desc.innerText = `Vastaste ${winningTeam.toUpperCase()} tiim jõudis 100 tapmiseni esimesena.`;
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
                    reloadText.innerText = 'VALMIS';
                    reloadBar.style.width = '100%';
                }
            } else if (this.activeWeapon === 'mg') {
                if (this.localClass === 'soldier') {
                    if (this.secondaryReloadTimer > 0) {
                        reloadText.innerText = `${this.secondaryReloadTimer.toFixed(1)}s`;
                        const pct = ((3.5 - this.secondaryReloadTimer) / 3.5) * 100;
                        reloadBar.style.width = `${pct}%`;
                    } else {
                        reloadText.innerText = 'GRANAAT VALMIS';
                        reloadBar.style.width = '100%';
                    }
                } else {
                    reloadText.innerText = this.mgAmmo > 0 ? `${this.mgAmmo} RDS` : 'TÜHI';
                    reloadBar.style.width = `${Math.max(0, (this.mgAmmo / 500) * 100)}%`;
                }
            } else if (this.activeWeapon === 'airstrike') {
                if (this.airstrikeCooldown > 0) {
                    reloadText.innerText = `${Math.ceil(this.airstrikeCooldown)}s`;
                    const pct = ((25.0 - this.airstrikeCooldown) / 25.0) * 100;
                    reloadBar.style.width = `${pct}%`;
                } else {
                    reloadText.innerText = this.isAirstrikeTargeting ? '📍 SIHI & KLÕPSA' : 'VALMIS';
                    reloadBar.style.width = '100%';
                }
            }
        }

        if (statKills) statKills.innerText = this.myKills.toString();
        if (statMoney) statMoney.innerText = this.warMoney.toLocaleString();
        if (ammoMg) ammoMg.innerText = this.localClass === 'tank' ? `${this.mgAmmo} rds` : '💣 Granaat';
        if (cdAirstrike) cdAirstrike.innerText = this.airstrikeCooldown > 0 ? `${Math.ceil(this.airstrikeCooldown)}s` : 'VALMIS';
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

        const mapMax = 320; // Maps -320..+320 world units to radar

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

        // Render all 20 units across battlefield
        this.units.forEach(unit => {
            if (unit.isDead) return;
            const rx = cx + (unit.pos.x / mapMax) * (r * 0.85);
            const ry = cy + (unit.pos.z / mapMax) * (r * 0.85);
            const distFromCenter = Math.hypot(rx - cx, ry - cy);

            if (unit.isLocalPlayer) {
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
                        // Enemy is swept by the radar line -> BEEP!
                        warAudio.playRadarBeep(2100, 0.35);
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
            this.updatePlayer(dt);
            this.updateBots(dt);
            this.updateProjectiles(dt);
            this.updateShockwaves(dt);
            this.updateParticles(dt);
            this.updateCamera();
            this.renderRadar(dt);
            this.broadcastState();
        }

        this.renderer.render(this.scene, this.camera);
    };

    private updatePlayer(dt: number) {
        if (this.localUnit.isDead) {
            if (this.localUnit.respawnTimer > 0) {
                this.localUnit.respawnTimer -= dt;
                if (this.localUnit.respawnTimer <= 0) this.respawnUnit(this.localUnit);
            }
            return;
        }

        const isTank = this.localClass === 'tank';
        const turnRate = isTank ? 2.2 : 4.0;
        const maxSpeed = isTank ? 16.0 : 19.0;
        const accel = isTank ? 35.0 : 50.0;
        const drag = 14.0;

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

        const forward = new THREE.Vector3(Math.sin(this.localUnit.rotation), 0, Math.cos(this.localUnit.rotation));
        this.localUnit.pos.addScaledVector(forward, this.localUnit.speed * dt);

        this.localUnit.pos.x = Math.max(-385, Math.min(385, this.localUnit.pos.x));
        this.localUnit.pos.z = Math.max(-385, Math.min(385, this.localUnit.pos.z));

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

        // Continuous Auto-Fire for MG-42 when holding mouse or Space
        if ((this.isMouseDown || this.keys['Space']) && !this.localUnit.isDead && !this.isMatchEnded) {
            if (this.activeWeapon === 'mg' && this.localClass === 'tank' && this.secondaryReloadTimer <= 0) {
                this.fireMachineGunWeapon();
            } else if (this.activeWeapon === 'cannon' && this.localClass === 'soldier' && this.primaryReloadTimer <= 0) {
                this.fireCannonWeapon();
            }
        }
    }

    private updateBots(dt: number) {
        this.units.forEach(unit => {
            if (unit.isLocalPlayer || !unit.isBot) return;

            if (unit.isDead) {
                if (unit.respawnTimer > 0) {
                    unit.respawnTimer -= dt;
                    if (unit.respawnTimer <= 0) this.respawnUnit(unit);
                }
                return;
            }

            // Boid Separation Force: Prevent clumping between bots
            this.units.forEach(other => {
                if (other.id === unit.id || other.isDead) return;
                const dist = unit.pos.distanceTo(other.pos);
                if (dist < 18 && dist > 0.01) {
                    const push = new THREE.Vector3().subVectors(unit.pos, other.pos).normalize();
                    unit.pos.addScaledVector(push, (18 - dist) * 2.2 * dt);
                }
            });

            // Find nearest opponent
            const enemies = Array.from(this.units.values()).filter(e => !e.isDead && e.team !== unit.team);
            let nearest: CombatUnit | null = null;
            let minDist = Infinity;

            for (let e of enemies) {
                const d = unit.pos.distanceTo(e.pos);
                if (d < minDist) {
                    minDist = d;
                    nearest = e;
                }
            }

            if (nearest) {
                const toEnemy = new THREE.Vector3().subVectors(nearest.pos, unit.pos).normalize();
                const desiredRot = Math.atan2(toEnemy.x, toEnemy.z);

                let rotDiff = desiredRot - unit.rotation;
                while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
                while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
                unit.rotation += rotDiff * Math.min(1.0, 2.8 * dt);

                if (minDist > 25) {
                    unit.speed = unit.unitClass === 'tank' ? 14.0 : 16.0;
                    unit.pos.addScaledVector(toEnemy, unit.speed * dt);
                    if (unit.leftLeg && unit.rightLeg) {
                        unit.walkCycle = (unit.walkCycle || 0) + 12 * dt;
                        unit.leftLeg.rotation.x = Math.sin(unit.walkCycle) * 0.6;
                        unit.rightLeg.rotation.x = -Math.sin(unit.walkCycle) * 0.6;
                    }
                } else {
                    unit.speed = 0;
                    if (unit.leftLeg && unit.rightLeg) {
                        unit.leftLeg.rotation.x = 0;
                        unit.rightLeg.rotation.x = 0;
                    }
                }

                unit.root.position.copy(unit.pos);
                unit.root.rotation.y = unit.rotation;

                // Shoot
                unit.reloadTimer -= dt;
                if (unit.reloadTimer <= 0 && minDist < 120) {
                    unit.reloadTimer = unit.unitClass === 'tank' ? 2.5 + Math.random() * 1.5 : 0.8 + Math.random() * 0.8;
                    const fromPos = unit.pos.clone().add(new THREE.Vector3(0, unit.unitClass === 'tank' ? 2.5 : 1.4, 0));
                    const isExplosive = unit.unitClass === 'tank' || Math.random() > 0.7;
                    this.spawnProjectile(unit.id, unit.name, unit.team, fromPos, toEnemy, isExplosive, unit.unitClass === 'tank');
                }
            }
        });
    }

    private updateProjectiles(dt: number) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.life -= dt;

            // Ballistic arc physics for grenade
            if (p.isGrenade) {
                p.velocity.y -= (p.gravity || 26.0) * dt;
                if (p.tumbleSpeed) {
                    p.mesh.rotation.x += p.tumbleSpeed.x * dt;
                    p.mesh.rotation.z += p.tumbleSpeed.z * dt;
                }
            }

            p.mesh.position.addScaledVector(p.velocity, dt);

            if (p.mesh.position.y <= 0.2 || p.life <= 0) {
                if (p.isExplosive) {
                    this.triggerSpreadingExplosion(p.mesh.position, p.explosionRadius, p.damage, p.shooterId, p.shooterName, p.team);
                }
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
                continue;
            }

            // Direct Hit Test
            let hit = false;
            for (let [_, unit] of this.units) {
                if (!unit.isDead && unit.team !== p.team) {
                    const hitDist = unit.unitClass === 'tank' ? 3.2 : 1.4;
                    if (p.mesh.position.distanceTo(unit.pos.clone().add(new THREE.Vector3(0, 1.2, 0))) < hitDist) {
                        if (p.isExplosive) {
                            this.triggerSpreadingExplosion(p.mesh.position, p.explosionRadius, p.damage, p.shooterId, p.shooterName, p.team);
                        } else {
                            this.damageUnit(unit, p.damage, p.shooterId, p.shooterName, p.team);
                        }
                        hit = true;
                        break;
                    }
                }
            }

            if (hit) {
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
            }
        }
    }

    private updateShockwaves(dt: number) {
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.life -= dt;
            sw.currentRadius += sw.expansionSpeed * dt;

            // Scale ring
            const scale = sw.currentRadius;
            sw.mesh.scale.set(scale, scale, 1);

            // Fade opacity
            const progress = 1.0 - (sw.life / sw.maxLife);
            (sw.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 * (1.0 - progress));

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

            p.mesh.position.addScaledVector(p.velocity, dt);
            const progress = 1.0 - (p.life / p.maxLife);
            const curSize = THREE.MathUtils.lerp(p.sizeStart, p.sizeEnd, progress);
            p.mesh.scale.set(curSize, curSize, curSize);
        }
    }

    private updateCamera() {
        if (!this.localUnit) return;
        const isTank = this.localClass === 'tank';
        const dist = isTank ? 22 : 12;
        const height = isTank ? 12 : 6.5;

        const offset = new THREE.Vector3(
            -Math.sin(this.localUnit.rotation) * dist,
            height,
            -Math.cos(this.localUnit.rotation) * dist
        );
        const targetCam = this.localUnit.pos.clone().add(offset);
        this.camera.position.lerp(targetCam, 0.14);
        this.camera.lookAt(this.localUnit.pos.clone().add(new THREE.Vector3(0, isTank ? 2.5 : 1.6, 0)));
    }
}

// Initialise
window.addEventListener('DOMContentLoaded', () => {
    new WarGameEngine();
});
