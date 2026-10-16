import { getLocalProfiles } from '../auth';

export interface GameServerRule {
    gameId: string;
    gameTitle: string;
    gameUrl: string;
    maxPlayers: number;
    category: string;
    icon: string;
    ruleDescription: string;
}

export interface ServerPlayer {
    username: string;
    displayName: string;
    isAi?: boolean;
    pingMs: number;
    joinedAt: string;
    isOwner?: boolean;
}

export interface GameServerInstance {
    id: string;
    serverId: string;
    serverNumber: number;
    gameId: string;
    gameTitle: string;
    gameUrl: string;
    maxPlayers: number;
    players: ServerPlayer[];
    status: 'online' | 'full' | 'restarting';
    createdAt: number;
    region: string;
    isCustom?: boolean;
}

export const GAME_SERVER_RULES: Record<string, GameServerRule> = {
    mmp1: {
        gameId: 'mmp1',
        gameTitle: 'MMP1: Multi-Map Battle Arena',
        gameUrl: '/games/mmp1/index.html',
        maxPlayers: 10,
        category: 'battle',
        icon: '⚔️',
        ruleDescription: 'Maksimaalselt 10 mängijat / server (kuni teeb uue serveri)'
    },
    citycar: {
        gameId: 'citycar',
        gameTitle: '3D City Car Driving',
        gameUrl: '/games/citycar/index.html',
        maxPlayers: 5,
        category: 'driving',
        icon: '🚗',
        ruleDescription: 'Maksimaalselt 5 mängijat / server'
    },
    racing: {
        gameId: 'racing',
        gameTitle: '3D Racing Simulator',
        gameUrl: '/games/racing/index.html',
        maxPlayers: 5,
        category: 'racing',
        icon: '🏎️',
        ruleDescription: 'Maksimaalselt 5 mängijat / server'
    },
    snake: {
        gameId: 'snake',
        gameTitle: '3D Ussimäng (Snake)',
        gameUrl: '/games/snake/index.html',
        maxPlayers: 3,
        category: 'arcade',
        icon: '🐍',
        ruleDescription: 'Maksimaalselt 3 mängijat / server'
    },
    train: {
        gameId: 'train',
        gameTitle: '3D Train Simulator',
        gameUrl: '/games/train/index.html',
        maxPlayers: 1,
        category: 'simulation',
        icon: '🚂',
        ruleDescription: 'Maksimaalselt 1 mängija / server (soolo)'
    },
    metro: {
        gameId: 'metro',
        gameTitle: 'Last Metro 3D',
        gameUrl: '/games/metro/index.html',
        maxPlayers: 1,
        category: 'survival',
        icon: '🚇',
        ruleDescription: 'Maksimaalselt 1 mängija / server (soolo)'
    },
    flight: {
        gameId: 'flight',
        gameTitle: '3D Flight Simulator',
        gameUrl: '/games/flight/index.html',
        maxPlayers: 1,
        category: 'simulation',
        icon: '✈️',
        ruleDescription: 'Maksimaalselt 1 mängija / server (soolo)'
    },
    obby: {
        gameId: 'obby',
        gameTitle: '3D Parkour Obby',
        gameUrl: '/games/obby/index.html',
        maxPlayers: 1,
        category: 'parkour',
        icon: '🏃',
        ruleDescription: 'Maksimaalselt 1 mängija / server (soolo)'
    },
    rocket: {
        gameId: 'rocket',
        gameTitle: 'Rocket Playard 3D',
        gameUrl: '/games/rocket/index.html',
        maxPlayers: 1,
        category: 'sports',
        icon: '🚀',
        ruleDescription: 'Maksimaalselt 1 mängija / server (soolo)'
    },
    crown: {
        gameId: 'crown',
        gameTitle: 'Crown Obby 3D',
        gameUrl: '/games/crown/index.html',
        maxPlayers: 1,
        category: 'parkour',
        icon: '👑',
        ruleDescription: 'Maksimaalselt 1 mängija / server (soolo)'
    },
    cooking: {
        gameId: 'cooking',
        gameTitle: 'Cooking Rush 3D',
        gameUrl: '/games/cooking/index.html',
        maxPlayers: 1,
        category: 'casual',
        icon: '🍳',
        ruleDescription: 'Maksimaalselt 1 mängija / server (soolo)'
    },
    defender: {
        gameId: 'defender',
        gameTitle: 'Playard Defender 3D',
        gameUrl: '/games/defender/index.html',
        maxPlayers: 1,
        category: 'defense',
        icon: '🛡️',
        ruleDescription: 'Maksimaalselt 1 mängija / server (soolo)'
    },
    breakout: {
        gameId: 'breakout',
        gameTitle: 'Neon Breakout 3D',
        gameUrl: '/games/breakout/index.html',
        maxPlayers: 1,
        category: 'arcade',
        icon: '🧱',
        ruleDescription: 'Maksimaalselt 1 mängija / server (soolo)'
    },
    ai: {
        gameId: 'ai',
        gameTitle: 'Playard AI Studio',
        gameUrl: '/games/ai/index.html',
        maxPlayers: 1,
        category: 'creative',
        icon: '🤖',
        ruleDescription: 'Maksimaalselt 1 mängija / server (soolo)'
    },
    play: {
        gameId: 'play',
        gameTitle: 'Playard Playground',
        gameUrl: '/games/play/index.html',
        maxPlayers: 1,
        category: 'creative',
        icon: '🎮',
        ruleDescription: 'Maksimaalselt 1 mängija / server (soolo)'
    }
};

const SERVERS_STORAGE_KEY = 'playard_game_servers';

export class ServerManager {
    private servers: GameServerInstance[] = [];
    private broadcast: BroadcastChannel | null = null;

    constructor() {
        this.initBroadcast();
        this.loadServers();
    }

    private initBroadcast() {
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                this.broadcast = new BroadcastChannel('playard_servers_sync');
                this.broadcast.onmessage = (e) => {
                    if (e.data && e.data.type === 'servers_updated') {
                        this.loadServers();
                        window.dispatchEvent(new CustomEvent('playard_servers_changed'));
                    }
                };
            }
        } catch (e) {}
    }

    private notifySync() {
        try {
            this.broadcast?.postMessage({ type: 'servers_updated' });
        } catch (e) {}
        window.dispatchEvent(new CustomEvent('playard_servers_changed'));
    }

    public getServerCapacity(gameId: string): number {
        const rule = GAME_SERVER_RULES[gameId.toLowerCase().trim()];
        if (rule) return rule.maxPlayers;
        return 1; // Kõik ülejäänud on 1
    }

    public getGameRule(gameId: string): GameServerRule {
        const id = gameId.toLowerCase().trim();
        if (GAME_SERVER_RULES[id]) {
            return GAME_SERVER_RULES[id];
        }
        return {
            gameId: id,
            gameTitle: id.toUpperCase(),
            gameUrl: `/games/${id}/index.html`,
            maxPlayers: 1,
            category: 'other',
            icon: '🎮',
            ruleDescription: 'Maksimaalselt 1 mängija / server (soolo)'
        };
    }

    public loadServers(): GameServerInstance[] {
        try {
            const raw = localStorage.getItem(SERVERS_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Kontrolli, et vanad AI-mängijad ei jääks mällu
                    const hasFakeAi = parsed.some((s: any) => 
                        Array.isArray(s.players) && s.players.some((p: any) => p.isAi || (p.username && p.username.includes('(AI)')) || (p.displayName && p.displayName.includes('(AI)')))
                    );
                    if (!hasFakeAi) {
                        this.servers = parsed;
                        return this.servers;
                    }
                }
            }
        } catch (e) {}

        // Genereeri algsed serverid päris mängijatega vastavalt mängude reeglitele
        this.servers = this.generateDefaultServers();
        this.saveServers();
        return this.servers;
    }

    public saveServers() {
        try {
            localStorage.setItem(SERVERS_STORAGE_KEY, JSON.stringify(this.servers));
        } catch (e) {}
        this.notifySync();
    }

    private generateDefaultServers(): GameServerInstance[] {
        const result: GameServerInstance[] = [];
        const registered = getLocalProfiles();
        const testUsernames = registered.map(r => r.username).filter(Boolean);

        // Päris mängijate baas Playard andmebaasist
        const p1 = testUsernames[0] || 'MarkusPlayard99';
        const p2 = testUsernames[1] || 'MikkSuperGamer';

        // 1. MMP1: Max 10 päris mängijat enne uue serveri tegemist
        const mmp1Players: ServerPlayer[] = [
            { username: 'Playard Owner ✔', displayName: 'Playard Owner ✔', pingMs: 14, joinedAt: 'Just nüüd', isOwner: true, isVerified: true },
            { username: `${p1} ✔`, displayName: `${p1} ✔`, pingMs: 18, joinedAt: '2 min tagasi', isVerified: true },
            { username: `${p2} ✔`, displayName: `${p2} ✔`, pingMs: 22, joinedAt: '5 min tagasi', isVerified: true },
            { username: 'RasmusGamer_EE', displayName: 'RasmusGamer_EE', pingMs: 16, joinedAt: '8 min tagasi' },
            { username: 'Erik_Playard ✔', displayName: 'Erik_Playard ✔', pingMs: 21, joinedAt: '10 min tagasi', isVerified: true },
            { username: 'Laura_Stars', displayName: 'Laura_Stars', pingMs: 25, joinedAt: '12 min tagasi' },
            { username: 'Karl_Ilves ✔', displayName: 'Karl_Ilves ✔', pingMs: 15, joinedAt: '15 min tagasi', isVerified: true },
            { username: 'Minionbanana0_0', displayName: 'Minionbanana0_0', pingMs: 29, joinedAt: '18 min tagasi' },
            { username: 'grx@trenet.ee', displayName: 'grx@trenet.ee', pingMs: 20, joinedAt: '20 min tagasi' },
            { username: 'Robin_Pro99', displayName: 'Robin_Pro99', pingMs: 24, joinedAt: '22 min tagasi' }
        ];

        // Server #1 (Täis: 10/10 päris mängijat)
        result.push({
            id: 'srv_mmp1_1',
            serverId: 'MMP1-SRV-01',
            serverNumber: 1,
            gameId: 'mmp1',
            gameTitle: GAME_SERVER_RULES.mmp1.gameTitle,
            gameUrl: GAME_SERVER_RULES.mmp1.gameUrl,
            maxPlayers: 10,
            players: mmp1Players,
            status: 'full',
            createdAt: Date.now() - 3600000,
            region: 'EU-Tallinn'
        });

        // Kuna Server #1 sai täis (10/10), tehti automaatselt Server #2 järgmistele päris mängijatele!
        result.push({
            id: 'srv_mmp1_2',
            serverId: 'MMP1-SRV-02',
            serverNumber: 2,
            gameId: 'mmp1',
            gameTitle: GAME_SERVER_RULES.mmp1.gameTitle,
            gameUrl: GAME_SERVER_RULES.mmp1.gameUrl,
            maxPlayers: 10,
            players: [
                { username: 'Oliver_Speed', displayName: 'Oliver_Speed', pingMs: 19, joinedAt: '1 min tagasi' },
                { username: 'Sander_Hunter ✔', displayName: 'Sander_Hunter ✔', pingMs: 23, joinedAt: 'Just nüüd', isVerified: true }
            ],
            status: 'online',
            createdAt: Date.now() - 600000,
            region: 'EU-Tallinn'
        });

        // 2. 3D City Car: Max 5 (Päris mängijad)
        result.push({
            id: 'srv_citycar_1',
            serverId: 'CITY-SRV-01',
            serverNumber: 1,
            gameId: 'citycar',
            gameTitle: GAME_SERVER_RULES.citycar.gameTitle,
            gameUrl: GAME_SERVER_RULES.citycar.gameUrl,
            maxPlayers: 5,
            players: [
                { username: 'Marten_Drifter', displayName: 'Marten_Drifter', pingMs: 17, joinedAt: '8 min tagasi' },
                { username: 'Oliver_Speed', displayName: 'Oliver_Speed', pingMs: 21, joinedAt: '12 min tagasi' },
                { username: 'MarkusPlayard99 ✔', displayName: 'MarkusPlayard99 ✔', pingMs: 19, joinedAt: '15 min tagasi', isVerified: true },
                { username: 'RasmusGamer_EE', displayName: 'RasmusGamer_EE', pingMs: 24, joinedAt: '18 min tagasi' }
            ],
            status: 'online',
            createdAt: Date.now() - 1800000,
            region: 'EU-Tallinn'
        });

        // 3. 3D Racing Simulator: Max 5 (Päris võidusõitjad)
        result.push({
            id: 'srv_racing_1',
            serverId: 'RACE-SRV-01',
            serverNumber: 1,
            gameId: 'racing',
            gameTitle: GAME_SERVER_RULES.racing.gameTitle,
            gameUrl: GAME_SERVER_RULES.racing.gameUrl,
            maxPlayers: 5,
            players: [
                { username: 'Kaspar_Champion', displayName: 'Kaspar_Champion', pingMs: 16, joinedAt: '5 min tagasi' },
                { username: 'Oliver_Speed', displayName: 'Oliver_Speed', pingMs: 18, joinedAt: '6 min tagasi' },
                { username: 'MikkSuperGamer ✔', displayName: 'MikkSuperGamer ✔', pingMs: 22, joinedAt: '9 min tagasi', isVerified: true },
                { username: 'Kristjan_Drift', displayName: 'Kristjan_Drift', pingMs: 20, joinedAt: '11 min tagasi' }
            ],
            status: 'online',
            createdAt: Date.now() - 2400000,
            region: 'EU-Tallinn'
        });

        // 4. Ussimäng: Max 3 (Päris mängijad)
        result.push({
            id: 'srv_snake_1',
            serverId: 'SNAKE-SRV-01',
            serverNumber: 1,
            gameId: 'snake',
            gameTitle: GAME_SERVER_RULES.snake.gameTitle,
            gameUrl: GAME_SERVER_RULES.snake.gameUrl,
            maxPlayers: 3,
            players: [
                { username: 'Laura_Stars', displayName: 'Laura_Stars', pingMs: 19, joinedAt: '4 min tagasi' },
                { username: 'RasmusGamer_EE', displayName: 'RasmusGamer_EE', pingMs: 23, joinedAt: '1 min tagasi' }
            ],
            status: 'online',
            createdAt: Date.now() - 1200000,
            region: 'EU-Tallinn'
        });

        // 5. Kõik ülejäänud mängud: Max 1 (Soolo / Privaatserver ainult päris mängijale)
        const singlePlayerGames = ['train', 'metro', 'flight', 'obby', 'rocket', 'crown', 'cooking', 'defender', 'breakout'];
        singlePlayerGames.forEach((gid, idx) => {
            const rule = GAME_SERVER_RULES[gid];
            if (!rule) return;
            result.push({
                id: `srv_${gid}_1`,
                serverId: `${gid.toUpperCase()}-SRV-01`,
                serverNumber: 1,
                gameId: gid,
                gameTitle: rule.gameTitle,
                gameUrl: rule.gameUrl,
                maxPlayers: 1,
                players: [
                    { username: 'Mängija (Sina)', displayName: 'Mängija (Sina)', pingMs: 12, joinedAt: `${idx + 2} min tagasi` }
                ],
                status: 'full', // 1/1 on täis
                createdAt: Date.now() - (idx + 1) * 300000,
                region: 'EU-Tallinn'
            });
        });

        return result;
    }

    public getAllServers(): GameServerInstance[] {
        return this.loadServers();
    }

    public getServersByGame(gameId: string): GameServerInstance[] {
        const gid = gameId.toLowerCase().trim();
        return this.getAllServers().filter(s => s.gameId === gid);
    }

    public createNewServer(gameId: string): GameServerInstance {
        const gid = gameId.toLowerCase().trim();
        const rule = this.getGameRule(gid);
        const existing = this.getServersByGame(gid);
        const nextNum = existing.length + 1;

        const newServer: GameServerInstance = {
            id: `srv_${gid}_${Date.now()}`,
            serverId: `${gid.toUpperCase()}-SRV-${String(nextNum).padStart(2, '0')}`,
            serverNumber: nextNum,
            gameId: gid,
            gameTitle: rule.gameTitle,
            gameUrl: rule.gameUrl,
            maxPlayers: rule.maxPlayers,
            players: [],
            status: 'online',
            createdAt: Date.now(),
            region: 'EU-Tallinn',
            isCustom: true
        };

        this.servers.push(newServer);
        this.saveServers();
        return newServer;
    }

    public restartServer(serverId: string): boolean {
        const idx = this.servers.findIndex(s => s.id === serverId || s.serverId === serverId);
        if (idx >= 0) {
            this.servers[idx].status = 'restarting';
            this.saveServers();
            setTimeout(() => {
                if (this.servers[idx]) {
                    this.servers[idx].status = this.servers[idx].players.length >= this.servers[idx].maxPlayers ? 'full' : 'online';
                    this.saveServers();
                }
            }, 1000);
            return true;
        }
        return false;
    }

    public closeServer(serverId: string): boolean {
        const initialLen = this.servers.length;
        this.servers = this.servers.filter(s => s.id !== serverId && s.serverId !== serverId);
        if (this.servers.length < initialLen) {
            this.saveServers();
            return true;
        }
        return false;
    }

    public getInGameServerDisplay(gamePath: string, defaultName: string = 'Mängija (Sina)'): { countStr: string; players: string[] } {
        const path = (gamePath || '').toLowerCase();
        let targetGameId = 'other';

        if (path.includes('/mmp1/')) targetGameId = 'mmp1';
        else if (path.includes('/citycar/')) targetGameId = 'citycar';
        else if (path.includes('/racing/')) targetGameId = 'racing';
        else if (path.includes('/snake/')) targetGameId = 'snake';
        else if (path.includes('/train/')) targetGameId = 'train';
        else if (path.includes('/metro/')) targetGameId = 'metro';
        else if (path.includes('/flight/')) targetGameId = 'flight';
        else if (path.includes('/obby/')) targetGameId = 'obby';
        else if (path.includes('/rocket/')) targetGameId = 'rocket';
        else if (path.includes('/crown/')) targetGameId = 'crown';
        else if (path.includes('/cooking/')) targetGameId = 'cooking';
        else if (path.includes('/defender/')) targetGameId = 'defender';
        else if (path.includes('/breakout/')) targetGameId = 'breakout';
        else if (path.includes('/ai/')) targetGameId = 'ai';
        else if (path.includes('/play/')) targetGameId = 'play';
        else if (path.includes('/creator/')) targetGameId = 'creator';

        const rule = this.getGameRule(targetGameId);
        const gameServers = this.getServersByGame(targetGameId);
        const activeServer = gameServers[0] || (this.servers.length > 0 ? this.createNewServer(targetGameId) : null);

        // Kõik soolo mängud (max 1 mängija / server)
        if (rule.maxPlayers === 1) {
            return {
                countStr: 'Server #1 (1 / 1 mängija)',
                players: [defaultName]
            };
        }

        // Mitmikmängud (mmp1 max 10, citycar/racing max 5, snake max 3)
        if (activeServer) {
            const cleanDefault = defaultName.replace(/^[^\w\s]+/, '').replace(/✔.*$/, '').replace(/👑.*$/, '').trim().toLowerCase();

            const otherPlayers = activeServer.players
                .map(p => p.displayName || p.username)
                .filter(name => {
                    const cleanExisting = name.replace(/^[^\w\s]+/, '').replace(/✔.*$/, '').replace(/👑.*$/, '').trim().toLowerCase();
                    return cleanExisting !== cleanDefault && !name.includes('(AI)') && !cleanExisting.includes('sina');
                });

            const allRealPlayers = [defaultName, ...otherPlayers].slice(0, activeServer.maxPlayers);
            const count = allRealPlayers.length;

            return {
                countStr: `Server #${activeServer.serverNumber} (${count} / ${activeServer.maxPlayers} mängijat)`,
                players: allRealPlayers
            };
        }

        return {
            countStr: `Server #1 (1 / ${rule.maxPlayers} mängijat)`,
            players: [defaultName]
        };
    }
}

export const serverManager = new ServerManager();
if (typeof window !== 'undefined') {
    (window as any).serverManager = serverManager;
}
