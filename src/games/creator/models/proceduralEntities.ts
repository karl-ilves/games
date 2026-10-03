import * as THREE from 'three';

export function createCustomProceduralMesh(prompt: string, name: string, allowFallback: boolean = true): THREE.Group | null {
    const group = new THREE.Group();
    const p = (prompt + ' ' + name).toLowerCase();

    // Color extraction helper
    let tint = 0x3498db;
    if (p.includes('punan') || p.includes('red')) tint = 0xe74c3c;
    else if (p.includes('kollan') || p.includes('yellow') || p.includes('gold') || p.includes('kuld')) tint = 0xf1c40f;
    else if (p.includes('rohelin') || p.includes('green')) tint = 0x2ecc71;
    else if (p.includes('sinin') || p.includes('blue')) tint = 0x3498db;
    else if (p.includes('must') || p.includes('black')) tint = 0x2c3e50;
    else if (p.includes('valg') || p.includes('white')) tint = 0xfafafa;
    else if (p.includes('lilla') || p.includes('purple')) tint = 0x9b59b6;
    else if (p.includes('roosa') || p.includes('pink')) tint = 0xff7675;
    else if (p.includes('oranž') || p.includes('oranz') || p.includes('orange')) tint = 0xe67e22;

    // 0.0 AI KOOL: KURGIMOPEED / CUCUMBER SCOOTER 🥒🛵
    if (p.includes('kurgimopeed') || p.includes('kurk-mopeed') || p.includes('kurgi mopeed') || p.includes('kurgi roller') || p.includes('kurgi-roller') || p.includes('kurgi auto') || p.includes('kurgi-auto') || p.includes('cucumber scooter')) {
        const cukeMat = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.5, bumpScale: 0.05 });
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x1e824c, roughness: 0.8 });
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.8 });
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xd2dae2, metalness: 0.8, roughness: 0.2 });
        const chromeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.1 });
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xfffa65 });

        // Cucumber body
        const cukeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 3.2, 16), cukeMat);
        cukeBody.rotation.x = Math.PI / 2;
        cukeBody.position.set(0, 0.95, 0);
        group.add(cukeBody);

        const frontCap = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 12), cukeMat);
        frontCap.position.set(0, 0.95, 1.6);
        group.add(frontCap);

        const backCap = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 12), cukeMat);
        backCap.position.set(0, 0.95, -1.6);
        group.add(backCap);

        // Stalk on tail
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.6, 8), stemMat);
        stem.position.set(0, 1.25, -2.1);
        stem.rotation.x = -0.5;
        group.add(stem);

        // Cucumber bumps
        for (let i = 0; i < 12; i++) {
            const bump = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), stemMat);
            const angle = i * 1.7;
            const z = -1.2 + i * 0.2;
            bump.position.set(Math.cos(angle) * 0.6, 0.95 + Math.sin(angle) * 0.6, z);
            group.add(bump);
        }

        // 2 Scooter Wheels
        [1.3, -1.3].forEach(z => {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.22, 16), wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(0, 0.48, z);
            group.add(wheel);

            const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.24, 12), rimMat);
            rim.rotation.z = Math.PI / 2;
            rim.position.set(0, 0.48, z);
            group.add(rim);
        });

        // Steering & Handlebars
        const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 8), chromeMat);
        fork.position.set(0, 1.7, 1.35);
        fork.rotation.x = -0.2;
        group.add(fork);

        const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), chromeMat);
        handlebar.rotation.z = Math.PI / 2;
        handlebar.position.set(0, 2.3, 1.22);
        group.add(handlebar);

        // Headlight
        const light = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.2, 12), chromeMat);
        light.rotation.x = Math.PI / 2;
        light.position.set(0, 1.6, 2.0);
        group.add(light);

        const glow = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), lightMat);
        glow.position.set(0, 1.6, 2.11);
        group.add(glow);

        // Seat
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 1.1), wheelMat);
        seat.position.set(0, 1.55, -0.2);
        group.add(seat);

    // 0.1 AI KOOL: BANAANIRAKETT / BANANA ROCKET 🍌🚀
    } else if (p.includes('banaanirakett') || p.includes('banaani rakett') || p.includes('banaani-rakett') || p.includes('banana rocket')) {
        const bananaMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.5 });
        const tipMat = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.7 });
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.8 });
        const finMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, metalness: 0.5, roughness: 0.3 });
        const thrusterMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.8 });
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xff9f43 });

        const segments = 6;
        for (let i = 0; i < segments; i++) {
            const t = i / (segments - 1);
            const radius = Math.sin(t * Math.PI) * 0.7 + 0.35;
            const segMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius + 0.05, 0.8, 12), bananaMat);
            const curveOffset = Math.sin(t * Math.PI) * 0.45;
            segMesh.position.set(0, 0.8 + i * 0.7, curveOffset);
            group.add(segMesh);
        }

        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 12), tipMat);
        tip.position.set(0, 5.1, 0.1);
        group.add(tip);

        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.5, 8), stemMat);
        stem.position.set(0, 0.5, 0);
        group.add(stem);

        for (const angle of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) {
            const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.9), finMat);
            fin.position.set(Math.cos(angle) * 0.85, 1.2, Math.sin(angle) * 0.85);
            fin.rotation.y = angle;
            group.add(fin);
        }

        const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 0.6, 12), thrusterMat);
        thruster.position.set(0, 0.3, 0);
        group.add(thruster);

        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 10), flameMat);
        flame.rotation.x = Math.PI;
        flame.position.set(0, -0.4, 0);
        group.add(flame);

    // 0.2 AI KOOL: PITSATORN / PIZZA TOWER 🍕🏢
    } else if (p.includes('pitsatorn') || p.includes('pitsa-torn') || p.includes('pitsapilvelõhkuja') || p.includes('pizza tower')) {
        const crustMat = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.8 });
        const cheeseMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.4 });
        const pepMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 });

        const layers = 5;
        for (let i = 0; i < layers; i++) {
            const layerRadius = 2.4 - i * 0.25;
            const y = 0.5 + i * 1.1;

            const crust = new THREE.Mesh(new THREE.CylinderGeometry(layerRadius, layerRadius + 0.1, 0.3, 16), crustMat);
            crust.position.y = y;
            group.add(crust);

            const cheese = new THREE.Mesh(new THREE.CylinderGeometry(layerRadius - 0.15, layerRadius - 0.15, 0.1, 16), cheeseMat);
            cheese.position.y = y + 0.16;
            group.add(cheese);

            for (let j = 0; j < 6; j++) {
                const pep = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 8), pepMat);
                const a = (j / 6) * Math.PI * 2;
                pep.position.set(Math.cos(a) * (layerRadius * 0.6), y + 0.22, Math.sin(a) * (layerRadius * 0.6));
                group.add(pep);
            }
        }

    // 1. RABBIT / JÄNES / BUNNY
    } else if (p.includes('jänes') || p.includes('janes') || p.includes('rabbit') || p.includes('bunny') || p.includes('hare') || p.includes('janku')) {
        const furMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.8 });
        const earInnerMat = new THREE.MeshStandardMaterial({ color: 0xffb8b8, roughness: 0.5 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.2 });
        const noseMat = new THREE.MeshStandardMaterial({ color: 0xff7675 });

        const body = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 16), furMat);
        body.scale.set(1.0, 1.2, 1.3);
        body.position.set(0, 1.2, 0);
        group.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 16), furMat);
        head.position.set(0, 2.2, 0.6);
        group.add(head);

        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), noseMat);
        nose.position.set(0, 2.15, 1.3);
        group.add(nose);

        [-0.35, 0.35].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), eyeMat);
            eye.position.set(x, 2.35, 1.15);
            group.add(eye);
        });

        [-0.3, 0.3].forEach(x => {
            const earOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 1.5, 8), furMat);
            earOuter.position.set(x, 3.4, 0.5);
            earOuter.rotation.z = (x < 0 ? 0.15 : -0.15);
            group.add(earOuter);

            const earInner = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 1.2, 8), earInnerMat);
            earInner.position.set(x, 3.4, 0.62);
            earInner.rotation.z = (x < 0 ? 0.15 : -0.15);
            group.add(earInner);
        });

        const tail = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), furMat);
        tail.position.set(0, 1.0, -1.3);
        group.add(tail);

        [-0.45, 0.45].forEach(x => {
            const frontPaw = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), furMat);
            frontPaw.scale.set(0.8, 0.6, 1.4);
            frontPaw.position.set(x, 0.2, 0.6);
            group.add(frontPaw);

            const backPaw = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), furMat);
            backPaw.scale.set(0.9, 0.7, 1.6);
            backPaw.position.set(x, 0.25, -0.4);
            group.add(backPaw);
        });

    // 2. DOG / KOER / WOLF / HUNT / FOX / REBANE / PUPPY
    } else if (p.includes('koer') || p.includes('dog') || p.includes('kutsik') || p.includes('puppy') || p.includes('wolf') || p.includes('hunt') || p.includes('fox') || p.includes('rebane')) {
        const coatColor = p.includes('fox') || p.includes('rebane') ? 0xe67e22 : (p.includes('wolf') || p.includes('hunt') ? 0x7f8c8d : 0xc0392b);
        const coatMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.7 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.8 });
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.3 });
        const collarMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.4 });

        // Body & Chest
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.5, 2.8), coatMat);
        body.position.set(0, 1.5, 0);
        group.add(body);

        const chest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.4), whiteMat);
        chest.position.set(0, 1.5, 1.3);
        group.add(chest);

        // Head & Muzzle
        const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.3), coatMat);
        head.position.set(0, 2.5, 1.4);
        group.add(head);

        const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.0), whiteMat);
        muzzle.position.set(0, 2.3, 2.2);
        group.add(muzzle);

        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), blackMat);
        nose.position.set(0, 2.5, 2.7);
        group.add(nose);

        [-0.35, 0.35].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), blackMat);
            eye.position.set(x, 2.7, 1.95);
            group.add(eye);
            const ear = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 4), coatMat);
            ear.position.set(x, 3.3, 1.3);
            group.add(ear);
        });

        // Collar
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.08, 6, 16), collarMat);
        collar.position.set(0, 2.0, 1.2);
        collar.rotation.x = Math.PI / 3;
        group.add(collar);

        // 4 Legs
        [-0.5, 0.5].forEach(lx => {
            [0.9, -0.9].forEach(lz => {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.4, 8), coatMat);
                leg.position.set(lx, 0.7, lz);
                group.add(leg);
            });
        });

        // Wagging Tail
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.3, 6), coatMat);
        tail.position.set(0, 2.0, -1.8);
        tail.rotation.x = -Math.PI / 4;
        group.add(tail);

    // 3. CAT / KASS / LION / LÕVI / TIGER / TIIGER
    } else if (p.includes('kass') || p.includes('cat') || p.includes('kiisu') || p.includes('kitten') || p.includes('lion') || p.includes('lõvi') || p.includes('lovi') || p.includes('tiger') || p.includes('tiiger')) {
        const furColor = p.includes('lion') || p.includes('lõvi') ? 0xf39c12 : (p.includes('tiger') || p.includes('tiiger') ? 0xe67e22 : 0x2c3e50);
        const furMat = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.6 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, emissive: 0x2ecc71, emissiveIntensity: 0.6 });

        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 2.4, 12), furMat);
        body.rotation.x = Math.PI / 2;
        body.position.set(0, 1.2, 0);
        group.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 12), furMat);
        head.position.set(0, 1.8, 1.3);
        group.add(head);

        [-0.3, 0.3].forEach(x => {
            const ear = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 3), furMat);
            ear.position.set(x, 2.4, 1.3);
            group.add(ear);
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), eyeMat);
            eye.position.set(x, 1.9, 1.85);
            group.add(eye);
        });

        const snout = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), whiteMat);
        snout.position.set(0, 1.7, 1.9);
        group.add(snout);

        [-0.4, 0.4].forEach(lx => {
            [0.7, -0.7].forEach(lz => {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.1, 8), furMat);
                leg.position.set(lx, 0.55, lz);
                group.add(leg);
            });
        });

        // Curled Sleek Tail
        const tail = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.1, 6, 12, Math.PI), furMat);
        tail.position.set(0, 1.4, -1.5);
        tail.rotation.y = Math.PI / 2;
        group.add(tail);

    // 4. HORSE / HOBUNE / UNICORN / ÜKSSARVIK / PEGASUS
    } else if (p.includes('hobune') || p.includes('horse') || p.includes('ükssarvik') || p.includes('ukssarvik') || p.includes('unicorn') || p.includes('pegas')) {
        const horseColor = p.includes('unicorn') || p.includes('ükssarvik') ? 0xffffff : 0x8b4513;
        const horseMat = new THREE.MeshStandardMaterial({ color: horseColor, roughness: 0.6 });
        const maneMat = new THREE.MeshStandardMaterial({ color: p.includes('unicorn') ? 0xff7675 : 0x2c3e50 });
        const hornMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.8, emissive: 0xffd32a, emissiveIntensity: 0.8 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 3.4), horseMat);
        body.position.set(0, 2.2, 0);
        group.add(body);

        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 2.0, 8), horseMat);
        neck.position.set(0, 3.4, 1.5);
        neck.rotation.x = -Math.PI / 6;
        group.add(neck);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 1.6), horseMat);
        head.position.set(0, 4.4, 2.0);
        head.rotation.x = Math.PI / 8;
        group.add(head);

        if (p.includes('unicorn') || p.includes('ükssarvik') || p.includes('ukssarvik')) {
            const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.8, 8), hornMat);
            horn.position.set(0, 5.4, 2.5);
            horn.rotation.x = Math.PI / 4;
            group.add(horn);
        }

        [-0.6, 0.6].forEach(lx => {
            [1.2, -1.2].forEach(lz => {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 2.2, 8), horseMat);
                leg.position.set(lx, 1.1, lz);
                group.add(leg);
            });
        });

    // 5. BEAR / KARU / PANDA
    } else if (p.includes('karu') || p.includes('bear') || p.includes('panda')) {
        const isPanda = p.includes('panda');
        const bearColor = isPanda ? 0xffffff : (p.includes('jääkaru') || p.includes('polar') ? 0xfafafa : 0x5d4037);
        const bearMat = new THREE.MeshStandardMaterial({ color: bearColor, roughness: 0.8 });
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.7 });

        const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 16), isPanda ? blackMat : bearMat);
        body.position.set(0, 1.8, 0);
        group.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(1.1, 14, 14), bearMat);
        head.position.set(0, 3.2, 0.8);
        group.add(head);

        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), bearMat);
        snout.position.set(0, 3.0, 1.8);
        group.add(snout);

        [-0.7, 0.7].forEach(x => {
            const ear = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), isPanda ? blackMat : bearMat);
            ear.position.set(x, 4.1, 0.7);
            group.add(ear);
        });

    // 6. BIRD / LIND / EAGLE / KOTKAS / PENGUIN / PINGVIIN / DUCK / PART
    } else if (p.includes('lind') || p.includes('bird') || p.includes('kotkas') || p.includes('eagle') || p.includes('pingviin') || p.includes('penguin') || p.includes('part') || p.includes('duck') || p.includes('öökull') || p.includes('owl')) {
        const isPenguin = p.includes('pingviin') || p.includes('penguin');
        const bodyMat = new THREE.MeshStandardMaterial({ color: isPenguin ? 0x1e272e : 0x3498db, roughness: 0.6 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
        const beakMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, roughness: 0.3 });

        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 2.2, 12), bodyMat);
        body.position.set(0, 1.4, 0);
        group.add(body);

        const belly = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.6, 0.3), whiteMat);
        belly.position.set(0, 1.4, 0.8);
        group.add(belly);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 12), bodyMat);
        head.position.set(0, 2.7, 0);
        group.add(head);

        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 4), beakMat);
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, 2.6, 0.9);
        group.add(beak);

        [-1.2, 1.2].forEach(x => {
            const wing = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.8), bodyMat);
            wing.position.set(x, 1.6, 0);
            wing.rotation.z = x < 0 ? 0.3 : -0.3;
            group.add(wing);
        });

    // 7. FISH / KALA / SHARK / HAI / WHALE / VAAL / DOLPHIN / DELFIIN
    } else if (p.includes('kala') || p.includes('fish') || p.includes('hai') || p.includes('shark') || p.includes('vaal') || p.includes('whale') || p.includes('delfiin') || p.includes('dolphin')) {
        const fishColor = p.includes('shark') || p.includes('hai') ? 0x7f8c8d : 0x00f2fe;
        const fishMat = new THREE.MeshStandardMaterial({ color: fishColor, roughness: 0.4, metalness: 0.2 });

        const body = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), fishMat);
        body.scale.set(0.8, 1.0, 2.6);
        body.position.set(0, 1.5, 0);
        group.add(body);

        // Dorsal Fin
        const fin = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 3), fishMat);
        fin.position.set(0, 2.8, 0);
        group.add(fin);

        // Tail Fin
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 1.2), fishMat);
        tail.position.set(0, 1.5, -3.2);
        group.add(tail);

    // 8. MOTORCYCLE / MOOTORRATAS / BIKE / JALGRATAS / SCOOTER
    } else if (p.includes('mootorratas') || p.includes('motorcycle') || p.includes('bike') || p.includes('krossikas') || p.includes('roller') || p.includes('scooter') || p.includes('jalgratas')) {
        const frameMat = new THREE.MeshStandardMaterial({ color: tint, metalness: 0.6, roughness: 0.3 });
        const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.9 });
        const chromeMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.9, roughness: 0.1 });

        // Two Wheels
        [-1.8, 1.8].forEach(z => {
            const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.22, 12, 24), tireMat);
            wheel.position.set(0, 0.7, z);
            group.add(wheel);
        });

        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 2.6), frameMat);
        frame.position.set(0, 1.2, 0);
        group.add(frame);

        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 1.0), new THREE.MeshStandardMaterial({ color: 0x2c3e50 }));
        seat.position.set(0, 1.65, -0.4);
        group.add(seat);

        const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 8), chromeMat);
        handlebar.rotation.z = Math.PI / 2;
        handlebar.position.set(0, 2.0, 1.4);
        group.add(handlebar);

        const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.9 }));
        headlight.position.set(0, 1.8, 2.0);
        group.add(headlight);

    // 9. TRAIN / RONG / LOCOMOTIVE / VEDUR / TRAM / TRAMM
    } else if (p.includes('rong') || p.includes('train') || p.includes('vedur') || p.includes('locomotive') || p.includes('tramm') || p.includes('tram')) {
        const trainMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.7 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.8 });

        const boiler = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 5.0, 16), metalMat);
        boiler.rotation.x = Math.PI / 2;
        boiler.position.set(0, 2.0, 0.5);
        group.add(boiler);

        const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.2, 2.8), trainMat);
        cab.position.set(0, 2.5, -2.5);
        group.add(cab);

        const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.6, 12), metalMat);
        chimney.position.set(0, 3.8, 2.0);
        group.add(chimney);

        // 6 Wheels
        [-1.3, 1.3].forEach(x => {
            [-2.2, 0, 2.2].forEach(z => {
                const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.3, 16), goldMat);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(x, 0.6, z);
                group.add(wheel);
            });
        });

    // 10. TRUCK / VEOAUTO / FIRETRUCK / TULETÕRJE / AMBULANCE / KIIRABI / POLICE / POLITSEI / TANK
    } else if (p.includes('veoauto') || p.includes('truck') || p.includes('tuletõrje') || p.includes('tuletorje') || p.includes('kiirabi') || p.includes('ambulance') || p.includes('politsei') || p.includes('police') || p.includes('tank')) {
        const isFire = p.includes('tulet');
        const isPolice = p.includes('politsei') || p.includes('police');
        const isTank = p.includes('tank');
        const truckColor = isTank ? 0x27ae60 : (isFire ? 0xe74c3c : (isPolice ? 0x2c3e50 : 0xf39c12));
        const bodyMat = new THREE.MeshStandardMaterial({ color: truckColor, roughness: 0.5 });
        const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.9 });

        const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.4), bodyMat);
        cab.position.set(0, 1.8, 1.8);
        group.add(cab);

        const bed = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 4.0), bodyMat);
        bed.position.set(0, 1.7, -1.6);
        group.add(bed);

        if (isTank) {
            const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 1.0, 12), bodyMat);
            turret.position.set(0, 3.2, 0);
            group.add(turret);

            const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 4.0, 8), new THREE.MeshStandardMaterial({ color: 0x1e272e }));
            cannon.rotation.x = Math.PI / 2;
            cannon.position.set(0, 3.3, 2.2);
            group.add(cannon);
        } else {
            // Flashing Siren Lightbar
            const sirenMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.9 });
            const siren = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.4), sirenMat);
            siren.position.set(0, 3.0, 1.8);
            group.add(siren);
        }

        [-1.3, 1.3].forEach(x => {
            [-2.4, -0.8, 1.8].forEach(z => {
                const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 12), tireMat);
                w.rotation.z = Math.PI / 2;
                w.position.set(x, 0.55, z);
                group.add(w);
            });
        });

    // 11. SPACESHIP / ROCKET / RAKETT / UFO / SATELLITE
    } else if (p.includes('rakett') || p.includes('rocket') || p.includes('kosmoselaev') || p.includes('spaceship') || p.includes('ufo') || p.includes('satellite') || p.includes('mars rover')) {
        const isUfo = p.includes('ufo');
        const hullMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.8, roughness: 0.2 });
        const glowMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.9 });

        if (isUfo) {
            const saucer = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 0.8, 0.8, 24), hullMat);
            saucer.position.set(0, 2.0, 0);
            group.add(saucer);

            const dome = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 16), glowMat);
            dome.position.set(0, 2.6, 0);
            group.add(dome);
        } else {
            const rocketBody = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.4, 6.5, 16), hullMat);
            rocketBody.position.set(0, 3.5, 0);
            group.add(rocketBody);

            const noseCone = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.2, 16), new THREE.MeshStandardMaterial({ color: 0xe74c3c }));
            noseCone.position.set(0, 7.8, 0);
            group.add(noseCone);

            for (let f = 0; f < 4; f++) {
                const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 1.4), new THREE.MeshStandardMaterial({ color: 0xe74c3c }));
                fin.position.set(Math.cos(f * Math.PI / 2) * 1.5, 1.2, Math.sin(f * Math.PI / 2) * 1.5);
                fin.rotation.y = f * Math.PI / 2;
                group.add(fin);
            }

            const exhaust = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.5, 12), new THREE.MeshStandardMaterial({ color: 0xffd32a, emissive: 0xff4500, emissiveIntensity: 0.9 }));
            exhaust.position.set(0, 0, 0);
            exhaust.rotation.x = Math.PI;
            group.add(exhaust);
        }

    // 12. VOLCANO / VULKAAN / MOUNTAIN / MÄGI / CAVE / KOOBAS
    } else if (p.includes('vulkaan') || p.includes('volcano') || p.includes('laava') || p.includes('lava') || p.includes('mägi') || p.includes('magi') || p.includes('mountain') || p.includes('koobas')) {
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 0.95 });
        const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff3838, emissive: 0xff3838, emissiveIntensity: 0.9, roughness: 0.2 });

        const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 6.5, 6.0, 16), rockMat);
        cone.position.set(0, 3.0, 0);
        group.add(cone);

        const crater = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.2, 0.4, 16), lavaMat);
        crater.position.set(0, 6.0, 0);
        group.add(crater);

    // 13. LIGHTHOUSE / TULETORN / WINDMILL / TUULEVESKI / TOWER / TORN
    } else if (p.includes('tuletorn') || p.includes('lighthouse') || p.includes('tuuleveski') || p.includes('windmill') || p.includes('torn') || p.includes('tower')) {
        const isWindmill = p.includes('tuuleveski') || p.includes('windmill');
        const towerMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, roughness: 0.6 });
        const redMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.5 });
        const lightMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, emissive: 0xffd32a, emissiveIntensity: 0.95 });

        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.2, 8.0, 12), towerMat);
        shaft.position.set(0, 4.0, 0);
        group.add(shaft);

        const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 1.8, 12), redMat);
        stripe.position.set(0, 4.5, 0);
        group.add(stripe);

        const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.5, 8), lightMat);
        lantern.position.set(0, 8.8, 0);
        group.add(lantern);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.0, 8), redMat);
        roof.position.set(0, 10.2, 0);
        group.add(roof);

        if (isWindmill) {
            for (let b = 0; b < 4; b++) {
                const blade = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.5, 0.08), new THREE.MeshStandardMaterial({ color: 0x8b4513 }));
                blade.position.set(Math.cos(b * Math.PI / 2) * 2.2, 8.5 + Math.sin(b * Math.PI / 2) * 2.2, 1.4);
                blade.rotation.z = b * Math.PI / 2;
                group.add(blade);
            }
        }

    // 14. TREEHOUSE / PUUONN / CABIN / PALKMAJA / TENT / TELK / IGLOO
    } else if (p.includes('puuonn') || p.includes('treehouse') || p.includes('palkmaja') || p.includes('cabin') || p.includes('telk') || p.includes('tent') || p.includes('igloo')) {
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.8 });
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.7 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 });

        if (p.includes('telk') || p.includes('tent')) {
            const tent = new THREE.Mesh(new THREE.ConeGeometry(2.5, 3.0, 4), new THREE.MeshStandardMaterial({ color: tint, roughness: 0.5 }));
            tent.position.set(0, 1.5, 0);
            tent.rotation.y = Math.PI / 4;
            group.add(tent);
        } else {
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 5.0, 10), woodMat);
            trunk.position.set(0, 2.5, 0);
            group.add(trunk);

            const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.4, 3.5), woodMat);
            cabin.position.set(0, 5.5, 0);
            group.add(cabin);

            const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2.0, 4), roofMat);
            roof.position.set(0, 7.5, 0);
            roof.rotation.y = Math.PI / 4;
            group.add(roof);

            const canopy = new THREE.Mesh(new THREE.SphereGeometry(3.0, 12, 12), leavesMat);
            canopy.position.set(0, 9.0, 0);
            group.add(canopy);
        }

    // 15. BRIDGE / SILD / TUNNEL
    } else if (p.includes('sild') || p.includes('bridge') || p.includes('tunnel')) {
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.8 });
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.9 });

        const deck = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.4, 12.0), roadMat);
        deck.position.set(0, 2.0, 0);
        group.add(deck);

        [-1.8, 1.8].forEach(x => {
            const railing = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 12.0), stoneMat);
            railing.position.set(x, 2.6, 0);
            group.add(railing);

            [-4.0, 4.0].forEach(z => {
                const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 2.0, 8), stoneMat);
                pillar.position.set(x, 1.0, z);
                group.add(pillar);
            });
        });

    // 16. FERRIS WHEEL / VAATERATAS / CAROUSEL / KARUSSELL / PLAYGROUND
    } else if (p.includes('vaateratas') || p.includes('ferris') || p.includes('karussell') || p.includes('carousel') || p.includes('mänguväljak') || p.includes('manguvaljak')) {
        const steelMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.7 });
        const neonMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.8 });

        const rim = new THREE.Mesh(new THREE.TorusGeometry(4.0, 0.15, 8, 32), neonMat);
        rim.position.set(0, 5.0, 0);
        group.add(rim);

        for (let s = 0; s < 8; s++) {
            const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 8.0, 6), steelMat);
            spoke.position.set(0, 5.0, 0);
            spoke.rotation.z = s * Math.PI / 4;
            group.add(spoke);

            const gondola = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xff7675 }));
            gondola.position.set(Math.cos(s * Math.PI / 4) * 4.0, 5.0 + Math.sin(s * Math.PI / 4) * 4.0, 0);
            group.add(gondola);
        }

    // 17. FOOD: PIZZA / BURGER / ICE CREAM / JÄÄTIS / CAKE / KOOK / APPLE / BANAAN
    } else if (p.includes('pizza') || p.includes('burger') || p.includes('jäätis') || p.includes('jaatis') || p.includes('ice cream') || p.includes('kook') || p.includes('cake') || p.includes('õun') || p.includes('oun') || p.includes('apple') || p.includes('banaan') || p.includes('banana')) {
        if (p.includes('pizza')) {
            const crustMat = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.8 });
            const cheeseMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.4 });
            const pepMat = new THREE.MeshStandardMaterial({ color: 0xc0392b });

            const crust = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.2, 24), crustMat);
            crust.position.set(0, 0.8, 0);
            group.add(crust);

            const cheese = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.22, 24), cheeseMat);
            cheese.position.set(0, 0.82, 0);
            group.add(cheese);

            for (let i = 0; i < 7; i++) {
                const pep = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.25, 8), pepMat);
                pep.position.set(Math.cos(i * 0.9) * 1.1, 0.85, Math.sin(i * 0.9) * 1.1);
                group.add(pep);
            }
        } else if (p.includes('burger')) {
            const bunMat = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.6 });
            const pattyMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });
            const cheeseMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f });
            const saladMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71 });

            const bunBottom = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.4, 16), bunMat);
            bunBottom.position.set(0, 0.4, 0);
            group.add(bunBottom);

            const patty = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.35, 16), pattyMat);
            patty.position.set(0, 0.75, 0);
            group.add(patty);

            const cheese = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1.8), cheeseMat);
            cheese.position.set(0, 0.95, 0);
            cheese.rotation.y = Math.PI / 6;
            group.add(cheese);

            const salad = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.1, 12), saladMat);
            salad.position.set(0, 1.05, 0);
            group.add(salad);

            const bunTop = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), bunMat);
            bunTop.position.set(0, 1.1, 0);
            group.add(bunTop);
        } else {
            // Layered Cake with candle
            const cakeMat = new THREE.MeshStandardMaterial({ color: 0xff7675, roughness: 0.5 });
            const creamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
            const candleMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, emissive: 0xffa502, emissiveIntensity: 0.9 });

            const base = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 1.0, 20), cakeMat);
            base.position.set(0, 0.8, 0);
            group.add(base);

            const topLayer = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.8, 16), creamMat);
            topLayer.position.set(0, 1.7, 0);
            group.add(topLayer);

            const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8), candleMat);
            candle.position.set(0, 2.5, 0);
            group.add(candle);
        }

    // 18. MUSIC: PIANO / KLAVER / GUITAR / KITARR / DRUMS / TRUMMID
    } else if (p.includes('klaver') || p.includes('piano') || p.includes('kitarr') || p.includes('guitar') || p.includes('trumm') || p.includes('drum')) {
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.2, metalness: 0.4 });
        const whiteKeyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
        const blackKeyMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.3 });

        const pianoBody = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.5, 2.2), woodMat);
        pianoBody.position.set(0, 1.8, 0);
        group.add(pianoBody);

        const keyboard = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.15, 0.8), whiteKeyMat);
        keyboard.position.set(0, 1.5, 0.9);
        group.add(keyboard);

        for (let k = -1.1; k <= 1.1; k += 0.3) {
            const bkey = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.5), blackKeyMat);
            bkey.position.set(k, 1.62, 0.8);
            group.add(bkey);
        }

        [-1.3, 1.3].forEach(x => {
            [-0.8, 0.8].forEach(z => {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 1.2, 8), woodMat);
                leg.position.set(x, 0.6, z);
                group.add(leg);
            });
        });

    // 19. FURNITURE / CHAIR / TABLE / BED / COMPUTER / TV
    } else if (p.includes('tool') || p.includes('chair') || p.includes('laud') || p.includes('table') || p.includes('voodi') || p.includes('bed') || p.includes('arvuti') || p.includes('computer') || p.includes('laptop') || p.includes('tv') || p.includes('televiisor')) {
        const mat = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.6 });
        const screenMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.8 });

        if (p.includes('arvuti') || p.includes('computer') || p.includes('tv') || p.includes('laptop')) {
            const table = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.2, 1.6), mat);
            table.position.set(0, 1.4, 0);
            group.add(table);

            const monitor = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.1), screenMat);
            monitor.position.set(0, 2.3, -0.4);
            group.add(monitor);

            const keyboard = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.5), new THREE.MeshStandardMaterial({ color: 0x1e272e }));
            keyboard.position.set(0, 1.53, 0.2);
            group.add(keyboard);

            [-1.3, 1.3].forEach(x => {
                [-0.6, 0.6].forEach(z => {
                    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6), mat);
                    leg.position.set(x, 0.7, z);
                    group.add(leg);
                });
            });
        } else {
            const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 1.6), mat);
            seat.position.set(0, 1.2, 0);
            group.add(seat);

            const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 0.2), mat);
            backrest.position.set(0, 2.1, -0.7);
            group.add(backrest);

            [-0.7, 0.7].forEach(x => {
                [-0.7, 0.7].forEach(z => {
                    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), mat);
                    leg.position.set(x, 0.6, z);
                    group.add(leg);
                });
            });
        }

    // 20. WEAPON: SWORD / MÕÕK / SHIELD / KILP / BOW / VIBU / CANNON / KAHUR / WAND / VÕLUKEPP
    } else if (p.includes('mõõk') || p.includes('mook') || p.includes('sword') || p.includes('kilp') || p.includes('shield') || p.includes('kahur') || p.includes('cannon') || p.includes('võlukepp') || p.includes('wand')) {
        const steelMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.9, roughness: 0.1 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.8, roughness: 0.3 });
        const magicMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.9 });

        if (p.includes('kilp') || p.includes('shield')) {
            const shield = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.2, 0.3, 16), steelMat);
            shield.rotation.x = Math.PI / 2;
            shield.position.set(0, 1.8, 0);
            group.add(shield);

            const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), goldMat);
            emblem.position.set(0, 1.8, 0.25);
            group.add(emblem);
        } else {
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.6, 0.08), steelMat);
            blade.position.set(0, 2.8, 0);
            group.add(blade);

            const tip = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 4), steelMat);
            tip.position.set(0, 5.0, 0);
            group.add(tip);

            const guard = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 0.3), goldMat);
            guard.position.set(0, 1.0, 0);
            group.add(guard);

            const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 8), new THREE.MeshStandardMaterial({ color: 0x795548 }));
            hilt.position.set(0, 0.45, 0);
            group.add(hilt);

            const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), magicMat);
            pommel.position.set(0, 0, 0);
            group.add(pommel);
        }

    // 21. TREASURE CHEST / AARDEKIRST / DIAMOND / TEEMANT / GOLD
    } else if (p.includes('aare') || p.includes('kirst') || p.includes('chest') || p.includes('teemant') || p.includes('diamond') || p.includes('kuld') || p.includes('gold')) {
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.8 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.9, roughness: 0.2, emissive: 0xffd32a, emissiveIntensity: 0.4 });
        const gemMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.9, metalness: 0.5 });

        const chestBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 1.6), woodMat);
        chestBase.position.set(0, 0.6, 0);
        group.add(chestBase);

        const chestLid = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.2, 12, 1, false, 0, Math.PI), woodMat);
        chestLid.rotation.z = Math.PI / 2;
        chestLid.position.set(0, 1.2, 0);
        group.add(chestLid);

        const lock = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.15), goldMat);
        lock.position.set(0, 1.0, 0.85);
        group.add(lock);

        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.6), gemMat);
        gem.position.set(0, 2.2, 0);
        group.add(gem);

    // 22. SATURN & PLANETS
    } else if (p.includes('saturn') || p.includes('planeet') || p.includes('planet') || p.includes('jupiter') || p.includes('mars') || p.includes('neptuun') || p.includes('kuu') || p.includes('moon') || p.includes('päike') || p.includes('sun')) {
        const saturnColor = p.includes('mars') ? 0xe74c3c : (p.includes('neptuun') ? 0x0984e3 : (p.includes('päike') || p.includes('sun') ? 0xffa502 : 0xf9ca24));
        const planetMat = new THREE.MeshStandardMaterial({ color: saturnColor, roughness: 0.7, metalness: 0.1, emissive: p.includes('päike') ? 0xffa502 : 0x000000, emissiveIntensity: 0.5 });
        const ringMat = new THREE.MeshStandardMaterial({ color: 0xf6e58d, side: THREE.DoubleSide, transparent: true, opacity: 0.85, roughness: 0.5 });

        const planetSphere = new THREE.Mesh(new THREE.SphereGeometry(2.4, 32, 32), planetMat);
        planetSphere.position.set(0, 3.5, 0);
        group.add(planetSphere);

        const innerRing = new THREE.Mesh(new THREE.RingGeometry(3.2, 4.6, 64), ringMat);
        innerRing.rotation.x = Math.PI / 2 + 0.45;
        innerRing.position.set(0, 3.5, 0);
        group.add(innerRing);

    // 23. DINOSAUR / DRAGON / MONSTER / COLLOSSAL BEAST
    } else if (p.includes('dino') || p.includes('t-rex') || p.includes('draakon') || p.includes('dragon') || p.includes('monster') || p.includes('koll') || p.includes('godzilla')) {
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.6 });
        const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.6 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, emissive: 0xe74c3c, emissiveIntensity: 0.6 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.5, 3.2), bodyMat);
        body.position.y = 2.0;
        group.add(body);

        const belly = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 0.4), bellyMat);
        belly.position.set(0, 1.8, 1.65);
        group.add(belly);

        const head = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 2.2), bodyMat);
        head.position.set(0, 3.8, 1.4);
        group.add(head);

        [-0.85, 0.85].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), eyeMat);
            eye.position.set(x, 4.1, 1.8);
            group.add(eye);
        });

        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.0, 5), bodyMat);
        tail.position.set(0, 1.8, -2.5);
        tail.rotation.x = -Math.PI / 3;
        group.add(tail);

        [-0.9, 0.9].forEach(x => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.9), bodyMat);
            leg.position.set(x, 0.8, 0);
            group.add(leg);
        });

    // 24. ROBOT / MECHA / CYBORG / ANDROID
    } else if (p.includes('robot') || p.includes('mecha') || p.includes('cyborg') || p.includes('android') || p.includes('mech')) {
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, metalness: 0.8, roughness: 0.3 });
        const coreMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.8 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, metalness: 0.6 });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 1.2), metalMat);
        torso.position.y = 2.2;
        group.add(torso);

        const core = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 8), coreMat);
        core.rotation.x = Math.PI / 2;
        core.position.set(0, 2.4, 0.65);
        group.add(core);

        const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.0), metalMat);
        head.position.set(0, 3.8, 0);
        group.add(head);

        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.2), coreMat);
        visor.position.set(0, 3.8, 0.55);
        group.add(visor);

        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8), goldMat);
        antenna.position.set(0, 4.6, 0);
        group.add(antenna);

        [-1.3, 1.3].forEach(x => {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.5), goldMat);
            arm.position.set(x, 2.0, 0);
            group.add(arm);
        });
        [-0.6, 0.6].forEach(x => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, 0.6), metalMat);
            leg.position.set(x, 0.7, 0);
            group.add(leg);
        });

    // 24.5 PAHALANE / BAD GUY / VILLAIN / ENEMY / BANDIT / KOLL
    } else if (p.includes('pahalane') || p.includes('kurikael') || p.includes('vaenlane') || p.includes('villain') || p.includes('enemy') || p.includes('bandit') || p.includes('röövel') || p.includes('roovel') || p.includes('skelett') || p.includes('zombie') || p.includes('zombi')) {
        const darkArmorMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, metalness: 0.8, roughness: 0.3 });
        const redEyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.0 });
        const hornMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.4 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 1.0), darkArmorMat);
        body.position.y = 2.1;
        group.add(body);

        const head = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), darkArmorMat);
        head.position.set(0, 3.7, 0);
        group.add(head);

        // Glowing red eyes
        [-0.25, 0.25].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), redEyeMat);
            eye.position.set(x, 3.8, 0.52);
            group.add(eye);
        });

        // Horns on helmet
        [-0.45, 0.45].forEach(x => {
            const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.9, 6), hornMat);
            horn.position.set(x, 4.4, 0);
            horn.rotation.z = (x > 0 ? -0.3 : 0.3);
            group.add(horn);
        });

        // Spiked battle weapon in hand
        const weapon = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 2.4, 8), darkArmorMat);
        weapon.position.set(1.2, 2.2, 0.4);
        weapon.rotation.x = Math.PI / 4;
        group.add(weapon);
        const spikeBall = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4), hornMat);
        spikeBall.position.set(1.2, 3.2, 1.4);
        group.add(spikeBall);

        [-0.5, 0.5].forEach(x => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.4, 0.55), darkArmorMat);
            leg.position.set(x, 0.7, 0);
            group.add(leg);
        });

    // 24.6 NPC / NBS / NON-PLAYER CHARACTER / KÜLAELANIK / QUEST GIVER
    } else if (p.includes('npc') || p.includes('nbs') || p.includes('tegelane') || p.includes('külaelanik') || p.includes('kulaelanik') || p.includes('villager') || p.includes('guide') || p.includes('quest giver') || p.includes('kaupmees') || p.includes('merchant')) {
        const tunicMat = new THREE.MeshStandardMaterial({ color: 0x3498db, roughness: 0.7 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.8 });
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, emissive: 0xffd32a, emissiveIntensity: 0.8 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 0.8), tunicMat);
        body.position.y = 2.0;
        group.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 12), skinMat);
        head.position.set(0, 3.5, 0);
        group.add(head);

        const hair = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 1.2), hairMat);
        hair.position.set(0, 4.0, 0);
        group.add(hair);

        // Floating Quest / Dialogue Icon above head
        const iconMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), goldMat);
        iconMesh.position.set(0, 4.8, 0);
        group.add(iconMesh);

        [-0.4, 0.4].forEach(x => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.3, 0.5), new THREE.MeshStandardMaterial({ color: 0x2c3e50 }));
            leg.position.set(x, 0.65, 0);
            group.add(leg);
        });

    // 25. CASTLE / FORTRESS / PYRAMID / TEMPLE
    } else if (p.includes('loss') || p.includes('castle') || p.includes('kindlus') || p.includes('fort') || p.includes('püramiid') || p.includes('pyramid') || p.includes('tempel') || p.includes('palace')) {
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 0.9 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x9b59b6, roughness: 0.5 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, emissive: 0xf1c40f, emissiveIntensity: 0.3 });

        if (p.includes('püramiid') || p.includes('pyramid')) {
            const pyr = new THREE.Mesh(new THREE.ConeGeometry(4.5, 5.0, 4), new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.8 }));
            pyr.position.y = 2.5;
            pyr.rotation.y = Math.PI / 4;
            group.add(pyr);
        } else {
            const keep = new THREE.Mesh(new THREE.BoxGeometry(4.0, 4.0, 4.0), stoneMat);
            keep.position.y = 2.0;
            group.add(keep);

            [-2.0, 2.0].forEach(tx => {
                [-2.0, 2.0].forEach(tz => {
                    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 5.5, 8), stoneMat);
                    tower.position.set(tx, 2.75, tz);
                    group.add(tower);

                    const troof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.0, 8), roofMat);
                    troof.position.set(tx, 6.2, tz);
                    group.add(troof);
                });
            });

            const gate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.4), goldMat);
            gate.position.set(0, 1.1, 2.05);
            group.add(gate);
        }

    // 25.5 TORNADO / TORNAADO / TWISTER / KEERIS 🌪️
    } else if (p.includes('tornaado') || p.includes('tornado') || p.includes('twister') || p.includes('keeris')) {
        const darkGrey = new THREE.MeshStandardMaterial({ color: 0x485460, roughness: 0.9, transparent: true, opacity: 0.88 });
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.95, transparent: true, opacity: 0.85 });
        const windMat = new THREE.MeshStandardMaterial({ color: 0xd2dae2, roughness: 0.5, transparent: true, opacity: 0.65 });
        
        const levels = [
            { rTop: 0.8, rBottom: 0.2, h: 2.2, y: 1.1, mat: blackMat },
            { rTop: 1.8, rBottom: 0.8, h: 2.6, y: 3.4, mat: darkGrey },
            { rTop: 3.2, rBottom: 1.8, h: 3.2, y: 6.2, mat: blackMat },
            { rTop: 5.0, rBottom: 3.2, h: 3.8, y: 9.6, mat: darkGrey },
            { rTop: 7.2, rBottom: 5.0, h: 4.4, y: 13.6, mat: blackMat }
        ];
        levels.forEach(lvl => {
            const cone = new THREE.Mesh(new THREE.CylinderGeometry(lvl.rTop, lvl.rBottom, lvl.h, 16, 1, true), lvl.mat);
            cone.position.y = lvl.y;
            group.add(cone);
        });

        for (let i = 0; i < 4; i++) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5 + i * 1.4, 0.15, 6, 20), windMat);
            ring.position.y = 2.0 + i * 3.0;
            ring.rotation.x = Math.PI / 2 + 0.15 * Math.sin(i);
            ring.rotation.y = 0.2 * i;
            group.add(ring);
        }

    // 25.6 AIRBUS A320 / REISILENNUK / PASSENGER AIRLINER ✈️
    } else if (p.includes('airbus') || p.includes('a320') || p.includes('boeing') || p.includes('reisilennuk') || p.includes('airliner')) {
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.3, metalness: 0.2 });
        const blueMat = new THREE.MeshStandardMaterial({ color: 0x00a8ff, roughness: 0.4 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x2f3640, metalness: 0.8 });
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x00d2d3, roughness: 0.2 });

        const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 14.0, 16), whiteMat);
        fuselage.rotation.x = Math.PI / 2;
        fuselage.position.set(0, 2.2, 0);
        group.add(fuselage);

        const nose = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), whiteMat);
        nose.position.set(0, 2.2, 7.0);
        group.add(nose);

        const cockpitGlass = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.4, 0.8), glassMat);
        cockpitGlass.position.set(0, 2.65, 6.8);
        cockpitGlass.rotation.x = -0.3;
        group.add(cockpitGlass);

        const leftWing = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.18, 2.4), whiteMat);
        leftWing.position.set(-4.5, 1.8, 0.5);
        leftWing.rotation.y = 0.25;
        group.add(leftWing);

        const rightWing = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.18, 2.4), whiteMat);
        rightWing.position.set(4.5, 1.8, 0.5);
        rightWing.rotation.y = -0.25;
        group.add(rightWing);

        [-3.2, 3.2].forEach(x => {
            const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 2.4, 14), blueMat);
            engine.rotation.x = Math.PI / 2;
            engine.position.set(x, 1.1, 0.8);
            group.add(engine);

            const intake = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 12), darkMat);
            intake.rotation.x = Math.PI / 2;
            intake.position.set(x, 1.1, 2.0);
            group.add(intake);
        });

        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.0, 2.4), blueMat);
        fin.position.set(0, 4.0, -6.0);
        fin.rotation.x = -0.35;
        group.add(fin);

        const hTail = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.12, 1.2), whiteMat);
        hTail.position.set(0, 3.0, -6.6);
        group.add(hTail);

    // 25.7 GLOWING CRYSTAL / KRISTALL 💎
    } else if (p.includes('kristall') || p.includes('crystal') || p.includes('gem') || p.includes('teemant') || p.includes('diamond')) {
        const cyanMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.8, roughness: 0.2 });
        const crystalMesh = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), cyanMat);
        crystalMesh.position.y = 1.4;
        group.add(crystalMesh);

        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.8 }));
        ped.position.y = 0.25;
        group.add(ped);

    // 25.8 SHOP KIOSK / POOD & VIP BUTTON 🏪
    } else if (p.includes('pood') || p.includes('shop') || p.includes('kiosk') || p.includes('kauplus') || p.includes('vip')) {
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.7 });
        const redCloth = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.5 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.8, roughness: 0.2 });

        const counter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.1, 1.2), woodMat);
        counter.position.set(0, 0.55, 0);
        group.add(counter);

        const roof = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.2, 2.2), redCloth);
        roof.position.set(0, 3.0, 0.2);
        group.add(roof);

        [[-1.8, -0.9], [1.8, -0.9], [-1.8, 0.9], [1.8, 0.9]].forEach(([px, pz]) => {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8), woodMat);
            post.position.set(px, 1.7, pz);
            group.add(post);
        });

        const vipBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.25, 12), goldMat);
        vipBtn.position.set(0.9, 1.22, 0);
        group.add(vipBtn);

    // 25.9 NPC / CHARACTER / TEGELANE 🧑
    } else if (p.includes('npc') || p.includes('tegelane') || p.includes('kodanik') || p.includes('kaupmees') || p.includes('villager') || p.includes('sõber') || p.includes('sober')) {
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.6 });
        const shirtColor = tint || 0x3498db;
        const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.7 });
        const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.8 });

        [-0.2, 0.2].forEach(lx => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.8, 0.3), pantsMat);
            leg.position.set(lx, 0.4, 0);
            group.add(leg);
        });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.75, 0.36), shirtMat);
        torso.position.set(0, 1.15, 0);
        group.add(torso);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), skinMat);
        head.position.set(0, 1.75, 0);
        group.add(head);

    // 26. AIRPLANE / JET / FIGHTER / AIRCRAFT / FLYING
    } else if (p.includes('lennuk') || p.includes('airplane') || p.includes('plane') || p.includes('jet') || p.includes('aircraft') || p.includes('hävitaja') || p.includes('havitaja') || p.includes('propeller') || p.includes('lendav')) {
        const planeColor = p.includes('red') || p.includes('punan') ? '#e74c3c' : (p.includes('gold') || p.includes('kuld') ? '#ffd32a' : (p.includes('black') || p.includes('must') ? '#1e272e' : '#3498db'));
        return createAirplane3DMesh(planeColor);

    // 27. SUBMARINE / SHIP / BOAT / LAEV / PAAT
    } else if (p.includes('allveelaev') || p.includes('submarine')) {
        const hullMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.5 });
        const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.4 });
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.5 });

        const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 5.0, 12), yellowMat);
        hull.rotation.x = Math.PI / 2;
        hull.position.y = 1.6;
        group.add(hull);

        const nose = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 12), yellowMat);
        nose.position.set(0, 1.6, 2.5);
        group.add(nose);

        const conningTower = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 1.6), hullMat);
        conningTower.position.set(0, 2.8, 0.2);
        group.add(conningTower);

        const periscope = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8), glassMat);
        periscope.position.set(0, 3.6, 0.5);
        group.add(periscope);

    } else if (p.includes('laev') || p.includes('ship') || p.includes('boat') || p.includes('paat') || p.includes('jaht') || p.includes('yacht') || p.includes('kiirpaat') || p.includes('speedboat') || p.includes('parv') || p.includes('raft') || p.includes('jetski')) {
        const boatColor = tint ? '#' + tint.toString(16).padStart(6, '0') : '#e74c3c';
        return createSpeedboat3DMesh(boatColor);

    // 28. ULTRA SMART UNIVERSAL PROCEDURAL SCULPTOR (Synthesizes ANY arbitrary object)
    } else {
        if (!allowFallback) {
            return null;
        }
        const colorPalette = [0x9b59b6, 0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0xe67e22, 0x1abc9c, 0xff7675];
        const chosenColor = tint || colorPalette[Math.abs(hashString(name)) % colorPalette.length];
        const mainMat = new THREE.MeshStandardMaterial({ color: chosenColor, roughness: 0.35, metalness: 0.35 });
        const glowMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.75 });
        const accentMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.8, roughness: 0.2 });

        const base = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.4, 0.5, 12), new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.7 }));
        base.position.y = 0.25;
        group.add(base);

        const core = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 1), mainMat);
        core.position.y = 2.0;
        group.add(core);

        const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.16, 8, 28), glowMat);
        ring.position.y = 2.0;
        ring.rotation.x = Math.PI / 3;
        group.add(ring);

        const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), accentMat);
        crown.position.y = 3.8;
        group.add(crown);
    }

    return group;
}