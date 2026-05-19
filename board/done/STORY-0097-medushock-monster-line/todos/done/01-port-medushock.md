# Todo: Port medushock

Upstream: `upstream/mods/tuxemon/db/monster/medushock.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `polliwog`. Types: `lightning/venom`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/medushock-sheet.png` → `public/assets/sprites/battle/medushock-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
