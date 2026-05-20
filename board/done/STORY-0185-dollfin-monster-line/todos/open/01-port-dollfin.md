# Todo: Port dollfin

Upstream: `upstream/mods/tuxemon/db/monster/dollfin.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `leviathan`. Types: `water`. Evolves to `bigfin;bigfin;sharpfin;sharpfin;delfeco` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/dollfin-sheet.png` → `public/assets/sprites/battle/dollfin-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
