import { GameState } from '../state/gameState';

export class CrownLeaderboardUI {
    private gameState: GameState;
    private listContainer: HTMLElement | null;

    constructor(gameState: GameState) {
        this.gameState = gameState;
        this.listContainer = document.getElementById('crown-leaderboard-list');
        this.render();
    }

    public render() {
        if (!this.listContainer) return;
        const players = this.gameState.getLeaderboard();

        this.listContainer.innerHTML = '';

        players.forEach((p, idx) => {
            const row = document.createElement('div');
            row.className = 'leaderboard-row';
            if (p.isOwner) {
                row.style.background = 'rgba(255, 215, 0, 0.08)';
                row.style.border = '1px solid rgba(255, 215, 0, 0.25)';
            }

            const rank = document.createElement('div');
            rank.className = 'leaderboard-rank';
            rank.textContent = `#${idx + 1}`;

            const info = document.createElement('div');
            info.className = 'leaderboard-info';

            const nameRow = document.createElement('div');
            nameRow.className = 'leaderboard-name';
            if (p.isOwner) {
                nameRow.innerHTML = `<span style="color: #ffd700;">👑 ${escapeHtml(p.name)}</span>`;
            } else {
                nameRow.textContent = p.name;
            }

            const barContainer = document.createElement('div');
            barContainer.className = 'leaderboard-progress-bar';

            const fill = document.createElement('div');
            fill.className = 'leaderboard-progress-fill';
            fill.style.width = `${p.percentage}%`;
            barContainer.appendChild(fill);

            info.appendChild(nameRow);
            info.appendChild(barContainer);

            const stats = document.createElement('div');
            stats.className = 'leaderboard-stats';

            const stageSpan = document.createElement('span');
            stageSpan.className = 'leaderboard-stage';
            stageSpan.textContent = `Stage ${p.stage} / 50`;

            const pctSpan = document.createElement('span');
            pctSpan.className = 'leaderboard-percent';
            pctSpan.textContent = `${p.percentage}%`;

            stats.appendChild(stageSpan);
            stats.appendChild(pctSpan);

            row.appendChild(rank);
            row.appendChild(info);
            row.appendChild(stats);

            this.listContainer!.appendChild(row);
        });
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
