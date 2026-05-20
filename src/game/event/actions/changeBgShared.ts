/**
 * Shared overlay management for change_bg, change_bg_char, and change_bg_monster.
 *
 * All three actions stash their game objects on the scene so subsequent calls
 * can destroy the previous overlay before creating a new one.
 */

import { SCREEN_H } from "../../screen";

export const NAMED_COLORS: Record<string, number> = {
  black: 0x000000,
  white: 0xffffff,
  red: 0xcc0000,
  green: 0x00aa00,
  blue: 0x2244aa,
  gradient_blue: 0x2244aa,
};

/**
 * Y position for showcase sprites. Upstream Tuxemon centres the sprite on
 * the 256×144 backdrop, but in our context an event-action sprite is almost
 * always followed by a dialog (`translated_dialog`) at the bottom of the
 * screen — so we anchor the sprite roughly in the middle of the *upper*
 * area, above the standard 48-px dialog box, so the two never overlap.
 *
 * Numerically: dialog box occupies the bottom 48 px → free area is the top
 * 96 px → middle of that is y=48. We allow the sprite scale (set per-action)
 * to extend symmetrically above and below this anchor.
 */
export const SPRITE_Y = (SCREEN_H - 48) / 2;

const BACKDROP_KEY = "__changeBgBackdrop";
const OVERLAY_KEY = "__changeBgOverlay";

type SceneStash = Record<string, Phaser.GameObjects.GameObject | undefined>;

/** Destroy any previously stashed backdrop and overlay. */
export function destroyOverlay(scene: Phaser.Scene): void {
  const stash = scene as unknown as SceneStash;
  stash[BACKDROP_KEY]?.destroy();
  stash[OVERLAY_KEY]?.destroy();
  delete stash[BACKDROP_KEY];
  delete stash[OVERLAY_KEY];
}

/** Stash new overlay objects on the scene for future cleanup. */
export function setOverlay(
  scene: Phaser.Scene,
  backdrop: Phaser.GameObjects.GameObject | null,
  overlay: Phaser.GameObjects.GameObject | null,
): void {
  const stash = scene as unknown as SceneStash;
  if (backdrop) stash[BACKDROP_KEY] = backdrop;
  if (overlay) stash[OVERLAY_KEY] = overlay;
}
