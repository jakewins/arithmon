# STORY-0225: Align the Cotton Town store ("scoop") with upstream

## Description

The user noticed that the Cotton Town store (`spyder_cotton_scoop`) doesn't match upstream Tuxemon's. After a full audit (map, NPCs, shop inventory, events, dialog), the divergence is significant: our version is roughly a "paper scoop with the slugs renamed". This story does a verbatim port of `upstream/mods/tuxemon/maps/spyder_cotton_scoop.tmx` and its surrounding wiring — correct shopkeeper/assistant NPC slugs, correct prices, the missing `Receive capture device` tuxeball-tutorial cutscene, the missing `Open Shop` interact events, **and the missing second `spyder_wayfarer1_norm` NPC who runs a separate evolution-and-TM "tech shop"**.

The tech shop introduces engine-side gaps (item-triggered monster evolution from inventory; TM-style move learning). Those are split out as a separate follow-up story so this one stays bounded; in this story the tech NPC spawns, his shop opens, and his items appear in the shop UI, but **using `tm_*` and morph items will gracefully no-op** (the items already exist in upstream's data and we'll port their item rows with stub effects). See `### Out of scope` and `### Follow-up stories`.

After this story lands: the player enters cotton scoop, sees a shopkeeper at `(1, 6)`, a shop assistant at `(7, 7)`, and a tech-shop NPC at `(1, 4)`. Talking/walking-onto the counter tiles opens the appropriate shop with the upstream prices. Walking up to the counter for the first time triggers the upstream `Receive capture device` cutscene (offers free tuxeballs after a yes/no choice). All upstream events that don't depend on missing systems are ported; tech-shop items are purchasable but their on-use effects are stubbed (see Out of scope).

## Context

### Upstream reference

- **Map:** `upstream/mods/tuxemon/maps/spyder_cotton_scoop.tmx` — `13×11`, `tilewidth=16`. **Four** tilesets:
  - `core_city_and_country.tsx` firstgid `1`
  - `core_indoor_floors.tsx` firstgid `1441`
  - `core_indoor_walls.tsx` firstgid `5305`
  - `core_set pieces.tsx` firstgid `9169`
  - **Map properties:** `edges=clamped`, `inside=true`, `map_type=shop`, `scenario=spyder`, `slug=cotton_scoop`.
  - **Tile layers (4):** `Layer 1`, `Layer 2`, `Layer 3`, `Above Player` (note: this map uses `Layer N` naming, not `Tile Layer N`; same layer-naming gotcha as STORY-0217).
  - **Collisions (8 rects)** in objectgroup `Collisions` (id 4): rects at pixel coords (32,48 16x80), (48,32 16x16), (64,48 144x16), (0,112 32x16), (0,160 16x16), (64,96 64x16), (144,96 48x16), (160,128 32x32). Mechanical pixel→tile (`/16`).
- **Economy:** `upstream/mods/tuxemon/db/economy/spyder_scoops.yaml` (the spyder-campaign economy file holding all scoops). Relevant entries:
  - `spyder_cotton_scoop`: `potion` price 20 / cost 5, `revive` price 100 / cost 20, `tuxeball` price 50 / cost 10. `resale_multiplier: 0.5`. `monsters: []`.
  - `spyder_cotton_tech`: `miaow_milk` 2000, `pyramidion` 2000, `ox_stick` 2000, `tm_avalanche` 2000 (inventory 1), `tm_blossom` 1000 (inventory 1). `resale_multiplier: 0.5`. `monsters: []`.
- **NPCs:** `upstream/mods/tuxemon/db/npc/spyder_cotton_town_npcs.yaml` declares `spyder_shopkeeper` (template `shopkeeper`) — already used by the paper scoop intro too — and `spyder_shopassistant` is declared in several other npc yaml files. The tech-shop NPC is `spyder_wayfarer1_norm` (sprite `shopkeeper_brown`), declared in `upstream/mods/tuxemon/db/npc/spyder_wayfarer_npcs.yaml`.
- **Items used by the tech shop** — `upstream/mods/tuxemon/db/item/{miaow_milk,ox_stick,pyramidion,tm_avalanche,tm_blossom}.yaml`. `miaow_milk` / `ox_stick` / `pyramidion` are evolution morph items (`category: morph`, `effects: [{type: evolve}]`). `tm_avalanche` and `tm_blossom` are TMs (`category: technique`, `effects: [{type: learn_tm, parameters: [<tech_slug>]}]`).
- **All 11 events on upstream's TMX**, summarized by name (verbatim port targets):
  1. `Teleport to Cotton Town` at tile `(5–6, 10)` — `transition_teleport player,spyder_cotton_town.tmx,30,35,0.3` + `char_face player,down`. Conds: `is char_at player`, `is char_facing player,down`.
  2. `Create Shopkeeper` (one-shot, no tile) — `create_npc spyder_shopkeeper,1,6` + `char_face spyder_shopkeeper,right` + `set_economy spyder_shopkeeper,spyder_cotton_scoop`. Cond: `not char_exists spyder_shopkeeper`.
  3. `Create Assistant` (one-shot) — `create_npc spyder_shopassistant,7,7`. Cond: `not char_exists spyder_shopassistant`.
  4. `Assistant Talk` (talk behav) — `translated_dialog spyder_cottonscoop_shopassistant`. Behav: `talk spyder_shopassistant`. Cond: `is variable_set visitcottonmart:yes`.
  5. `Devices, no explain` (one-shot triggered by `heardcapture:yes`) — pathfinds the shopkeeper back to `(1, 6)`, gives 5 free tuxeballs, shows the `tuxeball` get-dialog, clears `heardcapture`. Cond: `is variable_set heardcapture:yes`.
  6. `Devices, explain` at `(2, 3)` — fires when player declines (`heardcapture:no`); locks player, shows the explanation dialog, pathfinds player toward the shopassistant, both characters face each other, shows the second explanation dialog, gives 5 free tuxeballs + get-dialog, clears `heardcapture`. Cond: `is variable_set heardcapture:no`.
  7. `Receive capture device` at rect `(0–12, 8)` (the counter row) — fires when player first walks up to the counter (`is char_at player` + `not variable_set visitcottonmart:yes`): locks controls, faces shopkeeper down, shows `spyder_cottonscoop_deviceoffer`, prompts `translated_dialog_choice yes:no,heardcapture`, sets `visitcottonmart:yes`, unlocks controls. Then events #5 or #6 fire on the next tick depending on the choice.
  8. `Route Music` at `(0, 0)` — `play_music music_cathedral_theme`. Cond: `not music_playing music_cathedral_theme`. (Same as our current map.)
  9. `Open Shop` at tile `(2, 6)` (the front-of-counter tile facing left) — interact-press: `char_face spyder_shopkeeper,right`, `translated_dialog spyder_scoop_welcome`, `open_shop spyder_shopkeeper,both_item`. Conds: `is char_facing_tile player` + `is button_pressed INTERACT`.
  10. `Open Shop` at tile `(1, 7)` (below counter, facing up) — same but `char_face spyder_shopkeeper,down`. Same conds.
  11. `Create Tech Shop` (one-shot) — `create_npc spyder_wayfarer1_norm,1,4` + `char_face spyder_wayfarer1_norm,right` + `set_economy spyder_wayfarer1_norm,spyder_cotton_tech`. Cond: `not char_exists spyder_wayfarer1_norm`.
  12. `Open Tech` at tile `(2, 4)` — interact-press: face wayfarer right, show `spyder_scoop_welcome`, `open_shop spyder_wayfarer1_norm,both_item`.

  (Two `Open Shop` events both target the shopkeeper; same name in TMX — disambiguate as `Open Shop A` / `Open Shop B` in YAML, matching our existing convention.)

- **Dialog msgids** the events reference, with English msgstrs from `upstream/mods/tuxemon/l18n/en_US/LC_MESSAGES/base.po`:
  - `spyder_scoop_welcome` → `"Welcome!"`
  - `tuxeball` → `"Tuxeball"` (used as the get-item header)
  - `spyder_cottonscoop_deviceexplan` → `"Let my assistant introduce you."`
  - `spyder_cottonscoop_shopassistant` → empty in upstream
  - `spyder_cottonscoop_deviceoffer` → empty
  - `spyder_cottonscoop_devicenoexplan` → empty
  - `spyder_cottonscoop_deviceexplan2` → empty
  - Per STORY-0061 dialog policy: where upstream has a non-empty translation, use it verbatim via inline `dialog`; where upstream's translation is empty, write a short reasonable placeholder in-character (see suggested text in step 4).

### Current state in our codebase

- `public/assets/maps/spyder_cotton_scoop.json` — **exists but is mostly wrong**: 13×11 dimensions are correct, but the tileset firstgid scheme doesn't match upstream (we use `core_indoor_floors`@1 / `core_indoor_walls`@3865 / `core_set_pieces`@7729 — three tilesets — while upstream uses **four** with `core_city_and_country`@1 as the first one). The tile IDs in our layers (e.g. 962, 1008, 1054, 3922 in Layer 1) decode to **different tiles** than upstream (which is mostly floor tile 6404/6450/6496/2609). The layout is not upstream's. **Re-export** the TMX to JSON; replace the file.
- `public/assets/events/spyder_cotton_scoop.yaml` — **exists but is fabricated** (6 events; lines 1–50): two made-up NPC slugs `spyder_cotton_scoop_keeper` and `spyder_cotton_scoop_assistant`, hard-coded inline-`dialog` greetings, no tuxeball-tutorial cutscene, no `Open Shop` events (talking to "keeper" opens the shop via a `talk` behav — close-but-wrong vs upstream's tile-based interact), no tech NPC. **Replace it** with the verbatim port described in step 4.
- `src/game/data/shops.ts` — `spyder_cotton_scoop` is registered but **prices are wrong**: `potion 50, tuxeball 100, revive 100`. **Should be `potion 20, tuxeball 50, revive 100`** (match upstream `spyder_scoops.yaml` exactly; cost field is engine-internal sell price hint and we currently use a fixed `sellMultiplier: 0.5` which already matches upstream's `resale_multiplier: 0.5`). Also **add `spyder_cotton_tech`** with the five upstream items.
- `src/game/data/npcs.ts` — `spyder_shopkeeper` (line 37), `spyder_shopassistant` (line 356), and `spyder_wayfarer1_norm` (line 401, sprite `shopkeeper_brown`) are **already registered**. The made-up `spyder_cotton_scoop_keeper` / `spyder_cotton_scoop_assistant` entries (lines 57–58) are **dead and should be removed** as part of this story (no other yaml references them after the new events YAML replaces the old).
- `src/game/data/items.ts` — `potion`, `tuxeball`, `revive` exist. **Missing the five tech-shop items: `miaow_milk`, `pyramidion`, `ox_stick`, `tm_avalanche`, `tm_blossom`.** Add them with placeholder effect arrays (see step 5).
- `src/game/event/actions/openShop.ts` — Our action takes `<economy_slug>` directly; upstream takes `<npc_slug>,both_item` and looks up the economy attached to the NPC via `set_economy`. **Extend `open_shop` to accept upstream's `<npc_slug>,both_item` form** while still accepting the old single-arg form for back-compat (paper scoop uses neither today — only the new cotton scoop yaml needs the new form). See step 7.
- `src/game/data/maps.ts` — `spyder_cotton_scoop` entry already exists. **Tileset list will need a 4th tileset: `CORE_CITY_AND_COUNTRY`** (already used by `spyder_cotton_town` etc., so the constant exists). Order must match upstream's firstgid order: `[CORE_CITY_AND_COUNTRY, CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES]`. Confirm `CORE_CITY_AND_COUNTRY` is imported in `maps.ts`.
- `src/game/scenes/OverworldScene.ts` — already preloads `events-spyder_cotton_scoop` (no change needed; the events file path is unchanged).
- `public/assets/events/spyder_cotton_town.yaml` — has the matching `Go Scoop` teleport at `(30, 35)` → `spyder_cotton_scoop.tmx,6,9` (or similar — verify). The pair with this story's new map (`spyder_cotton_scoop` `(5–6, 10)` → `spyder_cotton_town,30,35`) needs to round-trip; verify and journal any mismatch.

### Template stories

- **STORY-0061** (`board/done/STORY-0061-cotton-town-interiors`) — same pattern for cotton's cafe/artshop/house interiors. Same dialog-policy (upstream-english-where-available, placeholder-in-character-where-empty), same map registration recipe, same event YAML structure.
- **STORY-0217** (`board/done/STORY-0217-cotton-town-east-road-content`) — same TMX → JSON export recipe and the same layer-naming gotcha (`Layer N` vs `Tile Layer N`).

## What to build

Order the steps so each chunk can be committed (and journaled if it bounces). 1–4 are content port. 5–7 are engine support for the tech shop (small surface area). 8 is QA + acceptance.

1. **Re-export the map JSON from upstream's TMX.**
   - Open `upstream/mods/tuxemon/maps/spyder_cotton_scoop.tmx` in Tiled (devenv ships `tiled`); export as JSON. Overwrite `public/assets/maps/spyder_cotton_scoop.json`. Strip the `core_*.tsx` source paths so each tileset entry just references the image filename.
   - 13×11; 4 tilesets in firstgid order (`core_city_and_country`@1, `core_indoor_floors`@1441, `core_indoor_walls`@5305, `core_set pieces`@9169); 4 tile layers (`Layer 1`, `Layer 2`, `Layer 3`, `Above Player`); 1 collision objectgroup with all 8 rects from upstream. Map properties verbatim.
   - **Do not include the event objects** in the JSON — events live in YAML. Strip the `<objectgroup name="Events">` block during export (paste-replace the file rather than letting Tiled embed events).
   - Same `Layer N` naming caveat as STORY-0217: if our engine's `OverworldScene` only reads `Tile Layer N` names, either rename in the JSON to match the engine (acceptable; we aren't aiming for byte-equality with the TMX) **or** broaden the engine's tolerated layer names. Use judgement and journal the choice.

2. **Update `src/game/data/maps.ts` tileset list.**
   - The `spyder_cotton_scoop` entry's `tilesets:` should be `[CORE_CITY_AND_COUNTRY, CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES]` in that exact order (matches upstream firstgid order).
   - Verify `CORE_CITY_AND_COUNTRY` is already imported at the top of the file (it's used by `spyder_paper_town`/`spyder_cotton_town`, so should be there).
   - Keep `environment: "grass"`, `inside: true`, `locationType: "shop"`.

3. **Fix the shop registry (`src/game/data/shops.ts`).**
   - Change `spyder_cotton_scoop` prices to match upstream `spyder_scoops.yaml`: `potion 20, revive 100, tuxeball 50`. Keep `sellMultiplier: 0.5`. (Note the item order matches upstream's YAML order.)
   - Add a new entry `spyder_cotton_tech` with: `miaow_milk 2000, pyramidion 2000, ox_stick 2000, tm_avalanche 2000, tm_blossom 1000`. `sellMultiplier: 0.5`. (We don't currently model per-item `inventory` limits; if not modeled, ignore the upstream `inventory: 1` cap and let the player buy unlimited — track this as a known divergence in the commit message.)

4. **Replace the events YAML.**
   - Overwrite `public/assets/events/spyder_cotton_scoop.yaml`. Existing fabricated content is discarded.
   - The 11 events (using the upstream object names; disambiguate the two `Open Shop` events as `Open Shop A` / `Open Shop B`):

     a. `Play Music` (no tile) — cond `not music_playing music_cathedral_theme`; act `play_music music_cathedral_theme`.

     b. `Create Shopkeeper` (no tile) — cond `not char_exists spyder_shopkeeper`; acts `create_npc spyder_shopkeeper,1,6`, `char_face spyder_shopkeeper,right`, `set_economy spyder_shopkeeper,spyder_cotton_scoop`.

     c. `Create Assistant` (no tile) — cond `not char_exists spyder_shopassistant`; act `create_npc spyder_shopassistant,7,7`.

     d. `Create Tech Shop` (no tile) — cond `not char_exists spyder_wayfarer1_norm`; acts `create_npc spyder_wayfarer1_norm,1,4`, `char_face spyder_wayfarer1_norm,right`, `set_economy spyder_wayfarer1_norm,spyder_cotton_tech`.

     e. `Open Shop A` at `(2, 6)` — conds `is char_facing_tile player`, `is button_pressed INTERACT`; acts `char_face spyder_shopkeeper,right`, `dialog Welcome!`, `open_shop spyder_shopkeeper,both_item`.

     f. `Open Shop B` at `(1, 7)` — same conds; acts `char_face spyder_shopkeeper,down`, `dialog Welcome!`, `open_shop spyder_shopkeeper,both_item`.

     g. `Open Tech` at `(2, 4)` — same conds; acts `char_face spyder_wayfarer1_norm,right`, `dialog Welcome!`, `open_shop spyder_wayfarer1_norm,both_item`.

     h. `Receive capture device` rect `x: 0, y: 8, width: 13, height: 1` — conds `is char_at player`, `not variable_set visitcottonmart:yes`; acts `char_stop player`, `lock_controls`, `char_face spyder_shopkeeper,down`, `dialog Here at Cotton Scoop, every adventurer needs a few capture devices. Want me to walk you through how they work?` (placeholder for empty upstream msgid), `translated_dialog_choice yes:no,heardcapture`, `set_variable visitcottonmart:yes`, `unlock_controls`.

     i. `Devices, no explain` (no tile, fires on variable) — cond `is variable_set heardcapture:yes`; acts `pathfind spyder_shopkeeper,1,6`, `clear_variable heardcapture`, `add_item tuxeball`, `add_item tuxeball`, `add_item tuxeball`, `add_item tuxeball`, `add_item tuxeball`, `dialog Got 5 Tuxeballs!` (placeholder for the `tuxeball` get-item header).

     j. `Devices, explain` at `(2, 3)` — cond `is variable_set heardcapture:no`; acts `char_stop player`, `dialog Let my assistant introduce you.` (verbatim upstream msgstr for `spyder_cottonscoop_deviceexplan`), `pathfind_to_char player,spyder_shopassistant`, `char_face spyder_shopassistant,player`, `char_face player,spyder_shopassistant`, `dialog A Tuxeball is a capture device. Throw it at a weakened wild Tuxemon to bring them onto your team!` (placeholder for `spyder_cottonscoop_deviceexplan2`), `add_item tuxeball`, `add_item tuxeball`, `add_item tuxeball`, `add_item tuxeball`, `add_item tuxeball`, `dialog Got 5 Tuxeballs!`, `clear_variable heardcapture`.

     k. `Assistant Talk` (talk behav) — cond `is variable_set visitcottonmart:yes`; behav `talk spyder_shopassistant`; act `dialog Welcome back! The boss runs a tight ship here.` (placeholder for empty `spyder_cottonscoop_shopassistant`).

     l. `Go Outside` at `(5, 10)` and `(6, 10)` — conds `is char_at player`, `is char_facing player,down`; acts `transition_teleport player,spyder_cotton_town.tmx,30,35,0.3`, `char_face player,down`. (Upstream uses one rect spanning `(5–6, 10)`; either two events or one event with `width: 2` works — match our existing convention; `spyder_paper_scoop.yaml`'s `Go Outside` is a single tile, so prefer two events `Go Outside A` / `Go Outside B` or one event with explicit width — judgement.)

   - For every dialog where upstream's en_US msgstr is empty, write a short in-character placeholder consistent with STORY-0061's voice. Don't pull invented lore.

5. **Add the 5 tech-shop items to `src/game/data/items.ts`.**
   - `miaow_milk`, `pyramidion`, `ox_stick` — category `"other"` (we don't have a `morph` category and adding one is out of scope; flag as a known divergence). `description` taken from upstream item file's slug (or a sentence each like "An evolution item for a specific monster line."). `buyPrice` matches the upstream cost (`miaow_milk: 2000`, etc. — or use the upstream `price` not `cost`). `usableIn: []`, `effects: []`. The items will appear in the shop and inventory but using them will be a no-op — this is intentional for this story; the evolve effect is the follow-up.
   - `tm_avalanche`, `tm_blossom` — same treatment; category `"other"`, `effects: []`. `buyPrice: 2000` and `1000` respectively (matching upstream `price`).
   - Confirm no new sprite assets are needed (we can reuse `item/potion` placeholder sprite if upstream PNGs aren't copied; the engine doesn't crash on a missing sprite key in our current renderer — verify; if it does, copy the 5 PNGs from `upstream/mods/tuxemon/mods/tuxemon/gfx/items/` into `public/assets/sprites/items/` and reference them).

6. **Remove dead NPC registry entries.**
   - `src/game/data/npcs.ts:57-58`: delete `spyder_cotton_scoop_keeper` and `spyder_cotton_scoop_assistant`. Grep the rest of the repo first to confirm nothing else references them (the only reference today is `public/assets/events/spyder_cotton_scoop.yaml`, which step 4 rewrites).

7. **Extend `open_shop` to accept the upstream `<npc_slug>,both_item` form.**
   - `src/game/event/actions/openShop.ts` — when `args[0]` is followed by `args[1] === "both_item"` (or any non-empty second arg), treat `args[0]` as an NPC slug and look up the economy via the `economy_<slug>` variable (set by `set_economy`). Otherwise, treat `args[0]` as an economy slug directly (current behavior — back-compat with the older inline-economy call).
   - `set_economy.ts` already writes `economy_<slug>` into the variable store; this is purely a read on the other side.
   - Add 1–2 unit tests under `src/__tests__/event-engine.test.ts` for both forms (single-arg economy slug and `<npc>,both_item` lookup via variables).
   - **Note:** the second-arg `both_item` is the upstream "shop both items and monsters" flag. We don't support monster-vendor shops yet (`monsters: []` in all cotton/paper economies anyway), so accept the arg and ignore it for now. Journal this as a known stub.

8. **QA + acceptance** — see ## QA Validation below.

## Engine-side considerations

- **Layer-naming gotcha** (same as STORY-0217): upstream's `spyder_cotton_scoop.tmx` uses `Layer 1..3` + `Above Player`. If `OverworldScene` only recognizes `Tile Layer N`, either rename in the JSON or broaden the engine's lookup. Use judgement.
- **`set_economy` precedes `open_shop`**: the upstream pattern is to `set_economy <npc>,<economy>` once at NPC creation (event `Create Shopkeeper` and `Create Tech Shop` in step 4) and then `open_shop <npc>,both_item` at interact time. Our `set_economy` action already stores `economy_<slug>` in variables; step 7's `open_shop` rework reads from there. **Order matters:** `Create Shopkeeper` must fire before any `Open Shop` event the first time the player enters the map. The condition `not char_exists spyder_shopkeeper` on `Create Shopkeeper` is one-shot, so this self-resolves on map load.
- **`pathfind_to_char player,spyder_shopassistant`**: confirm this action exists (`src/game/event/actions/pathfindToChar.ts` — yes, present). The path is 4 tiles; should complete in well under 2s.
- **`char_face spyder_shopassistant,player`** and `char_face player,spyder_shopassistant`: face-by-character-name form. Confirm `charFace.ts` supports the second-arg-is-char-slug case (look for the `player` and `<other-slug>` branches there); if it only supports `up/down/left/right` literals, the implementor must add the character-target branch (small extension; copy the pattern from upstream's `char_face`).
- **`clear_variable heardcapture`**: action exists (`clearVariable.ts`). Upstream uses `set_variable heardcapture:null` which is the same effect.
- **`add_item tuxeball` × 5**: the `add_item` action takes one item slug; five repeats give the player five tuxeballs. Confirm our `add_item` action handles being called five times in one event (it should; it's idempotent on the inventory module). Alternative: extend `add_item` to take an optional quantity arg `add_item tuxeball,5` to match upstream — out of scope unless it's already trivial.
- **`dialog Got 5 Tuxeballs!`** vs upstream's `translated_dialog tuxeball,,center,center,center`: upstream uses a centered get-item dialog with the item name as msgid. We don't have that flourish; a plain `dialog` is acceptable and matches STORY-0061's policy.
- **Items with `effects: []` are inert when used.** This means `tm_blossom` and `miaow_milk` in the player's bag will be selectable in the inventory UI but pressing "Use" will do nothing visible. Acceptable for this story; flagged as out-of-scope follow-up. **Sanity-check** that our inventory UI doesn't crash when "using" an empty-effects item.
- **Map round-trip with cotton_town**: confirm `spyder_cotton_town.yaml` has a `Go Scoop` (or similarly named) event at `(30, 35)` teleporting to `spyder_cotton_scoop.tmx,5,9` or `6,9` (one tile above the inside-exit-rect). If it lands somewhere else, that's a pre-existing-bug; fix it in-flight as a one-line YAML patch and journal.

## QA Validation

Write a puppeteer script: `qa/cotton-scoop-align.ts`. Goal: confirm the new content, prices, NPCs, cutscene, and tech shop all work, end-to-end.

1. **NPC spawns on map load.**
   - `await setupGame(page, { map: "spyder_cotton_scoop", tileX: 6, tileY: 9 })`. The player lands just inside the front door.
   - Wait for `npc_spawned` events for `spyder_shopkeeper`, `spyder_shopassistant`, `spyder_wayfarer1_norm`. Assert all three are at `(1,6)`, `(7,7)`, `(1,4)` respectively.
   - Screenshot `qa/screenshots/cotton-scoop-overview.png` — reviewer confirms all three NPCs visible at the right positions, map renders coherently (no garbled tiles, counter top row, shop floor).

2. **`Receive capture device` first-visit cutscene (yes path).**
   - From `(6, 9)`, walk north into the counter row `y=8`. Assert `Receive capture device` fires: dialog appears, choice `yes:no,heardcapture` is shown.
   - Press `1` (yes) via `await page.evaluate(() => window.A.selectChoice(0))`. Confirm `Devices, no explain` fires: shopkeeper pathfinds to `(1, 6)`, 5 tuxeballs are added to inventory, "Got 5 Tuxeballs!" dialog appears.
   - Assert `session.variables.visitcottonmart === "yes"` and `heardcapture` is unset.
   - Assert `session.player.inventory` has `tuxeball` count `>= 5`.
   - Screenshot `qa/screenshots/cotton-scoop-tuxeball-gift.png` mid-dialog.

3. **`Receive capture device` first-visit cutscene (no path).**
   - Fresh `setupGame` with the variable state reset (don't carry `visitcottonmart`/`heardcapture` from the previous run — `setupGame` should start fresh by default).
   - Walk into the counter row. Press `2` (no). Confirm `Devices, explain` fires: dialog "Let my assistant introduce you." appears, player pathfinds to the assistant at `(7, 7)`, both face each other, second dialog appears, 5 tuxeballs are added.
   - Screenshot `qa/screenshots/cotton-scoop-assistant-explain.png`.

4. **Shop interact at the front counter (Open Shop A).**
   - Reset `visitcottonmart:yes` so the cutscene doesn't re-fire. Position player at `(2, 7)` facing up (one tile in front of `(2, 6)`). Press INTERACT via `await page.evaluate(() => window.A.setInteract())`.
   - Confirm `ShopScene` launches. Assert the shop has 3 items in the listed order: Potion (20G), Revive (100G), Tuxeball (50G). (Note the order — upstream lists `potion, revive, tuxeball`; our ShopScene displays in registry order.)
   - Buy a potion. Assert money decreases by 20 and inventory gains a potion.
   - Close shop. Player should be back in the overworld at `(2, 7)`.
   - Screenshot `qa/screenshots/cotton-scoop-shop-open.png`.

5. **Shop interact at the side counter (Open Shop B).**
   - Walk to `(1, 8)` facing up (front of `(1, 7)`). Press INTERACT.
   - Same ShopScene opens. Quick sanity check (no need to re-buy).

6. **Tech shop interact (Open Tech).**
   - Walk to `(2, 5)` facing up (front of `(2, 4)`). Press INTERACT.
   - Confirm `ShopScene` launches with the **tech inventory**: Miaow Milk (2000G), Pyramidion (2000G), Ox Stick (2000G), TM Avalanche (2000G), TM Blossom (1000G).
   - With sufficient money (give the player 10000G via `await page.evaluate(() => { window.A.setMoney(10000); })` — confirm `A.setMoney` exists; if not, add a tiny debug helper or set via `session.player.money` directly through the bridge), buy a TM Blossom. Confirm money decreases by 1000 and inventory gains the item.
   - Screenshot `qa/screenshots/cotton-scoop-tech-shop.png`.

7. **Exit round-trip with cotton_town.**
   - From `(6, 9)`, face down, step onto `(6, 10)`. Assert `session.mapKey === "spyder_cotton_town"` and player is near the scoop's front door at `(30, 35)` facing down.
   - Walk back north onto the scoop's entry teleport on cotton_town (confirm the tile coords there in `spyder_cotton_town.yaml`); assert back on `spyder_cotton_scoop` at the matching spawn coords.

8. **Pre-commit gates** must pass: `npm run format:check && npm run lint && npx tsc --noEmit && npm test`.

## Out of scope (and the follow-up stories that pick them up)

- **Item-triggered monster evolution from inventory** (`miaow_milk`, `pyramidion`, `ox_stick` upstream `effects: [{type: evolve}]`). Our event-action `evolution` evolves a party slot but isn't wired to item-use. **Follow-up: STORY-0226-port-evolution-morph-items.** Until that ships, the three morph items will be purchasable, sellable, and inventory-visible — but "Use" does nothing.
- **TM-style move-learning from items** (`tm_avalanche`, `tm_blossom` upstream `effects: [{type: learn_tm, parameters: [<tech_slug>]}]`). Our `technique` item category exists in `ItemCategory` but no `learn_tm` effect type. **Follow-up: STORY-0227-port-tm-item-effects.**
- **Per-item inventory caps** (upstream `inventory: 1` for the TMs — single-purchase limit). Our shop model doesn't track per-shop inventory state. **Follow-up: STORY-0228-shop-inventory-limits** (or fold into the TM story).
- **`monsters: []` vendor shops** (the `spyder_flower_petshop` pattern; not used by cotton scoop). Out of scope.
- **`set_economy` variable conditions** (upstream `daytime` keys on some shops, e.g. timber scoop's day/night tuxeballs). Not used by cotton scoop. Out of scope.
- **The `tuxeball` translated get-item dialog flourish** (centered, with the item name as msgid). We use a plain `dialog Got 5 Tuxeballs!` for now. Cosmetic; out of scope.
- **Item sprite assets for the 5 tech items** — if our renderer is fine with a missing sprite key, leave as-is (just adds the items with no sprite). Otherwise copy the 5 PNGs from upstream. **Decision deferred to the implementor based on what their first puppeteer run shows.**

## Follow-up stories

Stage these as separate `/new-story` calls after this story merges:

- **STORY-0226-port-evolution-morph-items** — Wire `ItemEffect` to support `{type: "evolve"}`, then triggering it on a chosen party-slot monster runs the existing `evolution` event-action's machinery (or extract that to a callable function). Three items: `miaow_milk`, `pyramidion`, `ox_stick`. Upstream rule: only works if the target monster has a matching `evolutions:` path in its monster YAML — port that gate (`has_path` condition in upstream `miaow_milk.yaml`).
- **STORY-0227-port-tm-item-effects** — Wire `ItemEffect` to support `{type: "learn_tm", tech: <slug>}`. Target a party monster; if the monster's `learnable_tms` list (TBD — may need adding to monster YAML rows or a separate registry) contains the TM's tech slug, learn it; else fail with the upstream `generic_failure` text. Two items in this story; the broader TM catalog is the rest of upstream's `tm_*.yaml`.
- **STORY-0228-shop-inventory-limits** — Add per-shop per-item purchase caps (upstream `inventory: N`) so single-purchase items like TMs can't be bought twice. Persist purchased-count per shop in `session.shops[slug]`.

## Acceptance Criteria

- [ ] `public/assets/maps/spyder_cotton_scoop.json` is a verbatim Tiled-JSON export of upstream's 13×11 TMX: 4 tilesets in firstgid order (`core_city_and_country`@1, `core_indoor_floors`@1441, `core_indoor_walls`@5305, `core_set pieces`@9169), 4 tile layers (`Layer 1`, `Layer 2`, `Layer 3`, `Above Player` — or `Tile Layer N` if renamed for engine compat; journal the choice), 1 `Collisions` objectgroup with the 8 upstream rects, **no event objects in the JSON**.
- [ ] `src/game/data/maps.ts` `spyder_cotton_scoop` `tilesets:` is `[CORE_CITY_AND_COUNTRY, CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES]`.
- [ ] `src/game/data/shops.ts`:
  - `spyder_cotton_scoop` items are `[{potion, 20}, {revive, 100}, {tuxeball, 50}]` in that order, `sellMultiplier: 0.5`.
  - `spyder_cotton_tech` exists with items `[{miaow_milk, 2000}, {pyramidion, 2000}, {ox_stick, 2000}, {tm_avalanche, 2000}, {tm_blossom, 1000}]`, `sellMultiplier: 0.5`.
- [ ] `src/game/data/items.ts` has the 5 tech-shop items (`miaow_milk`, `pyramidion`, `ox_stick`, `tm_avalanche`, `tm_blossom`) with category `"other"`, `effects: []`, and the upstream prices.
- [ ] `src/game/data/npcs.ts` no longer contains `spyder_cotton_scoop_keeper` or `spyder_cotton_scoop_assistant`; `spyder_shopkeeper`, `spyder_shopassistant`, `spyder_wayfarer1_norm` are used instead.
- [ ] `public/assets/events/spyder_cotton_scoop.yaml` contains all 11 events from the upstream TMX (Play Music, Create Shopkeeper, Create Assistant, Create Tech Shop, Open Shop A, Open Shop B, Open Tech, Receive capture device, Devices no explain, Devices explain, Assistant Talk, Go Outside) — mechanically converted from upstream's `condN`/`actN` properties, with upstream English msgstrs verbatim where present and short placeholder dialogs where upstream msgstrs are empty.
- [ ] `src/game/event/actions/openShop.ts` accepts both `open_shop <economy_slug>` (back-compat) and `open_shop <npc_slug>,both_item` (upstream form, reads `economy_<slug>` from variables). Unit tests cover both forms.
- [ ] Walking into the counter row at `y=8` for the first visit fires the `Receive capture device` cutscene, the yes/no branch dispatches correctly, and 5 tuxeballs are granted.
- [ ] Interacting with `(2, 6)` or `(1, 7)` (the front and side of the shopkeeper's counter) opens the shop UI with the cotton-scoop prices.
- [ ] Interacting with `(2, 4)` (front of the wayfarer's counter) opens the shop UI with the tech-shop inventory.
- [ ] Walking onto `(5, 10)` or `(6, 10)` facing down teleports back to `spyder_cotton_town` at `(30, 35)`; the round-trip from cotton_town's matching tile lands back on the scoop.
- [ ] `qa/cotton-scoop-align.ts` passes; screenshots are checked in: `cotton-scoop-overview.png`, `cotton-scoop-tuxeball-gift.png`, `cotton-scoop-assistant-explain.png`, `cotton-scoop-shop-open.png`, `cotton-scoop-tech-shop.png`.
- [ ] No regressions: existing QA scripts (paper-scoop tests, cotton-town-east-road-test, etc.) still pass.
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass.
