# Todo: Port fuzzina

Upstream: `upstream/mods/tuxemon/db/monster/fuzzina.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `cosmic/normal`. Terminal form (evolves from `fuzzlet`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/fuzzina-sheet.png` → `public/assets/sprites/battle/fuzzina-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
