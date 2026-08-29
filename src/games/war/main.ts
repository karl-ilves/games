import * as THREE from 'three';
import { supabase } from '../../lib/supabase';
import { getCurrentUserProfile, isUserAdminEmail } from '../../auth';
import { yardService } from '../../shared/yardService';
import { warAudio } from './audio';

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
    private yardsEarned = 0;

    // Team Scores (Target: 30 Kills)
    private redScore = 0;
    private blueScore = 0;
    private readonly targetScore = 30;
    private isMatchEnded = false;

    // Units (2v2 or PvP up to 10 players)
    private units: Map<string, CombatUnit> = new Map();
    private barrels: ExplosiveBarrel[] = [];
    private projectiles: Projectile[] = [];
    private shockwaves: Shockwave[] = [];
    private particles: Particle[] = [];

    // Realtime Supabase Channel
    private channel: any = null;
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
        this.setupScene();
        this.buildBattlefield();
        this.setupDeployModal();
        this.setupUI();
        this.setupInputListeners();
        this.initMultiplayer();

        this.clock.start();
        this.animate();
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

    // --- Battlefield Map & Explosive Barrels ---
    private buildBattlefield() {
        const groundGeo = new THREE.PlaneGeometry(420, 420, 50, 50);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x1f271c, roughness: 0.9, metalness: 0.1 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const grid = new THREE.GridHelper(400, 40, 0x3d4a36, 0x171d15);
        grid.position.y = 0.05;
        this.scene.add(grid);

        this.createBaseStation(new THREE.Vector3(0, 0, 135), 'red');
        this.createBaseStation(new THREE.Vector3(0, 0, -135), 'blue');

        this.createMilitaryFort(new THREE.Vector3(0, 0, 0));
        this.createMilitaryFort(new THREE.Vector3(65, 0, 45));
        this.createMilitaryFort(new THREE.Vector3(-65, 0, -45));
        this.createMilitaryFort(new THREE.Vector3(-65, 0, 45));
        this.createMilitaryFort(new THREE.Vector3(65, 0, -45));

        // Anti-tank barricades
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const dist = 32 + (i % 3) * 28;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            if (Math.abs(z) > 115) continue;
            this.createBarricade(new THREE.Vector3(x, 0, z));
        }

        // Explosive Red Barrels (Chain Reaction)
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const dist = 24 + (i % 4) * 22;
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

        const pad = new THREE.Mesh(new THREE.BoxGeometry(60, 0.8, 40), padMat);
        pad.position.y = 0.4;
        pad.receiveShadow = true;
        group.add(pad);

        const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, 14, 8), baseMat);
        tower.position.set(team === 'red' ? 22 : -22, 7, 0);
        tower.castShadow = true;
        group.add(tower);

        this.scene.add(group);
    }

    private createMilitaryFort(pos: THREE.Vector3) {
        const group = new THREE.Group();
        group.position.copy(pos);
        const bunkerMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
        const bunker = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 16), bunkerMat);
        bunker.position.y = 3;
        bunker.castShadow = true;
        bunker.receiveShadow = true;
        group.add(bunker);
        this.scene.add(group);
    }

    private createBarricade(pos: THREE.Vector3) {
        const group = new THREE.Group();
        group.position.copy(pos);
        const mat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });
        const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 3.2), mat);
        b1.rotation.x = Math.PI / 4;
        group.add(b1);
        const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 3.2), mat);
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

    // --- Unit Deployment & Roster (2v2 or 4-10 PvP) ---
    private deployLocalUnit() {
        if (this.localUnit) {
            this.scene.remove(this.localUnit.root);
            this.units.delete(this.localPlayerId);
        }

        const spawnZ = this.localTeam === 'red' ? 130 : -130;
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

        // AI Unique Name Pool
        const blueAINames = [
            { name: '[AI] Kpt. Miller', class: 'tank' as UnitClass },
            { name: '[AI] Srs. Kask', class: 'soldier' as UnitClass },
            { name: '[AI] Kpr. Hunt', class: 'soldier' as UnitClass },
            { name: '[AI] Ream. Tamm', class: 'soldier' as UnitClass }
        ];

        const redAINames = [
            { name: '[AI] Tank Titan', class: 'tank' as UnitClass },
            { name: '[AI] Tank Viper', class: 'tank' as UnitClass },
            { name: '[AI] Sõdur Fox', class: 'soldier' as UnitClass },
            { name: '[AI] Snaiper Hawk', class: 'soldier' as UnitClass }
        ];

        // If 1-4 players: fill 2v2 roster (2 Blue vs 2 Red)
        if (this.connectedHumanCount < 4) {
            // Blue Teammate (if local is blue, add 1 AI teammate)
            if (this.localTeam === 'blue') {
                const bMate = blueAINames[0];
                const u = bMate.class === 'tank'
                    ? this.createTank('ai_blue_1', bMate.name, 'blue', false, true, new THREE.Vector3(14, 0, -132), 0)
                    : this.createSoldier('ai_blue_1', bMate.name, 'blue', false, true, new THREE.Vector3(14, 0, -132), 0);
                this.units.set('ai_blue_1', u);
            } else {
                // Local is Red, add 2 Blue AI enemies
                const b1 = this.createTank('ai_blue_1', blueAINames[0].name, 'blue', false, true, new THREE.Vector3(0, 0, -130), 0);
                const b2 = this.createSoldier('ai_blue_2', blueAINames[1].name, 'blue', false, true, new THREE.Vector3(14, 0, -132), 0);
                this.units.set('ai_blue_1', b1);
                this.units.set('ai_blue_2', b2);
            }

            // Red Opponents (if local is blue, add 2 Red AI enemies)
            if (this.localTeam === 'blue') {
                const r1 = this.createTank('ai_red_1', redAINames[0].name, 'red', false, true, new THREE.Vector3(0, 0, 130), Math.PI);
                const r2 = this.createSoldier('ai_red_2', redAINames[2].name, 'red', false, true, new THREE.Vector3(-14, 0, 132), Math.PI);
                this.units.set('ai_red_1', r1);
                this.units.set('ai_red_2', r2);
            } else {
                // Local is Red, add 1 Red AI teammate
                const rMate = redAINames[1];
                const u = rMate.class === 'tank'
                    ? this.createTank('ai_red_1', rMate.name, 'red', false, true, new THREE.Vector3(-14, 0, 132), Math.PI)
                    : this.createSoldier('ai_red_1', rMate.name, 'red', false, true, new THREE.Vector3(-14, 0, 132), Math.PI);
                this.units.set('ai_red_1', u);
            }
        }
        // If >= 4 players: No AI spawned! Pure PvP up to 10 players.
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

    // --- Multiplayer Supabase Realtime Setup ---
    private initMultiplayer() {
        if (!supabase) {
            console.log("Supabase offline. Running local 2v2 simulated battle.");
            return;
        }

        try {
            this.channel = supabase.channel('war_squad_server_1', {
                config: {
                    broadcast: { self: false },
                    presence: { key: this.localPlayerId }
                }
            });

            this.channel
                .on('presence', { event: 'sync' }, () => {
                    const state = this.channel.presenceState();
                    const players = Object.values(state).flat() as any[];
                    this.connectedHumanCount = players.length;

                    const serverEl = document.getElementById('server-players-count');
                    if (serverEl) {
                        if (this.connectedHumanCount <= 4) {
                            serverEl.innerText = `${this.connectedHumanCount} / 4 Mängijat (2v2 Salk)`;
                        } else {
                            serverEl.innerText = `${Math.min(10, this.connectedHumanCount)} / 10 Mängijat (PvP Lahing)`;
                        }
                    }

                    this.spawnBattleRoster();
                })
                .on('broadcast', { event: 'player_state' }, ({ payload }: any) => {
                    this.onRemotePlayerState(payload);
                })
                .on('broadcast', { event: 'player_fire' }, ({ payload }: any) => {
                    this.onRemotePlayerFire(payload);
                })
                .on('broadcast', { event: 'unit_killed' }, ({ payload }: any) => {
                    this.onRemoteKill(payload);
                })
                .on('broadcast', { event: 'airstrike_drop' }, ({ payload }: any) => {
                    this.onRemoteAirstrike(payload);
                })
                .on('broadcast', { event: 'grenade_throw' }, ({ payload }: any) => {
                    this.onRemoteGrenade(payload);
                })
                .subscribe(async (status: string) => {
                    if (status === 'SUBSCRIBED') {
                        await this.channel.track({
                            id: this.localPlayerId,
                            name: this.localUsername,
                            team: this.localTeam,
                            unitClass: this.localClass,
                            onlineAt: new Date().toISOString()
                        });
                    }
                });
        } catch (e) {
            console.warn("Realtime connection error:", e);
        }
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
        if (!this.channel || this.localUnit.isDead) return;

        const now = performance.now();
        if (now - this.lastBroadcastTime < 50) return;
        this.lastBroadcastTime = now;

        this.channel.send({
            type: 'broadcast',
            event: 'player_state',
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

        if (this.channel) {
            this.channel.send({
                type: 'broadcast',
                event: 'player_fire',
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

        if (this.channel) {
            this.channel.send({
                type: 'broadcast',
                event: 'grenade_throw',
                payload: {
                    shooterId,
                    shooterName,
                    team,
                    fromX: from.x, fromY: from.y, fromZ: from.z,
                    targetX: targetPos.x, targetY: targetPos.y, targetZ: targetPos.z
                }
            });
        }
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
        if (this.channel) {
            this.channel.send({
                type: 'broadcast',
                event: 'airstrike_drop',
                payload: {
                    shooterId: this.localPlayerId,
                    shooterName: this.localUsername,
                    team: this.localTeam,
                    targetX: targetPos.x,
                    targetZ: targetPos.z
                }
            });
        }

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

        if (this.channel) {
            this.channel.send({
                type: 'broadcast',
                event: 'unit_killed',
                payload: {
                    killerId, killerName, killerTeam,
                    victimId, victimName, victimTeam,
                    redScore: this.redScore,
                    blueScore: this.blueScore
                }
            });
        }

        if (killerId === this.localPlayerId) {
            this.myKills++;
            const yardReward = 50;
            this.yardsEarned += yardReward;
            yardService.addYards(yardReward);
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

        const spawnX = (Math.random() - 0.5) * 45;
        const spawnZ = unit.team === 'red' ? 130 + Math.random() * 10 : -130 - Math.random() * 10;
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
            this.yardsEarned += 250;
            yardService.addYards(250);
        }

        const modal = document.getElementById('match-end-modal');
        const icon = document.getElementById('match-end-icon');
        const title = document.getElementById('match-end-title');
        const desc = document.getElementById('match-end-desc');
        const finalKills = document.getElementById('final-kills-val');
        const finalYards = document.getElementById('final-yards-val');

        if (modal && title && desc && finalKills && finalYards) {
            modal.style.display = 'flex';
            if (isWin) {
                if (icon) icon.innerText = '🏆';
                title.innerText = 'VÕIT!';
                title.style.color = '#ffd32a';
                desc.innerText = `Sinu ${this.localTeam.toUpperCase()} tiim kindlustas lahinguvälja võidu!`;
            } else {
                if (icon) icon.innerText = '⚔️';
                title.innerText = 'KAOTUS!';
                title.style.color = '#ff4757';
                desc.innerText = `Vastaste ${winningTeam.toUpperCase()} tiim jõudis 30 tapmiseni esimesena.`;
            }
            finalKills.innerText = this.myKills.toString();
            finalYards.innerText = `+${this.yardsEarned} YARDS`;
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
        const statYards = document.getElementById('stat-yards');
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
        if (statYards) statYards.innerText = yardService.getYards().toLocaleString();
        if (ammoMg) ammoMg.innerText = this.localClass === 'tank' ? `${this.mgAmmo} rds` : '💣 Granaat';
        if (cdAirstrike) cdAirstrike.innerText = this.airstrikeCooldown > 0 ? `${Math.ceil(this.airstrikeCooldown)}s` : 'VALMIS';
    }

    private renderRadar() {
        if (!this.radarCtx || !this.radarCanvas || !this.localUnit) return;
        const ctx = this.radarCtx;
        const w = this.radarCanvas.width;
        const h = this.radarCanvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const scale = 0.35;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(9, 14, 23, 0.9)';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(0, 242, 254, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 22, 0, Math.PI * 2);
        ctx.arc(cx, cy, 45, 0, Math.PI * 2);
        ctx.arc(cx, cy, 65, 0, Math.PI * 2);
        ctx.stroke();

        this.units.forEach(unit => {
            if (unit.isDead) return;
            const rx = cx + (unit.pos.x - this.localUnit.pos.x) * scale;
            const ry = cy + (unit.pos.z - this.localUnit.pos.z) * scale;
            if (rx >= 3 && rx <= w - 3 && ry >= 3 && ry <= h - 3) {
                ctx.fillStyle = unit.team === 'red' ? '#ff4757' : '#00f2fe';
                ctx.beginPath();
                ctx.arc(rx, ry, unit.isLocalPlayer ? 4.5 : unit.unitClass === 'tank' ? 3.5 : 2.2, 0, Math.PI * 2);
                ctx.fill();
            }
        });
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
            this.renderRadar();
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

        this.localUnit.pos.x = Math.max(-190, Math.min(190, this.localUnit.pos.x));
        this.localUnit.pos.z = Math.max(-190, Math.min(190, this.localUnit.pos.z));

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

                if (minDist > 22) {
                    unit.speed = unit.unitClass === 'tank' ? 10.0 : 12.0;
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
                if (unit.reloadTimer <= 0 && minDist < 80) {
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
