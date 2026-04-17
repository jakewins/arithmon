/**
 * Shared overlay management for change_bg, change_bg_char, and change_bg_monster.
 *
 * All three actions stash their game objects on the scene so subsequent calls
 * can destroy the previous overlay before creating a new one.
 */

export const NAMED_COLORS: Record<string, number> = {
  black: 0x000000,
  white: 0xffffff,
  red: 0xcc0000,
  green: 0x00aa00,
  blue: 0x2244aa,
  gradient_blue: 0x2244aa,
};

export const WIDTH = 320;
export const HEIGHT = 240;
/** Y position for showcase sprites — top third, above the dialog box. */
export const SPRITE_Y = 70;

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
