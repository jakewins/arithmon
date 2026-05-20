# STORY-0196: Port full spyder_paper_town.tmx — map + all event objects

## Description

Port the `spyder_paper_town` map AND its complete event-object layer from upstream Tuxemon. This is the largest story in the intro series because paper_town is where the actual starter-pick and first-battle happen. Despite the prior planner's "literal copy" framing, paper_town's events live as TMX `<object type="event">` properties (not a companion YAML), and there are ~50 events — only one of which is the "Stop!" blocker that the earlier draft of this story called out.

This story replaces the previous narrower draft (which only described porting "Stop!" and a handful of building entrances). After landing this story, the player can: be blocked walking north until they have a monster, go into the mart (which teleports to the scoop yard), come back out, get intercepted by Dante who walks them to the bin area, pick one of five starter monsters via individual bin interactions, then immediately engage in a first battle against Billie.

**Depends on**:
- STORY-0201 (monster info viewer) — the bin events use `open_journal <slug>` to show the monster info screen as part of their interaction.
- STORY-0197 (scoop port) — the scoop's `Talk Dante No Party` event sets `dantefirst:yes`, which is the gate that makes `My First Mon - Not Met` fire in paper_town. Without 0197, the bin flow can't start.
- STORY-0200 (downstairs) is the natural way the player gets to paper_town, but not strictly required since `setupGame` can drop them straight here.

### Upstream reference

- `upstream/mods/tuxemon/maps/spyder_paper_town.tmx` — the TMX file. **Events are inside the TMX as `<object type="event">` properties — not in a companion YAML.** Mechanical conversion is required: each `<property name="cond10" value="X"/>` becomes a line in `conditions:`, each `<property name="actNN" value="Y"/>` becomes a line in `actions:`, pixel coords convert to tile coords via `/16`.
- `upstream/mods/tuxemon/l18n/en_US/LC_MESSAGES/base.po` — every dialog msgid referenced below.
- `upstream/mods/tuxemon/db/item/friendship_scroll.yaml` — item definition.
- `upstream/mods/tuxemon/db/npc/spyder_route3_zoolander.json` — Billie's trainer team (may already exist in our `src/game/data/npcParties.ts` — verify).

### Full event inventory (~50 events)

Read the TMX yourself before writing the YAML — this list is the spec, but the TMX is the source of truth.

**Blockers** (gate movement on `party_size < 1`):
- `Stop!` at (13, 1) width 2 height 1 — north exit. Dante spawns at (15,8), pathfinds to player, dialog `spyder_papertown_stopthere`, escorts player to (13,3), Dante walks to (13,14), removed.
- `Stop 2!` at (1, 14) width 1 height 4 — west exit. Same idea, dialog `spyder_papertown_stopthere`, escorts to (4,12).

**Bin / starter-pick flow** (gates on `dantefirst:yes` + `not dantebin:yes`, then `party_size < 1`):
- `My First Mon - Not Met` at (23, 13) width 9 height 1 — fires when player walks into the south-road strip with `dantefirst:yes` set + `dantebin` not set + party empty. Dante spawns at (19,13), walks to player, dialog `spyder_papertown_myfirstmon_notmet`, walks to (26,9), dialog `myfirstmon1`, wait 1s, dialog `myfirstmon2`, walks to (19,13), removed, sets `dantebin:yes`.
- `My First Mon` at (23, 13) width 9 height 1 — same trigger area but gates on a different player state (likely the "you have met him before" variant). Read TMX for the exact `cond` set.
- 5 individual **bin events** at the bins near the daycare. For each: dialog `spyder_papertown_thereis` → `open_journal <slug>` → dialog `spyder_papertown_<slug>` → `translated_dialog_choice yes:no,<slug>chosen`. Conditions: `is char_facing_tile player` + `is button_pressed INTERACT` + `is party_size player,less_than,1`.
  - `Rockitten` at (22, 9) width 1 height 2
  - `Lambert` at (22, 11)
  - `Nut` at (27, 9)
  - `Tweesher` at (29, 9)
  - `Agnite` at (30, 11)
- 5 **Chosen events** at (32, 8) / (32, 10) / etc. — auto-fire when the corresponding `Xchosen:yes` var is set AND party is still empty. For each: `add_monster <slug>,5` → `translated_dialog <slug>,,center,center,center` → `set_variable firstfightdue:yes` → `set_variable mymonchoice:<slug>`.

**First fight** (gates implicit on `firstfightdue:yes` proximity):
- `First Fight - Start` at (25, 8): locks controls, `set_teleport_faint player,spyder_bedroom.tmx,3,4`, `add_item friendship_scroll,1`, spawns Billie at (13,14), Billie pathfinds to (25,13), waits 1s, pathfinds to player, faces, dialog `spyder_papertown_firstfight`, `add_monster billie_choice,5,spyder_billie,5,10` (note: gives Billie *the player's scoop choice* as her monster — `billie_choice` is set by the scoop, see STORY-0197), `start_battle spyder_route3_zoolander`.
- `First Fight - Win` at (24, 8): dialog `firstfight_win`, Billie walks to (25,14), wait 1s, dialog `firstfight_pause`, Billie pathfinds to player, dialog `firstfight_after`, Billie walks to (15,14), removed, unlock controls, **`set_monster_health` + `set_monster_status`** (heals player's party), sets `firstfightend:yes`.
- `First Fight - Lose` at (26, 8): dialog `firstfight_lose`, Billie walks to (25,14), wait, pathfind to player, dialog `firstfight_after`, walks to (15,14), removed, unlock, heals, sets `firstfightend:no`. (Note: player respawns at bedroom 3,4 on faint via `set_teleport_faint`. Read TMX carefully to understand exactly when the Lose event fires relative to faint.)

**Building / route entrances**:
- `Teleport to Mart` at (19, 12): `transition_teleport player,spyder_paper_scoop.tmx,6,10,0.3` + `char_face player,up`. Condition: `is char_at player`. **No party gate** — the mart is always enterable (this is how the player gets to Dante on the second scoop visit).
- `Teleport to Daycare`, `Teleport to Daycare Back`, `Teleport to Manor`, `Teleport to Rival`, `Teleport to Protagonist House`, `Teleport to Route 1`, `Teleport to Brideswood A`, `Teleport to Brideswood B`, `Teleport to Sea Route` — port verbatim with whatever conditions upstream uses (some may gate on later campaign state; if so, port the gate).

**Signs and props** (mostly `translated_dialog` on INTERACT):
- `Mart Sign`, `Paper Town Sign`, `Sign for Daycare After Opening`, `Sign for Daycare Before Opening`, `Sign for Protagonist House`, `Sign for Rival House`, `Sign for Sunnyside Manor`, `Sign Repairs`, `Under Repairs` — verbatim port.

**Background NPCs** (post-campaign, may not fire during intro — port anyway so post-intro behaves correctly):
- `Create Homemaker` + `Talk homemaker` — outdoor villager.
- `Create Captain` + `Talk Captain - Candy` / `Talk Captain - Flower` / `Talk Captain - Timber` + `Destination - Candy` / `Flower` / `Leather` / `Paper` / `Timber` — the boat captain at the south dock.
- `Create Conileaf` + `Create Rockitten` — wild-grass spawns or decorative NPCs (read TMX).
- `Environment Day` / `Environment Night` — time-of-day tint, if our engine supports it; otherwise stub.

**Music**:
- `Play Music` — `play_music music_town_theme` gated on `not music_playing music_town_theme`.

### What to build

1. **Port the TMX map**
   - Export `upstream/mods/tuxemon/maps/spyder_paper_town.tmx` to our Tiled-JSON format using the standard procedure (`tiled --export-map --embed-tilesets`, decompress base64/zlib layers, strip tileset paths). Register in `src/game/data/maps.ts`.
   - Copy any tileset PNGs not already in `public/assets/maps/`.

2. **Extract event objects from TMX → YAML**
   - For each `<object type="event">` in the TMX, write the equivalent YAML entry in `public/assets/events/spyder_paper_town.yaml`. Mechanical conversion only — no editorializing, no skipping events, no adding events.
   - Preserve `cond10/20/30/...` numerical ordering when writing `conditions:` lists; same for `actNN`.
   - The current `public/assets/events/spyder_paper_town.yaml` is hand-written and divergent from upstream — **replace it entirely**.

3. **Port `friendship_scroll` item**
   - Read `upstream/mods/tuxemon/db/item/friendship_scroll.yaml`, add the equivalent entry to `src/game/data/items.ts`. Copy the item sprite from upstream to `public/assets/items/` (create the dir if missing). If the upstream item has effects we don't support (e.g. a friendship-stat boost), stub them in a way that doesn't crash; flag the gap in a comment.

4. **Verify `spyder_route3_zoolander` trainer + `spyder_billie` NPC**
   - `src/game/data/npcs.ts` and `src/game/data/npcParties.ts` already have entries for both. Re-verify against upstream:
     - `spyder_billie` `sprite_name` (we have `spritesheet: "fashionista"` — confirm upstream agrees). Apply `[[feedback_npc_registry_audit]]`.
     - `spyder_route3_zoolander` party — read upstream `db/npc/spyder_route3_zoolander.json`. Check the level-5 starter that Billie uses matches what `add_monster billie_choice,5,spyder_billie,5,10` is supposed to inject (the second `add_monster` call gives Billie the player's scoop pick as a fixed party slot — port the action and confirm our `add_monster` action supports the 5-arg form `<slug>,<level>,<npc>,<level>,<max_hp>` or whatever the upstream signature is).

5. **Port required dialog msgids**
   - Append to `public/assets/l10n/en_US.po`, verbatim from upstream:
     - `spyder_papertown_stopthere`
     - `spyder_papertown_thereis`
     - `spyder_papertown_rockitten`, `_lambert`, `_nut`, `_tweesher`, `_agnite`
     - `spyder_papertown_myfirstmon`, `_myfirstmon_notmet`, `_myfirstmon1`, `_myfirstmon2`
     - `spyder_papertown_firstfight`, `_firstfight_win`, `_firstfight_lose`, `_firstfight_pause`, `_firstfight_after`
     - `spyder_papertown_mart_sign` and all other sign msgids referenced by the ported events
     - Captain dialogs (`spyder_papertown_captain*`) if relevant
   - Monster name msgids (`rockitten`, `lambert`, `nut`, `tweesher`, `agnite`) are likely already in our PO from prior monster-line stories — verify, port if missing.

6. **Verify engine support for every action and condition used**
   - Actions: `lock_controls`, `unlock_controls`, `char_stop`, `create_npc`, `pathfind`, `pathfind_to_char`, `char_face`, `translated_dialog`, `translated_dialog_choice`, `set_variable`, `set_monster_health`, `set_monster_status`, `set_teleport_faint`, `add_item`, `add_monster` (1-arg, 2-arg, AND multi-arg forms), `start_battle`, `transition_teleport`, `wait`, `remove_npc`, `open_journal`, `play_music`.
   - Conditions: `char_at`, `char_facing`, `char_facing_tile`, `button_pressed`, `variable_set`, `party_size`, `battle_outcome`, `music_playing`, `char_exists`.
   - If any aren't implemented or behave differently from upstream, fix here. Don't bypass with stubs — the intro flow won't work if any of these misbehave.
   - **`add_monster` multi-arg form** is the riskiest one — confirm it can give a monster to a specific NPC (not just the player).

### Engine notes

- `set_teleport_faint` should persist the respawn-on-faint location for the rest of the session (or until overwritten). Current implementation may already handle this — verify.
- `start_battle <npc_slug>` should pull the NPC's party from `npcParties.ts` and run a trainer battle. The post-battle teleport-on-loss is handled by `set_teleport_faint`; the post-battle win/lose dialogs are handled by `is battle_outcome player,won/lost,<npc>` conditions.

### Keep `setupGame()` working

`setupGame()` (in `src/game/debug.ts`) currently sets `intro_scoop=done` etc. After this story:
- Verify QA scripts teleporting to `spyder_paper_town` with default monster don't trigger any blocker (`Stop!` / `Stop 2!` / `My First Mon`).
- Add new optional `setupGame` flags or vars so post-paper-town QA can land there cleanly: `dantefirst:yes`, `dantebin:yes`, `mymonchoice:<slug>`, `firstfightdue:no` (or unset), `firstfightend:yes`, `<slug>chosen:yes`.
- Run every existing QA script after this change; none should trip an intro event by accident.

### QA Validation

Use `/puppeteer`. Add three test files:

**`qa/paper-town-blockers-test.ts`** (the Stop! events):
1. `setupGame({ map: "spyder_paper_town", tileX: 13, tileY: 5, monsters: [] })`. Walk north onto (13,1). Verify Dante spawns, dialog, escort, despawn. Re-step on (13,1); event re-fires.
2. Same but `tileX: 4, tileY: 12` and walk west — verify Stop 2! fires.
3. Same setup but with a starter monster: verify neither blocker fires.

**`qa/paper-town-bins-test.ts`** (the starter-pick + first battle):
1. `setupGame({ map: "spyder_paper_town", tileX: 13, tileY: 5, monsters: [], variables: { dantefirst: "yes" }})`. Walk player south to (23,13). Verify `My First Mon - Not Met` fires, Dante walks player around, sets `dantebin:yes`.
2. Walk to bin at (22,9), face it, press INTERACT. Verify dialog → MonsterInfoScene opens for rockitten → dialog `spyder_papertown_rockitten` → yes/no choice.
3. Pick yes. Verify `rockittenchosen:yes` → `Chosen - Rockitten` fires → rockitten added to party at L5 → `firstfightdue:yes` set.
4. Walk to (25,8). Verify `First Fight - Start` fires: Billie spawns, dialogs, friendship_scroll added to inventory, battle starts against `spyder_route3_zoolander` with Billie holding `billie_choice` (set this var in setupGame to a known slug).
5. Force-win the battle via debug. Verify `First Fight - Win` runs: dialogs, Billie exits, party heals, `firstfightend:yes` set.
6. Verify all 5 bin events are now non-interactable (party_size > 0 fails the gate).

**`qa/paper-town-buildings-test.ts`**: walk to each building entrance, verify the teleport target matches upstream. Walk to mart, verify it teleports to `spyder_paper_scoop.tmx,6,10`. Walk to daycare/manor/rival/protagonist house: verify each teleports to the correct upstream destination map (these will probably hit a "map not in our build" error since we haven't ported them — verify the *attempted* teleport target is right, even if our test ends in a map-not-found).

## Acceptance Criteria

- [ ] `spyder_paper_town.tmx` exported to Tiled-JSON and registered in `maps.ts`
- [ ] `public/assets/events/spyder_paper_town.yaml` is a verbatim mechanical port of every `<object type="event">` in the TMX
- [ ] No events present in our YAML that aren't in the upstream TMX
- [ ] `friendship_scroll` item ported (data + sprite); `add_item` works with it
- [ ] `spyder_route3_zoolander` party verified against upstream JSON
- [ ] `spyder_billie` `sprite_name` verified against upstream
- [ ] All required l10n msgids appended to `en_US.po`, verbatim
- [ ] All actions/conditions used in the YAML are registered and behave per upstream
- [ ] `add_monster` multi-arg form (for giving Billie a monster) works
- [ ] `qa/paper-town-blockers-test.ts`, `qa/paper-town-bins-test.ts`, `qa/paper-town-buildings-test.ts` all pass
- [ ] `setupGame()` updated with new optional flags; all existing QA scripts pass unchanged
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass

### Sizing note

This is a large story. If the implementer finds it's too big to land in one go, acceptable splits are:
- (a) **Map + blockers + buildings** as story A; **bins + Chosen events + first fight** as story B.
- (b) Pull the friendship_scroll port out as its own micro-story.

If splitting, propose the split in the journal and pause for confirmation before proceeding.
