import * as THREE from 'three';
import { AvatarConfig } from './types';
import { DEFAULT_AVATAR_CONFIG, getItemById } from './catalog';

export class AvatarRig {
    public rootGroup: THREE.Group;
    public bones: {
        root: THREE.Group;
        hips: THREE.Group;
        torso: THREE.Group;
        chest: THREE.Group;
        neck: THREE.Group;
        head: THREE.Group;
        leftArm: THREE.Group;
        rightArm: THREE.Group;
        leftLeg: THREE.Group;
        rightLeg: THREE.Group;
        leftFoot: THREE.Group;
        rightFoot: THREE.Group;
    };

    public sockets: {
        head: THREE.Group;
        hair: THREE.Group;
        face: THREE.Group;
        torso: THREE.Group;
        pants: THREE.Group;
        shoes: THREE.Group;
        back: THREE.Group;
        handL: THREE.Group;
        handR: THREE.Group;
    };

    private materials: {
        skin: THREE.MeshStandardMaterial;
        hair: THREE.MeshStandardMaterial;
        top: THREE.MeshStandardMaterial;
        pants: THREE.MeshStandardMaterial;
        shoes: THREE.MeshStandardMaterial;
        hat: THREE.MeshStandardMaterial;
        accent: THREE.MeshStandardMaterial;
        gold: THREE.MeshStandardMaterial;
    };

    // Current equipped items meshes
    private socketChildren: Map<string, THREE.Object3D[]> = new Map();
    public config: AvatarConfig;
    public movementStyle: string = 'anim_style_default';

    constructor(initialConfig: AvatarConfig = DEFAULT_AVATAR_CONFIG) {
        this.config = { ...initialConfig };
        this.movementStyle = initialConfig.movementStyle || 'anim_style_default';
        this.rootGroup = new THREE.Group();
        this.rootGroup.name = 'AvatarRig';

        // Materials with PBR properties
        this.materials = {
            skin: new THREE.MeshStandardMaterial({ color: initialConfig.skinColor, roughness: 0.6, metalness: 0.05 }),
            hair: new THREE.MeshStandardMaterial({ color: initialConfig.hairColor, roughness: 0.85 }),
            top: new THREE.MeshStandardMaterial({ color: 0x00f2fe, roughness: 0.6 }),
            pants: new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.7 }),
            shoes: new THREE.MeshStandardMaterial({ color: 0xf1f2f6, roughness: 0.3, metalness: 0.1 }),
            hat: new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.2, metalness: 0.8 }),
            accent: new THREE.MeshStandardMaterial({ color: 0xff4757, roughness: 0.4 }),
            gold: new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.15 })
        };

        this.bones = this.buildSkeletonHierarchy();
        this.sockets = this.buildAttachmentSockets();
        this.buildBaseCharacterMesh();
        this.applyConfig(initialConfig);
    }

    private buildSkeletonHierarchy() {
        const root = new THREE.Group();
        root.name = 'Bone_Root';
        this.rootGroup.add(root);

        const hips = new THREE.Group();
        hips.name = 'Bone_Hips';
        hips.position.set(0, 1.25, 0);
        root.add(hips);

        const torso = new THREE.Group();
        torso.name = 'Bone_Torso';
        torso.position.set(0, 0.35, 0);
        hips.add(torso);

        const chest = new THREE.Group();
        chest.name = 'Bone_Chest';
        chest.position.set(0, 0.45, 0);
        torso.add(chest);

        const neck = new THREE.Group();
        neck.name = 'Bone_Neck';
        neck.position.set(0, 0.45, 0);
        chest.add(neck);

        const head = new THREE.Group();
        head.name = 'Bone_Head';
        head.position.set(0, 0.35, 0);
        neck.add(head);

        // Arms (Attached to Chest)
        const leftArm = new THREE.Group();
        leftArm.name = 'Bone_LeftArm';
        leftArm.position.set(-0.65, 0.35, 0);
        chest.add(leftArm);

        const rightArm = new THREE.Group();
        rightArm.name = 'Bone_RightArm';
        rightArm.position.set(0.65, 0.35, 0);
        chest.add(rightArm);

        // Legs (Attached to Hips)
        const leftLeg = new THREE.Group();
        leftLeg.name = 'Bone_LeftLeg';
        leftLeg.position.set(-0.25, -0.1, 0);
        hips.add(leftLeg);

        const rightLeg = new THREE.Group();
        rightLeg.name = 'Bone_RightLeg';
        rightLeg.position.set(0.25, -0.1, 0);
        hips.add(rightLeg);

        const leftFoot = new THREE.Group();
        leftFoot.name = 'Bone_LeftFoot';
        leftFoot.position.set(0, -1.05, 0);
        leftLeg.add(leftFoot);

        const rightFoot = new THREE.Group();
        rightFoot.name = 'Bone_RightFoot';
        rightFoot.position.set(0, -1.05, 0);
        rightLeg.add(rightFoot);

        return {
            root,
            hips,
            torso,
            chest,
            neck,
            head,
            leftArm,
            rightArm,
            leftLeg,
            rightLeg,
            leftFoot,
            rightFoot
        };
    }

    private buildAttachmentSockets() {
        // Create dedicated socket attachment points
        const headSocket = new THREE.Group();
        headSocket.name = 'Socket_Head';
        headSocket.position.set(0, 0.35, 0);
        this.bones.head.add(headSocket);

        const hairSocket = new THREE.Group();
        hairSocket.name = 'Socket_Hair';
        hairSocket.position.set(0, 0.22, 0);
        this.bones.head.add(hairSocket);

        const faceSocket = new THREE.Group();
        faceSocket.name = 'Socket_Face';
        faceSocket.position.set(0, 0.06, 0.40);
        this.bones.head.add(faceSocket);

        const torsoSocket = new THREE.Group();
        torsoSocket.name = 'Socket_Torso';
        this.bones.torso.add(torsoSocket);

        const pantsSocket = new THREE.Group();
        pantsSocket.name = 'Socket_Pants';
        this.bones.hips.add(pantsSocket);

        const shoesSocket = new THREE.Group();
        shoesSocket.name = 'Socket_Shoes';
        this.bones.root.add(shoesSocket);

        const backSocket = new THREE.Group();
        backSocket.name = 'Socket_Back';
        backSocket.position.set(0, 0.2, -0.32);
        this.bones.chest.add(backSocket);

        const handLSocket = new THREE.Group();
        handLSocket.name = 'Socket_HandL';
        handLSocket.position.set(0, -0.85, 0);
        this.bones.leftArm.add(handLSocket);

        const handRSocket = new THREE.Group();
        handRSocket.name = 'Socket_HandR';
        handRSocket.position.set(0, -0.85, 0);
        this.bones.rightArm.add(handRSocket);

        return {
            head: headSocket,
            hair: hairSocket,
            face: faceSocket,
            torso: torsoSocket,
            pants: pantsSocket,
            shoes: shoesSocket,
            back: backSocket,
            handL: handLSocket,
            handR: handRSocket
        };
    }

    public getSocket(socketName: 'head' | 'hair' | 'face' | 'torso' | 'pants' | 'shoes' | 'back' | 'handL' | 'handR'): THREE.Group {
        return this.sockets[socketName];
    }

    public getHandSocket(side: 'left' | 'right' = 'right'): THREE.Group {
        return side === 'right' ? this.sockets.handR : this.sockets.handL;
    }

    private buildBaseCharacterMesh() {
        // 1. Head Cranium
        const headGeo = new THREE.SphereGeometry(0.38, 20, 20);
        headGeo.scale(0.95, 1.08, 0.98);
        const headMesh = new THREE.Mesh(headGeo, this.materials.skin);
        headMesh.castShadow = true;
        this.bones.head.add(headMesh);

        // 2. Neck
        const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.32, 16), this.materials.skin);
        neckMesh.position.set(0, -0.15, 0);
        neckMesh.castShadow = true;
        this.bones.head.add(neckMesh);

        // 3. Torso / Chest
        const chestMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.42, 0.55, 16), this.materials.top);
        chestMesh.scale.set(1.0, 1.0, 0.75);
        chestMesh.castShadow = true;
        this.bones.chest.add(chestMesh);

        const abdomenMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.35, 16), this.materials.top);
        abdomenMesh.scale.set(1.0, 1.0, 0.75);
        abdomenMesh.castShadow = true;
        this.bones.torso.add(abdomenMesh);

        // Belt & Hips
        const hipsMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.42, 0.3, 16), this.materials.pants);
        hipsMesh.scale.set(1.0, 1.0, 0.75);
        hipsMesh.castShadow = true;
        this.bones.hips.add(hipsMesh);

        // 4. Arms (Left & Right)
        [-1, 1].forEach(side => {
            const bone = side === -1 ? this.bones.leftArm : this.bones.rightArm;

            // Shoulder
            const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), this.materials.top);
            shoulder.castShadow = true;
            bone.add(shoulder);

            // Bicep
            const bicep = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.45, 12), this.materials.top);
            bicep.position.set(0, -0.25, 0);
            bicep.castShadow = true;
            bone.add(bicep);

            // Forearm
            const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.10, 0.42, 12), this.materials.skin);
            forearm.position.set(0, -0.65, 0);
            forearm.castShadow = true;
            bone.add(forearm);

            // Hand
            const hand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.16), this.materials.skin);
            hand.position.set(0, -0.92, 0.02);
            hand.castShadow = true;
            bone.add(hand);
        });

        // 5. Legs (Left & Right)
        [-1, 1].forEach(side => {
            const legBone = side === -1 ? this.bones.leftLeg : this.bones.rightLeg;

            // Thigh
            const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.55, 14), this.materials.pants);
            thigh.position.set(0, -0.28, 0);
            thigh.castShadow = true;
            legBone.add(thigh);

            // Calf
            const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.55, 14), this.materials.pants);
            calf.position.set(0, -0.78, 0);
            calf.castShadow = true;
            legBone.add(calf);

            // Shoe
            const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.42), this.materials.shoes);
            shoe.position.set(0, -1.12, 0.08);
            shoe.castShadow = true;
            legBone.add(shoe);
        });
    }

    public clearSocket(socketName: string) {
        const items = this.socketChildren.get(socketName) || [];
        items.forEach(obj => {
            if (obj.parent) obj.parent.remove(obj);
        });
        this.socketChildren.set(socketName, []);
    }

    public attachToSocket(socketName: 'head' | 'hair' | 'face' | 'torso' | 'pants' | 'shoes' | 'back', object: THREE.Object3D) {
        const socket = this.sockets[socketName];
        if (socket) {
            socket.add(object);
            const list = this.socketChildren.get(socketName) || [];
            list.push(object);
            this.socketChildren.set(socketName, list);
        }
    }

    public applyConfig(config: AvatarConfig) {
        this.config = { ...config };
        if (config.movementStyle) {
            this.movementStyle = config.movementStyle;
        }

        // 1. Skin color
        if (config.skinColor) {
            this.materials.skin.color.set(config.skinColor);
        }

        // 2. Hair
        this.clearSocket('hair');
        if (config.hairColor) {
            this.materials.hair.color.set(config.hairColor);
        }
        this.renderHair(config.hairId);

        // 3. Face
        this.clearSocket('face');
        this.renderFace(config.faceId);

        // 4. Hat
        this.clearSocket('head');
        if (config.hatId) {
            this.renderHat(config.hatId);
        }

        // 5. Back Accessory
        this.clearSocket('back');
        if (config.backId) {
            this.renderBackAccessory(config.backId);
        }

        // 6. Top / Clothing Colors
        const topItem = getItemById(config.topId);
        if (topItem && topItem.defaultColor) {
            this.materials.top.color.set(topItem.defaultColor);
        } else if (config.topId === 'top_hoodie_cyan') {
            this.materials.top.color.set(0x00f2fe);
        } else if (config.topId === 'top_leather_jacket') {
            this.materials.top.color.set(0x181b20);
        } else if (config.topId === 'top_tuxedo_gold') {
            this.materials.top.color.set(0x0d131a);
        } else if (config.topId === 'top_cyber_armor') {
            this.materials.top.color.set(0xff4757);
        }

        // 7. Pants Colors
        const pantsItem = getItemById(config.pantsId);
        if (pantsItem && pantsItem.defaultColor) {
            this.materials.pants.color.set(pantsItem.defaultColor);
        } else if (config.pantsId === 'pants_jeans_dark') {
            this.materials.pants.color.set(0x1e272e);
        } else if (config.pantsId === 'pants_cargo_tactical') {
            this.materials.pants.color.set(0x485460);
        } else if (config.pantsId === 'pants_mecha_plates') {
            this.materials.pants.color.set(0x2f3542);
        }

        // 8. Shoes
        const shoesItem = getItemById(config.shoesId);
        if (shoesItem && shoesItem.defaultColor) {
            this.materials.shoes.color.set(shoesItem.defaultColor);
        } else if (config.shoesId === 'shoes_sneakers_white') {
            this.materials.shoes.color.set(0xf1f2f6);
        } else if (config.shoesId === 'shoes_combat_boots') {
            this.materials.shoes.color.set(0x1e272e);
        } else if (config.shoesId === 'shoes_hover_jets') {
            this.materials.shoes.color.set(0x00f2fe);
        }
    }

    private renderHair(hairId: string) {
        const hairGroup = new THREE.Group();
        if (hairId === 'hair_classic' || !hairId) {
            const topSweep = new THREE.Mesh(new THREE.SphereGeometry(0.40, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), this.materials.hair);
            topSweep.position.set(0, 0.06, -0.02);
            topSweep.scale.set(0.96, 1.05, 1.04);
            hairGroup.add(topSweep);

            const backHair = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.45, 0.22), this.materials.hair);
            backHair.position.set(0, -0.08, -0.28);
            hairGroup.add(backHair);
        } else if (hairId === 'hair_spiky_punk') {
            const baseHair = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), this.materials.hair);
            hairGroup.add(baseHair);
            for (let i = -3; i <= 3; i++) {
                const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 5), this.materials.hair);
                spike.position.set(0, 0.36, i * 0.09);
                spike.rotation.x = -i * 0.12;
                hairGroup.add(spike);
            }
        } else if (hairId === 'hair_golden_super') {
            for (let i = 0; i < 9; i++) {
                const ang = (i / 9) * Math.PI * 2;
                const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 6), this.materials.hair);
                spike.position.set(Math.sin(ang) * 0.22, 0.35, Math.cos(ang) * 0.22);
                spike.rotation.x = Math.cos(ang) * 0.4;
                spike.rotation.z = -Math.sin(ang) * 0.4;
                hairGroup.add(spike);
            }
        } else if (hairId === 'hair_curly_afro') {
            const afroMesh = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 16), this.materials.hair);
            afroMesh.position.set(0, 0.12, -0.05);
            hairGroup.add(afroMesh);
        } else if (hairId === 'hair_mohawk_flame') {
            const mohawkBase = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.65), this.materials.hair);
            mohawkBase.position.set(0, 0.28, 0);
            hairGroup.add(mohawkBase);
        } else if (hairId === 'hair_long_samurai') {
            const bun = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), this.materials.hair);
            bun.position.set(0, 0.38, -0.22);
            hairGroup.add(bun);
            const pony = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.45, 8), this.materials.hair);
            pony.position.set(0, 0.18, -0.32);
            pony.rotation.x = -0.4;
            hairGroup.add(pony);
        } else if (hairId === 'hair_dreadlocks_tech') {
            for (let i = 0; i < 8; i++) {
                const dread = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.5, 6), this.materials.hair);
                const a = (i / 8) * Math.PI * 2;
                dread.position.set(Math.sin(a) * 0.32, -0.05, Math.cos(a) * 0.32);
                dread.rotation.x = Math.cos(a) * 0.3;
                hairGroup.add(dread);
            }
        } else if (hairId === 'hair_buzz_cut') {
            const buzz = new THREE.Mesh(new THREE.SphereGeometry(0.39, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), this.materials.hair);
            buzz.position.set(0, 0.04, 0);
            hairGroup.add(buzz);
        } else {
            // Default top sweep fallback
            const topSweep = new THREE.Mesh(new THREE.SphereGeometry(0.40, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), this.materials.hair);
            topSweep.position.set(0, 0.06, -0.02);
            hairGroup.add(topSweep);
        }
        this.attachToSocket('hair', hairGroup);
    }

    private buildUltraRealisticGlasses(style: 'aviator' | 'luxury' | 'round' | 'matrix'): THREE.Group {
        const glasses = new THREE.Group();

        const isGold = style === 'aviator' || style === 'round';
        const frameMat = new THREE.MeshStandardMaterial({
            color: isGold ? 0xffd700 : (style === 'luxury' ? 0x111111 : 0x2d3436),
            metalness: isGold ? 0.96 : (style === 'luxury' ? 0.4 : 0.9),
            roughness: isGold ? 0.12 : (style === 'luxury' ? 0.15 : 0.2)
        });

        const lensMat = new THREE.MeshStandardMaterial({
            color: style === 'luxury' ? 0x07090b : (style === 'matrix' ? 0x05131a : 0x0b1c2b),
            metalness: 0.35,
            roughness: 0.03,
            transparent: true,
            opacity: 0.84
        });

        const siliconeMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.2,
            transparent: true,
            opacity: 0.65
        });

        const glareMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.42,
            blending: THREE.AdditiveBlending
        });

        if (style === 'aviator' || style === 'luxury') {
            // 1. Double Bridge: Top Brow Bar & Lower Nose Bridge
            const browBar = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.34, 12), frameMat);
            browBar.rotation.z = Math.PI * 0.5;
            browBar.position.set(0, 0.11, 0.075);
            glasses.add(browBar);

            const noseBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.10, 12), frameMat);
            noseBridge.rotation.z = Math.PI * 0.5;
            noseBridge.position.set(0, 0.065, 0.08);
            glasses.add(noseBridge);

            // Silicone Nose Pads on Support Arms
            [-1, 1].forEach(side => {
                const padArm = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 6), frameMat);
                padArm.position.set(side * 0.045, 0.045, 0.07);
                padArm.rotation.z = -side * 0.4;
                glasses.add(padArm);

                const pad = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), siliconeMat);
                pad.scale.set(0.6, 1.2, 0.6);
                pad.position.set(side * 0.045, 0.035, 0.065);
                glasses.add(pad);
            });

            // Teardrop / Aviator Rims, Lenses & Glare Reflections
            [-1, 1].forEach(side => {
                // Metallic Rim Wire
                const rim = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.008, 8, 24), frameMat);
                rim.scale.set(1.08, 1.25, 0.5);
                rim.position.set(side * 0.135, 0.06, 0.078);
                glasses.add(rim);

                // High-Gloss Glass Lens
                const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.01, 24), lensMat);
                lens.rotation.x = Math.PI * 0.5;
                lens.scale.set(1.06, 0.5, 1.22);
                lens.position.set(side * 0.135, 0.06, 0.078);
                glasses.add(lens);

                // Realistic Diagonal Studio Glare Streak
                const glare = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.12, 0.002), glareMat);
                glare.rotation.z = -side * 0.35;
                glare.position.set(side * 0.135 + 0.02, 0.07, 0.086);
                glasses.add(glare);

                // Temple Hinge Joint & Screw
                const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.02, 8), frameMat);
                hinge.position.set(side * 0.235, 0.08, 0.07);
                glasses.add(hinge);

                // Temple Arms extending over ears
                const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.44, 8), frameMat);
                arm.rotation.x = Math.PI * 0.5;
                arm.position.set(side * 0.245, 0.08, -0.14);
                glasses.add(arm);

                // Acetate Ear Tip Curve
                const tip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.06), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 }));
                tip.position.set(side * 0.245, 0.06, -0.34);
                glasses.add(tip);
            });
        } else if (style === 'round') {
            // Classic 24K Gold Round Wireframe Spectacles
            const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.10, 10), frameMat);
            bridge.rotation.z = Math.PI * 0.5;
            bridge.position.set(0, 0.06, 0.075);
            glasses.add(bridge);

            [-1, 1].forEach(side => {
                const rim = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.007, 8, 24), frameMat);
                rim.position.set(side * 0.135, 0.06, 0.075);
                glasses.add(rim);

                const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.008, 24), lensMat);
                lens.rotation.x = Math.PI * 0.5;
                lens.position.set(side * 0.135, 0.06, 0.075);
                glasses.add(lens);

                const glare = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.10, 0.002), glareMat);
                glare.rotation.z = 0.3;
                glare.position.set(side * 0.135 + 0.015, 0.065, 0.082);
                glasses.add(glare);

                const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.44, 8), frameMat);
                arm.rotation.x = Math.PI * 0.5;
                arm.position.set(side * 0.225, 0.065, -0.14);
                glasses.add(arm);
            });
        } else {
            // Matrix Cyber Edge Slim Shades
            const slimBar = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.01, 0.02), frameMat);
            slimBar.position.set(0, 0.08, 0.075);
            glasses.add(slimBar);

            [-1, 1].forEach(side => {
                const lens = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.01), lensMat);
                lens.position.set(side * 0.13, 0.06, 0.08);
                glasses.add(lens);

                const glare = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.06, 0.002), glareMat);
                glare.rotation.z = -side * 0.3;
                glare.position.set(side * 0.13, 0.06, 0.088);
                glasses.add(glare);

                const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.44, 8), frameMat);
                arm.rotation.x = Math.PI * 0.5;
                arm.position.set(side * 0.23, 0.07, -0.14);
                glasses.add(arm);
            });
        }

        return glasses;
    }

    private buildSteampunkGoggles(): THREE.Group {
        const goggles = new THREE.Group();
        const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.25 });
        const amberGlassMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.78 });
        const leatherMat = new THREE.MeshStandardMaterial({ color: 0x4a2c11, roughness: 0.85 });

        // Head Strap
        const strap = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.035, 8, 32), leatherMat);
        strap.rotation.x = Math.PI * 0.5;
        strap.position.set(0, 0.06, -0.05);
        goggles.add(strap);

        // Center Brass Gear Bridge
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.035, 0.03), brassMat);
        bridge.position.set(0, 0.06, 0.08);
        goggles.add(bridge);

        [-1, 1].forEach(side => {
            // Machined Brass Eyecup
            const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.085, 0.06, 20), brassMat);
            cup.rotation.x = Math.PI * 0.5;
            cup.position.set(side * 0.14, 0.06, 0.08);
            goggles.add(cup);

            // Knurled Bezel Gear Ring
            const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.012, 8, 16), brassMat);
            bezel.position.set(side * 0.14, 0.06, 0.11);
            goggles.add(bezel);

            // Amber Glass Lens
            const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.01, 16), amberGlassMat);
            lens.rotation.x = Math.PI * 0.5;
            lens.position.set(side * 0.14, 0.06, 0.108);
            goggles.add(lens);

            // Rivets
            for (let r = 0; r < 4; r++) {
                const ang = (r / 4) * Math.PI * 2;
                const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), this.materials.gold);
                rivet.position.set(side * 0.14 + Math.sin(ang) * 0.088, 0.06 + Math.cos(ang) * 0.088, 0.112);
                goggles.add(rivet);
            }
        });

        return goggles;
    }

    private buildNinjaMask(): THREE.Group {
        const maskGroup = new THREE.Group();
        const clothMat = new THREE.MeshStandardMaterial({ color: 0x111417, roughness: 0.85 });

        // Tapered Half-Mask wrapping around chin and cheeks
        const lowerMask = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.28, 0.16), clothMat);
        lowerMask.position.set(0, -0.09, 0.06);
        maskGroup.add(lowerMask);

        // Chin Tuck
        const chinTuck = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.20), clothMat);
        chinTuck.position.set(0, -0.21, 0.02);
        maskGroup.add(chinTuck);

        // Metallic Nose Clamp Clip
        const clipMat = new THREE.MeshStandardMaterial({ color: 0x57606f, metalness: 0.8, roughness: 0.3 });
        const clip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.02), clipMat);
        clip.position.set(0, 0.04, 0.13);
        maskGroup.add(clip);

        return maskGroup;
    }

    private buildGoldMonocle(): THREE.Group {
        const monocleGroup = new THREE.Group();
        const goldMat = this.materials.gold;
        const glassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.65 });

        // 24K Gold Rim
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.01, 8, 20), goldMat);
        rim.position.set(0.14, 0.06, 0.075);
        monocleGroup.add(rim);

        // Beveled Glass Lens
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.008, 20), glassMat);
        lens.rotation.x = Math.PI * 0.5;
        lens.position.set(0.14, 0.06, 0.075);
        monocleGroup.add(lens);

        // Draped Fine Golden Chain
        for (let i = 0; i < 8; i++) {
            const t = i / 7;
            const chainLink = new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 6), goldMat);
            // Parabolic droop down cheek towards collar
            const cx = 0.14 + t * 0.08;
            const cy = 0.06 - Math.sin(t * Math.PI) * 0.15 - t * 0.18;
            const cz = 0.075 - t * 0.08;
            chainLink.position.set(cx, cy, cz);
            monocleGroup.add(chainLink);
        }

        return monocleGroup;
    }

    private buildCyborgVisor(): THREE.Group {
        const visorGroup = new THREE.Group();
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
        const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
        const laserMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        // Visor Bar
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.14), baseMat);
        bar.position.set(0, 0.07, 0.075);
        visorGroup.add(bar);

        // Glowing Laser Blade across eyes
        const laser = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.03, 0.02), neonCyanMat);
        laser.position.set(0, 0.07, 0.146);
        visorGroup.add(laser);

        const laserCore = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.012, 0.02), laserMat);
        laserCore.position.set(0, 0.07, 0.15);
        visorGroup.add(laserCore);

        // Chrome Ear Brackets
        const bracketMat = new THREE.MeshStandardMaterial({ color: 0xced6e0, metalness: 0.95, roughness: 0.1 });
        [-1, 1].forEach(side => {
            const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.18), bracketMat);
            bracket.position.set(side * 0.28, 0.07, 0.02);
            visorGroup.add(bracket);
        });

        return visorGroup;
    }

    private buildVRHeadset(): THREE.Group {
        const vrGroup = new THREE.Group();
        const hmdMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.5 });
        const padMat = new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.9 });
        const ledMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });

        // Ergonomic Curved HMD Front Body
        const hmd = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.22, 0.20), hmdMat);
        hmd.position.set(0, 0.06, 0.12);
        vrGroup.add(hmd);

        // Face Cushion Foam
        const foam = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.20, 0.08), padMat);
        foam.position.set(0, 0.06, 0.02);
        vrGroup.add(foam);

        // RGB Status Light Strip
        const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.02, 0.01), ledMat);
        ledStrip.position.set(0, 0.09, 0.222);
        vrGroup.add(ledStrip);

        // Dual Camera Tracking Lenses
        const camMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        [-1, 1].forEach(side => {
            const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 12), camMat);
            cam.rotation.x = Math.PI * 0.5;
            cam.position.set(side * 0.16, 0.02, 0.222);
            vrGroup.add(cam);
        });

        // Top & Side Elastic Straps
        const strapMat = new THREE.MeshStandardMaterial({ color: 0x2f3542, roughness: 0.9 });
        const topStrap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.38), strapMat);
        topStrap.position.set(0, 0.20, -0.06);
        vrGroup.add(topStrap);

        return vrGroup;
    }

    private buildDiamondShades(): THREE.Group {
        const group = new THREE.Group();
        const goldMat = this.materials.gold;
        const diamondMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95, roughness: 0.05 });
        const darkLens = new THREE.MeshStandardMaterial({ color: 0x0a0e14, roughness: 0.05, metalness: 0.8 });

        // Frame brow
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.03, 0.025), goldMat);
        brow.position.set(0, 0.10, 0.075);
        group.add(brow);

        // Diamonds along brow
        for (let i = 0; i < 9; i++) {
            const diam = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), diamondMat);
            diam.position.set(-0.20 + i * 0.05, 0.10, 0.088);
            group.add(diam);
        }

        [-1, 1].forEach(side => {
            const rim = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.11, 0.02), goldMat);
            rim.position.set(side * 0.13, 0.05, 0.075);
            group.add(rim);

            const lens = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.08, 0.01), darkLens);
            lens.position.set(side * 0.13, 0.05, 0.08);
            group.add(lens);

            // Diamond studs on sides
            for (let d = 0; d < 3; d++) {
                const sDiam = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 6), diamondMat);
                sDiam.position.set(side * 0.22, 0.08 - d * 0.03, 0.085);
                group.add(sDiam);
            }

            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.44, 8), goldMat);
            arm.rotation.x = Math.PI * 0.5;
            arm.position.set(side * 0.24, 0.07, -0.14);
            group.add(arm);
        });
        return group;
    }

    private buildPixelThugShades(): THREE.Group {
        const group = new THREE.Group();
        const blackMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
        const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        // Center bridge
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.02), blackMat);
        bridge.position.set(0, 0.07, 0.08);
        group.add(bridge);

        [-1, 1].forEach(side => {
            // Stepped 8-bit blocks
            const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.03, 0.02), blackMat);
            topBar.position.set(side * 0.14, 0.08, 0.08);
            group.add(topBar);

            const midBar = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.03, 0.02), blackMat);
            midBar.position.set(side * 0.135, 0.05, 0.08);
            group.add(midBar);

            const botBar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.02), blackMat);
            botBar.position.set(side * 0.13, 0.02, 0.08);
            group.add(botBar);

            // Pixel white reflection glint
            const glint = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.005), whiteMat);
            glint.position.set(side * 0.17, 0.075, 0.092);
            group.add(glint);

            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.02, 0.42), blackMat);
            arm.position.set(side * 0.235, 0.08, -0.13);
            group.add(arm);
        });
        return group;
    }

    private buildLaserScouter(): THREE.Group {
        const group = new THREE.Group();
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xdcdde1, metalness: 0.9, roughness: 0.2 });
        const scouterLensMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.72 });
        const reticleMat = new THREE.MeshBasicMaterial({ color: 0xff3838 });

        // Left eye lens
        const lens = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.01), scouterLensMat);
        lens.position.set(-0.14, 0.06, 0.082);
        group.add(lens);

        // Reticle ring
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.028, 12), reticleMat);
        ring.position.set(-0.14, 0.06, 0.088);
        group.add(ring);

        // Frame bracket
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.02, 0.03), frameMat);
        frame.position.set(-0.14, 0.11, 0.08);
        group.add(frame);

        // Ear piece module on left side
        const earpiece = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.14), frameMat);
        earpiece.position.set(-0.25, 0.07, 0.01);
        group.add(earpiece);

        const led = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), reticleMat);
        led.position.set(-0.27, 0.11, 0.02);
        group.add(led);

        return group;
    }

    private buildPirateEyepatch(): THREE.Group {
        const group = new THREE.Group();
        const leatherMat = new THREE.MeshStandardMaterial({ color: 0x181a1e, roughness: 0.9 });
        const silverMat = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: 0.9, roughness: 0.2 });

        // Diagonal head strap
        const strap = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.018, 8, 32), leatherMat);
        strap.rotation.x = Math.PI * 0.46;
        strap.rotation.y = 0.25;
        strap.position.set(0, 0.08, -0.04);
        group.add(strap);

        // Eyepatch cup over right eye
        const patch = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), leatherMat);
        patch.scale.set(1.0, 1.15, 0.35);
        patch.position.set(0.14, 0.06, 0.065);
        group.add(patch);

        // Silver Skull Crest
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), silverMat);
        skull.scale.set(1.0, 0.9, 0.5);
        skull.position.set(0.14, 0.065, 0.085);
        group.add(skull);

        [-0.016, 0.016].forEach(x => {
            const bone = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.007, 0.005), silverMat);
            bone.rotation.z = x > 0 ? 0.7 : -0.7;
            bone.position.set(0.14, 0.05, 0.086);
            group.add(bone);
        });

        return group;
    }

    private buildOniDemonMask(): THREE.Group {
        const group = new THREE.Group();
        const maskMat = new THREE.MeshStandardMaterial({ color: 0x9b0000, roughness: 0.35 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
        const fangMat = new THREE.MeshStandardMaterial({ color: 0xfffae6, metalness: 0.2, roughness: 0.1 });

        // Half face mask shell
        const shell = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.26, 0.16), maskMat);
        shell.position.set(0, -0.09, 0.07);
        group.add(shell);

        // White war teeth markings
        const teethPlate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.02), whiteMat);
        teethPlate.position.set(0, -0.09, 0.155);
        group.add(teethPlate);

        // Two prominent upward fangs
        [-1, 1].forEach(side => {
            const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.10, 6), fangMat);
            tusk.position.set(side * 0.11, -0.04, 0.16);
            tusk.rotation.z = -side * 0.25;
            group.add(tusk);
        });

        return group;
    }

    private buildGasmaskTactical(): THREE.Group {
        const group = new THREE.Group();
        const rubberMat = new THREE.MeshStandardMaterial({ color: 0x22272e, roughness: 0.7 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x57606f, metalness: 0.8, roughness: 0.3 });

        // Face seal
        const snout = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.18, 12), rubberMat);
        snout.rotation.x = Math.PI * 0.5;
        snout.position.set(0, -0.08, 0.12);
        group.add(snout);

        // Central exhaust valve
        const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 16), metalMat);
        valve.rotation.x = Math.PI * 0.5;
        valve.position.set(0, -0.10, 0.20);
        group.add(valve);

        // Dual side canister filters
        [-1, 1].forEach(side => {
            const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.09, 16), metalMat);
            canister.rotation.z = Math.PI * 0.5;
            canister.position.set(side * 0.20, -0.09, 0.12);
            group.add(canister);
        });

        return group;
    }

    private buildFlameSunglasses(): THREE.Group {
        const group = new THREE.Group();
        const goldMat = this.materials.gold;
        const flameMat = new THREE.MeshStandardMaterial({ color: 0xff3838, roughness: 0.1, transparent: true, opacity: 0.85 });

        // Bridge
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.01), goldMat);
        bridge.position.set(0, 0.07, 0.08);
        group.add(bridge);

        [-1, 1].forEach(side => {
            // Flame wing teardrop polygon
            const flameShape = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 5), flameMat);
            flameShape.rotation.z = -side * (Math.PI * 0.45);
            flameShape.rotation.x = Math.PI * 0.1;
            flameShape.position.set(side * 0.14, 0.06, 0.08);
            group.add(flameShape);

            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.44, 6), goldMat);
            arm.rotation.x = Math.PI * 0.5;
            arm.position.set(side * 0.23, 0.07, -0.14);
            group.add(arm);
        });
        return group;
    }

    private buildHeartSunglasses(): THREE.Group {
        const group = new THREE.Group();
        const pinkMat = new THREE.MeshStandardMaterial({ color: 0xff2d75, roughness: 0.2 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });

        [-1, 1].forEach(side => {
            // Heart lobes
            const lobe1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), pinkMat);
            lobe1.position.set(side * 0.14 - 0.03, 0.08, 0.078);
            group.add(lobe1);

            const lobe2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), pinkMat);
            lobe2.position.set(side * 0.14 + 0.03, 0.08, 0.078);
            group.add(lobe2);

            const point = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.09, 6), pinkMat);
            point.rotation.z = Math.PI;
            point.position.set(side * 0.14, 0.02, 0.078);
            group.add(point);

            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.44, 6), whiteMat);
            arm.rotation.x = Math.PI * 0.5;
            arm.position.set(side * 0.23, 0.07, -0.14);
            group.add(arm);
        });
        return group;
    }

    private buildCyberMatrixBlindfold(): THREE.Group {
        const group = new THREE.Group();
        const clothMat = new THREE.MeshStandardMaterial({ color: 0x11141a, roughness: 0.75 });
        const greenCodeMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });

        // Blindfold band across eyes
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.14, 0.16), clothMat);
        band.position.set(0, 0.06, 0.07);
        group.add(band);

        // Matrix digital glyph dashes
        for (let i = 0; i < 8; i++) {
            const dash = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 0.01), greenCodeMat);
            dash.position.set(-0.18 + i * 0.05, 0.06 + ((i % 3) - 1) * 0.02, 0.155);
            group.add(dash);
        }

        return group;
    }

    private buildNinjaMouthCloth(): THREE.Group {
        const group = new THREE.Group();
        const clothMat = new THREE.MeshStandardMaterial({ color: 0x181b22, roughness: 0.85 });

        const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.22, 0.16), clothMat);
        cowl.position.set(0, -0.08, 0.06);
        group.add(cowl);

        return group;
    }

    private buildCyborgEyeImplant(): THREE.Group {
        const group = new THREE.Group();
        const chromeMat = new THREE.MeshStandardMaterial({ color: 0xced6e0, metalness: 0.95, roughness: 0.1 });
        const redLaserMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });

        // Mechanical frame plate over left eye
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 16), chromeMat);
        plate.rotation.x = Math.PI * 0.5;
        plate.position.set(-0.14, 0.06, 0.065);
        group.add(plate);

        // Glowing red optic core
        const optic = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 12), redLaserMat);
        optic.position.set(-0.14, 0.06, 0.082);
        group.add(optic);

        return group;
    }

    private buildGothicMasquerade(): THREE.Group {
        const group = new THREE.Group();
        const goldMat = this.materials.gold;

        [-1, 1].forEach(side => {
            const wing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.02), goldMat);
            wing.position.set(side * 0.14, 0.07, 0.075);
            wing.rotation.z = side * 0.2;
            group.add(wing);

            // Filigree cutout peak
            const peak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), goldMat);
            peak.position.set(side * 0.24, 0.14, 0.075);
            peak.rotation.z = -side * 0.4;
            group.add(peak);
        });
        return group;
    }

    private buildHoloARGlasses(): THREE.Group {
        const group = new THREE.Group();
        const cyanHoloMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.75 });
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.08, 0.015), cyanHoloMat);
        bar.position.set(0, 0.07, 0.085);
        group.add(bar);

        [-1, 1].forEach(side => {
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.42, 6), frameMat);
            arm.rotation.x = Math.PI * 0.5;
            arm.position.set(side * 0.23, 0.07, -0.13);
            group.add(arm);
        });
        return group;
    }


    private renderFace(faceId: string) {
        const faceGroup = new THREE.Group();

        // 1. BASE FACIAL FEATURES CUSTOMIZED PER FACE ID
        const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
        const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
        const browMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
        const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        if (faceId === 'face_golden_snarl_grill') {
            // Smirking open mouth with glittering 24K gold and diamond teeth!
            const mouthMat = new THREE.MeshStandardMaterial({ color: 0x2c0909, roughness: 0.5 });
            const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.03), mouthMat);
            mouth.position.set(0, -0.10, 0.02);
            mouth.rotation.z = 0.08;
            faceGroup.add(mouth);

            const goldToothMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.15 });
            const diamToothMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.85, roughness: 0.05 });

            for (let t = 0; t < 6; t++) {
                const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.032, 0.018), t % 2 === 0 ? goldToothMat : diamToothMat);
                tooth.position.set(-0.065 + t * 0.026, -0.086, 0.036);
                faceGroup.add(tooth);
            }

            [-1, 1].forEach(side => {
                const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), eyeWhiteMat);
                eyeWhite.scale.set(1.0, 1.1, 0.5);
                eyeWhite.position.set(side * 0.14, 0.06, 0.02);
                faceGroup.add(eyeWhite);

                const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), pupilMat);
                pupil.position.set(side * 0.14, 0.06, 0.05);
                faceGroup.add(pupil);

                const shine = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), shineMat);
                shine.position.set(side * 0.14 + 0.015, 0.075, 0.065);
                faceGroup.add(shine);

                const brow = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.025, 0.03), browMat);
                brow.position.set(side * 0.14, 0.15 + (side > 0 ? 0.02 : -0.01), 0.03);
                brow.rotation.z = -side * 0.15;
                faceGroup.add(brow);
            });

        } else if (faceId === 'face_anime_sparkle' || faceId === 'face_anime_star_eyes') {
            // ANIME STARLIGHT EYES: Large vibrant eyes, violet/cyan iris, 4-point star sparkles & blush
            const animeIrisMat = new THREE.MeshBasicMaterial({ color: 0x9b59b6 });
            const blushMat = new THREE.MeshBasicMaterial({ color: 0xff7675 });

            [-1, 1].forEach(side => {
                // Large Anime Eyeball
                const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 16), eyeWhiteMat);
                eyeWhite.scale.set(1.1, 1.35, 0.4);
                eyeWhite.position.set(side * 0.14, 0.06, 0.02);
                faceGroup.add(eyeWhite);

                // Big Violet Iris
                const iris = new THREE.Mesh(new THREE.SphereGeometry(0.068, 14, 14), animeIrisMat);
                iris.scale.set(1.0, 1.25, 0.3);
                iris.position.set(side * 0.14, 0.06, 0.045);
                faceGroup.add(iris);

                // Pupil Core
                const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), pupilMat);
                pupil.position.set(side * 0.14, 0.06, 0.058);
                faceGroup.add(pupil);

                // 4-point Star Sparkle
                const starH = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.009, 0.006), shineMat);
                starH.position.set(side * 0.14, 0.08, 0.065);
                faceGroup.add(starH);
                const starV = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.038, 0.006), shineMat);
                starV.position.set(side * 0.14, 0.08, 0.065);
                faceGroup.add(starV);

                // Catchlight
                const catchlight = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), shineMat);
                catchlight.position.set(side * 0.14 + 0.02, 0.045, 0.066);
                faceGroup.add(catchlight);

                // Eyebrow
                const brow = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.02, 0.02), browMat);
                brow.position.set(side * 0.14, 0.16, 0.03);
                brow.rotation.z = -side * 0.12;
                faceGroup.add(brow);

                // Anime Pink Blush Streaks
                for (let b = 0; b < 3; b++) {
                    const blush = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.007, 0.008), blushMat);
                    blush.position.set(side * 0.22 + b * 0.015 * side, -0.04 + b * 0.012, 0.035);
                    blush.rotation.z = side * 0.25;
                    faceGroup.add(blush);
                }
            });

            // Cute Anime Happy Smile
            const mouthMat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.3 });
            const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.03), mouthMat);
            mouth.position.set(0, -0.10, 0.02);
            faceGroup.add(mouth);

        } else if (faceId === 'face_smirk_wink') {
            // PLAYFUL WINKING SMIRK: Right eye open with sparkle, left eye winking shut, asymmetrical mouth
            // Right Eye (Open)
            const eyeWhiteR = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), eyeWhiteMat);
            eyeWhiteR.scale.set(1.0, 1.1, 0.5);
            eyeWhiteR.position.set(0.14, 0.06, 0.02);
            faceGroup.add(eyeWhiteR);

            const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), pupilMat);
            pupilR.position.set(0.14, 0.06, 0.05);
            faceGroup.add(pupilR);

            const shineR = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), shineMat);
            shineR.position.set(0.155, 0.075, 0.065);
            faceGroup.add(shineR);

            const browR = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.025, 0.03), browMat);
            browR.position.set(0.14, 0.16, 0.03);
            browR.rotation.z = -0.15;
            faceGroup.add(browR);

            // Left Eye (Winking Closed Arc)
            const winkArc = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.014, 8, 16, Math.PI), browMat);
            winkArc.rotation.z = Math.PI;
            winkArc.position.set(-0.14, 0.06, 0.035);
            faceGroup.add(winkArc);

            const browL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.025, 0.03), browMat);
            browL.position.set(-0.14, 0.13, 0.03);
            browL.rotation.z = 0.05;
            faceGroup.add(browL);

            // Asymmetrical Cocky Smirk
            const mouthMat = new THREE.MeshStandardMaterial({ color: 0x900c3f, roughness: 0.3 });
            const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.03), mouthMat);
            mouth.position.set(0.03, -0.10, 0.02);
            mouth.rotation.z = 0.18; // Tilted smirk
            faceGroup.add(mouth);

        } else if (faceId === 'face_demon_horns_face') {
            // CRIMSON ONI WAR PAINT & FANGS
            const demonEyeMat = new THREE.MeshBasicMaterial({ color: 0xffd32a });
            const warPaintMat = new THREE.MeshBasicMaterial({ color: 0xc0392b });
            const fangMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });

            [-1, 1].forEach(side => {
                // Fierce Glowing Amber Slit Eyes
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), demonEyeMat);
                eye.scale.set(1.2, 0.8, 0.4);
                eye.position.set(side * 0.14, 0.06, 0.02);
                faceGroup.add(eye);

                // Slit pupil
                const slit = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.02), pupilMat);
                slit.position.set(side * 0.14, 0.06, 0.05);
                faceGroup.add(slit);

                // Sharp Angled Demon Brow
                const brow = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.028, 0.03), browMat);
                brow.position.set(side * 0.14, 0.14, 0.03);
                brow.rotation.z = -side * 0.25;
                faceGroup.add(brow);

                // Crimson War Paint Slash down cheek
                const paint = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.015), warPaintMat);
                paint.position.set(side * 0.18, -0.04, 0.03);
                paint.rotation.z = side * 0.22;
                faceGroup.add(paint);

                // Forehead war paint slash
                const fPaint = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.10, 0.015), warPaintMat);
                fPaint.position.set(side * 0.08, 0.19, 0.02);
                fPaint.rotation.z = -side * 0.35;
                faceGroup.add(fPaint);

                // Temple Horns
                const horn = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 6), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 }));
                horn.position.set(side * 0.25, 0.22, 0.02);
                horn.rotation.z = -side * 0.6;
                faceGroup.add(horn);

                // Upper Fang
                const fang = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.045, 4), fangMat);
                fang.rotation.x = Math.PI;
                fang.position.set(side * 0.05, -0.13, 0.03);
                faceGroup.add(fang);
            });

            // Fanged Menacing Mouth
            const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.045, 0.03), new THREE.MeshStandardMaterial({ color: 0x4a0e17 }));
            mouth.position.set(0, -0.11, 0.02);
            faceGroup.add(mouth);

        } else if (faceId === 'face_battle_scar') {
            // VETERAN BATTLE SCAR: Hardened eyes, textured 3D scar slashing across eye & stitches
            const scarMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.6 });
            const stitchMat = new THREE.MeshStandardMaterial({ color: 0xdcdde1, metalness: 0.8, roughness: 0.3 });

            // Right Eye Squinted
            const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), eyeWhiteMat);
            eyeR.scale.set(1.0, 0.7, 0.4);
            eyeR.position.set(0.14, 0.06, 0.02);
            faceGroup.add(eyeR);
            const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), pupilMat);
            pupilR.position.set(0.14, 0.06, 0.048);
            faceGroup.add(pupilR);

            // Left Eye
            const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), eyeWhiteMat);
            eyeL.scale.set(1.0, 1.0, 0.5);
            eyeL.position.set(-0.14, 0.06, 0.02);
            faceGroup.add(eyeL);
            const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), pupilMat);
            pupilL.position.set(-0.14, 0.06, 0.05);
            faceGroup.add(pupilL);

            [-1, 1].forEach(side => {
                const brow = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.025, 0.03), browMat);
                brow.position.set(side * 0.14, 0.13, 0.03);
                brow.rotation.z = -side * 0.06;
                faceGroup.add(brow);
            });

            // 3D Battle Scar slashing across right eye and brow
            const scar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 8), scarMat);
            scar.position.set(0.14, 0.06, 0.04);
            scar.rotation.z = -0.3;
            faceGroup.add(scar);

            // Surgical cross-stitches
            for (let s = -2; s <= 2; s++) {
                const stitch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.007, 0.01), stitchMat);
                stitch.position.set(0.14 + s * 0.025, 0.06 + s * 0.06, 0.045);
                stitch.rotation.z = 0.55;
                faceGroup.add(stitch);
            }

            // Stoic Grit-Teeth Mouth
            const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.03), new THREE.MeshStandardMaterial({ color: 0x4a4a4a }));
            mouth.position.set(0, -0.11, 0.02);
            faceGroup.add(mouth);

        } else {
            // Standard / Confident Smile Base (Used for glasses, masks, visors, hats, etc.)
            [-1, 1].forEach(side => {
                const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), eyeWhiteMat);
                eyeWhite.scale.set(1.0, 1.1, 0.5);
                eyeWhite.position.set(side * 0.14, 0.06, 0.02);
                faceGroup.add(eyeWhite);

                const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), pupilMat);
                pupil.scale.set(1.0, 1.0, 0.3);
                pupil.position.set(side * 0.14, 0.06, 0.05);
                faceGroup.add(pupil);

                const shine = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), shineMat);
                shine.position.set(side * 0.14 + 0.015, 0.075, 0.065);
                faceGroup.add(shine);

                const brow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.022, 0.03), browMat);
                brow.position.set(side * 0.14, 0.14, 0.03);
                brow.rotation.z = -side * 0.08;
                faceGroup.add(brow);
            });

            const mouthMat = new THREE.MeshStandardMaterial({ color: 0x78281f, roughness: 0.3 });
            const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.03), mouthMat);
            mouth.position.set(0, -0.11, 0.02);
            faceGroup.add(mouth);
        }

        // Cute Nose
        const noseMat = this.materials.skin.clone();
        noseMat.color.offsetHSL(0, 0.05, -0.05);
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.05, 5), noseMat);
        nose.rotation.x = Math.PI * 0.5;
        nose.position.set(0, -0.02, 0.04);
        faceGroup.add(nose);

        // 2. ATTACHED 3D ACCESSORIES / EYEWEAR / HEADWEAR
        if (faceId === 'face_cool_shades') {
            faceGroup.add(this.buildUltraRealisticGlasses('aviator'));
        } else if (faceId === 'face_sunglasses_luxury') {
            faceGroup.add(this.buildUltraRealisticGlasses('luxury'));
        } else if (faceId === 'face_retro_round') {
            faceGroup.add(this.buildUltraRealisticGlasses('round'));
        } else if (faceId === 'face_cyber_matrix_shades') {
            faceGroup.add(this.buildUltraRealisticGlasses('matrix'));
        } else if (faceId === 'face_cyborg_visor') {
            faceGroup.add(this.buildCyborgVisor());
        } else if (faceId === 'face_vr_headset') {
            faceGroup.add(this.buildVRHeadset());
        } else if (faceId === 'face_ninja_mask') {
            faceGroup.add(this.buildNinjaMask());
        } else if (faceId === 'face_gold_monocle' || faceId === 'face_steampunk_monocle') {
            faceGroup.add(this.buildGoldMonocle());
        } else if (faceId === 'face_steampunk_goggles') {
            faceGroup.add(this.buildSteampunkGoggles());
        } else if (faceId === 'face_diamond_shades') {
            faceGroup.add(this.buildDiamondShades());
        } else if (faceId === 'face_pixel_thug_shades') {
            faceGroup.add(this.buildPixelThugShades());
        } else if (faceId === 'face_laser_scouter') {
            faceGroup.add(this.buildLaserScouter());
        } else if (faceId === 'face_pirate_eyepatch') {
            faceGroup.add(this.buildPirateEyepatch());
        } else if (faceId === 'face_oni_demon_mask') {
            faceGroup.add(this.buildOniDemonMask());
        } else if (faceId === 'face_gasmask_tactical') {
            faceGroup.add(this.buildGasmaskTactical());
        } else if (faceId === 'face_flame_tinted_sunglasses') {
            faceGroup.add(this.buildFlameSunglasses());
        } else if (faceId === 'face_heart_shaped_glasses') {
            faceGroup.add(this.buildHeartSunglasses());
        } else if (faceId === 'face_cyber_matrix_blindfold') {
            faceGroup.add(this.buildCyberMatrixBlindfold());
        } else if (faceId === 'face_ninja_mouth_cloth') {
            faceGroup.add(this.buildNinjaMouthCloth());
        } else if (faceId === 'face_cyborg_eye_implant') {
            faceGroup.add(this.buildCyborgEyeImplant());
        } else if (faceId === 'face_gothic_masquerade') {
            faceGroup.add(this.buildGothicMasquerade());
        } else if (faceId === 'face_holographic_ar_glasses') {
            faceGroup.add(this.buildHoloARGlasses());
        }

        this.attachToSocket('face', faceGroup);
    }

    private renderHat(hatId: string) {
        const hatGroup = new THREE.Group();
        if (hatId === 'hat_royal_crown') {
            const crownBand = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 20, 1, true), this.materials.gold);
            hatGroup.add(crownBand);
            for (let i = 0; i < 8; i++) {
                const ang = (i / 8) * Math.PI * 2;
                const peak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 4), this.materials.gold);
                peak.position.set(Math.sin(ang) * 0.41, 0.14, Math.cos(ang) * 0.41);
                hatGroup.add(peak);
            }
        } else if (hatId === 'hat_cap_snapback') {
            const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), this.materials.accent);
            capDome.position.set(0, 0.02, 0);
            hatGroup.add(capDome);
            const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 16, 1, false, 0, Math.PI), this.materials.accent);
            brim.position.set(0, 0.02, 0.2);
            hatGroup.add(brim);
        } else if (hatId === 'hat_viking_helm') {
            const helm = new THREE.Mesh(new THREE.SphereGeometry(0.43, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), this.materials.hat);
            hatGroup.add(helm);
            // Horns
            [-1, 1].forEach(side => {
                const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 8), new THREE.MeshStandardMaterial({ color: 0xefefef }));
                horn.position.set(side * 0.42, 0.22, 0);
                horn.rotation.z = -side * 0.6;
                hatGroup.add(horn);
            });
        } else if (hatId === 'hat_cowboy_leather') {
            const stetsonDome = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.25, 16), new THREE.MeshStandardMaterial({ color: 0x533c2a }));
            stetsonDome.position.set(0, 0.14, 0);
            hatGroup.add(stetsonDome);
            const stetsonBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.03, 20), new THREE.MeshStandardMaterial({ color: 0x533c2a }));
            stetsonBrim.position.set(0, 0.02, 0);
            hatGroup.add(stetsonBrim);
        } else if (hatId === 'hat_top_hat_gentleman') {
            const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.55, 20), new THREE.MeshStandardMaterial({ color: 0x111111 }));
            cylinder.position.set(0, 0.28, 0);
            hatGroup.add(cylinder);
            const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.03, 20), new THREE.MeshStandardMaterial({ color: 0x111111 }));
            brim.position.set(0, 0.02, 0);
            hatGroup.add(brim);
        } else if (hatId === 'hat_halo_angel') {
            const halo = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 12, 32), new THREE.MeshBasicMaterial({ color: 0xffd700 }));
            halo.rotation.x = Math.PI / 2;
            halo.position.set(0, 0.45, 0);
            hatGroup.add(halo);
        } else if (hatId === 'hat_tactical_beret') {
            const beret = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.38, 0.12, 16), new THREE.MeshStandardMaterial({ color: 0xeb2f06 }));
            beret.position.set(0.06, 0.12, 0);
            beret.rotation.z = -0.2;
            hatGroup.add(beret);
        } else {
            // Default cap
            const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), this.materials.hat);
            capDome.position.set(0, 0.02, 0);
            hatGroup.add(capDome);
        }
        this.attachToSocket('head', hatGroup);
    }

    private renderBackAccessory(backId: string) {
        const backGroup = new THREE.Group();
        if (backId === 'back_ninja_katana') {
            [-0.35, 0.35].forEach(rot => {
                const scabbard = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.2, 0.07), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 }));
                scabbard.rotation.z = rot;
                backGroup.add(scabbard);
                const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.25, 0.09), this.materials.gold);
                hilt.position.set(Math.sin(-rot) * 0.65, Math.cos(rot) * 0.65, 0);
                hilt.rotation.z = rot;
                backGroup.add(hilt);
            });
        } else if (backId === 'back_cyber_wings' || backId === 'back_demon_wings' || backId === 'back_golden_wings') {
            const wingColor = backId === 'back_golden_wings' ? 0xffd700 : (backId === 'back_demon_wings' ? 0x9b59b6 : 0x00f2fe);
            const wingMat = new THREE.MeshBasicMaterial({ color: wingColor, wireframe: false });
            [-1, 1].forEach(side => {
                const wing = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, 0.04), wingMat);
                wing.position.set(side * 0.6, 0.25, 0);
                wing.rotation.z = side * 0.3;
                backGroup.add(wing);
            });
        } else if (backId === 'back_golden_shield') {
            const shield = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.9, 0.08), this.materials.gold);
            shield.position.set(0, 0.2, 0.05);
            backGroup.add(shield);
        } else if (backId === 'back_cyber_jetpack') {
            const jetpack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.2), new THREE.MeshStandardMaterial({ color: 0x2f3542 }));
            jetpack.position.set(0, 0.2, 0.05);
            backGroup.add(jetpack);
            [-0.18, 0.18].forEach(x => {
                const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.3, 12), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
                thruster.position.set(x, -0.15, 0.05);
                backGroup.add(thruster);
            });
        } else {
            const genericBack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.12), this.materials.hat);
            genericBack.position.set(0, 0.2, 0.05);
            backGroup.add(genericBack);
        }
        this.attachToSocket('back', backGroup);
    }

    public resetBonesToRestPose() {
        this.bones.root.position.set(0, 0, 0);
        this.bones.root.rotation.set(0, 0, 0);

        this.bones.hips.position.set(0, 1.25, 0);
        this.bones.hips.rotation.set(0, 0, 0);

        this.bones.torso.position.set(0, 0.35, 0);
        this.bones.torso.rotation.set(0, 0, 0);

        this.bones.chest.position.set(0, 0.45, 0);
        this.bones.chest.rotation.set(0, 0, 0);

        this.bones.neck.position.set(0, 0.45, 0);
        this.bones.neck.rotation.set(0, 0, 0);

        this.bones.head.position.set(0, 0.35, 0);
        this.bones.head.rotation.set(0, 0, 0);

        this.bones.leftArm.position.set(-0.65, 0.35, 0);
        this.bones.leftArm.rotation.set(0, 0, 0);

        this.bones.rightArm.position.set(0.65, 0.35, 0);
        this.bones.rightArm.rotation.set(0, 0, 0);

        this.bones.leftLeg.position.set(-0.25, -0.1, 0);
        this.bones.leftLeg.rotation.set(0, 0, 0);

        this.bones.rightLeg.position.set(0.25, -0.1, 0);
        this.bones.rightLeg.rotation.set(0, 0, 0);

        this.bones.leftFoot.position.set(0, -1.05, 0);
        this.bones.leftFoot.rotation.set(0, 0, 0);

        this.bones.rightFoot.position.set(0, -1.05, 0);
        this.bones.rightFoot.rotation.set(0, 0, 0);
    }

    private animateIdle(time: number, style: string) {
        switch (style) {
            case 'anim_style_ninja': {
                // Low crouch ready stance, swept back arms, focused head
                this.bones.hips.position.y = 1.12;
                this.bones.chest.rotation.x = 0.22;
                this.bones.leftLeg.rotation.x = -0.25;
                this.bones.rightLeg.rotation.x = 0.15;
                this.bones.leftArm.rotation.x = 0.55 + Math.sin(time * 3) * 0.03;
                this.bones.rightArm.rotation.x = 0.55 - Math.sin(time * 3) * 0.03;
                this.bones.leftArm.rotation.z = -0.4;
                this.bones.rightArm.rotation.z = 0.4;
                this.bones.head.rotation.x = -0.1;
                break;
            }
            case 'anim_style_zombie': {
                // Lurching off-balance posture, sideways tilted head, limp outstretched arms
                const sway = Math.sin(time * 1.8);
                this.bones.head.rotation.z = 0.28 + sway * 0.05;
                this.bones.head.rotation.y = -0.18;
                this.bones.torso.rotation.x = 0.16;
                this.bones.leftArm.rotation.x = -1.35 + sway * 0.04;
                this.bones.rightArm.rotation.x = -1.45 - sway * 0.04;
                this.bones.leftArm.rotation.z = -0.1;
                this.bones.rightArm.rotation.z = 0.1;
                this.bones.leftLeg.rotation.x = 0.12;
                this.bones.rightLeg.rotation.x = -0.22;
                break;
            }
            case 'anim_style_superhero': {
                // Fists on hips, chest puffed high, wide stance
                this.bones.chest.rotation.x = -0.12;
                this.bones.head.rotation.x = -0.12;
                this.bones.leftArm.rotation.z = -0.65;
                this.bones.leftArm.rotation.x = -0.4;
                this.bones.rightArm.rotation.z = 0.65;
                this.bones.rightArm.rotation.x = -0.4;
                this.bones.leftLeg.rotation.z = -0.18;
                this.bones.rightLeg.rotation.z = 0.18;
                this.bones.chest.position.y = 0.46 + Math.sin(time * 2) * 0.02;
                break;
            }
            case 'anim_style_mage': {
                // Floating hover, legs tucked together, arcane hand gestures
                const floatY = Math.sin(time * 2.2) * 0.12;
                this.bones.hips.position.y = 1.38 + floatY;
                this.bones.leftLeg.rotation.x = 0.15;
                this.bones.rightLeg.rotation.x = 0.15;
                this.bones.leftLeg.rotation.z = -0.06;
                this.bones.rightLeg.rotation.z = 0.06;
                this.bones.leftArm.rotation.x = -0.65 + Math.sin(time * 2.5) * 0.12;
                this.bones.rightArm.rotation.x = -0.65 - Math.sin(time * 2.5) * 0.12;
                this.bones.leftArm.rotation.z = -0.45;
                this.bones.rightArm.rotation.z = 0.45;
                break;
            }
            case 'anim_style_robot': {
                // Mechanical rigid stance with quantized 90-degree servo clicks
                const servo = (Math.floor(time * 2.5) % 2 === 0) ? 0.08 : 0;
                this.bones.chest.rotation.x = 0;
                this.bones.head.rotation.y = (Math.floor(time * 1.2) % 3 - 1) * 0.25;
                this.bones.leftArm.rotation.z = -0.35;
                this.bones.leftArm.rotation.x = -0.6 + servo;
                this.bones.rightArm.rotation.z = 0.35;
                this.bones.rightArm.rotation.x = -0.6 - servo;
                this.bones.leftLeg.rotation.x = 0;
                this.bones.rightLeg.rotation.x = 0;
                break;
            }
            case 'anim_style_oldschool': {
                // 90s bouncy hip sway and playful arm swing
                const bounce = Math.abs(Math.sin(time * 3.5)) * 0.06;
                this.bones.hips.position.y = 1.25 + bounce;
                this.bones.hips.rotation.y = Math.sin(time * 3.5) * 0.15;
                this.bones.leftArm.rotation.z = -0.3 + Math.sin(time * 3.5) * 0.08;
                this.bones.rightArm.rotation.z = 0.3 - Math.sin(time * 3.5) * 0.08;
                this.bones.chest.rotation.z = -Math.sin(time * 3.5) * 0.06;
                break;
            }
            case 'anim_style_toy': {
                // Pure stiff plastic joint soldier
                this.bones.leftArm.rotation.set(0, 0, -0.05);
                this.bones.rightArm.rotation.set(0, 0, 0.05);
                this.bones.leftLeg.rotation.set(0, 0, -0.02);
                this.bones.rightLeg.rotation.set(0, 0, 0.02);
                this.bones.chest.position.y = 0.45;
                this.bones.chest.rotation.set(0, 0, 0);
                break;
            }
            case 'anim_style_knight': {
                // Heavy plate stalwart stance, right hand on hilt, left in shield pose
                this.bones.hips.position.y = 1.22;
                this.bones.leftLeg.rotation.z = -0.12;
                this.bones.rightLeg.rotation.z = 0.12;
                this.bones.leftArm.rotation.x = -0.7;
                this.bones.leftArm.rotation.z = -0.5;
                this.bones.rightArm.rotation.x = -0.55;
                this.bones.rightArm.rotation.z = 0.35;
                this.bones.chest.rotation.x = -0.05;
                break;
            }
            case 'anim_style_stylish': {
                // Runway swagger, cocked hip, hand on waist, confident head tilt
                this.bones.hips.rotation.z = 0.14;
                this.bones.hips.position.x = -0.08;
                this.bones.leftArm.rotation.x = -0.4;
                this.bones.leftArm.rotation.z = -0.55;
                this.bones.rightArm.rotation.x = 0.1;
                this.bones.rightArm.rotation.z = 0.25;
                this.bones.head.rotation.z = -0.12;
                this.bones.head.rotation.y = 0.16;
                this.bones.rightLeg.rotation.x = -0.18;
                break;
            }
            case 'anim_style_parkour': {
                this.bones.hips.position.y = 1.16;
                this.bones.chest.rotation.x = 0.24;
                this.bones.leftLeg.rotation.x = -0.3;
                this.bones.rightLeg.rotation.x = 0.2;
                this.bones.leftArm.rotation.x = -0.3 + Math.sin(time * 3) * 0.04;
                this.bones.rightArm.rotation.x = -0.3 - Math.sin(time * 3) * 0.04;
                this.bones.leftArm.rotation.z = -0.35;
                this.bones.rightArm.rotation.z = 0.35;
                break;
            }
            case 'anim_style_speedster': {
                this.bones.hips.position.y = 1.18;
                this.bones.chest.rotation.x = 0.32;
                this.bones.leftArm.rotation.x = 0.6;
                this.bones.rightArm.rotation.x = -0.6;
                this.bones.leftLeg.rotation.x = 0.2;
                this.bones.rightLeg.rotation.x = -0.3;
                break;
            }
            case 'anim_style_celestial': {
                const float = Math.sin(time * 2) * 0.18;
                this.bones.hips.position.y = 1.5 + float;
                this.bones.leftLeg.rotation.x = 0.2;
                this.bones.rightLeg.rotation.x = -0.1;
                this.bones.leftArm.rotation.z = -1.1 + Math.sin(time * 2.5) * 0.08;
                this.bones.rightArm.rotation.z = 1.1 - Math.sin(time * 2.5) * 0.08;
                break;
            }
            case 'anim_style_monarch': {
                this.bones.chest.rotation.x = -0.15;
                this.bones.head.rotation.x = -0.1;
                this.bones.leftArm.rotation.z = -0.25;
                this.bones.rightArm.rotation.z = 0.25;
                this.bones.rightArm.rotation.x = -0.3;
                break;
            }
            case 'anim_style_glider': {
                this.bones.hips.position.y = 1.32 + Math.sin(time * 3) * 0.05;
                this.bones.chest.rotation.x = 0.18;
                this.bones.leftArm.rotation.z = -1.35;
                this.bones.rightArm.rotation.z = 1.35;
                break;
            }
            case 'anim_style_heavy_titan': {
                this.bones.hips.position.y = 1.2;
                this.bones.leftLeg.rotation.z = -0.22;
                this.bones.rightLeg.rotation.z = 0.22;
                this.bones.leftArm.rotation.z = -0.55;
                this.bones.rightArm.rotation.z = 0.55;
                this.bones.chest.rotation.x = -0.06;
                break;
            }
            case 'anim_style_ghost_float': {
                const ghostly = Math.sin(time * 2.4) * 0.14;
                this.bones.hips.position.y = 1.4 + ghostly;
                this.bones.head.rotation.z = Math.sin(time * 1.8) * 0.15;
                this.bones.leftArm.rotation.x = -0.8 + ghostly;
                this.bones.rightArm.rotation.x = -0.8 - ghostly;
                this.bones.leftLeg.rotation.x = 0.3;
                this.bones.rightLeg.rotation.x = 0.3;
                break;
            }
            case 'anim_style_beast_prowl': {
                this.bones.hips.position.y = 1.08;
                this.bones.chest.rotation.x = 0.38;
                this.bones.head.rotation.x = -0.2;
                this.bones.leftArm.rotation.x = -0.6;
                this.bones.rightArm.rotation.x = -0.6;
                this.bones.leftLeg.rotation.x = -0.35;
                this.bones.rightLeg.rotation.x = 0.25;
                break;
            }
            case 'anim_style_groove_walker': {
                const bounce = Math.abs(Math.sin(time * 4)) * 0.08;
                this.bones.hips.position.y = 1.25 + bounce;
                this.bones.hips.rotation.y = Math.sin(time * 4) * 0.2;
                this.bones.leftArm.rotation.z = -0.6;
                this.bones.rightArm.rotation.z = 0.6;
                break;
            }
            case 'anim_style_assassin_stealth': {
                this.bones.hips.position.y = 1.1;
                this.bones.chest.rotation.x = 0.28;
                this.bones.leftArm.rotation.x = 0.4;
                this.bones.rightArm.rotation.x = -0.2;
                this.bones.leftLeg.rotation.x = -0.25;
                this.bones.rightLeg.rotation.x = 0.2;
                break;
            }
            case 'anim_style_default':
            default: {
                // Natural breathing and subtle idle sway
                const breathe = Math.sin(time * 2.5) * 0.025;
                this.bones.chest.position.y = 0.45 + breathe;
                this.bones.chest.rotation.x = Math.sin(time * 1.5) * 0.02;
                this.bones.leftArm.rotation.z = -0.15 + Math.sin(time * 2) * 0.03;
                this.bones.rightArm.rotation.z = 0.15 - Math.sin(time * 2) * 0.03;
                this.bones.head.rotation.y = Math.sin(time * 0.8) * 0.08;
                this.bones.leftLeg.rotation.x = 0;
                this.bones.rightLeg.rotation.x = 0;
                break;
            }
        }
    }

    private animateLocomotion(time: number, isRun: boolean, style: string) {
        switch (style) {
            case 'anim_style_ninja': {
                // Naruto-style swept-back arms sprint, heavy forward lean
                const speed = isRun ? 15 : 10;
                const stride = isRun ? 0.9 : 0.65;
                const swing = Math.sin(time * speed);
                this.bones.chest.rotation.x = isRun ? 0.48 : 0.32;
                this.bones.hips.position.y = 1.1 + Math.abs(Math.sin(time * speed)) * 0.08;
                this.bones.leftArm.rotation.x = 1.35;
                this.bones.rightArm.rotation.x = 1.35;
                this.bones.leftArm.rotation.z = -0.3;
                this.bones.rightArm.rotation.z = 0.3;
                this.bones.leftLeg.rotation.x = swing * stride;
                this.bones.rightLeg.rotation.x = -swing * stride;
                break;
            }
            case 'anim_style_zombie': {
                // Outstretched stiff zombie arms, dragging shuffle
                const speed = isRun ? 8 : 5;
                const swing = Math.sin(time * speed);
                this.bones.leftArm.rotation.x = -1.45 + swing * 0.08;
                this.bones.rightArm.rotation.x = -1.45 - swing * 0.08;
                this.bones.leftArm.rotation.z = -0.1;
                this.bones.rightArm.rotation.z = 0.1;
                this.bones.head.rotation.z = 0.25 + swing * 0.1;
                this.bones.chest.rotation.y = swing * 0.18;
                this.bones.leftLeg.rotation.x = swing * 0.65;
                this.bones.rightLeg.rotation.x = -Math.cos(time * speed) * 0.45;
                this.bones.hips.position.y = 1.2 + Math.abs(swing) * 0.05;
                break;
            }
            case 'anim_style_superhero': {
                // Powerful chest-forward charge
                const speed = isRun ? 13 : 9;
                const stride = isRun ? 0.85 : 0.6;
                const swing = Math.sin(time * speed);
                this.bones.chest.rotation.x = 0.22;
                this.bones.leftArm.rotation.x = -swing * stride * 1.1;
                this.bones.rightArm.rotation.x = swing * stride * 1.1;
                this.bones.leftArm.rotation.z = -0.35;
                this.bones.rightArm.rotation.z = 0.35;
                this.bones.leftLeg.rotation.x = swing * stride;
                this.bones.rightLeg.rotation.x = -swing * stride;
                this.bones.hips.position.y = 1.25 + Math.abs(swing) * 0.08;
                break;
            }
            case 'anim_style_mage': {
                // Smooth gliding levitation
                const speed = isRun ? 9 : 6;
                const swing = Math.sin(time * speed);
                this.bones.hips.position.y = 1.35 + Math.sin(time * (speed * 0.5)) * 0.08;
                this.bones.leftLeg.rotation.x = swing * 0.35;
                this.bones.rightLeg.rotation.x = -swing * 0.35;
                this.bones.leftArm.rotation.z = -1.0 + swing * 0.15;
                this.bones.rightArm.rotation.z = 1.0 - swing * 0.15;
                this.bones.leftArm.rotation.x = -0.3;
                this.bones.rightArm.rotation.x = -0.3;
                break;
            }
            case 'anim_style_robot': {
                // 90-degree angular piston march
                const speed = isRun ? 11 : 7;
                const step = Math.sign(Math.sin(time * speed)) * 0.65;
                this.bones.chest.rotation.x = 0;
                this.bones.leftArm.rotation.x = -step;
                this.bones.rightArm.rotation.x = step;
                this.bones.leftArm.rotation.z = -0.35;
                this.bones.rightArm.rotation.z = 0.35;
                this.bones.leftLeg.rotation.x = step;
                this.bones.rightLeg.rotation.x = -step;
                this.bones.hips.position.y = 1.25;
                break;
            }
            case 'anim_style_oldschool': {
                // Carefree wide-swinging bouncy strides
                const speed = isRun ? 12 : 8;
                const swing = Math.sin(time * speed);
                this.bones.leftArm.rotation.x = -swing * 1.1;
                this.bones.rightArm.rotation.x = swing * 1.1;
                this.bones.leftLeg.rotation.x = swing * 0.75;
                this.bones.rightLeg.rotation.x = -swing * 0.75;
                this.bones.hips.position.y = 1.25 + Math.abs(swing) * 0.12;
                this.bones.chest.rotation.z = -swing * 0.1;
                break;
            }
            case 'anim_style_toy': {
                // Stiff wind-up toy soldier march
                const speed = isRun ? 10 : 7;
                const swing = Math.sin(time * speed);
                this.bones.leftLeg.rotation.x = swing * 0.5;
                this.bones.rightLeg.rotation.x = -swing * 0.5;
                this.bones.leftArm.rotation.x = -swing * 0.5;
                this.bones.rightArm.rotation.x = swing * 0.5;
                this.bones.hips.position.y = 1.25;
                break;
            }
            case 'anim_style_knight': {
                // Heavy armored disciplined charge
                const speed = isRun ? 10 : 6.5;
                const swing = Math.sin(time * speed);
                this.bones.leftArm.rotation.x = -0.8 - swing * 0.2;
                this.bones.leftArm.rotation.z = -0.4;
                this.bones.rightArm.rotation.x = swing * 0.8;
                this.bones.rightArm.rotation.z = 0.3;
                this.bones.leftLeg.rotation.x = swing * 0.6;
                this.bones.rightLeg.rotation.x = -swing * 0.6;
                this.bones.hips.position.y = 1.22 + Math.abs(swing) * 0.05;
                break;
            }
            case 'anim_style_stylish': {
                // Catwalk runway fluid sway
                const speed = isRun ? 11 : 7;
                const swing = Math.sin(time * speed);
                this.bones.hips.rotation.y = swing * 0.25;
                this.bones.hips.rotation.z = Math.cos(time * speed) * 0.08;
                this.bones.leftArm.rotation.x = -swing * 0.65;
                this.bones.rightArm.rotation.x = swing * 0.65;
                this.bones.leftArm.rotation.z = -0.3;
                this.bones.rightArm.rotation.z = 0.3;
                this.bones.leftLeg.rotation.x = swing * 0.65;
                this.bones.rightLeg.rotation.x = -swing * 0.65;
                this.bones.hips.position.y = 1.25 + Math.abs(swing) * 0.06;
                break;
            }
            case 'anim_style_parkour': {
                const speed = isRun ? 16 : 11;
                const stride = isRun ? 0.95 : 0.7;
                const swing = Math.sin(time * speed);
                this.bones.chest.rotation.x = isRun ? 0.4 : 0.25;
                this.bones.hips.position.y = 1.15 + Math.abs(swing) * 0.1;
                this.bones.leftLeg.rotation.x = swing * stride;
                this.bones.rightLeg.rotation.x = -swing * stride;
                this.bones.leftArm.rotation.x = -swing * stride * 1.2;
                this.bones.rightArm.rotation.x = swing * stride * 1.2;
                break;
            }
            case 'anim_style_speedster': {
                const speed = isRun ? 22 : 14;
                const stride = isRun ? 1.05 : 0.8;
                const swing = Math.sin(time * speed);
                this.bones.chest.rotation.x = 0.5;
                this.bones.hips.position.y = 1.12 + Math.abs(swing) * 0.08;
                this.bones.leftLeg.rotation.x = swing * stride;
                this.bones.rightLeg.rotation.x = -swing * stride;
                this.bones.leftArm.rotation.x = -swing * stride * 1.4;
                this.bones.rightArm.rotation.x = swing * stride * 1.4;
                break;
            }
            case 'anim_style_celestial': {
                const speed = isRun ? 9 : 6;
                this.bones.hips.position.y = 1.5 + Math.sin(time * speed) * 0.1;
                this.bones.leftArm.rotation.z = -1.2;
                this.bones.rightArm.rotation.z = 1.2;
                this.bones.leftLeg.rotation.x = 0.2;
                this.bones.rightLeg.rotation.x = -0.2;
                break;
            }
            case 'anim_style_monarch': {
                const speed = isRun ? 10 : 6;
                const swing = Math.sin(time * speed);
                this.bones.chest.rotation.x = -0.12;
                this.bones.leftLeg.rotation.x = swing * 0.6;
                this.bones.rightLeg.rotation.x = -swing * 0.6;
                this.bones.leftArm.rotation.x = -swing * 0.5;
                this.bones.rightArm.rotation.x = swing * 0.5;
                this.bones.hips.position.y = 1.25 + Math.abs(swing) * 0.06;
                break;
            }
            case 'anim_style_glider': {
                const speed = isRun ? 12 : 8;
                this.bones.chest.rotation.x = 0.35;
                this.bones.hips.position.y = 1.3 + Math.sin(time * speed) * 0.08;
                this.bones.leftArm.rotation.z = -1.4;
                this.bones.rightArm.rotation.z = 1.4;
                this.bones.leftLeg.rotation.x = Math.sin(time * speed) * 0.4;
                this.bones.rightLeg.rotation.x = -Math.sin(time * speed) * 0.4;
                break;
            }
            case 'anim_style_heavy_titan': {
                const speed = isRun ? 9 : 6;
                const swing = Math.sin(time * speed);
                this.bones.leftLeg.rotation.x = swing * 0.7;
                this.bones.rightLeg.rotation.x = -swing * 0.7;
                this.bones.leftArm.rotation.x = -swing * 0.8;
                this.bones.rightArm.rotation.x = swing * 0.8;
                this.bones.hips.position.y = 1.2 + Math.abs(swing) * 0.08;
                break;
            }
            case 'anim_style_ghost_float': {
                const speed = isRun ? 8 : 5;
                this.bones.hips.position.y = 1.4 + Math.sin(time * speed) * 0.12;
                this.bones.leftLeg.rotation.x = Math.sin(time * speed) * 0.2;
                this.bones.rightLeg.rotation.x = -Math.sin(time * speed) * 0.2;
                this.bones.leftArm.rotation.x = -0.6;
                this.bones.rightArm.rotation.x = -0.6;
                break;
            }
            case 'anim_style_beast_prowl': {
                const speed = isRun ? 14 : 9;
                const swing = Math.sin(time * speed);
                this.bones.chest.rotation.x = 0.42;
                this.bones.hips.position.y = 1.08 + Math.abs(swing) * 0.09;
                this.bones.leftLeg.rotation.x = swing * 0.8;
                this.bones.rightLeg.rotation.x = -swing * 0.8;
                this.bones.leftArm.rotation.x = -swing * 0.9;
                this.bones.rightArm.rotation.x = swing * 0.9;
                break;
            }
            case 'anim_style_groove_walker': {
                const speed = isRun ? 13 : 8;
                const swing = Math.sin(time * speed);
                this.bones.hips.rotation.y = swing * 0.3;
                this.bones.leftLeg.rotation.x = swing * 0.75;
                this.bones.rightLeg.rotation.x = -swing * 0.75;
                this.bones.leftArm.rotation.x = -swing * 0.9;
                this.bones.rightArm.rotation.x = swing * 0.9;
                this.bones.hips.position.y = 1.25 + Math.abs(swing) * 0.1;
                break;
            }
            case 'anim_style_assassin_stealth': {
                const speed = isRun ? 13 : 8.5;
                const swing = Math.sin(time * speed);
                this.bones.chest.rotation.x = 0.35;
                this.bones.hips.position.y = 1.1 + Math.abs(swing) * 0.06;
                this.bones.leftLeg.rotation.x = swing * 0.65;
                this.bones.rightLeg.rotation.x = -swing * 0.65;
                this.bones.leftArm.rotation.x = 0.3;
                this.bones.rightArm.rotation.x = -0.3;
                break;
            }
            case 'anim_style_default':
            default: {
                const speed = isRun ? 12 : 8;
                const stride = isRun ? 0.75 : 0.5;
                const swing = Math.sin(time * speed);
                this.bones.leftLeg.rotation.x = swing * stride;
                this.bones.rightLeg.rotation.x = -swing * stride;
                this.bones.leftArm.rotation.x = -swing * stride * 0.8;
                this.bones.rightArm.rotation.x = swing * stride * 0.8;
                this.bones.hips.position.y = 1.25 + Math.abs(Math.sin(time * speed)) * 0.06;
                this.bones.chest.rotation.y = swing * 0.1;
                break;
            }
        }
    }

    private animateJump(time: number, style: string) {
        const jumpProgress = (time * 3) % Math.PI;
        const jumpY = Math.sin(jumpProgress);

        switch (style) {
            case 'anim_style_ninja': {
                // High ninja aerial tuck, hips high, swept back arms
                this.bones.hips.position.y = 1.25 + jumpY * 0.55;
                this.bones.leftLeg.rotation.x = -1.0;
                this.bones.rightLeg.rotation.x = -0.85;
                this.bones.leftArm.rotation.x = 1.1;
                this.bones.rightArm.rotation.x = 1.1;
                this.bones.leftArm.rotation.z = -0.35;
                this.bones.rightArm.rotation.z = 0.35;
                break;
            }
            case 'anim_style_zombie': {
                // Clumsy undead flailing leap
                this.bones.hips.position.y = 1.25 + jumpY * 0.35;
                this.bones.leftArm.rotation.x = -1.2;
                this.bones.rightArm.rotation.x = -1.2;
                this.bones.leftArm.rotation.z = -0.8;
                this.bones.rightArm.rotation.z = 0.8;
                this.bones.leftLeg.rotation.z = -0.3;
                this.bones.rightLeg.rotation.z = 0.3;
                this.bones.head.rotation.z = 0.3;
                break;
            }
            case 'anim_style_superhero': {
                // Right fist punching skyward, left arm trailing
                this.bones.hips.position.y = 1.25 + jumpY * 0.5;
                this.bones.rightArm.rotation.z = 2.9;
                this.bones.leftArm.rotation.x = 1.1;
                this.bones.leftLeg.rotation.x = -0.4;
                this.bones.rightLeg.rotation.x = 0.55;
                break;
            }
            case 'anim_style_mage': {
                // Arcane spiral levitation leap
                this.bones.hips.position.y = 1.25 + jumpY * 0.55;
                this.bones.leftLeg.rotation.x = -0.4;
                this.bones.rightLeg.rotation.x = -0.4;
                this.bones.leftLeg.rotation.z = 0.35;
                this.bones.rightLeg.rotation.z = -0.35;
                this.bones.leftArm.rotation.z = -2.1;
                this.bones.rightArm.rotation.z = 2.1;
                break;
            }
            case 'anim_style_robot': {
                // Hydraulic thruster jump
                this.bones.hips.position.y = 1.25 + jumpY * 0.45;
                this.bones.leftArm.rotation.z = -0.8;
                this.bones.rightArm.rotation.z = 0.8;
                this.bones.leftLeg.rotation.x = 0;
                this.bones.rightLeg.rotation.x = 0;
                break;
            }
            case 'anim_style_oldschool': {
                // Joyful victory star leap
                this.bones.hips.position.y = 1.25 + jumpY * 0.45;
                this.bones.leftArm.rotation.z = -2.6;
                this.bones.rightArm.rotation.z = 2.6;
                this.bones.leftLeg.rotation.x = 0.5;
                this.bones.rightLeg.rotation.x = 0.3;
                break;
            }
            case 'anim_style_toy': {
                // Rigid action figure spring leap
                this.bones.hips.position.y = 1.25 + jumpY * 0.4;
                this.bones.leftArm.rotation.set(0, 0, -0.05);
                this.bones.rightArm.rotation.set(0, 0, 0.05);
                this.bones.leftLeg.rotation.set(0, 0, 0);
                this.bones.rightLeg.rotation.set(0, 0, 0);
                break;
            }
            case 'anim_style_knight': {
                // Armored charge leap
                this.bones.hips.position.y = 1.25 + jumpY * 0.4;
                this.bones.leftArm.rotation.x = -1.2;
                this.bones.rightArm.rotation.x = 0.8;
                this.bones.leftLeg.rotation.x = -0.3;
                this.bones.rightLeg.rotation.x = 0.3;
                break;
            }
            case 'anim_style_stylish': {
                // Graceful airborne dancer leap
                this.bones.hips.position.y = 1.25 + jumpY * 0.48;
                this.bones.leftLeg.rotation.x = -0.7;
                this.bones.rightLeg.rotation.x = 0.7;
                this.bones.leftArm.rotation.z = -1.6;
                this.bones.rightArm.rotation.z = 1.6;
                break;
            }
            case 'anim_style_parkour': {
                this.bones.hips.position.y = 1.25 + jumpY * 0.65;
                this.bones.leftLeg.rotation.x = -1.1;
                this.bones.rightLeg.rotation.x = -0.9;
                this.bones.leftArm.rotation.x = 0.8;
                this.bones.rightArm.rotation.x = 0.8;
                break;
            }
            case 'anim_style_speedster': {
                this.bones.hips.position.y = 1.25 + jumpY * 0.55;
                this.bones.chest.rotation.x = 0.45;
                this.bones.leftLeg.rotation.x = -1.2;
                this.bones.rightLeg.rotation.x = 0.5;
                break;
            }
            case 'anim_style_celestial': {
                this.bones.hips.position.y = 1.45 + jumpY * 0.7;
                this.bones.leftArm.rotation.z = -1.7;
                this.bones.rightArm.rotation.z = 1.7;
                break;
            }
            case 'anim_style_monarch': {
                this.bones.hips.position.y = 1.25 + jumpY * 0.45;
                this.bones.chest.rotation.x = -0.15;
                this.bones.leftLeg.rotation.x = -0.3;
                this.bones.rightLeg.rotation.x = 0.3;
                break;
            }
            case 'anim_style_glider': {
                this.bones.hips.position.y = 1.35 + jumpY * 0.6;
                this.bones.chest.rotation.x = 0.5;
                this.bones.leftArm.rotation.z = -1.5;
                this.bones.rightArm.rotation.z = 1.5;
                break;
            }
            case 'anim_style_heavy_titan': {
                this.bones.hips.position.y = 1.2 + jumpY * 0.38;
                this.bones.leftLeg.rotation.x = -0.5;
                this.bones.rightLeg.rotation.x = -0.5;
                this.bones.leftLeg.rotation.z = -0.3;
                this.bones.rightLeg.rotation.z = 0.3;
                break;
            }
            case 'anim_style_ghost_float': {
                this.bones.hips.position.y = 1.45 + jumpY * 0.65;
                this.bones.leftArm.rotation.x = -1.2;
                this.bones.rightArm.rotation.x = -1.2;
                break;
            }
            case 'anim_style_beast_prowl': {
                this.bones.hips.position.y = 1.15 + jumpY * 0.6;
                this.bones.leftLeg.rotation.x = -1.1;
                this.bones.rightLeg.rotation.x = -1.1;
                this.bones.leftArm.rotation.x = 0.9;
                this.bones.rightArm.rotation.x = 0.9;
                break;
            }
            case 'anim_style_groove_walker': {
                this.bones.hips.position.y = 1.25 + jumpY * 0.55;
                this.bones.leftLeg.rotation.x = 0.8;
                this.bones.rightLeg.rotation.x = -0.8;
                this.bones.leftArm.rotation.z = -1.6;
                this.bones.rightArm.rotation.z = 1.6;
                break;
            }
            case 'anim_style_assassin_stealth': {
                this.bones.hips.position.y = 1.2 + jumpY * 0.58;
                this.bones.leftLeg.rotation.x = -1.0;
                this.bones.rightLeg.rotation.x = -0.8;
                this.bones.leftArm.rotation.x = 1.2;
                this.bones.rightArm.rotation.x = 1.2;
                break;
            }
            case 'anim_style_default':
            default: {
                this.bones.hips.position.y = 1.25 + jumpY * 0.4;
                this.bones.leftLeg.rotation.x = -0.4;
                this.bones.rightLeg.rotation.x = -0.4;
                this.bones.leftArm.rotation.z = -1.5;
                this.bones.rightArm.rotation.z = 1.5;
                break;
            }
        }
    }

    public updateAnimation(time: number, emote: string = 'idle') {
        this.resetBonesToRestPose();
        const style = this.movementStyle || 'anim_style_default';

        if (emote === 'idle') {
            this.animateIdle(time, style);
        } else if (emote === 'walk' || emote === 'run') {
            this.animateLocomotion(time, emote === 'run', style);
        } else if (emote === 'jump') {
            this.animateJump(time, style);
        } else if (emote === 'wave') {
            // Friendly hand wave
            this.bones.rightArm.rotation.z = 2.4 + Math.sin(time * 8) * 0.35;
            this.bones.rightArm.rotation.x = 0.2;
            this.bones.leftArm.rotation.z = -0.15;
            this.bones.head.rotation.y = -0.2;
        } else if (emote === 'dance') {
            // Fun 360 rhythmic dance groove
            const sway = Math.sin(time * 6);
            this.bones.hips.rotation.y = sway * 0.3;
            this.bones.hips.position.y = 1.25 + Math.abs(Math.cos(time * 6)) * 0.08;
            this.bones.leftArm.rotation.z = -1.2 + sway * 0.4;
            this.bones.rightArm.rotation.z = 1.2 - sway * 0.4;
            this.bones.leftLeg.rotation.x = -sway * 0.3;
            this.bones.rightLeg.rotation.x = sway * 0.3;
        } else if (emote === 'salute') {
            // Military salute
            this.bones.rightArm.rotation.z = 2.1;
            this.bones.rightArm.rotation.x = 0.55;
            this.bones.leftArm.rotation.z = -0.15;
            this.bones.leftArm.rotation.x = 0;
            this.bones.chest.rotation.x = -0.08;
            this.bones.head.rotation.set(0, 0, 0);
            this.bones.leftLeg.rotation.x = 0;
            this.bones.rightLeg.rotation.x = 0;
        } else if (emote === 'backflip') {
            // Acrobatic Ninja Backflip
            const spin = (time * 4) % (Math.PI * 2);
            this.bones.hips.rotation.x = -spin;
            this.bones.hips.position.y = 1.25 + Math.sin(spin * 0.5) * 0.5;
            this.bones.leftArm.rotation.z = -1.2;
            this.bones.rightArm.rotation.z = 1.2;
            this.bones.leftLeg.rotation.x = -0.4;
            this.bones.rightLeg.rotation.x = -0.4;
        } else if (emote === 'breakdance') {
            // Rhythmic Windmill Breakdance Groove
            const sway = Math.sin(time * 6);
            this.bones.hips.position.y = 1.15 + Math.abs(Math.sin(time * 6)) * 0.15;
            this.bones.hips.rotation.y = time * 5;
            this.bones.leftLeg.rotation.x = Math.sin(time * 5) * 0.6;
            this.bones.rightLeg.rotation.x = -Math.sin(time * 5) * 0.6;
            this.bones.leftLeg.rotation.z = 0.25;
            this.bones.rightLeg.rotation.z = -0.25;
            this.bones.leftArm.rotation.z = -1.2 + sway * 0.3;
            this.bones.rightArm.rotation.z = 1.2 - sway * 0.3;
        } else if (emote === 'laugh') {
            // Triumphant hearty laughter
            const chuck = Math.sin(time * 12) * 0.05;
            this.bones.chest.position.y = 0.45 + chuck;
            this.bones.head.rotation.x = -0.28 + chuck * 0.8;
            this.bones.leftArm.rotation.z = -0.55;
            this.bones.rightArm.rotation.z = 0.55;
            this.bones.leftArm.rotation.x = 0.4;
            this.bones.rightArm.rotation.x = 0.4;
        } else if (emote === 'flex') {
            // Bodybuilder Muscle Flex
            const flexPulse = Math.sin(time * 4) * 0.1;
            this.bones.leftArm.rotation.z = -1.7 + flexPulse;
            this.bones.rightArm.rotation.z = 1.7 - flexPulse;
            this.bones.leftArm.rotation.x = -0.5;
            this.bones.rightArm.rotation.x = -0.5;
            this.bones.chest.rotation.x = -0.12;
            this.bones.hips.position.y = 1.25;
            this.bones.leftLeg.rotation.z = -0.15;
            this.bones.rightLeg.rotation.z = 0.15;
        } else if (emote === 'levitate') {
            // Mystic Zen Lotus Pose Levitation
            const floatY = Math.sin(time * 2.5) * 0.15;
            this.bones.hips.position.y = 1.45 + floatY;
            this.bones.leftLeg.rotation.x = -0.6;
            this.bones.rightLeg.rotation.x = -0.6;
            this.bones.leftLeg.rotation.z = 0.45;
            this.bones.rightLeg.rotation.z = -0.45;
            this.bones.leftArm.rotation.z = -0.7;
            this.bones.rightArm.rotation.z = 0.7;
            this.bones.leftArm.rotation.x = 0.3;
            this.bones.rightArm.rotation.x = 0.3;
            this.bones.head.rotation.x = -0.05;
        } else if (emote === 'zombie') {
            // Spooky Zombie Walk Emote
            const sway = Math.sin(time * 2.5);
            this.bones.leftArm.rotation.x = -1.55;
            this.bones.rightArm.rotation.x = -1.55;
            this.bones.leftArm.rotation.z = -0.1 + sway * 0.05;
            this.bones.rightArm.rotation.z = 0.1 + sway * 0.05;
            this.bones.head.rotation.z = sway * 0.15;
            this.bones.head.rotation.y = sway * 0.1;
            this.bones.leftLeg.rotation.x = sway * 0.35;
            this.bones.rightLeg.rotation.x = -sway * 0.35;
        } else if (emote === 'guitar') {
            // Air Guitar Shred Solo
            this.bones.leftArm.rotation.z = -1.4;
            this.bones.leftArm.rotation.x = 0.6;
            this.bones.rightArm.rotation.z = 0.8 + Math.sin(time * 14) * 0.35;
            this.bones.rightArm.rotation.x = -0.2;
            this.bones.head.rotation.x = Math.sin(time * 7) * 0.15;
            this.bones.hips.position.y = 1.15;
            this.bones.leftLeg.rotation.x = 0.3;
            this.bones.rightLeg.rotation.x = -0.4;
        } else if (emote === 'dab') {
            this.bones.head.rotation.x = 0.4;
            this.bones.head.rotation.y = 0.4;
            this.bones.leftArm.rotation.z = -1.6;
            this.bones.leftArm.rotation.x = -0.4;
            this.bones.rightArm.rotation.z = 1.3;
            this.bones.rightArm.rotation.x = 0.3;
            this.bones.leftLeg.rotation.x = -0.2;
            this.bones.rightLeg.rotation.x = 0.2;
        } else if (emote === 'moonwalk') {
            const step = Math.sin(time * 6);
            this.bones.hips.position.z = Math.sin(time * 3) * 0.15;
            this.bones.leftLeg.rotation.x = step * 0.4;
            this.bones.rightLeg.rotation.x = -step * 0.4;
            this.bones.leftArm.rotation.x = -0.2;
            this.bones.rightArm.rotation.x = 0.4;
            this.bones.head.rotation.x = 0.2;
        } else if (emote === 'tpose') {
            this.bones.leftArm.rotation.set(0, 0, -Math.PI / 2);
            this.bones.rightArm.rotation.set(0, 0, Math.PI / 2);
            this.bones.head.rotation.set(0, 0, 0);
            this.bones.leftLeg.rotation.set(0, 0, 0);
            this.bones.rightLeg.rotation.set(0, 0, 0);
            this.bones.hips.position.y = 1.35 + Math.sin(time * 2) * 0.08;
        } else if (emote === 'robot_dance') {
            const pop = (Math.floor(time * 5) % 2 === 0) ? 0.2 : -0.2;
            this.bones.leftArm.rotation.z = -1.57 + pop;
            this.bones.rightArm.rotation.x = -1.57 - pop;
            this.bones.head.rotation.y = (Math.floor(time * 2.5) % 2) * 0.4 - 0.2;
        } else if (emote === 'kungfu') {
            this.bones.leftLeg.rotation.x = -0.8;
            this.bones.leftLeg.rotation.z = 0.3;
            this.bones.rightLeg.rotation.x = 0.1;
            this.bones.leftArm.rotation.z = -1.4;
            this.bones.rightArm.rotation.x = -1.2;
            this.bones.rightArm.rotation.z = 0.5;
            this.bones.chest.rotation.y = -0.4;
        } else if (emote === 'headspin') {
            const spin = time * 8;
            this.bones.hips.position.y = 0.85;
            this.bones.hips.rotation.y = spin;
            this.bones.head.position.y = 0.3;
            this.bones.leftLeg.rotation.z = 0.6;
            this.bones.rightLeg.rotation.z = -0.6;
            this.bones.leftArm.rotation.z = -1.2;
            this.bones.rightArm.rotation.z = 1.2;
        } else if (emote === 'cheer') {
            this.bones.leftArm.rotation.z = -2.6 + Math.sin(time * 7) * 0.25;
            this.bones.rightArm.rotation.z = 2.6 - Math.sin(time * 7) * 0.25;
            this.bones.head.rotation.x = -0.3;
            this.bones.hips.position.y = 1.25 + Math.abs(Math.sin(time * 7)) * 0.1;
        } else if (emote === 'bow') {
            this.bones.chest.rotation.x = 0.55;
            this.bones.head.rotation.x = 0.35;
            this.bones.rightArm.rotation.x = -0.4;
            this.bones.rightArm.rotation.z = 0.3;
            this.bones.leftArm.rotation.x = 0.2;
            this.bones.leftArm.rotation.z = -0.2;
        } else if (emote === 'matrix_dodge') {
            this.bones.hips.position.y = 1.05;
            this.bones.chest.rotation.x = -0.75;
            this.bones.head.rotation.x = -0.4;
            this.bones.leftLeg.rotation.x = -0.45;
            this.bones.rightLeg.rotation.x = -0.45;
            this.bones.leftArm.rotation.z = -1.1;
            this.bones.rightArm.rotation.z = 1.1;
        } else if (emote === 'hype_clap') {
            const clap = Math.sin(time * 14) * 0.25;
            this.bones.leftArm.rotation.z = -1.8 + clap;
            this.bones.rightArm.rotation.z = 1.8 - clap;
            this.bones.leftArm.rotation.x = -0.6;
            this.bones.rightArm.rotation.x = -0.6;
            this.bones.head.rotation.x = -0.15;
        } else if (emote === 'slow_clap') {
            const clap = Math.sin(time * 4) * 0.2;
            this.bones.leftArm.rotation.z = -0.8 + clap;
            this.bones.rightArm.rotation.z = 0.8 - clap;
            this.bones.leftArm.rotation.x = -0.5;
            this.bones.rightArm.rotation.x = -0.5;
        } else if (emote === 'ground_slam') {
            this.bones.hips.position.y = 0.95;
            this.bones.chest.rotation.x = 0.45;
            this.bones.head.rotation.x = -0.25;
            this.bones.rightArm.rotation.x = -1.2;
            this.bones.rightArm.rotation.z = 0.2;
            this.bones.leftArm.rotation.x = 0.6;
            this.bones.leftArm.rotation.z = -0.5;
            this.bones.leftLeg.rotation.x = -0.7;
            this.bones.rightLeg.rotation.x = 0.5;
        }
    }
}
