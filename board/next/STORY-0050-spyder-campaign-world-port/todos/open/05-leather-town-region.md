# Todo: Leather Town Region

## What

Add Routes 5 and 6, Leather Town, and its interiors: healing center, gym, museum, mine shafts (2), and scoop shop. Leather Town has the most complex interior mechanics in the campaign.

## Why

Leather Town is the mining town with unique gameplay: the gym has a point-tracking battle system (Chad vs Brad NPCs, tracked with `variable_math`), the museum has paid admission (`money_is` check), and the mine shafts are mini-dungeons. This region exercises many of the new engine features from STORY-0049.

## Upstream Reference

**Source files:**
- Maps: `spyder_route5.tmx`, `spyder_route6.tmx`, `spyder_leather_town.tmx`, `spyder_leather_center.tmx`, `spyder_leather_gym.tmx`, `spyder_leather_museum.tmx`, `spyder_leather_shaft1.tmx`, `spyder_leather_shaft2.tmx`
- Events: `spyder_leather_center.yaml`, `spyder_leather_gym.yaml`, `spyder_leather_museum.yaml`

**Route 5 encounters (levels 16-23):** Foofle, Vamporm, Dracune (rare)
**Route 6 encounters (levels 19-23):** Dandicub, Dandylion, Capiti

**Leather Gym mechanics:**
```yaml
# Point tracking with variable_math
- variable_math player,gym_points,+,1     # after each trainer win
- translated_dialog gym_score              # "Score: ${{gym_points}}"
```
NPCs Chad and Brad take turns challenging the player. Points are tracked.

**Museum mechanics:**
```yaml
# Paid admission
MuseumEntry:
  conditions:
    - is money_is player,greater_or_equal,50
  actions:
    - modify_money player,-50
    - translated_dialog museum_welcome
```
Interior has mineral plaques (interactive signs), Nimrod lore display, NPC guide.

## Implementation

1. **Export ~8 maps** from upstream
2. **Add new species**: Foofle, Vamporm, Dracune, Dandicub, Dandylion, Capiti (~6 species)
3. **Create encounter tables** for Routes 5, 6
4. **Gym events**:
   - Create trainer NPCs (Chad, Brad) with battle parties
   - Wire `variable_math` for score tracking
   - Victory/loss dialog variants
5. **Museum events**:
   - Entry fee check with `money_is`
   - Interactive plaques with `translated_dialog`
   - NPC guide with dialog
6. **Mine shaft events**:
   - Dungeon-style maps with encounters
   - Stair connections between shaft levels
7. **Wire all connections**: Timber Town → Route 5 → Route 6 → Leather Town

## Verify with Puppeteer

Use `/puppeteer` to:
1. Walk Routes 5 and 6 -- verify encounters with new species
2. Enter Leather Town -- screenshot overview
3. Enter gym -- fight Chad, verify score tracking with `variable_math`
4. Enter museum with sufficient money -- verify admission deducted
5. Enter museum without enough money -- verify rejection dialog
6. Read museum plaques -- verify interactive dialog
7. Enter mine shaft -- verify dungeon encounters
8. Visit healing center -- verify Cathedral billing

## Done When

- Routes 5 and 6 with encounters (6 new species)
- Leather Town hub with all building doors working
- Gym with point-tracking battle system
- Museum with paid admission and interactive exhibits
- Mine shafts with dungeon encounters
- Healing center with Cathedral events
