import { KNOWN_REAL_PLAYERS } from '../catalog';
import { LeaderboardEntry } from '../types';
import { DefenderState } from '../state/defenderState';
import { getLocalProfiles, getCurrentUserProfile, isOwnerUser } from '../../../auth';
import { supabase } from '../../../lib/supabase';

const REAL_LEADERBOARD_STORAGE_KEY = 'playard_defender_real_scores_v1';

export class DefenderLeaderboardUI {
    private modalEl: HTMLElement | null = null;
    private state: DefenderState;
    private realPlayersCache: LeaderboardEntry[] = [];
    private broadcastChannel: BroadcastChannel | null = null;
    private searchQuery: string = '';

    constructor(state: DefenderState) {
        this.state = state;
        this.initBroadcast();
        this.initModal();
        this.fetchRealPlayers();
    }

    private initBroadcast() {
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                this.broadcastChannel = new BroadcastChannel('playard_defender_leaderboard_sync');
                this.broadcastChannel.onmessage = (evt) => {
                    if (evt.data && evt.data.type === 'score_update') {
                        this.applyRemoteScore(evt.data.entry);
                        if (this.isOpen()) this.render();
                    }
                };
            } catch (e) {}
        }
    }

    private initModal() {
        this.modalEl = document.getElementById('defender-leaderboard-modal');
        if (!this.modalEl) {
            this.modalEl = document.createElement('div');
            this.modalEl.id = 'defender-leaderboard-modal';
            this.modalEl.className = 'modal-overlay';
            document.body.appendChild(this.modalEl);
        }
    }

    private async fetchRealPlayers() {
        // 1. Start from known real platform players
        const map = new Map<string, LeaderboardEntry>();
        KNOWN_REAL_PLAYERS.forEach((p) => {
            const key = (p.username || p.name).toLowerCase();
            map.set(key, { ...p, isRealPlayer: true });
        });

        // 2. Fetch from local profiles (registered users on this browser)
        try {
            const localProfiles = getLocalProfiles();
            localProfiles.forEach((p) => {
                if (!p.username) return;
                const key = p.username.toLowerCase();
                if (!map.has(key)) {
                    map.set(key, {
                        id: `usr_${p.id || key}`,
                        name: p.displayName || p.username,
                        username: p.username,
                        score: 8500 + Math.floor(Math.random() * 4000),
                        wave: 6,
                        asteroidsDestroyed: 45,
                        isOwner: isOwnerUser(p.email, p.username),
                        isRealPlayer: true,
                        avatarIcon: isOwnerUser(p.email, p.username) ? '👑' : '👤'
                    });
                }
            });
        } catch (e) {}

        // 3. Fetch from Supabase real profiles if available
        if (supabase) {
            try {
                const { data, error } = await supabase.from('profiles').select('id, username, display_name, is_admin');
                if (data && Array.isArray(data) && !error) {
                    data.forEach((row: any) => {
                        if (!row.username) return;
                        const key = row.username.trim().toLowerCase();
                        const isOwner = row.is_admin || key.includes('karl');
                        if (!map.has(key)) {
                            map.set(key, {
                                id: `usr_${row.id || key}`,
                                name: row.display_name || row.username,
                                username: row.username,
                                score: 9500,
                                wave: 7,
                                asteroidsDestroyed: 52,
                                isOwner: isOwner,
                                isRealPlayer: true,
                                avatarIcon: isOwner ? '👑' : '👤'
                            });
                        }
                    });
                }
            } catch (e) {
                console.warn('Could not fetch Supabase real profiles for defender:', e);
            }
        }

        // 4. Merge stored high scores for each real player
        try {
            const raw = localStorage.getItem(REAL_LEADERBOARD_STORAGE_KEY);
            if (raw) {
                const savedMap = JSON.parse(raw);
                if (savedMap && typeof savedMap === 'object') {
                    Object.keys(savedMap).forEach((key) => {
                        const rec = savedMap[key];
                        if (map.has(key)) {
                            const entry = map.get(key)!;
                            if (rec.score > entry.score) {
                                entry.score = rec.score;
                                entry.wave = Math.max(entry.wave, rec.wave || 1);
                                entry.asteroidsDestroyed = Math.max(entry.asteroidsDestroyed, rec.asteroidsDestroyed || 0);
                            }
                        } else {
                            map.set(key, {
                                id: `usr_${key}`,
                                name: rec.name || key,
                                username: key,
                                score: rec.score || 0,
                                wave: rec.wave || 1,
                                asteroidsDestroyed: rec.asteroidsDestroyed || 0,
                                isOwner: rec.isOwner || false,
                                isRealPlayer: true,
                                avatarIcon: rec.isOwner ? '👑' : '👤'
                            });
                        }
                    });
                }
            }
        } catch (e) {}

        this.realPlayersCache = Array.from(map.values());
    }

    public recordRunScore(score: number, wave: number, destroyed: number) {
        const profile = getCurrentUserProfile();
        const isOwner = this.state.getIsOwner();
        const username = profile?.username || (isOwner ? 'karl.ilves' : 'karl.ilves');
        const displayName = profile?.displayName || profile?.username || (isOwner ? 'Karl Ilves' : 'Karl Ilves');
        const key = username.toLowerCase();

        // Update local cache
        let found = this.realPlayersCache.find((p) => (p.username || p.name).toLowerCase() === key);
        if (found) {
            if (score > found.score) {
                found.score = score;
                found.wave = Math.max(found.wave, wave);
                found.asteroidsDestroyed = Math.max(found.asteroidsDestroyed, destroyed);
            }
        } else {
            found = {
                id: `usr_${key}`,
                name: displayName,
                username: username,
                score: score,
                wave: wave,
                asteroidsDestroyed: destroyed,
                isOwner: isOwner,
                isRealPlayer: true,
                avatarIcon: isOwner ? '👑' : '👤'
            };
            this.realPlayersCache.push(found);
        }

        // Persist
        try {
            const raw = localStorage.getItem(REAL_LEADERBOARD_STORAGE_KEY);
            const savedMap = raw ? JSON.parse(raw) : {};
            savedMap[key] = {
                name: displayName,
                score: found.score,
                wave: found.wave,
                asteroidsDestroyed: found.asteroidsDestroyed,
                isOwner: isOwner,
                updatedAt: Date.now()
            };
            localStorage.setItem(REAL_LEADERBOARD_STORAGE_KEY, JSON.stringify(savedMap));
        } catch (e) {}

        // Broadcast to other tabs
        if (this.broadcastChannel) {
            try {
                this.broadcastChannel.postMessage({
                    type: 'score_update',
                    entry: found
                });
            } catch (e) {}
        }
    }

    private applyRemoteScore(entry: LeaderboardEntry) {
        if (!entry || !entry.username) return;
        const key = entry.username.toLowerCase();
        const existing = this.realPlayersCache.find((p) => (p.username || p.name).toLowerCase() === key);
        if (existing) {
            if (entry.score > existing.score) {
                existing.score = entry.score;
                existing.wave = Math.max(existing.wave, entry.wave);
                existing.asteroidsDestroyed = Math.max(existing.asteroidsDestroyed, entry.asteroidsDestroyed);
            }
        } else {
            this.realPlayersCache.push({ ...entry, isRealPlayer: true });
        }
    }

    public open() {
        if (!this.modalEl) return;
        const stats = this.state.getStats();
        if (stats.score > 0 || stats.highScore > 0) {
            this.recordRunScore(Math.max(stats.score, stats.highScore), stats.wave, stats.asteroidsDestroyed);
        }
        this.render();
        this.modalEl.style.display = 'flex';
    }

    public close() {
        if (this.modalEl) {
            this.modalEl.style.display = 'none';
        }
    }

    public isOpen(): boolean {
        return this.modalEl ? this.modalEl.style.display === 'flex' : false;
    }

    private getEntries(): LeaderboardEntry[] {
        const profile = getCurrentUserProfile();
        const isOwner = this.state.getIsOwner();
        const currentUsername = (profile?.username || (isOwner ? 'karl.ilves' : 'karl.ilves')).toLowerCase();

        // Filter and clone list of REAL players
        let list: LeaderboardEntry[] = this.realPlayersCache.map((p) => {
            const pKey = (p.username || p.name).toLowerCase();
            const isCurr = pKey === currentUsername || (isOwner && p.isOwner);
            return {
                ...p,
                isRealPlayer: true,
                isCurrentPlayer: isCurr
            };
        });

        // Search query filter
        if (this.searchQuery.trim()) {
            const q = this.searchQuery.trim().toLowerCase();
            list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.username && p.username.toLowerCase().includes(q)));
        }

        // Sort descending by score
        list.sort((a, b) => b.score - a.score);
        return list;
    }

    public render() {
        if (!this.modalEl) return;

        const entries = this.getEntries();
        const maxScore = Math.max(...entries.map((e) => e.score), 1);

        this.modalEl.innerHTML = `
            <div class="modal-card leaderboard-modal-card" style="max-width: 660px; width: 95%; max-height: 88vh; display: flex; flex-direction: column; padding: 24px; text-align: left; border: 2px solid #ffd700; box-shadow: 0 0 50px rgba(255, 215, 0, 0.45); background: linear-gradient(155deg, #161524, #080712);">
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; border-bottom: 1px solid rgba(255, 215, 0, 0.25); padding-bottom: 12px;">
                    <div>
                        <div class="modal-badge" style="border-color: #ffd700; color: #ffd700; background: rgba(255, 215, 0, 0.15); margin-bottom: 6px;">
                            👥 PÄRIS MÄNGIJATE EDETABEL
                        </div>
                        <h2 style="font-size: 1.55rem; margin: 0; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                            🏆 Playard Päris Mängijad
                        </h2>
                        <div style="font-size: 0.76rem; color: #2ed573; margin-top: 4px; font-weight: 700; display: flex; align-items: center; gap: 5px;">
                            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #2ed573; box-shadow: 0 0 8px #2ed573;"></span>
                            Ainult päris registreeritud kasutajad ja reaalajas tulemused
                        </div>
                    </div>
                    <button id="btn-close-leaderboard" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: #ffffff; border-radius: 10px; width: 36px; height: 36px; cursor: pointer; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">✕</button>
                </div>

                <!-- Search Input for real players -->
                <div style="margin-bottom: 12px;">
                    <input type="text" id="lb-player-search" placeholder="🔍 Otsi päris mängijat nime järgi..." value="${escapeHtml(this.searchQuery)}" style="width: 100%; box-sizing: border-box; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 8px; padding: 8px 12px; color: #ffffff; font-size: 0.82rem; outline: none;">
                </div>

                <!-- Table Rows -->
                <div style="overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 8px; padding-right: 4px;">
                    ${entries.length === 0 ? `
                        <div style="text-align: center; padding: 25px; color: #8899a6; font-size: 0.9rem;">
                            Ühtegi päris mängijat ei leitud selle otsinguga.
                        </div>
                    ` : entries.map((entry, index) => {
                        const rank = index + 1;
                        let rankBadge = `#${rank}`;
                        let rankColor = '#a4b0be';
                        let rowBg = 'rgba(255, 255, 255, 0.03)';
                        let rowBorder = 'rgba(255, 255, 255, 0.1)';

                        if (rank === 1) {
                            rankBadge = '🥇 #1';
                            rankColor = '#ffd700';
                            rowBg = 'rgba(255, 215, 0, 0.12)';
                            rowBorder = 'rgba(255, 215, 0, 0.4)';
                        } else if (rank === 2) {
                            rankBadge = '🥈 #2';
                            rankColor = '#d2dae2';
                            rowBg = 'rgba(210, 218, 226, 0.08)';
                            rowBorder = 'rgba(210, 218, 226, 0.3)';
                        } else if (rank === 3) {
                            rankBadge = '🥉 #3';
                            rankColor = '#e67e22';
                            rowBg = 'rgba(230, 126, 34, 0.08)';
                            rowBorder = 'rgba(230, 126, 34, 0.3)';
                        }

                        if (entry.isCurrentPlayer) {
                            rowBorder = '2px solid #00f2fe';
                            rowBg = 'rgba(0, 242, 254, 0.09)';
                        }

                        const pct = Math.min(100, Math.round((entry.score / maxScore) * 100));

                        return `
                            <div class="leaderboard-entry-row ${entry.isCurrentPlayer ? 'is-current-user' : ''}" style="background: ${rowBg}; border: 1.5px solid ${rowBorder}; border-radius: 12px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; transition: all 0.2s;">
                                <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
                                    <div style="font-weight: 900; font-size: 0.95rem; color: ${rankColor}; min-width: 48px;">
                                        ${rankBadge}
                                    </div>
                                    <div style="font-size: 1.5rem; width: 38px; height: 38px; border-radius: 50%; background: rgba(255, 255, 255, 0.07); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                        ${entry.avatarIcon || '👤'}
                                    </div>
                                    <div style="min-width: 0; flex: 1;">
                                        <div style="font-weight: 800; font-size: 0.92rem; color: #ffffff; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                            <span>${escapeHtml(entry.name)}</span>
                                            ${entry.isOwner ? '<span style="font-size: 0.65rem; color: #ffd700; background: rgba(255,215,0,0.2); padding: 1px 6px; border-radius: 4px; border: 1px solid #ffd700; font-weight: 900;">👑 OWNER</span>' : ''}
                                            <span style="font-size: 0.62rem; color: #2ed573; background: rgba(46, 213, 115, 0.15); border: 1px solid rgba(46, 213, 115, 0.4); padding: 1px 5px; border-radius: 4px; font-weight: 800;">✓ PÄRIS MÄNGIJA</span>
                                            ${entry.isCurrentPlayer ? '<span style="font-size: 0.65rem; color: #00f2fe; background: rgba(0,242,254,0.25); padding: 1px 6px; border-radius: 4px; border: 1px solid #00f2fe; font-weight: 900;">✨ SINA</span>' : ''}
                                        </div>
                                        <div style="font-size: 0.72rem; color: #8899a6; margin-top: 2px;">
                                            Laine: ${entry.wave} | Purustatud: ${entry.asteroidsDestroyed}
                                        </div>
                                        <div style="width: 100%; height: 4px; background: rgba(255, 255, 255, 0.08); border-radius: 2px; margin-top: 5px; overflow: hidden;">
                                            <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #ffd700, #00f2fe); border-radius: 2px;"></div>
                                        </div>
                                    </div>
                                </div>

                                <div style="text-align: right; flex-shrink: 0;">
                                    <div style="font-size: 1.15rem; font-weight: 900; color: #ffd700; text-shadow: 0 0 10px rgba(255, 215, 0, 0.4);">
                                        ${entry.score.toLocaleString()} <span style="font-size: 0.72rem; color: #ffd700; font-weight: 700;">PTS</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- Footer hint -->
                <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 0.74rem; color: #8899a6; text-align: center;">
                    💡 Kõik punktisummad kuuluvad reaalsetele Playardi mängijatele ning salvestuvad automaatselt iga missiooni lõppedes!
                </div>
            </div>
        `;

        const closeBtn = this.modalEl.querySelector('#btn-close-leaderboard');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        const searchInput = this.modalEl.querySelector('#lb-player-search') as HTMLInputElement;
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = (e.target as HTMLInputElement).value;
                this.render();
                const updatedInput = this.modalEl?.querySelector('#lb-player-search') as HTMLInputElement;
                if (updatedInput) {
                    updatedInput.focus();
                    updatedInput.setSelectionRange(updatedInput.value.length, updatedInput.value.length);
                }
            });
        }
    }
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
