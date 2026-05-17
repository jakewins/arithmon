# Dropdown widget + QA iteration

## Widget

Add a `dropdown` widget type to the Perseus problem format (`src/game/data/problems.ts`):

```typescript
type DropdownWidget = {
  type: "dropdown";
  options: {
    placeholder: string;
    choices: Array<{
      content: string;
      correct: boolean;
    }>;
  };
};
```

Add it to the `ProblemWidget` union.

## Rendering

Render in `MathProblemScene.ts` as an inline tappable element within the question
text where the `[[☃ widget-id]]` placeholder appears:

- Initially shows the `placeholder` text (e.g. "___") styled to look tappable
  (maybe a box outline or underline)
- On tap, show a popup/overlay list of choices
- Once a choice is selected, replace the placeholder with the selected text
- Tapping again re-opens the list to change the answer
- Submit button confirms (reuse existing pattern)

The dropdown should feel like a natural part of the sentence — not a separate
panel element. Keep it compact. Match the pixel-art panel aesthetic.

## Grading

Wire up grading in `skilltree.ts` — the submitted choice content string must
match the correct choice's `content`.

## QA iteration

Write `qa/test-dropdown-widget.ts`:
- Launch game, `setupGame()`
- Use `showProblem()` to display a dropdown problem (e.g. "12 is ___ than 8"
  with choices [greater, less, equal])
- **Use the `screenshot()` helper from `qa/harness.ts`** for all screenshots
- Screenshot initial state (showing placeholder)
- Screenshot with dropdown open (showing choices)
- Screenshot with a choice selected
- Iterate on appearance using the puppeteer skill until polished

Focus on:
- Placeholder being clearly tappable/interactive
- Choice list being readable and easy to tap
- Selected choice fitting naturally into the sentence text
