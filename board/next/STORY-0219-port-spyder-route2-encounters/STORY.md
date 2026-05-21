# STORY-0219: Port spyder_route2 wild encounters (33 grass-tile triggers + day/night species table)

## Blocked by

- **STORY-0217** (`board/done/STORY-0217-cotton-town-east-road-content` once landed) — depends on the verbatim `spyder_route2.json` map shell and the 8-event base YAML (`Route Music` + 6 teleports) being in place. The 33 random-battle event rectangles cover specific tile coordinates that only line up against the upstream-correct 40×20 map; the current 30×20 stub has different tile geometry. Do not pick up until STORY-0217 has merged to `main`.

## Description

STORY-0217 lands the route2 map shell + teleports but explicitly defers wild encounters. This story ports them. Upstream defines wild encounters for route2 via two coupled pieces of content: (a) an encounter table at `upstream/mods/tuxemon/db/encounter/spyder_route2.yaml` listing the 5 species with day/night variants and per-time-of-day weight tweaks, and (b) **33** `random battle*` event objects in `upstream/mods/tuxemon/maps/spyder_route2.tmx` `<objectgroup id="6" name="Events">` that each trigger `random_encounter spyder_route2,11` (11% per-step probability) on the grass tiles they cover.

Our `src/game/data/encounters.ts:18-25` already has a `spyder_route2` table entry — but it's a flattened "average of day & night" approximation, **not** a verbatim port. This story replaces it with a day/night-aware port that matches upstream exactly, and ports the 33 event triggers into `public/assets/events/spyder_route2.yaml`. After this story, walking grass tiles on route2 triggers wild encounters from cardiling / aardorn / eyenemy / axolightl / cataspike at the right levels and weights for the current time of day.

## Open Questions

- **Day/night gating.** Upstream's encounter YAML uses `variables:` per entry to filter by `daytime=true`/`daytime=false`. Our `encounters.ts` doesn't currently model this — it's a flat list. Two options: (a) extend `EncounterEntry` with an optional `daytime?: boolean` filter and have `rollEncounter` consult `session.variables.daytime` (or a `stage_of_day` lookup), or (b) ship two separate tables (`spyder_route2_day`, `spyder_route2_night`) and pick at random-encounter-action time. (a) is cleaner; pick it unless something in `randomEncounter.ts` makes (b) trivial. Confirm during implementation.
- **`play_map_animation grass,…`** is **not implemented and not stubbed** today (grep confirms: no hits in `src/game/event/actions/` or `stubs.ts`). Upstream uses it for the grass-shake animation when an encounter rolls. We have two options: (i) add a stub in `stubs.ts` so the YAML loads without erroring (visuals will be missing but encounters still trigger), or (ii) implement a real grass-shake animation. The cheap-and-cheerful answer for this story is (i) — stub it, leave the visual polish to a future story. Make the stub explicit in the implementation plan.

## Context

### Upstream reference

- **Encounter table:** `upstream/mods/tuxemon/db/encounter/spyder_route2.yaml` — 5 species × 2 daytimes = 10 entries:
  | Species   | Day weight | Day level range | Night weight | Night level range |
  | --------- | ---------- | --------------- | ------------ | ----------------- |
  | cardiling | 2.5        | 3–6             | 2.5          | 3–6               |
  | aardorn   | 2.5        | 3–6             | 2.5          | 4–8               |
  | eyenemy   | 2.5        | 3–6             | 2.5          | 4–8               |
  | axolightl | 1.0        | 4–7             | 1.0          | 5–8               |
  | cataspike | 2.5        | 3–6             | 2.5          | 4–8               |

  `exp_req_mod: 3` and `held_items: []` on every entry — uniform, ignore for our port (our `EncounterEntry` schema doesn't carry these).
- **TMX random-battle events** in `upstream/mods/tuxemon/maps/spyder_route2.tmx` — **33** objects whose `name` starts with `random battle` (verified: `grep -cE 'name="random battle' = 33`). Object ids: 97, 101, 102, 103, 107, 108, 109, 111, 112, 113, 114, 115, 116, 117, 118, 119, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 176, 195, 196, 199, 200. Every one has identical body:
  ```xml
  <property name="act1" value="random_encounter spyder_route2,11"/>
  <property name="act2" value="play_map_animation grass,0.1,noloop,player"/>
  <property name="cond1" value="is char_at player"/>
  <property name="cond2" value="is char_moved player"/>
  ```
  Only the `x`/`y`/`width`/`height` (in pixels) differ. Convert mechanically to tile coords (`/16`). Object names disambiguate via numeric suffix (`random battle`, `random battle2`, … `random battle37` — non-contiguous numbering; note id 176 is `random battle16`, conflicting with id 116 also named `random battle16` — preserve both, disambiguate by object id in the YAML key if needed).
- **Encounter probability** is `11` (i.e. 11% per step rolling into the rect, given the `is char_moved` condition).

### Current state in our codebase

- `src/game/data/encounters.ts:18-25` — `spyder_route2` table exists but is a single flat array, not day/night aware:
  ```ts
  spyder_route2: [
    { slug: "cardiling", minLevel: 3, maxLevel: 8, weight: 2.5 },
    { slug: "aardorn", minLevel: 3, maxLevel: 8, weight: 2.5 },
    { slug: "eyenemy", minLevel: 3, maxLevel: 6, weight: 1.5 },
    { slug: "axolightl", minLevel: 4, maxLevel: 8, weight: 1.0 },
    { slug: "cataspike", minLevel: 3, maxLevel: 7, weight: 2.0 },
  ]
  ```
  This was a guess (different weights and ranges than upstream — eyenemy is `1.5` here but `2.5` upstream; cataspike is `2.0` here but `2.5` upstream). Replace with the verbatim day/night port.
- `src/game/event/actions/randomEncounter.ts` — implemented. Reads encounter table via `getEncounterTable(slug)` and rolls via `rollEncounter(table)`. Probability arg comes from the action (`random_encounter <slug>,<prob>`). **Does not currently consult time-of-day** — this story extends it (or the helpers it calls).
- `play_map_animation` action — **not implemented, not stubbed.** Grep `src/game/event/actions/` and `src/game/event/actions/stubs.ts` confirms zero hits. **Add as a stub** in `stubs.ts` for this story; full grass-shake animation is out of scope.
- `public/assets/events/spyder_route2.yaml` — after STORY-0217 lands, contains 8 base events. This story appends 33 `random battle*` events.
- **Time-of-day infrastructure.** `src/game/event/conditions/timeIs.ts` and `currentState.ts` (verify) likely already track `stage_of_day` — confirm during implementation. The condition is exercised by Environment Day/Night (STORY-0222). If `stage_of_day` is not yet wired up, this story's day/night encounter filter has to either (a) default to "day" everywhere until 0222 lands, or (b) implement minimal `stage_of_day` plumbing here. Pick (a) for scope.
- Monsters cardiling/aardorn/eyenemy/axolightl/cataspike all defined in `src/game/data/monsters.ts` — no new monster ports.

### Template stories

- **`board/done/STORY-0212-paper-daycare-content`** and similar map-content ports for the YAML-event shape.
- For an existing in-codebase example of a `random_encounter`-driven map, look at how `spyder_route1` events YAML handles it (`public/assets/events/spyder_route1.yaml` — currently uses a single big "Encounters" rect rather than the 33-rect upstream approach; we're upgrading route2 to the upstream-faithful pattern).

## What to build

1. **Update `src/game/data/encounters.ts:18-25`** — replace the flat `spyder_route2` entry with a verbatim port of `upstream/mods/tuxemon/db/encounter/spyder_route2.yaml`. Pick one of these shapes (judgement call — go with whichever requires fewer engine-side changes):
   - **Option A (preferred):** add an optional `daytime?: boolean` field to `EncounterEntry`. Ship 10 entries for `spyder_route2` (5 day + 5 night), each carrying its `daytime` flag. Have `rollEncounter` filter by current time-of-day before weighted-selecting. If `stage_of_day` isn't yet wired, default to day.
   - **Option B:** ship `spyder_route2_day` and `spyder_route2_night` as separate keys; have `random_encounter` consult time-of-day to pick which to roll on. Either is fine; A is closer to upstream's data model.
2. **Stub `play_map_animation` in `src/game/event/actions/stubs.ts`.** One-line addition (`stubAction("play_map_animation");`). Log a debug message including the args so a future visual-effects story can pick it up.
3. **Append 33 `random battle*` events to `public/assets/events/spyder_route2.yaml`.** Each event mechanically converted from its TMX `<object type="event">`:
   ```yaml
   "random battle":
     x: 10
     y: 12
     width: 1
     height: 3
     conditions:
       - is char_at player
       - is char_moved player
     actions:
       - random_encounter spyder_route2,11
       - play_map_animation grass,0.1,noloop,player
   ```
   Use the upstream `name` verbatim (with numeric suffixes — `random battle`, `random battle2`, …, `random battle37`). If our event YAML loader rejects duplicate keys with identical names, disambiguate with the object id (`random battle (id97)`); confirm during implementation by trying upstream-faithful names first.
4. **Update `src/game/event/actions/randomEncounter.ts` if Option A is chosen** — filter the encounter table by current daytime before selecting. Defer to existing time-of-day plumbing or fall through to "day" if none exists.

## Engine-side considerations

- **Time-of-day plumbing.** `stage_of_day` (`night`, `morning`, `afternoon`, `dusk` — upstream values) drives day/night gating. Verify in `src/game/event/conditions/timeIs.ts` what values our engine produces. Upstream treats `daytime=true` ⇔ `stage_of_day ∈ {morning, afternoon}` and `daytime=false` ⇔ `stage_of_day ∈ {dusk, night}`. Mirror this. If our engine doesn't yet have a clock, default to `morning` (daytime). Don't invent a new clock for this story.
- **33 event rects is a lot — performance.** The event engine iterates events per-tick checking conditions. 33 small rects each gated by `is char_at player` + `is char_moved player` should be cheap (constant work per movement). If `randomEncounter`'s probability roll fires repeatedly during a multi-tile move, that's a bug — confirm `is char_moved` fires once per step, not once per frame, by re-reading `src/game/event/conditions/charMoved.ts`.
- **Coverage gaps.** Upstream's 33 rects don't blanket every grass tile — there are deliberate "safe paths" along the dirt road. Verify a sample of rect positions against the upstream TMX layer rendering (Tiled) so the implementor doesn't accidentally collapse adjacent rects.
- **No combat-balance work here.** The species/levels come from upstream. If they feel too easy/hard at this point in our content progression, that's a separate balance story.

## QA Validation

Write `qa/route2-encounters-test.ts`. Use the debug bridge to teleport onto route2 and exercise encounter rolling.

1. **Encounter table parses:** assert `getEncounterTable("spyder_route2")` returns 10 entries (5 species × 2 daytimes) with the upstream weights and level ranges. Pure unit-test-style assertion via a vitest test file (preferred over puppeteer for this leg) under `src/game/data/encounters.test.ts` or similar — choose whichever fits the existing test layout.
2. **Random encounters fire on grass:**
   - `setupGame(page)`, then `await page.evaluate(() => window.A.teleport("spyder_route2", 10, 12))` (a tile inside one of the random-battle rects — pick one from your TMX-conversion table and document the choice).
   - Override `Math.random` via the debug bridge or by patching `window.A.forceEncounter(true)` (add to the debug bridge if missing — small change, mirror existing forcing helpers) so a step deterministically rolls into the encounter table.
   - Walk one tile. Assert a `BattleScene` activated. Assert the enemy species is one of `{cardiling, aardorn, eyenemy, axolightl, cataspike}`. Assert the enemy level is within the upstream day range (since we default to daytime).
   - Screenshot `qa/screenshots/route2-encounter-day.png`.
3. **Day vs night species selection:**
   - Set `stage_of_day=night` (via `window.A.setVariable("stage_of_day", "night")` or whatever the engine exposes — if no setter exists, this assertion is gated on STORY-0222 and may be skipped with a documented `xtest` marker).
   - Force a roll on the same tile. Assert the enemy level matches the night range (e.g. aardorn L4–8 instead of L3–6).
   - Screenshot `qa/screenshots/route2-encounter-night.png`.
4. **Safe path:** teleport to a non-grass tile (e.g. on the dirt road, `(10, 10)` or similar — confirm by reading the TMX's tile layers) and walk a few tiles. Assert no encounter triggers. Confirms the rects are positioned correctly.
5. **Pre-commit gates** pass.

## Out of scope

- A real `play_map_animation` grass-shake visual — stub only; future visual polish story.
- Encounter tables for other maps — only `spyder_route2` here.
- Trainer battles — STORY-0218.
- Signs — STORY-0220.
- Billie cutscene — STORY-0221.
- `Environment Day`/`Environment Night` events that switch the map's environment based on `stage_of_day` — STORY-0222.

## Acceptance Criteria

- [ ] `src/game/data/encounters.ts` `spyder_route2` entry is a verbatim port of `upstream/mods/tuxemon/db/encounter/spyder_route2.yaml`: 5 species × 2 daytimes, weights and level ranges matching the table in Context above.
- [ ] `EncounterEntry` (or equivalent) carries a daytime flag (Option A) or `spyder_route2_day`/`spyder_route2_night` are split keys (Option B). Either is acceptable; journal the choice.
- [ ] `rollEncounter` (or `random_encounter`) filters by current `stage_of_day`, defaulting to daytime if unset.
- [ ] `src/game/event/actions/stubs.ts` registers `play_map_animation` as a stub (logs args, completes immediately).
- [ ] `public/assets/events/spyder_route2.yaml` has 33 `random battle*` events with the exact tile rects converted from upstream object ids 97, 101, 102, 103, 107–109, 111–119, 122–133, 176, 195, 196, 199, 200. Each has the same `conditions:`/`actions:` shape.
- [ ] Walking grass tiles on route2 triggers encounters drawn from the upstream species list at the upstream probability (~11% per step within a rect).
- [ ] Walking the dirt road / non-grass tiles on route2 does **not** trigger encounters.
- [ ] Encounter species & level ranges differ between `stage_of_day=morning` and `stage_of_day=night`.
- [ ] `qa/route2-encounters-test.ts` passes; screenshots committed.
- [ ] No regressions: existing QA scripts still pass.
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass.
