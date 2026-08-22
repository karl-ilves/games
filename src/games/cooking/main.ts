import * as THREE from 'three';
import { getCurrentUserProfile } from '../../auth';
import { yardService } from '../../shared/yardService';
import { kitchenAudio } from './audio';

const ADMIN_EMAIL = '1karl.ilves@gmail.com';

interface OrderItem {
    id: string;
    recipeKey: string;
    title: string;
    titleEn: string;
    icon: string;
    requiredIngredients: string[];
    maxPatience: number; // seconds
    currentPatience: number;
    yardReward: number;
    scoreReward: number;
}

interface IngredientDef {
    id: string;
    nameEt: string;
    nameEn: string;
    icon: string;
    category: 'raw' | 'pantry' | 'cooked' | 'chopped' | 'sauce';
    chopResult?: string;
    cookResult?: string;
}

const INGREDIENTS: Record<string, IngredientDef> = {
    // Pantry base
    'bun_bottom': { id: 'bun_bottom', nameEt: 'Burgerisai (Alumine)', nameEn: 'Bottom Bun', icon: '🍞', category: 'pantry' },
    'bun_top': { id: 'bun_top', nameEt: 'Burgerisai (Ülemine)', nameEn: 'Top Bun', icon: '🍔', category: 'pantry' },
    'pizza_dough': { id: 'pizza_dough', nameEt: 'Pitsapõhi', nameEn: 'Pizza Dough', icon: '🫓', category: 'pantry' },
    'tomato_sauce': { id: 'tomato_sauce', nameEt: 'Tomatikaste', nameEn: 'Tomato Sauce', icon: '🥫', category: 'sauce' },
    'salt_sauce': { id: 'salt_sauce', nameEt: 'Sool & Kaste', nameEn: 'Salt & Sauce', icon: '🧂', category: 'sauce' },
    
    // Raw for chopping
    'raw_tomato': { id: 'raw_tomato', nameEt: 'Terve Tomat', nameEn: 'Raw Tomato', icon: '🍅', category: 'raw', chopResult: 'tomato_chopped' },
    'raw_cheese': { id: 'raw_cheese', nameEt: 'Juustuplokk', nameEn: 'Cheese Block', icon: '🧀', category: 'raw', chopResult: 'cheese_slice' },
    'raw_lettuce': { id: 'raw_lettuce', nameEt: 'Salatipea', nameEn: 'Lettuce Head', icon: '🥬', category: 'raw', chopResult: 'lettuce_chopped' },
    'raw_onion': { id: 'raw_onion', nameEt: 'Sibul', nameEn: 'Raw Onion', icon: '🧅', category: 'raw', chopResult: 'onion_chopped' },
    'raw_mushrooms': { id: 'raw_mushrooms', nameEt: 'Seened', nameEn: 'Mushrooms', icon: '🍄', category: 'raw', chopResult: 'mushrooms_chopped' },
    'raw_pepperoni': { id: 'raw_pepperoni', nameEt: 'Pepperoni vorst', nameEn: 'Pepperoni Sausage', icon: '🍖', category: 'raw', chopResult: 'pepperoni_chopped' },

    // Chopped items
    'tomato_chopped': { id: 'tomato_chopped', nameEt: 'Viilutatud Tomat', nameEn: 'Sliced Tomato', icon: '🍅', category: 'chopped' },
    'cheese_slice': { id: 'cheese_slice', nameEt: 'Juustuviil', nameEn: 'Cheese Slice', icon: '🧀', category: 'chopped' },
    'lettuce_chopped': { id: 'lettuce_chopped', nameEt: 'Hakitud Salat', nameEn: 'Chopped Lettuce', icon: '🥗', category: 'chopped' },
    'onion_chopped': { id: 'onion_chopped', nameEt: 'Sibularõngad', nameEn: 'Onion Rings', icon: '🧅', category: 'chopped' },
    'mushrooms_chopped': { id: 'mushrooms_chopped', nameEt: 'Viilutatud Seened', nameEn: 'Sliced Mushrooms', icon: '🍄', category: 'chopped' },
    'pepperoni_chopped': { id: 'pepperoni_chopped', nameEt: 'Pepperoni Viilud', nameEn: 'Pepperoni Slices', icon: '🍕', category: 'chopped' },

    // Raw for cooking / stove
    'raw_patty': { id: 'raw_patty', nameEt: 'Toores Pihv', nameEn: 'Raw Patty', icon: '🥩', category: 'raw', cookResult: 'cooked_patty' },
    'raw_steak': { id: 'raw_steak', nameEt: 'Toores Praelõik', nameEn: 'Raw Steak', icon: '🥩', category: 'raw', cookResult: 'cooked_steak' },
    'raw_pasta': { id: 'raw_pasta', nameEt: 'Kuiv Pasta', nameEn: 'Dry Pasta', icon: '🍝', category: 'raw', cookResult: 'boiled_pasta' },

    // Cooked items
    'cooked_patty': { id: 'cooked_patty', nameEt: 'Praetud Pihv', nameEn: 'Grilled Patty', icon: '🍔', category: 'cooked' },
    'cooked_steak': { id: 'cooked_steak', nameEt: 'Mahlane Steak', nameEn: 'Juicy Steak', icon: '🥩', category: 'cooked' },
    'boiled_pasta': { id: 'boiled_pasta', nameEt: 'Keedetud Pasta', nameEn: 'Boiled Pasta', icon: '🍝', category: 'cooked' },
    'baked_in_oven': { id: 'baked_in_oven', nameEt: 'Ahjus Küpsetatud', nameEn: 'Baked in Oven', icon: '🔥', category: 'cooked' },
};

const RECIPES = [
    {
        key: 'cheeseburger',
        title: 'Mahlane Juustuburger',
        titleEn: 'Deluxe Cheeseburger',
        icon: '🍔',
        ingredients: ['bun_bottom', 'cooked_patty', 'cheese_slice', 'lettuce_chopped', 'tomato_chopped', 'bun_top'],
        yardReward: 20,
        scoreReward: 200,
        patience: 80
    },
    {
        key: 'double_burger',
        title: 'Topelt Juustuburger Sibulaga',
        titleEn: 'Double Bacon & Onion Burger',
        icon: '🍔',
        ingredients: ['bun_bottom', 'cooked_patty', 'cheese_slice', 'cooked_patty', 'cheese_slice', 'onion_chopped', 'bun_top'],
        yardReward: 30,
        scoreReward: 300,
        patience: 90
    },
    {
        key: 'pepperoni_pizza',
        title: 'Krõbe Pepperoni Pitsa',
        titleEn: 'Crispy Pepperoni Pizza',
        icon: '🍕',
        ingredients: ['pizza_dough', 'tomato_sauce', 'cheese_slice', 'pepperoni_chopped', 'baked_in_oven'],
        yardReward: 35,
        scoreReward: 350,
        patience: 100
    },
    {
        key: 'steak_deluxe',
        title: 'Peakoka Mahlane Steak & Seened',
        titleEn: 'Chef Gourmet Steak & Veggies',
        icon: '🥩',
        ingredients: ['cooked_steak', 'mushrooms_chopped', 'tomato_chopped', 'lettuce_chopped'],
        yardReward: 40,
        scoreReward: 400,
        patience: 90
    },
    {
        key: 'pasta_bolognese',
        title: 'Pasta Bolognese Juustuga',
        titleEn: 'Pasta Bolognese with Cheese',
        icon: '🍝',
        ingredients: ['boiled_pasta', 'tomato_sauce', 'cooked_patty', 'cheese_slice'],
        yardReward: 30,
        scoreReward: 300,
        patience: 90
    }
];

class CookingGame {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private food3DGroup: THREE.Group;
    private steamParticles: THREE.Points;
    private steamGeo: THREE.BufferGeometry;

    // Game state
    private score: number = 0;
    private streakPoints: number = 0;
    private combo: number = 1;
    private completedOrders: number = 0;
    private currentPlate: string[] = [];
    private activeOrders: OrderItem[] = [];
    private maxConcurrentOrders: number = 3;
    private orderIdCounter: number = 1;

    // Chopping state
    private currentChoppingRaw: string | null = null;
    private choppingClicks: number = 0;
    private requiredChoppingClicks: number = 5;
    private knife3D: THREE.Mesh | null = null;

    // Stove Pans state - 5 parallel cooking slots
    private pans = [
        { id: 0, nameEt: 'Pann 1 (Grill)', nameEn: 'Pan 1 (Grill)', holding: null as string | null, progress: 0, washProgress: 0, state: 'empty' as 'empty' | 'cooking' | 'done' | 'burned' | 'washing' },
        { id: 1, nameEt: 'Pann 2 (Grill)', nameEn: 'Pan 2 (Grill)', holding: null as string | null, progress: 0, washProgress: 0, state: 'empty' as 'empty' | 'cooking' | 'done' | 'burned' | 'washing' },
        { id: 2, nameEt: 'Pann 3 (Grill)', nameEn: 'Pan 3 (Grill)', holding: null as string | null, progress: 0, washProgress: 0, state: 'empty' as 'empty' | 'cooking' | 'done' | 'burned' | 'washing' },
        { id: 3, nameEt: 'Pott 1 (Keetmine)', nameEn: 'Pot 1 (Boiling)', holding: null as string | null, progress: 0, washProgress: 0, state: 'empty' as 'empty' | 'cooking' | 'done' | 'burned' | 'washing' },
        { id: 4, nameEt: 'Pann 4 (Grill)', nameEn: 'Pan 4 (Grill)', holding: null as string | null, progress: 0, washProgress: 0, state: 'empty' as 'empty' | 'cooking' | 'done' | 'burned' | 'washing' }
    ];

    // Oven state
    private oven = {
        holding: null as string | null,
        progress: 0,
        state: 'empty' as 'empty' | 'baking' | 'done'
    };

    private isRunning: boolean = true;
    private isEt: boolean = false;

    public getName(id: string): string {
        const ing = INGREDIENTS[id];
        if (!ing) return id;
        return this.isEt ? ing.nameEt : ing.nameEn;
    }

    public getRecipeTitle(recipe: typeof RECIPES[0] | OrderItem): string {
        return this.isEt ? recipe.title : recipe.titleEn;
    }

    constructor() {
        // 1. VIP / Permission check
        const profile = getCurrentUserProfile();
        const isAdmin = !!profile?.email && profile.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
        this.isEt = isAdmin; // Estonian only for Admin, English for everyone else!

        const vipOverlay = document.getElementById('vip-restricted-overlay');
        if (!isAdmin) {
            if (vipOverlay) vipOverlay.style.display = 'flex';
            console.warn("Cooking game restricted: not administrator");
            return;
        } else {
            if (vipOverlay) vipOverlay.style.display = 'none';
        }

        // 2. Setup 3D Scene
        const container = document.getElementById('canvas-container');
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a2530);
        this.scene.fog = new THREE.FogExp2(0x1a2530, 0.025);

        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 3.6, 5.0);
        this.camera.lookAt(0, 1.3, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        if (container) {
            container.appendChild(this.renderer.domElement);
        }

        // Global access for bulletproof onclick handlers
        (window as any).cookingGame = this;

        this.food3DGroup = new THREE.Group();
        this.scene.add(this.food3DGroup);

        this.applyLocalization();
        this.build3DKitchen();
        this.setupSteamParticles();
        this.setupUI();
        this.setupEventListeners();
        this.updateYardDisplay();
        yardService.subscribe(() => this.updateYardDisplay());

        // Start Order Generation & Game Loop
        this.spawnOrder();
        this.spawnOrder();
        
        setInterval(() => this.tickCooking(), 100);
        setInterval(() => this.tickOrders(), 1000);

        window.addEventListener('resize', () => this.onWindowResize());
        this.animate();
    }

    private applyLocalization() {
        const isEt = this.isEt;

        // Top HUD
        const backHub = document.querySelector('#btn-back-hub span:last-child');
        if (backHub) backHub.textContent = isEt ? 'Pealeht / Hub' : 'Back to Hub';

        const hudScoreLabel = document.getElementById('hud-score-label');
        if (hudScoreLabel) hudScoreLabel.textContent = isEt ? '⭐ Punktid:' : '⭐ Score:';

        const hudStreakLabel = document.getElementById('hud-streak-label');
        if (hudStreakLabel) hudStreakLabel.textContent = isEt ? '🔥 Seeria (300p = +50 Y):' : '🔥 Streak (300pts = +50 Y):';

        const hudOrdersLabel = document.getElementById('hud-orders-label');
        if (hudOrdersLabel) hudOrdersLabel.textContent = isEt ? '📦 Tellimused:' : '📦 Orders:';

        const hudYardEarnBadge = document.querySelector('.hud-right .hud-stat-box span:last-child');
        if (hudYardEarnBadge) hudYardEarnBadge.textContent = isEt ? '💎 TEENI JARDE SIIN!' : '💎 EARN YARDS HERE!';

        const btnOpenRecipes = document.querySelector('#btn-open-recipes span:last-child');
        if (btnOpenRecipes) btnOpenRecipes.textContent = isEt ? 'Retseptid' : 'Recipes';

        // Orders Header
        const ordersTitle = document.querySelector('.orders-header-title span:last-child');
        if (ordersTitle) ordersTitle.textContent = isEt
            ? 'Aktiivsed Klienditellimused (Valmista retsepti järgi ja teeni Jarde):'
            : 'Active Customer Orders (Follow recipes and earn Yards):';

        // Station Tabs
        const tabAssembly = document.querySelector('#tab-btn-assembly span:last-child');
        if (tabAssembly) tabAssembly.textContent = isEt ? '1. Taldrik & Komplekteerimine' : '1. Plate Assembly';

        const tabStove = document.querySelector('#tab-btn-stove span:last-child');
        if (tabStove) tabStove.textContent = isEt ? '2. PLIIT & PRAADIMINE (KÜPSETA SIIN!)' : '2. STOVE & FRYING (COOK HERE!)';

        const tabOven = document.querySelector('#tab-btn-oven span:last-child');
        if (tabOven) tabOven.textContent = isEt ? '3. KÜPSETUSAHI (KÜPSETA PITSA!)' : '3. BAKING OVEN (BAKE PIZZA!)';

        const tabCutting = document.querySelector('#tab-btn-cutting span:last-child');
        if (tabCutting) tabCutting.textContent = isEt ? '4. Lõikelaud (Haki toorained)' : '4. Cutting Board (Chop items)';

        // Station 1: Assembly
        const plateTitle = document.querySelector('.plate-assembly-row strong');
        if (plateTitle) plateTitle.textContent = isEt ? 'Sinu Taldrik:' : 'Your Plate:';

        const plateEmpty = document.getElementById('plate-empty-msg');
        if (plateEmpty) plateEmpty.textContent = isEt
            ? 'Taldrik on tühi. Vali sahvrist koostisosi või võta valminud toidud pliidilt/lõikelaualt!'
            : 'Plate is empty. Pick ingredients from pantry or take cooked/sliced food from stations!';

        const clearBtn = document.getElementById('btn-clear-plate');
        if (clearBtn) clearBtn.textContent = isEt ? '🗑️ Tühjenda' : '🗑️ Clear Plate';

        const serveBtnText = document.querySelector('#btn-serve-dish span:last-child');
        if (serveBtnText) serveBtnText.textContent = isEt ? 'SERVEERI TOIT!' : 'SERVE DISH!';

        // Station 2: Chopping
        const chopHead = document.querySelector('.chopping-board-box h3');
        if (chopHead) chopHead.textContent = isEt ? '🔪 Lõikelaud & Hakkimise Animatsioon' : '🔪 Cutting Board & Chopping Animation';

        const chopInstruction = document.getElementById('chopping-instruction');
        if (chopInstruction) chopInstruction.textContent = isEt
            ? 'Vali tooraine (Tomat, Juust, Sibul, Salat, Kartul, Seened) ja klõpsa "HAKI!" nuppu viilutamiseks!'
            : 'Select raw item (Tomato, Cheese, Onion, Lettuce, Potato, Mushrooms) and click "CHOP!" rapidly to slice!';

        const chopBtn = document.getElementById('btn-do-chop');
        if (chopBtn) chopBtn.textContent = isEt ? '🔪 HAKI! (Klõpsa kiiresti)' : '🔪 CHOP! (Click rapidly)';

        // Station 3: Stove
        const stoveHead = document.querySelector('#panel-stove h3');
        if (stoveHead) stoveHead.textContent = isEt ? '🔥 Pliit & Praepannid' : '🔥 Stove & Cooking Pans';

        const stoveSub = document.querySelector('#panel-stove .station-panel > div:first-child > div');
        if (stoveSub) stoveSub.textContent = isEt ? 'Pane tooraine pannile ja jälgi, et see ei kõrbeks!' : 'Place raw items in pans and make sure they do not burn!';

        // Station 4: Oven
        const ovenHead = document.querySelector('#panel-oven h3');
        if (ovenHead) ovenHead.textContent = isEt ? '🍕 Küpsetusahi (Pitsa & Pirukad)' : '🍕 Baking Oven (Pizza & Pastries)';

        const ovenSub = document.querySelector('#panel-oven p');
        if (ovenSub) ovenSub.textContent = isEt
            ? 'Valmista pitsapõhi, lisa kaste, juust ja lisandid ning pane ahju küpsema!'
            : 'Prepare pizza crust, add sauce, cheese and toppings, then bake in the oven!';

        // Recipe Modal
        const recipesHead = document.querySelector('#modal-recipes h2');
        if (recipesHead) recipesHead.textContent = isEt ? '📖 Peakoka Retseptiraamat' : '📖 Master Chef Recipe Book';

        const recipesSub = document.querySelector('#modal-recipes p');
        if (recipesSub) recipesSub.textContent = isEt
            ? 'Vaata, milliseid koostisosi on vaja erinevate roogade valmistamiseks!'
            : 'View all recipes and required ingredients to satisfy customer orders!';
    }

    private build3DKitchen() {
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const warmSpot = new THREE.SpotLight(0xffecd2, 2.2);
        warmSpot.position.set(0, 8, 3);
        warmSpot.angle = Math.PI / 3;
        warmSpot.penumbra = 0.4;
        warmSpot.castShadow = true;
        this.scene.add(warmSpot);

        const stoveLight = new THREE.PointLight(0xff793f, 1.5, 5);
        stoveLight.position.set(-2, 2, 0);
        this.scene.add(stoveLight);

        // Kitchen Floor
        const floorGeo = new THREE.PlaneGeometry(30, 30);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x222f3e,
            roughness: 0.3,
            metalness: 0.1
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Back Wall
        const wallGeo = new THREE.PlaneGeometry(30, 10);
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x2c3e50,
            roughness: 0.6
        });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(0, 5, -5);
        this.scene.add(wall);

        // Kitchen Countertop (Main Prep Island)
        const counterGeo = new THREE.BoxGeometry(7, 1.4, 2.5);
        const counterMat = new THREE.MeshStandardMaterial({
            color: 0xdfe6e9,
            metalness: 0.4,
            roughness: 0.2
        });
        const counter = new THREE.Mesh(counterGeo, counterMat);
        counter.position.set(0, 0.7, 0.5);
        counter.castShadow = true;
        counter.receiveShadow = true;
        this.scene.add(counter);

        // Counter Base Wood
        const baseGeo = new THREE.BoxGeometry(6.8, 1.3, 2.3);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x2d3436 });
        const counterBase = new THREE.Mesh(baseGeo, baseMat);
        counterBase.position.set(0, 0.65, 0.5);
        this.scene.add(counterBase);

        // Stainless Steel Stove Surface (Left side of counter)
        const stoveTopGeo = new THREE.BoxGeometry(2.4, 0.05, 1.8);
        const stoveTopMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 });
        const stoveTop = new THREE.Mesh(stoveTopGeo, stoveTopMat);
        stoveTop.position.set(-2, 1.43, 0.5);
        this.scene.add(stoveTop);

        // 2 Stove Burner Rings
        [-0.5, 0.5].forEach(offsetX => {
            const ringGeo = new THREE.TorusGeometry(0.35, 0.04, 16, 32);
            const ringMat = new THREE.MeshStandardMaterial({ color: 0xff5252, emissive: 0xff3838, emissiveIntensity: 0.6 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.set(-2 + offsetX, 1.46, 0.5);
            this.scene.add(ring);
        });

        // Chopping Board (Wood)
        const boardGeo = new THREE.BoxGeometry(1.6, 0.08, 1.2);
        const boardMat = new THREE.MeshStandardMaterial({ color: 0xcd6133, roughness: 0.8 });
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.position.set(1.8, 1.45, 0.5);
        this.scene.add(board);

        // Chef's Knife on Board
        const knifeBladeGeo = new THREE.BoxGeometry(0.8, 0.02, 0.12);
        const knifeBladeMat = new THREE.MeshStandardMaterial({ color: 0xf1f2f6, metalness: 0.9, roughness: 0.1 });
        const knifeBlade = new THREE.Mesh(knifeBladeGeo, knifeBladeMat);
        knifeBlade.position.set(1.9, 1.5, 0.9);
        knifeBlade.rotation.y = 0.3;
        this.knife3D = knifeBlade;
        this.scene.add(knifeBlade);

        // Master Chef Plate in Center
        const plateGeo = new THREE.CylinderGeometry(0.9, 0.7, 0.08, 32);
        const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.1 });
        const plate = new THREE.Mesh(plateGeo, plateMat);
        plate.position.set(0, 1.45, 0.5);
        plate.receiveShadow = true;
        this.scene.add(plate);

        // Service Bell (Golden Bell)
        const bellBaseGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.04, 16);
        const bellBaseMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const bellBase = new THREE.Mesh(bellBaseGeo, bellBaseMat);
        bellBase.position.set(-0.2, 1.44, 1.4);
        this.scene.add(bellBase);

        const bellDomeGeo = new THREE.SphereGeometry(0.16, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const bellDomeMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.9, roughness: 0.2 });
        const bellDome = new THREE.Mesh(bellDomeGeo, bellDomeMat);
        bellDome.position.set(-0.2, 1.46, 1.4);
        this.scene.add(bellDome);
    }

    private setupSteamParticles() {
        const particleCount = 40;
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = -2 + (Math.random() - 0.5) * 0.8;
            positions[i + 1] = 1.6 + Math.random() * 1.5;
            positions[i + 2] = 0.5 + (Math.random() - 0.5) * 0.8;
        }

        this.steamGeo = new THREE.BufferGeometry();
        this.steamGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const steamMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.18,
            transparent: true,
            opacity: 0.45
        });

        this.steamParticles = new THREE.Points(this.steamGeo, steamMat);
        this.scene.add(this.steamParticles);
    }

    private update3DPlateModel() {
        // Clear previous 3D food items
        while (this.food3DGroup.children.length > 0) {
            const obj = this.food3DGroup.children[0];
            this.food3DGroup.remove(obj);
        }

        let currentY = 1.5;

        this.currentPlate.forEach(itemKey => {
            let mesh: THREE.Mesh | null = null;

            if (itemKey === 'bun_bottom') {
                const geo = new THREE.CylinderGeometry(0.65, 0.6, 0.12, 24);
                const mat = new THREE.MeshStandardMaterial({ color: 0xd38e47, roughness: 0.6 });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, currentY + 0.06, 0.5);
                currentY += 0.12;
            } else if (itemKey === 'bun_top') {
                const geo = new THREE.SphereGeometry(0.66, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
                const mat = new THREE.MeshStandardMaterial({ color: 0xcd8237, roughness: 0.5 });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, currentY, 0.5);
                currentY += 0.25;
            } else if (itemKey === 'cooked_patty') {
                const geo = new THREE.CylinderGeometry(0.65, 0.65, 0.14, 24);
                const mat = new THREE.MeshStandardMaterial({ color: 0x4a2311, roughness: 0.8 });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, currentY + 0.07, 0.5);
                currentY += 0.14;
            } else if (itemKey === 'cheese_slice') {
                const geo = new THREE.BoxGeometry(1.0, 0.03, 1.0);
                const mat = new THREE.MeshStandardMaterial({ color: 0xf6b93b });
                mesh = new THREE.Mesh(geo, mat);
                mesh.rotation.y = 0.4;
                mesh.position.set(0, currentY + 0.02, 0.5);
                currentY += 0.04;
            } else if (itemKey === 'tomato_chopped') {
                const geo = new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16);
                const mat = new THREE.MeshStandardMaterial({ color: 0xeb2f06 });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0.15, currentY + 0.02, 0.45);
                currentY += 0.05;
            } else if (itemKey === 'lettuce_chopped') {
                const geo = new THREE.BoxGeometry(0.9, 0.04, 0.9);
                const mat = new THREE.MeshStandardMaterial({ color: 0x78e08f });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, currentY + 0.02, 0.5);
                currentY += 0.05;
            } else if (itemKey === 'onion_chopped') {
                const geo = new THREE.TorusGeometry(0.3, 0.04, 8, 16);
                const mat = new THREE.MeshStandardMaterial({ color: 0xb53471 });
                mesh = new THREE.Mesh(geo, mat);
                mesh.rotation.x = Math.PI / 2;
                mesh.position.set(0, currentY + 0.02, 0.5);
                currentY += 0.05;
            } else if (itemKey === 'pizza_dough' || itemKey === 'baked_in_oven') {
                const geo = new THREE.CylinderGeometry(0.8, 0.8, 0.08, 24);
                const mat = new THREE.MeshStandardMaterial({ color: itemKey === 'baked_in_oven' ? 0xe58e26 : 0xf8c291 });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, currentY + 0.04, 0.5);
                currentY += 0.09;
            } else if (itemKey === 'cooked_steak') {
                const geo = new THREE.BoxGeometry(0.9, 0.15, 0.6);
                const mat = new THREE.MeshStandardMaterial({ color: 0x592815, roughness: 0.7 });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, currentY + 0.08, 0.5);
                currentY += 0.16;
            } else if (itemKey === 'boiled_pasta') {
                const geo = new THREE.SphereGeometry(0.65, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
                const mat = new THREE.MeshStandardMaterial({ color: 0xf8efba });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, currentY, 0.5);
                currentY += 0.2;
            } else if (itemKey === 'fried_crispy' || itemKey === 'potato_chopped') {
                const geo = new THREE.BoxGeometry(0.7, 0.35, 0.7);
                const mat = new THREE.MeshStandardMaterial({ color: 0xf6b93b });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, currentY + 0.15, 0.5);
                currentY += 0.25;
            } else {
                const geo = new THREE.BoxGeometry(0.4, 0.05, 0.4);
                const mat = new THREE.MeshStandardMaterial({ color: 0xffd32a });
                mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, currentY + 0.03, 0.5);
                currentY += 0.06;
            }

            if (mesh) {
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.food3DGroup.add(mesh);
            }
        });
    }

    private switchToStation(station: 'assembly' | 'cutting' | 'stove' | 'oven') {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        const targetTab = document.getElementById(`tab-btn-${station}`);
        if (targetTab) targetTab.classList.add('active');

        document.querySelectorAll('.station-panel').forEach(p => p.classList.remove('active'));
        const panel = document.getElementById(`panel-${station}`);
        if (panel) panel.classList.add('active');
    }

    private setupUI() {
        // Top Yard icon
        const yardIcon = document.getElementById('cooking-yard-icon');
        if (yardIcon) yardIcon.innerHTML = yardService.renderYardSvg(20);

        // Pantry Tray items - Only direct pantry items (buns, dough, sauces)
        const pantryContainer = document.getElementById('pantry-items-grid');
        if (pantryContainer) {
            const isEt = this.isEt;
            pantryContainer.innerHTML = `
                <div style="width: 100%; display: flex; flex-direction: column; gap: 8px;">
                    <div style="background: rgba(46, 213, 115, 0.12); border: 1.5px solid rgba(46, 213, 115, 0.4); border-radius: 12px; padding: 12px 16px;">
                        <div class="category-header" style="color: #2ed573; font-size: 1rem; font-weight: 800; margin-bottom: 8px;">
                            <span>🍞</span> <span>${isEt ? 'SAHVRI TOOTED & KASTMED (Klõpsa otse taldrikule lisamiseks):' : 'PANTRY BASES & SAUCES (Click to add directly to plate):'}</span>
                        </div>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;" id="pantry-group-pantry"></div>
                    </div>
                </div>
            `;
            this.renderPantryItems();
        }

        // Chopping Station Raw Selectors
        const chopRawContainer = document.getElementById('chopping-raw-options');
        if (chopRawContainer) {
            chopRawContainer.innerHTML = '';
            Object.values(INGREDIENTS).filter(i => i.chopResult).forEach(ing => {
                const btn = document.createElement('button');
                btn.className = 'ingredient-btn';
                btn.innerHTML = `
                    <span class="ingredient-icon">${ing.icon}</span>
                    <span class="ingredient-label">${this.getName(ing.id)}</span>
                `;
                btn.addEventListener('click', () => this.startChopping(ing.id));
                chopRawContainer.appendChild(btn);
            });
        }

        // Recipe Book Modal population
        const recipeList = document.getElementById('recipe-book-list');
        if (recipeList) {
            recipeList.innerHTML = RECIPES.map(r => {
                const ingNames = r.ingredients.map(id => this.getName(id)).join(' ➔ ');
                const title = this.getRecipeTitle(r);
                return `
                    <div style="background: #242f3d; padding: 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <strong style="color: #ffd32a; font-size: 1.1rem;">${r.icon} ${title}</strong>
                            <span style="color: #00f2fe; font-weight: bold;">⭐ +30 PUNKTI (300p ➔ +50 Y)</span>
                        </div>
                        <div style="font-size: 0.85rem; color: #a4b0be; line-height: 1.4;">
                            ${this.isEt ? 'Vajalikud toiduained (mistahes järjekorras):' : 'Required ingredients (any order):'} <strong style="color: #d2dae2;">${ingNames}</strong>
                        </div>
                    </div>
                `;
            }).join('');
        }

        this.renderStovePans();
        this.renderOvenStatus();
    }

    private renderPantryItems() {
        const groupPantry = document.getElementById('pantry-group-pantry');
        if (!groupPantry) return;

        groupPantry.innerHTML = '';
        const isEt = this.isEt;

        Object.values(INGREDIENTS).forEach(ing => {
            if (ing.category === 'pantry' || ing.category === 'sauce') {
                const ingName = this.getName(ing.id);
                const btn = document.createElement('button');
                btn.className = 'ingredient-btn';
                btn.setAttribute('data-id', ing.id);
                btn.innerHTML = `
                    <span class="ingredient-icon">${ing.icon}</span>
                    <span class="ingredient-label">${ingName}</span>
                    <span style="font-size: 0.7rem; color: #2ed573; font-weight: bold;">${isEt ? '+ Lisa taldrikule' : '+ Add to plate'}</span>
                `;
                btn.addEventListener('click', () => this.addToPlate(ing.id));
                groupPantry.appendChild(btn);
            }
        });
    }

    private setupEventListeners() {
        // Station Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const station = target.getAttribute('data-station');

                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                target.classList.add('active');

                document.querySelectorAll('.station-panel').forEach(p => p.classList.remove('active'));
                const panel = document.getElementById(`panel-${station}`);
                if (panel) panel.classList.add('active');
            });
        });

        // Global Event Delegation for ALL buttons (handles clicks on buttons, icons, emojis, text reliably)
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (!target) return;

            // 1. Take from Pan Button (directly to plate)
            const takePanBtn = target.closest('.btn-take-pan') as HTMLElement;
            if (takePanBtn) {
                const panId = parseInt(takePanBtn.getAttribute('data-pan') || '0', 10);
                this.takeFromPan(panId);
                return;
            }

            // 2. Put raw food on Pan
            const addPanBtn = target.closest('.btn-add-pan') as HTMLElement;
            if (addPanBtn) {
                const panId = parseInt(addPanBtn.getAttribute('data-pan') || '0', 10);
                const item = addPanBtn.getAttribute('data-item');
                if (item) {
                    this.putOnPan(panId, item);
                }
                return;
            }

            // 3. Oven Bake Pizza Button
            if (target.closest('#btn-oven-bake-pizza')) {
                this.bakePizza();
                return;
            }

            // 4. Oven Take Pizza to Plate Button
            if (target.closest('#btn-oven-take-pizza')) {
                this.takeFromOven();
                return;
            }
        });

        // Chopping Button
        const doChopBtn = document.getElementById('btn-do-chop');
        if (doChopBtn) {
            doChopBtn.addEventListener('click', () => this.handleChopClick());
        }

        // Serve Button
        const serveBtn = document.getElementById('btn-serve-dish');
        if (serveBtn) {
            serveBtn.addEventListener('click', () => this.serveDish());
        }

        // Clear Plate Button
        const clearBtn = document.getElementById('btn-clear-plate');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.currentPlate = [];
                this.renderPlateUI();
                this.update3DPlateModel();
            });
        }

        // Recipe Modal
        const openRecipesBtn = document.getElementById('btn-open-recipes');
        const closeRecipesBtn = document.getElementById('btn-close-recipes');
        const modalRecipes = document.getElementById('modal-recipes');

        if (openRecipesBtn && modalRecipes) {
            openRecipesBtn.addEventListener('click', () => modalRecipes.style.display = 'flex');
        }
        if (closeRecipesBtn && modalRecipes) {
            closeRecipesBtn.addEventListener('click', () => modalRecipes.style.display = 'none');
        }

        // Sound Mute Toggle
        const soundBtn = document.getElementById('btn-toggle-sound');
        const soundIcon = document.getElementById('sound-icon');
        if (soundBtn && soundIcon) {
            soundBtn.addEventListener('click', () => {
                const isMuted = kitchenAudio.toggleMute();
                soundIcon.innerText = isMuted ? '🔇' : '🔊';
            });
        }
    }

    private addToPlate(ingredientId: string) {
        this.currentPlate.push(ingredientId);
        kitchenAudio.playChop();
        this.renderPlateUI();
        this.update3DPlateModel();
    }

    private renderPlateUI() {
        const container = document.getElementById('plate-items-container');
        const emptyMsg = document.getElementById('plate-empty-msg');
        if (!container) return;

        if (this.currentPlate.length === 0) {
            if (emptyMsg) emptyMsg.style.display = 'block';
            container.innerHTML = '';
            if (emptyMsg) container.appendChild(emptyMsg);
            return;
        }

        if (emptyMsg) emptyMsg.style.display = 'none';
        container.innerHTML = '';

        this.currentPlate.forEach((id, index) => {
            const ing = INGREDIENTS[id] || { nameEt: id, nameEn: id, icon: '🥘' };
            const ingName = this.getName(id);
            const badge = document.createElement('div');
            badge.className = 'plate-item-badge';
            badge.innerHTML = `
                <span>${ing.icon}</span>
                <span>${ingName}</span>
                <span style="cursor: pointer; color: #ff6b81; font-weight: bold; margin-left: 4px;" data-idx="${index}">✕</span>
            `;
            badge.querySelector('span:last-child')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.currentPlate.splice(index, 1);
                this.renderPlateUI();
                this.update3DPlateModel();
            });
            container.appendChild(badge);
        });
    }

    // --- Chopping Mechanics ---
    private startChopping(rawId: string) {
        this.currentChoppingRaw = rawId;
        this.choppingClicks = 0;

        const raw = INGREDIENTS[rawId];
        const activeArea = document.getElementById('chopping-active-area');
        const iconEl = document.getElementById('chopping-item-icon');
        const nameEl = document.getElementById('chopping-item-name');
        const progressEl = document.getElementById('chopping-progress-fill');
        const slicesCountEl = document.getElementById('chopping-slices-count');

        if (activeArea && iconEl && nameEl && progressEl) {
            activeArea.style.display = 'flex';
            iconEl.innerText = raw.icon;
            nameEl.innerText = this.getName(rawId);
            progressEl.style.width = '0%';
            if (slicesCountEl) {
                slicesCountEl.innerText = `${this.choppingClicks} / ${this.requiredChoppingClicks} ${this.isEt ? 'viilu lõigatud' : 'slices cut'}`;
            }
        }
    }

    private handleChopClick() {
        if (!this.currentChoppingRaw) return;

        this.choppingClicks++;
        kitchenAudio.playChop();

        const raw = INGREDIENTS[this.currentChoppingRaw];

        // 1. 2D Knife Slash Animation
        const knifeActor = document.getElementById('knife-actor-el');
        if (knifeActor) {
            knifeActor.classList.remove('chopping');
            void knifeActor.offsetWidth; // Force CSS reflow
            knifeActor.classList.add('chopping');
            setTimeout(() => knifeActor.classList.remove('chopping'), 100);
        }

        // 2. 2D Food Impact & Squash Animation
        const foodTarget = document.getElementById('chopping-item-icon');
        if (foodTarget) {
            foodTarget.classList.remove('impact');
            void foodTarget.offsetWidth;
            foodTarget.classList.add('impact');
            setTimeout(() => foodTarget.classList.remove('impact'), 100);
        }

        // 3. Spawn flying slice crumbs and cut lines on cutting board
        const arena = document.getElementById('chopping-arena-el');
        if (arena && raw) {
            // Flying slice crumb
            const crumb = document.createElement('div');
            crumb.className = 'flying-crumb';
            crumb.innerText = raw.icon;
            const angle = (Math.random() * Math.PI) - Math.PI / 2;
            const dist = 40 + Math.random() * 50;
            crumb.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
            crumb.style.setProperty('--ty', `${-Math.abs(Math.sin(angle) * dist) - 20}px`);
            crumb.style.setProperty('--rot', `${(Math.random() - 0.5) * 360}deg`);
            arena.appendChild(crumb);
            setTimeout(() => crumb.remove(), 400);

            // Cut mark on board
            const cut = document.createElement('div');
            cut.className = 'cut-line';
            cut.style.left = `${90 + (this.choppingClicks * 18) + (Math.random() * 8 - 4)}px`;
            cut.style.top = `${45 + (Math.random() * 16 - 8)}px`;
            cut.style.transform = `rotate(${(Math.random() - 0.5) * 30}deg)`;
            arena.appendChild(cut);
            setTimeout(() => cut.remove(), 800);
        }

        // 4. 3D Knife Animation in Three.js Scene
        if (this.knife3D) {
            this.knife3D.rotation.z = -0.4;
            this.knife3D.position.y = 1.44;
            setTimeout(() => {
                if (this.knife3D) {
                    this.knife3D.rotation.z = 0;
                    this.knife3D.position.y = 1.5;
                }
            }, 90);
        }

        // 5. Update Progress Bar and Slices Count
        const pct = (this.choppingClicks / this.requiredChoppingClicks) * 100;
        const progressEl = document.getElementById('chopping-progress-fill');
        if (progressEl) progressEl.style.width = `${pct}%`;

        const slicesCountEl = document.getElementById('chopping-slices-count');
        if (slicesCountEl) {
            slicesCountEl.innerText = `${this.choppingClicks} / ${this.requiredChoppingClicks} ${this.isEt ? 'viilu lõigatud' : 'slices cut'}`;
        }

        // 6. Check Completion
        if (this.choppingClicks >= this.requiredChoppingClicks) {
            if (raw && raw.chopResult) {
                this.addToPlate(raw.chopResult);
                const resName = this.getName(raw.chopResult);
                this.showScorePopup(this.isEt ? `🍽️ +1 ${resName} viilutatud ja pandud otse taldrikule! 🔪✨` : `🍽️ +1 ${resName} sliced and added to plate! 🔪✨`);
            }
            this.currentChoppingRaw = null;
            this.choppingClicks = 0;
            const activeArea = document.getElementById('chopping-active-area');
            if (activeArea) activeArea.style.display = 'none';
        }
    }

    // --- Stove & Pans Mechanics ---
    public renderStovePans() {
        const container = document.getElementById('stove-pans-container');
        if (!container) return;

        const isEt = this.isEt;

        container.innerHTML = this.pans.map(pan => {
            const panName = isEt ? pan.nameEt : pan.nameEn;
            let statusText = `<span style="color: #a4b0be;">${isEt ? 'Tühi - Pane tooraine küpsema!' : 'Empty - Put raw food to cook!'}</span>`;
            let btnAction = `
                <div style="display: flex; flex-direction: column; gap: 4px; width: 100%; align-items: center;">
                    <span style="font-size: 0.76rem; color: #ffd32a; font-weight: 800;">${isEt ? '👇 VALI TOORAINE KÜPSETAMISEKS:' : '👇 SELECT ITEM TO COOK:'}</span>
                    <div style="display: flex; gap: 5px; flex-wrap: wrap; justify-content: center;">
                        <button class="btn-action btn-add-pan" onclick="window.cookingGame.putOnPan(${pan.id}, 'raw_patty')" data-pan="${pan.id}" data-item="raw_patty" style="background: linear-gradient(135deg, #e74c3c, #c0392b); border-color: #ff7675; font-size: 0.8rem; padding: 7px 10px; font-weight: 800; cursor: pointer;">
                            🥩 ${isEt ? 'Prae Pihv' : 'Fry Patty'} (🔥)
                        </button>
                        <button class="btn-action btn-add-pan" onclick="window.cookingGame.putOnPan(${pan.id}, 'raw_steak')" data-pan="${pan.id}" data-item="raw_steak" style="background: linear-gradient(135deg, #d35400, #e67e22); border-color: #f39c12; font-size: 0.8rem; padding: 7px 10px; font-weight: 800; cursor: pointer;">
                            🥩 ${isEt ? 'Prae Steak' : 'Fry Steak'} (🔥)
                        </button>
                        <button class="btn-action btn-add-pan" onclick="window.cookingGame.putOnPan(${pan.id}, 'raw_pasta')" data-pan="${pan.id}" data-item="raw_pasta" style="background: linear-gradient(135deg, #2980b9, #3498db); border-color: #74b9ff; font-size: 0.8rem; padding: 7px 10px; font-weight: 800; cursor: pointer;">
                            🍝 ${isEt ? 'Keeda Pasta' : 'Boil Pasta'} (💧)
                        </button>
                    </div>
                </div>
            `;

            if (pan.holding) {
                const ingName = this.getName(pan.holding);
                if (pan.state === 'cooking') {
                    statusText = `<strong style="color: #ffd32a; animation: pulse 1s infinite;">🔥 ${isEt ? 'PRAEB:' : 'COOKING:'} ${ingName} (${Math.round(pan.progress)}%)</strong>`;
                    btnAction = `<span style="font-size: 0.8rem; color: #ffd32a; font-weight: bold;">⏳ ${isEt ? 'Küpseb... oota kuni valmib!' : 'Cooking... wait until done!'}</span>`;
                } else if (pan.state === 'done') {
                    const raw = INGREDIENTS[pan.holding];
                    const resultId = raw?.cookResult || pan.holding;
                    const resultName = this.getName(resultId);
                    statusText = `<strong style="color: #2ed573; font-size: 1.05rem;">✨🔥 ${isEt ? 'VALMIS:' : 'READY:'} ${resultName}</strong>`;
                    btnAction = `
                        <button class="btn-action btn-take-pan" data-pan="${pan.id}" onclick="window.cookingGame.takeFromPan(${pan.id})" style="background: linear-gradient(135deg, #2ed573, #10ac84); font-weight: 900; font-size: 0.95rem; padding: 10px 20px; box-shadow: 0 0 15px #2ed573; cursor: pointer; border-radius: 8px;">
                            🍽️ ${isEt ? 'VÕTA TALDRIKULE' : 'TAKE TO PLATE'}
                        </button>
                    `;
                } else if (pan.state === 'burned') {
                    statusText = `<strong style="color: #ff4757; font-size: 1.05rem;">🔥 ${isEt ? 'KÕRBENUD!' : 'BURNED!'}</strong>`;
                    btnAction = `<button class="btn-action btn-take-pan" onclick="window.cookingGame.takeFromPan(${pan.id})" data-pan="${pan.id}" style="background: #eb4d4b; font-weight: bold; cursor: pointer;">🗑️ ${isEt ? 'Viska minema' : 'Throw away'}</button>`;
                }
            } else if (pan.state === 'washing') {
                const timeLeft = Math.max(0, Math.ceil(30 - (pan.washProgress / 100) * 30));
                statusText = `<strong style="color: #00f2fe; animation: pulse 1s infinite;">🧼 ${isEt ? 'PESEMINE:' : 'WASHING:'} ${timeLeft}s (${Math.round(pan.washProgress)}%)</strong>`;
                btnAction = `<span style="font-size: 0.82rem; color: #70a1ff; font-weight: 700;">🧼 ${isEt ? 'Pann peseb ja jahtub (30s)...' : 'Pan is washing & cooling (30s)...'}</span>`;
            }

            const fillWidth = pan.state === 'washing' ? Math.min(100, pan.washProgress) : Math.min(100, pan.progress);
            const fillColor = pan.state === 'washing' 
                ? 'linear-gradient(90deg, #00f2fe, #4facfe)' 
                : (pan.state === 'burned' ? '#eb4d4b' : (pan.state === 'done' ? '#2ed573' : '#ffd32a'));
            const borderColor = pan.state === 'washing'
                ? '#00f2fe'
                : (pan.state === 'done' ? '#2ed573' : (pan.state === 'cooking' ? '#ff793f' : 'rgba(255,255,255,0.12)'));
            const bgColor = pan.state === 'washing'
                ? 'rgba(0, 242, 254, 0.08)'
                : (pan.state === 'cooking' ? 'rgba(255, 121, 63, 0.1)' : '#1e272e');

            return `
                <div class="pan-card" data-pan-id="${pan.id}" style="border: 1.5px solid ${borderColor}; background: ${bgColor};">
                    <strong style="color: #ffd32a; font-size: 1.05rem;">🍳 ${panName}</strong>
                    <div class="pan-status-text" style="font-size: 0.9rem; color: #dfe6e9;">${statusText}</div>
                    <div class="pan-heat-bar">
                        <div class="pan-heat-fill" style="width: ${fillWidth}%; background: ${fillColor};"></div>
                    </div>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; margin-top: 6px; width: 100%;">
                        ${btnAction}
                    </div>
                </div>
            `;
        }).join('');
    }

    public putOnPan(panId: number, rawId: string) {
        const pan = this.pans[panId];
        if (!pan || pan.holding || pan.state === 'washing') return;

        pan.holding = rawId;
        pan.progress = 0;
        pan.washProgress = 0;
        pan.state = 'cooking';
        kitchenAudio.playSizzle(true);
        this.renderStovePans();
    }

    public takeFromPan(panId: number) {
        const pan = this.pans[panId];
        if (!pan || !pan.holding || pan.state === 'washing') return;

        if (pan.state === 'done') {
            const raw = INGREDIENTS[pan.holding];
            const resultId = raw?.cookResult || pan.holding;
            this.addToPlate(resultId);
            kitchenAudio.playServe();
            const resName = this.getName(resultId);
            this.showScorePopup(this.isEt ? `🍽️ +1 ${resName} taldrikule! 🧼 Pann läheb 30s pesemisse!` : `🍽️ +1 ${resName} plated! 🧼 Pan is now washing for 30s!`);
        } else if (pan.state === 'burned') {
            kitchenAudio.playBurn();
            this.showScorePopup(this.isEt ? `🔥 Kõrbenud toit visati minema! 🧼 Pann läheb 30s pesemisse!` : `🔥 Burned food thrown away! 🧼 Pan washing for 30s!`);
        }

        // Toidu võtmisel kaob nupp koheselt, holding tühjendatakse ja algab 30s pesemine
        pan.holding = null;
        pan.progress = 0;
        pan.washProgress = 0;
        pan.state = 'washing';

        const anyCooking = this.pans.some(p => p.state === 'cooking');
        if (!anyCooking) kitchenAudio.playSizzle(false);

        this.renderStovePans();
    }

    // --- Oven Mechanics ---
    public renderOvenStatus() {
        const box = document.getElementById('oven-status-box');
        if (!box) return;

        const isEt = this.isEt;

        if (this.oven.state === 'empty') {
            box.innerHTML = `
                <div style="font-size: 2.2rem;">🍕</div>
                <div style="text-align: left;">
                    <strong>${isEt ? 'Ahi on tühi' : 'Oven is empty'}</strong>
                    <div style="font-size: 0.8rem; color: #a4b0be;">${isEt ? 'Pane pitsapõhi ahju küpsema!' : 'Put pizza crust into oven to bake!'}</div>
                </div>
                <button class="btn-action" id="btn-oven-bake-pizza" onclick="window.cookingGame.bakePizza()" style="background: #e67e22; font-weight: bold; padding: 10px 20px; cursor: pointer;">
                    🍕 ${isEt ? 'Pane Pitsa Ahju (10s)' : 'Put Pizza into Oven (10s)'}
                </button>
            `;
        } else if (this.oven.state === 'baking') {
            box.innerHTML = `
                <div style="font-size: 2.2rem; animation: pulse 1s infinite;">🔥</div>
                <div style="text-align: left;">
                    <strong style="color: #ffd32a;">${isEt ? 'Pitsa küpseb ahjus...' : 'Pizza is baking in the oven...'}</strong>
                    <div style="width: 180px; height: 8px; background: #2f3542; border-radius: 4px; overflow: hidden; margin-top: 6px;">
                        <div id="oven-progress-fill" style="width: ${this.oven.progress}%; height: 100%; background: #ffd32a; transition: width 0.2s;"></div>
                    </div>
                </div>
            `;
        } else if (this.oven.state === 'done') {
            box.innerHTML = `
                <div style="font-size: 2.2rem;">✨🍕</div>
                <div style="text-align: left;">
                    <strong style="color: #2ed573; font-size: 1.05rem;">${isEt ? 'Pitsa on valmis ja krõbe!' : 'Pizza is ready and crispy!'}</strong>
                </div>
                <button class="btn-action" id="btn-oven-take-pizza" onclick="window.cookingGame.takeFromOven()" style="background: linear-gradient(135deg, #2ed573, #10ac84); font-weight: 900; font-size: 0.95rem; padding: 10px 20px; box-shadow: 0 0 15px #2ed573; cursor: pointer; border-radius: 8px;">
                    🍽️ ${isEt ? 'VÕTA TALDRIKULE' : 'TAKE TO PLATE'}
                </button>
            `;
        }
    }

    public bakePizza() {
        this.oven.state = 'baking';
        this.oven.progress = 0;
        this.renderOvenStatus();
    }

    public takeFromOven() {
        this.addToPlate('baked_in_oven');
        kitchenAudio.playServe();
        this.showScorePopup(this.isEt ? '🍽️ +1 Küpsetatud Pitsa pandud otse taldrikule! 🍕✨' : '🍽️ +1 Baked Pizza added to plate! 🍕✨');
        this.oven.state = 'empty';
        this.oven.progress = 0;
        this.renderOvenStatus();
    }

    private tickCooking() {
        let stateChanged = false;

        // Tick pans (1.0 = ~10 seconds for 100% cooking)
        this.pans.forEach(pan => {
            if (pan.state === 'cooking') {
                pan.progress += 1.0; // Poole pikem aeg küpsetamiseks
                if (pan.progress >= 100 && pan.progress < 200) {
                    if (pan.state !== 'done') {
                        pan.state = 'done';
                        stateChanged = true;
                    }
                } else if (pan.progress >= 200) {
                    if (pan.state !== 'burned') {
                        pan.state = 'burned';
                        stateChanged = true;
                    }
                }

                // In-place visual update during cooking without destroying DOM
                const panCard = document.querySelector(`.pan-card[data-pan-id="${pan.id}"]`);
                if (panCard && pan.state === 'cooking') {
                    const statusEl = panCard.querySelector('.pan-status-text');
                    const fillEl = panCard.querySelector('.pan-heat-fill') as HTMLElement;
                    const ingName = this.getName(pan.holding || '');
                    if (statusEl) {
                        statusEl.innerHTML = `<strong style="color: #ffd32a; animation: pulse 1s infinite;">🔥 ${this.isEt ? 'PRAEB:' : 'COOKING:'} ${ingName} (${Math.round(pan.progress)}%)</strong>`;
                    }
                    if (fillEl) {
                        fillEl.style.width = `${Math.min(100, pan.progress)}%`;
                    }
                }
            } else if (pan.state === 'washing') {
                // 30 seconds washing at 100ms ticks = 300 ticks (100 / 300 = 0.3333333333333333 per tick)
                pan.washProgress += (100 / 300);
                const timeLeft = Math.max(0, Math.ceil(30 - (pan.washProgress / 100) * 30));

                if (pan.washProgress >= 100) {
                    pan.state = 'empty';
                    pan.washProgress = 0;
                    pan.progress = 0;
                    pan.holding = null;
                    stateChanged = true;
                    kitchenAudio.playSuccess();
                } else {
                    const panCard = document.querySelector(`.pan-card[data-pan-id="${pan.id}"]`);
                    if (panCard) {
                        const statusEl = panCard.querySelector('.pan-status-text');
                        const fillEl = panCard.querySelector('.pan-heat-fill') as HTMLElement;
                        if (statusEl) {
                            statusEl.innerHTML = `<strong style="color: #00f2fe; animation: pulse 1s infinite;">🧼 ${this.isEt ? 'PESEMINE:' : 'WASHING:'} ${timeLeft}s (${Math.round(pan.washProgress)}%)</strong>`;
                        }
                        if (fillEl) {
                            fillEl.style.width = `${Math.min(100, pan.washProgress)}%`;
                            fillEl.style.background = 'linear-gradient(90deg, #00f2fe, #4facfe)';
                        }
                    }
                }
            }
        });

        if (stateChanged) {
            this.renderStovePans();
        }

        // Tick oven (1.0 = ~10 seconds for baking)
        if (this.oven.state === 'baking') {
            this.oven.progress += 1.0; // Poole pikem aeg küpsetamiseks
            if (this.oven.progress >= 100) {
                this.oven.state = 'done';
                kitchenAudio.playBell();
                this.renderOvenStatus();
            } else {
                const fillEl = document.getElementById('oven-progress-fill');
                if (fillEl) {
                    fillEl.style.width = `${this.oven.progress}%`;
                }
            }
        }
    }

    // --- Order Generation & Tickets ---
    private spawnOrder() {
        if (this.activeOrders.length >= this.maxConcurrentOrders) return;

        const recipe = RECIPES[Math.floor(Math.random() * RECIPES.length)];
        const order: OrderItem = {
            id: `ord_${this.orderIdCounter++}`,
            recipeKey: recipe.key,
            title: recipe.title,
            titleEn: recipe.titleEn,
            icon: recipe.icon,
            requiredIngredients: [...recipe.ingredients],
            maxPatience: recipe.patience,
            currentPatience: recipe.patience,
            yardReward: recipe.yardReward,
            scoreReward: recipe.scoreReward
        };

        this.activeOrders.push(order);
        this.renderOrdersQueue();
    }

    private tickOrders() {
        let needsRender = false;
        for (let i = this.activeOrders.length - 1; i >= 0; i--) {
            const order = this.activeOrders[i];
            order.currentPatience -= 1;

            if (order.currentPatience <= 0) {
                // Order expired / failed - Streak resets!
                this.activeOrders.splice(i, 1);
                this.combo = 1;
                this.streakPoints = 0;
                this.updateScoreDisplay();
                this.showScorePopup(this.isEt ? `⚠️ Tellimuse aeg sai otsa! Punktiseeria katkes (0/300 p).` : `⚠️ Order expired! Streak reset (0/300 pts).`);
                kitchenAudio.playBurn();
                needsRender = true;
            }
        }

        if (this.activeOrders.length < this.maxConcurrentOrders && Math.random() < 0.4) {
            this.spawnOrder();
            needsRender = true;
        }

        if (needsRender) this.renderOrdersQueue();
        else this.updatePatienceBars();
    }

    private renderOrdersQueue() {
        const container = document.getElementById('orders-queue-container');
        if (!container) return;

        const isEt = this.isEt;

        container.innerHTML = this.activeOrders.map(order => {
            const ingList = order.requiredIngredients.map(id => {
                const ing = INGREDIENTS[id] || { nameEt: id, nameEn: id, icon: '🥘', category: 'pantry' };
                const ingName = this.getName(id);
                
                let tagBadge = `<span class="tag-pantry">${isEt ? '🍞 Sahvrist' : '🍞 Pantry'}</span>`;
                if (ing.category === 'cooked') {
                    if (id === 'baked_in_oven') {
                        tagBadge = `<span class="tag-need-oven">${isEt ? '🍕 AHJUS KÜPSETADA' : '🍕 BAKE IN OVEN'}</span>`;
                    } else {
                        tagBadge = `<span class="tag-need-cook">${isEt ? '🔥 KÜPSETA PLIIDIL' : '🔥 COOK ON STOVE'}</span>`;
                    }
                } else if (ing.category === 'chopped') {
                    tagBadge = `<span class="tag-need-chop">${isEt ? '🔪 HAKI LÕIKELAUAL' : '🔪 CHOP ON BOARD'}</span>`;
                }

                return `
                    <li style="display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 2px 0; border-bottom: 1px dashed #ecf0f1;">
                        <span style="display: flex; align-items: center; gap: 4px; font-weight: 600;">
                            <span>${ing.icon}</span> <span>${ingName}</span>
                        </span>
                        ${tagBadge}
                    </li>
                `;
            }).join('');

            const pct = Math.max(0, (order.currentPatience / order.maxPatience) * 100);
            const barColor = pct < 30 ? '#ff4757' : (pct < 60 ? '#ffa502' : '#2ed573');
            const title = this.getRecipeTitle(order);

            return `
                <div class="order-ticket" id="ticket-${order.id}">
                    <div class="ticket-title">
                        <span>${order.icon} ${title}</span>
                    </div>
                    <div style="margin: 4px 0 8px 0;">
                        <span style="background: linear-gradient(135deg, #00f2fe, #2ecc71); color: #111; font-weight: 900; font-size: 0.78rem; padding: 3px 8px; border-radius: 8px; box-shadow: 0 0 8px rgba(0,242,254,0.4); display: inline-flex; align-items: center; gap: 4px;">
                            ⭐ ${isEt ? 'TEENID: +30 PUNKTI (300p ➔ +50 Y)' : 'EARN: +30 PTS (300p ➔ +50 Y)'}
                        </span>
                    </div>
                    <ul class="ticket-recipe-list">
                        ${ingList}
                    </ul>
                    <div class="patience-bar-wrap">
                        <div class="patience-bar" style="width: ${pct}%; background: ${barColor};"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    private updatePatienceBars() {
        this.activeOrders.forEach(order => {
            const ticket = document.getElementById(`ticket-${order.id}`);
            if (ticket) {
                const bar = ticket.querySelector('.patience-bar') as HTMLElement;
                if (bar) {
                    const pct = Math.max(0, (order.currentPatience / order.maxPatience) * 100);
                    bar.style.width = `${pct}%`;
                    bar.style.backgroundColor = pct < 30 ? '#ff4757' : (pct < 60 ? '#ffa502' : '#2ed573');
                }
            }
        });
    }

    // --- Serve Dish & Yard Rewards ---
    private serveDish() {
        if (this.currentPlate.length === 0) {
            this.showScorePopup(this.isEt ? '⚠️ Taldrik on tühi!' : '⚠️ Plate is empty!');
            return;
        }

        // Check if current plate matches any active order (ORDER INDEPENDENT: Any sequence matches!)
        const matchIndex = this.activeOrders.findIndex(ord => {
            if (this.currentPlate.length !== ord.requiredIngredients.length) return false;
            const p = [...this.currentPlate].sort();
            const r = [...ord.requiredIngredients].sort();
            return p.every((val, idx) => val === r[idx]);
        });

        if (matchIndex >= 0) {
            const matchedOrder = this.activeOrders[matchIndex];
            this.activeOrders.splice(matchIndex, 1);

            // Exactly 30 points per served dish
            const pointsEarned = 30;
            this.score += pointsEarned;
            this.streakPoints += pointsEarned;
            this.completedOrders++;

            kitchenAudio.playBell();
            kitchenAudio.playSuccess();

            // Kui 300 punkti tuleb järjest kokku -> saab 50 Yardi (50 Y)!
            if (this.streakPoints >= 300) {
                const bonusYards = 50;
                yardService.addYards(bonusYards, 'Master Chef 3D: 300 Punkti Seeria Boonus (+50 Y)');
                kitchenAudio.playCoin();
                this.showScorePopup(this.isEt 
                    ? `🎉🏆 VÕIMAS! 300 PUNKTI TÄIS! SAID +50 YARDI (50 Y)! ⭐✨` 
                    : `🎉🏆 AMAZING! 300 POINTS STREAK! +50 YARDS (50 Y) AWARDED! ⭐✨`
                );
                this.streakPoints = 0; // Nulli seeria järgmise 300 punkti jaoks
            } else {
                this.showScorePopup(this.isEt 
                    ? `🎉 +30 Punkti! (Seeria: ${this.streakPoints}/300 p ➔ +50 Y)` 
                    : `🎉 +30 Points! (Streak: ${this.streakPoints}/300 pts ➔ +50 Y)`
                );
            }

            // Clear plate
            this.currentPlate = [];
            this.renderPlateUI();
            this.update3DPlateModel();
            this.renderOrdersQueue();
            this.updateScoreDisplay();
            this.updateYardDisplay();
        } else {
            kitchenAudio.playBurn();
            this.showScorePopup(this.isEt ? '❌ Taldrikul olevad toiduained ei vasta ühelegi tellimusele! Kontrolli tellimust.' : '❌ Plate items do not match any active order! Check customer tickets.');
        }
    }

    private showScorePopup(text: string) {
        const popup = document.createElement('div');
        popup.className = 'score-popup';
        popup.innerText = text;
        popup.style.left = `${window.innerWidth / 2 - 120}px`;
        popup.style.top = `${window.innerHeight / 2 - 50}px`;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 1200);
    }

    private updateScoreDisplay() {
        const scoreEl = document.getElementById('hud-score');
        const streakEl = document.getElementById('hud-streak');
        const countEl = document.getElementById('hud-orders-count');

        if (scoreEl) scoreEl.innerText = this.score.toLocaleString();
        if (streakEl) streakEl.innerText = `${this.streakPoints}/300`;
        if (countEl) countEl.innerText = this.completedOrders.toString();
    }

    private updateYardDisplay() {
        const yardsEl = document.getElementById('hud-yards-val');
        if (yardsEl) {
            yardsEl.innerText = yardService.getYards().toLocaleString();
        }
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private animate() {
        requestAnimationFrame(() => this.animate());

        // Gentle rotate of 3D food plate when holding items
        if (this.food3DGroup) {
            this.food3DGroup.rotation.y += 0.005;
        }

        // Animate steam particles rising
        if (this.steamGeo) {
            const positions = this.steamGeo.attributes.position.array as Float32Array;
            for (let i = 1; i < positions.length; i += 3) {
                positions[i] += 0.015;
                if (positions[i] > 3.2) {
                    positions[i] = 1.5;
                }
            }
            this.steamGeo.attributes.position.needsUpdate = true;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialise
window.addEventListener('DOMContentLoaded', () => {
    new CookingGame();
});
