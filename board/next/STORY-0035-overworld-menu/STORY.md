# STORY-0035: Overworld pause menu

## Description

Add an in-game pause menu that the player can open from the overworld, providing access to party management, items, and save. This is the container that the monster party screen (STORY-0036) and item screen plug into.

Currently the game has no pause menu — only debug keys (C for combat, P for math, V for cutscene). Tuxemon's world menu slides in from the right with options for Tuxemon, Bag, Player, Missions, Save, Load, Options.

**Key goal**: align our menu structure with Tuxemon's `WorldMenuState` so sub-screens can be added incrementally.

### Tuxemon reference

- **World menu state**: `tuxemon/states/world_menus.py` — `WorldMenuState(PygameMenuState)` is the pause menu. Built dynamically by `WorldMenuManager.build_current_menu_items()`.
- **Menu entries**: Tuxemon (party), Bag (items), Player (character info), Missions, Save, Load, Options, Exit. Each entry is conditionally shown via `MenuFlags`.
- **Menu animation**: Slides in from the right side over 0.5s. Background is semi-transparent.
- **Menu base**: Uses Tuxemon's `PygameMenuState` (pygame-menu wrapper), but we'll use our own Phaser-based approach.
- **State management**: Menu is pushed on top of the world state (world is paused underneath). Closing the menu pops it and resumes the world.

### What to build

#### 1. Pause menu scene

Create `src/game/scenes/PauseMenuScene.ts` — a Phaser scene that overlays the overworld:

- Launched when the player presses ESC or START (configurable key)
- The overworld scene pauses underneath
- Shows a vertical list of options with cursor navigation
- Closing the menu (ESC or B button) resumes the overworld

#### 2. Menu options

Initial menu entries:

| Option | Action |
|--------|--------|
| **Tuxemon** | Opens monster party screen (STORY-0036). Stubbed until that story is done. |
| **Bag** | Opens item screen. Stubbed until implemented. |
| **Save** | Stubbed — show "Saved!" message for now. |
| **Close** | Close the menu and return to overworld. |

Each option can be conditionally shown (e.g. hide Tuxemon if no monsters, hide Bag if no items). Use a simple visibility check, similar to Tuxemon's `MenuFlags`.

#### 3. Visual style

- Vertical list on the right side of the screen (matching Tuxemon's right-aligned menu)
- Use the dialog box border style from STORY-0027
- Semi-transparent background overlay on the left side
- Cursor indicator on selected option
- Arrow keys to navigate, SPACE/Z to select, ESC to close

#### 4. Wire to overworld

Add ESC key handler in `OverworldScene` to launch the pause menu. Ensure:
- Player movement is locked while menu is open
- Event engine is paused
- Menu can be opened at any time (not during dialog/cutscene)

### File structure

```
src/game/scenes/
  PauseMenuScene.ts    # Pause menu overlay
```

This mirrors Tuxemon's `states/world_menus.py`.

### Tasks

1. **PauseMenuScene** — vertical option list with cursor, overlays overworld
2. **Menu options** — Tuxemon, Bag, Save, Close (stubs for unimplemented features)
3. **Visual styling** — right-aligned panel with dialog border, semi-transparent overlay
4. **Wire ESC key** — in OverworldScene, launch/close pause menu
5. **Tests** — menu opens/closes, overworld pauses/resumes

## QA Validation

Use `/puppeteer` to verify this story in a real browser. The pause menu is triggered by a keypress, so use Playwright's `page.keyboard.press("Escape")` directly rather than a debug command.

Write a QA script that:

1. Launches the game, waits for idle
2. Presses ESC, screenshots the pause menu — verify right-aligned panel with options, dialog border styling, semi-transparent overlay
3. Navigates options with arrow keys, screenshots to verify cursor movement
4. Selects "Close", verifies the menu dismisses and the overworld resumes
5. Re-opens the menu, selects each stub option (Tuxemon, Bag, Save), verifies stub messages appear

## Acceptance Criteria

- [ ] Pressing ESC on the overworld opens a pause menu
- [ ] Menu shows options: Tuxemon, Bag, Save, Close
- [ ] Arrow keys navigate options with a cursor indicator
- [ ] SPACE/Z selects an option; ESC closes the menu
- [ ] Overworld is paused while menu is open (no player movement, no event engine)
- [ ] Closing the menu resumes the overworld
- [ ] Menu uses the styled dialog border
- [ ] All code passes formatter, linter, typecheck, and tests
