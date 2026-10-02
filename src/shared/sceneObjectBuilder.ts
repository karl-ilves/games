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
