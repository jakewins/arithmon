# Todo: Port firomenis

Upstream: `upstream/mods/tuxemon/db/monster/firomenis.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `dragon`. Types: `metal/cosmic`. Terminal form (evolves from `merlicun`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/firomenis-sheet.png` → `public/assets/sprites/battle/firomenis-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
