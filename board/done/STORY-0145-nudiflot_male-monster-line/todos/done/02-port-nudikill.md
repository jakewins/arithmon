# Todo: Port nudikill

Upstream: `upstream/mods/tuxemon/db/monster/nudikill.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `polliwog`. Types: `water/venom`. Terminal form (evolves from `nudiflot_male`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/nudikill-sheet.png` → `public/assets/sprites/battle/nudikill-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
