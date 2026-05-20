# Todo: Port noctula

Upstream: `upstream/mods/tuxemon/db/monster/noctula.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `sky/shadow`. Evolves to `noctalo` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/noctula-sheet.png` → `public/assets/sprites/battle/noctula-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
