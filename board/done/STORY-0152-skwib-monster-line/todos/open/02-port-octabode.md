# Todo: Port octabode

Upstream: `upstream/mods/tuxemon/db/monster/octabode.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `polliwog`. Types: `earth/normal`. Terminal form (evolves from `skwib`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/octabode-sheet.png` → `public/assets/sprites/battle/octabode-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
