import * as THREE from 'three';
import { getCurrentUserProfile, isPlayardOwner, isTestMode } from '../../auth';
import { yardService } from '../../shared/yardService';
import { isMobileOrTabletDevice } from '../../shared/mobileControls';

import { AircraftConfig } from './types';
import { getAircraftById } from './catalog';
import { planeCrashState } from './state/planeCrashState';
import { planeAudio } from './audio';
import { PlaneBuilder, BuiltPlaneResult } from './models/planeBuilder';
import { WorldEnvironment } from './world/environment';
import { ParticleSystem } from './effects/particles';
import { FlightPhysics } from './systems/flightPhysics';
import { CrashSystem } from './systems/crashSystem';
import { FlightCamera } from './systems/camera';
import { InputController } from './systems/input';

import { StartMenu } from './ui/startMenu';
import { HangarShopModal } from './ui/hangarShopModal';
import { FlightHUD } from './ui/hud';
import { CrashSummaryModal } from './ui/crashSummaryModal';

export class PlaneCrashGame {
    private scene: THREE.Scene;
    private renderer: THREE.WebGLRenderer;
    private cameraSys: FlightCamera;
    private environment: WorldEnvironment;
    private particles: ParticleSystem;
    private physics: FlightPhysics;
    private crashSys: CrashSystem;
    private input: InputController;

    private currentPlaneMesh: BuiltPlaneResult | null = null;
    private currentConfig: AircraftConfig;

    private startMenu: StartMenu;
    private hangarModal: HangarShopModal;
    private hud: FlightHUD;
    private crashModal: CrashSummaryModal;

    private lastTime: number = performance.now();
    private isPlaying: boolean = false;
    private puffTimer: number = 0;
    private lastBoundaryWarnTime: number = 0;

    constructor() {
        // 1. Access Verification (Playard Owner Only)
        const userProf = getCurrentUserProfile();
        const isOwner = isPlayardOwner(userProf?.email);
        const testing = isTestMode();

        const vipOverlay = document.getElementById('vip-restricted-overlay');
        if (!isOwner && !testing && vipOverlay) {
            vipOverlay.style.display = 'flex';
            return;
        }

        // Record in Platform Recently Played
        yardService.recordPlayedGame({
            id: 'planecrash',
            title: '✈️💥 Plane Crash Simulator',
            description: '3D allakukkumise ja lendamise simulaator 11 lennukiga eksklusiivselt Playard Ownerile.',
            url: './games/planecrash/index.html',
            icon: '✈️',
            badgeText: '👑 OWNER EXCLUSIVE'
        });

        // 2. Three.js Scene & Renderer
        this.scene = new THREE.Scene();
        this.cameraSys = new FlightCamera(65, window.innerWidth / window.innerHeight);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x74b9ff, 1);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const container = document.getElementById('canvas-container');
        if (container) container.appendChild(this.renderer.domElement);

        // 3. Subsystems
        this.environment = new WorldEnvironment(this.scene);
        this.particles = new ParticleSystem(this.scene);

        const initialPlaneId = planeCrashState.getSelectedPlaneId();
        this.currentConfig = getAircraftById(initialPlaneId);
        this.physics = new FlightPhysics(this.currentConfig);
        this.crashSys = new CrashSystem(this.environment, this.particles);
        this.input = new InputController();

        // 4. UI Components
        this.startMenu = new StartMenu();
        this.hangarModal = new HangarShopModal();
        this.hud = new FlightHUD();
        this.crashModal = new CrashSummaryModal();

        // Mobile Controls setup
        const isTouch = isMobileOrTabletDevice() || window.location.search.includes('mobile=true');
        const mobileOverlay = document.getElementById('mobile-flight-controls');
        if (isTouch && mobileOverlay) {
            mobileOverlay.style.display = 'flex';
        }

        this.initEvents();
        this.spawnAircraft(this.currentConfig);

        // Resize handler
        window.addEventListener('resize', () => this.onWindowResize());

        // Start Loop
        requestAnimationFrame((t) => this.animate(t));
    }

    private initEvents(): void {
        // Start Menu Play button -> opens Hangar / Shop
        this.startMenu.onPlayClicked = () => {
            this.hangarModal.show();
        };

        // Hangar Launch Flight
        this.hangarModal.onLaunchFlight = (plane) => {
            this.currentConfig = plane;
            this.spawnAircraft(plane);
            this.startFlight();
        };

        // HUD events
        this.hud.onOpenHangar = () => {
            planeAudio.stopEngine();
            this.hangarModal.show();
        };

        this.hud.onToggleCamera = () => {
            const mode = this.cameraSys.toggleMode();
            this.hud.setCameraModeText(mode);
        };

        this.hud.onQuickRespawn = () => {
            this.respawnCurrentPlane();
        };

        this.hud.onResetMap = () => {
            this.environment.resetMap();
            this.hud.showStuntToast('🏗️ Kaart taastatud! Lennujuhtimistorn on uuesti püsti!');
        };

        // Input shortcuts
        this.input.onToggleCamera = () => {
            const mode = this.cameraSys.toggleMode();
            this.hud.setCameraModeText(mode);
        };

        this.input.onRestartRequested = () => {
            this.respawnCurrentPlane();
        };

        const toggleGearAction = () => {
            const down = this.physics.toggleGear();
            planeAudio.playGearToggle(down);
            this.hud.setGearText(down);
            this.hud.showStuntToast(down ? '⚙️ TELIK ALLA LASTUD (Rattad valmis maandumiseks)!' : '⚙️ TELIK SISSE TÕMMATUD!');
        };
        this.input.onToggleGear = toggleGearAction;
        this.hud.onToggleGear = toggleGearAction;

        // Stunt notification toast
        this.physics.onStunt = (type, text, bonus) => {
            planeAudio.playStuntWhoosh();
            this.hud.showStuntToast(text);
        };

        // Partial damage (wing rip off / tail strike)
        this.crashSys.onDamageTriggered = (text) => {
            this.hud.showStuntToast(text);
            this.cameraSys.triggerImpactShake(1.2);
        };

        // Coins updated (e.g. smooth landing bonus)
        this.crashSys.onCoinsUpdated = () => {
            this.hud.updateCoins();
        };

        // Crash Triggered
        this.crashSys.onCrashTriggered = (report) => {
            this.cameraSys.setCrashMode(this.crashSys.crashPosition);
            this.hud.updateCoins();

            setTimeout(() => {
                this.crashModal.show(report);
            }, 1800);
        };

        // Crash Modal Buttons
        this.crashModal.onRetryClicked = () => {
            this.respawnCurrentPlane();
        };

        this.crashModal.onHangarClicked = () => {
            this.hangarModal.show();
        };
    }

    private spawnAircraft(config: AircraftConfig): void {
        // Clear previous plane and debris
        if (this.currentPlaneMesh) {
            this.scene.remove(this.currentPlaneMesh.rootGroup);
        }
        this.crashSys.clearDebris();

        this.currentConfig = config;
        this.physics.config = config;

        // Build procedural mesh
        this.currentPlaneMesh = PlaneBuilder.build(config);
        this.scene.add(this.currentPlaneMesh.rootGroup);

        // Reset flight physics on runway or air
        const startPos = new THREE.Vector3(0, 150, 600);
        this.physics.reset(startPos, 0, Math.min(240, config.topSpeedKmh * 0.7));

        this.currentPlaneMesh.rootGroup.position.copy(this.physics.position);
        this.currentPlaneMesh.rootGroup.quaternion.copy(this.physics.quaternion);
        this.currentPlaneMesh.rootGroup.visible = true;

        this.cameraSys.mode = 'chase';
        this.cameraSys.snapTo(this.physics);
        this.hud.setCameraModeText('CHASE');
    }

    private startFlight(): void {
        this.isPlaying = true;
        this.respawnCurrentPlane();
        planeAudio.startEngine(this.physics.state.throttle);
    }

    private respawnCurrentPlane(): void {
        this.crashModal.hide();
        this.hangarModal.hide();
        this.crashSys.clearDebris();

        this.spawnAircraft(this.currentConfig);
        planeAudio.startEngine(this.physics.state.throttle);
    }

    private onWindowResize(): void {
        this.cameraSys.camera.aspect = window.innerWidth / window.innerHeight;
        this.cameraSys.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private animate(currentTime: number): void {
        requestAnimationFrame((t) => this.animate(t));

        const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;

        // 1. Process User Controls
        this.input.update();

        // 2. Aerodynamics & Movement
        if (!this.physics.state.isCrashed) {
            this.physics.update(dt, this.input.inputs);

            // Check collision with terrain, skyscrapers, and mountain boundary immediately
            if (this.currentPlaneMesh) {
                this.crashSys.checkCollisions(this.physics, this.currentPlaneMesh);
            }

            // Proximity warning when approaching forbidden mountain airspace
            const distFromCenter = Math.sqrt(this.physics.position.x ** 2 + this.physics.position.z ** 2);
            if (distFromCenter > 1900 && distFromCenter < 2200 && !this.physics.state.isCrashed) {
                if (currentTime - this.lastBoundaryWarnTime > 4000) {
                    this.lastBoundaryWarnTime = currentTime;
                    this.hud.showStuntToast('⚠️ HOIATUS: Lähened mägedele! Üle mägede lendamine keelatud!');
                }
            }

            // Sync visual mesh to physics (clamp so plane NEVER penetrates into ground)
            if (this.currentPlaneMesh && !this.physics.state.isCrashed) {
                const terrain = this.environment.getTerrainAt(this.physics.position.x, this.physics.position.z);
                const minY = terrain.height + 0.6;
                if (this.physics.position.y < minY) {
                    this.physics.position.y = minY;
                }
                this.currentPlaneMesh.rootGroup.position.copy(this.physics.position);
                this.currentPlaneMesh.rootGroup.quaternion.copy(this.physics.quaternion);

                // Sync landing gear visibility
                if (this.currentPlaneMesh.gearGroup) {
                    this.currentPlaneMesh.gearGroup.visible = this.physics.state.gearDown;
                }

                // Rotate Propeller if present
                if (this.currentPlaneMesh.propellerMesh) {
                    this.currentPlaneMesh.propellerMesh.rotation.z += dt * (30 + this.physics.state.throttle * 50);
                }

                // Exhaust / Wingtip smoke trails
                this.puffTimer += dt;
                if (this.puffTimer > 0.06 && this.physics.state.throttle > 0.4) {
                    this.puffTimer = 0;
                    const rear = new THREE.Vector3(0, 0, 3).applyQuaternion(this.physics.quaternion).add(this.physics.position);
                    this.particles.spawnTrailPuff(rear, 0.6, 0xecf0f1);
                }
            }

            // Update Engine Audio
            planeAudio.updateEngine(this.physics.state.throttle, this.physics.state.speedKmh);
        } else {
            // Plane is crashed: update flying debris chunks
            this.crashSys.updateDebris(dt);
        }

        // 3. Particle system update
        this.particles.update(dt);

        // 4. Camera Follow or Crash Orbit
        this.cameraSys.update(dt, this.physics);

        // 5. HUD update
        this.hud.updateTelemetry(this.physics.state);

        // 6. Render
        this.renderer.render(this.scene, this.cameraSys.camera);
    }
}

// Bootstrap
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        (window as any).planeCrashGame = new PlaneCrashGame();
    });
}
