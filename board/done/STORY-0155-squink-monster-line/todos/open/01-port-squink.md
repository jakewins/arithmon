# Todo: Port squink

Upstream: `upstream/mods/tuxemon/db/monster/squink.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `polliwog`. Types: `water`. Evolves to `hectapod` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/squink-sheet.png` → `public/assets/sprites/battle/squink-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
