export interface PlayerReport {
    id: string;
    targetPlayer: string;
    reporter: string;
    reason: string; // 'Cheating' | 'Spamming' | custom
    details?: string;
    game: string;
    createdAt: number;
    status: 'pending' | 'resolved';
}

export const PLAYER_REPORTS_STORAGE_KEY = 'playard_player_reports';

/**
 * Get all submitted player reports from localStorage.
 */
export function getPlayerReports(): PlayerReport[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
        const raw = localStorage.getItem(PLAYER_REPORTS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn('Failed to parse player reports from localStorage', e);
        return [];
    }
}

/**
 * Persist player reports to localStorage and dispatch custom event.
 */
export function savePlayerReports(reports: PlayerReport[]): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        localStorage.setItem(PLAYER_REPORTS_STORAGE_KEY, JSON.stringify(reports));
        window.dispatchEvent(new CustomEvent('playard:reports_updated', { detail: { reports } }));
    } catch (e) {
        console.warn('Failed to save player reports to localStorage', e);
    }
}

/**
 * Add a new report submitted by a player.
 */
export function addPlayerReport(data: {
    targetPlayer: string;
    reporter?: string;
    reason: string;
    details?: string;
    game?: string;
}): PlayerReport {
    const reports = getPlayerReports();
    const newReport: PlayerReport = {
        id: 'rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        targetPlayer: data.targetPlayer.trim(),
        reporter: (data.reporter || 'Anonymous').trim(),
        reason: data.reason.trim() || 'Cheating',
        details: (data.details || '').trim(),
        game: (data.game || 'Playard Game').trim(),
        createdAt: Date.now(),
        status: 'pending'
    };
    reports.unshift(newReport);
    savePlayerReports(reports);
    return newReport;
}

/**
 * Delete / dismiss a single report by ID.
 */
export function deletePlayerReport(reportId: string): boolean {
    const reports = getPlayerReports();
    const filtered = reports.filter(r => r.id !== reportId);
    savePlayerReports(filtered);
    return filtered.length !== reports.length;
}

/**
 * Clear all submitted reports.
 */
export function clearAllPlayerReports(): void {
    savePlayerReports([]);
}

/**
 * Count reports specifically targeting a given player username or display name.
 */
export function getReportsForPlayer(playerName: string): PlayerReport[] {
    const reports = getPlayerReports();
    const clean = playerName.toLowerCase().replace(/^[^\w\s]+/, '').replace(/✔.*$/, '').trim();
    return reports.filter(r => {
        const targetClean = r.targetPlayer.toLowerCase().replace(/^[^\w\s]+/, '').replace(/✔.*$/, '').trim();
        return targetClean === clean || r.targetPlayer.toLowerCase().includes(clean);
    });
}
