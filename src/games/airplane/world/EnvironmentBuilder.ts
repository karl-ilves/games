import * as THREE from 'three';

export const EnvironmentBuilder = {
createGrassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Base green
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(0, 0, 512, 512);
    
    // Draw noise/grass blades
    for (let i = 0; i < 40000; i++) {
        let x = Math.random() * 512;
        let y = Math.random() * 512;
        let w = Math.random() * 2 + 1;
        let h = Math.random() * 10 + 2;
        
        let r = 20 + Math.random() * 30;
        let g = 140 + Math.random() * 60;
        let b = 50 + Math.random() * 30;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, w, h);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(800, 800);
    return texture;
},

createRiverCrossings() {
    let riverX = 5 * blockSize + blockSize/2; // 2475
    let bridgeMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
    let tunnelMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    
    // Bridges
    bridgeStreets.forEach(z => {
        let zPos = z * blockSize;
        let bGeo = new THREE.BoxGeometry(blockSize, 10, roadWidth);
        let bMesh = new THREE.Mesh(bGeo, bridgeMat);
        bMesh.position.set(riverX, 5, zPos);
        bMesh.receiveShadow = true;
        bMesh.castShadow = true;
        map1Group.add(bMesh);
        
        let railGeo = new THREE.BoxGeometry(blockSize, 5, 2);
        let railMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
        let r1 = new THREE.Mesh(railGeo, railMat);
        r1.position.set(riverX, 10, zPos - roadWidth/2);
        map1Group.add(r1);
        let r2 = new THREE.Mesh(railGeo, railMat);
        r2.position.set(riverX, 10, zPos + roadWidth/2);
        map1Group.add(r2);
    });

    // Tunnels
    tunnelStreets.forEach(z => {
        let zPos = z * blockSize;
        let wEntGeo = new THREE.BoxGeometry(20, 20, roadWidth);
        let wEnt = new THREE.Mesh(wEntGeo, tunnelMat);
        wEnt.position.set(riverX - blockSize/2, 10, zPos);
        map1Group.add(wEnt);
        
        let eEntGeo = new THREE.BoxGeometry(20, 20, roadWidth);
        let eEnt = new THREE.Mesh(eEntGeo, tunnelMat);
        eEnt.position.set(riverX + blockSize/2, 10, zPos);
        map1Group.add(eEnt);
    });
},

createRunwayTunnels() {
    let tunnelMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    for (let r = -gridCells/2; r < gridCells/2; r++) {
        let zPos = r * blockSize;
        // West Entrance
        let wEntGeo = new THREE.BoxGeometry(20, 20, roadWidth);
        let wEnt = new THREE.Mesh(wEntGeo, tunnelMat);
        wEnt.position.set(-150, 10, zPos);
        map1Group.add(wEnt);
        // East Entrance
        let eEntGeo = new THREE.BoxGeometry(20, 20, roadWidth);
        let eEnt = new THREE.Mesh(eEntGeo, tunnelMat);
        eEnt.position.set(150, 10, zPos);
        map1Group.add(eEnt);
    }
},

generateMap2() {
    let mountGeo = new THREE.ConeGeometry(500, 1500, 8);
    let mountMat = new THREE.MeshLambertMaterial({ color: 0x7f8c8d });
    
    // Create large mountains
    let mountInstanced = new THREE.InstancedMesh(mountGeo, mountMat, 50);
    mountInstanced.castShadow = true;
    mountInstanced.receiveShadow = true;
    
    let dummy = new THREE.Object3D();
    
    for (let i = 0; i < 50; i++) {
        // Map 2 is from Z = -15000 to Z = -35000
        let px = (Math.random() - 0.5) * 20000;
        let pz = -15000 - Math.random() * 20000;
        
        let sy = 0.5 + Math.random() * 1.5;
        let sx = 1 + Math.random() * 2;
        let sz = 1 + Math.random() * 2;
        
        dummy.position.set(px, 750 * sy, pz);
        dummy.scale.set(sx, sy, sz);
        dummy.rotation.y = Math.random() * Math.PI;
        dummy.updateMatrix();
        
        mountInstanced.setMatrixAt(i, dummy.matrix);
        
        // Push large mountain data for collision if needed, but since it's far, maybe just a simple box for collision
        // Approximate cone as a cylinder for collision, or just a large box
        buildings.push({
            position: new THREE.Vector3(px, 750 * sy, pz),
            userData: { isTree: false, isMountain: true, height: 1500 * sy, originalScale: new THREE.Vector3(sx * 10, sy, sz * 10) }
        });
    }
    
    map2Group.add(mountInstanced);
    
    // Add some pine trees to map 2
    let map2TreeInstanced = new THREE.InstancedMesh(treeGeo, treeMat, 200);
    map2TreeInstanced.castShadow = true;
    map2TreeInstanced.receiveShadow = true;
    
    for (let i = 0; i < 200; i++) {
        let px = (Math.random() - 0.5) * 20000;
        let pz = -15000 - Math.random() * 20000;
        
        dummy.position.set(px, 10, pz);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.y = 0;
        dummy.updateMatrix();
        
        map2TreeInstanced.setMatrixAt(i, dummy.matrix);
        
        buildings.push({
            position: new THREE.Vector3(px, 10, pz),
            userData: { isTree: true, height: 20 }
        });
    }
    
    map2Group.add(map2TreeInstanced);
},

createHospital() {
    let hospGroup = new THREE.Group();
    
    // Main building
    let mainHospMat = new THREE.MeshLambertMaterial({ color: 0xffffff }); // White building
    let mainHosp = new THREE.Mesh(new THREE.BoxGeometry(60, 80, 60), mainHospMat);
    mainHosp.position.y = 40;
    mainHosp.castShadow = true;
    // NOT added to hospGroup, will be added to scene directly
    
    // Red Cross symbols
    let crossMat = new THREE.MeshLambertMaterial({ color: 0xe74c3c });
    let vCross1 = new THREE.Mesh(new THREE.BoxGeometry(10, 30, 2), crossMat);
    vCross1.position.set(0, 60, 30.1);
    let hCross1 = new THREE.Mesh(new THREE.BoxGeometry(30, 10, 2), crossMat);
    hCross1.position.set(0, 60, 30.1);
    
    // Front cross
    let vCross2 = new THREE.Mesh(new THREE.BoxGeometry(10, 30, 2), crossMat);
    vCross2.position.set(0, 60, -30.1);
    let hCross2 = new THREE.Mesh(new THREE.BoxGeometry(30, 10, 2), crossMat);
    hCross2.position.set(0, 60, -30.1);
    
    // Roof cross
    let roofCross1 = new THREE.Mesh(new THREE.BoxGeometry(10, 2, 40), crossMat);
    roofCross1.position.set(0, 80.1, 0);
    let roofCross2 = new THREE.Mesh(new THREE.BoxGeometry(40, 2, 10), crossMat);
    roofCross2.position.set(0, 80.1, 0);
    
    hospGroup.add(vCross1);
    hospGroup.add(hCross1);
    hospGroup.add(vCross2);
    hospGroup.add(hCross2);
    hospGroup.add(roofCross1);
    hospGroup.add(roofCross2);
    
    // Place it at the corner of intersection x=4500, z=-1800
    hospGroup.position.set(4600, 0, -1700);
    map1Group.add(hospGroup);
    
    // Make main building accessible as a solid structure in the buildings array
    // Add it directly to scene so absolute positioning works for collision detection
    mainHosp.position.copy(hospGroup.position);
    mainHosp.position.y += 40; // absolute position
    mainHosp.userData = { isTree: false, height: 80, originalScale: mainHosp.scale.clone(), isHospital: true };
    map1Group.add(mainHosp);
    buildings.push(mainHosp);
    hospitalBuilding = mainHosp;
},

createAmbulanceDepot() {
    let depotGroup = new THREE.Group();
    let depotMat = new THREE.MeshLambertMaterial({ color: 0x95a5a6 }); // Grey
    let depotRoofMat = new THREE.MeshLambertMaterial({ color: 0x7f8c8d });
    let doorMat = new THREE.MeshLambertMaterial({ color: 0x34495e });
    
    let mainBuilding = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 40), depotMat);
    mainBuilding.position.y = 10;
    mainBuilding.castShadow = true;
    // NOT added to depotGroup, will be added directly to scene for collision
    
    let roof = new THREE.Mesh(new THREE.BoxGeometry(42, 2, 42), depotRoofMat);
    roof.position.y = 21;
    depotGroup.add(roof);
    
    // Garage doors (facing +Z)
    for (let i = -1; i <= 1; i += 2) {
        let door = new THREE.Mesh(new THREE.BoxGeometry(12, 14, 2), doorMat);
        door.position.set(i * 10, 7, 20);
        depotGroup.add(door);
    }
    
    // Place it near the hospital on the grass
    depotGroup.position.set(4600, 0, -1600);
    map1Group.add(depotGroup);
    ambulanceDepot = depotGroup;
    
    // Solid building
    mainBuilding.position.copy(depotGroup.position);
    mainBuilding.position.y += 10;
    mainBuilding.userData = { isTree: false, height: 20, originalScale: mainBuilding.scale.clone() };
    map1Group.add(mainBuilding);
    buildings.push(mainBuilding);
},

createFireTexture() {
    let canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    let ctx = canvas.getContext('2d');
    
    let gradient = ctx.createRadialGradient(32, 48, 0, 32, 48, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Bright hot core
    gradient.addColorStop(0.2, 'rgba(255, 200, 0, 1)'); // Yellow
    gradient.addColorStop(0.4, 'rgba(255, 50, 0, 0.8)'); // Orange-Red
    gradient.addColorStop(0.8, 'rgba(30, 0, 0, 0.4)'); // Dark smoke edge
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Transparent outer
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
},

createAirlinerTexture() {
    let canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    let ctx = canvas.getContext('2d');
    
    // Base white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1024, 512);
    
    // Panel lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    for(let i = 0; i < 1024; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.stroke();
    }
    
    // Blue stripe along the side
    ctx.fillStyle = '#2980b9';
    ctx.fillRect(0, 220, 1024, 60);
    
    // Windows
    ctx.fillStyle = '#111111';
    for(let i = 40; i < 980; i += 32) {
        if(i > 400 && i < 600) continue; // Wing gap
        ctx.fillRect(i, 235, 16, 24);
    }
    
    // Doors
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(30, 210, 25, 80);
    ctx.fillRect(380, 210, 25, 80);
    ctx.fillRect(620, 210, 25, 80);
    ctx.fillRect(960, 210, 25, 80);
    
    let tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
},

};
