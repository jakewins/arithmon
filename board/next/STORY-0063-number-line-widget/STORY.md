# STORY-0063: Number-line widget

## Description

Add a `number-line` widget to the Perseus problem format. The player taps or
drags a point to a position on a number line to answer. This is the single
highest-value widget we're missing for 1st-grade math — it directly supports
visual/spatial reasoning for addition, subtraction, comparison, and place value.

### Widget spec

```typescript
type NumberLineWidget = {
  type: "number-line";
  options: {
    range: [number, number];    // e.g. [0, 20] or [0, 100]
    step: number;               // snap increment, e.g. 1 or 10
    labelStep: number;          // show a label every N steps
    answer: number;             // correct position
  };
};
```

Render in `MathProblemScene.ts` as a horizontal line with tick marks and labels,
plus a draggable/tappable marker. The marker snaps to the nearest `step`. A
submit button confirms the answer. Match the existing pixel-art panel aesthetic.

### Skills that benefit

These existing skills should get new number-line problem variants:

- **1.OA.C.6** (add/subtract within 20) — "Show 8 + 5 on the number line"
  (range [0,20], step 1). Visualizing hops on a number line is a core 1st grade
  strategy.
- **1.NBT.C.5** (10 more / 10 less) — "Start at 47. Find 10 more." on a
  number line (range [0,100], step 10). Makes the +10/-10 pattern visible.
- **1.NBT.C.4** (add within 100) — "Show 34 + 20 on the number line"
  (range [0,100], step 10). Reinforces adding multiples of 10 visually.
- **1.NBT.B.3** (compare two-digit numbers) — "Place 37 on the number line"
  then compare to a fixed marker. Builds number sense for comparison.

### Implementation notes

- Each TODO is independently commitable. After completing each TODO, run
  `npm run format:check && npm run lint && npx tsc --noEmit && npm test`,
  fix any issues, and commit before moving on.
- The widget TODO comes first since the skill variants depend on it.
- Use the puppeteer/screenshot skill to iterate on the number-line appearance.
  **Use the `screenshot()` helper from `qa/harness.ts`** rather than raw
  Puppeteer screenshot calls. Call `setupGame()` right after `launchGame()`.

## Acceptance Criteria

- [ ] `number-line` widget type added to Perseus format in `problems.ts`
- [ ] Widget rendered in `MathProblemScene.ts` with drag/tap interaction
- [ ] Grading wired up in `skilltree.ts`
- [ ] QA screenshot confirms widget looks polished (iterated via puppeteer skill)
- [ ] Number-line variants added to 1.OA.C.6, 1.NBT.C.5, 1.NBT.C.4, 1.NBT.B.3
- [ ] Unit tests for widget grading and updated generators
- [ ] All checks pass: format, lint, typecheck, tests
