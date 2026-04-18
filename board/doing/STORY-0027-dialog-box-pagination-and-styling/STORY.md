# STORY-0027: Dialog box pagination and styling

## Description

Our dialog box is a plain dark rectangle that clips text when it overflows. Tuxemon fits only 4 lines in its dialog box too, but handles longer text by **paginating**: it splits text into pages of up to N lines, types out each page, then shows a "▼" prompt. Pressing interact advances to the next page (or dismisses the dialog on the last page). Tuxemon also has a nicely styled dialog box — a bordered panel with a light background (see `mods/tuxemon/gfx/borders/borders.png`, a 3×3 nine-slice image) instead of our dark semi-transparent rectangle.

This story adds pagination and visual styling to the dialog system to match Tuxemon's look and behavior.

### How Tuxemon does it

**Pagination** (`tuxemon/ui/text_paginator.py`):
- `TextPaginator` takes `max_line_length` (chars per line for word wrapping) and `max_lines_per_page`.
- Text is first word-wrapped to `max_line_length`, then the resulting lines are chunked into pages of `max_lines_per_page` lines each.
- `DialogState` holds a `text_queue` (list of page strings). When the current page finishes typing and the player presses interact, `next_text()` pops the next page. When the queue is empty, the dialog is dismissed.

**Styling** (`tuxemon/menu/alert.py`, `tuxemon/ui/draw.py`):
- The dialog box is a `GraphicBox` rendered with a nine-slice border sprite.
- Background fill is a solid light color (e.g. near-white `rgb(248, 248, 248)`).
- Text is dark (near-black `rgb(10, 10, 10)`) with an optional lighter shadow.
- The border image is divided into a 3×3 grid: corners are drawn as-is, edges are tiled, and the center is filled.

### What to build

#### 1. Shared `DialogBox` helper

Extract the duplicated dialog rendering (currently copy-pasted across `dialog.ts`, `translatedDialog.ts`, `accessPc.ts`) into a shared helper: `src/game/event/ui/dialogBox.ts`.

The `DialogBox` class encapsulates:
- Creating/destroying the box background, border, text label, and prompt indicator
- Typewriter effect with skip-on-interact
- **Page-based pagination** — the caller passes full text, `DialogBox` splits it into pages and handles page advancement internally
- Reporting when all pages have been dismissed (`isDone`)

#### 2. Pagination logic

- Word-wrap the text to fit the box width (we can continue to use Phaser's `wordWrap` for this).
- After the typewriter finishes a page and the "▼" prompt appears, pressing interact advances to the next page (resetting typewriter state) rather than dismissing.
- On the last page, pressing interact reports done so the action can finish.
- Determine `maxLinesPerPage` empirically from the box height, font size, and line spacing (should be ~4 lines with the current 84px box at 9px font + 2px spacing).

#### 3. Styled dialog box

Replace the dark `Rectangle` with a nine-slice bordered panel matching Tuxemon's look:

- **Background**: light/near-white fill (e.g. `rgb(248, 248, 248)`)
- **Border**: a nine-slice sprite. We can create a simple border image inspired by Tuxemon's `borders.png` (a 3×3 grid image where each cell is the same size — corners, edges, center). Use Phaser 4's `NineSlice` game object if available, or render the 9 pieces manually with tiled edges.
- **Text color**: dark (near-black, e.g. `#1a1a1a`)
- **Prompt indicator**: matching dark color, still "▼"

Use Tuxemon's `borders.png` directly from `mods/tuxemon/gfx/borders/borders.png` in the Tuxemon repo. Copy it into our assets as `assets/ui/dialog-border.png`.

#### 4. Refactor existing dialog actions

Update `dialog.ts`, `translatedDialog.ts`, and `accessPc.ts` to use the shared `DialogBox` instead of duplicating the rendering code. Each action becomes thin — construct a `DialogBox`, delegate `update()` to it, and check `isDone`.

### Tasks

1. **Create `DialogBox` helper** (`src/game/event/ui/dialogBox.ts`)
   - Constructor takes: `scene`, `fullText`, and optional config (colors, font size, etc.)
   - `start()`: creates background, border, text label, prompt; splits text into pages; begins typewriter on page 0
   - `update(dt, interactPressed)`: runs typewriter, handles skip/advance/dismiss; returns `{ done: boolean }`
   - `destroy()`: cleans up all game objects
   - Pagination: split wrapped text into pages of `maxLinesPerPage` lines

2. **Add dialog border asset** (`public/assets/ui/dialog-border.png`)
   - Copy Tuxemon's `mods/tuxemon/gfx/borders/borders.png` into our assets
   - This is a nine-slice-friendly 3x3 grid image

3. **Style the dialog box**
   - Use nine-slice rendering for the border
   - Light background fill, dark text, matching prompt color
   - Ensure it looks good at the game's 3x zoom (320x240 viewport)

4. **Implement pagination**
   - After Phaser word-wraps the text, measure how many lines fit per page
   - Split into pages, type each page separately
   - "▼" prompt between pages; on last page it still shows "▼" (matching Tuxemon)
   - Interact advances pages; on last page, interact dismisses

5. **Refactor `dialog.ts`** to use `DialogBox`
   - Thin wrapper: pass `args.join(" ")` to DialogBox, delegate lifecycle

6. **Refactor `translatedDialog.ts`** to use `DialogBox`
   - Same pattern, with `t(key)` for text lookup

7. **Refactor `accessPc.ts`** to use `DialogBox` (if it has dialog rendering)

8. **Update `translatedDialogChoice.ts`** if needed
   - The choice dialog may need its own treatment since it has selectable options, but it should still benefit from the styled background/border

9. **Tests**
   - Pagination splits text correctly into pages
   - Single-page text works as before (no regression)
   - Multi-page text advances on interact and dismisses on last page

## QA Validation

Use `/puppeteer` to verify this story in a real browser. Write a QA script that:

1. Launches the game, walks to the greeter NPC, and triggers a dialog (`interact`)
2. Takes a screenshot of the styled dialog box — verify nine-slice border, light background, dark text
3. If the dialog text is short (single page), verify interact dismisses it
4. To test pagination: find or create an NPC with long dialog text (or temporarily edit the greeter's text to be 8+ lines). Trigger the dialog, screenshot the first page, advance with `interact`, screenshot the second page, then dismiss
5. Verify the "▼" prompt is visible between pages

The dialog box is the most visually prominent UI element — screenshot it at each stage and inspect.

## Acceptance Criteria

- [ ] Long dialog text is split into pages of ~4 lines; pressing interact advances to the next page
- [ ] On the last page, pressing interact dismisses the dialog (same as current behavior)
- [ ] Pressing interact during typewriter still skips to full page text (not full multi-page text)
- [ ] Dialog box has a styled border (nine-slice) and light background matching Tuxemon's look
- [ ] Text is dark on light background, readable at 3x zoom
- [ ] Dialog rendering code is shared via `DialogBox` — no more copy-paste across actions
- [ ] Existing dialog and translated_dialog actions work identically (just look nicer)
- [ ] All code passes formatter, linter, typecheck, and tests
