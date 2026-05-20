# Todo: Port arthrobolt

Upstream: `upstream/mods/tuxemon/db/monster/arthrobolt.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `lightning/metal`. Terminal form (evolves from `bolt`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/arthrobolt-sheet.png` → `public/assets/sprites/battle/arthrobolt-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
