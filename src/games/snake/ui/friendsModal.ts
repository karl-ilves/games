import { MultiplayerInvite } from '../types';
import { getCurrentUserProfile, getLocalProfiles } from '../../../auth';
import { friendService } from '../../../shared/friends/friendService';

export interface FriendsModalCallbacks {
    onSendInvite: (username: string) => void;
    onAcceptInvite: (invite: MultiplayerInvite) => void;
    onDeclineInvite: (invite: MultiplayerInvite) => void;
    onStartLocal2Player: () => void;
}

export class FriendsModalUI {
    private friendsModal: HTMLElement | null;
    private inviteConfirmModal: HTMLElement | null;
    private friendsListContainer: HTMLElement | null;
    private inviteSenderNameEl: HTMLElement | null;
    private btnAcceptInvite: HTMLButtonElement | null;
    private btnDeclineInvite: HTMLButtonElement | null;
    private btnCloseFriends: HTMLButtonElement | null;
    private btnLocal2Player: HTMLButtonElement | null;
    private statusBanner: HTMLElement | null;

    private callbacks: FriendsModalCallbacks;
    private currentPendingInvite: MultiplayerInvite | null = null;

    constructor(callbacks: FriendsModalCallbacks) {
        this.callbacks = callbacks;
        this.friendsModal = document.getElementById('modal-friends-list');
        this.inviteConfirmModal = document.getElementById('modal-invite-confirm');
        this.friendsListContainer = document.getElementById('friends-list-items');
        this.inviteSenderNameEl = document.getElementById('invite-sender-name');
        this.btnAcceptInvite = document.getElementById('btn-invite-accept') as HTMLButtonElement | null;
        this.btnDeclineInvite = document.getElementById('btn-invite-decline') as HTMLButtonElement | null;
        this.btnCloseFriends = document.getElementById('btn-close-friends') as HTMLButtonElement | null;
        this.btnLocal2Player = document.getElementById('btn-local-2player') as HTMLButtonElement | null;
        this.statusBanner = document.getElementById('friends-modal-status');

        this.bindEvents();
    }

    private bindEvents(): void {
        this.btnCloseFriends?.addEventListener('click', () => {
            this.closeFriendsModal();
        });

        this.btnLocal2Player?.addEventListener('click', () => {
            this.closeFriendsModal();
            this.callbacks.onStartLocal2Player();
        });

        this.btnAcceptInvite?.addEventListener('click', () => {
            if (this.currentPendingInvite) {
                const invite = this.currentPendingInvite;
                this.currentPendingInvite = null;
                this.closeInviteConfirmModal();
                this.callbacks.onAcceptInvite(invite);
            }
        });

        this.btnDeclineInvite?.addEventListener('click', () => {
            if (this.currentPendingInvite) {
                const invite = this.currentPendingInvite;
                this.currentPendingInvite = null;
                this.closeInviteConfirmModal();
                this.callbacks.onDeclineInvite(invite);
            }
        });
    }

    public openFriendsModal(): void {
        this.renderFriendsList();
        if (this.friendsModal) {
            this.friendsModal.style.display = 'flex';
        }
    }

    public closeFriendsModal(): void {
        if (this.friendsModal) {
            this.friendsModal.style.display = 'none';
        }
    }

    public showInviteConfirmation(invite: MultiplayerInvite): void {
        this.currentPendingInvite = invite;
        if (this.inviteSenderNameEl) {
            this.inviteSenderNameEl.textContent = invite.fromDisplayName || invite.fromUsername;
        }
        if (this.inviteConfirmModal) {
            this.inviteConfirmModal.style.display = 'flex';
        }
    }

    public closeInviteConfirmModal(): void {
        if (this.inviteConfirmModal) {
            this.inviteConfirmModal.style.display = 'none';
        }
    }

    public setStatus(msg: string): void {
        if (this.statusBanner) {
            this.statusBanner.textContent = msg;
            this.statusBanner.style.display = 'block';
        }
    }

    public clearStatus(): void {
        if (this.statusBanner) {
            this.statusBanner.style.display = 'none';
        }
    }

    private renderFriendsList(): void {
        if (!this.friendsListContainer) return;
        this.friendsListContainer.innerHTML = '';
        this.clearStatus();

        const currentProfile = getCurrentUserProfile();
        const currentUsername = currentProfile?.username || 'Guest';

        // Retrieve real friends from friendService
        let friends = friendService ? friendService.getFriends(currentUsername) : [];

        // If no friends or guest, provide platform players / simulations
        const fallbackPlayers = [
            { username: 'kawe1234', displayName: 'Kawe1234', status: '🟢 Online' },
            { username: 'Minionbanana0_0', displayName: 'Minionbanana', status: '🟢 Online' },
            { username: 'Sam', displayName: 'Sam Pro', status: '🟢 Online' },
            { username: 'Jordan', displayName: 'Jordan Gamer', status: '🟢 Online' }
        ].filter(p => p.username.toLowerCase() !== currentUsername.toLowerCase());

        const displayList = friends.length > 0 ? friends.map(f => ({
            username: f.username,
            displayName: f.displayName || f.username,
            status: f.isOnline ? '🟢 Online' : '⚪ Offline'
        })) : fallbackPlayers;

        displayList.forEach(player => {
            const item = document.createElement('div');
            item.className = 'friend-list-row';
            item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.05); padding: 10px 14px; border-radius: 10px; margin-bottom: 8px; border: 1px solid rgba(255, 255, 255, 0.1);';

            const infoDiv = document.createElement('div');
            infoDiv.style.cssText = 'display: flex; align-items: center; gap: 10px;';

            const avatar = document.createElement('div');
            avatar.style.cssText = 'width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #00e676, #00b0ff); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem; color: #000;';
            avatar.textContent = player.displayName.charAt(0).toUpperCase();

            const nameDiv = document.createElement('div');
            const nameEl = document.createElement('div');
            nameEl.style.cssText = 'font-weight: 700; color: #fff; font-size: 0.95rem;';
            nameEl.textContent = player.displayName;

            const statusEl = document.createElement('div');
            statusEl.style.cssText = 'font-size: 0.75rem; color: #a4b0be;';
            statusEl.textContent = player.status;

            nameDiv.appendChild(nameEl);
            nameDiv.appendChild(statusEl);
            infoDiv.appendChild(avatar);
            infoDiv.appendChild(nameDiv);

            const inviteBtn = document.createElement('button');
            inviteBtn.className = 'btn-invite-friend-item';
            inviteBtn.style.cssText = 'background: #00e676; border: none; color: #050813; font-weight: 800; font-size: 0.8rem; padding: 7px 14px; border-radius: 6px; cursor: pointer; transition: transform 0.15s;';
            inviteBtn.textContent = '✉️ Kutsu';
            inviteBtn.onclick = () => {
                inviteBtn.textContent = '⏳ Saadetud!';
                inviteBtn.disabled = true;
                inviteBtn.style.background = '#ffd700';
                this.setStatus(`Kutse saadetud kasutajale @${player.username}. Ootan vastust...`);
                this.callbacks.onSendInvite(player.username);
            };

            item.appendChild(infoDiv);
            item.appendChild(inviteBtn);
            this.friendsListContainer!.appendChild(item);
        });
    }
}
