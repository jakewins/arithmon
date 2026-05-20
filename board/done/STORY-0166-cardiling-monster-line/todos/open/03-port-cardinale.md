# Todo: Port cardinale

Upstream: `upstream/mods/tuxemon/db/monster/cardinale.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `fire/sky`. Terminal form (evolves from `cardiwing`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/cardinale-sheet.png` → `public/assets/sprites/battle/cardinale-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
