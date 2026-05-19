# Todo: Port lapinou

Upstream: `upstream/mods/tuxemon/db/monster/lapinou.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `varmint`. Types: `normal`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/lapinou-sheet.png` → `public/assets/sprites/battle/lapinou-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
