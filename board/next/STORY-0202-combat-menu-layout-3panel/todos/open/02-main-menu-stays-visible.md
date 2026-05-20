# Todo: Keep main menu visible during technique selection

## What

When `menuMode === "techniques"`, keep all four main-menu labels (`FIGHT / ITEM / TUXEMON / RUN`) rendered in the bottom-right panel. Dim the labels (use `DISABLED_COLOR`) and hide the main cursor.

## Why

In `../../upstream-combat-ui.png` the 2×2 main menu is still visible at the bottom-right while the player is choosing a technique — TUXEMON and FORFEIT are dimmed but drawn. Today our `setMenuMode("techniques")` hides every main-menu label via the loop in `setMenuMode`.

## Implementation

In `src/game/scenes/CombatScene.ts`:

- In `setMenuMode`, stop unconditionally hiding `this.mainMenuLabels` and `this.mainCursor` at the top of the function. Instead, handle visibility per mode:
  - `hidden`: hide everything as today
  - `main`: show all main labels at normal color, show main cursor
  - `techniques`: **show all main labels at `DISABLED_COLOR`**, hide main cursor
  - `party` / `items` / `item_target`: hide main labels (only one submenu visible at a time for these modes)
- When leaving `techniques` back to `main`, restore the normal colors. The existing main-menu color logic (RUN greyed in trainer battles) must still work — refactor into a small `refreshMainMenuColors()` helper so the trainer/wild handling lives in one place.

## Verification

- Enter battle, hit FIGHT, observe the main menu labels are still drawn but dimmed
- Press ESC, observe the main menu returns to normal colors with the cursor restored
- Trainer battle: RUN should still be dimmed in `main` mode (it should already be dimmed at all times because trainer-battles disable it)
