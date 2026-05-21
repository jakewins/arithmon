# STORY-0221: Port the scripted Billie cutscene on spyder_route2

## Blocked by

- **STORY-0217** (`board/done/STORY-0217-cotton-town-east-road-content` once landed) — depends on the verbatim `spyder_route2.json` map shell and the 8-event base YAML in place. The Billie trigger rect at `(1, 8)`–`(1, 9)` only lines up against the upstream-correct 40×20 map. Do not pick up until STORY-0217 has merged to `main`.

## Description

Just inside route2's west entrance (the tile pair where the player arrives from cotton_town), upstream stages a one-time scripted encounter: Billie, the player's rival from the paper_town intro, walks in from `(3, 15)`, talks, battles the player with a fixed three-monster party, then exits south after dialog. After the encounter `route2billie:yes` is set so it never fires again.

STORY-0217 explicitly defers this — it's the single biggest event in the route2 TMX (`<object id="156" name="Billie encounter">` has ~22 action props and ~3 conditions). This story ports it verbatim.

Billie's battle party is `{billie_choice L6, eyenemy L6, cardiling L3}`. The `billie_choice` slug is a **variable-driven monster slug** (already supported by our `add_monster` action, see `src/game/event/actions/addMonster.ts:13`) that resolves to whichever starter the player did NOT pick during the paper_town intro. The intro already sets this via `mymonchoice` (see paper_town's scoop scene in STORY-0197). After this story, the rivalry continues mid-route2 as upstream intended.

## Context

### Upstream reference

- **TMX event** `upstream/mods/tuxemon/maps/spyder_route2.tmx`, `<object id="156" name="Billie encounter" type="event" x="16" y="128" width="16" height="32">` — tile rect `(1, 8)`–`(1, 9)` (a 1×2 column at the west edge, immediately east of the cotton_town teleport tiles). Properties (verbatim):
  ```xml
  <property name="act01" value="char_stop player"/>
  <property name="act02" value="lock_controls"/>
  <property name="act03" value="create_npc spyder_billie,3,15"/>
  <property name="act04" value="pathfind spyder_billie,1,10"/>
  <property name="act05" value="unlock_controls"/>
  <property name="act06" value="char_face player,down"/>
  <property name="act07" value="char_face spyder_billie,up"/>
  <property name="act08" value="translated_dialog spyder_route2_billie1"/>
  <property name="act20" value="add_monster billie_choice,6,spyder_billie,5,10"/>
  <property name="act21" value="set_monster_attribute add_monster,gender,male"/>
  <property name="act22" value="add_monster eyenemy,6,spyder_billie,5,10"/>
  <property name="act23" value="set_monster_attribute add_monster,gender,female"/>
  <property name="act24" value="add_monster cardiling,3,spyder_billie,5,10"/>
  <property name="act25" value="set_monster_attribute add_monster,gender,female"/>
  <property name="act30" value="start_battle player,spyder_billie"/>
  <property name="act71" value="translated_dialog spyder_route2_billie2"/>
  <property name="act75" value="pathfind spyder_billie,3,15"/>
  <property name="act80" value="remove_npc spyder_billie"/>
  <property name="act90" value="set_variable route2billie:yes"/>
  <property name="cond1" value="not variable_set route2billie:yes"/>
  <property name="cond2" value="is char_at player"/>
  ```
  Note the zero-padded keys (`act01..08`) and the non-contiguous numbering (jumps from `act08` to `act20`, then `act30`, `act71`, etc.) — preserve **numerical** order in the YAML, not lexical. This is the same pattern as `Talk graf Sight` in STORY-0218.
- **Dialog msgids:** `spyder_route2_billie1` (our `en_US.po` line 12310) — Billie's pre-battle taunt. `spyder_route2_billie2` (our line 12313) — post-battle exit line. **Both already present in our l10n.**
- **Billie's NPC entry:** `upstream/mods/tuxemon/db/npc/` doesn't separately list `spyder_billie` for route2 — Billie is a recurring NPC defined globally. Our codebase already has `spyder_billie: { spritesheet: "fashionista" }` at `src/game/data/npcs.ts:26`.
- **`billie_choice` variable.** Set during the paper_town starter pick (STORY-0197) — it holds the monster slug the player did NOT pick (the rival's counter-starter). Our engine's `add_monster` action already resolves `billie_choice` against `session.variables` (see `src/game/event/actions/addMonster.ts:13` and surrounding comment).

### Current state in our codebase

- `src/game/data/npcs.ts:26` — `spyder_billie` registered with spritesheet `fashionista`. **OK.**
- `public/assets/sprites/fashionista.png` — assumed present (verify; if not, the paper_town intro wouldn't render Billie either, so it must be).
- `src/game/data/npcParties.ts` — does `spyder_billie` have a default party? Probably yes for the paper_town intro fight. Either way, the `add_monster` actions in this event override / append at battle-start time. **Same caveat as STORY-0218**: confirm whether `add_monster` overrides or appends and align the YAML accordingly.
- `src/game/event/actions/` — verified directory listing shows these actions implemented:
  - `charStop.ts` (`char_stop`)
  - `lockControls.ts` / `unlockControls.ts`
  - `createNpc.ts` (`create_npc`)
  - `pathfind.ts` (`pathfind`)
  - `charFace.ts` (`char_face`)
  - `translatedDialog.ts` (`translated_dialog`)
  - `addMonster.ts` (`add_monster`)
  - `setMonsterAttribute.ts` (`set_monster_attribute`)
  - `startBattle.ts` (`start_battle`)
  - `removeNpc.ts` (`remove_npc`)
  - `setVariable.ts` (`set_variable`)
  - `variableSet` condition (`src/game/event/conditions/variableSet.ts`)
  - `charAt` condition (`src/game/event/conditions/charAt.ts`)
  **All required actions and conditions are already implemented** — no engine work expected. Verify each during implementation by reading the files.
- `public/assets/l10n/en_US.po` — `spyder_route2_billie1` (line 12310) and `spyder_route2_billie2` (line 12313) present.
- `public/assets/events/spyder_route2.yaml` — after STORY-0217 lands, contains 8 base events. This story appends 1 event (`Billie encounter`).
- Monsters in Billie's party: `eyenemy` (line 604 in `monsters.ts`), `cardiling` (line 581). `billie_choice` resolves to one of the three starters (verify which starters: `budaye`, `rockitten`, or whatever the paper_town intro offers — see `mymonchoice` setter in `public/assets/events/spyder_paper_scoop.yaml`).

### Template stories

- **`board/done/STORY-0197-port-paper-scoop-starter-pick`** — the paper_town intro story that sets up `billie_choice` and `mymonchoice`. Reference for how Billie's battle party uses the variable.
- **`board/done/STORY-0214-paper-rival-house-content`** — a self-contained `spyder_billie` scene; useful for NPC sprite + dialog wiring patterns.
- **`board/done/STORY-0021-spyder-intro-cutscene`** — original cutscene wiring (`pathfind`, `create_npc`, scripted dialog). Same engine path this story exercises.

## What to build

1. **Append the `Billie encounter` event to `public/assets/events/spyder_route2.yaml`** (after STORY-0217's 8 base events; this story does not depend on STORY-0218/0219/0220 — they touch independent events). Mechanical TMX → YAML conversion:
   ```yaml
   "Billie encounter":
     x: 1
     y: 8
     width: 1
     height: 2
     conditions:
       - not variable_set route2billie:yes
       - is char_at player
     actions:
       - char_stop player
       - lock_controls
       - create_npc spyder_billie,3,15
       - pathfind spyder_billie,1,10
       - unlock_controls
       - char_face player,down
       - char_face spyder_billie,up
       - translated_dialog spyder_route2_billie1
       - add_monster billie_choice,6,spyder_billie,5,10
       - set_monster_attribute add_monster,gender,male
       - add_monster eyenemy,6,spyder_billie,5,10
       - set_monster_attribute add_monster,gender,female
       - add_monster cardiling,3,spyder_billie,5,10
       - set_monster_attribute add_monster,gender,female
       - start_battle player,spyder_billie
       - translated_dialog spyder_route2_billie2
       - pathfind spyder_billie,3,15
       - remove_npc spyder_billie
       - set_variable route2billie:yes
   ```
   Action order is taken from numerically-sorted `act*` props (`01,02,03,04,05,06,07,08,20,21,22,23,24,25,30,71,75,80,90`), flattened into a single ordered list.
2. **Verify `billie_choice` resolution.** Run the paper_town intro (or use `setupGame` defaults) so `mymonchoice` is set, then teleport directly to route2 and trigger the cutscene; confirm Billie's first monster matches the not-chosen starter. If `add_monster billie_choice,…` resolves to literal slug `"billie_choice"` (i.e. the variable substitution isn't firing), debug in `addMonster.ts`.
3. **No engine changes expected.** All required actions/conditions are implemented. If any single action turns out to be missing or broken, fix in-flight (don't grow scope to a separate story unless the fix is large — re-scope and journal in that case).

## Engine-side considerations

- **`pathfind spyder_billie,1,10`** — this is the pathfind-to-tile variant (not pathfind-to-char). Confirm `pathfind.ts` supports the `(npc, x, y)` arg pattern. The cutscene needs Billie to walk from `(3, 15)` (spawn) to `(1, 10)` (adjacent to player at `(1, 8/9)`). Path: north along the wall.
- **`pathfind` blocking semantics.** The cutscene assumes Billie's pathfind blocks subsequent actions until she arrives. Confirm `pathfind.ts` returns `done: false` until pathfind completes (the engine's action queue waits on this). If not, the dialog will fire before Billie arrives — bug to fix.
- **`set_monster_attribute add_monster,gender,male` syntax.** The `add_monster` token here is upstream's "last-added monster" reference, not a slug. Verify `setMonsterAttribute.ts` understands this (or supports it). If it's a verbatim-string match for slug, this is broken; if it's a sigil for "the monster just added", it works. Either way, gender attributes are flavor — failure here is not a blocker, but should be logged.
- **`remove_npc` semantics.** After Billie pathfinds back to `(3, 15)` she's removed from the map (despawn). Confirm `removeNpc.ts` doesn't try to also rewind the pathfind. Tested in earlier Billie scenes (STORY-0021 / STORY-0197).
- **`route2billie:yes` variable.** Standard `session.variables` write. Persists in save state. After the cutscene fires once, the condition `not variable_set route2billie:yes` gates further triggers — Billie does not re-spawn.
- **Trigger geometry.** The 1×2 rect at `(1, 8)`–`(1, 9)` overlaps the cotton_town teleport landing tiles. The player will trigger the cutscene the first time they step into either tile after walking east from cotton_town. **Important:** the cutscene's `lock_controls` must engage before any other event fires on the same tile (e.g. the `Route Music` event at `(0, 0)` is far away and not relevant, but if any future event ever overlaps these tiles there's a sequencing question). Confirm event-evaluation order in `src/game/event/engine.ts` is deterministic (YAML file order, probably).

## QA Validation

Write `qa/route2-billie-test.ts`.

1. **First-walk-in trigger:**
   - `setupGame(page)` (defaults: paper_town, party `[budaye L5]`, `mymonchoice=budaye` so `billie_choice` resolves to one of the other starters).
   - `await page.evaluate(() => window.A.teleport("spyder_cotton_town", 39, 28))`. Walk east — should teleport to route2 at `(0, 8)` (handled by STORY-0217's teleport).
   - Walk east into `(1, 8)`. Assert: controls lock, `spyder_billie` NPC spawns at `(3, 15)`, then pathfinds to `(1, 10)`. Wait for arrival.
   - Assert dialog opens with `t("spyder_route2_billie1")`. Advance.
   - Assert `BattleScene` activates with Billie's party: `[billie_choice L6, eyenemy L6, cardiling L3]`. Confirm `billie_choice` resolved to a real monster slug (not literal "billie_choice").
   - Force-win via debug bridge. Confirm post-battle dialog `spyder_route2_billie2`. Confirm Billie pathfinds back to `(3, 15)` and despawns.
   - Assert `session.variables.route2billie === "yes"`.
   - Screenshot `qa/screenshots/route2-billie-encounter.png` and `…/route2-billie-postbattle.png`.

2. **Re-entry does NOT re-trigger:**
   - From the same session (post-cutscene), walk west to cotton_town then back east to route2 `(1, 8)`. Assert no cutscene fires; player is free to walk.

3. **Mid-cutscene control lock works:**
   - During the cutscene (before battle), assert that pressing movement keys produces no player motion (controls are locked). Catch a regression where `lock_controls` doesn't actually lock input.

4. **Battle loss whiteout:**
   - Fresh setup; trigger cutscene; force-lose the battle. Assert whiteout fires, player respawns at the last `set_teleport_faint` checkpoint. Assert `route2billie` is **NOT** set (the cutscene's `act90` only runs after a successful win-path; if our action queue runs it regardless of battle outcome, that's a divergence from upstream — confirm intended behavior by reading `start_battle`'s outcome handling).

5. **Pre-commit gates** pass.

## Out of scope

- Trainer battles (Roddick / Marion / Graf) — STORY-0218.
- Wild encounters — STORY-0219.
- Signs — STORY-0220.
- Environment day/night events — STORY-0222.
- Citypark NPC ports — STORY-0223 + follow-ups.
- Any rival-arc plot continuation past route2 (Billie's later appearances) — separate stories.

## Acceptance Criteria

- [ ] `public/assets/events/spyder_route2.yaml` contains one new event `Billie encounter` at tile rect `(1, 8)`–`(1, 9)` (`x: 1, y: 8, width: 1, height: 2`), with the 19 actions and 2 conditions listed above, in upstream numerical order.
- [ ] Walking into `(1, 8)` or `(1, 9)` for the first time triggers the cutscene: Billie spawns at `(3, 15)`, pathfinds to `(1, 10)`, dialog fires, battle starts with `[billie_choice L6, eyenemy L6, cardiling L3]`.
- [ ] `billie_choice` resolves correctly to whichever starter the player did NOT pick (matches the `mymonchoice` rival counter from the paper_town intro).
- [ ] After the battle, post-dialog plays, Billie pathfinds to `(3, 15)`, despawns. `session.variables.route2billie === "yes"`.
- [ ] Re-entry into the trigger tiles does NOT re-fire the cutscene.
- [ ] `lock_controls` prevents player input during the cutscene's scripted portion.
- [ ] `qa/route2-billie-test.ts` passes; both screenshots committed.
- [ ] No regressions: paper_town intro Billie scene and other Billie appearances still work.
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass.
