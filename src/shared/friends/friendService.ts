import { getLocalProfiles } from '../../auth';

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

const DEFAULT_COMMUNITY_PLAYERS: { username: string; displayName: string; color: string }[] = [
    { username: 'Alex', displayName: 'Alex 👤', color: '#3498db' },
    { username: 'Sam', displayName: 'Sam 👤', color: '#e67e22' },
    { username: 'Jordan', displayName: 'Jordan 👤', color: '#9b59b6' },
    { username: 'Charlie', displayName: 'Charlie 👤', color: '#1abc9c' },
    { username: 'ProGamer99', displayName: 'ProGamer99 🎮', color: '#e74c3c' },
    { username: 'BuildMaster', displayName: 'BuildMaster 🔨', color: '#f39c12' },
    { username: 'DragonSlayer', displayName: 'DragonSlayer 🐉', color: '#8e44ad' },
    { username: 'SpeedyRunner', displayName: 'SpeedyRunner ⚡', color: '#2ecc71' },
    { username: 'RoboGamer', displayName: 'RoboGamer 🤖', color: '#00cec9' }
];

export class FriendService {
    private getFriendsKey(username: string): string {
        return `playard_friends_${username.toLowerCase()}`;
    }

    private getIncomingRequestsKey(username: string): string {
        return `playard_friend_requests_in_${username.toLowerCase()}`;
    }

    private getOutgoingRequestsKey(username: string): string {
        return `playard_friend_requests_out_${username.toLowerCase()}`;
    }

    public initUser(username: string, _displayName?: string) {
        if (!username) return;
        const inKey = this.getIncomingRequestsKey(username);
        const frKey = this.getFriendsKey(username);

        // If newly initialized user has never been set up, seed initial sample incoming request so user can immediately experience the (+) circle feature!
        if (localStorage.getItem(inKey) === null && localStorage.getItem(frKey) === null) {
            const initialRequests: FriendRequest[] = [
                {
                    id: 'req_alex_' + Date.now(),
                    fromUsername: 'Alex',
                    fromDisplayName: 'Alex 👤',
                    fromColor: '#3498db',
                    toUsername: username,
                    timestamp: Date.now() - 3600000
                },
                {
                    id: 'req_progamer_' + Date.now(),
                    fromUsername: 'ProGamer99',
                    fromDisplayName: 'ProGamer99 🎮',
                    fromColor: '#e74c3c',
                    toUsername: username,
                    timestamp: Date.now() - 7200000
                }
            ];
            localStorage.setItem(inKey, JSON.stringify(initialRequests));
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
        if (!exists) {
            inList.push({
                id: `req_${fromUsername}_${Date.now()}`,
                fromUsername,
                fromDisplayName: fromDisplayName || fromUsername,
                toUsername,
                timestamp: Date.now()
            });
            localStorage.setItem(this.getIncomingRequestsKey(toUsername), JSON.stringify(inList));
        }

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
                avatarColor: req?.fromColor || '#00f2fe',
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
                avatarColor: '#2ecc71',
                isOnline: true
            });
            localStorage.setItem(this.getFriendsKey(fromUsername), JSON.stringify(theirFriends));
        }

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

        window.dispatchEvent(new CustomEvent('playard_friends_updated', { detail: { username: currentUsername } }));
        return true;
    }

    public removeFriend(currentUsername: string, friendUsername: string): boolean {
        if (!currentUsername || !friendUsername) return false;

        const myFriends = this.getFriends(currentUsername).filter(f => f.username.toLowerCase() !== friendUsername.toLowerCase());
        localStorage.setItem(this.getFriendsKey(currentUsername), JSON.stringify(myFriends));

        const theirFriends = this.getFriends(friendUsername).filter(f => f.username.toLowerCase() !== currentUsername.toLowerCase());
        localStorage.setItem(this.getFriendsKey(friendUsername), JSON.stringify(theirFriends));

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

        // Pool together: Community players + local registered profiles
        const allCandidatesMap = new Map<string, { username: string; displayName: string; color: string }>();

        DEFAULT_COMMUNITY_PLAYERS.forEach(p => {
            allCandidatesMap.set(p.username.toLowerCase(), p);
        });

        try {
            const localProfiles = getLocalProfiles();
            localProfiles.forEach(p => {
                if (p.username && !allCandidatesMap.has(p.username.toLowerCase())) {
                    allCandidatesMap.set(p.username.toLowerCase(), {
                        username: p.username,
                        displayName: p.displayName || p.username,
                        color: '#0be881'
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
