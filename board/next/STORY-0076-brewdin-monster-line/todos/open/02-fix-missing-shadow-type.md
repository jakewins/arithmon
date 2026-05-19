# Todo: Add missing `shadow` secondary type to brewdin

Reviewer found that `src/game/data/monsters.ts` declares brewdin as
single-type water, but `upstream/mods/tuxemon/db/monster/brewdin.yaml`
lists it as dual-type:

```yaml
types:
- water
- shadow
```

Update the entry to:

```ts
types: ["water", "shadow"],
```

Everything else (moveset levels/slugs, shape=varmint, catch_rate=100,
sprite asset) matched upstream and is fine.

**This is the second dual-type-drop in two stories (boxali also missed
its `sky` secondary type). When porting a monster, always copy the
FULL `types:` list from upstream, not just the primary.**
