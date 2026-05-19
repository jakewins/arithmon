# Todo: Stage multiplier table and per-monster state

## What

1. `src/game/combat/statStages.ts`: pure stage multiplier table and `effectiveStat()` helper. Unit tests.
2. Add `statStages` field to `Monster` (zero-initialised). Add `resetStatStages()` method.
3. Combat machine: call `resetStatStages()` for both combatants when a battle starts and again when it ends (cleanup).
