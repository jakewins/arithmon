# STORY-0200: Port spyder_downstairs.tmx — kitchen, mom NPC, exit to town

## Description

Port the `spyder_downstairs` map from upstream Tuxemon. This is the kitchen/living-room of the player's house — the connecting tile between `spyder_bedroom.tmx` (upstairs) and `spyder_paper_town.tmx` (outdoors). Bedroom's `Go Downstairs` event teleports here at (0,2), and there's a `Go Outside` event that exits south to paper_town at (10,7).

The map's events live as Tiled objects inside the TMX (no companion YAML) — same mechanical conversion as STORY-0196's paper_town port, but much smaller scope.

**Depends on**: STORY-0195 (bedroom is done, has a `Go Downstairs` event at (7,2) → `spyder_downstairs.tmx,0,2`). STORY-0196 will use this map as the natural route from bedroom to paper_town.

### Upstream reference

- `upstream/mods/tuxemon/maps/spyder_downstairs.tmx` — the map and events (read it before writing the YAML; this is the source of truth).
- `upstream/mods/tuxemon/l18n/en_US/LC_MESSAGES/base.po` — dialog msgids: `spyder_papertown_mom1` / `mom2` / `mom3` / `mom4` (and possibly later-campaign variants).

### Expected event inventory

Read the TMX directly — this list is the rough spec, not the source of truth.

- **Create Homemaker** — spawn mom NPC (likely `spyder_papertown_mom`) at her wander origin, `char_wander spyder_papertown_mom,,1,2,7,5` (bounded wander). Gated on `not char_exists spyder_papertown_mom`.
- **Talk mom1** — first meeting dialog (`spyder_papertown_mom1`), state-gated on a first-meeting var.
- **Talk mom2** — "no monster yet" dialog (`spyder_papertown_mom2`), gated on `party_size < 1` + first-meeting done.
- **Talk mom3** — "you have a monster" dialog (`spyder_papertown_mom3`), gated on `party_size > 0`.
- **Talk mom4** — "won a battle" dialog (`spyder_papertown_mom4`), gated on a post-first-fight var.
- Additional later-campaign Talk mom variants (port verbatim).
- **Go Outside** — `transition_teleport player,spyder_paper_town.tmx,10,7,0.3` + `char_face player,down`, gated on `is char_at player` + `is char_facing player,down`.
- **Go Upstairs** — `transition_teleport player,spyder_bedroom.tmx,7,2,0.3`, on the stairs tile.
- **Play Music** — `play_music music_home` gated on `not music_playing music_home`.
- Anything else the TMX has (furniture-inspect signs, etc.) — port verbatim.

### What to build

1. **Port the TMX map**
   - Export `upstream/mods/tuxemon/maps/spyder_downstairs.tmx` to our Tiled-JSON format using the standard procedure. Register in `src/game/data/maps.ts`.
   - Copy any tileset PNGs not already in `public/assets/maps/`.

2. **Extract event objects from TMX → YAML**
   - Write `public/assets/events/spyder_downstairs.yaml`. Mechanical 1-1 conversion of every `<object type="event">` in the TMX. No editorializing, no skipped events.
   - Coord conversion: divide pixel coords by 16.

3. **Register the `spyder_papertown_mom` NPC**
   - Source sprite: `upstream/mods/tuxemon/sprites/spyder_papertown_mom.png` (verify path).
   - Add to `src/game/data/npcs.ts` with `spritesheet: <upstream_sprite_name>`. Apply `[[feedback_npc_registry_audit]]` and `[[feedback_npc_qa_dimension_check]]`.

4. **Verify `char_wander` action**
   - `Create Homemaker` uses `char_wander <npc>,,<x1>,<y1>,<x2>,<y2>` to bound wander to a rectangle. If our action doesn't support bounded wandering, extend it (or stub with no-op wandering — the mom NPC just stands still, doesn't crash). Document the deviation.

5. **Port dialog msgids**
   - Append `spyder_papertown_mom1` through `mom4` and any later-campaign variants from upstream `base.po` to `public/assets/l10n/en_US.po`.

### Engine notes

- All actions/conditions should be the same set as paper_town: `transition_teleport`, `char_face`, `play_music`, `create_npc`, `char_wander`, `translated_dialog`, `set_variable`, `char_at`, `char_facing`, `char_exists`, `variable_set`, `party_size`, `music_playing`, `button_pressed`, `char_facing_tile`. All registered.

### Keep `setupGame()` working

`setupGame()` doesn't currently visit downstairs. After this story:
- QA scripts teleporting to `spyder_downstairs` with default monster should not trigger any cutscene. Verify by adding the map slug as a valid `setupGame` target.
- All existing QA scripts must still pass.

### QA Validation

Use `/puppeteer`. Add `qa/spyder-downstairs-test.ts`:

1. `setupGame({ map: "spyder_downstairs", tileX: 0, tileY: 2 })`. Verify mom NPC spawns (Create Homemaker fired).
2. Walk to mom, press INTERACT. Verify Talk mom dialog fires (the variant depends on current state — for default setupGame with a monster, expect `mom3`).
3. Walk to (10,7) facing down. Verify teleport to `spyder_paper_town.tmx,10,7`.
4. From bedroom: `setupGame({ map: "spyder_bedroom", tileX: 7, tileY: 2 })`. Walk down onto (7,2). Verify teleport to `spyder_downstairs.tmx,0,2`. (Confirms STORY-0195 → STORY-0200 handoff still works.)

## Acceptance Criteria

- [ ] `spyder_downstairs.tmx` exported to Tiled-JSON and registered in `maps.ts`
- [ ] `public/assets/events/spyder_downstairs.yaml` is a verbatim mechanical port of every `<object type="event">` in the TMX
- [ ] `spyder_papertown_mom` NPC registered with correct upstream `sprite_name`, byte-verified per `[[feedback_sprite_byte_compare]]`
- [ ] All Talk mom msgids and any other dialogs appended to `en_US.po`
- [ ] `char_wander` bounded variant works (or stub is documented + crash-free)
- [ ] `qa/spyder-downstairs-test.ts` passes
- [ ] `setupGame()` supports `spyder_downstairs` as a target map; existing QA scripts pass unchanged
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
