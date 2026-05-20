# Todo: Port chloragon

Upstream: `upstream/mods/tuxemon/db/monster/chloragon.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `dragon`. Types: `wood`. Evolves to `sapragon` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/chloragon-sheet.png` → `public/assets/sprites/battle/chloragon-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
