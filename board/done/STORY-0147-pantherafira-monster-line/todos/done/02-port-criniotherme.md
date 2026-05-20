# Todo: Port criniotherme

Upstream: `upstream/mods/tuxemon/db/monster/criniotherme.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `hunter`. Types: `fire/normal`. Terminal form (evolves from `pantherafira`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/criniotherme-sheet.png` → `public/assets/sprites/battle/criniotherme-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
