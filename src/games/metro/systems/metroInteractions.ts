import * as THREE from 'three';
import { MetroAnomalies } from './metroAnomalies';
import { metroAudio } from '../audio';
import { CLUES_DATABASE } from '../catalog';

export class MetroInteractions extends MetroAnomalies {
    public toggleCrouch() {
        this.isCrouching = !this.isCrouching;
        this.playerPos.y = this.isCrouching ? 0.95 : 1.6;

        const crouchBtn = document.getElementById('btn-toggle-crouch');
        const crouchText = document.getElementById('btn-toggle-crouch-text');
        const crouchIcon = document.getElementById('btn-toggle-crouch-icon');
        if (crouchBtn) {
            crouchBtn.style.background = this.isCrouching ? 'rgba(0, 242, 254, 0.35)' : 'rgba(10, 15, 25, 0.85)';
            crouchBtn.style.borderColor = this.isCrouching ? '#00f2fe' : 'rgba(0, 242, 254, 0.5)';
        }
        if (crouchIcon) {
            crouchIcon.textContent = this.isCrouching ? '🧍‍♂️' : '🧎‍♂️';
        }
        if (crouchText) {
            crouchText.textContent = this.isCrouching
                ? (this.lang === 'et' ? 'Püsti [C]' : 'Stand [C]')
                : (this.lang === 'et' ? 'Kükita [C]' : 'Crouch [C]');
        }

        if (this.currentCarIndex === 217) {
            if (this.isCrouching) this.submergeInSewerWater();
            else this.emergeFromSewerWater();
        }
    }

    public sitDown() {
        if (this.state !== 'player_free' && this.state !== 'intro_riding') return;
        this.isSitting = true;
        const sideX = this.playerPos.x >= 0 ? 1.22 : -1.22;
        this.playerPos.x = sideX;
        this.playerPos.y = 0.95;
        metroAudio.playSitDown();

        const sitIcon = document.getElementById('btn-toggle-sit-icon');
        const sitText = document.getElementById('btn-toggle-sit-text');
        if (sitIcon) sitIcon.textContent = '🧍‍♂️';
        if (sitText) sitText.textContent = this.lang === 'et' ? 'Tõuse' : 'Stand';

        const standBtn = document.getElementById('btn-stand-up');
        if (standBtn) {
            standBtn.style.display = 'flex';
            standBtn.innerHTML = `<span>🧍‍♂️</span><span>${this.lang === 'et' ? 'Tõuse Püsti / Stand Up (W / E / Tap)' : 'Stand Up (W / E / Tap)'}</span>`;
        }

        this.showThought(
            'Istusin toolile. (Vajuta W, E või puuduta nuppu püstitõusmiseks)',
            'Sat down on the seat. (Press W, E or tap button to stand up)',
            2500
        );
    }

    public standUp() {
        this.isSitting = false;
        if (this.state === 'player_free' || this.state === 'intro_first_stop' || this.state === 'intro_riding' || this.state === 'intro_departing') {
            this.state = 'player_free';
            this.playerPos.y = 1.6;
            this.playerPos.x = 0; // step into aisle
            const standBtn = document.getElementById('btn-stand-up');
            if (standBtn) standBtn.style.display = 'none';

            const sitIcon = document.getElementById('btn-toggle-sit-icon');
            const sitText = document.getElementById('btn-toggle-sit-text');
            if (sitIcon) sitIcon.textContent = '🪑';
            if (sitText) sitText.textContent = this.lang === 'et' ? 'Istu' : 'Sit';

            metroAudio.playStandUp();
        }

        // Only show direction choice thought in the very first carriage (Carriage 0)
        if (this.currentCarIndex === 0) {
            this.cameraEuler.y = Math.PI; // Look forward down the aisle towards +Z
            this.showThought(
                'Vali suund: kas minna ettepoole (PAREM) või tahapoole (VASAK)?',
                'Choose a direction: head forward (RIGHT) or backward (LEFT)?'
            );
        }
    }

    public toggleSit() {
        if (this.isSitting) {
            this.standUp();
        } else {
            this.sitDown();
        }
    }

    public updateCursorState() {
        const isShopOpen = document.getElementById('golden-shop-modal')?.style.display === 'flex';
        const isDeathOpen = document.getElementById('death-modal')?.style.display === 'flex';
        const isLoreOpen = document.getElementById('lore-modal')?.style.display === 'flex';
        const isKeypadOpen = document.getElementById('keypad-modal')?.style.display === 'flex';
        const isOwnerOpen = document.getElementById('owner-teleport-modal')?.style.display === 'flex';
        const isClueInspectOpen = document.getElementById('clue-inspect-modal')?.style.display === 'flex';
        const isCluesFolderOpen = document.getElementById('clues-folder-modal')?.style.display === 'flex';
        const isVictory300Open = document.getElementById('victory-300-modal')?.style.display === 'flex';
        const startOverlay = document.getElementById('start-game-overlay');
        const isStartOpen = !!startOverlay && startOverlay.style.display !== 'none' && startOverlay.style.opacity !== '0';

        const isAnyModalOpen = isShopOpen || isDeathOpen || isLoreOpen || isKeypadOpen || isOwnerOpen || isClueInspectOpen || isCluesFolderOpen || isVictory300Open || isStartOpen;

        if (isAnyModalOpen) {
            document.body.classList.remove('metro-in-game');
            document.body.classList.add('metro-cursor-visible');
            if (document.pointerLockElement) {
                try { document.exitPointerLock?.(); } catch (_) {}
            }
        } else {
            document.body.classList.add('metro-in-game');
            document.body.classList.remove('metro-cursor-visible');
            if (!this.isPointerLocked && (this.state === 'player_free' || this.state.startsWith('intro_') || this.isSitting)) {
                try {
                    const p = this.renderer.domElement.requestPointerLock?.();
                    if (p && typeof (p as any).catch === 'function') {
                        (p as any).catch(() => {});
                    }
                } catch (_) {}
            }
        }
    }

    public updateReticleAim() {
        const crosshair = document.getElementById('hud-crosshair');
        const prompt = document.getElementById('crosshair-prompt');
        const promptText = document.getElementById('crosshair-prompt-text');

        if (this.state !== 'player_free' && !this.isSitting) {
            this.aimedInteractable = null;
            if (crosshair) crosshair.classList.remove('active');
            if (prompt) prompt.style.display = 'none';
            return;
        }

        const isEt = this.lang === 'et';

        if (this.isSitting) {
            this.aimedInteractable = 'stand';
            if (crosshair) crosshair.classList.add('active');
            if (prompt && promptText) {
                promptText.innerText = isEt ? 'Tõuse püsti / Stand Up' : 'Stand Up';
                prompt.style.display = 'block';
            }
            return;
        }

        // Camera forward direction vector
        const camDir = new THREE.Vector3(0, 0, -1).applyEuler(this.cameraEuler);
        const playerHeadPos = new THREE.Vector3(this.playerPos.x, this.playerPos.y, this.playerPos.z);
        let foundAim: 'inspectable' | 'keypad' | 'shop' | 'seat' | null = null;
        let text = '';

        // 1. Inspectable Note / Ticket / Clue / Keypad
        if (this.currentCarriage?.inspectableItem) {
            const itemPos = this.currentCarriage.inspectableItem.position;
            const toItem = itemPos.clone().sub(playerHeadPos);
            const dist = toItem.length();
            if (dist < 5.5) {
                const toItemDir = toItem.clone().normalize();
                const dot3D = camDir.dot(toItemDir);
                const camDir2D = new THREE.Vector2(camDir.x, camDir.z).normalize();
                const toItem2D = new THREE.Vector2(toItem.x, toItem.z).normalize();
                const dot2D = camDir2D.dot(toItem2D);

                if (dot3D > 0.55 || dot2D > 0.70) {
                    if (this.currentCarriage.hasKeypad) {
                        foundAim = 'keypad';
                        text = isEt ? 'Sisesta kood (Keypad)' : 'Enter Code (Keypad)';
                    } else {
                        foundAim = 'inspectable';
                        const clue = this.currentCarriage.inspectableText;
                        const title = isEt ? clue?.titleEt || 'Uuri piletit / vihjet' : clue?.titleEn || 'Inspect Note / Ticket';
                        text = title;
                    }
                }
            }
        }

        // 2. Golden Shop Counter in Carriage 100
        if (!foundAim && this.currentCarIndex === 100) {
            const counterPos = new THREE.Vector3(0, 1.0, 1.5);
            const toCounter = counterPos.clone().sub(playerHeadPos);
            const dist = toCounter.length();
            if (dist < 4.5) {
                const toCounterDir = toCounter.clone().normalize();
                const dot = camDir.dot(toCounterDir);
                if (dot > 0.70) {
                    foundAim = 'shop';
                    text = isEt ? 'Ava Kuldne Pood (Golden Shop)' : 'Open Golden Shop';
                }
            }
        }

        // 3. Seats / Benches (Only aim at empty seat cushions, not occupied by passengers)
        if (!foundAim && !this.isSitting) {
            const leftSeatPos = new THREE.Vector3(-1.1, 0.55, this.playerPos.z);
            const rightSeatPos = new THREE.Vector3(1.1, 0.55, this.playerPos.z);
            const toLeft = leftSeatPos.clone().sub(playerHeadPos);
            const toRight = rightSeatPos.clone().sub(playerHeadPos);
            const dotL = camDir.dot(toLeft.clone().normalize());
            const dotR = camDir.dot(toRight.clone().normalize());

            const isPassengerNearLeft = this.currentCarriage?.passengers?.some(p => Math.abs(p.seatPos.x - (-1.1)) < 0.4 && Math.abs(p.seatPos.z - this.playerPos.z) < 0.85);
            const isPassengerNearRight = this.currentCarriage?.passengers?.some(p => Math.abs(p.seatPos.x - 1.1) < 0.4 && Math.abs(p.seatPos.z - this.playerPos.z) < 0.85);

            if ((dotL > 0.70 && toLeft.length() < 3.2 && !isPassengerNearLeft) || (dotR > 0.70 && toRight.length() < 3.2 && !isPassengerNearRight)) {
                foundAim = 'seat';
                text = isEt ? 'Istu toolile' : 'Sit Down';
            }
        }

        // 4. Kuulja Circuit Switches in Carriage 200 (Station Platform)
        if (!foundAim && this.currentCarIndex === 200 && this.kuuljaSwitches.length > 0) {
            for (let i = 0; i < this.kuuljaSwitches.length; i++) {
                const sw = this.kuuljaSwitches[i];
                if (sw.activated) continue;
                const toSw = sw.mesh.position.clone().sub(playerHeadPos);
                const dist = toSw.length();
                if (dist < 4.5) {
                    const toSwDir = toSw.clone().normalize();
                    const dot = camDir.dot(toSwDir);
                    if (dot > 0.45 || (dist < 2.5 && dot > 0.15)) {
                        foundAim = 'switch';
                        this.aimedSwitchIndex = i;
                        text = isEt ? '⚡ Aktiveeri lüliti [E]' : '⚡ Activate Switch [E]';
                        break;
                    }
                }
            }
        }

        this.aimedInteractable = foundAim;

        if (foundAim) {
            if (crosshair) crosshair.classList.add('active');
            if (prompt && promptText) {
                promptText.innerText = text;
                prompt.style.display = 'block';
            }
        } else {
            if (crosshair) crosshair.classList.remove('active');
            if (prompt) prompt.style.display = 'none';
        }
    }

    private toggleFlashlight() {
        this.flashlightOn = !this.flashlightOn;
        if (this.flashlight) {
            this.flashlight.intensity = this.flashlightOn ? 2.5 : 0;
        }
        metroAudio.playFlashlightClick();
        this.updateHotbarUI();
    }

    public checkInteractions() {
        if (!this.currentCarriage || (this.state !== 'player_free' && !this.isSitting)) return;

        // User requirement: "se pilet või asjad tulevad sulle ette siis kui sse täpp mis on su ees on selle peal ja vajutad e"
        if (this.isSitting) {
            this.standUp();
            return;
        }

        if (this.aimedInteractable === 'switch' || (this.currentCarIndex === 200 && this.kuuljaSwitches.length > 0)) {
            let targetIdx = this.aimedSwitchIndex;
            if (targetIdx < 0 || targetIdx >= this.kuuljaSwitches.length || this.kuuljaSwitches[targetIdx].activated) {
                // Find closest unactivated switch within reach (3.5m)
                let closestDist = 3.5;
                let closestIdx = -1;
                for (let i = 0; i < this.kuuljaSwitches.length; i++) {
                    if (!this.kuuljaSwitches[i].activated) {
                        const d = this.kuuljaSwitches[i].mesh.position.distanceTo(this.playerPos);
                        if (d < closestDist) {
                            closestDist = d;
                            closestIdx = i;
                        }
                    }
                }
                targetIdx = closestIdx;
            }

            if (targetIdx >= 0 && targetIdx < this.kuuljaSwitches.length && !this.kuuljaSwitches[targetIdx].activated) {
                this.activateKuuljaSwitch(targetIdx);
                this.aimedSwitchIndex = -1;
                return;
            }
            if (this.aimedInteractable === 'switch') return;
        }

        // Return to metro in Carriage 200
        if (this.currentCarIndex === 200 && this.station200SwitchesDone && !this.station200Departing) {
            if (this.playerPos.x <= 2.2) {
                this.triggerCarriage200TrainDeparture();
                return;
            }
        }

        if (this.aimedInteractable === 'inspectable') {
            const dbClue = CLUES_DATABASE.find(c => c.carIndex === this.currentCarIndex && !this.collectedClues.some(cc => cc.id === c.id));
            if (dbClue) {
                this.openClueInspection(dbClue);
                return;
            }
            if (this.currentCarIndex === 28) this.hasUnlockedCarriage28WithClue = true;
            if (this.currentCarIndex === 78) this.hasUnlockedCarriage78WithHint = true;
            this.openLoreModal();
            return;
        }


        if (this.aimedInteractable === 'keypad') {
            this.openKeypadModal();
            return;
        }

        if (this.aimedInteractable === 'shop') {
            this.openGoldenShopModal();
            return;
        }

        if (this.aimedInteractable === 'seat') {
            this.sitDown();
            return;
        }
    }

    public startIntroSequence() {
        // Clear previous intro timeouts
        this.introTimeouts.forEach(t => clearTimeout(t));
        this.introTimeouts = [];

        metroAudio.stopCarriage200Music();
        metroAudio.stopShopMusic();

        this.carriage300ExitTriggered = false;
        if (this.carriage200ExitArrows) {
            this.carriage200ExitArrows.forEach(a => this.scene.remove(a));
            this.carriage200ExitArrows = [];
        }

        // Reset all coins, inventory items, buffs & progress when returning to the beginning
        this.coins = 0;
        this.inventory = { sword: true };
        this.playerHp = 100;
        this.updateHealthUI();
        this.equippedItem = null;
        if (this.heldItemMesh) {
            this.camera.remove(this.heldItemMesh);
            this.heldItemMesh = null;
        }
        this.updateHotbarUI();
        this.updateCoinsUI();

        const nvOverlay = document.getElementById('night-vision-overlay');
        if (nvOverlay) nvOverlay.style.display = 'none';
        this.nightVisionActive = false;
        this.speedBoostActive = false;
        this.clueDetectorActive = false;

        this.hasUnlockedCarriage28WithClue = false;
        this.hasUnlockedCarriage64WithKey = false;
        this.hasUnlockedCarriage78WithHint = false;
        this.cluesFound = 0;

        try {
            localStorage.removeItem('last_metro_save');
        } catch (e) {}

        this.currentCarIndex = 0;
        this.loadCarriage(0, 'undecided');
        this.state = 'intro_station';
        this.cutsceneTimer = 0;
        this.trainSpeed = 0;
        this.introSideDoorsOpen = false;

        // Position train deep in dark tunnel initially
        if (this.currentCarriage) {
            this.currentCarriage.group.position.set(0, 0, -65);
        }
        // Position platform at track level
        this.stationPlatformGroup.position.set(0, 0, 0);

        // Camera starts outside on station platform looking across the bright station towards approaching train track
        this.playerPos.set(2.8, 1.6, -1.0);
        this.cameraEuler.set(0, -Math.PI / 2.1, 0);

        // Show cinematic letterbox and intro location badge
        const cTop = document.getElementById('cinema-top');
        const cBottom = document.getElementById('cinema-bottom');
        const locCard = document.getElementById('intro-location-card');
        const skipBtn = document.getElementById('btn-skip-intro');
        const standBtn = document.getElementById('btn-stand-up');

        if (cTop) cTop.classList.remove('cinematic-hidden');
        if (cBottom) cBottom.classList.remove('cinematic-hidden');
        if (locCard) {
            locCard.style.display = 'block';
            locCard.style.opacity = '1';
        }
        if (skipBtn) skipBtn.style.display = 'block';
        if (standBtn) standBtn.style.display = 'none';

        this.showThought(
            'Ootan viimast metrood. Kell on hilja ja jaam on peaaegu tühi.',
            'Waiting for the last metro. It is late and the station is nearly empty.',
            4000
        );

        // t = 1.2s: Distant subway train approaches with announcement chime
        this.scheduleIntroTimeout(() => {
            metroAudio.playAnnouncementChime();
        }, 1200);

        // t = 4.2s: Train arrives and stops at platform! Doors chime and slide open
        this.scheduleIntroTimeout(() => {
            if (this.currentCarriage) this.currentCarriage.group.position.z = 0;
            metroAudio.playDoorChime();
            this.scheduleIntroTimeout(() => {
                metroAudio.playDoorSlide(true);
                this.introSideDoorsOpen = true;
                this.state = 'intro_boarding';
                this.showThought(
                    'Metroorong saabus. Astun rongi ja otsin vaba istme.',
                    'The subway train arrived. I step aboard and look for a free seat.',
                    3500
                );
            }, 600);
        }, 4200);

        // t = 7.5s: Player walks into train and sits down on seat
        this.scheduleIntroTimeout(() => {
            this.state = 'intro_riding';
            metroAudio.playFootstep();
            this.playerPos.set(1.1, 0.95, -1);
            this.cameraEuler.set(0, -Math.PI / 2, 0);

            // Hide location badge
            if (locCard) locCard.style.opacity = '0';
        }, 7500);

        // t = 9.8s: Side doors close and train departs into dark tunnel
        this.scheduleIntroTimeout(() => {
            metroAudio.playDoorChime();
            this.scheduleIntroTimeout(() => {
                metroAudio.playDoorSlide(false);
                this.introSideDoorsOpen = false;
                this.trainSpeed = 50;
                metroAudio.setSpeedAudio(0.85);
                this.stationPlatformGroup.position.set(0, -50, 0);

                this.showThought(
                    'Uksed sulgusid. Esimene peatus peaks varsti saabuma.',
                    'Doors closed. The first stop should arrive shortly.',
                    4500
                );
            }, 800);
        }, 9800);

        // t = 15.5s: Arrive at First Stop (Keskjaam / Central Station)
        this.scheduleIntroTimeout(() => {
            this.arriveAtFirstStop();
        }, 15500);
    }

    private scheduleIntroTimeout(fn: () => void, ms: number): any {
        const id = setTimeout(() => {
            if (!this.isIntroActive()) return;
            fn();
        }, ms);
        this.introTimeouts.push(id);
        return id;
    }

    private isIntroActive(): boolean {
        return this.currentCarIndex === 0 && ['intro_station', 'intro_boarding', 'intro_inside', 'intro_riding', 'intro_first_stop', 'intro_departing'].includes(this.state);
    }

    public skipIntro() {
        this.introTimeouts.forEach(t => clearTimeout(t));
        this.introTimeouts = [];
        this.state = 'player_free';

        if (this.currentCarriage) {
            this.currentCarriage.group.position.set(0, 0, 0);
        }
        this.stationPlatformGroup.position.set(0, -50, 0);
        this.introSideDoorsOpen = false;
        this.trainSpeed = 60;
        metroAudio.setSpeedAudio(0.9);

        const cTop = document.getElementById('cinema-top');
        const cBottom = document.getElementById('cinema-bottom');
        const locCard = document.getElementById('intro-location-card');
        const skipBtn = document.getElementById('btn-skip-intro');

        if (cTop) cTop.classList.add('cinematic-hidden');
        if (cBottom) cBottom.classList.add('cinematic-hidden');
        if (locCard) locCard.style.display = 'none';
        if (skipBtn) skipBtn.style.display = 'none';

        this.standUp();
    }

    public replayIntro() {
        this.startIntroSequence();
    }

    private sitInTrain() {
        this.state = 'intro_riding';
        this.trainSpeed = 50;
        metroAudio.setSpeedAudio(0.8);

        // Sit on seat at (1.1, 0.9, -1)
        this.playerPos.set(1.1, 0.95, -1);
        this.cameraEuler.set(0, -Math.PI / 2, 0);

        // Hide station platform, move through tunnel
        this.stationPlatformGroup.position.set(0, -50, 0);

        this.showThought(
            'Istusin maha. Esimene peatus peaks varsti saabuma.',
            'I sat down. The first stop should arrive shortly.'
        );

        this.scheduleIntroTimeout(() => {
            this.arriveAtFirstStop();
        }, 5500);
    }

    private arriveAtFirstStop() {
        this.state = 'intro_first_stop';
        this.trainSpeed = 0;
        metroAudio.setSpeedAudio(0);

        // Show station platform outside right windows
        this.stationPlatformGroup.position.set(0, 0, 0);

        metroAudio.playAnnouncementChime();
        metroAudio.playDoorChime();
        this.scheduleIntroTimeout(() => {
            metroAudio.playDoorSlide(true);
            this.introSideDoorsOpen = true;
        }, 500);

        this.showThought(
            'Esimene peatus: Keskjaam. Mõned reisijad lähevad maha, uued tulevad peale.',
            'First stop: Central Station. Some passengers get off, new ones board.'
        );

        // Passenger shuffle animation & doors close
        this.scheduleIntroTimeout(() => {
            metroAudio.playDoorChime();
            this.scheduleIntroTimeout(() => {
                metroAudio.playDoorSlide(false);
                this.introSideDoorsOpen = false;

                this.scheduleIntroTimeout(() => {
                    this.departFirstStop();
                }, 1500);
            }, 800);
        }, 4000);
    }

    private departFirstStop() {
        this.state = 'intro_departing';
        this.trainSpeed = 55;
        metroAudio.setSpeedAudio(0.85);
        this.stationPlatformGroup.position.set(0, -50, 0);

        const cTop = document.getElementById('cinema-top');
        const cBottom = document.getElementById('cinema-bottom');
        const skipBtn = document.getElementById('btn-skip-intro');
        if (cTop) cTop.classList.add('cinematic-hidden');
        if (cBottom) cBottom.classList.add('cinematic-hidden');
        if (skipBtn) skipBtn.style.display = 'none';

        // Unlock player movement!
        this.scheduleIntroTimeout(() => {
            this.state = 'player_free';
            const standBtn = document.getElementById('btn-stand-up');
            if (standBtn) standBtn.style.display = 'flex';

            this.showThought(
                'Rong hakkas uuesti sõitma. Nüüd saan püsti tõusta ja rongi uurida.',
                'The train started moving again. I can now stand up and explore the train.'
            );
        }, 1200);
    }
}
