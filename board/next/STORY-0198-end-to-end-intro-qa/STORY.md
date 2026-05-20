# STORY-0198: End-to-end intro playthrough QA + setupGame cleanup

## Description

Final story in the intro-replacement series. Two goals:

1. **End-to-end puppeteer QA** that walks the whole new-game flow — title → new game → bedroom → skip intro → scoop → cutscene → name + monster pick → back to bedroom — and screenshot-compares at the milestones the user gave us.
2. **Clean up `setupGame()`** in `src/game/debug.ts` and the now-unreachable `start_tuxemon.yaml` so QA scripts that bypass the intro keep working with the new variables.

**Depends on**: STORY-0193, STORY-0194, STORY-0195, STORY-0196, STORY-0197 — all the intro pieces must be in place first.

### What to build

#### 1. End-to-end QA script — `qa/campaign-intro-playthrough.ts`

Walk the entire intro in a single script. No `setupGame()` — the whole point is to validate the unscripted new-game path.

Steps and screenshot checkpoints:

1. `launchGame()` — title screen renders.
   - **Screenshot:** title screen.
2. Pick "New Game".
3. Land in `spyder_bedroom.tmx`.
   - **Screenshot:** bedroom — diff against `/home/jake/Pictures/Screenshots/20260520_110050.png`.
4. Dialog: "Do you want to skip the intro?" — pick "yes" (skip the cinematic for speed; STORY-0195's own QA covers the cinematic path).
5. Teleport to `spyder_paper_scoop.tmx`.
6. Watch `Intro Storekeeper` choreography. Advance dialogs.
7. Name prompt — type "Test" + Enter.
8. `Choice` menu appears.
   - **Screenshot:** scoop with choice menu — diff against `/home/jake/Pictures/Screenshots/20260520_110852.png`.
9. Pick first starter; confirm "yes".
10. Watch `Continue Storekeeper` exit choreography.
11. Land back in `spyder_bedroom.tmx,3,4`.
12. Verify: player name="Test", party has 1 monster of the chosen slug, `intro_scoop=done`, `got_starter` or equivalent flag set.
13. Walk player downstairs → outside → north → trigger the now-disabled "Stop!" event (it should NOT fire because party_size ≥ 1).

The script doubles as a regression gate — it will catch breakage in any of the intro-series stories.

#### 2. Update `setupGame()` in `src/game/debug.ts`

Currently `setupGame` sets `scenario_choice`, `gender_choice`, `race_choice`, `question_intro=yes`, `spyder_intro=yes`, `intro_scoop=done`, `got_starter=yes`, `firstfightdue=no`. After STORY-0197, the canonical post-intro variable set is:

- `scenario_choice=spyder_campaign`
- Default `gender_choice` and `race_choice` (or remove these if STORY-0194 has us setting `session.player.template` directly)
- `question_intro=yes` (skip the bedroom prompt)
- `spyder_intro=yes` (skip the cinematic)
- `intro_scoop=done` (skip the scoop cutscene)
- `choice_phase=progress` (so the scoop doesn't re-fire if you teleport there)
- `billie_choice=<starter slug>` (matches the monster setupGame adds)
- `myintrochoice=<starter slug>`
- `got_starter=yes` (if anything in the codebase still checks it — otherwise remove)

Audit which of these are actually read anywhere (`grep` across `src/` and `public/assets/events/`) and drop dead vars from the setup function. Keep behavior identical: every test that uses `setupGame` should still pass.

#### 3. Decide the fate of `start_tuxemon.yaml`

After STORY-0194, `public/assets/events/start_tuxemon.yaml` is unreachable. Per `[[feedback_dead_code]]`, dead code should be removed. Options:

- **Remove** `start_tuxemon.yaml` and any action implementations only used by it (`set_char_attribute` may still be used elsewhere — check before deleting). Update `CutsceneScene` if it had a special path for the start cutscene.
- **Keep** with a brief comment explaining it's the upstream multi-campaign chooser, kept for reference if we ever support more than Spyder.

Recommendation: **remove it.** Easy to restore from git if needed.

#### 4. Update `CLAUDE.md` QA snippet

The "Always call `setupGame()` right after `launchGame()`" section uses `spyder_paper_town` as the default. After this series, the canonical post-intro spawn map is `spyder_paper_town.tmx` near the scoop entrance — make sure the docs still match how `setupGame` actually behaves.

### Engine notes

No new actions or conditions in this story. It's pure cleanup + QA wiring.

### QA Validation

This story IS the QA. Acceptance is:
- `qa/campaign-intro-playthrough.ts` runs end-to-end and passes.
- All previously-passing QA scripts (smoke, campaign-playthrough, etc.) still pass after the cleanup.

## Acceptance Criteria

- [ ] `qa/campaign-intro-playthrough.ts` exists and passes via `/puppeteer`
- [ ] Both reference screenshots (`20260520_110050.png` bedroom, `20260520_110852.png` scoop choice) validated against in-game captures
- [ ] `setupGame()` variables updated to the new canonical set; all existing QA scripts still pass
- [ ] Dead vars removed from `setupGame` (anything not read anywhere)
- [ ] `start_tuxemon.yaml` removed (or kept with explicit justification)
- [ ] `CLAUDE.md` QA section reflects current setupGame defaults
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
