# Todo: Port budaye

Upstream: `upstream/mods/tuxemon/db/monster/budaye.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `sprite`. Types: `wood`. Evolves to `bamboon;bamboon;frondly;frondly` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/budaye-sheet.png` → `public/assets/sprites/battle/budaye-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
