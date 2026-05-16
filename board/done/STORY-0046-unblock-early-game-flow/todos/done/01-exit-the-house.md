# Todo: Exit the House

## What

Create `public/assets/events/spyder_downstairs.yaml` so the player can interact with the downstairs map — talk to Mom, watch TV, and most importantly walk out the front door to Paper Town.

## Why

This is the immediate blocker. The `spyder_downstairs` map exists but has zero events, so the player is trapped indoors after going downstairs from the bedroom.

## Tuxemon Reference

Check the Tuxemon source at `mods/tuxemon/maps/spyder_downstairs.tmx` for the canonical events. In Tuxemon, spyder_downstairs has:

- **Go Upstairs** (0,1) — teleport back to `spyder_bedroom.tmx` at (8,2), face up
- **Go Outside** (4,6) — teleport to `spyder_paper_town.tmx` at (10,7), face down
- **Create Homemaker** — spawn `spyder_papertown_mom` with wander behavior near (4,4)
- **Home Sign** (1,1) — dialog "spyder_papertown_home" when interacting with the sign on the wall
- **Watch TV** (1,5) — dialog "spyder_papertown_tvwatch"
- **Play Music** — trigger "music_home" background track

Verify tile coordinates against our `spyder_downstairs.json` map — Tuxemon uses 16px tiles and our map may have different dimensions. Open the map JSON and check the actual tile grid size and where doors/stairs are placed.

## Implementation

1. Create `public/assets/events/spyder_downstairs.yaml` with these events:
   - **Go Upstairs**: `char_at` condition at the stairs tile, `transition_teleport` back to `spyder_bedroom.tmx`
   - **Go Outside**: `char_at` + `char_facing down` at the front door tile, `transition_teleport` to `spyder_paper_town.tmx`
   - **Create Mom**: spawn `spyder_papertown_mom` NPC (already in our NPC registry with `homemaker` spritesheet)
   - **Talk Mom**: `char_facing_char` + `button_pressed INTERACT`, Mom faces player, dialog about being careful out there
   - **Watch TV**: facing tile + interact at the TV position, simple dialog
   - **Play Music**: `play_music music_home` when not already playing

2. Verify tile coordinates by reading `spyder_downstairs.json` — check where the stair tiles and door tiles actually are in our map.

3. Add any missing i18n dialog keys if we're using `translated_dialog`, or use inline `dialog` actions for simplicity.

## Verify with Puppeteer

Use `/puppeteer` to:
1. Start the game, skip intro to land in bedroom
2. Go downstairs
3. Screenshot: verify Mom NPC is visible
4. Talk to Mom — verify dialog appears
5. Walk to door — verify teleport to Paper Town works
6. Walk back into the house — verify return teleport works (this depends on todo 02)

## Done When

- `spyder_downstairs.yaml` exists with Go Upstairs, Go Outside, Mom, TV, and music events
- Player can exit the house to Paper Town
- Player can go back upstairs to bedroom
- Mom NPC spawns and has dialog
