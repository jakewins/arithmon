# Todo: Route 1 Events

## What

Create `public/assets/events/spyder_route1.yaml` with map transitions, wild encounter zones, the Bjorn NPC, route sign, and music.

## Why

The map from todo 03 is empty without events — no way to enter/exit, no encounters, no NPCs. This todo brings Route 1 to life.

## Tuxemon Reference

Check `mods/tuxemon/maps/spyder_route1.tmx` object layer for events. Key events in Tuxemon:

- **Go Paper Town**: south edge → `spyder_paper_town.tmx` (player arrives at northern edge of Paper Town)
- **Go Cotton Town**: north edge → `spyder_cotton_town.tmx` (player arrives at southern edge of Cotton Town)
- **Wild encounters**: several grass zones trigger `random_encounter spyder_route1,11`
- **Route 1 encounters** (from `mods/tuxemon/db/encounter/spyder_route1.yaml`):
  - Daytime L2-4: Pairagrin, Aardorn, Cataspike (encounter rate 3.5 each)
  - Nighttime L3-5: same species at higher levels
- **Bjorn NPC**: beachcomber at (13,11), wanders, dialog "spyder_route1_bjorn", runs away on approach
- **Route Sign**: at (24,17), dialog "spyder_route1_routesign"
- **Music**: "music_the_wild_places"
- **Environment**: grass (day) / night_grass (night)

## Implementation

### 1. Per-route encounter system

Our current wild encounter system picks random monsters globally. We need to support per-map encounter tables. Check how `OverworldScene` currently triggers encounters and modify it to look up a route-specific encounter pool.

Options (pick the simplest):
- Add an encounter table registry in `src/game/data/` mapping map keys to `{ slug, minLevel, maxLevel, weight }[]`
- The overworld scene checks the current map key and pulls from the right table
- Fallback to existing behavior if no table is defined for the map

**Note**: The new monster species (Pairagrin, Aardorn, Cataspike) are added in STORY-0047. For now, use our existing monsters (Rockitten, Budaye, etc.) as placeholders in the Route 1 encounter table. The encounter *system* is what matters here.

### 2. Map transitions

Add events to `spyder_route1.yaml`:
- **Go Paper Town**: `char_at` at southern edge tiles → `transition_teleport player,spyder_paper_town.tmx,{x},{y},0.3`
- **Go Cotton Town**: `char_at` at northern edge tiles → `transition_teleport player,cotton_town.tmx,{x},{y},0.3`

Update `spyder_paper_town.yaml` to connect its northern exit to Route 1 (from todo 02).

Update `cotton_town.yaml` to add a southern entry from Route 1 (add a "Go Route 1" event at Cotton Town's southern edge).

### 3. Bjorn NPC

- Add `spyder_route1_bjorn` to `src/game/data/npcs.ts` with beachcomber spritesheet
- Create NPC spawn event and dialog in the YAML
- Keep it simple — spawn, dialog on interact, no need for the "run away" behavior yet (that requires `char_wander` which we may not have)

### 4. Route sign

- Interact with sign tile → dialog "Route 1 — Paper Town to Cotton Town"

### 5. Music

- `play_music music_the_wild_places` (will be a no-op if music is still stubbed, but set it up for when we add audio)

## Verify with Puppeteer

Use `/puppeteer` to:
1. Start game, get through intro, exit house to Paper Town
2. Walk north — verify transition to Route 1
3. Screenshot Route 1
4. Walk through grass — verify wild encounter triggers
5. Walk to Bjorn — interact, verify dialog
6. Walk to route sign — interact, verify dialog
7. Walk north — verify transition to Cotton Town
8. Walk south from Cotton Town — verify return to Route 1

## Done When

- `spyder_route1.yaml` exists with all events
- Bidirectional transitions: Paper Town <-> Route 1 <-> Cotton Town
- Wild encounters trigger in grass areas (using placeholder monsters if needed)
- Bjorn NPC spawns and has dialog
- Route sign readable
