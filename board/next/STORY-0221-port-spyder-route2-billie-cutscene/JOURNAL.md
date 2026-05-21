# STORY-0221 Journal

## 2026-05-21 — Reviewer findings (bounce back)

### Validated

- Upstream TMX `<object id="156" name="Billie encounter">` cross-checked verbatim:
  - Trigger rect: `x=16 y=128 width=16 height=32` → tile `(1,8)` width=1 height=2. Match.
  - 21 properties (`act01`–`act90`, `cond1`, `cond2`) in upstream. All 19 actions and 2 conditions present in YAML, in correct numerical sort order. Match.
  - Action values character-for-character identical to upstream.
- `billie_choice` variable resolution: QA confirmed Billie's lead monster resolves to a real slug (not literal "billie_choice") — `budaye` matching `setupGame` defaults.
- Billie party verified: `[billie_choice L6, eyenemy L6, cardiling L3]`. Match.
- `route2billie:yes` gate: set correctly after win; absent after loss (retryable).
- Engine additions (`encounterDebugFlags.suppress` + `setSuppressEncounters`) are minimal, clean, and well-scoped — identical pattern to the existing `forceRoll` flag.
- Pre-commit gates re-run: `format:check`, `lint`, `tsc --noEmit`, `npm test` (480 tests, 43 files) — all green.
- `qa/route2-billie-test.ts` executed with `ARITHMON_PORT=8082`: all 4 cases passed — first-walk-in trigger end-to-end (win), no re-trigger on re-entry, control lock blocks movement, battle loss leaves gate open.
- Screenshots `route2-billie-prebattle.png`, `route2-billie-postbattle.png`, `route2-billie-loss.png` look correct.
- `qa/route2-signs-test.ts`: all 6 cases pass.
- `qa/route2-trainers-test.ts`: all 3 cases pass.

### Defect

- `qa/cotton-town-east-road-test.ts` → `testNoEncountersOrNpcs` **fails** with `waitForIdle timed out`. The implementor updated 4 other cases in this file (adding `route2billie: "yes"` guards and adjusting spawn points) but missed this case. Root cause: Roddick (STORY-0218 trainer) walks south from `(5,3)` to `(5,7)` and sight-lines the player spawned at `(5,8)`, leaving the engine blocked indefinitely. This is a pre-existing break from STORY-0218, but the implementor had the file open and should have fixed it. The fix is minor: relocate the spawn to open grass (e.g. `(15,12)`) away from all trainer sight-lines and also add `route2billie: "yes"` for consistency.
- See `todos/open/01-fix-quiescence-test-waitforidle-timeout.md` for instructions.
