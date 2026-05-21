# STORY-0222: Port spyder_route2 Environment Day / Environment Night events

## Blocked by

- **STORY-0217** (`board/done/STORY-0217-cotton-town-east-road-content` once landed) — depends on the verbatim `spyder_route2.json` map shell and base events YAML in place. Do not pick up until STORY-0217 has merged to `main`.

## Description

Upstream's `spyder_route2.tmx` has two tiny events at the top-left corner that swap the map's `environment` between `grass` (day) and `night_grass` (night) based on `stage_of_day`. The environment value drives combat backdrops and (in upstream) various small look-and-feel decisions — see `src/game/data/maps.ts` for how `environment: "forest"` is used today. This story ports both events verbatim. Small change; mostly engine-verification.

## Context

### Upstream reference

- **TMX events** in `upstream/mods/tuxemon/maps/spyder_route2.tmx` `<objectgroup id="6" name="Events">`:
  - **Environment Day** (object id 187, tile `(1, 0)`):
    ```xml
    <property name="act1" value="set_environment grass"/>
    <property name="cond1" value="not time_is stage_of_day,equals,night"/>
    <property name="cond2" value="not environment_is grass"/>
    ```
  - **Environment Night** (object id 192, tile `(2, 0)`):
    ```xml
    <property name="act1" value="set_environment night_grass"/>
    <property name="cond1" value="is time_is stage_of_day,equals,night"/>
    <property name="cond2" value="not environment_is night_grass"/>
    ```
  Both are single-tile events at the top of the map; the conditions fire automatically each frame the player is anywhere on route2 — there's no `is char_at` gating, so these are "passive" events evaluated unconditionally on map presence.

### Current state in our codebase

- `src/game/event/actions/setEnvironment.ts` — implemented. **Verify** it handles the `grass` and `night_grass` values; if it stores them on the map record, no further wiring is needed; if it has a hard-coded allow-list, `night_grass` may need adding.
- `src/game/event/conditions/timeIs.ts` — implemented. Need to confirm it handles upstream's `time_is stage_of_day,equals,night` syntax (3-arg form: subject, comparator, value). If it expects a different shape (e.g. `time_is night`), adjust.
- `src/game/event/conditions/environmentIs.ts` — implemented. Should already evaluate `environment_is <key>` against the current map's `environment` setting (possibly via session-level override since `set_environment` is dynamic).
- `src/game/data/maps.ts:217-222` — `spyder_route2` currently has `environment: "forest"`. This is the **static** environment; the runtime `set_environment` action overrides it. STORY-0217 leaves this as `"forest"` (its choice for fidelity to neighboring routes). After this story, the runtime value will flip to `grass` or `night_grass` based on time-of-day. Verify the engine correctly distinguishes the static default from the runtime override (the override should win during combat).
- **`stage_of_day` plumbing.** As noted in STORY-0219, may or may not exist today. If not, this story should either (a) build minimal plumbing (a single `session.variables.stage_of_day` setter on map enter / based on real wall-clock or fixed default) or (b) hard-code "day" until a later story. **Pick (a)** if this story is to be meaningful — without time-of-day plumbing, only `Environment Day` would ever fire and the night branch is dead code. Verify whether the conditions in 0219 et al need the same plumbing — they do — so consolidate the plumbing into whichever of {0219, 0222} lands first. If 0219 lands first, this story inherits its plumbing. If 0222 lands first, build the plumbing here. Journal the choice.
- **`night_grass` environment.** Verify it exists in our environment registry. Search for the string `night_grass` in `src/`; if absent, add it alongside `grass` in whichever data file enumerates environments (combat backdrops likely). If our combat backdrop pipeline doesn't yet have a night variant, the runtime override falls back to whatever the day variant is — acceptable for this story; flag as a follow-up if so.
- `public/assets/events/spyder_route2.yaml` — after STORY-0217 lands, contains 8 base events. This story appends 2 events.

### Template stories

- **`board/done/STORY-0212-paper-daycare-content`** or any other content-port story for the YAML conversion mechanics.
- No exact template for environment-day/night events in our codebase yet (these are the first). Look for `set_environment` calls in any existing YAML (`grep -r set_environment public/assets/events/`) to confirm prior usage.

## What to build

1. **Append 2 events to `public/assets/events/spyder_route2.yaml`:**
   ```yaml
   "Environment Day":
     x: 1
     y: 0
     conditions:
       - not time_is stage_of_day,equals,night
       - not environment_is grass
     actions:
       - set_environment grass

   "Environment Night":
     x: 2
     y: 0
     conditions:
       - is time_is stage_of_day,equals,night
       - not environment_is night_grass
     actions:
       - set_environment night_grass
   ```
2. **Verify `time_is` condition argument parsing.** Upstream's syntax is `time_is <variable>,<comparator>,<value>` (3 comma-separated args). Confirm `src/game/event/conditions/timeIs.ts` parses this; if it currently only supports a simpler form, extend it.
3. **Verify `set_environment night_grass` works.** If the environment registry rejects `night_grass`, add it. If our combat backdrops don't have a night variant, fall through to day variant and journal a follow-up.
4. **Optionally build minimal `stage_of_day` plumbing** if neither STORY-0219 nor any earlier story has it. Simplest: `OverworldScene` writes `session.variables.stage_of_day = "morning"` (or computes from wall-clock with hour ranges matching upstream: morning 0600-1200, afternoon 1200-1800, dusk 1800-2000, night 2000-0600). Mirror upstream's `update_time` if our engine has it (`src/game/event/actions/updateTime.ts` exists).

## Engine-side considerations

- **Passive evaluation.** These events have no `is char_at` gate, so they fire whenever conditions transition. Confirm the event engine correctly re-evaluates events when state changes (a time-of-day flip while standing still should swap the environment). If the engine only checks events on player movement, this story needs to nudge it (or the time-of-day plumbing emits a re-evaluation signal).
- **`environment_is` self-gate.** The events use `not environment_is <target>` as their second condition to avoid re-applying the same environment every tick. Confirm `environmentIs.ts` reads the dynamic (runtime-overridden) environment, not the static map registry value.
- **Combat backdrop wiring.** When a wild encounter rolls in route2 (from STORY-0219), the combat backdrop should be `grass` or `night_grass`. Verify `CombatScene` consults the dynamic environment, not the static. If it consults the static, the runtime override is decorative and this story is mostly aesthetic.
- **Performance.** Two tiny conditions evaluated per-frame is fine.

## QA Validation

Write `qa/route2-environment-test.ts`.

1. **Day:**
   - `setupGame(page)`, then `await page.evaluate(() => { window.A.setVariable("stage_of_day", "morning"); window.A.teleport("spyder_route2", 10, 10); })`.
   - Wait a frame. Assert `session.environment === "grass"` (or whatever debug-bridge accessor exposes the runtime environment).
   - Trigger a wild encounter (if STORY-0219 has landed) and assert combat backdrop is the day/grass variant. Screenshot.
2. **Night:**
   - From the same session: `window.A.setVariable("stage_of_day", "night")`. Wait a frame. Assert `session.environment === "night_grass"`.
   - Trigger another encounter, assert combat backdrop is the night variant (if it exists; otherwise document the missing-asset follow-up). Screenshot.
3. **Idempotent:**
   - Stay on route2 with `stage_of_day=morning`. Assert the engine does not re-fire `set_environment` every frame (the `not environment_is grass` self-gate is doing its job). Watch the debug log or an event-fire counter to confirm.
4. **Map switch resets:**
   - Walk west to cotton_town. Assert cotton_town's environment is whatever cotton_town's own settings dictate, not `grass`/`night_grass`. Walk back east to route2 — assert the day/night events re-fire and the environment swaps back.
5. **Pre-commit gates** pass.

## Out of scope

- Trainer NPCs — STORY-0218.
- Wild encounters — STORY-0219. (This story doesn't depend on 0219, but the combat-backdrop QA leg above does.)
- Signs — STORY-0220.
- Billie cutscene — STORY-0221.
- Citypark — STORY-0223.
- Adding new combat backdrops if `night_grass` isn't already shipped — flag as a follow-up if needed; don't grow scope here.

## Acceptance Criteria

- [ ] `public/assets/events/spyder_route2.yaml` contains 2 new events: `Environment Day` at `(1, 0)` and `Environment Night` at `(2, 0)`, with `conditions:`/`actions:` mechanically matching the upstream TMX.
- [ ] `time_is stage_of_day,equals,night` condition syntax parses and evaluates correctly.
- [ ] `set_environment grass` and `set_environment night_grass` both succeed; the runtime environment value is observable via the debug bridge or session inspection.
- [ ] When `stage_of_day` flips morning → night while on route2, the environment swaps from `grass` to `night_grass` and the `Environment Night` event fires once (not every frame).
- [ ] If `night_grass` combat backdrop doesn't yet exist, this story documents the gap as a follow-up and falls back to the day variant rather than crashing.
- [ ] `qa/route2-environment-test.ts` passes; screenshots committed.
- [ ] No regressions: existing QA still passes.
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass.
