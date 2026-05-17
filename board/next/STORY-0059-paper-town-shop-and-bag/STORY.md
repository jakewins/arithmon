# STORY-0059: paper-town-shop-and-bag

## Description

The Paper Town shop (Paper Scoop) is broken post-intro: the shopkeeper spawns at position (0,4) facing up, which is unreachable by the player. There's no "Talk Shopkeeper" event to open a shop, and no `spyder_paper_scoop` shop definition exists in the registry. Additionally, the game has no Bag screen — players cannot view or use their items outside of combat/shops.

This story fixes the Paper Scoop shop, adds all items it should sell (matching upstream Tuxemon), and implements a Bag screen accessible from the pause menu.

## Current State

**Paper Scoop problems (`public/assets/events/spyder_paper_scoop.yaml`):**
- Post-intro shopkeeper created at (0,4) facing up — unreachable position
- No `Talk Shopkeeper` / `behav: talk` event for post-intro gameplay
- No shop definition in `src/game/data/shops.ts` for `spyder_paper_scoop`

**Items currently in game (`src/game/data/items.ts`):** potion, super_potion, tuxeball, revive (4 total)

**Bag screen:** `src/game/scenes/PauseMenuScene.ts` line 71 shows stub: `"No bag screen yet!"`

## Upstream Tuxemon Paper Scoop

The Paper Scoop sells 3 items (economy slug: `spyder_paper_scoop`, resale multiplier: 0.5):

| Item | Price | Effect |
|------|-------|--------|
| Potion | 20g | Heals 50 HP |
| Tuxeball | 50g | Captures a monster |
| Revive | 100g | Revives fainted monster, restores 20 HP |

Note: upstream prices differ from ours (potion 20g vs our 50g, tuxeball 50g vs our 100g). Decide whether to match upstream or keep current pricing. Recommend matching upstream for Paper Town since it's the first shop (cheaper = friendlier for early game).

## Implementation Tasks

### Part 1: Fix the Paper Scoop Shop

1. **Fix shopkeeper position** in `spyder_paper_scoop.yaml` — Change the post-intro `Create Shopkeeper` event to place them behind the counter at a sensible position (e.g. (7,4) or (6,4) facing down, similar to how Cotton Scoop has theirs at (2,4) facing down).

2. **Add a Talk Shopkeeper event** in `spyder_paper_scoop.yaml`:
   ```yaml
   Talk Shopkeeper:
     behav: talk spyder_shopkeeper
     actions:
     - dialog Welcome to Paper Scoop! What can I get you?
     - open_shop spyder_paper_scoop
   ```
   This should only trigger when `intro_scoop:done` is set (post-intro).

3. **Register the shop** in `src/game/data/shops.ts`:
   ```typescript
   spyder_paper_scoop: {
     items: [
       { slug: "potion", price: 20 },
       { slug: "tuxeball", price: 50 },
       { slug: "revive", price: 100 },
     ],
     sellMultiplier: 0.5,
   },
   ```

4. **Adjust item definitions** if needed — upstream Potion heals 50 HP (not 20). Consider updating `src/game/data/items.ts` to match, or leave as-is if our balance is intentional.

### Part 2: QA Script — Shop Purchase Flow

Write `qa/shop-purchase-test.ts`:

```typescript
import { launchGame, setupGame, walkTo, interact, waitForIdle, getState, screenshot, waitForEvent } from "./harness";

async function main() {
  const { page, close } = await launchGame();
  // Start inside the Paper Scoop, post-intro
  await setupGame(page, { map: "spyder_paper_scoop", tileX: 6, tileY: 7 });

  // Walk to face the shopkeeper
  await walkTo(page, 6, 5, "up");
  await interact(page);
  await waitForIdle(page);

  // Shop should now be open — verify via state or screenshot
  await screenshot(page, "shop-open");

  // Purchase a potion (first item, press confirm)
  // ... interact with shop UI to buy item ...

  // Verify inventory now contains the item
  const state = await getState(page);
  console.log("Inventory after purchase:", JSON.stringify(state));

  await screenshot(page, "shop-purchased");
  await close();
  console.log("PASS: Shop purchase flow works");
}

main();
```

The implementing agent should flesh out the actual shop UI interaction (keyboard presses to select and confirm a purchase), then verify the test passes end-to-end.

### Part 3: Bag Screen

Implement a `BagScene` (or similar) launched from the pause menu "Bag" option. It should:

1. Display all items in the player's inventory with name, count, and description
2. Allow scrolling through items with UP/DOWN
3. Allow using items marked `usableIn: ["overworld"]` (potions, revive) from the bag
4. Close with ESC and return to the pause menu
5. Look similar to Tuxemon's ItemMenuState: item list on one side, selected item description on the other, using the existing NineSlice dialog border style

**Tuxemon's bag UI reference:**
- Shows item names in a scrollable list on the left
- Selected item's description appears in a text area below or to the right
- Item sprite displayed alongside
- Page indicators if many items
- Uses the same border/panel style as other menus

### Part 4: QA Script — Bag Screen

Write `qa/bag-screen-test.ts`:

```typescript
import { launchGame, setupGame, screenshot, getState } from "./harness";

async function main() {
  const { page, close } = await launchGame();
  await setupGame(page, {
    map: "spyder_paper_town", tileX: 10, tileY: 12,
    items: [
      { slug: "potion", count: 3 },
      { slug: "tuxeball", count: 5 },
      { slug: "revive", count: 1 },
    ],
  });

  // Open pause menu (ESC)
  await page.keyboard.press("Escape");
  await screenshot(page, "bag-pause-menu");

  // Select "Bag" option (navigate down and confirm)
  // ... press down to Bag, press enter ...

  await screenshot(page, "bag-screen");

  // Verify items are displayed
  // ... navigate items, take screenshots ...

  await screenshot(page, "bag-item-selected");
  await close();
  console.log("PASS: Bag screen renders correctly");
}

main();
```

The implementing agent should use the `puppeteer` skill's screenshot tool to iterate on the bag screen's visual design until it looks polished and similar to Tuxemon's original inventory UI.

## Acceptance Criteria

- [ ] Shopkeeper in Paper Scoop is positioned behind the counter and reachable post-intro
- [ ] Player can talk to shopkeeper and the shop UI opens
- [ ] `spyder_paper_scoop` shop sells: Potion, Tuxeball, Revive at upstream prices
- [ ] `qa/shop-purchase-test.ts` passes: opens shop, buys item, item appears in inventory
- [ ] Pause menu "Bag" option opens a functional inventory screen (not a stub)
- [ ] Bag screen shows item names, counts, and descriptions
- [ ] Items usable in overworld (potions, revive) can be used from the bag on a party monster
- [ ] `qa/bag-screen-test.ts` passes: opens bag, items display correctly
- [ ] Bag screen visual design reviewed via screenshots and iterated until polished
