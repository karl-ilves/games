/**
 * Playard Game Close & Notice System
 *
 * Allows Playard Owner to:
 * 1. View all games (official games + Playard Owner created games + community games) in Owner Panel "Sulge mänge" tab.
 * 2. Delete / Close any game with "Kustuta".
 * 3. Send notices with "Teavita", configuring:
 *    - Notice title
 *    - Notice description
 *    - How many times the notice appears to players (e.g. 1, 2, 3, or every time = Infinity)
 *    - Or broadcast a global join warning:
 *      "Sorry. Update. Playard Game 2. Explanation: We will delete all games this Sunday at 14:00 UTC (16:00 Estonian time). We are making mobile gaming much better and updating everything. We apologize. Playard Game Team."
 * 4. Whenever a player joins ANY game (or in Hub / in-game), the warning popup is automatically presented in English.
 */

export interface GameCloseNoticeConfig {
    id: string;
    gameId?: string; // specific game or 'all' for all games
    gameTitle?: string;
    title: string;
    description: string;
    repeatCount: number; // 0 = unlimited / every time, or specific number of times
    active: boolean;
    createdAt: number;
    updatedAt: number;
}

export const GAME_CLOSE_NOTICES_STORAGE_KEY = 'playard_game_close_notices';
export const PLAYER_NOTICE_SEEN_STORAGE_KEY = 'playard_player_notice_seen_counts';

export const DEFAULT_SUNDAY_UPDATE_NOTICE: GameCloseNoticeConfig = {
    id: 'notice_playard_game_2_update',
    gameId: 'all',
    gameTitle: 'All Games (Playard Game 2)',
    title: 'Sorry. Update. Playard Game 2',
    description: 'We are deleting all games this Sunday at 14:00 UTC (16:00 Estonian time). We are making playing on phone/mobile much better and updating everything. We apologize. - Playard Game Team',
    repeatCount: 0, // every time a player joins
    active: true,
    createdAt: 1731427200000,
    updatedAt: 1731427200000
};

/**
 * Get all active notice configs. Initializes with default Sunday update notice if none exists.
 */
export function getGameCloseNotices(): GameCloseNoticeConfig[] {
    if (typeof window === 'undefined' || !window.localStorage) {
        return [DEFAULT_SUNDAY_UPDATE_NOTICE];
    }
    try {
        const raw = localStorage.getItem(GAME_CLOSE_NOTICES_STORAGE_KEY);
        if (raw) {
            const list: GameCloseNoticeConfig[] = JSON.parse(raw);
            if (Array.isArray(list) && list.length > 0) {
                return list;
            }
        }
    } catch (e) {
        console.warn('Failed to parse game close notices from storage', e);
    }

    // Default notice active
    const initial = [DEFAULT_SUNDAY_UPDATE_NOTICE];
    saveGameCloseNotices(initial);
    return initial;
}

/**
 * Save notices to localStorage and broadcast change.
 */
export function saveGameCloseNotices(list: GameCloseNoticeConfig[]): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        localStorage.setItem(GAME_CLOSE_NOTICES_STORAGE_KEY, JSON.stringify(list));
        window.dispatchEvent(new CustomEvent('playard:notices_updated', { detail: { notices: list } }));
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                const bc = new BroadcastChannel('playard_notices_sync');
                bc.postMessage({ type: 'notices_updated', notices: list });
                bc.close();
            }
        } catch (e) {}
    } catch (e) {
        console.warn('Failed to save game close notices', e);
    }
}

/**
 * Add or update a notice configuration.
 */
export function setGameCloseNotice(notice: GameCloseNoticeConfig): void {
    const list = getGameCloseNotices().filter(n => n.id !== notice.id);
    list.unshift(notice);
    saveGameCloseNotices(list);
}

/**
 * Remove or deactivate a notice configuration.
 */
export function removeGameCloseNotice(noticeId: string): void {
    const list = getGameCloseNotices().filter(n => n.id !== noticeId);
    saveGameCloseNotices(list);
}

/**
 * Seen counts map: noticeId -> count
 */
function getPlayerSeenMap(): Record<string, number> {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    try {
        const raw = localStorage.getItem(PLAYER_NOTICE_SEEN_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {};
}

function incrementPlayerSeen(noticeId: string): number {
    const map = getPlayerSeenMap();
    map[noticeId] = (map[noticeId] || 0) + 1;
    try {
        localStorage.setItem(PLAYER_NOTICE_SEEN_STORAGE_KEY, JSON.stringify(map));
    } catch (e) {}
    return map[noticeId];
}

/**
 * Check which notices should be shown when joining a game (or entering a game page).
 */
export function getPendingNoticesForGame(gameIdOrPath?: string): GameCloseNoticeConfig[] {
    const cleanId = (gameIdOrPath || '').toLowerCase();
    const notices = getGameCloseNotices().filter(n => n.active);
    const seenMap = getPlayerSeenMap();

    return notices.filter(n => {
        // Check game target
        if (n.gameId && n.gameId !== 'all') {
            const target = n.gameId.toLowerCase();
            if (!cleanId.includes(target) && cleanId !== target) {
                return false;
            }
        }

        // Check repeat count: 0 means unlimited (every time)
        if (n.repeatCount > 0) {
            const seen = seenMap[n.id] || 0;
            if (seen >= n.repeatCount) {
                return false;
            }
        }

        return true;
    });
}

/**
 * Displays a sleek modern English warning modal if there are pending notices when joining a game.
 */
export function showGameJoinWarningModal(options?: {
    gameId?: string;
    forceShow?: boolean;
    notice?: GameCloseNoticeConfig;
    onDismiss?: () => void;
}): void {
    if (!options?.forceShow && typeof window !== 'undefined' && (window as any).__PLAYARD_TEST_MODE__) {
        // In automated end-to-end tests, don't block clicks on game canvas/HUD with warning overlay
        return;
    }

    let targetNotices: GameCloseNoticeConfig[] = [];
    if (options?.notice) {
        targetNotices = [options.notice];
    } else if (options?.forceShow) {
        targetNotices = getGameCloseNotices().filter(n => n.active);
        if (targetNotices.length === 0) targetNotices = [DEFAULT_SUNDAY_UPDATE_NOTICE];
    } else {
        const path = (typeof window !== 'undefined' ? window.location.pathname : '').toLowerCase();
        targetNotices = getPendingNoticesForGame(options?.gameId || path);
    }

    if (targetNotices.length === 0) return;

    // Show the first pending notice
    const notice = targetNotices[0];
    incrementPlayerSeen(notice.id);

    // Remove any previous modal
    const existing = document.getElementById('modal-game-join-warning');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'modal-game-join-warning';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(4, 8, 16, 0.88);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        z-index: 200000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
        animation: joinWarningFadeIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;

    const card = document.createElement('div');
    card.id = 'game-join-warning-card';
    card.style.cssText = `
        background: linear-gradient(180deg, #1b1622 0%, #0d1117 100%);
        border: 2px solid #ff4757;
        border-radius: 20px;
        max-width: 520px;
        width: 100%;
        padding: 26px 24px;
        box-shadow: 0 25px 70px rgba(0, 0, 0, 0.9), 0 0 40px rgba(255, 71, 87, 0.35);
        color: #ffffff;
        text-align: center;
        font-family: 'Poppins', system-ui, -apple-system, sans-serif;
        box-sizing: border-box;
        position: relative;
    `;

    const seenTimes = getPlayerSeenMap()[notice.id] || 1;
    const repeatBadge = notice.repeatCount === 0
        ? '<span style="background: rgba(255, 71, 87, 0.15); color: #ff6b81; border: 1px solid rgba(255,71,87,0.4); padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 800;">⚠️ Appears on Every Join</span>'
        : `<span style="background: rgba(0, 242, 254, 0.15); color: #00f2fe; border: 1px solid rgba(0,242,254,0.4); padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 800;">Notice (${seenTimes}/${notice.repeatCount})</span>`;

    card.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 12px; filter: drop-shadow(0 0 16px rgba(255, 71, 87, 0.6));">⚠️📢</div>
        <div style="display: flex; justify-content: center; gap: 8px; align-items: center; margin-bottom: 10px;">
            <span style="background: rgba(255, 211, 42, 0.15); color: #ffd32a; border: 1px solid rgba(255,211,42,0.4); padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 800;">👑 Playard Owner Official Notice</span>
            ${repeatBadge}
        </div>
        <h2 id="join-warning-title" style="margin: 0 0 12px 0; color: #ff4757; font-size: 1.35rem; font-weight: 900; letter-spacing: 0.4px;">
            ${escapeHtml(notice.title)}
        </h2>
        <div style="background: rgba(0, 0, 0, 0.4); border-left: 4px solid #ff4757; padding: 14px 16px; border-radius: 10px; margin-bottom: 20px; text-align: left;">
            <p id="join-warning-desc" style="color: #f1f2f6; font-size: 0.96rem; line-height: 1.55; margin: 0; font-weight: 500;">
                ${escapeHtml(notice.description)}
            </p>
        </div>
        <div style="font-size: 0.82rem; color: #a4b0be; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span>📱</span>
            <em>We are upgrading the mobile experience and making all games faster!</em>
        </div>
        <button type="button" id="btn-dismiss-join-warning" style="
            width: 100%;
            padding: 13px;
            background: linear-gradient(135deg, #ff4757, #c0392b);
            color: #ffffff;
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 900;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(255, 71, 87, 0.45);
            transition: all 0.15s ease;
        ">
            I Understand / Continue to Game
        </button>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const dismissBtn = card.querySelector('#btn-dismiss-join-warning');
    const dismiss = () => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.2s ease';
        setTimeout(() => {
            overlay.remove();
            if (options?.onDismiss) options.onDismiss();
        }, 200);
    };

    dismissBtn?.addEventListener('click', dismiss);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) dismiss();
    });
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Global initialization helper for tests & devtools
if (typeof window !== 'undefined') {
    (window as any).getGameCloseNotices = getGameCloseNotices;
    (window as any).saveGameCloseNotices = saveGameCloseNotices;
    (window as any).setGameCloseNotice = setGameCloseNotice;
    (window as any).removeGameCloseNotice = removeGameCloseNotice;
    (window as any).showGameJoinWarningModal = showGameJoinWarningModal;
    (window as any).getPendingNoticesForGame = getPendingNoticesForGame;
}
