# Todo: Timber Town Region

## What

Add Routes 4 and A, Timber Town, and its interiors (center, cafe, scoop, walled gardens). This is the second major hub town.

## Why

Timber Town is a key story progression point -- arriving here sets the `seentimber:yes` variable which unlocks Paper Town's daycare. It has a Cathedral healing center, cafe, scoop shop, and the walled gardens. Route 4 and Route A connect here from the Mansion area.

## Upstream Reference

**Timber Town visual reference:**
- `https://wiki.tuxemon.org/images/9/9e/Timber_Town.png` -- Stone castle/cathedral, red center, ferry building on water, fountain, houses

**Source files:**
- Maps: `spyder_route4.tmx`, `spyder_routeA.tmx`, `spyder_timber_town.tmx`, `spyder_timber_center.tmx`, `spyder_timber_cafe.tmx`, `spyder_timber_walledgarden1.tmx`, `spyder_timber_walledgarden2.tmx`
- Events: `spyder_timber_center.yaml`, `spyder_timber_cafe.yaml`
- NPCs: `mods/tuxemon/db/npc/spyder_timber_town_npcs.yaml`

**Route 4 encounters (levels 11-16):**
Elofly, Sapsnap (rare), Aardorn, Katapill

**Route A encounters (levels 12-15):**
Shybulb, Katapill, Anoleaf (rare)

**Key events:**
- Timber Center: Cathedral healing (loads `spyder_cathedral.yaml` shared events)
- Timber Cafe: Healing option, florist flashback sequence, NPC dialog
- Town: Sets `seentimber:yes` on first visit, enabling Paper Town daycare
- Walled gardens: Garden areas with environmental encounters

## Implementation

1. **Export ~7 maps** from upstream
2. **Add new species**: Sapsnap, Katapill, Anoleaf (if not already added in earlier todos)
3. **Create encounter tables** for Route 4 and Route A
4. **Create event YAMLs**:
   - Timber Town: NPC spawns, building doors, `set_variable seentimber:yes` on entry, route connections
   - Timber Center: `load_yaml spyder_cathedral` for healing/billing events
   - Timber Cafe: Healing, flashback events
5. **Wire connections**: Mansion area → Route 4 → Timber Town, Route A ↔ Route 4
6. **Add trainer parties** for Route 4 and Route A trainers

## Verify with Puppeteer

Use `/puppeteer` to:
1. Walk Route 4 from Mansion area -- verify encounters, trainer battles
2. Enter Timber Town -- screenshot overview (compare to wiki image above)
3. Enter healing center -- verify Cathedral healing/billing flow works
4. Enter cafe -- verify NPC dialog
5. Check `getState()` -- verify `seentimber:yes` is set
6. Walk Route A -- verify encounters
7. Try all building doors -- verify interiors load

## Done When

- Routes 4 and A playable with encounters
- Timber Town hub with working building doors
- Healing center uses Cathedral shared events
- `seentimber:yes` set on first visit
- All edge transitions work bidirectionally
- At least 3 new species added for route encounters
