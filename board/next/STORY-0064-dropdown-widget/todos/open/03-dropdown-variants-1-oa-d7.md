# Dropdown variant for 1.OA.D.7 — meaning of equals sign

**CCSS 1.OA.D.7**: Understand the meaning of the equal sign, and determine if
equations involving addition and subtraction are true or false.

## Generator update (`src/game/data/skills/1-oa-d7.ts`)

Add a dropdown variant. When selected, produce problems like:

- "Is **7 + 3 = 10** true or false? [[☃ answer]]" → dropdown widget,
  placeholder "choose", choices: [True, False], correct: "True"
- "Is **5 + 6 = 12** true or false? [[☃ answer]]" → dropdown widget,
  choices: [True, False], correct: "False"

Cleaner than a radio for binary true/false — reads naturally as a sentence
with a fill-in-the-blank.

## Tests

Update unit tests to cover the new variant. Run full check suite and commit.
