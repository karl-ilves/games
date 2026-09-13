import * as THREE from 'three';
import { MapId } from '../types';
import { MAP_CATALOG } from '../catalog';
import {
    getWoodPlankTexture,
    getMarbleTileTexture,
    getCarpetFabricTexture,
    getDiamondSteelTexture,
    getSandRippleTexture,
    getDamascusSteelTexture
} from './textures';

export interface MapBuildContext {
    mansionGroup: THREE.Group;
    mapColliders: THREE.Box3[];
    wallMeshes: THREE.Mesh[];
}

export function buildLobby(): THREE.Group {
    const lobbyGroup = new THREE.Group();
    lobbyGroup.position.set(0, 0, 150);

        const floorGeo = new THREE.BoxGeometry(40, 1, 40);
        const floorMat = new THREE.MeshStandardMaterial({ 
            map: getMarbleTileTexture(), 
            roughness: 0.25, 
            metalness: 0.22 
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        lobbyGroup.add(floor);

        // Neon Floor Perimeter Accent Strip
        const neonMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
        const stripN = new THREE.Mesh(new THREE.BoxGeometry(38, 0.04, 0.15), neonMat);
        stripN.position.set(0, 0.02, -19);
        lobbyGroup.add(stripN);
        const stripS = new THREE.Mesh(new THREE.BoxGeometry(38, 0.04, 0.15), neonMat);
        stripS.position.set(0, 0.02, 19);
        lobbyGroup.add(stripS);

        // Lobby Glass & Walls
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x2e243d, roughness: 0.5 });
        const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x00f2fe, transmission: 0.8, opacity: 0.6, transparent: true, roughness: 0.1 });

        // Outer walls
        const wallN = new THREE.Mesh(new THREE.BoxGeometry(40, 10, 1), wallMat);
        wallN.position.set(0, 5, -20);
        lobbyGroup.add(wallN);

        const wallS = new THREE.Mesh(new THREE.BoxGeometry(40, 10, 1), wallMat);
        wallS.position.set(0, 5, 20);
        lobbyGroup.add(wallS);

        const wallW = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 40), glassMat);
        wallW.position.set(-20, 5, 0);
        lobbyGroup.add(wallW);

        const wallE = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 40), glassMat);
        wallE.position.set(20, 5, 0);
        lobbyGroup.add(wallE);

        // Center Hologram Decorative Floor Ring (Flush with floor so players and bots walk freely)
        const pedGeo = new THREE.CylinderGeometry(3.5, 3.8, 0.08, 32);
        const pedMat = new THREE.MeshStandardMaterial({ color: 0xff2e63, emissive: 0x330011, roughness: 0.2 });
        const pedestal = new THREE.Mesh(pedGeo, pedMat);
        pedestal.position.set(0, 0.04, 0);
        pedestal.receiveShadow = true;
        lobbyGroup.add(pedestal);

        // Floating Logo / Knife Icon above center platform
        const holoGeo = new THREE.OctahedronGeometry(1.2, 0);
        const holoMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, emissive: 0xff9f1a, wireframe: true });
        const holo = new THREE.Mesh(holoGeo, holoMat);
        holo.position.set(0, 3.5, 0);
        lobbyGroup.add(holo);

        // Lobby Corner Recessed Downlights
        [[-14, -14], [14, -14], [-14, 14], [14, 14]].forEach(([lx, lz]) => {
            const downlight = new THREE.PointLight(0x00f2fe, 1.2, 22);
            downlight.position.set(lx, 8, lz);
            lobbyGroup.add(downlight);
        });

        // Lobby Central Accent Point Light
        const lobbyLight = new THREE.PointLight(0xff2e63, 1.8, 30);
        lobbyLight.position.set(0, 7, 0);
        lobbyGroup.add(lobbyLight);

    return lobbyGroup;
}

export class MapBuilder {
    private ctx: MapBuildContext;

    constructor(ctx: MapBuildContext) {
        this.ctx = ctx;
    }

    public getWoodPlankTexture() { return getWoodPlankTexture(); }
    public getMarbleTileTexture() { return getMarbleTileTexture(); }
    public getCarpetFabricTexture() { return getCarpetFabricTexture(); }
    public getDiamondSteelTexture() { return getDiamondSteelTexture(); }
    public getSandRippleTexture() { return getSandRippleTexture(); }
    public getDamascusSteelTexture() { return getDamascusSteelTexture(); }

    public get mansionGroup() { return this.ctx.mansionGroup; }
    public get mapColliders() { return this.ctx.mapColliders; }
    public get wallMeshes() { return this.ctx.wallMeshes; }

    private createMapWall(w: number, h: number, d: number, x: number, y: number, z: number, color = 0x241d24, hasCollider = true): THREE.Mesh {
        const wallMat = new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
        wall.position.set(x, y, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        this.mansionGroup.add(wall);
        this.wallMeshes.push(wall);

        if (hasCollider) {
            const box = new THREE.Box3().setFromObject(wall);
            this.mapColliders.push(box);
        }
        return wall;
    }

    // Helper to create framed gallery artwork
    private createFramedPainting(w: number, h: number, x: number, y: number, z: number, rotY: number, artColor: number = 0x8e44ad): THREE.Group {
        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.rotation.y = rotY;

        // Gilded / Dark Wood Frame
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 });
        const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, h + 0.3, 0.12), frameMat);
        group.add(frame);

        // Canvas Surface
        const canvasMat = new THREE.MeshStandardMaterial({ color: artColor, roughness: 0.85 });
        const canvas = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.14), canvasMat);
        group.add(canvas);

        this.mansionGroup.add(group);
        return group;
    }

    // Helper to create potted luxury ficus/palm plant
    private createPottedPlant(x: number, y: number, z: number): THREE.Group {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        // Ceramic Pot
        const potMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.3 });
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.35, 0.9, 16), potMat);
        pot.position.y = 0.45;
        group.add(pot);

        // Soil
        const soilMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.9 });
        const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.1, 16), soilMat);
        soil.position.y = 0.85;
        group.add(soil);

        // Foliage Sphere Clusters
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.6 });
        const leaves1 = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 12), leafMat);
        leaves1.position.set(0, 1.45, 0);
        leaves1.scale.set(1.0, 1.2, 1.0);
        group.add(leaves1);

        const leaves2 = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 10), leafMat);
        leaves2.position.set(0.2, 1.9, 0.1);
        group.add(leaves2);

        this.mansionGroup.add(group);
        return group;
    }

    // 1. HOTEL 2: Multi-floor grand hotel with lobby, reception, rooms, and mezzanine
    private buildHotel2Map() {
        // Floor: Polished hotel marble & dark oak with procedural marble tile texture
        const marbleTex = this.getMarbleTileTexture();
        const floorGeo = new THREE.BoxGeometry(92, 1, 92);
        const floorMat = new THREE.MeshStandardMaterial({ 
            map: marbleTex, 
            roughness: 0.22, 
            metalness: 0.15 
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.mansionGroup.add(floor);

        // Center Red Velvet Carpet across grand lobby with rich fabric texture
        const carpetTex = this.getCarpetFabricTexture();
        const carpetGeo = new THREE.BoxGeometry(14, 0.08, 65);
        const carpetMat = new THREE.MeshStandardMaterial({ 
            map: carpetTex, 
            roughness: 0.85, 
            metalness: 0.05 
        });
        const carpet = new THREE.Mesh(carpetGeo, carpetMat);
        carpet.position.set(0, 0.05, 0);
        carpet.receiveShadow = true;
        this.mansionGroup.add(carpet);

        // Perimeter Walls
        this.createMapWall(92, 14, 2, 0, 7, -46, 0x1f1924);
        this.createMapWall(92, 14, 2, 0, 7, 46, 0x1f1924);
        this.createMapWall(2, 14, 92, -46, 7, 0, 0x1f1924);
        this.createMapWall(2, 14, 92, 46, 7, 0, 0x1f1924);

        // Hotel Reception Desk (North Center) with polished wood and brass trim
        const desk = new THREE.Mesh(new THREE.BoxGeometry(18, 2.2, 4), new THREE.MeshStandardMaterial({ color: 0x4a2c17, roughness: 0.25 }));
        desk.position.set(0, 1.1, -36);
        desk.castShadow = true;
        this.mansionGroup.add(desk);
        this.wallMeshes.push(desk);
        this.mapColliders.push(new THREE.Box3().setFromObject(desk));

        // Reception Desk Accessories: Brass Service Bell & Check-in Laptop
        const bell = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.22, 12), new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.15 }));
        bell.position.set(-2.5, 2.32, -36);
        this.mansionGroup.add(bell);

        const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.6), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 }));
        laptopBase.position.set(0, 2.24, -36);
        this.mansionGroup.add(laptopBase);

        const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 0.04), new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00a8ff, emissiveIntensity: 0.6 }));
        laptopScreen.position.set(0, 2.52, -36.26);
        laptopScreen.rotation.x = -0.2;
        this.mansionGroup.add(laptopScreen);

        // Hotel Key Rack / Back Wall
        this.createMapWall(22, 6, 1.5, 0, 3, -42, 0x2b1c11);

        // Hotel Grand Pillars with Fluted Tops
        const pillarGeo = new THREE.CylinderGeometry(1.2, 1.4, 14, 16);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x4d3e52, roughness: 0.3 });
        [[-18, -18], [18, -18], [-18, 18], [18, 18], [-18, 0], [18, 0], [0, -18], [0, 18]].forEach(([px, pz]) => {
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(px, 7, pz);
            pillar.castShadow = true;
            this.mansionGroup.add(pillar);
            this.wallMeshes.push(pillar);
            this.mapColliders.push(new THREE.Box3().setFromObject(pillar));
        });

        // Hotel Suite 101 (North-West)
        this.createMapWall(18, 4, 1, -34, 2, -22, 0x443322);
        this.createMapWall(1, 4, 18, -22, 2, -34, 0x443322);
        const bed1 = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 6), new THREE.MeshStandardMaterial({ color: 0x8e1b32 }));
        bed1.position.set(-34, 1, -34);
        this.mansionGroup.add(bed1);
        this.wallMeshes.push(bed1);
        this.mapColliders.push(new THREE.Box3().setFromObject(bed1));

        // Hotel Restaurant & Dining (North-East)
        this.createMapWall(18, 4, 1, 34, 2, -22, 0x443322);
        this.createMapWall(1, 4, 18, 22, 2, -34, 0x443322);
        const diningTable = new THREE.Mesh(new THREE.BoxGeometry(16, 1.8, 4.5), new THREE.MeshStandardMaterial({ color: 0x5c3a21 }));
        diningTable.position.set(34, 0.9, -33);
        this.mansionGroup.add(diningTable);
        this.wallMeshes.push(diningTable);
        this.mapColliders.push(new THREE.Box3().setFromObject(diningTable));

        // Hotel Suite 102 (South-West)
        this.createMapWall(18, 4, 1, -34, 2, 22, 0x443322);
        this.createMapWall(1, 4, 18, -22, 2, 34, 0x443322);
        const bed2 = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 6), new THREE.MeshStandardMaterial({ color: 0x27ae60 }));
        bed2.position.set(-34, 1, 34);
        this.mansionGroup.add(bed2);
        this.wallMeshes.push(bed2);
        this.mapColliders.push(new THREE.Box3().setFromObject(bed2));

        // Hotel Lounge & Bar (South-East)
        this.createMapWall(18, 4, 1, 34, 2, 22, 0x443322);
        this.createMapWall(1, 4, 18, 22, 2, 34, 0x443322);
        const barCounter = new THREE.Mesh(new THREE.BoxGeometry(12, 2.2, 3), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.3 }));
        barCounter.position.set(34, 1.1, 33);
        this.mansionGroup.add(barCounter);
        this.wallMeshes.push(barCounter);
        this.mapColliders.push(new THREE.Box3().setFromObject(barCounter));

        // Hotel Mezzanine Balcony Walkway (2nd Floor visual structure)
        const balconyGeo = new THREE.BoxGeometry(70, 0.8, 6);
        const balconyMat = new THREE.MeshStandardMaterial({ color: 0x2e1f14, roughness: 0.5 });
        const balcony = new THREE.Mesh(balconyGeo, balconyMat);
        balcony.position.set(0, 6.5, -20);
        this.mansionGroup.add(balcony);

        // Paintings on hotel walls
        this.createFramedPainting(4.5, 3.2, -44.8, 6.5, -15, Math.PI / 2, 0xc0392b);
        this.createFramedPainting(4.5, 3.2, 44.8, 6.5, -15, -Math.PI / 2, 0x2980b9);
        this.createFramedPainting(5.0, 3.2, -44.8, 6.5, 15, Math.PI / 2, 0x27ae60);
        this.createFramedPainting(5.0, 3.2, 44.8, 6.5, 15, -Math.PI / 2, 0xf39c12);

        // Potted ficus plants in hotel corners
        this.createPottedPlant(-10, 0, -32);
        this.createPottedPlant(10, 0, -32);
        this.createPottedPlant(-14, 0, 14);
        this.createPottedPlant(14, 0, 14);

        // Grand Crystal Chandelier (Ring + Droplets)
        const chandelierRing = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.15, 12, 32), new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.15 }));
        chandelierRing.rotation.x = Math.PI / 2;
        chandelierRing.position.set(0, 11, 0);
        this.mansionGroup.add(chandelierRing);

        // Lighting: Warm luxury hotel chandelier
        const chandelier = new THREE.PointLight(0xffeedd, 3.0, 70);
        chandelier.position.set(0, 11, 0);
        this.mansionGroup.add(chandelier);

        const warmLight = new THREE.PointLight(0xff9944, 1.8, 35);
        warmLight.position.set(0, 5, -34);
        this.mansionGroup.add(warmLight);
    }

    // 2. MIL BASE: Military fortified base with hangar, barracks, radar bunker, crates
    private buildMilBaseMap() {
        // Floor: Concrete military asphalt with diamond steel texture
        const diamondTex = this.getDiamondSteelTexture();
        const floorGeo = new THREE.BoxGeometry(92, 1, 92);
        const floorMat = new THREE.MeshStandardMaterial({ 
            map: diamondTex, 
            roughness: 0.6, 
            metalness: 0.4 
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.mansionGroup.add(floor);

        // Perimeter Heavy Blast Walls (Camouflage olive/slate)
        this.createMapWall(92, 14, 2.5, 0, 7, -46, 0x1e272c);
        this.createMapWall(92, 14, 2.5, 0, 7, 46, 0x1e272c);
        this.createMapWall(2.5, 14, 92, -46, 7, 0, 0x1e272c);
        this.createMapWall(2.5, 14, 92, 46, 7, 0, 0x1e272c);

        // Central Helicopter Landing Helipad Ring
        const padGeo = new THREE.CylinderGeometry(10, 10, 0.1, 32);
        const padMat = new THREE.MeshStandardMaterial({ color: 0x3d4b52, roughness: 0.7 });
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.set(0, 0.05, 0);
        this.mansionGroup.add(pad);

        // Helipad Yellow "H" Marking
        const hBarMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.4 });
        const hLeft = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 8), hBarMat);
        hLeft.position.set(-2.5, 0.07, 0);
        this.mansionGroup.add(hLeft);
        const hRight = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 8), hBarMat);
        hRight.position.set(2.5, 0.07, 0);
        this.mansionGroup.add(hRight);
        const hCross = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.12, 1.2), hBarMat);
        hCross.position.set(0, 0.07, 0);
        this.mansionGroup.add(hCross);

        // North-West: Supply Hangar
        this.createMapWall(22, 6, 1.5, -30, 3, -22, 0x3b444b);
        this.createMapWall(1.5, 6, 22, -19, 3, -33, 0x3b444b);
        // Military Ammo Crates
        const crateMat = new THREE.MeshStandardMaterial({ color: 0x4b5320, roughness: 0.6 });
        [[-32, -32], [-35, -32], [-32, -35], [-35, -35]].forEach(([cx, cz]) => {
            const crate = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), crateMat);
            crate.position.set(cx, 1.2, cz);
            this.mansionGroup.add(crate);
            this.wallMeshes.push(crate);
            this.mapColliders.push(new THREE.Box3().setFromObject(crate));
        });

        // North-East: Command / Radar Bunker
        this.createMapWall(22, 6, 1.5, 30, 3, -22, 0x2f353b);
        this.createMapWall(1.5, 6, 22, 19, 3, -33, 0x2f353b);
        const radarConsole = new THREE.Mesh(new THREE.BoxGeometry(10, 2, 3), new THREE.MeshStandardMaterial({ color: 0x111e1e }));
        radarConsole.position.set(30, 1, -33);
        this.mansionGroup.add(radarConsole);
        this.wallMeshes.push(radarConsole);
        this.mapColliders.push(new THREE.Box3().setFromObject(radarConsole));

        // Radar Bunker Wall Map / Tactical Screen
        const screenMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00a854, emissiveIntensity: 0.7 });
        const screen = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 0.1), screenMat);
        screen.position.set(30, 4.2, -44.5);
        this.mansionGroup.add(screen);

        // Wall Fire Extinguishers in Military Base
        [-20, 20].forEach(ex => {
            const extMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.3 });
            const ext = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 12), extMat);
            ext.position.set(ex, 3, -44.8);
            this.mansionGroup.add(ext);
        });

        // South-West: Soldiers' Barracks (Bunk Beds)
        this.createMapWall(22, 6, 1.5, -30, 3, 22, 0x3b444b);
        this.createMapWall(1.5, 6, 22, -19, 3, 33, 0x3b444b);
        const bunkMat = new THREE.MeshStandardMaterial({ color: 0x2d382e });
        [-34, -28].forEach(bx => {
            const bunk = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 7), bunkMat);
            bunk.position.set(bx, 1.5, 34);
            this.mansionGroup.add(bunk);
            this.wallMeshes.push(bunk);
            this.mapColliders.push(new THREE.Box3().setFromObject(bunk));
        });

        // South-East: Armory & Weapons Depot
        this.createMapWall(22, 6, 1.5, 30, 3, 22, 0x2f353b);
        this.createMapWall(1.5, 6, 22, 19, 3, 33, 0x2f353b);
        const weaponRack = new THREE.Mesh(new THREE.BoxGeometry(12, 3.5, 2), new THREE.MeshStandardMaterial({ color: 0x15181a, metalness: 0.8 }));
        weaponRack.position.set(30, 1.75, 34);
        this.mansionGroup.add(weaponRack);
        this.wallMeshes.push(weaponRack);
        this.mapColliders.push(new THREE.Box3().setFromObject(weaponRack));

        // Military Sandbag Fortifications around center
        const sandbagMat = new THREE.MeshStandardMaterial({ color: 0x827b60, roughness: 0.9 });
        [[-8, 8], [8, 8], [-8, -8], [8, -8]].forEach(([sx, sz]) => {
            const bag = new THREE.Mesh(new THREE.BoxGeometry(6, 1.4, 1.6), sandbagMat);
            bag.position.set(sx, 0.7, sz);
            this.mansionGroup.add(bag);
            this.wallMeshes.push(bag);
            this.mapColliders.push(new THREE.Box3().setFromObject(bag));
        });

        // Harsh Tactical Floodlights
        const tacticalLight = new THREE.PointLight(0xaaccff, 2.8, 70);
        tacticalLight.position.set(0, 12, 0);
        this.mansionGroup.add(tacticalLight);

        const radarGlow = new THREE.PointLight(0x00ff88, 2.0, 28);
        radarGlow.position.set(30, 4, -33);
        this.mansionGroup.add(radarGlow);
    }

    // 3. OFFICE: Modern corporate office building with cubicles, boardroom, server room
    private buildOfficeMap() {
        // Floor: Commercial grey carpet tiles with procedural carpet texture
        const carpetTex = this.getCarpetFabricTexture();
        const floorGeo = new THREE.BoxGeometry(92, 1, 92);
        const floorMat = new THREE.MeshStandardMaterial({ 
            map: carpetTex, 
            roughness: 0.75, 
            metalness: 0.05 
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.mansionGroup.add(floor);

        // Modern White Drywall Outer Perimeter
        this.createMapWall(92, 14, 2, 0, 7, -46, 0x2c3e50);
        this.createMapWall(92, 14, 2, 0, 7, 46, 0x2c3e50);
        this.createMapWall(2, 14, 92, -46, 7, 0, 0x2c3e50);
        this.createMapWall(2, 14, 92, 46, 7, 0, 0x2c3e50);

        // Center Executive Cubicle Clusters (Partitions with desks)
        const cubicleMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.5 });
        const deskMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, roughness: 0.3 });
        const monitorMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5 });
        const chairMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.4 });
        const coffeeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });

        [[-8, -6], [8, -6], [-8, 6], [8, 6]].forEach(([cx, cz]) => {
            // Partition
            const part = new THREE.Mesh(new THREE.BoxGeometry(8, 2.8, 0.4), cubicleMat);
            part.position.set(cx, 1.4, cz);
            this.mansionGroup.add(part);
            this.wallMeshes.push(part);
            this.mapColliders.push(new THREE.Box3().setFromObject(part));

            // Desk
            const desk = new THREE.Mesh(new THREE.BoxGeometry(6, 1.4, 2.5), deskMat);
            desk.position.set(cx, 0.7, cz + (cz < 0 ? -1.5 : 1.5));
            this.mansionGroup.add(desk);
            this.wallMeshes.push(desk);
            this.mapColliders.push(new THREE.Box3().setFromObject(desk));

            // Computer monitor (Curved Ultra-wide display)
            const mon = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 0.15), monitorMat);
            mon.position.set(cx, 1.8, cz + (cz < 0 ? -1.5 : 1.5));
            this.mansionGroup.add(mon);

            // Ergonomic Office Chair
            const chair = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 1.2), chairMat);
            chair.position.set(cx, 0.7, cz + (cz < 0 ? -3.0 : 3.0));
            this.mansionGroup.add(chair);

            // Ceramic Coffee Mug on desk
            const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 10), coffeeMat);
            mug.position.set(cx + 1.8, 1.5, cz + (cz < 0 ? -1.5 : 1.5));
            this.mansionGroup.add(mug);
        });

        // North-West: Executive Boardroom
        this.createMapWall(22, 5, 1.2, -30, 2.5, -20, 0x1a252f);
        this.createMapWall(1.2, 5, 22, -19, 2.5, -31, 0x1a252f);
        const boardTable = new THREE.Mesh(new THREE.BoxGeometry(14, 1.6, 5), new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.2 }));
        boardTable.position.set(-31, 0.8, -31);
        this.mansionGroup.add(boardTable);
        this.wallMeshes.push(boardTable);
        this.mapColliders.push(new THREE.Box3().setFromObject(boardTable));

        // Boardroom Whiteboard
        const wbMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.15 });
        const whiteboard = new THREE.Mesh(new THREE.BoxGeometry(8, 3.5, 0.1), wbMat);
        whiteboard.position.set(-31, 3.5, -44.5);
        this.mansionGroup.add(whiteboard);

        // North-East: High-Tech Server Room (Glowing server racks)
        this.createMapWall(22, 5, 1.2, 30, 2.5, -20, 0x1a252f);
        this.createMapWall(1.2, 5, 22, 19, 2.5, -31, 0x1a252f);
        const serverMat = new THREE.MeshStandardMaterial({ color: 0x111820, metalness: 0.8 });
        [26, 31, 36].forEach(sx => {
            const rack = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4.5, 10), serverMat);
            rack.position.set(sx, 2.25, -32);
            this.mansionGroup.add(rack);
            this.wallMeshes.push(rack);
            this.mapColliders.push(new THREE.Box3().setFromObject(rack));
        });
        const serverLight = new THREE.PointLight(0x00d2d3, 2.2, 22);
        serverLight.position.set(31, 3, -31);
        this.mansionGroup.add(serverLight);

        // South-West: Breakroom & Coffee Bar
        this.createMapWall(22, 5, 1.2, -30, 2.5, 20, 0x1a252f);
        this.createMapWall(1.2, 5, 22, -19, 2.5, 31, 0x1a252f);
        const snackBar = new THREE.Mesh(new THREE.BoxGeometry(10, 1.8, 3), new THREE.MeshStandardMaterial({ color: 0xecf0f1 }));
        snackBar.position.set(-30, 0.9, 31);
        this.mansionGroup.add(snackBar);
        this.wallMeshes.push(snackBar);
        this.mapColliders.push(new THREE.Box3().setFromObject(snackBar));

        // Breakroom Water Cooler
        const coolerBase = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.6, 12), new THREE.MeshStandardMaterial({ color: 0xecf0f1 }));
        coolerBase.position.set(-22, 0.8, 31);
        this.mansionGroup.add(coolerBase);
        const coolerBottle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.7, 12), new THREE.MeshPhysicalMaterial({ color: 0x00d2d3, transmission: 0.8, opacity: 0.9, transparent: true }));
        coolerBottle.position.set(-22, 1.95, 31);
        this.mansionGroup.add(coolerBottle);

        // South-East: CEO Corner Office
        this.createMapWall(22, 5, 1.2, 30, 2.5, 20, 0x1a252f);
        this.createMapWall(1.2, 5, 22, 19, 2.5, 31, 0x1a252f);
        const ceoDesk = new THREE.Mesh(new THREE.BoxGeometry(8, 1.6, 4), new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.1 }));
        ceoDesk.position.set(30, 0.8, 31);
        this.mansionGroup.add(ceoDesk);
        this.wallMeshes.push(ceoDesk);
        this.mapColliders.push(new THREE.Box3().setFromObject(ceoDesk));

        // Potted plants in office lobby
        this.createPottedPlant(-16, 0, 0);
        this.createPottedPlant(16, 0, 0);

        // Office Overhead Fluorescent Lights
        const officeCeilingLight = new THREE.PointLight(0xf5f6fa, 2.8, 70);
        officeCeilingLight.position.set(0, 11, 0);
        this.mansionGroup.add(officeCeilingLight);
    }

    // 4. VACATION: Tropical island resort with golden sand, palm trees, bungalows, tiki-bar
    private buildVacationMap() {
        // Floor: Golden sand beach with procedural sand ripple texture
        const sandTex = this.getSandRippleTexture();
        const floorGeo = new THREE.BoxGeometry(92, 1, 92);
        const floorMat = new THREE.MeshStandardMaterial({ 
            map: sandTex, 
            roughness: 0.95 
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.mansionGroup.add(floor);

        // Ocean Water Border Strip (North edge)
        const waterGeo = new THREE.BoxGeometry(92, 0.8, 12);
        const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x0abde3, transmission: 0.7, opacity: 0.85, transparent: true, roughness: 0.1 });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.position.set(0, -0.2, -40);
        this.mansionGroup.add(water);

        // Resort Cliffside Perimeter Walls (Sandstone texture)
        this.createMapWall(92, 14, 2, 0, 7, -46, 0x574b90);
        this.createMapWall(92, 14, 2, 0, 7, 46, 0x8a795d);
        this.createMapWall(2, 14, 92, -46, 7, 0, 0x8a795d);
        this.createMapWall(2, 14, 92, 46, 7, 0, 0x8a795d);

        // Palm Trees (Trunk + Palm Canopy)
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6e4726, roughness: 0.8 });
        const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x2ed573, roughness: 0.5 });
        [
            [-12, -8], [12, -8], [-12, 12], [12, 12],
            [-28, -2], [28, -2], [0, 18], [0, -22]
        ].forEach(([tx, tz]) => {
            // Trunk
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 7, 8), trunkMat);
            trunk.position.set(tx, 3.5, tz);
            trunk.castShadow = true;
            this.mansionGroup.add(trunk);
            this.wallMeshes.push(trunk);
            this.mapColliders.push(new THREE.Box3().setFromObject(trunk));

            // Canopy
            const leaves = new THREE.Mesh(new THREE.ConeGeometry(3.5, 2.5, 8), palmLeafMat);
            leaves.position.set(tx, 7.5, tz);
            this.mansionGroup.add(leaves);
        });

        // Beach Bungalow 1 (North-West)
        this.createMapWall(18, 4.5, 1.2, -32, 2.25, -20, 0xa0522d);
        this.createMapWall(1.2, 4.5, 18, -21, 2.25, -31, 0xa0522d);
        const roof1 = new THREE.Mesh(new THREE.BoxGeometry(20, 1.2, 20), new THREE.MeshStandardMaterial({ color: 0xd4a373 }));
        roof1.position.set(-32, 5, -31);
        this.mansionGroup.add(roof1);

        // Beach Bungalow 2 (South-West)
        this.createMapWall(18, 4.5, 1.2, -32, 2.25, 20, 0xa0522d);
        this.createMapWall(1.2, 4.5, 18, -21, 2.25, 31, 0xa0522d);
        const roof2 = new THREE.Mesh(new THREE.BoxGeometry(20, 1.2, 20), new THREE.MeshStandardMaterial({ color: 0xd4a373 }));
        roof2.position.set(-32, 5, 31);
        this.mansionGroup.add(roof2);

        // Central Tiki Bar & Coconut Cocktails (East)
        this.createMapWall(18, 3.5, 1.2, 30, 1.75, 10, 0x8b5a2b);
        this.createMapWall(1.2, 3.5, 18, 21, 1.75, 21, 0x8b5a2b);
        const tikiCounter = new THREE.Mesh(new THREE.BoxGeometry(10, 2, 4), new THREE.MeshStandardMaterial({ color: 0xcd853f }));
        tikiCounter.position.set(30, 1, 21);
        this.mansionGroup.add(tikiCounter);
        this.wallMeshes.push(tikiCounter);
        this.mapColliders.push(new THREE.Box3().setFromObject(tikiCounter));

        // Tropical Coconut Drinks on Bar
        const coconutMat = new THREE.MeshStandardMaterial({ color: 0x553011, roughness: 0.8 });
        [28, 30, 32].forEach(dx => {
            const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), coconutMat);
            coconut.position.set(dx, 2.18, 21);
            this.mansionGroup.add(coconut);
        });

        // Propped Surfboards against Tiki Bar
        const boardColors = [0xff4757, 0x2ed573];
        [-1, 1].forEach((dir, i) => {
            const surfboard = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.6, 0.15), new THREE.MeshStandardMaterial({ color: boardColors[i] }));
            surfboard.position.set(24 + i * 2, 1.7, 9.6);
            surfboard.rotation.z = dir * 0.15;
            this.mansionGroup.add(surfboard);
        });

        // Sun Loungers & Umbrellas
        const umbrellaMat = new THREE.MeshStandardMaterial({ color: 0xff4757 });
        [[-4, -14], [4, -14], [-4, 4], [4, 4]].forEach(([ux, uz]) => {
            const lounger = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 3.8), new THREE.MeshStandardMaterial({ color: 0xffffff }));
            lounger.position.set(ux, 0.25, uz);
            this.mansionGroup.add(lounger);
            this.wallMeshes.push(lounger);
            this.mapColliders.push(new THREE.Box3().setFromObject(lounger));

            const umbPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.5, 8), trunkMat);
            umbPole.position.set(ux + 1.2, 1.75, uz);
            this.mansionGroup.add(umbPole);
            const umbTop = new THREE.Mesh(new THREE.ConeGeometry(1.8, 0.8, 8), umbrellaMat);
            umbTop.position.set(ux + 1.2, 3.6, uz);
            this.mansionGroup.add(umbTop);
        });

        // Warm Tropical Sunlight & Lanterns
        const sunLight = new THREE.PointLight(0xfff3a0, 3.0, 75);
        sunLight.position.set(0, 14, 0);
        this.mansionGroup.add(sunLight);

        const tikiLantern = new THREE.PointLight(0xff6b6b, 2.0, 32);
        tikiLantern.position.set(30, 4, 21);
        this.mansionGroup.add(tikiLantern);
    }

    // 5. YATCHY: Luxury multi-deck superyacht with bridge, dining salon, cabins, and jacuzzi
    private buildYatchyMap() {
        // Floor: Polished teak yacht decking with procedural plank texture
        const woodTex = this.getWoodPlankTexture();
        const floorGeo = new THREE.BoxGeometry(92, 1, 92);
        const floorMat = new THREE.MeshStandardMaterial({ 
            map: woodTex, 
            roughness: 0.35, 
            metalness: 0.1 
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.mansionGroup.add(floor);

        // Ocean Sea Water all around the mega-yacht hull
        const oceanGeo = new THREE.BoxGeometry(140, 0.5, 140);
        const oceanMat = new THREE.MeshStandardMaterial({ color: 0x004e92, roughness: 0.2, metalness: 0.3 });
        const ocean = new THREE.Mesh(oceanGeo, oceanMat);
        ocean.position.y = -1.0;
        this.mansionGroup.add(ocean);

        // Sleek White Yacht Hull & Stainless Steel Guard Rails
        this.createMapWall(92, 14, 2, 0, 7, -46, 0xecf0f1);
        this.createMapWall(92, 14, 2, 0, 7, 46, 0xecf0f1);
        this.createMapWall(2, 14, 92, -46, 7, 0, 0xecf0f1);
        this.createMapWall(2, 14, 92, 46, 7, 0, 0xecf0f1);

        // Captain's Bridge (North Wheelhouse with radar and helm)
        this.createMapWall(26, 5, 1.5, 0, 2.5, -30, 0x2c3e50);
        const helmConsole = new THREE.Mesh(new THREE.BoxGeometry(12, 1.8, 3), new THREE.MeshStandardMaterial({ color: 0x1e272e, metalness: 0.6 }));
        helmConsole.position.set(0, 0.9, -36);
        this.mansionGroup.add(helmConsole);
        this.wallMeshes.push(helmConsole);
        this.mapColliders.push(new THREE.Box3().setFromObject(helmConsole));

        // Yacht Steering Wheel on helm console
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x8e44ad, metalness: 0.9, roughness: 0.2 });
        const helmWheel = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 8, 20), wheelMat);
        helmWheel.position.set(0, 2.1, -35.2);
        helmWheel.rotation.x = Math.PI / 4;
        this.mansionGroup.add(helmWheel);

        // Central VIP Jacuzzi Pool (Decorative walk-in luxury pool)
        const poolBorder = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.8, 24), new THREE.MeshStandardMaterial({ color: 0xdcdde1, roughness: 0.2 }));
        poolBorder.position.set(0, 0.4, 0);
        this.mansionGroup.add(poolBorder);

        const poolWater = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.82, 24), new THREE.MeshStandardMaterial({ color: 0x00d2d3, roughness: 0.1, transparent: true, opacity: 0.7 }));
        poolWater.position.set(0, 0.42, 0);
        this.mansionGroup.add(poolWater);

        // VIP Suite Cabin A (West)
        this.createMapWall(16, 4.5, 1.2, -28, 2.25, -12, 0x34495e);
        this.createMapWall(1.2, 4.5, 16, -20, 2.25, -20, 0x34495e);
        const yachtBed1 = new THREE.Mesh(new THREE.BoxGeometry(6, 1.8, 7), new THREE.MeshStandardMaterial({ color: 0x2980b9 }));
        yachtBed1.position.set(-30, 0.9, -20);
        this.mansionGroup.add(yachtBed1);
        this.wallMeshes.push(yachtBed1);
        this.mapColliders.push(new THREE.Box3().setFromObject(yachtBed1));

        // VIP Suite Cabin B (East)
        this.createMapWall(16, 4.5, 1.2, 28, 2.25, -12, 0x34495e);
        this.createMapWall(1.2, 4.5, 16, 20, 2.25, -20, 0x34495e);
        const yachtBed2 = new THREE.Mesh(new THREE.BoxGeometry(6, 1.8, 7), new THREE.MeshStandardMaterial({ color: 0x8e44ad }));
        yachtBed2.position.set(30, 0.9, -20);
        this.mansionGroup.add(yachtBed2);
        this.wallMeshes.push(yachtBed2);
        this.mapColliders.push(new THREE.Box3().setFromObject(yachtBed2));

        // Aft Dining Salon (South Deck)
        this.createMapWall(30, 4.5, 1.2, 0, 2.25, 24, 0x2c3e50);
        const yachtTable = new THREE.Mesh(new THREE.BoxGeometry(16, 1.6, 5), new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.15 }));
        yachtTable.position.set(0, 0.8, 34);
        this.mansionGroup.add(yachtTable);
        this.wallMeshes.push(yachtTable);
        this.mapColliders.push(new THREE.Box3().setFromObject(yachtTable));

        // Champagne Bucket and Flutes on Banquet Table
        const coolerMat = new THREE.MeshStandardMaterial({ color: 0xdcdde1, metalness: 0.95, roughness: 0.1 });
        const cooler = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.5, 12), coolerMat);
        cooler.position.set(0, 1.85, 34);
        this.mansionGroup.add(cooler);

        // Yacht Deck Illumination
        const yachtLight = new THREE.PointLight(0xe0f7fa, 2.8, 70);
        yachtLight.position.set(0, 11, 0);
        this.mansionGroup.add(yachtLight);

        const jacuzziLight = new THREE.PointLight(0x00f2fe, 2.1, 20);
        jacuzziLight.position.set(0, 2.5, 0);
        this.mansionGroup.add(jacuzziLight);
    }

}
