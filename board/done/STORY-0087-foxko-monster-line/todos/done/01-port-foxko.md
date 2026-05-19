# Todo: Port foxko

Upstream: `upstream/mods/tuxemon/db/monster/foxko.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `serpent`. Types: `fire/wood`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/foxko-sheet.png` → `public/assets/sprites/battle/foxko-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
