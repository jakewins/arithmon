# Todo: Economy System

## What

Implement the money management and Cathedral billing actions/conditions: `modify_money`, `money_is`, `set_economy`, `set_bill`, `modify_bill`, `bill_exists`, `bill_is`.

## Why

The Cathedral billing system is central to Tuxemon's narrative. Healing isn't free -- the Cathedral charges for it, and if you can't pay, you go into debt. Every healing center, shop, museum, and many NPCs interact with the money/bill system. The leather museum charges admission (`money_is player,greater_or_equal,50` + `modify_money player,-50`).

## Upstream Reference

**`modify_money`** -- Add or subtract gold:
```yaml
- modify_money player,100      # earn 100
- modify_money player,-50      # spend 50
```

**`money_is`** condition -- Compare player money:
```yaml
- is money_is player,greater_or_equal,50
- not money_is player,greater_or_equal,200
```

**`set_economy`** -- Assign a shop economy config to an NPC:
```yaml
- set_economy player,spyder_cotton_scoop
```
References files in `db/economy/*.yaml` which define item inventories and prices.

**Cathedral billing** (`set_bill`, `modify_bill`, `bill_exists`, `bill_is`):
```yaml
# From spyder_cathedral.yaml
- set_bill player,bill_cathedral,0           # initialize bill
- modify_bill player,bill_cathedral,50        # charge 50
- is bill_is player,bill_cathedral,greater_than,0   # has outstanding debt
- is bill_exists player,bill_cathedral               # bill account exists
```

## Implementation

1. **`modify_money` action** (`src/game/event/actions/modifyMoney.ts`):
   - Parse: `player,amount` (positive = earn, negative = spend)
   - Update `session.player.money += amount`
   - Clamp to minimum 0

2. **`money_is` condition** (`src/game/event/conditions/moneyIs.ts`):
   - Parse: `player,operator,amount`
   - Operators: `greater_than`, `less_than`, `equals`, `greater_or_equal`, `less_or_equal`
   - Compare `session.player.money` against amount

3. **`set_economy` action** (`src/game/event/actions/setEconomy.ts`):
   - Parse: `npc_slug,economy_slug`
   - Store the economy slug in session or NPC data so `open_shop` can use it
   - May need to update `open_shop` to accept economy slug from NPC context

4. **Add `bills` to session state** (`src/game/session.ts`):
   - Add `bills: Record<string, number>` to player state
   - `set_bill`: Initialize `bills[name] = amount`
   - `modify_bill`: `bills[name] += amount`
   - `bill_exists`: Check `name in bills`
   - `bill_is`: Compare `bills[name]` against value with operator

5. **Implement bill actions/conditions** as separate files following existing patterns.

## Verify with Puppeteer

Use `/puppeteer` to:
1. Check initial money via `getState()` (should be 500)
2. Trigger an event that calls `modify_money player,-100`, verify money is 400
3. Trigger an event with condition `money_is player,greater_or_equal,300` -- should pass
4. Trigger an event with condition `money_is player,greater_or_equal,500` -- should fail
5. Test billing: trigger `set_bill`, `modify_bill`, check via `bill_is` condition
6. Visit the healing center -- verify the Cathedral billing flow works (heal monsters, get charged)

## Done When

- `modify_money` adds/subtracts gold correctly
- `money_is` condition compares money with all operators
- `set_economy` configures shop inventory on NPCs
- `set_bill`, `modify_bill`, `bill_exists`, `bill_is` manage Cathedral debt
- Bills persist in session state
