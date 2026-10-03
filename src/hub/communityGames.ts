import { yardService } from '../shared/yardService';
import { getCurrentUserProfile, isUserAdminEmail } from '../auth';

export async function renderCommunityGames() {
    const container = document.getElementById('community-games-grid');
    if (!container) return;

    const approvedGames = await yardService.getApprovedGames();
    if (!approvedGames || approvedGames.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; background: #1a232e; padding: 30px; border-radius: 12px; text-align: center; color: #718093; border: 1px dashed rgba(255,255,255,0.1);">
                <p style="font-size: 1.1rem; margin-bottom: 10px; color: #a4b0be;">No community games approved yet!</p>
                <p style="font-size: 0.9rem; margin: 0;">Be the first creator to build a game in the Creator Studio and submit it for review.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    const currentUser = getCurrentUserProfile();
    const isAdmin = !!currentUser?.isAdmin || isUserAdminEmail(currentUser?.email);

    approvedGames.forEach(game => {
        const isOwner = Boolean(
            (currentUser && (currentUser.username?.toLowerCase() === game.creatorUsername?.toLowerCase() || isAdmin)) ||
            yardService.isMyCreatedGame(game.id)
        );
        const card = document.createElement('div');
        card.className = 'game-card';
        card.style.position = 'relative';
        const thumbHtml = game.thumbnail
            ? `<div style="width: 100%; height: 140px; border-radius: 8px; overflow: hidden; margin-bottom: 12px; background: #0b111a; border: 1px solid rgba(0, 242, 254, 0.2);"><img src="${game.thumbnail}" alt="${game.title}" style="width: 100%; height: 100%; object-fit: cover; display: block;"></div>`
            : '';
        card.innerHTML = `
            <a href="./games/play/index.html?id=${game.id}" style="text-decoration: none; color: inherit; display: flex; flex-direction: column; height: 100%;">
                ${thumbHtml}
                <h2>🎮 ${game.title}</h2>
                <p>${game.description || 'Community created 3D game. Explore the world and have fun!'}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                    <div class="reward-tag">
                        <span>👤 By: <strong>${game.creatorUsername}</strong></span>
                    </div>
                    <span style="color: #00f2fe; font-weight: bold; font-size: 0.9rem;">▶️ Play</span>
                </div>
            </a>
            ${isOwner ? `<button class="btn-delete-game" data-id="${game.id}" style="position: absolute; top: 10px; right: 10px; background: rgba(255,50,50,0.8); border: none; color: white; border-radius: 5px; padding: 5px 10px; cursor: pointer; font-size: 0.8rem; z-index: 10;">🗑️ Delete</button>` : ''}
        `;
        container.appendChild(card);
    });

    container.querySelectorAll('.btn-delete-game').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('Oled kindel, et soovid selle mängu kustutada?')) {
                const gameId = (e.currentTarget as HTMLElement).getAttribute('data-id');
                if (gameId) {
                    await yardService.deleteCreatedGame(gameId);
                    await renderCommunityGames();
                    alert('Mäng on edukalt kustutatud!');
                }
            }
        });
    });
}

export async function renderDatabaseGamesList() {
    const listContainer = document.getElementById('database-games-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<div style="text-align: center; color: #718093; padding: 20px;">Laen andmebaasist mänge...</div>';
    
    try {
        const allGames = await yardService.getAllCreatedGames();
        
        if (!allGames || allGames.length === 0) {
            listContainer.innerHTML = '<div style="text-align: center; color: #a4b0be; padding: 20px;">Andmebaasis ei ole ühtegi mängu.</div>';
            return;
        }

        listContainer.innerHTML = '';
        allGames.forEach(game => {
            const el = document.createElement('div');
            el.style.background = '#1e2733';
            el.style.padding = '12px';
            el.style.borderRadius = '8px';
            el.style.border = '1px solid rgba(255,255,255,0.1)';
            el.style.display = 'flex';
            el.style.justifyContent = 'space-between';
            el.style.alignItems = 'center';
            
            const dateStr = new Date(game.createdAt || Date.now()).toLocaleDateString('et-EE');
            
            el.innerHTML = `
                <div>
                    <h4 style="margin: 0 0 5px 0; color: #fff; font-size: 1rem;">${game.title} <span style="font-size: 0.75rem; color: #718093; margin-left: 5px;">(${game.id})</span></h4>
                    <div style="font-size: 0.8rem; color: #a4b0be;">
                        👤 Looja: <strong style="color: #ffd32a;">${game.creatorUsername}</strong> &nbsp;|&nbsp; 
                        📌 Staatus: <strong style="color: ${game.status === 'approved' ? '#0be881' : '#f39c12'};">${game.status}</strong> &nbsp;|&nbsp; 
                        📅 Loodud: ${dateStr}
                    </div>
                </div>
                <button class="btn-db-delete" data-id="${game.id}" style="background: rgba(255,50,50,0.8); border: none; color: white; border-radius: 5px; padding: 6px 12px; cursor: pointer; font-size: 0.85rem;">🗑️ Kustuta</button>
            `;
            listContainer.appendChild(el);
        });

        listContainer.querySelectorAll('.btn-db-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const gameId = (e.currentTarget as HTMLElement).getAttribute('data-id');
                if (gameId && confirm('KUSTUTA ANDMEBAASIST: Oled sa täiesti kindel? Seda ei saa tagasi võtta!')) {
                    const success = await yardService.deleteCreatedGame(gameId);
                    if (success) {
                        renderDatabaseGamesList();
                        renderCommunityGames();
                    }
                }
            });
        });

    } catch (err) {
        console.warn('Error loading db games', err);
        listContainer.innerHTML = '<div style="text-align: center; color: #ff4757; padding: 20px;">Viga andmebaasi laadimisel!</div>';
    }
}
