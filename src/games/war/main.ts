import * as THREE from 'three';
import { supabase } from '../../lib/supabase';
import { getCurrentUserProfile, isUserAdminEmail } from '../../auth';
import { yardService } from '../../shared/yardService';
import { warAudio } from './audio';

// --- Types & Interfaces ---
type Team = 'red' | 'blue';

interface TankEntity {
    id: string;
    name: string;
    team: Team;
    isLocalPlayer: boolean;
    isBot: boolean;
    hp: number;
    maxHp: number;
    pos: THREE.Vector3;
    rotation: number;
    turretAngle: number;
    speed: number;
    root: THREE.Group;
    turret: THREE.Group;
    barrel: THREE.Mesh;
    nameTagSprite: THREE.Sprite;
    nameTagCanvas: HTMLCanvasElement;
    reloadTimer: number;
    respawnTimer: number;
    isDead: boolean;
    targetEntityId?: string;
}

interface Projectile {
    id: string;
    shooterId: string;
    team: Team;
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    damage: number;
    life: number;
    isCannon: boolean;
}

interface Particle {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    sizeStart: number;
    sizeEnd: number;
}

class WarGameEngine {
    private container: HTMLElement;
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;

    // Local Player
    private localPlayerId = 'p_' + Math.random().toString(36).substring(2, 9);
    private localUsername = 'Commander';
    private localTeam: Team = 'blue';
    private localTank!: TankEntity;
    private repairKits = 3;
    private mgAmmo = 500;
    private cannonReloadTime = 1.2;
    private cannonReloadTimer = 0;
    private airstrikeCooldown = 0;
    private myKills = 0;
    private yardsEarned = 0;

    // Team Scores (First to 30 Kills)
    private redScore = 0;
    private blueScore = 0;
    private readonly targetScore = 30;
    private isMatchEnded = false;

    // 20 Tank Slots (10 Red vs 10 Blue)
    private tanks: Map<string, TankEntity> = new Map();
    private projectiles: Projectile[] = [];
    private particles: Particle[] = [];

    // Realtime Supabase Channel
    private channel: any = null;
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
        this.setupTanks10v10();
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

        // Assign team (default to Blue, or balance)
        this.localTeam = Math.random() > 0.5 ? 'blue' : 'blue'; // Primary blue team
        this.updateTeamBadge();
    }

    private updateTeamBadge() {
        const badge = document.getElementById('player-team-badge');
        const nameEl = document.getElementById('player-team-name');
        if (badge && nameEl) {
            if (this.localTeam === 'red') {
                badge.className = 'team-red';
                badge.style.borderColor = '#e74c3c';
                nameEl.innerText = `🔴 RED TEAM (North Base) · ${this.localUsername}`;
            } else {
                badge.className = 'team-blue';
                badge.style.borderColor = '#3498db';
                nameEl.innerText = `🔵 BLUE TEAM (South Base) · ${this.localUsername}`;
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

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xdce7f0, 0.75);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xfffaed, 1.25);
        sunLight.position.set(70, 140, 90);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 10;
        sunLight.shadow.camera.far = 400;
        sunLight.shadow.camera.left = -160;
        sunLight.shadow.camera.right = 160;
        sunLight.shadow.camera.top = 160;
        sunLight.shadow.camera.bottom = -160;
        this.scene.add(sunLight);

        // Radar
        this.radarCanvas = document.getElementById('radar-canvas') as HTMLCanvasElement;
        if (this.radarCanvas) this.radarCtx = this.radarCanvas.getContext('2d');
    }

    // --- Battlefield Map ---
    private buildBattlefield() {
        // Ground Terrain
        const groundGeo = new THREE.PlaneGeometry(420, 420, 50, 50);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x1f271c,
            roughness: 0.9,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Grid lines
        const grid = new THREE.GridHelper(400, 40, 0x3d4a36, 0x171d15);
        grid.position.y = 0.05;
        this.scene.add(grid);

        // North Base (Red Team)
        this.createBaseStation(new THREE.Vector3(0, 0, 135), 'red');
        // South Base (Blue Team)
        this.createBaseStation(new THREE.Vector3(0, 0, -135), 'blue');

        // Center Battlezone Structures & Bunkers
        this.createMilitaryFort(new THREE.Vector3(0, 0, 0));
        this.createMilitaryFort(new THREE.Vector3(65, 0, 45));
        this.createMilitaryFort(new THREE.Vector3(-65, 0, -45));
        this.createMilitaryFort(new THREE.Vector3(-65, 0, 45));
        this.createMilitaryFort(new THREE.Vector3(65, 0, -45));

        // Anti-tank barricades scattered
        for (let i = 0; i < 28; i++) {
            const angle = (i / 28) * Math.PI * 2;
            const dist = 35 + (i % 4) * 25;
            const x = Math.cos(angle) * dist + (Math.random() - 0.5) * 10;
            const z = Math.sin(angle) * dist + (Math.random() - 0.5) * 10;
            if (Math.abs(z) > 115) continue; // Keep bases clear
            this.createBarricade(new THREE.Vector3(x, 0, z));
        }
    }

    private createBaseStation(pos: THREE.Vector3, team: Team) {
        const group = new THREE.Group();
        group.position.copy(pos);

        const color = team === 'red' ? 0xe74c3c : 0x3498db;
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.8 });
        const padMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.4 });

        // Base platform
        const pad = new THREE.Mesh(new THREE.BoxGeometry(60, 0.8, 40), padMat);
        pad.position.y = 0.4;
        pad.receiveShadow = true;
        group.add(pad);

        // Radar Dish
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, 14, 8), baseMat);
        tower.position.set(team === 'red' ? 22 : -22, 7, 0);
        tower.castShadow = true;
        group.add(tower);

        const dish = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 0.5, 1.5, 12, 1, true), padMat);
        dish.position.set(team === 'red' ? 22 : -22, 14.5, 0);
        dish.rotation.x = Math.PI / 4;
        group.add(dish);

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

        const roof = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 2, 8), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
        roof.position.y = 7;
        roof.castShadow = true;
        group.add(roof);

        this.scene.add(group);
    }

    private createBarricade(pos: THREE.Vector3) {
        const group = new THREE.Group();
        group.position.copy(pos);
        const mat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });

        const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 3.2), mat);
        b1.rotation.x = Math.PI / 4;
        b1.castShadow = true;
        group.add(b1);

        const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 3.2), mat);
        b2.rotation.z = Math.PI / 4;
        b2.castShadow = true;
        group.add(b2);

        group.position.y = 1.1;
        this.scene.add(group);
    }

    // --- 10v10 Tanks Creation (10 Red, 10 Blue) ---
    private setupTanks10v10() {
        const redBotNames = [
            'Crimson_Alpha', 'Viper_Red', 'Iron_Ghost', 'Red_Scorpion', 'Apex_Warlord',
            'Blood_Fang', 'Titan_Red', 'Thunder_Bolt', 'Red_Centurion', 'Dragon_Fury'
        ];
        const blueBotNames = [
            'Azure_Leader', 'Cobalt_Fox', 'Shadow_Blue', 'Frost_Bite', 'Steel_Vanguard',
            'Blue_Phantom', 'Cyclone_Blue', 'Ice_Gladiator', 'Sky_Hunter', 'Storm_Rider'
        ];

        // 1. Create 10 Red Tanks
        for (let i = 0; i < 10; i++) {
            const isLocal = (this.localTeam === 'red' && i === 0);
            const id = isLocal ? this.localPlayerId : `bot_red_${i}`;
            const name = isLocal ? this.localUsername : `[RED] ${redBotNames[i]}`;
            const spawnX = (i - 4.5) * 12;
            const spawnZ = 130 + (i % 2) * 8;

            const tank = this.createTankEntity(id, name, 'red', isLocal, !isLocal, new THREE.Vector3(spawnX, 0, spawnZ), Math.PI);
            this.tanks.set(id, tank);
            if (isLocal) this.localTank = tank;
        }

        // 2. Create 10 Blue Tanks
        for (let i = 0; i < 10; i++) {
            const isLocal = (this.localTeam === 'blue' && i === 0);
            const id = isLocal ? this.localPlayerId : `bot_blue_${i}`;
            const name = isLocal ? this.localUsername : `[BLUE] ${blueBotNames[i]}`;
            const spawnX = (i - 4.5) * 12;
            const spawnZ = -130 - (i % 2) * 8;

            const tank = this.createTankEntity(id, name, 'blue', isLocal, !isLocal, new THREE.Vector3(spawnX, 0, spawnZ), 0);
            this.tanks.set(id, tank);
            if (isLocal) this.localTank = tank;
        }

        this.updateHUD();
    }

    private createTankEntity(
        id: string, name: string, team: Team,
        isLocal: boolean, isBot: boolean,
        pos: THREE.Vector3, rot: number
    ): TankEntity {
        const root = new THREE.Group();
        root.position.copy(pos);
        root.rotation.y = rot;

        const isRed = team === 'red';
        const hullColor = isRed ? 0x991b1b : 0x1d4ed8;
        const accentColor = isRed ? 0xff4757 : 0x00f2fe;

        // 1. Armored Hull
        const hullMat = new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.65, metalness: 0.35 });
        const hull = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.5, 6.6), hullMat);
        hull.position.y = 1.3;
        hull.castShadow = true;
        hull.receiveShadow = true;
        root.add(hull);

        // 2. Treads
        const treadMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
        const lt = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 7.2), treadMat);
        lt.position.set(-2.5, 0.7, 0);
        lt.castShadow = true;
        root.add(lt);

        const rt = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 7.2), treadMat);
        rt.position.set(2.5, 0.7, 0);
        rt.castShadow = true;
        root.add(rt);

        // 3. Rotating Turret
        const turret = new THREE.Group();
        turret.position.set(0, 2.2, 0);

        const turretDome = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.2, 3.8), hullMat);
        turretDome.position.set(0, 0.6, -0.4);
        turretDome.castShadow = true;
        turret.add(turretDome);

        // Team Badge on Turret
        const badgeMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.55, 0.55, 0.2, 16),
            new THREE.MeshStandardMaterial({ color: accentColor, metalness: 0.8 })
        );
        badgeMesh.position.set(0.6, 1.25, -0.5);
        turret.add(badgeMesh);

        // 4. Barrel
        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.8, roughness: 0.2 });
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 5.0, 16), barrelMat);
        barrel.rotation.x = -Math.PI / 2;
        barrel.position.set(0, 0.6, 2.8);
        barrel.castShadow = true;
        turret.add(barrel);

        root.add(turret);

        // 5. Overhead 3D Canvas Name Tag & Health Bar
        const nameCanvas = document.createElement('canvas');
        nameCanvas.width = 256;
        nameCanvas.height = 64;
        const nameTexture = new THREE.CanvasTexture(nameCanvas);
        const nameMat = new THREE.SpriteMaterial({ map: nameTexture, depthTest: false });
        const nameTagSprite = new THREE.Sprite(nameMat);
        nameTagSprite.scale.set(6, 1.5, 1);
        nameTagSprite.position.set(0, 4.8, 0);
        root.add(nameTagSprite);

        this.updateNameTag(nameCanvas, name, team, 100, 100);
        nameTexture.needsUpdate = true;

        this.scene.add(root);

        return {
            id,
            name,
            team,
            isLocalPlayer: isLocal,
            isBot,
            hp: 100,
            maxHp: 100,
            pos: pos.clone(),
            rotation: rot,
            turretAngle: 0,
            speed: 0,
            root,
            turret,
            barrel,
            nameTagSprite,
            nameTagCanvas: nameCanvas,
            reloadTimer: Math.random() * 2,
            respawnTimer: 0,
            isDead: false
        };
    }

    private updateNameTag(canvas: HTMLCanvasElement, name: string, team: Team, hp: number, maxHp: number) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Background pill
        ctx.fillStyle = 'rgba(10, 15, 25, 0.82)';
        ctx.beginPath();
        ctx.roundRect(10, 6, 236, 52, 10);
        ctx.fill();

        // Team border
        ctx.lineWidth = 3;
        ctx.strokeStyle = team === 'red' ? '#ff4757' : '#00f2fe';
        ctx.stroke();

        // Text
        ctx.font = 'bold 20px "Segoe UI", sans-serif';
        ctx.fillStyle = team === 'red' ? '#ff6b81' : '#70a1ff';
        ctx.textAlign = 'center';
        ctx.fillText(name.length > 18 ? name.substring(0, 18) + '..' : name, 128, 30);

        // Health Bar
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
            console.log("Supabase not active. Running 10v10 War Game in local simulated server mode.");
            return;
        }

        try {
            this.channel = supabase.channel('war_battle_server_1', {
                config: {
                    broadcast: { self: false },
                    presence: { key: this.localPlayerId }
                }
            });

            // 1. Presence Sync
            this.channel
                .on('presence', { event: 'sync' }, () => {
                    const state = this.channel.presenceState();
                    const playersCount = Object.keys(state).length;
                    const serverEl = document.getElementById('server-players-count');
                    if (serverEl) {
                        serverEl.innerText = `${Math.max(1, Math.min(20, playersCount))} / 20 Online (Server #1)`;
                    }
                })
                .on('broadcast', { event: 'player_state' }, ({ payload }: any) => {
                    this.onRemotePlayerState(payload);
                })
                .on('broadcast', { event: 'player_fire' }, ({ payload }: any) => {
                    this.onRemotePlayerFire(payload);
                })
                .on('broadcast', { event: 'tank_killed' }, ({ payload }: any) => {
                    this.onRemoteKill(payload);
                })
                .subscribe(async (status: string) => {
                    if (status === 'SUBSCRIBED') {
                        await this.channel.track({
                            id: this.localPlayerId,
                            name: this.localUsername,
                            team: this.localTeam,
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

        let remoteTank = this.tanks.get(payload.id);
        if (!remoteTank) {
            // Replace a bot slot on the matching team
            const botSlot = Array.from(this.tanks.values()).find(t => t.isBot && t.team === payload.team);
            if (botSlot) {
                this.tanks.delete(botSlot.id);
                this.scene.remove(botSlot.root);
            }
            remoteTank = this.createTankEntity(
                payload.id, payload.name || 'Soldier', payload.team,
                false, false,
                new THREE.Vector3(payload.x, 0, payload.z), payload.rot
            );
            this.tanks.set(payload.id, remoteTank);
        }

        remoteTank.pos.set(payload.x, 0, payload.z);
        remoteTank.root.position.copy(remoteTank.pos);
        remoteTank.root.rotation.y = payload.rot;
        remoteTank.turret.rotation.y = payload.turretRot;
        remoteTank.hp = payload.hp;

        this.updateNameTag(remoteTank.nameTagCanvas, remoteTank.name, remoteTank.team, remoteTank.hp, remoteTank.maxHp);
        (remoteTank.nameTagSprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
    }

    private onRemotePlayerFire(payload: any) {
        if (!payload || payload.shooterId === this.localPlayerId) return;

        const fromPos = new THREE.Vector3(payload.fromX, payload.fromY, payload.fromZ);
        const dir = new THREE.Vector3(payload.dirX, payload.dirY, payload.dirZ);
        this.spawnProjectile(payload.shooterId, payload.team, fromPos, dir, payload.isCannon);
    }

    private onRemoteKill(payload: any) {
        if (!payload) return;
        this.addKillFeedEntry(payload.killerName, payload.killerTeam, payload.victimName, payload.victimTeam);
        if (payload.killerTeam === 'red') this.redScore = Math.max(this.redScore, payload.redScore);
        else this.blueScore = Math.max(this.blueScore, payload.blueScore);
        this.updateHUD();
    }

    private broadcastState() {
        if (!this.channel || this.localTank.isDead) return;

        const now = performance.now();
        if (now - this.lastBroadcastTime < 50) return; // 20 updates/sec
        this.lastBroadcastTime = now;

        this.channel.send({
            type: 'broadcast',
            event: 'player_state',
            payload: {
                id: this.localPlayerId,
                name: this.localUsername,
                team: this.localTeam,
                x: this.localTank.pos.x,
                z: this.localTank.pos.z,
                rot: this.localTank.rotation,
                turretRot: this.localTank.turretAngle,
                hp: this.localTank.hp
            }
        });
    }

    // --- Input & Controls ---
    private setupInputListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space' || e.code === 'KeyE') this.fireCannon();
            if (e.code === 'KeyR') this.useRepairKit();
            if (e.code === 'KeyF') this.triggerAirstrike();
            if (e.code === 'Digit1') this.selectWeapon('cannon');
            if (e.code === 'Digit2') this.selectWeapon('mg');
            if (e.code === 'Digit3') this.selectWeapon('airstrike');
            if (e.code === 'Digit4') this.selectWeapon('repair');
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
            if (e.button === 0) this.fireCannon();
            else if (e.button === 2) this.fireMachineGun();
        });

        window.addEventListener('contextmenu', (e) => e.preventDefault());

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Touch setup
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

        document.getElementById('m-btn-fire')?.addEventListener('touchstart', (e) => { e.preventDefault(); this.fireCannon(); });
        document.getElementById('m-btn-mg')?.addEventListener('touchstart', (e) => { e.preventDefault(); this.fireMachineGun(); });
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
        document.getElementById('weapon-mg')?.addEventListener('click', () => { this.selectWeapon('mg'); this.fireMachineGun(); });
        document.getElementById('weapon-airstrike')?.addEventListener('click', () => { this.selectWeapon('airstrike'); this.triggerAirstrike(); });
        document.getElementById('weapon-repair')?.addEventListener('click', () => { this.selectWeapon('repair'); this.useRepairKit(); });

        document.getElementById('btn-restart-match')?.addEventListener('click', () => {
            const matchModal = document.getElementById('match-end-modal');
            if (matchModal) matchModal.style.display = 'none';
            this.isMatchEnded = false;
            this.redScore = 0;
            this.blueScore = 0;
            this.updateHUD();
        });
    }

    private selectWeapon(type: 'cannon' | 'mg' | 'airstrike' | 'repair') {
        document.querySelectorAll('.weapon-card').forEach(c => c.classList.remove('active'));
        document.getElementById(`weapon-${type}`)?.classList.add('active');
    }

    // --- Weapons & Combat ---
    private fireCannon() {
        if (this.cannonReloadTimer > 0 || this.localTank.isDead || this.isMatchEnded) return;
        this.cannonReloadTimer = this.cannonReloadTime;

        const muzzlePos = new THREE.Vector3(0, 0.6, 5.2);
        this.localTank.turret.localToWorld(muzzlePos);

        const dir = new THREE.Vector3().subVectors(this.mouseAimTarget, muzzlePos).normalize();
        dir.y += 0.03;

        this.spawnProjectile(this.localPlayerId, this.localTeam, muzzlePos, dir, true);

        // Broadcast Shot to Server
        if (this.channel) {
            this.channel.send({
                type: 'broadcast',
                event: 'player_fire',
                payload: {
                    shooterId: this.localPlayerId,
                    team: this.localTeam,
                    fromX: muzzlePos.x, fromY: muzzlePos.y, fromZ: muzzlePos.z,
                    dirX: dir.x, dirY: dir.y, dirZ: dir.z,
                    isCannon: true
                }
            });
        }

        warAudio.playCannonShot();
    }

    private fireMachineGun() {
        if (this.mgAmmo <= 0 || this.localTank.isDead || this.isMatchEnded) return;
        this.mgAmmo--;

        const mgPos = new THREE.Vector3(-0.8, 1.2, 1.8);
        this.localTank.turret.localToWorld(mgPos);

        const spread = (Math.random() - 0.5) * 0.06;
        const dir = new THREE.Vector3().subVectors(this.mouseAimTarget, mgPos).normalize();
        dir.x += spread;
        dir.z += spread;

        this.spawnProjectile(this.localPlayerId, this.localTeam, mgPos, dir, false);

        if (this.channel) {
            this.channel.send({
                type: 'broadcast',
                event: 'player_fire',
                payload: {
                    shooterId: this.localPlayerId,
                    team: this.localTeam,
                    fromX: mgPos.x, fromY: mgPos.y, fromZ: mgPos.z,
                    dirX: dir.x, dirY: dir.y, dirZ: dir.z,
                    isCannon: false
                }
            });
        }

        warAudio.playMachineGun();
        this.updateHUD();
    }

    private spawnProjectile(shooterId: string, team: Team, from: THREE.Vector3, dir: THREE.Vector3, isCannon: boolean) {
        const geo = isCannon
            ? new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8)
            : new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6);

        const color = team === 'red' ? 0xff4757 : 0x00f2fe;
        const mat = new THREE.MeshBasicMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(from);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

        this.scene.add(mesh);
        this.projectiles.push({
            id: 'proj_' + Math.random(),
            shooterId,
            team,
            mesh,
            velocity: dir.clone().multiplyScalar(isCannon ? 100 : 160),
            damage: isCannon ? 60 : 15,
            life: isCannon ? 3.0 : 1.5,
            isCannon
        });
    }

    private triggerAirstrike() {
        if (this.airstrikeCooldown > 0 || this.localTank.isDead || this.isMatchEnded) return;
        this.airstrikeCooldown = 25;

        warAudio.playAirstrike();

        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                const enemyTanks = Array.from(this.tanks.values()).filter(t => !t.isDead && t.team !== this.localTeam);
                const target = enemyTanks[Math.floor(Math.random() * enemyTanks.length)];
                const impactPos = target
                    ? target.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 8))
                    : this.mouseAimTarget.clone().add(new THREE.Vector3((Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 20));

                this.createExplosion(impactPos, 3.2, 30);

                // Area damage
                this.tanks.forEach(t => {
                    if (!t.isDead && t.team !== this.localTeam && t.pos.distanceTo(impactPos) < 16) {
                        this.damageTank(t, 75, this.localPlayerId, this.localUsername, this.localTeam);
                    }
                });
            }, 750 + i * 240);
        }
    }

    private useRepairKit() {
        if (this.repairKits <= 0 || this.localTank.hp >= this.localTank.maxHp || this.localTank.isDead) return;
        this.repairKits--;
        this.localTank.hp = Math.min(this.localTank.maxHp, this.localTank.hp + 50);
        warAudio.playRepair();
        this.updateNameTag(this.localTank.nameTagCanvas, this.localTank.name, this.localTank.team, this.localTank.hp, this.localTank.maxHp);
        (this.localTank.nameTagSprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
        this.updateHUD();
    }

    // --- Damage, Kill & Respawn ---
    private damageTank(victim: TankEntity, damage: number, attackerId: string, attackerName: string, attackerTeam: Team) {
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
            this.killTank(victim, attackerId, attackerName, attackerTeam);
        }
    }

    private killTank(victim: TankEntity, killerId: string, killerName: string, killerTeam: Team) {
        victim.isDead = true;
        victim.root.visible = false;
        this.createExplosion(victim.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 3.5, 35);

        // Update score
        if (killerTeam === 'red') this.redScore++;
        else this.blueScore++;

        // Add to Kill Feed
        this.addKillFeedEntry(killerName, killerTeam, victim.name, victim.team);

        // Broadcast kill
        if (this.channel) {
            this.channel.send({
                type: 'broadcast',
                event: 'tank_killed',
                payload: {
                    killerId, killerName, killerTeam,
                    victimId: victim.id, victimName: victim.name, victimTeam: victim.team,
                    redScore: this.redScore,
                    blueScore: this.blueScore
                }
            });
        }

        // Rewards
        if (killerId === this.localPlayerId) {
            this.myKills++;
            this.yardsEarned += 50;
            yardService.addYards(50);
        }

        this.updateHUD();

        // Check Match Winner
        if (this.redScore >= this.targetScore || this.blueScore >= this.targetScore) {
            this.endMatch(this.redScore >= this.targetScore ? 'red' : 'blue');
            return;
        }

        // Respawn Timer (5 seconds)
        victim.respawnTimer = 5.0;
        if (victim.isLocalPlayer) {
            this.showRespawnOverlay(5);
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
            if (left > 0) {
                countEl.innerText = left.toString();
            } else {
                clearInterval(timer);
                overlay.style.display = 'none';
            }
        }, 1000);
    }

    private respawnTank(tank: TankEntity) {
        tank.isDead = false;
        tank.hp = tank.maxHp;
        tank.root.visible = true;

        // Base spawn coords
        const spawnX = (Math.random() - 0.5) * 60;
        const spawnZ = tank.team === 'red' ? 130 + Math.random() * 10 : -130 - Math.random() * 10;
        tank.pos.set(spawnX, 0, spawnZ);
        tank.root.position.copy(tank.pos);
        tank.rotation = tank.team === 'red' ? Math.PI : 0;
        tank.root.rotation.y = tank.rotation;

        this.updateNameTag(tank.nameTagCanvas, tank.name, tank.team, tank.hp, tank.maxHp);
        (tank.nameTagSprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;

        this.createExplosion(tank.pos.clone().add(new THREE.Vector3(0, 1, 0)), 1.5, 12);
        warAudio.playRepair();
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
                title.innerText = 'VICTORY!';
                title.style.color = '#ffd32a';
                desc.innerText = `Your ${this.localTeam.toUpperCase()} team reached 30 kills and triumphed over the battlefield!`;
            } else {
                if (icon) icon.innerText = '⚔️';
                title.innerText = 'DEFEAT!';
                title.style.color = '#ff4757';
                desc.innerText = `Enemy ${winningTeam.toUpperCase()} team reached 30 kills first. Re-arm and prepare for revenge!`;
            }
            finalKills.innerText = this.myKills.toString();
            finalYards.innerText = `+${this.yardsEarned} YARDS`;
        }
    }

    // --- Explosions & Particles ---
    private createExplosion(pos: THREE.Vector3, scale = 2.0, count = 20) {
        warAudio.playExplosion();

        for (let i = 0; i < count; i++) {
            const size = (0.3 + Math.random() * 0.8) * scale;
            const geo = new THREE.DodecahedronGeometry(size);
            const mat = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.4 ? 0xff4757 : 0xffa502,
                transparent: true,
                opacity: 0.95
            });
            const pMesh = new THREE.Mesh(geo, mat);
            pMesh.position.copy(pos);

            const speed = 6 + Math.random() * 22;
            const dir = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.8 + 0.2, (Math.random() - 0.5) * 2).normalize();

            this.scene.add(pMesh);
            this.particles.push({
                mesh: pMesh,
                velocity: dir.multiplyScalar(speed),
                life: 0.6 + Math.random() * 0.5,
                maxLife: 0.6 + Math.random() * 0.5,
                sizeStart: size,
                sizeEnd: 0.1
            });
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
        const countRepair = document.getElementById('count-repair');
        const cdAirstrike = document.getElementById('cooldown-airstrike');

        if (redScoreEl) redScoreEl.innerText = this.redScore.toString();
        if (blueScoreEl) blueScoreEl.innerText = this.blueScore.toString();

        if (hpText && hpBar && this.localTank) {
            hpText.innerText = `${Math.round(this.localTank.hp)} / ${this.localTank.maxHp}`;
            const pct = Math.max(0, (this.localTank.hp / this.localTank.maxHp) * 100);
            hpBar.style.width = `${pct}%`;
        }

        if (reloadText && reloadBar) {
            if (this.cannonReloadTimer > 0) {
                reloadText.innerText = `${this.cannonReloadTimer.toFixed(1)}s`;
                const pct = ((this.cannonReloadTime - this.cannonReloadTimer) / this.cannonReloadTime) * 100;
                reloadBar.style.width = `${pct}%`;
            } else {
                reloadText.innerText = 'READY';
                reloadBar.style.width = '100%';
            }
        }

        if (statKills) statKills.innerText = this.myKills.toString();
        if (statYards) statYards.innerText = yardService.getYards().toLocaleString();
        if (ammoMg) ammoMg.innerText = `${this.mgAmmo} rds`;
        if (countRepair) countRepair.innerText = `${this.repairKits} Left`;
        if (cdAirstrike) cdAirstrike.innerText = this.airstrikeCooldown > 0 ? `${Math.ceil(this.airstrikeCooldown)}s` : 'READY';
    }

    private renderRadar() {
        if (!this.radarCtx || !this.radarCanvas || !this.localTank) return;
        const ctx = this.radarCtx;
        const w = this.radarCanvas.width;
        const h = this.radarCanvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const scale = 0.35;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(9, 14, 23, 0.9)';
        ctx.fillRect(0, 0, w, h);

        // Circles
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 22, 0, Math.PI * 2);
        ctx.arc(cx, cy, 45, 0, Math.PI * 2);
        ctx.arc(cx, cy, 68, 0, Math.PI * 2);
        ctx.stroke();

        // Tanks
        this.tanks.forEach(tank => {
            if (tank.isDead) return;
            const rx = cx + (tank.pos.x - this.localTank.pos.x) * scale;
            const ry = cy + (tank.pos.z - this.localTank.pos.z) * scale;

            if (rx >= 3 && rx <= w - 3 && ry >= 3 && ry <= h - 3) {
                ctx.fillStyle = tank.team === 'red' ? '#ff4757' : '#00f2fe';
                ctx.beginPath();
                ctx.arc(rx, ry, tank.isLocalPlayer ? 4.5 : 3.0, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    // --- Main Loop ---
    private animate = () => {
        requestAnimationFrame(this.animate);
        const dt = Math.min(this.clock.getDelta(), 0.1);

        if (!this.isMatchEnded) {
            this.updatePlayer(dt);
            this.updateBots(dt);
            this.updateProjectiles(dt);
            this.updateParticles(dt);
            this.updateCamera();
            this.renderRadar();
            this.broadcastState();
        }

        this.renderer.render(this.scene, this.camera);
    };

    private updatePlayer(dt: number) {
        if (this.localTank.isDead) {
            if (this.localTank.respawnTimer > 0) {
                this.localTank.respawnTimer -= dt;
                if (this.localTank.respawnTimer <= 0) {
                    this.respawnTank(this.localTank);
                }
            }
            return;
        }

        const turnRate = 2.2;
        const maxSpeed = 16.0;
        const accel = 35.0;
        const drag = 12.0;

        if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.localTank.rotation += turnRate * dt;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) this.localTank.rotation -= turnRate * dt;

        if (this.keys['KeyW'] || this.keys['ArrowUp']) {
            this.localTank.speed = Math.min(maxSpeed, this.localTank.speed + accel * dt);
        } else if (this.keys['KeyS'] || this.keys['ArrowDown']) {
            this.localTank.speed = Math.max(-maxSpeed * 0.6, this.localTank.speed - accel * dt);
        } else {
            if (this.localTank.speed > 0) this.localTank.speed = Math.max(0, this.localTank.speed - drag * dt);
            else if (this.localTank.speed < 0) this.localTank.speed = Math.min(0, this.localTank.speed + drag * dt);
        }

        const forward = new THREE.Vector3(Math.sin(this.localTank.rotation), 0, Math.cos(this.localTank.rotation));
        this.localTank.pos.addScaledVector(forward, this.localTank.speed * dt);

        // Clamp
        this.localTank.pos.x = Math.max(-190, Math.min(190, this.localTank.pos.x));
        this.localTank.pos.z = Math.max(-190, Math.min(190, this.localTank.pos.z));

        this.localTank.root.position.copy(this.localTank.pos);
        this.localTank.root.rotation.y = this.localTank.rotation;

        // Turret Aim
        this.raycaster.setFromCamera(this.mouseScreenPos, this.camera);
        const intersect = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.groundPlane, intersect)) {
            this.mouseAimTarget.copy(intersect);
            const localAim = this.localTank.root.worldToLocal(intersect.clone());
            const targetAngle = Math.atan2(localAim.x, localAim.z);

            let diff = targetAngle - this.localTank.turretAngle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.localTank.turretAngle += diff * Math.min(1.0, 14.0 * dt);
            this.localTank.turret.rotation.y = this.localTank.turretAngle;
        }

        // Timers
        if (this.cannonReloadTimer > 0) this.cannonReloadTimer = Math.max(0, this.cannonReloadTimer - dt);
        if (this.airstrikeCooldown > 0) this.airstrikeCooldown = Math.max(0, this.airstrikeCooldown - dt);
    }

    private updateBots(dt: number) {
        this.tanks.forEach(tank => {
            if (tank.isLocalPlayer || !tank.isBot) return;

            // Handle Respawn
            if (tank.isDead) {
                if (tank.respawnTimer > 0) {
                    tank.respawnTimer -= dt;
                    if (tank.respawnTimer <= 0) {
                        this.respawnTank(tank);
                    }
                }
                return;
            }

            // Bot AI: Find nearest opposing team tank
            const enemies = Array.from(this.tanks.values()).filter(e => !e.isDead && e.team !== tank.team);
            let nearestEnemy: TankEntity | null = null;
            let minDist = Infinity;

            for (let e of enemies) {
                const d = tank.pos.distanceTo(e.pos);
                if (d < minDist) {
                    minDist = d;
                    nearestEnemy = e;
                }
            }

            if (nearestEnemy) {
                const toEnemy = new THREE.Vector3().subVectors(nearestEnemy.pos, tank.pos).normalize();
                const desiredRot = Math.atan2(toEnemy.x, toEnemy.z);

                let rotDiff = desiredRot - tank.rotation;
                while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
                while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
                tank.rotation += rotDiff * Math.min(1.0, 2.5 * dt);

                if (minDist > 25) {
                    tank.speed = 10.0;
                    tank.pos.addScaledVector(toEnemy, tank.speed * dt);
                } else {
                    tank.speed = 0;
                }

                tank.root.position.copy(tank.pos);
                tank.root.rotation.y = tank.rotation;

                // Aim and shoot at enemy
                tank.reloadTimer -= dt;
                if (tank.reloadTimer <= 0 && minDist < 80) {
                    tank.reloadTimer = 2.0 + Math.random() * 1.5;
                    const fromPos = tank.pos.clone().add(new THREE.Vector3(0, 2.6, 0));
                    this.spawnProjectile(tank.id, tank.team, fromPos, toEnemy, Math.random() > 0.3);
                }
            }
        });
    }

    private updateProjectiles(dt: number) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.life -= dt;
            p.mesh.position.addScaledVector(p.velocity, dt);

            if (p.mesh.position.y <= 0.2 || p.life <= 0) {
                this.createExplosion(p.mesh.position, p.isCannon ? 1.4 : 0.4, p.isCannon ? 10 : 3);
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
                continue;
            }

            // Hit test against opposing team tanks
            let hit = false;
            for (let [_, tank] of this.tanks) {
                if (!tank.isDead && tank.team !== p.team) {
                    if (p.mesh.position.distanceTo(tank.pos.clone().add(new THREE.Vector3(0, 1.5, 0))) < 3.2) {
                        const shooter = this.tanks.get(p.shooterId);
                        const shooterName = shooter?.name || 'Soldier';
                        this.damageTank(tank, p.damage, p.shooterId, shooterName, p.team);
                        hit = true;
                        break;
                    }
                }
            }

            if (hit) {
                this.createExplosion(p.mesh.position, p.isCannon ? 1.8 : 0.6, p.isCannon ? 14 : 4);
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
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
        if (!this.localTank) return;
        const offset = new THREE.Vector3(
            -Math.sin(this.localTank.rotation) * 22,
            12,
            -Math.cos(this.localTank.rotation) * 22
        );
        const targetCam = this.localTank.pos.clone().add(offset);
        this.camera.position.lerp(targetCam, 0.12);
        this.camera.lookAt(this.localTank.pos.clone().add(new THREE.Vector3(0, 2.5, 0)));
    }
}

// Initialise
window.addEventListener('DOMContentLoaded', () => {
    new WarGameEngine();
});
