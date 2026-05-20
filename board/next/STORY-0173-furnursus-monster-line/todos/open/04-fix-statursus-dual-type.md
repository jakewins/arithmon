# Fix: statursus is missing secondary `cosmic` type

`src/game/data/monsters.ts` defines `statursus.types = ["fire"]`, but
the upstream YAML at `upstream/mods/tuxemon/db/monster/statursus.yaml`
specifies:

```yaml
types:
- fire
- cosmic
```

Change to `types: ["fire", "cosmic"]` so the stage1 form picks up the
cosmic typing it gains over furnursus and keeps before evolving to the
fire/normal coaldiak.
