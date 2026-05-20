# Todo: Port frondly

Upstream: `upstream/mods/tuxemon/db/monster/frondly.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `sprite`. Types: `wood/cosmic`. Terminal form (evolves from `budaye;budaye`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/frondly-sheet.png` → `public/assets/sprites/battle/frondly-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
