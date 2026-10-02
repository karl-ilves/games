import { MultiplayerInvite, Direction, GridPoint, FoodItem, RemotePlayerInfo, ServerRoomState } from '../types';
import { getCurrentUserProfile } from '../../../auth';
import { getSnakeColorPreset, SnakeColorPreset } from '../catalog';
import { DemoAiSystem } from './demoAi';

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

    // Server-based matchmaking (max 3 real players per server)
    public readonly MAX_PLAYERS_PER_SERVER = 3;
    public currentServerId: string = 'server_1';
    public currentServerNumber: number = 1;
    public activeRemotePlayers: Map<string, RemotePlayerInfo> = new Map();
    public aiSnake: RemotePlayerInfo | null = null;
    public aiDirection: Direction = 'LEFT';
    public hasAiSnake: boolean = true;

    constructor() {
        this.initChannel();
        this.initStorageListener();
        this.assignServer();
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

    public incomingInvites: Map<string, MultiplayerInvite> = new Map();
    public activeOnlinePlayers: Map<string, { username: string; displayName: string; tabId: string; lastSeen: number }> = new Map();
    private onPresenceUpdatedCallback: (() => void) | null = null;

    public onPresenceUpdated(cb: () => void): void {
        this.onPresenceUpdatedCallback = cb;
    }

    public pingPresence(): void {
        this.broadcastPayload({
            type: 'SNAKE_PRESENCE_PING',
            senderTabId: this.tabId
        });
    }

    public announcePresence(): void {
        const profile = getCurrentUserProfile();
        const username = profile?.username || 'Guest';
        const displayName = profile?.display_name || username;
        this.broadcastPayload({
            type: 'SNAKE_PRESENCE_ANNOUNCE',
            senderTabId: this.tabId,
            username,
            displayName
        });
    }

    public getActiveOnlinePlayers(): { username: string; displayName: string }[] {
        const now = Date.now();
        const result: { username: string; displayName: string }[] = [];
        this.activeOnlinePlayers.forEach((info) => {
            if (now - info.lastSeen < 60000) {
                result.push({ username: info.username, displayName: info.displayName });
            }
        });
        return result;
    }

    private handleMessage(data: any): void {
        if (!data || typeof data !== 'object') return;
        if (data.senderTabId === this.tabId) return; // Ignore own outgoing broadcast

        switch (data.type) {
            case 'SNAKE_PRESENCE_PING': {
                const profile = getCurrentUserProfile();
                const username = profile?.username || 'Guest';
                const displayName = profile?.display_name || username;
                this.broadcastPayload({
                    type: 'SNAKE_PRESENCE_ANNOUNCE',
                    senderTabId: this.tabId,
                    username,
                    displayName
                });
                break;
            }
            case 'SNAKE_PRESENCE_ANNOUNCE': {
                if (data.username) {
                    this.activeOnlinePlayers.set(data.username.toLowerCase(), {
                        username: data.username,
                        displayName: data.displayName || data.username,
                        tabId: data.senderTabId,
                        lastSeen: Date.now()
                    });
                    if (this.onPresenceUpdatedCallback) {
                        this.onPresenceUpdatedCallback();
                    }
                }
                break;
            }
            case 'SNAKE_INVITE': {
                const invite: MultiplayerInvite = data.invite;
                if (!invite) return;

                this.incomingInvites.set(invite.fromUsername.toLowerCase(), invite);
                if (invite.fromDisplayName) {
                    this.incomingInvites.set(invite.fromDisplayName.toLowerCase(), invite);
                }

                // Check if BOTH players have sent an invite to each other!
                const isMutual = !!(this.pendingInviteId && this.activeOpponent && (
                    this.activeOpponent.toLowerCase() === invite.fromUsername.toLowerCase() ||
                    (invite.fromDisplayName && this.activeOpponent.toLowerCase() === invite.fromDisplayName.toLowerCase()) ||
                    this.activeOpponent.toLowerCase() === invite.toUsername.toLowerCase() ||
                    (invite.toUsername.toLowerCase() === 'guest' && this.activeOpponent.toLowerCase() === 'guest')
                ));

                if (isMutual) {
                    this.clearBotTimer();
                    this.pendingInviteId = null;
                    this.isConnected = true;
                    // Deterministic host: tab with smaller tabId becomes host
                    this.isHost = this.tabId < data.senderTabId;
                    this.activeOpponent = invite.fromDisplayName || invite.fromUsername;

                    // Send response back so the other tab also starts immediately
                    this.respondToInvite(invite, true);

                    // Launch game on this tab immediately
                    if (this.onInviteResponseCallback) {
                        this.onInviteResponseCallback(true, this.activeOpponent);
                    }
                    return;
                }

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
            case 'SNAKE_SERVER_UPDATE': {
                if (data.playerId && data.playerId !== this.tabId) {
                    this.activeRemotePlayers.set(data.playerId, {
                        id: data.playerId,
                        username: data.username || 'Mängija',
                        displayName: data.displayName || data.username || 'Mängija',
                        colorId: data.colorId || 'green',
                        theme: data.theme || getSnakeColorPreset(data.colorId || 'green'),
                        body: data.body || [],
                        direction: data.direction || 'LEFT',
                        score: data.score || 0,
                        isGameOver: !!data.isGameOver,
                        lastSeen: Date.now(),
                        isAi: false,
                        serverId: data.serverId || 'server_1'
                    } as any);

                    // Dynamic AI removal: if real players in my server >= 2 (remote player present), AI disappears!
                    const playersInMyServer = this.getPlayersInMyServer();
                    this.hasAiSnake = (playersInMyServer.length === 0);
                    if (!this.hasAiSnake) {
                        this.aiSnake = null;
                    }
                }
                break;
            }
        }
    }

    public assignServer(): { serverId: string; serverNumber: number } {
        const now = Date.now();
        this.activeRemotePlayers.forEach((p, id) => {
            if (now - p.lastSeen > 4500) {
                this.activeRemotePlayers.delete(id);
            }
        });

        // Find lowest server number with < 3 players
        let sNum = 1;
        while (true) {
            const sid = `server_${sNum}`;
            let count = 0;
            this.activeRemotePlayers.forEach(p => {
                if (p.id !== this.tabId && (p as any).serverId === sid) {
                    count++;
                }
            });
            if (count < this.MAX_PLAYERS_PER_SERVER) {
                this.currentServerId = sid;
                this.currentServerNumber = sNum;
                break;
            }
            sNum++;
        }

        const playersInMyServer = this.getPlayersInMyServer();
        this.hasAiSnake = (playersInMyServer.length === 0);
        if (!this.hasAiSnake) {
            this.aiSnake = null;
        }

        return { serverId: this.currentServerId, serverNumber: this.currentServerNumber };
    }

    public getPlayersInMyServer(): RemotePlayerInfo[] {
        const now = Date.now();
        const list: RemotePlayerInfo[] = [];
        this.activeRemotePlayers.forEach((p, id) => {
            if (id !== this.tabId && (p as any).serverId === this.currentServerId && (now - p.lastSeen < 4500)) {
                list.push(p);
            }
        });
        return list;
    }

    public getMyServerPlayerCount(): number {
        return this.getPlayersInMyServer().length + 1; // +1 for self
    }

    public broadcastMyServerState(data: {
        body: GridPoint[];
        direction: Direction;
        score: number;
        isGameOver: boolean;
        colorId: string;
        theme: any;
    }): void {
        const profile = getCurrentUserProfile();
        const username = profile?.username || 'Mängija';
        const displayName = profile?.display_name || username;

        const payload = {
            type: 'SNAKE_SERVER_UPDATE',
            serverId: this.currentServerId,
            playerId: this.tabId,
            username,
            displayName,
            colorId: data.colorId,
            theme: data.theme,
            body: data.body,
            direction: data.direction,
            score: data.score,
            isGameOver: data.isGameOver,
            senderTabId: this.tabId,
            timestamp: Date.now()
        };

        this.broadcastPayload(payload);
    }

    public resetAiSnake(cols: number = 30, rows: number = 22): RemotePlayerInfo | null {
        if (this.getPlayersInMyServer().length > 0) {
            this.hasAiSnake = false;
            this.aiSnake = null;
            return null;
        }
        const startX = cols - 6;
        const startY = rows - 6;
        const body: GridPoint[] = [];
        for (let i = 0; i < 4; i++) {
            body.push({ x: (startX + i) % cols, y: startY });
        }
        this.aiSnake = {
            id: `ai_bot_${this.currentServerId}`,
            username: 'AI_Uss',
            displayName: '🤖 AI Uss',
            colorId: 'purple',
            theme: getSnakeColorPreset('purple'),
            body,
            direction: 'LEFT',
            score: 0,
            isGameOver: false,
            lastSeen: Date.now(),
            isAi: true
        };
        this.aiDirection = 'LEFT';
        this.hasAiSnake = true;
        return this.aiSnake;
    }

    public updateAiSnake(
        demoAi: DemoAiSystem,
        foodItems: FoodItem[],
        cols: number,
        rows: number
    ): RemotePlayerInfo | null {
        // If 2 or more real players are in this server, AI disappears!
        const myServerRealPlayers = this.getPlayersInMyServer();
        if (myServerRealPlayers.length > 0) {
            this.hasAiSnake = false;
            this.aiSnake = null;
            return null;
        }

        // If only 1 real player, 1 AI snake is active!
        this.hasAiSnake = true;
        if (!this.aiSnake || this.aiSnake.body.length === 0 || this.aiSnake.isGameOver) {
            this.resetAiSnake(cols, rows);
            if (!this.aiSnake) return null;
        }

        // Steer AI towards food
        this.aiDirection = demoAi.getNextDirection(this.aiSnake.body, this.aiDirection, foodItems);
        this.aiSnake.direction = this.aiDirection;

        const head = this.aiSnake.body[0];
        let newX = head.x;
        let newY = head.y;
        switch (this.aiDirection) {
            case 'UP': newY -= 1; break;
            case 'DOWN': newY += 1; break;
            case 'LEFT': newX -= 1; break;
            case 'RIGHT': newX += 1; break;
        }

        // Screen wrap-around for AI
        if (newX < 0) newX = cols - 1;
        else if (newX >= cols) newX = 0;
        if (newY < 0) newY = rows - 1;
        else if (newY >= rows) newY = 0;

        // Check self-collision: if AI hits its own body, respawn fresh with 4 segments!
        const selfHit = this.aiSnake.body.slice(1).some(seg => seg.x === newX && seg.y === newY);
        if (selfHit) {
            this.resetAiSnake(cols, rows);
            return this.aiSnake;
        }

        // Advance AI body
        this.aiSnake.body.unshift({ x: newX, y: newY });
        const ateFoodIndex = foodItems.findIndex(f => f.x === newX && f.y === newY);
        if (ateFoodIndex !== -1) {
            this.aiSnake.score += foodItems[ateFoodIndex].points;
            foodItems.splice(ateFoodIndex, 1);
        } else {
            this.aiSnake.body.pop();
        }

        return this.aiSnake;
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

        // Check if the other player ALREADY sent us an invite!
        // If so, both have now sent an invite ("kui mõlemad saadavad kutse siis läheb mäng ussimängus käima")!
        const existingIncoming = this.incomingInvites.get(toUsername.toLowerCase()) ||
            Array.from(this.incomingInvites.values()).find(inv =>
                inv.fromUsername.toLowerCase() === toUsername.toLowerCase() ||
                (inv.fromDisplayName && inv.fromDisplayName.toLowerCase() === toUsername.toLowerCase()) ||
                (toUsername.toLowerCase() === 'guest' && inv.fromUsername.toLowerCase() === 'guest')
            );

        if (existingIncoming) {
            this.clearBotTimer();
            this.pendingInviteId = null;
            this.isConnected = true;
            this.isHost = false; // Other player who sent earlier is host, we are guest
            this.activeOpponent = existingIncoming.fromDisplayName || existingIncoming.fromUsername;

            // Respond accepted to the other player so their game starts
            this.respondToInvite(existingIncoming, true);

            // Launch our game immediately!
            if (this.onInviteResponseCallback) {
                this.onInviteResponseCallback(true, this.activeOpponent);
            }

            return existingIncoming;
        }

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
