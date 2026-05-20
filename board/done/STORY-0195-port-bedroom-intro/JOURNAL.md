# Journal: STORY-0195 port bedroom intro cinematic

## 2026-05-20 — Reviewer findings

Approved. Story moves from `reviewing` to `done`.

**Validated OK:**
- `public/assets/events/spyder_bedroom.yaml` is byte-identical to
  `upstream/mods/tuxemon/maps/spyder_bedroom.yaml` (`diff` returns
  zero). All upstream events ported: Go Downstairs, Intro Question,
  No Intro, Play Music, Resting in Bed, Spyder Intro, Use Computer,
  Use Computer Kernel. Gating conditions use `question_intro` /
  `spyder_intro` as required by `setupGame()`.
- `Resting in Bed` now includes the upstream `char_stop player` +
  `lock_controls` / `unlock_controls` framing — matches the story's
  "port verbatim" instruction.
- `Go Downstairs` event added at (7,2) with the upstream
  `transition_teleport player,spyder_downstairs.tmx,0,2,0.3` action.
- All required PO strings already present in
  `public/assets/l10n/en_US.po`: `spyder_intro_question`,
  `spyder_intro00..03`, `spyder_papertown_restinbed`, `spyder_pc_alert`,
  plus monster display names. No new translations needed.
- Background assets resolved: `spyder_tumble`, `spyder_monsters`,
  `spyder_morph` already loaded in `OverworldScene.preload()`;
  `gradient_blue` is a named color in `changeBgShared.ts` (not an
  image asset — flat blue rectangle, matches upstream semantics).
- Engine fix in `changeBgChar.ts`: previously treated arg 2 as a raw
  texture key, which silently failed for upstream NPC slugs like
  `spyder_omnichannel_beaverbrook`. The implementor added a registry
  lookup (`hasNpcSprite` → `getNpcSprite().spritesheet`) with a
  raw-key fallback so older call sites that pass sheet names directly
  still work. Small, well-scoped, kept under one helper function.
- Removed the placeholder
  `public/assets/sprites/spyder_omnichannel_beaverbrook.png` that was
  shadowing the real `ceo` sheet — verified the CEO sprite renders
  during the cinematic (screenshot below).
- `OverworldScene.getDebugState()` now exposes `mapKey` — minor and
  reasonable; the bedroom-intro test asserts on map transitions
  without reaching into session internals.

**QA validated (`ARITHMON_PORT=8082`):**
- `qa/bedroom-intro-test.ts` — both paths pass:
  - skip path: choice "yes" sets `question_intro=yes` then `No Intro`
    fires, sets `spyder_intro=yes`, teleports to `spyder_paper_scoop`
    at (4,8).
  - cinematic path: choice "no" plays the five-monster CEO cinematic
    (21 interact presses to clear), then teleports to the same scoop
    coords.
- `qa/screenshots/bedroom-intro-prompt.png` shows player on the rug
  with the "Do you want…" dialog open — matches the reference at
  `~/Pictures/Screenshots/20260520_110050.png` for layout (bed
  top-left, computer top-middle, stairs right, plant bottom-right,
  player centered on rug). The character sprite differs from the
  reference (same `adventurer` vs. older sprite mismatch flagged in
  STORY-0194 — not a defect).
- `qa/screenshots/bedroom-intro-cinematic-ceo.png` shows the CEO
  sprite on the blue backdrop with "Hello, I am the CEO of Omni…"
  dialog — confirms the `change_bg_char` registry fix works.
- `qa/smoke.ts`, `qa/title-screen-test.ts`, `qa/shop-purchase-test.ts`
  all pass unchanged — `setupGame()` continues to bypass the bedroom
  intro via the pre-existing `question_intro=yes` / `spyder_intro=yes`
  variables, which match the YAML gating exactly.

**Pre-commit gates re-run:**
- `npm run format:check` — clean.
- `npm run lint` — clean.
- `npx tsc --noEmit` — clean.
- `npm test` — 440/440 pass across 41 files.
