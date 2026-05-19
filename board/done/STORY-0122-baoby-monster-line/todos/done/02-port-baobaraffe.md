# Todo: Port baobaraffe

Upstream: `upstream/mods/tuxemon/db/monster/baobaraffe.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `landrace`. Types: `wood`. Terminal form (evolves from `baoby`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/baobaraffe-sheet.png` → `public/assets/sprites/battle/baobaraffe-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
