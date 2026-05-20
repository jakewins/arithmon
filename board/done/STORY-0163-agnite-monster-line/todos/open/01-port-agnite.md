# Todo: Port agnite

Upstream: `upstream/mods/tuxemon/db/monster/agnite.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `dragon`. Types: `fire`. Evolves to `agnidon` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/agnite-sheet.png` → `public/assets/sprites/battle/agnite-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
