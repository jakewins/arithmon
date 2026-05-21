/**
 * Shared `Phaser.Types.GameObjects.Text.TextStyle` constants for all UI text
 * in the game. Every `scene.add.text(...)` call should spread one of these
 * (or a `withColor` / `withWrap` variant) rather than inlining `fontSize` and
 * `fontFamily` strings — keeps the UI consistent and means we only have one
 * place to swap fonts.
 *
 * The font itself is PressStart2P — the same bitmap pixel font upstream
 * Tuxemon ships in `upstream/mods/tuxemon/font/PressStart2P.ttf`. PressStart2P
 * is an 8×8 bitmap, designed to render crisp at single-digit pixel sizes;
 * rendering at 8 px on our 256×144 viewport keeps every glyph on a whole
 * pixel after integer-zoom scaling. Upstream's combat HUD uses a 5 px size
 * (FONT_SIZE in upstream/tuxemon/platform/const/graphics.py); we expose
 * that as SMALL — at 6 px in the browser it still anti-aliases acceptably
 * and matches upstream's glyph footprint inside the 100×29 / 104×37 HUD
 * panel art.
 *
 * Loading: `@font-face` in `public/style.css` declares the family; the
 * browser starts fetching the .ttf during initial HTML parse. We additionally
 * call `ensureUiFontLoaded()` from `main.ts` before constructing `new Game()`
 * so the first frame paints in PressStart2P (not the fallback Arial).
 */

export const UI_FONT_FAMILY = "PressStart2P";

/** Body — the default for menus, dialog, HUD labels. 8 px = PressStart2P's native grid. */
export const BODY: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: UI_FONT_FAMILY,
  fontSize: "8px",
  color: "#1a1a1a",
};

/** Same as BODY but white — combat HUD names, on-background-art labels. */
export const BODY_LIGHT: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: UI_FONT_FAMILY,
  fontSize: "8px",
  color: "#ffffff",
};

/**
 * Compact body text — combat HUD names, action menu, in-combat prompt.
 * Targets upstream Tuxemon's 5 px FONT_SIZE used by combat_menus.py; at 6 px
 * the glyphs still anti-alias acceptably while fitting inside upstream's
 * tighter HUD-panel rectangles (name+level inside 85×30 / 110×50 boxes).
 * Used anywhere we'd otherwise overflow at the 8 px BODY size.
 */
export const SMALL: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: UI_FONT_FAMILY,
  fontSize: "6px",
  color: "#1a1a1a",
};

/** Bold variant of SMALL — section headings inside compact panels (e.g. the
 * journal/info screen's "Evolution" label). 6 px to match SMALL's body text. */
export const SMALL_HEADING: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: UI_FONT_FAMILY,
  fontSize: "6px",
  color: "#1a1a1a",
  fontStyle: "bold",
};

/** Title-screen header — 16 px (2× the body bitmap), still grid-aligned. */
export const TITLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: UI_FONT_FAMILY,
  fontSize: "16px",
  color: "#ffffff",
  fontStyle: "bold",
};

/** Same as TITLE, no bold weight — math-quiz comparison digits, big buttons. */
export const BIG_LIGHT: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: UI_FONT_FAMILY,
  fontSize: "16px",
  color: "#ffffff",
};

/**
 * Monster-info screen — monster name, rendered bold on the cream panel.
 * 8 px matches upstream `journal_info.py`'s `FONT_SIZE_BIGGEST = 8` for the
 * name label; at this size the longest shipped name ("ROCKITTEN", 9 chars)
 * fits the ~126 px right column with room to spare.
 */
export const NAME: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: UI_FONT_FAMILY,
  fontSize: "8px",
  color: "#1a1a1a",
  fontStyle: "bold",
};

/**
 * Helper — base style with an overridden color (the most common knob we tweak
 * per call site: disabled/active/error tinting).
 */
export function withColor(
  base: Phaser.Types.GameObjects.Text.TextStyle,
  color: string,
): Phaser.Types.GameObjects.Text.TextStyle {
  return { ...base, color };
}

/**
 * Helper — wrap text inside a panel and (optionally) center it. Pass the
 * panel inner width in pixels.
 */
export function withWrap(
  base: Phaser.Types.GameObjects.Text.TextStyle,
  width: number,
  align: "left" | "center" | "right" = "left",
): Phaser.Types.GameObjects.Text.TextStyle {
  return { ...base, wordWrap: { width }, align };
}

/**
 * Construct a `Phaser.GameObjects.Text` at the correct pixel-art resolution.
 *
 * Phaser's default Text rasterises its internal canvas at the *logical*
 * font-size (e.g. 6 px for SMALL). At runtime the game canvas is upscaled
 * to display pixels by an integer factor via NEAREST sampling (set in
 * `main.ts` → `snapToIntegerZoom`). That means every 1-px gray AA fringe
 * the browser's font rasteriser produced gets multiplied into a `zoom`×`zoom`
 * block of the same gray — the visible halo around glyphs.
 *
 * The fix: tell each Text object to rasterise its internal canvas at
 * `resolution = currentZoom`. The browser then anti-aliases at the *display*
 * resolution (each AA fringe is one device pixel — invisible to the eye),
 * and Phaser samples down by `1/resolution` at draw time so the canvas
 * still lands at the same world-space size. This matches what upstream
 * Tuxemon does in `upstream/tuxemon/ui/text_renderer.py:33` — render at
 * `scale_int(FONT_SIZE)` then blit unscaled.
 *
 * Call this instead of `scene.add.text(...)` for every UI text surface in
 * the engine. Pure passthrough on the construction signature; the only
 * difference is the post-construct `setResolution(zoom)` and registration
 * with the resize-aware tracking set so a window resize keeps the text
 * crisp at the new integer zoom.
 *
 * If the game has not booted yet (no scale manager), we fall back to
 * resolution 1 and rely on the resize hook to upgrade us once the zoom
 * is known. In practice every scene's `create()` runs after the scale
 * manager is initialised so this branch is only hit by unit tests.
 */
export function addText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string | string[],
  style?: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.GameObjects.Text {
  const obj = scene.add.text(x, y, text, style);
  applyCrispResolution(obj, scene);
  return obj;
}

/**
 * Snap a Text object to the live integer zoom and remember it for the
 * next resize. Exported separately so call sites that construct Text via
 * non-`add.text` paths (e.g. tween factories, future migrations) can opt
 * in.
 */
export function applyCrispResolution(text: Phaser.GameObjects.Text, scene: Phaser.Scene): void {
  // Unit tests construct Text objects via lightweight stubs in fake scenes.
  // The stubs don't implement setResolution / once; the production code path
  // (real Phaser scene with the GameObjectFactory) always provides both.
  if (typeof text.setResolution !== "function") return;
  const zoom = scene.scale?.zoom ?? 1;
  text.setResolution(Math.max(1, Math.round(zoom)));
  trackedTexts.add(text);
  // Garbage-collect the tracking set when the object goes away. Phaser
  // emits DESTROY on shutdown and scene change.
  // "destroy" is the canonical Phaser GameObject lifecycle event (see
  // Phaser.GameObjects.Events.DESTROY = "destroy"). Hard-code the string
  // so we don't pull a runtime Phaser global into a module that should be
  // tree-shakeable.
  if (typeof text.once === "function") {
    text.once("destroy", () => trackedTexts.delete(text));
  }
}

/**
 * Live set of every Text object created through `addText`. The main game
 * file walks this on resize to re-apply `setResolution` at the new zoom.
 * `WeakSet` would be nicer but we need to iterate.
 */
const trackedTexts = new Set<Phaser.GameObjects.Text>();

/**
 * Re-snap every active Text object to a new integer zoom. Called from the
 * window-resize handler in `main.ts` after the canvas zoom has been
 * recomputed. Without this, text rendered at one zoom keeps its (now-wrong)
 * internal canvas resolution and looks blurry until the scene restarts.
 */
export function refreshCrispResolution(zoom: number): void {
  const z = Math.max(1, Math.round(zoom));
  for (const t of trackedTexts) {
    // `setResolution` triggers a re-rasterise of the internal canvas, so
    // this is safe to call even when the value is unchanged — but skip
    // anyway for the common no-op case (resize fires for non-zoom-changing
    // viewport tweaks too, e.g. devtools open).
    if (t.style.resolution !== z) t.setResolution(z);
  }
}

/**
 * Block on the browser confirming the PressStart2P face has actually loaded
 * its glyph data. Phaser's TextStyle resolves the family at the moment we
 * call `add.text(...)`; if the .ttf is still fetching the text will paint
 * with whatever fallback the browser picks, and re-rendering when the font
 * arrives would cause a visible flash. Resolves to true on success, false
 * if the load failed (we still let the game boot — fallback fonts are
 * ugly but better than a blank screen).
 */
export async function ensureUiFontLoaded(): Promise<boolean> {
  if (typeof document === "undefined" || !document.fonts) {
    // SSR / very old browsers — skip the gate.
    return false;
  }
  try {
    // The 8 px size matches the bitmap glyph data; load() picks the right
    // @font-face entry based on the requested family + size.
    await document.fonts.load(`8px "${UI_FONT_FAMILY}"`);
    await document.fonts.ready;
    return document.fonts.check(`8px "${UI_FONT_FAMILY}"`);
  } catch {
    return false;
  }
}
