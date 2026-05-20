# Todo: Port pythock

Upstream: `upstream/mods/tuxemon/db/monster/pythock.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `serpent`. Types: `shadow/normal`. Terminal form (evolves from `snock`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/pythock-sheet.png` → `public/assets/sprites/battle/pythock-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
