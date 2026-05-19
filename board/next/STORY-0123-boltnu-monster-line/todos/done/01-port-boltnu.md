# Todo: Port boltnu

Upstream: `upstream/mods/tuxemon/db/monster/boltnu.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `metal`. Evolves to `exclawvate` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/boltnu-sheet.png` → `public/assets/sprites/battle/boltnu-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
