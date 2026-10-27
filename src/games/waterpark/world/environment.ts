import * as THREE from 'three';
import { ParkTheme } from '../types';

export class WaterParkEnvironment {
    private scene: THREE.Scene;
    private sunLight: THREE.DirectionalLight;
    private hemiLight: THREE.HemisphereLight;
    private groundMesh: THREE.Mesh;
    private perimeterFence: THREE.Group;

    constructor(scene: THREE.Scene) {
        this.scene = scene;

        // Ground: Resort paved sandstone patio tiles (expanded for 2x larger park attractions)
        const groundGeo = new THREE.PlaneGeometry(300, 300, 32, 32);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0xf5f6fa, // Clean beach resort patio tiles
            roughness: 0.8
        });
        this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
        this.groundMesh.rotation.x = -Math.PI / 2;
        this.groundMesh.receiveShadow = true;
        this.groundMesh.name = 'park_ground';
        this.scene.add(this.groundMesh);

        // Surrounding lush grass border
        const grassBorderGeo = new THREE.RingGeometry(150, 240, 32);
        const grassMat = new THREE.MeshStandardMaterial({ color: 0x4cd137, roughness: 0.9 });
        const grassBorder = new THREE.Mesh(grassBorderGeo, grassMat);
        grassBorder.rotation.x = -Math.PI / 2;
        grassBorder.position.y = -0.05;
        this.scene.add(grassBorder);

        // Lighting
        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
        this.hemiLight.position.set(0, 80, 0);
        this.scene.add(this.hemiLight);

        this.sunLight = new THREE.DirectionalLight(0xfff9e6, 1.2);
        this.sunLight.position.set(60, 100, 50);
        this.sunLight.castShadow = true;
        this.scene.add(this.sunLight);

        // Entrance archway
        this.perimeterFence = this.createEntranceAndFence();
        this.scene.add(this.perimeterFence);

        // Sunny tropical sky background
        this.applyTheme('tropical');
    }

    private createEntranceAndFence(): THREE.Group {
        const group = new THREE.Group();

        // Main Entrance Arch
        const archMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, roughness: 0.3 });
        const leftPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 8, 12), archMat);
        leftPillar.position.set(-8, 4, 80);
        group.add(leftPillar);

        const rightPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 8, 12), archMat);
        rightPillar.position.set(8, 4, 80);
        group.add(rightPillar);

        const banner = new THREE.Mesh(new THREE.BoxGeometry(18, 1.8, 0.6), new THREE.MeshStandardMaterial({ color: 0xff4757 }));
        banner.position.set(0, 8, 80);
        group.add(banner);

        // Welcome sign on banner
        const signMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const sign = new THREE.Mesh(new THREE.BoxGeometry(15, 1.0, 0.65), signMat);
        sign.position.set(0, 8, 80);
        group.add(sign);

        // Perimeter fence surrounding the water park
        const fenceMat = new THREE.MeshStandardMaterial({ color: 0x747d8c });
        const fenceRadius = 110;
        const postsCount = 48;
        for (let i = 0; i < postsCount; i++) {
            const angle = (i / postsCount) * Math.PI * 2;
            if (Math.abs(angle - Math.PI / 2) < 0.2) continue; // Entrance gap

            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.8, 8), fenceMat);
            post.position.set(Math.cos(angle) * fenceRadius, 1.4, Math.sin(angle) * fenceRadius);
            group.add(post);
        }

        return group;
    }

    public applyTheme(theme: ParkTheme) {
        if (theme === 'tropical') {
            this.scene.background = new THREE.Color(0x87ceeb);
            this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.005);
            this.sunLight.color.setHex(0xfff9e6);
        } else if (theme === 'pirate') {
            this.scene.background = new THREE.Color(0x70a1ff);
            this.scene.fog = new THREE.FogExp2(0x70a1ff, 0.007);
            this.sunLight.color.setHex(0xffda79);
        } else if (theme === 'neon') {
            this.scene.background = new THREE.Color(0x0a1020);
            this.scene.fog = new THREE.FogExp2(0x0a1020, 0.008);
            this.sunLight.color.setHex(0x00f2fe);
        } else if (theme === 'arctic') {
            this.scene.background = new THREE.Color(0xdff9fb);
            this.scene.fog = new THREE.FogExp2(0xdff9fb, 0.006);
            this.sunLight.color.setHex(0xffffff);
        }
    }

    public updateTimeOfDay(hours: number) {
        // hours 8 (morning) to 20 (sunset)
        const progress = (hours - 8) / 12; // 0 to 1
        const sunAngle = progress * Math.PI;
        this.sunLight.position.set(Math.cos(sunAngle) * 50, Math.sin(sunAngle) * 60 + 10, 30);

        if (hours >= 19 || hours <= 9) {
            this.sunLight.intensity = 0.8;
            this.sunLight.color.setHex(0xffaa55);
        } else {
            this.sunLight.intensity = 1.3;
            this.sunLight.color.setHex(0xffffff);
        }
    }
}
