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

    // 3. Semantic keyword checks:
    // Plokid, kuubid, platvormid, kastid, seinad, trepid, tellised
    const isBlockOrPlatform = /(block|plokk|cube|kuup|box|kast|platform|platvorm|wall|sein|crate|floor|põrand|ground|maapind|step|aste|stairs|trepp|brick|tellis|pillar|sammas|obstacle|takistus|barrier|tõke|pad|surface|plate)/i.test(name) ||
        /(block|plokk|cube|box|platform|wall|crate|obstacle)/i.test(catalogId) ||
        category === 'architecture' ||
        category === 'city' && /(building|maja|wall|sein|house|room)/i.test(name);

    if (isBlockOrPlatform) {
        let bw = w, bh = h, bd = d;
        if (/(platform|platvorm|pad|surface)/i.test(name)) {
            bw = Math.max(3, w);
            bh = Math.min(0.6, h);
            bd = Math.max(3, d);
        } else if (/(wall|sein|barrier)/i.test(name)) {
            bw = Math.max(4, w);
            bh = Math.max(3, h);
            bd = Math.min(0.6, d);
        } else if (/(crate|kast|cube|kuup|block|plokk)/i.test(name)) {
            bw = Math.max(2, w);
            bh = Math.max(2, h);
            bd = Math.max(2, d);
        }
        const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), material);
        boxMesh.position.y = bh / 2;
        group.add(boxMesh);
        return setupGroupTransforms(group, obj);
    }

    // Coins / Rings / Kuldraha (ONLY if explicitly coin)
    const isCoin = gameItemType === 'coin' || /(coin|münt|kuldraha)/i.test(name) || /(coin|münt)/i.test(catalogId);
    if (isCoin) {
        const coinMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.9,
            roughness: 0.2,
            emissive: 0xf39c12,
            emissiveIntensity: 0.35
        });
        const coin = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.18, 12, 24), coinMat);
        coin.position.y = 1.2;
        group.add(coin);
        return setupGroupTransforms(group, obj);
    }

    // Puud / Trees / Loodus
    const isTree = category === 'nature' || /(tree|puu|pine|mänd|oak|tamm|mets|palm)/i.test(name) || /(tree|puu)/i.test(catalogId);
    if (isTree) {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.8), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
        trunk.position.y = 0.9;
        group.add(trunk);

        const foliage = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.4, 8), material);
        foliage.position.y = 2.6;
        group.add(foliage);
        return setupGroupTransforms(group, obj);
    }

    // Kivid / Rocks
    const isRock = /(rock|kivi|boulder|kalju)/i.test(name) || /(rock|kivi)/i.test(catalogId);
    if (isRock) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 1), material);
        rock.position.y = 0.9;
        group.add(rock);
        return setupGroupTransforms(group, obj);
    }

    // Sõidukid / Vehicles
    if (obj.isAirplane || /(plane|lennuk|jet)/i.test(name)) {
        const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 4.5, 12), material);
        fuselage.rotation.x = Math.PI / 2;
        fuselage.position.y = 1.0;
        group.add(fuselage);

        const wings = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 1.2), material);
        wings.position.set(0, 1.0, 0.2);
        group.add(wings);
        return setupGroupTransforms(group, obj);
    }

    if (obj.isBoat || /(boat|paat|laev|ship)/i.test(name)) {
        const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 4.5), material);
        hull.position.y = 0.4;
        group.add(hull);
        return setupGroupTransforms(group, obj);
    }

    if (category === 'vehicles' || /(car|auto|truck|veok)/i.test(name)) {
        const carBody = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 4), material);
        carBody.position.y = 0.7;
        group.add(carBody);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 2), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        cabin.position.set(0, 1.35, -0.2);
        group.add(cabin);
        return setupGroupTransforms(group, obj);
    }

    // Lava / Trap / Hazard
    if (obj.isHazard || /(lava|tuli)/i.test(name)) {
        const lava = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.15, 3.5), new THREE.MeshStandardMaterial({
            color: 0xff3b30,
            emissive: 0xff2d00,
            emissiveIntensity: 0.9,
            roughness: 0.3
        }));
        lava.position.y = 0.08;
        group.add(lava);
        return setupGroupTransforms(group, obj);
    }

    // Portaal / Portal
    if (/(portal|teleport|värav)/i.test(name)) {
        const portal = new THREE.Mesh(new THREE.TorusGeometry(2, 0.25, 16, 32), new THREE.MeshStandardMaterial({
            color: 0xa855f7,
            emissive: 0x8e44ad,
            emissiveIntensity: 0.8
        }));
        portal.position.y = 2.2;
        group.add(portal);
        return setupGroupTransforms(group, obj);
    }

    // Spawn point
    if (obj.isSpawnPoint || /(spawn|alguspunkt)/i.test(name)) {
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.2, 24), new THREE.MeshStandardMaterial({
            color: 0x00f2fe,
            emissive: 0x00f2fe,
            emissiveIntensity: 0.5
        }));
        pad.position.y = 0.1;
        group.add(pad);
        return setupGroupTransforms(group, obj);
    }

    // Procedural creature / named-object fallback (dog, cat, rabbit, bear, horse, bird, fish, etc.)
    const creatureMesh = buildProceduralCreatureMesh(name || catalogId);
    if (creatureMesh) {
        creatureMesh.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        const pos = extractVec3(obj.position, 0, 0, 0);
        const rot = extractVec3(obj.rotation, 0, 0, 0);
        const scl = extractVec3(obj.scale, 1, 1, 1);
        creatureMesh.position.set(pos.x, pos.y, pos.z);
        creatureMesh.rotation.set(rot.x, rot.y, rot.z);
        creatureMesh.scale.set(scl.x, scl.y, scl.z);
        return creatureMesh;
    }

    // Default Fallback: Always a SOLID 3D CUBE / BLOCK!
    // Never an unexpected ring!
    const defaultBox = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), material);
    defaultBox.position.y = 1;
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
