import { getCurrentUserProfile, UserProfile } from '../../auth';
import { friendService, Friend, FriendRequest, PlayerSearchResult } from './friendService';
import { getLanguage } from '../i18n';

export function initFriendsUI() {
    if (typeof document === 'undefined') return;

    // Listen for auth state change
    window.addEventListener('playard_auth_changed', (evt: any) => {
        const profile = evt.detail as UserProfile | null;
        renderFriendsSection(profile);
    });

    // Listen for friends state updates
    window.addEventListener('playard_friends_updated', () => {
        const profile = getCurrentUserProfile();
        renderFriendsSection(profile);
    });

    // Initial render if user is already logged in
    const initialProfile = getCurrentUserProfile();
    renderFriendsSection(initialProfile);

    setupModals();
}

function renderFriendsSection(profile: UserProfile | null) {
    const container = document.getElementById('friends-container');
    if (!container) return;

    if (!profile || !profile.username) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    friendService.initUser(profile.username, profile.displayName);

    const friends = friendService.getFriends(profile.username);
    const incoming = friendService.getIncomingRequests(profile.username);
    const isEt = getLanguage() === 'et';

    // Update friends count
    const countEl = document.getElementById('friends-count');
    if (countEl) {
        countEl.textContent = `(${friends.length})`;
    }

    // Update requests badge on the plus circle
    const badgeEl = document.getElementById('friend-requests-badge');
    if (badgeEl) {
        if (incoming.length > 0) {
            badgeEl.textContent = String(incoming.length);
            badgeEl.style.display = 'flex';
        } else {
            badgeEl.style.display = 'none';
        }
    }

    // Render friends list row
    const listRow = document.getElementById('friends-list-items');
    if (listRow) {
        if (friends.length === 0) {
            listRow.innerHTML = `
                <div style="display: flex; align-items: center; color: #8899a6; font-size: 0.85rem; font-style: italic; padding: 0 10px;">
                    ${isEt ? 'Sul pole veel lisatud sõpru. Kutsu sõpru nupust!' : 'No friends added yet. Click Invite Friend!'}
                </div>
            `;
        } else {
            listRow.innerHTML = friends.map(f => `
                <div class="friend-item" data-username="${f.username}" style="display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 62px; cursor: pointer;">
                    <div style="position: relative; width: 48px; height: 48px; border-radius: 50%; background: ${f.avatarColor || '#3498db'}; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; box-shadow: 0 3px 10px rgba(0,0,0,0.3); border: 2px solid rgba(255,255,255,0.15);">
                        👤
                        <span style="position: absolute; bottom: 0; right: 0; width: 12px; height: 12px; background: #0be881; border-radius: 50%; border: 2px solid #242f3d;"></span>
                    </div>
                    <span style="font-size: 0.78rem; font-weight: 600; color: #f1f2f6; max-width: 65px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center;">
                        ${f.displayName || f.username}
                    </span>
                </div>
            `).join('');

            // Allow clicking a friend to show a mini unfriend option
            listRow.querySelectorAll('.friend-item').forEach(el => {
                el.addEventListener('click', () => {
                    const targetUser = el.getAttribute('data-username');
                    if (!targetUser) return;
                    const confirmRemove = window.confirm(
                        isEt ? `Kas soovid eemaldada kasutaja ${targetUser} sõprade nimekirjast?` : `Remove ${targetUser} from your friends?`
                    );
                    if (confirmRemove) {
                        friendService.removeFriend(profile.username, targetUser);
                    }
                });
            });
        }
    }
}

function setupModals() {
    // 1. Plus circle click -> Open Incoming Requests Modal
    const plusCircle = document.getElementById('btn-friend-requests-circle');
    const requestsModal = document.getElementById('modal-friend-requests');
    const closeRequestsBtn = document.getElementById('btn-close-friend-requests');

    plusCircle?.addEventListener('click', () => {
        const profile = getCurrentUserProfile();
        if (!profile || !profile.username) return;
        renderIncomingRequestsModal(profile.username);
        if (requestsModal) requestsModal.style.display = 'flex';
    });

    closeRequestsBtn?.addEventListener('click', () => {
        if (requestsModal) requestsModal.style.display = 'none';
    });

    // 2. "Invite Friend" button click -> Open Search & Invite Modal
    const inviteBtn = document.getElementById('btn-invite-friend');
    const inviteModal = document.getElementById('modal-invite-friends');
    const closeInviteBtn = document.getElementById('btn-close-invite-friends');
    const searchInput = document.getElementById('friend-search-input') as HTMLInputElement | null;

    inviteBtn?.addEventListener('click', () => {
        const profile = getCurrentUserProfile();
        if (!profile || !profile.username) return;
        if (searchInput) searchInput.value = '';
        renderSearchResults('', profile.username);
        if (inviteModal) inviteModal.style.display = 'flex';
        setTimeout(() => searchInput?.focus(), 50);
    });

    closeInviteBtn?.addEventListener('click', () => {
        if (inviteModal) inviteModal.style.display = 'none';
    });

    // 3. Search input live filtering
    searchInput?.addEventListener('input', () => {
        const profile = getCurrentUserProfile();
        if (!profile || !profile.username) return;
        renderSearchResults(searchInput.value, profile.username);
    });

    // Close on backdrop click
    window.addEventListener('click', (e) => {
        if (e.target === requestsModal && requestsModal) requestsModal.style.display = 'none';
        if (e.target === inviteModal && inviteModal) inviteModal.style.display = 'none';
    });
}

function renderIncomingRequestsModal(username: string) {
    const listEl = document.getElementById('friend-requests-list');
    if (!listEl) return;

    const incoming = friendService.getIncomingRequests(username);
    const isEt = getLanguage() === 'et';

    if (incoming.length === 0) {
        listEl.innerHTML = `
            <div style="text-align: center; color: #8899a6; padding: 25px 10px; font-size: 0.95rem;">
                💌 ${isEt ? 'Sul pole hetkel uusi sõbrakutseid.' : 'No pending friend requests at the moment.'}
            </div>
        `;
        return;
    }

    listEl.innerHTML = incoming.map(req => `
        <div class="request-row" data-from="${req.fromUsername}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #182029; border-radius: 10px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.06); gap: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: ${req.fromColor || '#00f2fe'}; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                    👤
                </div>
                <div style="text-align: left;">
                    <div style="font-weight: 700; color: #fff; font-size: 0.92rem;">${req.fromDisplayName || req.fromUsername}</div>
                    <div style="font-size: 0.78rem; color: #0be881;">${isEt ? 'Saatis sulle sõbrakutse' : 'Sent you a friend request'}</div>
                </div>
            </div>
            <div style="display: flex; gap: 6px;">
                <button class="btn-accept-request" data-from="${req.fromUsername}" style="padding: 7px 14px; background: #2ecc71; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 0.82rem; transition: background 0.2s;">
                    ${isEt ? '✓ Võta vastu' : '✓ Accept'}
                </button>
                <button class="btn-decline-request" data-from="${req.fromUsername}" style="padding: 7px 10px; background: #485460; color: #d2dae2; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 0.82rem; transition: background 0.2s;">
                    ${isEt ? '✕ Keeldu' : '✕ Decline'}
                </button>
            </div>
        </div>
    `).join('');

    // Bind Accept buttons
    listEl.querySelectorAll('.btn-accept-request').forEach(btn => {
        btn.addEventListener('click', () => {
            const fromUser = btn.getAttribute('data-from');
            if (!fromUser) return;
            friendService.acceptFriendRequest(username, fromUser);
            renderIncomingRequestsModal(username);
        });
    });

    // Bind Decline buttons
    listEl.querySelectorAll('.btn-decline-request').forEach(btn => {
        btn.addEventListener('click', () => {
            const fromUser = btn.getAttribute('data-from');
            if (!fromUser) return;
            friendService.declineFriendRequest(username, fromUser);
            renderIncomingRequestsModal(username);
        });
    });
}

function renderSearchResults(query: string, currentUsername: string) {
    const resultsContainer = document.getElementById('friend-search-results');
    if (!resultsContainer) return;

    const results = friendService.searchPlayers(query, currentUsername);
    const isEt = getLanguage() === 'et';

    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <div style="text-align: center; color: #8899a6; padding: 25px 10px; font-size: 0.95rem;">
                🔍 ${isEt ? 'Mängijat nimega "' + query + '" ei leitud.' : 'No players matching "' + query + '".'}
            </div>
        `;
        return;
    }

    resultsContainer.innerHTML = results.map(player => {
        let actionBtnHtml = '';
        if (player.isFriend) {
            actionBtnHtml = `
                <button disabled style="padding: 7px 12px; background: rgba(46, 204, 113, 0.15); color: #2ecc71; border: 1px solid rgba(46, 204, 113, 0.3); border-radius: 6px; font-weight: 700; font-size: 0.8rem; cursor: default;">
                    ${isEt ? '✓ Sõber' : '✓ Friend'}
                </button>
            `;
        } else if (player.hasPendingOutgoing) {
            actionBtnHtml = `
                <button disabled style="padding: 7px 12px; background: rgba(241, 196, 15, 0.15); color: #f1c40f; border: 1px solid rgba(241, 196, 15, 0.3); border-radius: 6px; font-weight: 700; font-size: 0.8rem; cursor: default;">
                    ${isEt ? '⏳ Saadetud' : '⏳ Request Sent'}
                </button>
            `;
        } else if (player.hasPendingIncoming) {
            actionBtnHtml = `
                <button class="btn-accept-search" data-username="${player.username}" style="padding: 7px 12px; background: #2ecc71; color: white; border: none; border-radius: 6px; font-weight: 700; font-size: 0.8rem; cursor: pointer;">
                    ${isEt ? '✓ Võta vastu' : '✓ Accept'}
                </button>
            `;
        } else {
            actionBtnHtml = `
                <button class="btn-send-invite" data-username="${player.username}" style="padding: 7px 14px; background: #3498db; color: white; border: none; border-radius: 6px; font-weight: 700; font-size: 0.82rem; cursor: pointer; transition: background 0.2s;">
                    ${isEt ? '➕ Kutsu' : '➕ Invite'}
                </button>
            `;
        }

        return `
            <div class="player-search-card" data-username="${player.username}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #182029; border-radius: 10px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: ${player.color || '#3498db'}; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                        👤
                    </div>
                    <div style="text-align: left;">
                        <div style="font-weight: 700; color: #fff; font-size: 0.95rem;">${player.displayName || player.username}</div>
                        <div style="font-size: 0.78rem; color: #8899a6;">@${player.username.toLowerCase()}</div>
                    </div>
                </div>
                <div>${actionBtnHtml}</div>
            </div>
        `;
    }).join('');

    // Bind invite buttons
    resultsContainer.querySelectorAll('.btn-send-invite').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-username');
            if (!target) return;
            const profile = getCurrentUserProfile();
            if (!profile) return;
            friendService.sendFriendRequest(profile.username, profile.displayName, target);
            renderSearchResults(query, currentUsername);
        });
    });

    // Bind accept buttons in search if applicable
    resultsContainer.querySelectorAll('.btn-accept-search').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-username');
            if (!target) return;
            friendService.acceptFriendRequest(currentUsername, target);
            renderSearchResults(query, currentUsername);
        });
    });
}
