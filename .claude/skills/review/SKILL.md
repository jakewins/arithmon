---
name: review
description: Pick up a story from board/reviewing/ and dispatch a reviewer agent to critique the implementation, run puppeteer QA, and either move the story to board/done/ (approved) or back to board/next/ with new todos + journal entry (changes requested). Pass an explicit story reference or "next" for the lowest-numbered story in reviewing/.
user-invocable: true
allowed-tools: Bash Read Agent
---

# Review

Hand off a story to a reviewing sub-agent. The skill resolves the story (in `board/reviewing/`), then dispatches a sub-agent with the full reviewer briefing.

## Args

One argument, required:

- `next` — pick the lowest-numbered story currently in `board/reviewing/`. If `board/reviewing/` is empty, stop and tell the user there's nothing to review.
- An explicit reference — any of these resolve to a single story directory under `board/reviewing/`:
  - full slug: `STORY-0193-title-screen`
  - id only: `STORY-0193` or `0193` or `193`
  - just the slug suffix: `title-screen`

If the reference is ambiguous or matches nothing in `board/reviewing/`, stop and report the candidates back to the user. Do NOT silently search other lanes — a story not in `reviewing/` is not ready for review.

## Steps

1. **Resolve the story directory** under `board/reviewing/` using the rules above. Read `STORY.md` and `JOURNAL.md` (if present) so you have context.

2. **Confirm the implementor has committed.** Run `git status` and `git log -1 --stat`. The implementor should have committed both their code change and the move-to-`reviewing/`. If the working tree has uncommitted changes (e.g. WIP from a parallel pickup), stop and tell the user — do not start review on a dirty tree.

3. **Dispatch the reviewing agent** via the Agent tool. Use `subagent_type: "general-purpose"`. The prompt must be self-contained (the sub-agent sees none of this conversation). Include:
   - The absolute path to the story directory under `board/reviewing/`.
   - The git SHA of the implementor's commit (so the agent can `git show <sha>` to see exactly what changed).
   - The full text of `STORY.md` inline.
   - The briefing below, verbatim.

   Briefing (paste into the prompt after the story path, commit SHA, and STORY.md contents):

   > You are the reviewer of a STORY on the board — it's been implemented by a separate implementing agent. Your job is to decide whether to approve it (move to `board/done/`) or bounce it back (move to `board/next/` with todos + a journal entry).
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
   > **Approve.** `git mv` the story directory from `board/reviewing/` to `board/done/`. Append a dated entry to `JOURNAL.md` summarizing what you validated (and which checks you ran). Commit the move + journal update together. Done.
   >
   > **Bounce back.** For each piece of feedback, add a new todo file under `<story>/todos/open/` (numbered, kebab-case, e.g. `03-fix-stale-save-bug.md`) with concrete instructions for the implementor. Append a dated entry to `JOURNAL.md` recording your findings — what you validated, what's defective, and why you're bouncing. `git mv` the story directory from `board/reviewing/` to `board/next/`. Commit the new todos + journal entry + move together.
   >
   > Conventions to match existing stories:
   > - Journal entries lead with `## YYYY-MM-DD — Reviewer findings` (or similar) and use short bullet lists.
   > - Todos are individual markdown files with a `# Todo: <title>` heading and numbered list of steps.
   > - Stash any uncommitted changes before running pre-commit gates / QA, so unrelated WIP doesn't pollute results.

4. **Wait for the agent to finish** (foreground), then relay a one-line summary to the user: which story, approved or bounced, and (if bounced) how many new todos were filed.

## Notes

- The skill itself does not run tests, edit the story, or commit; that's the sub-agent's job.
- Don't auto-pick the next story when this one finishes — `/review next` is a single review. Use `/loop /review next` for continuous review.
- If the sub-agent reports it can't decide (e.g. the story is fundamentally unclear), relay that to the user without forcing an outcome.
