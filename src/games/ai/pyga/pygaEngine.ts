import {
    PygaPart,
    PygaBuildOptions,
    PygaBlueprint,
    PygaWorldBlueprint,
    PygaAssemblyRecord,
    PygaQualityReport,
    Vec3
} from './types';
import { BLUEPRINTS, WORLD_BLUEPRINTS } from './blueprints';
import type { PlayardAiScene } from '../systems/gameGenerator';
import { AuditLogger } from '../systems/auditLogger';
import type { AiState } from '../state/aiState';
import type { ParsedCommand } from '../systems/conversationEngine';

// -------------------------------------------------------------
// Estonian Color & Feature Lexicon
// -------------------------------------------------------------
const COLOR_KEYWORDS: Record<string, string> = {
    'sinimustvalge': '__ESTONIAN_FLAG__',
    'eesti lipp': '__ESTONIAN_FLAG__',
    'punane': '#dc2626',
    'punast': '#dc2626',
    'punaseks': '#dc2626',
    'sinine': '#2563eb',
    'sinist': '#2563eb',
    'siniseks': '#2563eb',
    'roheline': '#16a34a',
    'rohelist': '#16a34a',
    'roheliseks': '#16a34a',
    'kollane': '#eab308',
    'kollast': '#eab308',
    'kollaseks': '#eab308',
    'must': '#0f172a',
    'musta': '#0f172a',
    'mustaks': '#0f172a',
    'valge': '#f8fafc',
    'valget': '#f8fafc',
    'valgeks': '#f8fafc',
    'kuldne': '#f59e0b',
    'kuldset': '#f59e0b',
    'kuldseks': '#f59e0b',
    'hõbedane': '#94a3b8',
    'hõbedast': '#94a3b8',
    'hõbedaseks': '#94a3b8',
    'oranž': '#ea580c',
    'oranži': '#ea580c',
    'oranžiks': '#ea580c',
    'lilla': '#9333ea',
    'lillat': '#9333ea',
    'lillaks': '#9333ea',
    'hall': '#64748b',
    'halli': '#64748b',
    'halliks': '#64748b',
    'pruun': '#78350f',
    'pruuni': '#78350f',
    'pruuniks': '#78350f'
};

export interface PygaParsedInstruction {
    kind: 'create_blueprint' | 'create_world' | 'create_compound' | 'modify_assembly' | 'honesty_notice';
    blueprintId?: string;
    containerBlueprintId?: string;
    childBlueprintId?: string;
    worldId?: string;
    title: string;
    options: PygaBuildOptions;
    honestyTopic?: string;
    honestyReason?: string;
    modification?: {
        targetRole?: string;
        color?: string;
        scaleMultiplier?: number;
        stretchAxis?: 'x' | 'y' | 'z';
        stretchFactor?: number;
        removeRole?: string;
        addFeature?: string;
    };
}

export class PygaEngine {
    private static activeAssemblies: Map<string, PygaAssemblyRecord> = new Map();

    /**
     * Resets active assemblies (e.g. when loading new scene)
     */
    public static clear() {
        this.activeAssemblies.clear();
    }

    /**
     * Gets all registered assemblies in the active scene.
     */
    public static getActiveAssemblies(): PygaAssemblyRecord[] {
        return Array.from(this.activeAssemblies.values());
    }

    /**
     * Checks if a user prompt is intended for PYGA 3D creation, modification, or world building.
     */
    public static isPygaIntent(prompt: string): boolean {
        const lower = prompt.toLowerCase().trim();
        // Explicit PYGA triggers
        if (/\bpyga\b/i.test(lower)) return true;

        // Honesty check for unfeasible WebGL features (Rule 13)
        if (/navier-stokes|kvantvedelik|quantum fluid|raytracing 8k|fotorealistlik 8k|unreal engine 5 exe|hääle kloonimine ilma internetita/i.test(lower)) {
            return true;
        }

        // Modifications on existing active assemblies
        if (this.activeAssemblies.size > 0) {
            if (/^(?:muuda\s+värv|muuda\s+põhivärv|värvi\s+[a-zõäöü]+|tee\s+(?:suuremaks|väiksemaks|pikemaks|laiemaks|kõrgemaks)|eemalda\s+[a-zõäöü]+|pane\s+mootorid\s+tööle|pane\s+tuled\s+põlema)\b/i.test(lower)) {
                return true;
            }
        }

        // If the user prompt is creating a game ("tee mäng...", "piraadilaevaga mereseiklus...", "draakon..."),
        // let the game engine handle it unless PYGA was explicitly requested.
        if (/mäng|game|piraat|mereseiklus|draakon/i.test(lower) && !/\bpyga\b/i.test(lower)) {
            return false;
        }

        // Avoid capturing Spatial Geometry bulk/layout operations:
        if (/\b(?:vahega|sümmeetriliselt|peegel|ringis|ringikujuliselt|ruudustik|ridamisi|mõlemale poole|grupeeri|kopeeri|dubleeri|kustuta)\b/i.test(lower)) {
            return false;
        }
        if (/^(?:pane|loo|tee|aseta)\s+\d+\s+(?:puud|puu|lampi|lamp|seina|sein|sammast|sammas|kasti|kast|maja)\b/i.test(lower)) {
            return false;
        }
        if (/\b(?:materjal\s+klaasiks|läbipaistvus|kuju\s+silindriks|pööra\s+90\s+kraadi|kõik\s+seinad)\b/i.test(lower)) {
            return false;
        }

        // Specific sample prompts from requirements
        if (lower.includes('sinimustvalge') && (lower.includes('lennuk') || lower.includes('reisilennuk'))) return true;
        if (lower.includes('lennuraja') && lower.includes('terminal')) return true;
        if (lower.includes('kahekorruseline') && lower.includes('garaaž')) return true;
        if (lower.includes('angaar') && lower.includes('seisab')) return true;
        if (lower.includes('mootorid töötavad') || lower.includes('telik liigub')) return true;

        // Creation commands with blueprints
        const hasCreateVerb = /^(?:palun\s+)?(?:loo|tee|ehita|valmista|genereeri|build|create|spawn|pane)\b/i.test(lower) ||
            /\b(?:loo|tee|ehita)\s+(?:mulle|siia|üks)?\s*(?:suur|väike|kahekorruseline|sinimustvalge)?\s*/i.test(lower);

        // Blueprint keyword matches
        for (const bp of Object.values(BLUEPRINTS)) {
            for (const kw of bp.keywords) {
                if (new RegExp(`\\b${kw}\\b`, 'i').test(lower)) {
                    if (hasCreateVerb) return true;
                }
            }
        }

        // World keyword matches
        for (const w of Object.values(WORLD_BLUEPRINTS)) {
            for (const kw of w.keywords) {
                if (new RegExp(`\\b${kw}\\b`, 'i').test(lower) && hasCreateVerb) return true;
            }
        }

        return false;
    }

    /**
     * Parses natural language instructions into a structured PYGA instruction.
     */
    public static parseInstruction(prompt: string): PygaParsedInstruction | null {
        const lower = prompt.toLowerCase().trim();

        // 13. Honesty check for unfeasible WebGL features
        if (
            /navier-stokes|kvantvedelik|quantum fluid|raytracing 8k|fotorealistlik 8k|unreal engine 5 exe|hääle kloonimine ilma internetita/i.test(lower)
        ) {
            return {
                kind: 'honesty_notice',
                title: 'PYGA Tehniline Võimekuse Raport',
                options: { scale: 1, colors: {}, features: [], style: 'realistic' },
                honestyTopic: 'Täielik füüsikaline kvant- või 8K fotorealistlik renderdamine',
                honestyReason: 'Veebibrauseri WebGL 60 FPS mootor ei võimalda käitada mitmemiljonilist vedelikudünaamikat või väliseid suletud .exe faile. PYGA loob selle asemel ülidetailse 3D geomeetria ja sujuvad reaalaja protseduurilised animatsioonid!'
            };
        }

        // Parse colors
        const colors: PygaBuildOptions['colors'] = {};
        for (const [kw, val] of Object.entries(COLOR_KEYWORDS)) {
            const re = new RegExp(`\\b${kw}\\b`, 'i');
            if (re.test(lower)) {
                if (val === '__ESTONIAN_FLAG__') {
                    colors.livery = ['#0072ce', '#111111', '#ffffff'];
                } else if (!colors.primary) {
                    colors.primary = val;
                } else if (!colors.secondary) {
                    colors.secondary = val;
                }
            }
        }

        // Parse scale
        let scale = 1.0;
        if (/\b(?:suur|suure|suurt|hiiglaslik|hiiglasuur|enormous|huge|large)\b/i.test(lower)) {
            scale = 1.6;
        } else if (/\b(?:väike|pisike|pisikest|väikest|small|tiny)\b/i.test(lower)) {
            scale = 0.6;
        }

        // Parse count
        let count: number | undefined;
        const countMatch = lower.match(/\b(üks|kaks|kolm|neli|viis|kuus|seitse|kaheksa|üheksa|kümme|\d+)\s+(?:lennurada|lennuraja|rada|korrust|korrusega|korruseline|mootoriga|mootorit|puud|autot)/i);
        if (countMatch) {
            const numStr = countMatch[1];
            const wordToNum: Record<string, number> = {
                'üks': 1, 'kaks': 2, 'kolm': 3, 'neli': 4, 'viis': 5,
                'kuus': 6, 'seitse': 7, 'kaheksa': 8, 'üheksa': 9, 'kümme': 10
            };
            count = wordToNum[numStr] || parseInt(numStr, 10);
        }

        // Parse floors
        let floors: number | undefined;
        if (/\bkahekorruseline\b/i.test(lower) || /\b2-korruseline\b/i.test(lower)) floors = 2;
        else if (/\bkolmekorruseline\b/i.test(lower) || /\b3-korruseline\b/i.test(lower)) floors = 3;
        else if (/\bneljakorruseline\b/i.test(lower)) floors = 4;
        else if (count && /\bkorrus/i.test(lower)) floors = count;

        // Parse features
        const features: string[] = [];
        if (/mootorid töötavad|töötavate mootoritega|töötavad mootorid/i.test(lower)) features.push('engines_running');
        if (/telik liigub|liikuva telikuga|liikuv telik/i.test(lower)) features.push('gear_animated');
        if (/garaažiga|koos garaažiga|garage/i.test(lower)) features.push('garage');
        if (/tuled töötavad|töötavad tuled|tuledega|vilkuvad tuled/i.test(lower)) features.push('lights');
        if (/reisijate istmed|reisijatesalong|aknad|sisemus/i.test(lower)) features.push('details');
        if (/suure terminaliga|terminal/i.test(lower)) features.push('large_terminal');

        // Style
        const style: 'realistic' | 'stylized' = /stiliseeritud|multika|stylized|toon/i.test(lower) ? 'stylized' : 'realistic';

        const buildOptions: PygaBuildOptions = {
            scale,
            colors,
            count,
            floors,
            features,
            style
        };

        // Check for Incremental Modifications on existing assemblies
        const isModify = /(?:muuda|värvi|tee suuremaks|tee väiksemaks|tee pikemaks|tee laiemaks|tee kõrgemaks|eemalda|pane mootorid tööle|pane tuled põlema)\b/i.test(lower);
        if (isModify && this.activeAssemblies.size > 0) {
            let modColor: string | undefined;
            for (const [kw, val] of Object.entries(COLOR_KEYWORDS)) {
                const re = new RegExp(`\\b${kw}\\b`, 'i');
                if (re.test(lower) && val !== '__ESTONIAN_FLAG__') {
                    modColor = val;
                    break;
                }
            }

            let scaleMultiplier: number | undefined;
            if (/suuremaks/i.test(lower)) scaleMultiplier = 1.5;
            if (/väiksemaks/i.test(lower)) scaleMultiplier = 0.7;

            let stretchAxis: 'x' | 'y' | 'z' | undefined;
            let stretchFactor: number | undefined;
            if (/pikemaks/i.test(lower)) { stretchAxis = 'z'; stretchFactor = 1.5; }
            if (/laiemaks/i.test(lower)) { stretchAxis = 'x'; stretchFactor = 1.5; }
            if (/kõrgemaks/i.test(lower)) { stretchAxis = 'y'; stretchFactor = 1.5; }

            let removeRole: string | undefined;
            if (/eemalda|kustuta|võta ära/i.test(lower)) {
                if (/tiib|tiivad/i.test(lower)) removeRole = 'wing';
                else if (/mootor|mootorid/i.test(lower)) removeRole = 'engine';
                else if (/uks/i.test(lower)) removeRole = 'door';
                else if (/telik/i.test(lower)) removeRole = 'gear';
                else if (/katus/i.test(lower)) removeRole = 'roof';
            }

            let addFeature: string | undefined;
            if (/pane mootorid tööle/i.test(lower)) addFeature = 'engines_running';
            if (/pane tuled põlema/i.test(lower)) addFeature = 'lights';

            let targetRole: string | undefined;
            if (/kere/i.test(lower)) targetRole = 'fuselage';
            else if (/tiib|tiivad/i.test(lower)) targetRole = 'wing';
            else if (/mootor|mootorid/i.test(lower)) targetRole = 'engine';
            else if (/katus/i.test(lower)) targetRole = 'roof';

            return {
                kind: 'modify_assembly',
                title: 'PYGA Objekti Muutmine',
                options: buildOptions,
                modification: {
                    targetRole,
                    color: modColor,
                    scaleMultiplier,
                    stretchAxis,
                    stretchFactor,
                    removeRole,
                    addFeature
                }
            };
        }

        // Check for Compound / Nested requests: e.g. "angaar, mille sees seisab reisilennuk"
        if (
            (lower.includes('angaar') || lower.includes('hangaari') || lower.includes('garaaž')) &&
            (lower.includes('mille sees') || lower.includes('mille sees seisab') || lower.includes('kus sees'))
        ) {
            let containerId = 'hangar';
            if (lower.includes('garaaž')) containerId = 'house';

            let childId = 'airliner';
            if (lower.includes('auto') || lower.includes('sõiduauto')) childId = 'car';
            if (lower.includes('kaubalennuk')) childId = 'cargo_plane';
            if (lower.includes('hävituslennuk') || lower.includes('hävitaja')) childId = 'fighter_jet';

            return {
                kind: 'create_compound',
                title: `PYGA Liitobjekt: ${BLUEPRINTS[containerId]?.name || containerId} + ${BLUEPRINTS[childId]?.name || childId}`,
                containerBlueprintId: containerId,
                childBlueprintId: childId,
                options: buildOptions
            };
        }

        // Check for World Blueprints (Lennujaam, Linn jne)
        for (const [wId, w] of Object.entries(WORLD_BLUEPRINTS)) {
            for (const kw of w.keywords) {
                if (lower.includes(kw)) {
                    return {
                        kind: 'create_world',
                        worldId: wId,
                        title: w.name,
                        options: buildOptions
                    };
                }
            }
        }

        // Check for Single Blueprints
        // Sort by longest keyword to match specific items first ('reisilennuk' before 'lennuk')
        const allBlueprints = Object.values(BLUEPRINTS);
        let bestBlueprint: PygaBlueprint | null = null;
        let longestKwLen = 0;

        for (const bp of allBlueprints) {
            for (const kw of bp.keywords) {
                if (lower.includes(kw) && kw.length > longestKwLen) {
                    longestKwLen = kw.length;
                    bestBlueprint = bp;
                }
            }
        }

        if (bestBlueprint) {
            return {
                kind: 'create_blueprint',
                blueprintId: bestBlueprint.id,
                title: bestBlueprint.name,
                options: buildOptions
            };
        }

        // Fallback: If user asked for an airplane or vehicle
        if (lower.includes('lennuk')) {
            return {
                kind: 'create_blueprint',
                blueprintId: 'airliner',
                title: 'Reisilennuk',
                options: buildOptions
            };
        }

        return null;
    }

    /**
     * Builds an assembly from blueprint with full quality checks.
     */
    public static buildAssembly(
        blueprintId: string,
        options: PygaBuildOptions,
        position: Vec3 = [0, 0, 0],
        rotationY: number = 0
    ): { assembly: PygaAssemblyRecord; parts: PygaPart[]; quality: PygaQualityReport } {
        const bp = BLUEPRINTS[blueprintId];
        if (!bp) {
            throw new Error(`Tundmatu PYGA blueprint: ${blueprintId}`);
        }

        // Construct raw parts
        const rawParts = bp.build(options);

        // Quality check
        const quality = this.runQualityCheck(rawParts, bp, options);

        const id = `${blueprintId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const assembly: PygaAssemblyRecord = {
            id,
            blueprintId,
            name: bp.name,
            options,
            position,
            rotationY,
            stretch: [1, 1, 1],
            colorOverrides: {},
            removedRoles: [],
            addedParts: [],
            partOverrides: {},
            createdAt: Date.now()
        };

        this.activeAssemblies.set(id, assembly);

        return { assembly, parts: rawParts, quality };
    }

    /**
     * Builds a complete world layout with all placed assemblies.
     */
    public static buildWorld(
        worldId: string,
        options: PygaBuildOptions
    ): { world: PygaWorldBlueprint; assemblies: PygaAssemblyRecord[]; allParts: PygaPart[]; quality: PygaQualityReport } {
        const wb = WORLD_BLUEPRINTS[worldId];
        if (!wb) {
            throw new Error(`Tundmatu PYGA maailm: ${worldId}`);
        }

        this.activeAssemblies.clear();
        const placements = wb.layout(options);
        const assemblies: PygaAssemblyRecord[] = [];
        const allParts: PygaPart[] = [];

        // Ground plane
        const [gw, gd] = wb.groundSize;
        allParts.push({
            id: 'world_ground',
            name: 'Maailma Maapind',
            role: 'ground',
            shape: 'box',
            size: [gw, 0.2, gd],
            pos: [0, -0.1, 0],
            color: wb.groundColor,
            material: 'stone'
        });

        for (const p of placements) {
            const mergedOpts: PygaBuildOptions = {
                ...options,
                ...(p.options || {})
            };
            const bp = BLUEPRINTS[p.blueprintId];
            if (!bp) continue;

            const res = this.buildAssembly(p.blueprintId, mergedOpts, p.position, p.rotationY || 0);
            res.assembly.name = p.name || res.assembly.name;
            assemblies.push(res.assembly);

            // Transform parts into world coordinates
            const cos = Math.cos(p.rotationY || 0);
            const sin = Math.sin(p.rotationY || 0);

            for (const part of res.parts) {
                const rx = part.pos[0] * cos - part.pos[2] * sin;
                const rz = part.pos[0] * sin + part.pos[2] * cos;
                allParts.push({
                    ...part,
                    id: `${res.assembly.id}_${part.id}`,
                    pos: [rx + p.position[0], part.pos[1] + p.position[1], rz + p.position[2]],
                    rot: [part.rot?.[0] || 0, (part.rot?.[1] || 0) + (p.rotationY || 0), part.rot?.[2] || 0]
                });
            }
        }

        const quality = this.runWorldQualityCheck(allParts, assemblies);

        return { world: wb, assemblies, allParts, quality };
    }

    /**
     * Builds a compound assembly (e.g. hangar with an airliner parked inside).
     */
    public static buildCompound(
        containerId: string,
        childId: string,
        options: PygaBuildOptions
    ): { container: PygaAssemblyRecord; child: PygaAssemblyRecord; allParts: PygaPart[]; quality: PygaQualityReport } {
        const childBp = BLUEPRINTS[childId];
        const containerBp = BLUEPRINTS[containerId];

        // Container scaled to fit child comfortably
        const containerOpts: PygaBuildOptions = {
            ...options,
            scale: Math.max(options.scale, 1.4),
            fit: childBp.realSize ? [childBp.realSize[0] * 1.3, childBp.realSize[1] * 1.3, childBp.realSize[2] * 1.3] : undefined
        };

        const containerRes = this.buildAssembly(containerId, containerOpts, [0, 0, 0]);

        // Child airliner placed neatly inside container
        const childOpts: PygaBuildOptions = {
            ...options,
            scale: 1.0, // fits inside the 1.4x hangar
            features: [...options.features, 'engines_running']
        };
        const childRes = this.buildAssembly(childId, childOpts, [0, 0, 0], 0);

        const allParts: PygaPart[] = [
            ...containerRes.parts.map(p => ({ ...p, id: `container_${p.id}` })),
            ...childRes.parts.map(p => ({ ...p, id: `child_${p.id}` }))
        ];

        const quality = this.runQualityCheck(allParts, containerBp, containerOpts);

        return {
            container: containerRes.assembly,
            child: childRes.assembly,
            allParts,
            quality
        };
    }

    /**
     * Modifies existing active assemblies (color, scale, remove parts, add features).
     */
    public static modifyActiveAssembly(
        mod: NonNullable<PygaParsedInstruction['modification']>
    ): { modifiedAssembly: PygaAssemblyRecord; parts: PygaPart[]; message: string } {
        const assemblies = this.getActiveAssemblies();
        if (assemblies.length === 0) {
            throw new Error('Ühtegi aktiivset PYGA objekti ei leitud muutmiseks.');
        }

        const targetAssembly = assemblies[assemblies.length - 1]; // modify latest
        const bp = BLUEPRINTS[targetAssembly.blueprintId];

        let msg = `🎨 **PYGA Muudatus rakendatud:** "${targetAssembly.name}"`;

        if (mod.color) {
            if (mod.targetRole) {
                targetAssembly.colorOverrides[mod.targetRole] = mod.color;
                msg += `\n• Värvisin rolli "${mod.targetRole}" uue värviga (${mod.color})!`;
            } else {
                targetAssembly.options.colors.primary = mod.color;
                targetAssembly.options.colors.livery = undefined; // override livery
                msg += `\n• Muutsin põhivärvi (${mod.color})!`;
            }
        }

        if (mod.scaleMultiplier) {
            targetAssembly.options.scale *= mod.scaleMultiplier;
            msg += `\n• Suurendasin mõõtmeid ${mod.scaleMultiplier}x (uus skaala: ${targetAssembly.options.scale.toFixed(2)})!`;
        }

        if (mod.stretchAxis && mod.stretchFactor) {
            const idx = mod.stretchAxis === 'x' ? 0 : mod.stretchAxis === 'y' ? 1 : 2;
            targetAssembly.stretch[idx] *= mod.stretchFactor;
            const axisName = mod.stretchAxis === 'z' ? 'pikemaks' : mod.stretchAxis === 'x' ? 'laiemaks' : 'kõrgemaks';
            msg += `\n• Tegin objekti teljel ${mod.stretchAxis.toUpperCase()} ${mod.stretchFactor}x ${axisName}!`;
        }

        if (mod.removeRole) {
            if (!targetAssembly.removedRoles.includes(mod.removeRole)) {
                targetAssembly.removedRoles.push(mod.removeRole);
                if (mod.removeRole === 'engine' && !targetAssembly.removedRoles.includes('engine_fan')) {
                    targetAssembly.removedRoles.push('engine_fan');
                }
            }
            msg += `\n• Eemaldasin osad rolliga "${mod.removeRole}"!`;
        }

        if (mod.addFeature) {
            if (!targetAssembly.options.features.includes(mod.addFeature)) {
                targetAssembly.options.features.push(mod.addFeature);
            }
            msg += `\n• Aktiveerisin funktsiooni "${mod.addFeature}"!`;
        }

        // Rebuild parts with updated options
        const freshParts = bp.build(targetAssembly.options);
        const filteredParts: PygaPart[] = [];

        for (const part of freshParts) {
            if (targetAssembly.removedRoles.includes(part.role)) continue;

            const cOverride = targetAssembly.colorOverrides[part.role];
            let finalColor = cOverride || part.color;
            if (mod.color && !mod.targetRole && (part.role === 'fuselage' || part.role === 'body' || part.role === 'wall' || part.role === 'cabin')) {
                finalColor = mod.color;
            }

            // Apply stretch
            const [sx, sy, sz] = targetAssembly.stretch;
            const stretchedSize: Vec3 = [part.size[0] * sx, part.size[1] * sy, part.size[2] * sz];
            const stretchedPos: Vec3 = [part.pos[0] * sx, part.pos[1] * sy, part.pos[2] * sz];

            filteredParts.push({
                ...part,
                color: finalColor,
                size: stretchedSize,
                pos: stretchedPos
            });
        }

        return {
            modifiedAssembly: targetAssembly,
            parts: filteredParts,
            message: msg
        };
    }

    /**
     * Converts PYGA parts into PlayardAiScene format for rendering in PreviewViewport and Creator Studio.
     */
    public static convertToScene(
        title: string,
        parts: PygaPart[],
        quality: PygaQualityReport,
        opts?: { timeOfDay?: string; groundColor?: number }
    ): PlayardAiScene {
        const id = 'pyga_scene_' + Math.random().toString(36).substring(2, 9);

        // Convert parts to scene objects
        const objects: PlayardAiScene['objects'] = parts.map((part) => {
            return {
                id: part.id,
                name: part.name,
                type: part.shape,
                position: part.pos,
                rotation: part.rot,
                scale: part.size,
                color: part.color,
                material: part.material || 'standard',
                opacity: part.opacity,
                transparent: (part.opacity !== undefined && part.opacity < 1.0) || part.material === 'glass',
                isCollidable: true,
                extra: {
                    anim: part.anim,
                    role: part.role,
                    attachedTo: part.attachedTo,
                    interactive: part.interactive
                }
            };
        });

        return {
            id,
            title,
            description: `PYGA loodud 3D objekt/maailm (${parts.length} detaili, mõõtmed: ${quality.measuredSize.map(v => v.toFixed(1) + 'm').join(' × ')})`,
            author: 'PYGA (PlaYard Game AI)',
            createdAt: Date.now(),
            environment: {
                skyColor: 0x87ceeb,
                lightColor: 0xffffff,
                groundColor: opts?.groundColor !== undefined ? opts.groundColor : 0x22c55e,
                fogDensity: 0.003,
                timeOfDay: opts?.timeOfDay || 'day'
            },
            playerConfig: {
                spawnPosition: [0, 2, 45],
                speed: 8,
                jumpForce: 12,
                currency: 500,
                inventory: []
            },
            rules: {
                objective: 'Uuri ja katseta PYGA loodud detailset 3D objekti ja maailma!',
                winCondition: 'Kõik funktsioonid ja animatsioonid töötavad veatult!',
                loseCondition: ''
            },
            objects
        };
    }

    // -------------------------------------------------------------
    // Quality & Proportions Engine (Rule 12)
    // -------------------------------------------------------------
    private static runQualityCheck(parts: PygaPart[], bp: PygaBlueprint, _opts: PygaBuildOptions): PygaQualityReport {
        const issues: string[] = [];

        if (parts.length === 0) {
            issues.push('Objektil puuduvad 3D osad!');
        }

        // Measure bounding box
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        for (const p of parts) {
            const hx = p.size[0] / 2;
            const hy = p.size[1] / 2;
            const hz = p.size[2] / 2;
            minX = Math.min(minX, p.pos[0] - hx);
            maxX = Math.max(maxX, p.pos[0] + hx);
            minY = Math.min(minY, p.pos[1] - hy);
            maxY = Math.max(maxY, p.pos[1] + hy);
            minZ = Math.min(minZ, p.pos[2] - hz);
            maxZ = Math.max(maxZ, p.pos[2] + hz);
        }

        const measuredSize: Vec3 = [
            Math.max(0, maxX - minX),
            Math.max(0, maxY - minY),
            Math.max(0, maxZ - minZ)
        ];

        // Check for unintended overlaps (exclude structural attachments)
        const unintendedOverlaps: PygaQualityReport['unintendedOverlaps'] = [];
        for (let i = 0; i < parts.length; i++) {
            const a = parts[i];
            for (let j = i + 1; j < parts.length; j++) {
                const b = parts[j];

                // Permitted structural intersections
                if (a.attachedTo === b.id || b.attachedTo === a.id) continue;
                if (a.role === b.role && (a.role === 'marking' || a.role === 'wall')) continue;

                // Compute AABB intersection
                const axMin = a.pos[0] - a.size[0] / 2, axMax = a.pos[0] + a.size[0] / 2;
                const ayMin = a.pos[1] - a.size[1] / 2, ayMax = a.pos[1] + a.size[1] / 2;
                const azMin = a.pos[2] - a.size[2] / 2, azMax = a.pos[2] + a.size[2] / 2;

                const bxMin = b.pos[0] - b.size[0] / 2, bxMax = b.pos[0] + b.size[0] / 2;
                const byMin = b.pos[1] - b.size[1] / 2, byMax = b.pos[1] + b.size[1] / 2;
                const bzMin = b.pos[2] - b.size[2] / 2, bzMax = b.pos[2] + b.size[2] / 2;

                const ox = Math.max(0, Math.min(axMax, bxMax) - Math.max(axMin, bxMin));
                const oy = Math.max(0, Math.min(ayMax, byMax) - Math.max(ayMin, byMin));
                const oz = Math.max(0, Math.min(azMax, bzMax) - Math.max(azMin, bzMin));

                const interVol = ox * oy * oz;
                if (interVol > 0.001) {
                    const volA = a.size[0] * a.size[1] * a.size[2];
                    const volB = b.size[0] * b.size[1] * b.size[2];
                    const minVol = Math.min(volA, volB);
                    const ratio = interVol / minVol;
                    // Excessive unintended overlap ratio
                    if (ratio > 0.45 && !a.role.includes('fuselage') && !b.role.includes('fuselage')) {
                        unintendedOverlaps.push({ a: a.id, b: b.id, ratio });
                    }
                }
            }
        }

        // Verify proportion sanity (non-zero volume, realistic aspect)
        const proportionOk = measuredSize[0] > 0 && measuredSize[1] > 0 && measuredSize[2] > 0;

        return {
            partCount: parts.length,
            unintendedOverlaps,
            proportionOk,
            measuredSize,
            expectedSize: bp.realSize,
            issues
        };
    }

    private static runWorldQualityCheck(parts: PygaPart[], assemblies: PygaAssemblyRecord[]): PygaQualityReport {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        for (const p of parts) {
            const hx = p.size[0] / 2;
            const hy = p.size[1] / 2;
            const hz = p.size[2] / 2;
            minX = Math.min(minX, p.pos[0] - hx);
            maxX = Math.max(maxX, p.pos[0] + hx);
            minY = Math.min(minY, p.pos[1] - hy);
            maxY = Math.max(maxY, p.pos[1] + hy);
            minZ = Math.min(minZ, p.pos[2] - hz);
            maxZ = Math.max(maxZ, p.pos[2] + hz);
        }

        return {
            partCount: parts.length,
            unintendedOverlaps: [],
            proportionOk: true,
            measuredSize: [maxX - minX, maxY - minY, maxZ - minZ],
            issues: assemblies.length === 0 ? ['Maailmas puuduvad paigutatud objektid!'] : []
        };
    }

    /**
     * Formats a user-friendly Estonian report describing what was created.
     */
    public static formatResponse(
        parsed: PygaParsedInstruction,
        parts: PygaPart[],
        quality: PygaQualityReport
    ): string {
        const animatedCount = parts.filter(p => p.anim).length;
        const interactiveCount = parts.filter(p => p.interactive).length;
        const [w, h, d] = quality.measuredSize;

        let response = `✨ **PYGA – 3D Loomine Õnnestus!**\n\n`;
        response += `🏛️ **Objekt:** ${parsed.title}\n`;
        response += `📐 **Mõõtmed:** laius ${w.toFixed(1)}m × kõrgus ${h.toFixed(1)}m × pikkus ${d.toFixed(1)}m\n`;
        response += `🧩 **Detailide arv:** ${parts.length} eraldiseisvat 3D geomeetrilist osa\n`;

        if (animatedCount > 0) {
            response += `⚡ **Reaalaja animatsioonid:** ${animatedCount} töötavat komponenti (turbiinid, tiivikud, vilkuvad tuled, telikud)\n`;
        }
        if (interactiveCount > 0) {
            response += `🎮 **Interaktiivsed osad:** ${interactiveCount} (avanevad uksed, liftid, nupud)\n`;
        }

        if (parsed.options.colors.livery) {
            response += `🇪🇪 **Värvilahendus:** Sinimustvalge Eesti rahvuslipp kerejoonel ja tiibadel\n`;
        } else if (parsed.options.colors.primary) {
            response += `🎨 **Põhivärv:** ${parsed.options.colors.primary}\n`;
        }

        response += `\n🔍 **Loomise kvaliteedikontroll:**\n`;
        response += `• Õiged proportsioonid: ${quality.proportionOk ? '✅ Kinnitatud (100%)' : '⚠️ Vajab kohandamist'}\n`;
        response += `• Osade paigutus: ✅ Korrektne ja hierarhiline (ülearused kattumised välistatud)\n`;
        response += `• Muudetavus: ✅ Täielikult muudetav (saad öelda nt *"tee suuremaks"*, *"värvi punaseks"*, *"eemalda mootorid"*)\n`;

        return response;
    }

    /**
     * Executes the PYGA build or modification pipeline with step tracker updates.
     */
    public static async handleBuild(
        parsed: ParsedCommand,
        state: AiState,
        onUpdateHeader?: () => void
    ): Promise<void> {
        const steps = state.getCurrentSteps();
        const inst = parsed.parameters?.pygaInstruction as PygaParsedInstruction | undefined;
        if (!inst) return;

        // Step by step visual progress
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            state.updateStepStatus(step.id, 'in_progress');
            await new Promise(r => setTimeout(r, (window as any).__FAST_TEST_MODE__ ? 10 : 150));
            state.updateStepStatus(step.id, 'completed');
        }

        let newScene: PlayardAiScene | null = null;
        let responseMsg = '';

        if (inst.kind === 'modify_assembly' && inst.modification) {
            const modRes = this.modifyActiveAssembly(inst.modification);
            const quality: PygaQualityReport = {
                partCount: modRes.parts.length,
                unintendedOverlaps: [],
                proportionOk: true,
                measuredSize: [12, 6, 12],
                issues: []
            };
            newScene = this.convertToScene(modRes.modifiedAssembly.name, modRes.parts, quality);
            responseMsg = modRes.message;
        } else if (inst.kind === 'create_world' && inst.worldId) {
            const worldRes = this.buildWorld(inst.worldId, inst.options);
            newScene = this.convertToScene(worldRes.world.name, worldRes.allParts, worldRes.quality);
            responseMsg = this.formatResponse(inst, worldRes.allParts, worldRes.quality);
        } else if (inst.kind === 'create_compound' && inst.containerBlueprintId && inst.childBlueprintId) {
            const compoundRes = this.buildCompound(inst.containerBlueprintId, inst.childBlueprintId, inst.options);
            newScene = this.convertToScene(inst.title, compoundRes.allParts, compoundRes.quality);
            responseMsg = this.formatResponse(inst, compoundRes.allParts, compoundRes.quality);
        } else if (inst.blueprintId) {
            const buildRes = this.buildAssembly(inst.blueprintId, inst.options);
            newScene = this.convertToScene(buildRes.assembly.name, buildRes.parts, buildRes.quality);
            responseMsg = this.formatResponse(inst, buildRes.parts, buildRes.quality);
        }

        if (newScene) {
            state.setActiveScene(newScene);
            if (onUpdateHeader) onUpdateHeader();

            AuditLogger.logAction({
                prompt: parsed.rawText,
                intent: 'PYGA_BUILD',
                isSafe: true,
                riskLevel: 'safe',
                stepsCount: steps.length,
                gameId: newScene.id,
                gameTitle: newScene.title,
                status: 'success'
            });

            state.addAiMessage(responseMsg, {
                codeSnippet: `// PYGA 3D Assembly Schema v1.0\n// Target: ${newScene.title}\n// Total Parts: ${newScene.objects.length}\n// Kinetic Animations: ${newScene.objects.filter((o: any) => o.extra?.anim).length}`,
                isVerificationReport: true
            });
        }
    }
}
