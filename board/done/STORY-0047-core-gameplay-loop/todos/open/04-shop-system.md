# Todo: Shop System

## What

Implement the `open_shop` event action and a shop UI where the player can browse items, buy with gold, and sell items from inventory.

## Why

The shop is the economic heart of the game loop — players earn gold from battles and spend it on supplies to keep exploring. Without shops, the only items the player has are what they start with.

## Tuxemon Reference

Check how Tuxemon implements shops:
- **Action**: `open_shop` takes an economy slug parameter
- **Economy files**: `mods/tuxemon/db/economy/spyder_*.yaml` define shop inventories with item slugs and prices
- **Shop UI**: list of items with prices, buy/sell tabs, quantity selection
- **Cotton Scoop economy** (`spyder_cotton_scoop.yaml`): Potion (50), Tuxeball (100), Revive (100), resale multiplier 0.5

The shop is triggered via NPC interaction: talk to shopkeeper → `open_shop spyder_cotton_scoop` → shop UI opens.

## Implementation

### 1. Shop data

Create `src/game/data/shops.ts` (or similar) defining shop inventories:
```typescript
interface ShopInventory {
  items: { slug: string; price: number }[];
  sellMultiplier: number; // 0.5 = sell for half
}

const SHOP_REGISTRY: Record<string, ShopInventory> = {
  spyder_cotton_scoop: {
    items: [
      { slug: "potion", price: 50 },
      { slug: "tuxeball", price: 100 },
      { slug: "revive", price: 100 },
    ],
    sellMultiplier: 0.5,
  },
};
```

### 2. Shop UI scene

Create a `ShopScene` (or overlay) that shows:
- **Buy tab**: list of items with names, prices, and a buy button/action
- **Sell tab**: player's inventory items with sell prices
- Quantity selection (or just buy/sell one at a time for simplicity)
- Current gold display
- Prevent buying if not enough gold
- Prevent selling if no items

Keep the UI simple and consistent with our existing menu style (PauseMenuScene, PartyScreen). A basic list with cursor navigation is fine.

### 3. `open_shop` event action

Create `src/game/event/actions/openShop.ts`:
- Args: `open_shop {economy_slug}`
- Looks up the shop inventory from the registry
- Launches ShopScene
- Stays `done: false` until the shop is closed
- Returns control to the event engine after

### 4. Wire it up

Register the action in the event action registry so YAML events can use it.

## Verify with Puppeteer

Use `/puppeteer` to:
1. Give the player some gold and items via debug API
2. Trigger `open_shop` (either via debug command or by interacting with a test NPC)
3. Screenshot the shop UI
4. Buy an item — verify gold decreases and item appears in inventory
5. Sell an item — verify gold increases and item count decreases
6. Try buying without enough gold — verify it's prevented
7. Close the shop — verify return to overworld

## Done When

- `open_shop` event action exists and is registered
- Shop UI displays items with prices
- Player can buy items (gold deducted, item added to inventory)
- Player can sell items (gold added, item removed from inventory)
- Insufficient gold is handled gracefully
- Shop registry has Cotton Scoop inventory defined
