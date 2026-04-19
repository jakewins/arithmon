# Todo: Paper Town Completion

## What

Add the missing Paper Town interior maps: Spyder Manor (Princeton's house), Paper Daycare (Granny Piper's), and the Rival's House (3 floors: downstairs, bedroom, office).

## Why

Paper Town is the starting hub but currently only has the player's house (bedroom + downstairs), Paper Scoop, and the outdoor town. Upstream has 5 more interiors with story-important NPCs and events -- Princeton gives early game advice, the daycare unlocks after seeing Timber Town, and the rival's house has flashback sequences and world-building.

## Upstream Reference

**Rival house visual reference:**
- Bedroom: `https://wiki.tuxemon.org/images/9/96/Spyder_paper_rival_bedroom.png`
- Office: `https://wiki.tuxemon.org/images/2/2e/Spyder_paper_rival_office.png`
- Downstairs: `https://wiki.tuxemon.org/images/1/11/Spyder_paper_rival_downstairs.png`

**Manor visual reference:**
- `https://wiki.tuxemon.org/images/7/77/Spyder_paper_manor.png` -- Small cozy house with kitchen counter, bed, stool

**Source files:**
- Maps: `mods/tuxemon/maps/spyder_paper_manor.tmx`, `spyder_paper_daycare.tmx`, `spyder_paper_rival_downstairs.tmx`, `spyder_paper_rival_bedroom.tmx`, `spyder_paper_rival_office.tmx`
- Events: `mods/tuxemon/maps/spyder_paper_manor.yaml`, `spyder_paper_daycare.yaml`, `spyder_paper_rival_bedroom.yaml`, `spyder_paper_rival_downstairs.yaml`, `spyder_paper_rival_office.yaml`
- NPCs: `mods/tuxemon/db/npc/spyder_paper_town_npcs.yaml` (Princeton, Granny Piper, Billie)

**Key events:**
- **Manor**: Princeton NPC gives advice based on story progress (different dialog for different `variable_set` values)
- **Daycare**: Unlocks when `variable_set seentimber:yes`. Granny Piper manages monster daycare. Has a Billie flashback sequence.
- **Rival downstairs**: TV shows news, has flashback trigger (Billie & grandma), mom's dialog
- **Rival bedroom**: Radio (tune_radio), computer, bookshelf interactions
- **Rival office**: Haiku display, bookshelf with lore

## Implementation

For each map:

1. **Export TMX to JSON** using Tiled (or our export script):
   - Load upstream `.tmx` file in Tiled
   - Save as JSON to `public/assets/maps/spyder_paper_manor.json` (etc.)
   - Ensure tileset references match our existing tileset PNGs

2. **Create event YAML** in `public/assets/events/`:
   - Port events from upstream YAML files
   - NPC spawning, dialog, teleport connections
   - Door events in `spyder_paper_town.yaml` to connect to these interiors

3. **Add any new NPC sprites/slugs** to `src/game/data/npcs.ts`:
   - Princeton (oldman template)
   - Billie (fashionista template -- already exists?)
   - Check upstream NPC definitions for correct sprite mappings

4. **Wire door transitions** in `spyder_paper_town.yaml`:
   - Manor door → `spyder_paper_manor`
   - Daycare door → `spyder_paper_daycare` (conditional on `seentimber:yes`, else "locked" dialog)
   - Rival house door → `spyder_paper_rival_downstairs`
   - Each interior has exit teleport back to Paper Town

## Verify with Puppeteer

Use `/puppeteer` to:
1. Teleport to Paper Town
2. Walk to each new door -- verify transition works
3. Inside each building:
   - Screenshot the interior (compare to upstream wiki images linked above)
   - Talk to NPCs -- verify dialog appears
   - Interact with objects (bookshelf, computer, etc.)
   - Walk to exit -- verify return to Paper Town
4. Test daycare lock: without `seentimber:yes`, door should be locked
5. Set `seentimber:yes` via debug API, verify daycare unlocks

## Done When

- 5 new interior maps loadable and visually matching upstream
- All doors in Paper Town connect to interiors
- Princeton, Granny Piper NPCs have dialog
- Rival house has 3 floors with stairs connecting them
- Daycare is locked until `seentimber:yes`
- Exit teleports return to correct Paper Town positions
