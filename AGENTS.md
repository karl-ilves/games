# Playard Games - Agent Guidelines & Architecture Rules

## 1. Modular Architecture Requirement (Mandatory)
- **No monolithic `main.ts` files**: Keep `main.ts` strictly as a thin bootstrap/orchestrator (< 350 lines).
- **Separation of concerns**:
  - `types.ts`: TypeScript interfaces and types.
  - `catalog.ts`: Static definitions and asset configurations.
  - `state/`: Pure state management (currency, inventory, persistence) isolated from Three.js/DOM for unit testability.
  - `models/`: 3D procedural meshes and builders.
  - `world/`: Environment, scenery, tracks, terrain, and lighting.
  - `systems/`: Physics, camera, AI, input controllers.
  - `ui/`: HUD, modals, popups, shop views.
  - `src/shared/`: Promote cross-game mechanics (avatar, controls, yards, audio).
- Refer to `.agents/skills/modular-game-architecture/SKILL.md` for guidelines and refactoring procedures.

## 2. Testing Requirement (Mandatory)
- Before finishing any turn or completing work, you **must run**:
  ```bash
  node verify_game.js
  ```
- If any syntax error or test fails, fix it immediately before ending your turn.
- When adding new functionality, expand tests in `verify_game.js` to prevent regressions.

## 3. GitHub Auto-Update Requirement (Git Push)
- After modifying code and `node verify_game.js` passes:
  ```bash
  git add .
  git commit -m "description of changes"
  git push
  ```
