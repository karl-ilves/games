import { MultiplayerInvite, Direction, GridPoint } from '../types';
import { getCurrentUserProfile } from '../../../auth';

export type InviteCallback = (invite: MultiplayerInvite) => void;
export type InviteResponseCallback = (accepted: boolean, friendName: string) => void;
export type RemoteMoveCallback = (direction: Direction, body: GridPoint[], score: number) => void;

export class SnakeMultiplayerSystem {
    private channel: BroadcastChannel | null = null;
    private onInviteReceivedCallback: InviteCallback | null = null;
    private onInviteResponseCallback: InviteResponseCallback | null = null;
    private onRemoteMoveCallback: RemoteMoveCallback | null = null;
    public activeOpponent: string | null = null;
    public isHost: boolean = false;

    constructor() {
        this.initChannel();
    }

    private initChannel(): void {
        if (typeof BroadcastChannel === 'undefined') return;
        try {
            this.channel = new BroadcastChannel('playard_snake_multiplayer_v1');
            this.channel.onmessage = (event) => {
                this.handleMessage(event.data);
            };
        } catch (e) {
            console.warn('[SnakeMultiplayer] BroadcastChannel init note:', e);
        }
    }

    private handleMessage(data: any): void {
        if (!data || typeof data !== 'object') return;
        const profile = getCurrentUserProfile();
        const currentUsername = profile?.username?.toLowerCase() || 'guest';

        switch (data.type) {
            case 'SNAKE_INVITE': {
                const invite: MultiplayerInvite = data.invite;
                if (!invite) return;
                // If targeted to current user or if guest Broadcast broadcast
                const target = invite.toUsername.toLowerCase();
                if (target === currentUsername || target === 'all' || target === 'guest') {
                    if (this.onInviteReceivedCallback) {
                        this.onInviteReceivedCallback(invite);
                    }
                }
                break;
            }
            case 'SNAKE_INVITE_RESPONSE': {
                if (this.activeOpponent && data.fromUsername.toLowerCase() === this.activeOpponent.toLowerCase()) {
                    if (this.onInviteResponseCallback) {
                        this.onInviteResponseCallback(data.accepted, data.fromDisplayName || data.fromUsername);
                    }
                }
                break;
            }
            case 'SNAKE_REMOTE_MOVE': {
                if (this.onRemoteMoveCallback && this.activeOpponent && data.fromUsername.toLowerCase() === this.activeOpponent.toLowerCase()) {
                    this.onRemoteMoveCallback(data.direction, data.body, data.score);
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

    public onRemoteMove(cb: RemoteMoveCallback): void {
        this.onRemoteMoveCallback = cb;
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

        this.activeOpponent = toUsername;
        this.isHost = true;

        if (this.channel) {
            this.channel.postMessage({
                type: 'SNAKE_INVITE',
                invite
            });
        }

        return invite;
    }

    public respondToInvite(invite: MultiplayerInvite, accepted: boolean): void {
        const profile = getCurrentUserProfile();
        const fromUsername = profile?.username || 'Guest';
        const fromDisplayName = profile?.display_name || fromUsername;

        if (accepted) {
            this.activeOpponent = invite.fromUsername;
            this.isHost = false;
        }

        if (this.channel) {
            this.channel.postMessage({
                type: 'SNAKE_INVITE_RESPONSE',
                inviteId: invite.id,
                fromUsername,
                fromDisplayName,
                toUsername: invite.fromUsername,
                accepted
            });
        }
    }

    public broadcastMove(direction: Direction, body: GridPoint[], score: number): void {
        if (!this.channel || !this.activeOpponent) return;
        const profile = getCurrentUserProfile();
        const fromUsername = profile?.username || 'Guest';

        this.channel.postMessage({
            type: 'SNAKE_REMOTE_MOVE',
            fromUsername,
            direction,
            body,
            score
        });
    }

    public cleanup(): void {
        if (this.channel) {
            this.channel.close();
            this.channel = null;
        }
    }
}
