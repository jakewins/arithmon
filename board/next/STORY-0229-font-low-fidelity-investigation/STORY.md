# STORY-0229: Combat text low-fidelity investigation

## Description

The "What will Lambert do?" prompt — and every other piece of dialog/HUD text
rendered with the `SMALL` style (PressStart2P at 6 px) — is technically the
right size for its panel but is so visually low-**fidelity** that it's nearly
unreadable. See `example-combat-screen.png` (an example crop of the combat
bottom-left panel): each character is composed of fat, irregular blocks of
display pixels, as if a ~5 px bitmap font has been nearest-neighbour scaled up
by ~4×, with no AA halo (STORY-0211 killed that) but no internal grid
alignment either. The user's words: "very strange looking, like it was
designed for much smaller pixel sizing and sized up… good actual
screen-estate font size, but it has extremely low fidelity."

This story is an **investigation**: the screen-real-estate footprint of the
text is correct (STORY-0210 dialled it in), and we are not undoing
STORY-0208's font choice or STORY-0211's resolution fix. The goal is to
identify *why* the glyphs render as chunky, ungridded blobs at the current
size, and fix that so the same prompt at the same on-screen footprint becomes
legible. A new screenshot of the same combat prompt, checked into the story
directory as `combat-prompt-after.png`, must look obviously crisper than
`example-combat-screen.png`.

## Context

### The example screenshot

`example-combat-screen.png` (1167×280 — a window-scale crop of the combat
scene's bottom-left dialog panel) shows the symptom. Note that there is **no
gray AA fringe** — STORY-0211's `setResolution(zoom)` did flatten the AA — but
each glyph still consists of mis-shapen multi-pixel blocks that don't line up
to any consistent grid. Compare the `W` (clean blocks) to the `a` and `t`
(visibly stair-stepped, with single-pixel artefacts hanging off the
diagonals). This is not the "right" pixel-font look; this is a TTF being
rasterised at a near-but-not-equal-to-native size.

### Prior font work (read these first)

- `board/done/STORY-0206-match-upstream-resolution-and-fit/STORY.md` — switched
  the logical canvas to 256×144 with integer-snap zoom and `pixelArt: true`
  (NEAREST filtering on the final upscale).
- `board/done/STORY-0208-pixel-font-everywhere/STORY.md` — vendored upstream's
  `PressStart2P.ttf` to `public/assets/font/`, loaded it via `@font-face`,
  centralised text styles in `src/game/ui/textStyle.ts`. Every UI text site
  uses `BODY` / `BODY_LIGHT` / `SMALL` / `SMALL_HEADING` / `TITLE` /
  `BIG_LIGHT` / `NAME`, all with `fontFamily: "PressStart2P"`.
- `board/done/STORY-0210-combat-scene-layout-match/STORY.md` — adjusted combat
  HUD/menu sizes to fit upstream's 256×144 panel art; that's where the
  decision to use 6 px text for the combat prompt + HUD comes from (matches
  upstream's `FONT_SIZE = 5` in `upstream/tuxemon/platform/const/graphics.py`,
  bumped to 6 in the browser for AA legibility — see
  `src/game/ui/textStyle.ts:42-51`).
- `board/done/STORY-0211-crisp-text-rendering/STORY.md` — added
  `setResolution(zoom)` per Text object via the new `addText()` helper +
  `refreshCrispResolution` on resize. Fixed the visible AA halo; this is the
  story this one is most directly a follow-up to.
- `board/done/STORY-0224-monster-info-card-text-overflow/STORY.md` — re-laid-out
  the info card with PressStart2P metrics in mind; same `SMALL` style. Same
  symptom is visible there too, but the combat scene is the most painful.

### The current pipeline (read these files)

- `src/game/main.ts:22-84` — Phaser config. `pixelArt: true` (NEAREST scale
  filter, `roundPixels: true`), `Scale.NONE` with manual integer-zoom snap via
  `snapToIntegerZoom`. At a 1080p window, `intZoom = floor(1080/144) = 7`.
- `src/game/ui/textStyle.ts:24-88` — the seven exported `TextStyle` constants.
  `BODY` and friends use `fontSize: "8px"`; `SMALL` and `SMALL_HEADING` use
  `fontSize: "6px"`. All `fontFamily: "PressStart2P"`.
- `src/game/ui/textStyle.ts:142-201` — `addText()` calls
  `scene.add.text(...)` and then `setResolution(round(scale.zoom))`, plus
  registers the Text in a Set the resize handler walks. So the offending
  combat prompt becomes a Phaser Text with internal canvas rasterised at
  `6 px × 7 = 42 px` font on a high-DPR canvas, then sampled down `1/7×` at
  draw time inside the WebGL upscale.
- `src/game/scenes/CombatScene.ts:583-586` — the "What will X do?" prompt
  site. Uses `withWrap(SMALL, LEFT_W - PAD_X*2)` where `LEFT_W` ≈ 154 logical
  px.
- `public/style.css` — `@font-face` declares the family from
  `public/assets/font/PressStart2P.ttf`. `font-display: block`. No
  size-specific `@font-face` faces.

### Upstream's pipeline (recap from STORY-0211)

Upstream pygame: `font.render(text, True, fg)` at
`scale_int(FONT_SIZE) = FONT_SIZE × display_scale`, blit unscaled onto a
display-resolution surface (no logical→display NEAREST upscale of the
glyphs). PressStart2P @ FONT_SIZE=5 × display_scale=5 → 25 pt rasterisation
straight to device pixels. **At native PressStart2P bitmap sizes (multiples
of 8 px in design units), the TTF outlines hit pixel grid cleanly; at 5 px
(or our 6 px) they don't.** Upstream's display_scale multiplier lands the
final raster on the display grid; ours doesn't, because we rasterise at
`6 × 7 = 42` (a non-multiple of 8) and then NEAREST-sample.

## Hypotheses

Listed in order of believed likelihood. The implementor should verify (not
assume), and is free to discover a fifth cause we didn't list.

### H1 (most likely): PressStart2P is not crisp at 6 px even with `setResolution(zoom)`

PressStart2P's TTF outlines are designed for **8 px (and integer multiples
thereof)**. At 6 px the browser's TTF rasteriser has to hint glyphs into a
non-native grid; even when we then ask for `resolution=7` (rasterise the
internal canvas at `6 × 7 = 42 px`), the resulting glyphs are 42 px tall on a
5×7-design-unit-tall letterform — i.e. each design unit lands on either 6 or
7 internal canvas pixels, irregularly. When that 42-px-tall canvas is
NEAREST-sampled by Phaser's WebGL renderer back down to the world-space 6 px
and then up to 42 device pixels (zoom 7), the irregularity gets baked in,
producing the uneven-block look in `example-combat-screen.png`.

Predicted check: switching the combat prompt site to `BODY` (8 px) should
produce a visibly crisper glyph — same font, but rasterised at a size whose
design units are integer multiples of the bitmap design. If `BODY` looks
crisp and `SMALL` looks blocky in the same window, H1 is confirmed and the
problem is **the size**, not the pipeline.

### H2: `setResolution(zoom)` interacts badly with sub-pixel positioning

If the Text object's world-space `x` / `y` is not on an integer logical-pixel
boundary (e.g. centred text where `width/2` produces 0.5), the high-res
internal canvas gets sampled at a fractional offset on the way out, which
NEAREST resolves to one-pixel-off-grid drawing. We do set `roundPixels: true`
via `pixelArt`, but Phaser's `roundPixels` only rounds the **destination**
display-pixel coordinate — the source-canvas sample offset can still land
mid-texel.

Predicted check: log the `x`, `y`, `width`, and `displayOriginX` of
`this.messageText` at runtime. If any of them are non-integer, snap them and
re-screenshot.

### H3: We should be using bitmap font (BMFont / RetroFont), not Phaser Text

This was hypothesis (2) in STORY-0211 and explicitly left as the fallback if
`setResolution` didn't work. The fact that we still see fidelity problems is
prima-facie evidence that hypothesis didn't fully land. A pre-baked
`PressStart2P_5.png + .fnt` atlas (one glyph per cell, hand-tuned for 5 px
design) consumed via `add.bitmapText(...)` would bypass the TTF rasteriser
entirely. **Cost:** generate the BMFont atlas (BMFont, Snowb, or Hiero —
one-off tooling step), then migrate the `addText` helper + 16-ish call sites.
If H1 confirms that 6 px PressStart2P is simply not crisp at non-native
sizes, this is the right structural fix.

### H4: Phaser's `Text` `style.resolution` is being clobbered between construction and paint

Order of operations: `scene.add.text(...)` constructs the Text and rasterises
the canvas at the default resolution (1) once. Then `setResolution(zoom)`
triggers a re-rasterise. If anything in between (e.g. a `setStyle`,
`setWordWrapWidth`, `setText` before the next frame) re-rasterises again
without preserving the resolution, we'd be drawing the resolution-1 canvas.
Inspect the Text object's `style.resolution` and the cached `canvas.height`
at runtime — confirm they reflect the zoom.

### H5: The internal canvas is being sampled with a LINEAR filter despite `pixelArt: true`

Phaser 4 stores `Text` objects as a CanvasTexture with its own filter mode.
`pixelArt: true` sets the global default to NEAREST, but if the Text texture
opts in to LINEAR (some Phaser 3→4 migrations did), the upscale step softens
the high-res canvas back into blocky-blob territory. Verify by inspecting
`messageText.texture.source[0].glTexture` filter mode in the running game.

## What to build

This is investigation-first; the implementor is expected to spend the first
hour exploring before changing production code.

1. **Reproduce on a branch.** Boot the game, force a wild encounter with
   `await page.evaluate(() => window.A.spawnBattle("budaye", 5))` (or
   whatever the current `debug.spawnBattle` signature is — see
   `src/game/debug.ts:422-484`), screenshot the action-menu prompt panel.
   Confirm it looks like `example-combat-screen.png`. Check it into the story
   dir as `combat-prompt-before.png` (so the reviewer can see the matched
   reproduction, not just the user's screenshot).

2. **Test H1 first (cheapest).** In a throwaway QA script
   (`qa/local/font-size-sweep.ts`), render the same string at sizes 5, 6, 7,
   8, 10, 12, 14, 16 px (each PressStart2P, with `setResolution(zoom)`), all
   stacked in the combat-prompt panel. Screenshot. Eyeball which sizes look
   crisp and which look blocky. If only multiples of 8 look crisp, H1 is
   confirmed and the problem is fundamentally that we're asking PressStart2P
   to render at non-native pixel sizes.

3. **If H1 confirmed**, pick a fix:
   - **(a)** Switch to a bitmap font (option 2 from STORY-0211's list — BMFont
     atlas of PressStart2P at the exact target sizes, consumed via
     `add.bitmapText`). Most correct; highest cost.
   - **(b)** Find a pixel font whose native design is 5 px (e.g. **m5x7**,
     **Tiny Type**, **Yoster Island**, **Volter Goldfish**) and use it for
     `SMALL`/`SMALL_HEADING`, keep PressStart2P for `BODY`/`TITLE`/`NAME` at
     8 px / 16 px. Cheaper than BMFont; mixes two fonts.
   - **(c)** Re-scale all `SMALL` sites up to `BODY` (8 px) and re-do the
     layout fits — i.e. accept upstream's "we render at non-native sizes too"
     compromise is wrong for the browser. This bleeds into STORY-0210
     territory and is the riskiest option for visual regressions; only pick
     it if neither (a) nor (b) is viable.

   The implementor decides between (a)–(c) after looking at the H1 sweep.
   Recommend (b) as the default — lowest cost, no asset pipeline, no
   call-site migration. If you do (b), document the chosen font face, its
   licence, where it's vendored from, and what `font-display`/`@font-face`
   line was added; treat it like STORY-0208 did for PressStart2P.

4. **If H1 is *not* confirmed** (i.e. all sizes look similarly blocky):
   investigate H2–H5 in order. Each is a code-level inspection; the fix is
   likely a one-or-two-line change in `src/game/ui/textStyle.ts` once the
   cause is identified.

5. **Land the fix narrowly.** Whatever the cause, the smallest viable
   diff that produces a legible combat prompt is the goal. Do not re-litigate
   layout (`board/done/STORY-0210-combat-scene-layout-match/STORY.md` and
   STORY-0224 already tuned panel/text fits), do not re-litigate the font
   loader (STORY-0208), do not undo `setResolution(zoom)` (STORY-0211 — that
   fix was correct, just insufficient).

6. **Re-screenshot every surface that uses `SMALL` / `SMALL_HEADING`.**
   The fix will land across:
   - the combat prompt (`CombatScene.ts:585`)
   - combat HUD names (`CombatScene.ts:471, 473`)
   - the DP label (`CombatScene.ts:513`)
   - the attack info card (`CombatScene.ts:597-608`)
   - the monster info screen rows (`MonsterInfoScene.ts:173, 182, 189, 198, 204, 216, 242, 245`)

   …plus any other `SMALL` consumer. `grep -n "SMALL\b\|SMALL," src/game/` is
   the complete list; visually verify each.

7. **Document root cause in the commit message and journal.** Reviewer needs
   to know which hypothesis was the cause so this doesn't recur.

## Engine-side considerations

- **Don't break the resize handler.** `refreshCrispResolution` in
  `src/game/ui/textStyle.ts:192-201` walks every tracked Text on integer-zoom
  change. If you switch to `BitmapText`, those don't have `setResolution`;
  remove them from tracking or gate the call.
- **Tests use stubbed scenes** (see the `setResolution`/`once` guard in
  `applyCrispResolution`). Any new Text/BitmapText helper needs the same kind
  of stub-safety.
- **`font-display: block`** in `public/style.css` keeps the browser
  text-suppressed until the font arrives — preserve that on any new face.
- **Vendored fonts must have a licence file** sitting next to the .ttf
  (STORY-0208 ships `OFL.txt` for PressStart2P). Match that for any new
  font.
- The layout assumes 6 px glyph height with ~7 px line height; a 5 px design
  font may have a slightly different metric, which could nudge the
  vertically-centred message text. Snap to integer y after measuring.

## QA Validation

Add `qa/text-fidelity.ts` (checked into `qa/`, not `qa/local/`). Steps:

1. **Boot and spawn battle.**
   ```ts
   import { launchGame, setupGame, screenshot } from "./harness";
   const { page, close } = await launchGame();
   await setupGame(page);
   await page.evaluate(() => window.A.spawnBattle("budaye", 5));
   // Wait for action-menu prompt; the "What will X do?" text is the cue.
   ```
2. **Screenshot the combat prompt.** Save as
   `board/<lane>/STORY-0229-.../combat-prompt-after.png`. Crop to roughly
   match `example-combat-screen.png` (bottom-left panel only) so the
   reviewer can put them side by side.
3. **Screenshot the HUD.** Capture the enemy/player name labels (also
   `SMALL`) — full combat screen at native zoom and at one 2× zoom-in for
   detail. Save as `combat-hud-after.png`.
4. **Screenshot the monster info screen.** `await
   page.evaluate(() => window.A.openMonsterInfo(0))` or equivalent (check
   `debug.ts`). Save as `monster-info-after.png`.
5. **Re-run `qa/pixel-font-readability.ts`** (STORY-0208's suite). Confirm no
   regressions on `BODY` / `TITLE` / `NAME` surfaces — only `SMALL` should
   change.

The reviewer will eyeball `combat-prompt-after.png` next to
`example-combat-screen.png` and confirm:

- Every glyph in "What will Lambert do?" is composed of regular, uniform
  blocks of display pixels — no stair-stepped diagonals, no fat-on-one-side
  thin-on-the-other strokes.
- Letter weight is consistent across the line (the `a`/`t`/`b` no longer
  look heavier than the `W`).
- The text takes roughly the same vertical and horizontal space as before
  (this story does not change the size budget).

## Out of scope

- Changing dialog-box panel art, colours, or borders.
- Restyling `BODY` / `TITLE` / `NAME` if they already look crisp (8 px and
  16 px PressStart2P should be fine — they're integer multiples of the
  native bitmap design).
- Internationalisation / non-ASCII glyph support. If the chosen pixel font
  doesn't ship Cyrillic/CJK, that's a follow-up.
- Adding a second font family for headings vs body if H1 turns out to be
  wrong (i.e. if the fix is a pipeline change, not a font change).
- Re-running every QA script that touches text. Spot-check the four scenes
  in step 6 of *What to build*; do not rewrite the rest.

## Acceptance Criteria

- [ ] Root cause documented in the commit message and `JOURNAL.md` — which
      hypothesis (H1–H5 or a new one) was the actual cause.
- [ ] `combat-prompt-before.png` and `combat-prompt-after.png` are checked
      into the story directory. `combat-prompt-after.png` shows "What will
      <player> do?" rendered crisply — uniform-block glyphs, consistent
      stroke weight — at the **same screen-real-estate footprint** as
      `example-combat-screen.png` (no significant size change).
- [ ] `combat-hud-after.png` and `monster-info-after.png` are checked in;
      every `SMALL`/`SMALL_HEADING` surface in the game looks consistent with
      the new fidelity.
- [ ] `qa/text-fidelity.ts` is checked in, runs end-to-end, and produces the
      three screenshots above.
- [ ] No regression in `BODY`/`TITLE`/`NAME` text rendering (STORY-0208's
      `qa/pixel-font-readability.ts` still passes visually).
- [ ] If a new font is vendored, its licence file is checked in next to the
      .ttf and `@font-face` is declared in `public/style.css` with
      `font-display: block`.
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
      all pass.
