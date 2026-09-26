import { yardService } from '../../../shared/yardService';
import { getCurrentUserProfile } from '../../../auth';
import type { AiAuditLogEntry } from '../types';

export class AuditLogger {
    public static logAction(params: {
        prompt: string;
        intent: string;
        isSafe: boolean;
        riskLevel?: 'safe' | 'warning' | 'blocked';
        violations?: string[];
        stepsCount?: number;
        gameId?: string;
        gameTitle?: string;
        status?: 'success' | 'blocked' | 'error';
        error?: string;
    }): void {
        let username = 'Guest';
        try {
            const profile = getCurrentUserProfile();
            username = profile?.username || 'Guest';
        } catch (e) {
            username = yardService.getCurrentUsername() || 'Guest';
        }

        yardService.saveAiAuditLog({
            username,
            prompt: params.prompt,
            intent: params.intent,
            isSafe: params.isSafe,
            riskLevel: params.riskLevel,
            violations: params.violations,
            stepsCount: params.stepsCount || 0,
            gameId: params.gameId,
            gameTitle: params.gameTitle,
            status: params.status,
            error: params.error
        });
    }

    public static getLogs(): any[] {
        return yardService.getAiAuditLogs();
    }
}
