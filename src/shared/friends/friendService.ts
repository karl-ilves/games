import { getLocalProfiles, getCurrentUserProfile } from '../../auth';
import { supabase } from '../../lib/supabase';

export interface Friend {
    username: string;
    displayName: string;
    avatarColor?: string;
    isOnline?: boolean;
    status?: string;
}

export interface FriendRequest {
    id: string;
    fromUsername: string;
    fromDisplayName: string;
    fromColor?: string;
    toUsername: string;
    timestamp: number;
}

export interface PlayerSearchResult {
    username: string;
    displayName: string;
    color?: string;
    isFriend: boolean;
    hasPendingOutgoing: boolean;
    hasPendingIncoming: boolean;
}

function getPlayerColor(username: string): string {
    const colors = ['#3498db', '#e67e22', '#9b59b6', '#1abc9c', '#e74c3c', '#0be881', '#00f2fe', '#f39c12', '#fd79a8'];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

export class FriendService {
    private cachedSupabasePlayers: { username: string; displayName: string; color: string }[] = [];
    private broadcastChannel: BroadcastChannel | null = null;
    private supabaseChannel: any = null;

    constructor() {
        this.fetchSupabaseProfiles();
        this.initSyncChannels();
        if (typeof window !== 'undefined') {
            window.addEventListener('playard_game_played', (evt: any) => {
                try {
                    const game = evt.detail;
                    const profile = getCurrentUserProfile();
                    if (profile && profile.username && game) {
                        this.setPlayerActiveGame(profile.username, {
                            id: game.id,
                            title: game.title,
                            url: game.url
                        });
                    }
                } catch (e) {}
            });
        }
    }

    private getFriendsKey(username: string): string {
        return `playard_friends_${username.toLowerCase()}`;
    }

    private getIncomingRequestsKey(username: string): string {
        return `playard_friend_requests_in_${username.toLowerCase()}`;
    }

    private getOutgoingRequestsKey(username: string): string {
        return `playard_friend_requests_out_${username.toLowerCase()}`;
    }

    public async fetchSupabaseProfiles() {
        if (!supabase) return;
        try {
            const { data, error } = await supabase.from('profiles').select('id, username, display_name, is_admin');
            if (data && Array.isArray(data) && !error) {
                this.cachedSupabasePlayers = data
                    .filter(p => p.username && p.username.trim())
                    .map(p => ({
                        username: p.username.trim(),
                        displayName: p.display_name || p.username.trim(),
                        color: getPlayerColor(p.username.trim())
                    }));
                window.dispatchEvent(new CustomEvent('playard_friends_updated'));
            }
        } catch (e) {
            console.warn('Could not fetch Supabase profiles:', e);
        }
    }

    private initSyncChannels() {
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                this.broadcastChannel = new BroadcastChannel('playard_friends_sync');
                this.broadcastChannel.onmessage = (event) => {
                    const data = event.data;
                    if (!data || !data.type) return;
                    this.handleIncomingSyncEvent(data);
                };
            } catch (e) {}
        }

        if (supabase) {
            try {
                this.supabaseChannel = supabase.channel('playard_global_friends_sync', {
                    config: { broadcast: { self: false } }
                });
                this.supabaseChannel.on('broadcast', { event: 'friend_action' }, (payload: any) => {
                    if (payload && payload.payload) {
                        this.handleIncomingSyncEvent(payload.payload);
                    }
                }).subscribe();
            } catch (e) {}
        }
    }

    private broadcastAction(eventData: any) {
        try {
            this.broadcastChannel?.postMessage(eventData);
        } catch (e) {}

        try {
            this.supabaseChannel?.send({
                type: 'broadcast',
                event: 'friend_action',
                payload: eventData
            });
        } catch (e) {}
    }

    private handleIncomingSyncEvent(data: any) {
        if (!data || !data.type) return;
        if (data.type === 'player_active_game' && data.username && data.game) {
            try {
                localStorage.setItem(`playard_active_game_${data.username.toLowerCase()}`, JSON.stringify(data.game));
            } catch (e) {}
        }
        window.dispatchEvent(new CustomEvent('playard_friends_updated', { detail: data }));
    }

    public setPlayerActiveGame(username: string, game: { id: string; title: string; url: string }) {
        if (!username || !game) return;
        const data = {
            ...game,
            timestamp: Date.now()
        };
        try {
            localStorage.setItem(`playard_active_game_${username.toLowerCase()}`, JSON.stringify(data));
        } catch (e) {}

        this.broadcastAction({
            type: 'player_active_game',
            username,
            game: data
        });
        window.dispatchEvent(new CustomEvent('playard_friends_updated'));
    }

    public clearPlayerActiveGame(username: string) {
        if (!username) return;
        try {
            localStorage.removeItem(`playard_active_game_${username.toLowerCase()}`);
        } catch (e) {}
        this.broadcastAction({
            type: 'player_active_game',
            username,
            game: null
        });
        window.dispatchEvent(new CustomEvent('playard_friends_updated'));
    }

    public getPlayerActivity(username: string): { isPlaying: boolean; gameId?: string; gameTitle?: string; gameUrl?: string } {
        if (!username) return { isPlaying: false };
        try {
            const raw = localStorage.getItem(`playard_active_game_${username.toLowerCase()}`);
            if (raw) {
                const data = JSON.parse(raw);
                // Active within last 30 minutes
                if (data && data.url && (Date.now() - (data.timestamp || 0) < 1800000)) {
                    return {
                        isPlaying: true,
                        gameId: data.id,
                        gameTitle: data.title,
                        gameUrl: data.url
                    };
                }
            }

            // Check recently played by this user within last 15 minutes
            const rawRecent = localStorage.getItem(`playard_recently_played_${username.toLowerCase()}`);
            if (rawRecent) {
                const list = JSON.parse(rawRecent);
                if (Array.isArray(list) && list.length > 0) {
                    const top = list[0];
                    if (top && top.url && (Date.now() - (top.lastPlayed || 0) < 900000)) {
                        return {
                            isPlaying: true,
                            gameId: top.id,
                            gameTitle: top.title,
                            gameUrl: top.url
                        };
                    }
                }
            }
        } catch (e) {}
        return { isPlaying: false };
    }

    public initUser(username: string, _displayName?: string) {
        if (!username) return;
        const inKey = this.getIncomingRequestsKey(username);
        const frKey = this.getFriendsKey(username);

        // Initialize empty lists if not already present
        if (localStorage.getItem(inKey) === null) {
            localStorage.setItem(inKey, JSON.stringify([]));
        }
        if (localStorage.getItem(frKey) === null) {
            localStorage.setItem(frKey, JSON.stringify([]));
        }
    }

    public getFriends(username: string): Friend[] {
        if (!username) return [];
        try {
            const raw = localStorage.getItem(this.getFriendsKey(username));
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
    }

    public getIncomingRequests(username: string): FriendRequest[] {
        if (!username) return [];
        try {
            const raw = localStorage.getItem(this.getIncomingRequestsKey(username));
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
    }

    public getOutgoingRequests(username: string): string[] {
        if (!username) return [];
        try {
            const raw = localStorage.getItem(this.getOutgoingRequestsKey(username));
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
    }

    public sendFriendRequest(fromUsername: string, fromDisplayName: string, toUsername: string): boolean {
        if (!fromUsername || !toUsername || fromUsername.toLowerCase() === toUsername.toLowerCase()) {
            return false;
        }

        // Add to sender's outgoing requests
        const outList = this.getOutgoingRequests(fromUsername);
        if (!outList.includes(toUsername)) {
            outList.push(toUsername);
            localStorage.setItem(this.getOutgoingRequestsKey(fromUsername), JSON.stringify(outList));
        }

        // Add to recipient's incoming requests
        const inList = this.getIncomingRequests(toUsername);
        const exists = inList.some(r => r.fromUsername.toLowerCase() === fromUsername.toLowerCase());
        const newReq: FriendRequest = {
            id: `req_${fromUsername}_${Date.now()}`,
            fromUsername,
            fromDisplayName: fromDisplayName || fromUsername,
            fromColor: getPlayerColor(fromUsername),
            toUsername,
            timestamp: Date.now()
        };

        if (!exists) {
            inList.push(newReq);
            localStorage.setItem(this.getIncomingRequestsKey(toUsername), JSON.stringify(inList));
        }

        // Broadcast to other tabs/players
        this.broadcastAction({
            type: 'friend_request',
            fromUsername,
            fromDisplayName: fromDisplayName || fromUsername,
            toUsername,
            timestamp: Date.now()
        });

        window.dispatchEvent(new CustomEvent('playard_friends_updated', { detail: { username: fromUsername } }));
        return true;
    }

    public acceptFriendRequest(currentUsername: string, fromUsername: string): boolean {
        if (!currentUsername || !fromUsername) return false;

        // Remove from current user's incoming requests
        const inList = this.getIncomingRequests(currentUsername);
        const req = inList.find(r => r.fromUsername.toLowerCase() === fromUsername.toLowerCase());
        const filteredIn = inList.filter(r => r.fromUsername.toLowerCase() !== fromUsername.toLowerCase());
        localStorage.setItem(this.getIncomingRequestsKey(currentUsername), JSON.stringify(filteredIn));

        // Remove from sender's outgoing requests
        const outList = this.getOutgoingRequests(fromUsername);
        const filteredOut = outList.filter(u => u.toLowerCase() !== currentUsername.toLowerCase());
        localStorage.setItem(this.getOutgoingRequestsKey(fromUsername), JSON.stringify(filteredOut));

        // Add to current user's friends
        const myFriends = this.getFriends(currentUsername);
        if (!myFriends.some(f => f.username.toLowerCase() === fromUsername.toLowerCase())) {
            myFriends.push({
                username: fromUsername,
                displayName: req?.fromDisplayName || fromUsername,
                avatarColor: req?.fromColor || getPlayerColor(fromUsername),
                isOnline: true
            });
            localStorage.setItem(this.getFriendsKey(currentUsername), JSON.stringify(myFriends));
        }

        // Add to sender's friends as well
        const theirFriends = this.getFriends(fromUsername);
        if (!theirFriends.some(f => f.username.toLowerCase() === currentUsername.toLowerCase())) {
            theirFriends.push({
                username: currentUsername,
                displayName: currentUsername,
                avatarColor: getPlayerColor(currentUsername),
                isOnline: true
            });
            localStorage.setItem(this.getFriendsKey(fromUsername), JSON.stringify(theirFriends));
        }

        // Broadcast acceptance
        this.broadcastAction({
            type: 'friend_accept',
            fromUsername,
            toUsername: currentUsername,
            timestamp: Date.now()
        });

        window.dispatchEvent(new CustomEvent('playard_friends_updated', { detail: { username: currentUsername } }));
        return true;
    }

    public declineFriendRequest(currentUsername: string, fromUsername: string): boolean {
        if (!currentUsername || !fromUsername) return false;

        const inList = this.getIncomingRequests(currentUsername);
        const filteredIn = inList.filter(r => r.fromUsername.toLowerCase() !== fromUsername.toLowerCase());
        localStorage.setItem(this.getIncomingRequestsKey(currentUsername), JSON.stringify(filteredIn));

        const outList = this.getOutgoingRequests(fromUsername);
        const filteredOut = outList.filter(u => u.toLowerCase() !== currentUsername.toLowerCase());
        localStorage.setItem(this.getOutgoingRequestsKey(fromUsername), JSON.stringify(filteredOut));

        this.broadcastAction({
            type: 'friend_decline',
            fromUsername,
            toUsername: currentUsername,
            timestamp: Date.now()
        });

        window.dispatchEvent(new CustomEvent('playard_friends_updated', { detail: { username: currentUsername } }));
        return true;
    }

    public removeFriend(currentUsername: string, friendUsername: string): boolean {
        if (!currentUsername || !friendUsername) return false;

        const myFriends = this.getFriends(currentUsername).filter(f => f.username.toLowerCase() !== friendUsername.toLowerCase());
        localStorage.setItem(this.getFriendsKey(currentUsername), JSON.stringify(myFriends));

        const theirFriends = this.getFriends(friendUsername).filter(f => f.username.toLowerCase() !== currentUsername.toLowerCase());
        localStorage.setItem(this.getFriendsKey(friendUsername), JSON.stringify(theirFriends));

        this.broadcastAction({
            type: 'friend_remove',
            fromUsername: currentUsername,
            toUsername: friendUsername,
            timestamp: Date.now()
        });

        window.dispatchEvent(new CustomEvent('playard_friends_updated', { detail: { username: currentUsername } }));
        return true;
    }

    public searchPlayers(query: string, currentUsername: string): PlayerSearchResult[] {
        const cleanQuery = query.trim().toLowerCase();
        const friends = this.getFriends(currentUsername);
        const outgoing = this.getOutgoingRequests(currentUsername);
        const incoming = this.getIncomingRequests(currentUsername);

        const friendUsernames = new Set(friends.map(f => f.username.toLowerCase()));
        const outgoingSet = new Set(outgoing.map(u => u.toLowerCase()));
        const incomingSet = new Set(incoming.map(r => r.fromUsername.toLowerCase()));

        // Pool together only REAL players: Supabase profiles + locally registered profiles
        const allCandidatesMap = new Map<string, { username: string; displayName: string; color: string }>();

        // 1. Supabase real users
        this.cachedSupabasePlayers.forEach(p => {
            allCandidatesMap.set(p.username.toLowerCase(), p);
        });

        // 2. Local registered profiles
        try {
            const localProfiles = getLocalProfiles();
            localProfiles.forEach(p => {
                if (p.username && p.username.trim() && !allCandidatesMap.has(p.username.toLowerCase())) {
                    allCandidatesMap.set(p.username.toLowerCase(), {
                        username: p.username.trim(),
                        displayName: p.displayName || p.username.trim(),
                        color: getPlayerColor(p.username.trim())
                    });
                }
            });
        } catch (e) {}

        const results: PlayerSearchResult[] = [];

        allCandidatesMap.forEach((p, lowerKey) => {
            // Do not show current logged-in user in search results
            if (lowerKey === currentUsername.toLowerCase()) return;

            // Filter if query is provided
            if (cleanQuery && !lowerKey.includes(cleanQuery) && !p.displayName.toLowerCase().includes(cleanQuery)) {
                return;
            }

            results.push({
                username: p.username,
                displayName: p.displayName,
                color: p.color,
                isFriend: friendUsernames.has(lowerKey),
                hasPendingOutgoing: outgoingSet.has(lowerKey),
                hasPendingIncoming: incomingSet.has(lowerKey)
            });
        });

        return results;
    }
}

export const friendService = new FriendService();
if (typeof window !== 'undefined') {
    (window as any).friendService = friendService;
}
