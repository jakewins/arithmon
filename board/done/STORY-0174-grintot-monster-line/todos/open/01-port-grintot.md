# Todo: Port grintot

Upstream: `upstream/mods/tuxemon/db/monster/grintot.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `brute`. Types: `earth`. Evolves to `grinflare;grinflare;grintrock;grintrock` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/grintot-sheet.png` → `public/assets/sprites/battle/grintot-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
