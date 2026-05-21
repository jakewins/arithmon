# STORY-0223: Port spyder_citypark — map shell + teleports (NPCs/encounters/etc deferred)

## Blocked by

- **STORY-0217** (`board/done/STORY-0217-cotton-town-east-road-content` once landed) — STORY-0217 included a two-line in-flight YAML edit to citypark's south-edge route2 teleports so route2 ↔ citypark round-trips at `(10, 0)`/`(11, 0)`. This story replaces the entire fabricated citypark YAML, so it must land after STORY-0217 so the implementor can reconcile against the correct route2 coords. Do not pick up until STORY-0217 has merged to `main`.

## Description

Our current `public/assets/maps/spyder_citypark.json` is a **35×25 fabricated stub** (upstream is **40×40**) with only 4 placeholder tilesets, and `public/assets/events/spyder_citypark.yaml` contains made-up `Create Ranger` / fabricated encounter rects / nonsensical sign content. STORY-0217 only patched two teleport-coord lines in the YAML; the underlying map data is still entirely wrong.

This story does a verbatim port of upstream's `spyder_citypark.tmx` for the **map shell + collisions + the five teleports + the music event** only. Citypark is **content-rich** — 96 TMX objects of which ~70 are events: 5 teleports, 1 music, ~30 wild-encounter rects, ~7 trainer-style NPCs with their Create/Talk/Post-Talk triples, ~5 PC Box events, 2 environment day/night events, 2 signs, and a few flavor NPCs. Following the same "right-size as a first chunk" pattern STORY-0217 used for route2, this story scopes to the **map shell + teleports + music only**, and enumerates explicit follow-up stories for everything else.

After this story lands, the player can walk south off citypark's south edge into route2 (round-trip), east off the west edge into leather_town (one-way, since leather_town's east entry isn't set up — flag as a follow-up), and onto `spyder_citypark_house1` via the Maniac House door (one-way, since that map doesn't exist in our registry — flag as a blocker / follow-up). The map renders correctly: park grass, paths, central fountain area, building roofs. **No NPCs and no wild encounters yet** — by design.

## Open Questions

- **`spyder_citypark_house1.tmx`** is the target of the "Teleport to Maniac House" event. Our registry has no entry. Two options: (a) defer the Maniac House teleport entirely in this story (drop the event, journal as follow-up), or (b) include the teleport but accept that walking into it leads to "garbled tiles" until the house gets its own port story. Mirror STORY-0217's choice for the route2 ↔ brideswood case: **include the teleport** (option b), accept the one-way half-broken state, and enumerate the house port as a follow-up.
- **`spyder_leather_town`** is registered (`src/game/data/maps.ts:494`) but verify its east-edge entry tile expects citypark's west-edge teleport coords. If leather_town's east edge currently has different teleport pairings (e.g. routed to a different map), this story doesn't fix leather_town; it just lets citypark teleport into leather_town's `(39, 32)`/`(39, 33)` (per the upstream `transition_teleport` actions). If the inverse direction (leather_town → citypark) is broken, that's a follow-up — analogous to how STORY-0216 set up brideswood-to-route2 ahead of route2 existing.
- **Music slug `music_city_park`** — upstream uses this for citypark's `Route Music` event. Our current stub uses `music_the_wild_places` (same as route2/route1). Need to verify whether `music_city_park` is registered in our music stubs (probably not). If absent, stub it the same way `music_the_wild_places` is stubbed.

## Context

### Upstream reference

- **Map:** `upstream/mods/tuxemon/maps/spyder_citypark.tmx` — **40×40**, `tilewidth=16`. **Five** tilesets:
  - `Superpowers_Tilesheet.tsx` firstgid `1`
  - `core_outdoor.tsx` firstgid `1601`
  - `core_buildings.tsx` firstgid `4376`
  - `core_set pieces.tsx` firstgid `6726`
  - `core_outdoor_nature.tsx` firstgid `8276`
  Note: this is the first map in our build to reference `Superpowers_Tilesheet.tsx` (verify) — may require new tileset asset.
- **Tile layers (4):** `Tile Layer 1`, `Tile Layer 2`, `Tile Layer 3`, `Above Player`. All opacity 1.
- **Object layers (2):** `Collisions` (id 5) — count via `grep -c 'type="collision"\|<object id=' between the Collisions tags and the Events tag; budget ~25 rects. `Events` (id 6) — ~70 event objects.
- **Map properties:** confirm by reading the top of the TMX (`<properties>` block). Likely `edges=clamped`, `scenario=spyder`, `slug=citypark`, `map_type=town` or `route`, `south=route2`, `west=leather_town`.
- **Events to include in this story (7 of ~70 in the TMX):**
  1. **Route Music** (id 59, tile `(0, 0)`): `act1: play_music music_city_park`, `cond1: not music_playing music_city_park`. (Confirm whether `music_city_park` is registered in our music stubs; if not, stub it.)
  2. **Teleport to Route 2** (id 39, tile `(10, 39)`): facing down; `transition_teleport player,spyder_route2.tmx,10,0,0.3` + `char_face player,down`. (Object id 39's `x=160, y=624` → tile `(10, 39)`.)
  3. **Teleport to Route 2** (id 38, tile `(11, 39)`): same pair; lands at `(11, 0)`. (`x=176, y=624` → tile `(11, 39)`.)
  4. **Teleport to Leather Town** (id 40, tile `(0, 12)`): facing left; `transition_teleport player,spyder_leather_town.tmx,39,32,0.3` + `char_face player,left`.
  5. **Teleport to Leather Town** (id 41, tile `(0, 13)`): same pair; lands at `(39, 33)`.
  6. **Teleport to Maniac House** (id 289, tile `(36, 3)`): facing up; `transition_teleport player,spyder_citypark_house1.tmx,6,7,0.3` + `char_face player,up`. **Target map doesn't exist in our build** — accept the one-way half-broken state and enumerate as follow-up.
  Disambiguate the two pairs of `Teleport to Route 2`/`Teleport to Leather Town` in YAML as `… A`/`… B` following our existing naming style.
- **Events explicitly deferred (out of scope for this story):**
  - **All ~30 `encounter` and `random encounter *` rects.** Upstream's encounter table for citypark is at `upstream/mods/tuxemon/db/encounter/spyder_citypark.yaml` (already a guessed version exists in our `src/game/data/encounters.ts:26-32` — needs a verbatim re-port). Defer to follow-up.
  - **~7 trainer-style NPCs:** Maniac, Granny, Florist (id 46), Florist2 (id 50), Frances, Bobette, Edith, plus a Nurse (id 291) — likely a healer rather than a trainer. Each has a `Create *` and `Talk *` (and some `Post Talk *`) event pair. NPC YAML at `upstream/mods/tuxemon/db/npc/spyder_citypark_npcs.yaml` lists them — match against `src/game/data/npcs.ts` to see which are registered (some are; this story doesn't add them).
  - **5 PC Box events** (`Create Box1..5` + `Box1..5`) — interactable PC boxes for monster storage/banking. Defer.
  - **2 signs:** `Sign: Achievement Maniac's House`, `Sign: Leather Town`. Both `translated_dialog` — needs msgids in our l10n. Defer.
  - **2 Environment events** (`Environment Day`, `Environment Night`) — analogous to route2's (STORY-0222). Defer.
  - **Sight-line Talk variants** (e.g. id 83 `Talk Bobette` at `(13, 17)` is a rect, not a single tile — sight-line trainer). Defer with the trainer ports.

### Current state in our codebase

- `public/assets/maps/spyder_citypark.json` — **exists but is a 35×25 fabricated stub** (verified). Replace verbatim with the 40×40 upstream export.
- `public/assets/events/spyder_citypark.yaml` — **exists but is fabricated** (made-up `Create Ranger`, `Encounters` block, `Sign: Park Entrance`, etc., plus the two `Teleport to Route 2` lines that STORY-0217 patched to land on `(10, 0)`/`(11, 0)`). Replace wholesale with the 7-event verbatim port.
- `src/game/data/maps.ts:223-…` — `spyder_citypark` is already registered (verified). Re-check tileset list — needs `CORE_OUTDOOR`, `CORE_BUILDINGS`, `CORE_SET_PIECES`, `CORE_OUTDOOR_NATURE`, plus `SUPERPOWERS_TILESHEET` (a new entry if not already in our tileset registry). If `SUPERPOWERS_TILESHEET` doesn't exist as a `Tileset` constant in `src/game/data/maps.ts`, define it (mirroring `CORE_OUTDOOR` style — `jsonKey`, `jsonPath`, image), and ship the tileset PNG. Verify whether `Superpowers_Tilesheet.png` exists at `public/assets/maps/` or `upstream/mods/tuxemon/gfx/tilesets/` — likely needs `cp` from upstream.
- `src/game/data/maps.ts` `spyder_leather_town` (line 494) — exists. The west-edge teleports out of citypark land there at `(39, 32)`/`(39, 33)`; verify those tiles are walkable and not inside a collision rect on leather_town. **If leather_town's east edge isn't currently set up to receive the player, the one-way step will succeed (player lands somewhere) but stepping back west will not return them to citypark.** Acceptable for this story; journal a follow-up.
- `src/game/data/maps.ts` — no `spyder_citypark_house1` entry. The Maniac House teleport will fail; accept and journal.
- **Music:** `src/game/data/music.ts` (or wherever music slugs live; grep). Verify `music_city_park` is or isn't stubbed. If not, add a stub. Mirror how `music_the_wild_places` is wired (no-op `play_music` stub plus a corresponding `music_playing` condition stub).
- `src/game/scenes/OverworldScene.ts` — preloads events file `events-spyder_citypark` (verify). No preload changes expected.
- **Route2 ↔ citypark round-trip:** STORY-0217 patched route2-side teleport coords to `(10, 0)`/`(11, 0)`. Upstream-correct citypark places its south-edge teleports at `(10, 39)`/`(11, 39)` landing on route2 `(10, 0)`/`(11, 0)`. So after this story, the round-trip is fully symmetric: route2 north edge → citypark south edge → back. Confirm during implementation.

### Template stories

- **STORY-0217** (`board/done/STORY-0217-cotton-town-east-road-content` once landed) — directly analogous: replace a fabricated 30×20 stub with a verbatim 40×20 upstream port, defer all NPCs/encounters/signs/cutscenes to follow-up stories. Same exact recipe. Read it carefully.
- **STORY-0216** (`board/done/STORY-0216-paper-town-east-road-content`) — verbatim TMX → JSON port, no in-stub-overwrite, but otherwise same pattern.

## What to build

1. **Replace the map JSON with a verbatim port of upstream's TMX shell.**
   - Run the standard Tiled export procedure. Strip the tileset source paths to bare image references.
   - Output: overwrite `public/assets/maps/spyder_citypark.json`.
   - 40×40, 5 tilesets (firstgids 1 / 1601 / 4376 / 6726 / 8276), 4 tile layers (`Tile Layer 1`, `Tile Layer 2`, `Tile Layer 3`, `Above Player`), 1 object layer `Collisions` with all ~25 rects.
   - **Do not include the upstream TMX's event objects in the JSON.** Strip the entire `Events` objectgroup — events live in YAML on our side.

2. **Replace the events YAML with a verbatim 7-event port.**
   - Overwrite `public/assets/events/spyder_citypark.yaml`. Existing fabricated content is wholly discarded — none of it matches upstream.
   - The 7 events: `Route Music` (id 59), `Teleport to Route 2 A` (id 39, `(10, 39)`), `Teleport to Route 2 B` (id 38, `(11, 39)`), `Teleport to Leather Town A` (id 40, `(0, 12)`), `Teleport to Leather Town B` (id 41, `(0, 13)`), `Teleport to Maniac House` (id 289, `(36, 3)`).
   - For each event, mechanical TMX → YAML conversion (tile coords, `condN` → `conditions:`, `actN` → `actions:`).

3. **Fix the map registry tileset list.**
   - `src/game/data/maps.ts` `spyder_citypark` entry: ensure `tilesets: [SUPERPOWERS_TILESHEET, CORE_OUTDOOR, CORE_BUILDINGS, CORE_SET_PIECES, CORE_OUTDOOR_NATURE]`. Add the `SUPERPOWERS_TILESHEET` constant if missing; ship the tileset PNG (copy from `upstream/mods/tuxemon/gfx/tilesets/Superpowers_Tilesheet.png` to `public/assets/maps/`).
   - Keep `environment: "grass"` (or whatever value mirrors route2's runtime-environment expectation; check the upstream property if specified).

4. **Stub `music_city_park`** in our music registry if missing. Single-line addition mirroring `music_the_wild_places`.

5. **Strip the fabricated `Create Ranger`** etc events from the YAML by overwriting wholesale (see step 2). Verify no other code references `spyder_citypark_ranger`; if `src/game/data/npcs.ts:37` registers them, leave the NPC registry alone — it's harmless without a `create_npc` event firing.

## Engine-side considerations

- **`SUPERPOWERS_TILESHEET` is likely new.** Check `src/game/data/maps.ts` for the existing tileset constants and define `SUPERPOWERS_TILESHEET` in the same shape if absent. The PNG goes into `public/assets/maps/` and is referenced by the citypark JSON's `image` field.
- **Layer naming.** Citypark uses the `Tile Layer N` convention (matching most maps), not route2's `Layer N`. The engine handles both already (verified via STORY-0217); no special-casing needed.
- **Music slug `music_city_park`.** Likely needs to be stubbed. Single-line addition. Without it, the `Route Music` event will fail silently — not a blocker but log a warning.
- **Teleport to a non-existent map (`spyder_citypark_house1`).** Walking through `(36, 3)` will call `transition_teleport player,spyder_citypark_house1.tmx,…`. The engine will either crash, log an error, or render garbled tiles. Verify the engine's robustness: if it crashes, this story should NOT include the Maniac House teleport at all (drop the event, enumerate as follow-up). If it logs+stays-on-map, include the event with a comment.
- **No NPCs, encounters, signs, environment, or PC Box logic** — by design. The reviewer should not bounce for missing content; they're enumerated below.
- **Round-trip with route2.** STORY-0217 already patched route2's `transition_teleport ... spyder_citypark.tmx,10,39,0.3` (and `,11,39,0.3`) for the north exit. This story's south-edge teleports land back at `(10, 0)`/`(11, 0)` of route2. Round-trip must be cleanly symmetric.

## QA Validation

Write `qa/citypark-test.ts`. The script confirms the map renders, teleports work, and no fabricated NPCs spawn.

1. **Citypark loads from route2 north exit:**
   - `setupGame(page)`, then `await page.evaluate(() => window.A.teleport("spyder_route2", 10, 1))`. Walk north into `(10, 0)`. Wait for transition. Assert `session.mapKey === "spyder_citypark"`, player at `(10, 39)` facing up.
   - Screenshot `qa/screenshots/citypark-entry-from-route2.png`. Reviewer confirms coherent park terrain (grass, paths, fountain, building roofs). No tile garbage.
2. **South-back-to-route2 round trip:**
   - Face down on citypark `(10, 39)`. Step south. Assert back on route2 at `(10, 0)` facing down.
3. **West-to-leather_town transition:**
   - From a fresh setup: `await page.evaluate(() => window.A.teleport("spyder_citypark", 1, 12))`. Walk west into `(0, 12)`. Assert `session.mapKey === "spyder_leather_town"`, player near `(39, 32)`. Screenshot.
   - Inverse: try walking back east. If leather_town's east edge isn't wired to teleport back to citypark, document the gap; do not bounce.
4. **Maniac House teleport (best-effort):**
   - Teleport `(36, 4)`. Walk north into `(36, 3)`. Either:
     - (a) the engine logs an error and the player stays on citypark — acceptable; screenshot for the record.
     - (b) the engine teleports to a garbled map — acceptable; screenshot, document as expected pending the citypark_house1 port follow-up.
     - (c) the engine crashes — **bug**; remove the Maniac House teleport from this story's YAML and re-test.
5. **No fabricated NPCs:**
   - On citypark, assert `session.npcsByMap.spyder_citypark` is empty (or only contains entries from other event-fired `create_npc`s — none should fire). Specifically confirm no `spyder_citypark_ranger` spawns.
6. **No wild encounters:**
   - Walk a short loop across grass tiles. Assert no `BattleScene` activates.
7. **Reference comparison:**
   - Open `upstream/mods/tuxemon/maps/spyder_citypark.tmx` in Tiled and save the rendered image as `qa/screenshots/citypark-upstream-reference.png` (committed). Reviewer eyeballs that the layout matches.
8. **Pre-commit gates** pass.

## Out of scope (and the follow-up stories that pick them up)

Stage these as separate `/new-story` calls after this story merges. Sized for individual implementor sessions.

- **STORY-0224-port-spyder-citypark-trainers** — port the ~7 trainer-style NPCs (Maniac, Granny, Florist, Florist2, Frances, Bobette, Edith) with their Create/Talk/Post-Talk triples and `npcParties.ts` entries.
- **STORY-0225-port-spyder-citypark-nurse** — port the `Create Nurse`/`Talk Nurse` event pair (id 291/292). Nurse is a heal-NPC, not a trainer — likely needs a `heal_party` action stub if not implemented.
- **STORY-0226-port-spyder-citypark-encounters** — verbatim port of `upstream/mods/tuxemon/db/encounter/spyder_citypark.yaml` to our encounter table (replace the current guessed `spyder_citypark` entry in `encounters.ts:26-32`), plus the ~30 encounter rect events. Same engine work as STORY-0219.
- **STORY-0227-port-spyder-citypark-pc-boxes** — port the 5 `Create Box*` + `Box*` event pairs. Needs PC Box system; verify if implemented (likely yes — `accessPc.ts` exists).
- **STORY-0228-port-spyder-citypark-signs** — port the 2 signs with their `translated_dialog` msgids.
- **STORY-0229-port-spyder-citypark-environment-events** — port `Environment Day` / `Environment Night`. Analogous to STORY-0222.
- **STORY-0230-port-spyder-citypark-house1** — verbatim port of `spyder_citypark_house1.tmx` (Maniac's house interior) so the Maniac House teleport from citypark lands somewhere real. Includes its own NPCs/items.
- **STORY-0231-port-spyder-leather-town-east-entry** — if leather_town's east-edge teleport isn't wired up to land on citypark `(1, 12)`/`(1, 13)`, this story fixes the inverse direction.

## Acceptance Criteria

- [ ] `public/assets/maps/spyder_citypark.json` is a verbatim Tiled-JSON export of the 40×40 TMX shell: width=40, height=40, 5 tilesets (`Superpowers_Tilesheet` firstgid 1, `core_outdoor` firstgid 1601, `core_buildings` firstgid 4376, `core_set pieces` firstgid 6726, `core_outdoor_nature` firstgid 8276), 4 tile layers (`Tile Layer 1`, `Tile Layer 2`, `Tile Layer 3`, `Above Player`), 1 `Collisions` object layer with all upstream collision rects, and **no event objects in the JSON**.
- [ ] `public/assets/events/spyder_citypark.yaml` contains exactly **7 events**: `Route Music`, `Teleport to Route 2 A` at `(10, 39)`, `Teleport to Route 2 B` at `(11, 39)`, `Teleport to Leather Town A` at `(0, 12)`, `Teleport to Leather Town B` at `(0, 13)`, `Teleport to Maniac House` at `(36, 3)`. No trainers, no signs, no encounters, no environment events, no PC boxes.
- [ ] `src/game/data/maps.ts` `spyder_citypark` entry references the 5 correct tilesets including a new `SUPERPOWERS_TILESHEET` constant. The `Superpowers_Tilesheet.png` is shipped under `public/assets/maps/`.
- [ ] `music_city_park` is stubbed in our music registry (if not previously present).
- [ ] Walking north off route2 `(10, 0)`/`(11, 0)` lands on citypark `(10, 39)`/`(11, 39)` and the citypark tilemap renders coherently (no garbled tiles).
- [ ] Walking south off citypark `(10, 39)`/`(11, 39)` returns to route2 `(10, 0)`/`(11, 0)`. Round-trip is symmetric.
- [ ] Walking west off citypark `(0, 12)`/`(0, 13)` lands on leather_town `(39, 32)`/`(39, 33)`. (Inverse trip may fail until STORY-0231; document.)
- [ ] Maniac House teleport at `(36, 3)` either gracefully fails or transitions to a placeholder — the engine does not crash.
- [ ] No NPCs spawn on citypark and no wild encounters trigger (by design).
- [ ] `qa/citypark-test.ts` passes; `qa/screenshots/citypark-upstream-reference.png` checked in and matches the in-engine screenshot layout.
- [ ] No regressions: existing QA scripts still pass.
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass.
