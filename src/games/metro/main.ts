import { MetroLoop } from './systems/metroLoop';
import { metroAudio } from './audio';

// Re-exports for test suites and external consumers
export { GOLDEN_SHOP_ITEMS, CLUES_DATABASE } from './catalog';
export type { ShopItem, ClueItem, GameState, DirectionBranch, AIPassenger, CarriageData, AnomalyEvent } from './types';

export class LastMetroGame extends MetroLoop {}

// Instantiate and expose globally for Playard tests
window.addEventListener('DOMContentLoaded', () => {
    (window as any).__metroAudio = metroAudio;
    (window as any).metroAudio = metroAudio;
    (window as any).__lastMetro = new LastMetroGame();
});
