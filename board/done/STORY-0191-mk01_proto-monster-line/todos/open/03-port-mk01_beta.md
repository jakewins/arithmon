# Todo: Port mk01_beta

Upstream: `upstream/mods/tuxemon/db/monster/mk01_beta.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `dragon`. Types: `metal`. Evolves to `mk01_delta;mk01_omega` at `level 10`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/mk01_beta-sheet.png` → `public/assets/sprites/battle/mk01_beta-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
