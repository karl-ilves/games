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
    'raw_potato': { id: 'raw_potato', nameEt: 'Kartul', nameEn: 'Raw Potato', icon: '🥔', category: 'raw', chopResult: 'potato_chopped' },
    'raw_mushrooms': { id: 'raw_mushrooms', nameEt: 'Seened', nameEn: 'Mushrooms', icon: '🍄', category: 'raw', chopResult: 'mushrooms_chopped' },
    'raw_pepperoni': { id: 'raw_pepperoni', nameEt: 'Pepperoni vorst', nameEn: 'Pepperoni Sausage', icon: '🍖', category: 'raw', chopResult: 'pepperoni_chopped' },

    // Chopped items
    'tomato_chopped': { id: 'tomato_chopped', nameEt: 'Viilutatud Tomat', nameEn: 'Sliced Tomato', icon: '🍅', category: 'chopped' },
    'cheese_slice': { id: 'cheese_slice', nameEt: 'Juustuviil', nameEn: 'Cheese Slice', icon: '🧀', category: 'chopped' },
    'lettuce_chopped': { id: 'lettuce_chopped', nameEt: 'Hakitud Salat', nameEn: 'Chopped Lettuce', icon: '🥗', category: 'chopped' },
    'onion_chopped': { id: 'onion_chopped', nameEt: 'Sibularõngad', nameEn: 'Onion Rings', icon: '🧅', category: 'chopped' },
    'potato_chopped': { id: 'potato_chopped', nameEt: 'Friikartuliribad', nameEn: 'Potato Strips', icon: '🍟', category: 'chopped', cookResult: 'fried_crispy' },
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
    'fried_crispy': { id: 'fried_crispy', nameEt: 'Krõbedad Friikad', nameEn: 'Crispy Fries', icon: '🍟', category: 'cooked' },
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
        patience: 45
    },
    {
        key: 'double_burger',
        title: 'Topelt Juustuburger Sibulaga',
        titleEn: 'Double Bacon & Onion Burger',
        icon: '🍔',
        ingredients: ['bun_bottom', 'cooked_patty', 'cheese_slice', 'cooked_patty', 'cheese_slice', 'onion_chopped', 'bun_top'],
        yardReward: 30,
        scoreReward: 300,
        patience: 50
    },
    {
        key: 'pepperoni_pizza',
        title: 'Krõbe Pepperoni Pitsa',
        titleEn: 'Crispy Pepperoni Pizza',
        icon: '🍕',
        ingredients: ['pizza_dough', 'tomato_sauce', 'cheese_slice', 'pepperoni_chopped', 'baked_in_oven'],
        yardReward: 35,
        scoreReward: 350,
        patience: 55
    },
    {
        key: 'fries',
        title: 'Gourmet Friikartulid',
        titleEn: 'Gourmet French Fries',
        icon: '🍟',
        ingredients: ['potato_chopped', 'fried_crispy', 'salt_sauce'],
        yardReward: 15,
        scoreReward: 150,
        patience: 35
    },
    {
        key: 'steak_deluxe',
        title: 'Peakoka Mahlane Steak & Seened',
        titleEn: 'Chef Gourmet Steak & Veggies',
        icon: '🥩',
        ingredients: ['cooked_steak', 'mushrooms_chopped', 'tomato_chopped', 'lettuce_chopped'],
        yardReward: 40,
        scoreReward: 400,
        patience: 50
    },
    {
        key: 'pasta_bolognese',
        title: 'Pasta Bolognese Juustuga',
        titleEn: 'Pasta Bolognese with Cheese',
        icon: '🍝',
        ingredients: ['boiled_pasta', 'tomato_sauce', 'cooked_patty', 'cheese_slice'],
        yardReward: 30,
        scoreReward: 300,
        patience: 50
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

    // Stove Pans state
    private pans = [
        { id: 0, name: 'Pann 1 (Grill)', holding: null as string | null, progress: 0, state: 'empty' as 'empty' | 'cooking' | 'done' | 'burned' },
        { id: 1, name: 'Pann 2 (Grill)', holding: null as string | null, progress: 0, state: 'empty' as 'empty' | 'cooking' | 'done' | 'burned' },
        { id: 2, name: 'Pott 1 (Keetmine)', holding: null as string | null, progress: 0, state: 'empty' as 'empty' | 'cooking' | 'done' | 'burned' }
    ];

    // Oven state
    private oven = {
        holding: null as string | null,
        progress: 0,
        state: 'empty' as 'empty' | 'baking' | 'done'
    };

    private isRunning: boolean = true;

    constructor() {
        // 1. VIP / Permission check
        const profile = getCurrentUserProfile();
        const isAdmin = !!profile?.email && profile.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

        const vipOverlay = document.getElementById('vip-restricted-overlay');
        if (!isAdmin) {
            if (vipOverlay) vipOverlay.style.display = 'flex';
            console.warn("Cooking game restricted: not admin 1karl.ilves@gmail.com");
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
        this.camera.position.set(0, 4.5, 6.5);
        this.camera.lookAt(0, 1.2, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        if (container) {
            container.appendChild(this.renderer.domElement);
        }

        this.food3DGroup = new THREE.Group();
        this.scene.add(this.food3DGroup);

        this.build3DKitchen();
        this.setupSteamParticles();
        this.setupUI();
        this.setupEventListeners();
        this.updateYardDisplay();

        // Start Order Generation & Game Loop
        this.spawnOrder();
        this.spawnOrder();
        
        setInterval(() => this.tickCooking(), 100);
        setInterval(() => this.tickOrders(), 1000);

        window.addEventListener('resize', () => this.onWindowResize());
        this.animate();
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

    private setupUI() {
        // Top Yard icon
        const yardIcon = document.getElementById('cooking-yard-icon');
        if (yardIcon) yardIcon.innerHTML = yardService.renderYardSvg(20);

        // Pantry Tray items
        const pantryContainer = document.getElementById('pantry-items-grid');
        if (pantryContainer) {
            pantryContainer.innerHTML = '';
            Object.values(INGREDIENTS).forEach(ing => {
                if (ing.category === 'pantry' || ing.category === 'sauce' || ing.category === 'chopped' || ing.category === 'cooked') {
                    const btn = document.createElement('button');
                    btn.className = 'ingredient-btn';
                    btn.setAttribute('data-id', ing.id);
                    btn.innerHTML = `
                        <span class="ingredient-icon">${ing.icon}</span>
                        <span class="ingredient-label">${ing.nameEt}</span>
                    `;
                    btn.addEventListener('click', () => this.addToPlate(ing.id));
                    pantryContainer.appendChild(btn);
                }
            });
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
                    <span class="ingredient-label">${ing.nameEt}</span>
                `;
                btn.addEventListener('click', () => this.startChopping(ing.id));
                chopRawContainer.appendChild(btn);
            });
        }

        // Recipe Book Modal population
        const recipeList = document.getElementById('recipe-book-list');
        if (recipeList) {
            recipeList.innerHTML = RECIPES.map(r => {
                const ingNames = r.ingredients.map(id => INGREDIENTS[id]?.nameEt || id).join(' ➔ ');
                return `
                    <div style="background: #242f3d; padding: 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <strong style="color: #ffd32a; font-size: 1.1rem;">${r.icon} ${r.title}</strong>
                            <span style="color: #00f2fe; font-weight: bold;">+${r.yardReward} YARDS</span>
                        </div>
                        <div style="font-size: 0.85rem; color: #a4b0be; line-height: 1.4;">
                            Järjekord: <strong style="color: #d2dae2;">${ingNames}</strong>
                        </div>
                    </div>
                `;
            }).join('');
        }

        this.renderStovePans();
        this.renderOvenStatus();
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
            const ing = INGREDIENTS[id] || { nameEt: id, icon: '🥘' };
            const badge = document.createElement('div');
            badge.className = 'plate-item-badge';
            badge.innerHTML = `
                <span>${ing.icon}</span>
                <span>${ing.nameEt}</span>
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

        if (activeArea && iconEl && nameEl && progressEl) {
            activeArea.style.display = 'flex';
            iconEl.innerText = raw.icon;
            nameEl.innerText = raw.nameEt;
            progressEl.style.width = '0%';
        }
    }

    private handleChopClick() {
        if (!this.currentChoppingRaw) return;

        this.choppingClicks++;
        kitchenAudio.playChop();

        const pct = (this.choppingClicks / this.requiredChoppingClicks) * 100;
        const progressEl = document.getElementById('chopping-progress-fill');
        if (progressEl) progressEl.style.width = `${pct}%`;

        if (this.choppingClicks >= this.requiredChoppingClicks) {
            const raw = INGREDIENTS[this.currentChoppingRaw];
            if (raw && raw.chopResult) {
                this.addToPlate(raw.chopResult);
                this.showScorePopup(`+ Viilutatud ${raw.nameEt}!`);
            }
            this.currentChoppingRaw = null;
            this.choppingClicks = 0;
            const activeArea = document.getElementById('chopping-active-area');
            if (activeArea) activeArea.style.display = 'none';
        }
    }

    // --- Stove & Pans Mechanics ---
    private renderStovePans() {
        const container = document.getElementById('stove-pans-container');
        if (!container) return;

        container.innerHTML = this.pans.map(pan => {
            let statusText = 'Tühi';
            let btnAction = `<button class="btn-action btn-add-pan" data-pan="${pan.id}" data-item="raw_patty">➕ Pihv</button>
                             <button class="btn-action btn-add-pan" data-pan="${pan.id}" data-item="raw_steak">➕ Steak</button>
                             <button class="btn-action btn-add-pan" data-pan="${pan.id}" data-item="raw_pasta">➕ Pasta</button>`;

            if (pan.holding) {
                const ing = INGREDIENTS[pan.holding];
                if (pan.state === 'cooking') statusText = `Praeb: ${ing?.nameEt} (${Math.round(pan.progress)}%)`;
                else if (pan.state === 'done') statusText = `✅ VALMIS: ${ing?.cookResult ? INGREDIENTS[ing.cookResult]?.nameEt : ing?.nameEt}`;
                else if (pan.state === 'burned') statusText = `🔥 KÕRBENUD!`;

                btnAction = `<button class="btn-action btn-take-pan" data-pan="${pan.id}" style="background: #2ed573; font-weight: bold;">🍽️ Võta taldrikule</button>`;
            }

            const fillWidth = Math.min(100, pan.progress);
            const fillColor = pan.state === 'burned' ? '#eb4d4b' : (pan.state === 'done' ? '#2ed573' : '#ffd32a');

            return `
                <div class="pan-card">
                    <strong style="color: #ffd32a;">🍳 ${pan.name}</strong>
                    <div style="font-size: 0.9rem; color: #dfe6e9;">${statusText}</div>
                    <div class="pan-heat-bar">
                        <div class="pan-heat-fill" style="width: ${fillWidth}%; background: ${fillColor};"></div>
                    </div>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; margin-top: 6px;">
                        ${btnAction}
                    </div>
                </div>
            `;
        }).join('');

        // Bind buttons
        container.querySelectorAll('.btn-add-pan').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const panId = parseInt((e.currentTarget as HTMLElement).getAttribute('data-pan') || '0', 10);
                const itemId = (e.currentTarget as HTMLElement).getAttribute('data-item') || 'raw_patty';
                this.putOnPan(panId, itemId);
            });
        });

        container.querySelectorAll('.btn-take-pan').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const panId = parseInt((e.currentTarget as HTMLElement).getAttribute('data-pan') || '0', 10);
                this.takeFromPan(panId);
            });
        });
    }

    private putOnPan(panId: number, rawId: string) {
        const pan = this.pans[panId];
        if (!pan || pan.holding) return;

        pan.holding = rawId;
        pan.progress = 0;
        pan.state = 'cooking';
        kitchenAudio.playSizzle(true);
        this.renderStovePans();
    }

    private takeFromPan(panId: number) {
        const pan = this.pans[panId];
        if (!pan || !pan.holding) return;

        if (pan.state === 'done') {
            const raw = INGREDIENTS[pan.holding];
            if (raw && raw.cookResult) {
                this.addToPlate(raw.cookResult);
                this.showScorePopup(`+ Valmis ${INGREDIENTS[raw.cookResult]?.nameEt}!`);
            }
        } else if (pan.state === 'burned') {
            kitchenAudio.playBurn();
            this.showScorePopup(`🔥 Kõrbenud toit visati minema!`);
        }

        pan.holding = null;
        pan.progress = 0;
        pan.state = 'empty';

        const anyCooking = this.pans.some(p => p.state === 'cooking');
        if (!anyCooking) kitchenAudio.playSizzle(false);

        this.renderStovePans();
    }

    // --- Oven Mechanics ---
    private renderOvenStatus() {
        const box = document.getElementById('oven-status-box');
        if (!box) return;

        if (this.oven.state === 'empty') {
            box.innerHTML = `
                <div style="font-size: 2.2rem;">🍕</div>
                <div style="text-align: left;">
                    <strong>Ahi on tühi</strong>
                    <div style="font-size: 0.8rem; color: #a4b0be;">Pane pitsapõhi ahju küpsema!</div>
                </div>
                <button class="btn-action" id="btn-oven-bake-pizza" style="background: #e67e22; font-weight: bold; padding: 10px 20px;">
                    🍕 Pane Pitsa Ahju (5s)
                </button>
            `;
            document.getElementById('btn-oven-bake-pizza')?.addEventListener('click', () => {
                this.oven.state = 'baking';
                this.oven.progress = 0;
                this.renderOvenStatus();
            });
        } else if (this.oven.state === 'baking') {
            box.innerHTML = `
                <div style="font-size: 2.2rem; animation: pulse 1s infinite;">🔥</div>
                <div style="text-align: left;">
                    <strong style="color: #ffd32a;">Pitsa küpseb ahjus...</strong>
                    <div style="width: 180px; height: 8px; background: #2f3542; border-radius: 4px; overflow: hidden; margin-top: 6px;">
                        <div style="width: ${this.oven.progress}%; height: 100%; background: #ffd32a; transition: width 0.2s;"></div>
                    </div>
                </div>
            `;
        } else if (this.oven.state === 'done') {
            box.innerHTML = `
                <div style="font-size: 2.2rem;">✨🍕</div>
                <div style="text-align: left;">
                    <strong style="color: #2ed573;">Pitsa on valmis ja krõbe!</strong>
                </div>
                <button class="btn-action" id="btn-oven-take-pizza" style="background: #2ed573; font-weight: bold; padding: 10px 20px;">
                    🍽️ Võta Ahjust Taldrikule
                </button>
            `;
            document.getElementById('btn-oven-take-pizza')?.addEventListener('click', () => {
                this.addToPlate('baked_in_oven');
                this.oven.state = 'empty';
                this.oven.progress = 0;
                this.renderOvenStatus();
            });
        }
    }

    private tickCooking() {
        // Tick pans
        let stateChanged = false;
        this.pans.forEach(pan => {
            if (pan.state === 'cooking') {
                pan.progress += 2.0; // ~5 seconds for 100%
                if (pan.progress >= 100 && pan.progress < 160) {
                    if (pan.state !== 'done') {
                        pan.state = 'done';
                        stateChanged = true;
                    }
                } else if (pan.progress >= 160) {
                    pan.state = 'burned';
                    stateChanged = true;
                }
                stateChanged = true;
            }
        });

        if (stateChanged) this.renderStovePans();

        // Tick oven
        if (this.oven.state === 'baking') {
            this.oven.progress += 2.0;
            if (this.oven.progress >= 100) {
                this.oven.state = 'done';
                kitchenAudio.playBell();
            }
            this.renderOvenStatus();
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
                // Order expired / failed
                this.activeOrders.splice(i, 1);
                this.combo = 1;
                this.updateScoreDisplay();
                this.showScorePopup(`❌ Klient lahkus!`);
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

        container.innerHTML = this.activeOrders.map(order => {
            const ingList = order.requiredIngredients.map(id => {
                const ing = INGREDIENTS[id] || { nameEt: id, icon: '🥘' };
                return `<li><span>${ing.icon}</span> <span>${ing.nameEt}</span></li>`;
            }).join('');

            const pct = Math.max(0, (order.currentPatience / order.maxPatience) * 100);
            const barColor = pct < 30 ? '#ff4757' : (pct < 60 ? '#ffa502' : '#2ed573');

            return `
                <div class="order-ticket" id="ticket-${order.id}">
                    <div class="ticket-title">
                        <span>${order.icon} ${order.title}</span>
                        <span style="color: #00f2fe; font-size: 0.85rem;">+${order.yardReward} Y</span>
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
            this.showScorePopup('⚠️ Taldrik on tühi!');
            return;
        }

        // Check if current plate matches any active order
        const plateStr = JSON.stringify(this.currentPlate);
        const matchIndex = this.activeOrders.findIndex(ord => {
            return JSON.stringify(ord.requiredIngredients) === plateStr;
        });

        if (matchIndex >= 0) {
            const matchedOrder = this.activeOrders[matchIndex];
            this.activeOrders.splice(matchIndex, 1);

            // Calculate score and yards with combo
            const finalScore = matchedOrder.scoreReward * this.combo;
            const finalYards = matchedOrder.yardReward + (this.combo > 1 ? 5 : 0);

            this.score += finalScore;
            this.completedOrders++;
            this.combo = Math.min(5, this.combo + 1);

            // Award Yards to User Profile
            yardService.addYards(finalYards, `Master Chef 3D: ${matchedOrder.title}`);

            kitchenAudio.playBell();
            kitchenAudio.playSuccess();
            kitchenAudio.playCoin();

            this.showScorePopup(`🎉 +${finalScore} Pts | +${finalYards} YARDS! (Kombo x${this.combo})`);

            // Clear plate
            this.currentPlate = [];
            this.renderPlateUI();
            this.update3DPlateModel();
            this.renderOrdersQueue();
            this.updateScoreDisplay();
            this.updateYardDisplay();
        } else {
            kitchenAudio.playBurn();
            this.showScorePopup('❌ See roog ei sobi ühegi tellimusega! Kontrolli retseptiraamatut.');
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
        const comboEl = document.getElementById('hud-combo');
        const countEl = document.getElementById('hud-orders-count');

        if (scoreEl) scoreEl.innerText = this.score.toLocaleString();
        if (comboEl) comboEl.innerText = `x${this.combo}`;
        if (countEl) countEl.innerText = this.completedOrders.toString();
    }

    private updateYardDisplay() {
        const yardsEl = document.getElementById('hud-yards-val');
        if (yardsEl) {
            const data = yardService.getYardData();
            yardsEl.innerText = data.yards.toLocaleString();
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
