/**
 * PlayardSpatialGeometryEngine
 * 3D Spatial Geometry, Transformations, Materials, Spacing & Quantity Calculations
 */

export interface SpatialDimensions {
    width: number;
    height: number;
    depth: number;
}

export interface MaterialProperties {
    material: 'standard' | 'metal' | 'wood' | 'glass' | 'neon' | 'stone' | 'gold' | 'hologram' | 'wireframe';
    roughness?: number;
    metalness?: number;
    transparent?: boolean;
    opacity?: number;
    emissive?: number;
}

export interface ParsedSpatialCommand {
    action: 'modify' | 'distribute' | 'batch_modify' | 'clone' | 'delete' | 'group' | 'symmetry';
    targetSelector?: string; // e.g. 'sein', 'puu', 'lamp', 'maja', 'all'
    count?: number;
    spacing?: number;
    layout?: 'line' | 'circle' | 'grid' | 'mirror';
    color?: number;
    material?: MaterialProperties;
    opacity?: number;
    transparent?: boolean;
    scale?: [number, number, number];
    dimensions?: SpatialDimensions;
    shape?: 'box' | 'sphere' | 'cylinder' | 'cone' | 'pyramid' | 'plane';
    rotation?: [number, number, number]; // in radians
    position?: [number, number, number];
    offset?: [number, number, number];
    groupId?: string;
    preCalculatedInfo?: string;
}

export class PlayardSpatialGeometryEngine {
    // Color name lookup in Estonian & English
    public static readonly COLOR_MAP: Record<string, number> = {
        'punane': 0xef4444,
        'punaseks': 0xef4444,
        'red': 0xef4444,
        'sinine': 0x3b82f6,
        'siniseks': 0x3b82f6,
        'blue': 0x3b82f6,
        'helesinine': 0x38bdf8,
        'helesiniseks': 0x38bdf8,
        'tumesinine': 0x1e3a8a,
        'roheline': 0x22c55e,
        'roheliseks': 0x22c55e,
        'green': 0x22c55e,
        'kollane': 0xeab308,
        'kollaseks': 0xeab308,
        'yellow': 0xeab308,
        'kuldne': 0xf59e0b,
        'kuldseks': 0xf59e0b,
        'gold': 0xf59e0b,
        'hõbedane': 0x94a3b8,
        'hõbedaseks': 0x94a3b8,
        'silver': 0x94a3b8,
        'must': 0x111827,
        'mustaks': 0x111827,
        'black': 0x111827,
        'valge': 0xffffff,
        'valgeks': 0xffffff,
        'white': 0xffffff,
        'hall': 0x6b7280,
        'halliks': 0x6b7280,
        'gray': 0x6b7280,
        'grey': 0x6b7280,
        'oranž': 0xf97316,
        'oranžiks': 0xf97316,
        'orantž': 0xf97316,
        'orange': 0xf97316,
        'lilla': 0xa855f7,
        'lillaks': 0xa855f7,
        'purple': 0xa855f7,
        'roosa': 0xec4899,
        'roosaks': 0xec4899,
        'pink': 0xec4899,
        'pruun': 0x854d0e,
        'pruuniks': 0x854d0e,
        'brown': 0x854d0e,
        'neoon': 0x00ffcc,
        'neooniks': 0x00ffcc,
        'neon': 0x00ffcc
    };

    /**
     * Parses a color name or hex code into a number
     */
    public static parseColor(str: string): number | null {
        const clean = str.toLowerCase().trim().replace(/^#/g, '');
        if (this.COLOR_MAP[clean]) {
            return this.COLOR_MAP[clean];
        }
        if (/^[0-9a-f]{6}$/i.test(clean)) {
            return parseInt(clean, 16);
        }
        for (const [name, val] of Object.entries(this.COLOR_MAP)) {
            const re = new RegExp(`\\b${name}\\b`, 'i');
            if (re.test(clean)) {
                return val;
            }
        }
        return null;
    }

    /**
     * Parses material keywords
     */
    public static parseMaterial(str: string): MaterialProperties | null {
        const lower = str.toLowerCase();
        if (/klaas|glass/i.test(lower)) {
            return { material: 'glass', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.35 };
        }
        if (/metall|metal/i.test(lower)) {
            return { material: 'metal', roughness: 0.25, metalness: 0.9, transparent: false, opacity: 1.0 };
        }
        if (/kuld|gold/i.test(lower)) {
            return { material: 'gold', roughness: 0.3, metalness: 0.85, transparent: false, opacity: 1.0 };
        }
        if (/puit|wood/i.test(lower)) {
            return { material: 'wood', roughness: 0.85, metalness: 0.05, transparent: false, opacity: 1.0 };
        }
        if (/kivi|stone|graniit/i.test(lower)) {
            return { material: 'stone', roughness: 0.95, metalness: 0.05, transparent: false, opacity: 1.0 };
        }
        if (/neoon|neon|helendav|glow/i.test(lower)) {
            return { material: 'neon', roughness: 0.2, metalness: 0.1, transparent: false, opacity: 1.0, emissive: 0x00ffcc };
        }
        if (/traat|wireframe/i.test(lower)) {
            return { material: 'wireframe', roughness: 0.5, metalness: 0.5, transparent: true, opacity: 0.9 };
        }
        if (/hologramm|hologram/i.test(lower)) {
            return { material: 'hologram', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.5 };
        }
        return null;
    }

    /**
     * Parses opacity/transparency from text
     */
    public static parseOpacity(str: string): { opacity?: number; transparent?: boolean } {
        const lower = str.toLowerCase();
        const percentMatch = lower.match(/(\d+)\s*%/);
        if (percentMatch) {
            const val = Math.max(0, Math.min(100, parseInt(percentMatch[1], 10))) / 100;
            return { opacity: val, transparent: val < 1.0 };
        }
        const decMatch = lower.match(/(?:läbipaistvus|opacity)\s*(?:on\s*)?([01](?:\.\d+)?)/);
        if (decMatch) {
            const val = parseFloat(decMatch[1]);
            return { opacity: val, transparent: val < 1.0 };
        }
        if (/täiesti läbipaistev|fully transparent/i.test(lower)) {
            return { opacity: 0.1, transparent: true };
        }
        if (/poolläbipaistev|läbipaistev|transparent/i.test(lower)) {
            return { opacity: 0.45, transparent: true };
        }
        if (/läbipaistmatu|opaque/i.test(lower)) {
            return { opacity: 1.0, transparent: false };
        }
        return {};
    }

    /**
     * Parses shape keywords
     */
    public static parseShape(str: string): 'box' | 'sphere' | 'cylinder' | 'cone' | 'pyramid' | 'plane' | null {
        const lower = str.toLowerCase();
        if (/kera|keraks|kuul|sphere|ball/i.test(lower)) return 'sphere';
        if (/silind|cylinder|toru|post/i.test(lower)) return 'cylinder';
        if (/koonus|cone/i.test(lower)) return 'cone';
        if (/püramiid|pyramid/i.test(lower)) return 'pyramid';
        if (/kuup|kuub|kast|box|cube/i.test(lower)) return 'box';
        if (/tasapind|plaat|plane/i.test(lower)) return 'plane';
        return null;
    }

    /**
     * Parses rotation angles
     */
    public static parseRotation(str: string): [number, number, number] | null {
        const lower = str.toLowerCase();
        if (!/pööra|keera|rotate|kalluta|kraadi|degrees|°/i.test(lower)) {
            return null;
        }
        const degMatch = lower.match(/(\d+)\s*(?:kraadi|deg|degrees|°)/i);
        const angleDeg = degMatch ? parseInt(degMatch[1], 10) : 90;
        const rad = (angleDeg * Math.PI) / 180;

        if (/ümber\s+x|x\s*telje/i.test(lower)) {
            return [rad, 0, 0];
        }
        if (/ümber\s+z|z\s*telje/i.test(lower)) {
            return [0, 0, rad];
        }
        // Default to Y rotation (yaw)
        return [0, rad, 0];
    }

    /**
     * Parses movement and coordinates
     */
    public static parseMovement(str: string): { position?: [number, number, number]; offset?: [number, number, number] } {
        const lower = str.toLowerCase();

        // Exact coordinates: [x, y, z] or x=10 y=5 z=20
        const coordMatch = lower.match(/\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/);
        if (coordMatch) {
            return {
                position: [parseFloat(coordMatch[1]), parseFloat(coordMatch[2]), parseFloat(coordMatch[3])]
            };
        }

        const meterMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:meetrit|m|meetri)/i);
        const dist = meterMatch ? parseFloat(meterMatch[1]) : 5;

        if (/paremale|right/i.test(lower)) return { offset: [dist, 0, 0] };
        if (/vasakule|left/i.test(lower)) return { offset: [-dist, 0, 0] };
        if (/üles|kõrgemale|tõsta|up/i.test(lower)) return { offset: [0, dist, 0] };
        if (/alla|madalamale|down/i.test(lower)) return { offset: [0, -dist, 0] };
        if (/edasi|ette|forward/i.test(lower)) return { offset: [0, 0, -dist] };
        if (/tagasi|taha|back/i.test(lower)) return { offset: [0, 0, dist] };

        return {};
    }

    /**
     * Parses quantity, spacing and dimensions from natural language:
     * e.g. "pane 20 puud", "pane 5 meetri vahega 10 lampi", "tee 4x4 ruudustik"
     */
    public static parseSpatialQuantities(text: string): {
        count?: number;
        spacing?: number;
        layout?: 'line' | 'circle' | 'grid' | 'mirror';
        targetName?: string;
        dimensions?: SpatialDimensions;
    } {
        const lower = text.toLowerCase().trim();

        // Spacing: "5 meetri vahega" / "vahega 5m"
        let spacing: number | undefined;
        const spacingMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:meetri|m)\s*vahega|vahega\s*(\d+(?:\.\d+)?)\s*(?:meetri|m)?/i);
        if (spacingMatch) {
            spacing = parseFloat(spacingMatch[1] || spacingMatch[2]);
        }

        // Layout pattern
        let layout: 'line' | 'circle' | 'grid' | 'mirror' = 'line';
        if (/ringis|ringikujuliselt|circle|radiaal/i.test(lower)) {
            layout = 'circle';
        } else if (/ruudustik|grid|maatriks/i.test(lower)) {
            layout = 'grid';
        } else if (/sümmeetriliselt|peegel|mirror|mõlemale poole/i.test(lower)) {
            layout = 'mirror';
        }

        // Target noun and count: e.g. "pane 20 puud", "10 lampi", "pane 5 meetri vahega 10 lampi"
        let count: number | undefined;
        let targetName: string | undefined;

        // Remove spacing phrase first so its number doesn't shadow the item count
        const textWithoutSpacing = lower.replace(/(\d+(?:\.\d+)?)\s*(?:meetri|m)\s*vahega|vahega\s*(\d+(?:\.\d+)?)\s*(?:meetri|m)?/ig, ' ');

        const allMatches = Array.from(textWithoutSpacing.matchAll(/(\d+)\s+([a-zõäöü]+)/gi));
        for (const m of allMatches) {
            const parsedCount = parseInt(m[1], 10);
            const noun = m[2].toLowerCase();
            if (!/meetrit|meetri|kraadi|protsenti|sekundit|korda|tk|vahega/i.test(noun)) {
                count = parsedCount;
                targetName = noun;
                break;
            }
        }

        // Secondary check if count was specified after noun: "puud 20 tükki"
        if (!count) {
            const countOnlyMatch = lower.match(/(\d+)\s*(?:tükki|tk|objekti|korda)/i);
            if (countOnlyMatch) {
                count = parseInt(countOnlyMatch[1], 10);
            }
        }

        // Dimensions: width, height, length: "kõrgus 10m", "laius 5m", "pikkus 20m"
        let dimensions: SpatialDimensions | undefined;
        const heightMatch = lower.match(/kõrgus\s*(\d+(?:\.\d+)?)\s*m?/i);
        const widthMatch = lower.match(/laius\s*(\d+(?:\.\d+)?)\s*m?/i);
        const depthMatch = lower.match(/(?:pikkus|sügavus)\s*(\d+(?:\.\d+)?)\s*m?/i);

        if (heightMatch || widthMatch || depthMatch) {
            dimensions = {
                width: widthMatch ? parseFloat(widthMatch[1]) : 1,
                height: heightMatch ? parseFloat(heightMatch[1]) : 1,
                depth: depthMatch ? parseFloat(depthMatch[1]) : 1
            };
        }

        return { count, spacing, layout, targetName, dimensions };
    }

    /**
     * Generates a distributed array of objects with exact spacing and symmetry
     */
    public static generateDistributedObjects(
        template: {
            name: string;
            type: string;
            color: number | string;
            scale: [number, number, number];
            material?: string;
            opacity?: number;
            transparent?: boolean;
            isCollidable?: boolean;
        },
        count: number,
        spacing: number = 4,
        layout: 'line' | 'circle' | 'grid' | 'mirror' = 'line',
        center: [number, number, number] = [0, 0, 0]
    ): any[] {
        const objects: any[] = [];
        const baseId = template.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();

        if (layout === 'circle') {
            const radius = Math.max(spacing * 1.5, (count * spacing) / (2 * Math.PI));
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const x = center[0] + Math.cos(angle) * radius;
                const z = center[2] + Math.sin(angle) * radius;
                const y = center[1] + (template.scale[1] / 2);

                objects.push({
                    id: `${baseId}_${i}`,
                    name: `${template.name} #${i + 1}`,
                    type: template.type,
                    position: [Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(z * 10) / 10],
                    rotation: [0, -angle, 0],
                    scale: [...template.scale],
                    color: template.color,
                    material: template.material,
                    opacity: template.opacity,
                    transparent: template.transparent,
                    isCollidable: template.isCollidable ?? true,
                    groupId: `${baseId}_group`
                });
            }
        } else if (layout === 'grid') {
            const cols = Math.ceil(Math.sqrt(count));
            const rows = Math.ceil(count / cols);
            const startX = center[0] - ((cols - 1) * spacing) / 2;
            const startZ = center[2] - ((rows - 1) * spacing) / 2;
            const y = center[1] + (template.scale[1] / 2);

            let created = 0;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (created >= count) break;
                    const x = startX + c * spacing;
                    const z = startZ + r * spacing;

                    objects.push({
                        id: `${baseId}_${created}`,
                        name: `${template.name} #${created + 1}`,
                        type: template.type,
                        position: [Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(z * 10) / 10],
                        scale: [...template.scale],
                        color: template.color,
                        material: template.material,
                        opacity: template.opacity,
                        transparent: template.transparent,
                        isCollidable: template.isCollidable ?? true,
                        groupId: `${baseId}_group`
                    });
                    created++;
                }
            }
        } else if (layout === 'mirror') {
            // Symmetrical pair placement along X axis
            const pairs = Math.ceil(count / 2);
            for (let i = 0; i < pairs; i++) {
                const z = center[2] + (i * spacing) - ((pairs - 1) * spacing) / 2;
                const offsetDist = Math.max(spacing, 4);
                const y = center[1] + (template.scale[1] / 2);

                // Left item
                objects.push({
                    id: `${baseId}_left_${i}`,
                    name: `${template.name} Vasak #${i + 1}`,
                    type: template.type,
                    position: [-offsetDist, Math.round(y * 10) / 10, Math.round(z * 10) / 10],
                    scale: [...template.scale],
                    color: template.color,
                    material: template.material,
                    opacity: template.opacity,
                    transparent: template.transparent,
                    isCollidable: template.isCollidable ?? true,
                    groupId: `${baseId}_mirror_group`
                });

                if (objects.length < count) {
                    // Right mirror item
                    objects.push({
                        id: `${baseId}_right_${i}`,
                        name: `${template.name} Parem #${i + 1}`,
                        type: template.type,
                        position: [offsetDist, Math.round(y * 10) / 10, Math.round(z * 10) / 10],
                        scale: [...template.scale],
                        color: template.color,
                        material: template.material,
                        opacity: template.opacity,
                        transparent: template.transparent,
                        isCollidable: template.isCollidable ?? true,
                        groupId: `${baseId}_mirror_group`
                    });
                }
            }
        } else {
            // Line distribution
            const startX = center[0] - ((count - 1) * spacing) / 2;
            const y = center[1] + (template.scale[1] / 2);

            for (let i = 0; i < count; i++) {
                const x = startX + i * spacing;
                objects.push({
                    id: `${baseId}_${i}`,
                    name: `${template.name} #${i + 1}`,
                    type: template.type,
                    position: [Math.round(x * 10) / 10, Math.round(y * 10) / 10, center[2]],
                    scale: [...template.scale],
                    color: template.color,
                    material: template.material,
                    opacity: template.opacity,
                    transparent: template.transparent,
                    isCollidable: template.isCollidable ?? true,
                    groupId: `${baseId}_group`
                });
            }
        }

        return objects;
    }

    /**
     * Pre-calculates spacing, footprint, and materials required
     */
    public static preCalculateLayout(count: number, spacing: number, layout: string): {
        totalSpaceMeters: number;
        areaMetersSquared: number;
        summary: string;
    } {
        if (layout === 'circle') {
            const radius = Math.max(spacing * 1.5, (count * spacing) / (2 * Math.PI));
            const area = Math.PI * radius * radius;
            return {
                totalSpaceMeters: Math.round(radius * 2 * 10) / 10,
                areaMetersSquared: Math.round(area),
                summary: `Ringi raadius on ${radius.toFixed(1)}m, ümbermõõt ${(2 * Math.PI * radius).toFixed(1)}m, pindala ${Math.round(area)}m².`
            };
        }
        if (layout === 'grid') {
            const cols = Math.ceil(Math.sqrt(count));
            const rows = Math.ceil(count / cols);
            const w = (cols - 1) * spacing;
            const d = (rows - 1) * spacing;
            return {
                totalSpaceMeters: Math.max(w, d),
                areaMetersSquared: w * d,
                summary: `Ruudustik ${cols}x${rows}, laiusega ${w}m ja pikkusega ${d}m (pindala ${w * d}m²).`
            };
        }

        const totalDist = (count - 1) * spacing;
        return {
            totalSpaceMeters: totalDist,
            areaMetersSquared: totalDist * 2,
            summary: `Lineaarne pikkus on kokku ${totalDist}m (${count} objekti, igaühe vahe ${spacing}m).`
        };
    }

    /**
     * Validates and verifies count and dimensions post-creation
     */
    public static verifyQuantityAndDimensions(
        objects: any[],
        expected: {
            typeOrName?: string;
            count?: number;
            spacing?: number;
            color?: number;
            material?: string;
            shape?: string;
        }
    ): { passed: boolean; countActual: number; summary: string } {
        let matching = objects;
        if (expected.typeOrName) {
            const sel = expected.typeOrName.toLowerCase();
            matching = objects.filter(o =>
                (o.name && o.name.toLowerCase().includes(sel)) ||
                (o.type && o.type.toLowerCase().includes(sel)) ||
                (o.groupId && o.groupId.toLowerCase().includes(sel))
            );
        }

        const countActual = matching.length;
        let countOk = true;
        if (expected.count !== undefined) {
            countOk = countActual === expected.count;
        }

        let materialOk = true;
        if (expected.material) {
            materialOk = matching.every(o => o.material === expected.material);
        }

        let colorOk = true;
        if (expected.color !== undefined) {
            colorOk = matching.every(o => o.color === expected.color);
        }

        const passed = countOk && materialOk && colorOk;
        const summary = passed
            ? `Automaatkontroll edukas: stseenis on täpselt ${countActual} vastavat objekti (${matching[0]?.name || 'objekt'}).`
            : `Hoiatus: oodati ${expected.count ?? 'sobivat'} objekti, kuid leiti ${countActual}.`;

        return { passed, countActual, summary };
    }

    /**
     * Normalizes Estonian and English plural nouns to singular form
     */
    public static normalizeNoun(noun: string): string {
        const n = noun.toLowerCase().trim();
        if (n === 'seinad' || n === 'seinu' || n === 'seina') return 'sein';
        if (n === 'puud' || n === 'puid') return 'puu';
        if (n === 'lambid' || n === 'lampe' || n === 'lampi') return 'lamp';
        if (n === 'majad' || n === 'maju') return 'maja';
        if (n === 'sambad' || n === 'sambaid' || n === 'sammast') return 'sammas';
        if (n === 'kastid' || n === 'kaste' || n === 'kasti') return 'kast';
        if (n === 'kivid' || n === 'kive') return 'kivi';
        if (n === 'kristallid' || n === 'kristalle' || n === 'kristalli') return 'kristall';
        if (n === 'mündid' || n === 'münte' || n === 'münti') return 'münt';
        if (n === 'kuubid' || n === 'kuupe' || n === 'kuupi') return 'kuup';
        if (n === 'aknad' || n === 'aknaid' || n === 'akent') return 'aken';
        if (n === 'uksed' || n === 'uksi' || n === 'ust') return 'uks';
        if (n.endsWith('d') && n.length > 3) return n.slice(0, -1);
        return n;
    }

    /**
     * Generates a default procedural template matching a noun
     */
    public static getTemplateForNoun(noun: string): {
        name: string;
        type: 'box' | 'sphere' | 'cylinder' | 'cone' | 'pyramid' | 'plane';
        color: number;
        scale: [number, number, number];
        material?: 'standard' | 'metal' | 'wood' | 'glass' | 'neon' | 'stone' | 'gold' | 'hologram' | 'wireframe';
        opacity?: number;
        transparent?: boolean;
    } {
        const norm = this.normalizeNoun(noun);
        if (norm.includes('puu') || norm.includes('tree')) {
            return { name: 'Puu', type: 'cylinder', color: 0x22c55e, scale: [1.2, 4, 1.2], material: 'wood' };
        }
        if (norm.includes('lamp') || norm.includes('light')) {
            return { name: 'Tänavalamp', type: 'cylinder', color: 0xeab308, scale: [0.5, 3.5, 0.5], material: 'neon' };
        }
        if (norm.includes('sein') || norm.includes('wall')) {
            return { name: 'Sein', type: 'box', color: 0x94a3b8, scale: [4, 3, 0.5], material: 'stone' };
        }
        if (norm.includes('sammas') || norm.includes('pillar') || norm.includes('post')) {
            return { name: 'Sammas', type: 'cylinder', color: 0xf1f5f9, scale: [0.8, 5, 0.8], material: 'stone' };
        }
        if (norm.includes('kast') || norm.includes('box') || norm.includes('kuup')) {
            return { name: 'Kast', type: 'box', color: 0x854d0e, scale: [1.5, 1.5, 1.5], material: 'wood' };
        }
        if (norm.includes('kera') || norm.includes('sphere') || norm.includes('kuul')) {
            return { name: 'Kera', type: 'sphere', color: 0x3b82f6, scale: [2, 2, 2], material: 'standard' };
        }
        if (norm.includes('kristall') || norm.includes('crystal')) {
            return { name: 'Kristall', type: 'cone', color: 0x00ffcc, scale: [1, 2.5, 1], material: 'neon' };
        }
        if (norm.includes('münt') || norm.includes('coin')) {
            return { name: 'Kuldne Münt', type: 'cylinder', color: 0xf59e0b, scale: [1, 0.2, 1], material: 'gold' };
        }
        if (norm.includes('maja') || norm.includes('hoone') || norm.includes('house')) {
            return { name: 'Maja', type: 'box', color: 0xb45309, scale: [6, 5, 6], material: 'wood' };
        }
        return {
            name: norm.charAt(0).toUpperCase() + norm.slice(1),
            type: 'box',
            color: 0x3b82f6,
            scale: [2, 2, 2],
            material: 'standard'
        };
    }

    /**
     * Parses complex natural language into a rich ParsedSpatialCommand
     */
    public static parseSpatialCommand(text: string): ParsedSpatialCommand | null {
        const lower = text.toLowerCase().trim();

        // Avoid capturing game creation prompts (e.g. "tee mäng", "ehita simulaator", "võidusõidumäng")
        if (/mäng|game|seiklus/i.test(lower) && !/tee.*siniseks|värvi|muuda|pane.*vahega/i.test(lower)) {
            return null;
        }

        // 1. Deletion / Removal
        if (/kustuta|eemalda|kõrvalda|delete|remove/i.test(lower)) {
            let targetSelector = 'last';
            const m = lower.match(/(?:kustuta|eemalda|kõrvalda|delete|remove)\s+(?:kõik\s+)?([a-zõäöü]+)/i);
            if (m && !/see|seda|viimane/i.test(m[1])) {
                targetSelector = this.normalizeNoun(m[1]);
            } else if (/viimane|last/i.test(lower)) {
                targetSelector = 'last';
            } else if (/kõik|all/i.test(lower)) {
                targetSelector = 'all';
            }
            return {
                action: 'delete',
                targetSelector
            };
        }

        // 2. Cloning / Duplicating
        if (/kopeeri|dubleeri|clone|duplicate/i.test(lower)) {
            let targetSelector = 'last';
            const m = lower.match(/(?:kopeeri|dubleeri|clone|duplicate)\s+(?:seda\s+|see\s+)?([a-zõäöü]+)?/i);
            if (m && m[1] && !/see|seda|korda|tk/i.test(m[1])) {
                targetSelector = this.normalizeNoun(m[1]);
            }
            const countMatch = lower.match(/(\d+)\s*(?:korda|kord|tk|tükki|eksemplari)/i);
            const count = countMatch ? parseInt(countMatch[1], 10) : 1;
            return {
                action: 'clone',
                targetSelector,
                count
            };
        }

        // 3. Grouping
        if (/grupeeri|pane\s+gruppi|ühenda\s+gruppi|group/i.test(lower)) {
            let targetSelector = 'all';
            const m = lower.match(/(?:grupeeri|pane\s+gruppi|ühenda\s+gruppi|group)\s+(?:kõik\s+)?([a-zõäöü]+)?/i);
            if (m && m[1] && !/see|need|kõik/i.test(m[1])) {
                targetSelector = this.normalizeNoun(m[1]);
            }
            return {
                action: 'group',
                targetSelector,
                groupId: 'group_' + targetSelector + '_' + Date.now()
            };
        }

        // 4. Quantities, Spacing & Symmetry ("pane 20 puud", "5 meetri vahega 10 lampi", "paiguta sümmeetriliselt 6 kasti")
        const quantities = this.parseSpatialQuantities(text);
        const hasDistKeyword = /vahega|sümmeetriliselt|peegel|ringis|ringikujuliselt|ruudustik|ridamisi|mõlemale poole/i.test(lower);
        const hasQuantity = (quantities.count !== undefined && quantities.count >= 1) || (quantities.spacing !== undefined);

        if ((hasQuantity || hasDistKeyword) && (quantities.targetName || /puu|lamp|sein|kast|sammas|kivi|kristall|münt|maja|objekt/i.test(lower))) {
            const count = quantities.count || 4;
            const spacing = quantities.spacing || 4;
            const layout = quantities.layout || (hasDistKeyword && /sümmeetriliselt|peegel/i.test(lower) ? 'mirror' : 'line');
            const targetSelector = quantities.targetName ? this.normalizeNoun(quantities.targetName) : 'objekt';
            const preCalc = this.preCalculateLayout(count, spacing, layout);

            const color = this.parseColor(text);
            const material = this.parseMaterial(text);
            const opacityData = this.parseOpacity(text);
            const shape = this.parseShape(text);

            return {
                action: layout === 'mirror' ? 'symmetry' : 'distribute',
                targetSelector,
                count,
                spacing,
                layout,
                color: color ?? undefined,
                material: material ?? undefined,
                opacity: opacityData.opacity,
                transparent: opacityData.transparent,
                shape: shape ?? undefined,
                dimensions: quantities.dimensions,
                preCalculatedInfo: preCalc.summary
            };
        }

        // 5. Batch Modification ("tee kõik seinad siniseks", "muuda seinad klaasiks", "värvi majad kollaseks")
        const isBatch = /kõik|iga|all|terve/i.test(lower) || /seinad|puud|lambid|majad|sambad|kastid|kivid|kristallid/i.test(lower);
        const color = this.parseColor(text);
        const material = this.parseMaterial(text);
        const opacityData = this.parseOpacity(text);
        const shape = this.parseShape(text);
        const rotation = this.parseRotation(text);
        const movement = this.parseMovement(text);

        let targetSelector: string | undefined;
        for (const noun of ['sein', 'puu', 'lamp', 'maja', 'sammas', 'kast', 'kivi', 'kristall', 'münt', 'hoone', 'objekt']) {
            if (lower.includes(noun)) {
                targetSelector = noun;
                break;
            }
        }

        // Scale factors (e.g. "suurenda 2 korda", "tee 2x suuremaks")
        let scale: [number, number, number] | undefined;
        const scaleMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:korda|x)\s*(?:suurem|väiksem|suuremaks|väiksemaks)/i);
        if (scaleMatch) {
            const factor = parseFloat(scaleMatch[1]);
            const mult = /väiksem/i.test(lower) ? 1 / factor : factor;
            scale = [mult, mult, mult];
        } else if (/suuremaks|suurem|bigger/i.test(lower) && !/maja/i.test(lower)) {
            scale = [1.5, 1.5, 1.5];
        } else if (/väiksemaks|väiksem|smaller/i.test(lower)) {
            scale = [0.67, 0.67, 0.67];
        }

        if (isBatch && (color !== null || material !== null || opacityData.opacity !== undefined || shape !== null || scale !== undefined)) {
            return {
                action: 'batch_modify',
                targetSelector: targetSelector ? this.normalizeNoun(targetSelector) : 'all',
                color: color ?? undefined,
                material: material ?? undefined,
                opacity: opacityData.opacity,
                transparent: opacityData.transparent,
                shape: shape ?? undefined,
                scale,
                dimensions: quantities.dimensions
            };
        }

        // 6. Single / targeted modification (material, opacity, shape, rotation, movement, scale, coordinates)
        if (
            color !== null ||
            material !== null ||
            opacityData.opacity !== undefined ||
            shape !== null ||
            rotation !== null ||
            movement.position !== undefined ||
            movement.offset !== undefined ||
            scale !== undefined ||
            quantities.dimensions !== undefined
        ) {
            if (/pööra|keera|rotate|liiguta|tõsta|vii|move|muuda|tee|värvi|change|set|pane/i.test(lower)) {
                return {
                    action: 'modify',
                    targetSelector: targetSelector ? this.normalizeNoun(targetSelector) : 'last',
                    color: color ?? undefined,
                    material: material ?? undefined,
                    opacity: opacityData.opacity,
                    transparent: opacityData.transparent,
                    shape: shape ?? undefined,
                    rotation: rotation ?? undefined,
                    position: movement.position,
                    offset: movement.offset,
                    scale,
                    dimensions: quantities.dimensions
                };
            }
        }

        return null;
    }
}

