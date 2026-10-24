/**
 * Playard Plus Membership System
 * - Playard Plus 500: (P) in golden yellow/amber #ffd32a
 * - Playard Plus 2000: (2P00) in golden yellow/amber #ffd32a
 */

export type PlusTier = 'none' | 'plus500' | 'plus2000';

export interface PlusMembership {
    tier: PlusTier;
    subscribedAt?: number;
    username: string;
}

const PLUS_STORAGE_KEY = 'playard_plus_memberships';
const CURRENT_USER_PLUS_KEY = 'playard_current_user_plus';

/**
 * Get all plus memberships map (username -> tier)
 */
export function getAllPlusMemberships(): Record<string, PlusTier> {
    try {
        const raw = localStorage.getItem(PLUS_STORAGE_KEY);
        if (raw) {
            return JSON.parse(raw);
        }
    } catch (e) {}
    return {};
}

/**
 * Set a user's Plus tier
 */
export function setUserPlusTier(username: string, tier: PlusTier): void {
    if (!username) return;
    const cleanUser = username.trim().toLowerCase();
    const map = getAllPlusMemberships();
    if (tier === 'none') {
        delete map[cleanUser];
    } else {
        map[cleanUser] = tier;
    }
    try {
        localStorage.setItem(PLUS_STORAGE_KEY, JSON.stringify(map));
        // Also update current user plus if it's the current user
        const currentProfileRaw = localStorage.getItem('playard_current_user_profile');
        if (currentProfileRaw) {
            const p = JSON.parse(currentProfileRaw);
            if ((p.username || '').toLowerCase() === cleanUser) {
                localStorage.setItem(CURRENT_USER_PLUS_KEY, tier);
            }
        }
    } catch (e) {}
}

/**
 * Get Plus tier for a given username
 */
export function getUserPlusTier(username?: string | null): PlusTier {
    if (!username) {
        try {
            const currentTier = localStorage.getItem(CURRENT_USER_PLUS_KEY);
            if (currentTier === 'plus500' || currentTier === 'plus2000') return currentTier;
        } catch (e) {}
        return 'none';
    }

    const clean = username.trim().toLowerCase();
    const map = getAllPlusMemberships();
    if (map[clean]) return map[clean];

    // Check if current user
    try {
        const currentProfileRaw = localStorage.getItem('playard_current_user_profile');
        if (currentProfileRaw) {
            const p = JSON.parse(currentProfileRaw);
            if ((p.username || '').toLowerCase() === clean) {
                const currentTier = localStorage.getItem(CURRENT_USER_PLUS_KEY);
                if (currentTier === 'plus500' || currentTier === 'plus2000') return currentTier;
            }
        }
    } catch (e) {}

    return 'none';
}

/**
 * Formats a username with Plus golden tag if applicable
 * Example:
 * - plus500 -> "Nimi(P)" where "(P)" is colored gold #ffd32a
 * - plus2000 -> "Nimi(2P00)" where "(2P00)" is colored gold #ffd32a
 */
export function getPlusSuffix(tier: PlusTier): string {
    if (tier === 'plus500') return '(P)';
    if (tier === 'plus2000') return '(2P00)';
    return '';
}

/**
 * Returns HTML string with golden styled suffix
 */
export function formatUsernameWithPlusHtml(name: string, tier?: PlusTier): string {
    if (!name) return '';
    const resolvedTier = tier || getUserPlusTier(name);
    const suffix = getPlusSuffix(resolvedTier);
    if (!suffix) return name;

    // Check if name already contains the suffix
    if (name.includes(suffix)) return name;

    return `${name}<span class="playard-plus-golden-tag" style="color: #ffd32a; font-weight: 900; text-shadow: 0 0 10px rgba(255, 211, 42, 0.6); margin-left: 2px;">${suffix}</span>`;
}

/**
 * Plain-text formatted name with Plus tag
 */
export function formatUsernameWithPlusPlain(name: string, tier?: PlusTier): string {
    if (!name) return '';
    const resolvedTier = tier || getUserPlusTier(name);
    const suffix = getPlusSuffix(resolvedTier);
    if (!suffix) return name;
    if (name.includes(suffix)) return name;
    return `${name}${suffix}`;
}
