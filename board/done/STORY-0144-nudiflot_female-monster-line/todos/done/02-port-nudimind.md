# Todo: Port nudimind

Upstream: `upstream/mods/tuxemon/db/monster/nudimind.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `polliwog`. Types: `water/cosmic`. Terminal form (evolves from `nudiflot_female`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/nudimind-sheet.png` → `public/assets/sprites/battle/nudimind-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
