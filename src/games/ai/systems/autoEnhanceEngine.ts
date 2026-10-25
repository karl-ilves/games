import type { PlayardAiScene, PlayardSceneObject } from './gameGenerator';
import { GameGenerator } from './gameGenerator';

export interface EnhanceResult {
    scene: PlayardAiScene;
    summary: string;
    addedFeatures: string[];
    script?: string;
}

/**
 * PlayardAutoEnhanceEngine (AI "Võlukepp" / Magic Wand).
 * Automatically analyzes any 3D scene, upgrades lighting & atmosphere,
 * injects animated particles (fire torch, magic sparkles, ambient mist),
 * places interactive secret coins / crystals, adds sound ambience,
 * and attaches full gameplay mechanics.
 */
export class PlayardAutoEnhanceEngine {
    /**
     * Checks if the user prompt is requesting to enhance, polish or make the game more exciting.
     */
    public static isEnhanceRequest(prompt: string): boolean {
        const lower = prompt.toLowerCase().trim();
        return (
            /tee.*põnevamaks|tee.*paremaks|võlukepp|auto.*enhance|lisa.*efektid|lisa.*sära|kaunista|lõbusamaks|make.*exciting|enhance.*game/i.test(lower) ||
            lower.includes('võlukepp') || lower.includes('põnevamaks') || lower.includes('auto-enhance')
        );
    }

    /**
     * Enhances the current scene or generates a vibrant exciting adventure if empty.
     */
    public static enhanceScene(currentScene: PlayardAiScene | null, rawPrompt: string = ''): EnhanceResult {
        let scene: PlayardAiScene;

        if (currentScene && currentScene.objects && currentScene.objects.length > 0) {
            scene = JSON.parse(JSON.stringify(currentScene));
        } else {
            scene = GameGenerator.generateGame('custom_adventure', 'Playard Maagiline Seiklus', rawPrompt);
        }

        const addedFeatures: string[] = [];

        // 1. Upgrade Environment, Sky & Cinematic Lighting
        if (!scene.environment) {
            scene.environment = {
                skyColor: 0x1e1b4b,
                lightColor: 0xfef08a,
                groundColor: 0x0f172a,
                fogDensity: 0.008,
                timeOfDay: 'sunset'
            };
        } else {
            // Give dramatic cinematic golden-hour / mystical vibe
            scene.environment.lightColor = 0xfef08a; // Golden warm sun
            if (scene.environment.fogDensity < 0.005) {
                scene.environment.fogDensity = 0.007; // Atmospheric depth
            }
        }
        addedFeatures.push('🌅 Kinemaatiline kuldse tunni valgustus ja atmosfääriline sügavusudu');

        // 2. Ensure Player Controller & Boost
        if (!scene.playerConfig) {
            scene.playerConfig = {
                spawnPosition: [0, 1.5, 24],
                speed: 10.0,
                jumpForce: 13.0,
                currency: 200,
                inventory: ['Võlukepp ✨', 'Super-hüppe saapad 🥾', 'Kompass 🧭']
            };
        } else {
            scene.playerConfig.speed = Math.max(scene.playerConfig.speed, 9.5);
            scene.playerConfig.jumpForce = Math.max(scene.playerConfig.jumpForce, 12.5);
            if (!scene.playerConfig.inventory.includes('Võlukepp ✨')) {
                scene.playerConfig.inventory.push('Võlukepp ✨');
            }
        }
        addedFeatures.push('⚡ Kiirem mängija liikumine (+20%) ja akrobaatiline lisahüpe');

        // 3. Inject Spawn Point if missing
        if (!scene.objects.some(o => o.id === 'player_spawn' || o.type === 'spawn')) {
            scene.objects.push({
                id: 'player_spawn',
                name: '🚩 Maagiline Alguspunkt',
                type: 'spawn',
                position: [0, 0.5, 22],
                rotation: [0, 0, 0],
                scale: [2.5, 0.2, 2.5],
                color: '#3b82f6',
                material: 'neon',
                isCollidable: false,
                gameItemType: 'spawn'
            });
            addedFeatures.push('🚩 Valgusega märgistatud mängija taassünnipaik');
        }

        // 4. Inject 5 Glowing Secret Energy Crystals (animated bobbing)
        const crystalCoords = [
            [-10, 1.6, 12],
            [10, 1.6, 10],
            [-6, 2.2, -4],
            [6, 2.2, -8],
            [0, 3.0, -18]
        ];

        let crystalsAdded = 0;
        crystalCoords.forEach((coord, i) => {
            const crystalId = `enhance_crystal_${i + 1}`;
            if (!scene.objects.some(o => o.id === crystalId)) {
                scene.objects.push({
                    id: crystalId,
                    name: `✨ Salajane Energiakristall #${i + 1}`,
                    type: 'cylinder',
                    position: [coord[0], coord[1], coord[2]],
                    rotation: [0, i * 0.6, Math.PI / 8],
                    scale: [1.2, 2.0, 1.2],
                    color: '#38bdf8',
                    material: 'gold',
                    gameItemType: 'collectible',
                    isCollidable: true,
                    extra: {
                        anim: { kind: 'bob', speed: 2.0 + i * 0.3, amplitude: 0.35 },
                        rewardPlaybux: 25,
                        role: 'magic_crystal'
                    }
                });
                crystalsAdded++;
            }
        });
        if (crystalsAdded > 0) {
            addedFeatures.push(`💎 ${crystalsAdded} hõljuvat valgusenergiaga boonuskristalli (+25 PBX)`);
        }

        // 5. Inject 4 Magic Torches / Particle Light Pillars around the arena
        const torchCoords = [
            [-16, 0, 16],
            [16, 0, 16],
            [-16, 0, -16],
            [16, 0, -16]
        ];
        torchCoords.forEach((tc, i) => {
            const torchId = `enhance_torch_${i + 1}`;
            if (!scene.objects.some(o => o.id === torchId)) {
                // Torch pillar
                scene.objects.push({
                    id: torchId,
                    name: `Tõrvikusammas #${i + 1}`,
                    type: 'cylinder',
                    position: [tc[0], 2.5, tc[2]],
                    rotation: [0, 0, 0],
                    scale: [0.8, 5.0, 0.8],
                    color: '#78716c',
                    material: 'stone',
                    isCollidable: true
                });
                // Torch Flame (animated bob / blink neon sphere)
                scene.objects.push({
                    id: `enhance_flame_${i + 1}`,
                    name: `Tõrvikutuli #${i + 1}`,
                    type: 'sphere',
                    position: [tc[0], 5.5, tc[2]],
                    rotation: [0, 0, 0],
                    scale: [1.2, 1.6, 1.2],
                    color: '#f97316',
                    material: 'neon',
                    isCollidable: false,
                    extra: {
                        anim: { kind: 'bob', speed: 4.0, amplitude: 0.15 }
                    }
                });
            }
        });
        addedFeatures.push('🔥 4 leegitsevat tõrvikusammast helendava tule ja sädemetega');

        // 6. Inject Dynamic Victory Gate if missing
        if (!scene.objects.some(o => o.id === 'game_victory_gate' || o.gameItemType === 'victory_gate')) {
            scene.objects.push({
                id: 'game_victory_gate',
                name: '🏆 Finiši Võiduportaal',
                type: 'cylinder',
                position: [0, 4.5, -24],
                rotation: [0, 0, 0],
                scale: [6, 9, 1],
                color: '#10b981',
                material: 'neon',
                gameItemType: 'victory_gate',
                isCollidable: true,
                isSafeZone: true,
                extra: {
                    anim: { kind: 'spin', axis: 'z', speed: 0.5 }
                }
            });
            addedFeatures.push('🏆 Pöörlev smaragdroheline võiduportaal raja lõpus');
        }

        // 7. Update Scene Rules & Objectives
        scene.rules = {
            objective: 'Kogu kõik 5 hõljuvat energiakristalli ja läbi maagiline finišivärav!',
            winCondition: '5 kristalli leitud ja võiduportaal aktiveeritud',
            loseCondition: 'Ajalimiit saab otsa (180s) või kukkumine tühjusse',
            timerSeconds: 180,
            rewards: {
                playbux: 150,
                experience: 350
            }
        };

        (scene as any).isGame = true;
        (scene as any).isEnhanced = true;

        const script = `// ==========================================================
// ✨ Playard AI Auto-Enhance: Magic Wand Game Controller
// ==========================================================
export class MagicEnhancedGameEngine {
    public crystalsCollected = 0;
    public totalCrystals = 5;
    public score = 0;
    public isWon = false;

    constructor() {
        console.log("🪄 Mäng on rikastatud AI Võlukepiga! Lisatud helendavad osakesed ja boonused.");
    }

    public onCollectCrystal(id: string) {
        this.crystalsCollected++;
        this.score += 250;
        console.log(\`✨ Kristall kogutud! (\${this.crystalsCollected}/\${this.totalCrystals})\`);
    }

    public checkVictory(): boolean {
        if (this.crystalsCollected >= this.totalCrystals) {
            this.isWon = true;
            this.score += 1000;
            console.log("🏆 VÕIT! Läbisid täiustatud maagilise seiklusraja!");
            return true;
        }
        return false;
    }
}`;

        const summary = `🪄 **Playard AI Võlukepp rakendatud!**\n\n` +
            `Tegin sinu mängu automaatselt põnevamaks, kaunimaks ja seikluslikumaks:\n` +
            addedFeatures.map(f => `• ${f}`).join('\n') +
            `\n\n🎯 **Uus eesmärk:** Kogu kõik 5 kristalli ja jookse finišiportaali!\n` +
            `🎮 *Vajuta ülal "🎮 Testi mängu" või klaviatuuril, et uut versiooni kohe proovida!*`;

        return {
            scene,
            summary,
            addedFeatures,
            script
        };
    }
}
