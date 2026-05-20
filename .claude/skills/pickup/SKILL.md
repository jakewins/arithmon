---
name: pickup
description: Pick up a story from board/next/ and dispatch an implementing agent to build, test, and move it to board/reviewing/. Pass an explicit story reference or "next" for the lowest-numbered unblocked story.
user-invocable: true
allowed-tools: Bash Read Agent
---

# Pickup

Hand off a story to an implementing sub-agent. Work happens in the **`trees/implementor`** worktree (branch `impl-wip`, port 8081) so the reviewer can run in parallel in `trees/reviewer`. The skill syncs the worktree, records a "claim" commit, fast-forwards `main`, dispatches the agent, and fast-forwards `main` again when the agent is done.

## Shared state model

`/pickup` and `/review` run in parallel and coordinate via the `main` branch in the root checkout (`/home/jake/Code/toy/arithmon`). **`main` is the single source of truth for board state.** Each run **resets its worktree to `main` on entry** (step 2 below) and **fast-forwards `main` from its wip branch on exit** (steps 4 and 7) — that's the entire hand-off protocol. Between runs the *other* role's worktree (`trees/reviewer` on `review-wip`) stays on its own old head and will look stale; don't read board state from it. Always invoke this skill from the root checkout, not from inside a worktree — the skill's `git -C trees/implementor ...` commands assume that.

## Args

One argument, required:

- `next` — pick the lowest-numbered unblocked story in `board/next/`. A story is "unblocked" when every `STORY-NNNN` referenced on a `**Depends on**:` (or `Depends on:`) line in its `STORY.md` is present in `board/done/`. (Stories with no `Depends on:` line are always unblocked.)
- An explicit reference — any of these resolve to a single story directory under `board/next/`:
  - full slug: `STORY-0193-title-screen`
  - id only: `STORY-0193` or `0193` or `193`
  - just the slug suffix: `title-screen`

If the reference is ambiguous or matches nothing, stop and report the candidates back to the user.

## Steps

Run all skill commands from the **main checkout** (`/home/jake/Code/toy/arithmon`). The worktree is at `/home/jake/Code/toy/arithmon/trees/implementor`.

1. **Resolve the story directory** in `board/next/` (on main) using the rules above. Read its `STORY.md` so you have full context.

2. **Sync the implementor worktree.** Verify it is clean and reset it to `main`. If it is not clean, stop and tell the user — do not silently discard WIP:
   ```bash
   git -C trees/implementor status --porcelain --untracked-files=no  # must be empty
   git -C trees/implementor reset --hard main
   ```

3. **Claim the story** by moving it from `next/` → `implementing/` *in the worktree* and committing on `impl-wip`:
   ```bash
   git -C trees/implementor mv board/next/<STORY-DIR> board/implementing/<STORY-DIR>
   git -C trees/implementor commit -m "STORY-NNNN: Claim (start implementing)"
   ```

4. **Fast-forward main to the claim commit** so the board on main reflects that the story is taken:
   ```bash
   git merge --ff-only impl-wip
   ```
   If this fails because main moved (e.g. reviewer just landed something), rebase the worktree onto main and retry:
   ```bash
   git -C trees/implementor rebase main
   git merge --ff-only impl-wip
   ```

5. **Dispatch the implementing agent** via the Agent tool. Use `subagent_type: "general-purpose"`. The prompt must be self-contained (the sub-agent sees none of this conversation). Include:
   - The absolute path to the story directory (now under `board/implementing/`) **inside the worktree**: `/home/jake/Code/toy/arithmon/trees/implementor/board/implementing/<STORY-DIR>`.
   - The full text of `STORY.md` inline, so the agent doesn't have to guess what to read first.
   - The briefing below, verbatim.

   Briefing (paste into the prompt after the story path and STORY.md contents):

   > You are the implementor of this story. **All your work happens inside `/home/jake/Code/toy/arithmon/trees/implementor`** — a git worktree on branch `impl-wip`. `cd` there first; do not touch the main checkout. The dev server in this worktree runs on **port 8081** — when you launch the game or run QA scripts that hit it, prefix commands with `ARITHMON_PORT=8081` (e.g. `ARITHMON_PORT=8081 npx tsx qa/local/foo.ts`). The story has already been moved into `board/implementing/` and a "Claim" commit has been recorded; just start working.
   >
   > Read through the story and make a plan for how you'll implement and test it.
   >
   > Remember that our job is to build a *clone* of Tuxemon: We want, as much as possible, to be a game engine that is byte-compatible with their content, so we can run their story and artwork, with the exception of the "Dark Power" math quiz system. If you are unsure, refer to how tuxemon upstream does it — the source is at `upstream/` — and always use their artwork and content.
   >
   > Structurally as well, try and align our game engine with theirs — name functions and components the same, structure files and testing similarly.
   >
   > For testing, be pragmatic — focus on writing tests that'll not break as we refactor underlying code; cover the happy path and maybe — if it feels like a real risk we'd hit — a major error path we think the running game may actually encounter. Use Go-style table testing when there are lots of similar cases to cover. Think carefully to make the test suite and code maintainable; we want a kubernetes-style codebase with pragmatic clean code, tasteful comments *where necessary* focused on giving the reader context they *must* have to understand what the code is doing and how it fits into the engine.
   >
   > Follow `CLAUDE.md` — in particular, run `npm run format:check && npm run lint && npx tsc --noEmit && npm test` before committing, and fix everything that comes up.
   >
   > When you are done: `git mv` the story directory from `board/implementing/` to `board/reviewing/`, then create a single commit that includes both the move and your implementation. Stay on `impl-wip`; do not push or merge to main yourself — the skill handles that.

6. **Wait for the agent to finish** (foreground).

7. **Fast-forward main to the agent's work.** From the main checkout:
   ```bash
   git merge --ff-only impl-wip
   ```
   If this fails because main moved, rebase the worktree onto main and retry:
   ```bash
   git -C trees/implementor rebase main
   git merge --ff-only impl-wip
   ```

8. **Relay** a one-sentence summary of what shipped (and where the story landed) to the user.

## Notes

- The skill itself does not run tests or do the code change; that's the sub-agent's job.
- If the sub-agent reports a blocker (e.g. story is ambiguous, scope is bigger than written), pass that back to the user without attempting to silently fix the story.
- Don't auto-pickup another story when this one finishes — `/pickup next` is a single hand-off, not a loop. If the user wants continuous pickup, they'll use `/loop /pickup next`.
- The `trees/implementor` worktree must be on branch `impl-wip` and have its own `node_modules` (one-time `npm install`). The reviewer worktree runs in parallel in `trees/reviewer` on port 8082.
