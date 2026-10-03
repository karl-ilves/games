import * as THREE from 'three';
import { MetroWorld } from '../world/metroWorld';
import { AIPassenger } from '../types';

export class MetroEntities extends MetroWorld {
    private populatePassengers(carGroup: THREE.Group, carIndex: number, theme: CarriageData['theme'], passengers: AIPassenger[]) {
        let count = 0;
        if (carIndex === 0) count = 6;
        else if (carIndex === 1) count = 4;
        else if (carIndex === 2) count = 3;
        else if (carIndex <= 8) count = Math.max(1, 4 - Math.floor(carIndex / 2));
        else if (carIndex >= 11) count = Math.random() < 0.35 ? 1 : 0;

        const seatPositions = [
            new THREE.Vector3(-1.22, 0.48, -6.2),
            new THREE.Vector3( 1.22, 0.48, -4.8),
            new THREE.Vector3(-1.22, 0.48, -3.2),
            new THREE.Vector3( 1.22, 0.48,  3.2),
            new THREE.Vector3(-1.22, 0.48,  4.8),
            new THREE.Vector3( 1.22, 0.48,  6.2)
        ];

        // Realistic skin tones
        const skinPalette = [0xf5cd79, 0xf7d794, 0xdfe6e9, 0xd1a374, 0x805533, 0xfad390, 0xaa7a53];
        // Eye iris colors
        const eyeColors = [0x2980b9, 0x833400, 0x27ae60, 0x3d271d, 0x16a085, 0x2c3e50];

        // Detailed Passenger Character Archetypes
        const archetypes = [
            {
                name: 'Business Commuter',
                top: 0x2c3e50, pants: 0x1e272e, inner: 0xffffff, tie: 0xc0392b,
                hair: 0x1e272e, hairType: 'side_part', coatStyle: 'suit', shoe: 0x111111,
                prop: 'newspaper', glasses: false, headphones: false
            },
            {
                name: 'Music Student',
                top: 0xe74c3c, pants: 0x2c3e50, inner: 0x2d3436,
                hair: 0x8b4513, hairType: 'fade', coatStyle: 'hoodie', shoe: 0xffffff,
                prop: 'phone', glasses: false, headphones: true
            },
            {
                name: 'Winter Commuter',
                top: 0x16a085, pants: 0x2f3640, inner: 0xdfe6e9,
                hair: 0xd63031, hairType: 'long', coatStyle: 'puffer', shoe: 0x636e72,
                prop: 'coffee', glasses: true, headphones: false
            },
            {
                name: 'Casual Traveler',
                top: 0xd35400, pants: 0x1b1464, inner: 0xffffff,
                hair: 0x2d3436, hairType: 'beanie', coatStyle: 'puffer', shoe: 0xffffff,
                prop: 'phone', glasses: false, headphones: false
            },
            {
                name: 'Office Worker',
                top: 0x8e44ad, pants: 0x34495e, inner: 0xf5f6fa,
                hair: 0x111111, hairType: 'ponytail', coatStyle: 'trench', shoe: 0x2d3436,
                prop: 'phone', glasses: false, headphones: false
            },
            {
                name: 'Urban Explorer',
                top: 0x27ae60, pants: 0x2c2c54, inner: 0x1e272e,
                hair: 0x57606f, hairType: 'fade', coatStyle: 'hoodie', shoe: 0xffffff,
                prop: 'newspaper', glasses: false, headphones: false
            }
        ];

        for (let i = 0; i < count; i++) {
            const seatPos = seatPositions[i % seatPositions.length];
            const arch = archetypes[i % archetypes.length];
            const skinColor = skinPalette[i % skinPalette.length];
            const irisColor = eyeColors[i % eyeColors.length];

            const pGroup = new THREE.Group();
            pGroup.position.copy(seatPos);

            // Realistic PBR materials
            const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6, metalness: 0.05 });
            const clothingTopMat = new THREE.MeshStandardMaterial({ color: arch.top, roughness: 0.7 });
            const clothingPantsMat = new THREE.MeshStandardMaterial({ color: arch.pants, roughness: 0.8 });
            const innerMat = new THREE.MeshStandardMaterial({ color: arch.inner, roughness: 0.85 });
            const hairMat = new THREE.MeshStandardMaterial({ color: arch.hair, roughness: 0.85 });
            const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.2 });
            const irisMat = new THREE.MeshStandardMaterial({ color: irisColor, roughness: 0.3 });
            const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
            const lipMat = new THREE.MeshStandardMaterial({ color: 0xd68172, roughness: 0.6 });
            const shoeSoleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
            const shoeUpperMat = new THREE.MeshStandardMaterial({ color: arch.shoe, roughness: 0.6 });

            // --- 1. Realistic Head & Face Anatomy ---
            const pHead = new THREE.Group();
            pHead.position.set(0, 0.78, 0);

            // Cranium & Jaw Structure
            const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 14), skinMat);
            cranium.scale.set(1.0, 1.15, 1.05);
            pHead.add(cranium);

            const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.11, 0.14), skinMat);
            jaw.position.set(0, -0.06, 0.03);
            pHead.add(jaw);

            // Neck with collar contour
            const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.072, 0.13, 10), skinMat);
            neck.position.set(0, -0.15, 0);
            pHead.add(neck);

            // 3D Realistic Eyes (Sclera + Iris + Pupil + Eyelids)
            [-0.048, 0.048].forEach(ex => {
                // Sclera (eyeball white)
                const eyeball = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), eyeWhiteMat);
                eyeball.position.set(ex, 0.02, 0.12);
                pHead.add(eyeball);

                // Colored Iris
                const iris = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), irisMat);
                iris.position.set(ex, 0.02, 0.135);
                pHead.add(iris);

                // Dark Pupil
                const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 6), pupilMat);
                pupil.position.set(ex, 0.02, 0.144);
                pHead.add(pupil);

                // Upper Eyelid crease
                const eyelid = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.008, 0.02), skinMat);
                eyelid.position.set(ex, 0.04, 0.132);
                pHead.add(eyelid);

                // Eyebrow matching hair color
                const eyebrow = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.012, 0.015), hairMat);
                eyebrow.rotation.z = (ex > 0 ? -1 : 1) * 0.08;
                eyebrow.position.set(ex, 0.058, 0.135);
                pHead.add(eyebrow);
            });

            // 3D Nose Bridge and Nostrils
            const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.055, 0.045), skinMat);
            noseBridge.rotation.x = -Math.PI / 16;
            noseBridge.position.set(0, -0.015, 0.148);
            pHead.add(noseBridge);

            // 3D Expressive Lips
            const lips = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.016, 0.022), lipMat);
            lips.position.set(0, -0.072, 0.13);
            pHead.add(lips);

            // 3D Realistic Ears
            [-0.142, 0.142].forEach(earX => {
                const ear = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.065, 0.04), skinMat);
                ear.position.set(earX, 0.01, -0.01);
                pHead.add(ear);
            });

            // --- 2. Realistic Hairstyles & Headwear ---
            if (arch.hairType === 'fade' || arch.hairType === 'short') {
                // Layered Textured Short Hair
                const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.152, 14, 12), hairMat);
                hairTop.position.set(0, 0.06, -0.01);
                hairTop.scale.set(1.02, 1.08, 1.05);
                pHead.add(hairTop);

                const bangs = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.045, 0.06), hairMat);
                bangs.position.set(0, 0.095, 0.115);
                pHead.add(bangs);
            } else if (arch.hairType === 'long') {
                // Long Cascading Wavy Hair
                const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.155, 14, 12), hairMat);
                hairTop.position.set(0, 0.05, -0.01);
                hairTop.scale.set(1.04, 1.1, 1.06);
                pHead.add(hairTop);

                // Front shoulder-draping strands
                [-0.12, 0.12].forEach(sx => {
                    const strand = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.42, 0.08), hairMat);
                    strand.position.set(sx, -0.16, 0.04);
                    pHead.add(strand);
                });

                // Back voluminous flowing hair
                const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.46, 0.12), hairMat);
                hairBack.position.set(0, -0.18, -0.13);
                pHead.add(hairBack);
            } else if (arch.hairType === 'ponytail') {
                // High Ponytail with Scrunchie
                const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.152, 14, 12), hairMat);
                hairCap.position.set(0, 0.05, -0.02);
                pHead.add(hairCap);

                const scrunchie = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.014, 8, 12), new THREE.MeshStandardMaterial({ color: 0xf39c12 }));
                scrunchie.position.set(0, 0.08, -0.15);
                scrunchie.rotation.x = Math.PI / 4;
                pHead.add(scrunchie);

                const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.02, 0.32, 8), hairMat);
                tail.rotation.x = Math.PI / 3.5;
                tail.position.set(0, -0.05, -0.22);
                pHead.add(tail);
            } else if (arch.hairType === 'beanie') {
                // Ribbed Knit Winter Beanie with Folded Brim
                const beanieMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.9 });
                const beanieCrown = new THREE.Mesh(new THREE.SphereGeometry(0.162, 14, 14), beanieMat);
                beanieCrown.position.set(0, 0.07, -0.01);
                beanieCrown.scale.set(1.05, 1.15, 1.05);
                pHead.add(beanieCrown);

                const beanieBrim = new THREE.Mesh(new THREE.TorusGeometry(0.148, 0.028, 8, 16), beanieMat);
                beanieBrim.rotation.x = Math.PI / 2;
                beanieBrim.position.set(0, 0.02, 0);
                pHead.add(beanieBrim);
            } else if (arch.hairType === 'side_part') {
                // Business Combed Side-Part
                const hairPart = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.08, 0.28), hairMat);
                hairPart.position.set(0, 0.11, -0.01);
                pHead.add(hairPart);

                const sideburns = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.18), hairMat);
                sideburns.position.set(0, 0.02, -0.04);
                pHead.add(sideburns);
            }

            // High-End Studio Headphones with Glowing Audio LED
            if (arch.headphones) {
                const hpFrameMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 });
                const hpPadMat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.7 });
                const hpLedMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3 });

                // Symmetrical headband arch over top of head from ear to ear
                const band = new THREE.Mesh(new THREE.TorusGeometry(0.162, 0.016, 8, 24, Math.PI), hpFrameMat);
                band.position.set(0, 0.01, -0.01);
                pHead.add(band);

                [-0.16, 0.16].forEach(hx => {
                    const earpad = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.035, 12), hpPadMat);
                    earpad.rotation.z = Math.PI / 2;
                    earpad.position.set(hx, 0.01, -0.01);
                    pHead.add(earpad);

                    const led = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.038, 8), hpLedMat);
                    led.rotation.z = Math.PI / 2;
                    led.position.set(hx > 0 ? hx + 0.002 : hx - 0.002, 0.01, -0.01);
                    pHead.add(led);
                });
            }

            // Reading Glasses
            if (arch.glasses) {
                const frameMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 });
                const lensMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, transparent: true, opacity: 0.4, roughness: 0.1 });
                [-0.048, 0.048].forEach(gx => {
                    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.004, 6, 12), frameMat);
                    rim.position.set(gx, 0.02, 0.14);
                    pHead.add(rim);

                    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.022, 10), lensMat);
                    lens.position.set(gx, 0.02, 0.14);
                    pHead.add(lens);
                });
                const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.004, 0.004), frameMat);
                bridge.position.set(0, 0.02, 0.14);
                pHead.add(bridge);
            }

            pGroup.add(pHead);

            // --- 3. Layered Outfits & Torso ---
            const pBody = new THREE.Group();
            pBody.position.set(0, 0.32, 0);

            // Inner Shirt / Collar / Tie
            const innerChest = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.48, 0.25), innerMat);
            innerChest.position.set(0, 0, 0.02);
            pBody.add(innerChest);

            if (arch.coatStyle === 'suit') {
                // Business Suit Blazer with Lapels and Tie
                const suitLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.28), clothingTopMat);
                suitLeft.position.set(-0.14, 0, 0);
                pBody.add(suitLeft);

                const suitRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.28), clothingTopMat);
                suitRight.position.set(0.14, 0, 0);
                pBody.add(suitRight);

                const suitBack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.52, 0.1), clothingTopMat);
                suitBack.position.set(0, 0, -0.09);
                pBody.add(suitBack);

                if (arch.tie) {
                    const tieMat = new THREE.MeshStandardMaterial({ color: arch.tie, roughness: 0.5 });
                    const tieMesh = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.32, 0.015), tieMat);
                    tieMesh.position.set(0, 0.06, 0.146);
                    pBody.add(tieMesh);
                }
            } else if (arch.coatStyle === 'puffer') {
                // Segmented Winter Puffer Jacket with Horizontal Baffles
                for (let b = 0; b < 3; b++) {
                    const baffle = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.31), clothingTopMat);
                    baffle.position.set(0, -0.15 + b * 0.16, 0);
                    pBody.add(baffle);
                }
                const collar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.29), clothingTopMat);
                collar.position.set(0, 0.25, 0);
                pBody.add(collar);

                // Zipper Line
                const zipMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, metalness: 0.8, roughness: 0.3 });
                const zipper = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.48, 0.012), zipMat);
                zipper.position.set(0, 0, 0.158);
                pBody.add(zipper);
            } else if (arch.coatStyle === 'hoodie') {
                // Relaxed Streetwear Hoodie with Kangaroo Pocket
                const hoodieTorso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.52, 0.3), clothingTopMat);
                hoodieTorso.position.set(0, 0, 0);
                pBody.add(hoodieTorso);

                const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.04), clothingTopMat);
                pocket.position.set(0, -0.12, 0.16);
                pBody.add(pocket);

                // Drawstrings
                const cordMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
                [-0.05, 0.05].forEach(cx => {
                    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 6), cordMat);
                    cord.position.set(cx, 0.12, 0.155);
                    pBody.add(cord);
                });
            } else {
                // Classic Trench Coat
                const trenchTorso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.54, 0.29), clothingTopMat);
                trenchTorso.position.set(0, 0, 0);
                pBody.add(trenchTorso);

                const lapelLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.03), clothingTopMat);
                lapelLeft.rotation.z = -0.2;
                lapelLeft.position.set(-0.08, 0.1, 0.15);
                pBody.add(lapelLeft);

                const lapelRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.03), clothingTopMat);
                lapelRight.rotation.z = 0.2;
                lapelRight.position.set(0.08, 0.1, 0.15);
                pBody.add(lapelRight);
            }

            pGroup.add(pBody);

            // --- 4. Articulated Arms & Detailed Sculpted Hands ---
            let leftThumbMesh: THREE.Mesh | undefined;
            let rightThumbMesh: THREE.Mesh | undefined;
            let phoneMesh: THREE.Mesh | undefined;

            [-0.23, 0.23].forEach((ax, armIdx) => {
                const armGroup = new THREE.Group();
                armGroup.position.set(ax, 0.44, 0.02);

                // Upper arm
                const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.046, 0.24, 8), clothingTopMat);
                upperArm.rotation.x = 0.35;
                upperArm.position.set(0, -0.1, 0.04);
                armGroup.add(upperArm);

                // Sleeve Cuff
                const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.04, 8), clothingTopMat);
                cuff.rotation.x = 0.85;
                cuff.position.set(0, -0.2, 0.12);
                armGroup.add(cuff);

                // Forearm extending towards lap / prop
                const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.22, 8), skinMat);
                forearm.rotation.x = 0.95;
                forearm.position.set(0, -0.23, 0.17);
                armGroup.add(forearm);

                // Detailed Sculpted Hand with Separate Thumb & Fingers
                const palm = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.028, 0.075), skinMat);
                palm.position.set(0, -0.26, 0.26);
                armGroup.add(palm);

                const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.018, 0.045), skinMat);
                thumb.rotation.y = (ax > 0 ? -1 : 1) * 0.4;
                thumb.position.set(ax > 0 ? -0.035 : 0.035, -0.25, 0.27);
                armGroup.add(thumb);

                if (armIdx === 0) leftThumbMesh = thumb;
                else rightThumbMesh = thumb;

                pGroup.add(armGroup);
            });

            // --- 5. Seated Legs & Detailed 3D Sneakers ---
            [-0.11, 0.11].forEach(lx => {
                // Thighs (resting horizontally forward on seat cushion)
                const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.14, 0.38), clothingPantsMat);
                thigh.position.set(lx, 0.08, 0.16);
                pGroup.add(thigh);

                // Calves (extending downward to train floor)
                const calf = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.38, 0.13), clothingPantsMat);
                calf.position.set(lx, -0.15, 0.32);
                pGroup.add(calf);

                // Realistic 2-Tone Modern Sneaker / Shoe
                const shoeGroup = new THREE.Group();
                shoeGroup.position.set(lx, -0.34, 0.36);

                // Midsole & Rubber Outsole
                const sole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.24), shoeSoleMat);
                sole.position.set(0, 0, 0.01);
                shoeGroup.add(sole);

                // Upper Body
                const upper = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.22), shoeUpperMat);
                upper.position.set(0, 0.05, 0);
                shoeGroup.add(upper);

                // White Rubber Toe Cap
                const toeCap = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.05, 0.06), shoeSoleMat);
                toeCap.position.set(0, 0.04, 0.09);
                shoeGroup.add(toeCap);

                // Shoelaces Ridge
                const laces = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.1), shoeSoleMat);
                laces.position.set(0, 0.086, 0.02);
                laces.rotation.x = -Math.PI / 8;
                shoeGroup.add(laces);

                pGroup.add(shoeGroup);
            });

            // --- 6. Realistic Interactive Props (Smartphone, Newspaper, Coffee, Backpack) ---
            if (arch.prop === 'phone') {
                // Sleek OLED Smartphone with Glowing UI
                const phoneBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, metalness: 0.9, roughness: 0.1 });
                const phoneScreenMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3 });

                phoneMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.012, 0.2), phoneBodyMat);
                phoneMesh.rotation.x = -Math.PI / 5.5;
                phoneMesh.position.set(0, 0.24, 0.31);
                pGroup.add(phoneMesh);

                const screen = new THREE.Mesh(new THREE.BoxGeometry(0.098, 0.004, 0.18), phoneScreenMat);
                screen.position.set(0, 0.007, 0);
                phoneMesh.add(screen);
            } else if (arch.prop === 'newspaper') {
                // Broadsheet Metro Newspaper with Printed Layout
                const paperMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.9 });
                const inkMat = new THREE.MeshBasicMaterial({ color: 0x2f3640 });

                const paper = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.01), paperMat);
                paper.rotation.x = -Math.PI / 3.8;
                paper.position.set(0, 0.26, 0.32);
                pGroup.add(paper);

                // Headline Bar & Image Frame
                const headline = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.035, 0.002), inkMat);
                headline.position.set(0, 0.08, 0.006);
                paper.add(headline);

                const articleCol1 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.002), inkMat);
                articleCol1.position.set(-0.08, -0.02, 0.006);
                paper.add(articleCol1);

                const articleCol2 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.002), inkMat);
                articleCol2.position.set(0.08, -0.02, 0.006);
                paper.add(articleCol2);
            } else if (arch.prop === 'coffee') {
                // Paper Coffee Cup with Heat Cardboard Sleeve & Sip Lid
                const cupMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
                const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x833400, roughness: 0.9 });
                const lidMat = new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.3 });

                const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.11, 10), cupMat);
                cup.position.set(0.06, 0.26, 0.3);
                pGroup.add(cup);

                const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.05, 10), sleeveMat);
                sleeve.position.set(0, 0, 0);
                cup.add(sleeve);

                const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.015, 10), lidMat);
                lid.position.set(0, 0.058, 0);
                cup.add(lid);
            }

            // Floor / Seat Commuter Backpack
            if (i % 2 === 1) {
                const packMat = new THREE.MeshStandardMaterial({ color: arch.top, roughness: 0.8 });
                const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.16), packMat);
                backpack.position.set(seatPos.x > 0 ? -0.28 : 0.28, -0.22, 0.1);
                pGroup.add(backpack);

                const frontPocket = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.05), packMat);
                frontPocket.position.set(0, -0.05, 0.1);
                backpack.add(frontPocket);
            }

            const baseRotY = seatPos.x > 0 ? -Math.PI / 2 : Math.PI / 2;
            pGroup.rotation.y = baseRotY;

            const isCreepy = carIndex === 2 && i === 1; // Special uncanny staring passenger
            passengers.push({
                group: pGroup,
                head: pHead,
                body: pBody,
                isSitting: true,
                seatPos,
                animType: isCreepy ? 'uncanny_stare' : arch.prop === 'phone' ? 'phone' : 'look_window',
                baseRotY,
                targetRotY: baseRotY,
                isCreepy,
                phoneMesh,
                headphones: arch.headphones,
                thumbLeft: leftThumbMesh,
                thumbRight: rightThumbMesh
            });

            carGroup.add(pGroup);
        }
    }

    private _spawnCarriage200Boss(carGroup: THREE.Group) {
        const bossGroup = new THREE.Group();
        bossGroup.name = 'carriage_200_boss';
        bossGroup.position.set(0, 0, 41);

        const darkBodyMat = new THREE.MeshStandardMaterial({
            color: 0x050508,
            roughness: 0.35,
            metalness: 0.8,
            emissive: 0x220005,
            emissiveIntensity: 0.6
        });
        const redCoreMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
        const redEyeMat = new THREE.MeshBasicMaterial({ color: 0xff1e56 });
        const hornMat = new THREE.MeshStandardMaterial({ color: 0x1a0005, roughness: 0.2 });

        // Menacing Large Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.4, 0.6), darkBodyMat);
        torso.position.set(0, 1.5, 0);
        bossGroup.add(torso);

        // Glowing Red Chest Core / Heart
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), redCoreMat);
        core.position.set(0, 1.6, 0.32);
        bossGroup.add(core);

        const coreLight = new THREE.PointLight(0xff0044, 2.5, 7.0);
        coreLight.position.set(0, 1.6, 0.4);
        bossGroup.add(coreLight);

        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), darkBodyMat);
        head.position.set(0, 2.45, 0);
        bossGroup.add(head);

        // Glowing Red Eyes
        [-0.14, 0.14].forEach(ex => {
            const eye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.04), redEyeMat);
            eye.position.set(ex, 2.48, -0.29);
            bossGroup.add(eye);
        });

        // Horns on Head
        [-0.24, 0.24].forEach(hx => {
            const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 8), hornMat);
            horn.position.set(hx, 2.85, 0);
            horn.rotation.z = hx < 0 ? 0.35 : -0.35;
            bossGroup.add(horn);
        });

        // Shadow Claws / Arms
        [-0.75, 0.75].forEach(ax => {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.2, 0.32), darkBodyMat);
            arm.position.set(ax, 1.4, 0.1);
            bossGroup.add(arm);

            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 6), redCoreMat);
            claw.rotation.x = Math.PI;
            claw.position.set(ax, 0.65, 0.1);
            bossGroup.add(claw);
        });

        // Shadow cloak lower body
        const lowerBody = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.0, 12), darkBodyMat);
        lowerBody.position.set(0, 0.5, 0);
        bossGroup.add(lowerBody);

        // Boss Health Bar Sprite above head
        const healthCanvas = document.createElement('canvas');
        healthCanvas.width = 512;
        healthCanvas.height = 128;
        const healthTex = new THREE.CanvasTexture(healthCanvas);
        const spriteMat = new THREE.SpriteMaterial({ map: healthTex, transparent: true });
        const healthSprite = new THREE.Sprite(spriteMat);
        healthSprite.scale.set(3.2, 0.8, 1);
        healthSprite.position.set(0, 3.25, 0);
        bossGroup.add(healthSprite);

        this.carriage200Boss = {
            group: bossGroup,
            bodyMesh: torso,
            hp: 10,
            maxHp: 10,
            attackCooldown: 0,
            isDead: false,
            healthCanvas,
            healthTex,
            healthSprite,
            initialZ: 41,
            moveSpeed: 2.3
        };

        carGroup.add(bossGroup);
        this.updateCarriage200BossHealthBar();
    }

    public spawnGlowingShadowEyes(count: number) {
        if (this.shadowEyesGroup) {
            this.scene.remove(this.shadowEyesGroup);
            this.shadowEyesGroup = null;
        }

        const group = new THREE.Group();
        group.name = 'shadow_eyes_group';

        const eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const smokeMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.6 });

        // Positions along windows, roof corners, and aisle
        const candidatePositions = [
            new THREE.Vector3(-1.42, 1.7, -3.0),
            new THREE.Vector3(1.42, 1.8, -1.0),
            new THREE.Vector3(-1.42, 1.6, 2.5),
            new THREE.Vector3(1.42, 1.75, 4.2),
            new THREE.Vector3(0, 2.4, -4.5),
            new THREE.Vector3(-1.3, 2.2, 0.5),
            new THREE.Vector3(1.3, 2.3, -2.5)
        ];

        for (let i = 0; i < count; i++) {
            const eyeGroup = new THREE.Group();
            const pos = candidatePositions[i % candidatePositions.length];

            // Pair of piercing red eyes
            [-0.05, 0.05].forEach(ex => {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeGlowMat);
                eye.position.set(ex, 0, 0);
                eyeGroup.add(eye);

                const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), pupilMat);
                pupil.position.set(ex, 0, 0.038);
                eyeGroup.add(pupil);
            });

            // Surrounding dark shadow aura
            const halo = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), smokeMat);
            halo.scale.set(1.5, 0.8, 1.0);
            eyeGroup.add(halo);

            eyeGroup.position.copy(pos);
            group.add(eyeGroup);
        }

        this.shadowEyesGroup = group;
        this.scene.add(this.shadowEyesGroup);
    }

    public spawnShadowVillains(count: number = 2) {
        // Clear existing villains
        this.shadowVillains.forEach(v => this.scene.remove(v.group));
        this.shadowVillains = [];

        const villainMat = new THREE.MeshStandardMaterial({
            color: 0x050508,
            roughness: 0.8,
            metalness: 0.2,
            emissive: 0x220000,
            emissiveIntensity: 0.7
        });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
        const smokeMat = new THREE.MeshBasicMaterial({ color: 0x0a0000, transparent: true, opacity: 0.65 });

        const startPositions = [
            new THREE.Vector3(0, 0, 4.5),
            new THREE.Vector3(-0.6, 0, 6.5)
        ];

        for (let i = 0; i < count; i++) {
            const vGroup = new THREE.Group();
            const pos = startPositions[i % startPositions.length];

            // 1. Dark Menacing Body Torso
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 1.3, 8), villainMat);
            body.position.set(0, 0.85, 0);
            vGroup.add(body);

            // 2. Horned / Spiky Shadow Head
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), villainMat);
            head.position.set(0, 1.7, 0);
            vGroup.add(head);

            // Red glowing eyes
            [-0.08, 0.08].forEach(ex => {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
                eye.position.set(ex, 1.72, 0.18);
                vGroup.add(eye);
            });

            // Shadow Claws
            [-0.38, 0.38].forEach(cx => {
                const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.1), villainMat);
                arm.position.set(cx, 1.2, 0.2);
                arm.rotation.x = Math.PI / 4;
                vGroup.add(arm);
            });

            // Dark shadowy aura
            const aura = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), smokeMat);
            aura.position.set(0, 1.2, 0);
            vGroup.add(aura);

            vGroup.position.copy(pos);
            this.scene.add(vGroup);

            this.shadowVillains.push({
                group: vGroup,
                hp: 80,
                maxHp: 80,
                attackCooldown: 1.0,
                bodyMesh: body
            });
        }
    }

    private createHeldItemModel(itemKey: string): THREE.Group {
        const group = new THREE.Group();

        if (itemKey === 'sword') {
            // Radiant Steel & Gold Mystery Sword (User requirement)
            const hiltMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.8 });
            const goldMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.95, roughness: 0.2 });
            const steelMat = new THREE.MeshStandardMaterial({ color: 0xdfe6e9, metalness: 0.95, roughness: 0.1, emissive: 0x00f2fe, emissiveIntensity: 0.15 });

            // Grip / Handle
            const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.16, 8), hiltMat);
            grip.position.set(0, -0.06, 0);
            group.add(grip);

            // Pommel
            const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), goldMat);
            pommel.position.set(0, -0.15, 0);
            group.add(pommel);

            // Crossguard
            const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.04), goldMat);
            guard.position.set(0, 0.025, 0);
            group.add(guard);

            // Long Sharp Steel Blade
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.52, 0.01), steelMat);
            blade.position.set(0, 0.28, 0);
            group.add(blade);

            // Blade Tip
            const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 4), steelMat);
            tip.position.set(0, 0.59, 0);
            tip.rotation.y = Math.PI / 4;
            group.add(tip);

            // Glowing Rune Core on Blade
            const runeMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
            const rune = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.35, 0.014), runeMat);
            rune.position.set(0, 0.26, 0);
            group.add(rune);

            group.rotation.x = Math.PI / 4;
            group.rotation.y = -Math.PI / 6;
            return group;
        } else if (itemKey === 'key') {
            // Golden Skeleton Key
            const goldMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.95, roughness: 0.15 });
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 8, 16), goldMat);
            ring.position.set(0, 0, 0);
            group.add(ring);

            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 8), goldMat);
            shaft.rotation.x = Math.PI / 2;
            shaft.position.set(0, 0, -0.07);
            group.add(shaft);

            const bit1 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.024, 0.015), goldMat);
            bit1.position.set(0, -0.015, -0.12);
            group.add(bit1);

            const bit2 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.018, 0.012), goldMat);
            bit2.position.set(0, -0.012, -0.135);
            group.add(bit2);
        } else if (itemKey === 'radio') {
            // Vintage Portable Subway Radio
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 0.6 });
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.04), bodyMat);
            group.add(body);

            const dialMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
            const dial = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.005), dialMat);
            dial.position.set(0, 0.03, 0.021);
            group.add(dial);

            const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.14, 6), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9 }));
            antenna.position.set(0.03, 0.12, 0);
            group.add(antenna);
        } else if (itemKey === 'secret_pass') {
            // Golden Secret Pass
            const passMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.85, roughness: 0.25 });
            const pass = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.004), passMat);
            group.add(pass);
        } else if (itemKey === 'clue_detector') {
            // Radar Clue Detector
            const casingMat = new THREE.MeshStandardMaterial({ color: 0x2f3542, metalness: 0.7, roughness: 0.3 });
            const casing = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.03), casingMat);
            group.add(casing);

            const ledMat = new THREE.MeshBasicMaterial({ color: 0x2ed573 });
            const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), ledMat);
            led.position.set(0, 0.04, 0.016);
            group.add(led);
        } else if (itemKey === 'night_vision') {
            // Goggles
            const gMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.5 });
            const lensMat = new THREE.MeshBasicMaterial({ color: 0x2ed573 });
            [-0.03, 0.03].forEach(gx => {
                const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8), gMat);
                tube.rotation.x = Math.PI / 2;
                tube.position.set(gx, 0, 0);
                group.add(tube);

                const lens = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), lensMat);
                lens.position.set(gx, 0, -0.031);
                group.add(lens);
            });
        }

        group.rotation.set(0.1, -0.2, 0.05);
        return group;
    }

    private spawnStalkerEntity() {
        if (this.stalkerMesh) this.scene.remove(this.stalkerMesh);

        const stalker = new THREE.Group();
        const stalkerMat = new THREE.MeshPhysicalMaterial({
            color: 0x00f2fe,
            transparent: true,
            opacity: 0.55,
            roughness: 0.1,
            transmission: 0.6
        });

        // Slender shadowy figure
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.8), stalkerMat);
        body.position.set(0, 0.9, 0);
        stalker.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), stalkerMat);
        head.position.set(0, 1.9, 0);
        stalker.add(head);

        // Glowing white eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        [-0.05, 0.05].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), eyeMat);
            eye.position.set(x, 1.92, -0.15);
            stalker.add(eye);
        });

        stalker.position.set(0, 0, 8.5);
        this.scene.add(stalker);
        this.stalkerMesh = stalker;
        this.stalkerActive = true;
        this.stalkerDistZ = 8.5;
    }

    public createShadowHandMesh(side: number, zOffset: number = 0): THREE.Group {
        const handGroup = new THREE.Group();

        const armSkinMat = new THREE.MeshStandardMaterial({
            color: 0x030406,
            roughness: 0.85,
            metalness: 0.35
        });
        const jointMat = new THREE.MeshStandardMaterial({
            color: 0x08090d,
            roughness: 0.7,
            metalness: 0.5
        });
        const clawMat = new THREE.MeshStandardMaterial({
            color: 0x14041b,
            roughness: 0.25,
            metalness: 0.75
        });
        const veinMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });

        // 1. Shoulder Socket & Upper Arm
        const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), jointMat);
        shoulder.position.set(0, 0, 0);
        handGroup.add(shoulder);

        const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.75, 10), armSkinMat);
        upperArm.rotation.z = side > 0 ? -Math.PI / 2.8 : Math.PI / 2.8;
        upperArm.position.set(-side * 0.35, 0.05, 0);
        handGroup.add(upperArm);

        // 2. Elbow Joint
        const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 10), jointMat);
        elbow.position.set(-side * 0.7, 0.1, 0);
        handGroup.add(elbow);

        // 3. Forearm (reaching inward towards center of aisle)
        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.095, 0.85, 10), armSkinMat);
        forearm.rotation.z = side > 0 ? -Math.PI / 2.3 : Math.PI / 2.3;
        forearm.position.set(-side * 1.1, 0.12, 0);
        handGroup.add(forearm);

        // Pulsating vein ridges on forearm
        [-0.03, 0.03].forEach(vOffset => {
            const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 6), veinMat);
            vein.rotation.z = side > 0 ? -Math.PI / 2.3 : Math.PI / 2.3;
            vein.position.set(-side * 1.1, 0.12 + vOffset, vOffset);
            handGroup.add(vein);
        });

        // 4. Wrist & Anatomical Palm
        const wrist = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), jointMat);
        wrist.position.set(-side * 1.5, 0.14, 0);
        handGroup.add(wrist);

        const palm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.28), armSkinMat);
        palm.position.set(-side * 1.62, 0.14, 0);
        handGroup.add(palm);

        // 5. Five Articulated Fingers (Thumb, Index, Middle, Ring, Pinky)
        const fingerOffsets = [
            { z: -0.11, len: 0.26, scale: 0.9, isThumb: true },
            { z: -0.06, len: 0.38, scale: 1.0, isThumb: false },
            { z: -0.00, len: 0.44, scale: 1.1, isThumb: false },
            { z: 0.06, len: 0.38, scale: 1.0, isThumb: false },
            { z: 0.11, len: 0.28, scale: 0.85, isThumb: false }
        ];

        fingerOffsets.forEach((f) => {
            const fingerGroup = new THREE.Group();
            fingerGroup.name = 'finger';

            // Proximal Phalanx
            const pPhalanx = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * f.scale, 0.024 * f.scale, f.len * 0.5, 6), armSkinMat);
            pPhalanx.rotation.z = side > 0 ? -Math.PI / 3 : Math.PI / 3;
            pPhalanx.position.set(-side * (f.len * 0.2), 0, 0);
            fingerGroup.add(pPhalanx);

            // Knuckle Joint
            const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.022 * f.scale, 6, 6), jointMat);
            knuckle.position.set(-side * (f.len * 0.45), 0, 0);
            fingerGroup.add(knuckle);

            // Distal Phalanx & Curved Razor Claw
            const dPhalanx = new THREE.Mesh(new THREE.CylinderGeometry(0.012 * f.scale, 0.018 * f.scale, f.len * 0.45, 6), armSkinMat);
            dPhalanx.rotation.z = side > 0 ? -Math.PI / 2.4 : Math.PI / 2.4;
            dPhalanx.position.set(-side * (f.len * 0.65), -0.02, 0);
            fingerGroup.add(dPhalanx);

            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.025 * f.scale, 0.22 * f.scale, 6), clawMat);
            claw.rotation.z = side > 0 ? -Math.PI / 1.8 : Math.PI / 1.8;
            claw.position.set(-side * (f.len * 0.9), -0.05, 0);
            fingerGroup.add(claw);

            // Glowing claw tip
            const tipGlow = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), veinMat);
            tipGlow.position.set(-side * (f.len * 1.0), -0.06, 0);
            fingerGroup.add(tipGlow);

            fingerGroup.position.set(-side * 1.68, 0.14, f.z);
            handGroup.add(fingerGroup);
        });

        // 6. Eerie Red/Purple Volumetric Point Light from Palm
        const palmLight = new THREE.PointLight(0xff1744, 2.5, 4.5);
        palmLight.position.set(-side * 1.55, 0.2, 0);
        handGroup.add(palmLight);

        // Position hand right inside the doorway at x = side * 1.68, y = 1.35, z = zOffset
        handGroup.position.set(side * 1.68, 1.35, zOffset);
        return handGroup;
    }
}
