# STORY-0064: Dropdown widget

## Description

Add a `dropdown` widget to the Perseus problem format. The player taps to open
a list of choices and selects one. This is a lighter alternative to `radio` for
inline fill-in-the-blank style questions (e.g. "12 is ___ than 8"), and enables
new problem variants that read more naturally as sentences with a blank.

### Widget spec

```typescript
type DropdownWidget = {
  type: "dropdown";
  options: {
    placeholder: string;           // e.g. "choose" or "___"
    choices: Array<{
      content: string;             // display text
      correct: boolean;            // exactly one should be true
    }>;
  };
};
```

Render in `MathProblemScene.ts` as an inline tappable area within the question
text (replacing the `[[☃ widget-id]]` placeholder). When tapped, show a
dropdown/popup list of choices. Once a choice is selected it replaces the
placeholder text. A submit button confirms the answer. Match the existing
pixel-art panel aesthetic.

### Skills that benefit

These existing skills should get new dropdown problem variants:

- **1.NBT.B.3** (compare two-digit numbers) — "45 is ___ than 38" with
  choices [greater, less, equal]. More natural sentence form vs. the comparison
  widget's abstract `>` `=` `<` buttons.
- **1.OA.D.7** (meaning of equals sign) — "Is 7 + 3 = 10 true or false?" →
  dropdown with [True, False]. Cleaner than a radio for binary choices in a
  sentence.
- **1.OA.B.4** (subtraction as unknown-addend) — "8 - 3 is the same as
  3 + ___" with choices [5, 4, 6, 3]. Frames the relationship as a sentence
  with a blank.

### Implementation notes

- Each TODO is independently commitable. After completing each TODO, run
  `npm run format:check && npm run lint && npx tsc --noEmit && npm test`,
  fix any issues, and commit before moving on.
- The widget TODO comes first since the skill variants depend on it.
- Use the puppeteer/screenshot skill to iterate on the dropdown appearance.
  **Use the `screenshot()` helper from `qa/harness.ts`** rather than raw
  Puppeteer screenshot calls. Call `setupGame()` right after `launchGame()`.

## Acceptance Criteria

- [ ] `dropdown` widget type added to Perseus format in `problems.ts`
- [ ] Widget rendered in `MathProblemScene.ts` with tap-to-open interaction
- [ ] Grading wired up in `skilltree.ts`
- [ ] QA screenshot confirms widget looks polished (iterated via puppeteer skill)
- [ ] Dropdown variants added to 1.NBT.B.3, 1.OA.D.7, 1.OA.B.4
- [ ] Unit tests for widget grading and updated generators
- [ ] All checks pass: format, lint, typecheck, tests
