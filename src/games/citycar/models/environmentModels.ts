import * as THREE from 'three';

// Material Cache for performance
const materials = {
    asphalt: new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.85 }),
    roadLine: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    sidewalk: new THREE.MeshStandardMaterial({ color: 0x88929e, roughness: 0.9 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x57606f, roughness: 0.7 }),
    water: new THREE.MeshStandardMaterial({
        color: 0x0077be,
        roughness: 0.1,
        metalness: 0.7,
        transparent: true,
        opacity: 0.82
    }),
    grass: new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.95 }),
    forestGrass: new THREE.MeshStandardMaterial({ color: 0x1b4332, roughness: 0.95 }),
    sand: new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.9 }),
    dirt: new THREE.MeshStandardMaterial({ color: 0x582f0e, roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x7f4f24, roughness: 0.8 }),
    metalRed: new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.3, metalness: 0.7 }),
    metalYellow: new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.4, metalness: 0.6 }),
    pineFoliage: new THREE.MeshStandardMaterial({ color: 0x1e3f20, roughness: 0.9 }),
    oakFoliage: new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.85 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x4a2810, roughness: 0.9 }),
    rock: new THREE.MeshStandardMaterial({ color: 0x718093, roughness: 0.85 }),
    windowGlass: new THREE.MeshStandardMaterial({ color: 0x22313f, roughness: 0.2, metalness: 0.8 }),
    neonCyan: new THREE.MeshBasicMaterial({ color: 0x00f2fe }),
    neonYellow: new THREE.MeshBasicMaterial({ color: 0xffd32a }),
    lampEmissive: new THREE.MeshBasicMaterial({ color: 0xfff3b0 })
};

// 1. Procedural Building
export function createBuilding(width: number, depth: number, height: number, colorHex: number): THREE.Group {
    const group = new THREE.Group();

    const wallMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.6,
        metalness: 0.2
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Roof border
    const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.6, depth + 0.4), materials.concrete);
    roof.position.y = height + 0.3;
    group.add(roof);

    // Window Rows
    const floors = Math.floor(height / 4);
    const windowGeo = new THREE.BoxGeometry(1.6, 1.8, 0.1);
    for (let f = 1; f < floors; f++) {
        const y = f * 4;
        // Front & Back Windows
        for (let x = -width / 2 + 3; x <= width / 2 - 3; x += 3.8) {
            const wFront = new THREE.Mesh(windowGeo, materials.windowGlass);
            wFront.position.set(x, y, depth / 2 + 0.05);
            const wBack = new THREE.Mesh(windowGeo, materials.windowGlass);
            wBack.position.set(x, y, -depth / 2 - 0.05);
            group.add(wFront, wBack);
        }
    }

    // Neon trim on high-rises
    if (height > 30) {
        const neon = new THREE.Mesh(new THREE.BoxGeometry(width * 0.8, 0.4, 0.2), materials.neonCyan);
        neon.position.set(0, height - 1.5, depth / 2 + 0.1);
        group.add(neon);
    }

    return group;
}

// 2. Street Lamp
export function createStreetLamp(): THREE.Group {
    const lamp = new THREE.Group();

    // Pole (Base starts at y=0, height=6.0)
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6.0, 8), materials.concrete);
    pole.position.y = 3.0;
    lamp.add(pole);

    // Arm
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.8), materials.concrete);
    arm.position.set(0, 5.8, 0.8);
    arm.rotation.x = -0.2;
    lamp.add(arm);

    // Lantern Head with unique emissive material instance so light turns off when fallen
    const headMat = materials.lampEmissive.clone();
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.6), headMat);
    head.position.set(0, 5.6, 1.6);
    lamp.add(head);

    lamp.userData = { head, pole, headMat };

    return lamp;
}

// 3. Pine Tree (2 pieces: stump + falling upper top)
export function createPineTree(scale = 1): THREE.Group {
    const tree = new THREE.Group();

    // Piece 1: Lower Rooted Stump
    const stumpHeight = 0.7 * scale;
    const stump = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32 * scale, 0.42 * scale, stumpHeight, 7),
        materials.trunk
    );
    stump.position.y = stumpHeight / 2;
    stump.castShadow = true;
    tree.add(stump);

    // Piece 2: Upper Breakable Top (Upper Trunk + Foliage Cones)
    const top = new THREE.Group();
    top.position.set(0, stumpHeight, 0);

    const upperTrunkHeight = 1.9 * scale;
    const upperTrunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24 * scale, 0.32 * scale, upperTrunkHeight, 6),
        materials.trunk
    );
    upperTrunk.position.y = upperTrunkHeight / 2;
    upperTrunk.castShadow = true;
    top.add(upperTrunk);

    // Cones
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(2.4 * scale, 3.2 * scale, 7), materials.pineFoliage);
    c1.position.y = 2.4 * scale;
    c1.castShadow = true;
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.8 * scale, 2.8 * scale, 7), materials.pineFoliage);
    c2.position.y = 4.0 * scale;
    c2.castShadow = true;
    const c3 = new THREE.Mesh(new THREE.ConeGeometry(1.2 * scale, 2.2 * scale, 7), materials.pineFoliage);
    c3.position.y = 5.4 * scale;
    c3.castShadow = true;

    top.add(c1, c2, c3);
    tree.add(top);

    tree.userData = { stump, top };
    return tree;
}

// 4. Oak Tree (2 pieces: stump + falling upper top)
export function createOakTree(scale = 1): THREE.Group {
    const tree = new THREE.Group();

    // Piece 1: Lower Rooted Stump
    const stumpHeight = 0.75 * scale;
    const stump = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36 * scale, 0.46 * scale, stumpHeight, 8),
        materials.trunk
    );
    stump.position.y = stumpHeight / 2;
    stump.castShadow = true;
    tree.add(stump);

    // Piece 2: Upper Breakable Top (Upper Trunk + Dodecahedron Foliage)
    const top = new THREE.Group();
    top.position.set(0, stumpHeight, 0);

    const upperTrunkHeight = 2.3 * scale;
    const upperTrunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28 * scale, 0.36 * scale, upperTrunkHeight, 8),
        materials.trunk
    );
    upperTrunk.position.y = upperTrunkHeight / 2;
    upperTrunk.castShadow = true;
    top.add(upperTrunk);

    const foliageGeo = new THREE.DodecahedronGeometry(2.2 * scale, 1);
    const foliage = new THREE.Mesh(foliageGeo, materials.oakFoliage);
    foliage.position.y = 3.5 * scale;
    foliage.castShadow = true;
    top.add(foliage);

    tree.add(top);

    tree.userData = { stump, top };
    return tree;
}

// 5. Granite Boulder
export function createRock(scale = 1): THREE.Mesh {
    const geo = new THREE.DodecahedronGeometry(1.5 * scale, 1);
    const rock = new THREE.Mesh(geo, materials.rock);
    rock.position.y = 0.8 * scale;
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    return rock;
}

// 6. Grand Suspension Bridge (Flush with road height at Y = 0.05)
export function createSuspensionBridge(length: number, width: number): THREE.Group {
    const bridge = new THREE.Group();

    // Road Deck - Top surface flush with road at Y = 0.05
    const deckGeo = new THREE.BoxGeometry(width, 0.5, length);
    const deck = new THREE.Mesh(deckGeo, materials.asphalt);
    deck.position.y = -0.2;
    deck.receiveShadow = true;
    bridge.add(deck);

    // Guard Rails along sides from road deck Y=0.05 up to Y=1.05
    const railGeo = new THREE.BoxGeometry(0.35, 1.0, length);
    const railL = new THREE.Mesh(railGeo, materials.metalRed);
    railL.position.set(-width / 2 + 0.2, 0.55, 0);
    const railR = new THREE.Mesh(railGeo, materials.metalRed);
    railR.position.set(width / 2 - 0.2, 0.55, 0);
    bridge.add(railL, railR);

    // Center Dashed White Line
    const lineGeo = new THREE.BoxGeometry(0.3, 0.04, length);
    const line = new THREE.Mesh(lineGeo, materials.roadLine);
    line.position.set(0, 0.07, 0);
    bridge.add(line);

    // Towers at 1/3 and 2/3 of length (from ground y=0 up to y=22)
    const towerH = 22;
    [-length * 0.25, length * 0.25].forEach(zPos => {
        const p1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, towerH, 1.4), materials.metalRed);
        p1.position.set(-width / 2 - 0.9, towerH / 2, zPos);
        const p2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, towerH, 1.4), materials.metalRed);
        p2.position.set(width / 2 + 0.9, towerH / 2, zPos);

        const crossBar = new THREE.Mesh(new THREE.BoxGeometry(width + 3.2, 1.4, 1.4), materials.metalRed);
        crossBar.position.set(0, towerH - 2, zPos);

        bridge.add(p1, p2, crossBar);
    });

    return bridge;
}

// 7. Border Checkpoint Booth with Barriers (Flush with road at Y = 0.05)
export function createBorderCheckpoint(width: number): THREE.Group {
    const cp = new THREE.Group();

    // Checkpoint Base Road
    const baseGeo = new THREE.BoxGeometry(width, 0.3, 25);
    const base = new THREE.Mesh(baseGeo, materials.asphalt);
    base.position.y = -0.1; // Top at Y = 0.05
    cp.add(base);

    // Toll Booth Building
    const boothGeo = new THREE.BoxGeometry(2.4, 3.2, 4.5);
    const booth = new THREE.Mesh(boothGeo, materials.concrete);
    booth.position.set(0, 1.6, 0);
    cp.add(booth);

    // Canopy Roof
    const roofGeo = new THREE.BoxGeometry(width + 4, 0.6, 12);
    const roof = new THREE.Mesh(roofGeo, materials.metalYellow);
    roof.position.set(0, 4.5, 0);
    cp.add(roof);

    // Barrier arms (striped look)
    const barrierGeoL = new THREE.BoxGeometry(width * 0.42, 0.2, 0.2);
    const barrierL = new THREE.Mesh(barrierGeoL, materials.neonYellow);
    barrierL.position.set(-width * 0.25, 1.4, -2.5);

    const barrierGeoR = new THREE.BoxGeometry(width * 0.42, 0.2, 0.2);
    const barrierR = new THREE.Mesh(barrierGeoR, materials.neonYellow);
    barrierR.position.set(width * 0.25, 1.4, 2.5);

    cp.add(barrierL, barrierR);

    return cp;
}

// 8. Stunt Jump Ramp
export function createStuntRamp(width: number, length: number, height: number): THREE.Group {
    const rampGroup = new THREE.Group();

    const shape = new THREE.Shape();
    shape.moveTo(-length / 2, 0);
    shape.lineTo(length / 2, height);
    shape.lineTo(length / 2, 0);
    shape.closePath();

    const extrudeSettings = {
        steps: 1,
        depth: width,
        bevelEnabled: false
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.rotateY(Math.PI / 2);
    geo.translate(width / 2, 0, 0);

    const mesh = new THREE.Mesh(geo, materials.metalYellow);
    rampGroup.add(mesh);

    return rampGroup;
}
