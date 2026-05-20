# Todo: Port potturmeist

Upstream: `upstream/mods/tuxemon/db/monster/potturmeist.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `earth/shadow`. Evolves to `potturney` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/potturmeist-sheet.png` → `public/assets/sprites/battle/potturmeist-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
