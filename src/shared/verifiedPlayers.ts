import { supabase } from '../lib/supabase';
import { getLocalProfiles, getCurrentUserProfile, isPlayardOwner, isOwnerUser, UserProfile } from '../auth';

export const VERIFIED_PLAYERS_STORAGE_KEY = 'playard_verified_players';

/**
 * Returns the list of usernames/identifiers that have the verified checkmark (✔).
 * Playard Owner is always implicitly verified.
 */
export function getVerifiedPlayers(): string[] {
    const defaultList = ['playard owner', '1karl.ilves@gmail.com', 'karl ilves'];
    try {
        const raw = localStorage.getItem(VERIFIED_PLAYERS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                const set = new Set<string>([...defaultList, ...parsed.map((s: string) => String(s).trim().toLowerCase())]);
                return Array.from(set);
            }
        }
    } catch (e) {}
    return defaultList;
}

/**
 * Persists the list of verified players to localStorage.
 */
export function saveVerifiedPlayers(list: string[]): void {
    try {
        const clean = Array.from(new Set(list.map(s => String(s).trim().toLowerCase()).filter(Boolean)));
        localStorage.setItem(VERIFIED_PLAYERS_STORAGE_KEY, JSON.stringify(clean));
    } catch (e) {}
}

/**
 * Checks if a given player username or email is verified to have the checkmark (✔).
 */
export function isPlayerVerified(identifier?: string | null, email?: string | null): boolean {
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanId && !cleanEmail) return false;

    // Playard Owner always has the checkmark
    if (
        isPlayardOwner(cleanEmail) ||
        isPlayardOwner(cleanId) ||
        isOwnerUser(cleanId) ||
        isOwnerUser({ username: cleanId, email: cleanEmail }) ||
        cleanId === 'playard owner' ||
        cleanId.startsWith('playard owner') ||
        cleanEmail === '1karl.ilves@gmail.com'
    ) {
        return true;
    }

    const verifiedList = getVerifiedPlayers();
    return verifiedList.some(item => {
        const v = item.trim().toLowerCase();
        return (cleanId && v === cleanId) || (cleanEmail && v === cleanEmail);
    });
}

/**
 * Adds a player to the verified checkmark list.
 */
export async function addVerifiedPlayer(identifier: string): Promise<{ success: boolean; message: string }> {
    const clean = (identifier || '').trim().toLowerCase().replace(/^@/, '');
    if (!clean) {
        return { success: false, message: 'Palun sisesta kasutajanimi või e-post!' };
    }

    const list = getVerifiedPlayers();
    if (!list.includes(clean)) {
        list.push(clean);
        saveVerifiedPlayers(list);
    }

    // Update local profile displayNames if matching
    try {
        const localProfiles = getLocalProfiles();
        let changed = false;
        localProfiles.forEach(p => {
            const pUser = (p.username || '').trim().toLowerCase();
            const pEmail = (p.email || '').trim().toLowerCase();
            if (pUser === clean || pEmail === clean) {
                const baseName = (p.displayName || p.username).replace(/[👑✅☑✔✓\s]+$/g, '').trim();
                p.displayName = `${baseName} ✔`;
                changed = true;
            }
        });
        if (changed) {
            localStorage.setItem('playard_user_profiles', JSON.stringify(localProfiles));
        }

        // Also update current user if active
        const current = getCurrentUserProfile();
        if (current) {
            const cUser = (current.username || '').trim().toLowerCase();
            const cEmail = (current.email || '').trim().toLowerCase();
            if (cUser === clean || cEmail === clean) {
                const baseName = (current.displayName || current.username).replace(/[👑✅☑✔✓\s]+$/g, '').trim();
                current.displayName = `${baseName} ✔`;
                localStorage.setItem('playard_current_user_profile', JSON.stringify(current));
                window.dispatchEvent(new CustomEvent('playard_auth_changed', { detail: { profile: current } }));
            }
        }
    } catch (e) {}

    // Cloud sync via Supabase if available
    syncVerifiedPlayersToCloud(list).catch(() => {});

    window.dispatchEvent(new CustomEvent('playard_verified_players_updated', { detail: { username: clean, verified: true } }));
    return { success: true, message: `✅ Mängijale "@${clean}" on edukalt lisatud nime lõppu kinnitatud linnuke ✔!` };
}

/**
 * Removes a player from the verified checkmark list.
 */
export async function removeVerifiedPlayer(identifier: string): Promise<{ success: boolean; message: string }> {
    const clean = (identifier || '').trim().toLowerCase().replace(/^@/, '');
    if (!clean) {
        return { success: false, message: 'Palun sisesta kasutajanimi või e-post!' };
    }

    if (
        isPlayardOwner(clean) ||
        clean === 'playard owner' ||
        clean === '1karl.ilves@gmail.com' ||
        clean === 'karl' ||
        clean === 'karl ilves'
    ) {
        return { success: false, message: '👑 Playard Owneri linnukest ei saa eemaldada!' };
    }

    const list = getVerifiedPlayers();
    const updated = list.filter(item => item !== clean);
    saveVerifiedPlayers(updated);

    // Strip checkmark from local profile displayNames if matching
    try {
        const localProfiles = getLocalProfiles();
        let changed = false;
        localProfiles.forEach(p => {
            const pUser = (p.username || '').trim().toLowerCase();
            const pEmail = (p.email || '').trim().toLowerCase();
            if (pUser === clean || pEmail === clean) {
                p.displayName = (p.displayName || p.username).replace(/\s*✔$/g, '').trim();
                changed = true;
            }
        });
        if (changed) {
            localStorage.setItem('playard_user_profiles', JSON.stringify(localProfiles));
        }

        // Also update current user if active
        const current = getCurrentUserProfile();
        if (current) {
            const cUser = (current.username || '').trim().toLowerCase();
            const cEmail = (current.email || '').trim().toLowerCase();
            if (cUser === clean || cEmail === clean) {
                current.displayName = (current.displayName || current.username).replace(/\s*✔$/g, '').trim();
                localStorage.setItem('playard_current_user_profile', JSON.stringify(current));
                window.dispatchEvent(new CustomEvent('playard_auth_changed', { detail: { profile: current } }));
            }
        }
    } catch (e) {}

    // Cloud sync via Supabase if available
    syncVerifiedPlayersToCloud(updated).catch(() => {});

    window.dispatchEvent(new CustomEvent('playard_verified_players_updated', { detail: { username: clean, verified: false } }));
    return { success: true, message: `Mängijalt "@${clean}" on nime lõpust linnuke ✔ eemaldatud.` };
}

/**
 * Toggles verification state for a player.
 */
export async function toggleVerifiedPlayer(identifier: string): Promise<{ success: boolean; message: string; verified: boolean }> {
    const isNowVerified = isPlayerVerified(identifier);
    if (isNowVerified) {
        const res = await removeVerifiedPlayer(identifier);
        return { ...res, verified: false };
    } else {
        const res = await addVerifiedPlayer(identifier);
        return { ...res, verified: true };
    }
}

/**
 * Cloud sync for verified players list.
 */
export async function syncVerifiedPlayersToCloud(list: string[]): Promise<void> {
    if (!supabase) return;
    try {
        const payload = JSON.stringify(list);
        await supabase.from('user_created_games').upsert({
            title: 'PLAYARD_SYSTEM_VERIFIED_PLAYERS',
            description: payload,
            category: 'system_verified_players',
            creator_username: 'playard owner'
        }, { onConflict: 'title' });
    } catch (e) {}
}

/**
 * Initial sync fetch from cloud.
 */
export async function loadVerifiedPlayersFromCloud(): Promise<string[]> {
    if (!supabase) return getVerifiedPlayers();
    try {
        const { data, error } = await supabase
            .from('user_created_games')
            .select('description')
            .eq('category', 'system_verified_players')
            .eq('title', 'PLAYARD_SYSTEM_VERIFIED_PLAYERS')
            .maybeSingle();

        if (data && data.description) {
            const parsed = JSON.parse(data.description);
            if (Array.isArray(parsed)) {
                const combined = Array.from(new Set([...getVerifiedPlayers(), ...parsed]));
                saveVerifiedPlayers(combined);
                return combined;
            }
        }
    } catch (e) {}
    return getVerifiedPlayers();
}
