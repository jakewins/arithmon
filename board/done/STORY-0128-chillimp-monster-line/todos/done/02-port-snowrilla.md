# Todo: Port snowrilla

Upstream: `upstream/mods/tuxemon/db/monster/snowrilla.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `brute`. Types: `frost/heroic`. Terminal form (evolves from `chillimp`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/snowrilla-sheet.png` → `public/assets/sprites/battle/snowrilla-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
