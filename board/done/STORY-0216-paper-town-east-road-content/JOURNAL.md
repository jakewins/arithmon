# STORY-0216 Journal

## What was done

Ported `spyder_brideswood` verbatim from upstream to fix paper_town's broken
east exit. The east-edge teleports at `(39,6)` and `(39,7)` in paper_town were
already in place but pointed at an unregistered map, causing garbled tile
rendering on entry.

Changes:
- `public/assets/maps/spyder_brideswood.json` — Tiled JSON export, 40×40,
  single `core_outdoor` tileset (firstgid=1), 4 tile layers + `Above Player` +
  `Collisions` objectgroup (23 rects, ids 280–302), slug=`brideswood`.
- `public/assets/events/spyder_brideswood.yaml` — all 7 events from upstream
  TMX object ids 279–308: `Route Music`, `Teleport to Paper Town A/B`,
  `Teleport to Route 1A/B`, `Teleport to Route 2A/B`. Coords converted from
  upstream pixel positions to tile coords. Route 2 teleports included
  verbatim but noted as leading to an unported map until the follow-up story.
- `src/game/data/maps.ts` — `spyder_brideswood` entry with `tilesets: [CORE_OUTDOOR]`
  and `environment: "forest"`.
- `src/game/scenes/OverworldScene.ts` — `events-spyder_brideswood` preload added.
- `public/assets/events/spyder_route1.yaml` — two new east-edge teleports
  (`Teleport to Brideswood A/B` at `(39,4)` and `(39,5)`) added so the
  route1 ↔ brideswood round-trip works in both directions.
- `qa/brideswood-test.ts` — 6-case smoke test covering map sanity, paper_town
  east exits, brideswood west returns, and route1 round-trip.

---

## 2026-05-21 — Reviewer findings (approve)

### Validated

- Upstream TMX (`upstream/mods/tuxemon/maps/spyder_brideswood.tmx`) cross-checked:
  - Dimensions: 40×40, tilewidth=16. Match.
  - Tileset: single `core_outdoor` at firstgid=1. Match.
  - Layers: `Tile Layer 1`, `Tile Layer 2`, `Tile Layer 3`, `Above Player`,
    `Collisions` (23 rects, ids 280–302). All present and correct in JSON.
  - Slug: `brideswood`. Present as map property.
- YAML events: all 7 events extracted correctly. Pixel-to-tile coordinate
  conversion verified (divide by 16): Paper Town A `(0,26)`, Paper Town B
  `(0,27)`, Route 1A `(0,4)`, Route 1B `(0,5)`, Route 2A `(36,0)`,
  Route 2B `(37,0)` — all match upstream TMX `x/y` attributes.
- `maps.ts` entry is clean: `CORE_OUTDOOR` only, `environment: "forest"`.
- `OverworldScene.ts` preload line present.
- Route 1 east-edge teleports in `spyder_route1.yaml` verified correct
  destinations: `spyder_brideswood.tmx,0,4` and `spyder_brideswood.tmx,0,5`.
- Pre-commit gates re-run independently: `format:check`, `lint`,
  `tsc --noEmit`, `npm test` (465 tests, 42 files) — all green.
- QA script `qa/brideswood-test.ts` executed with `ARITHMON_PORT=8082`:
  all 6 cases passed — map sanity, paper_town east exit at `(39,6)` and
  `(39,7)`, brideswood west-back to paper_town, brideswood west to route1,
  route1 east return to brideswood.
- Screenshot `brideswood-entry-from-paper-town.png` shows coherent forest
  terrain (pine trees, dark-green ground) — no garbled tiles.
- Route 2 teleports correctly included verbatim with a comment noting they
  lead to an unported map; QA deliberately skips the north edge.
