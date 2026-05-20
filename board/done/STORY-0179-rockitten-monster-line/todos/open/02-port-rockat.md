# Todo: Port rockat

Upstream: `upstream/mods/tuxemon/db/monster/rockat.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `hunter`. Types: `earth`. Evolves to `jemuar` at `level 24`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/rockat-sheet.png` → `public/assets/sprites/battle/rockat-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
