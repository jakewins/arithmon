# Todo: Port rocktot

Upstream: `upstream/mods/tuxemon/db/monster/rocktot.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `brute`. Types: `earth`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/rocktot-sheet.png` → `public/assets/sprites/battle/rocktot-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
