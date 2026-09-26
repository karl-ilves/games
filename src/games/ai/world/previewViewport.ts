import * as THREE from 'three';
import type { PlayardAiScene } from '../systems/gameGenerator';

export class PreviewViewport {
    private container: HTMLElement;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private animationFrameId: number | null = null;
    private objectsGroup: THREE.Group;
    private animatedMeshes: Array<{ mesh: THREE.Object3D; update: (time: number) => void }> = [];
    private dirLight: THREE.DirectionalLight;
    private hemiLight: THREE.HemisphereLight;

    constructor(container: HTMLElement) {
        this.container = container;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 600;

        this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        this.camera.position.set(0, 25, 45);
        this.camera.lookAt(0, 2, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        this.hemiLight.position.set(0, 50, 0);
        this.scene.add(this.hemiLight);

        this.dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.dirLight.position.set(20, 40, 20);
        this.dirLight.castShadow = true;
        this.scene.add(this.dirLight);

        this.objectsGroup = new THREE.Group();
        this.scene.add(this.objectsGroup);

        this.initControls();
        this.startLoop();

        window.addEventListener('resize', this.onResize);
    }

    private onResize = () => {
        if (!this.container || !this.renderer || !this.camera) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    };

    private isDragging = false;
    private previousMousePosition = { x: 0, y: 0 };
    private spherical = { radius: 50, theta: Math.PI / 4, phi: Math.PI / 4 };

    private initControls() {
        const dom = this.renderer.domElement;
        dom.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const deltaX = e.clientX - this.previousMousePosition.x;
            const deltaY = e.clientY - this.previousMousePosition.y;

            this.spherical.theta -= deltaX * 0.008;
            this.spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, this.spherical.phi - deltaY * 0.008));

            this.updateCameraPosition();
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        dom.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.spherical.radius = Math.max(10, Math.min(120, this.spherical.radius + e.deltaY * 0.05));
            this.updateCameraPosition();
        }, { passive: false });

        this.updateCameraPosition();
    }

    private updateCameraPosition() {
        const x = this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
        const y = this.spherical.radius * Math.cos(this.spherical.phi);
        const z = this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);
        this.camera.position.set(x, y, z);
        this.camera.lookAt(0, 2, 0);
    }

    public renderScene(sceneData: PlayardAiScene | null) {
        // Clear existing objects
        while (this.objectsGroup.children.length > 0) {
            const child = this.objectsGroup.children[0];
            this.objectsGroup.remove(child);
        }
        this.animatedMeshes = [];

        if (!sceneData) return;

        // Environment
        const env = sceneData.environment;
        this.scene.background = new THREE.Color(env.skyColor);
        if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
            this.scene.fog.color.setHex(env.skyColor);
            this.scene.fog.density = env.fogDensity || 0.01;
        }
        this.dirLight.color.setHex(env.lightColor);

        // Build 3D objects
        for (const obj of sceneData.objects) {
            const mesh = this.createMeshForObject(obj);
            if (mesh) {
                this.objectsGroup.add(mesh);
            }
        }
    }

    private createMeshForObject(obj: PlayardAiScene['objects'][0]): THREE.Object3D | null {
        const color = typeof obj.color === 'string' ? parseInt(obj.color.replace('#', '0x')) : obj.color;

        if (obj.type === 'plane') {
            const geo = new THREE.PlaneGeometry(obj.scale[0], obj.scale[2]);
            const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(obj.position[0], obj.position[1], obj.position[2]);
            mesh.receiveShadow = true;
            return mesh;
        }

        if (obj.type === 'tornado') {
            const tornadoGroup = new THREE.Group();
            tornadoGroup.position.set(obj.position[0], obj.position[1], obj.position[2]);

            // Fun stylized layered cone vortex
            const levels = 6;
            for (let i = 0; i < levels; i++) {
                const radiusBottom = 0.5 + i * 0.8;
                const radiusTop = 1.0 + i * 1.2;
                const height = 3.5;
                const coneGeo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 16, 1, true);
                const coneMat = new THREE.MeshStandardMaterial({
                    color: 0x2d3748,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.8
                });
                const cone = new THREE.Mesh(coneGeo, coneMat);
                cone.position.y = (i * 3.2) + 1.8;
                tornadoGroup.add(cone);
            }

            this.animatedMeshes.push({
                mesh: tornadoGroup,
                update: (t) => {
                    tornadoGroup.rotation.y += 0.08;
                    tornadoGroup.position.x += Math.sin(t * 1.5) * 0.05;
                }
            });

            return tornadoGroup;
        }

        if (obj.type === 'airplane') {
            const planeGroup = new THREE.Group();
            planeGroup.position.set(obj.position[0], obj.position[1], obj.position[2]);

            // Body
            const bodyGeo = new THREE.CylinderGeometry(0.8, 0.4, 6, 16);
            bodyGeo.rotateX(Math.PI / 2);
            const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3 });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            planeGroup.add(body);

            // Wings
            const wingGeo = new THREE.BoxGeometry(9, 0.15, 1.8);
            const wingMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
            const wings = new THREE.Mesh(wingGeo, wingMat);
            wings.position.set(0, 0.2, 0.5);
            planeGroup.add(wings);

            // Propeller
            const propGeo = new THREE.BoxGeometry(0.2, 2.2, 0.1);
            const propMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
            const prop = new THREE.Mesh(propGeo, propMat);
            prop.position.set(0, 0, 3.1);
            planeGroup.add(prop);

            this.animatedMeshes.push({
                mesh: prop,
                update: () => {
                    prop.rotation.z += 0.3;
                }
            });

            return planeGroup;
        }

        if (obj.type === 'coin') {
            const coinGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.15, 24);
            coinGeo.rotateX(Math.PI / 2);
            const coinMat = new THREE.MeshStandardMaterial({
                color: 0xffd700,
                metalness: 0.8,
                roughness: 0.2
            });
            const coin = new THREE.Mesh(coinGeo, coinMat);
            coin.position.set(obj.position[0], obj.position[1], obj.position[2]);

            this.animatedMeshes.push({
                mesh: coin,
                update: (t) => {
                    coin.rotation.y += 0.04;
                    coin.position.y = obj.position[1] + Math.sin(t * 3) * 0.2;
                }
            });

            return coin;
        }

        if (obj.type === 'npc') {
            const npcGroup = new THREE.Group();
            npcGroup.position.set(obj.position[0], obj.position[1], obj.position[2]);

            // Body
            const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.4, 16);
            const bodyMat = new THREE.MeshStandardMaterial({ color });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 0.7;
            npcGroup.add(body);

            // Head
            const headGeo = new THREE.SphereGeometry(0.4, 16, 16);
            const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = 1.7;
            npcGroup.add(head);

            return npcGroup;
        }

        // Generic box / building / spawn
        const geo = new THREE.BoxGeometry(obj.scale[0], obj.scale[1], obj.scale[2]);
        const mat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.6,
            transparent: obj.type === 'spawn',
            opacity: obj.type === 'spawn' ? 0.7 : 1.0
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(obj.position[0], obj.position[1], obj.position[2]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (obj.type === 'spawn') {
            this.animatedMeshes.push({
                mesh,
                update: (t) => {
                    mat.opacity = 0.5 + Math.sin(t * 4) * 0.25;
                }
            });
        }

        return mesh;
    }

    private startLoop() {
        let lastTime = performance.now();
        const animate = (currentTime: number) => {
            this.animationFrameId = requestAnimationFrame(animate);
            const dt = (currentTime - lastTime) / 1000;
            lastTime = currentTime;

            for (const item of this.animatedMeshes) {
                item.update(currentTime / 1000);
            }

            this.renderer.render(this.scene, this.camera);
        };
        this.animationFrameId = requestAnimationFrame(animate);
    }

    public destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        window.removeEventListener('resize', this.onResize);
        if (this.renderer.domElement.parentElement) {
            this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
        }
        this.renderer.dispose();
    }
}
