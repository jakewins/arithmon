# STORY-0025: Multiple-choice (radio) widget

## Description

Add support for `radio` widget type in the Perseus problem format and
MathProblemScene renderer. This is the second most common widget for early
math on Khan Academy and adds significant variety for young learners.

**Format** (following Perseus conventions):
```json
{
  "type": "radio",
  "options": {
    "choices": [
      { "content": "5", "correct": false },
      { "content": "6", "correct": false },
      { "content": "7", "correct": true },
      { "content": "8", "correct": false }
    ]
  }
}
```

**Rendering**: display 2–4 large tappable buttons arranged vertically below
the question. Highlight selection, submit on tap (or require explicit submit —
TBD based on feel).

Update existing generators (K.OA.A.5, K.OA.A.2) to sometimes emit
multiple-choice variants alongside numeric-input variants, for variety.
Distractor generation: nearby integers (±1, ±2) from the correct answer.

## Acceptance Criteria

- [ ] `RadioWidget` type added to `problems.ts`
- [ ] `MathProblemScene` renders radio widgets as tappable choice buttons
- [ ] Correct choice → green highlight + "CORRECT!", wrong → red + show correct
- [ ] Existing generators updated to emit radio variants ~30% of the time
- [ ] Grading works for both widget types
- [ ] Choice order is randomised so correct answer isn't always in the same position
