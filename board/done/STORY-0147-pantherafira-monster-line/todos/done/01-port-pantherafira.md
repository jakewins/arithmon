# Todo: Port pantherafira

Upstream: `upstream/mods/tuxemon/db/monster/pantherafira.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `hunter`. Types: `fire/normal`. Evolves to `criniotherme` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/pantherafira-sheet.png` → `public/assets/sprites/battle/pantherafira-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
