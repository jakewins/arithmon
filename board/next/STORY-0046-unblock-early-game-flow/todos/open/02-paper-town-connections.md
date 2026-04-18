# Todo: Paper Town Connections

## What

Wire up Paper Town's map connections so doors work bidirectionally — entering the player's house from outside, and adding the northward exit toward Route 1.

## Why

Paper Town already has an "Enter House" event (at tile 10,6 teleporting to `spyder_downstairs.tmx`), but we need to verify it works with the new downstairs exit, and add the Route 1 connection point for the next todo.

## Tuxemon Reference

Check `mods/tuxemon/maps/spyder_paper_town.tmx` for map connections. In Tuxemon, Paper Town connects to:

- **Player's house** (10,6) — enter door, teleport to `spyder_downstairs.tmx` at (4,6)
- **Route 1** — northern edge of the map, teleport to `spyder_route1.tmx`
- **Paper Scoop** (19,12) — already implemented in our events
- **Daycare**, **Rival's house**, **Sunnyside Manor** — future work, not needed now

Also check that the existing "Enter House" event in `spyder_paper_town.yaml` has the correct destination coordinates matching where the door is in `spyder_downstairs.json`.

## Implementation

1. **Verify existing "Enter House" event** in `public/assets/events/spyder_paper_town.yaml`:
   - Check the destination coordinates match the door tile in `spyder_downstairs.json`
   - The player should arrive facing up, just inside the door

2. **Add "Go To Route 1" event** in `spyder_paper_town.yaml`:
   - Trigger when player walks to the northern edge of the map
   - Check the Tuxemon map for exact tile coordinates of the route exit
   - `transition_teleport player,spyder_route1.tmx,{x},{y},0.3` — coordinates TBD based on Route 1 map (todo 03)
   - Add a placeholder comment if Route 1 doesn't exist yet; update coordinates after todo 03

3. **Add a Route Sign** if Tuxemon has one at the town exit — dialog like "Route 1 — Cotton Town ahead"

## Verify with Puppeteer

Use `/puppeteer` to:
1. Start game, get through intro to Paper Town
2. Walk to player's house door — verify entering takes you to downstairs
3. Walk out of the house — verify you return to Paper Town at the right spot
4. Walk to northern edge — verify route transition (or that the exit point exists for todo 03)
5. Screenshot each transition

## Done When

- Player's house door works bidirectionally (Paper Town <-> downstairs)
- Northern exit point for Route 1 is defined in Paper Town events
- Coordinates are verified against both map JSONs
