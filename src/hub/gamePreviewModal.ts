import { getCurrentUserProfile, isPlayardOwner, isOwnerUser, formatOwnerNametag } from '../auth';
import { yardService } from '../shared/yardService';
import { friendService } from '../shared/friends/friendService';
import { supabase } from '../lib/supabase';

export interface GamePreviewInfo {
    id: string;
    title: string;
    description: string;
    url: string;
    icon: string;
    badgeText: string;
    badgeColor: string;
    creatorName?: string;
    thumbnail?: string;
}

export interface GameStatsRecord {
    gameId: string;
    likedBy: string[];
    uniquePlayers: string[];
    updatedAt: number;
}

const GAME_STATS_STORAGE_KEY = 'playard_game_stats_v1';

export const OFFICIAL_GAMES_CATALOG: Record<string, GamePreviewInfo> = {
    crown: {
        id: 'crown',
        title: '👑 24K Crown Obby',
        description: "50-etapiline kuninglik takistusrada! Võida maailma ainus 👑 24K Royal Crown & Golden Monarch kostüüm!",
        url: './games/crown/index.html',
        icon: '👑',
        badgeText: '🏆 50 Stages Obby',
        badgeColor: '#ffd700',
        creatorName: 'Playard Games'
    },
    racing: {
        id: 'racing',
        title: '🏎️ Racing Simulator',
        description: 'Kihuta sportautode ja mootorratastega ringrajal, teeni Playbuxe ja lukusta lahti uusi superautosid!',
        url: './games/racing/index.html',
        icon: '🏎️',
        badgeText: 'Circuit Racing',
        badgeColor: '#ffd32a',
        creatorName: 'Playard Games'
    },
    flight: {
        id: 'flight',
        title: '✈️ 3D Flight Simulator',
        description: 'Tõuse õhku reisilennukite, hävitajate ja helikopteritega! Lenda läbi rõngaste ja maandu lennuväljadel.',
        url: './games/flight/index.html',
        icon: '✈️',
        badgeText: 'Open Sky',
        badgeColor: '#00f2fe',
        creatorName: 'Playard Games'
    },
    cooking: {
        id: 'cooking',
        title: '🍳 3D Master Chef',
        description: 'Küpseta burgereid, pitsasid ja maitsvaid roogasid 3D restoraniköögis enne kui aeg otsa saab!',
        url: './games/cooking/index.html',
        icon: '🍳',
        badgeText: '💎 +20 kuni +40 Playbux',
        badgeColor: '#ff9f43',
        creatorName: 'Playard Games'
    },
    war: {
        id: 'war',
        title: '⚓ 3D Naval & Air Warfare',
        description: 'Juhi sõjalaevu ja hävituslennukeid suurejoonelistes mere- ja õhulahingutes ning kaitse oma baasi!',
        url: './games/war/index.html',
        icon: '⚓',
        badgeText: 'Naval & Air Combat',
        badgeColor: '#ff4757',
        creatorName: 'Playard Games'
    },
    train: {
        id: 'train',
        title: '🚆 Rongimäng (3D Train Simulator)',
        description: 'Sõida Elroni Porgandi ja teiste rongidega läbi jaamade, võta peale reisijaid ja kogu Playbuxe!',
        url: './games/train/index.html',
        icon: '🚆',
        badgeText: 'Railway Sim',
        badgeColor: '#ff793f',
        creatorName: 'Playard Games'
    },
    obby: {
        id: 'obby',
        title: '🏃 3D Parkour Obby',
        description: 'Hüppa üle liikuvate platvormide ja laavaplokkide selles põnevas 3D parkuurimängus!',
        url: './games/obby/index.html',
        icon: '🏃',
        badgeText: '💎 +25 Playbux võit',
        badgeColor: '#0be881',
        creatorName: 'Playard Games'
    },
    metro: {
        id: 'metro',
        title: '🚇 Last Metro (Survival Horror)',
        description: 'Avasta pimedat metroojaama taskulambiga, leia võtmed ja põgene enne kui varjud sind kätte saavad!',
        url: './games/metro/index.html',
        icon: '🚇',
        badgeText: '👻 Horror Survival',
        badgeColor: '#ff4757',
        creatorName: 'Playard Games'
    },
    mmp1: {
        id: 'mmp1',
        title: '⚔️ MMP1: Multi-Map Battle Arena',
        description: 'Võitle mitmel erineval 3D areenil, vali relvad ja tõuse edetabeli tippu!',
        url: './games/mmp1/index.html',
        icon: '⚔️',
        badgeText: '💎 +5 Playbux iga Killi eest',
        badgeColor: '#ff4757',
        creatorName: 'Playard Games'
    },
    rocket: {
        id: 'rocket',
        title: '🚀 3D Rocket Builder',
        description: 'Ehita oma kosmoserakett, stardi atmosfäärist välja ja lenda Kuule ning kaugemale!',
        url: './games/rocket/index.html',
        icon: '🚀',
        badgeText: 'Space Sandbox',
        badgeColor: '#00f2fe',
        creatorName: 'Playard Games'
    },
    citycar: {
        id: 'citycar',
        title: '🚓 3D Linnasõit (Open World)',
        description: 'Avasta suurt 3D linna politseiauto, takso või sportautoga ja täida linnamissioone!',
        url: './games/citycar/index.html',
        icon: '🚓',
        badgeText: 'Open City',
        badgeColor: '#00d2d3',
        creatorName: 'Playard Games'
    },
    defender: {
        id: 'defender',
        title: '🛡️ 3D Base Defender',
        description: 'Ehita kaitsetorne ja kaitse oma baasi vaenlaste lainete eest 3D strateegiamängus!',
        url: './games/defender/index.html',
        icon: '🛡️',
        badgeText: 'Tower Defense',
        badgeColor: '#a55eea',
        creatorName: 'Playard Games'
    },
    breakout: {
        id: 'breakout',
        title: '🟢 Roheline Ruut (2D Breakout)',
        description: 'Liiguta alust, põrgata palli tagasi ja purusta kõik rohelised ruudud klassikalises arkaadmängus!',
        url: './games/breakout/index.html',
        icon: '🟢',
        badgeText: '🟢 2D Retro Arcade',
        badgeColor: '#2ed573',
        creatorName: 'Playard Games'
    },
    snake: {
        id: 'snake',
        title: '🐍 2D Ussimäng (Retro Arcade)',
        description: 'Kogu õunu, kasvata ussi pikemaks ja püstita uus rekord!',
        url: './games/snake/index.html',
        icon: '🐍',
        badgeText: '🐍 Retro Snake',
        badgeColor: '#2ed573',
        creatorName: 'Playard Games'
    },
    play: {
        id: 'play',
        title: '🎮 Community 3D Games',
        description: 'Avasta ja mängi teiste Playardi mängijate loodud 3D maailmu!',
        url: './games/play/index.html',
        icon: '🎮',
        badgeText: 'Community Play',
        badgeColor: '#00f2fe',
        creatorName: 'Playard Games'
    }
};

const BANNERS_THEME: Record<string, { bg1: string; bg2: string; accent: string; subtitle: string; decor: string }> = {
    crown: { bg1: '#1a1200', bg2: '#4a3500', accent: '#ffd700', subtitle: '50 STAGES • ROYAL GRAND PRIZE', decor: '👑✨🏆' },
    racing: { bg1: '#1e0b0b', bg2: '#4a151b', accent: '#ffd32a', subtitle: 'HIGH SPEED CIRCUIT RACING', decor: '🏎️🏁⚡' },
    flight: { bg1: '#071a2e', bg2: '#0f385c', accent: '#00f2fe', subtitle: 'OPEN SKY AVIATION SIMULATOR', decor: '✈️☁️🌍' },
    cooking: { bg1: '#2b1406', bg2: '#592808', accent: '#ff9f43', subtitle: '3D RESTAURANT & KITCHEN RUSH', decor: '🍳🍔🍕' },
    war: { bg1: '#0d1b26', bg2: '#2c1620', accent: '#ff4757', subtitle: 'NAVAL FLEET & AIR COMBAT', decor: '⚓✈️💥' },
    train: { bg1: '#261408', bg2: '#4d260b', accent: '#ff793f', subtitle: 'ELRON 3D RAILWAY SIMULATOR', decor: '🚆🛤️🏔️' },
    obby: { bg1: '#092418', bg2: '#124a32', accent: '#0be881', subtitle: '3D PARKOUR OBSTACLE COURSE', decor: '🏃💎🔥' },
    metro: { bg1: '#090b10', bg2: '#240b15', accent: '#ff4757', subtitle: 'UNDERGROUND SURVIVAL HORROR', decor: '🚇🔦👻' },
    mmp1: { bg1: '#1f0b18', bg2: '#42122b', accent: '#ff4757', subtitle: 'MULTI-MAP 3D BATTLE ARENA', decor: '⚔️🛡️🎯' },
    rocket: { bg1: '#060c1f', bg2: '#15224d', accent: '#00f2fe', subtitle: 'BUILD & LAUNCH TO SPACE', decor: '🚀🌕⭐' },
    citycar: { bg1: '#081f24', bg2: '#103e47', accent: '#00d2d3', subtitle: 'OPEN WORLD 3D CITY DRIVING', decor: '🚓🏙️🚦' },
    defender: { bg1: '#180c29', bg2: '#311852', accent: '#a55eea', subtitle: '3D TACTICAL TOWER DEFENSE', decor: '🛡️🏰⚡' },
    breakout: { bg1: '#071f12', bg2: '#104226', accent: '#2ed573', subtitle: 'CLASSIC 2D BRICK BREAKER', decor: '🟢🧱⚡' },
    snake: { bg1: '#09210e', bg2: '#14451e', accent: '#2ed573', subtitle: 'RETRO ARCADE SNAKE', decor: '🐍🍎🏆' },
    play: { bg1: '#081c29', bg2: '#103952', accent: '#00f2fe', subtitle: 'COMMUNITY 3D WORLDS', decor: '🎮🌐✨' }
};

export function generateLargeGameBannerDataUrl(game: GamePreviewInfo): string {
    if (game.thumbnail && game.thumbnail.startsWith('data:image')) {
        return game.thumbnail;
    }
    const theme = BANNERS_THEME[game.id] || {
        bg1: '#0f172a',
        bg2: '#1e293b',
        accent: game.badgeColor || '#00f2fe',
        subtitle: 'PLAYARD 3D EXPERIENCE',
        decor: `${game.icon || '🎮'}✨`
    };
    const safeTitle = (game.title || 'Playard Game').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const safeSub = theme.subtitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeBadge = (game.badgeText || 'Playard Official').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeCreator = (game.creatorName || 'Playard Games').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 420" width="800" height="420">
        <defs>
            <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${theme.bg1}"/>
                <stop offset="55%" stop-color="${theme.bg2}"/>
                <stop offset="100%" stop-color="#090d16"/>
            </linearGradient>
            <radialGradient id="glowGrad" cx="75%" cy="40%" r="55%">
                <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.38"/>
                <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0"/>
            </radialGradient>
            <linearGradient id="gridGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.03"/>
                <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0.22"/>
            </linearGradient>
        </defs>
        <rect width="800" height="420" fill="url(#bgGrad)"/>
        <rect width="800" height="420" fill="url(#glowGrad)"/>
        <!-- Perspective 3D Horizon Grid -->
        <g stroke="url(#gridGrad)" stroke-width="1.5">
            <line x1="0" y1="290" x2="800" y2="290"/>
            <line x1="0" y1="325" x2="800" y2="325"/>
            <line x1="0" y1="365" x2="800" y2="365"/>
            <line x1="0" y1="405" x2="800" y2="405"/>
            <line x1="400" y1="260" x2="-100" y2="420"/>
            <line x1="400" y1="260" x2="100" y2="420"/>
            <line x1="400" y1="260" x2="300" y2="420"/>
            <line x1="400" y1="260" x2="500" y2="420"/>
            <line x1="400" y1="260" x2="700" y2="420"/>
            <line x1="400" y1="260" x2="900" y2="420"/>
        </g>
        <!-- Decorative 3D Orbs -->
        <circle cx="620" cy="175" r="115" fill="${theme.accent}" fill-opacity="0.12" stroke="${theme.accent}" stroke-opacity="0.4" stroke-width="2"/>
        <circle cx="620" cy="175" r="82" fill="${theme.accent}" fill-opacity="0.18"/>
        <!-- Large Game Icon -->
        <text x="620" y="210" font-family="system-ui, -apple-system, sans-serif" font-size="110" text-anchor="middle">${game.icon || '🎮'}</text>
        <!-- Top Badge -->
        <rect x="42" y="38" width="240" height="36" rx="18" fill="${theme.accent}" fill-opacity="0.18" stroke="${theme.accent}" stroke-opacity="0.6" stroke-width="1.5"/>
        <text x="162" y="61" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="800" fill="${theme.accent}" text-anchor="middle" letter-spacing="1">${safeBadge}</text>
        <!-- Game Title & Subtitle -->
        <text x="42" y="165" font-family="system-ui, -apple-system, sans-serif" font-size="40" font-weight="900" fill="#ffffff">${safeTitle}</text>
        <text x="44" y="205" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="800" fill="${theme.accent}" letter-spacing="2.5">${safeSub}</text>
        <text x="44" y="255" font-family="system-ui, -apple-system, sans-serif" font-size="34">${theme.decor}</text>
        <!-- Creator Watermark -->
        <rect x="42" y="345" width="245" height="38" rx="10" fill="#090d16" fill-opacity="0.82" stroke="#ffffff" stroke-opacity="0.15"/>
        <text x="164" y="369" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" fill="#00f2fe" text-anchor="middle" letter-spacing="0.8">👤 By: ${safeCreator}</text>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const TEST_DUMMY_USERNAMES = new Set([
    'driver_bob',
    'playeralpha',
    'playerbeta',
    'historicalplayer1',
    'bantestplayer99',
    'kawe1234',
    'player9yo',
    'minionbanana0_0'
]);

const realDatabaseUsernames = new Set<string>();

function isTestModeActive(): boolean {
    return typeof window !== 'undefined' && !!(window as any).__PLAYARD_TEST_MODE__;
}

export function isTestDummyOrFakePlayer(username: string): boolean {
    const u = (username || '').trim().toLowerCase();
    if (!u) return true;
    if (TEST_DUMMY_USERNAMES.has(u)) return true;
    if (u.startsWith('test_') || u.startsWith('bantest')) return true;
    return false;
}

function getCurrentPlayerIdentifier(): string {
    const prof = getCurrentUserProfile();
    if (prof && prof.username && prof.username.trim()) {
        return prof.username.trim().toLowerCase();
    }
    let guestId = localStorage.getItem('playard_guest_device_id');
    if (!guestId) {
        guestId = 'guest_' + Math.random().toString(36).substring(2, 10);
        try {
            localStorage.setItem('playard_guest_device_id', guestId);
        } catch (e) {}
    }
    return guestId;
}

function isRealAllowedPlayerIdent(ident: string, isTestEnv: boolean): boolean {
    const clean = (ident || '').trim().toLowerCase();
    if (!clean) return false;
    if (isTestEnv) return true;
    if (isTestDummyOrFakePlayer(clean)) return false;
    if (clean.startsWith('guest_')) return false;
    if (realDatabaseUsernames.size > 0 && !realDatabaseUsernames.has(clean)) {
        const myProf = getCurrentUserProfile();
        const myUser = myProf?.username?.trim().toLowerCase();
        if (clean !== myUser) return false;
    }
    return true;
}

function purgeFakeAndStaleLocalData() {
    if (isTestModeActive()) return;
    const now = Date.now();
    const isOnHub = typeof window !== 'undefined' && !window.location.pathname.toLowerCase().includes('/games/');
    const myProf = getCurrentUserProfile();
    const myUser = myProf?.username?.trim().toLowerCase() || '';

    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('playard_active_game_')) {
                const u = key.replace('playard_active_game_', '').trim().toLowerCase();
                if (isTestDummyOrFakePlayer(u) || (isOnHub && u === myUser)) {
                    keysToRemove.push(key);
                    continue;
                }
                const raw = localStorage.getItem(key);
                if (raw) {
                    try {
                        const parsed = JSON.parse(raw);
                        const ts = parsed?.timestamp || 0;
                        // Active game heartbeat must be within the last 45 seconds
                        if (!parsed || !parsed.url || (now - ts > 45000)) {
                            keysToRemove.push(key);
                        }
                    } catch (e) {
                        keysToRemove.push(key);
                    }
                }
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {}
}

function loadAllGameStats(): Record<string, GameStatsRecord> {
    try {
        const raw = localStorage.getItem(GAME_STATS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                return parsed;
            }
        }
    } catch (e) {}
    return {};
}

function saveAllGameStats(stats: Record<string, GameStatsRecord>) {
    try {
        localStorage.setItem(GAME_STATS_STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {}
}

export function getGameStats(gameId: string): {
    likesCount: number;
    isLikedByMe: boolean;
    uniquePlayersCount: number;
    activePlayersCount: number;
    activePlayerNames: string[];
} {
    const isTestEnv = isTestModeActive();
    if (!isTestEnv) {
        purgeFakeAndStaleLocalData();
    }

    const cleanId = (gameId || '').trim().toLowerCase();
    const all = loadAllGameStats();
    const record: GameStatsRecord = all[cleanId] || {
        gameId: cleanId,
        likedBy: [],
        uniquePlayers: [],
        updatedAt: Date.now()
    };

    const me = getCurrentPlayerIdentifier();
    const isOnHub = typeof window !== 'undefined' && !window.location.pathname.toLowerCase().includes('/games/');

    const likedSet = new Set(
        (record.likedBy || [])
            .map(u => u.toLowerCase().trim())
            .filter(u => isTestEnv || !isTestDummyOrFakePlayer(u))
    );

    const uniqueSet = new Set(
        (record.uniquePlayers || [])
            .map(u => u.toLowerCase().trim())
            .filter(u => isRealAllowedPlayerIdent(u, isTestEnv))
    );

    // Include logged-in real player if they have actually played this game in their Recently Played history
    if (isRealAllowedPlayerIdent(me, isTestEnv)) {
        try {
            const recentKey = !isTestEnv && me && !me.startsWith('guest_')
                ? `playard_yards_recently_played_${me}`
                : 'playard_recently_played_games';
            const recentRaw = localStorage.getItem(recentKey) || localStorage.getItem('playard_recently_played_games');
            if (recentRaw) {
                const recentList = JSON.parse(recentRaw);
                if (Array.isArray(recentList) && recentList.some((g: any) => (g.id || '').toLowerCase() === cleanId)) {
                    uniqueSet.add(me);
                }
            }
        } catch (e) {}
    }

    // Scan live active games (`playard_active_game_<username>`)
    const activePlayerNames: string[] = [];
    const now = Date.now();
    const activeWindowMs = isTestEnv ? 1800000 : 45000;

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('playard_active_game_')) {
                const username = key.replace('playard_active_game_', '').trim();
                const lowerUser = username.toLowerCase();
                if (!isRealAllowedPlayerIdent(lowerUser, isTestEnv)) continue;
                // If the current user is on the Hub menu in real mode, they are not inside a game
                if (!isTestEnv && isOnHub && lowerUser === me) continue;

                const valRaw = localStorage.getItem(key);
                if (valRaw) {
                    const parsed = JSON.parse(valRaw);
                    if (parsed) {
                        const matchesId = (parsed.id || '').toLowerCase() === cleanId;
                        const matchesUrl = parsed.url && parsed.url.toLowerCase().includes(`/games/${cleanId}/`);
                        if (matchesId || matchesUrl) {
                            uniqueSet.add(lowerUser);
                            const ts = parsed.timestamp || 0;
                            if (now - ts < activeWindowMs) {
                                activePlayerNames.push(isOwnerUser(username) ? formatOwnerNametag('Playard Owner', true) : formatOwnerNametag(username));
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {}

    // Persist cleaned unique players & likes
    const newUniqueArr = Array.from(uniqueSet);
    const newLikedArr = Array.from(likedSet);
    if (
        newUniqueArr.length !== (record.uniquePlayers || []).length ||
        newLikedArr.length !== (record.likedBy || []).length
    ) {
        record.uniquePlayers = newUniqueArr;
        record.likedBy = newLikedArr;
        all[cleanId] = record;
        saveAllGameStats(all);
    }

    return {
        likesCount: likedSet.size,
        isLikedByMe: likedSet.has(me),
        uniquePlayersCount: uniqueSet.size,
        activePlayersCount: activePlayerNames.length,
        activePlayerNames
    };
}

export function toggleGameLike(gameId: string): {
    likesCount: number;
    isLikedByMe: boolean;
} {
    const isTestEnv = isTestModeActive();
    const cleanId = (gameId || '').trim().toLowerCase();
    const all = loadAllGameStats();
    const record: GameStatsRecord = all[cleanId] || {
        gameId: cleanId,
        likedBy: [],
        uniquePlayers: [],
        updatedAt: Date.now()
    };

    const me = getCurrentPlayerIdentifier();
    const likedSet = new Set(
        (record.likedBy || [])
            .map(u => u.toLowerCase().trim())
            .filter(u => isTestEnv || !isTestDummyOrFakePlayer(u))
    );

    let isLikedByMe = false;
    if (likedSet.has(me)) {
        likedSet.delete(me);
        isLikedByMe = false;
    } else {
        likedSet.add(me);
        isLikedByMe = true;
    }

    record.likedBy = Array.from(likedSet);
    record.updatedAt = Date.now();
    all[cleanId] = record;
    saveAllGameStats(all);

    syncGameStatsToCloud(record);

    return {
        likesCount: likedSet.size,
        isLikedByMe
    };
}

export function recordUniquePlayerPlay(gameId: string, customUsername?: string): number {
    const isTestEnv = isTestModeActive();
    const cleanId = (gameId || '').trim().toLowerCase();
    if (!cleanId) return 0;
    const all = loadAllGameStats();
    const record: GameStatsRecord = all[cleanId] || {
        gameId: cleanId,
        likedBy: [],
        uniquePlayers: [],
        updatedAt: Date.now()
    };

    const playerIdent = (customUsername && customUsername.trim())
        ? customUsername.trim().toLowerCase()
        : getCurrentPlayerIdentifier();

    const uniqueSet = new Set(
        (record.uniquePlayers || [])
            .map(u => u.toLowerCase().trim())
            .filter(u => isRealAllowedPlayerIdent(u, isTestEnv))
    );

    if (isRealAllowedPlayerIdent(playerIdent, isTestEnv)) {
        uniqueSet.add(playerIdent);
    }

    record.uniquePlayers = Array.from(uniqueSet);
    record.updatedAt = Date.now();
    all[cleanId] = record;
    saveAllGameStats(all);

    syncGameStatsToCloud(record);
    return uniqueSet.size;
}

async function syncGameStatsToCloud(record: GameStatsRecord) {
    const isTestEnv = isTestModeActive() || (typeof navigator !== 'undefined' && navigator.webdriver);
    if (!supabase || isTestEnv) return;
    try {
        const cleanLikes = (record.likedBy || []).filter(u => !isTestDummyOrFakePlayer(u));
        const cleanUnique = (record.uniquePlayers || []).filter(u => !isTestDummyOrFakePlayer(u) && !u.startsWith('guest_'));

        const titleKey = `GAME_STATS:${record.gameId}`;
        const payloadStr = JSON.stringify({
            gameId: record.gameId,
            likedBy: cleanLikes,
            uniquePlayers: cleanUnique,
            updatedAt: record.updatedAt
        });

        const { data: existing } = await supabase
            .from('user_created_games')
            .select('id, description')
            .eq('category', 'game_stats_meta')
            .eq('title', titleKey);

        if (existing && existing.length > 0) {
            await supabase
                .from('user_created_games')
                .update({ description: payloadStr, status: 'active' })
                .eq('id', existing[0].id);
            // Clean up any duplicate rows for the same game
            if (existing.length > 1) {
                for (let i = 1; i < existing.length; i++) {
                    await supabase.from('user_created_games').delete().eq('id', existing[i].id);
                }
            }
        } else {
            await supabase
                .from('user_created_games')
                .insert([{
                    title: titleKey,
                    description: payloadStr,
                    creator_username: 'PlayardStats',
                    category: 'game_stats_meta',
                    status: 'active'
                }]);
        }
    } catch (e) {}
}

export async function fetchCloudGameStats() {
    const isTestEnv = isTestModeActive() || (typeof navigator !== 'undefined' && navigator.webdriver);
    if (!supabase || isTestEnv) return;
    try {
        purgeFakeAndStaleLocalData();

        // 1. Load real registered players from Supabase profiles + user_yards
        const userIdToUsername = new Map<string, string>();
        try {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, username');
            if (Array.isArray(profiles)) {
                realDatabaseUsernames.clear();
                profiles.forEach(p => {
                    if (p.username && p.username.trim() && !isTestDummyOrFakePlayer(p.username)) {
                        const cleanU = p.username.trim().toLowerCase();
                        realDatabaseUsernames.add(cleanU);
                        if (p.id) userIdToUsername.set(p.id, cleanU);
                    }
                });
            }
        } catch (e) {}

        const localAll = loadAllGameStats();
        let changed = false;

        const addRealUniquePlayerToGame = (gid: string, username: string) => {
            const cleanU = username.trim().toLowerCase();
            if (!cleanU || isTestDummyOrFakePlayer(cleanU) || cleanU.startsWith('guest_')) return;
            const rec = localAll[gid] || { gameId: gid, likedBy: [], uniquePlayers: [], updatedAt: Date.now() };
            const set = new Set((rec.uniquePlayers || []).map(x => x.toLowerCase().trim()));
            if (!set.has(cleanU)) {
                set.add(cleanU);
                rec.uniquePlayers = Array.from(set);
                localAll[gid] = rec;
                changed = true;
            }
        };

        // 2. Discover real players who have saved game progress/items in user_yards
        try {
            const { data: yardsRows } = await supabase
                .from('user_yards')
                .select('user_id, inventory');
            if (Array.isArray(yardsRows)) {
                yardsRows.forEach(row => {
                    const uName = userIdToUsername.get(row.user_id);
                    if (!uName || !Array.isArray(row.inventory)) return;
                    const inv: string[] = row.inventory.map((x: any) => String(x));
                    if (inv.some(i => i.startsWith('meta_train_money:') && i !== 'meta_train_money:0')) {
                        addRealUniquePlayerToGame('train', uName);
                    }
                    if (inv.some(i => (i.startsWith('meta_war_money:') && i !== 'meta_war_money:0') || i.startsWith('war_'))) {
                        addRealUniquePlayerToGame('war', uName);
                    }
                    if (inv.some(i => i === 'pass_all_rockets' || i === 'pass_2x_score')) {
                        addRealUniquePlayerToGame('rocket', uName);
                    }
                    if (inv.some(i => i.startsWith('defender_'))) {
                        addRealUniquePlayerToGame('defender', uName);
                    }
                    if (inv.some(i => i.startsWith('metro_'))) {
                        addRealUniquePlayerToGame('metro', uName);
                    }
                });
            }
        } catch (e) {}

        // 3. Load persisted game_stats_meta rows from Supabase
        const { data } = await supabase
            .from('user_created_games')
            .select('id, title, description')
            .eq('category', 'game_stats_meta')
            .eq('status', 'active');

        if (Array.isArray(data) && data.length > 0) {
            data.forEach(row => {
                try {
                    const parsed = typeof row.description === 'string' ? JSON.parse(row.description) : row.description;
                    if (parsed && parsed.gameId) {
                        const gid = parsed.gameId.toLowerCase();
                        const existing = localAll[gid] || { gameId: gid, likedBy: [], uniquePlayers: [], updatedAt: 0 };
                        const mergedLikes = Array.from(new Set([...(existing.likedBy || []), ...(parsed.likedBy || [])]))
                            .map(u => u.toLowerCase().trim())
                            .filter(u => !isTestDummyOrFakePlayer(u));
                        const mergedUnique = Array.from(new Set([...(existing.uniquePlayers || []), ...(parsed.uniquePlayers || [])]))
                            .map(u => u.toLowerCase().trim())
                            .filter(u => isRealAllowedPlayerIdent(u, false));
                        localAll[gid] = {
                            gameId: gid,
                            likedBy: mergedLikes,
                            uniquePlayers: mergedUnique,
                            updatedAt: Math.max(existing.updatedAt || 0, parsed.updatedAt || 0)
                        };
                        changed = true;
                    }
                } catch (e) {}
            });
        }

        // 4. Sync real-time active players from Supabase (`player_active_game`)
        try {
            const { data: activeRows } = await supabase
                .from('user_created_games')
                .select('creator_username, description, status')
                .eq('category', 'player_active_game');

            if (Array.isArray(activeRows)) {
                const now = Date.now();
                const isOnHub = typeof window !== 'undefined' && !window.location.pathname.toLowerCase().includes('/games/');
                const myProf = getCurrentUserProfile();
                const myUser = myProf?.username?.trim().toLowerCase() || '';

                activeRows.forEach(ag => {
                    const pUser = (ag.creator_username || '').trim().toLowerCase();
                    if (!pUser || isTestDummyOrFakePlayer(pUser)) {
                        localStorage.removeItem(`playard_active_game_${pUser}`);
                        return;
                    }
                    if (isOnHub && pUser === myUser) {
                        localStorage.removeItem(`playard_active_game_${pUser}`);
                        return;
                    }
                    if (ag.status !== 'playing') {
                        localStorage.removeItem(`playard_active_game_${pUser}`);
                        return;
                    }
                    try {
                        const parsed = typeof ag.description === 'string' ? JSON.parse(ag.description) : ag.description;
                        const ts = parsed?.timestamp || 0;
                        if (parsed && parsed.url && (now - ts < 45000)) {
                            localStorage.setItem(`playard_active_game_${pUser}`, JSON.stringify(parsed));
                            if (parsed.id) {
                                addRealUniquePlayerToGame(String(parsed.id).toLowerCase(), pUser);
                            }
                        } else {
                            localStorage.removeItem(`playard_active_game_${pUser}`);
                        }
                    } catch (e) {
                        localStorage.removeItem(`playard_active_game_${pUser}`);
                    }
                });
            }
        } catch (e) {}

        if (changed) {
            saveAllGameStats(localAll);
        }
        if (currentOpenedGame) {
            refreshGamePreviewStatsUI(currentOpenedGame.id);
        }
    } catch (e) {}
}

let currentOpenedGame: GamePreviewInfo | null = null;
let liveStatsInterval: any = null;

export function refreshGamePreviewStatsUI(gameId: string) {
    const stats = getGameStats(gameId);

    const likesCountEl = document.getElementById('game-preview-likes-count');
    const likeBtn = document.getElementById('btn-game-preview-like');
    const likeBtnLabel = document.getElementById('game-preview-like-label');
    const uniquePlayersEl = document.getElementById('game-preview-unique-players');
    const activePlayersEl = document.getElementById('game-preview-active-players');
    const activePlayersNamesEl = document.getElementById('game-preview-active-players-names');

    if (likesCountEl) {
        likesCountEl.textContent = String(stats.likesCount);
    }
    if (likeBtn) {
        likeBtn.setAttribute('data-liked', stats.isLikedByMe ? 'true' : 'false');
        if (stats.isLikedByMe) {
            likeBtn.style.background = 'linear-gradient(135deg, #0be881, #05c46b)';
            likeBtn.style.color = '#0b111a';
            likeBtn.style.borderColor = '#0be881';
            likeBtn.style.boxShadow = '0 4px 18px rgba(11, 232, 129, 0.45)';
        } else {
            likeBtn.style.background = 'rgba(11, 232, 129, 0.12)';
            likeBtn.style.color = '#0be881';
            likeBtn.style.borderColor = 'rgba(11, 232, 129, 0.45)';
            likeBtn.style.boxShadow = 'none';
        }
    }
    if (likeBtnLabel) {
        likeBtnLabel.textContent = stats.isLikedByMe ? 'Liked (Meeldib ✓)' : 'Like (Meeldib)';
    }
    if (uniquePlayersEl) {
        uniquePlayersEl.textContent = String(stats.uniquePlayersCount);
    }
    if (activePlayersEl) {
        activePlayersEl.textContent = String(stats.activePlayersCount);
    }
    if (activePlayersNamesEl) {
        if (stats.activePlayerNames.length > 0) {
            activePlayersNamesEl.style.display = 'block';
            activePlayersNamesEl.textContent = `Praegu mängivad: ${stats.activePlayerNames.join(', ')}`;
        } else {
            activePlayersNamesEl.style.display = 'none';
            activePlayersNamesEl.textContent = '';
        }
    }
}

export function openGamePreviewModal(game: GamePreviewInfo) {
    currentOpenedGame = game;
    const modal = document.getElementById('modal-game-preview');
    if (!modal) return;

    const imgEl = document.getElementById('game-preview-image') as HTMLImageElement | null;
    const titleEl = document.getElementById('game-preview-title');
    const creatorEl = document.getElementById('game-preview-creator');
    const creatorVerifiedEl = document.getElementById('game-preview-creator-verified');
    const descEl = document.getElementById('game-preview-description');
    const badgeEl = document.getElementById('game-preview-badge');

    const creatorName = game.creatorName || 'Playard Games';

    if (imgEl) {
        imgEl.src = generateLargeGameBannerDataUrl(game);
        imgEl.alt = game.title;
    }
    if (titleEl) {
        titleEl.textContent = game.title;
    }
    if (creatorEl) {
        creatorEl.textContent = creatorName.replace(/[✔✓✅\s]+$/g, '').trim();
    }
    if (creatorVerifiedEl) {
        creatorVerifiedEl.style.display = (creatorName === 'Playard Games' || isOwnerUser(creatorName)) ? 'inline-flex' : 'none';
    }
    if (descEl) {
        descEl.textContent = game.description;
    }
    if (badgeEl) {
        badgeEl.textContent = game.badgeText || 'Playard 3D';
        badgeEl.style.color = game.badgeColor || '#00f2fe';
        badgeEl.style.borderColor = game.badgeColor || '#00f2fe';
    }

    refreshGamePreviewStatsUI(game.id);
    modal.style.display = 'flex';

    // Immediately fetch latest real stats & live active players from Supabase
    fetchCloudGameStats();
    if (liveStatsInterval) clearInterval(liveStatsInterval);
    liveStatsInterval = setInterval(() => {
        if (currentOpenedGame) {
            fetchCloudGameStats();
            refreshGamePreviewStatsUI(currentOpenedGame.id);
        }
    }, 10000);
}

export function closeGamePreviewModal() {
    const modal = document.getElementById('modal-game-preview');
    if (modal) {
        modal.style.display = 'none';
    }
    if (liveStatsInterval) {
        clearInterval(liveStatsInterval);
        liveStatsInterval = null;
    }
    currentOpenedGame = null;
}

function resolveGameInfoFromCard(card: HTMLElement): GamePreviewInfo | null {
    // 1. Check data-game-id attribute (e.g. recently played cards)
    const dataId = card.getAttribute('data-game-id');
    if (dataId && OFFICIAL_GAMES_CATALOG[dataId]) {
        return OFFICIAL_GAMES_CATALOG[dataId];
    }

    // 2. Check anchor href on the card or child anchor
    const anchor = card.tagName.toLowerCase() === 'a'
        ? (card as HTMLAnchorElement)
        : card.querySelector('a');
    const href = anchor?.getAttribute('href') || '';

    for (const key of Object.keys(OFFICIAL_GAMES_CATALOG)) {
        const item = OFFICIAL_GAMES_CATALOG[key];
        if (href === item.url || href.includes(`/games/${item.id}/index.html`)) {
            return item;
        }
    }

    // 3. Community game or custom card
    if (href) {
        const titleEl = card.querySelector('h2, h3');
        const descEl = card.querySelector('p');
        const imgEl = card.querySelector('img') as HTMLImageElement | null;
        const creatorFromAttr = card.getAttribute('data-creator');
        const creatorFromTag = card.querySelector('.reward-tag strong')?.textContent?.trim();
        const urlIdMatch = href.match(/[?&]id=([^&]+)/);
        const customId = dataId || (urlIdMatch ? urlIdMatch[1] : href.replace(/[^a-z0-9]/gi, '_'));

        return {
            id: customId,
            title: titleEl?.textContent?.trim() || '🎮 Playard 3D Mäng',
            description: descEl?.textContent?.trim() || 'Avasta 3D maailma ja mängi koos sõpradega!',
            url: href,
            icon: '🎮',
            badgeText: 'Community 3D Game',
            badgeColor: '#00f2fe',
            creatorName: creatorFromAttr || creatorFromTag || 'Playard Games',
            thumbnail: imgEl?.src || undefined
        };
    }

    return null;
}

export function setupGamePreviewModal() {
    const modal = document.getElementById('modal-game-preview');
    const closeBtn = document.getElementById('btn-close-game-preview');
    const likeBtn = document.getElementById('btn-game-preview-like');
    const playBtn = document.getElementById('btn-game-preview-play');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeGamePreviewModal();
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeGamePreviewModal();
            }
        });
    }

    if (likeBtn) {
        likeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!currentOpenedGame) return;
            toggleGameLike(currentOpenedGame.id);
            refreshGamePreviewStatsUI(currentOpenedGame.id);
        });
    }

    if (playBtn) {
        playBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!currentOpenedGame) return;

            const game = currentOpenedGame;

            // Check Crown Obby access control
            if (game.id === 'crown' || game.url.includes('/games/crown/')) {
                const prof = getCurrentUserProfile();
                const isOwner = isPlayardOwner(prof?.email) || !!(prof?.username?.toLowerCase().includes('owner'));
                const isUnlocked = sessionStorage.getItem('crown_passcode_unlocked') === 'true';
                if (!isOwner && !isUnlocked) {
                    closeGamePreviewModal();
                    const crownModal = document.getElementById('modal-crown-coming-soon');
                    if (crownModal) crownModal.style.display = 'flex';
                    return;
                }
            }

            // Record unique player play & recently played
            recordUniquePlayerPlay(game.id);
            yardService.recordPlayedGame({
                id: game.id,
                title: game.title,
                description: game.description,
                url: game.url,
                icon: game.icon,
                badgeText: game.badgeText
            });

            const prof = getCurrentUserProfile();
            if (prof && prof.username) {
                friendService.setPlayerActiveGame(prof.username, {
                    id: game.id,
                    title: game.title,
                    url: game.url
                });
            }

            refreshGamePreviewStatsUI(game.id);
            window.location.href = game.url;
        });
    }

    // Also listen for `playard_game_played` and `playard_friends_updated` to keep unique & active player counts up to date
    window.addEventListener('playard_game_played', (evt: any) => {
        const g = evt?.detail;
        if (g && g.id) {
            recordUniquePlayerPlay(g.id);
            if (currentOpenedGame && currentOpenedGame.id === g.id) {
                refreshGamePreviewStatsUI(currentOpenedGame.id);
            }
        }
    });

    window.addEventListener('playard_friends_updated', () => {
        if (currentOpenedGame) {
            refreshGamePreviewStatsUI(currentOpenedGame.id);
        }
    });

    // Intercept clicks on any `.game-card` across Official, Recently Played, and Community grids
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        // Ignore clicks on delete buttons inside community game cards
        if (target.closest('.btn-delete-game')) return;

        const card = target.closest('.game-card') as HTMLElement | null;
        if (!card) return;

        // Ignore disabled cards (e.g. "Coming Soon" placeholder card)
        if (card.classList.contains('disabled')) return;

        // Ignore age-locked cards (handled by ageRestrictions.ts)
        if (card.getAttribute('data-age-locked') === 'true') return;

        const gameInfo = resolveGameInfoFromCard(card);
        if (!gameInfo) return;

        // Preserve Crown Obby locked modal check if guest/non-owner without passcode clicks Crown card
        if (gameInfo.id === 'crown' || gameInfo.url.includes('/games/crown/')) {
            const prof = getCurrentUserProfile();
            const isOwner = isPlayardOwner(prof?.email) || !!(prof?.username?.toLowerCase().includes('owner'));
            const isUnlocked = sessionStorage.getItem('crown_passcode_unlocked') === 'true';
            if (!isOwner && !isUnlocked) {
                e.preventDefault();
                const crownModal = document.getElementById('modal-crown-coming-soon');
                if (crownModal) crownModal.style.display = 'flex';
                return;
            }
        }

        // Prevent immediate navigation and open the large Game Preview Modal instead!
        e.preventDefault();
        openGamePreviewModal(gameInfo);
    });

    fetchCloudGameStats();

    if (typeof window !== 'undefined') {
        (window as any).gamePreviewModal = {
            openGamePreviewModal,
            closeGamePreviewModal,
            getGameStats,
            toggleGameLike,
            recordUniquePlayerPlay,
            refreshGamePreviewStatsUI
        };
    }
}
