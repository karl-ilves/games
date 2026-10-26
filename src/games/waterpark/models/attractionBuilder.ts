import * as THREE from 'three';
import { ParkAttractionDef } from '../types';

export class AttractionModelBuilder {
    public static createStructureMesh(def: ParkAttractionDef): THREE.Group {
        const group = new THREE.Group();
        group.name = `attraction_${def.id}`;

        switch (def.id) {
            case 'kiddie_pool':
                return this.buildKiddiePool(def);
            case 'wave_pool':
                return this.buildWavePool(def);
            case 'lazy_river':
                return this.buildLazyRiver(def);
            case 'jacuzzi_oasis':
                return this.buildJacuzzi(def);
            case 'speed_slide':
                return this.buildSpeedSlide(def);
            case 'tornado_bowl':
                return this.buildTornadoBowl(def);
            case 'twister_spiral':
                return this.buildTwisterSpiral(def);
            case 'raft_slide':
                return this.buildRaftSlide(def);
            case 'tipping_bucket':
                return this.buildTippingBucket(def);
            case 'water_cannons':
                return this.buildWaterCannons(def);
            case 'diving_board':
                return this.buildDivingBoard(def);
            case 'icecream_shack':
                return this.buildIceCreamShack(def);
            case 'tiki_snack_bar':
                return this.buildTikiBar(def);
            case 'cabana_lounge':
                return this.buildCabana(def);
            case 'palm_grove':
                return this.buildPalmGrove(def);
            case 'rocky_fountain':
                return this.buildRockyFountain(def);
            default:
                return this.buildGenericAttraction(def);
        }
    }

    private static buildKiddiePool(def: ParkAttractionDef): THREE.Group {
        const group = new THREE.Group();
        // Pool basin rim
        const rimGeo = new THREE.CylinderGeometry(4.2, 4.4, 0.6, 24);
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.position.y = 0.3;
        group.add(rim);

        // Water surface
        const waterGeo = new THREE.CylinderGeometry(4.0, 4.0, 0.4, 24);
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            roughness: 0.1,
            metalness: 0.2,
            transparent: true,
            opacity: 0.85
        });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.position.y = 0.35;
        water.name = 'water_surface';
        group.add(water);

        // Center mini mushroom fountain
        const stemGeo = new THREE.CylinderGeometry(0.2, 0.25, 2.0, 12);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0xf1f2f6 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 1.0;
        group.add(stem);

        const capGeo = new THREE.ConeGeometry(1.4, 0.6, 16);
        const capMat = new THREE.MeshStandardMaterial({ color: 0xff4757, roughness: 0.4 });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.y = 2.1;
        group.add(cap);

        return group;
    }

    private static buildWavePool(def: ParkAttractionDef): THREE.Group {
        const group = new THREE.Group();
        // Big sloped basin
        const basinGeo = new THREE.BoxGeometry(18, 1.8, 24);
        const basinMat = new THREE.MeshStandardMaterial({ color: 0xe0e6ed, roughness: 0.5 });
        const basin = new THREE.Mesh(basinGeo, basinMat);
        basin.position.y = 0.9;
        group.add(basin);

        // Water layer
        const waterGeo = new THREE.PlaneGeometry(16.5, 22.5, 16, 16);
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x00f2fe,
            roughness: 0.05,
            metalness: 0.3,
            transparent: true,
            opacity: 0.88
        });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = 1.6;
        water.name = 'wave_pool_surface';
        group.add(water);

        // Deep end wave generator machine room
        const machGeo = new THREE.BoxGeometry(18, 4.5, 3);
        const machMat = new THREE.MeshStandardMaterial({ color: 0x2f3542, roughness: 0.6 });
        const mach = new THREE.Mesh(machGeo, machMat);
        mach.position.set(0, 2.25, -11.5);
        group.add(mach);

        // Safety lines & buoys
        for (let i = -7; i <= 7; i += 2) {
            const buoyGeo = new THREE.SphereGeometry(0.25, 8, 8);
            const buoyMat = new THREE.MeshStandardMaterial({ color: 0xffa502 });
            const buoy = new THREE.Mesh(buoyGeo, buoyMat);
            buoy.position.set(i, 1.65, 0);
            group.add(buoy);
        }

        return group;
    }

    private static buildLazyRiver(def: ParkAttractionDef): THREE.Group {
        const group = new THREE.Group();
        // Donut river ring
        const outerRadius = 14;
        const innerRadius = 9;

        const riverGeo = new THREE.RingGeometry(innerRadius, outerRadius, 32);
        const riverMat = new THREE.MeshStandardMaterial({
            color: 0x0be881,
            roughness: 0.1,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
        });
        const water = new THREE.Mesh(riverGeo, riverMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = 0.4;
        water.name = 'lazy_river_water';
        group.add(water);

        // Inner island
        const islandGeo = new THREE.CylinderGeometry(innerRadius - 0.2, innerRadius - 0.2, 0.7, 32);
        const islandMat = new THREE.MeshStandardMaterial({ color: 0xf6e58d });
        const island = new THREE.Mesh(islandGeo, islandMat);
        island.position.y = 0.35;
        group.add(island);

        // Center island palm tree
        const palm = this.buildMiniPalm();
        palm.position.set(0, 0.7, 0);
        group.add(palm);

        // Floating colorful tubes
        const colors = [0xff4757, 0xffa502, 0x2ed573, 0x1e90ff];
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
            const tubeGeo = new THREE.TorusGeometry(0.7, 0.25, 8, 16);
            const tubeMat = new THREE.MeshStandardMaterial({
                color: colors[Math.floor(Math.random() * colors.length)]
            });
            const tube = new THREE.Mesh(tubeGeo, tubeMat);
            tube.rotation.x = Math.PI / 2;
            const r = 11.5;
            tube.position.set(Math.cos(a) * r, 0.55, Math.sin(a) * r);
            group.add(tube);
        }

        return group;
    }

    private static buildJacuzzi(def: ParkAttractionDef): THREE.Group {
        const group = new THREE.Group();
        // Octagonal wooden hot tub
        const tubGeo = new THREE.CylinderGeometry(3.5, 3.5, 1.2, 8);
        const tubMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 });
        const tub = new THREE.Mesh(tubGeo, tubMat);
        tub.position.y = 0.6;
        group.add(tub);

        const waterGeo = new THREE.CylinderGeometry(3.1, 3.1, 0.3, 16);
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x48dbfb,
            roughness: 0.1,
            transparent: true,
            opacity: 0.9
        });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.position.y = 1.0;
        water.name = 'jacuzzi_water';
        group.add(water);

        return group;
    }

    private static buildSpeedSlide(def: ParkAttractionDef): THREE.Group {
        const group = new THREE.Group();
        // Tall tower staircase
        const towerGeo = new THREE.BoxGeometry(4, 14, 4);
        const towerMat = new THREE.MeshStandardMaterial({ color: 0x747d8c });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.set(0, 7, -8);
        group.add(tower);

        // Platform on top
        const platGeo = new THREE.BoxGeometry(5.5, 0.5, 5.5);
        const platMat = new THREE.MeshStandardMaterial({ color: 0x2ed573 });
        const plat = new THREE.Mesh(platGeo, platMat);
        plat.position.set(0, 14, -8);
        group.add(plat);

        // Steep drop slide chute (Spline / Curve geometry approximation)
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 13.8, -6),
            new THREE.Vector3(0, 11, -3),
            new THREE.Vector3(0, 4, 2),
            new THREE.Vector3(0, 0.6, 7),
            new THREE.Vector3(0, 0.4, 11)
        ]);

        const tubeGeo = new THREE.TubeGeometry(curve, 30, 0.9, 12, false);
        const tubeMat = new THREE.MeshStandardMaterial({
            color: 0xff4757,
            roughness: 0.2,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const chute = new THREE.Mesh(tubeGeo, tubeMat);
        group.add(chute);

        // Splashdown runout pool at base
        const poolGeo = new THREE.BoxGeometry(3.5, 0.6, 8);
        const poolMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const pool = new THREE.Mesh(poolGeo, poolMat);
        pool.position.set(0, 0.3, 10);
        group.add(pool);

        const waterGeo = new THREE.BoxGeometry(3.1, 0.4, 7.6);
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x00f2fe,
            transparent: true,
            opacity: 0.8
        });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.position.set(0, 0.4, 10);
        group.add(water);

        return group;
    }

    private static buildTornadoBowl(def: ParkAttractionDef): THREE.Group {
        const group = new THREE.Group();
        // Huge funnel bowl
        const bowlGeo = new THREE.CylinderGeometry(7, 2, 4.5, 24, 1, true);
        const bowlMat = new THREE.MeshStandardMaterial({
            color: 0xffa502,
            roughness: 0.25,
            side: THREE.DoubleSide
        });
        const bowl = new THREE.Mesh(bowlGeo, bowlMat);
        bowl.position.set(0, 6, 0);
        group.add(bowl);

        // Support pillars
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            const legGeo = new THREE.CylinderGeometry(0.3, 0.3, 6, 8);
            const legMat = new THREE.MeshStandardMaterial({ color: 0x747d8c });
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(Math.cos(angle) * 4.5, 3, Math.sin(angle) * 4.5);
            group.add(leg);
        }

        // Drop pool below bowl center
        const poolGeo = new THREE.CylinderGeometry(3.2, 3.2, 0.8, 16);
        const poolMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.85 });
        const pool = new THREE.Mesh(poolGeo, poolMat);
        pool.position.y = 0.4;
        group.add(pool);

        return group;
    }

    private static buildTwisterSpiral(def: ParkAttractionDef): THREE.Group {
        const group = new THREE.Group();
        // Central tower
        const towerGeo = new THREE.CylinderGeometry(1.8, 2.0, 12, 12);
        const towerMat = new THREE.MeshStandardMaterial({ color: 0x57606f });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.y = 6;
        group.add(tower);

        // Helical curve for spiral tube
        const points: THREE.Vector3[] = [];
        const radius = 3.6;
        const height = 11;
        const turns = 2.5;
        const segments = 40;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const angle = t * turns * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(angle) * radius, height * (1 - t) + 0.5, Math.sin(angle) * radius));
        }

        const spiralCurve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(spiralCurve, 40, 0.7, 10, false);
        const tubeMat = new THREE.MeshStandardMaterial({ color: 0x2ed573, roughness: 0.3 });
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        group.add(tube);

        return group;
    }

    private static buildRaftSlide(def: ParkAttractionDef): THREE.Group {
        const group = new THREE.Group();
        // Wide curving raft flume
        const points = [
            new THREE.Vector3(-4, 9, -8),
            new THREE.Vector3(2, 6, -3),
            new THREE.Vector3(-2, 3, 3),
            new THREE.Vector3(0, 0.5, 9)
        ];
        const curve = new THREE.CatmullRomCurve3(points);
        const flumeGeo = new THREE.TubeGeometry(curve, 25, 1.4, 8, false);
        const flumeMat = new THREE.MeshStandardMaterial({ color: 0x1e90ff, roughness: 0.2 });
        const flume = new THREE.Mesh(flumeGeo, flumeMat);
        group.add(flume);

        return group;
    }

    private static buildTippingBucket(def: ParkAttractionDef): THREE.Group {
        const group = new THREE.Group();
        // Steel frame structure
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xff6b81 });
        const f1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 10, 8), frameMat);
        f1.position.set(-3, 5, 0);
        group.add(f1);

        const f2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 10, 8), frameMat);
        f2.position.set(3, 5, 0);
        group.add(f2);

        // Giant bucket atop frame
        const bucketGeo = new THREE.CylinderGeometry(1.8, 1.2, 2.5, 16);
        const bucketMat = new THREE.MeshStandardMaterial({ color: 0xffa502 });
        const bucket = new THREE.Mesh(bucketGeo, bucketMat);
        bucket.position.set(0, 9.5, 0);
        bucket.name = 'tipping_bucket_mesh';
        group.add(bucket);

        return group;
    }

    private static buildWaterCannons(def: ParkAttractionDef): THREE.Group {
        const group = new THREE.Group();
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x70a1ff });
        for (let i = -2; i <= 2; i += 2) {
            const cannon = new THREE.Group();
            const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.2, 8), baseMat);
            stand.position.y = 0.6;
            cannon.add(stand);

            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 1.2, 8), baseMat);
            barrel.rotation.x = Math.PI / 3;
            barrel.position.set(0, 1.3, 0.4);
            cannon.add(barrel);

            cannon.position.set(i * 1.5, 0, 0);
            group.add(cannon);
        }
        return group;
    }

    private static buildDivingBoard(def: ParkAttractionDef): THREE.Group {
        const group = new THREE.Group();
        // Diving tower
        const towerGeo = new THREE.BoxGeometry(2, 11, 2);
        const towerMat = new THREE.MeshStandardMaterial({ color: 0x3742fa });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.set(0, 5.5, -2);
        group.add(tower);

        // 3m, 5m, 10m springboards
        const levels = [3.5, 6.0, 10.5];
        for (const lvl of levels) {
            const boardGeo = new THREE.BoxGeometry(1.0, 0.15, 3.5);
            const boardMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
            const board = new THREE.Mesh(boardGeo, boardMat);
            board.position.set(0, lvl, 0.5);
            group.add(board);
        }
        return group;
    }

    private static buildIceCreamShack(def: ParkAttractionDef): THREE.Group {
        const group = new THREE.Group();
        // Wooden kiosk
        const bodyGeo = new THREE.BoxGeometry(3.6, 2.6, 3.2);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xfff2cc });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.3;
        group.add(body);

        // Striped awning
        const roofGeo = new THREE.ConeGeometry(2.8, 1.2, 4);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0xff4757 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 3.1;
        roof.rotation.y = Math.PI / 4;
        group.add(roof);

        return group;
    }

    private static buildTikiBar(def: ParkAttractionDef): THREE.Group {
        const group = new THREE.Group();
        // Thatch roof tiki bar
        const roofGeo = new THREE.ConeGeometry(3.5, 1.6, 8);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 3.2;
        group.add(roof);

        // Bamboo poles
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2 + Math.PI / 4;
            const pole = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12, 0.12, 2.5, 8),
                new THREE.MeshStandardMaterial({ color: 0xdfe4ea })
            );
            pole.position.set(Math.cos(angle) * 1.8, 1.25, Math.sin(angle) * 1.8);
            group.add(pole);
        }

        return group;
    }

    private static buildCabana(def: ParkAttractionDef): THREE.Group {
        const group = new THREE.Group();
        // Two lounge chairs with parasol
        const chairMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const chair1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 2.0), chairMat);
        chair1.position.set(-1.2, 0.2, 0);
        group.add(chair1);

        const chair2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 2.0), chairMat);
        chair2.position.set(1.2, 0.2, 0);
        group.add(chair2);

        // Umbrella
        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8),
            new THREE.MeshStandardMaterial({ color: 0x747d8c })
        );
        pole.position.set(0, 1.3, -0.6);
        group.add(pole);

        const shade = new THREE.Mesh(
            new THREE.ConeGeometry(1.8, 0.7, 8),
            new THREE.MeshStandardMaterial({ color: 0xffa502 })
        );
        shade.position.set(0, 2.6, -0.6);
        group.add(shade);

        return group;
    }

    private static buildPalmGrove(def: ParkAttractionDef): THREE.Group {
        const group = new THREE.Group();
        const p1 = this.buildMiniPalm();
        p1.position.set(-1, 0, -1);
        group.add(p1);

        const p2 = this.buildMiniPalm();
        p2.position.set(1.2, 0, 0.8);
        p2.scale.set(0.85, 0.85, 0.85);
        group.add(p2);

        return group;
    }

    private static buildMiniPalm(): THREE.Group {
        const palm = new THREE.Group();
        const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 4.5, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 2.25;
        palm.add(trunk);

        // Leaves
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x2ed573, roughness: 0.5 });
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 2.2), leafMat);
            leaf.position.set(Math.cos(angle) * 1.0, 4.4, Math.sin(angle) * 1.0);
            leaf.rotation.y = angle;
            leaf.rotation.x = 0.3;
            palm.add(leaf);
        }
        return palm;
    }

    private static buildRockyFountain(def: ParkAttractionDef): THREE.Group {
        const group = new THREE.Group();
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x57606f, roughness: 0.9 });
        for (let i = 0; i < 5; i++) {
            const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + Math.random() * 0.4), rockMat);
            rock.position.set((Math.random() - 0.5) * 2.2, 0.5 + Math.random() * 0.6, (Math.random() - 0.5) * 2.2);
            group.add(rock);
        }
        return group;
    }

    private static buildGenericAttraction(def: ParkAttractionDef): THREE.Group {
        const group = new THREE.Group();
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(def.dimensions.x, def.dimensions.y, def.dimensions.z),
            new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.4 })
        );
        mesh.position.y = def.dimensions.y / 2;
        group.add(mesh);
        return group;
    }
}
