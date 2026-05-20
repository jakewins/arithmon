# Todo: Port drashimi

Upstream: `upstream/mods/tuxemon/db/monster/drashimi.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `polliwog`. Types: `wood`. Evolves to `tsushimi` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/drashimi-sheet.png` → `public/assets/sprites/battle/drashimi-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
