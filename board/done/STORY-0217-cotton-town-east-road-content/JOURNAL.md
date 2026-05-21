# STORY-0217 Journal

## What was done

Ported `spyder_route2` verbatim from upstream's TMX into Tiled-JSON shell +
events YAML, fixing the garbled-tiles symptom the player saw when stepping
east off `spyder_cotton_town`. The shell-only port mirrors STORY-0216's
brideswood recipe; everything except the 6 edge teleports and the music event
is deferred to follow-up stories.

Changes:

- `public/assets/maps/spyder_route2.json` — fresh export of upstream's
  `spyder_route2.tmx` via `tiled --embed-tilesets --export-map json`, then
  post-processed to:
  - decode base64+zlib tile-layer data into raw GID int arrays (matches
    brideswood/route1 JSON shape),
  - rewrite absolute tileset image paths to bare `core_outdoor.png`-style
    filenames,
  - strip the `Events` objectgroup (events live in YAML on our side).
  Result: 40×20, 3 tilesets (`core_outdoor` firstgid 1, `core_set pieces`
  firstgid 2776, `core_outdoor_nature` firstgid 4326), 5 tile layers
  (`Layer 1..4` + `Above Player` — note upstream's older naming, no
  "Tile" prefix), 16-rect `Collisions` (ids 40, 41, 42, 43, 45, 55, 58,
  59, 76, 77, 138, 143, 144, 145, 177, 201 — exact upstream set), slug
  `route2`. Engine layer-loading is name-agnostic, so the `Layer N` name
  shape Just Works without engine changes.
- `public/assets/events/spyder_route2.yaml` — replaced fabricated content
  with the verbatim 8-event port: `Route Music`, `Teleport to City Park A/B`,
  `Teleport to Cotton Town A/B`, `Teleport to Brideswood A/B`. All
  coordinates and destinations match upstream TMX object ids 30, 31, 61, 62,
  197, 198. Duplicate event names disambiguated with `A`/`B` suffixes to
  match brideswood's pattern.
- `src/game/data/maps.ts` — dropped `CORE_OUTDOOR_WATER` from
  `spyder_route2.tilesets`; upstream TMX only references three tilesets.
- `public/assets/events/spyder_citypark.yaml` — in-flight fix: the two
  west-edge `Go Route 2` triggers (still fabricated until STORY-021F)
  now land on route2 `(10, 0)`/`(11, 0)` instead of the fabricated
  `(26, 10)`/`(26, 11)`, matching upstream's south-edge destinations.
- `qa/cotton-town-east-road-test.ts` — 9-case smoke test: map sanity,
  cotton_town east exits + west returns, route2→brideswood south wiring,
  brideswood→route2 north round-trip, route2→citypark north wiring (via
  teleport debug event, since citypark stub clamps the y=39 spawn to its
  25-tile-tall bounds), citypark west→route2 destination-fix round-trip,
  and a quiescence check (no NPCs, no encounters, no battle scene).
- `qa/screenshots/route2-upstream-reference.png` — `tmxrasterizer` render
  of upstream's `spyder_route2.tmx` at native 16px tilesize, for reviewer
  visual comparison.

## Notes / gotchas

- **Layer naming:** route2's TMX uses `Layer 1..4` (without the "Tile "
  prefix that newer maps use). The engine's tile-layer loader iterates
  `map.layers` and only special-cases `"Above Player"` by lowercase name,
  so the bare `Layer N` names work without engine changes. The QA sanity
  test asserts the exact upstream layer names so a future refactor that
  hardcodes `Tile Layer N` would fail loudly here.
- **Route2 → brideswood south teleport:** upstream tile gid 372 in
  `core_outdoor` (id 371, `enter_from=""`) puts a fence wall along route2
  y=18 columns 33..37. The player cannot walk south onto (36, 19)/(37, 19)
  facing down via normal pathing — those tiles only ever fire the
  outbound-to-brideswood teleport when the player first arrives there
  facing down (e.g. on map load). Upstream gameplay only uses (36,19) and
  (37,19) as inbound *destinations* from brideswood, where the inbound
  action sets `char_face player,up` to prevent immediate bounce-back. Our
  QA validates the south wiring by spawning the player directly on the
  teleport tile facing down (setupGame's default) and asserting the
  teleport fires correctly — this proves the YAML destination, even
  though normal gameplay never triggers it.
- **Citypark north destination:** because spyder_citypark is still the
  fabricated 35×25 stub, the requested y=39 spawn is clamped to (10, 24)
  on landing. The QA test asserts the *intended* destination via the
  `teleport` debug event payload rather than the post-clamp player tile,
  so it'll keep passing through STORY-021F (the real citypark port) and
  start matching the post-clamp tile too. The companion citypark→route2
  round-trip (testCityparkRoute2DestinationFix) lands on route2 (10, 0)
  cleanly, exercising the in-flight `26,10 → 10,0` destination fix.
- **Hacker gate bypass:** `setVariable(page, "visitedcottoncafe", "yes")`
  before walking east — the cotton_town "Stop Cotton" gate at (38, 28-29)
  is left untouched per the story spec; QA just sets the same flag the
  cafe cutscene would.

## 2026-05-21 — Reviewer findings

Approved.

- **Upstream fidelity:** verified map JSON (40x20, 3 tilesets with firstgids 1/2776/4326, 5 tile layers, 16 collision rects — IDs 40, 41, 42, 43, 45, 55, 58, 59, 76, 77, 138, 143, 144, 145, 177, 201) matches upstream `spyder_route2.tmx` exactly. No Events layer in JSON.
- **YAML events:** 7 events (Route Music + 2 City Park + 2 Cotton Town + 2 Brideswood). All tile coords verified against upstream TMX pixel-to-tile conversion (px/16). Story description mis-states "8 events" — this is a typo in the narrative; the acceptance criteria list and implementation both have the correct 7. Not a defect.
- **citypark fix:** `Go Route 2 11`/`12` destination updated from fabricated `(26,10)`/`(26,11)` to upstream `(10,0)`/`(11,0)`.
- **maps.ts:** `CORE_OUTDOOR_WATER` removed from `spyder_route2` tileset list; upstream only has 3 tilesets.
- **Pre-commit gates:** format:check, lint, tsc --noEmit, npm test (465/465) all pass.
- **QA (9 cases):** all pass — map sanity, cotton_town east exits at (39,28)/(39,29), west round-trip back, brideswood south wiring (36,19)/(37,19), brideswood north return, citypark north wiring (teleport debug event), citypark→route2 destination-fix round-trip, quiescence (no NPCs, no encounters).
- **Screenshots:** route2 entry from cotton-town, brideswood exit, citypark exit all render coherently with no garbled tiles. Upstream reference PNG matches layout.
