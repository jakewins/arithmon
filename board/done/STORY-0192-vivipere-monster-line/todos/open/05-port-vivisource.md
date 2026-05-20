# Todo: Port vivisource

Upstream: `upstream/mods/tuxemon/db/monster/vivisource.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `serpent`. Types: `water`. Terminal form (evolves from `vivipere`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/vivisource-sheet.png` → `public/assets/sprites/battle/vivisource-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
