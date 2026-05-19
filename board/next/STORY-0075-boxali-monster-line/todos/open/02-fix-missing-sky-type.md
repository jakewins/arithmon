# Todo: Add missing `sky` secondary type to boxali

Reviewer found that `src/game/data/monsters.ts` declares boxali as
single-type heroic, but `upstream/mods/tuxemon/db/monster/boxali.yaml`
lists it as dual-type:

```yaml
types:
- heroic
- sky
```

Update the entry to:

```ts
types: ["heroic", "sky"],
```

Everything else (moveset levels/slugs, shape=brute, catch_rate=100,
sprite asset) matched upstream and is fine.
