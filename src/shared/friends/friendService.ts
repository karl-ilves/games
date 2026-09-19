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

function generateUUID(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
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

            try {
                supabase.channel('playard_friends_db_sync')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'user_created_games'
                    }, () => {
                        const profile = getCurrentUserProfile();
                        if (profile?.username) {
                            this.syncCloudFriends(profile.username);
                        }
                    })
                    .subscribe();
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

    private cleanRequestsAfterAccept(userA: string, userB: string) {
        const uA = userA.toLowerCase().trim();
        const uB = userB.toLowerCase().trim();

        const inA = this.getIncomingRequests(uA).filter(r => r.fromUsername.toLowerCase().trim() !== uB);
        localStorage.setItem(this.getIncomingRequestsKey(uA), JSON.stringify(inA));

        const inB = this.getIncomingRequests(uB).filter(r => r.fromUsername.toLowerCase().trim() !== uA);
        localStorage.setItem(this.getIncomingRequestsKey(uB), JSON.stringify(inB));

        const outA = this.getOutgoingRequests(uA).filter(u => u.toLowerCase().trim() !== uB);
        localStorage.setItem(this.getOutgoingRequestsKey(uA), JSON.stringify(outA));

        const outB = this.getOutgoingRequests(uB).filter(u => u.toLowerCase().trim() !== uA);
        localStorage.setItem(this.getOutgoingRequestsKey(uB), JSON.stringify(outB));
    }

    private addFriendDirect(ownerUsername: string, friendUsername: string, friendDisplayName?: string) {
        const owner = ownerUsername.toLowerCase().trim();
        const list = this.getFriends(owner);
        if (!list.some(f => f.username.toLowerCase().trim() === friendUsername.toLowerCase().trim())) {
            list.push({
                username: friendUsername,
                displayName: friendDisplayName || friendUsername,
                avatarColor: getPlayerColor(friendUsername),
                isOnline: true
            });
            localStorage.setItem(this.getFriendsKey(owner), JSON.stringify(list));
        }
    }

    private removeFriendDirect(ownerUsername: string, friendUsername: string) {
        const owner = ownerUsername.toLowerCase().trim();
        const list = this.getFriends(owner).filter(f => f.username.toLowerCase().trim() !== friendUsername.toLowerCase().trim());
        localStorage.setItem(this.getFriendsKey(owner), JSON.stringify(list));
    }

    private handleIncomingSyncEvent(data: any) {
        if (!data || !data.type) return;

        if (data.type === 'friend_request' && data.toUsername) {
            const toUser = data.toUsername.toLowerCase().trim();
            const fromUser = data.fromUsername;
            const inKey = this.getIncomingRequestsKey(toUser);
            const inList = this.getIncomingRequests(toUser);
            if (!inList.some(r => r.fromUsername.toLowerCase().trim() === fromUser.toLowerCase().trim())) {
                inList.push({
                    id: data.id || `req_${fromUser}_${Date.now()}`,
                    fromUsername: fromUser,
                    fromDisplayName: data.fromDisplayName || fromUser,
                    fromColor: data.fromColor || getPlayerColor(fromUser),
                    toUsername: data.toUsername,
                    timestamp: data.timestamp || Date.now()
                });
                localStorage.setItem(inKey, JSON.stringify(inList));
            }
        } else if (data.type === 'friend_accept' && data.fromUsername && data.toUsername) {
            const userA = data.fromUsername;
            const userB = data.toUsername;

            this.cleanRequestsAfterAccept(userA, userB);
            this.addFriendDirect(userA, userB, data.displayNameB || userB);
            this.addFriendDirect(userB, userA, data.displayNameA || userA);
        } else if (data.type === 'friend_decline' && data.fromUsername && data.toUsername) {
            this.cleanRequestsAfterAccept(data.fromUsername, data.toUsername);
        } else if (data.type === 'friend_remove' && data.fromUsername && data.toUsername) {
            this.removeFriendDirect(data.fromUsername, data.toUsername);
            this.removeFriendDirect(data.toUsername, data.fromUsername);
        } else if (data.type === 'player_active_game' && data.username && data.game) {
            try {
                localStorage.setItem(`playard_active_game_${data.username.toLowerCase().trim()}`, JSON.stringify(data.game));
            } catch (e) {}
        }

        window.dispatchEvent(new CustomEvent('playard_friends_updated', { detail: data }));
    }

    public async syncCloudFriends(currentUsername: string) {
        if (!supabase || !currentUsername) return;
        const cleanUser = currentUsername.toLowerCase().trim();
        try {
            // 1. Fetch pending friend requests for current user from cloud
            const { data: reqs } = await supabase
                .from('user_created_games')
                .select('*')
                .eq('category', 'friend_request')
                .eq('status', 'pending');

            if (Array.isArray(reqs)) {
                const inList = this.getIncomingRequests(cleanUser);
                let inChanged = false;

                reqs.forEach(r => {
                    try {
                        const parsed = typeof r.description === 'string' ? JSON.parse(r.description) : r.description;
                        if (parsed && parsed.toUsername && parsed.toUsername.toLowerCase().trim() === cleanUser) {
                            if (!inList.some(item => item.fromUsername.toLowerCase().trim() === parsed.fromUsername.toLowerCase().trim())) {
                                inList.push({
                                    id: r.id,
                                    fromUsername: parsed.fromUsername,
                                    fromDisplayName: parsed.fromDisplayName || parsed.fromUsername,
                                    fromColor: parsed.fromColor || getPlayerColor(parsed.fromUsername),
                                    toUsername: parsed.toUsername,
                                    timestamp: parsed.timestamp || (r.created_at ? new Date(r.created_at).getTime() : Date.now())
                                });
                                inChanged = true;
                            }
                        }
                    } catch (e) {}
                });

                if (inChanged) {
                    localStorage.setItem(this.getIncomingRequestsKey(cleanUser), JSON.stringify(inList));
                }
            }

            // 2. Fetch active friendships from cloud
            const { data: rels } = await supabase
                .from('user_created_games')
                .select('*')
                .eq('category', 'friend_relation')
                .eq('status', 'active');

            if (Array.isArray(rels)) {
                const myFriends = this.getFriends(cleanUser);
                let frChanged = false;

                rels.forEach(rel => {
                    try {
                        const parsed = typeof rel.description === 'string' ? JSON.parse(rel.description) : rel.description;
                        if (parsed && (parsed.user1?.toLowerCase().trim() === cleanUser || parsed.user2?.toLowerCase().trim() === cleanUser)) {
                            const otherUser = parsed.user1?.toLowerCase().trim() === cleanUser ? parsed.user2 : parsed.user1;
                            const otherDisplayName = parsed.user1?.toLowerCase().trim() === cleanUser 
                                ? (parsed.displayName2 || otherUser) 
                                : (parsed.displayName1 || otherUser);
                            if (otherUser && !myFriends.some(f => f.username.toLowerCase().trim() === otherUser.toLowerCase().trim())) {
                                myFriends.push({
                                    username: otherUser,
                                    displayName: otherDisplayName,
                                    avatarColor: getPlayerColor(otherUser),
                                    isOnline: true
                                });
                                frChanged = true;
                            }
                        }
                    } catch (e) {}
                });

                if (frChanged) {
                    localStorage.setItem(this.getFriendsKey(cleanUser), JSON.stringify(myFriends));
                }
            }

            if (inChanged || frChanged) {
                window.dispatchEvent(new CustomEvent('playard_friends_updated', { detail: { username: cleanUser } }));
            }
        } catch (e) {
            console.warn('Could not sync cloud friends:', e);
        }
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
        const clean = username.toLowerCase().trim();
        const inKey = this.getIncomingRequestsKey(clean);
        const frKey = this.getFriendsKey(clean);

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

    public async sendFriendRequest(fromUsername: string, fromDisplayName: string, toUsername: string): Promise<boolean> {
        if (!fromUsername || !toUsername || fromUsername.toLowerCase().trim() === toUsername.toLowerCase().trim()) {
            return false;
        }

        const cleanFrom = fromUsername.trim();
        const cleanTo = toUsername.trim();

        // 1. Add to sender's outgoing requests locally
        const outList = this.getOutgoingRequests(cleanFrom);
        if (!outList.some(u => u.toLowerCase().trim() === cleanTo.toLowerCase().trim())) {
            outList.push(cleanTo);
            localStorage.setItem(this.getOutgoingRequestsKey(cleanFrom), JSON.stringify(outList));
        }

        // 2. Add to recipient's incoming requests locally (for local tab/browser testing)
        const inList = this.getIncomingRequests(cleanTo);
        const exists = inList.some(r => r.fromUsername.toLowerCase().trim() === cleanFrom.toLowerCase().trim());
        const newReq: FriendRequest = {
            id: generateUUID(),
            fromUsername: cleanFrom,
            fromDisplayName: fromDisplayName || cleanFrom,
            fromColor: getPlayerColor(cleanFrom),
            toUsername: cleanTo,
            timestamp: Date.now()
        };

        if (!exists) {
            inList.push(newReq);
            localStorage.setItem(this.getIncomingRequestsKey(cleanTo), JSON.stringify(inList));
        }

        // 3. Save to Supabase Cloud so offline users receive it!
        if (supabase) {
            try {
                const reqTitle = `FRIEND_REQ:${cleanFrom.toLowerCase()}->${cleanTo.toLowerCase()}`;
                const { data: existing } = await supabase
                    .from('user_created_games')
                    .select('id')
                    .eq('category', 'friend_request')
                    .eq('title', reqTitle)
                    .eq('status', 'pending');

                if (!existing || existing.length === 0) {
                    await supabase.from('user_created_games').insert({
                        id: newReq.id,
                        creator_username: cleanFrom.toLowerCase(),
                        title: reqTitle,
                        description: JSON.stringify(newReq),
                        category: 'friend_request',
                        status: 'pending'
                    });
                }
            } catch (e) {
                console.warn('Could not persist friend request to Supabase:', e);
            }
        }

        // 4. Broadcast to other tabs/players in real time
        this.broadcastAction({
            type: 'friend_request',
            ...newReq
        });

        window.dispatchEvent(new CustomEvent('playard_friends_updated', { detail: { username: cleanFrom } }));
        return true;
    }

    public async acceptFriendRequest(currentUsername: string, fromUsername: string): Promise<boolean> {
        if (!currentUsername || !fromUsername) return false;
        const cleanCurrent = currentUsername.trim();
        const cleanFrom = fromUsername.trim();

        // 1. Remove from requests locally
        this.cleanRequestsAfterAccept(cleanFrom, cleanCurrent);

        // 2. Add to friends locally
        this.addFriendDirect(cleanCurrent, cleanFrom);
        this.addFriendDirect(cleanFrom, cleanCurrent);

        // 3. Update in Supabase Cloud
        if (supabase) {
            try {
                await supabase
                    .from('user_created_games')
                    .update({ status: 'accepted' })
                    .eq('category', 'friend_request')
                    .in('title', [
                        `FRIEND_REQ:${cleanFrom.toLowerCase()}->${cleanCurrent.toLowerCase()}`,
                        `FRIEND_REQ:${cleanCurrent.toLowerCase()}->${cleanFrom.toLowerCase()}`
                    ]);

                const relId = generateUUID();
                await supabase.from('user_created_games').insert({
                    id: relId,
                    creator_username: cleanCurrent.toLowerCase(),
                    title: `FRIEND:${cleanCurrent.toLowerCase()}<->${cleanFrom.toLowerCase()}`,
                    description: JSON.stringify({
                        user1: cleanCurrent.toLowerCase(),
                        user2: cleanFrom.toLowerCase(),
                        displayName1: cleanCurrent,
                        displayName2: cleanFrom,
                        timestamp: Date.now()
                    }),
                    category: 'friend_relation',
                    status: 'active'
                });
            } catch (e) {
                console.warn('Could not update friend acceptance in cloud:', e);
            }
        }

        // 4. Broadcast acceptance
        this.broadcastAction({
            type: 'friend_accept',
            fromUsername: cleanFrom,
            toUsername: cleanCurrent,
            displayNameA: cleanFrom,
            displayNameB: cleanCurrent,
            timestamp: Date.now()
        });

        window.dispatchEvent(new CustomEvent('playard_friends_updated', { detail: { username: cleanCurrent } }));
        return true;
    }

    public async declineFriendRequest(currentUsername: string, fromUsername: string): Promise<boolean> {
        if (!currentUsername || !fromUsername) return false;
        const cleanCurrent = currentUsername.trim();
        const cleanFrom = fromUsername.trim();

        this.cleanRequestsAfterAccept(cleanFrom, cleanCurrent);

        if (supabase) {
            try {
                await supabase
                    .from('user_created_games')
                    .update({ status: 'declined' })
                    .eq('category', 'friend_request')
                    .in('title', [
                        `FRIEND_REQ:${cleanFrom.toLowerCase()}->${cleanCurrent.toLowerCase()}`,
                        `FRIEND_REQ:${cleanCurrent.toLowerCase()}->${cleanFrom.toLowerCase()}`
                    ]);
            } catch (e) {}
        }

        this.broadcastAction({
            type: 'friend_decline',
            fromUsername: cleanFrom,
            toUsername: cleanCurrent,
            timestamp: Date.now()
        });

        window.dispatchEvent(new CustomEvent('playard_friends_updated', { detail: { username: cleanCurrent } }));
        return true;
    }

    public async removeFriend(currentUsername: string, friendUsername: string): Promise<boolean> {
        if (!currentUsername || !friendUsername) return false;
        const cleanCurrent = currentUsername.trim();
        const cleanFriend = friendUsername.trim();

        this.removeFriendDirect(cleanCurrent, cleanFriend);
        this.removeFriendDirect(cleanFriend, cleanCurrent);

        if (supabase) {
            try {
                await supabase
                    .from('user_created_games')
                    .update({ status: 'removed' })
                    .eq('category', 'friend_relation')
                    .in('title', [
                        `FRIEND:${cleanCurrent.toLowerCase()}<->${cleanFriend.toLowerCase()}`,
                        `FRIEND:${cleanFriend.toLowerCase()}<->${cleanCurrent.toLowerCase()}`
                    ]);
            } catch (e) {}
        }

        this.broadcastAction({
            type: 'friend_remove',
            fromUsername: cleanCurrent,
            toUsername: cleanFriend,
            timestamp: Date.now()
        });

        window.dispatchEvent(new CustomEvent('playard_friends_updated', { detail: { username: cleanCurrent } }));
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
