# Todo: Port elofly

Upstream: `upstream/mods/tuxemon/db/monster/elofly.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `normal/sky`. Evolves to `elowind` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/elofly-sheet.png` → `public/assets/sprites/battle/elofly-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
