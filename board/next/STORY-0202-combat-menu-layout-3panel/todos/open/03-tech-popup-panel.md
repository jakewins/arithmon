# Todo: Build the techniques popup as its own panel

## What

Render the technique list inside the new `techPopupBorder` panel from todo 01, sized to fit the actual number of techniques (plus the optional RECHARGE row), and positioned to sit above the main menu — matching the "Sting / Blossom / Poison Courtship" popup in `../../upstream-combat-ui.png`.

## Why

Today `buildTechLabels` writes labels into the bottom-right panel at the same coordinates as the main menu. The screenshot shows the technique list as a *separate, smaller* floating panel above the main menu.

## Implementation

In `src/game/scenes/CombatScene.ts`:

- Update `buildTechLabels` to position labels inside the new popup region instead of the main-menu panel. Choose a base origin like `(WIDTH - popupWidth + PAD_X, popupY + PAD_Y)` so labels sit inside `techPopupBorder`
- Resize the popup at build time based on `techniques.length` (+1 if RECHARGE is shown). Width should fit the longest technique name; height should be `lineCount * OPTION_H + PAD_Y * 2`. Reposition the nine-slice via `setSize` + `setPosition` so it always anchors bottom-right with the right edge at ~`WIDTH - 2`
- Move the technique cursor (`this.techCursor`) into the popup's coordinate space — update `updateTechCursorPosition` accordingly
- Show `techPopupBorder.setVisible(true)` when entering techniques mode, hide otherwise (in `setMenuMode`)
- The RECHARGE row stays as the last entry in the popup (consistent with how it works today)

Visual style: the popup should use the same nine-slice border as the other panels (`BORDER_TEXTURE`) so it looks like a coherent UI piece.

## Verification

- Enter battle, hit FIGHT, popup appears above main menu with the right monster's techniques
- Cursor moves up/down through the list and wraps correctly
- Popup is correctly sized when the monster has 1 technique vs 4 techniques
- ESC closes the popup and returns to main mode (existing logic continues to work)
- Screenshot vs `../../upstream-combat-ui.png` — the popup should be in the same region with the same general size as upstream's "Sting / Blossom / Poison Courtship" popup
