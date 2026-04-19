# Todo: Debug Battle Command

## What

Add a debug API command that spawns a battle with specific monsters, for testing and QA purposes.

## Why

To validate that every monster looks correct in combat, we need a way to quickly spawn a battle with any monster matchup without playing through the game. This will be used by the puppeteer QA process in the next todo.

## Reference

- Existing debug system: `src/game/debug.ts` -- `DebugBridge` class with command routing
- Existing debug commands: `debugSetInteract`, `debugFace`, `debugWalkTo`, `debugStartCombat`, `debugSetEnemyHp`
- The debug bridge exposes commands via `window.A` for browser console / puppeteer access

## Implementation

1. **Add `debugSpawnBattle` to the `DebugCommandHandler` interface**:
   ```typescript
   debugSpawnBattle?(playerSlug: string, enemySlug: string, playerLevel?: number, enemyLevel?: number): void;
   ```

2. **Implement in `OverworldScene`** (or whichever scene handles launching combat):
   - Create Monster instances from the given slugs and levels (default level 5)
   - Launch CombatScene with these monsters
   - The player party can be just the single specified monster

3. **Expose via the `window.A` debug bridge**:
   - Add `A.spawnBattle("memnomnom", "aardorn")` or `A.spawnBattle("rockitten", "budaye", 10, 5)`
   - Should work from the overworld scene

4. **Also support specifying environment** for background testing:
   - Optional 5th parameter: `A.spawnBattle("rockitten", "budaye", 5, 5, "cave")`
   - Temporarily overrides the environment for this battle

## Verification

- From the browser console or puppeteer, calling `A.spawnBattle("rockitten", "aardorn")` should launch a battle
- Both monsters should appear at the specified levels
- The battle should be fully functional (can fight, run, etc.)
