import { getCurrentUserProfile, isPlayardOwner, calculateAge } from '../auth';

export const GAME_AGE_REQUIREMENTS: Record<string, { minAge: number; title: string }> = {
    'card-war-game': { minAge: 10, title: '3D War Simulator' },
    'card-mmp1-game': { minAge: 10, title: 'MMP1 (Murder Mystery)' },
    'card-metro-game': { minAge: 10, title: 'LAST METRO' }
};

export function updateGameAgeRestrictions() {
    const prof = getCurrentUserProfile();
    const isOwner = isPlayardOwner(prof?.email);
    const isAdmin = isOwner || prof?.isAdmin;
    const isEstonian = isOwner;

    let userAge: number = 99; // Default if not logged in
    if (prof) {
        if (prof.birthDate) {
            userAge = calculateAge(prof.birthDate);
        } else if (prof.age !== undefined) {
            userAge = prof.age;
        }
    }

    for (const [cardId, req] of Object.entries(GAME_AGE_REQUIREMENTS)) {
        const card = document.getElementById(cardId) as HTMLAnchorElement | null;
        if (!card) continue;

        let badge = card.querySelector('.game-age-badge') as HTMLElement | null;
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'game-age-badge';
            badge.style.fontSize = '0.75rem';
            badge.style.fontWeight = '800';
            badge.style.padding = '3px 8px';
            badge.style.borderRadius = '6px';
            badge.style.letterSpacing = '0.5px';
            badge.style.display = 'inline-block';
            
            const firstRow = card.querySelector('div');
            if (firstRow) {
                firstRow.appendChild(badge);
            } else {
                card.insertBefore(badge, card.firstChild);
            }
        }

        const isLocked = !isAdmin && prof && userAge < req.minAge;

        if (isLocked) {
            card.setAttribute('data-age-locked', 'true');
            card.setAttribute('data-min-age', String(req.minAge));
            card.setAttribute('data-user-age', String(userAge));
            card.style.opacity = '0.75';
            card.style.filter = 'grayscale(30%)';
            badge.style.color = '#ff4757';
            badge.style.background = 'rgba(255, 71, 87, 0.18)';
            badge.style.border = '1px solid rgba(255, 71, 87, 0.5)';
            badge.textContent = isEstonian 
                ? `🔒 10+ (Sinu vanus: ${userAge})` 
                : `🔒 Age ${req.minAge}+ (You are ${userAge})`;
        } else {
            card.setAttribute('data-age-locked', 'false');
            card.removeAttribute('data-min-age');
            card.removeAttribute('data-user-age');
            card.style.opacity = '1';
            card.style.filter = 'none';
            badge.style.color = '#2ecc71';
            badge.style.background = 'rgba(46, 204, 113, 0.15)';
            badge.style.border = '1px solid rgba(46, 204, 113, 0.4)';
            badge.textContent = `✅ ${req.minAge}+`;
        }
    }
}

export function setupAgeRestrictionModal() {
    const modal = document.getElementById('age-restriction-modal');
    const titleEl = document.getElementById('age-modal-title');
    const descEl = document.getElementById('age-modal-desc');
    const closeBtn = document.getElementById('btn-close-age-modal');

    const closeModal = () => {
        if (modal) modal.style.display = 'none';
    };

    closeBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.addEventListener('click', (e) => {
        const target = (e.target as HTMLElement).closest('[data-age-locked="true"]') as HTMLAnchorElement | null;
        if (target) {
            e.preventDefault();
            e.stopPropagation();
            const minAge = target.getAttribute('data-min-age') || '10';
            const userAge = target.getAttribute('data-user-age') || '9';
            const prof = getCurrentUserProfile();
            const isEstonian = isPlayardOwner(prof?.email);

            if (modal) {
                if (titleEl) {
                    titleEl.textContent = isEstonian ? `🔒 Vanusepiirang (${minAge}+)` : `🔒 Age Restricted (${minAge}+)`;
                }
                if (descEl) {
                    descEl.innerHTML = isEstonian
                        ? `See mäng nõuab vähemalt <strong>${minAge}</strong>-aastast vanust.<br>Sinu praegune vanus on <strong>${userAge}</strong>.<br>Mäng avaneb automaatselt, kui saad <strong>${minAge}</strong>-aastaseks!`
                        : `This game requires players to be at least <strong>${minAge}</strong> years old.<br>Your current age is <strong>${userAge}</strong>.<br>This game will automatically unlock when you turn <strong>${minAge}</strong>!`;
                }
                modal.style.display = 'flex';
            }
        }
    }, true);
}
