# Todo: Port happito

Upstream: `upstream/mods/tuxemon/db/monster/happito.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `metal/cosmic`. Terminal form (evolves from `chromeye`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/happito-sheet.png` → `public/assets/sprites/battle/happito-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
