# Todo: Port velocitile

Upstream: `upstream/mods/tuxemon/db/monster/velocitile.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `wood`. Terminal form (evolves from `gectile`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/velocitile-sheet.png` → `public/assets/sprites/battle/velocitile-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
