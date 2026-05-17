# Dual-input widget + QA helper

## Widget

Add a `dual-input` widget type to the Perseus problem format (`src/game/data/problems.ts`):

```typescript
type DualInputWidget = {
  type: "dual-input";
  options: {
    labels: [string, string];           // e.g. ["tens", "ones"]
    answers: [{ value: number }, { value: number }];
  };
};
```

Render it in `MathProblemScene.ts` as two side-by-side numeric input boxes, each
with a label above/below. Reuse the existing numeric-input styling (yellow cursor,
dark background) but at half width. Add a shared submit button.

Wire up grading in `skilltree.ts` — both fields must match for a correct answer.

## QA harness helper

Add a helper to `qa/harness.ts` (or a new `qa/math-helpers.ts`) that lets QA
scripts jump straight into a math problem scene with a specific problem. Something
like:

```typescript
export async function showProblem(page: Page, problem: PerseusProblem): Promise<void>
```

This should call into the debug bridge to launch MathProblemScene with the given
problem data, bypassing the normal combat/encounter flow.

## QA script

Write `qa/test-dual-input-widget.ts`:
- Launch game, setupGame
- Use the new helper to display a dual-input problem (e.g. "14 = _ tens + _ ones")
- Screenshot and visually verify layout
- Submit correct answer, screenshot the "CORRECT" feedback
- Repeat with wrong answer, screenshot "INCORRECT" feedback

Use the puppeteer/screenshot skill to iterate on appearance until it looks polished.
The two input boxes should be clearly separated with their labels readable.
