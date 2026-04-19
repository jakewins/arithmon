# Todo: Mansion Dungeon

## What

Add Route 3 and the 3-floor Mansion dungeon -- the first major dungeon in the campaign. Route 3 connects City Park to the Mansion entrance.

## Why

The Mansion is the first real dungeon challenge. It has 3 floors with stronger monsters (L13-17), puzzle-like navigation between floors, and rare monsters like Djinnbo. This is where the campaign starts testing the player's monster collection and battle strategy.

## Upstream Reference

**Source files:**
- Maps: `mods/tuxemon/maps/spyder_route3.tmx`, `spyder_mansion.tmx`, `spyder_mansion_basement.tmx`, `spyder_mansion_top.tmx`
- Encounters: `mods/tuxemon/db/encounter/spyder_route3.yaml`, `spyder_mansion.yaml`

**Route 3 encounters (levels 7-12):**
| Monster | Notes |
|---------|-------|
| Cardiling | Common |
| Elofly | New species |
| Squabbit | Rare |
| Shybulb | Common |

**Mansion encounters (levels 13-17):**
| Monster | Notes |
|---------|-------|
| Cairfrey | New species |
| Polyrock | New species |
| Djinnbo | Rare |

**Mansion structure:**
- Ground floor: Main hall, multiple rooms, stairs up and down
- Basement: Dark area with stronger encounters
- Top floor: Tower/attic with lore items and rare monsters
- Navigation between floors via stair tiles (transition_teleport)

## Implementation

1. **Export 4 maps** from upstream TMX files
2. **Add ~5 new monster species**: Elofly, Squabbit, Shybulb, Cairfrey, Polyrock, Djinnbo
   - Source stats and sprites from upstream monster YAML files
   - Add battle sprites
3. **Create encounter tables** for Route 3 and Mansion
4. **Create event YAMLs**:
   - Route 3: Edge transitions, trainers, signs
   - Mansion floors: Stair connections between floors, NPC encounters, item pickups
5. **Wire map connections**: City Park → Route 3 → Mansion (ground floor), stairs between floors

## Verify with Puppeteer

Use `/puppeteer` to:
1. Walk from City Park through Route 3 -- verify encounters and transitions
2. Enter Mansion ground floor -- screenshot interior
3. Navigate stairs to basement and top floor -- verify floor transitions work
4. Encounter Mansion-specific monsters (Cairfrey, Polyrock)
5. Walk through all 3 floors and return to Route 3

## Done When

- Route 3 and 3 Mansion floors are playable
- 6 new monster species added
- Encounters at appropriate levels (7-12 route, 13-17 mansion)
- Floor-to-floor stair transitions work
- Player can navigate the full dungeon and exit
