import * as THREE from 'three';
import { WorldZone } from '../types';
import {
    createBuilding,
    createStreetLamp,
    createPineTree,
    createOakTree,
    createRock,
    createSuspensionBridge,
    createBorderCheckpoint
} from '../models/environmentModels';

export interface StreetLampObject {
    group: THREE.Group;
    basePos: THREE.Vector3;
    isFalling: boolean;
    isFallen: boolean;
    fallProgress: number;
    fallAxis: THREE.Vector3;
    headMesh?: THREE.Mesh;
    fallenTime: number; // elapsed time when lamp fell, used for 10s respawn
}

export interface DestructibleTreeObject {
    group: THREE.Group;
    topGroup: THREE.Group;
    basePos: THREE.Vector3;
    isFalling: boolean;
    isFallen: boolean;
    fallProgress: number;
    fallAxis: THREE.Vector3;
    fallenTime: number;
}

export interface RampObject {
    group: THREE.Group;
    x: number;
    z: number;
    dirAngle: number;
    length: number;
    width: number;
    peakHeight: number;
}

export interface WorldEnvironment {
    scene: THREE.Scene;
    waterMesh: THREE.Mesh;
    colliders: THREE.Box3[];
    bridges: { box: THREE.Box3; height: number }[];
    streetLamps: StreetLampObject[];
    trees: DestructibleTreeObject[];
    ramps: RampObject[];
    checkRampInteraction: (carX: number, carY: number, carZ: number, nextX: number, nextZ: number) => { isSideHit: boolean; rampHeight: number; isLaunching: boolean };
    update: (timeSec: number, delta?: number) => void;
    getGroundHeight: (x: number, z: number) => number;
    getZoneAt: (x: number, z: number) => WorldZone;
}

export function buildWorld(scene: THREE.Scene): WorldEnvironment {
    // 1. Atmosphere & Lighting
    scene.background = new THREE.Color(0x82ccdd);
    scene.fog = new THREE.FogExp2(0x82ccdd, 0.0028);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.75);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff9e6, 1.2);
    dirLight.position.set(120, 180, 100);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 500;
    const d = 180;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    const colliders: THREE.Box3[] = [];
    const bridges: { box: THREE.Box3; height: number }[] = [];

    // 2. Base Terrains
    // West Ground: City Base (Darker Grass / Urban soil)
    const cityGroundGeo = new THREE.PlaneGeometry(350, 600);
    const cityGroundMat = new THREE.MeshStandardMaterial({ color: 0x3d4a3e, roughness: 0.9 });
    const cityGround = new THREE.Mesh(cityGroundGeo, cityGroundMat);
    cityGround.rotation.x = -Math.PI / 2;
    cityGround.position.set(-215, 0, 0);
    cityGround.receiveShadow = true;
    scene.add(cityGround);

    // East Ground: Forest Base (Rich lush Green)
    const forestGroundGeo = new THREE.PlaneGeometry(350, 600);
    const forestGroundMat = new THREE.MeshStandardMaterial({ color: 0x276749, roughness: 0.95 });
    const forestGround = new THREE.Mesh(forestGroundGeo, forestGroundMat);
    forestGround.rotation.x = -Math.PI / 2;
    forestGround.position.set(215, 0, 0);
    forestGround.receiveShadow = true;
    scene.add(forestGround);

    // River Bed (Depressed Sandy Channel)
    const riverBedGeo = new THREE.PlaneGeometry(90, 600);
    const riverBedMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.9 });
    const riverBed = new THREE.Mesh(riverBedGeo, riverBedMat);
    riverBed.rotation.x = -Math.PI / 2;
    riverBed.position.set(0, -1.8, 0);
    scene.add(riverBed);

    // River Water Surface
    const waterGeo = new THREE.PlaneGeometry(86, 600, 32, 32);
    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x0984e3,
        roughness: 0.1,
        metalness: 0.8,
        transparent: true,
        opacity: 0.85
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(0, -0.4, 0);
    scene.add(waterMesh);

    // 3. Roads in City Zone
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e242b, roughness: 0.85 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xffd32a });

    function addRoadSegment(cx: number, cz: number, w: number, l: number, rotY = 0) {
        const road = new THREE.Mesh(new THREE.PlaneGeometry(w, l), roadMat);
        road.rotation.x = -Math.PI / 2;
        road.rotation.z = rotY;
        road.position.set(cx, 0.05, cz);
        road.receiveShadow = true;
        scene.add(road);

        // Center dashed line
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.3, l), yellowLineMat);
        line.rotation.x = -Math.PI / 2;
        line.rotation.z = rotY;
        line.position.set(cx, 0.06, cz);
        scene.add(line);
    }

    // Main Avenue (from bridge X= -40 westward to X= -350 at Z=0)
    addRoadSegment(-180, 0, 16, 280, Math.PI / 2);
    // North Boulevard (at Z = 120)
    addRoadSegment(-180, 120, 14, 280, Math.PI / 2);
    // South Boulevard (at Z = -120)
    addRoadSegment(-180, -120, 14, 280, Math.PI / 2);

    // Cross Streets (North-South in City)
    addRoadSegment(-80, 0, 14, 320, 0);
    addRoadSegment(-160, 0, 14, 320, 0);
    addRoadSegment(-240, 0, 14, 320, 0);

    // 4. City Buildings & Decor
    const buildingColors = [0x34495e, 0x2c3e50, 0x7f8c8d, 0x1e272e, 0x485460, 0x2d3436];
    const cityBlocks = [
        { x: -120, z: 60 }, { x: -120, z: -60 },
        { x: -200, z: 60 }, { x: -200, z: -60 },
        { x: -120, z: 180 }, { x: -120, z: -180 },
        { x: -200, z: 180 }, { x: -200, z: -180 },
        { x: -280, z: 0 }, { x: -280, z: 120 }, { x: -280, z: -120 }
    ];

    cityBlocks.forEach((block, idx) => {
        const w = 24 + (idx % 3) * 6;
        const d = 24 + ((idx * 2) % 4) * 6;
        const h = 25 + (idx % 5) * 16;
        const col = buildingColors[idx % buildingColors.length];
        const b = createBuilding(w, d, h, col);
        b.position.set(block.x, 0, block.z);
        scene.add(b);

        // Building collision box
        const bbox = new THREE.Box3().setFromObject(b);
        colliders.push(bbox);
    });

    // Street Lamps along city roads (Collapsible when hit by car!)
    const streetLamps: StreetLampObject[] = [];
    for (let z = -140; z <= 140; z += 40) {
        [-72, -88, -152, -168].forEach(x => {
            const lamp = createStreetLamp();
            lamp.position.set(x, 0, z);
            lamp.rotation.y = x > -100 ? -Math.PI / 2 : Math.PI / 2;
            scene.add(lamp);

            streetLamps.push({
                group: lamp,
                basePos: new THREE.Vector3(x, 0, z),
                isFalling: false,
                isFallen: false,
                fallProgress: 0,
                fallAxis: new THREE.Vector3(1, 0, 0),
                headMesh: lamp.userData?.head,
                fallenTime: 0
            });
        });
    }

    // 5. River Bridges & Crossings (Flush at road height Y = 0.05, no flying ramps!)
    // Bridge 1: Central Suspension Bridge (Z = 0)
    const centralBridge = createSuspensionBridge(100, 15);
    centralBridge.position.set(0, 0, 0);
    centralBridge.rotation.y = Math.PI / 2;
    scene.add(centralBridge);
    const bridgeBox1 = new THREE.Box3(
        new THREE.Vector3(-55, -0.5, -8),
        new THREE.Vector3(55, 3.0, 8)
    );
    bridges.push({ box: bridgeBox1, height: 0.05 });

    // Bridge 2: North Border Checkpoint & Bridge (Z = 120)
    const northBridge = createSuspensionBridge(100, 13);
    northBridge.position.set(0, 0, 120);
    northBridge.rotation.y = Math.PI / 2;
    scene.add(northBridge);

    const borderCheckpoint = createBorderCheckpoint(16);
    borderCheckpoint.position.set(-42, 0, 120);
    borderCheckpoint.rotation.y = Math.PI / 2;
    scene.add(borderCheckpoint);

    const bridgeBox2 = new THREE.Box3(
        new THREE.Vector3(-55, -0.5, 112),
        new THREE.Vector3(55, 3.0, 128)
    );
    bridges.push({ box: bridgeBox2, height: 0.05 });

    // Bridge 3: South Timber Bridge (Z = -120)
    const timberBridge = createSuspensionBridge(100, 11);
    timberBridge.position.set(0, 0, -120);
    timberBridge.rotation.y = Math.PI / 2;
    scene.add(timberBridge);
    const bridgeBox3 = new THREE.Box3(
        new THREE.Vector3(-55, -0.5, -126),
        new THREE.Vector3(55, 3.0, -114)
    );
    bridges.push({ box: bridgeBox3, height: 0.05 });

    // 5b. Map Perimeter Barriers (Cannot drive out of the map!)
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x4b6584, roughness: 0.65, metalness: 0.25 });
    const barrierStripeMat = new THREE.MeshBasicMaterial({ color: 0xff4757 });

    function addPerimeterFence(cx: number, cz: number, width: number, length: number) {
        const fence = new THREE.Mesh(new THREE.BoxGeometry(width, 2.0, length), barrierMat);
        fence.position.set(cx, 1.0, cz);
        scene.add(fence);

        const stripeW = width > length ? width : 0.45;
        const stripeL = width > length ? 0.45 : length;
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(stripeW, 0.4, stripeL), barrierStripeMat);
        stripe.position.set(cx, 1.4, cz);
        scene.add(stripe);

        colliders.push(new THREE.Box3().setFromObject(fence));
    }

    // West map boundary
    addPerimeterFence(-365, 0, 4, 560);
    // East map boundary
    addPerimeterFence(365, 0, 4, 560);
    // North map boundary
    addPerimeterFence(0, 275, 734, 4);
    // South map boundary
    addPerimeterFence(0, -275, 734, 4);

    // 6. Forest Zone (East, X > 40)
    // Dirt Road leading from bridges into forest
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x582f0e, roughness: 0.95 });
    function addDirtTrack(cx: number, cz: number, w: number, l: number, rotY = 0) {
        const road = new THREE.Mesh(new THREE.PlaneGeometry(w, l), dirtMat);
        road.rotation.x = -Math.PI / 2;
        road.rotation.z = rotY;
        road.position.set(cx, 0.05, cz);
        road.receiveShadow = true;
        scene.add(road);
    }
    // Main trail from central bridge eastward
    addDirtTrack(160, 0, 14, 240, Math.PI / 2);
    // Forest trail to north border
    addDirtTrack(160, 120, 12, 240, Math.PI / 2);
    // Forest trail to south timber bridge
    addDirtTrack(160, -120, 12, 240, Math.PI / 2);
    // Connecting trail in forest
    addDirtTrack(160, 0, 12, 260, 0);

    // Forest Trees & Nature clusters
    const treePositions: { x: number; z: number; type: 'pine' | 'oak'; scale: number }[] = [];
    for (let i = 0; i < 90; i++) {
        const x = 60 + Math.random() * 240;
        const z = -220 + Math.random() * 440;
        // Avoid planting right in the middle of dirt tracks
        const onMainTrack = Math.abs(z) < 10 || Math.abs(z - 120) < 10 || Math.abs(z + 120) < 10;
        const onCrossTrack = Math.abs(x - 160) < 10;
        if (!onMainTrack && !onCrossTrack) {
            treePositions.push({
                x,
                z,
                type: Math.random() > 0.4 ? 'pine' : 'oak',
                scale: 0.8 + Math.random() * 0.7
            });
        }
    }

    const trees: DestructibleTreeObject[] = [];
    treePositions.forEach(t => {
        const tree = t.type === 'pine' ? createPineTree(t.scale) : createOakTree(t.scale);
        tree.position.set(t.x, 0, t.z);
        scene.add(tree);

        const top = (tree.userData?.top as THREE.Group) || tree;
        trees.push({
            group: tree,
            topGroup: top,
            basePos: new THREE.Vector3(t.x, 0, t.z),
            isFalling: false,
            isFallen: false,
            fallProgress: 0,
            fallAxis: new THREE.Vector3(1, 0, 0),
            fallenTime: 0
        });
    });

    // Forest Rocks
    for (let r = 0; r < 25; r++) {
        const rx = 65 + Math.random() * 230;
        const rz = -200 + Math.random() * 400;
        const rock = createRock(1.0 + Math.random() * 1.5);
        rock.position.set(rx, 0, rz);
        scene.add(rock);
    }

    // 7. Jump Ramps scattered beside roads (parallel to roads on the right side)
    // User: "liiguta rambid tee kõrvale ja teega paralelseks kui sõidan autoteel ja natuke teelt välja paremale põõran siis ma saan kohe rambile sõita"
    // User: "kui ma sõidan rambile küljepealt jääb auto seisma ja aga kui ma lähen õigest kohast siis lendan"
    const rampDefs = [
        // City: Main Avenue Eastbound (Road at Z = 0, driving East, right side is +Z)
        { x: -110, z: 12.0, dirAngle: Math.PI / 2, length: 14, width: 6.5, peakHeight: 3.2 },
        // City: Main Avenue Westbound (Road at Z = 0, driving West, right side is -Z)
        { x: -180, z: -12.0, dirAngle: -Math.PI / 2, length: 14, width: 6.5, peakHeight: 3.2 },
        // City: North Boulevard Eastbound (Road at Z = 120, driving East, right side is +Z)
        { x: -130, z: 130.5, dirAngle: Math.PI / 2, length: 13, width: 6.5, peakHeight: 3.0 },
        // City: South Boulevard Westbound (Road at Z = -120, driving West, right side is -Z)
        { x: -190, z: -130.5, dirAngle: -Math.PI / 2, length: 13, width: 6.5, peakHeight: 3.0 },
        // City: Cross Street 1 Northbound (Road at X = -80, driving North, right side is -X)
        { x: -90.5, z: -40, dirAngle: 0, length: 13, width: 6.5, peakHeight: 3.0 },
        // City: Cross Street 2 Southbound (Road at X = -160, driving South, right side is +X)
        { x: -149.5, z: 40, dirAngle: Math.PI, length: 13, width: 6.5, peakHeight: 3.0 },
        // Forest: Central dirt trail Eastbound (Trail at Z = 0, driving East, right side is +Z)
        { x: 130, z: 10.5, dirAngle: Math.PI / 2, length: 14, width: 6.5, peakHeight: 3.2 },
        // Forest: South dirt trail Westbound (Trail at Z = -120, driving West, right side is -Z)
        { x: 210, z: -130.5, dirAngle: -Math.PI / 2, length: 14, width: 6.5, peakHeight: 3.2 }
    ];

    const rampMat = new THREE.MeshStandardMaterial({ color: 0xff9f43, roughness: 0.5, metalness: 0.2 });
    const sideWallMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.7, metalness: 0.3 });
    const hazardYellowMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
    const hazardBlackMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const rampStripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const rampWarningMat = new THREE.MeshBasicMaterial({ color: 0xff4757 });

    const rampObjects: RampObject[] = [];

    rampDefs.forEach((def, idx) => {
        const rampGroup = new THREE.Group();
        rampGroup.name = 'Ramp_' + idx;

        const hl = def.length / 2;
        const hw = def.width / 2;
        const h = def.peakHeight;

        // Custom BufferGeometry for ramp wedge (drive slope + solid side walls)
        const vertices = new Float32Array([
            // Slope (drive surface)
            -hw, 0, -hl,   hw, 0, -hl,   hw, h,  hl,
            -hw, 0, -hl,   hw, h,  hl,  -hw, h,  hl,
            // Left side wall
            -hw, 0, -hl,  -hw, h,  hl,  -hw, 0,  hl,
            // Right side wall
            hw, 0, -hl,   hw, 0,  hl,   hw, h,  hl,
            // Back cliff drop
            -hw, 0,  hl,  -hw, h,  hl,   hw, h,  hl,
            -hw, 0,  hl,   hw, h,  hl,   hw, 0,  hl,
            // Bottom
            -hw, 0, -hl,  -hw, 0,  hl,   hw, 0,  hl,
            -hw, 0, -hl,   hw, 0,  hl,   hw, 0, -hl
        ]);
        const wedgeGeo = new THREE.BufferGeometry();
        wedgeGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        wedgeGeo.computeVertexNormals();

        const wedgeMesh = new THREE.Mesh(wedgeGeo, rampMat);
        wedgeMesh.castShadow = true;
        wedgeMesh.receiveShadow = true;
        rampGroup.add(wedgeMesh);

        // Side Barrier Hazard Stripes (Left & Right walls clearly signal solid side-obstacle!)
        [-hw - 0.02, hw + 0.02].forEach((wallX) => {
            const numStripes = 6;
            for (let s = 0; s < numStripes; s++) {
                const zRel = -hl + (s + 0.5) * (def.length / numStripes);
                const t = (zRel + hl) / def.length;
                const stripeHeight = Math.max(0.4, t * h * 0.9);
                const stripeGeo = new THREE.PlaneGeometry(def.length / (numStripes * 1.3), stripeHeight);
                const stripeMesh = new THREE.Mesh(stripeGeo, s % 2 === 0 ? hazardYellowMat : hazardBlackMat);
                stripeMesh.position.set(wallX, stripeHeight / 2, zRel);
                stripeMesh.rotation.y = wallX > 0 ? Math.PI / 2 : -Math.PI / 2;
                rampGroup.add(stripeMesh);
            }
        });

        // Back warning chevrons
        for (let s = 0; s < 3; s++) {
            const stripeGeo = new THREE.PlaneGeometry(def.width * 0.8, 0.35);
            const stripe = new THREE.Mesh(stripeGeo, s % 2 === 0 ? rampWarningMat : rampStripeMat);
            stripe.position.set(0, h * (0.25 + s * 0.25), hl + 0.02);
            rampGroup.add(stripe);
        }

        // Glowing uphill arrow on slope
        const arrowGeo = new THREE.PlaneGeometry(2.0, 4.0);
        const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
        const arrow = new THREE.Mesh(arrowGeo, arrowMat);
        const slopeAngle = Math.atan2(h, def.length);
        arrow.rotation.x = -(Math.PI / 2 - slopeAngle);
        arrow.position.set(0, h * 0.35, -hl * 0.1);
        rampGroup.add(arrow);

        // Support pillars under peak
        [-hw + 0.5, hw - 0.5].forEach(pillarX => {
            const pillarGeo = new THREE.CylinderGeometry(0.18, 0.18, h, 8);
            const pillar = new THREE.Mesh(pillarGeo, sideWallMat);
            pillar.position.set(pillarX, h / 2, hl - 0.2);
            rampGroup.add(pillar);
        });

        // Position & orient in world
        rampGroup.position.set(def.x, 0, def.z);
        rampGroup.rotation.y = def.dirAngle;
        rampGroup.updateMatrixWorld(true);
        scene.add(rampGroup);

        rampObjects.push({
            group: rampGroup,
            x: def.x,
            z: def.z,
            dirAngle: def.dirAngle,
            length: def.length,
            width: def.width,
            peakHeight: def.peakHeight
        });
    });

    const checkRampInteraction = (
        carX: number,
        carY: number,
        carZ: number,
        nextX: number,
        nextZ: number
    ): { isSideHit: boolean; rampHeight: number; isLaunching: boolean } => {
        const testPos = new THREE.Vector3();
        for (const ramp of rampObjects) {
            testPos.set(nextX, carY, nextZ);
            const pLocal = ramp.group.worldToLocal(testPos);
            const hl = ramp.length / 2;
            const hw = ramp.width / 2;

            // Check if car intersects ramp boundary box
            if (Math.abs(pLocal.x) <= hw + 0.4 && pLocal.z >= -hl - 0.3 && pLocal.z <= hl + 0.4) {
                const t = THREE.MathUtils.clamp((pLocal.z + hl) / ramp.length, 0, 1);
                const slopeHeight = t * ramp.peakHeight;

                // Entering from low ground base or already driving along slope
                const isBaseEntrance = pLocal.z <= -hl + 1.6;
                const isOnSlope = carY >= slopeHeight - 0.35;

                if (isBaseEntrance || isOnSlope) {
                    const isLaunching = pLocal.z >= hl - 0.5;
                    return { isSideHit: false, rampHeight: slopeHeight, isLaunching };
                } else {
                    // Car hit the solid side wall of the ramp or rear cliff
                    return { isSideHit: true, rampHeight: 0, isLaunching: false };
                }
            }
        }
        return { isSideHit: false, rampHeight: 0, isLaunching: false };
    };

    return {
        scene,
        waterMesh,
        colliders,
        bridges,
        streetLamps,
        trees,
        ramps: rampObjects,
        checkRampInteraction,
        update: (timeSec: number, delta = 0.016) => {
            // Subtle water wave ripple
            if (waterMesh) {
                waterMesh.position.y = -0.4 + Math.sin(timeSec * 2.0) * 0.08;
            }

            // Animate falling street lamps when crashed into & respawn after 10s
            for (const lamp of streetLamps) {
                if (lamp.isFalling) {
                    lamp.fallProgress += delta * 3.5;
                    const progress = Math.min(lamp.fallProgress, 1.0);
                    const angle = progress * (Math.PI / 2.05);
                    lamp.group.setRotationFromAxisAngle(lamp.fallAxis, angle);
                    if (progress >= 1.0) {
                        lamp.isFalling = false;
                        lamp.isFallen = true;
                        lamp.fallenTime = timeSec;
                        const headMat = lamp.group.userData?.headMat as THREE.MeshStandardMaterial | undefined;
                        if (headMat) {
                            headMat.emissive?.setHex(0x111111);
                            headMat.color?.setHex(0x222222);
                        }
                    }
                } else if (lamp.isFallen && lamp.fallenTime > 0 && timeSec - lamp.fallenTime >= 10.0) {
                    // Respawn: stand the lamp back up after 10 seconds
                    lamp.isFallen = false;
                    lamp.fallProgress = 0;
                    lamp.fallenTime = 0;
                    lamp.group.rotation.set(0, lamp.group.rotation.y, 0);
                    lamp.group.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0), 0);
                    lamp.group.position.copy(lamp.basePos);
                    // Restore lamp head light
                    const headMat = lamp.group.userData?.headMat as THREE.MeshStandardMaterial | undefined;
                    if (headMat) {
                        headMat.emissive?.setHex(0xffeaa7);
                        headMat.color?.setHex(0xffeaa7);
                    }
                }
            }

            // Animate breaking trees when crashed into (breaks into 2 pieces) & respawn after 10s
            for (const tree of trees) {
                if (tree.isFalling) {
                    tree.fallProgress += delta * 3.5;
                    const progress = Math.min(tree.fallProgress, 1.0);
                    const angle = progress * (Math.PI / 2.05);
                    tree.topGroup.setRotationFromAxisAngle(tree.fallAxis, angle);
                    if (progress >= 1.0) {
                        tree.isFalling = false;
                        tree.isFallen = true;
                        tree.fallenTime = timeSec;
                    }
                } else if (tree.isFallen && tree.fallenTime > 0 && timeSec - tree.fallenTime >= 10.0) {
                    // Respawn: stand the tree back up on stump in 1 piece after 10 seconds
                    tree.isFallen = false;
                    tree.fallProgress = 0;
                    tree.fallenTime = 0;
                    tree.topGroup.rotation.set(0, 0, 0);
                }
            }
        },
        getGroundHeight: (x: number, z: number): number => {
            // Check if car is on any of the bridges
            for (const b of bridges) {
                if (b.box.containsPoint(new THREE.Vector3(x, 0.5, z))) {
                    return b.height;
                }
            }

            // Check if car is on any ramp slope
            const p = new THREE.Vector3(x, 0, z);
            for (const ramp of rampObjects) {
                const pLocal = ramp.group.worldToLocal(p.clone());
                const hl = ramp.length / 2;
                const hw = ramp.width / 2;
                if (Math.abs(pLocal.x) <= hw && pLocal.z >= -hl && pLocal.z <= hl) {
                    const t = THREE.MathUtils.clamp((pLocal.z + hl) / ramp.length, 0, 1);
                    return t * ramp.peakHeight;
                }
            }

            // River area without bridge = in river!
            if (x > -42 && x < 42) {
                return -1.0;
            }

            // Normal ground
            return 0.0;
        },
        getZoneAt: (x: number, z: number): WorldZone => {
            for (const b of bridges) {
                if (b.box.containsPoint(new THREE.Vector3(x, 0.5, z))) {
                    if (Math.abs(z - 120) < 15) return 'border';
                    return 'bridge';
                }
            }
            if (x < -45) return 'city';
            if (x > 45) return 'forest';
            return 'river';
        }
    };
}
