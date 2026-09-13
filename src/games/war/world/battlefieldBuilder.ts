import * as THREE from 'three';
import { WorldObstacle, ExplosiveBarrel, Team } from '../types';

export class BattlefieldBuilder {
    private scene: THREE.Scene;
    public obstacles: WorldObstacle[] = [];
    public barrels: ExplosiveBarrel[] = [];
    public missileSilos: Map<Team, THREE.Vector3> = new Map();

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public buildBattlefield(customScene?: THREE.Scene): void {
        const scene = customScene || this.scene;
        const groundGeo = new THREE.PlaneGeometry(1680, 1680, 80, 80);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x1f271c, roughness: 0.9, metalness: 0.1 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        const grid = new THREE.GridHelper(1600, 80, 0x3d4a36, 0x171d15);
        grid.position.y = 0.05;
        scene.add(grid);

        this.createBaseStation(scene, new THREE.Vector3(0, 0, 270), 'red');
        this.createBaseStation(scene, new THREE.Vector3(0, 0, -270), 'blue');

        this.createMissileSilo(scene, new THREE.Vector3(45, 0, 270), 'red');
        this.createMissileSilo(scene, new THREE.Vector3(-45, 0, -270), 'blue');
        this.createMissileSilo(scene, new THREE.Vector3(75, 0, 0), 'missile');

        this.createMilitaryFort(scene, new THREE.Vector3(0, 0, 0));
        this.createMilitaryFort(scene, new THREE.Vector3(130, 0, 90));
        this.createMilitaryFort(scene, new THREE.Vector3(-130, 0, -90));
        this.createMilitaryFort(scene, new THREE.Vector3(-130, 0, 90));
        this.createMilitaryFort(scene, new THREE.Vector3(130, 0, -90));
        this.createMilitaryFort(scene, new THREE.Vector3(0, 0, 135));
        this.createMilitaryFort(scene, new THREE.Vector3(0, 0, -135));

        this.createMilitaryHouse(scene, new THREE.Vector3(70, 0, 45), 14, 12);
        this.createMilitaryHouse(scene, new THREE.Vector3(-70, 0, -45), 14, 12);
        this.createMilitaryHouse(scene, new THREE.Vector3(70, 0, -45), 14, 12);
        this.createMilitaryHouse(scene, new THREE.Vector3(-70, 0, 45), 14, 12);
        this.createMilitaryHouse(scene, new THREE.Vector3(200, 0, 180), 16, 14);
        this.createMilitaryHouse(scene, new THREE.Vector3(-200, 0, -180), 16, 14);

        [
            new THREE.Vector3(20, 0, 20),
            new THREE.Vector3(-20, 0, -20),
            new THREE.Vector3(45, 0, -35),
            new THREE.Vector3(-45, 0, 35),
            new THREE.Vector3(80, 0, 110),
            new THREE.Vector3(-80, 0, -110)
        ].forEach(pos => this.createBarricade(scene, pos));

        [
            new THREE.Vector3(15, 0, 0),
            new THREE.Vector3(-15, 0, 0),
            new THREE.Vector3(0, 0, 40),
            new THREE.Vector3(0, 0, -40),
            new THREE.Vector3(60, 0, 60),
            new THREE.Vector3(-60, 0, -60),
            new THREE.Vector3(90, 0, -70),
            new THREE.Vector3(-90, 0, 70),
            new THREE.Vector3(30, 0, 150),
            new THREE.Vector3(-30, 0, -150)
        ].forEach(pos => this.createExplosiveBarrel(scene, pos));
    }

    private createBaseStation(scene: THREE.Scene, pos: THREE.Vector3, team: Team): void {
        const group = new THREE.Group();
        group.position.copy(pos);

        const isRed = team === 'red';
        const color = isRed ? 0x991b1b : 0x1d4ed8;

        const pad = new THREE.Mesh(
            new THREE.CylinderGeometry(26, 28, 0.4, 32),
            new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 })
        );
        pad.position.y = 0.2;
        group.add(pad);

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(26.5, 0.5, 8, 32),
            new THREE.MeshBasicMaterial({ color: color })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.45;
        group.add(ring);

        scene.add(group);
    }

    private createMissileSilo(scene: THREE.Scene, pos: THREE.Vector3, team: Team): void {
        const group = new THREE.Group();
        group.position.copy(pos);

        const isRed = team === 'red';
        const siloColor = isRed ? 0x7f1d1d : (team === 'blue' ? 0x1e3a8a : 0x15803d);
        const accentColor = isRed ? 0xff4757 : (team === 'blue' ? 0x00f2fe : 0x2ecc71);

        const base = new THREE.Mesh(
            new THREE.BoxGeometry(16, 4.0, 16),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.4 })
        );
        base.position.y = 2.0;
        base.castShadow = true;
        group.add(base);

        const siloDome = new THREE.Mesh(
            new THREE.CylinderGeometry(4.5, 5.0, 1.2, 24),
            new THREE.MeshStandardMaterial({ color: siloColor, metalness: 0.7, roughness: 0.3 })
        );
        siloDome.position.y = 4.6;
        group.add(siloDome);

        const radarDish = new THREE.Mesh(
            new THREE.SphereGeometry(1.6, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: accentColor, metalness: 0.9 })
        );
        radarDish.rotation.x = -Math.PI / 3;
        radarDish.position.set(4, 5.5, 4);
        group.add(radarDish);

        scene.add(group);
        this.missileSilos.set(team, pos.clone());

        this.obstacles.push({
            type: 'box',
            minX: pos.x - 9,
            maxX: pos.x + 9,
            minZ: pos.z - 9,
            maxZ: pos.z + 9,
            height: 9.0
        });
    }

    private createMilitaryFort(scene: THREE.Scene, pos: THREE.Vector3): void {
        const group = new THREE.Group();
        group.position.copy(pos);

        const bunkerMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });

        const bunker = new THREE.Mesh(new THREE.BoxGeometry(20, 7, 20), bunkerMat);
        bunker.position.y = 3.5;
        bunker.castShadow = true;
        bunker.receiveShadow = true;
        group.add(bunker);

        const parapet = new THREE.Mesh(new THREE.BoxGeometry(20.4, 1.2, 20.4), roofMat);
        parapet.position.y = 7.4;
        parapet.castShadow = true;
        group.add(parapet);

        const door = new THREE.Mesh(new THREE.BoxGeometry(4.0, 4.5, 0.6), metalMat);
        door.position.set(0, 2.25, 10.1);
        group.add(door);

        const doorBack = new THREE.Mesh(new THREE.BoxGeometry(4.0, 4.5, 0.6), metalMat);
        doorBack.position.set(0, 2.25, -10.1);
        group.add(doorBack);

        scene.add(group);

        this.obstacles.push({
            type: 'box',
            minX: pos.x - 10.5,
            maxX: pos.x + 10.5,
            minZ: pos.z - 10.5,
            maxZ: pos.z + 10.5,
            height: 8.5
        });
    }

    private createMilitaryHouse(scene: THREE.Scene, pos: THREE.Vector3, sizeX = 14, sizeZ = 12): void {
        const group = new THREE.Group();
        group.position.copy(pos);

        const wallMat = new THREE.MeshStandardMaterial({ color: 0x57606f, roughness: 0.9 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x2f3542, roughness: 0.6 });

        const height = 5.5;
        const house = new THREE.Mesh(new THREE.BoxGeometry(sizeX, height, sizeZ), wallMat);
        house.position.y = height / 2;
        house.castShadow = true;
        house.receiveShadow = true;
        group.add(house);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(sizeX, sizeZ) * 0.55, 3.0, 4), roofMat);
        roof.position.y = height + 1.5;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        group.add(roof);

        scene.add(group);

        this.obstacles.push({
            type: 'box',
            minX: pos.x - sizeX / 2 - 0.5,
            maxX: pos.x + sizeX / 2 + 0.5,
            minZ: pos.z - sizeZ / 2 - 0.5,
            maxZ: pos.z + sizeZ / 2 + 0.5,
            height: height + 3.0
        });
    }

    private createBarricade(scene: THREE.Scene, pos: THREE.Vector3): void {
        const group = new THREE.Group();
        group.position.copy(pos);
        const mat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });
        const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 3.8), mat);
        b1.rotation.x = Math.PI / 4;
        group.add(b1);
        const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 3.8), mat);
        b2.rotation.z = Math.PI / 4;
        group.add(b2);
        group.position.y = 1.1;
        scene.add(group);

        this.obstacles.push({
            type: 'circle',
            centerX: pos.x,
            centerZ: pos.z,
            radius: 2.0,
            height: 2.4
        });
    }

    private createExplosiveBarrel(scene: THREE.Scene, pos: THREE.Vector3): void {
        const geo = new THREE.CylinderGeometry(0.7, 0.7, 1.8, 12);
        const mat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.4, metalness: 0.6 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.position.y = 0.9;
        mesh.castShadow = true;
        scene.add(mesh);

        this.barrels.push({
            mesh,
            pos: pos.clone(),
            hp: 20,
            isExploded: false
        });
    }
}
