# Comparison selector widget

## Widget

Add a `comparison` widget type to the Perseus problem format (`src/game/data/problems.ts`):

```typescript
type ComparisonWidget = {
  type: "comparison";
  options: {
    left: string;              // e.g. "45"
    right: string;             // e.g. "54"
    answer: ">" | "=" | "<";   // correct comparison
  };
};
```

Render it in `MathProblemScene.ts` as:
- The left value on the left side
- Three large buttons in the middle: `>`, `=`, `<`
- The right value on the right side

Selecting a button highlights it and immediately grades (no separate submit needed,
matching the radio pattern). Show correct/incorrect feedback as with other widgets.

Wire up grading in `skilltree.ts`.

## QA script

Write `qa/test-comparison-widget.ts`:
- Launch game, setupGame
- Use the showProblem helper from TODO 01 to display a comparison problem
- Screenshot the layout
- Click the correct answer, screenshot the "CORRECT" feedback
- Repeat with wrong answer, screenshot "INCORRECT" feedback

Iterate with screenshots until the three-button layout looks clear and balanced
within the 320x240 problem panel.
