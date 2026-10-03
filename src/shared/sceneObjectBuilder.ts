import * as THREE from 'three';

export interface SceneObjectInput {
    id?: string;
    catalogId?: string;
    name?: string;
    category?: string;
    type?: string;
    shapeType?: string;
    position?: { x: number; y: number; z: number } | [number, number, number];
    rotation?: { x: number; y: number; z: number } | [number, number, number];
    scale?: { x: number; y: number; z: number } | [number, number, number];
    color?: string | number;
    material?: string;
    opacity?: number;
    transparent?: boolean;
    dimensions?: { width?: number; height?: number; depth?: number };
    customModelData?: any;
    isPassable?: boolean;
    isAirplane?: boolean;
    isBoat?: boolean;
    isHazard?: boolean;
    isSpawnPoint?: boolean;
    gameItemType?: string;
    textureUrl?: string;
}

export function extractVec3(v: any, defaultX = 0, defaultY = 0, defaultZ = 0): { x: number; y: number; z: number } {
    if (Array.isArray(v)) {
        return {
            x: Number(v[0]) || defaultX,
            y: Number(v[1]) || defaultY,
            z: Number(v[2]) || defaultZ
        };
    }
    if (v && typeof v === 'object') {
        return {
            x: Number(v.x) || defaultX,
            y: Number(v.y) || defaultY,
            z: Number(v.z) || defaultZ
        };
    }
    return { x: defaultX, y: defaultY, z: defaultZ };
}

export function createWedgeGeometry(width: number, height: number, depth: number): THREE.BufferGeometry {
    const hw = Math.max(0.1, width) / 2;
    const hd = Math.max(0.1, depth) / 2;
    const h = Math.max(0.1, height);
    const vertices = new Float32Array([
        // Front face (triangle)
        -hw, 0, -hd,   hw, 0, -hd,   -hw, h, -hd,
        // Back face (triangle)
        hw, 0, hd,   -hw, 0, hd,   hw, h, hd,
        // Slope / Ramp face (2 triangles)
        -hw, h, -hd,   hw, h, -hd,   -hw, 0, hd,
        hw, h, -hd,    hw, 0, hd,        -hw, 0, hd,
        // Bottom face (2 triangles)
        -hw, 0, -hd,   -hw, 0, hd,    hw, 0, hd,
        -hw, 0, -hd,   hw, 0, hd,     hw, 0, -hd,
        // Left vertical back/side face (2 triangles)
        -hw, 0, -hd,   -hw, h, -hd,  -hw, 0, hd,
        hw, h, hd,  hw, h, -hd,  hw, 0, -hd
    ]);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    return geo;
}

export function createObjectMaterial(obj: SceneObjectInput, defaultColor = 0x00f2fe): THREE.Material {
    const col = obj.color !== undefined ? obj.color : defaultColor;
    const matType = (obj.material || 'standard').toLowerCase();
    const opacity = obj.opacity !== undefined ? obj.opacity : 1.0;
    const transparent = obj.transparent || opacity < 1.0;

    let mat: THREE.MeshStandardMaterial;

    if (matType === 'glass') {
        mat = new THREE.MeshStandardMaterial({
            color: col,
            roughness: 0.1,
            metalness: 0.1,
            transparent: true,
            opacity: Math.min(opacity, 0.45)
        });
    } else if (matType === 'neon') {
        mat = new THREE.MeshStandardMaterial({
            color: col,
            emissive: col,
            emissiveIntensity: 0.85,
            roughness: 0.2
        });
    } else if (matType === 'metal' || matType === 'gold') {
        mat = new THREE.MeshStandardMaterial({
            color: col,
            roughness: 0.25,
            metalness: 0.85
        });
    } else if (matType === 'wood') {
        mat = new THREE.MeshStandardMaterial({
            color: col || 0x8b5a2b,
            roughness: 0.8,
            metalness: 0.05
        });
    } else if (matType === 'stone') {
        mat = new THREE.MeshStandardMaterial({
            color: col || 0x7f8c8d,
            roughness: 0.9,
            metalness: 0.1
        });
    } else if (matType === 'wireframe') {
        return new THREE.MeshBasicMaterial({
            color: col,
            wireframe: true
        });
    } else {
        mat = new THREE.MeshStandardMaterial({
            color: col,
            roughness: 0.5,
            metalness: 0.2,
            transparent,
            opacity
        });
    }

    if (obj.textureUrl && typeof document !== 'undefined') {
        try {
            const img = new Image();
            const canvasTexture = new THREE.CanvasTexture(img);
            img.onload = () => {
                canvasTexture.needsUpdate = true;
                canvasTexture.wrapS = THREE.RepeatWrapping;
                canvasTexture.wrapT = THREE.RepeatWrapping;
                mat.map = canvasTexture;
                mat.needsUpdate = true;
            };
            img.src = obj.textureUrl;
        } catch (e) {
            console.warn('Could not apply texture in sceneObjectBuilder:', e);
        }
    }

    return mat;
}

export function buildSceneObjectMesh(obj: SceneObjectInput): THREE.Group {
    const group = new THREE.Group();
    const name = (obj.name || '').toLowerCase();
    const catalogId = (obj.catalogId || '').toLowerCase();
    const category = (obj.category || '').toLowerCase();
    const type = (obj.type || obj.shapeType || '').toLowerCase();
    const gameItemType = (obj.gameItemType || '').toLowerCase();

    const w = obj.dimensions?.width || 2;
    const h = obj.dimensions?.height || 2;
    const d = obj.dimensions?.depth || 2;

    const material = createObjectMaterial(obj);

    // 1. Custom Model Data (Workbench models & multi-part shapes)
    if (obj.customModelData) {
        const cmd = obj.customModelData;
        if (Array.isArray(cmd.parts) && cmd.parts.length > 0) {
            cmd.parts.forEach((p: any) => {
                const partMesh = buildSingleShapeMesh(p, p.color || obj.color);
                const pPos = extractVec3(p.position, 0, 0, 0);
                partMesh.position.set(pPos.x, pPos.y, pPos.z);
                if (p.rotationY) partMesh.rotation.y = p.rotationY;
                group.add(partMesh);
            });
            return setupGroupTransforms(group, obj);
        } else if (cmd.shapeType) {
            const single = buildSingleShapeMesh(cmd, cmd.color || obj.color);
            group.add(single);
            return setupGroupTransforms(group, obj);
        }
    }

    // 2. Specific 3D Geometry Types
    if (type === 'box' || type === 'cube' || type === 'block') {
        const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
        box.position.y = h / 2;
        group.add(box);
        return setupGroupTransforms(group, obj);
    }
    if (type === 'cylinder') {
        const radius = Math.min(w, d) / 2;
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, h, 24), material);
        cyl.position.y = h / 2;
        group.add(cyl);
        return setupGroupTransforms(group, obj);
    }
    if (type === 'sphere') {
        const radius = Math.min(w, h, d) / 2;
        const sph = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 20), material);
        sph.position.y = radius;
        group.add(sph);
        return setupGroupTransforms(group, obj);
    }
    if (type === 'cone') {
        const radius = Math.min(w, d) / 2;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, h, 24), material);
        cone.position.y = h / 2;
        group.add(cone);
        return setupGroupTransforms(group, obj);
    }
    if (type === 'wedge') {
        const wedge = new THREE.Mesh(createWedgeGeometry(w, h, d), material);
        group.add(wedge);
        return setupGroupTransforms(group, obj);
    }
    if (type === 'plane' || type === 'floor') {
        const plane = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), material);
        plane.position.y = 0.1;
        group.add(plane);
        return setupGroupTransforms(group, obj);
    }

    // 3. Procedural creature / named-animal (dog, cat, rabbit, bear, horse, bird, fish, etc.)
    const creatureMesh = buildProceduralCreatureMesh(name || catalogId);
    if (creatureMesh) {
        return setupGroupTransforms(creatureMesh, obj);
    }

    // 4. Vehicles (Airplane, Speedboat, Car)
    if (obj.isAirplane || /(plane|lennuk|jet|fighter|propeller|helicopter|kopter)/i.test(name)) {
        return setupGroupTransforms(createAirplane3DMesh(obj.color ? String(obj.color) : '#3498db'), obj);
    }
    if (obj.isBoat || /(boat|paat|laev|ship|speedboat|kaater)/i.test(name)) {
        return setupGroupTransforms(createSpeedboat3DMesh(obj.color ? String(obj.color) : '#e74c3c'), obj);
    }
    if (category === 'vehicles' || /(car|auto|truck|veok|supercar|cruiser|buggy|roadster)/i.test(name)) {
        return setupGroupTransforms(createCar3DMesh(material), obj);
    }

    // 5. Gameplay & Interactive Elements
    // Lava Hazard Floor Plate (with glowing lava center & dark obsidian border - matches Creator Studio exactly)
    if (/(lava|laava)/i.test(name) || /(lava)/i.test(catalogId) || (obj.isHazard && !/(spike|blade|laser|trap)/i.test(name))) {
        return setupGroupTransforms(createLavaFloorPlateMesh(obj.color), obj);
    }

    // Spike Trap Plate
    if (/(spike|oda|blade|tera|laser|trap|lõks)/i.test(name)) {
        return setupGroupTransforms(createSpikeTrapMesh(), obj);
    }

    // Medkit / Health Case
    if (/(medkit|heart|heal|elud|potion|ravim)/i.test(name)) {
        return setupGroupTransforms(createMedkitCaseMesh(), obj);
    }

    // Portal / Dimension Gate
    if (/(portal|teleport|värav|gate)/i.test(name) && !/(checkpoint|arch|flag)/i.test(name)) {
        return setupGroupTransforms(createPortalRingMesh(), obj);
    }

    // Coin / Ring
    if (gameItemType === 'coin' || /(coin|münt|kuldraha)/i.test(name) || /(coin|münt)/i.test(catalogId)) {
        return setupGroupTransforms(createCoinMesh(), obj);
    }

    // Booster / Jump Pad
    if (/(booster|jump|hüpe)/i.test(name) || (/(pad)/i.test(name) && !/(platform|platvorm|spawn)/i.test(name))) {
        return setupGroupTransforms(createBoosterPadMesh(material), obj);
    }

    // 6. Spawn Points & Checkpoints
    if (category === 'spawn' || /(spawn|alguspunkt)/i.test(name) || /(spawn)/i.test(catalogId) || obj.isSpawnPoint) {
        if (/(flag|lipp|checkpoint)/i.test(name) || /(flag|lipp)/i.test(catalogId)) {
            return setupGroupTransforms(createCheckpointFlagMesh(), obj);
        }
        if (/(buoy|poi)/i.test(name)) {
            return setupGroupTransforms(createBuoyMesh(), obj);
        }
        if (/(seabed|süvavee|diving)/i.test(name)) {
            return setupGroupTransforms(createSeabedMesh(), obj);
        }
        if (/(torii)/i.test(name)) {
            return setupGroupTransforms(createToriiGateMesh(), obj);
        }
        if (/(altar|throne|troon)/i.test(name)) {
            return setupGroupTransforms(createAltarThroneMesh(), obj);
        }
        if (/(invisible|nähtamatu)/i.test(name)) {
            return setupGroupTransforms(group, obj);
        }
        return setupGroupTransforms(createSpawnPadMesh(obj.color || 0x00f2fe), obj);
    }

    // Checkpoint Flag Post (even if category wasn't explicitly 'spawn')
    if (/(flag|lipp)/i.test(name) || /(flag|lipp)/i.test(catalogId)) {
        return setupGroupTransforms(createCheckpointFlagMesh(), obj);
    }

    // 7. Nature & Scenery
    if (/(pine|mänd)/i.test(name) || /(pine)/i.test(catalogId)) {
        return setupGroupTransforms(createPineTreeMesh(material), obj);
    }
    if (/(rock|kivi|boulder|kalju)/i.test(name) || /(rock|kivi)/i.test(catalogId)) {
        return setupGroupTransforms(createRockMesh(material), obj);
    }
    if (category === 'nature' || /(tree|puu|mets|palm|tamm|oak)/i.test(name) || /(tree|puu)/i.test(catalogId)) {
        return setupGroupTransforms(createTreeMesh(material), obj);
    }

    // 8. City, Roads & Buildings
    if (/(road|tee|crossroad|overpass|ristmik|highway)/i.test(name)) {
        return setupGroupTransforms(createRoadMesh(), obj);
    }
    if (/(skyscraper|pilvelõhkuja|tower)/i.test(name) && !/(power|core)/i.test(name)) {
        return setupGroupTransforms(createSkyscraperMesh(material), obj);
    }
    if (/(house|maja|kodu)/i.test(name)) {
        return setupGroupTransforms(createHouseMesh(material), obj);
    }

    // 9. Generic Platforms, Blocks, Walls & Crates
    if (/(platform|platvorm)/i.test(name) || /(platform)/i.test(catalogId)) {
        const pw = Math.max(3, w);
        const ph = Math.min(0.6, h);
        const pd = Math.max(3, d);
        const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd), material);
        boxMesh.position.y = ph / 2;
        group.add(boxMesh);
        return setupGroupTransforms(group, obj);
    }

    if (/(wall|sein|barrier|tõke)/i.test(name)) {
        const bw = Math.max(4, w);
        const bh = Math.max(3, h);
        const bd = Math.min(0.6, d);
        const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), material);
        boxMesh.position.y = bh / 2;
        group.add(boxMesh);
        return setupGroupTransforms(group, obj);
    }

    if (/(block|plokk|cube|kuup|box|kast|crate|brick|tellis|pillar|sammas|obstacle|takistus)/i.test(name) ||
        /(block|plokk|cube|box|crate|obstacle)/i.test(catalogId) ||
        category === 'architecture') {
        const bw = Math.max(2, w);
        const bh = Math.max(2, h);
        const bd = Math.max(2, d);
        const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), material);
        boxMesh.position.y = bh / 2;
        group.add(boxMesh);
        return setupGroupTransforms(group, obj);
    }

    // 10. Sci-Fi Structures
    if (category === 'scifi' || /(cyber|quantum|neon|plasma|obelisk)/i.test(name)) {
        return setupGroupTransforms(createSciFiMesh(material), obj);
    }

    // Checkpoint Gate / Arch fallback
    if (/(arch|kaar|värav)/i.test(name)) {
        return setupGroupTransforms(createCheckpointArchMesh(material), obj);
    }

    // Default Fallback: Clean 3D Box
    const defaultBox = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    defaultBox.position.y = h / 2;
    group.add(defaultBox);

    return setupGroupTransforms(group, obj);
}

function buildSingleShapeMesh(part: any, fallbackColor: any = 0x00f2fe): THREE.Group {
    const grp = new THREE.Group();
    const w = Math.max(0.2, part.width || 2);
    const h = Math.max(0.2, part.height || 2);
    const d = Math.max(0.2, part.depth || 2);
    const col = part.color || fallbackColor;

    let mat: THREE.MeshStandardMaterial;
    if (part.isHazard) {
        mat = new THREE.MeshStandardMaterial({ color: 0xff3838, emissive: 0xd63031, emissiveIntensity: 0.6 });
    } else if (part.isHeal) {
        mat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, emissive: 0x27ae60, emissiveIntensity: 0.5 });
    } else if (part.isBoost) {
        mat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, emissive: 0xe67e22, emissiveIntensity: 0.6 });
    } else {
        mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.2 });
    }

    const st = (part.shapeType || 'box').toLowerCase();
    let mesh: THREE.Mesh;

    switch (st) {
        case 'wedge': {
            mesh = new THREE.Mesh(createWedgeGeometry(w, part.topElevation || h, d), mat);
            break;
        }
        case 'cylinder': {
            const rad = Math.min(w, d) / 2;
            mesh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, h, 24), mat);
            mesh.position.y = h / 2;
            break;
        }
        case 'pyramid': {
            const rad = Math.max(w, d) / 2;
            mesh = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 4), mat);
            mesh.rotation.y = Math.PI / 4;
            mesh.position.y = h / 2;
            break;
        }
        case 'dome': {
            const rad = Math.min(w, d) / 2;
            mesh = new THREE.Mesh(new THREE.SphereGeometry(rad, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat);
            break;
        }
        case 'sphere': {
            const rad = Math.min(w, h, d) / 2;
            mesh = new THREE.Mesh(new THREE.SphereGeometry(rad, 24, 20), mat);
            mesh.scale.set(w / (rad * 2), h / (rad * 2), d / (rad * 2));
            mesh.position.y = h / 2;
            break;
        }
        case 'cone': {
            const rad = Math.min(w, d) / 2;
            mesh = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 24), mat);
            mesh.position.y = h / 2;
            break;
        }
        case 'torus': {
            const rad = Math.min(w, d) / 2;
            const tube = Math.max(0.08, Math.min(rad * 0.35, h / 3));
            mesh = new THREE.Mesh(new THREE.TorusGeometry(Math.max(0.1, rad - tube), tube, 16, 32), mat);
            mesh.rotation.x = Math.PI / 2;
            mesh.position.y = h / 2;
            break;
        }
        case 'diamond': {
            const rad = Math.min(w, d) / 2;
            mesh = new THREE.Mesh(new THREE.OctahedronGeometry(rad), mat);
            mesh.position.y = h / 2;
            break;
        }
        default: {
            mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            mesh.position.y = h / 2;
            break;
        }
    }

    grp.add(mesh);
    return grp;
}

function setupGroupTransforms(group: THREE.Group, obj: SceneObjectInput): THREE.Group {
    const pos = extractVec3(obj.position, 0, 0, 0);
    const rot = extractVec3(obj.rotation, 0, 0, 0);
    const scl = extractVec3(obj.scale, 1, 1, 1);

    group.position.set(pos.x, pos.y, pos.z);
    group.rotation.set(rot.x, rot.y, rot.z);
    group.scale.set(scl.x, scl.y, scl.z);

    group.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    return group;
}

/**
 * buildProceduralCreatureMesh — Builds a proper 3D mesh for animals and procedural
 * objects based on name keywords. Mirrors the Creator Studio's createCustomProceduralMesh
 * so that published games render the same 3D shapes as the editor.
 *
 * Returns null if the name doesn't match any known creature/procedural pattern.
 */
export function buildProceduralCreatureMesh(nameOrId: string): THREE.Group | null {
    const p = (nameOrId || '').toLowerCase();
    const group = new THREE.Group();

    // RABBIT / JÄNES / BUNNY
    if (p.includes('jänes') || p.includes('janes') || p.includes('rabbit') || p.includes('bunny') || p.includes('hare') || p.includes('janku')) {
        const furMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.8 });
        const earInnerMat = new THREE.MeshStandardMaterial({ color: 0xffb8b8, roughness: 0.5 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.2 });
        const noseMat = new THREE.MeshStandardMaterial({ color: 0xff7675 });

        const body = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 16), furMat);
        body.scale.set(1.0, 1.2, 1.3); body.position.set(0, 1.2, 0); group.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 16), furMat);
        head.position.set(0, 2.2, 0.6); group.add(head);
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), noseMat);
        nose.position.set(0, 2.15, 1.3); group.add(nose);
        [-0.35, 0.35].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), eyeMat);
            eye.position.set(x, 2.35, 1.15); group.add(eye);
        });
        [-0.3, 0.3].forEach(x => {
            const earOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 1.5, 8), furMat);
            earOuter.position.set(x, 3.4, 0.5); earOuter.rotation.z = (x < 0 ? 0.15 : -0.15); group.add(earOuter);
            const earInner = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 1.2, 8), earInnerMat);
            earInner.position.set(x, 3.4, 0.62); earInner.rotation.z = (x < 0 ? 0.15 : -0.15); group.add(earInner);
        });
        const tail = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), furMat);
        tail.position.set(0, 1.0, -1.3); group.add(tail);
        [-0.45, 0.45].forEach(x => {
            const fp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), furMat);
            fp.scale.set(0.8, 0.6, 1.4); fp.position.set(x, 0.2, 0.6); group.add(fp);
            const bp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), furMat);
            bp.scale.set(0.9, 0.7, 1.6); bp.position.set(x, 0.25, -0.4); group.add(bp);
        });
        return group;
    }

    // DOG / KOER / WOLF / HUNT / FOX / REBANE / PUPPY
    if (p.includes('koer') || p.includes('dog') || p.includes('kutsik') || p.includes('puppy') || p.includes('wolf') || p.includes('hunt') || p.includes('fox') || p.includes('rebane')) {
        const coatColor = p.includes('fox') || p.includes('rebane') ? 0xe67e22 : (p.includes('wolf') || p.includes('hunt') ? 0x7f8c8d : 0xc0392b);
        const coatMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.7 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.8 });
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.3 });
        const collarMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.4 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.5, 2.8), coatMat);
        body.position.set(0, 1.5, 0); group.add(body);
        const chest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.4), whiteMat);
        chest.position.set(0, 1.5, 1.3); group.add(chest);
        const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.3), coatMat);
        head.position.set(0, 2.5, 1.4); group.add(head);
        const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.0), whiteMat);
        muzzle.position.set(0, 2.3, 2.2); group.add(muzzle);
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), blackMat);
        nose.position.set(0, 2.5, 2.7); group.add(nose);
        [-0.35, 0.35].forEach(x => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), blackMat);
            eye.position.set(x, 2.7, 1.95); group.add(eye);
            const ear = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 4), coatMat);
            ear.position.set(x, 3.3, 1.3); group.add(ear);
        });
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.08, 6, 16), collarMat);
        collar.position.set(0, 2.0, 1.2); collar.rotation.x = Math.PI / 3; group.add(collar);
        [-0.5, 0.5].forEach(lx => {
            [0.9, -0.9].forEach(lz => {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.4, 8), coatMat);
                leg.position.set(lx, 0.7, lz); group.add(leg);
            });
        });
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.3, 6), coatMat);
        tail.position.set(0, 2.0, -1.8); tail.rotation.x = -Math.PI / 4; group.add(tail);
        return group;
    }

    // CAT / KASS / LION / LÕVI / TIGER / TIIGER
    if (p.includes('kass') || p.includes('cat') || p.includes('kiisu') || p.includes('kitten') || p.includes('lion') || p.includes('lõvi') || p.includes('lovi') || p.includes('tiger') || p.includes('tiiger')) {
        const furColor = p.includes('lion') || p.includes('lõvi') ? 0xf39c12 : (p.includes('tiger') || p.includes('tiiger') ? 0xe67e22 : 0x2c3e50);
        const furMat = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.6 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, emissive: 0x2ecc71, emissiveIntensity: 0.6 });

        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 2.4, 12), furMat);
        body.rotation.x = Math.PI / 2; body.position.set(0, 1.2, 0); group.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 12), furMat);
        head.position.set(0, 1.8, 1.3); group.add(head);
        [-0.3, 0.3].forEach(x => {
            const ear = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 3), furMat);
            ear.position.set(x, 2.4, 1.3); group.add(ear);
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), eyeMat);
            eye.position.set(x, 1.9, 1.85); group.add(eye);
        });
        const snout = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), whiteMat);
        snout.position.set(0, 1.7, 1.9); group.add(snout);
        [-0.4, 0.4].forEach(lx => {
            [0.7, -0.7].forEach(lz => {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.1, 8), furMat);
                leg.position.set(lx, 0.55, lz); group.add(leg);
            });
        });
        const tail = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.1, 6, 12, Math.PI), furMat);
        tail.position.set(0, 1.4, -1.5); tail.rotation.y = Math.PI / 2; group.add(tail);
        return group;
    }

    // HORSE / HOBUNE / UNICORN / ÜKSSARVIK / PEGASUS
    if (p.includes('hobune') || p.includes('horse') || p.includes('ükssarvik') || p.includes('ukssarvik') || p.includes('unicorn') || p.includes('pegas')) {
        const horseColor = (p.includes('unicorn') || p.includes('ükssarvik')) ? 0xffffff : 0x8b4513;
        const horseMat = new THREE.MeshStandardMaterial({ color: horseColor, roughness: 0.6 });
        const hornMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.8, emissive: 0xffd32a, emissiveIntensity: 0.8 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 3.4), horseMat);
        body.position.set(0, 2.2, 0); group.add(body);
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 2.0, 8), horseMat);
        neck.position.set(0, 3.4, 1.5); neck.rotation.x = -Math.PI / 6; group.add(neck);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 1.6), horseMat);
        head.position.set(0, 4.4, 2.0); head.rotation.x = Math.PI / 8; group.add(head);
        if (p.includes('unicorn') || p.includes('ükssarvik') || p.includes('ukssarvik')) {
            const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.8, 8), hornMat);
            horn.position.set(0, 5.4, 2.5); horn.rotation.x = Math.PI / 4; group.add(horn);
        }
        [-0.6, 0.6].forEach(lx => {
            [1.2, -1.2].forEach(lz => {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 2.2, 8), horseMat);
                leg.position.set(lx, 1.1, lz); group.add(leg);
            });
        });
        return group;
    }

    // BEAR / KARU / PANDA
    if (p.includes('karu') || p.includes('bear') || p.includes('panda')) {
        const isPanda = p.includes('panda');
        const bearColor = isPanda ? 0xffffff : (p.includes('jääkaru') || p.includes('polar') ? 0xfafafa : 0x5d4037);
        const bearMat = new THREE.MeshStandardMaterial({ color: bearColor, roughness: 0.8 });
        const blackMat2 = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.7 });

        const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 16), isPanda ? blackMat2 : bearMat);
        body.position.set(0, 1.8, 0); group.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(1.1, 14, 14), bearMat);
        head.position.set(0, 3.2, 0.8); group.add(head);
        const snout2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), bearMat);
        snout2.position.set(0, 3.0, 1.8); group.add(snout2);
        [-0.7, 0.7].forEach(x => {
            const ear2 = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), isPanda ? blackMat2 : bearMat);
            ear2.position.set(x, 4.1, 0.7); group.add(ear2);
        });
        return group;
    }

    // BIRD / LIND / EAGLE / KOTKAS / PENGUIN / PINGVIIN / DUCK / PART / OWL / ÖÖKULL
    if (p.includes('lind') || p.includes('bird') || p.includes('kotkas') || p.includes('eagle') || p.includes('pingviin') || p.includes('penguin') || p.includes('part') || p.includes('duck') || p.includes('öökull') || p.includes('owl')) {
        const isPenguin = p.includes('pingviin') || p.includes('penguin');
        const bodyMat = new THREE.MeshStandardMaterial({ color: isPenguin ? 0x1e272e : 0x3498db, roughness: 0.6 });
        const whiteMat2 = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
        const beakMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, roughness: 0.3 });

        const body2 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 2.2, 12), bodyMat);
        body2.position.set(0, 1.4, 0); group.add(body2);
        const belly = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.6, 0.3), whiteMat2);
        belly.position.set(0, 1.4, 0.8); group.add(belly);
        const birdHead = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 12), bodyMat);
        birdHead.position.set(0, 2.7, 0); group.add(birdHead);
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 4), beakMat);
        beak.rotation.x = Math.PI / 2; beak.position.set(0, 2.6, 0.9); group.add(beak);
        [-1.2, 1.2].forEach(x => {
            const wing = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.8), bodyMat);
            wing.position.set(x, 1.6, 0); wing.rotation.z = x < 0 ? 0.3 : -0.3; group.add(wing);
        });
        return group;
    }

    // FISH / KALA / SHARK / HAI / WHALE / VAAL / DOLPHIN / DELFIIN
    if (p.includes('kala') || p.includes('fish') || p.includes('hai') || p.includes('shark') || p.includes('vaal') || p.includes('whale') || p.includes('delfiin') || p.includes('dolphin')) {
        const fishColor = p.includes('shark') || p.includes('hai') ? 0x7f8c8d : 0x00f2fe;
        const fishMat = new THREE.MeshStandardMaterial({ color: fishColor, roughness: 0.4, metalness: 0.2 });

        const fishBody = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), fishMat);
        fishBody.scale.set(0.8, 1.0, 2.6); fishBody.position.set(0, 1.5, 0); group.add(fishBody);
        const dorsalFin = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 3), fishMat);
        dorsalFin.position.set(0, 2.8, 0); group.add(dorsalFin);
        const fishTail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 1.2), fishMat);
        fishTail.position.set(0, 1.5, -3.2); group.add(fishTail);
        return group;
    }

    // SNAKE / MADU / COBRA
    if (p.includes('madu') || p.includes('snake') || p.includes('cobra') || p.includes('python')) {
        const snakeMat = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.6 });
        const snakeHead = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 10), snakeMat);
        snakeHead.position.set(0, 2.5, 1.5); group.add(snakeHead);
        for (let i = 0; i < 6; i++) {
            const seg = new THREE.Mesh(new THREE.SphereGeometry(0.4 - i * 0.03, 8, 8), snakeMat);
            seg.position.set(Math.sin(i * 0.8) * 0.7, 1.2 - i * 0.15, -i * 0.7); group.add(seg);
        }
        return group;
    }

    // CROCODILE / KROKODILL / ALLIGATOR
    if (p.includes('krokodill') || p.includes('crocodile') || p.includes('alligator')) {
        const crocMat = new THREE.MeshStandardMaterial({ color: 0x1a7a2a, roughness: 0.8 });
        const crocBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 4.5), crocMat);
        crocBody.position.set(0, 0.6, 0); group.add(crocBody);
        const crocHead2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 2.0), crocMat);
        crocHead2.position.set(0, 0.65, 3.0); group.add(crocHead2);
        const snout3 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 1.6), crocMat);
        snout3.position.set(0, 0.55, 4.1); group.add(snout3);
        [-0.6, 0.6].forEach(x => {
            [1.5, -1.5].forEach(z => {
                const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 8), crocMat);
                limb.rotation.z = Math.PI / 2; limb.position.set(x < 0 ? -1.2 : 1.2, 0.2, z); group.add(limb);
            });
        });
        return group;
    }

    // ELEPHANT / ELEVANT
    if (p.includes('elevant') || p.includes('elephant')) {
        const eleMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.7 });
        const eleBody = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 16), eleMat);
        eleBody.position.set(0, 2.5, 0); group.add(eleBody);
        const eleHead = new THREE.Mesh(new THREE.SphereGeometry(1.4, 14, 14), eleMat);
        eleHead.position.set(0, 4.2, 1.5); group.add(eleHead);
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 3.0, 12), eleMat);
        trunk.rotation.x = Math.PI / 3; trunk.position.set(0, 3.4, 3.2); group.add(trunk);
        [-1.2, 1.2].forEach(x => {
            const ear3 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 8), eleMat);
            ear3.scale.set(0.25, 1.0, 1.1); ear3.position.set(x, 4.2, 1.0); group.add(ear3);
        });
        [-0.9, 0.9].forEach(lx => {
            [1.0, -1.0].forEach(lz => {
                const eleleg = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 2.5, 8), eleMat);
                eleleg.position.set(lx, 1.25, lz); group.add(eleleg);
            });
        });
        return group;
    }

    // GIRAFFE / KAELKIRJAK
    if (p.includes('kaelkirjak') || p.includes('giraffe')) {
        const girMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, roughness: 0.7 });
        const girBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 2.8), girMat);
        girBody.position.set(0, 2.0, 0); group.add(girBody);
        const girNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.7, 5.5, 8), girMat);
        girNeck.position.set(0, 5.5, 0.8); group.add(girNeck);
        const girHead = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 1.5), girMat);
        girHead.position.set(0, 8.5, 1.2); group.add(girHead);
        [-0.6, 0.6].forEach(lx => {
            [0.9, -0.9].forEach(lz => {
                const girleg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 2.0, 8), girMat);
                girleg.position.set(lx, 0.9, lz); group.add(girleg);
            });
        });
        return group;
    }

    // MONKEY / AHV / APE / GORILLA
    if (p.includes('ahv') || p.includes('monkey') || p.includes('gorilla') || p.includes('ape') || p.includes('chimp')) {
        const monkeyMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 });
        const faceMat = new THREE.MeshStandardMaterial({ color: 0xd3a176, roughness: 0.7 });

        const monkeyBody = new THREE.Mesh(new THREE.SphereGeometry(1.2, 14, 14), monkeyMat);
        monkeyBody.scale.set(1.0, 1.3, 1.0); monkeyBody.position.set(0, 1.5, 0); group.add(monkeyBody);
        const monkeyHead = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 12), monkeyMat);
        monkeyHead.position.set(0, 2.8, 0.3); group.add(monkeyHead);
        const muzzle4 = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 10), faceMat);
        muzzle4.scale.set(1.0, 0.8, 0.9); muzzle4.position.set(0, 2.65, 1.1); group.add(muzzle4);
        [-0.45, 0.45].forEach(x => {
            const ear4 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), monkeyMat);
            ear4.position.set(x, 3.3, 0.2); group.add(ear4);
        });
        // Long arms
        [-0.9, 0.9].forEach(x => {
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 2.0, 8), monkeyMat);
            arm.rotation.z = x < 0 ? 0.5 : -0.5; arm.position.set(x * 1.5, 1.5, 0); group.add(arm);
        });
        [-0.5, 0.5].forEach(x => {
            const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 1.5, 8), monkeyMat);
            leg2.position.set(x, 0.6, 0); group.add(leg2);
        });
        return group;
    }

    // ROBOT / ROBOT / MASIN
    if (p.includes('robot') || p.includes('masin') || p.includes('android') || p.includes('cyborg')) {
        const steelMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.8, roughness: 0.2 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.7, roughness: 0.3 });
        const glowMat2 = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.9 });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.4, 1.2), steelMat);
        torso.position.set(0, 2.0, 0); group.add(torso);
        const robotHead = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.2), steelMat);
        robotHead.position.set(0, 3.7, 0); group.add(robotHead);
        [-0.35, 0.35].forEach(ex => {
            const eye5 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.15), glowMat2);
            eye5.position.set(ex, 3.75, 0.63); group.add(eye5);
        });
        [-1.3, 1.3].forEach(x => {
            const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.0, 0.5), darkMat);
            arm2.position.set(x, 2.0, 0); group.add(arm2);
        });
        [-0.5, 0.5].forEach(x => {
            const leg3 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.0, 0.7), darkMat);
            leg3.position.set(x, 0.7, 0); group.add(leg3);
        });
        return group;
    }

    // DRAGON / DRAAKON
    if (p.includes('draakon') || p.includes('dragon') || p.includes('lohe')) {
        const dragonMat = new THREE.MeshStandardMaterial({ color: 0x8e44ad, roughness: 0.5, metalness: 0.3 });
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x6c3483, roughness: 0.4, transparent: true, opacity: 0.85 });
        const eyeMat6 = new THREE.MeshStandardMaterial({ color: 0xffd32a, emissive: 0xffd32a, emissiveIntensity: 0.9 });

        const dBody = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 4.5, 12), dragonMat);
        dBody.rotation.x = Math.PI / 2; dBody.position.set(0, 2.2, 0); group.add(dBody);
        const dHead = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 2.0), dragonMat);
        dHead.position.set(0, 3.0, 2.8); group.add(dHead);
        const dSnout = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 1.6), dragonMat);
        dSnout.position.set(0, 2.8, 4.1); group.add(dSnout);
        [-0.5, 0.5].forEach(x => {
            const dEye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), eyeMat6);
            dEye.position.set(x, 3.3, 3.3); group.add(dEye);
        });
        [-2.5, 2.5].forEach(x => {
            const wing = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.12, 3.0), wingMat);
            wing.position.set(x, 3.0, -0.5); wing.rotation.z = x < 0 ? 0.5 : -0.5; group.add(wing);
        });
        const dTail = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.6, 4.0, 8), dragonMat);
        dTail.rotation.x = Math.PI / 4; dTail.position.set(0, 1.8, -3.5); group.add(dTail);
        return group;
    }

    // No match — caller will use default box
    return null;
}

// =========================================================================
// --- 🎨 Detailed Catalog 3D Procedural Mesh Builders (Shared across Hub, Play & Creator) ---
// =========================================================================

export function createLavaFloorPlateMesh(customColor?: string | number): THREE.Group {
    const grp = new THREE.Group();
    const col = customColor ? (typeof customColor === 'string' ? new THREE.Color(customColor).getHex() : Number(customColor)) : 0xff3b30;
    const lavaMat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: 0xff2d00,
        emissiveIntensity: 0.9,
        roughness: 0.3
    });
    const lavaPlate = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 3.4), lavaMat);
    lavaPlate.position.y = 0.07;
    grp.add(lavaPlate);

    const rimMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.9 });
    [-1.7, 1.7].forEach(rx => {
        const rim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 3.6), rimMat);
        rim.position.set(rx, 0.1, 0);
        grp.add(rim);
    });
    [-1.7, 1.7].forEach(rz => {
        const rim = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.22, 0.2), rimMat);
        rim.position.set(0, 0.1, rz);
        grp.add(rim);
    });
    return grp;
}

export function createCheckpointFlagMesh(): THREE.Group {
    const grp = new THREE.Group();
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 0.15, 16), new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.8 }));
    stand.position.y = 0.07;
    grp.add(stand);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.4, 12), new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: 0.7, roughness: 0.3 }));
    pole.position.y = 1.7;
    grp.add(pole);

    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.8, roughness: 0.2 }));
    finial.position.y = 3.4;
    grp.add(finial);

    const flagGeo = new THREE.BoxGeometry(1.3, 0.75, 0.04);
    const flagMesh = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: 0xff4757, roughness: 0.5 }));
    flagMesh.position.set(0.65, 2.8, 0);
    grp.add(flagMesh);
    return grp;
}

export function createSpikeTrapMesh(): THREE.Group {
    const grp = new THREE.Group();
    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.14, 3.0), new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.8, roughness: 0.3 }));
    basePlate.position.y = 0.07;
    grp.add(basePlate);

    const spikeMat = new THREE.MeshStandardMaterial({ color: 0xff3838, metalness: 0.8, roughness: 0.2 });
    [-0.9, 0, 0.9].forEach(sx => {
        [-0.9, 0, 0.9].forEach(sz => {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 4), spikeMat);
            spike.position.set(sx, 0.45, sz);
            grp.add(spike);
        });
    });
    return grp;
}

export function createMedkitCaseMesh(): THREE.Group {
    const grp = new THREE.Group();
    const caseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.85, 0.7), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
    caseMesh.position.y = 0.5;
    grp.add(caseMesh);

    const crossMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, emissive: 0xc0392b, emissiveIntensity: 0.5 });
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.2, 0.75), crossMat);
    crossH.position.y = 0.5;
    grp.add(crossH);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.75), crossMat);
    crossV.position.y = 0.5;
    grp.add(crossV);
    return grp;
}

export function createPortalRingMesh(): THREE.Group {
    const grp = new THREE.Group();
    const portalFrame = new THREE.Mesh(new THREE.TorusGeometry(2, 0.28, 16, 32), new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x8e44ad, emissiveIntensity: 0.7 }));
    portalFrame.position.y = 2.2;
    grp.add(portalFrame);

    const portalDisc = new THREE.Mesh(new THREE.CircleGeometry(1.75, 32), new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    portalDisc.position.y = 2.2;
    grp.add(portalDisc);
    return grp;
}

export function createCoinMesh(): THREE.Group {
    const grp = new THREE.Group();
    const coinMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0xf39c12,
        emissiveIntensity: 0.35
    });
    const coin = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.18, 12, 24), coinMat);
    coin.position.y = 1.2;
    grp.add(coin);
    return grp;
}

export function createBoosterPadMesh(material: THREE.Material): THREE.Group {
    const grp = new THREE.Group();
    const pad = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 3), material);
    pad.position.y = 0.1;
    grp.add(pad);
    return grp;
}

export function createSpawnPadMesh(matColor: any = 0x00f2fe): THREE.Group {
    const grp = new THREE.Group();
    const baseRim = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.75, 0.2, 32), new THREE.MeshStandardMaterial({ color: 0x1e272e, metalness: 0.7, roughness: 0.3 }));
    baseRim.position.y = 0.1;
    grp.add(baseRim);

    const col = typeof matColor === 'string' ? new THREE.Color(matColor).getHex() : Number(matColor);
    const neonCore = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.24, 32), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8, roughness: 0.2 }));
    neonCore.position.y = 0.12;
    grp.add(neonCore);

    [-1.35, 1.35].forEach(ex => {
        [-1.35, 1.35].forEach(ez => {
            const node = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.25), new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.9 }));
            node.position.set(ex, 0.2, ez);
            grp.add(node);
        });
    });
    return grp;
}

export function createToriiGateMesh(): THREE.Group {
    const grp = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.7 });
    [-1.4, 1.4].forEach(tx => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 3.6, 12), woodMat);
        col.position.set(tx, 1.8, 0);
        grp.add(col);
    });
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.28, 0.35), woodMat);
    top.position.set(0, 3.7, 0);
    grp.add(top);
    return grp;
}

export function createAltarThroneMesh(): THREE.Group {
    const grp = new THREE.Group();
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfdcb6e, metalness: 0.8, roughness: 0.3 });
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 2.6), goldMat);
    s1.position.y = 0.1;
    grp.add(s1);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 1.8), goldMat);
    s2.position.y = 0.3;
    grp.add(s2);
    return grp;
}

export function createBuoyMesh(): THREE.Group {
    const grp = new THREE.Group();
    const buoyBody = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.65, 1.3, 16), new THREE.MeshStandardMaterial({ color: 0xff7675, roughness: 0.4 }));
    buoyBody.position.y = 0.5;
    grp.add(buoyBody);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0x2d3436 }));
    mast.position.y = 1.6;
    grp.add(mast);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffd32a }));
    beacon.position.y = 2.3;
    grp.add(beacon);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 8, 24), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.5;
    grp.add(collar);
    return grp;
}

export function createSeabedMesh(): THREE.Group {
    const grp = new THREE.Group();
    const basePad = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.35, 8), new THREE.MeshStandardMaterial({ color: 0x1b2838, metalness: 0.8, roughness: 0.4 }));
    basePad.position.y = 0.17;
    grp.add(basePad);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 16), new THREE.MeshStandardMaterial({ color: 0x0984e3, transparent: true, opacity: 0.75, emissive: 0x00cec9, emissiveIntensity: 0.5 }));
    dome.position.y = 0.8;
    grp.add(dome);
    [-1.5, 1.5].forEach(lx => {
        const light = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.9 }));
        light.position.set(lx, 0.5, 0);
        grp.add(light);
    });
    return grp;
}

export function createPineTreeMesh(material: THREE.Material): THREE.Group {
    const grp = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.5), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
    trunk.position.y = 0.75;
    grp.add(trunk);
    const leaves1 = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.2, 7), material);
    leaves1.position.y = 2.2;
    grp.add(leaves1);
    const leaves2 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.8, 7), material);
    leaves2.position.y = 3.2;
    grp.add(leaves2);
    return grp;
}

export function createRockMesh(material: THREE.Material): THREE.Group {
    const grp = new THREE.Group();
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 1), material);
    rock.position.y = 0.9;
    rock.scale.set(1.2, 0.9, 1.1);
    grp.add(rock);
    return grp;
}

export function createTreeMesh(material: THREE.Material): THREE.Group {
    const grp = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2), new THREE.MeshStandardMaterial({ color: 0x4e342e }));
    trunk.position.y = 1.0;
    grp.add(trunk);
    const foliage = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), material);
    foliage.position.y = 2.8;
    grp.add(foliage);
    return grp;
}

export function createRoadMesh(): THREE.Group {
    const grp = new THREE.Group();
    const road = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 14), new THREE.MeshStandardMaterial({ color: 0x22272e, roughness: 0.85 }));
    road.position.y = 0.06;
    grp.add(road);
    for (let s = -4.8; s <= 4.8; s += 2.4) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 1.4), new THREE.MeshStandardMaterial({ color: 0xffd32a, roughness: 0.4 }));
        stripe.position.set(0, 0.07, s);
        grp.add(stripe);
    }
    [-3.6, 3.6].forEach(ex => {
        const edgeLine = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 14), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        edgeLine.position.set(ex, 0.07, 0);
        grp.add(edgeLine);
    });
    return grp;
}

export function createSkyscraperMesh(material: THREE.Material): THREE.Group {
    const grp = new THREE.Group();
    const tower = new THREE.Mesh(new THREE.BoxGeometry(3, 16, 3), material);
    tower.position.y = 8;
    grp.add(tower);
    return grp;
}

export function createHouseMesh(material: THREE.Material): THREE.Group {
    const grp = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4), material);
    base.position.y = 1.5;
    grp.add(base);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.8, 4), new THREE.MeshStandardMaterial({ color: 0xc0392b }));
    roof.position.y = 3.9;
    roof.rotation.y = Math.PI / 4;
    grp.add(roof);
    return grp;
}

export function createCar3DMesh(material: THREE.Material): THREE.Group {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.75, 4.2), material);
    body.position.y = 0.65;
    grp.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.65, 2.2), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.8 }));
    cabin.position.set(0, 1.25, -0.2);
    grp.add(cabin);

    const headlightMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff4757 });
    [-0.7, 0.7].forEach(hx => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), headlightMat);
        hl.position.set(hx, 0.65, -2.12);
        grp.add(hl);
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), taillightMat);
        tl.position.set(hx, 0.65, 2.12);
        grp.add(tl);
    });
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
    [-1.15, 1.15].forEach(x => {
        [-1.35, 1.35].forEach(z => {
            const w = new THREE.Mesh(wheelGeo, wheelMat);
            w.position.set(x, 0.4, z);
            grp.add(w);
        });
    });
    return grp;
}

export function createAirplane3DMesh(color = '#3498db'): THREE.Group {
    const grp = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.4 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.4, metalness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.8 });
    const engineMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, metalness: 0.8 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    const fuselageGeo = new THREE.CylinderGeometry(0.75, 0.8, 6.2, 16);
    fuselageGeo.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuselageGeo, bodyMat);
    fuselage.position.y = 1.3;
    grp.add(fuselage);

    const noseGeo = new THREE.ConeGeometry(0.75, 1.8, 16);
    noseGeo.rotateX(-Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.set(0, 1.3, -3.95);
    grp.add(nose);

    const cockpitGeo = new THREE.SphereGeometry(0.65, 16, 16);
    cockpitGeo.scale(0.8, 0.75, 1.8);
    const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
    cockpit.position.set(0, 1.8, -1.2);
    grp.add(cockpit);

    const wingGeo = new THREE.BoxGeometry(9.2, 0.12, 1.8);
    const mainWings = new THREE.Mesh(wingGeo, wingMat);
    mainWings.position.set(0, 1.25, -0.4);
    grp.add(mainWings);

    [-4.55, 4.55].forEach((wx, idx) => {
        const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.8), bodyMat);
        winglet.position.set(wx, 1.55, -0.4);
        grp.add(winglet);

        const navLightMat = new THREE.MeshBasicMaterial({ color: idx === 0 ? 0xff4757 : 0x2ecc71 });
        const navLight = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), navLightMat);
        navLight.position.set(wx, 1.95, -0.4);
        grp.add(navLight);
    });

    const tailFinGeo = new THREE.BoxGeometry(0.14, 1.7, 1.6);
    const tailFin = new THREE.Mesh(tailFinGeo, bodyMat);
    tailFin.position.set(0, 2.3, 2.6);
    tailFin.rotation.x = -0.3;
    grp.add(tailFin);

    const tailWingGeo = new THREE.BoxGeometry(3.4, 0.1, 1.1);
    const tailWings = new THREE.Mesh(tailWingGeo, wingMat);
    tailWings.position.set(0, 1.45, 2.8);
    grp.add(tailWings);

    [-2.0, 2.0].forEach(ex => {
        const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 2.1, 12), engineMat);
        engine.rotateX(Math.PI / 2);
        engine.position.set(ex, 0.8, -0.3);
        grp.add(engine);

        const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.15, 12), glowMat);
        exhaust.rotateX(Math.PI / 2);
        exhaust.position.set(ex, 0.8, 0.8);
        grp.add(exhaust);
    });

    const frontGear = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 12), wheelMat);
    frontGear.rotateZ(Math.PI / 2);
    frontGear.position.set(0, 0.24, -2.4);
    grp.add(frontGear);

    [-1.3, 1.3].forEach(gx => {
        const rearGear = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.2, 12), wheelMat);
        rearGear.rotateZ(Math.PI / 2);
        rearGear.position.set(gx, 0.26, 0.8);
        grp.add(rearGear);
    });

    return grp;
}

export function createSpeedboat3DMesh(color = '#e74c3c'): THREE.Group {
    const grp = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.4 });
    const deckMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.4 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x2f3640, roughness: 0.7 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, roughness: 0.1, transparent: true, opacity: 0.65 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdcdde1, metalness: 0.9, roughness: 0.1 });

    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 5.8), hullMat);
    hull.position.set(0, 0.45, 0);
    grp.add(hull);

    const bow = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.2, 4), hullMat);
    bow.rotation.x = Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(0, 0.45, -3.4);
    grp.add(bow);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 5.0), deckMat);
    deck.position.set(0, 0.92, -0.2);
    grp.add(deck);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.65, 0.1), glassMat);
    windshield.position.set(0, 1.25, -1.2);
    windshield.rotation.x = -0.35;
    grp.add(windshield);

    [-1.02, 1.02].forEach(sideX => {
        const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 1.6), glassMat);
        sideWindow.position.set(sideX, 1.15, -0.4);
        grp.add(sideWindow);
    });

    [-0.5, 0.5].forEach(seatX => {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.5, 0.65), darkMat);
        seat.position.set(seatX, 1.05, -0.3);
        grp.add(seat);
    });

    const motor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.8), darkMat);
    motor.position.set(0, 0.7, 3.1);
    grp.add(motor);

    const propShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8), chromeMat);
    propShaft.position.set(0, 0.1, 3.2);
    grp.add(propShaft);

    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 6, 12), chromeMat);
    wheel.position.set(0.48, 1.2, -0.9);
    wheel.rotation.x = -0.5;
    grp.add(wheel);

    grp.userData.isBoat = true;
    return grp;
}

export function createCheckpointArchMesh(material: THREE.Material): THREE.Group {
    const grp = new THREE.Group();
    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4), material);
    leftPost.position.set(-2, 2, 0);
    grp.add(leftPost);
    const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4), material);
    rightPost.position.set(2, 2, 0);
    grp.add(rightPost);
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.4, 0.4), material);
    topBeam.position.set(0, 4, 0);
    grp.add(topBeam);
    return grp;
}

export function createSciFiMesh(material: THREE.Material): THREE.Group {
    const grp = new THREE.Group();
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), material);
    core.position.y = 2.0;
    grp.add(core);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.6, 6), new THREE.MeshStandardMaterial({ color: 0x1e272e }));
    base.position.y = 0.3;
    grp.add(base);
    return grp;
}

