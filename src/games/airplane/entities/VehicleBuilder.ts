import * as THREE from 'three';
import { createHumanoid } from './PedestrianBuilder';

export const VehicleBuilder = {
createFirePlane(crashScale = 1.0) {
    let group = new THREE.Group();
    let yellowMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.3, metalness: 0.1 });
    let redMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.3, metalness: 0.1 });
    let whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1 });
    let glassMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.8 });
    
    let fuselageGeo = new THREE.CylinderGeometry(2, 2.5, 20, 16);
    fuselageGeo.rotateZ(Math.PI / 2);
    let fuselage = new THREE.Mesh(fuselageGeo, yellowMat);
    fuselage.position.y = 2;
    group.add(fuselage);
    
    let bellyGeo = new THREE.BoxGeometry(15, 1, 4);
    let belly = new THREE.Mesh(bellyGeo, redMat);
    belly.position.set(0, 0.5, 0);
    group.add(belly);
    
    let cockpitGeo = new THREE.BoxGeometry(3, 1.5, 3.5);
    let cockpit = new THREE.Mesh(cockpitGeo, glassMat);
    cockpit.position.set(-6, 3.8, 0);
    group.add(cockpit);
    
    let wingGeo = new THREE.BoxGeometry(6, 0.4, 30);
    let wings = new THREE.Mesh(wingGeo, redMat);
    wings.position.set(-2, 4.2, 0);
    group.add(wings);
    
    let tailGeo = new THREE.BoxGeometry(4, 0.4, 12);
    let tail = new THREE.Mesh(tailGeo, redMat);
    tail.position.set(8, 2.2, 0);
    group.add(tail);
    
    let vTailGeo = new THREE.BoxGeometry(3, 5, 0.4);
    let vTail = new THREE.Mesh(vTailGeo, yellowMat);
    vTail.position.set(8, 4.5, 0);
    group.add(vTail);
    
    let engGeo = new THREE.CylinderGeometry(1, 1, 4, 12);
    engGeo.rotateZ(Math.PI / 2);
    let eng1 = new THREE.Mesh(engGeo, whiteMat);
    eng1.position.set(-2, 3.5, 6);
    group.add(eng1);
    
    let eng2 = new THREE.Mesh(engGeo, whiteMat);
    eng2.position.set(-2, 3.5, -6);
    group.add(eng2);
    
    let propGeo = new THREE.BoxGeometry(0.2, 3.5, 0.4);
    let propMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    let prop1 = new THREE.Mesh(propGeo, propMat);
    prop1.position.set(-4.2, 3.5, 6);
    group.add(prop1);
    
    let prop2 = new THREE.Mesh(propGeo, propMat);
    prop2.position.set(-4.2, 3.5, -6);
    group.add(prop2);
    
    let outerGroup = new THREE.Group();
    group.rotation.y = Math.PI / 2;
    outerGroup.add(group);
    outerGroup.scale.set(crashScale, crashScale, crashScale);
    
    return { mesh: outerGroup, props: [prop1, prop2] };
},

createLifeRaft() {
    let group = new THREE.Group();
    let orangeMat = new THREE.MeshLambertMaterial({ color: 0xff6600 });
    let blackMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    
    let tubeGeo = new THREE.TorusGeometry(3, 0.8, 16, 32);
    let tube = new THREE.Mesh(tubeGeo, orangeMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.y = 0.4;
    group.add(tube);
    
    let floorGeo = new THREE.CylinderGeometry(2.8, 2.8, 0.2, 32);
    let floor = new THREE.Mesh(floorGeo, blackMat);
    floor.position.y = 0.1;
    group.add(floor);
    
    group.userData = { isRaft: true, capacity: 30, passengers: [] };
    return group;
},

createAmbulanceBoat() {
    let group = new THREE.Group();
    let hullMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
    let pontoonMat = new THREE.MeshLambertMaterial({ color: 0xff5500 }); // bright orange inflatable pontoon
    let blackMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    let glassMat = new THREE.MeshLambertMaterial({ color: 0x87CEEB, transparent: true, opacity: 0.7 });
    let redMat = new THREE.MeshLambertMaterial({ color: 0xe74c3c });

    // Rigid hull bottom
    let hull = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.5, 9), hullMat);
    hull.position.set(0, 0.75, 0);
    group.add(hull);

    // Pointy bow
    let bow = new THREE.Mesh(new THREE.CylinderGeometry(0, 2.5, 4, 3), hullMat);
    bow.rotation.x = Math.PI / 2;
    bow.rotation.z = Math.PI / 2;
    bow.position.set(0, 0.75, -5.5);
    group.add(bow);

    // Left pontoon
    let pLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 9, 8), pontoonMat);
    pLeft.rotation.x = Math.PI / 2;
    pLeft.position.set(-2, 1, 0);
    group.add(pLeft);

    // Right pontoon
    let pRight = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 9, 8), pontoonMat);
    pRight.rotation.x = Math.PI / 2;
    pRight.position.set(2, 1, 0);
    group.add(pRight);
    
    // Front curved pontoon connecting left and right
    let pFront = new THREE.Mesh(new THREE.TorusGeometry(2, 0.8, 8, 12, Math.PI), pontoonMat);
    pFront.rotation.x = Math.PI / 2;
    pFront.position.set(0, 1, -4.5);
    group.add(pFront);

    // Cabin
    let cabin = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 3.5), hullMat);
    cabin.position.set(0, 2.5, 1);
    group.add(cabin);

    // Windows
    let winF = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.2), glassMat);
    winF.position.set(0, 2.7, -0.76);
    group.add(winF);
    
    let winL = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2), glassMat);
    winL.rotation.y = -Math.PI / 2;
    winL.position.set(-1.26, 2.7, 1);
    group.add(winL);
    
    let winR = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2), glassMat);
    winR.rotation.y = Math.PI / 2;
    winR.position.set(1.26, 2.7, 1);
    group.add(winR);

    // Crosses on cabin
    let crossV = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1.2), redMat);
    let crossH = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), redMat);
    crossV.position.set(0, 2.5, -0.77);
    crossH.position.set(0, 2.5, -0.77);
    group.add(crossV);
    group.add(crossH);
    
    // Outboard Motors
    let motor1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.8), blackMat);
    motor1.position.set(-0.8, 1, 4.8);
    group.add(motor1);
    
    let motor2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.8), blackMat);
    motor2.position.set(0.8, 1, 4.8);
    group.add(motor2);

    // Propellers
    let prop1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 5), hullMat);
    prop1.rotation.x = Math.PI / 2;
    prop1.position.set(-0.8, 0.2, 5.2);
    group.add(prop1);

    let prop2 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 5), hullMat);
    prop2.rotation.x = Math.PI / 2;
    prop2.position.set(0.8, 0.2, 5.2);
    group.add(prop2);
    
    // Radar/Antenna mast
    let mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2, 4), blackMat);
    mast.position.set(1, 4.5, 2);
    group.add(mast);

    // Siren Lightbar
    let sirenMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    let siren = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 0.4), sirenMat);
    siren.position.set(0, 3.85, 1);
    group.add(siren);

    // Scale it slightly up to match the proportions
    group.scale.set(1.5, 1.5, 1.5);
    
    group.userData = { isBoat: true, sirenMat: sirenMat, passengers: [], state: 'idle', claimedPassengers: [] };
    return group;
},

createHelicopter(type = 'rescue') {
    let group = new THREE.Group();
    
    let primaryColor = 0xffffff;
    let secondaryColor = 0xffffff;
    let hasSiren = false;
    let hasCamera = false;
    let isMilitary = false;
    
    if (type === 'rescue') {
        primaryColor = 0xe74c3c; // Red
        secondaryColor = 0xffffff; // White
    } else if (type === 'police') {
        primaryColor = 0x2c3e50; // Dark Blue
        secondaryColor = 0xffffff; // White
        hasSiren = true;
    } else if (type === 'military') {
        primaryColor = 0x4b5320; // Army Green
        secondaryColor = 0x222222; // Dark Grey
        isMilitary = true;
    } else if (type === 'news') {
        primaryColor = 0xf1c40f; // Yellow
        secondaryColor = 0x2c3e50; // Dark Blue
        hasCamera = true;
    } else if (type === 'private') {
        primaryColor = 0x111111; // Black
        secondaryColor = 0xd4af37; // Gold
    }

    let bodyMat = new THREE.MeshLambertMaterial({ color: primaryColor });
    let tailMat = new THREE.MeshLambertMaterial({ color: secondaryColor });
    let glassMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50, transparent: true, opacity: 0.8 });
    let blackMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    
    // Body Shape
    let bodyGeo = isMilitary ? new THREE.BoxGeometry(4, 3, 6) : new THREE.SphereGeometry(3, 16, 16);
    if (!isMilitary) bodyGeo.scale(1, 1, 1.5);
    let body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 2;
    group.add(body);
    
    // Cockpit Glass
    if (!isMilitary) {
        let glassGeo = new THREE.SphereGeometry(2.9, 16, 16, 0, Math.PI*2, 0, Math.PI/3);
        glassGeo.scale(1, 1, 1.5);
        let glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(0, 2, -0.2);
        glass.rotation.x = -Math.PI / 2;
        group.add(glass);
    } else {
        let glassGeo = new THREE.BoxGeometry(3.8, 1.5, 1);
        let glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(0, 2.5, -3.1);
        group.add(glass);
    }
    
    // Tail
    let tailGeo = new THREE.CylinderGeometry(0.5, 0.2, 8, 8);
    tailGeo.rotateX(Math.PI / 2);
    let tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.set(0, 2, 7);
    group.add(tail);
    
    // Mast
    let mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1), blackMat);
    mast.position.set(0, (isMilitary ? 3.5 : 5), 0);
    group.add(mast);
    
    // Main Rotor
    let rotor = new THREE.Group();
    let bladeLength = isMilitary ? 14 : 12;
    let bladeGeo = new THREE.BoxGeometry(bladeLength, 0.1, 0.5);
    let blade1 = new THREE.Mesh(bladeGeo, blackMat);
    rotor.add(blade1);
    let blade2 = new THREE.Mesh(bladeGeo, blackMat);
    blade2.rotation.y = Math.PI / 2;
    rotor.add(blade2);
    rotor.position.set(0, (isMilitary ? 4.0 : 5.5), 0);
    group.add(rotor);
    
    // Tail Rotor
    let tailRotor = new THREE.Group();
    let tBladeGeo = new THREE.BoxGeometry(3, 0.1, 0.2);
    let tBlade1 = new THREE.Mesh(tBladeGeo, blackMat);
    tailRotor.add(tBlade1);
    let tBlade2 = new THREE.Mesh(tBladeGeo, blackMat);
    tBlade2.rotation.y = Math.PI / 2;
    tailRotor.add(tBlade2);
    tailRotor.rotation.x = Math.PI / 2;
    tailRotor.position.set(0.6, 2, 10.5);
    group.add(tailRotor);
    
    // Skids
    let skidGeo = new THREE.CylinderGeometry(0.2, 0.2, 8);
    skidGeo.rotateX(Math.PI / 2);
    let skidL = new THREE.Mesh(skidGeo, blackMat);
    skidL.position.set(-2, 0, 0);
    group.add(skidL);
    let skidR = new THREE.Mesh(skidGeo, blackMat);
    skidR.position.set(2, 0, 0);
    group.add(skidR);
    
    let strutGeo = new THREE.CylinderGeometry(0.1, 0.1, 2);
    let s1 = new THREE.Mesh(strutGeo, blackMat); s1.position.set(-2, 1, -2); s1.rotation.z = -0.2; group.add(s1);
    let s2 = new THREE.Mesh(strutGeo, blackMat); s2.position.set(2, 1, -2); s2.rotation.z = 0.2; group.add(s2);
    let s3 = new THREE.Mesh(strutGeo, blackMat); s3.position.set(-2, 1, 2); s3.rotation.z = -0.2; group.add(s3);
    let s4 = new THREE.Mesh(strutGeo, blackMat); s4.position.set(2, 1, 2); s4.rotation.z = 0.2; group.add(s4);
    
    // Special Features
    let spotLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    let spot = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.5), spotLightMat);
    spot.rotation.x = Math.PI / 2;
    spot.position.set(0, 0.5, -3);
    group.add(spot);
    
    if (hasSiren) {
        let sirenMat = new THREE.MeshBasicMaterial({ color: 0x3498db });
        let siren = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 0.4), sirenMat);
        siren.position.set(0, 4.8, 1);
        group.add(siren);
    }
    
    if (hasCamera) {
        let camPod = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), blackMat);
        camPod.position.set(0, 0.5, -4);
        group.add(camPod);
    }
    
    if (isMilitary) {
        // Weapon pods
        let podGeo = new THREE.CylinderGeometry(0.4, 0.4, 2);
        podGeo.rotateX(Math.PI/2);
        let podL = new THREE.Mesh(podGeo, blackMat); podL.position.set(-2.5, 1.5, -1); group.add(podL);
        let podR = new THREE.Mesh(podGeo, blackMat); podR.position.set(2.5, 1.5, -1); group.add(podR);
    }
    
    group.userData = { isHelicopter: true, rotor: rotor, tailRotor: tailRotor };
    return group;
},

createPoliceCar() {
    let carGroup = new THREE.Group();
    let bodyMat = new THREE.MeshLambertMaterial({ color: 0xffffff }); // White body
    let stripeMat = new THREE.MeshLambertMaterial({ color: 0x2980b9 }); // Blue stripe
    let blackMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    let glassMat = new THREE.MeshLambertMaterial({ color: 0x88ccff, transparent: true, opacity: 0.7 });
    
    let body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 9), bodyMat);
    body.position.y = 1.25;
    body.castShadow = true;
    carGroup.add(body);
    
    let stripe = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.5, 9.1), stripeMat);
    stripe.position.y = 1.25;
    carGroup.add(stripe);
    
    let cabin = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 5), bodyMat);
    cabin.position.set(0, 2.6, -0.5);
    cabin.castShadow = true;
    carGroup.add(cabin);
    
    let frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.1), glassMat);
    frontGlass.position.set(0, 2.6, -3.01);
    frontGlass.rotation.x = -Math.PI/8;
    carGroup.add(frontGlass);
    
    let rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.1), glassMat);
    rearGlass.position.set(0, 2.6, 2.01);
    rearGlass.rotation.x = Math.PI/8;
    rearGlass.rotation.y = Math.PI;
    carGroup.add(rearGlass);
    
    let sirenBase = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 0.6), blackMat);
    sirenBase.position.set(0, 3.3, -0.5);
    carGroup.add(sirenBase);
    
    let sirenLMat = new THREE.MeshBasicMaterial({ color: 0x3498db });
    let sirenL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.5), sirenLMat);
    sirenL.position.set(-1, 3.4, -0.5);
    carGroup.add(sirenL);
    
    let sirenRMat = new THREE.MeshBasicMaterial({ color: 0xe74c3c });
    let sirenR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.5), sirenRMat);
    sirenR.position.set(1, 3.4, -0.5);
    carGroup.add(sirenR);
    
    let wheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.8, 16);
    wheelGeo.rotateZ(Math.PI/2);
    let positions = [[-2, 0.7, -3], [2, 0.7, -3], [-2, 0.7, 2.5], [2, 0.7, 2.5]];
    let wheels = [];
    for (let p of positions) {
        let w = new THREE.Mesh(wheelGeo, blackMat);
        w.position.set(p[0], p[1], p[2]);
        w.castShadow = true;
        carGroup.add(w);
        wheels.push(w);
    }
    
    carGroup.userData = { wheels: wheels, sirenL: sirenLMat, sirenR: sirenRMat };
    return carGroup;
},

createCivCar(color) {
    let carGroup = new THREE.Group();
    let carMat = new THREE.MeshLambertMaterial({ color: color });
    let blackMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    let glassMat = new THREE.MeshLambertMaterial({ color: 0x88ccff, transparent: true, opacity: 0.7 });
    
    let body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 9), carMat);
    body.position.y = 1.25;
    body.castShadow = true;
    carGroup.add(body);
    
    let cabin = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 5), carMat);
    cabin.position.set(0, 2.6, -0.5);
    cabin.castShadow = true;
    carGroup.add(cabin);
    
    let frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.1), glassMat);
    frontGlass.position.set(0, 2.6, -3.01);
    frontGlass.rotation.x = -Math.PI/8;
    carGroup.add(frontGlass);
    
    let rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.1), glassMat);
    rearGlass.position.set(0, 2.6, 2.01);
    rearGlass.rotation.x = Math.PI/8;
    rearGlass.rotation.y = Math.PI;
    carGroup.add(rearGlass);
    
    let lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    let lLight = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.1), lightMat);
    lLight.position.set(-1.2, 1.5, -4.51);
    carGroup.add(lLight);
    let rLight = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.1), lightMat);
    rLight.position.set(1.2, 1.5, -4.51);
    carGroup.add(rLight);
    
    let tailMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    let lTail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.1), tailMat);
    lTail.position.set(-1.2, 1.5, 4.51);
    carGroup.add(lTail);
    let rTail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.1), tailMat);
    rTail.position.set(1.2, 1.5, 4.51);
    carGroup.add(rTail);
    
    let wheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.8, 16);
    wheelGeo.rotateZ(Math.PI/2);
    let positions = [[-2, 0.7, -3], [2, 0.7, -3], [-2, 0.7, 2.5], [2, 0.7, 2.5]];
    let wheels = [];
    for (let p of positions) {
        let w = new THREE.Mesh(wheelGeo, blackMat);
        w.position.set(p[0], p[1], p[2]);
        w.castShadow = true;
        carGroup.add(w);
        wheels.push(w);
    }
    
    carGroup.userData = { wheels: wheels, isAmbulance: false };
    return carGroup;
},

createAmbulance() {
    let carGroup = new THREE.Group();
    let carMat = new THREE.MeshLambertMaterial({ color: 0xffffff }); 
    let redMat = new THREE.MeshLambertMaterial({ color: 0xe74c3c }); 
    let yellowMat = new THREE.MeshLambertMaterial({ color: 0xf1c40f }); 
    let blackMat = new THREE.MeshLambertMaterial({ color: 0x111111 }); 
    let greyMat = new THREE.MeshLambertMaterial({ color: 0x7f8c8d }); 
    let glassMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50, transparent: true, opacity: 0.8 }); 
    let silverMat = new THREE.MeshLambertMaterial({ color: 0xbdc3c7 }); 
    
    let body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 10), carMat);
    body.position.y = 1.25;
    body.castShadow = true;
    carGroup.add(body);
    
    let bumper = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.6, 0.5), blackMat);
    bumper.position.set(0, 0.8, -5.1);
    carGroup.add(bumper);
    
    let rearBumper = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.4, 0.8), blackMat);
    rearBumper.position.set(0, 0.8, 5.2);
    carGroup.add(rearBumper);
    
    let grille = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 0.1), greyMat);
    grille.position.set(0, 1.4, -5.01);
    carGroup.add(grille);
    
    let lightMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
    let lLight = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.1), lightMat);
    lLight.position.set(-1.6, 1.5, -5.02);
    carGroup.add(lLight);
    let rLight = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.1), lightMat);
    rLight.position.set(1.6, 1.5, -5.02);
    carGroup.add(rLight);
    
    let cabin = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.6, 3), carMat);
    cabin.position.set(0, 2.8, -3);
    cabin.castShadow = true;
    carGroup.add(cabin);
    
    let windshield = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.4), glassMat);
    windshield.position.set(0, 2.9, -4.51);
    windshield.rotation.x = -Math.PI/10;
    carGroup.add(windshield);
    
    let lWin = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2), glassMat);
    lWin.position.set(-1.91, 2.8, -3);
    lWin.rotation.y = -Math.PI/2;
    carGroup.add(lWin);
    let rWin = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2), glassMat);
    rWin.position.set(1.91, 2.8, -3);
    rWin.rotation.y = Math.PI/2;
    carGroup.add(rWin);
    
    let lMirror = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.6), blackMat);
    lMirror.position.set(-2.1, 2.6, -3.5);
    carGroup.add(lMirror);
    let rMirror = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.6), blackMat);
    rMirror.position.set(2.1, 2.6, -3.5);
    carGroup.add(rMirror);
    
    let rearBox = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.2, 6.5), carMat);
    rearBox.position.set(0, 3.1, 1.75);
    rearBox.castShadow = true;
    carGroup.add(rearBox);
    
    let rearDoorDivider = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3, 0.1), greyMat);
    rearDoorDivider.position.set(0, 3.1, 5.01);
    carGroup.add(rearDoorDivider);
    
    let lRearWin = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glassMat);
    lRearWin.position.set(-1, 3.5, 5.02);
    lRearWin.rotation.y = Math.PI;
    carGroup.add(lRearWin);
    let rRearWin = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glassMat);
    rRearWin.position.set(1, 3.5, 5.02);
    rRearWin.rotation.y = Math.PI;
    carGroup.add(rRearWin);
    
    let tailMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    let lTail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.1), tailMat);
    lTail.position.set(-1.8, 2, 5.01);
    carGroup.add(lTail);
    let rTail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.1), tailMat);
    rTail.position.set(1.8, 2, 5.01);
    carGroup.add(rTail);
    
    let lStripeY = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 6.5), yellowMat);
    lStripeY.position.set(-2.21, 2.5, 1.75);
    carGroup.add(lStripeY);
    let lStripeR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 6.5), redMat);
    lStripeR.position.set(-2.22, 2.5, 1.75);
    carGroup.add(lStripeR);
    
    let rStripeY = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 6.5), yellowMat);
    rStripeY.position.set(2.21, 2.5, 1.75);
    carGroup.add(rStripeY);
    let rStripeR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 6.5), redMat);
    rStripeR.position.set(2.22, 2.5, 1.75);
    carGroup.add(rStripeR);
    
    let crossV_L = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.5), redMat);
    crossV_L.position.set(-2.25, 3.5, 1.75);
    carGroup.add(crossV_L);
    let crossH_L = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 1.5), redMat);
    crossH_L.position.set(-2.25, 3.5, 1.75);
    carGroup.add(crossH_L);
    
    let crossV_R = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.5), redMat);
    crossV_R.position.set(2.25, 3.5, 1.75);
    carGroup.add(crossV_R);
    let crossH_R = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 1.5), redMat);
    crossH_R.position.set(2.25, 3.5, 1.75);
    carGroup.add(crossH_R);
    
    let lightbarBase = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 0.8), blackMat);
    lightbarBase.position.set(0, 3.7, -3);
    carGroup.add(lightbarBase);
    
    let sirenMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    let siren = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.4, 0.6), sirenMat);
    siren.position.set(0, 3.9, -3);
    carGroup.add(siren);
    
    let rearSiren = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.3, 0.4), sirenMat);
    rearSiren.position.set(0, 4.8, 4.8);
    carGroup.add(rearSiren);
    
    let wheelGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.8, 24);
    wheelGeo.rotateZ(Math.PI/2);
    let rimGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.9, 16);
    rimGeo.rotateZ(Math.PI/2);
    
    let positions = [[-2.2, 0.8, -3], [2.2, 0.8, -3], [-2.2, 0.8, 3.5], [2.2, 0.8, 3.5]];
    let wheels = [];
    for (let p of positions) {
        let w = new THREE.Mesh(wheelGeo, blackMat);
        w.position.set(p[0], p[1], p[2]);
        w.castShadow = true;
        let rim = new THREE.Mesh(rimGeo, silverMat);
        w.add(rim);
        carGroup.add(w);
        wheels.push(w);
    }
    
    let p1 = createHumanoid(0xffffff, 0xffffff, 0xffffff);
    p1.position.set(-1.5, 0, 5);
    p1.visible = false;
    carGroup.add(p1);
    
    let p2 = createHumanoid(0xffffff, 0xffffff, 0xffffff);
    p2.position.set(1.5, 0, 5);
    p2.visible = false;
    carGroup.add(p2);
    
    let stretcher = new THREE.Group();
    let bed = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 2.5), new THREE.MeshLambertMaterial({color: 0xcccccc}));
    bed.position.y = 0.5;
    stretcher.add(bed);
    let legMat = new THREE.MeshLambertMaterial({color: 0x222222});
    for (let x of [-0.5, 0.5]) {
        for (let z of [-1, 1]) {
            let leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5), legMat);
            leg.position.set(x, 0.25, z);
            stretcher.add(leg);
        }
    }
    stretcher.position.set(0, 0, 5);
    stretcher.visible = false;
    carGroup.add(stretcher);

    carGroup.userData = { wheels: wheels, isAmbulance: true, sirenMat: sirenMat, p1: p1, p2: p2, stretcher: stretcher };
    return carGroup;
}

};
