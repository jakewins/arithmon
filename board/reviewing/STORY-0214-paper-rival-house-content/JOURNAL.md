# STORY-0214 — Journal

## 2026-05-21 — Implementation

### Files changed

- `public/assets/maps/spyder_paper_rival_downstairs.json` — replaced the
  10x13 / wrong-firstgid hand-rolled stub with a verbatim Tiled export of
  `upstream/mods/tuxemon/maps/spyder_paper_rival_downstairs.tmx`. Final
  shape: 11x12, four tile layers `Tile Layer 1/2/3 + Above player` (all
  opacity 1), four tilesets at upstream firstgids
  `core_indoor_stairs(1) / core_indoor_floors(2971) /
  core_indoor_walls(6835) / core_set pieces(10699)`. Map slug is
  `rival_downstairs`. The 8 TMX collision rects (object IDs 1, 2, 4, 5,
  59, 62, 63, 66) live in the `Collisions` objectgroup (renamed from the
  TMX-default `Collision` singular).

- `public/assets/maps/spyder_paper_rival_bedroom.json` — replaced the
  9x8 stub. Final shape: 7x7, four tile layers + `Collisions`
  objectgroup with 5 rects. Tilesets at firstgids
  `core_indoor_walls(1) / core_indoor_floors(3865) /
  core_set pieces(7729) / Interiors_16x16(9279, embedded)`. The embedded
  `Interiors_16x16` tileset matches the canonical JSON shape from
  `spyder_omnichannel1.json:2182-2200` (no `source`; `image:
  "Interiors_16x16.png"`, `imagewidth: 256`, `imageheight: 2592`,
  `tilecount: 2592`, `columns: 16`). Slug `rival_bedroom`.

- `public/assets/maps/spyder_paper_rival_office.json` — replaced the
  9x8 stub. Final shape: 7x7, four tile layers + `Collisions` with 3
  rects. Tilesets at firstgids
  `core_indoor_walls(1) / core_indoor_floors(3865) /
  core_set pieces(7729) / Office_interiors_shadowless_16x16(9279,
  embedded)`. Embedded tileset matches the omnichannel shape with
  `image: "Office_interiors_shadowless_16x16.png"`, `imagewidth: 352`,
  `imageheight: 384`, `tilecount: 528`, `columns: 22`. Slug
  `rival_office`.

  **Export procedure** for all three maps:
  `tiled --export-map json --embed-tilesets <upstream.tmx>
  /tmp/.../out.json`, then a Python normalization step
  (`/tmp/rival-export/normalize.py`) (a) decoded each tile-layer's
  base64+zlib `data` string into the int-array shape the Phaser loader
  expects (stripping `encoding` and `compression`), (b) stripped the
  absolute `image` paths on the three `.tsx`-backed tilesets down to
  bare `*.png` basenames, and (c) renamed `Collision` →
  `Collisions` (singular → plural to match the daycare/manor
  convention from STORY-0212/0213). The embedded tilesets came through
  without source rewrites because Tiled inlines their PNG references
  the same way our omnichannel JSON does.

- `public/assets/events/spyder_paper_rival_downstairs.yaml`,
  `public/assets/events/spyder_paper_rival_bedroom.yaml`,
  `public/assets/events/spyder_paper_rival_office.yaml` — all three
  `cp`-verbatim from upstream. `diff` against upstream is clean
  (0 bytes differ) for each. Replaces the hand-rolled stubs that were
  missing both flashbacks, wrong on stair tile coords, wrong on door
  width, and missing `Use Computer`/`Radio`/`Weights`. Final event
  inventories match STORY.md: downstairs has 10 events (including
  `Default Template`, `Flashback`, `Flashback Yes`, `TV`, `TV Yes`,
  the two stair-direction triggers, plus `Go Outside`, `Package`, and
  `Route Music`); bedroom has 7; office has 3.

- `src/game/data/maps.ts` — extended each rival map registration to
  declare the right tileset list (was previously
  `[CORE_INDOOR_FLOORS, CORE_INDOOR_WALLS, CORE_SET_PIECES]` for all
  three, which silently dropped the staircase tiles on downstairs and
  the embedded `Interiors_16x16` / `Office_interiors_shadowless_16x16`
  tiles on bedroom/office). New lists:
    - downstairs: `[CORE_INDOOR_STAIRS, CORE_INDOOR_FLOORS,
      CORE_INDOOR_WALLS, CORE_SET_PIECES]`
    - bedroom: `[CORE_INDOOR_WALLS, CORE_INDOOR_FLOORS,
      CORE_SET_PIECES, INTERIORS_16X16]`
    - office: `[CORE_INDOOR_WALLS, CORE_INDOOR_FLOORS,
      CORE_SET_PIECES, OFFICE_INTERIORS]`
  All five tileset constants (incl. `INTERIORS_16X16`,
  `OFFICE_INTERIORS`, `CORE_INDOOR_STAIRS`) were already defined; the
  PNGs were already shipped in `public/assets/maps/`. Tileset order in
  the `MapDef.tilesets` array is purely cosmetic (Phaser binds by name);
  ordered them to mirror upstream firstgid order for readability.

  Tile-layer-vs-tileset matchup post-edit: I dumped each layer's
  unique gids and confirmed every gid resolves to a tileset (downstairs
  Tile Layer 1 uses 7257/7396 → core_indoor_walls; bedroom Tile Layer 2
  uses 9768..10915 → Interiors_16x16; office Tile Layer 2 uses the
  Office tileset). Smoke screenshots in `qa/screenshots/rival-*.png`
  (gitignored throwaways from `qa/local/rival-smoke.ts`) show all
  three rooms rendering with furniture intact.

- `qa/paper-rival-test.ts` — new 10-test puppeteer suite. See
  Verification below.

- `qa/screenshots/paper-rival-{downstairs,bedroom,office}-upstream-reference.png`
  — committed via `git add -f` (the screenshots dir is gitignored).
  Rendered by drawing each map's tile layers onto an HTML canvas in
  headless chromium (script in `qa/local/render-rival-upstream.ts`,
  gitignored, adapted from `render-manor-upstream.ts`).

### Engine-side notes

- **All actions and conditions** referenced in the three YAMLs are
  already registered. The rough audit:
    - actions used: `transition_teleport`, `char_face`,
      `translated_dialog`, `translated_dialog_choice`, `set_variable`,
      `clear_variable`, `set_layer`, `set_template`, `char_position`,
      `create_npc`, `remove_npc`, `wait`, `lock_controls`,
      `unlock_controls`, `play_music`, `access_pc`, `tune_radio`
      (the last three are registered stubs).
    - conditions: `char_facing_tile`, `button_pressed`, `variable_set`,
      `char_at`, `char_facing`, `char_sprite`, `music_playing`.
  No engine code changes required.

- The Billie NPC sprite is byte-identical to upstream:
  `cmp public/assets/sprites/fashionista.png
  upstream/mods/tuxemon/sprites/fashionista.png` → 0 diff;
  `file` confirms 48x128 RGBA. `npcs.ts:26` already mapped
  `spyder_billie` → `fashionista`; no change.

- l10n msgid spot-check: all interactable dialogs
  (`spyder_rivaldownstairs_tv`/`_package`,
  `spyder_rivalbedroom_bed`/`_bookshelf`/`_weights`,
  `spyder_rivaloffice_haiku`), the radio set, both flashback sets
  (`spyder_billie_flashback{1..12,_trigger,_end}`,
  `spyder_billie_tv_flashback{1..8,_trigger}`), and `spyder_billie`
  resolve in `public/assets/l10n/en_US.po` with non-empty `msgstr`.

- The `paper_town → rival_downstairs` teleport at
  `public/assets/events/spyder_paper_town.yaml:501` (`(32,5)` →
  `spyder_paper_rival_downstairs.tmx,1,11`) already pointed at the
  correct upstream tile; no change.

- The Tile-Layer-1 gid for the doormat at `(1,11)` is now valid (was
  out-of-bounds in the old 10x13 stub). Front-door arrival lands the
  player facing up; the `Go Outside` trigger covers `(0..2, 11)` width
  3 but is gated on facing `down`, so the entry tile is safe.

### Verification

- `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
  — all green (465 tests).

- `qa/paper-rival-test.ts` — all 10 sub-tests pass against dev server
  on port 8081:
  1. Front-door entry from `spyder_paper_town (32,6)` → walks onto
     `(32,5)` → lands at downstairs `(1,11)` facing up; fetched JSON
     verifies `width=11, height=12, slug="rival_downstairs"`, all four
     tile-layer names plus a `Collisions` objectgroup, and 4 tilesets.
     Screenshot at `qa/screenshots/paper-rival-downstairs-entry.png`.
  2. TV at `(4,7)` interact → dialog fires, choice prompt shown; pick
     `no` → `billie_tv=no`, `flashback=on`. Then Package at `(8,9)`
     interact (approached from `(8,8)` facing down) → Flashback event
     plays (dialog + choice); pick `no` → `billie_grandma=no`. Re-talk
     fires Package only (gated `is variable_set billie_grandma`) — no
     second choice presented.
  3. Bedroom stairwell round-trip: downstairs `(3,3)` facing right (via
     walk-onto from `(2,3)`) → bedroom `(0,3)` facing right; bedroom
     `(0,3)` walk-onto from `(1,3)` facing left → downstairs `(3,3)`
     facing left. Bedroom JSON verified `7x7, slug="rival_bedroom"`,
     `Interiors_16x16` embedded at firstgid 9279.
  4. Bedroom interactables: Bed at `(5,5)` (from `(4,5)` facing right),
     Bookshelf at `(5,2)` (from `(5,3)` facing up), Use Computer at
     `(2,3)` (from `(2,4)` facing up — `access_pc` runs without crash),
     Radio at `(0,5)` (from `(1,5)` facing left — no dialog, no crash,
     tune_radio is a no-op stub), Weights at `(1,6)` (from `(1,5)`
     facing down).
  5. Office stairwell round-trip: downstairs `(0,3)` from `(1,3)`
     facing left → office `(6,3)` facing left; office `(6,3)` from
     `(5,3)` facing right → downstairs `(0,3)` facing right. Office
     JSON verified `7x7, slug="rival_office"`,
     `Office_interiors_shadowless_16x16` embedded at firstgid 9279.
  6. Office Haiku at `(2,4)` (from `(2,5)` facing up) — dialog fires.
  7. Front-door exit at `(1,11)` (from `(1,10)` facing down) →
     paper_town `(32,6)` facing down.
  8. TV-flashback cutscene force-trigger: `setupGame({ map:
     "spyder_paper_rival_downstairs", tileX: 4, tileY: 8, variables:
     { billie_tv: "yes" } })`. The 8-dialog cutscene plays end-to-end
     (interact spam at 160ms intervals); end-state confirms `billie_tv`
     cleared and `flashback=off`. Mid-cutscene screenshot at
     `qa/screenshots/paper-rival-tv-flashback.png`.
  9. Package-to-Daycare flashback round-trip: `setupGame({ map:
     "spyder_paper_rival_downstairs", tileX: 4, tileY: 8, variables:
     { billie_grandma: "yes" } })`. Flashback Yes immediately teleports
     to daycare `(0,3)`, the daycare FlashBack event runs through ~13
     dialogs, and ends back at downstairs `(7,9)` with
     `billie_grandma=done` and `flashback=off`. This is the full
     cross-story handshake with STORY-0212.
  10. Collision sanity: `(8,9)` blocked on downstairs (2x2 package
      block), `(5,5)` blocked on bedroom (2x2 bed), `(2,4)` blocked on
      office (desk row).

- `qa/paper-daycare-test.ts` — all 11 sub-tests still pass (flashback
  round-trip lands at the now-correct downstairs `(7,9)`).
- `qa/paper-town-buildings-test.ts` — still passes; the `Teleport to
  Rival` row lands at downstairs `(1,11)`.
- `qa/smoke.ts` — still passes.

### Reference screenshots

Generated by rendering the exported JSONs onto an HTML canvas in
headless chromium (`qa/local/render-rival-upstream.ts`, gitignored).
Committed at:
- `qa/screenshots/paper-rival-downstairs-upstream-reference.png`
- `qa/screenshots/paper-rival-bedroom-upstream-reference.png`
- `qa/screenshots/paper-rival-office-upstream-reference.png`

Comparison vs the engine entry screenshots: same staircase + TV +
kitchen counter + dining table in downstairs; same computer + bookshelf
+ weights + bed in bedroom; same framed picture + plants + desk +
haiku-pot in office. Engine screenshots are uniformly darker (the
indoor-render concern carried over from STORY-0212/0213; out of scope).
