# Journal: STORY-0198 end-to-end intro QA + setupGame cleanup

## 2026-05-20 — Reviewer findings

Approved. Story moves from `reviewing` to `done`.

**Validated OK:**

- `qa/campaign-intro-playthrough.ts` runs end-to-end on a clean
  `launchGame()` (no `setupGame` bypass) and prints `OK` for all nine
  phases. The script covers the full ~31-checkpoint flow from the
  story: title → New Game → character creation → bedroom intro skip →
  scoop cutscene + budaye pick → bedroom → downstairs → paper_town →
  Stop! blocker → mart + Dante → My First Mon cutscene → Rockitten
  bin pick → first fight vs Billie (force-win) → post-intro inert
  bins + suppressed Stop!.
- All three reference screenshots are captured by the script and land
  in `qa/screenshots/campaign-intro-{bedroom-rug,scoop-choice,
  monster-info-rockitten}.png`. Spot-checked visually against the
  references in `~/Pictures/Screenshots/`:
  - **scoop-choice** matches the reference exactly — five-starter
    Choice menu open, NPCs lined up, shopkeeper at counter.
  - **monster-info-rockitten** matches the layout of the Lambert
    reference; story explicitly allowed picking any monster for this
    one.
  - **bedroom-rug** captures the rug + adventurer sprite plus the
    "Do you want to skip the intr…" dialog overlay. The reference
    screenshot is the rug *before* the dialog opens, but the engine
    auto-fires the Intro Question event on first entry, so the
    overlay is unavoidable without a pre-event hook. Not a defect —
    matches the precedent set in STORY-0194's JOURNAL where the same
    overlay was accepted.
- `setupGame()` audit and cleanup. The implementor moved the default
  spawn from `spyder_cotton_town (20,19)` to `spyder_paper_town
  (20,11)` and made the defaults reflect the **post-intro** state:
  party `[budaye L5]`, `dantefirst=yes`, `dantebin=yes`,
  `firstfightend=no`, plus the inherited character-creation +
  scoop-cutscene gates. The three new phase flags are top-level
  options (`dantefirst`, `dantebin`, `firstfightend`) so QA can drop
  back into any cutscene with `setupGame(page, { dantefirst: null })`.
- Verified the variable audit by grepping every var that `setupGame`
  sets against `src/` and `public/assets/events/` — each one is read
  by at least one event YAML (or by runtime code, in the case of
  `scenario_choice/gender_choice/race_choice` for `set_template`).
  `<slug>chosen` and `spokendante` are intentionally **not** set —
  they're flipped later in the campaign (`spokendante` is set after
  the post-fight Dante dialog gated on `battle_outcome
  player,won,spyder_route3_zoolander`, well after the intro). The
  implementor's reasoning is documented inline.
- The orphaned `public/assets/events/cotton_town.yaml` is removed.
  Confirmed via `grep` that nothing in `src/` or any other YAML
  references it, and that `spyder_cotton_town.yaml` (the ported
  version that actually wires up to the current map) is unaffected.
- All existing per-story QA scripts that explicitly override
  `map/tileX/tileY` are insulated from the default change. Re-ran a
  representative sample on port 8082:
  - `qa/smoke.ts` — OK.
  - `qa/shop-purchase-test.ts` — PASS.
  - `qa/title-screen-test.ts` — OK.
  - `qa/monster-info-viewer-test.ts` — OK.
  - `qa/paper-town-blockers-test.ts` — OK (all 3 sub-cases).
  - `qa/paper-town-bins-test.ts` — OK (all 3 sub-cases).
- CLAUDE.md QA snippet refresh is accurate: it shows the bare
  `setupGame(page)` call landing post-intro on `spyder_paper_town
  (20,11)` with `[budaye L5]`, plus a couple of examples for jumping
  into the scoop cutscene and the My First Mon flow.
- `qa/harness.ts` formatting churn (re-flowed argument lists for
  `pathfindNpcTo` / `faceNpc`) is benign — Prettier-driven, no logic
  change. The new harness fields (`face`, `setEnemyHp`) plumb the
  existing debug-bridge methods that the new QA script needs.

**Code review notes:**

- `src/game/debug.ts` cleanup is clean and well-commented; the
  per-phase-flag override helper avoids the prior approach of
  scattered `vars.set` calls. The trailing comments explaining which
  YAML reads each var make this auditable as future intro stories
  add more gates.
- `qa/campaign-intro-playthrough.ts` is long (~800 LOC) but each
  phase is a self-contained function with one job. Helpers
  (`pressUntilEvent`, `driveUntil`, `dismissDialog`) are sensible
  shared abstractions for cutscene-heavy QA. No copy-paste of harness
  utility code.
- The script uses `walkTo(...).catch(() => undefined)` quite a lot;
  this is intentional — cutscene-triggering walks get yanked out from
  under `walkTo` when the engine grabs controls, and the `.catch`
  swallows the resulting rejection. Worth keeping an eye on if this
  pattern multiplies further in future QA, but not actionable here.
- Two minor uses of `window.A!.teleport(...)` in Phase 7 and Phase 8
  for positional aids (bin alcove / Billie reachability). The script
  flags both as "positional aid, not state bypass" with justification
  — the gating variables for the events that fire are all set by
  preceding actual gameplay, so no campaign event is being skipped.
  Reasonable trade-off given cardinal-only A* can't thread the bin
  alcove.

**Pre-commit gates re-run:**

- `npm run format:check` — clean.
- `npm run lint` — clean.
- `npx tsc --noEmit` — clean.
- `npm test` — 447/447 pass across 41 files.
