# STORY-0206 Journal

## Summary of changes

- **`src/game/screen.ts`** — new shared module exporting `SCREEN_W=256, SCREEN_H=144`. Mirrors upstream `NATIVE_RESOLUTION` (see `upstream/tuxemon/platform/const/sizes.py`).
- **`src/game/main.ts`** — Phaser config now `width: 256, height: 144` with `scale: { mode: Scale.NONE }`. A `snapToIntegerZoom` helper listens to `window` resize events and calls `scale.setZoom(floor(min(W/256, H/144)))` so the canvas is always rendered at a whole-pixel multiple. I deliberately chose `Scale.NONE` over `Scale.FIT` because FIT picks fractional zooms (e.g. 7.5× at 1920×1080) that shimmer pixel art.
- **All UI scenes ported to 256×144.** Hard-coded `WIDTH=320`/`HEIGHT=240` constants replaced with imports from `screen.ts`; per-scene padding, fonts, and layout coordinates retuned to fit the smaller logical canvas:
  - `CombatScene` — action bar `BOX_H 64→48`, panels `LEFT_W 192→152`, sprite scale `1.5→1.0`, player/enemy island positions match upstream `combat_layouts.yaml` (`LEFT_COMBAT home=[0, 62, 96, 70]`, `RIGHT_COMBAT home=[140, 18, 96, 70]`). Player HUD now at `(145, 45)` per upstream `LEFT_COMBAT.hud=[145, 45, 110, 50]`.
  - `MathProblemScene` — outer panel near-full-bleed (bezel of 6/8 px); font sizes 14→10 (question), 11→8 (buttons); widget-specific tweaks for radio/dual/comparison/number-line/dropdown.
  - `MonsterInfoScene` — `tux_info.png` (256×144) now blits 1:1 from `(0, 0)`. Centering math went away entirely as the story predicted.
  - `BagScene` — split panel `LEFT_W 170→136`; `MAX_VISIBLE_ITEMS` recomputed from height.
  - `ShopScene` — full-width panel with 4 px bezel; row spacing 14→10; fonts shrunk.
  - `JournalScene` — list rows 14→10 px, font 10→8; title moved left because the count text would otherwise overflow into it on the narrower canvas.
  - `PartyScreen` — `LEFT_W 140→112`; portrait scale `2→1`; technique list moved next to stats column so both fit in 144 px height.
  - `PauseMenuScene` — side panel `PANEL_W 100→70` with smaller fonts.
  - `TitleScene` — title text 32→20, subtitle 10→8; menu panel shrunk to 88 px.
  - `event/ui/dialogBox.ts` — `BOX_H 64→48` (still 4 lines per page → upstream's `MAX_LINES_PER_PAGE`), font 11→8, padding tightened.
  - `ui/monsterSlot.ts` and `ui/monsterPortrait.ts` — HP bar widths and font sizes scaled for the narrower party display.

## QA validation

`qa/viewport-and-scaling.ts` is checked in and runs end-to-end. Output:

```
overworld framing: canvas=1024×576 zoom=4
1920×1080: zoom=7 canvas=1792×1008 fill=93.3%
1366×768:  zoom=5 canvas=1280×720  fill=93.8%
1280×720:  zoom=5 canvas=1280×720  fill=100.0%
1024×600:  zoom=4 canvas=1024×576  fill=100.0%
ui scenes: OK
dialog wrap: OK
viewport-and-scaling: OK
```

Screenshots in `qa/screenshots/`:

| File | What it shows |
|---|---|
| `viewport-overworld-paper-town.png` | Overworld at paper_town (19,18) — 16×9 tile framing matches upstream `20260520_205022.png` (fence, bins, forest in view). |
| `viewport-1920x1080.png` | Integer zoom 7 (1792×1008) with small letterbox. |
| `viewport-1366x768.png` | Integer zoom 5 (1280×720) with small letterbox. |
| `viewport-1280x720.png` | Integer zoom 5, exact fit. |
| `viewport-1024x600.png` | Integer zoom 4, exact width fit. |
| `ui-title.png` | Title screen at native resolution. |
| `ui-overworld.png` | Overworld with starter party. |
| `ui-pause-menu.png` | Pause menu side panel. |
| `ui-party-screen.png` | Party screen — portrait + stats + slot list. |
| `ui-journal.png` | Journal list view. |
| `ui-bag.png` | Bag with item list + description panel. |
| `ui-monster-info.png` | MonsterInfo (cream `tux_info.png` BG fills exactly). |
| `ui-combat.png` | Combat scene: enemy at upper-right, player at lower-left, action bar at bottom. |
| `ui-math-problem.png` | Math problem panel with numeric input + Submit/Hint. |
| `ui-dialog-long.png` | Multi-page dialog wrapping inside the new 256-px dialog box. |

## Pre-commit gates

```
npm run format:check  →  ok
npm run lint          →  ok
npx tsc --noEmit      →  ok
npm test              →  462 passed (1 dialog-pagination test had to be re-stabilised: BOX_H=48 keeps the same MAX_LINES_PER_PAGE=4 as before).
```
