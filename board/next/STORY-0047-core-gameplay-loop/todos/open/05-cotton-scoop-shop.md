# Todo: Cotton Scoop Shop

## What

Create the Cotton Scoop interior map in Cotton Town and wire up the shopkeeper NPC to use the `open_shop` action from the previous todo.

## Why

The Cotton Scoop is the first shop the player encounters. It's where they buy potions, tuxeballs, and revives — essential supplies for exploring routes and catching monsters.

## Tuxemon Reference

Check `mods/tuxemon/maps/spyder_cotton_scoop.tmx` for the map layout:

- **Size**: 13x11 tiles (small indoor shop)
- **Tilesets**: core_indoor_floors, core_indoor_walls, core_set_pieces
- **NPCs**:
  - Shopkeeper (spyder_shopkeeper) at (1,6) — runs the shop with economy "spyder_cotton_scoop"
  - Tech shop NPC at (1,4) — tech economy (future, skip for now)
  - Shop assistant at (7,7) — flavor dialog
- **Exit**: bottom of map → `spyder_cotton_town.tmx` (around tile 30,35 — check exact coordinates)
- **Music**: shop/cathedral theme

Note: we already have `spyder_paper_scoop.json` — the Paper Scoop is a *different* shop (the starter selection location). The Cotton Scoop is Cotton Town's supply shop.

## Implementation

1. **Create the map** in Tiled:
   - Reference `spyder_cotton_scoop.tmx` for layout
   - Create `public/assets/maps/spyder_cotton_scoop.json`
   - Small indoor map with counter, shelves, door
   - Register in `MAP_REGISTRY`

2. **Create events** at `public/assets/events/spyder_cotton_scoop.yaml`:
   - **Spawn shopkeeper**: create NPC behind counter
   - **Talk shopkeeper**: `char_facing_char` + INTERACT → `open_shop spyder_cotton_scoop`
   - **Exit door**: `char_at` at door tile → `transition_teleport player,cotton_town.tmx,{x},{y},0.3`
   - **Music**: play shop music

3. **Add Cotton Scoop door to Cotton Town**:
   - Add an "Enter Cotton Scoop" event in `cotton_town.yaml`
   - Player walks to the shop building door → teleport to `spyder_cotton_scoop.tmx`
   - Check Tuxemon's Cotton Town map for the shop door coordinates

4. **Add any missing NPC sprites** to the registry if needed.

## Verify with Puppeteer

Use `/puppeteer` to:
1. Give the player gold via debug API
2. Walk to Cotton Town, enter the Cotton Scoop
3. Screenshot the shop interior
4. Talk to shopkeeper — verify shop UI opens
5. Buy a potion — verify transaction works
6. Exit the shop — verify return to Cotton Town
7. Re-enter — verify shop still works

## Done When

- `spyder_cotton_scoop.json` map exists and renders correctly
- `spyder_cotton_scoop.yaml` events work (shopkeeper, door)
- Shopkeeper opens the shop UI via `open_shop` action
- Player can buy items at the Cotton Scoop
- Door connects bidirectionally to Cotton Town
