import * as THREE from 'three';
import { MetroModals } from '../ui/metroModals';
import { metroAudio } from '../audio';

const _scratchV1 = new THREE.Vector3();
const _scratchV2 = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

export class MetroLoop extends MetroModals {
    public update(delta?: number) {
        this.animate(delta);
    }

    private animate(customDelta?: number) {
        // Note: renderer.setAnimationLoop passes (time, frame) into this callback!
        // We only use customDelta if it is a small delta (< 1.0s), otherwise compute from this.clock.
        const delta = (typeof customDelta === 'number' && customDelta < 1.0)
            ? customDelta
            : Math.min(this.clock.getDelta(), 0.1);

        // 0. Intro Cinematic Animations
        if (this.state === 'intro_station' && this.currentCarriage) {
            // Train pulls smoothly into station from z = -65 to 0
            this.currentCarriage.group.position.z = THREE.MathUtils.lerp(this.currentCarriage.group.position.z, 0, delta * 1.5);
        } else if (this.state === 'intro_boarding') {
            // Camera walks smoothly from platform (3.8, 1.6, -3.5) through doors (1.7, 1.6, 0) into aisle (0, 1.6, 0)
            this.playerPos.x = THREE.MathUtils.lerp(this.playerPos.x, 0, delta * 2.2);
            this.playerPos.z = THREE.MathUtils.lerp(this.playerPos.z, 0, delta * 2.2);
            if (!this.isMouseDown && !this.moveKeys['ArrowLeft'] && !this.moveKeys['ArrowRight'] && !this.moveKeys['KeyQ']) {
                this.cameraEuler.y = THREE.MathUtils.lerp(this.cameraEuler.y, -Math.PI / 2, delta * 2.0);
            }
        }

        // Side sliding doors animation
        const openOffset = this.introSideDoorsOpen ? 0.95 : 0;
        this.sideDoorMeshes.forEach(door => {
            const targetZ = door.baseZ + door.dir * openOffset;
            door.mesh.position.z = THREE.MathUtils.lerp(door.mesh.position.z, targetZ, delta * 6);
        });

        // 1. Move passing tunnel for sense of forward subway speed or reverse anomaly
        if (this.reverseTunnelTimer > 0) {
            this.reverseTunnelTimer -= delta;
            this.tunnelOffsetZ -= (this.trainSpeed * 2.0) * delta;
            this.tunnelGroup.position.z = (this.tunnelOffsetZ % 12);
        } else if (this.trainSpeed > 0) {
            this.tunnelOffsetZ += this.trainSpeed * delta;
            this.tunnelGroup.position.z = (this.tunnelOffsetZ % 12);
        }

        // 2. Realistic Passenger Breathing, Awareness & Lifelike Animation Logic
        if (this.currentCarriage) {
            const time = performance.now() * 0.0015;
            this.currentCarriage.passengers.forEach((p, pIdx) => {
                // Subtle rhythmic chest breathing expansion
                const breath = Math.sin(time * 2.2 + pIdx * 1.6) * 0.008;
                p.body.position.y = 0.32 + breath;
                p.body.scale.set(1.0 + breath * 0.8, 1.0 + breath * 1.2, 1.0 + breath * 0.8);

                const distToPlayer = this.playerPos.distanceTo(p.group.position);

                if (p.isCreepy || this.currentCarIndex === 83 || this.currentCarIndex === 71) {
                    if (distToPlayer < 6.5) {
                        // Creepy staring anomaly: head locks unblinkingly onto player
                        const angle = Math.atan2(this.playerPos.x - p.group.position.x, this.playerPos.z - p.group.position.z);
                        p.head.rotation.y = THREE.MathUtils.lerp(p.head.rotation.y, angle - p.group.rotation.y, delta * 5);
                    } else {
                        p.head.rotation.y = THREE.MathUtils.lerp(p.head.rotation.y, 0, delta * 3);
                    }
                } else if (distToPlayer < 3.2 && this.playerPos.z > p.group.position.z - 2.5 && this.playerPos.z < p.group.position.z + 2.5) {
                    // Natural commuter glance as player walks down the aisle
                    const targetAngle = Math.atan2(this.playerPos.x - p.group.position.x, this.playerPos.z - p.group.position.z) - p.group.rotation.y;
                    const clampedAngle = THREE.MathUtils.clamp(targetAngle, -0.65, 0.65);
                    p.head.rotation.y = THREE.MathUtils.lerp(p.head.rotation.y, clampedAngle, delta * 3.5);
                    p.head.rotation.x = THREE.MathUtils.lerp(p.head.rotation.x, 0.05, delta * 3.5);
                } else if (p.animType === 'phone') {
                    // Looking at phone with subtle screen glow and thumb scrolling
                    p.head.rotation.x = THREE.MathUtils.lerp(p.head.rotation.x, 0.28 + Math.sin(time * 1.5 + pIdx) * 0.03, delta * 4);
                    p.head.rotation.y = THREE.MathUtils.lerp(p.head.rotation.y, (p.seatPos.x > 0 ? -1 : 1) * 0.06, delta * 4);
                    if (p.thumbRight) {
                        p.thumbRight.position.z = 0.27 + Math.sin(time * 5.0 + pIdx) * 0.005;
                    }
                } else if (p.animType === 'look_window') {
                    // Gazing out the subway window watching passing tunnel lights
                    const windowAngle = (p.seatPos.x > 0 ? 1 : -1) * (0.82 + Math.sin(time * 0.8 + pIdx) * 0.05);
                    p.head.rotation.y = THREE.MathUtils.lerp(p.head.rotation.y, windowAngle, delta * 3);
                    p.head.rotation.x = THREE.MathUtils.lerp(p.head.rotation.x, -0.04, delta * 3);
                }

                // Headphone wearer subtle rhythm head nod
                if (p.headphones) {
                    p.head.rotation.x += Math.sin(time * 4.2 + pIdx) * 0.025;
                }
            });
        }

        // 2b. Collectible Coins Rotation & Proximity Collection Loop
        for (let i = this.collectibleCoins.length - 1; i >= 0; i--) {
            const coin = this.collectibleCoins[i];
            if (!coin.collected) {
                coin.mesh.rotation.z += delta * 3.5;
                const dist = this.playerPos.distanceTo(coin.mesh.position);
                if (dist < 1.35) {
                    coin.collected = true;
                    this.addCoins(coin.value);
                    metroAudio.playCoinPickup();
                    this.currentCarriage?.group.remove(coin.mesh);
                    this.collectibleCoins.splice(i, 1);
                    this.showThought(`+${coin.value} 🪙 Metro Coin!`, `+${coin.value} 🪙 Metro Coin!`, 1500);
                }
            }
        }

        // 2c. Clue Detector (Vihjeandur) Radar Proximity Ping
        if (this.clueDetectorActive || this.equippedItem === 'clue_detector') {
            if (this.currentCarriage?.inspectableItem) {
                const dist = this.playerPos.distanceTo(this.currentCarriage.inspectableItem.position);
                if (dist < 6.0) {
                    this.radarPingTimer -= delta;
                    const pingInterval = Math.max(0.25, dist * 0.28);
                    if (this.radarPingTimer <= 0) {
                        this.radarPingTimer = pingInterval;
                        metroAudio.playRadarPing();
                    }
                }
            }
        }

        // 3. Ghost Stalker Creeping Logic in Carriage 9
        if (this.stalkerActive && this.stalkerMesh) {
            _scratchV1.subVectors(this.stalkerMesh.position, this.playerPos).normalize();
            _scratchV2.set(0, 0, -1).applyEuler(this.cameraEuler);
            const dot = _scratchV2.dot(_scratchV1);

            if (dot < 0.2) {
                // Looking away -> Stalker creeps closer!
                this.stalkerDistZ -= 2.6 * delta;
                this.stalkerMesh.position.z = this.stalkerDistZ;
                metroAudio.playHeartbeat();
            }

            // When stalker gets close or player advances -> Stalker dissolves & triggers Void Shadow Hands!
            if (this.playerPos.z > 3.0 || this.stalkerDistZ < this.playerPos.z + 2.0) {
                this.scene.remove(this.stalkerMesh);
                this.stalkerActive = false;
                this.stalkerMesh = null;
                this.triggerShadowHandsEvent();
            }
        }

        // 3b. Ultra-Realistic Shadow Hand Reaching & 10s Timer Dismissal
        if (this.shadowHandsActive && this.state === 'player_free') {
            this.shadowHandsTimer -= delta;
            if (this.shadowHandsTimer <= 0) {
                this.dismissShadowHands();
            } else {
                this.shadowHandsAnimTimer += delta * 4.5;
                this.shadowHandsGroups.forEach((hand) => {
                    const wave = Math.sin(this.shadowHandsAnimTimer);
                    hand.position.y = 1.35 + wave * 0.14;
                    hand.rotation.x = Math.sin(this.shadowHandsAnimTimer * 0.7) * 0.22;
                    hand.rotation.y = Math.cos(this.shadowHandsAnimTimer * 0.5) * 0.28;

                    // Animate articulated fingers flexing and grasping
                    hand.children.forEach(child => {
                        if (child.name === 'finger') {
                            child.rotation.z = Math.sin(this.shadowHandsAnimTimer * 2.0) * 0.28;
                            child.rotation.x = Math.cos(this.shadowHandsAnimTimer * 1.6) * 0.18;
                        }
                    });

                    // Reach inwards toward center aisle
                    const side = hand.position.x > 0 ? 1 : -1;
                    hand.position.x = (side * 1.68) - (side * (0.65 + wave * 0.35));

                    // Ultra-sensitive collision check: even slight contact or entering reach zone triggers instant death
            const handWorldPos = hand.position;
                    const distToHand = this.playerPos.distanceTo(handWorldPos);
                    const nearDoorWay = (side > 0 ? this.playerPos.x > 0.25 : this.playerPos.x < -0.25) && Math.abs(this.playerPos.z - handWorldPos.z) < 2.0;

                    if (distToHand < 1.75 || nearDoorWay) {
                        this.triggerDraggedDeath(side);
                    }
                });
            }
        }

        // 3c. Dragged Out Death Cutscene Animation
        if (this.state === 'dragged_death') {
            this.deathTimer += delta;
            // Drag violently sideways out through the open door into the dark rushing tunnel
            const targetX = this.deathDragSide * 4.5;
            this.playerPos.x = THREE.MathUtils.lerp(this.playerPos.x, targetX, delta * 5.0);
            this.playerPos.y = THREE.MathUtils.lerp(this.playerPos.y, 0.4, delta * 2.5);

            // Camera violent spin and tilt
            this.cameraEuler.z += delta * (this.deathDragSide * 5.0);
            this.cameraEuler.x += delta * 2.8;

            if (this.deathTimer > 1.6) {
                this.openDeathModal();
            }
        }

        if (this.shadowRushCountdown > 0) {
            this.shadowRushCountdown = Math.max(0, this.shadowRushCountdown - delta);
        }

        // 3d. Carriage 20 Shadow Creature (Must Olend) Rush Logic & Seating Survival Check
        if (this.shadowRushActive && this.shadowEntityMesh) {
            this.shadowEntityMesh.position.z += this.shadowRushSpeed * delta;

            // Violent camera vibration / shake when creature rushes closer
            const distToPlayerZ = Math.abs(this.shadowEntityMesh.position.z - this.playerPos.z);
            if (distToPlayerZ < 7.0) {
                const shakeIntensity = (1.0 - distToPlayerZ / 7.0) * 0.09;
                this.camera.position.x += (Math.random() - 0.5) * shakeIntensity;
                this.camera.position.y += (Math.random() - 0.5) * shakeIntensity;
            }

            // Creature strikes player zone!
            if (distToPlayerZ < 2.0 && this.state !== 'game_over' && this.state !== 'dragged_death') {
                if (!this.isSitting) {
                    // Player was STANDING -> Instant Death!
                    this.state = 'game_over';
                    metroAudio.playJumpScareStinger();
                    const deathModal = document.getElementById('death-modal');
                    const dTitle = document.getElementById('death-title');
                    const dReason = document.getElementById('death-reason');
                    if (dTitle) dTitle.textContent = this.lang === 'et' ? 'SA SURID' : 'YOU DIED';
                    if (dReason) {
                        dReason.textContent = this.lang === 'et'
                            ? 'Must vari pühkis su minema! Sa seisid püsti — sa oleksid pidanud toolile istuma!'
                            : 'The shadow entity swept you away! You were standing — you should have sat on a seat!';
                    }
                    if (deathModal) deathModal.style.display = 'flex';
                }
            }

            // Creature finished dashing out of the carriage into darkness
            if (Math.abs(this.shadowEntityMesh.position.z) > 10.5) {
                this.shadowRushActive = false;
                this.scene.remove(this.shadowEntityMesh);
                this.shadowEntityMesh = null;
                this.trainSpeed = 60;

                if (this.state !== 'game_over') {
                    this.showThought(
                        'See läks napilt... Istumine päästis mu elu! Must vari kadus pimedusse ja uksed avanesid. Võid nüüd püsti tõusta.',
                        'That was close... Sitting down saved my life! The shadow vanished into darkness and doors unlocked. You can stand up now.',
                        4500
                    );
                }
            }
        }

        // 3d. Vagun 200 Final Boss & Green Health Pickups Update ("maa peal on plussid roheliusega salt saad pluss 30 elu")
        if (this.currentCarIndex === 200) {
            // Green Health Pickups (+30 Health)
            // User requirement: "need plussid maa peal saab võtta kui on elud alla 100 ag akui on 100 siis tuleb tekst sul on juba max elud"
            if (this.carriage200HealthPickups.length > 0 && this.state === 'player_free') {
                const time = performance.now() * 0.003;
                this.carriage200HealthPickups.forEach(p => {
                    if (p.collected) return;
                    // Spin and bob
                    p.mesh.rotation.y += delta * 2.2;
                    p.mesh.position.y = 0.22 + Math.sin(time * 2 + p.pulseOffset) * 0.05;

                    const dx = p.mesh.position.x - this.playerPos.x;
                    const dz = p.mesh.position.z - this.playerPos.z;
                    const dist2D = Math.sqrt(dx * dx + dz * dz);

                    if (dist2D < 1.4) {
                        if (this.playerHp < 100) {
                            p.collected = true;
                            p.mesh.visible = false;
                            p.light.visible = false;
                            this.healPlayer(30);
                            metroAudio.playHealChime();
                            this.showThought(
                                '💚 +30 ELU! (Roheline pluss taastas tervist)',
                                '💚 +30 HEALTH! (Green plus restored health)',
                                2500
                            );
                        } else {
                            // Already at 100 HP (max health)
                            const nowMs = performance.now();
                            if (nowMs - this.lastMaxHealthWarningTime > 2000) {
                                this.lastMaxHealthWarningTime = nowMs;
                                this.showThought(
                                    'sul on juba max elud',
                                    'you already have max health',
                                    2500
                                );
                            }
                        }
                    }
                });
            }

            // Carriage 200 Final Boss AI ("pahalane saab liikuda", "selle vaguni lõpus on pahalane keda tapad mõõgaga 10 lõõki")
            if (this.carriage200Boss && !this.carriage200Boss.isDead && this.state === 'player_free') {
                const b = this.carriage200Boss;
                const bPos = b.group.position;
                const bTime = performance.now() * 0.002;

                // Menacing floating bob
                bPos.y = Math.sin(bTime * 2.5) * 0.12;

                // Boss tracks player
                b.group.lookAt(this.playerPos.x, bPos.y + 1.5, this.playerPos.z);

                const dx = this.playerPos.x - bPos.x;
                const dz = this.playerPos.z - bPos.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                // Boss movement towards player ("pahalane saab liikuda")
                if (dist > 2.2) {
                    const dirX = dx / dist;
                    const dirZ = dz / dist;
                    const speed = b.moveSpeed || 2.3;
                    bPos.x += dirX * speed * delta;
                    bPos.z += dirZ * speed * delta;

                    // Keep boss inside carriage boundaries
                    bPos.x = Math.max(-1.3, Math.min(1.3, bPos.x));
                    bPos.z = Math.max(-42.0, Math.min(46.0, bPos.z));
                }

                // Boss attack cooldown
                if (b.attackCooldown > 0) {
                    b.attackCooldown -= delta;
                } else if (dist < 3.2) {
                    b.attackCooldown = 1.8;
                    this.takePlayerDamage(
                        25,
                        'Lõpupahalane tabas sind oma pimeduse küünisega!',
                        'The Final Boss slashed you with dark claws!'
                    );
                }
            }

            // Animate Carriage 200 Exit Arrows (bobbing & pulsating glow wave towards front door)
            if (this.currentCarIndex === 200 && this.carriage200ExitArrows && this.carriage200ExitArrows.length > 0) {
                const arrTime = performance.now() * 0.004;
                this.carriage200ExitArrows.forEach((arr, idx) => {
                    const baseY = (arr as any).baseY || 1.4;
                    const baseZ = (arr as any).baseZ || 0;
                    arr.position.y = baseY + Math.sin(arrTime * 2.5 + idx * 0.8) * 0.12;
                    arr.position.z = baseZ + Math.sin(arrTime * 3.5) * 0.22;
                });
            }
        }

        // 4. Keyboard Camera Turning (Arrows & Q/E)
        if (this.state === 'player_free' || this.state.startsWith('intro_') || this.isSitting) {
            const rotSpeed = 1.9;
            if (this.moveKeys['ArrowLeft'] || this.moveKeys['KeyQ']) {
                this.cameraEuler.y += rotSpeed * delta;
            }
            if (this.moveKeys['ArrowRight']) {
                this.cameraEuler.y -= rotSpeed * delta;
            }
            if (this.moveKeys['ArrowUp']) {
                this.cameraEuler.x += rotSpeed * 0.75 * delta;
            }
            if (this.moveKeys['ArrowDown']) {
                this.cameraEuler.x -= rotSpeed * 0.75 * delta;
            }
            this.cameraEuler.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.cameraEuler.x));
        }

        // 5. Player Physics & Movement (when player_free and not sitting)
        if (this.state === 'player_free' && !this.isSitting) {
            let baseSpeed = (this.speedBoostActive || this.equippedItem === 'speed_boost') ? 5.4 : 3.6;
            if (this.isCrouching) {
                baseSpeed *= 0.65; // Sneak movement speed while crouched
                this.playerPos.y = 0.95;
            } else if (this.currentCarIndex !== 217 || !this.sewerWaterSubmerged) {
                this.playerPos.y = 1.6;
            }

            _moveDir.set(0, 0, 0);

            if (this.moveKeys['KeyW']) _moveDir.z -= 1;
            if (this.moveKeys['KeyS']) _moveDir.z += 1;
            if (this.moveKeys['KeyA']) _moveDir.x -= 1;
            if (this.moveKeys['KeyD']) _moveDir.x += 1;

            if (_moveDir.lengthSq() > 0) {
                _moveDir.normalize();
                _moveDir.applyAxisAngle(_upAxis, this.cameraEuler.y);

                this.playerPos.x += _moveDir.x * baseSpeed * delta;
                this.playerPos.z += _moveDir.z * baseSpeed * delta;

                // Train carriage boundary collision
                if (this.currentCarIndex === 200) {
                    this.playerPos.x = Math.max(-1.4, Math.min(1.4, this.playerPos.x));
                    this.playerPos.z = Math.max(-48.5, Math.min(48.5, this.playerPos.z));
                } else if (this.currentCarIndex >= 201) {
                    this.playerPos.x = Math.max(-5.0, Math.min(5.0, this.playerPos.x));
                } else {
                    this.playerPos.x = Math.max(-1.4, Math.min(1.4, this.playerPos.x));
                }

                // Head bob & footsteps (footsteps silent while crouching)
                this.headBobTimer += delta * (baseSpeed > 4 ? 16 : 12);
                if (!this.isCrouching) {
                    this.stepTimer += delta;
                    if (this.stepTimer > (baseSpeed > 4 ? 0.32 : 0.48)) {
                        this.stepTimer = 0;
                        metroAudio.playFootstep();
                    }
                }
            }

            // Door Navigation & Locked Door Checks
            const now = performance.now();

            // Shadow Event Trap Check (Vagun 20, 25, 32, 48, 50, 57, 63, 70, 75, 82, 90, 97)
            // User requirement: "kui tuleb se koll 20 uks ja 25 jne tuleb siis ei saa nii kaua minna teise vagunisse ehk oled kinni kuni se laul läbi saab"
            if (this.isShadowEventActive() && Math.abs(this.playerPos.z) > 7.5) {
                this.playerPos.z = this.playerPos.z > 0 ? 7.4 : -7.4;
                if (now - this.lastLockedDoorSoundTime > 1200) {
                    this.lastLockedDoorSoundTime = now;
                    metroAudio.playDoorLocked();
                    this.showThought(
                        '⚠️ Uksed on anomaalia ajal lukus! Oled vagunis kinni, kuni must vari ja laul on möödas! ISTU TOOLILE!',
                        '⚠️ Doors are locked during the anomaly! You are trapped until the shadow creature and song subside! SIT DOWN!'
                    );
                }
                return;
            }

            // Carriage 64 Key Unlock Door Check
            if (this.currentCarIndex === 64 && Math.abs(this.playerPos.z) > 8.0) {
                if (this.equippedItem === 'key' || this.inventory['key']) {
                    if (!this.hasUnlockedCarriage64WithKey) {
                        this.hasUnlockedCarriage64WithKey = true;
                        metroAudio.playDoorLatch();
                        this.showThought('🗝️ Võti keeras luku lahti! Uks avanes.', '🗝️ Key unlocked the bulkhead door!');
                    }
                } else if (!this.hasUnlockedCarriage64WithKey) {
                    this.playerPos.z = this.playerPos.z > 0 ? 7.6 : -7.6;
                    if (now - this.lastLockedDoorSoundTime > 1200) {
                        this.lastLockedDoorSoundTime = now;
                        metroAudio.playDoorLocked();
                        this.showThought('Uks on lukus! Vajad võtit (Vagun 63), et see avada.', 'Door is locked! You need the key (Carriage 63) to open it.');
                    }
                    return;
                }
            }

            if (this.currentCarIndex === 200) {
                // Vagun 200 is the final carriage: bounds are -48.5 to +48.5
                if (this.playerPos.z < -47.8) {
                    this.playerPos.z = -47.6;
                    if (now - this.lastLockedDoorSoundTime > 1200) {
                        this.lastLockedDoorSoundTime = now;
                        metroAudio.playDoorLocked();
                        this.showThought(
                            'Uks on lukus. Tagasi ei saa minna. Alista vaguni lõpus olev Lõpupahalane!',
                            'Door is locked. Defeat the Final Boss at the end of the carriage!'
                        );
                    }
                } else if (this.playerPos.z > 45.0 && this.carriage200Boss?.isDead) {
                    if (!this.carriage300ExitTriggered) {
                        metroAudio.playDoorSlide(true);
                    }
                    this.triggerVictory200();
                } else if (this.playerPos.z > 48.0) {
                    this.playerPos.z = 47.8;
                }
            } else if (this.branchDirection === 'right') {
                // Front Door (+Z) -> Open Next Carriage
                if (this.playerPos.z > 8.8) {
                    this.loadCarriage(this.currentCarIndex + 1, 'right');
                }
                // Back Door (-Z) -> LOCKED Previous Carriage
                else if (this.playerPos.z < -7.8) {
                    this.playerPos.z = -7.6; // bounce back
                    if (now - this.lastLockedDoorSoundTime > 1200) {
                        this.lastLockedDoorSoundTime = now;
                        metroAudio.playDoorLocked();
                        this.showThought(
                            'Uks on lukus. Tagasi eelmisesse vagunisse ei saa minna. Edasi liikumine on ainus võimalus.',
                            'The door is locked. You cannot return to the previous carriage. Moving forward is the only way.'
                        );
                    }
                }
            } else if (this.branchDirection === 'left') {
                // Back Door (-Z) -> Open Next Carriage
                if (this.playerPos.z < -8.8) {
                    this.loadCarriage(this.currentCarIndex + 1, 'left');
                }
                // Front Door (+Z) -> LOCKED Previous Carriage
                else if (this.playerPos.z > 7.8) {
                    this.playerPos.z = 7.6; // bounce back
                    if (now - this.lastLockedDoorSoundTime > 1200) {
                        this.lastLockedDoorSoundTime = now;
                        metroAudio.playDoorLocked();
                        this.showThought(
                            'Uks on lukus. Tagasi eelmisesse vagunisse ei saa minna. Edasi liikumine on ainus võimalus.',
                            'The door is locked. You cannot return to the previous carriage. Moving forward is the only way.'
                        );
                    }
                }
            } else {
                // Undecided (Carriage 0 initial choice)
                if (this.playerPos.z > 8.8) {
                    this.loadCarriage(1, 'right');
                } else if (this.playerPos.z < -8.8) {
                    this.loadCarriage(1, 'left');
                }
            }

            const maxClampZ = this.currentCarIndex === 200 ? 48.5 : 9.2;
            this.playerPos.z = Math.max(-maxClampZ, Math.min(maxClampZ, this.playerPos.z));
        }

        // Glowing Shadow Eyes Animation (Pulsing / Breathing)
        if (this.shadowEyesGroup) {
            this.shadowEyesGroup.children.forEach((eyePair, idx) => {
                const pulse = Math.sin(this.headBobTimer * 2 + idx) * 0.12;
                eyePair.scale.set(1 + pulse, 1 + pulse, 1 + pulse);
            });
        }

        // Shadow Villains AI & Combat Attack Logic (Carriage 31)
        if (this.shadowVillains.length > 0 && this.state === 'player_free' && !this.isSitting) {
            this.shadowVillains.forEach(v => {
                const toPlayer = this.playerPos.clone().sub(v.group.position);
                toPlayer.y = 0;
                const dist = toPlayer.length();

                v.group.lookAt(this.playerPos.x, v.group.position.y, this.playerPos.z);

                if (dist > 1.3) {
                    const moveStep = toPlayer.normalize().multiplyScalar(1.5 * delta);
                    v.group.position.add(moveStep);
                }

                // Attack player when in melee range
                v.attackCooldown -= delta;
                if (dist <= 1.8 && v.attackCooldown <= 0) {
                    v.attackCooldown = 1.6;
                    this.takePlayerDamage(20, 'Pahalane ründas sind ja võttis sult elud!', 'Shadow villain struck you and dealt damage!');
                }
            });
        }

        // Sword Swing Animation
        if (this.isSwordSwinging && this.heldItemMesh && this.equippedItem === 'sword') {
            this.swordSwingTimer -= delta;
            const progress = 1.0 - (this.swordSwingTimer / 0.28);
            const swingAngle = Math.sin(progress * Math.PI);
            this.heldItemMesh.rotation.x = Math.PI / 4 + swingAngle * 0.95;
            this.heldItemMesh.rotation.z = -swingAngle * 0.7;
            if (this.swordSwingTimer <= 0) {
                this.isSwordSwinging = false;
                this.heldItemMesh.rotation.x = Math.PI / 4;
                this.heldItemMesh.rotation.z = 0;
            }
        }

        // --- Ajapahalane (Time Villain) Timer & Chase Logic ---
        // Increment carriage stay timer when player_free and not in special carriages
        if (this.state === 'player_free' && this.currentCarIndex > 0 && this.currentCarIndex !== 100 && this.currentCarIndex !== 200 && !this.timeVillainActive && !this.timeVillainTriggeredThisCarriage) {
            this.carriageStayTimer += delta;

            // Deterministic event: trigger when staying >= 20 seconds, unless other anomalies are active
            if (this.carriageStayTimer >= 20 && !this.isShadowEventActive() && !this.shadowHandsActive) {
                this.activateTimeVillain();
                // Prevent re-triggering in the same carriage
                this.timeVillainTriggeredThisCarriage = true;
            }
        }

        // Time Villain countdown update
        if (this.timeVillainActive && this.state === 'player_free') {
            this.timeVillainCountdown -= delta;

            // Update countdown display
            const countdownEl = document.getElementById('time-villain-countdown');
            if (countdownEl) {
                const seconds = Math.max(0, Math.ceil(this.timeVillainCountdown));
                countdownEl.textContent = `⏱️ ${seconds}`;
            }

            // Camera shake effect (violent shaking)
            this.timeVillainShakeOffset.set(
                (Math.random() - 0.5) * 0.08,
                (Math.random() - 0.5) * 0.06,
                (Math.random() - 0.5) * 0.04
            );

            // Time Villain slowly chases the player
            if (this.timeVillainGroup) {
                this.timeVillainGroup.lookAt(this.playerPos.x, 1.6, this.playerPos.z);
                const toPlayer = this.playerPos.clone().sub(this.timeVillainGroup.position);
                toPlayer.y = 0;
                const dist = toPlayer.length();
                if (dist > 1.0) {
                    const chaseSpeed = 1.8 * delta;
                    this.timeVillainGroup.position.add(toPlayer.normalize().multiplyScalar(chaseSpeed));
                }
            }

            // Time's up — kill player
            if (this.timeVillainCountdown <= 0) {
                this.timeVillainKillPlayer();
            }
        } else {
            this.timeVillainShakeOffset.set(0, 0, 0);
        }

        // 6. Update Camera & Held Item Sway
        const headBobOffset = Math.sin(this.headBobTimer) * 0.04;
        this.camera.position.set(
            this.playerPos.x + this.timeVillainShakeOffset.x,
            this.playerPos.y + (this.state === 'player_free' ? headBobOffset : 0) + this.timeVillainShakeOffset.y,
            this.playerPos.z + this.timeVillainShakeOffset.z
        );
        this.camera.quaternion.setFromEuler(this.cameraEuler);

        // Update Center Reticle Raycast Aim
        this.updateReticleAim();

        // Render Frame
        this.renderer.render(this.scene, this.camera);
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
