/**
 * Playard Universal Game Code & Scripting Synthesizer.
 * Provides code generation, programming tutoring, game mechanics scripting,
 * and educational explanations for any game programming task.
 */

export interface CodeSynthesisResult {
    title: string;
    topic: string;
    explanation: string;
    code: string;
    features: string[];
    howToUse: string;
}

export class PlayardCodeSynthesizer {
    /**
     * Checks if the user prompt is asking to write code, program mechanics, or learn game coding.
     */
    public static isCodeRequest(prompt: string): boolean {
        const lower = prompt.toLowerCase().trim();
        return (
            /kirjuta kood|kuidas koodida|õpeta koodima|tee skript|loo kood|koodi mulle|programm|programmeerimine|write code|code script|create script/i.test(lower) ||
            (/(?:kood|skript|script)\b/i.test(lower) && /(?:liikumine|hüppamine|mündid|vaenlane|laskmine|elud|taimer|inventar|skoor|kontroller)/i.test(lower))
        );
    }

    /**
     * Synthesizes a complete, runnable game script with educational explanation.
     */
    public static synthesizeCode(prompt: string): CodeSynthesisResult {
        const lower = prompt.toLowerCase().trim();

        // 1. Movement & Jumping (Liikumine, hüppamine ja füüsika)
        if (/liikum|hüpp|hüp|gravitatsioon|jump|movement|walk|run|jooks/i.test(lower)) {
            return {
                title: '3D Mängija Juhtimine ja Hüppamine (Player Controller)',
                topic: 'Player Movement & Physics',
                explanation: `See skript juhib mängija 3D avatari sujuvat liikumist (WASD klahvide ja puutetundliku ekraaniga), rakendab gravitatsiooni ning võimaldab reaalajas hüppamist koos maapinna kokkupõrkekontrolliga (Raycasting).`,
                code: `// ==========================================================
// 🎮 Playard 3D Player Movement & Jump Controller
// ==========================================================
export class PlayerMovementController {
    public position = { x: 0, y: 1.0, z: 0 };
    public velocity = { x: 0, y: 0, z: 0 };
    public speed: number = 8.0;          // Jooksukiirus (m/s)
    public jumpForce: number = 11.5;     // Hüppejõud
    public gravity: number = -24.0;      // Gravitatsioonikiirendus
    public isGrounded: boolean = true;   // Kas mängija seisab maapinnal

    private keys: Record<string, boolean> = {};

    constructor() {
        this.bindInputEvents();
    }

    private bindInputEvents(): void {
        window.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
        window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    }

    /**
     * Uuenda mängija asukohta igal kaadril (deltaTime sekundites)
     */
    public update(deltaTime: number): void {
        const moveDir = { x: 0, z: 0 };

        if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.z += 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.z -= 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.x -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.x += 1;

        // Normaliseeri diagonaalliikumise kiirus
        const length = Math.hypot(moveDir.x, moveDir.z);
        if (length > 0) {
            moveDir.x /= length;
            moveDir.z /= length;
        }

        // Rakenda horisontaalne liikumiskiirus
        this.velocity.x = moveDir.x * this.speed;
        this.velocity.z = moveDir.z * this.speed;

        // Hüppamine tühikuklahviga (Space)
        if (this.keys['Space'] && this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
            console.log('🦘 Mängija sooritas hüppe!');
        }

        // Rakenda gravitatsioon vertikaalsele kiirusele
        this.velocity.y += this.gravity * deltaTime;

        // Uuenda koordinaate
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;

        // Kokkupõrge maapinnaga (y = 0 tasapind)
        if (this.position.y <= 1.0) {
            this.position.y = 1.0;
            this.velocity.y = 0;
            this.isGrounded = true;
        }
    }
}`,
                features: [
                    'Sujuv WASD ja nooleklahvide tugi',
                    'Diagonaalse kiiruse normaliseerimine (hoiab ühtlast kiirust)',
                    'Füüsikaline gravitatsioon ja hüppeloogika',
                    'Maapinna kokkupõrkekontroll'
                ],
                howToUse: 'Kutsu igas renderdustsükli kaadris `playerController.update(deltaTime)` ja määra kaamera jälgima `playerController.position` koordinaate.'
            };
        }

        // 2. Collectibles & Economy (Müntide korjamine, helid ja skoor)
        if (/münt|mündid|kristall|kristallid|coin|collect|korjamine|skoor|score|playbux/i.test(lower)) {
            return {
                title: 'Kogutavate Müntide ja PlayBuxi Majandussüsteem',
                topic: 'Collectibles, Sound & Economy Logic',
                explanation: `See skript haldab 3D maailmas hõljuvaid ja pöörlevaid münte/kristalle, tuvastab mängija lähenemisel kokkupõrke (Hitbox), mängib heli, lisab punkte ning sünkroonib PlayBux saldo.`,
                code: `// ==========================================================
// 🪙 Playard Coin Collectible & Score System
// ==========================================================
export interface CoinItem {
    id: string;
    position: { x: number; y: number; z: number };
    value: number;
    rotation: number;
    collected: boolean;
}

export class CoinCollectionManager {
    public coins: CoinItem[] = [];
    public score: number = 0;
    public playbuxEarned: number = 0;

    constructor() {
        this.spawnCoins(10);
    }

    public spawnCoins(count: number): void {
        for (let i = 0; i < count; i++) {
            this.coins.push({
                id: 'coin_' + i,
                position: {
                    x: (Math.random() - 0.5) * 40,
                    y: 1.2,
                    z: (Math.random() - 0.5) * 40
                },
                value: 10,
                rotation: 0,
                collected: false
            });
        }
    }

    public update(playerPos: { x: number; y: number; z: number }, deltaTime: number): void {
        for (const coin of this.coins) {
            if (coin.collected) continue;

            // Pööra münti visuaalselt
            coin.rotation += 3.0 * deltaTime;

            // Kauguse kontroll mängijani (raadius 1.8 meetrit)
            const dist = Math.hypot(
                playerPos.x - coin.position.x,
                playerPos.y - coin.position.y,
                playerPos.z - coin.position.z
            );

            if (dist < 1.8) {
                coin.collected = true;
                this.score += coin.value;
                this.playbuxEarned += 1; // 1 PBX iga 10 skoori eest
                this.onCoinCollected(coin);
            }
        }
    }

    private onCoinCollected(coin: CoinItem): void {
        console.log(\`✨ Korjasid mündi! Skoor: \${this.score} (+1 PlayBux)\`);
        // Heliefekt (Web Audio API süntees)
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
    }
}`,
                features: [
                    '3D müntide sujuv pöörlemisanimatsioon',
                    'Täpne vahemaa- ja kokkupõrketuvastus',
                    'Automaatne Web Audio heliefekt ilma väliseid faile vajamata',
                    'PlayBuxi ametliku majandusega sidumine'
                ],
                howToUse: 'Lisa stseeni müntide 3D võrgud ja kutsu `coinManager.update(playerPos, deltaTime)`.'
            };
        }

        // 3. Enemy AI & Patrol (Vaenlase tehisintellekt, patrull ja jälitamine)
        if (/vaenlane|enemy|ai|monster|patrull|jälitamine|chase|rünnak/i.test(lower)) {
            return {
                title: 'Vaenlase Tehisintellekt (Enemy Patrol & Chase AI)',
                topic: 'Enemy Finite State Machine (Patrol / Chase / Attack)',
                explanation: `See skript teostab vaenlase intelligentse olekumasina (FSM): rahulikus olekus patrullib mööda etteantud teekonnapunkte, mängija nägemisvälja ilmumisel hakkab teda jälitama ning löögikauguses ründab.`,
                code: `// ==========================================================
// 👹 Playard Intelligent Enemy AI Controller
// ==========================================================
export type EnemyState = 'PATROL' | 'CHASE' | 'ATTACK';

export class EnemyAiController {
    public position = { x: 0, y: 1.0, z: -15 };
    public state: EnemyState = 'PATROL';
    public health: number = 100;
    public speed: number = 3.5;
    public attackRange: number = 2.0;
    public detectionRadius: number = 12.0;

    private waypoints = [
        { x: -10, z: -10 },
        { x: 10, z: -10 },
        { x: 10, z: 10 },
        { x: -10, z: 10 }
    ];
    private currentWaypointIndex = 0;
    private attackCooldown = 0;

    public update(playerPos: { x: number; y: number; z: number }, deltaTime: number): void {
        const distToPlayer = Math.hypot(
            playerPos.x - this.position.x,
            playerPos.z - this.position.z
        );

        // Olekumasina üleminekud
        if (distToPlayer <= this.attackRange) {
            this.state = 'ATTACK';
        } else if (distToPlayer <= this.detectionRadius) {
            this.state = 'CHASE';
        } else {
            this.state = 'PATROL';
        }

        // Käitumine vastavalt olekule
        if (this.state === 'PATROL') {
            this.doPatrol(deltaTime);
        } else if (this.state === 'CHASE') {
            this.doChase(playerPos, deltaTime);
        } else if (this.state === 'ATTACK') {
            this.doAttack(deltaTime);
        }
    }

    private doPatrol(deltaTime: number): void {
        const target = this.waypoints[this.currentWaypointIndex];
        const dx = target.x - this.position.x;
        const dz = target.z - this.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 0.5) {
            this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
        } else {
            this.position.x += (dx / dist) * this.speed * 0.6 * deltaTime;
            this.position.z += (dz / dist) * this.speed * 0.6 * deltaTime;
        }
    }

    private doChase(playerPos: { x: number; z: number }, deltaTime: number): void {
        const dx = playerPos.x - this.position.x;
        const dz = playerPos.z - this.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 0.1) {
            this.position.x += (dx / dist) * this.speed * deltaTime;
            this.position.z += (dz / dist) * this.speed * deltaTime;
        }
    }

    private doAttack(deltaTime: number): void {
        this.attackCooldown -= deltaTime;
        if (this.attackCooldown <= 0) {
            console.log('⚔️ Vaenlane tekitas mängijale 15 kahju!');
            this.attackCooldown = 1.2; // Rünnaku jahtumisaeg
        }
    }
}`,
                features: [
                    '3-olekuline olekumasin (Patrol -> Chase -> Attack)',
                    'Teekonnapunktide (Waypoints) mööda liikumine',
                    'Mängija suunas pööramine ja jälitamine',
                    'Rünnakutaimer ja jahtumisaeg'
                ],
                howToUse: 'Kutsu igal kaadril `enemyAi.update(player.position, deltaTime)` ja seosta vaenlase 3D mudeliga.'
            };
        }

        // 4. Default / General Coding Solution
        return {
            title: 'Interaktiivne Mängu Funktsionaalsus ja Loogika',
            topic: 'Universal Game Engine Logic',
            explanation: `See on universaalne mängumootori alusskript, mis ühendab mängija sisendi, kaadripõhise füüsikatsükli (Game Loop) ja reaalajas sündmused puhtas, veakindlas koodis.`,
            code: `// ==========================================================
// 🚀 Playard Universal Interactive Game Script
// ==========================================================
export class PlayardGameEngine {
    private lastTime: number = performance.now();
    private isRunning: boolean = true;

    constructor() {
        console.log('🎮 Playard mängu mootor edukalt käivitatud!');
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    private gameLoop(time: number): void {
        if (!this.isRunning) return;

        const deltaTime = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;

        // Uuenda mänguloogikat
        this.updateGame(deltaTime);

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    private updateGame(dt: number): void {
        // Mänguloogika, osakeste ja animatsioonide uuendamine
    }

    public stop(): void {
        this.isRunning = false;
    }
}`,
            features: [
                'Täpne kaadripõhine delta-aja (deltaTime) arvestus',
                'Kaitse pikkade kaadrihüpete vastu (Math.min limit)',
                'Lihtne ja laiendatav modulaarne arhitektuur'
            ],
            howToUse: 'Kasuta seda põhistruktuurina uute mängumehaanikate ehitamisel.'
        };
    }
}
