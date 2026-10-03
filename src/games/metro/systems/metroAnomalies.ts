import * as THREE from 'three';
import { MetroCombat } from './metroCombat';
import { metroAudio } from '../audio';

export class MetroAnomalies extends MetroCombat {
    public triggerReverseTunnel(duration: number = 5.0) {
        this.reverseTunnelTimer = duration;
    }

    public triggerSoundCutout(duration: number = 4.0) {
        this.soundCutoutTimer = duration;
        metroAudio.setVolume(0);
        setTimeout(() => {
            metroAudio.setVolume(0.7);
        }, duration * 1000);
    }

    private startLightFlickerAnomaly() {
        if (!this.currentCarriage) return;
        let count = 0;
        const interval = setInterval(() => {
            if (!this.currentCarriage) { clearInterval(interval); return; }
            count++;
            const isOn = count % 2 === 0;
            this.currentCarriage.lights.forEach(l => l.intensity = isOn ? 0.9 : 0.05);
            this.currentCarriage.lightMeshes.forEach(m => (m.material as THREE.MeshBasicMaterial).color.setHex(isOn ? 0xffffff : 0x222222));
            metroAudio.playFlickerBuzz();

            if (count > 12) {
                clearInterval(interval);
                this.currentCarriage.lights.forEach(l => l.intensity = 0.85);
                this.currentCarriage.lightMeshes.forEach(m => (m.material as THREE.MeshBasicMaterial).color.setHex(0xffffff));
            }
        }, 180);
    }

    public isShadowEventActive(): boolean {
        return this.shadowRushActive || this.shadowRushCountdown > 0 || this.shadowEntityMesh !== null;
    }

    public activateTimeVillain() {
        if (this.timeVillainActive || this.state !== 'player_free' || this.currentCarIndex === 0 || this.currentCarIndex === 100 || this.currentCarIndex === 200) return;

        this.timeVillainActive = true;
        this.timeVillainCountdown = 10.0;
        this.timeVillainTriggeredThisCarriage = true;

        // 1. Start clock tower horror bells
        metroAudio.startClockTowerBells();

        // 2. Apply grayscale (black & white) filter to canvas
        const canvas = this.renderer.domElement;
        if (canvas) canvas.style.filter = 'grayscale(1) contrast(1.3)';

        // 3. Rapid light flickering
        this.timeVillainFlickerInterval = setInterval(() => {
            if (!this.currentCarriage || !this.timeVillainActive) return;
            const isOn = Math.random() > 0.4;
            this.currentCarriage.lights.forEach(l => l.intensity = isOn ? 1.2 : 0.05);
            this.currentCarriage.lightMeshes.forEach(m => (m.material as THREE.MeshBasicMaterial).color.setHex(isOn ? 0xffffff : 0x220000));
        }, 80);

        // 4. Spawn the Time Villain entity directly in front of player
        const villainGroup = new THREE.Group();
        villainGroup.name = 'time_villain';

        // Tall dark cloaked humanoid figure with clock motifs
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9, metalness: 0.1 });
        const clockMat = new THREE.MeshBasicMaterial({ color: 0xff4757 });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        // Tall body (cloaked)
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.0, 0.5), bodyMat);
        body.position.set(0, 1.0, 0);
        villainGroup.add(body);

        // Wide cloak bottom
        const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 6), bodyMat);
        cloak.position.set(0, 0.6, 0);
        villainGroup.add(cloak);

        // Head (dark sphere with burning red eyes)
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), bodyMat);
        head.position.set(0, 2.2, 0);
        villainGroup.add(head);

        // Burning red eyes
        const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
        leftEye.position.set(-0.08, 2.25, 0.2);
        villainGroup.add(leftEye);
        const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
        rightEye.position.set(0.08, 2.25, 0.2);
        villainGroup.add(rightEye);

        // Glowing clock face on chest
        const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24), clockMat);
        clockFace.position.set(0, 1.5, 0.26);
        villainGroup.add(clockFace);

        // Clock hands (pointing to XII)
        const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.02), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        hourHand.position.set(0, 1.56, 0.28);
        villainGroup.add(hourHand);
        const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.02), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        minHand.position.set(0, 1.58, 0.28);
        villainGroup.add(minHand);

        // Red point lights on the villain for eerie glow
        const glowLight = new THREE.PointLight(0xff0000, 2.5, 6);
        glowLight.position.set(0, 1.6, 0);
        villainGroup.add(glowLight);

        // Position villain in front of the player
        const camDir = new THREE.Vector3(0, 0, -1).applyEuler(this.cameraEuler);
        villainGroup.position.set(
            this.playerPos.x + camDir.x * 4,
            0,
            this.playerPos.z + camDir.z * 4
        );
        villainGroup.lookAt(this.playerPos.x, 1.6, this.playerPos.z);

        this.scene.add(villainGroup);
        this.timeVillainGroup = villainGroup;

        // Roar sound
        metroAudio.playTimeVillainRoar();

        // 5. Show countdown overlay
        const overlay = document.getElementById('time-villain-overlay');
        if (overlay) overlay.style.display = 'block';

        // 6. Show thought
        this.showThought(
            '👹 AJAPAHALANE! JOOKSE JÄRGMISSE VAGUNISSE! Sul on 10 SEKUNDIT!',
            '👹 TIME VILLAIN! RUN TO THE NEXT CARRIAGE! You have 10 SECONDS!',
            3000
        );
    }

    public deactivateTimeVillain() {
        if (!this.timeVillainActive) return;
        this.timeVillainActive = false;
        this.timeVillainCountdown = 0;

        // Stop clock tower bells
        metroAudio.stopClockTowerBells();

        // Remove grayscale filter
        const canvas = this.renderer.domElement;
        if (canvas) canvas.style.filter = '';

        // Stop rapid flickering
        if (this.timeVillainFlickerInterval) {
            clearInterval(this.timeVillainFlickerInterval);
            this.timeVillainFlickerInterval = null;
        }

        // Restore normal lights
        if (this.currentCarriage) {
            this.currentCarriage.lights.forEach(l => l.intensity = 0.85);
            this.currentCarriage.lightMeshes.forEach(m => (m.material as THREE.MeshBasicMaterial).color.setHex(0xffffff));
        }

        // Remove villain mesh
        if (this.timeVillainGroup) {
            this.scene.remove(this.timeVillainGroup);
            this.timeVillainGroup = null;
        }

        // Reset shake offset
        this.timeVillainShakeOffset.set(0, 0, 0);

        // Hide countdown overlay
        const overlay = document.getElementById('time-villain-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    public timeVillainKillPlayer() {
        this.deactivateTimeVillain();
        this.playerHp = 0;
        this.updateHealthUI();
        this.state = 'dead';

        const deathModal = document.getElementById('death-modal');
        const dTitle = document.getElementById('death-title');
        const dDesc = document.getElementById('death-desc');
        if (dTitle) dTitle.textContent = this.lang === 'et' ? 'SA SURID' : 'YOU DIED';
        if (dDesc) {
            dDesc.textContent = this.lang === 'et'
                ? '👹 Ajapahalane jõudis sinuni! Sa ei jõudnud järgmisse vagunisse õigel ajal.'
                : '👹 The Time Villain caught you! You did not reach the next carriage in time.';
        }
        if (deathModal) deathModal.style.display = 'flex';
        this.updateCursorState();
    }

    public startShadowRushCarriageEvent(index: number = this.currentCarIndex) {
        this.carriage20EventTriggered = true;
        this.shadowRushActive = false;
        this.shadowRushCountdown = 5.0;

        // 1. Violent light flickering with emergency dim red/white pulses
        this.startLightFlickerAnomaly();

        // 2. Train screeching brakes audio (rongi pidurduse hääl)
        metroAudio.playTrainBrakesScreech(5.0);

        // 3. Eerie creepy escalating sound for 5 seconds (imelik hääl kestab 5 sek)
        metroAudio.playCreepyDrone5s();

        // 4. Train speed rapidly decelerates with heavy vibrations
        this.trainSpeed = 20;

        // 5. Urgent warning thought / HUD notification
        this.showThought(
            `⚠️ RONG PIDURDAB! (Vagun ${index}) Kuskilt kostub hirmus kisa... ISTU KIIRESTI TOOLILE! (Vajuta [E] või klõpsa istmele)`,
            `⚠️ TRAIN BRAKING! (Carriage ${index}) A terrifying shriek echoes... SIT DOWN QUICKLY! (Press [E] or click a seat)`,
            5000
        );

        // After 5 seconds: Spawn the Shadow Creature (Must Olend) and dash through the carriage!
        const triggerCar = this.currentCarIndex;
        setTimeout(() => {
            if (this.currentCarIndex === triggerCar && this.state !== 'game_over' && this.state !== 'dead') {
                this.spawnAndRushShadowCreature();
            }
        }, 5000);
    }

    public startCarriage20ShadowRushEvent() {
        this.startShadowRushCarriageEvent(20);
    }

    public spawnAndRushShadowCreature() {
        if (this.shadowEntityMesh) {
            this.scene.remove(this.shadowEntityMesh);
            this.shadowEntityMesh = null;
        }

        const group = new THREE.Group();
        group.name = 'shadow_creature_entity';

        const shadowMat = new THREE.MeshStandardMaterial({
            color: 0x050505,
            roughness: 0.9,
            metalness: 0.1,
            emissive: 0x1a0000,
            emissiveIntensity: 0.8
        });

        const smokeMat = new THREE.MeshBasicMaterial({
            color: 0x020202,
            transparent: true,
            opacity: 0.85
        });

        const eyeGlowMat = new THREE.MeshBasicMaterial({
            color: 0xff0000
        });

        // 1. Dark Smoky Torso & Shadow Mass
        const mainBody = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), shadowMat);
        mainBody.scale.set(1.1, 1.6, 1.4);
        mainBody.position.set(0, 1.4, 0);
        group.add(mainBody);

        // Surrounding Shadow Smoke Volumes
        for (let i = 0; i < 8; i++) {
            const smokeBall = new THREE.Mesh(new THREE.SphereGeometry(0.35 + Math.random() * 0.25, 8, 8), smokeMat);
            smokeBall.position.set((Math.random() - 0.5) * 0.8, 1.2 + (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 1.2);
            group.add(smokeBall);
        }

        // 2. Piercing Glowing Crimson Eyes
        [-0.18, 0.18].forEach(ex => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), eyeGlowMat);
            eye.position.set(ex, 1.65, 0.45);
            group.add(eye);

            const eyeTrail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.35), eyeGlowMat);
            eyeTrail.position.set(ex, 1.65, 0.2);
            group.add(eyeTrail);
        });

        // 3. Shadow Claws / Tendrils reaching outward
        [-0.55, 0.55].forEach(cx => {
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 1.2, 8), shadowMat);
            arm.rotation.z = cx > 0 ? -Math.PI / 3 : Math.PI / 3;
            arm.rotation.x = Math.PI / 4;
            arm.position.set(cx, 1.3, 0.3);
            group.add(arm);

            // Claws
            [-0.06, 0, 0.06].forEach(fingerZ => {
                const claw = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.3, 6), shadowMat);
                claw.rotation.x = Math.PI / 2;
                claw.position.set(cx > 0 ? cx + 0.5 : cx - 0.5, 0.9, 0.7 + fingerZ);
                group.add(claw);
            });
        });

        // Rush slower through the carriage so the player can see the horrifying shadowy entity approaching
        const startZ = this.playerPos.z < 0 ? 9.5 : -9.5;
        this.shadowRushSpeed = startZ > 0 ? -7.0 : 7.0;

        group.position.set(0, 0, startZ);
        group.rotation.y = this.shadowRushSpeed < 0 ? Math.PI : 0;

        this.shadowEntityMesh = group;
        this.scene.add(this.shadowEntityMesh);
        this.shadowRushActive = true;

        // Play terrifying monster roar, dark wind storm AND horrifying horror song / music
        metroAudio.playShadowRushScreech();
        metroAudio.playHorrorShadowSong();

        this.showThought(
            '😱 MUST OLEND LIIGUB AEGLASELT MÖÖDA VAGUNIT! ISTU TOOLIL, ET ELLU JÄÄDA!',
            '😱 SHADOW CREATURE IS CREEPING DOWN THE AISLE! STAY SEATED TO SURVIVE!',
            3500
        );
    }

    private startDoorGlitchAnomaly() {
        setTimeout(() => {
            metroAudio.playDoorSlide(true);
            metroAudio.playWhisper(3.0);
            this.showThought('Uks avanes iseenesest! Mis väljas liigub?!', 'The door opened on its own! What is moving out there?!');
            setTimeout(() => {
                metroAudio.playDoorSlide(false);
            }, 3000);
        }, 2500);
    }

    public triggerShadowHandsEvent() {
        if (this.shadowHandsActive) return;
        this.shadowHandsActive = true;
        this.shadowHandsTimer = 10.0; // Stays active for exactly 10s then disappears (kui käsi tuleb on se 10 sek siis läheb ära)

        // Doors vanish completely (uksi pole näha!)
        this.sideDoorMeshes.forEach(d => d.mesh.visible = false);

        // Play scary audio
        metroAudio.playDoorSlide(true);
        metroAudio.playShadowGrab();

        // Flickering red lights in carriage
        if (this.currentCarriage) {
            this.currentCarriage.lights.forEach(l => {
                l.color.setHex(0xff1744);
                l.intensity = 1.4;
            });
        }

        // Exactly 1 hand from 1 side only (ainult 1 pool tuleb käsi)
        const activeSide = 1; // Reaching from right doorway
        const hand = this.createShadowHandMesh(activeSide, 0);
        this.scene.add(hand);
        this.shadowHandsGroups.push(hand);

        this.showThought(
            'Uksed kadusid ära... Tühjusest sirutub välja must varjukäsi! Pea 10 sekundit vastu ja ära puuduta seda!',
            'The doors vanished into the void... A black shadow hand is reaching in! Survive for 10 seconds and do not touch it!'
        );
    }

    public dismissShadowHands() {
        if (!this.shadowHandsActive) return;
        this.shadowHandsActive = false;

        // Remove shadow hand meshes from scene
        this.shadowHandsGroups.forEach(hand => this.scene.remove(hand));
        this.shadowHandsGroups = [];

        // Restore sliding side doors
        this.sideDoorMeshes.forEach(d => d.mesh.visible = true);

        // Restore carriage lighting back to normal
        if (this.currentCarriage) {
            this.currentCarriage.lights.forEach(l => {
                l.color.setHex(this.currentCarriage!.theme === 'dark' ? 0xff4757 : 0xffffff);
                l.intensity = 0.85;
            });
        }

        // Play door closing sound & victory thought
        metroAudio.playDoorSlide(false);
        this.showThought(
            'Must varjukäsi tõmbus tagasi tühjusesse ja uksed taastusid... Oht on möödas!',
            'The shadow hand retreated back into the void and the doors restored... The danger has passed!'
        );
    }

    public triggerDraggedDeath(side: number) {
        if (this.state === 'dragged_death' || this.state === 'dead') return;
        this.state = 'dragged_death';
        this.deathDragSide = side;
        this.deathTimer = 0;

        // Horror Audio
        metroAudio.playShadowGrab();
        metroAudio.playDeathScream();

        // Red flash
        const flashOverlay = document.getElementById('scare-flash-overlay');
        if (flashOverlay) {
            flashOverlay.style.display = 'block';
            flashOverlay.style.opacity = '0.9';
            setTimeout(() => {
                flashOverlay.style.opacity = '0';
                setTimeout(() => flashOverlay.style.display = 'none', 600);
            }, 300);
        }

        this.showThought('Mind tõmmatakse rongist välja...!', 'I am being dragged out of the train...!');
    }

    private startCarriage10JumpScare() {
        this.carriage10ScareTimers.forEach(t => clearTimeout(t));
        this.carriage10ScareTimers = [];

        const t1 = setTimeout(() => {
            if (this.currentCarIndex !== 10) return;
            // Cut lights
            if (this.currentCarriage) {
                this.currentCarriage.lights.forEach(l => l.intensity = 0);
                this.currentCarriage.lightMeshes.forEach(m => (m.material as THREE.MeshBasicMaterial).color.setHex(0x111111));
            }

            // Spawn horror glitch creature right in front of camera
            const scareGroup = new THREE.Group();
            const horrorMat = new THREE.MeshBasicMaterial({ color: 0xff4757, wireframe: true });
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), horrorMat);
            head.position.set(0, 1.6, -1.2);
            scareGroup.add(head);
            this.camera.add(scareGroup);
            this.jumpScareMesh = scareGroup;
            this.jumpScareActive = true;

            // Screamer stinger audio
            metroAudio.playJumpScareStinger();

            // Flash effect on screen
            const flashOverlay = document.getElementById('scare-flash-overlay');
            if (flashOverlay) {
                flashOverlay.style.display = 'block';
                flashOverlay.style.opacity = '1';
                const tFlash = setTimeout(() => {
                    flashOverlay.style.opacity = '0';
                    const tHide = setTimeout(() => flashOverlay.style.display = 'none', 500);
                    this.carriage10ScareTimers.push(tHide);
                }, 200);
                this.carriage10ScareTimers.push(tFlash);
            }

            // Clean up jumpscare after 1.5 seconds and restore normal lights
            const t2 = setTimeout(() => {
                if (this.jumpScareMesh) {
                    this.camera.remove(this.jumpScareMesh);
                    this.jumpScareMesh = null;
                }
                this.jumpScareActive = false;
                if (this.currentCarriage) {
                    this.currentCarriage.lights.forEach(l => l.intensity = 0.85);
                    this.currentCarriage.lightMeshes.forEach(m => (m.material as THREE.MeshBasicMaterial).color.setHex(0xffffff));
                }
                if (this.currentCarIndex === 10) {
                    this.showThought('Mis see oli...? Rong sõidab ikka edasi.', 'What on earth was that...? The train keeps moving forward.');
                }
            }, 1400);
            this.carriage10ScareTimers.push(t2);
        }, 3500);
        this.carriage10ScareTimers.push(t1);
    }
}
