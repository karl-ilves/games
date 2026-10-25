import type { PlayardAiScene, PlayardSceneObject } from './gameGenerator';
import { GameGenerator } from './gameGenerator';

/**
 * Playard Game Maker Engine.
 * Converts ANY 3D scene, creation, or user prompt into an interactive, fully playable game
 * complete with objectives, player physics, collectibles, hazards, scoring, and win/loss rules.
 */
export class PlayardGameMaker {
    /**
     * Checks if the user prompt is asking to turn an object, scene, or idea into a playable game.
     */
    public static isGameMakerRequest(prompt: string): boolean {
        const lower = prompt.toLowerCase().trim();
        return (
            /tee.*mänguks|muuda.*mänguks|pane.*mängima|mängu mänguks teha|tee sellest mäng|lisa mängitavus|tee see mänguks|make this a game|turn into game/i.test(lower) ||
            (lower.includes('mänguks') && (lower.includes('tee') || lower.includes('muuda') || lower.includes('pane')))
        );
    }

    /**
     * Transforms the current scene into an interactive playable game.
     */
    public static transformToPlayableGame(currentScene: PlayardAiScene | null, rawPrompt: string): {
        scene: PlayardAiScene;
        summary: string;
        script: string;
    } {
        let scene: PlayardAiScene;

        if (currentScene && currentScene.objects && currentScene.objects.length > 0) {
            // Clone existing scene so we preserve user's custom 3D models
            scene = JSON.parse(JSON.stringify(currentScene));
        } else {
            // If empty, generate a fresh world
            scene = GameGenerator.generateGame('custom_adventure', 'Playard 3D Seiklusmäng', rawPrompt);
        }

        const sceneTitle = scene.title || 'Playard 3D Mäng';

        // 1. Configure Player
        scene.playerConfig = {
            spawnPosition: [0, 1.5, 28],
            speed: 8.5,
            jumpForce: 12.0,
            currency: 100,
            inventory: ['Põhivarustus', 'Kompass']
        };

        // 2. Derive intelligent objective from scene content
        let objective = 'Läbi seiklusrada, kogu kõik 5 kristallmünti ja jõua võiduväravani!';
        let winCondition = 'Kogutud 5 münti ja jõutud finišisse';
        let loseCondition = 'Elud otsas või kukkumine ohtlikku tsooni';

        const hasPlane = scene.objects.some(o => o.name?.toLowerCase().includes('lennuk') || o.name?.toLowerCase().includes('kere'));
        const hasCastle = scene.objects.some(o => o.name?.toLowerCase().includes('loss') || o.name?.toLowerCase().includes('torn'));
        const hasCar = scene.objects.some(o => o.name?.toLowerCase().includes('auto') || o.name?.toLowerCase().includes('sõiduk'));

        if (hasPlane) {
            objective = 'Jõua lennuki piloodikabiini, aktiveeri reaktiivmootorid ja stardi enne aja lõppu!';
            winCondition = 'Piloodikabiinis mootorid käivitatud';
        } else if (hasCastle) {
            objective = 'Uuri lossi, kogu salajased aardekirstud ja alista lossi valvur!';
            winCondition = '3 aardekirstu avatud ja lossi troonisaal vabastatud';
        } else if (hasCar) {
            objective = 'Sõida autoga läbi kontrollpunktide ja ületa finišijoon rekordajaga!';
            winCondition = 'Kõik kontrollpunktid läbitud';
        }

        scene.rules = {
            objective,
            winCondition,
            loseCondition,
            timeLimitSeconds: 120,
            rewards: {
                playbux: 100,
                experience: 250
            }
        };

        (scene as any).isGame = true;

        // 3. Inject Player Spawn Point
        const newObjects: PlayardSceneObject[] = [...scene.objects];
        newObjects.push({
            id: 'player_spawn',
            name: '🚩 Mängija Alguspunkt (Spawn)',
            type: 'spawn',
            position: [0, 0.5, 28],
            rotation: [0, 0, 0],
            scale: [2, 0.2, 2],
            color: '#3b82f6',
            isCollidable: false,
            gameItemType: 'spawn'
        });

        // 4. Inject Interactive Collectibles (5 Glowing Crystals)
        const coinOffsets = [
            [-8, 1.5, 18],
            [8, 1.5, 12],
            [-5, 1.5, 4],
            [6, 1.5, -6],
            [0, 1.8, -14]
        ];

        coinOffsets.forEach((pos, idx) => {
            newObjects.push({
                id: `game_crystal_${idx + 1}`,
                name: `✨ Kristallmünt #${idx + 1}`,
                type: 'sphere',
                position: pos as [number, number, number],
                rotation: [0, 0, 0],
                scale: [0.9, 0.9, 0.9],
                color: idx % 2 === 0 ? '#38bdf8' : '#facc15',
                material: 'neon',
                isCollidable: false,
                gameItemType: 'collectible',
                extra: {
                    anim: { kind: 'bob', speed: 2, amplitude: 0.3 }
                },
                script: `// Münt #${idx + 1}
if (distanceToPlayer < 1.8) {
    collectCoin(10);
    playSound('coin_pickup');
    destroySelf();
}`
            });
        });

        // 4. Inject Victory Checkpoint / Finish Gate
        newObjects.push({
            id: 'game_victory_gate',
            name: '🏆 Finiši Võiduvärav',
            type: 'box',
            position: [0, 2.5, -20],
            rotation: [0, 0, 0],
            scale: [6, 5, 0.6],
            color: '#10b981',
            material: 'glass',
            opacity: 0.8,
            isCollidable: false,
            gameItemType: 'goal',
            extra: {
                anim: { kind: 'blink', speed: 2, color2: '#34d399' }
            },
            script: `// Finiši värav
if (distanceToPlayer < 2.5 && playerCoins >= 5) {
    triggerVictory({ playbuxReward: 100 });
}`
        });

        scene.objects = newObjects;
        scene.title = `${sceneTitle} [MÄNGUREŽIIM]`;
        scene.description = `Mängitav 3D seiklusmäng: ${objective} (Ajalimiit: 120s, Tasu: +100 PBX)`;

        const scriptSnippet = `// ==========================================================
// 🎮 Playard Gameplay Loop for: ${scene.title}
// ==========================================================
let coinsCollected = 0;
const totalCoins = 5;
let timeLeft = 120;

function onPlayerTick(dt) {
    timeLeft -= dt;
    updateHUD({ timer: Math.ceil(timeLeft), coins: \`\${coinsCollected}/\${totalCoins}\` });

    if (timeLeft <= 0) {
        showGameOver('Aeg sai otsa! Proovi uuesti.');
    }
}

function onCollectCoin(coinId) {
    coinsCollected++;
    addScore(100);
    playSound('coin');
    if (coinsCollected >= totalCoins) {
        setObjectiveStatus('✅ Kõik mündid kogutud! Jõua finišiväravani!');
    }
}

function onReachGoal() {
    if (coinsCollected >= totalCoins) {
        showVictoryScreen('VÕIT! Läbisid mängu edukalt!', { rewardPbx: 100 });
    } else {
        showWarning('Kõigepealt pead koguma kõik 5 kristalli!');
    }
}`;

        const summary = `🎮 **Mäng tehtud! Muutsin stseeni täielikult mängitavaks 3D mänguks!**\n\n` +
            `🎯 **Mängu eesmärk:** ${objective}\n` +
            `💎 **Interaktiivsed esemed:** Lisasin 5 helendavat kristallmünti (+100 PBX preemia)\n` +
            `🏁 **Võidutingimus:** ${winCondition}\n` +
            `⏱️ **Ajalimiit:** 120 sekundit\n` +
            `🕹️ **Juhtimine:** WASD / Nooled liikumiseks, [Space] hüppamiseks\n\n` +
            `👉 Klõpsa nupule **▶️ Test Play** või ava mäng Creator Studios!`;

        return {
            scene,
            summary,
            script: scriptSnippet
        };
    }
}
