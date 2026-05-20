# Todo: Port duggot

Upstream: `upstream/mods/tuxemon/db/monster/duggot.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `varmint`. Types: `wood/venom`. Evolves to `breem` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/duggot-sheet.png` → `public/assets/sprites/battle/duggot-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
