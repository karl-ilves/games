function updateWorld() {
    let strobeFlash = (Date.now() % 2000) < 100; // Flash for 100ms every 2 seconds
    planeGroup.children.forEach(c => {
        if (c.userData && c.userData.isStrobe) {
            c.visible = strobeFlash;
        }
    });

    if (gameState === 'crashed' && crashResponseState === 'firefighting' && grassFires.length === 0 && (!explosion || explosionMat.opacity <= 0)) {
        crashResponseState = 'investigating';
        if (typeof stopSirenSound === 'function') stopSirenSound();
        
        let invCount = Math.max(1, Math.floor(2 * CRASH_SCALE));
        for (let i = 0; i < invCount; i++) {
            // White shirt, black pants, no hat
            let invGroup = createHumanoid(0xffffff, 0x111111, null, false);
            let angle = Math.random() * Math.PI * 2;
            invGroup.position.set(
                planeGroup.position.x + Math.cos(angle) * 300,
                0,
                planeGroup.position.z + Math.sin(angle) * 300
            );
            scene.add(invGroup);
            investigators.push({
                mesh: invGroup,
                leftLeg: invGroup.userData.leftLeg,
                rightLeg: invGroup.userData.rightLeg,
                leftArm: invGroup.userData.leftArm,
                rightArm: invGroup.userData.rightArm,
                legTime: Math.random() * 10,
                speed: 0.2 + Math.random() * 0.1,
                targetDebris: debrisPieces.length > 0 ? debrisPieces[Math.floor(Math.random() * debrisPieces.length)] : { mesh: planeGroup }
            });
        }
    }
    
    // Animate grass fires
    if (grassFires.length > 0) {
        grassFires.forEach(fire => {
            let s = (1.0 + Math.random() * 0.5);
            
            // Randomly animate scale to simulate flickering
            if (!fire.userData.baseScaleX) fire.userData.baseScaleX = fire.scale.x;
            if (!fire.userData.baseScaleY) fire.userData.baseScaleY = fire.scale.y;
            fire.scale.set(fire.userData.baseScaleX * s, fire.userData.baseScaleY * s, 1);
            
            // Move upwards and fade
            fire.userData.life = (fire.userData.life || 0) + 0.05;
            
            if (fire.userData.isBuildingFire) {
                fire.userData.offsetY += fire.userData.speed;
                if (fire.userData.offsetY > fire.userData.height + 20) {
                    fire.userData.offsetY = 0;
                }
                fire.position.y = fire.userData.basey + fire.userData.offsetY;
                fire.material.opacity = 1.0 - (fire.userData.offsetY / (fire.userData.height + 20));
            } else if (fire.userData.attachedDebris) {
                let d = fire.userData.attachedDebris;
                fire.position.copy(d.mesh.position);
                fire.position.x += fire.userData.offsetX || 0;
                fire.position.z += fire.userData.offsetZ || 0;
                fire.position.y += Math.max(0.5, (fire.userData.offsetY || 0)); 
            }
        });
        
        if (grassFires.length < 600 * CRASH_SCALE && Math.random() < 0.2) {
            let sourceFire = grassFires[Math.floor(Math.random() * grassFires.length)];
            let newFire = new THREE.Sprite(globalFireMat.clone());
            newFire.scale.set(6, 12, 1);
            
            let offsetX = (Math.random() - 0.5) * 5;
            let offsetZ = (Math.random() - 0.5) * 5;
            
            if (sourceFire.userData.isBuildingFire) {
                newFire.userData.isBuildingFire = true;
                newFire.userData.basey = sourceFire.userData.basey;
                newFire.userData.offsetY = sourceFire.userData.offsetY - 5;
                newFire.userData.height = sourceFire.userData.height;
                newFire.userData.speed = sourceFire.userData.speed;
                newFire.position.set(
                    sourceFire.position.x + (Math.random() - 0.5) * 10,
                    newFire.userData.basey + newFire.userData.offsetY,
                    sourceFire.position.z + (Math.random() - 0.5) * 10
                );
            } else if (sourceFire.userData.attachedDebris) {
                newFire.userData.attachedDebris = sourceFire.userData.attachedDebris;
                newFire.userData.offsetX = (sourceFire.userData.offsetX || 0) + offsetX;
                newFire.userData.offsetZ = (sourceFire.userData.offsetZ || 0) + offsetZ;
                newFire.userData.offsetY = Math.random() * 3;
            } else {
                newFire.position.set(
                    sourceFire.position.x + offsetX,
                    0.5,
                    sourceFire.position.z + offsetZ
                );
            }
            
            scene.add(newFire);
            grassFires.push(newFire);
        }
    }

    // Update AI Planes
    aiPlanes.forEach(p => {
        let forward = new THREE.Vector3(0, 0, -1).applyQuaternion(p.mesh.quaternion);
        p.mesh.position.add(forward.multiplyScalar(p.speed));
        
        if (p.mesh.position.x > 12000) p.mesh.position.x = -12000;
        if (p.mesh.position.x < -12000) p.mesh.position.x = 12000;
        if (p.mesh.position.z > 12000) p.mesh.position.z = -12000;
        if (p.mesh.position.z < -12000) p.mesh.position.z = 12000;
    });
    
    // Update Firefighters
    if (firefighters.length > 0) {
        for (let i = firefighters.length - 1; i >= 0; i--) {
            let ff = firefighters[i];
            
            if (crashResponseState === 'investigating') {
                ff.waterJet.visible = false;
                ff.rightArm.rotation.x = 0;
                
                if (!ff.isLeaving) {
                    let moveDir = new THREE.Vector3();
                    ff.mesh.getWorldDirection(moveDir);
                    ff.mesh.lookAt(ff.mesh.position.x + moveDir.x * 100, ff.mesh.position.y, ff.mesh.position.z + moveDir.z * 100);
                    ff.isLeaving = true;
                }
                
                let moveDir = new THREE.Vector3();
                ff.mesh.getWorldDirection(moveDir);
                ff.mesh.position.add(moveDir.multiplyScalar(0.2));
                
                ff.legTime += 0.2;
                ff.leftLeg.rotation.x = Math.sin(ff.legTime) * 0.5;
                ff.rightLeg.rotation.x = -Math.sin(ff.legTime) * 0.5;
                ff.leftArm.rotation.x = -Math.sin(ff.legTime) * 0.5;
                ff.rightArm.rotation.x = Math.sin(ff.legTime) * 0.5;
                
                if (ff.mesh.position.distanceToSquared(planeGroup.position) > 250000) { // far away
                    scene.remove(ff.mesh);
                    firefighters.splice(i, 1);
                }
            } else if (grassFires.length > 0) {
                let closestFire = null;
                let closestDist = Infinity;
                for (let f of grassFires) {
                    let d = ff.mesh.position.distanceToSquared(f.position);
                    if (d < closestDist) {
                        closestDist = d;
                        closestFire = f;
                    }
                }
                
                if (closestFire) {
                    if (closestDist > 100) {
                        ff.mesh.lookAt(closestFire.position.x, ff.mesh.position.y, closestFire.position.z);
                        let moveDir = new THREE.Vector3();
                        ff.mesh.getWorldDirection(moveDir);
                        ff.mesh.position.add(moveDir.multiplyScalar(0.2));
                        
                        ff.legTime += 0.2;
                        ff.leftLeg.rotation.x = Math.sin(ff.legTime) * 0.5;
                        ff.rightLeg.rotation.x = -Math.sin(ff.legTime) * 0.5;
                        ff.leftArm.rotation.x = -Math.sin(ff.legTime) * 0.5;
                        ff.rightArm.rotation.x = Math.sin(ff.legTime) * 0.2;
                        ff.waterJet.visible = false;
                    } else {
                        ff.leftLeg.rotation.x = 0;
                        ff.rightLeg.rotation.x = 0;
                        ff.leftArm.rotation.x = 0;
                        ff.rightArm.rotation.x = -Math.PI / 4; 
                        ff.mesh.lookAt(closestFire.position.x, ff.mesh.position.y, closestFire.position.z);
                        
                        ff.waterJet.visible = true;
                        let dist = Math.sqrt(closestDist);
                        ff.waterJet.scale.set(1, dist, 1);
                        ff.waterJet.position.set(0, -0.4, dist / 2 + 0.5); 
                    }
                } else {
                    ff.waterJet.visible = false;
                    ff.rightArm.rotation.x = 0;
                    ff.leftLeg.rotation.x = 0;
                    ff.rightLeg.rotation.x = 0;
                    ff.leftArm.rotation.x = 0;
                }
            } else {
                ff.waterJet.visible = false;
                ff.rightArm.rotation.x = 0;
                ff.leftLeg.rotation.x = 0;
                ff.rightLeg.rotation.x = 0;
                ff.leftArm.rotation.x = 0;
            }
        }
    }
    
    // Update Firetrucks
    if (firetrucks.length > 0) {
        for (let i = firetrucks.length - 1; i >= 0; i--) {
            let t = firetrucks[i];
            t.timer++;
            
            if (crashResponseState === 'investigating') {
                t.cannon.visible = false;
                t.light.material.color.setHex(0xaaaaaa); // Turn off lights (grey)
                
                if (!t.isLeaving) {
                    let moveDir = new THREE.Vector3();
                    t.mesh.getWorldDirection(moveDir);
                    t.mesh.lookAt(t.mesh.position.x + moveDir.x * 100 + (Math.random()-0.5)*50, t.mesh.position.y, t.mesh.position.z + moveDir.z * 100 + (Math.random()-0.5)*50);
                    t.isLeaving = true;
                }
                
                let moveDir = new THREE.Vector3();
                t.mesh.getWorldDirection(moveDir);
                t.mesh.position.add(moveDir.multiplyScalar(1.8));
                t.wheels.forEach(w => w.rotation.x -= 0.45);
                
                if (t.mesh.position.distanceToSquared(planeGroup.position) > 4000000) {
                    scene.remove(t.mesh);
                    firetrucks.splice(i, 1);
                }
            } else if (t.isAmbulance) {
                // Ambulance logic
                t.sirenMat.color.setHex((Math.floor(t.timer / 10) % 2 === 0) ? 0x3498db : 0xe74c3c);
                
                if (t.state === 'driving_to_crash') {
                    let targetPos = t.targetPatient ? t.targetPatient.mesh.position.clone() : playerMesh.position.clone();
                    targetPos.y = t.mesh.position.y;
                    let distSq = t.mesh.position.distanceToSquared(targetPos);
                    
                    if (distSq > 400) {
                        let dir = new THREE.Vector3().subVectors(targetPos, t.mesh.position).normalize();
                        let lookPos = new THREE.Vector3().subVectors(t.mesh.position, dir);
                        t.mesh.lookAt(lookPos);
                        
                        let moveDir = new THREE.Vector3();
                        t.mesh.getWorldDirection(moveDir);
                        t.mesh.position.sub(moveDir.clone().multiplyScalar(2.0));
                        t.wheels.forEach(w => w.rotation.x += 0.5);
                    } else {
                        t.state = 'picking_up';
                        t.timer = 0;
                    }
                } else if (t.state === 'picking_up') {
                    if (t.timer === 1) {
                        t.p1 = t.mesh.userData.p1;
                        t.p2 = t.mesh.userData.p2;
                        t.stretcher = t.mesh.userData.stretcher;
                        t.p1.visible = true;
                        t.p2.visible = true;
                        t.stretcher.visible = true;
                        
                        let targetMesh = t.targetPatient ? t.targetPatient.mesh : playerMesh;
                        t.playerLocal = targetMesh.position.clone();
                        t.mesh.worldToLocal(t.playerLocal);
                        t.playerOnStretcher = false;
                    }
                    
                    if (t.timer > 0 && t.timer <= 200) {
                        let phase = t.timer / 200; // 0 to 1
                        let progress = 0;
                        if (phase < 0.5) {
                            progress = phase / 0.5;
                            t.stretcher.position.lerpVectors(new THREE.Vector3(0, 0, 5), t.playerLocal, progress);
                        } else {
                            progress = (phase - 0.5) / 0.5;
                            t.stretcher.position.lerpVectors(t.playerLocal, new THREE.Vector3(0, 0, 5), progress);
                            if (!t.playerOnStretcher) {
                                t.playerOnStretcher = true;
                                let targetMesh = t.targetPatient ? t.targetPatient.mesh : playerMesh;
                                targetMesh.visible = false; 
                                let dummyPlayer = targetMesh.clone();
                                dummyPlayer.position.set(0, 0.7, 0);
                                dummyPlayer.rotation.x = -Math.PI / 2; 
                                t.stretcher.add(dummyPlayer);
                                if (t.targetPatient) t.targetPatient.rescued = true;
                            }
                        }
                        
                        t.p1.position.copy(t.stretcher.position).add(new THREE.Vector3(-1, 0, -1.2));
                        t.p2.position.copy(t.stretcher.position).add(new THREE.Vector3(1, 0, 1.2));
                        
                        let walkTime = t.timer * 0.2;
                        let swing = Math.sin(walkTime) * 0.5;
                        t.p1.userData.leftLeg.rotation.x = swing;
                        t.p1.userData.rightLeg.rotation.x = -swing;
                        t.p2.userData.leftLeg.rotation.x = -swing;
                        t.p2.userData.rightLeg.rotation.x = swing;
                    }
                    
                    let moveDir = new THREE.Vector3();
                    t.mesh.getWorldDirection(moveDir);
                    
                    if (t.timer > 200) {
                        t.p1.visible = false;
                        t.p2.visible = false;
                        t.stretcher.visible = false;
                        t.state = 'driving_to_hospital';
                        
                        let targetPos = hospitalBuilding ? hospitalBuilding.position.clone() : new THREE.Vector3(500, 0, -500);
                        t.waypoints = getHospitalWaypoints(t.mesh.position, targetPos);
                        
                        const msg = document.getElementById('message');
                        msg.innerText = "Ambulance is taking you to the hospital...";
                        msg.style.color = '#3498db';
                    }
                } else if (t.state === 'driving_to_hospital') {
                    
                    let targetPos = t.waypoints[0];
                    targetPos.y = t.mesh.position.y;
                    let distSq = t.mesh.position.distanceToSquared(targetPos);
                    
                    if (distSq > 400) {
                        let dir = new THREE.Vector3().subVectors(targetPos, t.mesh.position).normalize();
                        let lookPos = new THREE.Vector3().subVectors(t.mesh.position, dir);
                        t.mesh.lookAt(lookPos);
                        let moveDir = new THREE.Vector3();
                        t.mesh.getWorldDirection(moveDir);
                        t.mesh.position.sub(moveDir.clone().multiplyScalar(2.0));
                        t.wheels.forEach(w => w.rotation.x += 0.5);
                    } else {
                        t.waypoints.shift();
                        if (t.waypoints.length === 0) {
                            if (t.state !== 'arrived') {
                                t.state = 'arrived';
                                
                                if (t.isPlayerAmbulance) {
                                    const msg = document.getElementById('message');
                                    msg.innerText = "Arrived at the hospital alive! Treatment successful.";
                                    msg.style.color = '#2ecc71';
                                    document.getElementById('restart-btn').style.display = 'block';
                                    document.getElementById('skip-amb-btn').style.display = 'none';
                                    
                                    // Heal player and allow walking
                                    crashResponseState = 'healed';
                                    playerMesh.position.copy(hospitalBuilding.position);
                                    playerMesh.position.y = 0.9;
                                    playerMesh.position.z += 60; // Stand in front of hospital
                                    playerMesh.rotation.x = 0; // Stand up
                                    playerMesh.visible = true;
                                    
                                    passengerMeshes.forEach(p => scene.remove(p.mesh));
                                } else {
                                    scene.remove(t.mesh);
                                    let idx = firetrucks.indexOf(t);
                                    if (idx > -1) firetrucks.splice(idx, 1);
                                    i--; // Adjust loop counter
                                }
                            }
                        }
                    }
                }
            } else {
                t.light.material.color.setHex((Math.floor(t.timer / 10) % 2 === 0) ? 0x3498db : 0xffffff);
                
                let closestFire = null;
                let closestDist = Infinity;
                for (let f of grassFires) {
                    let d = t.mesh.position.distanceToSquared(f.position);
                    if (d < closestDist) {
                        closestDist = d;
                        closestFire = f;
                    }
                }
                if (closestFire) {
                    if (closestDist > 2500) { 
                        t.mesh.lookAt(closestFire.position.x, t.mesh.position.y, closestFire.position.z);
                        let moveDir = new THREE.Vector3();
                        t.mesh.getWorldDirection(moveDir);
                        t.mesh.position.add(moveDir.multiplyScalar(1.8)); 
                        
                        t.wheels.forEach(w => w.rotation.x -= 0.45);
                        t.cannon.visible = false;
                    } else {
                        t.mesh.lookAt(closestFire.position.x, t.mesh.position.y, closestFire.position.z);
                        t.cannon.visible = true;
                        let dist = Math.sqrt(closestDist);
                        t.cannon.scale.set(1, dist, 1);
                        t.cannon.position.set(0, 6, dist/2 + 2);
                        
                        t.extinguishTimer = (t.extinguishTimer || 0) + 1;
                        if (t.extinguishTimer > 40) { 
                            let idx = grassFires.indexOf(closestFire);
                            if (idx > -1) {
                                scene.remove(closestFire);
                                grassFires.splice(idx, 1);
                            }
                            t.extinguishTimer = 0;
                            t.cannon.visible = false;
                        }
                    }
                } else {
                    t.cannon.visible = false;
                }
            }
            
            // Resolve collisions for firetruck/ambulance
            if (t.state !== 'picking_up' && t.state !== 'arrived' && t.mesh) {
                resolveBuildingCollision(t.mesh.position, 6);
                resolveVehicleCollision(t.mesh.position, 6, [t]);
            }
        }
        }
    }
    
    // Update Investigators
    if (investigators.length > 0) {
        investigators.forEach(inv => {
            if (inv.targetDebris) {
                let d = inv.targetDebris.mesh.position.distanceToSquared(inv.mesh.position);
                if (d > 200) {
                    inv.mesh.lookAt(inv.targetDebris.mesh.position.x, inv.mesh.position.y, inv.targetDebris.mesh.position.z);
                    let moveDir = new THREE.Vector3();
                    inv.mesh.getWorldDirection(moveDir);
                    inv.mesh.position.add(moveDir.multiplyScalar(inv.speed));
                    
                    inv.legTime += inv.speed * 2;
                    inv.leftLeg.rotation.x = Math.sin(inv.legTime) * 0.5;
                    inv.rightLeg.rotation.x = -Math.sin(inv.legTime) * 0.5;
                    inv.leftArm.rotation.x = -Math.sin(inv.legTime) * 0.5;
                    inv.rightArm.rotation.x = Math.sin(inv.legTime) * 0.5;
                } else {
                    inv.leftLeg.rotation.x = 0;
                    inv.rightLeg.rotation.x = 0;
                    inv.leftArm.rotation.x = 0;
                    
                    inv.mesh.rotation.y += (Math.random() - 0.5) * 0.1;
                    
                    if (Math.random() < 0.02) {
                        inv.rightArm.rotation.x = -Math.PI / 2; // point
                    } else if (Math.random() < 0.05) {
                        inv.rightArm.rotation.x = 0;
                    }
                }
            }
        });
    }

    
    // Update Police Cars
    for (let i = policeCars.length - 1; i >= 0; i--) {
        let pc = policeCars[i];
        pc.timer++;
        
        // Flash sirens
        pc.sirenL.color.setHex((Math.floor(pc.timer / 8) % 2 === 0) ? 0x3498db : 0x111111);
        pc.sirenR.color.setHex((Math.floor(pc.timer / 8) % 2 !== 0) ? 0xe74c3c : 0x111111);
        
        if (pc.state === 'driving') {
            let distSq = pc.mesh.position.distanceToSquared(pc.targetPos);
            if (distSq > 100) {
                let dir = new THREE.Vector3().subVectors(pc.targetPos, pc.mesh.position).normalize();
                let lookPos = new THREE.Vector3().subVectors(pc.mesh.position, dir);
                pc.mesh.lookAt(lookPos);
                
                let moveDir = new THREE.Vector3();
                pc.mesh.getWorldDirection(moveDir);
                pc.mesh.position.sub(moveDir.clone().multiplyScalar(pc.speed));
                pc.wheels.forEach(w => w.rotation.x += pc.speed * 0.25);
                
                // Collision check against buildings and other emergency vehicles
                resolveBuildingCollision(pc.mesh.position, 4);
                let allVehicles = [...firetrucks, ...policeCars];
                resolveVehicleCollision(pc.mesh.position, 4, [pc]);
            } else {
                pc.state = 'parked';
                // Turn slightly inwards to look cool
                pc.mesh.rotation.y += Math.PI / 4;
            }
        }
    }

    // Update Civilian Cars
    civCars.forEach(c => {
        if (!c.mesh.visible) return;
        let fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(c.mesh.quaternion);
        c.mesh.position.add(fwd.multiplyScalar(c.speed));
        
        if (gameState === 'crashed') {
            let distSq = c.mesh.position.distanceToSquared(planeGroup.position);
            if (distSq < 22500) { // 150 radius (inside perimeter)
                c.mesh.rotation.y += Math.PI; // Turn around 180 degrees
                c.mesh.position.add(fwd.clone().multiplyScalar(-c.speed * 2));
            }
        }
        
        c.wheels.forEach(w => w.rotation.x -= c.speed * 0.15);
        
        if (c.mesh.position.x > 10800) c.mesh.position.x = -10800;
        if (c.mesh.position.x < -10800) c.mesh.position.x = 10800;
        if (c.mesh.position.z > 10800) c.mesh.position.z = -10800;
        if (c.mesh.position.z < -10800) c.mesh.position.z = 10800;
    });
    
    // Update Pedestrians
    pedestrians.forEach(ped => {
        let moveDir = new THREE.Vector3();
        ped.mesh.getWorldDirection(moveDir);
        let currentSpeed = ped.speed;
        
        ped.mesh.position.add(moveDir.multiplyScalar(currentSpeed));
        if (gameState === 'crashed') {
            let distSq = ped.mesh.position.distanceToSquared(planeGroup.position);
            if (distSq < 22500) { // 150 radius (inside perimeter)
                ped.mesh.rotation.y += Math.PI; // Turn around 180 degrees
                ped.mesh.position.add(moveDir.clone().multiplyScalar(-currentSpeed * 2));
            }
        }
        
        ped.legTime += currentSpeed * 2;
        ped.leftLeg.rotation.x = Math.sin(ped.legTime) * 0.5;
        ped.rightLeg.rotation.x = -Math.sin(ped.legTime) * 0.5;
        ped.leftArm.rotation.x = -Math.sin(ped.legTime) * 0.5;
        ped.rightArm.rotation.x = Math.sin(ped.legTime) * 0.5;
        
        if (Math.random() < 0.005) {
            ped.mesh.rotation.y += Math.PI / 2;
        }
        if (ped.mesh.position.x > 10800) ped.mesh.position.x = -10800;
        if (ped.mesh.position.x < -10800) ped.mesh.position.x = 10800;
        if (ped.mesh.position.z > 10800) ped.mesh.position.z = -10800;
        if (ped.mesh.position.z < -10800) ped.mesh.position.z = 10800;
    });
}
