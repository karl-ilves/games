import type { AiIntentType, AiSafetyReport } from '../types';
import { CodeSandbox } from './codeSandbox';
import { PlayardGeneralKnowledge, PLAYARD_PIPELINE_STAGES, AiCodeAndSystemEngine, PLAYARD_GENRES_CATALOG, type PipelineStage } from '../../../shared/playardAiKnowledge';

export interface ParsedCommand {
    intent: AiIntentType;
    confidence: number;
    rawText: string;
    actionTarget?: string;
    parameters?: Record<string, any>;
    needsClarification?: boolean;
    clarificationQuestion?: string;
    clarificationOptions?: string[];
    safetyReport: AiSafetyReport;
}

export class ConversationEngine {
    private static clarificationPatterns: Array<{
        pattern: RegExp;
        question: string;
        options: string[];
    }> = [
        {
            pattern: /^(tee|loo|ehita|valmista|create|make|build)\s+(mäng|game)\s*$/i,
            question: 'Millist tüüpi mängu soovid luua?',
            options: [
                'Tornaado eest põgenemise mäng',
                'Lennusimulaator ja lennujaam',
                'Takistusrada (Obby)',
                'Linna võidusõidumäng'
            ]
        },
        {
            pattern: /^(lisa|pane|add|put|place)\s+(auto|car)\s*$/i,
            question: 'Millist tüüpi sõidukit soovid lisada?',
            options: [
                'Kiire spordiauto',
                'Tugev maastur',
                'Lennuk stardirajaga'
            ]
        },
        {
            pattern: /^(lisa|pane|add|put)\s+(maja|building|house)\s*$/i,
            question: 'Millise hoone soovid stseeni paigutada?',
            options: [
                'Suur elumaja',
                'Lennujaama terminal',
                'Pilvelõhkuja'
            ]
        }
    ];

    /**
     * Parses user command into structured intent, parameters, and safety analysis.
     */
    public static parseInput(input: string, currentContext?: any): ParsedCommand {
        const text = input.trim();
        const safetyReport = CodeSandbox.inspectScriptCode(text);

        // Security check
        if (!safetyReport.isSafe) {
            return {
                intent: 'SECURITY_VIOLATION',
                confidence: 1.0,
                rawText: text,
                safetyReport
            };
        }

        // Check for ambiguous inputs that require clarification
        for (const item of this.clarificationPatterns) {
            if (item.pattern.test(text)) {
                return {
                    intent: 'CLARIFICATION_NEEDED',
                    confidence: 0.95,
                    rawText: text,
                    needsClarification: true,
                    clarificationQuestion: item.question,
                    clarificationOptions: item.options,
                    safetyReport
                };
            }
        }

        const lower = text.toLowerCase();

        // 0. General Knowledge & Facts / Anti-Hallucination
        const generalAnswer = PlayardGeneralKnowledge.answerQuestion(text);
        if (generalAnswer) {
            return {
                intent: 'GENERAL_KNOWLEDGE',
                confidence: 0.99,
                rawText: text,
                parameters: {
                    answer: generalAnswer
                },
                safetyReport
            };
        }

        // 0.1 Development Pipeline Stage (IDEA -> PLAAN -> LOOMINE -> KOOD -> TESTIMINE -> PARANDAMINE -> AVALDAMINE)
        if (/pipeline|arenduskonveier|arendustsükkel|ideest valmis mänguni/i.test(lower) || /^(etapp|samm|stage)\s*([1-7]|idea|plaan|loomine|kood|testimine|parandamine|avaldamine)/i.test(lower)) {
            let stageKey: PipelineStage = 'IDEA';
            if (/2|plaan/i.test(lower)) stageKey = 'PLAAN';
            else if (/3|loomine|build/i.test(lower)) stageKey = 'LOOMINE';
            else if (/4|kood|skript/i.test(lower)) stageKey = 'KOOD';
            else if (/5|testimine|test/i.test(lower)) stageKey = 'TESTIMINE';
            else if (/6|parandamine|fix/i.test(lower)) stageKey = 'PARANDAMINE';
            else if (/7|avaldamine|publish/i.test(lower)) stageKey = 'AVALDAMINE';

            return {
                intent: 'PIPELINE_STEP',
                confidence: 0.95,
                rawText: text,
                parameters: {
                    stage: stageKey,
                    guidance: PLAYARD_PIPELINE_STAGES[stageKey]
                },
                safetyReport
            };
        }

        // 0.2 Code Assistance & Debugging / Bug Fixing
        if (
            /paranda kood|leia koodiviga|leia viga|optimeeri kood|koodi parandamine|fix code|repair code|debug code/i.test(lower) ||
            (/kirjuta kood|tee skript|write code|loo kood/i.test(lower) && !/mäng|game/i.test(lower))
        ) {
            return {
                intent: 'CODE_ASSIST',
                confidence: 0.95,
                rawText: text,
                parameters: {
                    code: text
                },
                safetyReport
            };
        }

        // 0.3 UI Component Generation (Shop, Inventory, HUD, Settings, Menu)
        if (/(?:loo|tee|genereeri|build|create)\s+(?:shop|pood|inventar|inventory|hud|seaded|settings|menüü|menu)\s*(?:ui|liides|aken)?/i.test(lower)) {
            let uiType: 'shop' | 'inventory' | 'hud' | 'settings' | 'menu' = 'hud';
            if (/shop|pood/i.test(lower)) uiType = 'shop';
            else if (/inventar|inventory/i.test(lower)) uiType = 'inventory';
            return {
                intent: 'UI_GEN',
                confidence: 0.95,
                rawText: text,
                parameters: { uiType },
                safetyReport
            };
        }

        // 1. Create Game Intents (Genres: Tycoon, Simulator, Racing, Survival, Horror, TD, Obby, Flight, Tornado)
        if (/tycoon|tehas|tehasemäng/i.test(lower) && /tee|loo|mäng|ehita|build|create/i.test(lower)) {
            return {
                intent: 'CREATE_GAME',
                confidence: 0.95,
                rawText: text,
                parameters: {
                    theme: 'tycoon',
                    title: 'Playard PBX Tycoon',
                    elements: ['dropper', 'conveyor', 'vault', 'upgrades']
                },
                safetyReport
            };
        }

        if (/simulator|simulaator|treeningmäng/i.test(lower) && /tee|loo|mäng|ehita|build|create/i.test(lower)) {
            return {
                intent: 'CREATE_GAME',
                confidence: 0.95,
                rawText: text,
                parameters: {
                    theme: 'simulator',
                    title: 'Playard Treening Simulaator',
                    elements: ['weights', 'sell_pad', 'rebirth_gate', 'leaderboard']
                },
                safetyReport
            };
        }

        if (/racing|võidusõit|voidusoit|võistlus|ralli/i.test(lower) && /tee|loo|mäng|ehita|build|create/i.test(lower)) {
            return {
                intent: 'CREATE_GAME',
                confidence: 0.95,
                rawText: text,
                parameters: {
                    theme: 'racing',
                    title: 'Playard Turbo Võidusõit',
                    elements: ['race_car', 'checkpoints', 'start_gate', 'nitro_pads']
                },
                safetyReport
            };
        }

        if (/survival|ellujäämine|ellujaamine/i.test(lower) && /tee|loo|mäng|ehita|build|create/i.test(lower)) {
            return {
                intent: 'CREATE_GAME',
                confidence: 0.95,
                rawText: text,
                parameters: {
                    theme: 'survival',
                    title: 'Playard Metsik Ellujäämine',
                    elements: ['campfire', 'shelter', 'trees', 'night_monsters']
                },
                safetyReport
            };
        }

        if (/horror|õudus|oudus/i.test(lower) && /tee|loo|mäng|ehita|build|create/i.test(lower)) {
            return {
                intent: 'CREATE_GAME',
                confidence: 0.95,
                rawText: text,
                parameters: {
                    theme: 'horror',
                    title: 'Playard Õudus & Hüljatud Haigla',
                    elements: ['dark_fog', 'flashlight', 'fuses', 'stalker']
                },
                safetyReport
            };
        }

        if (/tower defense|tornikaitse|torni kaitse/i.test(lower) && /tee|loo|mäng|ehita|build|create/i.test(lower)) {
            return {
                intent: 'CREATE_GAME',
                confidence: 0.95,
                rawText: text,
                parameters: {
                    theme: 'tower_defense',
                    title: 'Playard Baasi Tornikaitse',
                    elements: ['enemy_path', 'base_crystal', 'turrets', 'waves']
                },
                safetyReport
            };
        }

        if (/tornaado|tornado/i.test(lower) && /põgene|escape|run|mäng|game/i.test(lower)) {
            return {
                intent: 'CREATE_GAME',
                confidence: 0.98,
                rawText: text,
                parameters: {
                    theme: 'tornado_escape',
                    title: 'Tornaado Põgenemine',
                    elements: ['tornado', 'shelter', 'safe_zone', 'timer_hud', 'particles']
                },
                safetyReport
            };
        }


        if (/lennu|lennuk|lennujaam|flight|plane|airplane|airport/i.test(lower) && /tee|loo|mäng|game|ehita/i.test(lower)) {
            return {
                intent: 'CREATE_GAME',
                confidence: 0.95,
                rawText: text,
                parameters: {
                    theme: 'flight_simulator',
                    title: 'Lennujaama Simulaator',
                    elements: ['runway', 'hangar', 'airplane', 'controls', 'helipad', 'clouds']
                },
                safetyReport
            };
        }

        if (/obby|takistus|parkour|obstacle/i.test(lower) && /tee|loo|mäng|ehita/i.test(lower)) {
            return {
                intent: 'CREATE_GAME',
                confidence: 0.95,
                rawText: text,
                parameters: {
                    theme: 'obby_adventure',
                    title: 'Playard Parkuur',
                    elements: ['platforms', 'lava', 'checkpoints', 'finish_gate']
                },
                safetyReport
            };
        }

        if (/tee|loo|ehita|valmista|create|make|build/i.test(lower) && /mäng|game/i.test(lower)) {
            return {
                intent: 'CREATE_GAME',
                confidence: 0.85,
                rawText: text,
                parameters: {
                    theme: 'custom_adventure',
                    title: 'Playard Seiklus',
                    elements: ['terrain', 'buildings', 'spawn', 'npc', 'collectible_coins']
                },
                safetyReport
            };
        }

        // 2. Incremental Modifications
        // "Tee maja suuremaks"
        if (/maja|building|house/i.test(lower) && /suurem|suurenda|bigger|scale up|enlarge/i.test(lower)) {
            return {
                intent: 'MODIFY_OBJECT',
                confidence: 0.95,
                rawText: text,
                actionTarget: 'building',
                parameters: {
                    action: 'scale',
                    factor: 1.5,
                    targetName: 'building'
                },
                safetyReport
            };
        }

        // "Lisa siia lennujaam"
        if (/lisa|ehita|pane|add|spawn/i.test(lower) && /lennujaam|airport|runway/i.test(lower)) {
            return {
                intent: 'ADD_FEATURE',
                confidence: 0.96,
                rawText: text,
                actionTarget: 'airport',
                parameters: {
                    feature: 'airport',
                    name: 'Lennujaam & Rada'
                },
                safetyReport
            };
        }

        // "Muuda taevas öiseks" / "Muuda taevas päevaseks"
        if (/taevas|sky|night|öine|öis|öö|päev|day|dark|valge/i.test(lower)) {
            const isNight = /öö|öis|öine|night|dark|pime/i.test(lower);
            return {
                intent: 'CHANGE_ENVIRONMENT',
                confidence: 0.95,
                rawText: text,
                actionTarget: 'sky',
                parameters: {
                    skyMode: isNight ? 'night' : 'day',
                    lightColor: isNight ? 0x223366 : 0xffffff,
                    skyColor: isNight ? 0x05051a : 0x87ceeb
                },
                safetyReport
            };
        }

        // "Lisa mängijale 100 raha"
        const moneyMatch = lower.match(/(?:lisa|anna|give|add)\s*(?:mängijale|mull|mulle)?\s*(\d+)\s*(?:raha|münti|playbux|playcoins|coins|money)/i);
        if (moneyMatch) {
            const amount = parseInt(moneyMatch[1], 10);
            return {
                intent: 'UPDATE_GAME_RULES',
                confidence: 0.95,
                rawText: text,
                actionTarget: 'player_currency',
                parameters: {
                    action: 'add_currency',
                    amount: Math.min(amount, 10000) // capped
                },
                safetyReport
            };
        }

        // "Pane siia tornaado"
        if (/pane|lisa|spawn|add/i.test(lower) && /tornaado|tornado/i.test(lower)) {
            return {
                intent: 'ADD_FEATURE',
                confidence: 0.96,
                rawText: text,
                actionTarget: 'tornado',
                parameters: {
                    feature: 'tornado',
                    name: 'Hävitav Tornaado'
                },
                safetyReport
            };
        }

        // "Muuda mängija kiiremaks"
        if (/mängija|player|speed|kiirus|kiirem/i.test(lower) && /kiirem|tõsta|increase|fast/i.test(lower)) {
            return {
                intent: 'UPDATE_GAME_RULES',
                confidence: 0.94,
                rawText: text,
                actionTarget: 'player_speed',
                parameters: {
                    action: 'increase_speed',
                    multiplier: 1.5
                },
                safetyReport
            };
        }

        // Generic modification or addition
        if (/lisa|pane|ehita|add|put|place/i.test(lower)) {
            return {
                intent: 'ADD_FEATURE',
                confidence: 0.8,
                rawText: text,
                parameters: { feature: 'generic_prop', text },
                safetyReport
            };
        }

        // Default conversational response
        return {
            intent: 'HELP_OR_CHAT',
            confidence: 0.7,
            rawText: text,
            safetyReport
        };
    }
}
