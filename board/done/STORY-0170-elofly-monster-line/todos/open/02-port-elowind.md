# Todo: Port elowind

Upstream: `upstream/mods/tuxemon/db/monster/elowind.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `sky/normal`. Evolves to `elostorm` at `level 18`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/elowind-sheet.png` → `public/assets/sprites/battle/elowind-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
