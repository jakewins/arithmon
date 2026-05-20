# Todo: Port embazook

Upstream: `upstream/mods/tuxemon/db/monster/embazook.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `polliwog`. Types: `metal/fire`. Terminal form (evolves from `ignibus;ignibus`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/embazook-sheet.png` → `public/assets/sprites/battle/embazook-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
