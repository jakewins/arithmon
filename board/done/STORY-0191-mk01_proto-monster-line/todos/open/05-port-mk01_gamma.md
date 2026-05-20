# Todo: Port mk01_gamma

Upstream: `upstream/mods/tuxemon/db/monster/mk01_gamma.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `dragon`. Types: `metal`. Terminal form (evolves from `mk01_alpha`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/mk01_gamma-sheet.png` → `public/assets/sprites/battle/mk01_gamma-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
