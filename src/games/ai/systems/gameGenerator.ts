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
            case 'tycoon':
                return this.createTycoonGame(id, customTitle || 'Playard Tehas & Tycoon');
            case 'simulator':
                return this.createSimulatorGame(id, customTitle || 'Playard Treening Simulaator');
            case 'racing':
                return this.createRacingGame(id, customTitle || 'Playard Võidusõit');
            case 'survival':
                return this.createSurvivalGame(id, customTitle || 'Playard Ellujäämine');
            case 'horror':
                return this.createHorrorGame(id, customTitle || 'Playard Õudusmäng & Pimedus');
            case 'tower_defense':
                return this.createTowerDefenseGame(id, customTitle || 'Playard Tornikaitse');
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

    private static createTycoonGame(id: string, title: string): PlayardAiScene {
        return {
            id,
            title,
            description: 'Ehita oma PlayBux tehas! Osta droppereid, kogu konveierilt toodangut ja teeni rikkust.',
            author: 'Playard AI',
            createdAt: Date.now(),
            environment: {
                skyColor: 0x38bdf8,
                lightColor: 0xffffff,
                groundColor: 0x1e293b,
                fogDensity: 0.005,
                timeOfDay: 'day'
            },
            playerConfig: {
                spawnPosition: [0, 1, 0],
                speed: 11,
                jumpForce: 9,
                currency: 100,
                inventory: ['Ehitustööriist']
            },
            rules: {
                objective: 'Kogu konveierilt raha ja ava kõik tehase laiendused!',
                winCondition: 'player.currency >= 1000',
                loseCondition: 'never'
            },
            objects: [
                { id: 'tycoon_floor', name: 'Tehase Betoonpõrand', type: 'plane', position: [0, 0, 0], scale: [80, 1, 80], color: 0x334155, isCollidable: true },
                { id: 'tycoon_spawn', name: 'Tehase Spawn', type: 'spawn', position: [0, 0.1, 0], scale: [3, 0.2, 3], color: 0x10b981, gameItemType: 'spawn' },
                { id: 'tycoon_dropper', name: 'PBX Dropper #1', type: 'box', position: [-8, 4, -5], scale: [2, 2, 2], color: 0xeab308, gameItemType: 'tycoon_dropper', script: 'spawnDrop("coin", target.position);' },
                { id: 'tycoon_conveyor', name: 'Konveierlint', type: 'box', position: [-8, 0.5, 0], scale: [2, 0.4, 12], color: 0x475569, gameItemType: 'conveyor' },
                { id: 'tycoon_collector', name: 'Raha Kassa & Vault', type: 'box', position: [-8, 1, 8], scale: [3, 2, 3], color: 0x22c55e, gameItemType: 'cash_collector', script: 'collectAllFactoryCash(player);' },
                { id: 'tycoon_upgrade_pad', name: 'Ostuplatvorm: Dropper #2 (250 PBX)', type: 'cylinder', position: [5, 0.1, 0], scale: [3, 0.2, 3], color: 0x06b6d4, gameItemType: 'upgrade_pad' }
            ]
        };
    }

    private static createSimulatorGame(id: string, title: string): PlayardAiScene {
        return {
            id,
            title,
            description: 'Treeni oma tegelast, kogu energiat, tee Rebirth ja tõuse edetabeli tippu!',
            author: 'Playard AI',
            createdAt: Date.now(),
            environment: {
                skyColor: 0x818cf8,
                lightColor: 0xffffff,
                groundColor: 0x0f172a,
                fogDensity: 0.006,
                timeOfDay: 'day'
            },
            playerConfig: {
                spawnPosition: [0, 1, 0],
                speed: 10,
                jumpForce: 10,
                currency: 0,
                inventory: ['Treeningraskus']
            },
            rules: {
                objective: 'Treeni 1000 jõudu ja saavuta esimene Rebirth!',
                winCondition: 'player.stats.strength >= 1000',
                loseCondition: 'never'
            },
            objects: [
                { id: 'sim_ground', name: 'Treeningareen', type: 'plane', position: [0, 0, 0], scale: [90, 1, 90], color: 0x1e1b4b, isCollidable: true },
                { id: 'sim_spawn', name: 'Jõusaali Spawn', type: 'spawn', position: [0, 0.1, 0], scale: [3, 0.2, 3], color: 0x6366f1, gameItemType: 'spawn' },
                { id: 'sim_sell_pad', name: 'Müügiring (Sell Zone)', type: 'cylinder', position: [0, 0.1, 10], scale: [4, 0.2, 4], color: 0xf59e0b, gameItemType: 'sell_zone', script: 'sellStrengthForCoins(player);' },
                { id: 'sim_rebirth_gate', name: 'Rebirth Värav (Tase 1)', type: 'box', position: [15, 3, 0], scale: [4, 6, 1], color: 0xa855f7, gameItemType: 'rebirth_gate' },
                { id: 'sim_npc_coach', name: 'Treener Sander', type: 'npc', position: [-6, 1, 4], scale: [1, 2, 1], color: 0xec4899, gameItemType: 'npc', script: 'showDialogue("Tõsta kangi ja müü oma energia kullaks!");' }
            ]
        };
    }

    private static createRacingGame(id: string, title: string): PlayardAiScene {
        return {
            id,
            title,
            description: 'Võidusõidumäng: läbi kontrollpunktid, kasuta kiiruse nitro-patju ja saavuta kiireim ringiaeg!',
            author: 'Playard AI',
            createdAt: Date.now(),
            environment: {
                skyColor: 0x38bdf8,
                lightColor: 0xfef08a,
                groundColor: 0x475569,
                fogDensity: 0.005,
                timeOfDay: 'day'
            },
            playerConfig: {
                spawnPosition: [0, 1, 0],
                speed: 18,
                jumpForce: 8,
                currency: 0,
                inventory: ['Võistlusauto Võtmed']
            },
            rules: {
                objective: 'Sõida 3 ringi ja ületa finišijoon parima ajaga!',
                winCondition: 'player.completedLaps >= 3',
                loseCondition: 'timer <= 0',
                timerSeconds: 120
            },
            objects: [
                { id: 'race_track', name: 'Asfaltrada', type: 'plane', position: [0, 0, 0], scale: [140, 1, 140], color: 0x1e293b, isCollidable: true },
                { id: 'race_start_gate', name: 'Stardivärav & Finiš', type: 'box', position: [0, 4, 0], scale: [12, 8, 2], color: 0xef4444, gameItemType: 'start_gate' },
                { id: 'race_car_p1', name: 'Playard Turbo Sportauto', type: 'box', position: [0, 1, 4], scale: [2.2, 1.2, 4.5], color: 0x3b82f6, gameItemType: 'vehicle_car', script: 'enterVehicle(player, "race_car");' },
                { id: 'race_cp1', name: 'Kontrollpunkt #1', type: 'cylinder', position: [30, 2, 30], scale: [6, 4, 6], color: 0x10b981, gameItemType: 'checkpoint' },
                { id: 'race_cp2', name: 'Kontrollpunkt #2', type: 'cylinder', position: [-30, 2, 30], scale: [6, 4, 6], color: 0x10b981, gameItemType: 'checkpoint' },
                { id: 'race_boost', name: 'Nitro Speed Pad', type: 'plane', position: [0, 0.1, 20], scale: [4, 1, 8], color: 0x06b6d4, gameItemType: 'boost_pad', script: 'applySpeedBoost(player, 2.0, 3000);' }
            ]
        };
    }

    private static createSurvivalGame(id: string, title: string): PlayardAiScene {
        return {
            id,
            title,
            description: 'Ellujäämismäng: kogu toitu ja puitu, kaitse end külma ja öiste rünnakute eest ning pea vastu!',
            author: 'Playard AI',
            createdAt: Date.now(),
            environment: {
                skyColor: 0x0f172a,
                lightColor: 0x94a3b8,
                groundColor: 0x14532d,
                fogDensity: 0.018,
                timeOfDay: 'night'
            },
            playerConfig: {
                spawnPosition: [0, 1, 0],
                speed: 9,
                jumpForce: 8,
                currency: 20,
                inventory: ['Taskulamp', 'Kirves', 'Lõkketikud']
            },
            rules: {
                objective: 'Hoia lõke põlemas ja ela üle öine külmalaine!',
                winCondition: 'player.survivedNights >= 3',
                loseCondition: 'player.hp <= 0'
            },
            objects: [
                { id: 'surv_ground', name: 'Metsamaastik', type: 'plane', position: [0, 0, 0], scale: [120, 1, 120], color: 0x166534, isCollidable: true },
                { id: 'surv_spawn', name: 'Laagriplatsi Spawn', type: 'spawn', position: [0, 0.1, 0], scale: [3, 0.2, 3], color: 0x22c55e, gameItemType: 'spawn' },
                { id: 'surv_campfire', name: 'Soojendav Lõke', type: 'cylinder', position: [0, 0.5, 4], scale: [2, 1, 2], color: 0xf97316, gameItemType: 'safe_zone', script: 'restoreWarmth(player);' },
                { id: 'surv_shelter', name: 'Puidust Varjend', type: 'building', position: [-8, 2.5, -4], scale: [6, 5, 6], color: 0x78350f, isCollidable: true },
                { id: 'surv_tree', name: 'Ressursipuu (Kogutav)', type: 'cylinder', position: [10, 3, 10], scale: [1.5, 6, 1.5], color: 0x15803d, isCollidable: true, script: 'harvestResource("wood", 10);' },
                { id: 'surv_monster', name: 'Öine Metsakoletis', type: 'box', position: [25, 1.5, 25], scale: [1.8, 3, 1.8], color: 0xdc2626, isHazard: true, script: 'patrolAndAttackPlayer(target, 4);' }
            ]
        };
    }

    private static createHorrorGame(id: string, title: string): PlayardAiScene {
        return {
            id,
            title,
            description: 'Õudusmäng hüljatud haiglas: leia generaatori kaitsmed, väldi varje ja põgene enne kui patarei tühjeneb.',
            author: 'Playard AI',
            createdAt: Date.now(),
            environment: {
                skyColor: 0x020617,
                lightColor: 0x1e293b,
                groundColor: 0x0f172a,
                fogDensity: 0.035,
                timeOfDay: 'night'
            },
            playerConfig: {
                spawnPosition: [0, 1, 0],
                speed: 8,
                jumpForce: 7,
                currency: 0,
                inventory: ['Vilkuv Taskulamp', 'Patarei']
            },
            rules: {
                objective: 'Leia 3 kaitselülitit ja ava peaväljapääsu turvauks!',
                winCondition: 'player.collectedFuses >= 3 && player.reachedExit',
                loseCondition: 'monster.catches(player) || player.sanity <= 0'
            },
            objects: [
                { id: 'horror_floor', name: 'Külm Kiviplaat', type: 'plane', position: [0, 0, 0], scale: [80, 1, 80], color: 0x090d16, isCollidable: true },
                { id: 'horror_spawn', name: 'Algustuba (Spawn)', type: 'spawn', position: [0, 0.1, 0], scale: [3, 0.2, 3], color: 0x475569, gameItemType: 'spawn' },
                { id: 'horror_corridor', name: 'Hüljatud Koridor', type: 'building', position: [0, 3, 15], scale: [6, 6, 24], color: 0x1e293b, isCollidable: true },
                { id: 'horror_fuse1', name: 'Elektriline Kaitse #1', type: 'box', position: [0, 1, 24], scale: [0.6, 0.6, 0.6], color: 0x38bdf8, gameItemType: 'collectible', script: 'collectFuse(1);' },
                { id: 'horror_stalker', name: 'Salapärane Vari (AI)', type: 'cylinder', position: [15, 2, 15], scale: [1.2, 4, 1.2], color: 0x000000, isHazard: true, script: 'stalkPlayerInShadows(player);' }
            ]
        };
    }

    private static createTowerDefenseGame(id: string, title: string): PlayardAiScene {
        return {
            id,
            title,
            description: 'Tornikaitse: paiguta kaitsetorne mööda teed, kaitse kristallibaasi ja hävita vaenlaste lained!',
            author: 'Playard AI',
            createdAt: Date.now(),
            environment: {
                skyColor: 0x0284c7,
                lightColor: 0xffffff,
                groundColor: 0x15803d,
                fogDensity: 0.006,
                timeOfDay: 'day'
            },
            playerConfig: {
                spawnPosition: [0, 1, 0],
                speed: 12,
                jumpForce: 9,
                currency: 250,
                inventory: ['Torniehitaja Pult']
            },
            rules: {
                objective: 'Kaitse baasikristalli ja ela üle 10 vaenlaste lainet!',
                winCondition: 'player.completedWaves >= 10',
                loseCondition: 'base.crystalHp <= 0'
            },
            objects: [
                { id: 'td_ground', name: 'Kaitsetsoon', type: 'plane', position: [0, 0, 0], scale: [100, 1, 100], color: 0x166534, isCollidable: true },
                { id: 'td_path', name: 'Vaenlaste Rada', type: 'plane', position: [0, 0.05, 0], scale: [6, 1, 80], color: 0xd97706 },
                { id: 'td_base', name: 'Baasikristall (100 HP)', type: 'cylinder', position: [0, 2, 35], scale: [4, 4, 4], color: 0x06b6d4, gameItemType: 'base_core' },
                { id: 'td_turret_spot1', name: 'Torniplatvorm #1', type: 'box', position: [-8, 1, 0], scale: [3, 2, 3], color: 0x64748b, gameItemType: 'turret_pad', script: 'buildTurret("laser_cannon", 100);' },
                { id: 'td_turret_spot2', name: 'Torniplatvorm #2', type: 'box', position: [8, 1, 15], scale: [3, 2, 3], color: 0x64748b, gameItemType: 'turret_pad', script: 'buildTurret("freeze_ray", 150);' }
            ]
        };
    }
}

