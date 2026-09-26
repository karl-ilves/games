export interface PlayardAiScene {
    id: string;
    title: string;
    description: string;
    author: string;
    createdAt: number;
    environment: {
        skyColor: number;
        lightColor: number;
        groundColor: number;
        fogDensity: number;
        timeOfDay: 'day' | 'night';
    };
    playerConfig: {
        spawnPosition: [number, number, number];
        speed: number;
        jumpForce: number;
        currency: number;
        inventory: string[];
    };
    rules: {
        objective: string;
        winCondition: string;
        loseCondition: string;
        timerSeconds?: number;
    };
    objects: Array<{
        id: string;
        name: string;
        type: 'box' | 'cylinder' | 'sphere' | 'plane' | 'tornado' | 'airplane' | 'building' | 'spawn' | 'coin' | 'npc';
        position: [number, number, number];
        rotation?: [number, number, number];
        scale: [number, number, number];
        color: number | string;
        gameItemType?: string;
        script?: string;
        isCollidable?: boolean;
        isHazard?: boolean;
        isSafeZone?: boolean;
        extra?: any;
    }>;
}

export class GameGenerator {
    /**
     * Generates a complete 3D game scene based on the requested theme/prompt.
     */
    public static generateGame(theme: string, customTitle?: string): PlayardAiScene {
        const id = 'game_' + Math.random().toString(36).substring(2, 9);

        switch (theme) {
            case 'tornado_escape':
                return this.createTornadoEscapeGame(id, customTitle || 'Tornaado Põgenemine');
            case 'flight_simulator':
                return this.createFlightSimulatorGame(id, customTitle || 'Lennusimulaator');
            case 'obby_adventure':
                return this.createObbyGame(id, customTitle || 'Playard Parkuur');
            default:
                return this.createAdventureGame(id, customTitle || 'Playard Seiklusmaailm');
        }
    }

    private static createTornadoEscapeGame(id: string, title: string): PlayardAiScene {
        return {
            id,
            title,
            description: 'Põgene läheneva hävitava tornaado eest ja jõua turvalisse varjendisse enne aja lõppu!',
            author: 'Playard AI',
            createdAt: Date.now(),
            environment: {
                skyColor: 0x4a5568, // dark stormy sky
                lightColor: 0x8da4c4,
                groundColor: 0x3d4a36,
                fogDensity: 0.015,
                timeOfDay: 'day'
            },
            playerConfig: {
                spawnPosition: [0, 1, 0],
                speed: 12,
                jumpForce: 10,
                currency: 50,
                inventory: ['Taskulamp', 'Esmaabikomplekt']
            },
            rules: {
                objective: 'Jõua 60 sekundi jooksul mäe otsas asuvasse betoonist punkrisse!',
                winCondition: 'player.position.distanceTo(shelter) < 4',
                loseCondition: 'timer <= 0 || player.collidesWith(tornado)',
                timerSeconds: 60
            },
            objects: [
                // Ground
                {
                    id: 'ground_1',
                    name: 'Tormine maapind',
                    type: 'plane',
                    position: [0, 0, 0],
                    scale: [120, 1, 120],
                    color: 0x33442a,
                    isCollidable: true
                },
                // Spawn marker
                {
                    id: 'spawn_marker',
                    name: 'Mängija alguspunkt (Spawn)',
                    type: 'spawn',
                    position: [0, 0.1, 0],
                    scale: [2.5, 0.2, 2.5],
                    color: 0x00ff88,
                    gameItemType: 'spawn',
                    script: 'emitParticle("sparkle", target.position)'
                },
                // Tornado
                {
                    id: 'tornado_hazard',
                    name: 'Hävitav Tornaado',
                    type: 'tornado',
                    position: [0, 0, -45],
                    scale: [6, 20, 6],
                    color: 0x111111,
                    isHazard: true,
                    gameItemType: 'hazard_tornado',
                    script: 'rotate(0, 0.15, 0); moveToward("player", 0.05)'
                },
                // Residential houses
                {
                    id: 'house_1',
                    name: 'Puidust elumaja',
                    type: 'building',
                    position: [-15, 3, -10],
                    scale: [6, 6, 8],
                    color: 0xa0522d,
                    isCollidable: true
                },
                {
                    id: 'house_2',
                    name: 'Tellismaja',
                    type: 'building',
                    position: [18, 3.5, -15],
                    scale: [7, 7, 7],
                    color: 0xb22222,
                    isCollidable: true
                },
                // Emergency shelter (safe zone)
                {
                    id: 'shelter_bunker',
                    name: 'Betoonist Tormivari / Bunker',
                    type: 'building',
                    position: [0, 2.5, 45],
                    scale: [8, 5, 8],
                    color: 0x556b2f,
                    isSafeZone: true,
                    gameItemType: 'safe_zone',
                    script: 'onTriggerEnter("player", winGame())'
                },
                // Collectible coin bonuses along the way
                {
                    id: 'coin_1',
                    name: 'Päästemünt',
                    type: 'coin',
                    position: [-5, 1, 15],
                    scale: [1, 1, 0.2],
                    color: 0xffd700,
                    gameItemType: 'collectible',
                    script: 'addPlayerCurrency(10); playSound("coin")'
                },
                {
                    id: 'coin_2',
                    name: 'Päästemünt 2',
                    type: 'coin',
                    position: [8, 1, 28],
                    scale: [1, 1, 0.2],
                    color: 0xffd700,
                    gameItemType: 'collectible',
                    script: 'addPlayerCurrency(10); playSound("coin")'
                }
            ]
        };
    }

    private static createFlightSimulatorGame(id: string, title: string): PlayardAiScene {
        return {
            id,
            title,
            description: 'Tõuse lennukiga õhku, navigeeri läbi taevalaotuse ja maandu turvaliselt teisele lennurajale.',
            author: 'Playard AI',
            createdAt: Date.now(),
            environment: {
                skyColor: 0x87ceeb,
                lightColor: 0xffffff,
                groundColor: 0x2e8b57,
                fogDensity: 0.005,
                timeOfDay: 'day'
            },
            playerConfig: {
                spawnPosition: [0, 1, 0],
                speed: 8,
                jumpForce: 8,
                currency: 100,
                inventory: ['Piloodiprillid', 'Lennukaart']
            },
            rules: {
                objective: 'Istu lennukisse, kiirenda stardirajal ja läbi taevased kontrollrõngad!',
                winCondition: 'ringsCollected >= 5',
                loseCondition: 'plane.altitude <= 0 && plane.speed > 50'
            },
            objects: [
                // Ground
                {
                    id: 'ground_flight',
                    name: 'Roheline lennuväli',
                    type: 'plane',
                    position: [0, 0, 0],
                    scale: [200, 1, 200],
                    color: 0x228b22,
                    isCollidable: true
                },
                // Runway
                {
                    id: 'runway_main',
                    name: 'Asfalteeritud stardirada',
                    type: 'box',
                    position: [0, 0.05, 0],
                    scale: [14, 0.1, 90],
                    color: 0x222222,
                    isCollidable: true
                },
                // Player spawn point
                {
                    id: 'flight_spawn',
                    name: 'Piloodi stardikoht (Spawn)',
                    type: 'spawn',
                    position: [0, 0.2, -35],
                    scale: [2, 0.2, 2],
                    color: 0x3b82f6,
                    gameItemType: 'spawn'
                },
                // Airplane
                {
                    id: 'airplane_model',
                    name: 'Playard Hawk Lennuk',
                    type: 'airplane',
                    position: [0, 1.2, -30],
                    scale: [4, 1.5, 6],
                    color: 0xff3b30,
                    gameItemType: 'vehicle_plane',
                    script: 'rotate(0, 0.02, 0); attachVehicleControls("player")'
                },
                // Hangar
                {
                    id: 'airport_hangar',
                    name: 'Lennukiangaar',
                    type: 'building',
                    position: [-16, 4, -20],
                    scale: [14, 8, 16],
                    color: 0x708090,
                    isCollidable: true
                },
                // Airport Tower
                {
                    id: 'control_tower',
                    name: 'Lennujuhtimistorn',
                    type: 'building',
                    position: [18, 9, -10],
                    scale: [5, 18, 5],
                    color: 0xe0e0e0,
                    isCollidable: true
                },
                // Target landing area
                {
                    id: 'landing_zone',
                    name: 'Maandumisala',
                    type: 'box',
                    position: [0, 0.05, 120],
                    scale: [16, 0.1, 50],
                    color: 0x10b981,
                    gameItemType: 'landing_pad',
                    script: 'onTriggerEnter("airplane", winGame())'
                }
            ]
        };
    }

    private static createObbyGame(id: string, title: string): PlayardAiScene {
        return {
            id,
            title,
            description: 'Hüppa üle ohtlike laavaplatside ja ületa kõik kontrollpunktid finišisse jõudmiseks.',
            author: 'Playard AI',
            createdAt: Date.now(),
            environment: {
                skyColor: 0x1e1b4b,
                lightColor: 0xa855f7,
                groundColor: 0x0f172a,
                fogDensity: 0.01,
                timeOfDay: 'night'
            },
            playerConfig: {
                spawnPosition: [0, 1, 0],
                speed: 10,
                jumpForce: 12,
                currency: 20,
                inventory: ['Hüppekingad']
            },
            rules: {
                objective: 'Väldi laavat ja jõua finišisambani!',
                winCondition: 'player.position.z >= 60',
                loseCondition: 'player.position.y < -2'
            },
            objects: [
                {
                    id: 'obby_spawn_plat',
                    name: 'Algusplatvorm',
                    type: 'box',
                    position: [0, 0, 0],
                    scale: [8, 1, 8],
                    color: 0x06b6d4,
                    gameItemType: 'spawn',
                    isCollidable: true
                },
                {
                    id: 'plat_1',
                    name: 'Hüppeplatvorm 1',
                    type: 'box',
                    position: [0, 1, 10],
                    scale: [4, 0.8, 4],
                    color: 0xf59e0b,
                    isCollidable: true
                },
                {
                    id: 'plat_2',
                    name: 'Hüppeplatvorm 2',
                    type: 'box',
                    position: [4, 2.5, 20],
                    scale: [3.5, 0.8, 3.5],
                    color: 0xec4899,
                    isCollidable: true
                },
                {
                    id: 'plat_3',
                    name: 'Hüppeplatvorm 3',
                    type: 'box',
                    position: [-4, 4, 32],
                    scale: [3, 0.8, 3],
                    color: 0x8b5cf6,
                    isCollidable: true
                },
                {
                    id: 'lava_ocean',
                    name: 'Surmav Laava',
                    type: 'plane',
                    position: [0, -3, 30],
                    scale: [100, 1, 100],
                    color: 0xff3b30,
                    isHazard: true,
                    script: 'onTriggerEnter("player", respawnPlayer())'
                },
                {
                    id: 'finish_portal',
                    name: 'Finiši Võiduportaal',
                    type: 'box',
                    position: [0, 5.5, 48],
                    scale: [6, 1, 6],
                    color: 0x10b981,
                    gameItemType: 'safe_zone',
                    script: 'onTriggerEnter("player", winGame())'
                }
            ]
        };
    }

    private static createAdventureGame(id: string, title: string): PlayardAiScene {
        return {
            id,
            title,
            description: 'Uuri Playardi avarusi, räägi külaelanikega ja korja väärtuslikke münte!',
            author: 'Playard AI',
            createdAt: Date.now(),
            environment: {
                skyColor: 0x60a5fa,
                lightColor: 0xffedd5,
                groundColor: 0x15803d,
                fogDensity: 0.008,
                timeOfDay: 'day'
            },
            playerConfig: {
                spawnPosition: [0, 1, 0],
                speed: 10,
                jumpForce: 9,
                currency: 50,
                inventory: ['Matkakepp', 'Kompass']
            },
            rules: {
                objective: 'Räägi NPC tegelasega ja leia kõik peidetud Playard mündid!',
                winCondition: 'player.currency >= 100',
                loseCondition: 'never'
            },
            objects: [
                {
                    id: 'adv_ground',
                    name: 'Muruplats',
                    type: 'plane',
                    position: [0, 0, 0],
                    scale: [100, 1, 100],
                    color: 0x16a34a,
                    isCollidable: true
                },
                {
                    id: 'adv_spawn',
                    name: 'Külaväljaku Spawn',
                    type: 'spawn',
                    position: [0, 0.1, 0],
                    scale: [3, 0.2, 3],
                    color: 0x3b82f6,
                    gameItemType: 'spawn'
                },
                {
                    id: 'town_house',
                    name: 'Maja',
                    type: 'building',
                    position: [-12, 3, -8],
                    scale: [7, 6, 7],
                    color: 0xca8a04,
                    isCollidable: true
                },
                {
                    id: 'npc_guide',
                    name: 'Külavanem Karl',
                    type: 'npc',
                    position: [3, 1, 4],
                    scale: [1, 2, 1],
                    color: 0x4f46e5,
                    gameItemType: 'npc',
                    script: 'showDialogue("Tere tulemast Playardi seiklusesse! Korja kokku kõik kuldmündid!");'
                },
                {
                    id: 'gold_coin_adv',
                    name: 'Kuldmünt',
                    type: 'coin',
                    position: [0, 1, 15],
                    scale: [1, 1, 0.2],
                    color: 0xfacc15,
                    gameItemType: 'collectible',
                    script: 'addPlayerCurrency(25); playSound("coin")'
                }
            ]
        };
    }
}
