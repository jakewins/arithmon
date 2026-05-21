# STORY-0217: Port spyder_route2 (map shell + teleports) — fix cotton_town's east exit (garbled tiles)

## Description

Cotton Town's east exit (the teleports at `(39, 28)` and `(39, 29)` in `spyder_cotton_town`) sends the player to `spyder_route2.tmx`, but our `public/assets/maps/spyder_route2.json` is a **30×20 fabricated stub** (upstream is **40×20**) and our `public/assets/events/spyder_route2.yaml` only contains a handful of made-up events that don't match upstream at all (wrong teleport coords, a single fabricated trainer, fabricated signs, no `Route Music`). So when the player squeezes past the hacker-gate and steps east off cotton_town, the engine renders the stub tilemap (different shape, different content, different teleport tile positions than what cotton_town points at) — that's the "garbled tiles / broken cave" symptom the user is seeing.

This story does a verbatim port of upstream's `spyder_route2.tmx` for the **map shell + collisions + the six teleports + the music event** only. The map physically renders correctly and round-trips cleanly with its three neighbors (`spyder_cotton_town` west, `spyder_citypark` north, `spyder_brideswood` south). The full content of route2 — 3 trainers, ~33 random-encounter zones with the day/night wild table, 4 signs, the scripted Billie cutscene, the Environment Day/Night events — is **deferred to explicit follow-up stories** so the implementor can keep their context window small and so each piece can be reviewed independently. Per dispatcher guidance for content-rich routes: ship the verbatim map shell + teleports first, layer encounters/NPCs/cutscenes on top later.

After this story lands, the player can walk east off `spyder_cotton_town` (with the hacker gate bypassed) into route2, see the correct tilemap (trees / grass / path / column landmarks), walk back west into cotton_town cleanly, walk north into citypark, and walk south into brideswood — all without garbled tiles. They will see **no NPCs and no wild encounters yet**; that's by design.

## Context

### Upstream reference

- **Map:** `upstream/mods/tuxemon/maps/spyder_route2.tmx` — `40×20`, `tilewidth=16`. **Three** tilesets:
  - `core_outdoor.tsx` firstgid `1`
  - `core_set pieces.tsx` firstgid `2776`
  - `core_outdoor_nature.tsx` firstgid `4326`
  - (Note: **no** `core_outdoor_water` despite our current `maps.ts` listing it — fix the registry; see step 3.)
- **Map properties:** `edges=clamped`, `scenario=spyder`, `slug=route2`, `map_type=route`, `north=citypark`, `south=brideswood`, `west=cotton_town`.
- **Tile layers (5):** `Layer 1`, `Layer 2`, `Layer 3`, `Layer 4`, `Above Player` (note: **`Layer 1..4`**, not `Tile Layer 1..4` — this map uses upstream's older naming; match the TMX literally). All opacity 1.
- **Collisions (16 rects), in TMX `<objectgroup id="5" name="Collisions">`:** ids 40, 41, 42, 43, 45, 55, 58, 59, 76, 77, 138, 143, 144, 145, 177, 201. Mechanical pixel→tile conversion (`/16`).
- **Events to include in this story (8 of 59 in the TMX, in `<objectgroup id="6" name="Events">`):**
  1. `Route Music` at tile `(0, 0)` — `act1: play_music music_the_wild_places`, `cond1: not music_playing music_the_wild_places`. (Same music + same stub action already used by `spyder_route1.yaml`/`spyder_brideswood.yaml`.)
  2. `Teleport to City Park` at `(10, 0)` — facing up; `transition_teleport player,spyder_citypark.tmx,10,39,0.3` + `char_face player,up`. (Object id 30.)
  3. `Teleport to City Park` at `(11, 0)` — same pair; lands at `(11, 39)`. (Object id 62.)
  4. `Teleport to Cotton Town` at `(0, 8)` — facing left; `transition_teleport player,spyder_cotton_town.tmx,39,28,0.3` + `char_face player,left`. (Object id 31.) **NOTE the swap vs current stub:** upstream's route2 west-edge teleport is at `(0, 8)` going to `(39, 28)` — not at our current stub's `(2, 10)`. (And cotton_town's east-edge teleport at `(39, 28)` lands the player at `(0, 8)` on route2 — round-trip works once route2 is correct.)
  5. `Teleport to Cotton Town` at `(0, 9)` — same pair; lands at `(39, 29)`. (Object id 61.)
  6. `Teleport to Brideswood A` at `(36, 19)` — facing down; `transition_teleport player,spyder_brideswood.tmx,36,0,0.3` + `char_face player,down`. (Object id 198.) Match this against `spyder_brideswood.yaml`'s `Teleport to Route 2A` at `(36, 0)` → `spyder_route2.tmx,36,19` — the pair is symmetric and was set up in STORY-0216 anticipating route2 landing.
  7. `Teleport to Brideswood B` at `(37, 19)` — same pair; lands at `(37, 0)`. (Object id 197.)
- **Events explicitly deferred (out of scope for this story):**
  - `Sign: City Park`, `Sign: Column 1`, `Sign: Column 2`, `Sign: Route 2` (4 signs; all `translated_dialog` — needs l10n msgids we don't have).
  - `Create Roddick`, `Create Marion`, `Create Graf` and their `Talk*` / `Post Talk*` pairs (3 trainers, 9 events total). Trainers need wild-encounter monsters that exist, dialog l10n msgids, and party-setup `add_monster` chains.
  - `Billie encounter` (object id 156) — scripted cutscene with `pathfind`, `add_monster`, `start_battle`, post-battle dialog and remove_npc — depends on Billie NPC's full party setup; this is the biggest single piece.
  - All `random battle*` objects (≈33 of them) covering grass tiles where wild encounters fire — needs the `spyder_route2` encounter table ported to our wild-encounter system and the `play_map_animation grass,…` action implemented (or stubbed) for the grass shake.
  - `Environment Day` and `Environment Night` events (set_environment grass / forest based on stage_of_day).
  - See `## Follow-up stories` for how these split into separate `/new-story` calls.

### Current state in our codebase

- `public/assets/maps/spyder_route2.json` — **exists but is a 30×20 fabricated stub** (verified: `python3 -c "import json; d=json.load(open('public/assets/maps/spyder_route2.json')); print(d['width'], d['height'])"` → `30 20`; layers `Tile Layer 1..4` + `Above Player` + `Collisions`). **Replace it** with the verbatim 40×20 export from upstream.
- `public/assets/events/spyder_route2.yaml` — **exists but is fabricated** (114 lines): one made-up trainer "Roddick" with placeholder dialog, fabricated `Encounters` rect, fabricated teleports at `(2, 10)/(2, 11)` and `(27, 10)/(27, 11)`, fabricated signs. **Replace it** with the verbatim 8-event YAML described above (Route Music + 6 teleports + nothing else).
- `src/game/data/maps.ts:217-222` — `spyder_route2` is already registered, but the tileset list is wrong:
  ```ts
  spyder_route2: {
    jsonKey: "map-spyder_route2",
    jsonPath: "assets/maps/spyder_route2.json",
    tilesets: [CORE_OUTDOOR, CORE_SET_PIECES, CORE_OUTDOOR_WATER, CORE_OUTDOOR_NATURE],
    environment: "forest",
  },
  ```
  Upstream uses only 3 tilesets: `CORE_OUTDOOR`, `CORE_SET_PIECES`, `CORE_OUTDOOR_NATURE`. **Drop `CORE_OUTDOOR_WATER`** to match. Keep `environment: "forest"` (route2 is wooded in upstream; matches `spyder_route1`/`spyder_brideswood`).
- `src/game/scenes/OverworldScene.ts` — already preloads `events-spyder_route2` (verified). No preload changes needed.
- `public/assets/events/spyder_cotton_town.yaml:341–367` — `Stop Cotton` hacker gate at `(38, 28)`/`(38, 29)` with `not variable_set visitedcottoncafe:yes` blocks the player from reaching `(39, 28)`/`(39, 29)` until they've visited the cotton cafe. **Leave it alone** — it's correct upstream content; the QA script will bypass it via `setupGame` flags (see QA Validation).
- `public/assets/events/spyder_cotton_town.yaml` `Go Route 2 28`/`Go Route 2 29` already teleport east to `spyder_route2.tmx,0,8`/`0,9`. **No cotton_town changes needed** — the upstream-correct route2 will line up.
- `public/assets/events/spyder_brideswood.yaml:54–75` — `Teleport to Route 2A`/`B` at `(36, 0)`/`(37, 0)` already teleport to `spyder_route2.tmx,36,19`/`37,19`. **No brideswood changes needed.**
- `public/assets/events/spyder_citypark.yaml:57–78` — `Go Route 2 11/12` teleports at `(10, 38)`/`(11, 38)` (or thereabouts) land on `spyder_route2.tmx,26,10`/`26,11` — **these coords are fabricated and don't match upstream** (upstream citypark sends the player to `(10, 0)`/`(11, 0)` on route2). After this story, the north-edge round-trip with citypark will be **partially broken**: stepping off route2's north edge at `(10,0)` will arrive at citypark `(10,39)` correctly (upstream-correct route2 → upstream-correct citypark coord), but stepping off citypark's south edge will land at fabricated `(26,10)`/`(26,11)` on route2 (the middle of the map, not the north edge). **Fix this as a small in-flight YAML edit during implementation** (two `transition_teleport` action lines in `spyder_citypark.yaml` → change `26,10` to `10,0` and `26,11` to `11,0`); journal the fix. If for any reason the implementor can't fix it in-flight, route2's north entry from citypark will land in middle-of-map and the player will be stuck-but-not-garbled (collision rects shouldn't trap them) — that's acceptable for this story; defer to the citypark follow-up.

### Template stories

- **STORY-0216** (`board/done/STORY-0216-paper-town-east-road-content`) — same exact recipe for the brideswood neighbor: TMX → Tiled-JSON shell, extract `<object type="event">` properties to a fresh events YAML. Differences: route2 is 40×20 not 40×40, has 3 tilesets not 1, layer names are `Layer 1..4` not `Tile Layer 1..3`, and we're **replacing** existing stub files rather than creating from scratch. Same engine wiring otherwise.
- **STORY-0196** — original "TMX-events-to-YAML" recipe; mechanical conversion of `condN`/`actN` properties → YAML `conditions:`/`actions:` arrays, pixel coords `/16` → tile coords.

## What to build

1. **Replace the map JSON with a verbatim port of upstream's TMX shell.**
   - Run the same Tiled export procedure STORY-0214/0216 used (`tiled --export-map …`, or open in Tiled and Export As JSON). Strip the `core_outdoor.tsx` / `core_set pieces.tsx` / `core_outdoor_nature.tsx` source paths to bare image references.
   - Output: overwrite `public/assets/maps/spyder_route2.json`.
   - 40×20, 3 tilesets (firstgids 1 / 2776 / 4326), 5 tile layers (`Layer 1`, `Layer 2`, `Layer 3`, `Layer 4`, `Above Player`), 1 object layer `Collisions` containing all 16 rects (ids 40, 41, 42, 43, 45, 55, 58, 59, 76, 77, 138, 143, 144, 145, 177, 201). All tile layers opacity 1.
   - Map properties: `edges=clamped`, `slug=route2`, `map_type=route`, `scenario=spyder`, `north=citypark`, `south=brideswood`, `west=cotton_town`. (Optional — engine doesn't currently read them; include for fidelity.)
   - **Do not include any of the upstream TMX's event objects in the JSON.** Strip the entire `Events` objectgroup — events live in YAML on our side, not in the map JSON. (STORY-0216 did the same.)

2. **Replace the events YAML with a verbatim 8-event port.**
   - Overwrite `public/assets/events/spyder_route2.yaml`. Existing fabricated content is wholly discarded — there is no salvageable content because none of it matches upstream.
   - The 8 events: `Route Music`, `Teleport to City Park` (×2, at `(10,0)` and `(11,0)`), `Teleport to Cotton Town` (×2, at `(0,8)` and `(0,9)`), `Teleport to Brideswood A` (at `(36,19)`), `Teleport to Brideswood B` (at `(37,19)`).
   - For each event, write the YAML entry with `x`/`y` (tile coords), `conditions:` list (mechanically converted from `condN` props), `actions:` list (from `actN` props). Preserve numerical order. Use the names from the TMX `name=` attribute verbatim. **Note:** upstream has two `Teleport to City Park` events with the same name (object ids 30 and 62) — disambiguate in YAML as `Teleport to City Park A` and `Teleport to City Park B` (or `Teleport to City Park 10` / `Teleport to City Park 11`); same pattern for the cotton_town pair. Follow the naming style already used in our `spyder_brideswood.yaml` (`Teleport to Paper Town A`/`B`).
   - Follow the YAML shape of `public/assets/events/spyder_brideswood.yaml` exactly — `events:` top-level, each event keyed by its name, with `x`/`y` (and optionally `width`/`height` defaulting to `1,1`) plus `conditions:` and `actions:` arrays of strings.

3. **Fix the map registry tileset list.**
   - `src/game/data/maps.ts:217-222`: change `tilesets:` from `[CORE_OUTDOOR, CORE_SET_PIECES, CORE_OUTDOOR_WATER, CORE_OUTDOOR_NATURE]` to `[CORE_OUTDOOR, CORE_SET_PIECES, CORE_OUTDOOR_NATURE]` (drop `CORE_OUTDOOR_WATER` — upstream doesn't reference it).
   - Keep `environment: "forest"`.

4. **In-flight YAML fix: citypark → route2 teleport coords.**
   - `public/assets/events/spyder_citypark.yaml` — find the two `transition_teleport player,spyder_route2.tmx,26,10,0.3` / `…,26,11,0.3` action lines (around lines 57–80) and change the `26,10` / `26,11` to `10,0` / `11,0` so they land at the north edge of upstream-correct route2 instead of mid-map.
   - Two-line mechanical fix; journal it in the commit message. **Do not** also re-port citypark — it's its own follow-up story.

## Engine-side considerations

- **`music_the_wild_places`** is already stubbed (route1, brideswood). No new wiring.
- **`spyder_cotton_town.yaml` hacker gate** at `(38, 28)`/`(38, 29)` will block any free-walk QA from reaching the east edge unless `visitedcottoncafe:yes` is set. The QA script must either (a) `teleport` the player directly onto route2 via the debug bridge, or (b) call `setupGame` with the variable pre-set. Prefer (a) — simpler. Either way, **do not delete or weaken the gate** — it's correct upstream content.
- **No NPCs spawn on route2 in this story.** That's intentional and per the dispatcher's "first chunk" guidance. The reviewer should not bounce for missing trainers — they're enumerated in the follow-up stories.
- **No `random_encounter` triggers.** Walking through grass tiles will not trigger wild battles after this story lands. That's also intentional — encounters are a follow-up. (The map will still _look_ correct because the random-battle objects only define behavior, not rendering — grass tiles are part of the tilemap.)
- **`spyder_route2.json` is a runtime asset, not source code.** Even though it's not in `src/`, replacing it is the bulk of this story's diff. Be careful to commit the new JSON intact (Tiled's exports can be large; double-check git didn't truncate it).
- **Layer naming gotcha:** route2's TMX uses `Layer 1..4` (no "Tile" prefix) — unlike paper_town/brideswood's `Tile Layer 1..3`. Match the TMX literally; our rendering code keys off layer names for collision/above-player rendering — see `src/game/scenes/OverworldScene.ts` for the `Above Player` lookup. If a quick grep shows the engine hard-codes `Tile Layer 1` as the base, the implementor should either (a) rename in the JSON to match the convention (acceptable, since we're not aiming for byte-equality with the TMX, only correctness), or (b) add the `Layer 1..4` names to the engine's tolerated-layer-name list. Use judgement; document the choice in the commit.
- **`Above Player`** (capital P, matching brideswood/paper_rival rooms — _not_ lowercase `above player` as some older maps use). Match the TMX.

## QA Validation

Write a small puppeteer script: `qa/cotton-town-east-road-test.ts`. The script's job is to confirm the four neighbor round-trips work and the map renders without garbled tiles.

1. **East exit from cotton_town:**
   - `setupGame(page, { map: "spyder_cotton_town", tileX: 38, tileY: 28 })`. (One west of the east-exit tile, behind the hacker gate. If the gate fires anyway because of variable state, instead use `setupGame(page, { map: "spyder_cotton_town", tileX: 39, tileY: 28 })` and `walkTo`-east — the player is past the gate already.)
   - If the gate is in the way, use `await page.evaluate(() => window.A.teleport("spyder_cotton_town", 39, 28))` to skip past it.
   - Walk east onto `(39, 28)`. Wait for map transition. Assert `session.mapKey === "spyder_route2"`, player at `(0, 8)` facing left.
   - Screenshot `qa/screenshots/route2-entry-from-cotton-town.png` — reviewer confirms coherent outdoor terrain (trees, grass path, two column landmarks visible in the middle of the map). No tile garbage.

2. **West-back-to-cotton_town round trip:**
   - From route2 `(0, 8)`, face left, step into the teleport. Assert `session.mapKey === "spyder_cotton_town"`, player at `(39, 28)` facing left. (Confirms the pair round-trips.)

3. **South-to-brideswood transition:**
   - From a fresh setup: `await page.evaluate(() => window.A.teleport("spyder_route2", 36, 18))`. Walk south onto `(36, 19)`. Wait for transition. Assert `session.mapKey === "spyder_brideswood"`, player at `(36, 0)` facing down.
   - Screenshot `qa/screenshots/route2-to-brideswood.png` — sanity check.
   - Return trip: face up on brideswood `(36, 0)`, step into `Teleport to Route 2A`. Assert back on route2 at `(36, 19)`.

4. **North-to-citypark transition:**
   - `await page.evaluate(() => window.A.teleport("spyder_route2", 10, 1))`. Walk north onto `(10, 0)`. Assert `session.mapKey === "spyder_citypark"`, player at `(10, 39)` facing up.
   - Screenshot `qa/screenshots/route2-to-citypark.png`.
   - Return trip (this exercises the in-flight citypark fix from step 4): from citypark, walk south back onto the `(10, 38)` (or wherever citypark's south-edge route2 teleport tile is — confirm by reading `spyder_citypark.yaml`). Assert back on route2 at `(10, 0)` facing up. **If this assertion fails because the citypark fix wasn't applied or is wrong, that's the bug to find before commit.**

5. **Reference comparison:**
   - Open `upstream/mods/tuxemon/maps/spyder_route2.tmx` in Tiled (or render via the upstream client) and save the rendered image as `qa/screenshots/route2-upstream-reference.png` (committed). Reviewer eyeballs that the tile layout in `route2-entry-from-cotton-town.png` matches — same forest layout, same path shape, same column landmarks, same southern wooded area. Color/lighting differences from our renderer are acceptable; tile layout must match.

6. **Sanity: confirm no NPC spawns and no encounter triggers.**
   - After entering route2, walk a short loop across a few grass tiles (e.g. `(5, 8) → (5, 12) → (8, 12) → (8, 8)`). Assert no `BattleScene` activated, no NPC sprites visible on the map. This catches accidental over-porting (i.e. the implementor pulling in trainers/encounters that should be deferred).

7. **Pre-commit gates** must pass: `npm run format:check && npm run lint && npx tsc --noEmit && npm test`.

## Out of scope (and the follow-up stories that pick them up)

- **Trainers on route2** — Roddick (tennisplayer_fiery, party: `spighter L8`), Marion (picnicker, party: `aardorn L7 × 2`), Graf (tennisplayer_green, party: `cardiling L7`, `cataspike L5 × 2`). Follow-up: **STORY-021A**.
- **Random wild encounters on route2** — the day/night encounter table at `upstream/mods/tuxemon/db/encounter/spyder_route2.yaml` (5 species: cardiling, aardorn, eyenemy, axolightl, cataspike) and the ~33 `random_encounter` event triggers covering the grass tiles. Follow-up: **STORY-021B**.
- **Signs on route2** — `Sign: City Park`, `Sign: Route 2`, `Sign: Column 1`, `Sign: Column 2` (4 signs, all `translated_dialog` requiring upstream l10n msgids `here_to_north`, `welcome_location_route`, `spyder_column1_sign`, `spyder_column2_sign`). Follow-up: **STORY-021C** (group with other deferred signage if convenient).
- **Billie scripted cutscene** — object id 156 at `(1, 8)`–`(1, 9)` (rect). Triggers when the player first walks south of the cotton_town exit; Billie pathfinds in from `(3, 15)`, talks, battles the player with a fixed party (the player's starter-counter monster + eyenemy + cardiling), then dialogs and walks off. Sets `route2billie:yes`. Follow-up: **STORY-021D**.
- **`Environment Day` / `Environment Night`** events (set_environment grass / forest based on stage_of_day). Follow-up: **STORY-021E** or fold into STORY-021B.
- **Full citypark port** — citypark's events YAML is currently fabricated (mismatched teleport coords; no upstream port). The in-flight fix in this story is just a two-line teleport-coord patch; the full port is a separate story. Follow-up: **STORY-021F**.
- **Cotton_town's `Stop Cotton` hacker gate logic** — already correctly ported in our yaml; not touched here. If the user wants to actually _play_ through cotton_town legitimately rather than QA-teleport past the gate, they need to visit the cotton cafe first. That's pre-existing behavior, not this story's concern.

## Follow-up stories

Stage these as separate `/new-story` calls after this story merges. The dispatcher's "first chunk" guidance produced this list — each is intended to be small enough that an implementor can complete it without exhausting context.

- **STORY-021A-port-spyder-route2-trainers** — port the 3 trainer NPCs (Roddick, Marion, Graf), their parties (using existing monsters in our DB; verify each), and the `Create *` / `Talk *` event pairs from `upstream/mods/tuxemon/maps/spyder_route2.tmx` (objects 158–163, 188–190) and `upstream/mods/tuxemon/db/npc/spyder_route2_npcs.yaml`. Dialog msgids `spyder_route2_marion1/2`, `spyder_route2_graf1/2`, `spyder_route2_roddick1/2` from `upstream/mods/tuxemon/l18n/`.
- **STORY-021B-port-spyder-route2-encounters** — port `upstream/mods/tuxemon/db/encounter/spyder_route2.yaml` (5 species, day/night variants, levels 3–8) to our wild-encounter data, port the ~33 `random battle*` event triggers to the YAML, ensure `random_encounter` action and `play_map_animation grass,…` work or stub gracefully. May need a small grass-shake animation if not already shipped.
- **STORY-021C-port-spyder-route2-signs** — port the 4 sign events with their translated dialogs. Needs the upstream l10n msgid lookup pipeline to be in place (if it isn't yet, this story will need to set that up — confirm before pickup).
- **STORY-021D-port-spyder-route2-billie-cutscene** — port the scripted Billie encounter (object 156). Billie's party is `{billie_choice L6, eyenemy L6, cardiling L3}` where `billie_choice` is the rival-tracked starter counter the player did _not_ pick (already set up in the paper_town intro by `mymonchoice`). Needs `pathfind`, `pathfind_to_char`, `remove_npc`, `set_variable` engine support (verify pre-pickup which of these are stubbed vs implemented). Sets `route2billie:yes`.
- **STORY-021E-port-spyder-route2-environment-events** — port the `Environment Day` / `Environment Night` events (set_environment based on stage_of_day). Small; could be folded into 021B if convenient.
- **STORY-021F-port-spyder-citypark** — full verbatim port of `spyder_citypark.tmx` and its events YAML to replace our current fabricated stub. Larger scope: citypark is the next-north neighbor and has its own NPCs and event content.

## Acceptance Criteria

- [ ] `public/assets/maps/spyder_route2.json` exists as a verbatim Tiled-JSON export of upstream's 40×20 TMX shell: width=40, height=20, 3 tilesets (`core_outdoor` firstgid 1, `core_set pieces` firstgid 2776, `core_outdoor_nature` firstgid 4326), 5 tile layers (`Layer 1..4` + `Above Player`, all opacity 1), 1 `Collisions` object layer with all 16 rects from upstream (TMX object ids 40, 41, 42, 43, 45, 55, 58, 59, 76, 77, 138, 143, 144, 145, 177, 201), and **no event objects in the JSON** (events live in YAML).
- [ ] `public/assets/events/spyder_route2.yaml` exists with exactly **8 events**: `Route Music`, two `Teleport to City Park *` (at `(10,0)`, `(11,0)`), two `Teleport to Cotton Town *` (at `(0,8)`, `(0,9)`), `Teleport to Brideswood A` (at `(36,19)`), `Teleport to Brideswood B` (at `(37,19)`). Each event's `x`/`y` tile coords and `conditions:`/`actions:` arrays mechanically match the upstream TMX `<object type="event">` properties. **No trainers, no signs, no Billie encounter, no random battle triggers, no environment events.**
- [ ] `src/game/data/maps.ts` `spyder_route2` entry has `tilesets: [CORE_OUTDOOR, CORE_SET_PIECES, CORE_OUTDOOR_NATURE]` (CORE_OUTDOOR_WATER removed) and `environment: "forest"`.
- [ ] `public/assets/events/spyder_citypark.yaml` route2 teleport actions land on `(10, 0)` / `(11, 0)` (not `(26, 10)` / `(26, 11)`). (Two-line in-flight fix.)
- [ ] Walking east off cotton_town `(39, 28)` or `(39, 29)` lands on route2 at `(0, 8)` / `(0, 9)` facing left, and the route2 tilemap renders coherently (no garbled tiles).
- [ ] Walking west off route2 `(0, 8)` or `(0, 9)` returns to cotton_town `(39, 28)` / `(39, 29)`.
- [ ] Walking south off route2 `(36, 19)` or `(37, 19)` lands on brideswood `(36, 0)` / `(37, 0)`. (Verified the round-trip pair with brideswood, set up by STORY-0216.)
- [ ] Walking north off route2 `(10, 0)` or `(11, 0)` lands on citypark `(10, 39)` / `(11, 39)`; walking south off citypark's southern route2-exit lands back on route2 `(10, 0)` / `(11, 0)`.
- [ ] No NPCs spawn on route2 and no wild encounters trigger when walking grass tiles (by design — those are follow-up stories).
- [ ] `qa/cotton-town-east-road-test.ts` passes; `qa/screenshots/route2-upstream-reference.png` checked in and matches our `route2-entry-from-cotton-town.png` layout.
- [ ] No regressions: existing QA scripts (brideswood, paper_town etc.) still pass.
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass.
