import * as THREE from 'three';

export class FoneWorld {
    public scene: THREE.Scene;
    private gridHelper: THREE.GridHelper;
    private arenaGroup: THREE.Group;
    private lightGroup: THREE.Group;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.arenaGroup = new THREE.Group();
        this.lightGroup = new THREE.Group();
        this.scene.add(this.arenaGroup);
        this.scene.add(this.lightGroup);

        this.setupLighting();
        this.setupArena();
    }

    private setupLighting() {
        const hemi = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.8);
        hemi.position.set(0, 50, 0);
        this.lightGroup.add(hemi);

        const dirLight = new THREE.DirectionalLight(0x00f2fe, 1.2);
        dirLight.position.set(20, 40, 20);
        dirLight.castShadow = true;
        this.lightGroup.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0xe056fd, 0.8);
        fillLight.position.set(-20, 30, -20);
        this.lightGroup.add(fillLight);
    }

    private setupArena() {
        // High-tech testing pad platform
        const platformGeo = new THREE.CylinderGeometry(24, 26, 1.5, 32);
        const platformMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.3,
            metalness: 0.7
        });
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.y = -0.75;
        platform.receiveShadow = true;
        this.arenaGroup.add(platform);

        // Neon ring around the platform
        const ringGeo = new THREE.TorusGeometry(24.5, 0.25, 16, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.05;
        this.arenaGroup.add(ring);

        // Inner Grid
        this.gridHelper = new THREE.GridHelper(40, 20, 0x00f2fe, 0x334155);
        this.gridHelper.position.y = 0.02;
        this.arenaGroup.add(this.gridHelper);

        // Holographic test beacons around perimeter
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const beacon = this.createBeacon(i);
            beacon.position.set(Math.cos(angle) * 20, 0, Math.sin(angle) * 20);
            this.arenaGroup.add(beacon);
        }
    }

    private createBeacon(index: number): THREE.Group {
        const group = new THREE.Group();
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 1.2, 16), baseMat);
        base.position.y = 0.6;
        group.add(base);

        const colors = [0x00f2fe, 0xff4757, 0x2ecc71, 0xa855f7];
        const beamMat = new THREE.MeshBasicMaterial({
            color: colors[index % colors.length],
            transparent: true,
            opacity: 0.75
        });
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6, 8), beamMat);
        beam.position.y = 4.2;
        group.add(beam);

        return group;
    }

    public update(time: number) {
        // Subtle ambient neon pulse
        if (this.gridHelper) {
            this.gridHelper.position.y = 0.02 + Math.sin(time * 2) * 0.01;
        }
    }
}
