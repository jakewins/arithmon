# Todo: Port mk01_alpha

Upstream: `upstream/mods/tuxemon/db/monster/mk01_alpha.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `dragon`. Types: `metal`. Evolves to `mk01_delta;mk01_gamma` at `level 10`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/mk01_alpha-sheet.png` → `public/assets/sprites/battle/mk01_alpha-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
