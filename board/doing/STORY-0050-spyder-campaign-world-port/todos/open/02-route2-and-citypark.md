# Todo: Route 2 and City Park

## What

Add Route 2 (connecting Cotton Town east to City Park) and City Park -- two new outdoor maps with encounter tables, trainers, and events.

## Why

After Cotton Town, Route 2 and City Park are the next areas in the campaign progression. Route 2 introduces Cardiling, Eyenemy, and the rare Axolightl. City Park is a larger transitional area with NPCs and events before Route 3 leads to the Mansion dungeon.

## Upstream Reference

**Source files:**
- Maps: `mods/tuxemon/maps/spyder_route2.tmx`, `spyder_citypark.tmx`
- Encounters: `mods/tuxemon/db/encounter/spyder_route2.yaml`, `spyder_citypark.yaml`
- NPCs: route trainers from various NPC files

**Route 2 encounters (levels 3-8):**
| Monster | Rate | Day/Night |
|---------|------|-----------|
| Cardiling | 2.5 | Both |
| Aardorn | 2.5 | Both |
| Eyenemy | 1.5 | Both |
| Axolightl | 1.0 | Both (rare) |
| Cataspike | 2.0 | Both |

**City Park encounters (levels 5-11):**
- Various monsters at increased levels, transitioning to mid-game difficulty

**Key events:**
- Route 2 has 1-2 trainers patrolling the route
- City Park has a florist NPC, achievement-tracking NPCs, and transitions to Route 3
- Both areas connect via edge transitions (standard char_at + char_facing_tile pattern)

## Implementation

1. **Export maps**:
   - `spyder_route2.tmx` → `public/assets/maps/spyder_route2.json`
   - `spyder_citypark.tmx` → `public/assets/maps/spyder_citypark.json`
   - Copy any new tilesets needed

2. **Create encounter tables** in `src/game/data/encounters.ts` (or equivalent):
   - `spyder_route2`: Cardiling, Aardorn, Eyenemy, Axolightl (rare), Cataspike at L3-8
   - `spyder_citypark`: Appropriate species at L5-11

3. **Add new monster species** needed for these encounters:
   - **Axolightl**: Source from `mods/tuxemon/db/monster/axolightl.yaml`. Copy battle sprites from upstream. Define stats, moves, catch rate.

4. **Create event YAMLs**:
   - `spyder_route2.yaml`: Edge transitions (Cotton Town ↔ Route 2, Route 2 ↔ City Park), grass encounters, trainer NPCs
   - `spyder_citypark.yaml`: Edge transitions, NPCs, signs, encounter areas

5. **Wire Cotton Town east exit**:
   - Update `cotton_town.yaml` to connect east edge to `spyder_route2`
   - Remove any "Coming soon" placeholder from that exit

6. **Add route trainers** with parties:
   - Define 1-2 trainers per area in `npcParties.ts`
   - Monsters at appropriate levels (L5-8 for Route 2, L8-11 for City Park)

## Verify with Puppeteer

Use `/puppeteer` to:
1. Walk east from Cotton Town -- verify transition to Route 2
2. Walk through Route 2 grass -- verify encounter with correct species (Cardiling, etc.)
3. Screenshot Route 2 overview
4. Fight route trainer -- verify battle works and rewards gold
5. Continue to City Park -- verify transition
6. Walk City Park grass -- verify encounters at higher levels
7. Talk to NPCs in City Park
8. Walk east from City Park -- verify it connects toward Route 3 (or shows blocker if Route 3 not yet built)

## Done When

- Route 2 map is playable with grass encounters (Cardiling, Eyenemy, Axolightl, etc.)
- City Park map is playable with encounters
- Cotton Town east exit connects to Route 2
- Route 2 connects to City Park
- At least 1 trainer on each route
- Axolightl species added to monster registry
- All edge transitions work bidirectionally
