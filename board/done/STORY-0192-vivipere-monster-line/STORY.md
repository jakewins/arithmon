# STORY-0192: Vivipere monster line

## Description

Port the vivipere-line evolution line from upstream Tuxemon into Arithmon. This is a content-only story — the monster engine (types, stats, moves, evolution, combat) is in place; this story registers the species in our data layer and copies the sprite assets.

The chain contains 8 monsters:
- **vivipere** (basic, serpent, normal) — evolves into vivicinder;viviphyta;viviteel;vivitrans;vivitron;vividactil;vividactil;vividactil;vivisource at see upstream YAML
- **vivicinder** (stage1, serpent, fire) — evolves from vivipere
- **vividactil** (stage1, flier, earth) — evolves from vivipere;vivipere;vivipere
- **viviphyta** (stage1, serpent, wood) — evolves from vivipere
- **vivisource** (stage1, serpent, water) — evolves from vivipere
- **viviteel** (stage1, serpent, metal) — evolves from vivipere
- **vivitrans** (stage1, serpent, frost) — evolves from vivipere
- **vivitron** (stage1, serpent, lightning) — evolves from vivipere

> **Branching evolution:** this chain has multiple evolution branches — see the member list above for each branch and wire them all in `evolutions`.

### Upstream reference

- `upstream/mods/tuxemon/db/monster/vivipere.yaml`
- `upstream/mods/tuxemon/db/monster/vivicinder.yaml`
- `upstream/mods/tuxemon/db/monster/vividactil.yaml`
- `upstream/mods/tuxemon/db/monster/viviphyta.yaml`
- `upstream/mods/tuxemon/db/monster/vivisource.yaml`
- `upstream/mods/tuxemon/db/monster/viviteel.yaml`
- `upstream/mods/tuxemon/db/monster/vivitrans.yaml`
- `upstream/mods/tuxemon/db/monster/vivitron.yaml`
- Sprites:
- `upstream/mods/tuxemon/gfx/sprites/battle/vivipere-sheet.png`
- `upstream/mods/tuxemon/gfx/sprites/battle/vivicinder-sheet.png`
- `upstream/mods/tuxemon/gfx/sprites/battle/vividactil-sheet.png`
- `upstream/mods/tuxemon/gfx/sprites/battle/viviphyta-sheet.png`
- `upstream/mods/tuxemon/gfx/sprites/battle/vivisource-sheet.png`
- `upstream/mods/tuxemon/gfx/sprites/battle/viviteel-sheet.png`
- `upstream/mods/tuxemon/gfx/sprites/battle/vivitrans-sheet.png`
- `upstream/mods/tuxemon/gfx/sprites/battle/vivitron-sheet.png`

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

- [ ] `MonsterDef` entry for **vivipere** in `src/game/data/monsters.ts`
- [ ] `MonsterDef` entry for **vivicinder** in `src/game/data/monsters.ts`
- [ ] `MonsterDef` entry for **vividactil** in `src/game/data/monsters.ts`
- [ ] `MonsterDef` entry for **viviphyta** in `src/game/data/monsters.ts`
- [ ] `MonsterDef` entry for **vivisource** in `src/game/data/monsters.ts`
- [ ] `MonsterDef` entry for **viviteel** in `src/game/data/monsters.ts`
- [ ] `MonsterDef` entry for **vivitrans** in `src/game/data/monsters.ts`
- [ ] `MonsterDef` entry for **vivitron** in `src/game/data/monsters.ts`
- [ ] Battle sprite present at `public/assets/sprites/battle/vivipere-sheet.png`
- [ ] Battle sprite present at `public/assets/sprites/battle/vivicinder-sheet.png`
- [ ] Battle sprite present at `public/assets/sprites/battle/vividactil-sheet.png`
- [ ] Battle sprite present at `public/assets/sprites/battle/viviphyta-sheet.png`
- [ ] Battle sprite present at `public/assets/sprites/battle/vivisource-sheet.png`
- [ ] Battle sprite present at `public/assets/sprites/battle/viviteel-sheet.png`
- [ ] Battle sprite present at `public/assets/sprites/battle/vivitrans-sheet.png`
- [ ] Battle sprite present at `public/assets/sprites/battle/vivitron-sheet.png`
- [ ] Evolution chain wired (where applicable) and verified in QA
- [ ] All chain members appear correctly in a wild encounter and in the party UI
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
