# Todo: Port foxfire

Upstream: `upstream/mods/tuxemon/db/monster/foxfire.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `varmint`. Types: `fire`. Evolves to `vulpyre` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/foxfire-sheet.png` → `public/assets/sprites/battle/foxfire-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
