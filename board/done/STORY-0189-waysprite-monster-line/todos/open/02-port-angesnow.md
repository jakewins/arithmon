# Todo: Port angesnow

Upstream: `upstream/mods/tuxemon/db/monster/angesnow.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `humanoid`. Types: `frost/cosmic`. Evolves to `seraphice` at `"level 14+vars:[{""key"":""daytime""`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/angesnow-sheet.png` → `public/assets/sprites/battle/angesnow-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
