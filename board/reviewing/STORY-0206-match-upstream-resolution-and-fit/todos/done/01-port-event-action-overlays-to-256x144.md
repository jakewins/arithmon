# Todo: Port event-action UI overlays to 256×144

The Phaser config, scene files, and shared `DialogBox` were ported, but
four UI overlays under `src/game/event/actions/` still hardcode the old
`WIDTH = 320 / HEIGHT = 240`. Several of these are wired into real maps
and now draw their boxes/sprites off-canvas (the dialog y values land at
y >= 176, well below the 144-pixel tall logical canvas — i.e. invisible).

Affected files and observed effect on the new 256×144 canvas:

| File | Bug |
|---|---|
| `src/game/event/actions/translatedDialogChoice.ts` | Choice box drawn at center (160, 208), 320 wide × 64 tall — entirely off-canvas. Used **8×** in `spyder_paper_town.json`, plus `spyder_cotton_artshop`, `spyder_cotton_cafe`, `spyder_cotton_town` (total 17 in-map usages). |
| `src/game/event/actions/renamePlayer.ts` | Rename input dialog drawn at center (160, 208) — off-canvas. Fires during bedroom intro (`spyder_paper_scoop.yaml`: `rename_player player,random`). |
| `src/game/event/actions/choiceMonster.ts` | Same off-canvas math; no current map uses `choice_monster`, but the action is registered and will break if it gets wired up later. |
| `src/game/event/actions/changeBgShared.ts` | Exports `WIDTH=320, HEIGHT=240` consumed by `changeBg`, `changeBgChar`, `changeBgMonster`. Backdrops drawn as 320×240 rectangles centred at (160, 120) — right ~64 px and bottom ~96 px clip; sprite x=160 sits off-centre on a 256-wide canvas. `change_bg` is used in `water_end_of_desert.json`. |

## Steps

1. Replace the hardcoded constants in all four files with imports from
   `src/game/screen.ts` (`SCREEN_W`, `SCREEN_H`):

   ```ts
   import { SCREEN_W, SCREEN_H } from "../../screen";
   // delete local WIDTH/HEIGHT constants; reuse SCREEN_W / SCREEN_H.
   ```

   `changeBgShared.ts` should drop its `WIDTH`/`HEIGHT` re-exports
   entirely and have callers import from `screen.ts` directly.

2. Retune the dialog/choice layouts so they actually fit inside 256×144.
   `BOX_H=64` plus the existing internal padding (24 px to first option,
   13 px per option) won't fit four choices in a 144-px tall canvas if
   you also want to leave the top half of the screen visible. Look at
   `event/ui/dialogBox.ts` (which the implementor already shrunk to
   `BOX_H=48` for upstream's MAX_LINES_PER_PAGE=4) and match its
   conventions — same border slice, same padding, same font size.

3. For `changeBgShared.ts`: `SPRITE_Y=70` is currently inside the canvas
   (70 < 144) but is roughly mid-screen, which is probably wrong for a
   showcase sprite. Compare against upstream Tuxemon's change_bg layout
   and pick a value that puts the sprite above the new (48-px) dialog
   box, e.g. `SPRITE_Y = SCREEN_H - DIALOG_H - SPRITE_HEIGHT/2`.

4. Add a real visual QA step that exercises at least one of these
   overlays. `qa/viewport-and-scaling.ts` currently doesn't — its
   "dialog wrap" check exercises only the standard `DialogBox`, not the
   choice overlay. Suggested options:
   - Walk to one of the paper_town signposts that fires
     `translated_dialog_choice` and screenshot the choice box rendered.
   - Re-run the bedroom intro (without setupGame's skip) and screenshot
     the rename_player input.
   - Trigger `water_end_of_desert.json`'s `change_bg` and screenshot.

   Either inline these into `qa/viewport-and-scaling.ts` or add a
   focused script and reference it in JOURNAL.md.

5. Verify by `grep -rnE '\b(320|240)\b' src/game/`: the only remaining
   hits should be in `data/blockedTiles.ts` (tile-id JSON), test
   fixtures, or numeric literals unrelated to the canvas.

6. Re-run pre-commit gates and confirm `qa/viewport-and-scaling.ts`
   still passes against `ARITHMON_PORT=8082`.
