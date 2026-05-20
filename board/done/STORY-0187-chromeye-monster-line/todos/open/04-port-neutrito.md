# Todo: Port neutrito

Upstream: `upstream/mods/tuxemon/db/monster/neutrito.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `metal/cosmic`. Terminal form (evolves from `chromeye`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/neutrito-sheet.png` → `public/assets/sprites/battle/neutrito-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
