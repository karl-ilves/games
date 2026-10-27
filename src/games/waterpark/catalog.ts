import { ParkAttractionDef } from './types';

export const PARK_ATTRACTIONS_CATALOG: ParkAttractionDef[] = [
    // --- KATEGOORIA: BASSEINID (POOLS) ---
    {
        id: 'kids_pool',
        name: 'Kids Bassein (Lastebassein)',
        category: 'pools',
        cost: 200,
        description: 'Madal ja ohutu bassein lastele ja pisikestele suplejatele.',
        icon: '👶',
        color: 0x38bdf8,
        dimensions: { x: 16, y: 1.6, z: 16 }
    },
    {
        id: 'deep_pool',
        name: 'Sügav Bassein',
        category: 'pools',
        cost: 500,
        description: 'Sügav bassein sukeldumiseks ja vettehüpeteks.',
        icon: '🏊‍♂️',
        color: 0x0984e3,
        dimensions: { x: 28, y: 7.0, z: 28 }
    },
    {
        id: 'long_pool',
        name: 'Pikk Bassein',
        category: 'pools',
        cost: 450,
        description: 'Pikk ujumisrada ja voolav bassein ujumiseks.',
        icon: '🌊',
        color: 0x00cec9,
        dimensions: { x: 16, y: 3.0, z: 56 }
    },

    // --- KATEGOORIA: VEETORUD (TUBES) - PEAMINE ---
    {
        id: 'tower_segment',
        name: 'Treppidega Torn (Toru platvorm)',
        category: 'tubes',
        subCategory: 'main',
        cost: 250,
        description: 'Torn kust saab treppidest üles minna toru juurde. Saab panna maha või teise peale kuni 6 tükki!',
        icon: '🗼',
        color: 0xe17055,
        dimensions: { x: 8, y: 7.0, z: 8 },
        isTower: true
    },

    // --- KATEGOORIA: VEETORUD - LASTE VEETORUD (SUB-KATEGOORIA) ---
    {
        id: 'pipe_start',
        name: 'Toru Start (Algusplatvorm)',
        category: 'tubes',
        subCategory: 'kids_tubes',
        cost: 150,
        description: 'Veetoru algus. Saab panna AINULT torni külge!',
        icon: '🚪',
        color: 0x00b894,
        dimensions: { x: 6, y: 4, z: 7 },
        isSlideStart: true,
        isKidsSlide: true
    },
    {
        id: 'pipe_straight',
        name: 'Otse Veetoru',
        category: 'tubes',
        subCategory: 'kids_tubes',
        cost: 100,
        description: 'Sirge horisontaalne veetoru. Saab panna ainult stardi või teiste torude külge!',
        icon: '➖',
        color: 0x0984e3,
        dimensions: { x: 4, y: 4, z: 8 },
        isSlideSegment: true,
        isKidsSlide: true
    },
    {
        id: 'pipe_down20',
        name: 'Alla Veetoru (20°)',
        category: 'tubes',
        subCategory: 'kids_tubes',
        cost: 120,
        description: '20-kraadise langusega torusektsioon veeliu kiirendamiseks.',
        icon: '📉',
        color: 0x6c5ce7,
        dimensions: { x: 4, y: 5, z: 9 },
        isSlideSegment: true,
        isKidsSlide: true
    },
    {
        id: 'pipe_turn_right',
        name: 'Paremale Pööre Veetoru',
        category: 'tubes',
        subCategory: 'kids_tubes',
        cost: 130,
        description: '90-kraadine kurv paremale. Ühendub stardi või teiste torude otsa.',
        icon: '↪️',
        color: 0xfdcb6e,
        dimensions: { x: 8, y: 4, z: 8 },
        isSlideSegment: true,
        isKidsSlide: true
    },
    {
        id: 'pipe_turn_left',
        name: 'Vasakule Pööre Veetoru',
        category: 'tubes',
        subCategory: 'kids_tubes',
        cost: 130,
        description: '90-kraadine kurv vasakule. Ühendub stardi või teiste torude otsa.',
        icon: '↩️',
        color: 0xe84393,
        dimensions: { x: 8, y: 4, z: 8 },
        isSlideSegment: true,
        isKidsSlide: true
    }
];
