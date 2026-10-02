import type { PlayardAiScene } from './gameGenerator';
import type { ParsedCommand } from './conversationEngine';
import { SKY_PRESETS, type SkyConfig } from '../../../shared/skySystem';

export interface ModificationResult {
    success: boolean;
    message: string;
    modifiedScene: PlayardAiScene;
    changedObjectIds?: string[];
}

export class SceneModifier {
    /**
     * Applies incremental modifications to the active game scene.
     */
    public static applyCommand(scene: PlayardAiScene, command: ParsedCommand): ModificationResult {
        const cloned: PlayardAiScene = JSON.parse(JSON.stringify(scene));

        switch (command.intent) {
            case 'MODIFY_OBJECT':
                return this.modifyObject(cloned, command);
            case 'ADD_FEATURE':
                return this.addFeature(cloned, command);
            case 'CHANGE_ENVIRONMENT':
                return this.changeEnvironment(cloned, command);
            case 'UPDATE_GAME_RULES':
                return this.updateRules(cloned, command);
            default:
                return {
                    success: false,
                    message: 'Käsk ei vajanud otsest stseeni muutmist.',
                    modifiedScene: scene
                };
        }
    }

    /**
     * "Tee maja suuremaks"
     */
    private static modifyObject(scene: PlayardAiScene, command: ParsedCommand): ModificationResult {
        const factor = command.parameters?.factor || 1.5;
        const target = command.actionTarget || 'building';

        // Find matching object
        const matching = scene.objects.filter(o =>
            o.type === 'building' ||
            (o.name && o.name.toLowerCase().includes(target.toLowerCase()))
        );

        if (matching.length === 0) {
            // If no building exists yet, create one
            const newBuildingId = 'building_' + Date.now();
            scene.objects.push({
                id: newBuildingId,
                name: 'Suur Hoone',
                type: 'building',
                position: [0, 4, 10],
                scale: [8 * factor, 8 * factor, 8 * factor],
                color: 0x8b4513,
                isCollidable: true
            });
            return {
                success: true,
                message: `Stseenis polnud varasemat hoonet. Lisasin uue suure maja (mõõtmetega ${(8 * factor).toFixed(1)}m)!`,
                modifiedScene: scene,
                changedObjectIds: [newBuildingId]
            };
        }

        for (const obj of matching) {
            obj.scale = [
                obj.scale[0] * factor,
                obj.scale[1] * factor,
                obj.scale[2] * factor
            ];
            // Adjust position Y so it doesn't sink into the ground
            obj.position[1] = (obj.scale[1] / 2);
        }

        return {
            success: true,
            message: `Tegin ${matching.length} hoone(t) ${factor}x suuremaks! Uus kõrgus on ${matching[0].scale[1].toFixed(1)}m.`,
            modifiedScene: scene,
            changedObjectIds: matching.map(o => o.id)
        };
    }

    /**
     * "Lisa siia lennujaam", "Pane siia tornaado"
     */
    private static addFeature(scene: PlayardAiScene, command: ParsedCommand): ModificationResult {
        const feature = command.parameters?.feature || command.actionTarget;

        if (feature === 'airport') {
            const runwayId = 'runway_' + Date.now();
            const towerId = 'tower_' + Date.now();
            const planeId = 'plane_' + Date.now();

            scene.objects.push(
                {
                    id: runwayId,
                    name: 'Lennujaama rada',
                    type: 'box',
                    position: [0, 0.05, 10],
                    scale: [12, 0.1, 70],
                    color: 0x222222,
                    isCollidable: true
                },
                {
                    id: towerId,
                    name: 'Juhtimistorn',
                    type: 'building',
                    position: [12, 8, 10],
                    scale: [4, 16, 4],
                    color: 0xd1d5db,
                    isCollidable: true
                },
                {
                    id: planeId,
                    name: 'Lennuk',
                    type: 'airplane',
                    position: [0, 1.2, 5],
                    scale: [4, 1.5, 6],
                    color: 0xef4444,
                    gameItemType: 'vehicle_plane'
                }
            );

            return {
                success: true,
                message: 'Lisasin stseeni uue lennujaama: stardiraja, lennujuhtimistorni ja Playard lennuki!',
                modifiedScene: scene,
                changedObjectIds: [runwayId, towerId, planeId]
            };
        }

        if (feature === 'tornado') {
            const tornadoId = 'tornado_' + Date.now();
            scene.objects.push({
                id: tornadoId,
                name: 'Pöörlev Tornaado',
                type: 'tornado',
                position: [15, 0, -20],
                scale: [6, 18, 6],
                color: 0x1f2937,
                isHazard: true,
                gameItemType: 'hazard_tornado',
                script: 'rotate(0, 0.2, 0); moveToward("player", 0.04)'
            });

            return {
                success: true,
                message: 'Lisasin stseeni aktiivse hävitava tornaado koos pööritava osakeste tuurisüsteemiga!',
                modifiedScene: scene,
                changedObjectIds: [tornadoId]
            };
        }

        // Universal Procedural 3D Entity Spawner
        const lowerRaw = command.rawText.toLowerCase();
        let entityType: any = 'box';
        let entityName = command.parameters?.text || 'Uus Objekt';
        let entityScale: [number, number, number] = [2, 2, 2];
        let entityColor: any = 0x3b82f6;

        if (lowerRaw.includes('tank')) {
            entityType = 'tank';
            entityName = 'Soomustatud Tank';
            entityScale = [10, 4, 6];
            entityColor = 0x3f6212;
        } else if (lowerRaw.includes('robot') || lowerRaw.includes('mech')) {
            entityType = 'robot';
            entityName = 'Võitlusrobot (AI)';
            entityScale = [6, 10, 5];
            entityColor = 0x334155;
        } else if (lowerRaw.includes('dinosaurus') || lowerRaw.includes('dino') || lowerRaw.includes('t-rex')) {
            entityType = 'dinosaur';
            entityName = 'Dinosaurus T-Rex';
            entityScale = [10, 8, 6];
            entityColor = 0x4d7c0f;
        } else if (lowerRaw.includes('ufo') || lowerRaw.includes('kosmoselaev')) {
            entityType = 'ufo';
            entityName = 'Tulnukate UFO';
            entityScale = [12, 5, 12];
            entityColor = 0x06b6d4;
        } else if (lowerRaw.includes('allveelaev')) {
            entityType = 'submarine';
            entityName = 'Süvavee Allveelaev';
            entityScale = [14, 5, 5];
            entityColor = 0xfacc15;
        } else if (lowerRaw.includes('vulkaan')) {
            entityType = 'volcano';
            entityName = 'Aktiivne Vulkaan';
            entityScale = [30, 24, 30];
            entityColor = 0x27272a;
        } else if (lowerRaw.includes('püramiid')) {
            entityType = 'pyramid';
            entityName = 'Iidne Püramiid';
            entityScale = [25, 20, 25];
            entityColor = 0xd97706;
        } else if (lowerRaw.includes('draakon')) {
            entityType = 'dragon';
            entityName = 'Tule-Draakon';
            entityScale = [12, 8, 12];
            entityColor = 0xb91c1c;
        }

        const propId = 'prop_' + Date.now();
        scene.objects.push({
            id: propId,
            name: entityName,
            type: entityType,
            position: [Math.floor(Math.random() * 10 - 5), 1, Math.floor(Math.random() * 10 - 5)],
            scale: entityScale,
            color: entityColor,
            isCollidable: true
        });

        return {
            success: true,
            message: `Lisasin stseeni uue objekti: "${entityName}".`,
            modifiedScene: scene,
            changedObjectIds: [propId]
        };
    }


    /**
     * Enhanced Sky & Atmosphere Modifier:
     * Supports day, night, sunset, sunrise, cloudy, storm, rain, snow, fog, space, mars,
     * stars, sun/moon positions & sizes, day-night cycle, weather cycle, event & biome triggers.
     */
    private static changeEnvironment(scene: PlayardAiScene, command: ParsedCommand): ModificationResult {
        const p = command.parameters || {};
        const skyMode = p.skyMode || (p.isNight ? 'night' : 'day');
        
        // Base preset
        const basePreset = SKY_PRESETS[skyMode] || SKY_PRESETS.day;
        const skyConfig: SkyConfig = JSON.parse(JSON.stringify(scene.environment.skyConfig || basePreset));

        skyConfig.mode = skyMode;
        if (p.weather) skyConfig.weather = p.weather;
        if (p.theme) skyConfig.theme = p.theme;
        if (p.skyColor !== undefined) skyConfig.skyColor = p.skyColor;
        if (p.lightColor !== undefined) skyConfig.lightColor = p.lightColor;
        if (p.fogDensity !== undefined) skyConfig.fogDensity = p.fogDensity;
        if (p.brightness !== undefined) skyConfig.brightness = p.brightness;

        // Sun options
        if (p.sun) {
            skyConfig.sun = { ...skyConfig.sun, ...p.sun };
        }
        if (p.sunPosition) {
            skyConfig.sun.position = p.sunPosition;
            skyConfig.sun.enabled = true;
        }

        // Moon options
        if (p.moon) {
            skyConfig.moon = { ...skyConfig.moon, ...p.moon };
        }
        if (p.moonPosition) {
            skyConfig.moon.position = p.moonPosition;
            skyConfig.moon.enabled = true;
        }
        if (p.moonSize) {
            skyConfig.moon.size = p.moonSize;
            skyConfig.moon.enabled = true;
        }

        // Stars options
        if (p.stars) {
            skyConfig.stars = { ...skyConfig.stars, ...p.stars };
        } else if (p.starsCount !== undefined) {
            skyConfig.stars.enabled = p.starsCount > 0;
            skyConfig.stars.count = p.starsCount;
        }

        // Clouds options
        if (p.clouds) {
            skyConfig.clouds = { ...skyConfig.clouds, ...p.clouds };
        } else if (p.cloudDensity !== undefined) {
            skyConfig.clouds.enabled = p.cloudDensity > 0;
            skyConfig.clouds.density = p.cloudDensity;
        }

        // Precipitation
        if (p.precipitation) {
            skyConfig.precipitation = { ...skyConfig.precipitation, ...p.precipitation };
        }

        // Day/night cycle & dynamic sky
        if (p.cycle) {
            skyConfig.cycle = { ...skyConfig.cycle, ...p.cycle };
        } else if (p.cycleEnabled !== undefined) {
            skyConfig.cycle.enabled = p.cycleEnabled;
        }

        // Weather cycle
        if (p.weatherCycle) {
            skyConfig.weatherCycle = p.weatherCycle;
        }

        // Event & Biome triggers
        if (p.eventTriggers) {
            skyConfig.eventTriggers = p.eventTriggers;
        }
        if (p.biomeTriggers) {
            skyConfig.biomeTriggers = p.biomeTriggers;
        }

        // Sync scene environment properties
        scene.environment.skyConfig = skyConfig;
        scene.environment.timeOfDay = skyConfig.mode;
        scene.environment.skyColor = skyConfig.skyColor;
        scene.environment.lightColor = skyConfig.lightColor;
        scene.environment.fogDensity = skyConfig.fogDensity;

        // Custom confirmation message in Estonian
        let details: string[] = [];
        if (skyConfig.mode === 'night') details.push('öine tähistaevas');
        else if (skyConfig.mode === 'day') details.push('päevane valgus');
        else if (skyConfig.mode === 'sunset') details.push('kuldne päikeseloojang');
        else if (skyConfig.mode === 'sunrise') details.push('koidukuma päikesetõus');
        else if (skyConfig.mode === 'space') details.push('kosmiline vaade');
        else if (skyConfig.mode === 'alien') details.push('tulnukplaneedi atmosfäär');

        if (skyConfig.stars.enabled) details.push(`${skyConfig.stars.count} helkivat tähte`);
        if (skyConfig.moon.enabled) details.push(`kuu (suurus ${skyConfig.moon.size})`);
        if (skyConfig.clouds.enabled) details.push(`pilved (tihedus ${Math.round(skyConfig.clouds.density * 100)}%)`);
        if (skyConfig.precipitation.type !== 'none') details.push(`sajab ${skyConfig.precipitation.type === 'rain' ? 'vihma' : 'lund'}`);
        if (skyConfig.cycle.enabled) details.push('aktiivne päeva-öö tsükkel');
        if (skyConfig.weatherCycle?.enabled) details.push('automaatne ilmastiku vaheldumine');

        const message = `✨ **Playard AI Taevasüsteem:**\nRakendasin uued taeva ja atmosfääri seaded: ${details.join(', ')}!`;

        return {
            success: true,
            message,
            modifiedScene: scene
        };
    }

    /**
     * "Lisa mängijale 100 raha", "Muuda mängija kiiremaks"
     */
    private static updateRules(scene: PlayardAiScene, command: ParsedCommand): ModificationResult {
        const action = command.parameters?.action;

        if (action === 'add_currency') {
            const amount = command.parameters?.amount || 100;
            scene.playerConfig.currency = (scene.playerConfig.currency || 0) + amount;
            return {
                success: true,
                message: `Lisasin mängijale +${amount} münti! Hetke saldo mängus: ${scene.playerConfig.currency} PlayCoins.`,
                modifiedScene: scene
            };
        }

        if (action === 'increase_speed') {
            const mult = command.parameters?.multiplier || 1.5;
            scene.playerConfig.speed = Math.round((scene.playerConfig.speed || 10) * mult);
            return {
                success: true,
                message: `Tõstsin mängija liikumiskiirust! Uus kiirus: ${scene.playerConfig.speed} m/s (eelnevast ${mult}x kiirem).`,
                modifiedScene: scene
            };
        }

        return {
            success: true,
            message: 'Mängu reeglid on uuendatud.',
            modifiedScene: scene
        };
    }
}
