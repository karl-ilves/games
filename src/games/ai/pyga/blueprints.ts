import {
    PygaPart,
    PygaBuildOptions,
    PygaBlueprint,
    PygaWorldBlueprint,
    PygaPlacement,
    Vec3
} from './types';

// Helper to create parts concisely
function createPart(
    id: string,
    name: string,
    role: string,
    shape: PygaPart['shape'],
    size: Vec3,
    pos: Vec3,
    color: string,
    extra?: Partial<PygaPart>
): PygaPart {
    return {
        id,
        name,
        role,
        shape,
        size,
        pos,
        color,
        ...extra
    };
}

export const BLUEPRINTS: Record<string, PygaBlueprint> = {};
export const WORLD_BLUEPRINTS: Record<string, PygaWorldBlueprint> = {};

function registerBlueprint(bp: PygaBlueprint) {
    BLUEPRINTS[bp.id] = bp;
}

function registerWorld(w: PygaWorldBlueprint) {
    WORLD_BLUEPRINTS[w.id] = w;
}

// -------------------------------------------------------------
// 1. LENNUKID JA SÕIDUKID (Aircraft & Vehicles)
// -------------------------------------------------------------

// Reisilennuk (Airliner)
registerBlueprint({
    id: 'airliner',
    name: 'Reisilennuk',
    category: 'aircraft',
    keywords: ['reisilennuk', 'lennuk', 'airliner', 'passenger plane', 'airplane', 'boeing', 'airbus'],
    icon: '✈️',
    realSize: [36, 12, 38],
    supportedFeatures: ['engines_running', 'gear_animated', 'cutaway', 'interior', 'doors', 'lights'],
    build(opts: PygaBuildOptions) {
        const parts: PygaPart[] = [];
        const bodyColor = opts.colors.primary || '#ffffff';
        const wingColor = opts.colors.secondary || '#94a3b8';
        const stripeColor = opts.colors.accent || (opts.colors.livery ? opts.colors.livery[0] : '#0284c7');
        const s = opts.scale;

        // Fuselage (Kere)
        parts.push(createPart('fuselage', 'Lennuki kere', 'fuselage', 'cylinder', [3.8 * s, 36 * s, 3.8 * s], [0, 4.5 * s, 0], bodyColor, {
            rot: [Math.PI / 2, 0, 0],
            material: 'metal'
        }));

        // Nose Cone (Nina)
        parts.push(createPart('nose', 'Lennuki nina', 'fuselage', 'cone', [3.8 * s, 5 * s, 3.8 * s], [0, 4.5 * s, 20.5 * s], bodyColor, {
            rot: [-Math.PI / 2, 0, 0],
            material: 'metal',
            attachedTo: 'fuselage'
        }));

        // Livery Stripes (Sinimustvalge Eesti rahvuslipp)
        if (opts.colors.livery && opts.colors.livery.length >= 3) {
            const [c1, c2, c3] = opts.colors.livery;
            parts.push(createPart('livery_blue', 'Sinimustvalge lipp (Sinine triip)', 'livery', 'box', [3.85 * s, 0.45 * s, 26 * s], [0, 5.2 * s, 0], c1, {
                material: 'metal',
                attachedTo: 'fuselage'
            }));
            parts.push(createPart('livery_black', 'Sinimustvalge lipp (Must triip)', 'livery', 'box', [3.86 * s, 0.45 * s, 26 * s], [0, 4.75 * s, 0], c2, {
                material: 'metal',
                attachedTo: 'fuselage'
            }));
            parts.push(createPart('livery_white', 'Sinimustvalge lipp (Valge triip)', 'livery', 'box', [3.87 * s, 0.45 * s, 26 * s], [0, 4.3 * s, 0], c3, {
                material: 'metal',
                attachedTo: 'fuselage'
            }));
        }

        // Cockpit Windows (Piloodikabiini aknad)
        parts.push(createPart('cockpit', 'Piloodikabiin', 'cockpit', 'box', [2.2 * s, 0.8 * s, 1.8 * s], [0, 5.6 * s, 18.2 * s], '#1e293b', {
            material: 'glass',
            attachedTo: 'fuselage'
        }));

        // Tail Cone
        parts.push(createPart('tail_cone', 'Sabaosa koonus', 'fuselage', 'cone', [3.8 * s, 6 * s, 1.2 * s], [0, 5.0 * s, -21 * s], bodyColor, {
            rot: [Math.PI / 2, 0, 0],
            material: 'metal',
            attachedTo: 'fuselage'
        }));

        // Vertical Stabilizer (Püstine sabauim)
        const finColor = opts.colors.livery && opts.colors.livery.length >= 2 ? opts.colors.livery[1] : stripeColor;
        parts.push(createPart('vertical_fin', 'Sabatüür / Uim', 'tail', 'box', [0.4 * s, 7 * s, 5.5 * s], [0, 9.5 * s, -19 * s], finColor, {
            rot: [-0.35, 0, 0],
            material: 'metal',
            attachedTo: 'fuselage'
        }));

        // Horizontal Stabilizers (Horisontaalsed sabatiivad)
        parts.push(createPart('tail_wing_l', 'Vasak sabatiib', 'tail', 'box', [5 * s, 0.25 * s, 2.2 * s], [-3 * s, 5.2 * s, -20.5 * s], wingColor, {
            material: 'metal',
            attachedTo: 'fuselage'
        }));
        parts.push(createPart('tail_wing_r', 'Parem sabatiib', 'tail', 'box', [5 * s, 0.25 * s, 2.2 * s], [3 * s, 5.2 * s, -20.5 * s], wingColor, {
            material: 'metal',
            attachedTo: 'fuselage'
        }));

        // Main Wings (Peamised tiivad)
        parts.push(createPart('wing_left', 'Vasak tiib', 'wing', 'box', [16 * s, 0.4 * s, 5 * s], [-9.5 * s, 3.8 * s, 0.5 * s], wingColor, {
            rot: [0, -0.2, 0.05],
            material: 'metal',
            attachedTo: 'fuselage'
        }));
        parts.push(createPart('wing_right', 'Parem tiib', 'wing', 'box', [16 * s, 0.4 * s, 5 * s], [9.5 * s, 3.8 * s, 0.5 * s], wingColor, {
            rot: [0, 0.2, -0.05],
            material: 'metal',
            attachedTo: 'fuselage'
        }));

        // Engines & Turbines
        const numEngines = opts.engines || 2;
        const engineSpinning = opts.features.includes('engines_running');
        const engineOffsets = numEngines === 4 ? [-11 * s, -5.5 * s, 5.5 * s, 11 * s] : [-6.5 * s, 6.5 * s];

        engineOffsets.forEach((ex, idx) => {
            const side = ex < 0 ? 'l' : 'r';
            const engId = `engine_${side}_${idx}`;
            parts.push(createPart(engId, `Mootor (Reaktiivmootor) ${idx + 1}`, 'engine', 'cylinder', [1.8 * s, 4.5 * s, 1.8 * s], [ex, 2.6 * s, 1.5 * s], '#334155', {
                rot: [Math.PI / 2, 0, 0],
                material: 'metal',
                attachedTo: ex < 0 ? 'wing_left' : 'wing_right'
            }));

            // Rotating Turbofan blade
            parts.push(createPart(`fan_${side}_${idx}`, `Ventilaatori tiivik (Labad) ${idx + 1}`, 'engine_fan', 'cylinder', [1.6 * s, 0.3 * s, 1.6 * s], [ex, 2.6 * s, 3.8 * s], '#0f172a', {
                rot: [Math.PI / 2, 0, 0],
                anim: engineSpinning ? { kind: 'spin', axis: 'z', speed: 18 } : undefined,
                attachedTo: engId
            }));
        });

        // Passenger Windows (Reisijate aknad rea kujul)
        for (let z = -12 * s; z <= 12 * s; z += 2.2 * s) {
            parts.push(createPart(`win_l_${Math.round(z)}`, 'Reisija aken', 'window', 'box', [0.1 * s, 0.6 * s, 0.8 * s], [-1.92 * s, 5.0 * s, z], '#0284c7', {
                material: 'glass',
                attachedTo: 'fuselage'
            }));
            parts.push(createPart(`win_r_${Math.round(z)}`, 'Reisija aken', 'window', 'box', [0.1 * s, 0.6 * s, 0.8 * s], [1.92 * s, 5.0 * s, z], '#0284c7', {
                material: 'glass',
                attachedTo: 'fuselage'
            }));
        }

        // Passenger Doors (Uksed)
        parts.push(createPart('door_front_l', 'Esiuks', 'door', 'box', [0.15 * s, 2.0 * s, 1.1 * s], [-1.92 * s, 4.4 * s, 14 * s], '#475569', {
            interactive: 'door',
            anim: { kind: 'swing', axis: 'y', amplitude: 1.2, trigger: 'click' },
            attachedTo: 'fuselage'
        }));

        // Interior Seats (if cutaway or interior requested)
        if (opts.features.includes('interior') || opts.features.includes('cutaway')) {
            for (let z = -10 * s; z <= 10 * s; z += 2.5 * s) {
                parts.push(createPart(`seat_l_${Math.round(z)}`, 'Reisija iste (V)', 'seat', 'box', [0.9 * s, 1.1 * s, 0.9 * s], [-1.0 * s, 3.8 * s, z], '#1e40af', {
                    attachedTo: 'fuselage'
                }));
                parts.push(createPart(`seat_r_${Math.round(z)}`, 'Reisija iste (P)', 'seat', 'box', [0.9 * s, 1.1 * s, 0.9 * s], [1.0 * s, 3.8 * s, z], '#1e40af', {
                    attachedTo: 'fuselage'
                }));
            }
        }

        // Landing Gear (Telik)
        const gearAnimated = opts.features.includes('gear_animated');
        parts.push(createPart('gear_nose', 'Ninaratas (telik)', 'gear', 'cylinder', [0.8 * s, 0.3 * s, 0.8 * s], [0, 0.5 * s, 15 * s], '#111111', {
            rot: [0, 0, Math.PI / 2],
            material: 'rubber',
            anim: gearAnimated ? { kind: 'retract', axis: 'y', amplitude: 2.5, speed: 0.5 } : undefined,
            attachedTo: 'fuselage'
        }));
        parts.push(createPart('gear_main_l', 'Vasak peatelik', 'gear', 'cylinder', [1.2 * s, 0.5 * s, 1.2 * s], [-4 * s, 0.7 * s, 0], '#111111', {
            rot: [0, 0, Math.PI / 2],
            material: 'rubber',
            anim: gearAnimated ? { kind: 'retract', axis: 'y', amplitude: 2.8, speed: 0.5 } : undefined,
            attachedTo: 'wing_left'
        }));
        parts.push(createPart('gear_main_r', 'Parem peatelik', 'gear', 'cylinder', [1.2 * s, 0.5 * s, 1.2 * s], [4 * s, 0.7 * s, 0], '#111111', {
            rot: [0, 0, Math.PI / 2],
            material: 'rubber',
            anim: gearAnimated ? { kind: 'retract', axis: 'y', amplitude: 2.8, speed: 0.5 } : undefined,
            attachedTo: 'wing_right'
        }));

        // Navigation / Strobe Lights (Töötavad tuled)
        parts.push(createPart('nav_light_left', 'Tiivatuli (Punane)', 'light', 'sphere', [0.3 * s, 0.3 * s, 0.3 * s], [-17.2 * s, 4.0 * s, 0], '#ef4444', {
            material: 'neon',
            anim: { kind: 'blink', speed: 1.5, color2: '#550000' },
            attachedTo: 'wing_left'
        }));
        parts.push(createPart('nav_light_right', 'Tiivatuli (Roheline)', 'light', 'sphere', [0.3 * s, 0.3 * s, 0.3 * s], [17.2 * s, 4.0 * s, 0], '#22c55e', {
            material: 'neon',
            anim: { kind: 'blink', speed: 1.5, color2: '#005500' },
            attachedTo: 'wing_right'
        }));

        return parts;
    }
});

// Kaubalennuk (Cargo Plane)
registerBlueprint({
    id: 'cargo_plane',
    name: 'Kaubalennuk',
    category: 'aircraft',
    keywords: ['kaubalennuk', 'cargo plane', 'transpordilennuk'],
    icon: '📦✈️',
    realSize: [42, 14, 44],
    build(opts) {
        opts.features.push('engines_running');
        const airlinerParts = BLUEPRINTS['airliner'].build(opts);
        // Add cargo rear ramp door
        airlinerParts.push(createPart('cargo_ramp', 'Tagumine kaubaluuk', 'door', 'box', [2.8 * opts.scale, 0.2 * opts.scale, 4.5 * opts.scale], [0, 2.5 * opts.scale, -18 * opts.scale], '#334155', {
            rot: [0.3, 0, 0],
            interactive: 'door',
            anim: { kind: 'swing', axis: 'x', amplitude: 0.6, trigger: 'click' }
        }));
        return airlinerParts;
    }
});

// Hävituslennuk (Fighter Jet)
registerBlueprint({
    id: 'fighter_jet',
    name: 'Hävituslennuk',
    category: 'aircraft',
    keywords: ['hävitaja', 'hävituslennuk', 'fighter jet', 'jet', 'f16', 'f22', 'f35'],
    icon: '🛩️',
    realSize: [12, 4.5, 16],
    build(opts) {
        const s = opts.scale;
        const color = opts.colors.primary || '#475569';
        const parts: PygaPart[] = [];

        // Aerodynamic Fuselage
        parts.push(createPart('fuselage', 'Kere', 'fuselage', 'cone', [2.2 * s, 14 * s, 1.4 * s], [0, 1.5 * s, 0], color, {
            rot: [-Math.PI / 2, 0, 0],
            material: 'metal'
        }));
        // Cockpit canopy
        parts.push(createPart('canopy', 'Kupliklaas', 'cockpit', 'sphere', [1.2 * s, 1.0 * s, 3.2 * s], [0, 2.3 * s, 2.5 * s], '#38bdf8', {
            material: 'glass',
            opacity: 0.6
        }));
        // Delta Wings
        parts.push(createPart('delta_wing_l', 'Vasak tiib', 'wing', 'box', [5.5 * s, 0.15 * s, 6.0 * s], [-3.4 * s, 1.4 * s, -1.0 * s], color, {
            rot: [0, -0.4, 0],
            material: 'metal'
        }));
        parts.push(createPart('delta_wing_r', 'Parem tiib', 'wing', 'box', [5.5 * s, 0.15 * s, 6.0 * s], [3.4 * s, 1.4 * s, -1.0 * s], color, {
            rot: [0, 0.4, 0],
            material: 'metal'
        }));
        // Twin Vertical Tails
        parts.push(createPart('vtail_l', 'Vasak sabauim', 'tail', 'box', [0.2 * s, 2.5 * s, 2.5 * s], [-1.2 * s, 3.0 * s, -5.5 * s], color, {
            rot: [0, 0, -0.2]
        }));
        parts.push(createPart('vtail_r', 'Parem sabauim', 'tail', 'box', [0.2 * s, 2.5 * s, 2.5 * s], [1.2 * s, 3.0 * s, -5.5 * s], color, {
            rot: [0, 0, 0.2]
        }));
        // Afterburner Nozzle
        parts.push(createPart('afterburner', 'Põlemiskamber / düüs', 'engine', 'cylinder', [1.2 * s, 1.5 * s, 1.2 * s], [0, 1.5 * s, -7.2 * s], '#f97316', {
            rot: [Math.PI / 2, 0, 0],
            material: 'neon',
            anim: { kind: 'blink', speed: 12, color2: '#ef4444' }
        }));
        return parts;
    }
});

// Helikopter (Helicopter)
registerBlueprint({
    id: 'helicopter',
    name: 'Helikopter',
    category: 'aircraft',
    keywords: ['helikopter', 'kopter', 'helicopter', 'chopper'],
    icon: '🚁',
    realSize: [14, 4.5, 15],
    build(opts) {
        const s = opts.scale;
        const color = opts.colors.primary || '#0284c7';
        const parts: PygaPart[] = [];

        // Cabin
        parts.push(createPart('cabin', 'Kabiin', 'fuselage', 'sphere', [2.8 * s, 2.4 * s, 4.5 * s], [0, 2.2 * s, 0], color));
        // Windshield
        parts.push(createPart('windshield', 'Esiklaas', 'cockpit', 'sphere', [2.2 * s, 1.6 * s, 2.2 * s], [0, 2.3 * s, 1.6 * s], '#1e293b', { material: 'glass' }));
        // Tail Boom
        parts.push(createPart('tail_boom', 'Sabapoom', 'tail', 'cylinder', [0.4 * s, 6.5 * s, 0.4 * s], [0, 2.5 * s, -4.8 * s], color, {
            rot: [Math.PI / 2, 0, 0]
        }));
        // Main Rotor Mast & Spinning Blades
        parts.push(createPart('rotor_mast', 'Rootori võll', 'rotor', 'cylinder', [0.3 * s, 1.0 * s, 0.3 * s], [0, 3.8 * s, 0.2 * s], '#334155'));
        parts.push(createPart('main_rotor', 'Peatiivik (pöörlev)', 'rotor', 'box', [13 * s, 0.08 * s, 0.6 * s], [0, 4.3 * s, 0.2 * s], '#0f172a', {
            anim: { kind: 'spin', axis: 'y', speed: 22 }
        }));
        // Tail Rotor
        parts.push(createPart('tail_rotor', 'Sabatiivik', 'rotor', 'box', [0.08 * s, 2.0 * s, 0.3 * s], [0.35 * s, 2.8 * s, -8.0 * s], '#0f172a', {
            anim: { kind: 'spin', axis: 'x', speed: 25 }
        }));
        // Skids (Maandumisjalased)
        parts.push(createPart('skid_l', 'Vasak jalas', 'gear', 'cylinder', [0.15 * s, 5.0 * s, 0.15 * s], [-1.2 * s, 0.3 * s, 0], '#475569', { rot: [Math.PI / 2, 0, 0] }));
        parts.push(createPart('skid_r', 'Parem jalas', 'gear', 'cylinder', [0.15 * s, 5.0 * s, 0.15 * s], [1.2 * s, 0.3 * s, 0], '#475569', { rot: [Math.PI / 2, 0, 0] }));
        return parts;
    }
});

// Auto & Võidusõiduauto (Car & Racing Car)
registerBlueprint({
    id: 'car',
    name: 'Sõiduauto',
    category: 'vehicle',
    keywords: ['auto', 'sõiduauto', 'car', 'sedan'],
    icon: '🚗',
    realSize: [2.0, 1.5, 4.4],
    build(opts) {
        const s = opts.scale;
        const color = opts.colors.primary || '#ef4444';
        const parts: PygaPart[] = [];

        // Body Chassis
        parts.push(createPart('chassis', 'Kere alaosa', 'body', 'box', [2.0 * s, 0.8 * s, 4.4 * s], [0, 0.8 * s, 0], color, { material: 'metal' }));
        // Cabin / Roof
        parts.push(createPart('cabin', 'Katus ja salong', 'body', 'box', [1.7 * s, 0.7 * s, 2.2 * s], [0, 1.55 * s, -0.2 * s], '#1e293b', { material: 'glass' }));
        // 4 Wheels
        const wheelOffsets: [number, number][] = [[-1.05 * s, 1.3 * s], [1.05 * s, 1.3 * s], [-1.05 * s, -1.3 * s], [1.05 * s, -1.3 * s]];
        wheelOffsets.forEach(([wx, wz], idx) => {
            parts.push(createPart(`wheel_${idx}`, `Ratas ${idx + 1}`, 'wheel', 'cylinder', [0.7 * s, 0.35 * s, 0.7 * s], [wx, 0.45 * s, wz], '#111111', {
                rot: [0, 0, Math.PI / 2],
                material: 'rubber',
                anim: { kind: 'spin', axis: 'x', speed: 8 }
            }));
        });
        // Headlights (Töötavad tuled)
        parts.push(createPart('headlight_l', 'Vasak esituli', 'light', 'box', [0.35 * s, 0.25 * s, 0.1 * s], [-0.65 * s, 0.9 * s, 2.22 * s], '#fef08a', { material: 'neon' }));
        parts.push(createPart('headlight_r', 'Parem esituli', 'light', 'box', [0.35 * s, 0.25 * s, 0.1 * s], [0.65 * s, 0.9 * s, 2.22 * s], '#fef08a', { material: 'neon' }));
        return parts;
    }
});

registerBlueprint({
    id: 'racecar',
    name: 'Võidusõiduauto',
    category: 'vehicle',
    keywords: ['võidusõiduauto', 'racecar', 'racing car', 'f1', 'superauto'],
    icon: '🏎️',
    realSize: [2.1, 1.1, 4.8],
    build(opts) {
        opts.colors.primary = opts.colors.primary || '#e11d48';
        const carParts = BLUEPRINTS['car'].build(opts);
        const s = opts.scale;
        // Add rear spoiler
        carParts.push(createPart('spoiler', 'Tagaspoiler', 'wing', 'box', [2.0 * s, 0.15 * s, 0.5 * s], [0, 1.5 * s, -2.1 * s], '#111111'));
        return carParts;
    }
});

// Rong (Train)
registerBlueprint({
    id: 'train',
    name: 'Rong',
    category: 'vehicle',
    keywords: ['rong', 'vedur', 'train', 'locomotive'],
    icon: '🚂',
    realSize: [3.2, 4.5, 18],
    build(opts) {
        const s = opts.scale;
        const color = opts.colors.primary || '#1e3a8a';
        const parts: PygaPart[] = [];
        // Engine body
        parts.push(createPart('locomotive', 'Veduri kere', 'body', 'box', [3.0 * s, 3.4 * s, 16 * s], [0, 2.4 * s, 0], color, { material: 'metal' }));
        // Windshield
        parts.push(createPart('windshield', 'Esiklaas', 'window', 'box', [2.6 * s, 1.2 * s, 0.2 * s], [0, 3.2 * s, 8.05 * s], '#38bdf8', { material: 'glass' }));
        // Wheels
        for (let wz = -6 * s; wz <= 6 * s; wz += 3 * s) {
            parts.push(createPart(`tr_w_l_${Math.round(wz)}`, 'Ratas (V)', 'wheel', 'cylinder', [1.0 * s, 0.3 * s, 1.0 * s], [-1.55 * s, 0.6 * s, wz], '#334155', {
                rot: [0, 0, Math.PI / 2]
            }));
            parts.push(createPart(`tr_w_r_${Math.round(wz)}`, 'Ratas (P)', 'wheel', 'cylinder', [1.0 * s, 0.3 * s, 1.0 * s], [1.55 * s, 0.6 * s, wz], '#334155', {
                rot: [0, 0, Math.PI / 2]
            }));
        }
        return parts;
    }
});

// Laev (Ship)
registerBlueprint({
    id: 'boat',
    name: 'Laev',
    category: 'vehicle',
    keywords: ['laev', 'paat', 'ship', 'boat', 'yacht', 'praam'],
    icon: '🚢',
    realSize: [8, 10, 26],
    build(opts) {
        const s = opts.scale;
        const color = opts.colors.primary || '#ffffff';
        const parts: PygaPart[] = [];
        // Hull
        parts.push(createPart('hull', 'Kere (veeliin)', 'hull', 'box', [7 * s, 3.5 * s, 24 * s], [0, 2.0 * s, 0], '#0f172a', {
            anim: { kind: 'bob', speed: 1.2, amplitude: 0.3 }
        }));
        // Superstructure
        parts.push(createPart('cabin', 'Kaptenisild ja tekk', 'cabin', 'box', [5 * s, 4.0 * s, 12 * s], [0, 5.5 * s, -2 * s], color));
        // Chimney / Funnel
        parts.push(createPart('funnel', 'Korsten', 'engine', 'cylinder', [1.2 * s, 3.0 * s, 1.2 * s], [0, 8.5 * s, -3 * s], '#ef4444'));
        return parts;
    }
});

// Rakett ja Kosmoselaev (Rocket & Spaceship)
registerBlueprint({
    id: 'rocket',
    name: 'Rakett',
    category: 'vehicle',
    keywords: ['rakett', 'kosmoselaev', 'rocket', 'spaceship'],
    icon: '🚀',
    realSize: [6, 28, 6],
    build(opts) {
        const s = opts.scale;
        const color = opts.colors.primary || '#ffffff';
        const parts: PygaPart[] = [];
        // Tall cylindrical stage
        parts.push(createPart('stage1', 'Raketi peakeha', 'body', 'cylinder', [3.5 * s, 20 * s, 3.5 * s], [0, 10 * s, 0], color, { material: 'metal' }));
        // Nose Cone
        parts.push(createPart('nose', 'Ninakoonus', 'nose', 'cone', [3.5 * s, 6 * s, 3.5 * s], [0, 23 * s, 0], '#ef4444', { material: 'metal' }));
        // 4 Fins
        const finAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
        finAngles.forEach((ang, idx) => {
            const fx = Math.cos(ang) * 2.2 * s;
            const fz = Math.sin(ang) * 2.2 * s;
            parts.push(createPart(`fin_${idx}`, `Stabiliseerimistüür ${idx + 1}`, 'fin', 'box', [0.2 * s, 3.5 * s, 1.8 * s], [fx, 2.2 * s, fz], '#dc2626'));
        });
        // Exhaust fire
        parts.push(createPart('exhaust', 'Reaktiivleek', 'engine', 'cone', [2.8 * s, 5.0 * s, 2.8 * s], [0, -2.5 * s, 0], '#f97316', {
            rot: [Math.PI, 0, 0],
            material: 'neon',
            anim: { kind: 'blink', speed: 15, color2: '#eab308' }
        }));
        return parts;
    }
});

// -------------------------------------------------------------
// 2. HOONED (Buildings)
// -------------------------------------------------------------

// Maja koos garaažiga (House with Garage)
registerBlueprint({
    id: 'house',
    name: 'Kahekorruseline maja',
    category: 'building',
    keywords: ['maja', 'elumaja', 'kodu', 'house', 'home'],
    icon: '🏠',
    realSize: [14, 8, 12],
    supportedFeatures: ['garage', 'doors', 'lights'],
    build(opts) {
        const s = opts.scale;
        const wallColor = opts.colors.primary || '#f8fafc';
        const roofColor = opts.colors.secondary || '#991b1b';
        const hasGarage = opts.features.includes('garage');
        const parts: PygaPart[] = [];

        // 1st Floor
        parts.push(createPart('floor_1', 'Põhikorrus (esimene korrus)', 'wall', 'box', [9 * s, 3.5 * s, 9 * s], [0, 1.75 * s, 0], wallColor, { material: 'stone' }));
        // 2nd Floor
        parts.push(createPart('floor_2', 'Teine korrus', 'wall', 'box', [9 * s, 3.2 * s, 9 * s], [0, 5.1 * s, 0], wallColor, { material: 'stone' }));
        // Pitched Roof
        parts.push(createPart('roof', 'Katus', 'roof', 'cone', [12 * s, 3.0 * s, 12 * s], [0, 8.2 * s, 0], roofColor, {
            rot: [0, Math.PI / 4, 0]
        }));
        // Front Door (Interactive open/close)
        parts.push(createPart('front_door', 'Välisuks', 'door', 'box', [1.2 * s, 2.2 * s, 0.15 * s], [0, 1.2 * s, 4.55 * s], '#78350f', {
            interactive: 'door',
            anim: { kind: 'swing', axis: 'y', amplitude: 1.3, trigger: 'click' }
        }));
        // Windows
        const winOffsets: [number, number, number][] = [
            [-2.5 * s, 1.8 * s, 4.55 * s], [2.5 * s, 1.8 * s, 4.55 * s],
            [-2.5 * s, 5.0 * s, 4.55 * s], [2.5 * s, 5.0 * s, 4.55 * s]
        ];
        winOffsets.forEach(([wx, wy, wz], idx) => {
            parts.push(createPart(`win_${idx}`, `Aken ${idx + 1}`, 'window', 'box', [1.4 * s, 1.4 * s, 0.1 * s], [wx, wy, wz], '#38bdf8', { material: 'glass' }));
        });

        // Garage Addition
        if (hasGarage) {
            parts.push(createPart('garage_body', 'Garaaž', 'wall', 'box', [5.5 * s, 3.0 * s, 7 * s], [6.5 * s, 1.5 * s, -0.5 * s], wallColor, { material: 'stone' }));
            parts.push(createPart('garage_door', 'Garaažiuks (tõstetav)', 'door', 'box', [4.2 * s, 2.5 * s, 0.15 * s], [6.5 * s, 1.35 * s, 3.05 * s], '#475569', {
                interactive: 'door',
                anim: { kind: 'slide', axis: 'y', amplitude: 2.2, speed: 0.5, trigger: 'click' }
            }));
        }

        return parts;
    }
});

// Pilvelõhkuja (Skyscraper)
registerBlueprint({
    id: 'skyscraper',
    name: 'Pilvelõhkuja',
    category: 'building',
    keywords: ['pilvelõhkuja', 'kõrghoone', 'skyscraper', 'tower'],
    icon: '🏙️',
    realSize: [16, 55, 16],
    build(opts) {
        const s = opts.scale;
        const floors = Math.max(8, opts.floors || 16);
        const parts: PygaPart[] = [];
        const baseH = floors * 3.2 * s;

        parts.push(createPart('tower_core', 'Pilvelõhkuja torn', 'wall', 'box', [14 * s, baseH, 14 * s], [0, baseH / 2, 0], '#0284c7', {
            material: 'glass',
            opacity: 0.75
        }));
        // Spire & Warning Beacon
        parts.push(createPart('spire', 'Katusetorn / antenn', 'roof', 'cylinder', [0.3 * s, 10 * s, 0.8 * s], [0, baseH + 5 * s, 0], '#cbd5e1', { material: 'metal' }));
        parts.push(createPart('beacon', 'Lennunduse vilkur', 'light', 'sphere', [0.5 * s, 0.5 * s, 0.5 * s], [0, baseH + 10.2 * s, 0], '#ef4444', {
            material: 'neon',
            anim: { kind: 'blink', speed: 2 }
        }));
        return parts;
    }
});

// Lennukiangaar (Airplane Hangar) - container that can fit an airliner
registerBlueprint({
    id: 'hangar',
    name: 'Lennukiangaar',
    category: 'building',
    keywords: ['angaar', 'lennukiangaar', 'hangar', 'airplane hangar'],
    icon: '🏛️✈️',
    isContainer: true,
    realSize: [48, 16, 46],
    build(opts) {
        const s = opts.scale;
        const color = opts.colors.primary || '#64748b';
        const parts: PygaPart[] = [];

        // Huge arched / framed roof & walls
        parts.push(createPart('floor', 'Angaari betoonpõrand', 'floor', 'box', [46 * s, 0.4 * s, 44 * s], [0, 0.2 * s, 0], '#334155', { material: 'stone' }));
        parts.push(createPart('wall_left', 'Vasak sein', 'wall', 'box', [1.0 * s, 12 * s, 44 * s], [-22.5 * s, 6.2 * s, 0], color, { material: 'metal' }));
        parts.push(createPart('wall_right', 'Parem sein', 'wall', 'box', [1.0 * s, 12 * s, 44 * s], [22.5 * s, 6.2 * s, 0], color, { material: 'metal' }));
        parts.push(createPart('wall_back', 'Tagasein', 'wall', 'box', [46 * s, 12 * s, 1.0 * s], [0, 6.2 * s, -21.5 * s], color, { material: 'metal' }));
        // Curved roof beam
        parts.push(createPart('roof', 'Kumer teraskatus', 'roof', 'cylinder', [24 * s, 44 * s, 24 * s], [0, 11 * s, 0], '#475569', {
            rot: [Math.PI / 2, 0, 0],
            material: 'metal'
        }));
        // Massive sliding gates (left and right)
        parts.push(createPart('gate_l', 'Vasak angaariuks', 'door', 'box', [21 * s, 11 * s, 0.3 * s], [-10.8 * s, 5.8 * s, 21.8 * s], '#1e293b', {
            interactive: 'door',
            anim: { kind: 'slide', axis: 'x', amplitude: 18 * s, speed: 0.3, trigger: 'click' }
        }));
        parts.push(createPart('gate_r', 'Parem angaariuks', 'door', 'box', [21 * s, 11 * s, 0.3 * s], [10.8 * s, 5.8 * s, 21.8 * s], '#1e293b', {
            interactive: 'door',
            anim: { kind: 'slide', axis: 'x', amplitude: 18 * s, speed: 0.3, trigger: 'click' }
        }));

        return parts;
    }
});

// Lennujaama Terminal (Airport Terminal)
registerBlueprint({
    id: 'terminal',
    name: 'Lennujaama terminal',
    category: 'building',
    keywords: ['lennujaam', 'terminal', 'lennujaama terminal', 'airport terminal'],
    icon: '🏢✈️',
    realSize: [50, 14, 24],
    build(opts) {
        const s = opts.scale;
        const parts: PygaPart[] = [];
        // Main glass concourse
        parts.push(createPart('concourse', 'Terminali peahoone', 'wall', 'box', [48 * s, 10 * s, 20 * s], [0, 5 * s, 0], '#0284c7', {
            material: 'glass',
            opacity: 0.85
        }));
        // Aerodynamic wave roof
        parts.push(createPart('roof', 'Kaasaegne lennukatus', 'roof', 'box', [52 * s, 1.2 * s, 24 * s], [0, 10.6 * s, 0], '#f8fafc', { material: 'metal' }));
        // Control tower integrated
        parts.push(createPart('tower_stem', 'Juhtimistorni jalg', 'wall', 'cylinder', [3.5 * s, 18 * s, 3.5 * s], [18 * s, 9 * s, -6 * s], '#94a3b8', { material: 'stone' }));
        parts.push(createPart('tower_cab', 'Lennujuhtimiskabiin', 'cockpit', 'cylinder', [6.0 * s, 3.0 * s, 4.5 * s], [18 * s, 19 * s, -6 * s], '#0ea5e9', { material: 'glass' }));
        // Jetway / Passenger boarding bridge
        parts.push(createPart('jetway', 'Reisijasild (Jetway)', 'door', 'box', [3.0 * s, 3.0 * s, 8.0 * s], [-12 * s, 5.0 * s, 13 * s], '#64748b'));
        return parts;
    }
});

// Kool, Haigla, Pood, Restoran, Tehas, Hotell (Community Buildings)
registerBlueprint({
    id: 'school',
    name: 'Kool',
    category: 'building',
    keywords: ['kool', 'koolimaja', 'school'],
    icon: '🏫',
    realSize: [28, 9, 18],
    build(opts) {
        const s = opts.scale;
        return [
            createPart('main', 'Koolihoone', 'wall', 'box', [26 * s, 8 * s, 16 * s], [0, 4 * s, 0], '#ea580c', { material: 'stone' }),
            createPart('clock_tower', 'Kellatorn', 'roof', 'box', [4 * s, 5 * s, 4 * s], [0, 10.5 * s, 6 * s], '#c2410c'),
            createPart('door', 'Kooli sissepääs', 'door', 'box', [2 * s, 2.8 * s, 0.2 * s], [0, 1.4 * s, 8.1 * s], '#78350f', { interactive: 'door' })
        ];
    }
});

registerBlueprint({
    id: 'hospital',
    name: 'Haigla',
    category: 'building',
    keywords: ['haigla', 'hospital', 'kliinik'],
    icon: '🏥',
    realSize: [30, 14, 20],
    build(opts) {
        const s = opts.scale;
        return [
            createPart('main', 'Haiglahoone', 'wall', 'box', [28 * s, 12 * s, 18 * s], [0, 6 * s, 0], '#f8fafc', { material: 'stone' }),
            createPart('cross', 'Punane rist', 'decor', 'box', [3.5 * s, 3.5 * s, 0.2 * s], [0, 9 * s, 9.1 * s], '#ef4444'),
            createPart('helipad', 'Kopteriväljak katusel', 'roof', 'cylinder', [8 * s, 0.3 * s, 8 * s], [0, 12.2 * s, 0], '#334155')
        ];
    }
});

registerBlueprint({
    id: 'factory',
    name: 'Tehas',
    category: 'building',
    keywords: ['tehas', 'vabrik', 'factory', 'plant'],
    icon: '🏭',
    realSize: [32, 16, 22],
    build(opts) {
        const s = opts.scale;
        return [
            createPart('hall', 'Tootmishall', 'wall', 'box', [30 * s, 8 * s, 20 * s], [0, 4 * s, 0], '#475569', { material: 'metal' }),
            createPart('chimney1', 'Suur korsten', 'engine', 'cylinder', [1.5 * s, 12 * s, 2.2 * s], [-8 * s, 10 * s, -6 * s], '#b91c1c'),
            createPart('chimney2', 'Väike korsten', 'engine', 'cylinder', [1.2 * s, 9 * s, 1.8 * s], [-4 * s, 8.5 * s, -6 * s], '#b91c1c')
        ];
    }
});

// -------------------------------------------------------------
// 3. MÖÖBEL JA IGAPÄEVASED ESEMED (Furniture & Items)
// -------------------------------------------------------------

registerBlueprint({
    id: 'table',
    name: 'Laud',
    category: 'furniture',
    keywords: ['laud', 'kirjutuslaud', 'söögilaud', 'table', 'desk'],
    icon: '🪑',
    realSize: [2.0, 0.8, 1.0],
    build(opts) {
        const s = opts.scale;
        const wood = opts.colors.primary || '#78350f';
        const parts: PygaPart[] = [];
        parts.push(createPart('top', 'Lauaplaat', 'tabletop', 'box', [2.0 * s, 0.1 * s, 1.0 * s], [0, 0.75 * s, 0], wood, { material: 'wood' }));
        const legOffsets = [[-0.9 * s, -0.4 * s], [0.9 * s, -0.4 * s], [-0.9 * s, 0.4 * s], [0.9 * s, 0.4 * s]];
        legOffsets.forEach(([lx, lz], idx) => {
            parts.push(createPart(`leg_${idx}`, `Laud jalg ${idx + 1}`, 'leg', 'cylinder', [0.08 * s, 0.7 * s, 0.08 * s], [lx, 0.35 * s, lz], '#292524', { material: 'metal' }));
        });
        return parts;
    }
});

registerBlueprint({
    id: 'chair',
    name: 'Tool',
    category: 'furniture',
    keywords: ['tool', 'chair', 'iste'],
    icon: '🪑',
    realSize: [0.6, 0.95, 0.6],
    build(opts) {
        const s = opts.scale;
        const color = opts.colors.primary || '#0284c7';
        return [
            createPart('seat', 'Iste', 'seat', 'box', [0.6 * s, 0.08 * s, 0.6 * s], [0, 0.45 * s, 0], color, { material: 'fabric' }),
            createPart('back', 'Seljatugi', 'seat', 'box', [0.6 * s, 0.5 * s, 0.08 * s], [0, 0.74 * s, -0.26 * s], color, { material: 'fabric' }),
            createPart('leg_1', 'Jalg 1', 'leg', 'cylinder', [0.05 * s, 0.42 * s, 0.05 * s], [-0.25 * s, 0.21 * s, -0.25 * s], '#111111'),
            createPart('leg_2', 'Jalg 2', 'leg', 'cylinder', [0.05 * s, 0.42 * s, 0.05 * s], [0.25 * s, 0.21 * s, -0.25 * s], '#111111'),
            createPart('leg_3', 'Jalg 3', 'leg', 'cylinder', [0.05 * s, 0.42 * s, 0.05 * s], [-0.25 * s, 0.21 * s, 0.25 * s], '#111111'),
            createPart('leg_4', 'Jalg 4', 'leg', 'cylinder', [0.05 * s, 0.42 * s, 0.05 * s], [0.25 * s, 0.21 * s, 0.25 * s], '#111111')
        ];
    }
});

registerBlueprint({
    id: 'computer',
    name: 'Arvuti ja kuvar',
    category: 'furniture',
    keywords: ['arvuti', 'pc', 'kuvar', 'ekraan', 'computer', 'monitor'],
    icon: '💻',
    realSize: [0.8, 0.5, 0.3],
    build(opts) {
        const s = opts.scale;
        return [
            createPart('screen', 'Kuvari paneel', 'screen', 'box', [0.8 * s, 0.45 * s, 0.04 * s], [0, 0.32 * s, 0], '#0ea5e9', { material: 'neon' }),
            createPart('stand', 'Kuvari jalg', 'stand', 'cylinder', [0.06 * s, 0.25 * s, 0.2 * s], [0, 0.12 * s, 0], '#334155'),
            createPart('keyboard', 'Klaviatuur', 'item', 'box', [0.6 * s, 0.03 * s, 0.25 * s], [0, 0.02 * s, 0.3 * s], '#1e293b')
        ];
    }
});

// -------------------------------------------------------------
// 4. LOODUS (Nature)
// -------------------------------------------------------------

registerBlueprint({
    id: 'tree',
    name: 'Puu',
    category: 'nature',
    keywords: ['puu', 'kask', 'mänd', 'kuusk', 'tree', 'mets'],
    icon: '🌲',
    realSize: [4.5, 8.0, 4.5],
    build(opts) {
        const s = opts.scale;
        const foliageColor = opts.colors.primary || '#15803d';
        return [
            createPart('trunk', 'Tüvi', 'trunk', 'cylinder', [0.6 * s, 3.5 * s, 0.8 * s], [0, 1.75 * s, 0], '#78350f', { material: 'wood' }),
            createPart('crown_1', 'Võra 1', 'foliage', 'cone', [4.5 * s, 3.2 * s, 4.5 * s], [0, 4.2 * s, 0], foliageColor, { material: 'foliage' }),
            createPart('crown_2', 'Võra 2', 'foliage', 'cone', [3.5 * s, 2.8 * s, 3.5 * s], [0, 5.8 * s, 0], foliageColor, { material: 'foliage' }),
            createPart('crown_3', 'Võra tipp', 'foliage', 'cone', [2.2 * s, 2.2 * s, 2.2 * s], [0, 7.2 * s, 0], foliageColor, { material: 'foliage' })
        ];
    }
});

registerBlueprint({
    id: 'rock',
    name: 'Kivi / Kalju',
    category: 'nature',
    keywords: ['kivi', 'kalju', 'rock', 'boulder'],
    icon: '🪨',
    realSize: [3.0, 2.2, 3.0],
    build(opts) {
        const s = opts.scale;
        return [
            createPart('rock', 'Graniitkivi', 'rock', 'sphere', [3.0 * s, 2.2 * s, 2.8 * s], [0, 1.1 * s, 0], '#64748b', { material: 'stone' })
        ];
    }
});

registerBlueprint({
    id: 'mountain',
    name: 'Mägi',
    category: 'nature',
    keywords: ['mägi', 'mäed', 'mountain', 'hill'],
    icon: '⛰️',
    realSize: [36, 28, 36],
    build(opts) {
        const s = opts.scale;
        return [
            createPart('base', 'Mäejalam', 'terrain', 'cone', [36 * s, 24 * s, 36 * s], [0, 12 * s, 0], '#334155', { material: 'stone' }),
            createPart('snow_cap', 'Lumemüts', 'snow', 'cone', [14 * s, 8 * s, 14 * s], [0, 24 * s, 0], '#ffffff')
        ];
    }
});

// -------------------------------------------------------------
// 5. TEED JA LENNUJAAMAD (Roads & Airport Infrastructure)
// -------------------------------------------------------------

registerBlueprint({
    id: 'runway',
    name: 'Lennurada',
    category: 'infrastructure',
    keywords: ['lennurada', 'lennuväli', 'runway', 'stardirada'],
    icon: '🛫',
    realSize: [16, 0.2, 80],
    build(opts) {
        const s = opts.scale;
        const length = (opts.count ? opts.count * 40 : 80) * s;
        const parts: PygaPart[] = [];

        // Asphalt runway strip
        parts.push(createPart('asphalt', 'Asfaldipind', 'road', 'box', [16 * s, 0.15 * s, length], [0, 0.08 * s, 0], '#1e293b', { material: 'stone' }));

        // Centerline dashed stripes
        for (let z = -length / 2 + 5 * s; z < length / 2 - 5 * s; z += 10 * s) {
            parts.push(createPart(`stripe_${Math.round(z)}`, 'Keskjoon', 'marking', 'box', [0.6 * s, 0.18 * s, 5 * s], [0, 0.1 * s, z], '#ffffff'));
        }

        // Threshold touchdown stripes
        parts.push(createPart('thresh_s', 'Lävepakk (Lõuna)', 'marking', 'box', [12 * s, 0.18 * s, 1.5 * s], [0, 0.1 * s, -length / 2 + 3 * s], '#ffffff'));
        parts.push(createPart('thresh_n', 'Lävepakk (Põhi)', 'marking', 'box', [12 * s, 0.18 * s, 1.5 * s], [0, 0.1 * s, length / 2 - 3 * s], '#ffffff'));

        // Runway Edge Lights (Töötavad ääretuled)
        for (let z = -length / 2; z <= length / 2; z += 15 * s) {
            parts.push(createPart(`light_l_${Math.round(z)}`, 'Ääretuli (V)', 'light', 'sphere', [0.3 * s, 0.3 * s, 0.3 * s], [-8.2 * s, 0.25 * s, z], '#fef08a', {
                material: 'neon',
                anim: { kind: 'blink', speed: 1.0, color2: '#555500' }
            }));
            parts.push(createPart(`light_r_${Math.round(z)}`, 'Ääretuli (P)', 'light', 'sphere', [0.3 * s, 0.3 * s, 0.3 * s], [8.2 * s, 0.25 * s, z], '#fef08a', {
                material: 'neon',
                anim: { kind: 'blink', speed: 1.0, color2: '#555500' }
            }));
        }

        return parts;
    }
});

registerBlueprint({
    id: 'road',
    name: 'Maantee',
    category: 'infrastructure',
    keywords: ['maantee', 'sõidutee', 'autotee', 'tänav', 'road', 'street', 'highway'],
    icon: '🛣️',
    realSize: [9, 0.15, 60],
    build(opts) {
        const s = opts.scale;
        const length = 60 * s;
        const parts: PygaPart[] = [];
        parts.push(createPart('tarmac', 'Asfalt', 'road', 'box', [9 * s, 0.12 * s, length], [0, 0.06 * s, 0], '#334155', { material: 'stone' }));
        for (let z = -length / 2 + 3 * s; z < length / 2; z += 6 * s) {
            parts.push(createPart(`line_${Math.round(z)}`, 'Telgjoon', 'marking', 'box', [0.3 * s, 0.14 * s, 3 * s], [0, 0.08 * s, z], '#facc15'));
        }
        return parts;
    }
});

// -------------------------------------------------------------
// 7. LIIKUVAD JA INTERAKTIIVSED OBJEKTID (Interactive Devices)
// -------------------------------------------------------------

registerBlueprint({
    id: 'elevator',
    name: 'Lift',
    category: 'interactive',
    keywords: ['lift', 'elevator'],
    icon: '🛗',
    realSize: [3.0, 16.0, 3.0],
    build(opts) {
        const s = opts.scale;
        return [
            createPart('shaft', 'Liftišaht', 'wall', 'box', [3.2 * s, 16 * s, 3.2 * s], [0, 8 * s, 0], '#0f172a', { material: 'glass', opacity: 0.3 }),
            createPart('cabin', 'Liikuv liftikabiin', 'vehicle', 'box', [2.8 * s, 2.6 * s, 2.8 * s], [0, 1.4 * s, 0], '#0284c7', {
                interactive: 'elevator',
                anim: { kind: 'slide', axis: 'y', amplitude: 13 * s, speed: 0.4 }
            })
        ];
    }
});

registerBlueprint({
    id: 'fan',
    name: 'Pöörlev ventilaator',
    category: 'interactive',
    keywords: ['ventilaator', 'fan'],
    icon: '🌀',
    realSize: [2.2, 2.2, 0.6],
    build(opts) {
        const s = opts.scale;
        return [
            createPart('frame', 'Raam', 'stand', 'cylinder', [2.2 * s, 0.2 * s, 2.2 * s], [0, 1.2 * s, 0], '#475569', { rot: [Math.PI / 2, 0, 0] }),
            createPart('blades', 'Pöörlevad labad', 'rotor', 'box', [2.0 * s, 0.4 * s, 0.05 * s], [0, 1.2 * s, 0.05 * s], '#38bdf8', {
                anim: { kind: 'spin', axis: 'z', speed: 18 }
            })
        ];
    }
});

// -------------------------------------------------------------
// 8. TEGELASED JA LOOMAD (Characters & NPCs)
// -------------------------------------------------------------

registerBlueprint({
    id: 'pilot',
    name: 'Piloot',
    category: 'character',
    keywords: ['piloot', 'kapten', 'pilot'],
    icon: '👨‍✈️',
    realSize: [0.8, 1.85, 0.5],
    build(opts) {
        const s = opts.scale;
        return [
            createPart('legs', 'Püksid', 'body', 'box', [0.6 * s, 0.85 * s, 0.4 * s], [0, 0.42 * s, 0], '#0f172a', { material: 'fabric' }),
            createPart('jacket', 'Piloodi pintsak', 'body', 'box', [0.75 * s, 0.7 * s, 0.45 * s], [0, 1.2 * s, 0], '#1e3a8a', { material: 'fabric' }),
            createPart('head', 'Pea', 'head', 'sphere', [0.4 * s, 0.45 * s, 0.4 * s], [0, 1.75 * s, 0], '#fcd34d'),
            createPart('cap', 'Piloodimüts', 'hat', 'cylinder', [0.55 * s, 0.15 * s, 0.55 * s], [0, 1.95 * s, 0], '#1e3a8a')
        ];
    }
});

// -------------------------------------------------------------
// 9. TERVETE MAAILMADE LOOMINE (Complete World Layouts)
// -------------------------------------------------------------

// Lennujaama terviklik maailm (Airport World)
registerWorld({
    id: 'airport_world',
    name: 'Terviklik rahvusvaheline lennujaam',
    keywords: ['lennujaam', 'airport', 'lennujaama maailm'],
    icon: '🛫🌍',
    groundSize: [260, 260],
    groundColor: '#15803d',
    layout(opts) {
        const placements: PygaPlacement[] = [];
        const runwayCount = opts.count || 2;

        // Terminal in center-front
        placements.push({
            blueprintId: 'terminal',
            name: 'Peahoone terminal',
            position: [0, 0, 40],
            rotationY: 0
        });

        // Runways
        if (runwayCount >= 1) {
            placements.push({
                blueprintId: 'runway',
                name: 'Põhirada 09L',
                position: [-45, 0, -40],
                rotationY: 0,
                options: { count: 2 }
            });
        }
        if (runwayCount >= 2) {
            placements.push({
                blueprintId: 'runway',
                name: 'Paralleelrada 09R',
                position: [45, 0, -40],
                rotationY: 0,
                options: { count: 2 }
            });
        }

        // Airplane Hangar with Airliner parked inside/near
        placements.push({
            blueprintId: 'hangar',
            name: 'Lennukiangaar 1',
            position: [-70, 0, 35],
            rotationY: Math.PI / 2
        });

        // Airliners on apron
        placements.push({
            blueprintId: 'airliner',
            name: 'Reisilennuk (Värav 1)',
            position: [-12, 0, 22],
            rotationY: Math.PI,
            options: { colors: { livery: ['#0072ce', '#111111', '#ffffff'] }, features: ['engines_running', 'lights'] }
        });

        placements.push({
            blueprintId: 'cargo_plane',
            name: 'Kaubalennuk kaubaplatsil',
            position: [70, 0, 30],
            rotationY: -Math.PI / 4
        });

        return placements;
    }
});

// Linna terviklik maailm (City World)
registerWorld({
    id: 'city_world',
    name: 'Suurlinn pilvelõhkujatega',
    keywords: ['linn', 'city', 'suurlinn', 'metropol'],
    icon: '🏙️🌍',
    groundSize: [200, 200],
    groundColor: '#334155',
    layout(_opts) {
        const placements: PygaPlacement[] = [];

        // Main avenues
        placements.push({ blueprintId: 'road', name: 'Peatänav', position: [0, 0, 0] });
        placements.push({ blueprintId: 'road', name: 'Risttänav', position: [0, 0, 0], rotationY: Math.PI / 2 });

        // Skyscraper skyline
        placements.push({ blueprintId: 'skyscraper', name: 'Torn 1', position: [-25, 0, -25], options: { floors: 18 } });
        placements.push({ blueprintId: 'skyscraper', name: 'Torn 2', position: [25, 0, -25], options: { floors: 24 } });
        placements.push({ blueprintId: 'hospital', name: 'Keskhaigla', position: [-25, 0, 25] });
        placements.push({ blueprintId: 'school', name: 'Kool', position: [25, 0, 25] });

        // Cars on street
        placements.push({ blueprintId: 'car', name: 'Auto 1', position: [2, 0, 10] });
        placements.push({ blueprintId: 'racecar', name: 'Võidusõiduauto', position: [-2, 0, -15] });

        return placements;
    }
});
