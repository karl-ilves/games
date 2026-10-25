import { PygaPart, PygaBuildOptions, PygaBlueprint, Vec3 } from './types';
import { BLUEPRINTS } from './blueprints';

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

/**
 * Universal Lexicon & Semantic Procedural Synthesizer for Playard AI.
 * Contains blueprints for all world objects, vehicles, structures, nature, tools, creatures,
 * and a dynamic semantic synthesizer for ANY arbitrary word in the world.
 */
export class PygaUniversalSynthesizer {
    private static initialized = false;

    /**
     * Initializes and registers the universal world lexicon blueprints.
     */
    public static init() {
        if (this.initialized) return;
        this.initialized = true;

        this.registerVehicles();
        this.registerStructures();
        this.registerCreatures();
        this.registerItemsAndWeapons();
        this.registerNatureAndCosmos();
    }

    private static registerBlueprint(bp: PygaBlueprint) {
        BLUEPRINTS[bp.id] = bp;
    }

    // =========================================================================
    // 1. VEHICLES & TRANSPORTS
    // =========================================================================
    private static registerVehicles() {
        // Allveelaev (Submarine)
        this.registerBlueprint({
            id: 'submarine',
            name: 'Allveelaev',
            category: 'vehicle',
            keywords: ['allveelaev', 'allvee', 'submarine', 'sub', 'sukelduja'],
            icon: '🌊🚢',
            realSize: [18, 8, 48],
            build(opts: PygaBuildOptions) {
                const parts: PygaPart[] = [];
                const s = opts.scale;
                const col = opts.colors.primary || '#1e293b';

                // Main hull cylinder
                parts.push(createPart('sub_hull', 'Allveelaeva kere', 'fuselage', 'cylinder', [6 * s, 42 * s, 6 * s], [0, 4 * s, 0], col, {
                    rot: [Math.PI / 2, 0, 0],
                    material: 'metal'
                }));
                // Nose dome
                parts.push(createPart('sub_nose', 'Ninaosa voolund', 'fuselage', 'sphere', [6 * s, 6 * s, 8 * s], [0, 4 * s, 22 * s], col, {
                    material: 'metal',
                    attachedTo: 'sub_hull'
                }));
                // Conning tower (Torn / Komandosild)
                parts.push(createPart('sub_tower', 'Komandotorn', 'cabin', 'box', [2.5 * s, 4.5 * s, 8 * s], [0, 8.5 * s, 4 * s], col, {
                    material: 'metal',
                    attachedTo: 'sub_hull'
                }));
                // Periscope & Antennas
                parts.push(createPart('sub_periscope', 'Periskoop', 'sensor', 'cylinder', [0.3 * s, 2.5 * s, 0.3 * s], [0, 11.5 * s, 6 * s], '#94a3b8', {
                    material: 'metal',
                    attachedTo: 'sub_tower'
                }));
                // Hydroplanes (Külgmised sügavustüürid)
                parts.push(createPart('sub_fin_l', 'Vasak tüür', 'wing', 'box', [3.5 * s, 0.3 * s, 2 * s], [-4 * s, 8 * s, 4 * s], '#334155', {
                    material: 'metal',
                    attachedTo: 'sub_tower'
                }));
                parts.push(createPart('sub_fin_r', 'Parem tüür', 'wing', 'box', [3.5 * s, 0.3 * s, 2 * s], [4 * s, 8 * s, 4 * s], '#334155', {
                    material: 'metal',
                    attachedTo: 'sub_tower'
                }));
                // Tail Propeller (Pöörlev sõukruvi)
                parts.push(createPart('sub_prop', 'Sõukruvi (propeller)', 'engine_fan', 'cylinder', [3 * s, 0.4 * s, 3 * s], [0, 4 * s, -22 * s], '#f59e0b', {
                    rot: [Math.PI / 2, 0, 0],
                    material: 'metal',
                    anim: { kind: 'spin', axis: 'z', speed: 12 },
                    attachedTo: 'sub_hull'
                }));
                return parts;
            }
        });

        // Tank (Lahingtank)
        this.registerBlueprint({
            id: 'tank',
            name: 'Lahingutank',
            category: 'vehicle',
            keywords: ['tank', 'tanki', 'lahingutank', 'soomusmasin', 'panzer'],
            icon: '🛡️',
            realSize: [8, 5, 14],
            build(opts: PygaBuildOptions) {
                const parts: PygaPart[] = [];
                const s = opts.scale;
                const col = opts.colors.primary || '#3f6212'; // camo green

                // Treads (Roomikud vasakul ja paremal)
                parts.push(createPart('tank_treads_l', 'Vasak roomik', 'wheel', 'box', [1.4 * s, 1.8 * s, 10 * s], [-2.6 * s, 1 * s, 0], '#18181b', {
                    material: 'rubber'
                }));
                parts.push(createPart('tank_treads_r', 'Parem roomik', 'wheel', 'box', [1.4 * s, 1.8 * s, 10 * s], [2.6 * s, 1 * s, 0], '#18181b', {
                    material: 'rubber'
                }));
                // Chassis (Soomuskorpus)
                parts.push(createPart('tank_hull', 'Soomuskorpus', 'fuselage', 'box', [4.2 * s, 1.6 * s, 9 * s], [0, 1.8 * s, 0], col, {
                    material: 'metal'
                }));
                // Rotating Turret (Pöörlev torn)
                parts.push(createPart('tank_turret', 'Kahuritorn', 'cabin', 'cylinder', [3.4 * s, 1.5 * s, 3.4 * s], [0, 3.2 * s, -0.5 * s], col, {
                    material: 'metal',
                    anim: { kind: 'spin', axis: 'y', speed: 0.3 }
                }));
                // Cannon Barrel (Kahuritoru)
                parts.push(createPart('tank_cannon', 'Peakahur 120mm', 'weapon', 'cylinder', [0.4 * s, 7 * s, 0.4 * s], [0, 3.2 * s, 3.8 * s], '#27272a', {
                    rot: [Math.PI / 2, 0, 0],
                    material: 'metal',
                    attachedTo: 'tank_turret'
                }));
                // Commander Hatch & Antenna
                parts.push(createPart('tank_hatch', 'Komandöri luuk', 'door', 'cylinder', [1 * s, 0.3 * s, 1 * s], [0.8 * s, 4.1 * s, -0.8 * s], '#1c1917', {
                    attachedTo: 'tank_turret'
                }));
                parts.push(createPart('tank_antenna', 'Sideantenn', 'sensor', 'cylinder', [0.08 * s, 2.5 * s, 0.08 * s], [-1 * s, 5 * s, -1.5 * s], '#71717a', {
                    attachedTo: 'tank_turret'
                }));
                return parts;
            }
        });

        // Kosmoselaev / Tähelaev (Spaceship)
        this.registerBlueprint({
            id: 'spaceship',
            name: 'Kosmoselaev',
            category: 'vehicle',
            keywords: ['kosmoselaev', 'tähelaev', 'spaceship', 'starship', 'süvakosmoselaev'],
            icon: '🚀⭐',
            realSize: [16, 6, 24],
            build(opts: PygaBuildOptions) {
                const parts: PygaPart[] = [];
                const s = opts.scale;
                const col = opts.colors.primary || '#f8fafc';

                // Main fuselage
                parts.push(createPart('ship_hull', 'Kosmoselaeva kere', 'fuselage', 'box', [5 * s, 2.8 * s, 18 * s], [0, 2.5 * s, 0], col, {
                    material: 'metal'
                }));
                // Sharp nose cone
                parts.push(createPart('ship_nose', 'Ninakoonus', 'fuselage', 'cone', [5 * s, 6 * s, 2.8 * s], [0, 2.5 * s, 12 * s], col, {
                    rot: [-Math.PI / 2, 0, 0],
                    material: 'metal',
                    attachedTo: 'ship_hull'
                }));
                // Cockpit visor (Kuldne või neoon klaas)
                parts.push(createPart('ship_cockpit', 'Piloodikabiini kuppel', 'cockpit', 'sphere', [2.8 * s, 1.4 * s, 4 * s], [0, 3.8 * s, 5 * s], '#38bdf8', {
                    material: 'glass',
                    opacity: 0.75,
                    attachedTo: 'ship_hull'
                }));
                // Swept back delta wings
                parts.push(createPart('ship_wing_l', 'Vasak tiib', 'wing', 'box', [6 * s, 0.3 * s, 8 * s], [-5 * s, 2.2 * s, -2 * s], '#334155', {
                    rot: [0, -0.3, 0],
                    material: 'metal',
                    attachedTo: 'ship_hull'
                }));
                parts.push(createPart('ship_wing_r', 'Parem tiib', 'wing', 'box', [6 * s, 0.3 * s, 8 * s], [5 * s, 2.2 * s, -2 * s], '#334155', {
                    rot: [0, 0.3, 0],
                    material: 'metal',
                    attachedTo: 'ship_hull'
                }));
                // Dual Ion Thrusters (Ioonmootorid sinise neoonvalgusega)
                parts.push(createPart('ship_ion_l', 'Vasak ioonmootor', 'engine', 'cylinder', [1.6 * s, 3 * s, 1.6 * s], [-1.8 * s, 2.5 * s, -9.5 * s], '#0ea5e9', {
                    rot: [Math.PI / 2, 0, 0],
                    material: 'neon',
                    anim: { kind: 'blink', speed: 8, color2: '#38bdf8' },
                    attachedTo: 'ship_hull'
                }));
                parts.push(createPart('ship_ion_r', 'Parem ioonmootor', 'engine', 'cylinder', [1.6 * s, 3 * s, 1.6 * s], [1.8 * s, 2.5 * s, -9.5 * s], '#0ea5e9', {
                    rot: [Math.PI / 2, 0, 0],
                    material: 'neon',
                    anim: { kind: 'blink', speed: 8, color2: '#38bdf8' },
                    attachedTo: 'ship_hull'
                }));
                return parts;
            }
        });

        // Droon / Kvadrokopter (Drone)
        this.registerBlueprint({
            id: 'drone',
            name: 'Kvadrokopter-Droon',
            category: 'vehicle',
            keywords: ['droon', 'kvadrokopter', 'drone', 'quadcopter'],
            icon: '🛸',
            realSize: [3, 1, 3],
            build(opts: PygaBuildOptions) {
                const parts: PygaPart[] = [];
                const s = opts.scale;
                const col = opts.colors.primary || '#0f172a';

                // Central hub
                parts.push(createPart('drone_hub', 'Drooni keskkorpus', 'fuselage', 'box', [1 * s, 0.5 * s, 1 * s], [0, 1.5 * s, 0], col, {
                    material: 'metal'
                }));
                // Camera gimbal
                parts.push(createPart('drone_camera', '4K Kaameragimbal', 'sensor', 'sphere', [0.4 * s, 0.4 * s, 0.4 * s], [0, 1.1 * s, 0.4 * s], '#0284c7', {
                    material: 'glass',
                    attachedTo: 'drone_hub'
                }));
                // 4 Rotor Arms & Spinning Blades
                const armOffsets = [
                    { id: 'fl', x: -1.2, z: 1.2 },
                    { id: 'fr', x: 1.2, z: 1.2 },
                    { id: 'bl', x: -1.2, z: -1.2 },
                    { id: 'br', x: 1.2, z: -1.2 }
                ];
                armOffsets.forEach(o => {
                    parts.push(createPart(`arm_${o.id}`, `Rootorivars ${o.id}`, 'frame', 'cylinder', [0.15 * s, 1.6 * s, 0.15 * s], [o.x * s * 0.5, 1.5 * s, o.z * s * 0.5], '#334155', {
                        rot: [Math.PI / 4, 0, o.x * o.z > 0 ? Math.PI / 4 : -Math.PI / 4],
                        attachedTo: 'drone_hub'
                    }));
                    parts.push(createPart(`blade_${o.id}`, `Propeller ${o.id}`, 'engine_fan', 'cylinder', [1.2 * s, 0.08 * s, 1.2 * s], [o.x * s, 1.7 * s, o.z * s], '#38bdf8', {
                        anim: { kind: 'spin', axis: 'y', speed: 25 },
                        attachedTo: 'drone_hub'
                    }));
                });
                return parts;
            }
        });

        // Mootorratas (Motorcycle)
        this.registerBlueprint({
            id: 'motorcycle',
            name: 'Mootorratas',
            category: 'vehicle',
            keywords: ['mootorratas', 'tsikkel', 'mopeed', 'motorcycle', 'bike'],
            icon: '🏍️',
            realSize: [1.2, 1.6, 3.2],
            build(opts: PygaBuildOptions) {
                const parts: PygaPart[] = [];
                const s = opts.scale;
                const col = opts.colors.primary || '#dc2626';

                // Front & Rear Wheels
                parts.push(createPart('moto_wheel_front', 'Esiratas', 'wheel', 'cylinder', [1.2 * s, 0.3 * s, 1.2 * s], [0, 0.6 * s, 1.2 * s], '#18181b', {
                    rot: [0, 0, Math.PI / 2],
                    material: 'rubber',
                    anim: { kind: 'spin', axis: 'x', speed: 10 }
                }));
                parts.push(createPart('moto_wheel_rear', 'Tagaratas', 'wheel', 'cylinder', [1.2 * s, 0.4 * s, 1.2 * s], [0, 0.6 * s, -1.2 * s], '#18181b', {
                    rot: [0, 0, Math.PI / 2],
                    material: 'rubber',
                    anim: { kind: 'spin', axis: 'x', speed: 10 }
                }));
                // Frame & Gas Tank
                parts.push(createPart('moto_tank', 'Kütusepaak ja kere', 'fuselage', 'box', [0.8 * s, 0.8 * s, 1.8 * s], [0, 1.3 * s, 0], col, {
                    material: 'metal'
                }));
                // Seat
                parts.push(createPart('moto_seat', 'Nahkiste', 'seat', 'box', [0.6 * s, 0.25 * s, 0.9 * s], [0, 1.45 * s, -0.4 * s], '#27272a', {
                    attachedTo: 'moto_tank'
                }));
                // Handlebars
                parts.push(createPart('moto_handle', 'Juhtraud', 'frame', 'cylinder', [0.1 * s, 1.1 * s, 0.1 * s], [0, 1.7 * s, 0.8 * s], '#94a3b8', {
                    rot: [0, 0, Math.PI / 2],
                    attachedTo: 'moto_tank'
                }));
                // Headlight
                parts.push(createPart('moto_light', 'Esituli', 'light', 'cylinder', [0.4 * s, 0.2 * s, 0.4 * s], [0, 1.4 * s, 1.2 * s], '#fef08a', {
                    rot: [Math.PI / 2, 0, 0],
                    material: 'neon',
                    attachedTo: 'moto_tank'
                }));
                return parts;
            }
        });
    }

    // =========================================================================
    // 2. ARCHITECTURE & STRUCTURES
    // =========================================================================
    private static registerStructures() {
        // Loss / Kindlus (Castle)
        this.registerBlueprint({
            id: 'castle',
            name: 'Keskaegne Loss',
            category: 'building',
            keywords: ['loss', 'kindlus', 'kants', 'castle', 'fortress', 'lossitorn'],
            icon: '🏰',
            realSize: [36, 24, 36],
            build(opts: PygaBuildOptions) {
                const parts: PygaPart[] = [];
                const s = opts.scale;
                const stoneCol = opts.colors.primary || '#64748b';

                // Central Keep (Peatorn / Palee)
                parts.push(createPart('castle_keep', 'Peatorn (Keep)', 'wall', 'box', [14 * s, 18 * s, 14 * s], [0, 9 * s, 0], stoneCol, {
                    material: 'stone'
                }));
                // Keep Roof / Battlements
                parts.push(createPart('castle_keep_roof', 'Peatorni rinnatis', 'roof', 'box', [15 * s, 1.5 * s, 15 * s], [0, 18.5 * s, 0], '#475569', {
                    material: 'stone',
                    attachedTo: 'castle_keep'
                }));
                // 4 Corner Towers
                const towerCorners = [
                    { id: 'fl', x: -14, z: 14 },
                    { id: 'fr', x: 14, z: 14 },
                    { id: 'bl', x: -14, z: -14 },
                    { id: 'br', x: 14, z: -14 }
                ];
                towerCorners.forEach(c => {
                    parts.push(createPart(`tower_${c.id}`, `Nurgatorn ${c.id}`, 'wall', 'cylinder', [5 * s, 20 * s, 5 * s], [c.x * s, 10 * s, c.z * s], stoneCol, {
                        material: 'stone'
                    }));
                    // Conical roof with flag
                    parts.push(createPart(`tower_roof_${c.id}`, `Tornikiiver ${c.id}`, 'roof', 'cone', [5.5 * s, 5 * s, 5.5 * s], [c.x * s, 22.5 * s, c.z * s], '#991b1b', {
                        material: 'wood'
                    }));
                });
                // Curtain Walls (Kaitsemüürid)
                parts.push(createPart('wall_front', 'Esisein väravaga', 'wall', 'box', [22 * s, 10 * s, 2.5 * s], [0, 5 * s, 14 * s], stoneCol, { material: 'stone' }));
                parts.push(createPart('wall_back', 'Tagasein', 'wall', 'box', [22 * s, 10 * s, 2.5 * s], [0, 5 * s, -14 * s], stoneCol, { material: 'stone' }));
                parts.push(createPart('wall_left', 'Vasak müür', 'wall', 'box', [2.5 * s, 10 * s, 22 * s], [-14 * s, 5 * s, 0], stoneCol, { material: 'stone' }));
                parts.push(createPart('wall_right', 'Parem müür', 'wall', 'box', [2.5 * s, 10 * s, 22 * s], [14 * s, 5 * s, 0], stoneCol, { material: 'stone' }));
                // Arched Gate & Wooden Drawbridge (Langetatav sild)
                parts.push(createPart('gate_door', 'Värava uks / tõstesild', 'door', 'box', [4 * s, 6 * s, 0.4 * s], [0, 3 * s, 15.3 * s], '#78350f', {
                    material: 'wood',
                    interactive: 'door',
                    anim: { kind: 'swing', axis: 'x', amplitude: 1.5, trigger: 'click' }
                }));
                return parts;
            }
        });

        // Tuletorn (Lighthouse)
        this.registerBlueprint({
            id: 'lighthouse',
            name: 'Tuletorn',
            category: 'building',
            keywords: ['tuletorn', 'majakas', 'lighthouse'],
            icon: '🗼💡',
            realSize: [10, 32, 10],
            build(opts: PygaBuildOptions) {
                const parts: PygaPart[] = [];
                const s = opts.scale;

                // Tapered tower cylinder (striped white and red)
                parts.push(createPart('lh_base', 'Tuletorni vundament', 'wall', 'cylinder', [8 * s, 4 * s, 8 * s], [0, 2 * s, 0], '#334155', { material: 'stone' }));
                parts.push(createPart('lh_stripe1', 'Alumine valge tsoon', 'wall', 'cylinder', [7 * s, 8 * s, 7.8 * s], [0, 8 * s, 0], '#f8fafc', { material: 'stone' }));
                parts.push(createPart('lh_stripe2', 'Keskmine punane tsoon', 'wall', 'cylinder', [6.2 * s, 8 * s, 7 * s], [0, 16 * s, 0], '#dc2626', { material: 'stone' }));
                parts.push(createPart('lh_stripe3', 'Ülemine valge tsoon', 'wall', 'cylinder', [5.4 * s, 8 * s, 6.2 * s], [0, 24 * s, 0], '#f8fafc', { material: 'stone' }));
                // Gallery balcony
                parts.push(createPart('lh_balcony', 'Vaateplatvorm', 'wall', 'cylinder', [7 * s, 1 * s, 7 * s], [0, 28.5 * s, 0], '#1e293b', { material: 'metal' }));
                // Glass Lantern Room
                parts.push(createPart('lh_glass', 'Valgustiruum (Klaas)', 'window', 'cylinder', [4.8 * s, 4 * s, 4.8 * s], [0, 31 * s, 0], '#38bdf8', {
                    material: 'glass',
                    opacity: 0.6
                }));
                // Rotating Light Beam (Pöörlev helendav majakatuli)
                parts.push(createPart('lh_beam', 'Pöörlev valguskiir', 'light', 'cylinder', [0.8 * s, 16 * s, 0.8 * s], [0, 31 * s, 8 * s], '#fef08a', {
                    rot: [Math.PI / 2, 0, 0],
                    material: 'neon',
                    anim: { kind: 'spin', axis: 'y', speed: 2 }
                }));
                // Dome Roof
                parts.push(createPart('lh_dome', 'Kuppelkatus', 'roof', 'sphere', [5 * s, 2.5 * s, 5 * s], [0, 34 * s, 0], '#1e293b', { material: 'metal' }));
                return parts;
            }
        });

        // Tuuleveski (Windmill)
        this.registerBlueprint({
            id: 'windmill',
            name: 'Tuuleveski',
            category: 'building',
            keywords: ['tuuleveski', 'veski', 'windmill'],
            icon: '🌾⚙️',
            realSize: [12, 22, 12],
            build(opts: PygaBuildOptions) {
                const parts: PygaPart[] = [];
                const s = opts.scale;

                // Conical body
                parts.push(createPart('wm_body', 'Veski kivist kere', 'wall', 'cylinder', [6 * s, 16 * s, 8 * s], [0, 8 * s, 0], '#e2e8f0', { material: 'stone' }));
                // Wooden roof dome
                parts.push(createPart('wm_cap', 'Veski katus', 'roof', 'cone', [6.5 * s, 4 * s, 6.5 * s], [0, 18 * s, 0], '#78350f', { material: 'wood' }));
                // Central rotating rotor shaft
                parts.push(createPart('wm_shaft', 'Tiivikute võll', 'engine', 'cylinder', [0.8 * s, 2 * s, 0.8 * s], [0, 16.5 * s, 3.8 * s], '#451a03', {
                    rot: [Math.PI / 2, 0, 0],
                    material: 'wood'
                }));
                // 4 Cross Sails (Pöörlevad veskitiivad)
                parts.push(createPart('wm_sails_h', 'Horisontaalsed tiivad', 'engine_fan', 'box', [18 * s, 1.2 * s, 0.2 * s], [0, 16.5 * s, 4.6 * s], '#fef3c7', {
                    material: 'wood',
                    anim: { kind: 'spin', axis: 'z', speed: 1.5 },
                    attachedTo: 'wm_shaft'
                }));
                parts.push(createPart('wm_sails_v', 'Vertikaalsed tiivad', 'engine_fan', 'box', [1.2 * s, 18 * s, 0.2 * s], [0, 16.5 * s, 4.6 * s], '#fef3c7', {
                    material: 'wood',
                    anim: { kind: 'spin', axis: 'z', speed: 1.5 },
                    attachedTo: 'wm_shaft'
                }));
                return parts;
            }
        });
    }

    // =========================================================================
    // 3. CREATURES, CHARACTERS & ANIMALS
    // =========================================================================
    private static registerCreatures() {
        // Draakon (Dragon)
        this.registerBlueprint({
            id: 'dragon',
            name: 'Tule-Draakon',
            category: 'character',
            keywords: ['draakon', 'lohe', 'dragon', 'tule-draakon'],
            icon: '🐉🔥',
            realSize: [18, 10, 22],
            build(opts: PygaBuildOptions) {
                const parts: PygaPart[] = [];
                const s = opts.scale;
                const col = opts.colors.primary || '#991b1b'; // dark red

                // Torso
                parts.push(createPart('dragon_body', 'Draakoni soomuskere', 'fuselage', 'cylinder', [3.5 * s, 9 * s, 3.8 * s], [0, 4.5 * s, 0], col, {
                    rot: [0.3, 0, 0],
                    material: 'metal'
                }));
                // Neck & Head with horns
                parts.push(createPart('dragon_neck', 'Kael', 'neck', 'cylinder', [2 * s, 5 * s, 2 * s], [0, 8.5 * s, 3.5 * s], col, {
                    rot: [-0.4, 0, 0],
                    attachedTo: 'dragon_body'
                }));
                parts.push(createPart('dragon_head', 'Draakoni pea', 'head', 'box', [2.5 * s, 2 * s, 4 * s], [0, 10.5 * s, 5.5 * s], col, {
                    attachedTo: 'dragon_neck'
                }));
                // Glowing eyes
                parts.push(createPart('dragon_eye_l', 'Vasak silm', 'eye', 'sphere', [0.4 * s, 0.4 * s, 0.4 * s], [-1.2 * s, 11 * s, 6.5 * s], '#eab308', {
                    material: 'neon',
                    attachedTo: 'dragon_head'
                }));
                parts.push(createPart('dragon_eye_r', 'Parem silm', 'eye', 'sphere', [0.4 * s, 0.4 * s, 0.4 * s], [1.2 * s, 11 * s, 6.5 * s], '#eab308', {
                    material: 'neon',
                    attachedTo: 'dragon_head'
                }));
                // Wings (Hiiglaslikud tiivad)
                parts.push(createPart('dragon_wing_l', 'Vasak tiib', 'wing', 'box', [9 * s, 0.3 * s, 5 * s], [-6 * s, 7 * s, 0], '#7f1d1d', {
                    rot: [0.2, -0.4, 0.3],
                    anim: { kind: 'swing', axis: 'z', amplitude: 0.5, speed: 2 },
                    attachedTo: 'dragon_body'
                }));
                parts.push(createPart('dragon_wing_r', 'Parem tiib', 'wing', 'box', [9 * s, 0.3 * s, 5 * s], [6 * s, 7 * s, 0], '#7f1d1d', {
                    rot: [0.2, 0.4, -0.3],
                    anim: { kind: 'swing', axis: 'z', amplitude: -0.5, speed: 2 },
                    attachedTo: 'dragon_body'
                }));
                // Long Tail (Saba)
                parts.push(createPart('dragon_tail', 'Saba', 'tail', 'cylinder', [1.5 * s, 10 * s, 0.8 * s], [0, 2.5 * s, -8 * s], col, {
                    rot: [1.2, 0, 0],
                    anim: { kind: 'swing', axis: 'y', amplitude: 0.4, speed: 1.5 },
                    attachedTo: 'dragon_body'
                }));
                return parts;
            }
        });

        // Dinosaurus / T-Rex
        this.registerBlueprint({
            id: 'dinosaur',
            name: 'Tyrannosaurus Rex (T-Rex)',
            category: 'character',
            keywords: ['dinosaurus', 'dino', 't-rex', 'türannosaurus'],
            icon: '🦖',
            realSize: [6, 11, 18],
            build(opts: PygaBuildOptions) {
                const parts: PygaPart[] = [];
                const s = opts.scale;
                const col = opts.colors.primary || '#15803d'; // dino green

                // Powerful Body
                parts.push(createPart('dino_body', 'Kere', 'fuselage', 'cylinder', [3.8 * s, 8 * s, 3.8 * s], [0, 6 * s, 0], col, {
                    rot: [0.5, 0, 0]
                }));
                // Massive head with jaws
                parts.push(createPart('dino_head', 'T-Rexi massiivne pea', 'head', 'box', [3 * s, 3.2 * s, 5 * s], [0, 9.5 * s, 4.5 * s], col, {
                    attachedTo: 'dino_body'
                }));
                // Teeth
                parts.push(createPart('dino_teeth', 'Hambad', 'teeth', 'box', [2.8 * s, 0.4 * s, 4.5 * s], [0, 8.2 * s, 4.8 * s], '#ffffff', {
                    attachedTo: 'dino_head'
                }));
                // Hind legs (Võimsad tagajalad)
                parts.push(createPart('dino_leg_l', 'Vasak tagajalg', 'wheel', 'cylinder', [1.4 * s, 6 * s, 1.4 * s], [-2 * s, 3 * s, -1 * s], '#166534'));
                parts.push(createPart('dino_leg_r', 'Parem tagajalg', 'wheel', 'cylinder', [1.4 * s, 6 * s, 1.4 * s], [2 * s, 3 * s, -1 * s], '#166534'));
                // Balancing Tail
                parts.push(createPart('dino_tail', 'Tasakaalustav saba', 'tail', 'cylinder', [1.8 * s, 9 * s, 0.6 * s], [0, 4.5 * s, -7 * s], col, {
                    rot: [1.1, 0, 0]
                }));
                return parts;
            }
        });

        // Robot / Küborg
        this.registerBlueprint({
            id: 'robot',
            name: 'Hiidrobot / Mehh',
            category: 'character',
            keywords: ['robot', 'küborg', 'mehh', 'lahingurobot', 'android'],
            icon: '🤖⚡',
            realSize: [6, 12, 5],
            build(opts: PygaBuildOptions) {
                const parts: PygaPart[] = [];
                const s = opts.scale;
                const col = opts.colors.primary || '#334155';

                // Armored Torso
                parts.push(createPart('bot_chest', 'Roboti rinnakorv', 'fuselage', 'box', [4 * s, 4.5 * s, 2.5 * s], [0, 7.5 * s, 0], col, {
                    material: 'metal'
                }));
                // Glowing Visor / Head
                parts.push(createPart('bot_head', 'Roboti pea ja lasersilm', 'head', 'box', [2 * s, 2 * s, 2 * s], [0, 10.8 * s, 0], '#0f172a', {
                    material: 'metal',
                    attachedTo: 'bot_chest'
                }));
                parts.push(createPart('bot_visor', 'Optiline sensorvisioon', 'sensor', 'box', [1.8 * s, 0.4 * s, 0.3 * s], [0, 11 * s, 1 * s], '#ef4444', {
                    material: 'neon',
                    anim: { kind: 'blink', speed: 4 },
                    attachedTo: 'bot_head'
                }));
                // Bionic Arms with Blaster
                parts.push(createPart('bot_arm_l', 'Vasak käsi', 'weapon', 'cylinder', [0.8 * s, 4.5 * s, 0.8 * s], [-2.8 * s, 7 * s, 0], '#475569', {
                    attachedTo: 'bot_chest'
                }));
                parts.push(createPart('bot_arm_r', 'Parem plasmakahur', 'weapon', 'cylinder', [0.9 * s, 5 * s, 0.9 * s], [2.8 * s, 7 * s, 0.5 * s], '#1e293b', {
                    rot: [Math.PI / 4, 0, 0],
                    material: 'metal',
                    attachedTo: 'bot_chest'
                }));
                // Legs
                parts.push(createPart('bot_leg_l', 'Vasak jalg', 'wheel', 'box', [1.4 * s, 5.5 * s, 1.8 * s], [-1.4 * s, 2.75 * s, 0], '#1e293b', { material: 'metal' }));
                parts.push(createPart('bot_leg_r', 'Parem jalg', 'wheel', 'box', [1.4 * s, 5.5 * s, 1.8 * s], [1.4 * s, 2.75 * s, 0], '#1e293b', { material: 'metal' }));
                return parts;
            }
        });
    }

    // =========================================================================
    // 4. ITEMS, WEAPONS & TREASURES
    // =========================================================================
    private static registerItemsAndWeapons() {
        // Mõõk (Sword)
        this.registerBlueprint({
            id: 'sword',
            name: 'Legendaarne Mõõk',
            category: 'interactive',
            keywords: ['mõõk', 'mõõga', 'sword', 'blade'],
            icon: '⚔️',
            realSize: [1.2, 4.5, 0.3],
            build(opts: PygaBuildOptions) {
                const parts: PygaPart[] = [];
                const s = opts.scale;

                // Steel blade
                parts.push(createPart('sword_blade', 'Terasest tera', 'weapon', 'box', [0.4 * s, 3.2 * s, 0.08 * s], [0, 2.4 * s, 0], '#e2e8f0', { material: 'metal' }));
                // Crossguard
                parts.push(createPart('sword_guard', 'Mõõga käekaitse', 'weapon', 'box', [1.4 * s, 0.25 * s, 0.3 * s], [0, 0.8 * s, 0], '#d97706', { material: 'metal' }));
                // Hilt
                parts.push(createPart('sword_hilt', 'Nahast käepide', 'weapon', 'cylinder', [0.2 * s, 0.8 * s, 0.2 * s], [0, 0.3 * s, 0], '#78350f', { material: 'wood' }));
                // Pommel gem
                parts.push(createPart('sword_gem', 'Nupukristall', 'weapon', 'sphere', [0.35 * s, 0.35 * s, 0.35 * s], [0, -0.2 * s, 0], '#3b82f6', { material: 'neon' }));
                return parts;
            }
        });

        // Aardekirst (Treasure Chest)
        this.registerBlueprint({
            id: 'chest',
            name: 'Aardekirst',
            category: 'interactive',
            keywords: ['kirst', 'aardekirst', 'chest', 'treasure'],
            icon: '🪙📦',
            realSize: [2.5, 1.8, 1.8],
            build(opts: PygaBuildOptions) {
                const parts: PygaPart[] = [];
                const s = opts.scale;

                // Wooden base
                parts.push(createPart('chest_box', 'Kirstu põhikorpus', 'fuselage', 'box', [2.2 * s, 1.2 * s, 1.6 * s], [0, 0.6 * s, 0], '#78350f', { material: 'wood' }));
                // Hinged arched lid
                parts.push(createPart('chest_lid', 'Avanev kirstukaan', 'door', 'cylinder', [1.6 * s, 2.2 * s, 1.6 * s], [0, 1.2 * s, 0], '#92400e', {
                    rot: [0, 0, Math.PI / 2],
                    material: 'wood',
                    interactive: 'door',
                    anim: { kind: 'swing', axis: 'x', amplitude: 1.6, trigger: 'click' },
                    attachedTo: 'chest_box'
                }));
                // Golden bands & lock
                parts.push(createPart('chest_lock', 'Kuldne tabalukk', 'lock', 'box', [0.3 * s, 0.4 * s, 0.2 * s], [0, 1.1 * s, 0.85 * s], '#f59e0b', { material: 'metal' }));
                return parts;
            }
        });
    }

    // =========================================================================
    // 5. NATURE, COSMOS & BIOMES
    // =========================================================================
    private static registerNatureAndCosmos() {
        // Vulkaan (Volcano)
        this.registerBlueprint({
            id: 'volcano',
            name: 'Tulemägi-Vulkaan',
            category: 'nature',
            keywords: ['vulkaan', 'tulemägi', 'volcano'],
            icon: '🌋🔥',
            realSize: [40, 25, 40],
            build(opts: PygaBuildOptions) {
                const parts: PygaPart[] = [];
                const s = opts.scale;

                // Conical mountain with crater
                parts.push(createPart('volc_mountain', 'Vulkaani koonusmägi', 'ground', 'cone', [38 * s, 22 * s, 38 * s], [0, 11 * s, 0], '#3f3f46', { material: 'stone' }));
                // Molten Lava Core (Hõõguv laavajärv kraatris)
                parts.push(createPart('volc_lava', 'Kraatri hõõguv laava', 'liquid', 'cylinder', [10 * s, 1 * s, 10 * s], [0, 21.8 * s, 0], '#ef4444', {
                    material: 'neon',
                    anim: { kind: 'blink', speed: 3, color2: '#f97316' }
                }));
                return parts;
            }
        });

        // Planeet (Planet with rings - Saturn)
        this.registerBlueprint({
            id: 'planet',
            name: 'Rõngastega Planeet',
            category: 'nature',
            keywords: ['planeet', 'saturn', 'marss', 'planet'],
            icon: '🪐',
            realSize: [30, 16, 30],
            build(opts: PygaBuildOptions) {
                const parts: PygaPart[] = [];
                const s = opts.scale;
                const col = opts.colors.primary || '#fde047';

                // Planet sphere
                parts.push(createPart('planet_sphere', 'Planeedi kera', 'fuselage', 'sphere', [14 * s, 14 * s, 14 * s], [0, 10 * s, 0], col, {
                    anim: { kind: 'spin', axis: 'y', speed: 0.5 }
                }));
                // Planetary rings
                parts.push(createPart('planet_rings', 'Planeedi rõngad', 'wing', 'cylinder', [28 * s, 0.2 * s, 28 * s], [0, 10 * s, 0], '#fef08a', {
                    rot: [0.35, 0, 0.2],
                    opacity: 0.85,
                    material: 'glass'
                }));
                return parts;
            }
        });
    }

    // =========================================================================
    // 6. DYNAMIC SEMANTIC SYNTHESIZER (Handles ANY arbitrary word in the world)
    // =========================================================================
    /**
     * Dynamically synthesizes an authentic procedural 3D model for ANY word or concept
     * in the universe by decomposing its semantics, category, and visual properties.
     */
    public static synthesizeArbitraryConcept(word: string, opts: PygaBuildOptions): PygaPart[] {
        const lower = word.toLowerCase().trim();
        const s = opts.scale || 1.0;
        const parts: PygaPart[] = [];

        // Color extraction from word prefixes
        let primaryColor = opts.colors.primary;
        if (!primaryColor) {
            if (/kuld|kuldne|kollane/i.test(lower)) primaryColor = '#eab308';
            else if (/hõbe|hõbedane|metall/i.test(lower)) primaryColor = '#94a3b8';
            else if (/roheline|kurgi|lehe/i.test(lower)) primaryColor = '#16a34a';
            else if (/sinine|mere|vee/i.test(lower)) primaryColor = '#2563eb';
            else if (/punane|tule|laava/i.test(lower)) primaryColor = '#dc2626';
            else if (/must|öö|varju/i.test(lower)) primaryColor = '#0f172a';
            else if (/valge|lume|jää/i.test(lower)) primaryColor = '#f8fafc';
            else primaryColor = '#475569';
        }

        // Determine visual archetype based on semantics
        const isVehicle = /mopeed|auto|laev|sõiduk|kopter|rakett|taldrik|vanker|kelk|masin|tank|traktor/i.test(lower);
        const isCreature = /loom|koer|kass|madu|draakon|lind|kala|ämblik|elukas|koll|tulnukas|memm|dino|hunt|karu|koletis|hobune|tiiger/i.test(lower);
        const isBuilding = /maja|tehas|koda|torn|palee|onn|angaar|varjend|pood|loss|kindlus|sild|bunker|kirik/i.test(lower);
        const isFood = /pitsa|kook|tort|leib|sai|burger|õun|toit|jäätis|banaan|kartul|salat|jook/i.test(lower);
        const isWeapon = /mõõk|vibu|püss|laser|kahur|vasar|sau|kirves|relv|tera|oda|granaat/i.test(lower);
        const isFurniture = /tool|laud|voodi|kapp|riiul|diivan|lamp|troon|pink|kamin/i.test(lower);
        const isPlantOrNature = /puu|lill|kaktus|põõsas|seen|taim|kalju|kivi|kristall|mägi/i.test(lower);
        const isCosmicOrTech = /portaal|satelliit|radar|reaktor|antenn|arvuti|ekraan|droon|mootor/i.test(lower);
        const isMagicOrTreasure = /laegas|kirst|altar|talisman|aare|võlukepp|amulett/i.test(lower);

        if (isVehicle) {
            // Main body
            parts.push(createPart('dyn_body', `${word} - Kere`, 'fuselage', 'box', [2.5 * s, 1.4 * s, 5 * s], [0, 1.6 * s, 0], primaryColor, { material: 'metal' }));
            // Cabin / Seat
            parts.push(createPart('dyn_cabin', `${word} - Kabiin / Iste`, 'cabin', 'box', [1.8 * s, 1.2 * s, 2 * s], [0, 2.6 * s, -0.4 * s], '#334155', { material: 'glass', attachedTo: 'dyn_body' }));
            // 4 Wheels with spinning animations
            const wheelCoords = [
                { id: 'fl', x: -1.4, z: 1.6 },
                { id: 'fr', x: 1.4, z: 1.6 },
                { id: 'bl', x: -1.4, z: -1.6 },
                { id: 'br', x: 1.4, z: -1.6 }
            ];
            wheelCoords.forEach(wc => {
                parts.push(createPart(`dyn_wh_${wc.id}`, `Ratas ${wc.id}`, 'wheel', 'cylinder', [1 * s, 0.4 * s, 1 * s], [wc.x * s, 0.6 * s, wc.z * s], '#18181b', {
                    rot: [0, 0, Math.PI / 2],
                    material: 'rubber',
                    anim: { kind: 'spin', axis: 'x', speed: 12 }
                }));
            });
            // Headlights
            parts.push(createPart('dyn_light', 'Esituled', 'light', 'cylinder', [0.4 * s, 0.2 * s, 0.4 * s], [0, 1.8 * s, 2.5 * s], '#fef08a', {
                rot: [Math.PI / 2, 0, 0],
                material: 'neon',
                anim: { kind: 'blink', speed: 2 }
            }));
        } else if (isCreature) {
            // Torso
            parts.push(createPart('dyn_torso', `${word} - Kere`, 'fuselage', 'cylinder', [2.2 * s, 3.5 * s, 2.2 * s], [0, 3 * s, 0], primaryColor));
            // Head
            parts.push(createPart('dyn_head', `${word} - Pea`, 'head', 'sphere', [2 * s, 2 * s, 2 * s], [0, 5.4 * s, 0.5 * s], primaryColor, { attachedTo: 'dyn_torso' }));
            // Glowing Eyes
            parts.push(createPart('dyn_eye_l', 'Vasak silm', 'eye', 'sphere', [0.3 * s, 0.3 * s, 0.3 * s], [-0.6 * s, 5.8 * s, 1.4 * s], '#38bdf8', { material: 'neon' }));
            parts.push(createPart('dyn_eye_r', 'Parem silm', 'eye', 'sphere', [0.3 * s, 0.3 * s, 0.3 * s], [0.6 * s, 5.8 * s, 1.4 * s], '#38bdf8', { material: 'neon' }));
            // Limbs
            parts.push(createPart('dyn_limb_l', 'Vasak jalg', 'wheel', 'cylinder', [0.6 * s, 2.4 * s, 0.6 * s], [-1 * s, 1.2 * s, 0], '#334155'));
            parts.push(createPart('dyn_limb_r', 'Parem jalg', 'wheel', 'cylinder', [0.6 * s, 2.4 * s, 0.6 * s], [1 * s, 1.2 * s, 0], '#334155'));
        } else if (isBuilding) {
            // Foundation and walls
            parts.push(createPart('dyn_wall', `${word} - Seinad`, 'wall', 'box', [8 * s, 7 * s, 8 * s], [0, 3.5 * s, 0], primaryColor, { material: 'stone' }));
            // Pitched roof
            parts.push(createPart('dyn_roof', `${word} - Katus`, 'roof', 'cone', [10 * s, 4 * s, 10 * s], [0, 9 * s, 0], '#991b1b', { material: 'wood' }));
            // Door
            parts.push(createPart('dyn_door', 'Uks', 'door', 'box', [1.8 * s, 3 * s, 0.2 * s], [0, 1.5 * s, 4.1 * s], '#78350f', {
                material: 'wood',
                interactive: 'door',
                anim: { kind: 'swing', axis: 'y', amplitude: 1.4, trigger: 'click' }
            }));
        } else if (isWeapon) {
            // Weapon Handle / Grip
            parts.push(createPart('dyn_w_grip', `${word} - Käepide`, 'frame', 'cylinder', [0.3 * s, 1.6 * s, 0.3 * s], [0, 0.8 * s, 0], '#78350f', { material: 'wood' }));
            // Crossguard / Core
            parts.push(createPart('dyn_w_guard', 'Kaitse / Ristraud', 'frame', 'box', [1.8 * s, 0.25 * s, 0.5 * s], [0, 1.6 * s, 0], '#94a3b8', { material: 'metal' }));
            // Blade / Barrel / Beam
            parts.push(createPart('dyn_w_blade', `${word} - Tera / Kahuritoru`, 'weapon', 'box', [0.5 * s, 4.2 * s, 0.15 * s], [0, 3.8 * s, 0], primaryColor, {
                material: 'metal',
                anim: { kind: 'spin', axis: 'y', speed: 1.5 }
            }));
            // Energy tip
            parts.push(createPart('dyn_w_tip', 'Energiaots', 'light', 'cone', [0.5 * s, 1.0 * s, 0.5 * s], [0, 6.2 * s, 0], '#38bdf8', { material: 'neon' }));
        } else if (isFurniture) {
            // Seat or Tabletop
            parts.push(createPart('dyn_f_top', `${word} - Pind / Iste`, 'frame', 'box', [3.0 * s, 0.3 * s, 3.0 * s], [0, 1.8 * s, 0], primaryColor, { material: 'wood' }));
            // 4 Legs
            const fLegs = [
                { id: '1', x: -1.2, z: 1.2 },
                { id: '2', x: 1.2, z: 1.2 },
                { id: '3', x: -1.2, z: -1.2 },
                { id: '4', x: 1.2, z: -1.2 }
            ];
            fLegs.forEach(fl => {
                parts.push(createPart(`dyn_f_leg_${fl.id}`, `Jalg ${fl.id}`, 'wheel', 'cylinder', [0.25 * s, 1.8 * s, 0.25 * s], [fl.x * s, 0.9 * s, fl.z * s], '#451a03', { material: 'wood' }));
            });
            // Backrest
            parts.push(createPart('dyn_f_back', 'Seljatugi', 'wall', 'box', [3.0 * s, 2.4 * s, 0.3 * s], [0, 3.1 * s, -1.35 * s], primaryColor, { material: 'wood' }));
        } else if (isPlantOrNature) {
            // Trunk / Stem / Rock Base
            parts.push(createPart('dyn_p_stem', `${word} - Tüvi / Baas`, 'fuselage', 'cylinder', [1.2 * s, 4.0 * s, 1.2 * s], [0, 2.0 * s, 0], '#78350f', { material: 'wood' }));
            // Foliage / Crystal Cluster
            parts.push(createPart('dyn_p_crown', `${word} - Võra / Kristallid`, 'roof', 'cone', [4.5 * s, 5.0 * s, 4.5 * s], [0, 5.8 * s, 0], primaryColor, { material: 'standard' }));
            // Flower / Light Bud
            parts.push(createPart('dyn_p_bud', 'Õis / Valgushelendus', 'light', 'sphere', [1.2 * s, 1.2 * s, 1.2 * s], [0, 8.4 * s, 0], '#f43f5e', {
                material: 'neon',
                anim: { kind: 'bob', speed: 2.0, amplitude: 0.3 }
            }));
        } else if (isCosmicOrTech) {
            // Tech Generator Pedestal
            parts.push(createPart('dyn_c_base', `${word} - Tehniline Alus`, 'frame', 'cylinder', [3.2 * s, 1.0 * s, 3.2 * s], [0, 0.5 * s, 0], '#0f172a', { material: 'metal' }));
            // Holographic / Energy Core Ring
            parts.push(createPart('dyn_c_core', `${word} - Kvanttuum`, 'light', 'cylinder', [2.4 * s, 3.0 * s, 2.4 * s], [0, 2.8 * s, 0], primaryColor, {
                material: 'neon',
                anim: { kind: 'spin', axis: 'y', speed: 4.0 }
            }));
            // Sensor Emitter
            parts.push(createPart('dyn_c_sensor', 'Sensoriantenn', 'light', 'cone', [1.4 * s, 2.2 * s, 1.4 * s], [0, 5.0 * s, 0], '#38bdf8', { material: 'metal' }));
        } else if (isMagicOrTreasure) {
            // Chest / Altar Body
            parts.push(createPart('dyn_m_body', `${word} - Kere`, 'frame', 'box', [3.2 * s, 2.0 * s, 2.2 * s], [0, 1.0 * s, 0], primaryColor, { material: 'wood' }));
            // Golden Locks & Borders
            parts.push(createPart('dyn_m_lock', 'Kuldne Lukk & Raam', 'decoration', 'box', [0.8 * s, 0.8 * s, 0.3 * s], [0, 1.4 * s, 1.15 * s], '#eab308', { material: 'metal' }));
            // Floating Magic Orb
            parts.push(createPart('dyn_m_orb', 'Hõljuv Võlukristall', 'light', 'sphere', [1.2 * s, 1.2 * s, 1.2 * s], [0, 3.2 * s, 0], '#a855f7', {
                material: 'neon',
                anim: { kind: 'bob', speed: 2.5, amplitude: 0.4 }
            }));
        } else if (isFood) {
            // Circular tray/plate
            parts.push(createPart('dyn_plate', 'Alus / Taldrik', 'frame', 'cylinder', [3.5 * s, 0.2 * s, 3.5 * s], [0, 0.1 * s, 0], '#f8fafc', { material: 'ceramic' as any }));
            // Food base
            parts.push(createPart('dyn_food', `${word}`, 'fuselage', 'cylinder', [3 * s, 0.4 * s, 3 * s], [0, 0.3 * s, 0], primaryColor));
            // Toppings
            parts.push(createPart('dyn_topping', 'Lisandid ja garneering', 'decoration', 'sphere', [2.2 * s, 0.3 * s, 2.2 * s], [0, 0.6 * s, 0], '#ef4444', { material: 'neon' }));
        } else {
            // General multi-layered 3D prop/artifact
            parts.push(createPart('dyn_base', `${word} - Alus`, 'frame', 'box', [3 * s, 0.5 * s, 3 * s], [0, 0.25 * s, 0], '#334155'));
            parts.push(createPart('dyn_main', `${word} - Põhikeha`, 'fuselage', 'cylinder', [2.4 * s, 4 * s, 2.4 * s], [0, 2.5 * s, 0], primaryColor, { material: 'metal' }));
            parts.push(createPart('dyn_crown', `${word} - Ülaosa`, 'roof', 'sphere', [2 * s, 1.5 * s, 2 * s], [0, 5.2 * s, 0], '#38bdf8', {
                material: 'glass',
                anim: { kind: 'bob', speed: 1.5, amplitude: 0.2 }
            }));
        }

        return parts;
    }
}
