# Dropdown variant for 1.NBT.B.3 — compare two-digit numbers

**CCSS 1.NBT.B.3**: Compare two two-digit numbers based on meanings of the
tens and ones digits, recording the results with >, =, and <.

## Generator update (`src/game/data/skills/1-nbt-b3.ts`)

Add a dropdown variant to the existing generator. When this variant is selected,
produce problems like:

- "45 is [[☃ answer]] than 38" → dropdown widget, placeholder "___",
  choices: [greater, less, equal], correct: "greater"
- "27 is [[☃ answer]] than 51" → dropdown widget, choices: [greater, less, equal],
  correct: "less"

This gives a more natural sentence form compared to the existing comparison
widget's abstract `>` `=` `<` buttons. Both variants are pedagogically valuable
— the comparison widget teaches the math symbols, the dropdown tests conceptual
understanding using words.

## Tests

Update unit tests to cover the new variant. Run full check suite and commit.
