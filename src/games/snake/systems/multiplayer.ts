import { MultiplayerInvite, Direction, GridPoint, FoodItem } from '../types';
import { getCurrentUserProfile } from '../../../auth';

export type InviteCallback = (invite: MultiplayerInvite) => void;
export type InviteResponseCallback = (accepted: boolean, friendName: string) => void;
export type GuestInputCallback = (direction: Direction) => void;
export type HostSyncCallback = (data: {
    body1: GridPoint[];
    dir1: Direction;
    score1: number;
    body2: GridPoint[];
    dir2: Direction;
    score2: number;
    foodItems: FoodItem[];
    isGameOver: boolean;
}) => void;

export class SnakeMultiplayerSystem {
    private channel: BroadcastChannel | null = null;
    private onInviteReceivedCallback: InviteCallback | null = null;
    private onInviteResponseCallback: InviteResponseCallback | null = null;
    private onGuestInputCallback: GuestInputCallback | null = null;
    private onHostSyncCallback: HostSyncCallback | null = null;

    public activeOpponent: string | null = null;
    public pendingInviteId: string | null = null;
    public isHost: boolean = false;
    public isConnected: boolean = false;
    public readonly tabId = Math.random().toString(36).substring(2, 9);
    private botTimeout: any = null;

    constructor() {
        this.initChannel();
        this.initStorageListener();
    }

    private initChannel(): void {
        if (typeof BroadcastChannel === 'undefined') return;
        try {
            this.channel = new BroadcastChannel('playard_snake_multiplayer_v1');
            this.channel.onmessage = (event) => {
                this.handleMessage(event.data);
            };
        } catch (e) {
            console.warn('[SnakeMultiplayer] BroadcastChannel note:', e);
        }
    }

    private initStorageListener(): void {
        if (typeof window === 'undefined') return;
        window.addEventListener('storage', (e) => {
            if (e.key === 'playard_snake_mp_event' && e.newValue) {
                try {
                    const data = JSON.parse(e.newValue);
                    this.handleMessage(data);
                } catch (err) {}
            }
        });
    }

    private handleMessage(data: any): void {
        if (!data || typeof data !== 'object') return;
        if (data.senderTabId === this.tabId) return; // Ignore own outgoing broadcast

        switch (data.type) {
            case 'SNAKE_INVITE': {
                const invite: MultiplayerInvite = data.invite;
                if (!invite) return;
                // Deliver invite to the recipient
                if (this.onInviteReceivedCallback) {
                    this.onInviteReceivedCallback(invite);
                }
                break;
            }
            case 'SNAKE_INVITE_RESPONSE': {
                // If this response corresponds to our pending invite
                const matchesInvite = this.pendingInviteId && data.inviteId === this.pendingInviteId;
                const matchesOpponent = this.activeOpponent && data.fromUsername && (
                    data.fromUsername.toLowerCase() === this.activeOpponent.toLowerCase()
                );

                if (matchesInvite || matchesOpponent || this.pendingInviteId) {
                    this.clearBotTimer();
                    this.pendingInviteId = null;
                    this.isConnected = data.accepted;
                    if (data.accepted) {
                        this.activeOpponent = data.fromUsername || this.activeOpponent;
                        this.isHost = true;
                    }
                    if (this.onInviteResponseCallback) {
                        this.onInviteResponseCallback(data.accepted, data.fromDisplayName || data.fromUsername);
                    }
                }
                break;
            }
            case 'SNAKE_GUEST_INPUT': {
                if (this.isHost && this.onGuestInputCallback) {
                    this.onGuestInputCallback(data.direction);
                }
                break;
            }
            case 'SNAKE_HOST_SYNC': {
                if (!this.isHost && this.onHostSyncCallback) {
                    this.onHostSyncCallback(data);
                }
                break;
            }
        }
    }

    public onInviteReceived(cb: InviteCallback): void {
        this.onInviteReceivedCallback = cb;
    }

    public onInviteResponse(cb: InviteResponseCallback): void {
        this.onInviteResponseCallback = cb;
    }

    public onGuestInput(cb: GuestInputCallback): void {
        this.onGuestInputCallback = cb;
    }

    public onHostSync(cb: HostSyncCallback): void {
        this.onHostSyncCallback = cb;
    }

    public sendInvite(toUsername: string): MultiplayerInvite {
        const profile = getCurrentUserProfile();
        const fromUsername = profile?.username || 'Guest';
        const fromDisplayName = profile?.display_name || fromUsername;

        const invite: MultiplayerInvite = {
            id: `invite_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            fromUsername,
            fromDisplayName,
            toUsername,
            timestamp: Date.now(),
            status: 'pending'
        };

        this.pendingInviteId = invite.id;
        this.activeOpponent = toUsername;
        this.isHost = true;

        const payload = {
            type: 'SNAKE_INVITE',
            invite,
            senderTabId: this.tabId
        };

        this.broadcastPayload(payload);
        return invite;
    }

    public respondToInvite(invite: MultiplayerInvite, accepted: boolean): void {
        const profile = getCurrentUserProfile();
        const fromUsername = profile?.username || 'Guest';
        const fromDisplayName = profile?.display_name || fromUsername;

        if (accepted) {
            this.activeOpponent = invite.fromUsername;
            this.isHost = false;
            this.isConnected = true;
        }

        const payload = {
            type: 'SNAKE_INVITE_RESPONSE',
            inviteId: invite.id,
            fromUsername,
            fromDisplayName,
            toUsername: invite.fromUsername,
            accepted,
            senderTabId: this.tabId
        };

        this.broadcastPayload(payload);
    }

    public broadcastGuestInput(direction: Direction): void {
        const payload = {
            type: 'SNAKE_GUEST_INPUT',
            direction,
            senderTabId: this.tabId
        };
        this.broadcastPayload(payload);
    }

    public broadcastHostSync(data: {
        body1: GridPoint[];
        dir1: Direction;
        score1: number;
        body2: GridPoint[];
        dir2: Direction;
        score2: number;
        foodItems: FoodItem[];
        isGameOver: boolean;
    }): void {
        const payload = {
            type: 'SNAKE_HOST_SYNC',
            ...data,
            senderTabId: this.tabId
        };
        this.broadcastPayload(payload);
    }

    private broadcastPayload(payload: any): void {
        if (this.channel) {
            try {
                this.channel.postMessage(payload);
            } catch (e) {}
        }
        try {
            localStorage.setItem('playard_snake_mp_event', JSON.stringify({ ...payload, _ts: Date.now() }));
        } catch (e) {}
    }

    public clearBotTimer(): void {
        if (this.botTimeout) {
            clearTimeout(this.botTimeout);
            this.botTimeout = null;
        }
    }

    public cleanup(): void {
        this.clearBotTimer();
        if (this.channel) {
            this.channel.close();
            this.channel = null;
        }
    }
}
