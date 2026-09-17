import * as THREE from 'three';
import { Character } from '../types';
import { getLanguage, I18N } from '../i18n';

export interface SpectatorContext {
    playerChar: Character;
    characters: Character[];
    camera: THREE.PerspectiveCamera;
    getState: () => string;
    getCameraYaw: () => number;
    getCameraPitch: () => number;
    getCameraDistance: () => number;
    setCameraYaw: (yaw: number) => void;
    setCameraPitch: (pitch: number) => void;
    addIncidentFeed?: (msg: string) => void;
}

export class SpectatorSystem {
    private spectatedIndex: number = 0;
    private spectatedTarget: Character | null = null;
    private isSpectating: boolean = false;

    private spectatorBar: HTMLElement | null = null;
    private targetNameEl: HTMLElement | null = null;
    private labelEl: HTMLElement | null = null;
    private btnPrev: HTMLElement | null = null;
    private btnNext: HTMLElement | null = null;
    private hotbarContainer: HTMLElement | null = null;
    private mobileControls: HTMLElement | null = null;
    private crosshair: HTMLElement | null = null;
    private interactionPrompt: HTMLElement | null = null;

    constructor(private ctx: SpectatorContext) {}

    public init() {
        this.cacheDom();
        this.bindEvents();
    }

    private cacheDom() {
        this.spectatorBar = document.getElementById('spectator-bar');
        this.targetNameEl = document.getElementById('spectator-target-name');
        this.labelEl = document.getElementById('spectator-label-text');
        this.btnPrev = document.getElementById('btn-spec-prev');
        this.btnNext = document.getElementById('btn-spec-next');
        this.hotbarContainer = document.getElementById('hotbar-container');
        this.mobileControls = document.getElementById('mobile-controls-layer');
        this.crosshair = document.getElementById('crosshair');
        this.interactionPrompt = document.getElementById('interaction-prompt');
    }

    private bindEvents() {
        this.btnPrev?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.prevTarget();
        });
        this.btnNext?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.nextTarget();
        });

        window.addEventListener('keydown', (e) => {
            if (!this.isSpectating) return;
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.prevTarget();
            } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.nextTarget();
            }
        });
    }

    public getAliveTargets(): Character[] {
        return this.ctx.characters.filter(c => !c.isPlayer && c.isAlive);
    }

    public getSpectatedTarget(): Character | null {
        return this.spectatedTarget;
    }

    public getIsSpectating(): boolean {
        return this.isSpectating;
    }

    public nextTarget() {
        const alive = this.getAliveTargets();
        if (alive.length === 0) return;
        this.spectatedIndex = (this.spectatedIndex + 1) % alive.length;
        this.setTarget(alive[this.spectatedIndex]);
    }

    public prevTarget() {
        const alive = this.getAliveTargets();
        if (alive.length === 0) return;
        this.spectatedIndex = (this.spectatedIndex - 1 + alive.length) % alive.length;
        this.setTarget(alive[this.spectatedIndex]);
    }

    private setTarget(target: Character) {
        this.spectatedTarget = target;
        // Align camera yaw behind the spectated target so view feels like playing as them
        this.ctx.setCameraYaw(target.rotation + Math.PI);
        this.ctx.setCameraPitch(0.12);
        this.updateUi();
    }

    public update(delta: number) {
        const state = this.ctx.getState();
        const shouldSpectate = !this.ctx.playerChar.isAlive && state === 'in_game';

        if (!shouldSpectate) {
            if (this.isSpectating) {
                this.reset();
            }
            return;
        }

        const alive = this.getAliveTargets();

        if (alive.length === 0) {
            if (this.isSpectating) {
                this.reset();
            }
            return;
        }

        // Activate spectator UI
        if (!this.isSpectating) {
            this.isSpectating = true;
            if (this.spectatorBar) this.spectatorBar.style.display = 'flex';
            if (this.hotbarContainer) this.hotbarContainer.style.display = 'none';
            if (this.mobileControls) this.mobileControls.style.display = 'none';
            if (this.crosshair) this.crosshair.style.display = 'none';
            if (this.interactionPrompt) this.interactionPrompt.style.display = 'none';

            // Pick initial target
            this.spectatedIndex = 0;
            this.setTarget(alive[0]);
        }

        // Check if spectated target is still valid and alive
        if (!this.spectatedTarget || !this.spectatedTarget.isAlive) {
            this.spectatedIndex = Math.min(this.spectatedIndex, alive.length - 1);
            if (this.spectatedIndex < 0) this.spectatedIndex = 0;
            this.setTarget(alive[this.spectatedIndex]);
        }

        const target = this.spectatedTarget;
        if (!target) return;

        // Smoothly place 3rd person camera behind the spectated player ("nagu mängiks nendega")
        const camDist = Math.max(2.5, this.ctx.getCameraDistance());
        const camPitch = this.ctx.getCameraPitch();
        const camYaw = this.ctx.getCameraYaw();

        const camOffset = new THREE.Vector3(0, 2.3, camDist);
        camOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), camPitch);
        camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), camYaw);

        this.ctx.camera.position.copy(target.position).add(camOffset);
        this.ctx.camera.lookAt(target.position.clone().add(new THREE.Vector3(0, 1.8, 0)));

        if (target.mesh) {
            target.mesh.visible = true;
        }

        this.updateUi();
    }

    public updateUi() {
        if (!this.targetNameEl) return;
        const alive = this.getAliveTargets();
        const idx = this.spectatedTarget ? alive.indexOf(this.spectatedTarget) + 1 : 1;
        const count = alive.length;
        const name = this.spectatedTarget?.name || 'Mängija';
        this.targetNameEl.textContent = `${name} (${idx}/${count})`;

        const lang = getLanguage();
        const texts = I18N[lang];
        if (this.labelEl && texts?.hud?.spectating) {
            this.labelEl.textContent = texts.hud.spectating;
        }
    }

    public reset() {
        this.isSpectating = false;
        this.spectatedTarget = null;
        this.spectatedIndex = 0;
        if (this.spectatorBar) this.spectatorBar.style.display = 'none';
        if (this.hotbarContainer) this.hotbarContainer.style.display = 'flex';
    }
}
