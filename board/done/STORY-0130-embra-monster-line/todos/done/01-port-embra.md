# Todo: Port embra

Upstream: `upstream/mods/tuxemon/db/monster/embra.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `fire`. Evolves to `ruption` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/embra-sheet.png` → `public/assets/sprites/battle/embra-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
