# Journal: STORY-0193 title screen

## 2026-05-20 — Reviewer findings

Approved. Story moves from `reviewing` to `done`.

**Validated OK:**
- `TitleScene` registered as the first scene in `src/game/main.ts`; Phaser
  auto-starts it on boot. `loadGame()` still runs before Phaser starts so
  save state is restored before the menu builds.
- "New Game" always shown; "Load Game" only present when
  `localStorage["arithmon_save"]` exists. With save, "Load Game" is first
  and selected by default — matches upstream `start.py` ordering.
- Up/Down arrow keys move the cursor; Z / Space / Enter all confirm.
- `hasSave()` + `clearSave()` + `resetSession()` helpers added; covered by
  new `src/__tests__/save.test.ts` (round-trips through an in-memory
  `localStorage` shim).
- `clearSave()` wipes both localStorage and the in-memory `session`
  singleton (via `resetSession()` mutating in place), so a stale prior
  playthrough cannot leak into a New Game run.
- `setupGame()` continues to work unchanged from QA scripts: the existing
  `teleport()` it already calls does `scene.start("OverworldScene", ...)`
  which transparently dismisses the TitleScene. Confirmed by re-running
  `qa/smoke.ts` and `qa/shop-purchase-test.ts` against the new boot path
  — both pass.
- `qa/title-screen-test.ts` covers no-save → New Game → CutsceneScene,
  and with-save → Load Game → OverworldScene at the saved tile. Passes.

**Minor deviation from the story (intentional, accepted):**
- Story said New Game should call
  `scene.start("CutsceneScene", { yamlKey: "start-tuxemon", ... })`
  directly. Implementor instead starts `OverworldScene`, which
  auto-launches that exact cutscene when `scenario_choice` is unset
  (see `OverworldScene.create` line ~550 → `startCutscene()`). Same
  end state, lets the cutscene's existing caller-scene wiring stay
  intact. STORY-0194 will replace this anyway.

**Pre-commit gates re-run:**
- `npm run format:check` — clean.
- `npm run lint` — clean.
- `npx tsc --noEmit` — clean.
- `npm test` — 440/440 pass across 41 files.
