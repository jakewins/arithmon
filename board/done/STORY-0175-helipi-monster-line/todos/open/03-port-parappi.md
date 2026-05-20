# Todo: Port parappi

Upstream: `upstream/mods/tuxemon/db/monster/parappi.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `wood/sky`. Terminal form (evolves from `coppi`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/parappi-sheet.png` → `public/assets/sprites/battle/parappi-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
