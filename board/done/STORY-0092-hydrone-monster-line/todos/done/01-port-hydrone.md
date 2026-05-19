# Todo: Port hydrone

Upstream: `upstream/mods/tuxemon/db/monster/hydrone.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `metal/water`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/hydrone-sheet.png` → `public/assets/sprites/battle/hydrone-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
