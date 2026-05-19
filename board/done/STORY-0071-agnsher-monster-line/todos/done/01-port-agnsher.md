# Todo: Port agnsher

Upstream: `upstream/mods/tuxemon/db/monster/agnsher.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `fire/water`. Terminal — does not evolve.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/agnsher-sheet.png` → `public/assets/sprites/battle/agnsher-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
