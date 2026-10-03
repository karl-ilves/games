import { emotesWidget, playerAvatarRig, checkpointPosition, playerInventory, studioTestPlaybux, activeQuest, orbitTheta, orbitTarget } from '../state/creatorState';
import { isCurrentUserAdmin } from '../ai/aiBuildEngine';
import type { PlacedObject } from '../types';
import { collectCoin, collectKey, healPlayer, equipCustomItemInHand, openInGameShop, exitVehicle } from '../systems/physics';
import { updateStudioTestPlaybuxDisplay } from '../catalog/creatorCatalog';
import { showDialogMessage } from '../systems/scriptRunner';
import * as THREE from 'three';
import { csState,  scene,
    camera,
    renderer,
    clock,
    placedObjects,
    selectedObject,
    isPlayTestMode,
    currentVehicle,
    vehicleSpeed,
    setVehicleSpeed,
    humanCharacter,
    characterVelocity,
    isGrounded,
    setIsGrounded,
    characterYaw,
    keys,
    playerHealth,
    setPlayerHealth,
    playerCoins,
    playerAsma,
    setPlayerAsma,
    playerMaxAsma,
    isGameOver,
    setIsGameOver,
    isGameFinished,
    setIsGameFinished,
    playerSpeedMultiplier,
    playerSpeedBoostEndTime,
    nearbyVehicle,
    setNearbyVehicle,
    mousePos,
    isRightMouseDown
} from '../state/creatorState';
import { isAirplaneObject, isBoatObject } from '../models/objectModels';
import { isPositionInWater, oceanWaterMesh, activeSeaConfig } from '../world/environment';
import {
    updateMoveGizmo,
    updatePullGizmo,
    moveGizmoGroup,
    pullGizmoGroup,
    isMovingWithGizmo,
    isPullingObject,
    studioToolMode
} from './gizmos';
import {
    updateGameplayHUD,
    damagePlayer,
    isPlayerTouchingOrOnTop,
    respawnPlayerAtCheckpoint,
    triggerVictory,
    triggerGameOver
} from './physics';
import { executeObjectScript, playGameSound } from './scriptRunner';
import { updateOrbitCamera } from '../ui/orbitCamera';

export function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);
    const time = Date.now() * 0.001;

    // --- Update Dynamic Moving & Animated Objects ---
    for (const obj of placedObjects) {
        if (obj.movement) {
            const m = obj.movement;
            if (m.type === 'patrol') {
                const axis = m.axis || 'x';
                const offset = Math.sin(time * m.speed) * m.distance;
                if (axis === 'x') obj.mesh.position.x = m.origin.x + offset;
                else if (axis === 'z') obj.mesh.position.z = m.origin.z + offset;
                else if (axis === 'y') obj.mesh.position.y = m.origin.y + offset;
            } else if (m.type === 'elevator') {
                obj.mesh.position.y = m.origin.y + (Math.sin(time * m.speed) * 0.5 + 0.5) * m.distance;
            } else if (m.type === 'rotate') {
                obj.mesh.rotation.y += (m.rotationSpeed || m.speed || 1.5) * delta;
            } else if (m.type === 'bounce') {
                obj.mesh.position.y = m.origin.y + Math.abs(Math.sin(time * m.speed)) * m.distance;
                obj.mesh.position.z = m.origin.z + Math.cos(time * (m.speed * 0.5)) * 1.2;
            } else if (m.type === 'circle') {
                obj.mesh.position.x = m.origin.x + Math.cos(time * m.speed) * m.distance;
                obj.mesh.position.z = m.origin.z + Math.sin(time * m.speed) * m.distance;
                obj.mesh.rotation.y = -time * m.speed;
            }
            obj.position.x = obj.mesh.position.x;
            obj.position.y = obj.mesh.position.y;
            obj.position.z = obj.mesh.position.z;
        }
    }

    // --- Update Animated Ocean Waves ---
    if (oceanWaterMesh && oceanWaterMesh.userData.basePos) {
        const geo = oceanWaterMesh.geometry as THREE.BufferGeometry;
        const posAttr = geo.attributes.position;
        const base = oceanWaterMesh.userData.basePos as Float32Array;
        const count = posAttr.count;
        const wSpeed = activeSeaConfig?.waveSpeed || 2.0;
        const wHeight = activeSeaConfig?.waveHeight || 0.22;

        for (let i = 0; i < count; i++) {
            const bx = base[i * 3];
            const by = base[i * 3 + 1];
            const wave = Math.sin(time * wSpeed + bx * 0.12 + by * 0.12) * wHeight +
                         Math.cos(time * (wSpeed * 0.7) + bx * 0.08) * (wHeight * 0.45);
            posAttr.setZ(i, wave);
        }
        posAttr.needsUpdate = true;
    }

    if (isPlayTestMode) {
        if (currentVehicle) {
            const isPlane = isAirplaneObject(currentVehicle);

            if (isPlane) {
                // --- ✈️ 3D Airplane Flight Physics & Flight Controls ---
                const maxFlightSpeed = 52; // ~190 km/h
                const flightAccel = 34;

                // 1. Throttle / Acceleration & Brake
                if (keys['KeyW'] || keys['ArrowUp']) {
                    csState.vehicleSpeed = Math.min(vehicleSpeed + flightAccel * delta, maxFlightSpeed);
                } else if (keys['KeyS'] || keys['ArrowDown']) {
                    if (currentVehicle.mesh.position.y <= 0.3) {
                        // On runway: brake / reverse
                        csState.vehicleSpeed = Math.max(vehicleSpeed - flightAccel * delta, -10);
                    } else {
                        // Airborne: air-brake / slow down
                        csState.vehicleSpeed = Math.max(vehicleSpeed - flightAccel * 0.7 * delta, 8);
                    }
                } else {
                    // Natural air resistance
                    csState.vehicleSpeed = THREE.MathUtils.lerp(vehicleSpeed, currentVehicle.mesh.position.y > 0.5 ? 18 : 0, 1.2 * delta);
                }

                // 2. Yaw Steering & Roll Banking
                const steerDir = (vehicleSpeed >= 0 ? 1 : -1);
                if (keys['KeyA'] || keys['ArrowLeft']) {
                    currentVehicle.mesh.rotation.y += 2.2 * delta * steerDir;
                    currentVehicle.mesh.rotation.z = THREE.MathUtils.lerp(currentVehicle.mesh.rotation.z, 0.42, 6 * delta);
                } else if (keys['KeyD'] || keys['ArrowRight']) {
                    currentVehicle.mesh.rotation.y -= 2.2 * delta * steerDir;
                    currentVehicle.mesh.rotation.z = THREE.MathUtils.lerp(currentVehicle.mesh.rotation.z, -0.42, 6 * delta);
                } else {
                    // Auto level wings roll
                    currentVehicle.mesh.rotation.z = THREE.MathUtils.lerp(currentVehicle.mesh.rotation.z, 0, 5 * delta);
                }

                // 3. Pitch (Climb / Dive) & Altitude Lift
                const isClimbing = keys['Space'] || keys['KeyQ'];
                const isDiving = keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyE'] || (keys['KeyS'] && currentVehicle.mesh.position.y > 0.5);

                if (isClimbing) {
                    // Climb rate proportional to speed
                    const climbPower = Math.max(10, Math.abs(vehicleSpeed) * 0.5);
                    currentVehicle.mesh.position.y = Math.min(180, currentVehicle.mesh.position.y + climbPower * delta);
                    currentVehicle.mesh.rotation.x = THREE.MathUtils.lerp(currentVehicle.mesh.rotation.x, -0.32, 5 * delta);
                } else if (isDiving) {
                    currentVehicle.mesh.position.y = Math.max(0, currentVehicle.mesh.position.y - 14 * delta);
                    currentVehicle.mesh.rotation.x = THREE.MathUtils.lerp(currentVehicle.mesh.rotation.x, 0.32, 5 * delta);
                } else {
                    // Natural level pitch
                    currentVehicle.mesh.rotation.x = THREE.MathUtils.lerp(currentVehicle.mesh.rotation.x, 0, 4 * delta);

                    // Aerodynamic lift if airborne
                    if (currentVehicle.mesh.position.y > 0) {
                        if (Math.abs(vehicleSpeed) < 6) {
                            currentVehicle.mesh.position.y = Math.max(0, currentVehicle.mesh.position.y - 8 * delta);
                        }
                    }
                }

                // 4. Ground Collision & Landing
                if (currentVehicle.mesh.position.y <= 0) {
                    currentVehicle.mesh.position.y = 0;
                    currentVehicle.mesh.rotation.x = 0;
                    currentVehicle.mesh.rotation.z = 0;
                }

                // 5. Move Airplane Forward in its 3D Heading
                currentVehicle.mesh.translateZ(-vehicleSpeed * delta);
                currentVehicle.position = {
                    x: currentVehicle.mesh.position.x,
                    y: currentVehicle.mesh.position.y,
                    z: currentVehicle.mesh.position.z
                };

                // Sync human position to airplane
                humanCharacter.position.copy(currentVehicle.mesh.position);

                // 6. Smooth 3rd Person Follow Camera
                const camDistance = 10.5;
                const camHeight = 4.2;
                const camOffset = new THREE.Vector3(0, camHeight, camDistance);
                camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), currentVehicle.mesh.rotation.y);
                const targetCamPos = currentVehicle.mesh.position.clone().add(camOffset);
                camera.position.lerp(targetCamPos, 0.15);
                camera.lookAt(currentVehicle.mesh.position.x, currentVehicle.mesh.position.y + 1.2, currentVehicle.mesh.position.z);

                // 7. Update HUD Speed & Altitude
                const speedEl = document.getElementById('vehicle-hud-speed');
                if (speedEl) {
                    const speedKmh = Math.round(Math.abs(vehicleSpeed) * 3.6);
                    const altitudeM = Math.round(currentVehicle.mesh.position.y * 3);
                    speedEl.innerHTML = `${speedKmh} km/h <span style="font-size: 0.8rem; color: #00f2fe; display: block;">Alt: ${altitudeM} m</span>`;
                }
            } else if (isBoatObject(currentVehicle)) {
                // --- 🛥️ Drivable Boat / Speedboat Physics & Water Motion ---
                const boatMaxSpeed = 44; // ~160 km/h fast speedboat
                const boatAccel = 34;
                const boatReverse = -12;

                if (keys['KeyW'] || keys['ArrowUp']) {
                    csState.vehicleSpeed = Math.min(vehicleSpeed + boatAccel * delta, boatMaxSpeed);
                } else if (keys['KeyS'] || keys['ArrowDown']) {
                    csState.vehicleSpeed = Math.max(vehicleSpeed - boatAccel * delta, boatReverse);
                } else {
                    csState.vehicleSpeed = THREE.MathUtils.lerp(vehicleSpeed, 0, 1.8 * delta);
                }

                // Water steering
                const steerDir = (vehicleSpeed >= 0 ? 1 : -1);
                if (Math.abs(vehicleSpeed) > 0.3) {
                    if (keys['KeyA'] || keys['ArrowLeft']) {
                        currentVehicle.mesh.rotation.y += 2.0 * delta * steerDir;
                        currentVehicle.mesh.rotation.z = THREE.MathUtils.lerp(currentVehicle.mesh.rotation.z, 0.18, 5 * delta);
                    } else if (keys['KeyD'] || keys['ArrowRight']) {
                        currentVehicle.mesh.rotation.y -= 2.0 * delta * steerDir;
                        currentVehicle.mesh.rotation.z = THREE.MathUtils.lerp(currentVehicle.mesh.rotation.z, -0.18, 5 * delta);
                    } else {
                        currentVehicle.mesh.rotation.z = THREE.MathUtils.lerp(currentVehicle.mesh.rotation.z, 0, 5 * delta);
                    }
                } else {
                    currentVehicle.mesh.rotation.z = THREE.MathUtils.lerp(currentVehicle.mesh.rotation.z, 0, 5 * delta);
                }

                // Natural wave bobbing & bow lift on throttle (hydroplaning)
                const wavePitch = Math.sin(time * 3 + currentVehicle.mesh.position.z * 0.1) * 0.04 - (vehicleSpeed / boatMaxSpeed) * 0.12;
                currentVehicle.mesh.rotation.x = THREE.MathUtils.lerp(currentVehicle.mesh.rotation.x, wavePitch, 4 * delta);
                currentVehicle.mesh.position.y = (activeSeaConfig?.waterLevel || 0) + 0.1 + Math.sin(time * 2.8 + currentVehicle.mesh.position.x * 0.1) * 0.06;

                // Move forward in facing direction
                currentVehicle.mesh.translateZ(-vehicleSpeed * delta);
                currentVehicle.position = {
                    x: currentVehicle.mesh.position.x,
                    y: currentVehicle.mesh.position.y,
                    z: currentVehicle.mesh.position.z
                };

                humanCharacter.position.copy(currentVehicle.mesh.position);

                // 3rd Person Boat Camera Follow
                const camOffset = new THREE.Vector3(0, 3.8, 9.5);
                camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), currentVehicle.mesh.rotation.y);
                const targetCamPos = currentVehicle.mesh.position.clone().add(camOffset);
                camera.position.lerp(targetCamPos, 0.14);
                camera.lookAt(currentVehicle.mesh.position.x, currentVehicle.mesh.position.y + 1.0, currentVehicle.mesh.position.z);

                const speedEl = document.getElementById('vehicle-hud-speed');
                if (speedEl) {
                    speedEl.innerHTML = `🛥️ ${Math.round(Math.abs(vehicleSpeed) * 3.6)} km/h <span style="font-size: 0.8rem; color: #00f2fe; display: block;">Merel / On Water</span>`;
                }
            } else {
                // --- 🏎️ Drivable Car Physics & Controls ---
                const accel = 38;
                const maxForwardSpeed = 32;
                const maxReverseSpeed = -14;

                if (keys['KeyW'] || keys['ArrowUp']) {
                    csState.vehicleSpeed = Math.min(vehicleSpeed + accel * delta, maxForwardSpeed);
                } else if (keys['KeyS'] || keys['ArrowDown']) {
                    csState.vehicleSpeed = Math.max(vehicleSpeed - accel * delta, maxReverseSpeed);
                } else {
                    csState.vehicleSpeed = THREE.MathUtils.lerp(vehicleSpeed, 0, 2.5 * delta);
                }

                // Steer wheels and car rotation
                if (Math.abs(vehicleSpeed) > 0.2) {
                    const steerDir = (vehicleSpeed >= 0 ? 1 : -1);
                    if (keys['KeyA'] || keys['ArrowLeft']) {
                        currentVehicle.mesh.rotation.y += 2.4 * delta * steerDir;
                    }
                    if (keys['KeyD'] || keys['ArrowRight']) {
                        currentVehicle.mesh.rotation.y -= 2.4 * delta * steerDir;
                    }
                }

                // Move car forward in its facing direction
                currentVehicle.mesh.translateZ(-vehicleSpeed * delta);
                currentVehicle.position = {
                    x: currentVehicle.mesh.position.x,
                    y: currentVehicle.mesh.position.y,
                    z: currentVehicle.mesh.position.z
                };

                // Sync human position to car
                humanCharacter.position.copy(currentVehicle.mesh.position);

                // 3rd Person Vehicle Camera
                const camOffset = new THREE.Vector3(0, 4.2, 8.5);
                camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), currentVehicle.mesh.rotation.y);
                const targetCamPos = currentVehicle.mesh.position.clone().add(camOffset);
                camera.position.lerp(targetCamPos, 0.14);
                camera.lookAt(currentVehicle.mesh.position.x, currentVehicle.mesh.position.y + 1.2, currentVehicle.mesh.position.z);

                // Update Vehicle HUD Speed
                const speedEl = document.getElementById('vehicle-hud-speed');
                if (speedEl) {
                    speedEl.innerText = `${Math.round(Math.abs(vehicleSpeed) * 3.6)} km/h`;
                }
            }
        } else {
            // --- Human Character Movement & 3rd Person Camera ---
            const inWater = isPositionInWater(humanCharacter.position.x, humanCharacter.position.z);
            let currentSpeedMult = 1.0;
            if (playerSpeedBoostEndTime > Date.now()) {
                currentSpeedMult = playerSpeedMultiplier;
            }
            const moveSpeed = (inWater ? 6.5 : 9) * currentSpeedMult;

            // Turn view with A / D or ArrowLeft / ArrowRight
            const turnSpeed = 2.8;
            if (keys['KeyA'] || keys['ArrowLeft']) {
                csState.characterYaw += turnSpeed * delta;
            }
            if (keys['KeyD'] || keys['ArrowRight']) {
                csState.characterYaw -= turnSpeed * delta;
            }

            // Only W and S move the player! (W = forward in view direction, S = backward)
            let moveMagnitude = 0;
            if (keys['KeyW'] || keys['ArrowUp']) moveMagnitude += 1;
            if (keys['KeyS'] || keys['ArrowDown']) moveMagnitude -= 1;

            const forwardX = Math.sin(characterYaw);
            const forwardZ = Math.cos(characterYaw);
            const moveDir = new THREE.Vector3(forwardX * moveMagnitude, 0, forwardZ * moveMagnitude);

            if (inWater) {
                // Player in water: Swimming & 10m Diving mechanics
                csState.isGrounded = false;
                const waterLevel = activeSeaConfig?.waterLevel || 0;
                const waterSurfaceY = waterLevel - 0.4 + Math.sin(time * 3) * 0.08;
                const maxDiveDepth = -10.0; // Ujumine ja sukeldumine kuni ~10 meetrit vee alla!
                const maxSurfaceY = waterLevel + 0.2;

                const isAscending = !!(keys['Space'] || keys['KeyE']);
                const isDiving = !!(keys['ShiftLeft'] || keys['ShiftRight'] || keys['Shift'] || keys['KeyC'] || keys['KeyQ']);

                if (isDiving) {
                    // Diving down into the ocean (down to ~10m)
                    humanCharacter.position.y = Math.max(maxDiveDepth, humanCharacter.position.y - 4.0 * delta);
                } else if (isAscending) {
                    // Swimming up towards the surface
                    humanCharacter.position.y = Math.min(maxSurfaceY, humanCharacter.position.y + 4.0 * delta);
                } else {
                    // Neutral buoyancy / surface bobbing
                    if (humanCharacter.position.y >= -0.8) {
                        humanCharacter.position.y = THREE.MathUtils.lerp(humanCharacter.position.y, waterSurfaceY, 0.1);
                    } else {
                        // Submerged underwater: steady depth holding with slight gentle float
                        humanCharacter.position.y = Math.min(waterSurfaceY, humanCharacter.position.y + 0.12 * delta);
                    }
                }
                characterVelocity.y = 0;

                const hasHoriMove = moveMagnitude !== 0;
                if (hasHoriMove) {
                    humanCharacter.position.x += forwardX * moveMagnitude * moveSpeed * delta;
                    humanCharacter.position.z += forwardZ * moveMagnitude * moveSpeed * delta;
                }
                humanCharacter.rotation.y = THREE.MathUtils.lerp(humanCharacter.rotation.y, characterYaw, 0.25);

                // Realistic body rotation angle in water:
                // Diving: head tilted downward (~0.75 rad)
                // Ascending: head tilted upward (~0.12 rad)
                // Swimming forward: breaststroke/freestyle angle (~0.45 rad)
                // Idle: upright treading water (~0.08 rad)
                if (isDiving) {
                    humanCharacter.rotation.x = THREE.MathUtils.lerp(humanCharacter.rotation.x, 0.75, 0.15);
                } else if (isAscending) {
                    humanCharacter.rotation.x = THREE.MathUtils.lerp(humanCharacter.rotation.x, 0.12, 0.15);
                } else if (hasHoriMove) {
                    humanCharacter.rotation.x = THREE.MathUtils.lerp(humanCharacter.rotation.x, 0.45, 0.15);
                } else {
                    humanCharacter.rotation.x = THREE.MathUtils.lerp(humanCharacter.rotation.x, 0.08, 0.15);
                }

                if (emotesWidget && emotesWidget.getActiveEmote() !== 'idle') {
                    emotesWidget.stopEmoteQuietly();
                }
                if (playerAvatarRig) {
                    const isSwimming = hasHoriMove || isDiving || isAscending;
                    playerAvatarRig.updateAnimation(performance.now() * 0.001, isSwimming ? 'swim' : 'swim_idle');
                }

                // Underwater atmosphere & depth HUD
                const depthM = Math.max(0, -humanCharacter.position.y);
                const depthContainer = document.getElementById('hud-depth-container');
                const depthVal = document.getElementById('hud-depth-val');
                if (depthContainer && depthVal) {
                    depthContainer.style.display = 'flex';
                    if (depthM < 0.4) {
                        depthVal.innerText = 'Veepinnal';
                    } else {
                        depthVal.innerText = `${depthM.toFixed(1)} m / 10.0 m`;
                    }
                }

                // Underwater atmospheric fog effect
                if (scene.fog && (scene.fog as any).color) {
                    if (humanCharacter.position.y < -0.5) {
                        const depthRatio = Math.min(1.0, depthM / 10.0);
                        (scene.fog as any).color.setRGB(0.01 * (1 - depthRatio * 0.5), 0.15 * (1 - depthRatio * 0.4), 0.35 * (1 - depthRatio * 0.2));
                        (scene.fog as THREE.FogExp2).density = 0.012 + depthRatio * 0.02;
                    } else {
                        (scene.fog as any).color.setHex(0x74b9ff);
                        (scene.fog as THREE.FogExp2).density = 0.008;
                    }
                }

                // Asma (Astma / Breath) in Water
                if (humanCharacter.position.y < -0.4) {
                    csState.playerAsma = Math.max(0, playerAsma - 10 * delta);
                    if (playerAsma <= 0) {
                        damagePlayer(5 * delta, true);
                    }
                } else {
                    csState.playerAsma = Math.min(playerMaxAsma, playerAsma + 25 * delta);
                }
            } else {
                const depthContainer = document.getElementById('hud-depth-container');
                if (depthContainer) depthContainer.style.display = 'none';
                // On land: smoothly upright body
                humanCharacter.rotation.x = THREE.MathUtils.lerp(humanCharacter.rotation.x, 0, 0.2);
                const hasHoriMove = moveMagnitude !== 0;
                if (hasHoriMove) {
                    humanCharacter.position.x += forwardX * moveMagnitude * moveSpeed * delta;
                    humanCharacter.position.z += forwardZ * moveMagnitude * moveSpeed * delta;

                    if (emotesWidget && emotesWidget.getActiveEmote() !== 'idle') {
                        emotesWidget.stopEmoteQuietly();
                    }
                    if (playerAvatarRig) {
                        playerAvatarRig.updateAnimation(performance.now() * 0.001, 'run');
                    }
                } else {
                    if (playerAvatarRig) {
                        if (!isGrounded) {
                            playerAvatarRig.updateAnimation(performance.now() * 0.001, 'jump');
                        } else {
                            const activeEm = emotesWidget ? emotesWidget.getActiveEmote() : 'idle';
                            playerAvatarRig.updateAnimation(performance.now() * 0.001, activeEm);
                        }
                    }
                }
                humanCharacter.rotation.y = THREE.MathUtils.lerp(humanCharacter.rotation.y, characterYaw, 0.25);

                // Jump & Gravity on Land
                if (keys['Space'] && isGrounded) {
                    characterVelocity.y = 9;
                    csState.isGrounded = false;
                }

                if (!isGrounded) {
                    characterVelocity.y -= 22 * delta;
                    humanCharacter.position.y += characterVelocity.y * delta;
                    if (humanCharacter.position.y <= 0) {
                        humanCharacter.position.y = 0;
                        characterVelocity.y = 0;
                        csState.isGrounded = true;
                    }
                }

                // Asma on Land (Sprinting consumes, rest/walk regenerates)
                const isSprinting = !!(keys['ShiftLeft'] || keys['ShiftRight'] || keys['Shift']) && moveDir.lengthSq() > 0;
                if (isSprinting && playerAsma > 0) {
                    csState.playerAsma = Math.max(0, playerAsma - 14 * delta);
                } else {
                    csState.playerAsma = Math.min(playerMaxAsma, playerAsma + 25 * delta);
                }
            }

            // Placed Solid Objects Collision & Passable Handling (Water & Land)
            const pPos = humanCharacter.position;
            const halfW = 0.35;
            const playerHeight = 1.8;
            let supportedOnSurface = !inWater && (pPos.y <= 0.001);

            for (let i = 0; i < placedObjects.length; i++) {
                const p = placedObjects[i];
                // If passable is true, player walks/swims through freely!
                if (p.isPassable === true) continue;
                if (p.isCollected || p.isHeld || p.isSpawnPoint) continue;
                if (p.gameItemType === 'coin' || p.gameItemType === 'key' || p.gameItemType === 'potion') continue;
                if (p.trigger?.type === 'portal' || p.trigger?.type === 'checkpoint') continue;
                if (!p.mesh || p.mesh.visible === false) continue;

                // Fast distance cull: skip if too far away (> 20m)
                const dx = p.mesh.position.x - pPos.x;
                const dz = p.mesh.position.z - pPos.z;
                if (dx * dx + dz * dz > 400) continue;

                const pMeshBox = new THREE.Box3().setFromObject(p.mesh);
                if (pMeshBox.isEmpty()) continue;

                const playerBox = new THREE.Box3(
                    new THREE.Vector3(pPos.x - halfW, pPos.y, pPos.z - halfW),
                    new THREE.Vector3(pPos.x + halfW, pPos.y + playerHeight, pPos.z + halfW)
                );

                // Check if standing directly on top of platform
                const isHorizontallyOver = (
                    pPos.x >= pMeshBox.min.x - 0.15 &&
                    pPos.x <= pMeshBox.max.x + 0.15 &&
                    pPos.z >= pMeshBox.min.z - 0.15 &&
                    pPos.z <= pMeshBox.max.z + 0.15
                );

                if (isHorizontallyOver && Math.abs(pPos.y - pMeshBox.max.y) < 0.15 && characterVelocity.y <= 0) {
                    pPos.y = pMeshBox.max.y;
                    characterVelocity.y = 0;
                    supportedOnSurface = true;
                }

                if (playerBox.intersectsBox(pMeshBox)) {
                    const isAbovePlatform = (pPos.y - (characterVelocity.y * delta) >= pMeshBox.max.y - 0.4) || (pPos.y >= pMeshBox.max.y - 0.25);
                    const canStepUp = (pMeshBox.max.y - pPos.y <= 0.6) && (pMeshBox.max.y >= pPos.y - 0.05);

                    if ((isAbovePlatform && characterVelocity.y <= 0) || canStepUp) {
                        pPos.y = pMeshBox.max.y;
                        characterVelocity.y = 0;
                        supportedOnSurface = true;
                    } else {
                        // Side wall collision: resolve horizontal penetration so player cannot walk/swim through
                        const overlapX = Math.min(playerBox.max.x, pMeshBox.max.x) - Math.max(playerBox.min.x, pMeshBox.min.x);
                        const overlapZ = Math.min(playerBox.max.z, pMeshBox.max.z) - Math.max(playerBox.min.z, pMeshBox.min.z);

                        if (overlapX > 0.001 && overlapZ > 0.001) {
                            const pCenterX = (playerBox.min.x + playerBox.max.x) * 0.5;
                            const pCenterZ = (playerBox.min.z + playerBox.max.z) * 0.5;
                            const bCenterX = (pMeshBox.min.x + pMeshBox.max.x) * 0.5;
                            const bCenterZ = (pMeshBox.min.z + pMeshBox.max.z) * 0.5;

                            if (overlapX < overlapZ) {
                                if (pCenterX < bCenterX) {
                                    pPos.x -= (overlapX + 0.005);
                                } else {
                                    pPos.x += (overlapX + 0.005);
                                }
                            } else {
                                if (pCenterZ < bCenterZ) {
                                    pPos.z -= (overlapZ + 0.005);
                                } else {
                                    pPos.z += (overlapZ + 0.005);
                                }
                            }
                        }
                    }
                }
            }

            if (!inWater) {
                if (supportedOnSurface) {
                    csState.isGrounded = true;
                } else if (pPos.y > 0.05 && isGrounded) {
                    csState.isGrounded = false;
                }
            }

            // Update Asma HUD bar & text smoothly
            const asmaText = document.getElementById('player-asma-text');
            const asmaBar = document.getElementById('player-asma-bar');
            const asmaIcon = document.getElementById('hud-asma-icon');
            if (asmaText) asmaText.innerText = `${Math.max(0, Math.round(playerAsma))}/${playerMaxAsma}`;
            if (asmaBar) {
                const asmaPct = Math.max(0, Math.min(100, (playerAsma / playerMaxAsma) * 100));
                asmaBar.style.width = `${asmaPct}%`;
                if (asmaPct > 50) asmaBar.style.background = 'linear-gradient(90deg, #00cec9, #0984e3)';
                else if (asmaPct > 25) asmaBar.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
                else asmaBar.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
            }
            if (asmaIcon) {
                asmaIcon.innerText = playerAsma <= 20 ? '😮‍💨' : '🫁';
            }

            // 3rd Person Smooth Camera Follow
            const targetCamPos = new THREE.Vector3(
                humanCharacter.position.x - Math.sin(characterYaw) * 7,
                humanCharacter.position.y + 4,
                humanCharacter.position.z - Math.cos(characterYaw) * 7
            );
            camera.position.lerp(targetCamPos, 0.1);
            camera.lookAt(humanCharacter.position.x, humanCharacter.position.y + 1.6, humanCharacter.position.z);

            // Check nearby Drivable Vehicles (Cars, Trucks, Airplanes, Boats)
            csState.nearbyVehicle = null;
            let closestVehicleDist = Infinity;
            for (const p of placedObjects) {
                if (p.category === 'vehicles' || isAirplaneObject(p) || isBoatObject(p) || p.name.toLowerCase().includes('car') || p.name.toLowerCase().includes('truck') || p.name.toLowerCase().includes('buggy') || p.name.toLowerCase().includes('plane') || p.name.toLowerCase().includes('lennuk') || p.name.toLowerCase().includes('jet') || p.name.toLowerCase().includes('boat') || p.name.toLowerCase().includes('paat')) {
                    const dist = humanCharacter.position.distanceTo(new THREE.Vector3(p.position.x, humanCharacter.position.y, p.position.z));
                    if (dist < 5.2 && dist < closestVehicleDist) {
                        closestVehicleDist = dist;
                        csState.nearbyVehicle = p;
                    }
                }
            }

            const enterPrompt = document.getElementById('enter-vehicle-prompt');
            const enterIcon = document.getElementById('enter-vehicle-icon');
            const enterText = document.getElementById('enter-vehicle-text');

            if (enterPrompt) {
                enterPrompt.style.display = nearbyVehicle ? 'block' : 'none';
                if (nearbyVehicle) {
                    const isPlane = isAirplaneObject(nearbyVehicle);
                    const isBoat = isBoatObject(nearbyVehicle);
                    const isAdmin = isCurrentUserAdmin();
                    if (enterIcon) enterIcon.innerText = isPlane ? '✈️' : (isBoat ? '🛥️' : '🚗');
                    if (enterText) {
                        enterText.innerText = isPlane
                            ? (isAdmin ? 'Istu lennukisse ja lenda [F]' : 'Board Airplane and Fly [F]')
                            : (isBoat
                                ? (isAdmin ? 'Astu paati ja sõida merel [F]' : 'Board Boat and Cruise [F]')
                                : (isAdmin ? 'Istu autosse ja sõida [F]' : 'Enter Vehicle and Drive [F]'));
                    }
                }
            }
        }

        // Check General Triggers & Dialogue & Interactive Gameplay Items
        let activeTrigger: PlacedObject | null = null;
        const playerPos = humanCharacter.position;

        // Fall check (Falling off world / parkour)
        if (playerPos.y < -15) {
            damagePlayer(50);
            playerPos.copy(checkpointPosition);
            characterVelocity.set(0, 0, 0);
        }

        for (let i = placedObjects.length - 1; i >= 0; i--) {
            const p = placedObjects[i];
            const dist = playerPos.distanceTo(p.mesh.position);

            // 1. Enemy & Boss Patrol / Chase AI
            if (p.enemyData && p.enemyData.health > 0) {
                if (dist < 18) {
                    // Aggro & Chase player
                    const chaseDir = new THREE.Vector3().subVectors(playerPos, p.mesh.position).normalize();
                    p.mesh.position.x += chaseDir.x * p.enemyData.speed * delta;
                    p.mesh.position.z += chaseDir.z * p.enemyData.speed * delta;
                    p.mesh.rotation.y = Math.atan2(chaseDir.x, chaseDir.z);

                    // Attack player if within melee range
                    if (dist < 2.4) {
                        const now = Date.now();
                        const lastAttack = p.enemyData.lastAttackTime || 0;
                        if (now - lastAttack > 1500) {
                            p.enemyData.lastAttackTime = now;
                            damagePlayer(p.enemyData.damage || 15);
                        }
                    }
                }
            }

            // 2. Interactive Item Pickups (Coins, Keys, Potions, Weapons)
            if (p.gameItemType === 'coin' && !p.isCollected && dist < 2.0) {
                p.isCollected = true;
                collectCoin(10);
                scene.remove(p.mesh);
                placedObjects.splice(i, 1);
                continue;
            }

            if (p.gameItemType === 'key' && !p.isCollected && dist < 2.0) {
                p.isCollected = true;
                collectKey(p.keyName || p.name);
                scene.remove(p.mesh);
                placedObjects.splice(i, 1);
                continue;
            }

            if (p.gameItemType === 'potion' && !p.isCollected && dist < 2.0) {
                p.isCollected = true;
                healPlayer(40);
                scene.remove(p.mesh);
                placedObjects.splice(i, 1);
                continue;
            }

            if (p.gameItemType === 'weapon' && !p.isCollected && dist < 2.2) {
                p.isCollected = true;
                csState.playerAttackDamage += 25;
                playerInventory.push({ id: 'wpn_' + Date.now(), name: p.name, icon: '⚔️', type: 'weapon' });
                playGameSound('victory');
                updateGameplayHUD();
                scene.remove(p.mesh);
                placedObjects.splice(i, 1);
                continue;
            }

            // 2b. Custom Holdable Items (Ese: võta kätte või osta PBX eest, relvad teevad kahju)
            const isObjHoldable = p.isHoldable || p.customModelData?.isHoldable;
            const doesDealDamage = !!(p.dealsDamage || p.customModelData?.dealsDamage);
            const dmgAmount = p.damageAmount ?? p.customModelData?.damageAmount ?? 25;

            // Damage player if dangerous weapon/item touched
            if (doesDealDamage && dmgAmount > 0 && dist < 2.0) {
                damagePlayer(dmgAmount);
            }

            if (isObjHoldable && !p.isHeld && dist < 2.5) {
                const costsPbx = p.costsPbx || p.customModelData?.costsPbx;
                const pbxPrice = p.pbxPrice ?? p.customModelData?.pbxPrice ?? 0;

                if (costsPbx && pbxPrice > 0) {
                    activeTrigger = {
                        ...p,
                        trigger: {
                            type: 'touch',
                            title: `💎 ${p.name} (${pbxPrice} PBX)`,
                            message: `Vajuta [E] eseme ostmiseks: "${p.name}" (${pbxPrice} PBX)`
                        }
                    };
                    if (keys['KeyE']) {
                        keys['KeyE'] = false;
                        if (studioTestPlaybux >= pbxPrice) {
                            csState.studioTestPlaybux -= pbxPrice;
                            updateStudioTestPlaybuxDisplay();
                            p.isHeld = true;
                            p.mesh.visible = false;
                            equipCustomItemInHand(p);
                            playGameSound('victory');
                            showDialogMessage('💎 Ese Ostetud!', `Ostsid eseme "${p.name}" hinnaga ${pbxPrice} PBX (Test saldo: ${studioTestPlaybux.toLocaleString()} PBX)!`, '💎');
                        } else {
                            playGameSound('hit');
                            showDialogMessage('❌ Pole Piisavalt PBX!', `Eseme "${p.name}" ostmiseks on vaja ${pbxPrice} PBX, aga sul on hetkel ${studioTestPlaybux} PBX (Test saldo).`, '⚠️');
                        }
                    }
                } else {
                    activeTrigger = {
                        ...p,
                        trigger: {
                            type: 'touch',
                            title: `✋ ${p.name}`,
                            message: `Vajuta [E] eseme kätte võtmiseks: "${p.name}"`
                        }
                    };
                    if (keys['KeyE'] || dist < 1.4) {
                        if (keys['KeyE']) keys['KeyE'] = false;
                        p.isHeld = true;
                        p.mesh.visible = false;
                        equipCustomItemInHand(p);
                        playGameSound('coin');
                        showDialogMessage('✋ Ese Käes!', `Võtsid eseme "${p.name}" kätte!`, '✋');
                    }
                }
            }

            // 3. Locked Doors & Gates
            if (p.gameItemType === 'door' && !p.isUnlocked && dist < 3.2) {
                if (p.requiredKeyName === 'all_keys') {
                    if (activeQuest && activeQuest.completed) {
                        p.isUnlocked = true;
                        playGameSound('door_unlock');
                        p.mesh.position.y += 6; // Open gate upwards
                    } else {
                        activeTrigger = {
                            ...p,
                            trigger: { type: 'touch', message: 'Värav on lukus! Otsi üles kõik vajalikud võtmed!', title: '🔒 Lukustatud Värav' }
                        };
                    }
                } else if (p.requiredKeyName) {
                    if (playerInventory.some(item => item.name === p.requiredKeyName)) {
                        p.isUnlocked = true;
                        playGameSound('door_unlock');
                        p.mesh.position.y += 6;
                    } else {
                        activeTrigger = {
                            ...p,
                            trigger: { type: 'touch', message: `Uks on lukus! Vajad võtit: ${p.requiredKeyName}`, title: '🔒 Lukustatud Uks' }
                        };
                    }
                }
            }

            // 4. Hazards (Lava floor, spikes)
            if ((p.gameItemType === 'hazard' || p.trigger?.type === 'hazard_lava') && isPlayerTouchingOrOnTop(playerPos, p)) {
                damagePlayer(25);
            }

            // 5. Checkpoints
            if (p.gameItemType === 'checkpoint' && dist < 3.0) {
                if (checkpointPosition.distanceTo(p.mesh.position) > 2.0) {
                    checkpointPosition.copy(p.mesh.position);
                    checkpointPosition.y = 0;
                    playGameSound('coin');
                }
            }

            // 6. Victory Goal / Portal
            if ((p.gameItemType === 'goal' || p.trigger?.type === 'goal_win') && (isPlayerTouchingOrOnTop(playerPos, p) || dist < 2.0)) {
                triggerVictory('🏆 PALJU ÕNNE! VÕIT!', 'Jõudsid edukalt finišisse ja läbisid mängumaailma!');
            }

            // 7. Shop NPC Interaction
            if (p.gameItemType === 'shop' && dist < 4.0) {
                activeTrigger = {
                    ...p,
                    trigger: { type: 'proximity', message: 'Tere rändur! Vajuta [E] või klõpsa relvapoe avamiseks!', title: '🛒 Kaupmees' }
                };
                if (keys['KeyE']) {
                    openInGameShop();
                }
            }

            // 8. Custom Script Triggers
            if (p.script && p.script.enabled !== false) {
                if (p.script.trigger === 'onStart' && !p.script.lastTriggered) {
                    executeObjectScript(p, playerPos, 'onStart');
                } else if (p.script.trigger === 'onTimer') {
                    const timerIntervalMs = (p.script.timerInterval ?? p.script.cooldown ?? 3) * 1000;
                    if (Date.now() - (p.script.lastTriggered || 0) >= timerIntervalMs) {
                        executeObjectScript(p, playerPos, 'onTimer');
                    }
                } else if (p.script.trigger === 'onPlayerTouch') {
                    if (isPlayerTouchingOrOnTop(playerPos, p)) {
                        executeObjectScript(p, playerPos, 'onPlayerTouch');
                    }
                } else if (p.script.trigger === 'onInteract') {
                    const interactRad = p.trigger?.radius || 3.8;
                    if (dist <= interactRad) {
                        if (!activeTrigger) {
                            activeTrigger = {
                                ...p,
                                trigger: {
                                    type: 'proximity',
                                    message: 'Vajuta [E] suhtlemiseks / käivitamiseks',
                                    title: p.name
                                }
                            };
                        }
                        if (keys['KeyE']) {
                            executeObjectScript(p, playerPos, 'onInteract');
                        }
                    }
                }
            }

            // Standard Dialogue / Walkthrough Triggers
            if (p.trigger && p.trigger.message && !activeTrigger) {
                const rad = p.trigger.radius || 4.2;
                if (dist <= rad) {
                    activeTrigger = p;
                }
            }
        }

        const dialogPopup = document.getElementById('game-dialog-popup');
        const dialogTitle = document.getElementById('game-dialog-title');
        const dialogText = document.getElementById('game-dialog-text');
        const dialogIcon = document.getElementById('game-dialog-icon');

        if (activeTrigger && dialogPopup && dialogTitle && dialogText && dialogIcon) {
            const isTree = activeTrigger.name.toLowerCase().includes('tree') || activeTrigger.name.toLowerCase().includes('puu') || activeTrigger.category === 'nature';
            dialogIcon.innerText = isTree ? '🌲' : (activeTrigger.gameItemType === 'shop' ? '🛒' : (activeTrigger.category === 'gameplay' ? '💎' : '💬'));
            dialogTitle.innerText = activeTrigger.trigger?.title || activeTrigger.name;
            dialogText.innerText = `"${activeTrigger.trigger?.message}"`;
            dialogPopup.style.display = 'block';
        } else if (dialogPopup && dialogPopup.style.display !== 'none') {
            dialogPopup.style.display = 'none';
        }
    } else {
        if (currentVehicle) exitVehicle();
        const enterPrompt = document.getElementById('enter-vehicle-prompt');
        if (enterPrompt) enterPrompt.style.display = 'none';
        const dialogPopup = document.getElementById('game-dialog-popup');
        if (dialogPopup && dialogPopup.style.display !== 'none') {
            dialogPopup.style.display = 'none';
        }
        // Edit Mode: Smooth Camera Pan with Arrow Keys and WASD
        const panSpeed = 16;
        const panDir = new THREE.Vector3();
        const camForward = new THREE.Vector3(-Math.sin(orbitTheta), 0, -Math.cos(orbitTheta)).normalize();
        const camRight = new THREE.Vector3(Math.cos(orbitTheta), 0, -Math.sin(orbitTheta)).normalize();

        if (keys['ArrowUp'] || keys['KeyW']) panDir.add(camForward);
        if (keys['ArrowDown'] || keys['KeyS']) panDir.sub(camForward);
        if (keys['ArrowLeft'] || keys['KeyA']) panDir.sub(camRight);
        if (keys['ArrowRight'] || keys['KeyD']) panDir.add(camRight);

        if (panDir.lengthSq() > 0) {
            panDir.normalize();
            orbitTarget.addScaledVector(panDir, panSpeed * delta);
            updateOrbitCamera();
        }

        // Idle animation in edit mode
        if (playerAvatarRig) {
            const inWater = isPositionInWater(humanCharacter.position.x, humanCharacter.position.z);
            if (inWater) {
                humanCharacter.rotation.x = THREE.MathUtils.lerp(humanCharacter.rotation.x, 0.1, 0.15);
                const waterLevel = activeSeaConfig?.waterLevel || 0;
                if (humanCharacter.position.y > -0.8) {
                    humanCharacter.position.y = waterLevel - 0.4 + Math.sin(time * 3) * 0.08;
                }
                playerAvatarRig.updateAnimation(performance.now() * 0.001, 'swim_idle');
            } else {
                humanCharacter.rotation.x = THREE.MathUtils.lerp(humanCharacter.rotation.x, 0, 0.2);
                const activeEm = emotesWidget ? emotesWidget.getActiveEmote() : 'idle';
                playerAvatarRig.updateAnimation(performance.now() * 0.001, activeEm);
            }
        } else if (humanCharacter) {
            humanCharacter.position.y = Math.sin(Date.now() * 0.003) * 0.04;
        }
    }

    renderer.render(scene, camera);
}