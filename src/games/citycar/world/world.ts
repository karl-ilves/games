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
}

export interface WorldEnvironment {
    scene: THREE.Scene;
    waterMesh: THREE.Mesh;
    colliders: THREE.Box3[];
    bridges: { box: THREE.Box3; height: number }[];
    streetLamps: StreetLampObject[];
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
                headMesh: lamp.userData?.head
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

    treePositions.forEach(t => {
        const tree = t.type === 'pine' ? createPineTree(t.scale) : createOakTree(t.scale);
        tree.position.set(t.x, 0, t.z);
        scene.add(tree);

        // Trunk collision cylinder box
        const treeBox = new THREE.Box3(
            new THREE.Vector3(t.x - 0.8, 0, t.z - 0.8),
            new THREE.Vector3(t.x + 0.8, 8, t.z + 0.8)
        );
        colliders.push(treeBox);
    });

    // Forest Rocks
    for (let r = 0; r < 25; r++) {
        const rx = 65 + Math.random() * 230;
        const rz = -200 + Math.random() * 400;
        const rock = createRock(1.0 + Math.random() * 1.5);
        rock.position.set(rx, 0, rz);
        scene.add(rock);
    }

    return {
        scene,
        waterMesh,
        colliders,
        bridges,
        streetLamps,
        update: (timeSec: number, delta = 0.016) => {
            // Subtle water wave ripple
            if (waterMesh) {
                waterMesh.position.y = -0.4 + Math.sin(timeSec * 2.0) * 0.08;
            }

            // Animate falling street lamps when crashed into
            for (const lamp of streetLamps) {
                if (lamp.isFalling) {
                    lamp.fallProgress += delta * 3.5;
                    const progress = Math.min(lamp.fallProgress, 1.0);
                    const angle = progress * (Math.PI / 2.05);
                    lamp.group.setRotationFromAxisAngle(lamp.fallAxis, angle);
                    if (progress >= 1.0) {
                        lamp.isFalling = false;
                        lamp.isFallen = true;
                        const headMat = lamp.group.userData?.headMat as THREE.MeshStandardMaterial | undefined;
                        if (headMat) {
                            headMat.emissive?.setHex(0x111111);
                            headMat.color?.setHex(0x222222);
                        }
                    }
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
