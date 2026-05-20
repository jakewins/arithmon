# Todo: Wire keyboard + debug navigation

## What

Validate (and fix if needed) that all existing navigation paths still work after the layout restructure:

- Arrow keys move the technique cursor; SPACE / Z / ENTER confirms; ESC / X / BACKSPACE returns to the main menu
- Mouse pointerdown on a technique label still selects it
- `debugSelectChoice(index)` in techniques mode still works (used by QA scripts and the debug bridge)
- The `combat_menu` debug event continues to emit with `{ mode: "techniques" }` when the popup opens and `{ mode: "main" }` when it closes

## Why

The popup is now in a different region and rendered into a different panel — easy to break a cursor coordinate or forget to re-emit a debug event. QA scripts in `qa/` rely on the debug events to know what state the UI is in.

## Implementation

In `src/game/scenes/CombatScene.ts`:

- Audit `updateTechMenu` — confirm all keyboard branches still work with the popup's coordinate system
- Audit `updateTechCursorPosition` — coordinates must match the popup's interior
- Audit the pointerdown handlers added in `buildTechLabels` — they may be using stale coordinates after the move into the popup
- Make sure the `setMenuMode("techniques")` path still emits `debugBridge.emit("combat_menu", { mode: "techniques" })` (already in the existing code; just confirm)
- If anything changed about how the techniques popup is shown/hidden (e.g. you added a new transient state), emit appropriate `combat_menu` events from that state too

No new tests required — just ensure existing `qa/` scripts that exercise combat still pass. Run `npm test` to confirm.

## Verification

- Manual: arrow keys, SPACE, ESC, mouse click all behave as before
- Run any existing combat QA script in `qa/` (e.g. anything that uses `FIGHT` flow) and verify it still completes
- Check `window.A.emit` / event log via the debug bridge from the browser console — `combat_menu` events fire correctly on mode changes
