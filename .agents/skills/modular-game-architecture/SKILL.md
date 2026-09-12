---
name: modular-game-architecture
description: >-
  Guide and architectural blueprint for structuring Playard 3D games into clean,
  modular, reusable, and testable components (state, catalog, world, models, systems, ui)
  instead of monolithic main.ts files.
---

# Modular Game Architecture Skill

This skill guides AI agents and developers on how to design new games and refactor legacy monolithic games in the Playard platform into clean, decoupled, and testable modules.

---

## 1. Directory Structure Blueprint

Each game inside `src/games/[game-name]/` must follow this structure:

```text
src/games/[game-name]/
├── main.ts              # Slim bootstrap (< 300 lines): initializes scene, camera, mounts systems & loop
├── types.ts             # TypeScript interfaces, types, enums, data contracts
├── catalog.ts           # Static catalog items, stats, vehicle/weapon/skin definitions
├── audio.ts             # Sound effects, chimes, audio synthesis / triggers
├── state/
│   ├── [game]State.ts   # Pure state: money, inventory, unlocks, score, profile/DB persistence
│   └── types.ts         # Optional sub-state types if complex
├── models/
│   ├── [entity]Builder.ts # Three.js procedural geometry & material builders
├── world/
│   ├── environment.ts   # Sky, terrain, lighting, tracks, stations, weather transitions
├── systems/
│   ├── physics.ts       # Movement math, collision, spline tracking, boundaries
│   ├── camera.ts        # Follow camera, cab camera, cinematic & map views
│   └── input.ts         # Keyboard, pointer & touch button event listeners
├── ui/
│   ├── hud.ts           # Speedometer, counters, notifications, toasts, reward modals
│   └── [feature]Modal.ts # Depot, shop, inventory dialogs
└── effects/
    └── particles.ts     # Smoke, sparks, plasma, confetti emitters
```

Cross-game reusable logic (such as avatar rigs, mobile controls, yard currency service) belongs in `src/shared/`.

---

## 2. Core Architectural Principles

### A. Keep `main.ts` as a Thin Lifecycle Bootstrap
`main.ts` should only:
- Perform access gating (`checkOwnerAccess`, `enforceDesktopOnly`).
- Create Three.js `Scene`, `PerspectiveCamera`, `WebGLRenderer`.
- Instantiate track/world curves and spawn entity models.
- Mount UI dialogs and wire input handlers.
- Run the `requestAnimationFrame(animate)` loop delegating updates to systems.

### B. Pure State Isolation (Unit-Testable)
All currency, unlock states, inventories, and progression logic must live in `state/`:
- Functions like `getTrainMoney()`, `spendTrainMoney()`, `addTrainMoney()`, `unlockTrain()` must not directly touch Three.js objects or canvas elements.
- This allows logic to be tested directly via fast unit tests without needing a WebGL canvas or full browser environment.

### C. UI & Systems Decoupling
- Systems (physics, camera, input) should not create DOM elements or directly alter modal styles.
- Pass callbacks (e.g. `onSelectTrain`, `onThrottleUp`, `onStationArrival`) from the orchestrator so modules remain loosely coupled.

---

## 3. Step-by-Step Refactoring Recipe for Monolithic Games

When tasked with refactoring an existing large game (like `creator`, `metro`, `mmp1`, `war`):

1. **Inspect existing tests**: Check `verify_game.js` to catalog all DOM element IDs, selectors, and URL query params tested.
2. **Extract types**: Move all interfaces to `types.ts`.
3. **Extract static data**: Move arrays of items, weapons, vehicles, recipes to `catalog.ts`.
4. **Extract state**: Move localStorage / Supabase currency, inventory, and stats to `state/[game]State.ts`.
5. **Extract 3D model builders**: Move procedural meshes into `models/`.
6. **Extract environment & scenery**: Move terrain, lighting, sky, and stations into `world/`.
7. **Extract systems & input**: Move physics, collision math, and key/touch handlers into `systems/`.
8. **Extract UI**: Move modal rendering, HUD updating, and banner animations into `ui/`.
9. **Slim down `main.ts`**: Import the modules and wire them together.
10. **Verify**: Run `npx vite build` followed by `node verify_game.js` to ensure zero regressions.
