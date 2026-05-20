# STORY-0197 — Journal

## 2026-05-20 — Reviewer findings (approve)

### Validated

- `public/assets/events/spyder_paper_scoop.yaml` is byte-identical to
  `upstream/mods/tuxemon/maps/spyder_paper_scoop.yaml` (verified by
  `diff` — no differences).
- TMX exported to `public/assets/maps/spyder_paper_scoop.json` and
  registered in `src/game/data/maps.ts`.
- All 7 cutscene NPCs (`spyder_shopkeeper`, `spyder_dante`,
  `spyder_papermart_miles`, `spyder_papermart_shirley`,
  `spyder_route2_roddick`, `spyder_papermart_harith`, `spyder_billie`)
  resolved to spritesheets that match upstream `sprite_name` exactly
  (shopkeeper, shopassistant, tennisplayer_green, picnicker,
  tennisplayer_fiery, beachcomber_copper, fashionista). All 7
  spritesheet PNGs `cmp`-equal upstream.
- All required l10n msgids present in `en_US.po`:
  `spyder_intro_shopkeeper1-4`, `spyder_intro_question_name`,
  `potions_in_shop`, `spyder_papertown_dante{resting,working,1,2,3}`.
  `areyousure` is correctly identified as a variable name, not a msgid.
- Engine fixes are minimal and well-targeted:
  - Loader accepts `behav:` as either string or list — list form is
    what upstream serializes (`- talk spyder_dante`). New tests in
    `event-engine.test.ts` cover the list shape and load the verbatim
    paper_scoop YAML (27 events) end-to-end.
  - `createNpc` tolerates behavior keywords in slot 4 (`wander` → no
    crash, defaults facing to `down`). Parameterized test covers
    direction, behavior, and missing-arg cases.
  - `DebugBridge.setupGame` primes `choice_phase:progress`,
    `myintrochoice`, `billie_choice` for post-intro scoop QA, with a
    `variables` override (incl. `null` to unset) so first-visit QA can
    clear the gates.
- Pre-commit gates all pass: `npm run format:check`, `npm run lint`,
  `npx tsc --noEmit`, `npm test` (447 tests, up from 441).
- QA suite all passes against dev server on port 8082:
  - `paper-scoop-intro-test.ts` drives the full cutscene — verifies
    all 7 NPCs spawn at their upstream positions, walks the rename
    prompt, opens the 5-starter Choice menu (screenshot captured to
    `qa/screenshots/paper-scoop-choice.png` and matches the reference
    pictured in the story), confirms with yes, watches the exit
    choreography teleport back to `spyder_bedroom (3,4)`, and
    **explicitly asserts the player's party stays empty** — the
    corrected acceptance criterion.
  - `paper-scoop-talk-dante-test.ts` covers second-visit Dante
    interaction (sets `dantefirst:yes`, the gate STORY-0196 needs) and
    Go Outside teleport to paper_town.
  - `shop-purchase-test.ts` moved to `spyder_cotton_scoop` —
    justified: the verbatim paper_scoop YAML has no shop event (that
    was arithmon-only divergence). Cotton scoop has the same
    shopkeeper-behind-counter setup and `open_shop` event; the test
    still exercises the buy/inventory/gold flow end-to-end.
  - Existing suite (`bedroom-intro`, `spyder-downstairs`,
    `character-creation`, `monster-info-viewer`, `title-screen`,
    `smoke`) all pass unchanged.

### Notes (non-blocking)

- `Talk Dante No Party` uses `behav: [talk spyder_dante]` (YAML list
  form) — handled by the loader change. The unit test for the list
  form is more important than it first looks: every upstream event
  YAML serializes this way.
- The `wander` behavior is a no-op stub for now — Dante stands still
  at (11,6) post-intro instead of wandering. Acceptable per the story:
  "acceptable initial: wandering is a no-op stub". A future story can
  add real wander behavior; nothing in the campaign depends on it.
