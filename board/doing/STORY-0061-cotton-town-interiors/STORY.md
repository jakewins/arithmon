# STORY-0061: Cotton Town Interiors

## Goal

Implement the four missing interior buildings in `spyder_cotton_town`: Cotton Cafe, Cotton Art Shop, Cotton House 1, and Cotton House 2. This is a **clone** of upstream Tuxemon's spyder campaign — lean on the upstream source (`/home/jake/Code/third/tuxemon/mods/tuxemon/maps/`) whenever there are questions about how something should work, how to structure code/content, or what behavior to expect.

## Upstream Reference

- TMX maps: `/home/jake/Code/third/tuxemon/mods/tuxemon/maps/spyder_cotton_cafe.tmx`, `spyder_cotton_artshop.tmx`, `spyder_cotton_house1.tmx`, `spyder_cotton_house2.tmx`
- Dialogue translations: `/home/jake/Code/third/tuxemon/mods/tuxemon/l18n/en_US/LC_MESSAGES/base.po`
- NPC definitions: `/home/jake/Code/third/tuxemon/mods/tuxemon/db/npc/spyder_cotton_town_npcs.yaml`
- NPC sprites: `/home/jake/Code/third/tuxemon/mods/tuxemon/gfx/sprites/player/`

## Key Patterns

- **Map registration**: Add to `MAP_REGISTRY` in `src/game/data/maps.ts` with `inside: true`
- **Event preload**: Add `this.load.text("events-{name}", "assets/events/{name}.yaml")` in `src/game/scenes/OverworldScene.ts`
- **NPC registration**: Add entries in `src/game/data/npcs.ts` with `{ spritesheet: "..." }`
- **NPC parties** (for trainers only): Add to `src/game/data/npcParties.ts`
- **Event YAML format**: See `public/assets/events/spyder_cotton_scoop.yaml` for reference
- **Map export**: Export upstream TMX via Tiled (`tiled --export-map --embed-tilesets input.tmx output.json`), then post-process to decode base64/zlib tile data to integer arrays and fix image paths to just filenames. See existing maps for the expected JSON structure.

## Sprite Handling

Where upstream uses color variants (e.g. `granny_lapi`, `shopkeeper_brown`) that don't exist in our assets, use the base sprite name (e.g. `granny`, `shopkeeper`). Copy any fully missing base sprites from upstream (`/home/jake/Code/third/tuxemon/mods/tuxemon/gfx/sprites/player/`) into `public/assets/sprites/`.

Missing sprites to copy from upstream: `goth.png`, `barmaid.png`, `firefighter.png`, `catgirl.png`.

## Dialogue

Upstream uses `translated_dialog` with i18n keys. Many keys have empty translations in en_US. For our clone:
- Where upstream has a non-empty English translation, use inline `dialog` with that text.
- Where upstream has an empty translation, write reasonable placeholder dialogue that fits the character and context. Keep it brief and in-character.

## Workflow for each TODO

For every TODO below:
1. Implement the changes described
2. Use `/puppeteer` to QA — launch the game, teleport to the map, take screenshots, verify the map renders correctly and interactions work. Iterate until QA passes — if something looks wrong or doesn't work, fix it and re-test.
3. Run `npm run format:check && npm run lint && npx tsc --noEmit && npm test` and fix any issues
4. Commit the working result before moving to the next TODO

---

## Todos

### 1. ~~Add missing NPC sprites~~ DONE

Copy these sprites from upstream into `public/assets/sprites/`:
- `goth.png` from `/home/jake/Code/third/tuxemon/mods/tuxemon/gfx/sprites/player/goth.png`
- `barmaid.png` from `/home/jake/Code/third/tuxemon/mods/tuxemon/gfx/sprites/player/barmaid.png`
- `firefighter.png` from `/home/jake/Code/third/tuxemon/mods/tuxemon/gfx/sprites/player/firefighter.png`
- `catgirl.png` from `/home/jake/Code/third/tuxemon/mods/tuxemon/gfx/sprites/player/catgirl.png`

No code changes needed beyond copying the files — the sprite loader auto-discovers PNGs in that directory via `allNpcSpritesheets()`. Verify the spritesheet dimensions are 48x128 (3 columns x 4 rows of 16x32 frames) to match our existing format. If they differ, check how other upstream sprites were handled.

**QA**: Use `/puppeteer` to confirm sprites load without errors (spawn an NPC using one of the new sheets in a test).

### 2. ~~Cotton House 1 — map, events, NPCs~~ DONE

This is the simplest interior (10x8, 2 NPCs, 1 TV interaction).

**Map JSON**: Export `/home/jake/Code/third/tuxemon/mods/tuxemon/maps/spyder_cotton_house1.tmx` to `public/assets/maps/spyder_cotton_house1.json`. Tilesets: `[CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES]`.

**Register map** in `src/game/data/maps.ts`:
```ts
spyder_cotton_house1: {
  jsonKey: "map-spyder_cotton_house1",
  jsonPath: "assets/maps/spyder_cotton_house1.json",
  tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
  environment: "grass",
  inside: true,
},
```

**Register NPCs** in `src/game/data/npcs.ts`:
- `spyder_cottoncafe_juliana: { spritesheet: "homemaker" }` (may already exist — check first)
- `spyder_cottonhouse1_rodger: { spritesheet: "firefighter" }`

**Add event preload** in OverworldScene.ts.

**Create events** at `public/assets/events/spyder_cotton_house1.yaml` matching the upstream TMX structure:
- Music: `play_music music_cathedral_theme`
- Create Homemaker (spyder_cottoncafe_juliana) at (3,5), wandering
- Create Firefighter (spyder_cottonhouse1_rodger) at (7,2)
- Talk behaviors for both NPCs
- Watch TV interaction at tile (9,2) using `char_facing_tile` + `button_pressed INTERACT`
- Exit teleport at x=6-7, y=7, facing down → `spyder_cotton_town.tmx,27,27`

Use upstream dialogue where available; write reasonable placeholders for empty translations.

**QA**: Use `/puppeteer` to teleport to `spyder_cotton_house1`. Screenshot to confirm the interior renders. Walk to NPCs, interact, confirm dialogue appears. Walk to the exit, confirm teleport back to cotton town at (27,27).

### 3. ~~Cotton House 2 — map, events, NPCs (two exits)~~ DONE

Another simple interior (10x8, 3 NPCs) but with **two exit doors** — front and back.

**Map JSON**: Export `spyder_cotton_house2.tmx` to `public/assets/maps/spyder_cotton_house2.json`. Tilesets: `[CORE_INDOOR_WALLS, CORE_INDOOR_FLOORS, CORE_SET_PIECES, CORE_BUILDINGS]`. Note the tileset order differs from house1 (walls first, then floors) — match the TMX firstgid order.

**Register map** in `src/game/data/maps.ts`:
```ts
spyder_cotton_house2: {
  jsonKey: "map-spyder_cotton_house2",
  jsonPath: "assets/maps/spyder_cotton_house2.json",
  tilesets: [CORE_INDOOR_WALLS, CORE_INDOOR_FLOORS, CORE_SET_PIECES, CORE_BUILDINGS],
  environment: "grass",
  inside: true,
},
```

**Register NPCs** in `src/game/data/npcs.ts`:
- `spyder_cottonhouse2_neva: { spritesheet: "picnicker" }`
- `spyder_cottonhouse2_sidney: { spritesheet: "catgirl" }`
- `spyder_cottonhouse2_davis: { spritesheet: "shopkeeper" }`

**Add event preload** in OverworldScene.ts.

**Create events** at `public/assets/events/spyder_cotton_house2.yaml` matching upstream:
- Create Picnicker (neva) at (3,2), facing up
- Create Catgirl (sidney) at (0,6), facing up
- Create Shopkeeper (davis) at (9,3), facing left
- Talk behaviors for all 3 NPCs
- **Front exit** at x=6-7, y=7, facing down → `spyder_cotton_town.tmx,25,9`
- **Back exit** at x=5, y=1, facing up → `spyder_cotton_town.tmx,27,5`

**QA**: Use `/puppeteer` to teleport to `spyder_cotton_house2`. Screenshot to confirm interior renders. Test both exits — front door should land at (25,9) on cotton town, back door at (27,5). Interact with all 3 NPCs.

### 4. ~~Cotton Cafe — map and NPC spawns~~ DONE

The cafe is the most complex interior (12x12, 7 NPCs, healing, trainer battle, first-visit cutscene). Split across multiple todos. This first one sets up the map, music, NPC spawns, and basic dialogue.

**Map JSON**: Export `spyder_cotton_cafe.tmx` to `public/assets/maps/spyder_cotton_cafe.json`. Tilesets: `[CORE_SET_PIECES, CORE_OUTDOOR, CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS]` (match the TMX firstgid order).

**Register map** in `src/game/data/maps.ts`:
```ts
spyder_cotton_cafe: {
  jsonKey: "map-spyder_cotton_cafe",
  jsonPath: "assets/maps/spyder_cotton_cafe.json",
  tilesets: [CORE_SET_PIECES, CORE_OUTDOOR, CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS],
  environment: "grass",
  inside: true,
},
```

**Register NPCs** in `src/game/data/npcs.ts`:
- `spyder_cottontown_hacker: { spritesheet: "magician" }` (may already exist)
- `spyder_cottontown_barmaid: { spritesheet: "barmaid" }`
- `spyder_cottoncafe_lotus: { spritesheet: "granny" }`
- `spyder_cottoncafe_cayden: { spritesheet: "goth" }`
- `spyder_cottoncafe_wilford: { spritesheet: "shopassistant" }`
- `spyder_cottoncafe_hillary: { spritesheet: "florist" }`
- (spyder_cottoncafe_juliana should already be registered from house1)

**Add event preload** in OverworldScene.ts.

**Create initial events** at `public/assets/events/spyder_cotton_cafe.yaml` with:
- Music: `play_music music_cathedral_theme`
- NPC spawns matching upstream positions:
  - Hacker at (10,4)
  - Barmaid at (0,4) (use the post-introduction position)
  - Lotus (granny) at (3,7), facing right
  - Cayden (goth) at (2,6), wandering
  - Wilford (assistant) at (10,7)
  - Hillary (florist) at (11,6), facing left
  - Juliana (homemaker) at (8,9)
- Basic talk behaviors for all NPCs using upstream dialogue where available:
  - Hacker: "Ah, the Tuxepedia! Have you been cataloging your finds?"
  - Lotus: "Hmm, I'm not sure I fancy this coffee." (from upstream)
  - Wilford: "I come here every day. The atmosphere is just perfect for thinking."
  - Hillary: "Did you know flowers can help tuxemon recover faster? It's true!"
  - Juliana: "This cafe has the best pastries in town."
- Exit teleport at y=11 (tiles 7-9), facing down → `spyder_cotton_town.tmx,31,17`

Do NOT implement the first-visit cutscene, barmaid healing, or Cayden battle yet — those are separate todos.

**QA**: Use `/puppeteer` to teleport to `spyder_cotton_cafe`. Screenshot to verify the map renders with all NPCs visible. Walk around, interact with each NPC to confirm dialogue. Exit and confirm landing at (31,17) on cotton town.

### 5. ~~Cotton Cafe — barmaid healing~~ DONE

Add the barmaid healing interaction, matching upstream's flow:
- Player talks to barmaid → "Welcome back. Shall I chuck your tuxemon in the healing unit?" (from upstream) → yes/no choice
- If yes: heal all monsters (`set_monster_health`, `set_monster_status`), set faint teleport to cafe (`set_teleport_faint player,spyder_cotton_cafe.tmx,1,10`), show confirmation dialogue ("Okay! Just give me a second and I'll heal your Tuxemon!" — from upstream)
- If no: dismiss

Use the upstream event structure as reference (objects #19, #27, #26 in the TMX). The barmaid is at (0,4). The healing interaction uses `char_facing_tile` + `button_pressed INTERACT` at the counter tile facing up toward the barmaid.

**QA**: Use `/puppeteer` to teleport to the cafe with a damaged monster party. Interact with the barmaid, choose yes, confirm monsters are healed. Screenshot the dialogue sequence.

### 6. Cotton Cafe — Cayden trainer battle

Add the optional trainer battle with Cayden:
- Player talks to Cayden → "Do you want a quick battle?" (from upstream) → yes/no choice via `translated_dialog_choice`
- If yes (variable `cafebattle:yes`): battle triggers with Capiti (level 4) and Tweesher (level 4)
- After winning: Cayden says "Don't look at me. I'm just here for the free canapes and heals." (from upstream)
- Battle only offered if player hasn't already won

**Register trainer party** in `src/game/data/npcParties.ts`:
```ts
spyder_cottoncafe_cayden: {
  name: "Cayden",
  monsters: [
    { slug: "capiti", level: 4 },
    { slug: "tweesher", level: 4 },
  ],
  goldReward: 100,
},
```

**Update cafe events** to add:
- "Ask Battle Cayden" event: `behav: talk spyder_cottoncafe_cayden`, condition `not battle_outcome player,spyder_cottoncafe_cayden,won` → dialog "Do you want a quick battle?" + choice `yes:no,cafebattle`
- "Battle Cayden" event: condition `is variable_set cafebattle:yes` + `not battle_outcome ...won` → `start_battle spyder_cottoncafe_cayden`
- "Cayden Post-Win" event: `behav: talk spyder_cottoncafe_cayden`, condition `is battle_outcome player,spyder_cottoncafe_cayden,won` → "Don't look at me. I'm just here for the free canapes and heals."

**QA**: Use `/puppeteer` to teleport to the cafe. Talk to Cayden, accept the battle. Confirm combat starts with Capiti and Tweesher. Win the battle, talk to Cayden again, confirm post-win dialogue appears instead of battle offer. Screenshot each step.

### 7. Cotton Cafe — first-visit cutscene (simplified)

Implement a simplified version of the upstream "First Visit to Cotton Cafe" cutscene (object #20 in TMX). The upstream version is a long sequence involving the Hacker introducing Tuxepedia. Simplify to:

- On first visit (condition: `not variable_set visitedcottoncafe:yes`), triggered by talking to the hacker:
  - Lock controls
  - Hacker walks to center, faces player
  - Dialogue: "Good to see you. You're just in time." (from upstream)
  - Dialogue: "Ahem." (from upstream)
  - Dialogue explaining the Tuxepedia (write 1-2 sentences: "I've been working on something called the Tuxepedia. It catalogs every tuxemon species we've discovered. Here — take a copy.")
  - Give player `app_tuxepedia` item (if this item exists in our system — check first; if not, skip the item grant)
  - Set variable `visitedcottoncafe:yes`
  - Unlock controls

- After first visit, the Hacker has different dialogue. Use the `visitedcottoncafe:yes` variable to gate the talk behaviors added in TODO 4 (add the condition to the existing Hacker talk event).

**QA**: Use `/puppeteer` to teleport to the cafe WITHOUT `visitedcottoncafe:yes` set. Trigger the cutscene by talking to the hacker. Confirm the sequence plays out. Take a screenshot during the cutscene dialogue. Then confirm that subsequent visits show normal NPC dialogue (not the cutscene again).

### 8. Cotton Art Shop — map, NPCs, exit, and entry fee

The art shop (22x11) has an entry fee mechanic and art sales.

**Map JSON**: Export `spyder_cotton_artshop.tmx` to `public/assets/maps/spyder_cotton_artshop.json`. Tilesets: `[CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES]` (match TMX firstgid order).

**Register map** in `src/game/data/maps.ts`:
```ts
spyder_cotton_artshop: {
  jsonKey: "map-spyder_cotton_artshop",
  jsonPath: "assets/maps/spyder_cotton_artshop.json",
  tilesets: [CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES],
  environment: "grass",
  inside: true,
},
```

**Register NPCs** in `src/game/data/npcs.ts`:
- `spyder_cottonartshop_luvinia: { spritesheet: "florist" }`
- `spyder_cottonartshop_philis: { spritesheet: "granny" }`
- `spyder_cottonartshop_phoenix: { spritesheet: "goth" }`
- `spyder_cottonartshop_carter: { spritesheet: "shopkeeper" }`
- (barmaid should already be registered from cafe)

**Add event preload** in OverworldScene.ts.

**Create events** at `public/assets/events/spyder_cotton_artshop.yaml`:
- Music: `play_music music_cathedral_theme`
- NPC spawns matching upstream:
  - Barmaid (spyder_cottontown_barmaid) at (10,5), wandering
  - Luvinia (florist) at (1,6), wandering
  - Philis (granny) at (15,8), wandering
  - Phoenix (goth) at (17,8), wandering
  - Carter (shopkeeper) at (4,9), facing left
- Basic talk behaviors for all NPCs (use placeholder dialogue for empty upstream translations)
- Exit teleport at y=10 (tiles 1-2), facing down → `spyder_cotton_town.tmx,16,17`
- **Entry fee**: Upstream has a gate at x=0-2, y=9 facing up that triggers a 50-gold fee dialog + choice. If player pays and can afford it, pathfind them into the gallery and deduct 50 gold (`modify_money player,-50`). If they can't afford or decline, pathfind them to the exit area. Implement this using the upstream event structure (objects #29, #30, #20, #31 in the TMX).

**QA**: Use `/puppeteer` to teleport to the art shop. Confirm NPCs spawn, map renders. Test the entry fee — with enough money, confirm 50 is deducted and player moves into gallery. With insufficient money, confirm player is turned away. Test exit teleport. Screenshot the gallery interior.

### 9. Cotton Art Shop — painting sales

Add the painting purchase system matching upstream (objects #36-42 in TMX):

- Three paintings displayed as NPCs (p_one, p_two, p_three) at positions (7,2), (9,2), (11,2) — only shown if player doesn't already own them
- Player interacts with painting tile → description + "Do you want to buy this painting for 1000?" (from upstream) → yes/no choice
- On purchase: add item, deduct 1000 gold, remove painting NPC, set tracking variable
- Bundle offer from barmaid: if player has >= 3000 gold and owns none, offer all three for 3000
- After all purchased: barmaid has "sold out" dialogue

Items to add (if not in item registry): `p_starry_night`, `p_monsters_eyes`, `p_trepidation`. These are decorative/collectible items — check if the item system supports them; if a new category is needed, add a minimal "collectible" or "key_item" type.

**QA**: Use `/puppeteer` to teleport to the art shop with sufficient gold. Buy a painting, confirm money deducted and painting NPC disappears. Screenshot the purchase dialogue. Confirm the painting item appears in inventory.

### 10. Integration test — full walkthrough

Walk the player from `spyder_cotton_town` into each of the four new buildings via their front doors (not teleport cheats). Verify:
- Door entry teleports work from cotton town into each interior
- Each interior renders correctly with no tile glitches
- Exit teleports return to the correct cotton town coordinates
- All NPC interactions work
- Cayden battle functions correctly
- Art shop entry fee and purchases work

**QA**: Use `/puppeteer` with `setupGame(page, { map: "spyder_cotton_town", tileX: 27, tileY: 26 })`. Walk to house1 door at (27,27), enter, interact with NPCs, exit. Then walk to house2 door at (25,9), enter, test both exits. Walk to cafe door at (31,17), enter, test healing + battle. Walk to art shop door at (16,17), enter, test fee + purchases. Screenshot each building interior.

## Acceptance Criteria

- [ ] All four interior maps render correctly with proper tiles and no visual glitches
- [ ] All NPC sprites load (goth, barmaid, firefighter, catgirl + existing ones)
- [ ] Door entries from cotton_town teleport into correct interiors
- [ ] All exit teleports return to correct cotton_town coordinates
- [ ] Cotton House 1: 2 NPCs talkable, TV interaction works
- [ ] Cotton House 2: 3 NPCs talkable, both exits work
- [ ] Cotton Cafe: all 7 NPCs present, barmaid heals, Cayden battle works, first-visit cutscene fires once
- [ ] Cotton Art Shop: entry fee charged, paintings purchasable, NPCs talkable
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` passes
