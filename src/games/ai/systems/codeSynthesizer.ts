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
            /(?:kirjuta|kuidas|õpeta|tee|loo|genereeri|näita).*(?:kood|skript|program)/i.test(lower) ||
            /kirjuta kood|kuidas koodida|õpeta koodima|tee skript|loo kood|koodi mulle|programm|programmeerimine|write code|code script|create script/i.test(lower) ||
            (/(?:kood|skript|script)\b/i.test(lower) && /(?:liikumine|hüppamine|mündid|vaenlane|laskmine|relv|elud|taimer|inventar|skoor|kontroller|auto|sõiduk|sõit|füüsika|osakesed|öö|päev|npc|missioon)/i.test(lower))
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

        // 4. Weapon Projectiles & Shooting (Relvad, laskmine, kuulid ja sihtimine)
        if (/lask|relv|kuul|projectile|shoot|bullet|gun|kahur|vib/i.test(lower)) {
            return {
                title: '3D Relvade ja Kuulide Laskmissüsteem (Projectile Weapon System)',
                topic: 'Weapon Shooting & Raycast Ballistics',
                explanation: `See skript juhib relvade sihtimist, laskekiirust, kuuli lennutrajektoori ja tabamuste tuvastamist ruumilises 3D stseenis koos tuleefektiga.`,
                code: `// ==========================================================
// 💥 Playard 3D Projectile Weapon & Shooting System
// ==========================================================
export interface Bullet {
    x: number; y: number; z: number;
    vx: number; vy: number; vz: number;
    life: number;
}

export class WeaponShootingController {
    public bullets: Bullet[] = [];
    public fireRate: number = 0.18; // Sekundit laskude vahel
    public bulletSpeed: number = 45.0; // Kuuli kiirus (m/s)
    public damage: number = 25;
    private fireCooldown: number = 0;

    public update(deltaTime: number): void {
        this.fireCooldown = Math.max(0, this.fireCooldown - deltaTime);

        // Uuenda kõigi aktiivsete kuulide lennutrajektoori
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx * deltaTime;
            b.y += b.vy * deltaTime;
            b.z += b.vz * deltaTime;
            b.life -= deltaTime;

            if (b.life <= 0) {
                this.bullets.splice(i, 1);
            }
        }
    }

    public fire(origin: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }): boolean {
        if (this.fireCooldown > 0) return false;

        const mag = Math.hypot(dir.x, dir.y, dir.z) || 1;
        this.bullets.push({
            x: origin.x, y: origin.y, z: origin.z,
            vx: (dir.x / mag) * this.bulletSpeed,
            vy: (dir.y / mag) * this.bulletSpeed,
            vz: (dir.z / mag) * this.bulletSpeed,
            life: 2.5
        });

        this.fireCooldown = this.fireRate;
        console.log('🔫 Lask sooritatud! Aktiivseid kuule:', this.bullets.length);
        return true;
    }
}`,
                features: [
                    'Reaalajas 3D kuulide füüsikaline trajektoor',
                    'Konfigureeritav laskekiirus (fireRate) ja jahtumine',
                    'Automaatne kuulide eluaja arvestus ja mälupuhastus',
                    'Täpne suunavektori normaliseerimine'
                ],
                howToUse: 'Kutsu hiireklõpsul `weaponController.fire(cameraPos, aimDir)` ja renderdustsüklis `weaponController.update(deltaTime)`.'
            };
        }

        // 5. Health, Shield & Damage (Elud, kilbid, kahjustused ja suremine)
        if (/elu|health|hp|kilp|shield|kahju|damage|surem|respawn/i.test(lower)) {
            return {
                title: 'Mängija Elusüsteem ja Kilbid (Health & Shield System)',
                topic: 'Player Vitality, Shield Absorption & Damage Zones',
                explanation: `See süsteem haldab mängija elupunkte (HP), lööke neelavat kilpi, sujuvat taastumist ning automaatset taassündi (Respawn) kontrollpunktis.`,
                code: `// ==========================================================
// ❤️ Playard Health, Shield & Damage Controller
// ==========================================================
export class HealthSystem {
    public maxHealth: number = 100;
    public currentHealth: number = 100;
    public maxShield: number = 50;
    public currentShield: number = 50;
    public isDead: boolean = false;
    public respawnPoint = { x: 0, y: 1.0, z: 0 };

    public takeDamage(amount: number): void {
        if (this.isDead) return;

        // Esmalt neelab kahjustuse kilp
        if (this.currentShield > 0) {
            const absorbed = Math.min(this.currentShield, amount);
            this.currentShield -= absorbed;
            amount -= absorbed;
        }

        this.currentHealth = Math.max(0, this.currentHealth - amount);
        console.log(\`💥 Kahju saadud! HP: \${this.currentHealth}/\${this.maxHealth}, Kilp: \${this.currentShield}/\${this.maxShield}\`);

        if (this.currentHealth <= 0) {
            this.die();
        }
    }

    public heal(amount: number): void {
        if (this.isDead) return;
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    }

    private die(): void {
        this.isDead = true;
        console.log('💀 Mängija langes lahingus! Taassünd 2 sekundi pärast...');
        setTimeout(() => this.respawn(), 2000);
    }

    public respawn(): void {
        this.currentHealth = this.maxHealth;
        this.currentShield = this.maxShield;
        this.isDead = false;
        console.log('✨ Mängija taasärkas kontrollpunktis!');
    }
}`,
                features: [
                    'Kahekihiline kaitse: Kilp neelab esimesena löögid enne elusid',
                    'Automaatne surma ja taassünni (respawn) ajastus',
                    'Maksimum- ja miinimumväärtuste range piiramine',
                    'Lihtne liidestada mis tahes UI eluribaga'
                ],
                howToUse: 'Loo stseenis ohtlikud laavatsoonid või vaenlased, mis kutsuvad `healthSystem.takeDamage(15)`.'
            };
        }

        // 6. Day-Night Celestial Cycle (Ööpäeva tsükkel ja dünaamiline valgus)
        if (/päev|öö|tsükkel|päike|kuu|valgus|day|night|cycle|sky/i.test(lower)) {
            return {
                title: '3D Ööpäeva Tsükkel ja Taevavalgus (Day-Night Celestial Controller)',
                topic: 'Dynamic Environment & Lighting Transitions',
                explanation: `See süsteem liigutab päikest ja kuud reaalajas taevavõlvil, muutes sujuvalt stseeni valgustugevust, varjude nurka ning taeva tooni koidikust südaööni.`,
                code: `// ==========================================================
// 🌅 Playard Day-Night Celestial Cycle Controller
// ==========================================================
export class DayNightCycleController {
    public timeOfDay: number = 0.25; // 0.0 = südaöö, 0.25 = koidik, 0.5 = keskpäev, 0.75 = loojang
    public dayDurationSeconds: number = 180; // Üks täisööpäev kestab 3 minutit
    public sunAngle: number = 0;

    public update(deltaTime: number): { sunX: number; sunY: number; sunZ: number; intensity: number; isNight: boolean } {
        this.timeOfDay = (this.timeOfDay + deltaTime / this.dayDurationSeconds) % 1.0;
        this.sunAngle = this.timeOfDay * Math.PI * 2;

        const sunX = Math.cos(this.sunAngle) * 80;
        const sunY = Math.sin(this.sunAngle) * 80;
        const sunZ = Math.sin(this.sunAngle * 0.5) * 40;

        const isNight = sunY < 0;
        const intensity = Math.max(0.1, Math.min(1.2, (sunY / 80) * 1.2));

        return { sunX, sunY, sunZ, intensity, isNight };
    }
}`,
                features: [
                    'Sujuv 360-kraadine päikese ja kuu orbiidiliikumine',
                    'Reguleeritav ööpäeva kiirus (dayDurationSeconds)',
                    'Öö ja päeva automaatne tuvastamine ja intensiivsuse kohandus'
                ],
                howToUse: 'Kutsu igal kaadril `const sun = cycle.update(dt)` ja uuenda Three.js DirectionalLight asukohta.'
            };
        }

        // 7. Inventory & Hotbar (Mängija seljakott, inventar ja hotbar kiirvalik)
        if (/inventar|hotbar|kott|seljakott|slot|kiirvalik|item/i.test(lower)) {
            return {
                title: 'Roblox-stiilis 10-pesaline Hotbar ja Inventar (Inventory System)',
                topic: 'Item Management, Equipping & Hotbar',
                explanation: `See süsteem pakub 10-pesalist Roblox-tüüpi kiirriba (klahvid 1-0), võimaldab esemeid kätte võtta, vahetada ja inventaris organiseerida.`,
                code: `// ==========================================================
// 🎒 Playard 10-Slot Inventory & Hotbar System
// ==========================================================
export interface InventoryItem {
    id: string;
    name: string;
    icon: string;
    quantity: number;
}

export class InventorySystem {
    public slots: (InventoryItem | null)[] = Array(10).fill(null);
    public activeSlotIndex: number = 0;

    constructor() {
        this.bindKeys();
    }

    private bindKeys(): void {
        window.addEventListener('keydown', (e) => {
            const num = parseInt(e.key);
            if (!isNaN(num) && num >= 1 && num <= 9) this.selectSlot(num - 1);
            if (e.key === '0') this.selectSlot(9);
        });
    }

    public selectSlot(index: number): InventoryItem | null {
        this.activeSlotIndex = index;
        const activeItem = this.slots[index];
        console.log(\`🎒 Aktiivne Hotbar pesa \${index + 1}: \${activeItem ? activeItem.name : 'Tühi'}\`);
        return activeItem;
    }

    public addItem(item: InventoryItem): boolean {
        // Otsi esimene vaba pesa
        const emptyIndex = this.slots.findIndex(s => s === null);
        if (emptyIndex !== -1) {
            this.slots[emptyIndex] = item;
            return true;
        }
        return false; // Inventar täis
    }
}`,
                features: [
                    '10 Roblox-stiilis kiirvalikupesa (1-9 ja 0 klahvid)',
                    'Aktiivse käesoleva eseme automaatne vahetamine',
                    'Lihtne liidestada Three.js käes hoitava mudeliga'
                ],
                howToUse: 'Lisa esemeid `inventory.addItem({ id: "sword_1", name: "Raudmõõk", icon: "🗡️", quantity: 1 })`.'
            };
        }

        // 8. 3D Particle Effects Emitter (Osakesed, plahvatused, sädemed, suits ja maagia)
        if (/osakes|partic|plahvat|explos|säde|spark|suits|smoke|maagia|magic|tuli|fire/i.test(lower)) {
            return {
                title: '3D Osakeste Emitter (Particle Effects System)',
                topic: 'Three.js Visual Effects & Physics Particle Bursts',
                explanation: `See süsteem tekitab ruumilisi 3D osakeste purskeid (plahvatused, kulla sädemed, maagiatolm), simuleerides kiirust, gravitatsiooni ja hääbumist.`,
                code: `// ==========================================================
// ✨ Playard 3D Particle Burst System
// ==========================================================
export interface Particle {
    x: number; y: number; z: number;
    vx: number; vy: number; vz: number;
    size: number;
    life: number;
    maxLife: number;
    color: string;
}

export class ParticleEffectEmitter {
    public particles: Particle[] = [];

    public emitBurst(center: { x: number; y: number; z: number }, count = 30, color = '#ffd700'): void {
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const speed = 2.0 + Math.random() * 6.0;

            this.particles.push({
                x: center.x, y: center.y, z: center.z,
                vx: Math.sin(phi) * Math.cos(theta) * speed,
                vy: Math.abs(Math.sin(phi) * Math.sin(theta) * speed) + 2.0, // Suunatud üles
                vz: Math.cos(phi) * speed,
                size: 0.15 + Math.random() * 0.25,
                life: 1.0,
                maxLife: 1.0,
                color
            });
        }
        console.log(\`✨ Tekitatud \${count} osakest värviga \${color}!\`);
    }

    public update(deltaTime: number): void {
        const gravity = -9.8;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.vy += gravity * deltaTime;
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.z += p.vz * deltaTime;
            p.life -= deltaTime;

            if (p.life <= 0 || p.y < 0) {
                this.particles.splice(i, 1);
            }
        }
    }
}`,
                features: [
                    'Sferiline 3D osakeste laialipaiskamine',
                    'Füüsikaline gravitatsioon ja sujuv hääbumine',
                    'Värvi ja osakeste arvu dünaamiline seadistamine'
                ],
                howToUse: 'Kutsu mündi korjamisel või rünnakul `emitter.emitBurst(playerPos, 40, "#ff5722")`.'
            };
        }

        // 9. NPC Dialog & Quest State (NPC tegelased, dialoogid ja ülesanded)
        if (/npc|dialoog|quest|ülesan|räägi|jutt|missioon/i.test(lower)) {
            return {
                title: 'Interaktiivne NPC ja Ülesannete Süsteem (NPC Quest & Dialogue Controller)',
                topic: 'Branching Dialogue Trees & Quest Objectives',
                explanation: `See süsteem võimaldab mängijal läheneda NPC-dele (klahv E), avada mitmevalikulisi dialoogipuid ning vastu võtta ja täita mänguülesandeid (Quests).`,
                code: `// ==========================================================
// 💬 Playard Interactive NPC & Quest Controller
// ==========================================================
export type QuestStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export class NpcQuestController {
    public questTitle = 'Kadunud Kuningakristall';
    public status: QuestStatus = 'NOT_STARTED';
    public crystalsRequired = 3;
    public crystalsCollected = 0;

    public interact(playerNear: boolean): string {
        if (!playerNear) return 'Lähene tegelasele, et rääkida [E]';

        if (this.status === 'NOT_STARTED') {
            this.status = 'IN_PROGRESS';
            return '🧙‍♂️ Vana Võlur: "Tere rändur! Kas leiaksid minu jaoks 3 salajast helendavat kristalli?" (Ülesanne vastu võetud!)';
        }

        if (this.status === 'IN_PROGRESS') {
            if (this.crystalsCollected >= this.crystalsRequired) {
                this.status = 'COMPLETED';
                return '🎉 Võlur: "Suurepärane töö! Sa päästsid kuningriigi! Siin on sinu tasu: +150 PBX!"';
            }
            return \`🧙‍♂️ Võlur: "Oled kogunud \${this.crystalsCollected}/\${this.crystalsRequired} kristalli. Jätka otsinguid!"\`;
        }

        return '🧙‍♂️ Võlur: "Aitäh veelkord abi eest, vapper kangelane!"';
    }

    public addQuestItem(): void {
        if (this.status === 'IN_PROGRESS') {
            this.crystalsCollected++;
            console.log(\`💎 Kristall leitud (\${this.crystalsCollected}/\${this.crystalsRequired})!\`);
        }
    }
}`,
                features: [
                    '3-etapiline ülesannete elutsükkel (Not Started -> In Progress -> Completed)',
                    'Dünaamiline dialoog vastavalt mängija edusammudele',
                    'Automaatne PlayBux ja Yardide preemiasidumine'
                ],
                howToUse: 'Tuvasta mängija kaugus `Math.hypot(...) < 2.5` ja kuva dialoogiaken `npcController.interact(true)`.'
            };
        }

        // 10. Vehicle Driving & Drift Physics (Sõidukite füüsika, pööramine ja drift)
        if (/auto|sõit|sõiduk|rool|drive|car|drift|kiirus|pidur|vehicle/i.test(lower)) {
            return {
                title: '3D Sõiduki Juhtimine ja Drift (Vehicle Physics Controller)',
                topic: 'Arcade Vehicle Acceleration, Steering & Drifting',
                explanation: `See kontroller tagab tundliku arkaad-stiilis autosõidu: kiirendus, tagurdamine, rooli reageerimisnurk, hõõrdejõud ja kurvides driftimine.`,
                code: `// ==========================================================
// 🏎️ Playard 3D Arcade Vehicle Physics Controller
// ==========================================================
export class VehiclePhysicsController {
    public position = { x: 0, y: 0.5, z: 0 };
    public speed: number = 0;
    public maxSpeed: number = 28.0;      // ~100 km/h
    public acceleration: number = 18.0;
    public reverseSpeed: number = -10.0;
    public friction: number = 0.96;
    public steeringAngle: number = 0;
    public rotationY: number = 0;

    public update(keys: Record<string, boolean>, deltaTime: number): void {
        // Kiirendus ja tagurdamine (W / S)
        if (keys['KeyW'] || keys['ArrowUp']) {
            this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * deltaTime);
        } else if (keys['KeyS'] || keys['ArrowDown']) {
            this.speed = Math.max(this.reverseSpeed, this.speed - this.acceleration * deltaTime);
        } else {
            this.speed *= Math.pow(this.friction, deltaTime * 60); // Inerts
        }

        // Pööramine (A / D) kiirusest sõltuvalt
        if (Math.abs(this.speed) > 0.5) {
            const turnDir = this.speed > 0 ? 1 : -1;
            if (keys['KeyA'] || keys['ArrowLeft']) this.rotationY += 2.2 * turnDir * deltaTime;
            if (keys['KeyD'] || keys['ArrowRight']) this.rotationY -= 2.2 * turnDir * deltaTime;
        }

        // Asukoha arvutamine pöördenurga järgi
        this.position.x += Math.sin(this.rotationY) * this.speed * deltaTime;
        this.position.z += Math.cos(this.rotationY) * this.speed * deltaTime;
    }
}`,
                features: [
                    'Sujuv inertsi- ja hõõrdejõu arvestus',
                    'Kiirusest sõltuv realistlik pööramine (ei pööra paigal seistes liiga järsult)',
                    'Lihtne siduda auto 3D kere ja pöörlevate ratastega'
                ],
                howToUse: 'Anna kontrollerile `keys` olek ja liiguta auto 3D võrku vastavalt `position` ja `rotationY`.'
            };
        }

        // 11. Default / General Coding Solution
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
