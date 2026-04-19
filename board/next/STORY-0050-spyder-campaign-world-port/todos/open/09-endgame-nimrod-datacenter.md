# Todo: Endgame -- Nimrod and Data Center

## What

Add the endgame areas: Nimrod tower (4 floors), Data Center, Route B, Route C, Diamond Hill, and any remaining maps needed to complete the campaign world.

## Why

These are the final areas of the Spyder campaign. Nimrod has critical flashback sequences (Zircon & Argon, Enforcers Rapid Response) that reveal the campaign's climax. The Data Center is the highest-level area (L40-50) with unique electric/cyber monsters. Routes B and C connect the remaining areas.

## Upstream Reference

**Source files:**
- Maps: `spyder_nimrod_bottom.tmx`, `spyder_nimrod_middle.tmx`, `spyder_nimrod_top.tmx`, `spyder_nimrod_room.tmx`, `spyder_datacenter.tmx`, `spyder_routeB.tmx`, `spyder_routeC.tmx`, `spyder_diamond_hill.tmx`
- Events: `spyder_nimrod_room.yaml`, `spyder_diamond_hill.yaml`

**Nimrod Room flashbacks** (from `spyder_nimrod_room.yaml`):
Two major flashback sequences using the same pattern as Greenwash:
1. Zircon & Argon scene -- reveals antagonist backstory
2. Enforcers Rapid Response -- climactic event

**Data Center encounters (levels 40-50):**
Pythwire, Ouroboutlet, Sockeserp -- cyber/electric themed.
Lowest encounter rates (0.5) -- rare but powerful monsters.

**Route B encounters (levels 20-28):** Toufigel, Pipis, Strella (rare)
**Route C**: Sea route, requires swimming mechanic (surfboard)

**Diamond Hill**: Small connector area between Candy Port and other areas.

## Implementation

1. **Export ~8 maps** from upstream
2. **Add remaining species** (~6): Pythwire, Ouroboutlet, Sockeserp, Toufigel, Pipis, Strella
3. **Nimrod events**:
   - Floor transitions (4 floors)
   - 2 flashback sequences in Nimrod Room
   - Readable documents/papers on each floor
4. **Data Center events**:
   - Very low encounter rate (0.5)
   - Possibly story-gated entry
5. **Route B/C**: Standard route maps with encounters
   - Route C may need swimming (can stub/block if swimming not fully implemented)
6. **Diamond Hill**: Connector area to Candy Port
7. **Wire all remaining connections** between areas

## Verify with Puppeteer

Use `/puppeteer` to:
1. Navigate Nimrod tower -- all 4 floors via stairs
2. Trigger Nimrod Room flashbacks -- verify sepia tint and dialog
3. Enter Data Center -- verify very low encounter rate, high-level monsters
4. Walk Route B -- verify encounters (Toufigel, Pipis)
5. Check Route C -- verify it's accessible (or properly blocked if swimming not implemented)
6. Visit Diamond Hill -- verify connection to Candy Port
7. Do a quick tour of the complete world -- can you walk from Paper Town through every area?

## Done When

- All endgame areas are loadable and connected
- Nimrod flashback sequences work
- Data Center has high-level encounters
- Routes B and C exist (C may be blocked pending swimming)
- Diamond Hill connects to Candy Port
- ~6 remaining species added
- The full campaign map is complete -- every area is reachable
