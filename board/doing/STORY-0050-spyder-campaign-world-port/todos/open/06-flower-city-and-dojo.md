# Todo: Flower City and Dojo

## What

Add Flower City (town + center + pet shop + 2 houses + scoop) and the 4-floor Dojo. The Dojo is a unique training facility where players can evolve monsters, learn techniques, and change taste preferences.

## Why

Flower City is the gateway to the Dojo system, which is central to mid-game monster development. The pet shop sells monsters directly (a unique mechanic). The Dojo exercises the `evolution`, `dojo_method`, `change_taste`, and `remove_tech` actions from STORY-0049.

## Upstream Reference

**Source files:**
- Maps: `spyder_flower_city.tmx`, `spyder_flower_center.tmx`, `spyder_flower_petshop.tmx`, `spyder_flower_house1.tmx`, `spyder_flower_house2.tmx`, `spyder_flower_scoop.tmx`, `spyder_dojo1.tmx` through `spyder_dojo4.tmx`
- Events: `spyder_flower_center.yaml`, `spyder_flower_petshop.yaml`, `spyder_flower_house1.yaml`, `spyder_flower_house2.yaml`, `spyder_flower_scoop.yaml`, `spyder_dojo1.yaml`

**Dojo system (4 floors):**
- **Floor 1 (Fu)**: Evolution services -- check if monsters can evolve, trigger evolution for 500 gold
- **Floor 2 (Yin/Zhu)**: Taste changing for 50 gold (`change_taste` action)
- **Floor 3 (Xiang)**: Technique learning for 200 gold -- replace old techniques (`remove_tech`, teach new)
- **Floor 4 (Zhao)**: Master trainer battle, board displays

**Pet shop mechanics:**
```yaml
# open_shop with buy_monster mode
- open_shop player,spyder_flower_petshop,buy_monster
```
The shop sells actual monsters (not just items). This requires extending `open_shop` to support a `buy_monster` mode.

**Flower houses:**
- House 1: Soldier NPC with mission dialog, TV interaction
- House 2: Scientist NPC, flashback trigger for Greenwash events

## Implementation

1. **Export ~10 maps** from upstream
2. **Create Flower City events**: Town hub, building doors, NPC spawns
3. **Extend `open_shop`** to support `buy_monster` mode:
   - Show monster list with prices instead of items
   - On purchase: create monster instance, add to party or kennel
4. **Dojo events**:
   - Floor connections (stair teleports between 4 floors)
   - Master NPCs with conditional dialog
   - Evolution service: `check_evolution` → `evolution` → `modify_money`
   - Taste service: `change_taste` → `modify_money`
   - Technique service: `choice_monster` → `remove_tech` → teach new → `modify_money`
5. **NPC and trainer definitions** for Dojo masters and Flower City residents

## Verify with Puppeteer

Use `/puppeteer` to:
1. Enter Flower City -- screenshot overview
2. Visit pet shop -- verify monster purchase works
3. Enter Dojo floor 1 -- verify evolution service dialog
4. If player has evolution-ready monster: trigger evolution, verify it works
5. Navigate all 4 dojo floors via stairs
6. Visit healing center -- verify Cathedral flow
7. Enter houses -- verify NPC dialog

## Done When

- Flower City hub with all buildings accessible
- Pet shop sells monsters via extended `open_shop`
- Dojo 4 floors with stair connections
- Evolution, taste, and technique services work (even if some use stub actions from STORY-0049)
- All NPCs have appropriate dialog
