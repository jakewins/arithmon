# Todo: Port sludgehog

Upstream: `upstream/mods/tuxemon/db/monster/sludgehog.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `landrace`. Types: `earth/wood`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/sludgehog-sheet.png` → `public/assets/sprites/battle/sludgehog-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
