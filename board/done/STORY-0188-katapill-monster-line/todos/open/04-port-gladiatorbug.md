# Todo: Port gladiatorbug

Upstream: `upstream/mods/tuxemon/db/monster/gladiatorbug.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `metal/heroic`. Terminal form (evolves from `katacoon`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/gladiatorbug-sheet.png` → `public/assets/sprites/battle/gladiatorbug-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
