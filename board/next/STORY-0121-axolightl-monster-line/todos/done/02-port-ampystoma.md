# Todo: Port ampystoma

Upstream: `upstream/mods/tuxemon/db/monster/ampystoma.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `brute`. Types: `lightning/water`. Terminal form (evolves from `axolightl`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/ampystoma-sheet.png` → `public/assets/sprites/battle/ampystoma-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
