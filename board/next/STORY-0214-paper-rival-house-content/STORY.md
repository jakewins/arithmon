# STORY-0214: Port spyder_paper_rival_{downstairs,bedroom,office} verbatim — Billie's house + two flashbacks

## Description

Port the Paper Town **Rival House** byte-for-byte from upstream Tuxemon. This is the largest of the three remaining houses: **three connected maps** (`downstairs`, `bedroom`, `office`) joined by two interior staircases plus the front door to town. The downstairs hosts two scripted cutscenes (the Billie/Grandma flashback at the package, plus the Billie TV flashback) and is the campaign hook that sets the `billie_grandma:yes` flag the daycare's flashback (STORY-0212) gates on. Replace all three of our hand-rolled stub JSONs and YAMLs with verbatim TMX exports + `cp`-verbatim event YAMLs from upstream.

Current state in all three rooms is wrong on dimensions, slugs (`paper_rival_*` should be `rival_*`), tileset firstgids, and event content (every interactable dialog is fabricated; both flashbacks and both stairwell teleport facings are missing). Town entry at `spyder_paper_town.yaml:501` (`(32,5)` → `spyder_paper_rival_downstairs.tmx,1,11`) already points at the right tile and does not need to change.

This is one of three sibling stories porting the unfinished Paper Town houses (STORY-0212 Daycare and STORY-0213 Manor are the other two — out of scope here; their resolutions on collisions-in-JSON-vs-YAML and Tiled export procedure should be followed).

## Context

### Upstream reference

- **Downstairs map:** `upstream/mods/tuxemon/maps/spyder_paper_rival_downstairs.tmx` — **11 cols × 12 rows**, `tilewidth=16`. **Four** tilesets (note: includes `core_indoor_stairs`, which the bedroom/office maps don't use):
  - `core_indoor_stairs.tsx` (firstgid 1)
  - `core_indoor_floors.tsx` (firstgid 2971)
  - `core_indoor_walls.tsx` (firstgid 6835)
  - `core_set pieces.tsx` (firstgid 10699)
  - Map properties: `edges=clamped`, `inside=true`, `scenario=spyder`, **`slug=rival_downstairs`** (current stub has `paper_rival_downstairs` — fix), `map_type=notype`.
  - 4 tile layers: `Tile Layer 1`, `Tile Layer 2`, `Tile Layer 3`, `Above player` (lowercase `p`, all opacity 1; no `opacity` attr in TMX).
  - 8 collision rects in the TMX `<objectgroup id="5" name="Collision">` (ids 1, 2, 4, 5, 59, 62, 63, 66 — see table below).
- **Bedroom map:** `upstream/mods/tuxemon/maps/spyder_paper_rival_bedroom.tmx` — **7×7**, `tilewidth=16`. **Four** tilesets, the last one **embedded** (no .tsx file):
  - `core_indoor_walls.tsx` (firstgid 1)
  - `core_indoor_floors.tsx` (firstgid 3865)
  - `core_set pieces.tsx` (firstgid 7729)
  - **Embedded `Interiors_16x16`** (firstgid 9279; `tilecount=2592`, `columns=16`, `image=Interiors_16x16.png` 256×2592)
  - Map properties: `edges=clamped`, `inside=true`, `scenario=spyder`, **`slug=rival_bedroom`**, `map_type=notype`.
  - 4 tile layers (same names + all opacity 1).
  - 5 collision rects (ids 1, 5, 6, 35, 36).
- **Office map:** `upstream/mods/tuxemon/maps/spyder_paper_rival_office.tmx` — **7×7**, `tilewidth=16`. **Four** tilesets, last one **embedded**:
  - `core_indoor_walls.tsx` (firstgid 1)
  - `core_indoor_floors.tsx` (firstgid 3865)
  - `core_set pieces.tsx` (firstgid 7729)
  - **Embedded `Office_interiors_shadowless_16x16`** (firstgid 9279; `tilecount=528`, `columns=22`, `image=Office_interiors_shadowless_16x16.png` 352×384)
  - Map properties: `edges=clamped`, `inside=true`, `scenario=spyder`, **`slug=rival_office`**, `map_type=notype`.
  - 4 tile layers (same names + all opacity 1).
  - 3 collision rects (ids 1, 5, 6).
- **All four tileset PNGs are already shipped** in `public/assets/maps/`: `core_indoor_stairs.png`, `core_indoor_floors.png`, `core_indoor_walls.png`, `core_set pieces.png`, `Interiors_16x16.png`, `Office_interiors_shadowless_16x16.png`. **Canonical embedded-tileset JSON shape lives in `public/assets/maps/spyder_omnichannel1.json:2182-2200`** — match that exactly (no `source`; include `image`, `imagewidth`, `imageheight`, `columns`, `tilecount`, `margin: 0`, `spacing: 0`, `name`, `tilewidth: 16`, `tileheight: 16`).
- **Event YAMLs:** `upstream/mods/tuxemon/maps/spyder_paper_rival_{downstairs,bedroom,office}.yaml` are literal `cp` targets (modulo tabs→spaces if the loader cares).
- **Billie NPC definition:** `upstream/mods/tuxemon/db/npc/spyder_unique_npcs.yaml:31-40` — `slug: spyder_billie`, `sprite_name: fashionista`. **Already registered correctly** at `src/game/data/npcs.ts:26` as `spritesheet: "fashionista"`, and `public/assets/sprites/fashionista.png` is byte-identical to `upstream/mods/tuxemon/sprites/fashionista.png` (verified during planning; 48×128). **No sprite work needed.**
- **Dialog msgids** — all rival/billie strings already exist with non-empty `msgstr` in `public/assets/l10n/en_US.po`:
  - Interactables: `spyder_rivaldownstairs_tv` (l16224), `spyder_rivaldownstairs_package` (l16229), `spyder_rivalbedroom_bed`, `spyder_rivalbedroom_bookshelf`, `spyder_rivalbedroom_weights`, `spyder_rivaloffice_haiku`.
  - Radio set: `spyder_rivalbedroom_radio_{morning,afternoon,dusk,dawn,night}` (l16199-16219, only invoked by the `tune_radio` stub).
  - Downstairs flashback set: `spyder_billie_flashback_trigger`, `spyder_billie_flashback1`..`12`, `spyder_billie_flashback_end` (l16279-16330; also referenced by daycare's FlashBack event in STORY-0212).
  - TV flashback set: `spyder_billie_tv_flashback_trigger`, `spyder_billie_tv_flashback1`..`8` (l16237-16274).
  - `spyder_billie` (l15367 — name/label).

### Cross-story coupling

- **`billie_grandma:yes` is set HERE** in the downstairs "Flashback" event (via `translated_dialog_choice no:yes,billie_grandma`, when the player picks "yes"). STORY-0212 (daycare) gates its FlashBack cutscene on this exact variable. Reviewer should verify the round-trip: pick "yes" in the package dialog → land in daycare at `(0,3)` → daycare's `FlashBack Billie Grandma` event fires → ends with `set_variable billie_grandma:done` → teleports back to **rival_downstairs at `(7,9)`**. Both halves must land on the same flag.
- **`billie_tv:yes` is consumed locally** by the TV Yes event (the in-room TV cutscene); it's cleared at the end with `clear_variable billie_tv`. Purely self-contained.

### Upstream events inventory

**spyder_paper_rival_downstairs.yaml (9 events):**

1. **Default Template** — resets player template to `default` once the flashback has completed (gated on `is char_sprite player,invisible` AND `is variable_set billie_grandma:done`). Pure cleanup; fires every tick until conditions clear.
2. **Flashback** — `(8,9)` INTERACT (`is char_facing_tile player`): plays `spyder_rivaldownstairs_package` + `spyder_billie_flashback_trigger`, then `translated_dialog_choice no:yes,billie_grandma`. Only fires if `not variable_set billie_grandma`.
3. **Flashback Yes** — no x/y, fires immediately when `is variable_set billie_grandma:yes`: `transition_teleport player,spyder_paper_daycare.tmx,0,3` + `set_variable flashback:on`. **This is the campaign hook the daycare flashback consumes.**
4. **Go Bedroom** — `(3,3)` walk-onto + facing **right**: `transition_teleport player,spyder_paper_rival_bedroom.tmx,0,3,0.3` + `char_face player,right`. Right-facing teleport into the bedroom at `(0,3)`.
5. **Go Office** — `(0,3)` walk-onto + facing **left**: `transition_teleport player,spyder_paper_rival_office.tmx,6,3,0.3` + `char_face player,left`. Left-facing teleport into the office at `(6,3)`.
6. **Go Outside** — `(0,11)` width 3 (covers `(0..2,11)`) walk-onto + facing **down**: `transition_teleport player,spyder_paper_town.tmx,32,6,0.3` + `char_face player,down`. Front door.
7. **Package** — `(8,9)` INTERACT, gated on `is variable_set billie_grandma` (after the choice has been made either way): plays `spyder_rivaldownstairs_package` only (no choice repeat).
8. **Route Music** — `play_music music_home` if not already playing. (Our `play_music` is a console-log stub.)
9. **TV** — `(4,7) width 2 height 1` INTERACT: plays `spyder_rivaldownstairs_tv` + `spyder_billie_tv_flashback_trigger`, then `translated_dialog_choice no:yes,billie_tv`, then `set_variable flashback:on`. Fires every time (no gate against re-entry).
10. **TV Yes** — no x/y, fires immediately when `is variable_set billie_tv:yes`: large cutscene — locks controls, `set_template player,invisible`, repositions player to `(6,8)` facing left, `set_layer 102:51:0:128` for sepia tint, spawns `spyder_billie` at `(4,8)` facing up, 8 alternating-top translated_dialog lines (`spyder_billie_tv_flashback1`..`8` with `,,top` on odd ones), removes billie, restores layer/controls/template, sets `flashback:off`, `clear_variable billie_tv`.

(That's 10 events — my point 7 and 8 above were inverted in numbering; refer to the upstream YAML for canonical order. The cp will preserve the canonical order.)

**spyder_paper_rival_bedroom.yaml (7 events):**

1. **Bed** — `(5,5) width 2 height 2` INTERACT, dialog `spyder_rivalbedroom_bed`.
2. **Bookshelf** — `(5,2) width 2 height 1` INTERACT, dialog `spyder_rivalbedroom_bookshelf`.
3. **Go Downstairs** — `(0,3)` walk-onto + facing **left**: `transition_teleport player,spyder_paper_rival_downstairs.tmx,3,3,0.3` + `char_face player,left`. Lands at `(3,3)` (downstairs), where the bedroom-stairs are.
4. **Radio** — `(0,5)` INTERACT, action `tune_radio player,94.7`. (Our `tune_radio` is stubbed at `src/game/event/actions/stubs.ts:30` — no-op.)
5. **Route Music** — `play_music music_home`.
6. **Use Computer** — `(2,3)` INTERACT, action `access_pc player` (registered at `src/game/event/actions/accessPc.ts`).
7. **Weights** — `(1,6)` INTERACT, dialog `spyder_rivalbedroom_weights`.

**spyder_paper_rival_office.yaml (3 events):**

1. **Go Downstairs** — `(6,3)` walk-onto + facing **right**: `transition_teleport player,spyder_paper_rival_downstairs.tmx,0,3,0.3` + `char_face player,right`. Lands at `(0,3)` (downstairs), where the office-stairs are.
2. **Haiku** — `(2,4)` INTERACT, dialog `spyder_rivaloffice_haiku`.
3. **Route Music** — `play_music music_home`.

### Collisions

**Downstairs (8 rects, pixel coords from TMX `<objectgroup>`):**

| TMX id | pixel rect              | tile rect (x,y,w,h) |
|--------|-------------------------|---------------------|
| 1      | x=128 y=144 w=32 h=32   | (8,9,2,2)           |
| 2      | x=48  y=64  w=128 h=48  | (3,4,8,3)           |
| 4      | x=0   y=64  w=16  h=96  | (0,4,1,6)           |
| 5      | x=48  y=112 w=16  h=48  | (3,7,1,3)           |
| 59     | x=0   y=0   w=176 h=48  | (0,0,11,3)          |
| 62     | x=64  y=144 w=32  h=16  | (4,9,2,1)           |
| 63     | x=64  y=112 w=32  h=16  | (4,7,2,1)           |
| 66     | x=64  y=48  w=16  h=16  | (4,3,1,1)           |

**Bedroom (5 rects):**

| TMX id | pixel rect              | tile rect (x,y,w,h) |
|--------|-------------------------|---------------------|
| 1      | x=0   y=0   w=112 h=48  | (0,0,7,3)           |
| 5      | x=80  y=80  w=32  h=32  | (5,5,2,2)           |
| 6      | x=32  y=48  w=48  h=16  | (2,3,3,1)           |
| 35     | x=0   y=80  w=16  h=32  | (0,5,1,2)           |
| 36     | x=16  y=96  w=16  h=16  | (1,6,1,1)           |

**Office (3 rects):**

| TMX id | pixel rect              | tile rect (x,y,w,h) |
|--------|-------------------------|---------------------|
| 1      | x=0   y=0   w=112 h=48  | (0,0,7,3)           |
| 5      | x=80  y=80  w=32  h=32  | (5,5,2,2)           |
| 6      | x=16  y=64  w=64  h=16  | (1,4,4,1)           |

Note: **collisions live in the TMX `<objectgroup>` for all three rival maps** (unlike STORY-0213 Manor where they lived in the YAML). The Tiled-JSON export should produce a `Collisions` object layer the same way `player_house_bedroom.json` and `spyder_omnichannel1.json` do. Match STORY-0212's resolution if it diverges.

### Current state (our codebase)

- `public/assets/maps/spyder_paper_rival_downstairs.json` — **10×13** (wrong, should be 11×12), slug `paper_rival_downstairs` (wrong), only 3 tilesets at firstgids `1/1170/2362` (missing `core_indoor_stairs`, wrong gids). **Replace.**
- `public/assets/maps/spyder_paper_rival_bedroom.json` — **9×8** (wrong, should be 7×7), slug `paper_rival_bedroom` (wrong), only 3 tilesets (missing embedded `Interiors_16x16`). **Replace.**
- `public/assets/maps/spyder_paper_rival_office.json` — **9×8** (wrong, should be 7×7), slug `paper_rival_office` (wrong), only 3 tilesets (missing embedded `Office_interiors_shadowless_16x16`). **Replace.**
- `public/assets/events/spyder_paper_rival_downstairs.yaml` — hand-rolled 5-event stub (`Watch TV`, `Table`, `Kitchen Counter`, `Bookshelf Right/Left`); missing both flashbacks, missing Office stairs, wrong bedroom-stairs tile (`(8,2)` instead of `(3,3)`), wrong door width. **Replace.**
- `public/assets/events/spyder_paper_rival_bedroom.yaml` — hand-rolled 4-event stub; missing `Use Computer`, `Radio`, `Weights`; wrong downstairs-stairs tile (`(7,7)` instead of `(0,3)`). **Replace.**
- `public/assets/events/spyder_paper_rival_office.yaml` — hand-rolled 4-event stub; missing nothing major in event count but wrong stairs tile (`(8,7)` instead of `(6,3)`) and wrong return facing. **Replace.**
- `src/game/data/maps.ts:612,619,626` — all three maps registered. No changes (json paths unchanged).
- `src/game/scenes/OverworldScene.ts:141,145,149` — all three event YAMLs preloaded. No changes.
- `src/game/data/npcs.ts:26` — `spyder_billie` → `fashionista` registered. No changes.
- `public/assets/events/spyder_paper_town.yaml:501-508` — town teleports `(32,5)` → `spyder_paper_rival_downstairs.tmx,1,11`. Correct; no changes.

### Template story

Follow STORY-0213's recipe for the verbatim port (TMX export + cp YAML + slug rename). The only new wrinkle vs. manor is the **embedded tilesets** in bedroom/office — see `public/assets/maps/spyder_omnichannel1.json:2182-2200` for the canonical embedded-tileset JSON shape. Match firstgids exactly.

## What to build

1. **Re-export the three TMX → Tiled-JSON** (one JSON per map; overwrite the existing stubs)
   - Use the same procedure as STORY-0212/0213 (`tiled --export-map --embed-tilesets` or equivalent, then strip `source:` paths to bare filenames for the three .tsx-backed tilesets).
   - **Downstairs** (`spyder_paper_rival_downstairs.json`): 11×12, four tilesets at firstgids `1 / 2971 / 6835 / 10699` (`core_indoor_stairs`, `core_indoor_floors`, `core_indoor_walls`, `core_set pieces`), 4 tile layers (`Tile Layer 1/2/3`, `Above player`, all opacity 1), 8-rect `Collisions` object layer, slug `rival_downstairs`.
   - **Bedroom** (`spyder_paper_rival_bedroom.json`): 7×7, four tilesets at firstgids `1 / 3865 / 7729 / 9279` — last one is the **embedded `Interiors_16x16`** (match the JSON shape used in `spyder_omnichannel1.json`: `image: "Interiors_16x16.png"`, `imagewidth: 256`, `imageheight: 2592`, `tilecount: 2592`, `columns: 16`, no `source`). 4 tile layers (opacity 1), 5-rect `Collisions`, slug `rival_bedroom`.
   - **Office** (`spyder_paper_rival_office.json`): 7×7, four tilesets at firstgids `1 / 3865 / 7729 / 9279` — last is **embedded `Office_interiors_shadowless_16x16`** (`image: "Office_interiors_shadowless_16x16.png"`, `imagewidth: 352`, `imageheight: 384`, `tilecount: 528`, `columns: 22`). 4 tile layers (opacity 1), 3-rect `Collisions`, slug `rival_office`.
   - **Sanity-check dimensions** in the produced JSONs: 11×12 / 7×7 / 7×7 (not 10×13 / 9×8 / 9×8).
   - **Tileset PNG filenames must be bare** (no path prefix) — load is via `assets/maps/<filename>` per the loader.

2. **Literal copy of each event YAML**
   - `cp upstream/mods/tuxemon/maps/spyder_paper_rival_downstairs.yaml public/assets/events/spyder_paper_rival_downstairs.yaml`
   - `cp upstream/mods/tuxemon/maps/spyder_paper_rival_bedroom.yaml public/assets/events/spyder_paper_rival_bedroom.yaml`
   - `cp upstream/mods/tuxemon/maps/spyder_paper_rival_office.yaml public/assets/events/spyder_paper_rival_office.yaml`
   - Replace the hand-written stubs entirely. Normalize tab indentation to 2-space if the loader rejects tabs, but otherwise preserve event names, action order, condition order, and x/y/width/height verbatim.
   - Reviewer `diff`s each against upstream and confirms only whitespace differs.

3. **Sanity-verify Billie's sprite is byte-identical to upstream** (per `[[feedback_sprite_byte_compare]]`)
   - `cmp public/assets/sprites/fashionista.png upstream/mods/tuxemon/sprites/fashionista.png` — must be 0 diff. (Confirmed during planning, but re-run to guard against regression.)
   - Confirm dimensions are 48×128 per `[[feedback_npc_qa_dimension_check]]`. (Confirmed during planning.)

4. **Verify dialog msgids resolve**
   - Spot-check all `spyder_rivaldownstairs_*`, `spyder_rivalbedroom_*`, `spyder_rivaloffice_*`, `spyder_billie`, `spyder_billie_flashback*`, `spyder_billie_tv_flashback*` are present in `public/assets/l10n/en_US.po` with non-empty `msgstr`. (All confirmed during planning at lines 15367, 16185-16330.)

5. **No engine changes expected.** Every action and condition referenced in the three YAMLs is already registered:
   - Actions: `transition_teleport`, `char_face`, `translated_dialog`, `translated_dialog_choice`, `set_variable`, `clear_variable`, `set_layer`, `set_template`, `char_position`, `create_npc`, `remove_npc`, `wait`, `lock_controls`, `unlock_controls`, `play_music`, `access_pc`, `tune_radio` (stub at `stubs.ts:30`).
   - Conditions: `char_facing_tile`, `button_pressed`, `variable_set`, `char_at`, `char_facing`, `char_sprite`, `music_playing`.
   - If anything turns out to be missing at implementation time, file a journal note and stub minimally rather than expanding scope.

## Engine-side considerations

- **`tune_radio` is a no-op stub.** The bedroom's Radio interactable will silently do nothing; this is fine. Do NOT add a real radio dialog — upstream leans on the engine's tune-radio system (time-of-day-selected `spyder_rivalbedroom_radio_{morning,afternoon,…}` strings), and we'll port that as a separate story. The verbatim port + stub is the acceptance bar.
- **`music_home` is a console-log stub.** Harmless; `play_music` resolves to a log line.
- **The TV-Yes flashback uses `set_template player,invisible` + `set_layer 102:51:0:128` + `char_position` to puppeteer the player.** These are registered but may render partially (sepia tint may not actually display, player may stay visible). Reviewer should confirm the cutscene **completes** end-to-end (advances through all 8 dialogs, despawns Billie, sets `flashback:off`, clears `billie_tv`) without crashing — the visual fidelity of the tint/invisibility is **out of scope** here (same posture as STORY-0212).
- **The "Default Template" event** is a cleanup tick that resets the player from `invisible` back to `default` once `billie_grandma:done` is set. It fires repeatedly (no x/y, no one-shot guard beyond the two conditions). This is the upstream-canonical way of handling the post-flashback restore from the daycare side. Don't be alarmed by it firing every frame; once it executes, both conditions clear (template no longer invisible). Trust the upstream pattern.
- **Two `set_variable flashback:on` calls** (Flashback Yes, TV-Yes) and a `set_variable flashback:off` at the end of TV-Yes — these gate other map events globally and are leveraged in STORY-0212. Don't drop them.
- **Bedroom-side and office-side stairs are floor tiles**, not adjacent door-frames. When the player walks onto `(0,3)` in the bedroom or `(6,3)` in the office with the right facing, the teleport fires. The downstairs has corresponding stairs at `(0,3)` (to office) and `(3,3)` (to bedroom), with **opposite facing requirements** (left for office, right for bedroom). Critical: the bedroom teleport sends the player back to downstairs `(3,3)` and faces them **left**; the office teleport sends them back to downstairs `(0,3)` and faces them **right**. If the implementor accidentally swaps these, the player will get stuck looping back into a stair tile. Verify against the YAML, don't guess.
- **The Flashback Yes event has no x/y/width/height** — it's a "fires whenever the condition is true on the current map" event. So selecting "yes" in the Flashback choice immediately yanks the player into the daycare on the next event tick. Same for TV-Yes.
- **The Default Template condition uses `is char_sprite player,invisible`** — that's the condition syntax registered at `src/game/event/conditions/charSprite.ts:5`. Reviewer can verify the condition resolves true after `set_template player,invisible` runs.
- **Town doormat alignment:** town teleport at `(32,5)` lands the player at downstairs `(1,11)` facing up. The Go Outside event covers `(0..2, 11)` width 3, so `(1,11)` is on the trigger — but it only fires on `is char_facing player,down`, so the entry-facing-up arrival is safe and won't immediately re-teleport. Same pattern as the manor.

## QA Validation

Use `/puppeteer`. Add **`qa/paper-rival-test.ts`** that covers all three maps' entries/exits, both stairwells in both directions, all interactables, and both flashbacks (force-triggered via variables).

1. **Front door entry from town:**
   - `setupGame({ map: "spyder_paper_town", tileX: 32, tileY: 6 })` (one south of the door tile at `(32,5)`).
   - Walk player onto `(32,5)` facing up so `Teleport to Rival` fires.
   - Wait for map change to `spyder_paper_rival_downstairs`. Assert player lands at `(1,11)` facing up and map slug is `rival_downstairs` (not `paper_rival_downstairs`).
   - Assert map dimensions are 11×12.
   - Screenshot `qa/screenshots/paper-rival-downstairs-entry.png`.

2. **Downstairs interactables (TV + Package, pre-flashback variants):**
   - `walkTo(4,8)` facing up so the player is south of the TV at `(4,7)`. INTERACT. Assert dialog opens with text matching `spyder_rivaldownstairs_tv`, then `spyder_billie_tv_flashback_trigger`, then a no/yes choice prompt opens. Pick **no** (the default). Assert `billie_tv` is set to `no` and `flashback:on` is set. Screenshot `qa/screenshots/paper-rival-tv-prompt.png` mid-prompt.
   - `walkTo(8,10)` facing up so the player is south of the Package at `(8,9)`. INTERACT. Assert `spyder_rivaldownstairs_package` + `spyder_billie_flashback_trigger` dialogs play, then a no/yes choice prompt opens. Pick **no**. Assert `billie_grandma` is set to `no`.
   - Re-INTERACT the Package. With `billie_grandma` set (to `no`), the **Package** event (not Flashback) fires — assert only `spyder_rivaldownstairs_package` plays this time (no choice prompt). This confirms the gated-once-decided behavior.

3. **Bedroom stairwell (downstairs → bedroom → back):**
   - `walkTo(3,3)` facing right (the Go Bedroom trigger). Wait for teleport. Assert player on `spyder_paper_rival_bedroom` at `(0,3)` facing right. Assert map dimensions 7×7 and slug `rival_bedroom`. Screenshot `qa/screenshots/paper-rival-bedroom-entry.png`.
   - From `(0,3)`, walk back onto `(0,3)` facing left (the Go Downstairs trigger). Wait for teleport. Assert player on `spyder_paper_rival_downstairs` at `(3,3)` facing left.

4. **Bedroom interactables:**
   - Re-enter the bedroom. Cover each:
     - **Bed** at `(5,5) width 2 height 2`: `walkTo(5,4)` facing down (or `(4,5)` facing right), INTERACT, assert `spyder_rivalbedroom_bed` dialog. Screenshot `qa/screenshots/paper-rival-bed.png`.
     - **Bookshelf** at `(5,2) width 2`: stand at `(5,3)` facing up, INTERACT, assert `spyder_rivalbedroom_bookshelf`.
     - **Use Computer** at `(2,3)`: stand at `(2,4)` facing up, INTERACT, assert the PC menu opens (the access_pc action — verify the engine's PC scene appears or that the action runs without crashing; the PC UI itself is out of scope to validate here).
     - **Radio** at `(0,5)`: stand at `(1,5)` facing left, INTERACT, assert the action runs (tune_radio stub no-ops — just check no crash, no dialog).
     - **Weights** at `(1,6)`: stand at `(2,6)` facing left or `(1,5)` facing down, INTERACT, assert `spyder_rivalbedroom_weights`.

5. **Office stairwell (downstairs → office → back):**
   - Return to downstairs. `walkTo(0,3)` facing left (the Go Office trigger). Wait for teleport. Assert player on `spyder_paper_rival_office` at `(6,3)` facing left. Assert 7×7 + slug `rival_office`. Screenshot `qa/screenshots/paper-rival-office-entry.png`.
   - From `(6,3)`, walk back onto `(6,3)` facing right. Wait for teleport. Assert player on `spyder_paper_rival_downstairs` at `(0,3)` facing right.

6. **Office interactables:**
   - Re-enter office. **Haiku** at `(2,4)`: stand at `(2,5)` facing up (or `(3,4)` facing left), INTERACT, assert `spyder_rivaloffice_haiku` dialog. Screenshot `qa/screenshots/paper-rival-haiku.png`.

7. **Front-door exit:**
   - Return to downstairs. `walkTo(1,11)` facing down. Wait for teleport. Assert player on `spyder_paper_town` at `(32,6)` facing down. Screenshot `qa/screenshots/paper-rival-downstairs-exit.png`.

8. **TV flashback cutscene (force-trigger):**
   - `setupGame({ map: "spyder_paper_rival_downstairs", tileX: 4, tileY: 8, variables: { billie_tv: "yes" } })`. The TV-Yes event has no x/y, so it should fire immediately on map entry.
   - Watch for: controls lock, player position jumps to `(6,8)` facing left, sepia/invisible state (don't assert visual fidelity — see Engine-side considerations), Billie spawns at `(4,8)` facing up, dialog lines `spyder_billie_tv_flashback1`..`8` advance (alternating `,,top` per upstream), Billie despawns, controls unlock, `flashback:off` and `billie_tv` cleared.
   - Screenshot mid-cutscene `qa/screenshots/paper-rival-tv-flashback.png` (during one of the dialog lines, ideally a `,,top` one to confirm dialog-box positioning).

9. **Package-to-Daycare flashback round-trip (the campaign hook for STORY-0212):**
   - `setupGame({ map: "spyder_paper_rival_downstairs", tileX: 8, tileY: 10 })` (one south of the package).
   - Walk onto `(8,10)` facing up. INTERACT the Package at `(8,9)`. Pick **yes** in the choice prompt. Assert `billie_grandma:yes` is set.
   - The Flashback Yes event (no x/y, condition `billie_grandma:yes`) fires on the next tick: assert `transition_teleport` to `spyder_paper_daycare`, player lands at `(0,3)`, `flashback:on` is set.
   - If STORY-0212 has already landed, the daycare's FlashBack event fires here (12 dialogs, Billie pathfinds, Granny moves, `billie_grandma:done` is set, teleport back to `spyder_paper_rival_downstairs.tmx,7,9`). Assert end state: player back on downstairs at `(7,9)`, `billie_grandma:done`, `flashback:off`. Then the **Default Template** event resets the player template to default (assert `char_sprite player,default`).
   - If STORY-0212 has not yet landed, skip the daycare-side assertion and just confirm the player arrives at daycare `(0,3)` — note in the QA script that the round-trip assertion is unblocked once STORY-0212 lands. Reviewer can re-run after.
   - Screenshot `qa/screenshots/paper-rival-flashback-yes-daycare.png` after the teleport.

10. **Collision sanity (smoke check, not exhaustive):**
    - Downstairs: try `walkTo(0,0)`, `walkTo(5,5)`, `walkTo(8,9)` — all blocked (collisions at `(0,0,11,3)`, `(3,4,8,3)`, `(8,9,2,2)`).
    - Bedroom: try `walkTo(0,0)` (north wall) and `walkTo(5,5)` (the 2×2 block) — both blocked.
    - Office: try `walkTo(0,0)` (north wall) and `walkTo(5,5)` (the 2×2 block) — both blocked.

11. **Reference comparison:**
    - For each of the three maps, capture an upstream visual reference (open the TMX in Tiled or render via the upstream client) and save to `qa/screenshots/paper-rival-{downstairs,bedroom,office}-upstream-reference.png` (committed). Reviewer compares against our `paper-rival-downstairs-entry.png` / `paper-rival-bedroom-entry.png` / `paper-rival-office-entry.png` — same furniture placement, same wall/floor colors, same staircase positions, same TV/Package/Haiku positions. Floor tile color may differ slightly due to our renderer; layout must match.

## Out of scope

- **`spyder_paper_daycare`** — separate story (STORY-0212). The Flashback Yes → Daycare teleport is the cross-story hook; STORY-0214's job is to set `billie_grandma:yes` and teleport the player into the daycare map. The daycare-side cutscene playback is STORY-0212's job. If STORY-0212 hasn't landed when STORY-0214 is in review, the round-trip QA assertion (step 9, second half) is allowed to be skipped — reviewer notes this in the journal.
- **`spyder_paper_manor`** — separate story (STORY-0213).
- **Real `tune_radio` time-of-day-based dialog selection.** Bedroom's Radio interactable stays a no-op stub. The `spyder_rivalbedroom_radio_*` strings are present in l10n for future use; this story does not wire them up.
- **Real audio asset for `music_home`.** Stays a console-log stub.
- **Real sepia tint / invisible-player rendering for TV-Yes and the upstream Default Template restore.** The cutscene must complete end-to-end (state transitions correct, no crash); visual fidelity of `set_layer` / `set_template invisible` is out of scope (consistent with STORY-0212 posture).
- **Real PC UI from `access_pc`.** Whatever the engine does today (open the PC scene or no-op) is fine; just verify the action runs without crashing.
- **Lore/dialog rewrites.** All dialog ships verbatim from upstream l10n; do not re-add stub flavor like "weather report on the TV" or "Kitchen Counter" from the hand-rolled YAMLs.
- **Adding NPCs beyond what upstream's YAML defines.** Only Billie appears in the rival house, and only inside the TV-Yes cutscene. No always-present NPCs.

## Acceptance Criteria

- [ ] `public/assets/maps/spyder_paper_rival_downstairs.json` is a verbatim Tiled-JSON export of upstream's 11×12 TMX (correct dimensions, four tilesets at firstgids `1/2971/6835/10699`, layer names `Tile Layer 1/2/3` + `Above player` all opacity 1, slug `rival_downstairs`, all 8 collision rects in the `Collisions` object layer per STORY-0212's convention).
- [ ] `public/assets/maps/spyder_paper_rival_bedroom.json` is a verbatim 7×7 export with four tilesets at firstgids `1/3865/7729/9279` (last one being the **embedded `Interiors_16x16`** with `image: "Interiors_16x16.png"`, `tilecount: 2592`, `columns: 16`, no `source`), slug `rival_bedroom`, all 5 collisions present.
- [ ] `public/assets/maps/spyder_paper_rival_office.json` is a verbatim 7×7 export with four tilesets at firstgids `1/3865/7729/9279` (last one being the **embedded `Office_interiors_shadowless_16x16`** with `image: "Office_interiors_shadowless_16x16.png"`, `tilecount: 528`, `columns: 22`, no `source`), slug `rival_office`, all 3 collisions present.
- [ ] `public/assets/events/spyder_paper_rival_downstairs.yaml` is a `cp`-verbatim copy of upstream (whitespace-only diffs allowed). All 10 events present (`Default Template`, `Flashback`, `Flashback Yes`, `Go Bedroom`, `Go Office`, `Go Outside`, `Package`, `Route Music`, `TV`, `TV Yes`). No fabricated `Watch TV`, `Kitchen Counter`, `Bookshelf Right/Left`.
- [ ] `public/assets/events/spyder_paper_rival_bedroom.yaml` is a `cp`-verbatim copy of upstream. All 7 events present (`Bed`, `Bookshelf`, `Go Downstairs`, `Radio`, `Route Music`, `Use Computer`, `Weights`).
- [ ] `public/assets/events/spyder_paper_rival_office.yaml` is a `cp`-verbatim copy of upstream. All 3 events present (`Go Downstairs`, `Haiku`, `Route Music`).
- [ ] `public/assets/sprites/fashionista.png` is byte-identical to `upstream/mods/tuxemon/sprites/fashionista.png` (`cmp` returns 0).
- [ ] All `spyder_rivaldownstairs_*`, `spyder_rivalbedroom_*`, `spyder_rivaloffice_*`, `spyder_billie`, `spyder_billie_flashback*`, and `spyder_billie_tv_flashback*` msgids resolve to non-empty strings in `public/assets/l10n/en_US.po`.
- [ ] All actions/conditions referenced in the three YAMLs (`access_pc`, `tune_radio` stub, `set_template`, `set_layer`, `char_position`, `char_sprite` condition, `translated_dialog_choice`, `clear_variable`, etc.) are registered and do not throw at runtime.
- [ ] `qa/paper-rival-test.ts` passes: town entry lands at downstairs `(1,11)`, both stairwells round-trip (downstairs ↔ bedroom via `(3,3) ↔ (0,3)`, downstairs ↔ office via `(0,3) ↔ (6,3)`), front-door exit teleports to town `(32,6)`, all 5 bedroom interactables + 1 office interactable + 2 downstairs interactables fire their correct dialogs, the TV-Yes cutscene completes end-to-end (all 8 dialog lines advance, Billie spawns at `(4,8)` then despawns, `flashback:off` + `billie_tv` cleared), and the Package "yes" choice teleports the player to `spyder_paper_daycare.tmx,0,3` with `billie_grandma:yes` set (round-trip back to downstairs `(7,9)` asserted once STORY-0212 lands).
- [ ] Reference screenshots `qa/screenshots/paper-rival-{downstairs,bedroom,office}-upstream-reference.png` are checked in; reviewer confirms our entry screenshots match their layouts.
- [ ] All existing QA scripts still pass (no regressions from the map/YAML replacements).
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass.
