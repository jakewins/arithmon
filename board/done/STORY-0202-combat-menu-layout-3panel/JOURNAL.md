# Journal: STORY-0202 combat menu — 3-panel layout

## 2026-05-20 — Reviewer findings

Approved. Story moves from `reviewing` to `done`.

**Validated OK:**

- Three-panel layout renders simultaneously during technique selection (see
  `qa/screenshots/0202-02-fight-tech-popup.png`): top-right popup with
  techniques + `▶` cursor, bottom-right 2×2 main menu (FIGHT/ITEM/TUXEMON/RUN)
  drawn dimmed underneath, bottom-left info card with
  `<Name> / Accuracy XX% / RANGE / Power X / Cost X DP`.
- `techPopupBorder` is a new nine-slice declared alongside the existing
  `leftBorder` / `rightBorder` in `src/game/scenes/CombatScene.ts`; size +
  position are recomputed every `buildTechLabels()` call to fit the longest
  move name (mirroring upstream's shrink-to-items menu in `combat_menus.py`).
  Min-width clamped to `RIGHT_W` so the popup visually anchors with the main
  menu — sensible default for legibility.
- Info card text rules match the spec:
  - `Accuracy` from `Math.round(tech.accuracy * 100)` — verified 85%, 100%,
    80% for Ram / Boulder / Mudslide.
  - `Power` derived from the **first** `{ kind: "damage", power }` effect;
    correctly hidden for non-damage moves (`Boulder` carries only a
    `statStage` armor buff and rendered with no Power line — see
    `qa/screenshots/0202-03-tech-cursor-moved.png`).
  - `Cost X DP` from `tech.dpCost` (rendered in purple `#7733aa`,
    matching the existing DP color convention).
  - Range label rendered as uppercase plain text (`MELEE` / `RANGED`); icon
    artwork intentionally deferred to STORY-0203 — verified no stub icon
    code crept in.
- Cursor movement in the techniques popup re-renders the info card
  immediately. `refreshInfoCardForTechCursor()` is called on every
  up/down keypress, on every `pointerdown` handler, and once from
  `buildTechLabels()` at entry — verified visually by moving the cursor
  through Ram → Boulder → Mudslide and watching the info card swap
  contents in lockstep.
- Landing on the RECHARGE row hides the info card and shows
  "Solve a math problem to recharge Dark Power." in the bottom-left, then
  restoring the info card when cursor moves back to a technique. Nicely
  done — this wasn't in the acceptance criteria but is the right call.
- ESC / X / Backspace from technique selection returns to main: info card
  hides, `messageText` flips back to "What will Rockitten do?", main menu
  un-dims via the new `refreshMainMenuColors()` helper, and the popup
  border hides. Verified via DOM keyboard events + screenshot
  (`qa/screenshots/0202-05-back-to-main.png`).
- `debugSelectChoice` for `menuMode === "techniques"` still works — picked
  technique 0 (Ram), watched the action resolve through the machine,
  enemy HP dropped from 72 to 3, menu returned to `main`. No regressions
  to the debug code path.
- Refactor of trainer-RUN dimming into `refreshMainMenuColors()` is a clean
  consolidation — was previously inlined in `setMenuMode("main")`, now
  reusable from both initial-show and the ESC-back path. Minimal, no
  over-engineering.
- "Not enough Dark Power!" path now hides the info card before showing the
  error in `messageText` (otherwise the info card text would visually
  collide with the error). Defensive, sensible.

**Minor observation (not bouncing):**

- In `upstream-combat-ui.png` the FIGHT row of the main menu stays
  highlighted (with a cursor) while only TUXEMON/FORFEIT are dimmed.
  This implementation dims **all four** cells. The story's acceptance
  criterion just said "main menu remains visible (dimmed)" — both
  readings are defensible, and the current behavior is consistent with
  the explicit AC. Leaving as-is.

**Pre-commit gates re-run on `review-wip`:**

- `npm run format:check` — clean.
- `npm run lint` — clean.
- `npx tsc --noEmit` — clean.
- `npm test` — 447/447 pass across 41 files.

**QA performed (port 8082):**

- `qa/local/story-0202-combat-menu.ts` — spawn Rockitten(15) vs Agnite(5),
  pick FIGHT, screenshot each menu state, navigate cursor down twice,
  ESC back to main. Confirms three-panel layout + info card refresh +
  back navigation.
- `qa/local/story-0202-combat-flow.ts` — full attack flow via
  `debugSelectChoice`: FIGHT → Ram → action resolves → menu returns to
  main. Confirms no regression to the existing combat code path.
