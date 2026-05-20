---
name: pickup
description: Pick up a story from board/next/ and dispatch an implementing agent to build, test, and move it to board/reviewing/. Pass an explicit story reference or "next" for the lowest-numbered unblocked story.
user-invocable: true
allowed-tools: Bash Read Agent
---

# Pickup

Hand off a story to an implementing sub-agent. The skill resolves the story, moves it to `board/implementing/`, then dispatches a sub-agent with the full implementor briefing.

## Args

One argument, required:

- `next` — pick the lowest-numbered unblocked story in `board/next/`. A story is "unblocked" when every `STORY-NNNN` referenced on a `**Depends on**:` (or `Depends on:`) line in its `STORY.md` is present in `board/done/`. (Stories with no `Depends on:` line are always unblocked.)
- An explicit reference — any of these resolve to a single story directory under `board/next/`:
  - full slug: `STORY-0193-title-screen`
  - id only: `STORY-0193` or `0193` or `193`
  - just the slug suffix: `title-screen`

If the reference is ambiguous or matches nothing, stop and report the candidates back to the user.

## Steps

1. **Resolve the story directory** in `board/next/` using the rules above. Read its `STORY.md` so you have full context.

2. **Move the story** to `board/implementing/` with `git mv`:
   ```bash
   git mv board/next/<STORY-DIR> board/implementing/<STORY-DIR>
   ```
   Do NOT commit — the implementing agent will commit at the end together with their code changes.

3. **Dispatch the implementing agent** via the Agent tool. Use `subagent_type: "general-purpose"`. The prompt must be self-contained (the sub-agent sees none of this conversation). Include:
   - The absolute path to the story directory (now under `board/implementing/`).
   - The full text of `STORY.md` inline, so the agent doesn't have to guess what to read first.
   - The briefing below, verbatim.

   Briefing (paste into the prompt after the story path and STORY.md contents):

   > You are the implementor of this story. Read through it and make a plan for how you'll implement and test it.
   >
   > Remember that our job is to build a *clone* of Tuxemon: We want, as much as possible, to be a game engine that is byte-compatible with their content, so we can run their story and artwork, with the exception of the "Dark Power" math quiz system. If you are unsure, refer to how tuxemon upstream does it — the source is at `upstream/` — and always use their artwork and content.
   >
   > Structurally as well, try and align our game engine with theirs — name functions and components the same, structure files and testing similarly.
   >
   > For testing, be pragmatic — focus on writing tests that'll not break as we refactor underlying code; cover the happy path and maybe — if it feels like a real risk we'd hit — a major error path we think the running game may actually encounter. Use Go-style table testing when there are lots of similar cases to cover. Think carefully to make the test suite and code maintainable; we want a kubernetes-style codebase with pragmatic clean code, tasteful comments *where necessary* focused on giving the reader context they *must* have to understand what the code is doing and how it fits into the engine.
   >
   > Follow `CLAUDE.md` — in particular, run `npm run format:check && npm run lint && npx tsc --noEmit && npm test` before committing, and fix everything that comes up.
   >
   > When you are done: `git mv` the story directory from `board/implementing/` to `board/reviewing/`, then create a single commit that includes both the move and your implementation.

4. **Wait for the agent to finish** (foreground), then relay a one-sentence summary of what shipped (and where the story landed) to the user.

## Notes

- The skill itself does not run tests or commit; that's the sub-agent's job.
- If the sub-agent reports a blocker (e.g. story is ambiguous, scope is bigger than written), pass that back to the user without attempting to silently fix the story.
- Don't auto-pickup another story when this one finishes — `/pickup next` is a single hand-off, not a loop. If the user wants continuous pickup, they'll use `/loop /pickup next`.
