# Todo: Port grinflare

Upstream: `upstream/mods/tuxemon/db/monster/grinflare.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `brute`. Types: `earth/fire`. Terminal form (evolves from `grintot;grintot`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/grinflare-sheet.png` → `public/assets/sprites/battle/grinflare-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
