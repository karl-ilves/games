export interface AdvertisedGame {
    id: string;
    title: string;
    description: string;
    thumbnail?: string;
    creator?: string;
    gameUrl?: string;
    advertisedAt: number;
}

const ADVERTISED_GAMES_STORAGE_KEY = 'playard_advertised_games';

export function getAdvertisedGames(): AdvertisedGame[] {
    try {
        const raw = localStorage.getItem(ADVERTISED_GAMES_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {}
    return [];
}

export function saveAdvertisedGame(ad: AdvertisedGame): void {
    try {
        const current = getAdvertisedGames();
        const filtered = current.filter(g => g.id !== ad.id && g.title !== ad.title);
        filtered.unshift(ad);
        localStorage.setItem(ADVERTISED_GAMES_STORAGE_KEY, JSON.stringify(filtered));
        window.dispatchEvent(new CustomEvent('playard_advertised_games_updated', { detail: ad }));
    } catch (e) {}
}

export function clearAdvertisedGames(): void {
    try {
        localStorage.removeItem(ADVERTISED_GAMES_STORAGE_KEY);
        window.dispatchEvent(new CustomEvent('playard_advertised_games_updated'));
    } catch (e) {}
}
