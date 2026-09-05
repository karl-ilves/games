import * as THREE from 'three';
import { AvatarConfig } from './types';
import { DEFAULT_AVATAR_CONFIG } from './catalog';

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

    constructor(initialConfig: AvatarConfig = DEFAULT_AVATAR_CONFIG) {
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
        faceSocket.position.set(0, 0.05, 0.38);
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
        if (config.topId === 'top_hoodie_cyan') {
            this.materials.top.color.set(0x00f2fe);
        } else if (config.topId === 'top_leather_jacket') {
            this.materials.top.color.set(0x181b20);
        } else if (config.topId === 'top_tuxedo_gold') {
            this.materials.top.color.set(0x0d131a);
        } else if (config.topId === 'top_cyber_armor') {
            this.materials.top.color.set(0xff4757);
        }

        // 7. Pants Colors
        if (config.pantsId === 'pants_jeans_dark') {
            this.materials.pants.color.set(0x1e272e);
        } else if (config.pantsId === 'pants_cargo_tactical') {
            this.materials.pants.color.set(0x485460);
        } else if (config.pantsId === 'pants_mecha_plates') {
            this.materials.pants.color.set(0x2f3542);
        }

        // 8. Shoes
        if (config.shoesId === 'shoes_sneakers_white') {
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
        }
        this.attachToSocket('hair', hairGroup);
    }

    private renderFace(faceId: string) {
        const faceGroup = new THREE.Group();

        // Eyes & Pupils
        const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

        [-1, 1].forEach(side => {
            const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), eyeWhiteMat);
            eyeWhite.position.set(side * 0.15, 0.08, 0);
            faceGroup.add(eyeWhite);

            const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), pupilMat);
            pupil.position.set(side * 0.15, 0.08, 0.04);
            faceGroup.add(pupil);
        });

        // Smile mouth
        const mouthMat = new THREE.MeshBasicMaterial({ color: 0x2c3e50 });
        const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.02), mouthMat);
        mouth.position.set(0, -0.12, 0);
        faceGroup.add(mouth);

        if (faceId === 'face_cool_shades') {
            const glassMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.9 });
            const shades = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.15, 0.12), glassMat);
            shades.position.set(0, 0.08, 0.05);
            faceGroup.add(shades);
        } else if (faceId === 'face_cyborg_visor') {
            const neonMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
            const visor = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.15), neonMat);
            visor.position.set(0, 0.08, 0.05);
            faceGroup.add(visor);
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
        } else if (backId === 'back_cyber_wings') {
            const wingMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, wireframe: false });
            [-1, 1].forEach(side => {
                const wing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.04), wingMat);
                wing.position.set(side * 0.55, 0.2, 0);
                wing.rotation.z = side * 0.25;
                backGroup.add(wing);
            });
        }
        this.attachToSocket('back', backGroup);
    }

    public updateAnimation(time: number, emote: string = 'idle') {
        if (emote === 'idle') {
            // Natural breathing and subtle idle sway
            const breathe = Math.sin(time * 2.5) * 0.025;
            this.bones.chest.position.y = 0.45 + breathe;
            this.bones.chest.rotation.x = Math.sin(time * 1.5) * 0.02;
            this.bones.leftArm.rotation.z = -0.15 + Math.sin(time * 2) * 0.03;
            this.bones.rightArm.rotation.z = 0.15 - Math.sin(time * 2) * 0.03;
            this.bones.head.rotation.y = Math.sin(time * 0.8) * 0.08;
            this.bones.leftLeg.rotation.x = 0;
            this.bones.rightLeg.rotation.x = 0;
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
        } else if (emote === 'jump') {
            const jumpProgress = (time * 3) % Math.PI;
            this.bones.hips.position.y = 1.25 + Math.sin(jumpProgress) * 0.4;
            this.bones.leftLeg.rotation.x = -0.4;
            this.bones.rightLeg.rotation.x = -0.4;
            this.bones.leftArm.rotation.z = -1.5;
            this.bones.rightArm.rotation.z = 1.5;
        }
    }
}
