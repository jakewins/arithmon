# STORY-0207: Get kicked out of Omnichannel HQ (Cotton Town)

## Description

In upstream Tuxemon, walking into the Omnichannel HQ in Cotton Town triggers an enforcer cutscene that **kicks the player back out** to Cotton Town. In our clone the cutscene plays — enforcer spawns, says his line, despawns — but the player is left free to roam HQ. The kick-out never happens.

This needs to be fixed by getting the player teleported out, as upstream does, **without diverging from upstream's event YAML** for this map. Our `public/assets/events/spyder_omnichannel1.yaml` already mirrors the upstream `spyder_omnichannel1.tmx` event objects (Spot Enforcer, Go Outside, etc.). The expectation is that running the upstream-shaped script through our engine produces the upstream behavior. If it doesn't, the engine is what's wrong, not the script.

### Repro

1. New game, get through the intro to the point where Cotton Town is reachable. (Use `setupGame()` with appropriate flags + a manual teleport via the debug bridge if no intro path is wired through yet.)
2. Enter Omnichannel HQ from the south door at `spyder_cotton_town (17,9)` facing up. Player spawns at `spyder_omnichannel1 (2,12)`.
3. Enforcer spawns at (8,7), walks to (3,12), says his dialog, gets removed.
4. **Expected (upstream):** player is walked south to (2,13) and immediately teleported back to `spyder_cotton_town (17,10)`.
5. **Actual (ours):** player ends at (2,13) (or maybe still at 2,12 — verify), the enforcer despawns, controls unlock, player can wander HQ freely.

### What to build

1. **Reproduce in Puppeteer first**, as a throwaway in `qa/local/repro-omnichannel-kickout.ts` (gitignored). Use `setupGame()` to land somewhere stable, then drive the debug bridge to teleport to `spyder_omnichannel1 (2,12)` facing up (or to `spyder_cotton_town` and walk into the door — whichever is more reliable). Watch the resulting event chain via the debug bridge and verify the player does NOT get teleported back.
2. **Root-cause and fix.** The fix must work with the current upstream-mirrored YAML. **Do not modify `spyder_omnichannel1.yaml` to work around an engine bug.** The YAML is upstream's reference; if it doesn't produce the expected behavior, the engine is wrong.
3. **Write the kept QA.** Move/replace the throwaway as `qa/cotton-omnichannel-kickout.ts` (committed). After the fix, the script must:
   - Drive the player into HQ.
   - Watch the enforcer cutscene play out via debug bridge events.
   - **Screenshot** the moment the player lands back in Cotton Town (e.g. immediately after the `teleport` event for `spyder_cotton_town`). Reference the screenshot path in `JOURNAL.md`.
   - Assert via the debug bridge that the active map is `spyder_cotton_town` and the player tile is `(17, 10)` (the upstream-target landing tile).
4. **Audit and reverse any prior workarounds.** If the root cause turns out to be a general engine issue (see hypothesis below), there may be event YAMLs elsewhere that were structured to dodge the same bug. After the engine is fixed, briefly audit `public/assets/events/` for scripts that drop or duplicate facing/pathfind sequences in suspicious ways, and either simplify them to match upstream or leave a note in `JOURNAL.md` explaining what you found and what you left alone.

### Hypothesis (worth exploring, but verify before trusting)

A quick read through the engine suggests the bug may be a **general facing-propagation issue** rather than something Omnichannel-specific. The relevant chain:

- `OverworldScene.ts:845-849` builds a fresh `ctx.player` object every frame as `{ tileX, tileY, facing: this.playerFacing }`.
- `charFace.ts:50-56` (`char_face player,<dir>`) writes `ctx.player.facing = dir` and updates the sprite frame — but does **not** write back to `OverworldScene.this.playerFacing`.
- `pathfind.ts:42-68` (`pathfind player,…`) has a getter/setter on `ctx.player.facing` for the throwaway object; also doesn't write back to the scene field.
- The next frame, `ctx.player.facing` is re-read from `this.playerFacing` — which is stale.
- `Go Outside`'s `is char_facing player,down` condition therefore returns `false` even though the cutscene tried to face the player down, and the door teleport never fires.

If that's the actual root cause, the natural fix is to make `ctx.player.facing` a live binding to the scene field (or have both `charFace` and `pathfind` write back to `OverworldScene.playerFacing` when the target is the player). `tileX`/`tileY` round-trip via `sprite.x/y` so they're not affected — only `facing` lacks a back-channel.

`grep -r 'char_face player\|pathfind player' public/assets/events/` returns ~218 matches, so if this is the bug, fixing it likely unblocks other scripted cutscenes too. Treat that as a potential bonus, not the goal — the story is about getting kicked out of HQ.

But: **verify the hypothesis before committing to it.** Don't trust this analysis blindly. Drive the repro, log the actual `playerFacing` value vs `ctx.player.facing` mid-cutscene, and confirm where the propagation breaks. The real cause might be different.

### Unit test (only if the engine is the cause)

If the fix lands in the engine layer (`OverworldScene` / `charFace` / `pathfind`), add a focused unit or integration test in `src/__tests__/` that:

- Constructs an event context, runs `char_face player,down` followed by a frame tick, then asserts that whatever the scene reads as "player facing" is now `"down"`.
- Optionally: runs a `pathfind player,X,Y` step and asserts the final facing matches the last movement direction in the scene's source-of-truth.

If the cause turns out to be elsewhere (e.g. only a YAML loader oversight), pick the right test target accordingly.

### QA Validation

`qa/cotton-omnichannel-kickout.ts` is the gate. The implementing agent **MUST verify in a real browser via Puppeteer** that:

- Entering HQ triggers the enforcer cutscene exactly as upstream describes (enforcer spawns at (8,7), walks to (3,12), dialog plays, despawns).
- Immediately after the cutscene, the player is **back in Cotton Town** at `(17, 10)` — not still inside HQ.
- A screenshot of the post-teleport Cotton Town frame is captured and referenced in `JOURNAL.md`.
- Walking back into HQ a second time (where applicable upstream) behaves as upstream does for the next visit.

Tests passing alone is not sufficient — past stories have shown that unit tests can be green while the user-visible cutscene is still broken.

### Out of scope

- Rewriting `spyder_omnichannel1.yaml` to look different from upstream's event sequence. If the YAML needs to change because we discover upstream has additional actions we missed when porting, that's fine — but match upstream, don't invent new sequences.
- The `Battle Enforcer` second-visit path. That's a downstream behavior; verify it still works after the fix but treat it as a smoke check, not the main acceptance.

## Acceptance Criteria

- [ ] Root cause documented in `JOURNAL.md` — whether the engine hypothesis above is correct, or whether the real cause was something else
- [ ] Fix lands in the right layer (engine if engine bug; YAML only if our YAML genuinely diverges from upstream's sequence)
- [ ] `qa/cotton-omnichannel-kickout.ts` exists, is checked in, runs end-to-end, and asserts the player ends up at `spyder_cotton_town (17, 10)` after the enforcer cutscene
- [ ] Screenshot of the post-teleport Cotton Town frame captured and referenced in `JOURNAL.md`
- [ ] If the engine was the cause: a unit/integration test in `src/__tests__/` covers the regression directly
- [ ] No changes to `public/assets/events/spyder_omnichannel1.yaml` unless they bring it **closer** to upstream's event sequence (with a note in `JOURNAL.md` explaining the delta)
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
