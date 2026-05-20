# Todo: Port nudiflot_male

Upstream: `upstream/mods/tuxemon/db/monster/nudiflot_male.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `polliwog`. Types: `water/venom`. Evolves to `nudikill` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/nudiflot_male-sheet.png` → `public/assets/sprites/battle/nudiflot_male-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
