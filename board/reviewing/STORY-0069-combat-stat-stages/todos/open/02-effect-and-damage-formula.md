# Todo: Wire stat stages into effects and damage

## What

1. Extend `TechniqueEffect` (from STORY-0068) with the `statStage` kind.
2. Implement in the technique executor: applies delta, clamps to [-6, +6], emits a log event ("X's melee fell sharply!" / "rose!").
3. Update `calculateDamage()` to read `effectiveStat(monster.melee, monster.statStages.melee)` (and defender's armor/dodge).
4. Convert `growl` to a stage debuff. Add `harden` as a self-buff.
