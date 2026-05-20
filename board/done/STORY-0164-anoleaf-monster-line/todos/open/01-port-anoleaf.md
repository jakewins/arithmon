# Todo: Port anoleaf

Upstream: `upstream/mods/tuxemon/db/monster/anoleaf.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `varmint`. Types: `wood`. Evolves to `gectile` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/anoleaf-sheet.png` → `public/assets/sprites/battle/anoleaf-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
