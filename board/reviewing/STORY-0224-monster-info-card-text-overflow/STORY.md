# STORY-0224: Monster info card text overflow

## Description

The monster info card (`MonsterInfoScene`) renders the right-column rows
("ID", monster name, "Cute Boulder Species", height/weight, Type(s), "Body Type:
Hunter") at font sizes too large for the cream panel, so the name and any
mid-tier label longer than ~16 chars runs off the right edge. The user's
screenshot (`/home/jake/Pictures/Screenshots/20260521_120103.png`) shows
**ROCKITTE** (missing the final N), **Cute Boulder Spe**, and **Body Type:
Hunte** all clipped.

Goal: every right-column label, the description, and the evolution list fit
inside the cream panel for **every monster currently in
`src/game/data/monsters.ts`** — including the longest species string we ship
(`cat_cute_boulder` = "Cute Boulder", giving "Cute Boulder Species" at 20
chars) and the longest body-type label we ship (`hunter` → "Body Type: Hunter"
at 17 chars). Size for the worst-case strings in our DB, not just for
"ROCKITTEN".

## Context

- The scene under repair: `src/game/scenes/MonsterInfoScene.ts`. Layout/font
  decisions live in `renderMonster()` (lines 155-213) and the constants at
  the top of the file.
- The original viewer was added in STORY-0201
  (`board/done/STORY-0201-monster-info-viewer-screen/STORY.md`). Subsequent
  text work — STORY-0208 (pixel font everywhere) and STORY-0211 (crisp text
  rendering) — switched the engine to PressStart2P and introduced
  `addText()` with crisp `setResolution`. PressStart2P is **monospaced 8×8**,
  so at our `BODY` style (8 px) every glyph is 8 design pixels wide. The
  STORY-0201 layout was sized for a proportional font; the overflow has been
  latent since the font swap.
- Right column geometry today (`MonsterInfoScene.ts:36-44`):
  - `RIGHT_COL_X = 126` (matches upstream's `fxw(126/256)` exactly).
  - Cream panel inner right edge sits around x ≈ 252 → available
    right-column width ≈ **126 px**.
- Current font assignments and resulting widths at PressStart2P 8 px / 16 px:
  - Name `NAME` 16 px: "ROCKITTEN" = 9 × 16 = **144 px** → overflows by 18 px.
  - Species `BODY` 8 px: "Cute Boulder Species" = 20 × 8 = **160 px** → 34 px over.
  - Body Type `BODY` 8 px: "Body Type: Hunter" = 17 × 8 = **136 px** → 10 px over.
  - Size `BODY` 8 px: "55.0 cm 9.0 kg" = 15 × 8 = 120 px → just fits.

### Upstream font sizes for this exact screen

Upstream `upstream/tuxemon/states/journal_info.py:32-218` assigns three font
sizes via `pygame_menu` labels:

- **Name** (`lab1`, line 67): `self.font_type.biggest`
- **ID, weight, height, type label, type names, species, shape (body type),
  description** (`lab2..lab9`): `self.font_type.small`
- **Evolution-list slugs** (the labels inside the `histories` frame_h,
  line 213): `self.font_type.smaller`

Numeric values are in `upstream/tuxemon/platform/const/graphics.py:75-80`:

```
FONT_SIZE_SMALLER = 3
FONT_SIZE_SMALL   = 4
FONT_SIZE         = 5
FONT_SIZE_BIG     = 6
FONT_SIZE_BIGGER  = 7
FONT_SIZE_BIGGEST = 8
```

These are design-pixel sizes (then multiplied by `scale_int()` to display
pixels). The upstream design canvas is 256 px wide — **the same as our
`SCREEN_W = 256`** — so the design-pixel values are directly comparable to
our font-size constants. Upstream's configured font is also PressStart2P
(`/home/jake/Code/third/tuxemon/tuxemon/config.py: font_file: str =
"PressStart2P.ttf"`), so character widths match ours one-to-one.

That gives the upstream-faithful sizes on our canvas:

| Element                                    | Upstream    | Recommended on our 256 px canvas |
|--------------------------------------------|-------------|----------------------------------|
| Name                                       | 8 design px | 8 px (= our `BODY` size, bold)   |
| ID, species, height/weight, type label, type names, body type, description | 4 design px | 6 px (= our existing `SMALL`)¹   |
| Evolution-list slugs                       | 3 design px | 6 px² (or 4 px if implementor judges legible) |

¹ `src/game/ui/textStyle.ts:38-50` already documents that PressStart2P below
6 px does not anti-alias acceptably in the browser — that's why our `SMALL`
is 6 px, not 4 px or 5 px. We deviate from upstream's design-pixel size
here for legibility, and that deviation is an established codebase choice.

² Evolution slug labels are uppercased monster names — short, never more
than ~12 chars. 6 px is fine for fit. If 4 px is legible the implementor can
match upstream more closely, but 6 px is the safe default.

### Sanity check: worst-case widths after the fix

Computed against `src/game/data/monsters.ts` — only 5 monsters have the
viewer fields populated (rockitten, lambert, nut, tweesher, agnite). All
five names ≤ 9 chars. Their `cat_<species>` strings live in
`public/assets/l10n/en_US.po`; longest is **"Cute Boulder Species"** (20
chars). Longest body-type string we use is **"Body Type: Hunter"** (17
chars).

- Name "ROCKITTEN" at 8 px PressStart2P-bold: 9 × 8 = **72 px** ✓ (fits in 126).
- "Cute Boulder Species" at 6 px (`SMALL`): 20 × 6 = **120 px** ✓.
- "Body Type: Hunter" at 6 px: 17 × 6 = **102 px** ✓.
- "55.0 cm 9.0 kg" at 6 px: 15 × 6 = **90 px** ✓.
- Evolution list "ROCKAT" at 6 px: 6 × 6 = 36 px ✓.

If future monsters get bin-viewer data, the implementor should grep the PO
file for the longest `cat_<X>` string they introduce and re-verify it fits
in the 126 px column at the chosen font size.

## What to build

1. **Shrink the name style.** Update the `NAME` constant in
   `src/game/ui/textStyle.ts` from 16 px to 8 px (still bold), with a
   comment citing upstream's `FONT_SIZE_BIGGEST = 8` design-pixel value.
   Confirm via grep that `NAME` is only referenced from
   `MonsterInfoScene.ts` (it was introduced for that scene); if anything
   else has started using it for the old 16 px behaviour, introduce a
   distinct constant instead.

2. **In `src/game/scenes/MonsterInfoScene.ts:renderMonster()`** switch every
   right-column row except the monster name from `BODY` to `SMALL`:
   - ID line (`BG_Y + 6`).
   - Species line (`BG_Y + 30`).
   - Size line (`BG_Y + 40`).
   - "Type(s)" label and type-name row inside `renderTypeRow()` (both
     `addText` calls).
   - Body Type line (`BG_Y + 68`).

3. **Switch the bottom panel to small fonts** to match upstream
   (description = small, evolution heading = small bold, evolution slugs =
   smaller; per `journal_info.py:177, 192, 213`):
   - Description (`DESC_Y`): `BODY` → `SMALL` (preserve
     `withWrap(..., BOTTOM_PANEL_W)`).
   - Evolution heading (`EVO_LABEL_Y`): `HEADING` (8 px bold) → a bold
     variant of `SMALL` — either inline `{ ...SMALL, fontStyle: "bold" }`
     or add a `SMALL_HEADING` constant to `textStyle.ts`.
   - Evolution slug list (`EVO_LIST_Y`): `BODY` → `SMALL`.

4. **Re-check vertical spacing.** Dropping row heights from 8 px to 6 px
   packs rows tighter than upstream's panel was designed for. Our y-offsets
   were ported directly from `journal_info.py`'s normalised offsets
   (`fxh(19.8 / 144)` × 144 = 19.8 ≈ `BG_Y + 14` for the name etc.), which
   *assume* the small font sizes — so once we shrink the fonts our rows
   should fit better, not worse. Spot-check visually in the QA screenshots;
   only nudge a row if anything visibly collides with the row above or
   below. **Do not move** `SPRITE_CENTER_X/Y`, `BOTTOM_PANEL_X`,
   `BOTTOM_PANEL_W`, or the type-icon geometry — they are not implicated
   by this story.

5. **No changes to monster data, l10n strings, or assets.** This story is
   purely a font-sizing fix.

## Engine-side considerations

- `addText()` already applies crisp `setResolution` to whatever style is
  passed in — switching from `BODY` to `SMALL` does not interact with the
  crispness machinery. STORY-0211's `applyCrispResolution` runs as normal.
- PressStart2P at 6 px is already in use in the combat HUD (per
  `textStyle.ts:42-50` doc comment) — there's no new font-loading or
  rendering surface to validate. No new `@font-face` rules.
- `MonsterInfoScene` is launched on top of the parent scene (not via
  pause/resume) and stashes the previous DebugBridge scene; nothing about
  this change touches the lifecycle or input handling. Existing close
  handlers (B / ESC / X / BACKSPACE) keep working.
- If a `SMALL_HEADING` constant is added, drop the unused `HEADING`
  constant only if nothing else references it (`grep -nR 'HEADING\b' src/`).
  Per `[[feedback_dead_code]]`, prefer to remove dead code in the same
  commit; otherwise leave `HEADING` alone — out of scope.

## QA Validation

Use `/puppeteer`. `qa/monster-info-viewer-test.ts` already exists from
STORY-0201 — extend it (don't fork). Today it only screenshots `lambert`.
After this change it should:

1. Iterate over every monster slug that has full viewer data populated.
   Today that's `["rockitten", "lambert", "nut", "tweesher", "agnite"]`.
   Hard-code the list in the QA script. For each:
   - Open the info scene via `window.A.openMonsterInfo(slug)`.
   - Wait for `MonsterInfoScene` to become active (existing helper pattern).
   - `await screenshot(page, \`monster-info-${slug}\`)`.
   - Dispatch B keydown/keyup to close.
   - Wait for `MonsterInfoScene` to no longer be active before moving on.
2. The five screenshots (`monster-info-rockitten.png`,
   `monster-info-lambert.png`, `monster-info-nut.png`,
   `monster-info-tweesher.png`, `monster-info-agnite.png`) land in the QA
   harness's screenshot output directory. The reviewer cross-checks each
   PNG against:
   - The full uppercase name fits inside the cream panel (rightmost
     character not clipped at the blue border).
   - The species string ends with the word "Species" fully rendered.
   - The "Body Type: <shape>" line ends with the shape name fully rendered.
   - The "<h> cm <w> kg" line is intact.
   - The description wraps within the bottom panel as before, and the
     "Evolution" heading + slug list render fully.
3. Keep the existing assertions (`MonsterInfoScene` becomes active, then
   `OverworldScene` is active after close) — they should still pass for
   every iteration.

The existing `window.A.openMonsterInfo(slug)` debug helper
(`src/game/debug.ts:508`) is sufficient — no new helper needed.

## Out of scope

- LEFT/RIGHT cycling between monsters (still deferred from STORY-0201).
- Populating viewer fields for monsters beyond the 5 bin monsters — only
  those 5 have `txmnId`, `species`, `shape`, `heightCm`, `weightKg`,
  `descriptionKey` set, and only those are reachable via `open_journal`.
- Re-tuning the bottom-panel layout, sprite frame position, or type-icon
  positions — none are involved in the overflow.
- Adding scale-to-fit or ellipsis behaviour. Upstream doesn't do that and
  we don't need it once the font sizes are right.

## Acceptance Criteria

- [ ] `NAME` (or the style used for the monster-name label in
      `MonsterInfoScene.ts`) renders at 8 px PressStart2P bold, citing
      upstream's `FONT_SIZE_BIGGEST = 8`.
- [ ] Every right-column row in `MonsterInfoScene.ts:renderMonster()` other
      than the name uses `SMALL` (6 px), matching upstream's
      `FONT_SIZE_SMALL = 4`.
- [ ] Description and evolution sections in the bottom panel use `SMALL`
      (and a bold-`SMALL` for the "Evolution" heading).
- [ ] `qa/monster-info-viewer-test.ts` screenshots all 5 viewer-ready
      monsters; the committed PNGs show every right-column label fitting
      inside the cream panel (name fully rendered, species ends in
      "Species", body type shows the full shape name).
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
      all pass.
