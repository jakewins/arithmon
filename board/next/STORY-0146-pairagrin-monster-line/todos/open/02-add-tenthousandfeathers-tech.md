# Todo: Add missing `tenThousandFeathers` technique definition

Reviewer found that `src/game/data/monsters.ts` pairagrim's moveset
references `tenThousandFeathers` at L55, but no such entry exists in
`src/game/data/techniques.ts`. This will fail at runtime when the
monster tries to use the move.

Upstream
`upstream/mods/tuxemon/db/technique/ten_thousand_feathers.yaml`:

```yaml
accuracy: 0.9
power: 3
range: ranged
type: sky
```

Add a corresponding entry to `src/game/data/techniques.ts`, e.g.:

```ts
tenThousandFeathers: {
  slug: "tenThousandFeathers",
  name: "Ten Thousand Feathers",
  element: "sky",
  range: "ranged",
  accuracy: 0.9,
  dpCost: 5,
  effects: [{ kind: "damage", power: 3.0 }],
},
```

Everything else in the line (pairagrin entry, pairagrim entry,
sprites, types, shape, evolution wiring, catchRates 100/70) is fine.
