# Todo: Port lucifice

Upstream: `upstream/mods/tuxemon/db/monster/lucifice.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `sprite`. Types: `frost/shadow`. Terminal form (evolves from `demosnow`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/lucifice-sheet.png` → `public/assets/sprites/battle/lucifice-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
