# STORY-0194: New-game boots straight to Spyder bedroom

## Description

Replace our current character-creation cutscene (campaign / gender / race chooser via `public/assets/events/start_tuxemon.yaml`) with a direct boot into `spyder_bedroom.tmx`. Current upstream Tuxemon still has the campaign-selection screen, but per the design call we only support Spyder and want to skip it.

**Depends on**: STORY-0193 (title screen exists and "New Game" hands off to whatever this story wires up).

### Why

Today, picking "New Game" runs `start_tuxemon.yaml` in `CutsceneScene`, which:
1. Asks scenario (spyder/xero/water)
2. Asks gender
3. Asks race / appearance
4. Teleports to the matching scenario's bedroom

We're throwing 1–3 away. Stage 4 becomes the only step: go straight to `spyder_bedroom.tmx` with a fixed default appearance.

### What to build

1. **Pick the default player appearance**
   - Hardcode `scenario_choice: spyder_campaign`, a default `gender_choice` and `race_choice` (pick whichever combo we've already QA'd most — e.g. `gender_male` + `white_male` → template `adventurer`).
   - Do this in code in the "New Game" handoff (TitleScene from STORY-0193), not in YAML. Set the session variables and `session.player.template` directly, then start `OverworldScene` pointed at `spyder_bedroom.tmx`.

2. **Stop running `start_tuxemon.yaml` on new game**
   - In `OverworldScene.init()`, the existing check that launches `CutsceneScene` when `scenario_choice` is unset (~line 550 per the field-guide) is no longer needed — TitleScene already sets the variable. Remove the auto-launch.
   - **Do not delete `start_tuxemon.yaml` or the related actions/conditions in this story** — STORY-0198 will clean those up after the full flow is wired and verified.

3. **Spawn point on `spyder_bedroom.tmx`**
   - Upstream teleports new players to `spyder_bedroom.tmx,4,4`. Match that.
   - Facing: `down`.

4. **Default name placeholder**
   - The player still has no name at this point — upstream's `rename_player` action will set it during the bin cutscene (STORY-0197). For now, leave `session.player.name` as an empty string or `"Player"` — STORY-0197 overwrites it.

### Engine notes

- No new actions/conditions.
- This story is mostly subtractive in the boot path — pulling out a CutsceneScene step.
- The existing `start_tuxemon.yaml` and the actions it uses (`set_char_attribute`, `set_template`, `translated_dialog_choice` with `scenario_choice`, etc.) stay in place; they're just unreachable from the new flow.

### Keep `setupGame()` working

QA scripts call `setupGame()` (in `src/game/debug.ts`) right after `launchGame()` to skip the intro and put the game in a ready-to-play state — see `CLAUDE.md`. Every change in this story must keep `setupGame()` functional:

- If you remove the `OverworldScene.init()` auto-launch of `CutsceneScene`, verify `setupGame()` still results in a playable session (player on the target map, with party, no stuck cutscene).
- If you change which variables gate "new game vs. resumed save", update `setupGame()` to set those same variables so it remains a one-call shortcut.
- Run all existing QA scripts (`smoke.ts`, `campaign-playthrough.ts`, etc.) after your changes and verify they still pass. They all depend on `setupGame()`.

### QA Validation

Use `/puppeteer`. Reuse / extend `qa/title-screen-test.ts` or add `qa/new-game-boot-test.ts`:

1. Launch game, see title.
2. Pick "New Game".
3. Verify we land on `spyder_bedroom.tmx` at tile (4,4), facing down, with **no party monsters**.
4. Verify session variables: `scenario_choice = "spyder_campaign"`, `gender_choice` and `race_choice` set, `got_starter` unset, party size 0.
5. Take a screenshot. Compare visually against `/home/jake/Pictures/Screenshots/20260520_110050.png` — they should look essentially identical (same room, same player sprite on the rug).

## Acceptance Criteria

- [ ] TitleScene's "New Game" path goes directly to `OverworldScene` at `spyder_bedroom.tmx,4,4`
- [ ] `start_tuxemon.yaml` is no longer played on new game (but still present in repo)
- [ ] Default appearance variables set (player has a valid template/sprite)
- [ ] New-game boot QA: bedroom screenshot matches reference at `/home/jake/Pictures/Screenshots/20260520_110050.png`
- [ ] Session has no monsters and `got_starter` is unset after new-game boot
- [ ] `setupGame()` updated to match the new boot/variable contract; all existing QA scripts that call it still pass unchanged
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
