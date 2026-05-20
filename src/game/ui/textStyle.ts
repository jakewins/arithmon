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
 * pixel after integer-zoom scaling. Anything smaller (e.g. 6 px) breaks
 * legibility — there's no smaller bitmap data to sample.
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

/** Section heading inside a panel — same 8 px as BODY but bold weight. */
export const HEADING: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: UI_FONT_FAMILY,
  fontSize: "8px",
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

/** Monster-info screen — monster name (between BODY and TITLE). */
export const NAME: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: UI_FONT_FAMILY,
  fontSize: "16px",
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
