# Todo: Styled HUD Panels

## What

Replace the plain rectangle HP bars and raw text labels with upstream Tuxemon's styled HUD panel images.

## Why

Upstream Tuxemon uses bordered panel images for the HP/name/level display. Ours are plain colored rectangles and unstyled text, which looks rough. The styled panels give the combat UI a polished, game-like feel.

## Reference

- Opponent HUD: `Tuxemon/mods/tuxemon/gfx/ui/combat/hp_opponent_nohp.png` (100x29)
- Player HUD: `Tuxemon/mods/tuxemon/gfx/ui/combat/hp_player_nohp.png` (104x37)
- These are panel backgrounds with bordered frames; the HP bar, name text, and level are drawn on top

## Implementation

1. **Copy HUD panel images from upstream**:
   - `hp_opponent_nohp.png` -> `public/assets/ui/combat/hp_opponent.png`
   - `hp_player_nohp.png` -> `public/assets/ui/combat/hp_player.png`

2. **Load HUD images in `CombatScene.preload()`**

3. **Replace the current HP bar rendering** in `CombatScene.create()`:
   - Currently draws: background rectangle, colored HP fill rectangle, name text, level text
   - New approach: render the panel image, then draw the HP fill bar and text on top at the correct offsets within the panel
   - The opponent panel goes upper-left (above/left of enemy), player panel goes lower-right (below/right of player)
   - Upstream positions: opponent HUD upper-left, player HUD lower-right with XP bar

4. **Preserve the DP (Dark Power) pips display** -- this is unique to Arithmon and should remain, positioned near the player HUD panel

5. **Scale the HUD panels** appropriately for our 320x240 canvas (upstream runs at ~256 wide, so panels may need slight scaling or repositioning)

## Verification

- HP bars should appear inside bordered panel frames
- Monster name and level should render cleanly within the panel
- DP pips should still display for the player
- Compare panel style against upstream screenshots
