# Todo: Port kernel

Upstream: `upstream/mods/tuxemon/db/monster/kernel.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `sprite`. Types: `lightning/metal`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/kernel-sheet.png` → `public/assets/sprites/battle/kernel-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
