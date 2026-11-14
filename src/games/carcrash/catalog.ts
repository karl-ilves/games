import { VehicleConfig } from './types';

export const VEHICLE_CATALOG: VehicleConfig[] = [
    {
        id: 'muscle_v8',
        name: 'Thunder V8 Muscle',
        category: 'Muscle',
        description: 'Klassikaline tagaveoline Ameerika muskelauto. Raske terasraam, ülikiire paigaltvõtt ja võimas kiirendus kuni 100 km/h.',
        icon: '🏎️',
        massKg: 1750,
        enginePower: 700,
        topSpeedKmh: 100,
        brakeForce: 32,
        steerSpeed: 2.4,
        stiffness: 0.85,
        primaryColor: 0xe74c3c, // Punane
        secondaryColor: 0x111111,
        dimensions: { length: 4.8, width: 2.0, height: 1.35 }
    },
    {
        id: 'supercar_gt',
        name: 'Apex GT Hypercar',
        category: 'Supercar',
        description: 'Süsinikkiust ülikerge hüperauto. Terav juhitavus, välkkiire 100 km/h saavutamine ja katastroofiline kildudeks purunemine.',
        icon: '⚡',
        massKg: 1250,
        enginePower: 980,
        topSpeedKmh: 100,
        brakeForce: 38,
        steerSpeed: 3.0,
        stiffness: 0.55,
        primaryColor: 0x00f2fe, // Elektrisinine
        secondaryColor: 0x1e272e,
        dimensions: { length: 4.6, width: 2.05, height: 1.15 }
    },
    {
        id: 'armored_truck',
        name: 'Goliath 4x4 Heavy Truck',
        category: 'Truck',
        description: 'Tugevdatud raamiga massiivne maastur ja purustaja. Jõuline vedu kuni 100 km/h ja murrab läbi betoonseinte.',
        icon: '🛻',
        massKg: 2800,
        enginePower: 620,
        topSpeedKmh: 100,
        brakeForce: 28,
        steerSpeed: 1.9,
        stiffness: 1.4,
        primaryColor: 0x27ae60, // Sõjaväeroheline
        secondaryColor: 0x2c3e50,
        dimensions: { length: 5.2, width: 2.2, height: 1.9 }
    },
    {
        id: 'compact_hatch',
        name: 'Pico Hatchback',
        category: 'Compact',
        description: 'Kerge plekk-kerega linnaauto. Nobe kiirendus kuni 100 km/h – iga suurem löök voltib kere akordioniks kokku!',
        icon: '🚙',
        massKg: 950,
        enginePower: 320,
        topSpeedKmh: 100,
        brakeForce: 25,
        steerSpeed: 2.6,
        stiffness: 0.35,
        primaryColor: 0xf1c40f, // Kollane
        secondaryColor: 0x333333,
        dimensions: { length: 3.6, width: 1.7, height: 1.45 }
    },
    {
        id: 'police_interceptor',
        name: 'Highway Police Cruiser',
        category: 'Sedan',
        description: 'Võmmi tagaajamisauto vilkurite ja tugevdatud esirammiga (push-bar). Kiire sööst kuni 100 km/h.',
        icon: '🚓',
        massKg: 1900,
        enginePower: 600,
        topSpeedKmh: 100,
        brakeForce: 34,
        steerSpeed: 2.4,
        stiffness: 1.05,
        primaryColor: 0x0a1118, // Must-valge
        secondaryColor: 0xffffff,
        dimensions: { length: 5.0, width: 1.95, height: 1.45 }
    },
    {
        id: 'tesla_roadster',
        name: 'Tesla Roadcoaster (SpaceX Thruster)',
        category: 'Supercar',
        description: 'Elektriline hüperauto SpaceX külmgaasi rakettmootoritega. Tühikuga lendab taevasse, Shift annab rakett-boosti ja õhus juhitav lennukina!',
        icon: '🚀',
        massKg: 1300,
        enginePower: 1250,
        topSpeedKmh: 100,
        brakeForce: 42,
        steerSpeed: 3.2,
        stiffness: 0.65,
        primaryColor: 0xe84118, // Tesla Midnight Cherry Red
        secondaryColor: 0x1e272e,
        dimensions: { length: 4.5, width: 2.0, height: 1.15 },
        hasThrusters: true
    }
];
