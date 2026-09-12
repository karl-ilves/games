import * as THREE from 'three';
import { JunctionState, Station, TrainDef } from '../types';

export const TRAIN_STATIONS: Station[] = [
    {
        id: 'central',
        name: 'Kesklinna Peajaam',
        nameEn: 'Central Grand Station',
        description: 'Suur maapealne reisijate peajaam kellatorni ja reisijate perrooniga',
        descriptionEn: 'Grand surface central terminal with iconic clock tower and long platforms',
        trackU: 0.04,
        worldPos: new THREE.Vector3(0, 0, 0),
        passengersWaiting: 28,
        moneyReward: 50
    },
    {
        id: 'forest',
        name: 'Männimetsa Peatus',
        nameEn: 'Pine Forest Station',
        description: 'Metsa vahel asuv puidust reisijate ooteplatvorm',
        descriptionEn: 'Scenic wooden station platform surrounded by lush pine trees',
        trackU: 0.35,
        worldPos: new THREE.Vector3(0, 0, 0),
        passengersWaiting: 18,
        moneyReward: 50
    },
    {
        id: 'harbor',
        name: 'Jõekalda Sadam',
        nameEn: 'Riverside Harbor Station',
        description: 'Kaubasadam ja reisijate terminal jõe kaldal',
        descriptionEn: 'Freight dock and scenic passenger terminal on river bank',
        trackU: 0.65,
        worldPos: new THREE.Vector3(0, 0, 0),
        passengersWaiting: 24,
        moneyReward: 50
    },
    {
        id: 'mountain',
        name: 'Mäejaam Lumetipp',
        nameEn: 'Snow Peak Mountain Station',
        description: 'Kõrgel mäeküljel asuv alpi stiilis lõppjaam',
        descriptionEn: 'Alpine terminal located on scenic mountain ridge',
        trackU: 0.90,
        worldPos: new THREE.Vector3(0, 0, 0),
        passengersWaiting: 20,
        moneyReward: 50
    }
];

export const METRO_STATIONS: Station[] = [
    {
        id: 'metro_central',
        name: 'Kesklinna Maa-alune Metroojaam',
        nameEn: 'Downtown Underground Subway Station',
        description: 'Kaasaegne maa-alune metroojaam marmorperrooni ja LED ekraanidega',
        descriptionEn: 'Modern subterranean subway station with marble platforms and LED displays',
        trackU: 0.04,
        worldPos: new THREE.Vector3(0, 0, 0),
        passengersWaiting: 45,
        moneyReward: 50
    },
    {
        id: 'metro_tech',
        name: 'Teaduspargi Tunnelijaam',
        nameEn: 'Tech Park Tube Station',
        description: 'Kõrgtehnoloogiline maa-alune metroojaam klaasuste ja neoonvalgusega',
        descriptionEn: 'High-tech subterranean tube station with glass safety doors and neon glow',
        trackU: 0.35,
        worldPos: new THREE.Vector3(0, 0, 0),
        passengersWaiting: 38,
        moneyReward: 50
    },
    {
        id: 'metro_harbor',
        name: 'Sadama Maa-alune Terminal',
        nameEn: 'Harbor Subway Terminal',
        description: 'Sügavale kaljusse rajatud metroojaam mereäärse ühendusega',
        descriptionEn: 'Deep-rock subterranean station connecting to harbor terminal',
        trackU: 0.65,
        worldPos: new THREE.Vector3(0, 0, 0),
        passengersWaiting: 50,
        moneyReward: 50
    },
    {
        id: 'metro_airport',
        name: 'Lennujaama Metrooliini Lõppjaam',
        nameEn: 'Airport Express Underground Terminal',
        description: 'Maa-alune kiirliini jaam automaatsete eskalaatorite ja kiirrongidega',
        descriptionEn: 'Underground express subway hub with escalators and fast transit links',
        trackU: 0.90,
        worldPos: new THREE.Vector3(0, 0, 0),
        passengersWaiting: 60,
        moneyReward: 50
    }
];

export function getActiveStations(activeTrain?: TrainDef | null): Station[] {
    return activeTrain && activeTrain.category === 'metro' ? METRO_STATIONS : TRAIN_STATIONS;
}

export const JUNCTION: JunctionState = {
    activeBranch: 'main',
    inJunctionZone: false,
    junctionStartU: 0.72,
    junctionEndU: 0.82,
    switchU: 0.75
};

export function createMainTrackCurve(): THREE.CatmullRomCurve3 {
    const mainPoints = [
        new THREE.Vector3(0, 0, 0),          // Kesklinna Peajaam
        new THREE.Vector3(260, 0, 80),
        new THREE.Vector3(560, 0, 260),
        new THREE.Vector3(720, 0, 560),      // Idakaare lai kurv
        new THREE.Vector3(620, 0, 880),      // Männimetsa Peatus
        new THREE.Vector3(380, 0, 1060),     // Jõeületus
        new THREE.Vector3(0, 0, 980),
        new THREE.Vector3(-380, 0, 1020),    // Jõekalda Sadam
        new THREE.Vector3(-680, 0, 800),     // Läänekaare oruring
        new THREE.Vector3(-760, 0, 420),     // Pööre mäeringile
        new THREE.Vector3(-600, 0, 80),      // Mäejaam / Lumetipp
        new THREE.Vector3(-300, 0, -80),     // Põhjasuund tagasi peajaama
    ];

    return new THREE.CatmullRomCurve3(mainPoints, true, 'centripetal', 0.2);
}

export function createMountainTrackCurve(): THREE.CatmullRomCurve3 {
    const mountainPoints = [
        new THREE.Vector3(-760, 0, 420),
        new THREE.Vector3(-880, 0, 300),
        new THREE.Vector3(-820, 0, -40),
        new THREE.Vector3(-550, 0, -120),
        new THREE.Vector3(-300, 0, -80),
    ];
    return new THREE.CatmullRomCurve3(mountainPoints, false, 'centripetal', 0.2);
}
