# Todo: Port bolt

Upstream: `upstream/mods/tuxemon/db/monster/bolt.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `metal`. Evolves to `arthrobolt` at `level 9`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/bolt-sheet.png` → `public/assets/sprites/battle/bolt-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
