# STORY-0212: Port spyder_paper_daycare verbatim — Granny Piper + Billie flashback

## Description

Port the Paper Town **Daycare** building byte-for-byte from upstream Tuxemon. The current `public/assets/maps/spyder_paper_daycare.json` is a generic 15×10 indoor stub copy-pasted from the candy_center map and the events YAML is hand-written flavor text; neither matches upstream. Replace both with verbatim ports of `upstream/mods/tuxemon/maps/spyder_paper_daycare.tmx` (14×9) and `spyder_paper_daycare.yaml`, register the Granny Piper NPC and her dialog branches, and wire up the front (`3,8`) and back (`13,7`) exit teleports that paper_town already points at.

The daycare is a small one-room building with **Granny Piper** as the daycare lady. Upstream supports a literal "leave a monster here" daycare mechanic via the `daycare` action — that engine action is **already stubbed out** in `src/game/event/actions/stubs.ts:26` (no breeding/swap functionality), so the verbatim port is fine: the action will no-op silently and the dialog around it still plays. The cell also hosts a major narrative beat — the **Billie / Grandma flashback** — but that one only fires when the player approaches from `spyder_paper_rival_downstairs` with `billie_grandma:yes` set (a flag set much later in the campaign in the rival house). The flashback is part of the verbatim port, but it's gated behind unimplemented downstream campaign state, so we port it and document that it won't fire end-to-end yet.

This is one of three sibling stories porting the Paper Town houses (STORY-0213 Manor, STORY-0214 Rival House are the other two — out of scope here).

## Context

### Upstream reference

- **Map:** `upstream/mods/tuxemon/maps/spyder_paper_daycare.tmx` — 14 cols × 9 rows, `tilewidth=16`. Uses three tilesets, all already shipped in `public/assets/maps/`:
  - `core_indoor_floors.tsx` (firstgid 1)
  - `core_indoor_walls.tsx` (firstgid 3865)
  - `core_set pieces.tsx` (firstgid 7729)
  - Map properties: `edges=clamped`, `inside=true`, `scenario=spyder`, `slug=daycare`, `map_type=notype`.
  - 4 visible tile layers: `Layer 1`, `Layer 2`, `Layer 3`, `Above Player` (opacity 0.97).
  - 7 collision rectangles (ids 8, 12, 13, 16, 18, 24, 25 in the TMX), notably the full-width north wall at `x=0,y=32,w=224,h=16` and the back-door frame around `(10,5)..(10,6)`.
- **Events YAML:** `upstream/mods/tuxemon/maps/spyder_paper_daycare.yaml` — 14 events, already structured as YAML. **This is a literal `cp` target** (modulo upstream's tab-vs-spaces; YAML semantics are identical to our loader).
- **Granny Piper NPC definition:** `upstream/mods/tuxemon/db/npc/spyder_paper_town_npcs.yaml` — `slug: spyder_grannypiper`, `sprite_name: granny_yellow`. **Already registered correctly** in `src/game/data/npcs.ts:27` as `spritesheet: "granny_yellow"`, and the sprite PNG is shipped at `public/assets/sprites/granny_yellow.png`. Apply `[[feedback_npc_qa_dimension_check]]` to confirm dimensions are 48×128 and byte-compare against `upstream/mods/tuxemon/sprites/granny_yellow.png`.
- **Dialog msgids** — all 7 Granny Piper strings already exist in `public/assets/l10n/en_US.po` (`spyder_papertown_grannypiper1`, `2`, `3`, `4`, `8`, `9`, `10` — search the file). The full Billie flashback set (`spyder_billie_flashback1` .. `12`, `_end`) is also already there. **No new l10n work needed** — just verify msgids resolve.

### Current state (our codebase)

- `public/assets/maps/spyder_paper_daycare.json` — generic 15×10 indoor stub, **wrong size, wrong layout, wrong slug** (`paper_daycare` instead of `daycare`). Replace.
- `public/assets/events/spyder_paper_daycare.yaml` — hand-written stub with 8 fabricated events (Granny welcome flavor, two "monster pen" interactables, two "shelf" interactables). Replace entirely.
- `src/game/data/maps.ts:605` — `spyder_paper_daycare` map registered. No changes needed (json path unchanged).
- `src/game/scenes/OverworldScene.ts:139` — events YAML preload registered. No changes needed.
- `src/game/data/npcs.ts:27` — `spyder_grannypiper` → `granny_yellow` registered. No changes needed.
- `src/game/event/actions/stubs.ts:26` — `daycare` action stubbed (no-op). Fine.
- `public/assets/events/spyder_paper_town.yaml:101,498` — town side already teleports to `spyder_paper_daycare.tmx,3,8` (front) and `13,7` (back). No changes needed.

### Template story

This is essentially "STORY-0197 lite for the daycare". Follow the same recipe: TMX export with upstream firstgids preserved, then `cp` the events YAML verbatim. Read `board/done/STORY-0197-port-paper-scoop-starter-pick/STORY.md` and its JOURNAL for the procedure.

### Upstream event inventory (14 events)

The implementer should `cp` the file rather than transcribe these, but here's the inventory so the reviewer can verify nothing's missing:

1. **Create Granny Piper** — spawns `spyder_grannypiper` at `(3,6)` facing right (only if not already spawned). She's the one NPC in the room.
2. **FlashBack Billie Grandma** — large cutscene: locks controls, sets player invisible (`set_template player,invisible`), `set_layer 102:51:0:128` for the sepia-tint, spawns Billie at `(13,7)`, Billie pathfinds to `(4,6)`, 12 `translated_dialog` lines (`spyder_billie_flashback1`..`12`), pathfinds Billie to `(3,8)` and removes her, Granny walks to `(2,3)`, final dialog (`spyder_billie_flashback_end`), `set_variable billie_grandma:done`, restores layer, unlocks, `set_variable flashback:off`, then **teleports player to `spyder_paper_rival_downstairs.tmx,7,9`** (i.e. *back* into the rival downstairs). Gated on `is variable_set billie_grandma:yes` (a flag the player picks up much later — never fires in current intro flow).
3. **Music** — `play_music music_cathedral_theme` if not already playing. (Our `play_music` is a console-log stub; harmless.)
4. **Pamphlet 1** — `(8,5)`, INTERACT, dialog `spyder_papertown_grannypiper8`. Gated on `seentimber:yes`.
5. **Pamphlet 2** — `(8,5)`, INTERACT, dialog `spyder_papertown_grannypiper10`. Gated on `not seentimber:yes` (the "before opening" variant).
6. **Return Monster No** — clears `return_monster:no` → `null`. (Internal daycare-action housekeeping; won't fire because our `daycare` stub never sets `return_monster`.)
7. **Talk Granny Piper No Monster** — `behav: talk spyder_grannypiper`, dialog `spyder_papertown_grannypiper9`. Gated on party_size ≤ 1 AND `seentimber:yes` AND `introducedaycare:yes`.
8. **Talk Granny Piper Open 1** — `behav: talk spyder_grannypiper`, dialog `spyder_papertown_grannypiper3`, sets `introducedaycare:yes`. Gated on `seentimber:yes` AND `not introducedaycare:yes` (first-time opening dialog after Timber).
9. **Talk Granny Piper Yes Monster** — `behav: talk spyder_grannypiper`, dialog `spyder_papertown_grannypiper4`, action `daycare player` (opens the daycare UI in upstream; stubbed no-op for us). Gated on party_size > 1 AND `seentimber:yes` AND `introducedaycare:yes`.
10. **Talk Granny Piper1** — `behav: talk spyder_grannypiper`, dialog `spyder_papertown_grannypiper1`, sets `spokengrannypiper:yes`. Gated on `not spokengrannypiper:yes` AND `not seentimber:yes` (first-meeting greeting before Timber).
11. **Talk Granny Piper2** — `behav: talk spyder_grannypiper`, dialog `spyder_papertown_grannypiper2`. Gated on `spokengrannypiper:yes` AND `not seentimber:yes` (subsequent greeting before Timber).
12. **Teleport to Back** — `(13,7)`, walk-onto + facing right, `transition_teleport player,spyder_paper_town.tmx,22,3,0.3` + `char_face player,right`. This is the back exit (town side at `(22,3)`).
13. **Teleport to Cotton Town** — name is a copy-paste typo from upstream; this is the **front door** at `(2,8)` width 2 height 1, walk-onto + facing down, `transition_teleport player,spyder_paper_town.tmx,20,5,0.3` + `char_face player,down`. Lands the player one tile south of the daycare's front doormat in paper_town.

## What to build

1. **Re-export the TMX → Tiled-JSON**
   - From `upstream/mods/tuxemon/maps/spyder_paper_daycare.tmx`, produce a new `public/assets/maps/spyder_paper_daycare.json` matching upstream byte-for-byte in dimensions/layers/collisions/firstgids. Use whatever procedure STORY-0197 used (`tiled --export-map --embed-tilesets` then strip tileset paths to bare filenames — see scoop json for the canonical shape). Preserve upstream firstgids `1 / 3865 / 7729` so tile indices line up with the upstream PNGs we already ship.
   - The four tile layers in upstream are `Layer 1`, `Layer 2`, `Layer 3`, and `Above Player` (with opacity 0.97). Keep the names verbatim.
   - Keep the 7 collision objects verbatim (ids `8, 12, 13, 16, 18, 24, 25`, pixel rects per the TMX).
   - Map properties: `edges=clamped`, `inside=true`, `scenario=spyder`, **`slug=daycare`** (not `paper_daycare` — fix from current stub), `map_type=notype`.
   - **Sanity-check the produced JSON dimensions are 14×9, not the existing stub's 15×10.**
   - Tileset PNGs are already shipped; no new asset copy needed.

2. **Literal copy of the event YAML**
   - `cp upstream/mods/tuxemon/maps/spyder_paper_daycare.yaml public/assets/events/spyder_paper_daycare.yaml`. Replace the current hand-written stub entirely.
   - If `cp` produces tab-indentation that our loader rejects, normalize to 2-space indent but otherwise change nothing (preserve event names, action order, condition order, x/y/width/height fields).
   - Reviewer should `diff` our YAML against upstream's and confirm only whitespace differs.

3. **Verify Granny Piper sprite is byte-identical to upstream** (per `[[feedback_sprite_byte_compare]]`)
   - `cmp public/assets/sprites/granny_yellow.png upstream/mods/tuxemon/sprites/granny_yellow.png` — must be 0 diff. If they differ, replace ours with upstream's copy.
   - Confirm dimensions are 48×128 (3 frames × 4 directions) per `[[feedback_npc_qa_dimension_check]]`.

4. **Verify dialog msgids resolve**
   - Spot-check `spyder_papertown_grannypiper1`, `2`, `3`, `4`, `8`, `9`, `10` are all present in `public/assets/l10n/en_US.po` with non-empty `msgstr`. (They were already there as of the file scan during planning — flag any that have empty translations and port from upstream if so.)
   - Same for `spyder_billie_flashback1`..`12` and `spyder_billie_flashback_end` (the flashback won't fire in normal play, but the dialog needs to be resolvable when it eventually does).

5. **No engine changes expected.** Cross-check that every action used in the YAML is already registered (`create_npc`, `char_face`, `lock_controls`, `unlock_controls`, `set_template`, `set_layer`, `pathfind`, `translated_dialog`, `remove_npc`, `set_variable`, `transition_teleport`, `play_music`, `daycare` (stub), `char_stop`). All were present as of planning. Same for conditions (`char_exists`, `char_facing_tile`, `button_pressed`, `variable_set`, `party_size`, `char_at`, `char_facing`, `music_playing`). If anything turns out to be missing at implementation time, file a journal note and stub it minimally rather than expanding scope.

## Engine-side considerations

- **`daycare player` is a no-op.** Upstream opens a multi-screen UI to deposit/retrieve monsters; we don't have that and `[[feedback ...]]` notes are silent on adding it. The dialog around it (`grannypiper4`) still plays correctly. Reviewer should not bounce for missing daycare UI.
- **The FlashBack cutscene won't fire in normal play.** It's gated on `billie_grandma:yes`, which is set in `spyder_paper_rival_downstairs` events (rival house, STORY-0214 scope). Port verbatim; QA exercises it by force-setting the variable.
- **`set_template player,invisible` and `set_layer 102:51:0:128`** are used by the flashback for the sepia tint. Both already exist as registered actions (`src/game/event/actions/setTemplate.ts`, `setLayer.ts`). They may be no-ops or partial in our engine — don't fix that here; if the flashback QA below reveals issues, file followup. The dialog flow must still progress past them.
- **The back-door teleport returns to town `(22,3)`**, which is on the upper road in `spyder_paper_town`. Confirm that tile is walkable in the current town JSON before running QA; if not, the bounce-back teleport works but the player will get stuck. Town side at `(22,3)` and front-door return `(20,5)` were both audited as walkable in STORY-0196, so this should be fine.
- **`introducedaycare`, `spokengrannypiper`, `seentimber` variables**: none are currently primed by `setupGame()`. Default QA (no variables) lands in the pre-Timber branch (`Talk Granny Piper1`). To exercise the post-Timber Granny dialogs, the implementor should pass `variables: { seentimber: "yes", introducedaycare: "yes" }` to setupGame.

## QA Validation

Use `/puppeteer`. Add **`qa/paper-daycare-test.ts`** that covers both entries and all three Granny dialog branches:

1. **Front door entry from town:**
   - `setupGame({ map: "spyder_paper_town", tileX: 20, tileY: 6 })` (one south of the front-door tile).
   - Walk player onto `(20,5)` facing up so `Teleport to Daycare` fires.
   - Wait for map change to `spyder_paper_daycare`. Assert player lands at `(3,8)` and the map slug is `daycare`.
   - Screenshot `qa/screenshots/paper-daycare-front-entry.png`.

2. **Granny spawn + first-meeting dialog (`Talk Granny Piper1`):**
   - In the same session, `walkTo(3,7)` (face Granny who's at `(3,6)`).
   - Assert `spyder_grannypiper` exists at `(3,6)` facing right.
   - INTERACT. Assert dialog opens with text matching `spyder_papertown_grannypiper1`. Advance.
   - Assert `spokengrannypiper=yes` is set.
   - Screenshot `qa/screenshots/paper-daycare-granny-first.png` showing the dialog box.

3. **Second-meeting dialog (`Talk Granny Piper2`):**
   - Still no `seentimber`. INTERACT again. Assert dialog matches `spyder_papertown_grannypiper2`.

4. **Post-Timber "introducing the daycare" dialog (`Talk Granny Piper Open 1`):**
   - `setupGame({ map: "spyder_paper_daycare", tileX: 3, tileY: 7, variables: { seentimber: "yes" } })`.
   - INTERACT facing Granny. Assert dialog matches `spyder_papertown_grannypiper3` and `introducedaycare=yes` is set.

5. **"No monsters in party" branch (`Talk Granny Piper No Monster`):**
   - `setupGame({ map: "spyder_paper_daycare", tileX: 3, tileY: 7, monsters: [], variables: { seentimber: "yes", introducedaycare: "yes" } })`.
   - INTERACT. Assert dialog matches `spyder_papertown_grannypiper9`.

6. **"Has monsters" branch (`Talk Granny Piper Yes Monster`, opens stubbed daycare):**
   - `setupGame({ map: "spyder_paper_daycare", tileX: 3, tileY: 7, variables: { seentimber: "yes", introducedaycare: "yes" } })` (default party has budaye L5 — that's `party_size > 1`? Verify: upstream condition is `is party_size player,greater_than,1` which means strictly >1; default setupGame gives a 1-monster party so this branch *won't* fire with defaults. Pass `monsters: [{ slug: "budaye", level: 5 }, { slug: "rockitten", level: 5 }]`).
   - INTERACT. Assert dialog matches `spyder_papertown_grannypiper4`. Verify the `daycare` action ran (console log "daycare: no-op stub" or similar — implementer may need to add a one-line console log to the stub if it doesn't already log, just enough to assert in QA). No crash, no hang.

7. **Pamphlet at (8,5):**
   - From the same setup (post-Timber), `walkTo(8,6)` facing up. INTERACT. Assert dialog matches `spyder_papertown_grannypiper8`.
   - Repeat with `seentimber` unset to confirm Pamphlet 2 (`spyder_papertown_grannypiper10`) fires instead.

8. **Front-door exit:** `walkTo(3,8)` facing down. Wait for teleport. Assert player is now on `spyder_paper_town` at `(20,5)` facing down. Screenshot `qa/screenshots/paper-daycare-front-exit.png` showing the player back outside.

9. **Back-door entry from town:**
   - `setupGame({ map: "spyder_paper_town", tileX: 22, tileY: 4 })`.
   - Walk onto `(22,3)` facing up (the `Teleport to Daycare Back` tile in `spyder_paper_town.yaml:498`).
   - Wait for map change. Assert player at `(13,7)` on `spyder_paper_daycare`.
   - Screenshot `qa/screenshots/paper-daycare-back-entry.png`.

10. **Back-door exit:** still on daycare, `walkTo(13,7)` facing right. Assert teleport back to `spyder_paper_town` at `(22,3)` facing right.

11. **Flashback cutscene (force-trigger):**
    - `setupGame({ map: "spyder_paper_daycare", tileX: 3, tileY: 8, variables: { billie_grandma: "yes" } })`.
    - The event has no x/y trigger area, so it should fire on map entry. Watch for: controls lock, Billie spawn at `(13,7)`, dialogs `spyder_billie_flashback1`..`12` + `_end` advance without crashing, Billie despawns, Granny moves to `(2,3)`, **player teleports to `spyder_paper_rival_downstairs.tmx,7,9`**.
    - Assert `billie_grandma=done` and `flashback=off` at the end.
    - Screenshot mid-cutscene `qa/screenshots/paper-daycare-flashback.png` (during one of the dialog lines).
    - **Sepia tint / invisible-player may not visually render correctly** (set_layer / set_template are partial); flag in journal if so but don't bounce — the cutscene completing + state transitions are the acceptance bar.

12. **Reference comparison:**
    - Take an upstream screenshot for visual reference: have the implementor run the upstream Tuxemon (or open the TMX in Tiled and capture) the daycare interior, save to `qa/screenshots/paper-daycare-upstream-reference.png` (committed). Reviewer compares against `paper-daycare-front-entry.png` — same furniture placement, same wall colors, same pamphlet sign at `(8,5)`, same back-door frame at `(10-11, 5-7)`. Floor tile color may differ slightly due to our renderer; layout must match.

## Out of scope

- **`spyder_paper_manor`** — separate planning story (STORY-0213).
- **`spyder_paper_rival_*`** (rival house: downstairs, bedroom, office) — separate planning story (STORY-0214).
- **Real daycare UI** (deposit/withdraw a monster, the `daycare player` action). Upstream has a dedicated `PartySelector → DaycareState` UI; we keep the action stubbed. Add a TODO/comment in `stubs.ts` referencing this story for future implementation.
- **Real cathedral music asset.** `music_cathedral_theme` stays a console-log stub (no audio engine).
- **Real sepia tint / invisible-player for the flashback.** If `set_layer` / `set_template` need engine work, that's a separate refactor; this story just confirms the action calls don't crash.
- **Wiring the flashback into the natural campaign flow** (i.e. making `billie_grandma:yes` reachable via gameplay). That happens through `spyder_paper_rival_downstairs` events, which belong to STORY-0214.

## Acceptance Criteria

- [ ] `public/assets/maps/spyder_paper_daycare.json` is a verbatim Tiled-JSON export of upstream's 14×9 TMX (correct dimensions, layer names, firstgids 1/3865/7729, slug `daycare`, all 7 collisions, `Above Player` opacity 0.97).
- [ ] `public/assets/events/spyder_paper_daycare.yaml` is a `cp`-verbatim copy of `upstream/mods/tuxemon/maps/spyder_paper_daycare.yaml` (whitespace-only diffs allowed). All 14 events present, no fabricated events.
- [ ] `public/assets/sprites/granny_yellow.png` is byte-identical to `upstream/mods/tuxemon/sprites/granny_yellow.png` (`cmp` returns 0).
- [ ] All 7 Granny Piper dialog msgids and all 13 Billie flashback msgids resolve to non-empty strings in `public/assets/l10n/en_US.po`.
- [ ] All actions and conditions referenced in the YAML are registered (`daycare`, `set_template`, `set_layer`, etc.) and do not throw at runtime.
- [ ] `qa/paper-daycare-test.ts` passes: front + back door entries land at the correct tiles, all three Granny dialog branches fire under the right variable conditions, both pamphlet variants fire, exits teleport back to the correct town tiles, the flashback cutscene completes end-to-end (with player teleported to `spyder_paper_rival_downstairs.tmx,7,9`) when force-triggered with `billie_grandma:yes`.
- [ ] Reference screenshot `qa/screenshots/paper-daycare-upstream-reference.png` is checked in; reviewer confirms our `paper-daycare-front-entry.png` matches its layout.
- [ ] All existing QA scripts still pass (no regressions from the map/YAML replacement).
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass.
