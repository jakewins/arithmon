# STORY-0176: Ignibus monster line

## Description

Port the ignibus-line evolution line from upstream Tuxemon into Arithmon. This is a content-only story — the monster engine (types, stats, moves, evolution, combat) is in place; this story registers the species in our data layer and copies the sprite assets.

The chain contains 3 monsters:
- **ignibus** (basic, polliwog, fire) — evolves into eruptibus;eruptibus;embazook;embazook at see upstream YAML
- **embazook** (stage1, polliwog, metal/fire) — evolves from ignibus;ignibus
- **eruptibus** (stage1, landrace, earth/fire) — evolves from ignibus;ignibus

> **Branching evolution:** this chain has multiple evolution branches — see the member list above for each branch and wire them all in `evolutions`.

### Upstream reference

- `upstream/mods/tuxemon/db/monster/ignibus.yaml`
- `upstream/mods/tuxemon/db/monster/embazook.yaml`
- `upstream/mods/tuxemon/db/monster/eruptibus.yaml`
- Sprites:
- `upstream/mods/tuxemon/gfx/sprites/battle/ignibus-sheet.png`
- `upstream/mods/tuxemon/gfx/sprites/battle/embazook-sheet.png`
- `upstream/mods/tuxemon/gfx/sprites/battle/eruptibus-sheet.png`

### What to build

For **each monster** in the chain:
1. Add a `MonsterDef` entry to `src/game/data/monsters.ts` using the upstream `shape:` value for baseStats, types ported to our `ElementSlug` naming, and the moveset (level-learned techniques only — skip `fallback` learning_method). Set `evolutions` if the monster evolves.
2. Copy the upstream battle sprite to `public/assets/sprites/battle/<slug>-sheet.png`.
3. If any techniques in the moveset are not yet in our technique data, add them (or stub them with a TODO and use existing fallbacks — the implementor decides).

### Decisions for the implementor

- If a technique in the upstream moveset isn't implemented in Arithmon yet, decide whether to (a) implement it now, (b) substitute the closest existing technique, or (c) drop it from the learnset for v1. Document the choice in the PR.
- `baseXpYield` and `catchRate` can be ported verbatim from upstream where present; otherwise use defaults consistent with existing entries.

## QA Validation

Use `/puppeteer`. For each new monster:
1. Force-spawn a wild encounter (via debug API) and verify the sprite renders correctly.
2. Capture the player monster and verify it appears in the party UI with the right name/types/sprite.
3. If the chain has evolutions, level up to the trigger and confirm the monster transforms.

## Acceptance Criteria

- [ ] `MonsterDef` entry for **ignibus** in `src/game/data/monsters.ts`
- [ ] `MonsterDef` entry for **embazook** in `src/game/data/monsters.ts`
- [ ] `MonsterDef` entry for **eruptibus** in `src/game/data/monsters.ts`
- [ ] Battle sprite present at `public/assets/sprites/battle/ignibus-sheet.png`
- [ ] Battle sprite present at `public/assets/sprites/battle/embazook-sheet.png`
- [ ] Battle sprite present at `public/assets/sprites/battle/eruptibus-sheet.png`
- [ ] Evolution chain wired (where applicable) and verified in QA
- [ ] All chain members appear correctly in a wild encounter and in the party UI
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
