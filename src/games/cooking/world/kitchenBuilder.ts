import * as THREE from 'three';

export class KitchenBuilder {
    public knife3D: THREE.Mesh | null = null;
    public steamParticles!: THREE.Points;
    public steamGeo!: THREE.BufferGeometry;

    public buildKitchen(scene: THREE.Scene): void {
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const warmSpot = new THREE.SpotLight(0xffecd2, 2.2);
        warmSpot.position.set(0, 8, 3);
        warmSpot.angle = Math.PI / 3;
        warmSpot.penumbra = 0.4;
        warmSpot.castShadow = true;
        scene.add(warmSpot);

        const stoveLight = new THREE.PointLight(0xff793f, 1.5, 5);
        stoveLight.position.set(-2, 2, 0);
        scene.add(stoveLight);

        // Kitchen Floor
        const floorGeo = new THREE.PlaneGeometry(30, 30);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x222f3e,
            roughness: 0.3,
            metalness: 0.1
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        // Back Wall
        const wallGeo = new THREE.PlaneGeometry(30, 10);
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x2c3e50,
            roughness: 0.6
        });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(0, 5, -5);
        scene.add(wall);

        // Kitchen Countertop (Main Prep Island)
        const counterGeo = new THREE.BoxGeometry(7, 1.4, 2.5);
        const counterMat = new THREE.MeshStandardMaterial({
            color: 0xdfe6e9,
            metalness: 0.4,
            roughness: 0.2
        });
        const counter = new THREE.Mesh(counterGeo, counterMat);
        counter.position.set(0, 0.7, 0.5);
        counter.castShadow = true;
        counter.receiveShadow = true;
        scene.add(counter);

        // Counter Base Wood
        const baseGeo = new THREE.BoxGeometry(6.8, 1.3, 2.3);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x2d3436 });
        const counterBase = new THREE.Mesh(baseGeo, baseMat);
        counterBase.position.set(0, 0.65, 0.5);
        scene.add(counterBase);

        // Stainless Steel Stove Surface (Left side of counter)
        const stoveTopGeo = new THREE.BoxGeometry(2.4, 0.05, 1.8);
        const stoveTopMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 });
        const stoveTop = new THREE.Mesh(stoveTopGeo, stoveTopMat);
        stoveTop.position.set(-2, 1.43, 0.5);
        scene.add(stoveTop);

        // 2 Stove Burner Rings
        [-0.5, 0.5].forEach(offsetX => {
            const ringGeo = new THREE.TorusGeometry(0.35, 0.04, 16, 32);
            const ringMat = new THREE.MeshStandardMaterial({ color: 0xff5252, emissive: 0xff3838, emissiveIntensity: 0.6 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.set(-2 + offsetX, 1.46, 0.5);
            scene.add(ring);
        });

        // Chopping Board (Wood)
        const boardGeo = new THREE.BoxGeometry(1.6, 0.08, 1.2);
        const boardMat = new THREE.MeshStandardMaterial({ color: 0xcd6133, roughness: 0.8 });
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.position.set(1.8, 1.45, 0.5);
        scene.add(board);

        // Chef's Knife on Board
        const knifeBladeGeo = new THREE.BoxGeometry(0.8, 0.02, 0.12);
        const knifeBladeMat = new THREE.MeshStandardMaterial({ color: 0xf1f2f6, metalness: 0.9, roughness: 0.1 });
        const knifeBlade = new THREE.Mesh(knifeBladeGeo, knifeBladeMat);
        knifeBlade.position.set(1.9, 1.5, 0.9);
        knifeBlade.rotation.y = 0.3;
        this.knife3D = knifeBlade;
        scene.add(knifeBlade);

        // Master Chef Plate in Center
        const plateGeo = new THREE.CylinderGeometry(0.9, 0.7, 0.08, 32);
        const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.1 });
        const plate = new THREE.Mesh(plateGeo, plateMat);
        plate.position.set(0, 1.45, 0.5);
        plate.receiveShadow = true;
        scene.add(plate);

        // Service Bell (Golden Bell)
        const bellBaseGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.04, 16);
        const bellBaseMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const bellBase = new THREE.Mesh(bellBaseGeo, bellBaseMat);
        bellBase.position.set(-0.2, 1.44, 1.4);
        scene.add(bellBase);

        const bellDomeGeo = new THREE.SphereGeometry(0.16, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const bellDomeMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.9, roughness: 0.2 });
        const bellDome = new THREE.Mesh(bellDomeGeo, bellDomeMat);
        bellDome.position.set(-0.2, 1.46, 1.4);
        scene.add(bellDome);
    }

    public setupSteamParticles(scene: THREE.Scene): void {
        const particleCount = 40;
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = -2 + (Math.random() - 0.5) * 0.8;
            positions[i + 1] = 1.6 + Math.random() * 1.5;
            positions[i + 2] = 0.5 + (Math.random() - 0.5) * 0.8;
        }

        this.steamGeo = new THREE.BufferGeometry();
        this.steamGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const steamMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.18,
            transparent: true,
            opacity: 0.45
        });

        this.steamParticles = new THREE.Points(this.steamGeo, steamMat);
        scene.add(this.steamParticles);
    }

    public animateSteam(): void {
        if (!this.steamGeo) return;
        const positions = this.steamGeo.attributes.position.array as Float32Array;
        for (let i = 1; i < positions.length; i += 3) {
            positions[i] += 0.015;
            if (positions[i] > 3.2) {
                positions[i] = 1.5;
            }
        }
        this.steamGeo.attributes.position.needsUpdate = true;
    }
}
