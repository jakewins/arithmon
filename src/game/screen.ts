// Native viewport (logical canvas) dimensions. Matches upstream Tuxemon's
// NATIVE_RESOLUTION (see upstream/tuxemon/platform/const/sizes.py:42),
// which sizes the game's internal coordinate system at 16:9 = 256 × 144 px
// (16 × 9 = 144 tiles of 16 px). Phaser's scale manager then upscales by
// the largest integer that fits the browser window — see src/game/main.ts.
//
// Every UI scene draws against this logical surface, so layout offsets in
// scenes can reference SCREEN_W / SCREEN_H directly and remain pixel-stable
// regardless of window size.
export const SCREEN_W = 256;
export const SCREEN_H = 144;
