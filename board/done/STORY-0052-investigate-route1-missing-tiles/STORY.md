# STORY-0052: investigate-route1-missing-tiles

## Root Cause

The black square was **not a tile rendering issue**. It was the NPC `spyder_route1_bjorn` at tile (13, 11) whose sprite texture was `__MISSING`.

The NPC slug `spyder_route1_bjorn` was not registered in `NPC_REGISTRY` in `src/game/data/npcs.ts`. The fallback `{ spritesheet: "player" }` produced a texture key that doesn't exist as an NPC spritesheet, causing Phaser to render the `__MISSING` placeholder (black square with green diagonal).

## Fix

Added `spyder_route1_bjorn: { spritesheet: "beachcomber" }` to `NPC_REGISTRY` in `src/game/data/npcs.ts`.

## Verification

- [x] Root cause identified and documented
- [x] The black square on spyder_route1 no longer appears (verified via puppeteer screenshot)
- [x] No missing textures on other maps (spot-checked spyder_paper_town, cotton_town, spyder_route2, spyder_timber_town)
