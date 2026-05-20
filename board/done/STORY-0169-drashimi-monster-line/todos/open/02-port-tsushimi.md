# Todo: Port tsushimi

Upstream: `upstream/mods/tuxemon/db/monster/tsushimi.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `dragon`. Types: `wood`. Evolves to `tobishimi` at `level 18`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/tsushimi-sheet.png` → `public/assets/sprites/battle/tsushimi-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
