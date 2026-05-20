# STORY-0196: Port spyder_paper_town map + Dante "Stop!" blocker from upstream

## Description

Port the `spyder_paper_town` map and its event objects from current upstream Tuxemon. The key new event is **"Stop!"** at tile (208/16, 16/16) — i.e. tile (13,1) — which blocks the player from walking north onto Route 1 until they have a monster: `spyder_dante` spawns, dialogues, escorts the player back, then leaves.

**Depends on**: STORY-0194 (player can reach Paper Town via the bedroom→downstairs→outside path; though strictly the "Stop!" event only triggers once you're outside, which today means via setupGame or via STORY-0195's bedroom flow if you walk down through downstairs).

### Upstream reference

- `upstream/mods/tuxemon/maps/spyder_paper_town.tmx` — events are stored as Tiled objects **inside the TMX**, not in a companion `.yaml`. This is the one place in the intro flow where we can't just `cp` upstream's content over — paper_town's events have to be extracted from TMX objects into our `.yaml` format (mechanical conversion, not a rewrite).
- The "Stop!" event spec (line 155 of the TMX) — conditions and actions are encoded as `<property name="cond..." value="..."/>` and `<property name="act..." value="..."/>` pairs. Pixel coords convert to tile coords by dividing by 16.
- `upstream/mods/tuxemon/l18n/en_US/LC_MESSAGES/base.po` — msgid `spyder_papertown_stopthere`:
  > "Hey! What do you think you're doing?\n It's not safe to go into the wilds unless you have a tuxemon.\n Come buy one from our shop."

### What to build

1. **Port the TMX map**
   - Export `upstream/mods/tuxemon/maps/spyder_paper_town.tmx` to our Tiled-JSON format using the same procedure as past map-port stories (`tiled --export-map --embed-tilesets`, decompress base64/zlib layers to plain int arrays, strip tileset paths to bare filenames).
   - Copy any tileset PNGs not already in `public/assets/maps/`.
   - Register the map in `src/game/data/maps.ts`.

2. **Extract event objects from TMX → YAML**
   - Convert each Tiled `<object type="event">` in `spyder_paper_town.tmx` into a YAML event entry in `public/assets/events/spyder_paper_town.yaml`. This is a **mechanical 1-1 translation** — each `<property name="cond10" value="is char_at player"/>` becomes a line in `conditions:`, each `<property name="actNN" value="..."/>` becomes a line in `actions:` (preserve numerical ordering — cond10 before cond20, act10 before act20). Coord conversion: `x="208" y="16" width="32" height="16"` → `x: 13, y: 1, width: 2, height: 1`.
   - **No editorializing.** Don't reword conditions, don't skip events, don't add events that aren't in the upstream TMX. The output YAML should be reproducible by anyone running the same extraction.
   - Our current `spyder_paper_town.yaml` is hand-written and **not** from upstream — replace it entirely. Drop the Silver-trainer / Granny-Piper / sign events unless they exist in the upstream TMX (they don't — verify).
   - The "Stop!" event (verbatim):
     ```yaml
     Stop!:
       x: 13
       y: 1
       width: 2
       height: 1
       conditions:
       - is char_at player
       - is party_size player,less_than,1
       actions:
       - lock_controls
       - char_stop player
       - create_npc spyder_dante,15,8
       - pathfind_to_char player,spyder_dante,right
       - char_face spyder_dante,left
       - translated_dialog spyder_papertown_stopthere
       - pathfind player,13,3
       - char_face player,down
       - pathfind spyder_dante,13,14
       - remove_npc spyder_dante
       - unlock_controls
       type: event
     ```
     (Coordinates above translate the TMX pixel coords `x="208" y="16" width="32" height="16"` into our tile system: 208/16=13, 16/16=1, width 32/16=2, height 16/16=1.)

3. **Register `spyder_dante` NPC sprite**
   - Likely shared with STORY-0197 — coordinate so we don't double-register.
   - Source: `upstream/mods/tuxemon/sprites/spyder_dante.png` (check `[[project_npc_sprite_assets]]` memory: canonical NPC sprites live in `upstream/mods/tuxemon/sprites/`).
   - Add to our NPC registry per existing conventions; verify against upstream `sprite_name` per `[[feedback_npc_registry_audit]]`.

4. **Port `spyder_papertown_stopthere` dialogue**
   - Append the msgid + msgstr from `upstream/mods/tuxemon/l18n/en_US/LC_MESSAGES/base.po` to `public/assets/l10n/en_US.po`. Multi-line string — use the continuation-line PO format our `loadPO` parser already handles.

5. **Door / building entrances**
   - Upstream's `spyder_paper_town.tmx` includes entrances for the scoop building, manor, daycare, rival house, and route-1 transitions. Port them all (verbatim) so the map is fully usable. Coordinates must match upstream — they tie into the scoop entry point (4,8) that STORY-0195 teleports to.

### Engine notes

- All actions used (`lock_controls`, `char_stop`, `create_npc`, `pathfind_to_char`, `char_face`, `translated_dialog`, `pathfind`, `remove_npc`, `unlock_controls`, `transition_teleport`) are registered.
- All conditions (`char_at`, `party_size`, `char_facing`, `char_facing_tile`, `button_pressed`, `variable_set`) are registered.
- **`party_size` condition** — verify our implementation supports the upstream syntax `is party_size player,less_than,1`. If we only support equality, extend it.

### Keep `setupGame()` working

`setupGame()` (in `src/game/debug.ts`) adds a starter monster by default, so QA scripts teleporting to `spyder_paper_town` shouldn't trip the "Stop!" event. Verify:
- A QA script that calls `setupGame({ map: "spyder_paper_town", tileX: 13, tileY: 5 })` (with default monster) walks to (13,1) without triggering the blocker.
- A QA script that calls `setupGame({ ..., monsters: [] })` *does* trigger the blocker (intentional — this story's own QA relies on it).
- If you discover that any other QA script accidentally lands on this map with an empty party, that's a regression in this story — fix it.

### QA Validation

Use `/puppeteer`. Add `qa/paper-town-block-test.ts`:

1. Launch + `setupGame({ map: "spyder_paper_town", tileX: 13, tileY: 5, monsters: [] })` — drop the player on the map with **no monsters**.
2. Walk player north to tile (13, 2) and step on (13, 1).
3. Verify `spyder_dante` is created at (15, 8) and dialog `spyder_papertown_stopthere` appears.
4. Advance dialog. Verify player ends up at (13, 3) facing down, `spyder_dante` despawns.
5. Re-step on (13, 1) — verify the event re-fires (no `intro_scoop:done` gate; it should re-fire as long as party is empty).
6. Now `setupGame({ map: "spyder_paper_town", tileX: 13, tileY: 5, monsters: [{ slug: "budaye", level: 5 }] })`. Walk north to (13, 1). Verify the "Stop!" event does NOT fire (condition `party_size < 1` is false).

## Acceptance Criteria

- [ ] `spyder_paper_town.tmx` ported and registered in `maps.ts`
- [ ] `public/assets/events/spyder_paper_town.yaml` contains a verbatim "Stop!" event
- [ ] `spyder_dante` NPC sprite registered with correct upstream `sprite_name`
- [ ] `spyder_papertown_stopthere` msgid in `public/assets/l10n/en_US.po`
- [ ] All upstream building entrances and route transitions present
- [ ] `qa/paper-town-block-test.ts` passes
- [ ] `setupGame()` with default monster bypasses the "Stop!" blocker on paper_town; all existing QA scripts that call it still pass unchanged
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
