import type { PlayardAiScene } from './gameGenerator';
import type { ParsedCommand } from './conversationEngine';

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

        // Generic prop
        const propId = 'prop_' + Date.now();
        scene.objects.push({
            id: propId,
            name: command.parameters?.text || 'Uus Objekt',
            type: 'box',
            position: [Math.floor(Math.random() * 10 - 5), 1, Math.floor(Math.random() * 10 - 5)],
            scale: [2, 2, 2],
            color: 0x3b82f6,
            isCollidable: true
        });

        return {
            success: true,
            message: `Lisasin stseeni uue objekti: "${command.parameters?.text || 'Uus element'}".`,
            modifiedScene: scene,
            changedObjectIds: [propId]
        };
    }

    /**
     * "Muuda taevas öiseks" / "Muuda taevas päevaseks"
     */
    private static changeEnvironment(scene: PlayardAiScene, command: ParsedCommand): ModificationResult {
        const skyMode = command.parameters?.skyMode || 'night';
        const isNight = skyMode === 'night';

        scene.environment.timeOfDay = isNight ? 'night' : 'day';
        scene.environment.skyColor = isNight ? 0x05051a : 0x87ceeb;
        scene.environment.lightColor = isNight ? 0x334466 : 0xffffff;
        scene.environment.groundColor = isNight ? 0x0d2818 : 0x228b22;

        return {
            success: true,
            message: isNight
                ? 'Muutsin taeva tähistaeva öörežiimile (öine valgustus ja tumesinine kuma aktiveeritud)!'
                : 'Muutsin taeva selgeks päikeseliseks päevarežiimiks!',
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
