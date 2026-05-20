# Todo: Port waysprite

Upstream: `upstream/mods/tuxemon/db/monster/waysprite.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `sprite`. Types: `frost`. Evolves to `angesnow;demosnow` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/waysprite-sheet.png` → `public/assets/sprites/battle/waysprite-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
