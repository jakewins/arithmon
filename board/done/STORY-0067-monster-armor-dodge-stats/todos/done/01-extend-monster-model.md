# Todo: Extend Monster model with six stats

## What

1. Update `src/game/model/Monster.ts`:
   - Replace `attack` with `melee` and `ranged`
   - Replace `defense` with `armor` and `dodge`
   - Update `LevelUpResult.oldStats` / `newStats` shape
   - Update private constructor + `spawn()` + `levelUp()` to compute all six
2. Update `MonsterDef.baseStats` in `src/game/data/monsters.ts` to the new shape and backfill all four monsters from upstream yamls (`upstream/mods/tuxemon/db/monster/<slug>.yaml`, look under `shape:` and base stats).
3. Grep the codebase for `.attack` and `.defense` on `Monster` instances and update each call site to read the right new field.

## Watch out for

- Combat UI labels and stat displays.
- Test fixtures that hardcode the old stat shape.
- Save format — check if monsters are persisted with the old field names; if so, add a one-time migration or just bump a version constant (no live users yet — keep it simple).
