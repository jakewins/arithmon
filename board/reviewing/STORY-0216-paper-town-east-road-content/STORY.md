# STORY-0216: Port spyder_brideswood — fix paper_town's east exit (garbled tiles)

## Description

Paper Town's east exit (the teleports at `(39, 6)` and `(39, 7)`) sends the player to `spyder_brideswood.tmx`, but `spyder_brideswood` is not registered in our map registry and has no JSON/YAML assets shipped — so the engine renders whatever garbage tiledata it last had loaded ("a broken cave or something"). This story ports upstream's `spyder_brideswood.tmx` verbatim — the map JSON + the in-TMX event objects extracted to YAML — so the east road out of paper_town leads somewhere real.

Brideswood is a small, sparse **transit route** in upstream (40×40, single tileset, 0 NPCs, 0 wild encounters, 0 signs). It only contains the music event and six teleports to its three neighbors: paper_town west (×2 tiles), route1 west (×2), and route2 north (×2). Of those three neighbors, only paper_town and route1 are wired up in our build today — route2 doesn't exist yet either, so the north exit out of brideswood is a deferred follow-up (see Follow-up stories). After this story lands, the player can walk east out of paper_town, traverse brideswood, and walk back into paper_town or south into route1 cleanly; walking off the north edge of brideswood will land in another broken/garbled map and that's fine for this story — it's the next chunk.

## Open Questions

1. **"Cotton town" naming:** the user wrote "in cotton town, the way out in the early game is to the road that leads east". Our `spyder_paper_town` (the post-intro hub where `setupGame` drops you, with the bins/scoop/Billie first fight) is colloquially being called "cotton town" — but we also have a separate `spyder_cotton_town` map elsewhere in the world. This story assumes the user meant **paper_town** (the early-game post-intro hub) — confirm before pickup if that's wrong. (The east-exit-broken-and-leading-to-garbled-tiles symptom only matches paper_town: `spyder_cotton_town` is a much later map and its exits resolve normally.)
2. **Scope split:** brideswood alone is a clean, small port — but the user noted "the road to the west has [content]" as the reference. There is no upstream content for **routec** (paper_town's actual west exit, which is also broken in our build pointing at `spyder_routec.tmx` while registry has `spyder_routeC` uppercase). I read this as the user misremembering directions — they're describing route1 (north) and route2 (which the north exit of brideswood leads to), not routec. This story plans **only brideswood** and lists route2 + routec as follow-ups. Confirm if the user wants a different split.

## Context

### Upstream reference

- **Map:** `upstream/mods/tuxemon/maps/spyder_brideswood.tmx` — 40×40, `tilewidth=16`. **One** tileset: `core_outdoor.tsx` (firstgid 1). Already in our build at `public/assets/maps/core_outdoor.png` — no new tileset PNG to ship.
- **Map properties:** `edges=clamped`, `scenario=spyder`, **`slug=brideswood`**, `map_type=route`, `north=route2`, `west=paper_town`. (No `inside`, no music in the properties — music is on an event.)
- **Tile layers (4):** `Tile Layer 1`, `Tile Layer 2`, `Tile Layer 3`, `Above Player` (note: capital `P`, unlike rival maps' lowercase `p` — match the TMX). All opacity 1.
- **Collisions** (23 rects, in TMX `<objectgroup id="6" name="Collisions">`): pixel rects from the TMX, ids 280–302 — these form the river banks and the impassable terrain of the route. See the `<object id="…" type="collision" …/>` block in the TMX, ids 280 through 302. Mechanical pixel→tile conversion (divide x/y/w/h by 16).
- **Events** (7 total, in TMX `<objectgroup id="7" name="Events">`):
  1. **Route Music** at `(0, 0)`: `play_music music_the_wild_places` if `not music_playing music_the_wild_places`. (Already used by `spyder_route1.yaml:5-8`; engine stubs both action and condition.)
  2. **Teleport to Paper Town A** at `(0, 26)`: condition `is char_at player` + `is char_facing player,left`; action `transition_teleport player,spyder_paper_town.tmx,39,6,0.3` + `char_face player,left`.
  3. **Teleport to Paper Town B** at `(0, 27)`: same as A but lands at `(39, 7)`. (These are the two paired tiles that pair with our paper_town `Teleport to Brideswood A/B` at `(39, 6)` and `(39, 7)`.)
  4. **Teleport to Route 1A** at `(0, 4)`: facing left; `transition_teleport player,spyder_route1.tmx,39,4,0.3` + `char_face player,left`. (Sends the player to the **east edge** of route1 — currently route1's east edge is not playable from this side because brideswood didn't exist; route1 itself already has the inverse teleports at `(39, 4)`/`(39, 5)` — verify in `public/assets/events/spyder_route1.yaml`.)
  5. **Teleport to Route 1B** at `(0, 5)`: same as 1A but at `(39, 5)`.
  6. **Teleport to Route 2A** at `(36, 0)`: facing up; `transition_teleport player,spyder_route2.tmx,36,19,0.3` + `char_face player,up`. **Route2 is not yet in our build** — this teleport will lead to garbled tiles, just like the old east exit did. That's expected; route2 is the follow-up story.
  7. **Teleport to Route 2B** at `(37, 0)`: same as 2A but at `(37, 19)`.
- **No encounters.** No `random_encounter` actions, no NPCs, no signs, no trainers, no items, no wild grass triggers. Brideswood is purely a corridor.
- **No companion YAML.** Events live as `<object type="event">` properties in the TMX, the same pattern as `spyder_paper_town.tmx` — see STORY-0196 for the mechanical conversion procedure (`<property name="condN" value="X"/>` → an entry in `conditions:`, `actNN` → an entry in `actions:`, pixel coords `/16` → tile coords).

### Current state in our codebase

- `public/assets/maps/spyder_brideswood.json` — **does not exist.**
- `public/assets/events/spyder_brideswood.yaml` — **does not exist.**
- `src/game/data/maps.ts` — `spyder_brideswood` is **not registered.** `grep -c brideswood src/game/data/maps.ts → 0`.
- `src/game/scenes/OverworldScene.ts:130-214` — events preload list does **not** include brideswood.
- `public/assets/events/spyder_paper_town.yaml:618-637` — east-exit teleports `(39,6)`/`(39,7)` already point at `spyder_brideswood.tmx,0,26`/`spyder_brideswood.tmx,0,27` (verified). **No paper_town changes needed.**
- `public/assets/events/spyder_route1.yaml` — already has teleports back to paper_town and (likely) east-edge teleports to brideswood. **Verify during implementation that route1's `(39, 4)`/`(39, 5)` tiles teleport to `spyder_brideswood.tmx,0,4`/`(0,5)` facing right — if missing, this is a 2-line YAML add. (Out of scope to design here; the implementor should fix in-flight if they find it missing, and journal the fix.)**

### Template story

Follow **STORY-0196**'s recipe for the verbatim port: TMX → Tiled-JSON export, then extract `<object type="event">` properties to a fresh `spyder_brideswood.yaml`. Brideswood has no companion YAML upstream, so the event extraction is mechanical (same as paper_town in STORY-0196), not a `cp` (different from STORY-0214's recipe). All 7 events go through this conversion.

## What to build

1. **Port the TMX → Tiled-JSON**
   - Use the same export procedure STORY-0212/0213/0214 used (`tiled --export-map --embed-tilesets` or equivalent; strip the `core_outdoor.tsx` source path to a bare `core_outdoor.png` reference).
   - Output: `public/assets/maps/spyder_brideswood.json`.
   - 40×40, single tileset `core_outdoor` at firstgid 1 (already shipped as `public/assets/maps/core_outdoor.png`).
   - 4 tile layers: `Tile Layer 1`, `Tile Layer 2`, `Tile Layer 3`, `Above Player` (capital P — match the TMX).
   - `Collisions` object layer containing all 23 collision rects (ids 280–302) from the TMX.
   - Map properties: `edges=clamped`, `slug=brideswood`, `map_type=route`, `scenario=spyder`, `north=route2`, `west=paper_town`. (Optional — these aren't read by our engine; include for fidelity.)

2. **Extract the 7 events → YAML**
   - Create `public/assets/events/spyder_brideswood.yaml` (does not exist today).
   - For each `<object type="event">` in the TMX, write the equivalent YAML entry — mechanical conversion only, no editorializing. Preserve `condN`/`actN` numerical order. Convert pixel coords to tile coords (`/16`).
   - The 7 events are: `Route Music`, `Teleport to Paper Town A`, `Teleport to Paper Town B`, `Teleport to Route 1A`, `Teleport to Route 1B`, `Teleport to Route 2A`, `Teleport to Route 2B` (names verbatim from the TMX).
   - Follow the existing YAML shape used by `public/assets/events/spyder_route1.yaml` and `…/spyder_paper_town.yaml` (`events:` top-level, each event keyed by its TMX `name`, with `x`/`y` and optional `width`/`height` plus `conditions:` and `actions:` arrays).

3. **Register the map**
   - `src/game/data/maps.ts`: add a `spyder_brideswood` entry next to `spyder_route1` / `spyder_route2` (lines 205–216):
     ```ts
     spyder_brideswood: {
       jsonKey: "map-spyder_brideswood",
       jsonPath: "assets/maps/spyder_brideswood.json",
       tilesets: [CORE_OUTDOOR],
       environment: "forest",
     },
     ```
     (Match route1/route2's `environment: "forest"` — brideswood is a wooded route in upstream. If a quick puppeteer pass shows it should be `"grass"` instead, the implementor can swap.)

4. **Wire event preload**
   - `src/game/scenes/OverworldScene.ts:130-214`: add
     ```ts
     this.load.text("events-spyder_brideswood", "assets/events/spyder_brideswood.yaml");
     ```
     next to the other route preloads.

## Engine-side considerations

- **`music_the_wild_places` is already a console-log stub** (see route1's identical use). No new music action wiring needed.
- **Route2 doesn't exist yet** — the brideswood teleports at `(36, 0)`/`(37, 0)` will land the player in a not-yet-registered `spyder_route2.tmx`, which will look like the current garbled-east-exit bug. That's the next story (see Follow-up stories), not a regression. The puppeteer QA below explicitly does not walk off the north edge.
- **Single-tileset map** — no firstgid juggling, no embedded tilesets. The simplest map port in the paper-area sequence so far.
- **`spyder_route1` east edge** — route1's TMX in upstream has paired teleports at `(39, 4)`/`(39, 5)` to `spyder_brideswood.tmx,0,4`/`(0,5)` (facing right). Until this story, those route1 teleports either (a) didn't exist in our YAML, or (b) pointed to a non-registered brideswood. The implementor should `grep -n brideswood public/assets/events/spyder_route1.yaml`: if missing, port the two teleports verbatim from `upstream/mods/tuxemon/maps/spyder_route1.tmx` and journal the fix; if present and correct, leave alone.
- **`spyder_routec` (paper_town's west exit, lowercase) — separate bug, out of scope here.** Noted in Open Questions; should be its own story.

## QA Validation

Add a small puppeteer script: `qa/brideswood-test.ts`. The brideswood map is sparse, so the QA is mostly "teleports round-trip and the map renders without garbled tiles". No NPCs or interactables to exercise.

1. **East exit from paper_town:**
   - `setupGame(page, { map: "spyder_paper_town", tileX: 38, tileY: 6 })` (one west of the east-exit tile).
   - Walk east onto `(39, 6)` so `Teleport to Brideswood A` fires.
   - Wait for map change. Assert `session.mapKey === "spyder_brideswood"`, player at `(0, 26)` facing left (matching paper_town's east-exit teleport).
   - Screenshot `qa/screenshots/brideswood-entry-from-paper-town.png` — reviewer confirms the tilemap renders coherent outdoor terrain (river banks, road, trees — no tile garbage).
   - Repeat with `(39, 7)` → `(0, 27)` to exercise the B-tile teleport. One screenshot is enough.

2. **West-back-to-paper-town round trip:**
   - From brideswood `(0, 26)`, walk back onto `(0, 26)` facing left. (Or just face left and step into the trigger.)
   - Wait for teleport. Assert player on `spyder_paper_town` at `(39, 6)` facing left.
   - Round-trip confirms the pair of paired tiles works in both directions.

3. **South-to-route1 transition:**
   - `setupGame(page, { map: "spyder_brideswood", tileX: 1, tileY: 4 })`.
   - Walk west onto `(0, 4)` facing left. Wait for teleport. Assert `session.mapKey === "spyder_route1"`, player at `(39, 4)` facing left.
   - Screenshot `qa/screenshots/brideswood-to-route1.png` — confirms route1's east edge is reachable.
   - **Conditional:** if route1's east-edge return teleport is missing (engineer fixed it in-flight per the Engine-side consideration), also assert the return trip: walk back onto `(39, 4)` facing right, land on brideswood `(0, 4)`.

4. **Reference comparison:**
   - Open `upstream/mods/tuxemon/maps/spyder_brideswood.tmx` in Tiled (or render via the upstream client) and save the rendered image as `qa/screenshots/brideswood-upstream-reference.png` (committed). Reviewer eyeballs that the tile layout in `brideswood-entry-from-paper-town.png` matches — same river-bank shape, same road layout, same trees. Small color differences from our renderer are acceptable; layout must match.

5. **Do NOT walk off the north edge.** The route2 teleports at `(36, 0)`/`(37, 0)` lead to a not-yet-ported map and will show the same garbled-tiles bug we're fixing here — that's the follow-up story, not a regression. Note this in the QA script comment so the reviewer doesn't try to extend the scope.

6. **Pre-commit gates** must pass.

## Out of scope

- **`spyder_route2` (north exit of brideswood)** — separate follow-up story (see below). The route2 teleports in brideswood's YAML will lead to a broken map until that story lands; that's expected.
- **`spyder_routec` (lowercase) bug.** Paper_town's **west** exit teleports to `spyder_routec.tmx` while our map registry has `spyder_routeC` (uppercase). Likely also broken. Separate story; not touched here.
- **Wild-encounter tables for brideswood.** Upstream doesn't define encounters for brideswood — it's pure transit. Don't fabricate any.
- **NPC placement / dialog.** Upstream has none in brideswood. Don't add any.
- **`spyder_route1.tmx` east-edge teleports.** If missing from our `spyder_route1.yaml`, the implementor may add them in-flight (small mechanical fix, journal it); designing the route1 re-port is not this story.

## Follow-up stories

Stage these as separate `/new-story` calls after pickup confirms this story's scope:

- **STORY-021X-port-spyder-route2-content** — port `upstream/mods/tuxemon/maps/spyder_route2.tmx` (the north neighbor of brideswood, and the next chunk of upstream content east-of-paper_town). Larger scope: ~59 events including **3 trainers** (`spyder_route2_roddick`, `spyder_route2_marion`, `spyder_route2_graf`), wild encounter zones, signs, a Billie scripted encounter, and the north connection to `spyder_citypark`. Requires new NPC sprite/party data for the three trainers, l10n msgids for the signs/dialog, and a route2 encounter table. The biggest single piece of east-of-paper_town content.
- **STORY-021Y-port-spyder-routec-west-of-paper-town** — fix paper_town's **west** exit (`Teleport to Sea Route` at `(0, 14)` height 4) which points at `spyder_routec.tmx` while the registry has `spyder_routeC.json` (case mismatch) and the asset itself may already exist but be unreached. Investigation needed: confirm whether the asset is present and just needs a case fix, or whether routec also needs porting from upstream. Either way it's separate from brideswood.
- **(Maybe) STORY-021Z-port-spyder-citypark** — the next-north neighbor after route2; only needed once route2 lands so its north exit isn't broken.

## Acceptance Criteria

- [ ] `public/assets/maps/spyder_brideswood.json` exists, is a verbatim Tiled-JSON export of upstream's 40×40 TMX (correct dimensions, single tileset `core_outdoor` at firstgid 1, 4 tile layers `Tile Layer 1/2/3` + `Above Player` capital-P all opacity 1, `Collisions` object layer with all 23 rects from TMX ids 280–302, slug `brideswood`).
- [ ] `public/assets/events/spyder_brideswood.yaml` exists with all 7 events present (`Route Music`, `Teleport to Paper Town A`, `Teleport to Paper Town B`, `Teleport to Route 1A`, `Teleport to Route 1B`, `Teleport to Route 2A`, `Teleport to Route 2B`), each with the correct tile-coord x/y, `conditions:` list, and `actions:` list mechanically converted from the upstream TMX `<object type="event">` properties.
- [ ] `src/game/data/maps.ts` has a `spyder_brideswood` entry with `tilesets: [CORE_OUTDOOR]` and `environment: "forest"`.
- [ ] `src/game/scenes/OverworldScene.ts` preloads `events-spyder_brideswood` next to the other routes.
- [ ] Walking east off `(39, 6)` or `(39, 7)` in `spyder_paper_town` lands the player on `spyder_brideswood` at `(0, 26)` / `(0, 27)` facing left, and the map renders coherent outdoor terrain (no garbled tile garbage).
- [ ] Walking west off `(0, 26)` or `(0, 27)` in `spyder_brideswood` lands the player on `spyder_paper_town` at `(39, 6)` / `(39, 7)`.
- [ ] Walking west off `(0, 4)` or `(0, 5)` in `spyder_brideswood` lands the player on `spyder_route1` at `(39, 4)` / `(39, 5)`.
- [ ] `qa/brideswood-test.ts` passes; reference screenshot `qa/screenshots/brideswood-upstream-reference.png` is checked in and matches our `brideswood-entry-from-paper-town.png` layout.
- [ ] No regressions: all existing QA scripts still pass.
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass.
