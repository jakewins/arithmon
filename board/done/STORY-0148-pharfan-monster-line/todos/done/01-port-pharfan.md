# Todo: Port pharfan

Upstream: `upstream/mods/tuxemon/db/monster/pharfan.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `landrace`. Types: `water`. Evolves to `pharavion` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/pharfan-sheet.png` → `public/assets/sprites/battle/pharfan-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
