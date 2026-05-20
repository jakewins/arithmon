# Todo: Port tetrchimp

Upstream: `upstream/mods/tuxemon/db/monster/tetrchimp.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `lightning/cosmic`. Evolves to `apeoro` at `see upstream`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/tetrchimp-sheet.png` → `public/assets/sprites/battle/tetrchimp-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
