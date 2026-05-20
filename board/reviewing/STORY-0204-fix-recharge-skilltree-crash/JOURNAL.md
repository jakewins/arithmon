# STORY-0204 — Implementation Journal

## Root cause

`TitleScene`'s **New Game** button calls `clearSave()` → `resetSession()`,
which does `Object.assign(session, fresh)`. That assignment replaces the
`skillStates` field with a brand-new empty object (because `createSession()`
returns `skillStates: {}`).

Meanwhile, the `skillTree` singleton is created at module load:

```ts
export const skillTree = createSkillTree(session);
```

`createSkillTree()` calls `tree.register(...)` for every node, and
`register()` initializes `session.skillStates[node.id]` against whatever
object `session.skillStates` was pointing to **at that moment** — i.e. the
*original* object.

After `clearSave()`, `skillTree.nodes` still has all 14 registered nodes,
but `session.skillStates` is the fresh empty `{}`. `getNextProblem()`
iterates `nodes`, picks an unlocked one (`K.OA.A.5` — no prerequisites,
unconditionally unlocked), then reads `session.skillStates["K.OA.A.5"]` —
which is `undefined` — and dereferences `.lastSeen` to crash.

The previous "stale localStorage" guess was wrong because the bug doesn't
need persisted state: it triggers on the very first New Game in a clean
browser. The intro cutscene path masks it (no recharge before combat),
but the moment combat opens and DP gets spent, Recharge boots
`MathProblemScene` which calls `skillTree.getNextProblem()` and explodes.

## Fix

Sourced fix, not defensive guard. Two surgical changes:

- `src/game/skilltree.ts`: add `SkillTree.reseed()` that walks the
  registered `nodes` Map and writes a fresh `{ box: 0, lastSeen: 0 }`
  entry into `session.skillStates` for every one, plus resets
  `skillEncounter` and the active-problem refs. This is the "second pass"
  of register's initialization, idempotent and cheap.
- `src/game/save.ts`: after `resetSession()` inside `clearSave()`,
  call `skillTree.reseed()`. `clearSave` is the only `resetSession`
  caller and the only documented "reset to fresh" entry point, so this
  is the right seam.

### Why sourced over defensive

The story noted both options. I went sourced because:

- The defensive variant (lazy-init inside `getNextProblem`) papers over a
  real invariant violation: the tree's `nodes` map and the session's
  `skillStates` must stay in sync. Silently fixing one while leaving the
  other path (e.g. the second registration loop in `gradeAnswer`) to
  read stale data would be a future foot-gun.
- The same class of bug (Object.assign-style replacement nuking
  `skillStates`) could re-occur if another developer adds a save-slot
  loader. Making `reseed()` an explicit, named API documents the
  invariant — anyone introducing a similar reset path can call it.
- Lazy-init defaults entries to `{ box: 0, lastSeen: 0 }`, which would
  *silently* erase progress on any code path that managed to corrupt
  state — masking bugs. A targeted reseed only fires from `clearSave`,
  where wiping progress is the intended behavior.

## Verification

1. **Repro before fix** (`qa/local/repro-recharge-crash.ts`,
   gitignored): launched the game, drove the New Game path, spawned a
   battle, drained DP, picked Recharge. Browser logged
   `Cannot read properties of undefined (reading 'lastSeen')`.
2. **Same repro after fix**: scene_started fires, no errors.
3. **Checked-in regression** (`qa/combat-recharge-math.ts`): full
   end-to-end — Title → New Game → setupGame → battle → drain DP →
   Recharge → answer correctly (DP refilled to 5) → drain → Recharge
   → answer incorrectly (DP stays at 0). Passes against
   `ARITHMON_PORT=8081 npx tsx qa/combat-recharge-math.ts`.
4. **Screenshot**: `qa/screenshots/combat-recharge-math.png` —
   captures the math quiz on the first Recharge (a real `5 + 0 = ?`
   radio problem with four answer choices, no black screen, no error
   overlay).
5. **Unit test** (`src/__tests__/skilltree.test.ts`,
   "reseed() restores state entries after session.skillStates is
   replaced"): exercises the exact failure mode — replace the
   `skillStates` object out from under the tree, call `reseed()`,
   confirm `getNextProblem()` no longer throws.
6. **Gates**: `npm run format:check && npm run lint && npx tsc --noEmit &&
   npm test` all clean.

## Notes for the reviewer

- The QA script intentionally drives through TitleScene's debug
  command handler (`debugSelectChoice(0)` + `debugSetInteract()`)
  before calling `setupGame`. Calling `setupGame` directly bypasses
  the New Game path and would not reproduce the bug — the order is
  load-critical.
- During the second math round the debug bridge's active-scene
  pointer is stale (it still points at the first MathProblemScene
  because nothing resets it when CombatScene resumes). The QA works
  around this by going through Phaser's scene manager directly
  (`active.scene.get("CombatScene")`). Fixing the active-scene
  pointer on scene resume is a real gap, but out of scope here.
