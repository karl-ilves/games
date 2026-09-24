import { DEFAULT_LEADERBOARD } from '../catalog';
import { LeaderboardEntry } from '../types';
import { DefenderState } from '../state/defenderState';
import { getCurrentUserProfile } from '../../../auth';

export class DefenderLeaderboardUI {
    private modalEl: HTMLElement | null = null;
    private state: DefenderState;

    constructor(state: DefenderState) {
        this.state = state;
        this.initModal();
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

    public open() {
        if (!this.modalEl) return;
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
        const stats = this.state.getStats();
        const profile = getCurrentUserProfile();
        const isOwner = this.state.getIsOwner();

        const currentName = profile?.username || (isOwner ? 'Karl Ilves' : 'Kosmose Komandör');
        const bestScore = Math.max(stats.score, stats.highScore);

        // Build list starting from default catalog
        const entries: LeaderboardEntry[] = DEFAULT_LEADERBOARD.map((e) => ({ ...e }));

        // Check if current user is already represented or if we need to update/insert
        const existingIdx = entries.findIndex((e) => e.name.toLowerCase() === currentName.toLowerCase() || (isOwner && e.isOwner));
        if (existingIdx !== -1) {
            if (bestScore > entries[existingIdx].score) {
                entries[existingIdx].score = bestScore;
                entries[existingIdx].wave = Math.max(entries[existingIdx].wave, stats.wave);
                entries[existingIdx].asteroidsDestroyed = Math.max(entries[existingIdx].asteroidsDestroyed, stats.asteroidsDestroyed);
            }
            entries[existingIdx].isCurrentPlayer = true;
        } else {
            entries.push({
                id: 'lb_current',
                name: currentName,
                score: bestScore,
                wave: stats.wave,
                asteroidsDestroyed: stats.asteroidsDestroyed,
                isOwner: isOwner,
                isCurrentPlayer: true,
                avatarIcon: isOwner ? '👑' : '🛡️'
            });
        }

        // Sort descending by score
        entries.sort((a, b) => b.score - a.score);
        return entries;
    }

    public render() {
        if (!this.modalEl) return;

        const entries = this.getEntries();
        const maxScore = Math.max(...entries.map((e) => e.score), 1);

        this.modalEl.innerHTML = `
            <div class="modal-card leaderboard-modal-card" style="max-width: 620px; width: 95%; max-height: 88vh; display: flex; flex-direction: column; padding: 24px; text-align: left; border: 2px solid #ffd700; box-shadow: 0 0 50px rgba(255, 215, 0, 0.4); background: linear-gradient(155deg, #161524, #080712);">
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 1px solid rgba(255, 215, 0, 0.25); padding-bottom: 14px;">
                    <div>
                        <div class="modal-badge" style="border-color: #ffd700; color: #ffd700; background: rgba(255, 215, 0, 0.15); margin-bottom: 6px;">
                            🏆 GALAKTIKA KAITSJATE EDETABEL
                        </div>
                        <h2 style="font-size: 1.6rem; margin: 0; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                            Leaderboard - Parimad Punktid
                        </h2>
                    </div>
                    <button id="btn-close-leaderboard" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: #ffffff; border-radius: 10px; width: 36px; height: 36px; cursor: pointer; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">✕</button>
                </div>

                <!-- Table Rows -->
                <div style="overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 8px; padding-right: 4px;">
                    ${entries.map((entry, index) => {
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
                        }

                        const pct = Math.min(100, Math.round((entry.score / maxScore) * 100));

                        return `
                            <div class="leaderboard-entry-row" style="background: ${rowBg}; border: 1.5px solid ${rowBorder}; border-radius: 12px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                                <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
                                    <div style="font-weight: 900; font-size: 0.95rem; color: ${rankColor}; min-width: 48px;">
                                        ${rankBadge}
                                    </div>
                                    <div style="font-size: 1.4rem;">${entry.avatarIcon || '🚀'}</div>
                                    <div style="min-width: 0; flex: 1;">
                                        <div style="font-weight: 800; font-size: 0.92rem; color: #ffffff; display: flex; align-items: center; gap: 6px;">
                                            <span>${escapeHtml(entry.name)}</span>
                                            ${entry.isOwner ? '<span style="font-size: 0.65rem; color: #ffd700; background: rgba(255,215,0,0.2); padding: 1px 6px; border-radius: 4px; border: 1px solid #ffd700;">OWNER</span>' : ''}
                                            ${entry.isCurrentPlayer ? '<span style="font-size: 0.65rem; color: #00f2fe; background: rgba(0,242,254,0.2); padding: 1px 6px; border-radius: 4px; border: 1px solid #00f2fe;">SINA</span>' : ''}
                                        </div>
                                        <div style="font-size: 0.72rem; color: #8899a6; margin-top: 2px;">
                                            Laine: ${entry.wave} | Asteroidid: ${entry.asteroidsDestroyed}
                                        </div>
                                        <div style="width: 100%; height: 4px; background: rgba(255, 255, 255, 0.08); border-radius: 2px; margin-top: 5px; overflow: hidden;">
                                            <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #ffd700, #00f2fe); border-radius: 2px;"></div>
                                        </div>
                                    </div>
                                </div>

                                <div style="text-align: right; flex-shrink: 0;">
                                    <div style="font-size: 1.15rem; font-weight: 900; color: #ffd700; text-shadow: 0 0 10px rgba(255, 215, 0, 0.4);">
                                        ${entry.score.toLocaleString()} <span style="font-size: 0.75rem; color: #ffd700; font-weight: 700;">PTS</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- Footer hint -->
                <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 0.76rem; color: #8899a6; text-align: center;">
                    🚀 Hävita asteroide ja tõuse galaktika kaitsjate tippu!
                </div>
            </div>
        `;

        const closeBtn = this.modalEl.querySelector('#btn-close-leaderboard');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
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
