import { initAuth, getCurrentUserProfile } from './auth';
import { yardService } from './shared/yardService';
import { AvatarWidget } from './components/AvatarWidget';
import { AvatarShopEditorModal } from './components/AvatarShopEditorModal';
import { initFriendsUI } from './shared/friends/friendsUI';
import { initGamesSearch } from './components/GamesSearch';

import { updateGameAgeRestrictions, setupAgeRestrictionModal, GAME_AGE_REQUIREMENTS } from './hub/ageRestrictions';
import { updateStreakTimerLive, renderStreakCards, updateYardDisplay } from './hub/streak';
import { renderRecentlyPlayed, setupGameCardTracking, updateRecentlyPlayedTimestamps } from './hub/recentlyPlayed';
import { renderCommunityGames, renderDatabaseGamesList } from './hub/communityGames';
import { updateAdminControlsVisibility, setupAdminPanel } from './hub/adminPanel';
import { setupOwnerPanel } from './hub/ownerPanel';
import { setupModals } from './hub/modals';
import { setupIcons } from './hub/icons';
import { setupGamePreviewModal } from './hub/gamePreviewModal';

// Re-exports for test and module compatibility
export {
    GAME_AGE_REQUIREMENTS,
    updateGameAgeRestrictions
};

console.log("Playard Hub & Platform Loaded.");
initAuth();
initGamesSearch();
(window as any).yardService = yardService;
(window as any).__updateGameAgeRestrictions = updateGameAgeRestrictions;

setupAgeRestrictionModal();
setupIcons();
setupModals();
setupAdminPanel();
setupOwnerPanel();
setupGamePreviewModal();
initFriendsUI();
renderRecentlyPlayed();
setupGameCardTracking();
renderCommunityGames();

const initialProf = getCurrentUserProfile();
updateAdminControlsVisibility(initialProf?.email, initialProf?.username);

yardService.subscribe(updateYardDisplay);
setInterval(updateStreakTimerLive, 1000);
setInterval(updateRecentlyPlayedTimestamps, 1000);

window.addEventListener('playard_game_played', () => {
    renderRecentlyPlayed();
});

window.addEventListener('playard_games_updated', () => {
    renderCommunityGames();
    if (document.getElementById('modal-database-panel')?.style.display === 'flex') {
        renderDatabaseGamesList();
    }
});

// 3D Avatar System Initialization
let avatarShopModal: AvatarShopEditorModal | null = null;
let avatarWidget: AvatarWidget | null = null;

try {
    avatarShopModal = new AvatarShopEditorModal();
    avatarWidget = new AvatarWidget('playard-avatar-widget-container', () => {
        if (avatarShopModal) avatarShopModal.open();
    });
    (window as any).playardAvatarWidget = avatarWidget;
    (window as any).playardAvatarShop = avatarShopModal;
    const curProf = getCurrentUserProfile();
    updateAdminControlsVisibility(curProf?.email, curProf?.username);
    import('./shared/avatar/EmoteAudio').then(m => {
        (window as any).playardEmoteAudio = m.emoteAudio;
    }).catch(() => {});
} catch (e) {
    console.warn('Avatar widget initialization error:', e);
}

window.addEventListener('playard_auth_changed', (e: any) => {
    const profile = e.detail && 'profile' in e.detail ? e.detail.profile : e.detail;
    updateAdminControlsVisibility(profile ? profile.email : null, profile ? profile.username : null);
    renderRecentlyPlayed();
    if (avatarWidget) avatarWidget.updateProfileUI();
});
