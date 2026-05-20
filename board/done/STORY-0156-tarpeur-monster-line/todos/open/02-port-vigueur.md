# Todo: Port vigueur

Upstream: `upstream/mods/tuxemon/db/monster/vigueur.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `brute`. Types: `wood/heroic`. Terminal form (evolves from `tarpeur`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/vigueur-sheet.png` → `public/assets/sprites/battle/vigueur-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
