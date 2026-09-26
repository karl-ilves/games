import type { AiSafetyReport } from '../types';

export class CodeSandbox {
    // Dangerous patterns that immediately block execution
    private static readonly BLOCKED_PATTERNS = [
        // 1. Database destruction
        { pattern: /\b(drop\s+table|delete\s+from\s+playard|cleardatabase|truncate|dropdatabase)\b/i, reason: 'Database deletion or table dropping attempt' },
        { pattern: /\b(indexeddb\.deletedatabase|clearlocalstorage|localstorage\.clear\(\))\b/i, reason: 'Local storage or database wipe attempt' },

        // 2. Admin account tampering & privilege escalation
        { pattern: /\b(makeadmin|promoteadmin|grantadmin|isadmin\s*=\s*true|role\s*:\s*['"]admin['"])\b/i, reason: 'Administrator account modification or privilege escalation' },
        { pattern: /\b(muuda\s+admin|anna\s+admini\s+õigused|tee\s+mind\s+adminiks|saa\s+adminiks)\b/i, reason: 'Unauthorized admin rights request' },

        // 3. Infinite currency exploit
        { pattern: /\b(infinite\s*(?:money|coins|yards|playbux|cash)|lõputult\s*(?:raha|münte|playbuxe|yarde))\b/i, reason: 'Infinite currency exploit' },
        { pattern: /(?:give_coins|give_yards|coins|yards)\s*[:=]\s*(?:9{7,}|Infinity|1e\d+)/i, reason: 'Exorbitant / infinite currency assignment' },

        // 4. Stealing credentials, tokens, or sessions
        { pattern: /\b(document\.cookie|sessionstorage|token|password|credential|stealkey)\b/i, reason: 'Attempt to access credentials, cookies, or secrets' },
        { pattern: /\b(eval\s*\(|new\s+Function\s*\(|window\.eval)\b/i, reason: 'Arbitrary dynamic code execution (eval / new Function)' },
        { pattern: /\b(fetch\s*\(|xmlhttprequest|navigator\.sendbeacon)\b/i, reason: 'Unauthorized external network / exfiltration request' },
        { pattern: /<script[\s>]/i, reason: 'Script tag injection' },

        // 5. Server tampering
        { pattern: /\b(rm\s+-rf|shutdown|killprocess|server\.close)\b/i, reason: 'Server disruption attempt' }
    ];

    private static readonly ALLOWED_SCRIPT_ACTIONS = new Set([
        'damage',
        'heal',
        'speed_boost',
        'jump_boost',
        'give_coins',
        'give_yards',
        'dialog',
        'teleport',
        'play_sound',
        'change_color',
        'animate_motion'
    ]);

    private static readonly ALLOWED_TRIGGERS = new Set([
        'onPlayerTouch',
        'onInteract',
        'onTimer',
        'onStart'
    ]);

    /**
     * Inspects a text prompt for security violations before processing.
     */
    public static inspectPrompt(prompt: string): AiSafetyReport {
        const violations: string[] = [];
        const lower = prompt.toLowerCase();

        for (const rule of this.BLOCKED_PATTERNS) {
            if (rule.pattern.test(lower)) {
                violations.push(rule.reason);
            }
        }

        if (violations.length > 0) {
            return {
                isSafe: false,
                riskLevel: 'blocked',
                violations,
                inspectedActions: [],
                permissionsRequired: ['BLOCKED']
            };
        }

        return {
            isSafe: true,
            riskLevel: 'safe',
            violations: [],
            inspectedActions: ['Prompt text analysis'],
            permissionsRequired: ['user_interaction']
        };
    }

    /**
     * Inspects a code snippet or Playard script object before allowing it into the engine.
     */
    public static inspectScriptCode(codeOrScript: string | any): AiSafetyReport {
        const violations: string[] = [];
        const inspectedActions: string[] = [];
        const permissions: string[] = [];

        const rawCode = typeof codeOrScript === 'string' ? codeOrScript : JSON.stringify(codeOrScript);

        // Check blocked patterns in raw string
        for (const rule of this.BLOCKED_PATTERNS) {
            if (rule.pattern.test(rawCode)) {
                violations.push(rule.reason);
            }
        }

        // If it's a structured script object, inspect actions and parameters
        if (typeof codeOrScript === 'object' && codeOrScript !== null) {
            const script = codeOrScript;

            if (script.trigger && !this.ALLOWED_TRIGGERS.has(script.trigger)) {
                violations.push(`Unrecognized or untrusted trigger: "${script.trigger}"`);
            }

            if (Array.isArray(script.actions)) {
                for (const act of script.actions) {
                    if (!act || !act.type) {
                        violations.push('Malformed script action missing type');
                        continue;
                    }

                    if (!this.ALLOWED_SCRIPT_ACTIONS.has(act.type)) {
                        violations.push(`Action type "${act.type}" is not in Playard safe whitelist`);
                        continue;
                    }

                    inspectedActions.push(act.type);

                    // Inspect bounds
                    if (act.type === 'give_coins' || act.type === 'give_yards') {
                        permissions.push('currency_modification');
                        const amt = Number(act.amount) || 0;
                        if (amt > 500) {
                            violations.push(`Currency reward (${amt}) exceeds single-action safety limit of 500`);
                        }
                    }

                    if (act.type === 'damage') {
                        permissions.push('player_health');
                        const amt = Number(act.amount) || 0;
                        if (amt > 100) {
                            violations.push(`Damage amount (${amt}) exceeds standard character max health of 100`);
                        }
                    }

                    if (act.type === 'teleport') {
                        permissions.push('player_transform');
                    }
                }
            }
        }

        const isSafe = violations.length === 0;
        return {
            isSafe,
            riskLevel: isSafe ? 'safe' : 'blocked',
            violations,
            inspectedActions: inspectedActions.length > 0 ? inspectedActions : ['Script syntax check'],
            permissionsRequired: Array.from(new Set(permissions))
        };
    }
}
