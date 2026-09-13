import * as THREE from 'three';
import { planeAudio } from '../audio';

export interface CrashObstacle {
    name: string;
    type: 'ground' | 'water' | 'mountain' | 'building' | 'bridge' | 'tower' | 'ring';
    bounds: THREE.Box3;
    bonusMultiplier: number;
}

export interface MountainConfig {
    pos: [number, number, number];
    r: number;
    h: number;
    name: string;
}

export class WorldEnvironment {
    public scene: THREE.Scene;
    public obstacles: CrashObstacle[] = [];
    public mountainConfigs: MountainConfig[] = [];
    public runwayStartPosition: THREE.Vector3 = new THREE.Vector3(0, 5, 250);
    public runwayStartRotation: THREE.Euler = new THREE.Euler(0, 0, 0);

    // Destructible Control Tower State
    public isTowerDestroyed: boolean = false;
    public towerDamageLevel: 'intact' | 'cab_destroyed' | 'upper_collapse' | 'full_collapse' = 'intact';
    public towerCutHeight: number = 0;
    public towerGroup: THREE.Group = new THREE.Group();
    public towerRubbleGroup: THREE.Group = new THREE.Group();
    public towerObstacleRef: CrashObstacle | null = null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.mountainConfigs = this.generatePerimeterMountains();
        this.buildWorld();
    }

    private generatePerimeterMountains(): MountainConfig[] {
        const list: MountainConfig[] = [];

        // 1. Primary perimeter ring encircling the valley map (24 overlapping peaks)
        const ringCount = 24;
        for (let i = 0; i < ringCount; i++) {
            const angle = (i / ringCount) * Math.PI * 2;
            const dist = 2300 + Math.sin(i * 2.3) * 160 + Math.cos(i * 1.7) * 90;
            const px = Math.cos(angle) * dist;
            const pz = Math.sin(angle) * dist;
            const r = 490 + Math.sin(i * 3.1) * 70; // 420m to 560m radius (guarantees overlap)
            const h = 540 + Math.cos(i * 2.7) * 140; // 400m to 680m height
            list.push({
                pos: [Math.round(px), 5, Math.round(pz)],
                r: Math.round(r),
                h: Math.round(h),
                name: `Piirimäetipp #${i + 1}`
            });
        }

        // 2. Outer towering giant backdrop peaks (8 peaks)
        const backdropCount = 8;
        for (let j = 0; j < backdropCount; j++) {
            const angle = ((j + 0.5) / backdropCount) * Math.PI * 2;
            const dist = 2750 + Math.sin(j * 1.9) * 140;
            const px = Math.cos(angle) * dist;
            const pz = Math.sin(angle) * dist;
            const r = 580 + Math.sin(j * 2.2) * 80;
            const h = 720 + Math.cos(j * 1.5) * 160; // 560m to 880m height
            list.push({
                pos: [Math.round(px), 5, Math.round(pz)],
                r: Math.round(r),
                h: Math.round(h),
                name: `Hiidmäetipp #${j + 1}`
            });
        }

        return list;
    }

    private buildWorld(): void {
        // 1. Sky & Atmosphere
        this.scene.background = new THREE.Color(0x74b9ff);
        this.scene.fog = new THREE.FogExp2(0xa0c4ff, 0.00035);

        // Sun & Directional Lighting
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.7);
        hemiLight.position.set(0, 500, 0);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xfffaed, 1.2);
        dirLight.position.set(300, 600, 200);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 10;
        dirLight.shadow.camera.far = 1500;
        dirLight.shadow.camera.left = -500;
        dirLight.shadow.camera.right = 500;
        dirLight.shadow.camera.top = 500;
        dirLight.shadow.camera.bottom = -500;
        this.scene.add(dirLight);

        // 2. Vast Mainland Valley Ground Plane (All terrain inside mountain ring is solid land!)
        const landGeom = new THREE.PlaneGeometry(9000, 9000, 32, 32);
        landGeom.rotateX(-Math.PI / 2);
        const landMat = new THREE.MeshStandardMaterial({
            color: 0x27ae60, // Lush green valley meadow
            roughness: 0.9,
            metalness: 0.05
        });
        const mainland = new THREE.Mesh(landGeom, landMat);
        mainland.position.y = 5.0;
        this.scene.add(mainland);

        // Ground base obstacle
        this.obstacles.push({
            name: 'Maapind / Heinamaa (Valley Ground)',
            type: 'ground',
            bounds: new THREE.Box3(new THREE.Vector3(-4500, 0, -4500), new THREE.Vector3(4500, 5.2, 4500)),
            bonusMultiplier: 1.0
        });

        // 3. Airport Island & Runway
        this.buildAirport();

        // 4. Mountain Ranges & Cliffs
        this.buildMountains();

        // 5. Downtown Metropolis (Skyscrapers)
        this.buildCity();

        // 6. Aerial Stunt Rings
        this.buildStuntRings();
    }

    private buildAirport(): void {
        const islandGeom = new THREE.BoxGeometry(600, 10, 1800);
        const islandMat = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.9 });
        const island = new THREE.Mesh(islandGeom, islandMat);
        island.position.set(0, 0, 0);
        this.scene.add(island);

        // Runway Asphalt
        const rwyGeom = new THREE.BoxGeometry(100, 1, 1400);
        const rwyMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.8 });
        const runway = new THREE.Mesh(rwyGeom, rwyMat);
        runway.position.set(0, 5.2, 0);
        this.scene.add(runway);

        // Runway Centerline Stripes
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        for (let z = -600; z <= 600; z += 50) {
            const stripe = new THREE.Mesh(new THREE.PlaneGeometry(3, 25).rotateX(-Math.PI/2), stripeMat);
            stripe.position.set(0, 5.8, z);
            this.scene.add(stripe);
        }

        // Runway Obstacle
        this.obstacles.push({
            name: 'Lennurada (Runway Asphalt)',
            type: 'ground',
            bounds: new THREE.Box3(new THREE.Vector3(-55, 0, -720), new THREE.Vector3(55, 5.8, 720)),
            bonusMultiplier: 1.1
        });

        // Airport Island Obstacle
        this.obstacles.push({
            name: 'Lennuvälja saar (Airport Island)',
            type: 'ground',
            bounds: new THREE.Box3(new THREE.Vector3(-310, 0, -920), new THREE.Vector3(310, 5.2, 920)),
            bonusMultiplier: 1.0
        });

        // Destructible Airport Control Tower
        this.scene.add(this.towerGroup);
        this.scene.add(this.towerRubbleGroup);
        this.buildControlTower();

        // Aircraft Hangars
        for (let i = -1; i <= 1; i += 2) {
            const hangar = new THREE.Mesh(new THREE.CylinderGeometry(30, 30, 90, 16, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x7f8c8d }));
            hangar.rotation.z = Math.PI / 2;
            hangar.position.set(i * 180, 5, 100);
            this.scene.add(hangar);

            this.obstacles.push({
                name: `Lennukiangaar #${i > 0 ? 1 : 2}`,
                type: 'building',
                bounds: new THREE.Box3(new THREE.Vector3(i * 180 - 50, 5, 55), new THREE.Vector3(i * 180 + 50, 40, 145)),
                bonusMultiplier: 1.5
            });
        }
    }

    /**
     * Builds the standing Control Tower (115m tall) with multi-part architecture.
     */
    public buildControlTower(): void {
        // Clear previous standing tower parts
        while (this.towerGroup.children.length > 0) {
            const child = this.towerGroup.children[0];
            this.towerGroup.remove(child);
            if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        }

        const matConcrete = new THREE.MeshStandardMaterial({ color: 0xdcdde1, roughness: 0.8 });
        const matGlass = new THREE.MeshStandardMaterial({ color: 0x0984e3, metalness: 0.9, roughness: 0.1 });
        const matRoof = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.4 });
        const matSteel = new THREE.MeshStandardMaterial({ color: 0x2f3640, metalness: 0.8, roughness: 0.3 });
        const matBeaconRed = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        // 1. Lower Concrete Column (y: 5 to 45m)
        const lowerBase = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 11, 40, 14), matConcrete);
        lowerBase.position.y = 20;
        lowerBase.castShadow = true;

        // 2. Upper Shaft (y: 45 to 80m)
        const upperShaft = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 8.5, 35, 14), matConcrete);
        upperShaft.position.y = 57.5;
        upperShaft.castShadow = true;

        // 3. Catwalk Balcony (y: 75m)
        const balcony = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 2, 14), matSteel);
        balcony.position.y = 75;

        // 4. Observation Glass Cab (y: 76 to 92m)
        const cab = new THREE.Mesh(new THREE.CylinderGeometry(14, 11, 16, 14), matGlass);
        cab.position.y = 84;

        // 5. Conical Radar Canopy Roof (y: 92 to 100m)
        const roof = new THREE.Mesh(new THREE.ConeGeometry(15, 8, 14), matRoof);
        roof.position.y = 96;

        // 6. Antenna Spire & Warning Beacon (y: 100 to 115m)
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.8, 15, 8), matSteel);
        spire.position.y = 107.5;

        const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 8), matBeaconRed);
        beacon.position.y = 115;

        this.towerGroup.add(lowerBase, upperShaft, balcony, cab, roof, spire, beacon);
        this.towerGroup.position.set(130, 5, -200);
        this.towerGroup.visible = true;

        this.isTowerDestroyed = false;
        this.towerDamageLevel = 'intact';
        this.towerCutHeight = 0;

        // Register or update obstacle in list
        const towerBounds = new THREE.Box3(new THREE.Vector3(100, 5, -230), new THREE.Vector3(160, 120, -170));
        if (this.towerObstacleRef) {
            this.towerObstacleRef.bounds.copy(towerBounds);
            this.towerObstacleRef.name = 'Lennujuhtimistorn (Control Tower)';
        } else {
            this.towerObstacleRef = {
                name: 'Lennujuhtimistorn (Control Tower)',
                type: 'tower',
                bounds: towerBounds,
                bonusMultiplier: 2.5
            };
            this.obstacles.push(this.towerObstacleRef);
        }
    }

    /**
     * Inflicts realistic structural collapse on the Control Tower based on aircraft mass, velocity and exact impact height.
     * Slices the tower at the cut line: the lower stump remains standing, while the sliced upper section topples in impact direction!
     */
    public damageControlTower(planeMass: number, speedKmh: number, impactVel: THREE.Vector3, impactPointY?: number): { destroyed: boolean; damageLevel: string; cutHeight: number } {
        if (this.isTowerDestroyed) return { destroyed: true, damageLevel: this.towerDamageLevel, cutHeight: this.towerCutHeight };

        const kineticEnergy = 0.5 * planeMass * Math.pow(speedKmh / 3.6, 2);
        
        // Determine cut height Y (world coordinates: ground is y=5, cab is y=84, spire top is y=115)
        let cutY: number;
        if (typeof impactPointY === 'number' && !isNaN(impactPointY)) {
            cutY = THREE.MathUtils.clamp(impactPointY, 10, 112);
        } else {
            // Default based on plane energy if height not explicitly provided
            if (planeMass >= 15000 || kineticEnergy >= 4000000) {
                cutY = 25;
            } else if (planeMass >= 3000 || kineticEnergy >= 1400000 || speedKmh >= 250) {
                cutY = 55;
            } else {
                cutY = 82;
            }
        }

        let damageLevel: 'cab_destroyed' | 'upper_collapse' | 'full_collapse';
        if (cutY < 38) {
            damageLevel = 'full_collapse';
        } else if (cutY < 75) {
            damageLevel = 'upper_collapse';
        } else {
            damageLevel = 'cab_destroyed';
        }

        this.isTowerDestroyed = true;
        this.towerDamageLevel = damageLevel;
        this.towerCutHeight = cutY;
        planeAudio.playTowerCollapse();

        // Direction vector of impact
        const dir = new THREE.Vector3(impactVel?.x || 1, 0, impactVel?.z || 0).normalize();
        if (dir.lengthSq() < 0.01) dir.set(1, 0, 0);

        // Hide pristine standing tower
        this.towerGroup.visible = false;

        // Build dynamically sliced stump and toppled section
        this.buildTowerRubble(damageLevel, dir, cutY);

        // Update obstacle hitbox so player can fly over sliced stump or crash into remaining base
        if (this.towerObstacleRef) {
            const stumpTopY = Math.max(8, cutY);
            if (damageLevel === 'full_collapse') {
                this.towerObstacleRef.bounds.set(new THREE.Vector3(70, 5, -260), new THREE.Vector3(190, stumpTopY, -140));
                this.towerObstacleRef.name = `Täielikult purustatud torni varemed (Stump ${Math.round(stumpTopY)}m)`;
            } else if (damageLevel === 'upper_collapse') {
                this.towerObstacleRef.bounds.set(new THREE.Vector3(90, 5, -240), new THREE.Vector3(170, stumpTopY, -160));
                this.towerObstacleRef.name = `Maha lõigatud lennutorn (Sliced at ${Math.round(stumpTopY)}m)`;
            } else {
                this.towerObstacleRef.bounds.set(new THREE.Vector3(100, 5, -230), new THREE.Vector3(160, stumpTopY, -170));
                this.towerObstacleRef.name = `Lõigatud kupliga torn (Cab sheared at ${Math.round(stumpTopY)}m)`;
            }
        }

        return { destroyed: true, damageLevel, cutHeight: cutY };
    }

    /**
     * Builds realistic sliced tower stump and toppled upper section based on cut height.
     */
    private buildTowerRubble(damageLevel: string, dir: THREE.Vector3, cutY: number = 55): void {
        this.clearTowerRubble();

        const matCharred = new THREE.MeshStandardMaterial({ color: 0x242424, roughness: 0.95 });
        const matJaggedCut = new THREE.MeshStandardMaterial({ color: 0xe17055, roughness: 0.9, metalness: 0.2 }); // scorched severed rebar/concrete
        const matCrushedGlass = new THREE.MeshStandardMaterial({ color: 0x0984e3, roughness: 0.25, transparent: true, opacity: 0.85 });
        const matBentSteel = new THREE.MeshStandardMaterial({ color: 0x2f3640, roughness: 0.5, metalness: 0.8 });
        const matRoof = new THREE.MeshStandardMaterial({ color: 0xa82020, roughness: 0.7 });

        const origin = new THREE.Vector3(130, 5, -200);
        const stumpHeight = Math.max(3, cutY - origin.y);
        const toppledHeight = Math.max(10, 115 - cutY);

        // 1. Standing Jagged Stump (height from y=5 to y=cutY)
        // Interpolate stump top radius from tower profile (bottom ~11m, mid ~8m, top ~7.5m)
        const stumpRadiusBottom = 11;
        const stumpRadiusTop = THREE.MathUtils.lerp(10.5, 7.5, Math.min(1, stumpHeight / 85));
        const stump = new THREE.Mesh(new THREE.CylinderGeometry(stumpRadiusTop, stumpRadiusBottom, stumpHeight, 14), matCharred);
        stump.position.set(origin.x, origin.y + stumpHeight / 2, origin.z);
        stump.castShadow = true;
        this.towerRubbleGroup.add(stump);

        // Jagged cut rim on top of the stump
        const jaggedRim = new THREE.Mesh(new THREE.CylinderGeometry(stumpRadiusTop + 0.4, stumpRadiusTop + 0.2, 1.8, 14), matJaggedCut);
        jaggedRim.position.set(origin.x, origin.y + stumpHeight - 0.5, origin.z);
        this.towerRubbleGroup.add(jaggedRim);

        // Exposed twisted reinforcement rebar rods sticking out of the cut stump
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const rebarH = 2.5 + (i % 3) * 1.5;
            const rebar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, rebarH, 4), matBentSteel);
            const rx = Math.cos(angle) * (stumpRadiusTop - 0.8);
            const rz = Math.sin(angle) * (stumpRadiusTop - 0.8);
            rebar.position.set(origin.x + rx, origin.y + stumpHeight + rebarH / 2, origin.z + rz);
            rebar.rotation.x = (Math.random() - 0.5) * 0.4;
            rebar.rotation.z = (Math.random() - 0.5) * 0.4;
            this.towerRubbleGroup.add(rebar);
        }

        // 2. Toppled Upper Section (Length = toppledHeight, lying on ground in direction of impact dir)
        const toppledCenterDist = stumpRadiusBottom + toppledHeight * 0.5 + 4;
        const toppledRadiusTop = cutY >= 75 ? 6 : 7.5;
        const toppledCol = new THREE.Mesh(new THREE.CylinderGeometry(toppledRadiusTop, stumpRadiusTop, toppledHeight, 12), matCharred);
        toppledCol.position.set(
            origin.x + dir.x * toppledCenterDist,
            origin.y + stumpRadiusTop * 0.7,
            origin.z + dir.z * toppledCenterDist
        );
        // Lay cylinder horizontally in direction of impact
        const dirAngle = Math.atan2(dir.z, dir.x);
        toppledCol.rotation.order = 'YXZ';
        toppledCol.rotation.y = -dirAngle + Math.PI / 2;
        toppledCol.rotation.z = Math.PI / 2;
        toppledCol.castShadow = true;
        this.towerRubbleGroup.add(toppledCol);

        // 3. Smashed Cab / Roof / Spire at the far end of the toppled section if they were sheared off
        const cabDist = origin.clone().add(dir.clone().multiplyScalar(toppledCenterDist + toppledHeight * 0.48));
        if (cutY < 95) {
            // Crushed observation glass cab
            const crushedCab = new THREE.Mesh(new THREE.BoxGeometry(14, 4, 14), matCrushedGlass);
            crushedCab.position.set(cabDist.x, origin.y + 2.5, cabDist.z);
            crushedCab.rotation.y = dirAngle + 0.3;
            this.towerRubbleGroup.add(crushedCab);

            // Crumpled conical roof
            const roofDist = cabDist.clone().add(dir.clone().multiplyScalar(10));
            const crushedRoof = new THREE.Mesh(new THREE.ConeGeometry(14, 4, 10), matRoof);
            crushedRoof.position.set(roofDist.x, origin.y + 2.5, roofDist.z);
            crushedRoof.rotation.x = 1.3;
            this.towerRubbleGroup.add(crushedRoof);

            // Bent antenna mast lying on ground
            const spireDist = roofDist.clone().add(dir.clone().multiplyScalar(12));
            const bentSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 16, 6), matBentSteel);
            bentSpire.position.set(spireDist.x, origin.y + 0.8, spireDist.z);
            bentSpire.rotation.y = -dirAngle + Math.PI / 2;
            bentSpire.rotation.z = Math.PI / 2;
            this.towerRubbleGroup.add(bentSpire);
        }

        // 4. Shattered debris & concrete chunks scattered along the fall corridor
        const rubbleCount = damageLevel === 'full_collapse' ? 16 : 10;
        for (let i = 0; i < rubbleCount; i++) {
            const s = 1.8 + Math.random() * 2.8;
            const block = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.6, s), matCharred);
            const distOnPath = Math.random() * (toppledHeight + 20) + 10;
            const lateralDev = (Math.random() - 0.5) * 22;
            // perpendicular vector
            const perpX = -dir.z * lateralDev;
            const perpZ = dir.x * lateralDev;
            block.position.set(
                origin.x + dir.x * distOnPath + perpX,
                origin.y + s * 0.3,
                origin.z + dir.z * distOnPath + perpZ
            );
            block.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
            this.towerRubbleGroup.add(block);
        }

        // 5. Shattered glass fragments around impact area
        for (let i = 0; i < 8; i++) {
            const s = 1.2 + Math.random() * 2.0;
            const glass = new THREE.Mesh(new THREE.BoxGeometry(s, 0.3, s), matCrushedGlass);
            glass.position.set(
                cabDist.x + (Math.random() - 0.5) * 25,
                origin.y + 0.4,
                cabDist.z + (Math.random() - 0.5) * 25
            );
            glass.rotation.y = Math.random() * Math.PI;
            this.towerRubbleGroup.add(glass);
        }
    }

    private clearTowerRubble(): void {
        while (this.towerRubbleGroup.children.length > 0) {
            const child = this.towerRubbleGroup.children[0];
            this.towerRubbleGroup.remove(child);
            if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        }
    }

    /**
     * Rebuilds all destroyed structures (Control Tower) and restores the world to pristine condition.
     */
    public resetMap(): void {
        this.clearTowerRubble();
        this.buildControlTower();
        planeAudio.playMapRebuilt();
    }

    /**
     * Accurately returns ground elevation and terrain type at any (X, Z) coordinate.
     * All terrain inside the encircling mountain barrier is solid land (y = 5.0m)!
     */
    public getTerrainAt(x: number, z: number): { height: number; type: 'ground' | 'water' | 'mountain'; name: string } {
        // 1. Runway surface (asphalt at y = 5.7m)
        if (Math.abs(x) <= 55 && Math.abs(z) <= 720) {
            return { height: 5.7, type: 'ground', name: 'Lennurada (Runway Asphalt)' };
        }
        // 2. Encircling Mountain Barrier elevation
        const distSq = x * x + z * z;
        if (distSq >= 1400 * 1400) {
            let maxElev = 5.0;
            let peakName = '';
            for (let i = 0; i < this.mountainConfigs.length; i++) {
                const m = this.mountainConfigs[i];
                const dx = x - m.pos[0];
                const dz = z - m.pos[2];
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < m.r) {
                    const elev = m.pos[1] + m.h * (1 - dist / m.r);
                    if (elev > maxElev) {
                        maxElev = elev;
                        peakName = m.name;
                    }
                }
            }
            if (maxElev > 5.5) {
                return { height: maxElev, type: 'mountain', name: peakName || 'Mäenõlv (Mountain Barrier)' };
            }
        }
        // 4. All inner valley terrain is solid land at y = 5.0m
        return { height: 5.0, type: 'ground', name: 'Maapind / Heinamaa (Valley Ground)' };
    }

    private buildMountains(): void {
        const mountainMat = new THREE.MeshStandardMaterial({
            color: 0x4b6584,
            roughness: 0.95,
            flatShading: true
        });

        const snowMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.5
        });

        // Generate the massive ring of peaks encircling the entire map
        this.mountainConfigs.forEach((m, idx) => {
            const geom = new THREE.ConeGeometry(m.r, m.h, 9);
            geom.translate(0, m.h / 2, 0);
            const peak = new THREE.Mesh(geom, mountainMat);
            peak.position.set(m.pos[0], m.pos[1], m.pos[2]);
            this.scene.add(peak);

            // Snow cap on top 35% of peak
            const snowGeom = new THREE.ConeGeometry(m.r * 0.4, m.h * 0.35, 9);
            snowGeom.translate(0, m.h * 0.82, 0);
            const snow = new THREE.Mesh(snowGeom, snowMat);
            snow.position.set(m.pos[0], m.pos[1], m.pos[2]);
            this.scene.add(snow);

            this.obstacles.push({
                name: m.name || `Piirimäetipp #${idx + 1}`,
                type: 'mountain',
                bounds: new THREE.Box3(
                    new THREE.Vector3(m.pos[0] - m.r * 0.7, m.pos[1], m.pos[2] - m.r * 0.7),
                    new THREE.Vector3(m.pos[0] + m.r * 0.7, m.pos[1] + m.h, m.pos[2] + m.r * 0.7)
                ),
                bonusMultiplier: 1.8
            });
        });
    }

    private buildCity(): void {
        const cityOrigin = new THREE.Vector3(750, 0, 400);
        const bldgColors = [0x2c3e50, 0x34495e, 0x1e272e, 0x485460, 0x2d3436];

        // 4x4 Grid of skyscrapers
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const x = cityOrigin.x + col * 120;
                const z = cityOrigin.z + row * 120;
                const height = 150 + Math.sin(row * 3 + col * 5) * 80 + (row === 2 && col === 2 ? 140 : 0);
                const width = 55 + Math.cos(col) * 15;
                const depth = 55 + Math.sin(row) * 15;

                const bldgMat = new THREE.MeshStandardMaterial({
                    color: bldgColors[(row + col) % bldgColors.length],
                    metalness: 0.6,
                    roughness: 0.2
                });

                const bldgGeom = new THREE.BoxGeometry(width, height, depth);
                bldgGeom.translate(0, height / 2, 0);
                const bldg = new THREE.Mesh(bldgGeom, bldgMat);
                bldg.position.set(x, 0, z);
                this.scene.add(bldg);

                // Roof antenna on tallest skyscraper
                if (height > 250) {
                    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2, 60, 8), new THREE.MeshStandardMaterial({ color: 0xff4757 }));
                    spire.position.set(x, height + 30, z);
                    this.scene.add(spire);
                }

                this.obstacles.push({
                    name: `Pilvelõhkuja (${col + 1}x${row + 1})`,
                    type: 'building',
                    bounds: new THREE.Box3(
                        new THREE.Vector3(x - width / 2, 0, z - depth / 2),
                        new THREE.Vector3(x + width / 2, height, z + depth / 2)
                    ),
                    bonusMultiplier: 2.2
                });
            }
        }
    }



    private buildStuntRings(): void {
        const ringConfigs = [
            { pos: [0, 80, -300], rotY: 0 },
            { pos: [-300, 140, -700], rotY: 0.5 },
            { pos: [450, 180, 200], rotY: -0.3 },
            { pos: [-500, 70, 500], rotY: Math.PI / 2 }
        ];

        ringConfigs.forEach((r, idx) => {
            const ringGeom = new THREE.TorusGeometry(20, 2, 10, 24);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0xff9f43 });
            const ring = new THREE.Mesh(ringGeom, ringMat);
            ring.position.set(r.pos[0], r.pos[1], r.pos[2]);
            ring.rotation.y = r.rotY;
            this.scene.add(ring);

            this.obstacles.push({
                name: `Akrobaatiline Rõngas #${idx + 1}`,
                type: 'ring',
                bounds: new THREE.Box3(
                    new THREE.Vector3(r.pos[0] - 22, r.pos[1] - 22, r.pos[2] - 22),
                    new THREE.Vector3(r.pos[0] + 22, r.pos[1] + 22, r.pos[2] + 22)
                ),
                bonusMultiplier: 2.8
            });
        });
    }
}
