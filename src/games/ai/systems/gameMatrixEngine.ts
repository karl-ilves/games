import type { PlayardAiScene, PlayardSceneObject } from './gameGenerator';

export interface GameMatrixPermutation {
    id: string;
    gameNumber: number;
    title: string;
    description: string;
    genre: MatrixGenre;
    biome: MatrixBiome;
    objective: MatrixObjective;
    hazard: MatrixHazard;
    mutator: MatrixMutator;
}

export interface MatrixGenre {
    id: string;
    name: string;
    icon: string;
    playerSpeed: number;
    jumpForce: number;
    spawnY: number;
    cameraMode: 'follow' | 'fps' | 'isometric';
}

export interface MatrixBiome {
    id: string;
    name: string;
    skyColor: number;
    lightColor: number;
    groundColor: number;
    fogDensity: number;
    timeOfDay: string;
    wallColor: string;
    ambientSound?: string;
}

export interface MatrixObjective {
    id: string;
    name: string;
    description: string;
    winCondition: string;
    targetCount: number;
    itemType: string;
    itemColor: string;
    itemShape: 'sphere' | 'cylinder' | 'box' | 'cone';
}

export interface MatrixHazard {
    id: string;
    name: string;
    description: string;
    threatType: string;
    color: string;
    shape: 'box' | 'cylinder' | 'sphere' | 'cone';
    damage: number;
}

export interface MatrixMutator {
    id: string;
    name: string;
    tag: string;
    ruleDescription: string;
    playerSpeedMultiplier: number;
    gravityMultiplier: number;
    hasJetpack?: boolean;
    hasShield?: boolean;
}

/**
 * Playard Game Matrix 100,000+ Combinatorial Procedural Engine.
 * Generates over 200,000 mathematically distinct, fully playable 3D games
 * with unique worlds, interactive objectives, hazards, player mechanics, and custom Three.js code.
 */
export class PlayardGameMatrixEngine {
    public static readonly GENRES: MatrixGenre[] = [
        { id: 'platformer', name: '3D Parkuur & Hüpped', icon: '🏃‍♂️', playerSpeed: 9.0, jumpForce: 13.0, spawnY: 1.5, cameraMode: 'follow' },
        { id: 'racing', name: 'Võidusõit & Kiirus', icon: '🏎️', playerSpeed: 18.0, jumpForce: 7.0, spawnY: 1.0, cameraMode: 'follow' },
        { id: 'flight', name: 'Lennusimulaator & Õhulahing', icon: '✈️', playerSpeed: 22.0, jumpForce: 18.0, spawnY: 10.0, cameraMode: 'follow' },
        { id: 'survival', name: 'Ellujäämine & Ressursid', icon: '🏕️', playerSpeed: 7.5, jumpForce: 10.5, spawnY: 1.5, cameraMode: 'follow' },
        { id: 'zombie_defense', name: 'Zombi Lainete Kaitse', icon: '🧟', playerSpeed: 8.0, jumpForce: 11.0, spawnY: 1.5, cameraMode: 'fps' },
        { id: 'tycoon', name: 'Tehase & Raha Tycoon', icon: '🏭', playerSpeed: 8.5, jumpForce: 10.0, spawnY: 1.5, cameraMode: 'isometric' },
        { id: 'dungeon_crawler', name: 'Koopa-uurija RPG', icon: '⚔️', playerSpeed: 8.0, jumpForce: 11.0, spawnY: 1.5, cameraMode: 'follow' },
        { id: 'space_sim', name: 'Kosmose Uurimine & Orbitaal', icon: '🚀', playerSpeed: 11.0, jumpForce: 15.0, spawnY: 5.0, cameraMode: 'follow' },
        { id: 'tower_defense', name: 'Tornikaitse Strateegia', icon: '🏰', playerSpeed: 9.0, jumpForce: 10.0, spawnY: 1.5, cameraMode: 'isometric' },
        { id: 'battle_royale', name: 'Areeni Viimane Ellujääja', icon: '🏆', playerSpeed: 9.5, jumpForce: 12.0, spawnY: 1.5, cameraMode: 'follow' },
        { id: 'horror_escape', name: 'Õuduse & Salapära Põgenemine', icon: '👻', playerSpeed: 7.0, jumpForce: 9.5, spawnY: 1.5, cameraMode: 'fps' },
        { id: 'puzzle_maze', name: 'Labürindi & Mõistatuste Saladus', icon: '🧩', playerSpeed: 7.5, jumpForce: 10.0, spawnY: 1.5, cameraMode: 'follow' },
        { id: 'boss_raid', name: 'Hiid-Bossi Raidlahing', icon: '👹', playerSpeed: 9.0, jumpForce: 12.5, spawnY: 1.5, cameraMode: 'follow' },
        { id: 'stealth_agent', name: 'Salajane Spiooni Infiltratsioon', icon: '🕵️‍♂️', playerSpeed: 6.5, jumpForce: 10.0, spawnY: 1.5, cameraMode: 'follow' },
        { id: 'city_builder', name: 'Tulevikulinna Arhitekt', icon: '🏙️', playerSpeed: 10.0, jumpForce: 11.0, spawnY: 1.5, cameraMode: 'isometric' },
        { id: 'farming_sim', name: 'Talu & Loomade Simulaator', icon: '🚜', playerSpeed: 8.0, jumpForce: 10.0, spawnY: 1.5, cameraMode: 'follow' },
        { id: 'lava_climb', name: 'Põranda Laava Ronimismäng', icon: '🌋', playerSpeed: 10.0, jumpForce: 14.5, spawnY: 1.5, cameraMode: 'follow' },
        { id: 'demolition_derby', name: 'Rammimise & Purustamise Areen', icon: '💥', playerSpeed: 15.0, jumpForce: 8.0, spawnY: 1.5, cameraMode: 'follow' },
        { id: 'underwater_dive', name: 'Süvamere Veealune Ekspeditsioon', icon: '🌊', playerSpeed: 7.0, jumpForce: 14.0, spawnY: 2.0, cameraMode: 'follow' },
        { id: 'cyber_runner', name: 'Küberpungi Neoonjooksja', icon: '⚡', playerSpeed: 14.0, jumpForce: 13.5, spawnY: 1.5, cameraMode: 'follow' }
    ];

    public static readonly BIOMES: MatrixBiome[] = [
        { id: 'neo_tokyo', name: 'Cyberpunk Neo-Tokyo', skyColor: 0x090514, lightColor: 0xa855f7, groundColor: 0x111827, fogDensity: 0.012, timeOfDay: 'night', wallColor: '#38bdf8' },
        { id: 'medieval_castle', name: 'Keskaegne Loss & Troonisaal', skyColor: 0xd97706, lightColor: 0xfef08a, groundColor: 0x3f3f46, fogDensity: 0.008, timeOfDay: 'sunset', wallColor: '#78716c' },
        { id: 'ocean_abyss', name: 'Süvamere Ookeanisüvik', skyColor: 0x022c43, lightColor: 0x06b6d4, groundColor: 0x0f172a, fogDensity: 0.022, timeOfDay: 'alien', wallColor: '#0284c7' },
        { id: 'lava_volcano', name: 'Põrgulik Laavavulkaan', skyColor: 0x450a0a, lightColor: 0xf97316, groundColor: 0x18181b, fogDensity: 0.018, timeOfDay: 'night', wallColor: '#dc2626' },
        { id: 'arctic_tundra', name: 'Polaar-Arktika Jääliustik', skyColor: 0xecfeff, lightColor: 0xbae6fd, groundColor: 0xe0f2fe, fogDensity: 0.015, timeOfDay: 'day', wallColor: '#38bdf8' },
        { id: 'mars_colony', name: 'Marsi Punase Planeedi Baas', skyColor: 0x7c2d12, lightColor: 0xfb923c, groundColor: 0x9a3412, fogDensity: 0.010, timeOfDay: 'sunset', wallColor: '#ea580c' },
        { id: 'alien_jungle', name: 'Tulnukate Helendav Džungel', skyColor: 0x3b0764, lightColor: 0xd946ef, groundColor: 0x1e1b4b, fogDensity: 0.016, timeOfDay: 'alien', wallColor: '#a21caf' },
        { id: 'haunted_mansion', name: 'Kummmitusmõis & Kalmistu', skyColor: 0x030712, lightColor: 0x94a3b8, groundColor: 0x111827, fogDensity: 0.025, timeOfDay: 'night', wallColor: '#4b5563' },
        { id: 'candyland', name: 'Värviline Kommimaailm', skyColor: 0xfce7f3, lightColor: 0xf472b6, groundColor: 0xfdf2f8, fogDensity: 0.005, timeOfDay: 'day', wallColor: '#ec4899' },
        { id: 'desert_pyramids', name: 'Egiptuse Kõrb & Püramiidid', skyColor: 0xfef3c7, lightColor: 0xfbbf24, groundColor: 0xf59e0b, fogDensity: 0.007, timeOfDay: 'day', wallColor: '#d97706' },
        { id: 'floating_islands', name: 'Ujuvad Taevasaared', skyColor: 0x38bdf8, lightColor: 0xffffff, groundColor: 0x22c55e, fogDensity: 0.006, timeOfDay: 'day', wallColor: '#84cc16' },
        { id: 'wild_west', name: 'Metsiku Lääne Kanjonilinn', skyColor: 0xca8a04, lightColor: 0xfde047, groundColor: 0x78350f, fogDensity: 0.009, timeOfDay: 'sunset', wallColor: '#b45309' },
        { id: 'steampunk_factory', name: 'Aurupungi Kellavärgitehas', skyColor: 0x292524, lightColor: 0xfacc15, groundColor: 0x1c1917, fogDensity: 0.014, timeOfDay: 'night', wallColor: '#a16207' },
        { id: 'post_apocalyptic', name: 'Tuumajärgne Varemete Linn', skyColor: 0x14532d, lightColor: 0x86efac, groundColor: 0x064e3b, fogDensity: 0.020, timeOfDay: 'alien', wallColor: '#15803d' },
        { id: 'space_station', name: 'Süvakosmose Orbitaaljaam', skyColor: 0x000000, lightColor: 0x60a5fa, groundColor: 0x1e293b, fogDensity: 0.001, timeOfDay: 'space', wallColor: '#3b82f6' },
        { id: 'crystal_caverns', name: 'Prismaatilised Kristallikoopad', skyColor: 0x082f49, lightColor: 0x38bdf8, groundColor: 0x0c4a6e, fogDensity: 0.015, timeOfDay: 'night', wallColor: '#0284c7' },
        { id: 'pirate_archipelago', name: 'Kariibi Piraatide Saarestik', skyColor: 0x38bdf8, lightColor: 0xfef08a, groundColor: 0x0ea5e9, fogDensity: 0.004, timeOfDay: 'day', wallColor: '#059669' },
        { id: 'dark_cathedral', name: 'Gooti Katedraali Krüpt', skyColor: 0x050505, lightColor: 0x818cf8, groundColor: 0x18181b, fogDensity: 0.019, timeOfDay: 'night', wallColor: '#6366f1' },
        { id: 'synthwave_grid', name: 'Synthwave 80s Neoonvõre', skyColor: 0x180228, lightColor: 0xf43f5e, groundColor: 0x0f051d, fogDensity: 0.011, timeOfDay: 'night', wallColor: '#f43f5e' },
        { id: 'dinosaur_valley', name: 'Juura-ajastu Dinosauuruste Org', skyColor: 0x15803d, lightColor: 0xa3e635, groundColor: 0x14532d, fogDensity: 0.013, timeOfDay: 'day', wallColor: '#4d7c0f' },
        { id: 'emerald_sanctuary', name: 'Smaragdmetsa Pühapaik', skyColor: 0x065f46, lightColor: 0x34d399, groundColor: 0x064e3b, fogDensity: 0.010, timeOfDay: 'day', wallColor: '#10b981' },
        { id: 'underground_bunker', name: 'Maa-alune Kõrgtehnoloogia Punker', skyColor: 0x0a0a0a, lightColor: 0xf87171, groundColor: 0x262626, fogDensity: 0.017, timeOfDay: 'night', wallColor: '#ef4444' },
        { id: 'solar_dyson_ring', name: 'Päikese Dysoni Orbitaalrõngas', skyColor: 0x1e1b4b, lightColor: 0xfde047, groundColor: 0x312e81, fogDensity: 0.003, timeOfDay: 'space', wallColor: '#eab308' },
        { id: 'toy_workshop', name: 'Mänguasjade Gigantne Töökoda', skyColor: 0xffedd5, lightColor: 0xfb923c, groundColor: 0xfef3c7, fogDensity: 0.006, timeOfDay: 'day', wallColor: '#f97316' },
        { id: 'olympus_citadel', name: 'Kreeka Olümpose Marmortempel', skyColor: 0xe0f2fe, lightColor: 0xfef08a, groundColor: 0xf8fafc, fogDensity: 0.008, timeOfDay: 'sunrise', wallColor: '#fbbf24' }
    ];

    public static readonly OBJECTIVES: MatrixObjective[] = [
        { id: 'energy_cores', name: '5 Energiatuuma', description: 'Kogu kõik 5 iidset energiatuuma ja aktiveeri keskne portaal!', winCondition: '5 energiatuuma kogutud', targetCount: 5, itemType: 'core', itemColor: '#38bdf8', itemShape: 'sphere' },
        { id: 'titan_boss', name: 'Titaan-Bossi Alistamine', description: 'Leia nõrk koht ja alista hiiglaslik Titaan enne kui aeg otsa saab!', winCondition: 'Titaan-boss alistatud', targetCount: 1, itemType: 'boss', itemColor: '#ef4444', itemShape: 'cylinder' },
        { id: 'checkpoints', name: 'Kontrollpunktide Ralli', description: 'Sõida läbi 8 helendava kontrollpunkti rekordajaga!', winCondition: 'Kõik kontrollpunktid läbitud', targetCount: 8, itemType: 'ring', itemColor: '#22c55e', itemShape: 'cylinder' },
        { id: 'wave_survival', name: '3 Lainet Ellujäämist', description: 'Pea vastu 3 järjest tugevamale vaenlaste rünnakulainele!', winCondition: '3 lainet edukalt üle elatud', targetCount: 3, itemType: 'wave_beacon', itemColor: '#a855f7', itemShape: 'box' },
        { id: 'vault_data', name: 'Salajaste Andmete Vargus', description: 'Hiili turvameestest mööda ja murra lahti andmesalvesti!', winCondition: 'Andmeketas edukalt evakueeritud', targetCount: 1, itemType: 'terminal', itemColor: '#eab308', itemShape: 'box' },
        { id: 'cargo_delivery', name: 'Hinnalise Laadungi Vedu', description: 'Vii kriitiline varustus üle ohtliku maastiku teise baasi!', winCondition: 'Laadung tervena sihtpunkti toimetatud', targetCount: 1, itemType: 'cargo', itemColor: '#f97316', itemShape: 'box' },
        { id: 'crystal_defense', name: 'Planetaarse Kristalli Kaitse', description: 'Kaitse keskset elukristalli sissetungijate kahurite eest!', winCondition: 'Kristall terve ja rünnakud tõrjutud', targetCount: 1, itemType: 'defense_crystal', itemColor: '#06b6d4', itemShape: 'cone' },
        { id: 'maze_escape', name: 'Labürindi Väljapääsu Otsing', description: 'Lahenda 3 värvikoodiga ust ja põgene labürindist!', winCondition: 'Kõik võtmed leitud ja värav avatud', targetCount: 3, itemType: 'keycard', itemColor: '#ec4899', itemShape: 'box' },
        { id: 'rising_lava', name: 'Tõusva Laava Eest Põgenemine', description: 'Roni vähemalt 40 meetri kõrgusele enne kui laavapind sind kätte saab!', winCondition: 'Tippu jõutud enne laava tõusu', targetCount: 1, itemType: 'summit_flag', itemColor: '#f43f5e', itemShape: 'cylinder' },
        { id: 'tycoon_revenue', name: '10 000 PBX Tootmine', description: 'Käivita automaatsed konveierid ja tooda 10 000 PlayBux väärtuses tooteid!', winCondition: '10 000 PBX tootmislimiit saavutatud', targetCount: 10, itemType: 'factory_dropper', itemColor: '#10b981', itemShape: 'box' },
        { id: 'fire_rescue', name: 'Tulekahjude Kustutamine', description: 'Kustuta 5 leegitsevat ohuallikat ja päästa tsiviilisikud!', winCondition: '5 tulekollet neutraliseeritud', targetCount: 5, itemType: 'fire_hazard', itemColor: '#dc2626', itemShape: 'cone' },
        { id: 'drone_hunt', name: '4 Luuredrooni Hukutamine', description: 'Jälita ja tulista alla 4 keelutsoonis lendavat drooni!', winCondition: '4 vaenulikku drooni hävitatud', targetCount: 4, itemType: 'drone_target', itemColor: '#8b5cf6', itemShape: 'sphere' },
        { id: 'elixir_brew', name: 'Tervendava Eliksiiri Retsept', description: 'Kogu 4 maagilist taime ja valmista alkeemialaboris eliksiir!', winCondition: 'Eliksiir keedetud ja joodud', targetCount: 4, itemType: 'herb', itemColor: '#84cc16', itemShape: 'cylinder' },
        { id: 'shuttle_evac', name: 'Kosmosesüstikule Jõudmine', description: 'Jookse evakueerimissüstikule enne kui stardiloendus jõuab nulli!', winCondition: 'Süstiku kabiinis enne starti', targetCount: 1, itemType: 'shuttle_ramp', itemColor: '#f8fafc', itemShape: 'box' },
        { id: 'reactor_nodes', name: '3 Reaktorituuma Jahutamine', description: 'Lülita välja 3 ülekuumenevat kütusevarrast reaktori saalis!', winCondition: 'Kõik 3 jahutusklappi avatud', targetCount: 3, itemType: 'coolant_valve', itemColor: '#0ea5e9', itemShape: 'cylinder' },
        { id: 'pirate_treasure', name: 'Piraatide Suure Aarde Rööv', description: 'Leia salajane aardelaegas ja vii see ootavasse laeva!', winCondition: 'Kuld laevale toimetatud', targetCount: 1, itemType: 'treasure_chest', itemColor: '#ffd700', itemShape: 'box' },
        { id: 'antenna_realign', name: 'Hädasignaali Saatja Joondus', description: 'Pööra 3 sidesatelliidi taldrikut kosmoselaeva poole!', winCondition: 'Hädasignaal edukalt eetrisse saadetud', targetCount: 3, itemType: 'satellite_dish', itemColor: '#cbd5e1', itemShape: 'cone' },
        { id: 'derby_ramming', name: '3 Rivaali Sõiduki Purustamine', description: 'Rammi areenil 3 vaenlase lahingumasinat liikumisvõimetuks!', winCondition: '3 vaenlast areenilt välja tõrjutud', targetCount: 3, itemType: 'enemy_vehicle', itemColor: '#475569', itemShape: 'box' },
        { id: 'orbital_course', name: 'Gravitatsioonita Ruumirada', description: 'Läbi hõljuv takistusrada ilma sügavasse kosmosesse kukkumata!', winCondition: 'Kosmoseplatvormide rada edukalt läbitud', targetCount: 7, itemType: 'float_pad', itemColor: '#a78bfa', itemShape: 'box' },
        { id: 'beacons_hold', name: '3 Juhtimismajaka Hoidmine', description: 'Valluta ja hoia enda kontrolli all 3 tsoonimajakat korraga!', winCondition: 'Kõik 3 majakat siniseks värvitud', targetCount: 3, itemType: 'beacon_tower', itemColor: '#3b82f6', itemShape: 'cylinder' }
    ];

    public static readonly HAZARDS: MatrixHazard[] = [
        { id: 'laser_beams', name: 'Pöörlevad Laserkiired', threatType: 'laser', color: '#ef4444', shape: 'cylinder', damage: 35 },
        { id: 'magma_geysers', name: 'Purskavad Laavageisrid', threatType: 'fire', color: '#f97316', shape: 'cone', damage: 50 },
        { id: 'acid_pools', name: 'Mürgised Happebasseinid', threatType: 'acid', color: '#84cc16', shape: 'cylinder', damage: 25 },
        { id: 'hunter_drones', name: 'Jälitavad Tapjadroonid', threatType: 'drone', color: '#a855f7', shape: 'sphere', damage: 30 },
        { id: 'meteor_rain', name: 'Langevad Kosmosemeteoorid', threatType: 'meteor', color: '#ea580c', shape: 'sphere', damage: 60 },
        { id: 'toxic_fog', name: 'Hingamatu Mürgiudu Tsoon', threatType: 'gas', color: '#10b981', shape: 'box', damage: 15 },
        { id: 'sentry_robots', name: 'Valverobotite Prožektorid', threatType: 'patrol', color: '#facc15', shape: 'box', damage: 40 },
        { id: 'electric_grid', name: 'Kõrgepinge Elektrivõred', threatType: 'shock', color: '#38bdf8', shape: 'box', damage: 35 },
        { id: 'falling_tiles', name: 'Varisevad Põrandaplaadid', threatType: 'pit', color: '#71717a', shape: 'box', damage: 100 },
        { id: 'giant_pendulum', name: 'Hiiglaslikud Okastega Pendild', threatType: 'crush', color: '#475569', shape: 'sphere', damage: 70 },
        { id: 'blizzard_drift', name: 'Külmutavad Jääblizzardid', threatType: 'ice', color: '#e0f2fe', shape: 'box', damage: 20 },
        { id: 'black_hole_well', name: 'Musta Augu Gravitatsioonikaev', threatType: 'vortex', color: '#1e1b4b', shape: 'sphere', damage: 90 },
        { id: 'fuel_explosives', name: 'Plahvatusohtlikud Kütusetünnid', threatType: 'explosion', color: '#dc2626', shape: 'cylinder', damage: 80 },
        { id: 'floor_spikes', name: 'Maast Väljahüppavad Piigid', threatType: 'spikes', color: '#94a3b8', shape: 'cone', damage: 45 },
        { id: 'shadow_phantoms', name: 'Varjufantoomide Rünnak', threatType: 'ghost', color: '#312e81', shape: 'cylinder', damage: 30 },
        { id: 'tornado_vortex', name: 'Kõrgtuule Tornaadokeeris', threatType: 'wind', color: '#64748b', shape: 'cone', damage: 40 },
        { id: 'plasma_turrets', name: 'Automaatsed Plasmakahurid', threatType: 'turret', color: '#ec4899', shape: 'cylinder', damage: 35 },
        { id: 'hydraulic_crushers', name: 'Hüdraulilised Raskuspressid', threatType: 'smash', color: '#334155', shape: 'box', damage: 95 },
        { id: 'quicksand_pits', name: 'Sisseimev Mudamülkas', threatType: 'sink', color: '#854d0e', shape: 'cylinder', damage: 20 },
        { id: 'emp_pulse_waves', name: 'Elektromagnetilised Kiirguspulsid', threatType: 'emp', color: '#6366f1', shape: 'sphere', damage: 25 }
    ];

    public static readonly MUTATORS: MatrixMutator[] = [
        { id: 'standard', name: 'Klassikaline Reeglistik', tag: 'CLASSIC', ruleDescription: 'Tavapärane füüsika ja tasakaalustatud väljakutse.', playerSpeedMultiplier: 1.0, gravityMultiplier: 1.0 },
        { id: 'low_gravity', name: 'Kuu Gravitatsioon (Hõljumine)', tag: 'MOON_GRAV', ruleDescription: 'Vähendatud gravitatsioon lubab teha ülisuuri hüppeid!', playerSpeedMultiplier: 1.1, gravityMultiplier: 0.4 },
        { id: 'speed_overdrive', name: 'Superkiirus Overdrive', tag: 'SPEED_2X', ruleDescription: 'Mängija liigub topeltkiirusel, refleksid peavad olema välkkiired!', playerSpeedMultiplier: 2.2, gravityMultiplier: 1.0 },
        { id: 'stealth_fog', name: 'Tume Öine Salapära (Prožektor)', tag: 'NIGHT_STEALTH', ruleDescription: 'Maailma katab pime udu – nähtavus ainult taskulambi koonuses.', playerSpeedMultiplier: 0.9, gravityMultiplier: 1.0 },
        { id: 'shield_regen', name: 'Isetaastuv Plasmakilp', tag: 'SHIELD_REGEN', ruleDescription: 'Mängijal on lisakilp, mis vigastuse puudumisel taastub 3 sekundiga.', playerSpeedMultiplier: 1.0, gravityMultiplier: 1.0, hasShield: true },
        { id: 'double_jump', name: 'Topelthüpe (Double Jump)', tag: 'DOUBLE_JUMP', ruleDescription: 'Õhus olles saab sooritada teise akrobaatilise lisahüppe!', playerSpeedMultiplier: 1.15, gravityMultiplier: 0.9 },
        { id: 'jetpack_boost', name: 'Reaktiivseljakott (Jetpack)', tag: 'JETPACK', ruleDescription: 'Tühikuklahvi all hoides saad lennata kuni kütus otsa saab.', playerSpeedMultiplier: 1.2, gravityMultiplier: 0.7, hasJetpack: true },
        { id: 'vampire_heals', name: 'Vampiirielud (Lifesteal)', tag: 'VAMPIRE', ruleDescription: 'Takistuse edukas ületamine või eesmärgi korjamine taastab 100% eludest.', playerSpeedMultiplier: 1.0, gravityMultiplier: 1.0 },
        { id: 'weather_storm', name: 'Torm & Välgunooled', tag: 'STORM', ruleDescription: 'Dünaamiline taevas sajab vihma ja aeg-ajalt lööb välku.', playerSpeedMultiplier: 0.95, gravityMultiplier: 1.0 },
        { id: 'bullet_time', name: 'Kuuliaeg (Bullet-Time)', tag: 'BULLET_TIME', ruleDescription: 'Ohutsooni lähedal aeglustub aeg 50%, võimaldades täppisliigutusi.', playerSpeedMultiplier: 1.1, gravityMultiplier: 1.0 },
        { id: 'bouncy_world', name: 'Elastne Vedrumaailm', tag: 'BOUNCY', ruleDescription: 'Kõik pinnad ja platvormid põrgatavad mängijat nagu batuut.', playerSpeedMultiplier: 1.25, gravityMultiplier: 0.8 },
        { id: 'sudden_death', name: 'Äkksurm (1 Elupunkt)', tag: '1_HIT_DEATH', ruleDescription: 'Iga viga on saatuslik – 1 puudutus ja mäng algab uuesti!', playerSpeedMultiplier: 1.1, gravityMultiplier: 1.0 },
        { id: 'coin_frenzy', name: 'Mündisadu (Bonus PlayBux)', tag: 'COIN_FRENZY', ruleDescription: 'Taevast sajab boonusmünte, mis annavad topelt PlayBuxe.', playerSpeedMultiplier: 1.0, gravityMultiplier: 1.0 },
        { id: 'time_freeze', name: 'Aja Külmutamine', tag: 'TIME_FREEZE', ruleDescription: 'Korjates liivakellasid peatuvad kõik ohtlikud mehhanismid 5 sekundiks.', playerSpeedMultiplier: 1.0, gravityMultiplier: 1.0 },
        { id: 'gravity_flip', name: 'Pööratud Gravitatsioon', tag: 'GRAV_FLIP', ruleDescription: 'Spetsiaalsed lülitid pööravad gravitatsiooni lae suunas.', playerSpeedMultiplier: 1.05, gravityMultiplier: 1.0 }
    ];

    /**
     * Total count of core distinct combinations (20 * 25 * 20 * 20 = 200,000).
     */
    public static getTotalUniqueGamesCount(): number {
        return this.GENRES.length * this.BIOMES.length * this.OBJECTIVES.length * this.HAZARDS.length; // 200,000
    }

    /**
     * Total count with mutators (200,000 * 15 = 3,000,000).
     */
    public static getTotalPermutationsCount(): number {
        return this.getTotalUniqueGamesCount() * this.MUTATORS.length; // 3,000,000
    }

    /**
     * Generates a deterministic, unique game by number (index 1 to 200,000+).
     */
    public static getGameByNumber(gameNumber: number): GameMatrixPermutation {
        const total = this.getTotalUniqueGamesCount();
        const normalized = Math.abs(Math.floor(gameNumber)) % total;

        const gIdx = normalized % this.GENRES.length;
        const bIdx = Math.floor(normalized / this.GENRES.length) % this.BIOMES.length;
        const oIdx = Math.floor(normalized / (this.GENRES.length * this.BIOMES.length)) % this.OBJECTIVES.length;
        const hIdx = Math.floor(normalized / (this.GENRES.length * this.BIOMES.length * this.OBJECTIVES.length)) % this.HAZARDS.length;
        const mIdx = (gIdx + bIdx + oIdx + hIdx) % this.MUTATORS.length;

        const genre = this.GENRES[gIdx];
        const biome = this.BIOMES[bIdx];
        const objective = this.OBJECTIVES[oIdx];
        const hazard = this.HAZARDS[hIdx];
        const mutator = this.MUTATORS[mIdx];

        const title = `${genre.icon} ${biome.name}: ${objective.name}`;
        const description = `Mäng nr ${gameNumber} (Žanr: ${genre.name}, Keskkond: ${biome.name}). Eesmärk: ${objective.description} Ettevaatust: ${hazard.name}! Reegel: ${mutator.name}.`;

        return {
            id: `matrix_game_${gameNumber}`,
            gameNumber,
            title,
            description,
            genre,
            biome,
            objective,
            hazard,
            mutator
        };
    }

    /**
     * Searches or synthesizes the closest matching game from natural language prompt.
     */
    public static resolveFromPrompt(prompt: string): GameMatrixPermutation {
        const lower = prompt.toLowerCase().trim();

        // Check if an explicit number is given (e.g. "mäng nr 452", "mäng 12040", "game #777")
        const numMatch = prompt.match(/(?:mäng|game|nr|number|#)\s*[:#]?\s*(\d+)/i);
        if (numMatch) {
            const num = parseInt(numMatch[1], 10);
            if (!isNaN(num) && num > 0) {
                return this.getGameByNumber(num);
            }
        }

        // Fuzzy match Genre
        let bestGenre = this.GENRES[0];
        for (const g of this.GENRES) {
            const gTerms = g.name.toLowerCase().split(/[ &]/);
            if (gTerms.some(t => t.length > 3 && lower.includes(t)) || lower.includes(g.id)) {
                bestGenre = g;
                break;
            }
        }

        // Fuzzy match Biome
        let bestBiome = this.BIOMES[0];
        for (const b of this.BIOMES) {
            const bTerms = b.name.toLowerCase().split(/[ &]/);
            if (bTerms.some(t => t.length > 3 && lower.includes(t)) || lower.includes(b.id)) {
                bestBiome = b;
                break;
            }
        }

        // Fuzzy match Objective
        let bestObj = this.OBJECTIVES[0];
        for (const o of this.OBJECTIVES) {
            const oTerms = o.name.toLowerCase().split(/[ &]/);
            if (oTerms.some(t => t.length > 3 && lower.includes(t))) {
                bestObj = o;
                break;
            }
        }

        // Fuzzy match Hazard
        let bestHazard = this.HAZARDS[0];
        for (const h of this.HAZARDS) {
            const hTerms = h.name.toLowerCase().split(/[ &]/);
            if (hTerms.some(t => t.length > 3 && lower.includes(t))) {
                bestHazard = h;
                break;
            }
        }

        // Generate synthetic hash seed from string
        let hash = 0;
        for (let i = 0; i < prompt.length; i++) {
            hash = (hash * 31 + prompt.charCodeAt(i)) >>> 0;
        }
        const derivedNum = (hash % this.getTotalUniqueGamesCount()) + 1;
        const mutator = this.MUTATORS[hash % this.MUTATORS.length];

        const title = `${bestGenre.icon} ${bestBiome.name}: ${bestObj.name}`;
        const description = `Mäng nr ${derivedNum} loodud sisendist "${prompt}". Žanr: ${bestGenre.name}, Keskkond: ${bestBiome.name}. Eesmärk: ${bestObj.description}`;

        return {
            id: `matrix_game_${derivedNum}`,
            gameNumber: derivedNum,
            title,
            description,
            genre: bestGenre,
            biome: bestBiome,
            objective: bestObj,
            hazard: bestHazard,
            mutator
        };
    }

    /**
     * Builds a full 3D interactive Playard scene from a permutation.
     */
    public static build3DScene(perm: GameMatrixPermutation): PlayardAiScene {
        const { genre, biome, objective, hazard, mutator } = perm;

        const objects: PlayardSceneObject[] = [];

        // 1. Central Terrain / Arena Ground
        objects.push({
            id: 'arena_floor',
            name: `${biome.name} - Pinnas`,
            type: 'box',
            position: [0, -0.5, 0],
            rotation: [0, 0, 0],
            scale: [70, 1, 70],
            color: biome.groundColor,
            material: 'standard',
            isCollidable: true
        });

        // 2. Player Spawn Point
        const finalSpeed = Math.round(genre.playerSpeed * mutator.playerSpeedMultiplier * 10) / 10;
        const finalJump = Math.round(genre.jumpForce * (1 / mutator.gravityMultiplier) * 10) / 10;

        objects.push({
            id: 'player_spawn',
            name: `🚩 Alguspunkt (${genre.name})`,
            type: 'spawn',
            position: [0, genre.spawnY, 26],
            rotation: [0, 0, 0],
            scale: [2.5, 0.2, 2.5],
            color: '#3b82f6',
            isCollidable: false,
            gameItemType: 'spawn'
        });

        // 3. Environmental Thematic Landmarks (4 themed towers/monoliths)
        const cornerPositions = [
            [-24, 0, -24],
            [24, 0, -24],
            [-24, 0, 24],
            [24, 0, 24]
        ];
        cornerPositions.forEach((pos, i) => {
            objects.push({
                id: `pillar_${i + 1}`,
                name: `${biome.name} - Sammastorn ${i + 1}`,
                type: 'cylinder',
                position: [pos[0], 6, pos[2]],
                rotation: [0, 0, 0],
                scale: [3, 12, 3],
                color: biome.wallColor,
                material: 'stone',
                isCollidable: true
            });
            // Glowing energy crystal on top of pillar
            objects.push({
                id: `pillar_light_${i + 1}`,
                name: `Tulemajakas ${i + 1}`,
                type: 'sphere',
                position: [pos[0], 12.8, pos[2]],
                rotation: [0, 0, 0],
                scale: [1.8, 1.8, 1.8],
                color: biome.lightColor,
                material: 'neon',
                isCollidable: false
            });
        });

        // 4. Objective Collectibles / Targets
        const targetCount = objective.targetCount;
        for (let i = 0; i < targetCount; i++) {
            const angle = (i / targetCount) * Math.PI * 2;
            const radius = 12 + (i % 2) * 6;
            const x = Math.round(Math.cos(angle) * radius);
            const z = Math.round(Math.sin(angle) * radius);
            const y = 1.6 + (i % 3) * 0.8;

            objects.push({
                id: `obj_target_${i + 1}`,
                name: `✨ ${objective.name} #${i + 1}`,
                type: objective.itemShape,
                position: [x, y, z],
                rotation: [0, i * 0.5, 0],
                scale: [1.4, 1.4, 1.4],
                color: objective.itemColor,
                material: 'gold',
                gameItemType: 'collectible',
                isCollidable: true,
                extra: { role: 'objective_target', index: i + 1 }
            });
        }

        // 5. Dynamic Hazards & Threats (6 placed traps/dangers)
        const hazardCount = 6;
        for (let i = 0; i < hazardCount; i++) {
            const hx = ((i % 3) - 1) * 14;
            const hz = (i < 3 ? -10 : 8);
            const hy = hazard.shape === 'cylinder' ? 2 : 1;

            objects.push({
                id: `hazard_trap_${i + 1}`,
                name: `⚠️ ${hazard.name} ${i + 1}`,
                type: hazard.shape,
                position: [hx, hy, hz],
                rotation: [0, i * 0.8, 0],
                scale: [2.2, 2.2, 2.2],
                color: hazard.color,
                material: 'metal',
                isHazard: true,
                isCollidable: true,
                extra: { damage: hazard.damage, threatType: hazard.threatType }
            });
        }

        // 6. Victory Gate / Portal
        objects.push({
            id: 'game_victory_gate',
            name: '🏆 Finiši Võiduportaal',
            type: 'cylinder',
            position: [0, 4, -26],
            rotation: [0, 0, 0],
            scale: [6, 8, 1],
            color: '#10b981',
            material: 'neon',
            gameItemType: 'victory_gate',
            isCollidable: true,
            isSafeZone: true
        });

        // 7. Generate Dedicated Playable Script
        const script = `// ==========================================================
// 🎮 Playard Mäng nr ${perm.gameNumber}: "${perm.title}"
// Žanr: ${genre.name} | Keskkond: ${biome.name} | Eesmärk: ${objective.name}
// Mutator: ${mutator.name} (${mutator.tag})
// ==========================================================
export class PlayardMatrixGame_${perm.gameNumber} {
    public score = 0;
    public targetsCollected = 0;
    public totalTargets = ${targetCount};
    public isGameOver = false;
    public isWon = false;
    public playerSpeed = ${finalSpeed};
    public playerJump = ${finalJump};
    public mutator = "${mutator.tag}";

    constructor() {
        console.log("🎮 Käivitatud Playard Mäng nr ${perm.gameNumber}: ${perm.title}");
        console.log("🎯 Eesmärk: ${objective.description}");
        console.log("⚠️ Oht: ${hazard.name} (Kahjustus: ${hazard.damage} HP)");
    }

    public onCollectTarget(targetId: string): void {
        if (this.isGameOver) return;
        this.targetsCollected++;
        this.score += 250;
        console.log(\`✨ Kogutud: \${this.targetsCollected} / \${this.totalTargets}\`);
        if (this.targetsCollected >= this.totalTargets) {
            console.log("🌟 Kõik eesmärgid täidetud! Astu finišiväravasse võitmiseks!");
        }
    }

    public onHazardHit(hazardId: string): boolean {
        if (this.isGameOver) return false;
        console.warn(\`💥 Pihta saanud ohule: \${hazardId}! Kahjustus: ${hazard.damage}\`);
        return true;
    }

    public onReachVictoryGate(): boolean {
        if (this.targetsCollected >= this.totalTargets && !this.isGameOver) {
            this.isWon = true;
            this.isGameOver = true;
            this.score += 1000;
            console.log("🏆 VÕIT! Oled edukalt läbinud mängu nr ${perm.gameNumber}!");
            return true;
        }
        return false;
    }
}`;

        const scene: PlayardAiScene = {
            id: perm.id,
            title: perm.title,
            description: perm.description,
            author: 'Playard AI Game Matrix (100,000+ Permutations)',
            createdAt: Date.now(),
            environment: {
                skyColor: biome.skyColor,
                lightColor: biome.lightColor,
                groundColor: biome.groundColor,
                fogDensity: biome.fogDensity,
                timeOfDay: biome.timeOfDay
            },
            playerConfig: {
                spawnPosition: [0, genre.spawnY, 26],
                speed: finalSpeed,
                jumpForce: finalJump,
                currency: 150,
                inventory: ['Põhivarustus', `${genre.name} Tööriist`, `${mutator.name} Kiip`]
            },
            rules: {
                objective: objective.description,
                winCondition: `${objective.winCondition} ja jõutud finišisse`,
                loseCondition: `Elud otsas (${hazard.name}) või kukkumine ohtlikku tsooni`,
                timerSeconds: 150
            },
            objects
        };

        (scene as any).isGame = true;
        (scene as any).isGame = true;
        (scene as any).gameNumber = perm.gameNumber;
        (scene as any).matrixScript = script;

        return scene;
    }

    /**
     * Checks if prompt requests a game matrix number, random game, or specific genre/biome combo.
     */
    public static isMatrixRequest(prompt: string): boolean {
        const lower = prompt.toLowerCase().trim();
        return (
            /mäng\s*(?:nr|number|#)\s*\d+|game\s*#\s*\d+|genereeri mäng\s*(?:nr|#)?\s*\d+|mängumaatriks|100\s*000\s*mäng|matrix\s*game|suvaline mäng|juhuslik mäng/i.test(lower) ||
            (/(?:küberpunk|matrix).*(?:mäng|parkuur)/i.test(lower))
        );
    }

    /**
     * Executes generation and notifies state/UI.
     */
    public static handleBuild(parsed: any, state: any, onUpdateBadges: () => void): any {
        const perm = parsed.parameters?.permutation || this.resolveFromPrompt(parsed.rawText);
        const scene = this.build3DScene(perm);
        state.setActiveScene(scene);
        onUpdateBadges();
        return state.addAiMessage(
            `🎲 **Playard Mängumaatriks (100 000+ Permutatsiooni):**\n` +
            `Loodud mäng nr **#${perm.gameNumber}** – **${perm.title}**!\n\n` +
            `• **Žanr:** ${perm.genre.name} (${perm.genre.icon})\n` +
            `• **Keskkond:** ${perm.biome.name}\n` +
            `• **Eesmärk:** ${perm.objective.description}\n` +
            `• **Oht:** ${perm.hazard.name} (Kahjustus: ${perm.hazard.damage} HP)\n` +
            `• **Mutator:** ${perm.mutator.name} (${perm.mutator.ruleDescription})\n\n` +
            `🎮 *Mäng on valmis! Klõpsa ülal "🎮 Testi mängu" selle käivitamiseks.*`,
            { codeSnippet: (scene as any).matrixScript }
        );
    }
}
