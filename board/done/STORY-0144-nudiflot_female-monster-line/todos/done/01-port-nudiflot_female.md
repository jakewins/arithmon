# Todo: Port nudiflot_female

Upstream: `upstream/mods/tuxemon/db/monster/nudiflot_female.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `polliwog`. Types: `water/cosmic`. Evolves to `nudimind` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/nudiflot_female-sheet.png` → `public/assets/sprites/battle/nudiflot_female-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
