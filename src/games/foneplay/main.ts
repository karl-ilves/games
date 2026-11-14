import * as THREE from 'three';
import { FoneWorld } from './world/environment';
import { FonePlayerAvatar } from './models/avatarController';
import { FoneCameraSystem } from './systems/camera';
import { FoneInputSystem } from './systems/input';
import { FonePlayHUD } from './ui/hud';
import { FoneVariant } from './types';
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
        this.hud.updateGameplayHUD(this.activeVariant, this.currentStepIndex, this.activeVariant.steps[0].durationSeconds);
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

            // Prompt user: Kas soovid hääletada?
            this.hud.showAskPollModal(finishedVariantId);
        }
    }

    private animate = () => {
        requestAnimationFrame(this.animate);

        const now = performance.now();
        const delta = Math.min(0.08, (now - this.lastTime) / 1000);
        this.lastTime = now;

        const jumpTriggered = this.inputSystem.consumeJump();
        this.avatar.update(delta, this.inputSystem.moveVector, jumpTriggered);
        this.cameraSystem.update(this.avatar.position, this.avatar.characterYaw);
        this.world.update(now * 0.001);

        // Advance active motion test variant
        if (this.isRunningStep && this.activeVariant) {
            const step = this.activeVariant.steps[this.currentStepIndex];
            if (step) {
                this.stepElapsedSeconds += delta;
                const remaining = Math.max(0, step.durationSeconds - this.stepElapsedSeconds);
                this.hud.updateGameplayHUD(this.activeVariant, this.currentStepIndex, remaining);

                // Specific scripted assistance / visual guidance per action
                this.applyScriptedActionAssistance(step.action, delta);

                if (this.stepElapsedSeconds >= step.durationSeconds) {
                    this.advanceStep();
                }
            }
        }

        this.renderer.render(this.scene, this.camera);
    };

    private applyScriptedActionAssistance(action: string, delta: number) {
        // Automatically support player motion during test steps to guarantee fun kinetic experience
        if (action === 'spin') {
            this.avatar.characterYaw += 3.8 * delta;
        } else if (action === 'dash') {
            const forwardX = Math.sin(this.avatar.characterYaw);
            const forwardZ = Math.cos(this.avatar.characterYaw);
            this.avatar.position.x += forwardX * 6.0 * delta;
            this.avatar.position.z += forwardZ * 6.0 * delta;
        } else if (action === 'turn_left') {
            this.avatar.characterYaw += 1.8 * delta;
        } else if (action === 'turn_right') {
            this.avatar.characterYaw -= 1.8 * delta;
        }
    }
}

// Bootstrap
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        const game = new FonePlayGame();
        (window as any).fonePlayGame = game;
    });
}
