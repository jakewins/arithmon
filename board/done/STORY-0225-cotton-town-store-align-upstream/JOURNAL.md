# STORY-0225 Journal

## What was done

Verbatim port of `spyder_cotton_scoop` from upstream Tuxemon. The previous
content was a "paper scoop with the slugs renamed" — wrong tilesets, wrong
NPC slugs, missing tuxeball-tutorial cutscene, missing `Open Shop` interact
events, and a missing second NPC (the tech-shop wayfarer at `(1,4)`). All of
those are now wired up.

### Files changed

- `public/assets/maps/spyder_cotton_scoop.json` — fresh export of upstream's
  `spyder_cotton_scoop.tmx` via `tiled --embed-tilesets --export-map json`,
  then post-processed in Python to:
  - decode base64+zlib tile-layer data into raw GID int arrays (matches
    paper_scoop / route2 / brideswood JSON shape),
  - rewrite absolute tileset image paths to bare `core_*.png` filenames,
  - strip the `Events` objectgroup (events live in YAML on our side).
  Result: 13×11, 4 tilesets in firstgid order (`core_city_and_country`@1,
  `core_indoor_floors`@1441, `core_indoor_walls`@5305, `core_set pieces`@9169),
  4 tile layers (`Layer 1`, `Layer 2`, `Layer 3`, `Above Player` — older
  upstream naming, no "Tile" prefix; engine layer loading is name-agnostic
  so this Just Works, same as STORY-0217), `Collisions` objectgroup with the
  8 upstream rects, slug `cotton_scoop`.
- `public/assets/events/spyder_cotton_scoop.yaml` — replaced the 6-event
  fabrication with all 12 upstream events (per the STORY.md plan):
  `Play Music`, `Create Shopkeeper`/`Assistant`/`Tech Shop`,
  `Open Shop A`/`B`, `Open Tech`, `Receive capture device`,
  `Devices, no/explain`, `Assistant Talk`, `Go Outside A`/`B`. Upstream's
  duplicate-named `Open Shop` events disambiguated as `A`/`B` matching our
  scoop convention; the single upstream `(5..6, 10)` exit rect modeled as
  two `Go Outside A`/`B` events for the same reason. Dialog text uses
  upstream's English msgstrs verbatim where present (e.g.
  `Let my assistant introduce you.` for `spyder_cottonscoop_deviceexplan`),
  and short in-character placeholders where upstream's msgstr is empty
  (per STORY-0061 dialog policy).
- `src/game/data/maps.ts` — `spyder_cotton_scoop.tilesets` is now
  `[CORE_CITY_AND_COUNTRY, CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES]`
  in upstream firstgid order.
- `src/game/data/shops.ts` — `spyder_cotton_scoop` prices corrected to
  upstream (`potion 20`, `revive 100`, `tuxeball 50`, order matches upstream
  `spyder_scoops.yaml`); added `spyder_cotton_tech` with the 5 items from
  upstream. `sellMultiplier: 0.5` matches upstream `resale_multiplier: 0.5`.
- `src/game/data/items.ts` — added the 5 tech-shop items (`miaow_milk`,
  `pyramidion`, `ox_stick`, `tm_avalanche`, `tm_blossom`) with upstream
  prices. All five are `category: "other"` with `effects: []` — upstream's
  `morph` and `learn_tm` effects are explicitly out of scope here
  (STORY-0226 / STORY-0227 follow-ups). Items are purchasable and appear in
  the inventory; "Use" is a no-op for now. They reuse the `item/potion`
  sprite placeholder.
- `src/game/data/npcs.ts` — removed the dead `spyder_cotton_scoop_keeper`
  and `spyder_cotton_scoop_assistant` registry entries. The new YAML uses
  the canonical upstream slugs `spyder_shopkeeper`, `spyder_shopassistant`,
  and `spyder_wayfarer1_norm` which were already registered.
- `src/game/event/actions/openShop.ts` — extended to accept upstream's
  `open_shop <npc>,both_item` form alongside the legacy single-arg
  `open_shop <economy_slug>`. When a second arg is present, the action
  looks up the economy from `economy_<npc>` in the variable map (written
  earlier by `set_economy`). The `both_item` token (upstream's "shop sells
  monsters too" flag) is accepted and ignored — none of our economies have
  `monsters` yet.
- `src/__tests__/event-engine.test.ts` — added 3 unit tests for `open_shop`
  covering both forms plus the no-shop-found graceful no-op path.
- `qa/cotton-scoop-align.ts` — new 7-case puppeteer suite covering NPC
  spawns, both Receive-capture-device cutscene paths (yes/no), both
  shopkeeper counter interacts (`Open Shop A`/`B`), the tech shop's
  inventory + buy flow (`Open Tech`), and the exit teleport round-trip with
  `spyder_cotton_town`. Checked-in screenshots: `cotton-scoop-overview`,
  `cotton-scoop-tuxeball-gift`, `cotton-scoop-assistant-explain`,
  `cotton-scoop-shop-open`, `cotton-scoop-tech-shop`.
- `qa/shop-purchase-test.ts` — updated to use the new tile-based Open Shop
  events (the old test relied on a fabricated `talk spyder_cotton_scoop_keeper`
  behav and the wrong NPC coords). Now drops the player at `(3,6)` facing
  left, drains the welcome dialog, and verifies a 20G potion buy.

## Notes / gotchas

- **Layer naming.** Upstream's TMX uses `Layer 1..3` + `Above Player` (no
  "Tile" prefix). `OverworldScene` loads layers by their declared name and
  only special-cases the `above player` suffix for depth sorting, so we kept
  the upstream names verbatim — same call as STORY-0217.
- **Counter-front tile geometry.** The cotton scoop counter at `(2,3..7)`
  is itself in the `Collisions` rect (pixel 32,48 16x80). The two
  `Open Shop` events are anchored on the blocked counter tiles `(2,6)` and
  `(1,7)`; `char_facing_tile player` fires when the player stands on the
  adjacent walkable tile and faces the counter — `(3,6) → left` for Shop A
  and `(1,8) → up` for Shop B. The Tech counter is `(2,4)` → approached
  from `(3,4) → left`. The QA script asserts these tiles.
- **`Receive capture device` rect.** Upstream's TMX collision-rect is
  pixel `(0,128) 208x16` = tiles `(0..12, 8)` (the full counter row). Our
  YAML expresses that as `x: 0, y: 8, width: 13, height: 1`.
- **5×`add_item tuxeball`.** Upstream issues the action 5 times in a row;
  `addItem` is idempotent on the inventory side. No need to extend the
  action to take a quantity arg (out of scope for this story; flagged in
  the engine-considerations section of STORY.md).
- **`both_item` flag.** Accepted and ignored. Upstream's "shop sells
  monsters" path isn't modeled yet (no economies in our data have
  `monsters: []` populated). Documented in `openShop.ts`.
- **TM / morph item effects.** Stubbed (`effects: []`). Items are
  purchasable + appear in inventory, but "Use" is a no-op. STORY-0226 wires
  the evolve effect; STORY-0227 wires `learn_tm`. STORY-0228 will add the
  upstream `inventory: 1` per-shop purchase cap.
- **Round-trip with `spyder_cotton_town`.** Upstream's `Enter Cotton Scoop`
  event at `(30, 34)` already teleports to `spyder_cotton_scoop.tmx,5,10`
  facing up. The player lands on the exit-rect tile and has to walk up one
  step to actually enter — that's the upstream behavior (no fix needed).
- **`shop-purchase-test.ts` rewrite.** The pre-existing test relied on the
  fabricated `talk` behav. Since this story replaces that wiring, the test
  is rewritten in-flight to drive the new tile-based interact path with
  the same intent (smoke-test the buy code path). The richer
  `cotton-scoop-align.ts` is the comprehensive coverage.

## Acceptance criteria

All gates pass: `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
(483/483 tests, all green). New `qa/cotton-scoop-align.ts` passes all 7
sub-tests; pre-existing `qa/shop-purchase-test.ts` (rewritten for the new
flow) and `qa/cotton-town-east-road-test.ts` both pass.

## 2026-05-21 — Reviewer findings

- Pre-commit gates (format:check, lint, tsc --noEmit, npm test) all pass.
- Map JSON verified: 4 tilesets in correct firstgid order, 4 tile layers, 8 collision rects, no event objects leaked in.
- shops.ts: `spyder_cotton_scoop` prices correct (potion 20G, revive 100G, tuxeball 50G); `spyder_cotton_tech` present with 5 tech items at correct upstream prices.
- items.ts: 5 tech items (miaow_milk, pyramidion, ox_stick, tm_avalanche, tm_blossom) added with `category: "other"` and `effects: []`.
- npcs.ts: dead `spyder_cotton_scoop_keeper`/`assistant` entries removed; canonical `spyder_shopkeeper`/`spyder_shopassistant`/`spyder_wayfarer1_norm` slugs used.
- events YAML: all 11 upstream events ported correctly.
- openShop.ts: both single-arg economy slug and `npc,both_item` forms work; unit tests added covering both paths plus graceful no-op.
- QA `qa/cotton-scoop-align.ts`: all 7 tests pass.
- Screenshots verified: cotton-scoop-overview, cotton-scoop-tuxeball-gift, cotton-scoop-shop-open, cotton-scoop-tech-shop, cotton-scoop-assistant-explain all correct.
- Round-trip with spyder_cotton_town confirmed working.
- No regressions in existing QA suite.
- **Decision: APPROVED.**
