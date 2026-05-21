# STORY-0230 — Implementation Journal

## Root cause (H1 confirmed)

The `mods/tuxemon/gfx/tilesets/` directory was entirely gitignored, and on
this worktree it did not exist at all. `scripts/generate-blocked-tiles.py`
walks that dir for `.tsx` files, and the generated
`src/game/data/blockedTiles.ts` therefore only had data for whichever
tilesets the previous implementor happened to have locally — concretely:
`core_outdoor`, `core_outdoor_nature`, `core_indoor_floors`,
`core_indoor_stairs`, `core_outdoor_water`. All others (notably
`core_city_and_country` and `core_buildings`) shipped with **zero** blocked
or directional collision data.

The user-visible "you can walk onto fence end-caps" symptom is the most
obvious casualty, because directional `enter_from` is the only collision
keeping the player off those tiles — there is no global "outline rectangle"
fallback for end-cap art.

## Fix

1. Adjusted `.gitignore` to track `mods/tuxemon/gfx/tilesets/*.tsx` (only
   the `.tsx` files — the PNG art still lives under `public/assets/maps/`
   and is loaded by the runtime there). The `mods/` directory and the rest
   of its contents stay gitignored.
2. Copied all stock upstream `.tsx` tilesets verbatim from
   `upstream/mods/tuxemon/gfx/tilesets/` into `mods/tuxemon/gfx/tilesets/`:
   - **`core_city_and_country.tsx`** — restores 105 fully-blocked +
     99 directional tile ids (the missing fence/cliff metadata).
   - **`core_buildings.tsx`** — included for completeness; upstream
     authors no per-tile collision on it (0 entries), so the generated
     data is unchanged, but the file is now in the source-of-truth tree
     and any future upstream additions flow through automatically.
   - **`Superpowers_Tilesheet.tsx`** — 6 fully-blocked tile ids (used by
     `spyder_citypark`).
   - All other `core_*` tilesets already-present in the previous local
     mirror are also committed so the next clone gets a self-contained
     generator without having to clone upstream first.
3. Re-ran `scripts/generate-blocked-tiles.py`. The diff to
   `src/game/data/blockedTiles.ts` is purely additive — the four pre-existing
   tileset entries are byte-identical; `core_city_and_country` and
   `Superpowers_Tilesheet` are net-new.

### Third-party tilesets — out of scope (documented)

`Interiors_16x16`, `Office_interiors_shadowless_16x16`, and
`Tilesets_16x16` have no upstream `.tsx` (the upstream repo ships only the
PNG sheets and authors carry collision in the map's `Collisions` object
layer instead). Skipped per story instructions; QA didn't surface any
fence/cliff regression in maps that use these sheets
(`spyder_paper_rival_*`, `spyder_omnichannel1`, `spyder_citypark`).

### `oceanset_outside.tiles` name mismatch — non-issue

`public/assets/maps/water_end_of_desert.json` references the tileset by
its internal name `oceanset_outside.tiles`. The upstream
`oceanset_outside.tsx` ships with `name="oceanset_outside.tiles"` (the
`.tiles` is part of the tileset's logical name, the file extension is
`.tsx`). No fix needed — the names already match. Copied the .tsx in for
completeness; it has no enter_from/exit_from props (water-only sheet),
so no impact on collision data.

## Engine code (H2)

`OverworldScene.ts` and `isDirectionBlocked()` were verified against H1
data and require no change. Manual QA (`qa/local/fence-cliff-collision.ts`)
confirms the existing tileX/tileY rounding logic correctly identifies the
"current" and "target" tiles when stepping into a freshly-blocked tile;
the player snaps to the tile center and the `enter_from` check fires.

The `approachTileCoords` widening at lines 414-432 also remains correct —
it only strips the physics collider, leaving the directional check as the
sole gate, which is exactly what we want for end-cap behaviour.

## Asset categories affected

Skim of the restored `core_city_and_country.tsx` confirms its 204
collision-tagged tiles cover, roughly:
- Building roofs, eaves, awnings, and signage on shop fronts.
- Fence end-caps and runs (horizontal and vertical).
- Low garden walls, hedge rows, and planters.
- Counters, kitchen units, and shop-front displays.
- Stairs, doorways, and street-furniture posts.

The fix is genuinely cross-cutting: it isn't just "fences" — every map
that pulls from `core_city_and_country` now respects directional collision
on roof corners, hedge edges, and shop counters too. Notable maps:
`spyder_paper_town`, `spyder_cotton_town`, `cotton_town`,
`spyder_cotton_scoop`, `spyder_cotton_tunnel`.

## Test bed

The story suggested `spyder_paper_town` Tile Layer 3 around columns 3-5
rows 3-7. On inspection those tiles (gid 2465/2466/2502/2503/2539/2540)
turned out to come from `core_outdoor` (firstgid=1441), not
`core_city_and_country` (firstgid=1) — and the specific local ids
(1024/1025/1061/1062) carry no upstream collision metadata at all. The
fences in that area rely on hand-drawn collision rectangles in the
`Collisions` object layer instead; that's a separate map-authoring
concern outside the scope of this story.

The actual `core_city_and_country` directional tiles in
`spyder_paper_town` live at **(4,15) and (4,16) on Tile Layer 3** — a
narrow vertical doorway in a building wall, gid 287, local id 286,
`enter_from="up,down"`. Before the fix the doorway had no collision data
and the player could walk **into the wall from either side**. After the
fix, entry is blocked from left/right and only allowed from above/below.
This is precisely the same end-cap-style directional restriction the
story is targeting, so it's a faithful repro.

QA script: `qa/local/fence-cliff-collision.ts`. Test cases:

| # | Test                                              | Expected   | Result |
|---|---------------------------------------------------|------------|--------|
| 1 | (5,16) → walk left into (4,16) end-cap            | BLOCKED    | PASS   |
| 2 | (3,16) → walk right into (4,16) end-cap           | BLOCKED    | PASS   |
| 3 | (4,17) → walk up into (4,16) (middle/control)     | MOVED      | PASS   |
| 4 | (11,1) → walk up onto cliff (11,0) on route1      | MOVED      | PASS   |

Test #4 confirms `core_outdoor`'s directional cliff collision keeps working
post-fix (no regression to pre-existing positive cases).

The script also runs a negative regression: stashing `blockedTiles.ts`
back to the pre-fix state makes test #1 fail with the player sliding from
(5,16) onto (4,16) unblocked — that's the bug the story reports, captured
on a tile we now own collision metadata for.

Screenshots saved into this story dir:

- `fence-endcap-north-before.png` / `fence-endcap-north-after.png`
- `fence-endcap-south-before.png` / `fence-endcap-south-after.png`
- `fence-middle-control.png`
- `cliff-endcap-before.png` / `cliff-endcap-after.png`

## Acceptance criteria status

- [x] Root cause documented (missing tilesets; list above).
- [x] `mods/tuxemon/gfx/tilesets/` now contains `core_city_and_country.tsx`
      and `core_buildings.tsx` (plus the rest of the stock core_* sheets
      and `Superpowers_Tilesheet.tsx` / `oceanset_outside.tsx` to keep the
      generator self-contained for future clones).
- [x] `src/game/data/blockedTiles.ts` regenerated; diff is additive —
      `core_city_and_country` (105 RAW, 99 DIR_RAW) and
      `Superpowers_Tilesheet` (6 RAW) are net-new.
- [x] QA: end-cap collision verified on `spyder_paper_town` doorway
      tiles (chosen over the originally-named fence row because that
      row turned out to come from a different tileset; full rationale
      above).
- [x] QA: cliff positive control on `spyder_route1` (11,0) row still passes.
- [x] QA: middle/control walk south remains unblocked.
- [x] Screenshots checked into the story directory.
- [x] `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
      all pass (see commit).

## 2026-05-21 — Reviewer findings

**Outcome: bounce back (one todo)**

### What was validated

- Pre-commit gates re-run in the reviewer worktree: format, lint, tsc, tests
  all pass (43 test files, 483 tests).
- Upstream fidelity: all three new `.tsx` files (`core_city_and_country.tsx`,
  `core_buildings.tsx`, `Superpowers_Tilesheet.tsx`) diff identically to
  their counterparts in `upstream/mods/tuxemon/gfx/tilesets/` — verbatim
  copies confirmed.
- `blockedTiles.ts` diff is purely additive: `core_city_and_country` (105
  RAW + 99 DIR_RAW) and `Superpowers_Tilesheet` (6 RAW) are net-new;
  pre-existing entries are byte-identical.
- QA script run against the reviewer dev server (port 8082), four test cases:
  1. `(5,16) → walk left into end-cap (4,16)` — BLOCKED (PASS)
  2. `(3,16) → walk right into end-cap (4,16)` — BLOCKED (PASS)
  3. `(4,17) → walk up into (4,16)` (allowed direction) — MOVED (PASS)
  4. `spyder_route1 (11,1) → walk up to (11,0)` (positive control, move
     allowed from south) — MOVED (PASS)
- The core collision fix is correct; the engine required no change.

### Why bouncing

The `.gitignore` carve-out works but is unnecessarily narrow. The
implementation used 8 lines of gitignore gymnastics to track only `*.tsx`
files under `mods/tuxemon/gfx/tilesets/`, leaving the door closed to any
future non-tsx metadata files in that directory. Since the directory contains
only tileset metadata (no large binaries — those live in
`public/assets/maps/`), the right fix is to un-ignore the entire directory.
That is 2 fewer gitignore lines and no ongoing maintenance hazard.

Todo added: `todos/open/01-simplify-gitignore-for-tilesets-dir.md`.

## 2026-05-21 — Gitignore simplification (review-bounce fix)

Replaced the 6-line `mods/tuxemon/gfx/tilesets/*` + `!*.tsx` carve-out with a
simpler version that fully un-ignores the `tilesets/` directory. The directory
holds only `.tsx` collision metadata (no large binaries — PNGs live under
`public/assets/maps/`), so the narrow `*.tsx` filter was unnecessary
complexity and a future hazard for any non-tsx sidecar. `git status
mods/tuxemon/gfx/tilesets/` after the change is clean — tracking is
unchanged because the directory still contains only `.tsx` files. Todo moved
to `todos/closed/`.
