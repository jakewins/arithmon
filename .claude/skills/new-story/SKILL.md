---
name: new-story
description: Take a free-form feature/bugfix description and dispatch a planning agent to research the change, draft a STORY.md, and hand the story off to board/next/ ready for /pickup. The story lives in board/planning/ while the planner is working.
user-invocable: true
allowed-tools: Bash Read Agent
---

# Plan

Hand off a free-form description to a planning sub-agent. The agent researches the change (reading our code and upstream Tuxemon as needed), drafts the `STORY.md`, and moves the new story into `board/next/` so `/pickup` can grab it.

Work happens in the **`trees/planner`** worktree (branch `plan-wip`) so `/pickup` and `/review` can keep running in parallel. The planner does not normally need the dev server, but if it decides a current-state screenshot would sharpen the plan, it may run the harness on **port 8083**.

## Shared state model

`/new-story`, `/pickup`, and `/review` all coordinate via the `main` branch in the root checkout (`/home/jake/Code/toy/arithmon`). **`main` is the single source of truth for board state.** Each run **resets its worktree to `main` on entry** and **fast-forwards `main` from its wip branch on exit** — that's the entire hand-off protocol. Between runs the *other* roles' worktrees stay on their own old heads and will look stale; don't read board state from them. Always invoke this skill from the root checkout, not from inside a worktree — the skill's `git -C trees/planner ...` commands assume that.

## Args

One argument, required: **a free-form natural-language description of the feature or bugfix to plan**.

Examples:

- `/new-story add a settings menu that lets the player remap controls`
- `/new-story the wild encounter rate in spyder_paper_town feels too high — reduce it to match upstream`
- `/new-story port the spyder_arena_indoor map and its NPCs from upstream`

The skill itself does not flesh out the plan — it just scaffolds a new story directory and dispatches the planner agent. The planner agent owns the contents of `STORY.md`.

## Steps

Run all skill commands from the **main checkout** (`/home/jake/Code/toy/arithmon`). The worktree is at `/home/jake/Code/toy/arithmon/trees/planner`.

1. **Read the user's description.** From it, propose a short kebab-case slug (3–6 words, e.g. `settings-menu-control-remap`). This slug is a placeholder — the planner agent may rename the story if a better one emerges. Keep the original description verbatim; you'll pass it to the agent unchanged.

2. **Sync the planner worktree.** Verify it is clean and reset it to `main`. If it is not clean, stop and tell the user — do not silently discard WIP:
   ```bash
   git -C trees/planner status --porcelain --untracked-files=no  # must be empty
   git -C trees/planner reset --hard main
   ```

3. **Scaffold the new story** inside the worktree using `scripts/new-story`, then commit on `plan-wip`:
   ```bash
   trees/planner/scripts/new-story <slug> planning
   # capture the STORY-NNNN id from the output ("Created .../STORY-NNNN-<slug>")
   git -C trees/planner add board/planning/STORY-NNNN-<slug>
   git -C trees/planner commit -m "STORY-NNNN: Plan started — <slug>"
   ```

4. **Fast-forward main to the scaffold commit** so the board on main reflects that planning is in flight (and so the STORY-NNNN id is taken):
   ```bash
   git merge --ff-only plan-wip
   ```
   If this fails because main moved (e.g. /pickup or /review just landed something), rebase the worktree onto main and retry:
   ```bash
   git -C trees/planner rebase main
   git merge --ff-only plan-wip
   ```

5. **Dispatch the planning agent** via the Agent tool. Use `subagent_type: "general-purpose"`. The prompt must be self-contained (the sub-agent sees none of this conversation). Include:
   - The absolute path to the story directory **inside the worktree**: `/home/jake/Code/toy/arithmon/trees/planner/board/planning/STORY-NNNN-<slug>`.
   - The user's original description verbatim (do not paraphrase — the agent should see exactly what the user typed).
   - The briefing below, verbatim.

   Briefing (paste into the prompt after the story path and the user's description):

   > You are the **planner** in a small team of agents cloning the [Tuxemon](https://github.com/Tuxemon/Tuxemon) game (the "upstream" reference) into Arithmon — a browser-based engine that runs Tuxemon's artwork and story content while layering in a "Dark Power" math-quiz combat mechanic. The team's loop is **Explore → Plan → Implement → Commit**; your job is the first two. After you ship a plan, a separate **implementor** agent will build it and a separate **reviewer** agent will validate it. They will read the `STORY.md` you write and nothing else from this conversation — your plan IS the spec, and it is a contract handed off to another agent who must be able to pick it up cold.
   >
   > **All your work happens inside `/home/jake/Code/toy/arithmon/trees/planner`** — a git worktree on branch `plan-wip`. `cd` there first; do not touch the main checkout or any other worktree. The story directory has already been scaffolded for you at the path above, with a stub `STORY.md` and empty `todos/open` + `todos/done` directories.
   >
   > ### Your job
   >
   > Replace the stub `STORY.md` with a real, actionable plan for the feature or bugfix the user described. Then `git mv` the story directory from `board/planning/` to `board/next/` and commit (single commit: the rewritten `STORY.md` + the move).
   >
   > ### Right-size the plan first
   >
   > Before you write anything, decide how much plan this task actually needs. **If you could describe the diff in one sentence, write a one-paragraph plan and skip most of the sections below.** A bugfix that changes a single constant doesn't need a Context section and an Engine-side-considerations section and an Out-of-scope section — it needs one sentence of "why" and an acceptance criterion. Match plan weight to change weight; a bloated plan for a small change is itself a defect (it buries the signal and burns implementor context).
   >
   > ### How to plan
   >
   > 1. **Understand before you write.** Re-read the user's description and restate the goal in your own words in the Description section — that restatement is your check that you actually understood. For bugs, frame the goal as "the symptom no longer happens" — the implementor should fix the root cause, not just suppress the symptom (if you have a guess at the cause, write it under point 2 below as a hypothesis, not as the goal). If the description is genuinely ambiguous (not just under-specified — *ambiguous*, with multiple sensible interpretations that lead to different work), stop and list the ambiguities in a `## Open Questions` section at the top of `STORY.md` instead of guessing. Cap yourself at ~3 open questions — if you find yourself with more, the description is too vague to plan and you should say so in one paragraph and stop. The user will read your plan and resolve them before `/pickup` runs.
   >
   > 2. **State the goal, not your guess at the solution.** The ticket's job is to anchor the implementor to the outcome the user actually wants — "saved games load without crashing", "the wild-encounter rate in `spyder_paper_town` matches upstream", "a settings menu exists with control remapping" — not to lock them into the specific fix you'd write. If you have a hypothesis about *why* something is broken or *how* it could be solved, that is genuinely useful context — write it down, but **clearly label it as a hypothesis** (e.g. "Hypothesis: the crash is caused by the save deserializer not handling new monster fields — suggest checking `src/game/save/loadGame.ts` first") and keep it separate from the goal and the acceptance criteria. The implementor may well find your hypothesis is wrong; the goal should still hold either way. **Exception:** if the user's original description is itself prescriptive — they explicitly asked for a specific change ("change `BOX_H` from 48 to 36", "use upstream's `FONT_SIZE = 5`") — then that prescription *is* the goal, port it verbatim into the plan without softening it.
   >
   > 3. **Check upstream first when the task involves cloned content or mechanics.** The upstream source is at `upstream/`. Our north star is byte-compatibility with upstream's content (artwork, maps, story, monster data) and structural alignment with their engine (file names, function names, component names). If you're planning a port, a bugfix in cloned mechanics, or any feature upstream already has, **read the relevant upstream source and name your plan's pieces the same way they do** — down to specific filenames and identifiers where you can. Cite upstream paths (e.g. `upstream/tuxemon/states/combat_menus.py:118-122`) in the plan so the implementor can follow the same trail. If the task is Arithmon-specific (math quiz, Dark Power, our build tooling), no upstream check is needed.
   >
   > 4. **Read enough of our codebase to be specific.** Skim the directly relevant files in `src/` and identify the exact functions / constants / scenes the implementor will need to touch. A good plan names files and line numbers; a vague plan ("update the combat scene") sends the implementor on a fishing trip. You don't need to read everything — read what an implementor would need to read to start. If there's an existing piece of code or a previous `board/done/` story that's a strong template for this work, name it in the Context section (e.g. "follow the same pattern as `src/game/scenes/JournalScene.ts`") — that's worth more than a paragraph of abstract guidance. Use your judgement on the right amount of detail.
   >
   > 5. **Decompose into the smallest set of steps that still verify the goal.** Don't pad the plan with hypothetical refactors or "while we're here" cleanup. Don't design for hypothetical future requirements. Three concrete steps beats five abstract ones.
   >
   > 6. **State assumptions and constraints explicitly.** If you're assuming a value (e.g. "we'll use upstream's `FONT_SIZE = 5` const"), say so. If a constraint is non-obvious (e.g. "the dialog box already paginates at `MAX_LINES_PER_PAGE`"), call it out — these are the things the implementor would otherwise discover the hard way.
   >
   > 7. **Plan the QA up front.** Decide how the implementor and reviewer will confirm the change works.
   >    - If the change is purely internal (e.g. a refactor with full unit test coverage), say so and lean on `npm test`.
   >    - If the change touches anything the user sees or interacts with (rendering, input, combat, dialogs, scenes, maps, NPCs), specify a **puppeteer QA script** they should write (use the `/puppeteer` skill / `qa/harness.ts`). Describe concretely what the script should do: which `setupGame()` options to use, what to interact with, what events to wait for, what to assert. If screenshots are warranted, say which frames to capture and what specifically the reviewer should confirm in each one (e.g. "in `combat-decision.png`, verify the four action-menu labels fit inside the 102×36 panel and the prompt is on a single line"). Mention the screenshot filenames you want checked in.
   >    - The puppeteer harness exposes a debug bridge as `window.A` (see `src/game/debug.ts` and `qa/harness.ts`). The implementor should **always prefer existing debug functions** (`setupGame`, `walkTo`, `teleport`, `spawnBattle`, `spawnNpc`, `showProblem`, etc.) over emulating keypresses or mouse moves over time — keystroke-timing QA is fragile and flaky. In the **rare** case the existing bridge can't reach what needs testing (e.g. a brand-new screen that has no entry point yet), explicitly note in the plan that the implementor may add a new debug helper to `src/game/debug.ts` mirroring the style of `setupGame` / `teleport` / `spawnNpc` (one focused function, exposed on `window.A`). Justify the new helper briefly. Do not invent helpers gratuitously.
   >
   > 8. **List out-of-scope items.** If the user's description touches adjacent concerns the plan is *not* solving, name them so the implementor doesn't expand the scope and the reviewer doesn't bounce for missing them. A short `### Out of scope` section beats silent omission.
   >
   > 9. **Write acceptance criteria as a checklist.** Each criterion should be something the reviewer can flatly verify — code-level ("`FONT_SIZE` const exists in `src/game/ui/textStyle.ts` at 6 px"), visual ("`combat-decision.png` shows all four menu labels inside the 102×36 panel"), or behavioral ("walking onto the door tile teleports to `spyder_paper_scoop`"). Always include the pre-commit gate: `npm run format:check && npm run lint && npx tsc --noEmit && npm test` must pass.
   >
   > ### Tone & length
   >
   > Write plans the way the existing `board/done/` stories are written — look at a recent one (e.g. `board/done/STORY-0210-combat-scene-layout-match/STORY.md`) for the house style. Concrete, specific, full of file paths and numbers where they matter. Prose where prose helps, bullets where bullets help. Length matches scope: a one-line config tweak gets a short story; a layout overhaul like STORY-0210 gets a long one.
   >
   > ### STORY.md skeleton
   >
   > Use this skeleton, dropping sections that don't apply. Section names are conventional, not rigid — match the house style of existing done stories.
   >
   > ```markdown
   > # STORY-NNNN: <short title>
   >
   > ## Description
   >
   > <One paragraph: what we're building/fixing and why. Reference the user's
   > original request faithfully.>
   >
   > ## Open Questions  <!-- delete if none -->
   >
   > - <ambiguity #1 the user needs to resolve before pickup>
   >
   > ## Context  <!-- upstream pointers, current-state notes, reference images, etc. -->
   >
   > - Upstream: `upstream/path/to/file.py:LINE-LINE` — <what's there, why it matters>
   > - Current behavior: <how things work today; cite our files + lines>
   >
   > ## What to build
   >
   > 1. <Concrete step naming the file and the change.>
   > 2. <Next step.>
   > ...
   >
   > ## Engine-side considerations  <!-- gotchas, invariants, adjacent systems that might break -->
   >
   > - <Thing the implementor would otherwise discover the hard way.>
   >
   > ## QA Validation
   >
   > <Either "Unit tests cover this; no puppeteer needed" OR a concrete
   > puppeteer plan: which qa/ script to write, what setupGame() opts, what
   > to interact with, which screenshots to take, what to confirm in each.>
   >
   > ## Out of scope
   >
   > - <Adjacent thing this story is not solving.>
   >
   > ## Acceptance Criteria
   >
   > - [ ] <Verifiable criterion.>
   > - [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass
   > ```
   >
   > ### The plan is a living artifact
   >
   > The implementor is allowed (and expected) to amend the plan if reality disagrees with it — they'll either update `STORY.md` in their commit or, for larger drift, bounce it back via the reviewer with a journal note. So write what you currently believe is correct, mark assumptions clearly, and don't agonize over edge cases the implementor will obviously catch in the act of building.
   >
   > ### Finishing up
   >
   > 1. If you decided on a better slug than the placeholder, `git mv` the story directory to the new slug *before* moving lanes — keep the STORY-NNNN id, just change the suffix.
   > 2. `git mv` the story directory from `board/planning/` to `board/next/`.
   > 3. Create a single commit on `plan-wip` containing the rewritten `STORY.md`, any rename, and the lane move. Suggested message: `STORY-NNNN: Plan ready — <slug>`. Do not push or merge to main yourself — the skill handles that.
   >
   > Stay on `plan-wip`. Don't run the pre-commit gates (you didn't touch source code); the implementor and reviewer will run them in their phases.

6. **Wait for the agent to finish** (foreground).

7. **Fast-forward main to the planner's commit.** From the main checkout:
   ```bash
   git merge --ff-only plan-wip
   ```
   If this fails because main moved, rebase the worktree onto main and retry:
   ```bash
   git -C trees/planner rebase main
   git merge --ff-only plan-wip
   ```

8. **Relay** a one-sentence summary to the user: the STORY-NNNN id, the final slug, and that it's now waiting in `board/next/` ready for `/pickup`. If the planner left `## Open Questions` in the STORY.md, surface that fact so the user can resolve them before picking up.

## Notes

- The skill itself does not write the plan; that's the sub-agent's job. The skill only scaffolds the directory and handles the git hand-off.
- If the planner reports a blocker (e.g. the description is so vague no useful plan can be drafted), pass that back to the user without forcing a plan.
- Don't auto-plan another story when this one finishes — `/new-story` is a single hand-off, not a loop. For batch planning, the user can call `/new-story` multiple times.
- The `trees/planner` worktree must be on branch `plan-wip` and have its own `node_modules` (one-time `npm install`). If the planner decides to run the harness, prefix with `ARITHMON_PORT=8083`. The implementor runs in parallel in `trees/implementor` on port 8081; the reviewer in `trees/reviewer` on port 8082.
