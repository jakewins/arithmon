# STORY-0232 — Implementation Journal

## 2026-05-21 — Reviewer findings (approved)

### What was validated

- Pre-commit gates re-run in the reviewer worktree: `format:check`, `lint`,
  `npx tsc --noEmit`, and `vitest run` all pass (43 test files, 487 tests).

- Code review: clean, pragmatic change — 621 lines across 12 files.
  - `Monster.ts`: `addXp` return type changed from `LevelUpResult[]` to
    `AddXpResult` (`{ levelUps, summary }`). Summary collapses multi-level
    grants into one `LevelUpSummary` (oldStats = pre-first-level snapshot,
    newStats = post-last-level snapshot), matching upstream
    `consume_levelup_summary()`. No breaking surface change elsewhere.
  - `machine.ts`: summary stamped onto the LAST `level_up` CombatEvent of a
    grant. Clean — only one event carries the popup data, so CombatScene
    naturally shows at most one popup per battle outcome.
  - `CombatScene.ts`: `pendingLevelUpSummary` field stashes the summary when
    a `level_up` event is dequeued; `showEndMessage()` on a `win` outcome
    launches `LevelUpPopupScene` (1 s delay) with an `onDismiss` callback
    that calls the factored-out `returnToOverworld()`. Lose/flee skip the
    popup entirely as required.
  - `LevelUpPopupScene.ts` (230 lines): self-contained modal — dim overlay,
    two-rect panel chrome, NAME header, `Lv.X → Lv.Y` subtitle, six stat
    rows (ARMOUR, DODGE, HP, MELEE, RANGED, SPEED, alphabetical per
    upstream), `► OK` affordance, ENTER/SPACE/ESC/X/B/BACKSPACE dismiss.
    Correctly follows the `DebugStateProvider` pattern (registers/restores
    active scene on the debug bridge, emits `scene_started`/`scene_stopped`).
  - `main.ts`: `LevelUpPopupScene` registered in scene list.
  - `debug.ts`: `clearParty()` added; `setMonsterXp` comment updated to
    note ignored return value. Clean.
  - `harness.ts`: type declarations for three new debug-bridge methods
    (`clearParty`, `setMonsterHp`, `setMonsterXp`).

- Upstream parity checked against `upstream/tuxemon/states/level_up.py`:
  stat rows and their labels match `BasicStats.names()` order
  (ARMOUR, DODGE, HP, MELEE, RANGED, SPEED). `► OK` affordance matches
  the translated "ok" button. Single popup per XP grant matches
  `consume_levelup_summary()` semantics.

- Unit tests: `src/__tests__/monster.test.ts` adds three new cases covering
  null-summary (no level), single-level summary, and multi-level collapse.
  `xp.test.ts` updated to destructure `levelUps` from new return type —
  correct, no redundancy.

- QA script (`qa/levelup-popup.ts`) run against port 8082:
  - Scenario 1 (L5→L6): popup appeared, `startLevel=5 endLevel=6`,
    six stat rows visible, ENTER dismissed cleanly back to OverworldScene.
  - Scenario 2 (L5→L7 multi-level): ONE popup with `startLevel=5 endLevel=7`
    (cumulative deltas doubled vs single), dismissed cleanly.
  - Screenshots (`qa/screenshots/levelup-popup-{single,multi}.png`) match
    the upstream visual spec (`upstream-levelup-popup.png`) in layout,
    header, stat table order, and OK affordance.

- All acceptance criteria satisfied.

### Outcome: approved

Story moved to `board/done/`.
