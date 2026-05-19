# Todo: Port baoby

Upstream: `upstream/mods/tuxemon/db/monster/baoby.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `landrace`. Types: `wood`. Evolves to `baobaraffe` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/baoby-sheet.png` → `public/assets/sprites/battle/baoby-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
