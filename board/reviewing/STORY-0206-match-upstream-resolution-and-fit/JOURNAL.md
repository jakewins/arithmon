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

## 2026-05-20 — Reviewer findings (bounce)

- Confirmed `src/game/screen.ts` matches upstream `NATIVE_RESOLUTION = (256, 144)` and `main.ts` uses `Scale.NONE` + a `window.resize` listener that snaps to `floor(min(W/256, H/144))`. Verified the integer-snap argument: at 1920×1080, FIT would pick 7.5× — the implementor's reasoning is sound, and `qa/viewport-and-scaling.ts` confirms zoom is always integer (7 / 5 / 5 / 4 at the four sizes).
- Re-ran all four pre-commit gates fresh on `review-wip`: `format:check`, `lint`, `tsc --noEmit`, and 462/462 tests pass.
- Ran `qa/viewport-and-scaling.ts` end-to-end against `ARITHMON_PORT=8082`; output matches the implementor's log. Screenshots in `qa/screenshots/`: overworld framing (~16×9), all four resolution snaps, every UI scene, and the long-message dialog all render cleanly inside 256×144.
- Also re-ran existing per-story QA against the changes: `qa/combat-recharge-math.ts`, `qa/smoke.ts`, `qa/shop-purchase-test.ts`, `qa/paper-scoop-talk-dante-test.ts`, and `qa/campaign-intro-playthrough.ts` all still pass.
- **Bouncing for one defect**: `grep -rnE '\b(320|240)\b' src/game/` shows four files under `src/game/event/actions/` still hardcode `WIDTH=320, HEIGHT=240`:
  - `translatedDialogChoice.ts` — used **8×** in `spyder_paper_town.json` (player's intro map!) plus three other Cotton maps. Choice box is drawn centred at (160, 208) with size 320×64 → entirely off-canvas; player gets no visible choices.
  - `renamePlayer.ts` — fires during the bedroom intro; rename input dialog likewise off-canvas.
  - `choiceMonster.ts` — same math, currently unused by any map but registered.
  - `changeBgShared.ts` — `WIDTH/HEIGHT` re-exports consumed by `changeBg`, `changeBgChar`, `changeBgMonster`. Backdrops drawn at 320×240 centred at (160, 120), clipping ~64 px right and ~96 px bottom; `change_bg` is used in `water_end_of_desert.json`.

  Acceptance criterion #2 (no hardcoded 320/240; UI scenes re-laid-out) is not fully met — the scene files are clean, but these runtime UI overlays were missed.

- Existing QA hides this because none of `setupGame`'s defaults trigger a `translated_dialog_choice` or `rename_player`, and `qa/viewport-and-scaling.ts` only exercises the standard `DialogBox`. Recommend the bounce todo add a focused screenshot of at least one of these overlays so the regression can't slip through again.

- Single todo added in `todos/open/01-port-event-action-overlays-to-256x144.md` with affected files, suggested fix (import `SCREEN_W`/`SCREEN_H` from `screen.ts`, retune box heights to fit 144 px), and required QA coverage.

## 2026-05-20 — Re-implementor notes

Cleared the bounce todo. Each of the four event-action overlays now imports
`SCREEN_W` / `SCREEN_H` from `src/game/screen.ts` and matches the conventions
already in `event/ui/dialogBox.ts` (BOX_H=48, font 8 px, PAD_X=8, PAD_Y=4):

- `src/game/event/actions/translatedDialogChoice.ts` — replaced hardcoded
  `WIDTH=320 / HEIGHT=240 / BOX_H=64` with screen-derived constants; option
  rows now use 10 px (8-px font + 2-px line spacing) and the cursor column
  reserves 8 px on the left. A 5-entry list (river-captain with all unlocks)
  still fits inside the standard 48-px box; the existing
  `Math.max(BOX_H, options.length * OPTION_H + PAD_Y * 2)` growth rule keeps
  longer lists clipped to the top of the box rather than off-screen.
- `src/game/event/actions/renamePlayer.ts` — same conversion; the prompt /
  editable name / hint now stack as three 10-px lines inside BOX_H=48 with
  the shortened hint text ("Type, then press Enter") fitting at 8 px.
- `src/game/event/actions/choiceMonster.ts` — identical retune for parity
  with `translatedDialogChoice`; no current map uses it but keeping the
  three overlays in lockstep avoids future drift.
- `src/game/event/actions/changeBgShared.ts` — dropped the `WIDTH`/`HEIGHT`
  re-exports entirely; `changeBg`, `changeBgChar`, and `changeBgMonster` now
  import `SCREEN_W` / `SCREEN_H` from `screen.ts` directly. `SPRITE_Y` is
  computed as `(SCREEN_H - 48) / 2 = 48` — the middle of the area above the
  standard dialog box — and the showcase sprite scales were halved (char
  4→2, monster 3→1) so they don't overflow the narrower canvas.

QA: extended `qa/viewport-and-scaling.ts` with a fifth check
(`checkChoiceOverlay`) that triggers the paper_town Rockitten signpost (uses
`monsters: []` to satisfy the `party_size < 1` gate), advances through the
two preceding dialogs + the MonsterInfo journal pop-up, and screenshots the
rendered choice box. New screenshot lives at
`qa/screenshots/ui-choice-overlay.png` and shows the "Yes / No" entries with
the cursor sitting cleanly inside the 256×144 canvas.

`grep -rnE '\b(320|240)\b' src/game/event/` now only matches the two
explanatory comments in `changeBgChar.ts` / `changeBgMonster.ts` describing
the old scale values.

Pre-commit gates:

```
npm run format:check  →  ok
npm run lint          →  ok
npx tsc --noEmit      →  ok
npm test              →  462 passed
qa/viewport-and-scaling.ts (ARITHMON_PORT=8081)  →  all 5 checks OK
```
