# Todo: Pick attacker/defender stat based on technique range

## What

In `src/game/combat/formula.ts`, update `calculateDamage()`:

```ts
const atk = technique.range === "melee" ? attacker.melee : attacker.ranged;
const def = technique.range === "melee" ? defender.armor : defender.dodge;
return Math.floor(((7 + attacker.level) * atk * technique.power) / def);
```

Add unit tests covering both branches.
