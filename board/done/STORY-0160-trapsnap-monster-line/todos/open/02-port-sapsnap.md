# Todo: Port sapsnap

Upstream: `upstream/mods/tuxemon/db/monster/sapsnap.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `brute`. Types: `wood/shadow`. Terminal form (evolves from `trapsnap`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/sapsnap-sheet.png` → `public/assets/sprites/battle/sapsnap-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
