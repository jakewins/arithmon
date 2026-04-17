# STORY-0033: Combat item usage

## Description

Wire the "ITEM" option from the combat menu (STORY-0028) to an in-combat item selection UI, and implement item effects (healing, reviving) during battle. This builds on the item data model from STORY-0032.

**Key goal**: align our combat item flow with Tuxemon's — select item from menu, select target monster, apply effect, consume item, end turn.

### Tuxemon reference

- **Item menu in combat**: `tuxemon/states/item_menu.py` — `ItemMenuState(Menu[Item])` shows a paginated list of items filtered for combat use. Left side shows a backpack sprite and the selected item's icon. Bottom shows item description.
- **Item filtering**: `tuxemon/item/filter.py` — `ItemFilter.set_filter_combat_targets()` filters to items usable in the current combat context.
- **Target selection**: After selecting an item, if it targets a monster (potion, revive), pushes `MonsterMenuState` to choose which monster to use it on. Capture devices auto-target the first opponent.
- **Item action in combat**: `combat_menus.py` `open_item_menu()` → select item → select target → enqueue `(character, item, target)` as a combat action. Using an item costs the player's turn.
- **Effect processing**: `tuxemon/item/item.py` `Item.use()` processes effects via `EffectProcessor`.

### What to build

#### 1. In-combat item menu

When the player selects ITEM from the combat menu, show a scrollable list of the player's combat-usable items:

- Each entry shows: item name x quantity
- Items with 0 quantity are not shown
- Arrow keys to navigate, SPACE/Z to select, ESC/X to go back
- If the inventory has no combat-usable items, show "No items!" and return to the main menu

This can be a simple list in the bottom panel area — doesn't need to be the full Tuxemon backpack-with-sprite treatment yet.

#### 2. Target selection for items

After selecting an item:
- **Potions/revives** (target: party monster): show the party list from STORY-0030, filtered to valid targets (e.g. revive only shows fainted monsters, potion only shows non-fainted non-full-HP monsters)
- **Capture devices**: auto-target the enemy (no selection needed). Capture mechanic itself is STORY-0034 — for now, just show "Can't use that yet" or wire to capture if STORY-0034 is done.

#### 3. Item use action in CombatMachine

Add a new player action: `{ type: "item", itemSlug: string, targetIndex: number }`.

When processed:
- Apply the item's effects to the target monster
- Consume one from inventory
- Emit combat events: "Used {Item} on {Monster}!", "{Monster} recovered {X} HP!" etc.
- Using an item costs the player's turn — the enemy attacks after

#### 4. Item effect handlers

Implement effect application for the item types from STORY-0032:

- `heal_hp`: restore flat HP amount (capped at maxHp)
- `heal_hp_percent`: restore percentage of maxHp
- `revive`: set fainted monster's HP to percentage of maxHp
- `capture`: defer to STORY-0034

#### 5. Update combat HUD

After an item heals a monster, the HP bar should update (animated if possible).

### Tasks

1. **Item menu UI** — scrollable list of combat-usable items in the bottom panel
2. **Target selection** — route to party list for monster-targeting items
3. **Item action type** — extend `PlayerAction` and `CombatMachine` for item usage
4. **Effect handlers** — heal_hp, heal_hp_percent, revive
5. **Inventory consumption** — decrement item count after use
6. **Combat event messages** — "Used Potion!", "Recovered 20 HP!" etc.
7. **Tests** — item use heals correctly, item consumed, costs a turn, can't use potion on full HP monster

## Acceptance Criteria

- [ ] Selecting ITEM in combat shows a list of the player's combat-usable items
- [ ] Selecting a healing item opens target selection (party list)
- [ ] Using a potion heals the target monster and consumes one from inventory
- [ ] Using a revive restores a fainted monster and consumes one
- [ ] Using an item costs the player's turn (enemy attacks after)
- [ ] Items with 0 remaining are not shown in the list
- [ ] HP bar updates after healing
- [ ] ESC/X from item menu returns to main combat menu
- [ ] All code passes formatter, linter, typecheck, and tests
