# STORY-0211: Render text crisply (no aliasing halo), keeping the current size

## Description

After STORY-0208 (PressStart2P) and STORY-0210 (smaller HUD/menu text), our UI text picked up a visible blurred-edge halo. Every glyph has a soft gray fringe around it that looks like an image scaled in Photoshop with bilinear filtering — characteristic of pixel-art scaled with the wrong filter. The text **size** is now in the right ballpark; the **rendering pipeline** is what's broken.

### Reference screenshots

In this story directory:

- `current-fuzzy.png` — our "What will Lambert do?" prompt today. Each glyph has a clear gray AA halo. The pixels of each letter are not aligned with the display pixel grid.
- `upstream-crisp.png` — upstream rendering the exact same string. Each glyph is composed of clean, solid blocks. No gray fringe. Pixel art as it's supposed to look.

The goal is to make ours look like upstream's at the **current text size**. Do not solve this by making the text bigger — STORY-0210 already dialed the size in for HUD/menu fit.

### Why this is happening (likely)

Our pipeline:

1. Phaser's `Phaser.GameObjects.Text` rasterizes each label via Canvas 2D `fillText` into a small internal `<canvas>` at the **logical font size** — e.g. `6 px` for `SMALL` in `src/game/ui/textStyle.ts:47`.
2. The browser's font rasterizer applies sub-pixel anti-aliasing to PressStart2P's outlines at 6 px — producing a 6-px-tall canvas with soft gray pixels around each glyph's edges.
3. That canvas is uploaded as a WebGL texture and rendered to the game canvas at logical world coordinates.
4. The game canvas (256×144 logical) is scaled up to display resolution via `game.scale.setZoom(intZoom)` in `src/game/main.ts:65-78`. With `pixelArt: true` (line 28), WebGL uses **NEAREST** sampling.
5. Each 1-px AA fringe pixel from step 2 becomes a 6×6 (or 7×7, depending on window size) block of the same gray colour. **That's the halo we see.**

Upstream avoids this entirely:

- `upstream/tuxemon/ui/text_renderer.py:33` rasterises PressStart2P at `scale_int(FONT_SIZE)` — i.e. `FONT_SIZE × display_scale`. At a 1280×720 window with 256×144 native and `config.scaling = True`, that's `5 × 5 = 25 pt`.
- `upstream/tuxemon/ui/text_renderer.py:46,88` calls `self.font.render(text, True, fg)` — **antialias=True** (the `True` second arg). So upstream is also rendering with AA, but at the **display resolution**, so the AA fringes are exactly 1 device pixel — invisible to the eye.
- `upstream/tuxemon/prepare.py:76` calls `pg.display.set_mode(CONFIG.resolution, ...)` — pygame draws everything directly to the upscaled framebuffer; there's no logical→display upscaling step that magnifies AA pixels.

So the difference isn't *whether* AA is enabled. It's *at what resolution the text is rasterised*.

### Hypotheses to evaluate (verify before committing to one)

1. **Phaser `Text.resolution` will fix this on its own.** Phaser's `TextStyle.resolution` (or `Text.setResolution(n)`) tells the Text object to rasterise its internal canvas at `n × the requested font size`. Then at display time the canvas is sampled at `1/n` × world scale; combined with our integer zoom and NEAREST filter, each device pixel should land on a whole source pixel of the high-DPI text canvas. Set `resolution = currentZoom` (e.g. 6 at 1080p with our 256×144 base). Cheap. No asset work. **Risk:** at runtime zoom changes via `snapToIntegerZoom` (resize), existing Text objects keep their old resolution and look wrong until rebuilt. May need a re-paint or resolution-snap pass when zoom changes.
2. **Use a bitmap font (BMFont).** Pre-rasterise PressStart2P at each target size (6, 8, 16 px) into a sprite atlas + `.xml/.fnt` descriptor. Replace `add.text(...)` with `add.bitmapText(...)`. Each glyph becomes a pre-baked image — no rasterisation at runtime, NEAREST scaling preserves pixels exactly. Most correct pixel-art approach. **Cost:** generate the BMFont assets (one-off tooling step — BMFont, Snowb, or Hiero), and update ~16 files that call `add.text(...)`. Overlaps with STORY-0208 territory.
3. **`Phaser.GameObjects.RetroFont`.** Phaser ships a fixed-grid retro-font system that expects a uniform sprite sheet (8×8 glyphs in our case). Simpler asset than BMFont. **Cost:** generate an 8×8 atlas for PressStart2P, write a tiny lookup for the SMALL size (6 px), update call sites.
4. **Disable Canvas2D text antialiasing.** Setting `ctx.textRendering = "optimizeSpeed"`, `font-smooth: never`, or `imageSmoothingEnabled = false` on the text canvas might force 1-bit glyphs. **Concerns:** browser support is inconsistent; even when honoured, 1-bit PressStart2P at 6 px may look broken because the underlying TTF outlines weren't designed for sub-bitmap rasterisation without AA.
5. **HTML overlay.** Render text as `<div>` over the game canvas using DOM. Browser will rasterise at native DPR. **Concerns:** positioning over a zooming canvas is fragile, text becomes selectable/copyable, accessibility/behavior diverges from rest of UI. Probably not worth it.

Recommended evaluation order: **(1) first** — it's a one-line change. If it works, ship it and stop. **(2) as fallback** if `Text.resolution` doesn't behave as expected in Phaser 4.

### Where to look

- `src/game/main.ts:22-78` — Phaser config (`pixelArt: true`, `Scale.NONE`, manual integer zoom via `snapToIntegerZoom`).
- `src/game/ui/textStyle.ts` — every text style in the game funnels through here. If the fix is a config change (option 1), this is where the new field lands. If it's a BitmapText migration (option 2), this module becomes the central definition of which atlas + size to use.
- `src/game/screen.ts` — exports `SCREEN_W`/`SCREEN_H` (256, 144). The current zoom isn't exported anywhere; the implementer may need to expose it via the scale manager (e.g. via `game.scale.zoom`).
- `public/style.css` — the `@font-face` declaration for PressStart2P. Stays the same for option 1; may become unused for option 2 (but keep it — fallback fonts during dev are useful).

### What to build

1. **Test option 1 in a throwaway**: spin up `qa/local/repro-text-fuzz.ts`, add `setResolution(currentZoom)` to one of the existing Text objects, screenshot before/after. If the halo disappears and the glyphs go pixel-crisp, this is the fix.
2. **If option 1 works:** extend `BODY`/`BODY_LIGHT`/`SMALL`/`HEADING`/`TITLE`/`NAME`/`BIG_LIGHT` in `textStyle.ts` to include `resolution: currentZoom`, where `currentZoom` is read from `game.scale.zoom` at the moment the style is consumed. Most call sites use the style at scene `create()` time which is post-boot, so the zoom is already set. Verify: add a resize listener that walks every active `Phaser.GameObjects.Text` and calls `setResolution()` on each — or document the limitation that resize-during-play leaves text fuzzy until the scene restarts.
3. **If option 1 doesn't work:** fall back to option 2. Generate `public/assets/font/PressStart2P_6.png` + `.fnt` (and 8, 16 sizes too). Replace every `add.text(...)` call across the same 16 files STORY-0208 touched with `add.bitmapText(...)`. Update `textStyle.ts` exports to be **atlas keys + size**, not Canvas TextStyle objects.
4. **Re-screenshot the four reference scenes** from STORY-0208 (dialog box, combat scene, monster info, math quiz) and confirm none of them regressed. Whichever option lands, the visual target is: text matches `upstream-crisp.png` for letter-edge sharpness.

### QA Validation

Add `qa/text-crispness.ts` (checked in). Against the running dev server:

1. **Combat dialog screenshot.** Force a wild encounter; screenshot the "What will X do?" prompt zoomed in. Compare side-by-side with `upstream-crisp.png` (place both in `JOURNAL.md`). Each glyph's edges must be solid pixels — no gray fringe.
2. **Monster name overflow check.** Re-verify STORY-0210's HUD label fit — the fix must not change effective text size. "Pairagrin Lv2" still has to fit inside the 85-px enemy HUD panel.
3. **Resize test.** Resize the browser window across at least three integer-zoom breakpoints (e.g. 800×600 → 1280×720 → 1920×1080). Screenshot text in the combat scene at each. Verify text stays crisp at every breakpoint, not just the initial one.
4. **Different scenes.** Open the math quiz, monster info viewer, party screen, and main menu. Screenshot text in each. None should have the fuzzy halo.

The implementing agent **MUST eyeball at least the combat-dialog screenshot side-by-side with `upstream-crisp.png` in the browser** before flipping to `reviewing/`. The fix is purely visual; tests passing means nothing if the screenshots still look fuzzy.

### Out of scope

- Changing any text **size**. STORY-0210 dialled HUD/menu sizes; don't re-litigate.
- Changing the font itself away from PressStart2P. If option 2 lands, we're still rendering PressStart2P glyphs — just via BMFont instead of TTF.
- Rendering perf / memory analysis. If option 2 doubles texture-memory budget for fonts, fine — it's still tiny absolutely.
- Subpixel positioning. Pixel art lives on whole pixels; if any text object lands on a half-pixel x/y (e.g. centring), snap to integer in the call site rather than papering over with smoothing.

## Acceptance Criteria

- [ ] Root cause documented in `JOURNAL.md` — confirm which hypothesis from the list above was the actual cause, and which option fixed it
- [ ] Combat dialog text matches the crispness of `upstream-crisp.png` — no gray AA halo around glyph edges, each character composed of solid blocks
- [ ] Text **size** unchanged from STORY-0210 — HUD labels still fit inside their panels, action menu still matches upstream framing
- [ ] Fix holds across the three resize breakpoints tested by `qa/text-crispness.ts`
- [ ] `qa/text-crispness.ts` exists, is checked in, captures screenshots from combat + at least three other scenes, and references them in `JOURNAL.md`
- [ ] If option 2 (BitmapText) is chosen: every `add.text(...)` site in the listed 16 files migrated to `add.bitmapText(...)`; no `add.text(...)` calls remain in production scene code
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
