# Todo: Port drokoro

Upstream: `upstream/mods/tuxemon/db/monster/drokoro.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `dragon`. Types: `fire`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/drokoro-sheet.png` → `public/assets/sprites/battle/drokoro-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
