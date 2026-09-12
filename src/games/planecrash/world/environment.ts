import * as THREE from 'three';

export interface CrashObstacle {
    name: string;
    type: 'ground' | 'water' | 'mountain' | 'building' | 'bridge' | 'tower' | 'ring';
    bounds: THREE.Box3;
    bonusMultiplier: number;
}

export class WorldEnvironment {
    public scene: THREE.Scene;
    public obstacles: CrashObstacle[] = [];
    public runwayStartPosition: THREE.Vector3 = new THREE.Vector3(0, 5, 250);
    public runwayStartRotation: THREE.Euler = new THREE.Euler(0, 0, 0);

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.buildWorld();
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

        // 2. Ocean Water Plane
        const waterGeom = new THREE.PlaneGeometry(8000, 8000, 16, 16);
        waterGeom.rotateX(-Math.PI / 2);
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x0984e3,
            roughness: 0.15,
            metalness: 0.85
        });
        const ocean = new THREE.Mesh(waterGeom, waterMat);
        ocean.position.y = 0;
        this.scene.add(ocean);

        // Ground / Water base obstacle
        this.obstacles.push({
            name: 'Ookean / Vesi',
            type: 'water',
            bounds: new THREE.Box3(new THREE.Vector3(-4000, -50, -4000), new THREE.Vector3(4000, 1.5, 4000)),
            bonusMultiplier: 1.0
        });

        // 3. Airport Island & Runway
        this.buildAirport();

        // 4. Mountain Ranges & Cliffs
        this.buildMountains();

        // 5. Downtown Metropolis (Skyscrapers)
        this.buildCity();

        // 6. Golden Suspension Bridge
        this.buildBridge();

        // 7. Aerial Stunt Rings
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

        // Airport Control Tower (prime target!)
        const towerGroup = new THREE.Group();
        const base = new THREE.Mesh(new THREE.CylinderGeometry(8, 11, 80, 12), new THREE.MeshStandardMaterial({ color: 0xecf0f1 }));
        base.position.y = 40;
        const cab = new THREE.Mesh(new THREE.CylinderGeometry(14, 10, 18, 12), new THREE.MeshStandardMaterial({ color: 0x0984e3, metalness: 0.9, roughness: 0.1 }));
        cab.position.y = 86;
        const roof = new THREE.Mesh(new THREE.ConeGeometry(15, 6, 12), new THREE.MeshStandardMaterial({ color: 0xd63031 }));
        roof.position.y = 98;
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        beacon.position.y = 103;

        towerGroup.add(base, cab, roof, beacon);
        towerGroup.position.set(130, 5, -200);
        this.scene.add(towerGroup);

        this.obstacles.push({
            name: 'Lennujuhtimistorn (Control Tower)',
            type: 'tower',
            bounds: new THREE.Box3(new THREE.Vector3(100, 5, -230), new THREE.Vector3(160, 115, -170)),
            bonusMultiplier: 2.0
        });

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

        // Large mountain clusters to the North & East
        const mountainConfigs = [
            { pos: [-900, 0, -1200], r: 350, h: 480 },
            { pos: [-450, 0, -1600], r: 420, h: 560 },
            { pos: [200, 0, -1800], r: 450, h: 620 },
            { pos: [850, 0, -1400], r: 380, h: 510 },
            { pos: [-1400, 0, -800], r: 320, h: 420 },
            { pos: [1200, 0, -700], r: 340, h: 450 },
            { pos: [-1000, 0, 400], r: 280, h: 360 }
        ];

        mountainConfigs.forEach((m, idx) => {
            const geom = new THREE.ConeGeometry(m.r, m.h, 9);
            geom.translate(0, m.h / 2, 0);
            const peak = new THREE.Mesh(geom, mountainMat);
            peak.position.set(m.pos[0], 0, m.pos[2]);
            this.scene.add(peak);

            // Snow cap
            const snowGeom = new THREE.ConeGeometry(m.r * 0.4, m.h * 0.35, 9);
            snowGeom.translate(0, m.h * 0.82, 0);
            const snow = new THREE.Mesh(snowGeom, snowMat);
            snow.position.set(m.pos[0], 0, m.pos[2]);
            this.scene.add(snow);

            this.obstacles.push({
                name: `Kotkamäe mäetipp #${idx + 1}`,
                type: 'mountain',
                bounds: new THREE.Box3(
                    new THREE.Vector3(m.pos[0] - m.r * 0.7, 0, m.pos[2] - m.r * 0.7),
                    new THREE.Vector3(m.pos[0] + m.r * 0.7, m.h, m.pos[2] + m.r * 0.7)
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

    private buildBridge(): void {
        const bridgeGroup = new THREE.Group();
        const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.4 });

        // Road deck
        const deck = new THREE.Mesh(new THREE.BoxGeometry(60, 6, 800), new THREE.MeshStandardMaterial({ color: 0x2f3640 }));
        deck.position.set(0, 45, 0);
        bridgeGroup.add(deck);

        // 2 Main Suspension Towers
        for (let z of [-200, 200]) {
            const tower = new THREE.Mesh(new THREE.BoxGeometry(14, 180, 14), bridgeMat);
            tower.position.set(0, 90, z);
            bridgeGroup.add(tower);

            // Cables
            const cableL = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 380), bridgeMat);
            cableL.rotation.x = Math.PI / 4;
            cableL.position.set(18, 100, z);
            bridgeGroup.add(cableL);
        }

        bridgeGroup.position.set(-600, 0, 500);
        this.scene.add(bridgeGroup);

        this.obstacles.push({
            name: 'Kuldne Rippsild (Suspension Bridge)',
            type: 'bridge',
            bounds: new THREE.Box3(new THREE.Vector3(-660, 0, 100), new THREE.Vector3(-540, 180, 900)),
            bonusMultiplier: 2.5
        });
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
