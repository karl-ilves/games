import type { AiIntentType, AiSafetyReport } from '../types';
import { CodeSandbox } from './codeSandbox';

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

        // 1. Create Game Intents
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
        if (/taevas|sky|night|öine|päev|day|dark|valge/i.test(lower)) {
            const isNight = /öö|öine|night|dark|pime/i.test(lower);
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
