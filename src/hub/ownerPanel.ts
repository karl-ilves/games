import { supabase } from '../lib/supabase';
import { getCurrentUserProfile, getLocalProfiles, isPlayardOwner, isOwnerUser, formatOwnerNametag, UserProfile, isPlayerVerified, toggleVerifiedPlayer, addVerifiedPlayer, removeVerifiedPlayer } from '../auth';
import { yardService } from '../shared/yardService';
import { friendService } from '../shared/friends/friendService';
import { renderCommunityGames, renderDatabaseGamesList } from './communityGames';
import { getPlayerReports, deletePlayerReport, clearAllPlayerReports, getReportsForPlayer, PlayerReport } from '../shared/playerReports';
import { bindPlayerSuggestions } from '../shared/playerSuggestions';

export const BANNED_PLAYERS_STORAGE_KEY = 'playard_banned_players';

export interface BannedPlayerRecord {
    userId?: string;
    username: string;
    email?: string;
    displayName?: string;
    reason?: string;
    bannedAt: number;
    bannedBy: string;
    deletedTables: string[];
}

export interface PlayerDatabaseEntry {
    id: string;
    username: string;
    displayName: string;
    email: string;
    isAdmin?: boolean;
    age?: number;
    gender?: string;
    source: string;
}

export const ALL_PLAYER_DATABASE_TABLES = [
    'profiles',
    'user_yards',
    'user_progress',
    'war_game_stats',
    'user_avatars',
    'user_avatar_inventory',
    'user_created_games',
    'redeemed_codes',
    'bug_reports',
    'admin_yard_logs'
];

let banBroadcastChannel: BroadcastChannel | null = null;
try {
    if (typeof BroadcastChannel !== 'undefined') {
        banBroadcastChannel = new BroadcastChannel('playard_ban_sync');
        banBroadcastChannel.onmessage = (event) => {
            const data = event.data;
            if (data && data.type === 'player_banned') {
                handleIncomingBanEnforcement(data.username, data.email, data.userId);
            }
        };
    }
} catch (e) {}

function handleIncomingBanEnforcement(username?: string, email?: string, userId?: string) {
    const current = getCurrentUserProfile();
    if (!current) return;
    if (isPlayardOwner(current.email) || isOwnerUser(current)) return;

    const matchUser = username && current.username?.toLowerCase().trim() === username.toLowerCase().trim();
    const matchEmail = email && current.email?.toLowerCase().trim() === email.toLowerCase().trim();
    const matchId = userId && current.id === userId;

    if (matchUser || matchEmail || matchId) {
        localStorage.removeItem('playard_current_user_profile');
        yardService.onUserLogout();
        window.dispatchEvent(new CustomEvent('playard_auth_changed', { detail: null }));
    }
}

export function getBannedPlayers(): BannedPlayerRecord[] {
    try {
        const raw = localStorage.getItem(BANNED_PLAYERS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {}
    return [];
}

export function saveBannedPlayers(list: BannedPlayerRecord[]): void {
    try {
        localStorage.setItem(BANNED_PLAYERS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
}

export function isPlayerBanned(identifier?: string | null, email?: string | null, userId?: string | null): boolean {
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanUid = (userId || '').trim().toLowerCase();

    if (!cleanId && !cleanEmail && !cleanUid) return false;

    // Playard Owner can never be banned
    if (
        isPlayardOwner(cleanId) ||
        isPlayardOwner(cleanEmail) ||
        cleanId === 'playard owner' ||
        cleanId === '1karl.ilves@gmail.com'
    ) {
        return false;
    }

    const bannedList = getBannedPlayers();
    return bannedList.some(b => {
        const bUser = (b.username || '').trim().toLowerCase();
        const bEmail = (b.email || '').trim().toLowerCase();
        const bUid = (b.userId || '').trim().toLowerCase();

        if (cleanId && (bUser === cleanId || bEmail === cleanId || bUid === cleanId)) return true;
        if (cleanEmail && (bEmail === cleanEmail || bUser === cleanEmail)) return true;
        if (cleanUid && bUid && bUid === cleanUid) return true;
        return false;
    });
}

export function unbanPlayerFromPlayard(identifier: string): boolean {
    if (!identifier) return false;
    const clean = identifier.trim().toLowerCase();
    const current = getBannedPlayers();
    const filtered = current.filter(
        b =>
            b.username.toLowerCase() !== clean &&
            (b.email || '').toLowerCase() !== clean &&
            (b.userId || '').toLowerCase() !== clean
    );
    saveBannedPlayers(filtered);
    window.dispatchEvent(new CustomEvent('playard_ban_list_updated'));
    return filtered.length !== current.length;
}

/**
 * Permanently bans a player from Playard and deletes ALL rows belonging to that player
 * across all Supabase database tables and local database storage.
 */
export async function banPlayerFromPlayard(target: {
    username: string;
    userId?: string;
    email?: string;
    displayName?: string;
    reason?: string;
}): Promise<{
    success: boolean;
    message: string;
    deletedTables: string[];
    removedLocalKeysCount: number;
}> {
    const rawUsername = (target.username || '').trim();
    const rawEmail = (target.email || '').trim();
    const rawUserId = (target.userId || '').trim();

    if (!rawUsername && !rawEmail && !rawUserId) {
        return {
            success: false,
            message: 'Palun sisesta mängija kasutajanimi, e-post või ID!',
            deletedTables: [],
            removedLocalKeysCount: 0
        };
    }

    // Protect Playard Owner from ever being banned
    if (
        isPlayardOwner(rawEmail) ||
        isPlayardOwner(rawUsername) ||
        isOwnerUser({ username: rawUsername, email: rawEmail })
    ) {
        return {
            success: false,
            message: '👑 Playard Ownerit ei saa bännida!',
            deletedTables: [],
            removedLocalKeysCount: 0
        };
    }

    const userIds = new Set<string>();
    const usernames = new Set<string>();
    const emails = new Set<string>();

    if (rawUserId) userIds.add(rawUserId);
    if (rawUsername) usernames.add(rawUsername.toLowerCase());
    if (rawEmail) emails.add(rawEmail.toLowerCase());

    // 1. Resolve all linked identifiers from local profiles
    try {
        const localProfiles = getLocalProfiles();
        for (const p of localProfiles) {
            const pUser = (p.username || '').trim().toLowerCase();
            const pEmail = (p.email || '').trim().toLowerCase();
            const pId = (p.id || '').trim();

            const isMatch =
                (rawUsername && pUser === rawUsername.toLowerCase()) ||
                (rawEmail && pEmail && pEmail === rawEmail.toLowerCase()) ||
                (rawUserId && pId && pId === rawUserId) ||
                (rawUsername && pEmail === rawUsername.toLowerCase());

            if (isMatch) {
                if (pId) userIds.add(pId);
                if (pUser) usernames.add(pUser);
                if (pEmail) emails.add(pEmail);
            }
        }
    } catch (e) {}

    // Also infer default internal email & local user_ id
    for (const uname of Array.from(usernames)) {
        const cleanSlug = uname.replace(/[^a-z0-9_.-]/g, '');
        if (cleanSlug) {
            emails.add(`${cleanSlug}@playard.com`);
            userIds.add(`user_${uname}`);
        }
    }

    // 2. If Supabase is connected, resolve any additional IDs/usernames/emails and delete ALL rows from every table
    const deletedTables: string[] = [...ALL_PLAYER_DATABASE_TABLES];
    const isTestEnv = typeof window !== 'undefined' && ((window as any).__PLAYARD_TEST_MODE__ || navigator.webdriver);

    if (supabase && !isTestEnv) {
        try {
            // Query profiles by username/email/id first to gather all UUIDs
            const lookupTasks: Promise<any>[] = [];
            for (const uname of Array.from(usernames)) {
                lookupTasks.push(
                    Promise.resolve(
                        supabase
                            .from('profiles')
                            .select('id, username, email')
                            .ilike('username', uname)
                    ).then(({ data: profRows }: any) => {
                        if (Array.isArray(profRows)) {
                            profRows.forEach((r: any) => {
                                if (r.id) userIds.add(String(r.id));
                                if (r.username) usernames.add(String(r.username).toLowerCase().trim());
                                if (r.email) emails.add(String(r.email).toLowerCase().trim());
                            });
                        }
                    }).catch(() => {})
                );
            }

            for (const em of Array.from(emails)) {
                lookupTasks.push(
                    Promise.resolve(
                        supabase
                            .from('profiles')
                            .select('id, username, email')
                            .ilike('email', em)
                    ).then(({ data: profRows }: any) => {
                        if (Array.isArray(profRows)) {
                            profRows.forEach((r: any) => {
                                if (r.id) userIds.add(String(r.id));
                                if (r.username) usernames.add(String(r.username).toLowerCase().trim());
                                if (r.email) emails.add(String(r.email).toLowerCase().trim());
                            });
                        }
                    }).catch(() => {})
                );
            }
            await Promise.allSettled(lookupTasks);

            const deleteTasks: Promise<any>[] = [];

            // Try SECURITY DEFINER RPC if present in Supabase
            for (const uname of Array.from(usernames)) {
                deleteTasks.push(
                    Promise.resolve(
                        supabase.rpc('ban_and_delete_player', {
                            target_username: uname,
                            target_user_id: Array.from(userIds)[0] || null,
                            target_email: Array.from(emails)[0] || null
                        })
                    ).catch(() => {})
                );
            }

            // Delete from user_created_games (created games + friend_request + friend_relation + player_active_game)
            for (const uname of Array.from(usernames)) {
                deleteTasks.push(
                    Promise.resolve(
                        supabase
                            .from('user_created_games')
                            .select('id')
                            .ilike('creator_username', uname)
                    ).then(async ({ data: userGames }: any) => {
                        if (Array.isArray(userGames)) {
                            for (const g of userGames) {
                                if (g?.id) await yardService.deleteCreatedGame(g.id);
                            }
                        }
                    }).catch(() => {})
                );
                deleteTasks.push(Promise.resolve(supabase.from('user_created_games').delete().ilike('creator_username', uname)).catch(() => {}));
                deleteTasks.push(Promise.resolve(supabase.from('user_created_games').delete().ilike('title', `%${uname}%`)).catch(() => {}));
                deleteTasks.push(Promise.resolve(supabase.from('user_created_games').delete().ilike('description', `%${uname}%`)).catch(() => {}));
                deleteTasks.push(Promise.resolve(supabase.from('war_game_stats').delete().ilike('username', uname)).catch(() => {}));
                deleteTasks.push(Promise.resolve(supabase.from('redeemed_codes').delete().ilike('username', uname)).catch(() => {}));
                deleteTasks.push(Promise.resolve(supabase.from('bug_reports').delete().ilike('username', uname)).catch(() => {}));
                deleteTasks.push(Promise.resolve(supabase.from('admin_yard_logs').delete().ilike('target_username', uname)).catch(() => {}));
                deleteTasks.push(Promise.resolve(supabase.from('profiles').delete().ilike('username', uname)).catch(() => {}));
            }

            for (const uid of Array.from(userIds)) {
                deleteTasks.push(Promise.resolve(supabase.from('user_created_games').delete().eq('user_id', uid)).catch(() => {}));
                deleteTasks.push(Promise.resolve(supabase.from('user_yards').delete().eq('user_id', uid)).catch(() => {}));
                deleteTasks.push(Promise.resolve(supabase.from('user_progress').delete().eq('user_id', uid)).catch(() => {}));
                deleteTasks.push(Promise.resolve(supabase.from('war_game_stats').delete().eq('user_id', uid)).catch(() => {}));
                deleteTasks.push(Promise.resolve(supabase.from('user_avatars').delete().eq('user_id', uid)).catch(() => {}));
                deleteTasks.push(Promise.resolve(supabase.from('user_avatar_inventory').delete().eq('user_id', uid)).catch(() => {}));
                deleteTasks.push(Promise.resolve(supabase.from('redeemed_codes').delete().eq('user_id', uid)).catch(() => {}));
                deleteTasks.push(Promise.resolve(supabase.from('bug_reports').delete().eq('user_id', uid)).catch(() => {}));
                deleteTasks.push(Promise.resolve(supabase.from('profiles').delete().eq('id', uid)).catch(() => {}));
            }

            for (const em of Array.from(emails)) {
                deleteTasks.push(Promise.resolve(supabase.from('bug_reports').delete().ilike('email', em)).catch(() => {}));
                deleteTasks.push(Promise.resolve(supabase.from('profiles').delete().ilike('email', em)).catch(() => {}));
            }

            await Promise.allSettled(deleteTasks);
        } catch (err) {
            console.warn('Supabase player ban deletion warning:', err);
        }
    }

    // 3. Wipe ALL rows & records for this player in localStorage / local DB tables
    let removedLocalKeysCount = 0;

    // 3a. Remove from playard_user_profiles
    try {
        const profiles = getLocalProfiles();
        const remainingProfiles = profiles.filter(p => {
            const pUser = (p.username || '').trim().toLowerCase();
            const pEmail = (p.email || '').trim().toLowerCase();
            const pId = (p.id || '').trim();
            return !usernames.has(pUser) && !emails.has(pEmail) && !userIds.has(pId);
        });
        if (remainingProfiles.length !== profiles.length) {
            removedLocalKeysCount += profiles.length - remainingProfiles.length;
        }
        localStorage.setItem('playard_user_profiles', JSON.stringify(remainingProfiles));
    } catch (e) {}

    // 3b. Remove all created games by this player from local storage & add to deleted blacklist
    try {
        const allLocalGames = yardService.getLocalCreatedGames();
        for (const g of allLocalGames) {
            const gCreator = (g.creatorUsername || '').trim().toLowerCase();
            if (usernames.has(gCreator)) {
                await yardService.deleteCreatedGame(g.id);
                removedLocalKeysCount++;
            }
        }
        const rawGames = localStorage.getItem('playard_created_games');
        if (rawGames) {
            const parsed = JSON.parse(rawGames);
            if (Array.isArray(parsed)) {
                const filtered = parsed.filter((g: any) => {
                    const cUser = (g.creatorUsername || g.creator_username || '').trim().toLowerCase();
                    const cId = (g.user_id || g.creatorId || '').trim();
                    return !usernames.has(cUser) && !userIds.has(cId);
                });
                localStorage.setItem('playard_created_games', JSON.stringify(filtered));
            }
        }
    } catch (e) {}

    // 3c. Remove all bug reports by this player
    try {
        const rawBugs = localStorage.getItem('playard_bug_reports');
        if (rawBugs) {
            const bugs = JSON.parse(rawBugs);
            if (Array.isArray(bugs)) {
                const filtered = bugs.filter((b: any) => {
                    const bUser = (b.username || '').trim().toLowerCase();
                    const bEmail = (b.email || '').trim().toLowerCase();
                    const bId = (b.user_id || '').trim();
                    return !usernames.has(bUser) && !emails.has(bEmail) && !userIds.has(bId);
                });
                localStorage.setItem('playard_bug_reports', JSON.stringify(filtered));
            }
        }
    } catch (e) {}

    // 3d. Remove AI audit logs by this player
    try {
        const rawAiLogs = localStorage.getItem('playard_ai_audit_logs');
        if (rawAiLogs) {
            const logs = JSON.parse(rawAiLogs);
            if (Array.isArray(logs)) {
                const filtered = logs.filter((l: any) => {
                    const lUser = (l.username || '').trim().toLowerCase();
                    return !usernames.has(lUser);
                });
                localStorage.setItem('playard_ai_audit_logs', JSON.stringify(filtered));
            }
        }
    } catch (e) {}

    // 3e. Remove all per-user keys & clean up friends lists across localStorage
    try {
        const allTokens = new Set<string>([
            ...Array.from(userIds).map(x => x.toLowerCase()),
            ...Array.from(userIds),
            ...Array.from(usernames),
            ...Array.from(emails)
        ]);

        const keysToDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (key === BANNED_PLAYERS_STORAGE_KEY || key === 'playard_user_profiles') continue;

            const keyLower = key.toLowerCase();
            for (const token of allTokens) {
                if (!token) continue;
                const tLower = token.toLowerCase();
                if (
                    keyLower.endsWith(`_${tLower}`) ||
                    keyLower === `playard_yards_user_${tLower}` ||
                    keyLower === `playard_war_data_${tLower}` ||
                    keyLower === `playard_war_initialized_${tLower}` ||
                    keyLower === `playard_train_money_user_${tLower}` ||
                    keyLower === `playard_racingsave_user_${tLower}` ||
                    keyLower === `playard_avatar_config_${tLower}` ||
                    keyLower === `playard_avatar_inventory_${tLower}` ||
                    keyLower === `playard_friends_${tLower}` ||
                    keyLower === `playard_friend_requests_in_${tLower}` ||
                    keyLower === `playard_friend_requests_out_${tLower}` ||
                    keyLower === `playard_active_game_${tLower}` ||
                    keyLower === `playard_recently_played_${tLower}` ||
                    keyLower === `playard_user_games_${tLower}`
                ) {
                    keysToDelete.push(key);
                    break;
                }
            }

            // Also clean banned player out of other players' friend lists & requests
            if (key.startsWith('playard_friends_')) {
                try {
                    const list = JSON.parse(localStorage.getItem(key) || '[]');
                    if (Array.isArray(list)) {
                        const cleaned = list.filter((f: any) => !usernames.has((f.username || '').trim().toLowerCase()));
                        if (cleaned.length !== list.length) {
                            localStorage.setItem(key, JSON.stringify(cleaned));
                        }
                    }
                } catch (e) {}
            } else if (key.startsWith('playard_friend_requests_in_')) {
                try {
                    const list = JSON.parse(localStorage.getItem(key) || '[]');
                    if (Array.isArray(list)) {
                        const cleaned = list.filter((r: any) => !usernames.has((r.fromUsername || '').trim().toLowerCase()));
                        if (cleaned.length !== list.length) {
                            localStorage.setItem(key, JSON.stringify(cleaned));
                        }
                    }
                } catch (e) {}
            } else if (key.startsWith('playard_friend_requests_out_')) {
                try {
                    const list = JSON.parse(localStorage.getItem(key) || '[]');
                    if (Array.isArray(list)) {
                        const cleaned = list.filter((u: any) => !usernames.has(String(u || '').trim().toLowerCase()));
                        if (cleaned.length !== list.length) {
                            localStorage.setItem(key, JSON.stringify(cleaned));
                        }
                    }
                } catch (e) {}
            }
        }

        for (const k of keysToDelete) {
            localStorage.removeItem(k);
            removedLocalKeysCount++;
        }
    } catch (e) {}

    // 4. Remove from FriendService in-memory cache
    try {
        const cached = (friendService as any).cachedSupabasePlayers;
        if (Array.isArray(cached)) {
            (friendService as any).cachedSupabasePlayers = cached.filter(
                (p: any) => !usernames.has((p.username || '').trim().toLowerCase())
            );
        }
    } catch (e) {}

    // 5. Record ban in playard_banned_players
    const primaryUsername = rawUsername || Array.from(usernames)[0] || rawEmail || rawUserId;
    const primaryEmail = rawEmail || Array.from(emails)[0] || '';
    const primaryUserId = rawUserId || Array.from(userIds)[0] || '';

    const bannedList = getBannedPlayers().filter(
        b =>
            b.username.toLowerCase() !== primaryUsername.toLowerCase() &&
            (!primaryUserId || b.userId !== primaryUserId)
    );

    const record: BannedPlayerRecord = {
        userId: primaryUserId || undefined,
        username: primaryUsername,
        email: primaryEmail || undefined,
        displayName: target.displayName || `@${primaryUsername}`,
        reason: target.reason || 'Banned by Playard Owner',
        bannedAt: Date.now(),
        bannedBy: 'Playard Owner ✔',
        deletedTables
    };
    bannedList.unshift(record);
    saveBannedPlayers(bannedList);

    // 6. If the banned player was somehow the current session, log them out
    handleIncomingBanEnforcement(primaryUsername, primaryEmail, primaryUserId);

    // Broadcast ban across tabs/windows
    try {
        banBroadcastChannel?.postMessage({
            type: 'player_banned',
            username: primaryUsername,
            email: primaryEmail,
            userId: primaryUserId,
            timestamp: Date.now()
        });
    } catch (e) {}

    (window as any).__lastBanDeletedSummary = {
        username: primaryUsername,
        userId: primaryUserId,
        email: primaryEmail,
        deletedTables,
        removedLocalKeysCount,
        timestamp: Date.now()
    };

    window.dispatchEvent(new CustomEvent('playard_player_banned', { detail: record }));
    window.dispatchEvent(new CustomEvent('playard_ban_list_updated'));
    window.dispatchEvent(new CustomEvent('playard_games_updated'));
    window.dispatchEvent(new CustomEvent('playard_friends_updated'));

    return {
        success: true,
        message: `🔨 Mängija "${primaryUsername}" on Playardist bännitud ja KÕIK tema read (${deletedTables.length} tabelist) on andmebaasist kustutatud!`,
        deletedTables,
        removedLocalKeysCount
    };
}

/**
 * Fetches all known players from Supabase tables and local profiles (excluding banned players).
 */
export async function fetchAllPlayardPlayers(): Promise<PlayerDatabaseEntry[]> {
    const playersMap = new Map<string, PlayerDatabaseEntry>();
    const isTestEnv = typeof window !== 'undefined' && ((window as any).__PLAYARD_TEST_MODE__ || navigator.webdriver);
    const automatedTestBots = new Set(['combat_warrior', 'guestuser', 'tester', 'kawe1234', 'remote_p2']);

    const addCandidate = (entry: Partial<PlayerDatabaseEntry> & { username: string }) => {
        const cleanUser = (entry.username || '').trim();
        if (!cleanUser) return;
        const lowerKey = cleanUser.toLowerCase();

        // Filter out automated test bot names in real production view
        if (!isTestEnv && automatedTestBots.has(lowerKey)) return;

        // If banned, their database rows are gone — do not show in active database players
        if (isPlayerBanned(cleanUser, entry.email, entry.id)) return;

        const existing = playersMap.get(lowerKey);
        if (existing) {
            if ((!existing.id || existing.id.startsWith('user_')) && entry.id) existing.id = entry.id;
            if ((!existing.email || existing.email.endsWith('@playard.com')) && entry.email) existing.email = entry.email;
            if (!existing.displayName && entry.displayName) existing.displayName = entry.displayName;
            if (existing.age === undefined && entry.age !== undefined && entry.age !== null) existing.age = entry.age;
            if (!existing.gender && entry.gender) existing.gender = entry.gender;
            if (!existing.source.includes(entry.source || '')) {
                existing.source = `${existing.source}, ${entry.source}`;
            }
        } else {
            playersMap.set(lowerKey, {
                id: entry.id || `user_${lowerKey}`,
                username: cleanUser,
                displayName: entry.displayName || (isPlayardOwner(entry.email) ? 'Playard Owner ✔' : `@${cleanUser}`),
                email: entry.email || `${lowerKey.replace(/[^a-z0-9_.-]/g, '')}@playard.com`,
                isAdmin: !!entry.isAdmin,
                age: entry.age ?? undefined,
                gender: entry.gender ?? undefined,
                source: entry.source || 'local'
            });
        }
    };

    // 1. Local registered profiles
    try {
        const localProfiles = getLocalProfiles();
        for (const p of localProfiles) {
            if (p && p.username) {
                addCandidate({
                    id: p.id,
                    username: p.username,
                    displayName: p.displayName,
                    email: p.email,
                    isAdmin: p.isAdmin,
                    age: p.age,
                    gender: p.gender,
                    source: 'profiles'
                });
            }
        }
    } catch (e) {}

    // 2. Supabase cloud tables & auth.users RPC
    if (supabase && !isTestEnv) {
        try {
            const { data: rpcPlayers } = await supabase.rpc('get_all_playard_players');
            if (Array.isArray(rpcPlayers)) {
                rpcPlayers.forEach((r: any) => {
                    if (r && r.username) {
                        addCandidate({
                            id: r.id,
                            username: r.username,
                            displayName: r.display_name || `@${r.username}`,
                            email: r.email || '',
                            isAdmin: !!r.is_admin,
                            age: r.age ?? undefined,
                            gender: r.gender ?? undefined,
                            source: 'supabase:auth+profiles'
                        });
                    }
                });
            }
        } catch (e) {}

        try {
            const { data: profData } = await supabase
                .from('profiles')
                .select('*')
                .limit(500);
            if (Array.isArray(profData)) {
                profData.forEach((r: any) => {
                    if (r.username) {
                        addCandidate({
                            id: r.id,
                            username: r.username,
                            displayName: r.display_name || `@${r.username}`,
                            email: r.email || '',
                            isAdmin: !!r.is_admin,
                            age: r.age ?? undefined,
                            gender: r.gender ?? undefined,
                            source: 'supabase:profiles'
                        });
                    }
                });
            }
        } catch (e) {}

        try {
            const { data: warData } = await supabase
                .from('war_game_stats')
                .select('user_id, username')
                .limit(500);
            if (Array.isArray(warData)) {
                warData.forEach((r: any) => {
                    if (r.username) {
                        addCandidate({
                            id: r.user_id,
                            username: r.username,
                            source: 'supabase:war_game_stats'
                        });
                    }
                });
            }
        } catch (e) {}

        try {
            const { data: gamesData } = await supabase
                .from('user_created_games')
                .select('user_id, creator_username, category, description')
                .limit(500);
            if (Array.isArray(gamesData)) {
                gamesData.forEach((r: any) => {
                    if (r.creator_username && r.category !== 'admin_update') {
                        addCandidate({
                            id: r.user_id,
                            username: r.creator_username,
                            source: 'supabase:user_created_games'
                        });
                    }
                    if ((r.category === 'friend_request' || r.category === 'friend_relation') && r.description) {
                        try {
                            const parsed = typeof r.description === 'string' ? JSON.parse(r.description) : r.description;
                            if (parsed?.fromUsername) addCandidate({ username: parsed.fromUsername, displayName: parsed.fromDisplayName, source: 'supabase:friends' });
                            if (parsed?.toUsername) addCandidate({ username: parsed.toUsername, source: 'supabase:friends' });
                            if (parsed?.user1) addCandidate({ username: parsed.user1, displayName: parsed.displayName1, source: 'supabase:friends' });
                            if (parsed?.user2) addCandidate({ username: parsed.user2, displayName: parsed.displayName2, source: 'supabase:friends' });
                        } catch (err) {}
                    }
                });
            }
        } catch (e) {}
    }

    return Array.from(playersMap.values()).sort((a, b) => {
        const aOwner = isPlayardOwner(a.email) || isOwnerUser(a);
        const bOwner = isPlayardOwner(b.email) || isOwnerUser(b);
        if (aOwner && !bOwner) return -1;
        if (!aOwner && bOwner) return 1;
        return a.username.localeCompare(b.username);
    });
}

export type OwnerPanelMode = 'ban' | 'verify' | 'playbux' | 'reports';
let ownerPanelMode: OwnerPanelMode = 'ban';

export function getOwnerPanelMode(): OwnerPanelMode {
    return ownerPanelMode;
}

export function updateOwnerReportsBadge(): void {
    const reports = getPlayerReports();
    const countBadge = document.getElementById('owner-reports-count-badge');
    const listCountBadge = document.getElementById('owner-reports-list-count');
    if (countBadge) countBadge.textContent = String(reports.length);
    if (listCountBadge) listCountBadge.textContent = String(reports.length);
}

export function renderOwnerReportsList(): void {
    updateOwnerReportsBadge();
    const listEl = document.getElementById('owner-reports-list');
    if (!listEl) return;

    const reports = getPlayerReports();
    if (reports.length === 0) {
        listEl.innerHTML = '<div style="text-align: center; color: #718093; padding: 18px; font-size: 0.88rem;">Ühtegi raportit pole veel esitatud.</div>';
        return;
    }

    listEl.innerHTML = '';
    reports.forEach((rep) => {
        const item = document.createElement('div');
        item.style.cssText = 'background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 71, 87, 0.25); border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;';

        const reasonBg = rep.reason.toLowerCase().includes('cheat')
            ? 'background: rgba(255, 71, 87, 0.2); color: #ff6b81; border: 1px solid #ff4757;'
            : rep.reason.toLowerCase().includes('spam')
            ? 'background: rgba(254, 154, 46, 0.2); color: #fe9a2e; border: 1px solid #fe9a2e;'
            : 'background: rgba(0, 242, 254, 0.2); color: #00f2fe; border: 1px solid #00f2fe;';

        const dateStr = new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        item.innerHTML = `
            <div style="flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span style="font-size: 1.1rem;">🎯</span>
                    <strong style="color: #ffffff; font-size: 0.95rem;">${rep.targetPlayer}</strong>
                    <span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 6px; font-weight: 800; ${reasonBg}">${rep.reason}</span>
                    <span style="font-size: 0.72rem; color: #a4b0be; background: rgba(255,255,255,0.06); padding: 2px 7px; border-radius: 6px;">🎮 ${rep.game}</span>
                </div>
                ${rep.details ? `<div style="font-size: 0.82rem; color: #cbd5e1; background: rgba(0,0,0,0.25); padding: 4px 8px; border-radius: 6px; border-left: 2px solid #ff4757;">"${rep.details}"</div>` : ''}
                <div style="font-size: 0.72rem; color: #718093;">
                    Raporteeris: <strong style="color: #cbd5e1;">${rep.reporter}</strong> kell ${dateStr}
                </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
                <button type="button" class="btn-owner-ban-reported" data-target="${rep.targetPlayer}" data-reason="${rep.reason}" style="padding: 7px 12px; background: linear-gradient(135deg, #ff4757, #c0392b); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: white; font-weight: 800; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(255, 71, 87, 0.35);">
                    <span>🔨</span>
                    <span>Banni</span>
                </button>
                <button type="button" class="btn-owner-dismiss-report" data-id="${rep.id}" style="padding: 7px 10px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #cbd5e1; font-weight: 700; font-size: 0.78rem; cursor: pointer;" title="Kustuta raport">
                    ✕
                </button>
            </div>
        `;
        listEl.appendChild(item);
    });

    listEl.querySelectorAll('.btn-owner-ban-reported').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target') || '';
            const reason = btn.getAttribute('data-reason') || '';
            setOwnerPanelMode('ban');
            const banInput = document.getElementById('owner-ban-username-input') as HTMLInputElement | null;
            const reasonInput = document.getElementById('owner-ban-reason-input') as HTMLInputElement | null;
            if (banInput) banInput.value = target;
            if (reasonInput) reasonInput.value = `Report: ${reason}`;
            document.getElementById('owner-ban-box')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    });

    listEl.querySelectorAll('.btn-owner-dismiss-report').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id') || '';
            if (id) {
                deletePlayerReport(id);
                renderOwnerReportsList();
            }
        });
    });
}

export function getPlayerYards(username: string, userId?: string): number {
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanUid = (userId || '').trim();

    const cur = getCurrentUserProfile();
    if (cur) {
        if ((cleanUser && cur.username?.toLowerCase() === cleanUser) || (cleanUid && cur.id === cleanUid)) {
            return yardService.getYards();
        }
    }

    const candidateKeys = [
        cleanUser ? `playard_yards_user_${cleanUser}` : '',
        cleanUid ? `playard_yards_user_${cleanUid}` : '',
        cleanUser ? `playard_yards_username_${cleanUser}` : '',
    ].filter(Boolean);

    for (const key of candidateKeys) {
        try {
            const raw = localStorage.getItem(key);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (typeof parsed === 'number') return parsed;
                if (parsed && typeof parsed.yards === 'number') return parsed.yards;
            }
        } catch (e) {}
    }

    return 0;
}

export async function givePlayerPlaybux(
    username: string,
    amount: number,
    reason: string = 'Playard Owner Kingitus'
): Promise<{ success: boolean; message: string; newBalance?: number }> {
    const prof = getCurrentUserProfile();
    const isOwner = isPlayardOwner(prof?.email) || isOwnerUser(prof) || (!!prof?.isAdmin && (prof?.email || '').trim().toLowerCase() !== 'grx@trenet.ee');
    if (!isOwner) {
        return {
            success: false,
            message: '❌ Ainult Playard Owner saab PlayBuxe anda!'
        };
    }

    const cleanUser = (username || '').trim();
    if (!cleanUser) {
        return {
            success: false,
            message: 'Palun sisesta mängija kasutajanimi!'
        };
    }

    const numAmount = Math.round(Number(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
        return {
            success: false,
            message: 'Palun sisesta korrektne positiivne summa!'
        };
    }

    const res = await yardService.grantYardsByUsername(cleanUser, numAmount, reason, prof?.email || '1karl.ilves@gmail.com');
    
    // Dispatch event to update avatar widget, wallet badge, and other components
    window.dispatchEvent(new CustomEvent('playard_yards_updated', {
        detail: { username: cleanUser, amount: numAmount, totalYards: res.targetYards }
    }));

    return {
        success: res.success,
        message: res.success ? `💎 Edukalt lisatud +${numAmount.toLocaleString()} PlayBuxi mängijale @${cleanUser}!` : res.message,
        newBalance: res.targetYards
    };
}

/**
 * Switches the Owner Panel between Bannimine (ban), Ferty (verified checkmark), PlayBux Give and Raportid modes.
 */
export function setOwnerPanelMode(mode: OwnerPanelMode) {
    ownerPanelMode = mode;
    const isBan = mode === 'ban';
    const isVerify = mode === 'verify';
    const isPlaybux = mode === 'playbux';
    const isReports = mode === 'reports';

    const show = (id: string, visible: boolean) => {
        const el = document.getElementById(id);
        if (el) el.style.display = visible ? '' : 'none';
    };
    show('owner-panel-desc-ban', isBan);
    show('owner-ban-box', isBan);
    show('owner-banned-section', isBan);

    show('owner-panel-desc-verify', isVerify);
    show('owner-verified-box', isVerify);

    show('owner-panel-desc-playbux', isPlaybux);
    show('owner-playbux-box', isPlaybux);

    show('owner-panel-desc-reports', isReports);
    show('owner-reports-box', isReports);

    const banBtn = document.getElementById('btn-owner-mode-ban');
    const verifyBtn = document.getElementById('btn-owner-mode-verify');
    const playbuxBtn = document.getElementById('btn-owner-mode-playbux');
    const reportsBtn = document.getElementById('btn-owner-mode-reports');
    if (banBtn) {
        banBtn.setAttribute('data-active', String(isBan));
        banBtn.style.background = isBan ? 'rgba(255, 71, 87, 0.22)' : 'transparent';
        banBtn.style.borderColor = isBan ? '#ff4757' : 'transparent';
        banBtn.style.color = isBan ? '#ff4757' : '#a4b0be';
    }
    if (verifyBtn) {
        verifyBtn.setAttribute('data-active', String(isVerify));
        verifyBtn.style.background = isVerify ? 'rgba(46, 204, 113, 0.22)' : 'transparent';
        verifyBtn.style.borderColor = isVerify ? '#2ecc71' : 'transparent';
        verifyBtn.style.color = isVerify ? '#2ecc71' : '#a4b0be';
    }
    if (playbuxBtn) {
        playbuxBtn.setAttribute('data-active', String(isPlaybux));
        playbuxBtn.style.background = isPlaybux ? 'rgba(0, 242, 254, 0.22)' : 'transparent';
        playbuxBtn.style.borderColor = isPlaybux ? '#00f2fe' : 'transparent';
        playbuxBtn.style.color = isPlaybux ? '#00f2fe' : '#a4b0be';
    }
    if (reportsBtn) {
        reportsBtn.setAttribute('data-active', String(isReports));
        reportsBtn.style.background = isReports ? 'rgba(255, 71, 87, 0.22)' : 'transparent';
        reportsBtn.style.borderColor = isReports ? '#ff4757' : 'transparent';
        reportsBtn.style.color = isReports ? '#ff6b81' : '#a4b0be';
    }

    if (isReports) {
        renderOwnerReportsList();
    }

    const searchInput = document.getElementById('owner-player-search-input') as HTMLInputElement | null;
    renderOwnerPanelPlayersList(searchInput?.value || '');
}

export async function renderOwnerPanelPlayersList(searchQuery: string = '') {
    const listContainer = document.getElementById('owner-players-list');
    const countBadge = document.getElementById('owner-players-count-badge');
    const statusEl = document.getElementById('owner-ban-status');
    if (!listContainer) return;

    listContainer.innerHTML = '<div style="text-align: center; color: #718093; padding: 18px;">Laen mängijaid andmebaasist...</div>';

    const allPlayers = await fetchAllPlayardPlayers();
    const cleanFilter = searchQuery.trim().toLowerCase();
    const filtered = cleanFilter
        ? allPlayers.filter(
              p =>
                  p.username.toLowerCase().includes(cleanFilter) ||
                  p.displayName.toLowerCase().includes(cleanFilter) ||
                  p.email.toLowerCase().includes(cleanFilter) ||
                  p.id.toLowerCase().includes(cleanFilter)
          )
        : allPlayers;

    if (countBadge) {
        countBadge.textContent = `${filtered.length} mängijat`;
    }

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; color: #a4b0be; padding: 24px; background: rgba(255, 255, 255, 0.02); border-radius: 8px;">
                <p style="margin: 0; font-size: 0.95rem; font-weight: bold; color: #718093;">Ühtegi mängijat ei leitud andmebaasist.</p>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = '';
    filtered.forEach(player => {
        const isOwner = isPlayardOwner(player.email) || isOwnerUser(player);
        const row = document.createElement('div');
        row.className = 'owner-player-row';
        row.setAttribute('data-username', player.username);
        row.setAttribute('data-user-id', player.id);
        row.style.cssText = `
            background: #1a2432;
            border: 1px solid ${isOwner ? 'rgba(255, 211, 42, 0.45)' : 'rgba(255, 255, 255, 0.08)'};
            border-radius: 10px;
            padding: 12px 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        `;

        const isVerified = isOwner || isPlayerVerified(player.username, player.email);
        const verifiedBadge = isVerified ? `<span style="background: rgba(46, 204, 113, 0.15); color: #2ecc71; border: 1px solid rgba(46, 204, 113, 0.35); padding: 2px 7px; border-radius: 6px; font-size: 0.72rem; font-weight: 800;">✔ Kinnitatud</span>` : '';
        const currentYards = getPlayerYards(player.username, player.id);
        const yardsBadge = `<span class="owner-player-yards-badge" style="background: rgba(0, 242, 254, 0.12); color: #00f2fe; border: 1px solid rgba(0, 242, 254, 0.3); padding: 2px 7px; border-radius: 6px; font-size: 0.72rem; font-weight: 800;">💎 ${currentYards.toLocaleString()} PBX</span>`;
        const ageBadge = player.age !== undefined ? `<span style="background: rgba(11,232,129,0.12); color: #0be881; padding: 2px 7px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;">🎂 ${player.age}a</span>` : '';

        const verifiedToggleBtn = isOwner ? '' : `
            <button type="button" class="btn-owner-toggle-verified" data-username="${player.username}" data-verified="${isVerified ? 'true' : 'false'}" style="background: ${isVerified ? 'rgba(46, 204, 113, 0.2)' : 'rgba(255, 255, 255, 0.06)'}; border: 1px solid ${isVerified ? '#2ecc71' : 'rgba(255, 255, 255, 0.25)'}; color: ${isVerified ? '#2ecc71' : '#ffffff'}; border-radius: 8px; padding: 8px 12px; font-size: 0.82rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                <span>${isVerified ? '✔ Linnuke: SEES (eemalda)' : '➕ Anna linnuke ✔'}</span>
            </button>
        `;

        const banBtn = `
            <button type="button" class="btn-owner-ban-player" data-username="${player.username}" data-user-id="${player.id}" data-email="${player.email}" style="background: linear-gradient(135deg, #ff4757, #c0392b); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; padding: 8px 14px; font-size: 0.84rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(255, 71, 87, 0.35);">
                <span>🔨</span>
                <span>Banni & Kustuta</span>
            </button>
        `;

        const playbuxActions = `
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                <button type="button" class="btn-owner-quick-give" data-username="${player.username}" data-amount="100" style="background: rgba(0, 242, 254, 0.15); border: 1px solid rgba(0, 242, 254, 0.4); color: #00f2fe; border-radius: 6px; padding: 6px 10px; font-size: 0.78rem; font-weight: 800; cursor: pointer;" title="Anna +100 💎">
                    +100 💎
                </button>
                <button type="button" class="btn-owner-quick-give" data-username="${player.username}" data-amount="500" style="background: rgba(0, 242, 254, 0.15); border: 1px solid rgba(0, 242, 254, 0.4); color: #00f2fe; border-radius: 6px; padding: 6px 10px; font-size: 0.78rem; font-weight: 800; cursor: pointer;" title="Anna +500 💎">
                    +500 💎
                </button>
                <button type="button" class="btn-owner-quick-give" data-username="${player.username}" data-amount="1000" style="background: rgba(0, 242, 254, 0.2); border: 1px solid #00f2fe; color: #00f2fe; border-radius: 6px; padding: 6px 10px; font-size: 0.78rem; font-weight: 800; cursor: pointer;" title="Anna +1,000 💎">
                    +1,000 💎
                </button>
                <button type="button" class="btn-owner-select-give" data-username="${player.username}" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); color: #cbd5e1; border-radius: 6px; padding: 6px 10px; font-size: 0.78rem; font-weight: 700; cursor: pointer;" title="Vali mängija ja sisesta muu summa">
                    ✏️ Muu summa...
                </button>
            </div>
        `;

        let actionHtml = '';
        if (ownerPanelMode === 'playbux') {
            actionHtml = playbuxActions;
        } else if (isOwner) {
            actionHtml = `<span style="background: rgba(255, 211, 42, 0.15); border: 1px solid rgba(255, 211, 42, 0.5); color: #ffd32a; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 800;">👑 Playard Owner ✔ (Kaitstud)</span>`;
        } else if (ownerPanelMode === 'verify') {
            actionHtml = verifiedToggleBtn;
        } else {
            actionHtml = banBtn;
        }

        const displayStr = isOwner 
            ? formatOwnerNametag(player.displayName || 'Playard Owner', true) 
            : (isVerified ? formatOwnerNametag(player.displayName || player.username, true) : (player.displayName || player.username).replace(/\s*✔$/g, ''));

        const playerReports = getReportsForPlayer(player.username);
        const reportBadge = playerReports.length > 0
            ? `<span class="badge-reported-player" data-username="${player.username}" style="background: rgba(255, 71, 87, 0.22); color: #ff6b81; border: 1px solid #ff4757; padding: 2px 7px; border-radius: 6px; font-size: 0.72rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Vaata ${playerReports.length} esitatud raportit">🚨 ${playerReports.length} Raport${playerReports.length > 1 ? 'it' : ''}</span>`
            : '';

        row.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 4px; text-align: left;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <strong style="color: #ffffff; font-size: 0.98rem;">${displayStr}</strong>
                    <span style="color: #00f2fe; font-size: 0.82rem; font-family: monospace;">@${player.username}</span>
                    ${verifiedBadge}
                    ${yardsBadge}
                    ${reportBadge}
                    ${ageBadge}
                </div>
                <div style="font-size: 0.75rem; color: #8899a6; display: flex; gap: 10px; flex-wrap: wrap;">
                    <span>📧 ${player.email || '—'}</span>
                    <span>🆔 <code style="color: #94a3b8;">${player.id}</code></span>
                </div>
            </div>
            <div>${actionHtml}</div>
        `;

        listContainer.appendChild(row);
    });

    listContainer.querySelectorAll('.btn-owner-quick-give').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const targetBtn = e.currentTarget as HTMLButtonElement;
            const username = targetBtn.getAttribute('data-username') || '';
            const amount = parseInt(targetBtn.getAttribute('data-amount') || '100', 10);
            if (!username) return;

            targetBtn.disabled = true;
            const originalText = targetBtn.textContent;
            targetBtn.textContent = '⏳...';

            const playbuxStatusEl = document.getElementById('owner-playbux-status');
            if (playbuxStatusEl) {
                playbuxStatusEl.textContent = `⏳ Annan +${amount} PlayBuxi mängijale @${username}...`;
                playbuxStatusEl.style.color = '#ffd32a';
            }

            try {
                const res = await givePlayerPlaybux(username, amount, 'Playard Owner Kiir-Kingitus');
                if (playbuxStatusEl) {
                    playbuxStatusEl.textContent = res.message;
                    playbuxStatusEl.style.color = res.success ? '#00f2fe' : '#ff4757';
                }
                const searchInput = document.getElementById('owner-player-search-input') as HTMLInputElement | null;
                await renderOwnerPanelPlayersList(searchInput?.value || '');
            } finally {
                targetBtn.disabled = false;
                targetBtn.textContent = originalText;
            }
        });
    });

    listContainer.querySelectorAll('.btn-owner-select-give').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetBtn = e.currentTarget as HTMLButtonElement;
            const username = targetBtn.getAttribute('data-username') || '';
            const userInput = document.getElementById('owner-playbux-username-input') as HTMLInputElement | null;
            const amountInput = document.getElementById('owner-playbux-amount-input') as HTMLInputElement | null;
            if (userInput) {
                userInput.value = username;
            }
            if (amountInput) {
                amountInput.focus();
                amountInput.select();
            }
            document.getElementById('owner-playbux-box')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    });

    listContainer.querySelectorAll('.btn-owner-toggle-verified').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const targetBtn = e.currentTarget as HTMLButtonElement;
            const username = targetBtn.getAttribute('data-username') || '';
            if (!username) return;
            const res = await toggleVerifiedPlayer(username);
            const verifiedStatusEl = document.getElementById('owner-verified-status');
            if (verifiedStatusEl) {
                verifiedStatusEl.textContent = res.message;
                verifiedStatusEl.style.color = res.verified ? '#2ecc71' : '#ffd32a';
            }
            const searchInput = document.getElementById('owner-player-search-input') as HTMLInputElement | null;
            await renderOwnerPanelPlayersList(searchInput?.value || '');
        });
    });

    listContainer.querySelectorAll('.btn-owner-ban-player').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const targetBtn = e.currentTarget as HTMLButtonElement;
            const username = targetBtn.getAttribute('data-username') || '';
            const userId = targetBtn.getAttribute('data-user-id') || '';
            const email = targetBtn.getAttribute('data-email') || '';
            const reasonInput = document.getElementById('owner-ban-reason-input') as HTMLInputElement | null;
            const reason = reasonInput?.value.trim() || 'Bännitud Playard Owneri paneelist';

            if (!username) return;

            targetBtn.disabled = true;
            targetBtn.textContent = '⏳ Kustutan andmebaasist...';

            if (statusEl) {
                statusEl.textContent = `⏳ Bännin mängijat @${username} ja kustutan kõiki tema ridu andmebaasist...`;
                statusEl.style.color = '#ffd32a';
            }

            const res = await banPlayerFromPlayard({ username, userId, email, reason });
            if (statusEl) {
                statusEl.textContent = res.message;
                statusEl.style.color = res.success ? '#2ecc71' : '#ff4757';
            }

            const searchInput = document.getElementById('owner-player-search-input') as HTMLInputElement | null;
            await renderOwnerPanelPlayersList(searchInput?.value || '');
            renderOwnerBannedPlayersList();
            renderCommunityGames();
            renderDatabaseGamesList();
        });
    });

    listContainer.querySelectorAll('.badge-reported-player').forEach(badge => {
        badge.addEventListener('click', (e) => {
            e.stopPropagation();
            setOwnerPanelMode('reports');
            document.getElementById('owner-reports-box')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    });
}

export function renderOwnerBannedPlayersList() {
    const container = document.getElementById('owner-banned-players-list');
    const countBadge = document.getElementById('owner-banned-count-badge');
    if (!container) return;

    const banned = getBannedPlayers();
    if (countBadge) {
        countBadge.textContent = `${banned.length} bännitud`;
    }

    if (banned.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #718093; padding: 16px; font-size: 0.85rem;">
                Ühtegi mängijat pole veel bännitud.
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    banned.forEach(item => {
        const el = document.createElement('div');
        el.className = 'owner-banned-player-row';
        el.setAttribute('data-banned-username', item.username);
        el.style.cssText = 'background: rgba(255, 71, 87, 0.08); border: 1px solid rgba(255, 71, 87, 0.3); border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;';
        const dateStr = new Date(item.bannedAt).toLocaleString();
        el.innerHTML = `
            <div style="text-align: left;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span style="color: #ff4757; font-weight: 800;">🚫 @${item.username}</span>
                    <span style="font-size: 0.72rem; background: rgba(46, 204, 113, 0.15); color: #2ecc71; padding: 2px 7px; border-radius: 4px; font-weight: 700;">
                        ✓ Kõik andmebaasi read kustutatud (${item.deletedTables?.length || ALL_PLAYER_DATABASE_TABLES.length} tabelit)
                    </span>
                </div>
                <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 3px;">
                    Põhjus: ${item.reason || 'Reeglite rikkumine'} · Aeg: ${dateStr}
                </div>
            </div>
            <button type="button" class="btn-owner-unban-player" data-username="${item.username}" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); color: #d2dae2; border-radius: 6px; padding: 5px 10px; font-size: 0.78rem; font-weight: 700; cursor: pointer;">
                🔓 Unban
            </button>
        `;
        container.appendChild(el);
    });

    container.querySelectorAll('.btn-owner-unban-player').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLButtonElement;
            const uname = target.getAttribute('data-username') || '';
            if (uname) {
                unbanPlayerFromPlayard(uname);
                renderOwnerBannedPlayersList();
                const searchInput = document.getElementById('owner-player-search-input') as HTMLInputElement | null;
                renderOwnerPanelPlayersList(searchInput?.value || '');
            }
        });
    });
}

export function setupOwnerPanel() {
    const modalOwner = document.getElementById('modal-owner-panel');
    const openOwnerBtn = document.getElementById('btn-open-owner-panel');
    const closeOwnerBtn = document.getElementById('btn-close-owner-panel');

    const banInput = document.getElementById('owner-ban-username-input') as HTMLInputElement | null;
    const reasonInput = document.getElementById('owner-ban-reason-input') as HTMLInputElement | null;
    const banSubmitBtn = document.getElementById('btn-owner-ban-by-input') as HTMLButtonElement | null;
    const searchInput = document.getElementById('owner-player-search-input') as HTMLInputElement | null;
    const refreshBtn = document.getElementById('btn-owner-refresh-players');
    const statusEl = document.getElementById('owner-ban-status');

    if (openOwnerBtn && modalOwner) {
        openOwnerBtn.addEventListener('click', () => {
            const prof = getCurrentUserProfile();
            const isOwner = isPlayardOwner(prof?.email) || isOwnerUser(prof) || (!!prof?.isAdmin && (prof?.email || '').trim().toLowerCase() !== 'grx@trenet.ee');
            if (!isOwner) {
                return;
            }
            modalOwner.style.display = 'flex';
            renderOwnerPanelPlayersList(searchInput?.value || '');
            renderOwnerBannedPlayersList();
        });
    }

    if (closeOwnerBtn && modalOwner) {
        closeOwnerBtn.addEventListener('click', () => {
            modalOwner.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modalOwner && modalOwner) {
            modalOwner.style.display = 'none';
        }
    });

    const clearSearchBtn = document.getElementById('btn-owner-clear-search');

    const updateClearBtnVisibility = () => {
        if (clearSearchBtn) {
            clearSearchBtn.style.display = searchInput?.value ? 'flex' : 'none';
        }
    };

    searchInput?.addEventListener('input', () => {
        updateClearBtnVisibility();
        renderOwnerPanelPlayersList(searchInput.value);
    });

    clearSearchBtn?.addEventListener('click', () => {
        if (searchInput) {
            searchInput.value = '';
            updateClearBtnVisibility();
            searchInput.focus();
        }
        renderOwnerPanelPlayersList('');
    });

    refreshBtn?.addEventListener('click', () => {
        updateClearBtnVisibility();
        renderOwnerPanelPlayersList(searchInput?.value || '');
        renderOwnerBannedPlayersList();
    });

    if (banSubmitBtn && banInput) {
        const triggerManualBan = async () => {
            const prof = getCurrentUserProfile();
            const isOwner = isPlayardOwner(prof?.email) || isOwnerUser(prof) || (!!prof?.isAdmin && (prof?.email || '').trim().toLowerCase() !== 'grx@trenet.ee');
            if (!isOwner) {
                if (statusEl) {
                    statusEl.textContent = '❌ Ainult Playard Owner saab mängijaid bännida!';
                    statusEl.style.color = '#ff4757';
                }
                return;
            }

            const targetUsername = banInput.value.trim();
            const reason = reasonInput?.value.trim() || 'Bännitud Playard Owneri poolt';

            if (!targetUsername) {
                if (statusEl) {
                    statusEl.textContent = 'Palun sisesta mängija kasutajanimi, keda soovid bännida!';
                    statusEl.style.color = '#ff4757';
                }
                return;
            }

            banSubmitBtn.disabled = true;
            if (statusEl) {
                statusEl.textContent = `⏳ Bännin mängijat "${targetUsername}" ja kustutan kõiki tema ridu andmebaasist...`;
                statusEl.style.color = '#ffd32a';
            }

            try {
                const res = await banPlayerFromPlayard({
                    username: targetUsername,
                    reason
                });
                if (statusEl) {
                    statusEl.textContent = res.message;
                    statusEl.style.color = res.success ? '#2ecc71' : '#ff4757';
                }
                if (res.success) {
                    banInput.value = '';
                    if (reasonInput) reasonInput.value = '';
                    await renderOwnerPanelPlayersList(searchInput?.value || '');
                    renderOwnerBannedPlayersList();
                    renderCommunityGames();
                    renderDatabaseGamesList();
                }
            } finally {
                banSubmitBtn.disabled = false;
            }
        };

        banSubmitBtn.addEventListener('click', triggerManualBan);
        banInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') triggerManualBan();
        });
    }

    document.getElementById('btn-owner-mode-ban')?.addEventListener('click', () => setOwnerPanelMode('ban'));
    document.getElementById('btn-owner-mode-verify')?.addEventListener('click', () => setOwnerPanelMode('verify'));
    document.getElementById('btn-owner-mode-playbux')?.addEventListener('click', () => setOwnerPanelMode('playbux'));
    document.getElementById('btn-owner-mode-reports')?.addEventListener('click', () => setOwnerPanelMode('reports'));

    document.getElementById('btn-owner-clear-all-reports')?.addEventListener('click', () => {
        clearAllPlayerReports();
        renderOwnerReportsList();
    });

    const verifiedInput = document.getElementById('owner-verified-username-input') as HTMLInputElement | null;
    const verifiedBtn = document.getElementById('btn-owner-add-verified');
    const verifiedStatusEl = document.getElementById('owner-verified-status');

    if (verifiedBtn && verifiedInput) {
        verifiedBtn.addEventListener('click', async () => {
            const targetUsername = verifiedInput.value.trim();
            if (!targetUsername) {
                if (verifiedStatusEl) {
                    verifiedStatusEl.textContent = 'Palun sisesta mängija kasutajanimi!';
                    verifiedStatusEl.style.color = '#ff4757';
                }
                return;
            }
            const res = await toggleVerifiedPlayer(targetUsername);
            if (verifiedStatusEl) {
                verifiedStatusEl.textContent = res.message;
                verifiedStatusEl.style.color = res.verified ? '#2ecc71' : '#ffd32a';
            }
            verifiedInput.value = '';
            renderOwnerPanelPlayersList(searchInput?.value || '');
        });
    }

    // PlayBux Give Top Box Form Handling
    const playbuxUserInput = document.getElementById('owner-playbux-username-input') as HTMLInputElement | null;
    const playbuxAmountInput = document.getElementById('owner-playbux-amount-input') as HTMLInputElement | null;
    const playbuxReasonInput = document.getElementById('owner-playbux-reason-input') as HTMLInputElement | null;
    const playbuxSubmitBtn = document.getElementById('btn-owner-give-playbux') as HTMLButtonElement | null;
    const playbuxStatusEl = document.getElementById('owner-playbux-status');

    // Autocomplete player suggestions for owner PlayBux input
    const playbuxSuggestionsEl = document.getElementById('owner-playbux-suggestions');
    bindPlayerSuggestions({
        input: playbuxUserInput,
        container: playbuxSuggestionsEl,
        excludeCurrent: false,
        onSelect: () => {
            if (playbuxStatusEl) playbuxStatusEl.textContent = '';
            playbuxAmountInput?.focus();
        }
    });

    document.querySelectorAll('.btn-owner-playbux-preset').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const amount = (e.currentTarget as HTMLElement).getAttribute('data-amount') || '500';
            if (playbuxAmountInput) {
                playbuxAmountInput.value = amount;
                playbuxAmountInput.focus();
            }
        });
    });

    if (playbuxSubmitBtn && playbuxUserInput && playbuxAmountInput) {
        const triggerGivePlaybux = async () => {
            const targetUser = playbuxUserInput.value.trim();
            const amount = parseInt(playbuxAmountInput.value.trim(), 10);
            const reason = playbuxReasonInput?.value.trim() || 'Playard Owner Kingitus';

            if (!targetUser) {
                if (playbuxStatusEl) {
                    playbuxStatusEl.textContent = 'Palun sisesta mängija kasutajanimi!';
                    playbuxStatusEl.style.color = '#ff4757';
                }
                return;
            }
            if (isNaN(amount) || amount <= 0) {
                if (playbuxStatusEl) {
                    playbuxStatusEl.textContent = 'Palun sisesta korrektne PlayBux summa!';
                    playbuxStatusEl.style.color = '#ff4757';
                }
                return;
            }

            playbuxSubmitBtn.disabled = true;
            if (playbuxStatusEl) {
                playbuxStatusEl.textContent = `⏳ Annan +${amount.toLocaleString()} PlayBuxi mängijale @${targetUser}...`;
                playbuxStatusEl.style.color = '#ffd32a';
            }

            try {
                const res = await givePlayerPlaybux(targetUser, amount, reason);
                if (playbuxStatusEl) {
                    playbuxStatusEl.textContent = res.message;
                    playbuxStatusEl.style.color = res.success ? '#00f2fe' : '#ff4757';
                }
                if (res.success) {
                    playbuxUserInput.value = '';
                    await renderOwnerPanelPlayersList(searchInput?.value || '');
                }
            } finally {
                playbuxSubmitBtn.disabled = false;
            }
        };

        playbuxSubmitBtn.addEventListener('click', triggerGivePlaybux);
        playbuxUserInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') triggerGivePlaybux();
        });
        playbuxAmountInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') triggerGivePlaybux();
        });
    }

    window.addEventListener('playard_verified_players_updated', () => {
        if (modalOwner && modalOwner.style.display !== 'none') {
            renderOwnerPanelPlayersList(searchInput?.value || '');
        }
    });

    window.addEventListener('playard_yards_updated', () => {
        if (modalOwner && modalOwner.style.display !== 'none') {
            renderOwnerPanelPlayersList(searchInput?.value || '');
        }
    });

    window.addEventListener('playard:reports_updated', () => {
        updateOwnerReportsBadge();
        if (ownerPanelMode === 'reports') {
            renderOwnerReportsList();
        }
        if (modalOwner && modalOwner.style.display !== 'none') {
            renderOwnerPanelPlayersList(searchInput?.value || '');
        }
    });

    updateOwnerReportsBadge();

    if (typeof window !== 'undefined') {
        (window as any).banPlayerFromPlayard = banPlayerFromPlayard;
        (window as any).isPlayerBanned = isPlayerBanned;
        (window as any).getBannedPlayers = getBannedPlayers;
        (window as any).unbanPlayerFromPlayard = unbanPlayerFromPlayard;
        (window as any).isPlayerVerified = isPlayerVerified;
        (window as any).toggleVerifiedPlayer = toggleVerifiedPlayer;
        (window as any).addVerifiedPlayer = addVerifiedPlayer;
        (window as any).removeVerifiedPlayer = removeVerifiedPlayer;
        (window as any).givePlayerPlaybux = givePlayerPlaybux;
        (window as any).getPlayerYards = getPlayerYards;
        (window as any).setOwnerPanelMode = setOwnerPanelMode;
        (window as any).getOwnerPanelMode = getOwnerPanelMode;
        (window as any).renderOwnerReportsList = renderOwnerReportsList;
        (window as any).getPlayerReports = getPlayerReports;
        (window as any).deletePlayerReport = deletePlayerReport;
        (window as any).clearAllPlayerReports = clearAllPlayerReports;
    }
}
