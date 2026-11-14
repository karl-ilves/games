import * as THREE from 'three';
import { FoneWorld } from './world/environment';
import { FonePlayerAvatar } from './models/avatarController';
import { FoneCameraSystem } from './systems/camera';
import { FoneInputSystem } from './systems/input';
import { FonePlayHUD } from './ui/hud';
import { FoneVariant, MotionStep } from './types';
import { fonePlayState } from './state/foneState';
import { isPhoneDevice } from '../../shared/mobileControls';

export class FonePlayGame {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;

    public world: FoneWorld;
    public avatar: FonePlayerAvatar;
    public cameraSystem: FoneCameraSystem;
    public inputSystem: FoneInputSystem;
    public hud: FonePlayHUD;

    // Active test run state
    private activeVariant: FoneVariant | null = null;
    private currentStepIndex: number = 0;
    private stepElapsedSeconds: number = 0;
    private isRunningStep: boolean = false;
    private lastTime: number = performance.now();

    constructor() {
        this.enforcePhoneDeviceNotice();

        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x060b11);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 500);
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.world = new FoneWorld(this.scene);
        this.avatar = new FonePlayerAvatar(this.scene);
        this.cameraSystem = new FoneCameraSystem(this.camera);
        this.inputSystem = new FoneInputSystem();

        this.hud = new FonePlayHUD(
            (variant: FoneVariant) => this.startVariant(variant),
            () => this.stopAndShowPicker(),
            () => this.hud.showPollModal()
        );

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Start animation loop
        this.animate();

        // Initially show variant picker overlay
        this.hud.showVariantPicker();
    }

    private enforcePhoneDeviceNotice() {
        const isPhone = isPhoneDevice();
        const nonPhoneNotice = document.getElementById('non-phone-warning-banner');
        if (nonPhoneNotice) {
            nonPhoneNotice.style.display = isPhone ? 'none' : 'block';
        }
    }

    public startVariant(variant: FoneVariant) {
        this.activeVariant = variant;
        this.currentStepIndex = 0;
        this.stepElapsedSeconds = 0;
        this.isRunningStep = true;

        // Reset avatar to center
        this.avatar.reset(new THREE.Vector3(0, 0, 0), 0);

        this.hud.hideVariantPicker();
        this.hud.updateGameplayHUD(this.activeVariant, this.currentStepIndex, this.activeVariant.steps[0].durationSeconds, false);
    }

    public stopAndShowPicker() {
        this.activeVariant = null;
        this.isRunningStep = false;
        this.hud.showVariantPicker();
    }

    private advanceStep() {
        if (!this.activeVariant) return;

        this.currentStepIndex++;
        this.stepElapsedSeconds = 0;

        if (this.currentStepIndex >= this.activeVariant.steps.length) {
            // Variant completely finished!
            const finishedVariantId = this.activeVariant.id;
            fonePlayState.markVariantCompleted(finishedVariantId);
            this.activeVariant = null;
            this.isRunningStep = false;

            // Prompt user: Do you want to vote?
            this.hud.showAskPollModal(finishedVariantId);
        }
    }

    private isPlayerPerformingStep(step: MotionStep, moveVector: { x: number; y: number }, jumpTriggered: boolean): boolean {
        // Only count timer when player is ACTUALLY manually moving/performing the required action!
        const forwardMag = -moveVector.y; // > 0.15 is forward, < -0.15 is backward
        const horizontalMag = moveVector.x; // < -0.15 is left, > 0.15 is right

        switch (step.action) {
            case 'forward':
            case 'dash':
                return forwardMag > 0.2;
            case 'backward':
                return forwardMag < -0.2;
            case 'jump':
                return jumpTriggered || !this.avatar.isGrounded;
            case 'turn_left':
                return horizontalMag < -0.2;
            case 'turn_right':
                return horizontalMag > 0.2;
            case 'spin':
                return Math.abs(horizontalMag) > 0.2;
            default:
                return Math.abs(forwardMag) > 0.1 || Math.abs(horizontalMag) > 0.1;
        }
    }

    private animate = () => {
        requestAnimationFrame(this.animate);

        const now = performance.now();
        const delta = Math.min(0.08, (now - this.lastTime) / 1000);
        this.lastTime = now;

        const jumpTriggered = this.inputSystem.consumeJump();
        // Fully manual movement - no automatic scripts driving the character!
        this.avatar.update(delta, this.inputSystem.moveVector, jumpTriggered);
        this.cameraSystem.update(this.avatar.position, this.avatar.characterYaw);
        this.world.update(now * 0.001);

        // Advance active motion test variant
        if (this.isRunningStep && this.activeVariant) {
            const step = this.activeVariant.steps[this.currentStepIndex];
            if (step) {
                const isPerforming = this.isPlayerPerformingStep(step, this.inputSystem.moveVector, jumpTriggered);

                // ONLY advance the 2s timer while the player is actively moving/performing!
                if (isPerforming) {
                    this.stepElapsedSeconds += delta;
                }

                const remaining = Math.max(0, step.durationSeconds - this.stepElapsedSeconds);
                this.hud.updateGameplayHUD(this.activeVariant, this.currentStepIndex, remaining, isPerforming);

                if (this.stepElapsedSeconds >= step.durationSeconds) {
                    this.advanceStep();
                }
            }
        }

        this.renderer.render(this.scene, this.camera);
    };
}

// Bootstrap
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        const game = new FonePlayGame();
        (window as any).fonePlayGame = game;
    });
}
