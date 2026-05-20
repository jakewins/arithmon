# STORY-0195: Port spyder_bedroom intro cinematic from upstream

## Description

Replace our hand-written `public/assets/events/spyder_bedroom.yaml` with a port of upstream Tuxemon's verbatim. Current upstream has an intro cutscene in the bedroom: a "skip the intro?" prompt, an optional five-monster cinematic, and a teleport to `spyder_paper_scoop.tmx` to kick off the bin starter-pick (handled by STORY-0197).

**Depends on**: STORY-0194 (new-game boot lands the player in the bedroom).

### Upstream reference

- `upstream/mods/tuxemon/maps/spyder_bedroom.yaml` — the event script (verbatim source).
- `upstream/mods/tuxemon/l18n/en_US/LC_MESSAGES/base.po` — the dialogue strings (search for `spyder_intro_question`, `spyder_intro00`..`spyder_intro03`, `dollfin`, `ignibus`, `memnomnom`, `budaye`, `grintot`, `spyder_papertown_restinbed`, `spyder_pc_alert`).

### What to build

1. **Replace `public/assets/events/spyder_bedroom.yaml`**
   - **Literal copy:** `cp upstream/mods/tuxemon/maps/spyder_bedroom.yaml public/assets/events/spyder_bedroom.yaml`. Our loader's YAML schema (`src/game/event/loader.ts`) is byte-compatible with upstream's — same fields (`conditions`, `actions`, `behav`, `x`, `y`, `width`, `height`), same action/condition string syntax. No hand-translation needed.
   - **Then verify:** run the QA in this story. If anything fails because an action/condition isn't implemented or behaves differently, document the gap and either (a) fix our engine to match upstream, or (b) note the deviation in a comment in the YAML — but **only after** the copy fails.
   - The default mindset is "drop it in and trust the engine", not "rewrite it".

2. **Port the dialogue strings**
   - Extract these msgids from `upstream/mods/tuxemon/l18n/en_US/LC_MESSAGES/base.po` and append them to `public/assets/l10n/en_US.po`:
     - `spyder_intro_question`
     - `spyder_intro00`, `spyder_intro01`, `spyder_intro02`, `spyder_intro03`
     - `dollfin`, `ignibus`, `memnomnom`, `budaye`, `grintot` (monster display names — likely already present; verify)
     - `spyder_papertown_restinbed`
     - `spyder_pc_alert`
   - Multi-line strings in PO format: preserve the continuation-line syntax our `loadPO` parser expects.

3. **Background art for the cinematic**
   - The "Spyder Intro" event uses `change_bg gradient_blue`, `change_bg_char gradient_blue,spyder_omnichannel_beaverbrook`, `change_bg_monster gradient_blue,<monster>`, and `change_bg gradient_blue,spyder_tumble,image` / `spyder_monsters,image` / `spyder_morph,image`.
   - Verify our `changeBg*` actions can resolve these asset names. Required background images:
     - `gradient_blue` (gradient backdrop — likely already present from `start_tuxemon.yaml`)
     - `spyder_tumble`, `spyder_monsters`, `spyder_morph` (intro slides)
     - `spyder_omnichannel_beaverbrook` (NPC portrait)
     - Monster portraits for `dollfin`, `ignibus`, `memnomnom`, `budaye`, `grintot`
   - For any image not present, copy from `upstream/mods/tuxemon/gfx/ui/` (or wherever upstream stores them — search for the filename) into `public/assets/`. If any are unobtainable, fall back to `gradient_blue` and note the deferral.

4. **Confirm the "Resting in Bed" event**
   - Our current version has it (uses `screen_transition`, `set_monster_health`, `set_monster_status`, `set_teleport_faint`). Upstream's version is similar but uses `char_stop player` + `lock_controls` first, then `unlock_controls`. Port upstream verbatim — the difference is intentional (avoids movement-mid-cutscene bug).

5. **Confirm the "Go Downstairs" event**
   - Upstream has a downstairs trigger at (7,2) → `transition_teleport player,spyder_downstairs.tmx,0,2,0.3`. We don't have this yet — add it. The downstairs map already exists in our repo.

### Engine notes

- All actions used (`change_bg`, `change_bg_char`, `change_bg_monster`, `translated_dialog`, `translated_dialog_choice`, `set_variable`, `transition_teleport`, `char_face`, `play_music`, `char_stop`, `lock_controls`, `unlock_controls`, `screen_transition`, `set_monster_health`, `set_monster_status`, `set_teleport_faint`, `access_pc`) are already registered in our event engine. Verify by listing `src/game/event/actions/`.
- All conditions used (`variable_set`, `music_playing`, `char_at`, `char_facing_tile`, `button_pressed`) are already registered.
- If `change_bg_monster` or `change_bg_char` don't render the right asset, that's an engine bug worth fixing now (the actions exist but may not resolve the asset slug); flag it and add a small fix or stub if needed.

### Keep `setupGame()` working

`setupGame()` (in `src/game/debug.ts`) pre-sets `question_intro=yes` and `spyder_intro=yes` so QA can skip the bedroom intro. After your YAML port:
- Verify those two variables actually gate the events you ported (their condition strings must match exactly — `is variable_set question_intro:yes` etc.).
- If you change gating-variable names or values, update `setupGame()` to set the new ones.
- Run existing QA scripts (`smoke.ts`, `campaign-playthrough.ts`, the monster-line QA scripts) and confirm none of them now hit the bedroom intro by accident — they should bypass it entirely via `setupGame()`.

### QA Validation

Use `/puppeteer`. Add `qa/bedroom-intro-test.ts`:

1. Launch game, "New Game", land in bedroom at (4,4).
2. Verify the "Intro Question" dialog appears: "Do you want to skip the intro?"
3. **Path A — skip:** select "yes". Verify variables set: `question_intro=yes`, `spyder_intro=yes`. Verify teleport to `spyder_paper_scoop.tmx,4,8`.
4. **Path B — full cinematic:** select "no". Verify cinematic plays (advance through ~5 dialog steps). Verify final teleport to `spyder_paper_scoop.tmx,4,8`.
5. Screenshot during the bedroom scene (before answering the prompt) — compare against `/home/jake/Pictures/Screenshots/20260520_110050.png`. The player should be standing on the rug.

## Acceptance Criteria

- [ ] `public/assets/events/spyder_bedroom.yaml` matches `upstream/mods/tuxemon/maps/spyder_bedroom.yaml` (only justifiable deviations)
- [ ] All required PO strings appended to `public/assets/l10n/en_US.po`
- [ ] All required background images present in `public/assets/`
- [ ] "Go Downstairs", "Intro Question", "No Intro", "Spyder Intro", "Resting in Bed", "Play Music", "Use Computer" events all work in `qa/bedroom-intro-test.ts`
- [ ] Both intro paths (skip / play) end with a teleport to `spyder_paper_scoop.tmx,4,8`
- [ ] `setupGame()` still bypasses the bedroom intro (variables it sets match the gating conditions you ported); all existing QA scripts that call it still pass unchanged
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
