# Todo: Port flambear

Upstream: `upstream/mods/tuxemon/db/monster/flambear.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `brute`. Types: `fire/cosmic`. Terminal form (evolves from `bursa`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/flambear-sheet.png` → `public/assets/sprites/battle/flambear-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
