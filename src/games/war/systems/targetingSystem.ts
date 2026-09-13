import * as THREE from 'three';
import { Team, CombatUnit, ExplosiveBarrel } from '../types';
import { warAudio } from '../audio';
import { FxManager } from '../effects/fxManager';
import { WarMultiplayerNetwork } from '../multiplayer';
import { WarGameState } from '../state/warState';

export class TargetingSystem {
    private scene: THREE.Scene;
    private state: WarGameState;
    private fx: FxManager;
    private network?: WarMultiplayerNetwork;

    // Airstrike Targeting
    public isAirstrikeTargeting = false;
    public airstrikeReticleMesh!: THREE.Group;

    // Satellite Targeting
    public isSatelliteTargeting = false;
    public satelliteTargetType: 'missile' | 'nuke' = 'missile';
    public satelliteReticleMesh!: THREE.Group;
    public satelliteCamCenter = new THREE.Vector3(0, 0, 0);

    constructor(scene: THREE.Scene, state: WarGameState, fx: FxManager, network?: WarMultiplayerNetwork) {
        this.scene = scene;
        this.state = state;
        this.fx = fx;
        this.network = network;
        this.setupAirstrikeReticle();
        this.setupSatelliteReticle();
    }

    public setNetwork(network: WarMultiplayerNetwork) {
        this.network = network;
    }

    private setupAirstrikeReticle() {
        this.airstrikeReticleMesh = new THREE.Group();

        // Pulsing red targeting ring
        const ringGeo = new THREE.RingGeometry(4.0, 4.4, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3838, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        this.airstrikeReticleMesh.add(ring);

        // Cross lines
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xff4d4d });
        const l1 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 10), lineMat);
        l1.rotation.x = -Math.PI / 2;
        this.airstrikeReticleMesh.add(l1);

        const l2 = new THREE.Mesh(new THREE.PlaneGeometry(10, 0.3), lineMat);
        l2.rotation.x = -Math.PI / 2;
        this.airstrikeReticleMesh.add(l2);

        this.airstrikeReticleMesh.position.y = 0.2;
        this.airstrikeReticleMesh.visible = false;
        this.scene.add(this.airstrikeReticleMesh);
    }

    public toggleAirstrikeTargeting(localUnit: CombatUnit, isMatchEnded: boolean) {
        if (this.state.airstrikeCooldown > 0 || localUnit.isDead || isMatchEnded) return;

        this.isAirstrikeTargeting = !this.isAirstrikeTargeting;
        this.airstrikeReticleMesh.visible = this.isAirstrikeTargeting;

        const cdEl = document.getElementById('cooldown-airstrike');
        if (cdEl) {
            cdEl.innerText = this.isAirstrikeTargeting ? '📍 SIHI & KLÕPSA' : 'VALMIS';
            cdEl.style.color = this.isAirstrikeTargeting ? '#ffd32a' : '#ff6b81';
        }
    }

    public dropAirstrikeAtTarget(
        targetPos: THREE.Vector3,
        localUnit: CombatUnit,
        units: Map<string, CombatUnit>,
        barrels: ExplosiveBarrel[],
        onDamageUnit: (unit: CombatUnit, damage: number, shooterId: string, shooterName: string, team: Team) => void,
        onUpdateHUD: () => void
    ) {
        this.isAirstrikeTargeting = false;
        this.airstrikeReticleMesh.visible = false;
        this.state.airstrikeCooldown = 25;

        warAudio.playAirstrike();

        // Spawn red smoke beacon grenade at the spot
        const beaconGeo = new THREE.SphereGeometry(0.4, 8, 8);
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.copy(targetPos);
        beacon.position.y = 0.4;
        this.scene.add(beacon);

        // Broadcast to multiplayer room
        this.network?.send({
            type: 'airstrike_drop',
            payload: {
                shooterId: this.state.localPlayerId,
                shooterName: this.state.localUsername,
                team: this.state.localTeam,
                targetX: targetPos.x,
                targetZ: targetPos.z
            }
        });

        // Drop a cluster of heavy explosive shells right on that target spot
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const spreadX = (Math.random() - 0.5) * 8.0;
                const spreadZ = (Math.random() - 0.5) * 8.0;
                const impactPos = targetPos.clone().add(new THREE.Vector3(spreadX, 0, spreadZ));

                this.fx.triggerSpreadingExplosion(
                    impactPos,
                    16.0,
                    85,
                    this.state.localPlayerId,
                    this.state.localUsername,
                    this.state.localTeam,
                    units,
                    barrels,
                    onDamageUnit
                );
            }, 600 + i * 260);
        }

        setTimeout(() => this.scene.remove(beacon), 3500);
        onUpdateHUD();
    }

    private setupSatelliteReticle() {
        this.satelliteReticleMesh = new THREE.Group();

        // 1. Dynamic Outer Blast Radius Ring
        const ringGeo = new THREE.RingGeometry(22.5, 24.0, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.name = 'blastRing';
        ring.rotation.x = -Math.PI / 2;
        this.satelliteReticleMesh.add(ring);

        // 2. Holographic Crosshair Lines
        const lineMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.9 });
        const l1 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 25), lineMat);
        l1.rotation.x = -Math.PI / 2;
        this.satelliteReticleMesh.add(l1);

        const l2 = new THREE.Mesh(new THREE.PlaneGeometry(25, 0.4), lineMat);
        l2.rotation.x = -Math.PI / 2;
        this.satelliteReticleMesh.add(l2);

        // 3. Center Target Dot
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffd32a }));
        dot.position.y = 0.4;
        this.satelliteReticleMesh.add(dot);

        this.satelliteReticleMesh.position.y = 0.2;
        this.satelliteReticleMesh.visible = false;
        this.scene.add(this.satelliteReticleMesh);
    }

    public startSatelliteTargeting(
        type: 'missile' | 'nuke',
        localUnit: CombatUnit,
        isMatchEnded: boolean,
        showToast: (msg: string, color: string) => void
    ) {
        if (localUnit.isDead || isMatchEnded) return;

        if (type === 'missile' && this.state.missileCooldown > 0) {
            showToast(this.state.isOwnerLang ? `Rakett laeb veel: ${Math.ceil(this.state.missileCooldown)}s!` : `Missile reload: ${Math.ceil(this.state.missileCooldown)}s!`, '#ffd32a');
            return;
        }

        if (type === 'nuke' && this.state.nukeTimer > 0) {
            showToast(this.state.isOwnerLang ? `Tuumapomm laeb veel: ${Math.ceil(this.state.nukeTimer)}s!` : `Nuclear strike charging: ${Math.ceil(this.state.nukeTimer)}s!`, '#ffd32a');
            return;
        }

        this.isSatelliteTargeting = true;
        this.satelliteTargetType = type;
        this.satelliteCamCenter.copy(localUnit ? localUnit.pos : new THREE.Vector3(0, 0, 0));
        this.satelliteReticleMesh.visible = true;

        const isNuke = type === 'nuke';
        const ring = this.satelliteReticleMesh.getObjectByName('blastRing') as THREE.Mesh;
        if (ring) {
            const rad = isNuke ? 88.0 : 24.0;
            ring.geometry.dispose();
            ring.geometry = new THREE.RingGeometry(rad - 1.5, rad, 64);
            (ring.material as THREE.MeshBasicMaterial).color.setHex(isNuke ? 0xff4757 : 0x2ed573);
        }

        const hud = document.getElementById('satellite-targeting-hud');
        if (hud) hud.style.display = 'flex';

        const iconEl = document.getElementById('sat-mode-icon');
        const titleEl = document.getElementById('sat-mode-title');
        const descEl = document.getElementById('sat-mode-desc');
        const promptEl = document.getElementById('sat-bottom-prompt');

        if (isNuke) {
            if (iconEl) iconEl.innerText = '☢️';
            if (titleEl) {
                titleEl.innerText = this.state.isOwnerLang ? '☢️ TUUMAPOMMI SATELLIIDISIHTIMINE (4x PLAHVATUS)' : '☢️ NUCLEAR STRIKE TARGETING (4x BLAST)';
                titleEl.style.color = '#ff4757';
            }
            if (descEl) descEl.innerText = this.state.isOwnerLang ? 'Vali kaardilt sihtmärk ja klõpsa TUUMARÜNNAK! (ESC - tühista)' : 'Select target coordinates on battlefield and click to launch! (ESC cancel)';
            if (promptEl) promptEl.innerText = this.state.isOwnerLang ? '☢️ KLÕPSA MAASTIKUL, ET SAATA TUUMAPOMM!' : '☢️ CLICK ON TERRAIN TO LAUNCH NUKE!';
        } else {
            if (iconEl) iconEl.innerText = '🚀';
            if (titleEl) {
                titleEl.innerText = this.state.isOwnerLang ? '🚀 RAKETIRÜNNAKU SATELLIIDISIHTIMINE (10s VAHEGA)' : '🚀 MISSILE STRIKE TARGETING (10s COOLDOWN)';
                titleEl.style.color = '#2ed573';
            }
            if (descEl) descEl.innerText = this.state.isOwnerLang ? '10 sek vahega raketirünnak! Liiguta pildiga hiirt ja klõpsa sihtmärgile!' : '10s cooldown missile strike! Move targeting camera and click to fire!';
            if (promptEl) promptEl.innerText = this.state.isOwnerLang ? '🚀 KLÕPSA MAASTIKUL, ET SAATA RAKETT (10s VAHEGA)!' : '🚀 CLICK ON TERRAIN TO FIRE MISSILE (10s COOLDOWN)!';
        }
    }

    public stopSatelliteTargeting(onSelectWeapon?: (w: any) => void) {
        this.isSatelliteTargeting = false;
        if (this.satelliteReticleMesh) this.satelliteReticleMesh.visible = false;
        const hud = document.getElementById('satellite-targeting-hud');
        if (hud) hud.style.display = 'none';
        if (this.state.localClass !== 'missile' && onSelectWeapon) {
            onSelectWeapon('cannon');
        }
    }

    public launchSatelliteStrike(
        targetPos: THREE.Vector3,
        type: 'missile' | 'nuke',
        localUnit: CombatUnit,
        missileSilos: Map<Team, THREE.Vector3>,
        units: Map<string, CombatUnit>,
        barrels: ExplosiveBarrel[],
        onDamageUnit: (unit: CombatUnit, damage: number, shooterId: string, shooterName: string, team: Team) => void,
        showToast: (msg: string, color: string) => void,
        onUpdateHUD: () => void,
        onShakeCamera?: () => void
    ) {
        const isNuke = type === 'nuke';

        if (!isNuke && this.state.missileCooldown > 0) {
            const cdMsg = this.state.isOwnerLang ? `⏳ Rakett laeb veel: ${Math.ceil(this.state.missileCooldown)}s!` : `⏳ Missile reloading: ${Math.ceil(this.state.missileCooldown)}s!`;
            showToast(cdMsg, '#ffd32a');
            return;
        }

        if (isNuke && this.state.nukeTimer > 0) {
            const cdMsg = this.state.isOwnerLang ? `⏳ Tuumapomm laeb veel: ${Math.ceil(this.state.nukeTimer)}s!` : `⏳ Nuclear strike charging: ${Math.ceil(this.state.nukeTimer)}s!`;
            showToast(cdMsg, '#ffd32a');
            return;
        }

        if (this.state.localClass !== 'missile') {
            this.stopSatelliteTargeting();
        }

        const siloOrigin = missileSilos.get(this.state.localTeam) || localUnit.pos.clone().add(new THREE.Vector3(0, 10, 0));

        if (!isNuke) {
            // Tactical Missile Strike (10s cooldown)
            this.state.missileCooldown = 10.0;
            onUpdateHUD();

            warAudio.playMissileLaunch();
            const launchMsg = this.state.isOwnerLang ? '🚀 Rakett välja saadetud (10s vahega)!' : '🚀 Missile launched (10s cooldown)!';
            showToast(launchMsg, '#2ed573');

            // Ballistic Rocket Trajectory Projectile
            const rocketGeo = new THREE.CylinderGeometry(0.4, 0.4, 3.5, 8);
            const rocketMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.8 });
            const rocketMesh = new THREE.Mesh(rocketGeo, rocketMat);
            rocketMesh.position.copy(siloOrigin);
            this.scene.add(rocketMesh);

            const flightTime = 1.35;
            const startPos = siloOrigin.clone();
            const endPos = targetPos.clone();
            let elapsed = 0;

            const rocketAnim = (dt: number) => {
                elapsed += dt;
                const t = Math.min(1.0, elapsed / flightTime);

                const curX = THREE.MathUtils.lerp(startPos.x, endPos.x, t);
                const curZ = THREE.MathUtils.lerp(startPos.z, endPos.z, t);
                const arcHeight = Math.sin(t * Math.PI) * 75;
                const curY = THREE.MathUtils.lerp(startPos.y, 0, t) + arcHeight;

                rocketMesh.position.set(curX, curY, curZ);

                if (Math.random() < 0.8) {
                    this.fx.spawnCrashParticle(rocketMesh.position.clone());
                }

                if (t >= 1.0) {
                    this.scene.remove(rocketMesh);
                    this.fx.triggerSpreadingExplosion(
                        endPos,
                        35.0,
                        300,
                        this.state.localPlayerId,
                        localUnit.name,
                        this.state.localTeam,
                        units,
                        barrels,
                        onDamageUnit
                    );
                } else {
                    requestAnimationFrame(() => rocketAnim(0.016));
                }
            };
            rocketAnim(0.016);
        } else {
            // Nuclear Strike
            this.state.nukeTimer = 60.0;
            onUpdateHUD();

            warAudio.playNuclearSiren();

            const banner = document.getElementById('nuke-warning-banner');
            const bannerText = document.getElementById('nuke-warning-text');
            if (banner && bannerText) {
                bannerText.innerText = this.state.isOwnerLang ? '🚨 HOIATUS: TUUMARÜNNAK TULEKUL!' : '🚨 ALERT: NUCLEAR STRIKE INBOUND!';
                banner.style.display = 'flex';
                setTimeout(() => { banner.style.display = 'none'; }, 5500);
            }

            const icbmGeo = new THREE.CylinderGeometry(1.0, 1.0, 8.0, 12);
            const icbmMat = new THREE.MeshStandardMaterial({ color: 0x2f3542, metalness: 0.9 });
            const icbmMesh = new THREE.Mesh(icbmGeo, icbmMat);
            icbmMesh.position.copy(siloOrigin);
            this.scene.add(icbmMesh);

            const flightTime = 2.4;
            const startPos = siloOrigin.clone();
            const endPos = targetPos.clone();
            let elapsed = 0;

            const icbmAnim = (dt: number) => {
                elapsed += dt;
                const t = Math.min(1.0, elapsed / flightTime);

                const curX = THREE.MathUtils.lerp(startPos.x, endPos.x, t);
                const curZ = THREE.MathUtils.lerp(startPos.z, endPos.z, t);
                const arcHeight = Math.sin(t * Math.PI) * 110;
                const curY = THREE.MathUtils.lerp(startPos.y, 0, t) + arcHeight;

                icbmMesh.position.set(curX, curY, curZ);

                for (let i = 0; i < 2; i++) {
                    this.fx.spawnCrashParticle(icbmMesh.position.clone());
                }

                if (t >= 1.0) {
                    this.scene.remove(icbmMesh);
                    this.fx.triggerNuclearExplosion(
                        endPos,
                        this.state.localPlayerId,
                        localUnit.name,
                        this.state.localTeam,
                        units,
                        onDamageUnit,
                        onShakeCamera
                    );
                } else {
                    requestAnimationFrame(() => icbmAnim(0.016));
                }
            };
            icbmAnim(0.016);
        }
    }
}
