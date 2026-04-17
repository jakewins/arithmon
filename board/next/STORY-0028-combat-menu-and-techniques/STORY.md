# STORY-0028: Combat menu restructure and multiple techniques

## Description

Replace the current ad-hoc combat buttons (Fight/Run/Recharge) with Tuxemon's 2x2 grid menu pattern, and support multiple techniques per monster so the "Fight" option opens a technique submenu.

Currently our `CombatScene` renders three `Text` buttons positioned manually in the message box. Tuxemon uses a structured two-panel bottom bar: a left panel with the prompt ("What will X do?") and a right panel with a 2x2 grid of options (Fight / Tuxemon / Item / Run). Selecting "Fight" pushes a technique submenu listing the active monster's known moves.

**Key goal**: align our combat menu code structure with Tuxemon's so we can incrementally add the Tuxemon and Item menu options in later stories.

### Tuxemon reference

- **Main combat menu**: `tuxemon/states/combat_menus.py` — `MainCombatMenuState` is a `PopUpMenu` with 2 columns. Menu items are Fight, Tuxemon/Swap, Item, Run (wild) or Forfeit (trainer).
- **Technique submenu**: Also in `combat_menus.py` — lists the active monster's techniques with name, power, type icons, and cooldown. Disabled moves are grayed out.
- **Menu visibility**: `tuxemon/combat/menu_visibility.py` — hides options when they have no valid targets (e.g. hide Item if inventory is empty).
- **Menu base**: `tuxemon/menu/menu.py` — `Menu[T]` with cursor, input handling, sprite list.

### What to build

#### 1. Expand technique data

Add several techniques to `data/techniques.ts` so monsters can have a real moveset. Pull from Tuxemon's technique database (`mods/tuxemon/db/technique/`). At minimum add 4-5 techniques across different power levels and ranges. Update `data/monsters.ts` to give rockitten a moveset of 2-3 moves at different `learnedAt` levels.

#### 2. Two-panel bottom bar

Replace the current message box + floating buttons with two bordered panels at the bottom of the combat screen:

- **Left panel** (~60% width): displays the prompt text ("What will X do?") and combat messages. Use the same styled dialog box from STORY-0027 (nine-slice border, light background, dark text).
- **Right panel** (~40% width): the 2x2 action grid.

Both panels should use the dialog border style from STORY-0027.

#### 3. Main combat menu (2x2 grid)

A grid of four labeled options with arrow-key/keyboard navigation and a cursor indicator (▶):

| | Left | Right |
|---|---|---|
| **Top** | FIGHT | TUXEMON |
| **Bottom** | ITEM | RUN |

- **FIGHT**: opens the technique submenu
- **TUXEMON**: stubbed for now — show a "Not yet available" message (implemented in STORY-0030)
- **ITEM**: stubbed — show "No items" (implemented in STORY-0033)
- **RUN**: existing flee logic

Navigation: arrow keys move the cursor. SPACE/Z/Enter selects. The cursor wraps around edges.

#### 4. Technique submenu

When Fight is selected, the right panel (or the full bottom bar) shows a list of the active monster's techniques. Each entry shows:

- Technique name
- DP cost

Arrow keys to navigate, SPACE/Z to select, ESC/X/Backspace to go back to the main menu. Techniques the player can't afford (DP too low) are grayed out and unselectable.

#### 5. Recharge integration

The Recharge button currently floats above the menu. Move it into the technique submenu as a special option at the bottom of the technique list (e.g. "⚡ RECHARGE") or keep it as a persistent option visible when the technique list is shown. This way the player sees their attack options and the recharge option in one place.

#### 6. Update CombatMachine

`CombatMachine.submitAction` currently takes `"fight" | "run"`. Extend it to accept a specific technique slug so the player can choose which move to use (not just `techniques[0]`). Add `PlayerAction` type for `{ type: "fight", technique: string } | { type: "run" }`.

### Tasks

1. **Expand technique and monster data** — add 4-5 techniques, update rockitten's moveset
2. **Update `CombatMachine`** — accept technique selection in `submitAction`
3. **Build two-panel bottom bar** — left prompt panel + right menu panel, using dialog border style
4. **Build main menu (2x2 grid)** — keyboard navigation with cursor, stub Tuxemon/Item options
5. **Build technique submenu** — list techniques with DP cost, gray out unaffordable ones, back button
6. **Integrate Recharge** — add recharge option in technique submenu context
7. **Remove old button rendering** — delete the ad-hoc `fightBtn`/`runBtn`/`rechargeBtn` text buttons
8. **Tests** — technique selection flows through machine correctly, menu navigation

## Acceptance Criteria

- [ ] Bottom bar has two bordered panels: prompt (left) and menu (right)
- [ ] Main menu is a 2x2 grid navigable with arrow keys; cursor indicator shows selection
- [ ] Selecting FIGHT opens technique submenu listing the monster's known moves with DP costs
- [ ] Techniques with insufficient DP are grayed out and unselectable
- [ ] Selecting a technique uses that specific move (not hardcoded `techniques[0]`)
- [ ] TUXEMON and ITEM show stub messages (to be implemented in later stories)
- [ ] RUN uses existing flee logic
- [ ] Recharge is accessible from the technique submenu context
- [ ] Rockitten has at least 2-3 techniques at different learn levels
- [ ] All code passes formatter, linter, typecheck, and tests
