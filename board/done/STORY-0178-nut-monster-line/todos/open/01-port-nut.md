# Todo: Port nut

Upstream: `upstream/mods/tuxemon/db/monster/nut.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `metal`. Evolves to `bolt` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/nut-sheet.png` → `public/assets/sprites/battle/nut-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
