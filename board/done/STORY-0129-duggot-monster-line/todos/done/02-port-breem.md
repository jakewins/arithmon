# Todo: Port breem

Upstream: `upstream/mods/tuxemon/db/monster/breem.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `venom`. Terminal form (evolves from `duggot`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/breem-sheet.png` → `public/assets/sprites/battle/breem-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
