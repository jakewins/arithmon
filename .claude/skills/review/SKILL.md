---
name: review
description: Pick up a story from board/reviewing/ and dispatch a reviewer agent to critique the implementation, run puppeteer QA, and either move the story to board/done/ (approved) or back to board/next/ with new todos + journal entry (changes requested). Pass an explicit story reference or "next" for the lowest-numbered story in reviewing/.
user-invocable: true
allowed-tools: Bash Read Agent
---

# Review

Hand off a story to a reviewing sub-agent. Work happens in the **`trees/reviewer`** worktree (branch `review-wip`, port 8082) so the implementor can run in parallel in `trees/implementor`. The skill syncs the worktree, dispatches the agent, and fast-forwards `main` when the agent's verdict is committed.

## Shared state model

`/pickup` and `/review` run in parallel and coordinate via the `main` branch in the root checkout (`/home/jake/Code/toy/arithmon`). **`main` is the single source of truth for board state.** Each run **resets its worktree to `main` on entry** (step 3 below) and **fast-forwards `main` from its wip branch on exit** (step 6) — that's the entire hand-off protocol. Between runs the *other* role's worktree (`trees/implementor` on `impl-wip`) stays on its own old head and will look stale; don't read board state from it. Always invoke this skill from the root checkout, not from inside a worktree — the skill's `git -C trees/reviewer ...` commands assume that.

## Args

One argument, required:

- `next` — pick the lowest-numbered story currently in `board/reviewing/`. If `board/reviewing/` is empty, stop and tell the user there's nothing to review.
- An explicit reference — any of these resolve to a single story directory under `board/reviewing/`:
  - full slug: `STORY-0193-title-screen`
  - id only: `STORY-0193` or `0193` or `193`
  - just the slug suffix: `title-screen`

If the reference is ambiguous or matches nothing in `board/reviewing/`, stop and report the candidates back to the user. Do NOT silently search other lanes — a story not in `reviewing/` is not ready for review.

## Steps

Run all skill commands from the **main checkout** (`/home/jake/Code/toy/arithmon`). The worktree is at `/home/jake/Code/toy/arithmon/trees/reviewer`.

1. **Resolve the story directory** under `board/reviewing/` (on main) using the rules above. Read `STORY.md` and `JOURNAL.md` (if present) so you have context.

2. **Confirm the implementor has committed.** Run `git log -1 --stat` on main; the latest commit should be the implementor's (move-to-reviewing + code change). Capture the SHA — the reviewer agent will want it.

3. **Sync the reviewer worktree.** Verify it is clean and reset it to `main`. If it is not clean, stop and tell the user — do not silently discard WIP:
   ```bash
   git -C trees/reviewer status --porcelain --untracked-files=no  # must be empty
   git -C trees/reviewer reset --hard main
   ```

4. **Dispatch the reviewing agent** via the Agent tool. Use `subagent_type: "general-purpose"`. The prompt must be self-contained (the sub-agent sees none of this conversation). Include:
   - The absolute path to the story directory **inside the worktree**: `/home/jake/Code/toy/arithmon/trees/reviewer/board/reviewing/<STORY-DIR>`.
   - The git SHA of the implementor's commit (so the agent can `git show <sha>` to see exactly what changed).
   - The full text of `STORY.md` inline.
   - The briefing below, verbatim.

   Briefing (paste into the prompt after the story path, commit SHA, and STORY.md contents):

   > You are the reviewer of a STORY on the board — it's been implemented by a separate implementing agent. **All your work happens inside `/home/jake/Code/toy/arithmon/trees/reviewer`** — a git worktree on branch `review-wip`. `cd` there first; do not touch the main checkout or the implementor's worktree. The dev server in this worktree runs on **port 8082** — when you launch the game or run QA scripts that hit it, prefix commands with `ARITHMON_PORT=8082` (e.g. `ARITHMON_PORT=8082 npx tsx qa/local/foo.ts`). Your job is to decide whether to approve the story (move to `board/done/`) or bounce it back (move to `board/next/` with todos + a journal entry).
   >
   > - Read through the story and make a plan per below.
   > - Think about the *story itself* critically: is it actually asking the implementor to do something that makes sense? If the story is wrong (bad scope, contradicts upstream, missing context), say so in the journal — don't paper over it by silently approving.
   > - If the story is about implementing game content that we're cloning from Tuxemon, review the upstream Tuxemon source at `upstream/` to confirm the port is faithful.
   > - Plan how you'll confirm the story is correctly implemented. Lean on the `/puppeteer` skill / `qa/` harness to test the functionality. Take screenshots to visually confirm where appropriate.
   > - Check the code change itself: is it a pragmatic, clean change, in the style of the kubernetes codebase? Maintainable, sane code, like a Go programmer wrote Typescript?
   > - Is the test coverage appropriate? We want to *not* go overboard with tests, because it makes the codebase hard to manage if every internal detail is "nailed down" — we should have high-level testing that covers the happy path and *if we think it could happen in the running game* any critical error paths.
   > - Is it *necessary* to add new tests, or are there *existing* tests we should have just modified or merged with instead?
   > - Are there tests that can now be removed after this change, that no longer provide enough value to warrant their LoC and maintenance cost?
   > - Re-run the pre-commit gates yourself: `npm run format:check && npm run lint && npx tsc --noEmit && npm test`. If any fail, that's automatic bounce-back.
   >
   > **Outcome — pick one:**
   >
   > **Approve.** `git mv` the story directory from `board/reviewing/` to `board/done/`. Append a dated entry to `JOURNAL.md` summarizing what you validated (and which checks you ran). Commit the move + journal update together on `review-wip`. Done — do not push or merge to main yourself; the skill handles that.
   >
   > **Bounce back.** For each piece of feedback, add a new todo file under `<story>/todos/open/` (numbered, kebab-case, e.g. `03-fix-stale-save-bug.md`) with concrete instructions for the implementor. Append a dated entry to `JOURNAL.md` recording your findings — what you validated, what's defective, and why you're bouncing. `git mv` the story directory from `board/reviewing/` to `board/next/`. Commit the new todos + journal entry + move together on `review-wip`.
   >
   > Conventions to match existing stories:
   > - Journal entries lead with `## YYYY-MM-DD — Reviewer findings` (or similar) and use short bullet lists.
   > - Todos are individual markdown files with a `# Todo: <title>` heading and numbered list of steps.
   > - Stash any uncommitted changes before running pre-commit gates / QA, so unrelated WIP doesn't pollute results.

5. **Wait for the agent to finish** (foreground).

6. **Fast-forward main to the reviewer's verdict commit.** From the main checkout:
   ```bash
   git merge --ff-only review-wip
   ```
   If this fails because main moved (e.g. implementor just landed a claim or finish), rebase the worktree onto main and retry:
   ```bash
   git -C trees/reviewer rebase main
   git merge --ff-only review-wip
   ```

7. **Relay** a one-line summary to the user: which story, approved or bounced, and (if bounced) how many new todos were filed.

## Notes

- The skill itself does not run tests, edit the story, or commit; that's the sub-agent's job.
- Don't auto-pick the next story when this one finishes — `/review next` is a single review. Use `/loop /review next` for continuous review.
- If the sub-agent reports it can't decide (e.g. the story is fundamentally unclear), relay that to the user without forcing an outcome.
- The `trees/reviewer` worktree must be on branch `review-wip` and have its own `node_modules` (one-time `npm install`). The implementor worktree runs in parallel in `trees/implementor` on port 8081.
