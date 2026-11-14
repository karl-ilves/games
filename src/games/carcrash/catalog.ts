import { VehicleConfig } from './types';

export const VEHICLE_CATALOG: VehicleConfig[] = [
    {
        id: 'muscle_v8',
        name: 'Thunder V8 Muscle',
        category: 'Muscle',
        description: 'Klassikaline tagaveoline Ameerika muskelauto. Raske terasraam, massiivne mootor ja jõhkrad kokkupõrked.',
        icon: '🏎️',
        massKg: 1750,
        enginePower: 450,
        topSpeedKmh: 240,
        brakeForce: 28,
        steerSpeed: 2.2,
        stiffness: 0.85,
        primaryColor: 0xe74c3c, // Punane
        secondaryColor: 0x111111,
        dimensions: { length: 4.8, width: 2.0, height: 1.35 }
    },
    {
        id: 'supercar_gt',
        name: 'Apex GT Hypercar',
        category: 'Supercar',
        description: 'Süsinikkiust ülikerge hüperauto. Ülikiire 320 km/h, terav juhitavus ja suurel kiirusel katastroofiline kildudeks purunemine.',
        icon: '⚡',
        massKg: 1250,
        enginePower: 720,
        topSpeedKmh: 320,
        brakeForce: 36,
        steerSpeed: 2.8,
        stiffness: 0.55,
        primaryColor: 0x00f2fe, // Elektrisinine
        secondaryColor: 0x1e272e,
        dimensions: { length: 4.6, width: 2.05, height: 1.15 }
    },
    {
        id: 'armored_truck',
        name: 'Goliath 4x4 Heavy Truck',
        category: 'Truck',
        description: 'Tugevdatud raamiga massiivne maastur ja purustaja. Murrab läbi betoonseinte ja lükkab takistused teelt.',
        icon: '🛻',
        massKg: 2800,
        enginePower: 380,
        topSpeedKmh: 175,
        brakeForce: 24,
        steerSpeed: 1.8,
        stiffness: 1.4,
        primaryColor: 0x27ae60, // Sõjaväeroheline
        secondaryColor: 0x2c3e50,
        dimensions: { length: 5.2, width: 2.2, height: 1.9 }
    },
    {
        id: 'compact_hatch',
        name: 'Pico Hatchback',
        category: 'Compact',
        description: 'Kerge plekk-kerega linnaauto. Iga väiksemgi löök mõlgib kere akordioniks kokku – ideaalne deformatsiooni katsetamiseks!',
        icon: '🚙',
        massKg: 950,
        enginePower: 110,
        topSpeedKmh: 160,
        brakeForce: 22,
        steerSpeed: 2.5,
        stiffness: 0.35,
        primaryColor: 0xf1c40f, // Kollane
        secondaryColor: 0x333333,
        dimensions: { length: 3.6, width: 1.7, height: 1.45 }
    },
    {
        id: 'police_interceptor',
        name: 'Highway Police Cruiser',
        category: 'Sedan',
        description: 'Võmmi tagaajamisauto vilkurite ja tugevdatud esirammiga (push-bar). Loodud suure kiirusega rammimiseks.',
        icon: '🚓',
        massKg: 1900,
        enginePower: 370,
        topSpeedKmh: 230,
        brakeForce: 30,
        steerSpeed: 2.3,
        stiffness: 1.05,
        primaryColor: 0x0a1118, // Must-valge
        secondaryColor: 0xffffff,
        dimensions: { length: 5.0, width: 1.95, height: 1.45 }
    }
];
