# STORY-0230: Fence and cliff end-cap tiles don't block movement

## Description

The user reports a collision bug on fences and (suspected) cliffs: walking
**perpendicularly** into a fence wall blocks correctly, but approaching the
**end-cap** of a fence row from along its axis — e.g. standing west of a
west-most fence tile and walking east — does NOT block. The player walks "onto"
the fence tile. The same symptom is suspected on cliffs and "perhaps other
assets."

We believe the root cause is missing tileset metadata. Several upstream
Tuxemon `.tsx` files that maps reference are not present in our
`mods/tuxemon/gfx/tilesets/` mirror, so
`scripts/generate-blocked-tiles.py` never extracts their `enter_from` /
`exit_from` collision data. Tiles from those tilesets therefore have **no
collision at all** (neither full-blocked nor directional). End-cap tiles —
typically the first row id in each fence/cliff sub-grid, with a partial
`enter_from` like `"right,down"` — are the most visible casualty because their
art only fills part of the tile and there's no fallback collision rectangle
covering them.

Fix at the engine/data-pipeline level: get the missing tilesets in, regenerate
the collision data, and confirm the existing directional-collision code in
`OverworldScene` actually fires on these tiles. Then audit which categories of
asset relied on the now-restored metadata.

## Context

### Upstream collision model

Upstream Tuxemon stores per-tile collision in the `.tsx` tileset XML as custom
properties on individual tile ids. Two main shapes:

- `enter_from=""` — fully impassable (no direction can enter).
- `enter_from="<dir,dir,...>"` and/or `exit_from="<dir,dir,...>"` — directional;
  the listed directions are the directions FROM which entry is allowed (or
  exit is allowed). End-cap fence tiles, cliff edges, ledges, and counter ends
  use this form.

Upstream movement code reads these and checks them on every step:

- `upstream/tuxemon/movement.py:304-336` (`is_tile_enterable`): when moving
  toward a neighbor in direction D, look up the neighbor's
  `tile_data.enter_from` and require `pairs(D)` (the opposite direction) to be
  in it.
- `upstream/tuxemon/map/map.py:264-283` (`pairs`): the opposite-direction
  helper. Moving right → check `"left"` is in target's `enter_from`.
- `upstream/tuxemon/map/region.py:117-133` and `186-243`: how
  `enter_from`/`exit_from` are parsed off tileset properties.

### Our current behavior

Per-tile blocked/directional data is extracted by
`scripts/generate-blocked-tiles.py` (lines 35-95) from
`mods/tuxemon/gfx/tilesets/*.tsx` and written to
`src/game/data/blockedTiles.ts` as two maps:

- `blockedTileSets: Map<tilesetName, Set<localId>>` — fully-blocked tiles.
- `directionalTileSets: Map<tilesetName, Map<localId, {enter_from?, exit_from?}>>`
  — directional tiles (partial restrictions only).

`OverworldScene.create()` (`src/game/scenes/OverworldScene.ts:300-503`) wires
these into two parallel systems:

1. **Fully blocked tiles** (line 305-327): collected as global tile ids and
   `layer.setCollision(blockedGids)` — handled by Phaser physics colliders
   between the player sprite and each tile layer.
2. **Directional tiles** (line 357-405): keyed by `"x,y"` into
   `this.directionalGrid`. Adjacent "approach" tiles (line 414-432) are
   explicitly excluded from object-rectangle physics bodies so the player can
   step right up to the boundary. The directional check itself runs in
   `isDirectionBlocked(dir)` (line 962-1000), called from keyboard input
   (lines 844-859) and from `walkStep` (lines 757, 768). A* pathfinding
   consults `directionalGrid` via `event/pathfinding.ts:48-127`.

The directional-check algorithm itself mirrors upstream — moving `right` →
target's `enter_from` must include `"left"`. Reading the code in isolation,
end-cap collision should work.

### Why it doesn't work today: missing tilesets

The maps in `public/assets/maps/*.json` reference more tilesets than we keep
checked-in. Diffing referenced names against
`mods/tuxemon/gfx/tilesets/*.tsx`:

| Referenced by maps                       | Present in `mods/tuxemon/gfx/tilesets/`? |
| ---------------------------------------- | ---------------------------------------- |
| `core_outdoor`                           | yes                                      |
| `core_outdoor_nature`                    | yes                                      |
| `core_outdoor_water`                     | yes                                      |
| `core_indoor_floors`                     | yes                                      |
| `core_indoor_stairs`                     | yes                                      |
| `core_indoor_walls`                      | yes                                      |
| `core_set pieces`                        | yes                                      |
| `oceanset_outside`                       | yes                                      |
| **`core_city_and_country`**              | **NO** (303 `enter_from`/`exit_from`)    |
| **`core_buildings`**                     | **NO**                                   |
| **`Interiors_16x16`**                    | NO                                       |
| **`Office_interiors_shadowless_16x16`**  | NO                                       |
| **`Superpowers_Tilesheet`**              | NO                                       |
| **`Tilesets_16x16`**                     | NO                                       |
| **`oceanset_outside.tiles`**             | NO (name mismatch — see below)           |

All `core_*` tilesets are present under `upstream/mods/tuxemon/gfx/tilesets/`.
The crucial one for fences is `core_city_and_country` — it carries 303
directional property declarations, including the classic fence end-cap pattern:

```
<tile id="22"><property name="enter_from" value="right,down"/></tile>   # top-left end-cap
<tile id="23"><property name="enter_from" value="right,left,down"/></tile> # top-middle
<tile id="24"><property name="enter_from" value="left,down"/></tile>   # top-right end-cap
<tile id="31"><property name="enter_from" value=""/></tile>           # fully blocked solid
```

Maps that pull tiles from any missing tileset get **zero collision** for those
tiles. Spot-checked in `spyder_paper_town.json`: tiles `2465/2466` (Tile
Layer 3) and `2502/2503/2539/2540` (Tile Layer 2) come from
`core_city_and_country` (firstgid=1) and visually form fences along the west
side of the map — none of them appear in our generated `blockedTiles.ts`.

In `spyder_paper_town` specifically, many of the fences happen to be
double-covered by collision-rectangle objects in the tmx `Collisions`
objectgroup, which hides the worst of the bug — but other maps don't have
that backup. Maps that use only `core_outdoor`-family tilesets (e.g.
`spyder_route1`, `spyder_route2`) DO get directional cliff/fence collision
because those tilesets are present.

The third-party tilesets (`Interiors_16x16`, `Superpowers_Tilesheet`,
`Tilesets_16x16`, `Office_interiors_shadowless_16x16`) are not stock Tuxemon
content and have no upstream `.tsx` we can import; they're loose `.png` sheets
used raw. Their tiles either don't need collision metadata or had it authored
directly into the map JSON. Out of scope here unless QA shows a fence/cliff
in one of those sheets is also broken.

### Example test bed

`spyder_paper_town` contains a north-south fence on Tile Layer 3 around
columns 3-5, rows 3-7 using `core_city_and_country` ids 2465/2466. After the
fix, walking south into the north-most fence tile (its top end-cap) from the
tile directly above must be blocked. Right now, with the tileset missing,
that fence has no collision data at all.

If `spyder_paper_town`'s fence is too entangled with overlapping collision
rectangles in the `Collisions` objectgroup to demonstrate the bug cleanly,
the implementor can pick any other map listed by
`grep -l core_city_and_country public/assets/maps/*.json` and find a fence
run there. For cliffs, `spyder_route1` is a positive control: its cliffs
use `core_outdoor_nature` (already present), so they should block correctly
both before and after this fix.

### Affected asset categories

Tile categories that almost always rely on directional collision (i.e. will
silently lose all blocking when their host tileset goes missing):

- **Fences** — `core_city_and_country` (missing), `core_outdoor` (present).
- **Cliffs / ledges** — `core_outdoor_nature` (present); but cliff-style
  sprites also exist in `core_city_and_country` (missing).
- **Building edges / low walls / roof eaves** — `core_buildings` (missing).
- **Counters / shop kiosks / NPCs-behind-counters** — likely `core_buildings`
  and `Interiors_16x16` (both missing); upstream-derived only for the former.
- **Stairs** — `core_indoor_stairs` (present, 724 properties — fine).
- **Water edges** — `core_outdoor_water` (present).

The "fences and cliffs and perhaps other assets" wording in the user report
maps cleanly onto "everything from a missing core_* tileset," with fences
(very common, very visible) hit hardest.

## Hypothesis

- **H1 (likely root cause):** `core_city_and_country.tsx` and
  `core_buildings.tsx` are referenced by maps but missing from
  `mods/tuxemon/gfx/tilesets/`. `scripts/generate-blocked-tiles.py` skips
  them, so their tiles get no `enter_from` / `exit_from` / blocked metadata
  in our generated `blockedTiles.ts`. Adding the tilesets and regenerating
  restores collision.
- **H2 (additive — verify after H1 is in):** The end-cap directional tiles
  may still misbehave even with metadata present, e.g. because of the
  `approachTileCoords` logic at `OverworldScene.ts:414-432` deliberately
  removing the physics collider for *every* neighbour of a directional tile.
  An end-cap tile's "wrong-side" neighbour is also stripped of its physics
  body, meaning the only thing keeping the player out is the `enter_from`
  check on the end-cap tile. If for any reason that check doesn't fire
  (e.g. tile coord rounding when the player approaches at non-integer
  pixel positions; see `isDirectionBlocked` tileX/tileY math at lines
  973-978) the player slips onto the tile. The implementor should re-verify
  this works against an actual end-cap after H1 is in, and patch as needed.
- **H3 (low likelihood, mention only):** The `oceanset_outside.tiles` name
  in the map JSON looks like a name-mismatch against our filename
  `oceanset_outside.tsx`. Probably cosmetic — Phaser tilesets are looked up
  by image filename — but flag it.

## What to build

1. **Pull the missing tilesets into `mods/tuxemon/gfx/tilesets/`** from
   `upstream/mods/tuxemon/gfx/tilesets/`. Required:
   - `core_city_and_country.tsx` (+ `.png` if not already present)
   - `core_buildings.tsx` (+ `.png` if not already present)

   Both are stock upstream tilesets. Copy them verbatim. They're large
   (`core_city_and_country.tsx` is ~7600 lines) — they belong in git so the
   generator stays self-contained.

   For the third-party sheets (`Interiors_16x16`, `Office_interiors_shadowless_16x16`,
   `Superpowers_Tilesheet`, `Tilesets_16x16`): check if upstream has a `.tsx`
   under those names. If yes, import; if no (likely), skip and document in
   `JOURNAL.md`. Same for the `oceanset_outside.tiles` name mismatch — note
   what you find and only act if it's a real bug.

2. **Re-run the generator** and inspect the diff to
   `src/game/data/blockedTiles.ts`:
   ```
   python3 scripts/generate-blocked-tiles.py
   ```
   Expect new entries for `core_city_and_country` and `core_buildings` in
   both `RAW` (blocked) and `DIR_RAW` (directional) maps. Sanity-check the
   counts the script prints against the source `.tsx` files.

3. **Verify the existing engine code consumes the new data correctly.**
   `OverworldScene.create()` and `isDirectionBlocked()` should not need
   changes — but read them with H2 in mind, and if QA in step 5 turns up
   an actual edge case (e.g. a fence end-cap that you can still inch onto
   by a sub-pixel amount), patch in this story. Likely tweak sites:
   - `OverworldScene.ts:973-985` — the tileX/tileY rounding inside
     `isDirectionBlocked`. The current code uses `floor`/`ceil` depending on
     direction; if the player body's center hasn't quite settled on a
     tile-center pixel, the "current tile" coordinate may be off by one in
     the direction of motion, and the check may run against the wrong pair
     of tiles. Compare against `upstream/tuxemon/movement.py` for the
     canonical algorithm.
   - `OverworldScene.ts:414-432` — the approach-tile widening. Currently it
     marks ALL four neighbours of any directional tile as approach tiles,
     stripping their physics bodies. For an end-cap, this strips the
     neighbour on the disallowed-entry side too, which is fine **iff** the
     directional check correctly blocks that neighbour's step toward the
     fence. If the directional check is the only line of defence and it's
     misfiring, this is where the player slips through.

4. **Audit asset categories.** Skim
   `mods/tuxemon/gfx/tilesets/core_city_and_country.tsx` and
   `core_buildings.tsx` and list, in a one-paragraph note in `JOURNAL.md`,
   the rough categories of tiles whose collision was previously dropped:
   fences, cliffs, building roof eaves, counters, signage, etc. This is
   informational for the reviewer; the goal is just to demonstrate that
   the fix affects more than one tile family.

5. **Add a puppeteer QA script `qa/local/fence-cliff-collision.ts`** (local —
   it's a one-off bug verifier, not a long-lived suite member). Outline:
   - `launchGame` → `setupGame(page, { map: "spyder_paper_town" })` (or
     whichever map exposes the bug cleanly).
   - Identify the exact end-cap tile coords by reading
     `public/assets/maps/spyder_paper_town.json` Tile Layer 3 for the first
     non-zero fence gid in a column run. The investigation above found a
     run at columns 3-5, rows 3-7 using gids 2465/2466; pick the topmost
     (likely (3,3) or (4,3)) and the bottommost (around (4,7)) as end-caps
     to test.
   - For the north-most end-cap at (tx, ty): teleport to (tx, ty-1), face
     down, attempt `walkStep("down")`. Assert player tile is still
     (tx, ty-1). Screenshot `fence-endcap-north-before.png` (before) and
     `-after.png` (after — player should not have moved).
   - For the south-most end-cap: teleport to (tx, ty+1), face up, attempt
     `walkStep("up")`, same assertion. Screenshots
     `fence-endcap-south-before.png` / `-after.png`.
   - Control: walk south into a middle (non-end-cap) fence tile from the
     tile north of it. Must still be blocked. Screenshot
     `fence-middle-control.png`.
   - For a cliff: use `spyder_route1`, which uses `core_outdoor_nature` —
     directional collision should already work as a positive control.
     Identify a cliff end-cap by inspecting the map JSON for a
     `core_outdoor_nature` directional id (any tile id 0-6 in that tileset
     is a top-row cliff piece). Teleport adjacent, attempt to walk onto it
     from the blocked side, assert no movement. Screenshots
     `cliff-endcap-before.png` / `-after.png`. If we discover cliffs are
     *also* broken (H2 applies), the same screenshots post-fix prove it.
   - Save screenshots into the story directory alongside `STORY.md` so the
     reviewer sees them.

   If `spyder_paper_town`'s fence is too tangled with overlapping collision
   rectangles in the `Collisions` object layer to demonstrate the bug,
   pick another map. The implementor is free to swap the test bed; just
   document the choice in `JOURNAL.md` and update the screenshot names if
   the orientation changes.

## Engine-side considerations

- **A* pathfinding (`src/game/event/pathfinding.ts`) already consults
  `directionalGrid`.** Once the new directional data flows through, A*
  should automatically refuse to route through end-cap tiles. NPC pathing
  benefits for free — but spot-check one map where an NPC currently walks
  through a fence (if any), to make sure they now route around it.
- **Maps that previously "worked" via collision-rectangle backup will
  continue to work.** Adding tile-level collision is purely additive — for
  a tile that's already in a collision rect, the physics collider on the
  rect was already blocking the player. The fix should not introduce new
  no-walk zones in places that were previously walkable; if it does, the
  underlying map data has a tile in a "shouldn't be here" position and
  that is a map-authoring bug, not an engine bug. Note such cases in
  `JOURNAL.md` but do not patch the map.
- **Don't add per-map override hacks.** The fix lives entirely in
  `mods/tuxemon/gfx/tilesets/` + the generated `blockedTiles.ts` + (if
  needed) `OverworldScene.ts` collision-check logic.

## QA Validation

The QA gate is the puppeteer script described in step 5, plus the
pre-commit gate. Specifically:

- `qa/local/fence-cliff-collision.ts` runs end-to-end against `npm run dev`.
  Each end-cap attempt logs the player tile before and after, asserts they
  match, and writes the PNG screenshots into the story dir.
- Reviewer inspects the after-screenshots and confirms the player has not
  advanced onto the fence/cliff tile, and confirms there's no visual
  regression (player sprite not stuck "inside" a tile, no flicker between
  states).
- Existing perpendicular-approach behaviour must still work: the control
  screenshot (`fence-middle-control.png`) demonstrates that walking south
  into a middle (non-end-cap) fence tile still blocks. This is the "didn't
  break what worked" check.

## Out of scope

- Hand-patching individual `.tmx` / map `.json` files. The fix lives in the
  tileset data + engine, not in map authoring.
- Replacing collision-rectangle backups in maps that have them. Those are
  redundant once tile-level collision is in, but removing them is a
  cleanup for another day.
- Refactoring `OverworldScene.create()`'s tile-loading code unless QA
  shows it has a bug under H2.
- Diagonal movement, ledge-jump behaviour (its own upstream feature with
  separate semantics), or importing third-party non-Tuxemon tilesets
  (`Superpowers_Tilesheet`, `Tilesets_16x16`, etc) if upstream has no
  `.tsx` for them.
- Renaming the `oceanset_outside.tiles` mismatch beyond a short note in
  `JOURNAL.md`.

## Acceptance Criteria

- [ ] Root cause documented in `JOURNAL.md` (missing tilesets; list which
      ones were imported).
- [ ] `mods/tuxemon/gfx/tilesets/` contains `core_city_and_country.tsx`
      and `core_buildings.tsx` (at minimum), copied verbatim from
      `upstream/mods/tuxemon/gfx/tilesets/`.
- [ ] `src/game/data/blockedTiles.ts` regenerated and committed; diff
      shows new entries under those tileset names in both `RAW` and
      `DIR_RAW`.
- [ ] In `qa/local/fence-cliff-collision.ts`: walking south into the
      north end-cap of the fence on Tile Layer 3 around columns 3-5,
      rows 3-7 in `spyder_paper_town` (or whichever map the implementor
      chose, documented in `JOURNAL.md`) leaves the player on the
      original tile. Same for the south end-cap.
- [ ] Same verified for a cliff end-cap on `spyder_route1` (positive
      control — should pass even before the fix, and definitely after).
- [ ] Perpendicular-approach into a middle (non-end-cap) fence tile
      still blocks (regression check, captured in
      `fence-middle-control.png`).
- [ ] Screenshots checked into the story directory:
      `fence-endcap-north-before.png`, `fence-endcap-north-after.png`,
      `fence-endcap-south-before.png`, `fence-endcap-south-after.png`,
      `fence-middle-control.png`,
      `cliff-endcap-before.png`, `cliff-endcap-after.png`.
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
      all pass.
