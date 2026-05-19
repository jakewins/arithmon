# Todo: Port exclawvate

Upstream: `upstream/mods/tuxemon/db/monster/exclawvate.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `dragon`. Types: `metal`. Terminal form (evolves from `boltnu`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/exclawvate-sheet.png` → `public/assets/sprites/battle/exclawvate-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
