# Todo: Port statursus

Upstream: `upstream/mods/tuxemon/db/monster/statursus.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `fire/cosmic`. Evolves to `coaldiak` at `level 18`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/statursus-sheet.png` → `public/assets/sprites/battle/statursus-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
