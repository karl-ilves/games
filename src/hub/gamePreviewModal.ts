import { getCurrentUserProfile, isPlayardOwner } from '../auth';
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
        badgeColor: '#ffd700'
    },
    racing: {
        id: 'racing',
        title: '🏎️ Racing Simulator',
        description: 'Kihuta sportautode ja mootorratastega ringrajal, teeni Playbuxe ja lukusta lahti uusi superautosid!',
        url: './games/racing/index.html',
        icon: '🏎️',
        badgeText: 'Circuit Racing',
        badgeColor: '#ffd32a'
    },
    flight: {
        id: 'flight',
        title: '✈️ 3D Flight Simulator',
        description: 'Tõuse õhku reisilennukite, hävitajate ja helikopteritega! Lenda läbi rõngaste ja maandu lennuväljadel.',
        url: './games/flight/index.html',
        icon: '✈️',
        badgeText: 'Open Sky',
        badgeColor: '#00f2fe'
    },
    cooking: {
        id: 'cooking',
        title: '🍳 3D Master Chef',
        description: 'Küpseta burgereid, pitsasid ja maitsvaid roogasid 3D restoraniköögis enne kui aeg otsa saab!',
        url: './games/cooking/index.html',
        icon: '🍳',
        badgeText: '💎 +20 kuni +40 Playbux',
        badgeColor: '#ff9f43'
    },
    war: {
        id: 'war',
        title: '⚓ 3D Naval & Air Warfare',
        description: 'Juhi sõjalaevu ja hävituslennukeid suurejoonelistes mere- ja õhulahingutes ning kaitse oma baasi!',
        url: './games/war/index.html',
        icon: '⚓',
        badgeText: 'Naval & Air Combat',
        badgeColor: '#ff4757'
    },
    train: {
        id: 'train',
        title: '🚆 Rongimäng (3D Train Simulator)',
        description: 'Sõida Elroni Porgandi ja teiste rongidega läbi jaamade, võta peale reisijaid ja kogu Playbuxe!',
        url: './games/train/index.html',
        icon: '🚆',
        badgeText: 'Railway Sim',
        badgeColor: '#ff793f'
    },
    obby: {
        id: 'obby',
        title: '🏃 3D Parkour Obby',
        description: 'Hüppa üle liikuvate platvormide ja laavaplokkide selles põnevas 3D parkuurimängus!',
        url: './games/obby/index.html',
        icon: '🏃',
        badgeText: '💎 +25 Playbux võit',
        badgeColor: '#0be881'
    },
    metro: {
        id: 'metro',
        title: '🚇 Last Metro (Survival Horror)',
        description: 'Avasta pimedat metroojaama taskulambiga, leia võtmed ja põgene enne kui varjud sind kätte saavad!',
        url: './games/metro/index.html',
        icon: '🚇',
        badgeText: '👻 Horror Survival',
        badgeColor: '#ff4757'
    },
    mmp1: {
        id: 'mmp1',
        title: '⚔️ MMP1: Multi-Map Battle Arena',
        description: 'Võitle mitmel erineval 3D areenil, vali relvad ja tõuse edetabeli tippu!',
        url: './games/mmp1/index.html',
        icon: '⚔️',
        badgeText: '💎 +5 Playbux iga Killi eest',
        badgeColor: '#ff4757'
    },
    rocket: {
        id: 'rocket',
        title: '🚀 3D Rocket Builder',
        description: 'Ehita oma kosmoserakett, stardi atmosfäärist välja ja lenda Kuule ning kaugemale!',
        url: './games/rocket/index.html',
        icon: '🚀',
        badgeText: 'Space Sandbox',
        badgeColor: '#00f2fe'
    },
    citycar: {
        id: 'citycar',
        title: '🚓 3D Linnasõit (Open World)',
        description: 'Avasta suurt 3D linna politseiauto, takso või sportautoga ja täida linnamissioone!',
        url: './games/citycar/index.html',
        icon: '🚓',
        badgeText: 'Open City',
        badgeColor: '#00d2d3'
    },
    defender: {
        id: 'defender',
        title: '🛡️ 3D Base Defender',
        description: 'Ehita kaitsetorne ja kaitse oma baasi vaenlaste lainete eest 3D strateegiamängus!',
        url: './games/defender/index.html',
        icon: '🛡️',
        badgeText: 'Tower Defense',
        badgeColor: '#a55eea'
    },
    breakout: {
        id: 'breakout',
        title: '🟢 Roheline Ruut (2D Breakout)',
        description: 'Liiguta alust, põrgata palli tagasi ja purusta kõik rohelised ruudud klassikalises arkaadmängus!',
        url: './games/breakout/index.html',
        icon: '🟢',
        badgeText: '🟢 2D Retro Arcade',
        badgeColor: '#2ed573'
    },
    snake: {
        id: 'snake',
        title: '🐍 2D Ussimäng (Retro Arcade)',
        description: 'Kogu õunu, kasvata ussi pikemaks ja püstita uus rekord!',
        url: './games/snake/index.html',
        icon: '🐍',
        badgeText: '🐍 Retro Snake',
        badgeColor: '#2ed573'
    },
    play: {
        id: 'play',
        title: '🎮 Community 3D Games',
        description: 'Avasta ja mängi teiste Playardi mängijate loodud 3D maailmu!',
        url: './games/play/index.html',
        icon: '🎮',
        badgeText: 'Community Play',
        badgeColor: '#00f2fe'
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
        <!-- Playard Official Watermark -->
        <rect x="42" y="345" width="185" height="38" rx="10" fill="#090d16" fill-opacity="0.75" stroke="#ffffff" stroke-opacity="0.15"/>
        <text x="134" y="369" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" fill="#cbd5e1" text-anchor="middle" letter-spacing="1">⚡ PLAYARD 3D HUB</text>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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
    const cleanId = (gameId || '').trim().toLowerCase();
    const all = loadAllGameStats();
    const record: GameStatsRecord = all[cleanId] || {
        gameId: cleanId,
        likedBy: [],
        uniquePlayers: [],
        updatedAt: Date.now()
    };

    const me = getCurrentPlayerIdentifier();
    const likedSet = new Set((record.likedBy || []).map(u => u.toLowerCase()));
    const uniqueSet = new Set((record.uniquePlayers || []).map(u => u.toLowerCase()));

    // Also include players who have this game in localStorage recently played or active games
    try {
        const recentRaw = localStorage.getItem('playard_recently_played_games');
        if (recentRaw) {
            const recentList = JSON.parse(recentRaw);
            if (Array.isArray(recentList) && recentList.some((g: any) => (g.id || '').toLowerCase() === cleanId)) {
                uniqueSet.add(me);
            }
        }
    } catch (e) {}

    // Scan active games in localStorage (`playard_active_game_<username>`)
    const activePlayerNames: string[] = [];
    const now = Date.now();
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('playard_active_game_')) {
                const username = key.replace('playard_active_game_', '');
                const valRaw = localStorage.getItem(key);
                if (valRaw) {
                    const parsed = JSON.parse(valRaw);
                    if (parsed) {
                        const matchesId = (parsed.id || '').toLowerCase() === cleanId;
                        const matchesUrl = parsed.url && parsed.url.toLowerCase().includes(`/games/${cleanId}/`);
                        if (matchesId || matchesUrl) {
                            uniqueSet.add(username.toLowerCase());
                            const ts = parsed.timestamp || now;
                            if (now - ts < 1800000) {
                                activePlayerNames.push(username);
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {}

    // Persist any newly discovered unique players
    if (uniqueSet.size !== (record.uniquePlayers || []).length) {
        record.uniquePlayers = Array.from(uniqueSet);
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
    const cleanId = (gameId || '').trim().toLowerCase();
    const all = loadAllGameStats();
    const record: GameStatsRecord = all[cleanId] || {
        gameId: cleanId,
        likedBy: [],
        uniquePlayers: [],
        updatedAt: Date.now()
    };

    const me = getCurrentPlayerIdentifier();
    const likedSet = new Set((record.likedBy || []).map(u => u.toLowerCase()));

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

    const uniqueSet = new Set((record.uniquePlayers || []).map(u => u.toLowerCase()));
    uniqueSet.add(playerIdent);

    record.uniquePlayers = Array.from(uniqueSet);
    record.updatedAt = Date.now();
    all[cleanId] = record;
    saveAllGameStats(all);

    syncGameStatsToCloud(record);
    return uniqueSet.size;
}

async function syncGameStatsToCloud(record: GameStatsRecord) {
    const isTestEnv = typeof window !== 'undefined' && ((window as any).__PLAYARD_TEST_MODE__ || navigator.webdriver);
    if (!supabase || isTestEnv) return;
    try {
        const titleKey = `GAME_STATS:${record.gameId}`;
        const payloadStr = JSON.stringify({
            gameId: record.gameId,
            likedBy: record.likedBy,
            uniquePlayers: record.uniquePlayers,
            updatedAt: record.updatedAt
        });

        const { data: existing } = await supabase
            .from('user_created_games')
            .select('id, description')
            .eq('category', 'game_stats_meta')
            .eq('title', titleKey)
            .limit(1);

        if (existing && existing.length > 0) {
            await supabase
                .from('user_created_games')
                .update({ description: payloadStr, status: 'active' })
                .eq('id', existing[0].id);
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

async function fetchCloudGameStats() {
    const isTestEnv = typeof window !== 'undefined' && ((window as any).__PLAYARD_TEST_MODE__ || navigator.webdriver);
    if (!supabase || isTestEnv) return;
    try {
        const { data } = await supabase
            .from('user_created_games')
            .select('title, description')
            .eq('category', 'game_stats_meta')
            .eq('status', 'active');

        if (Array.isArray(data) && data.length > 0) {
            const localAll = loadAllGameStats();
            let changed = false;
            data.forEach(row => {
                try {
                    const parsed = typeof row.description === 'string' ? JSON.parse(row.description) : row.description;
                    if (parsed && parsed.gameId) {
                        const gid = parsed.gameId.toLowerCase();
                        const existing = localAll[gid] || { gameId: gid, likedBy: [], uniquePlayers: [], updatedAt: 0 };
                        const mergedLikes = Array.from(new Set([...(existing.likedBy || []), ...(parsed.likedBy || [])]));
                        const mergedUnique = Array.from(new Set([...(existing.uniquePlayers || []), ...(parsed.uniquePlayers || [])]));
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
            if (changed) {
                saveAllGameStats(localAll);
                if (currentOpenedGame) {
                    refreshGamePreviewStatsUI(currentOpenedGame.id);
                }
            }
        }
    } catch (e) {}
}

let currentOpenedGame: GamePreviewInfo | null = null;

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
    const descEl = document.getElementById('game-preview-description');
    const badgeEl = document.getElementById('game-preview-badge');

    if (imgEl) {
        imgEl.src = generateLargeGameBannerDataUrl(game);
        imgEl.alt = game.title;
    }
    if (titleEl) {
        titleEl.textContent = game.title;
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
}

export function closeGamePreviewModal() {
    const modal = document.getElementById('modal-game-preview');
    if (modal) {
        modal.style.display = 'none';
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
