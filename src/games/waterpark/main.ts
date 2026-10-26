import * as THREE from 'three';
import { waterParkState } from './state/waterParkState';
import { WaterParkEnvironment } from './world/environment';
import { WaterParkCamera } from './systems/camera';
import { BuildSystem } from './systems/buildSystem';
import { VisitorSystem } from './systems/visitorSystem';
import { SplashParticles } from './effects/particles';
import { WaterParkHUD } from './ui/hud';
import { waterAudio } from './audio';

export class WaterParkGame {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;

    private environment: WaterParkEnvironment;
    private cameraController: WaterParkCamera;
    private buildSystem: BuildSystem;
    private visitorSystem: VisitorSystem;
    private splashParticles: SplashParticles;
    private hud: WaterParkHUD;

    private lastTime: number = performance.now();
    private incomeTimer: number = 0;
    private waveTimer: number = 0;

    constructor() {
        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 500);
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;

        this.environment = new WaterParkEnvironment(this.scene);
        this.cameraController = new WaterParkCamera(this.camera, canvas);
        this.buildSystem = new BuildSystem(this.scene, this.camera, canvas);
        this.visitorSystem = new VisitorSystem(this.scene);
        this.splashParticles = new SplashParticles(this.scene);

        this.hud = new WaterParkHUD(
            (attractionId: string) => this.buildSystem.selectAttractionToBuild(attractionId),
            () => this.toggleWavePool(),
            () => {}
        );

        this.initControls();
        this.animate();
    }

    private initControls() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Camera mode toggle button
        const btnCam = document.getElementById('btn-cycle-camera');
        if (btnCam) {
            btnCam.addEventListener('click', () => {
                const current = this.cameraController.getMode();
                const next = current === 'orbit' ? 'drone' : current === 'drone' ? 'slide_ride' : 'orbit';
                this.cameraController.setMode(next);
                const tag = document.getElementById('cam-name-tag');
                if (tag) tag.textContent = next.toUpperCase();
            });
        }

        // Sound toggle
        const btnSound = document.getElementById('btn-toggle-sound');
        if (btnSound) {
            btnSound.addEventListener('click', () => {
                const isMuted = waterAudio.toggleMute();
                btnSound.textContent = isMuted ? '🔇' : '🔊';
            });
        }
    }

    private toggleWavePool() {
        const active = waterParkState.toggleWavePool();
        if (active) {
            waterAudio.playSplash();
        }
    }

    private animate = () => {
        requestAnimationFrame(this.animate);
        const now = performance.now();
        const delta = Math.min(0.1, (now - this.lastTime) / 1000);
        this.lastTime = now;

        // Passive park income tick every 10 seconds
        this.incomeTimer += delta;
        if (this.incomeTimer >= 10) {
            this.incomeTimer = 0;
            const income = Math.round(waterParkState.calculateTotalIncomePerMin() / 6);
            if (income > 0) {
                waterParkState.addCash(income);
                waterAudio.playCashEarned();
            }
            waterParkState.degradeCleanliness(0.3);
        }

        // Wave pool physical oscillation animation
        if (waterParkState.isWavePoolActive()) {
            this.waveTimer += delta * 4;
            const wavePoolWater = this.scene.getObjectByName('wave_pool_surface') as THREE.Mesh;
            if (wavePoolWater) {
                wavePoolWater.position.y = 1.6 + Math.sin(this.waveTimer) * 0.35;
                if (Math.random() < 0.05) {
                    this.splashParticles.createSplash(0, 1.6, 0, 8);
                }
            }
        }

        this.visitorSystem.update(delta);
        this.splashParticles.update(delta);
        this.hud.updateStats(this.visitorSystem.getVisitorCount());

        this.renderer.render(this.scene, this.camera);
    };
}

// Global bootstrap for Playard
window.addEventListener('DOMContentLoaded', () => {
    (window as any).__waterParkGame = new WaterParkGame();
});
