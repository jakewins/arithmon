# Todo: Money and Currency

## What

Add a gold/money system to the player so they can earn currency from battles and spend it at shops.

## Why

Shops need currency. In Tuxemon, players earn money from trainer battles and spend it on potions, tuxeballs, and other items. Without money, the shop system (next todo) has nothing to work with.

## Tuxemon Reference

Check how Tuxemon handles money:
- Player has a `money` attribute in their save data
- Trainers award money on defeat (based on trainer class and level)
- Items have buy/sell prices defined in `mods/tuxemon/db/item/*.yaml`
- Shops use `economy` definitions in `mods/tuxemon/db/economy/`
- Resale multiplier is typically 0.5 (sell for half buy price)

Key item prices from Tuxemon:
- Potion: 50
- Tuxeball: 100
- Revive: 100

## Implementation

1. **Add `money` to `PlayerState`** in `src/game/session.ts`:
   - `money: number` field, starting value TBD (maybe 500 to match Tuxemon's initial gold)

2. **Award money on trainer battle win**:
   - After a trainer battle ends in victory, award gold
   - Simple formula: base amount per trainer (could be level-based or flat)
   - Display "Got {amount} gold!" in the post-battle results

3. **Add prices to items** in `src/game/data/items.ts`:
   - Add `buyPrice` and `sellPrice` (or `buyPrice` + resale multiplier) to `ItemDef`
   - Match Tuxemon's prices: Potion 50, Tuxeball 100, Revive 100

4. **Display money in UI** (optional but nice):
   - Show gold in the pause menu or party screen
   - Keep it simple — just a text display

## Verify with Puppeteer

Use `/puppeteer` to:
1. Check initial gold via debug API / getState()
2. Win a trainer battle — verify gold is awarded
3. Check gold again — verify it increased
4. Screenshot showing gold display (if added to UI)

## Done When

- Player has a `money` field that persists during the session
- Winning trainer battles awards gold
- Items have buy/sell prices defined
- Gold amount is accessible (at minimum via debug API, ideally in pause menu)
