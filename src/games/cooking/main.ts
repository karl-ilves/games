import * as THREE from 'three';
import { getCurrentUserProfile, isUserAdminEmail } from '../../auth';
import { yardService } from '../../shared/yardService';
import { kitchenAudio } from './audio';
import { INGREDIENTS, RECIPES } from './catalog';
import { CookingState } from './state/cookingState';
import { KitchenBuilder } from './world/kitchenBuilder';
import { Food3DBuilder } from './models/food3DBuilder';
import { KitchenStations } from './systems/kitchenStations';
import { OrderManager } from './systems/orderManager';
import { CookingHud } from './ui/cookingHud';

export class CookingGame {
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;

    public state: CookingState = new CookingState();
    public kitchenBuilder: KitchenBuilder = new KitchenBuilder();
    public foodBuilder: Food3DBuilder = new Food3DBuilder();
    public hud!: CookingHud;
    public stations!: KitchenStations;
    public orderManager!: OrderManager;

    constructor() {
        const profile = getCurrentUserProfile();
        const isAdmin = isUserAdminEmail(profile?.email);
        this.state.isEt = isAdmin;

        const vipOverlay = document.getElementById('vip-restricted-overlay');
        if (vipOverlay) vipOverlay.style.display = 'none';

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

        (window as any).cookingGame = this;

        this.scene.add(this.foodBuilder.food3DGroup);

        this.hud = new CookingHud(this.state);
        this.stations = new KitchenStations(
            this.state,
            () => {
                this.hud.renderPlateUI((idx) => {
                    this.state.currentPlate.splice(idx, 1);
                    this.hud.renderPlateUI((i) => this.removePlateItem(i));
                    this.foodBuilder.update3DPlateModel(this.state.currentPlate);
                });
                this.foodBuilder.update3DPlateModel(this.state.currentPlate);
            },
            () => this.hud.renderStovePans(),
            () => this.hud.renderOvenStatus(),
            (txt) => this.hud.showScorePopup(txt)
        );

        this.orderManager = new OrderManager(
            this.state,
            () => this.hud.renderOrdersQueue(),
            () => {
                this.hud.renderPlateUI((idx) => this.removePlateItem(idx));
                this.foodBuilder.update3DPlateModel(this.state.currentPlate);
            },
            () => {
                this.hud.updateScoreDisplay();
                this.hud.updateYardDisplay();
            },
            (txt) => this.hud.showScorePopup(txt)
        );

        this.initGame();
    }

    private removePlateItem(index: number): void {
        this.state.currentPlate.splice(index, 1);
        this.hud.renderPlateUI((i) => this.removePlateItem(i));
        this.foodBuilder.update3DPlateModel(this.state.currentPlate);
    }

    private initGame(): void {
        this.hud.applyLocalization();
        this.kitchenBuilder.buildKitchen(this.scene);
        this.kitchenBuilder.setupSteamParticles(this.scene);
        this.setupUI();
        this.setupEventListeners();
        this.hud.updateYardDisplay();
        yardService.subscribe(() => this.hud.updateYardDisplay());
        yardService.recordPlayedGame({
            id: 'cooking',
            title: '🍳 3D Master Chef',
            description: 'Cook burgers, pizzas, and pasta dishes as master chef, satisfy customer orders, and earn Chef Cash!',
            url: './games/cooking/index.html',
            icon: '🍳',
            badgeText: '🍳 +20 € to +40 €',
            badgeColor: '#ffd32a'
        });

        this.state.spawnOrder();
        this.state.spawnOrder();
        this.hud.renderOrdersQueue();

        setInterval(() => this.stations.tickCooking(), 100);
        setInterval(() => this.orderManager.tickOrders(), 1000);

        window.addEventListener('resize', () => this.onWindowResize());
        this.animate();
    }

    private setupUI(): void {
        const yardIcon = document.getElementById('cooking-yard-icon');
        if (yardIcon) yardIcon.innerHTML = yardService.renderYardSvg(20);

        const pantryContainer = document.getElementById('pantry-items-grid');
        if (pantryContainer) {
            const isEt = this.state.isEt;
            pantryContainer.innerHTML = `
                <div style="width: 100%; display: flex; flex-direction: column; gap: 8px;">
                    <div style="background: rgba(46, 213, 115, 0.12); border: 1.5px solid rgba(46, 213, 115, 0.4); border-radius: 12px; padding: 12px 16px;">
                        <div class="category-header" style="color: #2ed573; font-size: 1rem; font-weight: 800; margin-bottom: 8px;">
                            <span>🍞</span> <span>${
                                isEt
                                    ? 'SAHVRI TOOTED & KASTMED (Klõpsa otse taldrikule lisamiseks):'
                                    : 'PANTRY BASES & SAUCES (Click to add directly to plate):'
                            }</span>
                        </div>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;" id="pantry-group-pantry"></div>
                    </div>
                </div>
            `;
            this.hud.renderPantryItems((id) => this.stations.addToPlate(id));
        }

        const chopRawContainer = document.getElementById('chopping-raw-options');
        if (chopRawContainer) {
            chopRawContainer.innerHTML = '';
            Object.values(INGREDIENTS)
                .filter((i) => i.chopResult)
                .forEach((ing) => {
                    const btn = document.createElement('button');
                    btn.className = 'ingredient-btn';
                    btn.innerHTML = `
                        <span class="ingredient-icon">${ing.icon}</span>
                        <span class="ingredient-label">${this.state.getName(ing.id)}</span>
                    `;
                    btn.addEventListener('click', () => this.stations.startChopping(ing.id));
                    chopRawContainer.appendChild(btn);
                });
        }

        const recipeList = document.getElementById('recipe-book-list');
        if (recipeList) {
            recipeList.innerHTML = RECIPES.map((r) => {
                const ingNames = r.ingredients.map((id) => this.state.getName(id)).join(' ➔ ');
                const title = this.state.getRecipeTitle(r);
                return `
                    <div style="background: #242f3d; padding: 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <strong style="color: #ffd32a; font-size: 1.1rem;">${r.icon} ${title}</strong>
                            <span style="color: #00f2fe; font-weight: bold;">${
                                this.state.isEt ? '⭐ +30 PUNKTI (300p ➔ +50 Y)' : '⭐ +30 POINTS (300pts ➔ +50 Y)'
                            }</span>
                        </div>
                        <div style="font-size: 0.85rem; color: #a4b0be; line-height: 1.4;">
                            ${
                                this.state.isEt
                                    ? 'Vajalikud toiduained (mistahes järjekorras):'
                                    : 'Required ingredients (any order):'
                            } <strong style="color: #d2dae2;">${ingNames}</strong>
                        </div>
                    </div>
                `;
            }).join('');
        }

        this.hud.renderStovePans();
        this.hud.renderOvenStatus();
    }

    private setupEventListeners(): void {
        document.querySelectorAll('.tab-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const station = target.getAttribute('data-station');

                document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
                target.classList.add('active');

                document.querySelectorAll('.station-panel').forEach((p) => p.classList.remove('active'));
                const panel = document.getElementById(`panel-${station}`);
                if (panel) panel.classList.add('active');
            });
        });

        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (!target) return;

            const takePanBtn = target.closest('.btn-take-pan') as HTMLElement;
            if (takePanBtn) {
                e.preventDefault();
                e.stopPropagation();
                const panId = parseInt(takePanBtn.getAttribute('data-pan') || '0', 10);
                this.stations.takeFromPan(panId);
                return;
            }

            const addPanBtn = target.closest('.btn-add-pan') as HTMLElement;
            if (addPanBtn) {
                e.preventDefault();
                e.stopPropagation();
                const panId = parseInt(addPanBtn.getAttribute('data-pan') || '0', 10);
                const item = addPanBtn.getAttribute('data-item');
                if (item) {
                    this.stations.putOnPan(panId, item);
                }
                return;
            }

            if (target.closest('#btn-oven-bake-pizza')) {
                e.preventDefault();
                e.stopPropagation();
                this.stations.bakePizza();
                return;
            }

            if (target.closest('#btn-oven-take-pizza')) {
                e.preventDefault();
                e.stopPropagation();
                this.stations.takeFromOven();
                return;
            }
        });

        const doChopBtn = document.getElementById('btn-do-chop');
        if (doChopBtn) {
            doChopBtn.addEventListener('click', () =>
                this.stations.handleChopClick(this.kitchenBuilder.knife3D)
            );
        }

        const serveBtn = document.getElementById('btn-serve-dish');
        if (serveBtn) {
            serveBtn.addEventListener('click', () => this.orderManager.serveDish());
        }

        const clearBtn = document.getElementById('btn-clear-plate');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.state.currentPlate = [];
                this.hud.renderPlateUI((idx) => this.removePlateItem(idx));
                this.foodBuilder.update3DPlateModel(this.state.currentPlate);
            });
        }

        const openRecipesBtn = document.getElementById('btn-open-recipes');
        const closeRecipesBtn = document.getElementById('btn-close-recipes');
        const modalRecipes = document.getElementById('modal-recipes');

        if (openRecipesBtn && modalRecipes) {
            openRecipesBtn.addEventListener('click', () => (modalRecipes.style.display = 'flex'));
        }
        if (closeRecipesBtn && modalRecipes) {
            closeRecipesBtn.addEventListener('click', () => (modalRecipes.style.display = 'none'));
        }

        const soundBtn = document.getElementById('btn-toggle-sound');
        const soundIcon = document.getElementById('sound-icon');
        if (soundBtn && soundIcon) {
            soundBtn.addEventListener('click', () => {
                const isMuted = kitchenAudio.toggleMute();
                soundIcon.innerText = isMuted ? '🔇' : '🔊';
            });
        }
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);

        if (this.foodBuilder.food3DGroup) {
            this.foodBuilder.food3DGroup.rotation.y += 0.005;
        }

        this.kitchenBuilder.animateSteam();
        this.renderer.render(this.scene, this.camera);
    };
}

// Initialise
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new CookingGame());
} else {
    new CookingGame();
}
