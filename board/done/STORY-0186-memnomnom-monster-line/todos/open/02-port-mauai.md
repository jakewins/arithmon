# Todo: Port mauai

Upstream: `upstream/mods/tuxemon/db/monster/mauai.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `metal/shadow`. Terminal form (evolves from `memnomnom;memnomnom`).
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/mauai-sheet.png` → `public/assets/sprites/battle/mauai-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
