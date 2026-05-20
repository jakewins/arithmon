# Todo: Port legko

Upstream: `upstream/mods/tuxemon/db/monster/legko.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `serpent`. Types: `wood`. Evolves to `moloch` at `level 24`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/legko-sheet.png` → `public/assets/sprites/battle/legko-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
