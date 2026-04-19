# STORY-0048: Combat Visual Polish

## Description

Our combat scene looks nothing like upstream Tuxemon. Currently we have a flat dark teal background, floating sprites with incorrect framing (64x44 instead of 64x64), no island platforms, and plain rectangle HP bars. Upstream Tuxemon has illustrated per-environment backgrounds, grassy island platforms where monsters stand, properly framed 64x64 sprites, and styled HUD panels.

**Goal**: Make our battle scene visually match the upstream Tuxemon combat layout. Add a debug command to spawn arbitrary battles for per-monster QA, then validate every monster sprite.

### Visual Differences (ours vs upstream)

| Element | Ours | Upstream Tuxemon |
|---------|------|------------------|
| Background | Solid `#2a4a3a` | Illustrated 256x108 images per environment (grass, forest, cave, etc.) |
| Platforms | None -- sprites float | Two island platforms (192x57 sheet, front + back) where combatants stand |
| Sprite framing | 64x44 frames (cuts off bottom 20px) | 64x64 front/back rects from 128x88 sheets |
| HP bars | Plain colored rectangles + raw text | Styled panel images (100x29 opponent, 104x37 player) with bordered boxes |
| Positioning | Hardcoded (72, 128) and (248, 48) | Monsters anchored to island bottoms with offset |
| Party tray | None | Row of tuxeball icons showing remaining party |
| Entry animation | None | Slide-in with bounce transition |

### Reference Material

- Upstream backgrounds: `Tuxemon/mods/tuxemon/gfx/ui/combat/*_background.png` (256x108)
- Upstream island sheets: `Tuxemon/mods/tuxemon/gfx/ui/island_sheet/*_island_sheet.png` (192x57, 2 frames: 96x57 each)
- Upstream HUD panels: `Tuxemon/mods/tuxemon/gfx/ui/combat/hp_opponent_nohp.png` (100x29), `hp_player_nohp.png` (104x37)
- Upstream environment configs: `Tuxemon/mods/tuxemon/db/environment/*.yaml` -- links background + island sheet
- Upstream layout: `Tuxemon/mods/combat_layouts.yaml` -- LEFT_COMBAT home `[0, 62, 96, 70]`, RIGHT_COMBAT home `[140, 18, 96, 70]`
- Upstream sprite model: front_rect `(0,0,64,64)`, back_rect `(64,0,64,64)` from 128x88 sheets (db.py:1204)

### QA Process

After completing each todo, **use the `/puppeteer` tool to visually verify the changes** before committing. The final todos use a debug battle command + puppeteer to validate every monster sprite.

## Todos

Work through these in order:

1. [Fix sprite framing](todos/open/01-fix-sprite-framing.md) -- Change frame dimensions from 64x44 to 64x64 to show full sprites
2. [Add battle backgrounds](todos/open/02-battle-backgrounds.md) -- Copy upstream background images and render them behind the combat scene
3. [Add island platforms](todos/open/03-island-platforms.md) -- Copy upstream island sheets and render front/back platforms under the monsters
4. [Styled HUD panels](todos/open/04-styled-hud-panels.md) -- Replace plain HP bars with upstream-style bordered HUD panels
5. [Reposition layout to match upstream](todos/open/05-reposition-layout.md) -- Adjust sprite, platform, and HUD positions to match Tuxemon's combat layout
6. [Add party tray icons](todos/open/06-party-tray-icons.md) -- Show remaining party members as tuxeball icons
7. [Environment-based background selection](todos/open/07-environment-backgrounds.md) -- Select battle background based on map environment
8. [Debug battle command](todos/open/08-debug-battle-command.md) -- Add `spawnBattle(player, enemy)` debug API for testing specific matchups
9. [Validate all monster sprites](todos/open/09-validate-monster-sprites.md) -- Use debug battle + puppeteer to screenshot and fix every monster

## Acceptance Criteria

- [ ] All monster sprites display at 64x64 (full sprite, not cut off)
- [ ] Battle scene has an illustrated background image (at minimum grass)
- [ ] Monsters stand on island platform sprites
- [ ] HP bars use styled panel images matching upstream look
- [ ] Layout positions match upstream Tuxemon proportions
- [ ] Party tray shows remaining monsters as icons
- [ ] Background changes based on map environment
- [ ] Debug command can spawn any monster matchup for testing
- [ ] All 11 monsters validated via puppeteer screenshots looking correct
- [ ] All code passes `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
