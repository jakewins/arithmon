# STORY-0044: Starter Selection & Paper Scoop

## Description

Implement the Paper Scoop location — the first major gameplay scene in the Spyder campaign. The player enters the shop, watches an intro sequence with Billie and other NPCs, gets asked their name, previews five starter monsters in display cases, chooses one, confirms their choice, and is sent home with their new companion.

**Key goal**: run the real `spyder_paper_scoop.yaml` event script from upstream Tuxemon with minimal modifications.

**Depends on**: STORY-0043 (Event Engine Expansion) for `rename_player`, `choice_monster`, `open_journal`, and `char_facing` condition.

### The Paper Scoop flow (from upstream YAML)

The `spyder_paper_scoop.yaml` file defines this sequence:

1. **Create NPCs** — 7 NPCs spawned: shopkeeper, Dante, Miles, Shirley, Roddick, Harith, Billie. All face inward.
2. **Intro Storekeeper** — Lock controls, dialog about the shop, Dante walks through the room examining goods, dialog asking the player's name.
3. **`rename_player player,random`** — Player gets a name (random or typed).
4. **Display Cases** — 5 tiles (x:8-12, y:8) each trigger `open_journal` for one of the 5 starters: Dollfin, Memnomnom, Budaye, Grintot, Ignibus.
5. **`choice_monster`** — Player picks from the 5 starters, stored in `myintrochoice` variable.
6. **Confirm** — "Are you sure?" dialog choice. "No" loops back to step 5.
7. **Variable routing** — Based on `myintrochoice`, sets `billie_choice` to the same monster.
8. **Continue Storekeeper** — Long choreographed exit: each NPC pathfinds out one by one, final dialog, player is teleported back to `spyder_bedroom`.
9. **Post-intro state** — `intro_scoop:done` variable set. Future visits show the shopkeeper in a different position, Dante wanders.

### What to build

#### 1. Import the Paper Scoop map

Export `spyder_paper_scoop.tmx` from the Tuxemon repo (`/home/jake/Code/third/tuxemon/mods/tuxemon/maps/spyder_paper_scoop.tmx`) as a Tiled JSON file. Follow the same process as STORY-0015:
- Use `tiled --export-map --embed-tilesets` to export
- Decompress zlib base64 layer data to plain int arrays
- Strip tileset image paths to bare filenames
- Copy required tileset PNGs
- Register in `maps.ts`

#### 2. Import the event YAML

Copy `spyder_paper_scoop.yaml` to `public/assets/events/spyder_paper_scoop.yaml`. The script should work with our event engine after STORY-0043 is done, with these adjustments:
- The `behav: talk spyder_dante` sections need to be translated to our condition format (`button_pressed` + `char_facing_char`)
- The `wander` argument on `create_npc spyder_dante,11,6,wander` — we may need to handle or ignore the wander behavior for now

#### 3. Register NPC sprites

The Paper Scoop uses 7 named NPCs. Each needs a spritesheet registered in `npcs.ts`:
- `spyder_shopkeeper`
- `spyder_dante`
- `spyder_papermart_miles`
- `spyder_papermart_shirley`
- `spyder_route2_roddick`
- `spyder_papermart_harith`
- `spyder_billie`

Fetch the corresponding sprite PNGs from Tuxemon's `mods/tuxemon/gfx/sprites/player/` directory.

#### 4. Register starter monsters

The 5 starters (dollfin, ignibus, memnomnom, budaye, grintot) are already defined in our `monsters.ts`. Verify they have correct stats, catch rates, and front sprites for the journal view.

#### 5. Add translated dialog strings

The YAML references translation keys like `spyder_intro_shopkeeper1`, `spyder_intro_shopkeeper2`, etc. Pull the English strings from Tuxemon's `l18n/en_US/LC_MESSAGES/base.po` and add them to our i18n system.

#### 6. Wire the map transition

The player reaches Paper Scoop via `transition_teleport` from the bedroom intro. We need to ensure:
- `spyder_bedroom.yaml` has an event that teleports to `spyder_paper_scoop` at the right trigger point
- After the Paper Scoop sequence, the player teleports back to `spyder_bedroom` (this is already in the upstream YAML)

### Tasks

1. **Export Paper Scoop map** — TMX → JSON, tilesets, register in `maps.ts`
2. **Import event YAML** — copy + adapt `spyder_paper_scoop.yaml`, translate `behav` sections
3. **Register NPC sprites** — fetch and register all 7 NPC spritesheets
4. **Add dialog translations** — extract English strings from Tuxemon's PO file
5. **Wire bedroom → Paper Scoop transition** — add teleport event in bedroom YAML
6. **Monster data verification** — confirm all 5 starters have correct data + sprites
7. **Integration test** — end-to-end flow from bedroom through starter selection
8. **QA with puppeteer** — visual verification of the full Paper Scoop sequence

## QA Validation

Use `/puppeteer` to verify this story in a real browser. Write a QA script that:

1. Launches the game, teleports to `spyder_paper_scoop`
2. Screenshots the initial NPC layout — verify 7 NPCs are positioned correctly
3. Waits for the intro dialog sequence to complete (advance through dialogs)
4. Tests the display cases — walk to each case tile, interact, verify journal opens showing the correct monster
5. Tests the monster choice — trigger `choice_monster`, select a starter, verify `myintrochoice` variable is set
6. Tests the confirm flow — select "No" on "Are you sure?", verify loops back to choice
7. Select "Yes", verify the exit choreography plays and player teleports to bedroom
8. Verify the chosen monster is in the player's party via `getState()`

## Acceptance Criteria

- [ ] Paper Scoop map loads and renders correctly with all tilesets
- [ ] All 7 NPCs spawn in correct positions during intro
- [ ] Intro dialog sequence plays through with correct text
- [ ] Player can be named (or given a random name)
- [ ] Display case interactions open journal for the correct monster
- [ ] Monster choice UI shows all 5 starters and stores selection in variable
- [ ] "Are you sure?" confirmation loops back on "No"
- [ ] Exit choreography: NPCs leave one by one, player teleports to bedroom
- [ ] Chosen starter monster is added to player's party
- [ ] `intro_scoop:done` variable is set after completion
- [ ] Return visits show shopkeeper in post-intro position, Dante wandering
- [ ] All code passes `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
- [ ] QA validation passes via `/puppeteer`
