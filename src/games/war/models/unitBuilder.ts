import * as THREE from 'three';
import { CombatUnit, Team } from '../types';
import { avatarService } from '../../../shared/avatar/AvatarService';
import { getItemById } from '../../../shared/avatar/catalog';

export class UnitBuilder {
    private scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public updateNameTag(canvas: HTMLCanvasElement, name: string, team: Team, hp: number, maxHp: number): void {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
        ctx.beginPath();
        ctx.roundRect(8, 4, 240, 56, 10);
        ctx.fill();

        ctx.lineWidth = 3;
        ctx.strokeStyle = team === 'red' ? '#ff4757' : '#00f2fe';
        ctx.stroke();

        ctx.font = 'bold 20px "Segoe UI", sans-serif';
        ctx.fillStyle = team === 'red' ? '#ff6b81' : '#70a1ff';
        ctx.textAlign = 'center';
        ctx.fillText(name.length > 20 ? name.substring(0, 20) + '..' : name, 128, 30);

        const barW = 210;
        const barH = 8;
        const barX = 23;
        const barY = 40;

        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(barX, barY, barW, barH);

        const pct = Math.max(0, hp / maxHp);
        ctx.fillStyle = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#ffd32a' : '#ff4757';
        ctx.fillRect(barX, barY, barW * pct, barH);
    }

    public createTank(
        id: string,
        name: string,
        team: Team,
        isLocal: boolean,
        isBot: boolean,
        pos: THREE.Vector3,
        rot: number
    ): CombatUnit {
        const root = new THREE.Group();
        root.position.copy(pos);
        root.rotation.y = rot;

        const isRed = team === 'red';
        const hullColor = isRed ? 0x991b1b : 0x1d4ed8;
        const accentColor = isRed ? 0xff4757 : 0x00f2fe;

        const hullMat = new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.65, metalness: 0.35 });
        const hull = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.5, 6.6), hullMat);
        hull.position.y = 1.3;
        hull.castShadow = true;
        root.add(hull);

        const treadMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
        const lt = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 7.2), treadMat);
        lt.position.set(-2.5, 0.7, 0);
        root.add(lt);

        const rt = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 7.2), treadMat);
        rt.position.set(2.5, 0.7, 0);
        root.add(rt);

        const turret = new THREE.Group();
        turret.position.set(0, 2.2, 0);

        const turretDome = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.2, 3.8), hullMat);
        turretDome.position.set(0, 0.6, -0.4);
        turret.add(turretDome);

        const badgeMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.55, 0.55, 0.2, 16),
            new THREE.MeshStandardMaterial({ color: accentColor, metalness: 0.8 })
        );
        badgeMesh.position.set(0.6, 1.25, -0.5);
        turret.add(badgeMesh);

        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.8, roughness: 0.2 });
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 5.0, 16), barrelMat);
        barrel.rotation.x = -Math.PI / 2;
        barrel.position.set(0, 0.6, 2.8);
        turret.add(barrel);

        root.add(turret);

        const nameCanvas = document.createElement('canvas');
        nameCanvas.width = 256;
        nameCanvas.height = 64;
        const nameTexture = new THREE.CanvasTexture(nameCanvas);
        const nameMat = new THREE.SpriteMaterial({ map: nameTexture, depthTest: false });
        const nameTagSprite = new THREE.Sprite(nameMat);
        nameTagSprite.scale.set(6.0, 1.5, 1);
        nameTagSprite.position.set(0, 4.8, 0);
        root.add(nameTagSprite);

        this.updateNameTag(nameCanvas, name, team, 100, 100);
        nameTexture.needsUpdate = true;

        this.scene.add(root);

        return {
            id,
            name,
            team,
            unitClass: 'tank',
            isLocalPlayer: isLocal,
            isBot,
            hp: 100,
            maxHp: 100,
            pos: pos.clone(),
            rotation: rot,
            turretAngle: 0,
            speed: 0,
            root,
            turret,
            barrel,
            nameTagSprite,
            nameTagCanvas: nameCanvas,
            reloadTimer: Math.random() * 2,
            respawnTimer: 0,
            isDead: false
        };
    }

    public createSoldier(
        id: string,
        name: string,
        team: Team,
        isLocal: boolean,
        isBot: boolean,
        pos: THREE.Vector3,
        rot: number
    ): CombatUnit {
        const root = new THREE.Group();
        root.position.copy(pos);
        root.rotation.y = rot;

        const isRed = team === 'red';
        const teamColor = isRed ? 0xef4444 : 0x38bdf8;
        const avatarCfg = isLocal ? avatarService.getConfig() : null;

        const suitColor =
            isLocal && avatarCfg?.topId
                ? getItemById(avatarCfg.topId)?.defaultColor || (isRed ? 0x7f1d1d : 0x1e3a8a)
                : isRed
                    ? 0x7f1d1d
                    : 0x1e3a8a;
        const gearColor = teamColor;

        const torsoMat = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.7 });
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.5), torsoMat);
        torso.position.y = 1.35;
        torso.castShadow = true;
        root.add(torso);

        const vestMat = new THREE.MeshStandardMaterial({ color: gearColor, roughness: 0.6 });
        const vest = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.7, 0.55), vestMat);
        vest.position.y = 1.4;
        root.add(vest);

        const headColor = isLocal && avatarCfg?.skinColor ? avatarCfg.skinColor : 0xe0ac69;
        const headMat = new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.55 });
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), headMat);
        head.position.y = 2.15;
        root.add(head);

        if (isLocal && avatarCfg?.faceId) {
            const fId = avatarCfg.faceId;
            if (
                fId === 'face_cool_shades' ||
                fId.includes('shades') ||
                fId.includes('sunglasses') ||
                fId.includes('retro_round') ||
                fId.includes('matrix')
            ) {
                const frameMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.96, roughness: 0.12 });
                const lensMat = new THREE.MeshStandardMaterial({
                    color: 0x07111c,
                    metalness: 0.35,
                    roughness: 0.03,
                    transparent: true,
                    opacity: 0.84
                });
                const browBar = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.32, 10), frameMat);
                browBar.rotation.z = Math.PI * 0.5;
                browBar.position.set(0, 2.22, 0.32);
                root.add(browBar);
                [-1, 1].forEach(side => {
                    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 8, 20), frameMat);
                    rim.scale.set(1.08, 1.25, 0.5);
                    rim.position.set(side * 0.13, 2.16, 0.32);
                    root.add(rim);
                    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.008, 16), lensMat);
                    lens.rotation.x = Math.PI * 0.5;
                    lens.scale.set(1.06, 0.5, 1.22);
                    lens.position.set(side * 0.13, 2.16, 0.32);
                    root.add(lens);
                });
            } else if (fId === 'face_cyborg_visor') {
                const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
                visor.position.set(0, 2.16, 0.3);
                root.add(visor);
            } else if (fId === 'face_ninja_mask') {
                const mask = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.18), new THREE.MeshStandardMaterial({ color: 0x111111 }));
                mask.position.set(0, 2.02, 0.26);
                root.add(mask);
            } else if (fId === 'face_steampunk_goggles') {
                [-1, 1].forEach(side => {
                    const cup = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.08, 0.075, 0.06, 16),
                        new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9 })
                    );
                    cup.rotation.x = Math.PI * 0.5;
                    cup.position.set(side * 0.13, 2.16, 0.32);
                    root.add(cup);
                });
            }
        }

        const hatId = isLocal && avatarCfg?.hatId ? avatarCfg.hatId : 'helmet';
        if (hatId === 'hat_royal_crown') {
            const crownMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.15 });
            const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 16, 1, true), crownMat);
            crown.position.y = 2.4;
            root.add(crown);
        } else if (hatId === 'hat_viking_helm') {
            const vHelm = new THREE.Mesh(
                new THREE.SphereGeometry(0.36, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2),
                new THREE.MeshStandardMaterial({ color: 0x747d8c })
            );
            vHelm.position.y = 2.25;
            root.add(vHelm);
            [-1, 1].forEach(side => {
                const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 6), new THREE.MeshStandardMaterial({ color: 0xffffff }));
                horn.position.set(side * 0.35, 2.4, 0);
                horn.rotation.z = -side * 0.6;
                root.add(horn);
            });
        } else {
            const helmetMat = new THREE.MeshStandardMaterial({ color: gearColor });
            const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), helmetMat);
            helmet.position.y = 2.25;
            root.add(helmet);
        }

        if (isLocal && avatarCfg?.backId) {
            const backId = avatarCfg.backId;
            if (backId.includes('wings')) {
                const wingColor = backId.includes('golden') ? 0xffd700 : backId.includes('demon') ? 0x9b59b6 : 0x00f2fe;
                const wingMat = new THREE.MeshBasicMaterial({ color: wingColor });
                [-1, 1].forEach(side => {
                    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.04), wingMat);
                    wing.position.set(side * 0.6, 1.65, -0.32);
                    wing.rotation.z = side * 0.3;
                    root.add(wing);
                });
            } else if (backId === 'back_ninja_katana') {
                [-0.35, 0.35].forEach(rot => {
                    const scabbard = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.1, 0.07), new THREE.MeshStandardMaterial({ color: 0x111111 }));
                    scabbard.rotation.z = rot;
                    scabbard.position.set(0, 1.6, -0.32);
                    root.add(scabbard);
                });
            }
        }

        const pantsColor =
            isLocal && avatarCfg?.pantsId ? getItemById(avatarCfg.pantsId)?.defaultColor || 0x1f2937 : 0x1f2937;
        const legMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.7 });
        const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), legMat);
        leftLeg.position.set(-0.25, 0.45, 0);
        root.add(leftLeg);

        const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), legMat);
        rightLeg.position.set(0.25, 0.45, 0);
        root.add(rightLeg);

        const rifleMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8 });
        const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 1.4), rifleMat);
        rifle.position.set(0.3, 1.3, 0.7);
        rifle.rotation.x = Math.PI / 10;
        root.add(rifle);

        const nameCanvas = document.createElement('canvas');
        nameCanvas.width = 256;
        nameCanvas.height = 64;
        const nameTexture = new THREE.CanvasTexture(nameCanvas);
        const nameMat = new THREE.SpriteMaterial({ map: nameTexture, depthTest: false });
        const nameTagSprite = new THREE.Sprite(nameMat);
        nameTagSprite.scale.set(4.8, 1.2, 1);
        nameTagSprite.position.set(0, 3.4, 0);
        root.add(nameTagSprite);

        this.updateNameTag(nameCanvas, name, team, 50, 50);
        nameTexture.needsUpdate = true;

        this.scene.add(root);

        return {
            id,
            name,
            team,
            unitClass: 'soldier',
            isLocalPlayer: isLocal,
            isBot,
            hp: 50,
            maxHp: 50,
            pos: pos.clone(),
            rotation: rot,
            speed: 0,
            root,
            leftLeg,
            rightLeg,
            nameTagSprite,
            nameTagCanvas: nameCanvas,
            reloadTimer: Math.random() * 1.5,
            secondaryReloadTimer: 0,
            respawnTimer: 0,
            isDead: false,
            walkCycle: Math.random() * Math.PI * 2
        };
    }

    public createPlane(
        id: string,
        name: string,
        team: Team,
        isLocal: boolean,
        isBot: boolean,
        pos: THREE.Vector3,
        rot: number
    ): CombatUnit {
        const root = new THREE.Group();
        const spawnPos = pos.clone();
        spawnPos.y = 14.0;
        root.position.copy(spawnPos);
        root.rotation.y = rot;

        const isRed = team === 'red';
        const bodyColor = isRed ? 0x991b1b : 0x1e3a8a;
        const accentColor = isRed ? 0xff4757 : 0x00f2fe;

        const fuselageMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.4, metalness: 0.6 });

        const fuselage = new THREE.Mesh(new THREE.ConeGeometry(1.4, 9.0, 16), fuselageMat);
        fuselage.rotation.x = Math.PI / 2;
        fuselage.castShadow = true;
        root.add(fuselage);

        const canopyMat = new THREE.MeshStandardMaterial({
            color: 0x00f2fe,
            roughness: 0.1,
            metalness: 0.9,
            transparent: true,
            opacity: 0.75
        });
        const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 12), canopyMat);
        canopy.scale.set(0.9, 0.7, 2.2);
        canopy.position.set(0, 0.7, 0.6);
        root.add(canopy);

        const wingMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.5, metalness: 0.5 });
        const wings = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.22, 3.8), wingMat);
        wings.position.set(0, 0, -0.6);
        wings.castShadow = true;
        root.add(wings);

        const wingAccentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.3, metalness: 0.7 });
        const leftWingTip = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 3.0), wingAccentMat);
        leftWingTip.position.set(-5.3, 0, -0.6);
        root.add(leftWingTip);

        const rightWingTip = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 3.0), wingAccentMat);
        rightWingTip.position.set(5.3, 0, -0.6);
        root.add(rightWingTip);

        const gunMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.2 });
        const leftGun = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 12), gunMat);
        leftGun.rotation.x = -Math.PI / 2;
        leftGun.position.set(-2.6, -0.25, 1.0);
        root.add(leftGun);

        const rightGun = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 12), gunMat);
        rightGun.rotation.x = -Math.PI / 2;
        rightGun.position.set(2.6, -0.25, 1.0);
        root.add(rightGun);

        const finMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.4, metalness: 0.6 });
        const leftFin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.8, 2.0), finMat);
        leftFin.position.set(-1.1, 1.0, -3.2);
        leftFin.rotation.z = -0.22;
        root.add(leftFin);

        const rightFin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.8, 2.0), finMat);
        rightFin.position.set(1.1, 1.0, -3.2);
        rightFin.rotation.z = 0.22;
        root.add(rightFin);

        const exhaustMat = new THREE.MeshBasicMaterial({ color: isRed ? 0xff4757 : 0x00f2fe });
        const leftExhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.8, 12), exhaustMat);
        leftExhaust.rotation.x = Math.PI / 2;
        leftExhaust.position.set(-0.65, 0, -4.2);
        root.add(leftExhaust);

        const rightExhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.8, 12), exhaustMat);
        rightExhaust.rotation.x = Math.PI / 2;
        rightExhaust.position.set(0.65, 0, -4.2);
        root.add(rightExhaust);

        const nameCanvas = document.createElement('canvas');
        nameCanvas.width = 256;
        nameCanvas.height = 64;
        const nameTexture = new THREE.CanvasTexture(nameCanvas);
        const nameMat = new THREE.SpriteMaterial({ map: nameTexture, depthTest: false });
        const nameTagSprite = new THREE.Sprite(nameMat);
        nameTagSprite.scale.set(6.0, 1.5, 1);
        nameTagSprite.position.set(0, 3.8, 0);
        root.add(nameTagSprite);

        this.updateNameTag(nameCanvas, name, team, 150, 150);
        nameTexture.needsUpdate = true;

        this.scene.add(root);

        return {
            id,
            name,
            team,
            unitClass: 'plane',
            isLocalPlayer: isLocal,
            isBot,
            hp: 150,
            maxHp: 150,
            pos: spawnPos.clone(),
            rotation: rot,
            speed: 28,
            root,
            nameTagSprite,
            nameTagCanvas: nameCanvas,
            reloadTimer: Math.random() * 1.5,
            secondaryReloadTimer: 0,
            respawnTimer: 0,
            isDead: false,
            bankAngle: 0
        };
    }
}
