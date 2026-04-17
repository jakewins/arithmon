# STORY-0030: Monster switching in combat

## Description

Implement the "Tuxemon" menu option from the combat menu (STORY-0028) so the player can switch their active monster mid-battle. This requires an in-combat party list UI where the player selects a replacement monster, and the swap logic in the combat machine.

**Key goal**: align our monster switching with Tuxemon's swap mechanic — swapping costs the player's turn, and forced swaps happen when a monster faints.

### Tuxemon reference

- **Monster menu state**: `tuxemon/states/monster_menu.py` — `MonsterMenuState(Menu[Monster | None])` shows 6 slots with name, level, HP bar, status icons. Left side shows a large portrait of the selected monster. Three slot border styles: empty, filled, active (currently in battle).
- **Slot rendering**: `MonsterSlotRenderer` in `monster_menu.py` — draws name + gender, level, HP bar, status icons, held item icon per slot.
- **Portrait display**: `MonsterPortraitDisplay` — large sprite on left side with gentle bob animation.
- **Swap flow**: In `combat_menus.py`, `open_swap_menu()` pushes `MonsterMenuState`. The menu validates: target must not be fainted, not already active. On selection, a "swap" technique is enqueued.
- **Swap tracker**: `tuxemon/ui/combat_swap.py` — `SwapTracker` prevents swapping back the same monster immediately (anti-stalling).
- **Forced swap**: When a monster faints, `ask_player_for_monster()` pushes MonsterMenuState with `escape_key_exits = False` (can't back out, must pick).
- **Combat session**: `tuxemon/combat/session.py` — `CombatSession` tracks field monsters (which monsters are currently on the battlefield per player).

### What to build

#### 1. In-combat party list UI

A simple party selection screen that overlays the combat scene (or replaces the bottom panel). Shows the player's party (up to 6 slots):

- Each slot shows: monster name, level, HP bar (with current/max), and a status indicator (fainted / healthy)
- The currently active monster is marked (e.g. "IN BATTLE" label or different border)
- Fainted monsters are grayed out and unselectable
- Arrow keys to navigate slots, SPACE/Z to select, ESC/X to go back

This doesn't need to be as elaborate as Tuxemon's full `MonsterMenuState` with portraits and stats — that comes in STORY-0036. Just enough to pick a monster.

#### 2. Swap action in CombatMachine

Add a new player action type: `{ type: "swap", monsterIndex: number }`. When the player selects a monster from the party list:

- The current active monster is returned to the party
- The selected monster becomes active
- The swap counts as the player's action for the turn — the enemy still gets to attack
- Emit combat events: "{OldMonster} come back!" and "Go, {NewMonster}!"

#### 3. Forced swap on faint

When the player's active monster faints and there are other non-fainted monsters in the party:

- Automatically open the party list (without the option to back out)
- Player must select a replacement
- The forced swap does NOT cost a turn — the enemy doesn't get a free attack

When all party monsters are fainted, combat ends in a loss (whiteout from STORY-0029).

#### 4. Update CombatScene

- Wire the "TUXEMON" menu option to open the party list
- Handle the swap action flow
- Update the player sprite when the active monster changes
- Update the player name/HP/DP display for the new monster

### Tasks

1. **Party list UI** — simple slot-based monster selection overlay for combat
2. **Swap action type** — extend `PlayerAction` and `CombatMachine.submitAction` for swaps
3. **Voluntary swap logic** — swap costs the player's turn, enemy attacks after
4. **Forced swap on faint** — auto-open party list when active monster faints, no back button, doesn't cost a turn
5. **Update CombatScene** — sprite swap, HUD update, wire to TUXEMON menu option
6. **Tests** — voluntary swap costs turn, forced swap doesn't, can't select fainted monster, can't swap to already-active monster

## Acceptance Criteria

- [ ] Selecting TUXEMON in combat opens a party list showing all party monsters with HP
- [ ] Selecting a healthy monster swaps it in and costs the player's turn
- [ ] Currently active monster is indicated and unselectable
- [ ] Fainted monsters are grayed out and unselectable
- [ ] When the active monster faints and others remain, a forced swap prompt appears
- [ ] Forced swap does not cost the player's turn
- [ ] Player sprite and HUD update to reflect the new active monster
- [ ] ESC/X backs out of voluntary swap (returns to main combat menu)
- [ ] All code passes formatter, linter, typecheck, and tests
