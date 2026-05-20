# Todo: Port demosnow

Upstream: `upstream/mods/tuxemon/db/monster/demosnow.yaml`

1. Add `MonsterDef` to `src/game/data/monsters.ts`. Shape: `sprite`. Types: `frost/shadow`. Evolves to `lucifice` at `"level 14+vars:[{""key"":""daytime""`.
2. Copy `upstream/mods/tuxemon/gfx/sprites/battle/demosnow-sheet.png` → `public/assets/sprites/battle/demosnow-sheet.png`.
3. Cross-check moveset against `src/game/data/skills/`; flag any missing techniques in the PR.
