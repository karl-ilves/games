import * as THREE from 'three';
import { yardService } from '../../shared/yardService';
import { GameState } from './types';
import { RacingState } from './state/racingState';
import { RacingAudio } from './audio';
import { RacingEnvironment } from './world/environment';
import { VehicleBuilder } from './models/vehicleBuilder';
import { EmergencySystem } from './systems/emergencySystem';
import { OpponentsManager } from './systems/opponents';
import { PlayerPhysics } from './systems/playerPhysics';
import { CameraController } from './systems/camera';
import { InputManager } from './systems/input';
import { RacingHud } from './ui/racingHud';
import { GarageUI } from './ui/garageUI';

export class RacingGame {
    private scene!: THREE.Scene;
    private renderer!: THREE.WebGLRenderer;
    private clock!: THREE.Clock;

    public state: RacingState = new RacingState();
    public audio: RacingAudio = new RacingAudio();
    public environment: RacingEnvironment = new RacingEnvironment();
    public vehicleBuilder: VehicleBuilder = new VehicleBuilder();
    public emergencySystem: EmergencySystem = new EmergencySystem();
    public opponentsMgr: OpponentsManager = new OpponentsManager();
    public playerPhysics: PlayerPhysics = new PlayerPhysics();
    public cameraCtrl: CameraController = new CameraController();
    public input: InputManager = new InputManager();
    public hud: RacingHud = new RacingHud();
    public garageUI!: GarageUI;

    public gameState: GameState = 'garage';
    public nextCheckpointIndex: number = 0;
    public raceTime: number = 0;

    private uiGarage!: HTMLElement;
    private uiHud!: HTMLElement;
    private uiHudBottom!: HTMLElement;
    private uiSpeed!: HTMLElement;

    constructor() {
        this.garageUI = new GarageUI(this.state, (id) => this.selectVehicle(id));
    }

    public async init(): Promise<void> {
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        this.clock = new THREE.Clock();

        this.environment.createEnvironment(this.scene, this.renderer, this.state.selectedLevel);

        await this.state.loadProgress();
        this.garageUI.updateGarageUI();
        yardService.subscribe(() => this.garageUI.updateGarageUI());
        yardService.recordPlayedGame({
            id: 'racing',
            title: '🏎️ Racing Simulator',
            description: 'Race high-speed sports cars and motorcycles on challenging circuits against opponents.',
            url: './games/racing/index.html',
            icon: '🏎️',
            badgeText: 'Circuit Racing',
            badgeColor: '#00f2fe'
        });

        this.uiGarage = document.getElementById('garage-screen')!;
        this.uiHud = document.getElementById('hud')!;
        this.uiHudBottom = document.getElementById('hud-bottom')!;
        this.uiSpeed = document.getElementById('speed-val')!;

        this.garageUI.bindGarageEvents(() => this.startRace());
        this.input.init();
        window.addEventListener('resize', () => this.cameraCtrl.onWindowResize(this.renderer));

        this.createPlayerVehicle();
        this.animate();
    }

    public createPlayerVehicle(): void {
        if (this.playerPhysics.playerVehicleGroup) {
            this.scene.remove(this.playerPhysics.playerVehicleGroup);
        }

        this.playerPhysics.playerVehicleGroup = new THREE.Group();
        const cp = this.environment.checkpoints[0];
        const cpNext = this.environment.checkpoints[1];
        const dx = cpNext.x - cp.x;
        const dz = cpNext.z - cp.z;
        const angle = Math.atan2(dx, dz) + Math.PI;
        this.playerPhysics.playerVehicleGroup.position.set(cp.x, 0, cp.z);

        const vDef = this.state.getSelectedVehicle();
        const color = new THREE.Color(vDef.type === 'car' ? 0x27ae60 : 0xe67e22);
        const hsl = { h: 0, s: 0, l: 0 };
        color.getHSL(hsl);
        hsl.h = (hsl.h + vDef.hueRotate / 360) % 1.0;
        if (hsl.h < 0) hsl.h += 1.0;
        color.setHSL(hsl.h, hsl.s, hsl.l);

        const buildRes = this.vehicleBuilder.buildDetailedVehicle(vDef, color);
        this.playerPhysics.playerVehicleGroup.add(buildRes.group);
        this.playerPhysics.playerWheels = buildRes.wheels;

        const playerArrow = this.vehicleBuilder.createFloatingArrow(0xff0000);
        this.playerPhysics.playerVehicleGroup.add(playerArrow);

        this.scene.add(this.playerPhysics.playerVehicleGroup);

        this.playerPhysics.playerSpeed = 0;
        this.playerPhysics.playerHeading = angle;
        this.playerPhysics.playerVehicleGroup.rotation.y = this.playerPhysics.playerHeading;
    }

    public selectVehicle(type: string): void {
        this.state.vehicleType = type;
        this.createPlayerVehicle();
        const vDef = this.state.getSelectedVehicle();
        this.playerPhysics.maxSpeed = this.state.getVehicleMaxSpeed(vDef);
        this.playerPhysics.acceleration = vDef.acceleration;
        this.playerPhysics.turnSpeed = 1.5 * vDef.handling;
        this.garageUI.updateGarageUI();
    }

    public startRace(): void {
        this.audio.initAudio();
        const vDef = this.state.getSelectedVehicle();
        this.playerPhysics.maxSpeed = this.state.getVehicleMaxSpeed(vDef);
        this.playerPhysics.acceleration = vDef.acceleration;
        this.playerPhysics.turnSpeed = 1.5 * vDef.handling;

        this.environment.createEnvironment(this.scene, this.renderer, this.state.selectedLevel);
        this.createPlayerVehicle();

        this.uiGarage.style.display = 'none';
        this.uiHud.style.display = 'block';
        this.uiHudBottom.style.display = 'flex';
        document.getElementById('minimap')!.style.display = 'block';
        this.gameState = 'countdown';
        this.nextCheckpointIndex = 0;
        this.raceTime = 0;

        this.opponentsMgr.spawnOpponents(
            this.scene,
            this.environment.checkpoints,
            this.state.selectedLevel,
            this.vehicleBuilder
        );
        this.startCountdown();
    }

    private startCountdown(): void {
        let count = 3;
        const cdEl = document.getElementById('countdown')!;
        cdEl.style.display = 'block';

        const interval = setInterval(() => {
            cdEl.innerText = count.toString();
            if (count === 0) {
                cdEl.innerText = 'GO!';
                this.gameState = 'racing';
                setTimeout(() => (cdEl.style.display = 'none'), 1000);
                clearInterval(interval);
            }
            count--;
        }, 1000);
    }

    private updateGameLogic(dt: number): void {
        if (this.gameState !== 'racing') return;

        this.raceTime += dt;
        const vDef = this.state.getSelectedVehicle();
        this.audio.updateEngineSound(this.playerPhysics.playerSpeed, this.playerPhysics.maxSpeed, vDef.type === 'moto');

        // Rankings calculation
        const finishedAICount = this.opponentsMgr.opponents.filter((ai) => ai.finished).length;
        const activeRacers: { isPlayer: boolean; cp: number; distSq: number }[] = [];

        const targetCp = this.environment.checkpoints[this.nextCheckpointIndex] || this.environment.checkpoints[0];
        activeRacers.push({
            isPlayer: true,
            cp: this.nextCheckpointIndex,
            distSq:
                Math.pow(targetCp.x - this.playerPhysics.playerVehicleGroup.position.x, 2) +
                Math.pow(targetCp.z - this.playerPhysics.playerVehicleGroup.position.z, 2)
        });

        this.opponentsMgr.opponents.forEach((ai) => {
            if (!ai.finished) {
                const aiCp = this.environment.checkpoints[ai.targetCpIndex] || this.environment.checkpoints[0];
                activeRacers.push({
                    isPlayer: false,
                    cp: ai.targetCpIndex,
                    distSq:
                        Math.pow(aiCp.x - ai.group.position.x, 2) +
                        Math.pow(aiCp.z - ai.group.position.z, 2)
                });
            }
        });

        activeRacers.sort((a, b) => {
            if (a.cp !== b.cp) return b.cp - a.cp;
            return a.distSq - b.distSq;
        });

        const currentPlayerPosition = finishedAICount + activeRacers.findIndex((r) => r.isPlayer) + 1;
        (window as any).currentPlayerPosition = currentPlayerPosition;

        this.hud.updateRaceHud(
            this.raceTime,
            currentPlayerPosition,
            this.opponentsMgr.opponents.length + 1,
            this.nextCheckpointIndex
        );

        // Checkpoints detection
        const cp = this.environment.checkpoints[this.nextCheckpointIndex];
        if (cp) {
            const dx = this.playerPhysics.playerVehicleGroup.position.x - cp.x;
            const dz = this.playerPhysics.playerVehicleGroup.position.z - cp.z;
            if (Math.sqrt(dx * dx + dz * dz) < cp.radius) {
                this.nextCheckpointIndex++;

                if (this.nextCheckpointIndex >= this.environment.checkpoints.length) {
                    this.gameState = 'finished';
                    const timeStr = document.getElementById('time-val')?.innerText || '';
                    this.hud.handleRaceFinished(this.state, currentPlayerPosition, timeStr);
                    return;
                }

                const displayCp = this.nextCheckpointIndex === 0 ? 10 : this.nextCheckpointIndex;
                const cpVal = document.getElementById('cp-val');
                if (cpVal) cpVal.innerText = `${displayCp}/10`;
            }
        }

        // Nitro regeneration
        if (!this.input.keys['ShiftLeft'] && this.playerPhysics.nitro < 100) {
            this.playerPhysics.nitro += dt * 5;
            if (this.playerPhysics.nitro > 100) this.playerPhysics.nitro = 100;
        }
        this.hud.updateNitroBar(this.playerPhysics.nitro);

        // Update AI
        this.opponentsMgr.updateOpponents(dt, this.environment.checkpoints);

        // Update Player 3D Arrow
        const bobGroup = this.playerPhysics.playerVehicleGroup.getObjectByName('floatingArrowBob');
        if (bobGroup && this.gameState === 'racing') {
            const arrow = bobGroup.getObjectByName('floatingArrow');
            if (arrow && this.environment.checkpoints[this.nextCheckpointIndex]) {
                const nextCp = this.environment.checkpoints[this.nextCheckpointIndex];
                const adx = nextCp.x - this.playerPhysics.playerVehicleGroup.position.x;
                const adz = nextCp.z - this.playerPhysics.playerVehicleGroup.position.z;
                const targetAngle = Math.atan2(adx, adz) + Math.PI;
                arrow.rotation.y = targetAngle - this.playerPhysics.playerHeading;
            }
            bobGroup.position.y = Math.sin(Date.now() * 0.005) * 1.0;
        }
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);
        const dt = this.clock.getDelta();

        if (this.gameState === 'racing') {
            this.playerPhysics.animateWheels(dt);
            this.opponentsMgr.animateWheels(dt);
        }

        const isMoto = this.state.getSelectedVehicle().type === 'moto';
        this.playerPhysics.updatePhysics(
            dt,
            this.input.keys,
            this.input.joystickMoveVector,
            isMoto,
            this.emergencySystem,
            this.uiSpeed
        );

        if (this.gameState === 'racing') {
            this.playerPhysics.checkCollisions(
                this.scene,
                dt,
                this.opponentsMgr,
                this.emergencySystem,
                this.raceTime
            );
        }

        this.emergencySystem.updateCrashEvents(this.scene, dt);
        this.updateGameLogic(dt);
        this.cameraCtrl.updateCamera(
            this.playerPhysics.playerVehicleGroup.position,
            this.playerPhysics.playerHeading
        );

        this.hud.drawMinimap(
            this.environment.checkpoints,
            this.nextCheckpointIndex,
            this.playerPhysics.playerVehicleGroup ? this.playerPhysics.playerVehicleGroup.position : null,
            this.opponentsMgr.opponents
        );

        this.renderer.render(this.scene, this.cameraCtrl.camera);
    };
}

// Global instance for browser / test compatibility
const game = new RacingGame();
(window as any).racingGame = game;
(window as any).__RACING_GAME_INSTANCE__ = game;
game.init();
