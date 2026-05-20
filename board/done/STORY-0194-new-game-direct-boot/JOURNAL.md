# Journal: STORY-0194 new-game direct boot

## 2026-05-20 — Reviewer findings

Approved. Story moves from `reviewing` to `done`.

**Validated OK:**
- `TitleScene.onNewGame()` now pre-sets `scenario_choice=spyder_campaign`,
  `gender_choice=gender_male`, `race_choice=white_male`, applies the
  matching `adventurer` template via the shared `RACE_DEFAULTS` map, and
  calls `scene.start("OverworldScene", { mapKey: "spyder_bedroom",
  spawnTileX: 4, spawnTileY: 4, spawnFacing: "down" })`.
- Verified against upstream `mods/tuxemon/maps/start_tuxemon.yaml`:
  destination is `spyder_bedroom.tmx,4,4` and `white_male →
  set_template player,adventurer,adventurer`. Port is faithful.
- `OverworldScene.init()`'s old auto-launch of `CutsceneScene` is removed,
  replaced by a comment pointing forward to STORY-0198 (which will delete
  `start_tuxemon.yaml`). The YAML and its supporting actions/conditions
  remain in the repo per story instructions.
- `RACE_DEFAULTS` made `export`-ed from `debug.ts` so `TitleScene` shares
  the same race → template/gender table that `setupGame()` uses. Avoids
  duplication; small clean refactor.
- `setupGame()` itself is unchanged. It already set the same variables
  and goes through `scene.start("OverworldScene", ...)`, so curated QA
  scripts keep working without modification.
- `qa/title-screen-test.ts` extended to assert player at (4,4) facing
  down, `scenario_choice/gender_choice/race_choice` set, `got_starter`
  unset, party empty, and `template === "adventurer"`. Reasonable scope —
  no excessive test bloat.
- The post-boot screenshot captures the spyder_bedroom "Intro Question"
  dialog overlay ("Do you want to skip…"). That event is upstream
  behaviour fired on first entry to `spyder_bedroom.tmx` and is the
  expected next-step for STORY-0197's bin cutscene. Test comment calls
  this out explicitly.

**Note on the reference screenshot:**
- The reference at `~/Pictures/Screenshots/20260520_110050.png` shows a
  blonde-haired character on the rug, but the `adventurer` sprite in
  both our repo and `upstream/mods/tuxemon/sprites/adventurer.png` is
  actually the blue-hat character that the QA screenshot captures. The
  implementor's mapping is correct per upstream; the reference image
  was apparently taken with a different template (likely `heroine` or
  an older sprite). Not an implementation defect — story-authoring
  artifact. Player position on the rug matches.

**Pre-commit gates re-run:**
- `npm run format:check` — clean.
- `npm run lint` — clean.
- `npx tsc --noEmit` — clean.
- `npm test` — 440/440 pass across 41 files.

**QA scripts re-run on port 8082:**
- `qa/title-screen-test.ts` — OK (all new assertions pass).
- `qa/smoke.ts` — OK.
- `qa/shop-purchase-test.ts` — PASS (verifies `setupGame()` still
  reaches a playable session after the boot-path changes).
