# Todo: Port mk01_proto

Upstream: `upstream/mods/tuxemon/db/monster/mk01_proto.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `dragon`. Types: `metal`. Evolves to `mk01_alpha;mk01_beta` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/mk01_proto-sheet.png` → `public/assets/sprites/battle/mk01_proto-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
