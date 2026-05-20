# Todo: Port eyesore

Upstream: `upstream/mods/tuxemon/db/monster/eyesore.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `serpent`. Types: `cosmic`. Terminal form (evolves from `eyenemy`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/eyesore-sheet.png` → `public/assets/sprites/battle/eyesore-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
