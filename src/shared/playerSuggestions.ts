import { getLocalProfiles, getCurrentUserProfile, isOwnerUser, formatOwnerNametag } from '../auth';
import { getVerifiedPlayers } from './verifiedPlayers';
import { friendService } from './friends/friendService';

export interface PlayerSuggestionOption {
    username: string;
    displayName: string;
    color: string;
}

export function getPlayerSuggestionsList(query: string, excludeCurrent = true): PlayerSuggestionOption[] {
    const cleanQuery = query.replace(/^@/, '').trim().toLowerCase();
    const map = new Map<string, PlayerSuggestionOption>();

    const currentUser = getCurrentUserProfile();
    const currLower = currentUser?.username?.toLowerCase().trim() || '';

    const addPlayer = (username?: string, displayName?: string, color?: string) => {
        if (!username) return;
        const uClean = username.replace(/^@/, '').trim();
        if (!uClean) return;
        const lower = uClean.toLowerCase();
        if (excludeCurrent && currLower && lower === currLower) return;
        if (!map.has(lower)) {
            const isOwner = isOwnerUser(uClean) || (displayName ? isOwnerUser(displayName) : false);
            map.set(lower, {
                username: uClean,
                displayName: formatOwnerNametag(displayName || uClean, isOwner ? true : undefined),
                color: color || '#00f2fe'
            });
        }
    };

    // 1. Local registered profiles
    try {
        const local = getLocalProfiles();
        local.forEach(p => addPlayer(p?.username, p?.displayName));
    } catch (e) {}

    // 2. Verified players
    try {
        const verified = getVerifiedPlayers();
        verified.forEach(vp => addPlayer(vp, vp));
    } catch (e) {}

    // 3. Friends
    try {
        if (currLower) {
            const friends = friendService.getFriends(currLower);
            friends.forEach(f => addPlayer(f?.username, f?.displayName, f?.avatarColor));
        }
    } catch (e) {}

    // 4. Friend service search cache
    try {
        const friendResults = friendService.searchPlayers(cleanQuery, currLower);
        friendResults.forEach(r => addPlayer(r?.username, r?.displayName, r?.color));
    } catch (e) {}

    // Filter by query
    const results: PlayerSuggestionOption[] = [];
    map.forEach((item, lower) => {
        if (!cleanQuery) {
            results.push(item);
            return;
        }
        if (lower.includes(cleanQuery) || item.displayName.toLowerCase().includes(cleanQuery)) {
            results.push(item);
        }
    });

    // Sort: starting with query first, then alphabetical
    results.sort((a, b) => {
        const aLower = a.username.toLowerCase();
        const bLower = b.username.toLowerCase();
        const aStarts = aLower.startsWith(cleanQuery) ? 0 : 1;
        const bStarts = bLower.startsWith(cleanQuery) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.username.localeCompare(b.username);
    });

    return results;
}

export function bindPlayerSuggestions(options: {
    input: HTMLInputElement | null;
    container: HTMLElement | null;
    onSelect?: (player: PlayerSuggestionOption) => void;
    excludeCurrent?: boolean;
    maxResults?: number;
}) {
    const { input, container, onSelect, excludeCurrent = true, maxResults = 8 } = options;
    if (!input || !container) return;

    const render = () => {
        const query = input.value.trim();
        if (!query) {
            container.style.display = 'none';
            container.innerHTML = '';
            return;
        }

        const matches = getPlayerSuggestionsList(query, excludeCurrent);
        if (matches.length === 0) {
            container.innerHTML = `
                <div style="padding: 10px 12px; font-size: 0.8rem; color: #8899a6; text-align: center;">
                    Sarnaseid nimesid ei leitud ("${query}")
                </div>
            `;
            container.style.display = 'block';
            return;
        }

        container.innerHTML = matches.slice(0, maxResults).map(m => `
            <div class="player-suggestion-item" data-username="${m.username}" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.06); transition: background 0.15s; background: transparent;">
                <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; background: ${m.color}; display: flex; align-items: center; justify-content: center; font-size: 0.82rem; font-weight: 800; color: #fff; flex-shrink: 0;">
                        ${(m.username[0] || 'U').toUpperCase()}
                    </div>
                    <div style="text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <div style="font-weight: 700; color: #ffffff; font-size: 0.85rem; line-height: 1.2;">${m.displayName}</div>
                        <div style="font-size: 0.72rem; color: #8899a6;">@${m.username}</div>
                    </div>
                </div>
                <span style="font-size: 0.72rem; color: #00f2fe; font-weight: 800; background: rgba(0,242,254,0.12); border: 1px solid rgba(0,242,254,0.25); padding: 2px 7px; border-radius: 4px; flex-shrink: 0; margin-left: 6px;">Vali</span>
            </div>
        `).join('');

        container.querySelectorAll('.player-suggestion-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                (item as HTMLElement).style.background = 'rgba(0, 242, 254, 0.16)';
            });
            item.addEventListener('mouseleave', () => {
                (item as HTMLElement).style.background = 'transparent';
            });
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const u = item.getAttribute('data-username');
                if (u) {
                    input.value = u;
                    container.style.display = 'none';
                    container.innerHTML = '';
                    const matched = matches.find(x => x.username === u);
                    if (onSelect && matched) onSelect(matched);
                }
            });
        });

        container.style.display = 'block';
    };

    input.addEventListener('input', render);
    input.addEventListener('focus', () => {
        if (input.value.trim()) render();
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target as Node) && !container.contains(e.target as Node)) {
            container.style.display = 'none';
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            container.style.display = 'none';
        }
    });
}
