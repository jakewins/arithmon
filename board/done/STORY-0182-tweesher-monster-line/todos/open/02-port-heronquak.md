# Todo: Port heronquak

Upstream: `upstream/mods/tuxemon/db/monster/heronquak.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `flier`. Types: `frost/sky`. Evolves to `eaglace` at `level 24`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/heronquak-sheet.png` → `public/assets/sprites/battle/heronquak-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
