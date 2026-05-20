# Todo: Port noctalo

Upstream: `upstream/mods/tuxemon/db/monster/noctalo.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `sky/shadow`. Terminal form (evolves from `noctula`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/noctalo-sheet.png` → `public/assets/sprites/battle/noctalo-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
