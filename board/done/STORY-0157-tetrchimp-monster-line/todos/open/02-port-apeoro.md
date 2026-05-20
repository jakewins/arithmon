# Todo: Port apeoro

Upstream: `upstream/mods/tuxemon/db/monster/apeoro.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `lightning/cosmic`. Terminal form (evolves from `tetrchimp`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/apeoro-sheet.png` → `public/assets/sprites/battle/apeoro-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
