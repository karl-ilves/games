import { yardService } from '../shared/yardService';
import { getLanguage } from '../shared/i18n';
import { getCurrentUserProfile, isPlayardOwner } from '../auth';

export function formatTimeAgo(timestamp: number, isEt: boolean): string {
    const diff = Math.max(0, Date.now() - timestamp);
    const secs = Math.floor(diff / 1000);
    if (secs < 10) return isEt ? 'Äsja mängitud' : 'Just played';
    if (secs < 60) return isEt ? `${secs} sek tagasi` : `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return isEt ? `${mins} min tagasi` : `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return isEt ? `${hours} h tagasi` : `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return isEt ? `${days} p tagasi` : `${days}d ago`;
}

export function updateRecentlyPlayedTimestamps() {
    const container = document.getElementById('recently-played-grid');
    if (!container) return;
    const isEt = getLanguage() === 'et';
    const games = yardService.getRecentlyPlayedGames();
    const top3 = games.slice(0, 3);
    const timeEls = container.querySelectorAll('.recently-played-time-val');
    timeEls.forEach((el, idx) => {
        if (top3[idx]) {
            el.textContent = formatTimeAgo(top3[idx].lastPlayed, isEt);
        }
    });
}

export function renderRecentlyPlayed() {
    const container = document.getElementById('recently-played-grid');
    if (!container) return;

    const isEt = getLanguage() === 'et';
    const games = yardService.getRecentlyPlayedGames();

    if (!games || games.length === 0) {
        container.innerHTML = `
            <div id="recently-played-empty" style="grid-column: 1/-1; padding: 35px 20px; text-align: center; color: #8899a6; background: rgba(30, 39, 46, 0.4); border-radius: 16px; border: 1.5px dashed rgba(255, 255, 255, 0.12);">
                <div style="font-size: 2.2rem; margin-bottom: 8px;">🕹️</div>
                <div style="font-size: 1.1rem; font-weight: 700; color: #ffffff; margin-bottom: 6px;">
                    ${isEt ? 'Sa pole veel ühtegi mängu mänginud' : "You haven't played any games yet"}
                </div>
                <div style="font-size: 0.88rem; color: #7f8c8d;">
                    ${isEt ? 'Vali allpool ametlik simulaator või kogukonnamäng ja sinu viimati mängitud mängud ilmuvad siia!' : 'Pick an official simulator or community game below and your recently played games will appear here!'}
                </div>
            </div>
        `;
        return;
    }

    const top3 = games.slice(0, 3);

    container.innerHTML = top3.map((game, index) => {
        const isLatest = index === 0;
        const rankLabel = isLatest
            ? (isEt ? '👑 #1 VIIMATI MÄNGITUD' : '👑 #1 MOST RECENT')
            : (index === 1 ? (isEt ? '🥈 #2 EELMINE' : '🥈 #2 PREVIOUS') : (isEt ? '🥉 #3 MÄNGITUD' : '🥉 #3 PLAYED'));

        const rankBadgeStyle = isLatest
            ? 'background: linear-gradient(135deg, #00f2fe, #4facfe); color: #0b1a2d; font-weight: 900; box-shadow: 0 0 12px rgba(0, 242, 254, 0.4);'
            : (index === 1 ? 'background: rgba(255, 211, 42, 0.18); color: #ffd32a; border: 1px solid rgba(255, 211, 42, 0.4); font-weight: 800;' : 'background: rgba(255, 255, 255, 0.08); color: #a4b0be; border: 1px solid rgba(255, 255, 255, 0.15); font-weight: 700;');

        const timeStr = formatTimeAgo(game.lastPlayed, isEt);
        const badgeColor = game.badgeColor || '#00f2fe';
        const playAgainText = isEt ? 'Mängi uuesti ▶' : 'Play again ▶';

        let gameTitle = game.title;
        let gameDesc = game.description;
        let badgeText = game.badgeText || 'Playard';

        if (!isEt) {
            if (game.id === 'racing') {
                gameTitle = '🏎️ Racing Simulator';
                gameDesc = 'Race high-speed sports cars and motorcycles on challenging circuits against opponents.';
                badgeText = 'Circuit Racing';
            } else if (game.id === 'cooking') {
                gameTitle = '🍳 3D Master Chef';
                gameDesc = 'Cook burgers, pizzas, and pasta dishes as master chef, satisfy customer orders, and earn Yards!';
                badgeText = '💎 +20Y to +40Y';
            } else if (game.id === 'war') {
                gameTitle = '⚔️ War game';
                gameDesc = 'Lead advanced 3D armored combat units, command tactical firepower, defeat enemy forces, and capture strategic zones.';
                badgeText = '🎖️ Combat (+50Y)';
            } else if (game.id === 'train') {
                gameTitle = '🚂 3D Train Simulator';
                gameDesc = 'Drive realistic 3D locomotives across scenic railway networks, switch tracks, blow the horn, stop at stations, and earn Train Money!';
                badgeText = '🪙 Station Stops';
            } else if (game.id === 'play') {
                gameTitle = '🎮 Community 3D Games';
                gameDesc = 'Play 3D worlds created by players and approved by admins.';
                badgeText = 'Community Play';
            } else if (game.id === 'obby') {
                gameTitle = '🏃‍♂️ 3D Parkour Obby';
                gameDesc = 'Challenging 10-stage obstacle course with moving platforms and hazards.';
                badgeText = '🏆 10 Stages Obby';
            } else if (game.id === 'crown') {
                gameTitle = '👑 24K Crown Obby';
                gameDesc = "The world's only 👑 24K Royal Crown & Golden Monarch outfit!";
                badgeText = '👑 Grand Prize (50 Stages)';
            } else if (game.id === 'citycar') {
                gameTitle = '🚗 3D City & Nature Drive';
                gameDesc = 'Free-drive through skyscrapers, cross bridges, and explore the forest and river in real-time multiplayer!';
                badgeText = '🏙️🌲 3D City Drive';
            } else if (game.id === 'defender') {
                gameTitle = '🛡️ 2D Earth Defender';
                gameDesc = 'Space asteroid planetary defense mission for Playard Owner. Protect Earth from cosmic asteroid impacts!';
                badgeText = '👑 Playard Owner Exclusive';
            }
        } else {
            if (game.id === 'racing') {
                gameTitle = '🏎️ Racing Simulator';
                gameDesc = 'Võistle kiirete sportautode ja mootorratastega põnevatel ringradadel vastaste vastu.';
                badgeText = 'Ringraja võidusõit';
            } else if (game.id === 'cooking') {
                gameTitle = '🍳 3D Master Chef';
                gameDesc = 'Valmista restorani peakokana burgereid, pitsasid ja pastasid, täida tellimusi ja teeni Yarde!';
                badgeText = '💎 +20Y kuni +40Y';
            } else if (game.id === 'war') {
                gameTitle = '⚔️ War game';
                gameDesc = 'Juhi 3D soomustehnikat, lahingüksusi ja alista vaenlased 10v10 lahingus!';
                badgeText = '🎖️ Lahing (+50Y)';
            } else if (game.id === 'train') {
                gameTitle = '🚂 Rongimäng';
                gameDesc = 'Juhi võimsat 3D vedurit mööda raudteevõrku, vaheta pöörmeid ja teeninda jaamu!';
                badgeText = '💎 Rongiraha';
            } else if (game.id === 'play') {
                gameTitle = '🎮 Kogukonna 3D mängud';
                gameDesc = 'Mängi teiste mängijate poolt loodud ja administraatori poolt heaks kiidetud 3D mänge.';
                badgeText = 'Kogukonnamängud';
            } else if (game.id === 'obby') {
                gameTitle = '🏃‍♂️ 3D Parkour Obby';
                gameDesc = 'Väljakutsuv 10-tasemeline takistusrada ja parkour.';
                badgeText = '🏆 10-Tasemeline Obby';
            } else if (game.id === 'crown') {
                gameTitle = '👑 24K Crown Obby';
                gameDesc = "The world's only 👑 24K Royal Crown & Golden Monarch outfit!";
                badgeText = '👑 Grand Prize (50 Stages)';
            } else if (game.id === 'citycar') {
                gameTitle = '🚗 3D Linna & Looduse Autosõit';
                gameDesc = 'Sõida vabalt ringi pilvelõhkujatega linnas, ületa sildu ja avasta künklikku metsa reaalajas teiste mängijatega!';
                badgeText = '🏙️🌲 3D Linna Sõit';
            } else if (game.id === 'defender') {
                gameTitle = '🛡️ 2D Maa Kaitsja';
                gameDesc = 'Kosmose asteroidide kaitsemissioon Playard Ownerile. Kaitse Maad kosmoses ja lase asteroidid puruks!';
                badgeText = '👑 Playard Owner Eksklusiiv';
            } else if (game.id === 'breakout') {
                gameTitle = '🟢 2D Breakout';
                gameDesc = 'Liiguta alust _, põrgata palli ja purusta kõik rohelised ruudud!';
                badgeText = '🟢 2D Retro Arcade';
            }
        }

        const isCrown = game.id === 'crown';
        const cardBorder = isCrown
            ? 'border: 1.5px solid rgba(255, 215, 0, 0.85); box-shadow: 0 12px 32px rgba(255, 215, 0, 0.35); background: linear-gradient(145deg, #241d0b 0%, #171205 100%);'
            : (isLatest
                ? 'border: 1.5px solid rgba(0, 242, 254, 0.6); box-shadow: 0 12px 32px rgba(0, 242, 254, 0.22); background: linear-gradient(145deg, #162432 0%, #111a24 100%);'
                : 'border: 1px solid rgba(255, 255, 255, 0.08); background: #1e272e;');

        return `
            <a href="${game.url}" class="game-card recently-played-card" data-game-id="${game.id}" style="${cardBorder}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 0.72rem; padding: 4px 10px; border-radius: 12px; letter-spacing: 0.5px; ${rankBadgeStyle}">
                        ${rankLabel}
                    </span>
                    <span style="font-size: 0.78rem; color: #8899a6; display: flex; align-items: center; gap: 4px;">
                        <span>🕒</span>
                        <span class="recently-played-time-val">${timeStr}</span>
                    </span>
                </div>
                <h2 style="font-size: 1.45rem; margin-bottom: 8px; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                    <span>${gameTitle}</span>
                </h2>
                <p style="font-size: 0.9rem; line-height: 1.45; color: #a4b0be; margin-bottom: 16px; min-height: 42px;">${gameDesc}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 12px;">
                    <div class="reward-tag" style="border-color: ${badgeColor}; color: ${badgeColor}; background: rgba(0, 242, 254, 0.08); font-size: 0.78rem; padding: 4px 10px;">
                        <span>${yardService.renderYardSvg(14)}</span>
                        <span>${badgeText}</span>
                    </div>
                    <span style="font-size: 0.85rem; font-weight: 800; color: #00f2fe; display: flex; align-items: center; gap: 4px;">
                        ${playAgainText}
                    </span>
                </div>
            </a>
        `;
    }).join('');

    container.querySelectorAll('.recently-played-card').forEach(el => {
        el.addEventListener('click', (e) => {
            const gameId = el.getAttribute('data-game-id');
            if (gameId === 'crown') {
                const prof = getCurrentUserProfile();
                const isOwner = isPlayardOwner(prof?.email) || !!(prof?.username?.toLowerCase().includes('owner'));
                const isUnlocked = sessionStorage.getItem('crown_passcode_unlocked') === 'true';
                if (!isOwner && !isUnlocked) {
                    e.preventDefault();
                    const modal = document.getElementById('modal-crown-coming-soon');
                    if (modal) modal.style.display = 'flex';
                    return;
                }
            }
            const targetGame = top3.find(g => g.id === gameId);
            if (targetGame) {
                yardService.recordPlayedGame(targetGame);
            }
        });
    });
}

export function setupGameCardTracking() {
    const officialGameMap: Record<string, { id: string; title: string; description: string; url: string; icon: string; badgeText: string; badgeColor: string }> = {
        './games/crown/index.html': {
            id: 'crown',
            title: '👑 24K Crown Obby',
            description: "The world's only 👑 24K Royal Crown & Golden Monarch outfit!",
            url: './games/crown/index.html',
            icon: '👑',
            badgeText: '🏆 50 Stages Obby',
            badgeColor: '#ffd700'
        },
        './games/racing/index.html': {
            id: 'racing',
            title: '🏎️ Racing Simulator',
            description: 'Race high-speed sports cars and motorcycles on challenging circuits against opponents.',
            url: './games/racing/index.html',
            icon: '🏎️',
            badgeText: 'Circuit Racing',
            badgeColor: '#00f2fe'
        },
        './games/cooking/index.html': {
            id: 'cooking',
            title: '🍳 3D Master Chef',
            description: 'Cook burgers, pizzas, and pasta dishes as master chef, satisfy customer orders, and earn Yards!',
            url: './games/cooking/index.html',
            icon: '🍳',
            badgeText: '💎 +20Y to +40Y',
            badgeColor: '#ffd32a'
        },
        './games/war/index.html': {
            id: 'war',
            title: '⚔️ War game',
            description: 'Lead advanced 3D armored combat units, command tactical firepower, defeat enemy forces, and capture strategic zones.',
            url: './games/war/index.html',
            icon: '⚔️',
            badgeText: '🎖️ Combat (+50Y)',
            badgeColor: '#ff4757'
        },
        './games/train/index.html': {
            id: 'train',
            title: '🚂 Rongimäng',
            description: 'Juhi võimsat 3D vedurit mööda maalilist raudteevõrku, vaheta pöörmeid, teeninda jaamu ja teeni Yarde!',
            url: './games/train/index.html',
            icon: '🚂',
            badgeText: '💎 +40Y kuni +100Y',
            badgeColor: '#00f2fe'
        },
        './games/play/index.html': {
            id: 'play',
            title: '🎮 Play Community Games',
            description: 'Play 3D community created games submitted by players.',
            url: './games/play/index.html',
            icon: '🎮',
            badgeText: 'Community Play',
            badgeColor: '#00f2fe'
        },
        './games/citycar/index.html': {
            id: 'citycar',
            title: '🚗 3D City & Nature Drive',
            description: 'Free-drive through skyscrapers, cross bridges, and explore the forest and river in real-time multiplayer!',
            url: './games/citycar/index.html',
            icon: '🚗',
            badgeText: '🏙️🌲 3D City Drive',
            badgeColor: '#00f2fe'
        },
        './games/defender/index.html': {
            id: 'defender',
            title: '🛡️ 2D Earth Defender',
            description: 'Space asteroid planetary defense mission for Playard Owner.',
            url: './games/defender/index.html',
            icon: '🛡️',
            badgeText: '👑 Playard Owner Exclusive',
            badgeColor: '#ffd700'
        },
        './games/breakout/index.html': {
            id: 'breakout',
            title: '🟢 2D Breakout (Klotsipurustaja)',
            description: 'Liiguta alust _, põrgata palli tagasi ja purusta kõik rohelised ruudud!',
            url: './games/breakout/index.html',
            icon: '🟢',
            badgeText: '🟢 2D Retro Arcade',
            badgeColor: '#2ed573'
        }
    };

    document.querySelectorAll<HTMLAnchorElement>('.game-grid a.game-card').forEach(card => {
        if (card.classList.contains('recently-played-card')) return;
        const href = card.getAttribute('href');
        if (href && officialGameMap[href]) {
            card.addEventListener('click', (e) => {
                if (href === './games/crown/index.html') {
                    const prof = getCurrentUserProfile();
                    const isOwner = isPlayardOwner(prof?.email) || !!(prof?.username?.toLowerCase().includes('owner'));
                    const isUnlocked = sessionStorage.getItem('crown_passcode_unlocked') === 'true';
                    if (!isOwner && !isUnlocked) {
                        e.preventDefault();
                        const modal = document.getElementById('modal-crown-coming-soon');
                        if (modal) modal.style.display = 'flex';
                        return;
                    }
                }
                yardService.recordPlayedGame(officialGameMap[href]);
            });
        }
    });
}
