# Todo: Wire effectiveness into damage and combat UI

## What

1. Add `effectivenessMultiplier(attackElement, defenderTypes)` to `src/game/combat/elements.ts`. Dual-type defenders: multiply the two lookups together.
2. Update `calculateDamage()` in `src/game/combat/formula.ts` to apply the multiplier. Return both the damage number and the multiplier so the caller can choose how to surface it (or expose a second function).
3. Update the combat scene's action log to display:
   - multiplier > 1.5 → "It's super effective!"
   - multiplier < 0.6 and > 0 → "It's not very effective…"
   - multiplier == 0 → "It has no effect…" (skip damage)
   - Otherwise: no extra line.

## Tests

Add unit tests for `effectivenessMultiplier()`: single-type, dual-type, immunity (0×), neutral.
