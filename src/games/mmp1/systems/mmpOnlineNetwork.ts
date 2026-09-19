import { supabase } from '../../../lib/supabase';
import { isTestMode } from '../../../auth';

export interface MmpPlayerState {
    id: string;
    name: string;
    isOwner: boolean;
    x: number;
    y: number;
    z: number;
    rotY: number;
    isMoving: boolean;
    isAlive: boolean;
    hasWeaponEquipped: boolean;
    role: 'murderer' | 'sheriff' | 'innocent';
    coins: number;
    action?: string;
    avatarConfig?: any;
}

export interface MmpActionEvent {
    id: string;
    action: 'slash' | 'shoot' | 'vote_map' | 'pickup_gun' | 'lobby_sync' | 'start_map_vote' | 'start_round' | 'return_lobby' | 'end_round';
    payload?: any;
}

export class MmpOnlineNetwork {
    private localPlayerId: string;
    private localUsername: string;
    private isOwner: boolean = false;
    private supabaseChannel: any = null;
    private localBroadcast: BroadcastChannel | null = null;
    private heartbeatTimer: any = null;
    private lastSentState: MmpPlayerState | null = null;
    private isConnected: boolean = false;

    private onPlayerStateCbs: ((s: MmpPlayerState) => void)[] = [];
    private onPlayerLeaveCbs: ((id: string) => void)[] = [];
    private onPlayerActionCbs: ((e: MmpActionEvent) => void)[] = [];
    private onPresenceSyncCbs: ((onlineCount: number, playerIds: string[]) => void)[] = [];

    constructor(playerId: string, username: string, isOwner: boolean) {
        this.localPlayerId = playerId;
        this.localUsername = username;
        this.isOwner = isOwner;
        this.init();
    }

    public getPlayerId(): string {
        return this.localPlayerId;
    }

    public onRemotePlayerState(cb: (s: MmpPlayerState) => void) { this.onPlayerStateCbs.push(cb); }
    public onRemotePlayerLeave(cb: (id: string) => void) { this.onPlayerLeaveCbs.push(cb); }
    public onRemotePlayerAction(cb: (e: MmpActionEvent) => void) { this.onPlayerActionCbs.push(cb); }
    public onPresenceSync(cb: (onlineCount: number, playerIds: string[]) => void) { this.onPresenceSyncCbs.push(cb); }

    private init() {
        this.initBroadcastChannel();
        this.initSupabase();

        // 600ms continuous heartbeat
        this.heartbeatTimer = setInterval(() => {
            if (this.lastSentState) {
                this.broadcastPlayerState(this.lastSentState);
            }
        }, 600);
    }

    // 1. Cross-tab instant communication (0ms latency on same device / browser)
    private initBroadcastChannel() {
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                this.localBroadcast = new BroadcastChannel('playard_mmp1_channel_v1');
                this.localBroadcast.onmessage = (event) => {
                    const data = event.data;
                    if (!data || !data.type) return;

                    if (data.type === 'player_state' && data.payload) {
                        if (data.payload.id !== this.localPlayerId) {
                            this.dispatchPlayerState(data.payload);
                        }
                    } else if (data.type === 'player_leave' && data.payload) {
                        if (data.payload.id !== this.localPlayerId) {
                            this.dispatchPlayerLeave(data.payload.id);
                        }
                    } else if (data.type === 'player_action' && data.payload) {
                        if (data.payload.id !== this.localPlayerId) {
                            this.dispatchPlayerAction(data.payload);
                        }
                    }
                };
            } catch (e) {
                console.warn('MMP1 BroadcastChannel init error:', e);
            }
        }
    }

    // 2. Supabase Realtime WebSocket (Global internet multiplayer)
    private initSupabase() {
        if (!supabase || isTestMode()) return;
        try {
            this.supabaseChannel = supabase.channel('mmp1_global_channel_v1', {
                config: {
                    broadcast: { self: false },
                    presence: { key: this.localPlayerId }
                }
            });

            this.supabaseChannel
                .on('broadcast', { event: 'player_state' }, ({ payload }: any) => {
                    if (payload && payload.id && payload.id !== this.localPlayerId) {
                        this.dispatchPlayerState(payload);
                    }
                })
                .on('broadcast', { event: 'player_leave' }, ({ payload }: any) => {
                    if (payload && payload.id && payload.id !== this.localPlayerId) {
                        this.dispatchPlayerLeave(payload.id);
                    }
                })
                .on('broadcast', { event: 'player_action' }, ({ payload }: any) => {
                    if (payload && payload.id && payload.id !== this.localPlayerId) {
                        this.dispatchPlayerAction(payload);
                    }
                })
                .on('presence', { event: 'sync' }, () => {
                    const state = this.supabaseChannel.presenceState();
                    const ids: string[] = [];
                    Object.values(state).forEach((items: any) => {
                        if (Array.isArray(items)) {
                            items.forEach((item: any) => {
                                if (item && item.id && item.id !== this.localPlayerId) {
                                    ids.push(item.id);
                                }
                            });
                        }
                    });
                    const totalOnline = ids.length + 1;
                    this.onPresenceSyncCbs.forEach(cb => {
                        try { cb(totalOnline, ids); } catch (e) {}
                    });
                })
                .subscribe(async (status: string) => {
                    if (status === 'SUBSCRIBED') {
                        this.isConnected = true;
                        try {
                            await this.supabaseChannel.track({
                                id: this.localPlayerId,
                                name: this.localUsername,
                                isOwner: this.isOwner,
                                joinedAt: new Date().toISOString()
                            });
                        } catch (e) {}
                    }
                });

            window.addEventListener('beforeunload', () => {
                this.destroy();
            });
        } catch (e) {
            console.warn('MMP1 Supabase Realtime init error:', e);
        }
    }

    public broadcastPlayerState(state: MmpPlayerState) {
        this.lastSentState = state;
        try {
            this.localBroadcast?.postMessage({
                type: 'player_state',
                payload: state
            });
        } catch (e) {}

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

    public broadcastAction(action: 'slash' | 'shoot' | 'vote_map' | 'pickup_gun' | 'lobby_sync' | 'start_map_vote' | 'start_round' | 'return_lobby', payload?: any) {
        const evt: MmpActionEvent = {
            id: this.localPlayerId,
            action,
            payload
        };
        try {
            this.localBroadcast?.postMessage({
                type: 'player_action',
                payload: evt
            });
        } catch (e) {}

        if (this.supabaseChannel && this.isConnected) {
            try {
                this.supabaseChannel.send({
                    type: 'broadcast',
                    event: 'player_action',
                    payload: evt
                });
            } catch (e) {}
        }
    }

    private dispatchPlayerState(state: MmpPlayerState) {
        this.onPlayerStateCbs.forEach(cb => {
            try { cb(state); } catch (e) {}
        });
    }

    private dispatchPlayerLeave(id: string) {
        this.onPlayerLeaveCbs.forEach(cb => {
            try { cb(id); } catch (e) {}
        });
    }

    public dispatchPlayerAction(evt: MmpActionEvent) {
        this.onPlayerActionCbs.forEach(cb => {
            try { cb(evt); } catch (e) {}
        });
    }

    public destroy() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }

        const leaveEvent = { id: this.localPlayerId };
        try {
            this.localBroadcast?.postMessage({ type: 'player_leave', payload: leaveEvent });
            this.localBroadcast?.close();
        } catch (e) {}

        if (this.supabaseChannel) {
            try {
                this.supabaseChannel.send({
                    type: 'broadcast',
                    event: 'player_leave',
                    payload: leaveEvent
                });
                this.supabaseChannel.unsubscribe();
            } catch (e) {}
            this.supabaseChannel = null;
        }
        this.isConnected = false;
    }
}
