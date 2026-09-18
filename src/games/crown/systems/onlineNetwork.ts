import { supabase } from '../../../lib/supabase';
import { ChatMessage, PlayerProgress, RemotePlayerState } from '../types';
import { GameState } from '../state/gameState';

const CHAT_STORAGE_KEY = 'playard_crown_chat_v1';
const BROADCAST_CHANNEL_NAME = 'playard_crown_global_chat_channel';
const SUPABASE_CHANNEL_NAME = 'crown_global_lobby_v1';

export class CrownOnlineNetwork {
    private gameState: GameState;
    private supabaseChannel: any = null;
    private localBroadcast: BroadcastChannel | null = null;
    private playerId: string;
    private isConnected: boolean = false;

    private onPlayerStateCallbacks: ((state: RemotePlayerState) => void)[] = [];
    private onPlayerLeaveCallbacks: ((playerId: string) => void)[] = [];

    constructor(gameState: GameState) {
        this.gameState = gameState;
        this.playerId = 'p_' + Math.random().toString(36).substring(2, 9);
        this.init();
    }

    public getPlayerId(): string {
        return this.playerId;
    }

    public onRemotePlayerState(cb: (state: RemotePlayerState) => void) {
        this.onPlayerStateCallbacks.push(cb);
    }

    public onRemotePlayerLeave(cb: (playerId: string) => void) {
        this.onPlayerLeaveCallbacks.push(cb);
    }

    private dispatchPlayerState(state: RemotePlayerState) {
        this.onPlayerStateCallbacks.forEach((cb) => {
            try { cb(state); } catch (e) {}
        });
    }

    private dispatchPlayerLeave(playerId: string) {
        this.onPlayerLeaveCallbacks.forEach((cb) => {
            try { cb(playerId); } catch (e) {}
        });
    }

    private init() {
        this.initBroadcastChannel();
        this.initStorageListener();
        this.initSupabaseRealtime();
    }

    // 1. Cross-tab instant sync on same PC / browser (0ms latency)
    private initBroadcastChannel() {
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                this.localBroadcast = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
                this.localBroadcast.onmessage = (event) => {
                    const data = event.data;
                    if (!data || !data.type) return;

                    if (data.type === 'chat_message' && data.payload) {
                        this.gameState.receiveOnlineMessage(data.payload);
                    } else if (data.type === 'request_history') {
                        const msgs = this.gameState.getChatMessages();
                        if (msgs.length > 0) {
                            this.localBroadcast?.postMessage({
                                type: 'history_sync',
                                payload: msgs
                            });
                        }
                    } else if (data.type === 'history_sync' && Array.isArray(data.payload)) {
                        this.gameState.mergeHistory(data.payload);
                    } else if (data.type === 'player_progress' && data.payload) {
                        if (data.payload.id !== this.playerId) {
                            this.gameState.updateRemotePlayerProgress(data.payload);
                        }
                    } else if (data.type === 'player_state' && data.payload) {
                        if (data.payload.id !== this.playerId) {
                            this.dispatchPlayerState(data.payload);
                        }
                    } else if (data.type === 'player_leave' && data.payload) {
                        if (data.payload.id !== this.playerId) {
                            this.dispatchPlayerLeave(data.payload.id);
                        }
                    }
                };

                // Request history from other open tabs
                this.localBroadcast.postMessage({
                    type: 'request_history',
                    requesterId: this.playerId
                });
            } catch (e) {
                console.warn('BroadcastChannel error:', e);
            }
        }
    }

    // 2. Storage event listener fallback for cross-tab sync
    private initStorageListener() {
        if (typeof window !== 'undefined') {
            window.addEventListener('storage', (e) => {
                if (e.key === CHAT_STORAGE_KEY && e.newValue) {
                    try {
                        const parsed = JSON.parse(e.newValue);
                        if (Array.isArray(parsed)) {
                            this.gameState.syncChatFromStorage(parsed);
                        }
                    } catch (err) {}
                }
            });
        }
    }

    // 3. Supabase Realtime WebSocket (Global internet-wide multiplayer & chat sync)
    private initSupabaseRealtime() {
        if (!supabase) return;
        try {
            this.supabaseChannel = supabase.channel(SUPABASE_CHANNEL_NAME, {
                config: {
                    broadcast: { self: false },
                    presence: { key: this.playerId }
                }
            });

            this.supabaseChannel
                // Receive real-time chat messages from any other real player online
                .on('broadcast', { event: 'chat_message' }, ({ payload }: any) => {
                    if (payload && payload.id && payload.text) {
                        this.gameState.receiveOnlineMessage(payload);
                    }
                })
                // History exchange
                .on('broadcast', { event: 'request_history' }, ({ payload }: any) => {
                    if (payload && payload.requesterId !== this.playerId) {
                        const msgs = this.gameState.getChatMessages();
                        if (msgs.length > 0) {
                            this.supabaseChannel?.send({
                                type: 'broadcast',
                                event: 'history_sync',
                                payload: msgs
                            });
                        }
                    }
                })
                .on('broadcast', { event: 'history_sync' }, ({ payload }: any) => {
                    if (Array.isArray(payload)) {
                        this.gameState.mergeHistory(payload);
                    }
                })
                // Receive real-time player progress from other online players
                .on('broadcast', { event: 'player_progress' }, ({ payload }: any) => {
                    if (payload && payload.id && payload.id !== this.playerId) {
                        this.gameState.updateRemotePlayerProgress(payload);
                    }
                })
                // Receive real-time 3D player movement / state from other online players
                .on('broadcast', { event: 'player_state' }, ({ payload }: any) => {
                    if (payload && payload.id && payload.id !== this.playerId) {
                        this.dispatchPlayerState(payload);
                    }
                })
                // Player disconnected / left
                .on('broadcast', { event: 'player_leave' }, ({ payload }: any) => {
                    if (payload && payload.id && payload.id !== this.playerId) {
                        this.dispatchPlayerLeave(payload.id);
                    }
                })
                // Presence synchronization (Who is currently online)
                .on('presence', { event: 'sync' }, () => {
                    const state = this.supabaseChannel.presenceState();
                    const players: PlayerProgress[] = [];
                    Object.values(state).forEach((items: any) => {
                        if (Array.isArray(items)) {
                            items.forEach((item: any) => {
                                if (item && item.id && item.id !== this.playerId) {
                                    players.push({
                                        id: item.id,
                                        name: item.name || 'Player',
                                        isOwner: !!item.isOwner,
                                        stage: item.stage || 1,
                                        percentage: item.percentage || 2,
                                        isFinished: !!item.isFinished
                                    });
                                }
                            });
                        }
                    });

                    // Total online count = remote players + local player
                    const totalOnline = players.length + 1;
                    this.gameState.setOnlineCount(totalOnline);
                    this.gameState.updateOnlinePlayers(players);
                })
                .subscribe(async (status: string) => {
                    if (status === 'SUBSCRIBED') {
                        this.isConnected = true;
                        await this.trackPresence();

                        // Request chat history from online players
                        try {
                            this.supabaseChannel.send({
                                type: 'broadcast',
                                event: 'request_history',
                                payload: { requesterId: this.playerId }
                            });
                        } catch (e) {}
                    }
                });

            window.addEventListener('beforeunload', () => {
                this.destroy();
            });
        } catch (err) {
            console.warn('Supabase Realtime init warning:', err);
        }
    }

    public async trackPresence() {
        if (!this.supabaseChannel || !this.isConnected) return;
        try {
            await this.supabaseChannel.track({
                id: this.playerId,
                name: this.gameState.getPlayerName(),
                isOwner: this.gameState.getIsOwner(),
                stage: this.gameState.getStage(),
                percentage: this.gameState.getPercentage(),
                isFinished: this.gameState.isGameWon(),
                onlineAt: new Date().toISOString()
            });
        } catch (e) {}
    }

    // Broadcast a new chat message sent by the local player
    public broadcastChatMessage(msg: ChatMessage) {
        // 1. Cross-tab local broadcast
        try {
            this.localBroadcast?.postMessage({
                type: 'chat_message',
                payload: msg
            });
        } catch (e) {}

        // 2. Global Supabase Realtime broadcast across the internet
        if (this.supabaseChannel && this.isConnected) {
            try {
                this.supabaseChannel.send({
                    type: 'broadcast',
                    event: 'chat_message',
                    payload: msg
                });
            } catch (e) {
                console.warn('Could not broadcast chat message via Supabase:', e);
            }
        }
    }

    // Broadcast real-time 3D player position & animation state to other players
    public broadcastPlayerState(state: RemotePlayerState) {
        // 1. Cross-tab local broadcast
        try {
            this.localBroadcast?.postMessage({
                type: 'player_state',
                payload: state
            });
        } catch (e) {}

        // 2. Supabase Realtime broadcast
        if (this.supabaseChannel && this.isConnected) {
            try {
                this.supabaseChannel.send({
                    type: 'broadcast',
                    event: 'player_state',
                    payload: state
                });
            } catch (e) {}
        }
    }

    // Broadcast player progress updates
    public broadcastProgress(stage: number, percentage: number, isFinished: boolean) {
        this.trackPresence();
        const payload: PlayerProgress = {
            id: this.playerId,
            name: this.gameState.getPlayerName(),
            isOwner: this.gameState.getIsOwner(),
            stage,
            percentage,
            isFinished
        };

        try {
            this.localBroadcast?.postMessage({
                type: 'player_progress',
                payload
            });
        } catch (e) {}

        if (this.supabaseChannel && this.isConnected) {
            try {
                this.supabaseChannel.send({
                    type: 'broadcast',
                    event: 'player_progress',
                    payload
                });
            } catch (e) {}
        }
    }

    // Broadcast player leave
    public broadcastPlayerLeave() {
        const payload = { id: this.playerId };
        try {
            this.localBroadcast?.postMessage({
                type: 'player_leave',
                payload
            });
        } catch (e) {}

        if (this.supabaseChannel && this.isConnected) {
            try {
                this.supabaseChannel.send({
                    type: 'broadcast',
                    event: 'player_leave',
                    payload
                });
            } catch (e) {}
        }
    }

    public destroy() {
        this.broadcastPlayerLeave();
        try {
            this.localBroadcast?.close();
            this.supabaseChannel?.unsubscribe();
        } catch (e) {}
    }
}
