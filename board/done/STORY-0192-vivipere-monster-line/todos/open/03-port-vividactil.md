# Todo: Port vividactil

Upstream: `upstream/mods/tuxemon/db/monster/vividactil.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `earth`. Terminal form (evolves from `vivipere;vivipere;vivipere`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/vividactil-sheet.png` → `public/assets/sprites/battle/vividactil-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
