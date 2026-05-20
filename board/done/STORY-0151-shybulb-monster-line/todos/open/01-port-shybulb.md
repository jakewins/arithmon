# Todo: Port shybulb

Upstream: `upstream/mods/tuxemon/db/monster/shybulb.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `sprite`. Types: `wood`. Evolves to `narcileaf` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/shybulb-sheet.png` → `public/assets/sprites/battle/shybulb-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
