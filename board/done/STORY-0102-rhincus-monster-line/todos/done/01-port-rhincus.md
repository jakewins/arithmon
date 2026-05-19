# Todo: Port rhincus

Upstream: `upstream/mods/tuxemon/db/monster/rhincus.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `earth/sky`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/rhincus-sheet.png` → `public/assets/sprites/battle/rhincus-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
