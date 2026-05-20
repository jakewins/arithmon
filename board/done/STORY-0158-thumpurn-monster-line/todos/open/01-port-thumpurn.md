# Todo: Port thumpurn

Upstream: `upstream/mods/tuxemon/db/monster/thumpurn.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `brute`. Types: `fire/normal`. Evolves to `volconey` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/thumpurn-sheet.png` → `public/assets/sprites/battle/thumpurn-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
