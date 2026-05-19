# Todo: Port cairfrey

Upstream: `upstream/mods/tuxemon/db/monster/cairfrey.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `normal`. Evolves to `possessun` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/cairfrey-sheet.png` → `public/assets/sprites/battle/cairfrey-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
