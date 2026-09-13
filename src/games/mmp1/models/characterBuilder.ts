import * as THREE from 'three';
import { AvatarRig } from '../../../shared/avatar/AvatarRig';
import { avatarService } from '../../../shared/avatar/AvatarService';
import { getItemById } from '../../../shared/avatar/catalog';
import { createUltraRealisticKnife, createUltraRealisticRevolver } from './weaponBuilder';

export function createCharacterMesh(
    name: string,
    colorHex: number,
    isPlayer: boolean = false,
    crateManager?: { getInventory: () => { equippedKnife?: string; equippedGun?: string } | null }
): {
    group: THREE.Group;
    knife: THREE.Group;
    gun: THREE.Group;
    body: THREE.Mesh;
    head: THREE.Mesh;
    leftLeg: THREE.Group;
    rightLeg: THREE.Group;
    leftArm: THREE.Group;
    rightArm: THREE.Group;
    avatarRig?: AvatarRig;
} {
        if (isPlayer) {
            const avatarRig = new AvatarRig(avatarService.getConfig());
            avatarRig.rootGroup.name = 'MMP1_Player_AvatarRig';

            // Attach ultra-realistic knife and gun to right arm bone / hand (positioned firmly in palm, pointing forward)
            const knifeGroup = createUltraRealisticKnife(undefined, crateManager?.getInventory()?.equippedKnife);
            knifeGroup.position.set(0.04, -0.92, 0.08);
            knifeGroup.rotation.set(-Math.PI * 0.45, 0, -Math.PI / 16);
            knifeGroup.visible = false;
            avatarRig.bones.rightArm.add(knifeGroup);

            const gunGroup = createUltraRealisticRevolver(false, undefined, crateManager?.getInventory()?.equippedGun);
            gunGroup.position.set(0.02, -0.82, 0.12);
            gunGroup.rotation.set(0, 0, 0);
            gunGroup.visible = false;
            avatarRig.bones.rightArm.add(gunGroup);

            // Add player name tag above head
            const canvas = document.createElement('canvas');
            canvas.width = 300;
            canvas.height = 75;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = 'rgba(30, 20, 10, 0.88)';
                ctx.beginPath();
                ctx.roundRect(8, 8, 284, 59, 14);
                ctx.fill();
                ctx.strokeStyle = '#ffd32a';
                ctx.lineWidth = 3;
                ctx.stroke();

                ctx.fillStyle = '#ffd32a';
                ctx.font = 'bold 26px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(name, 150, 38);
            }
            const tex = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({ 
                map: tex, 
                depthTest: false, 
                depthWrite: false, 
                transparent: true 
            });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.renderOrder = 999;
            sprite.position.y = 4.4;
            sprite.scale.set(3.8, 0.95, 1);
            avatarRig.rootGroup.add(sprite);

            avatarService.subscribe(cfg => {
                avatarRig.applyConfig(cfg);
            });

            let bodyMesh: THREE.Mesh = new THREE.Mesh();
            let headMesh: THREE.Mesh = new THREE.Mesh();
            avatarRig.bones.torso.traverse(c => {
                if (!bodyMesh.geometry && (c as THREE.Mesh).isMesh) bodyMesh = c as THREE.Mesh;
            });
            avatarRig.bones.head.traverse(c => {
                if (!headMesh.geometry && (c as THREE.Mesh).isMesh) headMesh = c as THREE.Mesh;
            });

            return {
                group: avatarRig.rootGroup,
                knife: knifeGroup,
                gun: gunGroup,
                body: bodyMesh,
                head: headMesh,
                leftLeg: avatarRig.bones.leftLeg,
                rightLeg: avatarRig.bones.rightLeg,
                leftArm: avatarRig.bones.leftArm,
                rightArm: avatarRig.bones.rightArm,
                avatarRig
            };
        }

        const group = new THREE.Group();

        // 1. Natural Human Skin Tones (Uses customized AvatarConfig for player!)
        const avatarCfg = isPlayer ? avatarService.getConfig() : null;
        const skinPalette = [0xf5d0b5, 0xf0c8a6, 0xdfb190, 0xd49a6a, 0xb87333, 0x8d5524, 0xecd0b9, 0xc68652];
        const skinColor = (isPlayer && avatarCfg?.skinColor) ? avatarCfg.skinColor : skinPalette[Math.abs(colorHex) % skinPalette.length];
        const skinMat = new THREE.MeshStandardMaterial({
            color: skinColor,
            roughness: 0.55,
            metalness: 0.04
        });

        // 2. Stylish Tailored Suit / Detective Clothing Materials
        const jacketColor = (isPlayer && avatarCfg?.topId) 
            ? (getItemById(avatarCfg.topId)?.defaultColor || colorHex) 
            : colorHex;
        const jacketMat = new THREE.MeshStandardMaterial({
            color: jacketColor,
            roughness: 0.62,
            metalness: 0.12
        });
        const lapelMat = new THREE.MeshStandardMaterial({
            color: 0x181b20,
            roughness: 0.55,
            metalness: 0.18
        });
        const shirtMat = new THREE.MeshStandardMaterial({
            color: 0xf8f9fa,
            roughness: 0.75
        });
        const pantsColor = (isPlayer && avatarCfg?.pantsId)
            ? (getItemById(avatarCfg.pantsId)?.defaultColor || 0x22262a)
            : 0x22262a;
        const pantsMat = new THREE.MeshStandardMaterial({
            color: pantsColor,
            roughness: 0.7
        });
        const tieMat = new THREE.MeshStandardMaterial({
            color: isPlayer ? 0x990022 : (colorHex === 0xe74c3c ? 0x0f2042 : 0x8b0000),
            roughness: 0.35
        });
        const shoeColor = (isPlayer && avatarCfg?.shoesId)
            ? (getItemById(avatarCfg.shoesId)?.defaultColor || 0x141210)
            : 0x141210;
        const shoeMat = new THREE.MeshStandardMaterial({
            color: shoeColor,
            roughness: 0.25,
            metalness: 0.2
        });
        const goldBtnMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            metalness: 0.95,
            roughness: 0.2
        });

        // --- LEGS with Hip Pivots ---
        const legLGroup = new THREE.Group();
        legLGroup.position.set(-0.32, 1.35, 0);

        const thighL = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.17, 0.72, 14), pantsMat);
        thighL.position.set(0, -0.36, 0);
        thighL.castShadow = true;
        legLGroup.add(thighL);

        const calfL = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.65, 14), pantsMat);
        calfL.position.set(0, -0.92, 0);
        calfL.castShadow = true;
        legLGroup.add(calfL);

        // Oxford Dress Shoe Left
        const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.52), shoeMat);
        shoeL.position.set(0, -1.28, 0.08);
        shoeL.castShadow = true;
        legLGroup.add(shoeL);
        const shoeSoleL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.56), new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.9 }));
        shoeSoleL.position.set(0, -1.35, 0.08);
        legLGroup.add(shoeSoleL);
        group.add(legLGroup);

        const legRGroup = new THREE.Group();
        legRGroup.position.set(0.32, 1.35, 0);

        const thighR = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.17, 0.72, 14), pantsMat);
        thighR.position.set(0, -0.36, 0);
        thighR.castShadow = true;
        legRGroup.add(thighR);

        const calfR = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.65, 14), pantsMat);
        calfR.position.set(0, -0.92, 0);
        calfR.castShadow = true;
        legRGroup.add(calfR);

        // Oxford Dress Shoe Right
        const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.52), shoeMat);
        shoeR.position.set(0, -1.28, 0.08);
        shoeR.castShadow = true;
        legRGroup.add(shoeR);
        const shoeSoleR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.56), new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.9 }));
        shoeSoleR.position.set(0, -1.35, 0.08);
        legRGroup.add(shoeSoleR);
        group.add(legRGroup);

        // --- TORSO (Waist, Chest, Jacket, Collar, Tie) ---
        // Leather Belt & Metallic Buckle
        const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.14, 16), new THREE.MeshStandardMaterial({ color: 0x1f1915, roughness: 0.6 }));
        belt.position.set(0, 1.42, 0);
        group.add(belt);

        const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.08), goldBtnMat);
        buckle.position.set(0, 1.42, 0.54);
        group.add(buckle);

        // Abdomen
        const abdomen = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.56, 0.45, 16), jacketMat);
        abdomen.position.set(0, 1.68, 0);
        abdomen.scale.set(1.0, 1.0, 0.78);
        group.add(abdomen);

        // Main Torso / Upper Chest (bodyMesh)
        const bodyGeo = new THREE.CylinderGeometry(0.66, 0.54, 0.85, 16);
        const body = new THREE.Mesh(bodyGeo, jacketMat);
        body.position.set(0, 2.25, 0);
        body.scale.set(1.0, 1.0, 0.76);
        body.castShadow = true;
        group.add(body);

        // Inner White Shirt & Lapel V-opening
        const innerShirt = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.65, 0.06), shirtMat);
        innerShirt.position.set(0, 2.32, 0.38);
        group.add(innerShirt);

        // Silk Tie
        const tie = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.46, 0.05), tieMat);
        tie.position.set(0, 2.22, 0.42);
        group.add(tie);

        // Lapels Left & Right
        const lapelL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.58, 0.06), lapelMat);
        lapelL.position.set(-0.20, 2.34, 0.40);
        lapelL.rotation.z = -0.15;
        group.add(lapelL);

        const lapelR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.58, 0.06), lapelMat);
        lapelR.position.set(0.20, 2.34, 0.40);
        lapelR.rotation.z = 0.15;
        group.add(lapelR);

        // 3 Gold Buttons down front
        for (let i = 0; i < 3; i++) {
            const btn = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), goldBtnMat);
            btn.position.set(0, 1.62 + i * 0.22, 0.44);
            group.add(btn);
        }

        // --- NECK & HEAD ---
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.23, 0.42, 16), skinMat);
        neck.position.set(0, 2.74, 0);
        group.add(neck);

        // Cranium / Head (headMesh)
        const headGeo = new THREE.SphereGeometry(0.44, 24, 24);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.set(0, 3.12, 0);
        head.scale.set(0.92, 1.08, 0.98);
        head.castShadow = true;
        group.add(head);

        // Jaw & Chin
        const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.32, 0.42), skinMat);
        jaw.position.set(0, 2.92, 0.12);
        group.add(jaw);

        // Ears Left & Right
        const earGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.16, 10);
        const earL = new THREE.Mesh(earGeo, skinMat);
        earL.position.set(-0.43, 3.12, 0);
        earL.rotation.z = 0.15;
        group.add(earL);

        const earR = new THREE.Mesh(earGeo, skinMat);
        earR.position.set(0.43, 3.12, 0);
        earR.rotation.z = -0.15;
        group.add(earR);

        // 3D Sculpted Nose
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 4), skinMat);
        nose.position.set(0, 3.08, 0.46);
        nose.rotation.x = Math.PI / 2;
        group.add(nose);

        // Lips
        const lipMat = new THREE.MeshStandardMaterial({ color: 0xc87d7d, roughness: 0.55 });
        const lips = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.06), lipMat);
        lips.position.set(0, 2.92, 0.43);
        group.add(lips);

        // Eyes & Eyebrows
        const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf6f8fa });
        const irisColors = [0x634e34, 0x2e8b57, 0x3d2314, 0x1f3c88];
        const irisColor = isPlayer ? 0x2a52be : irisColors[Math.abs(colorHex) % irisColors.length];
        const irisMat = new THREE.MeshStandardMaterial({
            color: irisColor,
            roughness: 0.2
        });
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
        const browMat = new THREE.MeshStandardMaterial({ color: 0x221a14, roughness: 0.9 });

        // Left Eye
        const eyeWhiteL = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), eyeWhiteMat);
        eyeWhiteL.position.set(-0.18, 3.16, 0.38);
        group.add(eyeWhiteL);
        const irisL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12), irisMat);
        irisL.rotation.x = Math.PI / 2;
        irisL.position.set(-0.18, 3.16, 0.44);
        group.add(irisL);
        const pupilL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.025, 8), pupilMat);
        pupilL.rotation.x = Math.PI / 2;
        pupilL.position.set(-0.18, 3.16, 0.45);
        group.add(pupilL);
        // Left Eye Corneal Reflection Highlight
        const cornealHighlightL = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        cornealHighlightL.position.set(-0.17, 3.175, 0.465);
        group.add(cornealHighlightL);
        const browL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.06), browMat);
        browL.position.set(-0.18, 3.25, 0.42);
        browL.rotation.z = 0.08;
        group.add(browL);

        // Right Eye
        const eyeWhiteR = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), eyeWhiteMat);
        eyeWhiteR.position.set(0.18, 3.16, 0.38);
        group.add(eyeWhiteR);
        const irisR = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12), irisMat);
        irisR.rotation.x = Math.PI / 2;
        irisR.position.set(0.18, 3.16, 0.44);
        group.add(irisR);
        const pupilR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.025, 8), pupilMat);
        pupilR.rotation.x = Math.PI / 2;
        pupilR.position.set(0.18, 3.16, 0.45);
        group.add(pupilR);
        // Right Eye Corneal Reflection Highlight
        const cornealHighlightR = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        cornealHighlightR.position.set(0.19, 3.175, 0.465);
        group.add(cornealHighlightR);
        const browR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.06), browMat);
        browR.position.set(0.18, 3.25, 0.42);
        browR.rotation.z = -0.08;
        group.add(browR);

        // 3D Equipped Face Accessory for Player (Ultra-Realistic Sunglasses, Visor, Mask, Monocle, Goggles, etc.)
        if (isPlayer && avatarCfg?.faceId) {
            const fId = avatarCfg.faceId;
            if (fId === 'face_cool_shades' || fId.includes('shades') || fId.includes('sunglasses') || fId.includes('retro_round') || fId.includes('matrix')) {
                // Ultra-Realistic Aviator Sunglasses on Player Head
                const frameMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.96, roughness: 0.12 });
                const lensMat = new THREE.MeshStandardMaterial({ color: 0x07111c, metalness: 0.35, roughness: 0.03, transparent: true, opacity: 0.84 });
                const browBar = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.44, 12), frameMat);
                browBar.rotation.z = Math.PI * 0.5;
                browBar.position.set(0, 3.24, 0.47);
                group.add(browBar);
                [-1, 1].forEach(side => {
                    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.01, 8, 24), frameMat);
                    rim.scale.set(1.08, 1.25, 0.5);
                    rim.position.set(side * 0.18, 3.16, 0.47);
                    group.add(rim);
                    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.01, 20), lensMat);
                    lens.rotation.x = Math.PI * 0.5;
                    lens.scale.set(1.06, 0.5, 1.22);
                    lens.position.set(side * 0.18, 3.16, 0.47);
                    group.add(lens);
                    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.5, 8), frameMat);
                    arm.rotation.x = Math.PI * 0.5;
                    arm.position.set(side * 0.32, 3.18, 0.22);
                    group.add(arm);
                });
            } else if (fId === 'face_cyborg_visor') {
                const visor = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.16), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
                visor.position.set(0, 3.16, 0.46);
                group.add(visor);
            } else if (fId === 'face_ninja_mask') {
                const mask = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.32, 0.22), new THREE.MeshStandardMaterial({ color: 0x111111 }));
                mask.position.set(0, 2.95, 0.42);
                group.add(mask);
            } else if (fId === 'face_gold_monocle') {
                const monocle = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 8, 16), new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95 }));
                monocle.position.set(0.18, 3.16, 0.46);
                group.add(monocle);
            } else if (fId === 'face_steampunk_goggles') {
                [-1, 1].forEach(side => {
                    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9 }));
                    cup.rotation.x = Math.PI * 0.5;
                    cup.position.set(side * 0.18, 3.16, 0.48);
                    group.add(cup);
                });
            }
        }

        // --- HAIR & CROWN & ACCESSORIES ---
        const hairPalette = [0x1a1a1a, 0x3d2719, 0x5c4033, 0x8b5a2b, 0x2a1e17];
        const hairColor = (isPlayer && avatarCfg?.hairColor) ? avatarCfg.hairColor : (isPlayer ? 0x221812 : hairPalette[Math.abs(colorHex) % hairPalette.length]);
        const hairMat = new THREE.MeshStandardMaterial({
            color: hairColor,
            roughness: 0.85
        });
        const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
        hairTop.position.set(0, 3.24, -0.02);
        hairTop.scale.set(0.96, 1.05, 1.02);
        group.add(hairTop);

        const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.55, 0.28), hairMat);
        hairBack.position.set(0, 3.08, -0.32);
        group.add(hairBack);

        if (isPlayer) {
            // Masterpiece 3D Royal Crown (or custom equipped hat)
            const hatId = avatarCfg?.hatId || 'hat_royal_crown';
            if (hatId === 'hat_royal_crown') {
                const crownGold = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.98, roughness: 0.12 });
                const crownBand = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.15, 24, 1, true), crownGold);
                crownBand.position.set(0, 3.56, 0);
                group.add(crownBand);

                const velvetCap = new THREE.Mesh(new THREE.SphereGeometry(0.44, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: 0x800020, roughness: 0.85 }));
                velvetCap.position.set(0, 3.55, 0);
                group.add(velvetCap);

                const rubyMat = new THREE.MeshStandardMaterial({ color: 0xff1133, roughness: 0.1, metalness: 0.9 });
                const saphMat = new THREE.MeshStandardMaterial({ color: 0x1166ff, roughness: 0.1, metalness: 0.9 });
                for (let i = 0; i < 8; i++) {
                    const ang = (i / 8) * Math.PI * 2;
                    const peak = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 4), crownGold);
                    peak.position.set(Math.sin(ang) * 0.46, 3.72, Math.cos(ang) * 0.46);
                    group.add(peak);

                    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), i % 2 === 0 ? rubyMat : saphMat);
                    gem.position.set(Math.sin(ang) * 0.47, 3.56, Math.cos(ang) * 0.47);
                    group.add(gem);
                }
            } else if (hatId === 'hat_viking_helm') {
                const helmMat = new THREE.MeshStandardMaterial({ color: 0x747d8c, roughness: 0.5 });
                const helm = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), helmMat);
                helm.position.set(0, 3.42, 0);
                group.add(helm);
                [-1, 1].forEach(side => {
                    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 8), new THREE.MeshStandardMaterial({ color: 0xefefef }));
                    horn.position.set(side * 0.44, 3.62, 0);
                    horn.rotation.z = -side * 0.6;
                    group.add(horn);
                });
            } else if (hatId === 'hat_cap_snapback') {
                const capMat = new THREE.MeshStandardMaterial({ color: 0x2ed573, roughness: 0.6 });
                const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.47, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), capMat);
                capDome.position.set(0, 3.42, 0);
                group.add(capDome);
                const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 16, 1, false, 0, Math.PI), capMat);
                brim.position.set(0, 3.42, 0.22);
                group.add(brim);
            }

            // Back Accessory for player (Wings, Katanas, Jetpack)
            if (avatarCfg?.backId) {
                const backId = avatarCfg.backId;
                if (backId.includes('wings')) {
                    const wingColor = backId.includes('golden') ? 0xffd700 : (backId.includes('demon') ? 0x9b59b6 : 0x00f2fe);
                    const wingMat = new THREE.MeshBasicMaterial({ color: wingColor });
                    [-1, 1].forEach(side => {
                        const wing = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.55, 0.04), wingMat);
                        wing.position.set(side * 0.8, 2.3, -0.42);
                        wing.rotation.z = side * 0.35;
                        group.add(wing);
                    });
                } else if (backId === 'back_ninja_katana') {
                    [-0.35, 0.35].forEach(rot => {
                        const scabbard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.08), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 }));
                        scabbard.rotation.z = rot;
                        scabbard.position.set(0, 2.3, -0.42);
                        group.add(scabbard);
                    });
                }
            }
        }

        // --- ARMS (Shoulder Pivots) ---
        const armLGroup = new THREE.Group();
        armLGroup.position.set(-0.84, 2.55, 0);

        const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), jacketMat);
        armLGroup.add(shoulderL);
        const bicepL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.65, 14), jacketMat);
        bicepL.position.set(0, -0.38, 0);
        bicepL.castShadow = true;
        armLGroup.add(bicepL);
        const forearmL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.62, 14), jacketMat);
        forearmL.position.set(0, -0.85, 0);
        forearmL.castShadow = true;
        armLGroup.add(forearmL);
        // Shirt Cuff
        const cuffL = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 12), shirtMat);
        cuffL.position.set(0, -1.14, 0);
        armLGroup.add(cuffL);
        // Left Wristwatch (Luxury Gold/Chrome Chronograph)
        const watchBandMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 });
        const watchCaseMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.95, roughness: 0.15 });
        const watchDialMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1 });
        const watchBand = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 16), watchBandMat);
        watchBand.position.set(0, -1.19, 0);
        armLGroup.add(watchBand);
        const watchDial = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12), watchCaseMat);
        watchDial.position.set(-0.13, -1.19, 0);
        watchDial.rotation.z = Math.PI / 2;
        armLGroup.add(watchDial);
        const watchFace = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.025, 12), watchDialMat);
        watchFace.position.set(-0.135, -1.19, 0);
        watchFace.rotation.z = Math.PI / 2;
        armLGroup.add(watchFace);
        // Sculpted Hand
        const handL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.20), skinMat);
        handL.position.set(0, -1.26, 0.04);
        armLGroup.add(handL);
        group.add(armLGroup);

        const armRGroup = new THREE.Group();
        armRGroup.position.set(0.84, 2.55, 0);

        const shoulderR = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), jacketMat);
        armRGroup.add(shoulderR);
        const bicepR = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.65, 14), jacketMat);
        bicepR.position.set(0, -0.38, 0);
        bicepR.castShadow = true;
        armRGroup.add(bicepR);
        const forearmR = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.62, 14), jacketMat);
        forearmR.position.set(0, -0.85, 0);
        forearmR.castShadow = true;
        armRGroup.add(forearmR);
        // Shirt Cuff
        const cuffR = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 12), shirtMat);
        cuffR.position.set(0, -1.14, 0);
        armRGroup.add(cuffR);
        // Sculpted Hand
        const handR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.20), skinMat);
        handR.position.set(0, -1.26, 0.04);
        armRGroup.add(handR);

        // --- ULTRA-REALISTIC WEAPONS (Held in Right Hand firmly, pointing forward) ---
        const knifeGroup = createUltraRealisticKnife(undefined, crateManager?.getInventory()?.equippedKnife);
        knifeGroup.position.set(0.04, -1.26, 0.08);
        knifeGroup.rotation.set(-Math.PI * 0.45, 0, -Math.PI / 16);
        knifeGroup.visible = false;
        armRGroup.add(knifeGroup);

        const gunGroup = createUltraRealisticRevolver(false, undefined, crateManager?.getInventory()?.equippedGun);
        gunGroup.position.set(0.04, -1.16, 0.14);
        gunGroup.rotation.set(0, 0, 0);
        gunGroup.visible = false;
        armRGroup.add(gunGroup);

        group.add(armRGroup);

        // Large, sharp, prominent Name Tag Canvas Billboard
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 75;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = isPlayer ? 'rgba(30, 20, 10, 0.88)' : 'rgba(15, 10, 25, 0.88)';
            ctx.beginPath();
            ctx.roundRect(8, 8, 284, 59, 14);
            ctx.fill();
            ctx.strokeStyle = isPlayer ? '#ffd32a' : '#00f2fe';
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.fillStyle = isPlayer ? '#ffd32a' : '#ffffff';
            ctx.font = 'bold 26px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(name, 150, 38);
        }
        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ 
            map: tex, 
            depthTest: false, 
            depthWrite: false, 
            transparent: true 
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.renderOrder = 999;
        sprite.position.y = 4.4;
        sprite.scale.set(3.8, 0.95, 1);
        group.add(sprite);

        return {
            group,
            knife: knifeGroup,
            gun: gunGroup,
            body,
            head,
            leftLeg: legLGroup,
            rightLeg: legRGroup,
            leftArm: armLGroup,
            rightArm: armRGroup
        };
    }
