# Todo: Port sapragon

Upstream: `upstream/mods/tuxemon/db/monster/sapragon.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `dragon`. Types: `wood`. Evolves to `dragarbor` at `level 32`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/sapragon-sheet.png` → `public/assets/sprites/battle/sapragon-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
