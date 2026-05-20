# Todo: Port snock

Upstream: `upstream/mods/tuxemon/db/monster/snock.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `serpent`. Types: `normal`. Evolves to `pythock` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/snock-sheet.png` → `public/assets/sprites/battle/snock-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
