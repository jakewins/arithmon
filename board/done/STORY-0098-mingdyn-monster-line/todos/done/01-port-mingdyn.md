# Todo: Port mingdyn

Upstream: `upstream/mods/tuxemon/db/monster/mingdyn.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `dragon`. Types: `fire/sky`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/mingdyn-sheet.png` → `public/assets/sprites/battle/mingdyn-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
