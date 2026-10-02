import * as THREE from 'three';
import type { PlayardAiScene } from '../systems/gameGenerator';
import { PlayardSkySystem } from '../../../shared/skySystem';

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
    public skySystem: PlayardSkySystem;

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

        this.skySystem = new PlayardSkySystem(this.scene, this.dirLight, this.hemiLight);

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

        // Environment & Sky System
        const env = sceneData.environment;
        this.skySystem.applyConfig(env.skyConfig, env.skyColor);

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

        if (obj.type === 'dragon') {
            const dragonGroup = new THREE.Group();
            dragonGroup.position.set(obj.position[0], obj.position[1], obj.position[2]);

            // Body
            const bodyGeo = new THREE.ConeGeometry(2, 6, 8);
            bodyGeo.rotateZ(Math.PI / 2);
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.4 });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            dragonGroup.add(body);

            // Head with horns
            const headGeo = new THREE.BoxGeometry(2, 1.4, 2.4);
            const headMat = new THREE.MeshStandardMaterial({ color: 0x991b1b });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.set(3.5, 0.8, 0);
            dragonGroup.add(head);

            // Glowing eyes
            const eyeGeo = new THREE.SphereGeometry(0.2, 8, 8);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
            const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
            eyeL.position.set(4.2, 1.2, 0.6);
            const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
            eyeR.position.set(4.2, 1.2, -0.6);
            dragonGroup.add(eyeL, eyeR);

            // Wings
            const wingGeo = new THREE.BoxGeometry(0.1, 0.2, 7);
            const wingMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, side: THREE.DoubleSide });
            const wingL = new THREE.Mesh(wingGeo, wingMat);
            wingL.position.set(0, 1.5, 3.8);
            const wingR = new THREE.Mesh(wingGeo, wingMat);
            wingR.position.set(0, 1.5, -3.8);
            dragonGroup.add(wingL, wingR);

            this.animatedMeshes.push({
                mesh: dragonGroup,
                update: (t) => {
                    dragonGroup.position.y = obj.position[1] + Math.sin(t * 2) * 1.5;
                    wingL.rotation.x = Math.sin(t * 6) * 0.4;
                    wingR.rotation.x = -Math.sin(t * 6) * 0.4;
                }
            });

            return dragonGroup;
        }

        if (obj.type === 'castle') {
            const castleGroup = new THREE.Group();
            castleGroup.position.set(obj.position[0], obj.position[1], obj.position[2]);

            // Keep
            const keepGeo = new THREE.BoxGeometry(14, 18, 14);
            const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
            const keep = new THREE.Mesh(keepGeo, stoneMat);
            keep.position.y = 9;
            castleGroup.add(keep);

            // 4 Towers
            const towerOffsets = [[-8, -8], [8, -8], [-8, 8], [8, 8]];
            for (const [tx, tz] of towerOffsets) {
                const towerGeo = new THREE.CylinderGeometry(2.5, 2.5, 22, 12);
                const tower = new THREE.Mesh(towerGeo, stoneMat);
                tower.position.set(tx, 11, tz);
                castleGroup.add(tower);

                const coneGeo = new THREE.ConeGeometry(3.2, 5, 12);
                const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a });
                const roof = new THREE.Mesh(coneGeo, roofMat);
                roof.position.set(tx, 24.5, tz);
                castleGroup.add(roof);
            }

            return castleGroup;
        }

        if (obj.type === 'ship') {
            const shipGroup = new THREE.Group();
            shipGroup.position.set(obj.position[0], obj.position[1], obj.position[2]);

            // Hull
            const hullGeo = new THREE.BoxGeometry(22, 4, 8);
            const woodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });
            const hull = new THREE.Mesh(hullGeo, woodMat);
            hull.position.y = 2;
            shipGroup.add(hull);

            // Mast & Sail
            const mastGeo = new THREE.CylinderGeometry(0.3, 0.4, 16, 8);
            const mastMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
            const mast = new THREE.Mesh(mastGeo, mastMat);
            mast.position.set(0, 10, 0);
            shipGroup.add(mast);

            const sailGeo = new THREE.BoxGeometry(0.1, 8, 7);
            const sailMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
            const sail = new THREE.Mesh(sailGeo, sailMat);
            sail.position.set(0, 11, 0);
            shipGroup.add(sail);

            this.animatedMeshes.push({
                mesh: shipGroup,
                update: (t) => {
                    shipGroup.rotation.z = Math.sin(t * 1.5) * 0.05;
                    shipGroup.position.y = obj.position[1] + Math.sin(t * 2) * 0.3;
                }
            });

            return shipGroup;
        }

        if (obj.type === 'weapon') {
            const weaponGroup = new THREE.Group();
            weaponGroup.position.set(obj.position[0], obj.position[1], obj.position[2]);

            const bladeGeo = new THREE.BoxGeometry(0.15, 3.2, 0.4);
            const bladeMat = new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                metalness: 0.9,
                roughness: 0.1,
                emissive: 0x0284c7,
                emissiveIntensity: 0.6
            });
            const blade = new THREE.Mesh(bladeGeo, bladeMat);
            blade.position.y = 1.6;
            weaponGroup.add(blade);

            this.animatedMeshes.push({
                mesh: weaponGroup,
                update: (t) => {
                    weaponGroup.rotation.y += 0.05;
                    weaponGroup.position.y = obj.position[1] + Math.sin(t * 3) * 0.2;
                }
            });

            return weaponGroup;
        }


        if (obj.type === 'tank') {
            const tankGroup = new THREE.Group();
            tankGroup.position.set(obj.position[0], obj.position[1], obj.position[2]);
            const hull = new THREE.Mesh(new THREE.BoxGeometry(10, 2.5, 6), new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.8 }));
            hull.position.y = 1.25;
            tankGroup.add(hull);
            const turret = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2, 4.5), new THREE.MeshStandardMaterial({ color: 0x365314 }));
            turret.position.set(0, 3, 0);
            tankGroup.add(turret);
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 7, 8), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
            barrel.rotateZ(Math.PI / 2);
            barrel.position.set(4.5, 3, 0);
            tankGroup.add(barrel);
            return tankGroup;
        }

        if (obj.type === 'ufo' || obj.type === 'spaceship') {
            const ufoGroup = new THREE.Group();
            ufoGroup.position.set(obj.position[0], obj.position[1], obj.position[2]);
            const saucer = new THREE.Mesh(new THREE.CylinderGeometry(8, 2, 1.8, 24), new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.2 }));
            ufoGroup.add(saucer);
            const dome = new THREE.Mesh(new THREE.SphereGeometry(3.5, 16, 16), new THREE.MeshStandardMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.8, emissive: 0x0891b2, emissiveIntensity: 0.4 }));
            dome.position.y = 1.2;
            ufoGroup.add(dome);
            this.animatedMeshes.push({
                mesh: ufoGroup,
                update: (t) => {
                    ufoGroup.rotation.y += 0.04;
                    ufoGroup.position.y = obj.position[1] + Math.sin(t * 2) * 0.8;
                }
            });
            return ufoGroup;
        }

        if (obj.type === 'robot') {
            const robotGroup = new THREE.Group();
            robotGroup.position.set(obj.position[0], obj.position[1], obj.position[2]);
            const torso = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 3), new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 }));
            torso.position.y = 4.5;
            robotGroup.add(torso);
            const rHead = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2, 2.5), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
            rHead.position.y = 8;
            robotGroup.add(rHead);
            const visor = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 0.4), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
            visor.position.set(0, 8, 1.3);
            robotGroup.add(visor);
            return robotGroup;
        }

        if (obj.type === 'dinosaur') {
            const dinoGroup = new THREE.Group();
            dinoGroup.position.set(obj.position[0], obj.position[1], obj.position[2]);
            const body = new THREE.Mesh(new THREE.ConeGeometry(3, 8, 8), new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.6 }));
            body.rotateZ(Math.PI / 2);
            body.position.y = 4;
            dinoGroup.add(body);
            const dHead = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 2), new THREE.MeshStandardMaterial({ color: 0x3f6212 }));
            dHead.position.set(4.5, 5.5, 0);
            dinoGroup.add(dHead);
            this.animatedMeshes.push({
                mesh: dinoGroup,
                update: (t) => {
                    dinoGroup.position.y = obj.position[1] + Math.abs(Math.sin(t * 3)) * 0.4;
                }
            });
            return dinoGroup;
        }

        if (obj.type === 'submarine') {
            const subGroup = new THREE.Group();
            subGroup.position.set(obj.position[0], obj.position[1], obj.position[2]);
            const hull = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 12, 16), new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.3 }));
            hull.rotateZ(Math.PI / 2);
            hull.position.y = 2;
            subGroup.add(hull);
            const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 2.5, 12), new THREE.MeshStandardMaterial({ color: 0xeab308 }));
            tower.position.set(0, 4, 0);
            subGroup.add(tower);
            return subGroup;
        }

        if (obj.type === 'volcano') {
            const volGroup = new THREE.Group();
            volGroup.position.set(obj.position[0], obj.position[1], obj.position[2]);
            const cone = new THREE.Mesh(new THREE.CylinderGeometry(4, 16, 20, 16), new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.9 }));
            cone.position.y = 10;
            volGroup.add(cone);
            const lava = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 0.5, 16), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
            lava.position.y = 20.2;
            volGroup.add(lava);
            return volGroup;
        }

        if (obj.type === 'pyramid') {
            const pyrGroup = new THREE.Group();
            pyrGroup.position.set(obj.position[0], obj.position[1], obj.position[2]);
            const pyr = new THREE.Mesh(new THREE.ConeGeometry(16, 18, 4), new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 }));
            pyr.rotateY(Math.PI / 4);
            pyr.position.y = 9;
            pyrGroup.add(pyr);
            return pyrGroup;
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

            this.skySystem.update(dt);

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
