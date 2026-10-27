import * as THREE from 'three';
import { ParkAttractionDef } from '../types';

export class AttractionModelBuilder {
    public static createStructureMesh(def: ParkAttractionDef): THREE.Group {
        let group: THREE.Group;
        switch (def.id) {
            case 'kids_pool':
                group = this.buildKidsPool();
                break;
            case 'deep_pool':
                group = this.buildDeepPool();
                break;
            case 'long_pool':
                group = this.buildLongPool();
                break;
            case 'tower_segment':
                group = this.buildTowerSegment();
                break;
            case 'pipe_start':
                group = this.buildPipeStart();
                break;
            case 'pipe_straight':
                group = this.buildPipeStraight();
                break;
            case 'pipe_down20':
                group = this.buildPipeDown20();
                break;
            case 'pipe_turn_right':
                group = this.buildPipeTurnRight();
                break;
            case 'pipe_turn_left':
                group = this.buildPipeTurnLeft();
                break;
            default:
                group = this.buildGenericBox(def);
                break;
        }
        // User request: "te nii et asjad on 2X suuremad" -> scale by 2.0
        group.scale.set(2, 2, 2);
        return group;
    }

    // 1. Kids Pool (Madal ja soe lastebassein)
    private static buildKidsPool(): THREE.Group {
        const group = new THREE.Group();
        group.name = 'kids_pool';

        // Outer white rim
        const rim = new THREE.Mesh(
            new THREE.BoxGeometry(8, 0.4, 8),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
        );
        rim.position.y = 0.2;
        group.add(rim);

        // Water
        const water = new THREE.Mesh(
            new THREE.BoxGeometry(7.4, 0.35, 7.4),
            new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                roughness: 0.1,
                transparent: true,
                opacity: 0.82
            })
        );
        water.position.y = 0.25;
        group.add(water);

        // Mini decorative water fountain mushroom in center
        const stem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.15, 1.2, 12),
            new THREE.MeshStandardMaterial({ color: 0xf1f2f6 })
        );
        stem.position.y = 0.6;
        group.add(stem);

        const cap = new THREE.Mesh(
            new THREE.ConeGeometry(0.9, 0.4, 16),
            new THREE.MeshStandardMaterial({ color: 0xff4757, roughness: 0.3 })
        );
        cap.position.y = 1.3;
        group.add(cap);

        return group;
    }

    // 2. Deep Pool (Sügav bassein sukeldumiseks)
    private static buildDeepPool(): THREE.Group {
        const group = new THREE.Group();
        group.name = 'deep_pool';

        const rim = new THREE.Mesh(
            new THREE.BoxGeometry(14, 0.5, 14),
            new THREE.MeshStandardMaterial({ color: 0xdfe4ea, roughness: 0.3 })
        );
        rim.position.y = 0.25;
        group.add(rim);

        const water = new THREE.Mesh(
            new THREE.BoxGeometry(13.2, 0.45, 13.2),
            new THREE.MeshStandardMaterial({
                color: 0x0984e3,
                roughness: 0.05,
                metalness: 0.2,
                transparent: true,
                opacity: 0.88
            })
        );
        water.position.y = 0.3;
        group.add(water);

        // Diving board
        const boardStand = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 1.8, 0.4),
            new THREE.MeshStandardMaterial({ color: 0x747d8c })
        );
        boardStand.position.set(0, 0.9, -6.2);
        group.add(boardStand);

        const boardPlank = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 0.1, 2.5),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        boardPlank.position.set(0, 1.8, -5.2);
        group.add(boardPlank);

        return group;
    }

    // 3. Long Pool (Pikk ujumisbassein)
    private static buildLongPool(): THREE.Group {
        const group = new THREE.Group();
        group.name = 'long_pool';

        const rim = new THREE.Mesh(
            new THREE.BoxGeometry(8, 0.5, 28),
            new THREE.MeshStandardMaterial({ color: 0xf1f2f6, roughness: 0.3 })
        );
        rim.position.y = 0.25;
        group.add(rim);

        const water = new THREE.Mesh(
            new THREE.BoxGeometry(7.4, 0.45, 27.4),
            new THREE.MeshStandardMaterial({
                color: 0x00cec9,
                roughness: 0.08,
                transparent: true,
                opacity: 0.85
            })
        );
        water.position.y = 0.3;
        group.add(water);

        // Swim lane divider floats
        for (let z = -12; z <= 12; z += 2) {
            const floatL = new THREE.Mesh(
                new THREE.SphereGeometry(0.15, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0xff4757 })
            );
            floatL.position.set(0, 0.35, z);
            group.add(floatL);
        }

        return group;
    }

    // 4. Tower Segment (Treppidega Torn, kõrgus 3.5m, virnastatav kuni 6)
    public static buildTowerSegment(): THREE.Group {
        const group = new THREE.Group();
        group.name = 'tower_segment';

        const h = 3.5;
        const w = 4.0;
        const postMat = new THREE.MeshStandardMaterial({ color: 0xe17055, metalness: 0.3, roughness: 0.5 });
        const platMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.4 });
        const stairMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, roughness: 0.4 });
        const railMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

        // 4 corner columns
        const half = w / 2 - 0.2;
        const corners = [
            [-half, -half],
            [half, -half],
            [-half, half],
            [half, half]
        ];
        corners.forEach(([cx, cz]) => {
            const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, h, 8), postMat);
            col.position.set(cx, h / 2, cz);
            group.add(col);
        });

        // Top Platform Deck
        const deck = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, w), platMat);
        deck.position.set(0, h, 0);
        group.add(deck);

        // Guardrails around platform
        const rHeight = 0.9;
        const frontRail = new THREE.Mesh(new THREE.BoxGeometry(w, rHeight, 0.08), railMat);
        frontRail.position.set(0, h + rHeight / 2, half + 0.1);
        group.add(frontRail);

        const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, rHeight, w), railMat);
        leftRail.position.set(-half - 0.1, h + rHeight / 2, 0);
        group.add(leftRail);

        const rightRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, rHeight, w), railMat);
        rightRail.position.set(half + 0.1, h + rHeight / 2, 0);
        group.add(rightRail);

        // Stairs inside the tower climbing up to deck
        const steps = 7;
        for (let i = 0; i < steps; i++) {
            const step = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 0.4), stairMat);
            const progress = i / steps;
            step.position.set(0.6, progress * h + 0.2, (progress - 0.5) * (w - 1.2));
            group.add(step);
        }

        return group;
    }

    // 5. Pipe Start (Ainult torni külge kinnituv algusplatvorm ja toru suue)
    public static buildPipeStart(): THREE.Group {
        const group = new THREE.Group();
        group.name = 'pipe_start';

        // Base entry platform connecting to tower
        const basePlat = new THREE.Mesh(
            new THREE.BoxGeometry(2.4, 0.2, 1.8),
            new THREE.MeshStandardMaterial({ color: 0x00b894 })
        );
        basePlat.position.set(0, 0, 0.5);
        group.add(basePlat);

        // Funnel entrance archway
        const arch = new THREE.Mesh(
            new THREE.TorusGeometry(0.9, 0.18, 12, 16, Math.PI),
            new THREE.MeshStandardMaterial({ color: 0x00cec9, roughness: 0.2 })
        );
        arch.position.set(0, 0.8, 1.0);
        group.add(arch);

        // Water flume start trough
        const trough = this.createOpenTubeSection(1.6, 0.8, 0x00b894);
        trough.position.set(0, 0.35, 1.4);
        group.add(trough);

        return group;
    }

    // 6. Straight Pipe (Otse veetoru 4m pikk)
    public static buildPipeStraight(): THREE.Group {
        const group = new THREE.Group();
        group.name = 'pipe_straight';

        const tube = this.createOpenTubeSection(4.0, 0.8, 0x0984e3);
        tube.position.set(0, 0, 2.0);
        group.add(tube);

        // Support pillar underneath
        const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 10, 8),
            new THREE.MeshStandardMaterial({ color: 0x747d8c })
        );
        pillar.position.set(0, -5, 2.0);
        group.add(pillar);

        return group;
    }

    // 7. Pipe Down 20° (20 kraadi allapoole suunatud sektsioon)
    public static buildPipeDown20(): THREE.Group {
        const group = new THREE.Group();
        group.name = 'pipe_down20';

        const len = 4.0;
        const angle = THREE.MathUtils.degToRad(20);

        const sub = new THREE.Group();
        const tube = this.createOpenTubeSection(len, 0.8, 0x6c5ce7);
        tube.position.set(0, 0, len / 2);
        sub.add(tube);

        sub.rotation.x = angle;
        group.add(sub);

        // Support pole
        const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 12, 8),
            new THREE.MeshStandardMaterial({ color: 0x747d8c })
        );
        pillar.position.set(0, -6, len / 2);
        group.add(pillar);

        return group;
    }

    // 8. Pipe Turn Right (90° pööre paremale)
    public static buildPipeTurnRight(): THREE.Group {
        const group = new THREE.Group();
        group.name = 'pipe_turn_right';

        const radius = 2.5;
        const curvePoints: THREE.Vector3[] = [];
        for (let a = 0; a <= Math.PI / 2; a += Math.PI / 16) {
            curvePoints.push(new THREE.Vector3(radius - Math.cos(a) * radius, 0, Math.sin(a) * radius));
        }

        const curve = new THREE.CatmullRomCurve3(curvePoints);
        const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.8, 12, false);
        const tubeMat = new THREE.MeshStandardMaterial({
            color: 0xfdcb6e,
            roughness: 0.2,
            side: THREE.DoubleSide
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        group.add(tubeMesh);

        return group;
    }

    // 9. Pipe Turn Left (90° pööre vasakule)
    public static buildPipeTurnLeft(): THREE.Group {
        const group = new THREE.Group();
        group.name = 'pipe_turn_left';

        const radius = 2.5;
        const curvePoints: THREE.Vector3[] = [];
        for (let a = 0; a <= Math.PI / 2; a += Math.PI / 16) {
            curvePoints.push(new THREE.Vector3(-radius + Math.cos(a) * radius, 0, Math.sin(a) * radius));
        }

        const curve = new THREE.CatmullRomCurve3(curvePoints);
        const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.8, 12, false);
        const tubeMat = new THREE.MeshStandardMaterial({
            color: 0xe84393,
            roughness: 0.2,
            side: THREE.DoubleSide
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        group.add(tubeMesh);

        return group;
    }

    // Helper: create half-pipe / flume trough section with moving water layer
    private static createOpenTubeSection(length: number, radius: number, colorHex: number): THREE.Group {
        const grp = new THREE.Group();

        // Half cylinder flume (bottom half)
        const tubeGeo = new THREE.CylinderGeometry(radius, radius, length, 16, 1, true, 0, Math.PI);
        const tubeMat = new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: 0.25,
            side: THREE.DoubleSide
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        tubeMesh.rotation.x = Math.PI / 2;
        tubeMesh.rotation.z = Math.PI; // Opening upwards
        grp.add(tubeMesh);

        // Water strip inside trough
        const waterGeo = new THREE.PlaneGeometry(radius * 1.5, length);
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x00f2fe,
            roughness: 0.1,
            metalness: 0.3,
            transparent: true,
            opacity: 0.85
        });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = -radius * 0.2;
        grp.add(water);

        return grp;
    }

    private static buildGenericBox(def: ParkAttractionDef): THREE.Group {
        const group = new THREE.Group();
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(def.dimensions.x, def.dimensions.y, def.dimensions.z),
            new THREE.MeshStandardMaterial({ color: def.color })
        );
        mesh.position.y = def.dimensions.y / 2;
        group.add(mesh);
        return group;
    }
}
