# Todo: Port manosting

Upstream: `upstream/mods/tuxemon/db/monster/manosting.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `polliwog`. Types: `water/venom`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/manosting-sheet.png` → `public/assets/sprites/battle/manosting-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
