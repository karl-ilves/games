import * as THREE from 'three';

export function createHumanoid(shirtColor, pantsColor, hatColor, hasExtinguisher = false) {
    let group = new THREE.Group();
    
    let shirtMat = new THREE.MeshLambertMaterial({ color: shirtColor });
    let skinMat = new THREE.MeshLambertMaterial({ color: 0xf1c27d });
    let pantsMat = new THREE.MeshLambertMaterial({ color: pantsColor });
    let eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    let mouthMat = new THREE.MeshBasicMaterial({ color: 0xaa0000 });
    
    // Body
    let body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.4), shirtMat);
    body.position.y = 1.0;
    body.castShadow = true;
    group.add(body);
    
    // Head
    let head = new THREE.Group();
    head.position.y = 1.8;
    let headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), skinMat);
    headMesh.castShadow = true;
    head.add(headMesh);
    
    // Face
    let leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), eyeMat);
    leftEye.position.set(-0.15, 0.1, 0.32);
    head.add(leftEye);
    let rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), eyeMat);
    rightEye.position.set(0.15, 0.1, 0.32);
    head.add(rightEye);
    let nose = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.1), skinMat);
    nose.position.set(0, -0.05, 0.32);
    head.add(nose);
    let mouth = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 0.05), mouthMat);
    mouth.position.set(0, -0.2, 0.3);
    head.add(mouth);
    
    // Hat / Hair
    if (hatColor) {
        let hatMat = new THREE.MeshLambertMaterial({ color: hatColor });
        let hat = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.4, 8), hatMat);
        hat.position.y = 0.5;
        head.add(hat);
    } else {
        let hairMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        let hair = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.2, 0.65), hairMat);
        hair.position.y = 0.35;
        head.add(hair);
    }
    group.add(head);
    
    // Arms
    let armGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
    let lArmGroup = new THREE.Group();
    lArmGroup.position.set(-0.55, 1.4, 0); // Raised from 0.9 to 1.4 (shoulder height)
    let lArm = new THREE.Mesh(armGeo, shirtMat);
    lArm.position.y = -0.4;
    lArm.castShadow = true;
    lArmGroup.add(lArm);
    group.add(lArmGroup);
    
    let rArmGroup = new THREE.Group();
    rArmGroup.position.set(0.55, 1.4, 0); // Raised from 0.9 to 1.4
    let rArm = new THREE.Mesh(armGeo, shirtMat);
    rArm.position.y = -0.4;
    rArm.castShadow = true;
    rArmGroup.add(rArm);
    group.add(rArmGroup);
    
    // Hands
    let handGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
    let lHand = new THREE.Mesh(handGeo, skinMat);
    lHand.position.y = -0.4;
    lArm.add(lHand);
    let rHand = new THREE.Mesh(handGeo, skinMat);
    rHand.position.y = -0.4;
    rArm.add(rHand);
    
    // Extinguisher
    let extinguisher = null;
    let waterJet = null;
    if (hasExtinguisher) {
        let extGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
        let extMat = new THREE.MeshLambertMaterial({ color: 0xe74c3c });
        extinguisher = new THREE.Mesh(extGeo, extMat);
        extinguisher.position.set(0, -0.4, 0.2);
        extinguisher.rotation.x = Math.PI / 2;
        extinguisher.visible = false;
        rArmGroup.add(extinguisher);
        
        let waterMat = new THREE.MeshBasicMaterial({ color: 0x3498db, transparent: true, opacity: 0.7 });
        let waterGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 8); 
        waterJet = new THREE.Mesh(waterGeo, waterMat);
        waterJet.rotation.x = Math.PI / 2;
        waterJet.position.set(0, -0.4, 0.5); 
        waterJet.visible = false;
        rArmGroup.add(waterJet);
    }
    
    // Legs
    let legGeo = new THREE.BoxGeometry(0.35, 0.9, 0.35);
    let lLeg = new THREE.Mesh(legGeo, pantsMat);
    lLeg.position.set(-0.2, 0.45, 0);
    lLeg.castShadow = true;
    group.add(lLeg);
    
    let rLeg = new THREE.Mesh(legGeo, pantsMat);
    rLeg.position.set(0.2, 0.45, 0);
    rLeg.castShadow = true;
    group.add(rLeg);
    
    // Shoes
    let shoeGeo = new THREE.BoxGeometry(0.36, 0.2, 0.45);
    let shoeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    let lShoe = new THREE.Mesh(shoeGeo, shoeMat);
    lShoe.position.set(0, -0.45, 0.05);
    lLeg.add(lShoe);
    let rShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rShoe.position.set(0, -0.45, 0.05);
    rLeg.add(rShoe);
    
    group.userData = { leftArm: lArmGroup, rightArm: rArmGroup, leftLeg: lLeg, rightLeg: rLeg, extinguisher, waterJet };
    return group;
}

