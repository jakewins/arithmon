# Todo: Port coaldiak

Upstream: `upstream/mods/tuxemon/db/monster/coaldiak.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `fire/normal`. Terminal form (evolves from `statursus`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/coaldiak-sheet.png` → `public/assets/sprites/battle/coaldiak-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
