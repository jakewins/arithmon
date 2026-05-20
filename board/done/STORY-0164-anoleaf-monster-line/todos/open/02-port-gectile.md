# Todo: Port gectile

Upstream: `upstream/mods/tuxemon/db/monster/gectile.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `wood`. Evolves to `velocitile` at `level 18`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/gectile-sheet.png` → `public/assets/sprites/battle/gectile-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
