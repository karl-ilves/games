import { getLanguage } from '../shared/i18n';

export interface GamesSearchOptions {
    searchInputId?: string;
    clearBtnId?: string;
    statusBarId?: string;
    countTextId?: string;
    resetHintId?: string;
    noResultsId?: string;
    noResultsTitleId?: string;
    noResultsDescId?: string;
    officialGridId?: string;
    communityGridId?: string;
    recentlyPlayedSectionId?: string;
}

const GAME_SYNONYMS: Record<string, string[]> = {
    'card-snake-game': ['uss', 'ussimäng', 'snake', 'õun', 'madu', 'retro', 'arcade', '2d', 'green', 'neoon'],
    'card-racing-game': ['auto', 'racing', 'võidusõit', 'kihutamine', 'sportauto', 'mootorratas', 'car', 'drive', 'speed'],
    'card-citycar-game': ['auto', 'citycar', 'sõit', 'linn', 'mets', 'jõgi', 'liiklus', 'drift', 'nature', 'drive', 'car'],
    'card-cooking-game': ['kokk', 'chef', 'cooking', 'burger', 'pizza', 'köök', 'söök', 'restoran', 'toit'],
    'card-war-game': ['sõda', 'war', 'tank', 'relv', 'rakett', 'lahing', 'missile', 'battle', 'soldier', '10v10'],
    'card-train-game': ['rong', 'train', 'vedur', 'raudtee', 'jaam', 'locomotive', 'railway', 'metroo', 'rongimäng'],
    'card-obby-game': ['obby', 'obbi', 'parkour', 'takistusrada', 'hüppamine', 'hüppa', 'jump'],
    'card-crown-game': ['crown', 'kroon', 'kuld', 'kuningas', 'obby', 'obbi', 'grand prize', '50 stages'],
    'card-metro-game': ['metro', 'metroo', 'last metro', 'vagun', 'müsteerium', 'horror', 'õudus', 'subway', 'train'],
    'card-mmp1-game': ['mmp1', 'murder', 'mõrv', 'šerif', 'sheriff', 'mõrvar', 'mystic', 'relv', 'nuga', 'knife', 'gun'],
    'card-rocket-game': ['rocket', 'rakett', 'raketid', 'tuumarelv', 'arcade', 'space', 'plahvatus'],
    'card-defender-game': ['defender', 'kaitse', 'maa', 'earth', 'asteroid', 'kosmos', 'space', 'laser', 'retro'],
    'card-breakout-game': ['breakout', 'klots', 'klotsipurustaja', 'pall', 'tellis', 'brick', 'retro', '2d', 'green'],
    'card-flight-game': ['lennuk', 'lennusimulaator', 'plane', 'airplane', 'flight', 'cessna', 'boeing', 'f22', 'raptor', 'lendamine', 'pilot', 'simulator', 'aviation']
};

export class GamesSearchManager {
    private searchInput: HTMLInputElement | null = null;
    private clearBtn: HTMLButtonElement | null = null;
    private statusBar: HTMLElement | null = null;
    private countText: HTMLElement | null = null;
    private resetHint: HTMLElement | null = null;
    private noResultsBox: HTMLElement | null = null;
    private noResultsTitle: HTMLElement | null = null;
    private noResultsDesc: HTMLElement | null = null;
    private officialGrid: HTMLElement | null = null;
    private communityGrid: HTMLElement | null = null;
    private recentlyPlayedSection: HTMLElement | null = null;

    private currentQuery: string = '';

    constructor(options: GamesSearchOptions = {}) {
        this.searchInput = document.getElementById(options.searchInputId || 'games-search-input') as HTMLInputElement | null;
        this.clearBtn = document.getElementById(options.clearBtnId || 'btn-clear-games-search') as HTMLButtonElement | null;
        this.statusBar = document.getElementById(options.statusBarId || 'games-search-status');
        this.countText = document.getElementById(options.countTextId || 'games-search-count-text');
        this.resetHint = document.getElementById(options.resetHintId || 'games-search-reset-hint');
        this.noResultsBox = document.getElementById(options.noResultsId || 'games-search-no-results');
        this.noResultsTitle = document.getElementById(options.noResultsTitleId || 'games-search-no-results-title');
        this.noResultsDesc = document.getElementById(options.noResultsDescId || 'games-search-no-results-desc');
        this.officialGrid = document.getElementById(options.officialGridId || 'official-games-grid');
        this.communityGrid = document.getElementById(options.communityGridId || 'community-games-grid');
        this.recentlyPlayedSection = document.getElementById(options.recentlyPlayedSectionId || 'recently-played-section');

        this.init();
    }

    private init() {
        if (!this.searchInput) return;

        this.searchInput.addEventListener('input', () => {
            this.handleSearch(this.searchInput?.value || '');
        });

        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clear();
            }
        });

        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => {
                this.clear();
                this.searchInput?.focus();
            });
        }

        if (this.resetHint) {
            this.resetHint.addEventListener('click', () => {
                this.clear();
                this.searchInput?.focus();
            });
        }
    }

    public handleSearch(rawQuery: string) {
        this.currentQuery = rawQuery;
        const q = rawQuery.trim().toLowerCase();
        const isEt = getLanguage() === 'et';

        if (!q) {
            this.resetVisibility();
            return;
        }

        if (this.clearBtn) this.clearBtn.style.display = 'flex';

        const officialCards = this.officialGrid ? Array.from(this.officialGrid.querySelectorAll<HTMLElement>('.game-card')) : [];
        let matchingCount = 0;

        for (const card of officialCards) {
            const cardId = card.id || '';
            const synonyms = GAME_SYNONYMS[cardId] || [];
            const text = (card.innerText || '').toLowerCase();
            const href = (card.getAttribute('href') || '').toLowerCase();

            const isMatch = text.includes(q) || href.includes(q) || synonyms.some(syn => syn.includes(q) || q.includes(syn));

            if (isMatch) {
                card.style.display = 'flex';
                matchingCount++;
            } else {
                card.style.display = 'none';
            }
        }

        if (this.communityGrid) {
            const commCards = Array.from(this.communityGrid.querySelectorAll<HTMLElement>('.game-card'));
            for (const card of commCards) {
                const text = (card.innerText || '').toLowerCase();
                const isMatch = text.includes(q);
                if (isMatch) {
                    card.style.display = 'flex';
                    matchingCount++;
                } else {
                    card.style.display = 'none';
                }
            }
        }

        if (this.recentlyPlayedSection) {
            const recentCards = Array.from(this.recentlyPlayedSection.querySelectorAll<HTMLElement>('.recently-played-card'));
            let anyRecentMatch = false;
            for (const rCard of recentCards) {
                const rText = (rCard.innerText || '').toLowerCase();
                if (rText.includes(q)) {
                    rCard.style.display = 'flex';
                    anyRecentMatch = true;
                } else {
                    rCard.style.display = 'none';
                }
            }
            if (!anyRecentMatch && recentCards.length > 0) {
                this.recentlyPlayedSection.style.display = 'none';
            } else {
                this.recentlyPlayedSection.style.display = '';
            }
        }

        if (this.statusBar) this.statusBar.style.display = 'flex';
        if (this.countText) {
            this.countText.textContent = isEt
                ? (matchingCount === 1 ? 'Leitud 1 mäng' : `Leitud ${matchingCount} mängu`)
                : (matchingCount === 1 ? 'Found 1 game' : `Found ${matchingCount} games`);
        }
        if (this.resetHint) {
            this.resetHint.textContent = isEt ? '✕ Näita kõiki mänge' : '✕ Show all games';
        }

        if (matchingCount === 0) {
            if (this.noResultsBox) this.noResultsBox.style.display = 'block';
            if (this.noResultsTitle) {
                this.noResultsTitle.textContent = isEt
                    ? `Ühtegi mängu ei leitud otsingule "${rawQuery.trim()}"`
                    : `No games found matching "${rawQuery.trim()}"`;
            }
            if (this.noResultsDesc) {
                this.noResultsDesc.textContent = isEt
                    ? 'Proovi otsida teise nimega (nt. Ussimäng, Auto, Sõda, Obby, Rong) või tühjenda otsing.'
                    : 'Try searching for another keyword (e.g. Snake, Car, War, Obby, Train) or clear search.';
            }
        } else {
            if (this.noResultsBox) this.noResultsBox.style.display = 'none';
        }
    }

    public clear() {
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        this.resetVisibility();
    }

    private resetVisibility() {
        this.currentQuery = '';
        if (this.clearBtn) this.clearBtn.style.display = 'none';
        if (this.statusBar) this.statusBar.style.display = 'none';
        if (this.noResultsBox) this.noResultsBox.style.display = 'none';

        if (this.officialGrid) {
            const officialCards = Array.from(this.officialGrid.querySelectorAll<HTMLElement>('.game-card'));
            for (const card of officialCards) {
                card.style.display = 'flex';
            }
        }

        if (this.communityGrid) {
            const commCards = Array.from(this.communityGrid.querySelectorAll<HTMLElement>('.game-card'));
            for (const card of commCards) {
                card.style.display = 'flex';
            }
        }

        if (this.recentlyPlayedSection) {
            this.recentlyPlayedSection.style.display = '';
            const recentCards = Array.from(this.recentlyPlayedSection.querySelectorAll<HTMLElement>('.recently-played-card'));
            for (const rCard of recentCards) {
                rCard.style.display = 'flex';
            }
        }
    }

    public updateLocalization(isEt: boolean) {
        if (this.searchInput) {
            this.searchInput.placeholder = isEt
                ? '🔍 Otsi mänge nime, žanri või märksõna järgi... (nt. Uss, Auto, Sõda)'
                : '🔍 Search games by name, genre or keyword... (e.g. Snake, Car, War)';
        }
        if (this.currentQuery) {
            this.handleSearch(this.currentQuery);
        }
    }
}

let searchManagerInstance: GamesSearchManager | null = null;

export function initGamesSearch(): GamesSearchManager {
    if (!searchManagerInstance) {
        searchManagerInstance = new GamesSearchManager();
    }
    return searchManagerInstance;
}

export function getGamesSearchManager(): GamesSearchManager | null {
    return searchManagerInstance;
}
