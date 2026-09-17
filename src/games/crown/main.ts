import * as THREE from 'three';
import { GameState } from './state/gameState';
import { StageBuilder } from './world/stageBuilder';
import { CameraController } from './systems/camera';
import { PlayerController } from './systems/playerController';
import { CrownHud } from './ui/hud';
import { CrownChatUI } from './ui/chat';
import { CrownLeaderboardUI } from './ui/leaderboard';
import { yardService } from '../../shared/yardService';
import { isTestMode } from '../../auth';

export class CrownObbyGame {
    public scene!: THREE.Scene;
    public camera!: THREE.PerspectiveCamera;
    public renderer!: THREE.WebGLRenderer;

    public gameState: GameState;
    public stageBuilder!: StageBuilder;
    public cameraController!: CameraController;
    public playerController!: PlayerController;

    public hud!: CrownHud;
    public chatUI!: CrownChatUI;
    public leaderboardUI!: CrownLeaderboardUI;

    private lastTime: number = 0;
    private isRunning: boolean = false;

    constructor() {
        this.gameState = new GameState();
        this.init();
    }

    private init() {
        console.log('Initializing 👑 24K Crown Obby (50 Stages)...');

        const isOwner = this.gameState.getIsOwner();
        const inTest = isTestMode() || (window as any).__PLAYARD_TEST_MODE__;
        const isUnlocked = this.gameState.isUnlockedWithPasscode();

        const comingSoonModal = document.getElementById('coming-soon-modal');
        if (!isOwner && !inTest && !isUnlocked) {
            // Non-owner: Show Coming Soon modal with 6-digit passcode option
            if (comingSoonModal) comingSoonModal.style.display = 'flex';
            this.setupPasscodeUnlock();
            return;
        } else {
            if (comingSoonModal) comingSoonModal.style.display = 'none';
        }

        this.startPlay();
    }

    private setupPasscodeUnlock() {
        const input = document.getElementById('crown-passcode-input') as HTMLInputElement | null;
        const submitBtn = document.getElementById('btn-submit-crown-passcode');
        const errorMsg = document.getElementById('crown-passcode-error');
        const comingSoonModal = document.getElementById('coming-soon-modal');

        const tryUnlock = () => {
            const val = input?.value.trim() || '';
            if (this.gameState.checkPasscode(val)) {
                if (comingSoonModal) comingSoonModal.style.display = 'none';
                if (!this.isRunning) {
                    this.startPlay();
                }
            } else {
                if (errorMsg) {
                    errorMsg.textContent = 'Better luck next time 😂';
                    errorMsg.style.display = 'block';
                }
                if (input) {
                    input.style.borderColor = '#ff4757';
                    input.value = '';
                    input.focus();
                }
            }
        };

        submitBtn?.addEventListener('click', tryUnlock);
        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') tryUnlock();
        });
    }

    private startPlay() {
        if (this.isRunning) return;

        // Record in Recently Played Games with prize description
        try {
            yardService.recordPlayedGame({
                id: 'crown',
                title: '👑 24K Crown Obby',
                description: "The world's only 👑 24K Royal Crown & Golden Monarch outfit!",
                url: './games/crown/index.html',
                icon: '👑',
                badgeText: '🏆 50 Stages Obby'
            });
        } catch (e) {
            console.warn('Could not record crown game played:', e);
        }

        this.setupThreeJS();

        this.stageBuilder = new StageBuilder(this.scene);
        this.stageBuilder.buildWorld();

        this.cameraController = new CameraController();

        this.playerController = new PlayerController({
            scene: this.scene,
            gameState: this.gameState,
            stageBuilder: this.stageBuilder,
            onStageChanged: (stage) => {
                this.hud.update();
                this.leaderboardUI.render();
            },
            onVictory: () => {
                this.hud.showVictory();
                this.leaderboardUI.render();
            }
        });

        this.hud = new CrownHud(this.gameState, () => {
            this.playerController.respawn(true);
        });

        this.chatUI = new CrownChatUI(this.gameState);
        this.leaderboardUI = new CrownLeaderboardUI(this.gameState);

        this.setupResizeListener();

        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.animate(t));
    }

    private setupThreeJS() {
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 10);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const container = document.getElementById('canvas-container');
        if (container) {
            container.appendChild(this.renderer.domElement);
        } else {
            document.body.appendChild(this.renderer.domElement);
        }
    }

    private setupResizeListener() {
        window.addEventListener('resize', () => {
            if (!this.camera || !this.renderer) return;
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    private animate(currentTime: number) {
        if (!this.isRunning) return;
        requestAnimationFrame((t) => this.animate(t));

        const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        const timeInSec = currentTime / 1000;
        this.lastTime = currentTime;

        // Update systems
        this.stageBuilder.update(dt, timeInSec);
        this.playerController.update(dt, this.cameraController.cameraRotation.y);
        this.cameraController.update(this.camera, this.playerController.getPosition());

        this.renderer.render(this.scene, this.camera);
    }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
    (window as any).crownGame = new CrownObbyGame();
});
