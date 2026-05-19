# Todo: Port possessun

Upstream: `upstream/mods/tuxemon/db/monster/possessun.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `shadow`. Terminal form (evolves from `cairfrey`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/possessun-sheet.png` → `public/assets/sprites/battle/possessun-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
