import * as THREE from 'three';
import { WEAPON_SKIN_CATALOG } from '../catalog';

export function createUltraRealisticKnife(skinId?: string, defaultSkinFallback?: string): THREE.Group {
    const group = new THREE.Group();
    const activeSkinId = skinId || defaultSkinFallback || 'knife_default';
    const skin = WEAPON_SKIN_CATALOG[activeSkinId] || WEAPON_SKIN_CATALOG['knife_default'];

    const bladeColor = skin.bladeColor ?? 0xe8ecf2;
    const handleColor = skin.handleColor ?? 0x181a1d;
    const emissiveColor = skin.emissive ?? 0x000000;

    const bladeMat = new THREE.MeshStandardMaterial({
        color: bladeColor,
        metalness: 0.96,
        roughness: 0.15,
        emissive: emissiveColor,
        emissiveIntensity: emissiveColor ? 0.75 : 0
    });
    const handleMat = new THREE.MeshStandardMaterial({
        color: handleColor,
        roughness: 0.65,
        metalness: 0.25,
        emissive: emissiveColor ? Math.floor(emissiveColor / 6) : 0
    });
    const metalAccMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.95, roughness: 0.2 });
    const goldAccMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.2 });

        if (activeSkinId === 'knife_rare' || activeSkinId === 'knife_inferno') {
            // --- 1. KARAMBIT (Curved Talon Blade with Finger Ring) ---
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.024, 8, 24), metalAccMat);
            ring.position.set(0, -0.62, 0);
            ring.rotation.x = Math.PI / 2;
            group.add(ring);

            const grip1 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.35, 12), handleMat);
            grip1.position.set(0, -0.42, 0);
            group.add(grip1);

            const grip2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.32, 12), handleMat);
            grip2.position.set(0, -0.15, 0.04);
            grip2.rotation.x = -Math.PI / 12;
            group.add(grip2);

            for (let i = 0; i < 3; i++) {
                const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 6, 16), metalAccMat);
                ridge.position.set(0, -0.45 + i * 0.12, 0.02);
                ridge.rotation.x = Math.PI / 2;
                group.add(ridge);
            }

            const bladeBase = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.45, 0.18), bladeMat);
            bladeBase.position.set(0, 0.18, 0.08);
            bladeBase.rotation.x = -Math.PI / 8;
            group.add(bladeBase);

            const bladeMid = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.42, 0.15), bladeMat);
            bladeMid.position.set(0, 0.48, 0.22);
            bladeMid.rotation.x = -Math.PI / 4;
            group.add(bladeMid);

            const bladeCurvedTip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.35, 4), bladeMat);
            bladeCurvedTip.position.set(0, 0.68, 0.38);
            bladeCurvedTip.rotation.x = -Math.PI / 2.5;
            bladeCurvedTip.rotation.y = Math.PI / 4;
            group.add(bladeCurvedTip);

            const webSpine = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.35, 0.03), new THREE.MeshBasicMaterial({ color: 0xff4757 }));
            webSpine.position.set(0, 0.28, 0.02);
            group.add(webSpine);

        } else if (activeSkinId === 'knife_legendary' || activeSkinId === 'knife_set_golden' || activeSkinId === 'knife_set_hellfire') {
            // --- 2. DRAGON KATANA (Long curved Katana with Tsuba Guard) ---
            const tsuka = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.65, 12), handleMat);
            tsuka.position.set(0, -0.32, 0);
            group.add(tsuka);

            for (let i = 0; i < 4; i++) {
                const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.04, 0.065), goldAccMat);
                wrap.position.set(0, -0.48 + i * 0.11, 0);
                wrap.rotation.y = Math.PI / 4;
                group.add(wrap);
            }

            const kashira = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, 0.08, 12), goldAccMat);
            kashira.position.set(0, -0.66, 0);
            group.add(kashira);

            const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 20), goldAccMat);
            tsuba.position.set(0, 0.02, 0);
            group.add(tsuba);

            const habaki = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.1), goldAccMat);
            habaki.position.set(0, 0.06, 0.01);
            group.add(habaki);

            const katanaBlade = new THREE.Mesh(new THREE.BoxGeometry(0.028, 1.4, 0.11), bladeMat);
            katanaBlade.position.set(0, 0.76, 0.03);
            katanaBlade.rotation.x = -0.04;
            group.add(katanaBlade);

            const kissaki = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 4), bladeMat);
            kissaki.position.set(0, 1.5, 0.06);
            kissaki.rotation.x = -0.15;
            kissaki.rotation.y = Math.PI / 4;
            group.add(kissaki);

            const hamon = new THREE.Mesh(new THREE.BoxGeometry(0.032, 1.3, 0.02), new THREE.MeshBasicMaterial({ color: 0xffd32a }));
            hamon.position.set(0, 0.76, 0.08);
            group.add(hamon);

        } else if (activeSkinId === 'knife_cosmic' || activeSkinId === 'knife_set_voidgalaxy' || activeSkinId === 'knife_vampire') {
            // --- 3. VOID CRESCENT SCYTHE ---
            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 12), handleMat);
            shaft.position.set(0, -0.25, 0);
            group.add(shaft);

            for (let i = 0; i < 3; i++) {
                const band = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.012, 6, 14), metalAccMat);
                band.position.set(0, -0.5 + i * 0.25, 0);
                band.rotation.x = Math.PI / 2;
                group.add(band);
            }

            const orbMat = new THREE.MeshStandardMaterial({ color: 0xff007f, emissive: 0xff007f, emissiveIntensity: 0.8 });
            const orb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 14), orbMat);
            orb.position.set(0, 0.22, 0);
            group.add(orb);

            const scytheBase = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.4), bladeMat);
            scytheBase.position.set(0, 0.26, 0.24);
            scytheBase.rotation.x = Math.PI / 3;
            group.add(scytheBase);

            const scytheCurved = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.35, 0.22), bladeMat);
            scytheCurved.position.set(0, 0.16, 0.48);
            scytheCurved.rotation.x = Math.PI / 1.6;
            group.add(scytheCurved);

            const scytheTip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4, 4), bladeMat);
            scytheTip.position.set(0, -0.05, 0.65);
            scytheTip.rotation.x = Math.PI / 1.1;
            scytheTip.rotation.y = Math.PI / 4;
            group.add(scytheTip);

            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 6), orbMat);
            spike.position.set(0, 0.34, 0);
            group.add(spike);

        } else if (activeSkinId === 'knife_og') {
            // --- 4. 8-BIT PIXEL BROADSWORD ---
            const pixelMat = new THREE.MeshStandardMaterial({ color: bladeColor, roughness: 0.2, metalness: 0.1, emissive: emissiveColor });
            const pixelGoldMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, roughness: 0.3 });
            const pixelHandleMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });

            for (let i = 0; i < 4; i++) {
                const hBlock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), pixelHandleMat);
                hBlock.position.set(0, -0.55 + i * 0.08, 0);
                group.add(hBlock);
            }

            for (let i = -2; i <= 2; i++) {
                const gBlock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), pixelGoldMat);
                gBlock.position.set(i * 0.08, -0.22, 0);
                group.add(gBlock);
            }

            for (let y = 0; y < 6; y++) {
                const bBlock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.04), pixelMat);
                bBlock.position.set(0, -0.08 + y * 0.15, 0);
                group.add(bBlock);
            }
            const tipBlock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.04), pixelGoldMat);
            tipBlock.position.set(0, 0.88, 0);
            group.add(tipBlock);

        } else if (activeSkinId === 'knife_secret') {
            // --- 5. SPECTRAL SHADOW KRIS (Wavy Dagger) ---
            const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.55, 10), handleMat);
            hilt.position.set(0, -0.28, 0);
            group.add(hilt);

            const guardS = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.32), metalAccMat);
            guardS.position.set(0, 0.02, 0);
            group.add(guardS);

            for (let i = 0; i < 5; i++) {
                const wave = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.14), bladeMat);
                const offsetZ = (i % 2 === 0 ? 0.04 : -0.04);
                const rotX = (i % 2 === 0 ? 0.2 : -0.2);
                wave.position.set(0, 0.14 + i * 0.18, offsetZ);
                wave.rotation.x = rotX;
                group.add(wave);
            }

            const krisTip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 4), bladeMat);
            krisTip.position.set(0, 1.08, 0);
            krisTip.rotation.y = Math.PI / 4;
            group.add(krisTip);

            for (let i = 0; i < 3; i++) {
                const aura = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
                aura.position.set(0, 0.2 + i * 0.3, 0.08 * (i % 2 === 0 ? 1 : -1));
                group.add(aura);
            }

        } else if (activeSkinId === 'knife_epic') {
            // --- 6. CYBER NEON TANTO (Cybernetic Katana Tanto with Glowing Cyan Edge & Purple Wrap) ---
            const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.052, 0.55, 12), handleMat);
            hilt.position.set(0, -0.28, 0);
            group.add(hilt);

            for (let i = 0; i < 3; i++) {
                const ring = new THREE.Mesh(new THREE.TorusGeometry(0.054, 0.012, 6, 14), metalAccMat);
                ring.position.set(0, -0.42 + i * 0.14, 0);
                ring.rotation.x = Math.PI / 2;
                group.add(ring);
            }

            const guardT = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.28), metalAccMat);
            guardT.position.set(0, 0.02, 0);
            group.add(guardT);

            const bladeBase = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.85, 0.18), bladeMat);
            bladeBase.position.set(0, 0.46, 0.02);
            group.add(bladeBase);

            const neonEdge = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.82, 0.03), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
            neonEdge.position.set(0, 0.46, 0.11);
            group.add(neonEdge);

            const tantoTip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 4), bladeMat);
            tantoTip.position.set(0, 0.98, 0.03);
            tantoTip.rotation.y = Math.PI / 4;
            group.add(tantoTip);

        } else {
            // --- 7. DEFAULT / COMMON / UNCOMMON COMBAT BOWIE ---
            const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.65, 12), handleMat);
            handle.scale.set(0.65, 1.0, 1.2);
            handle.position.set(0, -0.32, 0);
            group.add(handle);

            const grooveMat = new THREE.MeshStandardMaterial({ color: 0x0f1012, roughness: 0.85 });
            for (let i = 0; i < 3; i++) {
                const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.015, 8, 16), grooveMat);
                ring.position.set(0, -0.18 - i * 0.12, 0);
                ring.rotation.x = Math.PI / 2;
                group.add(ring);
            }

            for (let i = 0; i < 3; i++) {
                const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 8), goldAccMat);
                pin.position.set(0, -0.18 - i * 0.12, 0);
                pin.rotation.z = Math.PI / 2;
                group.add(pin);
            }

            const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.12, 10), metalAccMat);
            pommel.position.set(0, -0.68, 0);
            group.add(pommel);

            const pommelTip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 8), metalAccMat);
            pommelTip.position.set(0, -0.76, 0);
            pommelTip.rotation.x = Math.PI;
            group.add(pommelTip);

            // Guard matches SVG: gold for default, green for uncommon, metal for common
            const guardMat = activeSkinId === 'knife_default' ? goldAccMat : (activeSkinId === 'knife_uncommon' ? new THREE.MeshStandardMaterial({ color: 0x2ed573, roughness: 0.3 }) : metalAccMat);
            const guard = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.38), guardMat);
            guard.position.set(0, 0.06, 0);
            group.add(guard);

            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.92, 0.2), bladeMat);
            blade.position.set(0, 0.54, 0.02);
            group.add(blade);

            const edge = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.9, 4), bladeMat);
            edge.position.set(0, 0.54, 0.12);
            edge.scale.set(1.0, 1.0, 3.8);
            group.add(edge);

            const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 4), bladeMat);
            tip.position.set(0, 1.1, 0.02);
            tip.rotation.y = Math.PI / 4;
            group.add(tip);

            const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.03), metalAccMat);
            fuller.position.set(0, 0.52, 0);
            group.add(fuller);

            for (let i = 0; i < 4; i++) {
                const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.04, 3), bladeMat);
                tooth.position.set(0, 0.2 + i * 0.06, -0.09);
                tooth.rotation.z = Math.PI / 2;
                group.add(tooth);
            }
        }

        group.scale.set(1.15, 1.15, 1.15);
        return group;
    }

export function createUltraRealisticRevolver(isGolden = false, skinId?: string, defaultSkinFallback?: string): THREE.Group {
    const group = new THREE.Group();
    const activeSkinId = skinId || defaultSkinFallback || 'gun_default';
    const skin = WEAPON_SKIN_CATALOG[activeSkinId] || WEAPON_SKIN_CATALOG['gun_default'];

    const metalColor = isGolden ? 0xffd700 : (skin.metalColor ?? 0x24282e);
    const gripColor = isGolden ? 0x2b1810 : (skin.gripColor ?? 0x4a2c17);
    const starColor = isGolden ? 0xffea00 : (skin.starColor ?? 0xffd700);
    const emissiveColor = isGolden ? 0x443300 : (skin.emissive ?? 0x05080c);

    const metalMat = new THREE.MeshStandardMaterial({
        color: metalColor,
        metalness: isGolden ? 0.98 : 0.94,
        roughness: isGolden ? 0.14 : 0.22,
        emissive: emissiveColor,
        emissiveIntensity: (isGolden || emissiveColor !== 0x05080c) ? 0.6 : 0.05
    });

    const polishedSteel = new THREE.MeshStandardMaterial({
        color: isGolden ? 0xffea70 : 0xd8dde3,
        metalness: 0.98,
        roughness: 0.12
    });

    const gripWoodMat = new THREE.MeshStandardMaterial({
        color: gripColor,
        roughness: 0.45,
        metalness: 0.1
    });

        if (activeSkinId === 'gun_cosmic') {
            // --- 1. COSMIC PULSAR RAYGUN (Futuristic Raygun with Plasma Chamber & Rings) ---
            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.24), gripWoodMat);
            grip.position.set(0, -0.22, -0.1);
            grip.rotation.x = -Math.PI / 6;
            group.add(grip);

            const sciFrame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.46), metalMat);
            sciFrame.position.set(0, 0.12, 0.05);
            group.add(sciFrame);

            const plasmaCoreMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
            const plasmaCore = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), plasmaCoreMat);
            plasmaCore.position.set(0, 0.12, 0.05);
            group.add(plasmaCore);

            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.85, 16), metalMat);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 0.18, 0.65);
            group.add(barrel);

            const ringMat = new THREE.MeshStandardMaterial({ color: 0x9b59b6, emissive: 0x9b59b6, emissiveIntensity: 0.8 });
            for (let i = 0; i < 3; i++) {
                const accRing = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 16), ringMat);
                accRing.position.set(0, 0.18, 0.45 + i * 0.18);
                group.add(accRing);
            }

            const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.14, 14), metalMat);
            muzzle.rotation.x = Math.PI / 2;
            muzzle.position.set(0, 0.18, 1.08);
            group.add(muzzle);

            const muzzleGlow = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), plasmaCoreMat);
            muzzleGlow.position.set(0, 0.18, 1.15);
            group.add(muzzleGlow);

            const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 14, Math.PI), metalMat);
            triggerGuard.position.set(0, -0.05, 0.08);
            triggerGuard.rotation.y = Math.PI / 2;
            triggerGuard.rotation.x = Math.PI;
            group.add(triggerGuard);

            const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.03), polishedSteel);
            trigger.position.set(0, -0.04, 0.08);
            group.add(trigger);

        } else if (activeSkinId === 'gun_secret') {
            // --- 2. GHOST PHANTOM SUPPRESSED PISTOL (Stealth Pistol with Silencer & Reflex Sight) ---
            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.54, 0.22), gripWoodMat);
            grip.position.set(0, -0.22, -0.08);
            grip.rotation.x = -Math.PI / 8;
            group.add(grip);

            const frame = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.52), metalMat);
            frame.position.set(0, 0.06, 0.08);
            group.add(frame);

            const slide = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.18, 0.65), metalMat);
            slide.position.set(0, 0.22, 0.14);
            group.add(slide);

            const suppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.55, 16), metalMat);
            suppressor.rotation.x = Math.PI / 2;
            suppressor.position.set(0, 0.22, 0.72);
            group.add(suppressor);

            const suppressorCap = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.04, 16), polishedSteel);
            suppressorCap.rotation.x = Math.PI / 2;
            suppressorCap.position.set(0, 0.22, 1.0);
            group.add(suppressorCap);

            const sightHood = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.18), metalMat);
            sightHood.position.set(0, 0.36, 0.02);
            group.add(sightHood);

            const reticleDot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
            reticleDot.position.set(0, 0.36, 0.02);
            group.add(reticleDot);

            const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 14, Math.PI), metalMat);
            triggerGuard.position.set(0, -0.05, 0.12);
            triggerGuard.rotation.y = Math.PI / 2;
            triggerGuard.rotation.x = Math.PI;
            group.add(triggerGuard);

            const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.03), polishedSteel);
            trigger.position.set(0, -0.04, 0.12);
            group.add(trigger);

        } else if (activeSkinId === 'gun_og') {
            // --- 3. 8-BIT RETRO ARCADE BLASTER ---
            const pixelMat = new THREE.MeshStandardMaterial({ color: metalColor, roughness: 0.3, metalness: 0.1 });
            const pixelGoldMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, roughness: 0.2 });
            const pixelGripMat = new THREE.MeshStandardMaterial({ color: 0xff9f43, roughness: 0.4 });

            for (let i = 0; i < 4; i++) {
                const gBlock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), pixelGripMat);
                gBlock.position.set(0, -0.42 + i * 0.11, -0.15 + i * 0.04);
                group.add(gBlock);
            }

            for (let x = 0; x < 3; x++) {
                const bBlock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.14), pixelMat);
                bBlock.position.set(0, 0.1, -0.05 + x * 0.14);
                group.add(bBlock);
            }

            for (let b = 0; b < 3; b++) {
                const barBlock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.15), pixelMat);
                barBlock.position.set(0, 0.14, 0.42 + b * 0.15);
                group.add(barBlock);

                const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.04), pixelGoldMat);
                fin.position.set(0, 0.23, 0.42 + b * 0.15);
                group.add(fin);
            }

            const pMuzzle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.08), pixelGoldMat);
            pMuzzle.position.set(0, 0.14, 0.88);
            group.add(pMuzzle);

        } else {
            // --- 4. STANDARD, GOLDEN, DAMASCUS & HEAVY REVOLVERS ---
            const isLongBarrel = activeSkinId === 'gun_legendary';
            const hasLaser = activeSkinId === 'gun_rare';
            const barrelLen = isLongBarrel ? 1.05 : 0.75;
            const barrelZ = isLongBarrel ? 0.76 : 0.62;

            // Frame
            const frame = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 0.52), metalMat);
            frame.position.set(0, 0.1, 0.05);
            group.add(frame);

            // Top Strap
            const topStrap = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.62), metalMat);
            topStrap.position.set(0, 0.27, 0.1);
            group.add(topStrap);

            // Cylinder
            const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.32, 16), metalMat);
            cylinder.rotation.x = Math.PI / 2;
            cylinder.position.set(0, 0.1, 0.05);
            group.add(cylinder);

            // Cylinder Flutes
            const fluteMat = new THREE.MeshStandardMaterial({
                color: isGolden ? 0xb8860b : 0x16181b,
                metalness: 0.9,
                roughness: 0.4
            });
            for (let i = 0; i < 6; i++) {
                const ang = (i / 6) * Math.PI * 2;
                const flute = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 8), fluteMat);
                flute.rotation.x = Math.PI / 2;
                flute.position.set(Math.cos(ang) * 0.12, 0.1 + Math.sin(ang) * 0.12, 0.05);
                group.add(flute);
            }

            // Cartridge rims
            const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.95, roughness: 0.2 });
            for (let i = 0; i < 6; i++) {
                const ang = (i / 6) * Math.PI * 2;
                const primer = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8), brassMat);
                primer.rotation.x = Math.PI / 2;
                primer.position.set(Math.cos(ang) * 0.08, 0.1 + Math.sin(ang) * 0.08, -0.11);
                group.add(primer);
            }

            // Barrel
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, barrelLen, 14), metalMat);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 0.19, barrelZ);
            group.add(barrel);

            // Muzzle Bore
            const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 12), new THREE.MeshBasicMaterial({ color: 0x050505 }));
            bore.rotation.x = Math.PI / 2;
            bore.position.set(0, 0.19, barrelZ + barrelLen / 2 + 0.02);
            group.add(bore);

            // Lug
            const lug = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, barrelLen * 0.9), metalMat);
            lug.position.set(0, 0.09, barrelZ);
            group.add(lug);

            // Front Sight
            const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.12), polishedSteel);
            frontSight.position.set(0, 0.29, barrelZ + barrelLen / 2 - 0.05);
            group.add(frontSight);

            // Hammer
            const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.1), polishedSteel);
            hammer.position.set(0, 0.24, -0.22);
            hammer.rotation.x = -Math.PI / 4;
            group.add(hammer);

            // Trigger Guard & Trigger
            const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 16, Math.PI), metalMat);
            triggerGuard.position.set(0, -0.06, 0.08);
            triggerGuard.rotation.y = Math.PI / 2;
            triggerGuard.rotation.x = Math.PI;
            group.add(triggerGuard);

            const trigger = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 8), polishedSteel);
            trigger.position.set(0, -0.05, 0.08);
            trigger.rotation.x = -Math.PI / 6;
            group.add(trigger);

            // Grip
            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, 0.28), gripWoodMat);
            grip.position.set(0, -0.24, -0.12);
            grip.rotation.x = -Math.PI / 8;
            group.add(grip);

            if (hasLaser) {
                const laserBox = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.35), metalMat);
                laserBox.position.set(0, -0.02, 0.5);
                group.add(laserBox);

                const laserLens = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00cec9 }));
                laserLens.position.set(0, -0.02, 0.68);
                group.add(laserLens);
            }

            // Sheriff Star Badge
            const starMat = new THREE.MeshStandardMaterial({ color: starColor, metalness: 0.98, roughness: 0.15 });
            const starL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 5), starMat);
            starL.rotation.z = Math.PI / 2;
            starL.position.set(-0.08, -0.2, -0.1);
            group.add(starL);

            const starR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 5), starMat);
            starR.rotation.z = Math.PI / 2;
            starR.position.set(0.08, -0.2, -0.1);
            group.add(starR);
        }

        group.scale.set(1.15, 1.15, 1.15);
        return group;
    }