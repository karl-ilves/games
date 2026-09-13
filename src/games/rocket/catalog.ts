import * as THREE from 'three';
import { RocketType, BuildingConfig } from './types';

// 54 DISTINCT ROCKET TYPES (8 Tiers / Categories)
export const ROCKET_CATALOG: RocketType[] = [
    // --- 1. TACTICAL & BALLISTIC (1 - 7) ---
    { id: 'red_dart', name: 'Red Dart', icon: '🔴', desc: 'Klassikaline kiire arkaad-rakett kineetilise laenguga.', speed: 90, color: 0xff4757, trailColor: 0xffa502, price: 0, scoreMultiplier: 1.0, blastRadius: 8.5, category: 'tactical' },
    { id: 'steel_falcon', name: 'Steel Falcon', icon: '🦅', desc: 'Terasest aerodünaamiline nool kiireks tabamiseks.', speed: 105, color: 0x94a3b8, trailColor: 0xffd32a, price: 250, scoreMultiplier: 1.1, blastRadius: 9.5, category: 'tactical' },
    { id: 'viper_strike', name: 'Viper Strike', icon: '🐍', desc: 'Salakaval madalalenduv tiibrakett stabiilse lennujoonega.', speed: 115, color: 0x2ed573, trailColor: 0x7bed9f, price: 400, scoreMultiplier: 1.15, blastRadius: 10.0, category: 'tactical' },
    { id: 'cobra_ap', name: 'Cobra AP', icon: '🎯', desc: 'Soomustläbistav volframtipp tugevdatud betoonile.', speed: 125, color: 0xe056fd, trailColor: 0xbe2edd, price: 600, scoreMultiplier: 1.2, blastRadius: 10.5, category: 'tactical' },
    { id: 'stryker_x', name: 'Stryker X', icon: '⚡', desc: 'Topeltkiirendiga taktikalise rünnaku rakett.', speed: 135, color: 0xfffa65, trailColor: 0xff9f1a, price: 800, scoreMultiplier: 1.25, blastRadius: 11.0, category: 'tactical' },
    { id: 'hawk_eye', name: 'Hawk Eye', icon: '👁️', desc: 'Optilise korrigeerimisega suure täpsusega mürsk.', speed: 140, color: 0x17c0eb, trailColor: 0x18dcff, price: 1000, scoreMultiplier: 1.3, blastRadius: 11.5, category: 'tactical' },
    { id: 'thunderhead', name: 'Thunderhead', icon: '🌩️', desc: 'Raske sepistatud koonusega kineetiline hävitaja.', speed: 145, color: 0x7158e2, trailColor: 0x3d3d3d, price: 1250, scoreMultiplier: 1.35, blastRadius: 12.0, category: 'tactical' },

    // --- 2. INCENDIARY & FIRESTORM (8 - 14) (Maja süütamine & põlemine) ---
    { id: 'pyro_flare', name: 'Pyro Flare', icon: '🔥', desc: 'Süütab hooned koheselt põlema ja levitab leeke.', speed: 100, color: 0xff6348, trailColor: 0xff7f50, price: 700, scoreMultiplier: 1.3, blastRadius: 11.5, category: 'incendiary' },
    { id: 'napalm_stinger', name: 'Napalm Stinger', icon: '🧪', desc: 'Kleepuva vedelkütusega laeng, mis tekitab tugeva tulemöllu.', speed: 115, color: 0xff4757, trailColor: 0xff6b81, price: 950, scoreMultiplier: 1.4, blastRadius: 13.0, category: 'incendiary' },
    { id: 'magma_core', name: 'Magma Core', icon: '🌋', desc: 'Vedela laava kuumusega rakett, mis sulatab seinu.', speed: 125, color: 0xff3838, trailColor: 0xff9f1a, price: 1200, scoreMultiplier: 1.45, blastRadius: 14.0, category: 'incendiary' },
    { id: 'firestorm_hydra', name: 'Firestorm Hydra', icon: '🐉', desc: 'Hiiglaslik leegitormi külvaja laia süütealaga.', speed: 130, color: 0xff9f1a, trailColor: 0xff3838, price: 1500, scoreMultiplier: 1.5, blastRadius: 15.0, category: 'incendiary' },
    { id: 'blazing_phoenix', name: 'Blazing Phoenix', icon: '🦅', desc: 'Leekiv fööniks, mis tõstab põlemistemperatuuri maksimumini.', speed: 145, color: 0xff5252, trailColor: 0xffb142, price: 1850, scoreMultiplier: 1.6, blastRadius: 16.0, category: 'incendiary' },
    { id: 'solar_flare', name: 'Solar Flare', icon: '☀️', desc: 'Päikese pinnakuuma plasmaga termiline hävitaja.', speed: 150, color: 0xffda79, trailColor: 0xff5252, price: 2200, scoreMultiplier: 1.7, blastRadius: 17.0, category: 'incendiary' },
    { id: 'thermite_sledge', name: 'Thermite Sledge', icon: '🔨', desc: 'Termiitvasar, mis põletab läbi betooni ja terase.', speed: 160, color: 0xff793f, trailColor: 0xfffa65, price: 2600, scoreMultiplier: 1.8, blastRadius: 18.0, category: 'incendiary' },

    // --- 3. DEMOLITION & BUNKER BUSTERS (15 - 21) (Maja tükkideks lendamine) ---
    { id: 'ground_shaker', name: 'Ground Shaker', icon: '💥', desc: 'Seismiline lööklaine, mis purustab hoonete vundamendi.', speed: 110, color: 0x8395a7, trailColor: 0x576574, price: 900, scoreMultiplier: 1.35, blastRadius: 14.0, category: 'demolition' },
    { id: 'titan_breaker', name: 'Titan Breaker', icon: '🛡️', desc: 'Topeltlaenguga pilvelõhkuja murdja.', speed: 125, color: 0x576574, trailColor: 0x222f3e, price: 1300, scoreMultiplier: 1.45, blastRadius: 16.0, category: 'demolition' },
    { id: 'mega_smasher', name: 'Mega Smasher', icon: '🔨', desc: 'Massiivne plahvatusjõud paiskab maja tükkideks taevasse.', speed: 135, color: 0xc8d6e5, trailColor: 0x8395a7, price: 1700, scoreMultiplier: 1.55, blastRadius: 17.5, category: 'demolition' },
    { id: 'concrete_crusher', name: 'Concrete Crusher', icon: '🏗️', desc: 'Purustab terved kiviseinad sekundiga tolmuks.', speed: 140, color: 0x54a0ff, trailColor: 0x2e86de, price: 2100, scoreMultiplier: 1.65, blastRadius: 18.5, category: 'demolition' },
    { id: 'earth_rupture', name: 'Earth Rupture', icon: '🌍', desc: 'Lõhestab pinnase hoone all ja tekitab hiiglasliku kraatri.', speed: 150, color: 0xee5253, trailColor: 0x10ac84, price: 2600, scoreMultiplier: 1.75, blastRadius: 20.0, category: 'demolition' },
    { id: 'siege_master', name: 'Siege Master', icon: '🏰', desc: 'Sõjaline kindlusehävitaja hävitava löökvõimsusega.', speed: 160, color: 0x1dd1a1, trailColor: 0x10ac84, price: 3100, scoreMultiplier: 1.85, blastRadius: 21.0, category: 'demolition' },
    { id: 'colossus_hammer', name: 'Colossus Hammer', icon: '⚒️', desc: 'Kolossaalne vasar – garanteerib hoone täieliku lammutuse.', speed: 170, color: 0xff9f43, trailColor: 0xee5253, price: 3700, scoreMultiplier: 2.0, blastRadius: 23.0, category: 'demolition' },

    // --- 4. PLASMA & HIGH-ENERGY (22 - 28) ---
    { id: 'neon_turbo', name: 'Neon Turbo', icon: '⚡', desc: 'Tsüaan-plasma laeng ülikiire lennukiirusega.', speed: 125, color: 0x00f2fe, trailColor: 0x4facfe, price: 500, scoreMultiplier: 1.25, blastRadius: 13.0, category: 'plasma' },
    { id: 'blue_ion_pulse', name: 'Blue Ion Pulse', icon: '💠', desc: 'Kõrgsageduslik ioonrakett puhta sinise sähvatusega.', speed: 135, color: 0x0abde3, trailColor: 0x48dbfb, price: 850, scoreMultiplier: 1.4, blastRadius: 14.5, category: 'plasma' },
    { id: 'cyan_lightning', name: 'Cyan Lightning', icon: '⚡', desc: 'Elektromagnetiline välgulöök suure sähvatusega.', speed: 145, color: 0x00d2d3, trailColor: 0x01a3a4, price: 1250, scoreMultiplier: 1.5, blastRadius: 15.5, category: 'plasma' },
    { id: 'emerald_surge', name: 'Emerald Surge', icon: '❇️', desc: 'Smaragdroheline plasmaimpulss võimsa survelainega.', speed: 155, color: 0x10ac84, trailColor: 0x1dd1a1, price: 1700, scoreMultiplier: 1.6, blastRadius: 16.5, category: 'plasma' },
    { id: 'violet_ray', name: 'Violet Ray', icon: '🔮', desc: 'Violetne energiavoog, mis aurustab sihtmärgi materjali.', speed: 165, color: 0x5f27cd, trailColor: 0x341f97, price: 2200, scoreMultiplier: 1.7, blastRadius: 17.5, category: 'plasma' },
    { id: 'crimson_pulsar', name: 'Crimson Pulsar', icon: '🔴', desc: 'Veripunane ülelaetud pulsarrakett kiire löögiga.', speed: 175, color: 0xff3838, trailColor: 0xff4d4d, price: 2800, scoreMultiplier: 1.8, blastRadius: 19.0, category: 'plasma' },
    { id: 'quantum_ionizer', name: 'Quantum Ionizer', icon: '🌀', desc: 'Aatomeid laiali rebiv kvant-ionisatsioon.', speed: 185, color: 0x48dbfb, trailColor: 0x5f27cd, price: 3500, scoreMultiplier: 2.0, blastRadius: 21.0, category: 'plasma' },

    // --- 5. CLUSTER & MULTI-BURST (29 - 35) ---
    { id: 'micro_cluster', name: 'Micro Cluster', icon: '💣', desc: 'Jaguneb enne tabamist mitmeks sekundaarseks lõhkepaketiks.', speed: 115, color: 0x6c5ce7, trailColor: 0xa29bfe, price: 1100, scoreMultiplier: 1.4, blastRadius: 14.5, category: 'cluster' },
    { id: 'shrapnel_storm', name: 'Shrapnel Storm', icon: '🌪️', desc: 'Tuhanded teraslaastud lendavad hoone seintesse.', speed: 125, color: 0x636e72, trailColor: 0xb2bec3, price: 1500, scoreMultiplier: 1.5, blastRadius: 16.0, category: 'cluster' },
    { id: 'hive_swarm', name: 'Hive Swarm', icon: '🐝', desc: 'Terve sülem minirakette katab hoone plahvatustega.', speed: 135, color: 0xfdcb6e, trailColor: 0xe17055, price: 2000, scoreMultiplier: 1.6, blastRadius: 17.5, category: 'cluster' },
    { id: 'carpet_striker', name: 'Carpet Striker', icon: '🎯', desc: 'Vaipkobar rida purustusi kogu kvartalile.', speed: 145, color: 0xd63031, trailColor: 0xff7675, price: 2600, scoreMultiplier: 1.75, blastRadius: 19.0, category: 'cluster' },
    { id: 'rainmaker', name: 'Rainmaker', icon: '🌧️', desc: 'Taevast langev tulevihm hävitab katuse ja laed.', speed: 155, color: 0x0984e3, trailColor: 0x74b9ff, price: 3200, scoreMultiplier: 1.9, blastRadius: 20.5, category: 'cluster' },
    { id: 'nova_scatter', name: 'Nova Scatter', icon: '✨', desc: 'Radiaalselt paiskuvad plahvatustuumad.', speed: 165, color: 0xfd79a8, trailColor: 0xe84393, price: 3900, scoreMultiplier: 2.1, blastRadius: 22.0, category: 'cluster' },
    { id: 'apocalypse_cluster', name: 'Apocalypse Cluster', icon: '💀', desc: 'Katastroofiline kobarmürsk linna lammutamiseks.', speed: 180, color: 0x2d3436, trailColor: 0xd63031, price: 4800, scoreMultiplier: 2.4, blastRadius: 24.5, category: 'cluster' },

    // --- 6. COSMIC & RAINBOW (36 - 42) ---
    { id: 'rainbow_comet', name: 'Rainbow Comet', icon: '🌈', desc: 'Vikerkaare sädemetega komeetrakett +50% boonusega.', speed: 135, color: 0xff6b81, trailColor: 0x2ed573, price: 1200, scoreMultiplier: 1.5, blastRadius: 15.0, category: 'cosmic' },
    { id: 'prism_nova', name: 'Prism Nova', icon: '💎', desc: 'Kristallne valguse murdumine pimestava värvimölluga.', speed: 145, color: 0x70a1ff, trailColor: 0x2ed573, price: 1800, scoreMultiplier: 1.65, blastRadius: 16.5, category: 'cosmic' },
    { id: 'starlight_dream', name: 'Starlight Dream', icon: '⭐', desc: 'Tähetolm ja sädelevad kosmilised osakesed.', speed: 155, color: 0xeccc68, trailColor: 0xff6b81, price: 2400, scoreMultiplier: 1.8, blastRadius: 18.0, category: 'cosmic' },
    { id: 'aurora_borealis', name: 'Aurora Borealis', icon: '🌌', desc: 'Põhjavalguse helkiv ja lainetav taevaplahvatus.', speed: 165, color: 0x7bed9f, trailColor: 0x70a1ff, price: 3100, scoreMultiplier: 1.95, blastRadius: 19.5, category: 'cosmic' },
    { id: 'hyper_prism', name: 'Hyper Prism', icon: '🔷', desc: 'Kõrgenergeetiline vikerkaaresfäär.', speed: 175, color: 0x2ed573, trailColor: 0xff4757, price: 3900, scoreMultiplier: 2.15, blastRadius: 21.0, category: 'cosmic' },
    { id: 'nebula_mirage', name: 'Nebula Mirage', icon: '🪐', desc: 'Süvakosmose udukogu värvikas gaasipilv.', speed: 185, color: 0x5352ed, trailColor: 0xff78c4, price: 4800, scoreMultiplier: 2.35, blastRadius: 23.0, category: 'cosmic' },
    { id: 'cosmic_dreamer', name: 'Cosmic Dreamer', icon: '🛸', desc: 'Ekstragalaktiline lõhkekeha suurejoonelise plahvatusega.', speed: 200, color: 0xff78c4, trailColor: 0xeccc68, price: 5800, scoreMultiplier: 2.6, blastRadius: 25.0, category: 'cosmic' },

    // --- 7. THERMOBARIC & VACUUM (43 - 48) ---
    { id: 'fuel_air_blast', name: 'Fuel-Air Blast', icon: '💨', desc: 'Pihustab õhku kütusepilve ja süütab selle hiiglaslikuks rõhulaineks.', speed: 130, color: 0xf39c12, trailColor: 0xd35400, price: 2200, scoreMultiplier: 1.7, blastRadius: 18.5, category: 'thermobaric' },
    { id: 'aerosol_destroyer', name: 'Aerosol Destroyer', icon: '☁️', desc: 'Imab õhu hoonest välja ja varistab siseseinad.', speed: 140, color: 0xe67e22, trailColor: 0xc0392b, price: 2900, scoreMultiplier: 1.9, blastRadius: 20.5, category: 'thermobaric' },
    { id: 'vacuum_annihilator', name: 'Vacuum Annihilator', icon: '🕳️', desc: 'Vaakumimplosioon, millele järgneb massiivne väljapaiskamine.', speed: 155, color: 0x34495e, trailColor: 0xe74c3c, price: 3700, scoreMultiplier: 2.1, blastRadius: 22.5, category: 'thermobaric' },
    { id: 'atmospheric_ripper', name: 'Atmospheric Ripper', icon: '🌪️', desc: 'Lõikab atmosfääri ja tekitab hüperhelirõhu seina.', speed: 170, color: 0x9b59b6, trailColor: 0x8e44ad, price: 4600, scoreMultiplier: 2.3, blastRadius: 24.5, category: 'thermobaric' },
    { id: 'vortex_oblivion', name: 'Vortex Oblivion', icon: '🌀', desc: 'Pöörlev tulekeeris purustab hoone konstruktsiooni.', speed: 185, color: 0x1abc9c, trailColor: 0x16a085, price: 5600, scoreMultiplier: 2.5, blastRadius: 26.5, category: 'thermobaric' },
    { id: 'super_thermobaric', name: 'Super Thermobaric', icon: '🌋', desc: 'Raskeim termobaariline pomm – pühib terved kvartalid.', speed: 205, color: 0xc0392b, trailColor: 0xf1c40f, price: 6800, scoreMultiplier: 2.8, blastRadius: 29.0, category: 'thermobaric' },

    // --- 8. MYTHIC, ATOMIC & SINGULARITY (49 - 54) ---
    { id: 'quantum_starfire', name: 'Quantum Starfire', icon: '🌟', desc: 'Kuldne supernoova rakett 2.0x topeltpunktidega!', speed: 175, color: 0xffd32a, trailColor: 0xff9f1a, price: 2500, scoreMultiplier: 2.0, blastRadius: 22.0, category: 'singularity' },
    { id: 'uranium_buster', name: 'Uranium Buster', icon: '☢️', desc: 'Rikastatud uraanilaeng – mürgine roheline tulekera.', speed: 190, color: 0x2ecc71, trailColor: 0x27ae60, price: 4200, scoreMultiplier: 2.5, blastRadius: 25.5, category: 'singularity' },
    { id: 'atomic_dawn', name: 'Atomic Dawn', icon: '☣️', desc: 'Taktikaline aatomlõhkepea miniatuurse seenepilvega.', speed: 205, color: 0xf1c40f, trailColor: 0xe67e22, price: 6000, scoreMultiplier: 3.0, blastRadius: 28.0, category: 'singularity' },
    { id: 'supernova_titan', name: 'Supernova Titan', icon: '☀️', desc: 'Kollapsiva tähe plahvatusjõud – hiiglaslik tulemöll.', speed: 215, color: 0xff7675, trailColor: 0xd63031, price: 8000, scoreMultiplier: 3.5, blastRadius: 30.5, category: 'singularity' },
    { id: 'antimatter_core', name: 'Antimatter Core', icon: '⚡', desc: 'Puhas antiaine hävitus, mis muudab aine puhtaks energiaks.', speed: 225, color: 0x6c5ce7, trailColor: 0x00cec9, price: 10500, scoreMultiplier: 4.0, blastRadius: 33.0, category: 'singularity' },
    { id: 'dark_matter_singularity', name: 'Dark Matter Singularity', icon: '🕳️', desc: 'Musta augu gravitatsiooniline kollaps ja ülim 5.0x punktisadu!', speed: 240, color: 0x2d3436, trailColor: 0x6c5ce7, price: 14000, scoreMultiplier: 5.0, blastRadius: 36.0, category: 'singularity' }
];

export const BUILDING_CONFIGS: BuildingConfig[] = [
    { id: 'b_central_tower', name: '🏢 Sky Office Tower', pos: new THREE.Vector3(0, 0, 0), w: 22, h: 30, d: 22, color: 0x1e2a4a, roofColor: 0x00f2fe, pts: 650, hp: 2 },
    { id: 'b_north_corp', name: '🏙️ North Corporate HQ', pos: new THREE.Vector3(-45, 0, -45), w: 20, h: 25, d: 20, color: 0x241d38, roofColor: 0xff4757, pts: 550, hp: 2 },
    { id: 'b_east_complex', name: '🏬 Commercial Mall', pos: new THREE.Vector3(50, 0, -35), w: 24, h: 18, d: 22, color: 0x1a2e3b, roofColor: 0xffd32a, pts: 500, hp: 1 },
    { id: 'b_south_hotel', name: '🏨 Grand Plaza Hotel', pos: new THREE.Vector3(45, 0, 45), w: 22, h: 24, d: 24, color: 0x2e1b27, roofColor: 0x2ed573, pts: 550, hp: 2 },
    { id: 'b_west_factory', name: '🏭 Industrial Powerplant', pos: new THREE.Vector3(-50, 0, 35), w: 26, h: 16, d: 24, color: 0x2b261b, roofColor: 0xff9f1a, pts: 450, hp: 1 },
    { id: 'b_suburb_villa_1', name: '🏡 Urban Villa Alpha', pos: new THREE.Vector3(-25, 0, 60), w: 16, h: 12, d: 16, color: 0x1d2938, roofColor: 0x00f2fe, pts: 350, hp: 1 },
    { id: 'b_suburb_villa_2', name: '🏘️ City Apartments', pos: new THREE.Vector3(25, 0, 60), w: 18, h: 15, d: 16, color: 0x301c2c, roofColor: 0xff4757, pts: 400, hp: 1 },
    { id: 'b_warehouse_north', name: '📦 Logistics Terminal', pos: new THREE.Vector3(15, 0, -65), w: 24, h: 13, d: 18, color: 0x192d35, roofColor: 0xffd32a, pts: 380, hp: 1 },
    { id: 'b_bank_tower', name: '🏦 National Vault Tower', pos: new THREE.Vector3(-25, 0, -25), w: 18, h: 22, d: 18, color: 0x251c33, roofColor: 0x9b59b6, pts: 500, hp: 2 },
    { id: 'b_tech_lab', name: '🔬 Quantum Tech Lab', pos: new THREE.Vector3(25, 0, -10), w: 18, h: 16, d: 20, color: 0x152c38, roofColor: 0x00f2fe, pts: 450, hp: 1 },
    { id: 'b_radio_station', name: '📡 Broadcast Tower', pos: new THREE.Vector3(-60, 0, -10), w: 16, h: 28, d: 16, color: 0x1b2836, roofColor: 0xff4757, pts: 600, hp: 2 },
    { id: 'b_port_hangar', name: '🚢 Harbor Warehouse', pos: new THREE.Vector3(60, 0, 10), w: 26, h: 14, d: 20, color: 0x2a241e, roofColor: 0x2ed573, pts: 400, hp: 1 }
];
