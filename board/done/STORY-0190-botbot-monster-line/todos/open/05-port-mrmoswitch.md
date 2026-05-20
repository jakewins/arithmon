# Todo: Port mrmoswitch

Upstream: `upstream/mods/tuxemon/db/monster/mrmoswitch.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `sprite`. Types: `lightning/metal`. Terminal form (evolves from `botbot`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/mrmoswitch-sheet.png` → `public/assets/sprites/battle/mrmoswitch-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
