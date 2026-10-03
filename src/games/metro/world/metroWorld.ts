import * as THREE from 'three';
import { MetroBase } from '../core/metroBase';
import { AIPassenger, CarriageData } from '../types';
import { CLUES_DATABASE } from '../catalog';

export class MetroWorld extends MetroBase {
    private buildStationPlatform() {
        this.stationPlatformGroup = new THREE.Group();

        // Platform floor
        const platMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.7 });
        const platGeo = new THREE.BoxGeometry(10, 0.8, 55);
        const platform = new THREE.Mesh(platGeo, platMat);
        platform.position.set(4.5, -0.4, 0);
        platform.receiveShadow = true;
        this.stationPlatformGroup.add(platform);

        // Yellow safety edge line
        const edgeMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.3, emissive: 0xf1c40f, emissiveIntensity: 0.2 });
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 55), edgeMat);
        edge.position.set(0.65, 0.01, 0);
        this.stationPlatformGroup.add(edge);

        // Station wall & advertising posters
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.8 });
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 55), wallMat);
        wall.position.set(9.5, 2.6, 0);
        this.stationPlatformGroup.add(wall);

        // Steel Rails & Ties on Track Bed
        const railMat = new THREE.MeshStandardMaterial({ color: 0xa4b0be, metalness: 0.95, roughness: 0.15 });
        const tieMat = new THREE.MeshStandardMaterial({ color: 0x2f3542, roughness: 0.9 });
        [-0.7, 0.7].forEach(rx => {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 60), railMat);
            rail.position.set(rx, -0.45, 0);
            this.stationPlatformGroup.add(rail);
        });
        for (let tz = -30; tz <= 30; tz += 1.2) {
            const tie = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.25), tieMat);
            tie.position.set(0, -0.52, tz);
            this.stationPlatformGroup.add(tie);
        }

        // Platform Pillars
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x718096, roughness: 0.4 });
        for (let z = -20; z <= 20; z += 10) {
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.6), pillarMat);
            pillar.position.set(3.5, 2.1, z);
            this.stationPlatformGroup.add(pillar);
        }

        // Bright Platform Ceiling & Overhead Lights (Optimized for 60+ FPS)
        const platformAmbient = new THREE.PointLight(0xfff8ee, 2.4, 40);
        platformAmbient.position.set(4.5, 4.0, 0);
        this.stationPlatformGroup.add(platformAmbient);

        for (let z = -22; z <= 22; z += 7.5) {
            // Bright fluorescent lamp strip fixture (glowing MeshBasicMaterial)
            const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const lampFixture = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 2.2), lampMat);
            lampFixture.position.set(3.5, 4.5, z);
            this.stationPlatformGroup.add(lampFixture);
        }

        // Two key point lights covering the platform ends smoothly
        [-12, 12].forEach(pz => {
            const pLight = new THREE.PointLight(0xfffaed, 1.8, 24);
            pLight.position.set(3.5, 4.2, pz);
            this.stationPlatformGroup.add(pLight);
        });

        // Digital Destination Board
        const boardCanvas = document.createElement('canvas');
        boardCanvas.width = 512;
        boardCanvas.height = 128;
        const bCtx = boardCanvas.getContext('2d');
        if (bCtx) {
            bCtx.fillStyle = '#0a0d14';
            bCtx.fillRect(0, 0, 512, 128);
            bCtx.strokeStyle = '#ffd32a';
            bCtx.lineWidth = 4;
            bCtx.strokeRect(4, 4, 504, 120);
            bCtx.fillStyle = '#ffd32a';
            bCtx.font = 'bold 26px monospace';
            bCtx.textAlign = 'center';
            bCtx.fillText('🚇 VIIMANE METROO', 256, 45);
            bCtx.fillStyle = '#00f2fe';
            bCtx.font = 'bold 22px monospace';
            bCtx.fillText('23:45 · SAABUB KOHE', 256, 90);
        }
        const boardTex = new THREE.CanvasTexture(boardCanvas);
        const boardMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.6, 2.2),
            new THREE.MeshBasicMaterial({ map: boardTex })
        );
        boardMesh.position.set(3.5, 3.2, 0);
        this.stationPlatformGroup.add(boardMesh);

        this.scene.add(this.stationPlatformGroup);
    }

    private buildTunnel() {
        this.tunnelGroup = new THREE.Group();

        // Long tunnel tube segments
        const tunnelMat = new THREE.MeshStandardMaterial({ color: 0x111620, roughness: 0.95, side: THREE.BackSide });
        const tunnelGeo = new THREE.CylinderGeometry(5.5, 5.5, 120, 24, 1, true);
        const tunnelMesh = new THREE.Mesh(tunnelGeo, tunnelMat);
        tunnelMesh.rotation.x = Math.PI / 2;
        tunnelMesh.position.set(0, 1.5, 0);
        this.tunnelGroup.add(tunnelMesh);

        // Vivid Passing Subway Tunnel Lights (Ultra-Fast GPU-efficient Glowing Meshes)
        for (let z = -56; z <= 56; z += 6) {
            // Wall fluorescent strip lamps (both left and right sides)
            [-4.8, 4.8].forEach((lx, sIdx) => {
                const isWarm = (Math.abs(z) + sIdx) % 3 === 0;
                const lampMat = new THREE.MeshBasicMaterial({
                    color: isWarm ? 0xffbe76 : 0x70a1ff
                });
                const lampMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 1.8), lampMat);
                lampMesh.position.set(lx, 1.8, z);
                this.tunnelGroup.add(lampMesh);
            });

            // Ceiling overhead light strips
            const ceilLamp = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.1, 1.2),
                new THREE.MeshBasicMaterial({ color: 0xffffff })
            );
            ceilLamp.position.set(0, 4.2, z);
            this.tunnelGroup.add(ceilLamp);

            // Signal track lights (Red / Green / Amber dots)
            if (z % 18 === 0) {
                const sigColor = z % 36 === 0 ? 0x2ed573 : 0xff4757;
                const sigMat = new THREE.MeshBasicMaterial({ color: sigColor });
                const signalMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), sigMat);
                signalMesh.position.set(-3.2, 0.4, z);
                this.tunnelGroup.add(signalMesh);
            }
        }

        // Single ambient tunnel light for smooth mood lighting
        const tunnelAmbient = new THREE.PointLight(0x40739e, 0.6, 60);
        tunnelAmbient.position.set(0, 2.5, 0);
        this.tunnelGroup.add(tunnelAmbient);

        // Surreal exterior backdrop mesh (for Vagun 5 window anomaly)
        const skyGeo = new THREE.SphereGeometry(60, 32, 32);
        const skyMat = new THREE.MeshBasicMaterial({
            color: 0x8e44ad,
            side: THREE.BackSide,
            wireframe: true,
            transparent: true,
            opacity: 0
        });
        this.windowSurrealSky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(this.windowSurrealSky);

        this.scene.add(this.tunnelGroup);
    }

    private createCarriageGeometry(index: number, branch: DirectionBranch, theme: CarriageData['theme']): CarriageData {
        const carGroup = new THREE.Group();
        const lights: THREE.PointLight[] = [];
        const lightMeshes: THREE.Mesh[] = [];
        const passengers: AIPassenger[] = [];

        const carLength = index === 200 ? 100 : 20;
        const halfLen = carLength / 2;
        const carWidth = 3.4;
        const carHeight = 3.0;

        // 1. Floor: Rubberized subway floor + Safety yellow tactile boundary stripe along aisle
        const floorMat = new THREE.MeshStandardMaterial({
            color: theme === 'abandoned' || index === 200 ? 0x222629 : 0x3d4852,
            roughness: 0.75,
            metalness: 0.15
        });
        const floor = new THREE.Mesh(new THREE.BoxGeometry(carWidth, 0.2, carLength), floorMat);
        floor.position.set(0, 0, 0);
        floor.receiveShadow = true;
        carGroup.add(floor);

        // Tactile safety yellow boundary stripes along the aisle
        const yellowStripeMat = new THREE.MeshStandardMaterial({
            color: 0xf1c40f,
            roughness: 0.55,
            metalness: 0.1
        });
        [-0.85, 0.85].forEach(sx => {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.202, carLength), yellowStripeMat);
            stripe.position.set(sx, 0.001, 0);
            carGroup.add(stripe);
        });

        // Stainless steel threshold floor plates at door entries (z = 0, only for normal cars)
        if (index !== 200) {
            const thresholdMat = new THREE.MeshStandardMaterial({
                color: 0xcccccc,
                roughness: 0.25,
                metalness: 0.9
            });
            [-carWidth / 2 + 0.15, carWidth / 2 - 0.15].forEach(tx => {
                const threshold = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.203, 2.3), thresholdMat);
                threshold.position.set(tx, 0.002, 0);
                carGroup.add(threshold);
            });
        }

        // 2. Ceiling: Ribbed architectural subway ceiling with recessed lighting channels
        const ceilingMat = new THREE.MeshStandardMaterial({
            color: theme === 'lounge' ? 0x242830 : (index === 200 ? 0x181c24 : 0xe8ecf1),
            roughness: 0.45,
            metalness: 0.15
        });
        const ceiling = new THREE.Mesh(new THREE.BoxGeometry(carWidth, 0.15, carLength), ceilingMat);
        ceiling.position.set(0, carHeight, 0);
        carGroup.add(ceiling);

        // Air conditioning vents and emergency speakers in ceiling
        const ventMat = new THREE.MeshStandardMaterial({ color: 0x333a42, roughness: 0.8 });
        for (let vz = -halfLen + 2; vz <= halfLen - 2; vz += 3.2) {
            const vent = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.35), ventMat);
            vent.position.set(0, carHeight - 0.08, vz);
            carGroup.add(vent);
        }

        // 3. Side Walls with Window Cutouts & Platform Sliding Doors
        const wallColor = theme === 'abandoned' || index === 200 ? 0x2c3035 : theme === 'neon' ? 0x1e272e : 0xf1f2f6;
        const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.7 });

        this.sideDoorMeshes = [];

        // Windows (Subway Tinted Glass - passing tunnel lights clearly visible outside!)
        const windowGlassMat = new THREE.MeshPhysicalMaterial({
            color: 0x1a2634,
            transparent: true,
            opacity: 0.35,
            roughness: 0.1,
            metalness: 0.25
        });

        if (index === 200) {
            // Carriage 200: Continuous 100m side walls and regular windows
            [-carWidth / 2, carWidth / 2].forEach(x => {
                const wallLong = new THREE.Mesh(new THREE.BoxGeometry(0.15, carHeight, carLength), wallMat);
                wallLong.position.set(x, carHeight / 2, 0);
                carGroup.add(wallLong);

                // Tinted subway windows spaced across 100m
                for (let z = -halfLen + 4; z <= halfLen - 4; z += 5) {
                    const windowPane = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 2.8), windowGlassMat);
                    windowPane.position.set(x, 1.6, z);
                    carGroup.add(windowPane);
                }
            });
        } else {
            // Normal 20m car walls and central sliding doors at z = 0
            [-carWidth / 2, carWidth / 2].forEach(x => {
                const wallFront = new THREE.Mesh(new THREE.BoxGeometry(0.15, carHeight, 8.8), wallMat);
                wallFront.position.set(x, carHeight / 2, 5.6);
                carGroup.add(wallFront);

                const wallBack = new THREE.Mesh(new THREE.BoxGeometry(0.15, carHeight, 8.8), wallMat);
                wallBack.position.set(x, carHeight / 2, -5.6);
                carGroup.add(wallBack);

                const wallTop = new THREE.Mesh(new THREE.BoxGeometry(0.15, carHeight - 2.2, 2.4), wallMat);
                wallTop.position.set(x, 2.2 + (carHeight - 2.2) / 2, 0);
                carGroup.add(wallTop);

                // Pneumatic Sliding Doors in each doorway
                const doorLeafMat = new THREE.MeshStandardMaterial({
                    color: theme === 'abandoned' ? 0x7f1d1d : 0x10ac84,
                    metalness: 0.6,
                    roughness: 0.35
                });
                const doorGlassMat = new THREE.MeshBasicMaterial({ color: 0x010204 });

                const leftLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.15, 1.15), doorLeafMat);
                const leftWin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.45), doorGlassMat);
                leftWin.position.set(0, 0.25, 0);
                leftLeaf.add(leftWin);
                leftLeaf.position.set(x, 1.1, -0.55);
                carGroup.add(leftLeaf);
                this.sideDoorMeshes.push({ mesh: leftLeaf, baseZ: -0.55, dir: -1 });

                const rightLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.15, 1.15), doorLeafMat);
                const rightWin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.45), doorGlassMat);
                rightWin.position.set(0, 0.25, 0);
                rightLeaf.add(rightWin);
                rightLeaf.position.set(x, 1.1, 0.55);
                carGroup.add(rightLeaf);
                this.sideDoorMeshes.push({ mesh: rightLeaf, baseZ: 0.55, dir: 1 });
            });

            [-carWidth / 2, carWidth / 2].forEach(x => {
                for (let z = -7; z <= 7; z += 4.5) {
                    if (Math.abs(z) < 2) continue; // skip door entry
                    const windowPane = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 2.5), windowGlassMat);
                    windowPane.position.set(x, 1.6, z);
                    carGroup.add(windowPane);
                }
            });
        }

        // 4. Stainless Steel Grab Rails & Overhead Hanging Grab Loops (Straps)
        const poleMat = new THREE.MeshStandardMaterial({ color: 0xededed, metalness: 0.95, roughness: 0.15 });
        const strapMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, roughness: 0.6 });
        [-0.9, 0.9].forEach(x => {
            const poleInterval = index === 200 ? 5.5 : 4.0;
            for (let z = -halfLen + 2; z <= halfLen - 2; z += poleInterval) {
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, carHeight, 12), poleMat);
                pole.position.set(x, carHeight / 2, z);
                carGroup.add(pole);
            }

            // Overhead long rail
            const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, carLength - 2, 12), poleMat);
            rail.rotation.x = Math.PI / 2;
            rail.position.set(x, 2.3, 0);
            carGroup.add(rail);

            // Overhead hanging grab straps with handles
            const strapInterval = index === 200 ? 2.5 : 1.5;
            for (let sz = -halfLen + 3; sz <= halfLen - 3; sz += strapInterval) {
                if (index !== 200 && Math.abs(sz) < 1.4) continue; // clear above doorway in normal cars
                const strapBand = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.02), ventMat);
                strapBand.position.set(x, 2.18, sz);
                carGroup.add(strapBand);

                const strapRing = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 8, 16), strapMat);
                strapRing.rotation.y = Math.PI / 2;
                strapRing.position.set(x, 2.04, sz);
                carGroup.add(strapRing);
            }
        });

        // 5. Glass Windscreen Partitions at ends of seat rows (for normal cars)
        if (index !== 200) {
            const partitionGlassMat = new THREE.MeshStandardMaterial({
                color: 0xddf0ff,
                transparent: true,
                opacity: 0.35,
                roughness: 0.05,
                metalness: 0.1
            });
            [-1.25, 1.25].forEach(px => {
                [-1.8, 1.8].forEach(pz => {
                    const partitionGlass = new THREE.Mesh(new THREE.BoxGeometry(0.012, 1.1, 0.62), partitionGlassMat);
                    partitionGlass.position.set(px, 0.85, pz);
                    carGroup.add(partitionGlass);

                    const edgeX = px > 0 ? px - 0.31 : px + 0.31;
                    const edgePole = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.2, 12), poleMat);
                    edgePole.position.set(edgeX, 0.85, pz);
                    carGroup.add(edgePole);

                    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.64), poleMat);
                    topRail.position.set(px, 1.4, pz);
                    carGroup.add(topRail);

                    const bottomRail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.64), poleMat);
                    bottomRail.position.set(px, 0.32, pz);
                    carGroup.add(bottomRail);
                });
            });
        }

        // 6. Dual Long Ergonomic Passenger Subway Benches with Sculpted Cushions & Dividers
        const seatBaseColor = theme === 'lounge' ? 0x6c5ce7 : (theme === 'abandoned' || index === 200) ? 0x2d3436 : 0x0984e3;
        const seatBaseMat = new THREE.MeshStandardMaterial({ color: seatBaseColor, roughness: 0.65 });
        const cushionColor = theme === 'lounge' ? 0x574b90 : (theme === 'abandoned' || index === 200) ? 0x1e272e : 0x1e3799;
        const cushionMat = new THREE.MeshStandardMaterial({ color: cushionColor, roughness: 0.75 });
        const dividerMat = new THREE.MeshStandardMaterial({ color: 0x718093, metalness: 0.8, roughness: 0.2 });

        const benchCenters = index === 200
            ? [-38, -24, -10, 4, 18, 30]
            : [-4.9, 4.9];

        [-1.28, 1.28].forEach(x => {
            benchCenters.forEach(centerZ => {
                const benchLength = index === 200 ? 5.2 : 6.0;
                // Bench Base Structure
                const seatBench = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.44, benchLength), seatBaseMat);
                seatBench.position.set(x, 0.22, centerZ);
                carGroup.add(seatBench);

                // Continuous Plush Cushion Surface (top surface at y = 0.48)
                const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.08, benchLength - 0.04), cushionMat);
                seatCushion.position.set(x, 0.46, centerZ);
                carGroup.add(seatCushion);

                // Backrest against the subway wall
                const backX = x > 0 ? 1.58 : -1.58;
                const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.72, benchLength - 0.04), cushionMat);
                seatBack.position.set(backX, 0.8, centerZ);
                carGroup.add(seatBack);

                // Individual Seat Divider Bars / Armrests along the bench
                for (let dz = -2.0; dz <= 2.0; dz += 1.3) {
                    const divider = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.58, 8), dividerMat);
                    divider.rotation.z = x > 0 ? -Math.PI / 8 : Math.PI / 8;
                    divider.position.set(x, 0.62, centerZ + dz);
                    carGroup.add(divider);
                }
            });
        });

        // 7. Cove Transit Posters & Warning Signs Above Windows
        const adPalette = [0x0984e3, 0x00b894, 0xe17055, 0x6c5ce7, 0xfdcb6e];
        [-carWidth / 2 + 0.08, carWidth / 2 - 0.08].forEach((ax, sideIdx) => {
            const adInterval = index === 200 ? 5.0 : 2.8;
            for (let az = -halfLen + 3.5; az <= halfLen - 3.5; az += adInterval) {
                if (index !== 200 && Math.abs(az) < 1.6) continue;
                const adColor = adPalette[Math.abs(Math.floor(az * 3 + sideIdx)) % adPalette.length];
                const adMat = new THREE.MeshStandardMaterial({ color: adColor, roughness: 0.4 });
                const adMesh = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.85), adMat);
                adMesh.position.set(ax, 2.45, az);
                carGroup.add(adMesh);
            }
        });

        // 8. Fluorescent Ceiling Tube Lights
        const lightSpacing = index === 200 ? 5.0 : 4.5;
        for (let z = -halfLen + 3.5; z <= halfLen - 3.5; z += lightSpacing) {
            const isRedAlert = index === 200 || theme === 'dark';
            const lightCoverMat = new THREE.MeshBasicMaterial({ color: isRedAlert ? 0xff4757 : 0xffffff });
            const lightCover = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 1.8), lightCoverMat);
            lightCover.position.set(0, carHeight - 0.05, z);
            carGroup.add(lightCover);
            lightMeshes.push(lightCover);

            const pLight = new THREE.PointLight(
                isRedAlert ? 0xff4757 : theme === 'neon' ? 0x00f2fe : 0xffeedd,
                index === 200 ? 0.95 : (theme === 'dark' ? 0.3 : 0.85),
                index === 200 ? 12 : 10
            );
            pLight.position.set(0, carHeight - 0.3, z);
            carGroup.add(pLight);
            lights.push(pLight);
        }

        // 9. Interactive Dynamic Metro Route Map & Status Displays on Interior Walls
        const isEt = this.lang === 'et';
        const routeDisplayRight = this.buildMetroRouteDisplay(index, isEt);
        routeDisplayRight.position.set(1.64, 1.82, 0);
        routeDisplayRight.rotation.y = -Math.PI / 2;
        carGroup.add(routeDisplayRight);

        const routeDisplayLeft = this.buildMetroRouteDisplay(index, isEt);
        routeDisplayLeft.position.set(-1.64, 1.82, 0);
        routeDisplayLeft.rotation.y = Math.PI / 2;
        carGroup.add(routeDisplayLeft);

        let mapMesh: THREE.Group = routeDisplayRight;

        // 10. End Gangway Doors (Front = +Z / Right Branch, Back = -Z / Left Branch)
        const doorFront = this.buildGangwayDoor(carWidth, carHeight, 1, index, branch, theme);
        doorFront.position.set(0, 0, carLength / 2);
        carGroup.add(doorFront);

        const doorBack = this.buildGangwayDoor(carWidth, carHeight, -1, index, branch, theme);
        doorBack.position.set(0, 0, -carLength / 2);
        carGroup.add(doorBack);

        // 11. Golden Shop (Vagun 100 Checkpoint) Construction & Setup
        let inspectableItem: THREE.Group | undefined;
        let inspectableText: any;

        if (index === 100 || theme === 'golden_shop') {
            // Golden Shop Luxury Counter & Pedestals
            const counterMat = new THREE.MeshStandardMaterial({ color: 0x4a2810, roughness: 0.3, metalness: 0.2 });
            const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.95, roughness: 0.15 });

            // Long Sales Counter
            const counter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 0.9), counterMat);
            counter.position.set(0, 0.48, 1.5);
            carGroup.add(counter);

            const counterTop = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 1.0), goldTrimMat);
            counterTop.position.set(0, 0.98, 1.5);
            carGroup.add(counterTop);

            // Glowing 3D Neon Sign: ✨ GOLDEN SHOP ✨
            const signCanvas = document.createElement('canvas');
            signCanvas.width = 512;
            signCanvas.height = 128;
            const sCtx = signCanvas.getContext('2d');
            if (sCtx) {
                sCtx.fillStyle = '#0a0d14';
                sCtx.fillRect(0, 0, 512, 128);
                sCtx.strokeStyle = '#ffd32a';
                sCtx.lineWidth = 6;
                sCtx.strokeRect(6, 6, 500, 116);
                sCtx.fillStyle = '#ffd32a';
                sCtx.font = 'bold 36px sans-serif';
                sCtx.textAlign = 'center';
                sCtx.fillText('✨ GOLDEN SHOP ✨', 256, 58);
                sCtx.fillStyle = '#ffffff';
                sCtx.font = 'bold 20px sans-serif';
                sCtx.fillText('VAGUN 100 CHECKPOINT', 256, 96);
            }
            const signTex = new THREE.CanvasTexture(signCanvas);
            const signMesh = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.7, 0.05), new THREE.MeshBasicMaterial({ map: signTex }));
            signMesh.position.set(0, 2.5, 1.5);
            carGroup.add(signMesh);

            // 5 Item display pedestals on counter
            const itemPedestals = [
                { id: 'night_vision', x: -0.9, icon: '👓', name: 'NV Goggles' },
                { id: 'speed_boost', x: -0.45, icon: '👟', name: 'Speed' },
                { id: 'clue_detector', x: 0.0, icon: '🔍', name: 'Detector' },
                { id: 'secret_pass', x: 0.45, icon: '🎟️', name: 'Secret Pass' },
                { id: 'radio', x: 0.9, icon: '📻', name: 'Radio' }
            ];

            itemPedestals.forEach(p => {
                const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.12, 16), goldTrimMat);
                ped.position.set(p.x, 1.05, 1.5);
                carGroup.add(ped);

                const itemMesh = this.createHeldItemModel(p.id);
                itemMesh.position.set(p.x, 1.2, 1.5);
                itemMesh.rotation.set(0, Math.PI, 0);
                carGroup.add(itemMesh);
            });

            // Friendly AI Shopkeeper NPC behind counter
            const shopkeeper = new THREE.Group();
            const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5cd79, roughness: 0.5 });
            const uniformMat = new THREE.MeshStandardMaterial({ color: 0x1b1464, roughness: 0.6 });
            const goldBadgeMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.9 });

            // Torso
            const sTorso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.65, 0.28), uniformMat);
            sTorso.position.set(0, 1.3, 0);
            shopkeeper.add(sTorso);

            // Golden Epaulets & Badge
            const badge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.02), goldBadgeMat);
            badge.position.set(-0.1, 1.45, 0.15);
            shopkeeper.add(badge);

            // Head & Golden Cap
            const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), skinMat);
            sHead.position.set(0, 1.75, 0);
            shopkeeper.add(sHead);

            const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16), uniformMat);
            cap.position.set(0, 1.86, 0);
            shopkeeper.add(cap);

            const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.12), goldBadgeMat);
            visor.position.set(0, 1.83, 0.14);
            shopkeeper.add(visor);

            shopkeeper.position.set(0, 0, 2.3);
            carGroup.add(shopkeeper);
            this.goldenShopKeeperMesh = shopkeeper;

            // Interactive Shop Prompt Mesh on Counter
            inspectableItem = this.createInspectableNote();
            inspectableItem.position.set(0, 1.05, 1.1);
            carGroup.add(inspectableItem);
            inspectableText = {
                titleEt: '🛒 KULDNE POOD (VAGUN 100)',
                descEt: 'Astu leti juurde ja vali endale vajalikud esemed (Ööprillid, Kiirus, Vihjeandur, Salapilet, Raadio).',
                titleEn: '🛒 GOLDEN SHOP (CARRIAGE 100)',
                descEn: 'Step up to the counter and purchase equipment with your collected Metro Coins.'
            };
        } else if (index === 6 || index === 14 || index === 25 || index === 28 || index === 32 || index === 39 || index === 42 || index === 50 || index === 55 || index === 70 || index === 78 || index === 80 || index === 87) {
            // Story Inspectable Props
            inspectableItem = this.createInspectableNote();
            inspectableItem.position.set(index % 2 === 0 ? -1.1 : 1.1, 0.62, (index % 5) * 1.5 - 2.0);
            carGroup.add(inspectableItem);

            const storyClues: { [key: number]: { titleEt: string; descEt: string; titleEn: string; descEn: string } } = {
                6: {
                    titleEt: '📜 Vana Metroopilet ja Märkmik (1987)',
                    descEt: '„Rong nr 404 väljus viimast korda 14. oktoobril 1987. Peatusi ei registreeritud enam kunagi. Süsteem lukustus igaveseks ringiks...”',
                    titleEn: '📜 Vintage Subway Pass & Notebook (1987)',
                    descEn: '“Train No. 404 departed for the final time on October 14, 1987. No station arrivals were ever recorded again. The track sealed into an infinite loop...”'
                },
                14: {
                    titleEt: '🎫 Salapärane Metroopilet',
                    descEt: 'Vana reljeefne pilet: „Rong 100 · Ühesuunapilet Tundmatusse”.',
                    titleEn: '🎫 Mysterious Subway Ticket',
                    descEn: 'An embossed ticket: „Train 100 · One-way ticket into the Unknown”.'
                },
                26: {
                    titleEt: '🎫 Vana Metroopilet 1987',
                    descEt: 'Kuupäev: 14.10.1987. Märge: „Projekt Viimane Metroo — Peatusi ei ole.”',
                    titleEn: '🎫 Old Ticket 1987',
                    descEn: 'Date: 14.10.1987. Note: „Project Last Metro — No scheduled stops.”'
                },
                28: {
                    titleEt: '🧩 Peidetud Koodisedel (Vagun 28)',
                    descEt: 'Sedel istme all: „Uksekood: 1987”. Uks on nüüd avatud!',
                    titleEn: '🧩 Hidden Code Slip (Carriage 28)',
                    descEn: 'Note under the seat: „Door code: 1987”. Bulkhead door is now unlocked!'
                },
                32: {
                    titleEt: '🗺️ Märgistatud Metrookaart',
                    descEt: 'Kaardil on punane ring: „Vagun 50 peidab tõde. Jätka liikumist.”',
                    titleEn: '🗺️ Marked Transit Map',
                    descEn: 'A red circle notes: „Carriage 50 holds the truth. Keep moving forward.”'
                },
                39: {
                    titleEt: '📋 Hooldusraamatu Väljavõte',
                    descEt: '„Tunnel 7C ei jõua kunagi pinnale. Rong sõidab suletud ajatsüklis.”',
                    titleEn: '📋 Maintenance Log Excerpt',
                    descEn: '„Tunnel 7C never surfaces. The train operates in a closed temporal loop.”'
                },
                42: {
                    titleEt: '🎒 Mahajäetud Seljakott',
                    descEt: 'Koti sees on märkmik: „Vagunis 50 saabub esimene suur vastus.”',
                    titleEn: '🎒 Abandoned Backpack',
                    descEn: 'Inside is a diary: „In Carriage 50, the first great answer awaits.”'
                },
                50: {
                    titleEt: '⭐ Projekti „Igavene Metroo” Dokument (1987)',
                    descEt: '„Rong 100 loodi 1987. aastal ruumi ja aja anomaalia testimiseks. Väljapääs asub Vagun 100 taga. Jätka liikumist!”',
                    titleEn: '⭐ Project „Eternal Metro” Document (1987)',
                    descEn: '„Train 100 was designed in 1987 to test temporal displacement. The gateway lies beyond Carriage 100. Keep going!”'
                },
                55: {
                    titleEt: '🎫 Kuldne Pilet #100',
                    descEt: '„Pilet Vagunisse 100 — Kuldne Checkpoint ja Pood”.',
                    titleEn: '🎫 Golden Ticket #100',
                    descEn: '„Ticket to Carriage 100 — Golden Checkpoint & Shop”.'
                },
                70: {
                    titleEt: '⭐ Kadunud Reisija Päevik',
                    descEt: '„Olen jõudnud vagunisse 70. Vagun 100 on checkpoint ja oaas. Ära anna alla!”',
                    titleEn: '⭐ Lost Passenger\'s Journal',
                    descEn: '„I have reached Carriage 70. Carriage 100 is a checkpoint and safe haven. Do not give up!”'
                },
                78: {
                    titleEt: '🧩 Uksehoova Juhend (Vagun 78)',
                    descEt: '„Tõmba kuldset hooba paremal. Teekond jätkub.” Uks on avatud!',
                    titleEn: '🧩 Bulkhead Lever Guide (Carriage 78)',
                    descEn: '„Pull the golden lever on the right. The journey continues.” Door unlocked!'
                },
                80: {
                    titleEt: '⭐ Suur Metroo Peakaart',
                    descEt: '„Vagun 80 läbitud. Vagun 100 (Kuldne Pood) asub vaid 20 vaguni kaugusel!”',
                    titleEn: '⭐ Grand Master Transit Map',
                    descEn: '„Carriage 80 reached. Carriage 100 (Golden Shop) is just 20 carriages ahead!”'
                },
                87: {
                    titleEt: '💳 Kuldne Konduktori Kaart',
                    descEt: '„Vagun 100 on avatud kõigile ränduritele. Pood võtab vastu Metro Coine.”',
                    titleEn: '💳 Golden Conductor Keycard',
                    descEn: '„Carriage 100 is open to all explorers. The Shop accepts Metro Coins.”'
                }
            };
            inspectableText = storyClues[index] || {
                titleEt: `📜 Dokument Vagunis ${index}`,
                descEt: 'Metroo saladused süvenevad iga vaguniga.',
                titleEn: `📜 Document in Carriage ${index}`,
                descEn: 'The mysteries of the subway deepen with every carriage.'
            };
        } else if (index >= 101) {
            // Check CLUES_DATABASE for collectible items in carriages 101-200+
            const dbClue = CLUES_DATABASE.find(c => c.carIndex === index && !this.collectedClues.some(cc => cc.id === c.id));
            if (dbClue) {
                inspectableItem = this.createClue3DMesh(dbClue);
                if (dbClue.placement === 'floor') {
                    inspectableItem.position.set(0.2, 0.08, 0);
                } else if (dbClue.placement === 'table') {
                    inspectableItem.position.set(0, 0.68, 1.2);
                } else if (dbClue.placement === 'wall') {
                    inspectableItem.position.set(index % 2 === 0 ? -1.62 : 1.62, 1.4, 0);
                } else { // 'seat'
                    inspectableItem.position.set(index % 2 === 0 ? -1.1 : 1.1, 0.58, (index % 5) * 1.5 - 2.0);
                }
                carGroup.add(inspectableItem);
                this.activeClueMesh = inspectableItem;
                inspectableText = {
                    titleEt: dbClue.titleEt,
                    descEt: dbClue.textEt,
                    titleEn: dbClue.titleEn,
                    descEn: dbClue.textEn
                };
            }
        } else if (index >= 11 && index % 5 === 1) {
            // Procedural Keypad Puzzle
            const code = `${Math.floor(1000 + Math.random() * 9000)}`;
            inspectableItem = this.createKeypadProp();
            inspectableItem.position.set(1.6, 1.4, 8.8);
            carGroup.add(inspectableItem);
            inspectableText = {
                titleEt: `🔐 Elektrooniline Uksekood: ${code}`,
                descEt: 'Vajuta nuppudele ja sisesta 4-kohaline kood ukse avamiseks.',
                titleEn: `🔐 Electronic Door Code: ${code}`,
                descEn: 'Enter the 4-digit code to unlock the carriage bulkhead door.'
            };
        }


        // 12. Scatter Collectible Rotating Golden Coins throughout the carriage
        this.spawnCollectibleCoins(carGroup, index === 100 ? 8 : 3);

        // 13. Populate Realistic 3D AI Passengers
        this.populatePassengers(carGroup, index, theme, passengers);

        // 14. Carriage 200 Final Boss & Green Health Pickups (5X Longer Coach)
        if (index === 200) {
            this._spawnCarriage200Elements(carGroup);
        }

        return {
            group: carGroup,
            index,
            branch,
            theme,
            lights,
            lightMeshes,
            passengers,
            doorFront,
            doorBack,
            mapMesh,
            puzzleSolved: index < 11 || (index === 28 && this.hasUnlockedCarriage28WithClue) || (index === 64 && (this.hasUnlockedCarriage64WithKey || !!this.inventory['key'])) || (index === 78 && this.hasUnlockedCarriage78WithHint),
            puzzleCode: index >= 11 ? '1987' : undefined,
            hasKeypad: index >= 11 && index % 5 === 1,
            inspectableItem,
            inspectableText
        };
    }

    private _spawnCarriage200Elements(carGroup: THREE.Group) {
        // 1. Spawn Green Pluses on the ground ("maa peal on plussid roheliusega salt saad pluss 30 elu")
        this.carriage200HealthPickups = [];
        const pickupZPositions = [-38, -25, -12, 0, 14, 28];
        const plusMat = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            emissive: 0x00bb44,
            emissiveIntensity: 0.95,
            roughness: 0.2,
            metalness: 0.1
        });
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide
        });

        pickupZPositions.forEach((pz, pIdx) => {
            const pickupGroup = new THREE.Group();
            pickupGroup.name = `health_plus_${pIdx}`;

            // 3D Green Plus Mesh (horizontal & vertical bars)
            const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.18), plusMat);
            const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.55), plusMat);
            pickupGroup.add(hBar);
            pickupGroup.add(vBar);

            // Glowing ring on the floor underneath
            const ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.44, 24), ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = -0.06;
            pickupGroup.add(ring);

            // Green point light
            const pLight = new THREE.PointLight(0x00ff88, 1.2, 3.5);
            pLight.position.set(0, 0.25, 0);
            pickupGroup.add(pLight);

            const px = pIdx % 2 === 0 ? -0.5 : 0.5;
            pickupGroup.position.set(px, 0.22, pz);
            carGroup.add(pickupGroup);

            this.carriage200HealthPickups.push({
                mesh: pickupGroup,
                pos: new THREE.Vector3(px, 0.22, pz),
                collected: false,
                light: pLight,
                pulseOffset: pIdx * 1.0
            });
        });

        // 2. Spawn Carriage 200 Final Boss at the end of the 100m carriage ("selle vaguni lõpus on pahalane keda tapad mõõgaga 10 lõõki")
        this._spawnCarriage200Boss(carGroup);
    }

    private buildMetroRouteDisplay(index: number, isEt: boolean): THREE.Group {
        const group = new THREE.Group();

        // 1. High-resolution canvas for crystal clear LCD/LED route display
        const mapCanvas = document.createElement('canvas');
        mapCanvas.width = 1024;
        mapCanvas.height = 256;
        const ctx = mapCanvas.getContext('2d');
        if (ctx) {
            // Dark sleek subway display background
            ctx.fillStyle = '#0a0e17';
            ctx.fillRect(0, 0, 1024, 256);

            // Subtle bezel border and grid
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 4;
            ctx.strokeRect(4, 4, 1016, 248);

            // Header banner
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(8, 8, 1008, 48);

            // Header line & title
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'left';
            const lineTitle = isEt
                ? '🚇 METROOLIIN M1 · SÜGAVTUNNEL'
                : '🚇 METRO LINE M1 · DEEP TUNNEL';
            ctx.fillText(lineTitle, 24, 40);

            // Carriage indicator badge on top right
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'right';
            const carStatus = isEt
                ? `📍 ASUKOHT: VAGUN ${index}`
                : `📍 CURRENT: CARRIAGE ${index}`;
            ctx.fillText(carStatus, 1000, 40);

            // Route track line
            const lineY = 145;
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 14;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(60, lineY);
            ctx.lineTo(964, lineY);
            ctx.stroke();

            // Active / Completed track line portion
            const progressRatio = Math.min(1.0, Math.max(0, index / 100));
            const progressX = 60 + progressRatio * (964 - 60);

            ctx.strokeStyle = '#10b981'; // Vibrant glowing green for traversed path
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(60, lineY);
            ctx.lineTo(progressX, lineY);
            ctx.stroke();

            // Story Anomaly custom states
            if (index === 22) {
                // Glitching shifting map
                const glitchSymbols = ['[ ??! ]', '[ #&% ]', '[ 404 ]', '[ ERR ]', '[ ☠️ ]'];
                glitchSymbols.forEach((sym, sIdx) => {
                    const x = 90 + sIdx * 210;
                    ctx.fillStyle = '#ef4444';
                    ctx.font = 'bold 24px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(sym, x, lineY - 30);
                    ctx.beginPath();
                    ctx.arc(x, lineY, 12, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.fillStyle = '#f87171';
                ctx.font = 'bold 18px monospace';
                ctx.fillText(isEt ? '⚠️ ANOMAALIA: KAART MUUTUB PIDEVALT!' : '⚠️ ANOMALY: MAP CONSTANTLY SHIFTING!', 512, 225);
            } else if (index === 53) {
                // All stations disappeared
                ctx.fillStyle = '#64748b';
                ctx.font = 'italic bold 22px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(isEt ? '⚠️ KÕIK PEATUSED ON KAARDILT KADUNUD — TÜHI JOON' : '⚠️ ALL STATIONS DISAPPEARED FROM MAP', 512, 100);
                ctx.fillText(isEt ? 'Rong sõidab tundmatusse suunda...' : 'Train speeding into unknown...', 512, 210);
            } else if (index === 94) {
                // Alien / mystery glyphs
                const glyphs = ['⍾ KESK', '⍝ SÜGAV', '⍲ TSOON', '⍿ VÄRAV', '⎔ KULD 100'];
                glyphs.forEach((gl, gIdx) => {
                    const x = 90 + gIdx * 210;
                    ctx.fillStyle = '#c084fc';
                    ctx.font = 'bold 22px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(gl, x, lineY - 30);
                    ctx.beginPath();
                    ctx.arc(x, lineY, 12, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.fillStyle = '#e879f9';
                ctx.font = 'bold 18px monospace';
                ctx.fillText('⚡ ⍾ ⍝ ⍲ ⍿ ⎔ · ANOMAALIA TASE: MAXIMAALNE · ⎔ ⍿ ⍲ ⍝ ⍾', 512, 225);
            } else {
                // Standard Realistic Subway Line Key Milestones (0 -> 20 -> 50 -> 80 -> 100)
                const milestones = [
                    { num: 0, labelEt: 'KESKJAAM', labelEn: 'CENTRAL', sub: '23:45' },
                    { num: 20, labelEt: 'VAGUN 20', labelEn: 'CARRIAGE 20', sub: 'Vari / Shadow' },
                    { num: 50, labelEt: 'VAGUN 50', labelEn: 'CARRIAGE 50', sub: 'Tõde / Truth' },
                    { num: 80, labelEt: 'VAGUN 80', labelEn: 'CARRIAGE 80', sub: 'Peakaart' },
                    { num: 100, labelEt: 'KULDNE TERMINAL 100 ⭐', labelEn: 'GOLDEN TERMINAL 100 ⭐', sub: 'Checkpoint & Pood' }
                ];

                milestones.forEach((m, mIdx) => {
                    const x = 90 + mIdx * 210;
                    const isPassed = index >= m.num;
                    const isCurrent = (mIdx === 0 && index === 0) || (index >= m.num && (mIdx === milestones.length - 1 || index < milestones[mIdx + 1].num));

                    // Station Dot
                    ctx.beginPath();
                    ctx.arc(x, lineY, isCurrent ? 14 : 10, 0, Math.PI * 2);
                    if (m.num === 100) {
                        ctx.fillStyle = isPassed ? '#f59e0b' : '#78350f';
                    } else {
                        ctx.fillStyle = isPassed ? '#10b981' : '#334155';
                    }
                    ctx.fill();

                    if (isCurrent) {
                        ctx.strokeStyle = '#f59e0b';
                        ctx.lineWidth = 4;
                        ctx.beginPath();
                        ctx.arc(x, lineY, 18, 0, Math.PI * 2);
                        ctx.stroke();
                    }

                    // Station Name
                    ctx.fillStyle = isCurrent ? '#fef08a' : (isPassed ? '#ffffff' : '#94a3b8');
                    ctx.font = isCurrent ? 'bold 18px "Segoe UI", Arial, sans-serif' : 'bold 16px "Segoe UI", Arial, sans-serif';
                    ctx.textAlign = 'center';
                    const mainLbl = isEt ? m.labelEt : m.labelEn;
                    ctx.fillText(mainLbl, x, lineY - 26);

                    // Subtitle / Milestone description
                    ctx.fillStyle = isCurrent ? '#fbbf24' : (isPassed ? '#6ee7b7' : '#64748b');
                    ctx.font = '13px "Segoe UI", Arial, sans-serif';
                    ctx.fillText(m.sub, x, lineY + 36);
                });

                // Footer Status Message
                ctx.fillStyle = '#94a3b8';
                ctx.font = '14px "Segoe UI", Arial, sans-serif';
                ctx.textAlign = 'center';
                if (index < 100) {
                    const remaining = 100 - index;
                    ctx.fillText(
                        isEt
                            ? `Järgmise suure checkpointini (Vagun 100): veel ${remaining} vagunit`
                            : `Distance to next major checkpoint (Carriage 100): ${remaining} carriages remaining`,
                        512,
                        228
                    );
                } else if (index === 100) {
                    ctx.fillStyle = '#fbbf24';
                    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
                    ctx.fillText(
                        isEt ? '🌟 Oled jõudnud KULDSE TERMINALINI (Vagun 100)! Pood ja Checkpoint on avatud.' : '🌟 REACHED GOLDEN TERMINAL (Carriage 100)! Shop & Checkpoint active.',
                        512,
                        228
                    );
                } else {
                    ctx.fillStyle = '#a855f7';
                    ctx.fillText(
                        isEt ? `Lõputu metroo tsoon: Vagun ${index} (Edasijõudnud sügavus)` : `Endless subway zone: Carriage ${index} (Advanced depth)`,
                        512,
                        228
                    );
                }
            }
        }

        const mapTexture = new THREE.CanvasTexture(mapCanvas);
        const mapMat = new THREE.MeshStandardMaterial({
            map: mapTexture,
            roughness: 0.3,
            metalness: 0.1,
            emissive: new THREE.Color(0x0a101f),
            emissiveIntensity: 0.2
        });

        // Sleek frame backing
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x181e29, metalness: 0.8, roughness: 0.2 });
        const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.64, 0.04), frameMat);
        group.add(frameMesh);

        // Display panel face
        const displayMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.6), mapMat);
        displayMesh.position.z = 0.022;
        group.add(displayMesh);

        return group;
    }

    private buildGangwayDoor(carWidth: number, carHeight: number, dir: number, carIndex: number, branch: DirectionBranch, theme: CarriageData['theme']): THREE.Group {
        const doorGroup = new THREE.Group();

        // End Bulkhead Wall with centered door archway
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.6 });
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry((carWidth - 1.4) / 2, carHeight, 0.25), wallMat);
        leftWall.position.set(-(carWidth + 1.4) / 4, carHeight / 2, 0);
        doorGroup.add(leftWall);

        const rightWall = new THREE.Mesh(new THREE.BoxGeometry((carWidth - 1.4) / 2, carHeight, 0.25), wallMat);
        rightWall.position.set((carWidth + 1.4) / 4, carHeight / 2, 0);
        doorGroup.add(rightWall);

        const topWall = new THREE.Mesh(new THREE.BoxGeometry(1.4, carHeight - 2.2, 0.25), wallMat);
        topWall.position.set(0, 2.2 + (carHeight - 2.2) / 2, 0);
        doorGroup.add(topWall);

        // Gangway Glass Door Frame
        const frameMat = new THREE.MeshStandardMaterial({
            color: theme === 'abandoned' ? 0x7f1d1d : 0x1e272e,
            metalness: 0.7,
            roughness: 0.3
        });
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.15, 0.08), frameMat);
        frame.position.set(0, 1.1, 0);
        doorGroup.add(frame);

        // Glass Window in Gangway Door
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x111e2e,
            transparent: true,
            opacity: 0.6,
            roughness: 0.1
        });
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.25, 0.09), glassMat);
        glass.position.set(0, 1.35, 0);
        doorGroup.add(glass);

        // Metallic Handle
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.9, roughness: 0.2 });
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3), handleMat);
        handle.position.set(0.48, 1.05, 0.08);
        doorGroup.add(handle);

        // Status Indicator above door
        const isForwardDoor = (branch === 'right' && dir > 0) || (branch === 'left' && dir < 0) || (branch === 'undecided');
        const isLockedBackDoor = !isForwardDoor && carIndex >= 1;

        const indColor = isLockedBackDoor ? 0xff4757 : 0x2ed573;
        const indMat = new THREE.MeshBasicMaterial({ color: indColor });
        const ind = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.06), indMat);
        ind.position.set(0, 2.25, dir * 0.14);
        doorGroup.add(ind);

        // --- Creepy Red-Faced Entity in Every Locked Back Gangway Door ---
        if (isLockedBackDoor) {
            const redFaceGroup = new THREE.Group();

            // Dark Silhouette Body
            const bodyMat = new THREE.MeshStandardMaterial({
                color: 0x050608,
                roughness: 0.9,
                metalness: 0.1
            });
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.2, 0.35), bodyMat);
            body.position.set(0, 0.9, 0);
            redFaceGroup.add(body);

            // Glowing Crimson Red Face (Punane Nägu)
            const faceMat = new THREE.MeshStandardMaterial({
                color: 0xff1744,
                emissive: 0xd50000,
                emissiveIntensity: 0.85,
                roughness: 0.25
            });
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), faceMat);
            head.position.set(0, 1.46, 0);
            redFaceGroup.add(head);

            // Piercing Glowing Eyes
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            [-0.055, 0.055].forEach(ex => {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), eyeMat);
                eye.position.set(ex, 1.48, -dir * 0.16);
                redFaceGroup.add(eye);
            });

            // Glowing Crimson Point Light to make the red face clearly visible
            const redGlow = new THREE.PointLight(0xff1744, 2.2, 3.8);
            redGlow.position.set(0, 1.48, -dir * 0.22);
            redFaceGroup.add(redGlow);

            // Position right behind the glass window of the locked door
            redFaceGroup.position.set(0, 0, dir * 0.55);
            doorGroup.add(redFaceGroup);
        }

        return doorGroup;
    }

    private spawnCollectibleCoins(carGroup: THREE.Group, count: number = 3) {
        const coinMat = new THREE.MeshStandardMaterial({
            color: 0xffd32a,
            metalness: 0.95,
            roughness: 0.12,
            emissive: 0xffd32a,
            emissiveIntensity: 0.35
        });
        const coinGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.025, 16);

        const possiblePositions = [
            new THREE.Vector3(-0.9, 0.55, -4.5),
            new THREE.Vector3(0.9, 0.55, -2.0),
            new THREE.Vector3(0, 0.15, 0.5),
            new THREE.Vector3(-0.9, 0.55, 3.5),
            new THREE.Vector3(0.9, 0.55, 6.0),
            new THREE.Vector3(0, 0.15, -6.5)
        ];

        for (let i = 0; i < count; i++) {
            const pos = possiblePositions[(i + this.currentCarIndex) % possiblePositions.length];
            const coinMesh = new THREE.Mesh(coinGeo, coinMat);
            coinMesh.rotation.x = Math.PI / 2;
            coinMesh.position.copy(pos);
            carGroup.add(coinMesh);

            this.collectibleCoins.push({
                mesh: coinMesh,
                value: 2,
                collected: false
            });
        }
    }

    private createInspectableNote(): THREE.Group {
        const noteGroup = new THREE.Group();

        // Leather notebook cover
        const bookCoverMat = new THREE.MeshStandardMaterial({ color: 0x4a2810, roughness: 0.8 });
        const bookCover = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.26), bookCoverMat);
        noteGroup.add(bookCover);

        // Yellowed paper pages
        const paperMat = new THREE.MeshStandardMaterial({ color: 0xfae5bf, roughness: 0.9 });
        const paper = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.045, 0.24), paperMat);
        paper.position.y = 0.01;
        noteGroup.add(paper);

        // Interactive subtle pulse beacon
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), beaconMat);
        beacon.position.set(0, 0.1, 0);
        noteGroup.add(beacon);

        return noteGroup;
    }

    private createKeypadProp(): THREE.Group {
        const keypadGroup = new THREE.Group();

        // Metal mounting plate
        const plateMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.8, roughness: 0.3 });
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.08), plateMat);
        keypadGroup.add(plate);

        // Digital backlit LCD screen
        const screenMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
        const screen = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.09), screenMat);
        screen.position.set(0, 0.1, 0);
        keypadGroup.add(screen);

        return keypadGroup;
    }

    private createClue3DMesh(clue: ClueItem): THREE.Group {
        const group = new THREE.Group();
        group.name = 'clue_prop_' + clue.id;

        if (clue.type === 'ticket') {
            const mat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.6 });
            const ticket = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.015, 0.16), mat);
            group.add(ticket);
            const light = new THREE.PointLight(0x00f2fe, 1.2, 2.5);
            light.position.set(0, 0.2, 0);
            group.add(light);
            const dot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
            dot.position.set(0, 0.04, 0);
            group.add(dot);
        } else if (clue.type === 'photo') {
            const frameMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.8 });
            const frame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.015, 0.35), frameMat);
            group.add(frame);
            const photoMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
            const photo = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.24), photoMat);
            photo.position.set(0, 0.005, -0.03);
            group.add(photo);
            const light = new THREE.PointLight(0xffffff, 1.0, 2.0);
            light.position.set(0, 0.2, 0);
            group.add(light);
        } else if (clue.type === 'plate') {
            const mat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, metalness: 0.9, roughness: 0.2 });
            const plate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.2), mat);
            group.add(plate);
            const light = new THREE.PointLight(0x00f2fe, 1.0, 2.0);
            light.position.set(0, 0.2, 0);
            group.add(light);
        } else if (clue.type === 'watch') {
            const mat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.3 });
            const watch = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 16), mat);
            group.add(watch);
            const face = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
            face.rotation.x = -Math.PI / 2;
            face.position.y = 0.022;
            group.add(face);
        } else if (clue.type === 'map') {
            const mat = new THREE.MeshStandardMaterial({ color: 0xe8d8b5, roughness: 0.8 });
            const map = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.3), mat);
            group.add(map);
            const light = new THREE.PointLight(0xf1c40f, 1.0, 2.0);
            light.position.set(0, 0.2, 0);
            group.add(light);
        } else {
            const mat = new THREE.MeshStandardMaterial({ color: 0xf7f1e3, roughness: 0.9 });
            const doc = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.015, 0.42), mat);
            group.add(doc);
            const redSeal = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), new THREE.MeshBasicMaterial({ color: 0xc0392b }));
            redSeal.rotation.x = -Math.PI / 2;
            redSeal.position.set(0.08, 0.01, 0.12);
            group.add(redSeal);
            const light = new THREE.PointLight(0xf1c40f, 0.8, 2.0);
            light.position.set(0, 0.2, 0);
            group.add(light);
        }

        return group;
    }
}
