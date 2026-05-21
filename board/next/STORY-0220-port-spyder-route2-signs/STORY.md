# STORY-0220: Port spyder_route2 signs (4 readable map signs)

## Blocked by

- **STORY-0217** (`board/done/STORY-0217-cotton-town-east-road-content` once landed) — depends on the verbatim `spyder_route2.json` map shell and the 8-event base YAML in place. The 4 sign rects only line up against the upstream-correct 40×20 map; the current 30×20 stub has different tile geometry. Do not pick up until STORY-0217 has merged to `main`.

## Description

STORY-0217 lands the route2 map shell but defers the 4 readable map-signs. This story ports them: `Sign: City Park`, `Sign: Route 2`, `Sign: Column 1`, `Sign: Column 2`. Each is a one-tile event that, when the player faces it and presses INTERACT, opens a localized dialog (msgid from `public/assets/l10n/en_US.po`). After this story, the player can read those four signs in-game.

All four msgids (`here_to_north`, `welcome_location_route`, `spyder_column1_sign`, `spyder_column2_sign`) **already exist** in our `en_US.po` (verified — grep hits at lines 4333, 4343, 16382, 16385). The `translated_dialog` action **is already implemented** (`src/game/event/actions/translatedDialog.ts`). This story is therefore small: 4 event-rect entries appended to the route2 YAML, with mechanical TMX → YAML conversion.

## Context

### Upstream reference

- **TMX events** in `upstream/mods/tuxemon/maps/spyder_route2.tmx` `<objectgroup id="6" name="Events">`:
  - **Sign: City Park** (object id 83, tile `(9, 2)`):
    ```xml
    <property name="act1" value="translated_dialog here_to_north"/>
    <property name="cond1" value="is char_facing_tile player"/>
    <property name="cond2" value="is button_pressed INTERACT"/>
    ```
  - **Sign: Column 1** (object id 84, tile `(11, 7)`):
    ```xml
    <property name="act1" value="translated_dialog spyder_column1_sign"/>
    <property name="cond1" value="is char_facing_tile player"/>
    <property name="cond2" value="is button_pressed INTERACT"/>
    ```
  - **Sign: Column 2** (object id 85, tile `(15, 5)`):
    ```xml
    <property name="act1" value="translated_dialog spyder_column2_sign"/>
    (same conditions)
    ```
  - **Sign: Route 2** (object id 157, tile `(1, 7)`):
    ```xml
    <property name="act1" value="translated_dialog welcome_location_route"/>
    (same conditions)
    ```
- **Localized strings** in `upstream/mods/tuxemon/l18n/en_US/LC_MESSAGES/base.po` — all 4 msgids present. Already mirrored into our `public/assets/l10n/en_US.po`:
  - `welcome_location_route` (our line 4333) — generic "Welcome to ${var:location_name}" template; needs text-substitution support (already implemented; see `src/game/textFormatter.ts`).
  - `here_to_north` (our line 4343) — "City Park to the north" style.
  - `spyder_column1_sign` (our line 16382) — flavor lore.
  - `spyder_column2_sign` (our line 16385) — flavor lore.

### Current state in our codebase

- `public/assets/l10n/en_US.po` — all four msgids already in place. **No l10n changes.**
- `src/game/event/actions/translatedDialog.ts` — implemented; calls `t(key)` then `formatText(…)` then shows a `DialogBox`. Already used by other signs (e.g. paper_town's signs that landed in STORY-0196). **No engine changes.**
- `src/game/event/conditions/charFacingTile.ts` — verify implemented. Used by every interact-style event. Grep `src/game/event/conditions/charFacingTile.ts` confirms presence.
- `src/game/event/conditions/buttonPressed.ts` — implemented (`src/game/event/conditions/buttonPressed.ts`). `INTERACT` button binding is the existing one used by every other sign / NPC.
- `public/assets/events/spyder_route2.yaml` — after STORY-0217 lands, contains 8 base events. This story appends 4 sign events.
- `public/assets/events/spyder_paper_town.yaml` — already has working sign events using the same `translated_dialog` + `char_facing_tile` + `button_pressed` pattern (look for `Sign:` entries there as a reference for the YAML shape).

### Template stories

- **`board/done/STORY-0196-port-paper-town-and-block`** — original "TMX-events-to-YAML" recipe that ported the paper_town signs. Same exact pattern applies here.
- **`board/done/STORY-0216-paper-town-east-road-content`** — companion route-port for reference on how single-tile interactable events fit in route YAML.

## What to build

1. **Append 4 sign events to `public/assets/events/spyder_route2.yaml`** (after STORY-0217's 8 base events). Each event has `width: 1, height: 1` (single tile). Match the TMX `name=` verbatim — colons and spaces preserved as YAML key. Example:
   ```yaml
   "Sign: City Park":
     x: 9
     y: 2
     conditions:
       - is char_facing_tile player
       - is button_pressed INTERACT
     actions:
       - translated_dialog here_to_north
   ```
2. **Verify msgid text renders correctly.** Walk through each sign during QA and confirm the dialog box shows the English string — especially `welcome_location_route` which uses `${var:location_name}` substitution. The `location_name` variable should resolve to "Route 2" or similar; if not, check that route2's `set_variable location_name:…` is firing (it may need to be triggered on map enter — verify against how paper_town does it).

3. **No engine changes expected.** This is a YAML-only port if all the dependencies hold.

## Engine-side considerations

- **`welcome_location_route` template-variable substitution.** The msgid almost certainly references `${var:location_name}` or similar; the engine's `formatText` (in `src/game/textFormatter.ts`) must already substitute it (paper_town's `welcome_location_*` works the same way). If route2 doesn't yet `set_variable location_name:…` on map enter, the substitution will fall through to literal `${var:location_name}` text on the sign. **Verify and fix if broken** — either by adding a `set_variable` event to route2 YAML on entry, or by having `OverworldScene` set it from the map's `slug` property. Cite which approach paper_town uses and match.
- **No new conditions or actions needed.** All three (`translated_dialog`, `char_facing_tile`, `button_pressed`) are implemented.
- **Sign tile rendering.** The signs are visible objects on `Layer 1..4` of the TMX; the sign-shaped tile graphic is part of the rendered map. STORY-0217 ports those layers verbatim, so the signs render visually as part of the map shell; this story only wires the interactability.

## QA Validation

Write `qa/route2-signs-test.ts`. For each of the 4 signs:

1. **Sign: Route 2** at `(1, 7)`:
   - `setupGame(page)`, then `await page.evaluate(() => window.A.teleport("spyder_route2", 1, 8))` (one tile south of the sign).
   - Face up. Press INTERACT. Assert a dialog opens. Assert dialog text matches `t("welcome_location_route")` with `location_name` substituted (e.g. "Welcome to Route 2.").
   - Advance dialog. Confirm it closes. No second prompt.
   - Screenshot `qa/screenshots/route2-sign-route2.png`.
2. **Sign: City Park** at `(9, 2)`:
   - Teleport `(9, 3)`. Face up. INTERACT. Assert `t("here_to_north")`.
3. **Sign: Column 1** at `(11, 7)`:
   - Teleport `(11, 8)`. Face up. INTERACT. Assert `t("spyder_column1_sign")`.
4. **Sign: Column 2** at `(15, 5)`:
   - Teleport `(15, 6)`. Face up. INTERACT. Assert `t("spyder_column2_sign")`.
5. **Negative check.** Stand one tile away from a sign and press INTERACT — assert no dialog opens. Confirms `char_facing_tile` is gating correctly.
6. **Pre-commit gates** pass.

## Out of scope

- Trainer NPCs — STORY-0218.
- Wild encounters — STORY-0219.
- Billie cutscene — STORY-0221.
- Environment day/night events — STORY-0222.
- Other maps' signs (citypark, etc) — STORY-0223 + its follow-ups.
- Sign-graphic tile sprite changes (the visible sign tile is part of the map JSON STORY-0217 ports; this story only wires interactability).

## Acceptance Criteria

- [ ] `public/assets/events/spyder_route2.yaml` contains 4 new sign events: `Sign: City Park` at `(9, 2)`, `Sign: Column 1` at `(11, 7)`, `Sign: Column 2` at `(15, 5)`, `Sign: Route 2` at `(1, 7)`. Each has `conditions: [is char_facing_tile player, is button_pressed INTERACT]` and `actions: [translated_dialog <msgid>]`.
- [ ] Pressing INTERACT while facing each sign opens a dialog with the localized text from `en_US.po`.
- [ ] `welcome_location_route` substitution renders the route name (e.g. "Route 2") correctly — not literal `${var:location_name}`.
- [ ] Pressing INTERACT while NOT facing a sign does not open the sign dialog.
- [ ] `qa/route2-signs-test.ts` passes; 4 screenshots committed.
- [ ] No regressions: existing QA scripts still pass (especially paper_town signs which use the same engine path).
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass.
