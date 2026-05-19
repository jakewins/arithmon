# Todo: Port conileaf

Upstream: `upstream/mods/tuxemon/db/monster/conileaf.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `wood`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/conileaf-sheet.png` → `public/assets/sprites/battle/conileaf-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
