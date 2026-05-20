# Todo: Port metesaur

Upstream: `upstream/mods/tuxemon/db/monster/metesaur.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `earth/fire`. Evolves to `qetzlrokilus` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/metesaur-sheet.png` → `public/assets/sprites/battle/metesaur-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
