# Todo: Port woodoor

Upstream: `upstream/mods/tuxemon/db/monster/woodoor.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `sprite`. Types: `wood`. Evolves to `blasdoor` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/woodoor-sheet.png` → `public/assets/sprites/battle/woodoor-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
