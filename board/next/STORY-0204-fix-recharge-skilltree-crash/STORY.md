# STORY-0204: Fix combat-recharge crash in skilltree.getNextProblem

## Description

Choosing "Recharge" inside combat crashes the game instead of opening the math quiz. The MathProblemScene boots, `SkillTree.getNextProblem()` is called, and it throws a `TypeError` because `s` (a `skillStates[nodeId]` lookup) is `undefined`. Combat never advances.

### Repro

1. Start a fresh game (clear localStorage if needed).
2. Get into any wild battle.
3. Open the attack menu and use a technique that costs Dark Power.
4. Open the attack menu again and choose **Recharge**.
5. Expected: MathProblemScene opens with a math question. Actual: crash, game frozen.

### Error

```
Uncaught TypeError: can't access property "lastSeen", s is undefined
    getNextProblem skilltree.ts:97
    create MathProblemScene.ts:79
    ...
```

A previous agent guessed this was stale localStorage. The user has confirmed this is **not** the issue — clearing all browser storage and starting over reproduces the same crash. The bug is real and lives in the code.

### Where to look

- `src/game/skilltree.ts:90-119` — `getNextProblem()`. Line 97 is the crash site. The loop iterates `this.nodes`, filters by `isUnlocked(nodeId)`, then reads `this.session.skillStates[nodeId]` without checking it's defined.
- `src/game/skilltree.ts:63-68` — `register()`. Only initializes `skillStates[node.id]` if the key is missing. `register()` initializes the entry even for nodes whose prerequisites aren't met — so an entry should exist for every registered node.
- `src/game/skilltree.ts:172-277` — `createSkillTree()` registers every node, and the module-level singleton `skillTree` is created from `session` at import time.
- `src/game/session.ts:102-117` — fresh sessions start with `skillStates: {}` and `skillEncounter: 0`.
- `src/game/save.ts:197-202` — load path: saved skill states are **merged** onto whatever `register()` set up, not replacing. So load-from-save shouldn't be wiping entries either.
- `src/game/scenes/CombatScene.ts:1548-1570` — the recharge entry point. Launches `MathProblemScene` with `returnScene: "CombatScene"`.
- `src/game/scenes/MathProblemScene.ts:78-80` — calls `skillTree.getNextProblem()` in `create()`.

The mystery: in a fresh session, `K.OA.A.5` has no prerequisites and is unconditionally registered, so `skillStates["K.OA.A.5"]` should always be `{box: 0, lastSeen: 0}`. Yet the crash says some unlocked node's state is missing. Possibilities to investigate:

- Is the module-level `skillTree = createSkillTree(session)` running **before** something resets/replaces `session.skillStates`? (Search for any place that reassigns `skillStates` rather than mutating it.)
- Is `getNextProblem()` iterating a stale `nodes` set populated against a different `session` object?
- Does the new-game flow or character creation overwrite `session` or `skillStates` in a way that doesn't re-run `register()`?
- Or is the simplest fix correct: `register()` is right, but `getNextProblem()` should still be defensive — if a node is registered but its state is missing, initialize it lazily and log a warning.

Root-cause it first; then decide between a targeted fix at the source vs. a defensive guard in `getNextProblem()`. Whichever the implementer picks, they need to **explain why** in the journal.

### What to build

1. **Reproduce in Puppeteer first.** Add a throwaway script at `qa/local/repro-recharge-crash.ts` (gitignored) that uses `setupGame()` to land post-intro with a party, walks into a wild battle (or uses the debug API to force one), uses an attack to drain DP, then triggers Recharge. Verify it crashes against the current code so the harness is wired correctly.
2. **Root-cause and fix.** Once the repro is reliable, find why `s` is undefined and fix the underlying cause. If the root cause turns out to be unrecoverable from in a single session, fall back to a defensive guard in `getNextProblem()` — but document the call site in `JOURNAL.md`.
3. **Convert the repro into a checked-in regression QA.** Move/replace it as `qa/combat-recharge-math.ts` (committed). After the fix, the script must:
   - Land in combat with non-empty party + DP drained.
   - Open the attack menu and pick Recharge.
   - Wait for `MathProblemScene` to start (use the debug bridge `scene_started` event).
   - **Take a screenshot proving a real math question is rendered** (look at sibling QA scripts for the screenshot path convention).
   - Assert the active scene is `MathProblemScene` and that the debug bridge exposes the active problem.
   - Answer the problem and assert the game returns to `CombatScene` with the recharge applied (or denied, depending on answer).
4. **Add a unit test** in `src/__tests__/skilltree.test.ts` covering the exact failure mode: a registered, unlocked node ends up with no entry in `skillStates`, and `getNextProblem()` must either succeed (defensive) or fail with a clear error (sourced fix) — not a `TypeError`. If the root cause is elsewhere, write a regression test there instead.

### QA Validation

**The implementing agent MUST verify the fix in a real browser via Puppeteer before marking the story for review.** Do not trust unit tests alone — the symptom is interactive and the previous fix attempt was wrong because nobody actually played through the flow.

Concretely, the implementing agent must:

- Run `qa/combat-recharge-math.ts` end-to-end against the running dev server.
- Capture and **inspect** the math-quiz screenshot. It must show a rendered math problem (question text, answer widget) — not a black screen, not the combat scene, not an error overlay.
- Reference the screenshot path in `JOURNAL.md` so the reviewer can find it.
- Confirm answering the problem (correctly and incorrectly) returns control to `CombatScene` and updates Dark Power as expected.

## Acceptance Criteria

- [ ] Root cause of the `s.lastSeen` `TypeError` is identified and documented in `JOURNAL.md`
- [ ] The crash no longer reproduces on a fresh save (cleared localStorage)
- [ ] `qa/combat-recharge-math.ts` exists, is checked in, runs end-to-end, and asserts that:
  - [ ] Picking Recharge in combat opens `MathProblemScene` without throwing
  - [ ] A math problem is actually rendered (verified by screenshot)
  - [ ] Submitting a correct answer returns to `CombatScene` and DP increases
  - [ ] Submitting a wrong answer returns to `CombatScene` and DP does not increase
- [ ] Screenshot of the math quiz post-recharge is captured and referenced in `JOURNAL.md`
- [ ] Unit test added covering the failure mode in `src/__tests__/skilltree.test.ts` (or wherever the root cause lives)
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
