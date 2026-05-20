# STORY-0193: Title screen

## Description

Add a title screen as the first thing the player sees when the game boots. Currently `src/main.ts` → `src/game/main.ts` boots straight into `OverworldScene` (which then either resumes from save or kicks off the character-creation cutscene). Upstream Tuxemon shows a title menu first (`upstream/tuxemon/states/start.py`). We want the same.

**Scope**: NEW GAME and LOAD GAME only. Skip Options / Exit / Battle / Minigame from upstream — those aren't on the table yet.

This is the first of a series replacing our intro flow with one ported verbatim from current upstream Spyder campaign. See `STORY-0194..0198`.

### What to build

1. **`TitleScene`** (new `src/game/scenes/TitleScene.ts`):
   - Background: a simple solid color or the existing `gradient_blue` background.
   - Title text: "Arithmon" centered toward the top.
   - Menu items:
     - **"New Game"** — always present.
     - **"Load Game"** — only present if a save exists (use `hasSave()` from `src/game/save.ts`; add the helper if it doesn't exist yet).
   - Up/Down arrow keys to move selection; Z / Enter / Space to confirm.
   - On "New Game":
     - Clear any existing save (use `clearSave()` from `save.ts`; add the helper if not present).
     - Reset `session` to defaults.
     - Call `this.scene.start("CutsceneScene", { yamlKey: "start-tuxemon", callerScene: "OverworldScene" })` — `STORY-0194` will replace this with the new, simplified flow.
   - On "Load Game":
     - `loadGame()` has already run (it runs in `src/game/main.ts:16` before Phaser boots). Just transition to `OverworldScene` — its `init()` already consumes the saved location.

2. **Wire it into the scene stack** (`src/game/main.ts`):
   - Add `TitleScene` to the `scene:` array. It must be the **first** entry so Phaser auto-starts it (currently `OverworldScene` is first).
   - Move `loadGame()` so save state is restored before TitleScene boots (it already is — keep as-is).

3. **Save helpers** in `src/game/save.ts`:
   - `hasSave(): boolean` — checks `localStorage.getItem("arithmon_save") != null`.
   - `clearSave(): void` — removes the save and resets the in-memory `session` to defaults (mirror what a fresh boot looks like).

4. **Debug bridge** (`src/game/debug.ts`):
   - `setupGame()` currently boots assuming OverworldScene is active. With TitleScene first, QA scripts will hit the title menu before they can call `setupGame()`. Make `setupGame()` skip the title automatically: if the active scene is `TitleScene`, choose "New Game" programmatically (or just stop it and start `OverworldScene` directly with the post-setup state).

### Engine notes

- No new event-engine actions or conditions needed.
- Reuse the existing dialog-border nine-slice for menu visuals (`BORDER_TEXTURE = "dialog-border"` from `renamePlayer.ts`).
- Title scene should pause `OverworldScene` from auto-running its `init()` save-restore logic. Easiest: don't start `OverworldScene` until the player picks "Load Game" (or until the cutscene completes for New Game).

### QA Validation

Use `/puppeteer`. Add `qa/title-screen-test.ts`:

1. `launchGame()` (do NOT call `setupGame()` — we want to see the title).
2. Screenshot — verify title screen renders with "New Game" visible. With no save, "Load Game" should be absent (or greyed out).
3. Press Down/Up arrows — verify selection indicator moves (state available via `window.A.getState()`).
4. Press Enter on "New Game" — verify `CutsceneScene` (or whatever the next scene is per STORY-0194) becomes active.
5. Reload, this time after `setupGame()` has run once — verify "Load Game" is present.
6. Press Enter on "Load Game" — verify `OverworldScene` starts with the saved player position.

## Acceptance Criteria

- [ ] `src/game/scenes/TitleScene.ts` created and registered as first scene in `main.ts`
- [ ] "New Game" always shown, "Load Game" gated on save presence
- [ ] Keyboard navigation (up/down + confirm) works
- [ ] "New Game" clears save + session, then starts the next intro scene
- [ ] "Load Game" resumes from saved location
- [ ] `hasSave()` and `clearSave()` helpers exist in `save.ts`
- [ ] `setupGame()` debug helper still works (auto-skips title); all existing QA scripts that call it still pass unchanged
- [ ] `qa/title-screen-test.ts` passes via `/puppeteer`
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
