# Todo: Port hectapod

Upstream: `upstream/mods/tuxemon/db/monster/hectapod.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `polliwog`. Types: `water`. Terminal form (evolves from `squink`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/hectapod-sheet.png` → `public/assets/sprites/battle/hectapod-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
