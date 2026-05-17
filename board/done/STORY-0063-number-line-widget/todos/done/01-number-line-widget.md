# Number-line widget + QA iteration

## Widget

Add a `number-line` widget type to the Perseus problem format (`src/game/data/problems.ts`):

```typescript
type NumberLineWidget = {
  type: "number-line";
  options: {
    range: [number, number];
    step: number;
    labelStep: number;
    answer: number;
  };
};
```

Add it to the `ProblemWidget` union.

## Rendering

Render in `MathProblemScene.ts` as:
- A horizontal line spanning most of the panel width
- Tick marks at every `step` interval
- Numeric labels at every `labelStep` interval
- A draggable marker (or tap-to-place) that snaps to the nearest `step`
- Current value displayed near the marker
- Shared submit button (reuse existing pattern)

The number line should feel tactile — the marker should be easy to grab and the
current position should be clearly visible. Match the existing pixel-art dark
panel aesthetic (yellow text, dark backgrounds).

## Grading

Wire up grading in `skilltree.ts` — the submitted number must match
`options.answer` exactly.

## QA iteration

Write `qa/test-number-line-widget.ts`:
- Launch game, `setupGame()`
- Use `showProblem()` to display a number-line problem (e.g. range [0,20],
  step 1, answer 13)
- **Use the `screenshot()` helper from `qa/harness.ts`** for all screenshots
- Screenshot the initial state, iterate on appearance using the puppeteer skill
  until the widget looks clean and polished
- Test with different ranges: [0,20] step 1, [0,100] step 10
- Screenshot correct and incorrect feedback states

Iterate on the visual design until the number line looks good. Focus on:
- Tick marks and labels being clearly readable
- Marker being visually distinct and easy to position
- Good spacing so the line doesn't feel cramped
