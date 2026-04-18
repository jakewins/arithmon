# STORY-0036: Monster party screen

## Description

Build a full monster party management screen accessible from the overworld pause menu (STORY-0035). This is the out-of-combat equivalent of the in-combat party list (STORY-0030), but with more detail — stats, moves, reordering, and item management.

**Key goal**: align our party screen with Tuxemon's `MonsterMenuState` layout — 6 slots on the right, portrait + stats on the left.

### Tuxemon reference

- **Monster menu state**: `tuxemon/states/monster_menu.py` — `MonsterMenuState(Menu[Monster | None])`:
  - Always shows 6 slots (PARTY_LIMIT), even if fewer monsters are owned
  - Each slot: `MonsterSlotRenderer` draws name + gender symbol, "Lv {level}", HP bar, status effect icons, held item icon
  - Three border styles for slots: `empty` (no monster), `filled` (has monster), `active` (currently selected)
  - Left side: `MonsterPortraitDisplay` — large front sprite with gentle bob animation
  - Below portrait: `MonsterStatsDisplay` — HP, Armour, Dodge, Melee, Ranged, Speed values
  - Small sprite icons on the right side of each slot (`MonsterSpriteDisplay`)
- **Monster menu handler**: `MonsterMenuHandler` manages context-menu actions:
  - **Info**: pushes `MonsterInfoState` for detailed view
  - **Moves**: pushes `MonsterMovesState` for technique details
  - **Move**: select a monster, then select position to reorder
  - **Sort**: sub-submenu with sort options (level, hp, name, id)
  - **Release**: confirmation dialog, remove from party
- **Monster info state**: `tuxemon/states/monster_info.py` — `MonsterInfoState`:
  - Full stat breakdown: name, level, gender, weight, height, types, all 6 stats
  - Taste modifiers (stat bonuses/penalties)
  - XP progress bar
  - Front sprite
  - LEFT/RIGHT cycles through party
- **Monster moves state**: `tuxemon/states/monster_moves.py` — `MonsterMovesState`:
  - Lists the monster's known techniques with power, accuracy, type

### What to build

#### 1. Party screen scene

Create `src/game/scenes/PartyScreen.ts` — launched from the pause menu:

**Right side — slot list:**
- 6 vertical slots, one per party position
- Each filled slot shows: monster name, level, HP bar (current/max)
- Empty slots are visually distinct (darker/outlined)
- Arrow keys to select a slot
- Selected slot highlighted

**Left side — detail panel:**
- Large monster front sprite (with subtle bob animation)
- Stats: HP (current/max), Attack, Defense, Speed
- Level and XP progress
- List of known techniques

#### 2. Context menu on selection

When the player selects a monster (SPACE/Z), show a small context menu:

| Option | Action |
|--------|--------|
| **Summary** | Show detailed stats (can be a sub-screen or expand the left panel) |
| **Moves** | Show technique details |
| **Move** | Reorder: select this monster, then select target position to swap |
| **Cancel** | Close context menu |

Start with Summary and Move as the essential options. Moves detail and Release can be added later.

#### 3. Reorder party

The "Move" option lets the player reorder their party:
1. Select a monster -> choose "Move"
2. Cursor moves to slot selection mode
3. Select target slot -> monsters swap positions
4. Party order updates in `session.player.monsters`

This matters because the first non-fainted monster is the combat lead.

#### 4. Shared components with combat party list

The in-combat party list (STORY-0030) and this screen share some components — monster slot rendering, HP bar display. Consider extracting shared rendering helpers into `src/game/ui/` so both screens reuse them.

### File structure

```
src/game/
  scenes/
    PartyScreen.ts        # Party management scene
  ui/
    monsterSlot.ts         # Shared monster slot renderer (name, level, HP bar)
    monsterPortrait.ts     # Large portrait display
```

This mirrors Tuxemon's separation of `states/monster_menu.py` and the renderer classes within it.

### Tasks

1. **PartyScreen scene** — 6-slot layout with left detail panel
2. **Monster slot renderer** — shared component for slot display (name, level, HP bar)
3. **Detail panel** — portrait, stats, techniques on the left side
4. **Context menu** — Summary, Move, Cancel
5. **Reorder** — "Move" swaps monster positions in the party array
6. **Wire to pause menu** — "Tuxemon" option launches PartyScreen
7. **Tests** — reorder updates party array, slot rendering shows correct data

## QA Validation

Use `/puppeteer` to verify this story in a real browser. You'll need a full party to test the layout properly — use `A.addMonster(slug, level)` to populate 4-5 monsters before opening the screen.

Write a QA script that:

1. Launches the game, adds several monsters to the party (different species and levels)
2. Opens the pause menu (ESC), selects "Tuxemon"
3. Screenshots the party screen — verify 6 slots on the right (filled + empty), detail panel on the left with portrait and stats
4. Navigates between slots with arrow keys, screenshots to verify the detail panel updates
5. Tests reorder: selects a monster, chooses "Move", selects a target slot, verifies the party order changed via `getState()`
6. Tests context menu: selects a monster, screenshots the Summary/Move/Cancel options

## Acceptance Criteria

- [ ] Party screen shows 6 slots with monster info (name, level, HP bar) on the right
- [ ] Empty slots are visually distinct
- [ ] Selecting a monster shows details on the left (portrait, stats, moves)
- [ ] Context menu appears on selection with Summary and Move options
- [ ] "Move" lets the player reorder by selecting two positions to swap
- [ ] Party order changes persist in session
- [ ] Accessible from the pause menu's "Tuxemon" option
- [ ] ESC/X returns to the pause menu
- [ ] All code passes formatter, linter, typecheck, and tests
