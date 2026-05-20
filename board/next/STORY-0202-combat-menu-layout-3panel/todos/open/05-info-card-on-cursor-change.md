# Todo: Re-render info card on cursor move

## What

Whenever `techSelected` changes (cursor moves up/down within the techniques popup), call `renderInfoCard` with the currently-highlighted technique.

When the cursor is on the RECHARGE row (last entry, optional), hide the info card and instead show a short prompt like "Solve a math problem to recharge Dark Power." in `messageText`. The info card is technique-specific and doesn't apply to the recharge action.

## Why

Upstream binds the info overlay to selection-change events (`on_menu_selection_change_callback = show` in `combat_menus.py:561`). The card has to stay synchronized with the cursor or it'll look broken.

## Implementation

In `src/game/scenes/CombatScene.ts`:

- In `updateTechMenu`, after the `up` / `down` branches update `techSelected`, call a new method `refreshInfoCardForTechCursor()`
- That method:
  - If `techSelected < techniques.length`, call `renderInfoCard(techniques[techSelected])`
  - Else (recharge row), call `renderInfoCard(null)` and set `messageText` to the recharge prompt
- Also call `refreshInfoCardForTechCursor()` at the end of `buildTechLabels` so the card is correct as soon as the popup opens
- Make sure the `setMenuMode` transitions clear the info card when leaving `techniques` mode (transition to `main`, `hidden`, etc.) — `renderInfoCard(null)` again

Pointerdown handlers (mouse clicks on technique labels) should also call `refreshInfoCardForTechCursor()` if they update `techSelected`.

## Verification

- Move the cursor through all techniques, info card updates each time
- Land on RECHARGE row (if shown), info card disappears and recharge prompt appears
- ESC back to main menu, info card is gone and the "What will X do?" prompt is back
