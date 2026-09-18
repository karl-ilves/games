import { GameState } from '../state/gameState';

export class CrownLeaderboardUI {
    private gameState: GameState;
    private listContainer: HTMLElement | null;

    constructor(gameState: GameState) {
        this.gameState = gameState;
        this.listContainer = document.getElementById('crown-leaderboard-list');
        this.gameState.onLeaderboardUpdated(() => {
            this.render();
        });
        this.render();
    }

    public render() {
        if (!this.listContainer) return;
        const players = this.gameState.getLeaderboard();

        this.listContainer.innerHTML = '';

        players.forEach((p, idx) => {
            const row = document.createElement('div');
            row.className = 'leaderboard-row';
            if (p.id === 'curr_player') {
                row.classList.add('is-current-player');
                row.style.background = 'rgba(255, 215, 0, 0.12)';
                row.style.border = '1px solid rgba(255, 215, 0, 0.45)';
            } else if (p.isOwner) {
                row.style.background = 'rgba(255, 215, 0, 0.08)';
                row.style.border = '1px solid rgba(255, 215, 0, 0.25)';
            }

            const rank = document.createElement('div');
            rank.className = 'leaderboard-rank';
            rank.style.cssText = 'font-weight: 900; color: #ffd700; font-size: 0.76rem; min-width: 24px;';
            rank.textContent = `#${idx + 1}`;

            const info = document.createElement('div');
            info.className = 'leaderboard-info';
            info.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; padding-right: 6px;';

            const nameRow = document.createElement('div');
            nameRow.className = 'leaderboard-name';
            nameRow.style.cssText = 'font-weight: 800; color: #ffffff; font-size: 0.76rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
            if (p.isOwner) {
                nameRow.innerHTML = `<span style="color: #ffd700;">👑 ${escapeHtml(p.name)}</span>`;
            } else {
                nameRow.textContent = p.name;
            }

            const barContainer = document.createElement('div');
            barContainer.className = 'leaderboard-progress-bar';
            barContainer.style.cssText = 'width: 100%; height: 5px; background: rgba(255, 255, 255, 0.12); border-radius: 3px; overflow: hidden;';

            const fill = document.createElement('div');
            fill.className = 'leaderboard-progress-fill';
            fill.style.cssText = `height: 100%; width: ${p.percentage}%; background: linear-gradient(90deg, #00f2fe, #ffd700); border-radius: 3px; transition: width 0.4s ease;`;
            barContainer.appendChild(fill);

            info.appendChild(nameRow);
            info.appendChild(barContainer);

            const stats = document.createElement('div');
            stats.className = 'leaderboard-stats';
            stats.style.cssText = 'display: flex; align-items: center; gap: 8px; flex-shrink: 0;';

            const stageSpan = document.createElement('span');
            stageSpan.className = 'leaderboard-stage';
            stageSpan.style.cssText = 'font-weight: 700; color: #00f2fe; font-size: 0.74rem; white-space: nowrap;';
            stageSpan.textContent = `Stage ${p.stage} / 50`;

            const pctSpan = document.createElement('span');
            pctSpan.className = 'leaderboard-percent';
            pctSpan.style.cssText = 'font-weight: 900; color: #ffd700; background: rgba(255, 215, 0, 0.16); border: 1px solid rgba(255, 215, 0, 0.35); padding: 2px 7px; border-radius: 6px; font-size: 0.72rem; white-space: nowrap;';
            pctSpan.textContent = `${p.percentage}%`;

            stats.appendChild(stageSpan);
            stats.appendChild(pctSpan);

            row.appendChild(rank);
            row.appendChild(info);
            row.appendChild(stats);

            this.listContainer!.appendChild(row);
        });

        // Searching for other players row with animated wave letters (twice as slow: 4.4s)
        const searchingRow = document.createElement('div');
        searchingRow.className = 'leaderboard-searching-row';
        searchingRow.style.cssText = 'display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px 10px; color: #ffd700; font-size: 0.78rem; font-weight: 800; background: rgba(255, 215, 0, 0.05); border: 1.5px dashed rgba(255, 215, 0, 0.35); border-radius: 8px; margin-top: 8px; letter-spacing: 0.5px;';
        
        const searchPhrase = "Searching for players...";
        const lettersHtml = searchPhrase.split('').map((char, i) => {
            if (char === ' ') {
                return '<span style="display:inline-block; width: 5px;">&nbsp;</span>';
            }
            const delay = (i * 0.12).toFixed(2);
            return `<span class="wave-letter-search" style="animation-delay: ${delay}s;">${escapeHtml(char)}</span>`;
        }).join('');

        searchingRow.innerHTML = `
            <span style="font-size: 0.95rem; animation: pulse 2s infinite; margin-right: 4px;">🔍</span>
            <div style="display: inline-flex; align-items: baseline;">
                ${lettersHtml}
            </div>
        `;
        this.listContainer!.appendChild(searchingRow);
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
