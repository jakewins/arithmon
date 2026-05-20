# Todo: Port memnomnom

Upstream: `upstream/mods/tuxemon/db/monster/memnomnom.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `hunter`. Types: `normal`. Evolves to `miaownolith;miaownolith;pyraminx;pyraminx;mauai;mauai` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/memnomnom-sheet.png` → `public/assets/sprites/battle/memnomnom-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
