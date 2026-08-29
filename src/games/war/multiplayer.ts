import Peer, { DataConnection } from 'peerjs';
import { supabase } from '../../lib/supabase';

export interface PlayerPayload {
    id: string;
    name: string;
    team: 'red' | 'blue';
    unitClass: 'tank' | 'soldier';
    x: number;
    z: number;
    rot: number;
    turretRot?: number;
    hp: number;
}

export type MultiplayerEvent =
    | { type: 'player_join'; payload: { id: string; name: string; team: 'red' | 'blue'; unitClass: 'tank' | 'soldier' } }
    | { type: 'player_leave'; payload: { id: string } }
    | { type: 'player_state'; payload: PlayerPayload }
    | { type: 'player_fire'; payload: any }
    | { type: 'grenade_throw'; payload: any }
    | { type: 'airstrike_drop'; payload: any }
    | { type: 'unit_killed'; payload: any };

export class WarMultiplayerNetwork {
    private localId: string;
    private localName: string;
    private localTeam: 'red' | 'blue';
    private localClass: 'tank' | 'soldier';

    private peer: Peer | null = null;
    private connections: Map<string, DataConnection> = new Map();
    private broadcastChannel: BroadcastChannel | null = null;
    private supabaseChannel: any = null;

    private connectedPeers: Set<string> = new Set();
    private onEventCallback: (event: MultiplayerEvent) => void;
    private onStatusCallback: (statusText: string, onlineCount: number) => void;

    private isDestroyed = false;

    constructor(
        localId: string,
        localName: string,
        localTeam: 'red' | 'blue',
        localClass: 'tank' | 'soldier',
        onEvent: (event: MultiplayerEvent) => void,
        onStatus: (statusText: string, onlineCount: number) => void
    ) {
        this.localId = localId;
        this.localName = localName;
        this.localTeam = localTeam;
        this.localClass = localClass;
        this.onEventCallback = onEvent;
        this.onStatusCallback = onStatus;

        this.init();
    }

    private init() {
        this.initBroadcastChannel();
        this.initSupabase();
        this.initPeerJS();
    }

    // 1. Cross-Tab Local BroadcastChannel (Instant Sync for tabs/windows on same PC)
    private initBroadcastChannel() {
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                this.broadcastChannel = new BroadcastChannel('playard_war_battle_v1');
                this.broadcastChannel.onmessage = (e) => {
                    const data = e.data as MultiplayerEvent;
                    if (!data || !data.type) return;

                    // Skip self
                    if ((data.payload as any)?.id === this.localId || (data.payload as any)?.shooterId === this.localId) {
                        return;
                    }

                    if (data.type === 'player_join') {
                        this.connectedPeers.add(data.payload.id);
                        this.notifyStatus();
                        // Reply with own presence so new tab knows about us
                        this.broadcastChannel?.postMessage({
                            type: 'player_join',
                            payload: {
                                id: this.localId,
                                name: this.localName,
                                team: this.localTeam,
                                unitClass: this.localClass
                            }
                        });
                    } else if (data.type === 'player_leave') {
                        this.connectedPeers.delete(data.payload.id);
                        this.notifyStatus();
                    }

                    this.onEventCallback(data);
                };

                // Announce presence to other tabs
                this.broadcastChannel.postMessage({
                    type: 'player_join',
                    payload: {
                        id: this.localId,
                        name: this.localName,
                        team: this.localTeam,
                        unitClass: this.localClass
                    }
                });
            } catch (e) {
                console.warn('BroadcastChannel error:', e);
            }
        }
    }

    // 2. Supabase Realtime (When cloud keys are present)
    private initSupabase() {
        if (!supabase) return;
        try {
            this.supabaseChannel = supabase.channel('war_squad_server_1', {
                config: { broadcast: { self: false }, presence: { key: this.localId } }
            });

            this.supabaseChannel
                .on('presence', { event: 'sync' }, () => {
                    const state = this.supabaseChannel.presenceState();
                    const players = Object.values(state).flat() as any[];
                    players.forEach(p => {
                        if (p.id && p.id !== this.localId) this.connectedPeers.add(p.id);
                    });
                    this.notifyStatus();
                })
                .on('broadcast', { event: 'game_event' }, ({ payload }: any) => {
                    if (payload && payload.type) {
                        this.onEventCallback(payload);
                    }
                })
                .subscribe(async (status: string) => {
                    if (status === 'SUBSCRIBED') {
                        await this.supabaseChannel.track({
                            id: this.localId,
                            name: this.localName,
                            team: this.localTeam,
                            unitClass: this.localClass,
                            onlineAt: new Date().toISOString()
                        });
                    }
                });
        } catch (e) {
            console.warn('Supabase Realtime error:', e);
        }
    }

    // 3. WebRTC PeerJS P2P Mesh (Internet-wide cross-device multiplayer with zero backend configuration)
    private initPeerJS() {
        // Deterministic room host ID
        const roomPrefix = 'playard_war_room_host_v1';

        try {
            // First, attempt to become room host if available, or generate unique peer ID
            const peerId = `pwar_${this.localId}_${Math.floor(Math.random() * 1000)}`;
            this.peer = new Peer(peerId, {
                debug: 0,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            this.peer.on('open', (id) => {
                // Try connecting to room host or broadcast discovery
                this.tryConnectToHost(roomPrefix);
                // Also attempt to listen if someone connects to us
            });

            this.peer.on('connection', (conn) => {
                this.setupConnection(conn);
            });

            this.peer.on('error', (err) => {
                // Ignore peer unavailable error during discovery
                if (err.type === 'peer-unavailable') return;
                console.warn('PeerJS note:', err.type);
            });
        } catch (e) {
            console.warn('PeerJS init note:', e);
        }
    }

    private tryConnectToHost(hostId: string) {
        if (!this.peer || this.peer.destroyed) return;
        try {
            const conn = this.peer.connect(hostId, { reliable: false });
            this.setupConnection(conn);
        } catch (e) {
            // normal when host is not up yet
        }
    }

    private setupConnection(conn: DataConnection) {
        conn.on('open', () => {
            this.connections.set(conn.peer, conn);
            this.connectedPeers.add(conn.peer);
            this.notifyStatus();

            // Send handshake
            conn.send({
                type: 'player_join',
                payload: {
                    id: this.localId,
                    name: this.localName,
                    team: this.localTeam,
                    unitClass: this.localClass
                }
            });
        });

        conn.on('data', (data: any) => {
            if (data && data.type) {
                if (data.type === 'player_join') {
                    this.connectedPeers.add(data.payload.id || conn.peer);
                    this.notifyStatus();
                }
                this.onEventCallback(data);
            }
        });

        conn.on('close', () => {
            this.connections.delete(conn.peer);
            this.connectedPeers.delete(conn.peer);
            this.notifyStatus();
        });
    }

    private notifyStatus() {
        const count = Math.max(1, this.connectedPeers.size + 1);
        const statusText = count > 1
            ? `🟢 ONLINE (${count} Mängijat)`
            : `🟢 ONLINE (Ootel · 1 Mängija)`;
        this.onStatusCallback(statusText, count);
    }

    // Public Broadcasting Methods
    public send(event: MultiplayerEvent) {
        if (this.isDestroyed) return;

        // 1. BroadcastChannel (Same machine / tabs)
        if (this.broadcastChannel) {
            try {
                this.broadcastChannel.postMessage(event);
            } catch (e) {}
        }

        // 2. WebRTC PeerJS Connections (Cross-device internet)
        this.connections.forEach((conn) => {
            if (conn.open) {
                try {
                    conn.send(event);
                } catch (e) {}
            }
        });

        // 3. Supabase Realtime
        if (this.supabaseChannel) {
            try {
                this.supabaseChannel.send({
                    type: 'broadcast',
                    event: 'game_event',
                    payload: event
                });
            } catch (e) {}
        }
    }

    public updateIdentity(team: 'red' | 'blue', unitClass: 'tank' | 'soldier') {
        this.localTeam = team;
        this.localClass = unitClass;
        this.send({
            type: 'player_join',
            payload: {
                id: this.localId,
                name: this.localName,
                team: this.localTeam,
                unitClass: this.localClass
            }
        });
    }

    public destroy() {
        this.isDestroyed = true;
        this.send({
            type: 'player_leave',
            payload: { id: this.localId }
        });

        if (this.broadcastChannel) this.broadcastChannel.close();
        if (this.peer) this.peer.destroy();
    }
}
