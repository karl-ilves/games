import * as THREE from 'three';
import { getCurrentUserProfile, isUserAdminEmail } from '../../auth';
import { yardService } from '../../shared/yardService';
import { warAudio } from './audio';

// --- Types & Interfaces ---
interface Projectile {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    damage: number;
    isPlayer: boolean;
    life: number;
    isCannon: boolean;
}

interface Particle {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    colorStart: THREE.Color;
    colorEnd: THREE.Color;
    sizeStart: number;
    sizeEnd: number;
}

interface EnemyTank {
    root: THREE.Group;
    turret: THREE.Group;
    barrel: THREE.Mesh;
    hp: number;
    maxHp: number;
    hpBarMesh?: THREE.Mesh;
    speed: number;
    state: 'patrol' | 'chase' | 'attack';
    targetPos: THREE.Vector3;
    reloadTimer: number;
    patrolAngle: number;
    isDestroyed: boolean;
}

interface EnemyDrone {
    root: THREE.Group;
    rotors: THREE.Mesh[];
    hp: number;
    maxHp: number;
    speed: number;
    orbitAngle: number;
    reloadTimer: number;
    isDestroyed: boolean;
}

// --- Game Engine Class ---
class WarGameEngine {
    private container: HTMLElement;
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;

    // Player Tank Components
    private playerGroup!: THREE.Group;
    private playerHull!: THREE.Mesh;
    private playerTurret!: THREE.Group;
    private playerBarrel!: THREE.Mesh;
    private playerPosition = new THREE.Vector3(0, 0, 0);
    private playerRotation = 0;
    private playerSpeed = 0;
    private playerTurnSpeed = 0;
    private turretTargetAngle = 0;
    private currentTurretAngle = 0;
    private recoilOffset = 0;

    // Player Stats
    private playerHp = 100;
    private maxPlayerHp = 100;
    private score = 0;
    private kills = 0;
    private yardsEarned = 0;
    private currentWave = 1;
    private repairKits = 3;
    private mgAmmo = 500;
    private cannonReloadTime = 1.2; // seconds
    private cannonReloadTimer = 0;
    private airstrikeCooldown = 0;
    private isGameOver = false;

    // World & Entities
    private projectiles: Projectile[] = [];
    private particles: Particle[] = [];
    private enemyTanks: EnemyTank[] = [];
    private enemyDrones: EnemyDrone[] = [];
    private obstacleBoxes: THREE.Box3[] = [];

    // Controls State
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

    private init() {
        // 1. Authorization Verification
        this.checkAuthorization();

        // 2. Setup Three.js Scene, Camera, Renderer
        this.setupScene();

        // 3. Build Battlefield Map & Fortifications
        this.buildBattlefield();

        // 4. Build Player Armored Tank
        this.buildPlayerTank();

        // 5. Setup UI & Event Listeners
        this.setupUI();
        this.setupInputListeners();

        // 6. Spawn Initial Wave
        this.spawnWave(this.currentWave);

        // 7. Start Game Loop
        this.clock.start();
        this.animate();
    }

    // --- Authorization Check ---
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

    // --- Scene Setup ---
    private setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0d141e);
        this.scene.fog = new THREE.FogExp2(0x0d141e, 0.008);

        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 1000);
        this.camera.position.set(0, 15, -25);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xdde8f0, 0.7);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xfffaed, 1.2);
        sunLight.position.set(60, 120, 80);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 10;
        sunLight.shadow.camera.far = 300;
        sunLight.shadow.camera.left = -120;
        sunLight.shadow.camera.right = 120;
        sunLight.shadow.camera.top = 120;
        sunLight.shadow.camera.bottom = -120;
        this.scene.add(sunLight);

        // Warm battlefield fill light
        const fillLight = new THREE.DirectionalLight(0xff7675, 0.4);
        fillLight.position.set(-80, 40, -60);
        this.scene.add(fillLight);

        // Radar canvas
        this.radarCanvas = document.getElementById('radar-canvas') as HTMLCanvasElement;
        if (this.radarCanvas) {
            this.radarCtx = this.radarCanvas.getContext('2d');
        }
    }

    // --- Build Battlefield Environment ---
    private buildBattlefield() {
        // Ground Terrain
        const groundGeo = new THREE.PlaneGeometry(350, 350, 40, 40);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x232d20, // Muddy olive warzone earth
            roughness: 0.9,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Battlefield Grid Marks
        const gridHelper = new THREE.GridHelper(340, 34, 0x3d4a36, 0x1f261c);
        gridHelper.position.y = 0.05;
        this.scene.add(gridHelper);

        // Outer Boundary Walls (Perimeter)
        this.createBoundaryWall(0, 0, 340);

        // Military Bunker Fortifications & Outposts
        this.createMilitaryBunker(new THREE.Vector3(45, 0, 50));
        this.createMilitaryBunker(new THREE.Vector3(-60, 0, -40));
        this.createMilitaryBunker(new THREE.Vector3(70, 0, -60));

        // Radar Command Tower
        this.createRadarTower(new THREE.Vector3(0, 0, 80));

        // Anti-Tank Czech Hedgehogs & Barricades
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const dist = 35 + Math.random() * 80;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            if (Math.abs(x) < 15 && Math.abs(z) < 15) continue; // Leave center open
            this.createCzechHedgehog(new THREE.Vector3(x, 0, z));
        }

        // Concrete Ruined Walls & Shipping Containers
        this.createRuinedStructure(new THREE.Vector3(-30, 0, 35));
        this.createRuinedStructure(new THREE.Vector3(30, 0, -35));
        this.createShippingContainers(new THREE.Vector3(-45, 0, -70));
        this.createShippingContainers(new THREE.Vector3(60, 0, 20));
    }

    private createBoundaryWall(centerX: number, centerZ: number, size: number) {
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x34495e, roughness: 0.8 });
        const half = size / 2;
        const thickness = 4;
        const height = 12;

        const wallNorth = new THREE.Mesh(new THREE.BoxGeometry(size, height, thickness), wallMat);
        wallNorth.position.set(centerX, height / 2, centerZ + half);
        wallNorth.castShadow = true;
        wallNorth.receiveShadow = true;
        this.scene.add(wallNorth);
        this.obstacleBoxes.push(new THREE.Box3().setFromObject(wallNorth));

        const wallSouth = new THREE.Mesh(new THREE.BoxGeometry(size, height, thickness), wallMat);
        wallSouth.position.set(centerX, height / 2, centerZ - half);
        wallSouth.castShadow = true;
        wallSouth.receiveShadow = true;
        this.scene.add(wallSouth);
        this.obstacleBoxes.push(new THREE.Box3().setFromObject(wallSouth));

        const wallEast = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, size), wallMat);
        wallEast.position.set(centerX + half, height / 2, centerZ);
        wallEast.castShadow = true;
        wallEast.receiveShadow = true;
        this.scene.add(wallEast);
        this.obstacleBoxes.push(new THREE.Box3().setFromObject(wallEast));

        const wallWest = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, size), wallMat);
        wallWest.position.set(centerX - half, height / 2, centerZ);
        wallWest.castShadow = true;
        wallWest.receiveShadow = true;
        this.scene.add(wallWest);
        this.obstacleBoxes.push(new THREE.Box3().setFromObject(wallWest));
    }

    private createMilitaryBunker(pos: THREE.Vector3) {
        const group = new THREE.Group();
        group.position.copy(pos);

        const baseGeo = new THREE.BoxGeometry(14, 5, 14);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.85 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 2.5;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);

        const roofGeo = new THREE.CylinderGeometry(8, 10, 2, 8);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.9 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 6;
        roof.castShadow = true;
        group.add(roof);

        // Sandbags in front
        const sandbagMat = new THREE.MeshStandardMaterial({ color: 0x9c8850, roughness: 0.95 });
        for (let i = -5; i <= 5; i += 2.2) {
            const bag = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), sandbagMat);
            bag.position.set(i, 0.5, 8.5);
            bag.castShadow = true;
            group.add(bag);
        }

        this.scene.add(group);
        this.obstacleBoxes.push(new THREE.Box3().setFromObject(base));
    }

    private createRadarTower(pos: THREE.Vector3) {
        const group = new THREE.Group();
        group.position.copy(pos);

        // Tower Structure
        const towerGeo = new THREE.CylinderGeometry(2, 4, 18, 6);
        const towerMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.6, roughness: 0.4 });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.y = 9;
        tower.castShadow = true;
        group.add(tower);

        // Rotating Dish
        const dishGeo = new THREE.CylinderGeometry(4, 1, 2, 16, 1, true);
        const dishMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, metalness: 0.8, roughness: 0.2 });
        const dish = new THREE.Mesh(dishGeo, dishMat);
        dish.position.y = 19;
        dish.rotation.x = Math.PI / 4;
        group.add(dish);

        this.scene.add(group);
        this.obstacleBoxes.push(new THREE.Box3().setFromObject(tower));
    }

    private createCzechHedgehog(pos: THREE.Vector3) {
        const group = new THREE.Group();
        group.position.copy(pos);
        const beamMat = new THREE.MeshStandardMaterial({ color: 0x718093, metalness: 0.8, roughness: 0.3 });

        const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 3.5), beamMat);
        b1.rotation.x = Math.PI / 4;
        b1.castShadow = true;
        group.add(b1);

        const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 3.5), beamMat);
        b2.rotation.z = Math.PI / 4;
        b2.castShadow = true;
        group.add(b2);

        const b3 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.4, 0.4), beamMat);
        b3.castShadow = true;
        group.add(b3);

        group.position.y = 1.2;
        this.scene.add(group);
        this.obstacleBoxes.push(new THREE.Box3().setFromObject(group));
    }

    private createRuinedStructure(pos: THREE.Vector3) {
        const group = new THREE.Group();
        group.position.copy(pos);
        const brickMat = new THREE.MeshStandardMaterial({ color: 0x5c4d3c, roughness: 0.9 });

        const w1 = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 1.5), brickMat);
        w1.position.set(0, 3, 0);
        w1.castShadow = true;
        group.add(w1);

        const w2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 6, 8), brickMat);
        w2.position.set(5, 3, 3);
        w2.castShadow = true;
        group.add(w2);

        this.scene.add(group);
        this.obstacleBoxes.push(new THREE.Box3().setFromObject(group));
    }

    private createShippingContainers(pos: THREE.Vector3) {
        const group = new THREE.Group();
        group.position.copy(pos);
        const colors = [0xc0392b, 0x2980b9, 0x27ae60];

        for (let i = 0; i < 3; i++) {
            const mat = new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.6, metalness: 0.3 });
            const box = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 14), mat);
            box.position.set(i * 7 - 7, 1.5, 0);
            box.castShadow = true;
            box.receiveShadow = true;
            group.add(box);
        }

        this.scene.add(group);
        this.obstacleBoxes.push(new THREE.Box3().setFromObject(group));
    }

    // --- Build Player 3D Combat Tank ---
    private buildPlayerTank() {
        this.playerGroup = new THREE.Group();

        // 1. Armored Hull
        const hullMat = new THREE.MeshStandardMaterial({
            color: 0x3d4a36, // Olive military camo
            roughness: 0.65,
            metalness: 0.35
        });
        const hullGeo = new THREE.BoxGeometry(4.4, 1.5, 6.6);
        this.playerHull = new THREE.Mesh(hullGeo, hullMat);
        this.playerHull.position.y = 1.3;
        this.playerHull.castShadow = true;
        this.playerHull.receiveShadow = true;
        this.playerGroup.add(this.playerHull);

        // 2. Left & Right Heavy Treads
        const treadMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.9, metalness: 0.2 });
        const leftTread = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 7.2), treadMat);
        leftTread.position.set(-2.5, 0.7, 0);
        leftTread.castShadow = true;
        this.playerGroup.add(leftTread);

        const rightTread = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 7.2), treadMat);
        rightTread.position.set(2.5, 0.7, 0);
        rightTread.castShadow = true;
        this.playerGroup.add(rightTread);

        // Tread Wheels
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x485460, metalness: 0.5 });
        for (let side of [-2.5, 2.5]) {
            for (let z = -2.8; z <= 2.8; z += 1.4) {
                const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.05, 12), wheelMat);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(side, 0.6, z);
                this.playerGroup.add(wheel);
            }
        }

        // 3. Rotating Turret
        this.playerTurret = new THREE.Group();
        this.playerTurret.position.set(0, 2.2, 0);

        const turretMat = new THREE.MeshStandardMaterial({
            color: 0x485a40,
            roughness: 0.55,
            metalness: 0.4
        });
        const turretDome = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.2, 3.8), turretMat);
        turretDome.position.set(0, 0.6, -0.4);
        turretDome.castShadow = true;
        this.playerTurret.add(turretDome);

        // Turret Commander Hatch & Star Emblem
        const hatchMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.8, roughness: 0.2 });
        const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.3, 16), hatchMat);
        hatch.position.set(0.6, 1.3, -0.6);
        this.playerTurret.add(hatch);

        // 4. Main Cannon Barrel
        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x2f3640, metalness: 0.7, roughness: 0.3 });
        const barrelGeo = new THREE.CylinderGeometry(0.22, 0.28, 5.0, 16);
        this.playerBarrel = new THREE.Mesh(barrelGeo, barrelMat);
        this.playerBarrel.rotation.x = -Math.PI / 2;
        this.playerBarrel.position.set(0, 0.6, 2.8);
        this.playerBarrel.castShadow = true;
        this.playerTurret.add(this.playerBarrel);

        // Muzzle Brake
        const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.7, 16), barrelMat);
        muzzle.rotation.x = -Math.PI / 2;
        muzzle.position.set(0, 0.6, 5.2);
        this.playerTurret.add(muzzle);

        // Machine Gun Mount
        const mg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 1.8), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        mg.position.set(-0.8, 1.2, 0.8);
        this.playerTurret.add(mg);

        this.playerGroup.add(this.playerTurret);
        this.scene.add(this.playerGroup);
    }

    // --- Spawn Wave of Enemies ---
    private spawnWave(wave: number) {
        this.currentWave = wave;
        const waveBanner = document.getElementById('current-wave-val');
        if (waveBanner) waveBanner.innerText = wave.toString();

        const tankCount = Math.min(3 + wave, 8);
        const droneCount = wave > 1 ? Math.min(wave, 5) : 0;

        // Clear remaining
        this.enemyTanks.forEach(t => this.scene.remove(t.root));
        this.enemyDrones.forEach(d => this.scene.remove(d.root));
        this.enemyTanks = [];
        this.enemyDrones = [];

        // Spawn Enemy Tanks
        for (let i = 0; i < tankCount; i++) {
            const angle = (i / tankCount) * Math.PI * 2 + Math.random() * 0.4;
            const dist = 55 + Math.random() * 60;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            this.createEnemyTank(new THREE.Vector3(x, 0, z));
        }

        // Spawn Enemy Drones
        for (let i = 0; i < droneCount; i++) {
            const angle = (i / droneCount) * Math.PI * 2;
            const dist = 40 + Math.random() * 40;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            this.createEnemyDrone(new THREE.Vector3(x, 14 + Math.random() * 6, z));
        }

        this.updateHUD();
    }

    private createEnemyTank(pos: THREE.Vector3) {
        const root = new THREE.Group();
        root.position.copy(pos);

        // Hull (Red/Crimson Camo)
        const hullMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.6, metalness: 0.4 });
        const hull = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.4, 6.2), hullMat);
        hull.position.y = 1.2;
        hull.castShadow = true;
        hull.receiveShadow = true;
        root.add(hull);

        // Treads
        const treadMat = new THREE.MeshStandardMaterial({ color: 0x18181b });
        const lt = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 6.8), treadMat);
        lt.position.set(-2.3, 0.6, 0);
        root.add(lt);

        const rt = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 6.8), treadMat);
        rt.position.set(2.3, 0.6, 0);
        root.add(rt);

        // Turret
        const turret = new THREE.Group();
        turret.position.set(0, 2.0, 0);
        const turretDome = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.1, 3.4), hullMat);
        turretDome.position.set(0, 0.5, -0.3);
        turretDome.castShadow = true;
        turret.add(turretDome);

        // Barrel
        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.8 });
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 4.4, 12), barrelMat);
        barrel.rotation.x = -Math.PI / 2;
        barrel.position.set(0, 0.5, 2.5);
        barrel.castShadow = true;
        turret.add(barrel);

        root.add(turret);

        // 3D Health Bar Billboard above tank
        const hpBarCanvas = document.createElement('canvas');
        hpBarCanvas.width = 64;
        hpBarCanvas.height = 8;
        const hpTex = new THREE.CanvasTexture(hpBarCanvas);
        const hpMat = new THREE.SpriteMaterial({ map: hpTex });
        const hpSprite = new THREE.Sprite(hpMat);
        hpSprite.scale.set(4, 0.6, 1);
        hpSprite.position.set(0, 4.2, 0);
        root.add(hpSprite);

        this.scene.add(root);

        this.enemyTanks.push({
            root,
            turret,
            barrel,
            hp: 60 + this.currentWave * 15,
            maxHp: 60 + this.currentWave * 15,
            speed: 6.5 + Math.random() * 2,
            state: 'patrol',
            targetPos: new THREE.Vector3(pos.x, 0, pos.z),
            reloadTimer: Math.random() * 2,
            patrolAngle: Math.random() * Math.PI * 2,
            isDestroyed: false
        });
    }

    private createEnemyDrone(pos: THREE.Vector3) {
        const root = new THREE.Group();
        root.position.copy(pos);

        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, metalness: 0.7, roughness: 0.3 });
        const body = new THREE.Mesh(new THREE.OctahedronGeometry(1.2), bodyMat);
        body.castShadow = true;
        root.add(body);

        // Glowing Eye Sensor
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), eyeMat);
        eye.position.set(0, 0, 1.0);
        root.add(eye);

        // Rotors
        const rotorMat = new THREE.MeshStandardMaterial({ color: 0x27272a });
        const rotors: THREE.Mesh[] = [];
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 2.2), bodyMat);
            arm.rotation.y = angle;
            root.add(arm);

            const blade = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.2), rotorMat);
            blade.position.set(Math.cos(angle) * 1.5, 0.3, Math.sin(angle) * 1.5);
            root.add(blade);
            rotors.push(blade);
        }

        this.scene.add(root);

        this.enemyDrones.push({
            root,
            rotors,
            hp: 35 + this.currentWave * 10,
            maxHp: 35 + this.currentWave * 10,
            speed: 12 + Math.random() * 4,
            orbitAngle: Math.random() * Math.PI * 2,
            reloadTimer: Math.random() * 2,
            isDestroyed: false
        });
    }

    // --- Input & Controls ---
    private setupInputListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            if (e.code === 'Space' || e.code === 'KeyE') {
                this.fireCannon();
            }
            if (e.code === 'KeyR') {
                this.useRepairKit();
            }
            if (e.code === 'KeyF') {
                this.triggerAirstrike();
            }
            if (e.code === 'Digit1') this.selectWeapon('cannon');
            if (e.code === 'Digit2') this.selectWeapon('mg');
            if (e.code === 'Digit3') this.selectWeapon('airstrike');
            if (e.code === 'Digit4') this.selectWeapon('repair');
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        window.addEventListener('mousemove', (e) => {
            this.mouseScreenPos.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouseScreenPos.y = -(e.clientY / window.innerHeight) * 2 + 1;

            // Move Crosshair UI
            const crosshair = document.getElementById('crosshair');
            if (crosshair) {
                crosshair.style.left = `${e.clientX}px`;
                crosshair.style.top = `${e.clientY}px`;
            }
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left Click
                this.fireCannon();
            } else if (e.button === 2) { // Right Click
                this.fireMachineGun();
            }
        });

        window.addEventListener('contextmenu', (e) => e.preventDefault());

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Mobile Controls setup
        this.setupMobileControls();
    }

    private setupMobileControls() {
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const mobileControls = document.getElementById('mobile-controls');
        if (isTouch && mobileControls) {
            mobileControls.style.display = 'flex';
        }

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

        document.getElementById('m-btn-fire')?.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.fireCannon();
        });

        document.getElementById('m-btn-mg')?.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.fireMachineGun();
        });
    }

    private setupUI() {
        // Sound toggle
        const soundBtn = document.getElementById('btn-sound-toggle');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                const muted = warAudio.toggleMute();
                soundBtn.innerText = muted ? '🔇 Sound: OFF' : '🔊 Sound: ON';
                soundBtn.style.color = muted ? '#e74c3c' : '#ffffff';
            });
        }

        // Help Modal
        const helpModal = document.getElementById('modal-help');
        document.getElementById('btn-open-help')?.addEventListener('click', () => {
            if (helpModal) helpModal.style.display = 'flex';
        });
        document.getElementById('btn-close-help')?.addEventListener('click', () => {
            if (helpModal) helpModal.style.display = 'none';
        });

        // Weapons click selection
        document.getElementById('weapon-cannon')?.addEventListener('click', () => this.selectWeapon('cannon'));
        document.getElementById('weapon-mg')?.addEventListener('click', () => this.selectWeapon('mg'));
        document.getElementById('weapon-airstrike')?.addEventListener('click', () => this.selectWeapon('airstrike'));
        document.getElementById('weapon-repair')?.addEventListener('click', () => this.selectWeapon('repair'));

        // Restart Game Button
        document.getElementById('btn-restart-game')?.addEventListener('click', () => {
            const gameOverModal = document.getElementById('game-over-modal');
            if (gameOverModal) gameOverModal.style.display = 'none';
            this.isGameOver = false;
            this.playerHp = this.maxPlayerHp;
            this.spawnWave(this.currentWave + 1);
        });
    }

    private selectWeapon(type: 'cannon' | 'mg' | 'airstrike' | 'repair') {
        document.querySelectorAll('.weapon-card').forEach(c => c.classList.remove('active'));
        if (type === 'cannon') {
            document.getElementById('weapon-cannon')?.classList.add('active');
        } else if (type === 'mg') {
            document.getElementById('weapon-mg')?.classList.add('active');
            this.fireMachineGun();
        } else if (type === 'airstrike') {
            document.getElementById('weapon-airstrike')?.classList.add('active');
            this.triggerAirstrike();
        } else if (type === 'repair') {
            document.getElementById('weapon-repair')?.classList.add('active');
            this.useRepairKit();
        }
    }

    // --- Weapons & Combat Actions ---
    private fireCannon() {
        if (this.cannonReloadTimer > 0 || this.isGameOver) return;
        this.cannonReloadTimer = this.cannonReloadTime;
        this.recoilOffset = 0.6; // Barrel recoil kickback

        // Spawn Projectile Shell
        const shellGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8);
        const shellMat = new THREE.MeshBasicMaterial({ color: 0xffd32a });
        const shell = new THREE.Mesh(shellGeo, shellMat);

        // Muzzle position in world coordinates
        const muzzlePos = new THREE.Vector3(0, 0.6, 5.2);
        this.playerTurret.localToWorld(muzzlePos);
        shell.position.copy(muzzlePos);

        // Direction towards mouse aim target
        const dir = new THREE.Vector3().subVectors(this.mouseAimTarget, muzzlePos).normalize();
        dir.y += 0.04; // Slight ballistic arch
        shell.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

        this.scene.add(shell);
        this.projectiles.push({
            mesh: shell,
            velocity: dir.multiplyScalar(95),
            damage: 60,
            isPlayer: true,
            life: 3.0,
            isCannon: true
        });

        // Muzzle Flash Effect & Audio
        this.createExplosion(muzzlePos, 0.8, 10, true);
        warAudio.playCannonShot();
    }

    private fireMachineGun() {
        if (this.mgAmmo <= 0 || this.isGameOver) return;
        this.mgAmmo--;

        const bulletGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6);
        const bulletMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
        const bullet = new THREE.Mesh(bulletGeo, bulletMat);

        const mgPos = new THREE.Vector3(-0.8, 1.2, 1.8);
        this.playerTurret.localToWorld(mgPos);
        bullet.position.copy(mgPos);

        const spread = (Math.random() - 0.5) * 0.05;
        const dir = new THREE.Vector3().subVectors(this.mouseAimTarget, mgPos).normalize();
        dir.x += spread;
        dir.z += spread;
        bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

        this.scene.add(bullet);
        this.projectiles.push({
            mesh: bullet,
            velocity: dir.multiplyScalar(150),
            damage: 15,
            isPlayer: true,
            life: 1.5,
            isCannon: false
        });

        warAudio.playMachineGun();
        this.updateHUD();
    }

    private triggerAirstrike() {
        if (this.airstrikeCooldown > 0 || this.isGameOver) return;
        this.airstrikeCooldown = 25; // 25s cooldown

        warAudio.playAirstrike();

        // 4 Delayed Artillery Shells across enemy locations
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const target = this.enemyTanks.find(t => !t.isDestroyed) || this.enemyDrones.find(d => !d.isDestroyed);
                const impactPos = target
                    ? target.root.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10))
                    : this.mouseAimTarget.clone().add(new THREE.Vector3((Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 20));

                this.createExplosion(impactPos, 3.5, 35, false);

                // Damage all enemies in blast radius
                this.enemyTanks.forEach(t => {
                    if (!t.isDestroyed && t.root.position.distanceTo(impactPos) < 18) {
                        this.damageEnemyTank(t, 80);
                    }
                });
                this.enemyDrones.forEach(d => {
                    if (!d.isDestroyed && d.root.position.distanceTo(impactPos) < 22) {
                        this.damageEnemyDrone(d, 80);
                    }
                });
            }, 800 + i * 250);
        }
    }

    private useRepairKit() {
        if (this.repairKits <= 0 || this.playerHp >= this.maxPlayerHp || this.isGameOver) return;
        this.repairKits--;
        this.playerHp = Math.min(this.maxPlayerHp, this.playerHp + 50);
        warAudio.playRepair();
        this.updateHUD();
    }

    // --- Damage & Destruction ---
    private damageEnemyTank(tank: EnemyTank, damage: number) {
        tank.hp -= damage;
        warAudio.playHit();

        // Flash red
        tank.root.traverse(obj => {
            if ((obj as THREE.Mesh).material) {
                const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
                if (mat.color) mat.color.setHex(0xffffff);
            }
        });
        setTimeout(() => {
            tank.root.traverse(obj => {
                if ((obj as THREE.Mesh).material) {
                    const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
                    if (mat.color) mat.color.setHex(0x7f1d1d);
                }
            });
        }, 80);

        if (tank.hp <= 0 && !tank.isDestroyed) {
            tank.isDestroyed = true;
            this.createExplosion(tank.root.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 3.0, 30, false);
            this.scene.remove(tank.root);

            this.kills++;
            this.score += 250;
            this.awardYards(25);
            this.checkWaveProgress();
        }
    }

    private damageEnemyDrone(drone: EnemyDrone, damage: number) {
        drone.hp -= damage;
        warAudio.playHit();

        if (drone.hp <= 0 && !drone.isDestroyed) {
            drone.isDestroyed = true;
            this.createExplosion(drone.root.position.clone(), 2.2, 25, false);
            this.scene.remove(drone.root);

            this.kills++;
            this.score += 180;
            this.awardYards(15);
            this.checkWaveProgress();
        }
    }

    private damagePlayer(damage: number) {
        if (this.isGameOver) return;
        this.playerHp = Math.max(0, this.playerHp - damage);
        warAudio.playHit();
        this.updateHUD();

        // Screen shake
        this.camera.position.x += (Math.random() - 0.5) * 1.5;
        this.camera.position.y += (Math.random() - 0.5) * 1.5;

        if (this.playerHp <= 0) {
            this.isGameOver = true;
            this.createExplosion(this.playerPosition.clone().add(new THREE.Vector3(0, 1.5, 0)), 4.0, 50, false);
            this.showGameOver(false);
        }
    }

    private awardYards(amount: number) {
        this.yardsEarned += amount;
        yardService.addYards(amount);
        this.updateHUD();
    }

    private checkWaveProgress() {
        const remainingTanks = this.enemyTanks.filter(t => !t.isDestroyed).length;
        const remainingDrones = this.enemyDrones.filter(d => !d.isDestroyed).length;
        const totalRemaining = remainingTanks + remainingDrones;

        const leftEl = document.getElementById('wave-enemies-left');
        if (leftEl) leftEl.innerText = `Enemies Remaining: ${totalRemaining}`;

        if (totalRemaining === 0 && !this.isGameOver) {
            // Wave Clear Victory!
            warAudio.playVictory();
            this.awardYards(150);
            this.score += 1000;
            this.showGameOver(true);
        }
    }

    private showGameOver(victory: boolean) {
        const modal = document.getElementById('game-over-modal');
        const icon = document.getElementById('game-over-icon');
        const title = document.getElementById('game-over-title');
        const desc = document.getElementById('game-over-desc');
        const finalScore = document.getElementById('final-score-val');
        const finalKills = document.getElementById('final-kills-val');
        const finalYards = document.getElementById('final-yards-val');

        if (modal && title && desc && finalScore && finalKills && finalYards) {
            modal.style.display = 'flex';
            if (victory) {
                if (icon) icon.innerText = '🏆';
                title.innerText = `WAVE ${this.currentWave} VICTORY!`;
                title.style.color = '#ffd32a';
                desc.innerText = 'Superb armored warfare tactics! You eliminated all hostile threats.';
            } else {
                if (icon) icon.innerText = '💥';
                title.innerText = 'TANK DESTROYED IN COMBAT';
                title.style.color = '#ff4757';
                desc.innerText = 'Your armor was compromised by hostile artillery. Deploy reinforcements and try again!';
            }
            finalScore.innerText = this.score.toString();
            finalKills.innerText = this.kills.toString();
            finalYards.innerText = `+${this.yardsEarned} YARDS`;
        }
    }

    // --- Particle System & Explosions ---
    private createExplosion(pos: THREE.Vector3, scale = 2.0, count = 20, isMuzzle = false) {
        warAudio.playExplosion();

        for (let i = 0; i < count; i++) {
            const size = (0.3 + Math.random() * 0.8) * scale;
            const geo = new THREE.DodecahedronGeometry(size);
            const mat = new THREE.MeshBasicMaterial({
                color: isMuzzle ? (Math.random() > 0.5 ? 0xffd32a : 0xff7675) : (Math.random() > 0.4 ? 0xff4757 : 0xffa502),
                transparent: true,
                opacity: 0.95
            });
            const pMesh = new THREE.Mesh(geo, mat);
            pMesh.position.copy(pos);

            const speed = (5 + Math.random() * 20) * (isMuzzle ? 0.5 : 1.0);
            const dir = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 1.8 + 0.2,
                (Math.random() - 0.5) * 2
            ).normalize();

            this.scene.add(pMesh);
            this.particles.push({
                mesh: pMesh,
                velocity: dir.multiplyScalar(speed),
                life: 0.6 + Math.random() * 0.5,
                maxLife: 0.6 + Math.random() * 0.5,
                colorStart: new THREE.Color(0xffd32a),
                colorEnd: new THREE.Color(0x2f3640),
                sizeStart: size,
                sizeEnd: 0.1
            });
        }
    }

    // --- Update HUD ---
    private updateHUD() {
        const hpText = document.getElementById('hp-text');
        const hpBar = document.getElementById('hp-bar');
        const reloadText = document.getElementById('reload-text');
        const reloadBar = document.getElementById('reload-bar');
        const statScore = document.getElementById('stat-score');
        const statKills = document.getElementById('stat-kills');
        const statYards = document.getElementById('stat-yards');
        const ammoMg = document.getElementById('ammo-mg');
        const countRepair = document.getElementById('count-repair');
        const cdAirstrike = document.getElementById('cooldown-airstrike');

        if (hpText && hpBar) {
            hpText.innerText = `${Math.round(this.playerHp)} / ${this.maxPlayerHp}`;
            const pct = Math.max(0, (this.playerHp / this.maxPlayerHp) * 100);
            hpBar.style.width = `${pct}%`;
            if (pct < 30) hpBar.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
            else if (pct < 60) hpBar.style.background = 'linear-gradient(90deg, #ffd32a, #f39c12)';
            else hpBar.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
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

        if (statScore) statScore.innerText = this.score.toLocaleString();
        if (statKills) statKills.innerText = this.kills.toString();
        if (statYards) statYards.innerText = yardService.getYards().toLocaleString();
        if (ammoMg) ammoMg.innerText = `${this.mgAmmo} rds`;
        if (countRepair) countRepair.innerText = `${this.repairKits} Left`;
        if (cdAirstrike) cdAirstrike.innerText = this.airstrikeCooldown > 0 ? `${Math.ceil(this.airstrikeCooldown)}s` : 'READY';
    }

    // --- Radar Minimap Drawing ---
    private renderRadar() {
        if (!this.radarCtx || !this.radarCanvas) return;
        const ctx = this.radarCtx;
        const w = this.radarCanvas.width;
        const h = this.radarCanvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const scale = 0.42;

        ctx.clearRect(0, 0, w, h);

        // Radar background & grid circles
        ctx.fillStyle = 'rgba(13, 20, 30, 0.85)';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(0, 242, 254, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 25, 0, Math.PI * 2);
        ctx.arc(cx, cy, 50, 0, Math.PI * 2);
        ctx.arc(cx, cy, 75, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
        ctx.moveTo(0, cy); ctx.lineTo(w, cy);
        ctx.stroke();

        // Enemy Tanks (Red)
        ctx.fillStyle = '#ff4757';
        this.enemyTanks.forEach(t => {
            if (t.isDestroyed) return;
            const rx = cx + (t.root.position.x - this.playerPosition.x) * scale;
            const ry = cy + (t.root.position.z - this.playerPosition.z) * scale;
            if (rx >= 4 && rx <= w - 4 && ry >= 4 && ry <= h - 4) {
                ctx.beginPath();
                ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Enemy Drones (Yellow)
        ctx.fillStyle = '#ffd32a';
        this.enemyDrones.forEach(d => {
            if (d.isDestroyed) return;
            const rx = cx + (d.root.position.x - this.playerPosition.x) * scale;
            const ry = cy + (d.root.position.z - this.playerPosition.z) * scale;
            if (rx >= 4 && rx <= w - 4 && ry >= 4 && ry <= h - 4) {
                ctx.beginPath();
                ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Player (Cyan triangle pointing forward)
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-this.playerRotation);
        ctx.fillStyle = '#00f2fe';
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(4, 5);
        ctx.lineTo(-4, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // --- Main Game Loop ---
    private animate = () => {
        requestAnimationFrame(this.animate);
        const dt = Math.min(this.clock.getDelta(), 0.1);

        if (!this.isGameOver) {
            this.updatePlayer(dt);
            this.updateEnemies(dt);
            this.updateProjectiles(dt);
            this.updateParticles(dt);
            this.updateCamera();
            this.renderRadar();
            this.updateHUD();
        }

        this.renderer.render(this.scene, this.camera);
    };

    private updatePlayer(dt: number) {
        // Tank Drive Steering
        const turnRate = 2.2;
        const maxSpeed = 16.0;
        const accel = 35.0;
        const drag = 12.0;

        if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
            this.playerRotation += turnRate * dt;
        }
        if (this.keys['KeyD'] || this.keys['ArrowRight']) {
            this.playerRotation -= turnRate * dt;
        }

        if (this.keys['KeyW'] || this.keys['ArrowUp']) {
            this.playerSpeed = Math.min(maxSpeed, this.playerSpeed + accel * dt);
        } else if (this.keys['KeyS'] || this.keys['ArrowDown']) {
            this.playerSpeed = Math.max(-maxSpeed * 0.6, this.playerSpeed - accel * dt);
        } else {
            if (this.playerSpeed > 0) this.playerSpeed = Math.max(0, this.playerSpeed - drag * dt);
            else if (this.playerSpeed < 0) this.playerSpeed = Math.min(0, this.playerSpeed + drag * dt);
        }

        const moveStep = this.playerSpeed * dt;
        const forward = new THREE.Vector3(Math.sin(this.playerRotation), 0, Math.cos(this.playerRotation));
        this.playerPosition.addScaledVector(forward, moveStep);

        // Boundary Clamping
        this.playerPosition.x = Math.max(-160, Math.min(160, this.playerPosition.x));
        this.playerPosition.z = Math.max(-160, Math.min(160, this.playerPosition.z));

        this.playerGroup.position.copy(this.playerPosition);
        this.playerGroup.rotation.y = this.playerRotation;

        // Turret Aim Calculation (Raycast to Ground Plane)
        this.raycaster.setFromCamera(this.mouseScreenPos, this.camera);
        const intersectPoint = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint)) {
            this.mouseAimTarget.copy(intersectPoint);
            const localAim = this.playerGroup.worldToLocal(intersectPoint.clone());
            this.turretTargetAngle = Math.atan2(localAim.x, localAim.z);
        }

        // Smooth Turret Rotation
        let diff = this.turretTargetAngle - this.currentTurretAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.currentTurretAngle += diff * Math.min(1.0, 14.0 * dt);
        this.playerTurret.rotation.y = this.currentTurretAngle;

        // Recoil Recovery
        if (this.recoilOffset > 0) {
            this.recoilOffset = Math.max(0, this.recoilOffset - dt * 3.0);
            this.playerBarrel.position.z = 2.8 - this.recoilOffset;
        }

        // Reload Timer & Airstrike Cooldown
        if (this.cannonReloadTimer > 0) this.cannonReloadTimer = Math.max(0, this.cannonReloadTimer - dt);
        if (this.airstrikeCooldown > 0) this.airstrikeCooldown = Math.max(0, this.airstrikeCooldown - dt);
    }

    private updateEnemies(dt: number) {
        // 1. Enemy Tanks AI
        this.enemyTanks.forEach(tank => {
            if (tank.isDestroyed) return;

            const distToPlayer = tank.root.position.distanceTo(this.playerPosition);

            if (distToPlayer < 75) {
                tank.state = 'attack';
                // Turn towards player
                const toPlayer = new THREE.Vector3().subVectors(this.playerPosition, tank.root.position).normalize();
                const targetRot = Math.atan2(toPlayer.x, toPlayer.z);

                let curRot = tank.root.rotation.y;
                let rotDiff = targetRot - curRot;
                while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
                while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
                tank.root.rotation.y += rotDiff * Math.min(1.0, 2.0 * dt);

                // Move closer if far, or strafe
                if (distToPlayer > 30) {
                    tank.root.position.addScaledVector(toPlayer, tank.speed * dt);
                }

                // Aim Turret at player
                tank.turret.rotation.y = 0; // Aligned with hull

                // Shoot at player
                tank.reloadTimer -= dt;
                if (tank.reloadTimer <= 0 && distToPlayer < 65) {
                    tank.reloadTimer = 2.5 + Math.random() * 1.5;
                    this.fireEnemyShell(tank.root.position.clone().add(new THREE.Vector3(0, 2.5, 0)), this.playerPosition);
                }
            } else {
                // Patrol
                tank.patrolAngle += 0.3 * dt;
                tank.root.rotation.y = tank.patrolAngle;
                const forward = new THREE.Vector3(Math.sin(tank.patrolAngle), 0, Math.cos(tank.patrolAngle));
                tank.root.position.addScaledVector(forward, tank.speed * 0.4 * dt);
            }
        });

        // 2. Enemy Drones AI
        this.enemyDrones.forEach(drone => {
            if (drone.isDestroyed) return;

            // Spin Rotors
            drone.rotors.forEach(r => r.rotation.y += 25 * dt);

            // Orbit around battlefield
            drone.orbitAngle += (drone.speed / 50) * dt;
            drone.root.position.x = Math.cos(drone.orbitAngle) * 55;
            drone.root.position.z = Math.sin(drone.orbitAngle) * 55;
            drone.root.position.y = 15 + Math.sin(drone.orbitAngle * 3) * 3;

            drone.root.lookAt(this.playerPosition);

            // Drone Laser Fire
            drone.reloadTimer -= dt;
            if (drone.reloadTimer <= 0) {
                drone.reloadTimer = 1.8 + Math.random();
                this.fireDroneLaser(drone.root.position, this.playerPosition);
            }
        });
    }

    private fireEnemyShell(fromPos: THREE.Vector3, toPos: THREE.Vector3) {
        const shellGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.0, 6);
        const shellMat = new THREE.MeshBasicMaterial({ color: 0xff4757 });
        const shell = new THREE.Mesh(shellGeo, shellMat);
        shell.position.copy(fromPos);

        const dir = new THREE.Vector3().subVectors(toPos, fromPos).normalize();
        shell.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

        this.scene.add(shell);
        this.projectiles.push({
            mesh: shell,
            velocity: dir.multiplyScalar(75),
            damage: 22,
            isPlayer: false,
            life: 3.0,
            isCannon: true
        });

        warAudio.playCannonShot();
    }

    private fireDroneLaser(fromPos: THREE.Vector3, toPos: THREE.Vector3) {
        const laserGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 4);
        const laserMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
        const laser = new THREE.Mesh(laserGeo, laserMat);
        laser.position.copy(fromPos);

        const dir = new THREE.Vector3().subVectors(toPos, fromPos).normalize();
        laser.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

        this.scene.add(laser);
        this.projectiles.push({
            mesh: laser,
            velocity: dir.multiplyScalar(100),
            damage: 10,
            isPlayer: false,
            life: 2.0,
            isCannon: false
        });

        warAudio.playMachineGun();
    }

    private updateProjectiles(dt: number) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.life -= dt;
            p.mesh.position.addScaledVector(p.velocity, dt);

            // Ground Collision
            if (p.mesh.position.y <= 0.2 || p.life <= 0) {
                this.createExplosion(p.mesh.position, p.isCannon ? 1.5 : 0.4, p.isCannon ? 12 : 3, false);
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
                continue;
            }

            // Player Projectile Hit Tests against Enemies
            if (p.isPlayer) {
                let hit = false;
                for (let tank of this.enemyTanks) {
                    if (!tank.isDestroyed && p.mesh.position.distanceTo(tank.root.position) < 3.2) {
                        this.damageEnemyTank(tank, p.damage);
                        hit = true;
                        break;
                    }
                }
                if (!hit) {
                    for (let drone of this.enemyDrones) {
                        if (!drone.isDestroyed && p.mesh.position.distanceTo(drone.root.position) < 2.5) {
                            this.damageEnemyDrone(drone, p.damage);
                            hit = true;
                            break;
                        }
                    }
                }
                if (hit) {
                    this.createExplosion(p.mesh.position, p.isCannon ? 1.8 : 0.6, p.isCannon ? 15 : 4, false);
                    this.scene.remove(p.mesh);
                    this.projectiles.splice(i, 1);
                    continue;
                }
            } else {
                // Enemy Projectile Hit Test against Player
                if (p.mesh.position.distanceTo(this.playerPosition) < 3.0) {
                    this.damagePlayer(p.damage);
                    this.createExplosion(p.mesh.position, 1.5, 12, false);
                    this.scene.remove(p.mesh);
                    this.projectiles.splice(i, 1);
                    continue;
                }
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
            const currentSize = THREE.MathUtils.lerp(p.sizeStart, p.sizeEnd, progress);
            p.mesh.scale.set(currentSize, currentSize, currentSize);

            const mat = p.mesh.material as THREE.MeshBasicMaterial;
            if (mat) {
                mat.opacity = (p.life / p.maxLife) * 0.9;
                mat.color.lerpColors(p.colorStart, p.colorEnd, progress);
            }
        }
    }

    private updateCamera() {
        // Third-person combat camera tracking tank
        const camOffset = new THREE.Vector3(
            -Math.sin(this.playerRotation) * 22,
            12,
            -Math.cos(this.playerRotation) * 22
        );
        const desiredCamPos = this.playerPosition.clone().add(camOffset);
        this.camera.position.lerp(desiredCamPos, 0.1);
        this.camera.lookAt(this.playerPosition.clone().add(new THREE.Vector3(0, 2.5, 0)));
    }
}

// Initialise Game Engine
window.addEventListener('DOMContentLoaded', () => {
    new WarGameEngine();
});
