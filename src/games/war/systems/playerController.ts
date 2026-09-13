import * as THREE from 'three';
import { CombatUnit } from '../types';
import { WarGameState } from '../state/warState';
import { FxManager } from '../effects/fxManager';
import { TargetingSystem } from './targetingSystem';
import { AIController } from './aiController';
import { WorldObstacle } from '../types';

export class PlayerController {
    private camera: THREE.PerspectiveCamera;
    private groundPlane: THREE.Plane;
    private raycaster: THREE.Raycaster;
    private mouseScreenPos: THREE.Vector2;
    public mouseAimTarget: THREE.Vector3;
    private keys: Record<string, boolean> = {};
    public isMouseDown = false;
    public planeGunAlternator = false;
    private state: WarGameState;
    private fx: FxManager;
    private targeting: TargetingSystem;
    private ai: AIController;
    private obstacles: WorldObstacle[];
    private onFireActiveWeapon: () => void;
    private onSelectWeapon: (type: any) => void;
    private onDamageUnit: (victim: CombatUnit, damage: number, attackerId: string, attackerName: string, attackerTeam: any) => void;
    private onShowToast: (msg: string, col: string) => void;

    constructor(
        camera: THREE.PerspectiveCamera,
        state: WarGameState,
        fx: FxManager,
        targeting: TargetingSystem,
        ai: AIController,
        obstacles: WorldObstacle[],
        callbacks: {
            onFireActiveWeapon: () => void;
            onSelectWeapon: (type: any) => void;
            onDamageUnit: (victim: CombatUnit, damage: number, attackerId: string, attackerName: string, attackerTeam: any) => void;
            onShowToast: (msg: string, col: string) => void;
        }
    ) {
        this.camera = camera;
        this.state = state;
        this.fx = fx;
        this.targeting = targeting;
        this.ai = ai;
        this.obstacles = obstacles;
        this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.raycaster = new THREE.Raycaster();
        this.mouseScreenPos = new THREE.Vector2();
        this.mouseAimTarget = new THREE.Vector3();
        this.onFireActiveWeapon = callbacks.onFireActiveWeapon;
        this.onSelectWeapon = callbacks.onSelectWeapon;
        this.onDamageUnit = callbacks.onDamageUnit;
        this.onShowToast = callbacks.onShowToast;

        this.setupInputListeners();
    }

    private setupInputListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Digit1') this.onSelectWeapon(this.state.localClass === 'missile' ? 'missile' : 'cannon');
            if (e.code === 'Digit2') this.onSelectWeapon(this.state.localClass === 'missile' ? 'nuke' : 'mg');
            if (e.code === 'Digit3' || e.code === 'KeyF') {
                if (this.state.localClass !== 'plane' && this.state.localClass !== 'missile') this.onSelectWeapon('airstrike');
            }
            if (e.code === 'Digit4' || e.code === 'KeyR') this.onSelectWeapon('missile');
            if (e.code === 'Digit5' || e.code === 'KeyN') this.onSelectWeapon('nuke');
            if (e.code === 'Escape' && this.targeting.isSatelliteTargeting) {
                if (this.state.localClass !== 'missile') this.targeting.stopSatelliteTargeting((w) => this.onSelectWeapon(w));
            }
            if (e.code === 'Space' || e.code === 'KeyE') this.onFireActiveWeapon();
        });

        window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
        window.addEventListener('mousemove', (e) => {
            this.mouseScreenPos.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouseScreenPos.y = -(e.clientY / window.innerHeight) * 2 + 1;
            const crosshair = document.getElementById('crosshair');
            if (crosshair) {
                crosshair.style.left = `${e.clientX}px`;
                crosshair.style.top = `${e.clientY}px`;
            }
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.isMouseDown = true;
                this.onFireActiveWeapon();
            } else if (e.button === 2) {
                if (this.state.localClass === 'missile') {
                    this.onSelectWeapon(this.state.activeWeapon === 'missile' ? 'nuke' : 'missile');
                } else if (this.targeting.isSatelliteTargeting) {
                    this.targeting.stopSatelliteTargeting((w) => this.onSelectWeapon(w));
                } else if (this.state.activeWeapon === 'cannon') {
                    this.onSelectWeapon('mg');
                } else {
                    this.onSelectWeapon('cannon');
                }
            }
        });

        window.addEventListener('mouseup', () => { this.isMouseDown = false; });
        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    public updatePlayer(dt: number, localUnit: CombatUnit | undefined, isCountdownActive: boolean, onRespawnUnit: (u: CombatUnit) => void) {
        if (!localUnit) return;
        if (isCountdownActive) {
            localUnit.speed = 0;
            return;
        }

        if (localUnit.isDead || localUnit.isCrashing) {
            if (localUnit.isDead && localUnit.respawnTimer > 0) {
                localUnit.respawnTimer -= dt;
                if (localUnit.respawnTimer <= 0) onRespawnUnit(localUnit);
            }
            return;
        }

        const isPlane = this.state.localClass === 'plane';
        const isTank = this.state.localClass === 'tank';

        if (isPlane) {
            let steering = 0;
            if (this.keys['KeyA'] || this.keys['ArrowLeft']) { localUnit.rotation += 2.4 * dt; steering = 1; }
            if (this.keys['KeyD'] || this.keys['ArrowRight']) { localUnit.rotation -= 2.4 * dt; steering = -1; }
            if (this.keys['KeyW'] || this.keys['ArrowUp']) localUnit.speed = Math.min(36.0, localUnit.speed + 35.0 * dt);
            else if (this.keys['KeyS'] || this.keys['ArrowDown']) localUnit.speed = Math.max(18.0, localUnit.speed - 35.0 * dt);
            else localUnit.speed = THREE.MathUtils.lerp(localUnit.speed, 28.0, dt * 2.0);

            localUnit.bankAngle = THREE.MathUtils.lerp(localUnit.bankAngle || 0, steering * 0.55, dt * 7.0);
            const forward = new THREE.Vector3(Math.sin(localUnit.rotation), 0, Math.cos(localUnit.rotation));
            localUnit.pos.addScaledVector(forward, localUnit.speed * dt);
            localUnit.pos.y = 14.0;
            localUnit.pos.x = Math.max(-780, Math.min(780, localUnit.pos.x));
            localUnit.pos.z = Math.max(-780, Math.min(780, localUnit.pos.z));
            localUnit.root.position.copy(localUnit.pos);
            localUnit.root.rotation.set(0, localUnit.rotation, localUnit.bankAngle || 0, 'YXZ');

            if (Math.random() < 0.75) {
                const exL = new THREE.Vector3(-0.65, 0, -4.2).applyEuler(localUnit.root.rotation).add(localUnit.pos);
                const exR = new THREE.Vector3(0.65, 0, -4.2).applyEuler(localUnit.root.rotation).add(localUnit.pos);
                for (const exPos of [exL, exR]) {
                    this.fx.spawnCrashParticle(exPos);
                }
            }
        } else {
            const turnRate = isTank ? 2.2 : 4.0;
            const maxSpeed = isTank ? 16.0 : 19.0;
            const accel = isTank ? 35.0 : 50.0;
            const drag = 14.0;

            if (this.targeting.isSatelliteTargeting) {
                const panSpeed = 110.0;
                if (this.keys['KeyW'] || this.keys['ArrowUp']) this.targeting.satelliteCamCenter.z -= panSpeed * dt;
                if (this.keys['KeyS'] || this.keys['ArrowDown']) this.targeting.satelliteCamCenter.z += panSpeed * dt;
                if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.targeting.satelliteCamCenter.x -= panSpeed * dt;
                if (this.keys['KeyD'] || this.keys['ArrowRight']) this.targeting.satelliteCamCenter.x += panSpeed * dt;
                this.targeting.satelliteCamCenter.x = THREE.MathUtils.clamp(this.targeting.satelliteCamCenter.x, -240, 240);
                this.targeting.satelliteCamCenter.z = THREE.MathUtils.clamp(this.targeting.satelliteCamCenter.z, -360, 360);
            } else {
                if (this.keys['KeyA'] || this.keys['ArrowLeft']) localUnit.rotation += turnRate * dt;
                if (this.keys['KeyD'] || this.keys['ArrowRight']) localUnit.rotation -= turnRate * dt;
                if (this.keys['KeyW'] || this.keys['ArrowUp']) localUnit.speed = Math.min(maxSpeed, localUnit.speed + accel * dt);
                else if (this.keys['KeyS'] || this.keys['ArrowDown']) localUnit.speed = Math.max(-maxSpeed * 0.6, localUnit.speed - accel * dt);
                else {
                    if (localUnit.speed > 0) localUnit.speed = Math.max(0, localUnit.speed - drag * dt);
                    else if (localUnit.speed < 0) localUnit.speed = Math.min(0, localUnit.speed + drag * dt);
                }
            }

            const forward = new THREE.Vector3(Math.sin(localUnit.rotation), 0, Math.cos(localUnit.rotation));
            localUnit.pos.addScaledVector(forward, localUnit.speed * dt);
            this.ai.resolveObstacleCollisions(localUnit.pos, isTank ? 3.2 : 1.4, this.obstacles);
            localUnit.pos.x = Math.max(-780, Math.min(780, localUnit.pos.x));
            localUnit.pos.z = Math.max(-780, Math.min(780, localUnit.pos.z));
            localUnit.root.position.copy(localUnit.pos);
            localUnit.root.rotation.y = localUnit.rotation;

            if (!isTank && localUnit.leftLeg && localUnit.rightLeg) {
                if (Math.abs(localUnit.speed) > 1) {
                    localUnit.walkCycle = (localUnit.walkCycle || 0) + 14 * dt;
                    localUnit.leftLeg.rotation.x = Math.sin(localUnit.walkCycle) * 0.6;
                    localUnit.rightLeg.rotation.x = -Math.sin(localUnit.walkCycle) * 0.6;
                } else {
                    localUnit.leftLeg.rotation.x = 0;
                    localUnit.rightLeg.rotation.x = 0;
                }
            }
        }

        this.raycaster.setFromCamera(this.mouseScreenPos, this.camera);
        const intersect = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.groundPlane, intersect)) {
            this.mouseAimTarget.copy(intersect);
            if (this.targeting.airstrikeReticleMesh && this.targeting.isAirstrikeTargeting) {
                this.targeting.airstrikeReticleMesh.position.copy(intersect);
                this.targeting.airstrikeReticleMesh.position.y = 0.2;
                this.targeting.airstrikeReticleMesh.rotation.y += 1.8 * dt;
            }
            if (this.targeting.satelliteReticleMesh && this.targeting.isSatelliteTargeting) {
                this.targeting.satelliteReticleMesh.position.copy(intersect);
                this.targeting.satelliteReticleMesh.position.y = 0.2;
                this.targeting.satelliteReticleMesh.rotation.y += 1.2 * dt;
                const coordsEl = document.getElementById('sat-coords-text');
                if (coordsEl) coordsEl.innerText = `COORD: X: ${intersect.x.toFixed(1)} | Z: ${intersect.z.toFixed(1)}`;
            }
            if (localUnit.turret) {
                const localAim = localUnit.root.worldToLocal(intersect.clone());
                const targetAngle = Math.atan2(localAim.x, localAim.z);
                let diff = targetAngle - (localUnit.turretAngle || 0);
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                localUnit.turretAngle = (localUnit.turretAngle || 0) + diff * Math.min(1.0, 14.0 * dt);
                localUnit.turret.rotation.y = localUnit.turretAngle;
            }
        }

        if (this.state.primaryReloadTimer > 0) this.state.primaryReloadTimer = Math.max(0, this.state.primaryReloadTimer - dt);
        if (this.state.secondaryReloadTimer > 0) this.state.secondaryReloadTimer = Math.max(0, this.state.secondaryReloadTimer - dt);
        if (this.state.airstrikeCooldown > 0) this.state.airstrikeCooldown = Math.max(0, this.state.airstrikeCooldown - dt);
        if (this.state.missileCooldown > 0) {
            this.state.missileCooldown = Math.max(0, this.state.missileCooldown - dt);
            const cdMissileEl = document.getElementById('cooldown-missile') || document.getElementById('cost-missile');
            if (cdMissileEl) {
                cdMissileEl.innerText = this.state.missileCooldown > 0 ? `${Math.ceil(this.state.missileCooldown)}s` : (this.state.isOwnerLang ? 'VALMIS' : 'READY');
                cdMissileEl.style.color = this.state.missileCooldown > 0 ? '#ffd32a' : '#2ed573';
            }
        }
        if (this.state.nukeTimer > 0) {
            this.state.nukeTimer = Math.max(0, this.state.nukeTimer - dt);
            const timerNukeEl = document.getElementById('timer-nuke');
            if (timerNukeEl) {
                timerNukeEl.innerText = this.state.nukeTimer > 0 ? `${Math.ceil(this.state.nukeTimer)}s` : (this.state.isOwnerLang ? 'VALMIS' : 'READY');
                timerNukeEl.style.color = this.state.nukeTimer > 0 ? '#ffd32a' : '#2ed573';
            }
        }

        if ((this.isMouseDown || this.keys['Space']) && !localUnit.isDead && !this.state.isMatchEnded) {
            this.onFireActiveWeapon();
        }
    }

    public checkOutOfBounds(dt: number, localUnit: CombatUnit | undefined, isCountdownActive: boolean) {
        if (!localUnit || localUnit.isDead || localUnit.isCrashing || isCountdownActive) {
            const overlay = document.getElementById('out-of-bounds-overlay');
            if (overlay) overlay.style.display = 'none';
            this.state.isOutOfBounds = false;
            this.state.outOfBoundsTimer = 5.0;
            return;
        }

        const isOutside = Math.abs(localUnit.pos.x) > 400 || Math.abs(localUnit.pos.z) > 610;
        const overlay = document.getElementById('out-of-bounds-overlay');
        const titleEl = document.getElementById('out-of-bounds-title');
        const timerEl = document.getElementById('out-of-bounds-timer');

        if (isOutside) {
            this.state.isOutOfBounds = true;
            this.state.outOfBoundsTimer = Math.max(0, this.state.outOfBoundsTimer - dt);
            if (overlay) overlay.style.display = 'flex';
            if (titleEl) titleEl.innerText = this.state.isOwnerLang ? '⚠️ MINE TAGASI VÕI SURED!' : '⚠️ RETURN TO BATTLEFIELD OR DIE!';
            if (timerEl) timerEl.innerText = `${this.state.outOfBoundsTimer.toFixed(1)}s`;
            if (this.state.outOfBoundsTimer <= 0) {
                this.state.outOfBoundsTimer = 5.0;
                if (overlay) overlay.style.display = 'none';
                this.onDamageUnit(localUnit, 9999, 'boundary', 'Battlefield Boundary', this.state.localTeam === 'red' ? 'blue' : 'red');
                this.onShowToast(this.state.isOwnerLang ? '💀 Lahkusid lahingualalt ja hukkusid!' : '💀 Eliminated for leaving battlefield!', '#ff4757');
            }
        } else {
            this.state.isOutOfBounds = false;
            this.state.outOfBoundsTimer = 5.0;
            if (overlay) overlay.style.display = 'none';
        }
    }

    public updateCamera(localUnit: CombatUnit | null, lastDeathPos: THREE.Vector3 | null) {
        if (!localUnit) return;
        if (this.targeting.isSatelliteTargeting) {
            const targetCam = new THREE.Vector3(this.targeting.satelliteCamCenter.x, 90, this.targeting.satelliteCamCenter.z + 10);
            this.camera.position.lerp(targetCam, 0.2);
            this.camera.lookAt(new THREE.Vector3(this.targeting.satelliteCamCenter.x, 0, this.targeting.satelliteCamCenter.z));
            return;
        }
        if (localUnit.isDead && lastDeathPos) {
            const deathCamTarget = lastDeathPos.clone().add(new THREE.Vector3(0, 16.0, -22.0));
            this.camera.position.lerp(deathCamTarget, 0.08);
            this.camera.lookAt(lastDeathPos.clone().add(new THREE.Vector3(0, 1.5, 0)));
            return;
        }

        const isPlane = this.state.localClass === 'plane';
        const isTank = this.state.localClass === 'tank';
        const dist = isPlane ? 32 : (isTank ? 22 : 12);
        const height = isPlane ? 14 : (isTank ? 12 : 6.5);
        const offset = new THREE.Vector3(-Math.sin(localUnit.rotation) * dist, height, -Math.cos(localUnit.rotation) * dist);
        const targetCam = localUnit.pos.clone().add(offset);
        this.camera.position.lerp(targetCam, isPlane ? 0.18 : 0.14);
        this.camera.lookAt(localUnit.pos.clone().add(new THREE.Vector3(0, isPlane ? -2.0 : (isTank ? 2.5 : 1.6), 0)));
    }
}

