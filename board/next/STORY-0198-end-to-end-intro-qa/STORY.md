# STORY-0198: End-to-end intro playthrough QA + setupGame cleanup

## Description

Final story in the intro-replacement series. Two goals:

1. **End-to-end Puppeteer QA** that walks the entire new-game flow — title → New Game → character creation (scenario/gender/race/skin) → bedroom intro → scoop cutscene → bedroom → downstairs → paper_town → blocked by Stop! → into mart → talk to Dante → out of mart → My First Mon cutscene → pick a bin → first battle vs Billie → battle resolves and bins are no longer interactable. The script doubles as a regression gate for every story in the intro series.
2. **Clean up `setupGame()`** in `src/game/debug.ts` and audit which session vars are actually read anywhere, so the QA bypass stays minimal and correct.

**Depends on**: STORY-0195 (done), STORY-0199 (char creation), STORY-0200 (downstairs), STORY-0201 (monster info viewer), STORY-0196 (paper_town), STORY-0197 (scoop). All intro pieces must be in place.

### Reference screenshots (in `/home/jake/Pictures/Screenshots/`)

- `20260520_110050.png` — bedroom view, player on the rug before the intro question
- `20260520_110852.png` — scoop yard with the `Choice` monster-select menu open
- `20260520_133200.png` — Lambert in the monster info viewer (used at the bin)

### What to build

#### 1. End-to-end QA script — `qa/campaign-intro-playthrough.ts`

Single script, no `setupGame()`. The whole point is to validate the unscripted new-game path. Estimated ~31 checkpoints:

**Phase 1 — character creation**
1. `launchGame()`. Verify title screen renders.
2. Pick "New Game". Verify scenario menu (3 options).
3. Pick "spyder_campaign". Verify gender menu (3 options).
4. Pick "gender_male". Verify race menu (2 options).
5. Pick "white_male". Verify teleport to `spyder_bedroom.tmx,4,4`.

**Phase 2 — bedroom intro**
6. **Screenshot:** bedroom rug view — diff vs `20260520_110050.png`.
7. Verify "Do you want to skip the intro?" dialog appears.
8. Pick "yes" (skip the cinematic; STORY-0195's own QA covers the cinematic path).
9. Verify teleport to `spyder_paper_scoop.tmx,4,8`.

**Phase 3 — scoop cutscene**
10. Watch `Intro Storekeeper` choreography. Advance dialogs.
11. At the name prompt, type `"Test"` + Enter.
12. **Screenshot:** scoop with `Choice` menu open — diff vs `20260520_110852.png`.
13. Pick first starter (budaye). Confirm "yes".
14. Watch `Continue Storekeeper` exit choreography. Verify teleport back to `spyder_bedroom.tmx,3,4`.
15. **Assert:** player party is empty, `intro_scoop=done`, `billie_choice=budaye`.

**Phase 4 — leave the bedroom**
16. Walk player to (7,2). Verify teleport to `spyder_downstairs.tmx,0,2`.
17. Walk south to the door. Verify teleport to `spyder_paper_town.tmx,10,7`.

**Phase 5 — blocked at Stop!**
18. Walk player north toward (13,1). Verify `Stop!` event fires: Dante spawns, dialog, escort, removed.
19. **Assert:** player ends at (13,3) facing down, party still empty.

**Phase 6 — go to the mart, talk to Dante**
20. Walk to mart door at (19,12). Verify teleport to `spyder_paper_scoop.tmx,6,10`.
21. Walk to Dante. Press INTERACT. Verify `spyder_papertown_danteresting` dialog, `dantefirst:yes` set.
22. Walk to (6,10) facing down. Verify teleport back to `spyder_paper_town.tmx,19,13`.

**Phase 7 — My First Mon → bin pick**
23. Walk south into the (23,13) strip. Verify `My First Mon - Not Met` fires: Dante walks player, dialogs, walks to (26,9), more dialogs, despawns, `dantebin:yes` set.
24. Walk to bin at (22,9). Press INTERACT facing it.
25. Verify dialog `spyder_papertown_thereis` → MonsterInfoScene opens for rockitten → dialog `spyder_papertown_rockitten` → yes/no choice. **Screenshot the MonsterInfoScene** and diff vs `20260520_133200.png` (note: the reference is Lambert, but the layout should match for any monster — pick whichever has the cleanest data).
26. Pick "yes". Verify rockitten added to party at L5, `firstfightdue:yes`, `mymonchoice=rockitten`.

**Phase 8 — first fight**
27. Walk to (25,8). Verify `First Fight - Start`: friendship_scroll added to inventory, Billie spawns, dialog, **battle starts vs `spyder_route3_zoolander` with Billie holding `billie_choice` (budaye, L5)**.
28. Force-win via debug. Verify `First Fight - Win`: dialogs, Billie walks away, removed, player party healed, `firstfightend:yes`.

**Phase 9 — post-intro state**
29. **Assert:** all 5 bins no longer interactable (party_size>0). Walk to a bin, press INTERACT — nothing happens.
30. Walk north to (13,1). Verify `Stop!` no longer fires (party_size>0).
31. Verify player can now walk freely.

#### 2. Audit and clean up `setupGame()` in `src/game/debug.ts`

After the intro series, the canonical post-intro state is large. List every variable `setupGame` currently sets, then `grep -r` across `src/` and `public/assets/events/` to find which are actually read. **Drop dead vars.**

Likely live after intro: `intro_scoop`, `choice_phase`, `billie_choice`, `myintrochoice`, `dantefirst`, `dantebin`, `mymonchoice`, `firstfightdue`, `firstfightend`, `<slug>chosen` (5 vars), `spokendante`, `scenario_choice`, `gender_choice`, `race_choice`, `question_intro`, `spyder_intro`.

Likely dead now: anything left over from the prior hand-written scoop/town events (e.g. `got_starter`, `gender`/`race` if `set_template` does the work directly).

Add `setupGame` options for each meaningful post-intro state — particularly `dantefirst`, `dantebin`, `firstfightend` — so QA can land in any phase.

#### 3. CLAUDE.md QA snippet refresh

Update the "Always call `setupGame()` right after `launchGame()`" example in `CLAUDE.md` to reflect post-intro defaults (probably `spyder_paper_town` somewhere safe, with the post-intro variable set above).

#### 4. Decide the fate of any orphaned event YAMLs

After this series, are any files in `public/assets/events/` no longer referenced by any map? Check by enumerating event files and grepping for their basenames in `maps.ts`. If `start_tuxemon.yaml` was kept as a stub but is now superseded by STORY-0199's port, either remove it or document why it's kept (per `[[feedback_dead_code]]`).

### Engine notes

No new actions or conditions in this story. Pure cleanup + QA wiring.

### QA Validation

This story IS the QA. Acceptance is:
- `qa/campaign-intro-playthrough.ts` runs end-to-end and passes.
- All previously-passing QA scripts (smoke, campaign-playthrough, etc., plus each per-story QA introduced by 0195/0196/0197/0199/0200/0201) still pass after the `setupGame` cleanup.

## Acceptance Criteria

- [ ] `qa/campaign-intro-playthrough.ts` exists, runs end-to-end, and asserts on each of the ~31 checkpoints above
- [ ] All three reference screenshots validated against in-game captures (bedroom, scoop choice menu, monster info viewer)
- [ ] `setupGame()` variables audited; dead vars removed; new options added for each meaningful intro-phase state
- [ ] All existing QA scripts pass unchanged after the cleanup
- [ ] Orphaned event YAMLs removed or explicitly kept with justification
- [ ] `CLAUDE.md` QA section reflects current `setupGame` defaults
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
