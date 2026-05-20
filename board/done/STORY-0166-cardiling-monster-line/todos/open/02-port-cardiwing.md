# Todo: Port cardiwing

Upstream: `upstream/mods/tuxemon/db/monster/cardiwing.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `fire/sky`. Evolves to `cardinale` at `level 18`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/cardiwing-sheet.png` → `public/assets/sprites/battle/cardiwing-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
