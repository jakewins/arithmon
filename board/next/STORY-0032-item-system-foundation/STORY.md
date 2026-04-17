# STORY-0032: Item system foundation

## Description

Add an item data model, player inventory, and a few starter items. This story lays the groundwork for using items in combat (STORY-0033) and the capture mechanic (STORY-0034) by building the data layer and inventory management — no combat UI yet.

**Key goal**: align our item system with Tuxemon's `Item` class and database structure so we can port item data and behaviors cleanly.

### Tuxemon reference

- **Item class**: `tuxemon/item/item.py` — `Item` with slug, name, description, category, sprite, effects, conditions, usable_in (which game states the item can be used in), sort order, cost.
- **Item database**: `mods/tuxemon/db/item/` — YAML files per item. Each defines slug, category, sprite path, effects (list of `{type, parameters}`), conditions (validation before use), and localization keys.
- **Item categories**: `tuxemon/db.py` `ItemCategory` enum — CAPTURE, POTION, TECHNIQUE, STATS, FOOD, MORPH, ELEMENTS, BADGE, etc.
- **Inventory**: Items are stored on the NPC/player as a list with quantity tracking. `tuxemon/item/stock.py` — `Stock` handles quantity management (add, remove, count).
- **Item effects**: Plugin-based — `tuxemon/item/effects/` contains individual effect handlers (e.g. `healing.py`, `capture.py`, `learn_mm.py`). An `EffectProcessor` runs matching effects when an item is used.
- **Item conditions**: `tuxemon/item/conditions/` — validation handlers (e.g. `monster_fainted.py` checks if target is fainted before allowing revive).

### What to build

#### 1. Item data model

Create `src/game/item/item.ts` with:

```typescript
interface ItemDef {
  slug: string;
  name: string;
  description: string;
  category: ItemCategory;
  sprite: string;         // asset path for inventory icon
  usableIn: ("combat" | "overworld")[];
  effects: ItemEffect[];
}

type ItemCategory = "potion" | "capture" | "technique" | "food" | "other";

type ItemEffect =
  | { type: "heal_hp"; amount: number }        // flat HP heal
  | { type: "heal_hp_percent"; percent: number } // percentage HP heal
  | { type: "capture"; modifier: number }       // capture rate modifier
  | { type: "revive"; hp_percent: number };      // revive fainted monster
```

Aligns with Tuxemon's YAML item definitions but simplified — we can expand effect types as needed.

#### 2. Starter item data

Define a few items from Tuxemon's database in `src/game/data/items.ts`:

- **Potion** (`potion`) — heals 20 HP. Category: potion. Usable in combat and overworld.
- **Super Potion** (`super_potion`) — heals 60 HP. Category: potion.
- **Tuxeball** (`tuxeball`) — basic capture device, 1.0 modifier. Category: capture. Usable in combat only.
- **Revive** (`revive`) — revives a fainted monster to 50% HP. Category: potion. Usable in combat and overworld.

#### 3. Player inventory

Add inventory to session state. Model as a map of item slug to quantity:

```typescript
// In session.ts PlayerState
inventory: Map<string, number>;  // slug → quantity
```

Add helpers in `src/game/item/inventory.ts`: `addItem(slug, count)`, `removeItem(slug, count)`, `getItemCount(slug)`, `getInventoryItems(): Array<{item: ItemDef, count: number}>`.

#### 4. Inventory initialization

Give the player a starting inventory in `createSession()` — e.g. 3 potions and 5 tuxeballs. This lets us test without needing an item-acquisition system.

#### 5. Item validation

An item should check if it can be used on a target monster:
- Potions: target must not be fainted, and not already at full HP
- Revive: target must be fainted
- Capture device: target must be an opponent's monster (wild)

Add a `canUseItem(item: ItemDef, target: Monster, context: "combat" | "overworld"): boolean` helper in `src/game/item/validation.ts`.

### File structure (aligning with Tuxemon)

```
src/game/
  item/
    item.ts           # ItemDef, ItemCategory, ItemEffect types
    inventory.ts      # Inventory helpers (add, remove, query)
    validation.ts     # canUseItem logic
  data/
    items.ts          # Item database (starter items)
```

This mirrors Tuxemon's `tuxemon/item/` directory structure.

### Tasks

1. **Item types** — `ItemDef`, `ItemCategory`, `ItemEffect` in `item/item.ts`
2. **Item database** — define 4 starter items in `data/items.ts`
3. **Inventory on session** — add inventory to `PlayerState`, initialize in `createSession()`
4. **Inventory helpers** — add/remove/query functions in `item/inventory.ts`
5. **Item validation** — `canUseItem()` for context-aware usage checks
6. **Tests** — inventory add/remove, validation logic (can't potion a full-HP monster, can't revive a healthy one)

## Acceptance Criteria

- [ ] `ItemDef` type defined with slug, name, description, category, effects
- [ ] At least 4 items defined: potion, super potion, tuxeball, revive
- [ ] Player inventory stored in session with add/remove/query helpers
- [ ] Player starts with a small inventory (potions + tuxeballs)
- [ ] `canUseItem()` validates context (combat/overworld) and target state
- [ ] File structure mirrors Tuxemon's `item/` layout
- [ ] All code passes formatter, linter, typecheck, and tests
