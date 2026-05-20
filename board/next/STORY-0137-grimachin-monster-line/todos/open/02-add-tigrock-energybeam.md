# Todo: Add missing `energyBeam @ L55` to tigrock moveset

Reviewer found that `src/game/data/monsters.ts` `tigrock` entry has
9 level-up techniques, but upstream
`upstream/mods/tuxemon/db/monster/tigrock.yaml` has 10 — the last is:

```yaml
- level_learned: 55
  technique: energy_beam
```

Add to the moveset:

```ts
{ slug: "energyBeam", learnedAt: 55 },
```

This is a common pattern: evolved forms often gain one extra
high-level move (e.g. energyBeam) that the basic form doesn't have.

Everything else (grimachin entry, both sprites, both monster types
single ["metal"], hunter shape, evolution wiring at L32, correct
catchRates 100/70) matches upstream.
