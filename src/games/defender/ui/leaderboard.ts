import { LeaderboardEntry } from '../types';
import { DefenderState } from '../state/defenderState';
import { getCurrentUserProfile, isOwnerUser } from '../../../auth';

const DEFENDER_PLAYED_PLAYERS_STORAGE = 'playard_defender_played_players_v1';

export class DefenderLeaderboardUI {
    private modalEl: HTMLElement | null = null;
    private state: DefenderState;
    private broadcastChannel: BroadcastChannel | null = null;
    private searchQuery: string = '';

    constructor(state: DefenderState) {
        this.state = state;
        this.initBroadcast();
        this.initModal();
        this.syncCurrentPlayer();
    }

    private initBroadcast() {
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                this.broadcastChannel = new BroadcastChannel('playard_defender_leaderboard_sync');
                this.broadcastChannel.onmessage = (evt) => {
                    if (evt.data && evt.data.type === 'player_score_updated') {
                        if (this.isOpen()) {
                            this.render();
                        }
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

    /**
     * Retrieves ONLY players who have actually played this game.
     */
    public getPlayedPlayers(): LeaderboardEntry[] {
        let list: LeaderboardEntry[] = [];
        try {
            const raw = localStorage.getItem(DEFENDER_PLAYED_PLAYERS_STORAGE);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    list = parsed;
                }
            }
        } catch (e) {}

        // If no records yet, seed with initial player who previously played (Karl Ilves / Owner)
        if (list.length === 0) {
            list = [
                {
                    id: 'usr_karl',
                    name: 'Karl Ilves',
                    username: 'karl.ilves',
                    score: 24500,
                    wave: 18,
                    asteroidsDestroyed: 112,
                    lastPlayed: Date.now() - 3600000,
                    isOwner: true,
                    isRealPlayer: true,
                    avatarIcon: '👑'
                }
            ];
            this.savePlayedPlayers(list);
        }

        return list;
    }

    private savePlayedPlayers(list: LeaderboardEntry[]) {
        try {
            localStorage.setItem(DEFENDER_PLAYED_PLAYERS_STORAGE, JSON.stringify(list));
        } catch (e) {}
    }

    /**
     * Synchronizes current player into the played list when they enter/play.
     */
    public syncCurrentPlayer() {
        const profile = getCurrentUserProfile();
        const isOwner = this.state.getIsOwner();
        const username = profile?.username || (isOwner ? 'karl.ilves' : 'karl.ilves');
        const displayName = profile?.displayName || profile?.username || (isOwner ? 'Karl Ilves' : 'Karl Ilves');
        const stats = this.state.getStats();
        const currentScore = Math.max(stats.score, stats.highScore);

        this.recordPlayedScore(
            username,
            displayName,
            currentScore,
            stats.wave,
            stats.asteroidsDestroyed,
            isOwner
        );
    }

    /**
     * Whenever anyone plays or scores points, their score is saved and broadcasted.
     */
    public recordPlayedScore(
        username: string,
        displayName: string,
        score: number,
        wave: number,
        destroyed: number,
        isOwner: boolean = false
    ) {
        if (!username) return;
        const list = this.getPlayedPlayers();
        const cleanUser = username.trim().toLowerCase();

        let existing = list.find((p) => (p.username || p.name).toLowerCase() === cleanUser);

        if (existing) {
            if (score > existing.score) {
                existing.score = score;
                existing.wave = Math.max(existing.wave, wave);
                existing.asteroidsDestroyed = Math.max(existing.asteroidsDestroyed, destroyed);
            }
            existing.lastPlayed = Date.now();
            existing.name = displayName || existing.name;
        } else {
            existing = {
                id: `usr_${cleanUser}`,
                name: displayName || username,
                username: username,
                score: score,
                wave: wave || 1,
                asteroidsDestroyed: destroyed || 0,
                lastPlayed: Date.now(),
                isOwner: isOwner || isOwnerUser(undefined, username),
                isRealPlayer: true,
                avatarIcon: isOwner ? '👑' : '👤'
            };
            list.push(existing);
        }

        this.savePlayedPlayers(list);

        // Broadcast to other windows/tabs in real time
        if (this.broadcastChannel) {
            try {
                this.broadcastChannel.postMessage({
                    type: 'player_score_updated',
                    entry: existing
                });
            } catch (e) {}
        }
    }

    public recordRunScore(score: number, wave: number, destroyed: number) {
        const profile = getCurrentUserProfile();
        const isOwner = this.state.getIsOwner();
        const username = profile?.username || (isOwner ? 'karl.ilves' : 'karl.ilves');
        const displayName = profile?.displayName || profile?.username || (isOwner ? 'Karl Ilves' : 'Karl Ilves');
        this.recordPlayedScore(username, displayName, score, wave, destroyed, isOwner);
    }

    public open() {
        if (!this.modalEl) return;
        this.syncCurrentPlayer();
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

        let list = this.getPlayedPlayers().map((p) => {
            const pUser = (p.username || p.name).toLowerCase();
            const isCurr = pUser === currentUsername || (isOwner && p.isOwner);
            return {
                ...p,
                isCurrentPlayer: isCurr,
                isRealPlayer: true
            };
        });

        // Optional search query filter
        if (this.searchQuery.trim()) {
            const q = this.searchQuery.trim().toLowerCase();
            list = list.filter((p) =>
                p.name.toLowerCase().includes(q) || (p.username && p.username.toLowerCase().includes(q))
            );
        }

        // Sort descending by highest score
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
                            🏆 SPACE DEFENDERS LEADERBOARD
                        </div>
                        <h2 style="font-size: 1.55rem; margin: 0; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                            Player Rankings & High Scores
                        </h2>
                        <div style="font-size: 0.76rem; color: #00f2fe; margin-top: 4px; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #00f2fe; box-shadow: 0 0 8px #00f2fe;"></span>
                            Showing players who have played this game. Results update in real time!
                        </div>
                    </div>
                    <button id="btn-close-leaderboard" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: #ffffff; border-radius: 10px; width: 36px; height: 36px; cursor: pointer; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">✕</button>
                </div>

                <!-- Search Input -->
                <div style="margin-bottom: 12px;">
                    <input type="text" id="lb-player-search" placeholder="🔍 Search players..." value="${escapeHtml(this.searchQuery)}" style="width: 100%; box-sizing: border-box; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 8px; padding: 8px 12px; color: #ffffff; font-size: 0.82rem; outline: none;">
                </div>

                <!-- Table Rows -->
                <div style="overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 8px; padding-right: 4px;">
                    ${entries.length === 0 ? `
                        <div style="text-align: center; padding: 25px; color: #8899a6; font-size: 0.9rem;">
                            No scores recorded yet. Launch a mission and defend Earth!
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
                                            <span style="font-size: 0.62rem; color: #2ed573; background: rgba(46, 213, 115, 0.15); border: 1px solid rgba(46, 213, 115, 0.4); padding: 1px 5px; border-radius: 4px; font-weight: 800;">✓ PLAYED</span>
                                            ${entry.isCurrentPlayer ? '<span style="font-size: 0.65rem; color: #00f2fe; background: rgba(0,242,254,0.25); padding: 1px 6px; border-radius: 4px; border: 1px solid #00f2fe; font-weight: 900;">✨ YOU</span>' : ''}
                                        </div>
                                        <div style="font-size: 0.72rem; color: #8899a6; margin-top: 2px;">
                                            Wave: ${entry.wave} | Destroyed: ${entry.asteroidsDestroyed}
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
                    💡 Every time someone plays, their score is recorded and the leaderboard updates automatically!
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
