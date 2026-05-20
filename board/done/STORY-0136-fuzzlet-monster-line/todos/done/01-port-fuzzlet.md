# Todo: Port fuzzlet

Upstream: `upstream/mods/tuxemon/db/monster/fuzzlet.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `blob`. Types: `cosmic/normal`. Evolves to `fuzzina` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/fuzzlet-sheet.png` → `public/assets/sprites/battle/fuzzlet-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
