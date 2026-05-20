# Todo: Port elostorm

Upstream: `upstream/mods/tuxemon/db/monster/elostorm.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `normal/sky`. Terminal form (evolves from `elowind`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/elostorm-sheet.png` → `public/assets/sprites/battle/elostorm-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
