# Todo: Port taupypus

Upstream: `upstream/mods/tuxemon/db/monster/taupypus.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `varmint`. Types: `water/normal`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/taupypus-sheet.png` → `public/assets/sprites/battle/taupypus-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
