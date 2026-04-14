# Implement combat formulas

Create `combat/formula.ts` with pure functions:

- `calculateDamage(attacker, technique, defender)` →
  `floor((7 + attacker.level) * attacker.attack * technique.power / defender.defense)`
- `rollAccuracy(accuracy: number)` → boolean hit check
- `rollFleeChance(attempts, userLevel, targetLevel)` →
  `0.4 + 0.15 * (attempts + userLevel - targetLevel)`, capped at 0.95

Write unit tests for each formula.
