# Todo: Port bugnin

Upstream: `upstream/mods/tuxemon/db/monster/bugnin.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `brute`. Types: `metal/venom`. Terminal form (evolves from `katacoon`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/bugnin-sheet.png` → `public/assets/sprites/battle/bugnin-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
