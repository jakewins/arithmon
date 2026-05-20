# Todo: Port tobishimi

Upstream: `upstream/mods/tuxemon/db/monster/tobishimi.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `dragon`. Types: `wood`. Terminal form (evolves from `tsushimi`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/tobishimi-sheet.png` → `public/assets/sprites/battle/tobishimi-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
