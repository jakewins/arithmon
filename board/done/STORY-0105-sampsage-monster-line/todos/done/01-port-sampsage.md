# Todo: Port sampsage

Upstream: `upstream/mods/tuxemon/db/monster/sampsage.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `cosmic`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/sampsage-sheet.png` → `public/assets/sprites/battle/sampsage-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
