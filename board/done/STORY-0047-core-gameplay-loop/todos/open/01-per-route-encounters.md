# Todo: Per-Route Encounter Tables

## What

Replace the global wild encounter system with per-map encounter tables, so each route has its own distinct pool of wild monsters at appropriate levels.

## Why

Currently wild encounters pick a random monster from the full pool regardless of location. For the game to feel like a real RPG, Route 1 should have low-level monsters and later routes should have progressively stronger ones.

## Tuxemon Reference

Check `mods/tuxemon/db/encounter/` for encounter YAML files. Tuxemon defines encounters per route:

**`spyder_route1.yaml`** (Route 1 encounters):
- Daytime L2-4: Pairagrin (rate 3.5), Aardorn (rate 3.5), Cataspike (rate 3.5)
- Nighttime L3-5: same species, higher levels

**`spyder_route2.yaml`** (Route 2 encounters):
- Daytime L3-6: Cardiling (2.5), Aardorn (2.5), Eyenemy (2.5), Cataspike (2.5), Axolightl (1.0, L4-7)
- Nighttime L4-8: same species, higher levels

Replicate this data structure in our codebase. We don't need day/night yet — just daytime pools.

## Implementation

1. **Create encounter table registry** at `src/game/data/encounters.ts`:
   ```typescript
   interface EncounterEntry {
     slug: string;       // monster species slug
     minLevel: number;
     maxLevel: number;
     weight: number;     // relative encounter rate
   }
   
   const ENCOUNTER_TABLES: Record<string, EncounterEntry[]> = {
     spyder_route1: [
       { slug: "pairagrin", minLevel: 2, maxLevel: 4, weight: 3.5 },
       { slug: "aardorn", minLevel: 2, maxLevel: 4, weight: 3.5 },
       { slug: "cataspike", minLevel: 2, maxLevel: 4, weight: 3.5 },
     ],
     // more routes added later
   };
   ```

2. **Modify wild encounter logic** in `OverworldScene` (or wherever encounters trigger):
   - Look up current map key in `ENCOUNTER_TABLES`
   - If table exists, pick a species using weighted random selection, randomize level in range
   - If no table, fall back to existing behavior (or skip encounters entirely)

3. **Monster species**: The slugs (pairagrin, aardorn, cataspike) need to exist in our monster registry. If they don't exist yet, add placeholder entries — or use existing monsters as stand-ins and note that todo 02 will add the real species.

4. **Keep the file structure aligned** with Tuxemon's `db/encounter/` directory — even though we use TypeScript instead of YAML, the data should mirror their encounter definitions.

## Verify with Puppeteer

Use `/puppeteer` to:
1. Teleport to Route 1 (or the grass tiles on any map with a defined table)
2. Walk through grass repeatedly
3. Verify encounters trigger with monsters from the route-specific pool
4. Verify monster levels are within the defined range
5. Screenshot a battle showing a route-specific monster

## Done When

- `src/game/data/encounters.ts` exists with Route 1 encounter table
- Wild encounters on maps with defined tables use those tables
- Monster species and levels match the table definition
- Maps without tables either skip encounters or use a fallback
