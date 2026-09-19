import { MapId } from '../types';
import { MmpOnlineNetwork, MmpActionEvent } from './mmpOnlineNetwork';
import { MmpRosterManager } from './mmpRosterManager';
import { RoundManager } from '../world/roundManager';

export interface SyncSystemHostGame {
    state: string;
    lobbyCountdown: number;
    adminForcedRole: any;
    characters: any[];
    startMapVoting: () => void;
    startRound: (map?: MapId, forcedRoles?: { murdererId?: string; sheriffId?: string }) => void;
}

export class MmpSyncSystem {
    private game: SyncSystemHostGame;
    private onlineNetwork: MmpOnlineNetwork;
    private rosterManager: MmpRosterManager;
    private roundManager: RoundManager;

    public lobbyEndTime: number = 0;
    public mapVoteEndTime: number = 0;
    private lastSyncBroadcast: number = 0;
    private votingTransitioned: boolean = false;
    private roundTransitioned: boolean = false;

    constructor(
        game: SyncSystemHostGame,
        onlineNetwork: MmpOnlineNetwork,
        rosterManager: MmpRosterManager,
        roundManager: RoundManager
    ) {
        this.game = game;
        this.onlineNetwork = onlineNetwork;
        this.rosterManager = rosterManager;
        this.roundManager = roundManager;

        this.initNetworkListeners();
    }

    public isHost(): boolean {
        const localId = this.onlineNetwork.getPlayerId();
        const remoteIds = this.rosterManager.getRemotePlayerIds();
        if (!remoteIds || remoteIds.length === 0) return true;
        const allIds = [localId, ...remoteIds].sort();
        return allIds[0] === localId;
    }

    private initNetworkListeners() {
        this.onlineNetwork.onRemotePlayerAction((e: MmpActionEvent) => {
            if (!e || !e.action) return;

            if (e.action === 'lobby_sync' && e.payload?.lobbyEndTime) {
                if (this.game.state === 'lobby') {
                    this.lobbyEndTime = e.payload.lobbyEndTime;
                }
            } else if (e.action === 'start_map_vote') {
                if (this.game.state === 'lobby') {
                    this.mapVoteEndTime = e.payload?.voteEndTime || (Date.now() + 8000);
                    this.votingTransitioned = true;
                    this.game.startMapVoting();
                }
            } else if (e.action === 'vote_map' && e.payload?.mapId) {
                if (this.game.state === 'map_vote') {
                    this.roundManager.registerRemoteVote(e.payload.mapId);
                }
            } else if (e.action === 'start_round') {
                if (this.game.state === 'map_vote' || this.game.state === 'lobby') {
                    const { winningMap, murdererId, sheriffId } = e.payload || {};
                    this.roundTransitioned = true;
                    this.game.startRound(winningMap, { murdererId, sheriffId });
                }
            } else if (e.action === 'return_lobby' && e.payload?.lobbyEndTime) {
                this.lobbyEndTime = e.payload.lobbyEndTime;
                this.votingTransitioned = false;
                this.roundTransitioned = false;
            }
        });
    }

    public resetForLobby() {
        this.votingTransitioned = false;
        this.roundTransitioned = false;
        this.lobbyEndTime = Date.now() + 40000;
        this.mapVoteEndTime = 0;
    }

    public update(delta: number) {
        const now = Date.now();

        if (this.game.state === 'lobby') {
            this.roundTransitioned = false;
            const CYCLE_MS = 40000;
            if (!this.lobbyEndTime) {
                this.lobbyEndTime = Math.ceil(now / CYCLE_MS) * CYCLE_MS;
                if (this.lobbyEndTime - now < 5000) {
                    this.lobbyEndTime += CYCLE_MS;
                }
            }

            const remainingSec = (this.lobbyEndTime - now) / 1000;
            this.game.lobbyCountdown = Math.max(0, remainingSec);

            const lobbySec = document.getElementById('lobby-countdown-sec');
            if (lobbySec) {
                lobbySec.textContent = Math.max(0, Math.ceil(remainingSec)) + 's';
            }

            if (this.isHost() && now - this.lastSyncBroadcast > 3000) {
                this.lastSyncBroadcast = now;
                this.onlineNetwork.broadcastAction('lobby_sync', { lobbyEndTime: this.lobbyEndTime });
            }

            if (remainingSec <= 0 && !this.votingTransitioned) {
                this.votingTransitioned = true;
                this.lobbyEndTime = 0;
                const voteDurationMs = 6000;
                this.mapVoteEndTime = now + voteDurationMs;
                if (this.isHost()) {
                    this.onlineNetwork.broadcastAction('start_map_vote', { voteEndTime: this.mapVoteEndTime });
                }
                this.game.startMapVoting();
            }
        } else if (this.game.state === 'map_vote') {
            this.votingTransitioned = false;
            if (!this.mapVoteEndTime) {
                this.mapVoteEndTime = now + 6000;
            }

            const remainingVote = (this.mapVoteEndTime - now) / 1000;
            this.roundManager.mapVoteCountdown = Math.max(0, remainingVote);

            const mapTimer = document.getElementById('map-vote-timer');
            if (mapTimer) {
                mapTimer.textContent = Math.max(0, Math.ceil(remainingVote)) + 's';
            }

            if (remainingVote <= 0 && !this.roundTransitioned) {
                this.roundTransitioned = true;
                this.mapVoteEndTime = 0;
                const winningMap = this.roundManager.finishMapVoting();
                const roles = this.assignRolesSynchronized();
                if (this.isHost()) {
                    this.onlineNetwork.broadcastAction('start_round', {
                        winningMap,
                        murdererId: roles.murdererId,
                        sheriffId: roles.sheriffId
                    });
                }
                this.game.startRound(winningMap, roles);
            }
        }
    }

    public assignRolesSynchronized(): { murdererId: string; sheriffId: string } {
        const characters = this.game.characters || [];
        const localId = this.onlineNetwork.getPlayerId();
        const charIds = characters.map(c => {
            if (c.isPlayer) return localId;
            if (c.isRemotePlayer) return c.remotePlayerId || c.id;
            return c.id;
        });

        const adminRole = this.game.adminForcedRole;
        if (adminRole) {
            const otherIds = charIds.filter(id => id !== localId);
            const shuffledOthers = [...otherIds].sort(() => Math.random() - 0.5);
            if (adminRole === 'murderer') {
                return { murdererId: localId, sheriffId: shuffledOthers[0] || localId };
            } else if (adminRole === 'sheriff') {
                return { murdererId: shuffledOthers[0] || localId, sheriffId: localId };
            } else {
                return { murdererId: shuffledOthers[0] || localId, sheriffId: shuffledOthers[1] || localId };
            }
        }

        const shuffled = [...charIds].sort(() => Math.random() - 0.5);
        const murdererId = shuffled[0] || localId;
        const sheriffCandidate = shuffled.find(id => id !== murdererId) || localId;
        return { murdererId, sheriffId: sheriffCandidate };
    }
}
