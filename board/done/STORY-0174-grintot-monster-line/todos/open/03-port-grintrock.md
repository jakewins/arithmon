# Todo: Port grintrock

Upstream: `upstream/mods/tuxemon/db/monster/grintrock.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `brute`. Types: `lightning/earth`. Terminal form (evolves from `grintot;grintot`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/grintrock-sheet.png` → `public/assets/sprites/battle/grintrock-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
