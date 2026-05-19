# Todo: Port pigabyte

Upstream: `upstream/mods/tuxemon/db/monster/pigabyte.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `metal/normal`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/pigabyte-sheet.png` → `public/assets/sprites/battle/pigabyte-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
