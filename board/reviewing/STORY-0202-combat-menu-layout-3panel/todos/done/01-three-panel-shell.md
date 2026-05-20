# Todo: Three-panel layout shell

## What

Split the bottom UI region into three distinct nine-slice panels: bottom-left (info card / message), bottom-right (main menu), and a separate top-right techniques popup that floats above the main menu. This todo just lays in the empty panel shells with the right geometry; subsequent todos populate them.

## Why

Today the bottom UI is two panels (`leftBorder`, `rightBorder`). The screenshot at `../../upstream-combat-ui.png` clearly shows three. The popup is also smaller (sized to the number of techniques) and sits *above* the main menu, not inside it.

## Implementation

In `src/game/scenes/CombatScene.ts`:

- Keep `leftBorder` and `rightBorder` for now (they already define the bottom two panels)
- Add a third nine-slice `techPopupBorder` next to them. Initial geometry can be approximate; tune in todo 03 once the techniques render inside it
  - Position: right edge aligned to `WIDTH`, bottom edge `BOX_Y` (i.e. directly above the main menu)
  - Width: ~`RIGHT_W` (same as the main menu panel) or slightly narrower
  - Height: room for ~3 lines of text plus padding (~`OPTION_H * 3 + PAD_Y * 2`)
- The popup starts hidden — only shown when `menuMode === "techniques"`
- Add a `techPopupBorder.setDepth(100)` so it sits above the battle scene but below text labels

Do **not** yet move the technique labels into the new panel — that's todo 03. This todo just establishes the geometry.

## Verification

Run the game, enter a battle, hit FIGHT. The new empty panel should be visible in the top-right area above the main menu (you can briefly force `setVisible(true)` to verify positioning, then revert to hidden). Screenshot and compare panel positions to `../../upstream-combat-ui.png`.
