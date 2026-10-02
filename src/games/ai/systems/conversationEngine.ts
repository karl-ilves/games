import type { AiIntentType, AiSafetyReport, AiOperationalCategory, AiTaskTriage } from '../types';
import { CodeSandbox } from './codeSandbox';
import {
    PlayardGeneralKnowledge,
    PlayardMathEngine,
    PlayardTaskTriageEngine,
    PLAYARD_PIPELINE_STAGES,
    AiCodeAndSystemEngine,
    PLAYARD_GENRES_CATALOG,
    PlayardNaturalLanguageCompiler,
    PlayardPhysicsAndWeatherEngine,
    PlayardNpcAndStoryEngine,
    PlayardDataAndSocialEngine,
    PlayardProjectMemoryManager,
    PlayardAdvancedModelSynthesizer,
    PlayardEconomyAndBalanceEngine,
    PlayardPerformanceOptimizer,
    PlayardCoPilotAdvisor,
    PlayardWikipediaService,
    type PipelineStage
} from '../../../shared/playardAiKnowledge';
import { PlayardSkySystem } from '../../../shared/skySystem';


export interface ParsedCommand {
    intent: AiIntentType;
    category?: AiOperationalCategory;
    triage?: AiTaskTriage;
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
     * Triages user command into one of 3 operational categories:
     * - LOOMINE (Building / 3D Worlds / Meshes)
     * - PROGRAMMEERIMINE (Coding / Logic / Scripting / Triggers)
     * - SUHTLEMINE (Chat / Q&A / Knowledge / Mathematics)
     */
    public static triageInput(input: string): AiTaskTriage {
        return PlayardTaskTriageEngine.classify(input);
    }

    /**
     * Parses user command into structured intent, parameters, safety analysis, and operational category.
     */
    public static async parseInput(input: string, currentContext?: any): Promise<ParsedCommand> {
        const cmd = await this.internalParseInput(input, currentContext);
        const triage = PlayardTaskTriageEngine.classify(input);
        cmd.category = triage.category;
        cmd.triage = triage;
        return cmd;
    }

    private static async internalParseInput(input: string, currentContext?: any): Promise<ParsedCommand> {
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

        // 0.05 Live Wikipedia Search Query Fallback
        if (lower.includes('vikipeedia') || lower.includes('wikipedia') || lower.includes('vikipeedjast') || lower.includes('otsi wikist')) {
            const wikiArticle = await PlayardWikipediaService.fetchWikipediaSummary(text);
            if (wikiArticle) {
                return {
                    intent: 'GENERAL_KNOWLEDGE',
                    confidence: 0.99,
                    rawText: text,
                    parameters: {
                        answer: PlayardWikipediaService.formatWikipediaResponse(wikiArticle)
                    },
                    safetyReport
                };
            }
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

        // 0.4 Natural Language to Technical Plan Compiler (Muuda vabas keeles soov tehniliseks plaaniks)
        if (
            (lower.includes('tornaado') && (lower.includes('kahe minuti') || lower.includes('2 minuti') || lower.includes('kristall'))) ||
            lower.includes('tehniline plaan') || lower.includes('technical plan') ||
            lower.includes('muuda see tehniliseks plaaniks')
        ) {
            const plan = PlayardNaturalLanguageCompiler.compileToTechnicalPlan(text);
            return {
                intent: 'TECHNICAL_COMPILATION',
                confidence: 0.99,
                rawText: text,
                parameters: { plan },
                safetyReport
            };
        }

        // 0.5 In-Game Economy Balancer (TTU, Sink-Faucet ratio, inflation check)
        if (/tasakaalusta.*majandus|majandus.*tasakaal|majanduse.*analüüs|balance.*economy|majandustasakaal/i.test(lower)) {
            const balance = PlayardEconomyAndBalanceEngine.analyzeAndBalanceEconomy({});

            return {
                intent: 'ECONOMY_BALANCE',
                confidence: 0.98,
                rawText: text,
                parameters: { balance },
                safetyReport
            };
        }

        // 0.6 Automated 60 FPS Performance Optimizer (LOD, Draw Calls, Frustum culling)
        if (/optimeeri|jõudlus|performance|tõsta fps|60 fps/i.test(lower)) {
            const perf = PlayardPerformanceOptimizer.getOptimizationPlan(currentContext?.objects?.length || 24);
            return {
                intent: 'PERFORMANCE_OPTIMIZE',
                confidence: 0.98,
                rawText: text,
                parameters: { perf },
                safetyReport
            };
        }

        // 0.7 Proactive Co-Pilot Intelligence Advisor (Smart suggestions)
        if (/soovita|nõuanded|copilot|mida lisada|soovitused/i.test(lower)) {
            const advice = PlayardCoPilotAdvisor.generateSmartSuggestions();
            return {
                intent: 'COPILOT_ADVISE',
                confidence: 0.98,
                rawText: text,
                parameters: { advice },
                safetyReport
            };
        }

        // Advanced Sky & Atmosphere System ("Muuda taevas öiseks, lisa palju tähti ja suur kuu", päikeseloojang, vihm, torm, kosmos jne)
        const skyParsed = PlayardSkySystem.parseSkyIntent(text);
        if (skyParsed.matches && !/\b(mäng|game|mängu)\b/i.test(lower)) {
            return {
                intent: 'CHANGE_ENVIRONMENT',
                confidence: 0.98,
                rawText: text,
                actionTarget: 'sky',
                parameters: skyParsed.parameters,
                safetyReport
            };
        }

        // 1. Create Game Intents (Genres: Dragon Castle, Pirate Sea, Tycoon, Simulator, Racing, Survival, Horror, TD, Obby, Flight, Tornado)
        if (/draakon|loss|kindlus|dragon|castle|fantasy/i.test(lower) && /tee|loo|mäng|ehita|build|create/i.test(lower)) {
            return {
                intent: 'CREATE_GAME',
                confidence: 0.98,
                rawText: text,
                parameters: {
                    theme: 'dragon_castle',
                    title: 'Playard Draakoni & Lossi Seiklus',
                    elements: ['dragon', 'castle', 'drawbridge', 'runic_sword']
                },
                safetyReport
            };
        }

        if (/piraat|piraadilaev|mereröövel|mereseiklus|pirate/i.test(lower) && /tee|loo|mäng|ehita|build|create/i.test(lower)) {
            return {
                intent: 'CREATE_GAME',
                confidence: 0.98,
                rawText: text,
                parameters: {
                    theme: 'pirate_sea',
                    title: 'Playard Piraadisaare Seiklus',
                    elements: ['ship', 'ocean', 'cannons', 'treasure_chest']
                },
                safetyReport
            };
        }

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


        if (/lennu|lennuk|lennujaam|flight|\bplane\b|airplane|airport/i.test(lower) && /tee|loo|mäng|game|ehita/i.test(lower)) {
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

        // Universal Creation Intent: handles robots, dinosaurs, tanks, space, submarines, volcanoes, pyramids, or any custom game idea
        if (
            /robot|mech|dino|t-rex|tank|kosmos|ufo|space|tulnuk|allvee|submarine|vulkaan|lava|püramiid|pyramid/i.test(lower) &&
            /tee|loo|ehita|valmista|create|make|build/i.test(lower)
        ) {
            return {
                intent: 'CREATE_GAME',
                confidence: 0.98,
                rawText: text,
                parameters: {
                    theme: 'universal_custom',
                    title: text.replace(/^(?:palun\s+)?(?:tee|loo|ehita|valmista|create|build|make)\s+/i, '').trim(),
                    rawPrompt: text
                },
                safetyReport
            };
        }

        if (/tee|loo|ehita|valmista|create|make|build/i.test(lower) && /mäng|game|maailm|areen|seiklus/i.test(lower)) {
            return {
                intent: 'CREATE_GAME',
                confidence: 0.95,
                rawText: text,
                parameters: {
                    theme: 'universal_custom',
                    title: text.replace(/^(?:palun\s+)?(?:tee|loo|ehita|valmista|create|build|make)\s+(?:mulle\s+)?(?:uus\s+)?(?:mäng|maailm|game|areen|seiklus)?\s*/i, '').trim() || 'Playard Universaalne Seiklus',
                    rawPrompt: text
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
