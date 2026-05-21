# STORY-0213: Port spyder_paper_manor verbatim — Princeton's one-room house

## Description

Port the Paper Town **Manor** building byte-for-byte from upstream Tuxemon. The current `public/assets/maps/spyder_paper_manor.json` is a 9×9 hand-rolled stub (wrong dimensions, wrong slug `paper_manor`, wrong tileset firstgids 1/1170/2362) and `public/assets/events/spyder_paper_manor.yaml` is hand-written flavor (Princeton at the wrong tile, three fabricated dialog branches, a "Kitchen Counter" and "Bookshelf" that don't exist upstream). Replace both with verbatim ports of `upstream/mods/tuxemon/maps/spyder_paper_manor.tmx` (10×8) and `spyder_paper_manor.yaml`, and confirm the single Princeton NPC + the only door teleport land correctly.

The manor is the smallest of the three remaining Paper Town houses: **one room, one NPC (Princeton, the old man), one dialog line, one door**. There is no flashback, no sub-rooms, no shop, no music-stub gotchas beyond `music_cathedral_theme`. This story should be quick.

This is one of three sibling stories porting the Paper Town houses (STORY-0212 Daycare is already planned; STORY-0214 Rival House is in parallel planning — both out of scope here).

## Context

### Upstream reference

- **Map:** `upstream/mods/tuxemon/maps/spyder_paper_manor.tmx` — 10 cols × 8 rows, `tilewidth=16`. Uses three tilesets, all already shipped in `public/assets/maps/`:
  - `core_indoor_floors.tsx` (firstgid 1)
  - `core_indoor_walls.tsx` (firstgid 3865)
  - `core_set pieces.tsx` (firstgid 7729)
  - Map properties: `edges=clamped`, `inside=true`, `scenario=spyder`, **`slug=manor`** (not `paper_manor` — fix from current stub), `map_type=notype`.
  - 4 visible tile layers: `Tile Layer 1`, `Tile Layer 2`, `Tile Layer 3`, `Above player` (all opacity 1 in upstream — note lowercase `p` in "Above player", and note this differs from the daycare's lowercase-and-0.97-opacity convention).
  - **No `<objectgroup>` in the TMX at all** — collisions live in the YAML (unlike the daycare, which had collisions in the TMX). Our Tiled-JSON exporter typically writes collisions into a `Collisions` object layer; the implementor should follow whatever STORY-0212 lands on for daycare. If the convention is "collisions stay in YAML", do that; if it's "promote YAML collisions into the JSON's `Collisions` layer", do that. Either is acceptable as long as the 7 collision rects are in *exactly one* of the two files and our loader picks them up.
- **Events YAML:** `upstream/mods/tuxemon/maps/spyder_paper_manor.yaml` — 7 collision entries + 4 events. **Literal `cp` target** (modulo tabs→spaces if our loader cares).
- **Princeton NPC definition:** `upstream/mods/tuxemon/db/npc/spyder_paper_town_npcs.yaml` — `slug: spyder_papermanor_princeton`, `sprite_name: maniac_yellow`, `template.slug: maniac`. **Already registered correctly** in `src/game/data/npcs.ts:31` as `spritesheet: "maniac_yellow"`. Sprite already shipped at `public/assets/sprites/maniac_yellow.png` and **already byte-identical** to `upstream/mods/tuxemon/sprites/maniac_yellow.png` (verified during planning via `cmp`). No sprite work needed beyond a sanity re-`cmp` per `[[feedback_sprite_byte_compare]]`.
- **Dialog msgids** — both manor msgids (`spyder_papermanor_princeton` = "Princeton"; `spyder_papermanor_oldman` = the one-paragraph monologue about sons + sailor + niece) already exist in `public/assets/l10n/en_US.po` with non-empty `msgstr`. **No new l10n work needed.**

### Upstream events (4 total, all in YAML)

1. **Create Princeton** — `create_npc spyder_papermanor_princeton,1,5` + `char_face spyder_papermanor_princeton,right`. Spawn-once guard `not char_exists`. (Current stub spawns at `(4,5)` facing **down** — wrong tile, wrong facing.)
2. **Go Outside** — `(6,7)`, walk-onto + facing down, `transition_teleport player,spyder_paper_town.tmx,10,13,0.3` + `char_face player,down`. This is the only door; lands the player on the town doormat one tile south of the entry trigger at `(10,12)`.
3. **Route Music** — `play_music music_cathedral_theme` if not already playing. (Our `play_music` is a console-log stub; harmless. Current stub uses `music_town_theme` — wrong track.)
4. **Talk Princeton** — `behav: talk spyder_papermanor_princeton`, action `translated_dialog spyder_papermanor_oldman`. **One dialog line, no variable gates, no branches.** (Current stub has three fabricated branches keyed on `got_starter`, `seentimber`, etc. — remove them all.)

### Upstream collisions (7 rects, from YAML; pixel rects = tile×16)

| YAML idx | x,y (tiles) | w,h (tiles) | pixel rect             |
|----------|-------------|-------------|------------------------|
| 1        | (2,4)       | 2×2         | x=32,y=64,w=32,h=32    |
| 2        | (0,7)       | 1×1         | x=0,y=112,w=16,h=16    |
| 3        | (9,7)       | 1×1         | x=144,y=112,w=16,h=16  |
| 4        | (9,2)       | 1×1         | x=144,y=32,w=16,h=16   |
| 5        | (7,3)       | 1×3         | x=112,y=48,w=16,h=48   |
| 6        | (0,1)       | 10×1        | x=0,y=16,w=160,h=16    |
| 7        | (0,2)       | 1×1         | x=0,y=32,w=16,h=16     |

### Current state (our codebase)

- `public/assets/maps/spyder_paper_manor.json` — 9×9 hand-stub, slug `paper_manor`, wrong firstgids, only 3 collision rects in a `Collisions` object layer. **Replace.**
- `public/assets/events/spyder_paper_manor.yaml` — hand-written stub with fabricated `Talk Princeton Early/Has Monster/Post Timber` branches, fake `Kitchen Counter` and `Bookshelf` interactables, wrong `music_town_theme`, Princeton spawned at `(4,5)` facing down instead of `(1,5)` facing right. **Replace entirely.**
- `src/game/data/maps.ts:598` — `spyder_paper_manor` registered. No changes needed (json path unchanged).
- `src/game/scenes/OverworldScene.ts:138` — events YAML preload registered. No changes needed.
- `src/game/data/npcs.ts:31` — `spyder_papermanor_princeton` → `maniac_yellow` registered correctly. No changes needed.
- `public/assets/events/spyder_paper_town.yaml` — town side already teleports `(10,12)` → `spyder_paper_manor.tmx,6,7` facing up. No changes needed; matches upstream verbatim.

### Template story

This is "STORY-0212 in miniature". Read `board/next/STORY-0212-paper-daycare-content/STORY.md` for the procedure, conventions, and gotchas — manor is the same shape but with fewer events and no flashback. If STORY-0212 lands first and establishes a Tiled-export script or collision-handling convention, follow it. If this story lands first, the daycare implementor will follow your lead.

## What to build

1. **Re-export the TMX → Tiled-JSON**
   - From `upstream/mods/tuxemon/maps/spyder_paper_manor.tmx`, produce a new `public/assets/maps/spyder_paper_manor.json` matching upstream byte-for-byte in dimensions/layers/firstgids. Use the same procedure as STORY-0197/STORY-0212 (e.g. `tiled --export-map --embed-tilesets`, then strip tileset `source` paths to bare filenames — see `spyder_paper_scoop.json` for the canonical shape).
   - Preserve upstream firstgids `1 / 3865 / 7729` so tile indices line up with the upstream PNGs we already ship.
   - Keep the four tile layers verbatim: `Tile Layer 1`, `Tile Layer 2`, `Tile Layer 3`, `Above player` (lowercase `p`, all opacity 1).
   - Map properties: `edges=clamped`, `inside=true`, `scenario=spyder`, **`slug=manor`** (was `paper_manor`), `map_type=notype`.
   - **Sanity-check the produced JSON dimensions are 10×8, not the existing stub's 9×9.**

2. **Literal copy of the event YAML**
   - `cp upstream/mods/tuxemon/maps/spyder_paper_manor.yaml public/assets/events/spyder_paper_manor.yaml`. Replace the current hand-written stub entirely.
   - If `cp` produces tab indentation that our loader rejects, normalize to 2-space indent but otherwise change nothing — preserve event names (`Create Princeton`, `Go Outside`, `Route Music`, `Talk Princeton`), action order, condition order, and the 7 collision entries with their exact x/y/width/height fields.
   - Whether the 7 `collisions:` entries live in the YAML, get promoted into the JSON `Collisions` layer, or are duplicated in both, **must match STORY-0212's resolution**. Reviewer enforces parity between the two stories.
   - Reviewer should `diff` our YAML against upstream's and confirm only whitespace differs.

3. **Sanity-verify Princeton sprite is byte-identical to upstream** (per `[[feedback_sprite_byte_compare]]`)
   - `cmp public/assets/sprites/maniac_yellow.png upstream/mods/tuxemon/sprites/maniac_yellow.png` — must be 0 diff. (Confirmed during planning, but re-run to guard against regressions.)
   - Confirm dimensions are 48×128 per `[[feedback_npc_qa_dimension_check]]`.

4. **Verify dialog msgids resolve**
   - Spot-check `spyder_papermanor_princeton` and `spyder_papermanor_oldman` are both present in `public/assets/l10n/en_US.po` with non-empty `msgstr`. (Confirmed during planning.)

5. **No engine changes expected.** Every action and condition referenced in the upstream YAML (`create_npc`, `char_face`, `transition_teleport`, `play_music`, `translated_dialog`; conditions `char_exists`, `char_at`, `char_facing`, `music_playing`; behav `talk`) is already registered and routinely used by adjacent maps. If anything turns out to be missing at implementation time, file a journal note and stub minimally rather than expanding scope.

## Engine-side considerations

- **`music_cathedral_theme` is a console-log stub** — we don't ship audio assets. Harmless; the `play_music` call resolves to a log line. Don't bounce for missing audio.
- **The town doormat → manor entry → re-exit loop has a one-tile offset:** town `(10,12)` teleports to manor `(6,7)`; manor `(6,7)` (facing down) teleports back to town `(10,13)`. So the player enters facing up, then walking *down* re-triggers `Go Outside` and lands one tile south of the entry. This is verbatim upstream behavior — do not "fix" it. Confirm town tiles `(10,12)` and `(10,13)` are walkable in `spyder_paper_town.json` (they were audited in STORY-0196).
- **Princeton spawn tile `(1,5)` facing right** lines him up looking across the room toward the doorway. The current stub has him at `(4,5)` facing down — make sure your QA assertions check the verbatim coords, not the old ones.
- **No variable gates on the dialog.** The current stub has three branches keyed on `got_starter` / `seentimber`; **delete all of that flavor**. Upstream has exactly one line that fires every time the player talks to Princeton, regardless of campaign progress.

## QA Validation

Use `/puppeteer`. Add **`qa/paper-manor-test.ts`** that covers the entry, Princeton dialog, and exit. This is a small, linear script — no variable-state matrix like the daycare needed.

1. **Front door entry from town:**
   - `setupGame({ map: "spyder_paper_town", tileX: 10, tileY: 13 })` (one south of the door tile).
   - Walk player onto `(10,12)` facing up so `Teleport to Manor` fires.
   - Wait for map change to `spyder_paper_manor`. Assert player lands at `(6,7)` facing up and the map slug is `manor` (not `paper_manor`).
   - Assert map dimensions are 10×8.
   - Screenshot `qa/screenshots/paper-manor-entry.png`.

2. **Princeton spawn:**
   - Assert `spyder_grannypiper`-style: `spyder_papermanor_princeton` exists at `(1,5)` facing right. (Use the same NPC-lookup helper the daycare QA uses; if none exists yet, add one to `qa/harness.ts` mirroring the existing NPC helpers.)

3. **Talk Princeton:**
   - `walkTo(2,5)` (face Princeton from his right).
   - INTERACT. Assert dialog opens with text matching `spyder_papermanor_oldman` (the "two sons and a niece" monologue). Advance to close.
   - Screenshot `qa/screenshots/paper-manor-princeton-dialog.png` showing the dialog box.
   - INTERACT a second time. Assert the **same** dialog fires again (no variable-gated branching).

4. **Front-door exit:**
   - `walkTo(6,7)` from above; ensure facing down. Wait for teleport.
   - Assert player is now on `spyder_paper_town` at `(10,13)` facing down.
   - Screenshot `qa/screenshots/paper-manor-exit.png` showing the player back outside on the doormat.

5. **Collision sanity (smoke check, not exhaustive):**
   - From the manor interior, try to `walkTo(2,4)` (the 2×2 block centered upper-left). Assert the player cannot enter — `char_at` should remain unchanged for that tile.
   - Try to `walkTo(7,3)` (the 1×3 vertical bar). Assert blocked.
   - This confirms the 7 YAML collision rects are being respected by whatever ingestion path STORY-0212 lands on.

6. **Reference comparison:**
   - Take an upstream visual reference: open the TMX in Tiled (or render via the upstream Tuxemon client) and capture the manor interior, save to `qa/screenshots/paper-manor-upstream-reference.png` (committed). Reviewer compares against `paper-manor-entry.png` — same furniture placement, same wall colors, same doorway at `(6,7)`, Princeton standing at `(1,5)`. Floor tile color may differ slightly due to our renderer; layout must match.

## Out of scope

- **`spyder_paper_daycare`** — separate planning story (STORY-0212).
- **`spyder_paper_rival_*`** (rival house: downstairs, bedroom, office) — separate planning story (STORY-0214).
- **Real cathedral music asset.** `music_cathedral_theme` stays a console-log stub (no audio engine).
- **Adding any NPCs, items, or interactables beyond what upstream's YAML defines.** Princeton is alone in this room upstream. Resist the urge to re-add the stub's "Kitchen Counter" or "Bookshelf" flavor interactables — they aren't there in the canonical game.
- **Lore/dialog rewrites.** Princeton's one monologue ships verbatim from upstream l10n.

## Acceptance Criteria

- [ ] `public/assets/maps/spyder_paper_manor.json` is a verbatim Tiled-JSON export of upstream's 10×8 TMX (correct dimensions, layer names `Tile Layer 1/2/3` + `Above player`, firstgids 1/3865/7729, slug `manor`, all 7 collision rects represented per STORY-0212's convention).
- [ ] `public/assets/events/spyder_paper_manor.yaml` is a `cp`-verbatim copy of `upstream/mods/tuxemon/maps/spyder_paper_manor.yaml` (whitespace-only diffs allowed). All 4 events present (`Create Princeton`, `Go Outside`, `Route Music`, `Talk Princeton`); no fabricated `Kitchen Counter`, `Bookshelf`, or extra Princeton-dialog branches.
- [ ] `public/assets/sprites/maniac_yellow.png` is byte-identical to `upstream/mods/tuxemon/sprites/maniac_yellow.png` (`cmp` returns 0).
- [ ] Both manor dialog msgids (`spyder_papermanor_princeton`, `spyder_papermanor_oldman`) resolve to non-empty strings in `public/assets/l10n/en_US.po`.
- [ ] All actions and conditions referenced in the YAML are registered and do not throw at runtime.
- [ ] `qa/paper-manor-test.ts` passes: entry from town `(10,12)` lands the player at manor `(6,7)`, Princeton is spawned at `(1,5)` facing right, his dialog fires the `spyder_papermanor_oldman` string with no variable gating, exit at `(6,7)` facing down lands player back on town `(10,13)`, and the two sampled collision tiles `(2,4)` + `(7,3)` are non-walkable.
- [ ] Reference screenshot `qa/screenshots/paper-manor-upstream-reference.png` is checked in; reviewer confirms our `paper-manor-entry.png` matches its layout.
- [ ] All existing QA scripts still pass (no regressions from the map/YAML replacement).
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass.
