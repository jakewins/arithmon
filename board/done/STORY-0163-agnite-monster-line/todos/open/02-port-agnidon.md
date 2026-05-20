# Todo: Port agnidon

Upstream: `upstream/mods/tuxemon/db/monster/agnidon.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `dragon`. Types: `fire`. Evolves to `agnigon` at `level 24`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/agnidon-sheet.png` → `public/assets/sprites/battle/agnidon-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
