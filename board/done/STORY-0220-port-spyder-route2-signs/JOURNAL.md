# STORY-0220 Journal

## What was done

Ported the four readable map signs on `spyder_route2` from upstream
(`upstream/mods/tuxemon/maps/spyder_route2.tmx` <objectgroup id="6">) and
wired up the engine-side metadata they actually need to render correctly.

### Sign events (the easy half)

Four `translated_dialog` events appended verbatim to
`public/assets/events/spyder_route2.yaml`. Each is a 1×1 rect at the upstream
tile coords, gated on `is char_facing_tile player` + `is button_pressed
INTERACT`:

| Sign            | Tile    | msgid                     |
|-----------------|---------|---------------------------|
| Sign: City Park | (9, 2)  | `here_to_north`           |
| Sign: Column 1  | (11, 7) | `spyder_column1_sign`     |
| Sign: Column 2  | (15, 5) | `spyder_column2_sign`     |
| Sign: Route 2   | (1, 7)  | `welcome_location_route`  |

The msgids were already present in `public/assets/l10n/en_US.po`; the
`translated_dialog` action already existed (`src/game/event/actions/
translatedDialog.ts`); the conditions already existed.

### Engine fix: `${{map_name}}` and cardinal placeholders

The story assumed `welcome_location_route` used `${{var:location_name}}`,
but the real PO copy is upstream's:

```
Welcome to ${{map_name}}: ${{map_desc}}
North: ${{north}} / South: ${{south}} / West: ${{west}} / East: ${{east}}
```

Our `textFormatter` had stubs for these — `map_name` resolved to
`t(session.mapKey)` (which produced ugly fallbacks like "Spyder Route2"),
and the cardinal placeholders returned `null`, leaving literal `${{north}}`
in the rendered text. Upstream resolves them via `TextFormatter` against
`MapManager`, which reads the TMX's top-level `<properties>` (`slug`,
`north`, `south`, `east`, `west`).

This landed alongside the YAML port:

- `src/game/session.ts` — added `session.mapMeta: { slug, north, south,
  east, west } | null`, the cached snapshot of the active TMX's properties.
- `src/game/scenes/OverworldScene.ts` — added `readMapMeta()` which reads
  `Phaser.Tilemaps.Tilemap.properties` (either object or `{name,value}[]`
  shape, both of which Phaser emits depending on Tiled version) into the
  session shape. Called once per `create()` after the registry lookup.
- `src/game/textFormatter.ts` —
  - `${{map_name}}` / `${{map_desc}}` now look up `meta.slug` first (so
    "route2" → "Route 2", matching upstream's `T.translate(slug)`), with
    a graceful fallback to `session.mapKey` for legacy callers.
  - `${{north}}`/`${{south}}`/`${{east}}`/`${{west}}` now resolve through
    `meta`, translating the neighbour slug and rendering missing edges as
    `-` (upstream's sentinel; matches `MapConfig.translate_cardinals`).
    Comma-separated slugs are joined with ` - `, again mirroring upstream.

This fixes the pre-existing paper_town `welcome_location_town` sign as a
side effect — it now renders "Welcome to Paper Town: ..." instead of
"Welcome to Spyder Paper Town Town: ...".

### Tests

- `src/__tests__/textFormatter.test.ts` — added three cases under a new
  `with mapMeta populated` describe: slug-driven `${{map_name}}`,
  cardinal translation with missing-edge `-`, and comma-joined neighbour
  lists.
- `src/__tests__/skilltree.test.ts` — backfilled the `mapMeta: null` field
  in the test-only session stub so the structural type check still passes.
- `qa/route2-signs-test.ts` (new) — boots each sign individually, teleports
  south of it, faces up, INTERACTs, and asserts the rendered dialog text
  contains the load-bearing fragment of its msgid (e.g. "From Route 2 to
  City Park", "Welcome to Route 2: The historic path!"). Plus two negative
  cases (facing away, off-by-one) confirming no dialog fires. Saves four
  screenshots.

### Files touched

- `public/assets/events/spyder_route2.yaml` — 4 new sign events.
- `src/game/session.ts`, `src/game/scenes/OverworldScene.ts`,
  `src/game/textFormatter.ts` — mapMeta plumbing.
- `src/__tests__/textFormatter.test.ts`, `src/__tests__/skilltree.test.ts`,
  `qa/route2-signs-test.ts` — coverage.

### Gates

`npm run format:check && npm run lint && npx tsc --noEmit && npm test`
all green. `qa/route2-signs-test.ts` and `qa/viewport-and-scaling.ts`
(which still hits the paper_town sign) both pass.

## 2026-05-21 — Reviewer findings

- Verified all 4 sign coordinates by converting upstream TMX pixel coords (x/y ÷ 16): City Park (9,2), Column 1 (11,7), Column 2 (15,5), Route 2 (1,7) — exact match.
- Confirmed all 4 msgids (`here_to_north`, `spyder_column1_sign`, `spyder_column2_sign`, `welcome_location_route`) present in `public/assets/l10n/en_US.po` with correct msgstrs.
- Verified upstream TMX sign actions/conditions match the YAML verbatim: `translated_dialog <msgid>` gated on `char_facing_tile player` + `button_pressed INTERACT`.
- Reviewed `readMapMeta()` in OverworldScene — correctly handles both Phaser property shapes (plain object and Tiled 1.2+ `{name,value}[]` array). Confirmed spyder_route2 JSON uses the array form with `slug: "route2"`, `north: "citypark"`, `south: "brideswood"`, `west: "cotton_town"`, no east — rendering as `-` per upstream sentinel.
- Reviewed textFormatter changes: `${{map_name}}` now resolves via `meta.slug` with graceful fallback; cardinals resolve through `meta` with `-` for missing edges and ` - ` join for comma-separated slugs. Clean parity with upstream `MapManager` / `TextFormatter`.
- Pre-commit gates: `npm run format:check && npm run lint && npx tsc --noEmit && npm test` — all green (480 tests).
- `qa/route2-signs-test.ts`: all 6 cases pass — 4 positive sign interactions + 2 negative checks (facing away, off-by-one).
- 3 new `textFormatter.test.ts` unit tests pin the mapMeta substitution behaviour cleanly.
- No dead code, no over-engineering. Engine fix for mapMeta is a genuine prerequisite caught during implementation; side-effect improvement to paper_town sign is a bonus.

**Decision: APPROVED**
