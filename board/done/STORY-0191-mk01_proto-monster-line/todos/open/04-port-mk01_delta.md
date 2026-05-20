# Todo: Port mk01_delta

Upstream: `upstream/mods/tuxemon/db/monster/mk01_delta.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `dragon`. Types: `metal`. Terminal form (evolves from `mk01_alpha;mk01_beta`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/mk01_delta-sheet.png` → `public/assets/sprites/battle/mk01_delta-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
