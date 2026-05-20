# Todo: Port ninjasmine

Upstream: `upstream/mods/tuxemon/db/monster/ninjasmine.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `wood/venom`. Terminal form (evolves from `toxiris`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/ninjasmine-sheet.png` → `public/assets/sprites/battle/ninjasmine-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
