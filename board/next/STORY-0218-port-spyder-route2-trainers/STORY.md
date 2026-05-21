# STORY-0218: Port spyder_route2 trainers (Roddick, Marion, Graf)

## Blocked by

- **STORY-0217** (`board/done/STORY-0217-cotton-town-east-road-content` once landed) — depends on the verbatim `spyder_route2.json` map shell and the 8-event base YAML (`Route Music` + 6 teleports) being in place. Do not pick up until STORY-0217 has merged to `main`. Picking up earlier would mean writing trainer events against a 30×20 fabricated stub map whose tile coords don't match upstream.

## Description

Port the three trainer NPCs that live on `spyder_route2` upstream — Roddick, Marion, and Graf — verbatim from `upstream/mods/tuxemon/maps/spyder_route2.tmx` + `upstream/mods/tuxemon/db/npc/spyder_route2_npcs.yaml`. STORY-0217 lands the map shell and teleports but explicitly defers all NPCs; this story adds those NPCs (sprites, parties, dialog hooks) and the event objects that drive them (3 × `Create *`, 3 × `Talk *` interact-triggered, 3 × `Talk *` sight-line, 3 × `Post Talk *` — 12 events total).

Done state: walking through route2 finds Roddick standing on a path tile, Marion in the grass, and Graf on the eastern side. Each can be defeated once, awards their gold reward, and afterwards politely yields a `post_battle_lose` line on subsequent interactions. Sight-line auto-talk works for all three.

## Context

### Upstream reference

- **TMX events** in `upstream/mods/tuxemon/maps/spyder_route2.tmx` `<objectgroup id="6" name="Events">`:
  - **Create Roddick** (id 158, tile `(12, 2)`) — `act1: create_npc spyder_route2_roddick,5,3`, `cond2: not char_exists spyder_route2_roddick`. Spawns Roddick at tile `(5, 3)`.
  - **Create Marion** (id 159, tile `(13, 2)`) — `act1: create_npc spyder_route2_marion,22,9`, `cond2: not char_exists spyder_route2_marion`. Spawns Marion at `(22, 9)`.
  - **Create Graf** (id 160, tile `(14, 2)`) — `act1: create_npc spyder_route2_graf,29,3`, `cond2: not char_exists spyder_route2_graf`. Spawns Graf at `(29, 3)`.
  - **Talk roddick** (id 161, tile `(12, 3)`) — `behav1: talk spyder_route2_roddick`, `cond1: not battle_outcome player,won,spyder_route2_roddick`, actions: `char_talk pre_battle` → `add_monster spighter,8,…,5,10` → `start_battle player,spyder_route2_roddick` → `char_talk post_battle_lose`. **Note Roddick's party is a single monster, `spighter L8`** (not the made-up cardiling+eyenemy currently in our `npcParties.ts:43-50`).
  - **Talk marion** (id 162, tile `(13, 3)`) — same shape; party: `aardorn L7` ×2.
  - **Talk graf** (id 163, tile `(14, 3)`) — same shape; party: `cardiling L7`, `cataspike L5`, `cataspike L5`.
  - **Talk roddick** (id 188, tile rect `(5, 4)`–`(5, 8)`, sight-line) — `act1: lock_controls`, `act2: pathfind_to_char player,spyder_route2_roddick`, `act3: char_face player,spyder_route2_roddick`, `act4: char_talk pre_battle`, `act5: unlock_controls`, `act6: add_monster spighter,8,…`, `act7: start_battle`, `act8: char_talk post_battle_lose`. Conditions: `not battle_outcome won`, `is char_at player`, `not char_defeated player`.
  - **Talk marion** (id 189, tile rect `(22, 10)`–`(22, 13)`, sight-line) — same shape, party `aardorn L7` ×2.
  - **Talk graf** (id 190, tile rect `(29, 4)`–`(29, 8)`, sight-line) — same shape, party `cardiling L7` + `cataspike L5` ×2. Note this event uses zero-padded `actNN` keys (`act01`..`act10`) — preserve numerical order, not lexical.
  - **Post Talk roddick** (id 211, tile `(12, 1)`) — `behav1: talk spyder_route2_roddick`, `cond1: is battle_outcome player,won,spyder_route2_roddick`, `act1: char_talk spyder_route2_roddick,post_battle_lose`. Same pattern for Marion (id 212, tile `(13, 1)`) and Graf (id 213, tile `(14, 1)`).
- **NPC YAML** `upstream/mods/tuxemon/db/npc/spyder_route2_npcs.yaml`:
  - `spyder_route2_marion` — sprite `picnicker`, dialog `pre_battle: spyder_route2_marion1`, `post_battle_lose: spyder_route2_marion2`.
  - `spyder_route2_graf` — sprite `tennisplayer_green`, dialog `spyder_route2_graf1` / `…_graf2`.
  - `spyder_route2_roddick` — sprite `tennisplayer_fiery`, dialog `spyder_route2_roddick1` / `…_roddick2`.

### Current state in our codebase

- `src/game/data/npcs.ts` — all three NPCs are **already registered** with the correct sprites:
  - line 24: `spyder_route2_roddick: { spritesheet: "tennisplayer_fiery" }`
  - line 48: `spyder_route2_graf: { spritesheet: "tennisplayer_green" }`
  - line 49: `spyder_route2_marion: { spritesheet: "picnicker" }`
- `public/assets/sprites/tennisplayer_fiery.png`, `tennisplayer_green.png`, `picnicker.png` — **all present.**
- `src/game/data/npcParties.ts:43-50` — `spyder_route2_roddick` is registered but with the **wrong** party (`cardiling L6 + eyenemy L5`, `goldReward 250`). Upstream is `spighter L8` only. **Fix to match upstream**, and pick a goldReward consistent with neighboring trainers (e.g. `100` like `spyder_cottoncafe_cayden`/`spyder_route1_bjorn` — Roddick's a low-tier single-mon trainer). Marion and Graf entries are missing entirely — add them.
- `public/assets/l10n/en_US.po` — all six msgids exist:
  - `spyder_route2_marion1` (line 12321) / `spyder_route2_marion2` (line 12381)
  - `spyder_route2_graf1` (line 12318) / `spyder_route2_graf2` (line 12378)
  - `spyder_route2_roddick1` (line 12324) / `spyder_route2_roddick2` (line 12328)
- **Monster availability:**
  - `spighter` — defined in `src/game/data/monsters.ts:4522`. OK.
  - `aardorn` — defined at line 477. OK.
  - `cardiling` — defined at line 581. OK.
  - `cataspike` — defined at line 518. OK.
  - No new monster ports required.
- **Engine actions in use (all already implemented):**
  - `create_npc` → `src/game/event/actions/createNpc.ts`
  - `char_talk` → `charTalk.ts`
  - `add_monster` → `addMonster.ts`
  - `start_battle` → `startBattle.ts`
  - `lock_controls` / `unlock_controls` → `lockControls.ts` / `unlockControls.ts`
  - `pathfind_to_char` → `pathfindToChar.ts`
  - `char_face` → `charFace.ts`
  - `battle_outcome` condition → `battleOutcome.ts`
  - `char_exists` / `char_defeated` / `char_at` conditions — all present in `src/game/event/conditions/`.
- `public/assets/events/spyder_route2.yaml` — after STORY-0217 lands, this file contains exactly the 8 base events (Route Music + 6 teleports). This story appends to it.

### Template stories

**`board/done/STORY-0212-paper-daycare-content`** and **`board/done/STORY-0213-paper-manor-content`** are good references for the trainer-port pattern — both add NPCs to existing maps with `Create` + `Talk` + `Post Talk` event triples, dialog msgids, and `npcParties.ts` entries. The single-trainer port in `board/done/STORY-0214-paper-rival-house-content` is also relevant.

## What to build

1. **Append 12 trainer events to `public/assets/events/spyder_route2.yaml`**, mechanically converted from the TMX `<object type="event">` blocks. Each event keyed by its TMX `name` with `A`/`B` (or `… Sight`) disambiguation where upstream `name=` collides — the interact-`Talk roddick` (id 161) vs the sight-line-`Talk roddick` (id 188) share the same TMX name; disambiguate as `Talk roddick` and `Talk roddick Sight`. Same for marion/graf. Keep `x`/`y` as tile coords. Preserve `condN`/`actNN` order. The sight-line `Talk *` events have `width: 1, height: ~5` (or whatever the TMX pixel rect rounds to in tiles — `/16`).

2. **Fix `src/game/data/npcParties.ts:43-50`** — replace Roddick's `{ cardiling L6, eyenemy L5 }` with `{ spighter L8 }`. Adjust `goldReward` to ~100 (single low-tier monster).

3. **Add `spyder_route2_marion` and `spyder_route2_graf` to `src/game/data/npcParties.ts`:**
   - `spyder_route2_marion`: `name: "Marion"`, monsters `[{slug:"aardorn",level:7},{slug:"aardorn",level:7}]`, `goldReward: 200`.
   - `spyder_route2_graf`: `name: "Graf"`, monsters `[{slug:"cardiling",level:7},{slug:"cataspike",level:5},{slug:"cataspike",level:5}]`, `goldReward: 300`.
   - (Gold rewards are judgement-call; match the scale of other 1-/2-/3-monster trainers in the file.)
   - Note: upstream actually uses `add_monster` in the event to assemble the trainer party at battle-start time rather than reading from a static party table. Our engine handles `add_monster` for NPC parties; the `npcParties.ts` entries serve as defaults / fall-throughs (verify how `start_battle` resolves an NPC's party — see `startBattle.ts` — and align). If `add_monster` fully overrides, the `npcParties.ts` entries are redundant but harmless; if it appends, the static table needs to be empty `monsters: []`. Confirm during implementation and journal the choice.

4. **Verify NPC dialog wiring.** `char_talk spyder_route2_roddick,pre_battle` needs `spyder_route2_roddick`'s NPC entry to expose a `pre_battle` speech key resolving to the msgid `spyder_route2_roddick1`. Check `src/game/data/npcs.ts` and the `char_talk` action implementation — if our NPC record only carries `spritesheet`, we either need to extend the NPC schema with a `speech` object (matching upstream's `db/npc/*_npcs.yaml`), or hard-code the mapping in `char_talk` from `<slug>,<key>` → msgid (`spyder_route2_roddick,pre_battle` → `spyder_route2_roddick1`). **Confirm during implementation which other NPCs use `char_talk` today** (e.g. paper_town/papermart trainers) and follow the same pattern; if no NPC currently uses `char_talk`, this story must add the speech-profile schema.

5. **No new map/tileset assets needed.** Sprites already shipped.

## Engine-side considerations

- **`pathfind_to_char`** is implemented (`src/game/event/actions/pathfindToChar.ts`). Verify it correctly walks the player up to an NPC and faces them — sight-line trainers depend on this. If buggy, fix; do not paper over with a teleport.
- **Sight-line trigger geometry.** Upstream's sight-line `Talk *` events are tall narrow rectangles in front of the trainer (Roddick faces down from `(5, 3)`, sight-line is the column `(5, 4)..(5, 8)`). Our event engine fires events when the player enters the rect with `char_at`/`char_moved` conditions; verify this works with multi-tile event rects (paper_town's gates should already exercise this). Trainers must NOT trigger if the player has already won — `cond1: not battle_outcome player,won,<slug>` gates it.
- **`battle_outcome` condition.** `battleOutcome.ts` already implements `is battle_outcome player,won,<npc_slug>`. Confirm it persists across save/load — losing a save state would re-trigger trainers.
- **Whiteout on loss.** If the player loses to a route2 trainer, the existing combat-loss flow (whiteout → respawn at last `set_teleport_faint`) should apply. Verify the trainer doesn't softlock the player by leaving `lock_controls` engaged after a loss — the `start_battle` action should release controls on shutdown regardless of outcome.

## QA Validation

Create `qa/route2-trainers-test.ts` (a new committed QA script). Use the debug bridge to teleport directly onto route2 and exercise each trainer.

1. **Roddick — interact trainer:**
   - `setupGame(page)`, then `await page.evaluate(() => window.A.teleport("spyder_route2", 5, 4))` (one tile below Roddick).
   - Assert `session.npcsByMap.spyder_route2` (or the equivalent debug-bridge view) contains `spyder_route2_roddick` at `(5, 3)`.
   - Face up, press INTERACT. Wait for dialog. Assert msg includes the localized text of `spyder_route2_roddick1` (use `t("spyder_route2_roddick1")` from the harness for the expected string).
   - Advance dialog → expect `BattleScene` activated with enemy `spighter L8`.
   - Use the debug bridge's force-win helper (e.g. `window.A.endBattle("win")` if present, or scripted attacks) to finish the battle.
   - After battle, assert `session.variables` / `battle_outcome` reflects the win. Re-INTERACT Roddick → dialog should now be `spyder_route2_roddick2` (post_battle_lose), no second battle.
   - Screenshot `qa/screenshots/route2-roddick-pre.png` and `…/route2-roddick-post.png`.

2. **Marion — sight-line trainer:**
   - Fresh setup. Teleport to `(22, 14)` (one south of Marion's sight rect bottom). Walk north into `(22, 13)` (top of sight rect).
   - Expect auto-talk: controls lock, `pathfind_to_char` walks player to Marion's adjacent tile, dialog `spyder_route2_marion1`, battle starts with two `aardorn L7`.
   - Win battle; assert subsequent walk-through does NOT re-trigger (`cond1: not battle_outcome won`).
   - Screenshot before/after.

3. **Graf — sight-line trainer, party of 3:**
   - Teleport `(29, 9)`. Walk north into `(29, 8)`.
   - Same flow as Marion. Battle is 3 monsters; ensure all three slot in correctly (cardiling L7, cataspike L5, cataspike L5).
   - Win, screenshot, verify post-talk on re-INTERACT shows graf2 line.

4. **Sanity:** Walk between trainers without triggering re-battles. Confirm no NPC sprite glitches (each trainer faces the correct direction matching the upstream TMX — likely `down` for Roddick/Graf since they're at `y=3` watching the column south of them; Marion faces whichever direction her sight rect points).

5. **Pre-commit gates:** `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass.

## Out of scope

- Wild encounters on route2 grass tiles — STORY-0219.
- Sign events — STORY-0220.
- Billie scripted cutscene — STORY-0221.
- Environment day/night events — STORY-0222.
- Citypark NPCs / encounters — STORY-0223 + its follow-ups.

## Acceptance Criteria

- [ ] `public/assets/events/spyder_route2.yaml` contains 12 new events: `Create Roddick`, `Create Marion`, `Create Graf`, `Talk roddick`, `Talk marion`, `Talk graf`, `Talk roddick Sight`, `Talk marion Sight`, `Talk graf Sight`, `Post Talk roddick`, `Post Talk marion`, `Post Talk graf`. Each has tile coords + `conditions:`/`actions:` mechanically matching the upstream TMX `condN`/`actNN` properties.
- [ ] `src/game/data/npcParties.ts` has `spyder_route2_roddick = { name:"Roddick", monsters:[{slug:"spighter",level:8}], goldReward:~100 }`, plus new entries `spyder_route2_marion` and `spyder_route2_graf` matching the upstream `add_monster` chains. (Or, if implementation determines `add_monster` fully overrides static parties, `monsters: []` placeholders — journal the choice.)
- [ ] NPC dialog wiring resolves `char_talk spyder_route2_<slug>,pre_battle` → msgid `spyder_route2_<slug>1` and `…,post_battle_lose` → `…2`. (Either via extended NPC schema or per-NPC dialog table — journal the approach.)
- [ ] Walking up to Roddick `(5, 3)` and pressing INTERACT triggers the pre-battle dialog and a battle vs. `spighter L8`.
- [ ] Walking into Marion's sight rect (column `(22, 10)..(22, 13)`) auto-triggers her battle (2 × `aardorn L7`).
- [ ] Walking into Graf's sight rect (column `(29, 4)..(29, 8)`) auto-triggers his battle (`cardiling L7` + 2 × `cataspike L5`).
- [ ] After winning each battle, INTERACT replays the `post_battle_lose` line instead of re-fighting.
- [ ] No NPC re-spawns on map re-entry (the `not char_exists` guard is honored).
- [ ] `qa/route2-trainers-test.ts` passes; screenshots committed.
- [ ] No regressions: existing QA (route2 teleports from STORY-0217, brideswood, paper_town) still passes.
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass.
