# Todo: Port potturney

Upstream: `upstream/mods/tuxemon/db/monster/potturney.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `earth/shadow`. Terminal form (evolves from `potturmeist`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/potturney-sheet.png` → `public/assets/sprites/battle/potturney-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
