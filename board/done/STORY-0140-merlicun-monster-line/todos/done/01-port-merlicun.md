# Todo: Port merlicun

Upstream: `upstream/mods/tuxemon/db/monster/merlicun.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `varmint`. Types: `cosmic/normal`. Evolves to `firomenis` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/merlicun-sheet.png` → `public/assets/sprites/battle/merlicun-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
