# STORY-0226: Quiz question/input widget spacing — stop the overlap

## Description

The MathProblemScene quiz UI currently lets the input widget (numeric box, dual-input boxes + their labels, radio choices, comparison row, number line, dropdown placeholder) collide with — or render directly underneath — the question text. The user reports this happens for "all of them". Goal: every widget type renders with clear vertical whitespace between the bottom edge of the question text and the top edge of whatever the widget draws first (a label, a box, a button, etc.), and the overall layout reads as having "nice whitespace around components". Verified visually with puppeteer screenshots, one per widget type.

## Context

- Scene under test: `src/game/scenes/MathProblemScene.ts` (the only file touched by this story).
- Question text is laid out at `MathProblemScene.ts:125-132` with origin `(0.5, 0)` at `y = panelY + 22 = 28`, word-wrap width `panelW - 12`, font `BODY_LIGHT` (PressStart2P 8 px, bold).
- `contentY` is computed at `MathProblemScene.ts:135`:
  ```ts
  const contentY = questionObj.y + questionObj.height + 6;
  ```
  i.e. 6 px below the rendered bottom of the question text. That 6 px gap is the only buffer any widget gets — and several widgets then draw *above* `contentY`, eating into it:
  - **dual-input** (`createDualInputUI`, line 297): `inputY = contentY + 6`, then labels drawn at `inputY - 10 = contentY - 4` — i.e. 4 px *above* `contentY`, fully inside the 6 px gap and visibly into the question text on multi-line questions.
  - **numeric-input** (`createNumericInputUI`, line 238): input box centered at `inputY = contentY` with `height = 14`, so the box top is at `contentY - 7` — into the gap.
  - **radio** (`createRadioUI`, line 442): first choice button centered at `contentY` with vertical padding, top edge a few px above `contentY`.
  - **comparison** (`createComparisonUI`, line 495): `rowY = contentY + 12` but uses `BIG_LIGHT` (16 px) centered, so glyph top is at ~`contentY + 4` — only ok for single-line questions; collides with two-line questions.
  - **number-line** (`createNumberLineUI`, line 562): `lineY = contentY + 16`, then value label at `lineY - 10 = contentY + 6` — fine when the question is one line, marginal otherwise.
  - **dropdown** (`createDropdownUI`, line 807): box at `dropY = contentY + 8`, box height 16 → top at `contentY` — into the gap.
- Phaser's `Text.height` for word-wrapped text generally matches the rendered glyph bounding box but the PressStart2P TTF reports tight metrics and ignores descender/line-gap; a 2-line question reports ~16 px height but the actual ink can overshoot by 1-2 px once the renderer adds line spacing. This is why one-line questions look ok-ish and multi-line questions overlap badly — the user is correct that this affects "all" widgets, just worst when the question wraps to two lines.

Reference for house style on visual-tuning stories: `board/done/STORY-0210-combat-scene-layout-match/STORY.md` (HUD geometry tune) and `board/done/STORY-0211-crisp-text-rendering/STORY.md`.

The math quiz is Arithmon-specific (Dark Power mechanic) — no upstream Tuxemon reference applies here.

## What to build

All edits are in `src/game/scenes/MathProblemScene.ts`. No changes to `data/problems.ts`, `textStyle.ts`, or any other scene.

1. **Introduce a single `QUESTION_GAP` constant** at the top of the file (next to `C_ACCENT` / `C_HINT` / `C_INPUT`) with a value of **10** px (currently the implicit gap is 6, and several widgets eat into it). This is the *minimum* clear vertical space between the rendered bottom of the question text and the top edge of the first thing the widget draws (label, box, button, or glyph). Assumption: 10 px is enough on a 144-px-tall viewport without pushing the SUBMIT button or feedback off the bottom of any widget. If the implementor finds 10 px crowds the bottom of any widget (most likely number-line), they may bump to 8 px instead and note the rationale in `JOURNAL.md` — but the no-overlap criterion is non-negotiable.

2. **Anchor every widget's first drawn element below `contentY` consistently.** Replace the `contentY = questionObj.y + questionObj.height + 6;` line (line 135) with `contentY = questionObj.y + questionObj.height + QUESTION_GAP;`, and then audit each `create*UI` helper so its *first visual element* (not just its named "input" rect) sits with its top edge at or below `contentY`:
   - `createNumericInputUI`: keep `inputY = contentY` but **shift down so the box top is at `contentY`**, i.e. `inputY = contentY + 7` (half the 14-px box). Or change the box origin / use `setOrigin(0.5, 0)`. Pick whichever keeps the rest of the helper readable — the visible result is what matters.
   - `createDualInputUI`: today the *labels* are the topmost element (drawn at `inputY - 10`). Set `labelY = contentY`, then `inputY = labelY + 10` (so boxes still sit 10 px below the labels). Update the SUBMIT and HINT y-offsets that derive from `inputY` (`submitY = inputY + 18`, etc.) — they should still relate to the box position, not the label, so no further math change needed once `inputY` is correctly recomputed.
   - `createRadioUI`: today first button is centered at `contentY`. Use `setOrigin(0.5, 0)` on the buttons (or set `startY = contentY + (button half-height)`) so the top edge of the first button is at `contentY`. Re-verify the `i * spacing` stride still doesn't clip the panel bottom for 4-choice questions (it shouldn't — was working before).
   - `createComparisonUI`: today `rowY = contentY + 12` for centered 16-px-tall glyphs (top ~`contentY + 4`). Change to `rowY = contentY + 8` (top at `contentY`). Confirm the comparison buttons (also centered at `rowY`) still don't collide with the feedback line at the bottom.
   - `createNumberLineUI`: today `lineY = contentY + 16` and the value label is drawn 10 px above the line (`lineY - 10`). Make sure the value label's top edge sits at `contentY`: set `valueLabelTopY = contentY` and `lineY = valueLabelTopY + 12` (so the label still appears just above the line). Adjust the `nlValueText` y to use the value-label-top calculation rather than `lineY - 10`. Re-verify the SUBMIT/HINT below the line still fit inside the panel.
   - `createDropdownUI`: today `dropY = contentY + 8` for centered 16-px box (top at `contentY`). That's already on the boundary — change to `dropY = contentY + 9` so there's a one-pixel cushion, OR re-anchor with `setOrigin(0.5, 0)` to put the box top exactly at `contentY`. Pick whichever is cleaner.

   The unifying principle: **after this change, every widget's topmost visible pixel is at `y >= contentY`, and `contentY` is `QUESTION_GAP` (10 px) below the question's rendered bottom.** Everything else inside each helper (submit, hint, feedback) is positioned relative to the widget's primary input and so should re-flow correctly.

3. **Don't change the question-text styling itself, the panel chrome, the title bar, or the feedback line.** Only the contentY anchor + the per-widget first-element y-positions change.

## Engine-side considerations

- Phaser's `Text.height` is reasonably accurate after `setText` returns synchronously in `create()`, so reading `questionObj.height` immediately on the next line (as the current code does) is fine — we don't need to wait a frame.
- Some quiz problems have a **very long** question that wraps to 3 lines. The implementor should confirm that even on a 3-line question (`questionObj.height ≈ 24-26 px`), `contentY + widget content + SUBMIT + HINT + hint text + feedback` still fits inside the panel (HEIGHT − bottom margin ≈ 132). If 3-line questions blow the panel, that's a separate cropping concern — note it in `JOURNAL.md`, don't try to solve it here.
- Don't introduce a "shrink question text" branch — keeping all problems at the same 8 px BODY_LIGHT keeps things predictable. The user asked for *more space*, not *smaller text*.

## QA Validation

Add `qa/quiz-widget-spacing.ts` (checked in alongside the existing curated suite — companion to e.g. `qa/pixel-font-readability.ts`, which already demonstrates the `showProblem` pattern at lines 250-279). The script must:

1. `launchGame()` + `setupGame(page)` (defaults are fine; we just need an active OverworldScene so `showProblem` has a returnScene).
2. For each of the **six widget types** — numeric-input, radio, dual-input, comparison, number-line, dropdown — call `showProblem(page, ...)` with a hand-rolled `PerseusProblem` that exercises that widget type. Use the existing test fixture in `qa/pixel-font-readability.ts:252-266` as the template for the numeric case; build the other five from the type definitions in `src/game/data/problems.ts:1-89`.
3. For each widget, send **two** problems:
   - **(a) short question** — one line of text, e.g. `"What is 7 + 5?"`.
   - **(b) long question** — text that wraps to two lines at the panel width, e.g. `"If you have twelve apples and give away five of them to your friend, how many apples are left?"`.
   For each variant, take a screenshot named `quiz-spacing-{widget}-{short|long}.png` (12 screenshots total). Wait ~200ms after `showProblem` for the scene to paint, screenshot, then dismiss the scene before moving to the next problem (the existing pattern in `pixel-font-readability.ts:273-278` is: submit a wrong answer to trigger the 2-second auto-close, then `waitForTimeout(2200)`).
4. Save the screenshots into `qa/screenshots/` (default location used by `screenshot()` in `qa/harness.ts:271`).

The reviewer will then visually confirm in each of the 12 screenshots:
- Zero pixel overlap between the bottom of the question text and the top of the widget's first visible element.
- At least ~8 px of clear vertical whitespace between the question text and the widget on both the short and long variants.
- SUBMIT button, HINT button, and feedback area (if visible) all still fit inside the panel — nothing clips off the bottom edge.

No new debug-bridge helpers needed; `showProblem` already covers everything required.

## Out of scope

- Re-styling the panel chrome (title bar, accent line, frame color).
- Question-text font size, color, or word-wrap width.
- Cropping behavior for 3-line+ questions (note in JOURNAL if it breaks; don't fix here).
- Hint-text positioning (only changes if it derives from `submitY`, in which case it re-flows naturally).
- Any change to the skill tree, problem generators, or problem data.

## Acceptance Criteria

- [ ] `QUESTION_GAP` constant introduced at the top of `src/game/scenes/MathProblemScene.ts` and used to compute `contentY`.
- [ ] All six widget helpers (`createNumericInputUI`, `createRadioUI`, `createDualInputUI`, `createComparisonUI`, `createNumberLineUI`, `createDropdownUI`) place their topmost visible element with top edge `>= contentY`.
- [ ] `qa/quiz-widget-spacing.ts` exists, is checked in, runs end-to-end against the dev server, and captures the 12 screenshots listed above into `qa/screenshots/`.
- [ ] Reviewer visually confirms in each of the 12 screenshots that there is no overlap between question text and widget, and at least ~8 px of clear whitespace between them.
- [ ] No widget has its SUBMIT button, HINT button, or feedback line clipped off the bottom of the panel (visible in the same screenshots).
- [ ] `npm run format:check && npm run lint && npx tsc --noEmit && npm test` all pass.
