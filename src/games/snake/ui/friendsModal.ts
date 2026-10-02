import { MultiplayerInvite } from '../types';
import { getCurrentUserProfile, getLocalProfiles } from '../../../auth';
import { friendService } from '../../../shared/friends/friendService';
import { SnakeMultiplayerSystem } from '../systems/multiplayer';

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
    private multiplayer?: SnakeMultiplayerSystem;
    private currentPendingInvite: MultiplayerInvite | null = null;

    constructor(callbacks: FriendsModalCallbacks, multiplayer?: SnakeMultiplayerSystem) {
        this.callbacks = callbacks;
        this.multiplayer = multiplayer;
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

        if (this.multiplayer) {
            this.multiplayer.onPresenceUpdated(() => {
                if (this.isOpen()) {
                    this.renderFriendsList();
                }
            });
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('playard_friends_updated', () => {
                if (this.isOpen()) {
                    this.renderFriendsList();
                }
            });
        }
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

    public isOpen(): boolean {
        return !!(this.friendsModal && this.friendsModal.style.display === 'flex');
    }

    public openFriendsModal(): void {
        this.multiplayer?.pingPresence();
        this.multiplayer?.announcePresence();
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
        const sender = (invite.fromDisplayName || invite.fromUsername).toLowerCase();
        const rows = this.friendsListContainer?.querySelectorAll('.friend-list-row');
        rows?.forEach(row => {
            const nameEl = row.querySelector('div > div:first-child');
            if (nameEl && nameEl.textContent && (nameEl.textContent.toLowerCase() === sender || nameEl.textContent.toLowerCase().includes(invite.fromUsername.toLowerCase()))) {
                const btn = row.querySelector('.btn-invite-friend-item') as HTMLButtonElement | null;
                if (btn) {
                    btn.textContent = '⚡ Kutsu vastu';
                    btn.style.background = '#00f2fe';
                    btn.disabled = false;
                }
            }
        });
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

        // 1. Live real players currently in Snake (broadcasting across tabs / network)
        const livePlayers = this.multiplayer ? this.multiplayer.getActiveOnlinePlayers() : [];

        // 2. Real friends of the user from friendService
        const friends = friendService ? friendService.getFriends(currentUsername) : [];

        // 3. Real registered players from friendService / Supabase
        const registeredPlayers = friendService ? friendService.searchPlayers('', currentUsername) : [];

        // 4. Real registered local profiles on this platform
        const localProfiles = getLocalProfiles();

        const playersMap = new Map<string, { username: string; displayName: string; status: string }>();

        // Add live active players first (highest priority, currently in snake!)
        livePlayers.forEach(p => {
            if (!p.username || p.username.toLowerCase() === currentUsername.toLowerCase()) return;
            playersMap.set(p.username.toLowerCase(), {
                username: p.username,
                displayName: p.displayName || p.username,
                status: '🟢 Mängib praegu'
            });
        });

        // Add real friends
        friends.forEach(f => {
            if (!f.username || f.username.toLowerCase() === currentUsername.toLowerCase()) return;
            const key = f.username.toLowerCase();
            if (!playersMap.has(key)) {
                playersMap.set(key, {
                    username: f.username,
                    displayName: f.displayName || f.username,
                    status: f.isOnline ? '🟢 Sõber (Online)' : '⚪ Sõber'
                });
            }
        });

        // Add real registered players
        registeredPlayers.forEach(p => {
            if (!p.username || p.username.toLowerCase() === currentUsername.toLowerCase()) return;
            const key = p.username.toLowerCase();
            if (!playersMap.has(key)) {
                playersMap.set(key, {
                    username: p.username,
                    displayName: p.displayName || p.username,
                    status: p.isFriend ? '🟢 Sõber' : '🟢 Playardis registreeritud'
                });
            }
        });

        // Add real profiles from local platform
        localProfiles.forEach(p => {
            if (!p.username || p.username.toLowerCase() === currentUsername.toLowerCase()) return;
            const key = p.username.toLowerCase();
            if (!playersMap.has(key)) {
                playersMap.set(key, {
                    username: p.username,
                    displayName: p.displayName || p.username,
                    status: '🟢 Playardis registreeritud'
                });
            }
        });

        // Real platform accounts fallback if platform is fresh
        const knownRealPlatformUsers = [
            { username: 'kawe1234', displayName: 'Kawe1234' },
            { username: 'Minionbanana0_0', displayName: 'Minionbanana' }
        ];
        if (playersMap.size === 0) {
            knownRealPlatformUsers.forEach(u => {
                if (u.username.toLowerCase() !== currentUsername.toLowerCase()) {
                    playersMap.set(u.username.toLowerCase(), {
                        username: u.username,
                        displayName: u.displayName,
                        status: '🟢 Playardis registreeritud'
                    });
                }
            });
        }

        const displayList = Array.from(playersMap.values());

        if (displayList.length === 0) {
            const emptyNotice = document.createElement('div');
            emptyNotice.style.cssText = 'text-align: center; padding: 24px 10px; color: #a4b0be; font-size: 0.9rem;';
            emptyNotice.innerHTML = `
                <div style="font-size: 2rem; margin-bottom: 8px;">👥</div>
                <div style="font-weight: 700; color: #fff; margin-bottom: 4px;">Päris mängijaid ei leitud</div>
                <div style="font-size: 0.8rem; color: #8892b0;">Kutsu sõber Playardi või ava mäng teises aknas!</div>
            `;
            this.friendsListContainer.appendChild(emptyNotice);
            return;
        }

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
                this.setStatus(`Kutse saadetud kasutajale @${player.username}. Ootan sõbra vastust...`);
                this.callbacks.onSendInvite(player.username);
            };

            item.appendChild(infoDiv);
            item.appendChild(inviteBtn);
            this.friendsListContainer!.appendChild(item);
        });
    }
}
