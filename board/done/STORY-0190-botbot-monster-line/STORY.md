# STORY-0190: Botbot monster line

## Description

Port the botbot-line evolution line from upstream Tuxemon into Arithmon. This is a content-only story — the monster engine (types, stats, moves, evolution, combat) is in place; this story registers the species in our data layer and copies the sprite assets.

The chain contains 6 monsters:
- **botbot** (basic, grub, metal) — evolves into av8r;picc;mrmoswitch;k9;b_ver_1 at see upstream YAML
- **av8r** (stage1, flier, metal/sky) — evolves from botbot
- **b_ver_1** (stage1, varmint, metal/wood) — evolves from botbot
- **k9** (stage1, hunter, metal/heroic) — evolves from botbot
- **mrmoswitch** (stage1, sprite, lightning/metal) — evolves from botbot
- **picc** (stage1, piscine, metal/water) — evolves from botbot

> **Branching evolution:** this chain has multiple evolution branches — see the member list above for each branch and wire them all in `evolutions`.

### Upstream reference

- `upstream/mods/tuxemon/db/monster/botbot.yaml`
- `upstream/mods/tuxemon/db/monster/av8r.yaml`
- `upstream/mods/tuxemon/db/monster/b_ver_1.yaml`
- `upstream/mods/tuxemon/db/monster/k9.yaml`
- `upstream/mods/tuxemon/db/monster/mrmoswitch.yaml`
- `upstream/mods/tuxemon/db/monster/picc.yaml`
- Sprites:
- `upstream/mods/tuxemon/gfx/sprites/battle/botbot-sheet.png`
- `upstream/mods/tuxemon/gfx/sprites/battle/av8r-sheet.png`
- `upstream/mods/tuxemon/gfx/sprites/battle/b_ver_1-sheet.png`
- `upstream/mods/tuxemon/gfx/sprites/battle/k9-sheet.png`
- `upstream/mods/tuxemon/gfx/sprites/battle/mrmoswitch-sheet.png`
- `upstream/mods/tuxemon/gfx/sprites/battle/picc-sheet.png`

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

- [ ] `MonsterDef` entry for **botbot** in `src/game/data/monsters.ts`
- [ ] `MonsterDef` entry for **av8r** in `src/game/data/monsters.ts`
- [ ] `MonsterDef` entry for **b_ver_1** in `src/game/data/monsters.ts`
- [ ] `MonsterDef` entry for **k9** in `src/game/data/monsters.ts`
- [ ] `MonsterDef` entry for **mrmoswitch** in `src/game/data/monsters.ts`
- [ ] `MonsterDef` entry for **picc** in `src/game/data/monsters.ts`
- [ ] Battle sprite present at `public/assets/sprites/battle/botbot-sheet.png`
- [ ] Battle sprite present at `public/assets/sprites/battle/av8r-sheet.png`
- [ ] Battle sprite present at `public/assets/sprites/battle/b_ver_1-sheet.png`
- [ ] Battle sprite present at `public/assets/sprites/battle/k9-sheet.png`
- [ ] Battle sprite present at `public/assets/sprites/battle/mrmoswitch-sheet.png`
- [ ] Battle sprite present at `public/assets/sprites/battle/picc-sheet.png`
- [ ] Evolution chain wired (where applicable) and verified in QA
- [ ] All chain members appear correctly in a wild encounter and in the party UI
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
