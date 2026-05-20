# Todo: Port vivicinder

Upstream: `upstream/mods/tuxemon/db/monster/vivicinder.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `serpent`. Types: `fire`. Terminal form (evolves from `vivipere`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/vivicinder-sheet.png` → `public/assets/sprites/battle/vivicinder-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
