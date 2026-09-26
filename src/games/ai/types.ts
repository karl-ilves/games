export interface AiBuildStep {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    actionType?: string;
    details?: any;
}

export interface AiMessage {
    id: string;
    sender: 'user' | 'ai' | 'system';
    text: string;
    timestamp: number;
    clarificationOptions?: string[];
    codeSnippet?: string;
    steps?: AiBuildStep[];
    safetyWarning?: string;
    isVerificationReport?: boolean;
}

export interface AiSafetyReport {
    isSafe: boolean;
    riskLevel: 'safe' | 'warning' | 'blocked';
    violations: string[];
    inspectedActions: string[];
    permissionsRequired: string[];
}

export interface AiVerificationCheck {
    name: string;
    passed: boolean;
    message: string;
}

export interface AiVerificationResult {
    allChecksPassed: boolean;
    checks: AiVerificationCheck[];
    summary: string;
}

export interface AiAuditLogEntry {
    id: string;
    timestamp: number;
    username: string;
    prompt: string;
    intent: string;
    isSafe: boolean;
    riskLevel: 'safe' | 'warning' | 'blocked';
    violations?: string[];
    stepsCount: number;
    gameId?: string;
    gameTitle?: string;
    status: 'success' | 'blocked' | 'error';
    error?: string;
}

export type AiIntentType =
    | 'CREATE_GAME'
    | 'MODIFY_OBJECT'
    | 'ADD_FEATURE'
    | 'CHANGE_ENVIRONMENT'
    | 'UPDATE_GAME_RULES'
    | 'CLARIFICATION_NEEDED'
    | 'SECURITY_VIOLATION'
    | 'HELP_OR_CHAT';
