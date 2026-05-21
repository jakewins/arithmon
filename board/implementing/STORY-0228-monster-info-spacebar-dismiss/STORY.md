# STORY-0228: Monster info — spacebar dismisses

## Description

In the early game, picking a monster from a bin in `spyder_paper_town` triggers an
`open_journal <slug>` event action that launches `MonsterInfoScene` — a modal
"journal info" detail page (cream panel + sprite + stats + description). Today
that screen only closes on ESC / X / B / BACKSPACE, which is confusing for new
players (especially kids) who naturally hit SPACE to advance/dismiss. Make
spacebar also dismiss the monster info screen so it matches the players' muscle
memory from dialog boxes and the rest of the game's "confirm/advance with
space" UX.

The monster info screen has no internal choices to confirm (it's purely
informational — there are no menu items the user could activate by pressing
space), so binding SPACE as an additional dismiss key has no collision with
existing input handling.

## Context

- Scene under test: `src/game/scenes/MonsterInfoScene.ts`
  - Close keys live in lines `63-66` and the dismiss check in lines `119-124`
    (`create`) + `252-259` (`isBackPressed`):
    ```
    const KEY_ESC = 27;
    const KEY_X = 88;
    const KEY_BACKSPACE = 8;
    const KEY_B = 66;
    ```
  - Doc comment at the top of the file (line 6) says "Closes on B / ESC /
    BACKSPACE" — that needs updating too.
- Launched by the `open_journal <slug>` event action
  (`src/game/event/actions/openJournal.ts`) — fired from the paper-town bin
  events when the player inspects a bin and picks a monster. Also reachable in
  QA via `window.A.openMonsterInfo(slug)` (see `src/game/debug.ts:535`).
- Upstream reference: `upstream/tuxemon/states/journal_info.py:273` —
  upstream's `JournalInfoState.process_event` uses LEFT/RIGHT to cycle and
  relies on its parent menu's `buttons.BACK` (ESC) to close; upstream does
  *not* dismiss on SPACE. This is an Arithmon-specific UX deviation, not a
  port-correctness fix, because our players are kids who don't know to hit
  ESC. House style elsewhere already treats SPACE as confirm/advance (see
  `JournalScene.ts:143`, `PartyScreen.ts:171`, `BagScene.ts:150`,
  `ShopScene.ts:118`, `PauseMenuScene.ts:136`), so adding it as a dismiss key
  here is consistent with the rest of our UI.
- Existing QA template: `qa/monster-info-viewer-test.ts` already walks several
  monsters through open → screenshot → dismiss, dispatching keycode 66 (B).
  Re-use the same pattern but extend it.

## What to build

1. In `src/game/scenes/MonsterInfoScene.ts`:
   - Add `const KEY_SPACE = 32;` next to the other key constants (line ~67).
   - In `create()` register a `backSpace: this.input.keyboard!.addKey(KEY_SPACE)`
     entry on the `this.keys` map (alongside `back`, `backX`, `backB`,
     `backspace`).
   - In `isBackPressed()` add `|| this.justPressed("backSpace")` so SPACE
     dismisses the screen the same way B/ESC/BACKSPACE do.
   - Update the file-level doc comment (line 6) to read
     `"Closes on B / ESC / BACKSPACE / SPACE."`.
2. Extend `qa/monster-info-viewer-test.ts` so the suite covers both dismiss
   paths — one iteration of the monster loop dismisses with SPACE (keycode
   32) instead of B, asserting the scene still tears down to `OverworldScene`.
   The simplest shape: parameterise the close key in `openAndScreenshot`
   (default still keycode 66), and pass `32` for one of the slugs (e.g.
   `lambert`). Add a console.log line that prints which close key was used so
   the QA log makes it obvious both keys were exercised.

## Engine-side considerations

- The `keys` map key name `backSpace` differs by one character from the
  existing `backspace` entry (the BACKSPACE key). Keep the capitalisation
  exactly as written above so the two stay distinct in `this.keys` and in the
  `prevKeys` rising-edge bookkeeping in `update()`.
- Phaser's `input.keyboard.addKey` binds the key to the scene; when
  `MonsterInfoScene` shuts down the binding is released, so SPACE will go
  back to whatever the underlying scene (OverworldScene / dialog) does with
  it. No teardown work is needed.
- Don't introduce a `keydown-SPACE` event listener on `input.keyboard` — the
  scene already uses the polled-key + `prevKeys` rising-edge pattern; mixing
  the two styles risks double-firing (e.g. dismiss then immediately advance
  the next dialog box on the overworld with the same press). Stick with the
  existing pattern.

## QA Validation

Extend `qa/monster-info-viewer-test.ts` (don't add a new file — this is the
same scene, same checks, just one more close key). Concretely:

- Run `setupGame(page, { map: "spyder_paper_town", tileX: 22, tileY: 9 })` as
  today.
- For each monster in `VIEWER_MONSTERS`, open the scene via
  `window.A.openMonsterInfo(slug)`, screenshot, then dismiss. Use keycode 66
  (B) for the first four monsters and keycode 32 (SPACE) for one of them
  (e.g. `lambert`).
- After dismiss, assert `scene === "OverworldScene"` (already done — the
  parameterisation just needs the close key to dispatch correctly).

Reviewer should:
- Run `npx tsx qa/monster-info-viewer-test.ts` and confirm it exits OK with
  the log line showing the SPACE close was exercised.
- Eyeball the five `monster-info-*.png` screenshots — they should look
  identical to before (no visual change is intended).

## Out of scope

- Changing how OTHER modal screens (PartyScreen, BagScene, ShopScene, etc.)
  treat SPACE — they already use SPACE as their confirm key, so re-mapping it
  to dismiss there would break their semantics. This story is scoped to the
  MonsterInfoScene only.
- Re-binding ESC / X / B / BACKSPACE — they continue to work; SPACE is
  *added*, not substituted.
- Adding LEFT/RIGHT monster cycling like upstream's
  `JournalInfoState.process_event` — that's a separate piece of work.
- Localising / re-displaying the dismiss hint in the bottom-right of the
  panel (upstream renders a back-button glyph; we don't yet). If/when we add
  it, that's its own story.

## Acceptance Criteria

- [ ] Pressing SPACE on the monster info screen dismisses it and returns the
      player to `OverworldScene`, identically to pressing ESC / X / B /
      BACKSPACE.
- [ ] `src/game/scenes/MonsterInfoScene.ts` has a `KEY_SPACE = 32` constant
      and a `backSpace` entry on `this.keys`, wired into `isBackPressed()`.
- [ ] The file-level doc comment lists SPACE alongside the other dismiss
      keys.
- [ ] `qa/monster-info-viewer-test.ts` exercises both a B-press dismiss and a
      SPACE-press dismiss, with a console.log line per monster identifying
      the close key, and exits OK.
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test`
      all pass.
